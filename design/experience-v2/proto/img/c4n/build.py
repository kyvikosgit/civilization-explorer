# C4 들어가기 — 나다르 사진관 정면(35, boulevard des Capucines) 실사진을 밤으로 옮긴다.
#
# 원본(퍼블릭 도메인):
#   Nadar, « Façade, Atelier de Nadar au 35, boulevard des Capucines à Paris », 1861~72 사이 알부민 인화
#   https://commons.wikimedia.org/wiki/File:Nadar_-_Fa%C3%A7ade,_Atelier_de_Nadar_au_35,_boulevard_des_Capucines_%C3%A0_Paris.png
#   (BnF Estampes, EST NUM-29111 · Commons: Public domain) — 가장자리 손상 · 하늘의 손글씨를 빼고 잘라 src/nadar-35-capucines.jpg 로 둔다.
#
# 만드는 것(python3 build.py):
#   facade.jpg  1600 폭 — 밤 바탕(하늘은 밤하늘로 바꾸고, 나다르 건물은 붉게, 이웃은 푸른 어둠)
#   lights.png  1024 폭 — 켜지는 빛 마스크(데이터라 JPEG 의 색 압축을 피해 PNG). R = 위층(유리 스튜디오 · 간판 층), G = 아래층 · 가게, B = 길의 가스등 · 젖은 보도에 비친 빛
#   창 위치는 원본 사진에서 잰 값(원본 폭 · 높이에 대한 %)이다. 지어낸 창은 없다.
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__))
src = Image.open(os.path.join(HERE, 'src', 'nadar-35-capucines.jpg')).convert('RGB')
W0, H0 = src.size
# 원본 % → 잘라 낸 이미지의 0..1 (잘라 낸 범위: x 2–96 %, y 6–88.5 %)
def U(x): return (x - 2.0) / 94.0
def V(y): return (y - 6.0) / 82.5

OW = 1600; OH = round(OW * H0 / W0)
a = np.asarray(src.resize((OW, OH), Image.LANCZOS)).astype(np.float32) / 255.0
L = a @ np.array([0.30, 0.55, 0.15], np.float32)
lo, hi = np.percentile(L, 1), np.percentile(L, 99.5)
L = np.clip((L - lo) / (hi - lo), 0, 1)
yy, xx = np.mgrid[0:OH, 0:OW].astype(np.float32)
u = xx / OW; v = yy / OH

def rect(x0, y0, x1, y1, feather=1.5):
    m = ((u >= U(x0)) & (u <= U(x1)) & (v >= V(y0)) & (v <= V(y1))).astype(np.float32)
    return nd.gaussian_filter(m, feather)

# ── 하늘: 밝고 매끈한 곳 중 위 가장자리와 이어진 곳. 오른쪽 37번지 건물(x>81%)과 굴뚝(76–80%)은 하늘이 아니다
sm = nd.gaussian_filter(L, 2)
var = nd.gaussian_filter((L - sm) ** 2, 4)
cand = (sm > 0.60) & (var < 0.0035) & (v < V(27))
cand &= ~((u > U(80.6)))
cand &= ~((u > U(75.8)) & (u < U(80.6)) & (v > V(1.5)))
lab, n = nd.label(cand)
top = set(np.unique(lab[0:3, :])) - {0}
sky = np.isin(lab, list(top))
sky = nd.binary_closing(sky, iterations=3)
sky = nd.binary_fill_holes(sky | (v < 0.004) | ((u < U(12.6)) & (v < V(16.6))))
sky = nd.binary_opening(sky, iterations=1)
skyA = np.clip(nd.gaussian_filter(sky.astype(np.float32), 1.2), 0, 1)

# ── 밤 바탕
def mix(a_, b_, t): return a_ + (b_ - a_) * t
Lc = L ** 1.45
# 나다르 건물 — 1860년대에 붉게 칠한 정면: 몸통(옥상 정원 · 뒤 건물은 빼고) + 가운데 박공 삼각형
ped = ((v >= V(18.3) + (np.abs(u - U(47.0)) / (U(65.0) - U(47.0))) * (V(26.2) - V(18.3))) & (u > U(29.0)) & (u < U(65.0)) & (v < V(27))).astype(np.float32)
nadar = np.clip(rect(11.2, 26.2, 84.2, 71.5, 4) + nd.gaussian_filter(ped, 3), 0, 1)
upper = nadar * np.clip((V(50.0) - v) / 0.03, 0, 1)
red = np.array([0.50, 0.11, 0.10], np.float32); red_up = np.array([0.62, 0.13, 0.12], np.float32)
blue = np.array([0.15, 0.16, 0.23], np.float32); street = np.array([0.12, 0.11, 0.14], np.float32)
tint = blue[None, None, :] * np.ones((OH, OW, 1), np.float32)
tint = mix(tint, red[None, None], nadar[..., None])
tint = mix(tint, red_up[None, None], (upper * 0.6)[..., None])
st = np.clip((v - V(71)) / 0.04, 0, 1)
tint = mix(tint, street[None, None], st[..., None])
base = Lc[..., None] * tint
# 달빛 — 위에서 아주 옅게 푸르게
base += (np.clip(1 - v / 0.55, 0, 1) ** 2 * 0.025)[..., None] * np.array([0.6, 0.7, 1.0], np.float32)
# 밤하늘 — 위는 검푸르고 지평 쪽은 도시 불빛으로 아주 조금 데워진다
sky_top = np.array([0.020, 0.022, 0.045], np.float32); sky_low = np.array([0.10, 0.07, 0.10], np.float32)
skyc = mix(sky_top[None, None], sky_low[None, None], np.clip(v / V(26), 0, 1)[..., None] ** 1.6)
rng = np.random.default_rng(7)
skyc += (nd.gaussian_filter(rng.random((OH, OW)).astype(np.float32), 22) - 0.5)[..., None] * 0.05
base = mix(base, skyc, skyA[..., None])
# 그 시대 판의 결 — 아주 옅은 입자
base += (rng.random((OH, OW, 1)).astype(np.float32) - 0.5) * 0.012
out = np.clip(base, 0, 1) ** (1 / 1.0)
Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(HERE, 'facade.jpg'), quality=90, subsampling=0, optimize=True, progressive=True)

