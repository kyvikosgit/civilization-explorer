// 시민사회 도입(11/09) — 1874년 4월, 카퓌신 대로 35번지 건물의 어두운 방. 커튼이 갈라지고 창이 안으로 열리면 햇빛이 쏟아지고,
//   카메라가 발코니 난간을 넘어 모네가 이 창에서 내려다본 대로(〈카퓌신 대로〉 1873)로 나간다 → 페이지의 거리 그림(.st-img)으로 이어진다.
//   three.js(살롱 도입과 같은 방식). 단위 미터, 창은 z=0 벽에, 방은 +z, 바깥은 -z. 그림은 휘거나 일렁이지 않는다(문 · 커튼은 단단한 판으로 움직임).
//   playSocietyIntro({ onDone }) — 누르면 끝 장면으로
import * as T from 'three';

const PAINT = new URL('../../booth/assets/img/morris_bg_capucines.jpg', import.meta.url).href;   // 모네 〈카퓌신 대로〉 1873 · 넬슨앳킨스 · 퍼블릭 도메인
const PAINT_TINT = new T.Color(0.86, 0.8, 0.72);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t, a, d) => clamp((t - a) / d);
function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

// 시간표(초)
const TL = { title: 0.3, curtain: 1.2, curtainD: 1.6, window: 2.5, windowD: 1.5, dolly: 3.3, dollyD: 3.6, out: 7.0 };

const WIN = { W: 1.5, H: 2.75, Y0: 0.05 };          // 창(프랑스식 여닫이 · 바닥까지)
const WALL_T = 0.36;                                // 벽 두께(창 안쪽 깊이)
const PLANE = { z: -26, H: 39 };                    // 창을 지나는 순간의 시야(높이 ≈ 1.4 × 거리)를 덮는 크기 — 그래야 그림 가장자리가 안 보인다                   // 바깥 그림판

function canvasTex(w, h, draw, aniso = 4) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = aniso; return t;
}

