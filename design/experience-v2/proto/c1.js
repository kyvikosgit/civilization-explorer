// C1 시민사회 — 어느 전시를 보러 갈까
//   무대: 해 질 녘 카퓌신 대로 — 모네의 그림을 저녁빛으로 깔고 가스등이 하나씩 켜지며 멀리 마차 등불이 오간다(DOM)
//   1 역할+스캔: 칼럼은 처음부터 거리에 서 있고 점선 윤곽이 겹친다. 누르면(스캔) → 카메라가 걸어 칼럼 앞으로(칼럼은 솟지 않는다)
//   → 2 둘러보기: 끌어서 칼럼을 돌린다. 포스터·만평 어느 것이든 눌러 떼어 읽고(3 · 한 줄 설명).
//        이번 주말 두 전시의 안내문 — 살롱 1874 공고 · 독립 전시 안내 — 이 같은 모양(세 번 접혀 압정 하나에 갓 꽂힌 종이)으로 칼럼 양쪽에 같은 거리로 꽂혀 있다.
//        단서도 같다(바람에 들리고 가스등에 윤). 오래 못 찾으면 가까운 쪽으로 칼럼이 천천히 돌고 바람이 한 번 분다
//   → 4 찾은 안내문이 압정에서 빠져 가운데로 오며 세 단이 펼쳐진다(끌어서 돌려 볼 수 있다 · 두 번 누르면 정면) · 한 줄 설명(두 전시 같은 짜임) · 놋쇠 명판 '두 전시 나란히 보기' · '칼럼 더 둘러보기'
//        뒤로·바깥·'칼럼 더 둘러보기' → 펼친 채 같은 압정에 다시 꽂히고(찾은 표시), 칼럼 아래에 같은 명판이 남는다
//   → 5 명판: 펼친 것은 제자리(살롱 왼쪽 · 독립 전시 오른쪽)로, 다른 하나는 칼럼에서 떼어져 오고(접혀 있었으면 펼쳐지며)
//        포스터를 누르면 같은 장면에서 그 포스터가 가운데로 크게(돌려 볼 수 있다) + 자세한 설명(같은 항목·같은 길이), 다른 하나는 옆으로 어둡게(누르면 바꾼다)
//        → '이 전시에 가기' 명판으로 정한다. 바깥·'둘 다 보기'·뒤로 → 나란히. 나란히에서 뒤로 → 두 인쇄물이 칼럼 제자리로
//   → 6 오늘의 관람객(점 없이, 두 포스터가 비율만큼 커지고 작아지며 숫자가 센다). 끝 줄은 모든 체험 공통 [처음으로 | 수집함에 저장]
//        + 아래 조용한 글자 단추 '다시 고르기'(→ 5) · '칼럼 더 둘러보기'(→ 2). 뒤로 → 5
//   3D 칼럼 = 부스 morris-viewer.js 사본 + 확장 (js/morris-viewer-proto.js). 두 전시 인쇄물·샴 만평 지면은 캔버스 조판(js/c1-posters.js)
//   머문 시간·시선 추적 없음. 서버는 입장 2개의 숫자만(여기서는 예시 수치).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { $, $$, icons, toast, sleep, reduceMotion, haptic, saveChoice } from './js/proto-common.js';
import { createMorrisViewer } from './js/morris-viewer-proto.js';
import { ITEMS, NOTES, FILLER, BACKDROP, VISITORS } from './js/morris-items-proto.js';
import { stampLine } from './js/crowd.js';
import { drawSalon, drawExpo, drawExpoCover, drawSalonCover, drawClipping, loadImage, loadPosterFonts, imageURL } from './js/c1-posters.js';

icons();
const mvEl = $('#mv'), pill = $('#pill'), pillWrap = $('#pillWrap'), guide = $('#guide'), camLoading = $('#camLoading'), streetEl = $('#street');
// 두 전시 — 이름은 그대로(살롱 · 독립 전시), 아래에 장소·날짜 한 줄. 키(jury/viewer)는 출구 데이터와 맞춘 내부 값
const STANCES = {
  jury: { label: '살롱', where: '샹젤리제 궁 · 5월 1일', fr: 'Salon de 1874', pct: 38 },
  viewer: { label: '독립 전시', where: '카퓌신 대로 35번지 · 4월 15일', fr: '35, bd des Capucines', pct: 62 },   // 예시 수치
};
// 4 펼친 안내문의 머리·한 줄 — 두 전시를 같은 짜임으로(무엇인지 · 어떻게 걸리는지 · 언제 어디서)
const NOTE_TEXT = {
  salon: { cap: 'Avis · Palais des Champs-Élysées', intro: '나라가 해마다 여는 공식 전람회, <b>살롱</b>입니다.<br>심사를 거친 작품이 걸리고, 5월 1일 샹젤리제 궁에서 문을 엽니다.' },
  expo: { cap: 'Prospectus · 35, boulevard des Capucines', intro: '화가·조각가 서른 명이 함께 여는 <b>독립 전시</b>입니다.<br>심사 없이 회원의 작품이 걸리고, 4월 15일 카퓌신 대로에서 문을 엽니다.' },
};
const OTHER = { salon: 'expo', expo: 'salon' };
const KEY_NOTE = { jury: 'salon', viewer: 'expo' };
let step = 1, stance = null;
let seq = 0;                                                // 뒤로 등으로 흐름이 바뀌면 올려서, 기다리던 비동기 단계를 무효로
const found = { salon: false, expo: false };               // 찾아서 한 번 펼친 안내문 — 이후 칼럼에는 펼친 채 꽂혀 있다
const anyFound = () => found.salon || found.expo;
let openNote = null;                                        // 4 에서 펼쳐 든 안내문
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

