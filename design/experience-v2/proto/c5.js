// C5 모네 전시관 — 시간 넘기기 (보기형, 질문 없음)
//   어두운 방의 연작 벽(건초더미 · 루앙 대성당 · 포플러 · 수련) → 하나를 누르면 그 자리가 화면을 채운다
//   → 아래 시간 선을 밀거나 눌러 같은 자리를 다른 때에 그린 그림으로 넘어간다(크로스페이드 + 느린 빛 쓸기)
//   → 벽으로 돌아오면 출구 벽의 문장이 한 번 떠오른다. 답하지 않는다. → "출구에서 오늘의 관람객 보기"(exit.html)
//   그림은 전부 퍼블릭 도메인(js/c5-sources.json 에 출처). 때 이름은 제목에 있는 말만 쓴다. 서버 없음.
import { $, $$, icons, reduceMotion, haptic } from './js/proto-common.js';

icons();
const W = '../works/';
// 연작 넷 — 프레임 순서는 하루의 흐름(아침 → 정오 → 저녁) 뒤에 날씨, 수련은 연도순
const SERIES = [
  { id: 'haystacks', name: '건초더미', place: '지베르니 · 1890–91', cover: 'c5-haystacks-sunset-snow-aic.jpg', frames: [
    { f: 'c5-haystacks-snow-morning-getty.jpg', when: '아침' },
    { f: 'c5-haystacks-sun-mist-mia.jpg', when: '안개' },
    { f: 'c5-haystacks-end-of-summer-aic.jpg', when: '여름 끝' },
    { f: 'c5-haystacks-end-of-day-autumn-aic.jpg', when: '하루의 끝' },
    { f: 'c5-haystacks-sunset-snow-aic.jpg', when: '해 질 녘' },
    { f: 'c2-giverny-haystacks-met.jpg', when: '눈' },
  ] },
  { id: 'rouen', name: '루앙 대성당', place: '루앙 · 1892–94', cover: 'c5-rouen-harmonie-bleue-et-or-orsay.jpg', frames: [
    { f: 'c5-rouen-harmonie-blanche-orsay.jpg', when: '아침' },
    { f: 'c5-rouen-harmonie-bleue-orsay.jpg', when: '아침 햇빛' },
    { f: 'c5-rouen-noon-pushkin.jpg', when: '정오' },
    { f: 'c2-rouen-cathedrale-nga.jpg', when: '햇빛' },
    { f: 'c5-rouen-evening-pushkin.jpg', when: '저녁' },
    { f: 'c2-rouen-cathedrale-orsay.jpg', when: '흐린 날' },
  ] },
  { id: 'poplars', name: '포플러', place: '엡트 강 · 1891', cover: 'c2-giverny-four-trees-met.jpg', frames: [
    { f: 'c2-giverny-four-trees-met.jpg', when: '네 그루' },
    { f: 'c5-poplars-wind-effect-orsay.jpg', when: '바람' },
    { f: 'c5-poplars-epte-ngs.jpg', when: '엡트 강' },
    { f: 'c5-poplars-three-trees-pma.jpg', when: '세 그루' },
  ] },
  { id: 'waterlilies', name: '수련', place: '지베르니 · 1897–1919', cover: 'c5-waterlilies-1906-aic.jpg', frames: [
    { f: 'c5-waterlilies-evening-marmottan.jpg', when: '저녁' },
    { f: 'c2-giverny-bridge-met.jpg', when: '1899' },
    { f: 'c5-waterlilies-1905-mfa.jpg', when: '1905' },
    { f: 'c5-waterlilies-1906-aic.jpg', when: '1906' },
    { f: 'c5-waterlilies-bleus-orsay.jpg', when: '1916' },
    { f: 'c5-waterlilies-pond-1917-aic.jpg', when: '1917' },
  ] },
];
let META = {};
try { const list = await fetch('js/c5-sources.json').then((r) => r.json()); list.forEach((m) => { META[m.file] = m; }); } catch (e) { console.warn('[c5] sources', e); }
const meta = (f) => META[f] || { title_ko: '', title_en: f, year: '', museum_ko: '' };

// ── 연작 벽
const strip = $('#strip');
const seen = new Set();
strip.innerHTML = SERIES.map((s, i) => `
  <button class="work" type="button" data-i="${i}" aria-label="${s.name} 연작 · ${s.frames.length}점">
    <div class="fr"><span class="n">${i + 1}</span><img src="${W + s.cover}" alt="" draggable="false"><span class="sp"></span></div>
    <span><b>${s.name}</b><small>${s.place} · ${s.frames.length}점</small></span>
  </button>`).join('');
