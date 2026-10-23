# C4 사진관 안 — BnF 실내 사진(c.1861)에서 잘라 낸 실물 텍스처. python3 build.py [sheet]
#   src/088b.jpg  ← nad_088 "Atelier Nadar, 35 bd des Capucines: le poêle" (expositions.bnf.fr/les-nadar/grand_en/nad_088.php)
#   src/311full.jpg ← nad_311 "le Panthéon Nadar dans l'atelier" (expositions.bnf.fr/les-nadar/grand_en/nad_311.php)
#   원본 사진(1861)은 퍼블릭 도메인. BnF 디지털 사본의 상업적 재사용 조건은 배포 전에 확인할 것.
# 출력(모두 기기에서 노멀을 다시 계산한다 — 여기서는 색 · 알파만):
#   stove.jpg   난로 앞면 · 처마 · 받침 · 탑 · 콘솔 둘(아틀라스)
#   objets.png  그릇 · 키 큰 그릇 · 작은 조상 · 접시 · 장식판(배경을 지운 알파 컷아웃 아틀라스) + objets.json(칸 좌표)
#   pantheon.jpg 모서리 위의 '나다르 판테온' 석판화(1854) — nad_311 속에 걸린 그대로
import json, sys, os
import cv2, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get('C4ROOM_SRC', os.path.join(HERE, 'src'))
im88 = cv2.imread(os.path.join(SRC, '088b.jpg'))
im311 = cv2.imread(os.path.join(SRC, '311full.jpg'))

