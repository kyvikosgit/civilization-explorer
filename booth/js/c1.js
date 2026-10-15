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

const stage = $('#stage'), arLayer = $('#arLayer'), mvEl = $('#mv'), frame = $('#frame'), pill = $('#pill'), pillWrap = $('#pillWrap');
const camLoading = $('#camLoading'), modeTag = $('#modeTag'), animEl = $('#anim');

// ── 3D 모리스 칼럼
let loaded = false;
const loadedWaiters = [];
const whenLoaded = () => (loaded ? Promise.resolve() : new Promise((r) => loadedWaiters.push(r)));
let viewer = null;
try {
  viewer = createMorrisViewer(THREE, RoomEnvironment, mvEl, {
    items: ITEMS.map((it) => ({ src: it.src, ratio: it.ratio, row: it.row, active: !!it.active })),
    filler: FILLER, backdrop: BACKDROP,
    onEvent: onViewerEvent,
  });
} catch (e) {
  console.error(e);
}
function onViewerEvent(type, d) {
  if (type === 'loaded') { loaded = true; loadedWaiters.splice(0).forEach((r) => r()); if (flow.current <= 2) camLoading.hidden = true; }
  else if (type === 'error') console.warn('[morris]', d && d.message);
  else if (type === 'tap' && flow.current === 2) {
    if (d.active) flow.to(3);
    else toast('활성화된 전단지를 선택해 주세요');
  }
  else if (type === 'settled' && flow.current === 3) showAnim();
  else if (type === 'release' && flow.current === 3) flow.to(2);
}
function showViewer(on) { mvEl.classList.toggle('off', !on); if (on && viewer) viewer.resize(); }

// ── 상태
let mode = null;            // 'camera' | 'demo' | null(선택 전)
let recognized = false;
let ar = null;              // MindAR 인스턴스
let plainVideo = null;      // MindAR 실패 시 일반 카메라
let runId = 0;              // 단계 재진입 시 이전 비동기 연출 무효화

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

