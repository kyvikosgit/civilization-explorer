// C-2 산업혁명 체험 부스 — Step1 현장 체험 안내(관람·단서 발견은 부스에서 직접) → Step2 앱 퀴즈 (파리에서 떠나는 다음 목적지 선택)
// 2026-10-15 피드백: 앱 내 단서 찾기 삭제 / 지역을 누르면 노선이 자동으로 이어지고 '이 지역을 선택하시겠습니까?' 확인 후 결과
// 지도 데이터: assets/data/map.json (Natural Earth 1:10m 해안선·국경 + IGN Admin Express 2018 지역 경계, 메르카토르 투영)
import { $, $$, ICON, createFlow, sheet, clamp } from './common.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};

// 선택지 (구성안 시안: 브르타뉴 · 노르망디 · 샹파뉴, 정답 노르망디 — Step2 단서 '노르망디 해안 도시', '파리 ▶ 노르망디')
const CHOICES = [
  { id: 'bretagne', ko: '브르타뉴', fr: 'Bretagne' },
  { id: 'normandie', ko: '노르망디', fr: 'NORMANDIE', correct: true },
  { id: 'champagne', ko: '샹파뉴', fr: 'Champagne' },
];
// 정답 결과 원고 — kippu-app missions.ts 'ticket'(4F · C-2 산업혁명) 확정 원고 재사용
const RESULT_OK = {
  title: '정답입니다',
  route: '파리(생라자르) → 노르망디',
  body: '철도는 산업혁명이 낳은 가장 극적인 변화였습니다. 파리지앵들은 이제 하루 만에 바닷가에 닿을 수 있게 되었죠.\n이 노선의 끝에는 모네가 나고 자란 르아브르, 그리고 인상파 화가들이 특히 사랑했던 에트르타가 있답니다.',
};

function compassSVG(c1, c2) {
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><g fill="none" stroke="${c2}" stroke-width="1.2"><circle r="30"/><circle r="34" stroke-dasharray="2 3"/></g>
    <g fill="${c1}"><path d="M0-46L6-6 0 0-6-6z"/><path d="M0 46L6 6 0 0-6 6z" opacity=".55"/><path d="M46 0L6 6 0 0 6-6z" opacity=".55"/><path d="M-46 0L-6 6 0 0-6-6z" opacity=".55"/></g>
    <g fill="${c2}"><path d="M24-24L4-2 0 0 2-4z"/><path d="M-24 24L-4 2 0 0-2 4z"/><path d="M24 24L2 4 0 0 4 2z"/><path d="M-24-24L-2-4 0 0-4-2z"/></g>
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
  onLeave(prev) { if (prev === 2) { resultSheet.close(); confirmSheet.close(); } },
});
$$('[data-next]').forEach((b) => b.addEventListener('click', () => flow.next()));

// ── 지도
let M = null;           // map.json
let svg, world, labels, routeG, routeGlow, routeCore, routeLine, pinG, regionEls = {};
let view = { s: 1, tx: 0, ty: 0 };
let selected = null, connected = false, connecting = null;

