// C4 나다르 사진관
//   (1) 벽: 세 줄의 금박 액자(그림 10점)가 서로 다른 속도로 흐른다. 셔터 "사진으로" → 조리개·섬광 → 단추에서 퍼지는 물결로
//       모든 액자가 같은 사람의 사진으로 현상된다(검게 닫힘 → 은빛 · 세피아 → 흑백 · 입자). 다시 누르면 붓질 띠가 쓸어 그림으로.
//       액자를 누르면 흐름이 멈추고 그 사람이 크게(세로 분할을 끌어 그림 ↔ 사진). 첫 전환 뒤 "당신이라면?"
//   (2) 고르기: 뒤로 두 줄기(왼쪽 그림은 위로 · 오른쪽 사진은 아래로). 반쪽을 누르면 그쪽이 화면을 채우고 빨라진다 → 오늘의 관람객 · 그때는 이랬다 · 저장(고른 쪽 10명 콜라주 카드)
//   (+) 내 초상(선택): 전면 카메라 → 노출 4초 → 부스 프로토타입의 19세기 사진 파이프라인(booth/js/nadar.js) 재사용
// 얼굴은 img/c4f/<id>-{paint,photo}.jpg — 5점 수동 표시 + 닮음 변환으로 같은 4:5 틀에 맞춘 것(img/c4f/align.py · js/c4-faces.json)
// 움직임은 transform · opacity 만. 화면 밖이거나 가려지면 흐름을 멈춘다. 서버 없음, 업로드 없음.
import { toast, loadImage, startCamera, stopCamera, cameraErrorText } from '../../../booth/js/common.js';
import { saveChoice } from './js/proto-common.js';
import { createCrowd, dotsFor, split, packRect, scatter, targetsFor, stampLine } from './js/crowd.js';
import * as N from '../../../booth/js/nadar.js';

const $ = (s) => document.querySelector(s);
const $$ = (q) => Array.from(document.querySelectorAll(q));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 사진의 해(오래된 것부터). 그림·사진 출처는 상세 페이지 #c4-people 표와 같다
const PEOPLE = [
  { id: 'liszt', name: '프란츠 리스트', painter: '앙리 레만', pyear: '1839', photog: '헤르만 비오브', fyear: '1843',
    src: '그림 카르나발레 미술관 · Paris Musées CC0 · 사진 다게레오타입 · Commons PD(원본 소장처 미확인)' },
  { id: 'courbet', name: '귀스타브 쿠르베', painter: '자화상', pyear: '1848~49', photog: '나다르', fyear: '1850년경',
    src: '그림 〈파이프를 문 남자〉 파브르 미술관 · Commons PD-Art · 사진 다게레오타입 · Commons PD(출처 약함)' },
  { id: 'degas', name: '에드가 드가', painter: '자화상', pyear: '1855', photog: '에티엔 카르자', fyear: '1860년경',
    src: '그림 오르세 미술관 · Commons PD-Art · 사진 BnF Gallica(마네의 사진첩) · Commons PD' },
  { id: 'zola', name: '에밀 졸라', painter: '에두아르 마네', pyear: '1868', photog: '에티엔 카르자', fyear: '1865년경',
    src: '그림 오르세 미술관 · Commons PD-Art · 사진 샌디에이고 사진미술관 · Commons PD' },
  { id: 'manet', name: '에두아르 마네', painter: '앙리 팡탱라투르', pyear: '1867', photog: '나다르(추정)', fyear: '1867~71년경',
    src: '그림 시카고 미술관 · CC0 · 사진 레이크스미술관 · PDM' },
  { id: 'monet', name: '클로드 모네', painter: '카롤뤼스뒤랑', pyear: '1867', photog: 'A. 그레이너', fyear: '1871',
    src: '그림 마르모탕 모네 미술관 · Commons PD-Art · 사진 Commons PD(원본 소장처 미확인)' },
  { id: 'morisot', name: '베르트 모리조', painter: '에두아르 마네', pyear: '1872', photog: '사진가 미상', fyear: '연도 미상',
    src: '그림 오르세 미술관 · Commons PD-Art · 사진 Commons PD(작자·연도 미확인)' },
  { id: 'renoir', name: '오귀스트 르누아르', painter: '자화상', pyear: '1875년경', photog: '사진가 미상', fyear: '1875년경',
    src: '그림 클라크 미술관 1955.584 · Commons PD-Art · 사진 오르세 미술관(RMN) · Commons PD' },
  { id: 'hugo', name: '빅토르 위고', painter: '레옹 보나 구도 판본', pyear: '1879', photog: '나다르', fyear: '1878',
    src: '그림·사진 빅토르 위고의 집 · Paris Musées CC0' },
  { id: 'pissarro', name: '카미유 피사로', painter: '자화상', pyear: '1903', photog: '사진가 미상', fyear: '1900년경',
    src: '그림 테이트 · Commons PD-Art · 사진 Commons(원본 미확인)' },
].map((p) => ({ ...p, paint: `img/c4f/${p.id}-paint.jpg`, photo: `img/c4f/${p.id}-photo.jpg` }));

