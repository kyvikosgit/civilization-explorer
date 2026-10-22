// C1 시민사회 — 자격을 묻기
//   1 역할+스캔(점선을 누르면 칼럼이 바닥에서 솟는다) → 2 돌려보기(관성·자석·빛 쓸기, 전단지를 누르면 떠오른다)
//   → 3 살펴보기(안내문이면 펼쳐 보기) → 4 안내문 펼침 → 5 질문(칼럼에 나란히 붙은 두 전시 포스터 — 이번 주말 어느 전시를 보러 갈까) → 6 오늘의 관람객 · 그때는 → 수집함
//   3D 칼럼 = 부스 morris-viewer.js 사본 + 확장 (js/morris-viewer-proto.js). 문구는 보드 C1 · missions.ts 'flyer' 원고.
//   머문 시간·시선 추적 없음. 서버는 입장 2개의 숫자만(여기서는 예시 수치).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { $, $$, icons, toast, sleep, reduceMotion, haptic, saveChoice } from './js/proto-common.js';
import { createMorrisViewer } from './js/morris-viewer-proto.js';
import { ITEMS, FILLER, BACKDROP, VISITORS } from './js/morris-items-proto.js';
import { createCrowd, dotsFor, split, packRect, scatter, targetsFor, stampLine } from './js/crowd.js';

icons();
const mvEl = $('#mv'), pill = $('#pill'), pillWrap = $('#pillWrap'), guide = $('#guide'), camLoading = $('#camLoading');
const TARGET = 0;                                           // 독립 전시 안내문 = 전단지 1(카페 게르부아)
const STANCES = {
  jury: { label: '심사위원이 고른 전시', pct: 38 },           // 살롱 1874
  viewer: { label: '화가들이 직접 연 전시', pct: 62 },        // 카퓌신 대로 35번지 · 예시 수치
};
let step = 1, stance = null;
function setStep(n) {
  step = n; document.body.dataset.step = String(n); window.scrollTo(0, 0);
  $$('[data-on]').forEach((el) => { el.hidden = !el.dataset.on.split(' ').includes(String(n)); });
}

// ── 3D 모리스 칼럼
let loaded = false; const waiters = [];
const whenLoaded = () => (loaded ? Promise.resolve() : new Promise((r) => waiters.push(r)));
let picked = -1;
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
  else if (type === 'centered') { markChip(d.index); if (step === 2) haptic(8); }
  else if (type === 'focused') markChip(d.index);
}

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
  const isTarget = i === TARGET;
  $('#openBtn').hidden = !isTarget;
  $('#s3Desc').innerHTML = isTarget ? '<span>살롱 밖의 전시 안내문입니다</span>' : '<span>이 전단지는 그대로 두고, 카페 게르부아 안내문을 찾아보세요 · 바깥을 누르면 돌려놓기</span>';
  $('#closeBtn').hidden = false;
  setStep(3);
}
function leaveInspect() {
  loop.pause();
  if (viewer) viewer.setInspectMap(null);
  $('#closeBtn').hidden = true;
}
$('#closeBtn').addEventListener('click', () => { if (viewer && step === 3) viewer.release(); });

// ── 4 안내문이 펼쳐진다 (세 단 접힘)
const flyer = $('#flyer');
$('#openBtn').addEventListener('click', async () => {
  if (step !== 3 || picked !== TARGET) return;
  leaveInspect();
  setStep(4);                                               // 'release' 이벤트는 step 3에서만 2로 돌아가므로 먼저 단계를 바꾼다
  if (viewer) { viewer.release(); viewer.setInteractive(false); viewer.setMagnet(false); viewer.setHighlight(false); }
  flyer.classList.add('folded'); flyer.classList.remove('away', 'small'); flyer.style.transform = '';
  $('#histIntro').classList.remove('show');
  await sleep(reduceMotion ? 50 : 420);
  flyer.classList.remove('folded');
  haptic(12);
  await sleep(reduceMotion ? 100 : 1250);
  $('#histIntro').classList.add('show');
});

// ── 5 질문 — 칼럼에 나란히 붙은 두 포스터. 보러 갈 전시의 포스터를 누르면 그 포스터가 눈앞으로 다가오고(눈여겨본 것처럼), 다른 포스터는 뒤로 물러난다 (정답 없음)
$('#toAsk').addEventListener('click', () => { setStep(5); papers.classList.remove('decided', 'today'); $$('.paper', papers).forEach((x) => x.classList.remove('pick', 'back', 'me')); });
const papers = $('#papers');
let deciding = false;
$$('.paper', papers).forEach((b) => b.addEventListener('click', async () => {
  if (step !== 5 || deciding) return;
  deciding = true; stance = b.dataset.k;
  $$('.paper', papers).forEach((x) => { const on = x === b; x.classList.toggle('pick', on); x.classList.toggle('back', !on); x.setAttribute('aria-checked', on); });
  papers.classList.add('decided');
  haptic(14);
  await sleep(reduceMotion ? 120 : 1050);
  deciding = false;
  reveal();
}));

