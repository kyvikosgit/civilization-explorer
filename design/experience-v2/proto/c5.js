// C5 모네 전시관 — 살아 있는 연작 (보기형, 질문 없음)
//   벽에는 연작이 따로따로 걸려 있다. 한 줄을 누르면 그 연작이 한 점이 되어 화면을 채운다.
//   A · 해를 끌어 하루를 돌리기: 호 위의 해를 끌면 때가 바뀐다. 그림 사이는 붓질 마스크 디졸브(WebGL, 노이즈+붓결 마스크를 문턱으로 잘라
//      그 모티프의 붓 방향으로 번진다). 크로스페이드도, 메쉬 변형도 아니다. 손을 떼면 해가 저절로 느리게 간다(하루 45초). 그림을 누르면 멈춘다.
//   B · 한 장의 하루: 같은 자리를 왼쪽 아침 → 오른쪽 끝까지 세로 띠로 부드럽게 이어 붙인 한 장. 옆으로 끌면 가운데 때가 옮겨진다.
//   그림은 img/c5/<motif>/<n>.jpg — 같은 구도의 작품을 크기·위치만 맞춰 자른 것(img/c5/align.py, 워핑 없음). 때 이름은 제목에 있는 말만.
//   출처 js/c5-sources.json. 남기기는 캔버스 → JPEG, 기기 안에만. 서버 없음.
import { $, $$, icons, reduceMotion, haptic } from './js/proto-common.js';

icons();
const IMG = 'img/c5/';
const DAY_MS = 45000;                                   // 하루 한 바퀴(첫 때 → 마지막 때)
const HOLD_MS = 2600, RETURN_MS = 3600;                 // 마지막 때에 잠시 머문 뒤, 처음으로 돌아가는 시간
const PLACE = { haystacks: '지베르니 · 1890–91', rouen: '루앙 · 1892–94' };
const ORDER = ['haystacks', 'rouen'];

const [FR, SRC] = await Promise.all([
  fetch(IMG + 'frames.json').then((r) => r.json()),
  fetch('js/c5-sources.json').then((r) => r.json()).catch(() => []),
]);
const META = {}; SRC.forEach((m) => { META[m.file] = m; });
const meta = (f) => META[f] || { title_ko: '', title_en: f, year: '', museum_ko: '' };

// ── 연작 벽: 모티프마다 이름표 + 따로 걸린 액자들
const strip = $('#strip');
strip.innerHTML = ORDER.map((k) => { const m = FR[k]; return `
  <button class="motif" type="button" data-k="${k}" aria-label="${m.name} 연작 ${m.frames.length}점 — 한 점으로 보기">
    <span class="motif-hd"><b>${m.name}</b><small>${PLACE[k] || ''} · ${m.frames.length}점</small></span>
    <span class="row" style="--th:${m.w > m.h ? 50 : 76}px">${m.frames.map((f) => `<span class="fr"><img src="${IMG + f.file}" alt="" draggable="false" style="aspect-ratio:${m.w}/${m.h}"></span>`).join('')}</span>
  </button>`; }).join('');
$$('.motif', strip).forEach((b) => b.addEventListener('click', () => open(b.dataset.k)));

// ── 보기
const view = $('#view'), stage = $('#stage'), frame = $('#frame'), cv = $('#cv'), sky = $('#sky'), arcSvg = $('#arc'), sunEl = $('#sun');
const band = $('#band'), bandLabels = $('#bandLabels'), bandHint = $('#bandHint'), caption = $('#caption'), keepBtn = $('#keep'), kept = $('#kept'), pausedEl = $('#paused');
let key = null, cur = null, N = 0, mode = 'a';
let t = 0, tTarget = 0, playing = false, phase = 'play', phaseT = 0, drag = null, lastNow = 0, raf = 0, ready = false, startTimer = 0;
let centre = 0, bDrag = null, bDragged = false;
let capIdx = -1, texCache = {}, skyCols = {};
const seen = new Set();
const ease = (x) => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

