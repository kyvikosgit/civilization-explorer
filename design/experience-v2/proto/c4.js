// C4 나다르 사진관 — 두 화면(3D 장면은 c4-3d.js)
//   0. 들어가기: 나다르가 찍은 35, boulevard des Capucines 정면(밤) · 서명 간판이 한 글자씩 · 마그네슘 섬광 → 붉은 방 안으로(같은 캔버스, 끊김 없이)
//   1. 사진관 벽(3D): 24명의 초상화가 살롱식으로 — 액자마다 몰딩 단면 · 크기 · 깊이 · 기울기가 다르고, 찬장 위 · 이젤에도 놓였다.
//      카메라가 벽을 따라 천천히 흐르고 끌면 둘러본다. 액자를 누르면 그 사람이 섬광과 함께 사진으로 현상된다(다시 누르면 니스 빛으로 그림).
//      아래 "초상화 | 사진"을 누르면 벽 전체가 누른 쪽에서부터 물결처럼 바뀐다. "당신이라면?" → 2.
//   2. 질문: 3D 벽이 어둠으로 물러나고, 뒤로 흐릿한 두 줄기(왼쪽 그림은 위로, 오른쪽 사진은 아래로) 위에 "사람을 남긴다면, 그림입니까 사진입니까?".
//      반쪽을 누르면 사진 = 섬광과 연기, 그림 = 니스 빛 → 그쪽 줄기가 화면을 채운다 → 두 줄기가 오늘의 비율대로 나뉘고 큰 숫자가 올라간다. 뒤로(‹) → 1.
//      끝 단추 공통: [처음으로 | 수집함에 저장] + 다시 고르기(글자 링크). 저장은 수집함(기기 안)으로, 이미지 내려받기 아님
//   (+) 내 초상(선택): 전면 카메라(또는 데모 이미지) → 노출 4초 → 같은 한 장에서 두 벌: 19세기 사진(booth/js/nadar.js) · 유화 초상(c4-paint.js)
//      → 한 틀 안에서 가운데 막대를 끌어 비교(왼쪽 초상화 | 오른쪽 사진)
// 인물 · 출처: js/c4-people.json · 얼굴 틀: img/c4p/build.py · 거리 사진: img/c4n/build.py. 서버 없음, 업로드 없음.
import { loadImage, startCamera, stopCamera, cameraErrorText, toast } from '../../../booth/js/common.js';
import { saveChoice } from './js/proto-common.js';
import { stampLine } from './js/crowd.js';
import * as N from '../../../booth/js/nadar.js';
import { createSteam } from './js/fx-steam.js';
import { createNadar } from './c4-3d.js';
import * as P from './c4-paint.js';

const $ = (s) => document.querySelector(s);
const $$ = (q) => Array.from(document.querySelectorAll(q));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stage = $('#ask'), qView = $('#qView');
const thumb = (id, k) => `img/c4p/${id}-${k}.jpg`;
// 명함판 대지 아래 금 글씨 — 기록에 있는 스튜디오만
const STUDIO = { '나다르': 'Nadar', '에티엔 카르자': 'Ét. Carjat', '피에르 프티': 'Pierre Petit', '헤르만 비오브': 'H. Biow', 'A. 그레이너': 'A. Greiner' };
const buzz = () => { if (navigator.vibrate) navigator.vibrate(8); };

