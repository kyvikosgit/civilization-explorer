// 출구 시안 B·C·D 공용 — 시안 A(exit.js)와 같은 선택지 · 예시 비율 · localStorage 읽기, 그리고 공유 미리보기 · 캔버스 도우미
//   네 곳(C0 · C1 · C2 · C4)의 내 입장: 기기에 남은 것(m100_choice)이 있으면 그것, 없으면 예시 값. 서버는 숫자만(여기서는 예시 수치)
//   가져가는 것: 메달 카드 · 전시 안내(재현) · 기차표와 엽서 · 사진관 카드(C4에서 고른 쪽 얼굴들의 콜라주, 내 초상이 기기에 있으면 그것)
import { loadChoices } from './js/proto-common.js';
import { fmt, stampLine } from './js/crowd.js';
export { fmt, stampLine };

export const VISITORS = 1284;
export const POINT = '#D9672F';

// 네 곳의 선택지와 오늘의 비율(예시) — exit.js · c0.js · c1.js · map-picker.html · c4.js 와 같은 값
export const C0 = {
  1: { title: '펠루시움의 캄비세스 왕', short: '캄비세스', src: '../works/c0-cambyses.jpg', pct: 9, artist: '폴 마리 르누아르', year: '1872' },
  2: { title: '마지막 탄약통', short: '탄약통', src: '../works/c0-cartridges.jpg', pct: 27, artist: '알퐁스 드 뇌빌', year: '1873' },
  3: { title: '환상, 14세기 전설', short: '환상', src: '../works/c0-vision.jpg', pct: 18, artist: '뤽 올리비에 메르송', year: '1872' },
  4: { title: '봄날', short: '봄날', src: '../works/c0-spring.jpg', pct: 39, artist: '피에르 오귀스트 코트', year: '1873' },
  5: { title: '르 봉 보크', short: '르 봉 보크', src: '../works/c0-bonbock.jpg', pct: 7, artist: '에두아르 마네', year: '1873' },
};
export const C1 = {
  jury: { label: '살롱', short: '살롱', pct: 38, where: '샹젤리제 궁 · 5월 1일 개막', fr: 'Salon de 1874' },
  viewer: { label: '화가들의 전시', short: '화가들의 전시', pct: 62, where: '카퓌신 대로 35번지 · 4월 15일 개막 · 1프랑', fr: '35, boulevard des Capucines' },
};
export const C2 = {
  argenteuil: { label: '아르장퇴유', fr: 'Argenteuil', year: 1874, pct: 13, ticket: 'argenteuil', paint: '../works/c2-arg-coquelicots-orsay.jpg', cap: '양귀비 들판', info: '11 km · 25분' },
  vernon: { label: '베르농', fr: 'Vernon', year: 1883, pct: 11, ticket: 'vernon', paint: '../works/c2-giverny-footbridge-nga.jpg', cap: '일본식 다리', info: '80 km · 급행 1시간 30분' },
  rouen: { label: '루앙', fr: 'Rouen', year: 1892, pct: 9, ticket: 'rouen', paint: '../works/c2-rouen-cathedrale-nga.jpg', cap: '루앙 대성당, 서쪽 정면, 햇빛', info: '140 km · 급행 2시간 40분' },
  lesifs: { label: '레지프', fr: 'Les Ifs', year: 1883, pct: 13, ticket: 'ifs', paint: '../works/c2-etretat-manneporte-met.jpg', cap: '마네포르트(에트르타)', info: '214 km · 4시간 33분 + 마차' },
  lehavre: { label: '르아브르', fr: 'Le Havre', year: 1872, pct: 54, ticket: 'havre', paint: '../works/c2-havre-impression-marmottan.jpg', cap: '인상, 해돋이', info: '229 km · 급행 4시간 30분' },
};
export const C4 = {
  paint: { label: '그림', full: '그림으로', pct: 44, line: '화가가 보고 그린 대로' },
  photo: { label: '사진', full: '사진으로', pct: 56, line: '렌즈 앞에 앉은 그대로' },
};
// C4 사진관 카드 — C4(c4.js card())와 같은 25명 가운데 12명의 얼굴(img/c4p, 4:5)을 고른 쪽으로 3 × 4 콜라주. 기기 안에서 한 번 그려 이미지로 쓴다
//   인물 목록은 C4 와 같은 js/c4-people.json 에서 읽는다(C4 가 사람을 빼거나 더해도 따라간다). 앞세우고 싶은 얼굴부터, 없으면 목록 순서로
const FACE_PREF = ['monet', 'manet', 'morisot', 'renoir', 'zola', 'pissarro', 'hugo', 'courbet', 'bernhardt', 'bazille', 'cezanne', 'sand'];
const PEOPLE_IDS = await fetch('js/c4-people.json').then((r) => r.json()).then((d) => d.people.map((p) => p.id)).catch(() => FACE_PREF);
const FACE_ORDER = [...FACE_PREF.filter((id) => PEOPLE_IDS.includes(id)), ...PEOPLE_IDS.filter((id) => !FACE_PREF.includes(id))];
export const C4_FACES = FACE_ORDER.slice(0, 12);
// 둥근 판(타원 마스크) 얼굴은 콜라주에서 뺀다 — 네 귀퉁이가 아주 밝거나 아주 어두운 판(img/c4p 를 재어 확인: caillebotte · liszt · renoir 사진, gautier 그림)
function whiteCorners(im) { try { const c = document.createElement('canvas'); c.width = 20; c.height = 25; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, 20, 25); const d = x.getImageData(0, 0, 20, 25).data; const v = [[0, 0], [19, 0], [0, 24], [19, 24]].map(([px, py]) => { const i = (py * 20 + px) * 4; return (d[i] + d[i + 1] + d[i + 2]) / 3; }); return v.filter((q) => q > 225).length >= 2 || v.filter((q) => q < 18).length >= 2; } catch (e) { return false; } }
async function makeCollage(k) {
  const cols = 3, rows = 4, cw = 200, ch = 250, gap = 14, pad = 34, W = pad * 2 + cols * cw + (cols - 1) * gap, H = pad * 2 + rows * ch + (rows - 1) * gap;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, k === 'paint' ? '#2E2219' : '#26241F'); bg.addColorStop(1, '#141210'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const ims = (await Promise.all(FACE_ORDER.slice(0, 18).map((id) => loadImg(`img/c4p/${id}-${k}.jpg`)))).filter((im) => im && !whiteCorners(im)).slice(0, cols * rows);
  ims.forEach((im, i) => {
    const x = pad + (i % cols) * (cw + gap), y = pad + Math.floor(i / cols) * (ch + gap);
    if (k === 'paint') { g.fillStyle = '#8C6B33'; g.fillRect(x, y, cw, ch); g.fillStyle = '#C9A55A'; g.fillRect(x + 3, y + 3, cw - 6, ch - 6); g.fillStyle = '#4A3519'; g.fillRect(x + 7, y + 7, cw - 14, ch - 14); if (im) g.drawImage(im, x + 9, y + 9, cw - 18, ch - 18); }
    else { g.fillStyle = '#E6DBC1'; g.fillRect(x, y, cw, ch); if (im) g.drawImage(im, x + 10, y + 10, cw - 20, ch - 34); }
  });
  return c.toDataURL('image/jpeg', 0.86);
}

