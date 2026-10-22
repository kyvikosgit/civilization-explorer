// C5 모네 전시관 — 살아 있는 연작 (보기형, 질문 없음)
//   벽에는 연작이 따로따로 걸려 있다. 한 줄을 누르면 그 연작이 한 점이 되어 화면을 채운다.
//   · 지금 시간의 그림: 열리면 해는 폰의 지금 시각을 하루 호에 올린 자리에 가 있다(때 이름 → 시간대는 frames.json 의 clock).
//     "지금 15:40 · 햇빛 속 건초더미" 한 줄. 그 뒤 해를 끌면 때가 바뀌고, 손을 떼면 해가 저절로 느리게 간다(하루 45초). 그림을 누르면 멈춘다.
//   · 그림 사이를 건너는 방식(그림 아래 작은 선택): 기본은 모핑 — 이웃한 두 그림의 대응점(img/c5/<motif>/morph.json, morph.py 가 수동 앵커 + 자동 매칭으로 만든
//     40–120점)을 삼각 메시로 묶어 두 그림을 중간 자리로 워프하며 섞는다(얼굴 모핑처럼 형태가 이어진다). 그 밖에 픽셀을 고르는 규칙 넷:
//     붓자국(붓결 마스크 문턱) · 빛 쓸림(밝아지는 픽셀부터, 부드러운 앞머리) · 번짐(젖은 캔버스에 피는 둥근 번짐) · 겹칠(색면 먼저, 세부는 약 400ms 뒤). 2D 폴백 있음.
//   · 남기기: "내가 온 시간 15:40" 과 멈춘 때를 적은 한 장의 하루(연작을 왼쪽 첫 때 → 오른쪽 끝 때로 이어 붙인 띠) JPEG, 기기 안에만.
//   그림은 img/c5/<motif>/<n>.jpg — 같은 구도의 작품을 크기·위치만 맞춰 자른 것(img/c5/align.py, 워핑 없음). 때 이름은 제목에 있는 말만. 출처 js/c5-sources.json.
import { $, $$, icons, reduceMotion, haptic } from './js/proto-common.js';

icons();
const IMG = 'img/c5/';
const DAY_MS = 32000;                                   // 하루 한 바퀴(첫 때 → 마지막 때)
const HOLD_MS = 2600, RETURN_MS = 3600;                 // 마지막 때에 잠시 머문 뒤, 처음으로 돌아가는 시간
const DETAIL_LAG = 400;                                 // 겹칠: 세부가 색면을 따라오는 시간
const PLACE = { haystacks: '지베르니 · 1890–91', rouen: '루앙 · 1892–94', parliament: '런던 · 1900–04', waterloo: '런던 · 1900–03', seine: '지베르니 · 1897' };
const ORDER = ['haystacks', 'rouen', 'parliament', 'waterloo', 'seine'];
const STYLES = ['모핑', '붓자국', '빛 쓸림', '번짐', '겹칠'];
const Q = new URLSearchParams(location.search);          // 검수용: ?now=15:40 ?style=2

const [FR, SRC] = await Promise.all([
  fetch(IMG + 'frames.json').then((r) => r.json()),
  fetch('js/c5-sources.json').then((r) => r.json()).catch(() => []),
]);
const META = {}; SRC.forEach((m) => { META[m.file] = m; });
const meta = (f) => META[f] || { title_ko: '', title_en: f, year: '', museum_ko: '' };
const MOTIFS = ORDER.filter((k) => FR[k]);

// ── 연작 벽: 모티프마다 이름표 + 따로 걸린 액자들
const strip = $('#strip');
strip.innerHTML = MOTIFS.map((k) => { const m = FR[k]; const n = m.frames.length; return `
  <button class="motif" type="button" data-k="${k}" aria-label="${m.name} 연작 ${n}점 — 한 점으로 보기">
    <span class="motif-hd"><b>${m.name}</b><small>${PLACE[k] || ''} · ${n}점</small></span>
    <span class="row" style="--th:${m.w > m.h ? (n > 5 ? 44 : 50) : 76}px">${m.frames.map((f) => `<span class="fr"><img src="${IMG + f.file}" alt="" draggable="false" style="aspect-ratio:${m.w}/${m.h}"></span>`).join('')}</span>
  </button>`; }).join('');
$$('.motif', strip).forEach((b) => b.addEventListener('click', () => open(b.dataset.k)));

// ── 보기
const view = $('#view'), stage = $('#stage'), frame = $('#frame'), cv = $('#cv'), sky = $('#sky'), arcSvg = $('#arc'), sunEl = $('#sun');
const caption = $('#caption'), keepBtn = $('#keep'), kept = $('#kept'), pausedEl = $('#paused'), nowLine = $('#nowLine');
let key = null, cur = null, N = 0, style = Math.max(0, Math.min(4, +(Q.get('style') || 0) || 0));
let t = 0, tTarget = 0, tLag = 0, playing = false, phase = 'play', phaseT = 0, drag = null, lastNow = 0, raf = 0, ready = false, startTimer = 0;
let tapDown = null, capIdx = -1, texCache = {}, skyCols = {}, enteredAt = null;
const seen = new Set();
const ease = (x) => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

