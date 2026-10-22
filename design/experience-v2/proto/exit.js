// 출구 — 나의 길(흐름도). 질문 없음. 네 곳(C0·C1·C2·C4)에서 갈린 길 가운데 내가 지난 길을 한 줄기 주황으로, 갈래의 폭은 오늘의 비율, 점 하나 = 열 사람.
//   오늘의 관람객(점)이 줄기를 따라 위에서 아래로 내려가며, 갈림마다 나와 같은 쪽만 다음 줄로 내려가고 나머지는 그 갈래 끝에 남는다. 맨 아래 남은 사람 수는 작은 한 줄로만.
//   길가(오른쪽)에 가져가는 것: C0 메달 카드 · C1 전시 안내(재현) · C2 그해의 기차표 · C3 내 캔버스 · C4 사진관 카드(고른 쪽 얼굴 콜라주) · C5 내 액자. 바닥 순서(C0 → C1 → C2 → C3 → C4 → C5) 그대로.
//   저장·공유는 같은 흐름도를 1080×1920 으로 다시 그린다(같은 자리 계획·같은 씨앗). 다른 프로토타입이 localStorage(m100_choice · m100_c5_keep)에 남긴 것이 있으면 그것을, 없으면 예시 값을 쓴다. 서버는 숫자만(여기서는 예시 수치).
import { toast, loadImage } from '../../../booth/js/common.js';
import { loadChoices, clearChoices, reduceMotion } from './js/proto-common.js';
import { createCrowd, dotsFor, packDisc, packRect, scatter, discRadius, split, stampLine, fmt, rng, POINT } from './js/crowd.js';
import { STATIONS as XS } from './exit-common.js';          // C4 사진관 카드(고른 쪽 얼굴 콜라주)는 B–E 와 같은 것을 쓴다

const $ = (s) => document.querySelector(s);
const VISITORS = 1284;

// 네 곳의 선택지와 오늘의 비율(예시) — 보드 C0 · c1.js · map-picker.html PCT · c4.js
const C0 = {
  1: { title: '펠루시움의 캄비세스 왕', src: '../works/c0-cambyses.jpg', pct: 9 },
  2: { title: '마지막 탄약통', src: '../works/c0-cartridges.jpg', pct: 27 },
  3: { title: '환상, 14세기 전설', src: '../works/c0-vision.jpg', pct: 18 },
  4: { title: '봄날', src: '../works/c0-spring.jpg', pct: 39 },
  5: { title: '르 봉 보크', src: '../works/c0-bonbock.jpg', pct: 7 },
};
const C1 = { jury: { label: '살롱', short: '살롱', pct: 38 }, viewer: { label: '화가들의 전시', short: '화가들의 전시', pct: 62 } };
const C2 = {
  argenteuil: { label: '아르장퇴유', year: 1874, pct: 13, ticket: 'argenteuil', paint: '../works/c2-arg-coquelicots-orsay.jpg' },
  vernon: { label: '베르농', year: 1883, pct: 11, ticket: 'vernon', paint: '../works/c2-giverny-footbridge-nga.jpg' },
  rouen: { label: '루앙', year: 1892, pct: 9, ticket: 'rouen', paint: '../works/c2-rouen-cathedrale-nga.jpg' },
  lesifs: { label: '레지프', year: 1883, pct: 13, ticket: 'ifs', paint: '../works/c2-etretat-manneporte-met.jpg' },
  lehavre: { label: '르아브르', year: 1872, pct: 54, ticket: 'havre', paint: '../works/c2-havre-impression-marmottan.jpg' },
};
const C4 = { paint: { label: '그림으로', short: '그림', pct: 44 }, photo: { label: '사진으로', short: '사진', pct: 56 } };

