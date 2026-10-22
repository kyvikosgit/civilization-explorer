// C4 나다르 사진관 — 세 걸음
//   (1) 벽: 초상화 4점. 셔터 한 번 → 조리개가 닫혔다 열리며 섬광, 네 점이 120ms 차례로 나다르 사진으로 현상된다(1.4초) → 바로 질문
//   (2) 질문: 네 쌍을 그림 열 | 사진 열로. 열 제목이나 그림을 누르면 그 열이 앞으로, 다른 열은 물러난다 → "당신은 ○○ 쪽 · 확정". 꾹 누르면 그 쌍을 크게(2× 돋보기, 선택 사항)
//   (3) 오늘의 관람객(그림 열·사진 열 아래로 점, 내 점은 주황) + 그때는 이랬다 → 수집함
//   (+) 내 초상(선택): 전면 카메라 → 노출 4초 → 부스 프로토타입의 19세기 사진 파이프라인(booth/js/nadar.js) 재사용
// 서버 없음, 업로드 없음. 모든 처리는 기기 안. 입장은 기기(localStorage)에만 남고 출구 화면(exit)이 읽는다.
import { toast, loadImage, startCamera, stopCamera, cameraErrorText } from '../../../booth/js/common.js';
import { saveChoice } from './js/proto-common.js';
import { createCrowd, dotsFor, split, packRect, scatter, targetsFor, stampLine } from './js/crowd.js';
import * as N from '../../../booth/js/nadar.js';

const $ = (s) => document.querySelector(s);
const $$ = (q) => Array.from(document.querySelectorAll(q));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const K = new URLSearchParams(location.search).has('slow') ? 5 : 1;   // 검수용 느린 재생
document.documentElement.style.setProperty('--k', K);

// 보드에서 확인한 4쌍 (그림·사진 모두 소장처 기록으로 작가·연도·퍼블릭 도메인 확인). pshort/fshort 는 열 아래 짧은 캡션
const SITTERS = [
  { id: 'manet', name: '에두아르 마네', paint: '../works/c4-manet-paint.jpg', photo: '../works/c4-manet-photo.jpg',
    painter: '앙리 팡탱라투르', pshort: '팡탱라투르', pyear: '1867', photog: '펠릭스 나다르(추정)', fshort: '나다르(추정)', fyear: '1867~71년경',
    pmus: '시카고 미술관 · CC0', fmus: '레이크스미술관 · PDM', pos: '50% 15%', fpos: '50% 20%' },
  { id: 'hugo', name: '빅토르 위고', paint: '../works/c4-hugo-paint.jpg', photo: '../works/c4-hugo-photo.jpg',
    painter: '레옹 보나 원작 구도의 판본', pshort: '보나 구도 판본', pyear: '1879', photog: '펠릭스 나다르', fshort: '나다르', fyear: '1878',
    pmus: '빅토르 위고의 집 · Paris Musées CC0', fmus: '빅토르 위고의 집 · Paris Musées CC0', pos: '50% 20%', fpos: '50% 40%' },
  { id: 'bernhardt', name: '사라 베르나르', paint: '../works/c4-bernhardt-paint.jpg', photo: '../works/c4-bernhardt-photo.jpg',
    painter: '조르주 클래랭', pshort: '클래랭', pyear: '1876', photog: '펠릭스 나다르', fshort: '나다르', fyear: '원판 1864년경',
    pmus: '프티팔레 · Paris Musées CC0', fmus: '게티 미술관 · Open Content', pos: '50% 30%', fpos: '50% 30%' },
  { id: 'baudelaire', name: '샤를 보들레르', paint: '../works/c4-baudelaire-paint.jpg', photo: '../works/c4-baudelaire-photo.jpg',
    painter: '귀스타브 쿠르베', pshort: '쿠르베', pyear: '1848년경', photog: '펠릭스 나다르', fshort: '나다르', fyear: '1856~58',
    pmus: '파브르 미술관 · PD', fmus: '클리블랜드 미술관 · CC0', pos: '68% 50%', fpos: '50% 30%' },
];
const STAGGER = 120;   // ms — 네 점이 차례로 현상되는 간격

// ── 탭
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((x) => { const on = x === t; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
  document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.dataset.screen !== t.dataset.tab; });
  if (t.dataset.tab !== 'me') stopCamera($('#cam'));
  window.scrollTo(0, 0);
}));

