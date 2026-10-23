// C3 화가의 아틀리에 — 이젤 뒤의 3D 환경 (three.js 0.147, c0·c1 과 같은 CDN)
//
// 화면의 칠하기 캔버스(DOM #stage)는 그대로 두고, 그 뒤에 진짜 3D 나무 이젤과 실사 360° 환경을 그린다.
//  · 캔버스 면은 카메라 화면과 평행 → 시차로 카메라가 움직여도 setViewOffset 로 DOM 캔버스와 픽셀 단위로 맞춘다(터치 좌표는 DOM 그대로).
//  · 아틀리에: 실제 화가 작업실 360° 사진을 어둡게 — 기름등(왼쪽 앞, 깜빡임)과 오른쪽 창빛, 창에서 비스듬히 드는 빛줄기, 그 안에서 반짝이는 먼지.
//  · 다 칠하면: 방이 창 쪽으로 돌아가며 빛이 번져 하얗게 → 그 빛이 물러나며 여름 들판(밀밭·나무·구름). 이젤은 제자리, 카메라는 천천히 물러나며 화각이 좁아진다(돌리 줌).
//  · 누르고 있으면 등불의 아틀리에로 0.5초에 걸쳐 돌아간다.
//
// 에셋(모두 CC0, Poly Haven — polyhaven.com/license):
//   img/c3env/studio.jpg, studio-env.jpg  ← HDRI "Artist Workshop" (Oliksiy Yakovlyev) 톤매핑 JPG 8K 에서 보이는 범위만 잘라 0.9배(경도 120–215°, 위도 +40…−62°)
//   img/c3env/meadow.jpg, meadow-env.jpg  ← HDRI "Evening Meadow" (Alexander Scholten) 톤매핑 JPG 8K 에서 잘라 0.9배(경도 38–128°, 위도 +40…−62°)
//   img/c3env/wood-*.jpg                  ← 텍스처 "Wood Table Worn" (Dimitrios Savva, Rico Cilliers) 1K diff/nor_gl/rough
//   *-env.jpg 는 512×256 전체 파노라마(조명용 PMREM), 보는 방향이 정면(-z)이 되도록 가로로 돌려 둠.
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const B = document.body, $ = (s) => document.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const studioEl = $('#studio'), glCanvas = $('#gl'), frameEl = $('#frame');
const IMG = 'img/c3env/';

// ── 장면 치수(미터). 캔버스는 뒤로 13° 기울어 있고, 카메라는 그 면에 수직으로 내려다본다
const TH = T.MathUtils.degToRad(13);
const CW = 1.0, CH = CW * 5 / 6;          // 캔버스(6:5) — DOM 과 같은 비율
const HC = 1.16;                          // 캔버스 가운데 높이
const D_IN = 1.75, D_OUT = 2.1;           // 카메라 거리: 아틀리에 / 들판(더 멀리 · 더 좁은 화각)
const X = new T.Vector3(1, 0, 0), U = new T.Vector3(0, Math.cos(TH), -Math.sin(TH)), N = new T.Vector3(0, Math.sin(TH), Math.cos(TH));
const C = new T.Vector3(0, HC, 0);
const L = (x, y, z) => C.clone().addScaledVector(X, x).addScaledVector(U, y).addScaledVector(N, z);
const yGround = (z) => (-HC - z * Math.sin(TH)) / Math.cos(TH);   // 기운 면 위에서 바닥(y=0)에 닿는 높이

// 사진 자른 범위(8192×4096 원본 픽셀 기준 u0,u1,v0,v1)와 정면 경도
const CROP_S = [2730 / 8192, 4892 / 8192, 1137 / 4096, 3458 / 4096], LON_S = 155;
const CROP_M = [864 / 8192, 2912 / 8192, 1137 / 4096, 3458 / 4096], LON_M = 90;

function fallback() { studioEl.classList.add('nogl'); window.__c3env = { ready: false, fallback: true }; dispatchEvent(new Event('c3env-ready')); }