// 예시 값 + 기기에 남은 입장
const stored = loadChoices();
let c5keep = null, c2card = null; try { c5keep = JSON.parse(localStorage.getItem('m100_c5_keep') || 'null'); c2card = JSON.parse(localStorage.getItem('m100_c2_postcard') || 'null'); } catch (e) { /* noop */ }
const mine = {
  c0: C0[stored.c0?.n] ? { n: stored.c0.n, real: true } : { n: 4, real: false },
  c1: C1[stored.c1?.stance] ? { k: stored.c1.stance, real: true } : { k: 'viewer', real: false },
  c2: C2[stored.c2?.id] ? { k: stored.c2.id, real: true } : { k: 'lehavre', real: false },
  c4: C4[stored.c4?.stance] ? { k: stored.c4.stance, real: true } : { k: 'photo', real: false },
};
const anyReal = Object.values(mine).some((m) => m.real);
// 줄(갈림) 네 개: 선택지 순서 그대로, 내 것은 me
const NODES = [
  { id: 'c0', st: 'C0 아카데미 살롱', q: '올해의 메달', opts: Object.keys(C0).map((n) => ({ k: n, lab: `${n}번`, full: `${n}번 〈${C0[n].title}〉`, pct: C0[n].pct })), me: String(mine.c0.n), real: mine.c0.real,
    art: { kind: 'medal', src: C0[mine.c0.n].src, lb: '메달 카드', t: `〈${C0[mine.c0.n].title}〉` } },
  { id: 'c1', st: 'C1 시민사회', q: '어느 전시를 보러', opts: Object.keys(C1).map((k) => ({ k, lab: C1[k].short, full: C1[k].label, pct: C1[k].pct })), me: mine.c1.k, real: mine.c1.real,
    art: { kind: 'poster', expo: mine.c1.k === 'viewer', lb: '전시 안내 · 재현', t: mine.c1.k === 'viewer' ? '카퓌신 대로 35번지' : '살롱 1874' } },
  { id: 'c2', st: 'C2 산업혁명', q: '어디까지', opts: Object.keys(C2).map((k) => ({ k, lab: C2[k].label, full: `${C2[k].label} · ${C2[k].year}년 표`, pct: C2[k].pct })), me: mine.c2.k, real: mine.c2.real,
    art: { kind: 'ticket', src: `../ticket/ticket-front-${C2[mine.c2.k].ticket}.png`, card: c2card && c2card.id === mine.c2.k ? c2card : null, paint: C2[mine.c2.k].paint, lb: '그해의 기차표 · 엽서', t: c2card && c2card.id === mine.c2.k && c2card.text ? `“${c2card.text.slice(0, 14)}${c2card.text.length > 14 ? '…' : ''}”` : `${C2[mine.c2.k].label} · ${C2[mine.c2.k].year}` },
    after: { kind: 'canvas', src: 'img/c3-outdoor.jpg', st: 'C3 화가의 아틀리에', lb: '내 캔버스', t: '밖의 빛으로 칠한 것' } },
  { id: 'c4', st: 'C4 나다르 사진관', q: '사람을 남긴다면', opts: Object.keys(C4).map((k) => ({ k, lab: C4[k].short, full: C4[k].label, pct: C4[k].pct })), me: mine.c4.k, real: mine.c4.real,
    art: { ...XS[3].art, kind: XS[3].art.kind === 'collage' ? 'collage' : 'carte' },
    after: { kind: 'frame', src: c5keep && c5keep.thumb ? c5keep.thumb : 'img/c5/haystacks/1.jpg', st: 'C5 모네 전시관', lb: '내 액자', t: c5keep ? `${c5keep.title} · ${c5keep.when}` : '건초더미 · 예시' } },
];
const rows = NODES.map((n) => { const o = n.opts.find((x) => x.k === n.me); return { st: n.st, q: n.q, val: o.full, pct: o.pct, real: n.real }; });
const comboKey = `${mine.c0.n}|${mine.c1.k}|${mine.c2.k}|${mine.c4.k}`;
const product = rows.reduce((a, r) => a * r.pct / 100, 1);
const same = Math.max(0.5, Math.round(product * 100 * 10) / 10);
const sameN = Math.max(1, Math.round(VISITORS * same / 100));
$('#gateN').textContent = `· ${fmt(VISITORS)}명`;
$('#crowdStamp').textContent = stampLine(VISITORS);

