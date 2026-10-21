// C1 시민사회 — 칼럼 돌려보기
//   1 역할+스캔(점선을 누르면 칼럼이 바닥에서 솟는다) → 2 돌려보기(관성·자석·빛 쓸기, 전단지를 누르면 떠오른다) → 3 이 한 장 → 확인
//   → 4 오늘의 관람객(표 순서대로 돌아가며 비율이 꽂힌다) → 5 그때는(독립 전시 전단지가 펼쳐져 수집함으로)
//   3D 칼럼 = 부스 morris-viewer.js 사본 + 확장 (js/morris-viewer-proto.js). 문구는 보드 C1-A · missions.ts 'flyer' 원고.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { $, $$, icons, sheet, toast, sleep, reduceMotion, haptic } from './js/proto-common.js';
import { createMorrisViewer } from './js/morris-viewer-proto.js';
import { ITEMS, FILLER, BACKDROP, TODAY, VISITORS } from './js/morris-items-proto.js';

icons();
const mvEl = $('#mv'), pill = $('#pill'), pillWrap = $('#pillWrap'), guide = $('#guide'), camLoading = $('#camLoading');
let step = 1;
function setStep(n) { step = n; document.body.dataset.step = String(n); window.scrollTo(0, 0); }

// ── 3D 모리스 칼럼
let loaded = false; const waiters = [];
const whenLoaded = () => (loaded ? Promise.resolve() : new Promise((r) => waiters.push(r)));
let picked = -1, choice = -1;
const onFocused = {};
let viewer = null;
try {
  viewer = createMorrisViewer(THREE, RoomEnvironment, mvEl, {
    items: ITEMS.map((it) => ({ src: it.src, ratio: it.ratio, row: it.row, active: true })),
    filler: FILLER, backdrop: BACKDROP, onEvent,
  });
} catch (e) { console.error(e); }
function onEvent(type, d) {
  if (type === 'loaded') { loaded = true; waiters.splice(0).forEach((r) => r()); camLoading.classList.add('off'); }
  else if (type === 'error') console.warn('[morris]', d && d.message);
  else if (type === 'risen') enterSpin();
  else if (type === 'tap' && step === 2) openPrint(d.index);
  else if (type === 'settled' && step === 3) attachLoop();
  else if (type === 'release' && step === 3) { leaveInspect(); setStep(2); }
  else if (type === 'released' && step === 4) startReveal();
  else if (type === 'centered') { markChip(d.index); if (step === 2) haptic(8); }
  else if (type === 'focused') { markChip(d.index); if (onFocused[d.index]) { const f = onFocused[d.index]; delete onFocused[d.index]; f(); } }
}
const waitFocused = (i) => new Promise((r) => { onFocused[i] = r; });

// ── 1 스캔 안내: 칼럼 윤곽 점선 (3D 모델 실측 프로파일 — 부스 c1.js PROFILE 그대로)
const PROFILE = [[0.55, 0], [0.585, 0.03], [0.612, 0.06], [0.618, 0.08], [0.618, 0.207], [0.61, 0.24], [0.6, 0.26], [0.578, 0.28],
  [0.567, 0.3], [0.557, 0.323], [0.557, 0.54], [0.57, 0.56], [0.577, 0.567], [0.577, 0.6], [0.565, 0.62], [0.55, 0.641], [0.535, 0.655],
  [0.515, 0.67], [0.513, 0.713], [0.5, 0.728], [0.5, 2.906], [0.506, 2.92], [0.513, 2.95], [0.543, 2.964], [0.56, 2.993], [0.545, 3.02],
  [0.545, 3.11], [0.56, 3.123], [0.59, 3.152], [0.598, 3.17], [0.598, 3.185], [0.57, 3.205], [0.5, 3.225], [0.45, 3.24], [0.442, 3.255],
  [0.44, 3.27], [0.44, 3.3], [0.443, 3.3], [0.443, 3.325], [0.45, 3.325], [0.468, 3.354], [0.48, 3.398], [0.477, 3.441], [0.467, 3.484],
  [0.442, 3.528], [0.407, 3.571], [0.358, 3.614], [0.31, 3.643], [0.242, 3.672], [0.2, 3.687], [0.17, 3.7], [0.167, 3.716], [0.154, 3.73],
  [0.12, 3.745], [0.065, 3.759], [0.046, 3.773], [0.034, 3.802], [0.044, 3.817], [0.067, 3.846], [0.068, 3.86], [0.063, 3.875],
  [0.052, 3.889], [0.034, 3.904], [0.023, 3.918], [0.027, 3.947], [0.036, 3.961], [0.035, 3.975], [0.023, 3.99], [0.014, 4.019],
  [0.018, 4.063], [0.01, 4.092], [0.003, 4.164], [0, 4.165]];
