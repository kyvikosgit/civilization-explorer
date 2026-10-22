#!/usr/bin/env python3
"""C5 살아 있는 연작 — 모핑 대응점 (이웃한 두 그림 사이)
정렬된 프레임(img/c5/<motif>/<n>.jpg, 같은 크기)마다 이웃 쌍 (n, n+1) 의 대응점을 만든다.
  · 수동 앵커(MANUAL, 0–1000 정규 좌표): 더미 꼭대기·밑변, 장미창·정문, 탑 꼭대기·물가, 아치 쐐기돌, 나무 윤곽 등 모티프의 형태
  · 자동: 1/4 해상도 DoG(큰 형태) 격자 패치의 정규화 상관(NCC) 탐색 → 상관이 낮거나 이웃 흐름과 어긋나는 점은 버림(RANSAC 식 지역 일관성)
  · 테두리 고정점 + 모서리
  · 중간 위치(t=.5)에서 들로네 삼각분할(cv2.Subdiv2D) → 삼각형 색인
→ img/c5/<motif>/morph.json  { "w","h", "pairs":[{"a","b","pts":[[xa,ya,xb,yb],…],"tris":[[i,j,k],…],"manual":n,"auto":n}] }
PREVIEW=<dir> 를 주면 쌍마다 25·50·75% 모핑(파이썬 piecewise-affine)을 그려 검수용으로 낸다.
실행: python3 design/experience-v2/proto/img/c5/morph.py [motif…]
"""
import json, os, sys
import numpy as np
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
FR = json.load(open(os.path.join(HERE, 'frames.json'), encoding='utf-8'))
PREVIEW = os.environ.get('PREVIEW')

