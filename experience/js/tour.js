// 4층 전체 3D 둘러보기 — 한 장면(floor.glb: 헤리티지 4층 실측 셸 + 고객 DWG(2026.10) 기준 살롱 · 부스 4개 · 모네연작)에 카메라만 옮겨 다닌다.
// 1인칭 눈높이(1.6 m) 둘러보기: 끌면 제자리에서 시선이 돌고, 바닥을 누르거나 WASD·방향키로 걷는다. 벽·가벽·가구는 통과하지 못한다.
// 평면도·구역 버튼을 누르면 그 구역의 스틸과 같은 자리·방향으로 이동하고, 평면도에는 현재 위치와 시선 방향이 표시된다.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import SCENES from './scenes.js?v=41';

const THREE_VER = '0.169.0';
const MODEL = new URL('../models/floor.glb?v=43' + (/[?&]debug\b/.test(location.search) ? '&t=' + Date.now() : ''), import.meta.url).href;
const ENV_INTENSITY = 0.55;   // RoomEnvironment: Blender의 큰 면조명·간접광 대신 (라이트맵 베이크 없음)
const isSmall = () => matchMedia('(max-width: 640px)').matches;

// 걸을 수 있는 바닥: 4층 평면 좌표(m, Blender x/y — 고객 DWG 2026.10 기준, experience-doc/render/plan4f.py) 직사각형 합집합 [x0, y0, x1, y1].
// 이 안에서도 벽·가벽·가구 자리는 막힌다(헤리티지 실측 셸 포함).
const WALK = [
  [-21.15, -4.40, 8.36, 0.55],   // 전시 복도 띠: 모네작품 입구 ~ 부스 4개 ~ 살롱 앞 (창 쪽 벽 ~ 전시실7 벽 기둥)
  [-21.95, -1.95, -21.10, -1.00], // 모네작품 출입구 (950, 기존 벽 개구부 안)
  [-26.30, -2.55, -21.86, 0.35],  // 모네작품 (전기·천장 4F PLAN의 닫힌 방: 4,450 / 3,800 × 2,900, 먼 벽은 사선)
  [8.30, -1.95, 9.10, -1.01],    // 살롱 출입구 (950)
  [9.03, -4.23, 12.40, 0.35],    // 전시실5 아카데미 살롱 (3,370 × 4,580)
  [4.88, -16.50, 8.36, -4.30],   // 서쪽 복도: 리셉션 데스크 ~ 박물관 입구 쪽
];
// 현재 구역 판정(시선 앞 2.5 m 지점, Blender x/y): 평면도 강조와 번호 표시에 씀
const REGIONS = [
  ['c0', 9.0, -4.25, 12.45, 0.40], ['c0', 6.6, -4.40, 9.0, 0.60], ['c5', -26.6, -2.75, -21.10, 0.60], ['c5', -21.10, -4.40, -17.80, 0.60],
  ['c1', -2.20, -2.75, 2.20, 0.30], ['c2', -6.45, -2.75, -2.20, 0.30], ['c3', -10.70, -2.75, -6.45, 0.30], ['c4', -14.95, -2.75, -10.70, 0.30],
];
const EYE = 1.6;
// 구역별 처음 자리: 스틸 카메라 위치(눈높이 1.6 m)와 시선 방향(렌즈 시프트는 살짝 올려다보는 각도로)
const PRESETS = {};
for (const [z, d] of Object.entries(SCENES)) {
  const pos = new THREE.Vector3(d.position[0], EYE, d.position[2]);
  const dir = new THREE.Vector3(...d.target).sub(new THREE.Vector3(...d.position)).normalize();
  PRESETS[z] = { pos, yaw: Math.atan2(-dir.x, -dir.z), pitch: Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1)) };
}