// 기기에 남은 입장 + 예시 값
const stored = loadChoices();
const ls = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const c2card = ls('m100_c2_postcard');
const myPortrait = ls('m100_c4_portrait');          // 내 초상(선택) — { thumb } 이 있으면 초상 카드 자리에 쓴다
export const mine = {
  c0: C0[stored.c0?.n] ? { k: String(stored.c0.n), real: true } : { k: '4', real: false },
  c1: C1[stored.c1?.stance] ? { k: stored.c1.stance, real: true } : { k: 'viewer', real: false },
  c2: C2[stored.c2?.id] ? { k: stored.c2.id, real: true } : { k: 'lehavre', real: false },
  c4: C4[stored.c4?.stance] ? { k: stored.c4.stance, real: true } : { k: 'photo', real: false },
};
export const anyReal = Object.values(mine).some((m) => m.real);

const m0 = C0[mine.c0.k], m1 = C1[mine.c1.k], m2 = C2[mine.c2.k], m4 = C4[mine.c4.k];
const c4Collage = await makeCollage(mine.c4.k);
const postcardLine = c2card && c2card.id === mine.c2.k && c2card.text ? c2card.text : '';

// 네 곳 — 화면마다 같은 순서(바닥 순서 C0 → C1 → C2 → C4)
export const STATIONS = [
  { id: 'c0', no: 1, roman: 'I', room: 'C0 아카데미 살롱', roomFr: "Salon de l'Académie", q: '메달을 준 그림', ask: '올해의 메달을 어느 그림에',
    opts: Object.keys(C0).map((k) => ({ k, lab: C0[k].short, full: `${k}번 〈${C0[k].title}〉`, pct: C0[k].pct })), me: mine.c0.k, real: mine.c0.real,
    choice: `〈${m0.title}〉`, choicePlain: m0.title, sub: `${m0.artist} · ${m0.year} · ${mine.c0.k}번 후보작`, img: m0.src,
    art: { kind: 'medal', src: m0.src, lb: '메달 카드', t: `〈${m0.title}〉` } },
  { id: 'c1', no: 2, roman: 'II', room: 'C1 시민사회', roomFr: 'Paris, printemps 1874', q: '보러 간 전시', ask: '어느 전시를 보러 가시겠습니까?',
    opts: Object.keys(C1).map((k) => ({ k, lab: C1[k].short, full: C1[k].label, pct: C1[k].pct })), me: mine.c1.k, real: mine.c1.real,
    choice: m1.label, choicePlain: m1.label, sub: m1.where, expo: mine.c1.k === 'viewer',
    art: { kind: 'poster', expo: mine.c1.k === 'viewer', lb: '전시 안내 · 재현', t: mine.c1.k === 'viewer' ? '카퓌신 대로 35번지' : '살롱 1874' } },
  { id: 'c2', no: 3, roman: 'III', room: 'C2 산업혁명', roomFr: 'Gare Saint-Lazare', q: '행선지', ask: '생라자르역에서 어디까지',
    opts: Object.keys(C2).map((k) => ({ k, lab: C2[k].label, full: `${C2[k].label} · ${C2[k].year}년 표`, pct: C2[k].pct })), me: mine.c2.k, real: mine.c2.real,
    choice: m2.label, choicePlain: m2.label, sub: `${m2.year}년 표 · ${m2.info}`, img: m2.paint, ticket: `../ticket/ticket-front-${m2.ticket}.png`, cap: m2.cap, fr: m2.fr,
    art: { kind: 'ticket', src: `../ticket/ticket-front-${m2.ticket}.png`, paint: m2.paint, lb: '기차표 · 엽서', t: postcardLine ? `“${postcardLine.slice(0, 14)}${postcardLine.length > 14 ? '…' : ''}”` : `${m2.label} · ${m2.year}` } },
  { id: 'c4', no: 4, roman: 'IV', room: 'C4 나다르 사진관', roomFr: 'Atelier Nadar', q: '사람을 남긴다면', ask: '사람을 남긴다면, 그림입니까 사진입니까?',
    opts: Object.keys(C4).map((k) => ({ k, lab: C4[k].label, full: C4[k].full, pct: C4[k].pct })), me: mine.c4.k, real: mine.c4.real,
    choice: m4.full, choicePlain: m4.label, sub: m4.line, img: c4Collage, pos: '50% 50%',
    art: myPortrait && myPortrait.thumb
      ? { kind: 'carte', src: myPortrait.thumb, pos: '50% 40%', lb: '내 초상', t: '카르트 드 비지트' }
      : { kind: 'collage', src: c4Collage, pos: '50% 50%', lb: '사진관 카드', t: `나는 ${m4.full} 남긴다` } },
];
STATIONS.forEach((s) => { s.opt = s.opts.find((o) => o.k === s.me); s.others = s.opts.filter((o) => o.k !== s.me); });

