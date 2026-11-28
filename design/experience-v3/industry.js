// v3 사무실(11/03 미팅: 단순하게) — 생라자르 입장(v2) → 역할 줄 → 안내 시트(기차표를 찾아 비추기, 11/18: [사무실 살펴보기] 단계 없이 바로) → 기차표 스캔
//   → 안내판 글자판이 넘어가며 지도 · 르아브르까지 노선이 그려지고 → v2 발권 연출(표가 쿵 · 날인 탁) → 표가 수집함으로 → 끝 줄 [목록으로 | 다음 미션]
//   체험 더보기(메인 미션 뒤): 르아브르 이야기(그 자리 사진 · 거기서 그린 그림) · 사무실 자료
import { ZONES } from './data.js';
import { openCam, closeCam } from './camui.js';
import { makeGuide } from './guide.js';
import { store } from './store.js';
import { collect, endRow, showComplete } from './done.js';

const $ = (s) => document.querySelector(s);
const zone = ZONES.find((z) => z.id === 'industry'), task = zone.tasks[0];
const V3 = '../../experience-v3/';
const guide = makeGuide();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 벽면 자료 — 도슨트 원고 한 문단 + v2 현장 자료 네 장
$('#clueRow').insertAdjacentHTML('beforebegin', `<p class="clue-lead">${zone.wall.lead}</p>`);
// 기차표 찾기: 카메라로 비추거나, 앱(NFC 가능)이면 기차표 태그에 폰을 대도 된다(camui.js)
//   아이폰 앱(빌드 9, 유니버설 링크): 카메라를 켜면 아이폰이 태그를 스스로 읽지 않는다 — 그래서 이 안내 화면(카메라 꺼짐)에서 태그를 대게 한다.
//   대면 아이폰이 화면 위에 알림을 띄우고, 누르면 앱이 이 페이지에 넘긴다(window.__m100tag). 카메라는 [기차표 찾기]를 누를 때만
const IOS_UL = !!(window.__m100app?.ul && window.ReactNativeWebView);
// 11/18: 안내 그림은 글자 없는 빈 기차표 — 정답 표를 미리 보여 주지 않는다
const ASK = {
  coach: { img: V3 + 'img/coach_ticket.svg', kind: 'ticket' },
  title: IOS_UL ? '책상 위의 기차표를 찾아\n휴대폰 윗부분을 대 보세요' : task.title,
  sub: IOS_UL ? '화면 위에 알림이 뜨면 눌러 주세요' : '',
  buttons: [{ label: '기차표 찾기', cam: true, on: scan }],
  note: IOS_UL ? '' : '카메라 권한을 물으면 ‘허용’을 눌러 주세요',
};
// 도입이 끝나면(또는 눌러 건너뛰면) 역할 줄을 읽을 틈을 두고 안내 시트가 올라온다 — 살롱과 같은 순서
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
let askT = 0;
function showAsk() {
  if (won || guide.shown || document.body.classList.contains('more')) return;
  document.body.classList.add('asked');
  guide.show(ASK);
}
// 안내판은 역할 줄 바로 아래 — 역할 줄 글 끝(설명 줄 아래)을 재서 넘긴다(글이 두 줄이 되는 좁은 폰에서도 겹치지 않게)
function placeBoard() { const l = $('#role .lead'); if (l) $('#intro').style.setProperty('--role-b', `${l.offsetTop + l.offsetHeight}px`); }
placeBoard(); addEventListener('resize', placeBoard); document.fonts?.ready.then(placeBoard);
window.addEventListener('c2:played',() => { clearTimeout(askT); askT = setTimeout(showAsk, RM ? 0 : 1400); });   // 11/24: 위 역할 글(눈썹 · 제목 · 설명)이 다 뜬 뒤
if (document.querySelector('#intro.played')) { clearTimeout(askT); askT = setTimeout(showAsk, RM ? 0 : 1400); }   // 11/24: 도입이 없어 이 모듈이 뜨기 전에 이미 끝 장면이면 바로 안내
function scan() {
  guide.busy('카메라를 켜는 중');
  openCam({
    title: '사업가의 사무실 · 기차표 찾기', find: task.find, hint: '기차표가 화면에 가득 차도록\n조금 더 가까이 다가가 보세요',
    mind: task.mind ? V3 + task.mind : null, pending: task.pending,
    targets: task.targets.map((t) => ({ ...t, img: V3 + t.img })), hold: true,
    nfc: { ticket: 0, c2: 0 }, nfcAny: 0, nfcMsg: '기차표에 휴대폰 윗부분을 가까이 대세요', nfcBtn: '기차표 태그로 찍기', nfcFind: '기차표를 비추거나 휴대폰을 대 보세요',
    onEnter: () => guide.hide(),
    onFail: (msg) => { closeCam(); guide.fail(msg); },
    onClose: () => guide.reset(),
    onFound: () => win(),
  });
}
// 태그로 찾음 — 앱이 넘겨준 태그 주소(…/n/?t=ticket), 또는 태그로 이 화면이 처음 열린 경우(?tag=ticket)
let won = false;
function byTag() {
  if (won) return;
  if (!document.body.classList.contains('asked')) { window.intro.finish(); document.body.classList.add('asked'); }
  win();
}
// 시연용(11/03): 어떤 태그든 읽히기만 하면 기차표를 찾은 것으로
window.__m100tag = (url) => { if (url) byTag(); };
if (new URLSearchParams(location.search).get('tag')) setTimeout(byTag, 900);

