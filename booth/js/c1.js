// C-1 시민사회 체험 부스 — Step1 모리스칼럼 스캔 → Step2 전단지 선택 → Step3 전단지 확대 · 삽화 애니메이션
// (2026-10-15 클라이언트 피드백: 활성 전단지 외 전부 어둡게 / 선택 즉시 화면 가득 확대 → 그 자리에서 애니메이션, 설명 카드 없음)
// 3D 칼럼 = kippu-app 모리스 칼럼 뷰어 이식본 (js/morris-viewer.js)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { $, $$, ICON, createFlow, toast, sleep, startCamera, stopCamera, cameraErrorText, cameraSupported, loadImage } from './common.js';
import { createMorrisViewer } from './morris-viewer.js';
import { ITEMS, FILLER, BACKDROP } from './morris-items.js';
import { createFlyerAnimator } from './flyer-anim.js';

const ACTIVE_INDEX = ITEMS.findIndex((it) => it.active);

$$('[data-ic]').forEach((e) => (e.outerHTML = ICON[e.dataset.ic]));

const stage = $('#stage'), arLayer = $('#arLayer'), mvEl = $('#mv'), pill = $('#pill'), pillWrap = $('#pillWrap');
const camLoading = $('#camLoading'), modeTag = $('#modeTag');

// ── 3D 모리스 칼럼
let loaded = false;
const loadedWaiters = [];
const whenLoaded = () => (loaded ? Promise.resolve() : new Promise((r) => loadedWaiters.push(r)));
let viewer = null;
try {
  viewer = createMorrisViewer(THREE, RoomEnvironment, mvEl, {
    items: ITEMS.map((it) => ({ src: it.src, ratio: it.ratio, row: it.row, active: true })),   // 6장 모두 압정·가장자리 빛, 모두 떼어 볼 수 있다
    filler: FILLER, backdrop: BACKDROP,
    onEvent: onViewerEvent,
  });
} catch (e) {
  console.error(e);
}
function onViewerEvent(type, d) {
  if (type === 'loaded') { loaded = true; loadedWaiters.splice(0).forEach((r) => r()); if (flow.current <= 2) camLoading.hidden = true; }
  else if (type === 'error') console.warn('[morris]', d && d.message);
  else if (type === 'tap' && flow.current === 2) { picked = d.index; flow.to(3); }
  else if (type === 'settled' && flow.current === 3) onSettled();
  else if (type === 'release' && flow.current === 3) flow.to(2);
}
function showViewer(on) { mvEl.classList.toggle('off', !on); if (on && viewer) viewer.resize(); }

// ── 상태
let mode = null;            // 'camera' | 'demo' | null(선택 전)
let recognized = false;
let ar = null;              // MindAR 인스턴스
let plainVideo = null;      // MindAR 실패 시 일반 카메라
let runId = 0;              // 단계 재진입 시 이전 비동기 연출 무효화
let picked = ACTIVE_INDEX;  // 떼어 낸 전단지 (6장 중 하나)

function setPill(text, found = false) {
  pill.textContent = text || '';
  pill.classList.toggle('found', found);
  pillWrap.classList.toggle('off', !text);
}
function setMode(m) {
  mode = m;
  modeTag.textContent = m === 'demo' ? '데모' : m === 'camera' ? '카메라' : '';
}