export function playSocietyIntro({ onDone } = {}) {
  const root = document.createElement('div');
  root.id = 'scIntro'; root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `<canvas class="sc-cv"></canvas>
    <div class="sc-title"><small>PARIS · AVRIL 1874</small><b>BOULEVARD<br>DES CAPUCINES</b><i>35, boulevard des Capucines</i></div>
    <p class="sc-skip">누르면 건너뜁니다</p>`;
  document.body.appendChild(root);
  const cv = root.querySelector('.sc-cv'), title = root.querySelector('.sc-title');
  const rb = document.querySelector('.stage')?.getBoundingClientRect() || { left: 0, top: 0, width: innerWidth, height: innerHeight };
  Object.assign(root.style, { left: `${rb.left}px`, top: `${rb.top}px`, width: `${rb.width}px`, height: `${rb.height}px` });
  const VW = rb.width, VH = rb.height;

  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: false }); }
  catch (e) { root.remove(); onDone?.(); return; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(VW, VH, false);
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.55;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const aniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new T.Scene(); scene.background = new T.Color(0x07050a);
  const cam = new T.PerspectiveCamera(VW / VH < 0.8 ? 70 : 56, VW / VH, 0.05, 80);   // 세로 화면은 시야를 넓혀 방이 보이게
  const R = rnd(11);

  // ── 재료
  // 벽지: 짙은 올리브 바탕에 가는 세로 줄 · 아래는 나무 징두리(허리 높이)
  const wallTex = canvasTex(512, 1024, (g, w, h) => {
    g.fillStyle = '#3E3A2C'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(214,190,120,.07)'; g.fillRect(x, 0, 3, h); g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(x + 14, 0, 9, h); }
    for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,240,200,.03)'; g.fillRect(Math.random() * w, Math.random() * h, 1, 2); }
    // 징두리(아래 32%)
    const y0 = h * 0.68; g.fillStyle = '#3B2516'; g.fillRect(0, y0, w, h - y0);
    g.fillStyle = 'rgba(255,210,150,.10)'; g.fillRect(0, y0, w, 6); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y0 + 6, w, 4);
    for (let x = 18; x < w; x += 128) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3; g.strokeRect(x, y0 + 30, 92, h - y0 - 60); g.strokeStyle = 'rgba(255,210,150,.08)'; g.lineWidth = 2; g.strokeRect(x + 3, y0 + 33, 92, h - y0 - 60); }
  }, aniso);
  wallTex.wrapS = T.RepeatWrapping; wallTex.wrapT = T.ClampToEdgeWrapping;
  const wallMat = (rw) => { const t = wallTex.clone(); t.needsUpdate = true; t.repeat.set(rw / 1.3, 1); return new T.MeshStandardMaterial({ map: t, roughness: 0.92, metalness: 0 }); };
  // 쪽마루(헤링본에 가까운 짧은 널)
  const floorTex = canvasTex(1024, 1024, (g, w, h) => {
    const r = rnd(3);
    for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 256) {
      const off = (y / 64) % 2 ? 128 : 0, v = 0.75 + r() * 0.3;
      g.fillStyle = `rgb(${Math.round(92 * v)},${Math.round(58 * v)},${Math.round(34 * v)})`; g.fillRect(x + off - 256, y, 256, 64); g.fillRect(x + off, y, 256, 64);
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x + off, y, 2, 64); g.fillRect(0, y, w, 2);
    }
    for (let i = 0; i < 20000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, 6 + Math.random() * 30, 1); }
  }, aniso);
  floorTex.wrapS = floorTex.wrapT = T.RepeatWrapping; floorTex.repeat.set(3, 3);
  const floorMat = new T.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0 });
  // 벨벳 커튼 — 세로 주름(밝고 어두운 띠) · 아래 금색 술
  const curtTex = canvasTex(512, 1024, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 14; i++) { const k = i / 14, v = 0.5 + 0.5 * Math.sin(k * Math.PI * 7 + 0.6); grd.addColorStop(k, `rgb(${Math.round(70 + 70 * v)},${Math.round(16 + 16 * v)},${Math.round(20 + 14 * v)})`); }
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(0.2, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.25)');
    g.fillStyle = sh; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 12000; i++) { g.fillStyle = `rgba(255,200,200,${Math.random() * 0.03})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 3); }
    g.fillStyle = '#9C7A3A'; g.fillRect(0, h - 34, w, 10);
    for (let x = 0; x < w; x += 6) { g.fillStyle = x % 12 ? '#B8924A' : '#7C5E2A'; g.fillRect(x, h - 24, 4, 24); }
  }, aniso);
  const curtMat = new T.MeshStandardMaterial({ map: curtTex, roughness: 0.95, metalness: 0, side: T.DoubleSide });
  const woodMat = new T.MeshStandardMaterial({ color: 0xBFB49C, roughness: 0.72 });          // 창틀: 미색 칠(오스만 양식)
  const ironMat = new T.MeshStandardMaterial({ color: 0x16130f, roughness: 0.5, metalness: 0.6 });
  const brassMat = new T.MeshStandardMaterial({ color: 0xB08A45, roughness: 0.35, metalness: 0.9 });
  const glassMat = new T.MeshStandardMaterial({ color: 0xcfe0ea, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.12, depthWrite: false });
  const box = (w, h, d, m, x, y, z, parent = scene, cast = true) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; parent.add(o); return o; };

  // ── 방: 바닥 · 천장 · 창 벽(구멍) · 옆 벽
  const RW = 7, RD = 6, RH = 3.9;
  const floor = new T.Mesh(new T.PlaneGeometry(RW, RD), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, WALL_T / 2 + RD / 2); floor.receiveShadow = true; scene.add(floor);
  const ceil = new T.Mesh(new T.PlaneGeometry(RW, RD), new T.MeshStandardMaterial({ color: 0x2a2620, roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, RH, RD / 2); scene.add(ceil);
  const zW = WALL_T / 2;                     // 창 벽의 방 쪽 면 z
  const wx = WIN.W / 2, wy0 = WIN.Y0, wy1 = WIN.Y0 + WIN.H;
  const side = (RW / 2 - wx);
  const wl = new T.Mesh(new T.BoxGeometry(side, RH, WALL_T), wallMat(side)); wl.position.set(-(wx + side / 2), RH / 2, 0); wl.receiveShadow = true; wl.castShadow = true; scene.add(wl);
  const wr = wl.clone(); wr.position.x = wx + side / 2; scene.add(wr);
  const top = new T.Mesh(new T.BoxGeometry(WIN.W, RH - wy1, WALL_T), wallMat(WIN.W)); top.position.set(0, wy1 + (RH - wy1) / 2, 0); top.castShadow = true; scene.add(top);
  for (const sx of [-1, 1]) { const sw = new T.Mesh(new T.PlaneGeometry(RD, RH), wallMat(RD)); sw.rotation.y = -sx * Math.PI / 2; sw.position.set(sx * RW / 2, RH / 2, RD / 2); sw.receiveShadow = true; scene.add(sw); }
  // 창 둘레 몰딩(미색) · 걸레받이
  box(WIN.W + 0.36, 0.14, 0.06, woodMat, 0, wy1 + 0.07, zW + 0.03);
  for (const sx of [-1, 1]) box(0.14, WIN.H + 0.1, 0.06, woodMat, sx * (wx + 0.07), wy0 + WIN.H / 2, zW + 0.03);
  box(RW, 0.16, 0.04, new T.MeshStandardMaterial({ color: 0x22150c, roughness: 0.7 }), 0, 0.08, zW + 0.02);

  // ── 여닫이 창 두 짝(안으로 열림) — 틀 · 가로살 · 유리 · 놋쇠 손잡이
  const leaves = [];
  for (const sx of [-1, 1]) {
    const hinge = new T.Group(); hinge.position.set(sx * wx, wy0, -0.02); scene.add(hinge);
    const lw = WIN.W / 2, s = -sx;                       // 경첩에서 가운데 쪽으로
    const fr = 0.07, d = 0.05;
    box(fr, WIN.H, d, woodMat, s * fr / 2, WIN.H / 2, 0, hinge);
    box(fr, WIN.H, d, woodMat, s * (lw - fr / 2), WIN.H / 2, 0, hinge);
    box(lw, fr, d, woodMat, s * lw / 2, fr / 2, 0, hinge);
    box(lw, fr, d, woodMat, s * lw / 2, WIN.H - fr / 2, 0, hinge);
    box(lw, 0.22, d, woodMat, s * lw / 2, 0.42, 0, hinge);                     // 아래 판벽
    for (const y of [0.9, 1.45, 2.05]) box(lw - fr, 0.032, d * 0.8, woodMat, s * lw / 2, y, 0, hinge);   // 가로살
    const gl = new T.Mesh(new T.PlaneGeometry(lw - fr * 2, WIN.H - 0.6), glassMat); gl.position.set(s * lw / 2, 0.53 + (WIN.H - 0.6) / 2, 0); hinge.add(gl);
    const knob = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.32, 10), brassMat); knob.position.set(s * (lw - 0.06), 1.15, 0.05); hinge.add(knob);
    leaves.push({ hinge, open: sx < 0 ? -1 : 1 });
  }
  // ── 발코니 난간(바깥, 연철) — 가로대 셋 · 세로살 · 고리
  const rail = new T.Group(); rail.position.set(0, 0, -WALL_T / 2 - 0.32); scene.add(rail);
  box(WIN.W + 0.5, 0.05, 0.06, ironMat, 0, 1.0, 0, rail); box(WIN.W + 0.5, 0.025, 0.025, ironMat, 0, 0.12, 0, rail); box(WIN.W + 0.5, 0.025, 0.025, ironMat, 0, 0.78, 0, rail);
  for (let x = -WIN.W / 2 - 0.2; x <= WIN.W / 2 + 0.21; x += 0.11) box(0.016, 0.86, 0.016, ironMat, x, 0.56, 0, rail);
  for (let x = -WIN.W / 2 - 0.09; x <= WIN.W / 2 + 0.1; x += 0.22) { const r = new T.Mesh(new T.TorusGeometry(0.05, 0.008, 6, 20), ironMat); r.position.set(x, 0.9, 0); r.castShadow = true; rail.add(r); }

  // ── 커튼 두 폭 + 놋쇠 봉 — 처음엔 닫혀 가운데 틈으로만 빛
  box(WIN.W + 1.4, 0.04, 0.04, brassMat, 0, wy1 + 0.32, zW + 0.22);
  const CW = WIN.W / 2 + 0.55, CH = wy1 + 0.3;
  const curtains = [-1, 1].map((sx) => {
    const g = new T.Group(); g.position.set(sx * (WIN.W / 2 + 0.6), 0, zW + 0.2); scene.add(g);     // 바깥 끝(모이는 쪽)
    const m = new T.Mesh(new T.PlaneGeometry(CW, CH, 1, 1), curtMat); m.position.set(-sx * CW / 2, CH / 2, 0); m.castShadow = true; m.receiveShadow = true; g.add(m);
    return { g, sx };
  });

  // ── 바깥: 모네의 대로(그림판) — 창 너머 멀리, 빛을 받지 않는 그림 그대로
  const paintMat = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const paintPlane = new T.Mesh(new T.PlaneGeometry(PLANE.H * (1440 / 1942), PLANE.H), paintMat);
  const PY = 1.55; paintPlane.position.set(0, PY, PLANE.z); scene.add(paintPlane);
  // 그림 둘레(그림판보다 넓게 보이는 데) — 하늘빛으로 채움
  const sky = new T.Mesh(new T.PlaneGeometry(60, 40), new T.MeshBasicMaterial({ color: 0xc7d2dc, toneMapped: false })); sky.position.set(0, PY, PLANE.z - 0.1); scene.add(sky);

  // ── 빛: 방 안은 어둑 · 바깥 해가 창으로 들어와 바닥에 창살 그림자
  const amb = new T.HemisphereLight(0x8a8fa0, 0x1a120c, 0.12); scene.add(amb);
  const sun = new T.DirectionalLight(0xfff0d8, 0.0);
  sun.position.set(1.6, 7.5, -7); sun.target.position.set(-0.6, 0, 2.6); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 }); sun.shadow.bias = -0.0008;
  const bounce = new T.PointLight(0xffe2bc, 0, 7, 2); bounce.position.set(0, 1.3, 1.2); scene.add(bounce);
  const gap = new T.PointLight(0xfff0d8, 0.7, 3.5, 2); gap.position.set(0, 1.5, zW + 0.5); scene.add(gap);   // 커튼 틈 새는 빛

  // 빛줄기 — 창에서 바닥으로 비스듬히 내려오는 판(가산 혼합, 가장자리로 갈수록 옅게)
  const shaftTex = canvasTex(64, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,240,215,.55)'); gr.addColorStop(1, 'rgba(255,240,215,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const sd = g.createLinearGradient(0, 0, w, 0); sd.addColorStop(0, 'rgba(0,0,0,1)'); sd.addColorStop(0.3, 'rgba(0,0,0,0)'); sd.addColorStop(0.7, 'rgba(0,0,0,0)'); sd.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = sd; g.fillRect(0, 0, w, h);
  });
  const shaftMat = new T.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
  const shafts = [];
  for (let i = 0; i < 5; i++) {
    const w = 0.34 + R() * 0.3, len = 4.2;
    const m = new T.Mesh(new T.PlaneGeometry(w, len), shaftMat);
    const x = -0.55 + i * 0.28 + (R() - 0.5) * 0.1;
    m.position.set(x - 0.4, 1.3, 1.5); m.rotation.set(-1.0, 0.18, 0.12); scene.add(m); shafts.push(m);
  }
  // 먼지 — 빛줄기 안에서 아주 천천히
  const N = 420, pos = new Float32Array(N * 3), vel = [];
  for (let i = 0; i < N; i++) { pos[i * 3] = -1.2 + R() * 1.9; pos[i * 3 + 1] = 0.2 + R() * 2.6; pos[i * 3 + 2] = 0.3 + R() * 2.8; vel.push([(R() - 0.5) * 0.02, (R() - 0.5) * 0.015, (R() - 0.5) * 0.02]); }
  const dustGeo = new T.BufferGeometry(); dustGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
  const dotTex = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,245,225,1)'); gr.addColorStop(1, 'rgba(255,245,225,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
  const dustMat = new T.PointsMaterial({ size: 0.012, map: dotTex, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
  scene.add(new T.Points(dustGeo, dustMat));

  // ── 카메라 길: 방 안 → 창 → 난간 넘어 → 그림을 페이지의 거리 그림과 같은 구도로
  //   페이지 .st-img = 화면보다 8% 큰 상자에 cover · 끝 크기 1.04 → 그림 세로의 약 89%가 화면 높이(세로가 꽉 차는 폰 기준)
  const fovR = T.MathUtils.degToRad(cam.fov);
  const imgAsp = 1440 / 1942, viewAsp = VW / VH;
  const visH = viewAsp < imgAsp ? PLANE.H / (1.08 * 1.04) : (PLANE.H * imgAsp / viewAsp) / (1.08 * 1.04);
  const endZ = PLANE.z + (visH / 2) / Math.tan(fovR / 2);
  const P0 = new T.Vector3(0.2, 1.45, 4.7), P1 = new T.Vector3(0, 1.55, 1.2), P2 = new T.Vector3(0, PY, Math.min(endZ, -0.7));
  const L0 = new T.Vector3(0, 1.5, 0), L2 = new T.Vector3(0, PY, PLANE.z);

  // 그림 불러오기 — 오면 시작
  let done = false, skipped = false, raf = 0, t0 = 0;
  new T.TextureLoader().load(PAINT, (tx) => { tx.encoding = T.sRGBEncoding; tx.anisotropy = aniso; paintMat.map = tx; paintMat.needsUpdate = true; start(); },
    undefined, () => start());

  function pose(t) {
    // 커튼: 바깥으로 모이며(폭이 줄고) 옆으로
    const c = easeOut(seg(t, TL.curtain, TL.curtainD));
    for (const k of curtains) { k.g.scale.x = 1 - 0.62 * c; k.g.position.x = k.sx * (WIN.W / 2 + 0.6 + 0.12 * c); }
    // 창: 안으로 105도
    const w = ease(seg(t, TL.window, TL.windowD));
    for (const l of leaves) l.hinge.rotation.y = l.open * T.MathUtils.degToRad(105) * w;
    // 빛
    const light = clamp(c * 0.35 + w * 0.65);
    sun.intensity = 2.6 * light; bounce.intensity = 1.6 * light; gap.intensity = 0.7 * (1 - c);
    amb.intensity = 0.12 + 0.4 * light;
    shaftMat.opacity = 0.55 * light * (1 - seg(t, TL.dolly + 0.2, 0.9));
    dustMat.opacity = 0.75 * light * (1 - seg(t, TL.dolly + 0.3, 0.9));
    renderer.toneMappingExposure = 0.6 + 0.45 * light;
    paintMat.color.setScalar(1).multiplyScalar(0.18 + 0.82 * clamp(c * 0.25 + w * 0.75)).multiply(PAINT_TINT);   // 커튼 · 창이 닫혀 있을 땐 바깥도 어둡게(유리 너머)
    // 카메라
    const d = seg(t, TL.dolly, TL.dollyD), e = ease(d);
    const pre = easeOut(seg(t, 0, TL.dolly));                     // 들어갈 때까지 아주 조금 다가감
    const p = new T.Vector3().lerpVectors(P0, P1, pre * 0.35);
    if (d > 0) p.lerpVectors(new T.Vector3().lerpVectors(P0, P1, 0.35), P2, e);
    // 문턱 넘을 때 살짝 내려다봤다가 다시 앞
    const look = new T.Vector3().lerpVectors(L0, L2, e);
    cam.position.copy(p); cam.lookAt(look);
  }
  function frame(now) {
    if (done) return;
    const t = (now - t0) / 1000;
    const a = dustGeo.attributes.position.array;
    for (let i = 0; i < N; i++) { a[i * 3] += vel[i][0] * 0.016; a[i * 3 + 1] += vel[i][1] * 0.016; a[i * 3 + 2] += vel[i][2] * 0.016; }
    dustGeo.attributes.position.needsUpdate = true;
    pose(t);
    if (t > TL.title && !title.classList.contains('on') && t < TL.window) title.classList.add('on');
    if (t > TL.window + 0.6) title.classList.remove('on');
    renderer.render(scene, cam);
    if (t >= TL.out) return finish();
    raf = requestAnimationFrame(frame);
  }
  const FREEZE = new URLSearchParams(location.search).get('scT');
  function start() {
    if (done) return;
    if (FREEZE != null) { pose(+FREEZE); if (+FREEZE > TL.title && +FREEZE < TL.window + 0.6) title.classList.add('on'); renderer.render(scene, cam); window.__scReady = true; return; }
    t0 = performance.now(); raf = requestAnimationFrame(frame);
    addEventListener('pointerdown', skip, true);
  }
  function finish() {
    if (done) return; done = true; cancelAnimationFrame(raf);
    removeEventListener('pointerdown', skip, true);
    root.classList.add('out'); onDone?.();
    setTimeout(() => { root.remove(); renderer.dispose(); }, 900);
  }
  function skip() { if (done || skipped) return; skipped = true; title.classList.remove('on'); pose(TL.out); renderer.render(scene, cam); setTimeout(finish, 60); }
}
