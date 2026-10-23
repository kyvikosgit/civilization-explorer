// C1 시민사회 — 자격을 묻기
//   1 역할+스캔(점선을 누르면 칼럼이 바닥에서 솟는다) → 2 돌려보기(관성·자석·빛 쓸기, 전단지를 누르면 떠오른다)
//   → 3 살펴보기(다른 전단지) · 독립 전시 안내문을 누르면 바로 4: 칼럼에서 떼어져 가운데로 오며 세 단이 펼쳐진다 → 5 질문(칼럼에 나란히 붙은 두 전시 포스터 — 이번 주말 어느 전시를 보러 갈까) → 6 오늘의 관람객(두 포스터가 비율만큼) → 수집함
//   3D 칼럼 = 부스 morris-viewer.js 사본 + 확장 (js/morris-viewer-proto.js). 문구는 보드 C1 · missions.ts 'flyer' 원고.
//   머문 시간·시선 추적 없음. 서버는 입장 2개의 숫자만(여기서는 예시 수치).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { $, $$, icons, toast, sleep, reduceMotion, haptic, saveChoice } from './js/proto-common.js';
import { createMorrisViewer } from './js/morris-viewer-proto.js';
import { ITEMS, FILLER, BACKDROP, VISITORS } from './js/morris-items-proto.js';
import { stampLine } from './js/crowd.js';

icons();
const mvEl = $('#mv'), pill = $('#pill'), pillWrap = $('#pillWrap'), guide = $('#guide'), camLoading = $('#camLoading');
const TARGET = 0;                                           // 독립 전시 안내문 = 전단지 1(카페 게르부아)
const STANCES = {
  jury: { label: '심사위원이 고른 전시', pct: 38 },           // 살롱 1874
  viewer: { label: '화가들이 직접 연 전시', pct: 62 },        // 카퓌신 대로 35번지 · 예시 수치
};
let step = 1, stance = null;
let seq = 0;                                                // 뒤로 등으로 흐름이 바뀌면 올려서, 기다리던 비동기 단계를 무효로
let askFrom = 2;                                            // 질문에 들어온 곳(2 칼럼 · 4 안내문) — 뒤로가 그리로 돌아간다
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
// 해 질 녘 — 배경은 비워 뒤의 DOM 거리(가스등·행인)가 보이게, 빛은 따뜻한 가스등 쪽으로
if (viewer) viewer.setAmbience({ transparent: true, key: 0.62, keyColor: 0xffd3a2, fill: 0.22, fillColor: 0x8a96c8, hemi: 0.16, exposure: 0.98, fog: 0x1b1722, overhead: 4.0, overheadColor: 0xffc887 });
function onEvent(type, d) {
  if (type === 'loaded') { loaded = true; waiters.splice(0).forEach((r) => r()); camLoading.classList.add('off'); }
  else if (type === 'error') console.warn('[morris]', d && d.message);
  else if (type === 'risen') { if (step === 'rise') enterSpin(); }
  else if (type === 'tap' && step === 2) { if (d.index === TARGET) openTarget(); else openPrint(d.index); }
  else if (type === 'settled' && step === 3) attachLoop();
  else if (type === 'release' && step === 3) { leaveInspect(); setStep(2); }
  else if (type === 'centered') { markChip(d.index); if (step === 2) haptic(8); }
  else if (type === 'focused') markChip(d.index);
}


