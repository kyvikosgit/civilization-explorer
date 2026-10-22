// C4 나다르 사진관 — 질문이 주인공인 한 화면
//   위: "사람을 남긴다면, 그림입니까 사진입니까?"
//   아래: 두 벽 — 왼쪽은 같은 25명의 그림(금박 · 타원 · 나무 액자를 살롱식으로 빽빽이, 초당 10px 위로),
//         오른쪽은 그들의 사진(카르트 드 비지트 · 캐비닛 카드, 초당 9px 아래로). 먼 층(빈 액자)은 더 느리게 — 깊이.
//   약 4초마다 한 사람의 두 액자가 함께 빛나고 가운데에 "이름 · 그림 연도 / 사진 연도"가 뜬다(유일한 '변환' 단서).
//   액자를 누르면 그 사람의 그림과 사진을 나란히 크게(두 손가락 확대). 반쪽(또는 아래 단추)을 누르면 그쪽이 화면을 채우고
//   오늘의 관람객 → 그때는 이랬다 → 저장(고른 쪽 25명 콜라주 카드 "나는 ○○으로 남긴다").
//   (+) 내 초상(선택): 전면 카메라 → 노출 4초 → 부스 프로토타입의 19세기 사진 파이프라인(booth/js/nadar.js) 재사용
// 인물·출처: js/c4-people.json(위키미디어 공용 파일 페이지 · 라이선스) · 얼굴 틀: img/c4p/build.py
// 움직임은 transform · opacity 만. 화면 밖 · 탭 숨김 · 시트가 열리면 멈춘다. 서버 없음, 업로드 없음.
import { toast, loadImage, startCamera, stopCamera, cameraErrorText } from '../../../booth/js/common.js';
import { saveChoice } from './js/proto-common.js';
import { createCrowd, dotsFor, split, packRect, scatter, targetsFor, stampLine } from './js/crowd.js';
import * as N from '../../../booth/js/nadar.js';

const $ = (s) => document.querySelector(s);
const $$ = (q) => Array.from(document.querySelectorAll(q));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stage = $('#ask'), halves = $('#halves');
const thumb = (id, k) => `img/c4p/${id}-${k}.jpg`;
const large = (id, k) => `img/c4p/lg/${id}-${k}.jpg`;
const STAMP = { '나다르': ['Nadar', '35, boul. des Capucines'], '에티엔 카르자': ['Ét. Carjat', 'Paris'], '피에르 프티': ['Pierre Petit', 'Paris'],
  '헤르만 비오브': ['H. Biow', ''], 'A. 그레이너': ['A. Greiner', 'Amsterdam'] };

