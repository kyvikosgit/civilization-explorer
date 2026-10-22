// 출구 시안 E — 큰 선택과 작은 선택(라이프 이즈 스트레인지의 에피소드 끝 통계처럼)
//   큰 선택(가치 판단) 둘 — C1 "어느 전시를 보러 가시겠습니까?"(살롱 / 화가들의 전시) · C4 "사람을 남긴다면, 그림입니까 사진입니까?"(그림으로 / 사진으로) — 를 한 화면씩.
//     질문 → 그 방의 물건(포스터 둘 · 고른 쪽 얼굴 다섯) → 내 선택 → 같은 칸(선택지)에 맞춘 두 줄: 1874년(출처 있는 사실) · 오늘의 관람객(점, 내 점만 주황). 옳고 그름은 말하지 않는다.
//   작은 선택(C0 메달 · C2 행선지)은 흰 쟁반 "그 밖에 고른 것"으로 작게. → 가져가는 것 다섯 → 저장·공유(1080×1920, 같은 위계, 위·아래 250px 비움).
//   "나와 같은 길 %" · 조합 통계는 쓰지 않는다. 선택 · 예시 비율 · localStorage 읽기는 exit-common.js, 점은 js/crowd.js.
//   1874년 살롱 관람객 수는 출처가 없어 "수십만"으로만 적는다(화가들의 전시 약 3,500명은 Rewald 1973 · 프랑스 문화부).
import { clearChoices, reduceMotion } from './js/proto-common.js';
import { createCrowd, dotsFor, split, packRect, scatter, targetsFor, rng } from './js/crowd.js';
import { STATIONS, C1, C4, C4_FACES, VISITORS, POINT, anyReal, fmt, stampLine, posterHTML, artThumb, setupShare, fontsReady, loadImg, cover, drawPoster, drawArt } from './exit-common.js';

const $ = (s, r = document) => r.querySelector(s);
const S = Object.fromEntries(STATIONS.map((s) => [s.id, s]));
const ex = (s) => (anyReal && !s.real ? ' · 예시' : '');
const exTag = (s) => (anyReal && !s.real ? '<span class="ex">예시</span>' : '');
const N = dotsFor(VISITORS);            // 점 하나 = 열 사람

// ── 큰 선택 두 장의 내용
const MAJOR = [
  { el: '#ch1', st: S.c1, cmp: '#cmp1', me: '#me1', sub: '#sub1', room: '#room1', q: '어느 전시를 보러 가시겠습니까?',
    cols: Object.keys(C1).map((k) => ({ k, lab: C1[k].short })),
    then: { label: '1874년 봄의 관람객', cells: { jury: { v: '수십만<i>명</i>', d: '샹젤리제 궁 · 5월 1일부터' }, viewer: { v: '약 3,500<i>명</i>', d: '한 달 · 입장료 1프랑' } },
      src: '약 3,500명 · Rewald(1973), 프랑스 문화부' } },
  { el: '#ch2', st: S.c4, cmp: '#cmp2', me: '#me2', sub: '#sub2', room: '#room2', q: '사람을 남긴다면, 그림입니까 사진입니까?',
    cols: Object.keys(C4).map((k) => ({ k, lab: C4[k].full })),
    then: { label: '1874년 4월', lines: ['나다르는 자기 사진관을 화가들에게 전시장으로 내주었다.', '보들레르는 1859년 살롱평에서 사진 산업을 예술의 “가장 치명적인 적”이라 썼다.'],
      src: 'Wikipedia · Nadar · BnF · Wikisource · Baudelaire, Salon de 1859' } },
];

// 그 방의 물건 — C1: 두 포스터(재현), 내 쪽만 또렷이 · C4: 고른 쪽 얼굴 다섯
$('#obj1').innerHTML = ['jury', 'viewer'].map((k) => posterHTML(k === 'viewer', S.c1.me === k ? 'me' : '')).join('');
const k4 = S.c4.me;
$('#obj2').classList.add(k4);
$('#obj2').innerHTML = C4_FACES.filter((id) => !['renoir', 'liszt', 'caillebotte', 'gautier'].includes(id)).slice(0, 5).map((id) => `<span class="fc"><img src="img/c4p/${id}-${k4}.jpg" alt="" decoding="async"></span>`).join('');

