// C4 나다르 사진관 — 질문이 주인공인 한 화면
//   위: "사람을 남긴다면, 그림입니까 사진입니까?"
//   아래 두 벽: 왼쪽은 24명의 초상화를 살롱식으로 빽빽이(크기 · 모양 제각각, 초당 10px 위로, 먼 층은 더 느리게),
//              오른쪽은 같은 사람들의 명함판 사진 앨범(가죽 페이지에 2×2 창, 초당 9px 아래로).
//   약 4초마다 두 벽에 함께 보이는 한 사람의 두 액자가 빛나고, 금선 두 줄이 가운데 이름표 "이름 · 그림 연도 / 사진 연도"로 이어진다.
//   액자를 누르면 그 사람의 그림 | 사진을 나란히 크게(두 손가락으로 두 장의 같은 자리를 함께 확대).
//   반쪽(아래 단추)을 고르면 그쪽이 화면을 채우고 → 오늘의 관람객 → 그때는 이랬다 → 카드 저장("나는 ○○으로 남긴다", 고른 쪽 24명).
//   (+) 내 초상(선택): 전면 카메라 → 노출 4초 → 부스 프로토타입의 19세기 사진 파이프라인(booth/js/nadar.js) 재사용
// 인물 · 출처: js/c4-people.json(위키미디어 공용 파일 페이지 · 라이선스) · 얼굴 틀: img/c4p/build.py
// 움직임은 transform · opacity 만. 화면 밖 · 탭 숨김 · 시트가 열리면 멈춘다. 서버 없음, 업로드 없음.
import { loadImage, startCamera, stopCamera, cameraErrorText, toast } from '../../../booth/js/common.js';
import { saveChoice } from './js/proto-common.js';
import { createCrowd, dotsFor, split, packRect, scatter, targetsFor, stampLine } from './js/crowd.js';
import * as N from '../../../booth/js/nadar.js';

const $ = (s) => document.querySelector(s);
const $$ = (q) => Array.from(document.querySelectorAll(q));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stage = $('#ask'), halves = $('#halves');
const thumb = (id, k) => `img/c4p/${id}-${k}.jpg`;
const large = (id, k) => `img/c4p/lg/${id}-${k}.jpg`;
// 앨범 창 아래 금 글씨 — 기록에 있는 스튜디오만
const STUDIO = { '나다르': 'Nadar', '에티엔 카르자': 'Ét. Carjat', '피에르 프티': 'Pierre Petit', '헤르만 비오브': 'H. Biow', 'A. 그레이너': 'A. Greiner' };