// ── 탭
$$('.tab').forEach((t) => t.addEventListener('click', () => {
  $$('.tab').forEach((x) => { const on = x === t; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
  $$('.screen').forEach((s) => { s.hidden = s.dataset.screen !== t.dataset.tab; });
  if (t.dataset.tab !== 'me') stopCamera($('#cam'));
  syncFlow();
  window.scrollTo(0, 0);
}));

// 고정 난수(배치가 매번 같게)
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(a, rnd) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

let PEOPLE = [], BYID = {};
// ── 살롱식 걸기: 큰 것 하나 / 작은 것 둘(높이 엇갈리게)을 섞어 한 줄기 높이 H 를 만든다. 두 벌을 H 간격으로 이어 끊김 없이 돈다
function layout(kind, order, W, seed) {
  const rnd = rng(seed), items = [];
  let y = 12, i = 0;
  const hOf = (w, big) => {
    if (kind === 'paint') { const m = Math.max(5, Math.round(w * 0.065)); return { h: Math.round((w - 2 * m) * 1.25 + 2 * m), m }; }
    const iw = w * 0.86, top = w * 0.07, st = Math.max(15, w * (big ? 0.2 : 0.22)); return { h: Math.round(top + iw * 1.25 + st), m: 0, iw, top };
  };
  while (i < order.length) {
    const left = order.length - i;
    if (left === 1 || rnd() < 0.36) {
      const big = true, w = Math.round(W * (0.62 + rnd() * 0.14)), g = hOf(w, big);
      const x = Math.round((W - w) / 2 + (rnd() - 0.5) * W * 0.14);
      items.push({ id: order[i++], x, y, w, ...g, big }); y += g.h + 16 + Math.round(rnd() * 8);
    } else {
      const w1 = Math.round(W * (0.39 + rnd() * 0.07)), w2 = Math.round(W * (0.39 + rnd() * 0.07));
      const g1 = hOf(w1), g2 = hOf(w2), y1 = y + Math.round(rnd() * 12), y2 = y + 10 + Math.round(rnd() * 22);
      items.push({ id: order[i++], x: Math.round(W * 0.05), y: y1, w: w1, ...g1 });
      items.push({ id: order[i++], x: Math.round(W * 0.95 - w2), y: y2, w: w2, ...g2 });
      y = Math.max(y1 + g1.h, y2 + g2.h) + 14 + Math.round(rnd() * 8);
    }
  }
  items.forEach((it) => { it.shape = kind === 'paint' ? (rnd() < 0.3 ? 'ov' : rnd() < 0.22 ? 'wood' : '') : (it.big ? 'cab' : ''); });
  return { items, H: y };
}
function frameHTML(kind, it, dy) {
  const p = BYID[it.id], style = `left:${it.x}px;top:${it.y + dy}px;width:${it.w}px;height:${it.h}px`;
  if (kind === 'paint') {
    return `<button class="fr pf ${it.shape}" type="button" data-id="${p.id}" style="${style};--m:${it.m}px" aria-label="${p.name} · 그림"><i class="glw"></i><span class="body"><span class="win"><img src="${thumb(p.id, 'paint')}" alt="" draggable="false" decoding="async"></span></span></button>`;
  }
  const s = STAMP[p.photo.by] || ['Photographie', ''], fs = Math.max(6.5, Math.min(10, it.w * 0.07));
  return `<button class="fr cd ${it.shape}" type="button" data-id="${p.id}" style="${style};--fs:${fs.toFixed(1)}px" aria-label="${p.name} · 사진"><i class="glw"></i><span class="body"><span class="win" style="top:${it.top.toFixed(1)}px;left:${((it.w - it.iw) / 2).toFixed(1)}px;right:auto;width:${it.iw.toFixed(1)}px"><img src="${thumb(p.id, 'photo')}" alt="" draggable="false" decoding="async"></span><span class="stamp">${s[0]}${s[1] ? `<i>${s[1]}</i>` : ''}</span></span></button>`;
}
function ghosts(kind, W, Hf, seed) {
  const rnd = rng(seed), out = [];
  for (let y = 30; y < Hf - 40;) {
    const w = Math.round(W * (0.22 + rnd() * 0.16)), h = Math.round(w * (kind === 'paint' ? 1.25 : 1.55)), x = Math.round(rnd() * (W - w));
    out.push({ x, y, w, h }); y += h + 40 + Math.round(rnd() * 90);
  }
  const one = (dy) => out.map((g) => `<i class="ghost" style="left:${g.x}px;top:${g.y + dy}px;width:${g.w}px;height:${g.h}px"></i>`).join('');
  return one(0) + one(Hf);
}

// ── 흐름(WAAPI): 그림은 위로 초당 10px, 사진은 아래로 초당 9px, 먼 층은 같은 주기에 더 짧은 길이 → 더 느리게. 시작은 천천히 붙는다
let flows = [], sideAnims = { paint: [], photo: [] }, onScreen = true, sheetOpen = false, ramp = 0;
function build() {
  const W = Math.round($('#sidePaint').getBoundingClientRect().width);
  const ids = PEOPLE.map((p) => p.id);
  const sides = { paint: { order: shuffle(ids, rng(11)), speed: 10, dir: -1 }, photo: { order: null, speed: 9, dir: 1 } };
  // 사진 벽은 그림 벽의 거꾸로 순서 — 서로 반대로 흐르니 같은 사람이 주기적으로 엇갈리며 두 벽에 함께 보인다
  sides.photo.order = sides.paint.order.slice().reverse();
  flows.forEach((a) => a.cancel()); flows = []; sideAnims = { paint: [], photo: [] };
  ['paint', 'photo'].forEach((k) => {
    const s = sides[k], L = layout(k, s.order, W, k === 'paint' ? 3 : 7);
    const near = $(k === 'paint' ? '#hangPaint' : '#hangPhoto'), far = $(k === 'paint' ? '#farPaint' : '#farPhoto');
    near.style.height = `${L.H * 2}px`;
    near.innerHTML = L.items.map((it) => frameHTML(k, it, 0)).join('') + L.items.map((it) => frameHTML(k, it, L.H)).join('');
    const Hf = Math.round(L.H * 0.58); far.style.height = `${Hf * 2}px`; far.innerHTML = ghosts(k, W, Hf, k === 'paint' ? 5 : 9);
    if (REDUCED) { if (s.dir > 0) { near.style.transform = `translateY(${-L.H}px)`; far.style.transform = `translateY(${-Hf}px)`; } return; }
    const dur = (L.H / s.speed) * 1000;
    const kf = (h) => (s.dir < 0 ? [{ transform: 'translateY(0)' }, { transform: `translateY(${-h}px)` }] : [{ transform: `translateY(${-h}px)` }, { transform: 'translateY(0)' }]);
    const a1 = near.animate(kf(L.H), { duration: dur, iterations: Infinity }), a2 = far.animate(kf(Hf), { duration: dur, iterations: Infinity });
    // 같은 사람의 두 액자가 처음부터 나란히 서지 않게 시작 자리를 어긋낸다
    const off = (k === 'paint' ? 0.12 : 0.47) * dur; a1.currentTime = off; a2.currentTime = off;
    flows.push(a1, a2); sideAnims[k].push(a1, a2);
  });
  ramp = 0; rampUp();
  syncFlow();
}
function rampUp() {
  if (REDUCED) return;
  const t0 = performance.now();
  const step = (now) => { ramp = Math.min(1, (now - t0) / 1600); const e = ramp * ramp * (3 - 2 * ramp); rate(e); if (ramp < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
let pickRate = 1;
function rate(e) { flows.forEach((a) => { const mine = stance && sideAnims[stance].includes(a); const r = Math.max(0.0001, e * (mine ? pickRate : 1)); a.updatePlaybackRate ? a.updatePlaybackRate(r) : (a.playbackRate = r); }); }
function running() { return onScreen && !sheetOpen && !stage.hidden && document.visibilityState === 'visible'; }
function syncFlow() {
  const run = running();
  flows.forEach((a) => { if (run && a.playState !== 'running') a.play(); else if (!run && a.playState === 'running') a.pause(); });
  if (run && !stance) startGlow(); else stopGlow();
}
if ('IntersectionObserver' in window) new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; syncFlow(); }).observe(halves);
document.addEventListener('visibilitychange', syncFlow);

// ── 같은 사람: 약 4초마다, 두 벽에 모두 온전히 보이는 사람 하나의 두 액자가 함께 빛난다 + 가운데 이름표
let glowT = 0, glowOff = 0, shown = [];
function fullyIn(el, r) { const b = el.getBoundingClientRect(), cy = (b.top + b.bottom) / 2; return b.top > r.top - b.height * 0.2 && cy < r.bottom - 160 && b.bottom < r.bottom - 100 ? b : null; }
function glowOnce() {
  const r = halves.getBoundingClientRect();
  const vis = (k) => { const m = new Map(); $$(`#${k === 'paint' ? 'hangPaint' : 'hangPhoto'} .fr`).forEach((f) => { const b = fullyIn(f, r); if (b && !m.has(f.dataset.id)) m.set(f.dataset.id, { f, b }); }); return m; };
  const a = vis('paint'), b = vis('photo');
  const both = [...a.keys()].filter((id) => b.has(id));
  if (!both.length) return false;
  both.sort((x, y) => shown.indexOf(x) - shown.indexOf(y));   // 오래전에 보인 사람 먼저
  const id = both[0], pa = a.get(id), pb = b.get(id), p = BYID[id];
  shown = shown.filter((x) => x !== id).concat(id);
  [pa.f, pb.f].forEach((f) => { f.classList.remove('lit'); void f.offsetWidth; f.classList.add('lit'); setTimeout(() => f.classList.remove('lit'), 2800); });
  const y = ((pa.b.top + pa.b.bottom) / 2 + (pb.b.top + pb.b.bottom) / 2) / 2 - r.top;
  const same = $('#same');
  $('#sameName').textContent = p.name;
  $('#sameYears').textContent = `${p.paint.year} / ${p.photo.year}`;
  same.style.setProperty('--y', `${Math.max(50, Math.min(r.height - 150, y)).toFixed(0)}px`);
  same.classList.add('on'); halves.classList.add('glowing'); clearTimeout(glowOff); glowOff = setTimeout(() => { same.classList.remove('on'); halves.classList.remove('glowing'); }, 2600);
  return true;
}
function startGlow() { if (glowT) return; glowT = setTimeout(function tick() { glowT = setTimeout(tick, glowOnce() ? 4000 : 700); }, 1200); }   // 못 찾으면 0.7초 뒤 다시
function stopGlow() { clearTimeout(glowT); glowT = 0; }

// ── 나란히 크게: 액자를 누르면 그 사람의 그림 | 사진(큰 판은 이때 받는다). 두 손가락으로 함께 확대, 한 손가락으로 옮기기, 두 번 누르면 원래대로
const sheet = $('#pairSheet'), dim = $('#pairDim'), psIn = $('#psIn'), psZoom = $('#psZoom');
const capHTML = (lab, e) => `<b>${lab}</b>${e.by} · ${e.year}${e.where ? `<br>${e.where}` : ''}<small>${e.license}${e.page ? ` · ${decodeURIComponent(e.page.split('/wiki/')[1] || '').replace(/_/g, ' ').slice(0, 70)}` : ''}</small>`;
function openPair(id) {
  const p = BYID[id];
  $('#psName').textContent = p.name;
  $('#psPaint').src = thumb(id, 'paint'); $('#psPhoto').src = thumb(id, 'photo');
  const up = (img, src) => { const im = new Image(); im.onload = () => { if ($('#psName').textContent === p.name) img.src = src; }; im.src = src; };
  up($('#psPaint'), large(id, 'paint')); up($('#psPhoto'), large(id, 'photo'));
  $('#psPaint').alt = `${p.name} · 그림 ${p.paint.by} ${p.paint.year}`; $('#psPhoto').alt = `${p.name} · 사진 ${p.photo.by} ${p.photo.year}`;
  $('#psPaintCap').innerHTML = capHTML('그림', p.paint); $('#psPhotoCap').innerHTML = capHTML('사진', p.photo);
  zoomSet(1, 0, 0);
  sheet.classList.add('open'); dim.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
  sheetOpen = true; syncFlow();
}
function closePair() { sheet.classList.remove('open'); dim.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); sheetOpen = false; syncFlow(); }
$('#psClose').addEventListener('click', closePair); dim.addEventListener('click', closePair);
let Z = { s: 1, x: 0, y: 0 };
function zoomSet(s, x, y) {
  const r = psZoom.getBoundingClientRect(); s = Math.max(1, Math.min(4, s));
  x = Math.min(0, Math.max(r.width * (1 - s), x)); y = Math.min(0, Math.max(r.height * (1 - s), y));
  Z = { s, x, y }; psIn.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(3)})`;
}
const pts = new Map(); let g0 = null, lastTap = 0;
const center = () => { const a = [...pts.values()]; return { x: a.reduce((s, p) => s + p.x, 0) / a.length, y: a.reduce((s, p) => s + p.y, 0) / a.length, d: a.length > 1 ? Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) : 0 }; };
psZoom.addEventListener('pointerdown', (e) => {
  try { psZoom.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const c = center(); g0 = { ...c, ...Z };
  if (pts.size === 1) { const now = performance.now(); if (now - lastTap < 300) zoomSet(1, 0, 0); lastTap = now; }
});
psZoom.addEventListener('pointermove', (e) => {
  if (!pts.has(e.pointerId) || !g0) return;
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const c = center(), r = psZoom.getBoundingClientRect();
  const s = pts.size > 1 && g0.d ? g0.s * (c.d / g0.d) : g0.s;
  const ox = g0.x - r.left, oy = g0.y - r.top;   // 처음 손가락 가운데(틀 기준) 아래의 점이 손가락을 따라간다
  const px = (ox - g0.x0) / g0.s, py = (oy - g0.y0) / g0.s;
  zoomSet(s, c.x - r.left - px * s, c.y - r.top - py * s);
});
const up = (e) => { pts.delete(e.pointerId); const c = pts.size ? center() : null; g0 = c ? { ...c, ...Z } : null; if (g0) { g0.x0 = Z.x; g0.y0 = Z.y; } };
['pointerup', 'pointercancel'].forEach((t) => psZoom.addEventListener(t, up));
// g0 에 시작 변환을 함께 둔다(x0 · y0 = 그때의 이동)
psZoom.addEventListener('pointerdown', () => { if (g0) { g0.x0 = Z.x; g0.y0 = Z.y; } });

// ── 고르기
const STANCES = { paint: { label: '그림', full: '그림으로', pct: 44 }, photo: { label: '사진', full: '사진으로', pct: 56 } };   // 예시 수치
const VISITORS = '1,712';
let stance = null;
function pick(k) {
  stance = k;
  if (k) stage.dataset.pick = k; else delete stage.dataset.pick;
  $('#reveal').classList.remove('on');
  pickRate = k ? 2.6 : 1; rate(1);
  syncFlow();
  if (!k) return;
  $('#mineHead').textContent = `${STANCES[k].full} 남긴다.`;
  $('#mineSubHead').textContent = k === 'paint' ? '화가가 보고 그린 대로' : '렌즈 앞에 앉은 그대로';
  $('#same').classList.remove('on'); halves.classList.remove('glowing'); $$('.fr.lit').forEach((f) => f.classList.remove('lit'));
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
let crowd = null;
function reveal() {
  if (!stance) return;
  const rv = $('#reveal'); rv.classList.add('on'); rv.scrollTop = 0;
  $('#crowdLine').innerHTML = `사람을 남기는 데, 당신은 <em>${STANCES[stance].full}</em>`;
  $('#crowdCols').innerHTML = KEYS.map((k) => { const s = STANCES[k], me = k === stance; return `<div class="crowd-col${me ? ' me' : ''}"><b class="n">${s.pct}<i>%</i></b><span class="lab">${s.label}${me ? ' · 나' : ''}</span></div>`; }).join('');
  $('#crowdStamp').textContent = stampLine(VISITORS);
  $('#mineCard').hidden = true; $('#saveStance').disabled = false;
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

// ── 저장: 입장(출구 화면이 읽는다) + 고른 쪽 25명 콜라주 카드 한 장
const loadImg = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
async function card(k) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bg = g.createRadialGradient(W / 2, H * 0.45, 60, W / 2, H * 0.45, H * 0.85); bg.addColorStop(0, k === 'paint' ? '#3A2A20' : '#2B2A27'); bg.addColorStop(1, '#0F0E0D');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.textAlign = 'center';
  g.fillStyle = '#F0B98F'; g.font = '600 28px Paperlogy, Freesentation, sans-serif'; g.fillText('C4 · 나다르 사진관', W / 2, 92);
  g.fillStyle = '#FFFFFF'; g.font = '800 70px Paperlogy, Freesentation, sans-serif'; g.fillText(`나는 ${STANCES[k].full} 남긴다`, W / 2, 178);
  const cols = 5, cw = 160, ch = 200, gap = 14, x0 = (W - cols * cw - (cols - 1) * gap) / 2, y0 = 228;
  const ims = await Promise.all(PEOPLE.map((p) => loadImg(thumb(p.id, k))));
  PEOPLE.forEach((p, i) => {
    const x = x0 + (i % cols) * (cw + gap), y = y0 + Math.floor(i / cols) * (ch + gap);
    if (k === 'paint') { g.fillStyle = '#B8903F'; g.fillRect(x, y, cw, ch); g.fillStyle = '#E2C26A'; g.fillRect(x + 3, y + 3, cw - 6, ch - 6); g.fillStyle = '#6E4F1E'; g.fillRect(x + 6, y + 6, cw - 12, ch - 12); if (ims[i]) g.drawImage(ims[i], x + 9, y + 9, cw - 18, ch - 18); }
    else { g.fillStyle = '#E9DEC4'; g.fillRect(x, y, cw, ch); if (ims[i]) g.drawImage(ims[i], x + 10, y + 9, cw - 20, (cw - 20) * 1.25 > ch - 28 ? ch - 28 : (cw - 20) * 1.25); }
  });
  g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '400 26px Freesentation, sans-serif';
  g.fillText(`${PEOPLE.length}명의 ${STANCES[k].label} · 오늘 같은 입장 ${STANCES[k].pct}% · 수치는 예시`, W / 2, 1268);
  g.fillStyle = 'rgba(255,255,255,.42)'; g.font = '400 22px Georgia, "Times New Roman", serif';
  g.fillText('MONET 100 · 35, boulevard des Capucines · Paris', W / 2, 1312);
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
let lastCard = null;
$('#saveStance').addEventListener('click', async () => {
  if (!stance) return;
  const s = STANCES[stance];
  $('#saveStance').disabled = true;
  saveChoice('c4', { stance, label: s.label, pct: s.pct });
  $('#mineLabel').textContent = `나는 ${s.full} 남긴다`;
  $('#mineSub').textContent = `오늘 같은 입장 ${s.pct}% · 카드 한 장 · 출구 화면에서 C0·C1·C2와 나란히`;
  $('#mineCard').hidden = false;
  try { lastCard = await card(stance); await shareCanvas(lastCard, `nadar_나는${s.full}.jpg`); toast('수집함에 저장했습니다 · 카드 한 장'); }
  catch (e) { console.warn('[c4] card', e); toast('입장을 저장했습니다'); }
  $('#saveStance').disabled = false;
});

// ── 시작: 인물 목록을 읽고, 작은 판 50장을 미리 받은 뒤 건다
(async () => {
  const data = await fetch('js/c4-people.json').then((r) => r.json());
  PEOPLE = data.people; PEOPLE.forEach((p) => { BYID[p.id] = p; });
  build();
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
  get flowing() { return flows.some((a) => a.playState === 'running'); }, get lit() { return $$('.fr.lit').length; }, get card() { return !!lastCard; }, get zoom() { return Z.s; }, pick, openPair, glowOnce };
