// C-1 모리스 칼럼 3D 장면 — 칼럼 + 부착 인쇄물 + 인식 후 '전단지 회전(궤도)' 효과
//
// 칼럼 형태는 kippu-app/src/lib/morrisViewerHtml.ts 의 모델을 그대로 옮겼다 (읽기 전용 복사):
//   Eugène Atget 〈Colonne Morris, Paris 1910〉, Jean Béraud 〈La colonne Morris〉 c.1885 (Wikimedia Commons),
//   fr.wikipedia 'Colonne Morris' 기준 — 계단형 받침 · 원통 몸체 · 육각 차양 · 비늘 돔 · 첨탑. 지름 D=1.
// 인쇄물 배치(전단지 3장 위 줄, 풍자화 3점 아래 줄)도 kippu-app/src/lib/morrisColumn.ts 와 같다.
//
// 모드
//   demo   : 카메라 없이 — 3D 칼럼을 직접 그린다
//   camera : 실제 칼럼이 카메라 화면에 있다고 가정 — 칼럼은 그리지 않고, 깊이만 쓰는 가림막(occluder)으로
//            뒤쪽 궤도 전단지를 가린다. 궤도는 화면 중앙 스캔 프레임 기준(실제 칼럼 추적 아님).
// 단계(phase)
//   attached → orbit (Step1 인식 후) → attached (Step2, 활성 전단지 강조)

export const POSTERS = [
  { id: 'f1', kind: 'flyer', src: 'assets/img/fl_batignolles.jpg', ratio: 946 / 631, active: true },
  { id: 'f2', kind: 'flyer', src: 'assets/img/fl_bonmarche.jpg', ratio: 972 / 647 },
  { id: 'f3', kind: 'flyer', src: 'assets/img/fl_expo.jpg', ratio: 978 / 651 },
  { id: 's1', kind: 'satire', src: 'assets/img/sat_venus_1865.jpg', ratio: 625 / 591 },
  { id: 's2', kind: 'satire', src: 'assets/img/sat_critic_1865.jpg', ratio: 621 / 600 },
  { id: 's3', kind: 'satire', src: 'assets/img/sat_quality_1865.jpg', ratio: 613 / 599 },
];

// 부착 위치 (몸체 둘레 각도, 중심 높이, 폭) — 전단지는 morrisViewerHtml 과 동일, 풍자화는 아래 줄 사이사이
const SLOTS = {
  f1: { a: 0, y: 2.45, w: 0.56 },
  f2: { a: 2.2, y: 1.9, w: 0.56 },
  f3: { a: 4.15, y: 2.7, w: 0.56 },
  s1: { a: 1.05, y: 1.2, w: 0.5 },
  s2: { a: 3.15, y: 1.05, w: 0.5 },
  s3: { a: 5.25, y: 1.25, w: 0.5 },
};

const R = 0.5, SHAFT_Y0 = 0.46, SHAFT_H = 3.3;

