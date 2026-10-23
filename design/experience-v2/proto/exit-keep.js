// 출구 · 가져가는 것 — 어두운 나무 탁자 위의 물건 다섯(시안 E. 다른 시안도 mountKeep(root) 한 줄로 쓸 수 있다)
//   1872 기차표(에드먼슨 판지) · 엽서(앞면 + 남긴 한 줄) · 메달 카드 · 전시 포스터(한 번 접힌 자국, 아래 반쪽이 살짝 들림) · 나다르 사진관 카드(카비네 판, 고른 쪽 얼굴 콜라주)
//   실제 크기 비율(mm × PXMM)로 놓고, 살짝 돌려 겹친다. 왼쪽 위에서 낮은 빛 · 가장자리 어둡게.
//   누르면 집어 든다(가운데에 바로 · 그림자 커짐 · 나머지는 어두워짐) → 손가락으로 끄는 만큼만 돌린다(관성 · 저절로 돌아오기 없음) · 기차표와 엽서는 두 번 눌러 뒷면 → "저장"은 그 면 그대로 이미지
//   → 바깥을 누르면 제자리로 바로. 이름은 들었을 때만 한 줄. 출구는 늘 멈춘 화면 — 물건은 처음부터 탁자 위에 있고, 미끄러지거나 내려앉는 움직임이 없다.
//   면(앞 · 뒤)은 기기 안에서 캔버스로 한 번 그린다 — 화면 · 저장 · 한 장 공유(1080×1920)가 같은 그림을 쓴다.
import { STATIONS, C2, loadImg, cover, fontsReady, stampLine, VISITORS } from './exit-common.js';
import { toast } from './js/proto-common.js';
const RM = true;                                          // 출구는 늘 멈춘 화면 — 모션 줄이기와 같은 길(집어 들기 · 뒤집기는 바로, 관성 없음)

const S = Object.fromEntries(STATIONS.map((s) => [s.id, s]));
const ls = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const c2card = ls('m100_c2_postcard');
const m2 = C2[S.c2.me];
const pcLine = c2card && c2card.id === S.c2.me && c2card.text ? String(c2card.text).trim().slice(0, 60) : '';

// ── 물건 — 실제 크기(mm) · 판 두께(들었을 때 px) · 옆면 색 · 뒤집기
const PXMM = 1.1, DW = 390, DH = 524;                  // 탁자 설계 좌표(폭 390 기준)
const KINDS = {
  poster:   { mm: [180, 260], t: 1, edge: '#D9CCAA', flip: false, r: 1 },
  cabinet:  { mm: [108, 165], t: 4, edge: '#BCA97E', flip: false, r: 9 },
  medal:    { mm: [100, 140], t: 2.5, edge: '#D6CAAE', flip: false, r: 4 },
  postcard: { mm: [148, 100], t: 2, edge: '#E2D8C1', flip: true, r: 5 },
  ticket:   { mm: [57, 30], t: 5, edge: '#C2AF82', flip: true, r: 7 },
};
// 탁자 위 자리 — 가운데(x, y) · 기울기(도). 문서 순서 = 쌓인 순서(아래 → 위)
const LAYOUT = { poster: [116, 222, -5.5], cabinet: [300, 196, 6.5], medal: [294, 392, -3.5], postcard: [146, 418, 3], ticket: [222, 478, -13] };
const ORDER = ['poster', 'cabinet', 'medal', 'postcard', 'ticket'];

const NAMES = {
  ticket: `<b>${m2.year}년 기차표</b> · 생라자르 → ${m2.label}<i> · 두 번 누르면 뒷면</i>`,
  postcard: `<b>엽서</b> · 〈${m2.cap}〉<i> · 두 번 누르면 뒷면</i>`,
  medal: `<b>메달 카드</b> · ${S.c0.choice}`,
  poster: S.c1.expo ? '<b>독립 전시 포스터</b> · 카퓌신 대로 35번지 · 재현' : '<b>살롱 포스터</b> · 샹젤리제 궁 · 재현',
  cabinet: S.c4.art.kind === 'carte' ? '<b>내 초상</b> · 나다르 사진관' : `<b>사진관 카드</b> · ${S.c4.art.t}`,
};
const LABEL = { ticket: '기차표', postcard: '엽서', medal: '메달 카드', poster: S.c1.expo ? '독립 전시 포스터' : '살롱 포스터', cabinet: '사진관 카드' };

