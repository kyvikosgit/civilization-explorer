// C4 나다르 사진관 — 두 화면(3D 장면은 c4-3d.js)
//   0. 들어가기: 나다르가 찍은 35, boulevard des Capucines 정면(밤) · 서명 간판이 한 글자씩 · 마그네슘 섬광 → 붉은 방 안으로(같은 캔버스, 끊김 없이)
//   1. 사진관 벽(3D): 24명의 초상화가 살롱식으로 — 액자마다 몰딩 단면 · 크기 · 깊이 · 기울기가 다르고, 찬장 위 · 이젤에도 놓였다.
//      카메라가 벽을 따라 천천히 흐르고 끌면 둘러본다. 액자를 누르면 그 사람이 섬광과 함께 사진으로 현상된다(다시 누르면 니스 빛으로 그림).
//      아래 "초상화 | 사진"을 누르면 벽 전체가 누른 쪽에서부터 물결처럼 바뀐다. "당신이라면?" → 2.
//   2. 질문: 벽이 가장 가까운 칸 사이에서 두 문처럼 열리고(왼쪽 그림 · 오른쪽 사진) 그 위에 "사람을 남긴다면, 그림입니까 사진입니까?".
//      반쪽을 누르면 사진 = 섬광과 연기, 그림 = 니스 빛 → 그 문이 화면을 채운다 → 두 문이 닫히며 이음매가 오늘의 비율 자리로, 큰 숫자가 올라간다. 뒤로(‹) → 1.
//   (+) 내 초상(선택): 전면 카메라 → 노출 4초 → 부스 프로토타입의 19세기 사진 파이프라인(booth/js/nadar.js) 재사용
// 인물 · 출처: js/c4-people.json · 얼굴 틀: img/c4p/build.py · 거리 사진: img/c4n/build.py. 서버 없음, 업로드 없음.
import { loadImage, startCamera, stopCamera, cameraErrorText, toast } from '../../../booth/js/common.js';
import { saveChoice } from './js/proto-common.js';
import { stampLine } from './js/crowd.js';
import * as N from '../../../booth/js/nadar.js';
import { createSteam } from './js/fx-steam.js';
import { createNadar } from './c4-3d.js';

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
  gl.hidden = me; document.body.classList.toggle('on-me', me);
  if (N3) N3.setActive(!me && document.visibilityState === 'visible');
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

// ── 화면 전환 — 3D 벽이 두 문으로 열린다(왼쪽 그림 · 오른쪽 사진). 돌아올 때는 문이 닫히고 다시 흐른다
let doorBusy = false;
async function showQ() {
  if (doorBusy || view === 'q' || !N3) return;
  doorBusy = true; buzz(); pick(null);
  view = 'q'; stage.dataset.view = 'q';
  qView.classList.remove('q-in'); void qView.offsetWidth; qView.classList.add('q-in');
  await N3.toQuestion();
  doorBusy = false;
  setTimeout(() => qView.classList.remove('q-in'), 1600);
}
async function showWall() {
  if (doorBusy || !N3) return;
  doorBusy = true; pick(null, true);
  view = 'wall'; stage.dataset.view = 'wall';
  await N3.toWall();
  doorBusy = false;
}
$('#toQ').addEventListener('click', showQ);

// ── 고르기
const STANCES = { paint: { label: '그림', full: '그림으로', pct: 44 }, photo: { label: '사진', full: '사진으로', pct: 56 } };   // 예시 수치
const VISITORS = '1,712';
let stance = null, revealT = 0, countRaf = 0;
const flood = $('#flood');
function pick(k, noDoors = false) {
  const had = stance;
  stance = k; clearTimeout(revealT); cancelAnimationFrame(countRaf);
  if (N3 && view === 'q' && !noDoors) { if (k) N3.choose(k); else if (had) N3.unchoose(); }
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
let lastCard = null;
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
function reveal() {
  if (!stance) return;
  const rv = $('#reveal'); rv.classList.add('on'); $('#rvScroll').scrollTop = 0;
  $('#crowdStamp').textContent = stampLine(VISITORS);
  $('#spCap').textContent = `오늘의 관람객 ${VISITORS}명`;
  $('#mineCard').hidden = true; lastCard = null;
  const sv = $('#saveStance'); sv.disabled = false; sv.classList.remove('done'); $('#saveLab').textContent = '카드 저장';
  qView.style.setProperty('--sheetH', `${rv.offsetHeight + 8}px`);
  const sns = KEYS.map((k) => { const el = $(`.sn[data-k="${k}"]`); el.classList.toggle('me', k === stance); return el.querySelector('.cnt'); });
  const pa = STANCES.paint.pct;
  qView.classList.add('split');
  if (N3) N3.split(pa);
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
window.__c4 = { get stance() { return stance; }, get intro() { return introState; }, get people() { return PEOPLE.length; }, get view() { return view; }, get mode() { return mode; },
  get photos() { return N3 ? PEOPLE.filter((p) => N3.isPhoto(p.id)).length : 0; }, get flowing() { return !!N3 && N3.flowing; }, get frames() { return N3 ? N3.frames : 0; },
  get card() { return !!lastCard; }, cardURL: () => lastCard && lastCard.toDataURL('image/jpeg', 0.85), pick, setMode, showQ, showWall, tapFrame, get n3() { return N3; } };
// 다른 페이지로 — 화면이 어둠으로 잠긴 뒤 넘어간다(끊긴 페이지 전환 없이)
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]'); if (!a || a.hasAttribute('download') || e.defaultPrevented || a.target) return;
  e.preventDefault(); document.body.classList.add('leaving'); setTimeout(() => { location.href = a.href; }, REDUCED ? 0 : 430);
});
