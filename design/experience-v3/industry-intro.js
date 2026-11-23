// 산업혁명 도입(11/23 v2) — 1877년 생라자르역 승강장 3D. 2초 안.
//   장면은 모네 〈생라자르역〉(1877, 오르세)의 구도에서 거꾸로 세웠다: 그림을 '눈높이 1.7m · 가로 화각 60°' 사진으로 보고
//   지붕 꼭짓점 · 처마 · 기관차 · 다리 · 건물을 그림 속 자리에서 3D 좌표로 옮김(P(u, v, 거리)).
//   카메라: 가운데 기관차 앞 승강장에서 출발 → 선로 위로 물러나며 돌아서 그림을 그린 자리(눈높이, 정면)에서 멈춤.
//   움직이는 동안 같은 그림을 끝 시점에서 3D 면에 투사해 서서히 입힘 → 끝 프레임 = 페이지 그림(#sceneImg) → 걷히면 그대로 이어짐.
//   three.js(0.147) · 외부 모델 없음 · 정적인 것은 재질별로 한 덩어리로 합침(폰 부담). 누르면 바로 끝.
//   playIndustryIntro({ host, imgEl, under, fade, onDone })
//     under: 이 요소 바로 뒤(같은 부모 .scene 안)에 끼움 — 페이지의 가림(mask) · 아래 어둠이 3D 에도 똑같이 걸림
//     fade : 그림 위 덧층(빛줄기 · 김 · 앞등 · 안내판) — 3D 가 움직이는 동안 숨겼다가 그림으로 바뀔 때 함께 드러냄
import * as T from 'three';
import { mergeBufferGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t, a, d) => clamp((t - a) / d);
function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const TL = { dolly: 0, dollyD: 1.85, proj: 1.1, projD: 0.55, out: 1.85, outD: 0.15 };   // 끝 = 2.0초 · 그림은 카메라가 거의 멈춘 1.1~1.65초에 입혀짐
// 그림 카메라: 소실점(가로 0.49 · 세로 0.78) · 가로 화각 60° · 눈높이 1.7m
const U0 = 0.49, V0 = 0.78, HFOV = 60, EYE = 1.7, IAR = 1600 / 1190, FW = 0.5 / Math.tan(T.MathUtils.degToRad(HFOV / 2));
const P = (u, v, d) => [(u - U0) * d / FW, EYE + (V0 - v) / IAR * d / FW, -d];

function canvasTex(w, h, draw, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; }

