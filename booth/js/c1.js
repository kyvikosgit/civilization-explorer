// C-1 시민사회 체험 부스 — Step1 모리스칼럼 스캔 → Step2 전단지 선택 → Step3 전단지 확대 → Step4 삽화 애니메이션
import * as THREE from 'three';
import { $, $$, ICON, createFlow, sheet, toast, sleep, startCamera, stopCamera, cameraErrorText, cameraSupported, loadImage } from './common.js';
import { createColumnScene, POSTERS } from './column3d.js';
import { createFlyerAnimator } from './flyer-anim.js';

// 전단지 원고 — kippu-app/src/lib/missions.ts (mission id 'flyer') 문구 그대로
const FLYER = {
  label: '까페 게르부아 — 바티뇰파 모임',
  sub: '매주 목요일과 일요일 저녁, 까페 게르부아의 한 켠에서 바티뇰파 모임이 열립니다. 관심 있는 자, 누구든 환영합니다.',
  body: '바티뇰파(École des Batignolles)\n\n카페가 있던 바티뇰 지역의 이름을 딴 것으로, 마네를 중심으로 모네·르누아르·드가·바지유 등이 모였습니다.\n이들 대부분이 훗날 "인상주의"라는 이름으로 불리게 됩니다.',
  meta: '〈카페 게르부아 안내문〉 바티뇰파의 모임 장소, 1870년대',
};

$$('[data-ic]').forEach((e) => (e.outerHTML = ICON[e.dataset.ic]));
$$('[data-fleuron]').forEach((e) => (e.outerHTML = ICON.fleuron));

const stage = $('#stage'), arLayer = $('#arLayer'), frame = $('#frame'), pill = $('#pill'), pillWrap = $('#pillWrap');
const camLoading = $('#camLoading'), modeTag = $('#modeTag');

// ── 3D 장면 (데모 칼럼 + 궤도 효과 오버레이)
let scene3d = null;
try {
  scene3d = createColumnScene(THREE, $('#gl'));
} catch (e) {
  console.error(e);
}

// ── 상태
let mode = null;            // 'camera' | 'demo' | null(선택 전)
let recognized = false;
let ar = null;              // { mindar, tracked:Set, stop() }
let plainVideo = null;      // MindAR 실패 시 일반 카메라
let flyFrom = null;         // Step3 확대 전환 시작 사각형

function setPill(text, found = false) {
  pill.textContent = text;
  pill.classList.toggle('found', found);
  pillWrap.classList.toggle('off', !text);
}
function setMode(m) {
  mode = m;
  document.body.classList.toggle('demo', m === 'demo');
  modeTag.textContent = m === 'demo' ? '데모' : m === 'camera' ? '카메라' : '';
  if (scene3d) scene3d.setMode(m === 'camera' ? 'camera' : 'demo');
}

