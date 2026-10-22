# C4 인물 25쌍 → 4:5 얼굴·어깨 틀(정렬은 느슨하게: 눈 가운데를 40% 높이, 틀 너비 = 눈→입 거리 × 5.6)
# 결과: img/c4p/<id>-{paint,photo}.jpg (480×600, ≤60KB · 벽에 거는 작은 판)
#       img/c4p/lg/<id>-{paint,photo}.jpg (840×1050, ≤200KB · 크게 볼 때만 받는다)
# 실행(proto 폴더에서): python3 img/c4p/build.py --dl <위키미디어 공용에서 받은 원본 폴더>
#   js/c4-people.json 의 src 가 "@dl/..." 이면 --dl 폴더에서, 아니면 proto 기준 상대 경로에서 읽는다. 원본 파일 페이지는 각 항목의 page.
import json, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PROTO = os.path.normpath(os.path.join(HERE, '..', '..'))
DL = sys.argv[sys.argv.index('--dl') + 1] if '--dl' in sys.argv else os.path.join(HERE, 'dl')

def box(w, h, eye, em, kx=5.6, ey=0.40):
    ex, eyy = eye[0] * w, eye[1] * h; s = em * h
    cw = kx * s; ch = cw * 1.25
    if cw > w: cw = w; ch = cw * 1.25
    if ch > h: ch = h; cw = ch / 1.25
    x0 = min(max(ex - cw / 2, 0), w - cw); y0 = min(max(eyy - ey * ch, 0), h - ch)
    return (round(x0), round(y0), round(x0 + cw), round(y0 + ch))

def save(im, path, limit):
    for q in range(84, 30, -4):
        im.save(path, 'JPEG', quality=q, optimize=True, progressive=True)
        if os.path.getsize(path) <= limit: return q
    return q

def main():
    F = json.load(open(os.path.join(PROTO, 'js', 'c4-people.json')))
    os.makedirs(os.path.join(HERE, 'lg'), exist_ok=True)
    for p in F['people']:
        for k in ('paint', 'photo'):
            e = p[k]; src = e['src']
            path = os.path.join(DL, src[4:]) if src.startswith('@dl/') else os.path.normpath(os.path.join(PROTO, src))
            im = Image.open(path).convert('RGB')
            b = box(*im.size, e['crop']['eye'], e['crop']['em'])
            c = im.crop(b)
            q1 = save(c.resize((480, 600), Image.LANCZOS), os.path.join(HERE, f"{p['id']}-{k}.jpg"), 60 * 1024)
            q2 = save(c.resize((840, 1050), Image.LANCZOS), os.path.join(HERE, 'lg', f"{p['id']}-{k}.jpg"), 200 * 1024)
            e['cropPx'] = list(b); e['cropSrcPx'] = b[2] - b[0]   # 원본에서 잘라 쓴 너비(px) — 480 보다 작으면 확대된 것
            print(f"{p['id']:12s} {k:5s} crop {b[2] - b[0]:5d}px  q{q1}/q{q2}")
    json.dump(F, open(os.path.join(PROTO, 'js', 'c4-people.json'), 'w'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()
