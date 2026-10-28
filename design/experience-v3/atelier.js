// v3 아틀리에 — v2 c3-tube.js 사본. 구성(소품 아홉 칸 · 소품 카드 · 일기장 힌트 · 튜브물감 해설)은 그대로
//   바꾼 곳: 소품은 카메라로 비춰야 드러난다(NFC 스캔 → 카메라). 고르기는 정답형 — 튜브물감이면 정답, 아니면 그 물건의 한 줄(기획서). 관람객 비율 없음
//   카메라 인식 타깃은 소품 실물 사진을 받은 뒤 만든다 — 그 전엔 시연 모드에서 눌러서 확인
// (아래는 v2 원문 주석)
// C3 화가의 아틀리에 · 튜브물감 — 방 안의 물건을 둘러보고, 화가를 밖으로 이끈 것을 하나 고른다
// 기획서(4층 C-3 튜브물감)의 오브제 9종 · 일기장 힌트 · 물건별 설명을 그대로 쓰고, 고른 뒤엔 오늘 관람객의 선택(예시 수치) → 금속 튜브물감 → 밖으로 나가 칠하기(c3.html).
// 실물 오브제의 NFC 태그 = 이 페이지 주소 + ?o=물건 → 그 물건 카드가 바로 열린다. Android 크롬은 Web NFC 로 페이지 안에서 읽는다(새로 열리지 않음).
//
// 사실 근거
//  · 주석 튜브: 존 고프 랜드(John Goffe Rand, 미국 초상화가, 런던 거주) — 1841년 영국 특허, 1842년 미국 특허. Smithsonian Magazine "Without This Invention, Impressionism Wouldn't Exist"(2013),
//    Wikipedia "John Goffe Rand"
//  · 돼지 방광: 안료를 기름에 개어 방광에 담아 묶고, 쓸 때 압정·바늘로 구멍을 내 짜고 다시 막았다. 잘 터지고 굳었다 — 같은 출처
//  · 르누아르의 말: Jean Renoir, "Renoir, My Father"(1962) — "Without colours in tubes, there would be no Cézanne, no Monet, no Pissarro, and no Impressionism."
import { toast } from '../experience-v2/proto/js/proto-common.js';
import { openCam, closeCam } from './camui.js';
import { openDetect, closeDetect } from './detect.js';
import { ZONES } from './data.js';
import { store } from './store.js';

const $ = (s) => document.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const IMG = 'img/c3obj/';
// 물건 → 사진 파일(튜브물감 상자 = 브레이트너의 물감 상자). 돼지 방광 = 기획서(260928) 소품 이미지
const PHOTO = { tube: 'tubebox' };
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

const SEEN_KEY = 'm100v3_atelier_seen';
if (new URLSearchParams(location.search).has('reset')) { try { localStorage.removeItem(SEEN_KEY); } catch (e) { /* noop */ } }
const seen = new Set((() => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch (e) { return []; } })());
function markSeen(id) { seen.add(id); try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch (e) { /* noop */ } paintSeen(); }

const TASK = ZONES.find((z) => z.id === 'atelier').tasks[0];
const V3 = '../../experience-v3/';
const CAN_SCAN = !store.demo();                        // 시연 모드면 '?' 를 눌러도 드러난다

// ── 소품 아홉 칸 — 처음엔 전부 '?'. 소품에 폰을 대면(스캔) 그 칸이 드러나고 카드가 열린다. 한 번 드러난 칸은 다시 눌러 볼 수 있다.
//    NFC 가 없는 기기(아이폰 사파리 · 컴퓨터)는 '?' 를 눌러도 드러난다 — 시연용
const grid = $('#objs');
grid.innerHTML = OBJ.map((o, i) => `
  <button class="ob${o.hint ? ' hint' : ''}" type="button" data-id="${o.id}" style="--i:${i}">
    <span class="ph${src(o.id) ? '' : ' none'}">${src(o.id) ? `<img src="${src(o.id)}" alt="" loading="eager">` : '<em>사진 준비 중</em>'}<b class="q" aria-hidden="true">?</b></span>
    <span class="nm"><span class="nm-on">${o.name}</span><span class="nm-off">찾지 못한 소품</span></span>
  </button>`).join('');