export function createColumnScene(THREE, canvas, { onLoaded } = {}) {
  const T = THREE;
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(30, 1, 0.1, 100);

  scene.add(new T.AmbientLight(0xffe9c8, 0.42));
  scene.add(new T.HemisphereLight(0xfff1d6, 0x3a2a1a, 0.35));
  const key = new T.DirectionalLight(0xffe2b0, 0.85); key.position.set(4, 7, 9); scene.add(key);
  const rim = new T.DirectionalLight(0xffc98a, 0.45); rim.position.set(-6, 3, -4); scene.add(rim);

  const spin = new T.Group(); scene.add(spin);      // 칼럼 + 부착 인쇄물 (Step2 드래그 회전)
  const columnGroup = new T.Group(); spin.add(columnGroup);
  const fx = new T.Group(); scene.add(fx);          // 빛 고리 · 반짝임

  // ── 칼럼 (morrisViewerHtml.ts 이식)
  const GREEN = new T.Color(0x1d3326);
  const iron = new T.MeshStandardMaterial({ color: GREEN, roughness: 0.5, metalness: 0.3 });
  const ironDS = new T.MeshStandardMaterial({ color: GREEN, roughness: 0.5, metalness: 0.3, side: T.DoubleSide });
  const lathe = (pts, mat, seg) => new T.Mesh(new T.LatheGeometry(pts.map((p) => new T.Vector2(p[0], p[1])), seg || 64), mat);
  columnGroup.add(lathe([[0, 0], [0.66, 0], [0.66, 0.2], [0.6, 0.24], [0.6, 0.29], [0.62, 0.33], [0.6, 0.38], [0.54, 0.42], [0.5, 0.46], [0, 0.46]], iron));
  const shaftMat = new T.MeshStandardMaterial({ color: GREEN, roughness: 0.68, metalness: 0.15 });
  const shaft = new T.Mesh(new T.CylinderGeometry(R, R, SHAFT_H, 96, 1, true), shaftMat);
  shaft.position.y = SHAFT_Y0 + SHAFT_H / 2; columnGroup.add(shaft);
  const top = SHAFT_Y0 + SHAFT_H;
  columnGroup.add(lathe([[0.5, top - 0.02], [0.54, top], [0.54, top + 0.06], [0.5, top + 0.08]], iron));
  const EAVE_Y = top + 0.08, EAVE_R = 0.9, SKIRT_H = 0.28, FRIEZE_R = 0.72;
  const skirt = new T.Mesh(new T.CylinderGeometry(FRIEZE_R, EAVE_R, SKIRT_H, 6, 1, true), ironDS);
  skirt.position.y = EAVE_Y + SKIRT_H / 2; columnGroup.add(skirt);
  const under = new T.Mesh(new T.CylinderGeometry(EAVE_R, EAVE_R, 0.004, 6), iron); under.position.y = EAVE_Y; columnGroup.add(under);
  {
    const c = document.createElement('canvas'); c.width = 64; c.height = 32;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 9);
    g.beginPath(); g.arc(32, 8, 24, 0, Math.PI); g.fill();
    const tx = new T.CanvasTexture(c); tx.wrapS = T.RepeatWrapping; tx.repeat.set(36, 1);
    const m = new T.MeshStandardMaterial({ color: GREEN, roughness: 0.5, metalness: 0.3, alphaMap: tx, alphaTest: 0.5, side: T.DoubleSide });
    const v = new T.Mesh(new T.CylinderGeometry(EAVE_R, EAVE_R, 0.12, 6, 1, true), m); v.position.y = EAVE_Y - 0.06; columnGroup.add(v);
  }
  const FRIEZE_Y = EAVE_Y + SKIRT_H, FRIEZE_H = 0.22;
  const frieze = new T.Mesh(new T.CylinderGeometry(FRIEZE_R, FRIEZE_R, FRIEZE_H, 6), iron); frieze.position.y = FRIEZE_Y + FRIEZE_H / 2; columnGroup.add(frieze);
  const CORNICE_Y = FRIEZE_Y + FRIEZE_H;
  const cornice = new T.Mesh(new T.CylinderGeometry(0.8, FRIEZE_R, 0.09, 6), iron); cornice.position.y = CORNICE_Y + 0.045; columnGroup.add(cornice);
  const DOME_Y = CORNICE_Y + 0.09;
  {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const g = c.getContext('2d'); g.fillStyle = '#22392b'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#122318'; g.lineWidth = 3;
    const row = (ox, oy) => { for (let x = -32; x <= 96; x += 32) { g.beginPath(); g.arc(x + ox, oy, 16, 0, Math.PI); g.stroke(); } };
    row(16, 0); row(0, 32); row(16, 64);
    const tx = new T.CanvasTexture(c); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.repeat.set(20, 5);
    const m = new T.MeshStandardMaterial({ map: tx, roughness: 0.62, metalness: 0.2 });
    const d = lathe([[0.64, 0], [0.68, 0.1], [0.68, 0.2], [0.64, 0.33], [0.55, 0.46], [0.42, 0.58], [0.26, 0.68], [0.12, 0.74], [0.06, 0.78], [0, 0.79]], m, 64);
    d.position.y = DOME_Y; columnGroup.add(d);
  }
  const SPIRE_Y = DOME_Y + 0.78;
  const spire = lathe([[0, 0], [0.07, 0], [0.07, 0.04], [0.04, 0.08], [0.09, 0.14], [0.04, 0.2], [0.035, 0.3], [0.02, 0.42], [0, 0.48]], iron, 32);
  spire.position.y = SPIRE_Y; columnGroup.add(spire);
  const TOTAL_H = SPIRE_Y + 0.48;

  // 바닥 그림자
  const floor = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const m = new T.Mesh(new T.PlaneGeometry(3, 3), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.002; scene.add(m); return m;
  })();

  // 카메라 모드용 가림막 — 깊이만 기록 (실제 칼럼 몸체 자리)
  const occluder = new T.Mesh(new T.CylinderGeometry(R * 0.98, R * 0.98, SHAFT_H + 1.2, 48), new T.MeshBasicMaterial({ colorWrite: false }));
  occluder.position.y = SHAFT_Y0 + SHAFT_H / 2 + 0.3; occluder.renderOrder = -1; scene.add(occluder);

  // ── 인쇄물: 원통 일부로 휘는 면 (반지름 rho, 각도 theta, 높이 y) — 정점을 매 프레임 직접 배치
  const SEG = 20;
  const posterVS = `
    varying vec2 vUv; varying vec3 vN;
    void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
  const posterFS = `
    uniform sampler2D map; uniform float uLoaded, uDim, uOpacity, uLift;
    varying vec2 vUv; varying vec3 vN;
    void main(){
      vec3 L = normalize(vec3(0.45, 0.55, 0.75));
      float lam = 0.62 + 0.5 * max(dot(normalize(vN), L), 0.0);
      vec3 paper = vec3(0.93, 0.88, 0.78);
      vec3 c = gl_FrontFacing ? mix(paper, texture2D(map, vUv).rgb, uLoaded) : vec3(0.74, 0.68, 0.57);
      c *= lam * uDim;
      c += uLift * vec3(0.10, 0.07, 0.02);
      gl_FragColor = vec4(c, uOpacity);
    }`;
  const haloFS = `
    uniform float uAmt, uTime; uniform vec2 uSize; varying vec2 vUv;
    void main(){
      vec2 p = (vUv - 0.5) * uSize;                 // 실제 크기 좌표 (테두리 두께 일정)
      vec2 inner = uSize * 0.5 - vec2(0.06);
      vec2 q = abs(p) - inner;
      float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);  // 안쪽 사각형까지 거리
      float edge = exp(-pow(max(d, 0.0) / 0.055, 2.0));
      float line = smoothstep(0.012, 0.0, abs(d)) ;
      float a = (edge * 1.1 + line * 1.2) * step(-0.004, d);
      float pulse = 0.65 + 0.35 * sin(uTime * 3.2);
      float al = clamp(a * pulse * uAmt, 0.0, 1.0);
      gl_FragColor = vec4(vec3(1.0, 0.82, 0.45) * al, al);
    }`;

  const loader = new T.TextureLoader();
  let loadedCount = 0;
  const posters = POSTERS.map((p) => {
    const slot = SLOTS[p.id];
    const w = slot.w, h = w * p.ratio;
    const geo = new T.PlaneGeometry(1, 1, SEG, 1);
    const mat = new T.ShaderMaterial({
      uniforms: { map: { value: null }, uLoaded: { value: 0 }, uDim: { value: 1 }, uOpacity: { value: 1 }, uLift: { value: 0 } },
      vertexShader: posterVS, fragmentShader: posterFS, side: T.DoubleSide, transparent: true,
    });
    const mesh = new T.Mesh(geo, mat);
    mesh.userData.id = p.id;
    spin.add(mesh);
    loader.load(p.src, (tx) => {
      tx.anisotropy = renderer.capabilities.getMaxAnisotropy();
      mat.uniforms.map.value = tx; mat.uniforms.uLoaded.value = 1;
      if (++loadedCount === POSTERS.length && onLoaded) onLoaded();
    });
    let halo = null;
    if (p.active) {
      const hg = new T.PlaneGeometry(1, 1, SEG, 1);
      const hm = new T.ShaderMaterial({
        uniforms: { uAmt: { value: 0 }, uTime: { value: 0 }, uSize: { value: new T.Vector2(w + 0.16, h + 0.16) } },
        vertexShader: posterVS, fragmentShader: haloFS, transparent: true, depthWrite: false,
        blending: T.AdditiveBlending, side: T.DoubleSide,
      });
      halo = new T.Mesh(hg, hm); halo.renderOrder = 2; spin.add(halo);
    }
    return { ...p, w, h, slot, mesh, mat, halo, st: { rho: R + 0.006, theta: slot.a, y: slot.y, op: 1 } };
  });

  function bend(geo, rho, theta, y, w, h) {
    const pos = geo.attributes.position, nor = geo.attributes.normal;
    const arc = w / rho;
    for (let i = 0; i < pos.count; i++) {
      const u = i % (SEG + 1) / SEG - 0.5;           // -0.5..0.5 (왼→오)
      const v = i < SEG + 1 ? 0.5 : -0.5;            // 위 줄 / 아래 줄
      const ang = theta + u * arc;
      const s = Math.sin(ang), c = Math.cos(ang);
      pos.setXYZ(i, rho * s, y + v * h, rho * c);
      nor.setXYZ(i, s, 0, c);
    }
    pos.needsUpdate = true; nor.needsUpdate = true;
    geo.computeBoundingSphere();
  }

  // ── 빛 고리 (인식 시 칼럼 둘레에 퍼지는 금빛 타원)
  const ringFS = `
    uniform float uAmt, uTime, uSeed; varying vec2 vUv; varying vec3 vP;
    void main(){
      float r = length(vP.xy);
      float band = exp(-pow((r - 1.0) / 0.035, 2.0)) + 0.35 * exp(-pow((r - 1.0) / 0.12, 2.0));
      float ang = atan(vP.y, vP.x);
      float sh = 0.55 + 0.45 * sin(ang * 3.0 - uTime * 2.4 + uSeed);
      float a = clamp(band * sh * uAmt * 1.9, 0.0, 1.0);
      gl_FragColor = vec4(vec3(1.0, 0.8, 0.42) * a, a);
    }`;
  const ringVS = `varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
  const rings = [1.35, 2.25, 3.05].map((y, i) => {
    const m = new T.Mesh(new T.RingGeometry(0.75, 1.25, 160, 1), new T.ShaderMaterial({
      uniforms: { uAmt: { value: 0 }, uTime: { value: 0 }, uSeed: { value: i * 2.1 } },
      vertexShader: ringVS, fragmentShader: ringFS, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
    }));
    m.rotation.x = -Math.PI / 2; m.position.y = y; m.userData.base = 1.0 + i * 0.08; m.renderOrder = 3;
    fx.add(m); return m;
  });

  // 반짝임 입자
  const sparkN = 90;
  const sparkGeo = new T.BufferGeometry();
  const sp = new Float32Array(sparkN * 3), sd = new Float32Array(sparkN * 3);
  for (let i = 0; i < sparkN; i++) { sd[i * 3] = Math.random() * Math.PI * 2; sd[i * 3 + 1] = 0.6 + Math.random() * 3.0; sd[i * 3 + 2] = 0.8 + Math.random() * 0.7; }
  sparkGeo.setAttribute('position', new T.BufferAttribute(sp, 3));
  const sparkTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,232,180,1)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new T.CanvasTexture(c); })();
  const sparks = new T.Points(sparkGeo, new T.PointsMaterial({ size: 0.07, map: sparkTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 }));
  fx.add(sparks);

  // ── 상태
  let mode = 'demo';
  let phase = 'attached';
  let phaseT0 = performance.now();
  let orbitClock = 0;           // 궤도 회전 누적 각
  let mix = 0;                  // 0 = 부착, 1 = 궤도
  let mixFrom = 0, mixTo = 0, mixT0 = 0, mixDur = 1;
  let ringAmt = 0, haloAmt = 0;
  let spinRot = -0.35, spinVel = 0, dragging = false;
  let camZoom = 1, camZoomTo = 1, focusY = TOTAL_H * 0.5, focusYTo = TOTAL_H * 0.5;
  let sway = true;
  const startT = performance.now();

  const ORBIT_R = 1.3;
  const orbitBase = (i) => (i / posters.length) * Math.PI * 2;
  const orbitY = (i) => 2.15 + (i % 2 ? -0.42 : 0.42) * 0.9;

  function setMode(m) {
    mode = m;
    columnGroup.visible = m === 'demo';
    floor.visible = m === 'demo';
    occluder.visible = m === 'camera';
  }
  setMode('demo');

  function setPhase(p) {
    if (p === phase) return;
    const now = performance.now();
    mixFrom = mix; mixT0 = now;
    if (p === 'orbit') { mixTo = 1; mixDur = 1.8; }
    else { mixTo = 0; mixDur = 1.6; }
    // 궤도 각을 슬롯 각 근처 바퀴로 맞춰 전환 경로를 짧게
    posters.forEach((q) => { q.unwrap = true; });
    phase = p; phaseT0 = now;
  }

  function setHighlight(on) { haloTarget = on ? 1 : 0; }
  let haloTarget = 0;
  function setView(v) {
    // v: 'full' 칼럼 전체, 'close' 전단지 높이로 근접
    if (v === 'close') { camZoomTo = 0.62; focusYTo = 2.15; }
    else { camZoomTo = 1; focusYTo = TOTAL_H * 0.5; }
  }

  function fitDist() {
    const vfov = camera.fov * Math.PI / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const byH = (TOTAL_H * 0.5 + 0.9) / Math.tan(vfov / 2);
    const byW = (ORBIT_R + 0.55) / Math.tan(hfov / 2);
    return Math.max(byH, byW);
  }
  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ── 입력: Step2 드래그 회전 + 탭 판별
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  let tapCb = null, interactive = false;
  let down = null, lastX = 0, lastT = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (!interactive) return;
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    lastX = e.clientX; lastT = performance.now(); spinVel = 0; dragging = true;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!down) return;
    if (Math.abs(e.clientX - down.x) > 6 || Math.abs(e.clientY - down.y) > 6) down.moved = true;
    const s = 2.2 / Math.max(canvas.clientWidth, 1) * Math.PI;
    const dx = e.clientX - lastX; spinRot += dx * s;
    const now = performance.now(); spinVel = dx * s / Math.max(now - lastT, 1) * 16;
    lastX = e.clientX; lastT = now;
  });
  const end = (e) => {
    if (!down) return;
    if (e.type === 'pointerup' && !down.moved && performance.now() - down.t < 450) { spinVel = 0; tap(e.clientX, e.clientY); }
    if (performance.now() - lastT > 80) spinVel = 0;
    down = null; dragging = false;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  function tap(x, y) {
    const r = canvas.getBoundingClientRect();
    ndc.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([shaft, ...posters.map((p) => p.mesh)], false)[0];
    if (!hit || !tapCb) return;
    const p = posters.find((q) => q.mesh === hit.object);
    tapCb(p ? p : null);
  }

  // ── 화면상의 전단지 사각형 (Step3 확대 전환용)
  const v3 = new T.Vector3();
  function screenRect(id) {
    const p = posters.find((q) => q.id === id); if (!p) return null;
    const pos = p.mesh.geometry.attributes.position;
    const r = canvas.getBoundingClientRect();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i).applyMatrix4(p.mesh.matrixWorld).project(camera);
      const sx = r.left + (v3.x * 0.5 + 0.5) * r.width, sy = r.top + (1 - (v3.y * 0.5 + 0.5)) * r.height;
      x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
    }
    return { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
  }

  // ── 루프
  let running = true, raf = 0, last = performance.now();
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const time = (now - startT) / 1000;

    // 부착 ↔ 궤도 보간
    const k = Math.min((now - mixT0) / (mixDur * 1000), 1);
    mix = mixFrom + (mixTo - mixFrom) * easeIO(k);
    if (phase === 'orbit' || mix > 0.001) orbitClock += dt * 0.55;

    // 고리·강조 세기
    const ringGoal = phase === 'orbit' ? 1 : 0;
    ringAmt += (ringGoal - ringAmt) * Math.min(dt * 2.4, 1);
    haloAmt += (haloTarget - haloAmt) * Math.min(dt * 3, 1);

    // 칼럼 회전 (Step2 드래그 · 관성)
    if (!dragging && Math.abs(spinVel) > 0.0001) { spinRot += spinVel; spinVel *= 0.94; }
    spin.rotation.y = spinRot;

    posters.forEach((p, i) => {
      // 궤도 좌표 (spin 그룹 기준)
      const sa = p.slot.a;
      let oa = orbitBase(i) + orbitClock - spinRot;
      if (p.unwrap || p.k === undefined) {   // 전환 시작 시 궤도 각을 슬롯 각과 가까운 바퀴로 고정
        p.k = Math.round((oa - sa) / (Math.PI * 2)); p.unwrap = false;
      }
      oa -= p.k * Math.PI * 2;
      const stag = Math.min(Math.max(mix * 1.25 - (i / posters.length) * 0.25, 0), 1);
      const e = stag;
      const bob = Math.sin(time * 1.3 + i * 1.7) * 0.06 * e;
      let rho = R + 0.006 + (ORBIT_R - R) * e;
      const theta = sa + (oa - sa) * e;
      const y = p.slot.y + (orbitY(i) - p.slot.y) * e + bob;
      let op = 1;
      if (mode === 'camera') {
        // 카메라 모드: 실제 인쇄물은 현실에 있으므로, 궤도에 있을 때만 보인다
        op = Math.min(e * 1.6, 1);
        rho = R * 0.6 + (ORBIT_R - R * 0.6) * e;
      }
      const grow = 1 + 0.4 * e;
      bend(p.mesh.geometry, rho, theta, y, p.w * grow, p.h * grow);
      p.mat.uniforms.uOpacity.value = op;
      p.mesh.visible = op > 0.01;
      const dimInactive = phase === 'attached' && haloTarget > 0 && !p.active ? 0.62 : 1;
      p.mat.uniforms.uDim.value += (dimInactive - p.mat.uniforms.uDim.value) * Math.min(dt * 4, 1);
      p.mat.uniforms.uLift.value = p.active ? haloAmt * (0.5 + 0.5 * Math.sin(time * 3.2)) : 0;
      if (p.halo) {
        bend(p.halo.geometry, rho + 0.008, theta, y, p.w * grow + 0.16, p.h * grow + 0.16);
        p.halo.material.uniforms.uAmt.value = haloAmt * (mode === 'demo' ? 1 : 0);
        p.halo.material.uniforms.uTime.value = time;
        p.halo.visible = haloAmt > 0.01 && mode === 'demo';
      }
    });

    rings.forEach((r, i) => {
      const grow = 0.85 + 0.15 * Math.min(ringAmt * 1.2, 1);
      const s = r.userData.base * grow;
      r.scale.set(s, s, 1);
      r.material.uniforms.uAmt.value = ringAmt * (0.85 - i * 0.1);
      r.material.uniforms.uTime.value = time;
      r.visible = ringAmt > 0.01;
    });
    for (let i = 0; i < sparkN; i++) {
      const a = sd[i * 3] + time * 0.35 * (i % 2 ? 1 : -1), rr = sd[i * 3 + 2];
      sp[i * 3] = Math.sin(a) * rr; sp[i * 3 + 1] = sd[i * 3 + 1] + Math.sin(time + i) * 0.05; sp[i * 3 + 2] = Math.cos(a) * rr;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparks.material.opacity = ringAmt * 0.9;
    sparks.visible = ringAmt > 0.01;

    // 카메라 — 손에 든 듯한 미세 흔들림
    camZoom += (camZoomTo - camZoom) * Math.min(dt * 2.2, 1);
    focusY += (focusYTo - focusY) * Math.min(dt * 2.2, 1);
    const d = fitDist() * camZoom;
    const sx = sway ? Math.sin(time * 0.6) * 0.06 + Math.sin(time * 1.7) * 0.015 : 0;
    const sy = sway ? Math.sin(time * 0.8 + 1) * 0.04 : 0;
    camera.position.set(sx, focusY + 0.35 * camZoom + sy, d);
    camera.lookAt(sx * 0.3, focusY, 0);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    setMode, setPhase, setHighlight, setView, screenRect, resize,
    get phase() { return phase; },
    setInteractive(on) { interactive = on; canvas.style.pointerEvents = on ? 'auto' : 'none'; },
    onTap(cb) { tapCb = cb; },
    resetSpin() { spinRot = -0.35; spinVel = 0; },
    pause() { running = false; cancelAnimationFrame(raf); },
    resume() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } },
  };
}
