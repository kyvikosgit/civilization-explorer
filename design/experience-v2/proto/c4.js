// C4 나다르 사진관 — (1) 벽의 초상화 4점: 셔터를 누르면 조리개가 닫혔다 열리며 같은 인물의 나다르 사진이 습판처럼 떠오른다
//                    (2) 내 초상(선택): 전면 카메라 → 노출 4초 → 부스 프로토타입의 19세기 사진 파이프라인(booth/js/nadar.js, WebGL → 워커 → 즉석) 재사용
//                    (3) 네 쌍을 다 보면 질문 하나: 사람을 남기는 데 그림과 사진, 어느 쪽이 낫습니까 → 오늘의 비율 + 그때는 이랬다 → 수집함
// 서버 없음, 업로드 없음. 모든 처리는 기기 안. 입장은 기기(localStorage)에만 남고 출구 화면(exit)이 읽는다.
import { toast, loadImage, startCamera, stopCamera, cameraErrorText } from '../../../booth/js/common.js';
import { saveChoice } from './js/proto-common.js';
import * as N from '../../../booth/js/nadar.js';

const $ = (s) => document.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const K = new URLSearchParams(location.search).has('slow') ? 5 : 1;   // 검수용 느린 재생
document.documentElement.style.setProperty('--k', K);

// 보드에서 확인한 4쌍 (그림·사진 모두 소장처 기록으로 작가·연도·퍼블릭 도메인 확인)
const SITTERS = [
  { id: 'manet', name: '에두아르 마네', paint: '../works/c4-manet-paint.jpg', photo: '../works/c4-manet-photo.jpg',
    painter: '앙리 팡탱라투르', pyear: '1867', photog: '펠릭스 나다르(추정)', fyear: '1867~71년경',
    src: '그림 시카고 미술관 CC0 · 사진 레이크스미술관 PDM', pos: '50% 15%', fpos: '50% 20%' },
  { id: 'hugo', name: '빅토르 위고', paint: '../works/c4-hugo-paint.jpg', photo: '../works/c4-hugo-photo.jpg',
    painter: '레옹 보나 원작 구도의 판본', pyear: '1879', photog: '펠릭스 나다르', fyear: '1878',
    src: '그림·사진 빅토르 위고의 집 · Paris Musées CC0', pos: '50% 20%', fpos: '50% 40%' },
  { id: 'bernhardt', name: '사라 베르나르', paint: '../works/c4-bernhardt-paint.jpg', photo: '../works/c4-bernhardt-photo.jpg',
    painter: '조르주 클래랭', pyear: '1876', photog: '펠릭스 나다르', fyear: '원판 1864년경',
    src: '그림 프티팔레 · Paris Musées CC0 · 사진 게티 미술관 Open Content', pos: '50% 30%', fpos: '50% 30%' },
  { id: 'baudelaire', name: '샤를 보들레르', paint: '../works/c4-baudelaire-paint.jpg', photo: '../works/c4-baudelaire-photo.jpg',
    painter: '귀스타브 쿠르베', pyear: '1848년경', photog: '펠릭스 나다르', fyear: '1856~58',
    src: '그림 파브르 미술관 · PD · 사진 클리블랜드 미술관 CC0', pos: '68% 50%', fpos: '50% 30%' },
];

// ── 탭
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((x) => { const on = x === t; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
  document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.dataset.screen !== t.dataset.tab; });
  if (t.dataset.tab !== 'me') stopCamera($('#cam'));
  window.scrollTo(0, 0);
}));

// ── 벽
const track = $('#track'), dots = $('#dots'), gallery = $('#gallery');
let cur = 0, busy = false;
const dev = SITTERS.map(() => false);
track.innerHTML = SITTERS.map((s, i) => `
  <div class="slide" data-i="${i}">
    <div class="frame">
      <div class="art">
        <img class="paint" src="${s.paint}" alt="${s.name} 초상화" style="object-position:${s.pos}" draggable="false">
        <div class="photo-layer">
          <img class="photo" src="${s.photo}" alt="${s.name} 나다르 사진" style="object-position:${s.fpos}" draggable="false">
          <div class="silver"></div><div class="vignette"></div><div class="grain"></div>
        </div>
      </div>
      <span class="frame-no">${i + 1}</span>
    </div>
  </div>`).join('');