// ---- 충돌 격자: 불러온 장면의 삼각형 중 무릎~머리 높이(0.2–1.8 m)에 걸친 것을 10 cm 격자에 찍고, 몸 반경만큼 부풀린다 ----
const GRID = { x0: -26.8, z0: -1.0, x1: 13.5, z1: 17.2, s: 0.1 };
GRID.nx = Math.ceil((GRID.x1 - GRID.x0) / GRID.s); GRID.nz = Math.ceil((GRID.z1 - GRID.z0) / GRID.s);
function buildGrid(meshes) {
  const { nx, nz, s, x0, z0 } = GRID, raw = new Uint8Array(nx * nz);
  const ci = (x) => Math.floor((x - x0) / s), cj = (z) => Math.floor((z - z0) / s);
  const mark = (i, j) => { if (i >= 0 && j >= 0 && i < nx && j < nz) raw[j * nx + i] = 1; };
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (const m of meshes) {
    const g = m.geometry, P = g.attributes.position, I = g.index, mw = m.matrixWorld;
    const cnt = I ? I.count : P.count;
    for (let t = 0; t < cnt; t += 3) {
      const ia = I ? I.getX(t) : t, ib = I ? I.getX(t + 1) : t + 1, ic = I ? I.getX(t + 2) : t + 2;
      a.fromBufferAttribute(P, ia).applyMatrix4(mw); b.fromBufferAttribute(P, ib).applyMatrix4(mw); c.fromBufferAttribute(P, ic).applyMatrix4(mw);
      const ymin = Math.min(a.y, b.y, c.y), ymax = Math.max(a.y, b.y, c.y);
      if (ymax < 0.2 || ymin > 1.8) continue;
      n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)); const len = n.length(); if (len < 1e-9) continue;
      if (Math.abs(n.y / len) < 0.35) {          // 벽처럼 선 면: 평면에 그린 선분
        const pts = [a, b, c]; let best = [a, b], bd = -1;
        for (let p = 0; p < 3; p++) for (let q = p + 1; q < 3; q++) { const d = (pts[p].x - pts[q].x) ** 2 + (pts[p].z - pts[q].z) ** 2; if (d > bd) { bd = d; best = [pts[p], pts[q]]; } }
        const L = Math.sqrt(bd), steps = Math.max(1, Math.ceil(L / (s * 0.5)));
        for (let k = 0; k <= steps; k++) { const u = k / steps; mark(ci(best[0].x + (best[1].x - best[0].x) * u), cj(best[0].z + (best[1].z - best[0].z) * u)); }
      } else {                                   // 탁자 상판·의자처럼 누운 면: 평면 투영 삼각형을 채움
        const i0 = ci(Math.min(a.x, b.x, c.x)), i1 = ci(Math.max(a.x, b.x, c.x)), j0 = cj(Math.min(a.z, b.z, c.z)), j1 = cj(Math.max(a.z, b.z, c.z));
        const area = (b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z);
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const px = x0 + (i + 0.5) * s, pz = z0 + (j + 0.5) * s;
          const w0 = ((b.x - px) * (c.z - pz) - (c.x - px) * (b.z - pz)) / area, w1 = ((c.x - px) * (a.z - pz) - (a.x - px) * (c.z - pz)) / area;
          if (w0 >= -0.02 && w1 >= -0.02 && 1 - w0 - w1 >= -0.02) mark(i, j);
        }
        if (i1 - i0 <= 1 || j1 - j0 <= 1) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) mark(i, j);   // 아주 작은 다리·기둥
      }
    }
  }
  // 걸을 수 있는 바닥 밖은 막힘
  const walk = WALK.map(([bx0, by0, bx1, by1]) => [bx0, -by1, bx1, -by0]);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const px = x0 + (i + 0.5) * s, pz = z0 + (j + 0.5) * s;
    if (!walk.some(([wx0, wz0, wx1, wz1]) => px >= wx0 && px <= wx1 && pz >= wz0 && pz <= wz1)) raw[j * nx + i] = 2;
  }
  // 몸 반경 0.22 m 만큼 부풀림
  const R = 2, inf = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (!raw[j * nx + i]) continue;
    for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
      if (di * di + dj * dj > R * R + 1) continue;
      const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < nx && jj < nz) inf[jj * nx + ii] = 1;
    }
  }
  return { raw, inf };
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
  const m = 0.10, W = o.distanceTo(ux), H = o.distanceTo(vy);     // d_monet.py canvas(): 0.10 m LED halo (2026-10-19)
  mesh.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.68, 0.36).multiplyScalar(1.6), alphaMap: haloTexture(W - 2 * m, H - 2 * m, m),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  mesh.renderOrder = 2;
}

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export function createTour({ stage, plan, onZone, onPin }) {
  const T = { ready: false, zone: null };
  const canvasWrap = el('div', 'v3d-canvas');
  const bar = el('div', 'v3d-load', '<div class="v3d-load-track"><i></i></div><span>3D 공간 불러오는 중… 0%</span>');
  const tools = el('div', 'v3d-tools');
  const bReset = el('button', 'v3d-btn', '처음 시점'); bReset.type = 'button';
  const bFull = el('button', 'v3d-btn', '전체화면'); bFull.type = 'button';
  tools.append(bReset, bFull);
  const pad = el('div', 'v3d-pad', '<button type="button" data-k="left" aria-label="왼쪽으로 돌기">◀</button><button type="button" data-k="fwd" aria-label="앞으로">▲</button><button type="button" data-k="right" aria-label="오른쪽으로 돌기">▶</button><button type="button" data-k="back" aria-label="뒤로">▼</button>');
  const hint = el('p', 'v3d-hint', '끌어서 둘러보기 · 바닥 클릭이나 WASD·방향키로 걷기 · Ctrl(⌘)+스크롤로 확대');
  const fade = el('div', 'v3d-fade');
  stage.prepend(canvasWrap); stage.append(fade, bar, tools, pad, hint);
  // 위쪽 구역 버튼 줄이 오른쪽 위 조작 버튼 밑으로 들어가지 않도록 그 폭만큼 비워 둔다
  new ResizeObserver(() => stage.style.setProperty('--toolsw', tools.offsetWidth + 'px')).observe(tools);

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
  catch (err) {      // WebGL을 못 쓰는 브라우저·차단된 경우: 멈추지 말고 안내만
    bar.querySelector('span').textContent = '이 브라우저에서는 3D 화면을 열 수 없습니다. 아래 공간 시각화 이미지를 봐 주세요.'; bar.classList.add('err');
    const no = () => Promise.resolve(false), noop = () => {};
    Object.assign(T, { flyTo: no, travelTo: no, devicePose: () => null, markPin: noop, setFollow: noop, lockZone: noop, unlockZone: noop, cancelTravel: noop });
    console.warn(err); return T;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, isSmall() ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  canvasWrap.append(renderer.domElement);
  // GPU가 문맥을 잃으면(백그라운드 탭·메모리 부족) 복구를 허용하고, 돌아오면 다시 그린다
  renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stage.classList.add('v3d-lost'); });
  renderer.domElement.addEventListener('webglcontextrestored', () => { stage.classList.remove('v3d-lost'); dirty = true; });
  const labelR = new CSS2DRenderer(); labelR.domElement.className = 'v3d-labels'; canvasWrap.append(labelR.domElement);
  const surface = labelR.domElement;   // 포인터 입력을 받는 면(캔버스 위)

  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1b1b1a);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = ENV_INTENSITY;
  const camera = new THREE.PerspectiveCamera(60, 1.6, 0.06, 90);      // near/far 좁혀 깊이 정밀도 확보(z-fighting 방지)
  camera.rotation.order = 'YXZ';

  // ---- 시선·위치 상태 ----
  const V = { yaw: 0, pitch: 0, yawT: 0, pitchT: 0, zoom: 1, zoomT: 1 };
  const PITCH = THREE.MathUtils.degToRad(60);
  let grid = null, dirty = true, glide = null, zoneLock = null;   // zoneLock: 구역 버튼으로 이동한 뒤 사용자가 움직이기 전까지 그 구역 유지
  const setPose = (p) => { camera.position.copy(p.pos); V.yaw = V.yawT = p.yaw; V.pitch = V.pitchT = p.pitch; dirty = true; };
  setPose(PRESETS.corridor);

  let baseFov = 60;
  const FOV_MAX = 100;   // 체험 따라하기에서 큰 장치를 한 화면에 담을 때만 넓힌다(대개 86 이하, 세로 휴대폰의 C0 후보작 줄 4.1 m만 100) · 손가락·휠 확대는 75까지
  const applyFov = () => { camera.fov = THREE.MathUtils.clamp(baseFov * V.zoom, 35, FOV_MAX); camera.updateProjectionMatrix(); };
  const fit = () => {
    const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); labelR.setSize(w, h); camera.aspect = w / h;
    // 스틸과 같은 수평 화각(24 mm → 73.7°)을 기준으로, 세로 화면은 세로 화각 상한
    baseFov = Math.min(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(73.74) / 2) / camera.aspect)), 72);
    applyFov(); dirty = true;
  };
  new ResizeObserver(fit).observe(canvasWrap); fit();

  // ---- 충돌 ----
  const cellFree = (x, z, layer = 'inf') => {
    if (!grid) return true;
    const i = Math.floor((x - GRID.x0) / GRID.s), j = Math.floor((z - GRID.z0) / GRID.s);
    if (i < 0 || j < 0 || i >= GRID.nx || j >= GRID.nz) return false;
    return !grid[layer][j * GRID.nx + i];
  };
  // 벽에 미끄러지듯 이동: 전체 → x만 → z만
  const tryMove = (dx, dz) => {
    const p = camera.position;
    if (cellFree(p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; return true; }
    if (Math.abs(dx) > 1e-4 && cellFree(p.x + dx, p.z)) { p.x += dx; return true; }
    if (Math.abs(dz) > 1e-4 && cellFree(p.x, p.z + dz)) { p.z += dz; return true; }
    return false;
  };
  // 직선 경로에서 막히기 전 마지막 자리
  const reach = (x0, z0, x1, z1) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / 0.05));
    let lx = x0, lz = z0;
    for (let k = 1; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, z = z0 + (z1 - z0) * k / n; if (!cellFree(x, z)) return { x: lx, z: lz, clear: false }; lx = x; lz = z; }
    return { x: x1, z: z1, clear: true };
  };

  // ---- 바닥 커서(이동할 자리) ----
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.23, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.visible = false; ring.renderOrder = 3; scene.add(ring);
  const ndc = new THREE.Vector2(), rc = new THREE.Raycaster(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  function floorTarget(cx, cy) {
    const r = surface.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    camera.updateMatrixWorld(); rc.setFromCamera(ndc, camera);
    if (!rc.ray.intersectPlane(floorPlane, hit)) return null;
    const p = camera.position, d = Math.hypot(hit.x - p.x, hit.z - p.z);
    if (d > 14) return null;
    // 시선 경로가 벽(원래 격자)을 지나면 그 앞에서 멈춘다
    const L = Math.max(1, Math.ceil(d / 0.05)); let tx = hit.x, tz = hit.z;
    for (let k = 1; k <= L; k++) { const x = p.x + (hit.x - p.x) * k / L, z = p.z + (hit.z - p.z) * k / L; if (!cellFree(x, z, 'raw')) { tx = p.x + (hit.x - p.x) * Math.max(0, k - 4) / L; tz = p.z + (hit.z - p.z) * Math.max(0, k - 4) / L; break; } }
    const r2 = reach(p.x, p.z, tx, tz);
    return Math.hypot(r2.x - p.x, r2.z - p.z) > 0.15 ? r2 : null;
  }
  const showRing = (t) => { if (t) { ring.position.set(t.x, 0.015, t.z); ring.visible = true; } else ring.visible = false; dirty = true; };

  // ---- 걷기(부드럽게 미끄러지듯, 약 0.8초) ----
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const walkTo = (x, z, yaw, pitch, dur) => {
    const p = camera.position, d = Math.hypot(x - p.x, z - p.z);
    glide = { t0: performance.now(), dur: dur ?? THREE.MathUtils.clamp(d / 3, 0.5, 1.4) * 1000, x0: p.x, z0: p.z, x1: x, z1: z };
    if (yaw != null) { V.yawT = V.yaw + (((yaw - V.yaw) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; V.pitchT = pitch; }
  };
  const fadeTo = (pose, done) => {
    glide = null; endRoute(false); fade.classList.add('on');
    setTimeout(() => { setPose(pose); V.zoom = V.zoomT = pose.fov ? pose.fov / baseFov : 1; applyFov(); afterMove(); setTimeout(() => fade.classList.remove('on'), 40); done?.(); }, 260);
  };

  // ---- 길찾기: 충돌 격자(몸 반경만큼 부풀린 칸) 위 A* → 직선으로 이어도 막히지 않는 점만 남김 → 모서리를 둥글게 ----
  // 구역 사이 이동은 이 길(살롱 문 · 복도 · 모네관 문)을 따라 걷고, 벽을 뚫고 지나가지 않는다.
  const cellIdx = (x, z) => { const i = Math.floor((x - GRID.x0) / GRID.s), j = Math.floor((z - GRID.z0) / GRID.s); return (i < 0 || j < 0 || i >= GRID.nx || j >= GRID.nz) ? -1 : j * GRID.nx + i; };
  const freeIdx = (k) => k >= 0 && grid && !grid.inf[k];
  const nearFree = (x, z) => {        // 벽에 붙어 서 있으면 가장 가까운 빈 칸에서 출발
    for (let r = 0; r <= 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const k = cellIdx(x + di * GRID.s, z + dj * GRID.s); if (freeIdx(k)) return k;
    }
    return -1;
  };
  const cellXZ = (k) => ({ x: GRID.x0 + ((k % GRID.nx) + 0.5) * GRID.s, z: GRID.z0 + (Math.floor(k / GRID.nx) + 0.5) * GRID.s });
  const segClear = (a, b) => { const L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(L / 0.04)); for (let k = 0; k <= n; k++) if (!freeIdx(cellIdx(a.x + (b.x - a.x) * k / n, a.z + (b.z - a.z) * k / n))) return false; return true; };
  function findPath(x0, z0, x1, z1) {
    if (!grid) return null;
    const s = nearFree(x0, z0), g = nearFree(x1, z1); if (s < 0 || g < 0) return null;
    const { nx } = GRID, N = GRID.nx * GRID.nz, gs = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const gx = g % nx, gz = Math.floor(g / nx), h = (k) => { const dx = Math.abs((k % nx) - gx), dz = Math.abs(Math.floor(k / nx) - gz); return Math.max(dx, dz) + 0.4142 * Math.min(dx, dz); };
    const heap = [], push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top[1]; };
    gs[s] = 0; push(s, h(s));
    const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
    let found = false;
    while (heap.length) {
      const k = pop(); if (closed[k]) continue; closed[k] = 1; if (k === g) { found = true; break; }
      const ci = k % nx, cj = Math.floor(k / nx);
      for (const [di, dj, c] of D) {
        const ii = ci + di, jj = cj + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= GRID.nz) continue;
        const kk = jj * nx + ii; if (closed[kk] || grid.inf[kk]) continue;
        if (di && dj && (grid.inf[cj * nx + ii] || grid.inf[jj * nx + ci])) continue;     // 모서리 깎아 지나가지 않기
        const ng = gs[k] + c; if (ng < gs[kk]) { gs[kk] = ng; from[kk] = k; push(kk, ng + h(kk)); }
      }
    }
    if (!found) return null;
    const cells = []; for (let k = g; k >= 0; k = from[k]) cells.push(cellXZ(k)); cells.reverse();
    cells[0] = freeIdx(cellIdx(x0, z0)) ? { x: x0, z: z0 } : cells[0];
    if (freeIdx(cellIdx(x1, z1))) cells[cells.length - 1] = { x: x1, z: z1 };
    // 시야가 닿는 가장 먼 점으로 건너뛰기
    const pts = [cells[0]]; let i = 0;
    while (i < cells.length - 1) { let j = cells.length - 1; while (j > i + 1 && !segClear(cells[i], cells[j])) j--; pts.push(cells[j]); i = j; }
    // 모서리 둥글게(차이킨 2회) — 둥근 길이 막히면 꺾인 길 그대로
    let sm = pts;
    for (let it = 0; it < 2 && sm.length > 2; it++) {
      const o = [sm[0]];
      for (let k = 0; k < sm.length - 1; k++) { const a = sm[k], b = sm[k + 1]; if (k > 0) o.push({ x: a.x * 0.75 + b.x * 0.25, z: a.z * 0.75 + b.z * 0.25 }); if (k < sm.length - 2) o.push({ x: a.x * 0.25 + b.x * 0.75, z: a.z * 0.25 + b.z * 0.75 }); }
      o.push(sm[sm.length - 1]);
      if (o.every((p, k) => k === 0 || segClear(o[k - 1], p))) sm = o; else break;
    }
    return sm;
  }
  // ---- 길 따라 걷기: 사다리꼴 속도(출발·도착에서 부드럽게), 시선은 1.2 m 앞 길 방향, 마지막 1.5 m에서 도착 방향으로 ----
  const WALK_V = 1.8, ACC = 0.7, MAX_WALK = 15;    // m/s, 가감속 초, 이보다 오래 걸리면 순간 이동
  let route = null;
  const skipBtn = el('button', 'v3d-skip', '건너뛰기 ▸'); skipBtn.type = 'button'; skipBtn.hidden = true;
  skipBtn.addEventListener('click', () => { if (!route) return; const r = route; route = null; skipBtn.hidden = true; stage.classList.remove('v3d-traveling'); fadeTo({ pos: new THREE.Vector3(r.end.x, EYE, r.end.z), yaw: r.yaw ?? V.yaw, pitch: r.pitch ?? 0 }, () => r.resolve(true)); });
  stage.append(skipBtn);
  const routeTime = (L) => (L < WALK_V * ACC ? 2 * Math.sqrt(L * ACC / WALK_V) : L / WALK_V + ACC);
  function sAt(r, t) {          // 걸은 거리(사다리꼴 속도)
    const L = r.L, T_ = r.dur;
    if (L < WALK_V * ACC) { const a = 4 * L / (T_ * T_); return t < T_ / 2 ? 0.5 * a * t * t : L - 0.5 * a * (T_ - t) ** 2; }
    const a = WALK_V / ACC; if (t < ACC) return 0.5 * a * t * t; if (t > T_ - ACC) return L - 0.5 * a * (T_ - t) ** 2; return 0.5 * WALK_V * ACC + WALK_V * (t - ACC);
  }
  function pointAt(r, s) {
    s = THREE.MathUtils.clamp(s, 0, r.L); let k = 1; while (k < r.cum.length - 1 && r.cum[k] < s) k++;
    const a = r.pts[k - 1], b = r.pts[k], u = (s - r.cum[k - 1]) / Math.max(1e-6, r.cum[k] - r.cum[k - 1]);
    return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u };
  }
  function endRoute(ok) { if (!route) return; const r = route; route = null; skipBtn.hidden = true; stage.classList.remove('v3d-traveling'); r.resolve(ok); }
  const wrapYaw = (y) => V.yaw + (((y - V.yaw) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
  // 목적 자세까지 길 따라 이동. 길이 없거나 너무 길면 잠깐 어두워졌다 이동. Promise: 도착(true) / 사용자가 끊음(false)
  T.travelTo = (pose, { maxWalk = MAX_WALK } = {}) => new Promise((resolve) => {
    endRoute(false); glide = null;
    const c = camera.position, path = findPath(c.x, c.z, pose.pos.x, pose.pos.z);
    let L = 0; const cum = [0];
    if (path) for (let k = 1; k < path.length; k++) { L += Math.hypot(path[k].x - path[k - 1].x, path[k].z - path[k - 1].z); cum.push(L); }
    if (!path || routeTime(L) > maxWalk) { fadeTo(pose, () => resolve(true)); return; }
    if (L < 0.05) { V.yawT = wrapYaw(pose.yaw); V.pitchT = pose.pitch; V.zoomT = pose.fov ? pose.fov / baseFov : 1; dirty = true; setTimeout(() => resolve(true), 350); return; }
    V.zoomT = 1;
    route = { pts: path, cum, L, dur: routeTime(L), t0: performance.now(), end: pose.pos, yaw: pose.yaw, pitch: pose.pitch, fov: pose.fov, resolve };
    skipBtn.hidden = route.dur < 2.5; stage.classList.add('v3d-traveling');
  });
  T.cancelTravel = () => endRoute(false);

  // ---- 포인터: 끌면 제자리에서 시선 회전, 짧게 누르면 그 바닥으로 걷기, 두 손가락은 화각 확대 ----
  const ptrs = new Map(); let drag = null, pinch = null, lastHover = 0, lastTap = null;
  surface.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.v3d-pin')) return;
    try { surface.setPointerCapture(e.pointerId); } catch (err) { /* 합성 이벤트 등 */ } ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
    if (ptrs.size === 2) { const [p1, p2] = [...ptrs.values()]; pinch = { d: Math.hypot(p1.x - p2.x, p1.y - p2.y), z: V.zoomT }; drag = null; }
  });
  surface.addEventListener('pointermove', (e) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size >= 2) {
      const [p1, p2] = [...ptrs.values()]; const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      V.zoomT = THREE.MathUtils.clamp(pinch.z * pinch.d / Math.max(d, 1), 35 / baseFov, 75 / baseFov); dirty = true; return;
    }
    if (drag && ptrs.has(e.pointerId)) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) { if (!drag.moved && route) endRoute(false); drag.moved = true; zoneLock = null; }
      const k = THREE.MathUtils.degToRad(camera.fov) / surface.clientHeight;   // 화면을 잡고 끄는 느낌(1:1)
      V.yawT += dx * k; V.pitchT = THREE.MathUtils.clamp(V.pitchT + dy * k, -PITCH, PITCH);
      ring.visible = false; dirty = true; return;
    }
    if (e.pointerType === 'mouse' && T.ready) { const now = performance.now(); if (now - lastHover > 50) { lastHover = now; showRing(floorTarget(e.clientX, e.clientY)); } }
  });
  const endPtr = (e) => {
    const wasClick = drag && !drag.moved && ptrs.size === 1 && e.type === 'pointerup';
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
    if (wasClick && T.ready) {
      const t = floorTarget(e.clientX, e.clientY);
      const go = () => { if (t) { endRoute(false); zoneLock = null; showRing(t); walkTo(t.x, t.z); if (e.pointerType !== 'mouse') setTimeout(() => showRing(null), 900); } };
      if (e.pointerType !== 'touch') go();
      else {        // 휴대폰: 두 번 눌러 이동 (한 번 누르면 갈 자리만 표시)
        const now = performance.now();
        if (lastTap && now - lastTap.t < 380 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 36) { lastTap = null; go(); }
        else { lastTap = { t: now, x: e.clientX, y: e.clientY }; showRing(t); setTimeout(() => { if (lastTap?.t === now) { lastTap = null; showRing(null); } }, 700); }
      }
    }
    if (!ptrs.size) { drag = null; queueOccl(); }
  };
  surface.addEventListener('pointerup', endPtr); surface.addEventListener('pointercancel', endPtr);
  surface.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !ptrs.size) showRing(null); });
  // 휠: 평소에는 페이지 스크롤, Ctrl/⌘+휠(트랙패드 핀치 포함)과 전체화면에서만 화각 확대
  surface.addEventListener('wheel', (e) => {
    const full = stage.classList.contains('is-full') || document.fullscreenElement === stage;
    if (!(e.ctrlKey || e.metaKey || full)) return;
    e.preventDefault();
    V.zoomT = THREE.MathUtils.clamp(V.zoomT * Math.exp(e.deltaY * 0.0015), 35 / baseFov, 75 / baseFov); dirty = true;
  }, { passive: false });

  // ---- 키보드: 3D 위에 마우스가 있거나 전체화면일 때만 (페이지 스크롤 키를 빼앗지 않게) ----
  let hover = false; const keys = new Set();
  stage.addEventListener('pointerenter', () => { hover = true; }); stage.addEventListener('pointerleave', () => { hover = false; keys.clear(); });
  const paused = () => stage.classList.contains('modal-open');   // 장치 카드·체험 화면이 떠 있으면 3D 입력 멈춤
  const active = () => hover || stage.classList.contains('is-full') || document.fullscreenElement === stage;
  const KEYMAP = { KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back', KeyA: 'sl', KeyD: 'sr', ArrowLeft: 'tl', ArrowRight: 'tr' };
  addEventListener('keydown', (e) => {
    const k = KEYMAP[e.code]; if (!k || !T.ready || !active() || paused() || e.target.closest?.('input,textarea')) return;
    e.preventDefault(); keys.add(k); glide = null; zoneLock = null; endRoute(false);
  });
  addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k && keys.delete(k) && !keys.size) afterMove(); });
  pad.addEventListener('click', (e) => {
    const k = e.target.closest('button')?.dataset.k; if (!k || !T.ready) return; zoneLock = null; endRoute(false);
    if (k === 'left') V.yawT += Math.PI / 6; else if (k === 'right') V.yawT -= Math.PI / 6;
    else {
      const s = k === 'fwd' ? 1 : -1, p = camera.position;
      const r2 = reach(p.x, p.z, p.x - Math.sin(V.yawT) * s, p.z - Math.cos(V.yawT) * s);
      walkTo(r2.x, r2.z, null, null, 450);
    }
    dirty = true;
  });

  // ---- 번호 핫스팟: 모든 구역을 만들어 두고 현재 구역 것만 보인다 ----
  const pins = [];
  for (const [z, d] of Object.entries(SCENES)) (d.anchors || []).forEach((p, i) => {
    if (!p) return;
    const b = el('button', 'v3d-pin', String(i + 1)); b.type = 'button'; b.setAttribute('aria-label', `${z.toUpperCase()} 장치 ${i + 1}`);
    b.addEventListener('click', (e) => { e.stopPropagation(); onPin?.(z, i + 1); });   // 3D 안 오버레이 카드로 (페이지 스크롤 없음)
    const o = new CSS2DObject(b); o.position.set(...p); o.userData.zone = z; o.userData.n = i + 1; o.visible = false; scene.add(o); pins.push(o);
  });

  // ---- 평면도의 '현재 위치' 표시 ----
  const you = plan.querySelector('.you');
  const fwd = new THREE.Vector3();
  const updateYou = () => {
    if (!you) return;
    camera.getWorldDirection(fwd);
    const ang = Math.atan2(-fwd.z, fwd.x) * 180 / Math.PI;   // Blender 평면 각도(동쪽 0°, 북쪽 90°)
    // 평면도 SVG는 DWG 시트와 같은 방향(살롱 왼쪽, 창 아래): SVG = (−x, −z), 방향은 180° 돌려 표시
    you.setAttribute('transform', `translate(${(-camera.position.x).toFixed(2)} ${(-camera.position.z).toFixed(2)}) rotate(${(180 - ang).toFixed(1)})`);
  };
  const lookPoint = () => new THREE.Vector3(camera.position.x - Math.sin(V.yaw) * 2.5, 0, camera.position.z - Math.cos(V.yaw) * 2.5);
  const regionOf = (p) => { const x = p.x, y = -p.z; for (const [z, x0, y0, x1, y1] of REGIONS) if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return z; return 'corridor'; };
  const setZone = (z) => {
    if (z === T.zone) return; T.zone = z;
    for (const o of pins) o.visible = o.userData.zone === z;
    plan.querySelectorAll('[data-zone]').forEach((e) => e.classList.toggle('on', e.dataset.zone === z));
    onZone?.(z); queueOccl();
  };

  // ---- 조명 풀: 개수를 고정해 셰이더 재컴파일 없이, 시선 앞 가까운 원본 조명의 값을 옮겨 담는다 ----
  const srcLights = [];
  const pool = { spot: [], point: [] };
  const POOL = isSmall() ? { spot: 6, point: 2 } : { spot: 10, point: 4 };
  for (let i = 0; i < POOL.spot; i++) { const L = new THREE.SpotLight(0xffffff, 0); scene.add(L, L.target); pool.spot.push(L); }
  for (let i = 0; i < POOL.point; i++) { const L = new THREE.PointLight(0xffffff, 0); scene.add(L); pool.point.push(L); }
  const lastLit = new THREE.Vector3(1e9, 0, 0);
  function relight(force) {
    if (!srcLights.length) return;
    const c = lookPoint(); c.y = 1.6; if (!force && c.distanceTo(lastLit) < 1.5) return; lastLit.copy(c);
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

  // ---- 가림 판정(움직임이 멈췄을 때만) ----
  const meshes = [];
  const ray = new THREE.Raycaster();
  let occlT = 0;
  function queueOccl() {
    clearTimeout(occlT);
    occlT = setTimeout(() => {
      camera.updateMatrixWorld();
      for (const o of pins) {
        if (!o.visible) continue;
        const to = o.position.clone().sub(camera.position), dist = to.length();
        ray.set(camera.position, to.normalize()); ray.far = Math.max(0.01, dist - 0.6);
        o.element.classList.toggle('hid', ray.intersectObjects(meshes, false).length > 0);
      }
      dirty = true;
    }, 200);
  }
  function afterMove() { if (T.ready) { if (!zoneLock) setZone(regionOf(lookPoint())); relight(); queueOccl(); } dirty = true; }

  // ---- 구역 이동: 직선으로 막힘없이 갈 수 있으면 걸어서, 아니면 잠깐 어두워졌다가 이동 ----
  T.flyTo = (z, instant) => {
    const p = PRESETS[z]; if (!p) return;
    if (!T.ready || instant) { setPose(p); setZone(z); return Promise.resolve(true); }
    V.zoomT = 1; zoneLock = z; setZone(z);
    return T.travelTo(p);
  };
  T.pending = 'corridor';

  // ---- 루프 ----
  let tPrev = performance.now();
  // ?debug=timer: 화면에 안 보이는 점검용 탭에서도 돌도록 타이머로 프레임을 돌린다(평소에는 requestAnimationFrame)
  const nextFrame = /[?&]debug=timer\b/.test(location.search) ? (f) => setTimeout(f, 16) : requestAnimationFrame;
  const tick = () => {
    nextFrame(tick);
    const now = performance.now(), dt = Math.min(0.05, (now - tPrev) / 1000); tPrev = now;
    if (!T.ready) return;
    let moved = false;
    // 키보드 걷기(1.6 m/s)·돌기
    if (keys.size) {
      const sp = 1.6 * dt, f = (keys.has('fwd') ? 1 : 0) - (keys.has('back') ? 1 : 0), st = (keys.has('sr') ? 1 : 0) - (keys.has('sl') ? 1 : 0);
      if (keys.has('tl')) V.yawT += 1.6 * dt; if (keys.has('tr')) V.yawT -= 1.6 * dt;
      const sy = Math.sin(V.yaw), cy = Math.cos(V.yaw);
      if (f || st) moved = tryMove((-sy * f + cy * st) * sp, (-cy * f - sy * st) * sp) || moved;
      moved = true;
    }
    if (route) {
      const r = route, t = Math.min(r.dur, (now - r.t0) / 1000), s = sAt(r, t), p = pointAt(r, s);
      camera.position.x = p.x; camera.position.z = p.z;
      const left = r.L - s;
      if (left > 1.5) { const q = pointAt(r, s + 1.2); if (Math.hypot(q.x - p.x, q.z - p.z) > 0.05) V.yawT = wrapYaw(Math.atan2(-(q.x - p.x), -(q.z - p.z))); V.pitchT = 0; }
      else if (r.yaw != null) { V.yawT = wrapYaw(r.yaw); V.pitchT = r.pitch ?? 0; }
      if (left < 1.5 && r.fov) V.zoomT = r.fov / baseFov;
      if (t >= r.dur) { endRoute(true); afterMove(); }
      moved = true;
    }
    if (glide) {
      const t = Math.min(1, (now - glide.t0) / glide.dur), k = ease(t);
      const x = glide.x0 + (glide.x1 - glide.x0) * k, z = glide.z0 + (glide.z1 - glide.z0) * k, p = camera.position;
      if (!tryMove(x - p.x, z - p.z) || t >= 1) { glide = null; afterMove(); }
      moved = true;
    }
    // 시선·화각 감쇠
    const a = 1 - Math.exp(-dt * 14);
    if (Math.abs(V.yawT - V.yaw) > 1e-5 || Math.abs(V.pitchT - V.pitch) > 1e-5) { V.yaw += (V.yawT - V.yaw) * a; V.pitch += (V.pitchT - V.pitch) * a; moved = true; }
    if (Math.abs(V.zoomT - V.zoom) > 1e-4) { V.zoom += (V.zoomT - V.zoom) * a; applyFov(); moved = true; }
    camera.rotation.set(V.pitch, V.yaw, 0); camera.position.y = EYE;
    if (moved) { if (!zoneLock && !glide && !route) { const z = regionOf(lookPoint()); if (z !== T.zone) setZone(z); } relight(); }
    if (moved || dirty) { renderer.render(scene, camera); labelR.render(scene, camera); updateYou(); dirty = false; }
  };

  // ---- 도구 ----
  bReset.addEventListener('click', () => { zoneLock = T.zone || 'corridor'; V.zoomT = 1; T.travelTo(PRESETS[zoneLock]); });
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
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stage.classList.contains('is-full') && !paused()) exitPseudo(); });

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
    grid = buildGrid(meshes.filter((m) => !m.material?.name?.startsWith('halo_')));
    bar.remove(); T.ready = true; plan.classList.add('live');
    showOnboard();
    const z = T.pending; T.zone = null; T.flyTo(z, true); relight(true); dirty = true;
    return T;
  }).catch((err) => { pct.textContent = '3D 공간을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'; bar.classList.add('err'); console.warn(err); });
  // ---- 처음 한 번 조작 안내(닫으면 이 브라우저에서는 다시 안 뜸) ----
  const OB_KEY = 'ce-tour-onboard-v1';
  function showOnboard() {
    let seen = false; try { seen = localStorage.getItem(OB_KEY) === '1'; } catch (e) { /* 저장소 막힘: 매번 보여도 무방 */ }
    if (seen && !/[?&]onboard\b/.test(location.search)) return;
    const touch = matchMedia('(pointer: coarse)').matches;
    const ob = el('div', 'v3d-onboard glass', `<p><b>둘러보는 방법</b><span>드래그로 둘러보기 · 바닥을 ${touch ? '두 번 ' : ''}눌러 이동 · 번호를 눌러 체험장치 보기</span></p><button type="button">확인</button>`);
    ob.setAttribute('role', 'note');
    const close = () => { ob.remove(); try { localStorage.setItem(OB_KEY, '1'); } catch (e) { /* 무시 */ } };
    ob.querySelector('button').addEventListener('click', close);
    stage.append(ob);
  }
  // ---- 체험 따라하기용: 장치마다 관람객이 서는 자리 → 그 자리에서 장치 전체를 화면에 담는 자세 ----
  // scenes.js follow[z][n-1] = { d: [x, z, 세로화각], m: [...] } (d = 가로 화면, m = 세로 휴대폰 화면; tour.js computeFollow로 계산·검토).
  // 장치 상자(box)의 중심이 화면 위쪽 39% 지점에 오게 내려다봐서 아래 설명 카드(화면 아래 약 25%)가 장치를 가리지 않는다.
  const FIT_CY = 0.39;
  const boxCorners = (b) => { const [nx, nz] = b.n, l = Math.hypot(nx, nz), Nx = nx / l, Nz = nz / l, Tx = -Nz, Tz = Nx, dp = b.d || 0.02, out = [];
    for (const sw of [-1, 1]) for (const sh of [-1, 1]) for (const sd of [-1, 1]) out.push(new THREE.Vector3(b.c[0] + Tx * b.w * sw + Nx * dp * sd, b.c[1] + b.h * sh, b.c[2] + Tz * b.w * sw + Nz * dp * sd)); return out; };
  const fitCam = new THREE.PerspectiveCamera(50, 1.6, 0.05, 100); fitCam.rotation.order = 'YXZ';
  // 상자 중심을 겨눈 뒤, 화면에 비친 상자의 좌우 끝·위아래 끝이 [가로 가운데, 세로 8–70% 가운데]에 오도록 시선을 몇 번 보정한다
  // (비스듬히 볼 때 가까운 쪽 끝이 화면 가장자리에 붙지 않게)
  const poseFor = (st, box, vfov, aspect = camera.aspect) => {
    const pos = new THREE.Vector3(st[0], EYE, st[1]), dx = box.c[0] - st[0], dz = box.c[2] - st[1], h = Math.hypot(dx, dz);
    const v = THREE.MathUtils.degToRad(vfov), tv = Math.tan(v / 2), th = tv * aspect;
    let yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(box.c[1] - EYE, h) - Math.atan((1 - 2 * FIT_CY) * tv);
    fitCam.fov = vfov; fitCam.aspect = aspect; fitCam.updateProjectionMatrix(); fitCam.position.copy(pos);
    const cs = boxCorners(box);
    for (let it = 0; it < 10; it++) {      // 10회: 넓은 화각(세로 휴대폰 C0 후보작 줄)에서도 좌우 가운데로 수렴
      fitCam.rotation.set(pitch, yaw, 0); fitCam.updateMatrixWorld();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const c of cs) { const q = c.clone().project(fitCam); if (q.z > 1) continue; x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
      if (x0 > x1) break;
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, ty = 1 - 2 * FIT_CY;          // 목표: 가로 0, 세로 화면 39% 지점
      yaw -= Math.atan(mx * th) * 0.9; pitch += (Math.atan(my * tv) - Math.atan(ty * tv)) * 0.9;
    }
    return { pos, yaw, pitch: THREE.MathUtils.clamp(pitch, -1.0, 1.0), fov: vfov };
  };
  T.devicePose = (z, n) => {
    const d = SCENES[z], f = d?.follow?.[n - 1], box = d?.boxes?.[n - 1]; if (!f || !box) return null;
    const portrait = camera.aspect < 1, st = portrait ? f.m : f.d, B = portrait && box.m ? { ...box, ...box.m } : box;
    // 저장된 세로 화각은 기준 화면비(1.6 / 0.563)에서 잰 값 → 지금 화면비에서 가로로 모자라면 더 넓힌다
    const refA = portrait ? 0.563 : 1.6, a = camera.aspect, need = st[2];
    const h = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(need) / 2) * refA), v = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(h / 2) / a));
    return poseFor(st, B, THREE.MathUtils.clamp(Math.max(need, a < refA ? v : need, baseFov), 20, FOV_MAX), a);
  };
  T.markPin = (z, n) => { for (const o of pins) o.element.classList.toggle('cur', n != null && o.userData.zone === z && o.userData.n === n); };
  T.setFollow = (on) => stage.classList.toggle('v3d-follow', !!on);
  T.lockZone = (z) => { zoneLock = z; setZone(z); };
  T.unlockZone = () => { zoneLock = null; V.zoomT = 1; dirty = true; afterMove(); };
  // 점검용(?debug): 콘솔에서 시점 지정·캡처
  if (/[?&]debug\b/.test(location.search)) window.__tour = { THREE, meshes, T, camera, V, renderer, scene, findPath, PRESETS, routeTime, cellFree, SCENES,
    // 장치마다 설 자리 후보(반경 1.2–2.8 m, 15° 간격) 중: 빈 칸 · 그 구역 시작 자리에서 걸어갈 수 있음 · 눈에서 장치까지 막힘 없음 →
    // 거리 d0와 '시작 자리 쪽에서 다가가는 방향'에 가까운 것
    // 장치 상자를 화면 [x 4–96%, y 8–70%] 안에 담을 수 있는 서는 자리 찾기: 빈 칸 · 복도에서 걸어갈 수 있음 · 눈에서 상자 중심·윗모서리까지 막힘 없음,
    // 화각을 기본(가로 50° / 세로폰 72°)에서 최대(66° / 84°)까지만 넓혀서 들어가는 것 중 화각이 작고, 정면에 가깝고, 너무 멀지 않은 곳
    computeFollow: (only) => {
      const out = {}, ray = new THREE.Raycaster(), cam = new THREE.PerspectiveCamera(50, 1.6, 0.05, 100); cam.rotation.order = 'YXZ';
      // 걸어갈 수 있는 칸(복도 시작 자리에서 채우기)
      const reachable = new Set(); { const s = PRESETS.corridor.pos, q = [[Math.floor((s.x - GRID.x0) / GRID.s), Math.floor((s.z - GRID.z0) / GRID.s)]];
        while (q.length) { const [i, j] = q.pop(); const k = j * GRID.nx + i; if (reachable.has(k) || i < 0 || j < 0 || i >= GRID.nx || j >= GRID.nz || grid.inf[k]) continue; reachable.add(k); q.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]); } }
      const reach = (x, z) => { const i = Math.floor((x - GRID.x0) / GRID.s), j = Math.floor((z - GRID.z0) / GRID.s); return reachable.has(j * GRID.nx + i); };
      const corners = (b) => { const [nx, nz] = b.n, l = Math.hypot(nx, nz), Nx = nx / l, Nz = nz / l, Tx = -Nz, Tz = Nx, out_ = [], dp = b.d || 0.02;
        for (const sw of [-1, 1]) for (const sh of [-1, 1]) for (const sd of [-1, 1]) out_.push(new THREE.Vector3(b.c[0] + Tx * b.w * sw + Nx * dp * sd, b.c[1] + b.h * sh, b.c[2] + Tz * b.w * sw + Nz * dp * sd)); return out_; };
      const cover = (st, b, v, a, cs) => { const p = poseFor(st, b, v, a); cam.fov = v; cam.aspect = a; cam.updateProjectionMatrix(); cam.position.copy(p.pos); cam.rotation.set(p.pitch, p.yaw, 0); cam.updateMatrixWorld();
        let n = 0; for (const c of cs) { const q = c.clone().project(cam); if (!(q.z > 1 || Math.abs(q.x) > 0.92 || q.y > 0.84 || q.y < -0.40)) n++; } return n / cs.length; };
      const fits = (st, b, v, a, cs) => cover(st, b, v, a, cs) === 1;
      const los = (st, b, cs) => { const eye = new THREE.Vector3(st[0], EYE, st[1]); const tg = [new THREE.Vector3(...b.c)];
        const [nx, nz] = b.n, l = Math.hypot(nx, nz); for (const sw of [-0.6, 0.6]) for (const sh of (b.loLos ? [0.5, -0.5] : [0.5])) tg.push(new THREE.Vector3(b.c[0] - nz / l * b.w * sw + nx / l * (b.d || 0), b.c[1] + b.h * sh, b.c[2] + nx / l * b.w * sw + nz / l * (b.d || 0)));
        return tg.every((t, i) => { const dir = t.clone().sub(eye), L = dir.length(); ray.set(eye, dir.normalize()); ray.far = L - (i === 0 ? (b.d || 0) + 0.25 : 0.25); return ray.intersectObjects(meshes, false).length === 0; }); };
      const ASP = { d: [1.6, 50.2, 74], m: [0.563, 72, 86] };
      for (const [z, d] of Object.entries(SCENES)) {
        if (!d.boxes || (only && !only.includes(z))) continue; out[z] = [];
        for (const b0 of d.boxes) {
          const res = {};
          for (const [k, [a, v0, v1_]] of Object.entries(ASP)) {
            const b = k === 'm' && b0.m ? { ...b0, ...b0.m } : b0, v1 = b.fovMax || v1_, cs = corners(b), [nx, nz] = b.n, ln = Math.hypot(nx, nz), base = Math.atan2(nz / ln, nx / ln), amax = b.amax || 75;
            const cand = [];
            for (let r = 1.0; r <= 6.51; r += 0.25) for (let da = -amax; da <= amax; da += 5) {
              const ang = base + da * Math.PI / 180, x = +(b.c[0] + Math.cos(ang) * r).toFixed(2), zz = +(b.c[2] + Math.sin(ang) * r).toFixed(2);   // scenes.js에 저장되는 값(소수 2자리)으로 검사
              if (!cellFree(x, zz) || !reach(x, zz) || (b.inRect && !(x >= b.inRect[0] && zz >= b.inRect[1] && x <= b.inRect[2] && zz <= b.inRect[3]))) continue;
              let v = null; if (fits([x, zz], b, v0, a, cs)) v = v0; else if (fits([x, zz], b, v1, a, cs)) { let lo = v0, hi = v1; for (let it = 0; it < 7; it++) { const m = (lo + hi) / 2; if (fits([x, zz], b, m, a, cs)) hi = m; else lo = m; } v = hi; }
              const score = (v != null ? v - v0 : 100 + 200 * (1 - cover([x, zz], b, v1, a, cs))) + 8 * Math.max(0, r - (b.rmax || 4)) + 6 * (da / 75) ** 2 + 0.3 * r;
              cand.push({ x, zz, v, score, r, da });
            }
            cand.sort((p, q) => p.score - q.score);
            const pick = cand.find((c) => los([c.x, c.zz], b, cs));
            res[k] = pick ? [+pick.x.toFixed(2), +pick.zz.toFixed(2), +(pick.v ?? v1).toFixed(1)] : null; if (pick && pick.v == null) (out._partial ||= []).push(`${z}${out[z].length + 1}${k}`);
          }
          out[z].push(res);
        }
      }
      return out;
    },
    computeStands: (d0 = 1.8) => {
      const out = {}, ray = new THREE.Raycaster(), eye = new THREE.Vector3(), tgt = new THREE.Vector3();
      for (const [z, d] of Object.entries(SCENES)) {
        if (!d.anchors?.length) continue; const P = PRESETS[z].pos; out[z] = [];
        for (const a of d.anchors) {
          tgt.set(...a); const pref = Math.atan2(P.z - a[2], P.x - a[0]); let best = null;
          for (const r of [1.2, 1.5, 1.8, 2.1, 2.4, 2.8]) for (let k = 0; k < 24; k++) {
            const ang = pref + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 12, x = a[0] + Math.cos(ang) * r, zz = a[2] + Math.sin(ang) * r;
            if (!cellFree(x, zz)) continue;
            eye.set(x, EYE, zz); const dir = tgt.clone().sub(eye), L = dir.length(); ray.set(eye, dir.normalize()); ray.far = L - 0.3;
            if (ray.intersectObjects(meshes, false).length) continue;
            const score = Math.abs(r - d0) * 0.8 + (1 - Math.cos(ang - pref)) * 1.6;
            if (!best || score < best.score) best = { score, x, zz };
          }
          if (best && !findPath(P.x, P.z, best.x, best.zz)) best = null;
          out[z].push(best ? [+best.x.toFixed(2), +best.zz.toFixed(2)] : null);
        }
      }
      return out;
    }, setPose: (x, z, yawDeg, pitchDeg = 0) => { camera.position.set(x, EYE, z); V.yaw = V.yawT = THREE.MathUtils.degToRad(yawDeg); V.pitch = V.pitchT = THREE.MathUtils.degToRad(pitchDeg); zoneLock = null; dirty = true; afterMove(); },
    snap: (w = 1600, h = 1000) => { const s = new THREE.Vector2(); renderer.getSize(s); const a = camera.aspect, pr = renderer.getPixelRatio(); renderer.setPixelRatio(1); camera.rotation.set(V.pitch, V.yaw, 0); camera.position.y = EYE; relight(true); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.render(scene, camera); const u = renderer.domElement.toDataURL('image/jpeg', 0.9); renderer.setPixelRatio(pr); renderer.setSize(s.x, s.y, false); camera.aspect = a; camera.updateProjectionMatrix(); dirty = true; return u; } };
  const prevFly = T.flyTo;
  T.flyTo = (z, instant) => { if (!T.ready) { T.pending = z; plan.querySelectorAll('[data-zone]').forEach((e) => e.classList.toggle('on', e.dataset.zone === z)); onZone?.(z); return Promise.resolve(false); } return prevFly(z, instant); };
  tick();
  return T;
}