// ── WebGL — 그림 사이 건너기. 넷 다 픽셀을 고르는 규칙이다(변형 없음)
const gl = cv.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, alpha: false });
const VS = 'attribute vec2 p; varying vec2 v; void main(){ v = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }';
// 붓결 좌표: 모티프의 붓 방향(uDir)을 따라 길고, 가로질러 짧다(uStretch 로 붓 길이). 때가 흐르면 결이 그 방향으로 민다
const FS = `precision mediump float; varying vec2 v;
  uniform sampler2D uA, uB, uLA, uLB, uMask, uKey; uniform vec2 uDir, uStretch; uniform float uAspect, uMaskScale, uSlide, uP, uPD, uStyle, uSoft; uniform vec3 uSeeds[12];
  vec3 brush(vec2 uv) {
    vec2 d = normalize(uDir); vec2 n = vec2(-d.y, d.x);
    vec2 s = uv * vec2(uAspect, 1.0);
    vec2 q = vec2(dot(s, d) * uStretch.x, dot(s, n) * uStretch.y) * uMaskScale + vec2(uSlide * uP, 0.0);
    return texture2D(uMask, q).rgb;
  }
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  void main(){
    vec3 a = texture2D(uA, v).rgb, b = texture2D(uB, v).rgb;
    vec3 mk = brush(v);                                      // R 붓자리 순위(균등) · G 가는 붓결 · B 넓은 색면 자리
    vec3 col;
    if (uStyle < 0.5) {
      // 붓자국: 마스크 값이 문턱 아래인 자리부터 다음 그림. 가장자리에는 붓결 능선(밝고 어두운 가는 줄)
      float p = -uSoft + uP * (1.0 + 2.0 * uSoft);
      float e = smoothstep(p - uSoft, p + uSoft, mk.r);        // 1 = 아직 이전 그림
      col = mix(b, a, e);
      float ridge = 1.0 - abs(2.0 * e - 1.0);
      col += ridge * (mk.g - 0.5) * 0.22 + ridge * 0.03;        // 젖은 가장자리 — 임파스토가 빛을 받듯
    } else if (uStyle < 1.5) {
      // 빛 쓸림: 밝아지는 픽셀부터 바뀐다(큰 형태의 밝기 차로 순서를 매긴다). 앞머리는 넓고 부드럽고, 해가 가는 쪽(왼→오)으로 조금 기운다
      float sweep = dot(v * vec2(uAspect, 1.0), normalize(vec2(1.0, 0.35))) / (uAspect + 0.35);
      float key = texture2D(uKey, v).r * 0.55 + sweep * 0.42 + (mk.b - 0.5) * 0.06 + 0.03;   // uKey: 밝아지는 정도의 순위(0 = 가장 밝아지는 자리)
      float soft = 0.10;
      float p = -soft + uP * (1.0 + 2.0 * soft);
      float e = smoothstep(p - soft, p + soft, key);            // 1 = 아직 이전 그림
      col = mix(b, a, e);
      float front = 1.0 - abs(2.0 * e - 1.0);
      col += pow(front, 1.5) * vec3(0.17, 0.13, 0.06);          // 지나가는 빛 — 앞머리가 따뜻하게 든다
    } else if (uStyle < 2.5) {
      // 번짐: 젖은 캔버스. 여기저기 심은 자리에서 둥글게 피어 번진다. 가장자리는 물감이 고여 조금 어둡고 무르다
      vec2 s = v * vec2(uAspect, 1.0);
      float f = -1.0;
      for (int i = 0; i < 12; i++) { vec3 sd = uSeeds[i]; float r = max(0.0, uP - sd.z) * 0.85; float d = distance(s, sd.xy * vec2(uAspect, 1.0)); f = max(f, r - d); }
      f = f - 0.012 + (mk.g - 0.5) * 0.045 + smoothstep(0.82, 1.0, uP) * 2.0;   // 끝에는 반드시 다 번진다
      float w = smoothstep(-0.05, 0.05, f);                     // 1 = 번진 안쪽(다음 그림)
      float edge = 1.0 - smoothstep(0.0, 0.17, f);              // 가장자리 띠
      vec3 lb = texture2D(uLB, v).rgb;
      vec3 bw = mix(b, lb, edge * 0.7) * (1.0 - 0.15 * edge);
      col = mix(a, bw, w);
    } else {
      // 겹칠: 색면(낮은 주파수)이 넓은 자리마다 먼저 깔리고, 세부(높은 주파수)는 붓자리 순서로 따라온다(uPD 는 약 400ms 늦은 때)
      vec3 la = texture2D(uLA, v).rgb, lb = texture2D(uLB, v).rgb;
      vec3 ha = a - la, hb = b - lb;
      float pc = -0.3 + uP * 1.6;
      float wc = smoothstep(pc - 0.3, pc + 0.3, mk.b);           // 1 = 아직 이전 색면
      vec3 low = mix(lb, la, wc);
      float pd = -uSoft + clamp((uPD - 0.35) / 0.65, 0.0, 1.0) * (1.0 + 2.0 * uSoft);
      float e = smoothstep(pd - uSoft, pd + uSoft, mk.r);
      vec3 high = mix(hb, ha, e);
      col = low + high;
    }
    gl_FragColor = vec4(col, 1.0);
  }`;
// 모핑: 꼭짓점마다 두 그림의 자리(pa, pb)를 갖고, uT 에 따라 그 사이 자리에 놓인다. 조각(fragment)은 두 그림을 제 자리에서 떠 와 섞는다
//        섞을 때 밝은 쪽을 조금 더 세게(uLumW) — 중간 그림이 탁해지지 않게
const VS_M = `precision mediump float; attribute vec2 pa, pb; uniform float uT; varying vec2 va, vb;
  void main(){ vec2 p = mix(pa, pb, uT); va = pa; vb = pb; gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0); }`;
const FS_M = `precision mediump float; varying vec2 va, vb; uniform sampler2D uA, uB; uniform float uT, uLumW;
  void main(){
    vec3 a = texture2D(uA, va).rgb, b = texture2D(uB, vb).rgb;
    float s = uT * uT * (3.0 - 2.0 * uT);
    float la = dot(a, vec3(0.299, 0.587, 0.114)), lb = dot(b, vec3(0.299, 0.587, 0.114));
    float wa = (1.0 - s) * (1.0 + uLumW * la), wb = s * (1.0 + uLumW * lb);
    gl_FragColor = vec4((a * wa + b * wb) / (wa + wb), 1.0);
  }`;
