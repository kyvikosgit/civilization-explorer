// 출구 시안 E — 큰 선택과 작은 선택(라이프 이즈 스트레인지의 에피소드 끝 통계처럼)
//   큰 선택(가치 판단) 둘 — C1 "어느 전시를 보러 가시겠습니까?"(살롱 / 화가들의 전시) · C4 "사람을 남긴다면, 그림입니까 사진입니까?"(그림으로 / 사진으로) — 를 한 화면씩.
//     질문 → 그 방의 물건(포스터 둘 · 고른 쪽 얼굴 다섯) → 내 선택 → 결론 한 문장 → 같은 눈금 막대(1874 · 오늘, 내 쪽은 오늘 막대에만 주황 테 + 나) → 근거. 옳고 그름은 말하지 않는다.
//   출구는 늘 멈춘 화면 — 불 켜기 · 미끄러지는 큰 글자 · 차례로 드러나기 · 숫자 세기 · 벌어지는 막대 · 시차 없이, 모든 내용이 처음부터 그 자리에 있다.
//   작은 선택(C0 메달 · C2 행선지)은 흰 쟁반 "그 밖에 고른 것"으로 작게. → 가져가는 것 다섯 → 저장·공유(1080×1920, 같은 위계, 위·아래 250px 비움).
//   "나와 같은 길 %" · 조합 통계는 쓰지 않는다. 선택 · 예시 비율 · localStorage 읽기는 exit-common.js. 오늘의 비율은 점 대신 두 쪽의 폭(= 비율)과 큰 숫자.
//   비교는 같은 눈금의 가로 막대 두 줄(왼쪽 살롱 · 오른쪽 독립 전시, 두 줄 순서 같음): 1874 · 오늘. 위에 결론 한 문장(데이터로 만듦), 아래 근거 작은 글자.
//     1874 관람객 — 독립 전시 약 3,500명(Rewald 1973, p.318 · Sotheby's 2024 등 같은 값). 살롱은 기록마다 30만(유료 입장) · 40만 · 50만으로 달라
//     "수십만 명"으로만 적고, 막대는 가장 적은 30만 명으로 잡아 그린다(그래도 독립 전시는 1% 남짓). C4 는 1874년 수치가 없어 오늘 막대 한 줄만.
import { clearChoices } from './js/proto-common.js';
import { STATIONS, C1, C4, C4_FACES, VISITORS, POINT, anyReal, fmt, stampLine, posterHTML, setupShare, fontsReady, loadImg, cover, drawArt } from './exit-common.js';
import { mountKeep } from './exit-keep.js';

const $ = (s, r = document) => r.querySelector(s);
const S = Object.fromEntries(STATIONS.map((s) => [s.id, s]));
const ex = (s) => (anyReal && !s.real ? ' · 예시' : '');
const exTag = (s) => (anyReal && !s.real ? '<span class="ex">예시</span>' : '');

