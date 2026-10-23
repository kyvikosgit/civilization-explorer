// C1 시민사회 — 어느 전시를 보러 갈까
//   1 역할+스캔(점선을 누르면 칼럼이 바닥에서 솟는다)
//   → 2 찾기: 끌어서 칼럼을 돌린다. 어느 포스터든 누르면 떼어 읽고(3 살펴보기 · 한국어 한 줄 설명), 찾을 것은 누군가 접어서 압정에 꽂아 두고 간 전단지
//        (갓 꽂은 종이라 바람에 들리고 가스등 빛에 윤이 난다 — 화살표 없음. 오래 못 찾으면 칼럼이 그쪽으로 천천히 돌고 바람이 한 번 분다)
//   → 4 그 전단지가 압정에서 빠져 가운데로 오며 세 단이 펼쳐진다 · 한 줄 설명 · 놋쇠 명판
//   → 5 명판을 누르면 펼친 전단지가 오른쪽 자리로 물러나고, 칼럼 위 살롱 공고가 떼어져 왼쪽으로 온다 → 이번 주말 어느 전시를 보러 갈까
//   → 6 오늘의 관람객(점 없이, 두 포스터가 비율만큼 커지고 작아지며 숫자가 센다) → 수집함
//   3D 칼럼 = 부스 morris-viewer.js 사본 + 확장 (js/morris-viewer-proto.js). 두 전시 인쇄물은 캔버스 조판 재현(js/c1-posters.js)
//   머문 시간·시선 추적 없음. 서버는 입장 2개의 숫자만(여기서는 예시 수치).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { $, $$, icons, toast, sleep, reduceMotion, haptic, saveChoice } from './js/proto-common.js';
import { createMorrisViewer } from './js/morris-viewer-proto.js';
import { ITEMS, SALON, EXPO, FILLER, BACKDROP, VISITORS } from './js/morris-items-proto.js';
import { stampLine } from './js/crowd.js';
import { drawSalon, drawExpo, drawExpoCover, loadPosterFonts, imageURL } from './js/c1-posters.js';

icons();
const mvEl = $('#mv'), pill = $('#pill'), pillWrap = $('#pillWrap'), guide = $('#guide'), camLoading = $('#camLoading');
const STANCES = {
  jury: { label: '심사위원이 고른 전시', pct: 38 },           // 살롱 1874
  viewer: { label: '화가들이 직접 연 전시', pct: 62 },        // 카퓌신 대로 35번지 · 예시 수치
};
let step = 1, stance = null;
let seq = 0;                                                // 뒤로 등으로 흐름이 바뀌면 올려서, 기다리던 비동기 단계를 무효로
function setStep(n) {
  step = n; document.body.dataset.step = String(n); window.scrollTo(0, 0);
  $$('[data-on]').forEach((el) => { el.hidden = !el.dataset.on.split(' ').includes(String(n)); });
}