grid.addEventListener('click', (e) => {
  const b = e.target.closest('.ob'); if (!b) return;
  const id = b.dataset.id;
  if (seen.has(id) || !CAN_SCAN) { reveal(id); return; }
  toast('방에서 소품을 찾아 카메라로 비춰 보세요');
});
function paintSeen() {
  grid.querySelectorAll('.ob').forEach((b) => { b.classList.toggle('seen', seen.has(b.dataset.id)); });
  $('#found').textContent = `${seen.size} / ${OBJ.length}`;
}
paintSeen();
// 드러내기: '?' 가 사라지며 사진이 떠오르고(0.7초), 이어서 카드
function reveal(id) {
  if (!BY[id]) return;
  const b = grid.querySelector(`.ob[data-id="${id}"]`);
  const fresh = !seen.has(id);
  markSeen(id);
  if (fresh && b && !REDUCED) { b.classList.add('pop'); b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); setTimeout(() => { b.classList.remove('pop'); open(id); }, 750); }
  else open(id);
}

// ── 카드 열기 · 닫기 (가운데로 크게. 빈 곳을 누르거나 × 로 닫는다)
const detail = $('#detail'), diary = $('#diary');
let cur = null;
function open(id, from) {
  const o = BY[id]; if (!o) return;
  closeAll(true);
  if (o.hint) { show(diary); return; }
  cur = id;
  const img = $('#dImg'), u = src(id); img.parentNode.classList.toggle('none', !u); if (u) img.src = u; else img.removeAttribute('src');
  $('#dWhere').textContent = o.where;
  $('#dName').textContent = o.name;
  $('#dDesc').textContent = o.desc;
  $('#dCredit').textContent = CREDIT[id] || '';
  $('#dWhy').hidden = true; $('#dPick').hidden = false;
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
  if (id !== 'tube') {                                  // 정답이 아니면 카드 안에서 그 물건의 한 줄
    const w = $('#dWhy'); w.textContent = `정답이 아니에요. ${o.why}`; w.hidden = false;
    $('#dPick').hidden = true;
    return;
  }
  closeAll(true);
  store.solve(TASK.id);
  $('#ansImg').src = src('tube');
  const res = $('#res');
  res.hidden = false; document.body.classList.add('result');
  window.scrollTo(0, 0); res.scrollTop = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => res.classList.add('in')));
  const save = $('#save'); const on = store.saved(TASK.id); save.disabled = on; save.textContent = on ? '수집함에 담았어요' : '수집함에 저장';
}
function hasBatchim(s) { const c = s.charCodeAt(s.length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 !== 0; }
// 끝 단추 공통: 처음으로(체험 목록) · 수집함에 저장 → 같은 자리에서 '수집함에 담았어요'
$('#save').addEventListener('click', () => {
  const b = $('#save'); if (b.disabled) return;
  store.save(TASK.id);
  b.disabled = true; b.textContent = '수집함에 담았어요';
  toast('〈튜브물감〉을 수집함에 저장했습니다');
});

// ── NFC: 태그로 열린 경우(?o=물건 — 아이폰 알림 · 다른 기기) 그 칸을 드러낸다
const q = new URLSearchParams(location.search).get('o');
if (q && BY[q]) { document.body.classList.add('no-intro'); setTimeout(() => reveal(q), REDUCED ? 0 : 450); }

// ── 스캔: [소품 비추기] → 카메라 → 소품을 알아보면 카메라가 닫히고 그 칸이 드러나 카드가 열린다
const scanBtn = $('#scanBtn');
document.body.classList.add('can-scan');
// 소품 인식 모델(model/props.tflite) — 지금은 대체 소품(공개 사진)으로 학습한 시험판. 돼지 방광은 대체 분류가 없어 빠져 있다
const MODEL = V3 + 'model/props.tflite';
scanBtn.addEventListener('click', () => {
  closeAll(true);
  if (store.demo()) {                                   // 시연 모드 — 눌러서 인식
    openCam({
      title: '화가의 아틀리에 · 소품 비추기', find: '방 안의 소품에 카메라를 비추세요', mind: null, pending: TASK.pending,
      targets: OBJ.map((o) => ({ title: o.name, img: src(o.id) })), demo: true,
      onFound: (i) => { closeCam(); reveal(OBJ[i].id); },
    });
    return;
  }
  openDetect({
    title: '화가의 아틀리에 · 소품 비추기',
    find: '방 안의 소품에 카메라를 비추세요',
    model: MODEL,
    names: Object.fromEntries(OBJ.map((o) => [o.id, o.name])),
    onFound: (id) => { closeDetect(); reveal(id); },
  });
});

// 태그 주소 → 물건: …/n/?t=bladder 또는 …/c3-tube.html?o=bladder
function tagToObject(url) {
  try { const u = new URL(url, location.href); const k = u.searchParams.get('o') || u.searchParams.get('t'); return k && BY[k] ? k : null; } catch (e) { return null; }
}

// 사진 출처 한 줄
fetch(`${IMG}credits.json`).then((r) => (r.ok ? r.json() : {})).then((j) => { CREDIT = j || {}; }).catch(() => {});

window.__c3tube = { open, choose, closeAll, get seen() { return [...seen]; } };
