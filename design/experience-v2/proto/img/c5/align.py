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
      # (file, when, anchors: [apex, base-left, base-right], trim, hours, now)
      ('c5-haystacks-morning-snow-mfa.jpg',   '아침',       [(660, 340), (240, 1080), (1060, 1080)], None, (7, 10), '아침 눈 속의 건초더미'),
      ('c5-haystacks-sun-mist-mia.jpg',       '안개 속의 해', [(690, 205), (480, 680), (960, 680)], None, (5, 7), '안개 속의 해와 건초더미'),
      ('c5-haystacks-sunlight-snow-barberini.jpg', '햇빛 · 눈', [(670, 170), (450, 620), (960, 620)], None, (10, 15), '햇빛 속 건초더미'),
      ('c5-haystacks-thaw-sunset-aic.jpg',    '해 질 녘',    [(520, 300), (190, 880), (900, 880)], None, (15, 19), '해 질 녘의 건초더미'),
      ('c5-haystacks-snow-overcast-aic.jpg',  '흐린 날',     [(470, 290), (190, 900), (860, 900)], None, (19, 5), '흐린 날의 건초더미'),
    ],
    'clock_note': '안개 속의 해 05–07 · 아침 07–10 · 햇빛·눈 10–15 · 해 질 녘 15–19 · 흐린 날 그 밖(19–05)',
  },
  'rouen': {
    'name': '루앙 대성당', 'dir': (0.08, 1.0),         # 붓결: 파사드의 세로 결
    'ref': 'c5-rouen-sunlight-nga.jpg',
    'frames': [
      # anchors: [장미창 아치 꼭대기, 정문 아치 꼭대기]
      ('c5-rouen-harmonie-bleue-orsay.jpg',   '아침 햇살', [(535, 430), (520, 1000)], None, (5, 10), '아침 햇살의 대성당'),
      ('c5-rouen-noon-pushkin.jpg',           '정오',     [(710, 455), (700, 1010)], None, (10, 13), '정오의 대성당'),
      ('c5-rouen-sunlight-nga.jpg',           '햇빛',     [(555, 430), (560, 1010)], None, (13, 15), '햇빛 속 대성당 정문'),
      ('c5-rouen-evening-pushkin.jpg',        '저녁',     [(525, 400), (510, 990)], None, (15, 21), '저녁의 대성당'),
      ('c5-rouen-temps-gris-orsay.jpg',       '흐린 날',  [(522, 362), (515, 1000)], None, (21, 5), '흐린 날의 대성당'),
    ],
    'clock_note': '아침 햇살 05–10 · 정오 10–13 · 햇빛 13–15 · 저녁 15–21(오후·해 질 녘 자리) · 흐린 날 그 밖(21–05)',
  },
  'parliament': {
    'name': '런던 국회의사당', 'dir': (1.0, 0.06),        # 붓결: 안개 낀 하늘과 템스의 가로 결
    'ref': 'c5-parliament-fog-met.jpg',
    'frames': [
      # anchors: [빅토리아 탑 꼭대기 왼쪽, 꼭대기 오른쪽, 탑 아래 건물이 물에 닿는 자리]. trim 은 스캔에 든 액자(원본 픽셀)
      ('c5-parliament-fog-met.jpg',         '안개',        [(2420, 450), (2790, 450), (2600, 1900)], None, (19, 7), '안개 속 국회의사당'),
      ('c5-parliament-trouee-orsay.jpg',    '안개 속 햇살', [(2310, 640), (2590, 640), (2450, 2150)], (150, 540, 430, 420), (7, 10), '안개를 뚫는 햇살의 국회의사당'),
      ('c5-parliament-sunlight-brooklyn.jpg', '햇빛',      [(1420, 450), (1730, 450), (1575, 2180)], (22, 22, 22, 26), (10, 15), '햇빛 속 국회의사당'),
      ('c5-parliament-storm-lille.jpg',     '폭풍우 하늘',  [(1280, 100), (1490, 100), (1385, 1020)], None, (15, 17), '폭풍우 하늘 아래 국회의사당'),
      ('c5-parliament-sunset-nga.jpg',      '해 질 녘',    [(1610, 110), (1790, 110), (1700, 1230)], None, (17, 19), '해 질 녘의 국회의사당'),
    ],
    'clock_note': '안개 속 햇살 07–10 · 햇빛 10–15 · 폭풍우 하늘 15–17(오후 자리) · 해 질 녘 17–19 · 안개 그 밖(19–07)',
  },
  'waterloo': {
    'name': '워털루 다리', 'dir': (1.0, -0.05),           # 붓결: 강물과 다리의 긴 가로 결
    'ref': 'c5-waterloo-gray-day-nga.jpg',
    'frames': [
      # anchors: [샷 타워(굵은 탑) 바로 왼쪽 아치의 꼭대기, 바로 오른쪽 아치의 꼭대기] — 다리를 맞춘다(창의 층이 달라 탑 높이는 그림마다 다르다)
      ('c5-waterloo-fog-hermitage.jpg',   '안개',   [(375, 345), (640, 350)], None, (5, 8), '안개 속 워털루 다리'),
      ('c5-waterloo-gray-day-nga.jpg',    '흐린 날', [(1520, 1420), (2480, 1430)], None, (8, 10), '흐린 날의 워털루 다리'),
      ('c5-waterloo-sunlight-aic.jpg',    '햇빛',   [(445, 590), (700, 595)], None, (10, 15), '햇빛 속 워털루 다리'),
      ('c5-waterloo-1903-worcester.jpg',  '1903',   [(470, 440), (780, 445)], None, (15, 17), '1903년의 워털루 다리'),
      ('c5-waterloo-dusk-nga.jpg',        '저녁',   [(1430, 1350), (2370, 1350)], None, (17, 5), '저녁의 워털루 다리'),
    ],
    'clock_note': '안개 05–08 · 흐린 날 08–10 · 햇빛 10–15 · 1903(제목에 때가 없음) 15–17 · 저녁 그 밖(17–05)',
  },
  'seine': {
    'name': '센 강의 아침', 'dir': (0.12, 1.0),           # 붓결: 물에 비친 나무의 세로 결
    'ref': 'c5-seine-morning-met.jpg',
    'frames': [
      # anchors: [왼쪽 나무 덩어리가 물과 만나는 모서리]. 네 점 모두 92cm 안팎의 같은 캔버스라 배율은 cm 당 픽셀 비로 고정(fixed_scale), 앵커로 자리만 맞춘다
      ('c5-seine-mist-aic.jpg',          '안개',     [(400, 650)], None, (19, 5), '안개 낀 센 강의 아침', 40.8 / 18.2),
      ('c5-seine-sunrise-marmottan.jpg', '해돋이',   [(590, 720)], None, (5, 7), '해 뜨는 센 강', 40.8 / 16.3),
      ('c5-seine-morning-met.jpg',       '아침',     [(1950, 1720)], None, (7, 10), '센 강의 아침', None),
      ('c5-seine-fair-whitehouse.jpg',   '맑은 아침', [(1330, 1430)], None, (10, 19), '맑게 갠 센 강의 아침', 40.8 / 32.6),
    ],
    'clock_note': '해돋이 05–07(새벽 자리) · 아침 07–10 · 맑은 아침 10–19(정오·오후 자리) · 안개 그 밖(19–05)',
  },
}

