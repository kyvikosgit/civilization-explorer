// C-4 나다르 사진관 — 촬영 이미지 → (1) 인물 분리 → 19세기 스튜디오 배경 합성 → (2) 19세기 사진(WebGL 현상) / (3) 초상화(신경망 화풍 변환)
// 모두 브라우저 안에서 처리 (서버·API 키 없음). 모델은 Step3 에서만 지연 로드
//
// 라이브러리·모델 (버전 고정)
//   MediaPipe Tasks Vision 0.10.14 (Apache-2.0) — jsDelivr
//     · ImageSegmenter: selfie_segmenter float16 v1 (≈244KB) — 인물 마스크
//     · FaceDetector: blaze_face_short_range float16 v1 — 얼굴 위치 (부드러운 조명 보정에만 사용)
//   Magenta.js @magenta/image 0.2.1 (Apache-2.0) — ArbitraryStyleTransferNetwork
//     (MobileNet 스타일 예측 + 분리 합성곱 변환기, magentadata 체크포인트)
//   화풍 기준 그림: 클로드 모네 〈베레모를 쓴 자화상〉 1886 — 퍼블릭 도메인 (assets/img/style_monet_beret_1886.jpg)
// 실패 시: 분리 실패 → 원래 배경 유지 / 화풍 변환 실패 → 쿠와하라 필터(워커) / WebGL 실패 → 캔버스 필터(워커)

const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const SEG_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
const MAGENTA = 'https://cdn.jsdelivr.net/npm/@magenta/image@0.2.1/dist/magentaimage.min.js';
export const STYLE_SRC = 'assets/img/style_monet_beret_1886.jpg';

// 작업 해상도 (3:4) · 결과 카드 (3:4)
export const WORK_W = 780, WORK_H = 1040;
export const CARD_W = 900, CARD_H = 1200;
const PLATE = { x: 60, y: 60, w: 780, h: 1040 }; // 사진 판 (카드 아래 여백 100 = 인쇄 문구 자리)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ── 입력: 3:4 로 자르기 (세로가 길면 위쪽 기준 — 얼굴 보존)
export function cropTo34(img) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const target = 3 / 4;
  let sw = iw, sh = ih, sx = 0, sy = 0;
  if (iw / ih > target) { sw = ih * target; sx = (iw - sw) / 2; } else { sh = iw / target; sy = (ih - sh) * 0.25; }
  const c = canvas(WORK_W, WORK_H), g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, sx, sy, sw, sh, 0, 0, WORK_W, WORK_H);
  return c;
}

// ── 지연 로드
let visionP = null, segP = null, faceP = null, magentaP = null, styleImgP = null;
function vision() {
  return visionP ||= import(/* @vite-ignore */ `${MP}/vision_bundle.mjs`).then(async (m) => ({ m, fs: await m.FilesetResolver.forVisionTasks(`${MP}/wasm`) }));
}
async function createTask(Klass, fs, opts) {
  try { return await Klass.createFromOptions(fs, { ...opts, baseOptions: { ...opts.baseOptions, delegate: 'GPU' } }); }
  catch (e) { return Klass.createFromOptions(fs, { ...opts, baseOptions: { ...opts.baseOptions, delegate: 'CPU' } }); }
}
export function loadSegmenter() {
  return segP ||= vision().then(({ m, fs }) => createTask(m.ImageSegmenter, fs, {
    baseOptions: { modelAssetPath: SEG_MODEL }, runningMode: 'IMAGE', outputCategoryMask: false, outputConfidenceMasks: true,
  }));
}
export function loadFace() {
  return faceP ||= vision().then(({ m, fs }) => createTask(m.FaceDetector, fs, {
    baseOptions: { modelAssetPath: FACE_MODEL }, runningMode: 'IMAGE', minDetectionConfidence: 0.4,
  }));
}
export function loadMagenta() {
  return magentaP ||= new Promise((res, rej) => {
    if (window.mi) return res(window.mi);
    const s = document.createElement('script'); s.src = MAGENTA; s.async = true;
    s.onload = () => (window.mi ? res(window.mi) : rej(new Error('magenta_missing')));
    s.onerror = () => rej(new Error('magenta_load_failed'));
    document.head.appendChild(s);
  }).then(async (mi) => { const net = new mi.ArbitraryStyleTransferNetwork(); await net.initialize(); return net; });
}
function styleImg() {
  // 기준 그림은 짧은 변 256px 로 — 붓 터치가 크게, 색이 또렷하게 옮겨진다 (원본 크기로 넣으면 색이 바랜다)
  return styleImgP ||= new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = STYLE_SRC; })
    .then((i) => { const k = 256 / Math.min(i.width, i.height); const c = canvas(Math.round(i.width * k), Math.round(i.height * k)); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); return c; });
}