(function buildGuide() {
  const H = 4.165, pt = ([r, y]) => `${r.toFixed(3)},${(H - y).toFixed(3)}`;
  const right = PROFILE.map(pt), left = PROFILE.slice().reverse().map(([r, y]) => pt([-r, y]));
  const outline = `M${right.join(' L')} L${left.join(' L')} Z`;
  const bands = [[0.5, 0.728], [0.5, 2.906], [0.545, 3.02], [0.545, 3.11]].map(([r, y]) => `M${pt([-r, y])} L${pt([r, y])}`).join(' ');
  const svg = $('#guideSvg');
  svg.setAttribute('viewBox', `-0.68 -0.05 1.36 ${H + 0.1}`);
  svg.innerHTML = `<path class="g-fill" d="${outline}"/><path class="g-band" d="${bands}"/><path class="g-line" d="${outline}"/>`;
})();
function setPill(text, found = false) { pill.textContent = text || ''; pill.classList.toggle('found', found); pillWrap.classList.toggle('off', !text); }

let scanning = false;
async function scan() {
  if (scanning || step !== 1) return;
  scanning = true;
  guide.classList.add('found');
  setPill('모리스 칼럼을 인식했어요', true);
  haptic(30);
  if (!loaded) { camLoading.classList.remove('off'); await whenLoaded(); camLoading.classList.add('off'); }
  await sleep(reduceMotion ? 150 : 600);
  setStep('rise');
  guide.classList.add('off');
  setPill('');
  mvEl.classList.remove('off');
  if (viewer) { viewer.resize(); viewer.reset(); viewer.setHighlight(false); viewer.setInteractive(false); viewer.rise(); }
  scanning = false;
}
guide.addEventListener('click', scan);

// ── 2 돌려보기
const chips = $('#chips');
chips.innerHTML = ITEMS.map((it, i) => `<button class="chip" data-i="${i}" style="background-image:url('${it.src}')" aria-label="${it.n} ${it.label}"><b>${it.n}</b></button>`).join('');
$$('.chip', chips).forEach((b) => b.addEventListener('click', () => { if (viewer && step === 2) viewer.focusItem(+b.dataset.i); }));
function markChip(i) { $$('.chip', chips).forEach((b) => b.classList.toggle('on', +b.dataset.i === i)); }
function enterSpin() {
  setStep(2);
  if (!viewer) return;
  viewer.setHighlight(true); viewer.setInteractive(true); viewer.setMagnet(true);
}