// ── MindAR (Step1 인식 전용 — 칼럼에 붙은 전단지 이미지 타깃: kippu_flyer.mind, 0 바티뇰파 · 1 봉 마르셰 · 2 만국 박람회)
async function startAR() {
  $('#camLoadingText').textContent = '카메라 준비 중';
  camLoading.hidden = false;
  try {
    if (!cameraSupported()) throw Object.assign(new Error('camera'), { name: window.isSecureContext ? 'no_media' : 'insecure' });
    const { MindARThree } = await import('mindar-image-three');
    arLayer.innerHTML = '';
    const mindar = new MindARThree({
      container: arLayer, imageTargetSrc: 'assets/mind/kippu_flyer.mind',
      maxTrack: 1, uiScanning: 'no', uiLoading: 'no', uiError: 'no', filterMinCF: 0.0001, filterBeta: 0.003,
    });
    const { renderer, scene, camera } = mindar;
    [0, 1, 2].forEach((i) => { const a = mindar.addAnchor(i); a.onTargetFound = () => onFound(); });
    await mindar.start();
    renderer.setAnimationLoop(() => renderer.render(scene, camera));
    ar = { stop() { try { renderer.setAnimationLoop(null); mindar.stop(); } catch (e) { /* noop */ } arLayer.innerHTML = ''; } };
    camLoading.hidden = true;
    return true;
  } catch (e) {
    console.warn('MindAR unavailable', e);
    camLoading.hidden = true;
    try {
      arLayer.innerHTML = '<video playsinline muted autoplay></video>';
      plainVideo = arLayer.querySelector('video');
      await startCamera(plainVideo);
      toast('이미지 인식을 시작하지 못해 카메라 화면만 표시합니다. ‘데모로 진행’으로 이어갈 수 있습니다.', 3600);
      return true;
    } catch (e2) {
      arLayer.innerHTML = ''; plainVideo = null;
      toast(`${cameraErrorText(e2)} 데모로 진행합니다.`, 3000);
      return false;
    }
  }
}
function stopAR() {
  if (ar) { ar.stop(); ar = null; }
  if (plainVideo) { stopCamera(plainVideo); plainVideo = null; arLayer.innerHTML = ''; }
}
function onFound() { if (flow.current === 1 && mode === 'camera' && !recognized) recognize(); }

// ── Step1: 스캔 — 카메라(또는 어두운 바탕) 위에 칼럼 윤곽 점선만. 인식되면 윤곽이 채워지고 3D 칼럼으로
// 윤곽 = 3D 모델(morris-viewer.js)의 실측 반지름 프로파일 [반지름, 높이] (지름 D=1) — 받침·몸체·처마·돔·첨탑
const PROFILE = [[0.55, 0], [0.585, 0.03], [0.612, 0.06], [0.618, 0.08], [0.618, 0.207], [0.61, 0.24], [0.6, 0.26], [0.578, 0.28],
  [0.567, 0.3], [0.557, 0.323], [0.557, 0.54], [0.57, 0.56], [0.577, 0.567], [0.577, 0.6], [0.565, 0.62], [0.55, 0.641], [0.535, 0.655],
  [0.515, 0.67], [0.513, 0.713], [0.5, 0.728], [0.5, 2.906], [0.506, 2.92], [0.513, 2.95], [0.543, 2.964], [0.56, 2.993], [0.545, 3.02],
  [0.545, 3.11], [0.56, 3.123], [0.59, 3.152], [0.598, 3.17], [0.598, 3.185], [0.57, 3.205], [0.5, 3.225], [0.45, 3.24], [0.442, 3.255],
  [0.44, 3.27], [0.44, 3.3], [0.443, 3.3], [0.443, 3.325], [0.45, 3.325], [0.468, 3.354], [0.48, 3.398], [0.477, 3.441], [0.467, 3.484],
  [0.442, 3.528], [0.407, 3.571], [0.358, 3.614], [0.31, 3.643], [0.242, 3.672], [0.2, 3.687], [0.17, 3.7], [0.167, 3.716], [0.154, 3.73],
  [0.12, 3.745], [0.065, 3.759], [0.046, 3.773], [0.034, 3.802], [0.044, 3.817], [0.067, 3.846], [0.068, 3.86], [0.063, 3.875],
  [0.052, 3.889], [0.034, 3.904], [0.023, 3.918], [0.027, 3.947], [0.036, 3.961], [0.035, 3.975], [0.023, 3.99], [0.014, 4.019],
  [0.018, 4.063], [0.01, 4.092], [0.003, 4.164], [0, 4.165]];
