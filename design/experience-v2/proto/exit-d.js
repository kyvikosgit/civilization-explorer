// 출구 시안 D — 오늘의 관람객 속의 나. 화면 전체가 군중(점 1,284개 = 1,284명), 내 점은 주황
//   질문 넷(C0 · C1 · C2 · C4)을 차례로 누르면 점이 그 질문의 답대로 기둥으로 다시 선다(기둥 높이 = 오늘의 비율).
//   내 기둥 아래 밝은 덩어리 = 지금까지 모든 질문에서 나와 같았던 사람(1,284 → 501 → 311 → 168 → 94).
//   끝에 점이 다시 흩어지고, 네 곳 모두 나와 같았던 94명만 켜진다 → 가져가는 것 쟁반이 올라온다.
//   한 사람의 답은 예시로 만든다(선택지별 비율은 정확히 맞추고, 넷 모두 같은 사람은 정확히 '나와 같은 길' 인원)
import { clearChoices, reduceMotion } from './js/proto-common.js';
import { createCrowd, rng, split, scatter } from './js/crowd.js';
import { STATIONS, ARTS, VISITORS, sameN, anyReal, fmt, stampLine, artThumb, setupShare, fontsReady, POINT } from './exit-common.js';

const $ = (s, r = document) => r.querySelector(s);
const N = VISITORS, ME = N - 1, Q = STATIONS.length;

// ── 한 사람씩의 답(예시) — 결정적
const R = rng(23);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(R() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };
const range = (n) => Array.from({ length: n }, (_, i) => i);
const myOpt = STATIONS.map((s) => s.opts.findIndex((o) => o.k === s.me));
// 지금까지 모두 나와 같은 사람(겹겹이 줄어드는 무리): 비율의 곱대로 1,284 → 501 → 311 → 168 → 94. 앞에서부터 같은 줄의 머리만 잘라 쓴다(나는 맨 앞)
const order = [ME, ...shuffle(range(N - 1))];
const cum = []; STATIONS.reduce((acc, s, qi) => { const v = acc * s.opt.pct / 100; cum.push(qi === Q - 1 ? sameN : Math.round(N * v)); return v; }, 1);
const ans = STATIONS.map(() => new Int8Array(N));
const upto = new Int8Array(N);                             // 앞에서부터 몇 곳 연속으로 나와 같았나
for (let i = 0; i < N; i++) { const p = order[i]; let u = 0; while (u < Q && i < cum[u]) u++; upto[p] = u; }
const SAME = new Set(order.slice(0, sameN));
STATIONS.forEach((s, qi) => {
  const counts = split(N, s.opts.map((o) => o.pct)), mi = myOpt[qi];
  // 내 쪽 = 이번까지 같은 무리(order 의 앞 cum[qi]명) + 지난 곳에서 이미 갈라진 사람 가운데 몇(그래야 무리가 정확히 cum 이 된다)
  const keep = order.slice(0, cum[qi]), outside = shuffle(order.slice(qi ? cum[qi - 1] : N));
  const need = Math.max(0, counts[mi] - keep.length), mine = new Set([...keep, ...outside.slice(0, need)]);
  const rest = shuffle(order.filter((p) => !mine.has(p)));
  mine.forEach((p) => { ans[qi][p] = mi; });
  let k = 0; counts.forEach((c, oi) => { if (oi === mi) return; for (let j = 0; j < c && k < rest.length; j++) ans[qi][rest[k++]] = oi; });
  while (k < rest.length) ans[qi][rest[k++]] = counts.findIndex((_, oi) => oi !== mi);
});
const chain = [N, ...STATIONS.map((_, qi) => { let c = 0; for (let p = 0; p < N; p++) if (upto[p] >= qi + 1) c++; return c; })];