// ── WebGL — 붓질 디졸브(A) · 하루 띠(B). 둘 다 픽셀 섞기만 한다(변형 없음)
const gl = cv.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, alpha: false });
const VS = 'attribute vec2 p; varying vec2 v; void main(){ v = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }';
const MASK_FN = `
  uniform sampler2D uMask; uniform vec2 uDir, uStretch; uniform float uAspect, uMaskScale, uSlide, uP;
  vec3 brush(vec2 uv) {                       // 붓결 좌표: 모티프의 붓 방향(uDir)을 따라 길고, 가로질러 짧다(uStretch 로 붓 길이). 때가 흐르면 결이 그 방향으로 민다
    vec2 d = normalize(uDir); vec2 n = vec2(-d.y, d.x);
    vec2 s = uv * vec2(uAspect, 1.0);
    vec2 q = vec2(dot(s, d) * uStretch.x, dot(s, n) * uStretch.y) * uMaskScale + vec2(uSlide * uP, 0.0);
    return texture2D(uMask, q).rgb;
  }`;
// 붓 길이: 들판은 길게 끄는 가로 붓, 파사드는 짧게 찍는 세로 붓
const STROKE = { haystacks: [1.0, 1.0], rouen: [2.8, 1.25] };
// A: 마스크 값이 문턱(p) 아래인 자리부터 다음 그림이 드러난다. 가장자리에는 붓결 능선(밝고 어두운 가는 줄)
const FS_A = `precision mediump float; varying vec2 v; uniform sampler2D uA, uB; uniform float uSoft; ${MASK_FN}
  void main(){
    vec3 mk = brush(v);
    float p = -uSoft + uP * (1.0 + 2.0 * uSoft);
    float e = smoothstep(p - uSoft, p + uSoft, mk.r);          // 1 = 아직 이전 그림
    vec3 a = texture2D(uA, v).rgb, b = texture2D(uB, v).rgb;
    vec3 col = mix(b, a, e);
    float ridge = 1.0 - abs(2.0 * e - 1.0);
    col += ridge * (mk.g - 0.5) * 0.22 + ridge * 0.03;          // 젖은 가장자리 — 임파스토가 빛을 받듯
    gl_FragColor = vec4(col, 1.0);
  }`;
// B: 가로 위치가 곧 때. 이웃한 두 때를 넓은 세로 띠로 섞되, 띠의 경계는 붓결로 흔든다
const FS_B = `precision mediump float; varying vec2 v; uniform sampler2D uT0, uT1, uT2, uT3, uT4, uT5; uniform float uN, uCentre, uBand, uJit; ${MASK_FN}
  vec3 T(float k, vec2 uv) { if (k < 0.5) return texture2D(uT0, uv).rgb; if (k < 1.5) return texture2D(uT1, uv).rgb; if (k < 2.5) return texture2D(uT2, uv).rgb;
    if (k < 3.5) return texture2D(uT3, uv).rgb; if (k < 4.5) return texture2D(uT4, uv).rgb; return texture2D(uT5, uv).rgb; }
  void main(){
    float u = clamp(uCentre + (v.x - 0.5) * (uN - 1.0), 0.0, uN - 1.0);
    float k = floor(u), f = u - k;
    vec3 mk = brush(v);
    float w = smoothstep(0.5 - uBand, 0.5 + uBand, f + (mk.r - 0.5) * uJit);
    vec3 col = mix(T(k, v), T(min(k + 1.0, uN - 1.0), v), w);
    float ridge = (1.0 - abs(2.0 * w - 1.0)) * step(0.001, f) * step(f, 0.999);
    col += ridge * (mk.g - 0.5) * 0.12;
    gl_FragColor = vec4(col, 1.0);
  }`;
