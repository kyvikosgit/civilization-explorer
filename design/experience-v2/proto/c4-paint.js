// C4 내 초상 — 같은 한 장(3:4, 780×1040)에서 '초상화' 한 벌을 기기 안에서 그린다. AI · 신경망 · 서버 없음, WebGL2 + 캔버스 필터만.
//   1. 얼굴 자리: 작은 축소본에서 피부색(YCbCr) 무게중심을 몇 번 좁혀 간다 — 못 찾으면 가운데 위
//   2. GPU: 구조 텐서(Sobel) → 가우시안 → 비등방 쿠와하라 두 번(Kyprianidis 2010, 다항식 가중 8부채꼴)
//      얼굴은 작은 붓, 옷 · 배경으로 갈수록 큰 붓. 이어서 팔레트(번트 엄버 그늘 · 오커 · 크림 빛)와
//      인물 둘레를 어두운 바탕으로(머리 + 어깨 틀, 머리 뒤 한쪽만 조금 밝게) = 화가가 볼 '목표 그림'
//   3. 캔버스: 붓질 — 굵은 붓(밑칠) → 중간 붓(어긋난 곳만) → 가는 붓(윤곽 · 얼굴 둘레만), 붓마다 결을 따라 휘어 간다(Hertzmann 1998 방식)
//      붓마다 물감 높이도 따로 그린다(임파스토)
//   4. GPU: 얼굴은 매끈하게(목표 그림을 다시 덮어 바른 듯), 붓결(털 자국을 결 방향으로 적분) · 왼쪽 위 빛의 임파스토 ·
//      얇은 곳에 비치는 캔버스 평직 · 니스(누렇게, 빛 눌러 담기) · 가장자리 어둡게
//   WebGL2 가 없으면 → 부스 워커의 쿠와하라(canvas)로 대신(c4.js).
// 액자: 그림 = 금박 액자, 사진 = 카르트 드 비지트 대지. 둘 다 900×1220, 창(그림 · 판)은 같은 자리(70,70,760,1013) → 가운데 슬라이더로 정확히 겹친다.

export const WORK_W = 780, WORK_H = 1040;
export const FRAME_W = 900, FRAME_H = 1220;
export const WIN = { x: 70, y: 70, w: 760, h: 1013 };

const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ── 1. 얼굴 자리 — 피부색 화소의 무게중심을 사전 확률(가운데 위)에서 출발해 세 번 좁혀 간다. r = 얼굴 반폭(가로 uv)
export function findFace(comp) {
  const w = 60, h = 80, c = cv(w, h), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(comp, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, skin = new Float32Array(w * h);
  let any = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = (y * w + x) * 4, r = d[p], gg = d[p + 1], b = d[p + 2];
    const Y = 0.299 * r + 0.587 * gg + 0.114 * b, cb = 128 - 0.168736 * r - 0.331264 * gg + 0.5 * b, cr = 128 + 0.5 * r - 0.418688 * gg - 0.081312 * b;
    if (Y < 50 || cr < 141 || cr > 176 || cb < 76 || cb > 126 || r < gg || r - b < 28) continue;
    skin[y * w + x] = 1 - Math.abs(cr - 155) / 26; any++;
  }
  if (any < 6) return { cx: 0.5, cy: 0.33, r: 0.17, found: false };
  // 이어진 덩어리(8방향)마다 점수: 위쪽일수록 · 가운데일수록 · 얼굴다운 크기 · 모양일수록. 밝은 옷(크림색 블라우스)이나 손보다 얼굴이 이긴다
  const lab = new Int32Array(w * h).fill(-1), comps = [];
  for (let i = 0; i < w * h; i++) {
    if (!skin[i] || lab[i] >= 0) continue;
    const c0 = { n: 0, x0: w, x1: 0, y0: h, y1: 0, sx: 0 }, st = [i]; lab[i] = comps.length;
    while (st.length) {
      const j = st.pop(), x = j % w, y = (j / w) | 0;
      c0.n++; c0.sx += x; c0.x0 = Math.min(c0.x0, x); c0.x1 = Math.max(c0.x1, x); c0.y0 = Math.min(c0.y0, y); c0.y1 = Math.max(c0.y1, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const k = yy * w + xx; if (skin[k] && lab[k] < 0) { lab[k] = comps.length; st.push(k); }
      }
    }
    comps.push(c0);
  }
  let best = null, bs = 0;
  for (const c0 of comps) {
    if (c0.n < 14) continue;
    const bw = (c0.x1 - c0.x0 + 1) / w, fh = Math.min((c0.y1 - c0.y0 + 1) / h, bw * 1.35 * (w / h)), cx = (c0.sx / c0.n + 0.5) / w, cy = c0.y0 / h + fh * 0.62;   // 이마 · 머리 빛이 섞여 덩어리가 조금 위로 잡힌다
    const fill = c0.n / ((c0.x1 - c0.x0 + 1) * (c0.y1 - c0.y0 + 1));
    const score = Math.max(0, 1.12 - cy) * Math.exp(-((cx - 0.5) ** 2) / 0.07) * Math.min(1, c0.n / 50) * (fill > 0.3 ? 1 : 0.6) * (bw > 0.75 ? 0.5 : 1);
    if (score > bs) { bs = score; best = { cx, cy, r: bw / 2 * 1.05 }; }
  }
  if (!best) return { cx: 0.5, cy: 0.33, r: 0.17, found: false };
  return { cx: clamp(best.cx, 0.2, 0.8), cy: clamp(best.cy, 0.1, 0.6), r: clamp(best.r, 0.06, 0.3), found: true };
}

