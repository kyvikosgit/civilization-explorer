// C3 화가의 아틀리에 · 튜브물감 — 방 안의 물건을 둘러보고, 화가를 밖으로 이끈 것을 하나 고른다
// 기획서(4층 C-3 튜브물감)의 오브제 9종 · 일기장 힌트 · 물건별 설명을 그대로 쓰고, 고른 뒤엔 오늘 관람객의 선택(예시 수치) → 금속 튜브물감 → 밖으로 나가 칠하기(c3.html).
// 실물 오브제의 NFC 태그 = 이 페이지 주소 + ?o=물건 → 그 물건 카드가 바로 열린다. Android 크롬은 Web NFC 로 페이지 안에서 읽는다(새로 열리지 않음).
//
// 사실 근거
//  · 주석 튜브: 존 고프 랜드(John Goffe Rand, 미국 초상화가, 런던 거주) — 1841년 영국 특허, 1842년 미국 특허. Smithsonian Magazine "Without This Invention, Impressionism Wouldn't Exist"(2013),
//    Wikipedia "John Goffe Rand"
//  · 돼지 방광: 안료를 기름에 개어 방광에 담아 묶고, 쓸 때 압정·바늘로 구멍을 내 짜고 다시 막았다. 잘 터지고 굳었다 — 같은 출처
//  · 르누아르의 말: Jean Renoir, "Renoir, My Father"(1962) — "Without colours in tubes, there would be no Cézanne, no Monet, no Pissarro, and no Impressionism."
import { toast, saveChoice } from './js/proto-common.js';

const $ = (s) => document.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const IMG = 'img/c3obj/';
// 물건 → 사진 파일(튜브물감 상자 = 브레이트너의 물감 상자). 돼지 방광은 쓸 수 있는 실물 사진이 아직 없다 → 이름만
const PHOTO = { tube: 'tubebox', bladder: null };
const src = (id) => (PHOTO[id] === null ? '' : `${IMG}${PHOTO[id] || id}.jpg`);

// where: 기획서의 배치(아틀리에 안 6 · 야외 자리 3). why: 고른 뒤 한 줄(기획서의 물건별 문장)
const OBJ = [
  { id: 'diary', name: '화가의 일기장', where: '아틀리에 안', hint: true },
  { id: 'bladder', name: '돼지 방광 물감', where: '아틀리에 안',
    desc: '물감을 돼지 방광에 담아 끈으로 묶어 두었습니다. 쓸 때는 바늘로 구멍을 내 짜고, 다시 막았습니다.',
    why: '툭하면 터지고 금세 굳는 이 물감 주머니가, 오히려 화가를 아틀리에에 묶어 두었습니다.' },
  { id: 'easel', name: '대형 이젤', where: '아틀리에 안',
    desc: '서서 큰 캔버스를 거는 육중한 이젤입니다.',
    why: '이 이젤은 애초에 방 밖으로 나갈 수조차 없었습니다.' },
  { id: 'canvas', name: '실내 캔버스', where: '아틀리에 안',
    desc: '아틀리에에서 완성한 풍경화. 지난여름의 스케치를 보며 방 안에서 칠했습니다.',
    why: '기억에 기대어 그린 그림이라, 그림 속 빛이 실제 풍경과 다릅니다.' },
  { id: 'mortar', name: '안료 병과 절구', where: '아틀리에 안',
    desc: '안료를 절구에 갈아 기름에 개어, 물감을 직접 만들었습니다.',
    why: '물감을 갈아 쓰는 일은 아틀리에 안에서만 할 수 있었습니다.' },
  { id: 'lamp', name: '오일램프', where: '아틀리에 안',
    desc: '해가 지면 이 불빛 아래에서 칠했습니다.',
    why: '이 불빛은 창밖의 햇빛과 전혀 다른 빛입니다.' },
  { id: 'pochade', name: '휴대용 이젤', where: '야외 자리',
    desc: '접어서 들고 다니는 상자 이젤. 뚜껑을 열면 작은 캔버스를 받칩니다.',
    why: '이젤은 들고 나갈 수 있었지만, 결정적인 이유는 따로 있었습니다.' },
  { id: 'tube', name: '튜브물감 상자', where: '야외 자리',
    desc: '작은 나무 상자에 금속 튜브 물감과 팔레트가 들어 있습니다.',
    why: '새지 않고 가벼운 금속 튜브가, 물감을 처음으로 밖에 들고 나가게 했습니다.' },
  { id: 'stool', name: '접이식 의자', where: '야외 자리',
    desc: '접으면 한 손에 들리는 야외용 의자입니다.',
    why: '앉을 자리는 마련됐지만, 화가를 밖으로 이끈 이유는 아니었습니다.' },
];
const BY = Object.fromEntries(OBJ.map((o) => [o.id, o]));
// 오늘 관람객의 선택(예시 수치 · 서버가 붙으면 실제 집계)
const STATS = { tube: 46, pochade: 22, bladder: 9, stool: 6, canvas: 5, lamp: 5, mortar: 4, easel: 3 };
// 사진 출처(img/c3obj/SOURCES.md 의 한 줄 요약). 없는 사진은 이름만
let CREDIT = {};

const SEEN_KEY = 'm100_c3tube_seen';
const seen = new Set((() => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch (e) { return []; } })());
function markSeen(id) { seen.add(id); try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch (e) { /* noop */ } paintSeen(); }

// ── 물건 아홉 칸
const grid = $('#objs');
grid.innerHTML = OBJ.map((o, i) => `
  <button class="ob${o.hint ? ' hint' : ''}" type="button" data-id="${o.id}" style="--i:${i}">
    <span class="ph${src(o.id) ? '' : ' none'}">${src(o.id) ? `<img src="${src(o.id)}" alt="" loading="eager">` : '<em>사진 준비 중</em>'}</span>
    <span class="nm">${o.name}</span>
  </button>`).join('');
