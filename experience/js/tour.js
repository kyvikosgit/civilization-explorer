// 4층 전체 3D 둘러보기 — 한 장면(floor.glb: B 살롱 · C 복도와 부스 4개 · D 모네관)에 카메라만 옮겨 다닌다.
// 평면도의 구역을 누르면 그 구역의 스틸과 같은 구도로 카메라가 이동하고, 평면도에는 현재 카메라 위치가 표시된다.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import SCENES from './scenes.js?v=10';

const THREE_VER = '0.169.0';
const MODEL = new URL('../models/floor.glb?v=10', import.meta.url).href;
const ENV_INTENSITY = 0.55;   // RoomEnvironment: Blender의 큰 면조명·간접광 대신 (라이트맵 베이크 없음)
const isSmall = () => matchMedia('(max-width: 640px)').matches;

// 카메라·회전 중심이 다닐 수 있는 범위: Blender 좌표(m, z-up) 상자 합집합 [x0, y0, z0, x1, y1, z1]
const WALK = [
  [-19.0, -4.3, 0.3, 6.0, -2.6, 5.8],     // C 복도 보행로
  [-15.2, -2.9, 0.3, 2.0, -0.3, 3.3],     // C-4 ~ C-1 부스 안쪽
  [2.3, -4.3, 0.3, 6.0, 0.4, 5.8],        // C-1 옆 ~ 커튼선 너머
  [5.5, -0.9, 0.3, 6.8, 0.0, 2.4],        // B 살롱 출입문
  [6.45, -5.6, 0.3, 10.05, 0.45, 3.9],    // B 아카데미 살롱
  [-19.9, -2.15, 0.3, -18.2, -0.85, 2.4], // D 입구
  [-24.05, -6.0, 0.3, -19.65, 0.4, 3.9],  // D 모네 전시관
];
const BOXES = WALK.map(([x0, y0, z0, x1, y1, z1]) => new THREE.Box3(new THREE.Vector3(x0, z0, -y1), new THREE.Vector3(x1, z1, -y0)));
// 현재 구역 판정(회전 중심 기준, Blender x/y): 평면도 강조와 번호 표시에 씀
const REGIONS = [
  ['c0', 6.2, -6.0, 10.4, 0.9], ['c5', -25.5, -6.5, -19.3, 0.9],
  ['c1', -2.2, -2.9, 2.2, 0.7], ['c2', -6.6, -2.9, -2.2, 0.7], ['c3', -11.0, -2.9, -6.6, 0.7], ['c4', -15.4, -2.9, -11.0, 0.7],
];
// 구역별 처음 시점: 스틸 카메라 위치·방향 그대로, 회전 중심만 공간 안쪽으로
const TDIST = { c1: 4.2, c2: 3.0, c3: 3.0, c4: 3.0, corridor: 6.0 };
const PRESETS = {};
for (const [z, d] of Object.entries(SCENES)) {
  const pos = new THREE.Vector3(...d.position); let tgt = new THREE.Vector3(...d.target);
  if (TDIST[z]) tgt = pos.clone().addScaledVector(tgt.clone().sub(pos).normalize(), TDIST[z]);
  PRESETS[z] = { pos, tgt };
}

function clampToBoxes(p) {
  for (const b of BOXES) if (b.containsPoint(p)) return false;
  let best = null, bd = Infinity; const q = new THREE.Vector3();
  for (const b of BOXES) { b.clampPoint(p, q); const d = q.distanceToSquared(p); if (d < bd) { bd = d; best = q.clone(); } }
  p.copy(best); return true;
}