// ── MindAR (전단지 이미지 타깃: kippu_flyer.mind — 0 바티뇰파, 1 봉 마르셰, 2 만국 박람회)
const MIND_RATIOS = [1.499, 1.502, 1.502];
async function startAR() {
  camLoading.hidden = false;
  try {
    if (!cameraSupported()) throw Object.assign(new Error(window.isSecureContext ? 'no_media' : 'insecure'), { name: window.isSecureContext ? 'no_media' : 'insecure' });
    const { MindARThree } = await import('mindar-image-three');
    arLayer.innerHTML = '';
    const mindar = new MindARThree({
      container: arLayer, imageTargetSrc: 'assets/mind/kippu_flyer.mind',
      maxTrack: 1, uiScanning: 'no', uiLoading: 'no', uiError: 'no', filterMinCF: 0.0001, filterBeta: 0.003,
    });
    const { renderer, scene, camera } = mindar;
    const tracked = new Set();
    const frames = MIND_RATIOS.map((ratio, i) => {
      const anchor = mindar.addAnchor(i);
      const active = POSTERS[i].active;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.16, ratio + 0.16), new THREE.ShaderMaterial({
        uniforms: { uAmt: { value: 0 }, uTime: { value: 0 }, uSize: { value: new THREE.Vector2(1.16, ratio + 0.16) }, uActive: { value: active ? 1 : 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `uniform float uAmt, uTime, uActive; uniform vec2 uSize; varying vec2 vUv;
          void main(){ vec2 p = (vUv - 0.5) * uSize; vec2 q = abs(p) - (uSize * 0.5 - vec2(0.08));
            float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
            float edge = exp(-pow(max(d, 0.0) / 0.05, 2.0)) * uActive;
            float line = smoothstep(0.016, 0.0, abs(d));
            float pulse = mix(1.0, 0.65 + 0.35 * sin(uTime * 3.2), uActive);
            vec3 c = mix(vec3(0.95, 0.92, 0.85), vec3(1.0, 0.82, 0.45), uActive);
            float a = (edge * 0.8 + line * mix(0.45, 1.0, uActive)) * step(-0.006, d) * pulse * uAmt;
            gl_FragColor = vec4(c * a, a); }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      m.position.z = 0.002;
      anchor.group.add(m);
      anchor.onTargetFound = () => { tracked.add(i); onTrack(); };
      anchor.onTargetLost = () => { tracked.delete(i); onTrack(); };
      return { anchor, mesh: m, ratio };
    });
    await mindar.start();
    const t0 = performance.now();
    renderer.setAnimationLoop(() => {
      const t = (performance.now() - t0) / 1000;
      const showFrames = flow.current === 2;
      frames.forEach((f) => { f.mesh.material.uniforms.uTime.value = t; f.mesh.material.uniforms.uAmt.value = showFrames ? 1 : 0; });
      renderer.render(scene, camera);
    });
    // 화면 좌표 사각형 (탭 판정 · 확대 전환)
    const v3 = new THREE.Vector3();
    const rectOf = (i) => {
      const r = MIND_RATIOS[i];
      const cw = arLayer.clientWidth, ch = arLayer.clientHeight;
      const pts = [[-0.5, r / 2], [0.5, r / 2], [0.5, -r / 2], [-0.5, -r / 2]].map(([x, y]) => {
        v3.set(x, y, 0).applyMatrix4(frames[i].anchor.group.matrixWorld).project(camera);
        return [(v3.x * 0.5 + 0.5) * cw, (1 - (v3.y * 0.5 + 0.5)) * ch];
      });
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const b = arLayer.getBoundingClientRect();
      return { left: b.left + Math.min(...xs), top: b.top + Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    };
    ar = {
      mindar, tracked, rectOf,
      stop() { try { renderer.setAnimationLoop(null); mindar.stop(); } catch (e) { /* noop */ } arLayer.innerHTML = ''; },
    };
    camLoading.hidden = true;
    return true;
  } catch (e) {
    console.warn('MindAR unavailable', e);
    camLoading.hidden = true;
    // 이미지 인식 없이 일반 카메라라도 띄운다
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

// 카메라 모드 인식 이벤트
function onTrack() {
  if (!ar) return;
  if (flow.current === 1 && !recognized && ar.tracked.size > 0) recognize();
  if (flow.current === 2) updateStep2Pill();
}
function updateStep2Pill() {
  if (mode !== 'camera') return;
  if (ar && ar.tracked.has(0)) setPill('활성화된 전단지를 터치하세요', true);
  else if (ar && ar.tracked.size) setPill('활성화된 전단지가 아닙니다 · 다른 전단지를 비춰보세요');
  else setPill('전단지를 인식해보세요');
}

// ── Step1
async function chooseCamera() {
  $('#s1Intro').hidden = true;
  setMode('camera');
  const ok = await startAR();
  if (!ok) return chooseDemo();
  $('#s1Bottom').hidden = false;
  $('#s1DemoInCam').hidden = false;
  frame.classList.remove('off', 'found');
  setPill(ar ? '모리스 칼럼을 비춰주세요' : '모리스 칼럼을 비춰주세요 · 인식 미지원');
}
async function chooseDemo() {
  stopAR();
  $('#s1Intro').hidden = true;
  $('#s1Bottom').hidden = false;
  $('#s1DemoInCam').hidden = true;
  setMode('demo');
  frame.classList.remove('off', 'found');
  setPill('모리스 칼럼을 비춰주세요');
  await sleep(1400);
  if (flow.current === 1 && mode === 'demo' && !recognized) recognize();
}
async function recognize() {
  recognized = true;
  frame.classList.add('found');
  setPill('모리스 칼럼을 인식했어요', true);
  if (navigator.vibrate) navigator.vibrate(30);
  await sleep(500);
  frame.classList.add('off');
  scene3d && scene3d.setPhase('orbit');
  await sleep(3200);
  if (flow.current === 1 && recognized) $('#s1Next').hidden = false;
}
$('#s1Cam').addEventListener('click', chooseCamera);
$('#s1Demo').addEventListener('click', chooseDemo);
$('#s1DemoInCam').addEventListener('click', () => { recognized = false; chooseDemo(); });
$('#s1Next').addEventListener('click', () => flow.to(2));

function resetStep1() {
  recognized = false;
  stopAR();
  setMode(null);
  document.body.classList.add('demo');      // 선택 화면 배경은 데모 칼럼
  scene3d && (scene3d.setMode('demo'), scene3d.setPhase('attached'), scene3d.setHighlight(false), scene3d.setView('full'), scene3d.setInteractive(false), scene3d.resetSpin());
  $('#s1Intro').hidden = false;
  $('#s1Bottom').hidden = true;
  $('#s1Next').hidden = true;
  frame.classList.add('off');
  setPill('');
}

// ── Step2
function enterStep2() {
  frame.classList.add('off');
  if (mode === 'camera') {
    $('#s2DemoInCam').hidden = false;
    scene3d && (scene3d.setPhase('attached'), scene3d.setInteractive(false));
    if (!ar && !plainVideo) startAR().then(updateStep2Pill);
    updateStep2Pill();
  } else {
    setMode('demo');
    $('#s2DemoInCam').hidden = true;
    scene3d && (scene3d.setPhase('attached'), scene3d.setView('close'), scene3d.setHighlight(true), scene3d.setInteractive(true));
    setPill('전단지를 인식해보세요');
    setTimeout(() => { if (flow.current === 2 && mode === 'demo') setPill('활성화된 전단지를 터치하세요', true); }, 1700);
  }
}
$('#s2DemoInCam').addEventListener('click', () => { stopAR(); setMode('demo'); enterStep2(); });

scene3d && scene3d.onTap((p) => {
  if (flow.current !== 2) return;
  if (p && p.active) { flyFrom = scene3d.screenRect(p.id); flow.to(3); }
  else if (p) toast('활성화된 전단지를 선택해 주세요');
});
// 카메라 모드 탭 — 추적 중인 바티뇰파 전단지 영역(여유 포함)을 누르면 선택
stage.addEventListener('click', (e) => {
  if (flow.current !== 2 || mode !== 'camera' || !ar) return;
  if (e.target.closest('button')) return;
  if (!ar.tracked.has(0)) { if (ar.tracked.size) toast('활성화된 전단지를 선택해 주세요'); return; }
  const r = ar.rectOf(0), pad = 40;
  if (e.clientX > r.left - pad && e.clientX < r.left + r.width + pad && e.clientY > r.top - pad && e.clientY < r.top + r.height + pad) {
    flyFrom = r; flow.to(3);
  }
});

// ── Step3: 확대 + 핀치/더블탭 줌
const s3Img = $('#s3Img'), zoomer = $('#zoomer');
$('#s3Label').textContent = FLYER.label;
$('#shTitle').textContent = FLYER.label;
$('#shSub').textContent = FLYER.sub;
{
  const [head, ...rest] = FLYER.body.split('\n\n');
  $('#shBody').innerHTML = `<b>${head}</b>${rest.join('\n\n')}`;
}
$('#shMeta').textContent = FLYER.meta;
const infoSheet = sheet($('#infoSheet'));
$('#s3Info').addEventListener('click', () => infoSheet.open());
$('#s3Next').addEventListener('click', () => flow.to(4));

let zs = 1, zx = 0, zy = 0;
const applyZoom = () => { s3Img.style.transform = `translate(${zx}px, ${zy}px) scale(${zs})`; };
function resetZoom() { zs = 1; zx = 0; zy = 0; s3Img.style.transition = 'transform .25s'; applyZoom(); }
function clampPan() {
  const w = s3Img.offsetWidth, h = s3Img.offsetHeight;
  zx = Math.min(0, Math.max(w - w * zs, zx)); zy = Math.min(0, Math.max(h - h * zs, zy));
}
{
  const pts = new Map(); let pinch = null, lastTap = 0, pan = null;
  zoomer.addEventListener('pointerdown', (e) => {
    zoomer.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    s3Img.style.transition = 'none';
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: zs, x: zx, y: zy, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    } else {
      pan = { x: e.clientX, y: e.clientY, zx, zy };
      const now = performance.now();
      if (now - lastTap < 300) {
        const r = s3Img.getBoundingClientRect();
        if (zs > 1.05) resetZoom();
        else { const ox = e.clientX - r.left, oy = e.clientY - r.top; zs = 2.4; zx = -ox * (zs - 1); zy = -oy * (zs - 1); clampPan(); s3Img.style.transition = 'transform .25s'; applyZoom(); }
        lastTap = 0;
      } else lastTap = now;
    }
  });
  zoomer.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const ns = Math.max(1, Math.min(4, pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
      const r = zoomer.getBoundingClientRect();
      const ox = pinch.cx - r.left - s3Img.offsetLeft, oy = pinch.cy - r.top - s3Img.offsetTop;
      zx = ox - (ox - pinch.x) * ns / pinch.s; zy = oy - (oy - pinch.y) * ns / pinch.s; zs = ns;
      clampPan(); applyZoom();
    } else if (pan && zs > 1) {
      zx = pan.zx + e.clientX - pan.x; zy = pan.zy + e.clientY - pan.y; clampPan(); applyZoom();
    }
  });
  const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) pan = null; };
  zoomer.addEventListener('pointerup', up); zoomer.addEventListener('pointercancel', up);
}

async function flyIn() {
  if (!flyFrom || flyFrom.width < 4) { flyFrom = null; return; }
  s3Img.classList.add('hold');
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const to = s3Img.getBoundingClientRect();
  const fly = document.createElement('img');
  fly.src = s3Img.src; fly.className = 'fly';
  Object.assign(fly.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` });
  document.body.appendChild(fly);
  const sx = flyFrom.width / to.width, sy = flyFrom.height / to.height;
  const anim = fly.animate([
    { transform: `translate(${flyFrom.left - to.left}px, ${flyFrom.top - to.top}px) scale(${sx}, ${sy})`, transformOrigin: '0 0', opacity: 0.9 },
    { transform: 'translate(0,0) scale(1,1)', transformOrigin: '0 0', opacity: 1 },
  ], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' });
  await anim.finished.catch(() => {});
  s3Img.classList.remove('hold'); fly.remove(); flyFrom = null;
}

// ── Step4: 삽화 애니메이션
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
  total: 4,
  booth: '4층 C-1 시민사회',
  titles: ['모리스칼럼 광고탑 스캔', '전단지 선택', '전단지 확대', '삽화 애니메이션'],
  onLeave(prev, next) {
    if (prev === 4 && animator) animator.stop();
    if (prev === 3) infoSheet.close();
    if (next >= 3) { stopAR(); scene3d && scene3d.pause(); }
  },
  onEnter(n, prev) {
    document.body.classList.toggle('hide-stage', n >= 3);
    if (n <= 2) scene3d && (scene3d.resume(), scene3d.resize());
    if (n === 1) resetStep1();
    if (n === 2) {
      if (!mode) { setMode('demo'); }       // 새로고침 등으로 Step1을 건너뛴 경우
      if (prev === 3 && mode === 'camera') { /* 카메라 재시작은 enterStep2에서 */ }
      enterStep2();
    }
    if (n === 3) { resetZoom(); flyIn(); }
    if (n === 4) startAnim();
  },
});
flow.start();