// ── 탭
$$('.tab').forEach((t) => t.addEventListener('click', () => {
  $$('.tab').forEach((x) => { const on = x === t; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
  $$('.screen').forEach((s) => { s.hidden = s.dataset.screen !== t.dataset.tab; });
  if (t.dataset.tab !== 'me') stopCamera($('#cam'));
  syncFlow();
  window.scrollTo(0, 0);
}));

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(a, rnd) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const yr = (e) => e.year || '';
const yearsLine = (p) => (p.paint.year && p.photo.year ? `${p.paint.year} / ${p.photo.year}` : p.paint.year ? `그림 ${p.paint.year}` : p.photo.year ? `사진 ${p.photo.year}` : '');

let PEOPLE = [], BYID = {};
// ── 왼쪽: 살롱식 걸기. 큰 것 하나 / 작은 것 둘(높이 엇갈리게)을 섞어 한 줄기 높이 H. 두 벌을 H 간격으로 이어 끊김 없이
function salon(order, W, seed) {
  const rnd = rng(seed), items = [];
  let y = 18, i = 0;
  const hOf = (w) => { const m = Math.max(5, Math.round(w * 0.065)); return { h: Math.round((w - 2 * m) * 1.25 + 2 * m), m }; };
  while (i < order.length) {
    if (order.length - i === 1 || rnd() < 0.36) {
      const w = Math.round(W * (0.62 + rnd() * 0.14)), g = hOf(w), x = Math.round((W - w) / 2 + (rnd() - 0.5) * W * 0.14);
      items.push({ id: order[i++], x, y, w, ...g }); y += g.h + 18 + Math.round(rnd() * 8);
    } else {
      const w1 = Math.round(W * (0.39 + rnd() * 0.07)), w2 = Math.round(W * (0.39 + rnd() * 0.07));
      const g1 = hOf(w1), g2 = hOf(w2), y1 = y + Math.round(rnd() * 12), y2 = y + 10 + Math.round(rnd() * 22);
      items.push({ id: order[i++], x: Math.round(W * 0.05), y: y1, w: w1, ...g1 });
      items.push({ id: order[i++], x: Math.round(W * 0.95 - w2), y: y2, w: w2, ...g2 });
      y = Math.max(y1 + g1.h, y2 + g2.h) + 16 + Math.round(rnd() * 8);
    }
  }
  items.forEach((it) => { it.shape = rnd() < 0.3 ? 'ov' : rnd() < 0.22 ? 'wood' : ''; });
  return { items, H: y };
}
function paintHTML(it, dy) {
  const p = BYID[it.id];
  return `<button class="fr pf ${it.shape}" type="button" data-id="${p.id}" style="left:${it.x}px;top:${it.y + dy}px;width:${it.w}px;height:${it.h}px;--m:${it.m}px" aria-label="${p.name} · 그림"><i class="glw"></i><span class="body"><span class="win"><img src="${thumb(p.id, 'paint')}" alt="" draggable="false" decoding="async"></span></span></button>`;
}
// ── 오른쪽: 앨범. 페이지마다 2×2 창(같은 크기 · 같은 줄), 페이지 사이 틈. 창 모양은 아치가 기본, 가끔 타원 · 네모
function album(order, W, seed) {
  const rnd = rng(seed), pad = 16, gx = 14, cw = Math.floor((W - 12 - 2 * pad - gx) / 2), wh = Math.round(cw * 1.25), sh = 16, gy = 14;
  const ph = pad + 2 * (wh + sh) + gy + pad - 4, gap = 16, pages = [], items = [];
  let y = 14;
  for (let i = 0; i < order.length; i += 4) {
    pages.push({ y, h: ph });
    for (let j = 0; j < 4 && i + j < order.length; j++) {
      const r = Math.floor(j / 2), c = j % 2, s = rnd();
      items.push({ id: order[i + j], x: 6 + pad + c * (cw + gx), y: y + pad + r * (wh + sh + gy), w: cw, h: wh + sh, shape: s < 0.18 ? 'ov' : s < 0.3 ? 'sq' : '' });
    }
    y += ph + gap;
  }
  return { items, pages, H: y };
}
function photoHTML(it, dy) {
  const p = BYID[it.id], st = STUDIO[p.photo.by] || '';
  return `<button class="fr cd ${it.shape}" type="button" data-id="${p.id}" style="left:${it.x}px;top:${it.y + dy}px;width:${it.w}px;height:${it.h}px" aria-label="${p.name} · 사진"><i class="glw"></i><span class="body"><span class="win"><img src="${thumb(p.id, 'photo')}" alt="" draggable="false" decoding="async"></span>${st ? `<span class="stamp">${st}</span>` : ''}</span></button>`;
}
function ghosts(W, Hf, seed) {
  const rnd = rng(seed), out = [];
  for (let y = 30; y < Hf - 40;) { const w = Math.round(W * (0.2 + rnd() * 0.14)), h = Math.round(w * 1.25); out.push({ x: Math.round(rnd() * (W - w)), y, w, h }); y += h + 50 + Math.round(rnd() * 90); }
  const one = (dy) => out.map((g) => `<i class="ghost" style="left:${g.x}px;top:${g.y + dy}px;width:${g.w}px;height:${g.h}px"></i>`).join('');
  return one(0) + one(Hf);
}

// ── 흐름(WAAPI): 그림은 위로 초당 10px, 사진은 아래로 초당 9px. 그림의 먼 층은 같은 주기에 더 짧은 길이 → 초당 약 6px(깊이). 시작은 천천히 붙는다
let flows = [], sideAnims = { paint: [], photo: [] }, onScreen = true, sheetOpen = false;
function build() {
  const W = Math.round($('#sidePaint').getBoundingClientRect().width);
  const order = shuffle(PEOPLE.map((p) => p.id), rng(11));
  flows.forEach((a) => a.cancel()); flows = []; sideAnims = { paint: [], photo: [] };
  // 그림
  const S = salon(order, W, 3), near = $('#hangPaint'), far = $('#farPaint');
  near.style.height = `${S.H * 2}px`; near.innerHTML = S.items.map((it) => paintHTML(it, 0)).join('') + S.items.map((it) => paintHTML(it, S.H)).join('');
  const Hf = Math.round(S.H * 0.6); far.style.height = `${Hf * 2}px`; far.innerHTML = ghosts(W, Hf, 5);
  // 사진 — 그림 벽의 거꾸로 순서: 서로 반대로 흐르니 같은 사람이 주기적으로 엇갈리며 두 벽에 함께 보인다
  // 움직임 줄이기(정지 격자)에서는 같은 순서로 — 두 벽 위쪽에 같은 사람들이 함께 보여야 빛남이 생긴다
  const A = album(REDUCED ? order : order.slice().reverse(), W, 7), hang = $('#hangPhoto');
  hang.style.height = `${A.H * 2}px`;
  const pg = (dy) => A.pages.map((g) => `<div class="pg" style="top:${g.y + dy}px;height:${g.h}px"></div>`).join('');
  hang.innerHTML = pg(0) + pg(A.H) + A.items.map((it) => photoHTML(it, 0)).join('') + A.items.map((it) => photoHTML(it, A.H)).join('');
  if (REDUCED) { syncFlow(); return; }
  const up = (h) => [{ transform: 'translateY(0)' }, { transform: `translateY(${-h}px)` }], down = (h) => [{ transform: `translateY(${-h}px)` }, { transform: 'translateY(0)' }];
  const dP = (S.H / 10) * 1000, dA = (A.H / 9) * 1000;
  const a1 = near.animate(up(S.H), { duration: dP, iterations: Infinity }), a2 = far.animate(up(Hf), { duration: dP, iterations: Infinity }), a3 = hang.animate(down(A.H), { duration: dA, iterations: Infinity });
  a1.currentTime = a2.currentTime = dP * 0.1; a3.currentTime = dA * 0.42;
  flows = [a1, a2, a3]; sideAnims = { paint: [a1, a2], photo: [a3] };
  rampUp(); syncFlow();
}
let pickRate = 1, ramp = 1;
function rampUp() {
  const t0 = performance.now();
  const step = (now) => { const t = Math.min(1, (now - t0) / 1800); ramp = t * t * (3 - 2 * t); rate(); if (t < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function rate() { flows.forEach((a) => { const mine = stance && sideAnims[stance].includes(a); const r = Math.max(0.0001, ramp * (mine ? pickRate : 1)); a.updatePlaybackRate ? a.updatePlaybackRate(r) : (a.playbackRate = r); }); }
function running() { return onScreen && !sheetOpen && !stage.hidden && document.visibilityState === 'visible'; }
function syncFlow() {
  const run = running();
  flows.forEach((a) => { if (run && a.playState !== 'running') a.play(); else if (!run && a.playState === 'running') a.pause(); });
  if (run && !stance) startGlow(); else stopGlow();
}
if ('IntersectionObserver' in window) new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; syncFlow(); }).observe(halves);
document.addEventListener('visibilitychange', syncFlow);

// ── 같은 사람: 두 벽에 모두 온전히 보이는(아래 단추에 걸리지 않는) 사람 하나 → 두 액자 빛남 + 금선 두 줄 + 가운데 이름표
let glowT = 0, glowOff = 0, wireRaf = 0, shown = [];
function zone() { const r = halves.getBoundingClientRect(), f = $('.side-foot .pick').getBoundingClientRect(); return { top: r.top + 8, bottom: f.top - 10, r }; }
function inZone(el, z) { const b = el.getBoundingClientRect(); return b.top >= z.top && b.bottom <= z.bottom ? b : null; }
function placeWires(pa, pb) {
  const r = halves.getBoundingClientRect(), s = $('#same').getBoundingClientRect();
  const a = pa.getBoundingClientRect(), b = pb.getBoundingClientRect();
  const line = (el, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; el.style.width = `${Math.max(0, Math.hypot(dx, dy)).toFixed(1)}px`; el.style.transform = `translate(${(x1 - r.left).toFixed(1)}px, ${(y1 - r.top).toFixed(1)}px) rotate(${Math.atan2(dy, dx)}rad)`; };
  line($('#wireA'), a.right - 2, a.top + a.height / 2, s.left, s.top + s.height / 2);
  line($('#wireB'), b.left + 2, b.top + b.height / 2, s.right, s.top + s.height / 2);
  // 오른쪽 선은 사진 → 이름표 방향이라 그라데이션을 뒤집는다
  $('#wireB').style.transformOrigin = '0 50%';
}
function glowOnce() {
  const z = zone();
  const vis = (q) => { const m = new Map(); $$(`${q} .fr`).forEach((f) => { const b = inZone(f, z); if (b && !m.has(f.dataset.id)) m.set(f.dataset.id, { f, b }); }); return m; };
  const a = vis('#hangPaint'), b = vis('#hangPhoto');
  const both = [...a.keys()].filter((id) => b.has(id));
  if (!both.length) return false;
  both.sort((x, y) => shown.indexOf(x) - shown.indexOf(y));
  const id = both[0], pa = a.get(id), pb = b.get(id), p = BYID[id];
  shown = shown.filter((x) => x !== id).concat(id);
  [pa.f, pb.f].forEach((f) => { f.classList.remove('lit'); void f.offsetWidth; f.classList.add('lit'); setTimeout(() => f.classList.remove('lit'), 3200); });
  const y = ((pa.b.top + pa.b.bottom) / 2 + (pb.b.top + pb.b.bottom) / 2) / 2 - z.r.top;
  const same = $('#same');
  $('#sameName').textContent = p.name; $('#sameYears').textContent = yearsLine(p); $('#sameYears').hidden = !yearsLine(p);
  same.style.setProperty('--y', `${Math.max(46, Math.min(z.bottom - z.r.top - 40, y)).toFixed(0)}px`);
  same.classList.add('on'); halves.classList.add('glowing');
  cancelAnimationFrame(wireRaf);
  const follow = () => { placeWires(pa.f, pb.f); wireRaf = requestAnimationFrame(follow); };
  requestAnimationFrame(() => { follow(); $('#wireA').classList.add('on'); $('#wireB').classList.add('on'); });
  clearTimeout(glowOff); glowOff = setTimeout(endGlow, 2900);
  return true;
}
function endGlow() { $('#same').classList.remove('on'); halves.classList.remove('glowing'); $$('.wire').forEach((w) => w.classList.remove('on')); setTimeout(() => cancelAnimationFrame(wireRaf), 700); }
function startGlow() { if (glowT) return; glowT = setTimeout(function tick() { glowT = setTimeout(tick, glowOnce() ? 4200 : 600); }, 1400); }
function stopGlow() { clearTimeout(glowT); glowT = 0; }

// ── 나란히 크게: 그림 | 사진. 큰 판은 이때 받는다. 두 손가락으로 벌리면 두 장의 같은 자리가 함께 커지고, 한 손가락으로 옮기고, 두 번 누르면 원래대로
const sheet = $('#pairSheet'), dim = $('#pairDim'), pair = $('#psPair');
const cap = (lab, e) => `<i>${lab}</i><b>${e.by || '<span class="un">작자 미상</span>'}${e.year ? ` · ${e.year}` : ''}</b>${e.where ? `<span>${e.where}</span>` : ''}`;
function openPair(id) {
  const p = BYID[id];
  $('#psName').textContent = p.name;
  ['paint', 'photo'].forEach((k) => {
    const img = $(k === 'paint' ? '#psPaint' : '#psPhoto');
    img.src = thumb(id, k); img.alt = `${p.name} · ${k === 'paint' ? '그림' : '사진'}`;
    const im = new Image(); im.onload = () => { if ($('#psName').textContent === p.name) img.src = im.src; }; im.src = large(id, k);
  });
  $('#psPaintCap').innerHTML = cap('그림', p.paint); $('#psPhotoCap').innerHTML = cap('사진', p.photo);
  setZoom(1, 0, 0);
  sheet.classList.add('open'); dim.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
  sheetOpen = true; syncFlow();
}
function closePair() { sheet.classList.remove('open'); dim.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); sheetOpen = false; syncFlow(); }
$('#psClose').addEventListener('click', closePair); dim.addEventListener('click', closePair);
let Z = { s: 1, tx: 0, ty: 0 };
const winBox = () => $('#psPaint').parentElement.getBoundingClientRect();
function setZoom(s, tx, ty) {
  const w = winBox(); s = Math.max(1, Math.min(4, s));
  tx = Math.min(0, Math.max(w.width * (1 - s), tx)); ty = Math.min(0, Math.max(w.height * (1 - s), ty));
  Z = { s, tx, ty };
  const t = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(3)})`;
  $('#psPaint').style.transform = t; $('#psPhoto').style.transform = t;
}
// 손가락 자리를 "그 손가락이 놓인 창" 기준 좌표로 바꾼다 → 두 창에 같은 변환
function local(x, y) {
  const a = $('#psPaint').parentElement.getBoundingClientRect(), b = $('#psPhoto').parentElement.getBoundingClientRect();
  const r = x < (a.right + b.left) / 2 ? a : b; return { x: x - r.left, y: y - r.top };
}
const pts = new Map(); let g0 = null, lastTap = 0;
function gesture() { const a = [...pts.values()].map((p) => local(p.x, p.y)); const c = { x: a.reduce((s, p) => s + p.x, 0) / a.length, y: a.reduce((s, p) => s + p.y, 0) / a.length };
  const raw = [...pts.values()]; c.d = raw.length > 1 ? Math.hypot(raw[0].x - raw[1].x, raw[0].y - raw[1].y) : 0; return c; }
function begin() { if (!pts.size) { g0 = null; return; } const c = gesture(); g0 = { ...c, s: Z.s, u: (c.x - Z.tx) / Z.s, v: (c.y - Z.ty) / Z.s }; }
pair.addEventListener('pointerdown', (e) => {
  try { pair.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); begin();
  if (pts.size === 1) { const now = performance.now(); if (now - lastTap < 300) { setZoom(1, 0, 0); begin(); } lastTap = now; }
});
pair.addEventListener('pointermove', (e) => {
  if (!pts.has(e.pointerId) || !g0) return;
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const c = gesture(), s = pts.size > 1 && g0.d ? g0.s * (c.d / g0.d) : g0.s;
  if (pts.size === 1 && g0.s <= 1) return;
  setZoom(s, c.x - g0.u * s, c.y - g0.v * s);
});
['pointerup', 'pointercancel'].forEach((t) => pair.addEventListener(t, (e) => { pts.delete(e.pointerId); begin(); }));

// ── 고르기
const STANCES = { paint: { label: '그림', full: '그림으로', pct: 44 }, photo: { label: '사진', full: '사진으로', pct: 56 } };   // 예시 수치
const VISITORS = '1,712';
let stance = null;
function pick(k) {
  stance = k;
  if (k) stage.dataset.pick = k; else delete stage.dataset.pick;
  $('#reveal').classList.remove('on');
  pickRate = k ? 2.6 : 1; rate();
  endGlow(); $$('.fr.lit').forEach((f) => f.classList.remove('lit'));
  syncFlow();
  if (!k) return;
  $('#mineHead').textContent = `${STANCES[k].full} 남긴다.`;
  $('#mineSubHead').textContent = k === 'paint' ? '화가가 보고 그린 대로' : '렌즈 앞에 앉은 그대로';
  if (navigator.vibrate) navigator.vibrate(10);
  setTimeout(reveal, REDUCED ? 0 : 700);
}
$$('.pick').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); if (!stance) pick(b.dataset.k); }));
halves.addEventListener('click', (e) => {
  if (stance) return;
  const f = e.target.closest('.fr'); if (f) return openPair(f.dataset.id);
  const s = e.target.closest('.side'); if (s) pick(s.dataset.k);
});

// ── 오늘의 관람객: 점(하나 = 열 사람)이 흩어졌다가 그림 · 사진 두 기둥 아래로 모인다. 내 점은 주황, 맨 마지막
const KEYS = ['paint', 'photo'];
let crowd = null, lastCard = null;
function reveal() {
  if (!stance) return;
  const rv = $('#reveal'); rv.classList.add('on'); $('#rvScroll').scrollTop = 0;
  $('#crowdCols').innerHTML = KEYS.map((k) => { const s = STANCES[k], me = k === stance; return `<div class="crowd-col${me ? ' me' : ''}"><b class="n">${s.pct}<i>%</i></b><span class="lab">${s.label}${me ? ' · 나' : ''}</span></div>`; }).join('');
  $('#crowdStamp').textContent = stampLine(VISITORS);
  $('#mineCard').hidden = true; lastCard = null;
  const sv = $('#saveStance'); sv.disabled = false; sv.classList.remove('done'); $('#saveLab').textContent = '카드 저장';
  const cs = $('#crowdStage'), n = dotsFor(VISITORS);
  if (!crowd) crowd = createCrowd($('#crowdCv'), { theme: 'dark', n, reduceMotion: REDUCED, seed: 5 });
  requestAnimationFrame(() => {
    crowd.resize();
    const sr = cs.getBoundingClientRect(), w = sr.width / 2;
    const rects = KEYS.map((k, i) => ({ x: i * w + 10, y: 8, w: w - 20, h: sr.height - 14 }));
    const counts = split(n, KEYS.map((k) => STANCES[k].pct));
    const groups = KEYS.map((k, i) => ({ pts: packRect(counts[i], rects[i], crowd.rnd) }));
    crowd.place(scatter(n, { x: 0, y: 0, w: sr.width, h: sr.height }, crowd.rnd));
    setTimeout(() => crowd.move(targetsFor(crowd, groups, KEYS.indexOf(stance)), { duration: 1250, stagger: 380 }), REDUCED ? 0 : 520);
  });
}
$('#again').addEventListener('click', () => pick(null));

// ── 카드: 고른 쪽 24명(그림은 금테, 사진은 금선 아치 창) + "나는 ○○으로 남긴다"
const loadImg = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
function arch(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + r); g.ellipse(x + w / 2, y + r, w / 2, r, 0, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); }
async function card(k) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bg = g.createRadialGradient(W / 2, H * 0.48, 80, W / 2, H * 0.48, H * 0.8); bg.addColorStop(0, k === 'paint' ? '#3A2A20' : '#2E241B'); bg.addColorStop(1, '#0F0E0D');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.textAlign = 'center';
  g.fillStyle = '#FFFFFF'; g.font = '800 72px Paperlogy, Freesentation, sans-serif'; g.fillText(`나는 ${STANCES[k].full} 남긴다`, W / 2, 176);
  const cols = 6, rows = 4, gap = 18, cw = 142, ch = Math.round(cw * 1.25), x0 = (W - cols * cw - (cols - 1) * gap) / 2, y0 = 262;
  const ims = await Promise.all(PEOPLE.map((p) => loadImg(thumb(p.id, k))));
  PEOPLE.slice(0, cols * rows).forEach((p, i) => {
    const x = x0 + (i % cols) * (cw + gap), y = y0 + Math.floor(i / cols) * (ch + gap + 26);
    g.save();
    if (k === 'paint') {
      const gr = g.createLinearGradient(x, y, x + cw, y + ch); gr.addColorStop(0, '#C9A24E'); gr.addColorStop(0.4, '#E2C26A'); gr.addColorStop(0.7, '#8A6526'); gr.addColorStop(1, '#D7B45A');
      g.fillStyle = gr; g.fillRect(x - 7, y - 7, cw + 14, ch + 14); g.fillStyle = '#120E0B'; g.fillRect(x, y, cw, ch);
      if (ims[i]) g.drawImage(ims[i], x, y, cw, ch);
    } else {
      arch(g, x, y, cw, ch, cw * 0.5 * 0.62); g.save(); g.clip(); if (ims[i]) g.drawImage(ims[i], x, y, cw, ch); g.restore();
      arch(g, x, y, cw, ch, cw * 0.5 * 0.62); g.strokeStyle = '#D9B86A'; g.lineWidth = 3; g.stroke();
    }
    g.restore();
    g.fillStyle = 'rgba(255,255,255,.72)'; let fs = 19; g.font = `500 ${fs}px Freesentation, sans-serif`;
    while (fs > 12 && g.measureText(p.name).width > cw + gap - 6) { fs -= 1; g.font = `500 ${fs}px Freesentation, sans-serif`; }
    g.fillText(p.name, x + cw / 2, y + ch + 30);
  });
  g.fillStyle = 'rgba(255,255,255,.5)'; g.font = 'italic 400 26px Georgia, "Times New Roman", serif';
  g.fillText('Nadar · 35, boulevard des Capucines', W / 2, H - 92);
  return c;
}
async function shareCanvas(cv, name) {
  const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.9));
  if (!blob) return false;
  const file = new File([blob], name, { type: 'image/jpeg' });
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return true; } catch (e) { if (e && e.name === 'AbortError') return true; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return true;
}
$('#saveStance').addEventListener('click', async () => {
  if (!stance) return;
  const s = STANCES[stance], sv = $('#saveStance');
  sv.disabled = true;
  saveChoice('c4', { stance, label: s.label, pct: s.pct });
  try {
    lastCard = await card(stance);
    $('#mineImg').src = lastCard.toDataURL('image/jpeg', 0.7); $('#mineLabel').textContent = '카드 한 장'; $('#mineCard').hidden = false;
    await shareCanvas(lastCard, `nadar_나는${s.full}.jpg`);
  } catch (e) { console.warn('[c4] card', e); toast('입장을 저장했습니다'); }
  sv.disabled = false; sv.classList.add('done'); $('#saveLab').textContent = '다시 받기';
});

// ── 시작: 인물 목록 → 작은 판 48장을 받은 뒤 건다(벽은 다 받으면 천천히 나타난다)
(async () => {
  const data = await fetch('js/c4-people.json').then((r) => r.json());
  PEOPLE = data.people; PEOPLE.forEach((p) => { BYID[p.id] = p; });
  await Promise.all(PEOPLE.flatMap((p) => ['paint', 'photo'].map((k) => loadImg(thumb(p.id, k)))));
  build();
  requestAnimationFrame(() => stage.classList.add('ready'));
  let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (!stance) build(); }, 200); });
})();

// ── 내 초상
const video = $('#cam'), plate = $('#plate'), result = $('#photoOut'), still = $('#still');
let source = null;   // 'cam' | 'demo'
const DEMO = '../../../booth/assets/concept/c4_demo_portrait.jpg';
function meState(s) {
  $('#meActions').hidden = s !== 'idle';
  $('#meShoot').hidden = s !== 'ready';
  $('#meDone').hidden = s !== 'done';
  plate.classList.toggle('done', s === 'done');
}
async function camOn() {
  try {
    await startCamera(video, 'user');
    $('#camOff').hidden = true; still.hidden = true; result.hidden = true; video.hidden = false;
    source = 'cam'; meState('ready');
  } catch (e) {
    $('#camMsg').textContent = `${cameraErrorText(e)} 아래 ‘데모 이미지로’를 눌러 이어갈 수 있습니다.`;
  }
}
async function demoOn() {
  stopCamera(video);
  still.src = DEMO; still.hidden = false; video.hidden = true; result.hidden = true; $('#camOff').hidden = true;
  source = 'demo'; meState('ready');
}
$('#camStart').addEventListener('click', camOn);
$('#camDemo').addEventListener('click', demoOn);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function grab() {
  // 지금 비치는 장면 한 장 (카메라는 거울상이므로 좌우를 되돌린다)
  const c = document.createElement('canvas');
  if (source === 'cam') {
    c.width = video.videoWidth || 720; c.height = video.videoHeight || 960;
    const g = c.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(video, 0, 0);
  } else {
    c.width = still.naturalWidth; c.height = still.naturalHeight; c.getContext('2d').drawImage(still, 0, 0);
  }
  return c;
}
function runWorker(comp, ms = 9000) {
  const w = comp.width, h = comp.height;
  const data = comp.getContext('2d').getImageData(0, 0, w, h);
  const wk = new Worker('../../../booth/js/filters-worker.js');
  return new Promise((res, rej) => {
    const t = setTimeout(() => { wk.terminate(); rej(new Error('worker_timeout')); }, ms);
    wk.onmessage = (e) => { clearTimeout(t); wk.terminate(); const m = e.data; if (m.error) return rej(new Error(m.error));
      const c = document.createElement('canvas'); c.width = m.w; c.height = m.h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(m.buf), m.w, m.h), 0, 0); res(c); };
    wk.onerror = (e) => { clearTimeout(t); wk.terminate(); rej(new Error('worker_error')); };
    wk.postMessage({ id: 1, w, h, buf: data.data.buffer, kinds: ['photo'] }, [data.data.buffer]);
  });
}
// 부스 파이프라인 결과(900×1200 카드)에서 판 영역(60,60,780,1040)만 꺼내 카르트 드 비지트 틀에 얹는다
function carte(card, engine) {
  const W = 900, H = 1290, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#E3D6B6'; g.fillRect(0, 0, W, H);
  const paper = g.createLinearGradient(0, 0, W, H); paper.addColorStop(0, 'rgba(255,255,255,.18)'); paper.addColorStop(1, 'rgba(90,60,20,.12)');
  g.fillStyle = paper; g.fillRect(0, 0, W, H);
  const px = 70, py = 70, pw = W - 140, ph = pw * 4 / 3;
  g.drawImage(card, 60, 60, 780, 1040, px, py, pw, ph);
  g.strokeStyle = 'rgba(120,90,40,.9)'; g.lineWidth = 2; g.strokeRect(px - 12, py - 12, pw + 24, ph + 24);
  g.strokeStyle = 'rgba(120,90,40,.5)'; g.lineWidth = 1; g.strokeRect(px - 20, py - 20, pw + 40, ph + 40);
  g.fillStyle = '#3B2A12'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 46px Georgia, "Times New Roman", serif'; g.fillText('NADAR', W / 2, py + ph + 66);
  g.font = '400 24px Georgia, "Times New Roman", serif'; g.fillStyle = 'rgba(59,42,18,.8)';
  g.fillText('35, Boulevard des Capucines · Paris', W / 2, py + ph + 108);
  g.font = '400 18px Freesentation, sans-serif'; g.fillStyle = 'rgba(59,42,18,.55)';
  g.fillText(`MONET 100 · C4 · 기기 안에서 변환(${engine})`, W / 2, H - 36);
  return c;
}
let last = null;
async function exposeAndDevelop() {
  if (!source) return;
  const count = $('#count'), num = $('#countNum');
  count.hidden = false; $('#meShoot').hidden = true;
  for (let n = 4; n >= 1; n--) { num.textContent = n; await sleep(REDUCED ? 250 : 1000); }
  count.hidden = true;
  const snap = grab();
  $('#busy').hidden = false;
  await sleep(30);
  let card = null, engine = 'webgl';
  try {
    const comp = N.cropTo34(snap);
    try { card = N.renderPhoto19(comp, null); }
    catch (e) { console.warn('[c4] webgl', e); engine = 'canvas'; try { card = N.mountFallback(await runWorker(comp)); } catch (err) { console.warn('[c4] worker', err); engine = 'quick'; card = N.quickPhoto(comp); } }
  } catch (e) { console.error(e); $('#busy').hidden = true; meState('ready'); return toast('현상에 실패했습니다. 다시 찍어 주세요.'); }
  last = carte(card, engine);
  result.width = last.width; result.height = last.height; result.getContext('2d').drawImage(last, 0, 0);
  result.hidden = false; video.hidden = true; still.hidden = true;
  $('#busy').hidden = true;
  stopCamera(video);
  meState('done');
}
$('#shoot').addEventListener('click', exposeAndDevelop);
$('#again2').addEventListener('click', () => { result.hidden = true; last = null; if (source === 'cam') camOn(); else demoOn(); });
$('#saveMe').addEventListener('click', async () => {
  if (!last) return;
  const blob = await new Promise((r) => last.toBlob(r, 'image/jpeg', 0.92));
  if (!blob) return toast('저장에 실패했습니다.');
  const file = new File([blob], 'nadar_내초상.jpg', { type: 'image/jpeg' });
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('초상을 저장했습니다.');
});
meState('idle');
void loadImage;
// 검수용
window.__c4 = { get stance() { return stance; }, get crowd() { return crowd; }, get sheet() { return sheetOpen; }, get people() { return PEOPLE.length; },
  get flowing() { return flows.some((a) => a.playState === 'running'); }, get lit() { return $$('.fr.lit').length; }, get card() { return !!lastCard; }, get zoom() { return Z.s; },
  cardURL: () => lastCard && lastCard.toDataURL('image/jpeg', 0.85), pick, openPair, glowOnce };