// ── 군중
const cv = $('#cv'), hd = $('#hd'), bar = $('#bar'), labs = $('#labs'), tray = $('#tray');
const crowd = createCrowd(cv, { theme: 'dark', n: N, reduceMotion, seed: 31, dotR: 1.55 });
let W = 0, H = 0, step = 0;
const fieldRand = () => rng(5);
function field(rect) { return scatter(N, rect, fieldRand()); }
function fullRect() { return { x: 8, y: 8, w: W - 16, h: H - 16 }; }
function stageBox() {
  const top = hd.getBoundingClientRect().bottom - 4, barTop = bar.getBoundingClientRect().top + 14;
  return { top, base: barTop - 54 };
}
// 기둥: 아래(바탕선)부터 위로 쌓는다. 내 기둥은 [지금까지 같았던 사람 → 이번만 같은 사람 → 나(맨 위)]
function columns(qi) {
  const s = STATIONS[qi], k = s.opts.length, { top, base } = stageBox();
  const padX = 22, gap = k > 2 ? 10 : 22, colW = (W - padX * 2 - gap * (k - 1)) / k;
  const groups = s.opts.map(() => []);
  for (let p = 0; p < N; p++) groups[ans[qi][p]].push(p);
  const maxC = Math.max(...groups.map((g) => g.length));
  let sp = 11, per = 1;
  for (; sp >= 3.4; sp -= 0.2) { per = Math.max(1, Math.floor(colW / sp)); if (Math.ceil(maxC / per) * sp <= base - top) break; }
  const targets = new Array(N), alpha = new Array(N), cols = [];
  const ys = (p) => crowd.dots[p].y;
  groups.forEach((g, oi) => {
    const x0 = padX + oi * (colW + gap), mine = oi === myOpt[qi];
    let order;
    if (mine) {
      const core = g.filter((p) => p !== ME && upto[p] >= qi + 1).sort((a, b) => ys(b) - ys(a));
      const loose = g.filter((p) => p !== ME && upto[p] < qi + 1).sort((a, b) => ys(b) - ys(a));
      order = [...core, ...loose, ME];
    } else order = g.slice().sort((a, b) => ys(b) - ys(a));
    const cnt = order.length, rows = Math.ceil(cnt / per), used = per * sp, ox = x0 + (colW - used) / 2;
    order.forEach((p, j) => {
      const row = Math.floor(j / per), inRow = row === rows - 1 ? cnt - row * per : per, c = j % per;
      targets[p] = { x: ox + (per - inRow) * sp / 2 + (c + 0.5) * sp, y: base - (row + 0.5) * sp };
      alpha[p] = mine ? (upto[p] >= qi + 1 ? 0.95 : 0.5) : 0.24;
    });
    cols.push({ cx: x0 + colW / 2, x0, w: colW, top: base - rows * sp, me: mine, o: s.opts[oi] });
  });
  return { targets, alpha, cols, base };
}
function showLabels(L) {
  labs.innerHTML = `<div class="xd-base" style="left:16px;right:16px;top:${L.base + 3}px"></div>` + L.cols.map((c) =>
    `<div class="xd-lab${c.me ? ' me' : ''}" style="left:${c.cx}px;top:${L.base + 10}px"><b>${c.o.pct}<i>%</i></b><span>${c.o.lab}${c.me ? ' · 나' : ''}</span></div>`).join('');
  requestAnimationFrame(() => labs.querySelectorAll('.xd-lab, .xd-base').forEach((e) => e.classList.add('show')));
}
function hideLabels() { labs.querySelectorAll('.xd-lab, .xd-base').forEach((e) => e.classList.remove('show')); }

// ── 머리 · 아래 줄
const pips = $('#pips'); pips.innerHTML = STATIONS.map(() => '<i></i>').join('');
function header(room, q, sub, cls = '') {
  hd.className = `xd-hd ${cls}`; void hd.offsetWidth; hd.classList.add('swap');
  $('#room').textContent = room; $('#q').innerHTML = q; $('#sub').innerHTML = sub;
}
function countLine(qi) {
  if (qi < 0) { $('#count').innerHTML = ''; return; }
  const parts = chain.slice(0, qi + 2).map((n, i) => (i === qi + 1 ? `<b>${fmt(n)}명</b>` : fmt(n)));
  $('#count').innerHTML = `<span class="cl">지금까지 나와 같은 쪽</span> ${parts.join('<span class="arrow">·</span>')}`;
}

let timers = [];
const later = (fn, ms) => { timers.push(setTimeout(fn, reduceMotion ? 0 : ms)); };
function clearTimers() { timers.forEach(clearTimeout); timers = []; }

function render(st, animate = true) {
  clearTimers();
  [...pips.children].forEach((e, i) => { e.classList.toggle('done', i < st - 1 || st > Q); e.classList.toggle('cur', i === st - 1); });
  if (st === 0) {
    header('오늘의 관람객', `오늘 모네의 방을 나온<br>${fmt(N)}명`, '점 하나가 한 사람, 주황 점이 나');
    crowd.place(field(fullRect()), 0.55); countLine(-1); hideLabels();
    $('#next').textContent = '네 가지 질문으로 보기';
    return;
  }
  if (st <= Q) {
    const qi = st - 1, s = STATIONS[qi];
    header(`${s.room}${anyReal && !s.real ? ' · 예시' : ''}`, s.ask, `나는 <b style="color:#fff">${s.choice}</b>`);
    const L = columns(qi);
    hideLabels();
    if (animate) crowd.move(L.targets, { duration: 1300, stagger: 520, mineDelay: 620, bend: 0.12, alpha: (p) => L.alpha[p] });
    else crowd.place(L.targets, (p) => L.alpha[p]);
    later(() => showLabels(L), animate ? 1100 : 0);
    later(() => countLine(qi), animate ? 1300 : 0);
    $('#next').textContent = qi < Q - 1 ? '다음 질문' : '모아 보기';
    return;
  }
  // 끝: 흩어졌다가 94명만 켜진다 → 쟁반
  header('오늘의 관람객', `오늘 모네의 방을 나온<br>${fmt(N)}명`, `켜진 점은 네 곳 모두 나와 같은 쪽 · ${fmt(sameN)}명`, 'end');
  hideLabels(); bar.classList.add('away');
  tray.hidden = false;
  const trayH = tray.getBoundingClientRect().height || 260, top = hd.getBoundingClientRect().bottom;
  const pts = field({ x: 14, y: top, w: W - 28, h: Math.max(120, H - trayH - top - 10) });
  if (animate) {
    crowd.move(pts, { duration: 1200, stagger: 420, mineDelay: 500, bend: 0.18, alpha: 0.4 });
    later(() => crowd.move(pts, { duration: 900, stagger: 700, mineDelay: 0, bend: 0, alpha: (p) => (SAME.has(p) ? 1 : 0.07) }), 1800);
    later(() => tray.classList.add('open'), 3000);
  } else { crowd.place(pts, (p) => (SAME.has(p) ? 1 : 0.07)); tray.classList.add('open'); }
}
function next() { if (step > Q) return; step += 1; render(step); }
$('#next').addEventListener('click', next);
cv.addEventListener('click', next);
addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { if (e.target.closest && e.target.closest('button')) return; e.preventDefault(); next(); } });