// ── 인물 마스크 (Float32 0..1, WORK 크기)
export async function personMask(src) {
  const seg = await loadSegmenter();
  const r = seg.segment(src);
  const masks = r.confidenceMasks || [];
  const mk = masks[masks.length - 1];             // selfie_segmenter: 마지막(=유일) 마스크가 인물
  const w = mk.width, h = mk.height, data = Float32Array.from(mk.getAsFloat32Array());
  r.close && r.close();
  // 작업 크기로 보간 + 경계 다듬기(가벼운 흐림 → 부드러운 문턱)
  const out = new Float32Array(WORK_W * WORK_H);
  for (let y = 0; y < WORK_H; y++) {
    const fy = (y + 0.5) * h / WORK_H - 0.5, y0 = clamp(Math.floor(fy), 0, h - 1), y1 = clamp(y0 + 1, 0, h - 1), ty = fy - Math.floor(fy);
    for (let x = 0; x < WORK_W; x++) {
      const fx = (x + 0.5) * w / WORK_W - 0.5, x0 = clamp(Math.floor(fx), 0, w - 1), x1 = clamp(x0 + 1, 0, w - 1), tx = fx - Math.floor(fx);
      const a = data[y0 * w + x0] * (1 - tx) + data[y0 * w + x1] * tx, b = data[y1 * w + x0] * (1 - tx) + data[y1 * w + x1] * tx;
      out[y * WORK_W + x] = a * (1 - ty) + b * ty;
    }
  }
  const bl = boxBlur(out, WORK_W, WORK_H, 2);
  for (let i = 0; i < bl.length; i++) bl[i] = smooth(0.32, 0.68, bl[i]);
  let cover = 0; for (let i = 0; i < bl.length; i += 7) cover += bl[i];
  cover /= bl.length / 7;
  return { mask: bl, cover };
}
export async function faceBox(src) {
  const fd = await loadFace();
  const r = fd.detect(src);
  const d = r.detections && r.detections[0];
  if (!d) return null;
  const b = d.boundingBox;
  return { cx: (b.originX + b.width / 2) / WORK_W, cy: (b.originY + b.height / 2) / WORK_H, r: Math.max(b.width, b.height) / WORK_W };
}

function boxBlur(src, w, h, r) {
  r = Math.max(1, Math.round(r));
  let a = src; const b = new Float32Array(w * h);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      const o = y * w; let acc = 0;
      for (let x = -r; x <= r; x++) acc += a[o + clamp(x, 0, w - 1)];
      for (let x = 0; x < w; x++) { b[o + x] = acc / (2 * r + 1); acc += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; }
    }
    const c = new Float32Array(w * h);
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[clamp(y, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) { c[y * w + x] = acc / (2 * r + 1); acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]; }
    }
    a = c;
  }
  return a;
}