// 나와 같은 길 — 네 곳 모두 나와 같은 쪽(예시: 비율의 곱)
export const same = Math.max(0.5, Math.round(STATIONS.reduce((a, s) => a * s.opt.pct / 100, 1) * 1000) / 10);
export const sameN = Math.max(1, Math.round(VISITORS * same / 100));
export const ARTS = STATIONS.map((s) => s.art);

// ── 작은 판(전시 안내 재현) — 화면용 HTML
export function posterHTML(expo, cls = '') {
  return expo
    ? `<span class="x-poster expo ${cls}"><small>Société anonyme</small><b>EXPO-<br>SITION</b><i></i><small>35, bd des Capucines</small></span>`
    : `<span class="x-poster ${cls}"><small>République Française</small><b>SALON<br>DE 1874</b><i></i><small>Palais des Champs-Élysées</small></span>`;
}
// 가져가는 것 하나 — 화면용 HTML(썸네일)
export function artThumb(a) {
  if (a.kind === 'poster') return posterHTML(a.expo, 'x-th');
  if (a.kind === 'ticket') return `<span class="x-th x-ticket"><img src="${a.paint}" alt="" class="pc"><img src="${a.src}" alt="" class="tk"></span>`;
  return `<span class="x-th x-${a.kind}"><img src="${a.src}" alt="" style="${a.pos ? `object-position:${a.pos}` : ''}">${a.kind === 'medal' ? '<i class="x-medal"></i>' : ''}</span>`;
}