# ── 수동 앵커 — 이름이 같은 점끼리 대응한다(프레임마다 이름이 있을 때만). 좌표는 0–1000
MANUAL = {
  'haystacks': {
    # apex 꼭대기 · lm/rm 좌우 비탈 중간 · lw/rw 좌우 허리 · lb/rb 좌우 밑동 · bc 밑 가운데 · hl/hr 지평선 양 끝
    1: dict(apex=(300, 250), lm=(175, 470), rm=(465, 470), lw=(120, 620), rw=(560, 620), lb=(105, 740), rb=(590, 740), bc=(330, 780), hl=(0, 215), hr=(1000, 215)),
    2: dict(apex=(400, 240), lm=(290, 470), rm=(520, 470), lw=(160, 650), rw=(640, 650), lb=(130, 760), rb=(680, 760), bc=(400, 800), hl=(0, 290), hr=(1000, 290)),
    3: dict(apex=(380, 200), lm=(260, 430), rm=(510, 430), lw=(130, 620), rw=(610, 620), lb=(110, 730), rb=(640, 730), bc=(380, 790), hl=(0, 400), hr=(1000, 400)),
    4: dict(apex=(380, 230), lm=(260, 450), rm=(500, 450), lw=(150, 650), rw=(580, 650), lb=(120, 750), rb=(610, 750), bc=(380, 800), hl=(0, 240), hr=(1000, 240)),
    5: dict(apex=(390, 250), lm=(280, 470), rm=(520, 470), lw=(170, 650), rw=(630, 650), lb=(140, 760), rb=(660, 760), bc=(400, 810), hl=(0, 210), hr=(1000, 210)),
  },
  'rouen': {
    # rw 장미창 가운데 · sw 작은 원창 · pa 정문 아치 꼭대기 · pl/pr 정문 양 발 · tl/tr 위 난간 양 끝
    1: dict(rw=(620, 300), sw=(530, 520), pa=(580, 620), pl=(480, 900), pr=(700, 900), tl=(300, 110), tr=(820, 110)),
    2: dict(rw=(670, 300), sw=(560, 520), pa=(670, 620), pl=(560, 900), pr=(800, 900), tl=(330, 110), tr=(860, 110)),
    3: dict(rw=(640, 290), sw=(560, 540), pa=(660, 620), pl=(560, 900), pr=(760, 900), tl=(300, 100), tr=(820, 100)),
    4: dict(rw=(650, 290), sw=(560, 530), pa=(650, 620), pl=(560, 900), pr=(770, 900), tl=(300, 120), tr=(830, 120)),
    5: dict(rw=(610, 320), sw=(480, 530), pa=(560, 640), pl=(470, 900), pr=(660, 900), tl=(260, 120), tr=(790, 120)),
  },
  'parliament': {
    # tl/tr 빅토리아 탑 꼭대기 양 끝 · bl/br 탑 아래 지붕선 · rl/rr 건물 지붕선 양 끝 · wl/wr 건물이 물에 닿는 양 끝 · sp 가운데 첨탑
    1: dict(tl=(530, 10), tr=(679, 10), bl=(530, 476), br=(679, 476), rl=(96, 476), rr=(998, 487), wl=(96, 625), wr=(998, 625), sp=(762, 215)),
    2: dict(tl=(541, 0), tr=(679, 0), bl=(541, 442), br=(679, 442), rl=(117, 442), rr=(998, 465), wl=(117, 614), wr=(998, 614), sp=(773, 203)),
    3: dict(tl=(541, 21), tr=(679, 21), bl=(541, 431), br=(679, 431), rl=(96, 431), rr=(998, 442), wl=(96, 614), wr=(998, 614), sp=(762, 203)),
    4: dict(tl=(541, 10), tr=(679, 10), bl=(541, 476), br=(679, 476), rl=(106, 476), rr=(998, 487), wl=(106, 761), wr=(998, 761), sp=(773, 226)),
    5: dict(tl=(530, 32), tr=(657, 32), bl=(530, 420), br=(657, 420), rl=(106, 420), rr=(998, 431), wl=(106, 670), wr=(998, 670), sp=(731, 226)),
  },
  'waterloo': {
    # p1–p4 아치 쐐기돌(왼쪽부터) · pl/pr 난간선 양 끝 · wl/wr 물가 양 끝 · ck 굵은 탑 꼭대기 · cn 가는 굴뚝 꼭대기
    1: dict(p1=(140, 700), p2=(385, 710), p3=(630, 720), pl=(0, 640), pr=(1000, 650), wl=(0, 820), wr=(1000, 830), ck=(430, 160), cn=(560, 100)),
    2: dict(p1=(185, 560), p2=(425, 560), p3=(690, 570), p4=(940, 580), pl=(0, 430), pr=(1000, 440), wl=(0, 690), wr=(1000, 690), ck=(555, 50), cn=(720, 20)),
    3: dict(p1=(190, 460), p2=(430, 470), p3=(690, 470), p4=(930, 480), pl=(0, 350), pr=(1000, 355), wl=(0, 560), wr=(1000, 565), ck=(480, 160), cn=(570, 150)),
    4: dict(p1=(160, 560), p2=(420, 560), p3=(690, 565), p4=(930, 570), pl=(0, 420), pr=(1000, 425), wl=(0, 690), wr=(1000, 690), ck=(430, 80), cn=(545, 50)),
    5: dict(p1=(170, 580), p2=(430, 590), p3=(690, 600), p4=(940, 600), pl=(0, 450), pr=(1000, 455), wl=(0, 700), wr=(1000, 700), ck=(470, 90), cn=(610, 60)),
  },
  'seine': {
    # a 왼쪽 나무덩어리 위 모서리 · b 그 가장자리 중간 · c 물과 만나는 모서리 · hl/hr 물가선 양 끝 · ft 오른쪽 나무 꼭대기 · fc 그 물가 · fr 맨 오른쪽 · re 반영 가장자리 · rb 반영 아래
    1: dict(a=(400, 60), b=(470, 300), c=(400, 520), hl=(0, 520), hr=(1000, 520), ft=(1000, 300), fc=(1000, 520), re=(470, 700), rb=(560, 950)),
    2: dict(a=(440, 60), b=(520, 300), c=(470, 500), hl=(0, 500), hr=(1000, 500), ft=(720, 250), fc=(760, 500), fr=(1000, 250), re=(480, 700), rb=(560, 950)),
    3: dict(a=(420, 60), b=(470, 300), c=(420, 500), hl=(0, 500), hr=(1000, 500), ft=(650, 230), fc=(730, 500), fr=(1000, 230), re=(480, 700), rb=(560, 950)),
    4: dict(a=(430, 60), b=(480, 300), c=(420, 500), hl=(0, 500), hr=(1000, 500), ft=(720, 200), fc=(760, 500), fr=(1000, 230), re=(470, 700), rb=(500, 950)),
  },
}

