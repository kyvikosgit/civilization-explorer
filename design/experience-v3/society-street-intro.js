// 시민사회 도입(11/23) — 1874년 파리 대로 3D. 2초 안.
//   오스만식 건물 줄 · 카페 테라스(붉은 차양 · 둥근 탁자) · 앙상한 가로수 · 가스등 · 행인 · 마차 · 모리스 칼럼(가벼운 도형 — 칼럼 뷰어 안 씀)
//   카메라: 카페 앞 보도에서 출발 → 모리스 칼럼 옆을 지나며 대로 위로 떠올라 → 모네가 〈카퓌신 대로〉를 그린 높은 발코니 시점에서 멈춤.
//   멈춘 자리에서 대로 끝의 모네 그림이 페이지 거리 그림(.st-img)과 화면 위 같은 자리 · 같은 크기 → 걷히면 그대로 이어짐.
//   three.js(0.147) · 외부 모델 없음 · 그림 = 페이지와 같은 파일. 누르면 바로 끝. playStreetIntro({ host, imgEl, onDone })
import * as T from 'three';
import { mergeBufferGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t, a, d) => clamp((t - a) / d);
function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const TL = { dolly: 0, dollyD: 1.85, proj: 0.95, projD: 0.45, out: 1.85, outD: 0.15 };   // 움직이는 동안 그림이 3D 면에 입혀져(투사) 남은 움직임은 그림 속에서 — 끝 프레임 = 페이지 그림   // 1.25–1.85초: 같은 그림을 끝 시점에서 3D 위에 투사해 서서히 입힘 → 끝 프레임 = 페이지 그림 → 걷힘

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; }