def crop(im, b): x0, y0, x1, y1 = b; return im[y0:y1, x0:x1].copy()
def tone(c, lo=(34, 26, 20), hi=(214, 226, 236)):
    # 세피아 사진 → 유약 · 나무 톤(BGR). 밝기만 쓰고 색은 중립의 따뜻한 두 끝으로
    g = cv2.cvtColor(c, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    g = cv2.createCLAHE(clipLimit=1.15, tileGridSize=(4, 4)).apply((g * 255).astype(np.uint8)).astype(np.float32) / 255.0
    lo, hi = np.array(lo, np.float32), np.array(hi, np.float32)
    return (lo + (hi - lo) * g[..., None]).clip(0, 255).astype(np.uint8)
def cutout(c, thr=None, grow=1):
    # 어두운 벽 배경을 가장자리에서부터 채워 지운다 → 남은 것이 물건
    g = cv2.GaussianBlur(cv2.cvtColor(c, cv2.COLOR_BGR2GRAY), (3, 3), 0)
    h, w = g.shape
    if thr is None: thr = int(np.percentile(np.concatenate([g[0], g[-1], g[:, 0], g[:, -1]]), 70)) + 10
    bg = (g <= thr).astype(np.uint8)
    mask = np.zeros((h + 2, w + 2), np.uint8); fill = bg.copy() * 255
    for x in range(w):
        for y in (0, h - 1):
            if bg[y, x] and fill[y, x] == 255: cv2.floodFill(fill, mask, (x, y), 128)
    for y in range(h):
        for x in (0, w - 1):
            if bg[y, x] and fill[y, x] == 255: cv2.floodFill(fill, mask, (x, y), 128)
    a = (fill != 128).astype(np.uint8) * 255
    a = cv2.morphologyEx(a, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(a)
    if n > 1:
        k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); a = (lab == k).astype(np.uint8) * 255
    a = cv2.dilate(a, np.ones((2 * grow + 1, 2 * grow + 1), np.uint8)) if grow > 0 else a
    return cv2.GaussianBlur(a, (3, 3), 0)

def ellipse_mask(c, inset=2):
    # 접시: 둥근 판 — 상자에 내접하는 타원(가장자리 2px 부드럽게)
    h, w = c.shape[:2]; a = np.zeros((h, w), np.uint8)
    cv2.ellipse(a, (w // 2, h // 2), (w // 2 - inset, h // 2 - inset), 0, 0, 360, 255, -1)
    return cv2.GaussianBlur(a, (5, 5), 0)
def grab(c, it=8):
    # 장식판 · 조상: GrabCut — 테두리 3px = 배경, 가운데 세로 띠 = 물건, 나머지 = 아마도 물건
    h, w = c.shape[:2]; m = np.full((h, w), cv2.GC_PR_FGD, np.uint8); bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    m[:3, :] = m[-3:, :] = cv2.GC_BGD; m[:, :3] = m[:, -3:] = cv2.GC_BGD
    m[h // 25: h - h // 20, w // 2 - max(2, w // 12): w // 2 + max(2, w // 12)] = cv2.GC_FGD
    cv2.grabCut(c, m, None, bg, fg, it, cv2.GC_INIT_WITH_MASK)
    a = np.where((m == 1) | (m == 3), 255, 0).astype(np.uint8)
    a = cv2.morphologyEx(a, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(a)
    if n > 1: k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); a = (lab == k).astype(np.uint8) * 255
    return cv2.GaussianBlur(a, (3, 3), 0)

# ── 088b 좌표(원본 픽셀)
STOVE = {
  'body':    (611, 835, 1081, 1397),
  'cornice': (601, 822, 1096, 852),
  'plinth':  (566, 1395, 1096, 1495),
  'tower':   (800, 500, 910, 830),
  'crown':   (776, 445, 936, 505),
  'conL':    (516, 935, 616, 1370),
  'conR':    (1066, 950, 1176, 1380),
}
OBJ = {   # 이름: (상자, 종류)  v = 돌림 그릇(난로 아틀라스로, 앞에서 비춘 무늬를 감싼다) · p = 접시(둥근 판) · c = 오려 낸 판(장식판 · 조상)
  'vaseL':  ((636, 486, 716, 688), 'v'), 'vaseR': ((1001, 500, 1076, 693), 'v'),
  'jarL':   ((622, 722, 705, 833), 'v'), 'jarR': ((997, 727, 1080, 838), 'v'),
  'jugL':   ((732, 757, 785, 832), 'v'), 'jugR': ((907, 762, 960, 837), 'v'),
  'figL':   ((722, 576, 780, 690), 'c'), 'figR': ((942, 581, 1000, 695), 'c'), 'knight': ((806, 700, 871, 832), 'c'),
  'saintL': ((519, 683, 618, 917), 'c'), 'saintR': ((1069, 683, 1183, 937), 'c'),
  'cart': ((392, 474, 518, 590), 'c'), 'plqL': ((694, 500, 800, 612), 'c'), 'plqR': ((903, 503, 1009, 612), 'c'),
  'p1': ((243, 494, 362, 594), 'p'), 'p2': ((548, 487, 618, 559), 'p'), 'p3': ((546, 560, 618, 633), 'p'),
  'p4': ((1093, 504, 1168, 581), 'p'), 'p5': ((1193, 494, 1309, 611), 'p'), 'p6': ((1348, 489, 1478, 611), 'p'), 'p7': ((1507, 504, 1628, 626), 'p'),
}
PANTHEON = (535, 445, 892, 738)   # 311full 좌표: 판화 면(매트 안쪽)

if __name__ == '__main__' and len(sys.argv) > 1 and sys.argv[1] == 'sheet':
    out = os.environ.get('OUT', '.')
    for k, b in STOVE.items(): cv2.imwrite(f'{out}/s_{k}.png', crop(im88, b))
    for k, (b, t) in OBJ.items(): cv2.imwrite(f'{out}/o_{k}.png', crop(im88, b))
    cv2.imwrite(f'{out}/pan.png', crop(im311, PANTHEON))
    sys.exit(0)

def pack(items, W, H, pad=4):
    # 선반 쌓기: 큰 것부터 줄마다
    out, x, y, rh = {}, pad, pad, 0
    for k, im in sorted(items.items(), key=lambda kv: -kv[1].shape[0]):
        h, w = im.shape[:2]
        if x + w + pad > W: x, y, rh = pad, y + rh + pad, 0
        assert y + h + pad <= H, ('atlas full', k)
        out[k] = (x, y, w, h); x += w + pad; rh = max(rh, h)
    return out

if __name__ == '__main__' and len(sys.argv) == 1:
    # 난로 아틀라스(JPEG): 유약 크림 · 받침과 콘솔은 짙은 나무
    st = {}
    for k, (b, t) in OBJ.items():
        if t == 'v': st[k] = tone(crop(im88, b), (22, 34, 52), (176, 212, 236))
    for k, b in STOVE.items():
        c = crop(im88, b)
        st[k] = tone(c, (22, 34, 52), (176, 212, 236)) if k in ('body', 'cornice', 'tower', 'crown') else tone(c, (6, 9, 14), (58, 84, 120))
    W = H = 1024
    lay = pack(st, W, H)
    atlas = np.full((H, W, 3), 40, np.uint8)
    for k, (x, y, w, h) in lay.items(): atlas[y:y + h, x:x + w] = st[k]
    cv2.imwrite(os.path.join(HERE, 'stove.jpg'), atlas, [cv2.IMWRITE_JPEG_QUALITY, 84])
    # 물건 아틀라스(PNG, 알파): 그릇 · 조상 · 접시 · 장식판
    ob = {}
    for k, (b, t) in OBJ.items():
        if t == 'v': continue
        c = crop(im88, b)
        dark = k.startswith(('fig', 'knight', 'saint'))
        col = tone(c, (12, 18, 26), (112, 150, 186)) if dark else tone(c, (24, 36, 54), (172, 208, 232))
        a = ellipse_mask(c) if t == 'p' else grab(c)
        ob[k] = np.dstack([col, a])
    lay2 = pack(ob, 1024, 512)
    at2 = np.zeros((512, 1024, 4), np.uint8)
    for k, (x, y, w, h) in lay2.items(): at2[y:y + h, x:x + w] = ob[k]
    cv2.imwrite(os.path.join(HERE, 'objets.png'), at2, [cv2.IMWRITE_PNG_COMPRESSION, 9])
    pan = tone(crop(im311, PANTHEON), (26, 30, 36), (200, 214, 222))
    cv2.imwrite(os.path.join(HERE, 'pantheon.jpg'), pan, [cv2.IMWRITE_JPEG_QUALITY, 86])
    json.dump({'stove': {k: list(v) for k, v in lay.items()}, 'stoveSize': [W, H], 'objets': {k: list(v) for k, v in lay2.items()}, 'objetsSize': [1024, 512],
               'src': {k: list(b) for k, b in STOVE.items()} | {k: list(b) for k, (b, t) in OBJ.items()}}, open(os.path.join(HERE, 'atlas.json'), 'w'))
    print('ok', {k: os.path.getsize(os.path.join(HERE, k)) for k in ('stove.jpg', 'objets.png', 'pantheon.jpg')})
