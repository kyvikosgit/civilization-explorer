// C5 모네 전시관 — 가장 오래 머문 그림(10점 중 1점) + 느낌 단어(12개 중 최대 3개) → 오늘의 관람객 비율 + 그 그림을 고른 사람들의 단어
// 서버는 선택지별 숫자만 센다(여기서는 예시 수치). 이미지는 보드 C2의 퍼블릭 도메인 도판을 임시로 쓴다.
import { toast, loadImage } from '../../../booth/js/common.js';

const $ = (s) => document.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 임시 10점 — 제목·연도·소장처는 보드(experience-v2.html C2 도판 캡션) 그대로
const WORKS = [
  { t: '인상, 해돋이', y: '1872', m: '마르모탕 모네', p: '르아브르', img: '../works/c2-havre-impression-marmottan.jpg',
    then: '1872년 무렵 르아브르의 숙소 창에서 바깥 항구를 보고 그렸다. 크레인과 굴뚝이 아침 안개 속에 있다.' },
  { t: '양귀비 들판', y: '1873', m: '오르세', p: '아르장퇴유', img: '../works/c2-arg-coquelicots-orsay.jpg' },
  { t: '아르장퇴유의 철교', y: '1873~74', m: '오르세', p: '아르장퇴유', img: '../works/c2-arg-pont-chemin-de-fer-orsay.jpg' },
  { t: '파라솔을 든 여인 – 모네 부인과 아들', y: '1875', m: '내셔널 갤러리 워싱턴', p: '아르장퇴유', img: '../works/c2-arg-parasol-nga.jpg' },
  { t: '마네포르트(에트르타)', y: '1883', m: '메트로폴리탄', p: '에트르타', img: '../works/c2-etretat-manneporte-met.jpg' },
  { t: '건초더미(눈과 해의 효과)', y: '1891', m: '메트로폴리탄', p: '지베르니', img: '../works/c2-giverny-haystacks-met.jpg' },
  { t: '네 그루의 나무(엡트 강의 포플러)', y: '1891', m: '메트로폴리탄', p: '지베르니', img: '../works/c2-giverny-four-trees-met.jpg' },
  { t: '루앙 대성당, 정문, 흐린 날', y: '1892', m: '오르세', p: '루앙', img: '../works/c2-rouen-cathedrale-orsay.jpg' },
  { t: '루앙 대성당, 서쪽 정면, 햇빛', y: '1894', m: '내셔널 갤러리 워싱턴', p: '루앙', img: '../works/c2-rouen-cathedrale-nga.jpg' },
  { t: '수련 연못 위의 다리', y: '1899', m: '메트로폴리탄', p: '지베르니', img: '../works/c2-giverny-bridge-met.jpg' },
];
// 보드 C5 단어 12개
const WORDS = ['고요한', '따뜻한', '서늘한', '흐릿한', '눈부신', '축축한', '쓸쓸한', '평화로운', '아련한', '상쾌한', '느린', '꿈같은'];
// 예시 수치 — 보드 와이어프레임(1번 31% · 4번 14% · 7번 11%) 기준
const TOTAL = 3402;
const PCT = [31, 6, 9, 14, 5, 8, 11, 7, 5, 4];
// 1번을 고른 사람들의 단어(보드 예시 순서)를 앞세우고, 나머지 그림은 결정적 난수로
function wordCounts(i) {
  const n = Math.round(TOTAL * PCT[i] / 100);
  let s = (i + 1) * 2654435761 >>> 0;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const base = WORDS.map(() => 0.15 + r());
  if (i === 0) ['흐릿한', '고요한', '아련한', '따뜻한', '서늘한', '꿈같은'].forEach((w, k) => { base[WORDS.indexOf(w)] = 1.6 - k * 0.18; });
  const sum = base.reduce((a, b) => a + b, 0);
  return base.map((v) => Math.round(n * 1.9 * v / sum));   // 1인 평균 약 1.9단어
}

let pick = -1, chosen = [];
const screens = Array.from(document.querySelectorAll('.screen'));
function show(n) {
  screens.forEach((s) => { s.hidden = +s.dataset.screen !== n; });
  Array.from($('#progress').children).forEach((i, k) => i.classList.toggle('on', k < n));
  const light = n === 3;
  document.body.classList.toggle('light', light); document.documentElement.classList.toggle('light', light);
  document.querySelector('meta[name=theme-color]').content = light ? '#FFFFFF' : '#151413';
  window.scrollTo(0, 0);
}