dots.innerHTML = SITTERS.map((s, i) => `<button type="button" role="tab" aria-label="${i + 1} ${s.name}"><i></i></button>`).join('');
const slides = Array.from(track.children);
Array.from(dots.children).forEach((b, i) => b.addEventListener('click', () => { if (!busy) goTo(i); }));

function caption() {
  const s = SITTERS[cur], d = dev[cur];
  $('#capState').textContent = d ? '나다르의 사진' : '화가의 초상';
  $('#capState').classList.toggle('photo', d);
  $('#capName').textContent = s.name;
  $('#capLine').innerHTML = d
    ? `그림 ${s.painter} ${s.pyear}<span class="arrow">→</span><b>사진 ${s.photog} ${s.fyear}</b>`
    : `<b>그림 ${s.painter} ${s.pyear}</b><span class="arrow">→</span>사진 ${s.photog} ${s.fyear}`;
  $('#capSrc').textContent = s.src;
  Array.from(dots.children).forEach((el, i) => { el.classList.toggle('on', i === cur); el.classList.toggle('dev', dev[i]); });
  $('#shutter').classList.toggle('next', d);
  $('#shutterHint').textContent = dev.every(Boolean) ? '질문으로' : d ? '다음 손님' : '셔터';
  $('#wallSub').textContent = d ? '같은 사람을 나다르가 찍었다' : '벽의 초상화 앞에서 셔터를 누르세요';
}
function goTo(i) {
  clearTimeout(advanceT);
  cur = (i + SITTERS.length) % SITTERS.length;
  track.style.transform = `translateX(${-cur * 100}%)`;
  caption();
}
function irisSize() {
  // 조리개 날개 이동 거리 = 갤러리 대각선의 절반보다 넉넉하게
  const r = gallery.getBoundingClientRect();
  $('#iris').style.setProperty('--d', `${Math.ceil(Math.hypot(r.width, r.height) * 0.6)}px`);
}
// 셔터: 지금 손님을 현상한다 → 1.4초 뒤 다음 손님으로 저절로 넘어간다(네 번 누르면 네 사람). 현상 중에 누르면 한 번은 기억해 뒀다가 이어서 한다
let pending = false, advanceT = 0;
function nextUndeveloped() { for (let k = 1; k <= SITTERS.length; k++) { const j = (cur + k) % SITTERS.length; if (!dev[j]) return j; } return -1; }
function shoot() {
  if (busy) { pending = true; return; }
  clearTimeout(advanceT);
  if (dev.every(Boolean)) { openAsk(); return; }
  if (dev[cur]) { goTo(nextUndeveloped()); return; }         // 이미 현상한 손님이면 다음 손님으로
  busy = true; pending = false;
  gallery.classList.add('busy');
  irisSize();
  const iris = $('#iris'), flash = $('#flash');
  iris.classList.remove('run'); flash.classList.remove('run');
  void iris.offsetWidth;
  iris.classList.add('run'); flash.classList.add('run');
  if (navigator.vibrate) navigator.vibrate(20);
  // 조리개가 닫힌 순간(0.38×0.8s) 사진으로 바꾼다
  setTimeout(() => {
    dev[cur] = true;
    slides[cur].classList.add('dev');
    caption();
    if (dev.every(Boolean)) { $('#askCta').hidden = false; $('#shutterHint').textContent = '질문으로'; }
  }, REDUCED ? 60 : 320 * K);
  setTimeout(() => {
    iris.classList.remove('run'); flash.classList.remove('run'); busy = false; gallery.classList.remove('busy');
    const all = dev.every(Boolean);
    if (pending) { pending = false; if (all) openAsk(); else goTo(nextUndeveloped()); return; }
    if (!all) advanceT = setTimeout(() => { if (!busy && dev[cur]) goTo(nextUndeveloped()); }, REDUCED ? 300 : 1400 * K);
  }, REDUCED ? 400 : 850 * K);
}
$('#shutter').addEventListener('click', shoot);
// 좌우 끌기
{
  let x0 = null;
  gallery.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  gallery.addEventListener('pointerup', (e) => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40 && !busy) goTo(cur + (dx < 0 ? 1 : -1)); });
  gallery.addEventListener('pointercancel', () => { x0 = null; });
}
window.addEventListener('resize', irisSize);
goTo(0);

