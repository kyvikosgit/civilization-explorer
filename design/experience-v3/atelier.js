// v3 아틀리에(11/03 미팅: 단순하게) — [소품 찾기] → 카메라 → 튜브물감을 비추면 그대로 정답 · 수집품 → 끝 줄 [목록으로 | 다음 미션]
//   다른 소품을 비추면 그 소품 카드에 '이 소품이 아니에요'. 소품 칸(둘러보기) · 밖으로 나가 칠하기는 체험 더보기(body.more)
// (아래는 그 전 v3 주석) v2 c3-tube.js 사본. 구성(소품 아홉 칸 · 소품 카드 · 일기장 힌트 · 튜브물감 해설)은 그대로
//   바꾼 곳: 소품은 카메라로 비춰야 드러난다(NFC 스캔 → 카메라). 고르기는 정답형 — 튜브물감이면 정답, 아니면 그 물건의 한 줄(기획서). 관람객 비율 없음
//   11/02 공간연출기획안: 실내 아틀리에 없음 — 에트르타 야외 작업 공간, 소품 넷(이젤 · 작업 중인 캔버스 · 접이식 의자 · 화구 상자와 튜브물감), 일기장 힌트 없음
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
import { collect, endRow, mountEnd, showComplete } from './done.js';
import { makeGuide } from './guide.js';
import { playIntro } from './et-intro.js';

const $ = (s) => document.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const IMG = 'img/c3obj/';
// 물건 → 사진 파일(튜브물감 상자 = 브레이트너의 물감 상자). 돼지 방광 = 기획서(260928) 소품 이미지
const PHOTO = { tube: 'tubebox', easel: 'pochade' };
const src = (id) => (id === 'canvas' ? '../../experience-v3/img/et_canvas.jpg' : `${IMG}${PHOTO[id] || id}.jpg`);

