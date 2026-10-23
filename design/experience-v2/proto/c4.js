// C4 나다르 사진관 — 두 화면(2D, 서버 없음 · 업로드 없음)
//   0. 들어가기: 나다르가 찍은 35, boulevard des Capucines 정면 사진을 밤으로 옮긴 판(img/c4n) — 서명 간판이 한 글자씩 · 창이 켜짐 · 다가감
//      → 유리 스튜디오의 마그네슘 섬광 속으로 → 하얗게 바랜 화면 아래에서 초상화 벽이 깊이에서 밀려 나오고 연기가 흩어진다. 누르면 건너뜀
//   1. 사진관 벽: 24명의 초상화를 화면 가득 살롱식으로(크기 · 모양 제각각, 초당 9px 위로, 두 벌을 이어 끊김 없이 — 한 화면에 같은 사람은 하나).
//      액자를 누르면 그 사람이 제자리에서 사진이 된다(금박 액자 → 명함판 대지, 어둠에서 0.8초 동안 현상). 다시 누르면 그림으로. 위아래로 끌면 둘러보기.
//      아래 "초상화 | 사진"을 누르면 벽 전체가 누른 쪽에서부터 물결처럼(30ms 간격) 바뀐다. 바뀌는 동안에도 벽은 흐른다. "당신이라면?" → 2.
//   2. 질문: 벽이 두 문처럼 갈라지고, 뒤로 흐릿한 두 줄기(왼쪽 그림은 위로, 오른쪽 사진은 아래로) 위에 "사람을 남긴다면, 그림입니까 사진입니까?".
//      반쪽을 누르면 사진 = 섬광과 연기, 그림 = 니스 빛 → 그쪽이 화면을 채우고 → 두 줄기가 오늘의 비율대로 나뉘며 큰 숫자. 뒤로(‹) → 1.
//      끝 단추 공통: [처음으로 | 수집함에 저장] + 다시 고르기(글자 링크). 저장은 수집함(기기 안)으로, 이미지 내려받기 아님
//   (+) 내 초상(선택): 전면 카메라(또는 데모 이미지) → 노출 4초 → 같은 한 장에서 두 벌: 19세기 사진(booth/js/nadar.js) · 유화 초상(c4-paint.js)
//      → 한 틀 안에서 가운데 막대를 끌어 비교(왼쪽 초상화 | 오른쪽 사진)
// 인물 · 출처: js/c4-people.json(위키미디어 공용 파일 페이지 · 라이선스) · 얼굴 틀: img/c4p/build.py · 정면 사진: img/c4n/build.py
// 움직임은 transform · opacity 만. 보이지 않는 화면 · 탭 숨김이면 멈춘다.
import { loadImage, startCamera, stopCamera, cameraErrorText, toast } from '../../../booth/js/common.js';
import { saveChoice } from './js/proto-common.js';
import { stampLine } from './js/crowd.js';
import * as N from '../../../booth/js/nadar.js';
import { createSteam } from './js/fx-steam.js';
import * as P from './c4-paint.js';

const $ = (s) => document.querySelector(s);
const $$ = (q) => Array.from(document.querySelectorAll(q));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stage = $('#ask'), hang = $('#hang'), qView = $('#qView');
const thumb = (id, k) => `img/c4p/${id}-${k}.jpg`;
const buzz = () => { if (navigator.vibrate) navigator.vibrate(8); };

