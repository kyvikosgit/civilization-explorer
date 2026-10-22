// 출구 시안 C — 전시 도록 한 장. 1874년 리브레처럼 Nº 1–4: 내가 고른 것 · 작가/자리 · 점선 이음 표(오늘의 비율) · Fig.(빗금 띠) · 끼워 붙인 도판(가져가는 것)
//   간기에 "나와 같은 길 7.3% · 94명", 도장(1874–2026)은 눌러서 찍는다. 공유 이미지는 같은 한 장을 1080×1920 종이로
import { clearChoices, reduceMotion } from './js/proto-common.js';
import { STATIONS, VISITORS, same, sameN, anyReal, fmt, stampLine, artThumb, setupShare, drawArt, fontsReady, POINT } from './exit-common.js';

const $ = (s, r = document) => r.querySelector(s);
const ROMAN = ['I', 'II', 'III', 'IV'];
const ROT = ['1.4deg', '-1.1deg', '0.8deg', '-1.6deg'];

// 빗금 띠: 선택지 순서대로 비율 폭, 내 쪽만 주황
function figSVG(s) {
  const W = 300, gap = 2, free = W - gap * (s.opts.length - 1); let x = 0;
  const id = `h-${s.id}`;
  const segs = s.opts.map((o) => { const w = free * o.pct / 100, r = `<rect x="${x.toFixed(1)}" y="2" width="${w.toFixed(1)}" height="12" fill="${o.k === s.me ? POINT : `url(#${id})`}" stroke="${o.k === s.me ? POINT : 'rgba(42,36,28,.75)'}" stroke-width=".8"/>`; x += w + gap; return r; }).join('');
  return `<svg viewBox="0 0 ${W} 16" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="${id}" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="3.2" stroke="rgba(42,36,28,.7)" stroke-width="1"/></pattern></defs>${segs}</svg>`;
}
function tabRows(s) {
  return s.opts.map((o, i) => {
    const me = o.k === s.me, key = s.id === 'c0' ? o.k : String.fromCharCode(97 + i);
    return `<li class="${me ? 'me' : ''}"><span class="k">${me ? '☞ ' : ''}${key}</span><span class="l">${s.id === 'c0' ? (o.full.replace(/^\d번 /, '')) : o.full}</span><span class="ld"></span><span class="v">${o.pct}</span></li>`;
  }).join('');
}
const ROOM_FR = { c0: "Salon de l'Académie", c1: 'Paris, printemps 1874', c2: 'Gare Saint-Lazare', c4: 'Atelier Nadar' };
$('#entries').innerHTML = STATIONS.map((s, i) => `<li class="xc-e" style="--i:${i}">
  <div class="xc-e-hd"><span class="no">Nº ${s.no}</span><span class="room">${ROOM_FR[s.id]}${anyReal && !s.real ? ' · exemple' : ''}</span></div>
  <figure class="xc-plate" style="--rot:${ROT[i]}"><span class="mount">${artThumb(s.art)}</span><figcaption><i>Pl. ${ROMAN[i]}.</i> ${s.art.lb}</figcaption></figure>
  <h3 class="xc-e-t">${s.choice}</h3>
  <p class="xc-e-by">${s.sub}.</p>
  <p class="xc-e-q">${s.room} — ${s.ask}.</p>
  <ul class="xc-tab">${tabRows(s)}</ul>
  <figure class="xc-fig">${figSVG(s)}<figcaption><i>Fig. ${s.no}.</i>오늘의 관람객 ${fmt(VISITORS)}명이 고른 쪽 · 나와 같은 쪽 <b>${s.opt.pct}%</b></figcaption></figure>
</li>`).join('');

// 간기
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const now = new Date();
$('#visN').textContent = fmt(VISITORS);
$('#same').textContent = `${same}%`;
$('#sameN').textContent = `${fmt(sameN)}명`;
$('#coloP').textContent = `네 곳 모두 나와 같은 쪽을 고른 오늘의 관람객. ${stampLine(VISITORS)}.`;
$('#coloFr').textContent = `Achevé d'imprimer à Séoul, le ${now.getDate()} ${MOIS[now.getMonth()]} ${now.getFullYear()}.`;

// 도장 — 누르면 쿵
const seal = $('#seal'), sheet = $('#sheet');
let stamped = false;
seal.addEventListener('click', () => {
  if (stamped) return; stamped = true;
  seal.classList.add('stamped'); seal.setAttribute('aria-label', '도장 1874–2026');
  if (!reduceMotion) setTimeout(() => { sheet.classList.remove('thud'); void sheet.offsetWidth; sheet.classList.add('thud'); try { navigator.vibrate && navigator.vibrate(24); } catch (e) { /* noop */ } }, 380);
});

// ── 저장 · 공유 — 같은 한 장을 1080×1920 종이로
function paper(g, W, H) {
  g.fillStyle = '#F4EEE1'; g.fillRect(0, 0, W, H);
  let s = 9; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(${90 + r() * 40},${70 + r() * 30},${30 + r() * 20},${(r() * 0.07).toFixed(3)})`; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
  const v = g.createRadialGradient(W / 2, H * 0.42, H * 0.35, W / 2, H * 0.45, H * 0.78); v.addColorStop(0, 'rgba(120,85,35,0)'); v.addColorStop(1, 'rgba(120,85,35,.2)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  [[0.88 * W, 0.06 * H, 60], [0.1 * W, 0.6 * H, 34]].forEach(([x, y, rr]) => { const f = g.createRadialGradient(x, y, 0, x, y, rr); f.addColorStop(0, 'rgba(160,110,40,.12)'); f.addColorStop(1, 'rgba(160,110,40,0)'); g.fillStyle = f; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); });
}
function drawSeal(g, cx, cy, R) {
  const c = document.createElement('canvas'); c.width = c.height = R * 2 + 20; const s = c.getContext('2d'), o = R + 10;
  s.strokeStyle = s.fillStyle = POINT;
  s.lineWidth = R * 0.05; s.beginPath(); s.arc(o, o, R * 0.94, 0, 6.2832); s.stroke();
  s.lineWidth = R * 0.016; s.beginPath(); s.arc(o, o, R * 0.86, 0, 6.2832); s.stroke(); s.beginPath(); s.arc(o, o, R * 0.56, 0, 6.2832); s.stroke();
  const txt = 'MONET 100 · THE NEXT IMPRESSION · '; s.font = `700 ${R * 0.15}px "Old Standard TT", Georgia, serif`; s.textAlign = 'center'; s.textBaseline = 'middle';
  for (let i = 0; i < txt.length; i++) { const a = -Math.PI / 2 + (i / txt.length) * 6.2832; s.save(); s.translate(o + Math.cos(a) * R * 0.71, o + Math.sin(a) * R * 0.71); s.rotate(a + Math.PI / 2); s.fillText(txt[i], 0, 0); s.restore(); }
  s.font = `900 ${R * 0.3}px "Playfair Display", Georgia, serif`; s.fillText('1874', o, o - R * 0.15); s.fillText('2026', o, o + R * 0.3);
  s.lineWidth = R * 0.016; s.beginPath(); s.moveTo(o - R * 0.3, o + R * 0.04); s.lineTo(o + R * 0.3, o + R * 0.04); s.stroke();
  // 잉크가 덜 묻은 자리
  s.globalCompositeOperation = 'destination-out'; let k = 3; const r = () => { k = (k * 16807) % 2147483647; return k / 2147483647; };
  for (let i = 0; i < 900; i++) { s.globalAlpha = r() * 0.6; s.beginPath(); s.arc(r() * c.width, r() * c.height, r() * R * 0.025, 0, 6.2832); s.fill(); }
  s.globalAlpha = 0.5; [[0.3, 0.2, 0.08], [0.75, 0.7, 0.06]].forEach(([x, y, rr]) => { s.beginPath(); s.arc(c.width * x, c.height * y, R * rr, 0, 6.2832); s.fill(); });
  g.save(); g.translate(cx, cy); g.rotate(-0.24); g.globalAlpha = 0.88; g.globalCompositeOperation = 'multiply'; g.drawImage(c, -o, -o); g.restore();
}
async function render() {
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); await fontsReady();
  const INK = '#2A241C', DIM = 'rgba(42,36,28,.62)', SERIF = '"Old Standard TT", Georgia, serif', DID = '"Playfair Display", Georgia, serif', D = 'Paperlogy, Freesentation, sans-serif', B = 'Freesentation, sans-serif';
  paper(g, W, H);
  g.strokeStyle = 'rgba(42,36,28,.25)'; g.lineWidth = 2; g.strokeRect(44, 44, W - 88, H - 88); g.lineWidth = 1; g.strokeRect(54, 54, W - 108, H - 108);
  g.textAlign = 'center'; g.textBaseline = 'alphabetic'; const cx = W / 2;
  const sp = (px) => { try { g.letterSpacing = px; } catch (e) { /* noop */ } };
  g.fillStyle = DIM; g.font = `400 24px ${SERIF}`; sp('7px'); g.fillText('MONET 100 · THE NEXT IMPRESSION', cx, 190); sp('0px');
  g.fillStyle = INK; g.fillRect(cx - 70, 222, 140, 2); g.fillRect(cx - 70, 229, 140, 2);
  g.font = `900 112px ${DID}`; sp('8px'); g.fillText('CATALOGUE', cx + 4, 352); sp('0px');
  g.font = `italic 400 34px ${SERIF}`; g.fillText('des ouvrages choisis par un visiteur', cx, 412);
  g.font = `600 34px ${D}`; g.fillText('한 관람객이 고른 것들의 도록', cx, 476);
  g.fillRect(cx - 60, 528, 40, 1.5); g.fillRect(cx + 20, 528, 40, 1.5); g.save(); g.translate(cx, 528); g.rotate(Math.PI / 4); g.fillRect(-6, -6, 12, 12); g.restore();
  g.fillStyle = DIM; g.font = `400 22px ${SERIF}`; sp('7px'); g.fillText('PARIS, 1874 — SÉOUL, 2026', cx, 590); sp('0px');
  // 단 머리
  let y = 660; g.textAlign = 'left'; g.fillStyle = INK; g.font = `400 22px ${SERIF}`; sp('5px'); g.fillText('OUVRAGES CHOISIS', 96, y); const hw = g.measureText('OUVRAGES CHOISIS').width; sp('0px');
  g.fillRect(96 + hw + 20, y - 8, W - 96 * 2 - hw - 20, 2);
  y += 24;
  const EH = 222;
  for (let i = 0; i < 4; i++) {
    const s = STATIONS[i], top = y + i * EH;
    if (i) { g.fillStyle = 'rgba(42,36,28,.2)'; g.fillRect(96, top, W - 192, 1.5); }
    g.fillStyle = INK; g.font = `900 46px ${DID}`; g.fillText(`Nº ${s.no}`, 96, top + 64);
    g.fillStyle = DIM; g.font = `italic 400 24px ${SERIF}`; g.fillText(ROOM_FR[s.id], 236, top + 60);
    g.fillStyle = INK; g.font = `800 ${s.choice.length > 9 ? 40 : 48}px ${D}`; g.fillText(s.choice, 96, top + 124);
    g.fillStyle = DIM; g.font = `500 24px ${B}`; g.fillText(`${s.sub}.`, 96, top + 160);
    // Fig. 빗금 띠
    const FW = 520, gap = 4, free = FW - gap * (s.opts.length - 1); let x = 96;
    s.opts.forEach((o) => {
      const w = free * o.pct / 100, yy = top + 180, h = 20;
      if (o.k === s.me) { g.fillStyle = POINT; g.fillRect(x, yy, w, h); }
      else { g.save(); g.beginPath(); g.rect(x, yy, w, h); g.clip(); g.strokeStyle = 'rgba(42,36,28,.7)'; g.lineWidth = 1.6; for (let k = -h; k < w; k += 6) { g.beginPath(); g.moveTo(x + k, yy + h); g.lineTo(x + k + h, yy); g.stroke(); } g.restore(); g.strokeStyle = 'rgba(42,36,28,.75)'; g.lineWidth = 1.2; g.strokeRect(x, yy, w, h); }
      x += w + gap;
    });
    g.fillStyle = POINT; g.font = `800 34px ${D}`; g.fillText(`${s.opt.pct}%`, 96 + FW + 18, top + 200);
    // 도판
    const px = 790, py = top + 26, S = 150;
    g.save(); g.translate(px + S / 2, py + S * 0.65); g.rotate([0.024, -0.02, 0.014, -0.028][i]); g.translate(-(px + S / 2), -(py + S * 0.65));
    g.shadowColor = 'rgba(60,40,10,.22)'; g.shadowBlur = 18; g.shadowOffsetY = 8; g.fillStyle = '#FBF8F0'; g.fillRect(px - 12, py - 12, S + 24, S * 1.2 + 24); g.shadowColor = 'transparent';
    await drawArt(g, s.art, px + (s.art.kind === 'carte' ? S * 0.11 : 0), py, S);
    g.fillStyle = 'rgba(232,222,196,.85)'; g.fillRect(px + S * 0.22, py - 20, S * 0.56, 18);
    g.restore();
  }
  // 간기
  y = y + 4 * EH + 20;
  g.fillStyle = INK; g.fillRect(96, y, W - 192, 2); g.fillRect(96, y + 7, W - 192, 2);
  g.textAlign = 'center'; g.fillRect(cx - 60, y + 56, 40, 1.5); g.fillRect(cx + 20, y + 56, 40, 1.5); g.save(); g.translate(cx, y + 56); g.rotate(Math.PI / 4); g.fillRect(-6, -6, 12, 12); g.restore();
  g.font = `600 36px ${D}`; const a = '나와 같은 길 ', b = `${same}%`, d = ` · ${fmt(sameN)}명`;
  g.font = `600 36px ${D}`; const wa = g.measureText(a).width, wd = g.measureText(d).width; g.font = `800 52px ${D}`; const wb = g.measureText(b).width;
  let x0 = cx - (wa + wb + wd) / 2; g.textAlign = 'left';
  g.font = `600 36px ${D}`; g.fillText(a, x0, y + 128); g.fillStyle = POINT; g.font = `800 52px ${D}`; g.fillText(b, x0 + wa, y + 128); g.fillStyle = INK; g.font = `600 36px ${D}`; g.fillText(d, x0 + wa + wb, y + 128);
  g.textAlign = 'center'; g.fillStyle = DIM; g.font = `500 24px ${B}`; g.fillText(`네 곳 모두 나와 같은 쪽을 고른 오늘의 관람객 · ${stampLine(VISITORS)}`, cx, y + 174);
  g.font = `italic 400 24px ${SERIF}`; g.fillText($('#coloFr').textContent, cx, y + 212);
  drawSeal(g, W - 175, y - 34, 88);
  return c;
}
setupShare($('#share'), render, 'monet100_도록.png');
$('#restart').addEventListener('click', () => { clearChoices(); location.href = 'index.html'; });

window.__exitC = { render, get stamped() { return stamped; } };
