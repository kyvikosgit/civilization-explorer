# C5 〈인상, 해돋이〉 — 임시 장면 영상 만들기 (실제 AI 영상이 오기 전까지)
#   그림(design/sunrise-brief/painting-2048.jpg)을 부드럽게 흐려 붓결을 지우고, 4:3 1440×1080 판 가운데에 높이 맞춤으로 놓는다
#   (앱이 영상을 그림 비율로 가운데를 잘라 겹치므로 그림 자리가 그대로 맞는다. 양옆 24px 는 가장자리를 거울로 채움).
#   10초 · 30fps: 아주 느린 밀어 들어가기(해 자리를 중심으로 2%), 새벽 색(차가운 파랑 → 따뜻하게), 천천히 흐르는 안개 두 겹.
#   글자는 넣지 않는다("임시 영상" 표시는 화면 HTML 에서). 실행: python3 video/make-placeholder.py  → video/sunrise-placeholder.mp4
import subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
SRC = HERE.parents[2] / 'sunrise-brief' / 'painting-2048.jpg'
OUT = HERE / 'sunrise-placeholder.mp4'
W, H, FPS, SEC = 1440, 1080, 30, 10
N = FPS * SEC
SUN = (0.61, 0.31)                                    # 브리프의 해 자리(그림 기준 왼쪽 61% · 위 31%)
ZOOM = 0.02                                           # 밀어 들어가기 2% (≤ 3%)

pa = Image.open(SRC).convert('RGB')
pw = round(H * pa.width / pa.height)                  # 1392
ox = (W - pw) // 2                                    # 24
paint = pa.resize((pw, H), Image.LANCZOS)
plate = Image.new('RGB', (W, H))
plate.paste(paint, (ox, 0))
plate.paste(paint.crop((0, 0, ox, H)).transpose(Image.FLIP_LEFT_RIGHT), (0, 0))
plate.paste(paint.crop((pw - (W - pw - ox), 0, pw, H)).transpose(Image.FLIP_LEFT_RIGHT), (ox + pw, 0))
# 붓결 지우기: 중간값으로 붓 자국을 뭉갠 뒤 부드럽게 — 형태(배 · 해 · 굴뚝)는 남는다
plate = plate.filter(ImageFilter.MedianFilter(9)).filter(ImageFilter.GaussianBlur(7))
base = np.asarray(plate).astype(np.float32) / 255.0
sx, sy = ox + SUN[0] * pw, SUN[1] * H

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
def radial(cx, cy, rx, ry):
    return np.exp(-(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2))

# 안개: 가로로 긴 저주파 노이즈(가로로 이어지게 감싼다) 두 겹 — 각각 다른 빠르기로 오른쪽으로 흐른다
rng = np.random.default_rng(1872)
def fog_field(gw, gh, blur):
    g = Image.fromarray((rng.random((gh, gw)) * 255).astype(np.uint8))
    g = g.resize((gw * 3, gh), Image.NEAREST)                                  # 가로로 감쌀 여유
    g = g.resize((W * 3, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(blur))
    a = np.asarray(g).astype(np.float32)[:, W:W * 2] / 255.0                   # 가운데 한 판
    a = (a - a.min()) / (a.max() - a.min() + 1e-6)
    return np.concatenate([a, a], axis=1)                                      # 2W — 흘러도 끊기지 않게
fogA, fogB = fog_field(10, 6, 60), fog_field(24, 14, 28)
band = np.exp(-((yy - 0.47 * H) / (0.20 * H)) ** 2) * 0.8 + np.clip((yy - 0.45 * H) / (0.55 * H), 0, 1) * 0.35   # 수평선 둘레와 물 위에 짙게
vign = 1.0 - 0.22 * (((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.62)) ** 2)

def smooth(x): x = min(1.0, max(0.0, x)); return x * x * (3 - 2 * x)
def lerp(a, b, t): return a + (b - a) * t

enc = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-tune', 'film',
                        '-movflags', '+faststart', '-an', str(OUT)], stdin=subprocess.PIPE)
for i in range(N):
    t = i / (N - 1); e = smooth(t)
    # 밀어 들어가기: 해 자리를 고정점으로
    z = 1.0 + ZOOM * smooth(t)
    fr = plate.transform((W, H), Image.AFFINE, (1 / z, 0, sx - sx / z, 0, 1 / z, sy - sy / z), Image.BICUBIC)
    img = np.asarray(fr).astype(np.float32) / 255.0
    # 새벽 색: 처음엔 어둡고 푸르게(채도 낮게), 끝엔 따뜻하고 밝게
    lum = img @ np.array([0.299, 0.587, 0.114], np.float32)
    sat = lerp(0.8, 1.0, e)
    img = lum[..., None] + (img - lum[..., None]) * sat
    gain = np.array([lerp(0.86, 1.05, e), lerp(0.92, 0.98, e), lerp(1.05, 0.95, e)], np.float32) * lerp(0.88, 1.03, e)
    img = img * gain + np.array([0.0, 0.006, 0.03], np.float32) * (1 - e)
    # 해: 따뜻한 빛이 차츰 번진다 + 물 위 세로 반사
    glow = radial(sx, sy, lerp(70, 160, e), lerp(70, 160, e)) * lerp(0.05, 0.30, e) + radial(sx, sy + 0.24 * H, 34, 0.20 * H) * lerp(0.0, 0.10, e)
    img = img + glow[..., None] * np.array([1.0, 0.52, 0.18], np.float32)
    # 안개: 두 겹이 천천히 흐르고, 해가 오를수록 엷어진다
    oa, ob = int(t * 70), int(t * 150)
    fog = (fogA[:, oa:oa + W] * 0.6 + fogB[:, ob:ob + W] * 0.4) * band
    a = np.clip(fog * lerp(0.42, 0.24, e), 0, 0.5)[..., None]
    mist = np.array([lerp(0.66, 0.90, e), lerp(0.72, 0.80, e), lerp(0.80, 0.70, e)], np.float32)
    img = img * (1 - a) + mist * a
    img = img * vign[..., None]
    enc.stdin.write((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
    if i % 60 == 0: print(f'{i}/{N}', file=sys.stderr)
enc.stdin.close(); enc.wait()
print(OUT, OUT.stat().st_size // 1024, 'KB')