// 미리 받기 — 20장(각 ≤120KB)
const IMG = new Map();
PEOPLE.forEach((p) => ['paint', 'photo'].forEach((k) => { const im = new Image(); im.decoding = 'async'; im.src = p[k]; IMG.set(p[k], im); }));
const ready = Promise.all([...IMG.values()].map((im) => (im.decode ? im.decode().catch(() => {}) : Promise.resolve())));

// ── 탭
$$('.tab').forEach((t) => t.addEventListener('click', () => {
  $$('.tab').forEach((x) => { const on = x === t; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
  $$('.screen').forEach((s) => { s.hidden = s.dataset.screen !== t.dataset.tab; });
  if (t.dataset.tab !== 'me') stopCamera($('#cam'));
  syncFlow();
  window.scrollTo(0, 0);
}));

// ── 1 벽: 세 줄. 줄마다 순서를 달리하고 두 벌을 이어 붙여 끊김 없이 돈다(왼쪽 · 오른쪽 · 왼쪽, 속도도 다르게)
const ROWS = [
  { order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], dir: -1, dur: 74000 },
  { order: [5, 8, 2, 9, 1, 6, 3, 7, 0, 4], dir: 1, dur: 58000 },
  { order: [7, 3, 9, 0, 5, 2, 8, 4, 6, 1], dir: -1, dur: 88000 },
];
const wallScr = $('#wallScr'), rowsEl = $('#rows');
const BANDS = 5, BAND_STEP = 100 / BANDS, BAND_H = BAND_STEP + 4;   // 띠 다섯 줄, 살짝 겹치게
function frameHTML(pi, r, k) {
  const p = PEOPLE[pi], ov = (k + r) % 3 === 0, sm = (k + r * 2) % 4 === 1;
  const bands = Array.from({ length: BANDS }, (_, j) => {
    const top = j * BAND_STEP - 2;
    return `<div class="bd${j % 2 ? ' r' : ''}" style="--j:${j};top:${top}%;height:${BAND_H}%"><div class="bi" style="top:${(-top / BAND_H * 100).toFixed(2)}%;height:${(100 / BAND_H * 100).toFixed(2)}%;background-image:url('${p.paint}')"></div></div>`;
  }).join('');
  return `<button class="fr${ov ? ' ov' : ''}${sm ? ' s' : ''}" type="button" data-p="${pi}" aria-label="${p.name}"><div class="mat"><div class="art">
    <img class="pa" src="${p.paint}" alt="" draggable="false" decoding="async"><img class="ph" src="${p.photo}" alt="" draggable="false" decoding="async">
    <i class="sep"></i><i class="ink"></i><i class="sil"></i><i class="grn"></i><div class="bands">${bands}</div></div></div></button>`;
}
rowsEl.innerHTML = ROWS.map((row, r) => {
  const one = row.order.map((pi, k) => frameHTML(pi, r, k)).join('');
  return `<div class="row"><div class="track">${one}${one}</div></div>`;
}).join('');
const frames = $$('.fr');
const tracks = $$('.track');
const flows = REDUCED ? [] : tracks.map((t, r) => {
  const a = ROWS[r].dir < 0 ? ['translateX(0)', 'translateX(-50%)'] : ['translateX(-50%)', 'translateX(0)'];
  return t.animate([{ transform: a[0] }, { transform: a[1] }], { duration: ROWS[r].dur, iterations: Infinity, easing: 'linear' });
});
if (REDUCED) tracks.forEach((t, r) => { if (ROWS[r].dir > 0) t.style.transform = 'translateX(-50%)'; });

// 흐름은 벽이 보일 때만
let onScreen = true, peekOpen = false;
function syncFlow() {
  const run = onScreen && !peekOpen && !wallScr.hidden && !$('#wall').hidden && $('#choose').hidden && document.visibilityState === 'visible';
  flows.forEach((a) => { if (run && a.playState !== 'running') a.play(); else if (!run && a.playState === 'running') a.pause(); });
  streams.forEach((a) => { const on = !$('#choose').hidden && !$('#wall').hidden && document.visibilityState === 'visible'; if (on && a.playState !== 'running') a.play(); else if (!on && a.playState === 'running') a.pause(); });
}
if ('IntersectionObserver' in window) new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; syncFlow(); }).observe(wallScr);
document.addEventListener('visibilitychange', () => syncFlow());