// ── 벽: 금박 액자 4점, 2×2
const gallery = $('#gallery'), grid = $('#wallGrid');
let shot = false, busy = false;
grid.innerHTML = SITTERS.map((s, i) => `
  <div class="frame" data-i="${i}" style="--d:${i * STAGGER}ms">
    <div class="art">
      <img class="paint" src="${s.paint}" alt="${s.name} 초상화" style="object-position:${s.pos}" draggable="false">
      <div class="photo-layer">
        <img class="photo" src="${s.photo}" alt="${s.name} 나다르 사진" style="object-position:${s.fpos}" draggable="false">
        <div class="silver"></div><div class="vignette"></div><div class="grain"></div>
      </div>
    </div>
    <span class="frame-no">${i + 1}</span>
  </div>`).join('');
const frames = Array.from(grid.children);
function irisSize() {
  // 조리개 날개 이동 거리 = 갤러리 대각선의 절반보다 넉넉하게
  const r = gallery.getBoundingClientRect();
  $('#iris').style.setProperty('--d', `${Math.ceil(Math.hypot(r.width, r.height) * 0.6)}px`);
}
// 셔터 한 번: 조리개가 닫힌 순간(0.3s) 네 점이 차례로 현상(각 .75s, 120ms 간격) → 1.4s 뒤 질문 화면
function shoot() {
  if (busy || shot) return;
  busy = true; gallery.classList.add('busy'); $('#shutter').disabled = true;
  irisSize();
  const iris = $('#iris'), flash = $('#flash');
  iris.classList.remove('run'); flash.classList.remove('run');
  void iris.offsetWidth;
  iris.classList.add('run'); flash.classList.add('run');
  if (navigator.vibrate) navigator.vibrate(20);
  setTimeout(() => {
    shot = true;
    frames.forEach((f) => f.classList.add('dev'));
    $('#capState').textContent = '나다르의 사진 4장'; $('#capState').classList.add('photo');
    $('#capLine').textContent = '같은 네 사람을 나다르가 찍었다';
    $('#wallSub').textContent = '습판 위로 네 얼굴이 떠오릅니다';
    $('#shutterHint').textContent = '현상 중';
  }, REDUCED ? 60 : 300 * K);
  setTimeout(() => {
    iris.classList.remove('run'); flash.classList.remove('run'); busy = false; gallery.classList.remove('busy');
    openAsk();
  }, REDUCED ? 400 : 1400 * K);
}
$('#shutter').addEventListener('click', shoot);
window.addEventListener('resize', irisSize);

// ── 질문: 그림 열 | 사진 열. 한 줄 = 한 사람(이름 줄 + 그림 + 사진). 열 제목이나 그림을 톡 → 그 열이 앞으로. 꾹(320ms) → 그 쌍을 크게
const STANCES = { paint: { label: '그림', pct: 44 }, photo: { label: '사진', pct: 56 } };   // 예시 수치
const VISITORS = '1,712';
let stance = null;
const cols = $('#cols'), confirmBtn = $('#confirm');
cols.insertAdjacentHTML('beforeend', SITTERS.map((s, i) => `
  <div class="row-name">${s.name}</div>
  <figure class="cell" data-k="paint" data-i="${i}"><div class="cell-img"><img src="${s.paint}" alt="${s.name} · 그림 ${s.painter} ${s.pyear}" style="object-position:${s.pos}" draggable="false"></div><figcaption>${s.pshort} · ${s.pyear}</figcaption></figure>
  <figure class="cell" data-k="photo" data-i="${i}"><div class="cell-img"><img src="${s.photo}" alt="${s.name} · 사진 ${s.photog} ${s.fyear}" style="object-position:${s.fpos}" draggable="false"></div><figcaption>${s.fshort} · ${s.fyear}</figcaption></figure>`).join(''));
function openAsk() {
  $('#wallBody').hidden = true; $('#result').hidden = true; $('#ask').hidden = false;
  pick(null);
  window.scrollTo(0, 0);
}
function pick(k) {
  stance = k;
  if (k) cols.dataset.pick = k; else delete cols.dataset.pick;
  $$('.col-hd').forEach((b) => b.setAttribute('aria-checked', b.dataset.k === k));
  $('#askNote').hidden = !!k;
  confirmBtn.hidden = !k;
  if (k) { confirmBtn.textContent = `당신은 ${STANCES[k].label} 쪽 · 확정`; if (navigator.vibrate) navigator.vibrate(8); }
}
$$('.col-hd').forEach((b) => b.addEventListener('click', () => pick(b.dataset.k)));
confirmBtn.addEventListener('click', () => { if (stance) reveal(); });