// ── 3 살펴보기 — 떠 있는 전단지 + 삽화 애니메이션(전단지 3장은 부스 영상 그대로)
const loop = document.createElement('video');
loop.muted = true; loop.defaultMuted = true; loop.loop = true; loop.preload = 'auto';
loop.setAttribute('muted', ''); loop.setAttribute('playsinline', ''); loop.setAttribute('webkit-playsinline', '');
loop.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
document.body.appendChild(loop);
loop.addEventListener('error', () => { if (loop.src.endsWith('.mp4')) { loop.src = loop.src.replace(/\.mp4$/, '.webm'); loop.play().catch(() => {}); } });
let loopSrc = '';
function playLoop(i) {
  const src = ITEMS[i].video; if (!src) { loop.pause(); return; }
  if (src !== loopSrc) { loopSrc = src; loop.src = src; } else { try { loop.currentTime = 0; } catch (e) { /* noop */ } }
  const p = loop.play(); if (p && p.catch) p.catch(() => {});
}
function attachLoop() {
  if (!ITEMS[picked].video) return;
  const want = picked;
  const on = () => { if (step === 3 && picked === want && viewer && viewer.mode !== 'back') viewer.setInspectMap(loop); };
  if (loop.readyState >= 2) { on(); return; }
  const evs = ['loadeddata', 'canplay', 'seeked', 'playing'];
  const once = () => { evs.forEach((e) => loop.removeEventListener(e, once)); on(); };
  evs.forEach((e) => loop.addEventListener(e, once));
}
function openPrint(i) {
  if (!viewer || viewer.mode !== 'column') return;
  picked = i;
  playLoop(i);
  if (!viewer.inspect(i)) return;
  const it = ITEMS[i];
  $('#cTitle').textContent = `${it.n} · ${it.label}`; $('#cBody').textContent = it.body; $('#cMeta').textContent = it.meta;
  $('#closeBtn').hidden = false;
  setStep(3);
}
function leaveInspect() {
  loop.pause();
  if (viewer) viewer.setInspectMap(null);
  $('#closeBtn').hidden = true;
}
$('#closeBtn').addEventListener('click', () => { if (viewer && step === 3) viewer.release(); });

// ── 고르기 → 확인
const confirm = sheet($('#confirm'));
$('#pickBtn').addEventListener('click', () => {
  const it = ITEMS[picked];
  $('#cfImg').src = it.src; $('#cfNo').textContent = `전단지 ${it.n}`; $('#cfLabel').textContent = it.label; $('#cfBody').textContent = it.body;
  confirm.open();
});
$('#cfOk').addEventListener('click', () => {
  confirm.close();
  choice = picked;
  leaveInspect();
  setStep(4);
  $('#todayCap').textContent = `오늘의 관람객 · ${VISITORS}명 · 수치는 예시`;
  if (viewer) viewer.release();                           // 칼럼에 돌려놓은 뒤('released') 비율이 꽂힌다
});

// ── 4 오늘의 관람객 — 칼럼이 표 순서대로 돌아가며 전단지마다 비율 표식이 꽂힌다 (내 것은 주황)
const colTags = $('#colTags');
const tags = ITEMS.map((it, i) => {
  const pos = document.createElement('div'); pos.className = 'ctag-pos';
  const t = document.createElement('div'); t.className = 'ctag'; pos.appendChild(t); colTags.appendChild(pos);
  return { pos, t, i, shown: false };
});
function tagLoop() {
  if (step === 4 && viewer) {
    tags.forEach((g) => {
      const p = viewer.project(g.i); if (!p) return;
      g.pos.style.transform = `translate3d(${p.x.toFixed(1)}px, ${(p.y + 6).toFixed(1)}px, 0)`;
      g.pos.style.opacity = g.shown ? (p.facing > 0.18 ? Math.min(1, (p.facing - 0.18) * 4) : 0).toFixed(2) : 0;
    });
  }
  requestAnimationFrame(tagLoop);
}
requestAnimationFrame(tagLoop);
let revealRun = 0;
async function startReveal() {
  const run = ++revealRun;
  if (!viewer) return;
  viewer.setMagnet(false); viewer.setHighlight(false); viewer.setInteractive(false); viewer.setIdle(false);
  const order = ITEMS.map((_, i) => i).sort((a, b) => TODAY[ITEMS[b].n] - TODAY[ITEMS[a].n]);
  tags.forEach((g) => { g.shown = false; g.t.classList.remove('show', 'me'); g.t.innerHTML = `${TODAY[ITEMS[g.i].n]}%<small>${g.i === choice ? '나 · ' : ''}${ITEMS[g.i].n}</small>`; if (g.i === choice) g.t.classList.add('me'); });
  await sleep(reduceMotion ? 50 : 350);
  for (const i of order) {
    if (run !== revealRun) return;
    viewer.focusItem(i);
    await Promise.race([waitFocused(i), sleep(2600)]);
    if (run !== revealRun) return;
    tags[i].shown = true; tags[i].t.classList.add('show');
    haptic(10);
    await sleep(reduceMotion ? 120 : 720);
  }
  if (run !== revealRun) return;
  viewer.setIdle(true);                                     // 다 꽂히면 천천히 돈다
  $('#toHist').hidden = false;
  await sleep(reduceMotion ? 600 : 2600);
  if (run === revealRun && step === 4) openHist();
}
$('#toHist').addEventListener('click', () => { revealRun++; openHist(); });