// ── 셔터: 조리개가 닫힌 순간 모드를 바꾸고, 단추에서 가까운 액자부터 32ms 간격으로 퍼진다
let mode = 'paint', busy = false, flipped = false;
function irisSize() {
  const r = wallScr.getBoundingClientRect();
  $('#iris').style.setProperty('--d', `${Math.ceil(Math.hypot(r.width, r.height) * 0.6)}px`);
}
function ripple() {
  const b = $('#shutter').getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
  const sr = wallScr.getBoundingClientRect();
  const list = frames.map((f) => { const r = f.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const vis = r.right > sr.left - 40 && r.left < sr.right + 40; return { f, d: Math.hypot(cx - bx, cy - by), vis }; });
  const vis = list.filter((x) => x.vis).sort((a, c) => a.d - c.d), off = list.filter((x) => !x.vis);
  vis.forEach((x, i) => x.f.style.setProperty('--d', `${i * 32}ms`));
  const last = vis.length * 32;
  off.forEach((x) => x.f.style.setProperty('--d', `${last}ms`));
  return last;
}
function flip() {
  if (busy) return;
  busy = true; $('#shutter').disabled = true;
  const to = mode === 'paint' ? 'photo' : 'paint';
  if (navigator.vibrate) navigator.vibrate(20);
  const swap = () => {
    const last = REDUCED ? 0 : ripple();
    wallScr.classList.add('run'); wallScr.dataset.mode = to; mode = to;
    $('#roleWhat').textContent = to === 'photo' ? '사진' : '초상화';
    $('#shutterLab').textContent = to === 'photo' ? '초상화로' : '사진으로';
    $('#shutter').setAttribute('aria-label', to === 'photo' ? '초상화로' : '사진으로');
    $('#wfCount').textContent = to === 'photo' ? '같은 열 사람의 사진' : '초상화 10점';
    setTimeout(() => {
      busy = false; $('#shutter').disabled = false;
      if (!flipped) { flipped = true; $('#toChoose').hidden = false; }
    }, REDUCED ? 0 : last + 900);
  };
  if (REDUCED) return swap();
  irisSize();
  const iris = $('#iris'), flash = $('#flash');
  iris.classList.remove('run'); flash.classList.remove('run'); void iris.offsetWidth;
  iris.classList.add('run'); if (to === 'photo') flash.classList.add('run');
  setTimeout(swap, 280);
  setTimeout(() => { iris.classList.remove('run'); flash.classList.remove('run'); }, 760);
}
$('#shutter').addEventListener('click', flip);

