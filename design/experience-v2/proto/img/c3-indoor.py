# C3 실내 캔버스 재현 — 1873 야외 그림을 1860년대 아틀리에 완성작 팔레트로 "아틀리에에서 마감한" 판으로 바꾼다.
#   팔레트 참조 = 모네 〈정원의 여인들〉 1866–67(오르세, 빌다브레에서 시작해 옹플뢰르 아틀리에에서 완성) [+ 〈풀밭 위의 점심〉 왼쪽 조각 1865–66(오르세)]
# 실행: python3 -I c3-indoor.py <야외 원본.jpg> <참조1.jpg[,참조2.jpg]> <출력 폴더> [<NGA 습작.jpg> <오르세 조각.jpg>]
#   → c3-outdoor.jpg · c3-indoor.jpg (1200×1000, 6:5) · c3-real-1865-study.jpg · c3-real-1866-studio.jpg (같은 인물 무리로 자른 실제 쌍) · c3-compare.png
# 방법 (모두 기기 밖 오프라인, numpy/opencv):
#   1. Lab 색 전이(Reinhard 평균·표준편차) 참조 → 1873 (부분 적용)
#   2. 색상별 재배치: 파랑·보라 → 회녹·엄버(세룰리안·코발트 바이올렛 없음), 분홍·주황 → 시에나·황토, 초록 → 어둡고 따뜻하게(크롬그린+검정),
#      흰색 → 따뜻한 연백 크림. 명도 구조는 유지.
#   3. 참조 그림에서 k-means 로 뽑은 팔레트 쪽으로 색(a·b)을 끌어당긴다 — 색이 그 그림의 물감에서 온다
#   4. 키를 낮춘다(하이라이트 압축·그림자 깊게) + 바니시 난색 + 비네트 + 양방향 필터(글레이즈 마감) + 원본의 캔버스 결 되살리기
import sys, os
import numpy as np
import cv2

src, refs, out = sys.argv[1], sys.argv[2].split(','), sys.argv[3]
pair = sys.argv[4:6]
W, H = 1200, 1000
os.makedirs(out, exist_ok=True)

def load(p):
    im = cv2.imread(p, cv2.IMREAD_COLOR)[:, :, ::-1]
    return im

def crop65(im):
    h, w = im.shape[:2]
    if w / h > 1.2: sw = int(h * 1.2); x = (w - sw) // 2; im = im[:, x:x + sw]
    else: sh = int(w / 1.2); y = (h - sh) // 2; im = im[y:y + sh]
    return cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA)

def lab(im): return cv2.cvtColor(im.astype(np.float32) / 255.0, cv2.COLOR_RGB2Lab)          # L 0~100, a·b ±128
def rgb(l): return np.clip(cv2.cvtColor(l.astype(np.float32), cv2.COLOR_Lab2RGB) * 255, 0, 255).astype(np.uint8)
def stats(l): return l.reshape(-1, 3).mean(0), l.reshape(-1, 3).std(0)

def smoothstep(e0, e1, x): t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

outdoor = crop65(load(src))
ref_ims = [load(r) for r in refs]
ref_im = ref_ims[0]
def small(im, w=900): return cv2.resize(im, (w, int(w * im.shape[0] / im.shape[1])), interpolation=cv2.INTER_AREA)
ref_lab = lab(small(ref_im))                                                   # 통계(Reinhard)는 첫 참조
ref_pool = np.concatenate([lab(small(r)).reshape(-1, 3) for r in ref_ims])      # 팔레트(k-means)는 참조 전부
src_lab = lab(outdoor)

# ── 1. Reinhard 색 전이 (a·b 는 그대로 전이, L 은 표준편차만 맞추고 평균은 뒤에서 키를 낮출 때 정한다)
sm, ss = stats(src_lab); rm, rs = stats(ref_lab)
t = src_lab.copy()
MIX = float(os.environ.get('C3_MIX', 0.35))        # 참조(아틀리에 완성작) 통계 쪽으로 끌어가는 비율(1=완전 Reinhard). 완전 전이는 채도가 무너져 세피아 사진이 된다
for c in range(3):
    full = (t[..., c] - sm[c]) / ss[c] * rs[c] + (rm[c] if c else sm[c])
    t[..., c] = t[..., c] * (1 - MIX) + full * MIX

# ── 2. 색상별 재배치 — 원본의 색상(h)을 기준으로 목표 색상·채도·명도 배율을 정한다 (원본 색이 어떤 물감이었는지로 판단해야 하므로 원본 h 사용)
L0, a0, b0 = src_lab[..., 0], src_lab[..., 1], src_lab[..., 2]
C0 = np.hypot(a0, b0); h0 = (np.degrees(np.arctan2(b0, a0)) + 360) % 360
L, a, b = t[..., 0], t[..., 1], t[..., 2]
C = np.hypot(a, b); h = (np.degrees(np.arctan2(b, a)) + 360) % 360