// ── 19세기 사진관 배경 (절차 생성 — 칠한 배경막 + 무거운 커튼 + 바닥)
export function studioBackdrop(kind = 'photo', seed = 7) {
  const W = WORK_W, H = WORK_H, c = canvas(W, H), g = c.getContext('2d');
  const R = rng(seed);
  const warm = kind === 'paint';
  // 배경막 바탕 — 위가 밝고 아래로 어두워지는 칠
  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, warm ? '#6b5a44' : '#8c8478'); base.addColorStop(0.6, warm ? '#4a3b2b' : '#6a6359'); base.addColorStop(1, warm ? '#2c2219' : '#423d36');
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  // 얼룩진 붓 자국 (구름처럼 칠한 사진관 배경막)
  for (let i = 0; i < 70; i++) {
    const x = R() * W, y = R() * H * 0.85, r = 60 + R() * 220, light = R() > 0.5;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.05 + R() * 0.09;
    gr.addColorStop(0, light ? `rgba(255,245,225,${a})` : `rgba(20,14,8,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // 인물 뒤 밝은 후광 (고전 초상 사진 배경막)
  const halo = g.createRadialGradient(W * 0.55, H * 0.33, 10, W * 0.55, H * 0.36, W * 0.62);
  halo.addColorStop(0, warm ? 'rgba(230,200,150,.35)' : 'rgba(255,250,240,.32)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = halo; g.fillRect(0, 0, W, H);
  // 바닥 — 아래 13%
  const fy = H * 0.87;
  const fl = g.createLinearGradient(0, fy, 0, H);
  fl.addColorStop(0, warm ? '#3a2c1f' : '#4f4840'); fl.addColorStop(1, warm ? '#1c140d' : '#2c2823');
  g.fillStyle = fl; g.fillRect(0, fy, W, H - fy);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, fy - 2, W, 3);
  // 커튼 — 왼쪽, 세로 주름
  const cw = W * 0.24;
  for (let x = 0; x < cw; x++) {
    const t = x / cw;
    const fold = Math.sin(x * 0.11 + Math.sin(x * 0.031) * 2.2) * 0.5 + 0.5;
    const shade = 0.35 + fold * 0.5 - t * 0.12;
    const col = warm ? [120 * shade, 38 * shade, 30 * shade] : [96 * shade, 88 * shade, 80 * shade];
    const edge = t > 0.86 ? (1 - (t - 0.86) / 0.14) : 1;  // 커튼 가장자리 — 아래로 갈수록 벌어진다
    g.fillStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${edge})`;
    g.fillRect(x, 0, 1, H * (0.96 + 0.04 * fold));
  }
  const tie = g.createLinearGradient(cw - 10, 0, cw + 40, 0);
  tie.addColorStop(0, 'rgba(0,0,0,.45)'); tie.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = tie; g.fillRect(cw - 10, 0, 50, H);
  // 칠 결 노이즈
  const id = g.getImageData(0, 0, W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 10; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(id, 0, 0);
  return c;
}

// ── 합성: 인물 + 배경 (가장자리 빛 번짐 포함)
export function compositeOn(src, mask, backdrop) {
  const W = WORK_W, H = WORK_H, out = canvas(W, H), g = out.getContext('2d');
  const s = src.getContext('2d').getImageData(0, 0, W, H).data;
  const bctx = backdrop.getContext('2d');
  const b = bctx.getImageData(0, 0, W, H).data;
  const bb = canvas(W / 4, H / 4); bb.getContext('2d').drawImage(backdrop, 0, 0, W / 4, H / 4);
  const bbl = canvas(W, H); const bg2 = bbl.getContext('2d'); bg2.imageSmoothingQuality = 'high'; bg2.drawImage(bb, 0, 0, W, H);
  const blur = bg2.getImageData(0, 0, W, H).data;
  const o = g.createImageData(W, H), od = o.data;
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    const m = mask[i], wrap = m * (1 - m) * 4 * 0.35;
    for (let k = 0; k < 3; k++) od[p + k] = s[p + k] * m + b[p + k] * (1 - m) + (blur[p + k] - s[p + k] * m - b[p + k] * (1 - m)) * wrap;
    od[p + 3] = 255;
  }
  g.putImageData(o, 0, 0);
  return out;
}

// ── 19세기 사진 — WebGL 현상 파이프라인
const VS = 'attribute vec2 a; varying vec2 v; void main(){ v = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }';
const FS_ORTHO = `precision highp float; varying vec2 v; uniform sampler2D t;
  void main(){ vec3 c = texture2D(t, v).rgb;   // 텍스처 t=0 이 이미지 위쪽 — 이후 모든 패스가 같은 방향(아래로 증가)
    // 정색성(오르소크로매틱) 감광 — 청색에 민감, 적색에 둔감: 피부·입술은 어둡게, 하늘·흰 옷은 날아간다
    float l = dot(c, vec3(0.02, 0.32, 0.86));
    gl_FragColor = vec4(vec3(clamp(l, 0.0, 1.0)), 1.0); }`;