// ── 탭 — 내 초상에서는 3D 를 멈추고 감춘다
const gl = $('#gl');
$$('.tab').forEach((t) => t.addEventListener('click', () => {
  $$('.tab').forEach((x) => { const on = x === t; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
  $$('.screen').forEach((s) => { s.hidden = s.dataset.screen !== t.dataset.tab; });
  const me = t.dataset.tab === 'me';
  if (!me) stopCamera($('#cam'));
  gl.hidden = me || view === 'q'; document.body.classList.toggle('on-me', me);
  if (N3) N3.setActive(!me && view !== 'q' && document.visibilityState === 'visible');
  syncFlow();
  window.scrollTo(0, 0);
}));
// 뒤로: 질문 화면이면 벽으로, 벽(또는 내 초상)이면 목록으로
$('#back').addEventListener('click', (e) => { if (!stage.hidden && view === 'q') { e.preventDefault(); showWall(); } });

// 걸 순서(칸 · 액자 양식은 c4-3d.js 의 BAYS). 사람 목록 자체는 c4-people.json 그대로 — 여기선 어느 액자에 걸지만 정한다
const HANG = ['gautier', 'hugo', 'morisot', 'delacroix', 'bazille', 'cezanne', 'corot', 'pissarro', 'zola', 'baudelaire', 'monet', 'renoir',
  'courbet', 'bernhardt', 'manet', 'ingres', 'millet', 'sand', 'liszt', 'caillebotte', 'michelet', 'rossini', 'berlioz', 'dore'];
let PEOPLE = [], BYID = {}, N3 = null, view = 'wall';

// ── 그림 ↔ 사진: 액자를 누르면 그 사람만, 아래 단추로 벽 전체(물결)
function tapFrame(id) {
  if (!N3 || view !== 'wall') return;
  N3.setPerson(id, !N3.isPhoto(id)); buzz(); hint(false);
  const n = PEOPLE.filter((p) => N3.isPhoto(p.id)).length;
  if (n === PEOPLE.length) segUI('photo'); else if (!n) segUI('paint');
}
let mode = 'paint';
function segUI(m) { mode = m; $('#seg').dataset.m = m; $$('#seg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.m === m)); }
function setMode(m) { segUI(m); if (N3 && N3.setAll(m === 'photo')) buzz(); hint(false); }
$$('#seg button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.m)));
const hint = (on) => $('#wHint').classList.toggle('off', !on);

// ── 질문 뒤 두 줄기: 반쪽 폭에 두 칸 엇갈림(한 줄 간격 rs, 24장 = 12줄 → 주기 12·rs). 그림 줄기는 위로, 사진 줄기는 아래로 초당 10px, 흐리게
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(a, rnd) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function stream(k, Wh, seed) {
  const rnd = rng(seed), order = shuffle(PEOPLE.map((p) => p.id), rnd), w = Math.round(Wh * 0.4), h = Math.round(w * (k === 'paint' ? 1.25 : 1.5)), rs = h + 30, H = 12 * rs;
  const one = (dy) => order.map((id, i) => {
    const c = i % 2, x = Math.round(c ? Wh * 0.53 : Wh * 0.07) + Math.round((rnd() - 0.5) * 8), y = Math.floor(i / 2) * rs + (c ? rs / 2 : 0) + dy;
    return `<i class="qt ${k}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><img src="${thumb(id, k)}" alt="" draggable="false" decoding="async"></i>`;
  }).join('');
  return { html: one(0) + one(H), H };
}
let qAnims = [], qsW = 0;
const up = (h) => [{ transform: 'translateY(0)' }, { transform: `translateY(${-h}px)` }], down = (h) => [{ transform: `translateY(${-h}px)` }, { transform: 'translateY(0)' }];
function buildStreams() {
  const W = Math.round(stage.getBoundingClientRect().width); if (!W || W === qsW || !PEOPLE.length) return;
  qsW = W; qAnims.forEach((a) => a.cancel()); qAnims = [];
  const Wh = Math.round(W / 2), sp = stream('paint', Wh, 21), so = stream('photo', Wh, 23);
  [['#qsPaint', sp], ['#qsPhoto', so]].forEach(([q, st]) => { const t = $(q); t.style.width = `${Wh}px`; t.style.marginLeft = `${-Wh / 2}px`; t.style.height = `${st.H * 2}px`; t.innerHTML = st.html; });
  if (REDUCED) return;
  const b1 = $('#qsPaint').animate(up(sp.H), { duration: (sp.H / 10) * 1000, iterations: Infinity }), b2 = $('#qsPhoto').animate(down(so.H), { duration: (so.H / 10) * 1000, iterations: Infinity });
  b1.currentTime = 0.3 * b1.effect.getTiming().duration; b2.currentTime = 0.6 * b2.effect.getTiming().duration;
  qAnims = [b1, b2]; syncFlow();
}
function syncFlow() {
  const on = !stage.hidden && view === 'q' && document.visibilityState === 'visible';
  qAnims.forEach((a) => { if (on && a.playState !== 'running') a.play(); else if (!on && a.playState === 'running') a.pause(); });
}
document.addEventListener('visibilitychange', syncFlow);
let rsT = 0; addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(buildStreams, 200); });

// ── 화면 전환 — 3D 벽은 어둠으로 물러나고(멈춤) 두 줄기가 떠오른다. 돌아오면 벽이 다시 밝아지며 흐른다
let doorBusy = false, glT = 0;
function showQ() {
  if (doorBusy || view === 'q') return;
  doorBusy = true; buzz(); pick(null);
  buildStreams();
  view = 'q'; stage.dataset.view = 'q'; document.body.classList.add('on-q');
  qView.classList.remove('q-in'); void qView.offsetWidth; qView.classList.add('q-in');
  syncFlow();
  clearTimeout(glT); glT = setTimeout(() => { if (view !== 'q') return; gl.hidden = true; if (N3) N3.setActive(false); }, REDUCED ? 0 : 650);
  setTimeout(() => { doorBusy = false; }, REDUCED ? 0 : 500);
  setTimeout(() => qView.classList.remove('q-in'), 2000);
}
function showWall() {
  if (view !== 'q') return;
  pick(null);
  clearTimeout(glT); gl.hidden = false;
  view = 'wall'; stage.dataset.view = 'wall'; document.body.classList.remove('on-q');
  if (N3) N3.setActive(document.visibilityState === 'visible');
  syncFlow();
}
$('#toQ').addEventListener('click', showQ);

// ── 고르기
const STANCES = { paint: { label: '그림', full: '그림으로', pct: 44 }, photo: { label: '사진', full: '사진으로', pct: 56 } };   // 예시 수치
const VISITORS = '1,712';
let stance = null, revealT = 0, countRaf = 0;
const flood = $('#flood');
function pick(k) {
  stance = k; clearTimeout(revealT); cancelAnimationFrame(countRaf);
  if (k) qView.dataset.pick = k; else delete qView.dataset.pick;
  qView.classList.remove('split', 'swept'); qView.style.setProperty('--pa', '50%'); qView.style.setProperty('--pp', '50%');
  $('#reveal').classList.remove('on');
  if (!k) { flood.className = 'flood'; return; }
  $('#mineHead').textContent = `${STANCES[k].full} 남긴다.`;
  $('#mineSubHead').textContent = k === 'paint' ? '화가가 보고 그린 대로' : '렌즈 앞에 앉은 그대로';
  buzz();
  // 사진 쪽 = 마그네슘 섬광, 그림 쪽 = 따뜻한 니스 빛
  if (!REDUCED) {
    flood.className = 'flood'; void flood.offsetWidth; flood.className = `flood ${k}`;
    if (k === 'photo') { try { const r = stage.getBoundingClientRect(), sm = createSteam($('#smoke'), { res: 0.5, tints: ['250,250,252', '236,238,246'] }); sm.burst(r.left + r.width * 0.68, r.top + r.height * 0.7, 34, { speed: 240, size: [120, 240], life: [1.0, 1.7], alpha: 0.16, w: r.width * 0.55, h: r.height * 0.18 }); } catch (e) { /* noop */ } }
  }
  revealT = setTimeout(reveal, REDUCED ? 0 : 1050);
}
$$('.half').forEach((b) => b.addEventListener('click', () => { if (!stance) pick(b.dataset.k); }));

// ── 오늘의 관람객: 화면을 채운 반쪽이 물러나며 두 반쪽이 오늘의 비율대로 다시 나뉜다(폭 = 비율). 그 위에 큰 숫자가 0에서 올라가고, 끝나면 빛이 한 번 지나간다. 점은 쓰지 않는다
const KEYS = ['paint', 'photo'];
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
function reveal() {
  if (!stance) return;
  const rv = $('#reveal'); rv.classList.add('on'); $('#rvScroll').scrollTop = 0;
  $('#crowdStamp').textContent = stampLine(VISITORS);
  $('#spCap').textContent = `오늘의 관람객 ${VISITORS}명`;
  markSaved($('#saveStance'), false);
  qView.style.setProperty('--sheetH', `${rv.offsetHeight + 8}px`);
  const sns = KEYS.map((k) => { const el = $(`.sn[data-k="${k}"]`); el.classList.toggle('me', k === stance); return el.querySelector('.cnt'); });
  const pa = STANCES.paint.pct;
  qView.classList.add('split');
  requestAnimationFrame(() => { qView.style.setProperty('--pa', `${pa}%`); qView.style.setProperty('--pp', `${100 - pa}%`); });
  if (REDUCED) { sns.forEach((c, i) => { c.textContent = STANCES[KEYS[i]].pct; }); return; }
  const t0 = performance.now() + 250, D = 1250;
  const step = (now) => {
    const x = Math.max(0, Math.min(1, (now - t0) / D)), e = easeOut(x);
    sns.forEach((c, i) => { c.textContent = Math.round(STANCES[KEYS[i]].pct * e); });
    if (x < 1) countRaf = requestAnimationFrame(step); else { qView.classList.add('swept'); buzz(); }
  };
  countRaf = requestAnimationFrame(step);
}
$('#again').addEventListener('click', () => pick(null));

// ── 끝 단추 공통: 처음으로(체험 목록) · 수집함에 저장(이미지 내려받기 아님) → 같은 자리에서 '수집함에 담았어요'(자리 · 높이 그대로)
function markSaved(b, on) { b.disabled = on; b.textContent = on ? '수집함에 담았어요' : '수집함에 저장'; }
$('#saveStance').addEventListener('click', () => {
  const b = $('#saveStance'); if (!stance || b.disabled) return;
  const s = STANCES[stance];
  saveChoice('c4', { stance, label: s.label, pct: s.pct });   // 기기 안에만 · 출구 화면이 읽는다
  markSaved(b, true); buzz(); toast('수집함에 저장했습니다');
});

// ── 들어가기(3D 거리 → 섬광 → 사진관). 누르면 건너뜀. 화면 위층: 안개(2D) · 흰 섬광 · 마그네슘 연기
let introState = 'load';
const intro = $('#intro');
let mist = null;
if (!REDUCED) {
  try {
    mist = createSteam($('#inMist'), { res: 0.35, tints: ['96,94,118', '80,76,96', '120,96,110'] });
    const ih = innerHeight;
    mist.emitter({ x: -60, y: ih * 0.9, jx: 40, rate: 8, vx: 4, wind: 26, vy: [1, 5], size: [220, 340], grow: [20, 40], alpha: [0.08, 0.15], life: [5, 8] });
    mist.emitter({ x: innerWidth * 0.5, y: ih * 0.99, jx: innerWidth * 0.6, rate: 5, vx: 8, wind: 10, vy: [2, 8], size: [200, 320], grow: [16, 30], alpha: [0.07, 0.13], life: [4, 7] });
    mist.prewarm(5); mist.start();
  } catch (e) { mist = null; }
}
const enterUI = () => { stage.classList.add('entered'); document.body.classList.remove('intro-on'); };
function introFlash(fast) {
  introState = 'flash';
  intro.classList.remove('flash'); void intro.offsetWidth; intro.classList.add(fast ? 'flash-q' : 'flash');
  if (REDUCED || fast) return;
  try {
    const sm = createSteam($('#smoke'), { res: 0.5, tints: ['250,250,252', '236,238,246', '255,246,232'] });
    sm.burst(innerWidth / 2, innerHeight * 0.4, 36, { speed: 300, size: [160, 300], life: [1.0, 1.7], alpha: 0.14, w: innerWidth * 0.8, h: innerHeight * 0.25 });
    setTimeout(() => sm.burst(innerWidth / 2, innerHeight * 0.5, 12, { speed: 180, size: [220, 360], life: [0.9, 1.4], alpha: 0.12 }), 140);
  } catch (e) { /* noop */ }
}
function introOut() {
  if (introState === 'done') return; introState = 'done';
  enterUI(); intro.classList.add('out');
  setTimeout(() => { intro.hidden = true; if (mist) mist.stop(); }, 900);
}
const skip = () => { if (N3 && introState !== 'done') N3.skipIntro(); };
intro.addEventListener('click', skip);
intro.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); skip(); } });
window.__c4intro = { skip };