async function initMap() {
  if (M) { fitView(); return; }
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
  // 해안 물결선 (육지 윤곽을 굵게 여러 번)
  [[22, '#89a59c', 0.35], [13, '#9db6aa', 0.5], [6, '#b7c9b8', 0.7]].forEach(([w, c, o]) =>
    el('path', { d: M.land, fill: 'none', stroke: c, 'stroke-width': w, 'stroke-opacity': o, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }, world));
  el('path', { d: M.land, fill: '#E8D6AD', stroke: '#6b5235', 'stroke-width': 1.1, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }, world);
  // 목표 지역 채색
  const tint = { bretagne: '#D3B67E', normandie: '#B5C184', champagne: '#D8A975', idf: '#E6D2A6' };
  ['idf', 'bretagne', 'normandie', 'champagne'].forEach((k) => {
    const p = el('path', { d: M.regions[k], fill: tint[k], 'fill-opacity': 0.9, stroke: 'none', class: k === 'idf' ? '' : 'region', 'data-id': k }, world);
    regionEls[k] = p;
  });
  el('path', { d: M.regionBorders, fill: 'none', stroke: '#8a6d47', 'stroke-width': 0.9, 'stroke-dasharray': '2 3', 'stroke-opacity': 0.7, 'vector-effect': 'non-scaling-stroke' }, world);
  el('path', { d: M.borders, fill: 'none', stroke: '#6b5235', 'stroke-width': 1.3, 'stroke-dasharray': '6 3 1 3', 'stroke-opacity': 0.8, 'vector-effect': 'non-scaling-stroke' }, world);
  // 선택 지역 강조선
  CHOICES.forEach((c) => {
    regionEls[c.id + '_hl'] = el('path', { d: M.regions[c.id], fill: 'none', stroke: '#E0662C', 'stroke-width': 2.4, opacity: 0, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }, world);
  });
  routeG = el('g', {}, world);
  routeGlow = el('path', { fill: 'none', stroke: '#FF8A3D', 'stroke-width': 9, 'stroke-opacity': 0.45, 'stroke-linecap': 'round', filter: 'url(#glow)', 'vector-effect': 'non-scaling-stroke' }, routeG);
  routeCore = el('path', { fill: 'none', stroke: '#F06A28', 'stroke-width': 4.5, 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }, routeG);
  routeLine = el('path', { fill: 'none', stroke: '#FFF1DC', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-dasharray': '1 7', 'vector-effect': 'non-scaling-stroke' }, routeG);
  el('rect', { width: '100%', height: '100%', fill: 'url(#vig)', 'pointer-events': 'none' }, svg);
  labels = el('g', { 'pointer-events': 'none' }, svg);
  pinG = el('g', { 'pointer-events': 'none', opacity: 0 }, svg);
  pinG.innerHTML = `<g class="pin-in"><path d="M0 0C-3-9-12-14-12-24a12 12 0 0 1 24 0C12-14 3-9 0 0z" fill="#E0482A" stroke="#fff" stroke-width="2"/><circle cy="-24" r="4.5" fill="#fff"/></g>`;

  buildChips();
  bindInput();
  fitView();
  window.addEventListener('resize', fitView);
}

const proj = (lon, lat) => {
  const merc = (a) => (Math.log(Math.tan(Math.PI / 4 + (a * Math.PI) / 360)) * 180) / Math.PI;
  const P = M.projection;
  return [(lon - P.lon0) * P.k, (merc(P.lat1) - merc(lat)) * P.k];
};

function fitView() {
  const box = $('#mapBox').getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  const top = ($('.quiz-top').getBoundingClientRect().bottom || 200) + 8;
  const bottom = box.height - ($('.quiz-bottom').offsetHeight || 100) + 4;
  const b = ['bretagne', 'normandie', 'champagne'].map((k) => M.bounds[k]);
  const x0 = Math.min(...b.map((q) => q[0])), y0 = Math.min(...b.map((q) => q[1]));
  const x1 = Math.max(...b.map((q) => q[2])), y1 = Math.max(...b.map((q) => q[3]));
  const pad = 14;
  const s = Math.min((box.width - pad * 2) / (x1 - x0), (bottom - top - pad * 2) / (y1 - y0));
  view.s = s;
  view.tx = (box.width - (x1 - x0) * s) / 2 - x0 * s;
  view.ty = top + (bottom - top - (y1 - y0) * s) / 2 - y0 * s;
  view.min = s * 0.8; view.max = s * 4;
  applyView();
}

function toScreen([x, y]) { return [x * view.s + view.tx, y * view.s + view.ty]; }
function toWorld(sx, sy) { return [(sx - view.tx) / view.s, (sy - view.ty) / view.s]; }

function applyView() {
  world.setAttribute('transform', `translate(${view.tx} ${view.ty}) scale(${view.s})`);
  drawLabels();
  updatePin();
}

function drawLabels() {
  const L = [];
  const z = clamp(view.s / (view.min / 0.8), 1, 1.6);
  const add = (pt, fr, ko, opt = {}) => L.push({ pt, fr, ko, ...opt });
  add(proj(-2.4, 50.25), 'La Manche', '(영국 해협)', { sea: true });
  add([M.anchors.normandie[0] + 8, M.anchors.normandie[1] + 34], 'NORMANDIE', '노르망디', { big: true });
  add(M.anchors.bretagne, 'Bretagne', '브르타뉴');
  add([M.anchors.champagne[0] + 12, M.anchors.champagne[1] - 48], 'Champagne', '샹파뉴');
  add([M.anchors.idf[0] - 30, M.anchors.idf[1] + 62], 'Île-de-France', '일드프랑스', { small: true });
  let h = '';
  for (const l of L) {
    const [x, y] = toScreen(l.pt);
    const fs = (l.big ? 15 : l.small ? 11 : 13) * z;
    if (l.sea) {
      h += `<text class="lbl-sea" x="${x}" y="${y}" text-anchor="middle" font-size="${14 * z}">${l.fr}</text>`;
      h += `<text class="lbl-sea-ko" x="${x}" y="${y + 15 * z}" text-anchor="middle" font-size="${11 * z}">${l.ko}</text>`;
    } else {
      h += `<text class="lbl" x="${x}" y="${y}" text-anchor="middle" font-size="${fs}" font-weight="${l.big ? 800 : 600}" stroke-width="3">${l.fr}</text>`;
      h += `<text class="lbl-ko" x="${x}" y="${y + fs * 1.05}" text-anchor="middle" font-size="${fs * 0.82}" stroke-width="3">${l.ko}</text>`;
    }
  }
  // 파리
  const [px, py] = toScreen(M.paris);
  h += `<circle cx="${px}" cy="${py}" r="${connecting ? 13 : 10}" fill="#FF8A3D" opacity=".35"><animate attributeName="r" values="9;15;9" dur="1.8s" repeatCount="indefinite"/></circle>`;
  h += `<circle cx="${px}" cy="${py}" r="6.5" fill="#1E140C" stroke="#FF9A55" stroke-width="2.5"/>`;
  h += `<text class="lbl" x="${px + 12}" y="${py + 5}" font-size="${16 * z}" font-weight="800" stroke-width="3">PARIS</text>`;
  h += `<text class="lbl-ko" x="${px + 12}" y="${py + 5 + 15 * z}" font-size="${12 * z}" stroke-width="3">파리</text>`;
  // 나침반 (대서양 쪽)
  const [cx, cy] = toScreen(proj(-4.2, 46.3));
  h += `<g transform="translate(${cx} ${cy}) scale(${0.55 * z})" opacity=".85">${compassSVG('#F3E7CB', '#F3E7CB').replace(/<\/?svg[^>]*>/g, '')}</g>`;
  labels.innerHTML = h;
}

// ── 노선
function curve(a, b) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const bend = 0.18 * len;
  const c = [mx - (dy / len) * bend, my + (dx / len) * bend];
  return `M${a[0]},${a[1]} Q${c[0]},${c[1]} ${b[0]},${b[1]}`;
}
function setRoute(to, animate = false) {
  const paths = [routeGlow, routeCore, routeLine];
  if (!to) { paths.forEach((p) => p.setAttribute('d', '')); return; }
  const d = curve(M.paris, to);
  paths.forEach((p) => p.setAttribute('d', d));
  if (animate) {
    // 비스케일 선이라 길이는 화면 기준으로 계산
    const L = routeCore.getTotalLength() * view.s + 4;
    [routeGlow, routeCore].forEach((p) => { p.style.strokeDasharray = `${L}`; p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 800, easing: 'ease-out', fill: 'backwards' }); });
    routeLine.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 800, easing: 'ease-in' });
  } else [routeGlow, routeCore].forEach((p) => (p.style.strokeDasharray = ''));
}
let pinAt = null;
function updatePin() {
  if (!pinAt) { pinG.setAttribute('opacity', 0); return; }
  const [x, y] = toScreen(pinAt);
  pinG.setAttribute('transform', `translate(${x} ${y})`);
  pinG.setAttribute('opacity', 1);
}

