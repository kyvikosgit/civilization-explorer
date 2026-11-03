// v3 사무실 — 생라자르 입장(v2) → 사무실 자료(v2 시트에 11/02 기획안 내용) → "화가들을 밖으로 이끈 것은?" → 기차표 스캔
//   → 안내판 글자판이 넘어가며 지도 · 르아브르까지 노선이 그려지고 → v2 발권 연출(표가 쿵 · 날인 탁) → 이야기 → 끝 줄
import { ZONES } from './data.js';
import { openCam, closeCam } from './camui.js';
import { makeGuide } from './guide.js';
import { store } from './store.js';

const $ = (s) => document.querySelector(s);
const zone = ZONES.find((z) => z.id === 'industry'), task = zone.tasks[0];
const V3 = '../../experience-v3/';
const guide = makeGuide();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 벽면 자료 — 도슨트 원고 한 문단 + v2 현장 자료 네 장
$('#clueRow').insertAdjacentHTML('beforebegin', `<p class="clue-lead">${zone.wall.lead}</p>`);
// 기차표 찾기: 카메라로 비추거나, 앱(NFC 가능)이면 기차표 태그에 폰을 대도 된다(camui.js)
//   아이폰 앱(빌드 9, 유니버설 링크): 카메라를 켜면 아이폰이 태그를 스스로 읽지 않는다 — 그래서 이 안내 화면(카메라 꺼짐)에서 태그를 대게 한다.
//   대면 아이폰이 화면 위에 알림을 띄우고, 누르면 앱이 이 페이지에 넘긴다(window.__m100tag). 카메라는 [카메라로 찾기]를 누를 때만
const IOS_UL = !!(window.__m100app?.ul && window.ReactNativeWebView);
const ASK = {
  coach: { img: V3 + 'img/t_ticket.png', kind: 'ticket' },
  title: task.title,
  sub: IOS_UL ? '책상 위에서 노르망디행 기차표를 찾아\n휴대폰 윗부분을 대 보세요\n화면 위에 알림이 뜨면 눌러 주세요' : '책상 위에서 노르망디행 기차표를 찾아 비춰 보세요',
  buttons: [{ label: IOS_UL ? '카메라로 찾기' : '카메라 켜기', cam: true, on: scan }],
  link: { label: '사무실 다시 살펴보기', on: () => $('#openClues').click() },
};
$('#introGo').addEventListener('click', () => {
  window.intro.finish();
  $('#openClues').click();
  document.body.classList.add('asked');
  setTimeout(() => guide.show(ASK), 300);
});
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

async function win() {
  if (won) return;
  won = true;
  store.solve(task.id);
  await closeCam(true);
  guide.hide();
  window.intro.show(false);                      // 안내판 → 글자판 → 지도
  await wait(1500);
  window.pick('lehavre');                        // 생라자르 → 르아브르 노선이 그려진다
  await wait(1700);
  // 기획안 해설을 이야기 앞에
  $('#story').insertAdjacentHTML('beforebegin', `<p class="tk-plan"></p><p class="tk-after"></p>`);
  $('.tk-plan').textContent = task.successBody; $('.tk-after').textContent = task.after;
  $('#today .btns').insertAdjacentHTML('afterend', `<a class="to-next" href="${V3 + task.next.href}">${task.next.label}</a>`);
  window.flow.issue();
  if (store.saved(task.id)) { const b = $('#save'); b.disabled = true; b.textContent = '수집함에 담았어요'; }
}
$('#save').addEventListener('click', () => store.save(task.id));
