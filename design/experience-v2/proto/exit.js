// 출구 — 오늘의 관람객 모아 보기(옛 C5 마무리 화면). 질문 없음. 〈인상, 해돋이〉 앞에서 네 곳(C0·C1·C2·C4)의 내 입장을 오늘의 관람객 옆에 놓는다.
//   오늘의 관람객은 점(하나 = 열 사람)으로 왼쪽 기둥을 위에서 아래로 흐른다. 줄마다 나와 같은 쪽만 다음 줄로 내려가고 나머지는 그 줄 왼쪽에 남는다.
//   맨 아래 남은 사람이 "나와 같은 길 7.3% · 94명". 조합 5×2×5×2 = 100가지. 남는 것은 C2 그해의 기차표 하나. 저장·공유는 기기에서 1080×1920 이미지를 그린다.
//   다른 프로토타입이 localStorage(m100_choice)에 남긴 입장이 있으면 그것을, 없으면 예시 값을 쓴다. 서버는 숫자만(여기서는 예시 수치).
import { toast, loadImage } from '../../../booth/js/common.js';
import { loadChoices, clearChoices, reduceMotion } from './js/proto-common.js';
import { createCrowd, dotsFor, packDisc, packRect, scatter, discRadius, stampLine, fmt, rng, POINT } from './js/crowd.js';

const $ = (s) => document.querySelector(s);
const VISITORS = 1284;

// C0 후보작 5점(보드 C0 · c0.js WORKS) — 오늘의 비율은 예시
const C0 = {
  1: { title: '펠루시움의 캄비세스 왕', src: '../works/c0-cambyses.jpg', pct: 9 },
  2: { title: '마지막 탄약통', src: '../works/c0-cartridges.jpg', pct: 27 },
  3: { title: '환상, 14세기 전설', src: '../works/c0-vision.jpg', pct: 18 },
  4: { title: '봄날', src: '../works/c0-spring.jpg', pct: 39 },
  5: { title: '르 봉 보크', src: '../works/c0-bonbock.jpg', pct: 7 },
};
const C1 = { jury: { label: '심사위원이 정한다', pct: 38 }, viewer: { label: '보는 사람이 정한다', pct: 62 } };
// C2 목적지 5곳(ticket/map-picker.html DEST · PCT)
const C2 = {
  argenteuil: { label: '아르장퇴유', year: 1874, pct: 13, ticket: 'argenteuil' },
  vernon: { label: '베르농', year: 1883, pct: 11, ticket: 'vernon' },
  rouen: { label: '루앙', year: 1892, pct: 9, ticket: 'rouen' },
  lesifs: { label: '레지프', year: 1883, pct: 13, ticket: 'ifs' },
  lehavre: { label: '르아브르', year: 1872, pct: 54, ticket: 'havre' },
};
const C4 = { paint: { label: '그림', pct: 44 }, photo: { label: '사진', pct: 56 } };

// 예시 값 + 기기에 남은 입장
const stored = loadChoices();
const mine = {
  c0: C0[stored.c0?.n] ? { n: stored.c0.n, real: true } : { n: 4, real: false },
  c1: C1[stored.c1?.stance] ? { k: stored.c1.stance, real: true } : { k: 'viewer', real: false },
  c2: C2[stored.c2?.id] ? { k: stored.c2.id, real: true } : { k: 'lehavre', real: false },
  c4: C4[stored.c4?.stance] ? { k: stored.c4.stance, real: true } : { k: 'photo', real: false },
};
const rows = [
  { st: 'C0 아카데미 살롱', q: '올해의 메달', thumb: C0[mine.c0.n].src, val: `${mine.c0.n}번 〈${C0[mine.c0.n].title}〉`, pct: C0[mine.c0.n].pct, real: mine.c0.real },
  { st: 'C1 시민사회', q: '그림이 걸릴 자격은 누가', val: C1[mine.c1.k].label, pct: C1[mine.c1.k].pct, real: mine.c1.real },
  { st: 'C2 산업혁명', q: '어디까지 갈까', thumb: `../ticket/ticket-front-${C2[mine.c2.k].ticket}.png`, val: `${C2[mine.c2.k].label} · ${C2[mine.c2.k].year}년 표`, pct: C2[mine.c2.k].pct, real: mine.c2.real },
  { st: 'C4 나다르 사진관', q: '그림인가 사진인가', val: C4[mine.c4.k].label, pct: C4[mine.c4.k].pct, real: mine.c4.real },
];
const anyReal = Object.values(mine).some((m) => m.real);
// 같은 길 — 100가지 조합 중 하나. 예시: 네 비율의 곱
const comboKey = `${mine.c0.n}|${mine.c1.k}|${mine.c2.k}|${mine.c4.k}`;
const product = rows.reduce((a, r) => a * r.pct / 100, 1);
const same = Math.max(0.5, Math.round(product * 100 * 10) / 10);
const sameN = Math.max(1, Math.round(VISITORS * same / 100));

