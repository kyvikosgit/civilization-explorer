// 산업혁명 3D 도입(11/23 다시) — 생라자르역 대합실에서 승강장으로. 페이지 배경(모네 〈생라자르역〉 1877)으로 그대로 이어진다
//   시민사회 도입(방 → 창 → 거리 그림)과 같은 방식: 어두운 석조 대합실, 정면에 철 · 유리 아치문(위에 'GARE SAINT-LAZARE' 명판과 시계)
//   → 문 두 짝이 바깥으로 열리며 승강장 빛 · 김이 들어오고 → 카메라가 문턱을 넘어 그림 속으로 → 걷히며 페이지의 같은 그림(안내판 장면)
//   three.js(0.147) · 외부 모델 없음(돌 · 철 · 유리는 캔버스 무늬) · 그림 = 페이지와 같은 파일. 약 4초(속도 그대로). 누르면 바로 끝
//   playIndustryIntro({ onDone })
import * as T from 'three';

const PAINT = new URL('../experience-v2/ticket/img/lazare-1877.jpg', import.meta.url).href;   // 페이지 #sceneImg 와 같은 그림
const PAINT_AR = 1600 / 1189;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t, a, d) => clamp((t - a) / d);
function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
// 시간표(초)
const TL = { title: 0.25, titleOff: 1.9, doors: 0.35, doorsD: 1.25, dolly: 1.0, dollyD: 2.6, out: 3.45, outD: 0.55 };
const DOOR = { W: 2.2, H: 3.1, ARCH: 1.1 };   // 문 폭 · 문짝 높이 · 위 반원 반지름(= 폭/2)
const WALL_T = 0.5;
const PLANE = { z: -22, H: 28 };              // 문 너머 그림판(높이 m) — 문으로 보이는 시야를 늘 덮을 만큼 크게

function canvasTex(w, h, draw, aniso = 4) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = aniso; return t;
}