# ── 빛 마스크. 창 안쪽은 원본의 밝기(커튼 · 유리)를 따르고, 창살은 어둡게 남는다
glass = np.clip((L - 0.18) / 0.6, 0, 1) ** 0.8
R = np.zeros_like(L); G = np.zeros_like(L); B = np.zeros_like(L)
# 위층: 유리 스튜디오(가운데 아치 · 좌우), 간판 층 창
arch = ((((u - U(47.0)) / (U(63.4) - U(47.0))) ** 2 + ((v - V(31.0)) / (V(31.0) - V(23.6))) ** 2 <= 1) | (v > V(31.0))) & (v <= V(35.0)) & (u >= U(30.8)) & (u <= U(63.2))
archm = nd.gaussian_filter(arch.astype(np.float32), 1.5)
R += archm * 1.0
R += rect(13.4, 29.2, 28.6, 35.0) * 0.85 + rect(65.8, 28.8, 82.4, 35.0) * 0.85
for x0, x1 in ((13.4, 28.6), (31.4, 45.2), (49.4, 63.2), (66.4, 82.2)):
    R += rect(x0, 40.8, x1, 48.2) * 0.8
# 아래층: 1층 창, 가게 진열창, 가게 간판 띠
for x0, x1, k in ((11.6, 29.4, .55), (32.0, 45.2, .35), (50.0, 63.2, .6), (67.0, 82.0, .4)):
    G += rect(x0, 51.4, x1, 58.4) * k
for x0, x1, k in ((14.0, 28.4, 1.0), (30.0, 45.6, .9), (49.0, 63.4, 1.0), (67.0, 83.0, .85), (85.2, 96.0, .6)):
    G += rect(x0, 61.8, x1, 69.6) * k
G += rect(12.0, 59.9, 84.0, 61.6) * 0.35
# 이웃 창 몇 개(희미하게)
R = np.clip(R, 0, 1) * glass; G = np.clip(G, 0, 1) * glass
# 창빛이 벽에 번진다
R = np.clip(R + nd.gaussian_filter(R, 18) * 0.55, 0, 1); G = np.clip(G + nd.gaussian_filter(G, 16) * 0.5, 0, 1)
# 길: 가스등(오른쪽 가로등 · 왼쪽 광고탑) + 젖은 보도에 세로로 길게 비친 진열창 빛
lamp = np.zeros_like(L)
for (lx, ly, r) in ((63.1, 66.4, 0.006), (9.0, 66.2, 0.008)):
    d = np.sqrt(((u - U(lx)) * OW / OH) ** 2 + (v - V(ly)) ** 2)
    lamp += np.exp(-(d / r) ** 2) + np.exp(-(d / (r * 6)) ** 2) * 0.35
refl = np.zeros_like(L)
shop = (G * (v > V(61.5)) * (v < V(69.8)))
col = shop.max(axis=0)
refl_src = np.zeros_like(L); band = (v > V(71.0)) & (v < V(86.0))
fall = np.clip(1 - (v - V(71.0)) / (V(86.0) - V(71.0)), 0, 1) ** 1.6
refl_src = band * col[None, :] * fall
refl = nd.gaussian_filter(refl_src, (14, 6)) * 0.26 * (0.6 + 0.8 * nd.gaussian_filter(rng.random((OH, OW)).astype(np.float32), (2, 9)))
B = np.clip(lamp + refl, 0, 1)
lights = np.stack([R, G, B], -1)
im = Image.fromarray((np.clip(lights, 0, 1) * 255).astype(np.uint8)).resize((1024, round(1024 * OH / OW)), Image.LANCZOS)
im.save(os.path.join(HERE, 'lights.png'), optimize=True)
if '--preview' in sys.argv:
    warm = np.array([1.0, 0.70, 0.38], np.float32)
    lit = out + R[..., None] * warm * 0.9 + G[..., None] * warm * 0.7 + B[..., None] * np.array([1.0, 0.8, 0.5]) * 0.8
    Image.fromarray((np.clip(lit, 0, 1) * 255).astype(np.uint8)).save(sys.argv[-1], quality=85)
    Image.fromarray((skyA * 255).astype(np.uint8)).save(sys.argv[-1].replace('.jpg', '-sky.png'))
print('ok', OW, OH)