$('#gateN').textContent = `${fmt(VISITORS)}명`;
$('#rows').insertAdjacentHTML('beforeend', rows.map((r, i) => `
  <div class="row${anyReal && !r.real ? ' none' : ''}" style="animation-delay:${i * 90}ms">
    <div class="k"><span>${r.st} · ${r.q}</span><i>${anyReal && !r.real ? '예시' : ''}</i></div>
    <div class="v"><span>${r.val}</span><span class="n" data-row="${i}">같은 쪽 <b>${r.pct}%</b></span></div>
    ${r.thumb ? `<div class="th"><img src="${r.thumb}" alt=""><span>${i === 0 ? '내가 메달을 준 그림' : '남은 것 · 그해의 표'}</span></div>` : ''}
  </div>`).join(''));
$('#same').innerHTML = `<div class="crowd-big" id="sameBig">${same}<i>%</i></div><div class="crowd-lab">나와 같은 길 · ${fmt(sameN)}명<small>네 입장이 모두 나와 같은 관람객 · 100가지 조합 중 하나 · ${comboKey}</small></div>`;
$('#crowdStamp').textContent = stampLine(VISITORS);

// ── 흐름 계획: 줄마다 나와 같은 쪽(오른쪽 무리)만 내려가고, 나머지는 그 줄 왼쪽에 흐리게 남는다. 살아 있는 화면과 공유 이미지가 같은 계획을 쓴다
const N = dotsFor(VISITORS);
const COUNTS = (() => { let c = N; const out = rows.map((r) => (c = Math.max(1, Math.round(c * r.pct / 100)))); out[out.length - 1] = Math.max(1, Math.round(N * same / 100)); return out; })();
function planFlow(n, mineIdx, rand, geom) {
  const pos = scatter(n, geom.gate, rand);
  const stages = [{ targets: pos.slice() }];
  let alive = [...Array(n).keys()];
  const goX = geom.gate.x + geom.w * 0.66, pileX = geom.gate.x, pileW = Math.round(geom.w * 0.3);
  COUNTS.forEach((c, i) => {
    const row = geom.rows[i];
    const others = alive.filter((k) => k !== mineIdx).sort((a, b) => pos[b].x - pos[a].x);
    const go = [mineIdx, ...others.slice(0, Math.max(0, c - 1))], stay = others.slice(Math.max(0, c - 1));
    const goPts = packDisc(go.length, goX, row.top + row.h / 2, discRadius(go.length, geom.k), rand);
    const stayPts = packRect(stay.length, { x: pileX, y: row.top + 12, w: pileW, h: row.h - 24 }, rand, 3 * geom.k);
    const targets = new Array(n).fill(null), alpha = new Array(n).fill(null);
    go.forEach((k, j) => { targets[k] = goPts[j]; });
    stay.forEach((k, j) => { targets[k] = stayPts[j]; alpha[k] = 0.3; });
    targets.forEach((p, k) => { if (p) pos[k] = p; });
    stages.push({ targets, alpha, row: i });
    alive = go;
  });
  const endPts = packDisc(alive.length, geom.gate.x + geom.w * 0.5, geom.end.top + geom.end.h / 2, discRadius(alive.length, geom.k) + 2, rand);
  const targets = new Array(n).fill(null); alive.forEach((k, j) => { targets[k] = endPts[j]; pos[k] = endPts[j]; });
  stages.push({ targets, end: true });
  return stages;
}
function geomOf(flowEl) {
  const r = flowEl.getBoundingClientRect(), top = (el) => el.getBoundingClientRect().top - r.top;
  const gate = $('.flow-gate'), rowEls = Array.from(document.querySelectorAll('#rows .row')), end = $('#same'), w = $('#flowStage').clientWidth;
  return { w, k: 2.5, gate: { x: 4, y: top(gate) + 6, w: w - 8, h: gate.offsetHeight - 14 }, rows: rowEls.map((el) => ({ top: top(el), h: el.offsetHeight })), end: { top: top(end), h: end.offsetHeight } };
}