// ── Step1
async function chooseCamera() {
  $('#s1Intro').hidden = true;
  setMode('camera');
  showViewer(false);              // 인식 전에는 카메라 화면
  const ok = await startAR();
  if (!ok) return chooseDemo();
  $('#s1Bottom').hidden = false;
  $('#s1DemoInCam').hidden = false;
  frame.classList.remove('off', 'found');
  setPill(ar ? '모리스 칼럼을 비춰주세요' : '모리스 칼럼을 비춰주세요 · 인식 미지원');
}
async function chooseDemo() {
  const id = ++runId;
  stopAR();
  $('#s1Intro').hidden = true;
  $('#s1Bottom').hidden = false;
  $('#s1DemoInCam').hidden = true;
  setMode('demo');
  showViewer(true);
  frame.classList.remove('off', 'found');
  setPill('모리스 칼럼을 비춰주세요');
  await sleep(1400);
  if (id === runId && flow.current === 1 && !recognized) recognize();
}
async function recognize() {
  const id = ++runId;
  recognized = true;
  frame.classList.add('found');
  setPill('모리스 칼럼을 인식했어요', true);
  if (navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate(30);
  // 카메라는 인식에만 쓰고, 인식 후에는 3D 칼럼(배경 포함)으로 전환
  if (mode === 'camera') { stopAR(); showViewer(true); }
  if (!loaded) { $('#camLoadingText').textContent = '모리스 칼럼 불러오는 중'; camLoading.hidden = false; await whenLoaded(); camLoading.hidden = true; }
  await sleep(500);
  if (id !== runId) return;
  frame.classList.add('off');
  viewer && viewer.setOrbit(true);          // 전단지 회전 효과
  await sleep(5200);
  if (id !== runId || flow.current !== 1) return;
  viewer && viewer.setOrbit(false);         // 칼럼 제자리에 붙는다
  await sleep(1700);
  if (id !== runId || flow.current !== 1) return;
  viewer && viewer.focusItem(ACTIVE_INDEX);  // 활성 전단지를 정면으로
  if (id !== runId || flow.current !== 1) return;
  $('#s1Next').hidden = false;
}
$('#s1Cam').addEventListener('click', chooseCamera);
$('#s1Demo').addEventListener('click', chooseDemo);
$('#s1DemoInCam').addEventListener('click', () => { recognized = false; chooseDemo(); });
$('#s1Next').addEventListener('click', () => flow.to(2));

function resetStep1() {
  runId++;
  recognized = false;
  stopAR();
  setMode(null);
  showViewer(true);                 // 선택 화면 배경은 3D 칼럼
  if (viewer) { viewer.setOrbit(false); viewer.setHighlight(false); viewer.setInteractive(false); viewer.reset(); viewer.setSpotlight(true); }
  $('#s1Intro').hidden = false;
  $('#s1Bottom').hidden = true;
  $('#s1Next').hidden = true;
  frame.classList.add('off');
  setPill('');
  camLoading.hidden = loaded;
  if (!loaded) $('#camLoadingText').textContent = '모리스 칼럼 불러오는 중';
}

// ── Step2: 활성화된 전단지(카페 게르부아)만 숨쉬기 빛 — 압정은 6장 모두
function enterStep2() {
  runId++;
  stopAR();
  if (!mode) setMode('demo');
  showViewer(true);
  frame.classList.add('off');
  if (viewer) {
    viewer.setOrbit(false);
    if (viewer.mode !== 'column') viewer.release();
    viewer.setHighlight(true);
    viewer.setSpotlight(true);                                      // 활성 전단지만 남기고 어둡게
    viewer.setInteractive(true);
    if (viewer.mode === 'column') viewer.focusItem(ACTIVE_INDEX);   // 활성 전단지를 정면으로
  }
  setPill('활성화된 전단지를 터치하세요', true);
}

// ── Step3: 선택한 전단지가 칼럼에서 떼어져 화면 가득 확대 → 그 위에서 삽화 애니메이션 재생
function enterStep3() {
  runId++;
  showViewer(true);
  setPill('');
  frame.classList.add('off');
  if (!viewer) { showAnim(); return; }
  viewer.setInteractive(false);
  if (viewer.mode === 'inspect') { showAnim(); return; }
  if (viewer.mode === 'column') {
    hideAnim();
    const go = () => { if (flow.current === 3 && !viewer.inspect(ACTIVE_INDEX, { fill: true })) setTimeout(go, 200); }; // 회전 중이면 잠시 대기
    whenLoaded().then(go);
  }
}
let animShown = false;
function showAnim() {
  if (animShown) return;
  animShown = true;
  animEl.classList.add('on');
  startAnim();
  setTimeout(() => { if (animShown && viewer) viewer.pause(); }, 500);   // 애니메이션이 덮으면 3D 렌더는 쉰다
}
function hideAnim() {
  animShown = false;
  animEl.classList.remove('on');
  if (animator) animator.stop();
  if (viewer) viewer.resume();
}

// ── 삽화 애니메이션 (내용 변경 없음)
let animator = null;
const subtitle = $('#subtitle'), timeBar = $('#timeBar');
async function startAnim() {
  $('#s4End').hidden = true;
  subtitle.classList.add('off');
  try {
    if (!animator) {
      const img = await loadImage('assets/img/fl_batignolles.jpg');
      const at = parseFloat(new URLSearchParams(location.search).get('at'));
      animator = createFlyerAnimator($('#animCanvas'), img, {
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
        onEnd() { $('#s4End').hidden = false; },
      });
    }
    animator.play();
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
  titles: ['모리스칼럼 광고탑 스캔', '전단지 선택', '전단지 확대 · 삽화 애니메이션'],
  onLeave(prev) {
    if (prev === 3) hideAnim();          // 뒤로 → 애니메이션 닫고 전단지를 칼럼에 돌려놓는다(Step2 진입 시)
  },
  onEnter(n) {
    if (viewer) { viewer.resume(); viewer.resize(); }
    if (n === 1) resetStep1();
    if (n === 2) enterStep2();
    if (n === 3) enterStep3();
  },
});
flow.start();