// ── 인물 틀 + 색 분포로 다듬은 인물 가리개(학습된 모델 없음 — 색 히스토그램 역투영)
//   틀 안쪽 색 분포 vs 틀 바깥 색 분포를 세어, 틀의 부드러운 가장자리 · 어깨 옆 빈자리에서 '인물 색'만 남긴다
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function figureT(u, v, face, asp) {
  const qx = (u - face.cx) / face.r, qy = (v - face.cy) * asp / face.r;
  const head = 1 - sm(0.95, 1.9, Math.hypot(qx / 1.4, (qy + 0.2) / 1.65));
  const hw = 0.75 + 1.75 * sm(1.1, 2.9, qy) + Math.max(0, qy - 6) * 0.05;
  const body = (1 - sm(0.78, 1.6, Math.abs(qx) / hw)) * sm(0.5, 1.3, qy);
  // 믿는 자리: 얼굴과 목(아래로 긴 타원) · 몸 가운데 기둥 — 여기는 색이 바탕과 비슷해도(그늘진 목 · 짙은 치마) 인물로 둔다
  const core = Math.max(1 - sm(0.7, 1.45, Math.hypot(qx / 1.1, (qy - 0.6) / 1.5)), (1 - sm(0.35, 0.7, Math.abs(qx) / hw)) * sm(1.0, 1.8, qy));
  return [Math.max(head, body), core];
}
export function figureMask(comp, face) {
  const w = 195, h = 260, asp = comp.height / comp.width, c = cv(w, h), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(comp, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, B = 12, bin = (p) => ((d[p] * B) >> 8) * B * B + ((d[p + 1] * B) >> 8) * B + ((d[p + 2] * B) >> 8);
  const hf = new Float32Array(B * B * B), hb = new Float32Array(B * B * B), T = new Float32Array(w * h), HD = new Float32Array(w * h);
  let nf = 0, nb = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, [t, hd] = figureT((x + 0.5) / w, (y + 0.5) / h, face, asp); T[i] = t; HD[i] = hd;
    const k = bin(i * 4);
    if (t > 0.9) { hf[k] += 1; nf++; } else if (t < 0.12) { hb[k] += 1; nb++; }
  }
  // 이웃 칸으로 조금 번지게(빈 칸 때문에 얼룩지지 않게)
  const P = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const k = bin(i * 4), f = (hf[k] + 0.5) / (nf + 1), b = (hb[k] + 0.5) / (nb + 1);
    P[i] = nb < 50 ? 1 : f / (f + b);
  }
  // 흐리게(상자 2번) → 부드러운 가장자리
  const box = (a, r) => { const o = new Float32Array(a.length);
    for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += a[y * w + clamp(x, 0, w - 1)]; for (let x = 0; x < w; x++) { o[y * w + x] = s / (2 * r + 1); s += a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)]; } }
    const o2 = new Float32Array(a.length);
    for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += o[clamp(y, 0, h - 1) * w + x]; for (let y = 0; y < h; y++) { o2[y * w + x] = s / (2 * r + 1); s += o[Math.min(h - 1, y + r + 1) * w + x] - o[Math.max(0, y - r) * w + x]; } }
    return o2; };
  const Ps = box(box(P, 2), 2);
  const M = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) M[i] = T[i] * Math.max(HD[i], sm(0.42, 0.72, Ps[i]));
  const Ms = box(M, 1);
  const out = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const vv = clamp(Ms[i] * 255, 0, 255); out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = vv; out.data[i * 4 + 3] = 255; }
  g.putImageData(out, 0, 0);
  return c;
}