let crowd = null, started = false;
function start() {
  if (started) return; started = true;
  crowd = createCrowd($('#crowdCv'), { theme: 'dark', n: N, reduceMotion, seed: 17 });
  crowd.resize();
  const stages = planFlow(N, crowd.mine, crowd.rnd, geomOf($('#flow')));
  const showNum = (i) => $(`.row .n[data-row="${i}"]`).classList.add('show'), showEnd = () => $('#sameBig').classList.add('show');
  crowd.place(stages[0].targets);
  if (reduceMotion) { stages.slice(1).forEach((s) => crowd.place(s.targets, s.alpha ? (k) => s.alpha[k] : null)); rows.forEach((_, i) => showNum(i)); showEnd(); return; }
  let t = 420;
  stages.slice(1).forEach((s) => {
    setTimeout(() => {
      crowd.move(s.targets, { duration: 1000, stagger: 240, mineDelay: 380, bend: 0.18, alpha: s.alpha ? (k) => s.alpha[k] : null });
      if (s.row != null) setTimeout(() => showNum(s.row), 520);
      if (s.end) setTimeout(showEnd, 820);
    }, t);
    t += 940;
  });
}
// 줄이 보일 때 흐르기 시작한다
const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); start(); } }, { threshold: 0.3 });
io.observe($('#flow'));
setTimeout(() => { if (!started && $('#flow').getBoundingClientRect().top < window.innerHeight) start(); }, 1600);

// 남은 것 — C2 기차표
$('#ticket').src = `../ticket/ticket-front-${C2[mine.c2.k].ticket}.png`;
$('#ticketSub').textContent = `파리 생라자르 → ${C2[mine.c2.k].label} · ${C2[mine.c2.k].year} · 2등`;

