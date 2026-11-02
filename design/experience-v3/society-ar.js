// v3 시민사회 — 거리 입장 → 벽의 사람들(카메라 · 그 시대의 말) → 칼럼으로 걸어가기(v2 그대로) → 칼럼의 전단지 찾기(카메라) → 그 전단지가 칼럼에서 떼어져 떠오른다
import { ZONES } from './data.js';
import { openCam, closeCam, esc } from './camui.js';
import { makeGuide } from './guide.js';
import { store } from './store.js';

const V3 = '../../experience-v3/', HUB = V3 + 'index.html';
const zone = ZONES.find((z) => z.id === 'society');
const people = zone.tasks.find((t) => t.id === 'people'), flyer = zone.tasks.find((t) => t.id === 'flyer');
const targets = flyer.targets.map((t) => ({ ...t, img: V3 + t.img }));
const guide = makeGuide();
const c1 = () => window.__c1;
let stage = 'people', ended = false;

// ── 벽의 사람들
const PEOPLE = {
  coach: { img: V3 + 'img/coach_people.jpg', kind: 'photo' },
  title: '벽의 사람들을 비춰 보세요',
  sub: '비추면 그 시대 사람들의 목소리가 들립니다',
  buttons: [{ label: '카메라 켜기', cam: true, on: openPeople }],
  note: '카메라 권한을 물으면 ‘허용’을 눌러 주세요',
  link: { label: people.skip.replace('전단지 찾기', '칼럼으로 가기'), on: toColumn },
};
function openPeople() {
  guide.busy('카메라를 켜는 중');
  openCam({
    title: '시민사회 · 벽의 사람들', find: people.find, mind: people.mind, pending: people.pending, targets: people.targets,
    demo: store.demo(), hold: true,
    onEnter: () => guide.hide(),
    onFail: (msg) => { closeCam(); guide.fail(msg); },
    onClose: () => guide.reset(),
    onFound: (i, ui) => talk(i, ui),
  });
}
function talk(i, ui) {
  const t = people.targets[i], lines = t.lines || [];
  const body = lines.length
    ? `<div class="talk">${lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div><div class="prog"><i></i></div>`
    : '<div class="talk"><p class="on wait">발언 원고 대기 · 이 자리에서 영상 또는 3D 인물이 그 시대 사람의 말을 들려줍니다</p></div>';
  const d = ui.show({ html: `<div class="dc">벽의 사람들</div><div class="dt">${esc(t.title)}</div>${body}`, buttons: [
    { label: '다른 사람 비추기', cls: 'line', on: () => ui.release() },
    { label: '칼럼으로 가기', on: async () => { await closeCam(true); toColumn(); } },
  ] });
  const ps = d.querySelectorAll('.talk p:not(.wait)'), bar = d.querySelector('.prog i');
  ps.forEach((p, k) => setTimeout(() => { p.classList.add('on'); if (bar) bar.style.width = `${((k + 1) / ps.length) * 100}%`; }, 300 + k * 2200));
}
function toColumn() { stage = 'walk'; guide.hide(); c1().scan(); }

// ── 칼럼의 전단지
const FLYER = {
  coach: { img: V3 + 'img/fl_bonmarche.jpg', kind: 'paper' },
  title: '그 모임 이름이 뭐였더라?',
  sub: '카페 게르부아에 매주 모이는 예술가들 이야기,\n칼럼의 전단지를 찾아 비춰 보세요',
  buttons: [{ label: '카메라 켜기', cam: true, on: openFlyer }],
};
function openFlyer() {
  guide.busy('카메라를 켜는 중');
  openCam({
    title: '시민사회 · 모리스 칼럼', find: flyer.find, hint: '전단지가 화면에 가득 차도록\n조금 더 가까이 다가가 보세요',
    mind: V3 + flyer.mind, targets, demo: store.demo(), hold: true,
    onEnter: () => guide.hide(),
    onFail: (msg) => { closeCam(); guide.fail(msg); },
    onClose: () => guide.reset(),
    onFound: (i, ui) => {
      const t = targets[i], head = `<div class="dc">모리스 칼럼 전단지</div><div class="dt">${esc(t.title)}</div>`;
      ui.show({ html: `${head}<div class="dd">${esc(t.desc)}</div>`, buttons: [
        { label: '다른 전단지 비추기', cls: 'line', on: () => ui.release() },
        { label: flyer.cta, on: () => (t.correct ? win() : ui.show({ html: `${head}<div class="fb">${esc(t.feedback)}</div>`, buttons: [{ label: '다시 찾기', on: () => ui.release() }] })) },
      ] });
    },
  });
}
// 정답 — 카메라가 닫히고, 칼럼에서 그 전단지가 떼어져 가운데로 떠오른다(v2 살펴보기 + 삽화 영상)
async function win() {
  store.solve(flyer.id); ended = true; document.body.classList.add('ended');
  await closeCam(true);
  const i = c1().ITEMS.findIndex((it) => it.id === 'f1');
  c1().viewer?.focusItem(i, 0.9);
  await new Promise((r) => setTimeout(r, 1100));
  c1().openPrint(i);
  await new Promise((r) => setTimeout(r, 900));
  const saved = store.saved(flyer.id);
  const [name, , ...rest] = flyer.successBody.split('\n');
  guide.show({
    cap: flyer.successTitle, title: name, sub: rest.join('\n'),
    buttons: [
      { label: '처음으로', cls: 'line', on: () => { location.href = HUB; } },
      { label: saved ? '수집함에 담았어요' : '수집함에 저장', on: (b) => { store.save(flyer.id); b.disabled = true; b.textContent = '수집함에 담았어요'; navigator.vibrate?.(16); } },
    ],
  });
  if (saved) guide.el.querySelectorAll('.g-go')[1].disabled = true;
}

let readyOnce = false;
window.addEventListener('c1:ready', () => { if (readyOnce) return; readyOnce = true; setTimeout(() => { if (stage === 'people') guide.show(PEOPLE); }, 1000); });
window.addEventListener('c1:step', (e) => {
  if (ended) return;
  if (e.detail === 2) { stage = 'flyer'; setTimeout(() => guide.show(FLYER), 500); }   // 칼럼 앞에 도착
  else if (e.detail === 3) guide.hide();                                              // 포스터를 떼어 읽는 동안
  else if (e.detail === 1 && stage !== 'people') { stage = 'people'; guide.show(PEOPLE); }
});
