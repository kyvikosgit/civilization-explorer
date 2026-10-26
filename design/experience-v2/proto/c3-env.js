// C3 화가의 아틀리에 — 이젤 뒤의 3D 환경 (three.js 0.147, c0·c1 과 같은 CDN)
//
// 화면의 칠하기 캔버스(DOM #stage)는 그대로 두고, 그 뒤에 진짜 3D 나무 이젤과 실사 360° 환경을 그린다.
//  · 캔버스 면은 카메라 화면과 평행 → 시차로 카메라가 움직여도 setViewOffset 로 DOM 캔버스와 픽셀 단위로 맞춘다(터치 좌표는 DOM 그대로).
//  · 아틀리에: 실제 화가 작업실 360° 사진을 어둡게 — 기름등(왼쪽 앞, 깜빡임)과 오른쪽 창빛, 창에서 비스듬히 드는 빛줄기, 그 안에서 반짝이는 먼지.
//  · 이젤 곁에 화가의 도구: 나무 걸상과 그 위 팔레트(물감 덩이), 바닥의 열린 물감 상자(튜브·붓·기름병), 물감 묻은 헝겊 — 들판에서도 그대로(야외 사생 짐).
//  · 다 칠하면: 방이 창 쪽으로 돌아가며 빛이 번져 하얗게 → 그 빛이 물러나며 여름 들판(밀밭·나무·구름). 이젤은 제자리, 카메라는 천천히 물러나며 화각이 좁아진다(돌리 줌).
//    들판의 바닥은 사진(깎은 풀밭)이 아니라 3D: 이젤이 선 마른 흙길 + 양옆과 앞뒤의 키 큰 들풀(포기째 자란 풀잎 · 이삭 줄기) + 흩어진 붉은 양귀비. 바람에 천천히 흔들리고,
//    멀어질수록 사진의 지평선(밀밭·나무)으로 녹아든다 — 그림(〈양귀비 들판〉 1873)처럼 비탈진 풀밭에 양귀비.
//  · 누르고 있으면 등불의 아틀리에로 0.5초에 걸쳐 돌아간다.
//
// 에셋(모두 CC0, Poly Haven — polyhaven.com/license):
//   img/c3env/studio.jpg, studio-env.jpg  ← HDRI "Artist Workshop" (Oliksiy Yakovlyev) 톤매핑 JPG 8K 에서 보이는 범위만 잘라 0.9배(경도 120–215°, 위도 +40…−62°)
//   img/c3env/meadow.jpg, meadow-env.jpg  ← HDRI "Evening Meadow" (Alexander Scholten) 톤매핑 JPG 8K 에서 잘라 0.9배(경도 38–128°, 위도 +40…−62°)
//   img/c3env/wood-*.jpg                  ← 텍스처 "Wood Table Worn" (Dimitrios Savva, Rico Cilliers) 1K diff/nor_gl/rough
//   *-env.jpg 는 512×256 전체 파노라마(조명용 PMREM), 보는 방향이 정면(-z)이 되도록 가로로 돌려 둠.
//   studio.jpg 는 창턱의 분무기·플라스틱 병·스피커, 전기 주전자·멀티탭·콘센트, 깡통·플라스틱 그릇을 지운 판(창턱 화분을 옮겨 오고, 오른쪽 커튼을 탁자까지 늘림)
//   img/c3env/field-soil.jpg              ← 텍스처 "Grass Ground" (Charlotte Baglioni) 1K diff — 들풀 밑동의 흙·마른 풀
//   img/c3env/field-dirt.jpg              ← 텍스처 "Dirt" (Charlotte Baglioni) 1K diff — 이젤이 선 흙길(셰이더에서 마른 황토빛으로)
//   img/c3env/stool.gltf · stool.bin · stool-*.jpg ← 모델 "Wooden Stool 01" (Kuutti Siitonen) 1K glTF, 텍스처 512로 줄임
//   들판의 풀잎·양귀비·팔레트·물감 상자·물감 튜브·붓·헝겊은 여기서 코드로 만든다(외부 에셋 없음).
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeBufferGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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
// 매번 같은 배치가 나오도록 씨앗 있는 난수 · 값 노이즈
function rng(seed) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// 들판: 이젤이 선 흙길(앞 왼쪽에서 이젤을 지나 뒤 오른쪽으로 휘어 나간다)과 땅의 높낮이 — 셰이더(GLSL)와 같은 식
const pathX = (z) => -0.2 * z + 0.02 * z * z;
const pathHW = (z) => 0.3 + 0.05 * Math.sin(z * 1.3 + 0.5);
const pathM = (x, z) => 1 - sstep(pathHW(z) - 0.12, pathHW(z) + 0.08, Math.abs(x - pathX(z)) + (vnoise(x * 3 + 11, z * 3) - 0.5) * 0.22);
const hgt = (x, z) => { const r = Math.hypot(x, z + 0.4), k = sstep(1.3, 3.6, r); return k * (0.16 * vnoise(x * 0.42 + 3, z * 0.42) + 0.07 * vnoise(x * 1.2, z * 1.2 + 7) - 0.11) + Math.max(0, -z - 5) * 0.012; };

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

  // ── 화가의 도구(이젤 곁, 바닥 y=0): 걸상 + 팔레트, 열린 물감 상자, 헝겊. 방에서도 들판에서도 같은 자리
  const R0 = rng(11);
  const kit = new T.Group(); scene.add(kit);
  const kitMats = [];                                       // 빛에 따라 envMapIntensity 를 같이 맞춘다
  const boxWood = new T.MeshStandardMaterial({ color: 0xb8875a, roughness: 1, metalness: 0, envMapIntensity: 0.3 });
  const palWood = new T.MeshStandardMaterial({ color: 0xe8c79a, roughness: 0.55, metalness: 0, envMapIntensity: 0.3 });   // 기름 먹은 과일나무 팔레트
  const tin = new T.MeshStandardMaterial({ color: 0xc9c4ba, roughness: 0.42, metalness: 0.7, envMapIntensity: 0.6 });
  const blackLac = new T.MeshStandardMaterial({ color: 0x17120e, roughness: 0.35, metalness: 0, envMapIntensity: 0.6 });
  const bristle = new T.MeshStandardMaterial({ color: 0xcdb48a, roughness: 0.9, envMapIntensity: 0.3 });
  const glassAmber = new T.MeshStandardMaterial({ color: 0x5a3410, roughness: 0.18, metalness: 0.1, envMapIntensity: 1.0 });
  const cork = new T.MeshStandardMaterial({ color: 0x9c7a52, roughness: 0.95 });
  kitMats.push(boxWood, palWood, tin, blackLac, bristle, glassAmber, cork, linen);
  // 모네의 팔레트(1870년대): 연백 · 크롬 옐로 · 카드뮴 옐로 · 버밀리언 · 로즈 매더 · 에메랄드 그린 · 코발트 블루 · 울트라마린
  const PAINT = [0xf2ede2, 0xf3c632, 0xeea21c, 0xd6331c, 0xb02248, 0x1f8a5a, 0x2b56b0, 0x223a92];
  const paintMat = PAINT.map((c) => { const m = new T.MeshStandardMaterial({ color: c }); m.userData.paint = true; return m; });   // 합칠 때 정점 색으로 바뀐다
  const paintVC = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0, envMapIntensity: 0.7 });
  kitMats.push(paintVC);
  const shadowy = (m) => { m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return m; };
  const mesh = (g, m, parent, x = 0, y = 0, z = 0) => { const o = new T.Mesh(g, m); o.position.set(x, y, z); parent.add(o); return shadowy(o); };
  // 둥근 각재(월드 축 기준, 상자 안쪽 좌표)
  const rbox = (w, h, d, m, parent, x, y, z, r = 0.0025) => mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)), m, parent, x, y, z);
  // 붓: 검은 옻칠 자루 + 쇠 고리 + 돼지털 끝 (local +x 방향으로 누운 것)
  function brush(parent, len, from, yaw, tilt) {
    const g = new T.Group(); g.position.copy(from); g.rotation.set(0, yaw, tilt); parent.add(g);
    const hl = len * 0.72;
    const h = mesh(new T.CylinderGeometry(0.0032, 0.0048, hl, 10), blackLac, g); h.rotation.z = -Math.PI / 2; h.position.x = hl / 2;
    const f = mesh(new T.CylinderGeometry(0.0046, 0.0036, len * 0.1, 12), tin, g); f.rotation.z = -Math.PI / 2; f.position.x = hl + len * 0.05;
    const b = mesh(new T.CylinderGeometry(0.0042, 0.0012, len * 0.14, 10), bristle, g); b.rotation.z = -Math.PI / 2; b.position.x = hl + len * 0.17; b.scale.set(1, 1, 0.55);
    const tip = mesh(new T.SphereGeometry(0.0034, 8, 6), paintMat[Math.floor(R0() * PAINT.length)], g); tip.position.x = hl + len * 0.22; tip.scale.set(1.6, 0.8, 0.9);
    return g;
  }
  // 물감 튜브: 주석 몸통 + 색 띠 + 납작하게 접힌 끝 + 검은 마개, 조금씩 짜여 있다
  function tube(parent, x, y, z, yaw, ci) {
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = yaw; parent.add(g);
    const body = mesh(new T.CylinderGeometry(0.0085, 0.0085, 0.07, 14), tin, g); body.rotation.z = Math.PI / 2; body.scale.set(1, 1, 0.72 + R0() * 0.2);
    const band = mesh(new T.CylinderGeometry(0.0088, 0.0088, 0.03, 14), paintMat[ci], g); band.rotation.z = Math.PI / 2; band.position.x = 0.006; band.scale.copy(body.scale);
    mesh(new T.BoxGeometry(0.012, 0.0035, 0.019), tin, g, -0.041, 0, 0);
    const cap = mesh(new T.CylinderGeometry(0.0048, 0.0048, 0.011, 10), blackLac, g); cap.rotation.z = Math.PI / 2; cap.position.x = 0.04;
    return g;
  }
  // 물감 상자(야외용 나무 상자, 뚜껑이 뒤로 젖혀 열림) — 왼칸에 튜브, 오른칸에 기름병, 위에 붓 셋
  {
    const box = new T.Group(); box.position.set(0.16, 0, -0.42); box.rotation.y = -0.42; kit.add(box);
    const BW = 0.34, BD = 0.23, BH = 0.056, t = 0.008;
    rbox(BW, t, BD, boxWood, box, 0, t / 2, 0);
    rbox(BW, BH, t, boxWood, box, 0, BH / 2, BD / 2 - t / 2); rbox(BW, BH, t, boxWood, box, 0, BH / 2, -BD / 2 + t / 2);
    rbox(t, BH, BD - 2 * t, boxWood, box, BW / 2 - t / 2, BH / 2, 0); rbox(t, BH, BD - 2 * t, boxWood, box, -BW / 2 + t / 2, BH / 2, 0);
    rbox(0.006, BH * 0.8, BD - 2 * t, boxWood, box, 0.07, BH * 0.4, 0);
    const lid = new T.Group(); lid.position.set(0, BH, -BD / 2); lid.rotation.x = -(Math.PI / 2 + 0.32); box.add(lid);
    rbox(BW, 0.009, BD, boxWood, lid, 0, 0.0045, BD / 2);
    rbox(BW - 0.02, 0.006, 0.012, boxWood, lid, 0, 0.011, BD - 0.012);
    for (let i = 0; i < 7; i++) tube(box, -0.14 + i * 0.03 + (R0() - 0.5) * 0.006, t + 0.008, (R0() - 0.5) * 0.06, Math.PI / 2 + (R0() - 0.5) * 0.25, [0, 1, 2, 3, 4, 5, 6, 7][i % 8]);
    tube(box, -0.05, t + 0.024, 0.04, Math.PI / 2 + 0.6, 6);
    for (const [bx, bz] of [[0.11, -0.04], [0.135, 0.045]]) {
      const b = mesh(new T.CylinderGeometry(0.014, 0.015, 0.058, 16), glassAmber, box, bx, t + 0.029, bz);
      mesh(new T.CylinderGeometry(0.006, 0.0065, 0.016, 10), glassAmber, b, 0, 0.035, 0);
      mesh(new T.CylinderGeometry(0.0062, 0.0058, 0.012, 10), cork, b, 0, 0.047, 0);
    }
    brush(box, 0.3, new T.Vector3(-0.17, BH + 0.006, 0.03), 0.18, 0.02);
    brush(box, 0.27, new T.Vector3(-0.15, BH + 0.006, -0.05), -0.12, 0.015);
    brush(box, 0.24, new T.Vector3(0.2, BH + 0.006, 0.07), Math.PI + 0.25, 0.02);
  }
  // 팔레트: 엄지 구멍이 있는 타원 나무판 + 가장자리를 따라 짠 물감 덩이 + 가운데 섞은 자국 — 걸상 위
  const palette = new T.Group(); kit.add(palette);
  {
    const s = new T.Shape(); s.absellipse(0, 0, 0.2, 0.135, 0, Math.PI * 2, false, 0);
    const hole = new T.Path(); hole.absellipse(-0.135, -0.01, 0.018, 0.022, 0, Math.PI * 2, true, 0); s.holes.push(hole);
    const g = new T.ExtrudeGeometry(s, { depth: 0.005, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.002, bevelSegments: 2, curveSegments: 40 });
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 0.55 + 0.3, uv.getY(i) / 0.55 + 0.1);
    mesh(g, palWood, palette);
    PAINT.forEach((c, i) => {
      const a = 0.55 + i * 0.47, r = 0.009 + R0() * 0.006;
      const d = mesh(new T.SphereGeometry(1, 14, 10), paintMat[i], palette, Math.cos(a) * 0.155, 0.008, Math.sin(a) * 0.098);
      d.scale.set(r * 1.3, r * 0.6, r); d.rotation.y = R0() * 3;
    });
    [[0x9fb2c9, 0.03, 0.02], [0xb4c08a, -0.03, -0.04], [0xe0b2a6, 0.06, -0.03], [0xd9d2b8, 0.0, 0.05]].forEach(([c, x, z]) => {
      const m = new T.MeshStandardMaterial({ color: c }); m.userData.paint = true;
      const d = mesh(new T.SphereGeometry(1, 14, 8), m, palette, x, 0.0072, z); d.scale.set(0.03 + R0() * 0.015, 0.0018, 0.018 + R0() * 0.01); d.rotation.y = R0() * 3;
    });
  }
  // 헝겊: 구겨진 아마천(물감 얼룩) — 정점마다 접힘을 넣는다
  {
    const g = new T.PlaneGeometry(0.34, 0.3, 34, 30); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, cols = new Float32Array(p.count * 3);
    const stains = Array.from({ length: 9 }, (_, i) => [(R0() - 0.5) * 0.3, (R0() - 0.5) * 0.26, 0.025 + R0() * 0.045, new T.Color(PAINT[[2, 3, 5, 1, 6, 2, 4, 5, 3][i]]).multiplyScalar(0.4)]);
    const waves = Array.from({ length: 7 }, () => [R0() * Math.PI, 18 + R0() * 26, R0() * 6]);
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), z = p.getZ(i);
      const r = Math.hypot(x / 0.2, z / 0.17);
      let y = 0;
      for (const [a, f, ph] of waves) y += Math.abs(Math.sin((x * Math.cos(a) + z * Math.sin(a)) * f + ph)) * 0.012;
      y = y * (1 - 0.6 * r * r) + 0.06 * Math.exp(-r * r * 2.6) + 0.002;
      const k = 1 - 0.18 * Math.exp(-r * r);                                   // 가운데로 몰려 구겨진다
      x *= k; z *= k;
      p.setXYZ(i, x, Math.max(0.002, y), z);
      const c = new T.Color(0.2, 0.155, 0.11);
      for (const [sx, sz, sr, sc] of stains) { const w = Math.exp(-((x - sx) ** 2 + (z - sz) ** 2) / (sr * sr)); c.lerp(sc, Math.min(0.75, w * 0.9)); }
      c.multiplyScalar(0.92 + 0.08 * Math.sin(x * 90) * Math.sin(z * 70));
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new T.BufferAttribute(cols, 3)); g.computeVertexNormals();
    const m = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });   // 천: 반사 없이
    const rag = mesh(g, m, kit, -0.3, 0, -0.18); rag.rotation.y = 0.7;
  }
  // 걸상(glTF, 따로 불러온다) — 팔레트는 앉판 높이에 미리 얹어 둔다
  const STOOL = new T.Vector3(-0.62, 0, 0.0);
  palette.position.set(STOOL.x + 0.02, 0.4385, STOOL.z - 0.01); palette.rotation.set(0.0, 0.5, 0.03);   // 걸상 앉판 높이(모델 0.437m)
  new GLTFLoader().load(IMG + 'stool.gltf', (gl) => {
    const st = gl.scene; st.position.copy(STOOL); st.rotation.y = 0.3; shadowy(st); kit.add(st);
    st.traverse((o) => { if (o.isMesh) { o.material.envMapIntensity = 0.3; kitMats.push(o.material); } });
  }, undefined, (e) => console.warn('stool', e));
  // 작은 조각 수백 개를 재질별로 한 덩어리로 합친다(그리기 호출 · 그림자 패스를 줄인다). 물감 색은 정점 색으로
  {
    kit.updateMatrixWorld(true);
    const groups = new Map(), parts = [];
    kit.traverse((o) => { if (o.isMesh) parts.push(o); });
    for (const o of parts) {
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      let mat = o.material;
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
      if (mat.userData.paint) {
        const n = g.attributes.position.count, cc = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) cc.set([mat.color.r, mat.color.g, mat.color.b], i * 3);
        g.setAttribute('color', new T.BufferAttribute(cc, 3)); mat = paintVC;
      }
      if (!groups.has(mat)) groups.set(mat, []);
      groups.get(mat).push(g);
      o.parent.remove(o);
    }
    for (const g of [...kit.children]) kit.remove(g);
    for (const [mat, gs] of groups) { const m = new T.Mesh(mergeBufferGeometries(gs), mat); m.castShadow = m.receiveShadow = true; kit.add(m); }
  }

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

  // ── 들판의 바닥(3D) — 바깥에서만. 방으로 돌아갈 때(누르고 비교)는 풀잎이 하나씩 사라지듯 녹는다(uShow)
  const fieldU = { uTime: { value: 0 }, uShow: { value: 0 }, uGlow: { value: 0 }, uCam: { value: new T.Vector3() }, tSoil: { value: null }, tDirt: { value: null } };
  // 바람: 들판을 건너가는 큰 물결(돌풍) + 잔떨림. 끝(높이²)일수록 많이 흔들린다
  const GL_WIND = /* glsl */`
    uniform float uTime;
    vec2 windAt(vec2 p) {
      float g = sin(dot(p, vec2(0.55, 0.2)) - uTime * 1.25) * 0.5 + 0.5; g = g * g * (3.0 - 2.0 * g);
      float fl = sin(uTime * 2.1 + p.x * 4.1 + p.y * 3.3) * 0.6 + sin(uTime * 3.3 + p.y * 6.7 - p.x * 2.0) * 0.4;
      return vec2(0.82, 0.3) * (0.03 + 0.09 * g) + vec2(0.45, 0.6) * fl * 0.024;
    }`;
  // 땅: 흙길(마른 황토) ↔ 풀 밑동(그늘진 흙·마른 풀). 멀어지면 투명해져 사진의 들판으로
  //  길 모양·얼룩은 미리 작은 텍스처에 구워 둔다(픽셀마다 노이즈를 계산하지 않게) — R 길 · G 흙 밝기 · B 마른 풀 부스러기 · A 풀 밑동 얼룩
  const MASK = { x0: -8, x1: 8, z0: -14, z1: 4, w: 384, h: 432 };
  const maskTex = (() => {
    const d = new Uint8Array(MASK.w * MASK.h * 4);
    for (let j = 0; j < MASK.h; j++) for (let i = 0; i < MASK.w; i++) {
      const x = MASK.x0 + (i + 0.5) / MASK.w * (MASK.x1 - MASK.x0), z = MASK.z0 + (j + 0.5) / MASK.h * (MASK.z1 - MASK.z0), o = (j * MASK.w + i) * 4;
      d[o] = pathM(x, z) * 255;
      d[o + 1] = Math.min(1, 0.72 + 0.5 * vnoise(x * 2.3, z * 2.3) * vnoise(x * 0.7 + 9, z * 0.7 + 9)) / 1.22 * 255;
      d[o + 2] = sstep(0.55, 0.8, vnoise(x * 1.3 + 2, z * 1.3 + 2)) * 255;
      d[o + 3] = vnoise(x * 0.9 + 4, z * 0.9 + 4) * 255;
    }
    const t = new T.DataTexture(d, MASK.w, MASK.h, T.RGBAFormat); t.magFilter = t.minFilter = T.LinearFilter; t.needsUpdate = true;
    return t;
  })();
  const groundMat = new T.MeshLambertMaterial({ transparent: true });
  groundMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uShow: fieldU.uShow, uCam: fieldU.uCam, tSoil: fieldU.tSoil, tDirt: fieldU.tDirt, tMask: { value: maskTex } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform float uShow; uniform vec3 uCam; uniform sampler2D tSoil, tDirt, tMask; varying vec3 vW;`)
      .replace('#include <map_fragment>', `
        vec2 wz = vW.xz;
        vec4 mk = texture2D(tMask, (wz - vec2(${MASK.x0.toFixed(1)}, ${MASK.z0.toFixed(1)})) / vec2(${(MASK.x1 - MASK.x0).toFixed(1)}, ${(MASK.z1 - MASK.z0).toFixed(1)}));
        vec3 soil = pow(texture2D(tSoil, wz / 1.9).rgb, vec3(2.2));
        vec3 dirt = pow(texture2D(tDirt, wz / 1.5 + 0.37).rgb, vec3(2.2));
        float m = mk.r;
        float dl = dot(dirt, vec3(0.3, 0.59, 0.11));
        vec3 path = mix(dirt, vec3(dl), 0.2) * vec3(3.3, 2.75, 1.95) * mk.g * 1.22;     // 볕에 마른 흙길 — 밝은 황토
        path = mix(path, soil * vec3(1.3, 1.1, 0.7), 0.25 * mk.b);                      // 흙 사이 마른 풀 부스러기
        vec3 meadow = soil * vec3(0.55, 0.68, 0.36) * (0.8 + 0.4 * mk.a);              // 풀 밑동: 그늘진 흙과 마른 잎
        float edge = smoothstep(0.05, 0.5, m) * (1.0 - smoothstep(0.5, 0.95, m));
        vec3 col = mix(meadow, path, smoothstep(0.15, 0.85, m));
        col = mix(col, soil * vec3(1.05, 0.92, 0.55), edge * 0.6);                     // 길가: 밟힌 마른 풀
        float r = distance(wz, uCam.xz);
        col = mix(col, vec3(0.16, 0.17, 0.06), smoothstep(5.0, 16.0, r) * 0.6);        // 멀리: 풀빛으로 뭉개진다
        diffuseColor.rgb = col;
        diffuseColor.a = (1.0 - smoothstep(13.0, 24.0, r)) * uShow;`);
  };
  const groundGeo = new T.PlaneGeometry(52, 52, 104, 104); groundGeo.rotateX(-Math.PI / 2); groundGeo.translate(0, 0, -9);
  { const p = groundGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, hgt(p.getX(i), p.getZ(i))); groundGeo.computeVertexNormals(); }
  const ground = new T.Mesh(groundGeo, groundMat); ground.receiveShadow = true; ground.renderOrder = -4; ground.visible = false; scene.add(ground);

  // 풀잎(+ 양귀비 줄기): 한 장 = 다섯 마디로 가늘어지는 잎. 인스턴스마다 (휨 · 높이 · 흔들림 · 사라지는 순서)
  function bladeGeo(N) {
    const p = [], n = [], ix = [];
    for (let i = 0; i < N; i++) { const s = Math.pow(i / N, 0.85), w = 0.5 * Math.pow(1 - s, 0.75); p.push(-w, s, 0, w, s, 0); n.push(0, 0, 1, 0, 0, 1); }
    p.push(0, 1, 0); n.push(0, 0, 1);
    for (let i = 0; i < N - 1; i++) { const a = 2 * i; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    ix.push(2 * (N - 1), 2 * (N - 1) + 1, 2 * N);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(n, 3)); g.setIndex(ix);
    return g;
  }
  // 풀잎·양귀비 재질: 그림자 없이 가벼운 손 셰이더(수만 장이라 PBR 은 무겁다). 해(방향광) + 하늘/땅 반사광 + 해를 등진 잎끝의 비침
  //  빛 값은 장면의 해·반구광·들판 환경과 같은 크기로 맞춘다(frame 에서 갱신)
  const litU = { uSunDir: { value: new T.Vector3(0, 1, 0) }, uSunCol: { value: new T.Color() }, uSky: { value: new T.Color() }, uGnd: { value: new T.Color() } };
  function fieldMat(kind) {
    const blade = kind === 'blade';
    return new T.ShaderMaterial({
      uniforms: { uTime: fieldU.uTime, uShow: fieldU.uShow, uGlow: fieldU.uGlow, ...litU },
      vertexColors: !blade, side: T.DoubleSide,
      vertexShader: /* glsl */`
        ${blade ? 'attribute vec4 aB;   // 휨 · 높이(m) · 흔들림 · 사라지는 순서' : 'attribute vec4 aP;   // 줄기 밑동 x · z · 줄기 높이 · 사라지는 순서'}
        ${GL_WIND}
        varying vec3 vC, vN, vW; varying float vS, vRnd;
        void main() {
          vec3 tr = position;
          ${blade ? 'tr.z += aB.x * position.y * position.y; vS = position.y; vRnd = aB.w;' : 'vS = 1.0; vRnd = aP.w;'}
          vec4 wp = modelMatrix * instanceMatrix * vec4(tr, 1.0);
          ${blade ? 'vec2 off = windAt(vec2(instanceMatrix[3][0], instanceMatrix[3][2])) * aB.y * aB.z * vS * vS; float hh = aB.y;' : 'vec2 off = windAt(aP.xy) * aP.z; float hh = aP.z;'}
          wp.xz += off; wp.y -= dot(off, off) / max(hh, 0.05) * 0.5;
          vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
          vC = instanceColor${blade ? '' : ' * color'};
          vW = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */`
        uniform float uShow, uGlow; uniform vec3 uSunDir, uSunCol, uSky, uGnd;
        varying vec3 vC, vN, vW; varying float vS, vRnd;
        void main() {
          if (vRnd > uShow) discard;
          vec3 n = normalize(vN); n *= sign(n.y + 1e-4);                 // 앞뒷면 구분 없이 위로
          n = normalize(mix(n, vec3(0.0, 1.0, 0.0), ${blade ? '0.5' : '0.35'}));
          vec3 base = vC${blade ? ' * mix(0.16, 1.0, smoothstep(0.0, 0.8, vS))' : ''};   // 밑동은 그늘
          float ndl = max(dot(n, uSunDir), 0.0);
          vec3 V = normalize(cameraPosition - vW);
          float back = pow(max(dot(-V, uSunDir), 0.0), 3.0);            // 해를 마주 보면 얇은 잎이 비친다
          vec3 lit = base * (uSunCol * ndl + mix(uGnd, uSky, n.y * 0.5 + 0.5));
          lit += base * uGlow * ${blade ? '(0.55 + 0.6 * back) * smoothstep(0.35, 1.0, vS)' : '(0.35 + 0.8 * back)'};
          gl_FragColor = vec4(lit, 1.0);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`,
    });
  }
  const bladeMat = fieldMat('blade');
  // 양귀비 꽃: 붉은 꽃잎 네 장(바깥 둘은 넓게 · 안쪽 둘은 오목하게) + 꽃잎 밑의 검은 반점 + 가운데 씨방
  function poppyGeo() {
    const pos = [], col = [], ix = [];
    const RED = [0.6, 0.016, 0.008], BLOT = [0.02, 0.006, 0.006], POD = [0.13, 0.15, 0.08];
    const petal = (a0, sc, up, NU = 4, NV = 6) => {
      const b = pos.length / 3;
      for (let i = 0; i <= NU; i++) {
        const u = i / NU;
        for (let j = 0; j <= NV; j++) {
          const v = j / NV * 2 - 1, ang = a0 + v * 1.25 * (0.35 + 0.65 * u), r = 0.5 * sc * (0.06 + 0.94 * u) * (1 - 0.14 * v * v) * (1 + 0.06 * Math.sin(v * 7 + a0 * 3) * u);
          pos.push(Math.cos(ang) * r, (0.1 + up) * Math.pow(u, 1.5) + 0.025 * Math.sin(v * 3 + a0 * 2) * u, Math.sin(ang) * r);
          const k = sstep(0.12, 0.3, u); col.push(...BLOT.map((c, q) => c + (RED[q] - c) * k));
        }
      }
      for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = b + i * (NV + 1) + j; ix.push(a, a + NV + 1, a + 1, a + 1, a + NV + 1, a + NV + 2); }
    };
    petal(0.3, 1.0, 0.12); petal(0.3 + Math.PI, 0.96, 0.14); petal(0.3 + Math.PI / 2, 0.82, 0.3); petal(0.3 - Math.PI / 2, 0.8, 0.32);
    const b = pos.length / 3; pos.push(0, 0.1, 0); col.push(...POD);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; pos.push(Math.cos(a) * 0.075, 0.045, Math.sin(a) * 0.075); col.push(...POD); }
    for (let i = 0; i < 8; i++) ix.push(b, b + 1 + ((i + 1) % 8), b + 1 + i);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(ix); g.computeVertexNormals();
    return g;
  }
  const poppyMat = fieldMat('poppy');

  // 배치: 화면에 보이는 것만 만든다 — 캔버스(DOM)가 덮는 곳 · 화면 밖은 뺀다(들판으로 물러나는 두 카메라 위치 모두에서 검사)
  const field = new T.Group(); field.visible = false; scene.add(field);
  {
    const sr = studioEl.getBoundingClientRect(), fr = frameEl.getBoundingClientRect();
    const SW = Math.max(1, sr.width), SH = Math.max(1, sr.height), k = fr.width / CW;
    const rx0 = fr.left - sr.left + 14, rx1 = fr.right - sr.left - 14, ry0 = fr.top - sr.top + 14, ry1 = fr.bottom - sr.top - 14;
    const cams = [D_IN + (D_OUT - D_IN) * 0.25, D_OUT].map((d) => {
      const c = new T.PerspectiveCamera(T.MathUtils.radToDeg(2 * Math.atan(SH / (2 * k * d))), SW / SH, 0.05, 80);
      const p = C.clone().addScaledVector(N, d); c.position.copy(p); c.up.copy(U); c.lookAt(p.clone().sub(N));
      const cx = fr.left - sr.left + fr.width / 2, cy = fr.top - sr.top + fr.height / 2;
      c.setViewOffset(SW, SH, SW / 2 - cx, SH / 2 - cy, SW, SH); c.updateProjectionMatrix(); c.updateMatrixWorld();
      return c;
    });
    const v = new T.Vector3();
    const seen = (pts) => fr.width > 0 ? cams.some((c) => pts.some((p) => {
      v.copy(p).project(c); if (v.z > 1) return false;
      const x = (v.x + 1) / 2 * SW, y = (1 - v.y) / 2 * SH;
      return x > -30 && x < SW + 30 && y > -30 && y < SH + 40 && !(x > rx0 && x < rx1 && y > ry0 && y < ry1);
    })) : true;
    const R = rng(23);
    const GREENS = [[0.05, 0.11, 0.012], [0.08, 0.16, 0.015], [0.14, 0.22, 0.025], [0.2, 0.25, 0.035], [0.1, 0.19, 0.02], [0.24, 0.26, 0.05]];
    const DRY = [[0.34, 0.27, 0.1], [0.27, 0.22, 0.08], [0.42, 0.34, 0.14]];
    const bl = { m: [], c: [], a: [] }, st = { m: [], c: [], a: [] }, pp = { m: [], c: [], a: [] };
    const M = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), P = new T.Vector3(), S3 = new T.Vector3();
    const tip = new T.Vector3(), mid = new T.Vector3(), base = new T.Vector3();
    const near = (x, z, cx, cz, r) => Math.hypot(x - cx, z - cz) < r;
    function blade(x, z, h, w, yaw, lean, bend, col, flex, to = bl) {
      const y = hgt(x, z);
      E.set(lean, yaw, 0, 'YXZ'); Q.setFromEuler(E); M.compose(P.set(x, y - 0.01, z), Q, S3.set(w, h, h));
      base.set(x, y, z); mid.set(0, 0.5, bend * 0.25).applyMatrix4(M); tip.set(0, 1, bend).applyMatrix4(M);
      if (!seen([base, mid, tip])) return null;
      to.m.push(M.clone()); to.c.push(col); to.a.push(bend, h, flex, 0.02 + R() * 0.97);
      return tip.clone();
    }
    // 1) 풀포기: 흙길 위엔 드문드문 짧게(밟힌 풀), 길가는 중간, 들판은 무릎 높이의 들풀과 이삭 줄기
    const clump = (cx, cz) => {
      const m = pathM(cx, cz);
      if (near(cx, cz, STOOL.x, STOOL.z, 0.3) || near(cx, cz, 0.16, -0.42, 0.26) || near(cx, cz, -0.3, -0.18, 0.22)) { if (R() > 0.25) return; }
      let hMin, hMax, n;
      if (m > 0.6) { if (R() > 0.07) return; hMin = 0.04; hMax = 0.14; n = 3 + R() * 4; }
      else if (m > 0.2) { hMin = 0.12; hMax = 0.38; n = 6 + R() * 7; }
      else { hMin = 0.3; hMax = cz > 0.15 ? 0.5 : 0.78; n = 7 + R() * 8; }
      if (cz < -3.4) n *= 0.6; else if (cz > 0.2) n *= 0.6;                 // 먼 풀 · 이젤 발 앞(화면 맨 아래, 글자·단추 밑)은 성기게
      const dry = R() < (m > 0.2 ? 0.55 : 0.28);
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, rr = R() * 0.06;
        const tall = m < 0.2 && R() < 0.12;                                   // 이삭 달린 마른 줄기(가늘고 길게)
        const h = tall ? 0.7 + R() * 0.35 : hMin + (hMax - hMin) * Math.pow(R(), 0.8);
        const w = tall ? 0.0045 + R() * 0.002 : 0.01 + R() * 0.011;
        const pal = tall || (dry && R() < 0.6) ? DRY : GREENS, c = pal[Math.floor(R() * pal.length)];
        const cc = new T.Color(c[0], c[1], c[2]).multiplyScalar(0.85 + R() * 0.3);
        blade(cx + Math.cos(a) * rr, cz + Math.sin(a) * rr, h, w, a + (R() - 0.5) * 0.6, (tall ? 0.08 : 0.15) + R() * 0.45, 0.08 + R() * (tall ? 0.15 : 0.4), cc, tall ? 1.2 : 1);
      }
    };
    for (let i = 0; i < 2800; i++) clump(-1.5 + R() * 3.0, -2.2 + R() * 3.1);            // 앞: 화면 아래 띠(이젤 발치)
    for (let i = 0; i < 1600; i++) clump(-2.6 + R() * 5.2, -3.4 + R() * 4.4);
    for (let i = 0; i < 1300; i++) clump(-5 + R() * 10, -14 + R() * 10.6);               // 뒤: 캔버스 양옆 틈으로 보이는 먼 풀
    // 2) 양귀비: 무리 지어(노이즈가 높은 곳) 들풀 사이에. 줄기는 풀잎과 같은 바람, 꽃은 줄기 끝에
    const poppy = (x, z) => {
      if (pathM(x, z) > 0.3) return;
      const pn = vnoise(x * 0.85 + 3.3, z * 0.85 - 1.7);
      if (R() > (pn - 0.25) * 2.2) return;
      const h = 0.36 + R() * 0.36, lean = 0.05 + R() * 0.2, yaw = R() * Math.PI * 2, bend = 0.06 + R() * 0.12;
      const t = blade(x, z, h, 0.004, yaw, lean, bend, new T.Color(0.07, 0.11, 0.035), 1.1, st);
      if (!t) return;
      const size = 0.075 + R() * 0.035;
      E.set(-0.15 - R() * 0.5, R() * Math.PI * 2, (R() - 0.5) * 0.5, 'YXZ'); Q.setFromEuler(E);
      pp.m.push(new T.Matrix4().compose(t, Q, S3.set(size, size, size)));
      const tint = 0.88 + R() * 0.25; pp.c.push(new T.Color(tint, 0.85 + R() * 0.45, 1));
      pp.a.push(x, z, h, st.a[st.a.length - 1]);
    };
    for (let i = 0; i < 1600; i++) poppy(-1.5 + R() * 3.0, -2.2 + R() * 3.1);
    for (let i = 0; i < 1200; i++) poppy(-2.6 + R() * 5.2, -3.4 + R() * 4.4);
    for (let i = 0; i < 1500; i++) poppy(-5 + R() * 10, -14 + R() * 10.6);
    const inst = (geo, mat, d, attr) => {
      const n = d.m.length, im = new T.InstancedMesh(geo, mat, Math.max(1, n));
      im.count = n; d.m.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, d.c[i]); });
      geo.setAttribute(attr, new T.InstancedBufferAttribute(new Float32Array(d.a), 4));
      im.frustumCulled = false; im.receiveShadow = true; field.add(im); return im;
    };
    // 풀잎 순서를 섞어 둔다 — 느린 기기에서 개수를 줄이면(count) 한 곳이 비지 않고 고르게 성겨진다
    for (let i = bl.m.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [bl.m[i], bl.m[j]] = [bl.m[j], bl.m[i]]; [bl.c[i], bl.c[j]] = [bl.c[j], bl.c[i]];
      for (let q = 0; q < 4; q++) [bl.a[i * 4 + q], bl.a[j * 4 + q]] = [bl.a[j * 4 + q], bl.a[i * 4 + q]];
    }
    field.userData.grass = inst(bladeGeo(4), bladeMat, bl, 'aB');
    inst(bladeGeo(4), bladeMat, st, 'aB');
    inst(poppyGeo(), poppyMat, pp, 'aP');
    field.userData.counts = [bl.m.length, st.m.length, pp.m.length];
  }

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
  Promise.all([load('studio.jpg'), load('meadow.jpg'), load('wood-diff.jpg'), load('wood-nor.jpg'), load('wood-rough.jpg'), load('studio-env.jpg'), load('meadow-env.jpg'), load('field-soil.jpg'), load('field-dirt.jpg')])
    .then(([ts, tm, wd, wn, wr, es, em, fs, fd]) => {
      for (const t of [ts, tm]) { t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.anisotropy = 1; }
      bgU.tS.value = ts; bgU.tM.value = tm;
      wd.encoding = T.sRGBEncoding;
      for (const t of [wd, wn, wr]) { t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = Math.min(8, maxAniso); }
      for (const m of [woodMat, boxWood, palWood]) { Object.assign(m, { map: wd, normalMap: wn, normalScale: new T.Vector2(0.8, 0.8) }); if (m !== palWood) m.roughnessMap = wr; m.needsUpdate = true; }
      for (const t of [fs, fd]) { t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = Math.min(8, maxAniso); }   // 셰이더에서 직접 감마를 푼다
      fieldU.tSoil.value = fs; fieldU.tDirt.value = fd;
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
  const quality = { step: 0, n: 0, sum: 0 };
  function frame(now) {
    requestAnimationFrame(frame);
    if (!renderer || document.hidden) return;
    const rawDt = (now - last) / 1000, dt = Math.min(0.05, rawDt); last = now; fps = fps * 0.95 + (dt > 0 ? 1 / dt : 60) * 0.05;
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
    for (const m of kitMats) m.envMapIntensity = woodMat.envMapIntensity * (m.metalness > 0.5 || m.roughness < 0.4 ? 1.6 : 1);
    if (envS && envM) scene.environment = out > 0.5 ? envM : envS;
    shadowMat.opacity = 0.5 * Math.max(S.lamp * inn, out);
    // 들판 바닥: 바깥일 때만(누르고 비교하면 풀잎이 하나씩 녹아 사라진다)
    fieldU.uShow.value = out; fieldU.uTime.value = t; fieldU.uGlow.value = out * (1 + S.over); fieldU.uCam.value.copy(camPos);
    litU.uSunDir.value.copy(sun.position).sub(sun.target.position).normalize();
    litU.uSunCol.value.copy(sun.color).multiplyScalar(sun.intensity / Math.PI);
    litU.uSky.value.setRGB(0.62, 0.7, 0.8).multiplyScalar(out); litU.uGnd.value.setRGB(0.24, 0.28, 0.16).multiplyScalar(out);
    field.visible = ground.visible = out > 0.002; floor.visible = out < 0.998;
    // 느린 기기: 들판에서 처음 2초의 실제 프레임 간격을 재서 풀잎 수를 한두 번 줄인다(되돌리지 않음)
    if (out > 0.99 && cineDone && quality.step < 2) {
      quality.n++; quality.sum += Math.min(rawDt, 0.25);
      if (quality.n >= 60) {
        const avg = quality.sum / quality.n; quality.n = 0; quality.sum = 0;
        if (avg > 1 / 38) { quality.step++; const g = field.userData.grass; g.count = Math.floor(field.userData.counts[0] * (quality.step === 1 ? 0.55 : 0.32)); }
        else quality.step = 2;
      }
    }
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
  window.__c3env = { get ready() { return ready; }, S, get fps() { return fps; }, get cineDone() { return cineDone; }, corners, field: field.userData.counts };
}
