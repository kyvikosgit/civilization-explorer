// C1 — 두 전시의 인쇄물(재현)을 캔버스로 조판한다. 칼럼 3D 텍스처 · 펼치는 전단지 · 질문/결과의 두 포스터가 모두 같은 그림을 쓴다
//   · 살롱 1874 공고: 관청 벽보 — 흰 종이, 굵은 목활자, 두 색 인쇄. 문구는 1874 살롱 도록 표제("des artistes vivants exposés au Palais des Champs-Élysées le 1er mai 1874")에서
//   · 화가들의 전시 전단지: 세 단으로 접힌 노란 종이. 문구는 1874 첫 전시 도록 표지(Société anonyme coopérative des artistes peintres, sculpteurs, graveurs, etc.
//     Première exposition · 35, boulevard des Capucines · du 15 avril au 15 mai · 10–6시, 8–10시 · 입장 1프랑)에서. 접힌 겉면(표지)은 따로
//   활자: Playfair Display 900/700(목활자 대용, 가로로 눌러 콘덴스) · Old Standard TT(19세기 본문 활자). 잉크는 종이에 곱하기로 얹고 군데군데 빠지게(활판 느낌)
function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

const W = 768, H = 1152;

// 종이 결 — 작은 잡음 타일 하나를 겹쳐 깐다(큰 캔버스를 getImageData 로 읽으면 캔버스가 CPU 로 내려가 느려진다)
let grainTile = null;
function grain() {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas'); c.width = c.height = 192;
  const g = c.getContext('2d'), id = g.createImageData(192, 192), d = id.data, R = rnd(97);
  for (let i = 0; i < d.length; i += 4) { const v = 128 + (R() - 0.5) * 70; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  g.putImageData(id, 0, 0);
  return (grainTile = c);
}
function paper(g, w, h, c0, c1, seed, fresh) {
  const R = rnd(seed);
  const gr = g.createLinearGradient(0, 0, w * 0.3, h);
  gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.save();
  g.globalCompositeOperation = 'overlay'; g.globalAlpha = fresh ? 0.22 : 0.32;
  g.fillStyle = g.createPattern(grain(), 'repeat'); g.fillRect(0, 0, w, h);
  g.restore();
  g.save();
  for (let k = 0; k < (fresh ? 10 : 26); k++) {     // 얼룩
    g.fillStyle = `rgba(${120 + R() * 40 | 0},${96 + R() * 30 | 0},${50 + R() * 20 | 0},${0.025 + R() * (fresh ? 0.03 : 0.06)})`;
    g.beginPath(); g.ellipse(R() * w, R() * h, w * (0.04 + R() * 0.16), h * (0.02 + R() * 0.06), R() * 3, 0, 7); g.fill();
  }
  for (let k = 0; k < 700; k++) { g.fillStyle = `rgba(90,70,40,${0.04 + R() * 0.08})`; g.fillRect(R() * w, R() * h, 1 + R() * 2.5, 0.6 + R()); }   // 섬유
  g.restore();
}

// 잉크 판 — 글자·괘선을 따로 그린 뒤 군데군데 빠지게 하고 종이에 곱한다
function inkLayer(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function pressInk(g, layer, seed, wear) {
  const lg = layer.getContext('2d'), R = rnd(seed);
  lg.save(); lg.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 2600 * wear; k++) { lg.fillStyle = `rgba(0,0,0,${0.25 + R() * 0.6})`; const s = 0.6 + R() * 2.2; lg.fillRect(R() * layer.width, R() * layer.height, s, s * (0.5 + R())); }
  lg.restore();
  g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.94; g.drawImage(layer, 0, 0); g.restore();
}

function font(size, { fam = 'pf', w = 900, it = false } = {}) {
  const f = fam === 'pf' ? '"Playfair Display", Georgia, serif' : fam === 'ko' ? 'Freesentation, system-ui, sans-serif' : '"Old Standard TT", Georgia, serif';
  return `${it ? 'italic ' : ''}${w} ${size}px ${f}`;
}
// 가운데 정렬 · 자간 · 최대 폭(넘치면 가로로 누른다) · 콘덴스
function text(g, s, x, y, size, o = {}) {
  const { track = 0, maxW = 9999, cond = 1, color = '#1d1a16' } = o;
  g.font = font(size, o); g.fillStyle = color; g.textBaseline = 'alphabetic';
  const chars = [...s], ws = chars.map((c) => g.measureText(c).width);
  const raw = track ? ws.reduce((a, b) => a + b, 0) + track * (chars.length - 1) : g.measureText(s).width;
  const sx = Math.min(cond, maxW / raw);
  g.save(); g.translate(x, y); g.scale(sx, 1);
  if (!track) { g.textAlign = 'center'; g.fillText(s, 0, 0); }
  else { g.textAlign = 'left'; let cx = -raw / 2; chars.forEach((c, i) => { g.fillText(c, cx, 0); cx += ws[i] + track; }); }
  g.restore();
  return raw * sx;
}
function rule(g, x0, x1, y, t, color = '#1d1a16') { g.fillStyle = color; g.fillRect(x0, y - t / 2, x1 - x0, t); }
function thickThin(g, x0, x1, y, color) { rule(g, x0, x1, y, 6, color); rule(g, x0, x1, y + 9, 1.6, color); }
function ornament(g, cx, y, half, color = '#1d1a16') {   // ── ◆ ── 가는 괘선과 마름모
  g.fillStyle = color;
  rule(g, cx - half, cx - 22, y, 1.6, color); rule(g, cx + 22, cx + half, y, 1.6, color);
  g.beginPath(); g.moveTo(cx, y - 9); g.lineTo(cx + 12, y); g.lineTo(cx, y + 9); g.lineTo(cx - 12, y); g.closePath(); g.fill();
  [-1, 1].forEach((s) => { g.beginPath(); g.arc(cx + s * 17, y, 2.6, 0, 7); g.fill(); });
}
function frame(g, w, h, a, b, color = '#1d1a16', thick = 4) {
  g.strokeStyle = color; g.lineWidth = thick; g.strokeRect(a, a, w - 2 * a, h - 2 * a);
  g.lineWidth = 1.4; g.strokeRect(b, b, w - 2 * b, h - 2 * b);
}
function tag(g, x, y, color) {   // 재현 표시 — 오른쪽 아래 점선 상자
  g.save(); g.font = font(19, { fam: 'ko', w: 600 }); g.fillStyle = color; g.strokeStyle = color; g.globalAlpha = 0.62;
  const tw = g.measureText('재현').width; g.setLineDash([4, 3]); g.lineWidth = 1.4;
  g.strokeRect(x - tw - 16, y - 24, tw + 16, 31); g.textAlign = 'right'; g.fillText('재현', x - 8, y - 2); g.restore();
}

export function drawSalon() {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  paper(g, W, H, '#EAE3D2', '#D9CFBA', 11, false);
  const L = inkLayer(W, H), k = L.getContext('2d'), INK = '#1b1916', RED = '#9a2c22', cx = W / 2;
  frame(k, W, H, 26, 40, INK, 7);
  text(k, 'RÉPUBLIQUE FRANÇAISE', cx, 108, 30, { fam: 'os', w: 700, track: 7, maxW: 600 });
  text(k, "MINISTÈRE DE L'INSTRUCTION PUBLIQUE, DES CULTES ET DES BEAUX-ARTS", cx, 146, 17, { fam: 'os', w: 400, track: 1.5, maxW: 640 });
  thickThin(k, 70, W - 70, 172, INK);
  text(k, 'SALON', cx, 382, 230, { w: 900, cond: 0.9, maxW: 640 });
  text(k, 'DE 1874', cx, 520, 128, { w: 900, cond: 0.92, maxW: 560, color: RED });
  ornament(k, cx, 570, 210, INK);
  text(k, 'EXPLICATION DES OUVRAGES', cx, 640, 34, { fam: 'os', w: 700, track: 4, maxW: 620 });
  text(k, 'de Peinture, Sculpture, Architecture, Gravure et Lithographie', cx, 684, 25, { fam: 'os', w: 400, it: true, maxW: 640 });
  text(k, 'DES ARTISTES VIVANTS', cx, 744, 40, { fam: 'os', w: 700, track: 5, maxW: 620 });
  rule(k, 160, W - 160, 782, 1.6, INK);
  text(k, 'PALAIS DES CHAMPS-ÉLYSÉES', cx, 860, 56, { w: 900, cond: 0.86, maxW: 640 });
  text(k, 'Ouverture le 1er Mai 1874', cx, 944, 50, { fam: 'os', w: 400, it: true, maxW: 600 });
  thickThin(k, 70, W - 70, 990, INK);
  text(k, 'LES OUVRAGES EXPOSÉS ONT ÉTÉ ADMIS PAR LE JURY', cx, 1046, 19, { fam: 'os', w: 700, track: 2.5, maxW: 600 });
  pressInk(g, L, 7, 1);
  tag(g, W - 54, H - 56, '#2a2620');
  return c;
}

// 펼친 면(세 단) — 접는 선(1/3, 2/3)을 피해서 조판
export function drawExpo() {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  paper(g, W, H, '#EFE2BC', '#E2D1A0', 23, true);
  const L = inkLayer(W, H), k = L.getContext('2d'), INK = '#231c14', cx = W / 2;
  frame(k, W, H, 24, 36, INK, 3);
  // 위 단
  text(k, 'SOCIÉTÉ ANONYME COOPÉRATIVE', cx, 100, 25, { fam: 'os', w: 700, track: 4, maxW: 620 });
  text(k, 'des Artistes Peintres, Sculpteurs, Graveurs, etc.', cx, 142, 28, { fam: 'os', w: 400, it: true, maxW: 640 });
  ornament(k, cx, 180, 150, INK);
  text(k, 'PREMIÈRE', cx, 262, 64, { w: 700, track: 14, maxW: 520 });
  text(k, 'EXPOSITION', cx, 352, 104, { w: 900, cond: 0.86, maxW: 660 });
  // 가운데 단
  text(k, '35', cx, 520, 120, { w: 900 });
  text(k, 'BOULEVARD DES CAPUCINES', cx, 596, 54, { w: 900, cond: 0.8, maxW: 650 });
  rule(k, 180, W - 180, 630, 1.6, INK);
  text(k, 'du 15 Avril au 15 Mai 1874', cx, 696, 46, { fam: 'os', w: 400, it: true, maxW: 600 });
  // 아래 단
  text(k, "L'EXPOSITION EST OUVERTE", cx, 832, 25, { fam: 'os', w: 700, track: 4, maxW: 600 });
  text(k, 'de 10 heures du matin à 6 heures du soir', cx, 878, 29, { fam: 'os', w: 400, maxW: 620 });
  text(k, 'et de 8 heures à 10 heures du soir', cx, 918, 29, { fam: 'os', w: 400, maxW: 620 });
  ornament(k, cx, 960, 120, INK);
  text(k, "PRIX D'ENTRÉE : 1 FRANC", cx, 1036, 54, { w: 900, cond: 0.84, maxW: 600 });
  pressInk(g, L, 13, 0.55);
  tag(g, W - 50, H - 52, '#2a2117');
  return c;
}

// 접힌 겉면(위 단의 뒷면) — 칼럼에 꽂혀 있을 때 보이는 면
export function drawExpoCover() {
  const w = W, h = H / 3;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  paper(g, w, h, '#F2E6C2', '#E6D6A8', 41, true);
  const L = inkLayer(w, h), k = L.getContext('2d'), INK = '#231c14', cx = w / 2;
  frame(k, w, h, 22, 33, INK, 3);
  text(k, 'PREMIÈRE', cx, 96, 34, { w: 700, track: 10, maxW: 560 });
  text(k, 'EXPOSITION', cx, 212, 118, { w: 900, cond: 0.84, maxW: 640 });
  rule(k, 200, w - 200, 246, 1.6, INK);
  text(k, '35, Boulevard des Capucines · 15 Avril 1874', cx, 302, 34, { fam: 'os', w: 400, it: true, maxW: 600 });
  pressInk(g, L, 5, 0.4);
  return c;
}

// 화면(DOM)용 그림 주소 — toBlob 은 인코딩을 메인 스레드 밖에서 한다
export function imageURL(c) {
  return new Promise((res) => {
    if (c.toBlob) c.toBlob((b) => res(b ? URL.createObjectURL(b) : c.toDataURL('image/jpeg', 0.9)), 'image/jpeg', 0.9);
    else res(c.toDataURL('image/jpeg', 0.9));
  });
}

let fontsReady = null;
export function loadPosterFonts() {
  if (fontsReady) return fontsReady;
  const want = ['900 40px "Playfair Display"', '700 40px "Playfair Display"', '400 30px "Old Standard TT"', '700 30px "Old Standard TT"', 'italic 400 30px "Old Standard TT"', '600 20px Freesentation'];
  fontsReady = Promise.race([
    Promise.all(want.map((f) => document.fonts.load(f).catch(() => null))),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  return fontsReady;
}