MAJOR.forEach((m) => {
  const s = m.st;
  $(m.room).innerHTML = s.room + exTag(s);
  $(m.me).textContent = s.choice;
  $(m.sub).textContent = s.sub;
  const cols = `<div class="xe-cols">${m.cols.map((c) => `<span class="${c.k === s.me ? 'me' : ''}">${c.lab}</span>`).join('')}</div>`;
  const then = m.then.cells
    ? `<div class="xe-cells">${m.cols.map((c) => `<div class="xe-cell${c.k === s.me ? ' me' : ''}"><div class="v">${m.then.cells[c.k].v}</div><div class="d">${m.then.cells[c.k].d}</div></div>`).join('')}</div>`
    : m.then.lines.map((l) => `<p class="xe-then-line">${l}</p>`).join('');
  const now = `<div class="xe-now"><canvas aria-hidden="true"></canvas><div class="xe-cells">${s.opts.map((o) => `<div class="xe-cell"><div class="xe-pct${o.k === s.me ? ' me' : ''}">${o.pct}<i>%</i>${o.k === s.me ? '<span>나</span>' : ''}</div></div>`).join('')}</div></div>`;
  $(m.cmp).innerHTML = `<div class="xe-then rv">${cols}<div class="xe-row"><div class="xe-rl">${m.then.label}</div>${then}<div class="xe-src">${m.then.src}</div></div></div>`
    + `<div class="xe-row now rv"><div class="xe-rl"><b>오늘의 관람객 ${fmt(VISITORS)}명</b><small>점 하나 = 열 사람</small></div>${now}</div>`;
  m.cv = $(`${m.el} .xe-now canvas`);
  m.nowRow = $(`${m.el} .xe-row.now`);
});

// ── 오늘 줄의 점: 처음엔 줄 전체에 흩어져 있다가, 장이 보이면 내 칸 · 다른 칸으로 모인다(덩어리 넓이 = 비율). 칸 왼쪽에 붙여 쌓는다
const SP = 9, ROWH = 56;
function blocks(s, W, sp = SP, h = ROWH, gap = 12, y = 2) {
  const colW = (W - gap) / 2, counts = split(N, s.opts.map((o) => o.pct));
  return s.opts.map((o, i) => {
    const w = Math.min(colW - 4, (counts[i] * sp * sp * 0.866) / h * 1.12 + sp);
    return { o, me: o.k === s.me, n: counts[i], rect: { x: i * (colW + gap) + 3, y, w, h } };
  });
}
MAJOR.forEach((m, mi) => {
  m.crowd = createCrowd(m.cv, { theme: 'dark', n: N, reduceMotion, seed: 41 + mi, dotR: 2.15 });
  m.crowd.resize();
  const { w } = m.crowd.size;
  m.crowd.place(scatter(N, { x: 2, y: 2, w: w - 4, h: ROWH }, rng(7 + mi)), 0.32);
});
function gather(m) {
  if (m.gathered) return; m.gathered = true;
  const { w } = m.crowd.size, bl = blocks(m.st, w), myG = bl.findIndex((b) => b.me);
  const groups = bl.map((b) => ({ pts: packRect(b.n, b.rect, m.crowd.rnd, SP) }));
  const t = targetsFor(m.crowd, groups, myG);
  const mineIdx = new Set(); t.forEach((p, i) => { if (p && p.x >= bl[myG].rect.x - 2 && p.x <= bl[myG].rect.x + bl[myG].rect.w + 2) mineIdx.add(i); });
  const alpha = (i) => (mineIdx.has(i) ? 0.95 : 0.42);
  const fin = () => $(m.el).classList.add('done');
  if (reduceMotion) { m.crowd.place(t, alpha); fin(); return; }
  m.crowd.move(t, { duration: 1500, stagger: 520, mineDelay: 720, bend: 0.12, alpha, onDone: fin });   // 약 2초에 걸쳐 가라앉는다
}

