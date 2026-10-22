// 출구 시안 E — 큰 선택과 작은 선택(라이프 이즈 스트레인지의 에피소드 끝 통계처럼)
//   큰 선택(가치 판단) 둘 — C1 "그림이 걸릴 자격은 누가 정하는가" · C4 "사람을 남기는 데, 그림인가 사진인가" — 를 한 화면씩 크게.
//     내 선택(크게) → 같은 칸(선택지)에 맞춘 두 줄: "그때"(출처 있는 사실) · "오늘의 관람객"(점, 내 점만 주황). 옳고 그름은 말하지 않는다.
//   작은 선택(C0 메달 · C2 행선지)은 큰 선택 뒤에 흰 쟁반 "그 밖에 고른 것"으로 작게, 두 장 한 줄. → 가져가는 것 다섯 → 저장·공유(1080×1920, 같은 위계).
//   "나와 같은 길 %" · 조합 통계는 쓰지 않는다. 선택 · 예시 비율 · localStorage 읽기는 exit-common.js(시안 A exit.js 와 같은 값), 점은 js/crowd.js.
import { clearChoices, reduceMotion } from './js/proto-common.js';
import { createCrowd, dotsFor, split, packRect, scatter, targetsFor, rng } from './js/crowd.js';
import { STATIONS, C1, C4, VISITORS, POINT, anyReal, fmt, stampLine, posterHTML, artThumb, setupShare, fontsReady, loadImg, cover, drawPoster, drawArt } from './exit-common.js';

const $ = (s, r = document) => r.querySelector(s);
const S = Object.fromEntries(STATIONS.map((s) => [s.id, s]));
const ex = (s) => (anyReal && !s.real ? ' · 예시' : '');
const exTag = (s) => (anyReal && !s.real ? '<span class="ex">예시</span>' : '');
const N = dotsFor(VISITORS);            // 점 하나 = 열 사람

// ── 큰 선택 두 장의 내용
const MAJOR = [
  { el: '#ch1', st: S.c1, bg: '#bg1', cmp: '#cmp1', me: '#me1', sub: '#sub1', room: '#room1',
    cols: Object.keys(C1).map((k) => ({ k, lab: C1[k].short })),
    then: { label: '1874년의 파리', cells: { jury: { v: '수십만', d: '살롱 · 샹젤리제 궁' }, viewer: { v: '약 3,500<i>명</i>', d: '한 달 · 입장료 1프랑' } },
      src: '화가들의 전시 인원 — 프랑스 문화부 · Rewald(1973) 인용' },
    moved: '150년 사이 감각은 이렇게 움직였다' },
  { el: '#ch2', st: S.c4, bg: '#bg2', cmp: '#cmp2', me: '#me2', sub: '#sub2', room: '#room2',
    cols: Object.keys(C4).map((k) => ({ k, lab: C4[k].label })),
    then: { label: '1870년대의 파리', lines: ['1874년 4월, 나다르의 옛 사진관이 화가들의 첫 전시장이 되었다.', '사진이 예술인가는 그 무렵 논쟁거리였다. 보들레르는 1859년 살롱평에서 사진 산업을 예술의 “가장 치명적인 적”이라 썼다.'],
      src: 'BnF · Les Nadar · Wikisource · Baudelaire, Salon de 1859' } },
];

// 바탕 — C1: 두 포스터(재현) · C4: 그림과 사진 얼굴(img/c4f)
$('#bg1').innerHTML = ['jury', 'viewer'].map((k, i) => `<div class="pp ${i ? 'r' : 'l'}${S.c1.me === k ? ' me' : ''}">${posterHTML(k === 'viewer')}</div>`).join('');
const FACES = ['monet', 'manet', 'morisot', 'renoir', 'degas', 'zola', 'pissarro', 'hugo', 'courbet'];
$('#bg2').innerHTML = FACES.map((p, i) => { const kind = i % 2 ? 'photo' : 'paint'; return `<div class="f ${kind}${S.c4.me === kind ? ' me' : ''}" style="--i:${i}"><img src="img/c4f/${p}-${kind}.jpg" alt="" decoding="async"></div>`; }).join('');

