// v3 산업혁명 — 생라자르 입장(v2) → 벽면 자료(v2 현장 자료 시트) → "화가들을 밖으로 이끈 것은?" → 기차표 스캔
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
const ASK = {
  coach: { img: V3 + 'img/t_ticket.png', kind: 'ticket' },
  title: task.title,
  sub: '책상 위에서 노르망디행 기차표를 찾아 비춰 보세요',
  buttons: [{ label: '카메라 켜기', cam: true, on: scan }],
  link: { label: '벽면 자료 다시 보기', on: () => $('#openClues').click() },
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
    title: '산업혁명 · 기차표 찾기', find: task.find, hint: '기차표가 화면에 가득 차도록\n조금 더 가까이 다가가 보세요',
    mind: task.mind ? V3 + task.mind : null, pending: task.pending,
    targets: task.targets.map((t) => ({ ...t, img: V3 + t.img })), demo: store.demo(), hold: true,
    onEnter: () => guide.hide(),
    onFail: (msg) => { closeCam(); guide.fail(msg); },
    onClose: () => guide.reset(),
    onFound: () => win(),
  });
}
async function win() {
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
  window.flow.issue();
  if (store.saved(task.id)) { const b = $('#save'); b.disabled = true; b.textContent = '수집함에 담았어요'; }
}
$('#save').addEventListener('click', () => store.save(task.id));