// ── 캔버스 도우미(공유 이미지)
export function loadImg(src) { return new Promise((res) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
export function cover(g, img, x, y, w, h, pos = '50% 50%') {
  if (!img) { g.fillStyle = '#2A2724'; g.fillRect(x, y, w, h); return; }
  const sc = Math.max(w / img.naturalWidth, h / img.naturalHeight), sw = w / sc, sh = h / sc;
  const [px, py] = pos.split(' ').map((v) => parseFloat(v) / 100);
  g.drawImage(img, (img.naturalWidth - sw) * px, (img.naturalHeight - sh) * py, sw, sh, x, y, w, h);
}
export function drawPoster(g, x, y, w, h, expo) {
  g.fillStyle = expo ? '#E6D6AA' : '#EFE6D0'; g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(38,33,27,.7)'; g.lineWidth = Math.max(1, w / 90); const i = w * 0.06; g.strokeRect(x + i, y + i, w - i * 2, h - i * 2);
  g.fillStyle = '#26211B'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const fs = w * 0.17; g.font = `900 ${fs}px "Playfair Display", Georgia, serif`;
  g.fillText(expo ? 'EXPO-' : 'SALON', x + w / 2, y + h / 2 - fs * 0.1); g.fillText(expo ? 'SITION' : 'DE 1874', x + w / 2, y + h / 2 + fs * 0.9);
  g.font = `400 ${w * 0.075}px "Old Standard TT", Georgia, serif`;
  g.fillText(expo ? 'SOCIÉTÉ ANONYME' : 'RÉPUBLIQUE FRANÇAISE', x + w / 2, y + h * 0.24);
  g.fillText(expo ? '35, BD DES CAPUCINES' : 'CHAMPS-ÉLYSÉES', x + w / 2, y + h * 0.84);
  g.textAlign = 'left';
}
// 가져가는 것 하나를 (x, y) 에 S 크기로 — 메달은 금 원, 기차표는 엽서 위, 초상은 크림 판
export async function drawArt(g, a, x, y, S) {
  g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = S * 0.12; g.shadowOffsetY = S * 0.05;
  if (a.kind === 'poster') { drawPoster(g, x, y, S, S * 1.2, a.expo); g.restore(); return; }
  if (a.kind === 'ticket') {
    const pimg = await loadImg(a.paint), timg = await loadImg(a.src);
    g.fillStyle = '#DDD4BC'; g.fillRect(x, y + S * 0.18, S, S * 0.72); g.restore();
    cover(g, pimg, x, y + S * 0.18, S, S * 0.72);
    g.save(); g.translate(x + S * 0.08, y); g.rotate(-0.06); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = S * 0.08; g.shadowOffsetY = S * 0.03;
    if (timg) g.drawImage(timg, 0, 0, S * 0.78, S * 0.78 * timg.naturalHeight / timg.naturalWidth); g.restore();
    return;
  }
  const img = await loadImg(a.src);
  if (a.kind === 'carte') { g.fillStyle = '#E3D6B6'; g.fillRect(x, y, S * 0.78, S * 1.2); g.restore(); cover(g, img, x + S * 0.06, y + S * 0.06, S * 0.66, S * 0.96, a.pos); return; }
  g.fillStyle = '#222'; g.fillRect(x, y, S, S * 1.2); g.restore(); cover(g, img, x, y, S, S * 1.2, a.pos);
  if (a.kind === 'medal') { g.fillStyle = '#E7C46C'; g.beginPath(); g.arc(x + S * 0.8, y + S * 1.0, S * 0.11, 0, 6.2832); g.fill(); g.strokeStyle = '#3B2A12'; g.lineWidth = S * 0.02; g.stroke(); }
}
export async function fontsReady(list = ['800 40px Paperlogy', '600 28px Paperlogy', '500 28px Freesentation', '700 30px Freesentation', '900 20px "Playfair Display"', '400 20px "Old Standard TT"', 'italic 400 20px "Old Standard TT"', '700 20px "Old Standard TT"']) {
  try { await Promise.all(list.map((f) => document.fonts.load(f, '모네 Nº'))); } catch (e) { /* noop */ }
}
// 글줄 감싸기(캔버스)
export function wrapText(g, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  words.forEach((w) => { const t = cur ? `${cur} ${w}` : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
  if (cur) lines.push(cur); return lines;
}

// ── 공유 미리보기: 버튼 → render() 가 그린 1080×1920 → 미리보기 → 사진첩에 저장 · 공유
export function setupShare(btn, render, filename = 'monet100_나의길.png') {
  const ov = document.createElement('div');
  ov.className = 'xs-ov'; ov.hidden = true;
  ov.innerHTML = `<div class="xs-top"><span>공유 이미지 · 1080×1920</span><button class="icon-btn" type="button" aria-label="닫기" data-x><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="xs-body"><img alt="공유 이미지 미리보기"></div><div class="xs-btns"><button class="btn white" type="button" data-go>사진첩에 저장 · 공유</button></div>`;
  document.body.appendChild(ov);
  let blob = null;
  const close = () => { ov.hidden = true; };
  ov.querySelector('[data-x]').addEventListener('click', close);
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try { const c = await render(); blob = await new Promise((r) => c.toBlob(r, 'image/png')); ov.querySelector('img').src = c.toDataURL('image/png'); ov.hidden = false; }
    catch (e) { console.error(e); }
    btn.disabled = false;
  });
  ov.querySelector('[data-go]').addEventListener('click', async () => {
    if (!blob) return;
    const file = new File([blob], filename, { type: 'image/png' });
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
}