// ── 큰 선택 두 장의 내용
// 1874년 봄 관람객 — 막대는 살롱을 가장 적게 잡은 값(30만 명)으로 그린다
const SALON_LOW = 300000, EXPO_1874 = 3500;
const p1874 = { viewer: EXPO_1874 / (SALON_LOW + EXPO_1874) * 100 };
p1874.jury = 100 - p1874.viewer;
const MAJOR = [
  { el: '#ch1', st: S.c1, cmp: '#cmp1', me: '#me1', sub: '#sub1', room: '#room1', q: '어느 전시를 보러 가시겠습니까?',
    cols: Object.keys(C1).map((k) => ({ k, lab: C1[k].short })),
    then: { yr: '1874', p: p1874, lab: { jury: '99%', viewer: '1%' } },
    head: (me, o) => (me === 'viewer'
      ? `1874년엔 100명 중 1명꼴로 찾던 전시를,\n오늘은 ${o.pct}명이 골랐습니다.`
      : `1874년엔 거의 모두가 찾던 살롱을,\n오늘은 100명 중 ${o.pct}명이 골랐습니다.`),
    basis: [
      '1874년 봄 관람객 · 독립 전시 약 3,500명, 살롱 수십만 명(기록마다 30만~50만)',
      '막대는 살롱을 30만 명으로만 잡은 값, 그래도 독립 전시는 1% 남짓',
    ],
    src: 'Rewald, The History of Impressionism(1973) · Sotheby’s(2024) · 워싱턴\u00a0국립미술관(2024)' },
  { el: '#ch2', st: S.c4, cmp: '#cmp2', me: '#me2', sub: '#sub2', room: '#room2', q: '사람을 남긴다면, 그림입니까 사진입니까?',
    cols: Object.keys(C4).map((k) => ({ k, lab: C4[k].full })),
    then: null,                                                     // 1874년 수치 없음 — 오늘 한 줄만
    head: (me, o, other) => `오늘은 100명 중 ${o.pct}명이 나처럼 ${C4[me].full},\n${other.pct}명이 ${C4[other.k].full} 남기겠다고 했습니다.`,
    basis: [],
    note: { label: '1874년 4월', lines: ['나다르는 자기 사진관을 화가들에게 전시장으로 내주었다.', '보들레르는 1859년 살롱평에서 사진 산업을 예술의 “가장 치명적인 적”이라 썼다.'],
      src: 'Wikipedia · Nadar · BnF · Wikisource · Baudelaire, Salon de 1859' } },
];
MAJOR.forEach((m) => {
  const s = m.st; m.headline = m.head(s.me, s.opt, s.others[0]);
  m.basis.push(`오늘 · 관람객 ${fmt(VISITORS)}명의 선택`);
  if (m.src) m.basis.push(m.src);
});

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
  // 같은 눈금의 가로 막대 — 왼쪽 · 오른쪽 순서는 선택지 순서 그대로(두 줄 모두). 내 쪽 표시는 오늘 막대에만
  const [L, R] = m.cols;
  const pctTxt = (t) => `<span>${t.replace(/%$/, '<i>%</i>')}</span>`;
  const seg = (c, p, lab, me) => `<span class="sg ${c === L ? 'l' : 'r'}${me ? ' me' : ''}" style="--p:${p}">${lab ? `<b>${pctTxt(lab)}${me ? '<em>나</em>' : ''}</b>` : ''}</span>`;
  const row = (yr, segs, cls, aria, tail = '') => `<div class="xe-br ${cls}" role="img" aria-label="${aria}"><span class="yr">${yr}</span><div class="trk">${segs}${tail}</div></div>`;
  const today = s.opts.map((o) => ({ c: m.cols.find((c) => c.k === o.k), o }));
  let rows = '';
  if (m.then) {
    const t = m.then;
    // 1874: 오른쪽 몫은 글자가 들어가지 않을 만큼 가늘어, 그 숫자는 가는 띠 바로 왼쪽에 오른쪽 색으로
    rows += row(t.yr, `${seg(L, t.p[L.k], t.lab[L.k], false)}${seg(R, t.p[R.k], '', false)}`, 'then',
      `${t.yr}년: ${L.lab} ${t.lab[L.k]}, ${R.lab} ${t.lab[R.k]}`, `<b class="tail">${pctTxt(t.lab[R.k])}</b>`);
  }
  rows += row('오늘', today.map(({ c, o }) => seg(c, o.pct, `${o.pct}%`, o.k === s.me)).join(''), 'now' + (m.then ? '' : ' solo'),
    `오늘: ${today.map(({ c, o }) => `${c.lab} ${o.pct}%${o.k === s.me ? '(나)' : ''}`).join(', ')}`);
  const note = m.note ? `<div class="xe-note"><div class="xe-rl">${m.note.label}</div>${m.note.lines.map((l) => `<p class="xe-then-line">${l}</p>`).join('')}<div class="xe-src">${m.note.src}</div></div>` : '';
  $(m.cmp).innerHTML = `<p class="xe-hl">${m.headline.replace('\n', '<br>')}</p>`
    + `<div class="xe-bars${m.then ? '' : ' solo'}"><div class="xe-heads"><span>${L.lab}</span><span>${R.lab}</span></div>${rows}</div>`
    + `<ul class="xe-basis">${m.basis.map((b) => `<li>${b}</li>`).join('')}</ul>${note}`;
});

// ── 작은 선택 — 흰 쟁반의 작은 카드 둘
const c0 = S.c0, c2 = S.c2;
$('#minorCards').innerHTML = `
  <article class="xe-mc rv"><div class="th medal"><img src="${c0.img}" alt=""><i class="x-medal"></i></div>
    <div class="tx"><small>메달을 준 그림${ex(c0)}</small><b>${c0.choice}</b><span>오늘 <em>${c0.opt.pct}%</em>가 같은 그림</span></div></article>
  <article class="xe-mc rv"><div class="th trip"><img class="pc" src="${c2.img}" alt=""><img class="tk" src="${c2.ticket}" alt=""></div>
    <div class="tx"><small>행선지${ex(c2)}</small><b>${c2.choice} · ${c2.sub.split(' · ')[0]}</b><span>오늘 <em>${c2.opt.pct}%</em>가 ${c2.choicePlain}</span></div></article>`;

// ── 처음부터 다 보인 모습 — 숫자는 마지막 값, 두 쪽은 비율대로 벌어진 폭, 바탕 · 제목은 그 자리에
document.querySelectorAll('.rv').forEach((el) => el.classList.add('in'));
MAJOR.forEach((m) => { $(m.el).classList.add('on', 'done'); });