// ── 5 그때는 — 독립 전시 전단지(카페 게르부아 안내문)가 펼쳐진다 → 수집함으로 접혀 들어간다
const flyer = $('#flyer'), histDark = $('#histDark');
async function openHist() {
  if (step === 5) return;
  setStep(5);
  flyer.classList.add('folded'); flyer.classList.remove('away'); flyer.style.transform = '';
  histDark.classList.remove('show');
  $('#toHist').hidden = true;
  await sleep(reduceMotion ? 50 : 420);
  flyer.classList.remove('folded');
  haptic(12);
  await sleep(reduceMotion ? 100 : 1250);
  histDark.classList.add('show');
}
$('#collect').addEventListener('click', async () => {
  const btn = $('#collect'); btn.disabled = true;
  flyer.classList.add('folded');
  await sleep(reduceMotion ? 50 : 1000);
  // 접힌 전단지가 수집함 아이콘으로 날아 들어간다
  const ic = $('#collectIc').getBoundingClientRect(), fr = flyer.getBoundingClientRect();
  const dx = (ic.left + ic.width / 2) - (fr.left + fr.width / 2), dy = (ic.top + ic.height / 2) - (fr.top + fr.height / 2);
  flyer.classList.add('away');
  flyer.style.transform = `translate(${dx.toFixed(0)}px, ${dy.toFixed(0)}px) scale(.06) rotate(-14deg)`;
  await sleep(reduceMotion ? 50 : 760);
  $('#collectIc').classList.add('bump'); $('#collectN').hidden = false;
  haptic(20);
  toast('수집함에 저장했습니다 · 카페 게르부아 안내문');
  const it = ITEMS[choice];
  $('#mineLabel').textContent = `${it.n} · ${it.label}`;
  $('#mineSub').textContent = `오늘 같은 전단지를 고른 관람객 ${TODAY[it.n]}% · 마지막 화면에서 C0·C2·C5와 나란히`;
  $('#mineCard').classList.add('show');
  btn.hidden = true; $('#restart').hidden = false;
});
$('#restart').addEventListener('click', () => location.replace(location.pathname));

// ── 뒤로
$('#backBtn').addEventListener('click', () => {
  if (step === 3) { if (viewer) viewer.release(); return; }
  if (step === 2) { setStep(1); mvEl.classList.add('off'); guide.classList.remove('off', 'found'); setPill('칼럼을 스캔하세요'); if (viewer) { viewer.setInteractive(false); viewer.setMagnet(false); } return; }
  if (step === 4 || step === 5) location.replace(location.pathname);
});

// 검수용
window.__c1 = {
  get loaded() { return loaded; }, get step() { return step; }, viewer,
  scan, focus: (i) => viewer && viewer.focusItem(i), inspect: openPrint, project: (i) => viewer && viewer.project(i),
};
if (new URLSearchParams(location.search).has('debug')) window.__mv = viewer;