let progA = null, progB = null, maskTex = null;
function compile(fs) {
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
  return { p, u };
}
if (gl) {
  try {
    progA = compile(FS_A); progB = compile(FS_B);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    for (const pr of [progA, progB]) { const loc = gl.getAttribLocation(pr.p, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); }
    maskTex = makeMask();
  } catch (e) { console.warn('[c5] webgl', e); progA = progB = null; }
}
// 붓질 마스크 512² (타일됨): R = 큰 붓 자리(거친 격자) + 중간 붓 + 가는 붓결을 섞어 순위 균등화 → 문턱 p 에 드러나는 비율이 p 가 되도록
//                        G = 가는 붓결만(가장자리 능선용). 가로 결로 만들고 셰이더에서 모티프 방향으로 돌려 쓴다
function makeMask() {
  const S = 512, n = S * S; const data = new Uint8Array(n * 4); const R = new Float32Array(n), G = new Float32Array(n);
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
  for (let i = 0; i < n; i++) R[i] += .20 * (G[i] / 1.5);
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => R[a] - R[b]);   // 순위 균등화
  const rank = new Float32Array(n); idx.forEach((i, r) => { rank[i] = r / (n - 1); });
  for (let i = 0; i < n; i++) { data[i * 4] = rank[i] * 255; data[i * 4 + 1] = Math.max(0, Math.min(255, (G[i] / 1.5) * 255)); data[i * 4 + 2] = 0; data[i * 4 + 3] = 255; }
  const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, S, S, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tx;
}
function loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
function imgTex(im) {
  const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tx;
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
  texCache[k] = { ims, tex: gl && progA ? ims.map(imgTex) : null };
  return texCache[k];
}

// ── 열기 · 닫기
async function open(k) {
  key = k; cur = FR[k]; N = cur.frames.length; mode = 'a'; t = 0; tTarget = 0; centre = (N - 1) / 2; phase = 'play'; playing = false; capIdx = -1; ready = false; bDragged = false;
  $('#viewTitle').textContent = `${cur.name} · ${PLACE[k] || ''}`;
  setMode('a', true); kept.hidden = true; keepBtn.hidden = false; pausedEl.hidden = true; bandHint.classList.remove('off');
  view.hidden = false; document.body.style.overflow = 'hidden';
  layout(); buildArc(); buildBand();
  await load(k);
  if (key !== k) return;
  render(); updateSun(); updateCaption(true);
  ready = true;
  seen.add(k); $(`.motif[data-k="${k}"]`, strip).classList.add('seen');
  // 잠시 뒤 해가 저절로 가기 시작한다
  clearTimeout(startTimer); startTimer = setTimeout(() => { if (!reduceMotion && mode === 'a' && !drag) { playing = true; kick(); } }, 1400);
}
function close() {
  playing = false; clearTimeout(startTimer); if (raf) { cancelAnimationFrame(raf); raf = 0; }
  view.hidden = true; document.body.style.overflow = '';
  const line = $('#wallLine'); if (line.hidden) line.hidden = false;        // 출구 벽의 문장 — 한 번만
}
$('#viewClose').addEventListener('click', close);
$$('#modes button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
function setMode(m, silent) {
  mode = m;
  $$('#modes button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-selected', b.dataset.mode === m); });
  sky.hidden = m !== 'a'; band.hidden = m !== 'b'; band.setAttribute('aria-hidden', m !== 'b');
  keepBtn.textContent = m === 'a' ? '이 시간을 남기기' : '한 장으로 남기기';
  if (m === 'b') { playing = false; pausedEl.hidden = true; }
  else if (!silent && !reduceMotion && phase === 'play') { playing = true; }
  kept.hidden = true; keepBtn.hidden = false;
  if (!silent) { layout(); capIdx = -1; updateBand(); updateCaption(true); kick(); }
}

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
window.addEventListener('resize', () => { if (!view.hidden) { layout(); updateSun(); updateBand(); render(); } });

