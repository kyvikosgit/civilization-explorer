// 출구 시안 B — 관람 기록 카드. 표지 → 네 곳(한 장씩: 큰 그림 · 내 선택 · "오늘 39%가 같았다" · 점 128개) → 모아 보기(나와 같은 길 · 가져가는 것)
//   위로 넘기면 한 장씩 스냅, 카드를 누르면 다음 장. 점 하나 = 열 사람, 같은 쪽을 고른 점이 왼쪽부터 켜지고 내 점은 주황(맨 끝)
import { clearChoices, reduceMotion } from './js/proto-common.js';
import { rng } from './js/crowd.js';
import { STATIONS, ARTS, VISITORS, same, sameN, anyReal, fmt, stampLine, posterHTML, artThumb, setupShare, loadImg, cover, drawPoster, fontsReady, POINT } from './exit-common.js';

const $ = (s, r = document) => r.querySelector(s);
const deck = $('#deck'), sum = $('#sum');
const DOTS = Math.round(VISITORS / 10), COLS = 32;

// ── 네 곳 카드
function figHTML(s) {
  if (s.id === 'c1') {
    const other = !s.expo;
    return `<figure class="xb-fig wall ln" style="--d:2"><span class="cap">${s.expo ? '카퓌신 대로 35번지 · 재현' : '샹젤리제 궁 · 재현'}</span>${posterHTML(other, 'other')}${posterHTML(s.expo, 'mine')}</figure>`;
  }
  const pos = s.pos || (s.id === 'c0' ? '50% 28%' : '50% 50%');
  return `<figure class="xb-fig ln" style="--d:2"><img class="bg" src="${s.img}" alt="" style="object-position:${pos}">`
    + (s.id === 'c0' ? '<span class="medal">1873</span>' : '')
    + (s.id === 'c2' ? `<span class="cap">모네 〈${s.cap}〉</span><img class="tk" src="${s.ticket}" alt="">` : '')
    + '</figure>';
}
const cards = STATIONS.map((s, i) => {
  const el = document.createElement('section');
  el.className = 'xb-card st'; el.dataset.tone = 'dark';
  el.innerHTML = `<div class="xb-in">
    <div class="xb-meta ln" style="--d:0"><span><b>0${s.no}</b> / 04</span><span>${s.room}${anyReal && !s.real ? ' · 예시' : ''}</span></div>
    <p class="xb-q ln" style="--d:1">${s.ask}</p>
    ${figHTML(s)}
    <h2 class="xb-choice ln" style="--d:3">${s.choice}</h2>
    <p class="xb-sub ln" style="--d:3">${s.sub}</p>
    <div class="xb-stat ln" style="--d:4"><span class="pre">오늘</span><b>${s.opt.pct}<i>%</i></b><span class="post">가 같았다</span></div>
    <canvas class="xb-dots ln" style="--d:5" aria-hidden="true"></canvas>
    <p class="xb-others ln" style="--d:6">점 하나 = 열 사람 · 다른 쪽 ${s.others.map((o) => `${o.lab} <b>${o.pct}</b>`).join(' · ')}</p>
  </div>`;
  deck.insertBefore(el, sum);
  return { el, s, cv: $('canvas', el), t0: 0 };
});