// 꾹 누르기 → 그 쌍을 크게(위 그림 · 아래 사진). 손가락을 끌면 두 장의 같은 자리에 2× 돋보기. 손을 떼면 닫힌다. 톡(움직임 없이 짧게)은 그 열 고르기
const peek = $('#peek'), peekIn = $('#peekIn'), loupes = { paint: $('#loupeA'), photo: $('#loupeB') };
let hold = null;   // { id, i, k, x, y, t, on, moved, u, v }
function openPeek(i, k) {
  const s = SITTERS[i];
  $('#peekName').textContent = s.name;
  $('#peekPaint').src = s.paint; $('#peekPaint').style.objectPosition = s.pos; $('#peekPaintCap').textContent = `그림 · ${s.painter} · ${s.pyear} · ${s.pmus}`;
  $('#peekPhoto').src = s.photo; $('#peekPhoto').style.objectPosition = s.fpos; $('#peekPhotoCap').textContent = `사진 · ${s.photog} · ${s.fyear} · ${s.fmus}`;
  peek.hidden = false; peek.setAttribute('aria-hidden', 'false');
  hideLoupes();
  if (navigator.vibrate) navigator.vibrate(10);
  // 돋보기는 누른 장의 가운데에서 시작해 손가락 움직임만큼 옮겨 간다(손가락은 아직 아래 격자 위에 있으므로)
  hold.u = 0.5; hold.v = 0.5;
  requestAnimationFrame(() => { if (hold && hold.on) showLoupes(hold.u, hold.v); });
}
function closePeek() { peek.hidden = true; peek.setAttribute('aria-hidden', 'true'); hideLoupes(); }
// object-fit: cover 로 그려진 자리 계산 → 돋보기(2×) 배경 위치
function coverGeom(img) {
  const box = img.getBoundingClientRect(), iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
  const sc = Math.max(box.width / iw, box.height / ih), dw = iw * sc, dh = ih * sc;
  const [px, py] = (img.style.objectPosition || '50% 50%').split(' ').map((v) => parseFloat(v) / 100);
  return { box, dw, dh, ox: (box.width - dw) * (isNaN(px) ? 0.5 : px), oy: (box.height - dh) * (isNaN(py) ? 0.5 : py) };
}
function placeLoupe(k, u, v) {
  const img = $(`.peek-f[data-k="${k}"] img`), lp = loupes[k], g = coverGeom(img), sr = peekIn.getBoundingClientRect();
  if (!g.box.width) return;
  const D = lp.offsetWidth || 112, Z = 2;
  const px = g.box.left - sr.left + u * g.box.width, py = g.box.top - sr.top + v * g.box.height;   // 보는 자리(무대 기준)
  lp.style.transform = `translate(${(px - D / 2).toFixed(1)}px, ${(py - D / 2).toFixed(1)}px)`;
  lp.style.backgroundImage = `url("${img.src}")`;
  lp.style.backgroundSize = `${(g.dw * Z).toFixed(1)}px ${(g.dh * Z).toFixed(1)}px`;
  const ix = (u * g.box.width - g.ox) * Z, iy = (v * g.box.height - g.oy) * Z;
  lp.style.backgroundPosition = `${(D / 2 - ix).toFixed(1)}px ${(D / 2 - iy).toFixed(1)}px`;
  lp.hidden = false;
}
function showLoupes(u, v) { placeLoupe('paint', u, v); placeLoupe('photo', u, v); }
function hideLoupes() { Object.values(loupes).forEach((l) => { l.hidden = true; }); }
cols.addEventListener('pointerdown', (e) => {
  const cell = e.target.closest('.cell'); if (!cell) return;
  if (hold) clearTimeout(hold.t);
  hold = { id: e.pointerId, i: +cell.dataset.i, k: cell.dataset.k, x: e.clientX, y: e.clientY, on: false, moved: false, u: 0.5, v: 0.5 };
  try { cols.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
  hold.t = setTimeout(() => { if (!hold || hold.moved) return; hold.on = true; openPeek(hold.i, hold.k); }, 320);
});
cols.addEventListener('pointermove', (e) => {
  if (!hold || e.pointerId !== hold.id) return;
  const dx = e.clientX - hold.x, dy = e.clientY - hold.y;
  if (!hold.on) { if (Math.hypot(dx, dy) > 8) { hold.moved = true; clearTimeout(hold.t); } return; }
  // 손가락이 움직인 만큼 돋보기가 옮겨 간다(누른 장의 보이는 크기 기준)
  const r = $(`.peek-f[data-k="${hold.k}"] img`).getBoundingClientRect();
  hold.u = Math.max(0, Math.min(1, 0.5 + dx / (r.width || 1))); hold.v = Math.max(0, Math.min(1, 0.5 + dy / (r.height || 1)));
  showLoupes(hold.u, hold.v);
});
const holdUp = (e) => {
  if (!hold || e.pointerId !== hold.id) return;
  clearTimeout(hold.t);
  const h = hold; hold = null;
  if (h.on) { closePeek(); return; }
  if (!h.moved && e.type === 'pointerup') pick(h.k);           // 톡: 그 열 고르기
};
cols.addEventListener('pointerup', holdUp); cols.addEventListener('pointercancel', holdUp);
cols.addEventListener('touchmove', (e) => { if (hold && hold.on) e.preventDefault(); }, { passive: false });
cols.addEventListener('contextmenu', (e) => e.preventDefault());

// ── 오늘의 관람객: 그림 열·사진 열(네 쌍의 작은 그림)을 위에 두고, 바로 아래로 점(하나 = 열 사람)이 흩어졌다가 두 열 밑에 모인다. 내 점은 주황, 맨 마지막에
const KEYS = ['paint', 'photo'];
let crowd = null;
function reveal() {
  $('#ask').hidden = true; $('#result').hidden = false;
  $('#revPaint').innerHTML = SITTERS.map((s) => `<img src="${s.paint}" alt="" style="object-position:${s.pos}">`).join('');
  $('#revPhoto').innerHTML = SITTERS.map((s) => `<img src="${s.photo}" alt="" style="object-position:${s.fpos}">`).join('');
  $$('.rev-col').forEach((c) => c.classList.toggle('me', c.dataset.k === stance));
  $('#crowdCols').innerHTML = KEYS.map((k) => { const s = STANCES[k], me = k === stance; return `<div class="crowd-col${me ? ' me' : ''}"><b class="n">${s.pct}<i>%</i></b><span class="lab">${s.label}${me ? ' · 나' : ''}</span></div>`; }).join('');
  $('#crowdLine').innerHTML = `사람을 남기는 데, 당신은 <em>${STANCES[stance].label} 쪽</em>`;
  $('#crowdStamp').textContent = stampLine(VISITORS);
  $('#mineCard').hidden = true; $('#saveStance').hidden = false; $('#saveStance').disabled = false;
  const stage = $('#crowdStage'), n = dotsFor(VISITORS);
  if (!crowd) crowd = createCrowd($('#crowdCv'), { theme: 'dark', n, reduceMotion: REDUCED, seed: 5 });
  window.scrollTo(0, 0);
  requestAnimationFrame(() => {
    crowd.resize();
    const sr = stage.getBoundingClientRect();
    const rects = KEYS.map((k) => { const r = $(`.rev-col[data-k="${k}"]`).getBoundingClientRect(); return { x: r.left - sr.left + 6, y: 10, w: r.width - 12, h: sr.height - 18 }; });
    const counts = split(n, KEYS.map((k) => STANCES[k].pct));
    const groups = KEYS.map((k, i) => ({ pts: packRect(counts[i], rects[i], crowd.rnd) }));
    crowd.place(scatter(n, { x: 0, y: 0, w: sr.width, h: sr.height }, crowd.rnd));
    setTimeout(() => crowd.move(targetsFor(crowd, groups, KEYS.indexOf(stance)), { duration: 1250, stagger: 380 }), REDUCED ? 0 : 420);
  });
}
$('#saveStance').addEventListener('click', () => {
  const s = STANCES[stance];
  saveChoice('c4', { stance, label: s.label, pct: s.pct });
  $('#mineLabel').textContent = s.label;
  $('#mineSub').textContent = `오늘 같은 입장 ${s.pct}% · 출구 화면에서 C0·C1·C2와 나란히`;
  $('#mineCard').hidden = false;
  $('#saveStance').hidden = true;
  toast('수집함에 저장했습니다 · 내 입장');
});
$('#restartWall').addEventListener('click', () => {
  shot = false; frames.forEach((f) => f.classList.remove('dev')); stance = null; pick(null);
  $('#capState').textContent = '화가의 초상 4점'; $('#capState').classList.remove('photo');
  $('#capLine').textContent = '마네 · 위고 · 베르나르 · 보들레르'; $('#wallSub').textContent = '벽의 초상화 네 점 앞에서 셔터를 누르세요'; $('#shutterHint').textContent = '셔터'; $('#shutter').disabled = false;
  $('#result').hidden = true; $('#ask').hidden = true; $('#wallBody').hidden = false;
  window.scrollTo(0, 0);
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
$('#again').addEventListener('click', () => { result.hidden = true; last = null; if (source === 'cam') camOn(); else demoOn(); });
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
window.__c4 = { get shot() { return shot; }, get busy() { return busy; }, get stance() { return stance; }, get crowd() { return crowd; }, get peek() { return !peek.hidden; }, openAsk, shoot, pick, reveal };