// ── 액자 하나 크게: 흐름이 멈추고, 세로 분할(기본 가운데)을 끌어 그림 ↔ 사진. 바깥을 누르면 다시 흐른다
const peek = $('#peek'), pkFace = $('#pkFace');
function openPeek(pi) {
  const p = PEOPLE[pi];
  $('#pkName').textContent = p.name;
  $('#pkPaint').src = p.paint; $('#pkPaint').alt = `${p.name} · 그림 ${p.painter} ${p.pyear}`;
  $('#pkPhoto').src = p.photo; $('#pkPhoto').alt = `${p.name} · 사진 ${p.photog} ${p.fyear}`;
  $('#pkPaintCap').textContent = `${p.painter} · ${p.pyear}`;
  $('#pkPhotoCap').textContent = `${p.photog} · ${p.fyear}`;
  $('#pkSrc').textContent = p.src;
  pkFace.style.setProperty('--s', '50%');
  peek.hidden = false; peekOpen = true; syncFlow();
}
function closePeek() { peek.hidden = true; peekOpen = false; syncFlow(); }
rowsEl.addEventListener('click', (e) => { const f = e.target.closest('.fr'); if (f && !busy) openPeek(+f.dataset.p); });
peek.addEventListener('click', (e) => { if (!e.target.closest('.pk-face')) closePeek(); });
let drag = null;
const setSplit = (x) => { const r = pkFace.getBoundingClientRect(); pkFace.style.setProperty('--s', `${Math.max(0, Math.min(100, (x - r.left) / r.width * 100)).toFixed(1)}%`); };
pkFace.addEventListener('pointerdown', (e) => { drag = e.pointerId; try { pkFace.setPointerCapture(e.pointerId); } catch (err) { /* noop */ } setSplit(e.clientX); });
pkFace.addEventListener('pointermove', (e) => { if (drag === e.pointerId) setSplit(e.clientX); });
['pointerup', 'pointercancel'].forEach((t) => pkFace.addEventListener(t, (e) => { if (drag === e.pointerId) drag = null; }));