// 붓 길이: 들판은 길게 끄는 가로 붓, 파사드는 짧게 찍는 세로 붓, 템스는 넓고 긴 가로 붓, 센 강은 물에 비친 세로 결
const STROKE = { haystacks: [1.0, 1.0], rouen: [2.8, 1.25], parliament: [1.4, 0.9], waterloo: [1.5, 0.9], seine: [2.2, 1.1] };
let prog = null, progM = null, maskTex = null, quadBuf = null;
function compile(fs, vs = VS) {
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name.replace('[0]', '')] = gl.getUniformLocation(p, a.name); }
  return { p, u };
}
if (gl) {
  try {
    prog = compile(FS); progM = compile(FS_M, VS_M);
    quadBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    maskTex = makeMask();
  } catch (e) { console.warn('[c5] webgl', e); prog = progM = null; }
}
// 붓질 마스크 512² (타일됨): R = 큰 붓 자리(거친 격자) + 중간 붓 + 가는 붓결을 섞어 순위 균등화 → 문턱 p 에 드러나는 비율이 p 가 되도록
//                        G = 가는 붓결만(가장자리 능선용) · B = 아주 넓은 색면 자리(겹칠·빛 쓸림의 느린 변화용, 순위 균등화)
function makeMask() {
  const S = 512, n = S * S; const data = new Uint8Array(n * 4); const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
  let seed = 1234; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const sm = (x) => x * x * (3 - 2 * x);
  function lattice(nx, ny, out, amp) {                  // 주기 격자(가로 nx 칸 · 세로 ny 칸) 값 노이즈 — 타일되게
    const g = new Float32Array(nx * ny); for (let i = 0; i < g.length; i++) g[i] = rnd();
    for (let y = 0; y < S; y++) { const fy = y / S * ny, y0 = Math.floor(fy), ty = sm(fy - y0), y1 = (y0 + 1) % ny;
      for (let x = 0; x < S; x++) { const fx = x / S * nx, x0 = Math.floor(fx), tx = sm(fx - x0), x1 = (x0 + 1) % nx;
        const a = g[y0 * nx + x0], b = g[y0 * nx + x1], c = g[y1 * nx + x0], d = g[y1 * nx + x1];
        out[y * S + x] += amp * ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty); } }
  }
  lattice(4, 22, R, .50);                               // 큰 붓 자리: 길게(가로 128px) 납작하게(세로 23px)
  lattice(9, 46, R, .30);                               // 중간 붓
  lattice(3, 170, G, 1.0);                              // 가는 붓결: 아주 길고 아주 가늘게(3px)
  lattice(14, 90, G, .5);
  lattice(3, 4, B, 1.0);                                // 넓은 색면 자리
  lattice(6, 9, B, .35);
  for (let i = 0; i < n; i++) R[i] += .20 * (G[i] / 1.5);
  const equalize = (arr) => { const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => arr[a] - arr[b]); const rank = new Float32Array(n); idx.forEach((i, r) => { rank[i] = r / (n - 1); }); return rank; };
  const rR = equalize(R), rB = equalize(B);
  for (let i = 0; i < n; i++) { data[i * 4] = rR[i] * 255; data[i * 4 + 1] = Math.max(0, Math.min(255, (G[i] / 1.5) * 255)); data[i * 4 + 2] = rB[i] * 255; data[i * 4 + 3] = 255; }
  const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, S, S, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tx;
}
function loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
function texOf(src) {
  const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tx;
}
// 낮은 주파수 사본: 그림을 작게(긴 변 72px) 줄였다가 부드럽게 키운 것 — 색면만 남는다(빛 쓸림의 순서 · 번짐의 젖은 가장자리 · 겹칠의 색면)
function lowpass(im) {
  const a = im.width / im.height; const sw = a >= 1 ? 72 : Math.round(72 * a), sh = a >= 1 ? Math.round(72 / a) : 72;
  const s = document.createElement('canvas'); s.width = sw; s.height = sh; const sx = s.getContext('2d'); sx.imageSmoothingQuality = 'high'; sx.drawImage(im, 0, 0, sw, sh);
  const c = document.createElement('canvas'); c.width = sw * 4; c.height = sh * 4; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
  try { x.filter = 'blur(3px)'; } catch (_) { /* noop */ }
  x.drawImage(s, 0, 0, c.width, c.height);
  return c;
}
// 하늘색: 그림 위쪽 1/4 의 평균 — 해의 빛깔로 쓴다(그림에서 온 색만)
function skyColor(im) {
  const c = document.createElement('canvas'); c.width = 24; c.height = 24; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, 24, 24);
  const d = x.getImageData(0, 0, 24, 6).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4; return [r / n, g / n, b / n];
}
async function load(k) {
  if (texCache[k]) return texCache[k];
  const ims = await Promise.all(FR[k].frames.map((f) => loadImg(IMG + f.file)));
  skyCols[k] = ims.map(skyColor);
  const lows = ims.map(lowpass);
  const morph = await fetch(`${IMG}${k}/morph.json`).then((r) => r.json()).catch(() => null);
  texCache[k] = { ims, lows, morph, meshes: {}, tex: gl && prog ? ims.map(texOf) : null, low: gl && prog ? lows.map(texOf) : null };
  return texCache[k];
}
// 모핑 메시: 쌍(a→b)의 삼각형을 꼭짓점 배열 [pa.x, pa.y, pb.x, pb.y] × 3 으로 — 한 번 만들어 둔다
function meshFor(tc, a) {
  if (tc.meshes[a]) return tc.meshes[a];
  const pr = tc.morph && tc.morph.pairs.find((q) => q.a === a + 1); if (!pr) return null;
  const arr = new Float32Array(pr.tris.length * 12); let o = 0;
  for (const tri of pr.tris) for (const i of tri) { const p = pr.pts[i]; arr[o++] = p[0]; arr[o++] = p[1]; arr[o++] = p[2]; arr[o++] = p[3]; }
  const m = { n: pr.tris.length * 3, arr, pts: pr.pts, tris: pr.tris };
  if (gl && progM) { m.buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, m.buf); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); }
  tc.meshes[a] = m; return m;
}
// 빛 쓸림의 순서: 그림 쌍마다 128px 에서 큰 형태의 밝기 변화(다음 − 이전)를 재어, 밝아지는 자리부터 0 → 1 로 순위를 매긴 텍스처(순위 균등화)
function keyTex(k, a, b) {
  const tc = texCache[k]; tc.keys = tc.keys || {}; const id = a + ':' + b; if (tc.keys[id]) return tc.keys[id];
  const S = 128; const sh = Math.max(8, Math.round(S * FR[k].h / FR[k].w));
  const px = (im) => { const c = document.createElement('canvas'); c.width = S; c.height = sh; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, S, sh); return x.getImageData(0, 0, S, sh).data; };
  const A = px(tc.lows[a]), B = px(tc.lows[b]); const n = S * sh; const dL = new Float32Array(n);
  for (let i = 0; i < n; i++) dL[i] = (B[i * 4] - A[i * 4]) * .299 + (B[i * 4 + 1] - A[i * 4 + 1]) * .587 + (B[i * 4 + 2] - A[i * 4 + 2]) * .114;
  const idx = Array.from({ length: n }, (_, i) => i).sort((p, q) => dL[q] - dL[p]);      // 가장 밝아지는 자리가 먼저
  const data = new Uint8Array(n * 4); idx.forEach((i, r) => { const v = Math.round(r / (n - 1) * 255); data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v; data[i * 4 + 3] = 255; });
  const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, S, sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  tc.keys[id] = tx; return tx;
}
// 번짐의 씨앗: 그림 쌍마다 정해진 자리 12곳(x, y, 피기 시작하는 때)
function seedsFor(k, a) {
  let s = 977 + a * 131 + k.length * 17; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const out = new Float32Array(36);
  for (let i = 0; i < 12; i++) { out[i * 3] = 0.06 + rnd() * 0.88; out[i * 3 + 1] = 0.06 + rnd() * 0.88; out[i * 3 + 2] = i === 0 ? 0 : 0.08 + rnd() * 0.6; }
  return out;
}