// ── 시작: 인물 목록 → 3D 장면(그림 · 사진 48장, 거리 사진, 간판 글꼴을 받은 뒤) → 들어가기
(async () => {
  const data = await fetch('js/c4-people.json').then((r) => r.json());
  PEOPLE = data.people; PEOPLE.forEach((p) => { BYID[p.id] = p; });
  buildStreams();
  const order = [...HANG.filter((id) => BYID[id]), ...PEOPLE.map((p) => p.id).filter((id) => !HANG.includes(id))].map((id) => BYID[id]);
  await Promise.race([document.fonts ? document.fonts.load('80px Sacramento').catch(() => {}) : null, new Promise((r) => setTimeout(r, 1500))]);
  try {
    N3 = await createNadar({ canvas: gl, reduced: REDUCED, people: order, thumb, studioOf: (id) => STUDIO[BYID[id].photo.by] || '', onTap: tapFrame, onDragStart: () => hint(false) });
  } catch (e) {
    console.error('[c4] 3d', e); toast('이 기기에서는 3D 사진관을 열 수 없습니다'); introOut(); return;
  }
  N3.bindInput($('#wallView'));
  introState = 'run'; intro.classList.add('go');
  N3.playIntro({
    onFlash: (fast) => introFlash(fast),
    onEnter: () => { setTimeout(introOut, REDUCED ? 0 : 260); },
    onDone: () => { stage.classList.add('ready'); },
  });
})();