// ── 가져가는 것 다섯 — 탁자 위의 물건(exit-keep.js): 기차표 · 엽서 · 메달 카드 · 전시 포스터 · 사진관 카드. 아래 "모두 한 장으로 저장"은 그 탁자 1080×1920
// C4 바탕 — 그 방 벽의 얼굴들(고른 쪽)
$('#bd2').innerHTML = C4_FACES.slice(0, 12).map((id) => `<img src="img/c4p/${id}-${k4}.jpg" alt="" decoding="async">`).join('');
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
  g.fillStyle = 'rgba(255,255,255,.55)'; g.font = `600 24px ${D}`; g.fillText('나는', x, y + 132);
  g.fillStyle = '#fff'; g.font = `800 74px ${D}`; g.fillText(s.choice, x - 3, y + 204);
  let cy = y + 230;
  g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x, cy, W, 2);
  // 결론 한 문장
  g.fillStyle = '#fff'; g.font = `800 32px ${D}`;
  m.headline.split('\n').forEach((part) => wrapKo(g, part, W).forEach((ln) => { cy += 46; g.fillText(ln, x, cy); }));
  // 같은 눈금의 가로 막대 — 화면과 같은 짜임(왼쪽 짙은 회색 · 오른쪽 놋쇠빛, 내 쪽은 오늘 막대에만 주황 테 + 나)
  const XL = '#3D3934', XR = '#8A7A5C', yw = 92, tx0 = x + yw, tw = W - yw, bh = 56, g2 = 4;
  cy += 46; g.font = `600 23px ${D}`; g.fillStyle = 'rgba(255,255,255,.6)';
  const [Lc, Rc] = m.cols;
  g.fillText(Lc.lab, tx0, cy); g.textAlign = 'right'; g.fillText(Rc.lab, x + W, cy); g.textAlign = 'left';
  const bar = (yr, parts, then) => {
    const by = cy + 12;
    g.fillStyle = then ? 'rgba(255,255,255,.62)' : '#fff'; g.font = `700 25px ${D}`; g.fillText(yr, x, by + bh / 2 + 9);
    let bx = tx0;
    parts.forEach((p, j) => {
      const w = Math.max(5, (tw - g2) * p.p / 100);
      g.fillStyle = j ? XR : XL; rrect(g, bx, by, w, bh, Math.min(10, w / 2)); g.fill();
      if (p.me) { g.strokeStyle = POINT; g.lineWidth = 4; rrect(g, bx + 2, by + 2, w - 4, bh - 4, 8); g.stroke(); }
      if (p.lab) {
        g.font = `800 ${p.me ? 38 : then ? 28 : 32}px ${D}`; g.fillStyle = p.me ? '#fff' : then ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.82)';
        const tw2 = g.measureText(p.lab).width, tagW = p.me ? 54 : 0, tx = j ? bx + w - 20 - tw2 - tagW : bx + 20;
        g.fillText(p.lab, tx, by + bh / 2 + 13);
        if (p.me) { g.fillStyle = POINT; rrect(g, tx + tw2 + 10, by + bh / 2 - 17, 44, 34, 17); g.fill(); g.fillStyle = '#fff'; g.font = `800 22px ${D}`; g.textAlign = 'center'; g.fillText('나', tx + tw2 + 32, by + bh / 2 + 8); g.textAlign = 'left'; }
      }
      if (p.tail) { g.font = `800 28px ${D}`; g.fillStyle = '#CDB98F'; g.textAlign = 'right'; g.fillText(p.tail, x + W - 26, by + bh / 2 + 10); g.textAlign = 'left'; }
      bx += w + g2;
    });
    cy = by + bh;
  };
  if (m.then) bar(m.then.yr, [{ p: m.then.p[Lc.k], lab: m.then.lab[Lc.k] }, { p: m.then.p[Rc.k], tail: m.then.lab[Rc.k] }], true);
  bar('오늘', s.opts.map((o) => ({ p: o.pct, lab: `${o.pct}%`, me: o.k === s.me })), false);
  // 근거 — 작은 글자(오늘 관람객 수는 맨 아래 한 줄에 있으니 뺀다)
  g.font = `500 20px ${B}`; g.fillStyle = 'rgba(255,255,255,.42)'; cy += 4;
  m.basis.filter((ln) => !ln.startsWith('오늘 ·')).forEach((ln) => wrapKo(g, ln, W).forEach((l2) => { cy += 28; g.fillText(l2, x, cy); }));
  return cy;
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
const keep = await mountKeep($('#keep'));
setupShare($('#shareTable'), keep.renderTable, 'monet100_가져가는것.png');

window.__exitE = { MAJOR, render: renderShare, get done() { return MAJOR.map((m) => $(m.el).classList.contains('done')); } };