const FS_BLUR = `precision highp float; varying vec2 v; uniform sampler2D t; uniform vec2 d;
  void main(){ vec4 s = texture2D(t, v) * 0.2270270270;
    s += (texture2D(t, v + d * 1.3846153846) + texture2D(t, v - d * 1.3846153846)) * 0.3162162162;
    s += (texture2D(t, v + d * 3.2307692308) + texture2D(t, v - d * 3.2307692308)) * 0.0702702703;
    gl_FragColor = s; }`;
const FS_FINAL = `precision highp float; varying vec2 v;
  uniform sampler2D L, B1, B2; uniform vec2 res; uniform vec4 plate; uniform vec3 face; uniform float seed;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + seed) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), u.x), u.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * n(p); p = p * 2.03 + 3.1; a *= 0.5; } return s; }
  float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  vec3 albumen(float t){
    vec3 a = vec3(0.16, 0.09, 0.10), b = vec3(0.50, 0.33, 0.24), c = vec3(0.80, 0.66, 0.48), d = vec3(0.96, 0.90, 0.76);
    return t < 0.4 ? mix(a, b, t / 0.4) : (t < 0.75 ? mix(b, c, (t - 0.4) / 0.35) : mix(c, d, (t - 0.75) / 0.25)); }
  void main(){
    vec2 px = vec2(v.x, 1.0 - v.y) * res;           // 카드 픽셀 (y 아래로)
    vec2 c = px / res;
    // 카드(마운트) 종이 — 버프색, 섬유결, 가장자리 손때
    vec3 card = vec3(0.87, 0.81, 0.68) * (0.93 + 0.09 * fbm(c * vec2(7.0, 9.0))) + (h(px) - 0.5) * 0.025;
    float cardEdge = sdBox(px - res * 0.5, res * 0.5, 22.0);
    card *= 1.0 - 0.22 * smoothstep(-40.0, 0.0, cardEdge);
    vec3 col = card;
    // 판 영역
    vec2 pc = (px - plate.xy) / plate.zw;            // 0..1
    vec2 cen = pc - 0.5;
    float wob = (fbm(pc * vec2(18.0, 14.0)) - 0.5) * 0.012;  // 손으로 바른 콜로디온 판의 고르지 않은 가장자리
    float inside = sdBox(cen, vec2(0.5 + wob), 0.012);
    // 금박 테두리 선
    float rule = abs(sdBox(px - (plate.xy + plate.zw * 0.5), plate.zw * 0.5 + 14.0, 6.0));
    col = mix(col, vec3(0.70, 0.55, 0.30), smoothstep(1.6, 0.4, rule) * 0.9);
    if (inside < 0.004) {
      float l = texture2D(L, pc).r, b1 = texture2D(B1, pc).r, b2 = texture2D(B2, pc).r;
      float r = length(cen * vec2(1.0, 1.25)) * 1.35;
      // 소프트 포커스 + 상면 만곡(가장자리로 갈수록 흐림)
      float val = mix(l, b1, 0.32);
      val = mix(val, b2, smoothstep(0.38, 1.05, r) * 0.85);
      // 할레이션 — 밝은 곳 주변 번짐
      val += max(b2 - 0.58, 0.0) * 1.1 + max(b1 - 0.72, 0.0) * 0.5;
      // 얼굴 쪽 스카이라이트 (얼굴 검출 시)
      vec2 fd = (pc - face.xy) * vec2(1.0, 1.333);
      val += 0.07 * face.z * exp(-dot(fd, fd) / 0.02);
      // 습판 톤 곡선 — 어깨(하이라이트 압축) + 검정 띄움
      val = (1.0 - exp(-val * 2.1)) / (1.0 - exp(-2.1));
      val = 0.05 + val * 0.92;
      // 비네팅 (cos^4 근사)
      val *= mix(1.0, 0.5, smoothstep(0.5, 1.3, r));
      // 유제 입자 — 화소 크기 + 덩어리 크기 두 겹, 중간톤에서 가장 강하게
      float gr = (h(px) - 0.5) * 0.08 + (n(px * 0.42) - 0.5) * 0.07;
      val += gr * (0.45 + 0.55 * (1.0 - abs(val - 0.5) * 2.0));
      // 판 가장자리: 콜로디온 흘림 자국(왼쪽·아래), 은 침착
      float edgeD = min(min(pc.x, 1.0 - pc.x), min(pc.y, 1.0 - pc.y));
      float pour = smoothstep(0.07, 0.0, pc.x + (fbm(vec2(pc.y * 6.0, 1.7)) - 0.5) * 0.06) * (0.6 + 0.4 * fbm(vec2(pc.x * 4.0, pc.y * 60.0)));
      float drip = smoothstep(0.05, 0.0, 1.0 - pc.y + (fbm(vec2(pc.x * 9.0, 3.3)) - 0.5) * 0.05);
      val *= 1.0 - 0.38 * max(pour, drip);
      val = mix(val, 0.9, smoothstep(0.03, 0.0, edgeD) * 0.35 * fbm(pc * 40.0));
      // 먼지(흰 점)·검은 반점·긁힘
      vec2 cell = floor(px / 3.0);
      if (h(cell) > 0.99935) val = mix(val, 0.97, 0.85);
      if (h(cell + 17.0) > 0.99965) val *= 0.25;
      float sc = abs(fract(pc.x * 2.3 + pc.y * 0.13 + seed * 0.1) - 0.5);
      val = mix(val, 0.95, smoothstep(0.0009, 0.0, sc) * step(0.55, fbm(vec2(pc.y * 5.0, 9.0))) * 0.5);
      vec3 ph = albumen(clamp(val, 0.0, 1.0));
      // 판 안쪽 테두리 그림자
      ph *= 1.0 - 0.35 * smoothstep(-0.012, 0.004, inside);
      col = mix(col, ph, smoothstep(0.004, -0.002, inside));
    }
    // 둥근 카드 모서리 밖은 흰 바탕
    col = mix(col, vec3(1.0), smoothstep(-0.5, 0.5, cardEdge));
    gl_FragColor = vec4(col, 1.0);
  }`;

