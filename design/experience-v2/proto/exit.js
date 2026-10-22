// 출구 — 오늘의 관람객 모아 보기(옛 C5 마무리 화면). 질문 없음. 〈인상, 해돋이〉 앞에서 네 곳(C0·C1·C2·C4)의 내 입장과 오늘의 관람객 비율을 모아 본다.
//   조합 5×2×5×2 = 100가지 → "같은 조합 N%". 남는 것은 C2 그해의 기차표 하나. 저장·공유는 기기에서 1080×1920 이미지를 그린다.
//   다른 프로토타입이 localStorage(m100_choice)에 남긴 입장이 있으면 그것을, 없으면 예시 값을 쓴다. 서버는 숫자만(여기서는 예시 수치).
import { toast, loadImage } from '../../../booth/js/common.js';
import { loadChoices, clearChoices } from './js/proto-common.js';

const $ = (s) => document.querySelector(s);
const VISITORS = '3,402';

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
  { st: 'C0 아카데미 살롱', q: '가운데 자리에 걸 한 점', thumb: C0[mine.c0.n].src, val: `${mine.c0.n}번 〈${C0[mine.c0.n].title}〉`, pct: C0[mine.c0.n].pct, real: mine.c0.real },
  { st: 'C1 시민사회', q: '그림이 걸릴 자격은 누가', big: mine.c1.k === 'jury' ? '심' : '보', val: C1[mine.c1.k].label, pct: C1[mine.c1.k].pct, real: mine.c1.real },
  { st: 'C2 산업혁명', q: '어디까지 갈까', thumb: `../ticket/ticket-front-${C2[mine.c2.k].ticket}.png`, val: `${C2[mine.c2.k].label} · ${C2[mine.c2.k].year}년 표`, pct: C2[mine.c2.k].pct, real: mine.c2.real },
  { st: 'C4 나다르 사진관', q: '그림인가 사진인가', big: C4[mine.c4.k].label, val: C4[mine.c4.k].label, pct: C4[mine.c4.k].pct, real: mine.c4.real },
];
const anyReal = Object.values(mine).some((m) => m.real);
$('#todayCap').textContent = `오늘의 관람객 · ${VISITORS}명 · 수치는 예시`;
$('#rows').innerHTML = rows.map((r, i) => `
  <div class="row" style="animation-delay:${i * 90}ms">
    <div class="th">${r.thumb ? `<img src="${r.thumb}" alt="">` : `<b>${r.big}</b>`}</div>
    <div>
      <div class="k"><span>${r.st} · ${r.q}</span><i>${anyReal && !r.real ? '예시' : ''}</i></div>
      <div class="v"><span>${r.val}</span><b>${r.pct}%</b></div>
      <div class="tr"><div class="fl" style="width:${r.pct}%; animation-delay:${i * 90 + 200}ms"></div></div>
    </div>
  </div>`).join('');

// 같은 조합 — 100가지 중 하나. 예시: 네 비율의 곱을 기준으로 결정적 값
const comboKey = `${mine.c0.n}|${mine.c1.k}|${mine.c2.k}|${mine.c4.k}`;
const product = rows.reduce((a, r) => a * r.pct / 100, 1);
const same = Math.max(0.5, Math.round(product * 100 * 10) / 10);
$('#same').innerHTML = `<b>${same}%</b><span>네 입장이 모두 나와 같은 관람객</span><small>100가지 조합 중 하나 · ${comboKey} · 수치는 예시</small>`;

// 남은 것 — C2 기차표
$('#ticket').src = `../ticket/ticket-front-${C2[mine.c2.k].ticket}.png`;
$('#ticketSub').textContent = `파리 생라자르 → ${C2[mine.c2.k].label} · ${C2[mine.c2.k].year} · 2등`;

// 저장 · 공유 — 1080×1920 (위·아래 250px 비움, 좌우 80px). 주황은 세 곳: 제목, 내 막대, 합계 숫자
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
  g.fillStyle = '#D9672F'; g.fillText('오늘의 관람객', L, y); y += 70;
  const thumbs = await Promise.all(rows.map((r) => (r.thumb ? loadImage(r.thumb).catch(() => null) : null)));
  for (const [i, r] of rows.entries()) {
    g.strokeStyle = '#E5E4E0'; g.lineWidth = 2; g.beginPath(); g.moveTo(L, y); g.lineTo(R, y); g.stroke(); y += 34;
    const tx = L + 120;
    const thumb = thumbs[i];
    if (thumb) { g.save(); g.beginPath(); g.roundRect(L, y - 6, 96, 96, 6); g.clip(); const s = Math.max(96 / thumb.naturalWidth, 96 / thumb.naturalHeight); g.drawImage(thumb, L + 48 - thumb.naturalWidth * s / 2, y - 6 + 48 - thumb.naturalHeight * s / 2, thumb.naturalWidth * s, thumb.naturalHeight * s); g.restore(); }
    else { g.fillStyle = '#F5F5F3'; g.beginPath(); g.roundRect(L, y - 6, 96, 96, 6); g.fill(); g.fillStyle = '#111111'; g.font = `800 40px ${DISP}`; g.textAlign = 'center'; g.fillText(r.big, L + 48, y + 56); g.textAlign = 'left'; }
    g.fillStyle = '#6B6B68'; g.font = `700 26px ${BODY}`; g.fillText(`${r.st} · ${r.q}`, tx, y + 18);
    g.fillStyle = '#111111'; g.font = `800 46px ${DISP}`; g.fillText(r.val, tx, y + 74);
    g.textAlign = 'right'; g.fillStyle = '#D9672F'; g.fillText(`${r.pct}%`, R, y + 74); g.textAlign = 'left';
    g.fillStyle = '#ECEBE7'; g.fillRect(tx, y + 98, R - tx, 12);
    g.fillStyle = '#D9672F'; g.fillRect(tx, y + 98, (R - tx) * r.pct / 100, 12);
    y += 140;
  }
  g.strokeStyle = '#111111'; g.lineWidth = 2; g.beginPath(); g.moveTo(L, y); g.lineTo(R, y); g.stroke(); y += 76;
  g.fillStyle = '#D9672F'; g.font = `800 84px ${DISP}`; g.fillText(`${same}%`, L, y);
  g.fillStyle = '#111111'; g.font = `500 30px ${BODY}`; g.fillText('네 입장이 모두 나와 같은 관람객', L + g.measureText(`${same}%`).width + 230, y - 6);
  y += 70;
  const tk = await loadImage($('#ticket').src).catch(() => null);
  if (tk) { const tw = 440, th = tw * tk.naturalHeight / tk.naturalWidth; g.save(); g.translate(L + tw / 2, y + th / 2); g.rotate(-0.02); g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 30; g.shadowOffsetY = 12; g.drawImage(tk, -tw / 2, -th / 2, tw, th); g.restore();
    g.fillStyle = '#6B6B68'; g.font = `500 24px ${BODY}`; g.fillText($('#ticketSub').textContent, L + tw + 30, y + th / 2 + 8); y += th + 40; }
  g.fillStyle = '#9A9A96'; g.font = `500 24px ${BODY}`; g.fillText('문명탐험가 앱 · 신세계 더 헤리티지 · 수치는 예시', L, H - 250 - 20);
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

window.__exit = { mine, rows, same, render };
