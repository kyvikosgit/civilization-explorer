// v3 살롱 — 11/23부터 스캔 없음: 벽 앞에 서면 바로 후보작 다섯 점이 떠올라 그중에서 고른다(아래 startPick)
// (이전, 11/03 미팅) 입장 연출이 끝난 벽에서 [후보작 심사하기] → 카메라로 후보작 다섯 점이 걸린 벽 전체를 비춘다
//   → 벽을 알아보면 카메라가 닫히고, 같은 벽이 화면에 그대로 — 거기서 한 점을 눌러 메달(salon.js PICK). 아니면 심사평, 맞으면 수집품
//   벽 인식: 실제 벽 사진이 아직 없어 벽에 걸린 다섯 점 중 하나라도 잡히면 벽으로 본다(mind/salon.mind). 벽 배치가 정해지면 벽 사진으로 다시 만든다
//   체험 더보기(메인 미션 뒤): 후보작을 하나씩 비추면 그 그림의 해설 · 심사 기준(부합/지적) — 예전 그림별 스캔
//   문서 기준(<base>)이 v2 폴더라 v3 자원은 V3 경로로 읽는다
import { ZONES } from './data.js';
import { openCam, closeCam, esc } from './camui.js';
import { makeGuide } from './guide.js';
import { store, againIds } from './store.js';

const V3 = '../../experience-v3/';
const task = ZONES.find((z) => z.id === 'salon').tasks[0];
const targets = task.targets.map((t) => ({ ...t, img: V3 + t.img }));
const RATIO = [1.416, 1.416, 0.706, 1.416, 1.416];   // 타깃 세로/가로 — .mind 컴파일 원본 비율(앱 mission-b 와 같은 값) · 11/17 전개도 최종 A1 재단본
const WALL = V3 + 'img/salon_wall.jpg';             // 후보작 벽 — 11/17 전개도 최종 B 정면(안내 그림 · 카메라 없이 고르기). 이전 시안은 salon_wall_1020.jpg

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
const INFO = {   // 11/27 다시 현장 스캔: 벽 앞 안내 → [수상작 찾기] → 8th Wall 스캔 화면(xr8/salon-scan.html)
  coach: { img: WALL, kind: 'photo', land: true },
  title: '벽의 후보작 가운데\n1등급 메달을 받은 그림을 찾아 비춰 보세요',
  sub: '수상작을 비추면 그림 둘레가 금빛으로 빛납니다',
  buttons: [{ label: '수상작 찾기', cam: true, on: () => toScan() }],
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
      window.__salon.pick();   // 11/17: 카메라가 닫히기 전에 뒤 장면을 '비춘 그대로'(다섯 점 가로 한 줄)로 맞춰 두고
      guide.hide();
      await closeCam(true);
      window.__salon.arrange();   // 닫히면 그 자리에서 다섯 점이 세로 2 · 1 · 2 로 옮겨 간다
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
// 11/23 클라이언트 변경: 스캔하지 않는다 — 벽 앞에 서면 카메라 안내 · 다가가는 카메라 움직임 · 찍는 화면 없이
//   바로 후보작 다섯 점이 벽 앞으로 떠올라(2 · 1 · 2) 그중에서 고른다(salon.js PICK). 예전 카메라 흐름(showGuide · begin)은 남겨 둠(안 부름)
function startPick() {
  if (picking) return;
  picking = true;
  window.__salon.pick();
  window.__salon.arrange();
}
void showGuide; void startPick;
// 11/27 다시 현장 스캔(사용자 지시): 입장 연출이 벽에 닿으면 8th Wall 스캔 화면으로 — 벽의 후보작 중 1등급 메달 그림을 비추면 그 그림 둘레에 같은 오라(AR) → 완료 화면
//   (11/23 의 '화면에서 고르기'는 startPick 으로 남겨 둠, 안 부름) · 도입만 보는 경우(?intro=only)는 넘어가지 않음
let gone = false;
function toScan() {
  if (gone || window.M100_INTRO?.mode === 'only' || store.saved('salon')) return; gone = true;
  // 앱 안(폰 안 묶음 file://)에는 8th Wall 페이지가 없으므로 사이트에서 연다(시민사회 벽 AR 과 같음)
  const base = location.protocol === 'file:' ? 'https://it-ta.com/design/experience-v3/xr8/salon-scan.html' : new URL(V3 + 'xr8/salon-scan.html', document.baseURI).href.split('?')[0];
  const q = new URLSearchParams(location.search); q.delete('again');
  if (againIds().includes('salon')) q.set('again', 'salon');   // 완료 화면의 '다시 체험하기'에서 왔으면 스캔 화면도 처음부터
  location.href = base + '?' + q.toString();
}
window.addEventListener('salon:wall', () => setTimeout(() => { if (!store.saved('salon') && window.M100_INTRO?.mode !== 'only') showGuide(); }, RM ? 0 : 500));
window.addEventListener('salon:tap', () => { if (!guide.shown) showGuide(); });