MAJOR.forEach((m) => {
  const s = m.st, big = s.choicePlain.length <= 3;
  $(m.room).textContent = s.room + ex(s);
  $(m.me).className = `xe-me-v${big ? ' huge' : ''}`;
  $(m.me).textContent = big ? s.choicePlain : s.choice;
  $(m.sub).innerHTML = s.sub + exTag(s);
  const cols = `<div class="xe-cols">${m.cols.map((c) => `<span class="${c.k === s.me ? 'me' : ''}">${c.lab}</span>`).join('')}</div>`;
  const then = m.then.cells
    ? `<div class="xe-cells">${m.cols.map((c) => `<div class="xe-cell${c.k === s.me ? ' me' : ''}"><div class="v">${m.then.cells[c.k].v}</div><div class="d">${m.then.cells[c.k].d}</div></div>`).join('')}</div>`
    : m.then.lines.map((l) => `<p class="xe-then-line">${l}</p>`).join('');
  const now = `<div class="xe-now"><canvas aria-hidden="true"></canvas><div class="xe-cells">${s.opts.map((o) => `<div class="xe-cell"><div class="xe-pct${o.k === s.me ? ' me' : ''}">${o.pct}<i>%</i>${o.k === s.me ? '<span>나</span>' : ''}</div></div>`).join('')}</div></div>`;
  $(m.cmp).innerHTML = cols
    + `<div class="xe-row"><div class="xe-rl">${m.then.label}</div>${then}<div class="xe-src">${m.then.src}</div></div>`
    + `<div class="xe-row"><div class="xe-rl"><b>오늘의 관람객 ${fmt(VISITORS)}명</b><small>점 하나 = 열 사람</small></div>${now}</div>`
    + (m.moved ? `<p class="xe-moved">${m.moved}</p>` : '');
  m.cv = $(`${m.el} .xe-now canvas`);
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
  setTimeout(() => m.crowd.move(t, { duration: 1150, stagger: 420, mineDelay: 560, bend: 0.16, alpha, onDone: fin }), 380);
}

// ── 장 들어오기: 보이면 .on(바탕 · 내 선택), 큰 선택이면 점이 모인다
const deck = $('#deck');
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add('on');
  const m = MAJOR.find((x) => $(x.el) === e.target); if (m) gather(m);
}), { root: deck, threshold: 0.5 });
[...MAJOR.map((m) => $(m.el)), $('#minor')].forEach((el) => io.observe(el));
document.querySelectorAll('.xe-next').forEach((b) => b.addEventListener('click', () => $('#' + b.dataset.to).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })));

// ── 작은 선택 — 흰 쟁반의 작은 카드 둘
const c0 = S.c0, c2 = S.c2;
$('#minorCards').innerHTML = `
  <article class="xe-mc" style="--i:0"><div class="th medal"><img src="${c0.img}" alt=""><i class="x-medal"></i></div>
    <div class="tx"><small>메달을 준 그림${ex(c0)}</small><b>${c0.choice}</b><span>오늘 <em>${c0.opt.pct}%</em>가 같은 그림</span></div></article>
  <article class="xe-mc" style="--i:1"><div class="th trip"><img class="pc" src="${c2.img}" alt=""><img class="tk" src="${c2.ticket}" alt=""></div>
    <div class="tx"><small>행선지${ex(c2)}</small><b>${c2.choice} · ${c2.sub.split(' · ')[0]}</b><span>오늘 <em>${c2.opt.pct}%</em>가 ${c2.choicePlain}</span></div></article>`;