// ── 1. 벽
const wall = $('#wall'), rail = $('#rail');
rail.innerHTML = WORKS.map((w, i) => `
  <button class="work ${i === 0 ? 'first' : ''}" type="button" data-i="${i}" aria-label="${i + 1}번">
    <span class="no">${i + 1}</span>
    <img class="cv" src="${w.img}" alt="" draggable="false">
  </button>`).join('');
{
  // 마우스로도 끌어서 벽을 따라간다. 손가락은 네이티브 가로 스크롤. 끌었으면 탭으로 치지 않는다
  let x0 = 0, s0 = 0, dragged = false, down = false;
  wall.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') return; down = true; dragged = false; x0 = e.clientX; s0 = wall.scrollLeft; wall.classList.add('drag'); });
  wall.addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - x0; if (Math.abs(dx) > 6) dragged = true; if (dragged) wall.scrollLeft = s0 - dx; });
  const end = () => { down = false; wall.classList.remove('drag'); setTimeout(() => { dragged = false; }, 0); };
  wall.addEventListener('pointerup', end); wall.addEventListener('pointercancel', end); wall.addEventListener('pointerleave', end);
  wall.addEventListener('click', (e) => {
    if (dragged) { e.preventDefault(); return; }
    const b = e.target.closest('.work'); if (!b) return;
    select(+b.dataset.i);
  });
  wall.addEventListener('scroll', () => $('#wallHint').classList.add('off'), { passive: true, once: true });
}
function select(i) {
  pick = i; chosen = [];
  rail.querySelectorAll('.work').forEach((w) => w.classList.toggle('sel', +w.dataset.i === i));
  $('#pickNo').textContent = `${i + 1}번`;
  $('#spotImg').src = WORKS[i].img; $('#spotImg').alt = `${i + 1}번 그림`;
  $('#tags').innerHTML = '';
  renderWords();
  setTimeout(() => show(2), REDUCED ? 0 : 180);
}
$('#later').addEventListener('click', () => toast('앱 체험 탭에서 나중에 이어서 할 수 있습니다.'));

// ── 2. 단어 — 칩을 누르면 그림 위로 날아가 라벨이 된다
const words = $('#words'), tags = $('#tags');
function renderWords() {
  words.innerHTML = WORDS.map((w, i) => `<button class="chip" type="button" data-w="${i}">${w}</button>`).join('');
  words.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => toggleWord(+c.dataset.w, c)));
  syncWords();
}
function syncWords() {
  words.querySelectorAll('.chip').forEach((c) => { const on = chosen.includes(+c.dataset.w); c.classList.toggle('on', on); c.classList.toggle('off', !on && chosen.length >= 3); c.disabled = !on && chosen.length >= 3; });
  $('#toReveal').disabled = chosen.length === 0;
  $('#toReveal').textContent = chosen.length ? `오늘의 관람객 보기 · 단어 ${chosen.length}` : '오늘의 관람객 보기';
}
function toggleWord(w, chip) {
  if (chosen.includes(w)) { chosen = chosen.filter((x) => x !== w); tags.querySelector(`[data-w="${w}"]`)?.remove(); syncWords(); return; }
  if (chosen.length >= 3) return;
  chosen.push(w);
  syncWords();
  // 라벨 자리를 먼저 만들고(투명), 칩에서 그 자리로 날아간 뒤 라벨이 나타난다
  const lab = document.createElement('span');
  lab.className = 'tag-lab'; lab.dataset.w = w; lab.innerHTML = `${WORDS[w]}<i>${chosen.length}</i>`; lab.style.visibility = 'hidden';
  lab.addEventListener('click', () => toggleWord(w));
  tags.appendChild(lab);
  if (REDUCED) { lab.style.visibility = ''; return; }
  const a = chip.getBoundingClientRect(), b = lab.getBoundingClientRect();
  const fly = document.createElement('span');
  fly.className = 'fly'; fly.textContent = WORDS[w];
  fly.style.left = `${a.left}px`; fly.style.top = `${a.top}px`; fly.style.width = `${a.width}px`;
  document.body.appendChild(fly);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fly.style.transform = `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.height / a.height})`;
    fly.style.borderRadius = '2px'; fly.style.opacity = '0';
  }));
  setTimeout(() => { fly.remove(); lab.style.visibility = ''; lab.classList.add('land'); }, 520);
}
$('#rePick').addEventListener('click', () => show(1));
$('#toReveal').addEventListener('click', () => { if (chosen.length) reveal(); });

