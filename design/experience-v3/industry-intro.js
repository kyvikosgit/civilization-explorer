// 산업혁명 도입(11/23) — 1873년 생라자르역 승강장 3D. 2초 안.
//   철골 기둥 · 삼각 트러스 위 유리 지붕 · 돌 승강장 · 선로 셋 · 증기기관차(굴뚝에서 푸른 김) · 지붕 틈 빛줄기.
//   카메라가 승강장 끝에서 기관차 옆을 지나 안으로 걸어 들어가고, 끝에서 승강장 너머의 모네 〈생라자르역〉(페이지 배경과 같은 그림)과
//   '화면 위 같은 자리 · 같은 크기'로 멈춘 뒤 걷힌다 — 페이지 그림(#sceneImg)으로 그대로 이어짐.
//   three.js(0.147) · 외부 모델 없음. 누르면 바로 끝. playIndustryIntro({ host, imgEl, onDone })
//   (이전 대합실 문 도입은 쓰지 않음)
import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const PAINT = new URL('../experience-v2/ticket/img/lazare-1877.jpg', import.meta.url).href;
const AR = 1600 / 1189;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t, a, d) => clamp((t - a) / d);
function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const TL = { dolly: 0, dollyD: 1.6, out: 1.55, outD: 0.4 };   // 끝 = 1.95초
const PZ = -42, PH = 26, PW = PH * AR, PY0 = -3.2;            // 그림판: 승강장 너머 · 밑변이 선로 아래

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; }