// ── 자리 계획: 폭 W 에 맞춰(화면 350 · 공유 920) 줄기·갈래·글자·걸린 것의 좌표를 낸다. 화면과 공유 이미지가 같은 함수를 쓴다
//    줄기 x 는 폭의 36%. 갈래 띠는 [bandL, bandR] 안에 비율대로, 띠 사이 간격 g. 오른쪽 기둥(artW)에 걸린 것
function layoutFlow(W, k = 1) {
  const ROW = 150 * k, GATE = 56 * k, AFTER = 112 * k, END = 120 * k, Tw = 12 * k, g = 6 * k;
  const artW = 96 * k, bandL = 8 * k, bandR = W - artW - 10 * k, xT = Math.round(W * 0.36);
  let y = 0;
  const gate = { y0: y, y1: y + GATE, x: xT, rect: { x: bandL, y: y + 8 * k, w: bandR - bandL, h: GATE - 16 * k } };
  y += GATE;
  const nodes = NODES.map((n) => {
    const yN = y + 18 * k, yB = y + 84 * k, yLab = yB + 6 * k;                    // 갈림점 · 갈래 끝 · 글자
    const total = n.opts.reduce((a, o) => a + o.pct, 0), free = (bandR - bandL) - g * (n.opts.length - 1);
    let x = bandL, off = 0;
    const branches = n.opts.map((o) => { const w = free * o.pct / total, tw = Tw * o.pct / total; const b = { k: o.k, lab: o.lab, pct: o.pct, me: o.k === n.me, x0: xT - Tw / 2 + off, w0: tw, x1: x, w, cx: x + w / 2, yN, yB }; x += w + g; off += tw; return b; });
    const meB = branches.find((b) => b.me);
    const node = { id: n.id, st: n.st, q: n.q, real: n.real, me: n.me, x: xT, y: yN, yB, yLab, branches, meB, art: { ...n.art, x: W - artW, y: yN + 24 * k, w: artW }, y0: y, y1: y + ROW };
    y += ROW;
    if (n.after) { node.after = { ...n.after, x: W - artW, y: y + 34 * k, w: artW, y0: y, y1: y + AFTER }; y += AFTER; }
    return node;
  });
  const end = { x: xT, y: y + 46 * k, y0: y, y1: y + END };
  y += END;
  return { W, k, H: y, xT, Tw, gate, nodes, end, artW };
}
// 띠(새키 리본): 위 [xa, xa+wa] → 아래 [xb, xb+wb], 세로 접선 베지어
function ribbon(xa, wa, ya, xb, wb, yb) {
  const m = (ya + yb) / 2;
  return `M${xa.toFixed(1)},${ya.toFixed(1)} C${xa.toFixed(1)},${m.toFixed(1)} ${xb.toFixed(1)},${m.toFixed(1)} ${xb.toFixed(1)},${yb.toFixed(1)} L${(xb + wb).toFixed(1)},${yb.toFixed(1)} C${(xb + wb).toFixed(1)},${m.toFixed(1)} ${(xa + wa).toFixed(1)},${m.toFixed(1)} ${(xa + wa).toFixed(1)},${ya.toFixed(1)} Z`;
}
// 그릴 띠 목록: [{ d, me }] — 갈래 띠 + 내 갈래에서 다음 갈림점으로 돌아오는 줄기
function ribbons(L) {
  const out = [], Tw = L.Tw;
  // 입구 → 첫 갈림점(줄기)
  out.push({ d: ribbon(L.xT - Tw / 2, Tw, L.gate.y1 - 16 * L.k, L.xT - Tw / 2, Tw, L.nodes[0].y), me: true, trunk: true });
  L.nodes.forEach((n, i) => {
    n.branches.forEach((b) => out.push({ d: ribbon(b.x0, b.w0, b.yN, b.x1, b.w, b.yB), me: b.me }));
    const next = L.nodes[i + 1], toY = next ? next.y : L.end.y - 30 * L.k;
    out.push({ d: ribbon(n.meB.x1, n.meB.w, n.meB.yB, L.xT - Tw / 2, Tw, toY), me: true, trunk: true });
  });
  return out;
}
// 점의 자리 계획: 입구에 흩어져 → 갈림마다 비율대로 갈래 끝 띠 안에(내 갈래는 다음으로) → 끝에 둥글게. 화면·공유 이미지가 같은 씨앗을 쓴다
const N = dotsFor(VISITORS);
function planFlow(L, mineIdx, rand) {
  const pos = scatter(N, L.gate.rect, rand);
  const stages = [{ targets: pos.slice() }];
  let alive = [...Array(N).keys()];
  L.nodes.forEach((n, i) => {
    const counts = split(alive.length, n.branches.map((b) => b.pct));
    const meI = n.branches.findIndex((b) => b.me);
    if (counts[meI] < 1) { counts[meI] = 1; }
    const others = alive.filter((q) => q !== mineIdx).sort((a, b) => pos[a].x - pos[b].x);
    const targets = new Array(N).fill(null), alpha = new Array(N).fill(null);
    let p = 0; const nextAlive = [];
    n.branches.forEach((b, bi) => {
      const c = counts[bi]; let members;
      if (b.me) { members = [mineIdx, ...others.slice(p, p + Math.max(0, c - 1))]; p += Math.max(0, c - 1); nextAlive.push(...members); }
      else { members = others.slice(p, p + c); p += c; }
      const h = 20 * L.k, pts = packRect(members.length, { x: b.x1 + 2, y: b.yB - h - 2, w: Math.max(6, b.w - 4), h }, rand, 5.5 * L.k);
      members.forEach((q, j) => { targets[q] = pts[j]; if (!b.me) alpha[q] = 0.32; pos[q] = pts[j]; });
    });
    stages.push({ targets, alpha, row: i });
    alive = nextAlive;
  });
  const endPts = packDisc(alive.length, L.xT, L.end.y + 4 * L.k, discRadius(alive.length, 2.6 * L.k) + 2 * L.k, rand);
  const targets = new Array(N).fill(null); alive.forEach((q, j) => { targets[q] = endPts[j]; });
  stages.push({ targets, end: true });
  return stages;
}