// ── 지금 시간 → 때. frames.json 의 clock: 모티프마다 [시작시, 끝시, 때 번호] — 자정을 넘는 구간은 끝시 < 시작시
function nowDate() {
  const q = Q.get('now'); const d = new Date();
  if (q && /^\d{1,2}:\d{2}$/.test(q)) { const [h, m] = q.split(':').map(Number); d.setHours(h, m, 0, 0); }
  return d;
}
function frameForTime(m, d) {
  const h = d.getHours() + d.getMinutes() / 60;
  for (const [h0, h1, k] of m.clock || []) { if (h0 <= h1 ? (h >= h0 && h < h1) : (h >= h0 || h < h1)) return k; }
  return 0;
}
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// ── 열기 · 닫기
async function open(k) {
  key = k; cur = FR[k]; N = cur.frames.length; phase = 'play'; playing = false; capIdx = -1; ready = false; drag = null; tapDown = null;
  enteredAt = nowDate(); const k0 = frameForTime(cur, enteredAt);
  t = tTarget = tLag = k0;
  $('#viewTitle').textContent = `${cur.name} · ${PLACE[k] || ''}`;
  $('#nowClock').textContent = `지금 ${hhmm(enteredAt)}`; $('#nowWhat').textContent = cur.frames[k0].now || cur.frames[k0].when;
  nowLine.classList.remove('in'); void nowLine.offsetWidth; nowLine.classList.add('in');
  kept.hidden = true; keepBtn.hidden = false; pausedEl.hidden = true;
  view.hidden = false; document.body.style.overflow = 'hidden';
  layout(); buildArc();
  await load(k);
  if (key !== k) return;
  render(); updateSun(); updateCaption(true);
  ready = true;
  seen.add(k); $(`.motif[data-k="${k}"]`, strip).classList.add('seen');
  // 잠시 뒤 해가 지금 시간에서 저절로 가기 시작한다
  clearTimeout(startTimer); startTimer = setTimeout(() => { if (!reduceMotion && !drag && ready) { playing = true; if (t >= N - 1 - 1e-3) { phase = 'hold'; phaseT = 0; } kick(); } }, 1400);
}
function close() {
  playing = false; clearTimeout(startTimer); if (raf) { cancelAnimationFrame(raf); raf = 0; }
  view.hidden = true; document.body.style.overflow = '';
  const line = $('#wallLine'); if (line.hidden) line.hidden = false;        // 출구 벽의 문장 — 한 번만
}
$('#viewClose').addEventListener('click', close);

