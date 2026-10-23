// C4 나다르 사진관 — 두 화면
//   1. 사진관 벽: 24명의 초상화를 화면 가득 살롱식으로(크기 · 모양 제각각, 초당 9px 위로, 두 벌을 이어 끊김 없이 — 한 화면에 같은 사람은 하나).
//      액자를 누르면 그 사람이 제자리에서 사진이 된다(금박 액자 → 명함판 대지, 어둠에서 0.8초 동안 현상). 다시 누르면 그림으로.
//      아래 "초상화 | 사진"을 누르면 벽 전체가 누른 쪽에서부터 물결처럼(30ms 간격) 바뀐다. 바뀌는 동안에도 벽은 흐른다.
//      "당신이라면?" → 2.
//   2. 질문: 뒤로 흐릿한 두 줄기(왼쪽 그림은 위로, 오른쪽 사진은 아래로) 위에 어두운 막, 위에 "사람을 남긴다면, 그림입니까 사진입니까?".
//      반쪽을 누르면 그쪽이 화면을 채우고 다른 쪽은 물러난다 → 오늘의 관람객 → 그때는 이랬다 → 카드 저장. 뒤로(‹) → 1.
//   (+) 내 초상(선택): 전면 카메라 → 노출 4초 → 부스 프로토타입의 19세기 사진 파이프라인(booth/js/nadar.js) 재사용
// 인물 · 출처: js/c4-people.json(위키미디어 공용 파일 페이지 · 라이선스) · 얼굴 틀: img/c4p/build.py
// 움직임은 transform · opacity 만. 보이지 않는 화면 · 탭 숨김이면 멈춘다. 서버 없음, 업로드 없음.
import { loadImage, startCamera, stopCamera, cameraErrorText, toast } from '../../../booth/js/common.js';
import { saveChoice } from './js/proto-common.js';
import { stampLine } from './js/crowd.js';
import * as N from '../../../booth/js/nadar.js';
import { createSteam } from './js/fx-steam.js';

