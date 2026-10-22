// C0 아카데미 살롱 — 올해의 메달 한 점
//   1 역할 → 2 특별 액자 벽(한 줄의 후보작 5점. 그림을 누르면 들리고 스포트라이트 → "메달 수여" 또는 메달 끌어 올리기) → 확인 → 3 오늘의 심사위원단(액자는 그대로, 아래에 비율) → 4 카드
//   벽은 바꾸지 않는다. 현장에 한 줄로 걸린 5점이 그대로 화면의 한 줄이다. 후보작·문구: 보드 experience-v2.html C0-A, 앱 missions.ts 'salon'. 비율·인원은 예시 수치.
import { $, $$, icons, sheet, toast, sleep, reduceMotion, showScreen, haptic, saveChoice } from './js/proto-common.js';
import { createCrowd, dotsFor, split, packRect, scatter, targetsFor, stampLine } from './js/crowd.js';

const WORKS = [
  { n: 1, src: '../works/c0-cambyses.jpg',   w: 420, h: 304, title: '펠루시움의 캄비세스 왕', artist: '폴 마리 르누아르',   year: '1872', coll: '',               shown: '1873년 살롱 출품 · 미확인(Commons 설명만)' },
  { n: 2, src: '../works/c0-cartridges.jpg', w: 420, h: 273, title: '마지막 탄약통',          artist: '알퐁스 드 뇌빌',     year: '1873', coll: '바제유 마지막 탄약통의 집', shown: '1873년 살롱 출품' },
  { n: 3, src: '../works/c0-vision.jpg',     w: 420, h: 352, title: '환상, 14세기 전설',      artist: '뤽 올리비에 메르송', year: '1872', coll: '릴 미술관',        shown: '1873년 살롱 출품 · 2차 자료만' },
  { n: 4, src: '../works/c0-spring.jpg',     w: 248, h: 420, title: '봄날',                  artist: '피에르 오귀스트 코트', year: '1873', coll: '메트로폴리탄',     shown: '1873년 살롱 출품' },
  { n: 5, src: '../works/c0-bonbock.jpg',    w: 520, h: 589, title: '르 봉 보크',            artist: '에두아르 마네',       year: '1873', coll: '필라델피아 미술관', shown: '1873년 살롱 출품 · 카바넬 〈클레오파트라〉(1887) 대신' },
];
const TODAY = { 1: 9, 2: 27, 3: 18, 4: 39, 5: 7 };   // 예시 수치
const JURY = '1,284';
const TOP = +Object.keys(TODAY).sort((a, b) => TODAY[b] - TODAY[a])[0];   // 오늘 표가 가장 많은 번호