// ── 건너는 방식 고르기
$$('#styles button').forEach((b) => b.addEventListener('click', () => setStyle(+b.dataset.style)));
function setStyle(s) {
  style = s;
  $$('#styles button').forEach((b) => { const on = +b.dataset.style === s; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
  if (ready) { render(); haptic(5); }
}
setStyle(style);

// ── 레이아웃: 무대 안에 그림 비율대로 캔버스
function layout() {
  const r = stage.getBoundingClientRect(); const gap = parseFloat(getComputedStyle(stage).gap) || 14;
  const pw = r.width - 40, ph = r.height - 10 - gap - Math.max(56, caption.offsetHeight) - 6;      // 액자 + 캡션이 무대 안에
  if (pw <= 0 || ph <= 0) return;
  const a = cur.w / cur.h; let w = pw, h = w / a; if (h > ph) { h = ph; w = h * a; }
  w = Math.floor(w); h = Math.floor(h);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  if (gl) gl.viewport(0, 0, cv.width, cv.height);
  buildArc();
}
window.addEventListener('resize', () => { if (!view.hidden) { layout(); updateSun(); render(); } });

// ── 호와 해
let ARC = null;    // { cx, cy, R, phm, W, H }
function buildArc() {
  const W = sky.clientWidth || 350, H = sky.clientHeight || 132;
  const hy = H - 24, pad = 30, apex = 30;
  const a = (W - pad * 2) / 2, h = hy - apex, R = (a * a + h * h) / (2 * h);
  ARC = { cx: W / 2, cy: hy - h + R, R, phm: Math.atan2(a, R - h), W, H, hy };
  arcSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const pt = (tt) => sunPos(tt);
  const p0 = pt(0), p1 = pt(1);
  let s = `<line class="horizon" x1="6" y1="${hy}" x2="${W - 6}" y2="${hy}"/>`;
  s += `<path class="arc" d="M${p0.x} ${p0.y} A${R} ${R} 0 0 1 ${p1.x} ${p1.y}"/>`;
  s += `<path class="arc-done" id="arcDone" d=""/>`;
  for (let k = 0; k < N; k++) {
    const u = N > 1 ? k / (N - 1) : .5, p = pt(u), ph = -ARC.phm + 2 * ARC.phm * u;
    const ox = Math.sin(ph), oy = -Math.cos(ph);
    s += `<circle class="tick" data-k="${k}" cx="${p.x}" cy="${p.y}" r="3.2"/>`;
    // 이름표: 호 위쪽은 호 바깥으로, 양 끝(지평선 위)은 지평선 아래에 — 해가 지나가도 가려지지 않게. 여섯 점이면 안쪽 넷을 위아래로 엇갈려
    const out = 16, lx = p.x + ox * out, ly = p.y + oy * out;
    const end = Math.abs(ph) > ARC.phm - 0.02;
    const anchor = end ? (ph < 0 ? 'start' : 'end') : ph < -0.55 ? 'start' : ph > 0.55 ? 'end' : 'middle';
    const x = end ? p.x - (ph < 0 ? 4 : -4) : lx + (anchor === 'start' ? -6 : anchor === 'end' ? 6 : 0);
    let y = end ? hy + 20 : ly + (anchor === 'middle' ? 3 : 4);
    if (!end && N > 5 && anchor === 'middle' && k % 2 === 0) y += 12;
    s += `<text data-k="${k}" x="${x}" y="${y}" text-anchor="${anchor}">${cur.frames[k].when}</text>`;
  }
  arcSvg.innerHTML = s;
}
function sunPos(u) { const ph = -ARC.phm + 2 * ARC.phm * Math.max(0, Math.min(1, u)); return { x: ARC.cx + ARC.R * Math.sin(ph), y: ARC.cy - ARC.R * Math.cos(ph) }; }
function sunT() { return phase === 'return' ? (phaseT < RETURN_MS / 2 ? N - 1 : 0) : t; }
function updateSun() {
  if (!ARC) return;
  const st = sunT(), u = N > 1 ? st / (N - 1) : .5, p = sunPos(u);
  sunEl.style.transform = `translate(${p.x}px, ${p.y}px)`;
  sunEl.setAttribute('aria-valuenow', u.toFixed(3));
  let dim = false; if (phase === 'return') { const r = phaseT / RETURN_MS; dim = r > .18 && r < .82; }
  sunEl.classList.toggle('dim', dim);
  const p0 = sunPos(0), done = $('#arcDone'); if (done) done.setAttribute('d', u > 0.002 ? `M${p0.x} ${p0.y} A${ARC.R} ${ARC.R} 0 0 1 ${p.x} ${p.y}` : '');
  // 해의 빛깔: 지금 섞이는 두 그림의 하늘색 사이
  const cols = skyCols[key]; if (cols) {
    const a = Math.floor(st), b = Math.min(N - 1, a + 1), f = st - a, ca = cols[a], cb = cols[b];
    const c = [0, 1, 2].map((i) => Math.round(ca[i] + (cb[i] - ca[i]) * f));
    const lift = (x) => Math.round(x + (255 - x) * .35);
    sunEl.style.setProperty('--sunc', `rgb(${lift(c[0])},${lift(c[1])},${lift(c[2])})`);
    sunEl.style.setProperty('--sunglow', `rgba(${c[0]},${c[1]},${c[2]},.6)`);
    sunEl.style.setProperty('--sunglow2', `rgba(${c[0]},${c[1]},${c[2]},.2)`);
  }
  const k = Math.round(st);
  $$('.tick, text', arcSvg).forEach((e) => e.classList.toggle('on', +e.dataset.k === k));
}
// 해 끌기: 하늘 어디서든 누르면 그 각도로. 끄는 동안 t 는 손가락을 부드럽게 따라간다
sky.addEventListener('pointerdown', (e) => {
  if (!ready) return;
  e.preventDefault(); try { sky.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
  drag = { id: e.pointerId }; sky.classList.add('dragging'); playing = false; phase = 'play'; pausedEl.hidden = true; clearTimeout(startTimer);
  tTarget = pointerT(e); kick();
});
sky.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; tTarget = pointerT(e); kick(); });
const sunUp = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  drag = null; sky.classList.remove('dragging');
  // 손을 떼면 해가 저절로 느리게 간다
  if (!reduceMotion) { playing = true; if (t >= N - 1 - 1e-3) { phase = 'hold'; phaseT = 0; } }
  kick(); haptic(6);
};
sky.addEventListener('pointerup', sunUp); sky.addEventListener('pointercancel', sunUp);
function pointerT(e) {
  const r = sky.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
  let ph = Math.atan2(x - ARC.cx, ARC.cy - y); ph = Math.max(-ARC.phm, Math.min(ARC.phm, ph));
  return (ph + ARC.phm) / (2 * ARC.phm) * (N - 1);
}
sunEl.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); playing = false; tTarget = Math.max(0, Math.min(N - 1, Math.round(t) + (e.key === 'ArrowRight' ? 1 : -1))); kick(); } });

// 그림을 누르면 멈춤 · 다시 누르면 간다
stage.addEventListener('pointerdown', (e) => { if (!ready) return; tapDown = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false }; try { stage.setPointerCapture(e.pointerId); } catch (_) { /* noop */ } });
stage.addEventListener('pointermove', (e) => { if (!tapDown || e.pointerId !== tapDown.id) return; if (Math.hypot(e.clientX - tapDown.x, e.clientY - tapDown.y) > 8) tapDown.moved = true; });
const stageUp = (e) => {
  if (!tapDown || e.pointerId !== tapDown.id) return;
  const moved = tapDown.moved; tapDown = null;
  if (moved) return;
  if (phase !== 'play') { phase = 'play'; }
  playing = !playing; pausedEl.hidden = playing || reduceMotion; clearTimeout(startTimer); haptic(6);
  if (playing && t >= N - 1 - 1e-3) { phase = 'hold'; phaseT = 0; }
  kick();
};
stage.addEventListener('pointerup', stageUp); stage.addEventListener('pointercancel', stageUp);

