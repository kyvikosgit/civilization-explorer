// C0 아카데미 살롱 — 가장 좋은 자리 한 곳
//   1 역할 → 2 살롱 벽(후보작을 끌어 가운데 눈높이 액자에 건다) → 확인 → 3 오늘의 살롱 벽(표대로 다시 건다) → 4 카드
//   후보작·문구: 보드 experience-v2.html C0-A, 앱 missions.ts 'salon'. 비율·인원은 보드 와이어프레임의 예시 수치.
import { $, $$, icons, sheet, toast, sleep, clamp, reduceMotion, showScreen, haptic } from './js/proto-common.js';

const WORKS = [
  { n: 1, src: '../works/c0-cambyses.jpg',   w: 420, h: 304, title: '펠루시움의 캄비세스 왕', artist: '폴 마리 르누아르',   year: '1872', coll: '',               shown: '1873년 살롱 출품 · 미확인(Commons 설명만)' },
  { n: 2, src: '../works/c0-cartridges.jpg', w: 420, h: 273, title: '마지막 탄약통',          artist: '알퐁스 드 뇌빌',     year: '1873', coll: '바제유 마지막 탄약통의 집', shown: '1873년 살롱 출품' },
  { n: 3, src: '../works/c0-vision.jpg',     w: 420, h: 352, title: '환상, 14세기 전설',      artist: '뤽 올리비에 메르송', year: '1872', coll: '릴 미술관',        shown: '1873년 살롱 출품 · 2차 자료만' },
  { n: 4, src: '../works/c0-spring.jpg',     w: 248, h: 420, title: '봄날',                  artist: '피에르 오귀스트 코트', year: '1873', coll: '메트로폴리탄',     shown: '1873년 살롱 출품' },
  { n: 5, src: '../works/c0-bonbock.jpg',    w: 520, h: 589, title: '르 봉 보크',            artist: '에두아르 마네',       year: '1873', coll: '필라델피아 미술관', shown: '1873년 살롱 출품 · 카바넬 〈클레오파트라〉(1887) 대신' },
];
const TODAY = { 1: 9, 2: 27, 3: 18, 4: 39, 5: 7 };   // 보드 와이어프레임 예시 수치
const JURY = '1,284';
const POS_NAME = { C: '가운데 눈높이', L: '눈높이 옆자리', R: '눈높이 옆자리', T: '천장 가까이' };

icons();

// ── 1 역할: 후보작 띠
$('#candStrip').innerHTML = WORKS.map((w) => `<div><img src="${w.src}" alt=""><b>${w.n}</b></div>`).join('');

// ── 2 살롱 벽
const stage = $('#stage'), hang = $('#hang'), tagsEl = $('#tags'), targetEl = $('#target'), lower = $('#lower'), hint = $('#hint');
const FW = 228;                        // 액자 바깥 폭(패딩 포함, scale 1)
let W = 0, H = 0, areaH = 0;           // 무대 크기, 벽으로 쓰는 높이(결과 패널이 올라오면 줄어든다)
let mode = 'pick';                     // pick | hung | reveal
let chosen = null;

const cands = WORKS.map((w) => {
  const el = document.createElement('div');
  el.className = 'frame cand';
  el.innerHTML = `<div class="plate">${w.n}</div><div class="mat"><img src="${w.src}" alt="" draggable="false"></div>`;
  hang.appendChild(el);
  const imgH = (FW - 28) * w.h / w.w;             // 매트 안 그림 높이
  const c = { w, el, fw: FW, fh: imgH + 28, x: 0, y: 0, s: 1, r: 0, vx: 0, vy: 0, vs: 0, vr: 0, tx: 0, ty: 0, ts: 1, slot: null, drag: null, tag: null, bump: 0 };
  const tag = document.createElement('div'); tag.className = 'tag'; tagsEl.appendChild(tag); c.tag = tag;
  return c;
});
const target = { el: targetEl, fw: FW, fh: (FW - 28) * 3 / 4 + 28, x: 0, y: 0, s: 1 };

