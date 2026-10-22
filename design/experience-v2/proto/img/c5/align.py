#!/usr/bin/env python3
"""C5 살아 있는 연작 — 연작 정렬 (scale · translate · crop 만, 워핑 없음)
같은 자리를 같은 구도로 그린 작품을 기준 그림에 맞춰 크기·위치만 맞추고 공통 영역으로 잘라 1200px JPEG 으로 낸다.
  · 수동 앵커 2–3점(원본 픽셀)으로 균일 스케일 + 이동을 최소제곱으로 풀고
  · 1/8 해상도 DoG(큰 형태) 정규화 상관으로 ±8% · ±4% 범위에서 미세 보정(회전 없음)
  · 모든 그림이 덮는 교집합 사각형으로 자른다 → img/c5/<motif>/<n>.jpg + img/c5/frames.json
실행: python3 design/experience-v2/proto/img/c5/align.py   (kippu-site 루트에서, PIL·numpy·cv2)
"""
import json, os, sys
import numpy as np
import cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
WORKS = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'works'))
OUT_W = 1200          # 긴 변
MAX_KB = 180

# 모티프별 작품 — anchors 는 원본 픽셀. 때 이름(when)은 작품 제목에 있는 말만 쓴다.
MOTIFS = {
  'haystacks': {
    'name': '건초더미', 'dir': (1.0, -0.14),          # 붓결: 들판의 가로 결(살짝 오른쪽 위로)
    'ref': 'c5-haystacks-thaw-sunset-aic.jpg',
    'frames': [
      # (file, when, anchors: [apex, base-left, base-right])
      ('c5-haystacks-morning-snow-mfa.jpg',   '아침',       [(660, 340), (240, 1080), (1060, 1080)]),
      ('c5-haystacks-sun-mist-mia.jpg',       '안개 속의 해', [(690, 205), (480, 680), (960, 680)]),
      ('c5-haystacks-sunlight-snow-barberini.jpg', '햇빛 · 눈', [(670, 170), (450, 620), (960, 620)]),
      ('c5-haystacks-thaw-sunset-aic.jpg',    '해 질 녘',    [(520, 300), (190, 880), (900, 880)]),
      ('c5-haystacks-snow-overcast-aic.jpg',  '흐린 날',     [(470, 290), (190, 900), (860, 900)]),
    ],
  },
  'rouen': {
    'name': '루앙 대성당', 'dir': (0.08, 1.0),         # 붓결: 파사드의 세로 결
    'ref': 'c5-rouen-sunlight-nga.jpg',
    'frames': [
      # anchors: [장미창 아치 꼭대기, 정문 아치 꼭대기]
      ('c5-rouen-harmonie-bleue-orsay.jpg',   '아침 햇살', [(535, 430), (520, 1000)]),
      ('c5-rouen-noon-pushkin.jpg',           '정오',     [(710, 455), (700, 1010)]),
      ('c5-rouen-sunlight-nga.jpg',           '햇빛',     [(555, 430), (560, 1010)]),
      ('c5-rouen-evening-pushkin.jpg',        '저녁',     [(525, 400), (510, 990)]),
      ('c5-rouen-temps-gris-orsay.jpg',       '흐린 날',  [(522, 362), (515, 1000)]),
    ],
  },
}

def load(f):
  im = Image.open(os.path.join(WORKS, f)).convert('RGB')
  return np.asarray(im)

def fit_st(p, q):
  """균일 스케일 s 와 이동 t: q ≈ s·p + t (최소제곱, 회전 없음)"""
  p = np.asarray(p, float); q = np.asarray(q, float)
  pc, qc = p.mean(0), q.mean(0)
  dp, dq = p - pc, q - qc
  s = float((dp * dq).sum() / (dp * dp).sum())
  t = qc - s * pc
  return s, t

def warp(img, s, t, size):
  M = np.array([[s, 0, t[0]], [0, s, t[1]]], float)
  flags = cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC
  return cv2.warpAffine(img, M, size, flags=flags, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))

def dog(gray8):
  g = gray8.astype(np.float32)
  a = cv2.GaussianBlur(g, (0, 0), 1.6); b = cv2.GaussianBlur(g, (0, 0), 5.0)
  return a - b

def ncc(a, b, m):
  a = a[m]; b = b[m]
  a = a - a.mean(); b = b - b.mean()
  d = np.sqrt((a * a).sum() * (b * b).sum()) + 1e-6
  return float((a * b).sum() / d)