// ── 차례로 드러나기 — 평범한 스크롤. 화면에 들어온 .rv 를 문서 순서대로 한 걸음씩(STEP 간격) 드러낸다. 스크롤을 대신 움직이지 않는다
const deck = $('#deck');
const STEP = 320, revealQ = []; let lastAt = -Infinity, qT = 0;
function reveal(el) {
  el.classList.add('in'); lastAt = performance.now();
  const sec = el.closest('.xe-ch'); if (sec && el.classList.contains('xe-hd')) sec.classList.add('on');   // 바탕은 제목과 함께
  const m = MAJOR.find((x) => x.nowRow === el); if (m) { m.shownAt = lastAt; tryGather(m); }
}
function pump() {
  if (qT || !revealQ.length) return;
  qT = setTimeout(() => { qT = 0; const el = revealQ.shift(); if (el) reveal(el); pump(); }, Math.max(0, lastAt + STEP - performance.now()));
}
const rvIO = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting || e.target.dataset.q) return;
  e.target.dataset.q = '1'; rvIO.unobserve(e.target);
  if (reduceMotion) { reveal(e.target); return; }
  revealQ.push(e.target); revealQ.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)); pump();
}), { root: deck, threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
// 점은 "오늘의 관람객" 줄이 60% 이상 보이고, 그 줄이 다 드러난 뒤에야 모이기 시작한다
const nowIO = new IntersectionObserver((es) => es.forEach((e) => {
  const m = MAJOR.find((x) => x.nowRow === e.target); if (!m || e.intersectionRatio < 0.6) return;
  m.seen = true; nowIO.unobserve(e.target); tryGather(m);
}), { root: deck, threshold: [0.6, 0.8, 1] });
function tryGather(m) {
  if (!m.seen || m.shownAt == null || m.gT) return;
  m.gT = setTimeout(() => gather(m), reduceMotion ? 0 : Math.max(0, m.shownAt + 700 - performance.now()));
}
MAJOR.forEach((m) => nowIO.observe(m.nowRow));

// ── 작은 선택 — 흰 쟁반의 작은 카드 둘
const c0 = S.c0, c2 = S.c2;
$('#minorCards').innerHTML = `
  <article class="xe-mc rv"><div class="th medal"><img src="${c0.img}" alt=""><i class="x-medal"></i></div>
    <div class="tx"><small>메달을 준 그림${ex(c0)}</small><b>${c0.choice}</b><span>오늘 <em>${c0.opt.pct}%</em>가 같은 그림</span></div></article>
  <article class="xe-mc rv"><div class="th trip"><img class="pc" src="${c2.img}" alt=""><img class="tk" src="${c2.ticket}" alt=""></div>
    <div class="tx"><small>행선지${ex(c2)}</small><b>${c2.choice} · ${c2.sub.split(' · ')[0]}</b><span>오늘 <em>${c2.opt.pct}%</em>가 ${c2.choicePlain}</span></div></article>`;

// ── 가져가는 것 다섯: 기차표 · 엽서 · 메달 카드 · 전시 포스터 · 사진관 카드(고른 쪽 얼굴 콜라주, 내 초상이 있으면 그것)
const KEEP = [
  { lb: '기차표', html: `<span class="x-th x-tk"><img src="${c2.ticket}" alt=""></span>` },
  { lb: '엽서', html: `<span class="x-th x-pc"><img src="${c2.img}" alt=""><i class="st"></i></span>` },
  { lb: '메달 카드', html: artThumb(c0.art) },
  { lb: '전시 포스터', html: posterHTML(S.c1.expo, 'x-th') },
  { lb: S.c4.art.lb, html: artThumb(S.c4.art) },
];
$('#keep').innerHTML = KEEP.map((k) => `<div class="xe-k rv">${k.html}<span>${k.lb}</span></div>`).join('');
document.querySelectorAll('.rv').forEach((el) => rvIO.observe(el));
$('#foot').textContent = `${stampLine(VISITORS)}${anyReal ? ' · 들르지 않은 곳은 예시' : ''}`;

// ── 저장 · 공유 — 1080×1920, 같은 위계: 큰 선택 둘(위, 크게) → 그 밖에 고른 것(아래, 흰 쟁반, 작게)
const D = 'Paperlogy, Freesentation, sans-serif', B = 'Freesentation, sans-serif';
function wrapKo(g, text, maxW) {                                  // 한글은 어절 단위로
  const words = text.split(' '), out = []; let cur = '';
  words.forEach((w) => { const t = cur ? `${cur} ${w}` : w; if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; });
  if (cur) out.push(cur); return out;
}
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
async function drawMajor(g, m, i, x, y, W) {
  const s = m.st;
  g.textAlign = 'left';
  g.fillStyle = 'rgba(255,255,255,.5)'; g.font = `600 24px ${D}`; g.fillText(s.room + ex(s), x, y + 24);
  g.fillStyle = '#fff'; g.font = `800 38px ${D}`; g.fillText(m.q, x, y + 80);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.font = `600 24px ${D}`; g.fillText('나는', x, y + 138);
  g.fillStyle = '#fff'; g.font = `800 74px ${D}`; g.fillText(s.choice, x - 3, y + 214);
  let cy = y + 248;
  g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x, cy, W, 2);
  const gap = 24, colW = (W - gap) / 2;
  cy += 40; g.font = `600 26px ${D}`;
  m.cols.forEach((c, j) => { const cx = x + j * (colW + gap), me = c.k === s.me; if (me) { g.fillStyle = POINT; g.beginPath(); g.arc(cx + 7, cy - 9, 7, 0, 6.2832); g.fill(); } g.fillStyle = me ? '#fff' : 'rgba(255,255,255,.45)'; g.fillText(c.lab, cx + (me ? 24 : 0), cy); });
  cy += 38; g.fillStyle = 'rgba(255,255,255,.5)'; g.font = `600 22px ${D}`; g.fillText(m.then.label, x, cy);
  if (m.then.cells) {
    cy += 50;
    m.cols.forEach((c, j) => { const cx = x + j * (colW + gap), me = c.k === s.me, cell = m.then.cells[c.k];
      g.fillStyle = me ? '#fff' : 'rgba(255,255,255,.5)'; g.font = `800 46px ${D}`; g.fillText(cell.v.replace(/<[^>]+>/g, ' ').replace(/ +명/, '명').replace('수십만 명', '수십만'), cx, cy);
      g.fillStyle = me ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.45)'; g.font = `500 22px ${B}`; g.fillText(cell.d, cx, cy + 34); });
    cy += 34;
  } else {
    g.font = `500 26px ${B}`; g.fillStyle = 'rgba(255,255,255,.86)';
    wrapKo(g, m.then.lines[0], W).forEach((ln) => { cy += 40; g.fillText(ln, x, cy); });
  }
  // 오늘
  cy += 48; g.fillStyle = '#fff'; g.font = `800 24px ${D}`; g.fillText(`오늘의 관람객 ${fmt(VISITORS)}명`, x, cy);
  g.fillStyle = 'rgba(255,255,255,.4)'; g.font = `500 20px ${B}`; g.textAlign = 'right'; g.fillText('점 하나 = 열 사람', x + W, cy); g.textAlign = 'left';
  const bh = 62, bl = blocks(s, W, 13, bh, gap, 0), rnd = rng(19 + i);
  bl.forEach((b) => {
    const pts = packRect(b.n, { ...b.rect, w: Math.min(b.rect.w, colW - 150) }, rnd, 13);
    pts.forEach((p, q) => { if (b.me && q === 0) return; g.fillStyle = `rgba(255,247,234,${b.me ? 0.95 : 0.4})`; g.beginPath(); g.arc(x + p.x, cy + 22 + p.y, 3.4 * (0.85 + rnd() * 0.3), 0, 6.2832); g.fill(); });
    if (b.me) { const p = pts[0]; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x + p.x, cy + 22 + p.y, 10, 0, 6.2832); g.stroke(); g.fillStyle = POINT; g.beginPath(); g.arc(x + p.x, cy + 22 + p.y, 6.5, 0, 6.2832); g.fill(); }
    const tx = x + b.rect.x + Math.min(b.rect.w, colW - 150) + 16, ty = cy + 22 + bh / 2 + (b.me ? 18 : 10);
    g.fillStyle = b.me ? POINT : 'rgba(255,255,255,.5)'; g.font = `${b.me ? 800 : 600} ${b.me ? 52 : 30}px ${D}`; g.fillText(`${b.o.pct}%`, tx, ty);
  });
  return cy + 22 + bh;
}
async function renderShare() {
  const Wd = 1080, Hd = 1920, c = document.createElement('canvas'); c.width = Wd; c.height = Hd;
  const g = c.getContext('2d'); await fontsReady();
  g.fillStyle = '#121110'; g.fillRect(0, 0, Wd, Hd); g.textBaseline = 'alphabetic';
  const L = 80, W = Wd - L * 2, TOP = 250;                        // 위·아래 250px 은 스토리 화면이 덮는 자리 — 비워 둔다
  g.fillStyle = 'rgba(255,255,255,.5)'; g.font = `600 24px ${D}`; g.fillText('MONET 100 · The Next Impression', L, TOP + 10);
  let y = await drawMajor(g, MAJOR[0], 0, L, TOP + 44, W);
  y += 26; g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(L, y, W, 2);
  y = await drawMajor(g, MAJOR[1], 1, L, y + 30, W);
  // 그 밖에 고른 것 — 흰 쟁반, 작게
  const ty = y + 26, th = 214, tx = 56, tw = Wd - 112;
  g.fillStyle = '#fff'; rrect(g, tx, ty, tw, th, 22); g.fill();
  g.fillStyle = '#111'; g.font = `800 28px ${D}`; g.fillText('그 밖에 고른 것', tx + 32, ty + 52);
  const cards = [
    { s: c0, lab: '메달을 준 그림', t: c0.choice, line: ['오늘 ', `${c0.opt.pct}%`, '가 같은 그림'] },
    { s: c2, lab: '행선지', t: `${c2.choice} · ${c2.sub.split(' · ')[0]}`, line: ['오늘 ', `${c2.opt.pct}%`, `가 ${c2.choicePlain}`] },
  ];
  const cw = (tw - 64 - 20) / 2;
  for (const [j, cd] of cards.entries()) {
    const cx = tx + 32 + j * (cw + 20), cy = ty + 74, S0 = 120;
    g.fillStyle = '#F5F5F3'; rrect(g, cx, cy, cw, 132, 12); g.fill();
    if (j === 0) { const img = await loadImg(cd.s.img); g.save(); rrect(g, cx + 12, cy + 12, 96, 108, 6); g.clip(); cover(g, img, cx + 12, cy + 12, 96, 108, '50% 28%'); g.restore(); g.fillStyle = '#E7C46C'; g.beginPath(); g.arc(cx + 92, cy + 104, 11, 0, 6.2832); g.fill(); g.strokeStyle = '#3B2A12'; g.lineWidth = 2; g.stroke(); }
    else await drawArt(g, cd.s.art, cx + 12, cy + 14, 96);
    const lx = cx + 126, mw = cw - 140;
    g.fillStyle = '#707070'; g.font = `600 19px ${D}`; g.fillText(cd.lab + ex(cd.s), lx, cy + 36);
    g.fillStyle = '#111'; g.font = `800 ${g.measureText(cd.t).width > mw * 1.1 ? 22 : 25}px ${D}`;
    wrapKo(g, cd.t, mw).slice(0, 2).forEach((ln, k) => g.fillText(ln, lx, cy + 72 + k * 30));
    let ox = lx; const by = cy + 116;
    cd.line.forEach((part, k) => { g.fillStyle = k === 1 ? '#B4501F' : '#4A4A47'; g.font = `${k === 1 ? 700 : 500} 20px ${B}`; g.fillText(part, ox, by); ox += g.measureText(part).width; });
  }
  g.fillStyle = 'rgba(255,255,255,.4)'; g.font = `500 21px ${B}`; g.fillText(`${stampLine(VISITORS)} · 문명탐험가 앱 · 신세계 더 헤리티지`, L, ty + th + 46);
  if (ty + th + 46 > Hd - 250) console.warn('[exit-e share] 아래 안전 여백 침범', ty + th + 46);
  return c;
}
setupShare($('#share'), renderShare, 'monet100_나의선택.png');
$('#restart').addEventListener('click', () => { clearChoices(); location.href = 'index.html'; });

window.__exitE = { MAJOR, render: renderShare, get done() { return MAJOR.map((m) => $(m.el).classList.contains('done')); } };