// 저장 · 공유 — 1080×1920 (위·아래 250px 비움, 좌우 80px). 왼쪽 기둥에 점의 흐름(모인 자리), 오른쪽에 네 줄. 주황은 세 곳: 제목, 내 점, 같은 길 숫자
let shareBlob = null;
async function render() {
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  try { await Promise.all(['800 40px Paperlogy', '600 28px Paperlogy', '500 28px Freesentation', '700 30px Freesentation'].map((f) => document.fonts.load(f, '모네'))); } catch (e) { /* noop */ }
  const DISP = 'Paperlogy, Freesentation, sans-serif', BODY = 'Freesentation, sans-serif';
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
  const L = 80, R = W - 80; let y = 250;
  g.fillStyle = '#6B6B68'; g.font = `700 28px ${BODY}`; g.textBaseline = 'alphabetic';
  g.fillText('MONET 100 · The Next Impression · 2026.12.14', L, y); y += 92;
  g.fillStyle = '#111111'; g.font = `800 96px ${DISP}`; g.fillText('나의 네 입장', L, y); y += 104;
  g.fillStyle = POINT; g.fillText('오늘의 관람객', L, y); y += 56;
  // 흐름 기둥(왼쪽 280px) + 줄(오른쪽). 화면과 같은 계획·씨앗
  const FW = 280, TX = L + FW + 40, ROW = 150, GATE = 84, END = 132;
  const gateTop = y, rowsTop = gateTop + GATE;
  g.fillStyle = '#9A9A96'; g.font = `500 24px ${BODY}`; g.textAlign = 'right'; g.fillText(`모네의 방을 나온 사람 ${fmt(VISITORS)}명`, R, gateTop + 58); g.textAlign = 'left';
  const geom = { w: FW, k: 5.4, gate: { x: L + 8, y: gateTop + 10, w: FW - 16, h: GATE - 24 }, rows: rows.map((_, i) => ({ top: rowsTop + i * ROW, h: ROW })), end: { top: rowsTop + rows.length * ROW, h: END } };
  const rand = rng(17);
  const dots = Array.from({ length: N }, () => ({ x: 0, y: 0, a: 0.78 + rand() * 0.2, r: 4.2 * (0.86 + rand() * 0.3) }));
  planFlow(N, N - 1, rand, geom).forEach((s) => s.targets.forEach((p, k) => { if (p) { dots[k].x = p.x; dots[k].y = p.y; } if (s.alpha && s.alpha[k] != null) dots[k].a = s.alpha[k]; }));
  dots.forEach((d, k) => { if (k === N - 1) return; g.fillStyle = `rgba(17,17,17,${d.a.toFixed(2)})`; g.beginPath(); g.arc(d.x, d.y, d.r, 0, 6.2832); g.fill(); });
  const m = dots[N - 1]; g.fillStyle = 'rgba(217,103,47,.22)'; g.beginPath(); g.arc(m.x, m.y, 15, 0, 6.2832); g.fill(); g.fillStyle = POINT; g.beginPath(); g.arc(m.x, m.y, 8, 0, 6.2832); g.fill();
  g.strokeStyle = '#E5E4E0'; g.lineWidth = 2; g.beginPath(); g.moveTo(TX, rowsTop); g.lineTo(R, rowsTop); g.stroke();
  for (const [i, r] of rows.entries()) {
    const t = rowsTop + i * ROW;
    g.fillStyle = '#6B6B68'; g.font = `600 24px ${BODY}`; g.fillText(`${r.st} · ${r.q}`, TX, t + 54);
    g.fillStyle = '#111111'; g.font = `800 40px ${DISP}`; g.fillText(r.val, TX, t + 104);
    g.textAlign = 'right'; g.fillStyle = '#6B6B68'; g.font = `600 26px ${DISP}`; g.fillText(`같은 쪽 ${r.pct}%`, R, t + 104); g.textAlign = 'left';
    g.strokeStyle = '#E5E4E0'; g.beginPath(); g.moveTo(TX, t + ROW); g.lineTo(R, t + ROW); g.stroke();
  }
  const et = geom.end.top;
  g.fillStyle = POINT; g.font = `800 84px ${DISP}`; g.fillText(`${same}%`, TX, et + 78);
  g.fillStyle = '#111111'; g.font = `600 28px ${DISP}`; g.fillText(`나와 같은 길 · ${fmt(sameN)}명`, TX, et + 118);
  y = et + END + 30;
  g.strokeStyle = '#111111'; g.lineWidth = 2; g.beginPath(); g.moveTo(L, y); g.lineTo(R, y); g.stroke(); y += 44;
  const tk = await loadImage($('#ticket').src).catch(() => null);
  if (tk) { const tw = 400, th = tw * tk.naturalHeight / tk.naturalWidth; g.save(); g.translate(L + tw / 2, y + th / 2); g.rotate(-0.02); g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 30; g.shadowOffsetY = 12; g.drawImage(tk, -tw / 2, -th / 2, tw, th); g.restore();
    g.fillStyle = '#6B6B68'; g.font = `500 24px ${BODY}`; g.fillText($('#ticketSub').textContent, L + tw + 30, y + th / 2 + 8); y += th + 40; }
  g.fillStyle = '#9A9A96'; g.font = `500 24px ${BODY}`; g.fillText(`${stampLine(VISITORS)} · 문명탐험가 앱 · 신세계 더 헤리티지`, L, H - 250 - 20);
  shareBlob = await new Promise((r) => c.toBlob(r, 'image/png'));
  return c;
}
$('#share').addEventListener('click', async () => {
  const btn = $('#share'); btn.disabled = true;
  try {
    const c = await render();
    $('#shareImg').src = c.toDataURL('image/png');
    $('#shareOv').hidden = false;
  } catch (e) { console.error(e); toast('이미지를 만들지 못했습니다.'); }
  btn.disabled = false;
});
$('#shareClose').addEventListener('click', () => { $('#shareOv').hidden = true; });
$('#shareGo').addEventListener('click', async () => {
  if (!shareBlob) return;
  const file = new File([shareBlob], 'monet100_나의네입장.png', { type: 'image/png' });
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

window.__exit = { mine, rows, same, sameN, render, start, get crowd() { return crowd; }, get started() { return started; } };