def load(f, trim=None):
  """trim=(left, top, right, bottom): 스캔에 들어온 액자·여백을 먼저 잘라낸다(원본 픽셀). 앵커는 자르기 전 좌표"""
  im = Image.open(os.path.join(WORKS, f)).convert('RGB')
  a = np.asarray(im)
  if trim:
    l, t, r, b = trim; a = a[t:a.shape[0] - b, l:a.shape[1] - r]
  return a

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
  rows = [(r + (None, None, None, None))[:7] for r in m['frames']]  # (file, when, anchors, trim, hours, now, fixed_scale)
  trims = dict((f, tr) for f, _, _, tr, _, _, _ in rows)
  ref_anchors = dict((f, a) for f, _, a, _, _, _, _ in rows)[m['ref']]
  ref = load(m['ref'], trims[m['ref']]) if trims[m['ref']] else ref
  H, W = ref.shape[:2]
  if trims[m['ref']]:                                   # 앵커를 자른 좌표계로
    ref_anchors = [(x - trims[m['ref']][0], y - trims[m['ref']][1]) for x, y in ref_anchors]
  fits = []
  for f, when, anchors, trim, hours, now, fixed in rows:
    img = load(f, trim)
    if trim: anchors = [(x - trim[0], y - trim[1]) for x, y in anchors]
    if f == m['ref']:
      s, t = 1.0, np.zeros(2); sc = 1.0
    else:
      if fixed:                                       # 같은 크기 캔버스에 같은 배율로 그린 연작: 배율은 cm 당 픽셀로 고정, 앵커 한 점으로 자리만
        s = fixed; t = np.mean(np.asarray(ref_anchors, float)[:len(anchors)], 0) - s * np.mean(np.asarray(anchors, float), 0)
      else:
        s, t = fit_st(anchors, ref_anchors)
      sc, s2, t2 = refine(ref, img, s, t)
      print(f'  {f}: anchor s={s:.4f} t=({t[0]:.0f},{t[1]:.0f}) → refined s={s2:.4f} t=({t2[0]:.0f},{t2[1]:.0f}) ncc={sc:.3f}')
      s, t = s2, t2
    fits.append((f, when, img, s, t, hours, now))
  # 교집합: 각 그림이 기준 좌표에서 덮는 사각형
  x0, y0, x1, y1 = 0, 0, W, H
  for f, when, img, s, t, _, _ in fits:
    ih, iw = img.shape[:2]
    x0 = max(x0, t[0]); y0 = max(y0, t[1]); x1 = min(x1, t[0] + iw * s); y1 = min(y1, t[1] + ih * s)
  x0, y0, x1, y1 = int(np.ceil(x0)) + 2, int(np.ceil(y0)) + 2, int(np.floor(x1)) - 2, int(np.floor(y1)) - 2
  cw, ch = x1 - x0, y1 - y0
  print(f'  crop {cw}×{ch} at ({x0},{y0}) of ref {W}×{H}')
  scale = OUT_W / max(cw, ch)
  ow, oh = round(cw * scale), round(ch * scale)
  os.makedirs(os.path.join(HERE, key), exist_ok=True)
  out = []
  if PREVIEW:                                           # 검수용: 기준 그림 위에 반투명으로 겹친 사본
    for f, when, img, s, t, _, _ in fits:
      w = warp(img, s, t, (W, H)); ov = (ref * 0.5 + w * 0.5).astype(np.uint8)
      cv2.rectangle(ov, (x0, y0), (x1, y1), (255, 255, 0), 3)
      Image.fromarray(ov).resize((W // 2, H // 2)).save(os.path.join(PREVIEW, f'{key}-{f}.jpg'), quality=80)
  for n, (f, when, img, s, t, hours, now) in enumerate(fits):
    # 한 번에 리샘플: 원본 → (s·scale) 배, 이동 (t − (x0,y0))·scale
    S = s * scale; T = ((t[0] - x0) * scale, (t[1] - y0) * scale)
    w = warp(img, S, T, (ow, oh))
    path = os.path.join(HERE, key, f'{n + 1}.jpg')
    q = save_jpeg(w, path)
    print(f'  {n + 1}.jpg ← {f} ({when}) q{q} {os.path.getsize(path) // 1024}KB')
    row = {'n': n + 1, 'file': f'{key}/{n + 1}.jpg', 'src': f, 'when': when, 'scale': round(float(s), 4), 'offset': [round(float(t[0]), 1), round(float(t[1]), 1)]}
    if hours: row['hours'] = list(hours)
    if now: row['now'] = now
    out.append(row)
  # clock: 지금 시각 → 때 번호. 때 이름을 시간대에 매긴 규칙(새벽 05–07 · 아침 07–10 · 정오/햇빛 10–15 · 오후/해 질 녘 15–19 · 저녁/흐림/안개 그 밖)
  clock = [[h0, h1, i] for i, (_, _, _, _, _, hours, _) in enumerate(fits) if hours for h0, h1 in [hours]]
  return {'name': m['name'], 'dir': list(m['dir']), 'w': ow, 'h': oh, 'ref': m['ref'], 'crop': [x0, y0, cw, ch], 'clock': clock, 'clock_note': m.get('clock_note', ''), 'frames': out}

PREVIEW = os.environ.get('PREVIEW')                  # 겹침 사본을 낼 폴더(검수용). 비우면 안 낸다

if __name__ == '__main__':
  only = sys.argv[1:]                                  # 모티프 키를 주면 그것만 다시 만들고 frames.json 은 합친다
  path = os.path.join(HERE, 'frames.json')
  result = json.load(open(path, encoding='utf-8')) if only and os.path.exists(path) else {}
  for key, m in MOTIFS.items():
    if only and key not in only: continue
    print('▶', key)
    result[key] = run(key, m)
  with open(path, 'w', encoding='utf-8') as fp:
    json.dump(result, fp, ensure_ascii=False, indent=1)
  print('wrote frames.json')