grid.addEventListener('click', (e) => { const b = e.target.closest('.ob'); if (b) open(b.dataset.id); });
function paintSeen() { grid.querySelectorAll('.ob').forEach((b) => b.classList.toggle('seen', seen.has(b.dataset.id))); }
paintSeen();

// ── 카드 열기 · 닫기 (가운데로 크게. 빈 곳을 누르거나 × 로 닫는다)
const detail = $('#detail'), diary = $('#diary');
let cur = null;
function open(id, from) {
  const o = BY[id]; if (!o) return;
  closeAll(true);
  markSeen(id);
  if (o.hint) { show(diary); return; }
  cur = id;
  const img = $('#dImg'), u = src(id); img.parentNode.classList.toggle('none', !u); if (u) img.src = u; else img.removeAttribute('src');
  $('#dWhere').textContent = o.where;
  $('#dName').textContent = o.name;
  $('#dDesc').textContent = o.desc;
  $('#dCredit').textContent = CREDIT[id] || '';
  show(detail);
}
function show(el) { el.hidden = false; requestAnimationFrame(() => el.classList.add('in')); document.body.classList.add('modal'); }
function hide(el, now) {
  if (el.hidden) return;
  el.classList.remove('in');
  const end = () => { el.hidden = true; };
  if (now || REDUCED) end(); else setTimeout(end, 260);
}
function closeAll(now) { hide(detail, now); hide(diary, now); document.body.classList.remove('modal'); cur = null; }
$('#dClose').addEventListener('click', () => closeAll());
$('#yClose').addEventListener('click', () => closeAll());
[detail, diary].forEach((el) => el.addEventListener('click', (e) => { if (e.target === el) closeAll(); }));
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

// ── 고르기 → 오늘 관람객의 선택 → 튜브물감
let pick = null;
$('#dPick').addEventListener('click', () => { if (cur) choose(cur); });
function choose(id) {
  pick = id; const o = BY[id];
  closeAll(true);
  $('#resH').textContent = `당신은 ‘${o.name}’${hasBatchim(o.name) ? '을' : '를'} 골랐습니다`;
  $('#resWhy').textContent = o.why;
  const rows = Object.entries(STATS).sort((a, b) => b[1] - a[1]);
  $('#bars').innerHTML = rows.map(([k, v]) => `
    <li class="${k === id ? 'me' : ''}" style="--v:${v}">
      <span class="bn">${BY[k].name}${k === id ? '<i>나</i>' : ''}</span><span class="bv">${v}%</span>
      <span class="bt"><span class="bf"></span></span>
    </li>`).join('');
  $('#ansImg').src = src('tube');
  const res = $('#res');
  res.hidden = false; document.body.classList.add('result');
  window.scrollTo(0, 0); res.scrollTop = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => res.classList.add('in')));
  const save = $('#save'); save.disabled = false; save.textContent = '수집함에 저장';
}
function hasBatchim(s) { const c = s.charCodeAt(s.length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 !== 0; }
$('#again').addEventListener('click', () => {
  const res = $('#res'); res.classList.remove('in'); document.body.classList.remove('result');
  setTimeout(() => { res.hidden = true; }, REDUCED ? 0 : 300);
  window.scrollTo(0, 0);
});
// 끝 단추 공통: 처음으로(체험 목록) · 수집함에 저장 → 같은 자리에서 '수집함에 담았어요'
$('#save').addEventListener('click', () => {
  const b = $('#save'); if (b.disabled) return;
  saveChoice('c3tube', { pick, item: 'tube' });
  b.disabled = true; b.textContent = '수집함에 담았어요';
  toast('〈튜브물감〉을 수집함에 저장했습니다');
});

// ── NFC: 태그로 열린 경우(?o=물건) 그 카드부터
const q = new URLSearchParams(location.search).get('o');
if (q && BY[q]) { document.body.classList.add('no-intro'); setTimeout(() => open(q, 'nfc'), REDUCED ? 0 : 450); }

// Android 크롬: 페이지 안에서 태그를 바로 읽는다 — 첫 터치 뒤에 켠다(권한 요청은 사용자 동작이 있어야 한다)
if ('NDEFReader' in window) {
  const start = async () => {
    try {
      const r = new window.NDEFReader();
      await r.scan();
      $('#nfcDot').hidden = false;
      r.addEventListener('reading', ({ message }) => {
        for (const rec of message.records) {
          if (rec.recordType !== 'url' && rec.recordType !== 'absolute-url') continue;
          const url = new TextDecoder().decode(rec.data);
          const id = tagToObject(url);
          if (id) { open(id, 'nfc'); return; }
          if (/^https?:/.test(url)) { location.href = url; return; }
        }
      });
    } catch (e) { /* 권한 거부 · 꺼짐 — 주소로 열리는 방식은 그대로 */ }
  };
  addEventListener('pointerdown', start, { once: true });
}
// 태그 주소 → 물건: …/n/?t=bladder 또는 …/c3-tube.html?o=bladder
function tagToObject(url) {
  try { const u = new URL(url, location.href); const k = u.searchParams.get('o') || u.searchParams.get('t'); return k && BY[k] ? k : null; } catch (e) { return null; }
}

// 사진 출처 한 줄
fetch(`${IMG}credits.json`).then((r) => (r.ok ? r.json() : {})).then((j) => { CREDIT = j || {}; }).catch(() => {});

window.__c3tube = { open, choose, closeAll, get seen() { return [...seen]; } };