// 메달 — 금 원반, 월계관 두 가지, 가운데 연도. 이모지 없음. id 는 그라데이션 충돌을 피하려고 자리마다 다르게
function medalSVG(id, year = true) {
  const leaves = [];
  for (let i = 0; i < 9; i++) {
    // 왼쪽 가지는 아래(100°)에서 왼쪽 위(200°)로, 오른쪽 가지는 그 거울. 잎의 긴 축은 원의 접선 방향
    for (const deg of [100 + i * 12.5, 80 - i * 12.5]) {
      const a = deg * Math.PI / 180, cx = 50 + Math.cos(a) * 31, cy = 55 + Math.sin(a) * 31;
      leaves.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="3.1" ry="6" transform="rotate(${deg.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})" fill="#7A5412" stroke="#F3DB8E" stroke-width=".7"/>`);
    }
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <radialGradient id="${id}g" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="#FFF4C4"/><stop offset=".42" stop-color="#E6BE55"/><stop offset=".8" stop-color="#A67A1E"/><stop offset="1" stop-color="#6E4A0E"/></radialGradient>
      <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1B8"/><stop offset="1" stop-color="#8A5E14"/></linearGradient>
    </defs>
    <path d="M44 2 h12 l-2 10 h-8 z" fill="#B3262E"/>
    <circle cx="50" cy="55" r="44" fill="url(#${id}g)" stroke="#5E3F0A" stroke-width="1.2"/>
    <circle cx="50" cy="55" r="39.5" fill="none" stroke="url(#${id}r)" stroke-width="1.6" opacity=".9"/>
    <circle cx="50" cy="55" r="36.5" fill="none" stroke="#6E4A0E" stroke-width=".8" opacity=".7"/>
    ${leaves.join('')}
    ${year ? '<text x="50" y="52" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" font-weight="700" font-size="9" letter-spacing="1.5" fill="#5E3F0A">SALON</text><text x="50" y="68" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" font-weight="700" font-size="15" letter-spacing="1" fill="#4A3008">1873</text>' : ''}
  </svg>`;
}

icons();

// ── 1 역할: 후보작 띠 — 현장과 같은 한 줄. 누르면 벽으로 들어가 그 그림이 들린다
if (window.innerHeight >= 780) $('.crit').open = true;
$('#candStrip').innerHTML = WORKS.map((w) => `<button type="button" aria-label="${w.n}번 후보작 · 심사로" data-n="${w.n}"><b>${w.n}</b><span class="cf"><span class="mat"><img src="${w.src}" alt="" draggable="false"></span></span></button>`).join('');
$$('#candStrip button').forEach((b) => b.addEventListener('click', () => { enterWall(); select(byN(+b.dataset.n)); }));

// ── 2 특별 액자 벽
const stage = $('#stage'), row = $('#row'), tagsEl = $('#tags'), medal = $('#medal'), lower = $('#lower'), hint = $('#hint'), spot = $('#spot'), award = $('#award');
medal.innerHTML = medalSVG('m');
$('#cfMedal').innerHTML = medalSVG('c');
$('#cardMedal').innerHTML = medalSVG('k');
let W = 0, H = 0, areaH = 0, fw = 70, lineY = 0, maxFh = 0, BAND = 44;
let mode = 'pick';                     // pick | placed | reveal
let sel = null, chosen = null;         // 들린 그림 · 메달을 올린 그림
const M = { x: 0, y: 0, s: 1, home: { x: 0, y: 0 }, drag: null };

const cands = WORKS.map((w) => {
  const el = document.createElement('div');
  el.className = 'frame';
  el.innerHTML = `<div class="plate">${w.n}</div><div class="mat"><img src="${w.src}" alt="" draggable="false"></div>`;
  row.appendChild(el);
  const tag = document.createElement('div'); tag.className = 'tag'; tagsEl.appendChild(tag);
  const today = document.createElement('div'); today.className = 'today'; today.innerHTML = `<i>${medalSVG('t' + w.n, false)}</i>오늘의 메달`; tagsEl.appendChild(today);
  return { w, el, tag, today, x: 0, y: 0, fh: 0 };
});
const byN = (n) => cands.find((c) => c.w.n === n);
const LIFT = 1.45, LIFT_DY = -10;
const lifted = (c) => mode !== 'reveal' && (c === sel || c === chosen);

// 한 줄: 폭을 5등분, 눈높이 선(lineY)에 가운데를 맞춘다. 결과 패널이 올라오면 남은 높이의 가운데로
function measure() {
  W = stage.clientWidth; H = stage.clientHeight;
  areaH = mode === 'reveal' ? H - $('#reveal').offsetHeight : H;
  const pad = 10, gap = 6;
  fw = Math.floor((W - pad * 2 - gap * 4) / 5);
  cands.forEach((c) => {
    c.el.style.setProperty('--fw', fw + 'px');
    const p = fw * 0.07, inner = fw - p * 2 - 3;
    c.fh = p * 2 + 3 + inner * c.w.h / c.w.w;
  });
  maxFh = Math.max(...cands.map((c) => c.fh));
  BAND = areaH < 420 ? 34 : 44;                                   // 액자 아래 점이 모이는 띠의 높이
  lineY = Math.max(areaH * (mode === 'reveal' ? 0.42 : 0.47), 62 + 34 + maxFh * (mode === 'reveal' ? 1 : LIFT) / 2 + 6);
  cands.forEach((c, i) => { c.x = pad + fw / 2 + i * (fw + gap); c.y = lineY; });
  const lowerY = Math.round(areaH * (mode === 'reveal' ? 0.9 : 0.805));   // 결과에서는 징두리를 내려 점 무리·숫자·메달 표 자리를 준다
  lower.style.transform = `translateY(${lowerY}px)`;
  M.home = { x: W / 2, y: lowerY - 30 };                       // 징두리 선반 위에 놓인 메달
  hint.style.top = Math.min(lineY + maxFh / 2 + 56, lowerY - 80) + 'px';
}
function render() {
  cands.forEach((c) => {
    const l = lifted(c), s = l ? LIFT : 1, dy = l ? LIFT_DY : 0;
    c.el.style.transform = `translate3d(${(c.x - fw / 2).toFixed(1)}px, ${(c.y - c.fh / 2 + dy).toFixed(1)}px, 0) scale(${s})`;
    c.el.classList.toggle('sel', l);
    c.tag.style.transform = `translate(${c.x.toFixed(1)}px, ${(c.y + c.fh / 2 + BAND + 18).toFixed(1)}px) translate(-50%, -50%)`;        // 점 무리 아래 작은 숫자
    c.today.style.transform = `translate(${c.x.toFixed(1)}px, ${(c.y + c.fh / 2 + BAND + 18 + 24).toFixed(1)}px) translate(-50%, -50%)`;
  });
  const lit = sel && mode !== 'reveal';
  if (lit) spot.style.transform = `translate(${sel.x.toFixed(1)}px, ${(sel.y + LIFT_DY).toFixed(1)}px)`;
  spot.classList.toggle('on', !!lit); stage.classList.toggle('lit', !!lit);
  if (!M.drag) {
    if (chosen) {
      if (mode === 'reveal') { M.x = chosen.x + fw / 2 - 4; M.y = chosen.y - chosen.fh / 2 + 4; M.s = 0.5; }   // 결과: 액자 오른쪽 위 모서리에 작게
      else { M.x = chosen.x; M.y = chosen.y + LIFT_DY + chosen.fh * LIFT / 2 - 2; M.s = 0.8; }            // 올린 직후: 들린 액자 아래 테두리에 걸쳐
    } else { M.x = M.home.x; M.y = M.home.y; M.s = 1; }
  }
  medal.style.transform = `translate3d(${M.x.toFixed(1)}px, ${M.y.toFixed(1)}px, 0) scale(${M.s})`;
  medal.classList.toggle('on-frame', !!chosen);
}

// 메달을 들고 있는 손가락 아래의 액자
function hit(px, py) {
  return cands.find((c) => Math.abs(px - c.x) < fw * 0.62 && Math.abs(py - (c.y + (lifted(c) ? LIFT_DY : 0))) < c.fh * (lifted(c) ? LIFT : 1) / 2 + 12) || null;
}

// ── 입력: 그림 탭(들림) · 메달 끌기(액자 위에서 놓으면 올라간다) · 메달 탭(들린 그림이 있으면 그리로)
let active = null;
const pt = (e) => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
stage.addEventListener('pointerdown', (e) => {
  if (mode === 'reveal') return;
  const p = pt(e);
  if (e.target.closest('#medal')) {
    if (mode === 'placed') return;
    e.preventDefault();
    try { stage.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
    M.drag = { id: e.pointerId, ox: p.x - M.x, oy: p.y - M.y, x0: p.x, y0: p.y, moved: false, near: null };
    medal.classList.add('drag');
    hint.classList.add('off');
    return;
  }
  const el = e.target.closest('.frame');
  if (el && mode === 'pick') {
    e.preventDefault();
    try { stage.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
    active = { id: e.pointerId, c: cands.find((q) => q.el === el), x0: p.x, y0: p.y, moved: false };
  }
});
stage.addEventListener('pointermove', (e) => {
  const p = pt(e);
  if (M.drag && e.pointerId === M.drag.id) {
    const d = M.drag;
    M.x = p.x - d.ox; M.y = p.y - d.oy; M.s = 1.1;
    if (Math.hypot(p.x - d.x0, p.y - d.y0) > 8) d.moved = true;
    const near = hit(p.x, p.y);
    if (near !== d.near) { if (d.near) d.near.el.classList.remove('near'); d.near = near; if (near) { near.el.classList.add('near'); haptic(12); } }
    medal.style.transform = `translate3d(${M.x.toFixed(1)}px, ${M.y.toFixed(1)}px, 0) scale(${M.s})`;
  } else if (active && e.pointerId === active.id) {
    if (Math.hypot(p.x - active.x0, p.y - active.y0) > 10) active.moved = true;
  }
});
function endPointer(e) {
  if (M.drag && e.pointerId === M.drag.id) {
    const d = M.drag; M.drag = null;
    medal.classList.remove('drag');
    if (d.near) d.near.el.classList.remove('near');
    if (e.type === 'pointerup' && d.near) { placeOn(d.near); return; }
    if (e.type === 'pointerup' && !d.moved) {                      // 메달만 톡: 들린 그림이 있으면 그리로, 없으면 안내
      if (sel) { placeOn(sel); return; }
      toast('먼저 그림을 눌러 고르십시오');
    }
    render();
    hint.classList.remove('off');
    return;
  }
  if (active && e.pointerId === active.id) {
    const a = active; active = null;
    if (e.type === 'pointerup' && !a.moved) select(a.c);
  }
}
stage.addEventListener('pointerup', endPointer);
stage.addEventListener('pointercancel', endPointer);

function select(c) {
  if (mode !== 'pick') return;
  sel = sel === c ? null : c;
  award.disabled = !sel;
  $('#hintText').textContent = sel ? `${sel.w.n}번 · 메달 수여를 누르거나 메달을 끌어 올리십시오` : '그림을 누르거나, 메달을 끌어 액자에 올리십시오';
  haptic(10);
  render();
}
award.addEventListener('click', () => { if (sel && mode === 'pick') placeOn(sel); });

// ── 메달을 올린다 → 확인
const confirm = sheet($('#confirm'));
async function placeOn(c) {
  mode = 'placed'; chosen = c; sel = c;
  award.disabled = true;
  hint.classList.add('off');
  haptic(24);
  render();
  $('#cfImg').src = c.w.src; $('#cfNo').textContent = `${c.w.n}번`;
  await sleep(reduceMotion ? 150 : 640);
  if (mode === 'placed') confirm.open();
}
function unplace() {
  confirm.close();
  chosen = null; mode = 'pick';
  award.disabled = !sel;
  render();
  hint.classList.remove('off');
}
$('#cfBack').addEventListener('click', unplace);
$('#cfOk').addEventListener('click', () => { confirm.close(); reveal(); });

// ── 3 오늘의 심사위원단: 액자 줄은 그대로. 심사위원(점 하나 = 열 사람)이 벽에 흩어져 있다가 메달을 준 액자 아래로 모인다. 내 점은 주황, 맨 마지막에.
//    그 밑에 작은 숫자, 가장 많은 그림엔 오늘의 메달 표. 패널에는 내 그림의 비율만 크게
let crowd = null;
function crowdTargets() {
  const n = crowd.n, order = cands.slice();                      // 왼쪽 액자부터 — 점이 덜 엇갈린다
  const counts = split(n, order.map((c) => TODAY[c.w.n]));
  const groups = order.map((c, i) => ({ pts: packRect(counts[i], { x: c.x - fw / 2 + 2, y: c.y + c.fh / 2 + 8, w: fw - 4, h: BAND - 6 }, crowd.rnd, 7) }));
  return targetsFor(crowd, groups, order.indexOf(chosen));
}
async function reveal() {
  mode = 'reveal';
  const me = chosen; sel = null;
  const mineTop = me.w.n === TOP;
  $('#wallTitle').textContent = '오늘의 심사위원단';
  $('#revTitle').textContent = mineTop ? `내가 메달을 준 ${me.w.n}번이 오늘의 메달` : `내가 메달을 준 ${me.w.n}번 · 오늘의 메달은 ${TOP}번`;
  $('#revFig').innerHTML = `<div class="crowd-big">${TODAY[me.w.n]}<i>%</i></div><div class="crowd-lab">${me.w.n}번 〈${me.w.title}〉 · 나<small>같은 그림에 메달을 준 심사위원</small></div>`;
  $('#revOthers').innerHTML = cands.filter((c) => c !== me).sort((a, b) => TODAY[b.w.n] - TODAY[a.w.n]).map((c) => `<span>${c.w.n}번 <b>${TODAY[c.w.n]}</b></span>`).join('');
  $('#revStamp').textContent = stampLine(JURY);
  cands.forEach((c) => {
    c.tag.className = 'tag' + (c === me ? ' me' : '');
    c.tag.innerHTML = `${TODAY[c.w.n]}%${c === me ? '<small>나</small>' : ''}`;
  });
  $('#reveal').classList.add('on'); stage.classList.add('is-reveal');
  await sleep(reduceMotion ? 50 : 420);
  measure();
  me.el.classList.add('mine');
  render();
  if (!crowd) crowd = createCrowd($('#crowdCv'), { theme: 'dark', n: dotsFor(JURY), reduceMotion, seed: 2 });
  crowd.resize();
  // 벽(코니스 아래 ~ 액자 줄 위)에 흩어져 있다가 액자 아래로
  crowd.place(scatter(crowd.n, { x: 12, y: 70, w: W - 24, h: Math.max(60, lineY - maxFh / 2 - 90) }, crowd.rnd));
  const showNums = () => { cands.forEach((c) => c.tag.classList.add('show')); setTimeout(() => { byN(TOP).today.classList.add('show'); haptic(16); }, reduceMotion ? 0 : 260); };
  setTimeout(() => crowd.move(crowdTargets(), { duration: 1300, stagger: 420, onDone: showNums }), reduceMotion ? 0 : 300);
  if (reduceMotion) showNums();
}
$('#again').addEventListener('click', () => {
  mode = 'pick';
  if (crowd) { crowd.stop(); crowd.clear(); }
  $('#reveal').classList.remove('on'); stage.classList.remove('is-reveal');
  cands.forEach((c) => { c.tag.classList.remove('show'); c.today.classList.remove('show'); c.el.classList.remove('mine'); });
  $('#wallTitle').textContent = '특별 액자 · 후보작 5점';
  chosen = null; sel = null; award.disabled = true;
  $('#hintText').textContent = '그림을 누르거나, 메달을 끌어 액자에 올리십시오';
  setTimeout(() => { measure(); render(); hint.classList.remove('off'); }, 80);
});

// ── 4 카드
$('#save').addEventListener('click', () => {
  const me = chosen;
  $('#cardImg').src = me.w.src;
  $('#cardPos').innerHTML = me.w.n === TOP ? `오늘 <b>${TODAY[me.w.n]}%</b> · 오늘의 메달` : `오늘 <b>${TODAY[me.w.n]}%</b> · 오늘의 메달은 ${TOP}번`;
  $('#cardNo').textContent = `후보작 ${me.w.n} · 내가 메달을 준 그림`;
  $('#cardTitle').textContent = `〈${me.w.title}〉`;
  $('#cardMeta').textContent = [me.w.artist, me.w.year, me.w.coll].filter(Boolean).join(' · ');
  $('#cardShown').textContent = me.w.shown;
  saveChoice('c0', { n: me.w.n, title: me.w.title, pct: TODAY[me.w.n] });   // 기기 안에만 · 출구 화면(exit.html)이 읽는다
  showScreen('s4');
  toast('수집함에 저장했습니다');
});

// ── 화면 흐름
function enterWall() {
  showScreen('s2');
  mode = 'pick'; chosen = null; sel = null; award.disabled = true;
  cands.forEach((c) => { c.el.classList.remove('mine', 'sel', 'near'); c.tag.classList.remove('show'); c.today.classList.remove('show'); });
  if (crowd) { crowd.stop(); crowd.clear(); }
  $('#reveal').classList.remove('on'); stage.classList.remove('is-reveal');
  $('#wallTitle').textContent = '특별 액자 · 후보작 5점';
  $('#hintText').textContent = '그림을 누르거나, 메달을 끌어 액자에 올리십시오';
  hint.classList.remove('off');
  measure();
  // 처음 들어올 때: 액자는 위에서 내려와 걸리고, 메달은 아래에서 올라온다
  if (!reduceMotion) {
    cands.forEach((c, i) => { c.el.style.transition = 'none'; c.el.style.transform = `translate3d(${(c.x - fw / 2).toFixed(1)}px, ${(c.y - c.fh / 2 - 34 - i * 6).toFixed(1)}px, 0) scale(.92)`; c.el.style.opacity = '0'; });
    medal.style.transition = 'none'; medal.style.transform = `translate3d(${M.home.x}px, ${M.home.y + 60}px, 0) scale(.6)`;
    void stage.offsetWidth;
    cands.forEach((c) => { c.el.style.transition = ''; c.el.style.opacity = ''; });
    medal.style.transition = '';
  }
  render();
}
$('#enter').addEventListener('click', enterWall);
$('#back2').addEventListener('click', () => { confirm.close(); showScreen('s1'); });
$('#back4').addEventListener('click', () => showScreen('s2'));
$('#restart').addEventListener('click', () => showScreen('s1'));
window.addEventListener('resize', () => { if ($('#s2').classList.contains('on')) { measure(); render(); if (mode === 'reveal' && crowd) { crowd.stop(); crowd.resize(); crowd.place(crowdTargets()); } } });

// 검수용
window.__c0 = {
  center(n) { const c = byN(n); const r = stage.getBoundingClientRect(); return { x: r.left + c.x, y: r.top + c.y + (lifted(c) ? LIFT_DY : 0) }; },
  medal() { const r = stage.getBoundingClientRect(); return { x: r.left + M.x, y: r.top + M.y }; },
  get mode() { return mode; }, get sel() { return sel ? sel.w.n : null; }, get chosen() { return chosen ? chosen.w.n : null; },
  enterWall, select: (n) => select(byN(n)), place: (n) => placeOn(byN(n)), reveal, get crowd() { return crowd; },
};
