// 3D 둘러보기 — 존별 glb를 사진 자리에서 바로 띄우는 경량 뷰어 (한 번에 하나만 활성, 이전 뷰어는 해제)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import SCENES from './scenes.js?v=5';

const THREE_VER = '0.169.0';
const MODELS = new URL('../models/', import.meta.url);

// 이동 범위: Blender 좌표(m, z-up) 상자들의 합집합 [x0, y0, z0, x1, y1, z1]. 카메라·회전 중심이 벽·바닥을 넘지 않게 한다.
const booth = (c, east) => [[c - 3.0, -4.3, 0.3, east ?? c + 3.0, -2.6, 5.6], [c - 2.0, -2.9, 0.3, c + 2.0, -0.3, 3.3]];
const ZONES = {
  c0: { boxes: [[-1.8, -6.3, 0.3, 1.8, -0.25, 3.9]], maxDist: 6 },
  c1: { bg: 0xe4e1db, boxes: booth(0.0, 3.7), maxDist: 7, tdist: 4.2 },
  c2: { bg: 0xe4e1db, boxes: booth(-4.4), maxDist: 7, tdist: 3.0 },
  c3: { bg: 0xe4e1db, boxes: booth(-8.8), maxDist: 7, tdist: 3.0 },
  c4: { bg: 0xe4e1db, boxes: booth(-13.2), maxDist: 7, tdist: 3.0 },
  c5: { boxes: [[0.35, 0.3, 0.3, 4.75, 6.7, 3.9], [4.5, 4.15, 0.3, 6.2, 5.45, 2.4]], maxDist: 6 },
  corridor: { bg: 0xe4e1db, boxes: [[-19.0, -4.3, 0.3, 3.7, -2.6, 5.8], [-15.2, -2.9, 0.3, 2.0, -0.3, 3.3]], maxDist: 12, tdist: 6.0 },
};
// Blender (x, y, z) -> glTF/three (x, z, -y)
const toBoxes = (bs) => bs.map(([x0, y0, z0, x1, y1, z1]) => new THREE.Box3(new THREE.Vector3(x0, z0, -y1), new THREE.Vector3(x1, z1, -y0)));

const LIGHT_SCALE = 1.0;      // glTF COMPAT 단위(W/4π) 그대로
const ENV_INTENSITY = 0.55;   // RoomEnvironment: Blender의 큰 면조명·간접광 대신
const EXPOSURE = 1.0;

let active = null;
let dracoLoader = null;
const isSmall = () => matchMedia('(max-width: 640px)').matches;

function clampToBoxes(p, boxes) {
  for (const b of boxes) if (b.containsPoint(p)) return false;
  let best = null, bd = Infinity;
  const q = new THREE.Vector3();
  for (const b of boxes) {
    b.clampPoint(p, q);
    const d = q.distanceToSquared(p);
    if (d < bd) { bd = d; best = q.clone(); }
  }
  p.copy(best);
  return true;
}

function haloTexture(w, h, m) {
  // 연작 캔버스 뒤 LED 후광: 캔버스 테두리에서 바깥으로 갈수록 옅어지는 알파 (d_monet.py halo_mat과 같은 식)
  const W = w + 2 * m, H = h + 2 * m;
  const cw = 96, ch = Math.max(8, Math.round(96 * H / W));
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d'); const img = ctx.createImageData(cw, ch);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const ax = Math.max(0, Math.abs((i + 0.5) / cw - 0.5) * W - w / 2);
    const ay = Math.max(0, Math.abs((j + 0.5) / ch - 0.5) * H - h / 2);
    const t = Math.max(0, 1 - Math.hypot(ax, ay) / m);
    const a = Math.round(255 * Math.pow(t, 2.2));
    const k = (j * cw + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = a; img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function fixHalo(mesh) {
  const g = mesh.geometry, pos = g.attributes.position, uv = g.attributes.uv;
  if (!uv) return;
  let o, ux, vy;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    const p = new THREE.Vector3().fromBufferAttribute(pos, i);
    if (u < 0.5 && v < 0.5) o = p; else if (u > 0.5 && v < 0.5) ux = p; else if (u < 0.5 && v > 0.5) vy = p;
  }
  if (!o || !ux || !vy) return;
  const m = 0.2, W = o.distanceTo(ux), H = o.distanceTo(vy);
  mesh.material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.0, 0.68, 0.36).multiplyScalar(1.6), alphaMap: haloTexture(W - 2 * m, H - 2 * m, m),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  mesh.renderOrder = 2;
}

function disposeActive() {
  if (!active) return;
  const a = active; active = null;
  a.cancelled = true;
  cancelAnimationFrame(a.raf);
  a.ro?.disconnect();
  a.controls?.dispose();
  a.scene?.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose();
      m.dispose();
    }
  });
  a.pmrem?.dispose();
  a.envTex?.dispose();
  if (a.renderer) { a.renderer.dispose(); a.renderer.forceContextLoss(); }
  document.removeEventListener('fullscreenchange', a.onFs);
  document.removeEventListener('keydown', a.onKey);
  a.host.classList.remove('is-3d', 'is-full');
  a.stage?.remove();
  a.btn?.setAttribute('aria-pressed', 'false');
  if (a.btn) a.btn.textContent = '3D로 둘러보기';
  document.body.classList.remove('v3d-lock');
}

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