// ── 자리: 가운데(C) · 눈높이 옆(L·R) · 천장 가까이(T, n개를 고르게)
function slot(name, n = 2, i = 0) {
  if (name === 'C') return { cx: W * 0.5, cy: areaH * 0.56, bw: W * 0.5, bh: areaH * 0.34 };
  if (name === 'L' || name === 'R') return { cx: W * (name === 'L' ? 0.145 : 0.855), cy: areaH * 0.56, bw: W * 0.22, bh: areaH * 0.25 };
  const xs = n === 1 ? [0.5] : n === 2 ? [0.3, 0.7] : [0.18, 0.5, 0.82];
  return { cx: W * xs[i], cy: areaH * 0.235, bw: W * (n >= 3 ? 0.27 : 0.3), bh: areaH * 0.19 };
}
function fitScale(o, sl) { return Math.min(sl.bw / o.fw, sl.bh / o.fh); }
function setTarget(c, sl, name) {
  c.tx = sl.cx; c.ty = sl.cy; c.ts = fitScale(c, sl); c.slot = name;
}
function place(c) { c.x = c.tx; c.y = c.ty; c.s = c.ts; c.vx = c.vy = c.vs = c.vr = 0; c.r = 0; }

// 고르기 단계의 벽: 가운데 빈 액자, 옆 2점, 천장 3점. 떼어 낸 자리는 나머지가 메운다(옆자리 먼저, 나머지는 천장 줄)
function layoutPick(staggerMs = 0) {
  const free = cands.filter((c) => c !== chosen);
  const order = [];
  free.forEach((c, i) => { order.push(c); });
  const flank = order.slice(0, 2), sky = order.slice(2);
  const plan = [];
  flank.forEach((c, i) => plan.push([c, slot(i === 0 ? 'L' : 'R'), i === 0 ? 'L' : 'R']));
  sky.forEach((c, i) => plan.push([c, slot('T', sky.length, i), 'T']));
  plan.forEach(([c, sl, name], i) => {
    if (staggerMs) setTimeout(() => setTarget(c, sl, name), i * staggerMs); else setTarget(c, sl, name);
  });
  const ts = slot('C');
  target.x = ts.cx; target.y = ts.cy; target.s = fitScale(target, ts);
  if (chosen) setTarget(chosen, ts, 'C');
}
// 오늘의 살롱 벽: 표 순서대로 가운데 → 옆 → 천장
function rankOrder() { return cands.slice().sort((a, b) => TODAY[b.w.n] - TODAY[a.w.n]); }
function layoutReveal(staggerMs) {
  const order = rankOrder();
  const names = ['C', 'L', 'R', 'T', 'T'];
  order.forEach((c, i) => {
    const name = names[i];
    const sl = name === 'T' ? slot('T', 2, i - 3) : slot(name);
    setTimeout(() => { setTarget(c, sl, name); }, i * staggerMs);
  });
}

function measure() {
  W = stage.clientWidth; H = stage.clientHeight;
  areaH = mode === 'reveal' ? H - $('#reveal').offsetHeight : H;
  lower.style.transform = `translateY(${Math.round(areaH * 0.805)}px)`;
}

// ── 물리: 스프링(위치·크기·기울기). 끌 때는 손가락을 따라가며 속도만큼 기운다
const K = { pos: 170, scale: 160, rot: 220 }, DAMP = { pos: 0.82, scale: 0.84, rot: 0.80 };
let prevT = performance.now();
function springAxis(o, k, v, t, d, dt, key) {
  const a = (o[t] - o[key]) * k;
  o[v] = (o[v] + a * dt) * Math.pow(d, dt * 60);
  o[key] += o[v] * dt;
}
function tick(now) {
  const dt = Math.min(0.05, (now - prevT) / 1000); prevT = now;
  cands.forEach((c) => {
    if (c.drag) {
      const d = c.drag;
      const nx = d.px - d.ox, ny = d.py - d.oy;
      c.vx = (nx - c.x) / Math.max(dt, 0.001); c.vy = (ny - c.y) / Math.max(dt, 0.001);
      c.x += (nx - c.x) * Math.min(1, dt * 28); c.y += (ny - c.y) * Math.min(1, dt * 28);
      const want = d.near ? fitScale(c, slot('C')) : d.s0 * 1.08;
      c.s += (want - c.s) * Math.min(1, dt * 10);
      const tilt = clamp(c.vx * 0.012, -9, 9);
      c.r += (tilt - c.r) * Math.min(1, dt * 12);
    } else if (reduceMotion) {
      place(c);
    } else {
      springAxis(c, K.pos, 'vx', 'tx', DAMP.pos, dt, 'x');
      springAxis(c, K.pos, 'vy', 'ty', DAMP.pos, dt, 'y');
      springAxis(c, K.scale, 'vs', 'ts', DAMP.scale, dt, 's');
      springAxis(c, K.rot, 'vr', 'tr', DAMP.rot, dt, 'r');
    }
    c.el.style.transform = `translate3d(${(c.x - c.fw / 2).toFixed(2)}px, ${(c.y - c.fh / 2).toFixed(2)}px, 0) rotate(${c.r.toFixed(2)}deg) scale(${c.s.toFixed(4)})`;
    if (mode === 'reveal') c.tag.style.transform = `translate(${(c.x).toFixed(1)}px, ${(c.y + c.fh * c.s / 2 + 16).toFixed(1)}px) translate(-50%, -50%)`;
  });
  target.el.style.transform = `translate3d(${(target.x - target.fw / 2).toFixed(2)}px, ${(target.y - target.fh / 2).toFixed(2)}px, 0) scale(${target.s.toFixed(4)})`;
  requestAnimationFrame(tick);
}
cands.forEach((c) => { c.tr = 0; });
requestAnimationFrame(tick);