# 색상 구간 가중치 (Lab 색상각: 빨강≈40, 주황≈60, 노랑≈95, 초록≈140, 청록≈200, 파랑≈280, 보라≈320)
def band(center, width):
    d = np.abs(((h0 - center + 180) % 360) - 180)
    return 1 - smoothstep(width * 0.5, width, d)
w_blue = band(275, 70)                 # 파랑·청자색 (하늘·코발트 화분)
w_violet = band(330, 40)               # 보라·자홍
w_red = band(35, 45)                   # 빨강·분홍 (꽃·벽돌)
w_orange = band(70, 35)                # 주황·살구
w_yellow = band(100, 30)               # 노랑
w_green = band(140, 60)                # 초록 (나무·잔디)
w_teal = band(200, 50)                 # 청록

# 목표 색상(hue), 채도 배율, 명도 배율 — 가중 합성
tgt_h = h.copy(); cf = np.ones_like(h); lf = np.ones_like(h); strength = np.zeros_like(h)
def push(w, th, cfac, lfac, s=1.0):
    global tgt_h, cf, lf, strength
    # 가장 가까운 방향으로 색상각을 섞는다
    d = ((th - tgt_h + 180) % 360) - 180
    tgt_h = (tgt_h + d * w * s) % 360
    cf = cf * (1 - w) + cfac * w
    lf = lf * (1 - w) + lfac * w
    strength = np.maximum(strength, w)
push(w_blue, 165, 0.24, 0.90)          # 파랑 → 차가운 회녹색(연백+검정, 코발트 한 점의 탁한 슬레이트) — 1860년대 아틀리에 그림의 그늘진 회색
push(w_teal, 150, 0.36, 0.92)          # 청록 → 회녹
push(w_violet, 60, 0.40, 0.85)         # 보라 → 엄버(갈색)
push(w_red, 42, 1.0, 0.84)             # 빨강·분홍 → 번트 시에나·레드 레이크 탁한 벽돌색(채도는 두고 색상만 갈색 쪽), 어둡게
push(w_orange, 65, 0.80, 0.90)         # 주황 → 황토
push(w_yellow, 82, 0.85, 0.92)         # 노랑 → 황토(크롬옐로+흑)
push(w_green, 110, 0.70, 0.74)         # 초록 → 크롬그린+검정 혼색: 노란 쪽으로 돌리고 어둡게

C2 = C * cf
h2 = tgt_h
a2 = C2 * np.cos(np.radians(h2)); b2 = C2 * np.sin(np.radians(h2))
L2 = L * lf

# 흰색·밝은 저채도 → 따뜻한 연백 크림 (L 높고 C 낮은 곳)
w_white = smoothstep(68, 85, L0) * (1 - smoothstep(8, 20, C0))
a2 = a2 + 2.5 * w_white; b2 = b2 + 9.0 * w_white

# ── 3. 참조 팔레트로 끌어당기기 — 참조 그림의 Lab k-means 중심 24개, 가장 가까운 중심의 a·b 쪽으로 45%
samp = ref_pool.astype(np.float32)
samp = samp[np.random.RandomState(3).choice(len(samp), 60000, replace=False)]
crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.5)
_, _, centers = cv2.kmeans(samp, 24, None, crit, 4, cv2.KMEANS_PP_CENTERS)
cur = np.stack([L2, a2, b2], -1).reshape(-1, 3).astype(np.float32)
# 명도 차이는 덜 보고(0.5 배) 색차 위주로 가장 가까운 물감을 찾는다
d = ((cur[:, None, 0] - centers[None, :, 0]) * 0.5) ** 2 + (cur[:, None, 1] - centers[None, :, 1]) ** 2 + (cur[:, None, 2] - centers[None, :, 2]) ** 2
near = centers[np.argmin(d, 1)]
pull = float(os.environ.get('C3_PULL', 0.3)) * (1 - 0.6 * w_red.reshape(-1))   # 참조 그림엔 빨강이 적어 꽃은 덜 끌어당긴다(레드 레이크 정도로 남긴다)
cur[:, 1] = cur[:, 1] * (1 - pull) + near[:, 1] * pull
cur[:, 2] = cur[:, 2] * (1 - pull) + near[:, 2] * pull
cur[:, 1:] *= 1.12                                                   # 끌어당기며 눌린 채도를 참조 수준으로 되돌린다
L3, a3, b3 = [cur[:, i].reshape(H, W) for i in range(3)]

# ── 4. 키 낮추기: 하이라이트 압축 + 그림자 깊게 (S 곡선의 아래쪽)
KEY = float(os.environ.get('C3_KEY', 0.4))                          # 클수록 더 어둡게 (0.4 ≈ 평균 L 40 — 어두운 아틀리에 마감)
Ln = np.clip(L3 / 100, 0, 1)
Ln = np.where(Ln > 0.62, 0.62 + (Ln - 0.62) * (1 - 0.3 * KEY), Ln)   # 밝은 곳 눌러서
Ln = Ln ** (1 + 0.12 * KEY)                                           # 그림자 깊게
L4 = Ln * 100 - 3 * KEY
# 바니시(난색 유리막): 밝을수록 노랗게, 전체 살짝 붉게
L4n = np.clip(L4 / 100, 0, 1)
a4 = a3 + 1.2 + 0.8 * L4n
b4 = b3 + 2.5 + 5.0 * L4n
# 비네트 — 아틀리에 조명이 가운데만 닿는 듯
yy, xx = np.mgrid[0:H, 0:W]
r = np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2))
L4 = L4 * (1 - 0.16 * smoothstep(0.55, 1.35, r))