// ── 3. 오늘의 관람객
function reveal() {
  const w = WORKS[pick];
  const bars = $('#bars');
  const max = Math.max(...PCT);
  bars.innerHTML = WORKS.map((x, i) => `
    <div class="bar ${i === pick ? 'me' : ''}" title="${i + 1} ${x.t}">
      <span class="pct">${PCT[i]}%</span>
      <div class="fl" style="height:${Math.round(PCT[i] / max * 88)}px; animation-delay:${i * 50}ms"></div>
      <img class="th" src="${x.img}" alt="">
      <span class="n">${i + 1}</span>
    </div>`).join('');
  $('#mineImg').src = w.img; $('#mineNo').textContent = pick + 1;
  $('#mineTitle').textContent = w.t; $('#mineMeta').textContent = `${w.y} · ${w.m} · ${w.p}`;
  $('#minePct').textContent = `${PCT[pick]}%`;
  // 단어 비중 — 많이 고른 순. 내 단어는 주황
  const counts = wordCounts(pick);
  const order = WORDS.map((_, i) => i).sort((a, b) => counts[b] - counts[a]);
  const cmax = counts[order[0]], cmin = counts[order[order.length - 1]];
  $('#cloud').innerHTML = order.map((i, k) => {
    const t = (counts[i] - cmin) / Math.max(1, cmax - cmin);
    const size = Math.round(13 + t * 19);
    return `<span class="${chosen.includes(i) ? 'me' : ''}" style="font-size:${size}px; animation-delay:${k * 40}ms">${WORDS[i]}<small>${counts[i]}</small></span>`;
  }).join('');
  // 같은 단어 조합 — 예시 수치(결정적)
  const key = chosen.slice().sort().join(',');
  let h = 7; for (const ch of key + pick) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const same = chosen.length === 3 ? 3 + (h % 9) : chosen.length === 2 ? 9 + (h % 14) : 22 + (h % 20);
  const mine = chosen.map((i) => WORDS[i]).join(' · ');
  $('#same').innerHTML = `<b>${same}%</b>${chosen.length === 3 ? '당신과 같은 세 단어' : `당신과 같은 ${chosen.length === 2 ? '두' : '한'} 단어`}<br><span class="muted small">${pick + 1}번을 고른 사람 중 · ${mine}</span>`;
  $('#then').innerHTML = `<b>그때는</b> · ${w.t}, ${w.y}, ${w.m}${w.then ? `<br>${w.then}` : ''}`;
  show(3);
}
$('#restart').addEventListener('click', () => { pick = -1; chosen = []; rail.querySelectorAll('.work').forEach((x) => x.classList.remove('sel')); show(1); });

// 저장 — "내가 머문 그림" 카드: 그림 + 내 단어 + 오늘 그 그림을 고른 비율
$('#save').addEventListener('click', async () => {
  const w = WORKS[pick];
  const img = await loadImage(w.img).catch(() => null);
  if (!img) return toast('이미지를 불러오지 못했습니다.');
  const CW = 1080, CH = 1350, c = document.createElement('canvas'); c.width = CW; c.height = CH;
  const g = c.getContext('2d');
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, CW, CH);
  g.fillStyle = '#D9672F'; g.font = '600 24px Paperlogy, Freesentation, sans-serif'; g.fillText('MONET 100 · C5 모네 전시관 · 내가 머문 그림', 60, 92);
  const aw = CW - 120, ah = Math.min(640, aw * img.naturalHeight / img.naturalWidth);
  const dw = Math.min(aw, ah * img.naturalWidth / img.naturalHeight), dh = dw * img.naturalHeight / img.naturalWidth;
  const ax = (CW - dw) / 2, ay = 140;
  g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 40; g.shadowOffsetY = 14;
  g.drawImage(img, ax, ay, dw, dh); g.shadowColor = 'transparent';
  let y = ay + dh + 90;
  g.fillStyle = '#111111'; g.font = '800 42px Paperlogy, Freesentation, sans-serif'; g.fillText(`${pick + 1} · ${w.t}`, 60, y);
  g.fillStyle = '#707070'; g.font = '500 24px Freesentation, sans-serif'; g.fillText(`${w.y} · ${w.m} · ${w.p}`, 60, y + 40);
  y += 120;
  let x = 60;
  chosen.forEach((i) => {
    g.font = '700 30px Freesentation, sans-serif';
    const tw = g.measureText(WORDS[i]).width + 44;
    g.fillStyle = '#D9672F'; g.beginPath(); g.roundRect(x, y - 36, tw, 54, 27); g.fill();
    g.fillStyle = '#FFFFFF'; g.fillText(WORDS[i], x + 22, y + 2);
    x += tw + 12;
  });
  y += 90;
  g.fillStyle = '#D9672F'; g.font = '800 64px Paperlogy, Freesentation, sans-serif'; g.fillText(`${PCT[pick]}%`, 60, y);
  g.fillStyle = '#111111'; g.font = '500 26px Freesentation, sans-serif'; g.fillText('오늘 이 그림을 고른 관람객', 60 + g.measureText(`${PCT[pick]}%`).width + 140, y - 4);
  g.fillStyle = '#9A9A96'; g.font = '500 20px Freesentation, sans-serif'; g.fillText('수치는 예시 · 도판 임시(퍼블릭 도메인)', 60, CH - 60);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
  if (!blob) return toast('저장에 실패했습니다.');
  const file = new File([blob], 'c5_내가머문그림.jpg', { type: 'image/jpeg' });
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('카드를 저장했습니다.');
});

show(1);