// ── 화면에 그리기
const fc = $('#fc'), svg = $('#fcSvg'), html = $('#fcHtml');
let L = null, crowd = null, started = false;
function artHtml(a, cls = '') {
  const th = a.kind === 'poster'
    ? `<span class="th poster${a.expo ? ' expo' : ''}">${a.expo ? '<small>Société anonyme</small><b>EXPO-<br>SITION</b><i></i><small>35, bd des Capucines</small>' : '<small>République Française</small><b>SALON<br>DE 1874</b><i></i><small>Palais des Champs-Élysées</small>'}</span>`
    : a.kind === 'ticket' ? `<span class="th ticket"><img src="${a.src}" alt=""></span><span class="th postcard"><img src="${a.paint}" alt=""><i></i></span>`
    : `<span class="th ${a.kind}"><img src="${a.src}" alt="" style="${a.pos ? `object-position:${a.pos}` : ''}">${a.kind === 'medal' ? '<i class="medal"></i>' : ''}</span>`;
  return `<div class="fc-art ${cls}" style="left:${a.x}px;top:${a.y}px">${th}<span class="lb"><b>${a.lb}</b>${a.t}</span></div>`;
}
function build() {
  const W = fc.clientWidth; L = layoutFlow(W, 1);
  fc.style.height = `${L.H}px`;
  svg.setAttribute('viewBox', `0 0 ${W} ${L.H}`);
  svg.innerHTML = ribbons(L).map((r) => `<path d="${r.d}" fill="${r.me ? (r.trunk ? 'rgba(217,103,47,.92)' : 'rgba(217,103,47,.6)') : 'rgba(255,255,255,.13)'}"/>`).join('')
    + L.nodes.map((n) => `<circle cx="${n.x}" cy="${n.y}" r="${L.Tw / 2 + 2}" fill="#151413" stroke="${POINT}" stroke-width="2"/>`).join('')
    + L.nodes.map((n) => `<path d="M${n.meB.cx},${n.meB.yB} L${n.art.x - 6},${n.art.y}" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1" stroke-dasharray="2 3"/>`).join('')
    + L.nodes.filter((n) => n.after).map((n) => `<path d="M${L.xT + L.Tw / 2},${n.after.y} L${n.after.x - 6},${n.after.y}" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1" stroke-dasharray="2 3"/>`).join('');
  let h = `<div class="fc-gate" style="left:${L.xT - 12}px;top:${L.gate.y0 + L.gate.y1 - L.gate.y0 - 20}px">모네의 방을 나온 사람 <b>${fmt(VISITORS)}명</b></div>`;
  L.nodes.forEach((n, i) => {
    h += `<div class="fc-row" style="left:${n.x - 12}px;top:${n.y}px">${n.st}${anyReal && !n.real ? ' · 예시' : ''}<b>${n.q}</b></div>`;
    n.branches.forEach((b) => { h += b.me ? `<div class="fc-pct me" data-row="${i}" style="left:${b.cx}px;top:${n.yLab}px">${b.pct}%<small>${b.lab} · 나</small></div>` : `<div class="fc-pct" data-row="${i}" style="left:${b.cx}px;top:${n.yLab}px">${b.pct}%</div>`; });
    const others = n.branches.filter((b) => !b.me).map((b) => `${b.lab} <b>${b.pct}</b>`).join(' · ');
    h += `<div class="fc-legend" style="left:${(L.gate.rect.x + L.gate.rect.w) / 2 + 4}px;top:${n.yLab + 34}px">${others}</div>`;
    h += artHtml(n.art, anyReal && !n.real ? 'none' : '');
    if (n.after) h += artHtml(n.after, 'after');
  });
  h += `<div class="fc-end" id="sameBig" style="left:${L.xT + 34}px;top:${L.end.y + 6}px"><div class="crowd-lab">네 곳 모두 나와 같은 쪽<small>오늘 ${fmt(sameN)}명</small></div></div>`;
  html.innerHTML = h;
  $('#crowdCv').width = 1; $('#crowdCv').height = 1;
}
function start() {
  if (started) return; started = true;
  crowd = createCrowd($('#crowdCv'), { theme: 'dark', n: N, reduceMotion, seed: 17 });
  crowd.resize();
  const stages = planFlow(L, crowd.mine, crowd.rnd);
  const showRow = (i) => { html.querySelectorAll(`.fc-pct[data-row="${i}"]`).forEach((e) => e.classList.add('show')); html.querySelectorAll('.fc-art').forEach((e, k) => { if (k <= i * 1.5) e.classList.add('show'); }); };
  const showEnd = () => { $('#sameBig').classList.add('show'); html.querySelectorAll('.fc-art').forEach((e) => e.classList.add('show')); };
  crowd.place(stages[0].targets);
  if (reduceMotion) { stages.slice(1).forEach((s) => crowd.place(s.targets, s.alpha ? (q) => s.alpha[q] : null)); NODES.forEach((_, i) => showRow(i)); showEnd(); return; }
  let t = 420;
  stages.slice(1).forEach((s) => {
    setTimeout(() => {
      crowd.move(s.targets, { duration: 1000, stagger: 240, mineDelay: 380, bend: 0.14, alpha: s.alpha ? (q) => s.alpha[q] : null });
      if (s.row != null) setTimeout(() => showRow(s.row), 520);
      if (s.end) setTimeout(showEnd, 820);
    }, t);
    t += 980;
  });
}
build();
window.addEventListener('resize', () => { if (started) return; build(); });
// 흐름도가 보일 때 점이 흐르기 시작한다
const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); start(); } }, { threshold: 0.15 });
io.observe(fc);
setTimeout(() => { if (!started && fc.getBoundingClientRect().top < window.innerHeight) start(); }, 1600);