// ── 해 질 녘 거리: 가스등(멀리서 가까이, 하나씩) · 행인
const LAMPS = [   // 화면 비율 좌표 · 크기(px). 대로의 두 보도선을 따라 멀어진다
  [0.63, 0.47, 7], [0.70, 0.495, 8], [0.56, 0.50, 9], [0.79, 0.54, 11], [0.46, 0.545, 12], [0.90, 0.6, 15], [0.33, 0.6, 15], [0.18, 0.67, 19], [0.04, 0.75, 24],
];
$('#lamps').innerHTML = LAMPS.map(([x, y, sz], i) => `<div class="lamp" style="--x:${x * 100}%;--y:${y * 100}%;--s:${sz}px;--fd:${(2.4 + (i * 0.37) % 1.6).toFixed(2)}s"><i class="halo"></i><i class="post"></i><i class="pool"></i><i class="core"></i></div>`).join('');
const MAN = '<svg viewBox="0 0 40 100" aria-hidden="true"><g fill="currentColor"><rect x="14" y="0" width="12" height="10" rx="1"/><rect x="10" y="9" width="20" height="2.6" rx="1"/><circle cx="20" cy="17" r="5.2"/><path d="M11 25 Q20 21 29 25 L31 63 L9 63 Z"/><path d="M29 27 L33 50 L30 51 L27 31 Z"/><rect class="lg a" x="13.5" y="60" width="5.5" height="38" rx="2"/><rect class="lg b" x="21" y="60" width="5.5" height="38" rx="2"/></g></svg>';
const LADY = '<svg viewBox="0 0 40 100" aria-hidden="true"><g fill="currentColor"><path d="M14 8 Q20 3 27 8 L28 11 L13 11 Z"/><circle cx="20" cy="16" r="4.8"/><path d="M15.5 22 L24.5 22 L25.5 44 L14.5 44 Z"/><path d="M14 43 Q30 41 33 56 Q36 70 35 98 L7 98 Q6 70 10 56 Q11 46 14 43 Z"/><path d="M24 26 L31 6 L32 6.4 L25.5 27 Z"/><path d="M19 5 Q31 -5 43 5 Q31 1 19 5 Z"/></g></svg>';
function walkers(el, list) {
  el.innerHTML = list.map(([kind, y, h, d, dl, o, b, rtl]) => `<div class="walker${rtl ? ' rtl' : ''}" style="--y:${y}%;--h:${h}px;--d:${d}s;--dl:${dl}s;--o:${o};--b:${b}px">${kind ? LADY : MAN}</div>`).join('');
}
// 뒤: 거리의 사람들(작고 조금 흐림) · 앞: 칼럼 앞을 지나가는 사람(크고 많이 흐림)
walkers($('#walkBack'), [
  [0, 58, 54, 26, -4, 0.6, 2, 0], [1, 61, 60, 31, -19, 0.55, 2.2, 1], [0, 66, 76, 22, -12, 0.62, 2.8, 1], [1, 70, 88, 28, -2, 0.6, 3.2, 0],
  [0, 54, 40, 34, -27, 0.45, 1.6, 1], [1, 56, 44, 38, -8, 0.45, 1.6, 0], [0, 74, 104, 24, -16, 0.62, 3.6, 0],
]);
walkers($('#walkFore'), [[0, 22, 620, 7.5, -1.2, 0.5, 18, 0]]);
const streetEl = $('#street');
let introDone = false;
async function streetIntro() {
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
// 누름 반응 — 빛이 한 번 쓸고 지나간다
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.btn, .chip, .paper'); if (!b || reduceMotion) return;
  b.classList.remove('shine'); void b.offsetWidth; b.classList.add('shine'); setTimeout(() => b.classList.remove('shine'), 950);
}, { passive: true });
$$('.paper > .notice').forEach((n) => { const sh = document.createElement('i'); sh.className = 'sheen'; n.appendChild(sh); });

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

// ── 2 돌려보기
const chips = $('#chips');
chips.innerHTML = ITEMS.map((it, i) => `<button class="chip" data-i="${i}" style="background-image:url('${it.src}')" aria-label="${it.n} ${it.label}"><b>${it.n}</b></button>`).join('');
$$('.chip', chips).forEach((b) => b.addEventListener('click', () => { if (viewer && step === 2) viewer.focusItem(+b.dataset.i); }));
function markChip(i) { $$('.chip', chips).forEach((b) => b.classList.toggle('on', +b.dataset.i === i)); }
function enterSpin() {
  seq++;
  setStep(2);
  if (!viewer) return;
  viewer.setHighlight(true); viewer.setInteractive(true); viewer.setMagnet(true);
}
function toScan() {                                         // 칼럼 → 스캔 화면
  seq++; scanning = false;
  setStep(1); mvEl.classList.add('off'); guide.classList.remove('off', 'found'); setPill('칼럼을 스캔하세요');
  if (!camLoading.classList.contains('off') && loaded) camLoading.classList.add('off');
  if (viewer) { viewer.setInteractive(false); viewer.setMagnet(false); }
}
$('#toAskBar').addEventListener('click', () => { if (step === 2) goAsk(2); });

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