// ── 탭
$$('.tab').forEach((t) => t.addEventListener('click', () => {
  $$('.tab').forEach((x) => { const on = x === t; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
  $$('.screen').forEach((s) => { s.hidden = s.dataset.screen !== t.dataset.tab; });
  if (t.dataset.tab !== 'me') stopCamera($('#cam'));
  syncFlow();
  window.scrollTo(0, 0);
}));
// 뒤로: 질문 화면이면 벽으로, 벽(또는 내 초상)이면 목록으로
$('#back').addEventListener('click', (e) => { if (!stage.hidden && view === 'q') { e.preventDefault(); showWall(); } });

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(a, rnd) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

let PEOPLE = [], BYID = {};
// ── 1. 살롱식 걸기(화면 가득). 줄마다 셋 · 큰 것 하나와 작은 것 둘(쌓기) · 둘 · 하나 를 섞고, 줄 안에서는 가운데 선에 맞춰 조금씩 어긋나게
// 액자 두께 m(폭의 약 9.5 %) — 창은 4:5
const hOf = (w) => { const m = Math.max(9, Math.round(w * 0.095)); return { h: Math.round((w - 2 * m) * 1.25 + 2 * m), m }; };
function salon(order, W, seed) {
  const rnd = rng(seed), P = 14, G = 12, U = W - 2 * P, items = [];
  let y = 18, i = 0, last = '';
  const put = (id, x, yy, w) => { const g = hOf(w); const it = { id, x: Math.round(x), y: Math.round(yy), w: Math.round(w), ...g }; items.push(it); return it; };
  while (i < order.length) {
    const left = order.length - i, r = rnd();
    let t = left === 1 ? 'D' : left === 2 ? 'C' : r < 0.4 ? 'A' : r < 0.72 ? 'B' : 'C';
    if (t === last && left > 3) t = t === 'A' ? 'B' : 'A';
    last = t;
    if (t === 'A') {          // 셋
      let ws = [0, 1, 2].map(() => U * (0.27 + rnd() * 0.06)); const s = Math.min(1, (U - 2 * G) / ws.reduce((a, b) => a + b, 0)); ws = ws.map((w) => w * s);
      const gap = (U - ws.reduce((a, b) => a + b, 0)) / 2, H = Math.max(...ws.map((w) => hOf(w).h));
      let x = P; ws.forEach((w) => { put(order[i++], x, y + (H - hOf(w).h) / 2 + (rnd() - 0.5) * 12, w); x += w + gap; });
      y += H + G + 4 + Math.round(rnd() * 10);
    } else if (t === 'B') {   // 큰 것 하나 + 작은 것 둘 쌓기(좌우는 번갈아)
      const b = (U - G) * (0.64 + rnd() * 0.04), s = U - b - G, bh = hOf(b).h, sh = hOf(s).h, T = 2 * sh + G, H = Math.max(bh, T), flip = rnd() < 0.5;
      const bx = flip ? P + s + G : P, sx = flip ? P : P + b + G;
      put(order[i++], bx, y + (H - bh) / 2, b);
      put(order[i++], sx, y + (H - T) / 2, s); put(order[i++], sx, y + (H - T) / 2 + sh + G, s);
      y += H + G + 6 + Math.round(rnd() * 10);
    } else if (t === 'C') {   // 둘
      let ws = [0, 1].map(() => U * (0.42 + rnd() * 0.08)); const s = Math.min(1, (U - G - 10) / (ws[0] + ws[1])); ws = ws.map((w) => w * s);
      const gap = U - ws[0] - ws[1], H = Math.max(...ws.map((w) => hOf(w).h));
      put(order[i++], P, y + (H - hOf(ws[0]).h) / 2 + (rnd() - 0.5) * 16, ws[0]); put(order[i++], P + ws[0] + gap, y + (H - hOf(ws[1]).h) / 2 + (rnd() - 0.5) * 16, ws[1]);
      y += H + G + 6 + Math.round(rnd() * 10);
    } else {                  // 하나
      const w = U * 0.56; put(order[i++], P + (U - w) / 2 + (rnd() - 0.5) * 30, y, w); y += hOf(w).h + G + 8;
    }
  }
  // 액자 양식: 금박(조각 몰딩 · 구슬 띠) · 흑단 나무에 금 턱 · 평평한 띠의 금박(카세타) · 타원 창. 두께도 조금씩 다르게
  const CYC = ['', 'wood', 'ov', 'cas', '', 'wood', '', 'cas', 'ov', ''];   // 금박 4 · 흑단 2 · 카세타 2 · 타원 2 의 비율로 섞는다
  items.forEach((it, i) => { it.shape = CYC[(i * 7 + (rnd() < 0.35 ? 1 : 0)) % CYC.length]; it.t = Math.round(it.m * (0.84 + rnd() * 0.16)); });
  return { items, H: y + 6 };
}
const isPh = new Set();      // 사진이 된 사람
function frameHTML(it, dy) {
  const p = BYID[it.id], ph = isPh.has(p.id);
  // 액자 · 몰딩 · 창은 늘 그대로 — 안의 그림만 바뀐다(그림 ↔ 사진)
  return `<button class="fr ${it.shape}${ph ? ' ph' : ''}${sel === p.id ? ' sel' : ''}" type="button" data-id="${p.id}" style="left:${it.x}px;top:${it.y + dy}px;width:${it.w}px;height:${it.h}px;--t:${it.t || it.m}px;--m:${it.m}px" aria-label="${p.name} · ${ph ? '사진' : '그림'}">`
    + `<span class="sight"><span class="win"><img class="im paint" src="${thumb(p.id, 'paint')}" alt="" draggable="false" decoding="async"><img class="im photo" src="${thumb(p.id, 'photo')}" alt="" draggable="false" decoding="async"><i class="dev"></i><i class="vn"></i></span></span></button>`;
}
function ghosts(W, Hf, seed) {
  const rnd = rng(seed), out = [];
  for (let y = 30; y < Hf - 40;) { const w = Math.round(W * (0.14 + rnd() * 0.1)), h = Math.round(w * 1.25); out.push({ x: Math.round(rnd() * (W - w)), y, w, h }); y += Math.round(h * 0.5) + 30 + Math.round(rnd() * 70); }
  const one = (dy) => out.map((g) => `<i class="ghost" style="left:${g.x}px;top:${g.y + dy}px;width:${g.w}px;height:${g.h}px"></i>`).join('');
  return one(0) + one(Hf);
}
// ── 2. 질문 뒤 두 줄기: 반쪽 폭에 두 칸 엇갈림(한 줄 간격 rs, 24장 = 12줄 → 주기 12·rs)
function stream(k, Wh, seed) {
  const rnd = rng(seed), order = shuffle(PEOPLE.map((p) => p.id), rnd), w = Math.round(Wh * 0.4), h = Math.round(w * (k === 'paint' ? 1.25 : 1.5)), rs = h + 30, H = 12 * rs;
  const one = (dy) => order.map((id, i) => {
    const c = i % 2, x = Math.round(c ? Wh * 0.53 : Wh * 0.07) + Math.round((rnd() - 0.5) * 8), y = Math.floor(i / 2) * rs + (c ? rs / 2 : 0) + dy;
    return `<i class="qt ${k}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><img src="${thumb(id, k)}" alt="" draggable="false" decoding="async"></i>`;
  }).join('');
  return { html: one(0) + one(H), H };
}

// ── 흐름(WAAPI). 벽은 위로 초당 9px(먼 층은 같은 주기 · 짧은 길이 → 초당 약 5px, 깊이). 질문의 그림 줄기는 위로, 사진 줄기는 아래로 초당 10px. 시작은 천천히 붙는다
let view = 'wall', wallAnims = [], qAnims = [], LAYOUT = [];
const up = (h) => [{ transform: 'translateY(0)' }, { transform: `translateY(${-h}px)` }], down = (h) => [{ transform: `translateY(${-h}px)` }, { transform: 'translateY(0)' }];
function build() {
  const W = Math.round(stage.getBoundingClientRect().width);
  const order = shuffle(PEOPLE.map((p) => p.id), rng(11));
  [...wallAnims, ...qAnims].forEach((a) => a.cancel()); wallAnims = []; qAnims = [];
  const S = salon(order, W, 3), far = $('#far'); LAYOUT = S.items;
  hang.style.height = `${S.H * 2}px`; hang.innerHTML = S.items.map((it) => frameHTML(it, 0)).join('') + S.items.map((it) => frameHTML(it, S.H)).join('');
  const Hf = Math.round(S.H * 0.55); far.style.height = `${Hf * 2}px`; far.innerHTML = ghosts(W, Hf, 5);
  const Wh = Math.round(W / 2), sp = stream('paint', Wh, 21), so = stream('photo', Wh, 23);
  [['#qsPaint', sp], ['#qsPhoto', so]].forEach(([q, s]) => { const t = $(q); t.style.width = `${Wh}px`; t.style.marginLeft = `${-Wh / 2}px`; t.style.height = `${s.H * 2}px`; t.innerHTML = s.html; });
  if (REDUCED) { syncFlow(); return; }
  const dW = (S.H / 9) * 1000;
  const a1 = hang.animate(up(S.H), { duration: dW, iterations: Infinity }), a2 = far.animate(up(Hf), { duration: dW, iterations: Infinity });
  a1.currentTime = a2.currentTime = dW * 0.04;
  const b1 = $('#qsPaint').animate(up(sp.H), { duration: (sp.H / 10) * 1000, iterations: Infinity }), b2 = $('#qsPhoto').animate(down(so.H), { duration: (so.H / 10) * 1000, iterations: Infinity });
  b1.currentTime = 0.3 * b1.effect.getTiming().duration; b2.currentTime = 0.6 * b2.effect.getTiming().duration;
  wallAnims = [a1, a2]; qAnims = [b1, b2];
  rampUp(); syncFlow();
}
let ramp = 1;
function rampUp() {
  const t0 = performance.now();
  const step = (now) => { const t = Math.min(1, (now - t0) / 1800); ramp = t * t * (3 - 2 * t); [...wallAnims, ...qAnims].forEach((a) => { const r = Math.max(0.0001, ramp); a.updatePlaybackRate ? a.updatePlaybackRate(r) : (a.playbackRate = r); }); if (t < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function syncFlow() {
  const vis = !stage.hidden && document.visibilityState === 'visible';
  const run = (list, on) => list.forEach((a) => { if (on && a.playState !== 'running') a.play(); else if (!on && a.playState === 'running') a.pause(); });
  run(wallAnims, vis && view === 'wall'); run(qAnims, vis && view === 'q');
}
document.addEventListener('visibilitychange', syncFlow);

// ── 그림 ↔ 사진: 한 사람(두 벌 함께). d = 시작 지연(ms)
function setPerson(id, ph, d = 0) {
  if (isPh.has(id) === ph) return false;
  ph ? isPh.add(id) : isPh.delete(id);
  const name = BYID[id].name;
  hang.querySelectorAll(`.fr[data-id="${id}"]`).forEach((f) => {
    f.style.setProperty('--d', `${d}ms`); f.classList.toggle('ph', ph); f.setAttribute('aria-label', `${name} · ${ph ? '사진' : '그림'}`);
    // 그림으로 돌아갈 때는 니스 빛이 창을 한 번 쓸고 간다(액자는 그대로)
    f.classList.remove('back'); if (!ph && !REDUCED) { void f.offsetWidth; f.classList.add('back'); }
  });
  if (sel === id) caption(id);
  return true;
}
const hint = (on) => $('#wHint').classList.toggle('off', !on);

// ── 누가 · 언제 — 마지막으로 누른 사람의 이름표(아래 '초상화 | 사진' 위). 지금 보이는 쪽을 먼저, 다른 쪽은 옅게
//    사진 작자 · 연도는 c4-people.json 그대로 — 비어 있으면 '작자 미상' · '연도 미상', 다게레오타입은 그렇게 적는다
let sel = null;
function credit(p, k) {
  const r = p[k] || {}, year = (r.year || '').trim() || '연도 미상';
  if (k === 'paint') return { kind: '그림', who: (r.by || '').trim() || '화가 미상', year };
  const dag = /다게레오타입/.test(`${r.where || ''} ${r.note || ''}`);
  return { kind: dag ? '다게레오타입' : '사진', who: (r.by || '').trim() || '작자 미상', year };
}
function caption(id) {
  const p = BYID[id], box = $('#wCap'); if (!p) return;
  const now = isPh.has(id) ? 'photo' : 'paint', other = now === 'photo' ? 'paint' : 'photo';
  const a = credit(p, now), b = credit(p, other);
  $('#capName').textContent = p.name;
  $('#capNow').innerHTML = `<em>${a.kind}</em> ${a.who}, ${a.year}`;
  $('#capOther').textContent = `${b.kind} · ${b.who}, ${b.year}`;
  box.dataset.k = now;
  if (box.hidden) { box.hidden = false; void box.offsetWidth; }
  box.classList.remove('swap'); void box.offsetWidth; box.classList.add('swap');
}
function select(id) {
  sel = id;
  hang.querySelectorAll('.fr.sel').forEach((f) => f.classList.remove('sel'));
  hang.querySelectorAll(`.fr[data-id="${id}"]`).forEach((f) => f.classList.add('sel'));
  caption(id);
}
hang.addEventListener('click', (e) => {
  const f = e.target.closest('.fr'); if (!f) return;
  setPerson(f.dataset.id, !isPh.has(f.dataset.id)); buzz(); hint(false); select(f.dataset.id);
  // 하나씩 눌러 모두 같은 쪽이 되면 아래 단추도 따라간다
  if (isPh.size === PEOPLE.length) segUI('photo'); else if (!isPh.size) segUI('paint');
});
// 벽 전체: 누른 쪽(초상화 = 왼쪽, 사진 = 오른쪽)에서부터 가로 위치 순서로 30ms 간격 물결
let mode = 'paint';
function segUI(m) { mode = m; $('#seg').dataset.m = m; $$('#seg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.m === m)); }
function setMode(m) {
  segUI(m);
  const ph = m === 'photo', order = LAYOUT.slice().sort((a, b) => (a.x + a.w / 2) - (b.x + b.w / 2) || a.y - b.y);
  if (ph) order.reverse();
  let n = 0; order.forEach((it, i) => { if (setPerson(it.id, ph, REDUCED ? 0 : i * 30)) n++; });
  if (n) buzz();
}
$$('#seg button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.m)));

// ── 화면 전환 — 벽이 가운데에서 두 문처럼 갈라진다(왼쪽 문은 그림, 오른쪽 문은 사진). 돌아올 때는 문이 다시 닫힌다
let doorBusy = false;
function makeDoors() {
  const wv = $('#wallView'), out = [];
  const tf = [...wv.querySelectorAll('.track')].map((t) => getComputedStyle(t).transform);
  ['l', 'r'].forEach((side) => {
    const d = document.createElement('div'); d.className = `door ${side}`; d.setAttribute('aria-hidden', 'true');
    const c = wv.cloneNode(true); c.removeAttribute('id'); c.className = 'door-in';
    c.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
    c.querySelectorAll('.track').forEach((t, i) => { t.style.transform = tf[i]; });
    c.querySelectorAll('button').forEach((b) => { b.tabIndex = -1; });
    d.appendChild(c); stage.appendChild(d); out.push(d);
  });
  return out;
}
// 오른쪽 문의 액자는 위에서부터 차례로 사진으로 현상되고, 왼쪽 문은 모두 그림으로
function dress(door, ph) {
  door.querySelectorAll('.fr').forEach((f) => { const y = parseFloat(f.style.top) || 0; f.style.setProperty('--d', `${Math.round((y % 900) / 900 * 260)}ms`); f.classList.toggle('ph', ph); });
}
const DOOR_MS = 1000, DOOR_EASE = 'cubic-bezier(.65,0,.3,1)';
function showQ() {
  if (doorBusy || view === 'q') return;
  pick(null);
  if (REDUCED) { view = 'q'; stage.dataset.view = 'q'; syncFlow(); return; }
  doorBusy = true; buzz();
  const [L, R] = makeDoors();
  dress(L, false); dress(R, true);
  const seam = document.createElement('i'); seam.className = 'seam'; stage.appendChild(seam);
  view = 'q'; stage.dataset.view = 'q'; syncFlow();
  qView.classList.remove('q-in'); void qView.offsetWidth; qView.classList.add('q-in');
  requestAnimationFrame(() => seam.classList.add('on'));
  const opt = { duration: DOOR_MS, delay: 300, easing: DOOR_EASE, fill: 'forwards' };
  L.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-54%)' }], opt);
  const a = R.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(54%)' }], opt);
  a.onfinish = () => { L.remove(); R.remove(); seam.remove(); doorBusy = false; };
  setTimeout(() => qView.classList.remove('q-in'), 2000);
}
function showWall() {
  if (doorBusy) return;
  pick(null);
  if (REDUCED || view !== 'q') { view = 'wall'; stage.dataset.view = 'wall'; syncFlow(); return; }
  doorBusy = true;
  const [L, R] = makeDoors();
  dress(L, false); dress(R, true);
  const opt = { duration: 850, easing: DOOR_EASE, fill: 'forwards' };
  L.animate([{ transform: 'translateX(-54%)' }, { transform: 'translateX(0)' }], opt);
  const a = R.animate([{ transform: 'translateX(54%)' }, { transform: 'translateX(0)' }], opt);
  a.onfinish = () => {
    view = 'wall'; stage.dataset.view = 'wall'; syncFlow();
    [L, R].forEach((d) => d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease', fill: 'forwards' }).onfinish = () => d.remove());
    doorBusy = false;
  };
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
    if (k === 'photo') { try { const r = stage.getBoundingClientRect(), sm = createSteam($('#smoke'), { res: 0.5, tints: ['250,250,252', '236,238,246'] }); sm.burst(r.left + r.width * 0.72, r.top + r.height * 0.45, 30, { speed: 180, size: [110, 220], life: [1.0, 1.8], alpha: 0.6 }); } catch (e) { /* noop */ } }
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

// ── 끌어서 둘러보기 — 위아래로 끌면 흐르는 벽을 그만큼 앞뒤로(먼 층도 같은 시간만큼 → 깊이 그대로). 놓으면 다시 흐른다. 끈 뒤의 누름은 액자를 바꾸지 않는다
(() => {
  const wv = $('#wallView'), PX_MS = 1000 / 9;   // 벽은 초당 9px
  let d = null;
  const shift = (dy) => wallAnims.forEach((a) => { const dur = a.effect.getTiming().duration; a.currentTime = ((((a.currentTime || 0) - dy * PX_MS) % dur) + dur) % dur; });
  wv.addEventListener('pointerdown', (e) => { if (view !== 'wall' || e.target.closest('.w-foot') || !wallAnims.length) return; d = { id: e.pointerId, y: e.clientY, y0: e.clientY, moved: false }; });
  wv.addEventListener('pointermove', (e) => {
    if (!d || e.pointerId !== d.id) return;
    if (!d.moved && Math.abs(e.clientY - d.y0) > 8) { d.moved = true; hint(false); wallAnims.forEach((a) => a.pause()); try { wv.setPointerCapture(e.pointerId); } catch (_) { /* noop */ } }
    if (d.moved) shift(e.clientY - d.y);
    d.y = e.clientY;
  });
  const end = (e) => {
    if (!d || e.pointerId !== d.id) return;
    if (d.moved) { const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; wv.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => wv.removeEventListener('click', stop, { capture: true }), 60); syncFlow(); }
    d = null;
  };
  wv.addEventListener('pointerup', end); wv.addEventListener('pointercancel', end);
})();

// ── 들어가기(약 3초, 누르면 건너뜀): 나다르가 찍은 35, boulevard des Capucines 정면 사진을 밤으로 옮긴 판(img/c4n, 퍼블릭 도메인 BnF)
//    → 실제 간판 자리의 서명 "Nadar"가 가스 불빛으로 한 글자씩 → 위층 유리 스튜디오 · 아래 가게 · 길의 가스등이 차례로 켜짐 → 길 건너에서 천천히 다가감
//    → 유리 스튜디오에서 마그네슘 섬광, 그 빛 속으로 → 하얗게 바랜 화면 아래에서 초상화 벽이 깊이에서 밀려 나오고 연기가 벽 위로 흩어진다
let introState = 'run';
const intro = $('#intro');
(() => {
  const cv = $('#inScene'), g = cv.getContext('2d');
  const U = (x) => (x - 2) / 94, V = (y) => (y - 6) / 82.5;          // 원본 사진 % → 판 0..1 (build.py 와 같은 자름)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const eio = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), ei = (t) => t * t * t;
  const st = { up: 0.12, low: 0.18, street: 0.3, lit: [0, 0, 0, 0, 0], flash: 0, t0: 0, flashAt: Infinity, flashT: 0 };
  let base = null, L = null, sign = null, raf = 0, W = 0, H = 0, dpr = 1, done = false, started = false;
  const timers = [], at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const loadI = (src) => new Promise((r) => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
  // 빛 마스크(R 위층 · G 아래층 · B 길) → 따뜻한 빛 판 세 장(알파 = 마스크)
  function lightLayers(im) {
    const w = im.naturalWidth, h = im.naturalHeight, src = document.createElement('canvas'); src.width = w; src.height = h;
    const sg = src.getContext('2d', { willReadFrequently: true }); sg.drawImage(im, 0, 0); const d = sg.getImageData(0, 0, w, h).data;
    return [[0, [255, 156, 70]], [1, [255, 170, 86]], [2, [255, 176, 98]]].map(([ch, col]) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const cg = c.getContext('2d'), o = cg.createImageData(w, h);
      for (let i = 0; i < w * h; i++) { o.data[i * 4] = col[0]; o.data[i * 4 + 1] = col[1]; o.data[i * 4 + 2] = col[2]; o.data[i * 4 + 3] = d[i * 4 + ch]; }
      cg.putImageData(o, 0, 0);
      // 빛 판은 부드러운 마스크라 절반 크기로 충분 — 매 프레임 그리는 값을 줄인다
      const s2 = document.createElement('canvas'); s2.width = w >> 1; s2.height = h >> 1; const g2 = s2.getContext('2d'); g2.imageSmoothingQuality = 'high'; g2.drawImage(c, 0, 0, s2.width, s2.height); return s2;
    });
  }
  // 서명 간판 — 글자마다 따로(가스 불빛 세 겹 + 흰 심)
  function signLetters() {
    const SW = 640, SH = 212, word = 'Nadar', font = "156px Sacramento, 'Snell Roundhand', cursive";
    const m = document.createElement('canvas').getContext('2d'); m.font = font;
    const x0 = (SW - m.measureText(word).width) / 2, xs = [...word].map((_, i) => x0 + m.measureText(word.slice(0, i)).width), y = SH * 0.66;
    const letters = [...word].map((ch, i) => {
      const c = document.createElement('canvas'); c.width = SW; c.height = SH; const lg = c.getContext('2d'); lg.font = font;
      for (const [blur, col, a] of [[28, 'rgba(255,120,40,1)', 0.9], [11, 'rgba(255,170,80,1)', 1], [3, 'rgba(255,226,170,1)', 1]]) { lg.shadowColor = col; lg.shadowBlur = blur; lg.globalAlpha = a; lg.fillStyle = col; lg.fillText(ch, xs[i], y); }
      lg.shadowBlur = 0; lg.globalAlpha = 1; lg.fillStyle = '#fff6e2'; lg.fillText(ch, xs[i], y); return c;
    });
    const off = document.createElement('canvas'); off.width = SW; off.height = SH; const og = off.getContext('2d'); og.font = font; og.fillStyle = 'rgba(150,80,50,.22)'; og.fillText(word, xs[0], y);
    return { letters, off, SW, SH };
  }
  // 빛 판 · 간판 글자를 한 번 미리 그려 둔다(첫 켜짐에서 멈칫하지 않게)
  function prewarm() { try { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const pg = c.getContext('2d'); [...(L || []), base, ...(sign ? [sign.off, ...sign.letters] : [])].forEach((im) => im && pg.drawImage(im, 0, 0, 64, 64)); pg.getImageData(0, 0, 1, 1); } catch (e) { /* noop */ } }
  function size() { const r = intro.getBoundingClientRect(); dpr = Math.min(1.5, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  // 카메라: 판 폭 = 화면 폭 × 1.47(가운데 47.6 % 기준), 길 건너(k=1) → 간판 앞(k≈1.5) → 섬광 속 유리 스튜디오로(k≈7)
  function draw(now) {
    raf = requestAnimationFrame(draw);
    const t = now - st.t0;
    let k = 1, fx = U(47.6), fy = V(44);
    if (!REDUCED) {
      const e = eio(clamp(t / 2250, 0, 1)) * 0.9 + clamp(t / 2250, 0, 1) * 0.1;
      k = lerp(1, 1.5, e); fy = lerp(V(46), V(40), e);
      if (st.flashT) { const f = ei(clamp((now - st.flashT) / 420, 0, 1)); k = lerp(1.5, 7, f); fx = lerp(fx, U(47), f); fy = lerp(V(40), V(30.5), f); }
    } else { k = 1.18; fy = V(43); }
    const fw = W * 1.47 * k, fh = fw * (base ? base.naturalHeight / base.naturalWidth : 1.14);
    const ox = W / 2 - fx * fw, oy = H * 0.46 - fy * fh;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#010102'); sky.addColorStop(1, '#05050b'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    if (!base) return;
    g.drawImage(base, ox, oy, fw, fh);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(ox, oy, fw, fh);   // 밤 — 바탕은 조금 더 어둡게
    // 가스 불빛이 아주 조금 흔들린다
    const fl = REDUCED ? 1 : 0.92 + 0.05 * Math.sin(now / 1000 * 7.3) + 0.03 * Math.sin(now / 1000 * 13.1);
    g.globalCompositeOperation = 'lighter';
    // 위층(유리 스튜디오 · 간판 층)은 두 번 겹쳐 더 따뜻하게
    if (L) [[0, st.up], [0, st.up * 0.6], [1, st.low], [2, st.street]].forEach(([i, a]) => { if (a > 0.01) { g.globalAlpha = clamp(a * fl, 0, 1); g.drawImage(L[i], ox, oy, fw, fh); } });
    // 길의 가스등 번짐
    [[63.1, 66.4, 0.07], [9.0, 66.2, 0.08]].forEach(([x, y, r]) => { const cx = ox + U(x) * fw, cy = oy + V(y) * fh, rr = r * fw; const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr); gr.addColorStop(0, `rgba(255,200,130,${0.55 * st.street * fl})`); gr.addColorStop(1, 'rgba(255,170,90,0)'); g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); });
    // 간판 — 실제 자리(원본 x 33.5→62.5 %, y 41.4→38.0 %, 오른쪽으로 오르는 서명)
    if (sign) {
      const x0 = ox + U(33.5) * fw, y0 = oy + V(41.4) * fh, x1 = ox + U(62.5) * fw, y1 = oy + V(38.0) * fh;
      const len = Math.hypot(x1 - x0, y1 - y0) * 1.18, sh = len * sign.SH / sign.SW;
      g.save(); g.translate((x0 + x1) / 2, (y0 + y1) / 2 - fh * 0.006); g.rotate(Math.atan2(y1 - y0, x1 - x0) * 0.75);
      g.globalAlpha = 1; g.drawImage(sign.off, -len / 2, -sh / 2, len, sh);
      sign.letters.forEach((c, i) => { const a = st.lit[i]; if (a > 0) { g.globalAlpha = clamp(a, 0, 1); g.drawImage(c, -len / 2, -sh / 2, len, sh); } });
      const glow = st.lit.reduce((s, v) => s + v, 0) / 5; if (glow > 0) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, len * 0.75); gr.addColorStop(0, `rgba(255,154,74,${0.22 * glow})`); gr.addColorStop(1, 'rgba(255,154,74,0)'); g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(-len, -len * 0.5, len * 2, len); }
      g.restore();
    }
    // 섬광 — 유리 스튜디오에서
    if (st.flash > 0) { const cx = ox + U(47) * fw, cy = oy + V(30.5) * fh, rr = fw * 0.5; const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr); gr.addColorStop(0, `rgba(240,244,255,${st.flash})`); gr.addColorStop(1, 'rgba(240,244,255,0)'); g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // 가장자리 어둠
    const vg = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.45, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  const anim = (dur, fn) => { const t0 = performance.now(); const step = (now) => { const t = clamp((now - t0) / dur, 0, 1); fn(t); if (t < 1 && !done) requestAnimationFrame(step); }; requestAnimationFrame(step); };
  const ignite = (i) => { const seq = [0.2, 1, 0.35, 1, 0.6, 1]; anim(600, (t) => { st.lit[i] = seq[Math.min(seq.length - 1, Math.floor(t * seq.length))]; }); };
  const allLit = () => { st.lit.fill(1); st.up = 1; st.low = 0.85; st.street = 1; };
  // 밤안개(길 위로 흐르는 옅은 김)
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
  // 마그네슘 연기 — 섬광 뒤 피어올라 벽 위로 흩어진다
  const puff = () => {
    if (REDUCED) return;
    try {
      const sm = createSteam($('#smoke'), { res: 0.5, tints: ['250,250,252', '236,238,246', '255,246,232'] });
      sm.burst(innerWidth / 2, innerHeight * 0.4, 38, { speed: 300, size: [180, 320], life: [1.0, 1.7], alpha: 0.32, w: innerWidth * 0.8, h: innerHeight * 0.25 });
      setTimeout(() => sm.burst(innerWidth / 2, innerHeight * 0.5, 18, { speed: 200, size: [240, 400], life: [0.9, 1.5], alpha: 0.2 }), 130);
    } catch (e) { /* noop */ }
  };
  const enter = () => { stage.classList.add('entered'); document.body.classList.remove('intro-on'); };
  const finish = (fast) => {
    if (done) return; done = true; introState = 'done';
    timers.forEach(clearTimeout);
    if (fast) { allLit(); intro.classList.remove('flash'); void intro.offsetWidth; intro.classList.add('flash-q'); }
    enter(); intro.classList.add('out');
    setTimeout(() => { intro.hidden = true; cancelAnimationFrame(raf); if (mist) mist.stop(); }, 900);
  };
  const run = () => {
    if (done || started) return; started = true;
    size(); st.t0 = performance.now(); raf = requestAnimationFrame(draw); intro.classList.add('go');
    if (REDUCED) { allLit(); at(1300, () => finish(false)); return; }
    for (let i = 0; i < 5; i++) at(380 + i * 190, () => ignite(i));
    at(1150, () => anim(700, (t) => { st.up = lerp(0.12, 1, 1 - Math.pow(1 - t, 3)); }));
    at(1350, () => anim(900, (t) => { const e = 1 - Math.pow(1 - t, 3); st.low = lerp(0.18, 0.85, e); st.street = lerp(0.3, 1, e); }));
    at(2250, () => {
      introState = 'flash'; st.flashT = performance.now(); intro.classList.add('flash'); puff();
      anim(500, (t) => { st.flash = t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9; });
    });
    at(2380, enter);
    at(2520, () => finish(false));
  };
  // 정면 사진 · 빛 마스크 · 간판 글꼴(서명체)을 받은 뒤 시작 — 늦으면 1.6초에 있는 것으로 시작
  Promise.race([
    Promise.all([loadI('img/c4n/facade.jpg'), loadI('img/c4n/lights.png'), document.fonts ? document.fonts.load('80px Sacramento').catch(() => {}) : null])
      .then(([b, l]) => { base = b; try { if (l) L = lightLayers(l); } catch (e) { L = null; } sign = signLetters(); prewarm(); }),
    new Promise((r) => setTimeout(r, 1600)),
  ]).then(() => { if (!sign) sign = signLetters(); run(); });
  addEventListener('resize', () => { if (!done && started) size(); });
  const skip = () => { if (!done) finish(true); };
  intro.addEventListener('click', skip);
  intro.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); skip(); } });
  window.__c4intro = { skip };
})();

const loadImg = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
// ── 시작: 인물 목록 → 작은 판 48장을 받은 뒤 건다(벽은 다 받으면 천천히 나타난다)
(async () => {
  const data = await fetch('js/c4-people.json').then((r) => r.json());
  PEOPLE = data.people; PEOPLE.forEach((p) => { BYID[p.id] = p; });
  await Promise.all(PEOPLE.flatMap((p) => ['paint', 'photo'].map((k) => loadImg(thumb(p.id, k)))));
  build();
  requestAnimationFrame(() => stage.classList.add('ready'));

  let t, lastW = innerWidth; window.addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; clearTimeout(t); t = setTimeout(build, 200); });
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
  get photos() { return isPh.size; }, get flowing() { return wallAnims.some((a) => a.playState === 'running'); }, get qFlowing() { return qAnims.some((a) => a.playState === 'running'); },
  pick, setMode, showQ, showWall, get slider() { return slider; }, get duo() { return !!frames; } };
// 다른 페이지로 — 화면이 어둠으로 잠긴 뒤 넘어간다(끊긴 페이지 전환 없이)
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]'); if (!a || a.hasAttribute('download') || e.defaultPrevented || a.target) return;
  e.preventDefault(); document.body.classList.add('leaving'); setTimeout(() => { location.href = a.href; }, REDUCED ? 0 : 430);
});
