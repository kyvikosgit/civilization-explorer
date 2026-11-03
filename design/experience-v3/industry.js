// v3 사무실(11/03 미팅: 단순하게) — 생라자르 입장(v2) → "화가들을 밖으로 이끈 것은?" → 기차표 스캔
//   → 안내판 글자판이 넘어가며 지도 · 르아브르까지 노선이 그려지고 → v2 발권 연출(표가 쿵 · 날인 탁) → 표가 수집함으로 → 끝 줄 [목록으로 | 다음 미션]
//   체험 더보기(메인 미션 뒤): 르아브르 이야기(그 자리 사진 · 거기서 그린 그림) · 사무실 자료
import { ZONES } from './data.js';
import { openCam, closeCam } from './camui.js';
import { makeGuide } from './guide.js';
import { store } from './store.js';
import { collect, endRow } from './done.js';

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
const ASK = {
  coach: { img: V3 + 'img/t_ticket.png', kind: 'ticket' },
  title: task.title,
  sub: IOS_UL ? '책상 위에서 노르망디행 기차표를 찾아\n휴대폰 윗부분을 대 보세요\n화면 위에 알림이 뜨면 눌러 주세요' : '책상 위에서 노르망디행 기차표를 찾아 비춰 보세요',
  buttons: [{ label: '기차표 찾기', cam: true, on: scan }],
};
$('#introGo').addEventListener('click', () => {
  window.intro.finish();
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
  // 끝 줄 — 해설 바로 아래. 이야기는 체험 더보기로
  const more = () => { document.body.classList.add('more'); requestAnimationFrame(() => $('#story').scrollIntoView({ behavior: 'smooth', block: 'start' })); };
  $('.tk-after').insertAdjacentElement('afterend', endRow('industry', { light: true, item: task.item, moreLabel: '체험 더보기 · 르아브르 이야기 · 사무실 자료', more }));
  $('#story').insertAdjacentHTML('afterend', '<button class="more-clues" type="button">사무실 자료 살펴보기</button>');
  $('.more-clues').onclick = () => $('#openClues').click();
  window.flow.issue();
  // 표가 바 자리에 붙고 나면 그대로 수집함으로 날아간다(v2 저장 연출) — 수집품은 저절로
  collect(task.id);
  setTimeout(() => $('#save').click(), 2600);
}