def dog(gray):
  g = gray.astype(np.float32)
  return cv2.GaussianBlur(g, (0, 0), 1.5) - cv2.GaussianBlur(g, (0, 0), 6.0)

def auto_match(A, B, grid=9, patch=0.09, search=0.06, thresh=0.45):
  """1/4 해상도 DoG 에서 격자 패치마다 B 안을 탐색해 NCC 최대 자리를 찾는다. (xa,ya,xb,yb, ncc) 정규 좌표"""
  k = 4
  a = dog(cv2.cvtColor(cv2.resize(A, (A.shape[1] // k, A.shape[0] // k), interpolation=cv2.INTER_AREA), cv2.COLOR_RGB2GRAY))
  b = dog(cv2.cvtColor(cv2.resize(B, (B.shape[1] // k, B.shape[0] // k), interpolation=cv2.INTER_AREA), cv2.COLOR_RGB2GRAY))
  H, W = a.shape; ps = int(max(W, H) * patch) | 1; sr = int(max(W, H) * search)
  out = []
  for gy in range(grid):
    for gx in range(grid):
      cx = int((gx + 0.5) / grid * W); cy = int((gy + 0.5) / grid * H)
      x0, y0 = cx - ps // 2, cy - ps // 2
      if x0 < 0 or y0 < 0 or x0 + ps > W or y0 + ps > H: continue
      tpl = a[y0:y0 + ps, x0:x0 + ps]
      if tpl.std() < 1.5: continue                         # 밋밋한 하늘·안개는 건너뛴다
      sx0, sy0 = max(0, x0 - sr), max(0, y0 - sr); sx1, sy1 = min(W, x0 + ps + sr), min(H, y0 + ps + sr)
      reg = b[sy0:sy1, sx0:sx1]
      if reg.shape[0] < ps or reg.shape[1] < ps: continue
      res = cv2.matchTemplate(reg, tpl, cv2.TM_CCOEFF_NORMED)
      _, mx, _, loc = cv2.minMaxLoc(res)
      if mx < thresh: continue
      bx, by = sx0 + loc[0] + ps // 2, sy0 + loc[1] + ps // 2
      out.append((cx / W, cy / H, bx / W, by / H, float(mx)))
  return out

def filter_flow(auto, manual, tol=0.025):
  """이웃(반경 .2)한 대응점들의 중앙 흐름과 tol 넘게 어긋나는 자동점은 버린다 — 수동 앵커는 항상 남긴다"""
  pts = [(x, y, u - x, v - y, True) for x, y, u, v in manual] + [(x, y, u - x, v - y, False) for x, y, u, v, _ in auto]
  keep = []
  for i, (x, y, dx, dy, man) in enumerate(pts):
    if man: keep.append((x, y, x + dx, y + dy)); continue
    nb = [(ddx, ddy) for j, (xx, yy, ddx, ddy, _) in enumerate(pts) if j != i and (xx - x) ** 2 + (yy - y) ** 2 < 0.2 ** 2]
    if len(nb) >= 3:
      mdx = float(np.median([n[0] for n in nb])); mdy = float(np.median([n[1] for n in nb]))
      if abs(dx - mdx) > tol or abs(dy - mdy) > tol: continue
    keep.append((x, y, x + dx, y + dy))
  return keep

def dedupe(pts, mind=0.035):
  out = []
  for p in pts:
    if all((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 >= mind ** 2 for q in out): out.append(p)
  return out

def border():
  b = []
  for i in range(0, 7):
    u = i / 6; b += [(u, 0.0, u, 0.0), (u, 1.0, u, 1.0)]
    if 0 < i < 6: b += [(0.0, u, 0.0, u), (1.0, u, 1.0, u)]
  return b

def triangulate(pts, w, h):
  """중간 위치(t=.5)의 들로네 삼각분할. Subdiv2D 의 꼭짓점 id(4부터)로 되돌려 색인한다"""
  mid = [((p[0] + p[2]) / 2 * w, (p[1] + p[3]) / 2 * h) for p in pts]
  sub = cv2.Subdiv2D((-10, -10, w + 20, h + 20))
  ids = {}                                              # subdiv vertex id → pts 색인
  for i, (x, y) in enumerate(mid):
    x = float(min(max(x, 0), w)); y = float(min(max(y, 0), h))
    vid, _ = sub.findNearest((x, y)) if ids else (0, None)
    if ids and vid in ids:
      px, py = sub.getVertex(vid)[0]
      if abs(px - x) < 0.5 and abs(py - y) < 0.5: continue
    vid = sub.insert((x, y)); ids[vid] = i
  tris = []
  for t in sub.getTriangleList():
    tri = []
    for j in range(3):
      vid, _ = sub.findNearest((float(t[j * 2]), float(t[j * 2 + 1])))
      if vid not in ids: break
      tri.append(ids[vid])
    if len(tri) == 3 and len(set(tri)) == 3: tris.append(tri)
  return tris

def warp_tri(src, dst, pts_src, pts_dst, tris, t):
  """piecewise affine: src 를 (1−t)·src점 + t·dst점 위치로 — 검수용(삼각형마다 전체 크기로 워프해 마스크로 모은다)"""
  h, w = src.shape[:2]; out = np.zeros_like(src)
  P = np.asarray(pts_src, np.float32); Q = np.asarray(pts_dst, np.float32); M = P * (1 - t) + Q * t
  for a, b, c in tris:
    s = np.float32([P[a], P[b], P[c]]); d = np.float32([M[a], M[b], M[c]])
    mat = cv2.getAffineTransform(s, d)
    warped = cv2.warpAffine(src, mat, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    mask = np.zeros((h, w), np.uint8); cv2.fillConvexPoly(mask, np.int32(np.round(d)), 255)
    out[mask > 0] = warped[mask > 0]
  return out

def run(key):
  m = FR[key]; w, h = m['w'], m['h']
  ims = [cv2.cvtColor(cv2.imread(os.path.join(HERE, f['file'])), cv2.COLOR_BGR2RGB) for f in m['frames']]
  pairs = []
  for i in range(len(ims) - 1):
    A, B = ims[i], ims[i + 1]; na, nb = i + 1, i + 2
    ma, mb = MANUAL.get(key, {}).get(na, {}), MANUAL.get(key, {}).get(nb, {})
    manual = [(ma[k][0] / 1000, ma[k][1] / 1000, mb[k][0] / 1000, mb[k][1] / 1000) for k in ma if k in mb]
    auto = auto_match(A, B)
    pts = filter_flow(auto, manual)
    pts = dedupe(pts) + [b for b in border() if all((b[0] - p[0]) ** 2 + (b[1] - p[1]) ** 2 >= 0.03 ** 2 for p in pts)]
    tris = triangulate(pts, w, h)
    print(f'  {key} {na}→{nb}: manual {len(manual)} · auto {len(auto)} → kept {len(pts)} pts · {len(tris)} tris')
    pairs.append({'a': na, 'b': nb, 'pts': [[round(v, 4) for v in p] for p in pts], 'tris': tris, 'manual': len(manual), 'auto': len(pts) - len(manual) - 24})
    if PREVIEW:
      P = [(p[0] * w, p[1] * h) for p in pts]; Q = [(p[2] * w, p[3] * h) for p in pts]
      for t in (0.25, 0.5, 0.75):
        wa = warp_tri(A, B, P, Q, tris, t); wb = warp_tri(B, A, Q, P, tris, 1 - t)
        s = t * t * (3 - 2 * t); mix = (wa * (1 - s) + wb * s).astype(np.uint8)
        cv2.imwrite(os.path.join(PREVIEW, f'{key}-{na}{nb}-{int(t * 100)}.jpg'), cv2.cvtColor(cv2.resize(mix, (w // 2, h // 2)), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 82])
  json.dump({'w': w, 'h': h, 'pairs': pairs}, open(os.path.join(HERE, key, 'morph.json'), 'w'), separators=(',', ':'))

if __name__ == '__main__':
  only = sys.argv[1:]
  for key in FR:
    if only and key not in only: continue
    print('▶', key); run(key)