function glInit(w, h) {
  const cv = canvas(w, h);
  const gl = cv.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false });
  if (!gl) throw new Error('webgl_unavailable');
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const progs = {};
  const prog = (name, fs) => {
    if (progs[name]) return progs[name];
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return (progs[name] = p);
  };
  const tex = (src, tw, th) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tw, th, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return t;
  };
  const target = (tw, th) => { const t = tex(null, tw, th); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f, w: tw, h: th }; };
  const run = (p, out, uniforms, texs) => {
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.f : null);
    gl.viewport(0, 0, out ? out.w : w, out ? out.h : h);
    const loc = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(loc); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    Object.entries(texs || {}).forEach(([k, t], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(gl.getUniformLocation(p, k), i); });
    Object.entries(uniforms || {}).forEach(([k, val]) => {
      const u = gl.getUniformLocation(p, k);
      if (typeof val === 'number') gl.uniform1f(u, val); else if (val.length === 2) gl.uniform2fv(u, val); else if (val.length === 3) gl.uniform3fv(u, val); else gl.uniform4fv(u, val);
    });
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  return { gl, cv, prog, tex, target, run };
}

export function renderPhoto19(comp, face) {
  const G = glInit(CARD_W, CARD_H);
  const { gl } = G;
  const src = G.tex(comp);
  const L = G.target(WORK_W, WORK_H);
  G.run(G.prog('ortho', FS_ORTHO), L, {}, { t: src });
  // 작은 흐림 (소프트 포커스)
  const t1 = G.target(WORK_W, WORK_H), B1 = G.target(WORK_W, WORK_H);
  const blur = G.prog('blur', FS_BLUR);
  G.run(blur, t1, { d: [1.6 / WORK_W, 0] }, { t: L.t });
  G.run(blur, B1, { d: [0, 1.6 / WORK_H] }, { t: t1.t });
  // 큰 흐림 (1/4 해상도 — 할레이션·가장자리 흐림)
  const qw = WORK_W / 4 | 0, qh = WORK_H / 4 | 0;
  const q0 = G.target(qw, qh), q1 = G.target(qw, qh), B2 = G.target(qw, qh);
  G.run(blur, q0, { d: [0, 0] }, { t: L.t });
  G.run(blur, q1, { d: [2.2 / qw, 0] }, { t: q0.t });
  G.run(blur, B2, { d: [0, 2.2 / qh] }, { t: q1.t });
  G.run(blur, q1, { d: [2.2 / qw, 0] }, { t: B2.t });
  G.run(blur, B2, { d: [0, 2.2 / qh] }, { t: q1.t });
  G.run(G.prog('final', FS_FINAL), null, {
    res: [CARD_W, CARD_H], plate: [PLATE.x, PLATE.y, PLATE.w, PLATE.h],
    face: face ? [face.cx, face.cy, 1] : [0.5, 0.3, 0], seed: 3.7,
  }, { L: L.t, B1: B1.t, B2: B2.t });
  const out = canvas(CARD_W, CARD_H), g = out.getContext('2d');
  g.drawImage(G.cv, 0, 0);
  imprint(g);
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return out;
}
// 카드 아래 연대 표기 — 마운트에 찍힌 인쇄 문구처럼 (클라이언트 지정: 19세기 사진 = '1850년대')
export const ERA_PHOTO = '1850년대', ERA_PAINT = '1500년대';
function imprint(g) {
  g.save();
  const y = PLATE.y + PLATE.h + 50;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 30px Paperlogy, Freesentation, sans-serif';
  // 눌러 찍은 자국 — 아래 밝은 선 + 위 어두운 글자
  g.fillStyle = 'rgba(255,248,230,.6)'; g.fillText(ERA_PHOTO, CARD_W / 2, y + 1.5);
  g.fillStyle = 'rgba(92,58,34,.88)'; g.fillText(ERA_PHOTO, CARD_W / 2, y);
  const tw = g.measureText(ERA_PHOTO).width / 2 + 24;
  g.fillRect(CARD_W / 2 - tw - 90, y, 90, 1.5);
  g.fillRect(CARD_W / 2 + tw, y, 90, 1.5);
  g.restore();
}
// 액자 아래 황동 명판 (클라이언트 지정: 초상화 = '1500년대')
function eraPlate(g, cx, cy, text) {
  g.save();
  g.font = '800 24px Paperlogy, Freesentation, sans-serif';
  const w = Math.max(150, g.measureText(text).width + 56), h = 36;
  const x = cx - w / 2, y = cy - h / 2;
  g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 6; g.shadowOffsetY = 2;
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, '#f3dc9c'); gr.addColorStop(0.45, '#c9a14f'); gr.addColorStop(1, '#8a6427');
  g.fillStyle = gr; roundRect(g, x, y, w, h, 5); g.fill();
  g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(70,46,14,.9)'; g.lineWidth = 1.5; roundRect(g, x + 4, y + 4, w - 8, h - 8, 3); g.stroke();
  [[x + 9, cy], [x + w - 9, cy]].forEach(([sx, sy]) => { g.fillStyle = '#6e4f1e'; g.beginPath(); g.arc(sx, sy, 2.4, 0, 7); g.fill(); });
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,240,200,.55)'; g.fillText(text, cx, cy + 1.5);
  g.fillStyle = '#3d2a0e'; g.fillText(text, cx, cy);
  g.restore();
}
// WebGL 이 안 되면: 워커 결과(판 크기)를 카드에 얹는다
export function mountFallback(plateCanvas) {
  const out = canvas(CARD_W, CARD_H), g = out.getContext('2d');
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, CARD_W, CARD_H);
  g.fillStyle = '#DDCFAE'; roundRect(g, 0, 0, CARD_W, CARD_H, 22); g.fill();
  g.drawImage(plateCanvas, PLATE.x, PLATE.y, PLATE.w, PLATE.h);
  g.strokeStyle = 'rgba(178,140,76,.9)'; g.lineWidth = 2; g.strokeRect(PLATE.x - 14, PLATE.y - 14, PLATE.w + 28, PLATE.h + 28);
  imprint(g);
  return out;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// ── 초상화 — 신경망 화풍 변환 (모네 자화상 1886) + 원본 세부 일부 보존 + 바니시·캔버스 결 + 금박 액자