// ── 그리기
function pair() {
  if (phase === 'return') return { a: N - 1, b: 0, p: ease(Math.min(1, phaseT / RETURN_MS)), pd: ease(Math.min(1, phaseT / RETURN_MS)) };
  const a = Math.min(N - 1, Math.floor(t)), b = Math.min(N - 1, a + 1);
  return { a, b, p: t - a, pd: Math.max(0, Math.min(1, tLag - a)) };
}
function render() {
  if (!cur || !texCache[key]) return;
  const tc = texCache[key];
  if (!gl || !prog || !tc.tex) return render2d(tc);
  gl.clearColor(0.07, 0.07, 0.06, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  const { a, b, p, pd } = pair();
  if (style === 0 && phase !== 'return' && progM) {               // 모핑 — 마지막 그림에서는 그 앞 쌍의 끝(t=1)
    const ma = a >= N - 1 ? N - 2 : a; const m = meshFor(tc, ma);
    if (m) {
      const { u } = progM; gl.useProgram(progM.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.buf);
      const la = gl.getAttribLocation(progM.p, 'pa'), lb = gl.getAttribLocation(progM.p, 'pb');
      gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(lb); gl.vertexAttribPointer(lb, 2, gl.FLOAT, false, 16, 8);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tc.tex[ma]); gl.uniform1i(u.uA, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tc.tex[ma + 1]); gl.uniform1i(u.uB, 1);
      gl.uniform1f(u.uT, a >= N - 1 ? 1 : p); gl.uniform1f(u.uLumW, 0.6);
      gl.drawArrays(gl.TRIANGLES, 0, m.n);
      gl.disableVertexAttribArray(la); gl.disableVertexAttribArray(lb);
      return;
    }
  }
  const { u } = prog; gl.useProgram(prog.p);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); const lp = gl.getAttribLocation(prog.p, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
  const st0 = style === 0 ? 0 : style - 1;                         // 되돌아갈 때(모핑 쌍이 없다)는 붓자국으로
  const bind = (i, tx, loc) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tx); gl.uniform1i(loc, i); };
  bind(0, tc.tex[a], u.uA); bind(1, tc.tex[b], u.uB); bind(2, tc.low[a], u.uLA); bind(3, tc.low[b], u.uLB); bind(4, maskTex, u.uMask); bind(5, st0 === 1 ? keyTex(key, a, b) : maskTex, u.uKey);
  const st = STROKE[key] || [1, 1];
  gl.uniform1f(u.uP, p); gl.uniform1f(u.uPD, pd); gl.uniform1f(u.uStyle, st0); gl.uniform1f(u.uSoft, 0.035);
  gl.uniform2f(u.uDir, cur.dir[0], cur.dir[1]); gl.uniform2f(u.uStretch, st[0], st[1]);
  gl.uniform1f(u.uAspect, cur.w / cur.h); gl.uniform1f(u.uMaskScale, 1.15); gl.uniform1f(u.uSlide, st0 === 0 ? 0.22 : 0);
  gl.uniform3fv(u.uSeeds, seedsFor(key, a));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