// ── 두 전시 인쇄물(재현) — 캔버스 조판. 칼럼 텍스처·펼치는 안내문·두 포스터가 모두 같은 그림
await loadPosterFonts();
const ART = { salon: { full: drawSalon(), cover: drawSalonCover() }, expo: { full: drawExpo(), cover: drawExpoCover() } };
const URLS = {};
const urlsReady = Promise.all(['salon', 'expo'].flatMap((n) => ['full', 'cover'].map((k) => imageURL(ART[n][k]).then((u) => { (URLS[n] = URLS[n] || {})[k] = u; })))).then(() => {
  $('.notice.salon').style.backgroundImage = `url(${URLS.salon.full})`;
  $('.notice.expo').style.backgroundImage = `url(${URLS.expo.full})`;
});
// 샴 만평 — 그림(작다)을 받아 신문지 지면으로 조판. 지면 비율이 칼럼 위 종이 크기를 정하므로 먼저 만든다
const clips = {};
await Promise.all(ITEMS.filter((it) => it.clip).map((it) => loadImage(it.clip.src).then((im) => { clips[it.id] = drawClipping(im, it.clip); }).catch((e) => console.warn('[clip]', it.id, e))));

// ── 3D 모리스 칼럼
let loaded = false; const waiters = [];
const whenLoaded = () => (loaded ? Promise.resolve() : new Promise((r) => waiters.push(r)));
let picked = -1, focusWait = null;
let viewer = null;
const GEN = { salon: ART.salon.full, expo: ART.expo.full, salonCover: ART.salon.cover, expoCover: ART.expo.cover };
try {
  viewer = createMorrisViewer(THREE, RoomEnvironment, mvEl, {
    items: ITEMS.map((it) => ({
      ...it, active: true,
      img: GEN[it.gen] || clips[it.id] || null,
      ratio: clips[it.id] ? clips[it.id].height / clips[it.id].width : it.ratio || 1.2,
    })),
    filler: FILLER, backdrop: BACKDROP, onEvent,
  });
} catch (e) { console.error(e); }
const NOTE_OF = {};                                         // 칼럼 인쇄물 번호 → 'salon' · 'expo'
Object.entries(NOTES).forEach(([n, v]) => { NOTE_OF[v.folded] = n; NOTE_OF[v.open] = n; });
// 해 질 녘 — 배경은 비워 뒤의 DOM 거리(가스등·마차)가 보이게, 빛은 따뜻한 가스등 쪽으로. 포석은 어둡고 젖은 쪽으로
if (viewer) {
  viewer.setAmbience({ transparent: true, key: 0.62, keyColor: 0xffd3a2, fill: 0.22, fillColor: 0x8a96c8, hemi: 0.16, exposure: 0.98, fog: 0x1b1722, overhead: 4.0, overheadColor: 0xffc887, ground: 0x3b3833, groundRough: 0.5, groundEnv: 0.18 });
  viewer.setGlow(false);
  viewer.setIdle(false);
  viewer.setPosterHidden(NOTES.salon.open, true); viewer.setPosterHidden(NOTES.expo.open, true);
  viewer.setInteractive(false);
}
function onEvent(type, d) {
  if (type === 'loaded') { loaded = true; waiters.splice(0).forEach((r) => r()); camLoading.classList.add('off'); showStanding(); }
  else if (type === 'error') console.warn('[morris]', d && d.message);
  else if (type === 'arrived') { if (step === 'approach') arrive(); }
  else if (type === 'focused') { const w = focusWait; focusWait = null; if (w) w(); }
  else if (type === 'tap' && step === 2) { if (NOTE_OF[d.index]) openNoteFrom(NOTE_OF[d.index]); else openPrint(d.index); }
  else if (type === 'tapMiss' && step === 2) nudge('바랜 포스터는 단단히 붙어 있어요');
  else if (type === 'settled' && step === 3) attachLoop();
  else if (type === 'release' && step === 3) { leaveInspect(); toHunt(); }
  else if (type === 'centered' && step === 2) { haptic(8); const n = NOTE_OF[d.index]; if (n && !found[n] && viewer) viewer.gust(2.2); }
}
const waitFocus = (ms) => Promise.race([new Promise((r) => { focusWait = r; }), sleep(ms)]);