let renderer;
try {
  renderer = new T.WebGLRenderer({ canvas: glCanvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) { renderer = null; }
if (!renderer) fallback(); else start();

function start() {
  const DPR = Math.min(2, devicePixelRatio || 1) * ((navigator.hardwareConcurrency || 8) <= 4 ? 0.8 : 1);
  renderer.setPixelRatio(DPR);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.physicallyCorrectLights = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.setClearColor(0x0b0907, 1);

  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(60, 1, 0.05, 80);
  const loader = new T.TextureLoader();
  const load = (u) => new Promise((res, rej) => loader.load(IMG + u, res, undefined, rej));

  // ── 배경: 카메라를 감싸는 구 하나. 방향 → 잘라 둔 파노라마 좌표. 두 장(아틀리에·들판)을 셰이더 안에서 섞고 빛을 입힌다
  const bgU = {
    tS: { value: null }, tM: { value: null },
    cS: { value: new T.Vector4(...CROP_S) }, cM: { value: new T.Vector4(...CROP_M) },
    lonS: { value: LON_S }, lonM: { value: LON_M }, yawS: { value: 0 }, yawM: { value: 0 },
    uOut: { value: 0 }, uLamp: { value: 0 }, uWin: { value: 0 }, uOver: { value: 0 }, uFlick: { value: 1 }, uLeak: { value: 0 }, uTime: { value: 0 },
  };
  const bg = new T.Mesh(new T.SphereGeometry(10, 64, 32), new T.ShaderMaterial({
    uniforms: bgU, side: T.BackSide, depthWrite: false, depthTest: false,
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tS, tM; uniform vec4 cS, cM; uniform float lonS, lonM, yawS, yawM, uOut, uLamp, uWin, uOver, uFlick, uLeak, uTime;
      varying vec3 vDir;
      float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.1 + 3.7) * 0.3 + vn(p * 4.3 - 1.9) * 0.15; }
      vec3 env(sampler2D t, vec4 c, float lon0, float az, float el, float bias) {
        float u = ((lon0 + az) / 360.0 - c.x) / (c.y - c.x);
        float v = ((90.0 - el) / 180.0 - c.z) / (c.w - c.z);
        return texture2D(t, vec2(u, 1.0 - v), bias).rgb;
      }
      vec3 tone(vec3 x) { return (1.0 - exp(-x * 1.35)) / (1.0 - exp(-1.35)); }
      vec3 knee(vec3 x) { return mix(x, 0.8 + 0.2 * (1.0 - exp(-(x - 0.8) / 0.2)), step(0.8, x)); }   // 중간톤은 그대로, 밝은 곳만 부드럽게
      void main() {
        vec3 d = normalize(vDir);
        float az = degrees(atan(d.x, -d.z)), el = degrees(asin(clamp(d.y, -1.0, 1.0)));
        vec3 col = vec3(0.0);
        if (uOut < 0.999) {
          // 아틀리에 — 사진을 선형으로 바꿔 거의 꺼진 방에 등불·창빛만 얹는다
          float a = az + yawS;
          vec3 s = env(tS, cS, lonS, a, el, 0.6); vec3 sl = s * s;
          float lum = dot(sl, vec3(0.2126, 0.7152, 0.0722));
          float dWin = length(vec2(a - 31.0, (el - 13.0) * 1.25));
          float glass = smoothstep(0.30, 0.72, lum) * smoothstep(46.0, 20.0, dWin);
          float spill = exp(-pow(dWin / 42.0, 2.0));
          float pool = exp(-pow(length(vec2(a + 12.0, (el + 6.0) * 1.15)) / 26.0, 2.0));
          float floorPool = exp(-pow(length(vec2((a + 4.0) / 30.0, (el + 40.0) / 13.0)), 2.0));
          float far = exp(-pow(length(vec2(a + 30.0, el - 5.0)) / 60.0, 2.0));
          float up = 1.0 - 0.65 * smoothstep(4.0, 30.0, el);          // 등불은 위로 갈수록 약하다(천장 쪽은 어둡게)
          vec3 warm = vec3(1.0, 0.58, 0.27);
          float wake = max(uLamp, uWin * 0.8);                          // 들어가기 전엔 거의 깜깜
          vec3 lit = sl * 0.010 * (0.15 + 0.85 * wake)
                   + sl * uLamp * uFlick * (0.05 * far + 0.78 * pool + 0.6 * floorPool) * up * warm
                   + sl * uWin * (0.02 + 0.32 * spill) * vec3(0.96, 0.96, 1.0)
                   + sl * glass * uWin * 2.3 * vec3(1.0, 0.97, 0.9)
                   + sl * uWin * 0.9 * exp(-pow((a + 24.0) / 15.0, 2.0) - pow((el + 46.0) / 8.0, 2.0)) * vec3(1.0, 0.9, 0.74);   // 창빛이 닿는 왼쪽 앞 바닥
          col = tone(lit * 1.8);
          col = sqrt(col);
        }
        if (uOut > 0.001) {
          // 들판 — 여름빛: 채도 조금, 하이라이트는 따뜻하게. 완성 직후엔 과노출에서 내려앉는다
          vec3 m = env(tM, cM, lonM, az + yawM, el, 0.2);
          float blu = smoothstep(-1.0, 8.0, el) * smoothstep(0.03, 0.14, m.b - m.r);
          m = mix(m, m * vec3(0.72, 0.87, 1.0), blu);                     // 옅은 하늘을 여름 하늘색으로(구름의 흰빛은 남긴다)
          vec3 ml = m * m;
          float lum = dot(ml, vec3(0.2126, 0.7152, 0.0722));
          ml = max(mix(vec3(lum), ml, 1.18), 0.0) * vec3(1.05, 1.0, 0.9);
          float sky = smoothstep(-1.0, 8.0, el);
          ml *= (1.0 + 0.16 * (1.0 - sky)) * mix(vec3(1.06, 1.02, 0.9), vec3(1.0), sky);   // 풀은 조금 밝고 따뜻하게
          // 들판 위로 구름 그림자가 천천히 지나가고, 가까운 풀에는 바람결(밝기만 — 사진을 휘지 않는다)
          if (el < 0.0) {
            float dist = min(60.0, 1.6 / max(tan(radians(-el)), 0.02));
            float azr = radians(az + yawM);
            vec2 g = vec2(sin(azr), cos(azr)) * dist;
            float cs = fbm(g * 0.07 + vec2(uTime * 0.16, uTime * 0.05));
            float shade = mix(0.74, 1.06, smoothstep(0.32, 0.62, cs));
            float gust = sin(g.x * 0.9 + g.y * 0.35 - uTime * 1.9 + fbm(g * 0.3) * 4.0);
            float near = smoothstep(14.0, 3.0, dist);
            ml *= mix(1.0, shade, smoothstep(0.0, -3.0, el)) * (1.0 + 0.07 * gust * near);
          }
          float leak = exp(-pow(length(vec2(az - 46.0, el - 26.0)) / 34.0, 2.0));
          ml += vec3(1.0, 0.82, 0.55) * leak * 0.35 * uLeak;          // 오른쪽 위에서 드는 해
          ml *= 1.1 + uOver * 6.0;
          vec3 mc = sqrt(knee(ml));
          col = mix(col, mc, uOut);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  bg.renderOrder = -10; bg.frustumCulled = false;
  scene.add(bg);

  // ── 이젤: 둥근 모서리 각재 + 낡은 나무 PBR. 앞다리 둘·가운데 기둥·뒷다리·받침(트레이)·위 고정쇠·아래 가로대
  const woodMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.3 });
  const brass = new T.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.45, metalness: 0.85, envMapIntensity: 0.6 });   // 쇠 나비볼트
  const linen = new T.MeshStandardMaterial({ color: 0xd9ccb0, roughness: 0.95, envMapIntensity: 0.3 });
  const canvasFront = new T.MeshStandardMaterial({ color: 0x3a3026, roughness: 0.9 });
  const easel = new T.Group(); scene.add(easel);
  // 나무결이 긴 축을 따라 흐르도록 상자마다 UV 를 미터 단위로 다시 깐다(텍스처 한 장 = 0.55m)
  function woodUV(geo, w, h, d, seed) {
    const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
    const long = h >= w && h >= d ? 1 : (w >= d ? 0 : 2);
    const ox = (seed * 0.37) % 1, oy = (seed * 0.61) % 1;
    for (let i = 0; i < p.count; i++) {
      const v = [p.getX(i), p.getY(i), p.getZ(i)], nn = [Math.abs(n.getX(i)), Math.abs(n.getY(i)), Math.abs(n.getZ(i))];
      const face = nn[0] > nn[1] && nn[0] > nn[2] ? 0 : (nn[1] > nn[2] ? 1 : 2);
      const axes = [0, 1, 2].filter((a) => a !== face);
      const across = axes[0] === long ? axes[1] : axes[0];
      uv.setXY(i, v[long] / 0.55 + ox, v[across] / 0.55 + oy);
    }
    uv.needsUpdate = true;
  }
  let seed = 1;
  function bar(a, b, w, d, mat = woodMat, r = 0.006) {
    const len = a.distanceTo(b);
    const g = new RoundedBoxGeometry(w, len, d, 2, Math.min(r, w / 2 - 0.001, d / 2 - 0.001));
    if (mat === woodMat) woodUV(g, w, len, d, seed++);
    const m = new T.Mesh(g, mat);
    const yA = b.clone().sub(a).normalize();
    let zA = N.clone().sub(yA.clone().multiplyScalar(N.dot(yA)));
    if (zA.lengthSq() < 1e-6) zA = new T.Vector3(0, 0, 1); zA.normalize();
    const xA = new T.Vector3().crossVectors(yA, zA);
    m.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(xA, yA, zA));
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.castShadow = true; m.receiveShadow = true;
    easel.add(m); return m;
  }
  // 기운 면 기준 상자(가로 w · 세로 h · 두께 d)
  function block(cx, cy, cz, w, h, d, mat = woodMat, r = 0.005) {
    const g = new RoundedBoxGeometry(w, h, d, 2, r);
    if (mat === woodMat) woodUV(g, w, h, d, seed++);
    const m = new T.Mesh(g, mat);
    m.position.copy(L(cx, cy, cz)); m.rotation.x = -TH;
    m.castShadow = true; m.receiveShadow = true;
    easel.add(m); return m;
  }
  // 기둥 높이: 캔버스 위로 제목 아래까지만(제목 글자 위로 이젤이 지나가지 않게) — 처음 배치에서 한 번 잰다
  const yTop = (() => {
    const hd = document.querySelector('.room .role-hd'), fr = frameEl.getBoundingClientRect();
    if (!hd || !fr.width) return CH / 2 + 0.4;
    const room = (fr.top - hd.getBoundingClientRect().bottom - 6) / (fr.width / CW);
    return CH / 2 + Math.min(0.5, Math.max(0.22, room));
  })();
  // 캔버스(틀에 씌운 아마천) — 앞면은 DOM 그림이 덮는다. 옆면만 보인다
  {
    const g = new T.BoxGeometry(CW, CH, 0.024);
    const m = new T.Mesh(g, [linen, linen, linen, linen, canvasFront, linen]);
    m.position.copy(L(0, 0, -0.012)); m.rotation.x = -TH; m.castShadow = true; m.receiveShadow = true; easel.add(m);
  }
  // 가운데 기둥
  const zM = -0.024 - 0.019;
  bar(L(0, yGround(zM) + 0.36, zM), L(0, yTop, zM), 0.056, 0.036);
  block(0, yTop + 0.012, zM, 0.07, 0.024, 0.046);                       // 기둥 머리
  // 앞다리 둘
  const zL = zM - 0.036;
  const footX = 0.47, topX = 0.05, yF = yGround(zL);
  bar(L(-footX, yF, zL), L(-topX, yTop - 0.03, zL), 0.044, 0.034);
  bar(L(footX, yF, zL), L(topX, yTop - 0.03, zL), 0.044, 0.034);
  // 아래 가로대 (다리 사이)
  const yBr = yF + 0.4, k = (yBr - yF) / (yTop - 0.03 - yF), xBr = footX + (topX - footX) * k;
  bar(L(-xBr - 0.02, yBr, zL + 0.034), L(xBr + 0.02, yBr, zL + 0.034), 0.034, 0.024);
  // 받침(트레이): 캔버스 아래 — 기둥에 붙은 받침대 + 앞으로 나온 선반 + 작은 나무 손잡이
  const yT = -CH / 2 - 0.021;
  block(0, yT, 0.004, 1.05, 0.042, 0.112);
  block(0, yT - 0.085, zM + 0.004, 0.11, 0.13, 0.05);
  {
    const kn = new T.Mesh(new T.CylinderGeometry(0.016, 0.019, 0.03, 20), woodMat);
    kn.position.copy(L(0, yT - 0.1, zM + 0.04)); kn.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), N); kn.castShadow = true; easel.add(kn);
  }
  for (const s of [-1, 1]) bar(L(s * 0.16, yT - 0.02, -0.03), L(s * 0.035, yT - 0.2, zM), 0.026, 0.02);   // 선반 버팀대
  // 위 고정쇠 — 캔버스 윗변을 누르는 나무토막 + 놋쇠 나비볼트
  const yC = CH / 2 + 0.03;
  block(0, yC, -0.006, 0.14, 0.06, 0.098);
  block(0, yC + 0.05, zM, 0.07, 0.06, 0.05);
  {
    const kn = new T.Mesh(new T.CylinderGeometry(0.011, 0.011, 0.03, 16), brass);
    kn.position.copy(L(0, yC + 0.004, 0.056)); kn.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), N); easel.add(kn);
    const wing = new T.Mesh(new RoundedBoxGeometry(0.055, 0.012, 0.005, 2, 0.002), brass);
    wing.position.copy(L(0, yC + 0.004, 0.072)); wing.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(X, U, N)).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), 0.45)); easel.add(wing);
  }
  // 뒷다리 — 기둥 위쪽 경첩에서 뒤로 뻗어 바닥까지
  const hinge = L(0, yTop - 0.09, zM - 0.04);
  const rearFoot = new T.Vector3(0, 0, hinge.z - 0.92);
  bar(hinge, rearFoot, 0.044, 0.034);
  // 뒷다리와 기둥을 잇는 가는 받침대
  const mid = hinge.clone().lerp(rearFoot, 0.62);
  bar(mid, L(0, yBr + 0.05, zM - 0.02), 0.022, 0.016);

  // 바닥 그림자 받이(사진 바닥 위에 이젤 그림자만)
  const shadowMat = new T.ShadowMaterial({ opacity: 0.55, transparent: true, depthWrite: false });
  const floor = new T.Mesh(new T.PlaneGeometry(14, 14), shadowMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001; floor.receiveShadow = true; floor.renderOrder = -5;
  scene.add(floor);

  // ── 빛: 기름등(왼쪽 앞 · 그림자), 창빛(오른쪽), 해(오른쪽 뒤 위 · 그림자), 하늘 반사
  const lamp = new T.SpotLight(0xffa458, 0, 0, 1.0, 0.9, 2);
  lamp.position.set(-1.35, 1.9, 1.35); lamp.target.position.copy(L(0, -0.2, 0)); scene.add(lamp, lamp.target);
  lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.0015; lamp.shadow.normalBias = 0.01; lamp.shadow.radius = 4;
  lamp.shadow.camera.near = 0.3; lamp.shadow.camera.far = 8;
  const win = new T.DirectionalLight(0xfff0dc, 0);
  win.position.set(3.2, 2.2, -0.6); win.target.position.copy(C); scene.add(win, win.target);
  const sun = new T.DirectionalLight(0xfff0d0, 0);
  {
    const az = T.MathUtils.degToRad(118), el = T.MathUtils.degToRad(26);
    sun.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).multiplyScalar(6).add(new T.Vector3(0, 0, 0));
  }
  sun.target.position.set(0, 0.6, -0.2); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.01; sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -2.2, right: 2.2, top: 2.6, bottom: -1.6, near: 0.5, far: 14 });
  const hemi = new T.HemisphereLight(0xcfe0f5, 0x4d6a34, 0); scene.add(hemi);

  // ── 창에서 드는 빛줄기 — 세 겹의 반투명 띠(깊이가 달라 시차가 생긴다), 결이 천천히 흐른다
  const camRest = C.clone().addScaledVector(N, D_IN);
  const winPt = camRest.clone().add(new T.Vector3(Math.sin(0.54) * Math.cos(0.24), Math.sin(0.24), -Math.cos(0.54) * Math.cos(0.24)).multiplyScalar(3.4));
  const beamU = { uA: { value: 0 }, uTime: { value: 0 } };
  const beamMat = new T.ShaderMaterial({
    uniforms: beamU, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uA, uTime; varying vec2 vUv;
      void main() {
        float across = abs(vUv.y - 0.5) * 2.0;
        float soft = pow(max(0.0, 1.0 - across), 1.8);
        float along = vUv.x;
        float fall = smoothstep(0.0, 0.12, along) * (1.0 - smoothstep(0.45, 1.0, along));
        float streak = 0.72 + 0.28 * sin(vUv.y * 23.0 + sin(vUv.x * 5.0 + uTime * 0.13) * 2.0 + uTime * 0.05);
        float a = uA * soft * fall * streak;
        gl_FragColor = vec4(vec3(1.0, 0.9, 0.74) * a, 1.0);
      }`,
  });
  const beams = [];
  [[-1.1, 0.95, 0.2], [-1.7, 1.3, 0.13], [-0.75, 0.6, 0.16]].forEach(([dz, w, a]) => {
    const target = new T.Vector3(-1.5 - dz * 0.3, 0.0, 0.75 + dz * 0.5);
    const from = winPt.clone();
    const len = from.distanceTo(target);
    const m = new T.Mesh(new T.PlaneGeometry(len, w), beamMat.clone());
    m.material.uniforms = { uA: { value: 0 }, uTime: beamU.uTime };
    const xA = target.clone().sub(from).normalize();
    const mid = from.clone().add(target).multiplyScalar(0.5);
    const v = camRest.clone().sub(mid).normalize();
    const zA = v.sub(xA.clone().multiplyScalar(v.dot(xA))).normalize();
    const yA = new T.Vector3().crossVectors(zA, xA);
    m.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(xA, yA, zA));
    m.position.copy(mid); m.renderOrder = 2; m.userData.a = a;
    scene.add(m); beams.push(m);
  });

  // ── 먼지(방) / 꽃가루·빛 알갱이(들판) — 같은 점들. 빛줄기 안에 들어오면 반짝인다
  const NP = 220;
  const pos = new Float32Array(NP * 3), sd = new Float32Array(NP * 4);
  for (let i = 0; i < NP; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 3.2; pos[i * 3 + 1] = 0.15 + Math.random() * 2.5; pos[i * 3 + 2] = -2.4 + Math.random() * 3.2;
    sd.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
  const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos, 3)); pg.setAttribute('seed', new T.BufferAttribute(sd, 4));
  const pU = { uTime: { value: 0 }, uLamp: { value: 0 }, uBeam: { value: 0 }, uOut: { value: 0 }, uPx: { value: 6 * DPR },
    bA: { value: winPt.clone() }, bB: { value: new T.Vector3(-1.5, 0.0, 0.5) }, bW: { value: 0.7 } };
  const dust = new T.Points(pg, new T.ShaderMaterial({
    uniforms: pU, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec4 seed; uniform float uTime, uLamp, uBeam, uOut, uPx; uniform vec3 bA, bB; uniform float bW;
      varying float vA; varying vec3 vC;
      void main() {
        float t = uTime;
        vec3 p = position;
        p.x += sin(t * (0.05 + 0.08 * seed.x) + seed.y * 6.28) * 0.18;
        p.y += sin(t * (0.04 + 0.06 * seed.w) + seed.x * 6.28) * 0.14 + uOut * (mod(t * 0.02 * (0.5 + seed.z) + seed.w * 3.0, 3.0) - 1.5) * 0.6;
        p.z += cos(t * (0.04 + 0.07 * seed.y) + seed.z * 6.28) * 0.16;
        vec3 ab = bB - bA; float h = clamp(dot(p - bA, ab) / dot(ab, ab), 0.0, 1.0);
        float inB = smoothstep(bW, bW * 0.25, length(p - bA - ab * h)) * uBeam;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uPx * (0.5 + seed.x * 1.1) * (1.0 + uOut * 0.7) / -mv.z;
        float tw = 0.55 + 0.45 * sin(t * (0.8 + seed.z * 1.6) + seed.w * 40.0);
        vA = ((0.16 * uLamp + 1.4 * inB) * (1.0 - uOut) + uOut * 0.55 * step(0.5, seed.y)) * tw;
        vC = mix(vec3(1.0, 0.72, 0.42), vec3(1.0, 0.95, 0.84), inB);
        vC = mix(vC, vec3(1.0, 0.96, 0.8), uOut);
      }`,
    fragmentShader: `varying float vA; varying vec3 vC; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = exp(-r * r * 5.0) * vA; gl_FragColor = vec4(vC * a, 1.0); }`,
  }));
  dust.frustumCulled = false; dust.renderOrder = 3; scene.add(dust);

  // ── 화면 위 덧칠: 비네트 · 필름 결 · 완성 때 번지는 빛(창 쪽 → 화면 전체 → 해 쪽으로 물러남)
  const ovU = { uRes: { value: new T.Vector2(1, 1) }, uVig: { value: 1 }, uBurn: { value: 0 }, uTime: { value: 0 }, uWarm: { value: 0 }, uSun: { value: 0 }, uRays: { value: 0 }, uOutK: { value: 0 } };
  const ovGeo = new T.BufferGeometry(); ovGeo.setAttribute('position', new T.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const overlay = new T.Mesh(ovGeo, new T.ShaderMaterial({
    uniforms: ovU, transparent: true, depthTest: false, depthWrite: false,
    blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, blendEquation: T.AddEquation,
    vertexShader: `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec2 uRes; uniform float uVig, uBurn, uTime, uWarm, uSun, uRays, uOutK;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float n1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h(vec2(i, 3.1)), h(vec2(i + 1.0, 3.1)), f); }
      void main() {
        vec2 p = gl_FragCoord.xy / uRes; float asp = uRes.y / uRes.x;
        vec2 q = (p - 0.5) * vec2(1.0, asp * 0.75);
        float vig = 1.0 - uVig * smoothstep(0.25, 0.95, length(q) * 1.25);
        float g = h(p * uRes + fract(uTime * 7.3) * 91.0);
        float mulv = vig * (1.0 + (g - 0.5) * 0.06);
        // 빛 번짐: 창(오른쪽 위)에서 시작해 흰빛으로 화면을 덮는다. 가장자리는 구름처럼
        vec2 o = mix(vec2(1.15, 0.64), vec2(1.1, 1.08), uOutK);
        float dist = length((p - o) * vec2(1.0, asp * 0.6));
        float nz = n2(p * vec2(3.0, 3.0 * asp) + uTime * 0.25) * 0.6 + n2(p * vec2(9.0, 9.0 * asp) - uTime * 0.4) * 0.4;
        float edge = uBurn * 1.75;
        float white = smoothstep(edge, edge - 0.6, dist + (nz - 0.5) * mix(0.3, 0.16, uOutK)) * smoothstep(0.0, 0.05, uBurn);
        vec3 add = vec3(1.0, 0.62, 0.3) * uWarm * 0.10 * exp(-pow(length((p - vec2(-0.1, 0.62)) * vec2(1.0, asp * 0.6)) / 0.55, 2.0));
        add += vec3(1.0, 0.86, 0.6) * uSun * 0.3 * exp(-pow(length((p - vec2(1.1, 1.02)) * vec2(1.0, asp * 0.6)) / 0.6, 2.0));
        // 창에서 드는 빛살 — 오른쪽 위 바깥(창)에서 왼쪽 아래로 부채꼴로 퍼진다. 결이 아주 천천히 흐른다
        vec2 rv = (p - vec2(1.9, 1.35)) * vec2(1.0, asp);
        float rd = length(rv), ang = atan(rv.y, rv.x);
        float cone = smoothstep(0.86, 0.985, dot(rv / max(rd, 1e-4), normalize(vec2(-0.9, -0.62 * asp))));
        float rays = n1(ang * 30.0 + uTime * 0.05) * 0.65 + n1(ang * 71.0 - uTime * 0.07) * 0.35;
        rays = (0.25 + pow(rays, 1.6)) * cone * smoothstep(2.9, 1.4, rd);
        add += vec3(1.0, 0.88, 0.68) * rays * uRays * 0.2;
        vec3 W = vec3(1.0, 0.975, 0.93);
        float fringe = smoothstep(edge + 0.55, edge - 0.1, dist) * (1.0 - white) * smoothstep(0.0, 0.1, uBurn);
        add += vec3(1.0, 0.86, 0.62) * fringe * 0.55;
        float keep = mulv * (1.0 - white);
        gl_FragColor = vec4(add * (1.0 - white) + W * white, 1.0 - keep);
      }`,
  }));
  overlay.frustumCulled = false; overlay.renderOrder = 100; scene.add(overlay);

  // ── 텍스처·조명용 환경
  const pmrem = new T.PMREMGenerator(renderer);
  let envS = null, envM = null;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  Promise.all([load('studio.jpg'), load('meadow.jpg'), load('wood-diff.jpg'), load('wood-nor.jpg'), load('wood-rough.jpg'), load('studio-env.jpg'), load('meadow-env.jpg')])
    .then(([ts, tm, wd, wn, wr, es, em]) => {
      for (const t of [ts, tm]) { t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.anisotropy = 1; }
      bgU.tS.value = ts; bgU.tM.value = tm;
      wd.encoding = T.sRGBEncoding;
      for (const t of [wd, wn, wr]) { t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = Math.min(8, maxAniso); }
      Object.assign(woodMat, { map: wd, normalMap: wn, roughnessMap: wr, normalScale: new T.Vector2(0.8, 0.8) }); woodMat.needsUpdate = true;
      for (const t of [es, em]) { t.mapping = T.EquirectangularReflectionMapping; t.encoding = T.sRGBEncoding; }
      envS = pmrem.fromEquirectangular(es).texture; envM = pmrem.fromEquirectangular(em).texture;
      scene.environment = envS;
      ready = true; studioEl.classList.add('ready'); dispatchEvent(new Event('c3env-ready'));
    })
    .catch((e) => { console.error(e); fallback(); renderer.dispose(); renderer = null; });

  // ── 상태: 들어가기(s-lamp · s-win · s-beam) / 완성(flooding → lit) / 누르고 비교(held)
  const S = { lamp: 0, win: 0, beam: 0, out: 0, burn: 0, over: 0, yawS: 0, yawM: 0, dk: 0, leak: 0 };
  let ready = false, cine = null, cineDone = false;
  const ease = (x) => x * x * (3 - 2 * x), eIn = (x) => x * x * x, eOut = (x) => 1 - Math.pow(1 - x, 3);
  const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
  let fl = 1, flT = 1;
  // 기기 기울임(권한 없이 오는 경우만) — 시차를 조금 더한다
  let tiltX = 0, tiltY = 0, tX = 0, tY = 0;
  addEventListener('deviceorientation', (e) => { if (e.gamma == null) return; tX = Math.max(-1, Math.min(1, e.gamma / 25)); tY = Math.max(-1, Math.min(1, (e.beta - 50) / 25)); }, { passive: true });

  function update(now, dt) {
    const c = B.classList;
    // 등불 깜빡임 — DOM 캔버스 위 등불빛(--fl)과 같이 흔들린다
    if (!REDUCED) { if (Math.random() < 0.08) flT = 0.8 + Math.random() * 0.2; fl += (flT - fl) * Math.min(1, dt * 14); } else fl = 0.92;
    B.style.setProperty('--fl', fl.toFixed(3));
    if (!cine && c.contains('flooding')) cine = { t0: now };
    const held = c.contains('held');
    // 목표값
    const tg = { lamp: c.contains('s-lamp') ? 1 : 0, win: c.contains('s-win') ? 1 : 0, beam: c.contains('s-beam') ? 1 : 0, out: 0, yawS: 0, yawM: 0, dk: 0, burn: 0, over: 0, leak: 0 };
    if (cineDone) Object.assign(tg, held ? { out: 0, lamp: 1, win: 0.3, beam: 0.25, dk: 0 } : { out: 1, lamp: 0, win: 0, beam: 0, dk: 1, leak: 1 });
    if (cine && !cineDone) {
      const t = (now - cine.t0) / 1000;
      if (REDUCED) {
        const k = seg(t, 0, 0.6);
        Object.assign(S, { out: k, lamp: 1 - k, win: 1 - k, beam: 1 - k, burn: 0, over: 0, yawS: 0, yawM: 0, dk: k, leak: k });
        if (k >= 1) cineDone = true;
      } else {
        // 0–1.2s 창 쪽으로 돌며 빛이 번진다 → 1.2s 하얗게 덮인 순간 바깥으로 → 1.2–4.2s 빛이 해 쪽으로 물러나며 들판이 내려앉는다
        const sw = 1.2;
        S.burn = t < sw ? eIn(seg(t, 0.05, sw)) : 1 - eOut(seg(t, sw + 0.1, sw + 1.9));
        S.yawS = 17 * ease(seg(t, 0, sw + 0.2));
        S.win = 1 + 1.4 * seg(t, 0, sw);
        S.lamp = 1 - 0.5 * seg(t, 0, sw);
        S.beam = 1 + 0.6 * seg(t, 0, sw);
        S.out = t < sw ? 0 : 1;
        S.over = t < sw ? 0 : 1 - eOut(seg(t, sw, sw + 2.6));
        S.yawM = t < sw ? -13 : -13 * (1 - eOut(seg(t, sw, sw + 3.2)));
        S.dk = t < sw ? 0.25 * ease(seg(t, 0, sw)) : 0.25 + 0.75 * eOut(seg(t, sw, sw + 3.0));
        S.leak = t < sw ? 0 : eOut(seg(t, sw + 0.4, sw + 3));
        if (t > sw + 3.3) cineDone = true;
      }
    } else {
      // 부드럽게 따라간다(들어가기 · 누르고 비교)
      const rate = { lamp: 2.2, win: 1.6, beam: 1.4, out: held || c.contains('lit') ? 5.5 : 3, yawS: 3, yawM: 3, dk: 4, burn: 4, over: 4, leak: 3 };
      for (const k in tg) S[k] += (tg[k] - S[k]) * Math.min(1, dt * (REDUCED ? 12 : rate[k]));
    }
  }

  const camPos = new T.Vector3(), look = new T.Vector3();
  let last = performance.now(), t0 = last, fps = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!renderer || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; fps = fps * 0.95 + (dt > 0 ? 1 / dt : 60) * 0.05;
    update(now, dt);
    const t = REDUCED ? 0 : (now - t0) / 1000;
    // 크기·DOM 캔버스 위치
    const sr = studioEl.getBoundingClientRect(), fr = frameEl.getBoundingClientRect();
    const W = Math.max(1, sr.width), H = Math.max(1, sr.height);
    const cv = renderer.domElement;
    if (cv.width !== Math.round(W * DPR) || cv.height !== Math.round(H * DPR)) renderer.setSize(W, H, false);
    if (!fr.width) { return; }
    // 시차: 느린 숨쉬기 + 기울임
    tiltX += (tX - tiltX) * Math.min(1, dt * 3); tiltY += (tY - tiltY) * Math.min(1, dt * 3);
    const px = REDUCED ? 0 : 0.034 * Math.sin(t * 0.21) + 0.012 * Math.sin(t * 0.53 + 1.3) + tiltX * 0.05;
    const py = REDUCED ? 0 : 0.016 * Math.sin(t * 0.17 + 0.6) + 0.006 * Math.sin(t * 0.47) - tiltY * 0.03;
    const d = D_IN + (D_OUT - D_IN) * S.dk;
    camPos.copy(C).addScaledVector(N, d).addScaledVector(X, px).addScaledVector(U, py);
    cam.position.copy(camPos); cam.up.copy(U); cam.lookAt(look.copy(camPos).sub(N));
    const k = fr.width / CW;
    cam.fov = T.MathUtils.radToDeg(2 * Math.atan(H / (2 * k * d)));
    cam.aspect = W / H;
    const cx = fr.left - sr.left + fr.width / 2, cy = fr.top - sr.top + fr.height / 2;
    cam.setViewOffset(W, H, (W / 2 - px * k) - cx, (H / 2 + py * k) - cy, W, H);
    cam.updateProjectionMatrix();
    bg.position.copy(camPos);
    // 빛
    const out = S.out, inn = 1 - out;
    bgU.yawS.value = S.yawS; bgU.yawM.value = S.yawM; bgU.uOut.value = out; bgU.uLamp.value = S.lamp; bgU.uWin.value = S.win; bgU.uOver.value = S.over; bgU.uFlick.value = fl; bgU.uLeak.value = S.leak; bgU.uTime.value = t;
    lamp.intensity = 26 * S.lamp * fl * inn;
    win.intensity = 1.1 * S.win * inn;
    sun.intensity = 3.4 * out * (1 + S.over * 2);
    hemi.intensity = 1.1 * out;
    woodMat.envMapIntensity = inn * (0.06 + 0.12 * S.win) * Math.max(S.lamp, S.win) + out * 0.9;
    linen.envMapIntensity = woodMat.envMapIntensity; brass.envMapIntensity = woodMat.envMapIntensity * 1.5;
    if (envS && envM) scene.environment = out > 0.5 ? envM : envS;
    shadowMat.opacity = 0.5 * Math.max(S.lamp * inn, out);
    const bt = beamU.uTime; bt.value = t;
    beams.forEach((m) => { m.material.uniforms.uA.value = m.userData.a * S.beam * inn * (0.92 + 0.08 * fl); });
    pU.uTime.value = t; pU.uLamp.value = S.lamp * fl; pU.uBeam.value = Math.min(1.2, S.beam) * inn; pU.uOut.value = out; pU.uPx.value = 6 * DPR * (H / 844) * 1.2;
    ovU.uRes.value.set(W * DPR, H * DPR); ovU.uBurn.value = S.burn; ovU.uTime.value = t; ovU.uVig.value = 0.85 * inn + 0.22 * out; ovU.uWarm.value = S.lamp * fl * inn; ovU.uSun.value = S.leak * out; ovU.uOutK.value = out; ovU.uRays.value = Math.min(1.5, S.beam) * inn * (0.9 + 0.1 * fl);
    renderer.render(scene, cam);
  }
  requestAnimationFrame(frame);

  // 검수용: 3D 캔버스 앞면 네 모서리의 화면 좌표(DOM #frame 과 같아야 한다)
  const corners = () => [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([sx, sy]) => {
    const v = L(sx * CW / 2, sy * CH / 2, 0).project(cam), r = studioEl.getBoundingClientRect();
    return [+(r.left + (v.x + 1) / 2 * r.width).toFixed(1), +(r.top + (1 - v.y) / 2 * r.height).toFixed(1)];
  });
  window.__c3env = { get ready() { return ready; }, S, get fps() { return fps; }, get cineDone() { return cineDone; }, corners };
}