function backToHub() {
  const old = $('#flowBack'); if (!old) return;
  const b = old.cloneNode(false); old.replaceWith(b);   // 지도로 가던 동작을 떼어 낸다
  b.setAttribute('aria-label', '목록으로');
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.375 5.25L8.625 12l6.75 6.75" style="stroke-width:2.25"/></svg>';
  b.onclick = () => { location.href = '../../experience-v3/index.html'; };
}
// 11/17: 이미 맞혔으면 들어오자마자 결과 화면(다시 체험 화면이 아니라)
function showResult() {
  const [head, ...body] = task.successBody.split('\n\n');
  showComplete('industry', { item: task.item, title: head, body: body.join('\n\n'), note: task.after, more: (done) => { done.hide(); openMore(); } });
}
if (store.saved(task.id)) { won = true; clearTimeout(askT); setTimeout(showResult, 0); }
async function win() {
  if (won) return;
  won = true;
  store.solve(task.id); collect(task.id);
  await closeCam(true);
  guide.hide();
  // 11/06: 미션 완료는 구역 공통 화면(done.js showComplete) — 지도 · 발권 연출은 체험 더보기에서만
  const [head, ...body] = task.successBody.split('\n\n');
  showComplete('industry', { item: task.item, title: head, body: body.join('\n\n'), note: task.after, more: (done) => { done.hide(); openMore(); } });
}
// 체험 더보기 — 예전 흐름: 안내판 → 지도 · 르아브르 노선 → 발권(표) → 르아브르 이야기 · 사무실 자료
async function openMore() {
  document.body.classList.add('more');
  window.intro.show(false);
  await wait(1500);
  window.pick('lehavre');
  await wait(1700);
  backToHub();
  window.flow.issue();
  $('#story').insertAdjacentHTML('afterend', '<button class="more-clues" type="button">사무실 자료 살펴보기</button>');
  $('.more-clues').onclick = () => $('#openClues').click();
  $('.more-clues').insertAdjacentElement('afterend', endRow('industry', { light: true }));
  $('.more-clues').nextElementSibling.classList.add('more-end');
  setTimeout(() => $('#save').click(), 2600);   // 표가 보관함으로 — 예전 발권 연출 그대로(수집은 이미 끝)
  requestAnimationFrame(() => setTimeout(() => $('#story').scrollIntoView({ behavior: 'smooth', block: 'start' }), 3600));
}