const $ = (s) => document.querySelector(s);
const $$ = (q) => Array.from(document.querySelectorAll(q));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stage = $('#ask'), hang = $('#hang'), qView = $('#qView');
const thumb = (id, k) => `img/c4p/${id}-${k}.jpg`;
// 명함판 대지 아래 금 글씨 — 기록에 있는 스튜디오만
const STUDIO = { '나다르': 'Nadar', '에티엔 카르자': 'Ét. Carjat', '피에르 프티': 'Pierre Petit', '헤르만 비오브': 'H. Biow', 'A. 그레이너': 'A. Greiner' };
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
const hOf = (w) => { const m = Math.max(5, Math.round(w * 0.062)); return { h: Math.round((w - 2 * m) * 1.25 + 2 * m), m }; };
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
  items.forEach((it) => { const r = rnd(); it.shape = r < 0.24 ? 'ov' : r < 0.42 ? 'wood' : ''; });
  return { items, H: y + 6 };
}
const isPh = new Set();      // 사진이 된 사람
function frameHTML(it, dy) {
  const p = BYID[it.id], st = STUDIO[p.photo.by] || '', ph = isPh.has(p.id);
  const cw = Math.min(it.w - 6, Math.round(it.h * 0.68));
  return `<button class="fr ${it.shape}${ph ? ' ph' : ''}" type="button" data-id="${p.id}" style="left:${it.x}px;top:${it.y + dy}px;width:${it.w}px;height:${it.h}px;--m:${it.m}px;--cw:${cw}px" aria-label="${p.name} · ${ph ? '사진' : '그림'}">`
    + `<span class="pt"><span class="win"><img src="${thumb(p.id, 'paint')}" alt="" draggable="false" decoding="async"></span></span>`
    + `<span class="cv"><span class="cv-win"><img src="${thumb(p.id, 'photo')}" alt="" draggable="false" decoding="async"><i class="dev"></i></span><span class="cv-imp">${st}</span></span></button>`;
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
  hang.querySelectorAll(`.fr[data-id="${id}"]`).forEach((f) => { f.style.setProperty('--d', `${d}ms`); f.classList.toggle('ph', ph); f.setAttribute('aria-label', `${name} · ${ph ? '사진' : '그림'}`); });
  return true;
}
hang.addEventListener('click', (e) => {
  const f = e.target.closest('.fr'); if (!f) return;
  setPerson(f.dataset.id, !isPh.has(f.dataset.id)); buzz();
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

// ── 들어가기: 밤의 나다르 사진관 → 서명 간판이 한 글자씩 → 창이 켜짐 → 마그네슘 섬광 속으로 카메라가 문을 지나 → 벽이 깊이에서 밀려 나온다. 누르면 건너뜀
let wallBuilt = false, introState = 'run';
const intro = $('#intro');
(() => {
  const fac = intro.querySelector('.in-fac'), wins = intro.querySelector('.in-wins'), cam = $('#inCam'), letters = [...intro.querySelectorAll('.neon i')];
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const enter = () => { stage.classList.add('entered'); document.body.classList.remove('intro-on'); };
  let done = false;
  const finish = (fast) => {
    if (done) return; done = true; introState = 'done';
    timers.forEach(clearTimeout);
    if (fast) { letters.forEach((l) => l.classList.add('on')); intro.classList.add('warm'); }
    enter(); intro.classList.add('out');
    setTimeout(() => { intro.hidden = true; if (mist) mist.stop(); }, 800);
  };
  // 섬광은 문 한가운데에서 — 카메라는 그 문을 향해 들어간다
  const aim = () => { const d = intro.querySelector('.iw.mid').getBoundingClientRect(), r = intro.getBoundingClientRect(); cam.style.transformOrigin = `${d.left + d.width / 2 - r.left}px ${d.top + d.height * 0.42 - r.top}px`; };
  // 밤안개(길 위로 흐르는 옅은 김) · 마그네슘 연기(섬광 뒤 피어오름)
  const mistCv = $('#inMist'); let mist = null;
  if (!REDUCED) {
    try {
      mist = createSteam(mistCv, { res: 0.35, tints: ['96,94,118', '80,76,96', '120,96,110'] });
      const ih = innerHeight;
      mist.emitter({ x: -60, y: ih * 0.86, jx: 40, rate: 9, vx: 4, wind: 26, vy: [1, 5], size: [220, 340], grow: [20, 40], alpha: [0.1, 0.18], life: [5, 8] });
      mist.emitter({ x: innerWidth * 0.5, y: ih * 0.97, jx: innerWidth * 0.6, rate: 6, vx: 8, wind: 10, vy: [2, 8], size: [200, 320], grow: [16, 30], alpha: [0.08, 0.15], life: [4, 7] });
      mist.prewarm(5); mist.start();
    } catch (e) { mist = null; }
  }
  const puff = () => {
    if (REDUCED) return;
    try {
      const sm = createSteam($('#smoke'), { res: 0.5, tints: ['250,250,252', '236,238,246', '255,246,232'] });
      const d = intro.querySelector('.iw.mid').getBoundingClientRect();
      sm.burst(d.left + d.width / 2, d.top + d.height * 0.4, 40, { speed: 300, size: [200, 360], life: [0.9, 1.6], alpha: 0.42, w: d.width * 1.4, h: d.height * 0.6 });
      setTimeout(() => sm.burst(innerWidth / 2, innerHeight * 0.5, 22, { speed: 200, size: [260, 420], life: [0.9, 1.5], alpha: 0.24 }), 120);
    } catch (e) { /* noop */ }
  };
  const run = () => { if (done) return;
  if (REDUCED) {
    letters.forEach((l) => l.classList.add('on')); fac.classList.add('lit'); wins.classList.add('warm'); intro.classList.add('warm');
    at(1300, () => finish(false));
  } else {
    intro.classList.add('go');
    letters.forEach((l, i) => at(380 + i * 190, () => l.classList.add('on')));
    at(1150, () => fac.classList.add('lit'));
    at(1350, () => { wins.classList.add('warm'); intro.classList.add('warm'); });
    at(2250, () => { aim(); intro.classList.add('flash'); introState = 'flash'; puff(); });
    at(2360, () => { enter(); });
    at(2480, () => finish(false));
  }
  };
  // 간판 글꼴(서명체)을 받은 뒤 시작 — 늦으면 0.7초에 그냥 시작
  Promise.race([document.fonts ? document.fonts.load('40px Sacramento').catch(() => {}) : null, new Promise((r) => setTimeout(r, 700))]).then(run);
  const skip = () => { if (!done) finish(true); };
  intro.addEventListener('click', skip);
  intro.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); skip(); } });
  window.__c4intro = { skip };
})();

// ── 시작: 인물 목록 → 작은 판 48장을 받은 뒤 건다(벽은 다 받으면 천천히 나타난다)
(async () => {
  const data = await fetch('js/c4-people.json').then((r) => r.json());
  PEOPLE = data.people; PEOPLE.forEach((p) => { BYID[p.id] = p; });
  await Promise.all(PEOPLE.flatMap((p) => ['paint', 'photo'].map((k) => loadImg(thumb(p.id, k)))));
  build();
  requestAnimationFrame(() => stage.classList.add('ready'));
  wallBuilt = true;
  let t, lastW = innerWidth; window.addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; clearTimeout(t); t = setTimeout(build, 200); });
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
  get photos() { return isPh.size; }, get flowing() { return wallAnims.some((a) => a.playState === 'running'); }, get qFlowing() { return qAnims.some((a) => a.playState === 'running'); },
  get card() { return !!lastCard; }, cardURL: () => lastCard && lastCard.toDataURL('image/jpeg', 0.85), pick, setMode };
// 다른 페이지로 — 화면이 어둠으로 잠긴 뒤 넘어간다(끊긴 페이지 전환 없이)
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]'); if (!a || a.hasAttribute('download') || e.defaultPrevented || a.target) return;
  e.preventDefault(); document.body.classList.add('leaving'); setTimeout(() => { location.href = a.href; }, REDUCED ? 0 : 430);
});