// ── 2 고르기: 왼쪽 그림 줄기는 위로, 오른쪽 사진 줄기는 아래로
const choose = $('#choose');
const fill = (k, ord) => { const one = ord.map((i) => `<img src="${PEOPLE[i][k]}" alt="" draggable="false" decoding="async">`).join(''); return one + one; };
$('#strmPaint').innerHTML = fill('paint', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
$('#strmPhoto').innerHTML = fill('photo', [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
const STREAM_MS = 70000;
const streams = REDUCED ? [] : [
  $('#strmPaint').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-50%)' }], { duration: STREAM_MS, iterations: Infinity }),
  $('#strmPhoto').animate([{ transform: 'translateY(-50%)' }, { transform: 'translateY(0)' }], { duration: STREAM_MS, iterations: Infinity }),
];
streams.forEach((a) => a.pause());
if (REDUCED) $('#strmPhoto').style.transform = 'translateY(-25%)';
function openChoose() {
  pick(null);
  choose.hidden = false; wallScr.setAttribute('aria-hidden', 'true');
  syncFlow();
}
function backToWall() { choose.hidden = true; wallScr.removeAttribute('aria-hidden'); syncFlow(); }
$('#toChoose').addEventListener('click', openChoose);
$('#chBack').addEventListener('click', backToWall);

const STANCES = { paint: { label: '그림', full: '그림으로', pct: 44 }, photo: { label: '사진', full: '사진으로', pct: 56 } };   // 예시 수치
const VISITORS = '1,712';
let stance = null;
function pick(k) {
  stance = k;
  if (k) choose.dataset.pick = k; else delete choose.dataset.pick;
  $$('.half').forEach((h) => h.setAttribute('aria-checked', h.dataset.k === k));
  streams.forEach((a, i) => { const mine = k && ['paint', 'photo'][i] === k; a.updatePlaybackRate ? a.updatePlaybackRate(mine ? 5 : 1) : (a.playbackRate = mine ? 5 : 1); });
  $('#reveal').classList.remove('on');
  if (!k) return;
  if (navigator.vibrate) navigator.vibrate(10);
  setTimeout(reveal, REDUCED ? 0 : 650);
}
$$('.half').forEach((h) => h.addEventListener('click', () => { if (!stance) pick(h.dataset.k); }));

// ── 3 오늘의 관람객: 점(하나 = 열 사람)이 흩어졌다가 그림 · 사진 두 기둥 아래로 모인다. 내 점은 주황, 맨 마지막
const KEYS = ['paint', 'photo'];
let crowd = null;
function reveal() {
  if (!stance) return;
  const rv = $('#reveal'); rv.classList.add('on'); rv.scrollTop = 0;
  $('#crowdLine').innerHTML = `사람을 남기는 데, 당신은 <em>${STANCES[stance].full}</em>`;
  $('#crowdCols').innerHTML = KEYS.map((k) => { const s = STANCES[k], me = k === stance; return `<div class="crowd-col${me ? ' me' : ''}"><b class="n">${s.pct}<i>%</i></b><span class="lab">${s.label}${me ? ' · 나' : ''}</span></div>`; }).join('');
  $('#crowdStamp').textContent = stampLine(VISITORS);
  $('#mineCard').hidden = true; $('#saveStance').disabled = false;
  const stage = $('#crowdStage'), n = dotsFor(VISITORS);
  if (!crowd) crowd = createCrowd($('#crowdCv'), { theme: 'dark', n, reduceMotion: REDUCED, seed: 5 });
  requestAnimationFrame(() => {
    crowd.resize();
    const sr = stage.getBoundingClientRect(), w = sr.width / 2;
    const rects = KEYS.map((k, i) => ({ x: i * w + 10, y: 8, w: w - 20, h: sr.height - 14 }));
    const counts = split(n, KEYS.map((k) => STANCES[k].pct));
    const groups = KEYS.map((k, i) => ({ pts: packRect(counts[i], rects[i], crowd.rnd) }));
    crowd.place(scatter(n, { x: 0, y: 0, w: sr.width, h: sr.height }, crowd.rnd));
    setTimeout(() => crowd.move(targetsFor(crowd, groups, KEYS.indexOf(stance)), { duration: 1250, stagger: 380 }), REDUCED ? 0 : 520);
  });
}
$('#again').addEventListener('click', () => pick(null));

// ── 저장: 입장(출구 화면이 읽는다) + 고른 쪽 10명 콜라주 카드 한 장
async function card(k) {
  await ready;
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bg = g.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.42, H * 0.8); bg.addColorStop(0, '#2A2420'); bg.addColorStop(1, '#0F0E0D');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#F0B98F'; g.font = '600 30px Paperlogy, Freesentation, sans-serif'; g.fillText('C4 · 나다르 사진관', W / 2, 118);
  g.fillStyle = '#FFFFFF'; g.font = '800 74px Paperlogy, Freesentation, sans-serif'; g.fillText(`나는 ${STANCES[k].full} 남긴다`, W / 2, 210);
  const cols = 5, cw = 168, ch = 210, gx = 22, gy = 70, x0 = (W - cols * cw - (cols - 1) * gx) / 2, y0 = 300;
  PEOPLE.forEach((p, i) => {
    const x = x0 + (i % cols) * (cw + gx), y = y0 + Math.floor(i / cols) * (ch + gy);
    g.save(); g.fillStyle = '#B8903F'; g.fillRect(x - 6, y - 6, cw + 12, ch + 12); g.fillStyle = '#1E1712'; g.fillRect(x, y, cw, ch);
    g.beginPath(); g.ellipse(x + cw / 2, y + ch / 2, cw / 2 - 10, ch / 2 - 10, 0, 0, Math.PI * 2); g.clip();
    const im = IMG.get(p[k]); if (im && im.naturalWidth) g.drawImage(im, x + 10, y + 10, cw - 20, ch - 20);
    g.restore();
    g.fillStyle = 'rgba(255,255,255,.82)'; g.font = '600 22px Freesentation, sans-serif';
    g.fillText(p.name, x + cw / 2, y + ch + 38);
  });
  g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '400 26px Freesentation, sans-serif';
  g.fillText(`오늘 같은 입장 ${STANCES[k].pct}% · 수치는 예시`, W / 2, 1150);
  g.fillStyle = 'rgba(255,255,255,.45)'; g.font = '400 24px Georgia, "Times New Roman", serif';
  g.fillText('MONET 100 · 35, boulevard des Capucines · Paris', W / 2, 1250);
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
window.__c4 = { get mode() { return mode; }, get busy() { return busy; }, get flipped() { return flipped; }, get stance() { return stance; }, get crowd() { return crowd; },
  get peek() { return peekOpen; }, get flowing() { return flows.some((a) => a.playState === 'running'); }, get card() { return !!lastCard; }, flip, openChoose, pick, reveal };
