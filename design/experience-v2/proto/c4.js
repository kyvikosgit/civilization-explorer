// C4 나다르 사진관 — (1) 벽의 초상화 4점: 셔터를 누르면 조리개가 닫혔다 열리며 같은 인물의 나다르 사진이 습판처럼 떠오른다
//                    (2) 나란히 보기: 한 사람씩 그림과 사진을 크게 나란히 — 꾹 누르면 하나만, 돋보기를 켜고 끌면 두 장의 같은 자리를 2배로(눈·손 비교)
//                    (3) 질문 하나: 사람을 남기는 데 그림과 사진 중 어느 쪽을 간직할까 — 마지막 쌍 가운데 하나를 카르트 드 비지트 앨범 자리로 끌어 넣는다(눌러도 된다) → 앨범이 닫힌다 → 오늘의 관람객(그림 열·사진 열) + 그때는 이랬다 → 수집함
//                    (4) 내 초상(선택): 전면 카메라 → 노출 4초 → 부스 프로토타입의 19세기 사진 파이프라인(booth/js/nadar.js, WebGL → 워커 → 즉석) 재사용
// 서버 없음, 업로드 없음. 모든 처리는 기기 안. 입장은 기기(localStorage)에만 남고 출구 화면(exit)이 읽는다.
import { toast, loadImage, startCamera, stopCamera, cameraErrorText } from '../../../booth/js/common.js';
import { saveChoice } from './js/proto-common.js';
import { createCrowd, dotsFor, split, packRect, scatter, targetsFor, stampLine } from './js/crowd.js';
import * as N from '../../../booth/js/nadar.js';

const $ = (s) => document.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const K = new URLSearchParams(location.search).has('slow') ? 5 : 1;   // 검수용 느린 재생
document.documentElement.style.setProperty('--k', K);