// ── A · 호와 해
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
    // 이름표: 호 위쪽은 호 바깥으로, 양 끝(지평선 위)은 지평선 아래에 — 해가 지나가도 가려지지 않게
    const out = 16, lx = p.x + ox * out, ly = p.y + oy * out;
    const end = Math.abs(ph) > ARC.phm - 0.02;
    const anchor = end ? (ph < 0 ? 'start' : 'end') : ph < -0.55 ? 'start' : ph > 0.55 ? 'end' : 'middle';
    const x = end ? p.x - (ph < 0 ? 4 : -4) : lx + (anchor === 'start' ? -6 : anchor === 'end' ? 6 : 0);
    const y = end ? hy + 20 : ly + (anchor === 'middle' ? 3 : 4);
    s += `<text data-k="${k}" x="${x}" y="${y}" text-anchor="${anchor}">${cur.frames[k].when}</text>`;
  }
  arcSvg.innerHTML = s;
}
function sunPos(u) { const ph = -ARC.phm + 2 * ARC.phm * Math.max(0, Math.min(1, u)); return { x: ARC.cx + ARC.R * Math.sin(ph), y: ARC.cy - ARC.R * Math.cos(ph) }; }
function sunT() { return phase === 'return' ? (phaseT < RETURN_MS / 2 ? N - 1 : 0) : t; }
function updateSun() {
  if (!ARC || mode !== 'a') return;
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
  if (mode !== 'a' || !ready) return;
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

// 그림을 누르면 멈춤 · 다시 누르면 간다 (A). B 에서는 옆으로 끌어 가운데 때를 옮긴다
stage.addEventListener('pointerdown', (e) => {
  if (!ready) return;
  bDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, c0: centre, moved: false };
  try { stage.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
});
stage.addEventListener('pointermove', (e) => {
  if (!bDrag || e.pointerId !== bDrag.id) return;
  const dx = e.clientX - bDrag.x;
  if (!bDrag.moved && Math.abs(dx) > 6) bDrag.moved = true;
  if (mode === 'b' && bDrag.moved) {
    centre = Math.max(0, Math.min(N - 1, bDrag.c0 - dx / cv.clientWidth * (N - 1)));
    if (!bDragged) { bDragged = true; bandHint.classList.add('off'); }
    updateBand(); updateCaption(); render();
  }
});
const stageUp = (e) => {
  if (!bDrag || e.pointerId !== bDrag.id) return;
  const moved = bDrag.moved; bDrag = null;
  if (mode === 'a' && !moved) {
    if (phase !== 'play') { phase = 'play'; }
    playing = !playing; pausedEl.hidden = playing || reduceMotion; clearTimeout(startTimer); haptic(6);
    if (playing && t >= N - 1 - 1e-3) { phase = 'hold'; phaseT = 0; }
    kick();
  }
};
stage.addEventListener('pointerup', stageUp); stage.addEventListener('pointercancel', stageUp);

// ── B · 하루 띠
function buildBand() { bandLabels.innerHTML = cur.frames.map((f, k) => `<span data-k="${k}">${f.when}</span>`).join(''); updateBand(); }
function updateBand() {
  if (mode !== 'b') return;
  const W = band.clientWidth || 350, kc = Math.round(centre), pad = 30;   // 양 끝 이름표가 잘리지 않게 안쪽으로
  $$('span', bandLabels).forEach((s, k) => { const x = .5 + (k - centre) / (N - 1); s.style.left = (pad + x * (W - pad * 2)) + 'px'; s.style.opacity = x < -0.02 || x > 1.02 ? 0 : 1; s.classList.toggle('on', k === kc); });
}

// ── 그리기
function render() {
  if (!cur || !texCache[key]) return;
  const tc = texCache[key];
  if (!gl || !progA || !tc.tex) return render2d(tc);
  gl.clearColor(0.07, 0.07, 0.06, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  if (mode === 'a') {
    let a, b, p;
    if (phase === 'return') { a = N - 1; b = 0; p = ease(Math.min(1, phaseT / RETURN_MS)); }
    else { a = Math.min(N - 1, Math.floor(t)); b = Math.min(N - 1, a + 1); p = t - a; }
    const { u } = progA; gl.useProgram(progA.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tc.tex[a]); gl.uniform1i(u.uA, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tc.tex[b]); gl.uniform1i(u.uB, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, maskTex); gl.uniform1i(u.uMask, 2);
    const st = STROKE[key] || [1, 1];
    gl.uniform1f(u.uP, p); gl.uniform1f(u.uSoft, 0.035); gl.uniform2f(u.uDir, cur.dir[0], cur.dir[1]); gl.uniform2f(u.uStretch, st[0], st[1]);
    gl.uniform1f(u.uAspect, cur.w / cur.h); gl.uniform1f(u.uMaskScale, 1.15); gl.uniform1f(u.uSlide, 0.22);
  } else {
    const { u } = progB; gl.useProgram(progB.p);
    for (let i = 0; i < 6; i++) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tc.tex[Math.min(i, N - 1)]); gl.uniform1i(u['uT' + i], i); }
    gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, maskTex); gl.uniform1i(u.uMask, 6);
    gl.uniform1f(u.uN, N); gl.uniform1f(u.uCentre, centre); gl.uniform1f(u.uBand, 0.34); gl.uniform1f(u.uJit, 0.5);
    const st = STROKE[key] || [1, 1];
    gl.uniform1f(u.uP, 0); gl.uniform2f(u.uDir, cur.dir[0], cur.dir[1]); gl.uniform2f(u.uStretch, st[0], st[1]); gl.uniform1f(u.uAspect, cur.w / cur.h); gl.uniform1f(u.uMaskScale, 1.15); gl.uniform1f(u.uSlide, 0);
  }
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
// WebGL 이 없을 때: 2D 캔버스로 같은 규칙을 느리게(낮은 해상도) — 마스크 문턱으로 픽셀을 고른다
let ctx2, mask2;
function render2d(tc) {
  if (!ctx2) { ctx2 = cv.getContext('2d'); if (!ctx2) return; }
  const w = cv.width, h = cv.height;
  if (!mask2 || mask2.w !== w) {                       // 간단한 2D 마스크: 가로로 긴 사인 결 + 난수
    const m = new Float32Array(w * h); let s = 7; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const rows = Array.from({ length: h }, () => rnd());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = (Math.sin(x / 37 + rows[y] * 9) * .5 + .5) * .5 + rows[Math.floor(y / 3) * 3 % h] * .3 + rnd() * .2;
    mask2 = { w, m };
  }
  const draw = (im) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h); return x.getImageData(0, 0, w, h); };
  const out = ctx2.createImageData(w, h), d = out.data;
  if (mode === 'a') {
    const a = Math.min(N - 1, Math.floor(t)), b = Math.min(N - 1, a + 1), p = t - a;
    const A = draw(tc.ims[a]).data, B = draw(tc.ims[b]).data;
    for (let i = 0, j = 0; i < w * h; i++, j += 4) { const src = mask2.m[i] < p ? B : A; d[j] = src[j]; d[j + 1] = src[j + 1]; d[j + 2] = src[j + 2]; d[j + 3] = 255; }
  } else {
    const ims = tc.ims.map(draw);
    for (let x = 0; x < w; x++) { const u = Math.max(0, Math.min(N - 1, centre + (x / w - .5) * (N - 1))), k = Math.floor(u), f = u - k, A = ims[k].data, B = ims[Math.min(N - 1, k + 1)].data;
      for (let y = 0; y < h; y++) { const j = (y * w + x) * 4; const wgt = Math.max(0, Math.min(1, (f - .2) / .6)); d[j] = A[j] + (B[j] - A[j]) * wgt; d[j + 1] = A[j + 1] + (B[j + 1] - A[j + 1]) * wgt; d[j + 2] = A[j + 2] + (B[j + 2] - A[j + 2]) * wgt; d[j + 3] = 255; } }
  }
  ctx2.putImageData(out, 0, 0);
}

