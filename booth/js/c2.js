// C-2 산업혁명 체험 부스 — Step1 현장 체험 안내(관람·단서 발견은 부스에서 직접) → Step2 앱 퀴즈
// 2026-10-15 피드백: "단서로 찾는 거 더 디벨롭, 기차역도 다섯 개 선택지"
//   ① 파리의 출발역 5곳(1870년대 실제 종착역, 실제 위치) → ② 도착 지역 5곳(그 노선들의 방면, 실제 지역 경계)
//   선택마다 확인 팝업, 노선이 그 역에서 지역까지 이어지는 애니메이션, 오답이면 그 역이 실제로 어느 노선이었는지 알려 주고 다시
//   '현장 단서'(부스 소품: 벽면 그림·신문·시간표·엽서)는 언제든 열어 볼 수 있는 서랍 — 따로 찾는 단계 아님
// 지도 데이터: assets/data/map.json (Natural Earth 1:10m 해안선·국경 + IGN Admin Express 2018 지역·데파르트망 경계, 메르카토르 투영)
import { $, $$, ICON, createFlow, sheet, clamp } from './common.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};

// ── 1870년대 파리의 철도 종착역 (위치 = 실제 좌표, 노선 경유지 = 실제 간선의 주요 도시)
const STATIONS = [
  { id: 'lazare', ko: '생라자르역', fr: 'Gare Saint-Lazare', ll: [2.3253, 48.8763], lab: [-10, -34, 'end'],
    co: '서부철도(Chemins de fer de l’Ouest)', towns: '루앙·르아브르·디에프', dest: 'normandie',
    via: [[1.72, 48.99], [1.09, 49.44], [0.11, 49.49]] },
  { id: 'nord', ko: '북역', fr: 'Gare du Nord', ll: [2.3553, 48.8809], lab: [6, -40, 'start'],
    co: '북부철도(Chemins de fer du Nord)', towns: '아미앵·릴·칼레', dest: 'hauts',
    via: [[2.47, 49.26], [2.30, 49.89], [3.07, 50.63]] },
  { id: 'est', ko: '동역', fr: 'Gare de l’Est', ll: [2.3592, 48.8768], lab: [18, 6, 'start'],
    co: '동부철도(Chemins de fer de l’Est)', towns: '에페르네·랭스·낭시·스트라스부르', dest: 'grandest',
    via: [[3.40, 49.05], [3.95, 49.04], [4.36, 48.96]] },
  { id: 'lyon', ko: '리옹역', fr: 'Gare de Lyon', ll: [2.3740, 48.8443], lab: [14, 34, 'start'],
    co: '파리-리옹-지중해 철도(PLM)', towns: '디종·리옹·마르세유', dest: 'paca',
    via: [[5.04, 47.32], [4.83, 45.76], [5.37, 43.30]] },
  { id: 'mont', ko: '몽파르나스역', fr: 'Gare Montparnasse', ll: [2.3245, 48.8430], lab: [-14, 34, 'middle'],
    co: '서부철도의 좌안 노선', towns: '샤르트르·르망·렌·브레스트', dest: 'bretagne',
    via: [[1.49, 48.45], [0.19, 48.00], [-1.68, 48.11]] },
];
const REGIONS = [
  { id: 'normandie', ko: '노르망디', fr: 'Normandie' },
  { id: 'hauts', ko: '오드프랑스(노르)', fr: 'Nord' },
  { id: 'grandest', ko: '샹파뉴·그랑테스트', fr: 'Champagne' },
  { id: 'paca', ko: '프로방스·코트다쥐르', fr: 'Provence' },
  { id: 'bretagne', ko: '브르타뉴', fr: 'Bretagne' },
];
const ANSWER = { station: 'lazare', region: 'normandie' };
// 정답 결과 원고 — 앱 소스 missions.ts 'ticket'(4F · C-2 산업혁명) 확정 원고 재사용
const RESULT_OK = {
  title: '정답입니다',
  route: '파리(생라자르) → 노르망디',
  body: '철도는 산업혁명이 낳은 가장 극적인 변화였습니다. 파리지앵들은 이제 하루 만에 바닷가에 닿을 수 있게 되었죠.\n이 노선의 끝에는 모네가 어린 시절을 보낸 르아브르가 있고, 그 해안을 따라 인상파 화가들이 특히 사랑했던 에트르타가 있답니다.',
};

