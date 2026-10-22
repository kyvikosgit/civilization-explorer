# C4 얼굴 정렬 — 사람마다 그림·사진의 수동 5점(js/c4-faces.json: 두 눈 · 코끝 · 입 · 턱)을
# 공통 4:5 얼굴 틀의 기준 자리에 닮음 변환(배율·회전·이동만, 가중 최소제곱 · 눈 가중 3)으로 맞춘다.
# 결과: img/c4f/<id>-{paint,photo}.jpg (720×900, ≤120KB) + c4-faces.json 의 frame(틀 안 정규화 5점) 갱신.
# 실행: python3 img/c4f/align.py        (proto 폴더 기준 상대 경로)
#      python3 img/c4f/align.py --sheet → shots/c4-split-sheet.jpg (왼쪽 그림 | 오른쪽 사진, 타원 비네트)
import json, os, sys
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
PROTO = os.path.normpath(os.path.join(HERE, '..', '..'))
FJ = os.path.join(PROTO, 'js', 'c4-faces.json')
FW, FH = 720, 900
# 기준 자리(틀 정규화): 두 눈 · 코끝 · 입 · 턱
TPL = np.array([[0.395, 0.405], [0.605, 0.405], [0.5, 0.505], [0.5, 0.575], [0.5, 0.665]])
WT = np.array([3, 3, 1, 1, 1.2])

def similarity(src, dst, w):
    # 가중 Umeyama(반사 없음): dst ≈ s R src + t
    w = w / w.sum()
    ms, md = (w[:, None] * src).sum(0), (w[:, None] * dst).sum(0)
    a, b = src - ms, dst - md
    cov = (w[:, None, None] * (b[:, :, None] * a[:, None, :])).sum(0)
    U, S, Vt = np.linalg.svd(cov)
    d = np.sign(np.linalg.det(U @ Vt))
    D = np.diag([1, d])
    R = U @ D @ Vt
    var = (w * (a ** 2).sum(1)).sum()
    s = np.trace(np.diag(S) @ D) / var
    t = md - s * R @ ms
    return np.hstack([s * R, t[:, None]])

def save_jpg(img, path, limit=120 * 1024):
    pil = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    for q in range(86, 40, -4):
        pil.save(path, 'JPEG', quality=q, optimize=True, progressive=True)
        if os.path.getsize(path) <= limit: return q
    return q

def align():
    F = json.load(open(FJ))
    dst = TPL * [FW, FH]
    for p in F['people']:
        for k in ('paint', 'photo'):
            im = cv2.imread(os.path.normpath(os.path.join(PROTO, p[k + 'Src'])))
            h, w = im.shape[:2]
            src = np.array(p[k + 'Lm']) * [w, h]
            M = similarity(src, dst, WT)
            out = cv2.warpAffine(im, M, (FW, FH), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
            q = save_jpg(out, os.path.join(HERE, f"{p['id']}-{k}.jpg"))
            fr = (M[:, :2] @ src.T).T + M[:, 2]
            p[k + 'Frame'] = [[round(x / FW, 4), round(y / FH, 4)] for x, y in fr]
            p[k + 'Scale'] = round(float(np.hypot(*M[:, 0])), 3)   # 원본 1px → 틀 몇 px (>2 이면 흐림)
            err = np.abs(fr - dst).max() / FW
            print(f"{p['id']:9s} {k:5s} scale {p[k + 'Scale']:5.2f}  maxdev {err:.3f}  q{q}  {os.path.getsize(os.path.join(HERE, p['id'] + '-' + k + '.jpg')) // 1024}KB")
    F['frame'] = {'w': FW, 'h': FH, 'template': TPL.tolist()}
    json.dump(F, open(FJ, 'w'), ensure_ascii=False, indent=1)

NAMES = {'liszt': '프란츠 리스트', 'courbet': '귀스타브 쿠르베', 'degas': '에드가 드가', 'zola': '에밀 졸라', 'manet': '에두아르 마네',
         'monet': '클로드 모네', 'morisot': '베르트 모리조', 'renoir': '오귀스트 르누아르', 'hugo': '빅토르 위고', 'pissarro': '카미유 피사로'}
SCORE = {'liszt': 4, 'courbet': 3, 'degas': 4, 'zola': 3, 'manet': 4, 'monet': 5, 'morisot': 3, 'renoir': 4, 'hugo': 4, 'pissarro': 4}

def oval(w, h):
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.hypot((xx - w / 2) / (w * 0.47), (yy - h * 0.49) / (h * 0.47))
    return np.clip((1.0 - r) / 0.16 + 0.0, 0, 1) ** 1.2   # 가장자리에서 부드럽게 꺼짐

def sheet():
    F = json.load(open(FJ))
    TW, TH, CAP = 400, 500, 64
    font = ImageFont.truetype('/System/Library/Fonts/AppleSDGothicNeo.ttc', 22)
    small = ImageFont.truetype('/System/Library/Fonts/AppleSDGothicNeo.ttc', 16)
    cols = 5; rows = 2
    S = Image.new('RGB', (cols * TW + (cols + 1) * 16, rows * (TH + CAP) + (rows + 1) * 16), (15, 14, 13))
    V = oval(TW, TH)[..., None]
    for i, p in enumerate(F['people']):
        a = np.asarray(Image.open(os.path.join(HERE, p['id'] + '-paint.jpg')).convert('RGB').resize((TW, TH), Image.LANCZOS), float)
        b = np.asarray(Image.open(os.path.join(HERE, p['id'] + '-photo.jpg')).convert('RGB').resize((TW, TH), Image.LANCZOS), float)
        # 얼굴 가운데 선 = 두 장의 (눈 가운데 · 코 · 입) x 평균
        cx = np.mean([np.mean([(f[0][0] + f[1][0]) / 2, f[2][0], f[3][0]]) for f in (p['paintFrame'], p['photoFrame'])])
        xs = int(round(cx * TW))
        m = a.copy(); m[:, xs:] = b[:, xs:]
        bg = np.array([28, 25, 22], float)
        m = m * V + bg * (1 - V)
        t = Image.fromarray(m.clip(0, 255).astype(np.uint8))
        d = ImageDraw.Draw(t); d.line([(xs, 0), (xs, TH)], fill=(255, 255, 255), width=2)
        x = 16 + (i % cols) * (TW + 16); y = 16 + (i // cols) * (TH + CAP + 16)
        S.paste(t, (x, y))
        d = ImageDraw.Draw(S)
        d.text((x, y + TH + 8), f"{i + 1}. {NAMES[p['id']]}", font=font, fill=(255, 255, 255))
        d.text((x, y + TH + 38), f"구도 일치 {SCORE[p['id']]}/5 · 원본 배율 그림 ×{p['paintScale']} · 사진 ×{p['photoScale']}", font=small, fill=(190, 185, 178))
        d.text((x + TW - 112, y + 6), '그림 | 사진', font=small, fill=(255, 255, 255))
    out = os.path.join(PROTO, 'shots', 'c4-split-sheet.jpg')
    S.save(out, 'JPEG', quality=86, optimize=True)
    print(out, S.size, os.path.getsize(out) // 1024, 'KB')

if __name__ == '__main__':
    if '--sheet' in sys.argv: sheet()
    else: align()