// ── 시계: 끌기 · 저절로 가기 · 마지막에 머물다 처음으로
function loop(now) {
  raf = 0; const dt = Math.max(0, Math.min(60, now - lastNow)); lastNow = now; let active = false;   // rAF 의 now 는 kick 시점보다 앞설 수 있다 → 음수 금지
  if (mode === 'a') {
    if (drag) { const d = tTarget - t; if (Math.abs(d) > 0.002) { t += d * Math.min(1, dt / 110); active = true; } else t = tTarget; }
    else if (!playing && Math.abs(tTarget - t) > 0.002 && phase === 'play') { t += (tTarget - t) * Math.min(1, dt / 160); active = true; }
    else if (playing) {
      if (phase === 'hold') { phaseT += dt; if (phaseT >= HOLD_MS) { phase = 'return'; phaseT = 0; } }
      else if (phase === 'return') { phaseT += dt; if (phaseT >= RETURN_MS) { phase = 'play'; t = 0; tTarget = 0; } }
      else { t += dt / DAY_MS * (N - 1); if (t >= N - 1) { t = N - 1; phase = 'hold'; phaseT = 0; } tTarget = t; }
      active = true;
    }
    render(); updateSun(); updateCaption();
  } else { render(); }
  if (active) raf = requestAnimationFrame(loop);
}
function kick() { if (!raf) { lastNow = performance.now(); raf = requestAnimationFrame(loop); } }
document.addEventListener('visibilitychange', () => { if (document.hidden) { playing = false; pausedEl.hidden = true; } });