// ── 저장 · 공유 — 1080×1920, 같은 흐름도(어두운 바탕 · 흰 글자 · 주황 한 줄기). 위 250 아래 250 비움, 좌우 80
let shareBlob = null;
async function render() {
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  try { await Promise.all(['800 40px Paperlogy', '600 28px Paperlogy', '500 28px Freesentation', '700 30px Freesentation', '900 20px "Playfair Display"'].map((f) => document.fonts.load(f, '모네'))); } catch (e) { /* noop */ }
  const DISP = 'Paperlogy, Freesentation, sans-serif', BODY = 'Freesentation, sans-serif';
  g.fillStyle = '#151413'; g.fillRect(0, 0, W, H);
  const Lm = 80, R = W - 80; let y = 250;
  g.fillStyle = 'rgba(255,255,255,.55)'; g.font = `700 26px ${BODY}`; g.textBaseline = 'alphabetic';
  g.fillText('MONET 100 · The Next Impression', Lm, y); y += 86;
  g.fillStyle = '#FFFFFF'; g.font = `800 88px ${DISP}`; g.fillText('나의 길', Lm, y);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.font = `600 30px ${DISP}`; g.fillText(`오늘의 관람객 ${fmt(VISITORS)}명 · 점 하나 = 열 사람`, Lm + 330, y - 6); y += 50;
  // 흐름도: 폭 920, 배율 — 세로가 1920-250-250-머리(≈190)-바닥(60) ≈ 1170 안에 들어오게
  const FW = R - Lm; const L1 = layoutFlow(FW, 1); const kk = Math.min(1.25, 1150 / L1.H); const L2 = layoutFlow(FW, kk);
  const top = y;
  g.save(); g.translate(Lm, top);
  ribbons(L2).forEach((r) => { g.fillStyle = r.me ? (r.trunk ? 'rgba(217,103,47,.92)' : 'rgba(217,103,47,.6)') : 'rgba(255,255,255,.13)'; g.fill(new Path2D(r.d)); });
  L2.nodes.forEach((n) => { g.beginPath(); g.arc(n.x, n.y, L2.Tw / 2 + 3, 0, 6.2832); g.fillStyle = '#151413'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = POINT; g.stroke(); });
  g.setLineDash([3, 5]); g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1.5;
  L2.nodes.forEach((n) => { g.beginPath(); g.moveTo(n.meB.cx, n.meB.yB); g.lineTo(n.art.x - 8, n.art.y); g.stroke(); if (n.after) { g.beginPath(); g.moveTo(L2.xT + L2.Tw / 2, n.after.y); g.lineTo(n.after.x - 8, n.after.y); g.stroke(); } });
  g.setLineDash([]);
  // 점(모인 자리)
  const rand = rng(17);
  const dots = Array.from({ length: N }, () => ({ x: 0, y: 0, a: 0.78 + rand() * 0.2, r: 2.2 * kk * (0.86 + rand() * 0.3) }));
  planFlow(L2, N - 1, rand).forEach((s) => s.targets.forEach((p, q) => { if (p) { dots[q].x = p.x; dots[q].y = p.y; } if (s.alpha && s.alpha[q] != null) dots[q].a = s.alpha[q]; }));
  dots.forEach((d, q) => { if (q === N - 1) return; g.fillStyle = `rgba(255,247,234,${d.a.toFixed(2)})`; g.beginPath(); g.arc(d.x, d.y, d.r, 0, 6.2832); g.fill(); });
  const m = dots[N - 1]; g.fillStyle = 'rgba(217,103,47,.25)'; g.beginPath(); g.arc(m.x, m.y, 10 * kk, 0, 6.2832); g.fill(); g.fillStyle = POINT; g.beginPath(); g.arc(m.x, m.y, 4.5 * kk, 0, 6.2832); g.fill();
  // 글자
  const f = (px) => Math.round(px * kk);
  g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,.5)'; g.font = `500 ${f(12)}px ${BODY}`; g.fillText(`모네의 방을 나온 사람 ${fmt(VISITORS)}명`, L2.xT - 14, L2.gate.y1 - 16);
  L2.nodes.forEach((n) => {
    g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,.55)'; g.font = `600 ${f(11)}px ${DISP}`; g.fillText(n.st, n.x - 14, n.y - 2);
    g.fillStyle = 'rgba(255,255,255,.88)'; g.font = `800 ${f(12.5)}px ${DISP}`; g.fillText(n.q, n.x - 14, n.y + f(14));
    g.textAlign = 'center';
    n.branches.forEach((b) => {
      if (b.me) { g.fillStyle = '#fff'; g.font = `800 ${f(13.5)}px ${DISP}`; g.fillText(`${b.pct}%`, b.cx, n.yLab + f(13)); g.fillStyle = 'rgba(255,255,255,.9)'; g.font = `700 ${f(11)}px ${BODY}`; g.fillText(`${b.lab} · 나`, b.cx, n.yLab + f(27)); }
      else { g.fillStyle = 'rgba(255,255,255,.45)'; g.font = `600 ${f(10)}px ${DISP}`; g.fillText(`${b.pct}%`, b.cx, n.yLab + f(11)); }
    });
    g.fillStyle = 'rgba(255,255,255,.4)'; g.font = `500 ${f(10.5)}px ${BODY}`;
    g.fillText(n.branches.filter((b) => !b.me).map((b) => `${b.lab} ${b.pct}`).join(' · '), (L2.gate.rect.x + L2.gate.rect.w) / 2 + 4, n.yLab + f(46));
  });
  g.textAlign = 'left';
  // 걸린 것
  const arts = []; L2.nodes.forEach((n) => { arts.push(n.art); if (n.after) arts.push(n.after); });
  for (const a of arts) {
    const S = f(60), x = a.x, yy = a.y - S / 2;
    g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 14; g.shadowOffsetY = 6;
    if (a.kind === 'poster') {
      g.fillStyle = a.expo ? '#E6D6AA' : '#EFE6D0'; g.fillRect(x, yy, S, S); g.restore();
      g.strokeStyle = 'rgba(38,33,27,.7)'; g.lineWidth = 1; g.strokeRect(x + 3, yy + 3, S - 6, S - 6);
      g.fillStyle = '#26211B'; g.textAlign = 'center'; g.font = `900 ${f(11)}px "Playfair Display", Georgia, serif`;
      g.fillText(a.expo ? 'EXPO-' : 'SALON', x + S / 2, yy + S / 2 - 2); g.fillText(a.expo ? 'SITION' : 'DE 1874', x + S / 2, yy + S / 2 + f(11));
      g.font = `400 ${f(5.5)}px Georgia, serif`; g.fillText(a.expo ? '35, BD DES CAPUCINES' : 'PALAIS DES CHAMPS-ÉLYSÉES', x + S / 2, yy + S - f(7)); g.textAlign = 'left';
    } else {
      const img = await loadImage(a.src).catch(() => null);
      let w = S, h = S; if (a.kind === 'ticket') { w = f(62); h = f(33); } if (a.kind === 'canvas') { w = f(72); h = S; }
      const yb = a.kind === 'ticket' ? a.y - S / 2 : a.y - h / 2;
      if (a.kind === 'frame') { g.fillStyle = '#9A7430'; g.fillRect(x, yb, w, h); }
      if (a.kind === 'carte') { g.fillStyle = '#E3D6B6'; g.fillRect(x, yb, w, h); }
      g.restore();
      if (img) {
        const pad = a.kind === 'frame' ? f(4) : a.kind === 'carte' ? f(4) : 0, pb = a.kind === 'carte' ? f(9) : pad;
        const bw = w - pad * 2, bh = h - pad - pb, sc = Math.max(bw / img.naturalWidth, bh / img.naturalHeight), sw = bw / sc, sh = bh / sc;
        const [px, py] = (a.pos || '50% 50%').split(' ').map((v) => parseFloat(v) / 100);
        g.drawImage(img, (img.naturalWidth - sw) * px, (img.naturalHeight - sh) * py, sw, sh, x + pad, yb + pad, bw, bh);
      } else { g.fillStyle = '#2A2724'; g.fillRect(x, yb, w, h); }
      if (a.kind === 'medal') { g.fillStyle = '#E7C46C'; g.beginPath(); g.arc(x + w - f(10), yb + h - f(10), f(7), 0, 6.2832); g.fill(); g.strokeStyle = '#3B2A12'; g.lineWidth = 1.5; g.stroke(); }
      if (a.kind === 'ticket') {                                   // 엽서(그림 + 우표 귀퉁이)
        const pimg = await loadImage(a.paint).catch(() => null), py2 = yb + h + f(4), pw = f(62), ph = f(42);
        g.fillStyle = '#DDD4BC'; g.fillRect(x, py2, pw, ph);
        if (pimg) { const sc = Math.max(pw / pimg.naturalWidth, ph / pimg.naturalHeight), sw = pw / sc, sh = ph / sc; g.drawImage(pimg, (pimg.naturalWidth - sw) / 2, (pimg.naturalHeight - sh) / 2, sw, sh, x, py2, pw, ph); }
        g.fillStyle = '#F2EAD6'; g.fillRect(x + pw - f(12), py2 + f(3), f(9), f(11)); g.fillStyle = '#5C6E8E'; g.fillRect(x + pw - f(11), py2 + f(4), f(7), f(9));
      }
    }
    g.fillStyle = 'rgba(255,255,255,.88)'; g.font = `600 ${f(11)}px ${DISP}`; g.fillText(a.lb, x, a.y + S / 2 + f(14));
    g.fillStyle = 'rgba(255,255,255,.6)'; g.font = `500 ${f(10.5)}px ${BODY}`; g.fillText(a.t, x, a.y + S / 2 + f(27));
  }
  // 끝
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `600 ${f(12)}px ${DISP}`; g.fillText('네 곳 모두 나와 같은 쪽', L2.xT + f(34), L2.end.y + f(4));
  g.fillStyle = 'rgba(255,255,255,.5)'; g.font = `500 ${f(10.5)}px ${BODY}`; g.fillText(`오늘 ${fmt(sameN)}명`, L2.xT + f(34), L2.end.y + f(20));
  g.restore();
  g.fillStyle = 'rgba(255,255,255,.4)'; g.font = `500 24px ${BODY}`; g.fillText(`${stampLine(VISITORS)} · 문명탐험가 앱 · 신세계 더 헤리티지`, Lm, H - 250 - 20);
  shareBlob = await new Promise((r) => c.toBlob(r, 'image/png'));
  return c;
}
$('#share').addEventListener('click', async () => {
  const btn = $('#share'); btn.disabled = true;
  try { const c = await render(); $('#shareImg').src = c.toDataURL('image/png'); $('#shareOv').hidden = false; }
  catch (e) { console.error(e); toast('이미지를 만들지 못했습니다.'); }
  btn.disabled = false;
});
$('#shareClose').addEventListener('click', () => { $('#shareOv').hidden = true; });
$('#shareGo').addEventListener('click', async () => {
  if (!shareBlob) return;
  const file = new File([shareBlob], 'monet100_나의길.png', { type: 'image/png' });
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(shareBlob); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('이미지를 저장했습니다.');
});
$('#restart').addEventListener('click', () => { clearChoices(); location.href = 'index.html'; });
$('#shareOv').addEventListener('click', (e) => { if (e.target === e.currentTarget) $('#shareOv').hidden = true; });

window.__exit = { mine, rows, same, sameN, render, start, layoutFlow, get L() { return L; }, get crowd() { return crowd; }, get started() { return started; } };