export function playIndustryIntro({ host, imgEl, onDone } = {}) {
  const hb = host.getBoundingClientRect();
  const root = document.createElement('div');
  root.id = 'inIntro'; root.setAttribute('aria-hidden', 'true');
  Object.assign(root.style, { position: 'fixed', left: hb.left + 'px', top: hb.top + 'px', width: hb.width + 'px', height: hb.height + 'px', zIndex: 80, background: '#0b0907', transition: 'opacity .1s linear' });
  const cv = document.createElement('canvas'); Object.assign(cv.style, { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }); root.appendChild(cv);
  document.body.appendChild(root);
  const VW = hb.width, VH = hb.height;
  const SPEED = (window.M100_INTRO && window.M100_INTRO.speed) || 1;
  const FREEZE = new URLSearchParams(location.search).get('inT');

  let renderer, done = false, raf = 0;
  const finish = () => {
    if (done) return; done = true; cancelAnimationFrame(raf); removeEventListener('pointerdown', finish, true);
    root.style.transition = 'opacity .25s ease'; root.style.opacity = 0; onDone?.(); setTimeout(() => { root.remove(); renderer?.dispose(); }, 300);
  };
  addEventListener('pointerdown', finish, true);
  try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { finish(); return; }
  renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1)); renderer.setSize(VW, VH, false);
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
  const scene = new T.Scene(); scene.background = new T.Color(0x8c93a6); scene.fog = new T.Fog(0x9aa2b6, 16, 48);
  const cam = new T.PerspectiveCamera(58, VW / VH, 0.05, 120);
  const pmrem = new T.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;   // 쇠 · 놋쇠에 반사
  // 끝 무렵 아래에서 페이지와 같은 어둠(.scene-shade)이 깔린다 — 걷힐 때 아래쪽이 갑자기 바뀌지 않게
  const shade = document.createElement('div'); Object.assign(shade.style, { position: 'absolute', left: 0, right: 0, top: '46%', bottom: 0, opacity: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(12,10,8,0), rgba(12,10,8,.78) 26%, #0C0A08 44%)' });
  root.appendChild(shade);
  const R = rnd(5);

  // ── 재료
  const iron = new T.MeshStandardMaterial({ color: 0x15191a, roughness: 0.5, metalness: 0.6, envMapIntensity: 0.35 });
  const ironLight = new T.MeshStandardMaterial({ color: 0x262b2a, roughness: 0.55, metalness: 0.6, envMapIntensity: 0.35 });
  const paintG = new T.MeshStandardMaterial({ color: 0x0f2219, roughness: 0.45, metalness: 0.2, envMapIntensity: 0.4 });   // 기관차 몸 — 짙은 초록 칠
  const brass = new T.MeshStandardMaterial({ color: 0x9a7636, roughness: 0.4, metalness: 0.85, envMapIntensity: 0.6 });
  const red = new T.MeshStandardMaterial({ color: 0x3e140e, roughness: 0.6, metalness: 0.1, envMapIntensity: 0.3 });
  const sleeperM = new T.MeshStandardMaterial({ color: 0x3a2c1f, roughness: 1 });
  const stoneTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#7d7466'; g.fillRect(0, 0, w, h); const r = rnd(3); for (let y = 0; y < h; y += 64) for (let x = (y / 64 % 2) * -48; x < w; x += 96) { const v = 0.85 + r() * 0.2; g.fillStyle = `rgb(${125 * v | 0},${116 * v | 0},${102 * v | 0})`; g.fillRect(x + 2, y + 2, 92, 60); } });
  stoneTex.wrapS = stoneTex.wrapT = T.RepeatWrapping; stoneTex.repeat.set(3, 18);
  const stone = new T.MeshStandardMaterial({ map: stoneTex, roughness: 0.9 });
  const ballastTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#4a4238'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { const v = 40 + Math.random() * 70; g.fillStyle = `rgb(${v + 10 | 0},${v | 0},${v - 8 | 0})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); } });
  ballastTex.wrapS = ballastTex.wrapT = T.RepeatWrapping; ballastTex.repeat.set(6, 40);
  const ballast = new T.MeshStandardMaterial({ map: ballastTex, roughness: 1 });
  const glass = new T.MeshStandardMaterial({ color: 0xcfd8e6, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.35, side: T.DoubleSide, emissive: 0x9aa6c0, emissiveIntensity: 0.35, depthWrite: false });
  const box = (w, h, d, m, x, y, z, p = scene) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); p.add(o); return o; };
  const cyl = (r1, r2, h, m, x, y, z, rx = 0, rz = 0, p = scene, sg = 20) => { const o = new T.Mesh(new T.CylinderGeometry(r1, r2, h, sg), m); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); p.add(o); return o; };

  // ── 바닥: 선로 바닥(자갈) · 승강장 둘(돌) · 레일 · 침목
  const Z0 = 10, Z1 = PZ + 1, L = Z0 - Z1, ZC = (Z0 + Z1) / 2;
  const gnd = new T.Mesh(new T.PlaneGeometry(40, L), ballast); gnd.rotation.x = -Math.PI / 2; gnd.position.set(0, 0, ZC); scene.add(gnd);
  box(4.2, 0.9, L, stone, 5.6, 0.45, ZC); box(4.2, 0.9, L, stone, -7.4, 0.45, ZC);
  box(4.2, 0.06, L, new T.MeshStandardMaterial({ color: 0x8a7f6c, roughness: 0.85 }), 5.6, 0.92, ZC);
  for (const tx of [-3.9, -0.6, 2.4]) {
    for (const dx of [-0.72, 0.72]) box(0.07, 0.14, L, ironLight, tx + dx, 0.07, ZC);
    for (let z = Z0; z > Z1; z -= 0.75) box(2.2, 0.08, 0.22, sleeperM, tx, 0.03, z);
  }

  // ── 지붕(카메라 끝자리 뒤까지만 — 그 너머는 그림 속 지붕): 기둥 · 가로보 · 삼각 트러스 · 유리
  const RZ0 = 9, RZ1 = -13, SPAN = 18, EAVE = 7.2, RIDGE = 12.5;
  const slope = Math.atan2(RIDGE - EAVE, SPAN / 2), slen = Math.hypot(SPAN / 2, RIDGE - EAVE);
  for (let z = RZ0; z >= RZ1; z -= 5.5) {
    for (const x of [-SPAN / 2 + 0.6, SPAN / 2 - 0.6]) { cyl(0.16, 0.2, EAVE, iron, x, EAVE / 2, z); cyl(0.32, 0.32, 0.3, iron, x, 0.15, z); cyl(0.26, 0.2, 0.35, brass, x, EAVE - 0.1, z); }
    box(SPAN, 0.14, 0.14, iron, 0, EAVE, z);
    for (const s of [-1, 1]) { const b = box(slen, 0.16, 0.16, iron, s * SPAN / 4, (EAVE + RIDGE) / 2, z); b.rotation.z = -s * slope; }
    for (let i = 1; i < 6; i++) { const x = -SPAN / 2 + i * SPAN / 6, top = EAVE + (RIDGE - EAVE) * (1 - Math.abs(x) / (SPAN / 2)); box(0.06, top - EAVE, 0.06, iron, x, (top + EAVE) / 2, z); }
  }
  const dz = RZ0 - RZ1 + 1, zm = (RZ0 + RZ1) / 2;
  for (const s of [-1, 1]) {   // 지붕면 유리 + 서까래
    const g = new T.Mesh(new T.PlaneGeometry(slen, dz), glass);
    g.position.set(s * SPAN / 4, (EAVE + RIDGE) / 2 + 0.05, zm); g.rotation.order = 'ZXY'; g.rotation.set(-Math.PI / 2, 0, -s * slope); scene.add(g);
    for (let k = 0; k <= 10; k++) { const u = k / 10; box(0.04, 0.05, dz, iron, s * SPAN / 2 * (1 - u), EAVE + (RIDGE - EAVE) * u + 0.08, zm); }
  }
  for (let z = 6; z > RZ1; z -= 6) { cyl(0.04, 0.05, 3.2, iron, 3.9, 2.5, z); const l = new T.Mesh(new T.SphereGeometry(0.16, 12, 10), new T.MeshBasicMaterial({ color: 0xffe0a8 })); l.position.set(3.9, 4.15, z); scene.add(l); }

  // ── 증기기관차(가운데 선로, 카메라 쪽을 봄)
  const loco = new T.Group(); loco.position.set(-0.6, 0, -4.5); scene.add(loco);
  cyl(0.95, 0.95, 5.2, paintG, 0, 2.1, 0, Math.PI / 2, 0, loco, 40);
  for (const z of [-2.2, -0.8, 0.8, 2.2]) cyl(0.975, 0.975, 0.09, brass, 0, 2.1, z, Math.PI / 2, 0, loco, 40);   // 보일러 놋쇠 띠
  cyl(1.0, 1.0, 0.9, iron, 0, 2.1, 2.9, Math.PI / 2, 0, loco, 28);
  const door = new T.Mesh(new T.CircleGeometry(0.82, 28), ironLight); door.position.set(0, 2.1, 3.36); loco.add(door);
  cyl(0.24, 0.34, 1.3, iron, 0, 3.55, 2.8, 0, 0, loco);
  cyl(0.4, 0.4, 0.12, iron, 0, 4.2, 2.8, 0, 0, loco);
  cyl(0.38, 0.42, 0.6, brass, 0, 3.25, 0.6, 0, 0, loco);
  box(2.6, 2.4, 2.0, paintG, 0, 2.6, -3.3, loco); box(0.7, 0.6, 0.05, new T.MeshStandardMaterial({ color: 0xe8d8a8, emissive: 0xffd79a, emissiveIntensity: 0.6 }), 0.7, 3.1, -2.27, loco); box(0.7, 0.6, 0.05, new T.MeshStandardMaterial({ color: 0xe8d8a8, emissive: 0xffd79a, emissiveIntensity: 0.6 }), -0.7, 3.1, -2.27, loco); box(2.8, 0.14, 2.3, iron, 0, 3.85, -3.3, loco);
  box(2.6, 0.3, 7.4, red, 0, 0.95, -0.3, loco);
  box(2.9, 0.5, 0.25, red, 0, 1.05, 3.5, loco);
  for (const x of [-0.95, 0.95]) { cyl(0.18, 0.18, 0.35, ironLight, x, 1.05, 3.75, Math.PI / 2, 0, loco); for (const z of [1.6, -0.3, -2.2]) cyl(0.75, 0.75, 0.18, ironLight, x * 1.25, 0.78, z, 0, Math.PI / 2, loco, 24); }
  const lampM = new T.MeshBasicMaterial({ color: 0xfff0c8 });
  for (const x of [-0.7, 0.7]) { const l = new T.Mesh(new T.CircleGeometry(0.16, 16), lampM); l.position.set(x, 1.55, 3.64); loco.add(l); }
  const head = new T.PointLight(0xffe2b0, 0.8, 5, 2); head.position.set(0, 0.6, 4.6); loco.add(head);

  // ── 그림판(페이지 배경과 같은 그림)
  const paintMat = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, fog: false });
  const paint = new T.Mesh(new T.PlaneGeometry(PW, PH), paintMat); paint.position.set(0, PY0 + PH / 2, PZ); scene.add(paint);

  // ── 빛 · 빛줄기 · 김
  scene.add(new T.HemisphereLight(0xc9d2e8, 0x2a241c, 0.4));
  const sun = new T.DirectionalLight(0xf4f0ff, 1.0); sun.position.set(-8, 20, -6);   // 지붕 너머 안쪽에서 — 기관차는 역광으로 어둡게 scene.add(sun);
  const shaftTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(235,240,255,.55)'); gr.addColorStop(1, 'rgba(235,240,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const sd = g.createLinearGradient(0, 0, w, 0); sd.addColorStop(0, 'rgba(0,0,0,1)'); sd.addColorStop(0.3, 'rgba(0,0,0,0)'); sd.addColorStop(0.7, 'rgba(0,0,0,0)'); sd.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = sd; g.fillRect(0, 0, w, h); });
  const shaftMat = new T.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false });
  for (let i = 0; i < 6; i++) { const m = new T.Mesh(new T.PlaneGeometry(1.2 + R() * 1.2, 11), shaftMat); m.position.set(-6 + i * 2.6, 5.5, 4 - i * 3.2); m.rotation.set(0.12, 0.4, 0.28); scene.add(m); }
  const N = 260, pos = new Float32Array(N * 3), vel = [];
  for (let i = 0; i < N; i++) { const a = i < 160; pos[i * 3] = a ? -0.6 + (R() - 0.5) * 1.5 : (R() - 0.5) * 14; pos[i * 3 + 1] = a ? 4.3 + R() * 4 : 2 + R() * 6; pos[i * 3 + 2] = a ? -1.7 + (R() - 0.5) * 2 : -2 - R() * 14; vel.push([(R() - 0.5) * 0.6, a ? 1.6 + R() * 1.4 : 0.2 + R() * 0.3, (R() - 0.5) * 0.4, a]); }
  const steamGeo = new T.BufferGeometry(); steamGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
  const puff = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(206,212,232,.7)'); gr.addColorStop(1, 'rgba(206,212,232,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const steamMat = new T.PointsMaterial({ size: 1.6, map: puff, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
  scene.add(new T.Points(steamGeo, steamMat));
  const steamStep = (dt) => { const a = steamGeo.attributes.position.array; for (let i = 0; i < N; i++) { a[i * 3] += vel[i][0] * dt; a[i * 3 + 1] += vel[i][1] * dt; a[i * 3 + 2] += vel[i][2] * dt; if (vel[i][3] && a[i * 3 + 1] > 10) a[i * 3 + 1] = 4.3; } steamGeo.attributes.position.needsUpdate = true; };

  // ── 카메라 끝자리: 그림판이 페이지 #sceneImg 와 화면 위 같은 자리 · 같은 크기(정면을 똑바로 봄)
  const ir = imgEl.getBoundingClientRect();
  const f = (VH / 2) / Math.tan(T.MathUtils.degToRad(cam.fov) / 2);
  const d = PW * f / Math.max(1, ir.width);
  const cxPx = ir.left + ir.width / 2 - hb.left - VW / 2, cyPx = ir.top + ir.height / 2 - hb.top - VH / 2;
  const End = new T.Vector3(-cxPx * d / f, PY0 + PH / 2 + cyPx * d / f, PZ + d);
  const EndL = new T.Vector3(End.x, End.y, PZ);
  const Start = new T.Vector3(4.6, 2.55, 9.5), StartL = new T.Vector3(-0.8, 2.6, -2);
  const P = new T.Vector3(), Lk = new T.Vector3();
  function pose(t) {
    const k = ease(seg(t, TL.dolly, TL.dollyD));
    P.lerpVectors(Start, End, k); P.x += Math.sin(k * Math.PI) * 0.9;
    Lk.lerpVectors(StartL, EndL, Math.pow(k, 0.8));
    cam.position.copy(P); cam.lookAt(Lk);
    // 끝에서 시선 높이차로 생기는 기울기를 정확히 없앰(정면)
    if (k >= 0.999) { cam.position.copy(End); cam.rotation.set(0, 0, 0); }
  }

  new T.TextureLoader().load(PAINT, (tx) => { tx.encoding = T.sRGBEncoding; paintMat.map = tx; paintMat.needsUpdate = true; start(); }, undefined, () => start());
  function start() {
    if (done) return;
    pose(FREEZE != null ? +FREEZE : 0); renderer.compile(scene, cam); renderer.render(scene, cam);
    if (FREEZE != null) { window.__inReady = true; return; }
    const t0 = performance.now(); let tp = 0;
    const frame = (now) => {
      if (done) return;
      const t = (now - t0) / 1000 * SPEED, dt = Math.min(0.05, t - tp); tp = t;
      steamStep(dt); pose(t); renderer.render(scene, cam);
      shade.style.opacity = String(ease(seg(t, 0.9, 0.7)));
      if (t >= TL.out) root.style.opacity = String(1 - seg(t, TL.out, TL.outD));
      if (t >= TL.out + TL.outD) return finish();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }
}