// ── 선택지
function regionThumb(id) {
  const b = M.bounds[id]; const w = b[2] - b[0], h = b[3] - b[1]; const m = Math.max(w, h) * 0.12;
  return `<svg viewBox="${b[0] - m} ${b[1] - m} ${w + 2 * m} ${h + 2 * m}" aria-hidden="true"><path d="${M.regions[id]}" fill="#7A5A2E"/></svg>`;
}
function buildChips() {
  const box = $('#chips');
  box.innerHTML = CHOICES.map((c) => `<button class="chip" role="radio" aria-checked="false" data-id="${c.id}"><span class="thumb">${regionThumb(c.id)}</span><span>${c.ko}</span><span class="ck">${ICON.check}</span></button>`).join('');
  $$('.chip', box).forEach((b) => b.addEventListener('click', () => select(b.dataset.id)));
  $('#cfOk').addEventListener('click', () => { confirmSheet.close(); if (selected) setTimeout(() => showResult(selected), 260); });
  $('#cfRetry').addEventListener('click', () => { confirmSheet.close(); reset(); });
}
// 지역(칩·지도)을 누르면 파리에서 그 지역까지 노선이 자동으로 이어지고, 끝나면 확인 팝업
let selectRun = 0;
async function select(id) {
  if (resultSheet.isOpen || confirmSheet.isOpen) return;
  const run = ++selectRun;
  connected = false;
  selected = id;
  const c = CHOICES.find((q) => q.id === id);
  $$('.chip').forEach((b) => { const on = b.dataset.id === id; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
  CHOICES.forEach((q) => regionEls[q.id + '_hl'].setAttribute('opacity', q.id === id ? 1 : 0));
  CHOICES.forEach((q) => regionEls[q.id].setAttribute('fill-opacity', q.id === id ? 1 : 0.9));
  const b2 = $('#banner2');
  b2.hidden = false;
  b2.textContent = `지도를 탐색하여 화면에서 ${c.ko}로 가는 노선을 연결해 주세요.`;
  pinAt = null; updatePin(); setRoute(null);
  await new Promise((r) => setTimeout(r, 60));
  if (run !== selectRun) return;
  connected = true;
  const to = M.anchors[id];
  setRoute(to, true);
  pinAt = to; updatePin();
  pinG.querySelector('.pin-in').animate([{ transform: 'translateY(-18px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 380, delay: 500, fill: 'backwards', easing: 'cubic-bezier(.3,1.4,.5,1)' });
  await new Promise((r) => setTimeout(r, 1300));
  if (run !== selectRun || selected !== id) return;
  $('#cfRegion').textContent = c.ko;
  confirmSheet.open();
}

function showResult(id) {
  const c = CHOICES.find((q) => q.id === id);
  const body = $('#resBody');
  if (c.correct) {
    body.innerHTML = `<div class="eyebrow">다음 목적지</div><h3 class="res-title ok">${RESULT_OK.title}</h3>
      <p class="res-route">${RESULT_OK.route}</p><p class="res-body">${RESULT_OK.body}</p>
      <a class="btn" href="index.html">체험 완료</a>`;
  } else {
    body.innerHTML = `<div class="eyebrow">다음 목적지 · ${c.ko}</div><h3 class="res-title no">정답이 아니에요</h3>
      <p class="res-body"><span class="placeholder">오답 문구 미정</span></p>
      <button class="btn" id="retry">다시 선택</button>`;
    $('#retry').addEventListener('click', () => { resultSheet.close(); reset(); });
  }
  resultSheet.open();
}
function reset() {
  connected = false; selected = null; pinAt = null; updatePin(); setRoute(null);
  $$('.chip').forEach((b) => { b.classList.remove('on'); b.setAttribute('aria-checked', 'false'); });
  CHOICES.forEach((q) => regionEls[q.id + '_hl'].setAttribute('opacity', 0));
  $('#banner2').hidden = true;
}

// 화면 좌표가 어느 목표 지역 안에 있는지
function regionAt(sx, sy) {
  const [wx, wy] = toWorld(sx, sy);
  const pt = svg.createSVGPoint(); pt.x = wx; pt.y = wy;
  for (const c of CHOICES) if (regionEls[c.id].isPointInFill(pt)) return c.id;
  return null;
}

// ── 입력: 팬·핀치 줌, 지역 탭 선택
function bindInput() {
  const box = $('#mapBox');
  const pts = new Map();
  let pan = null, pinch = null, down = null;
  const local = (e) => { const r = box.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  box.addEventListener('pointerdown', (e) => {
    box.setPointerCapture(e.pointerId);
    const p = local(e); pts.set(e.pointerId, p);
    if (pts.size === 2) {
      connecting = null; pan = null;
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: view.s, w: toWorld((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) };
      return;
    }
    down = { p, t: performance.now(), moved: false };
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
    } else if (pan) {
      view.tx = pan.tx + p[0] - pan.p[0]; view.ty = pan.ty + p[1] - pan.p[1]; applyView();
    }
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return;
    const p = pts.get(e.pointerId); pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (down && !down.moved && e.type === 'pointerup') {
      const hit = regionAt(p[0], p[1]);
      if (hit) select(hit);
    }
    if (!pts.size) { pan = null; down = null; }
  };
  box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
  box.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [mx, my] = local(e); const w = toWorld(mx, my);
    view.s = clamp(view.s * (1 - e.deltaY * 0.0015), view.min, view.max);
    view.tx = mx - w[0] * view.s; view.ty = my - w[1] * view.s; applyView();
  }, { passive: false });
}

flow.start();
