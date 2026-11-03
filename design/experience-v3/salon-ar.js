// v3 살롱 — 입장 연출이 끝난 벽에서 화면을 누르면 카메라. 현장의 후보작을 비추면 그 그림의 해설·심사 기준(부합/지적)이 뜬다
// 정답 그림(메르송 〈환상〉)은 화면 가장자리 금빛·금빛 해설 창으로만 알린다 — 그림 위에 따라붙는 후광·메달·금가루는 뺐다(실제 그림이 비스듬하거나 추적이 흔들리면 액자와 어긋나 기울어 보인다)
// 다른 그림은 훑는 빛만. 문서 기준(<base>)이 v2 폴더라 v3 자원은 V3 경로로 읽는다
import { ZONES } from './data.js';
import { openCam, closeCam, esc } from './camui.js';
import { makeGuide } from './guide.js';
import { store } from './store.js';

const V3 = '../../experience-v3/';
const task = ZONES.find((z) => z.id === 'salon').tasks[0];
const targets = task.targets.map((t) => ({ ...t, img: V3 + t.img }));
const RATIO = [0.724, 0.65, 0.839, 1.693, 0.574];   // 타깃 세로/가로 — .mind 컴파일 원본 비율(앱 mission-b 와 같은 값)
const WIN = targets.findIndex((t) => t.correct);

// 인식한 그림 위 효과 — 훑는 빛 한 번만. 테두리·후광·메달처럼 그림에 붙어 있는 효과는 그리지 않는다(추적이 흔들리면 떨리고 기울어 보인다)
function fx({ THREE, anchors }) {
  const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  // 훑는 빛 — 모든 그림
  const sweeps = anchors.map((a, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.05), new THREE.MeshBasicMaterial({ color: 0xfff3d6, opacity: 0, ...add }));
    m.position.z = 0.002; a.group.add(m); return { m, t0: -9, r: RATIO[i] };
  });

  return {
    found(i) { sweeps[i].t0 = performance.now() / 1000; },
    tick() {
      const now = performance.now() / 1000;
      for (const s of sweeps) {
        const p = (now - s.t0) / 0.7;
        s.m.visible = p >= 0 && p <= 1;
        if (s.m.visible) { s.m.position.y = s.r / 2 - p * s.r; s.m.material.opacity = Math.sin(p * Math.PI) * 0.9; }
      }
    },
  };
}

function head(i) {
  const t = targets[i];
  return `<div class="dc${t.correct ? ' gold' : ''}">${t.correct ? '아카데미가 요구하는 덕목을 모두 갖춘 그림' : `아카데미 살롱 · 출품 제${i + 1}호`}</div>
    <div class="dt">${esc(t.title)}</div><div class="ds">${esc(t.sub)}</div>`;
}

function onFound(i, ui) {
  const t = targets[i];
  const hp = `<div class="hp">${t.pro ? `<span class="pro"><b>부합</b>${esc(t.pro)}</span>` : ''}${t.con ? `<span class="con"><b>지적</b>${esc(t.con)}</span>` : ''}</div>`;
  if (t.correct) {
    ui.show({ golden: true, html: head(i) + `<div class="dd">${esc(t.desc)}</div>` + hp,
      buttons: [{ label: '다른 그림 비추기', cls: 'line', on: () => ui.release() }, { label: '이 그림에 메달', cls: 'gold', on: win }] });
    return;
  }
  ui.show({ html: head(i) + `<div class="dd">${esc(t.desc)}</div>` + hp,
    buttons: [
      { label: '다른 그림 비추기', cls: 'line', on: () => ui.release() },
      { label: '이 그림에 메달', on: () => ui.show({ html: head(i) + `<div class="fb">${esc(t.feedback)}</div>`, buttons: [{ label: '다른 그림 비추기', on: () => ui.release() }] }) },
    ] });
}

async function win() {
  await closeCam(true);
  guide.hide();
  window.__salon.award(WIN);
}

// ── 벽 앞 안내 → [후보작 심사하기] → 허용을 기다리는 동안 장면은 그대로 → 다 켜지면 벽으로 다가가며 파인더 자리에 진짜 카메라 창이 열린다
const guide = makeGuide();
const INFO = {
  coach: { img: V3 + 'img/m_cartridges.jpg', kind: 'gilt' },
  title: '벽에 걸린 진짜 그림을\n카메라로 비춰 보세요',
  sub: '특별한 액자의 다섯 점 가운데 1873년 수상작이 있습니다',
  buttons: [{ label: '후보작 심사하기', cam: true, on: begin }],
  note: '카메라 권한을 물으면 ‘허용’을 눌러 주세요',
};
let shownOnce = false;
function showGuide() {
  if (guide.shown) return;
  shownOnce = true;
  window.__salonGuideH = guide.show(INFO) - 44;       // 벽을 안내 위로 올려 다섯 점이 다 보이게
  window.__salon.to('wall', 700);
}
function begin() {
  guide.busy('카메라를 켜는 중');
  openCam({
    title: '아카데미 살롱 · 후보작 심사',
    find: '벽에 걸린 진짜 그림을 비춰 보세요\n특별한 액자의 다섯 점입니다',
    hint: '그림이 화면에 가득 차도록\n조금 더 가까이 다가가 보세요',
    mind: V3 + 'mind/salon.mind',
    targets, demo: store.demo(), fx, onFound, hold: true, releaseOnLost: true,   // 그림이 화면에서 벗어나면 다시 찾는 화면으로
    onEnter: () => { guide.hide(); window.__salon.to('near', 1600); },
    onFail: (msg) => { closeCam(); guide.fail(msg); },
    onClose: () => { guide.reset(); window.__salon.to('wall', 900); },
  });
}
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
window.addEventListener('salon:wall', () => setTimeout(showGuide, RM ? 0 : 1100));   // 역할 문장을 읽을 틈을 두고 올라온다
window.addEventListener('salon:tap', showGuide);