function haloTexture(w, h, m) {
  // 연작 캔버스 뒤 LED 후광 (d_monet.py halo_mat과 같은 감쇠식)
  const W = w + 2 * m, H = h + 2 * m, cw = 96, ch = Math.max(8, Math.round(96 * H / W));
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d'); const img = ctx.createImageData(cw, ch);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const ax = Math.max(0, Math.abs((i + 0.5) / cw - 0.5) * W - w / 2), ay = Math.max(0, Math.abs((j + 0.5) / ch - 0.5) * H - h / 2);
    const a = Math.round(255 * Math.pow(Math.max(0, 1 - Math.hypot(ax, ay) / m), 2.2)), k = (j * cw + i) * 4;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = a; img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.NoColorSpace; return tex;
}
function fixHalo(mesh) {
  const g = mesh.geometry, pos = g.attributes.position, uv = g.attributes.uv; if (!uv) return;
  let o, ux, vy;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i), p = new THREE.Vector3().fromBufferAttribute(pos, i);
    if (u < 0.5 && v < 0.5) o = p; else if (u > 0.5 && v < 0.5) ux = p; else if (u < 0.5 && v > 0.5) vy = p;
  }
  if (!o || !ux || !vy) return;
  const m = 0.2, W = o.distanceTo(ux), H = o.distanceTo(vy);
  mesh.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.68, 0.36).multiplyScalar(1.6), alphaMap: haloTexture(W - 2 * m, H - 2 * m, m),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  mesh.renderOrder = 2;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export function createTour({ stage, plan, onZone }) {
  const T = { ready: false, zone: null };
  const canvasWrap = el('div', 'v3d-canvas');
  const bar = el('div', 'v3d-load', '<div class="v3d-load-track"><i></i></div><span>3D 공간 불러오는 중… 0%</span>');
  const tools = el('div', 'v3d-tools');
  const bReset = el('button', 'v3d-btn', '처음 시점'); bReset.type = 'button';
  const bFull = el('button', 'v3d-btn', '전체화면'); bFull.type = 'button';
  tools.append(bReset, bFull);
  const hint = el('p', 'v3d-hint', isSmall() ? '한 손가락으로 돌려보기 · 두 손가락으로 확대·이동' : '드래그로 돌려보기 · Ctrl(⌘)+스크롤로 확대 · 오른쪽 드래그로 이동');
  stage.prepend(canvasWrap); stage.append(bar, tools, hint);
  // 위쪽 구역 버튼 줄이 오른쪽 위 조작 버튼 밑으로 들어가지 않도록 그 폭만큼 비워 둔다
  new ResizeObserver(() => stage.style.setProperty('--toolsw', tools.offsetWidth + 'px')).observe(tools);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isSmall() ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  canvasWrap.append(renderer.domElement);
  const labelR = new CSS2DRenderer(); labelR.domElement.className = 'v3d-labels'; canvasWrap.append(labelR.domElement);

  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1b1b1a);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = ENV_INTENSITY;
  const camera = new THREE.PerspectiveCamera(60, 1.6, 0.05, 150);
  const home = PRESETS.corridor; camera.position.copy(home.pos);
  const controls = new OrbitControls(camera, labelR.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, rotateSpeed: 0.55, zoomSpeed: 0.8, panSpeed: 0.8, screenSpacePanning: true,
    minDistance: 0.35, maxDistance: 14, minPolarAngle: Math.PI * 0.08, maxPolarAngle: Math.PI * 0.7 });
  controls.target.copy(home.tgt); controls.update();
  // 화면을 채우는 캔버스가 페이지 스크롤을 막지 않도록: 일반 휠은 페이지로, Ctrl/⌘+휠(트랙패드 핀치 포함)과 전체화면에서만 확대
  canvasWrap.addEventListener('wheel', (e) => {
    const full = stage.classList.contains('is-full') || document.fullscreenElement === stage;
    if (!(e.ctrlKey || e.metaKey || full)) e.stopPropagation();
  }, { capture: true });

  let dirty = true;
  const fit = () => {
    const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); labelR.setSize(w, h); camera.aspect = w / h;
    // 스틸과 같은 수평 화각(24 mm → 73.7°), 세로 화면은 세로 화각 상한
    camera.fov = Math.min(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(73.74) / 2) / camera.aspect)), 72);
    camera.updateProjectionMatrix(); dirty = true;
  };
  new ResizeObserver(fit).observe(canvasWrap); fit();

  // ---- 번호 핫스팟: 모든 구역을 만들어 두고 현재 구역 것만 보인다 ----
  const pins = [];
  for (const [z, d] of Object.entries(SCENES)) (d.anchors || []).forEach((p, i) => {
    if (!p) return;
    const b = el('button', 'v3d-pin', String(i + 1)); b.type = 'button'; b.setAttribute('aria-label', `${z.toUpperCase()} 장치 ${i + 1}`);
    b.addEventListener('click', () => document.querySelector(`#${z} .devices li[data-n="${i + 1}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    const o = new CSS2DObject(b); o.position.set(...p); o.userData.zone = z; o.visible = false; scene.add(o); pins.push(o);
  });

  // ---- 평면도의 '현재 위치' 표시 ----
  const you = plan.querySelector('.you');
  const fwd = new THREE.Vector3();
  const updateYou = () => {
    if (!you) return;
    camera.getWorldDirection(fwd);
    const ang = Math.atan2(-fwd.z, fwd.x) * 180 / Math.PI;   // Blender 평면 각도(동쪽 0°, 북쪽 90°)
    you.setAttribute('transform', `translate(${camera.position.x.toFixed(2)} ${camera.position.z.toFixed(2)}) rotate(${(-ang).toFixed(1)})`);
  };
  const regionOf = (p) => { const x = p.x, y = -p.z; for (const [z, x0, y0, x1, y1] of REGIONS) if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return z; return 'corridor'; };
  const setZone = (z) => {
    if (z === T.zone) return; T.zone = z;
    for (const o of pins) o.visible = o.userData.zone === z;
    plan.querySelectorAll('[data-zone]').forEach((e) => e.classList.toggle('on', e.dataset.zone === z));
    onZone?.(z); queueOccl(); relight();
  };

  // ---- 조명 풀: 개수를 고정해 셰이더 재컴파일 없이, 회전 중심 가까운 원본 조명의 값을 옮겨 담는다 ----
  const srcLights = [];
  const pool = { spot: [], point: [] };
  const POOL = isSmall() ? { spot: 6, point: 2 } : { spot: 10, point: 4 };
  for (let i = 0; i < POOL.spot; i++) { const L = new THREE.SpotLight(0xffffff, 0); scene.add(L, L.target); pool.spot.push(L); }
  for (let i = 0; i < POOL.point; i++) { const L = new THREE.PointLight(0xffffff, 0); scene.add(L); pool.point.push(L); }
  const lastLit = new THREE.Vector3(1e9, 0, 0);
  function relight(force) {
    if (!srcLights.length) return;
    const c = controls.target; if (!force && c.distanceTo(lastLit) < 1.5) return; lastLit.copy(c);
    for (const kind of ['spot', 'point']) {
      const list = srcLights.filter((s) => s.kind === kind).map((s) => ({ s, k: s.intensity / Math.max(1, s.pos.distanceToSquared(c) / 9) })).sort((a, b) => b.k - a.k);
      pool[kind].forEach((L, i) => {
        const e = list[i]; if (!e) { L.intensity = 0; return; }
        const s = e.s; L.position.copy(s.pos); L.color.copy(s.color); L.intensity = s.intensity; L.distance = s.distance; L.decay = s.decay;
        if (kind === 'spot') { L.angle = s.angle; L.penumbra = Math.max(s.penumbra, 0.4); L.target.position.copy(s.pos).add(s.dir); L.target.updateMatrixWorld(); }
      });
    }
    dirty = true;
  }

  // ---- 가림 판정(조작이 끝났을 때만) ----
  let meshes = [];
  const ray = new THREE.Raycaster();
  let occlT = 0;
  function queueOccl() {
    clearTimeout(occlT);
    occlT = setTimeout(() => {
      for (const o of pins) {
        if (!o.visible) continue;
        const to = o.position.clone().sub(camera.position), dist = to.length();
        ray.set(camera.position, to.normalize()); ray.far = Math.max(0.01, dist - 0.6);
        o.element.classList.toggle('hid', ray.intersectObjects(meshes, false).length > 0);
      }
    }, 150);
  }
  controls.addEventListener('end', queueOccl);
  controls.addEventListener('change', () => { dirty = true; });

  // ---- 카메라 이동(약 1초) ----
  let fly = null;
  T.flyTo = (z, instant) => {
    const p = PRESETS[z]; if (!p) return;
    if (!T.ready || instant) { camera.position.copy(p.pos); controls.target.copy(p.tgt); controls.update(); setZone(z); dirty = true; return; }
    fly = { t0: performance.now(), dur: 1000, p0: camera.position.clone(), q0: controls.target.clone(), p1: p.pos.clone(), q1: p.tgt.clone(), z };
    setZone(z);
  };
  T.pending = 'corridor';

  const tick = () => {
    requestAnimationFrame(tick);
    let moved = false;
    if (fly) {
      const t = Math.min(1, (performance.now() - fly.t0) / fly.dur), k = ease(t);
      camera.position.lerpVectors(fly.p0, fly.p1, k); controls.target.lerpVectors(fly.q0, fly.q1, k);
      camera.lookAt(controls.target); moved = true;
      if (t >= 1) { fly = null; controls.update(); queueOccl(); setTimeout(queueOccl, 600); }
    } else {
      moved = controls.update();
      let cl = clampToBoxes(camera.position); cl = clampToBoxes(controls.target) || cl;
      if (cl) { camera.lookAt(controls.target); moved = true; }
      if (moved && T.ready) { setZone(regionOf(controls.target)); relight(); }
    }
    if ((moved || dirty) && T.ready) { renderer.render(scene, camera); labelR.render(scene, camera); updateYou(); dirty = false; }
  };

  // ---- 도구 ----
  bReset.addEventListener('click', () => T.flyTo(T.zone || 'corridor'));
  const isFull = () => stage.classList.contains('is-full') || document.fullscreenElement === stage;
  const setFullLabel = () => { bFull.textContent = isFull() ? '전체화면 닫기' : '전체화면'; };
  const exitPseudo = () => { stage.classList.remove('is-full'); document.body.classList.remove('v3d-lock'); setFullLabel(); };
  bFull.addEventListener('click', async () => {
    if (document.fullscreenElement === stage) { await document.exitFullscreen(); return; }
    if (stage.classList.contains('is-full')) { exitPseudo(); return; }
    if (stage.requestFullscreen) {
      try { await Promise.race([stage.requestFullscreen(), new Promise((r) => setTimeout(r, 600))]); if (document.fullscreenElement === stage) return; } catch (e) { /* 아래 대체 */ }
    }
    stage.classList.add('is-full'); document.body.classList.add('v3d-lock'); setFullLabel();
  });
  document.addEventListener('fullscreenchange', () => { setFullLabel(); fit(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stage.classList.contains('is-full')) exitPseudo(); });

  // ---- 불러오기 ----
  const draco = new DRACOLoader(); draco.setDecoderPath(`https://cdn.jsdelivr.net/npm/three@${THREE_VER}/examples/jsm/libs/draco/gltf/`);
  const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
  const pct = bar.querySelector('span'), fillBar = bar.querySelector('i');
  T.loaded = loader.loadAsync(MODEL, (e) => {
    if (e.total) { const v = Math.round(e.loaded / e.total * 100); fillBar.style.width = v + '%'; pct.textContent = `3D 공간 불러오는 중… ${v}%`; }
    else pct.textContent = `3D 공간 불러오는 중… ${(e.loaded / 1048576).toFixed(1)} MB`;
  }).then((gltf) => {
    const room = gltf.scene; room.updateMatrixWorld(true);
    const lights = [];
    room.traverse((o) => {
      if (o.isLight) lights.push(o);
      if (o.isMesh) {
        meshes.push(o); const m = o.material;
        if (m?.name?.startsWith('halo_')) fixHalo(o); else if (m?.transparent) o.renderOrder = 1;
      }
    });
    for (const L of lights) {
      const pos = L.getWorldPosition(new THREE.Vector3());
      const s = { kind: L.isSpotLight ? 'spot' : 'point', pos, color: L.color.clone(), intensity: L.intensity, distance: L.distance, decay: L.decay };
      if (L.isSpotLight) { s.angle = L.angle; s.penumbra = L.penumbra; s.dir = L.target.getWorldPosition(new THREE.Vector3()).sub(pos); }
      srcLights.push(s); L.parent.remove(L);
    }
    scene.add(room);
    bar.remove(); T.ready = true; plan.classList.add('live');
    const z = T.pending; T.zone = null; T.flyTo(z, true); relight(true); dirty = true;
    return T;
  }).catch((err) => { pct.textContent = '3D 공간을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'; bar.classList.add('err'); console.warn(err); });
  const prevFly = T.flyTo;
  T.flyTo = (z, instant) => { if (!T.ready) { T.pending = z; plan.querySelectorAll('[data-zone]').forEach((e) => e.classList.toggle('on', e.dataset.zone === z)); onZone?.(z); return; } prevFly(z, instant); };
  tick();
  return T;
}