// ── 캔버스 도우미
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function noise(g, w, h, amt, seed = 3) {
  try { const d = g.getImageData(0, 0, w, h), p = d.data, R = rng(seed); for (let i = 0; i < p.length; i += 4) { const n = (R() - 0.5) * amt; p[i] += n; p[i + 1] += n; p[i + 2] += n; } g.putImageData(d, 0, 0); } catch (e) { /* noop */ }
}
// 자간 있는 글줄(캔버스 letterSpacing 이 없는 브라우저도 같게) — align: 'center' | 'left' | 'right'
function spaced(g, text, x, y, sp, align = 'center') {
  const chars = [...text], ws = chars.map((c) => g.measureText(c).width), tw = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
  let cx = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x; const a0 = g.textAlign; g.textAlign = 'left';
  chars.forEach((c, i) => { g.fillText(c, cx, y); cx += ws[i] + sp; }); g.textAlign = a0; return tw;
}
function fitFont(g, text, weight, family, size, maxW) { let s = size; g.font = `${weight} ${s}px ${family}`; while (g.measureText(text).width > maxW && s > size * 0.55) { s -= 2; g.font = `${weight} ${s}px ${family}`; } return s; }
function wrapLines(g, text, maxW) {
  const out = []; let line = '';
  for (const word of text.split(/(\s+)/)) {
    if (!word) continue;
    if (g.measureText(line + word).width <= maxW) { line += word; continue; }
    if (line.trim()) { out.push(line.trimEnd()); line = ''; }
    const w = word.trimStart(); if (!w) continue;
    if (g.measureText(w).width <= maxW) { line = w; continue; }
    for (const ch of w) { if (g.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; }
  }
  if (line.trim()) out.push(line.trimEnd());
  return out;
}

// ── 나무 탁자 — 짙은 호두나무, 세로 결(느린 굴곡 + 잔결) + 고운 잡티. 화면 · 공유 이미지가 같은 씨앗
export function woodCanvas(w, h, seed = 11) {
  const c = cv(w, h), g = c.getContext('2d'), R = rng(seed), q = w / 390;
  const bg = g.createLinearGradient(0, 0, w * 0.4, h); bg.addColorStop(0, '#3B2719'); bg.addColorStop(0.55, '#2E1E13'); bg.addColorStop(1, '#25180F'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  // 넓은 색 띠(판재마다 조금씩 다른 색)
  for (let i = 0; i < 14; i++) { const x = R() * w, bw = (20 + R() * 70) * q; g.fillStyle = R() < 0.5 ? `rgba(90,58,34,${0.06 + R() * 0.08})` : `rgba(10,5,2,${0.08 + R() * 0.1})`; g.fillRect(x - bw / 2, 0, bw, h); }
  // 결
  const step = 5 * q;
  for (let i = 0; i < 300; i++) {
    const x0 = R() * w * 1.1 - w * 0.05, a1 = (3 + R() * 9) * q, f1 = (0.0015 + R() * 0.004) / q, p1 = R() * 6.283, a2 = (0.4 + R() * 1.4) * q, f2 = (0.015 + R() * 0.03) / q, p2 = R() * 6.283;
    g.beginPath();
    for (let y = -step; y <= h + step; y += step) { const x = x0 + a1 * Math.sin(y * f1 + p1) + a2 * Math.sin(y * f2 + p2); if (y === -step) g.moveTo(x, y); else g.lineTo(x, y); }
    const dark = R() < 0.72;
    g.strokeStyle = dark ? `rgba(14,7,2,${0.1 + R() * 0.24})` : `rgba(160,108,64,${0.04 + R() * 0.08})`;
    g.lineWidth = (0.35 + R() * R() * 2.6) * q; g.stroke();
  }
  noise(g, w, h, 14, seed + 1);
  return c;
}
// 빛(왼쪽 위, 따뜻하고 낮게) + 가장자리 어둡게 — 공유 이미지용(화면은 CSS 로 같은 값)
function lightAndVignette(g, x, y, w, h) {
  const l = g.createRadialGradient(x + w * 0.08, y, 0, x + w * 0.08, y, Math.max(w, h) * 0.85);
  l.addColorStop(0, 'rgba(255,196,128,.24)'); l.addColorStop(0.6, 'rgba(255,196,128,0)'); g.fillStyle = l; g.fillRect(x, y, w, h);
}
function vignette(g, x, y, w, h) {
  const r = Math.hypot(w, h) * 0.62, v = g.createRadialGradient(x + w * 0.45, y + h * 0.42, r * 0.5, x + w * 0.45, y + h * 0.42, r);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)'); g.fillStyle = v; g.fillRect(x, y, w, h);
}

// ── 면 그리기
const OLD = '"Old Standard TT", Georgia, serif', PLAY = '"Playfair Display", Georgia, serif', SANS = 'Freesentation, sans-serif', DISP = 'Paperlogy, Freesentation, sans-serif';
const FR_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'], KO_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MF = ['JANV', 'FÉV', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];

// 글자 지우기 — 줄마다 양옆 종이색을 이어 칠하고, 같은 판 아래쪽 빈 종이의 결(잔무늬)만 얹는다(색 띠 · 이음매 없이)
function erase(g, x0, y0, x1, y1, dy) {
  const W = x1 - x0, H = y1 - y0, pad = 6;
  const d = g.getImageData(x0 - pad, y0, W + pad * 2, H), s = g.getImageData(x0 - pad, y0 + dy, W + pad * 2, H), p = d.data, q = s.data, rw = W + pad * 2;
  const edge = (a, y, l) => { const o = [0, 0, 0]; for (let k = 0; k < pad; k++) { const i = (y * rw + (l ? k : rw - 1 - k)) * 4; o[0] += a[i]; o[1] += a[i + 1]; o[2] += a[i + 2]; } return o.map((v) => v / pad); };
  for (let y = 0; y < H; y++) {
    const L = edge(p, y, true), R = edge(p, y, false), sL = edge(q, y, true), sR = edge(q, y, false);
    for (let x = pad; x < pad + W; x++) {
      const t = (x - pad + 0.5) / W, i = (y * rw + x) * 4;
      for (let c = 0; c < 3; c++) p[i + c] = L[c] + (R[c] - L[c]) * t + (q[i + c] - (sL[c] + (sR[c] - sL[c]) * t));
    }
  }
  g.putImageData(d, x0 - pad, y0);
}
// 기차표 — 앞면은 C2 의 판(ticket-front-*.png), 뒷면은 그 판의 종이 위에 행선지에 맞춘 글(르아브르는 원판 그대로)
async function ticketFaces() {
  const fimg = await loadImg(S.c2.ticket), bimg = await loadImg('../ticket/ticket-back.png');
  const W = 1140, H = 600, r = 30;
  const face = (img) => { const c = cv(W, H), g = c.getContext('2d'); rr(g, 0, 0, W, H, r); g.clip(); g.fillStyle = '#E6D8B4'; g.fillRect(0, 0, W, H); if (img) g.drawImage(img, 0, 0, W, H); return c; };
  const front = face(fimg), back = face(bimg);
  if (bimg && m2.ticket !== 'havre') {
    const g = back.getContext('2d');
    // 르아브르 글을 지우고 그 행선지 글을 다시 쓴다
    erase(g, 286, 56, 854, 240, 252);
    erase(g, 628, 520, 1024, 554, -56);
    const d = new Date(m2.year, 9, 21), wd = d.getDay();
    g.fillStyle = '#3A3128'; g.font = `400 25px ${OLD}`; spaced(g, "CHEMIN DE FER DE L'OUEST", W / 2, 95, 6.5);
    g.fillStyle = '#26211B'; g.font = `700 46px ${PLAY}`; spaced(g, `PARIS – ${m2.fr.toUpperCase()}`, W / 2, 166, 4.5);
    g.fillStyle = '#4A4036'; g.font = `400 27px ${OLD}`; g.textAlign = 'center'; g.fillText(`${FR_DAYS[wd]} 21 octobre ${m2.year}`, W / 2, 219);
    g.fillStyle = '#26211B'; g.fillRect(460, 264, 220, 3);
    g.fillStyle = '#3C3C3A'; g.font = `700 17px ${SANS}`; g.textAlign = 'right'; g.fillText(`MONET 100 · 재현물 · ${m2.year}년 10월 21일 ${KO_DAYS[wd]}요일`, 1008, 543); g.textAlign = 'left';
  }
  return { front, back };
}

// 엽서 — C2 의 엽서와 같은 판(148×100 → 1480×1000): 그림 전면 + 우표 + 둥근 소인 + 남긴 한 줄(자리 · 크기 그대로). 뒷면: 구분선 · 우표 자리 · 받는 사람 · 그림 캡션
async function postcardFaces() {
  const W = 1480, H = 1000, front = cv(W, H), g = front.getContext('2d');
  const img = await loadImg(S.c2.img);
  g.fillStyle = '#DDD4BC'; g.fillRect(0, 0, W, H); cover(g, img, 0, 0, W, H);
  const sx = W - 300, sy = 60, sw = 200, sh = 240;
  g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10; g.shadowOffsetY = 3; g.fillStyle = '#F2EAD6'; g.fillRect(sx, sy, sw, sh); g.restore();
  g.fillStyle = '#F2EAD6'; for (let i = 0; i <= sw; i += 16) { g.beginPath(); g.arc(sx + i, sy, 6, 0, 6.2832); g.fill(); g.beginPath(); g.arc(sx + i, sy + sh, 6, 0, 6.2832); g.fill(); } for (let i = 0; i <= sh; i += 16) { g.beginPath(); g.arc(sx, sy + i, 6, 0, 6.2832); g.fill(); g.beginPath(); g.arc(sx + sw, sy + i, 6, 0, 6.2832); g.fill(); }
  g.fillStyle = '#5C6E8E'; g.fillRect(sx + 16, sy + 16, sw - 32, sh - 32); g.strokeStyle = '#F2EAD6'; g.lineWidth = 2; g.strokeRect(sx + 24, sy + 24, sw - 48, sh - 48);
  g.fillStyle = '#F2EAD6'; g.textAlign = 'center'; g.font = `700 16px ${OLD}`; g.fillText('RÉPUBLIQUE', sx + sw / 2, sy + 58); g.fillText('FRANÇAISE', sx + sw / 2, sy + 78);
  g.font = `700 74px ${PLAY}`; g.fillText('15', sx + sw / 2 - 8, sy + 158); g.font = `700 26px ${OLD}`; g.fillText('c', sx + sw / 2 + 44, sy + 128); g.font = `700 18px ${OLD}`; g.fillText('POSTES', sx + sw / 2, sy + 196);
  const today = new Date(), cx = sx - 30, cy = sy + sh - 40, r = 96;
  g.strokeStyle = 'rgba(40,44,70,.85)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r * 0.52, 0, 6.2832); g.stroke();
  const arc = `${m2.fr.toUpperCase()} · ${m2.year} · `; g.fillStyle = 'rgba(40,44,70,.9)'; g.font = `700 22px ${OLD}`;
  let ang = -Math.PI / 2 - ([...arc].length * 0.16) / 2; const rr2 = r * 0.76;
  [...arc].forEach((ch) => { const wch = g.measureText(ch).width, a = ang + 0.08; g.save(); g.translate(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); g.rotate(a + Math.PI / 2); g.fillText(ch, 0, 0); g.restore(); ang += Math.max(0.1, wch / rr2); });
  g.font = `700 18px ${OLD}`; g.fillText(`${today.getDate()} ${MF[today.getMonth()]}`, cx, cy - 2); g.font = `700 16px ${OLD}`; g.fillText(String(m2.year), cx, cy + 20);
  if (pcLine) {                                          // 남긴 한 줄 — C2 와 같은 자리(위 · 가운데 · 아래) · 크기 · 기울기, 그 자리 밝기로 크림/잉크
    const slot = { top: 0.2, middle: 0.5, bottom: 0.8 }[c2card.slot] || 0.8, fs = ({ s: 0.052, l: 0.07 }[c2card.size] || 0.052) * W, lh = fs * 1.34;
    const bx = W * 0.075, bw = (c2card.slot === 'top' ? 0.52 : 0.85) * W;
    g.font = `600 ${fs.toFixed(1)}px ${SANS}`; g.textAlign = 'left'; g.textBaseline = 'middle';
    const lines = wrapLines(g, pcLine, bw), bh = lines.length * lh, by = Math.max(20, Math.min(H - bh - 20, slot * H - bh / 2));
    let lum = 0.2; try { const d = g.getImageData(bx, by, bw, bh).data; let s = 0, n = 0; for (let i = 0; i < d.length; i += 64) { s += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; n++; } lum = s / n; } catch (e) { /* noop */ }
    const cream = lum < 0.62;
    g.save(); g.translate(bx + bw / 2, by + bh / 2); g.rotate((-1.2 * Math.PI) / 180); g.translate(-(bx + bw / 2), -(by + bh / 2));
    const pass = (blur, col, fill) => { g.shadowColor = col; g.shadowBlur = blur; g.shadowOffsetY = blur > 10 ? 0 : fs * 0.03; g.fillStyle = fill; lines.forEach((ln, i) => g.fillText(ln, bx, by + lh * (i + 0.5))); };
    if (cream) { pass(fs * 0.45, 'rgba(20,14,8,.42)', '#F7F0DF'); pass(fs * 0.08, 'rgba(20,14,8,.55)', '#F7F0DF'); }
    else { pass(fs * 0.45, 'rgba(247,240,223,.55)', '#2A2420'); pass(fs * 0.06, 'rgba(247,240,223,.6)', '#2A2420'); }
    g.restore(); g.textBaseline = 'alphabetic';
  }
  // 뒷면
  const back = cv(W, H), b = back.getContext('2d');
  b.fillStyle = '#EFE7D3'; b.fillRect(0, 0, W, H); noise(b, W, H, 10, 5);
  b.fillStyle = '#2A2420'; b.font = `900 60px ${PLAY}`; spaced(b, 'Carte Postale', 62, 118, 4, 'left');
  b.fillStyle = 'rgba(42,36,32,.6)'; b.font = `400 30px ${OLD}`; spaced(b, 'CHEMINS DE FER DE L’OUEST', W - 62, 112, 5, 'right');
  b.fillStyle = 'rgba(42,36,32,.55)'; b.fillRect(W / 2 - 1, 170, 3, H - 230);
  b.setLineDash([10, 8]); b.strokeStyle = 'rgba(42,36,32,.45)'; b.lineWidth = 3; b.strokeRect(W - 62 - 190, 170, 190, 224); b.setLineDash([]);
  b.fillStyle = 'rgba(42,36,32,.45)'; b.font = `400 26px ${OLD}`; spaced(b, 'TIMBRE', W - 62 - 95, 292, 5);
  const rx = W / 2 + 46, rw = W / 2 - 108;
  b.fillStyle = 'rgba(42,36,32,.75)'; b.font = `700 34px ${SANS}`; b.fillText('받는 사람', rx, H - 262);
  const to = c2card && c2card.id === S.c2.me && c2card.to ? c2card.to : '';
  if (to) { b.fillStyle = '#2A2420'; b.font = `500 58px ${SANS}`; b.fillText(to, rx, H - 186); }
  b.fillStyle = 'rgba(42,36,32,.45)'; [H - 162, H - 108, H - 54].forEach((y) => b.fillRect(rx, y, rw, 3));
  b.fillStyle = '#2A2420'; b.font = `700 40px ${SANS}`;
  wrapLines(b, `〈${m2.cap}〉`, W / 2 - 130).slice(0, 2).forEach((ln, i, a) => b.fillText(ln, 62, H - 120 - (a.length - 1 - i) * 50));
  b.fillStyle = 'rgba(42,36,32,.6)'; b.font = `500 32px ${SANS}`; b.fillText(`클로드 모네${c2card && c2card.no ? ` · N° ${c2card.no}` : ''}`, 62, H - 66);
  return { front, back };
}

// 메달 카드 — C0 의 카드처럼: 붉은 다마스크 벽 · 금박 액자 속 고른 그림 · 메달, 아래 카드 몸에 제목
const DAMASK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Cg fill='none' stroke='%23000' stroke-opacity='.13' stroke-width='1.2'%3E%3Cpath d='M32 4c6 8 12 12 24 14-12 2-18 6-24 14-6-8-12-12-24-14 12-2 18-6 24-14z'/%3E%3Ccircle cx='32' cy='18' r='3'/%3E%3C/g%3E%3C/svg%3E";
function medalSVG() {                                    // c0.js medalSVG 와 같은 그림(금 원반 · 월계관 · SALON 1873)
  const leaves = [];
  for (let i = 0; i < 9; i++) for (const deg of [100 + i * 12.5, 80 - i * 12.5]) {
    const a = deg * Math.PI / 180, cx = 50 + Math.cos(a) * 31, cy = 55 + Math.sin(a) * 31;
    leaves.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="3.1" ry="6" transform="rotate(${deg.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})" fill="#7A5412" stroke="#F3DB8E" stroke-width=".7"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="400" height="400"><defs><radialGradient id="g" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="#FFF4C4"/><stop offset=".42" stop-color="#E6BE55"/><stop offset=".8" stop-color="#A67A1E"/><stop offset="1" stop-color="#6E4A0E"/></radialGradient><linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1B8"/><stop offset="1" stop-color="#8A5E14"/></linearGradient></defs>
    <path d="M44 2 h12 l-2 10 h-8 z" fill="#B3262E"/><circle cx="50" cy="55" r="44" fill="url(#g)" stroke="#5E3F0A" stroke-width="1.2"/><circle cx="50" cy="55" r="39.5" fill="none" stroke="url(#r)" stroke-width="1.6" opacity=".9"/><circle cx="50" cy="55" r="36.5" fill="none" stroke="#6E4A0E" stroke-width=".8" opacity=".7"/>${leaves.join('')}
    <text x="50" y="52" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="9" letter-spacing="1.5" fill="#5E3F0A">SALON</text><text x="50" y="68" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="15" letter-spacing="1" fill="#4A3008">1873</text></svg>`;
}
function cardStock(g, W, H, base, seed) { g.fillStyle = base; g.fillRect(0, 0, W, H); noise(g, W, H, 9, seed); const e = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.hypot(W, H) * 0.6); e.addColorStop(0, 'rgba(120,90,40,0)'); e.addColorStop(1, 'rgba(120,90,40,.16)'); g.fillStyle = e; g.fillRect(0, 0, W, H); }
async function medalFaces() {
  const W = 1000, H = 1400, front = cv(W, H), g = front.getContext('2d');
  const [img, dm, md] = await Promise.all([loadImg(S.c0.img), loadImg(DAMASK), loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(medalSVG()))]);
  cardStock(g, W, H, '#F1E9D6', 7);
  const wx = 64, wy = 64, ww = W - 128, wh = 860;
  const wall = g.createLinearGradient(0, wy, 0, wy + wh); wall.addColorStop(0, '#7A3233'); wall.addColorStop(1, '#5A2122'); g.fillStyle = wall; g.fillRect(wx, wy, ww, wh);
  if (dm) { const pc = cv(128, 128); pc.getContext('2d').drawImage(dm, 0, 0, 128, 128); g.save(); g.fillStyle = g.createPattern(pc, 'repeat'); g.translate(wx, wy); g.fillRect(0, 0, ww, wh); g.restore(); }
  const ar = img ? img.naturalWidth / img.naturalHeight : 0.8, maxW = 600, maxH = 620;
  let pw = maxW, ph = pw / ar; if (ph > maxH) { ph = maxH; pw = ph * ar; }
  const fw = pw * 0.09, fx = W / 2 - pw / 2 - fw, fy = wy + (wh - ph) / 2 - fw - 8, fW = pw + fw * 2, fH = ph + fw * 2;
  g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 40; g.shadowOffsetY = 22; g.fillStyle = '#8C6B33'; g.fillRect(fx, fy, fW, fH); g.restore();
  const gold = g.createLinearGradient(fx, fy, fx + fW, fy + fH); gold.addColorStop(0, '#E5C77E'); gold.addColorStop(0.3, '#9C7637'); gold.addColorStop(0.55, '#D9B865'); gold.addColorStop(0.8, '#7A5726'); gold.addColorStop(1, '#C9A55A');
  g.fillStyle = gold; g.fillRect(fx, fy, fW, fH);
  [[0, 'rgba(70,40,5,.6)', 3], [8, 'rgba(255,236,190,.4)', 2], [fw * 0.55, 'rgba(70,40,5,.35)', 3], [fw - 6, 'rgba(255,240,200,.35)', 2]].forEach(([i, c, lw]) => { g.strokeStyle = c; g.lineWidth = lw; g.strokeRect(fx + i, fy + i, fW - i * 2, fH - i * 2); });
  g.fillStyle = '#1A100C'; g.fillRect(fx + fw - 5, fy + fw - 5, pw + 10, ph + 10);
  if (img) g.drawImage(img, fx + fw, fy + fw, pw, ph);
  if (md) { const ms = 190; g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 22; g.shadowOffsetY = 14; g.drawImage(md, fx + fW - ms + 50, fy + fH - ms + 56, ms, ms); g.restore(); }
  // 카드 몸
  const sub = S.c0.sub.split(' · ');                     // [작가, 연도, n번 후보작]
  g.fillStyle = 'rgba(38,33,27,.6)'; g.font = `400 26px ${OLD}`; spaced(g, 'SALON DE 1873 · MÉDAILLE', W / 2, 1012, 6);
  g.fillStyle = 'rgba(38,33,27,.3)'; g.fillRect(W / 2 - 40, 1036, 80, 2);
  g.fillStyle = '#1D1915'; fitFont(g, S.c0.choice, 800, DISP, 66, W - 150); g.textAlign = 'center'; g.fillText(S.c0.choice, W / 2, 1128);
  g.fillStyle = '#5A5249'; g.font = `500 36px ${SANS}`; g.fillText(`${sub[0]} · ${sub[1]}`, W / 2, 1192);
  g.fillStyle = '#8A7E6C'; g.font = `500 30px ${SANS}`; g.fillText(`${sub[2] || ''} · 나의 메달`, W / 2, 1250);
  g.fillStyle = 'rgba(38,33,27,.35)'; g.font = `400 22px ${OLD}`; spaced(g, 'MONET 100', W / 2, 1330, 6); g.textAlign = 'left';
  const back = cv(W, H), b = back.getContext('2d'); cardStock(b, W, H, '#EAE1CB', 8);
  return { front, back };
}

// 전시 포스터(재현) — 한 번 접었다 편 종이: 가운데 가로 접힌 자국(화면에서는 위 · 아래 끝이 살짝 들린다). 글은 출구의 작은 판과 같은 말 + C1 의 날짜 · 입장료
async function posterFaces() {
  const W = 1080, H = 1560, expo = S.c1.expo, front = cv(W, H), g = front.getContext('2d');
  const pg = g.createLinearGradient(0, 0, W * 0.3, H); pg.addColorStop(0, expo ? '#EEE1BC' : '#F4ECD8'); pg.addColorStop(1, expo ? '#DFCD9E' : '#E7DCC0'); g.fillStyle = pg; g.fillRect(0, 0, W, H);
  noise(g, W, H, 12, 9);
  const R = rng(4); for (let i = 0; i < 18; i++) { const x = R() * W, y = R() * H, r = 4 + R() * 16; const f = g.createRadialGradient(x, y, 0, x, y, r); f.addColorStop(0, `rgba(150,105,50,${0.05 + R() * 0.08})`); f.addColorStop(1, 'rgba(150,105,50,0)'); g.fillStyle = f; g.fillRect(x - r, y - r, r * 2, r * 2); }
  g.strokeStyle = 'rgba(38,33,27,.78)'; g.lineWidth = 5; g.strokeRect(54, 54, W - 108, H - 108); g.lineWidth = 2; g.strokeRect(70, 70, W - 140, H - 140);
  g.fillStyle = '#26211B'; g.textAlign = 'center';
  if (expo) {
    g.font = `400 34px ${OLD}`; spaced(g, 'SOCIÉTÉ ANONYME', W / 2, 200, 9);
    g.font = `italic 400 30px ${OLD}`; g.fillText('des artistes peintres, sculpteurs, graveurs, etc.', W / 2, 252);
    g.fillRect(W / 2 - 70, 300, 140, 3);
    g.font = `400 40px ${OLD}`; spaced(g, '1ʳᵉ', W / 2, 395, 2);
    g.font = `900 188px ${PLAY}`; g.fillText('EXPO-', W / 2, 580); g.fillText('SITION', W / 2, 760);
    g.font = `700 64px ${PLAY}`; spaced(g, '1874', W / 2, 870, 14);
    g.fillRect(W / 2 - 110, 920, 220, 3);
    g.font = `400 46px ${OLD}`; g.fillText('35, Boulevard des Capucines', W / 2, 1020);
    g.font = `italic 400 40px ${OLD}`; g.fillText('du 15 avril au 15 mai', W / 2, 1090);
    g.font = `400 34px ${OLD}`; spaced(g, 'ENTRÉE : 1 FRANC', W / 2, 1180, 7);
  } else {
    g.font = `400 34px ${OLD}`; spaced(g, 'RÉPUBLIQUE FRANÇAISE', W / 2, 200, 9);
    g.font = `italic 400 30px ${OLD}`; g.fillText('Ministère de l’Instruction publique et des Beaux-Arts', W / 2, 252);
    g.fillRect(W / 2 - 70, 300, 140, 3);
    g.font = `900 220px ${PLAY}`; g.fillText('SALON', W / 2, 600);
    g.font = `700 76px ${PLAY}`; spaced(g, 'DE 1874', W / 2, 720, 16);
    g.fillRect(W / 2 - 110, 790, 220, 3);
    g.font = `400 46px ${OLD}`; g.fillText('Palais des Champs-Élysées', W / 2, 900);
    g.font = `italic 400 40px ${OLD}`; g.fillText('ouverture le 1ᵉʳ mai', W / 2, 970);
    g.font = `400 30px ${OLD}`; spaced(g, 'PEINTURE · SCULPTURE · GRAVURE', W / 2, 1060, 6);
  }
  g.fillStyle = 'rgba(38,33,27,.5)'; g.font = `500 26px ${SANS}`; g.fillText('MONET 100 · 재현', W / 2, H - 112); g.textAlign = 'left';
  crease(g, W, H);
  const back = cv(W, H), b = back.getContext('2d');
  const bgr = b.createLinearGradient(0, 0, W * 0.3, H); bgr.addColorStop(0, expo ? '#E6D8B2' : '#ECE3CC'); bgr.addColorStop(1, expo ? '#D6C394' : '#DED1B2'); b.fillStyle = bgr; b.fillRect(0, 0, W, H); noise(b, W, H, 12, 10); crease(b, W, H);
  return { front, back };
}
function crease(g, W, H) {                              // 접힌 자국 — 위는 그늘, 바로 아래는 빛
  const y = H / 2, c = g.createLinearGradient(0, y - 26, 0, y + 26);
  c.addColorStop(0, 'rgba(60,40,15,0)'); c.addColorStop(0.46, 'rgba(60,40,15,.16)'); c.addColorStop(0.5, 'rgba(40,25,10,.3)'); c.addColorStop(0.54, 'rgba(255,250,235,.32)'); c.addColorStop(1, 'rgba(255,250,235,0)');
  g.fillStyle = c; g.fillRect(0, y - 26, W, 52);
}

// 나다르 사진관 카드 — 카비네 판(108×165): 크림 판지 · 금 테 · 사진 자리(고른 쪽 얼굴 콜라주, 내 초상이 있으면 그것) · 아래 사진관 인쇄
async function cabinetFaces() {
  const W = 864, H = 1320, front = cv(W, H), g = front.getContext('2d'), a = S.c4.art;
  const img = await loadImg(a.src);
  rr(g, 0, 0, W, H, 54); g.clip();
  cardStock(g, W, H, '#E4D8BC', 12);
  g.strokeStyle = '#B08A45'; g.lineWidth = 6; rr(g, 16, 16, W - 32, H - 32, 42); g.stroke();
  const px = 56, py = 56, pw = W - 112, ph = 1052;
  g.fillStyle = '#1C1813'; g.fillRect(px - 4, py - 4, pw + 8, ph + 8);
  cover(g, img, px, py, pw, ph, a.pos || '50% 50%');
  const sep = g.createLinearGradient(px, py, px, py + ph); sep.addColorStop(0, 'rgba(120,80,30,.08)'); sep.addColorStop(1, 'rgba(60,35,10,.16)'); g.fillStyle = sep; g.fillRect(px, py, pw, ph);
  g.strokeStyle = 'rgba(176,138,69,.9)'; g.lineWidth = 3; g.strokeRect(px - 12, py - 12, pw + 24, ph + 24);
  g.fillStyle = '#6A4D22'; g.textAlign = 'center'; g.font = `900 66px ${PLAY}`; spaced(g, 'NADAR', W / 2, 1196, 14);
  g.fillStyle = 'rgba(80,58,24,.85)'; g.font = `italic 400 32px ${OLD}`; g.fillText('35, Boulevard des Capucines · Paris', W / 2, 1250); g.textAlign = 'left';
  const back = cv(W, H), b = back.getContext('2d'); rr(b, 0, 0, W, H, 54); b.clip(); cardStock(b, W, H, '#DCCFAF', 13);
  return { front, back };
}

// ── 저장(그 면 그대로) · 공유
async function shareOrDownload(blob, name) {
  const file = new File([blob], name, { type: blob.type });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return 'share'; } catch (e) { if (e && e.name === 'AbortError') return 'abort'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'download';
}

// ── 붙이기
export async function mountKeep(root) {
  await fontsReady(['800 40px Paperlogy', '600 28px Paperlogy', '500 28px Freesentation', '600 28px Freesentation', '700 30px Freesentation', '900 20px "Playfair Display"', '700 20px "Playfair Display"', '400 20px "Old Standard TT"', 'italic 400 20px "Old Standard TT"', '700 20px "Old Standard TT"']);
  const built = await Promise.all([posterFaces(), cabinetFaces(), medalFaces(), postcardFaces(), ticketFaces()]);
  const FACES = Object.fromEntries(ORDER.map((k, i) => [k, built[i]]));
  const url = (c, k) => (k === 'ticket' || k === 'cabinet' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.9));

  root.innerHTML = `<div class="kt"><canvas class="kt-wood" aria-hidden="true"></canvas><i class="kt-light"></i><h2 class="kt-hd">가져가는 것</h2><div class="kt-objs"></div><i class="kt-vig"></i></div>`;
  const table = root.querySelector('.kt'), objs = root.querySelector('.kt-objs');
  const layer = document.createElement('div'); layer.className = 'kl'; layer.hidden = true; layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true');
  layer.innerHTML = `<i class="kl-scrim"></i><div class="kl-cap"><p class="kl-name"></p><button class="kl-save" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 19h14"/></svg>저장</button></div>`;
  document.body.appendChild(layer);
  const cap = layer.querySelector('.kl-cap'), capName = layer.querySelector('.kl-name');

  let cur = null, busy = false, raf = 0, lastTap = 0;
  const O = ORDER.map((k) => {
    const K = KINDS[k], f = FACES[k], el = document.createElement('div');
    el.className = `kobj k-${k}`; el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-label', `${LABEL[k]} 집어 들기`);
    const n = Math.max(2, Math.ceil(K.t / 0.8) + 1);
    const edges = K.t > 1.5 ? Array.from({ length: n }, (_, i) => `<i class="ke" style="transform:translateZ(${(-K.t / 2 + (K.t * i) / (n - 1)).toFixed(2)}px)"></i>`).join('') : '';
    const fu = url(f.front, k), bu = url(f.back, k);
    const front = k === 'poster'
      ? `<span class="kf front fold"><span class="ph t" style="background-image:url(${fu})"><i class="ksn"></i></span><span class="ph b" style="background-image:url(${fu})"><i class="ksn"></i></span></span>`
      : `<span class="kf front"><img src="${fu}" alt="" draggable="false"><i class="ksn"></i></span>`;
    el.innerHTML = `<i class="kct"></i><i class="ksh"></i><span class="k3d"><i class="kside"></i>${edges}${front}<span class="kf back"><img src="${bu}" alt="" draggable="false"><i class="ksn"></i></span></span>`;
    el.style.setProperty('--edge', K.edge); el.style.setProperty('--t', `${K.t}px`);
    const [cx, cy, rot] = LAYOUT[k];
    const o = { k, K, el, f, cx, cy, rot, k3d: el.querySelector('.k3d'), sh: el.querySelector('.ksh'), sns: [...el.querySelectorAll('.ksn')] };
    el.addEventListener('click', () => { if (!cur && !busy) lift(o); });
    el.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !cur) { e.preventDefault(); lift(o); } });
    objs.appendChild(el);
    return o;
  });

  // 크기 — 들었을 때 크기(px)가 기준. 탁자 위에서는 실제 mm 비율로 줄인다(그래서 들어 올려도 선명하다)
  let u = 1, vw = 390, vh = 844;
  function size() {
    vw = layer.clientWidth || Math.min(window.innerWidth, 480); vh = window.innerHeight;
    const maxW = Math.min(vw * 0.84, 400), maxH = vh * 0.52;
    O.forEach((o) => {
      const [mw, mh] = o.K.mm, ar = mw / mh; o.W = Math.min(maxW, maxH * ar); o.H = o.W / ar; o.st = (mw * PXMM) / o.W;
      o.el.style.width = `${o.W}px`; o.el.style.height = `${o.H}px`; o.el.style.setProperty('--r', `${(o.K.r * o.W) / 300}px`);
    });
    u = table.clientWidth / DW; table.style.height = `${DH * u}px`;
    O.forEach((o) => { if (o !== cur) place(o); });
    paintWood();
  }
  const T = (o, cx, cy, rot, s) => `translate3d(${(cx - o.W / 2).toFixed(2)}px, ${(cy - o.H / 2).toFixed(2)}px, 0) rotate(${rot}deg) scale(${s.toFixed(4)})`;
  function place(o) { const s = o.st * u; o.el.style.setProperty('--st', s.toFixed(4)); o.el.style.transform = T(o, o.cx * u, o.cy * u, o.rot, s); }
  let woodW = 0;
  function paintWood() {
    const w = table.clientWidth, h = table.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!w || Math.abs(w - woodW) < 2) return; woodW = w;
    const c = woodCanvas(Math.round(w * dpr), Math.round(h * dpr)), t = table.querySelector('.kt-wood');
    t.width = c.width; t.height = c.height; t.getContext('2d').drawImage(c, 0, 0);
  }
  size();
  // 물건은 처음부터 탁자 위 제자리에 놓여 있다(내려앉거나 차례로 나타나지 않는다)
  let rT = 0; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { if (!cur) { woodW = 0; size(); } }, 150); });

  // ── 집어 들기 · 돌리기 · 뒤집기 · 내려놓기
  const R = { rx: 0, ry: 0, vx: 0, vy: 0, flip: 0, flipT: 0, drag: null, last: 0, up: false };
  const LIM = 60, DUR = RM ? 0 : 480;
  function tablePt(o) { const t = objs.getBoundingClientRect(), l = layer.getBoundingClientRect(); return { x: t.left - l.left + o.cx * u, y: t.top - l.top + o.cy * u }; }
  function liftPt(o) { return { x: vw / 2, y: Math.min(vh * 0.45, vh - o.H / 2 - 120) }; }
  function lift(o) {
    cur = o; busy = true; lastTap = 0;
    Object.assign(R, { rx: 0, ry: 0, vx: 0, vy: 0, flip: 0, flipT: 0, drag: null, last: performance.now(), up: false });
    layer.hidden = false;
    const a = tablePt(o), b = liftPt(o);
    layer.insertBefore(o.el, cap);
    o.el.style.transform = T(o, a.x, a.y, o.rot, o.st * u);
    void o.el.offsetWidth;
    if (DUR) o.el.classList.add('anim');
    o.el.classList.add('up'); o.el.style.setProperty('--st', '1'); o.el.style.transform = T(o, b.x, b.y, 0, 1);
    capName.innerHTML = NAMES[o.k]; cap.style.top = `${b.y + o.H / 2 + (o.W > o.H ? 44 : 26)}px`;
    layer.setAttribute('aria-label', LABEL[o.k]);
    layer.classList.add('on');
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    setTimeout(() => { o.el.classList.remove('anim'); R.up = true; busy = false; }, DUR + 20);
  }
  function putBack() {
    if (!cur || busy) return;
    const o = cur; busy = true; R.up = false; cancelAnimationFrame(raf);
    const a = tablePt(o), turns = Math.round(R.flipT / 360) * 360;
    if (DUR) o.el.classList.add('anim');
    o.el.classList.remove('up'); o.el.style.setProperty('--st', (o.st * u).toFixed(4)); o.el.style.transform = T(o, a.x, a.y, o.rot, o.st * u);
    o.k3d.style.transform = `perspective(1400px) rotateX(0deg) rotateY(${turns}deg)`; o.sh.style.transform = '';
    o.sns.forEach((s) => { s.style.transform = ''; s.style.opacity = ''; });
    layer.classList.remove('on');
    setTimeout(() => {
      o.el.classList.remove('anim'); o.k3d.style.transform = '';
      const next = O[O.indexOf(o) + 1]; objs.insertBefore(o.el, next && next.el.parentNode === objs ? next.el : null);
      place(o); layer.hidden = true; cur = null; busy = false; o.el.focus({ preventScroll: true });
    }, DUR + 20);
  }
  function loop(now) {
    const o = cur; if (!o) return;
    if (!R.drag) {
      R.rx += R.vx; R.ry += R.vy; R.vx *= 0.92; R.vy *= 0.92;
      if (Math.abs(R.rx) > LIM) { R.rx = LIM * Math.sign(R.rx); R.vx *= -0.3; }
      if (Math.abs(R.ry) > LIM) { R.ry = LIM * Math.sign(R.ry); R.vy *= -0.3; }
      if (!RM && now - R.last > 1600 && Math.abs(R.vx) < 0.02 && Math.abs(R.vy) < 0.02) { R.rx *= 0.95; R.ry *= 0.95; }   // 가만히 두면 천천히 바로 선다(출구에서는 하지 않는다 — 손을 떼면 그 자리에 멈춘다)
    }
    R.flipT = RM ? R.flip : R.flipT + (R.flip - R.flipT) * 0.15;
    o.k3d.style.transform = `perspective(1400px) rotateX(${R.rx.toFixed(2)}deg) rotateY(${(R.ry + R.flipT).toFixed(2)}deg)`;
    const tilt = Math.min(1, (Math.abs(R.rx) + Math.abs(R.ry)) / 70);
    o.sns.forEach((s) => { s.style.transform = `translate(${(R.ry * 1.6).toFixed(1)}%, ${(-R.rx * 1.2).toFixed(1)}%)`; s.style.opacity = (0.25 + tilt * 0.6).toFixed(2); });
    if (R.up) o.sh.style.transform = `translate(${(16 - R.ry * 0.45).toFixed(1)}px, ${(34 + R.rx * 0.45).toFixed(1)}px) scale(${(1.02 - tilt * 0.06).toFixed(3)})`;
    raf = requestAnimationFrame(loop);
  }
  layer.addEventListener('pointerdown', (e) => {
    const o = cur; if (!o || !e.target.closest('.kobj')) return;
    try { o.el.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
    R.drag = { x: e.clientX, y: e.clientY, rx: R.rx, ry: R.ry, px: e.clientX, py: e.clientY, pt: performance.now(), moved: 0 }; R.vx = R.vy = 0; R.last = performance.now();
  });
  layer.addEventListener('pointermove', (e) => {
    const d = R.drag; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y; d.moved = Math.max(d.moved, Math.hypot(dx, dy));
    const nrx = Math.max(-LIM, Math.min(LIM, d.rx - dy * 0.42)), nry = Math.max(-LIM, Math.min(LIM, d.ry + dx * 0.42));
    const now = performance.now(), dt = Math.max(8, now - d.pt);
    R.vx = ((nrx - R.rx) / dt) * 16; R.vy = ((nry - R.ry) / dt) * 16; R.rx = nrx; R.ry = nry; d.pt = now; R.last = now;
    if (RM) { R.vx = R.vy = 0; }
  });
  const end = () => {
    const d = R.drag; if (!d) return; R.drag = null; R.last = performance.now();
    if (d.moved < 8) {
      const now = performance.now();
      if (now - lastTap < 340) { lastTap = 0; if (cur && cur.K.flip) R.flip += 180; }
      else lastTap = now;
      R.vx = R.vy = 0;
    }
  };
  layer.addEventListener('pointerup', end); layer.addEventListener('pointercancel', end);
  layer.addEventListener('click', (e) => { if (!e.target.closest('.kobj, .kl-cap')) putBack(); });
  layer.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cur) putBack(); });

  // 그 면 하나를 이미지로
  let lastSave = null;
  layer.querySelector('.kl-save').addEventListener('click', async (e) => {
    const o = cur; if (!o) return; const btn = e.currentTarget; btn.disabled = true;
    try {
      const side = Math.round(R.flip / 180) % 2 ? 'back' : 'front', c = o.f[side];
      const png = o.k === 'ticket' || o.k === 'cabinet';
      const blob = await new Promise((r) => c.toBlob(r, png ? 'image/png' : 'image/jpeg', 0.92));
      const name = `monet100_${LABEL[o.k].replace(/\s/g, '')}${side === 'back' ? '_뒷면' : ''}.${png ? 'png' : 'jpg'}`;
      lastSave = { k: o.k, side, name, w: c.width, h: c.height, bytes: blob.size };
      const how = await shareOrDownload(blob, name);
      if (how !== 'abort') toast(`${LABEL[o.k]}${side === 'back' ? ' 뒷면' : ''}을 이미지로 저장했습니다`, 1600);
    } catch (err) { console.error(err); }
    btn.disabled = false;
  });

  // ── 모두 한 장으로(1080×1920) — 같은 탁자 · 같은 자리. 위 · 아래 250px 은 비운다(스토리 화면이 덮는 자리)
  async function renderTable() {
    const Wd = 1080, Hd = 1920, c = cv(Wd, Hd), g = c.getContext('2d');
    g.drawImage(woodCanvas(Wd, Hd), 0, 0);
    lightAndVignette(g, 0, 0, Wd, Hd);
    // 물건이 차지하는 범위(설계 좌표) → 250…1670 안에 맞춘다
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    O.forEach((o) => { const w = o.K.mm[0] * PXMM, h = o.K.mm[1] * PXMM, a = (o.rot * Math.PI) / 180, ew = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a)), eh = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a)); x0 = Math.min(x0, o.cx - ew / 2); x1 = Math.max(x1, o.cx + ew / 2); y0 = Math.min(y0, o.cy - eh / 2); y1 = Math.max(y1, o.cy + eh / 2); });
    const box = { x: 70, y: 380, w: Wd - 140, h: 1180 }, k = Math.min(box.w / (x1 - x0), box.h / (y1 - y0));
    const ox = box.x + (box.w - (x1 - x0) * k) / 2 - x0 * k, oy = box.y + (box.h - (y1 - y0) * k) / 2 - y0 * k;
    for (const o of O) {
      const w = o.K.mm[0] * PXMM * k, h = o.K.mm[1] * PXMM * k, r = (o.K.r * w) / 300;
      g.save(); g.translate(ox + o.cx * k, oy + o.cy * k); g.rotate((o.rot * Math.PI) / 180);
      g.save(); g.shadowColor = 'rgba(6,3,0,.62)'; g.shadowBlur = 26; g.shadowOffsetX = 9; g.shadowOffsetY = 16; g.fillStyle = '#000'; rr(g, -w / 2, -h / 2, w, h, r); g.fill(); g.restore();
      g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 3; g.shadowOffsetX = 1; g.shadowOffsetY = 2; g.fillStyle = o.K.edge; const th = Math.max(1.5, o.K.t * 0.9); rr(g, -w / 2 + th * 0.5, -h / 2 + th, w, h, r); g.fill(); g.restore();
      g.save(); rr(g, -w / 2, -h / 2, w, h, r); g.clip(); g.drawImage(o.f.front, -w / 2, -h / 2, w, h);
      if (o.k === 'poster') { const s = g.createLinearGradient(0, 0, 0, h / 2); s.addColorStop(0, 'rgba(40,25,10,.16)'); s.addColorStop(0.35, 'rgba(40,25,10,.04)'); s.addColorStop(1, 'rgba(255,240,215,.05)'); g.fillStyle = s; g.fillRect(-w / 2, 0, w, h / 2); }
      const lg = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); lg.addColorStop(0, 'rgba(255,222,176,.12)'); lg.addColorStop(0.45, 'rgba(255,222,176,0)'); lg.addColorStop(1, 'rgba(20,10,0,.1)'); g.fillStyle = lg; g.fillRect(-w / 2, -h / 2, w, h);
      g.restore(); g.restore();
    }
    vignette(g, 0, 0, Wd, Hd);
    g.fillStyle = 'rgba(255,236,214,.62)'; g.font = `600 30px ${DISP}`; g.fillText('가져가는 것', 80, 300);
    g.textAlign = 'right'; g.fillStyle = 'rgba(255,236,214,.42)'; g.font = `600 22px ${DISP}`; g.fillText('MONET 100 · The Next Impression', Wd - 80, 298); g.textAlign = 'left';
    g.fillStyle = 'rgba(255,236,214,.4)'; g.font = `500 21px ${SANS}`; g.fillText(`${stampLine(VISITORS)} · 문명탐험가 앱 · 신세계 더 헤리티지`, 80, Hd - 270);
    return c;
  }

  window.__keep = { O, R, get cur() { return cur && cur.k; }, get busy() { return busy; }, get lastSave() { return lastSave; }, render: renderTable };
  return { renderTable };
}