// ── 가져가는 것 다섯: 기차표 · 엽서 · 메달 카드 · 전시 포스터 · 초상 카드
const KEEP = [
  { lb: '기차표', html: `<span class="x-th x-tk"><img src="${c2.ticket}" alt=""></span>` },
  { lb: '엽서', html: `<span class="x-th x-pc"><img src="${c2.img}" alt=""><i class="st"></i></span>` },
  { lb: '메달 카드', html: artThumb(c0.art) },
  { lb: '전시 포스터', html: posterHTML(S.c1.expo, 'x-th') },
  { lb: S.c4.art.lb, html: artThumb(S.c4.art) },
];
$('#keep').innerHTML = KEEP.map((k, i) => `<div class="xe-k" style="--i:${i + 2}">${k.html}<span>${k.lb}</span></div>`).join('');
$('#foot').textContent = `${stampLine(VISITORS)}${anyReal ? ' · 들르지 않은 곳은 예시 값' : ''}. 출구 벽의 질문은 벽에 그대로 두고, 앱은 답하지 않습니다.`;

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
  // 바탕(오른쪽 위, 옅게)
  g.save(); g.globalAlpha = 0.34;
  if (s.id === 'c1') { ['jury', 'viewer'].forEach((k, j) => { g.save(); g.globalAlpha = s.me === k ? 0.5 : 0.22; g.translate(x + W - 300 + j * 150, y + 30 + j * 26); g.rotate(j ? 0.08 : -0.08); drawPoster(g, 0, 0, 170, 204, k === 'viewer'); g.restore(); }); }
  else { const imgs = await Promise.all(['paint', 'photo'].map((k) => loadImg(C4[k].src))); ['paint', 'photo'].forEach((k, j) => { g.save(); g.globalAlpha = s.me === k ? 0.55 : 0.22; if (k === 'photo') g.filter = 'grayscale(1)'; cover(g, imgs[j], x + W - 330 + j * 168, y + 10, 160, 210, C4[k].pos); g.restore(); }); }
  g.restore();
  const fade = g.createLinearGradient(x + W - 360, 0, x + W - 120, 0); fade.addColorStop(0, '#121110'); fade.addColorStop(1, 'rgba(18,17,16,0)');
  g.fillStyle = fade; g.fillRect(x + W - 360, y, 240, 250);
  // 머리
  g.fillStyle = POINT; rrect(g, x, y, 132, 44, 6); g.fill();
  g.fillStyle = '#fff'; g.font = `800 26px ${D}`; g.fillText('큰 선택', x + 20, y + 31);
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `600 26px ${D}`; g.fillText(`${i + 1} / 2`, x + 150, y + 31);
  g.fillStyle = 'rgba(255,255,255,.88)'; g.font = `600 36px ${D}`; g.fillText(s.id === 'c1' ? '그림이 걸릴 자격은 누가 정하는가' : '사람을 남기는 데, 그림인가 사진인가', x, y + 104);
  g.fillStyle = POINT; g.font = `600 26px ${D}`; g.fillText('나는', x, y + 158);
  const big = s.choicePlain.length <= 3;
  g.fillStyle = '#fff'; g.font = `800 ${big ? 116 : 76}px ${D}`; g.fillText(big ? s.choicePlain : s.choice, x - (big ? 6 : 3), y + (big ? 272 : 240));
  let cy = y + (big ? 298 : 278);
  g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(x, cy, W, 2);
  const gap = 24, colW = (W - gap) / 2;
  // 칸 머리
  cy += 40; g.font = `600 24px ${D}`;
  m.cols.forEach((c, j) => { const cx = x + j * (colW + gap), me = c.k === s.me; if (me) { g.fillStyle = POINT; g.beginPath(); g.arc(cx + 8, cy - 8, 7, 0, 6.2832); g.fill(); } g.fillStyle = me ? '#fff' : 'rgba(255,255,255,.45)'; g.fillText(c.lab, cx + (me ? 24 : 0), cy); });
  // 그때
  cy += 44; g.fillStyle = "rgba(255,255,255,.5)"; g.font = `800 20px ${D}`; g.fillText(m.then.label, x, cy);
  if (m.then.cells) {
    cy += 54;
    m.cols.forEach((c, j) => { const cx = x + j * (colW + gap), me = c.k === s.me, cell = m.then.cells[c.k];
      g.fillStyle = me ? '#fff' : 'rgba(255,255,255,.55)'; g.font = `800 50px ${D}`; g.fillText(cell.v.replace(/<[^>]+>/g, ''), cx, cy);
      g.fillStyle = me ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.45)'; g.font = `500 22px ${B}`; g.fillText(cell.d, cx, cy + 34); });
    cy += 34;
  } else {
    cy += 8;
    m.then.lines.forEach((l, j) => { g.font = `${j ? 500 : 600} ${j ? 23 : 27}px ${B}`; g.fillStyle = j ? 'rgba(255,255,255,.58)' : 'rgba(255,255,255,.88)'; wrapKo(g, l, W).forEach((ln) => { cy += j ? 34 : 38; g.fillText(ln, x, cy); }); cy += 6; });
  }
  // 오늘
  cy += 52; g.fillStyle = "#fff"; g.font = `800 24px ${D}`; g.fillText(`오늘의 관람객 ${fmt(VISITORS)}명`, x, cy);
  g.fillStyle = 'rgba(255,255,255,.4)'; g.font = `500 20px ${B}`; g.textAlign = 'right'; g.fillText('점 하나 = 열 사람', x + W, cy); g.textAlign = 'left';
  const bh = 66, bl = blocks(s, W, 13, bh, gap, 0), rnd = rng(19 + i);
  bl.forEach((b, j) => {
    const pts = packRect(b.n, b.rect, rnd, 13);
    pts.forEach((p, q) => { if (b.me && q === 0) return; g.fillStyle = `rgba(255,247,234,${b.me ? 0.95 : 0.4})`; g.beginPath(); g.arc(x + p.x, cy + 20 + p.y, 3.4 * (0.85 + rnd() * 0.3), 0, 6.2832); g.fill(); });
    if (b.me) { const p = pts[0]; g.fillStyle = 'rgba(217,103,47,.28)'; g.beginPath(); g.arc(x + p.x, cy + 20 + p.y, 13, 0, 6.2832); g.fill(); g.fillStyle = POINT; g.beginPath(); g.arc(x + p.x, cy + 20 + p.y, 6.5, 0, 6.2832); g.fill(); }
    const tx = x + b.rect.x + b.rect.w + 14, ty = cy + 20 + bh / 2 + (b.me ? 18 : 10);
    g.fillStyle = b.me ? POINT : 'rgba(255,255,255,.5)'; g.font = `${b.me ? 800 : 600} ${b.me ? 54 : 30}px ${D}`; g.fillText(`${b.o.pct}%`, tx, ty);
  });
  cy += 20 + bh;
  if (m.moved) { cy += 44; g.fillStyle = POINT; g.fillRect(x, cy - 9, 30, 3); g.fillStyle = 'rgba(255,255,255,.82)'; g.font = `600 26px ${D}`; g.fillText(m.moved, x + 44, cy); }
  return cy;
}
async function renderShare() {
  const Wd = 1080, Hd = 1920, c = document.createElement('canvas'); c.width = Wd; c.height = Hd;
  const g = c.getContext('2d'); await fontsReady();
  g.fillStyle = '#121110'; g.fillRect(0, 0, Wd, Hd); g.textBaseline = 'alphabetic';
  const L = 80, W = Wd - L * 2;
  g.fillStyle = POINT; g.font = `600 24px ${D}`; try { g.letterSpacing = '5px'; } catch (e) { /* noop */ } g.fillText('MONET 100 · THE NEXT IMPRESSION', L, 118); try { g.letterSpacing = '0px'; } catch (e) { /* noop */ }
  let y = await drawMajor(g, MAJOR[0], 0, L, 156, W);
  y += 30; g.fillStyle = "rgba(255,255,255,.14)"; g.fillRect(L, y, W, 2);
  y = await drawMajor(g, MAJOR[1], 1, L, y + 34, W);
  // 그 밖에 고른 것 — 흰 쟁반, 작게
  const ty = y + 40, th = 276, tx = 56, tw = Wd - 112;
  g.fillStyle = '#fff'; rrect(g, tx, ty, tw, th, 24); g.fill();
  g.fillStyle = '#111'; g.font = `800 32px ${D}`; g.fillText('그 밖에 고른 것', tx + 36, ty + 62);
  g.fillStyle = '#707070'; g.font = `600 22px ${D}`; g.textAlign = 'right'; g.fillText('작은 선택', tx + tw - 36, ty + 60); g.textAlign = 'left';
  const cards = [
    { s: c0, lab: '메달을 준 그림', t: c0.choice, line: [`오늘 `, `${c0.opt.pct}%`, `가 같은 그림`] },
    { s: c2, lab: '행선지', t: `${c2.choice} · ${c2.sub.split(' · ')[0]}`, line: ['오늘 ', `${c2.opt.pct}%`, `가 ${c2.choicePlain}`] },
  ];
  const cw = (tw - 72 - 24) / 2;
  for (const [j, cd] of cards.entries()) {
    const cx = tx + 36 + j * (cw + 24), cy = ty + 86, S0 = 136;
    g.fillStyle = '#F5F5F3'; rrect(g, cx, cy, cw, 162, 14); g.fill();
    if (j === 0) { const img = await loadImg(cd.s.img); g.save(); rrect(g, cx + 14, cy + 13, 112, S0, 6); g.clip(); cover(g, img, cx + 14, cy + 13, 112, S0, '50% 28%'); g.restore(); g.fillStyle = '#E7C46C'; g.beginPath(); g.arc(cx + 104, cy + 140, 13, 0, 6.2832); g.fill(); g.strokeStyle = '#3B2A12'; g.lineWidth = 2; g.stroke(); }
    else await drawArt(g, cd.s.art, cx + 14, cy + 16, 112);
    const lx = cx + 146, mw = cw - 160;
    g.fillStyle = '#707070'; g.font = `600 20px ${D}`; g.fillText(cd.lab + ex(cd.s), lx, cy + 46);
    g.fillStyle = '#111'; g.font = `800 ${g.measureText(cd.t).width > mw * 1.1 ? 24 : 27}px ${D}`;
    wrapKo(g, cd.t, mw).slice(0, 2).forEach((ln, k) => g.fillText(ln, lx, cy + 84 + k * 32));
    g.font = `500 21px ${B}`; let ox = lx; const by = cy + 140;
    cd.line.forEach((part, k) => { g.fillStyle = k === 1 ? POINT : '#4A4A47'; if (k === 1) g.font = `700 21px ${B}`; else g.font = `500 21px ${B}`; g.fillText(part, ox, by); ox += g.measureText(part).width; });
  }
  g.fillStyle = 'rgba(255,255,255,.4)'; g.font = `500 22px ${B}`; g.fillText(`${stampLine(VISITORS)} · 문명탐험가 앱 · 신세계 더 헤리티지`, L, Math.min(1890, Math.max(ty + th + 54, 1830)));
  return c;
}
setupShare($('#share'), renderShare, 'monet100_큰선택.png');
$('#restart').addEventListener('click', () => { clearChoices(); location.href = 'index.html'; });

window.__exitE = { MAJOR, render: renderShare, get done() { return MAJOR.map((m) => $(m.el).classList.contains('done')); } };