(function buildGuide() {
  const H = 4.165, pt = ([r, y]) => `${r.toFixed(3)},${(H - y).toFixed(3)}`;
  const right = PROFILE.map(pt), left = PROFILE.slice().reverse().map(([r, y]) => pt([-r, y]));
  const outline = `M${right.join(' L')} L${left.join(' L')} Z`;
  // 몸체 위·아래 경계, 처마 띠 — 보조선
  const bands = [[0.5, 0.728], [0.5, 2.906], [0.545, 3.02], [0.545, 3.11]].map(([r, y]) => `M${pt([-r, y])} L${pt([r, y])}`).join(' ');
  const svg = $('#guideSvg');
  svg.setAttribute('viewBox', `-0.68 -0.05 1.36 ${H + 0.1}`);
  svg.innerHTML = `<path class="g-fill" d="${outline}"/><path class="g-band" d="${bands}"/><path class="g-line" d="${outline}"/>`;
})();
const guide = $('#guide');
function showGuide(on) { guide.classList.toggle('off', !on); if (on) guide.classList.remove('found'); }

async function chooseCamera() {
  setMode('camera');
  showViewer(false);
  showGuide(true);
  $('#s1Cam').hidden = true;
  const ok = await startAR();
  if (!ok) { $('#s1Cam').hidden = true; return chooseDemo(); }
  setPill(ar ? '모리스 칼럼을 점선에 맞춰 비춰주세요' : '모리스 칼럼을 점선에 맞춰 비춰주세요 · 인식 미지원');
}
async function chooseDemo() {
  const id = ++runId;
  stopAR();
  setMode('demo');
  $('#s1Cam').hidden = true; $('#s1Demo').hidden = true;
  showViewer(false);
  showGuide(true);
  setPill('모리스 칼럼을 점선에 맞춰 비춰주세요');
  await sleep(1200);                                   // 데모: 잠시 뒤 인식된 것으로
  if (id === runId && flow.current === 1 && !recognized) recognize();
}
async function recognize() {
  const id = ++runId;
  recognized = true;
  guide.classList.add('found');                        // 윤곽이 채워지며 확인
  setPill('모리스 칼럼을 인식했어요', true);
  if (navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate(30);
  if (mode === 'camera') stopAR();
  if (!loaded) { $('#camLoadingText').textContent = '모리스 칼럼 불러오는 중'; camLoading.hidden = false; await whenLoaded(); camLoading.hidden = true; }
  await sleep(650);
  if (id !== runId || flow.current !== 1) return;
  flow.to(2);                                          // 인식 → 바로 3D 칼럼 (버튼 없음)
}
$('#s1Cam').addEventListener('click', chooseCamera);
$('#s1Demo').addEventListener('click', () => { recognized = false; chooseDemo(); });

function resetStep1() {
  runId++;
  recognized = false;
  stopAR();
  setMode(null);
  showViewer(false);                                   // 스캔 화면에는 3D 칼럼을 깔지 않는다
  showGuide(true);
  if (viewer) { viewer.setHighlight(false); viewer.setInteractive(false); viewer.reset(); }
  $('#s1Cam').hidden = false; $('#s1Demo').hidden = false;
  setPill('모리스 칼럼을 점선에 맞춰 비춰주세요');
  camLoading.hidden = true;
}

// ── Step2: 활성화된 전단지(카페 게르부아)만 숨쉬기 빛 — 압정은 6장 모두
// ── Step2: 인식 직후부터 3D 칼럼을 자유롭게 — 드래그 회전·핀치 확대, 6장 중 아무 전단지나 눌러 떼어 본다
//   전체를 어둡게 덮지 않는다. 떼어 볼 수 있는 6장은 압정 + 가장자리 빛으로 구분 (앱 뷰어 v4 와 같음)
function enterStep2(prev) {
  runId++;
  stopAR();
  if (!mode) setMode('demo');
  showViewer(true);
  showGuide(false);
  setPill('');
  if (viewer) {
    if (viewer.mode !== 'column') viewer.release();
    viewer.setSpotlight(false);
    viewer.setHighlight(true);
    viewer.setInteractive(true);
    if (prev === 1) viewer.reset();               // 처음 들어올 때: 앱처럼 천천히 도는 기본 시점
  }
}

// ── Step3: 떼어 낸 전단지가 화면 가운데 3D 로 떠 있다 (배경은 흐리고 어둡게, 끌어서 돌리기·핀치 확대)
//   카페 게르부아는 그 떠 있는 종이 위에서 삽화 애니메이션이 재생된다 (애니메이션 캔버스 → 종이 텍스처)
function enterStep3() {
  runId++;
  showViewer(true);
  setPill('');
  showGuide(false);
  $('#closeBtn').hidden = false; modeTag.hidden = true;
  $('#caption').hidden = true; $('#animHud').hidden = true;
  if (!viewer) return;
  viewer.setInteractive(true);
  if (viewer.mode === 'inspect') { onSettled(); return; }
  if (viewer.mode === 'column') {
    const go = () => { if (flow.current === 3 && !viewer.inspect(picked)) setTimeout(go, 200); };
    whenLoaded().then(go);
  }
}
function onSettled() {
  if (picked === ACTIVE_INDEX) { $('#animHud').hidden = false; startAnim(); return; }
  const it = ITEMS[picked];
  $('#cTitle').textContent = it.label;
  $('#cBody').textContent = it.body || '';
  $('#cMeta').textContent = it.meta || '';
  $('#caption').hidden = false;
}
function leaveStep3() {
  if (animator) animator.stop();
  if (viewer) viewer.setInspectMap(null);
  $('#caption').hidden = true; $('#animHud').hidden = true;
  $('#closeBtn').hidden = true; modeTag.hidden = false;
}
$('#closeBtn').addEventListener('click', () => flow.to(2));   // 닫기 = 전단지를 칼럼에 돌려놓고 계속 둘러보기

// ── 삽화 애니메이션 — 화면 전체가 아니라 떠 있는 종이의 텍스처로 그린다 (내용은 그대로)
let animator = null;
const animCanvas = document.createElement('canvas');
animCanvas.width = 631 * 2; animCanvas.height = 946 * 2;       // 전단지 원본 비율 그대로
const subtitle = $('#subtitle'), timeBar = $('#timeBar');
async function startAnim() {
  $('#s4Replay').hidden = true;
  subtitle.classList.add('off');
  try {
    if (!animator) {
      const img = await loadImage('assets/img/fl_batignolles.jpg');
      const at = parseFloat(new URLSearchParams(location.search).get('at'));
      animator = createFlyerAnimator(animCanvas, img, {
        fixedView: true,
        freezeAt: Number.isFinite(at) ? at : null,
        onLine(line) {
          subtitle.classList.add('off');
          setTimeout(() => {
            if (!line) { subtitle.innerHTML = ''; return; }
            subtitle.innerHTML = `<span class="who">인물 ${line}</span><span class="placeholder">대사 미정</span>`;
            subtitle.classList.remove('off');
          }, 250);
        },
        onTime(p) { timeBar.style.width = `${(p * 100).toFixed(1)}%`; },
        onEnd() { $('#s4Replay').hidden = false; },
      });
    }
    if (flow.current !== 3) return;
    animator.play();
    viewer && viewer.setInspectMap(animCanvas);
  } catch (e) {
    console.error(e);
    const m = $('#animErr'); m.hidden = false; m.textContent = '이 기기에서 애니메이션(WebGL)을 실행할 수 없습니다.';
  }
}
$('#s4Replay').addEventListener('click', startAnim);

// ── 흐름
const flow = createFlow({
  total: 3,
  booth: '4층 C-1 시민사회',
  titles: ['모리스칼럼 광고탑 스캔', '모리스 칼럼', '전단지 확대'],
  onLeave(prev) {
    if (prev === 3) leaveStep3();        // 뒤로·닫기 → 애니메이션 멈추고 전단지를 칼럼에 돌려놓는다(Step2 진입 시)
  },
  onEnter(n, prev) {
    if (viewer) { viewer.resume(); viewer.resize(); }
    if (n === 1) resetStep1();
    if (n === 2) enterStep2(prev);
    if (n === 3) enterStep3();
  },
});
flow.start();