// ── 4 안내문 — 칼럼에서 누르면 그 자리에서 떼어져 가운데로 날아오며 세 단이 펼쳐진다(펼침이 곧 등장). 따로 펼치는 버튼 없음
const flyer = $('#flyer'), flyerWrap = $('#flyerWrap'), histIntro = $('#histIntro'), toAsk = $('#toAsk');
function openTarget() {
  if (!viewer || viewer.mode !== 'column') return;
  const p = viewer.project(TARGET), mr = mvEl.getBoundingClientRect();
  viewer.setInteractive(false); viewer.setMagnet(false); viewer.setHighlight(false);
  haptic(10);
  showFlyer(p ? { x: mr.left + p.x, y: mr.top + p.y } : null);
}
async function showFlyer(from) {                            // from 없으면(질문에서 뒤로) 펼친 채로 바로
  const my = ++seq;
  setStep(4);
  flyerWrap.getAnimations().forEach((a) => a.cancel());
  if (!from || reduceMotion) { flyer.classList.remove('folded'); histIntro.classList.add('show'); toAsk.classList.add('ready'); return; }
  flyer.classList.add('folded'); histIntro.classList.remove('show'); toAsk.classList.remove('ready');
  void flyerWrap.offsetWidth;
  const r = flyerWrap.getBoundingClientRect();
  const dx = from.x - (r.left + r.width / 2), dy = from.y - (r.top + r.height / 2);
  flyerWrap.animate([
    { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(.34) rotate(-6deg)`, opacity: 0 },
    { opacity: 1, offset: 0.12 },
    { transform: 'none', opacity: 1 },
  ], { duration: 950, easing: 'cubic-bezier(.2,.75,.2,1)' });
  await sleep(260); if (my !== seq) return;
  flyer.classList.remove('folded');                         // 가운데로 오는 동안 아래 단 → 위 단 순서로 펼쳐진다
  haptic(12);
  await sleep(1200); if (my !== seq) return;
  histIntro.classList.add('show');
  await sleep(1040); if (my !== seq) return;                // 누른 뒤 약 2.5초 — 읽을 즈음 질문 버튼
  toAsk.classList.add('ready');
}
function toColumn() {                                       // 안내문·질문 → 칼럼
  seq++;
  setStep(2);
  if (viewer) { viewer.setHighlight(true); viewer.setInteractive(true); viewer.setMagnet(true); }
}

// ── 5 질문 — 칼럼의 두 포스터가 떼어져(아래쪽부터 들리며) 앞으로 떠오른다. 보러 갈 포스터를 누르면 그 포스터가 눈앞으로(종이가 펄럭이며), 다른 포스터는 칼럼으로 돌아가 붙는다 (정답 없음)
const papers = $('#papers');
let deciding = false;
function columnPoint(side) {                                 // 칼럼 몸통 위, 두 포스터가 붙어 있던 자리(화면 px)
  const r = mvEl.getBoundingClientRect();
  return { x: r.left + r.width * (0.5 + side * 0.09), y: r.top + r.height * 0.47 };
}
function toColumnFrames(el, side) {                          // 이 종이를 칼럼 자리로 보내는 transform
  const r = el.getBoundingClientRect(), c = columnPoint(side);
  const dx = c.x - (r.left + r.width / 2), dy = c.y - (r.top + r.height * 0.4);
  return `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, -260px) rotateY(${side * -42}deg) scale(.4)`;
}
function peelIn() {
  if (reduceMotion) return;
  $$('.paper', papers).forEach((p, i) => {
    const side = i ? 1 : -1;
    p.getAnimations().forEach((a) => a.cancel());
    p.classList.remove('float');
    const from = toColumnFrames(p, side);
    const a = p.animate([
      { transform: from, filter: 'brightness(.45)', opacity: 0, transformOrigin: '50% 0%' },
      { opacity: 1, offset: 0.1 },
      { transform: `${from.replace(/scale\(\.4\)/, 'scale(.44)')} rotateX(34deg)`, filter: 'brightness(.6)', offset: 0.28, transformOrigin: '50% 0%' },   // 아래쪽이 먼저 들린다
      { transform: `translate3d(0, -18px, 60px) rotateX(-10deg) rotateY(${side * 12}deg) rotateZ(${side * -3}deg) scale(1.04)`, filter: 'brightness(1.08)', offset: 0.78, transformOrigin: '50% 30%' },
      { transform: 'none', filter: 'brightness(1)', transformOrigin: '50% 40%' },
    ], { duration: 1500, delay: 120 + i * 200, easing: 'cubic-bezier(.33,.1,.25,1)', fill: 'backwards' });
    a.finished.then(() => { if (step === 5) p.classList.add('float'); }).catch(() => {});
    $('.paper-lb', p).animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: 1200 + i * 200, easing: 'ease', fill: 'backwards' });
  });
}
function goAsk(from) {
  seq++; askFrom = from; deciding = false;
  if (viewer) { viewer.setInteractive(false); viewer.setMagnet(false); viewer.setHighlight(false); }
  document.body.classList.remove('settled'); setStep(5);
  papers.classList.remove('decided', 'today');
  $$('.paper', papers).forEach((x) => { x.classList.remove('pick', 'back', 'me', 'float'); x.setAttribute('aria-checked', 'false'); x.style.removeProperty('--k'); x.getAnimations().forEach((a) => a.cancel()); });
  const q = $('.ask-q'); if (!q.dataset.split) { q.dataset.split = 1; q.innerHTML = q.innerHTML.split('<br>').map((t) => `<span class="ln">${t}</span>`).join('<br>'); }
  peelIn();
}
// 안내문 → 질문: 펼친 안내문이 다시 접히며 칼럼으로 돌아간 뒤, 두 포스터가 떼어진다
toAsk.addEventListener('click', async () => {
  if (step !== 4) return;
  const my = ++seq;
  if (!reduceMotion) {
    flyer.classList.add('folded'); histIntro.classList.remove('show'); toAsk.classList.remove('ready');
    const r = flyerWrap.getBoundingClientRect(), c = columnPoint(0);
    await flyerWrap.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${(c.x - r.left - r.width / 2).toFixed(1)}px, ${(c.y - r.top - r.height / 2).toFixed(1)}px) scale(.3) rotate(4deg)`, opacity: 0 }], { duration: 720, delay: 380, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished.catch(() => {});
    if (my !== seq) return;
  }
  flyerWrap.getAnimations().forEach((a) => a.cancel());
  goAsk(4);
});
$$('.paper', papers).forEach((b) => b.addEventListener('click', async () => {
  if (step !== 5 || deciding) return;
  deciding = true; stance = b.dataset.k; const my = seq;
  $$('.paper', papers).forEach((x) => { const on = x === b; x.classList.toggle('pick', on); x.classList.toggle('back', !on); x.setAttribute('aria-checked', on); x.classList.remove('float'); });
  papers.classList.add('decided');
  haptic(14);
  // 고르지 않은 포스터는 칼럼으로 돌아가 붙는다
  const other = $('.paper.back', papers);
  if (!reduceMotion) other.animate([{ transform: 'none', filter: 'brightness(1)', opacity: 1 }, { transform: toColumnFrames(other, other.dataset.k === 'jury' ? -1 : 1), filter: 'brightness(.4)', opacity: 0 }], { duration: 1100, easing: 'cubic-bezier(.5,0,.25,1)', fill: 'forwards' });
  else other.animate([{ opacity: 1 }, { opacity: 0.3 }], { duration: 300, fill: 'forwards' });
  await sleep(reduceMotion ? 120 : 1250);
  if (my !== seq || step !== 5) return;                     // 기다리는 사이 뒤로
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
  // 내 포스터의 사본이 수집함 아이콘으로 줄어들며 들어간다 — 원본은 제자리(아래 점 무리와 짝이 맞게)
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
$('#again').addEventListener('click', () => { if (step === 6) goAsk(askFrom); });   // 다시 고르기 — 두 포스터가 다시 떠오른다

// ── 뒤로 — 어느 단계에서든 한 단계 뒤로: 결과 → 질문 → (안내문 또는 칼럼) → 스캔 → 목록
$('#backBtn').addEventListener('click', () => {
  if (step === 1) { location.href = 'index.html'; return; }
  if (step === 'rise' || step === 2) { toScan(); return; }
  if (step === 3) { if (viewer) viewer.release(); return; }   // 'release' 이벤트가 2로 돌려 놓는다
  if (step === 4) { toColumn(); return; }
  if (step === 5) { if (askFrom === 4) showFlyer(null); else toColumn(); return; }
  if (step === 6) { goAsk(askFrom); return; }
});

setStep(1);
streetIntro();
// 검수용
window.__c1 = {
  get loaded() { return loaded; }, get step() { return step; }, viewer,
  scan, focus: (i) => viewer && viewer.focusItem(i), inspect: openPrint, project: (i) => viewer && viewer.project(i), get stance() { return stance; },
};
if (new URLSearchParams(location.search).has('debug')) window.__mv = viewer;
