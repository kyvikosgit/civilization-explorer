# shots/<round>/<w>-*.png → shots/<round>/_sheet-<w>-<k>.jpg (6장씩, 이름표)
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
rd, w = sys.argv[1], sys.argv[2]
per = int(sys.argv[3]) if len(sys.argv) > 3 else 6
fs = sorted(f for f in glob.glob(f'shots/{rd}/{w}-*.png'))
F = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 14)
for k in range(0, len(fs), per):
    ims = [Image.open(f).convert('RGB') for f in fs[k:k + per]]
    tw = 300; th = round(ims[0].height * tw / ims[0].width)
    S = Image.new('RGB', (len(ims) * (tw + 8), th + 22), (90, 0, 0))
    for i, (f, im) in enumerate(zip(fs[k:k + per], ims)):
        S.paste(im.resize((tw, th), Image.LANCZOS), (i * (tw + 8), 22))
        ImageDraw.Draw(S).text((i * (tw + 8) + 4, 3), os.path.basename(f)[:-4], fill='white', font=F)
    S.save(f'shots/{rd}/_sheet-{w}-{k // per}.jpg', quality=82)
    print(f'shots/{rd}/_sheet-{w}-{k // per}.jpg')