export async function openViewer(host, zone, btn) {
  if (active && active.host === host) { disposeActive(); return; }
  disposeActive();
  const data = SCENES[zone], cfg = ZONES[zone];
  const a = { host, zone, btn, cancelled: false };
  active = a;
  btn?.setAttribute('aria-pressed', 'true');
  if (btn) btn.textContent = '사진으로 돌아가기';
  host.classList.add('is-3d');

  // ---- DOM: 캔버스 + 진행 막대 + 도구 ----
  const stage = el('div', 'v3d-stage'); a.stage = stage;
  const canvasWrap = el('div', 'v3d-canvas');
  const bar = el('div', 'v3d-load', '<div class="v3d-load-track"><i></i></div><span>3D 공간 불러오는 중… 0%</span>');
  const tools = el('div', 'v3d-tools');
  const bReset = el('button', 'v3d-btn', '처음 시점'); bReset.type = 'button';
  const bFull = el('button', 'v3d-btn', '전체화면'); bFull.type = 'button';
  const bClose = el('button', 'v3d-btn', '닫기'); bClose.type = 'button';
  tools.append(bReset, bFull, bClose);
  const hint = el('p', 'v3d-hint', isSmall() ? '한 손가락으로 돌려보기 · 두 손가락으로 확대·이동' : '드래그로 돌려보기 · 스크롤로 확대 · 오른쪽 드래그로 이동');
  stage.append(canvasWrap, bar, tools, hint);
  host.append(stage);

  // ---- renderer ----
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  a.renderer = renderer;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall() ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = EXPOSURE;
  canvasWrap.append(renderer.domElement);
  const labelR = new CSS2DRenderer(); labelR.domElement.className = 'v3d-labels';
  canvasWrap.append(labelR.domElement);

  const scene = new THREE.Scene(); a.scene = scene;
  // 부스·복도는 잘라낸 홀 바깥이 보이므로 흰 홀과 이어지는 밝은 바탕, 방(C0·C5)은 어두운 바탕
  scene.background = new THREE.Color(cfg.bg ?? 0x1b1b1a);
  const pmrem = new THREE.PMREMGenerator(renderer); a.pmrem = pmrem;
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; a.envTex = envTex;
  scene.environment = envTex; scene.environmentIntensity = ENV_INTENSITY;

  const camera = new THREE.PerspectiveCamera(50, 1.6, 0.05, 120);
  const boxes = toBoxes(cfg.boxes);
  const home = { pos: new THREE.Vector3(...data.position), target: new THREE.Vector3(...data.target) };
  if (cfg.tdist) {
    const d = home.target.clone().sub(home.pos).normalize();
    home.target = home.pos.clone().addScaledVector(d, cfg.tdist);
    clampToBoxes(home.target, boxes);
  }
  camera.position.copy(home.pos);

  const controls = new OrbitControls(camera, labelR.domElement); a.controls = controls;
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.55; controls.zoomSpeed = 0.8; controls.panSpeed = 0.8;
  controls.screenSpacePanning = true;
  controls.minDistance = 0.35; controls.maxDistance = cfg.maxDist;
  controls.minPolarAngle = Math.PI * 0.12; controls.maxPolarAngle = Math.PI * 0.62;
  controls.target.copy(home.target);
  controls.update();

  const fit = () => {
    const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); labelR.setSize(w, h);
    camera.aspect = w / h;
    // 스틸과 같은 수평 화각(24 mm, 36 mm 센서 → 73.7°)을 유지, 세로 화면에서는 세로 화각 상한
    const v = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(data.hfov) / 2) / camera.aspect);
    camera.fov = Math.min(THREE.MathUtils.radToDeg(v), 72);
    camera.updateProjectionMatrix();
    a.dirty = true;
  };
  const ro = new ResizeObserver(fit); ro.observe(canvasWrap); a.ro = ro; fit();

  // ---- 번호 핫스팟 (사진의 ①②③과 같은 번호) ----
  const pins = [];
  (data.anchors || []).forEach((p, i) => {
    if (!p) return;
    const d = el('button', 'v3d-pin', String(i + 1)); d.type = 'button'; d.dataset.n = i + 1;
    d.setAttribute('aria-label', '장치 ' + (i + 1));
    d.addEventListener('click', () => host.closest('.zone')?.querySelector(`.devices li[data-n="${i + 1}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    const o = new CSS2DObject(d); o.position.set(...p); scene.add(o); pins.push(o);
  });
  (data.labels || []).forEach(([x, y, z, t]) => {
    const d = el('span', 'v3d-tag', t); const o = new CSS2DObject(d); o.position.set(x, y, z); scene.add(o);
  });

  // ---- 불러오기 ----
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(`https://cdn.jsdelivr.net/npm/three@${THREE_VER}/examples/jsm/libs/draco/gltf/`);
  }
  const loader = new GLTFLoader(); loader.setDRACOLoader(dracoLoader);
  const pct = bar.querySelector('span'), fill = bar.querySelector('i');
  let gltf;
  try {
    gltf = await loader.loadAsync(new URL(zone + '.glb', MODELS).href, (e) => {
      if (e.total) { const v = Math.round(e.loaded / e.total * 100); fill.style.width = v + '%'; pct.textContent = `3D 공간 불러오는 중… ${v}%`; }
      else { pct.textContent = `3D 공간 불러오는 중… ${(e.loaded / 1048576).toFixed(1)} MB`; }
    });
  } catch (err) {
    if (a.cancelled) return;
    pct.textContent = '3D 공간을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'; bar.classList.add('err');
    console.warn(err); return;
  }
  if (a.cancelled) { gltf.scene.traverse((o) => { o.geometry?.dispose(); }); return; }

  const room = gltf.scene;
  const lights = [], meshes = [];
  room.traverse((o) => {
    if (o.isLight) lights.push(o);
    if (o.isMesh) {
      meshes.push(o);
      const m = o.material;
      if (m && m.name && m.name.startsWith('halo_')) fixHalo(o);
      else if (m) { m.envMapIntensity = 1.0; if (m.transparent) o.renderOrder = 1; }
    }
  });
  // 점·스폿 조명: 세기 순으로 상한(휴대폰 6, 데스크톱 12) — 셰이더 부담을 줄임
  lights.sort((x, y) => y.intensity - x.intensity);
  const cap = isSmall() ? 6 : 12;
  lights.forEach((L, i) => {
    if (i >= cap) { L.parent.remove(L); return; }
    L.intensity *= LIGHT_SCALE; L.castShadow = false;
    if (L.isSpotLight) L.penumbra = Math.max(L.penumbra, 0.4);
  });
  scene.add(room);
  bar.remove();

  // ---- 핫스팟 가림 판정 (조작이 끝났을 때만, 가려진 번호는 흐리게) ----
  const ray = new THREE.Raycaster();
  const occl = () => {
    const c = camera.position;
    for (const o of pins) {
      const to = o.position.clone().sub(c), dist = to.length();
      ray.set(c, to.normalize()); ray.far = Math.max(0.01, dist - 0.6);   // 앵커가 물체 중심이라 자기 표면에 가리지 않게 여유
      const hit = ray.intersectObjects(meshes, false).length > 0;
      o.element.classList.toggle('hid', hit);
    }
  };
  let occlT = 0;
  const queueOccl = () => { clearTimeout(occlT); occlT = setTimeout(() => { if (!a.cancelled) occl(); }, 120); };
  controls.addEventListener('end', queueOccl);
  queueOccl();

  // ---- 루프: 바뀔 때만 그리기 ----
  controls.addEventListener('change', () => { a.dirty = true; });
  const tick = () => {
    if (a.cancelled) return;
    a.raf = requestAnimationFrame(tick);
    const moved = controls.update();
    let clamped = clampToBoxes(camera.position, boxes);
    clamped = clampToBoxes(controls.target, boxes) || clamped;
    if (clamped) camera.lookAt(controls.target);
    if (moved || clamped || a.dirty) {
      renderer.render(scene, camera); labelR.render(scene, camera); a.dirty = false;
    }
  };
  tick();

  // ---- 도구 ----
  bReset.addEventListener('click', () => {
    camera.position.copy(home.pos); controls.target.copy(home.target); controls.update(); a.dirty = true; queueOccl();
  });
  const setFullLabel = () => { bFull.textContent = host.classList.contains('is-full') || document.fullscreenElement === host ? '전체화면 닫기' : '전체화면'; };
  bFull.addEventListener('click', async () => {
    if (document.fullscreenElement === host) { await document.exitFullscreen(); return; }
    if (host.classList.contains('is-full')) { host.classList.remove('is-full'); document.body.classList.remove('v3d-lock'); setFullLabel(); return; }
    if (host.requestFullscreen) {
      try {
        await Promise.race([host.requestFullscreen(), new Promise((r) => setTimeout(r, 600))]);
        if (document.fullscreenElement === host) return;
      } catch (e) { /* iOS 등: 아래 대체 */ }
    }
    host.classList.add('is-full'); document.body.classList.add('v3d-lock'); setFullLabel();
  });
  a.onFs = () => { setFullLabel(); fit(); };
  document.addEventListener('fullscreenchange', a.onFs);
  a.onKey = (e) => { if (e.key === 'Escape' && host.classList.contains('is-full')) { host.classList.remove('is-full'); document.body.classList.remove('v3d-lock'); setFullLabel(); } };
  document.addEventListener('keydown', a.onKey);
  bClose.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); disposeActive(); btn?.focus(); });
}