// ── 내 초상 — 카메라(또는 데모 이미지) → 노출 4초 → 같은 한 장(3:4)에서 사진 · 초상화 두 벌 → 한 틀 안 가운데 막대로 비교
const video = $('#cam'), plate = $('#plate'), still = $('#still'), duo = $('#duo');
let source = null;   // 'cam' | 'demo'
const DEMO = '../../../booth/assets/concept/c4_demo_portrait.jpg';
function meState(s) {
  $('#meActions').hidden = s !== 'idle';
  $('#meShoot').hidden = s !== 'ready';
  $('#meDone').hidden = s !== 'done';
  const done = s === 'done';
  plate.hidden = done; duo.hidden = !done; $('#plateFoot').hidden = done;
  document.body.classList.toggle('me-done', done);
  $('#meSub').textContent = done ? '가운데 막대를 끌어 보세요' : '노출 4초 · 사진과 초상화, 기기 안에서만';
}
async function camOn() {
  try {
    await startCamera(video, 'user');
    $('#camOff').hidden = true; still.hidden = true; video.hidden = false;
    source = 'cam'; meState('ready');
  } catch (e) {
    $('#camMsg').textContent = `${cameraErrorText(e)} 아래 ‘데모 이미지로’를 눌러 이어갈 수 있습니다.`;
  }
}
async function demoOn() {
  stopCamera(video);
  still.src = DEMO; still.hidden = false; video.hidden = true; $('#camOff').hidden = true;
  source = 'demo'; meState('ready');
}
$('#camStart').addEventListener('click', camOn);
$('#camDemo').addEventListener('click', demoOn);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frame2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
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
function runWorker(comp, kind, ms = 12000) {
  const w = comp.width, h = comp.height;
  const data = comp.getContext('2d').getImageData(0, 0, w, h);
  const wk = new Worker('../../../booth/js/filters-worker.js');
  return new Promise((res, rej) => {
    const t = setTimeout(() => { wk.terminate(); rej(new Error('worker_timeout')); }, ms);
    wk.onmessage = (e) => { clearTimeout(t); wk.terminate(); const m = e.data; if (m.error) return rej(new Error(m.error));
      const c = document.createElement('canvas'); c.width = m.w; c.height = m.h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(m.buf), m.w, m.h), 0, 0); res(c); };
    wk.onerror = () => { clearTimeout(t); wk.terminate(); rej(new Error('worker_error')); };
    wk.postMessage({ id: 1, w, h, buf: data.data.buffer, kinds: [kind] }, [data.data.buffer]);
  });
}
let frames = null;   // { paint, photo } — 900×1220 두 장, 창은 같은 자리
async function exposeAndDevelop() {
  if (!source) return;
  const count = $('#count'), num = $('#countNum'), busy = $('#busy'), bt = $('#busyTxt');
  count.hidden = false; $('#meShoot').hidden = true;
  for (let n = 4; n >= 1; n--) { num.textContent = n; await sleep(REDUCED ? 250 : 1000); }
  count.hidden = true;
  const snap = grab();
  stopCamera(video);
  if (source === 'cam') { still.src = snap.toDataURL('image/jpeg', 0.9); still.hidden = false; video.hidden = true; }
  bt.textContent = '사진 현상 중'; busy.hidden = false;
  await frame2();
  let comp, card;
  try {
    comp = N.cropTo34(snap);
    try { card = N.renderPhoto19(comp, null); }
    catch (e) { console.warn('[c4] webgl', e); try { card = N.mountFallback(await runWorker(comp, 'photo')); } catch (err) { console.warn('[c4] worker', err); card = N.quickPhoto(comp); } }
  } catch (e) { console.error(e); busy.hidden = true; meState('ready'); return toast('현상에 실패했습니다. 다시 찍어 주세요.'); }
  // 같은 한 장을 화가가 그린다 — 붓질 수만 번(1–3초)
  bt.textContent = '초상화 그리는 중'; await frame2();
  let painted;
  try { painted = P.paintPortrait(comp); }
  catch (e) { console.warn('[c4] paint', e); try { painted = await runWorker(comp, 'paint'); } catch (err) { console.warn('[c4] paint worker', err); painted = comp; } }
  frames = { paint: P.framePaint(painted), photo: P.framePhoto(card) };
  [['#duoPaint', frames.paint], ['#duoPhoto', frames.photo]].forEach(([q, f]) => { const c = $(q); c.width = f.width; c.height = f.height; c.getContext('2d').drawImage(f, 0, 0); });
  busy.hidden = true;
  markSaved($('#saveMe'), false);
  meState('done');
  slider.reset();
}
$('#shoot').addEventListener('click', exposeAndDevelop);
$('#again2').addEventListener('click', () => { frames = null; slider.stop(); if (source === 'cam') { meState('idle'); camOn(); } else demoOn(); });