let introDone = false;
async function streetIntro() {
  buildCars();
  if (reduceMotion) { $$('.lamp').forEach((l) => l.classList.add('lit')); document.body.classList.add('role-in'); introDone = true; showStanding(); return; }
  document.body.classList.add('intro'); streetEl.classList.add('push');
  const lamps = $$('.lamp');
  const skip = () => { if (introDone) return; introDone = true; lamps.forEach((l) => l.classList.add('lit')); document.body.classList.remove('intro'); document.body.classList.add('role-in'); showStanding(); };
  $('#stage').addEventListener('pointerdown', skip, { once: true });
  await sleep(450);
  for (const l of lamps) { if (introDone) return; l.classList.add('lit'); await sleep(170); }
  await sleep(150);
  skip();
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
const GH = 4.165, GPAD = 0.05;
(function buildGuide() {
  const pt = ([r, y]) => `${r.toFixed(3)},${(GH - y).toFixed(3)}`;
  const right = PROFILE.map(pt), left = PROFILE.slice().reverse().map(([r, y]) => pt([-r, y]));
  const outline = `M${right.join(' L')} L${left.join(' L')} Z`;
  const bands = [[0.5, 0.728], [0.5, 2.906], [0.545, 3.02], [0.545, 3.11]].map(([r, y]) => `M${pt([-r, y])} L${pt([r, y])}`).join(' ');
  const svg = $('#guideSvg');
  svg.setAttribute('viewBox', `-0.68 -${GPAD} 1.36 ${GH + GPAD * 2}`);
  svg.innerHTML = `<path class="g-fill" d="${outline}"/><path class="g-band" d="${bands}"/><path class="g-draw" pathLength="1" d="${outline}"/><path class="g-line" d="${outline}"/>`;
})();
// 먼 시점 — 3D 칼럼이 점선 윤곽과 겹치도록(꼭대기·밑동 px). 화면 크기가 바뀌면 다시
function frameToGuide() {
  if (!viewer) return;
  const g = $('#guideSvg').getBoundingClientRect(), m = mvEl.getBoundingClientRect();
  if (!g.height || !m.height) return;
  const k = g.height / (GH + GPAD * 2);
  viewer.frameFar(g.top - m.top + GPAD * k, g.top - m.top + (GPAD + GH) * k);
}
// 칼럼은 처음부터 거리에 서 있다 — 준비되면(칼럼 생성 + 거리 도입 끝) 저녁 거리 속에 드러난다
function showStanding() {
  if (!loaded || !introDone || !viewer || step !== 1) return;
  viewer.resize(); frameToGuide(); viewer.setFar(1);
  mvEl.classList.remove('off');
}
window.addEventListener('resize', () => { if (step === 1 && viewer) { viewer.resize(); frameToGuide(); } });
let pillT = 0;
function setPill(text, ok = false) {   // 끌 때는 글자를 남긴 채 사라지게 — 빈 알약이 잠깐 보이지 않게
  clearTimeout(pillT);
  if (!text) { pillWrap.classList.add('off'); pillT = setTimeout(() => { pill.textContent = ''; pill.classList.remove('found'); }, 320); return; }
  pill.textContent = text; pill.classList.toggle('found', ok); pillWrap.classList.remove('off');
}

let scanning = false;
async function scan() {
  if (scanning || step !== 1) return;
  scanning = true; const my = seq;
  guide.classList.add('found');
  setPill('모리스 칼럼을 인식했어요', true);
  haptic(30);
  if (!loaded) { camLoading.classList.remove('off'); await whenLoaded(); camLoading.classList.add('off'); }
  if (!introDone) { introDone = true; $$('.lamp').forEach((l) => l.classList.add('lit')); document.body.classList.remove('intro'); document.body.classList.add('role-in'); }
  showStanding();
  await sleep(reduceMotion ? 150 : 650);
  if (my !== seq || step !== 1) { scanning = false; return; }   // 기다리는 사이 뒤로를 눌렀다
  setStep('approach');
  guide.classList.add('off');
  setPill('');
  streetEl.classList.add('near');                           // 거리도 함께 가까워진다(먼 배경이라 조금만)
  if (viewer) viewer.approach(reduceMotion ? 0 : 2.9, 0);   // 카메라가 보도를 걸어 다가간다 → 'arrived'
  else arrive();
  scanning = false;
}
guide.addEventListener('click', scan);
function arrive() {                                         // 칼럼 앞 — 가스등이 한 번 부풀고, 갓 꽂힌 두 안내문이 바람에 한 번 들린다
  document.body.classList.remove('landed'); void document.body.offsetWidth; document.body.classList.add('landed');
  haptic(12);
  if (viewer && !anyFound()) setTimeout(() => { if (step === 2) viewer.gust(1.6); }, 500);
  enterHunt();
}

// ── 2 둘러보기
let huntT = 0, lastTouch = 0, assisted = false, huntTimer = 0;
mvEl.addEventListener('pointerdown', () => { lastTouch = performance.now(); }, { passive: true });
const dock = $('#toAsk2');
function huntUI() {                                         // 하나라도 찾은 뒤에는 한 줄 + 칼럼 아래 놋쇠 명판
  const f = anyFound();
  document.body.classList.toggle('found', f);
  dock.classList.toggle('ready', f); dock.tabIndex = f ? 0 : -1;
  if (found.salon && found.expo) $('#huntLine').innerHTML = '칼럼의 다른 포스터와 <em>만평</em>도<br>떼어 읽어 볼 수 있어요';
  else if (f) $('#huntLine').innerHTML = '다른 전시의 안내문도<br>칼럼 어딘가에 꽂혀 있어요';
}
function toHunt() {
  seq++;
  setStep(2); huntUI();
  if (viewer) { viewer.setHighlight(true); viewer.setInteractive(true); viewer.setMagnet(true); }
}
function enterHunt() {
  toHunt();
  clearInterval(huntTimer);
  huntTimer = setInterval(() => {
    if (step !== 2 || anyFound() || !viewer) return;
    huntT += 1;
    if (!assisted && huntT >= 22 && performance.now() - lastTouch > 4000) {
      assisted = true;
      // 지금 보는 방향에서 더 가까운 안내문 쪽으로(어느 전시든) — 걸어서 칼럼을 도는 빠르기
      const face = -viewer.rot + 0.12, d = (a) => Math.abs(((a - face) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      const n = d(NOTES.salon.ang) <= d(NOTES.expo.ang) ? 'salon' : 'expo';
      viewer.focusItem(NOTES[n].folded, 1.1);
      setTimeout(() => { if (step === 2) { viewer.gust(2.8); nudge('어디선가 종이가 바람에 팔랑입니다', 3200); } }, reduceMotion ? 0 : 2600);
    }
  }, 1000);
}
let nudgeT = 0;
function nudge(text, ms = 1800) {
  const sub = $('#huntSub'), keep = sub.dataset.keep || (sub.dataset.keep = sub.innerHTML);
  clearTimeout(nudgeT);
  sub.classList.add('nudge'); sub.textContent = text;
  nudgeT = setTimeout(() => { sub.classList.remove('nudge'); sub.innerHTML = keep; }, ms);
}
function toScan() {                                         // 칼럼 → 스캔 화면: 카메라가 다시 물러나 점선 윤곽 자리로
  seq++; scanning = false;
  setStep(1); guide.classList.remove('off', 'found'); setPill('칼럼을 스캔하세요');
  streetEl.classList.remove('near');
  if (!camLoading.classList.contains('off') && loaded) camLoading.classList.add('off');
  if (viewer) { viewer.setInteractive(false); viewer.setMagnet(false); frameToGuide(); viewer.approach(reduceMotion ? 0 : 1.3, 1); }
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
$('#closeBtn').addEventListener('click', () => {
  if (step === 3 && viewer) viewer.release();
  else if (step === 4) noteBack();
});

// ── 4 안내문 — 처음: 칼럼의 그 자리(같은 크기)에서 압정을 빠져나와 가운데로 날아오며 세 단이 펼쳐진다 · 다시: 펼친 채 꽂혀 있던 것이 그대로
const flyer = $('#flyer'), flyerWrap = $('#flyerWrap'), histIntro = $('#histIntro'), plaque = $('#toAsk'), unfoldCap = $('#unfoldCap');
function rectOnScreen(i) {                                  // 칼럼 위 인쇄물 → 화면 좌표 사각형
  if (!viewer) return null;
  const r = viewer.projectRect(i), mr = mvEl.getBoundingClientRect();
  return r ? { cx: mr.left + r.cx, cy: mr.top + r.cy, w: r.w, h: r.h } : null;
}
function flyerAt(i) {                                       // 칼럼 위 안내문(접힌 · 펼친) → 화면의 DOM 안내문 변환
  const r = rectOnScreen(i), w = flyerWrap.getBoundingClientRect();
  if (!r || !w.width) return null;
  return `translate(${(r.cx - (w.left + w.width / 2)).toFixed(1)}px, ${(r.cy - (w.top + w.height / 2)).toFixed(1)}px) scale(${(r.w / w.width).toFixed(3)})`;
}
function setFlyerArt(n) {                                   // 펼치는 DOM 안내문에 그 전시의 그림
  if (!URLS[n]) return;
  $$('#flyer .strip .f').forEach((el) => { el.style.backgroundImage = `url(${URLS[n].full})`; });
  $('#flyer .strip.t .b').style.backgroundImage = `url(${URLS[n].cover})`;
  flyer.dataset.note = n;
  unfoldCap.textContent = NOTE_TEXT[n].cap; histIntro.innerHTML = NOTE_TEXT[n].intro;
}
async function openNoteFrom(n) {
  if (!viewer || viewer.mode !== 'column') return;
  await urlsReady;
  const first = !found[n];
  found[n] = true; openNote = n;
  viewer.setInteractive(false); viewer.setMagnet(false);
  haptic(12);
  showNote(n, first ? 'folded' : 'open');
}
function resetFlyerUI(shown) {
  [flyerWrap, flyer, plaque].forEach((e) => e.getAnimations().forEach((a) => a.cancel()));
  [histIntro, unfoldCap].forEach((e) => e.classList.toggle('show', shown));
  plaque.classList.toggle('ready', shown);
  $('#backCol4').classList.toggle('show', shown);
}
async function showNote(n, from) {
  const my = ++seq;
  flyTilt.reset();
  setFlyerArt(n);
  setStep(4);
  document.body.classList.remove('leaving', 'returning');
  $('#closeBtn').hidden = false;
  const src = from === 'folded' ? NOTES[n].folded : NOTES[n].open;
  if (reduceMotion) {
    if (viewer) { viewer.setPosterHidden(NOTES[n].folded, true); viewer.setPosterHidden(NOTES[n].open, true); }
    resetFlyerUI(true); flyer.classList.remove('folded');
    return;
  }
  resetFlyerUI(false);
  flyer.classList.toggle('folded', from === 'folded');
  void flyerWrap.offsetWidth;
  const at = flyerAt(src);
  if (viewer) { viewer.setPosterHidden(NOTES[n].folded, true); viewer.setPosterHidden(NOTES[n].open, true); }
  if (at) {
    flyerWrap.animate([
      { transform: at, filter: 'brightness(.62)' },
      { transform: at.replace(/scale\(([\d.]+)\)/, (m, k) => `scale(${(+k * 1.12).toFixed(3)})`) + ' translateY(-6px) rotateX(18deg)', filter: 'brightness(.75)', offset: 0.16 },   // 압정에서 빠지며 아래가 들린다
      { transform: 'translateY(-14px) rotate(-1.5deg)', filter: 'brightness(1)', offset: 0.78 },
      { transform: 'none', filter: 'brightness(1)' },
    ], { duration: from === 'folded' ? 1050 : 900, easing: 'cubic-bezier(.3,.1,.2,1)' });
  }
  if (from === 'folded') {
    await sleep(640); if (my !== seq) return;
    flyer.classList.remove('folded');                       // 가운데로 오며 아래 단 → 위 단 순서로 펼쳐진다
    haptic(12);
    await sleep(900); if (my !== seq) return;
  } else { await sleep(620); if (my !== seq) return; }
  unfoldCap.classList.add('show');
  histIntro.classList.add('show');
  await sleep(from === 'folded' ? 1000 : 450); if (my !== seq) return;
  plaque.classList.add('ready');
  $('#backCol4').classList.add('show');
}
// 4 → 2: 펼친 채 같은 압정에 다시 꽂힌다(찾은 표시). 어두운 판은 날아가는 동안 걷힌다
async function noteBack() {
  if (step !== 4 || !openNote) return;
  const my = ++seq, n = openNote, idx = NOTES[n].open;
  flyTilt.reset();
  document.body.classList.add('returning');
  $('#closeBtn').hidden = true;
  if (!reduceMotion) {
    const to = flyerAt(idx);
    if (to) {
      setTimeout(() => { if (my === seq && viewer) viewer.setPosterHidden(idx, false); }, 700);   // 닿기 직전에 3D 종이를 먼저 — 사라지는 틈이 없게
      await flyerWrap.animate([
        { transform: 'none', filter: 'brightness(1)', opacity: 1 },
        { transform: 'translateY(-10px) rotate(-1deg)', filter: 'brightness(.95)', opacity: 1, offset: 0.2 },
        { transform: to, filter: 'brightness(.62)', opacity: 1, offset: 0.9 },
        { transform: to, filter: 'brightness(.62)', opacity: 0 },
      ], { duration: 820, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' }).finished.catch(() => {});
      if (my !== seq) return;
    }
  }
  if (viewer) viewer.setPosterHidden(idx, false);
  document.body.classList.remove('returning');
  openNote = null;
  toHunt();
  setTimeout(() => { if (step !== 4) resetFlyerUI(false); }, 500);
}
$('#backCol4').addEventListener('click', noteBack);
$('.unfold-dim').addEventListener('click', () => { if (step === 4) noteBack(); });

// ── 5 두 전시 나란히 · 질문
const papers = $('#papers');
const PAPER = { salon: $('.paper.salon', papers), expo: $('.paper.expo', papers) };
const goBtn = $('#go');
let deciding = false;
function resetPapers() {
  deciding = false; focusK = null; unfoldBody.classList.remove('focusing');
  papers.classList.remove('decided', 'today');
  goBtn.classList.remove('ready', 'pressed'); goBtn.tabIndex = -1;
  $$('.paper', papers).forEach((x) => { x.style.visibility = ''; x.classList.remove('pick', 'back', 'me', 'float', 'sel', 'unsel'); x.setAttribute('aria-checked', 'false'); x.style.removeProperty('--k'); x.getAnimations().forEach((a) => a.cancel()); $$('*', x).forEach((c) => c.getAnimations().forEach((a) => a.cancel())); });
}
function rectOf(el) { const r = el.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height }; }
// 칼럼 위 인쇄물 하나를 떼어 질문 자리(포스터 p)로 — 아래가 먼저 들리며 떨어져 나와 앞으로 온다. 접혀 있던 것은 오는 동안 펼쳐진다(가운데 단부터)
function peel(p, idx, folded, delay = 0) {
  const sn = rectOf($('.notice', p));
  let src = rectOnScreen(idx);
  if (!src) { const mr = mvEl.getBoundingClientRect(); src = { cx: mr.left + mr.width / 2, cy: mr.top + mr.height * 0.45, w: sn.w * 0.5 }; }
  const k = (src.w / sn.w).toFixed(3), tx = (src.cx - sn.cx).toFixed(1), ty = (src.cy - sn.cy).toFixed(1);
  p.animate([
    { transform: `translate3d(${tx}px, ${ty}px, 0) scale(${k})`, filter: 'brightness(.5)', transformOrigin: '50% 50%' },
    { transform: `translate3d(${tx}px, ${(+ty - 4).toFixed(1)}px, 30px) rotateX(28deg) scale(${(k * 1.05).toFixed(3)})`, filter: 'brightness(.62)', offset: 0.24, transformOrigin: '50% 50%' },
    { transform: 'translate3d(0, -14px, 50px) rotateX(-8deg) rotateY(10deg) scale(1.03)', filter: 'brightness(1.06)', offset: 0.8, transformOrigin: '50% 40%' },
    { transform: 'none', filter: 'brightness(1)', transformOrigin: '50% 40%' },
  ], { duration: 1350, delay, easing: 'cubic-bezier(.33,.1,.25,1)', fill: 'backwards' });
  if (folded) $('.notice', p).animate([{ clipPath: 'inset(33.4% 0 33.4% 0)' }, { clipPath: 'inset(33.4% 0 33.4% 0)', offset: 0.3 }, { clipPath: 'inset(0 0 33.4% 0)', offset: 0.55 }, { clipPath: 'inset(0 0 0 0)' }], { duration: 1350, delay, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'backwards' });
  $('.paper-lb', p).animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: delay + 1100, easing: 'ease', fill: 'backwards' });
}
// 다른 하나를 칼럼에서 — 찾았으면 펼친 것, 아니면 접힌 것
function peelNote(n, delay = 0) {
  const folded = !found[n], idx = folded ? NOTES[n].folded : NOTES[n].open;
  if (viewer) viewer.setPosterHidden(idx, true);
  PAPER[n].style.visibility = 'visible';
  peel(PAPER[n], idx, folded, delay);
  found[n] = true;                                          // 나란히 본 뒤 칼럼으로 돌아가면 둘 다 펼친 채 꽂힌다
}
const midAng = () => { const a = NOTES.salon.ang, b = NOTES.expo.ang; let d = ((b - a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; return a + d / 2; };
// 4 → 5: 펼쳐 든 것은 화면의 그 자리에서 제 포스터 자리로, 다른 하나는 칼럼에서
plaque.addEventListener('click', async () => {
  if (step !== 4 || !plaque.classList.contains('ready') || !openNote) return;
  const my = ++seq, n = openNote, o = OTHER[n];
  flyTilt.reset();
  haptic(16);
  plaque.classList.add('pressed');
  if (reduceMotion) { found[o] = true; openNote = null; goAsk(); return; }
  document.body.classList.add('leaving');
  if (viewer) viewer.focusItem(found[o] ? NOTES[o].open : NOTES[o].folded, 3.6);   // 뒤의 칼럼이 다른 안내문 쪽으로 돈다
  await waitFocus(900); if (my !== seq) return;
  const fr = rectOf(flyerWrap);
  openNote = null;
  goAsk(true);
  PAPER[o].style.visibility = 'hidden';
  const nn = rectOf($('.notice', PAPER[n]));
  PAPER[n].animate([
    { transform: `translate(${(fr.cx - nn.cx).toFixed(1)}px, ${(fr.cy - nn.cy).toFixed(1)}px) scale(${(fr.w / nn.w).toFixed(3)})`, transformOrigin: '50% 50%' },
    { transform: 'none', transformOrigin: '50% 50%' },
  ], { duration: 900, easing: 'cubic-bezier(.45,0,.2,1)' });
  $('.paper-lb', PAPER[n]).animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: 1500, easing: 'ease', fill: 'backwards' });
  await sleep(300); if (my !== seq) return;
  peelNote(o);
  haptic(10);
  await sleep(1400); if (my !== seq || step !== 5) return;
  $$('.paper', papers).forEach((p) => p.classList.add('float'));
});
// 2 → 5: 칼럼 아래 명판 — 칼럼이 두 안내문 사이로 돌고, 둘이 차례로 떼어져 온다
dock.addEventListener('click', async () => {
  if (step !== 2 || !anyFound() || !viewer || viewer.mode !== 'column') return;
  const my = ++seq;
  haptic(16);
  dock.classList.add('pressed');
  viewer.setInteractive(false); viewer.setMagnet(false);
  if (reduceMotion) { viewer.focusAngle(midAng(), 3, true); found.salon = found.expo = true; goAsk(); dock.classList.remove('pressed'); return; }
  document.body.classList.add('leaving');
  viewer.focusAngle(midAng(), 4.2);
  await sleep(1100); if (my !== seq) return;
  goAsk(true);
  dock.classList.remove('pressed');
  PAPER.salon.style.visibility = 'hidden'; PAPER.expo.style.visibility = 'hidden';
  requestAnimationFrame(() => {
    if (my !== seq) return;
    peelNote('salon');
    setTimeout(() => { if (my === seq) { peelNote('expo'); haptic(10); } }, 260);
  });
  await sleep(1700); if (my !== seq || step !== 5) return;
  $$('.paper', papers).forEach((p) => p.classList.add('float'));
});
function goAsk(flown = false) {
  seq += flown ? 0 : 1;
  if (viewer) {                                             // 날아오는 길(flown)이면 칼럼 위 두 인쇄물은 떼어지는 순간 숨긴다(peel)
    viewer.setInteractive(false); viewer.setMagnet(false);
    if (!flown) { Object.values(NOTES).forEach((v) => { viewer.setPosterHidden(v.folded, true); viewer.setPosterHidden(v.open, true); }); }
  }
  document.body.classList.remove('settled', 'leaving', 'returning');
  $('#closeBtn').hidden = true;
  setStep(5);
  document.body.classList.toggle('flown', flown);
  resetPapers();
  plaque.classList.remove('pressed');
  if (!flown && !reduceMotion) {                            // 결과에서 다시 고르기 · 뒤로 — 두 포스터가 제자리에서 다시 떠오른다
    $$('.paper', papers).forEach((p, i) => p.animate([{ opacity: 0, transform: 'translateY(14px) rotateX(-12deg)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: i * 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
    setTimeout(() => { if (step === 5) $$('.paper', papers).forEach((p) => p.classList.add('float')); }, 900);
  }
}
// 5·6 → 2: 두 인쇄물이 칼럼의 제자리로 돌아가 붙는다. 어두운 판은 그동안 걷힌다
async function papersBack() {
  const my = ++seq;
  if (viewer) viewer.focusAngle(midAng(), 3, true);        // 흐린 판 뒤에서 — 두 안내문이 보이는 쪽으로
  const pairs = [[PAPER.salon, NOTES.salon.open], [PAPER.expo, NOTES.expo.open]];
  found.salon = found.expo = true;
  const ghosts = pairs.map(([p, idx]) => {
    const nEl = $('.notice', p), r = nEl.getBoundingClientRect();
    const g = nEl.cloneNode(true); g.classList.add('col-ghost');
    Object.assign(g.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', opacity: getComputedStyle(p).opacity });
    document.body.appendChild(g);
    p.style.visibility = 'hidden';
    return { g, r, idx, t: rectOnScreen(idx) };
  });
  document.body.classList.add('returning');
  document.body.classList.remove('settled');
  setStep(2); huntUI();
  if (reduceMotion) { ghosts.forEach(({ g, idx }) => { g.remove(); if (viewer) viewer.setPosterHidden(idx, false); }); }
  else {
    await Promise.all(ghosts.map(({ g, r, idx, t }, i) => {
      if (!t) { g.remove(); return null; }
      const tx = t.cx - (r.left + r.width / 2), ty = t.cy - (r.top + r.height / 2), k = t.w / r.width;
      const a = g.animate([
        { transform: 'none', filter: 'brightness(1)', opacity: +g.style.opacity || 1 },
        { transform: `translate(${(tx * 0.35).toFixed(1)}px, ${(ty * 0.35 - 12).toFixed(1)}px) scale(${(1 + (k - 1) * 0.3).toFixed(3)}) rotate(${i ? 1.5 : -1.5}deg)`, filter: 'brightness(.9)', opacity: 1, offset: 0.35 },
        { transform: `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${k.toFixed(3)})`, filter: 'brightness(.6)', opacity: 1, offset: 0.9 },
        { transform: `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${k.toFixed(3)})`, filter: 'brightness(.6)', opacity: 0 },
      ], { duration: 950, delay: i * 140, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' });
      setTimeout(() => { if (viewer) viewer.setPosterHidden(idx, false); }, i * 140 + 760);
      return a.finished.catch(() => {}).then(() => g.remove());
    }));
  }
  if (viewer) { viewer.setPosterHidden(NOTES.salon.open, false); viewer.setPosterHidden(NOTES.expo.open, false); }
  document.body.classList.remove('returning', 'flown');
  if (my !== seq) return;
  resetPapers();
  if (viewer) { viewer.setHighlight(true); viewer.setInteractive(true); viewer.setMagnet(true); }
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
// 종이 돌려 보기 — 끌면 그 각도로 돌아가 멈춘다(튕기지 않는다). 뒷면이 보이기 전까지만. 두 번 누르면 정면으로. 빛 띠와 그늘이 각도를 따라 움직인다
function makeTilt(handle, target, { maxY = 52, maxX = 20 } = {}) {
  let ry = 0, rx = 0, drag = null, lastTap = 0;
  const apply = () => {
    target.style.setProperty('--ry', ry.toFixed(2) + 'deg'); target.style.setProperty('--rx', rx.toFixed(2) + 'deg');
    target.style.setProperty('--sh', (ry / maxY).toFixed(3));
    target.style.setProperty('--shade', (Math.abs(ry) / maxY * 0.16 + Math.abs(rx) / maxX * 0.06).toFixed(3));
  };
  handle.addEventListener('pointerdown', (e) => {
    if (!handle.isConnected || e.button > 0) return;
    drag = { x: e.clientX, y: e.clientY, ry, rx, moved: false, id: e.pointerId };
    try { handle.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
    target.classList.add('tilting');
    e.stopPropagation();
  });
  handle.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    ry = Math.max(-maxY, Math.min(maxY, drag.ry + dx * 0.42));
    rx = Math.max(-maxX, Math.min(maxX, drag.rx - dy * 0.28));
    apply();
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved; drag = null;
    target.classList.remove('tilting');
    if (!moved) { const now = performance.now(); if (now - lastTap < 340) { reset(); lastTap = 0; } else lastTap = now; }
  };
  handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
  handle.addEventListener('click', (e) => e.stopPropagation());
  function reset() { ry = 0; rx = 0; target.classList.remove('tilting'); apply(); }
  apply();
  return { reset, get moved() { return !!drag && drag.moved; } };
}
// 4 펼친 안내문도 돌려 볼 수 있다(펼친 뒤에만)
$$('#flyer .strip .f').forEach((f) => { const b = document.createElement('b'); b.className = 'fsh'; f.appendChild(b); });
const flyTilt = makeTilt(flyerWrap, flyer);

// 5 자세히 보기 — 누른 포스터가 같은 장면 가운데로 크게 오고(돌려 볼 수 있다) 아래에 설명, 다른 하나는 옆으로 물러나 어둡게
//   두 전시의 설명은 같은 항목·같은 길이로(확인된 사실만 — 출처는 아래)
//   살롱 1874: 5월 1일 샹젤리제 궁(산업궁) 개막, 국가(공공교육·종교·미술부)가 열고 심사위원단이 출품작을 고른다, 작가 2,000여 명 · 3,700점 가까이
//     (입장료는 평일 1프랑·돈을 받지 않는 날이 있었다 — 도미에 〈입장료 없는 날〉 1852 등. 1874년 요금 문서는 찾지 못해 '보통 1프랑'으로만)
//   첫 전시: 화가·조각가·판화가 등의 협동조합(Société anonyme coopérative …), 4월 15일 ~ 5월 15일, 카퓌신 대로 35번지 나다르의 옛 사진관,
//     입장 1프랑, 낮 10~6시 · 저녁 8~10시, 도록에 30명 · 165항목(Wikipedia 'First Impressionist Exhibition', 프랑스 문화부 '1874 – Première exposition')
const DETAIL = {
  jury: { title: '살롱 1874', fr: 'Salon de 1874', rows: [
    ['무엇', '나라가 해마다 여는 공식 미술 전람회'],
    ['여는 곳', '공공교육·미술부 — 출품작은 심사위원단이 고른다'],
    ['언제·어디', '5월 1일 개막 · 샹젤리제 궁'],
    ['입장료', '보통 1프랑, 돈을 받지 않는 날도 있다'],
    ['규모', '작가 2,000여 명 · 3,700점 가까이'],
    ['볼 그림', '역사·신화화와 초상, 풍경까지. 매끈하게 다듬은 큰 그림이 벽을 위아래로 채운다'],
  ] },
  viewer: { title: '독립 전시', fr: 'Première exposition', rows: [
    ['무엇', '화가들이 직접 꾸린 회사가 여는 첫 전시'],
    ['여는 곳', '화가·조각가·판화가 협동조합 — 회원은 심사 없이 건다'],
    ['언제·어디', '4월 15일~5월 15일 · 카퓌신 대로 35번지'],
    ['입장료', '1프랑, 저녁 8시~10시에도 연다'],
    ['규모', '작가 30명 · 도록에 165점'],
    ['볼 그림', '모네·르누아르·드가·피사로·모리조·세잔 등. 바깥의 빛과 오늘의 파리를 빠른 붓질로'],
  ] },
};
const focusEl = $('#focus'), fSheet = $('#fSheet'), fSide = $('#fSide'), fInfo = $('#fInfo'), unfoldBody = $('.unfold-body');
const sheetTilt = makeTilt(fSheet, fSheet);
let focusK = null;
const ORDER = ['jury', 'viewer'];
const bgOf = (k) => `url(${URLS[KEY_NOTE[k]].full})`;
function fillFocus(k) {
  const o = ORDER.find((x) => x !== k);
  $('.f-front', fSheet).style.backgroundImage = bgOf(k);
  $('.f-front', fSheet).classList.toggle('expo', k === 'viewer'); $('.f-front', fSheet).classList.toggle('salon', k === 'jury');
  $('.notice', fSide).style.backgroundImage = bgOf(o);
  fSide.classList.toggle('left', o === 'jury'); fSide.classList.toggle('right', o === 'viewer');
  fSide.setAttribute('aria-label', `${STANCES[o].label} 보기`);
  const d = DETAIL[k];
  fInfo.innerHTML = `<div class="fi-hd"><b>${d.title}</b><i>${d.fr}</i></div>` + d.rows.map(([t, v]) => `<dt>${t}</dt><dd>${v}</dd>`).join('');
  $('#goFr').textContent = STANCES[k].fr;
  goBtn.setAttribute('aria-label', `${STANCES[k].label}에 가기`);
  $$('.paper', papers).forEach((x) => x.setAttribute('aria-checked', x.dataset.k === k));
}
function flipFrom(el, from, dur = 620, extra = {}) {   // el 의 지금 자리로, from 사각형에서 날아온다
  if (reduceMotion || !from) return null;
  const to = el.getBoundingClientRect();
  if (!to.width) return null;
  const k = from.width / to.width, tx = from.left + from.width / 2 - (to.left + to.width / 2), ty = from.top + from.height / 2 - (to.top + to.height / 2);
  return el.animate([{ transform: `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${k.toFixed(3)})`, ...extra.from }, { transform: 'none', ...extra.to }], { duration: dur, easing: 'cubic-bezier(.3,.1,.2,1)' });
}
const noticeRect = (k) => $(`.paper[data-k="${k}"] > .notice`, papers).getBoundingClientRect();
async function openFocus(k) {
  if (step !== 5 || deciding) return;
  const from = noticeRect(k), sideFrom = noticeRect(ORDER.find((x) => x !== k));
  focusK = k; sheetTilt.reset();
  fillFocus(k);
  unfoldBody.classList.add('focusing');
  goBtn.classList.add('ready'); goBtn.tabIndex = 0;
  haptic(8);
  flipFrom($('.f-stage', focusEl), from, 640);
  flipFrom(fSide, sideFrom, 640, { from: { opacity: 1 }, to: {} });
}
function swapFocus() {
  if (!focusK || deciding) return;
  const sheetR = $('.f-stage', focusEl).getBoundingClientRect(), sideR = $('.notice', fSide).getBoundingClientRect();
  focusK = ORDER.find((x) => x !== focusK); sheetTilt.reset();
  fillFocus(focusK);
  fInfo.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'ease' });
  flipFrom($('.f-stage', focusEl), sideR, 560);
  flipFrom(fSide, sheetR, 560);
  haptic(8);
}
async function closeFocus() {
  if (!focusK) return;
  const k = focusK, o = ORDER.find((x) => x !== k);
  const sheetR = $('.f-stage', focusEl).getBoundingClientRect(), sideR = $('.notice', fSide).getBoundingClientRect();
  focusK = null; sheetTilt.reset();
  unfoldBody.classList.remove('focusing');
  goBtn.classList.remove('ready'); goBtn.tabIndex = -1;
  $$('.paper', papers).forEach((x) => x.setAttribute('aria-checked', 'false'));
  const a = flipFrom($(`.paper[data-k="${k}"] > .notice`, papers), sheetR, 520);
  flipFrom($(`.paper[data-k="${o}"] > .notice`, papers), sideR, 520);
  if (a) await a.finished.catch(() => {});
}
$$('.paper', papers).forEach((b) => b.addEventListener('click', () => { if (step === 5 && !focusK) openFocus(b.dataset.k); }));
fSide.addEventListener('click', (e) => { e.stopPropagation(); swapFocus(); });
$('#bothBtn').addEventListener('click', (e) => { e.stopPropagation(); closeFocus(); });
focusEl.addEventListener('click', (e) => { if (!e.target.closest('.f-sheet, .f-side, .f-info, .plaque, .col-link')) closeFocus(); });
// 고르기 2 — '이 전시에 가기': 가운데의 포스터가 제자리로 돌아가 앞으로 나오고, 다른 하나는 칼럼으로
goBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  if (step !== 5 || deciding || !focusK) return;
  deciding = true; stance = focusK; const my = seq;
  goBtn.classList.add('pressed');
  haptic(14);
  await closeFocus();
  if (my !== seq || step !== 5) return;
  const b = $(`.paper[data-k="${stance}"]`, papers);
  $$('.paper', papers).forEach((x) => { const on = x === b; x.classList.toggle('pick', on); x.classList.toggle('back', !on); x.classList.remove('float'); });
  papers.classList.add('decided');
  const other = $('.paper.back', papers);
  if (!reduceMotion) other.animate([{ transform: 'none', filter: 'brightness(1)', opacity: 1 }, { transform: toColumnFrames(other, other.dataset.k === 'jury' ? -1 : 1), filter: 'brightness(.4)', opacity: 0 }], { duration: 1100, easing: 'cubic-bezier(.5,0,.25,1)', fill: 'forwards' });
  else other.animate([{ opacity: 1 }, { opacity: 0.3 }], { duration: 300, fill: 'forwards' });
  await sleep(reduceMotion ? 120 : 1250);
  if (my !== seq || step !== 5) return;
  deciding = false;
  reveal();
});

// ── 6 오늘의 관람객 — 점 없이. 두 포스터가 오늘의 비율만큼 커지고 작아진다(빛이 쓸고 지나가며 숫자가 센다)
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
  $('#crowdCols').innerHTML = KEYS.map((k) => { const s = STANCES[k], me = k === stance; return `<div class="crowd-col${me ? ' me' : ''}"><b class="n"><span>0</span><i>%</i></b><span class="lab">${s.label}${me ? ' · 나' : ''}</span><small class="where">${s.where}</small></div>`; }).join('');
  $('#crowdStamp').textContent = stampLine(VISITORS);
  if (!$('#collect').classList.contains('done')) $('#collect').disabled = false;
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
  saveChoice('c1', { stance, label: s.label, where: s.where, pct: s.pct });
  btn.classList.add('done'); btn.textContent = '수집함에 담았어요';   // 제자리에서 바뀐다 — 줄이 흔들리지 않게
});
$('#restart').addEventListener('click', () => { location.href = 'index.html'; });   // 처음으로 — 체험 목록으로
$('#again').addEventListener('click', () => { if (step === 6) goAsk(false); });   // 다시 고르기 — 두 포스터가 다시 떠오른다
$('#backCol6').addEventListener('click', () => { if (step === 6) papersBack(); });

// ── 뒤로 — 어느 단계에서든 한 단계 뒤로: 결과 → 질문 → 칼럼 · 펼친 안내문 → 칼럼 · 살펴보기 → 칼럼 · 칼럼 → 스캔 → 목록
$('#backBtn').addEventListener('click', () => {
  if (step === 1) { location.href = 'index.html'; return; }
  if (step === 'approach' || step === 2) { toScan(); return; }
  if (step === 3) { if (viewer) viewer.release(); return; }   // 'release' 이벤트가 2로 돌려 놓는다
  if (step === 4) { noteBack(); return; }
  if (step === 5) { if (focusK) { closeFocus(); return; } if (!document.body.classList.contains('leaving')) papersBack(); return; }
  if (step === 6) { goAsk(false); return; }
});

// 검수용
window.__c1 = {
  get loaded() { return loaded; }, get step() { return step; }, get found() { return { ...found }; }, viewer,
  scan, focus: (i) => viewer && viewer.focusItem(i), inspect: openPrint, project: (i) => viewer && viewer.projectRect(i), get stance() { return stance; },
  NOTES, ITEMS,
};
if (new URLSearchParams(location.search).has('debug')) window.__mv = viewer;