function resize() { crowd.resize(); const r = cv.getBoundingClientRect(); W = r.width; H = r.height; }
resize();
render(0, false);
addEventListener('resize', () => { const was = step; resize(); crowd.stop(); render(was, false); });

// 쟁반
$('#arts').innerHTML = ARTS.map((a, i) => `<div class="it" style="--i:${i}">${artThumb(a)}<span><b>${a.lb}</b>${a.t}</span></div>`).join('');

// ── 저장 · 공유 — 1080×1920(위·아래 250px 비움): 오늘의 관람객 → 군중 1,284(네 곳 모두 같은 94명만 켜짐 · 나 주황) → 네 곳의 내 선택
async function renderShare() {
  const Wd = 1080, Hd = 1920, c = document.createElement('canvas'); c.width = Wd; c.height = Hd;
  const g = c.getContext('2d'); await fontsReady();
  const D = 'Paperlogy, Freesentation, sans-serif', B = 'Freesentation, sans-serif', L = 80;
  g.fillStyle = '#121110'; g.fillRect(0, 0, Wd, Hd); g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(255,255,255,.5)'; g.font = `600 24px ${D}`; g.fillText('MONET 100 · The Next Impression', L, 270);
  g.fillStyle = '#fff'; g.font = `800 60px ${D}`; g.fillText(`오늘 모네의 방을 나온 ${fmt(N)}명`, L, 350);
  g.fillStyle = 'rgba(255,255,255,.6)'; g.font = `500 28px ${B}`; g.fillText(`점 하나가 한 사람 · 켜진 점은 네 곳 모두 나와 같은 쪽 ${fmt(sameN)}명`, L, 404);
  // 군중
  const rect = { x: L, y: 450, w: Wd - L * 2, h: 740 }, pts = scatter(N, rect, rng(5)), rr = rng(9);
  pts.forEach((p, i) => { if (i === ME || SAME.has(i)) return; g.fillStyle = 'rgba(255,247,234,.12)'; g.beginPath(); g.arc(p.x, p.y, 3.6 * (0.8 + rr() * 0.4), 0, 6.2832); g.fill(); });
  pts.forEach((p, i) => { if (i === ME || !SAME.has(i)) return; g.fillStyle = 'rgba(255,247,234,.96)'; g.beginPath(); g.arc(p.x, p.y, 5, 0, 6.2832); g.fill(); });
  const m = pts[ME]; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(m.x, m.y, 13, 0, 6.2832); g.stroke(); g.fillStyle = POINT; g.beginPath(); g.arc(m.x, m.y, 8.5, 0, 6.2832); g.fill();
  // 네 곳
  let y = 1300; g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(L, y - 54, Wd - L * 2, 2);
  STATIONS.forEach((s, i) => {
    const x = L + (i % 2) * 470, yy = y + Math.floor(i / 2) * 126;
    g.fillStyle = 'rgba(255,255,255,.4)'; g.font = `800 24px ${D}`; g.fillText(`0${s.no}`, x, yy);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.font = `600 24px ${D}`; g.fillText(s.q, x + 44, yy);
    g.fillStyle = '#fff'; g.font = `800 ${s.choice.length > 9 ? 32 : 38}px ${D}`; g.fillText(s.choice, x, yy + 52);
    const cw = g.measureText(s.choice).width; g.fillStyle = POINT; g.font = `800 30px ${D}`; g.fillText(`${s.opt.pct}%`, x + cw + 14, yy + 52);
  });
  g.fillStyle = 'rgba(255,255,255,.4)'; g.font = `500 24px ${B}`; g.fillText(`${stampLine(N)} · 문명탐험가 앱 · 신세계 더 헤리티지`, L, 1610);
  return c;
}
setupShare($('#share'), renderShare, 'monet100_오늘의관람객.png');
$('#restart').addEventListener('click', () => { clearChoices(); location.href = 'index.html'; });

window.__exitD = { next, get step() { return step; }, chain, render: renderShare, same: SAME.size };