def refine(ref, img, s0, t0):
  """1/8 해상도 DoG 정규화 상관을 최대로 하는 (s, t) 를 s0·t0 주변에서 찾는다(거친 → 미세)"""
  k = 8
  rs = cv2.resize(ref, (ref.shape[1] // k, ref.shape[0] // k), interpolation=cv2.INTER_AREA)
  rg = dog(cv2.cvtColor(rs, cv2.COLOR_RGB2GRAY))
  ig = cv2.cvtColor(cv2.resize(img, (img.shape[1] // k, img.shape[0] // k), interpolation=cv2.INTER_AREA), cv2.COLOR_RGB2GRAY)
  igd = dog(ig)
  size = (rg.shape[1], rg.shape[0])
  best = (-2, s0, np.array(t0, float))
  def score(s, t):
    w = cv2.warpAffine(igd, np.array([[s, 0, t[0] / k], [0, s, t[1] / k]]), size, flags=cv2.INTER_LINEAR, borderValue=0)
    cover = cv2.warpAffine(np.ones(igd.shape, np.uint8), np.array([[s, 0, t[0] / k], [0, s, t[1] / k]]), size, flags=cv2.INTER_NEAREST, borderValue=0) > 0
    m = cover & (np.abs(rg) > 0)
    if m.sum() < 0.3 * m.size: return -2
    return ncc(rg, w, m)
  W = ref.shape[1]
  for ds, dt in [(0.02, max(8, W * 0.01)), (0.005, 4), (0.002, 1.5)]:
    _, sc, tc = best
    cand = []
    for s in np.arange(sc - 4 * ds, sc + 4 * ds + 1e-9, ds):
      for tx in np.arange(tc[0] - 4 * dt, tc[0] + 4 * dt + 1e-9, dt):
        for ty in np.arange(tc[1] - 4 * dt, tc[1] + 4 * dt + 1e-9, dt):
          if abs(s / s0 - 1) > 0.08 or abs(tx - t0[0]) > W * 0.04 or abs(ty - t0[1]) > W * 0.04: continue
          cand.append((score(s, (tx, ty)), s, np.array((tx, ty))))
    cand.sort(key=lambda c: -c[0])
    if cand and cand[0][0] > best[0]: best = cand[0]
  return best

def save_jpeg(arr, path):
  """≤ MAX_KB: 품질을 내리다 q64 에서도 넘치면(확대된 그림의 JPEG 알갱이) 아주 약하게 눌러(σ .7) 다시"""
  im = Image.fromarray(arr)
  for q in (84, 80, 76, 72, 68, 64):
    im.save(path, 'JPEG', quality=q, optimize=True, progressive=True, subsampling=1)
    if os.path.getsize(path) <= MAX_KB * 1024: return q
  im = Image.fromarray(cv2.GaussianBlur(arr, (0, 0), 0.7))
  for q in (76, 72, 68, 64, 60):
    im.save(path, 'JPEG', quality=q, optimize=True, progressive=True, subsampling=1)
    if os.path.getsize(path) <= MAX_KB * 1024: return f'{q}·soft'
  return f'{q}·soft'

def run(key, m):
  ref = load(m['ref'])
  H, W = ref.shape[:2]
  ref_anchors = dict((f, a) for f, _, a in m['frames'])[m['ref']]
  fits = []
  for f, when, anchors in m['frames']:
    img = load(f)
    if f == m['ref']:
      s, t = 1.0, np.zeros(2); sc = 1.0
    else:
      s, t = fit_st(anchors, ref_anchors)
      sc, s2, t2 = refine(ref, img, s, t)
      print(f'  {f}: anchor s={s:.4f} t=({t[0]:.0f},{t[1]:.0f}) → refined s={s2:.4f} t=({t2[0]:.0f},{t2[1]:.0f}) ncc={sc:.3f}')
      s, t = s2, t2
    fits.append((f, when, img, s, t))
  # 교집합: 각 그림이 기준 좌표에서 덮는 사각형
  x0, y0, x1, y1 = 0, 0, W, H
  for f, when, img, s, t in fits:
    ih, iw = img.shape[:2]
    x0 = max(x0, t[0]); y0 = max(y0, t[1]); x1 = min(x1, t[0] + iw * s); y1 = min(y1, t[1] + ih * s)
  x0, y0, x1, y1 = int(np.ceil(x0)) + 2, int(np.ceil(y0)) + 2, int(np.floor(x1)) - 2, int(np.floor(y1)) - 2
  cw, ch = x1 - x0, y1 - y0
  print(f'  crop {cw}×{ch} at ({x0},{y0}) of ref {W}×{H}')
  scale = OUT_W / max(cw, ch)
  ow, oh = round(cw * scale), round(ch * scale)
  os.makedirs(os.path.join(HERE, key), exist_ok=True)
  out = []
  for n, (f, when, img, s, t) in enumerate(fits):
    # 한 번에 리샘플: 원본 → (s·scale) 배, 이동 (t − (x0,y0))·scale
    S = s * scale; T = ((t[0] - x0) * scale, (t[1] - y0) * scale)
    w = warp(img, S, T, (ow, oh))
    path = os.path.join(HERE, key, f'{n + 1}.jpg')
    q = save_jpeg(w, path)
    print(f'  {n + 1}.jpg ← {f} ({when}) q{q} {os.path.getsize(path) // 1024}KB')
    out.append({'n': n + 1, 'file': f'{key}/{n + 1}.jpg', 'src': f, 'when': when, 'scale': round(float(s), 4), 'offset': [round(float(t[0]), 1), round(float(t[1]), 1)]})
  return {'name': m['name'], 'dir': list(m['dir']), 'w': ow, 'h': oh, 'ref': m['ref'], 'crop': [x0, y0, cw, ch], 'frames': out}

if __name__ == '__main__':
  result = {}
  for key, m in MOTIFS.items():
    print('▶', key)
    result[key] = run(key, m)
  with open(os.path.join(HERE, 'frames.json'), 'w', encoding='utf-8') as fp:
    json.dump(result, fp, ensure_ascii=False, indent=1)
  print('wrote frames.json')