// ── 해 질 녘 거리: 가스등(멀리서 가까이, 하나씩) · 멀리 대로를 오가는 마차 등불 · 옅은 안개
const LAMPS = [   // 화면 비율 좌표 · 크기(px). 대로의 두 보도선을 따라 멀어진다
  [0.63, 0.47, 7], [0.70, 0.495, 8], [0.56, 0.50, 9], [0.79, 0.54, 11], [0.46, 0.545, 12], [0.90, 0.6, 15], [0.33, 0.6, 15], [0.18, 0.67, 19], [0.04, 0.75, 24],
];
$('#lamps').innerHTML = LAMPS.map(([x, y, sz], i) => `<div class="lamp" style="--x:${x * 100}%;--y:${y * 100}%;--s:${sz}px;--fd:${(2.4 + (i * 0.37) % 1.6).toFixed(2)}s"><i class="halo"></i><i class="post"></i><i class="pool"></i><i class="core"></i></div>`).join('');
// 마차 — 등불 두 개(마부석 양옆) + 젖은 포석에 번지는 반사. 원근: 같은 빠르기로 오면 화면에선 점점 빨라지고 커진다. 칼럼 뒤 먼 대로에서만
const VP = [0.615, 0.468];
const CARS = [   // 차선 끝점(화면 비율), 방향(1 다가옴 · -1 멀어짐), 걸리는 시간 s, 시작 지연 s
  { to: [0.36, 0.64], dir: 1, dur: 19, delay: -3 },
  { to: [0.86, 0.62], dir: -1, dur: 24, delay: -14 },
  { to: [0.30, 0.66], dir: 1, dur: 23, delay: -15 },
];
function buildCars() {
  const host = $('#cars'); if (!host || reduceMotion) return;
  CARS.forEach((c) => {
    const el = document.createElement('div'); el.className = 'car';
    el.innerHTML = '<div class="car-in"><i class="cl a"></i><i class="cl b"></i><i class="rf a"></i><i class="rf b"></i></div>';
    host.appendChild(el);
    const W = host.clientWidth || 390, H = host.clientHeight || 844, N = 14, frames = [];
    for (let k = 0; k <= N; k++) {
      const t = k / N, tt = c.dir > 0 ? t : 1 - t;
      const d = 26 + (2.2 - 26) * tt, s = 2.2 / d;              // 거리 26 → 2.2 (임의 단위), 화면 배율 = 1/거리
      const x = (VP[0] + (c.to[0] - VP[0]) * s) * W, y = (VP[1] + (c.to[1] - VP[1]) * s) * H;
      const op = Math.min(1, s * 9) * (s > 0.8 ? Math.max(0, (1 - s) / 0.2) : 1);
      frames.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(3)})`, opacity: +(op * (c.dir > 0 ? 1 : 0.7)).toFixed(3), offset: t });
    }
    el.animate(frames, { duration: c.dur * 1000, delay: c.delay * 1000, iterations: Infinity, easing: 'linear' });
  });
}
const streetEl = $('#street');
let introDone = false;
async function streetIntro() {
  buildCars();
  if (reduceMotion) { $$('.lamp').forEach((l) => l.classList.add('lit')); document.body.classList.add('role-in'); introDone = true; return; }
  document.body.classList.add('intro'); streetEl.classList.add('push');
  const lamps = $$('.lamp');
  const skip = () => { if (introDone) return; introDone = true; lamps.forEach((l) => l.classList.add('lit')); document.body.classList.remove('intro'); document.body.classList.add('role-in'); };
  $('#stage').addEventListener('pointerdown', skip, { once: true });
  await sleep(450);
  for (const l of lamps) { if (introDone) return; l.classList.add('lit'); await sleep(170); }
  await sleep(150);
  skip();
}
// 역할 문장 — 글자마다 span
(() => { const h1 = $('.role-head h1'); let k = 0; h1.innerHTML = h1.innerHTML.split(/(<br>)/).map((part) => (part === '<br>' ? part : [...part].map((ch) => (ch === ' ' ? ' ' : `<span class="ch" style="--k:${k++}">${ch}</span>`)).join(''))).join(''); })();
// 질문 문장 — 줄마다 span
(() => { const q = $('.ask-q'); q.innerHTML = q.innerHTML.split('<br>').map((t, i) => `<span class="ln" style="--i:${i}">${t}</span>`).join('<br>'); })();
// 누름 반응 — 빛이 한 번 쓸고 지나간다
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.btn, .paper, .plaque'); if (!b || reduceMotion) return;
  b.classList.remove('shine'); void b.offsetWidth; b.classList.add('shine'); setTimeout(() => b.classList.remove('shine'), 950);
}, { passive: true });
$$('.paper > .notice').forEach((n) => { const sh = document.createElement('i'); sh.className = 'sheen'; n.appendChild(sh); });
setStep(1);
if (!reduceMotion) document.body.classList.add('intro');   // 무거운 준비(인쇄물 조판·칼럼 생성)가 끝난 뒤 거리 도입을 시작한다 — 그동안 글자는 숨겨 둔다

// ── 두 전시 인쇄물(재현) — 캔버스 조판. 칼럼 텍스처·펼치는 전단지·두 포스터가 모두 같은 그림
await loadPosterFonts();
const salonCv = drawSalon(), expoCv = drawExpo(), coverCv = drawExpoCover();
Promise.all([salonCv, expoCv, coverCv].map(imageURL)).then(([salonU, expoU, coverU]) => {
  $$('#flyer .strip .f').forEach((el) => { el.style.backgroundImage = `url(${expoU})`; });
  $('#flyer .strip.t .b').style.backgroundImage = `url(${coverU})`;
  $('.notice.salon').style.backgroundImage = `url(${salonU})`;
  $('.notice.expo').style.backgroundImage = `url(${expoU})`;
});

// ── 3D 모리스 칼럼
let loaded = false; const waiters = [];
const whenLoaded = () => (loaded ? Promise.resolve() : new Promise((r) => waiters.push(r)));
let picked = -1;
let viewer = null;
try {
  viewer = createMorrisViewer(THREE, RoomEnvironment, mvEl, {
    items: ITEMS.map((it) => ({ ...it, img: it.gen === 'salon' ? salonCv : it.gen === 'expo' ? coverCv : null, active: true })),
    filler: FILLER, backdrop: BACKDROP, onEvent,
  });
} catch (e) { console.error(e); }
// 해 질 녘 — 배경은 비워 뒤의 DOM 거리(가스등·마차)가 보이게, 빛은 따뜻한 가스등 쪽으로. 포석은 어둡고 젖은 쪽으로
if (viewer) {
  viewer.setAmbience({ transparent: true, key: 0.62, keyColor: 0xffd3a2, fill: 0.22, fillColor: 0x8a96c8, hemi: 0.16, exposure: 0.98, fog: 0x1b1722, overhead: 4.0, overheadColor: 0xffc887, ground: 0x3b3833, groundRough: 0.5, groundEnv: 0.18 });
  viewer.setGlow(false);
}
function onEvent(type, d) {
  if (type === 'loaded') { loaded = true; waiters.splice(0).forEach((r) => r()); camLoading.classList.add('off'); }
  else if (type === 'error') console.warn('[morris]', d && d.message);
  else if (type === 'risen') { if (step === 'rise') enterHunt(); }
  else if (type === 'tap' && step === 2) { if (d.index === EXPO) openFlyer(); else openPrint(d.index); }
  else if (type === 'tapMiss' && step === 2) nudge('바랜 포스터는 단단히 붙어 있어요');
  else if (type === 'settled' && step === 3) attachLoop();
  else if (type === 'release' && step === 3) { leaveInspect(); setStep(2); }
  else if (type === 'centered' && step === 2) { haptic(8); if (d.index === EXPO && viewer) viewer.gust(2.2); }
}

streetIntro();

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
  svg.innerHTML = `<path class="g-fill" d="${outline}"/><path class="g-band" d="${bands}"/><path class="g-draw" pathLength="1" d="${outline}"/><path class="g-line" d="${outline}"/>`;
})();
let pillT = 0;
function setPill(text, found = false) {   // 끌 때는 글자를 남긴 채 사라지게 — 빈 알약이 잠깐 보이지 않게
  clearTimeout(pillT);
  if (!text) { pillWrap.classList.add('off'); pillT = setTimeout(() => { pill.textContent = ''; pill.classList.remove('found'); }, 320); return; }
  pill.textContent = text; pill.classList.toggle('found', found); pillWrap.classList.remove('off');
}

let scanning = false;
async function scan() {
  if (scanning || step !== 1) return;
  scanning = true; const my = seq;
  guide.classList.add('found');
  setPill('모리스 칼럼을 인식했어요', true);
  haptic(30);
  if (!loaded) { camLoading.classList.remove('off'); await whenLoaded(); camLoading.classList.add('off'); }
  await sleep(reduceMotion ? 150 : 600);
  if (my !== seq || step !== 1) { scanning = false; return; }   // 기다리는 사이 뒤로를 눌렀다
  setStep('rise');
  guide.classList.add('off');
  setPill('');
  mvEl.classList.remove('off');
  if (viewer) { viewer.resize(); viewer.reset(); viewer.setHighlight(false); viewer.setInteractive(false); viewer.rise(); riseFlutter(); }
  scanning = false;
}
guide.addEventListener('click', scan);
// 솟는 동안 칼럼의 종이가 바람에 펄럭인다 — 빠르게 일어나 머물다가 칼럼이 서면 잦아든다. 서는 순간 가스등이 한 번 부풀어 오른다
function riseFlutter() {
  if (!viewer || reduceMotion) return;
  const t0 = performance.now(); let landed = false;
  const f = (now) => {
    const t = (now - t0) / 1000;
    const a = t < 0.35 ? t / 0.35 : t < 1.5 ? 1 : Math.max(0, Math.exp(-(t - 1.5) * 2.2) * (1 - (t - 1.5) / 2.2));
    viewer.setFlutter(a * 0.85);
    if (!landed && t > 1.75) { landed = true; document.body.classList.remove('landed'); void document.body.offsetWidth; document.body.classList.add('landed'); haptic(18); }
    if (t < 3.7) requestAnimationFrame(f); else viewer.setFlutter(0);
  };
  requestAnimationFrame(f);
}

// ── 2 찾기 — 끌어서 돌리고, 아무 포스터나 눌러 떼어 읽는다. 오래 못 찾으면(손을 놓고 있을 때) 칼럼이 그쪽으로 천천히 돌고 바람이 분다
let found = false, huntT = 0, lastTouch = 0, assisted = false, huntTimer = 0;
mvEl.addEventListener('pointerdown', () => { lastTouch = performance.now(); }, { passive: true });
function enterHunt() {
  seq++;
  setStep(2);
  if (!viewer) return;
  viewer.setHighlight(true); viewer.setInteractive(true); viewer.setMagnet(true);
  clearInterval(huntTimer);
  huntTimer = setInterval(() => {
    if (step !== 2 || found) return;
    huntT += 1;
    if (!assisted && huntT >= 22 && performance.now() - lastTouch > 4000) {
      assisted = true;
      viewer.focusItem(EXPO, 1.1);                          // 걸어서 칼럼을 반 바퀴 도는 빠르기
      setTimeout(() => { if (step === 2) { viewer.gust(2.8); nudge('어디선가 종이가 바람에 팔랑입니다', 3200); } }, reduceMotion ? 0 : 2600);
    }
  }, 1000);
}
let nudgeT = 0;
function nudge(text, ms = 1800) {                           // 아래 안내 한 줄을 잠깐 바꾼다
  const sub = $('#huntSub'), keep = sub.dataset.keep || (sub.dataset.keep = sub.innerHTML);
  clearTimeout(nudgeT);
  sub.classList.add('nudge'); sub.textContent = text;
  nudgeT = setTimeout(() => { sub.classList.remove('nudge'); sub.innerHTML = keep; }, ms);
}
function toScan() {                                         // 칼럼 → 스캔 화면
  seq++; scanning = false;
  setStep(1); mvEl.classList.add('off'); guide.classList.remove('off', 'found'); setPill('칼럼을 스캔하세요');
  if (!camLoading.classList.contains('off') && loaded) camLoading.classList.add('off');
  if (viewer) { viewer.setInteractive(false); viewer.setMagnet(false); }
}

// ── 3 살펴보기 — 떠 있는 포스터 + 한 줄 설명(전단지 3장은 부스 삽화 애니메이션 그대로)
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
  $('#cTitle').textContent = it.label; $('#cBody').textContent = it.body; $('#cMeta').textContent = it.meta; $('#cMeta').hidden = !it.meta;
  $('#closeBtn').hidden = false;
  setStep(3);
}
function leaveInspect() {
  loop.pause();
  if (viewer) viewer.setInspectMap(null);
  $('#closeBtn').hidden = true;
}
$('#closeBtn').addEventListener('click', () => { if (viewer && step === 3) viewer.release(); });

// ── 4 접힌 전단지 — 칼럼의 그 자리(같은 크기)에서 압정을 빠져나와 가운데로 날아오며 세 단이 펼쳐진다. 칼럼 위 3D 전단지는 같은 순간 사라진다
const flyer = $('#flyer'), flyerWrap = $('#flyerWrap'), histIntro = $('#histIntro'), plaque = $('#toAsk'), unfoldCap = $('#unfoldCap');
function flyerFrom() {                                       // 칼럼 위 접힌 전단지 → 화면의 접힌 DOM 전단지(가운데 단 크기) 변환
  if (!viewer) return null;
  const r = viewer.projectRect(EXPO), mr = mvEl.getBoundingClientRect(), w = flyerWrap.getBoundingClientRect();
  if (!r || !w.width) return null;
  const s = r.w / w.width;
  return `translate(${(mr.left + r.cx - (w.left + w.width / 2)).toFixed(1)}px, ${(mr.top + r.cy - (w.top + w.height / 2)).toFixed(1)}px) scale(${s.toFixed(3)})`;
}
function openFlyer() {
  if (!viewer || viewer.mode !== 'column') return;
  found = true;
  viewer.setInteractive(false); viewer.setMagnet(false);
  haptic(12);
  showFlyer(true);
}
async function showFlyer(fly) {                              // fly=false(질문에서 뒤로)면 펼친 채로 바로
  const my = ++seq;
  setStep(4);
  document.body.classList.remove('leaving');
  if (viewer) { viewer.setPosterHidden(SALON, false); }
  [flyerWrap, flyer, plaque].forEach((e) => e.getAnimations().forEach((a) => a.cancel()));
  if (!fly || reduceMotion) {
    if (viewer) viewer.setPosterHidden(EXPO, true);
    flyer.classList.remove('folded'); histIntro.classList.add('show'); plaque.classList.add('ready'); unfoldCap.classList.add('show');
    return;
  }
  flyer.classList.add('folded'); histIntro.classList.remove('show'); plaque.classList.remove('ready'); unfoldCap.classList.remove('show');
  void flyerWrap.offsetWidth;
  const from = flyerFrom();
  if (viewer) viewer.setPosterHidden(EXPO, true);
  if (from) {
    flyerWrap.animate([
      { transform: from, filter: 'brightness(.62)' },
      { transform: from.replace(/scale\(([\d.]+)\)/, (m, k) => `scale(${(+k * 1.12).toFixed(3)})`) + ' translateY(-6px) rotateX(18deg)', filter: 'brightness(.75)', offset: 0.16 },   // 압정에서 빠지며 아래가 들린다
      { transform: 'translateY(-14px) rotate(-1.5deg)', filter: 'brightness(1)', offset: 0.78 },
      { transform: 'none', filter: 'brightness(1)' },
    ], { duration: 1050, easing: 'cubic-bezier(.3,.1,.2,1)' });
  }
  await sleep(640); if (my !== seq) return;
  flyer.classList.remove('folded');                         // 가운데로 오며 아래 단 → 위 단 순서로 펼쳐진다
  haptic(12);
  await sleep(900); if (my !== seq) return;
  unfoldCap.classList.add('show');
  histIntro.classList.add('show');
  await sleep(1100); if (my !== seq) return;
  plaque.classList.add('ready');
}
async function flyerBack() {                                 // 4 → 2: 다시 접혀 칼럼의 자리로 돌아가 꽂힌다
  const my = ++seq;
  if (!reduceMotion) {
    flyer.classList.add('folded'); histIntro.classList.remove('show'); plaque.classList.remove('ready'); unfoldCap.classList.remove('show');
    await sleep(520); if (my !== seq) return;
    const to = flyerFrom();
    if (to) await flyerWrap.animate([{ transform: 'none', filter: 'brightness(1)' }, { transform: to, filter: 'brightness(.62)' }], { duration: 620, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished.catch(() => {});
    if (my !== seq) return;
  }
  flyerWrap.getAnimations().forEach((a) => a.cancel());
  if (viewer) viewer.setPosterHidden(EXPO, false);
  $('#huntLine').innerHTML = '접힌 전단지는 살롱 공고 아래<br>제자리에 다시 꽂아 두었습니다';
  setStep(2);
  if (viewer) { viewer.setHighlight(true); viewer.setInteractive(true); viewer.setMagnet(true); }
}

// ── 5 질문 — 명판을 누르면: 펼친 전단지는 오른쪽 자리로 물러나고, 칼럼이 살롱 공고 쪽으로 돌며 그 공고가 떼어져(아래가 먼저 들리며) 왼쪽 자리로. 그리고 질문
const papers = $('#papers');
const pSalon = $('.paper.salon', papers), pExpo = $('.paper.expo', papers);
let deciding = false;
function resetPapers() {
  deciding = false;
  papers.classList.remove('decided', 'today');
  $$('.paper', papers).forEach((x) => { x.style.visibility = ''; x.classList.remove('pick', 'back', 'me', 'float'); x.setAttribute('aria-checked', 'false'); x.style.removeProperty('--k'); x.getAnimations().forEach((a) => a.cancel()); $$('*', x).forEach((c) => c.getAnimations().forEach((a) => a.cancel())); });
}
function rectOf(el) { const r = el.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height }; }
plaque.addEventListener('click', async () => {
  if (step !== 4) return;
  const my = ++seq;
  haptic(16);
  plaque.classList.add('pressed');
  if (reduceMotion) { if (viewer) viewer.setPosterHidden(SALON, true); goAsk(); return; }
  document.body.classList.add('leaving');                   // 설명·명판이 물러난다
  if (viewer) viewer.focusItem(SALON);                       // 뒤의 칼럼이 살롱 공고 쪽으로 돈다
  await sleep(380); if (my !== seq) return;
  const fr = rectOf(flyerWrap);
  goAsk(true);
  pSalon.style.visibility = 'hidden';                       // 칼럼에서 떼어지기 전까지
  // 펼친 전단지 → 오른쪽 자리 (같은 그림이라 이어진다)
  const n = rectOf($('.notice', pExpo));
  pExpo.animate([
    { transform: `translate(${(fr.cx - n.cx).toFixed(1)}px, ${(fr.cy - n.cy).toFixed(1)}px) scale(${(fr.w / n.w).toFixed(3)})`, transformOrigin: '50% 50%' },
    { transform: 'none', transformOrigin: '50% 50%' },
  ], { duration: 900, easing: 'cubic-bezier(.45,0,.2,1)' });
  $('.paper-lb', pExpo).animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: 1500, easing: 'ease', fill: 'backwards' });
  // 칼럼의 살롱 공고 → 왼쪽 자리
  await sleep(420); if (my !== seq) return;
  let src = viewer && viewer.projectRect(SALON);
  const mr = mvEl.getBoundingClientRect();
  const sn = rectOf($('.notice', pSalon));
  if (src) src = { cx: mr.left + src.cx, cy: mr.top + src.cy, w: src.w };
  else src = { cx: mr.left + mr.width / 2, cy: mr.top + mr.height * 0.45, w: sn.w * 0.5 };
  if (viewer) viewer.setPosterHidden(SALON, true);
  const k = (src.w / sn.w).toFixed(3), tx = (src.cx - sn.cx).toFixed(1), ty = (src.cy - sn.cy).toFixed(1);
  pSalon.style.visibility = 'visible';
  pSalon.animate([
    { transform: `translate3d(${tx}px, ${ty}px, 0) scale(${k})`, filter: 'brightness(.5)', transformOrigin: '50% 0%' },
    { transform: `translate3d(${tx}px, ${(+ty - 4).toFixed(1)}px, 30px) rotateX(32deg) scale(${(k * 1.05).toFixed(3)})`, filter: 'brightness(.62)', offset: 0.24, transformOrigin: '50% 0%' },   // 아래가 먼저 들린다
    { transform: 'translate3d(0, -14px, 50px) rotateX(-8deg) rotateY(10deg) scale(1.03)', filter: 'brightness(1.06)', offset: 0.8, transformOrigin: '50% 30%' },
    { transform: 'none', filter: 'brightness(1)', transformOrigin: '50% 40%' },
  ], { duration: 1350, easing: 'cubic-bezier(.33,.1,.25,1)', fill: 'backwards' });
  $('.paper-lb', pSalon).animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: 1100, easing: 'ease', fill: 'backwards' });
  haptic(10);
  await sleep(1400); if (my !== seq || step !== 5) return;
  $$('.paper', papers).forEach((p) => p.classList.add('float'));
});
function goAsk(flown = false) {
  seq += flown ? 0 : 1;
  if (viewer) { viewer.setInteractive(false); viewer.setMagnet(false); viewer.setPosterHidden(EXPO, true); if (!flown) viewer.setPosterHidden(SALON, true); }
  document.body.classList.remove('settled', 'leaving');
  setStep(5);
  document.body.classList.toggle('flown', flown);
  resetPapers();
  plaque.classList.remove('pressed');
  if (!flown && !reduceMotion) {                            // 결과에서 다시 고르기 · 뒤로 — 두 포스터가 제자리에서 다시 떠오른다
    $$('.paper', papers).forEach((p, i) => p.animate([{ opacity: 0, transform: 'translateY(14px) rotateX(-12deg)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: i * 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
    setTimeout(() => { if (step === 5) $$('.paper', papers).forEach((p) => p.classList.add('float')); }, 900);
  }
}
// 고르지 않은 포스터가 칼럼으로 돌아가 붙는 자리(화면 px)
function columnPoint(side) {
  const r = mvEl.getBoundingClientRect();
  return { x: r.left + r.width * (0.5 + side * 0.09), y: r.top + r.height * 0.47 };
}
function toColumnFrames(el, side) {
  const r = el.getBoundingClientRect(), c = columnPoint(side);
  const dx = c.x - (r.left + r.width / 2), dy = c.y - (r.top + r.height * 0.4);
  return `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, -260px) rotateY(${side * -42}deg) scale(.4)`;
}
$$('.paper', papers).forEach((b) => b.addEventListener('click', async () => {
  if (step !== 5 || deciding) return;
  deciding = true; stance = b.dataset.k; const my = seq;
  $$('.paper', papers).forEach((x) => { const on = x === b; x.classList.toggle('pick', on); x.classList.toggle('back', !on); x.setAttribute('aria-checked', on); x.classList.remove('float'); });
  papers.classList.add('decided');
  haptic(14);
  const other = $('.paper.back', papers);
  if (!reduceMotion) other.animate([{ transform: 'none', filter: 'brightness(1)', opacity: 1 }, { transform: toColumnFrames(other, other.dataset.k === 'jury' ? -1 : 1), filter: 'brightness(.4)', opacity: 0 }], { duration: 1100, easing: 'cubic-bezier(.5,0,.25,1)', fill: 'forwards' });
  else other.animate([{ opacity: 1 }, { opacity: 0.3 }], { duration: 300, fill: 'forwards' });
  await sleep(reduceMotion ? 120 : 1250);
  if (my !== seq || step !== 5) return;
  deciding = false;
  reveal();
}));

// ── 6 오늘의 관람객 — 점 없이. 돌아갔던 포스터가 칼럼에서 다시 떠나 옆자리로 오고, 두 포스터가 오늘의 비율만큼 커지고 작아진다(빛이 쓸고 지나가며 숫자가 센다)
const KEYS = ['jury', 'viewer'];
function countTo(el, to, ms) {
  if (reduceMotion) { el.textContent = to; return; }
  const t0 = performance.now(); const f = (now) => { const p = Math.min(1, (now - t0) / ms); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); }; requestAnimationFrame(f);
}
async function reveal() {
  document.body.classList.remove('settled');
  const my = seq;
  const y0 = papers.getBoundingClientRect().top;
  $('#crowdCols').style.cssText = '';
  setStep(6);
  $$('.paper', papers).forEach((x) => { x.classList.toggle('me', x.dataset.k === stance); x.style.setProperty('--o', x.dataset.k === stance ? 1 : 0.62); x.style.setProperty('--k', 1); });
  papers.classList.remove('decided'); papers.classList.add('today');
  const dy = y0 - papers.getBoundingClientRect().top;
  if (!reduceMotion && Math.abs(dy) > 2) papers.animate([{ transform: `translateY(${dy.toFixed(1)}px)` }, { transform: 'none' }], { duration: 800, easing: 'cubic-bezier(.2,.8,.2,1)' });
  const other = $('.paper:not(.me)', papers);
  other.getAnimations().forEach((a) => a.cancel());
  if (!reduceMotion) other.animate([{ transform: toColumnFrames(other, other.dataset.k === 'jury' ? -1 : 1), filter: 'brightness(.4)', opacity: 0 }, { opacity: 0.62, offset: 0.4 }, { transform: 'scale(1)', filter: 'brightness(1)', opacity: 0.62 }], { duration: 1000, easing: 'cubic-bezier(.3,.1,.2,1)' });
  $('#crowdCols').innerHTML = KEYS.map((k) => { const s = STANCES[k], me = k === stance; return `<div class="crowd-col${me ? ' me' : ''}"><b class="n"><span>0</span><i>%</i></b><span class="lab">${s.label}${me ? ' · 나' : ''}</span></div>`; }).join('');
  $('#crowdStamp').textContent = stampLine(VISITORS);
  $('#collect').hidden = false; $('#collect').disabled = false; $('#restart').hidden = true;
  await sleep(reduceMotion ? 0 : 1000);
  if (my !== seq || step !== 6) return;
  const max = Math.max(...KEYS.map((k) => STANCES[k].pct));
  KEYS.forEach((k) => $(`.paper[data-k="${k}"]`, papers).style.setProperty('--k', Math.max(0.62, Math.sqrt(STANCES[k].pct / max)).toFixed(3)));
  papers.classList.remove('sweep'); void papers.offsetWidth; papers.classList.add('sweep');
  $('#crowdCols').style.opacity = '1'; $('#crowdCols').style.transform = 'none';
  $$('#crowdCols .n span').forEach((el, i) => countTo(el, STANCES[KEYS[i]].pct, 1100));
  haptic(10);
  await sleep(reduceMotion ? 0 : 1250);
  if (my !== seq || step !== 6) return;
  document.body.classList.add('settled');
}
$('#collect').addEventListener('click', async () => {
  const btn = $('#collect'); btn.disabled = true;
  // 내 포스터의 사본이 수집함 아이콘으로 줄어들며 들어간다 — 원본은 제자리
  const mine = $('.paper.me > .notice', papers);
  const ic = $('#collectIc').getBoundingClientRect(), fr = mine.getBoundingClientRect();
  const ghost = mine.cloneNode(true); ghost.classList.add('fly-ghost');
  Object.assign(ghost.style, { left: fr.left + 'px', top: fr.top + 'px', width: fr.width + 'px', height: fr.height + 'px' });
  document.body.appendChild(ghost);
  const dx = (ic.left + ic.width / 2) - (fr.left + fr.width / 2), dy = (ic.top + ic.height / 2) - (fr.top + fr.height / 2);
  if (!reduceMotion) {
    const a = ghost.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx.toFixed(0)}px, ${dy.toFixed(0)}px) scale(.1)`, opacity: 0.2 }], { duration: 720, easing: 'cubic-bezier(.5,0,.25,1)', fill: 'forwards' });
    await a.finished.catch(() => {});
  }
  ghost.remove();
  $('#collectIc').classList.remove('bump'); void $('#collectIc').offsetWidth; $('#collectIc').classList.add('bump'); $('#collectN').hidden = false;
  haptic(20);
  const s = STANCES[stance];
  toast('수집함에 저장했습니다', 1600);
  saveChoice('c1', { stance, label: s.label, pct: s.pct });
  btn.hidden = true; $('#restart').hidden = false;
});
$('#restart').addEventListener('click', () => location.replace(location.pathname));
$('#again').addEventListener('click', () => { if (step === 6) goAsk(false); });   // 다시 고르기 — 두 포스터가 다시 떠오른다

// ── 뒤로 — 어느 단계에서든 한 단계 뒤로: 결과 → 질문 → 펼친 전단지 → 칼럼 → 스캔 → 목록
$('#backBtn').addEventListener('click', () => {
  if (step === 1) { location.href = 'index.html'; return; }
  if (step === 'rise' || step === 2) { toScan(); return; }
  if (step === 3) { if (viewer) viewer.release(); return; }   // 'release' 이벤트가 2로 돌려 놓는다
  if (step === 4) { flyerBack(); return; }
  if (step === 5) { showFlyer(false); return; }
  if (step === 6) { goAsk(false); return; }
});

// 검수용
window.__c1 = {
  get loaded() { return loaded; }, get step() { return step; }, viewer,
  scan, focus: (i) => viewer && viewer.focusItem(i), inspect: openPrint, openFlyer, project: (i) => viewer && viewer.projectRect(i), get stance() { return stance; },
  EXPO, SALON,
};
if (new URLSearchParams(location.search).has('debug')) window.__mv = viewer;