// 점 128개: 32 × 4, 세로로 먼저 채운다(왼쪽부터 쌓이는 막대처럼). 켜진 점 = 같은 쪽, 마지막 켜진 점이 나
function drawDots(c, p) {
  const cv = c.cv, r = cv.getBoundingClientRect(); if (!r.width) return;
  const dpr = Math.min(2, devicePixelRatio || 1); if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
  const rows = Math.ceil(DOTS / COLS), sx = r.width / COLS, sy = r.height / rows, rad = Math.min(sx, sy) * 0.27;
  const lit = Math.max(1, Math.round(DOTS * c.s.opt.pct / 100)), shown = Math.round(lit * p);
  for (let i = 0; i < DOTS; i++) {
    const col = Math.floor(i / rows), row = i % rows, x = (col + 0.5) * sx, y = (row + 0.5) * sy;
    if (i === lit - 1 && p >= 1) continue;
    g.fillStyle = i < shown ? 'rgba(255,247,234,.92)' : 'rgba(255,255,255,.14)';
    g.beginPath(); g.arc(x, y, rad, 0, 6.2832); g.fill();
  }
  if (p >= 1) {
    const i = lit - 1, x = (Math.floor(i / rows) + 0.5) * sx, y = (i % rows + 0.5) * sy;
    g.fillStyle = 'rgba(217,103,47,.28)'; g.beginPath(); g.arc(x, y, rad * 2.6, 0, 6.2832); g.fill();
    g.fillStyle = POINT; g.beginPath(); g.arc(x, y, rad * 1.5, 0, 6.2832); g.fill();
  }
}
function playDots(c) {
  if (reduceMotion) { drawDots(c, 1); return; }
  const t0 = performance.now() + 520, dur = 1100;
  const tick = (now) => { const p = Math.min(1, Math.max(0, (now - t0) / dur)); drawDots(c, 1 - Math.pow(1 - p, 2)); if (p < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

// ── 모아 보기
$('#sameBig').textContent = same;
$('#sameLab').innerHTML = `${fmt(VISITORS)}명 가운데 ${fmt(sameN)}명이<br>네 곳 모두 나와 같은 쪽을 골랐다<small>100가지 길 가운데 하나 · 점 하나 = 열 사람</small>`;
$('#introN').textContent = `${fmt(VISITORS)}명`;
$('#sumStamp').textContent = stampLine(VISITORS).replace(' · 수치는 예시', '');
$('#sumList').innerHTML = STATIONS.map((s) => `<li><span class="n">0${s.no}</span><span class="c"><small>${s.q}</small>${s.choice}</span><em>${s.opt.pct}%</em></li>`).join('');
$('#tray').innerHTML = ARTS.map((a) => `<div class="it">${artThumb(a)}<span><b>${a.lb}</b>${a.t}</span></div>`).join('');

// 표지의 군중(128점) · 모아 보기의 점(같은 길 = 9점 남짓이 흩어져 켜진다)
{ const r = rng(3); $('#introDots').innerHTML = Array.from({ length: DOTS }, (_, i) => `<i${i === 87 ? ' class="me"' : ''} style="--t:${(0.1 + r() * 0.9).toFixed(2)}s"></i>`).join(''); }
const sumCv = $('#sumDots');
function drawSum() {
  const r = sumCv.getBoundingClientRect(); if (!r.width) return;
  const dpr = Math.min(2, devicePixelRatio || 1); sumCv.width = Math.round(r.width * dpr); sumCv.height = Math.round(r.height * dpr);
  const g = sumCv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rows = Math.ceil(DOTS / COLS), sx = r.width / COLS, sy = r.height / rows, rad = Math.min(sx, sy) * 0.27;
  const lit = Math.max(1, Math.round(DOTS * same / 100)), rr = rng(41), pick = new Set(); while (pick.size < lit) pick.add(Math.floor(rr() * DOTS));
  const me = [...pick][0];
  for (let i = 0; i < DOTS; i++) {
    const x = (i % COLS + 0.5) * sx, y = (Math.floor(i / COLS) + 0.5) * sy;
    if (i === me) { g.fillStyle = 'rgba(217,103,47,.25)'; g.beginPath(); g.arc(x, y, rad * 2.6, 0, 6.2832); g.fill(); g.fillStyle = POINT; g.beginPath(); g.arc(x, y, rad * 1.5, 0, 6.2832); g.fill(); continue; }
    g.fillStyle = pick.has(i) ? '#111' : 'rgba(17,17,17,.12)'; g.beginPath(); g.arc(x, y, rad, 0, 6.2832); g.fill();
  }
}

// ── 넘기기 · 진행 막대
const all = [...deck.querySelectorAll('.xb-card')];
const prog = $('#prog'), vsw = $('#vsw');
prog.innerHTML = all.map(() => '<i></i>').join('');
let cur = -1;
function setCur(i) {
  if (i === cur) return; cur = i;
  all.forEach((el, k) => el.classList.toggle('on', k === i));
  [...prog.children].forEach((b, k) => b.classList.toggle('done', k <= i));
  const tone = all[i].dataset.tone;
  prog.classList.toggle('on-light', tone === 'light'); prog.classList.toggle('on-point', tone === 'point');
  vsw.classList.toggle('light', tone === 'light');
  const c = cards.find((x) => x.el === all[i]); if (c) playDots(c);
  if (all[i] === sum) drawSum();
}
const io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting && e.intersectionRatio > 0.55) setCur(all.indexOf(e.target)); }); }, { root: deck, threshold: [0.55, 0.8] });
all.forEach((el) => io.observe(el));
function go(i) { i = Math.max(0, Math.min(all.length - 1, i)); deck.scrollTo({ top: all[i].offsetTop, behavior: reduceMotion ? 'auto' : 'smooth' }); }
deck.addEventListener('click', (e) => { if (e.target.closest('button, a')) return; if (cur < all.length - 1) go(cur + 1); });
addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); go(cur + 1); } if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); go(cur - 1); } });
addEventListener('resize', () => { cards.forEach((c) => drawDots(c, c.el.classList.contains('on') ? 1 : 0)); });
setCur(0);