// WebGL 이 없을 때: 2D 캔버스로 같은 네 규칙을 느리게 — 픽셀마다 문턱으로 고른다(낮은 해상도)
let ctx2, mask2;
function render2d(tc) {
  if (!ctx2) { ctx2 = cv.getContext('2d'); if (!ctx2) return; }
  const w = Math.min(cv.width, 480), h = Math.round(cv.height * w / cv.width);
  if (!mask2 || mask2.w !== w || mask2.h !== h) {           // 간단한 2D 마스크: 가로로 긴 사인 결 + 난수, 넓은 자리는 낮은 주파수 사인
    const m = new Float32Array(w * h), big = new Float32Array(w * h); let s = 7; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const rows = Array.from({ length: h }, () => rnd());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { m[y * w + x] = (Math.sin(x / 37 + rows[y] * 9) * .5 + .5) * .5 + rows[Math.floor(y / 3) * 3 % h] * .3 + rnd() * .2; big[y * w + x] = (Math.sin(x / w * 5.1 + y / h * 2.3) * Math.cos(y / h * 4.2 - x / w * 1.7) * .5 + .5); }
    mask2 = { w, h, m, big };
  }
  const draw = (im, bw, bh) => { const c = document.createElement('canvas'); c.width = bw; c.height = bh; const x = c.getContext('2d'); x.drawImage(im, 0, 0, bw, bh); return x.getImageData(0, 0, bw, bh).data; };
  const { a, b, p, pd } = pair();
  if (style === 0 && phase !== 'return') {                         // 모핑(2D): 삼각형마다 아핀으로 두 그림을 중간 자리로 그려 섞는다
    const ma = a >= N - 1 ? N - 2 : a; const m = meshFor(tc, ma);
    if (m) {
      const tt = a >= N - 1 ? 1 : p, sm = tt * tt * (3 - 2 * tt);
      const layer = (im, from, wgt) => { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const x = c.getContext('2d');
        for (const tri of m.tris) { const P = tri.map((i) => m.pts[i]); const S = P.map((q) => [q[from] * cv.width, q[from + 1] * cv.height]); const D = P.map((q) => [(q[0] + (q[2] - q[0]) * tt) * cv.width, (q[1] + (q[3] - q[1]) * tt) * cv.height]);
          const det = (S[1][0] - S[0][0]) * (S[2][1] - S[0][1]) - (S[2][0] - S[0][0]) * (S[1][1] - S[0][1]); if (Math.abs(det) < 1e-6) continue;
          const ma_ = ((D[1][0] - D[0][0]) * (S[2][1] - S[0][1]) - (D[2][0] - D[0][0]) * (S[1][1] - S[0][1])) / det, mb_ = ((D[1][1] - D[0][1]) * (S[2][1] - S[0][1]) - (D[2][1] - D[0][1]) * (S[1][1] - S[0][1])) / det;
          const mc_ = ((D[2][0] - D[0][0]) * (S[1][0] - S[0][0]) - (D[1][0] - D[0][0]) * (S[2][0] - S[0][0])) / det, md_ = ((D[2][1] - D[0][1]) * (S[1][0] - S[0][0]) - (D[1][1] - D[0][1]) * (S[2][0] - S[0][0])) / det;
          x.save(); x.beginPath(); x.moveTo(D[0][0], D[0][1]); x.lineTo(D[1][0], D[1][1]); x.lineTo(D[2][0], D[2][1]); x.closePath(); x.clip();
          x.setTransform(ma_, mb_, mc_, md_, D[0][0] - ma_ * S[0][0] - mc_ * S[0][1], D[0][1] - mb_ * S[0][0] - md_ * S[0][1]); x.drawImage(im, 0, 0, cv.width, cv.height); x.restore(); }
        return c; };
      const ca = layer(tc.ims[ma], 0), cb2 = layer(tc.ims[ma + 1], 2);
      ctx2.globalAlpha = 1; ctx2.drawImage(ca, 0, 0); ctx2.globalAlpha = sm; ctx2.drawImage(cb2, 0, 0); ctx2.globalAlpha = 1;
      return;
    }
  }
  const st0 = style === 0 ? 0 : style - 1;
  const A = draw(tc.ims[a], w, h), B = draw(tc.ims[b], w, h), LA = draw(tc.lows[a], w, h), LB = draw(tc.lows[b], w, h);
  const out = ctx2.createImageData(w, h), d = out.data; const seeds = seedsFor(key, a), asp = cur.w / cur.h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, j = i * 4; let wgt;                  // wgt: 1 = 다음 그림
    if (st0 === 0) wgt = mask2.m[i] < p ? 1 : 0;
    else if (st0 === 1) { const dL = ((LB[j] * .299 + LB[j + 1] * .587 + LB[j + 2] * .114) - (LA[j] * .299 + LA[j + 1] * .587 + LA[j + 2] * .114)) / 255; const keyv = Math.max(0, Math.min(1, .5 - dL * 2.4)) * .6 + (x / w * asp + y / h * .35) / (asp + .35) * .32 + (mask2.big[i] - .5) * .08; wgt = Math.max(0, Math.min(1, (p * 1.32 - .16 - keyv) / .32 + .5)); }
    else if (st0 === 2) { let f = -1; for (let q = 0; q < 12; q++) { const r = Math.max(0, p - seeds[q * 3 + 2]) * 0.85, dd = Math.hypot((x / w - seeds[q * 3]) * asp, y / h - seeds[q * 3 + 1]); f = Math.max(f, r - dd); } wgt = f > 0 || p > 0.95 ? 1 : 0; }
    else { const wc = mask2.big[i] < p ? 1 : 0, wd = mask2.m[i] < Math.max(0, (pd - .35) / .65) ? 1 : 0; for (let c = 0; c < 3; c++) { const low = wc ? LB[j + c] : LA[j + c], high = wd ? B[j + c] - LB[j + c] : A[j + c] - LA[j + c]; d[j + c] = Math.max(0, Math.min(255, low + high)); } d[j + 3] = 255; continue; }
    for (let c = 0; c < 3; c++) d[j + c] = A[j + c] + (B[j + c] - A[j + c]) * wgt; d[j + 3] = 255;
  }
  const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; tmp.getContext('2d').putImageData(out, 0, 0);
  ctx2.imageSmoothingEnabled = true; ctx2.drawImage(tmp, 0, 0, cv.width, cv.height);
}

// ── 시계: 끌기 · 저절로 가기 · 마지막에 머물다 처음으로. 겹칠의 세부(tLag)는 400ms 뒤에 따라온다
function loop(now) {
  raf = 0; const dt = Math.max(0, Math.min(60, now - lastNow)); lastNow = now; let active = false;   // rAF 의 now 는 kick 시점보다 앞설 수 있다 → 음수 금지
  if (drag) { const d = tTarget - t; if (Math.abs(d) > 0.002) { t += d * Math.min(1, dt / 110); active = true; } else t = tTarget; }
  else if (!playing && Math.abs(tTarget - t) > 0.002 && phase === 'play') { t += (tTarget - t) * Math.min(1, dt / 160); active = true; }
  else if (playing) {
    if (phase === 'hold') { phaseT += dt; if (phaseT >= HOLD_MS) { phase = 'return'; phaseT = 0; } }
    else if (phase === 'return') { phaseT += dt; if (phaseT >= RETURN_MS) { phase = 'play'; t = 0; tTarget = 0; tLag = 0; } }
    else { t += dt / DAY_MS * (N - 1); if (t >= N - 1) { t = N - 1; phase = 'hold'; phaseT = 0; } tTarget = t; }
    active = true;
  }
  if (Math.abs(t - tLag) > 0.0015) { tLag += (t - tLag) * Math.min(1, dt / DETAIL_LAG); active = true; } else tLag = t;
  render(); updateSun(); updateCaption();
  if (active) raf = requestAnimationFrame(loop);
}
function kick() { if (!raf) { lastNow = performance.now(); raf = requestAnimationFrame(loop); } }
document.addEventListener('visibilitychange', () => { if (document.hidden) { playing = false; pausedEl.hidden = true; } });

// ── 캡션: 지금 가장 많이 보이는 그림의 제목 · 연도 · 소장처
function updateCaption(force) {
  const k = Math.round(sunT());
  if (!force && k === capIdx) return;
  capIdx = k; const fr = cur.frames[k], m = meta(fr.src);
  $('#capWhen').textContent = fr.when;
  $('#capTitle').textContent = `〈${m.title_ko || m.title_en}〉`;
  $('#capMeta').textContent = [m.year, m.museum_ko, m.license === 'CC0' ? 'CC0' : 'PD'].filter(Boolean).join(' · ');
  $('#viewCount').textContent = `${k + 1} / ${N}`;
  caption.classList.remove('fade'); void caption.offsetWidth; caption.classList.add('fade');
}