// 이웃 액자가 살짝 흔들린다(걸릴 때의 충격)
function bumpOthers(except, amount = 1) {
  if (reduceMotion) return;
  cands.forEach((c, i) => {
    if (c === except || c.drag) return;
    setTimeout(() => {
      c.vy -= 140 * amount; c.vr += (i % 2 ? 1 : -1) * 90 * amount; c.vs += 0.5 * amount;
    }, 40 + i * 35);
  });
}

// ── 입력: 끌기(손가락을 따라가고, 가운데 액자 근처에서 자석처럼 붙는다) · 탭(바로 날아가 걸린다)
let active = null;
stage.addEventListener('pointerdown', (e) => {
  if (mode !== 'pick') return;
  const el = e.target.closest('.cand'); if (!el) return;
  const c = cands.find((q) => q.el === el); if (!c || c === chosen) return;
  e.preventDefault();
  try { stage.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
  const r = stage.getBoundingClientRect();
  const px = e.clientX - r.left, py = e.clientY - r.top;
  active = c;
  c.drag = { id: e.pointerId, px, py, ox: px - c.x, oy: py - c.y, x0: px, y0: py, t0: performance.now(), moved: false, near: false, s0: c.s };
  c.el.classList.add('drag');
  hint.classList.add('off');
});
stage.addEventListener('pointermove', (e) => {
  const c = active; if (!c || !c.drag || e.pointerId !== c.drag.id) return;
  const r = stage.getBoundingClientRect();
  const d = c.drag;
  d.px = e.clientX - r.left; d.py = e.clientY - r.top;
  if (Math.hypot(d.px - d.x0, d.py - d.y0) > 8) d.moved = true;
  // 자석: 액자 가운데가 빈 액자 가운데에 가까우면 그 크기로 줄고 빈 액자가 밝아진다
  const cx = d.px - d.ox, cy = d.py - d.oy;
  const near = Math.hypot(cx - target.x, cy - target.y) < W * 0.2;
  if (near !== d.near) { d.near = near; target.el.classList.toggle('near', near); if (near) haptic(12); }
});
function endDrag(e) {
  const c = active; if (!c || !c.drag || e.pointerId !== c.drag.id) return;
  const d = c.drag; c.drag = null; active = null;
  c.el.classList.remove('drag');
  target.el.classList.remove('near');
  const tap = !d.moved && performance.now() - d.t0 < 400;
  if (e.type === 'pointerup' && (d.near || tap)) { hangIt(c, tap); return; }
  // 제자리로 (던진 속도는 그대로 이어진다)
  c.vx = clamp(c.vx, -900, 900); c.vy = clamp(c.vy, -900, 900);
  hint.classList.remove('off');
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);

// ── 걸기 → 확인
const confirm = sheet($('#confirm'));
async function hangIt(c, fromTap) {
  mode = 'hung'; chosen = c;
  c.el.classList.add('fly');
  if (fromTap) { c.vx = 0; c.vy = 0; }
  c.vr += (c.vx > 0 ? 1 : -1) * 60;                       // 걸리는 순간 살짝 돌아 멈춘다
  layoutPick(70);
  target.el.classList.add('filled');
  haptic(24);
  setTimeout(() => bumpOthers(c, 0.9), 240);
  setTimeout(() => c.el.classList.replace('fly', 'hung'), 700);
  $('#cfImg').src = c.w.src; $('#cfNo').textContent = `${c.w.n}번`;
  await sleep(reduceMotion ? 150 : 780);
  if (mode === 'hung') confirm.open();
}
function unhang() {
  confirm.close();
  const c = chosen; chosen = null; mode = 'pick';
  if (c) { c.el.classList.remove('hung', 'fly'); c.vr -= 50; }
  target.el.classList.remove('filled');
  layoutPick(60);
  hint.classList.remove('off');
}
$('#cfBack').addEventListener('click', unhang);
$('#cfOk').addEventListener('click', () => { confirm.close(); reveal(); });

// ── 3 오늘의 살롱 벽: 표대로 다시 건다 — 가장 많은 그림이 가운데, 적은 그림은 천장으로
async function reveal() {
  mode = 'reveal';
  const me = chosen;
  const order = rankOrder();
  const myRank = order.indexOf(me);
  const myPos = ['C', 'L', 'R', 'T', 'T'][myRank];
  $('#wallTitle').textContent = '오늘의 살롱 벽';
  $('#revCap').textContent = `오늘의 살롱 벽 · 심사위원 ${JURY}명 · 수치는 예시`;
  $('#revTitle').innerHTML = `내가 건 ${me.w.n}번은 오늘 벽에서 <em>${POS_NAME[myPos]}</em>`;
  cands.forEach((c) => {
    c.tag.className = 'tag' + (c === me ? ' me' : '');
    c.tag.innerHTML = `${TODAY[c.w.n]}%<small>${c === me ? '나 · ' : ''}${c.w.n}번</small>`;
  });
  $('#reveal').classList.add('on'); stage.classList.add('reveal');
  await sleep(reduceMotion ? 50 : 420);
  measure();
  me.el.classList.add('mine');
  layoutReveal(reduceMotion ? 0 : 190);
  order.forEach((c, i) => setTimeout(() => c.tag.classList.add('show'), (reduceMotion ? 0 : 190 * i + 620)));
  setTimeout(() => bumpOthers(null, 0.5), 190 * 4 + 300);
}
$('#again').addEventListener('click', () => {
  mode = 'pick';
  $('#reveal').classList.remove('on'); stage.classList.remove('reveal');
  cands.forEach((c) => { c.tag.classList.remove('show'); c.el.classList.remove('mine', 'hung'); });
  $('#wallTitle').textContent = '살롱 벽 · 가운데 눈높이 한 자리';
  const c = chosen; chosen = null;
  setTimeout(() => { measure(); target.el.classList.remove('filled'); layoutPick(60); hint.classList.remove('off'); }, 80);
});

// ── 4 카드
$('#save').addEventListener('click', () => {
  const me = chosen;
  const order = rankOrder();
  const pos = ['C', 'L', 'R', 'T', 'T'][order.indexOf(me)];
  $('#cardImg').src = me.w.src;
  $('#cardPos').innerHTML = `오늘 벽에서 <b>${POS_NAME[pos]}</b> · ${TODAY[me.w.n]}%`;
  $('#cardNo').textContent = `후보작 ${me.w.n} · 내가 가운데에 건 그림`;
  $('#cardTitle').textContent = `〈${me.w.title}〉`;
  $('#cardMeta').textContent = [me.w.artist, me.w.year, me.w.coll].filter(Boolean).join(' · ');
  $('#cardShown').textContent = me.w.shown;
  showScreen('s4');
  toast('수집함에 저장했습니다');
});

// ── 화면 흐름
function enterWall() {
  showScreen('s2');
  mode = 'pick'; chosen = null;
  cands.forEach((c) => { c.el.classList.remove('mine', 'hung', 'fly', 'drag'); c.tag.classList.remove('show'); });
  $('#reveal').classList.remove('on'); stage.classList.remove('reveal');
  $('#wallTitle').textContent = '살롱 벽 · 가운데 눈높이 한 자리';
  target.el.classList.remove('filled', 'near');
  hint.classList.remove('off');
  measure();
  layoutPick();
  // 처음 들어올 때: 천장 쪽에서 내려와 걸린다
  cands.forEach((c, i) => { place(c); if (!reduceMotion) { c.y -= 40 + i * 10; c.s *= 0.9; c.vr = (i % 2 ? 1 : -1) * 40; } });
}
$('#enter').addEventListener('click', enterWall);
$('#back2').addEventListener('click', () => { confirm.close(); showScreen('s1'); });
$('#back4').addEventListener('click', () => showScreen('s2'));
$('#restart').addEventListener('click', () => showScreen('s1'));
window.addEventListener('resize', () => { if ($('#s2').classList.contains('on')) { measure(); if (mode === 'reveal') layoutReveal(0); else layoutPick(); } });

// 검수용
window.__c0 = {
  center(n) { const c = cands.find((q) => q.w.n === n); const r = stage.getBoundingClientRect(); return { x: r.left + c.x, y: r.top + c.y }; },
  target() { const r = stage.getBoundingClientRect(); return { x: r.left + target.x, y: r.top + target.y }; },
  get mode() { return mode; }, enterWall, hangIt: (n) => hangIt(cands.find((q) => q.w.n === n), true), reveal,
};
