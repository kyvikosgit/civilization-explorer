# 캡처 여러 장을 한 장으로(검토용) — python3 sheet.py out.png a.png b.png ... [--w 390]
import sys
from PIL import Image, ImageDraw
args = sys.argv[1:]
w = 360
if '--w' in args:
    i = args.index('--w'); w = int(args[i + 1]); del args[i:i + 2]
out, files = args[0], args[1:]
ims = []
for f in files:
    im = Image.open(f).convert('RGB'); r = w / im.width; ims.append((f, im.resize((w, int(im.height * r)), Image.LANCZOS)))
h = max(im.height for _, im in ims) + 18
cols = min(4, len(ims)); rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * (w + 8), rows * h), (60, 60, 60))
d = ImageDraw.Draw(S)
for k, (f, im) in enumerate(ims):
    x, y = (k % cols) * (w + 8), (k // cols) * h
    S.paste(im, (x, y + 16)); d.text((x + 4, y + 2), f.split('/')[-1][-40:], fill=(255, 255, 255))
S.save(out)