// ── 남기기: 한 장의 하루 — 위에는 멈춘 그림, 아래에는 첫 때 → 끝 때로 이어 붙인 띠. "내가 온 시간" 과 멈춘 때 한 줄씩. 입장도 수치도 없다
function dayCard() {
  const tc = texCache[key]; const W = 1080, PAD = 60; const ph = Math.round((W - PAD * 2) * cur.h / cur.w);
  const SH = 300, top = 150, stripY = top + ph + 92, H = stripY + SH + 190;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = '#0E0D0C'; x.fillRect(0, 0, W, H);
  const st = sunT(), k = Math.round(st), fr = cur.frames[k], m = meta(fr.src);
  x.textBaseline = 'alphabetic'; x.fillStyle = '#D9672F'; x.font = '600 26px Paperlogy, Freesentation, sans-serif'; x.fillText('모네 전시관 · 살아 있는 연작', PAD, 82);
  x.fillStyle = '#fff'; x.font = '800 44px Paperlogy, Freesentation, sans-serif'; x.fillText(`${cur.name} · ${PLACE[key] || ''}`, PAD, 128);
  x.save(); x.shadowColor = 'rgba(0,0,0,.7)'; x.shadowBlur = 40; x.shadowOffsetY = 18; x.fillStyle = '#1C1915'; x.fillRect(PAD - 4, top - 4, W - PAD * 2 + 8, ph + 8); x.restore();
  x.drawImage(cv, PAD, top, W - PAD * 2, ph);
  // 띠: 왼쪽 첫 때 → 오른쪽 끝 때. 때마다 세로로 긴 띠, 이웃과는 넓게 섞인다(가운데 높이의 가로 띠를 잘라 쓴다)
  const sw = W - PAD * 2, sx = PAD; const crop = Math.min(cur.h, Math.round(cur.w * SH / sw)); const cy = Math.round((cur.h - crop) / 2);
  const band = document.createElement('canvas'); band.width = sw; band.height = SH; const bx = band.getContext('2d');
  for (let i = 0; i < N; i++) {
    const layer = document.createElement('canvas'); layer.width = sw; layer.height = SH; const lx = layer.getContext('2d');
    lx.drawImage(tc.ims[i], 0, cy, cur.w, crop, 0, 0, sw, SH);
    if (i > 0) { const x0 = (i - 1) / (N - 1) * sw, x1 = i / (N - 1) * sw; const g = lx.createLinearGradient(x0 + (x1 - x0) * .15, 0, x1 - (x1 - x0) * .15, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); lx.globalCompositeOperation = 'destination-in'; lx.fillStyle = g; lx.fillRect(0, 0, sw, SH); }
    bx.drawImage(layer, 0, 0);
  }
  x.drawImage(band, sx, stripY);
  // 멈춘 자리 표시 + 때 이름표
  const mx = sx + (N > 1 ? st / (N - 1) : .5) * sw;
  x.fillStyle = '#D9672F'; x.fillRect(Math.round(mx) - 2, stripY - 14, 4, SH + 28);
  x.font = '600 22px Paperlogy, Freesentation, sans-serif';
  cur.frames.forEach((f, i) => { const px = sx + (N > 1 ? i / (N - 1) : .5) * sw; x.fillStyle = i === k ? '#fff' : 'rgba(255,255,255,.5)'; x.textAlign = i === 0 ? 'left' : i === N - 1 ? 'right' : 'center'; x.fillText(f.when, px, stripY + SH + 38); });
  x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = '800 40px Paperlogy, Freesentation, sans-serif';
  x.fillText(`내가 온 시간 ${hhmm(enteredAt)} · 멈춘 때 ${fr.when}`, PAD, stripY + SH + 104);
  x.fillStyle = 'rgba(255,255,255,.6)'; x.font = '400 24px Freesentation, sans-serif';
  const line = `〈${m.title_ko || m.title_en}〉 · ${m.year} · ${m.museum_ko}`; x.fillText(line.length > 44 ? line.slice(0, 43) + '…' : line, PAD, stripY + SH + 146);
  return c;
}
keepBtn.addEventListener('click', () => {
  if (!ready) return;
  playing = false; pausedEl.hidden = true;
  render();
  const card = dayCard(); const url = card.toDataURL('image/jpeg', 0.86);
  const k = Math.round(sunT()), fr = cur.frames[k], m = meta(fr.src);
  $('#keptImg').src = url; $('#keptDl').href = url; $('#keptDl').download = `monet-c5-${key}-${hhmm(enteredAt).replace(':', '')}.jpg`;
  $('#keptLine').textContent = `내가 온 시간 ${hhmm(enteredAt)} · 멈춘 때 ${fr.when}`;
  $('#keptMeta').textContent = `한 장의 하루 · ${cur.name} · ${cur.frames[0].when} → ${cur.frames[N - 1].when} · 〈${m.title_ko || m.title_en}〉`;
  keepBtn.hidden = true; kept.hidden = false; haptic(10);
  try {                                                   // 작은 사본만 기기에
    const c = document.createElement('canvas'); const s = 320 / card.width; c.width = 320; c.height = Math.round(card.height * s); c.getContext('2d').drawImage(card, 0, 0, c.width, c.height);
    localStorage.setItem('m100_c5_keep', JSON.stringify({ motif: key, when: fr.when, enteredAt: hhmm(enteredAt), style: STYLES[style], title: m.title_ko || m.title_en, at: Date.now(), thumb: c.toDataURL('image/jpeg', .7) }));
  } catch (_) { /* noop */ }
});

// 검수용
window.__c5 = { FR, open, close, setStyle, setT: (v) => { playing = false; pausedEl.hidden = true; clearTimeout(startTimer); t = tTarget = tLag = v; render(); updateSun(); updateCaption(); }, sunPos: (u) => { const r = sky.getBoundingClientRect(); const p = sunPos(u); return { x: r.left + p.x, y: r.top + p.y }; },
  frameForTime: (k, hh) => frameForTime(FR[k], (() => { const d = new Date(); const [h, m] = hh.split(':').map(Number); d.setHours(h, m, 0, 0); return d; })()),
  get t() { return t; }, get tLag() { return tLag; }, get playing() { return playing; }, get style() { return style; }, get ready() { return ready; }, get phase() { return phase; }, get key() { return key; }, get gl() { return !!(gl && prog); }, get seen() { return [...seen]; } };