// ── 캡션: 지금 가장 많이 보이는 그림의 제목 · 연도 · 소장처
function updateCaption(force) {
  const k = mode === 'a' ? Math.round(sunT()) : Math.round(centre);
  if (!force && k === capIdx) return;
  capIdx = k; const fr = cur.frames[k], m = meta(fr.src);
  $('#capWhen').textContent = mode === 'a' ? fr.when : `가운데 · ${fr.when}`;
  $('#capTitle').textContent = `〈${m.title_ko || m.title_en}〉`;
  $('#capMeta').textContent = mode === 'a' ? [m.year, m.museum_ko, m.license === 'CC0' ? 'CC0' : 'PD'].filter(Boolean).join(' · ') : `왼쪽 ${cur.frames[0].when} → 오른쪽 ${cur.frames[N - 1].when} · ${N}점`;
  $('#viewCount').textContent = `${k + 1} / ${N}`;
  caption.classList.remove('fade'); void caption.offsetWidth; caption.classList.add('fade');
}

// ── 남기기: 지금 캔버스 → JPEG(기기 안). 입장도 수치도 없다 — 멈춘 시간 한 줄만
keepBtn.addEventListener('click', () => {
  if (!ready) return;
  if (mode === 'a') { playing = false; pausedEl.hidden = true; }
  render();
  const url = cv.toDataURL('image/jpeg', 0.86);
  const k = mode === 'a' ? Math.round(sunT()) : Math.round(centre), fr = cur.frames[k], m = meta(fr.src);
  $('#keptImg').src = url; $('#keptDl').href = url; $('#keptDl').download = `monet-c5-${key}-${mode}.jpg`;
  $('#keptLine').textContent = mode === 'a' ? `당신이 멈춘 시간: ${fr.when}` : `당신의 하루: ${fr.when}를 가운데에`;
  $('#keptMeta').textContent = mode === 'a' ? `〈${m.title_ko || m.title_en}〉 · ${m.year} · ${m.museum_ko}` : `${cur.name} · ${cur.frames[0].when} → ${cur.frames[N - 1].when}`;
  keepBtn.hidden = true; kept.hidden = false; haptic(10);
  try {                                                   // 작은 사본만 기기에
    const c = document.createElement('canvas'); const s = 320 / cv.width; c.width = 320; c.height = Math.round(cv.height * s); c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height);
    localStorage.setItem('m100_c5_keep', JSON.stringify({ motif: key, mode, when: fr.when, title: m.title_ko || m.title_en, at: Date.now(), thumb: c.toDataURL('image/jpeg', .7) }));
  } catch (_) { /* noop */ }
});

// 검수용
window.__c5 = { FR, open, close, setMode, sunPos: (u) => { const r = sky.getBoundingClientRect(); const p = sunPos(u); return { x: r.left + p.x, y: r.top + p.y }; },
  get t() { return t; }, get playing() { return playing; }, get mode() { return mode; }, get centre() { return centre; }, get ready() { return ready; }, get phase() { return phase; }, get gl() { return !!(gl && progA); }, get seen() { return [...seen]; } };