// where: 기획서의 배치(아틀리에 안 6 · 야외 자리 3). why: 고른 뒤 한 줄(기획서의 물건별 문장)
const OBJ = [
  { id: 'easel', name: '이젤', where: '에트르타',
    desc: '접어서 들고 다니는 상자 이젤. 뚜껑을 열면 작은 캔버스를 받칩니다.',
    why: '이젤은 들고 나갈 수 있었지만, 결정적인 이유는 따로 있었습니다.' },
  { id: 'canvas', name: '작업 중인 캔버스', where: '에트르타',
    desc: '화가가 잠시 자리를 비운 듯 놓여 있는, 그리다 만 풍경입니다.',
    why: '캔버스는 밖으로 나온 결과이지, 나오게 한 이유는 아니었습니다.' },
  { id: 'stool', name: '접이식 의자', where: '에트르타',
    desc: '접으면 한 손에 들리는 야외용 의자입니다.',
    why: '앉을 자리는 마련됐지만, 화가를 밖으로 이끈 이유는 아니었습니다.' },
  { id: 'tube', name: '화구 상자와 튜브물감', where: '에트르타',
    desc: '작은 나무 상자에 금속 튜브 물감과 팔레트가 들어 있습니다.',
    why: '새지 않고 가벼운 금속 튜브가, 물감을 처음으로 밖에 들고 나가게 했습니다.' },
];
const BY = Object.fromEntries(OBJ.map((o) => [o.id, o]));
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
const APP_NFC = !!(window.__m100app?.nfc && window.ReactNativeWebView);   // 앱(NFC 가능): 소품 태그에 대면 바로
// 아이폰 앱(빌드 9, 유니버설 링크): 시스템 창을 띄우지 않는다 — 카메라를 끈 이 화면에서 소품 태그를 대면 아이폰 알림 → 누르면 앱이 넘겨준다(window.__m100tag)
const IOS_UL = !!(window.__m100app?.ul && window.ReactNativeWebView);
const TAG_MSG = IOS_UL ? '소품에 휴대폰 윗부분을 대 보세요 · 화면 위에 알림이 뜨면 눌러 주세요' : '에트르타 공간의 소품에 휴대폰을 대 보세요';
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
  toast(APP_NFC ? TAG_MSG : '에트르타 공간에서 소품을 찾아 카메라로 비춰 보세요');   // 둘러보기(더보기)에서만 보인다
});
function paintSeen() {
  grid.querySelectorAll('.ob').forEach((b) => { b.classList.toggle('seen', seen.has(b.dataset.id)); });
  $('#found').textContent = `${seen.size} / ${OBJ.length}`;
}
paintSeen();
// 드러내기: '?' 가 사라지며 사진이 떠오르고(0.7초), 이어서 카드
function reveal(id) {
  if (!BY[id]) return;
  // 11/06: 체험은 튜브물감 하나만 — 이미 모았어도 튜브물감을 비추면 완료 화면을 다시 본다. 다른 소품은 대상이 아니다
  if (id !== 'tube') return;
  markSeen(id); choose('tube'); return;
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
  // 고르기 단추는 쓰지 않는다 — 메인 미션 중엔 아닌 소품에 한 줄, 더보기에선 설명만
  const w = $('#dWhy'), mission = !store.saved(TASK.id) && id !== 'tube';
  w.hidden = !mission; if (mission) w.textContent = `이 소품이 아닙니다. ${o.why}\n닫고 다른 소품을 찾아 비춰 보세요.`;
  $('#dPick').hidden = true;
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
    const w = $('#dWhy'); w.textContent = `정답이 아닙니다. ${o.why}`; w.hidden = false;
    $('#dPick').hidden = true;
    return;
  }
  closeAll(true);
  if (!store.saved(TASK.id)) { store.solve(TASK.id); collect(TASK.id); }
  // 11/06: 미션 완료는 구역 공통 화면(done.js)
  const [head, ...body] = TASK.successBody.split('\n\n');
  showComplete('atelier', { item: TASK.item, title: head, body: body.join('\n\n'), more: () => { location.href = V3 + 'paint.html'; } });   // 체험 더보기 = 튜브물감을 들고 밖으로 나가 칠하기
}
// 체험 더보기 — 결과를 닫고 소품 칸(둘러보기)으로. 밖으로 나가 칠하기도 여기
function moreEnd() {
  if ($('.more-end')) return;
  const el = endRow('atelier'); el.classList.add('more-end');
  $('.more-go').insertAdjacentElement('afterend', el);
}
function browse() {
  moreEnd();
  const res = $('#res'); res.classList.remove('in'); document.body.classList.remove('result');
  setTimeout(() => { res.hidden = true; }, REDUCED ? 0 : 260);
  document.body.classList.add('more'); scanBtn.lastChild.textContent = '소품 비추기';
  window.scrollTo(0, 0);
}
// 11/06: 모은 뒤에도 같은 화면(튜브물감 찾기) — 소품 넷 둘러보기는 없앴다. 아래에 밖으로 나가 칠하기 · 끝 줄
if (store.saved(TASK.id)) document.body.classList.add('got');
// 11/06 도입(et-intro.js) — 빈 캔버스에 붓질로 에트르타가 그려지고 카메라가 물러나며 이젤 위 캔버스가 된다. 들어올 때마다(태그로 열림 · 동작 줄이기 제외)
{
  const b = document.body, qs = new URLSearchParams(location.search);
  if (qs.get('o') || qs.get('tag') || REDUCED) { b.classList.add('et-ready'); setTimeout(showGuide, 300); }
  else {
    b.classList.add('intro-run');
    playIntro({ onDone: () => { b.classList.remove('intro-run'); b.classList.add('et-ready'); setTimeout(showGuide, 450); } });
  }
}
function hasBatchim(s) { const c = s.charCodeAt(s.length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 !== 0; }

// ── NFC: 태그로 열린 경우(?o=물건 — 아이폰 알림 · 다른 기기) 그 칸을 드러낸다
const q = new URLSearchParams(location.search).get('o') || new URLSearchParams(location.search).get('tag');
if (q === 'tube') { document.body.classList.add('no-intro'); setTimeout(() => reveal(q), REDUCED ? 0 : 450); }

// ── 스캔: [소품 비추기] → 카메라 → 소품을 알아보면 카메라가 닫히고 그 칸이 드러나 카드가 열린다
const scanBtn = $('#scanBtn');
if (IOS_UL) setTimeout(() => toast('튜브물감 상자에 휴대폰 윗부분을 대 보세요 · 화면 위에 알림이 뜨면 눌러 주세요'), 2600);
document.body.classList.add('can-scan');
// 소품 인식 모델(model/props.tflite) — 지금은 대체 소품(공개 사진)으로 학습한 시험판. 돼지 방광은 대체 분류가 없어 빠져 있다
const MODEL = V3 + 'model/props.tflite';
// 11/06: 미션은 튜브물감 하나 찾기 — 다른 소품은 인식 · 고르기 대상이 아니다(둘러보기는 체험 더보기)
const pickFallback = (why) => {
  const list = [BY.tube];
  openCam({
    title: '에트르타 · 튜브물감 찾기', find: '', mind: null, reason: why || '카메라 없이 직접 골라 봅니다', dots: false, labels: true,
    targets: list.map((o) => ({ title: o.name, img: src(o.id) })),
    onFound: (i) => { closeCam(); reveal(list[i].id); },
    onClose: () => showGuide(),
  });
};
const NFC_KEYS = { easel: 0, pochade: 0, canvas: 1, stool: 2, tube: 3 };
// 11/06: 살롱 · 시민사회 · 해돋이와 같은 장면 위 안내(폰이 다가가 비추는 동작 · 한 줄 · 금색 단추)
const guide = makeGuide();
function showGuide() {
  if (guide.shown || document.body.classList.contains('modal')) return;
  guide.show({
    coach: { img: src('tube'), kind: 'photo' },
    title: '화가를 밖으로 이끈 것은?',
    sub: IOS_UL ? '에트르타 작업 공간에서 튜브물감을 찾아\n휴대폰 윗부분을 대 보세요' : '에트르타 작업 공간에서 튜브물감을 찾아 비춰 보세요',
    buttons: [{ label: '튜브물감 찾기', cam: true, on: startScan }],
    note: "카메라 권한을 물으면 '허용'을 눌러 주세요",
    link: store.saved(TASK.id) ? { label: '튜브물감을 들고 밖으로 ›', on: () => { location.href = V3 + 'paint.html'; } } : null,
  });
}
scanBtn.addEventListener('click', () => startScan());
function startScan() {
  guide.hide();
  closeAll(true);
  // 앱(NFC 가능): 소품 태그에 대기만 하면 그 소품 — 카메라 인식 대신
  if (APP_NFC && !IOS_UL) {   // 안드로이드: 창 없이 태그를 기다린다
    openCam({ title: '에트르타 · 튜브물감 찾기', find: '', mind: null, pending: '', targets: [{ title: BY.tube.name, img: src('tube') }], nfc: { tube: 0 }, nfcAny: () => 0, nfcMsg: '튜브물감 상자에 휴대폰 윗부분을 가까이 대세요', nfcBtn: '튜브물감 상자에 폰 대기', nfcAuto: true, onFound: () => { closeCam(); reveal('tube'); } });
    return;
  }
  openDetect({
    title: '에트르타 · 튜브물감 찾기',
    find: '튜브물감이 든 화구 상자에 카메라를 비추세요',
    model: MODEL,
    names: { tube: BY.tube.name },
    onFound: (id) => { closeDetect(); reveal(id); },
    onFallback: (why) => { closeDetect(); pickFallback(why); },
    onClose: () => showGuide(),
  });
}

// 태그 주소 → 물건: …/n/?t=bladder 또는 …/c3-tube.html?o=bladder
function tagToObject(url) {
  try { const u = new URL(url, location.href); const k = u.searchParams.get('o') || u.searchParams.get('t'); return k && BY[k] ? k : null; } catch (e) { return null; }
}

// 사진 출처 한 줄
fetch(`${IMG}credits.json`).then((r) => (r.ok ? r.json() : {})).then((j) => { CREDIT = j || {}; }).catch(() => {});

// 앱(빌드 9): 이 화면이 열려 있을 때 태그를 대면 아이폰 알림 → 앱이 넘겨준다
// 시연용(11/03): 이 화면 소품 태그가 아니어도 읽히기만 하면 아직 안 본 다음 소품으로
const nextObj = () => (OBJ.find((o) => !seen.has(o.id)) || OBJ[OBJ.length - 1]).id;
window.__m100tag = (url) => { if (!url) return; closeCam(); reveal('tube'); };   // 11/06: 어느 태그든 튜브물감

window.__c3tube = { open, choose, closeAll, get seen() { return [...seen]; } };