// ── 가운데 막대 — 틀 어디를 눌러 끌어도 따라온다. 끄는 동안은 손가락 그대로, 눌러 옮길 때는 부드럽게 따라붙는다
//    보이는 것만 움직인다: 덮개(초상화)는 바깥 상자 · 안쪽 그림을 서로 반대로 옮겨(transform) 잘라 보인다 — 다시 그리기 없음
const slider = (() => {
  const clip = $('#duoClip'), inner = $('#duoPaint'), handle = $('#duoHandle'), labP = $('#labPaint'), labF = $('#labPhoto');
  let W = 0, pos = 0.5, target = 0.5, drag = null, raf = 0, intro = null;
  const apply = () => {
    const x = Math.round(pos * W * 2) / 2;
    clip.style.transform = `translate3d(${x - W}px,0,0)`; inner.style.transform = `translate3d(${W - x}px,0,0)`;
    handle.style.transform = `translate3d(${x}px,0,0)`;
    labP.style.opacity = Math.min(1, Math.max(0, (pos - 0.14) / 0.1)); labF.style.opacity = Math.min(1, Math.max(0, (0.86 - pos) / 0.1));
    const v = Math.round(pos * 100); handle.setAttribute('aria-valuenow', v); handle.setAttribute('aria-valuetext', `초상화 ${v}% · 사진 ${100 - v}%`);
  };
  const tick = (now) => {
    raf = 0;
    if (intro) { const t = Math.min(1, (now - intro.t0) / intro.d); target = intro.f(t); if (t >= 1) intro = null; pos = target; }
    else if (drag || REDUCED) pos = target;
    else pos += (target - pos) * 0.22;
    if (Math.abs(target - pos) < 0.0006) pos = target;
    apply();
    if (intro || pos !== target) raf = requestAnimationFrame(tick);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  const measure = () => { W = duo.offsetWidth; apply(); };   // offsetWidth — 나타나는 동안의 scale 에 흔들리지 않게
  const at = (e) => { const r = duo.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); };
  duo.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    intro = null; drag = { id: e.pointerId }; duo.classList.add('dragging');
    try { duo.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
    target = at(e); kick();
    if (e.pointerType !== 'mouse') e.preventDefault();
  });
  duo.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; target = at(e); pos = target; kick(); });
  const end = (e) => { if (!drag || e.pointerId !== drag.id) return; drag = null; duo.classList.remove('dragging'); };
  duo.addEventListener('pointerup', end); duo.addEventListener('pointercancel', end); duo.addEventListener('lostpointercapture', end);
  handle.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: -0.05, ArrowRight: 0.05, PageDown: -0.2, PageUp: 0.2, Home: -1, End: 1 }[e.key];
    if (k === undefined) return; e.preventDefault(); intro = null;
    target = Math.min(1, Math.max(0, target + k)); kick();
  });
  addEventListener('resize', () => { if (!duo.hidden) measure(); });
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  return {
    // 처음엔 가운데. 움직임을 줄이지 않았다면 한 번 살짝 좌우로 — 끌 수 있다는 걸 보여 준다(손대면 바로 멈춤)
    reset() {
      measure(); pos = target = 0.5; apply();
      if (REDUCED) return;
      const t0 = performance.now() + 650;
      intro = { t0, d: 1500, f: (t) => (t <= 0 ? 0.5 : 0.5 + Math.sin(ease(t) * Math.PI * 2) * 0.11 * (1 - t * 0.3)) };
      kick();
    },
    stop() { intro = null; },
    get pos() { return pos; }, set: (v) => { intro = null; target = v; kick(); },
  };
})();