// ── 저장 · 공유 — 1080×1920: 제목 → 네 곳 2×2(그림 · 내 선택 · n%가 같았다) → 나와 같은 길. 위·아래 220 비움
async function render() {
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); await fontsReady();
  const D = 'Paperlogy, Freesentation, sans-serif', B = 'Freesentation, sans-serif', L = 80;
  g.fillStyle = '#121110'; g.fillRect(0, 0, W, H);
  // 위 주황 띠
  g.fillStyle = POINT; g.fillRect(0, 0, W, 196);
  g.fillStyle = '#111'; g.font = `700 28px ${B}`; g.textBaseline = 'alphabetic';
  g.fillText('MONET 100 · The Next Impression', L, 120); g.textAlign = 'right'; g.fillText('2026.12.14', W - L, 120); g.textAlign = 'left';
  let y = 330;
  g.fillStyle = '#fff'; g.font = `800 112px ${D}`; g.fillText('나의 관람 기록', L - 6, y);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.font = `500 32px ${B}`; g.fillText(`모네의 방 네 곳에서 고른 것 · 오늘의 관람객 ${fmt(VISITORS)}명 사이에서`, L, y + 62);
  // 2×2
  const gw = 448, gh = 520, gx = [L, W - L - gw], gy = [y + 110, y + 110 + gh + 24];
  for (let i = 0; i < 4; i++) {
    const s = STATIONS[i], x = gx[i % 2], yy = gy[Math.floor(i / 2)], ih = 300;
    if (s.id === 'c1') {
      g.fillStyle = '#211E1B'; g.fillRect(x, yy, gw, ih);
      g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 30; g.shadowOffsetY = 12; const pw = 190, ph = 228;
      g.fillStyle = '#000'; g.fillRect(x + (gw - pw) / 2, yy + (ih - ph) / 2, pw, ph); g.restore();
      drawPoster(g, x + (gw - pw) / 2, yy + (ih - ph) / 2, pw, ph, s.expo);
    } else {
      const img = await loadImg(s.img); cover(g, img, x, yy, gw, ih, s.pos || (s.id === 'c0' ? '50% 28%' : '50% 50%'));
      if (s.id === 'c0') { g.fillStyle = '#E7C46C'; g.beginPath(); g.arc(x + gw - 52, yy + ih - 52, 30, 0, 6.2832); g.fill(); g.strokeStyle = '#3B2A12'; g.lineWidth = 3; g.stroke(); }
      if (s.id === 'c2') { const t = await loadImg(s.ticket); if (t) { g.save(); g.translate(x + 24, yy + ih - 140); g.rotate(-0.08); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 20; g.drawImage(t, 0, 0, 250, 250 * t.naturalHeight / t.naturalWidth); g.restore(); } }
    }
    g.fillStyle = POINT; g.font = `800 26px ${D}`; g.fillText(`0${s.no}`, x, yy + ih + 52);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.font = `600 26px ${D}`; g.fillText(s.q, x + 50, yy + ih + 52);
    g.fillStyle = '#fff'; g.font = `800 ${s.choice.length > 9 ? 40 : 50}px ${D}`; g.fillText(s.choice, x, yy + ih + 118);
    g.fillStyle = POINT; g.font = `800 64px ${D}`; const pt = `${s.opt.pct}%`; g.fillText(pt, x, yy + ih + 200);
    const pw = g.measureText(pt).width; g.fillStyle = '#fff'; g.font = `800 32px ${D}`; g.fillText('가 같았다', x + pw + 10, yy + ih + 198);
  }
  // 나와 같은 길
  const by = gy[1] + gh + 10;
  g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(L, by, W - L * 2, 2);
  g.fillStyle = POINT; g.font = `800 150px ${D}`; g.fillText(`${same}%`, L - 6, by + 160);
  const sw = g.measureText(`${same}%`).width;
  g.fillStyle = '#fff'; g.font = `800 40px ${D}`; g.fillText('나와 같은 길', L + sw + 30, by + 96);
  g.fillStyle = 'rgba(255,255,255,.6)'; g.font = `600 30px ${B}`; g.fillText(`${fmt(sameN)}명 · 네 곳 모두 같은 쪽`, L + sw + 30, by + 146);
  g.fillStyle = 'rgba(255,255,255,.4)'; g.font = `500 24px ${B}`; g.fillText(`${stampLine(VISITORS)} · 문명탐험가 앱 · 신세계 더 헤리티지`, L, H - 120);
  return c;
}
setupShare($('#share'), render, 'monet100_관람기록.png');
$('#restart').addEventListener('click', () => { clearChoices(); location.href = 'index.html'; });

window.__exitB = { go, get cur() { return cur; }, render, cards: all.length };