indoor_lab = np.stack([L4, a4, b4], -1)
indoor = rgb(indoor_lab)

# 글레이즈 마감: 양방향 필터로 붓자국을 조금 녹이고, 원본 명도의 고주파(캔버스 결·임파스토 가장자리)를 약하게 되살린다
smooth = cv2.bilateralFilter(indoor, 9, 28, 7)
smooth = cv2.bilateralFilter(smooth, 7, 18, 5)
gray = cv2.cvtColor(outdoor, cv2.COLOR_RGB2GRAY).astype(np.float32)
grain = gray - cv2.GaussianBlur(gray, (0, 0), 1.6)
res = np.clip(smooth.astype(np.float32) + grain[..., None] * 0.45, 0, 255).astype(np.uint8)

def save_jpg(path, im, limit_kb):
    for q in range(86, 50, -3):
        cv2.imwrite(path, im[:, :, ::-1], [cv2.IMWRITE_JPEG_QUALITY, q, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])
        if os.path.getsize(path) <= limit_kb * 1024: return q
    return q

q_in = save_jpg(os.path.join(out, 'c3-indoor.jpg'), res, 180)
# 야외: 원본 JPEG 의 잡티만 아주 살짝 눌러서(결은 남기고) 용량을 줄인다
outdoor_enc = cv2.bilateralFilter(outdoor, 5, 10, 3)
q_out = save_jpg(os.path.join(out, 'c3-outdoor.jpg'), outdoor_enc, 200)

# 완성 뒤 나란히 보여줄 실제 쌍 — 같은 두 인물(바지유·카미유): NGA 1865 야외 습작 / 오르세 〈풀밭 위의 점심〉 왼쪽 조각(아틀리에 완성)
#   둘 다 인물 무리만 같은 비율(0.64)로 잘라 폰 크기에서 비교가 되게 한다
def crop_ratio(im, ratio, cy=0.5):
    h, w = im.shape[:2]
    if w / h > ratio: cw = int(h * ratio); x = (w - cw) // 2; return im[:, x:x + cw]
    ch = int(w / ratio); y = int(np.clip(cy * h - ch / 2, 0, h - ch)); return im[y:y + ch]
if len(pair) == 2:
    study = crop_ratio(load(pair[0]), 0.64)                     # 습작은 두 인물이 화면을 채운다 — 가운데 세로 자르기
    studio = crop_ratio(load(pair[1]), 0.64, cy=0.69)           # 조각(418×150cm)은 아래쪽 2/3 에 인물 — 그 부분만
    for name, im in (('c3-real-1865-study.jpg', study), ('c3-real-1866-studio.jpg', studio)):
        save_jpg(os.path.join(out, name), cv2.resize(im, (420, int(420 / 0.64)), interpolation=cv2.INTER_AREA), 40)

# ── 통계 보고 + 비교 이미지 (실내 | 야외 | 참조)
def fmt(l): m, s = stats(l); return 'L %.1f a %.1f b %.1f | σ L %.1f a %.1f b %.1f' % (*m, *s)
res_lab = lab(res)
print('outdoor 1873 :', fmt(src_lab))
print('indoor  (new):', fmt(res_lab))
print('ref studio   :', fmt(ref_lab), '(' + os.path.basename(refs[0]) + ')')
print('jpeg q indoor %d (%.0f KB) · outdoor %d (%.0f KB)' % (q_in, os.path.getsize(os.path.join(out, 'c3-indoor.jpg')) / 1024, q_out, os.path.getsize(os.path.join(out, 'c3-outdoor.jpg')) / 1024))
cw = 600; ch = 500
ref_small = cv2.resize(crop65(ref_im), (cw, ch), interpolation=cv2.INTER_AREA)
panel = np.full((ch + 44, cw * 3 + 32, 3), 24, np.uint8)
for i, (im, name) in enumerate([(res, 'indoor (1860s studio palette, rebuilt)'), (outdoor, 'outdoor 1873 (AIC, CC0)'), (ref_small, 'palette ref: Monet 1866-67 Women in the Garden (Orsay)')]):
    x = 8 + i * (cw + 8)
    panel[36:36 + ch, x:x + cw] = cv2.resize(im, (cw, ch), interpolation=cv2.INTER_AREA)
    cv2.putText(panel, name, (x, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (235, 235, 235), 1, cv2.LINE_AA)
cv2.imwrite(os.path.join(out, 'c3-compare.png'), panel[:, :, ::-1])