// ── 6 오늘의 관람객 — 두 포스터는 크기 그대로, 그 아래로 오늘의 관람객(점 하나 = 열 사람)이 흩어졌다가 고른 포스터 밑에 모인다. 내 점은 주황, 맨 마지막에
const KEYS = ['jury', 'viewer'];
let crowd = null;
function reveal() {
  setStep(6);
  $$('.paper', papers).forEach((x) => { x.classList.toggle('me', x.dataset.k === stance); x.style.setProperty('--o', x.dataset.k === stance ? 1 : 0.55); });
  papers.classList.remove('decided'); papers.classList.add('today');
  $('#crowdCols').innerHTML = KEYS.map((k) => { const s = STANCES[k], me = k === stance; return `<div class="crowd-col${me ? ' me' : ''}"><b class="n">${s.pct}<i>%</i></b><span class="lab">${s.label}${me ? ' · 나' : ''}</span></div>`; }).join('');
  $('#crowdStamp').textContent = stampLine(VISITORS);
  $('#mineCard').classList.remove('show');
  $('#collect').hidden = false; $('#collect').disabled = false; $('#restart').hidden = true;
  // 군중: 종이 폭에 맞춘 두 자리
  const stage = $('#crowdStage'), n = dotsFor(VISITORS);
  if (!crowd) crowd = createCrowd($('#crowdCv'), { theme: 'dark', n, reduceMotion, seed: 3 });
  requestAnimationFrame(() => {
    crowd.resize();
    const sr = stage.getBoundingClientRect();
    const rects = KEYS.map((k) => { const r = $(`.paper[data-k="${k}"] > .notice`).getBoundingClientRect(); return { x: r.left - sr.left + 4, y: 10, w: r.width - 8, h: sr.height - 18 }; });
    const counts = split(n, KEYS.map((k) => STANCES[k].pct));
    const groups = KEYS.map((k, i) => ({ pts: packRect(counts[i], rects[i], crowd.rnd) }));
    crowd.place(scatter(n, { x: 0, y: 0, w: sr.width, h: sr.height }, crowd.rnd));
    setTimeout(() => crowd.move(targetsFor(crowd, groups, KEYS.indexOf(stance)), { duration: 1250, stagger: 380 }), reduceMotion ? 0 : 260);
  });
}
$('#collect').addEventListener('click', async () => {
  const btn = $('#collect'); btn.disabled = true;
  // 내 포스터가 수집함 아이콘으로 날아 들어간다
  const mine = $('.paper.me', papers);
  const ic = $('#collectIc').getBoundingClientRect(), fr = mine.getBoundingClientRect();
  const dx = (ic.left + ic.width / 2) - (fr.left + fr.width / 2), dy = (ic.top + ic.height / 2) - (fr.top + fr.height / 2);
  mine.classList.add('away');
  mine.style.transform = `translate(${dx.toFixed(0)}px, ${dy.toFixed(0)}px) scale(.12) rotate(-14deg)`;
  await sleep(reduceMotion ? 50 : 760);
  mine.classList.add('gone');                                        // 다른 포스터는 제자리에(아래 점 무리와 맞춰서)
  $('#collectIc').classList.add('bump'); $('#collectN').hidden = false;
  haptic(20);
  const s = STANCES[stance];
  toast(`수집함에 저장했습니다 · ${stance === 'viewer' ? '화가들의 전시 안내(재현)' : '살롱 1874 공고(재현)'}`);
  saveChoice('c1', { stance, label: s.label, pct: s.pct });
  $('#mineLabel').textContent = s.label;
  $('#mineSub').textContent = `오늘 같은 입장 ${s.pct}% · 출구 화면에서 C0·C2·C4와 나란히`;
  $('#mineCard').classList.add('show');
  btn.hidden = true; $('#restart').hidden = false;
});
$('#restart').addEventListener('click', () => location.replace(location.pathname));

// ── 뒤로
$('#backBtn').addEventListener('click', () => {
  if (step === 3) { if (viewer) viewer.release(); return; }
  if (step === 2) { setStep(1); mvEl.classList.add('off'); guide.classList.remove('off', 'found'); setPill('칼럼을 스캔하세요'); if (viewer) { viewer.setInteractive(false); viewer.setMagnet(false); } return; }
  if (step === 5) { if (deciding) return; setStep(4); return; }
  if (step === 4 || step === 6) location.replace(location.pathname);
});

setStep(1);
// 검수용
window.__c1 = {
  get loaded() { return loaded; }, get step() { return step; }, viewer,
  scan, focus: (i) => viewer && viewer.focusItem(i), inspect: openPrint, project: (i) => viewer && viewer.project(i), get stance() { return stance; },
  get crowd() { return crowd; },
};
if (new URLSearchParams(location.search).has('debug')) window.__mv = viewer;