export function playStreetIntro({ host, imgEl, under, onDone } = {}) {   // under: 이 요소 바로 뒤(같은 부모 안)에 끼움 — 페이지 거리 위 덧층(하늘 · 안개)이 3D 위에도 그대로 얹힘
  const hb = host.getBoundingClientRect();
  const root = document.createElement('div');
  root.id = 'scStreetIntro'; root.setAttribute('aria-hidden', 'true');
  Object.assign(root.style, { position: 'fixed', left: hb.left + 'px', top: hb.top + 'px', width: hb.width + 'px', height: hb.height + 'px', zIndex: 80, background: '#bfc6d0' });
  const cv = document.createElement('canvas'); Object.assign(cv.style, { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }); root.appendChild(cv);
  if (under) { Object.assign(root.style, { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: 'auto' }); under.after(root); }
  else document.body.appendChild(root);
  const VW = hb.width, VH = hb.height;
  const SPEED = (window.M100_INTRO && window.M100_INTRO.speed) || 1;
  const FREEZE = new URLSearchParams(location.search).get('ssT');

  let renderer, done = false, raf = 0;
  const finish = () => {
    if (done) return; done = true; cancelAnimationFrame(raf); removeEventListener('pointerdown', finish, true);
    root.style.transition = 'opacity .25s ease'; root.style.opacity = 0; onDone?.(); setTimeout(() => { root.remove(); renderer?.dispose(); }, 300);
  };
  addEventListener('pointerdown', finish, true);
  try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { finish(); return; }
  renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1)); renderer.setSize(VW, VH, false);
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.72;   // 페이지 거리 그림(.st-img, 어둡게 · 따뜻하게 보정됨)과 톤 맞춤
  const FOG = 0xbfc6d0;   // 그림 하늘과 같은 옅은 잿빛 하늘
  const scene = new T.Scene(); scene.background = new T.Color(FOG); scene.fog = new T.Fog(FOG, 45, 170);
  const cam = new T.PerspectiveCamera(58, VW / VH, 0.05, 200);
  const R = rnd(7);
  const std = (c, r = 0.8, m = 0) => new T.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const box = (w, h, d, m, x, y, z, p = scene) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); p.add(o); return o; };
  const cyl = (r1, r2, h, m, x, y, z, p = scene, sg = 12) => { const o = new T.Mesh(new T.CylinderGeometry(r1, r2, h, sg), m); o.position.set(x, y, z); p.add(o); return o; };

  // ── 길: 포석 차도 · 양쪽 보도(연석)
  const Z0 = 16, Z1 = -60, L = Z0 - Z1, ZC = (Z0 + Z1) / 2, ROAD = 22, WALK = 6;
  const cobble = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c9ccd4'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) for (let x = (y / 16 % 2) * 8; x < w; x += 16) { const v = 0.88 + Math.random() * 0.14; g.fillStyle = `rgb(${205 * v | 0},${208 * v | 0},${216 * v | 0})`;   /* 그림처럼 눈 덮인 듯 옅은 길 */ g.fillRect(x + 1, y + 1, 14, 14); } });
  cobble.wrapS = cobble.wrapT = T.RepeatWrapping; cobble.repeat.set(10, 26);
  const road = new T.Mesh(new T.PlaneGeometry(ROAD, L), new T.MeshStandardMaterial({ map: cobble, roughness: 0.75 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0, ZC); scene.add(road);
  for (const s of [-1, 1]) box(WALK, 0.18, L, std(0x7f776b, 0.9), s * (ROAD / 2 + WALK / 2), 0.09, ZC);

  // ── 오스만식 건물 줄(양쪽): 크림 돌 · 창 · 2층 · 5층 철 발코니 띠 · 어두운 망사르 지붕
  const facade = (seed) => canvasTex(512, 512, (g, w, h) => {
    const r = rnd(seed); g.fillStyle = `hsl(${36 + r() * 6},${22 + r() * 8}%,${74 + r() * 6}%)`; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 18) { g.fillStyle = 'rgba(80,60,40,.06)'; g.fillRect(0, y, w, 1); }
    const fl = 6, fh = h / fl;
    for (let f = 0; f < fl; f++) for (let c = 0; c < 6; c++) {
      const x = 22 + c * 82, y = f * fh + fh * 0.22;
      if (f === fl - 1) { g.fillStyle = '#5a4636'; g.fillRect(x - 6, y + fh * 0.1, 64, fh * 0.7); continue; }   // 1층 가게
      g.fillStyle = '#2c2a2e'; g.fillRect(x, y, 48, fh * 0.56); g.fillStyle = 'rgba(200,210,230,.25)'; g.fillRect(x + 4, y + 4, 18, fh * 0.2);
      g.fillStyle = '#e4dccb'; g.fillRect(x - 4, y - 6, 56, 5);
    }
    g.fillStyle = '#1e1d1f'; for (const f of [1, 4]) g.fillRect(0, f * fh + fh * 0.74, w, 5);   // 철 발코니
  });
  const zinc = std(0x4a4f57, 0.6, 0.3);
  for (const s of [-1, 1]) {
    const x0 = s * (ROAD / 2 + WALK + 4);
    for (let z = Z0 - 6, k = 0; z > Z1 + 2; z -= 12, k++) {
      const H = 17 + R() * 2.5, m = new T.MeshStandardMaterial({ map: facade(11 + k * 3 + (s > 0 ? 50 : 0)), roughness: 0.9 });
      const side = std(0xd8cfbc, 0.9), mats = [side, side, side, side, side, side]; mats[s < 0 ? 0 : 1] = m;   // 대로 쪽 면(+x 또는 -x)에만 정면
      box(8, H, 11.6, mats, x0, H / 2, z);
      const roof = new T.Mesh(new T.CylinderGeometry(0.01, 5.5, 4.2, 4, 1), zinc); roof.scale.set(1, 1, 1.45); roof.rotation.y = Math.PI / 4; roof.position.set(x0, H + 2.1, z); scene.add(roof);
    }
  }
  // ── 카페 테라스(출발점 오른쪽): 붉은 차양 · 둥근 탁자 · 의자
  const awn = box(0.15, 1.6, 9, std(0x8a2a22, 0.7), ROAD / 2 + WALK - 0.4, 3.4, 8); awn.rotation.z = -0.55;
  for (let i = 0; i < 6; i++) { const tx = ROAD / 2 + 1.4 + (i % 2) * 2, tz = 4.5 + Math.floor(i / 2) * 2.8; cyl(0.38, 0.38, 0.04, std(0x8f8a80, 0.5), tx, 0.78, tz, scene, 16); cyl(0.03, 0.05, 0.78, std(0x222222, 0.5, 0.5), tx, 0.39, tz); for (const a of [0, Math.PI]) { const c = box(0.4, 0.05, 0.4, std(0x3a2a1e), tx + Math.cos(a) * 0.7, 0.48, tz + Math.sin(a) * 0.7); c.userData = 1; } }

  // ── 가로수(겨울, 앙상) · 가스등
  const bark = std(0x3a302c, 1);
  // 겨울 플라타너스 줄(양쪽 보도, 4.5m 간격) — 줄기 · 굵은 가지 7 · 잔가지 2단. 모두 한 덩어리로 합쳐 그린다(폰 부담 줄임)
  const treeGeos = [], up = new T.Vector3(0, 1, 0), mtx = new T.Matrix4(), qt = new T.Quaternion(), one = new T.Vector3(1, 1, 1);
  const piece = (x, y, z, len, r, dir) => { const g = new T.CylinderGeometry(r * 0.55, r, len, 5); qt.setFromUnitVectors(up, dir); mtx.compose(new T.Vector3(x + dir.x * len / 2, y + dir.y * len / 2, z + dir.z * len / 2), qt, one); g.applyMatrix4(mtx); treeGeos.push(g); };
  const limb = (x0, y0, z0, len, r, yaw, tilt, depth) => {
    const dir = new T.Vector3(Math.sin(tilt) * Math.cos(yaw), Math.cos(tilt), Math.sin(tilt) * Math.sin(yaw));
    piece(x0, y0, z0, len, r, dir);
    if (depth > 0) for (let i = 0; i < 3; i++) limb(x0 + dir.x * len * 0.85, y0 + dir.y * len * 0.85, z0 + dir.z * len * 0.85, len * 0.62, r * 0.55, yaw + (R() - 0.5) * 1.8, tilt + (R() - 0.3) * 0.5, depth - 1);
  };
  for (const s of [-1, 1]) for (let z = Z0 - 1; z > Z1; z -= 4.5) {
    const x = s * (ROAD / 2 + 1.2) + (R() - 0.5) * 0.4; piece(x, 0, z, 7.5, 0.24, up);
    for (let b = 0; b < 7; b++) limb(x, 5 + R() * 2.4, z, 3 + R() * 2, 0.12, R() * Math.PI * 2, 0.35 + R() * 0.5, 2);
  }
  scene.add(new T.Mesh(mergeBufferGeometries(treeGeos), bark));
  const lampM = new T.MeshBasicMaterial({ color: 0xffe2a8 });
  for (const s of [-1, 1]) for (let z = Z0 - 5; z > Z1; z -= 9) { const x = s * (ROAD / 2 + 0.5); cyl(0.05, 0.08, 3.6, std(0x1d2420, 0.5, 0.6), x, 1.8, z); const l = new T.Mesh(new T.BoxGeometry(0.32, 0.45, 0.32), lampM); l.position.set(x, 3.8, z); scene.add(l); }

  // ── 모리스 칼럼(가벼운 도형): 초록 몸 · 포스터 띠 · 차양 · 비늘 돔 · 꼭지
  const posters = canvasTex(1024, 256, (g, w, h) => {
    const r = rnd(9), cols = ['#e8dcc0', '#d9b88a', '#c9d4b8', '#e2c4b0', '#f0e6cc', '#b8c8d8', '#d8a890'];
    g.fillStyle = '#d8ccb0'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w;) { const pw = 60 + r() * 90; let y = 0; while (y < h) { const ph = 50 + r() * 90; g.fillStyle = cols[(r() * cols.length) | 0]; g.fillRect(x + 2, y + 2, pw - 4, ph - 4); g.fillStyle = 'rgba(40,30,20,.55)'; for (let k = 0; k < 4; k++) g.fillRect(x + 8, y + 10 + k * 12, (pw - 16) * (0.4 + r() * 0.6), 4); y += ph; } x += pw; }
  });
  const green = std(0x1f3b2c, 0.5, 0.3), MC = new T.Group(); MC.position.set(ROAD / 2 + 2.4, 0.18, -4); scene.add(MC);
  cyl(0.85, 0.95, 0.6, green, 0, 0.3, 0, MC, 24); cyl(0.7, 0.7, 2.6, new T.MeshStandardMaterial({ map: posters, roughness: 0.9 }), 0, 1.9, 0, MC, 32);
  cyl(0.98, 0.85, 0.3, green, 0, 3.35, 0, MC, 24); const dome = new T.Mesh(new T.SphereGeometry(0.72, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), green); dome.scale.y = 1.25; dome.position.y = 3.5; MC.add(dome);
  cyl(0.03, 0.08, 0.7, std(0xb08a45, 0.4, 0.8), 0, 4.75, 0, MC);

  // ── 행인 · 마차
  const coat = [std(0x1c1a1c), std(0x2a2522), std(0x3a2e2a), std(0x2c3036)], skin = std(0xc9a58a);
  for (let i = 0; i < 320; i++) {
    const onWalk = R() < 0.45, s = R() < 0.5 ? -1 : 1, x = onWalk ? s * (ROAD / 2 + 1 + R() * (WALK - 2)) : (R() - 0.5) * (ROAD - 4), z = Z0 - 4 - R() * (L - 6);
    if (Math.hypot(x - (ROAD / 2 + 2.4), z + 4) < 1.5 || (x > ROAD / 2 - 2 && z > 2)) continue;   // 칼럼 · 출발점(카페 앞) 비움
    const p = new T.Group(); p.position.set(x, onWalk ? 0.18 : 0, z); scene.add(p);
    const c = coat[(R() * coat.length) | 0]; cyl(0.18, 0.28, 1.35, c, 0, 0.7, 0, p, 8); const hd = new T.Mesh(new T.SphereGeometry(0.12, 8, 6), skin); hd.position.y = 1.52; p.add(hd);
    if (R() < 0.6) cyl(0.1, 0.1, 0.22, std(0x111111), 0, 1.72, 0, p, 8);   // 실크 모자
  }
  for (const [x, z, ry] of [[-3.5, -8, 0], [4, -22, Math.PI], [-6, -30, 0]]) {
    const c = new T.Group(); c.position.set(x, 0, z); c.rotation.y = ry; scene.add(c);
    box(1.5, 1.3, 2.4, std(0x1d1b1e, 0.5, 0.2), 0, 1.35, 0, c); box(1.6, 0.08, 2.6, std(0x141214), 0, 2.05, 0, c);
    for (const wx of [-0.8, 0.8]) for (const wz of [-0.8, 0.9]) { const wh = cyl(0.5, 0.5, 0.06, std(0x2a2220), wx, 0.5, wz, c, 16); wh.rotation.z = Math.PI / 2; }
    box(0.8, 1.4, 1.8, std(0x5a4636), 0, 0.9, 2.6, c);   // 말
  }

  // ── 빛: 겨울 오후 — 옅은 하늘빛 + 낮은 해
  scene.add(new T.HemisphereLight(0xd8dcec, 0x5a4e44, 0.75));
  const sun = new T.DirectionalLight(0xffe6c8, 0.9); sun.position.set(-20, 18, -30); scene.add(sun);

  // ── 카메라: 카페 앞 보도 → 칼럼 옆을 지나 → 길가 건물 3층 발코니 높이로 천천히 올라 대로를 비스듬히 내려다봄(모네 〈카퓌신 대로〉 구도)
  //   그 자리에서 3D 화면이 그림으로 서서히 바뀐다(덮개가 걷히며 페이지 거리 그림이 드러남) — 그림판을 따로 비추지 않음
  const Start = new T.Vector3(ROAD / 2 + 3.2, 1.65, 11), StartL = new T.Vector3(ROAD / 2 + 1.2, 2.0, -6);
  const End = new T.Vector3(ROAD / 2 + WALK - 0.8, 15.5, 8.2), EndL = new T.Vector3(-7, -1.5, -26);   // 가로수 꼭대기 위 · 나무 사이 — 가지 속을 지나지 않게   // 오른쪽 건물 발코니 — 대로를 대각선으로 내려다봄(그림 구도)
  if (window.__ssEnd) { End.set(...window.__ssEnd.slice(0, 3)); EndL.set(...window.__ssEnd.slice(3)); }   // 점검용
  const P = new T.Vector3(), Lk = new T.Vector3();
  function pose(t) {
    const q = ease(seg(t, TL.dolly, TL.dollyD));
    P.lerpVectors(Start, End, q); P.y = Start.y + (End.y - Start.y) * Math.pow(q, 1.8);
    Lk.lerpVectors(StartL, EndL, Math.pow(q, 0.8));
    cam.position.copy(P); cam.lookAt(Lk);
  }
  // ── 끝 시점 투사: 끝 카메라에서 본 화면 좌표 → 페이지 거리 그림(.st-img: cover · 가로 50% · 세로 34%, 보정 필터 포함)의 같은 점 색
  //   3D 장면의 모든 면이 그 색을 받는다 → 끝 프레임에서 3D 화면 = 페이지 그림(픽셀 단위). 끝 직전에만 서서히 입히므로 움직임 중 일그러짐은 거의 안 보임
  const endCam = cam.clone(); endCam.position.copy(End); endCam.lookAt(EndL); endCam.updateMatrixWorld(); endCam.updateProjectionMatrix();
  const vp = new T.Matrix4().multiplyMatrices(endCam.projectionMatrix, endCam.matrixWorldInverse);
  const IW = 1440, IH = 1942;
  let rect = { x: 0, y: 0, w: VW, h: VW * IH / IW }, px = 0.5, py = 0.34;
  if (imgEl) {
    const r = imgEl.getBoundingClientRect(), cs = getComputedStyle(imgEl);
    const pp = (v, d) => { const m = /([\d.]+)%/.exec(v || ''); return m ? +m[1] / 100 : d; };
    px = pp(cs.backgroundPositionX, 0.5); py = pp(cs.backgroundPositionY, 0.34);
    const k = Math.max(r.width / IW, r.height / IH), w = IW * k, h = IH * k;
    rect = { x: r.left - hb.left + (r.width - w) * px, y: r.top - hb.top + (r.height - h) * py, w, h };
  }
  const ptex = new T.TextureLoader().load(new URL('../../booth/assets/img/morris_bg_capucines.jpg', import.meta.url).href, () => { ptexOk = true; if (FREEZE != null && !done) { draw(+FREEZE); window.__ssReady = true; } });
  let ptexOk = false;
  const projMat = new T.ShaderMaterial({
    uniforms: { map: { value: ptex }, vp: { value: vp }, view: { value: new T.Vector2(VW, VH) }, rect: { value: new T.Vector4(rect.x, rect.y, rect.w, rect.h) }, op: { value: 0 } },
    vertexShader: 'varying vec3 wp; void main(){ vec4 w = modelMatrix * vec4(position,1.0); wp = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform sampler2D map; uniform mat4 vp; uniform vec2 view; uniform vec4 rect; uniform float op; varying vec3 wp;
      vec3 hue(vec3 c, float a){ const vec3 k = vec3(0.57735); float ca = cos(a); return c*ca + cross(k,c)*sin(a) + k*dot(k,c)*(1.0-ca); }
      void main(){
        vec4 cl = vp * vec4(wp,1.0); vec2 n = cl.xy / cl.w;
        vec2 p = vec2((n.x*0.5+0.5)*view.x, (1.0-(n.y*0.5+0.5))*view.y);
        vec2 uv = vec2((p.x-rect.x)/rect.z, 1.0-(p.y-rect.y)/rect.w);
        vec3 c = texture2D(map, clamp(uv,0.0,1.0)).rgb;
        // 페이지 .st-img 필터: brightness(.82) saturate(.95) contrast(1.06) sepia(.12) hue-rotate(-10deg)
        c *= 0.82; float g = dot(c, vec3(0.2126,0.7152,0.0722)); c = mix(vec3(g), c, 0.95); c = (c-0.5)*1.06+0.5;
        vec3 sp = vec3(dot(c,vec3(.393,.769,.189)), dot(c,vec3(.349,.686,.168)), dot(c,vec3(.272,.534,.131))); c = mix(c, sp, 0.12);
        c = hue(c, radians(-10.0));
        gl_FragColor = vec4(clamp(c,0.0,1.0), op);
      }`,
    toneMapped: false, side: T.DoubleSide,
  });
  // 투사 화면은 따로 그려(rt) 화면 전체 판으로 섞는다 — 같은 장면에 반투명으로 겹쳐 그리면 기기마다 깨짐
  const rt = new T.WebGLRenderTarget(Math.round(VW * renderer.getPixelRatio()), Math.round(VH * renderer.getPixelRatio()));
  const quadMat = new T.ShaderMaterial({ uniforms: { map: { value: rt.texture }, opacity: { value: 0 } }, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D map; uniform float opacity; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(map, vUv).rgb, opacity); }' });   // 값 그대로(색 변환 없이)
  const quadScene = new T.Scene(), quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quadScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), quadMat));
  // 하늘판: 끝 시선 너머 — 하늘 자리도 그림을 받게
  const sky = new T.Mesh(new T.SphereGeometry(165, 32, 16), new T.MeshBasicMaterial({ color: FOG, fog: true, side: T.BackSide }));   // 모든 것 뒤를 감싸는 하늘 구(그림을 받음)
  sky.position.copy(End); scene.add(sky);
  scene.fog.far = Math.max(scene.fog.far, 170);
  const draw = (t) => {
    renderer.setRenderTarget(null); renderer.autoClear = true; renderer.render(scene, cam);
    const fb = new URLSearchParams(location.search).get('ssB');
    const b = ptexOk ? (fb != null ? +fb : ease(seg(t, TL.proj, TL.projD))) : 0;
    if (b > 0) {
      projMat.uniforms.op.value = 1; scene.overrideMaterial = projMat; const fg = scene.fog; scene.fog = null;
      renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(null);
      scene.overrideMaterial = null; scene.fog = fg;
      quadMat.uniforms.opacity.value = b; renderer.autoClear = false; renderer.render(quadScene, quadCam); renderer.autoClear = true;
    }
  };
  start();
  function start() {
    if (done) return;
    pose(FREEZE != null ? +FREEZE : 0); renderer.compile(scene, cam); draw(FREEZE != null ? +FREEZE : 0);
    if (FREEZE != null) { if (ptexOk) window.__ssReady = true; return; }
    const t0 = performance.now();
    const frame = (now) => {
      if (done) return;
      const t = (now - t0) / 1000 * SPEED;
      pose(t); draw(t);
      if (t >= TL.out) root.style.opacity = String(1 - seg(t, TL.out, TL.outD));
      if (t >= TL.out + TL.outD) return finish();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }
}