export function playIndustryIntro({ host, imgEl, under, fade = [], onDone } = {}) {
  const legacy = T.ColorManagement.legacyMode; T.ColorManagement.legacyMode = false;   // 색 값 = 보이는 색(sRGB) — 그림 색을 그대로 가져다 쓰려고
  const hb = host.getBoundingClientRect();
  const VW = hb.width, VH = hb.height;
  const root = document.createElement('div');
  root.id = 'inIntro'; root.setAttribute('aria-hidden', 'true');
  Object.assign(root.style, { position: 'fixed', left: hb.left + 'px', top: hb.top + 'px', width: VW + 'px', height: VH + 'px', zIndex: 80, background: '#2b2724', pointerEvents: 'none' });
  if (under && under.parentElement) {
    const pr = under.parentElement.getBoundingClientRect();
    Object.assign(root.style, { position: 'absolute', left: (hb.left - pr.left) + 'px', top: (hb.top - pr.top) + 'px', zIndex: 'auto' });
    under.after(root);
  } else document.body.appendChild(root);
  const cv = document.createElement('canvas'); Object.assign(cv.style, { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }); root.appendChild(cv);
  const SPEED = (window.M100_INTRO && window.M100_INTRO.speed) || 1;
  const qs = new URLSearchParams(location.search), FREEZE = qs.get('inT'), FORCE_B = qs.get('inB');

  // 덧층은 3D 가 그림으로 바뀌는 동안 함께 드러남(끝 키프레임 = 원래 값)
  const anims = [];
  for (const el of fade) { if (!el || !el.animate) continue; try { anims.push(el.animate([{ opacity: 0, offset: 0 }, { opacity: 0, offset: TL.proj / TL.out }], { duration: TL.out * 1000 / SPEED, easing: 'linear' })); } catch (e) { /* 지원 안 하면 그냥 둠 */ } }
  if (FREEZE != null) anims.forEach((a) => a.pause());

  let renderer, done = false, raf = 0;
  const finish = () => {
    if (done) return; done = true; cancelAnimationFrame(raf); removeEventListener('pointerdown', finish, true);
    anims.forEach((a) => { try { a.cancel(); } catch (e) { /* */ } }); T.ColorManagement.legacyMode = legacy;
    root.style.transition = 'opacity .25s ease'; root.style.opacity = 0; onDone?.(); setTimeout(() => { root.remove(); renderer?.dispose(); }, 300);
  };
  addEventListener('pointerdown', finish, true);
  try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { finish(); return; }
  renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1)); renderer.setSize(VW, VH, false);
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;   // 정적 장면 — 그림자는 한 번만

  const FOG = 0x8f8a8b;   // 그림 속 박공 너머 하늘 · 김의 평균 빛(#807b78 ~ #a49e98)
  const scene = new T.Scene(); scene.background = new T.Color(FOG); scene.fog = new T.Fog(FOG, 22, 170);
  // 쇠 · 놋쇠 반사용: 위는 하늘빛, 아래는 어두운 바닥인 둥근 환경
  {
    const es = new T.Scene(), g = new T.SphereGeometry(10, 24, 12), col = [], c1 = new T.Color(0xd9d6e4), c2 = new T.Color(0x3a332c), c = new T.Color();
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = clamp(p.getY(i) / 10 * 0.5 + 0.5); c.copy(c2).lerp(c1, Math.pow(k, 1.4)); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    es.add(new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
    const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0.02).texture; pm.dispose();
  }

  // ── 카메라(끝 = 그림 카메라). 그림이 페이지에 놓인 자리(#sceneImg)에서 화각 · 소실점 위치를 구함
  const ir = imgEl ? imgEl.getBoundingClientRect() : { left: hb.left, top: hb.top, width: VW, height: VW / IAR };
  const rect = { x: ir.left - hb.left, y: ir.top - hb.top, w: ir.width, h: ir.height };
  const fpx = rect.w / 2 / Math.tan(T.MathUtils.degToRad(HFOV / 2));
  const cam = new T.PerspectiveCamera(T.MathUtils.radToDeg(2 * Math.atan(VH / 2 / fpx)), VW / VH, 0.1, 400);
  const xv = rect.x + U0 * rect.w, yv = rect.y + V0 * rect.h;
  const shift = (c) => { c.updateProjectionMatrix(); const e = c.projectionMatrix.elements; e[8] = 1 - 2 * xv / VW; e[9] = 2 * yv / VH - 1; c.projectionMatrixInverse.copy(c.projectionMatrix).invert(); };
  shift(cam);

  // ── 재료
  const R = rnd(11);
  const std = (c, r = 0.85, m = 0, o = {}) => new T.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...o });
  const M = {
    iron: std(0x16181a, 0.55, 0.55, { envMapIntensity: 0.6 }),
    ironL: std(0x2c2f30, 0.5, 0.6, { envMapIntensity: 0.7 }),
    paint: std(0x1a1d1c, 0.34, 0.3, { envMapIntensity: 0.9 }),           // 기관차 — 검푸른 칠
    frame: std(0x4a1a13, 0.55, 0.15, { envMapIntensity: 0.5 }),
    red: std(0x7c2418, 0.5, 0.1, { envMapIntensity: 0.5 }),
    brass: std(0xb08a45, 0.32, 0.9, { envMapIntensity: 1.2 }),
    copper: std(0x8a4c2c, 0.38, 0.85, { envMapIntensity: 1.0 }),
    steel: std(0x8d8f93, 0.35, 0.9, { envMapIntensity: 1.0 }),
    wood: std(0x3b2a1d, 0.9),
    coal: std(0x0d0d0e, 0.95),
    roof: std(0x4a423d, 0.9, 0.1, { side: T.DoubleSide }),
    truss: std(0x2a2522, 0.6, 0.5, { envMapIntensity: 0.4 }),
    stone: null, ballast: null, wall: null, sleeper: std(0x3d3024, 1), coach: std(0x2a1d16, 0.45, 0.1, { envMapIntensity: 0.6 }),
    pier: std(0x9d9284, 0.95), lamp: new T.MeshBasicMaterial({ color: 0xffd9a0 }), win: std(0x1b1a20, 0.15, 0.3, { envMapIntensity: 1.3 }),
  };
  const ballastTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#5d5248'; g.fillRect(0, 0, w, h); const r = rnd(4);
    for (let i = 0; i < 16000; i++) { const v = 55 + r() * 85; g.fillStyle = `rgb(${v + 14 | 0},${v + 4 | 0},${v - 6 | 0})`; const s = 1 + r() * 3; g.fillRect(r() * w, r() * h, s, s); }
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(30,24,20,${0.05 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 60, 10 + r() * 30, r() * 3, 0, 7); g.fill(); }   // 기름 얼룩
  });
  ballastTex.wrapS = ballastTex.wrapT = T.RepeatWrapping; ballastTex.repeat.set(14, 60);
  M.ballast = std(0xffffff, 1, 0, { map: ballastTex });
  const stoneTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#8a8070'; g.fillRect(0, 0, w, h); const r = rnd(3);
    for (let y = 0; y < h; y += 64) for (let x = ((y / 64) % 2) * -48; x < w; x += 96) { const v = 0.86 + r() * 0.18; g.fillStyle = `rgb(${138 * v | 0},${128 * v | 0},${112 * v | 0})`; g.fillRect(x + 2, y + 2, 92, 60); }
  });
  stoneTex.wrapS = stoneTex.wrapT = T.RepeatWrapping; stoneTex.repeat.set(6, 30);
  M.stone = std(0xffffff, 0.92, 0, { map: stoneTex });
  // 왼쪽 역사 건물: 크림색 돌 · 아치 2층 · 짙은 창
  const wallTex = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#cbbfa8'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 12) { g.fillStyle = 'rgba(90,70,50,.06)'; g.fillRect(0, y, w, 1); }
    for (let i = 0; i < 16; i++) { const x = i * 64 + 10;
      g.fillStyle = '#2d2a2c'; g.fillRect(x, 150, 44, 106); g.beginPath(); g.arc(x + 22, 150, 22, Math.PI, 0); g.fill();   // 아래층 아치
      g.fillStyle = '#3a3638'; g.fillRect(x + 6, 40, 32, 60); g.fillStyle = '#ddd3bf'; g.fillRect(x + 2, 34, 40, 5); }
    g.fillStyle = '#b4a890'; g.fillRect(0, 118, w, 10);
  });
  wallTex.wrapS = T.RepeatWrapping; wallTex.repeat.set(3, 1);
  M.wall = std(0xffffff, 0.95, 0, { map: wallTex });
  const facades = [0, 1, 2].map((k) => std(0xffffff, 0.95, 0, { map: canvasTex(256, 256, (g, w, h) => {
    const r = rnd(20 + k); g.fillStyle = ['#cdbfa6', '#c8b79f', '#c2ab98'][k]; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${150 + r() * 60 | 0},${140 + r() * 50 | 0},${130 + r() * 50 | 0},.18)`; g.fillRect(r() * w, r() * h, 6 + r() * 18, 3 + r() * 8); }   // 돌 얼룩
    for (let f = 0; f < 6; f++) for (let c = 0; c < 6; c++) { const x = 10 + c * 41, y = 12 + f * 40; g.fillStyle = `rgba(108,104,128,${0.3 + r() * 0.18})`; g.fillRect(x, y, 20, 26); }
    g.fillStyle = 'rgba(90,84,96,.35)'; g.fillRect(0, 92, w, 2); g.fillRect(0, 212, w, 2);
  }) }));
  facades.forEach((m) => { m.map.wrapS = m.map.wrapT = T.RepeatWrapping; });
  const latticeTex = canvasTex(512, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = '#7f7a7c'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    g.lineWidth = 3; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 4); g.lineTo(x + 32, h - 4); g.moveTo(x + 32, 4); g.lineTo(x, h - 4); g.stroke(); }
  });
  latticeTex.wrapS = T.RepeatWrapping; latticeTex.repeat.set(10, 1);
  const lattice = std(0xffffff, 0.8, 0.3, { map: latticeTex, alphaTest: 0.5, side: T.DoubleSide });
  const glass = std(0xb9b6c2, 0.25, 0.1, { transparent: true, opacity: 0.4, side: T.DoubleSide, emissive: 0x9d9aa8, emissiveIntensity: 0.6, depthWrite: false });

  // ── 합치기: 정적인 조각은 재질별로 모아 한 덩어리
  const bins = new Map();
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _p = new T.Vector3(), _s = new T.Vector3();
  const put = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1], parent = null) => {
    _m.compose(_p.set(...pos), _q.setFromEuler(_e.set(rot[0], rot[1], rot[2])), _s.set(...scl)); if (parent) _m.premultiply(parent);
    const g = geo.index ? geo.toNonIndexed() : geo; g.applyMatrix4(_m);
    if (!bins.has(mat)) bins.set(mat, []); bins.get(mat).push(g);
  };
  const box = (w, h, d, mat, pos, rot, par) => put(new T.BoxGeometry(w, h, d), mat, pos, rot, undefined, par);
  const cylZ = (r1, r2, len, mat, pos, par, sg = 24) => put(new T.CylinderGeometry(r1, r2, len, sg), mat, pos, [Math.PI / 2, 0, 0], undefined, par);   // 축이 z
  const cylX = (r1, r2, len, mat, pos, par, sg = 16) => put(new T.CylinderGeometry(r1, r2, len, sg), mat, pos, [0, 0, Math.PI / 2], undefined, par);   // 축이 x
  const cylY = (r1, r2, len, mat, pos, par, sg = 16) => put(new T.CylinderGeometry(r1, r2, len, sg), mat, pos, undefined, undefined, par);
  const lathe = (pts, mat, pos, par, sg = 24) => put(new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), sg), mat, pos, undefined, undefined, par);
  const rod = (a, b, r, mat) => { const A = new T.Vector3(...a), B = new T.Vector3(...b), d = B.clone().sub(A), L = d.length(); const g = new T.CylinderGeometry(r, r, L, 6); _q.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); _m.compose(A.add(B).multiplyScalar(0.5), _q, _s.set(1, 1, 1)); const gg = g.toNonIndexed(); gg.applyMatrix4(_m); if (!bins.has(mat)) bins.set(mat, []); bins.get(mat).push(gg); };

  // ── 그림에서 옮긴 뼈대
  const DG = 31;                                   // 지붕 끝(박공) 거리
  const APEX = P(0.50, 0.15, DG), EL = P(0.14, 0.40, DG), ER = P(0.93, 0.45, DG);
  const ZN = 16, ZF = -DG, RL = ZN - ZF, RZ = (ZN + ZF) / 2;
  const TRK = [-9.2, P(0.48, 0.85, 28.3)[0], -4.8];   // 선로 중심: 왼쪽 끝 · 가운데 기관차 · 왼쪽 기관차
  const PLAT = 3.3;                                  // 오른쪽 승강장 끝선
  const DCL = 28.3, DLL = 18;                        // 가운데 기관차 앞 · 왼쪽 기관차 뒤(탄수차) 거리

  // 바닥 · 선로
  const gnd = new T.Mesh(new T.PlaneGeometry(220, 260), M.ballast); gnd.rotation.x = -Math.PI / 2; gnd.position.set(10, 0, -100); gnd.receiveShadow = true; scene.add(gnd);
  for (const tx of TRK) {
    for (const dx of [-0.72, 0.72]) { box(0.07, 0.15, 150, M.steel, [tx + dx, 0.2, -60]); box(0.15, 0.04, 150, M.iron, [tx + dx, 0.12, -60]); }
    for (let z = ZN; z > -75; z -= 0.68) box(2.5, 0.1, 0.24, M.sleeper, [tx + (R() - 0.5) * 0.05, 0.06, z], [0, (R() - 0.5) * 0.03, 0]);
  }
  // 오른쪽 승강장(돌) · 가장자리 갓돌
  const plat = new T.Mesh(new T.BoxGeometry(16, 0.55, 64), M.stone); plat.position.set(PLAT + 8, 0.275, ZN - 32); plat.receiveShadow = true; scene.add(plat);
  box(0.4, 0.08, 64, M.pier, [PLAT + 0.2, 0.58, ZN - 32]);
  // 왼쪽 역사 건물(지붕 아래 왼쪽 벽)
  { const wall = new T.Mesh(new T.PlaneGeometry(RL + 6, 9.5), M.wall); wall.rotation.y = Math.PI / 2; wall.position.set(EL[0] - 0.5, 4.75, RZ - 3); wall.receiveShadow = true; scene.add(wall);
    box(1.2, 0.35, RL + 6, M.pier, [EL[0] + 0.1, 5.2, RZ - 3]); box(3, 0.6, RL + 6, M.stone, [EL[0] - 1.4, 0.3, RZ - 3]); }

  // ── 지붕: 두 경사면(아래 70% 판 · 위 30% 유리) · 도리 · 폴롱소 트러스 · 기둥 · 박공 끝 띠
  const slopes = [[EL, APEX], [ER, APEX]];
  for (const [E, A] of slopes) {
    const dx = A[0] - E[0], dy = A[1] - E[1], L = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    const at = (k) => [E[0] + dx * k, E[1] + dy * k];
    // 판(아래) — 그림자 드리움
    { const k0 = 0, k1 = 0.7, c = at((k0 + k1) / 2); const g = new T.Mesh(new T.PlaneGeometry(L * (k1 - k0), RL), M.roof); g.rotation.order = 'ZXY'; g.rotation.set(-Math.PI / 2, 0, ang); g.position.set(c[0], c[1] + 0.08, RZ); g.castShadow = true; g.receiveShadow = true; scene.add(g); }
    { const c = at(0.85); const g = new T.Mesh(new T.PlaneGeometry(L * 0.3, RL), glass); g.rotation.order = 'ZXY'; g.rotation.set(-Math.PI / 2, 0, ang); g.position.set(c[0], c[1] + 0.08, RZ); scene.add(g); }
    for (let k = 0; k <= 12; k++) { const c = at(k / 12); box(0.12, 0.18, RL, M.truss, [c[0], c[1] - 0.06, RZ]); }   // 도리
    for (let k = 0; k <= 30; k++) { const c = at(0.7 + k * 0.01); box(0.03, 0.04, RL, M.truss, [c[0], c[1] + 0.02, RZ]); }   // 유리 살
  }
  for (let z = ZF; z <= ZN; z += 6.2) {
    for (const [E, A] of slopes) {
      rod([E[0], E[1], z], [A[0], A[1], z], 0.13, M.truss);                          // 서까래
      const mid = [(E[0] + A[0]) / 2, (E[1] + A[1]) / 2 - 0.1, z];
      const tie = [E[0] + (A[0] - E[0]) * 0.5, E[1] + 1.6, z];
      rod(mid, tie, 0.06, M.truss); rod([E[0], E[1], z], tie, 0.04, M.truss); rod(tie, [A[0], A[1] - 0.2, z], 0.04, M.truss);   // 폴롱소: 버팀대 · 당김줄
      const s = E[0] < 0 ? -1 : 1;
      cylY(0.2, 0.26, E[1], M.truss, [E[0], E[1] / 2, z]); cylY(0.42, 0.42, 0.5, M.truss, [E[0], 0.25, z]); cylY(0.34, 0.22, 0.5, M.truss, [E[0], E[1] - 0.25, z]);   // 주철 기둥 · 받침 · 머리
      rod([E[0], E[1] - 1.8, z], [E[0] - s * 1.6, E[1], z], 0.06, M.truss);            // 까치발
    }
  }
  for (const [E, A] of slopes) { rod([E[0], E[1], ZF], [A[0], A[1], ZF], 0.55, M.truss); rod([E[0], E[1] - 0.9, ZF], [A[0], A[1] - 0.9, ZF], 0.12, M.truss); }   // 박공 끝 두꺼운 띠(그림 속 어두운 삼각)
  for (const [E] of slopes) box(0.4, 0.5, RL, M.truss, [E[0], E[1] - 0.2, RZ]);   // 처마보

  // ── 증기기관차(1870년대 서부철도 화물용 0-6-0 · 탄수차). 앞 = +z
  function loco(px, pz, ry) {
    const W = new T.Matrix4().compose(new T.Vector3(px, 0, pz), new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0)), new T.Vector3(1, 1, 1));
    const B = (w, h, d, m, p, r) => box(w, h, d, m, p, r, W);
    const wheel = (x, y, z, r, n) => {
      put(new T.TorusGeometry(r - 0.04, 0.06, 8, 40), M.ironL, [x, y, z], [0, Math.PI / 2, 0], undefined, W);
      put(new T.TorusGeometry(r - 0.11, 0.035, 6, 36), M.iron, [x, y, z], [0, Math.PI / 2, 0], undefined, W);
      cylX(0.13, 0.13, 0.18, M.iron, [x, y, z], W, 14); cylX(0.06, 0.06, 0.26, M.steel, [x, y, z], W, 8);
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; put(new T.BoxGeometry(0.05, r - 0.16, 0.07), M.iron, [x, y + Math.cos(a) * (r / 2 + 0.02), z + Math.sin(a) * (r / 2 + 0.02)], [a, 0, 0], undefined, W); }
      put(new T.CylinderGeometry(r * 0.6, r * 0.6, 0.08, 16, 1, false, 2.3, 1.2), M.iron, [x, y, z], [0, 0, Math.PI / 2], undefined, W);   // 균형추
    };
    // 틀 · 발판 · 앞 완충보(붉은) · 완충기 · 연결 고리
    for (const s of [-1, 1]) B(0.07, 0.72, 7.4, M.frame, [s * 0.62, 0.98, 0.4]);
    B(2.72, 0.05, 7.6, M.iron, [0, 1.36, 0.35]); for (const s of [-1, 1]) B(0.04, 0.12, 7.6, M.brass, [s * 1.36, 1.32, 0.35]);
    B(2.8, 0.44, 0.16, M.red, [0, 1.08, 4.1]);
    for (const s of [-1, 1]) { cylZ(0.11, 0.15, 0.4, M.iron, [s * 0.86, 1.08, 4.36], W, 14); cylZ(0.22, 0.22, 0.05, M.steel, [s * 0.86, 1.08, 4.58], W, 20); }
    B(0.1, 0.14, 0.32, M.steel, [0, 1.0, 4.3]);
    // 바깥 실린더 · 피스톤대 · 미끄럼대 · 연결봉
    for (const s of [-1, 1]) {
      cylZ(0.3, 0.3, 1.05, M.paint, [s * 1.1, 0.92, 3.1], W, 20); cylZ(0.32, 0.32, 0.06, M.brass, [s * 1.1, 0.92, 3.64], W, 20); cylZ(0.32, 0.32, 0.06, M.brass, [s * 1.1, 0.92, 2.56], W, 20);
      B(0.05, 0.05, 1.5, M.steel, [s * 1.1, 0.96, 1.9]); B(0.05, 0.05, 1.5, M.steel, [s * 1.1, 0.86, 1.9]);
      B(0.06, 0.12, 3.9, M.steel, [s * 0.92, 0.5, 0.1]);   // 연결봉(세 바퀴를 잇는)
      B(0.05, 0.1, 2.2, M.steel, [s * 1.0, 0.7, 1.0], [0.12, 0, 0]);   // 주연봉
    }
    for (const z of [1.95, 0.1, -1.75]) for (const s of [-1, 1]) wheel(s * 0.8, 0.75, z, 0.75, 14);
    // 바퀴 덮개(반원) · 놋쇠 테
    for (const z of [1.95, 0.1, -1.75]) for (const s of [-1, 1]) { put(new T.CylinderGeometry(0.82, 0.82, 0.16, 20, 1, false, 0, Math.PI), M.paint, [s * 0.82, 0.78, z], [0, 0, Math.PI / 2], undefined, W); put(new T.CylinderGeometry(0.84, 0.84, 0.02, 20, 1, true, 0, Math.PI), M.brass, [s * 0.91, 0.78, z], [0, 0, Math.PI / 2], undefined, W); }
    // 보일러 · 띠 · 손잡이
    cylZ(0.66, 0.66, 4.3, M.paint, [0, 2.1, 0.85], W, 36);
    for (const z of [-0.9, 0.3, 1.5, 2.7]) cylZ(0.675, 0.675, 0.06, M.brass, [0, 2.1, z], W, 36);
    for (const s of [-1, 1]) { cylZ(0.018, 0.018, 4.6, M.steel, [s * 0.74, 2.42, 1.0], W, 6); for (const z of [-0.8, 0.8, 2.4]) cylX(0.012, 0.012, 0.1, M.steel, [s * 0.7, 2.42, z], W, 4); }
    // 연기실 · 문 · 경첩 · 받침
    cylZ(0.73, 0.73, 1.0, M.iron, [0, 2.1, 3.5], W, 36); cylZ(0.76, 0.76, 0.06, M.ironL, [0, 2.1, 4.0], W, 36);
    put(new T.SphereGeometry(0.95, 32, 6, 0, Math.PI * 2, 0, 0.75), M.iron, [0, 2.1, 3.42], [Math.PI / 2, 0, 0], undefined, W);   // 볼록한 문
    for (const y of [1.85, 2.35]) B(0.95, 0.05, 0.03, M.steel, [0.2, y, 4.17]);
    cylZ(0.03, 0.03, 0.18, M.steel, [0, 2.1, 4.2], W, 6); cylX(0.02, 0.02, 0.3, M.steel, [0, 2.1, 4.28], W, 4);
    B(1.55, 0.62, 0.95, M.iron, [0, 1.6, 3.5]);
    // 굴뚝(구리 머리) · 증기 돔(놋쇠) · 안전변 · 기적
    lathe([[0.4, 0], [0.32, 0.06], [0.23, 0.2], [0.21, 1.0], [0.24, 1.1], [0.3, 1.18], [0.31, 1.24], [0.2, 1.25]], M.iron, [0, 2.74, 3.5], W, 28);
    lathe([[0.245, 1.06], [0.3, 1.16], [0.315, 1.24], [0.2, 1.26]], M.copper, [0, 2.74, 3.5], W, 28);
    lathe([[0.36, 0], [0.32, 0.08], [0.29, 0.38], [0.25, 0.52], [0.16, 0.62], [0.0, 0.66]], M.brass, [0, 2.68, 1.0], W, 28);
    lathe([[0.14, 0], [0.1, 0.06], [0.08, 0.32], [0.12, 0.38], [0.0, 0.42]], M.brass, [0, 2.7, -0.75], W, 16);
    lathe([[0.04, 0], [0.04, 0.2], [0.07, 0.28], [0.06, 0.36], [0.0, 0.38]], M.brass, [0.25, 2.72, -1.1], W, 12);
    // 화실 · 운전실(앞판 · 둥근 창 · 지붕 · 낮은 옆판)
    cylZ(0.74, 0.74, 1.1, M.paint, [0, 2.12, -1.75], W, 36); B(1.48, 0.8, 1.1, M.paint, [0, 1.72, -1.75]);
    B(2.5, 2.05, 0.06, M.paint, [0, 2.4, -2.35]);
    for (const s of [-1, 1]) { put(new T.CircleGeometry(0.2, 20), M.win, [s * 0.62, 2.95, -2.31], undefined, undefined, W); put(new T.TorusGeometry(0.21, 0.025, 6, 24), M.brass, [s * 0.62, 2.95, -2.31], undefined, undefined, W); }
    put(new T.CylinderGeometry(2.4, 2.4, 1.7, 24, 1, true, Math.PI - 0.58, 1.16), M.paint, [0, 1.05, -3.05], [Math.PI / 2, 0, 0], undefined, W);
    put(new T.CylinderGeometry(2.42, 2.42, 0.04, 24, 1, false, Math.PI - 0.6, 1.2), M.iron, [0, 1.05, -2.2], [Math.PI / 2, 0, 0], undefined, W);
    for (const s of [-1, 1]) { B(0.05, 0.95, 1.5, M.paint, [s * 1.24, 1.85, -3.05]); B(0.07, 0.05, 1.5, M.brass, [s * 1.24, 2.34, -3.05]); cylY(0.025, 0.025, 1.9, M.steel, [s * 1.18, 2.35, -3.85], W, 6); }
    // 앞등 둘(완충보 위)
    for (const s of [-1, 1]) { B(0.22, 0.3, 0.2, M.iron, [s * 0.72, 1.5, 3.95]); put(new T.CircleGeometry(0.08, 16), M.lamp, [s * 0.72, 1.5, 4.06], undefined, undefined, W); lathe([[0.06, 0], [0.03, 0.1], [0, 0.12]], M.iron, [s * 0.72, 1.65, 3.95], W, 8); }
    // 탄수차(바퀴 셋 · 물탱크 · 석탄 · 뒤 완충보)
    for (const s of [-1, 1]) B(0.07, 0.5, 5.2, M.frame, [s * 0.66, 0.85, -6.5]);
    for (const z of [-4.8, -6.5, -8.2]) for (const s of [-1, 1]) wheel(s * 0.8, 0.55, z, 0.55, 10);
    B(2.6, 0.06, 5.3, M.iron, [0, 1.12, -6.5]);
    B(2.5, 1.5, 5.0, M.paint, [0, 1.9, -6.55]);
    for (const s of [-1, 1]) { B(0.04, 0.06, 5.0, M.brass, [s * 1.27, 2.4, -6.55]); B(0.04, 0.06, 5.0, M.brass, [s * 1.27, 1.3, -6.55]); }
    B(2.75, 0.16, 5.1, M.iron, [0, 2.72, -6.55]);
    for (let i = 0; i < 9; i++) put(new T.SphereGeometry(0.5 + R() * 0.35, 8, 6), M.coal, [(R() - 0.5) * 1.7, 2.72, -4.6 - R() * 3.4], undefined, [1, 0.45, 1], W);
    B(2.8, 0.44, 0.16, M.red, [0, 1.0, -9.1]);
    for (const s of [-1, 1]) { cylZ(0.11, 0.15, 0.4, M.iron, [s * 0.86, 1.0, -9.36], W, 14); cylZ(0.22, 0.22, 0.05, M.steel, [s * 0.86, 1.0, -9.58], W, 20); }
    for (let k = 0; k < 4; k++) B(0.4, 0.03, 0.12, M.steel, [-1.0, 0.6 + k * 0.42, -9.12]);   // 뒤 사다리 발판
    B(0.9, 0.5, 0.3, M.wood, [0.6, 2.95, -8.8]);   // 공구 상자
  }
  loco(TRK[1], -DCL - 4.6, 0);          // 가운데: 우리 쪽을 봄(앞 완충기 ≈ 28.3m)
  loco(TRK[2], -DLL - 9.6, Math.PI);    // 왼쪽: 등을 보임(탄수차 뒤 ≈ 18m)
  // 왼쪽 끝 선로: 객차 셋(1870년대 3칸 객차)
  for (let i = 0; i < 3; i++) {
    const z = -4 - i * 8.6, x = TRK[0];
    box(2.7, 2.3, 8.0, M.coach, [x, 2.15, z]); put(new T.CylinderGeometry(2.4, 2.4, 8.0, 20, 1, false, -0.55, 1.1), M.iron, [x, 0.95, z], [Math.PI / 2, 0, 0]);
    for (let d = 0; d < 4; d++) { box(0.02, 0.7, 0.9, M.win, [x + 1.36, 2.55, z - 3 + d * 2]); box(0.03, 1.8, 0.05, M.brass, [x + 1.37, 2.2, z - 3.6 + d * 2]); }
    for (const zz of [-2.6, 2.6]) for (const s of [-1, 1]) { put(new T.CylinderGeometry(0.5, 0.5, 0.1, 18), M.iron, [x + s * 0.8, 0.52, z + zz], [0, 0, Math.PI / 2]); }
    box(2.5, 0.25, 8.2, M.iron, [x, 0.95, z]);
  }
  // 신호 기둥 · 가스등(승강장)
  for (const [x, z, h] of [[-2.6, -26, 6.2], [7, -44, 7]]) { cylY(0.07, 0.1, h, M.truss, [x, h / 2, z]); box(0.8, 0.18, 0.05, M.red, [x + 0.35, h - 0.6, z]); }
  for (let z = 8; z > -40; z -= 9) { const x = PLAT + 1.2; cylY(0.06, 0.1, 3.4, M.truss, [x, 0.55 + 1.7, z]); box(0.34, 0.46, 0.34, M.iron, [x, 0.55 + 3.6, z]); put(new T.BoxGeometry(0.26, 0.34, 0.26), M.lamp, [x, 0.55 + 3.6, z]); }

  // ── 지붕 너머: 유럽 다리(철 격자) · 오스만식 건물 줄
  { const zB = -62; const deck = new T.Mesh(new T.PlaneGeometry(120, 2.2), lattice); deck.position.set(5, 6.9, zB); scene.add(deck);
    box(120, 0.25, 7, M.pier, [5, 8.1, zB - 3.4]); box(120, 0.3, 0.3, M.pier, [5, 5.8, zB]);
    for (const x of [-14, 4, 22, 40]) box(2.4, 5.8, 3.2, M.pier, [x, 2.9, zB - 3]); }
  const bld = (x0, x1, z, h, k) => { const w = x1 - x0, cx = (x0 + x1) / 2;
    const pg = new T.PlaneGeometry(w, h), uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 18, uv.getY(i) * h / 22); const f = new T.Mesh(pg, facades[k]); f.position.set(cx, h / 2, z); f.receiveShadow = true; scene.add(f);
    box(w, h, 14, M.pier, [cx, h / 2, z - 7.05]);
    put(new T.CylinderGeometry(0.01, 1, 1, 4, 1).rotateY(Math.PI / 4), M.roof, [cx, h + 2.2, z - 7], [0, 0, 0], [w * 0.72, 4.4, 10.5]); };
  { const zz = -100; let x = -70; let k = 0; while (x < -2) { const w = 14 + R() * 10; bld(x, x + w, zz - R() * 6, 24 + R() * 7, k++ % 3); x += w + 0.5; } }
  { const zz = -96; let x = 22; let k = 1; while (x < 80) { const w = 12 + R() * 10; bld(x, x + w, zz - R() * 8, 18 + R() * 6, k++ % 3); x += w + 0.5; } }
  bld(-3, 14, -112, 22, 2);

  // 합친 정적 덩어리를 장면에
  for (const [mat, list] of bins) { const g = mergeBufferGeometries(list); if (!g) continue; const m = new T.Mesh(g, mat); m.castShadow = mat !== M.lamp && mat !== M.pier; m.receiveShadow = true; scene.add(m); }

  // ── 사람(승강장 · 선로 사이): 프록코트 · 실크 모자 / 종 모양 치마 — 한 그리기로
  {
    const paint = (g, hex) => { const c = new T.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new T.BufferAttribute(a, 3)); return g.index ? g.toNonIndexed() : g; };
    const lp = (pts) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), 10);
    const tr = (g, x, y, z) => { g.translate(x, y, z); return g; };
    const man = mergeBufferGeometries([
      paint(lp([[0.001, 0], [0.12, 0.02], [0.13, 0.55], [0.2, 0.78], [0.19, 1.2], [0.23, 1.4], [0.12, 1.5], [0.001, 1.52]]), 0xffffff),
      paint(tr(new T.SphereGeometry(0.11, 10, 8), 0, 1.62, 0), 0xc9a58a),
      paint(tr(new T.CylinderGeometry(0.1, 0.1, 0.2, 10), 0, 1.81, 0), 0x0d0d0f), paint(tr(new T.CylinderGeometry(0.17, 0.17, 0.02, 12), 0, 1.71, 0), 0x0d0d0f)]);
    const woman = mergeBufferGeometries([
      paint(lp([[0.001, 0], [0.42, 0.01], [0.36, 0.3], [0.24, 0.8], [0.15, 1.05], [0.2, 1.33], [0.1, 1.43], [0.001, 1.45]]), 0xffffff),
      paint(tr(new T.SphereGeometry(0.1, 10, 8), 0, 1.54, 0), 0xc9a58a), paint(tr(new T.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, 0, 1.4), 0, 1.57, 0), 0x2a2320)]);
    const spots = [];
    for (let i = 0; i < 70; i++) { const x = PLAT + 0.8 + R() * 11, z = 6 - R() * 52; if (z > -24 && x < PLAT + 4) continue; spots.push([x, 0.55, z]); }   // 승강장(카메라가 지나는 앞쪽 비움)
    for (let i = 0; i < 8; i++) spots.push([-2.6 + R() * 1.8, 0, -30 - R() * 14]);   // 선로 사이 철도원
    for (let i = 0; i < 6; i++) spots.push([-7 + R() * 1.6, 0, -24 - R() * 8]);
    const mk = (geo, list) => { if (!list.length) return; const im = new T.InstancedMesh(geo, std(0xffffff, 0.85, 0, { vertexColors: true }), list.length); const o = new T.Object3D();
      list.forEach((p, i) => { o.position.set(...p); o.rotation.y = R() * 6.28; const s = 0.94 + R() * 0.12; o.scale.set(s, s, s); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
      im.castShadow = true; im.receiveShadow = true; scene.add(im); };
    const kinds = [[man, 0x1b1a1c], [man, 0x2e2622], [man, 0x22262c], [woman, 0x3a2c2c], [woman, 0x4a3e38]], groups = kinds.map(() => []);
    spots.forEach((p) => groups[R() < 0.3 ? 3 + ((R() * 2) | 0) : (R() * 3) | 0].push(p));
    kinds.forEach(([g, c], i) => { const gg = g.clone(), col = gg.attributes.color, cc = new T.Color(c); for (let k = 0; k < col.count; k++) if (col.getX(k) > 0.99 && col.getY(k) > 0.99) col.setXYZ(k, cc.r, cc.g, cc.b); mk(gg, groups[i]); });
  }

  // ── 빛: 지붕 너머에서 드는 오후 해(그림자 → 바닥에 유리 줄무늬 빛) + 하늘빛
  scene.add(new T.HemisphereLight(0xc4bfcf, 0x4a3f35, 0.95));
  const sun = new T.DirectionalLight(0xffe2c0, 2.4); sun.position.set(18, 40, -48); sun.target.position.set(0, 0, -14); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 40, bottom: -40, near: 5, far: 120 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; sun.shadow.camera.updateProjectionMatrix();
  const fill = new T.PointLight(0xffd6a0, 1.2, 9, 2); fill.position.set(TRK[1], 1.6, -DCL + 1.5); scene.add(fill);   // 가운데 기관차 앞등 빛

  // ── 빛줄기(유리 지붕 틈) · 김(그림처럼 푸른 보랏빛 큰 덩이 · 흰 김)
  const shaftTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,240,215,.7)'); gr.addColorStop(1, 'rgba(255,240,215,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const sd = g.createLinearGradient(0, 0, w, 0); sd.addColorStop(0, '#000'); sd.addColorStop(0.35, 'rgba(0,0,0,0)'); sd.addColorStop(0.65, 'rgba(0,0,0,0)'); sd.addColorStop(1, '#000'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = sd; g.fillRect(0, 0, w, h); });
  const shaftMat = new T.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.22, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
  for (let i = 0; i < 7; i++) { const m = new T.Mesh(new T.PlaneGeometry(1.4 + R() * 1.6, 17), shaftMat); m.position.set(-5 + i * 2.4, 8.5, -4 - i * 3.6); m.rotation.set(-0.5, 0.25, 0.3); scene.add(m); }
  // 김 덩이: 작은 구름 알갱이 여럿(가장자리 또렷 · 위는 밝고 아래는 그늘) — 그림 속 뭉게뭉게 붓질처럼
  const puffTexs = [3, 8, 13].map((sd) => canvasTex(128, 128, (g) => { const r = rnd(sd);
    for (let i = 0; i < 22; i++) { const a = r() * 6.28, d = r() * 32, x = 64 + Math.cos(a) * d, y = 66 + Math.sin(a) * d * 0.8, rr = 12 + r() * 16;
      const gr = g.createRadialGradient(x - rr * 0.3, y - rr * 0.35, rr * 0.1, x, y, rr); gr.addColorStop(0, 'rgba(255,255,255,.8)'); gr.addColorStop(0.45, 'rgba(236,236,240,.55)'); gr.addColorStop(0.8, 'rgba(210,210,220,.18)'); gr.addColorStop(1, 'rgba(200,200,210,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
    const sh = g.createLinearGradient(0, 30, 0, 110); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(60,60,80,.45)'); g.globalCompositeOperation = 'source-atop'; g.fillStyle = sh; g.fillRect(0, 0, 128, 128); }));
  const puffs = [];
  const pm = (c, o, rot, k) => new T.SpriteMaterial({ map: puffTexs[k % 3], color: c, transparent: true, opacity: o, depthWrite: false, fog: true, rotation: rot });
  const pMats = { v: [0, 0.3, -0.25, 0.15].map((r, k) => pm(0x9497c4, 0.9, r, k)), w: [0.1, -0.2, 0.3].map((r, k) => pm(0xcdc5bf, 0.72, r, k)), g: [0.2, -0.1].map((r, k) => pm(0xa29dab, 0.45, r, k)) };
  const puff = (kind, x, y, z, s, vy = 0.6, vx = 0) => { const sp = new T.Sprite(pMats[kind][(R() * pMats[kind].length) | 0]); sp.position.set(x, y, z); sp.scale.set(s, s, 1); scene.add(sp); puffs.push({ sp, s, vy, vx }); };
  const CH = [TRK[1], 4.3, -DCL - 4.6 + 3.5];   // 가운데 기관차 굴뚝
  for (let i = 0; i < 90; i++) { const k = Math.pow(i / 90, 0.85); puff('v', CH[0] - k * 7.5 + (R() - 0.5) * (1.5 + k * 7), CH[1] + k * 14.5 + R() * 1.2, CH[2] - k * 3 + (R() - 0.5) * 3, 1.4 + k * 3.6 + R() * 1.4, 0.9 + R() * 0.6, -0.5); }   // 위로 · 왼쪽으로 번지는 푸른 김(작은 덩이 여럿)
  for (let i = 0; i < 26; i++) puff('w', TRK[2] + (R() - 0.5) * 4, 3 + R() * 4, -DLL - 2 - R() * 8, 2 + R() * 2.4, 0.4);    // 왼쪽 기관차 흰 김
  for (let i = 0; i < 24; i++) puff('w', 2 + R() * 9, 3.5 + R() * 7, -33 - R() * 10, 2.4 + R() * 3, 0.3, 0.3);                // 오른쪽 흰 김
  for (let i = 0; i < 16; i++) puff('g', -6 + R() * 12, 0.8 + R() * 1.5, -14 - R() * 20, 2.5 + R() * 3, 0.1, 0.4);      // 선로 위 낮은 김

  // ── 카메라 길: 가운데 기관차 앞 승강장 → 선로 위로 물러나며 돌아서 → 그림 자리(눈높이 · 정면)
  const Start = new T.Vector3(PLAT + 0.3, 0.55 + 1.6, -18.5), StartL = new T.Vector3(TRK[1] - 1.0, 2.4, -DCL - 1.5);
  const End = new T.Vector3(0, EYE, 0), EndL = new T.Vector3(0, EYE, -50);
  const Pc = new T.Vector3(), Lk = new T.Vector3();
  function pose(t) {
    const q = ease(seg(t, TL.dolly, TL.dollyD));
    Pc.lerpVectors(Start, End, q); Pc.x = Start.x + (End.x - Start.x) * Math.pow(q, 0.7);   // 먼저 선로 쪽으로 비켜서고 물러남
    Lk.lerpVectors(StartL, EndL, Math.pow(q, 1.2));
    cam.position.copy(Pc); cam.lookAt(Lk);
  }

  // ── 끝 시점 투사: 끝 카메라 화면 좌표 → 페이지 그림(#sceneImg 가 놓인 사각형)의 같은 점 색 → 끝 프레임 = 페이지 그림
  const endCam = cam.clone(); endCam.position.copy(End); endCam.lookAt(EndL); endCam.updateMatrixWorld(); shift(endCam);
  const vp = new T.Matrix4().multiplyMatrices(endCam.projectionMatrix, endCam.matrixWorldInverse);
  let ptexOk = false, ptex;
  const ready = () => { ptexOk = true; if (FREEZE != null && !done) { draw(+FREEZE); window.__inReady = true; } };
  if (imgEl && imgEl.complete && imgEl.naturalWidth) { const c = document.createElement('canvas'); c.width = imgEl.naturalWidth; c.height = imgEl.naturalHeight; c.getContext('2d').drawImage(imgEl, 0, 0); ptex = new T.CanvasTexture(c); ptexOk = true; }   // <img> 를 바로 쓰면 화면 크기로 잡혀 올라가다 깨짐
  else ptex = new T.TextureLoader().load(imgEl ? (imgEl.currentSrc || imgEl.src) : new URL('../experience-v2/ticket/img/lazare-1877.jpg', import.meta.url).href, ready);
  ptex.minFilter = T.LinearFilter; ptex.generateMipmaps = false;
  const projMat = new T.ShaderMaterial({
    uniforms: { map: { value: ptex }, vp: { value: vp }, view: { value: new T.Vector2(VW, VH) }, rect: { value: new T.Vector4(rect.x, rect.y, rect.w, rect.h) } },
    vertexShader: `varying vec3 wp; void main(){
      vec4 lp = vec4(position,1.0);
      #ifdef USE_INSTANCING
        lp = instanceMatrix * lp;
      #endif
      vec4 w = modelMatrix * lp; wp = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D map; uniform mat4 vp; uniform vec2 view; uniform vec4 rect; varying vec3 wp;
      void main(){
        vec4 cl = vp * vec4(wp,1.0); vec2 n = cl.xy / cl.w;
        vec2 p = vec2((n.x*0.5+0.5)*view.x, (1.0-(n.y*0.5+0.5))*view.y);
        vec2 uv = vec2((p.x-rect.x)/rect.z, 1.0-(p.y-rect.y)/rect.w);
        gl_FragColor = vec4(texture2D(map, clamp(uv, 0.001, 0.999)).rgb, 1.0);
      }`,
    side: T.DoubleSide,
  });
  const rt = new T.WebGLRenderTarget(Math.round(VW * renderer.getPixelRatio()), Math.round(VH * renderer.getPixelRatio()));
  const quadMat = new T.ShaderMaterial({ uniforms: { map: { value: rt.texture }, opacity: { value: 0 } }, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D map; uniform float opacity; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(map, vUv).rgb, opacity); }' });   // 값 그대로(색 변환 없이)
  const quadScene = new T.Scene(), quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quadScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), quadMat));
  const sky = new T.Mesh(new T.SphereGeometry(190, 32, 16), new T.MeshBasicMaterial({ color: FOG, fog: true, side: T.BackSide }));   // 모든 것 뒤 하늘(투사도 받음)
  sky.position.copy(End); scene.add(sky);

  const draw = (t) => {
    renderer.setRenderTarget(null); renderer.autoClear = true; renderer.render(scene, cam);
    const b = ptexOk ? (FORCE_B != null ? +FORCE_B : ease(seg(t, TL.proj, TL.projD))) : 0;
    if (b > 0) {
      scene.overrideMaterial = projMat; const fg = scene.fog; scene.fog = null; const sm = renderer.shadowMap.enabled; renderer.shadowMap.enabled = false;
      renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(null);
      scene.overrideMaterial = null; scene.fog = fg; renderer.shadowMap.enabled = sm;
      quadMat.uniforms.opacity.value = b; renderer.autoClear = false; renderer.render(quadScene, quadCam); renderer.autoClear = true;
    }
  };
  let tp = 0;
  const step = (t) => { const dt = Math.min(0.05, Math.max(0, t - tp)); tp = t; for (const p of puffs) { p.sp.position.y += p.vy * dt; p.sp.position.x += p.vx * dt; const s = p.sp.scale.x + dt * 0.5; p.sp.scale.set(s, s, 1); } };
  start();
  function start() {
    if (done) return;
    const t0f = FREEZE != null ? +FREEZE : 0; if (t0f > 0) { tp = 0; step(Math.min(t0f, 0.05)); }
    pose(t0f); renderer.compile(scene, cam); draw(t0f);
    if (FREEZE != null) { if (ptexOk) window.__inReady = true; return; }
    const t0 = performance.now();
    const frame = (now) => {
      if (done) return;
      const t = (now - t0) / 1000 * SPEED;
      step(t); pose(t); draw(t);
      if (t >= TL.out) root.style.opacity = String(1 - seg(t, TL.out, TL.outD));
      if (t >= TL.out + TL.outD) return finish();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }
}