export function playIndustryIntro({ onDone } = {}) {
  const root = document.createElement('div');
  root.id = 'inIntro'; root.setAttribute('aria-hidden', 'true');
  root.innerHTML = '<canvas></canvas><div class="in-title"><small>GARE SAINT-LAZARE · 1873</small><b>생라자르역</b></div>';
  const st = document.createElement('style');
  st.textContent = '#inIntro{position:fixed;inset:0;max-width:480px;margin:0 auto;z-index:80;background:#0b0907;transition:opacity .55s ease}#inIntro.out{opacity:0;pointer-events:none}'
    + '#inIntro canvas{position:absolute;inset:0;width:100%;height:100%;display:block}'
    + '#inIntro .in-title{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top) + 64px);text-align:center;color:#F4E7CF;font-family:Paperlogy,Freesentation,sans-serif;opacity:0;transform:translateY(8px);transition:opacity .5s ease,transform .5s ease;text-shadow:0 2px 14px rgba(0,0,0,.7)}'
    + '#inIntro .in-title.on{opacity:1;transform:none}#inIntro .in-title small{display:block;font-size:12px;letter-spacing:.22em;color:#D9B77A;font-weight:600}#inIntro .in-title b{display:block;margin-top:6px;font-size:26px;font-weight:800}';
  document.head.appendChild(st); document.body.appendChild(root);
  const cv = root.querySelector('canvas'), title = root.querySelector('.in-title');
  const SPEED = (window.M100_INTRO && window.M100_INTRO.speed) || 1;
  const FREEZE = new URLSearchParams(location.search).get('inT');   // 점검용: 그 시각에서 멈춤

  let renderer, done = false, raf = 0;
  const finish = () => {
    if (done) return; done = true; cancelAnimationFrame(raf);
    removeEventListener('pointerdown', finish, true);
    root.classList.add('out'); onDone?.();
    setTimeout(() => { root.remove(); st.remove(); renderer?.dispose(); }, 650);
  };
  addEventListener('pointerdown', finish, true);
  try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true }); }
  catch (e) { finish(); return; }
  const VW = root.clientWidth || innerWidth, VH = root.clientHeight || innerHeight;
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1)); renderer.setSize(VW, VH, false);
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.6;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const scene = new T.Scene(); scene.background = new T.Color(0x07060a);
  const cam = new T.PerspectiveCamera(VW / VH < 0.8 ? 70 : 56, VW / VH, 0.05, 80);
  const R = rnd(7);

  // ── 재료: 석조 벽(마름돌 줄눈) · 바닥(돌 타일) · 주철 · 유리 · 놋쇠
  const stoneTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#6d6252'; g.fillRect(0, 0, w, h);
    const r = rnd(5), bh = 64;
    for (let y = 0, row = 0; y < h; y += bh, row++) for (let x = (row % 2) * -96; x < w; x += 192) {
      const v = 0.86 + r() * 0.22; g.fillStyle = `rgb(${Math.round(112 * v)},${Math.round(100 * v)},${Math.round(84 * v)})`; g.fillRect(x + 2, y + 2, 188, bh - 4);
    }
    for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1); }
  }, aniso);
  stoneTex.wrapS = stoneTex.wrapT = T.RepeatWrapping;
  const stoneMat = (rw, rh) => { const t = stoneTex.clone(); t.needsUpdate = true; t.repeat.set(rw / 3, rh / 3); return new T.MeshStandardMaterial({ map: t, roughness: 0.95 }); };
  const floorTex = canvasTex(1024, 1024, (g, w, h) => {
    const r = rnd(9), s = 128;
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { const dark = ((x + y) / s) % 2; const v = 0.85 + r() * 0.15; g.fillStyle = dark ? `rgb(${Math.round(52 * v)},${Math.round(46 * v)},${Math.round(40 * v)})` : `rgb(${Math.round(150 * v)},${Math.round(138 * v)},${Math.round(118 * v)})`; g.fillRect(x, y, s, s); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x, y, s, 2); g.fillRect(x, y, 2, s); }
  }, aniso);
  floorTex.wrapS = floorTex.wrapT = T.RepeatWrapping; floorTex.repeat.set(4, 4);
  const ironMat = new T.MeshStandardMaterial({ color: 0x1d2420, roughness: 0.45, metalness: 0.7 });
  const brassMat = new T.MeshStandardMaterial({ color: 0xB08A45, roughness: 0.35, metalness: 0.9 });
  const glassMat = new T.MeshStandardMaterial({ color: 0xd8e4ec, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide });
  const box = (w, h, d, m, x, y, z, parent = scene) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };

  // ── 대합실: 바닥 · 천장 · 정면 벽(아치 구멍) · 옆 벽
  const RW = 9, RD = 8, RH = 6.4;
  const floor = new T.Mesh(new T.PlaneGeometry(RW, RD), new T.MeshStandardMaterial({ map: floorTex, roughness: 0.5 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, RD / 2); floor.receiveShadow = true; scene.add(floor);
  const ceil = new T.Mesh(new T.PlaneGeometry(RW, RD), new T.MeshStandardMaterial({ color: 0x1c1915, roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, RH, RD / 2); scene.add(ceil);
  // 정면 벽 = 문 구멍(사각 + 위 반원)을 뺀 모양
  const hw = DOOR.W / 2, dh = DOOR.H;
  const shape = new T.Shape(); shape.moveTo(-RW / 2, 0); shape.lineTo(RW / 2, 0); shape.lineTo(RW / 2, RH); shape.lineTo(-RW / 2, RH); shape.lineTo(-RW / 2, 0);
  const hole = new T.Path(); hole.moveTo(-hw, 0); hole.lineTo(hw, 0); hole.lineTo(hw, dh); hole.absarc(0, dh, hw, 0, Math.PI, false); hole.lineTo(-hw, 0); shape.holes.push(hole);
  const wallGeo = new T.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false, curveSegments: 32 });
  const front = new T.Mesh(wallGeo, stoneMat(RW, RH)); front.position.z = -WALL_T / 2; front.castShadow = front.receiveShadow = true; scene.add(front);
  for (const sx of [-1, 1]) { const sw = new T.Mesh(new T.PlaneGeometry(RD, RH), stoneMat(RD, RH)); sw.rotation.y = -sx * Math.PI / 2; sw.position.set(sx * RW / 2, RH / 2, RD / 2); sw.receiveShadow = true; scene.add(sw); }
  // 문 둘레 돌 테(아치 몰딩) · 걸레받이 띠
  const archRing = new T.Mesh(new T.TorusGeometry(hw + 0.12, 0.1, 10, 40, Math.PI), new T.MeshStandardMaterial({ color: 0x8a7d66, roughness: 0.8 })); archRing.position.set(0, dh, WALL_T / 2 + 0.05); scene.add(archRing);
  for (const sx of [-1, 1]) box(0.2, dh, 0.16, new T.MeshStandardMaterial({ color: 0x8a7d66, roughness: 0.8 }), sx * (hw + 0.12), dh / 2, WALL_T / 2 + 0.05);
  // 위 반원 채광창(고정): 주철 부챗살 + 유리
  const fan = new T.Group(); fan.position.set(0, dh, 0); scene.add(fan);
  const fanGlass = new T.Mesh(new T.CircleGeometry(hw, 32, 0, Math.PI), glassMat); fan.add(fanGlass);
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI; const bar = new T.Mesh(new T.BoxGeometry(0.035, hw, 0.04), ironMat); bar.position.set(Math.cos(a) * hw / 2, Math.sin(a) * hw / 2, 0); bar.rotation.z = a - Math.PI / 2; fan.add(bar); }
  box(DOOR.W, 0.08, 0.06, ironMat, 0, dh, 0);
  // 명판 · 시계(문 위 벽)
  const plaque = canvasTex(1024, 160, (g, w, h) => { g.fillStyle = '#1f2a24'; g.fillRect(0, 0, w, h); g.strokeStyle = '#B08A45'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20); g.fillStyle = '#E8D3A0'; g.font = '700 74px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('GARE SAINT-LAZARE', w / 2, h / 2 + 4); });
  const pl = new T.Mesh(new T.PlaneGeometry(3.2, 0.5), new T.MeshStandardMaterial({ map: plaque, roughness: 0.6 })); pl.position.set(0, dh + hw + 0.75, WALL_T / 2 + 0.02); scene.add(pl);
  const clockTex = canvasTex(256, 256, (g, w) => { g.fillStyle = '#efe6cf'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.strokeStyle = '#1a1a1a'; g.lineWidth = 6; g.stroke(); g.fillStyle = '#1a1a1a'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(128 + Math.sin(a) * 100 - 3, 128 - Math.cos(a) * 100 - 8, 6, 16); } g.lineWidth = 8; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 50, 128 - 30); g.moveTo(128, 128); g.lineTo(128 - 10, 128 - 85); g.stroke(); });
  const clock = new T.Mesh(new T.CircleGeometry(0.42, 40), new T.MeshStandardMaterial({ map: clockTex, roughness: 0.5 })); clock.position.set(0, dh + hw + 1.55, WALL_T / 2 + 0.02); scene.add(clock);
  const clockRim = new T.Mesh(new T.TorusGeometry(0.44, 0.04, 8, 40), brassMat); clockRim.position.copy(clock.position); scene.add(clockRim);
  // 벤치 둘(대합실 양옆) — 단순한 나무 · 주철
  const wood = new T.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.6 });
  for (const sx of [-1, 1]) { const b = new T.Group(); b.position.set(sx * 2.9, 0, 2.6); b.rotation.y = sx * -0.25; scene.add(b); box(1.8, 0.06, 0.45, wood, 0, 0.46, 0, b); box(1.8, 0.4, 0.05, wood, 0, 0.72, -0.22, b); for (const x of [-0.8, 0.8]) box(0.06, 0.46, 0.4, ironMat, x, 0.23, 0, b); }

  // ── 문 두 짝(바깥 = 승강장 쪽으로 열림): 주철 틀 · 유리 칸 · 놋쇠 손잡이
  const leaves = [];
  for (const sx of [-1, 1]) {
    const hinge = new T.Group(); hinge.position.set(sx * hw, 0, -WALL_T / 2 + 0.02); scene.add(hinge);
    const lw = hw, s = -sx, fr = 0.08, d = 0.06;
    box(fr, dh, d, ironMat, s * fr / 2, dh / 2, 0, hinge); box(fr, dh, d, ironMat, s * (lw - fr / 2), dh / 2, 0, hinge);
    box(lw, fr, d, ironMat, s * lw / 2, fr / 2, 0, hinge); box(lw, fr, d, ironMat, s * lw / 2, dh - fr / 2, 0, hinge);
    box(lw, 0.7, d, ironMat, s * lw / 2, 0.38, 0, hinge);
    for (const y of [1.25, 1.9, 2.55]) box(lw - fr, 0.03, d * 0.8, ironMat, s * lw / 2, y, 0, hinge);
    box(0.03, dh - 0.8, d * 0.8, ironMat, s * lw / 2, 0.73 + (dh - 0.8) / 2, 0, hinge);
    const gl = new T.Mesh(new T.PlaneGeometry(lw - fr * 2, dh - 0.85), glassMat); gl.position.set(s * lw / 2, 0.73 + (dh - 0.85) / 2, 0); hinge.add(gl);
    const knob = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, 0.4, 10), brassMat); knob.position.set(s * (lw - 0.08), 1.2, 0.06); hinge.add(knob);
    leaves.push({ hinge, open: sx < 0 ? 1 : -1 });
  }

  // ── 문 너머: 모네 〈생라자르역〉(그림판, 빛을 받지 않음) + 둘레는 그림의 하늘빛
  const paintMat = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const PW = PLANE.H * PAINT_AR, PY = PLANE.H / 2;   // 그림 밑변이 승강장 바닥(y=0)에 선다
  const paint = new T.Mesh(new T.PlaneGeometry(PW, PLANE.H), paintMat); paint.position.set(0, PY, PLANE.z); scene.add(paint);
  // 승강장 바닥(문턱 너머 ~ 그림) — 그림 아래 선로 빛과 같은 흙빛으로 이어 빈 곳이 안 보이게
  const yard = new T.Mesh(new T.PlaneGeometry(40, -PLANE.z + 1), new T.MeshBasicMaterial({ color: 0xb8ab94, toneMapped: false })); yard.rotation.x = -Math.PI / 2; yard.position.set(0, 0.002, PLANE.z / 2 - 0.3); scene.add(yard);
  const sky = new T.Mesh(new T.PlaneGeometry(120, 80), new T.MeshBasicMaterial({ color: 0x6f7588, toneMapped: false })); sky.position.set(0, PY, PLANE.z - 0.1); scene.add(sky);

  // ── 빛: 대합실은 어둑(가스등 둘) · 문이 열리면 승강장 빛 · 빛줄기 · 김
  const amb = new T.HemisphereLight(0x8a90a4, 0x1a140e, 0.1); scene.add(amb);
  for (const sx of [-1, 1]) { const g = new T.PointLight(0xffb872, 1.6, 6, 1.8); g.position.set(sx * 3.2, 3.2, 1.5); scene.add(g); const m = new T.Mesh(new T.SphereGeometry(0.09, 12, 8), new T.MeshBasicMaterial({ color: 0xffd9a0 })); m.position.copy(g.position); scene.add(m); }
  const sun = new T.DirectionalLight(0xeef2ff, 0); sun.position.set(-1.2, 8, -9); sun.target.position.set(0.4, 0, 3); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 24 }); sun.shadow.bias = -0.0008;
  const bounce = new T.PointLight(0xdfe6ff, 0, 8, 2); bounce.position.set(0, 1.6, 1.4); scene.add(bounce);
  const seam = new T.PointLight(0xe8eeff, 0.6, 3, 2); seam.position.set(0, 1.6, WALL_T / 2 + 0.4); scene.add(seam);   // 문틈 빛
  const shaftTex = canvasTex(64, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(230,236,255,.5)'); gr.addColorStop(1, 'rgba(230,236,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const sd = g.createLinearGradient(0, 0, w, 0); sd.addColorStop(0, 'rgba(0,0,0,1)'); sd.addColorStop(0.3, 'rgba(0,0,0,0)'); sd.addColorStop(0.7, 'rgba(0,0,0,0)'); sd.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = sd; g.fillRect(0, 0, w, h);
  });
  const shaftMat = new T.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
  for (let i = 0; i < 5; i++) { const m = new T.Mesh(new T.PlaneGeometry(0.4 + R() * 0.3, 5), shaftMat); m.position.set(-0.7 + i * 0.35, 1.5, 1.9); m.rotation.set(-1.05, -0.12, 0.08); scene.add(m); }
  // 김 — 문 너머에서 천천히 피어오르는 흰 입자(그림 속 증기와 이어지게)
  const N = 260, pos = new Float32Array(N * 3), vel = [];
  for (let i = 0; i < N; i++) { pos[i * 3] = -2 + R() * 4; pos[i * 3 + 1] = R() * 3.5; pos[i * 3 + 2] = -1 - R() * 6; vel.push([(R() - 0.5) * 0.12, 0.15 + R() * 0.25, (R() - 0.5) * 0.08]); }
  const steamGeo = new T.BufferGeometry(); steamGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
  const puff = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(240,244,255,.9)'); gr.addColorStop(1, 'rgba(240,244,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const steamMat = new T.PointsMaterial({ size: 0.9, map: puff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  scene.add(new T.Points(steamGeo, steamMat));

  // ── 카메라: 대합실 안 → 문 앞 → 문턱 넘어 그림 속 기관차 쪽으로(그림 세로가 화면을 거의 채우는 거리)
  const fovR = T.MathUtils.degToRad(cam.fov), viewAsp = VW / VH;
  const visH = viewAsp < PAINT_AR ? PLANE.H * 0.8 : (PLANE.H * PAINT_AR / viewAsp) * 0.8;
  const endZ = PLANE.z + (visH / 2) / Math.tan(fovR / 2);
  const LOCO = new T.Vector3((0.479 - 0.5) * PW * 0.5, visH / 2 + 0.05, PLANE.z);   // 끝 시선: 그림 아래쪽(기관차 · 선로)이 밑변까지 꽉 차는 높이
  const P0 = new T.Vector3(0.25, 1.55, 6.2), P1 = new T.Vector3(0, 1.6, 2.4), P2 = new T.Vector3(LOCO.x, LOCO.y, Math.min(endZ, -1.2));
  const L0 = new T.Vector3(0, 2.0, 0);

  function pose(t) {
    const w = ease(seg(t, TL.doors, TL.doorsD));
    for (const l of leaves) l.hinge.rotation.y = l.open * T.MathUtils.degToRad(100) * w;
    const light = clamp(w);
    sun.intensity = 2.2 * light; bounce.intensity = 1.3 * light; seam.intensity = 0.6 * (1 - w);
    amb.intensity = 0.1 + 0.35 * light;
    shaftMat.opacity = 0.5 * light * (1 - seg(t, TL.dolly + 0.6, 0.9));
    steamMat.opacity = 0.35 * light * (1 - seg(t, TL.dolly + 1.2, 1.0));
    renderer.toneMappingExposure = 0.6 + 0.5 * light;
    paintMat.color.setScalar(0.2 + 0.8 * light);
    const pre = easeOut(seg(t, 0, TL.dolly)), d = ease(seg(t, TL.dolly, TL.dollyD));
    const pA = new T.Vector3().lerpVectors(P0, P1, pre);
    cam.position.lerpVectors(pA, P2, d);
    cam.lookAt(new T.Vector3().lerpVectors(L0, LOCO, d));
  }
  let tPrev = 0;
  function steamStep(dt) { const a = steamGeo.attributes.position.array; for (let i = 0; i < N; i++) { a[i * 3] += vel[i][0] * dt; a[i * 3 + 1] += vel[i][1] * dt; a[i * 3 + 2] += vel[i][2] * dt; if (a[i * 3 + 1] > 4.5) a[i * 3 + 1] = 0; } steamGeo.attributes.position.needsUpdate = true; }

  new T.TextureLoader().load(PAINT, (tx) => { tx.encoding = T.sRGBEncoding; tx.anisotropy = aniso; paintMat.map = tx; paintMat.needsUpdate = true;
    // 바닥 = 그림 맨 아래 띠(선로)를 늘여 깐다 — 그림 밑변과 같은 색 · 결로 이어짐
    const yt = tx.clone(); yt.needsUpdate = true; yt.repeat.set(1, 0.1); yt.offset.set(0, 0); yt.rotation = 0; yard.material.map = yt; yard.material.needsUpdate = true;
    start(); }, undefined, () => start());
  function start() {
    if (done) return;
    pose(FREEZE != null ? +FREEZE : 0); renderer.shadowMap.needsUpdate = true; renderer.compile(scene, cam); renderer.render(scene, cam);
    if (FREEZE != null) { if (+FREEZE > TL.title && +FREEZE < TL.titleOff) title.classList.add('on'); window.__inReady = true; return; }
    const t0 = performance.now();
    const frame = (now) => {
      if (done) return;
      const t = (now - t0) / 1000 * SPEED, dt = Math.min(0.05, t - tPrev); tPrev = t;
      if (t > TL.title && t < TL.titleOff) title.classList.add('on'); else title.classList.remove('on');
      steamStep(dt); pose(t);
      if (t < TL.doors + TL.doorsD + 0.1) renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, cam);
      if (t >= TL.out) root.classList.add('out');
      if (t >= TL.out + TL.outD) return finish();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }
}