// ── 질문 — 사람을 남기는 데 그림과 사진, 어느 쪽이 낫습니까 (정답 없음)
//    두 줄(그림 | 사진)에 네 쌍을 늘어놓고, 줄 머리나 어느 그림이든 누르면 그 줄이 내 입장이 된다
const STANCES = { paint: { label: '그림', pct: 44 }, photo: { label: '사진', pct: 56 } };   // 예시 수치
const VISITORS = '1,712';
let stance = null;
const cols = $('#cols');
SITTERS.forEach((s, i) => {
  const row = document.createDocumentFragment();
  const mk = (k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'cell'; b.dataset.k = k; b.setAttribute('aria-label', `${s.name} · ${k === 'paint' ? '그림' : '사진'}`);
    b.innerHTML = `<img src="${k === 'paint' ? s.paint : s.photo}" alt="" style="object-position:${k === 'paint' ? s.pos : s.fpos}" draggable="false" loading="lazy">`; return b; };
  const name = document.createElement('div'); name.className = 'pair-name'; name.innerHTML = `${s.name.replace(' ', '<br>')}<small>${s.pyear} · ${s.fyear.replace('년경', '').replace('원판 ', '')}</small>`;
  row.append(mk('paint'), name, mk('photo'));
  cols.appendChild(row);
});
cols.addEventListener('click', (e) => {
  const b = e.target.closest('[data-k]'); if (!b || stance) return;
  choose(b.dataset.k);
});
function choose(k) {
  stance = k;
  cols.classList.add('picked');
  cols.querySelectorAll('[data-k]').forEach((x) => { const on = x.dataset.k === k; x.classList.toggle('on', on); if (x.classList.contains('col-h')) x.setAttribute('aria-checked', on); });
  $('#askNote').hidden = true;
  const m = $('#askMine'); m.innerHTML = `사람을 남기는 데, 당신은 <b>${STANCES[k].label} 쪽</b>`; m.hidden = false;
  if (navigator.vibrate) navigator.vibrate(14);
  setTimeout(reveal, REDUCED ? 0 : 900);
}
function openAsk() {
  $('#wallBody').hidden = true; $('#result').hidden = true; $('#ask').hidden = false;
  stance = null; cols.classList.remove('picked');
  cols.querySelectorAll('[data-k]').forEach((x) => { x.classList.remove('on'); if (x.classList.contains('col-h')) x.setAttribute('aria-checked', 'false'); });
  $('#askNote').hidden = false; $('#askMine').hidden = true;
  window.scrollTo(0, 0);
}
$('#toAsk').addEventListener('click', openAsk);
function reveal() {
  $('#result').hidden = false;                       // 두 줄은 그대로 둔 채 아래에 오늘의 비율이 이어진다
  $('#todayCap').textContent = `오늘의 관람객 · ${VISITORS}명 · 수치는 예시`;
  $('#bars').innerHTML = Object.entries(STANCES).map(([k, s], i) => `
    <div class="bar ${k === stance ? 'me' : ''}" style="--i:${i}"><div class="lb"><span>${s.label}${k === stance ? ' · 나' : ''}</span><b>${s.pct}%</b></div><div class="tr"><div class="fl" style="width:${s.pct}%"></div></div></div>`).join('');
  $('#mineCard').hidden = true; $('#saveStance').hidden = false; $('#saveStance').disabled = false;
  setTimeout(() => $('#result').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }), 60);
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
  dev.fill(false); slides.forEach((s) => s.classList.remove('dev')); stance = null;
  $('#askCta').hidden = true; $('#result').hidden = true; $('#ask').hidden = true; $('#wallBody').hidden = false;
  goTo(0); window.scrollTo(0, 0);
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
window.__c4 = { get cur() { return cur; }, get dev() { return dev.slice(); }, get busy() { return busy; }, get stance() { return stance; }, choose, openAsk, shoot };