const ST_W = 480, ST_H = 640;
export async function stylize(compPaint, strength) {
  const [net, style] = await Promise.all([loadMagenta(), styleImg()]);
  const small = canvas(ST_W, ST_H); small.getContext('2d').drawImage(compPaint, 0, 0, ST_W, ST_H);
  const data = await net.stylize(small, style, strength);
  const c = canvas(data.width, data.height); c.getContext('2d').putImageData(data, 0, 0);
  return c;
}
// 초상화 = 회화 필터(쿠와하라, 형태·얼굴 보존) 위에 신경망 화풍(모네의 색·붓결)을 섞는다
//   styled 가 없으면(실패·품질 미달) 회화 필터만. 얼굴 둘레는 화풍 비중을 줄여 그 사람으로 읽히게
export function finishPortrait(styled, comp, face, painterly, detail = 0.16) {
  const W = WORK_W, H = WORK_H;
  const up = canvas(W, H), ug = up.getContext('2d'); ug.imageSmoothingQuality = 'high';
  ug.drawImage(painterly || comp, 0, 0, W, H);
  const base = ug.getImageData(0, 0, W, H);
  let nd = null;
  if (styled) { const tmp = canvas(W, H), tg = tmp.getContext('2d'); tg.imageSmoothingQuality = 'high'; tg.drawImage(styled, 0, 0, W, H); nd = tg.getImageData(0, 0, W, H).data; }
  const s = base, sd = s.data;
  if (nd) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = (y * W + x) * 4;
      let w = 0.55;
      if (face) { const dx = x / W - face.cx, dy = (y / H - face.cy) * 1.33; w -= 0.3 * Math.exp(-(dx * dx + dy * dy) / (face.r * face.r * 1.4)); }
      sd[p] += (nd[p] - sd[p]) * w; sd[p + 1] += (nd[p + 1] - sd[p + 1]) * w; sd[p + 2] += (nd[p + 2] - sd[p + 2]) * w;
    }
  }
  const o = comp.getContext('2d').getImageData(0, 0, W, H).data;
  // 원본 명암 세부(고주파) — 얼굴 주변은 조금 더 남겨 닮음 유지
  const lum = new Float32Array(W * H);
  for (let i = 0; i < lum.length; i++) lum[i] = (o[i * 4] * 0.299 + o[i * 4 + 1] * 0.587 + o[i * 4 + 2] * 0.114) / 255;
  const lb = boxBlur(lum, W, H, 3);
  const R = rng(W * 13 + H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, p = i * 4;
    let k = detail;
    if (face) { const dx = x / W - face.cx, dy = (y / H - face.cy) * 1.33; k += 0.3 * Math.exp(-(dx * dx + dy * dy) / (face.r * face.r * 1.2)); }
    const det = (lum[i] - lb[i]) * 255 * k;
    let r = sd[p] + det, g = sd[p + 1] + det, b = sd[p + 2] + det;
    // 오래된 바니시 — 아주 약하게 따뜻하게, 대비 살짝
    r = (r - 128) * 1.06 + 128 + 5; g = (g - 128) * 1.06 + 128 + 2; b = (b - 128) * 1.06 + 128 - 4;
    const nx = x / W - 0.5, ny = y / H - 0.5;
    const vig = 1 - (painterly ? 0.16 : 0.38) * smooth(0.3, 0.78, Math.sqrt(nx * nx + ny * ny * 0.8));
    const weave = (Math.sin(x * 1.6) * Math.sin(y * 1.6)) * 0.5 + 0.5;
    const tex = 0.96 + 0.05 * weave + (R() - 0.5) * 0.03;
    sd[p] = clamp(r * vig * tex, 0, 255); sd[p + 1] = clamp(g * vig * tex, 0, 255); sd[p + 2] = clamp(b * vig * tex, 0, 255);
  }
  ug.putImageData(s, 0, 0);
  return framePainting(up);
}
// 신경망 결과 검사 — 원본과 명암 구조가 닮지 않으면(낙서처럼 깨진 출력) 버린다
export function styledLooksValid(styled, comp) {
  const w = 48, h = 64;
  const a = canvas(w, h), b = canvas(w, h);
  a.getContext('2d').drawImage(styled, 0, 0, w, h); b.getContext('2d').drawImage(comp, 0, 0, w, h);
  const da = a.getContext('2d').getImageData(0, 0, w, h).data, db = b.getContext('2d').getImageData(0, 0, w, h).data;
  const n = w * h, la = new Float32Array(n), lb = new Float32Array(n);
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { la[i] = da[i * 4] * 0.3 + da[i * 4 + 1] * 0.59 + da[i * 4 + 2] * 0.11; lb[i] = db[i * 4] * 0.3 + db[i * 4 + 1] * 0.59 + db[i * 4 + 2] * 0.11; ma += la[i]; mb += lb[i]; }
  ma /= n; mb /= n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { const x = la[i] - ma, y = lb[i] - mb; sab += x * y; saa += x * x; sbb += y * y; }
  const corr = sab / Math.sqrt(saa * sbb + 1e-6), sd = Math.sqrt(saa / n);
  return { ok: corr > 0.45 && sd > 12 && ma > 15 && ma < 240, corr, sd, mean: ma };
}

