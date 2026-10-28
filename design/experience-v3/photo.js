// 사진 → 당시 사진관 사진풍(폰 안에서) — 알부민 인화의 갈색 톤 · 대비 · 입자 · 둘레 어둡게 + 나다르 사진관 마운트 카드
// 머리·차림새를 바꾸는 AI 변환은 아직 없다 — 붙이면 transform() 앞단에서 사진을 바꾼 뒤 같은 마운트에 얹는다
export const CARD = { w: 500, h: 760 };
const PH = { x: 34, y: 34, w: 432, h: 576 };   // 사진 자리(3:4)

export async function loadImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 2000); }
}

export function transform(img) {
  // 1) 사진 자리에 3:4 로 가운데 자르기
  const p = document.createElement('canvas'); p.width = PH.w; p.height = PH.h;
  const x = p.getContext('2d');
  const sr = PH.w / PH.h, ir = img.naturalWidth / img.naturalHeight;
  let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
  if (ir > sr) { sw = sh * sr; sx = (img.naturalWidth - sw) / 2; } else { sh = sw / sr; sy = (img.naturalHeight - sh) * 0.35; }
  x.filter = 'blur(0.6px)';
  x.drawImage(img, sx, sy, sw, sh, 0, 0, PH.w, PH.h);
  x.filter = 'none';
  // 2) 톤: 밝기 → 대비 곡선 → 그림자 짙은 갈색 ~ 밝은 곳 크림. 입자, 둘레 어둡게
  const d = x.getImageData(0, 0, PH.w, PH.h), a = d.data;
  const S = [38, 24, 16], Hh = [242, 226, 196];
  for (let i = 0, n = 0; i < a.length; i += 4, n++) {
    let l = (0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2]) / 255;
    l = l * l * (3 - 2 * l);                                      // 대비
    const px = n % PH.w, py = (n / PH.w) | 0;
    const ex = (px / PH.w - 0.5) / 0.5, ey = (py / PH.h - 0.45) / 0.55;
    const r = Math.sqrt(ex * ex + ey * ey);
    l *= 1 - 0.55 * Math.min(1, Math.max(0, (r - 0.62) / 0.5));   // 둘레 어둡게
    l = Math.min(1, Math.max(0, l + (Math.random() - 0.5) * 0.07)); // 입자
    const t = Math.pow(l, 0.95);
    a[i] = S[0] + (Hh[0] - S[0]) * t; a[i + 1] = S[1] + (Hh[1] - S[1]) * t; a[i + 2] = S[2] + (Hh[2] - S[2]) * t;
  }
  x.putImageData(d, 0, 0);
  // 3) 마운트 카드
  const c = document.createElement('canvas'); c.width = CARD.w; c.height = CARD.h;
  const k = c.getContext('2d');
  k.fillStyle = '#E6DBC3'; k.fillRect(0, 0, CARD.w, CARD.h);
  k.strokeStyle = '#B49C70'; k.lineWidth = 2; k.strokeRect(14, 14, CARD.w - 28, CARD.h - 28);
  k.drawImage(p, PH.x, PH.y);
  k.strokeStyle = 'rgba(60,40,20,.5)'; k.lineWidth = 1; k.strokeRect(PH.x, PH.y, PH.w, PH.h);
  k.fillStyle = '#5A3E22'; k.textAlign = 'center';
  k.font = '800 34px Paperlogy, sans-serif'; k.fillText('NADAR', CARD.w / 2, 672);
  k.font = '600 15px Paperlogy, sans-serif'; k.fillText('35, BOULEVARD DES CAPUCINES · PARIS', CARD.w / 2, 702);
  return c;
}