// ── 현장 단서 (부스 소품과 같은 것: 벽면 그림 · 신문 · 책상 위 시간표 · 엽서)
//   그림 2점은 퍼블릭 도메인(앱 에셋과 같은 이미지), 신문·시간표는 1870년대 양식으로 다시 짠 재현 카드 — 실존 인물의 말은 넣지 않았다
const CLUES = [
  { kind: 'img', img: 'assets/clue/monet_gare_saint_lazare_1877.jpg', k: '벽면의 그림',
    t: '증기를 뿜는 기관차와 철골 유리 지붕 — 파리의 한 기차역입니다.',
    meta: '클로드 모네, 1877 · 퍼블릭 도메인 (작품명은 정답 화면에서)' },
  { kind: 'news', k: '신문 광고 · 재현',
    t: '바다로 가는 ‘유람 열차’ 광고. 행선지는 모두 영불해협(라망슈) 해안 도시입니다.' },
  { kind: 'table', k: '책상 위 시간표 · 재현',
    t: '서부철도의 파리–르아브르 선. 서부철도는 파리에 출발역이 두 곳 있었습니다 — 센강 오른쪽과 왼쪽.' },
  { kind: 'img', img: 'assets/clue/monet_manneporte_etretat_1883.jpg', k: '엽서',
    t: '바다 절벽의 마을 에트르타. 모네는 이 해안의 항구 도시 르아브르에서 자랐습니다.',
    meta: '클로드 모네 〈에트르타의 마네포르트〉 1883 · 퍼블릭 도메인' },
];
function clueCard(c) {
  if (c.kind === 'img') return `<figure class="clue"><div class="clue-img"><img src="${c.img}" alt="" loading="lazy"></div>
    <figcaption><div class="clue-k">${c.k}</div><p>${c.t}</p><div class="clue-meta">${c.meta}</div></figcaption></figure>`;
  if (c.kind === 'news') return `<figure class="clue"><div class="clue-paper news">
      <div class="np-mast">LE PETIT JOURNAL<span>— annonces —</span></div>
      <div class="np-rule"></div>
      <div class="np-big">TRAINS DE PLAISIR</div>
      <div class="np-mid">PARIS — LA MER</div>
      <div class="np-sm">Dieppe · Le Havre · Trouville<br>Billets d’aller et retour</div>
    </div><figcaption><div class="clue-k">${c.k}</div><p>${c.t}</p></figcaption></figure>`;
  return `<figure class="clue"><div class="clue-paper table">
      <div class="tt-co">CHEMINS DE FER DE L’OUEST</div>
      <div class="tt-line">Ligne de Paris au Havre</div>
      <ol class="tt-st"><li>Paris</li><li>Mantes</li><li>Vernon</li><li>Rouen</li><li>Yvetot</li><li>Le Havre</li></ol>
    </div><figcaption><div class="clue-k">${c.k}</div><p>${c.t}</p></figcaption></figure>`;
}
$('#clueRow').innerHTML = CLUES.map(clueCard).join('');
const clueSheet = sheet($('#clueSheet'));
$('#openClues').addEventListener('click', () => clueSheet.open());