// 금박 액자 — 절차 생성 (카드와 같은 크기 → 비교 슬라이더가 정확히 겹친다)
export function framePainting(painting) {
  const out = canvas(CARD_W, CARD_H), g = out.getContext('2d');
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, CARD_W, CARD_H);
  const F = 60;
  const bands = [[0, '#6e4f1e'], [6, '#c9a14f'], [16, '#f0d58e'], [24, '#a77c33'], [34, '#e2bf70'], [44, '#7d5a22'], [52, '#3a2a12']];
  bands.forEach(([inset, col], i) => {
    const gr = g.createLinearGradient(0, 0, CARD_W, CARD_H);
    gr.addColorStop(0, col); gr.addColorStop(0.5, shade(col, 1.15)); gr.addColorStop(1, shade(col, 0.82));
    g.fillStyle = gr;
    g.fillRect(inset, inset, CARD_W - inset * 2, CARD_H - inset * 2);
  });
  // 장식 알갱이 띠
  g.fillStyle = 'rgba(255,236,180,.55)';
  for (let x = 30; x < CARD_W - 30; x += 12) { g.beginPath(); g.arc(x, 29, 2.4, 0, 7); g.arc(x, CARD_H - 29, 2.4, 0, 7); g.fill(); }
  for (let y = 30; y < CARD_H - 30; y += 12) { g.beginPath(); g.arc(29, y, 2.4, 0, 7); g.arc(CARD_W - 29, y, 2.4, 0, 7); g.fill(); }
  // 그림 (액자 안 780×1080 — 3:4 원본을 꽉 차게)
  const iw = CARD_W - F * 2, ih = CARD_H - F * 2;
  const sc = Math.max(iw / painting.width, ih / painting.height);
  const dw = painting.width * sc, dh = painting.height * sc;
  g.save(); g.beginPath(); g.rect(F, F, iw, ih); g.clip();
  g.drawImage(painting, F + (iw - dw) / 2, F + (ih - dh) * 0.3, dw, dh);
  const lip = g.createLinearGradient(F, F, F + 18, F + 18);
  lip.addColorStop(0, 'rgba(0,0,0,.45)'); lip.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lip; g.fillRect(F, F, iw, 18); g.fillRect(F, F, 18, ih);
  g.restore();
  g.strokeStyle = 'rgba(40,26,10,.8)'; g.lineWidth = 2; g.strokeRect(F - 1, F - 1, iw + 2, ih + 2);
  eraPlate(g, CARD_W / 2, CARD_H - F / 2, ERA_PAINT);
  return out;
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) * k, 0, 255) | 0, g = clamp(((n >> 8) & 255) * k, 0, 255) | 0, b = clamp((n & 255) * k, 0, 255) | 0;
  return `rgb(${r},${g},${b})`;
}