// ── 2·4. WebGL2 셰이더
const VS = `#version 300 es
in vec2 a; out vec2 v; void main(){ v = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;
const HEAD = `#version 300 es
precision highp float; in vec2 v; out vec4 o;`;

const FS_BLUR = `${HEAD} uniform sampler2D t; uniform vec2 d; uniform float sigma;
void main(){ int r = int(ceil(sigma * 2.5)); vec4 s = vec4(0.0); float ws = 0.0;
  for (int i = -r; i <= r; i++) { float w = exp(-float(i * i) / (2.0 * sigma * sigma)); s += texture(t, v + d * float(i)) * w; ws += w; }
  o = s / ws; }`;

// 구조 텐서 (E, G, F) — 부동소수 대상이 없으면 0..1 로 눌러 담는다(enc)
const FS_TENSOR = `${HEAD} uniform sampler2D t; uniform vec2 px; uniform float enc;
vec3 S(float x, float y){ return texture(t, v + vec2(x, y) * px).rgb; }
void main(){
  vec3 fx = (-S(-1.,-1.) - 2.0*S(-1.,0.) - S(-1.,1.) + S(1.,-1.) + 2.0*S(1.,0.) + S(1.,1.)) / 4.0;
  vec3 fy = (-S(-1.,-1.) - 2.0*S(0.,-1.) - S(1.,-1.) + S(-1.,1.) + 2.0*S(0.,1.) + S(1.,1.)) / 4.0;
  vec3 T = vec3(dot(fx, fx), dot(fy, fy), dot(fx, fy));
  o = enc > 0.5 ? vec4(clamp(T.x * 6.0, 0.0, 1.0), clamp(T.y * 6.0, 0.0, 1.0), clamp(T.z * 3.0 + 0.5, 0.0, 1.0), 1.0) : vec4(T, 1.0); }`;

const TFM = `uniform sampler2D tfm; uniform float enc;
vec3 tens(vec2 uv){ vec3 T = texture(tfm, uv).rgb; return enc > 0.5 ? vec3(T.x / 6.0, T.y / 6.0, (T.z - 0.5) / 3.0) : T; }
// 결 방향(변화가 가장 적은 쪽) · 비등방도
vec3 flow(vec2 uv){ vec3 T = tens(uv); float E = T.x, G = T.y, F = T.z;
  float D = sqrt(max(0.0, (G - E) * (G - E) + 4.0 * F * F)), l1 = 0.5 * (G + E + D), l2 = 0.5 * (G + E - D);
  vec2 d = vec2(l1 - E, -F); d = dot(d, d) > 1e-12 ? normalize(d) : vec2(0.0, 1.0);
  float A = l1 + l2 > 1e-7 ? (l1 - l2) / (l1 + l2) : 0.0; return vec3(d, A); }`;

// 얼굴까지의 거리(얼굴 반폭 단위) · 인물 틀(머리 + 목 · 어깨 · 몸) — 서 있는 전신이든 셀카든 같은 틀
const FACE = `uniform vec4 face; // cx, cy, r(가로 uv), H/W
vec2 fq(vec2 uv){ return (uv - face.xy) * vec2(1.0, face.w) / face.z; }
float faceD(vec2 uv){ vec2 q = fq(uv); return length(q / vec2(1.0, 1.25)); }
float figure(vec2 uv){ vec2 q = fq(uv);
  float head = 1.0 - smoothstep(0.95, 1.9, length((q - vec2(0.0, -0.2)) / vec2(1.4, 1.65)));
  float hw = mix(0.75, 2.5, smoothstep(1.1, 2.9, q.y)) + max(0.0, q.y - 6.0) * 0.05;
  float body = (1.0 - smoothstep(0.78, 1.6, abs(q.x) / hw)) * smoothstep(0.5, 1.3, q.y);
  return max(head, body); }`;

// 비등방 쿠와하라 — 다항식 가중(8 부채꼴), 반지름은 얼굴에서 멀수록 크게
const FS_AKF = `${HEAD} uniform sampler2D t; uniform vec2 res; uniform vec2 rad; uniform float q; ${TFM} ${FACE}
void main(){
  vec3 fl = flow(v); vec2 dir = fl.xy; float A = fl.z;
  float radius = mix(rad.x, rad.y, smoothstep(0.8, 3.0, faceD(v)));
  float alpha = 1.0;
  float a = radius * clamp((alpha + A) / alpha, 0.1, 2.0), b = radius * clamp(alpha / (alpha + A), 0.1, 2.0);
  float phi = -atan(dir.y, dir.x), cp = cos(phi), sp = sin(phi);
  mat2 R = mat2(cp, -sp, sp, cp), Sm = mat2(0.5 / a, 0.0, 0.0, 0.5 / b), SR = Sm * R;
  int mx = int(sqrt(a * a * cp * cp + b * b * sp * sp)), my = int(sqrt(a * a * sp * sp + b * b * cp * cp));
  float zeta = 2.0 / radius, zc = 0.58, eta = (zeta + cos(zc)) / (sin(zc) * sin(zc));
  vec4 m[8]; vec3 s[8];
  for (int k = 0; k < 8; k++) { m[k] = vec4(0.0); s[k] = vec3(0.0); }
  for (int j = -my; j <= my; j++) for (int i = -mx; i <= mx; i++) {
    vec2 p = SR * vec2(float(i), float(j));
    if (dot(p, p) > 0.25) continue;
    vec3 c = texture(t, v + vec2(float(i), float(j)) / res).rgb;
    float w[8]; float sum = 0.0; float z; float vxx; float vyy;
    vxx = zeta - eta * p.x * p.x; vyy = zeta - eta * p.y * p.y;
    z = max(0.0, p.y + vxx); w[0] = z * z; z = max(0.0, -p.x + vyy); w[2] = z * z;
    z = max(0.0, -p.y + vxx); w[4] = z * z; z = max(0.0, p.x + vyy); w[6] = z * z;
    vec2 p2 = 0.70710678 * vec2(p.x - p.y, p.x + p.y);
    vxx = zeta - eta * p2.x * p2.x; vyy = zeta - eta * p2.y * p2.y;
    z = max(0.0, p2.y + vxx); w[1] = z * z; z = max(0.0, -p2.x + vyy); w[3] = z * z;
    z = max(0.0, -p2.y + vxx); w[5] = z * z; z = max(0.0, p2.x + vyy); w[7] = z * z;
    for (int k = 0; k < 8; k++) sum += w[k];
    float g = exp(-3.125 * dot(p, p)) / max(sum, 1e-6);
    for (int k = 0; k < 8; k++) { float wk = w[k] * g; m[k] += vec4(c * wk, wk); s[k] += c * c * wk; }
  }
  vec4 acc = vec4(0.0);
  for (int k = 0; k < 8; k++) {
    if (m[k].w <= 1e-6) continue;
    vec3 mu = m[k].rgb / m[k].w; vec3 var = abs(s[k] / m[k].w - mu * mu);
    float sg = var.r + var.g + var.b;
    float w = 1.0 / (1.0 + pow(1000.0 * sg, 0.5 * q));
    acc += vec4(mu * w, w);
  }
  o = vec4(acc.w > 0.0 ? acc.rgb / acc.w : texture(t, v).rgb, 1.0); }`;

const NOISE = `uniform float seed;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21) + seed); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * vn(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }`;

// 목표 그림 — 팔레트 · 명암 · 인물 둘레 어두운 바탕. a = 인물 틀(붓 크기에 쓴다)
const FS_GRADE = `${HEAD} uniform sampler2D t; uniform sampler2D M; uniform vec2 res; ${FACE} ${NOISE}
float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
void main(){
  vec3 c = texture(t, v).rgb; vec2 px = v * res;
  float l = luma(c);
  // 차가운 색은 흙빛 쪽으로, 전체는 조금 따뜻하게(채도는 남긴다)
  float cool = clamp((c.b - c.r) * 2.5, 0.0, 1.0);
  c = mix(c, vec3(l) * vec3(1.0, 0.97, 0.86), cool * 0.55);
  c = mix(vec3(l), c, 0.92) * vec3(1.05, 1.0, 0.88);
  vec3 earth = l < 0.5 ? mix(vec3(0.07, 0.042, 0.026), vec3(0.52, 0.34, 0.2), l / 0.5) : mix(vec3(0.52, 0.34, 0.2), vec3(0.98, 0.9, 0.74), (l - 0.5) / 0.5);
  c = mix(c, earth, 0.16);
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.5);
  // 바탕 — 인물 틀 밖은 짙은 갈색 칠(원래 장면은 아주 희미하게만), 머리 뒤 한쪽은 따뜻하게 밝다
  float fig = smoothstep(0.25, 0.8, texture(M, v).r);
  vec2 hq = fq(v) - vec2(-1.7, 0.4);
  float halo = exp(-dot(hq, hq) / 16.0);
  vec3 ground = mix(vec3(0.14, 0.096, 0.058), vec3(0.41, 0.3, 0.18), halo);
  ground *= 0.8 + 0.4 * fbm(px / 170.0) + 0.1 * fbm(px / 40.0);
  ground = mix(ground, ground * (0.6 + 1.0 * luma(c)), 0.16);   // 원래 장면은 어둠 속에 아주 희미하게
  // 가장자리 띠는 바탕 쪽으로 — 밝은 원래 배경이 후광처럼 남지 않게(띠 안에서는 밝기 상한)
  float lim = mix(luma(ground) * 1.4 + 0.03, 1.0, smoothstep(0.55, 0.95, fig));
  c *= min(1.0, lim / max(luma(c), 1e-3));
  c = mix(ground, c, fig * sqrt(fig));
  // 인물 안에서도 틀 가장자리로 갈수록 그늘에 잠긴다
  c *= mix(0.8, 1.0, smoothstep(0.0, 0.9, fig));
  o = vec4(clamp(c, 0.0, 1.0), fig); }`;

// 결 · 비등방도 · 윤곽 세기 (8비트로 읽어 붓질에 쓴다)
const FS_FLOWOUT = `${HEAD} uniform sampler2D k; ${TFM}
void main(){ vec3 f = flow(v); vec3 T = tens(v); o = vec4(f.xy * 0.5 + 0.5, f.z, clamp(sqrt(T.x + T.y) * 3.0, 0.0, 1.0)); }`;

// 붓결 — 털 자국 노이즈를 결 방향으로 적분(LIC). 얼굴은 짧게, 바탕은 길게
const FS_LIC = `${HEAD} uniform vec2 res; uniform vec2 len; ${TFM} ${FACE} ${NOISE}
float bristle(vec2 p){ return vn(p / 1.2) * 0.6 + vn(p / 2.6 + 17.0) * 0.4; }
void main(){
  vec2 p0 = v * res;
  float L = mix(len.x, len.y, smoothstep(0.8, 3.0, faceD(v)));
  float sum = bristle(p0), ws = 1.0;
  for (int sgn = 0; sgn < 2; sgn++) {
    vec2 p = p0; vec2 d = flow(v).xy * (sgn == 0 ? 1.0 : -1.0);
    for (int i = 1; i <= 24; i++) {
      if (float(i) > L) break;
      vec2 t = flow(p / res).xy; if (dot(t, d) < 0.0) t = -t; d = t; p += t;
      float w = 1.0 - float(i) / (L + 1.0);
      sum += bristle(p) * w; ws += w;
    }
  }
  o = vec4(clamp((sum / ws - 0.5) * (2.8 + L * 0.12) + 0.5, 0.0, 1.0), 0.0, 0.0, 1.0); }`;

// 마무리 — 붓질 그림 + 얼굴 매끈하게 + 임파스토 · 캔버스 · 니스 (기본 프레임버퍼에 뒤집어 그린다)
const FS_FINAL = `${HEAD} uniform sampler2D C; uniform sampler2D Hs; uniform sampler2D Hb; uniform sampler2D Tg; uniform vec2 res; ${FACE} ${NOISE}
float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
float Hh(vec2 uv){ return texture(Hs, uv).r * 0.75 + (texture(Hb, uv).r - 0.5) * 0.3; }
void main(){
  vec2 uv = vec2(v.x, 1.0 - v.y), px = uv * res;
  vec3 c = texture(C, uv).rgb;
  vec4 tg = texture(Tg, uv);
  float fd = faceD(uv);
  float smoothF = 1.0 - smoothstep(0.7, 1.45, fd);         // 얼굴 — 붓 자국 없이 바른 듯
  c = mix(c, tg.rgb, smoothF * 0.78);
  float l = luma(c);
  // 임파스토 — 밝은 곳은 물감이 두껍고 어두운 곳 · 바탕은 얇다. 왼쪽 위에서 빛
  float thick = mix(0.4, 1.0, smoothstep(0.2, 0.78, l)) * mix(0.75, 1.0, tg.a) * (1.0 - smoothF * 0.8);
  vec2 e = 1.0 / res;
  float hx = Hh(uv + vec2(e.x, 0.0)) - Hh(uv - vec2(e.x, 0.0));
  float hy = Hh(uv + vec2(0.0, e.y)) - Hh(uv - vec2(0.0, e.y));
  float k = 3.2 * thick;
  // 캔버스 평직 — 얇은 곳에서 더 비친다
  vec2 w = px / 3.2 + vec2(vn(px / 40.0), vn(px / 40.0 + 9.0)) * 0.6;
  vec2 cf = floor(w), ff = fract(w) - 0.5; float chk = mod(cf.x + cf.y, 2.0);
  float th = (chk > 0.5 ? cos(ff.y * 3.14159) * (0.7 + 0.3 * cos(ff.x * 1.5708)) : cos(ff.x * 3.14159) * (0.7 + 0.3 * cos(ff.y * 1.5708))) * (0.85 + 0.3 * h21(cf));
  float vis = mix(1.0, 0.2, thick);
  vec2 wn = chk > 0.5 ? vec2(0.0, -sin(ff.y * 3.14159)) : vec2(-sin(ff.x * 3.14159), 0.0);
  vec3 n = normalize(vec3(-hx * k + wn.x * 0.12 * vis, -hy * k + wn.y * 0.12 * vis, 1.0));
  vec3 Ld = normalize(vec3(-0.55, -0.62, 0.75));            // 화면 왼쪽 위(픽셀 y 는 아래로)
  float dif = dot(n, Ld) / Ld.z;
  c *= 0.84 + 0.16 * dif;
  float spec = pow(max(dot(reflect(-Ld, n), vec3(0.0, 0.0, 1.0)), 0.0), 28.0);
  c += vec3(1.0, 0.94, 0.82) * spec * 0.2 * thick * smoothstep(0.3, 0.8, l);
  c *= 1.0 - 0.08 * vis * (1.0 - th);
  // 니스 — 누렇게 · 빛은 눌러 담고 · 가장자리 어둡게
  c = c * vec3(1.0, 0.96, 0.86) + vec3(0.01, 0.005, 0.0);
  c = (1.0 - exp(-c * 1.5)) / (1.0 - exp(-1.5));
  vec2 vq = (uv - 0.5) * vec2(1.0, 1.15);
  c *= 1.0 - 0.22 * smoothstep(0.34, 0.86, length(vq));
  o = vec4(clamp(c, 0.0, 1.0), 1.0); }`;

function gl2(w, h) {
  const c = cv(w, h);
  const gl = c.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
  if (!gl) throw new Error('webgl2_unavailable');
  const fext = gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float');
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const progs = {};
  const prog = (name, fs) => {
    if (progs[name]) return progs[name];
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(`${name}: ${gl.getShaderInfoLog(o)}`); return o; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`${name}: ${gl.getProgramInfoLog(p)}`);
    return (progs[name] = p);
  };
  const tex = (src, tw, th, float) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    else if (float) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, tw, th, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, tw, th, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return t;
  };
  const target = (tw, th, float) => {
    const t = tex(null, tw, th, float), f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('fbo_incomplete');
    return { t, f, w: tw, h: th };
  };
  const run = (p, out, uniforms, texs) => {
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.f : null);
    gl.viewport(0, 0, out ? out.w : w, out ? out.h : h);
    gl.enableVertexAttribArray(0); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    Object.entries(texs || {}).forEach(([k, t], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(gl.getUniformLocation(p, k), i); });
    Object.entries(uniforms || {}).forEach(([k, val]) => {
      const u = gl.getUniformLocation(p, k); if (!u) return;
      if (typeof val === 'number') gl.uniform1f(u, val); else if (val.length === 2) gl.uniform2fv(u, val); else if (val.length === 3) gl.uniform3fv(u, val); else gl.uniform4fv(u, val);
    });
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const read = (tg) => { const out = new Uint8Array(tg.w * tg.h * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, tg.f); gl.readPixels(0, 0, tg.w, tg.h, gl.RGBA, gl.UNSIGNED_BYTE, out); return out; };
  return { gl, c, prog, tex, target, run, read, float: !!fext };
}

// ── 3. 붓질 — 목표 그림(tg) · 결(fl)을 읽고 캔버스 두 장(색 · 물감 높이)에 그린다. 위에서부터 행 순서(readPixels 와 같은 방향)
function brushwork(tg, fl, W, H, face, seed = 5) {
  const rnd = rng(seed);
  const C = cv(W, H), g = C.getContext('2d', { willReadFrequently: true });
  const Hc = cv(W, H), hg = Hc.getContext('2d');
  // 밑칠: 목표 그림을 흐리게 깔고, 높이는 얇게
  const opaque = new Uint8ClampedArray(tg); for (let i = 3; i < opaque.length; i += 4) opaque[i] = 255;   // a 에는 인물 가리개가 들어 있다
  const base = cv(W, H); base.getContext('2d').putImageData(new ImageData(opaque, W, H), 0, 0);
  g.filter = 'blur(7px)'; g.drawImage(base, 0, 0); g.filter = 'none';
  // 바탕용 흐린 목표 — 바탕 붓은 이웃끼리 비슷한 색으로(얼룩덜룩한 반점이 아니라 문질러 섞은 바탕)
  const blc = cv(W, H), blg = blc.getContext('2d', { willReadFrequently: true }); blg.filter = 'blur(9px)'; blg.drawImage(base, 0, 0);
  const tb = blg.getImageData(0, 0, W, H).data;
  hg.fillStyle = 'rgb(70,70,70)'; hg.fillRect(0, 0, W, H);
  const at = (x, y) => { const xi = clamp(x | 0, 0, W - 1), yi = clamp(y | 0, 0, H - 1); return (yi * W + xi) * 4; };
  const dirAt = (x, y) => { const p = at(x, y); return [fl[p] / 127.5 - 1, fl[p + 1] / 127.5 - 1, fl[p + 2] / 255, fl[p + 3] / 255]; };
  const faceD = (x, y) => { const qx = (x / W - face.cx) / face.r, qy = (y / H - face.cy) * (H / W) / face.r; return Math.hypot(qx, qy / 1.25); };
  const LAYERS = [
    { r: 9.5, sp: 7.5, len: 34, thr: 0, segs: 5 },
    { r: 5.2, sp: 4.2, len: 20, thr: 0.045, segs: 4 },
    { r: 2.5, sp: 2.4, len: 10, thr: 0.06, segs: 3, fine: true },
  ];
  let count = 0;
  for (const L of LAYERS) {
    const cur = L.thr ? g.getImageData(0, 0, W, H).data : null;
    const pts = [];
    for (let y = L.sp / 2; y < H; y += L.sp) for (let x = L.sp / 2; x < W; x += L.sp) pts.push([x + (rnd() - 0.5) * L.sp, y + (rnd() - 0.5) * L.sp]);
    for (let i = pts.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [pts[i], pts[j]] = [pts[j], pts[i]]; }
    g.lineCap = hg.lineCap = 'round'; g.lineJoin = hg.lineJoin = 'round';
    for (const [x, y] of pts) {
      const fd = faceD(x, y), p = at(x, y), fig = tg[p + 3] / 255;
      const [dx0, dy0, A, edge] = dirAt(x, y);
      if (L.fine && edge < 0.12 && fd > 2.2) continue;
      if (cur) {
        let err = 0;
        for (const [ox, oy] of [[0, 0], [L.r * 0.6, 0], [-L.r * 0.6, 0], [0, L.r * 0.6], [0, -L.r * 0.6]]) { const q = at(x + ox, y + oy); err += Math.abs(cur[q] - tg[q]) + Math.abs(cur[q + 1] - tg[q + 1]) + Math.abs(cur[q + 2] - tg[q + 2]); }
        if (err / (5 * 3 * 255) < L.thr) continue;
      }
      // 붓 크기: 얼굴 둘레는 작게, 바탕(인물 틀 밖)은 크게
      const sc = (fd < 1.3 ? 0.6 : fd < 2.4 ? 0.82 : 1) * (1.35 - 0.35 * fig);
      const r = L.r * sc * (0.85 + rnd() * 0.3);
      const mb = (1 - fig) * 0.85, cr = tg[p] + (tb[p] - tg[p]) * mb, cg = tg[p + 1] + (tb[p + 1] - tg[p + 1]) * mb, cb = tg[p + 2] + (tb[p + 2] - tg[p + 2]) * mb;
      // 결을 따라 휘어 간다 — 색이 많이 달라지면 멈춘다
      const len = L.len * sc * (0.55 + 0.6 * A + rnd() * 0.35), step = len / L.segs;
      const path = [[x, y]];
      let px = x, py = y, dx = dx0, dy = dy0;
      if (rnd() < 0.5) { dx = -dx; dy = -dy; }
      for (let s = 0; s < L.segs; s++) {
        const nx = px + dx * step, ny = py + dy * step;
        if (nx < -4 || ny < -4 || nx > W + 4 || ny > H + 4) break;
        const q = at(nx, ny), dc = Math.abs(tg[q] - cr) + Math.abs(tg[q + 1] - cg) + Math.abs(tg[q + 2] - cb);
        if (s > 0 && dc > 3 * 255 * 0.085) break;
        path.push([nx, ny]); px = nx; py = ny;
        let [ex, ey] = dirAt(nx, ny); if (ex * dx + ey * dy < 0) { ex = -ex; ey = -ey; }
        dx = dx * 0.35 + ex * 0.65; dy = dy * 0.35 + ey * 0.65; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
      }
      if (path.length < 2) path.push([x + dx * r * 0.7, y + dy * r * 0.7]);
      const j = 1 + (rnd() - 0.5) * 0.07, jr = (rnd() - 0.5) * 6;
      g.strokeStyle = `rgb(${clamp(cr * j + jr, 0, 255) | 0},${clamp(cg * j, 0, 255) | 0},${clamp(cb * j - jr * 0.5, 0, 255) | 0})`;
      g.globalAlpha = fig > 0.5 ? 0.88 + rnd() * 0.12 : 0.5 + rnd() * 0.25; g.lineWidth = r * 2;
      g.beginPath(); g.moveTo(path[0][0], path[0][1]); for (let k = 1; k < path.length; k++) g.lineTo(path[k][0], path[k][1]); g.stroke();
      // 물감 높이: 붓마다 다른 두께의 판 + 가운데 조금 더 두껍게
      const hv = 80 + rnd() * 120;
      hg.strokeStyle = `rgb(${hv | 0},${hv | 0},${hv | 0})`; hg.lineWidth = r * 2;
      hg.beginPath(); hg.moveTo(path[0][0], path[0][1]); for (let k = 1; k < path.length; k++) hg.lineTo(path[k][0], path[k][1]); hg.stroke();
      const hv2 = Math.min(255, hv + 26);
      hg.strokeStyle = `rgb(${hv2 | 0},${hv2 | 0},${hv2 | 0})`; hg.lineWidth = r * 0.9;
      hg.stroke();
      count++;
    }
  }
  g.globalAlpha = 1;
  return { C, Hc, count };
}

// comp: 780×1040 캔버스(사진과 같은 한 장). 반환: 780×1040 그림 캔버스
export function paintPortrait(comp, face = findFace(comp)) {
  const W = WORK_W, H = WORK_H, G = gl2(W, H), { gl } = G;
  const F = G.float, enc = F ? 0 : 1;
  const faceU = [face.cx, face.cy, face.r, H / W];
  const src = G.tex(comp);
  const blur = G.prog('blur', FS_BLUR);
  // 텐서는 살짝 흐린 원본에서(카메라 잡티가 결을 흔들지 않게)
  const s1 = G.target(W, H), s2 = G.target(W, H);
  G.run(blur, s1, { d: [1 / W, 0], sigma: 1.2 }, { t: src });
  G.run(blur, s2, { d: [0, 1 / H], sigma: 1.2 }, { t: s1.t });
  const T0 = G.target(W, H, F), T1 = G.target(W, H, F), T2 = G.target(W, H, F);
  G.run(G.prog('tensor', FS_TENSOR), T0, { px: [1 / W, 1 / H], enc }, { t: s2.t });
  G.run(blur, T1, { d: [1 / W, 0], sigma: 3.0 }, { t: T0.t });
  G.run(blur, T2, { d: [0, 1 / H], sigma: 3.0 }, { t: T1.t });
  const akf = G.prog('akf', FS_AKF);
  const K1 = G.target(W, H), K2 = G.target(W, H);
  G.run(akf, K1, { res: [W, H], rad: [2.4, 7.0], q: 8, enc, face: faceU }, { t: src, tfm: T2.t });
  G.run(akf, K2, { res: [W, H], rad: [1.5, 3.5], q: 8, enc, face: faceU }, { t: K1.t, tfm: T2.t });
  const TG = G.target(W, H), FL = G.target(W, H), HB = G.target(W, H);
  const tM = G.tex(figureMask(comp, face));
  G.run(G.prog('grade', FS_GRADE), TG, { res: [W, H], face: faceU, seed: 0.23 }, { t: K2.t, M: tM });
  G.run(G.prog('flowout', FS_FLOWOUT), FL, { enc }, { tfm: T2.t });
  G.run(G.prog('lic', FS_LIC), HB, { res: [W, H], len: [5, 16], enc, face: faceU, seed: 0.37 }, { tfm: T2.t });
  const tg = G.read(TG), fl = G.read(FL);
  const B = brushwork(tg, fl, W, H, face);
  const tC = G.tex(B.C), tH = G.tex(B.Hc);
  G.run(G.prog('final', FS_FINAL), null, { res: [W, H], face: faceU, seed: 0.61 }, { C: tC, Hs: tH, Hb: HB.t, Tg: TG.t });
  const out = cv(W, H); out.getContext('2d').drawImage(G.c, 0, 0);
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  out.strokes = B.count;
  return out;
}

// ── 액자 — 그림: 금박(몰딩 단면을 고리로 쌓고 면마다 빛을 달리), 아래 테에 황동 명판
function profile(t) {
  // 바깥(0) → 안쪽 창(1): 바깥 턱 · 둥근 토러스(빛) · 오목한 홈(그늘) · 구슬 띠 · 안쪽 턱(그늘)
  const S = [[0, [62, 38, 12]], [0.05, [150, 102, 36]], [0.12, [216, 168, 78]], [0.2, [255, 228, 150]], [0.29, [208, 158, 64]], [0.4, [128, 84, 26]], [0.5, [86, 54, 16]],
    [0.6, [176, 128, 48]], [0.68, [242, 204, 120]], [0.74, [184, 136, 52]], [0.8, [236, 196, 108]], [0.86, [146, 100, 34]], [0.93, [92, 60, 20]], [1, [36, 22, 8]]];
  for (let i = 1; i < S.length; i++) if (t <= S[i][0]) { const [a, ca] = S[i - 1], [b, cb] = S[i], k = (t - a) / (b - a); return ca.map((v, j) => v + (cb[j] - v) * k); }
  return S[S.length - 1][1];
}
export function framePaint(painting) {
  const c = cv(FRAME_W, FRAME_H), g = c.getContext('2d', { willReadFrequently: true });
  const O = { x0: 0, y0: 0, x1: FRAME_W, y1: FRAME_H }, I = { x0: WIN.x, y0: WIN.y, x1: WIN.x + WIN.w, y1: WIN.y + WIN.h };
  g.fillStyle = '#5a3c14'; g.fillRect(0, 0, FRAME_W, FRAME_H);   // 고리 사이 이음매로 아래(사진)가 비치지 않게 — 불투명 바탕
  const lerp = (a, b, t) => a + (b - a) * t;
  const ring = (t) => ({ x0: lerp(O.x0, I.x0, t), y0: lerp(O.y0, I.y0, t), x1: lerp(O.x1, I.x1, t), y1: lerp(O.y1, I.y1, t) });
  // 면마다 빛: 위 1.0 · 왼쪽 0.9 · 오른쪽 0.66 · 아래 0.56 (안쪽으로 기운 면은 반대)
  const N = 160;
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N, a = ring(t0), b = ring(t1), col = profile((t0 + t1) / 2);
    const slope = Math.cos(((t0 + t1) / 2) * Math.PI * 7.0);   // 몰딩 기울기(빛을 향함/등짐)
    const sides = [
      [[a.x0, a.y0], [a.x1, a.y0], [b.x1, b.y0], [b.x0, b.y0], 1.0 + 0.08 * slope],
      [[a.x1, a.y0], [a.x1, a.y1], [b.x1, b.y1], [b.x1, b.y0], 0.7 - 0.06 * slope],
      [[a.x1, a.y1], [a.x0, a.y1], [b.x0, b.y1], [b.x1, b.y1], 0.6 - 0.08 * slope],
      [[a.x0, a.y1], [a.x0, a.y0], [b.x0, b.y0], [b.x0, b.y1], 0.9 + 0.06 * slope],
    ];
    sides.forEach(([p0, p1, p2, p3, k]) => {
      g.fillStyle = `rgb(${clamp(col[0] * k, 0, 255) | 0},${clamp(col[1] * k, 0, 255) | 0},${clamp(col[2] * k, 0, 255) | 0})`;
      g.beginPath(); g.moveTo(...p0); g.lineTo(...p1); g.lineTo(...p2); g.lineTo(...p3); g.closePath(); g.fill();
    });
  }
  // 구슬 띠(빛 받는 알갱이)와 토러스 위 잎 무늬 — 고리 위에 점을 찍는다
  const beads = (t, step, r, alpha) => {
    const q = ring(t);
    const edge = (x0, y0, x1, y1, k) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(L / step); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r); gr.addColorStop(0, `rgba(255,244,200,${alpha * k})`); gr.addColorStop(0.6, `rgba(190,150,70,${alpha * 0.6 * k})`); gr.addColorStop(1, 'rgba(60,40,10,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } };
    edge(q.x0, q.y0, q.x1, q.y0, 1); edge(q.x1, q.y0, q.x1, q.y1, 0.75); edge(q.x0, q.y1, q.x1, q.y1, 0.6); edge(q.x0, q.y0, q.x0, q.y1, 0.9);
  };
  beads(0.77, 9, 3.2, 0.75);
  beads(0.2, 22, 6.5, 0.35);
  // 금박 결 — 젯소 요철 · 닳은 자리(붉은 볼이 비침) · 먼지
  const id = g.getImageData(0, 0, FRAME_W, FRAME_H), d = id.data;
  let s = 91;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let y = 0; y < FRAME_H; y++) for (let x = 0; x < FRAME_W; x++) {
    if (x >= I.x0 && x < I.x1 && y >= I.y0 && y < I.y1) continue;
    const p = (y * FRAME_W + x) * 4, n = (rnd() - 0.5) * 18;
    d[p] = clamp(d[p] + n, 0, 255); d[p + 1] = clamp(d[p + 1] + n * 0.9, 0, 255); d[p + 2] = clamp(d[p + 2] + n * 0.6, 0, 255);
  }
  g.putImageData(id, 0, 0);
  // 그림
  g.save(); g.beginPath(); g.rect(WIN.x, WIN.y, WIN.w, WIN.h); g.clip();
  g.imageSmoothingQuality = 'high';
  g.drawImage(painting, WIN.x, WIN.y, WIN.w, WIN.h);
  // 액자 안쪽 턱이 드리운 그늘(위 · 왼쪽)
  const lt = g.createLinearGradient(0, WIN.y, 0, WIN.y + 22); lt.addColorStop(0, 'rgba(10,6,2,.55)'); lt.addColorStop(1, 'rgba(10,6,2,0)');
  g.fillStyle = lt; g.fillRect(WIN.x, WIN.y, WIN.w, 22);
  const ll = g.createLinearGradient(WIN.x, 0, WIN.x + 18, 0); ll.addColorStop(0, 'rgba(10,6,2,.45)'); ll.addColorStop(1, 'rgba(10,6,2,0)');
  g.fillStyle = ll; g.fillRect(WIN.x, WIN.y, 18, WIN.h);
  g.restore();
  g.strokeStyle = 'rgba(30,18,6,.9)'; g.lineWidth = 2; g.strokeRect(WIN.x - 1, WIN.y - 1, WIN.w + 2, WIN.h + 2);
  // 아래 테 황동 명판
  plaque(g, FRAME_W / 2, WIN.y + WIN.h + (FRAME_H - WIN.y - WIN.h) * 0.52, 'Portrait · 2026');
  return c;
}
function plaque(g, cx, cy, text) {
  g.save();
  g.font = 'italic 400 22px Georgia, "Times New Roman", serif';
  const w = Math.max(200, g.measureText(text).width + 64), h = 38, x = cx - w / 2, y = cy - h / 2;
  g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 6; g.shadowOffsetY = 2;
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#efd896'); gr.addColorStop(0.5, '#c39a4a'); gr.addColorStop(1, '#86602a');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(70,46,14,.85)'; g.lineWidth = 1.2; g.strokeRect(x + 4, y + 4, w - 8, h - 8);
  [[x + 10, cy], [x + w - 10, cy]].forEach(([sx, sy]) => { g.fillStyle = '#6e4f1e'; g.beginPath(); g.arc(sx, sy, 2.2, 0, 7); g.fill(); });
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,240,200,.5)'; g.fillText(text, cx, cy + 1.2);
  g.fillStyle = '#3d2a0e'; g.fillText(text, cx, cy);
  g.restore();
}

// 사진: 부스 파이프라인 결과(900×1200 카드)의 판(60,60,780,1040)만 꺼내 카르트 드 비지트 대지에 — 창은 그림과 같은 자리
export function framePhoto(card) {
  const c = cv(FRAME_W, FRAME_H), g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#E3D6B6'; g.fillRect(0, 0, FRAME_W, FRAME_H);
  const paper = g.createLinearGradient(0, 0, FRAME_W, FRAME_H); paper.addColorStop(0, 'rgba(255,255,255,.2)'); paper.addColorStop(1, 'rgba(90,60,20,.14)');
  g.fillStyle = paper; g.fillRect(0, 0, FRAME_W, FRAME_H);
  // 대지 결 · 모서리 손때
  const id = g.getImageData(0, 0, FRAME_W, FRAME_H), d = id.data; let s = 7;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * 9; d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.8; }
  g.putImageData(id, 0, 0);
  const vg = g.createRadialGradient(FRAME_W / 2, FRAME_H / 2, FRAME_H * 0.4, FRAME_W / 2, FRAME_H / 2, FRAME_H * 0.75); vg.addColorStop(0, 'rgba(90,60,20,0)'); vg.addColorStop(1, 'rgba(90,60,20,.22)');
  g.fillStyle = vg; g.fillRect(0, 0, FRAME_W, FRAME_H);
  g.drawImage(card, 60, 60, 780, 1040, WIN.x, WIN.y, WIN.w, WIN.h);
  g.strokeStyle = 'rgba(120,90,40,.9)'; g.lineWidth = 2; g.strokeRect(WIN.x - 12, WIN.y - 12, WIN.w + 24, WIN.h + 24);
  g.strokeStyle = 'rgba(120,90,40,.5)'; g.lineWidth = 1; g.strokeRect(WIN.x - 20, WIN.y - 20, WIN.w + 40, WIN.h + 40);
  const by = WIN.y + WIN.h;
  g.fillStyle = '#3B2A12'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 44px Georgia, "Times New Roman", serif'; g.fillText('NADAR', FRAME_W / 2, by + 58);
  g.font = '400 22px Georgia, "Times New Roman", serif'; g.fillStyle = 'rgba(59,42,18,.8)';
  g.fillText('35, Boulevard des Capucines · Paris', FRAME_W / 2, by + 98);
  return c;
}

// 수집함용 한 장 — 가운데에서 반반(왼쪽 그림 | 오른쪽 사진), 이음매에 가는 금선
export function duoCard(paintF, photoF, w = 450) {
  const h = Math.round(w * FRAME_H / FRAME_W), c = cv(w, h), g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(photoF, 0, 0, w, h);
  g.save(); g.beginPath(); g.rect(0, 0, w / 2, h); g.clip(); g.drawImage(paintF, 0, 0, w, h); g.restore();
  g.fillStyle = 'rgba(255,236,196,.9)'; g.fillRect(w / 2 - 0.75, 0, 1.5, h);
  return c;
}