$('#saveMe').addEventListener('click', () => {
  const b = $('#saveMe'); if (!frames || b.disabled) return;
  // 수집함(기기 안)에 반반 한 장 — 왼쪽 초상화 | 오른쪽 사진. 작은 크기로만(기기 저장 공간)
  let img = '';
  try { img = P.duoCard(frames.paint, frames.photo, 300).toDataURL('image/jpeg', 0.72); } catch (e) { /* noop */ }
  saveChoice('c4me', { kind: 'portrait-duo', img });
  markSaved(b, true); buzz(); toast('수집함에 저장했습니다');
});
meState('idle');
void loadImage;
// 검수용
window.__c4 = { get stance() { return stance; }, get intro() { return introState; }, get people() { return PEOPLE.length; }, get view() { return view; }, get mode() { return mode; },
  get photos() { return N3 ? PEOPLE.filter((p) => N3.isPhoto(p.id)).length : 0; }, get flowing() { return !!N3 && N3.flowing; }, get frames() { return N3 ? N3.frames : 0; },
  pick, setMode, showQ, showWall, tapFrame, get n3() { return N3; }, get slider() { return slider; }, get duo() { return !!frames; } };
// 다른 페이지로 — 화면이 어둠으로 잠긴 뒤 넘어간다(끊긴 페이지 전환 없이)
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]'); if (!a || a.hasAttribute('download') || e.defaultPrevented || a.target) return;
  e.preventDefault(); document.body.classList.add('leaving'); setTimeout(() => { location.href = a.href; }, REDUCED ? 0 : 430);
});