$$('.work', strip).forEach((b) => b.addEventListener('click', () => open(+b.dataset.i)));

// ── 보기
const view = $('#view'), stage = $('#stage'), layers = [$('#layerA'), $('#layerB')], sweep = $('#sweep'), rail = $('#rail'), caption = $('#caption'), hint = $('#swipeHint');
let cur = null, idx = 0, top = 0, swiped = false, lastSwitch = 0;
function open(i) {
  cur = SERIES[i]; idx = 0; swiped = false;
  $('#viewTitle').textContent = `${cur.name} · ${cur.place}`;
  rail.innerHTML = cur.frames.map((fr, k) => `<button class="tick" type="button" role="tab" data-k="${k}"><span>${fr.when}</span><i>${(meta(fr.f).year || '').replace(/–.*$/, '')}</i></button>`).join('');
  $$('.tick', rail).forEach((t) => t.addEventListener('click', () => go(+t.dataset.k)));
  cur.frames.forEach((fr) => { const im = new Image(); im.src = W + fr.f; });            // 한 연작을 한꺼번에 받아 둔다
  layers.forEach((l) => { l.classList.remove('on'); l.removeAttribute('src'); });
  hint.classList.remove('off');
  view.hidden = false; document.body.style.overflow = 'hidden';
  show(0, true);
  seen.add(cur.id); $$('.work', strip)[i].classList.add('seen');
}
function close() {
  view.hidden = true; document.body.style.overflow = '';
  // 벽으로 돌아오면 출구 벽의 문장이 한 번 떠오른다 — 방의 질문. 답하지 않는다
  const line = $('#wallLine'); if (line.hidden) { line.hidden = false; }
}
$('#viewClose').addEventListener('click', close);
function show(k, first) {
  const fr = cur.frames[k], m = meta(fr.f);
  const next = layers[1 - top], prev = layers[top];
  next.src = W + fr.f;
  const swap = () => { next.classList.add('on'); prev.classList.remove('on'); top = 1 - top; };
  if (next.complete && next.naturalWidth) swap(); else next.addEventListener('load', swap, { once: true });
  if (!first && !reduceMotion) { sweep.classList.remove('run'); void sweep.offsetWidth; sweep.classList.add('run'); }
  $('#capWhen').textContent = fr.when;
  $('#capTitle').textContent = `〈${m.title_ko || m.title_en}〉`;
  $('#capMeta').textContent = [m.year, m.museum_ko, m.license === 'CC0' ? 'CC0' : 'PD'].filter(Boolean).join(' · ');
  caption.classList.remove('fade'); void caption.offsetWidth; caption.classList.add('fade');
  $('#viewCount').textContent = `${k + 1} / ${cur.frames.length}`;
  $$('.tick', rail).forEach((t, i) => { t.classList.toggle('on', i === k); t.setAttribute('aria-selected', i === k); });
  const on = $('.tick.on', rail); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: first || reduceMotion ? 'auto' : 'smooth' });
}
function go(k) {
  if (!cur) return;
  k = (k + cur.frames.length) % cur.frames.length;
  if (k === idx) return;
  idx = k; lastSwitch = performance.now(); haptic(8);
  show(k);
}
// 그림 위에서 옆으로 밀면 다음 · 이전 때
{
  let d = null;
  stage.addEventListener('pointerdown', (e) => { d = { x: e.clientX, y: e.clientY, id: e.pointerId, horiz: false }; });
  stage.addEventListener('pointermove', (e) => {
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.horiz && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) { d.horiz = true; try { stage.setPointerCapture(e.pointerId); } catch (_) { /* noop */ } }
  });
  const up = (e) => {
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x; d = null;
    if (Math.abs(dx) > 40) { go(idx + (dx < 0 ? 1 : -1)); if (!swiped) { swiped = true; hint.classList.add('off'); } }
  };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', () => { d = null; });
  stage.addEventListener('touchmove', (e) => { if (d && d.horiz) e.preventDefault(); }, { passive: false });
}

// 검수용
window.__c5 = { SERIES, open, close, go, get idx() { return idx; }, get cur() { return cur; }, get seen() { return [...seen]; } };