// 보드에서 확인한 4쌍 (그림·사진 모두 소장처 기록으로 작가·연도·퍼블릭 도메인 확인)
const SITTERS = [
  { id: 'manet', name: '에두아르 마네', paint: '../works/c4-manet-paint.jpg', photo: '../works/c4-manet-photo.jpg',
    painter: '앙리 팡탱라투르', pyear: '1867', photog: '펠릭스 나다르(추정)', fyear: '1867~71년경',
    src: '그림 시카고 미술관 CC0 · 사진 레이크스미술관 PDM', pmus: '시카고 미술관 · CC0', fmus: '레이크스미술관 · PDM', pos: '50% 15%', fpos: '50% 20%' },
  { id: 'hugo', name: '빅토르 위고', paint: '../works/c4-hugo-paint.jpg', photo: '../works/c4-hugo-photo.jpg',
    painter: '레옹 보나 원작 구도의 판본', pyear: '1879', photog: '펠릭스 나다르', fyear: '1878',
    src: '그림·사진 빅토르 위고의 집 · Paris Musées CC0', pmus: '빅토르 위고의 집 · Paris Musées CC0', fmus: '빅토르 위고의 집 · Paris Musées CC0', pos: '50% 20%', fpos: '50% 40%' },
  { id: 'bernhardt', name: '사라 베르나르', paint: '../works/c4-bernhardt-paint.jpg', photo: '../works/c4-bernhardt-photo.jpg',
    painter: '조르주 클래랭', pyear: '1876', photog: '펠릭스 나다르', fyear: '원판 1864년경',
    src: '그림 프티팔레 · Paris Musées CC0 · 사진 게티 미술관 Open Content', pmus: '프티팔레 · Paris Musées CC0', fmus: '게티 미술관 · Open Content', pos: '50% 30%', fpos: '50% 30%' },
  { id: 'baudelaire', name: '샤를 보들레르', paint: '../works/c4-baudelaire-paint.jpg', photo: '../works/c4-baudelaire-photo.jpg',
    painter: '귀스타브 쿠르베', pyear: '1848년경', photog: '펠릭스 나다르', fyear: '1856~58',
    src: '그림 파브르 미술관 · PD · 사진 클리블랜드 미술관 CC0', pmus: '파브르 미술관 · PD', fmus: '클리블랜드 미술관 · CC0', pos: '68% 50%', fpos: '50% 30%' },
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
  $('#shutterHint').textContent = dev.every(Boolean) ? '나란히 보기' : d ? '다음 손님' : '셔터';
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
  if (dev.every(Boolean)) { openCompare(); return; }
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
    if (dev.every(Boolean)) { $('#askCta').hidden = false; $('#shutterHint').textContent = '나란히 보기'; }
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

// ── 나란히 보기 — 한 사람씩 그림 | 사진. 꾹 누르면(260ms) 그 한 장만 크게, 돋보기를 켜고 끌면 두 장의 같은 자리에 2배 돋보기가 함께 뜬다
const STANCES = { paint: { label: '그림', pct: 44 }, photo: { label: '사진', pct: 56 } };   // 예시 수치
const VISITORS = '1,712';
let stance = null, ci = 0, loupeOn = false;
const cmpStage = $('#cmpStage'), loupes = { paint: $('#loupeA'), photo: $('#loupeB') };
function showCmp(i) {
  ci = i; const s = SITTERS[i];
  $('#cmpName').textContent = s.name;
  $('#cmpPaint').src = s.paint; $('#cmpPaint').style.objectPosition = s.pos; $('#cmpPaintCap').textContent = `${s.painter} · ${s.pyear}`; $('#cmpPaintMus').textContent = s.pmus;
  $('#cmpPhoto').src = s.photo; $('#cmpPhoto').style.objectPosition = s.fpos; $('#cmpPhotoCap').textContent = `${s.photog} · ${s.fyear}`; $('#cmpPhotoMus').textContent = s.fmus;
  Array.from($('#cmpProg').children).forEach((d, k) => { d.classList.toggle('on', k === i); d.classList.toggle('done', k < i); });
  $('#cmpNext').textContent = i < SITTERS.length - 1 ? `다음 사람 · ${i + 2} / ${SITTERS.length}` : '한 가지 묻겠습니다';
  cmpStage.classList.remove('swap'); void cmpStage.offsetWidth; cmpStage.classList.add('swap');
  hideLoupes();
}
function openCompare() {
  $('#wallBody').hidden = true; $('#result').hidden = true; $('#ask').hidden = true; $('#cmp').hidden = false;
  showCmp(0); window.scrollTo(0, 0);
}
$('#toCmp').addEventListener('click', openCompare);
$('#cmpNext').addEventListener('click', () => { if (ci < SITTERS.length - 1) showCmp(ci + 1); else openAsk(); });
$('#loupeBtn').addEventListener('click', () => { loupeOn = !loupeOn; $('#loupeBtn').setAttribute('aria-pressed', loupeOn); cmpStage.classList.toggle('loupe-on', loupeOn); $('#cmpHint').textContent = loupeOn ? '그림이나 사진 위를 끌어 보세요 · 같은 자리가 2배로' : '꾹 누르면 하나만 · 돋보기를 켜고 끌면 눈과 손을 비교'; hideLoupes(); });
// object-fit: cover 로 그려진 자리 계산 → 돋보기(2×) 배경 위치
function coverGeom(img) {
  const box = img.getBoundingClientRect(), iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
  const sc = Math.max(box.width / iw, box.height / ih), dw = iw * sc, dh = ih * sc;
  const [px, py] = (img.style.objectPosition || '50% 50%').split(' ').map((v) => parseFloat(v) / 100);
  return { box, dw, dh, ox: (box.width - dw) * (isNaN(px) ? 0.5 : px), oy: (box.height - dh) * (isNaN(py) ? 0.5 : py) };
}
function placeLoupe(k, u, v) {
  const fig = $(`.cmp-f[data-k="${k}"]`), img = fig.querySelector('img'), lp = loupes[k], g = coverGeom(img), sr = cmpStage.getBoundingClientRect();
  const D = lp.offsetWidth || 112, Z = 2;
  const px = g.box.left - sr.left + u * g.box.width, py = g.box.top - sr.top + v * g.box.height;   // 손가락 자리(무대 기준)
  const lx = Math.max(0, Math.min(sr.width - D, px - D / 2)), ly = Math.max(0, py - D - 22);            // 손가락 위에 띄운다
  lp.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px)`;
  lp.style.backgroundImage = `url("${img.src}")`;
  lp.style.backgroundSize = `${(g.dw * Z).toFixed(1)}px ${(g.dh * Z).toFixed(1)}px`;
  const ix = (u * g.box.width - g.ox) * Z, iy = (v * g.box.height - g.oy) * Z;
  lp.style.backgroundPosition = `${(D / 2 - ix).toFixed(1)}px ${(D / 2 - iy).toFixed(1)}px`;
  lp.hidden = false;
}
function hideLoupes() { Object.values(loupes).forEach((l) => { l.hidden = true; }); cmpStage.classList.remove('holding'); document.querySelectorAll('.cmp-f.solo').forEach((f) => f.classList.remove('solo')); }
{
  let holdT = 0, held = null, active = null;
  cmpStage.addEventListener('pointerdown', (e) => {
    const fig = e.target.closest('.cmp-f'); if (!fig) return;
    e.preventDefault(); active = { id: e.pointerId, k: fig.dataset.k, x: e.clientX, y: e.clientY, moved: false };
    try { cmpStage.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    if (loupeOn) { moveLoupe(e); return; }
    clearTimeout(holdT);
    holdT = setTimeout(() => { if (!active || active.moved) return; held = fig; fig.classList.add('solo'); cmpStage.classList.add('holding'); if (navigator.vibrate) navigator.vibrate(8); }, 260);
  });
  function moveLoupe(e) {
    const img = $(`.cmp-f[data-k="${active.k}"] img`), r = img.getBoundingClientRect();
    const u = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), v = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    placeLoupe(active.k, u, v); placeLoupe(active.k === 'paint' ? 'photo' : 'paint', u, v);
  }
  cmpStage.addEventListener('pointermove', (e) => {
    if (!active || e.pointerId !== active.id) return;
    if (Math.hypot(e.clientX - active.x, e.clientY - active.y) > 8) active.moved = true;
    if (loupeOn) moveLoupe(e); else if (active.moved && !held) clearTimeout(holdT);
  });
  const up = (e) => { if (!active || e.pointerId !== active.id) return; clearTimeout(holdT); active = null; held = null; hideLoupes(); };
  cmpStage.addEventListener('pointerup', up); cmpStage.addEventListener('pointercancel', up);
  cmpStage.addEventListener('touchmove', (e) => { if (active) e.preventDefault(); }, { passive: false });
  cmpStage.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ── 질문 — 마지막 쌍(보들레르) 가운데 간직할 쪽을 카르트 드 비지트 앨범 자리로 끌어 넣는다. 가까우면 자석처럼 붙고, 그냥 눌러도 들어간다. 정답 없음
const LAST = SITTERS[SITTERS.length - 1];
const cards = $('#cards'), album = $('#album'), slot = $('#slot');
function openAsk() {
  $('#wallBody').hidden = true; $('#result').hidden = true; $('#cmp').hidden = true; $('#ask').hidden = false;
  stance = null; album.classList.remove('closed', 'near'); cards.classList.remove('picked');
  $('#cardPaint').src = LAST.paint; $('#cardPaint').style.objectPosition = LAST.pos; $('#cardPaintLb').innerHTML = `그림<small>${LAST.painter} · ${LAST.pyear}</small>`;
  $('#cardPhoto').src = LAST.photo; $('#cardPhoto').style.objectPosition = LAST.fpos; $('#cardPhotoLb').innerHTML = `사진<small>${LAST.photog} · ${LAST.fyear}</small>`;
  $('#albumWho').textContent = LAST.name;
  cards.querySelectorAll('.card').forEach((c) => { c.classList.remove('lift', 'in', 'other'); c.style.transform = ''; c.setAttribute('aria-checked', 'false'); });
  $('#askNote').hidden = false;
  window.scrollTo(0, 0);
}
{
  let d = null;
  const near = (c) => { const r = c.getBoundingClientRect(), s = slot.getBoundingClientRect(); return Math.hypot(r.left + r.width / 2 - (s.left + s.width / 2), r.top + r.height / 2 - (s.top + s.height / 2)) < Math.max(70, s.width * 0.6); };
  cards.addEventListener('pointerdown', (e) => {
    const c = e.target.closest('.card'); if (!c || stance) return;
    e.preventDefault(); d = { c, id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    try { cards.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    c.classList.add('lift');
  });
  cards.addEventListener('pointermove', (e) => {
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.hypot(dx, dy) > 6) d.moved = true;
    d.c.style.transform = `translate(${dx}px, ${dy}px) scale(1.06) rotate(${(dx * 0.03).toFixed(1)}deg)`;
    album.classList.toggle('near', near(d.c));
  });
  const up = (e) => {
    if (!d || e.pointerId !== d.id) return;
    const c = d.c; const go = !d.moved || near(c); d = null;
    album.classList.remove('near');
    if (go) { slide(c); return; }
    c.classList.remove('lift'); c.style.transform = '';                 // 멀면 제자리로
  };
  cards.addEventListener('pointerup', up); cards.addEventListener('pointercancel', up);
  cards.addEventListener('touchmove', (e) => { if (d) e.preventDefault(); }, { passive: false });
}
// 카드가 앨범 자리로 미끄러져 들어간다(자석) → 앨범이 닫힌다 → 오늘의 관람객
function slide(c) {
  if (stance) return;
  stance = c.dataset.k; cards.classList.add('picked');
  cards.querySelectorAll('.card').forEach((x) => { x.classList.toggle('other', x !== c); x.setAttribute('aria-checked', x === c); });
  const r = c.getBoundingClientRect(), s = slot.getBoundingClientRect();
  const k = Math.min(s.width / r.width, s.height / r.height);
  c.classList.remove('lift'); c.classList.add('in');
  c.style.transform = `translate(${(s.left + s.width / 2 - (r.left + r.width / 2)).toFixed(1)}px, ${(s.top + s.height / 2 - (r.top + r.height / 2)).toFixed(1)}px) scale(${k.toFixed(3)})`;
  $('#askNote').hidden = true;
  if (navigator.vibrate) navigator.vibrate(12);
  setTimeout(() => { album.classList.add('closed'); }, REDUCED ? 60 : 620);
  setTimeout(reveal, REDUCED ? 200 : 1700);
}
window.addEventListener('resize', () => { const c = $('#cards .card.in'); if (c) { c.style.transition = 'none'; const r0 = c.getBoundingClientRect(); void r0; c.style.transform = ''; const r = c.getBoundingClientRect(), s = slot.getBoundingClientRect(); const k = Math.min(s.width / r.width, s.height / r.height); c.style.transform = `translate(${(s.left + s.width / 2 - (r.left + r.width / 2)).toFixed(1)}px, ${(s.top + s.height / 2 - (r.top + r.height / 2)).toFixed(1)}px) scale(${k.toFixed(3)})`; requestAnimationFrame(() => { c.style.transition = ''; }); } });

// ── 오늘의 관람객: 그림 열·사진 열(네 쌍의 작은 그림)을 위에 두고, 바로 아래로 점(하나 = 열 사람)이 흩어졌다가 두 열 밑에 모인다. 내 점은 주황, 맨 마지막에
const KEYS = ['paint', 'photo'];
let crowd = null;
function reveal() {
  $('#result').hidden = false;
  $('#revPaint').innerHTML = SITTERS.map((s) => `<img src="${s.paint}" alt="" style="object-position:${s.pos}">`).join('');
  $('#revPhoto').innerHTML = SITTERS.map((s) => `<img src="${s.photo}" alt="" style="object-position:${s.fpos}">`).join('');
  $$('.rev-col').forEach((c) => c.classList.toggle('me', c.dataset.k === stance));
  $('#crowdCols').innerHTML = KEYS.map((k) => { const s = STANCES[k], me = k === stance; return `<div class="crowd-col${me ? ' me' : ''}"><b class="n">${s.pct}<i>%</i></b><span class="lab">${s.label}${me ? ' · 나' : ''}</span></div>`; }).join('');
  $('#crowdLine').innerHTML = `사람을 남기는 데, 당신은 <em>${STANCES[stance].label} 쪽</em>`;
  $('#crowdStamp').textContent = stampLine(VISITORS);
  $('#mineCard').hidden = true; $('#saveStance').hidden = false; $('#saveStance').disabled = false;
  const stage = $('#crowdStage'), n = dotsFor(VISITORS);
  if (!crowd) crowd = createCrowd($('#crowdCv'), { theme: 'dark', n, reduceMotion: REDUCED, seed: 5 });
  requestAnimationFrame(() => {
    crowd.resize();
    const sr = stage.getBoundingClientRect();
    const rects = KEYS.map((k) => { const r = $(`.rev-col[data-k="${k}"]`).getBoundingClientRect(); return { x: r.left - sr.left + 6, y: 10, w: r.width - 12, h: sr.height - 18 }; });
    const counts = split(n, KEYS.map((k) => STANCES[k].pct));
    const groups = KEYS.map((k, i) => ({ pts: packRect(counts[i], rects[i], crowd.rnd) }));
    crowd.place(scatter(n, { x: 0, y: 0, w: sr.width, h: sr.height }, crowd.rnd));
    // 두 열과 점·숫자가 한 화면에 들어오게
    const top = window.scrollY + $('#rev').getBoundingClientRect().top - 72;
    window.scrollTo({ top: Math.max(0, top), behavior: REDUCED ? 'auto' : 'smooth' });
    setTimeout(() => crowd.move(targetsFor(crowd, groups, KEYS.indexOf(stance)), { duration: 1250, stagger: 380 }), REDUCED ? 0 : 420);
  });
}
const $$ = (q) => Array.from(document.querySelectorAll(q));
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
  $('#askCta').hidden = true; $('#result').hidden = true; $('#ask').hidden = true; $('#cmp').hidden = true; $('#wallBody').hidden = false;
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
window.__c4 = { get cur() { return cur; }, get dev() { return dev.slice(); }, get busy() { return busy; }, get stance() { return stance; }, get crowd() { return crowd; }, get ci() { return ci; }, get loupeOn() { return loupeOn; }, openCompare, openAsk, shoot, slide };