function compassSVG(c1, c2) {
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><g fill="none" stroke="${c2}" stroke-width="1.2"><circle r="30"/><circle r="34" stroke-dasharray="2 3"/></g>
    <g fill="${c1}"><path d="M0-46L6-6 0 0-6-6z"/><path d="M0 46L6 6 0 0-6 6z" opacity=".55"/><path d="M46 0L6 6 0 0 6-6z" opacity=".55"/><path d="M-46 0L-6 6 0 0-6-6z" opacity=".55"/></g>
    <circle r="3" fill="${c1}"/></svg>`;
}

// ── 흐름
const resultSheet = sheet($('#resultSheet'));
const confirmSheet = sheet($('#confirmSheet'));
const flow = createFlow({
  total: 2,
  booth: '4층 C-2 산업혁명',
  titles: ['현장 체험', '앱 퀴즈 참여'],
  onEnter(n) { if (n === 2) initMap(); },
  onLeave(prev) { if (prev === 2) { resultSheet.close(); confirmSheet.close(); clueSheet.close(); } },
});
$$('[data-next]').forEach((b) => b.addEventListener('click', () => flow.next()));

// ── 지도
let M = null;
let svg, world, labels, routeG, routeGlow, routeCore, routeLine, pinG, regionEls = {}, parisG;
const view = { s: 1, tx: 0, ty: 0, min: 0.1, max: 200 };
let stage = 'station';                 // 'station' | 'region'
let station = null, region = null, pending = null, busy = false;

const proj = (lon, lat) => {
  const merc = (a) => (Math.log(Math.tan(Math.PI / 4 + (a * Math.PI) / 360)) * 180) / Math.PI;
  const P = M.projection;
  return [(lon - P.lon0) * P.k, (merc(P.lat1) - merc(lat)) * P.k];
};

async function initMap() {
  if (M) { fitStage(false); return; }
  M = await fetch('assets/data/map.json').then((r) => r.json());
  svg = $('#map');
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <pattern id="seaHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
      <rect width="7" height="7" fill="#6f8f88"/><path d="M0 3.5h7" stroke="#638179" stroke-width="1.2"/></pattern>
    <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset="55%" stop-color="#2a1c10" stop-opacity="0"/><stop offset="100%" stop-color="#2a1c10" stop-opacity=".55"/></radialGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>`;
  el('rect', { width: '100%', height: '100%', fill: 'url(#seaHatch)' }, svg);
  world = el('g', {}, svg);
  [[22, '#89a59c', 0.35], [13, '#9db6aa', 0.5], [6, '#b7c9b8', 0.7]].forEach(([w, c, o]) =>
    el('path', { d: M.land, fill: 'none', stroke: c, 'stroke-width': w, 'stroke-opacity': o, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }, world));
  el('path', { d: M.land, fill: '#E8D6AD', stroke: '#6b5235', 'stroke-width': 1.1, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }, world);
  const tint = { normandie: '#C2C48E', hauts: '#D6C08C', grandest: '#D8AE7C', paca: '#DCB98A', bretagne: '#CFB57F' };
  REGIONS.forEach((r) => { regionEls[r.id] = el('path', { d: M.regions[r.id], fill: tint[r.id], 'fill-opacity': 0.85, class: 'region', 'data-id': r.id }, world); });
  el('path', { d: M.regionBorders, fill: 'none', stroke: '#8a6d47', 'stroke-width': 0.9, 'stroke-dasharray': '2 3', 'stroke-opacity': 0.7, 'vector-effect': 'non-scaling-stroke' }, world);
  el('path', { d: M.borders, fill: 'none', stroke: '#6b5235', 'stroke-width': 1.3, 'stroke-dasharray': '6 3 1 3', 'stroke-opacity': 0.8, 'vector-effect': 'non-scaling-stroke' }, world);
  // 파리 시가지 (데파르트망 75) + 근교 — 출발역 고를 때 확대해서 보인다
  parisG = el('g', {}, world);
  el('path', { d: M.regions.petitecouronne, fill: '#DCC8A0', stroke: '#8a6d47', 'stroke-width': 0.8, 'stroke-dasharray': '2 3', 'vector-effect': 'non-scaling-stroke' }, parisG);
  el('path', { d: M.regions.paris, fill: '#F1E2C0', stroke: '#6b5235', 'stroke-width': 1.4, 'vector-effect': 'non-scaling-stroke' }, parisG);
  REGIONS.forEach((r) => {
    regionEls[r.id + '_hl'] = el('path', { d: M.regions[r.id], fill: 'none', stroke: '#E0662C', 'stroke-width': 2.4, opacity: 0, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }, world);
  });
  routeG = el('g', {}, world);
  routeGlow = el('path', { fill: 'none', stroke: '#FF8A3D', 'stroke-width': 9, 'stroke-opacity': 0.45, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: 'url(#glow)', 'vector-effect': 'non-scaling-stroke' }, routeG);
  routeCore = el('path', { fill: 'none', stroke: '#F06A28', 'stroke-width': 4.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, routeG);
  routeLine = el('path', { fill: 'none', stroke: '#FFF1DC', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-dasharray': '1 7', 'vector-effect': 'non-scaling-stroke' }, routeG);
  el('rect', { width: '100%', height: '100%', fill: 'url(#vig)', 'pointer-events': 'none' }, svg);
  labels = el('g', { 'pointer-events': 'none' }, svg);
  pinG = el('g', { 'pointer-events': 'none', opacity: 0 }, svg);
  pinG.innerHTML = `<g class="pin-in"><path d="M0 0C-3-9-12-14-12-24a12 12 0 0 1 24 0C12-14 3-9 0 0z" fill="#E0482A" stroke="#fff" stroke-width="2"/><circle cy="-24" r="4.5" fill="#fff"/></g>`;
  $('#cfOk').addEventListener('click', onConfirm);
  $('#cfRetry').addEventListener('click', () => { confirmSheet.close(); pending = null; if (stage === 'region') { region = null; clearRoute(); } markChips(); drawLabels(); });
  bindInput();
  setStage('station', false);
  window.addEventListener('resize', () => fitStage(false));
}

// ── 시점: 단계마다 맞춰 부드럽게 확대·축소
function stageBounds() {
  if (stage === 'station') {
    const pts = STATIONS.map((s) => proj(...s.ll));
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const half = Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) * 1.2) * 1.75;   // 이름표가 화면 안에 들어오게
    return [cx - half, cy - half * 0.9, cx + half, cy + half * 0.9];
  }
  const b = REGIONS.map((r) => M.bounds[r.id]);
  return [Math.min(...b.map((q) => q[0])), Math.min(...b.map((q) => q[1])), Math.max(...b.map((q) => q[2])), Math.max(...b.map((q) => q[3]))];
}
let tween = 0;
function fitStage(animate = true) {
  const box = $('#mapBox').getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  const top = ($('.quiz-top').getBoundingClientRect().bottom || 220) + 6;
  const bottom = box.height - ($('.quiz-bottom').offsetHeight || 100);
  const [x0, y0, x1, y1] = stageBounds();
  const pad = 16;
  const s = Math.min((box.width - pad * 2) / (x1 - x0), (bottom - top - pad * 2) / (y1 - y0));
  const to = { s, tx: (box.width - (x1 - x0) * s) / 2 - x0 * s, ty: top + (bottom - top - (y1 - y0) * s) / 2 - y0 * s };
  view.min = s * 0.7; view.max = s * (stage === 'station' ? 3 : 6);
  if (!animate) { Object.assign(view, to); applyView(); return; }
  const from = { s: view.s, tx: view.tx, ty: view.ty }, t0 = performance.now(), D = 900, id = ++tween;
  // 화면 가운데 기준으로 로그 배율 보간 (줌이 자연스럽게)
  const cxw = (box.width / 2 - from.tx) / from.s, cyw = ((top + bottom) / 2 - from.ty) / from.s;
  const cxt = (box.width / 2 - to.tx) / to.s, cyt = ((top + bottom) / 2 - to.ty) / to.s;
  const step = (now) => {
    if (id !== tween) return;
    const k = Math.min((now - t0) / D, 1), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const sc = Math.exp(Math.log(from.s) + (Math.log(to.s) - Math.log(from.s)) * e);
    const wx = cxw + (cxt - cxw) * e, wy = cyw + (cyt - cyw) * e;
    view.s = sc; view.tx = box.width / 2 - wx * sc; view.ty = (top + bottom) / 2 - wy * sc;
    applyView();
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function toScreen([x, y]) { return [x * view.s + view.tx, y * view.s + view.ty]; }
function toWorld(sx, sy) { return [(sx - view.tx) / view.s, (sy - view.ty) / view.s]; }
function applyView() {
  world.setAttribute('transform', `translate(${view.tx} ${view.ty}) scale(${view.s})`);
  drawLabels(); updatePin();
}

function drawLabels() {
  const z = 1;
  let h = '';
  const txt = (x, y, fr, ko, fs, anchor = 'middle', w = 600) =>
    `<text class="lbl" x="${x}" y="${y}" text-anchor="${anchor}" font-size="${fs}" font-weight="${w}" stroke-width="3">${fr}</text>` +
    (ko ? `<text class="lbl-ko" x="${x}" y="${y + fs * 1.05}" text-anchor="${anchor}" font-size="${fs * 0.82}" stroke-width="3">${ko}</text>` : '');
  if (stage === 'station') {
    const [px, py] = toScreen(M.anchors.paris);
    h += `<text class="lbl-faint" x="${px}" y="${py + 4}" text-anchor="middle" font-size="22">PARIS</text>`;
    STATIONS.forEach((s) => {
      const [x, y] = toScreen(proj(...s.ll));
      const on = (pending && pending.id === s.id) || (station && station.id === s.id);
      const lx = x + s.lab[0], ly = y + s.lab[1];
      h += `<line x1="${x}" y1="${y}" x2="${lx}" y2="${ly + (s.lab[1] < 0 ? 4 : -12)}" stroke="#6b5235" stroke-width="1" />`;
      h += `<circle cx="${x}" cy="${y}" r="${on ? 9 : 7}" fill="${on ? '#E0662C' : '#1E140C'}" stroke="#FFF1DC" stroke-width="2.5"/>`;
      h += txt(lx, ly, s.fr, s.ko, 13, s.lab[2], on ? 800 : 600);
    });
  } else {
    const add = (id, fr, ko, dx = 0, dy = 0, big) => { const [x, y] = toScreen(M.anchors[id]); h += txt(x + dx, y + dy, fr, ko, big ? 14 : 12.5, 'middle', big ? 800 : 600); };
    const [sx, sy] = toScreen(proj(-2.4, 50.25));
    h += `<text class="lbl-sea" x="${sx}" y="${sy}" text-anchor="middle" font-size="13">La Manche</text>`;
    REGIONS.forEach((r) => add(r.id, r.fr, r.ko, r.id === 'grandest' ? 10 : 0, r.id === 'hauts' ? -6 : 0, region && region.id === r.id));
    const [px, py] = toScreen(M.paris);
    h += `<circle cx="${px}" cy="${py}" r="6.5" fill="#1E140C" stroke="#FF9A55" stroke-width="2.5"/>`;
    h += txt(px + 10, py - 8, station ? station.ko : 'Paris', '', 12, 'start', 800);
    const [cx, cy] = toScreen(proj(-5.0, 45.6));
    h += `<g transform="translate(${cx} ${cy}) scale(0.5)" opacity=".85">${compassSVG('#F3E7CB', '#F3E7CB').replace(/<\/?svg[^>]*>/g, '')}</g>`;
  }
  labels.innerHTML = h;
}

// ── 단계 전환
function setStage(st, animate = true) {
  stage = st;
  $('#stg1').classList.toggle('on', st === 'station'); $('#stg1').classList.toggle('done', st === 'region');
  $('#stg2').classList.toggle('on', st === 'region');
  $('#stageHint').innerHTML = st === 'station'
    ? '① 1870년대 파리에는 방면마다 출발역이 따로 있었습니다. <b>어느 역에서 출발할까요?</b>'
    : `② <b>${station.ko}</b>에서 출발합니다. 이 기차는 <b>어느 지역</b>으로 갈까요?`;
  parisG.style.opacity = st === 'station' ? 1 : 0.6;
  REGIONS.forEach((r) => { regionEls[r.id].style.pointerEvents = st === 'region' ? 'auto' : 'none'; });
  buildChips();
  fitStage(animate);
}
function buildChips() {
  const box = $('#chips');
  const list = stage === 'station' ? STATIONS : REGIONS;
  box.innerHTML = list.map((c) => `<button class="chip ${stage}" role="radio" aria-checked="false" data-id="${c.id}">
      ${stage === 'region' ? `<span class="thumb">${regionThumb(c.id)}</span>` : '<span class="dot"></span>'}
      <span class="chip-t">${c.ko}<small>${c.fr}</small></span><span class="ck">${ICON.check}</span></button>`).join('');
  $$('.chip', box).forEach((b) => b.addEventListener('click', () => pick(b.dataset.id)));
  markChips();
}
function markChips() {
  const cur = pending ? pending.id : (stage === 'station' ? station && station.id : region && region.id);
  $$('#chips .chip').forEach((b) => { const on = b.dataset.id === cur; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); if (on) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); });
  REGIONS.forEach((r) => regionEls[r.id + '_hl'].setAttribute('opacity', stage === 'region' && cur === r.id ? 1 : 0));
}
function regionThumb(id) {
  const b = M.bounds[id]; const w = b[2] - b[0], h = b[3] - b[1]; const m = Math.max(w, h) * 0.12;
  return `<svg viewBox="${b[0] - m} ${b[1] - m} ${w + 2 * m} ${h + 2 * m}" aria-hidden="true"><path d="${M.regions[id]}"/></svg>`;
}

// ── 고르기 → (지역이면 노선 애니메이션) → 확인 팝업
let pickRun = 0;
async function pick(id) {
  if (busy || resultSheet.isOpen || confirmSheet.isOpen) return;
  const run = ++pickRun;
  if (stage === 'station') {
    pending = STATIONS.find((s) => s.id === id);
    markChips(); drawLabels();
    $('#cfWhat').textContent = `${pending.fr}`;
    $('#cfTitle').textContent = `${pending.ko}에서 출발하시겠습니까?`;
    $('#cfSub').textContent = '';
    confirmSheet.open();
    return;
  }
  pending = REGIONS.find((r) => r.id === id);
  region = pending; markChips(); drawLabels();
  busy = true;
  drawRoute(station, pending);
  await new Promise((r) => setTimeout(r, 1500));
  busy = false;
  if (run !== pickRun) return;
  $('#cfWhat').textContent = `${station.ko} → ${pending.ko}`;
  $('#cfTitle').textContent = '이 지역을 선택하시겠습니까?';
  $('#cfSub').textContent = '';
  confirmSheet.open();
}
function onConfirm() {
  confirmSheet.close();
  if (!pending) return;
  if (stage === 'station') { station = pending; pending = null; setTimeout(() => setStage('region'), 220); return; }
  region = pending; pending = null;
  setTimeout(showResult, 260);
}

// ── 노선: 고른 역이 실제로 가던 방면이면 그 간선의 주요 도시를 따라, 아니면 파리에서 지역까지 완만한 곡선
function smoothPath(pts) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    d += i === 1 ? ` L${m[0]},${m[1]}` : ` Q${p0[0]},${p0[1]} ${m[0]},${m[1]}`;
    if (i === pts.length - 1) d += ` L${p1[0]},${p1[1]}`;
  }
  return d;
}
function drawRoute(st, rg) {
  const a = M.paris, b = M.anchors[rg.id];
  let pts;
  if (st.dest === rg.id) pts = [a, ...st.via.map((ll) => proj(...ll))];
  else {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    pts = [a, [mx - (dy / L) * 0.15 * L, my + (dx / L) * 0.15 * L], b];
  }
  const d = smoothPath(pts);
  [routeGlow, routeCore, routeLine].forEach((p) => p.setAttribute('d', d));
  const Lw = routeCore.getTotalLength() * view.s + 6;
  [routeGlow, routeCore].forEach((p) => { p.style.strokeDasharray = `${Lw}`; p.animate([{ strokeDashoffset: Lw }, { strokeDashoffset: 0 }], { duration: 1000, easing: 'ease-out', fill: 'backwards' }); });
  routeLine.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1000, easing: 'ease-in' });
  pinAt = pts[pts.length - 1]; updatePin();
  pinG.querySelector('.pin-in').animate([{ transform: 'translateY(-18px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 380, delay: 800, fill: 'backwards', easing: 'cubic-bezier(.3,1.4,.5,1)' });
}
function clearRoute() { [routeGlow, routeCore, routeLine].forEach((p) => p.setAttribute('d', '')); pinAt = null; updatePin(); }
let pinAt = null;
function updatePin() {
  if (!pinAt) { pinG.setAttribute('opacity', 0); return; }
  const [x, y] = toScreen(pinAt);
  pinG.setAttribute('transform', `translate(${x} ${y})`); pinG.setAttribute('opacity', 1);
}

// ── 결과
function showResult() {
  const body = $('#resBody');
  const ok = station.id === ANSWER.station && region.id === ANSWER.region;
  if (ok) {
    body.innerHTML = `<div class="eyebrow">다음 목적지</div><h3 class="res-title ok">${RESULT_OK.title}</h3>
      <p class="res-route">${RESULT_OK.route}</p><p class="res-body">${RESULT_OK.body}</p>
      <p class="res-note">벽면의 그림은 클로드 모네의 〈생라자르역〉(1877)입니다.</p>
      <a class="btn" href="index.html">체험 완료</a>`;
  } else {
    const real = REGIONS.find((r) => r.id === station.dest);
    const right = STATIONS.find((s) => s.dest === region.id);
    let msg = `${station.ko}(${station.fr})은 1870년대 ${station.co}의 출발역으로, ${station.towns} 방면 열차가 떠났습니다. 이 역의 기차는 ${real.ko} 쪽으로 갔지요.`;
    if (station.dest !== region.id) msg += `\n${region.ko}행 기차는 ${right.ko}에서 출발했습니다.`;
    msg += '\n\n현장 단서를 다시 살펴보고, 출발역부터 다시 골라 보세요.';
    body.innerHTML = `<div class="eyebrow">${station.ko} → ${region.ko}</div><h3 class="res-title no">이 노선이 아니에요</h3>
      <p class="res-body">${msg}</p>
      <div class="btn-row"><button class="btn line" id="seeClues">현장 단서 보기</button><button class="btn" id="retry">다시 고르기</button></div>`;
    $('#retry').addEventListener('click', () => { resultSheet.close(); restart(); });
    $('#seeClues').addEventListener('click', () => { resultSheet.close(); restart(); setTimeout(() => clueSheet.open(), 300); });
  }
  resultSheet.open();
}
function restart() { station = null; region = null; pending = null; clearRoute(); setStage('station'); }

// 화면 좌표 → 역 / 지역
function stationAt(sx, sy) {
  let best = null, bd = 26;
  STATIONS.forEach((s) => {
    const [x, y] = toScreen(proj(...s.ll)); const d = Math.hypot(x - sx, y - sy);
    const lx = x + s.lab[0], ly = y + s.lab[1];     // 이름표를 눌러도 된다
    const dl = Math.hypot((lx + (s.lab[2] === 'end' ? -45 : s.lab[2] === 'start' ? 45 : 0)) - sx, (ly + 4) - sy) * 0.8;
    const m = Math.min(d, dl); if (m < bd) { bd = m; best = s.id; }
  });
  return best;
}
function regionAt(sx, sy) {
  const [wx, wy] = toWorld(sx, sy);
  const pt = svg.createSVGPoint(); pt.x = wx; pt.y = wy;
  for (const r of REGIONS) if (regionEls[r.id].isPointInFill(pt)) return r.id;
  return null;
}

// ── 입력: 팬·핀치 줌, 탭 선택
function bindInput() {
  const box = $('#mapBox');
  const pts = new Map();
  let pan = null, pinch = null, down = null;
  const local = (e) => { const r = box.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  box.addEventListener('pointerdown', (e) => {
    box.setPointerCapture(e.pointerId); tween++;
    const p = local(e); pts.set(e.pointerId, p);
    if (pts.size === 2) {
      pan = null;
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: view.s, w: toWorld((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) };
      return;
    }
    down = { p, moved: false };
    pan = { p, tx: view.tx, ty: view.ty };
  });
  box.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const p = local(e); pts.set(e.pointerId, p);
    if (down && Math.hypot(p[0] - down.p[0], p[1] - down.p[1]) > 6) down.moved = true;
    if (pinch && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const ns = clamp(pinch.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d, view.min, view.max);
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      view.s = ns; view.tx = mx - pinch.w[0] * ns; view.ty = my - pinch.w[1] * ns; applyView();
    } else if (pan) { view.tx = pan.tx + p[0] - pan.p[0]; view.ty = pan.ty + p[1] - pan.p[1]; applyView(); }
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return;
    const p = pts.get(e.pointerId); pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (down && !down.moved && e.type === 'pointerup') {
      const hit = stage === 'station' ? stationAt(p[0], p[1]) : regionAt(p[0], p[1]);
      if (hit) pick(hit);
    }
    if (!pts.size) { pan = null; down = null; }
  };
  box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
  box.addEventListener('wheel', (e) => {
    e.preventDefault(); tween++;
    const [mx, my] = local(e); const w = toWorld(mx, my);
    view.s = clamp(view.s * (1 - e.deltaY * 0.0015), view.min, view.max);
    view.tx = mx - w[0] * view.s; view.ty = my - w[1] * view.s; applyView();
  }, { passive: false });
}

flow.start();
