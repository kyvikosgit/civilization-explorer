// v3 시민사회(11/03 미팅) — 거리 입장 → 칼럼으로 걸어가기(v2 그대로) → 칼럼의 전단지 찾기(카메라) → 그 전단지가 칼럼에서 떼어져 떠오르고 수집품
//   → 끝 줄 [목록으로 | 다음 미션] · 체험 더보기 = 카페 게르부아 벽면(선택 체험: 비추면 영상 + 그 시대 사람들의 말이 자막으로)
import { ZONES } from './data.js';
import { openCam, closeCam, esc } from './camui.js';
import { makeGuide } from './guide.js';
import { store } from './store.js';
import { talkFx, startTalk, unlockAudio } from './talk.js';
import { collect, endRow, showComplete } from './done.js';

const V3 = '../../experience-v3/', HUB = V3 + 'index.html';
const zone = ZONES.find((z) => z.id === 'society');
const people = zone.tasks.find((t) => t.id === 'people'), flyer = zone.tasks.find((t) => t.id === 'flyer');
const targets = flyer.targets.map((t) => ({ ...t, img: V3 + t.img }));
const guide = makeGuide();
const c1 = () => window.__c1;
let stage = 'start', ended = false;

// ── 거리에서: 칼럼으로
const START = {
  coach: { img: V3 + 'img/fl_bonmarche.jpg', kind: 'paper' },
  title: '모리스 칼럼의 전단지를 찾아 보세요',
  sub: '카페 게르부아에 매주 모이는 예술가들의 모임 이름이\n거리의 모리스 칼럼 전단지에 적혀 있습니다',
  buttons: [{ label: '칼럼으로 가기', on: () => toColumn() }],
};
// 인식 대상 = 벽 전체(0) + 창 하나씩(1–3). 창 대상은 같은 벽을 그 창 기준 좌표로 옮긴 것 — 창 하나만 비춰도 옆 창 자리까지 그대로 이어진다
const wall0 = { ...people.wall, index: 0, img: V3 + people.wall.img, spots: people.wall.spots.map((s) => ({ ...s, video: V3 + s.video })) };
const part = ({ img, rect: [rx, ry, rw, rh] }, index) => ({
  ...wall0, index, focus: index - 1, img: V3 + img, ratio: (wall0.ratio * rh) / rw,   // focus: 이 창 대상이 가리키는 사람(창 1 → 0번)
  windows: { w: wall0.windows.w / rw, h: wall0.windows.h / rh },
  spots: wall0.spots.map((s) => ({ ...s, x: (s.x - rx) / rw, y: (s.y - ry) / rh, clip: [(s.clip[0] - rx) / rw, (s.clip[1] - ry) / rh, s.clip[2] / rw, s.clip[3] / rh] })),
});
const walls = [wall0, ...people.parts.map((p, n) => part(p, n + 1))];
let stopTalk = null;
function openPeople() {
  guide.busy('카메라를 켜는 중');
  unlockAudio(V3 + walls[0].spots[0].audio);          // 누른 순간에 소리를 열어 둔다
  openCam({
    title: '시민사회 · 카페 게르부아', find: people.find, hint: '벽 전체나 창 하나가\n화면에 꽉 차게 비춰 보세요',
    mind: V3 + people.mind, targets: walls.map((w) => ({ title: w.place, img: w.img })), pick: 1,   // 카메라 없이 고르기는 벽 전체 하나만
    hold: true, fx: talkFx(walls),
    onEnter: () => guide.hide(),
    onFail: (msg) => { closeCam(); guide.fail(msg); },
    onClose: () => { stopTalk?.(); showEnd(); },
    onFound: (i, ui) => talk(i, ui),
  });
}
function talk(i, ui) {
  const w = walls[i], n = w.spots.length;
  const panel = (got) => ui.show({
    html: `<div class="dc">${esc(w.place)}</div><div class="dt">${got >= n ? '모두의 이야기를 들었습니다' : '그 시대 사람들의 이야기'}</div><div class="ds">${got >= n ? `${n}명 모두 · 다시 들으려면 그 사람을 누르세요` : `${got} / ${n}명`}</div>`,
    buttons: [{ label: '닫기', cls: got >= n ? '' : 'line', on: async () => { stopTalk?.(); await closeCam(true); showEnd(); } }],
  });
  panel(0);
  stopTalk = startTalk(ui, w, { base: V3, onHeard: (got) => panel(got) });
}
function toColumn() { stage = 'walk'; guide.hide(); c1().scan(); }

// ── 칼럼의 전단지
const FLYER = {
  coach: { img: V3 + 'img/fl_bonmarche.jpg', kind: 'paper' },
  title: '그 모임 이름이 뭐였더라?',
  sub: '칼럼에 붙은 전단지 가운데\n그 모임 이름이 적힌 것을 찾아 비춰 보세요',
  buttons: [{ label: '전단지 찾기', cam: true, on: openFlyer }],
};
function openFlyer() {
  guide.busy('카메라를 켜는 중');
  openCam({
    title: '시민사회 · 모리스 칼럼', find: flyer.find, hint: '전단지가 화면에 가득 차도록\n조금 더 가까이 다가가 보세요',
    mind: V3 + flyer.mind, targets, demo: store.demo(), hold: true, center: true, dots: false,
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
  store.solve(flyer.id); collect(flyer.id); ended = true; document.body.classList.add('ended');
  await closeCam(true);
  const i = c1().ITEMS.findIndex((it) => it.id === 'f1');
  c1().viewer?.focusItem(i, 0.9);
  await new Promise((r) => setTimeout(r, 1100));
  c1().openPrint(i);
  await new Promise((r) => setTimeout(r, 900));
  showEnd();
}
// 끝 — 정답 해설 + 공통 끝 줄. 체험 더보기 = 카페 게르부아 벽면
function showEnd() {
  // 11/06: 미션 완료는 구역 공통 화면(done.js) — 벽면 대화(체험 더보기)에서 돌아와도 같은 화면
  const [name, , ...rest] = flyer.successBody.split('\n');
  showComplete('society', { item: flyer.item, title: name, body: rest.join('\n'), more: (d) => { d.hide(); openPeople(); } });
}

// 끝난 뒤 뒤로 = 목록으로(옛 단계 — 칼럼 · 거리 — 로 되돌아가면 할 일이 없다)
document.getElementById('backBtn')?.addEventListener('click', (e) => {
  if (!ended) return;
  e.stopImmediatePropagation(); location.href = HUB;
}, true);
let readyOnce = false;
window.addEventListener('c1:ready', () => { if (readyOnce) return; readyOnce = true; setTimeout(() => { if (stage === 'start') guide.show(START); }, 1000); });
window.addEventListener('c1:step', (e) => {
  if (ended) return;
  if (e.detail === 2) { stage = 'flyer'; setTimeout(() => guide.show(FLYER), 500); }   // 칼럼 앞에 도착
  else if (e.detail === 3) guide.hide();                                              // 포스터를 떼어 읽는 동안
  else if (e.detail === 1 && stage !== 'start') { stage = 'start'; guide.show(START); }
});
