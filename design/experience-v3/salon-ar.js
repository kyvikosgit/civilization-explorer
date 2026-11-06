// v3 살롱(11/03 미팅) — 입장 연출이 끝난 벽에서 [후보작 심사하기] → 카메라로 후보작 다섯 점이 걸린 벽 전체를 비춘다
//   → 벽을 알아보면 카메라가 닫히고, 같은 벽이 화면에 그대로 — 거기서 한 점을 눌러 메달(salon.js PICK). 아니면 심사평, 맞으면 수집품
//   벽 인식: 실제 벽 사진이 아직 없어 벽에 걸린 다섯 점 중 하나라도 잡히면 벽으로 본다(mind/salon.mind). 벽 배치가 정해지면 벽 사진으로 다시 만든다
//   체험 더보기(메인 미션 뒤): 후보작을 하나씩 비추면 그 그림의 해설 · 심사 기준(부합/지적) — 예전 그림별 스캔
//   문서 기준(<base>)이 v2 폴더라 v3 자원은 V3 경로로 읽는다
import { ZONES } from './data.js';
import { openCam, closeCam, esc } from './camui.js';
import { makeGuide } from './guide.js';
import { store } from './store.js';

const V3 = '../../experience-v3/';
const task = ZONES.find((z) => z.id === 'salon').tasks[0];
const targets = task.targets.map((t) => ({ ...t, img: V3 + t.img }));
const RATIO = [0.724, 0.65, 0.839, 1.693, 0.574];   // 타깃 세로/가로 — .mind 컴파일 원본 비율(앱 mission-b 와 같은 값)
const WALL = V3 + 'img/salon_wall.jpg';             // 후보작 벽 3D 시안(10/20) — 안내 그림 · 카메라 없이 고르기

// 인식한 그림 위 효과 — 훑는 빛 한 번만. 테두리·후광·메달처럼 그림에 붙어 있는 효과는 그리지 않는다(추적이 흔들리면 떨리고 기울어 보인다)
function fx({ THREE, anchors }) {
  const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
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

// ── 메인: 벽 전체 비추기 → 화면의 벽에서 고르기
const guide = makeGuide();
const INFO = {
  coach: { img: WALL, kind: 'photo', land: true },
  title: '후보작 다섯 점이 걸린 벽 전체를\n카메라로 비춰 보세요',
  sub: '벽이 화면에 뜨면, 그중 올해의 당선작을 골라 주세요',
  buttons: [{ label: '후보작 심사하기', cam: true, on: begin }],
  note: '카메라 권한을 물으면 ‘허용’을 눌러 주세요',
};
let picking = false;
function showGuide() {
  if (guide.shown || picking) return;
  window.__salonGuideH = guide.show(INFO) - 44;       // 벽을 안내 위로 올려 다섯 점이 다 보이게
  window.__salon.to('wall', 700);
}
// 카메라 없이 고르기에는 벽 하나만 — 인식 대상(다섯 점)의 첫 칸을 벽 그림으로
const wallTargets = targets.map((t, i) => (i === 0 ? { ...t, title: '후보작 벽', img: WALL } : t));
function begin() {
  guide.busy('카메라를 켜는 중');
  openCam({
    title: '아카데미 살롱 · 후보작 벽 비추기',
    find: '후보작 다섯 점이 걸린 벽을\n화면에 담아 비춰 보세요',
    hint: '벽에 조금 더 다가가\n그림이 잘 보이게 비춰 보세요',
    mind: V3 + 'mind/salon.mind', targets: wallTargets, pick: 1,
    fx, hold: true,
    onEnter: () => { guide.hide(); window.__salon.to('near', 1600); },
    onFail: (msg) => { closeCam(); guide.fail(msg); },
    onClose: () => { guide.reset(); window.__salon.to('wall', 900); },
    onFound: async () => {
      picking = true;
      navigator.vibrate?.([18, 50, 24]);
      await closeCam(true);
      guide.hide();
      window.__salon.pick();
    },
  });
}

// ── 체험 더보기: 후보작을 하나씩 비추면 해설
function head(i) {
  const t = targets[i];
  return `<div class="dc${t.correct ? ' gold' : ''}">${t.correct ? '올해의 당선작 · 1873년 살롱' : `아카데미 살롱 · 출품 제${i + 1}호`}</div>
    <div class="dt">${esc(t.title)}</div><div class="ds">${esc(t.sub)}</div>`;
}
function more() {
  openCam({
    title: '아카데미 살롱 · 후보작 살펴보기',
    find: '후보작 한 점에 카메라를 비춰 보세요',
    hint: '그림이 화면에 가득 차도록\n조금 더 가까이 다가가 보세요',
    mind: V3 + 'mind/salon.mind', targets, demo: store.demo(), fx, releaseOnLost: true, center: true,
    onFound: (i, ui) => {
      const t = targets[i];
      const hp = `<div class="hp">${t.pro ? `<span class="pro"><b>부합</b>${esc(t.pro)}</span>` : ''}${t.con ? `<span class="con"><b>지적</b>${esc(t.con)}</span>` : ''}</div>`;
      ui.show({ golden: !!t.correct, html: head(i) + `<div class="dd">${esc(t.desc)}</div>` + hp,
        buttons: [{ label: '다른 그림 비추기', cls: 'line', on: () => ui.release() }, { label: '닫기', on: () => closeCam(true) }] });
    },
  });
}
window.addEventListener('salon:more', more);

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
window.addEventListener('salon:wall', () => setTimeout(showGuide, RM ? 0 : 1100));   // 역할 문장을 읽을 틈을 두고 올라온다
window.addEventListener('salon:tap', showGuide);
