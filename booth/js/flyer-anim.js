// C-1 Step4 — 전단지 삽화 애니메이션 (전단지 원본 한 장으로 구성, 생성 얼굴 없음)
// 하나의 프래그먼트 셰이더에서:
//   · 카메라 푸시인/팬 (전단지 좌표 기준 시점 키프레임)
//   · 인물 움직임 — 머리·어깨 위치에 국소 가우시안 변위(끄덕임·호흡·말하는 인물 강조)
//   · 실내 조명 깜빡임 (탁자 위 따뜻한 빛 웅덩이)
//   · 담배 연기 (fbm 노이즈를 위로 흘려 보냄)
//   · 먼지 입자, 필름 그레인, 비네트, 삽화 영역 바깥 텍스트는 서서히 어둡게
// 인물 좌표 = fl_batignolles.jpg(631×946) 삽화를 직접 보고 찍은 픽셀 좌표

const W = 631, H = 946;
// [x, y, r] 머리 중심 (픽셀)
const HEADS = [
  [75, 668, 22],   // 0 왼쪽 실크해트
  [117, 662, 16],  // 1 뒤쪽 모자
  [160, 667, 22],  // 2 오른쪽을 보는 수염 인물
  [207, 655, 16],  // 3
  [255, 657, 16],  // 4
  [300, 665, 24],  // 5 뒷모습 (중앙)
  [352, 657, 16],  // 6
  [425, 667, 22],  // 7 왼쪽을 보는 인물
  [500, 665, 17],  // 8 오른쪽 모자
  [550, 675, 22],  // 9 오른쪽 끝
];
// 연기 발원점 (픽셀) — 탁자 위·인물 손 높이
const SMOKE = [[232, 700], [440, 712], [120, 706]];

// 장면 (초) — 시점: 중심(cx, cy: 0..1)과 폭(vw: 전단지 폭 대비), 화자 인덱스
export const SHOTS = [
  { t: 0.0, cx: 0.5, cy: 0.5, vw: 1.0, speaker: -1, focus: 0, color: 0 },
  { t: 2.4, cx: 0.5, cy: 0.5, vw: 1.0, speaker: -1, focus: 0, color: 0 },
  { t: 5.2, cx: 0.5, cy: 0.72, vw: 0.86, speaker: -1, focus: 1, color: 1 },
  { t: 8.6, cx: 0.27, cy: 0.72, vw: 0.48, speaker: 2, focus: 1, color: 1, line: 1 },
  { t: 13.4, cx: 0.72, cy: 0.72, vw: 0.48, speaker: 7, focus: 1, color: 1, line: 2 },
  { t: 18.2, cx: 0.42, cy: 0.715, vw: 0.52, speaker: 4, focus: 1, color: 1, line: 3 },
  { t: 23.0, cx: 0.5, cy: 0.7, vw: 0.86, speaker: -1, focus: 1, color: 1 },
  { t: 26.0, cx: 0.5, cy: 0.5, vw: 1.0, speaker: -1, focus: 0.35, color: 1 },
];
export const DURATION = 27.5;

const VS = `attribute vec2 aPos; varying vec2 vQ; void main(){ vQ = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FS = `
precision highp float;
varying vec2 vQ;
uniform sampler2D uTex;
uniform float uTime, uFocus, uColor, uAspect, uSpeaker, uTalk, uSpeakerX;
uniform vec3 uView;                 // cx, cy, vw
uniform vec4 uHeads[10];            // x, y, r, phase  (uv)
uniform vec3 uSmoke[3];
uniform float uFlyerAspect;         // H/W

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for(int i=0;i<5;i++){ s += a*noise(p); p = p*2.03 + 7.1; a *= 0.5; } return s; }

void main(){
  // 화면 → 전단지 uv (y 아래로 증가)
  vec2 q = vec2(vQ.x, 1.0 - vQ.y);
  float vh = uView.z * uAspect / uFlyerAspect;          // 화면 세로가 덮는 전단지 높이(uv)
  vec2 uv = vec2(uView.x + (q.x - 0.5) * uView.z, uView.y + (q.y - 0.5) * vh);

  // 인물 움직임 — 국소 변위
  vec2 off = vec2(0.0);
  for (int i = 0; i < 10; i++) {
    vec4 h = uHeads[i];
    float spk = step(abs(float(i) - uSpeaker), 0.5);
    vec2 d = (uv - h.xy) * vec2(1.0, uFlyerAspect);
    float r = h.z * 1.6;
    float wHead = exp(-dot(d, d) / (r * r));
    // 어깨·몸통 (머리 아래)
    vec2 db = (uv - h.xy - vec2(0.0, h.z * 3.2 / uFlyerAspect)) * vec2(1.0, uFlyerAspect);
    float rb = h.z * 3.4;
    float wBody = exp(-dot(db, db) / (rb * rb));
    float t = uTime + h.w * 6.0;
    // 평상시: 작은 흔들림 / 화자: 말하는 리듬의 끄덕임
    float idle = sin(t * 0.9) * 0.0016 + sin(t * 2.3) * 0.0006;
    float nod = spk * uTalk * (sin(uTime * 7.0) * 0.5 + 0.5) * sin(uTime * 2.1 + 1.0) * 0.0032;
    vec2 headOff = vec2(idle + spk * uTalk * sin(uTime * 1.3) * 0.0016, sin(t * 1.1) * 0.0010 + nod);
    // 듣는 인물은 화자 쪽으로 아주 조금 고개를 돌림
    float lookDir = sign(uSpeakerX - h.x);
    headOff.x += (1.0 - spk) * step(0.0, uSpeaker) * uTalk * lookDir * 0.0012;
    vec2 bodyOff = vec2(0.0, sin(t * 0.7) * 0.0012);      // 호흡
    off += wHead * headOff + wBody * bodyOff * 0.7;
  }
  vec2 suv = uv - off;

  vec3 col;
  float inside = step(0.0, suv.x) * step(suv.x, 1.0) * step(0.0, suv.y) * step(suv.y, 1.0);
  col = texture2D(uTex, clamp(suv, 0.0, 1.0)).rgb;

  // 삽화 영역 마스크 (y 0.605~0.875, 테두리 안)
  float ill = smoothstep(0.55, 0.645, uv.y) * (1.0 - smoothstep(0.855, 0.89, uv.y)) * smoothstep(0.02, 0.05, uv.x) * (1.0 - smoothstep(0.95, 0.98, uv.x));

  // 따뜻한 채색 (명암 → 갈색·호박색·크림)
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 warm = mix(vec3(0.13, 0.08, 0.05), vec3(0.60, 0.40, 0.21), smoothstep(0.05, 0.55, lum));
  warm = mix(warm, vec3(0.98, 0.88, 0.68), smoothstep(0.5, 0.95, lum));

  // 조명 — 탁자 위 빛 웅덩이, 가스등처럼 미세하게 깜빡임
  float flick = 0.86 + 0.08 * noise(vec2(uTime * 6.0, 0.0)) + 0.06 * noise(vec2(uTime * 17.0, 3.0));
  vec2 L1 = (uv - vec2(0.36, 0.735)) * vec2(1.0, uFlyerAspect * 1.6);
  vec2 L2 = (uv - vec2(0.68, 0.745)) * vec2(1.0, uFlyerAspect * 1.6);
  float pool = exp(-dot(L1, L1) / 0.05) + 0.8 * exp(-dot(L2, L2) / 0.04);
  vec3 lit = warm * (0.62 + pool * 0.75 * flick) + pool * flick * vec3(0.10, 0.05, 0.0);
  // 창가 역광 (뒤쪽 창)
  lit += vec3(0.08, 0.06, 0.03) * smoothstep(0.66, 0.6, uv.y) * ill;

  // 연기
  float smoke = 0.0;
  for (int i = 0; i < 3; i++) {
    vec3 s = uSmoke[i];
    float up = s.y - uv.y;                                  // 발원점 위쪽 거리(uv)
    float rise = smoothstep(0.0, 0.012, up) * (1.0 - smoothstep(0.06, 0.13, up));
    float sway = (fbm(vec2(up * 22.0 - uTime * 0.5, s.z)) - 0.5) * 0.05 * (up * 10.0 + 0.2);
    float width = 0.006 + up * 0.22;
    float dx = (uv.x - s.x - sway) / width;
    float plume = exp(-dx * dx);
    float n = fbm(vec2(uv.x * 26.0, uv.y * 18.0 + uTime * 0.55 + s.z));
    smoke += plume * rise * smoothstep(0.3, 0.75, n) * 1.2;
  }
  smoke *= ill;
  lit = mix(lit, vec3(0.90, 0.84, 0.74), clamp(smoke, 0.0, 0.75) * 0.8);

  // 먼지 입자 (빛 웅덩이 안에서만)
  vec2 g = uv * vec2(90.0, 90.0 * uFlyerAspect) + vec2(0.0, -uTime * 1.2);
  vec2 gi = floor(g); vec2 gf = fract(g) - 0.5;
  float rnd = hash(gi);
  float mote = step(0.965, rnd) * smoothstep(0.2, 0.0, length(gf + vec2(sin(uTime + rnd * 20.0) * 0.2, 0.0)));
  lit += mote * pool * 0.35 * vec3(1.0, 0.85, 0.6) * (0.5 + 0.5 * sin(uTime * 2.0 + rnd * 30.0));

  col = mix(col, lit, ill * uColor);

  // 텍스트 영역은 장면에 집중할 때 어둡게
  float bandDim = mix(1.0, 0.32, uFocus * (1.0 - ill));
  col *= bandDim;

  // 필름 그레인 + 비네트 + 미세한 밝기 요동
  float grain = (hash(q * 900.0 + fract(uTime * 13.0)) - 0.5) * 0.06;
  col += grain * (0.4 + 0.6 * uFocus);
  vec2 vq = q - 0.5;
  col *= 1.0 - dot(vq, vq) * 0.55;
  col *= 0.985 + 0.015 * sin(uTime * 23.0);

  // 전단지 바깥
  vec3 bg = vec3(0.07, 0.05, 0.035);
  col = mix(bg, col, inside);
  gl_FragColor = vec4(col, 1.0);
}`;

export function createFlyerAnimator(canvas, img, { onLine, onEnd, onTime, freezeAt = null } = {}) {
  const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: false });
  if (!gl) throw new Error('webgl_unavailable');
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos'); gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

  const U = (n) => gl.getUniformLocation(prog, n);
  const uTime = U('uTime'), uFocus = U('uFocus'), uColor = U('uColor'), uAspect = U('uAspect'), uView = U('uView'),
    uSpeaker = U('uSpeaker'), uTalk = U('uTalk'), uSpeakerX = U('uSpeakerX');
  gl.uniform1i(U('uTex'), 0);
  gl.uniform1f(U('uFlyerAspect'), H / W);
  gl.uniform4fv(U('uHeads'), new Float32Array(HEADS.flatMap(([x, y, r], i) => [x / W, y / H, r / W, (i * 0.37) % 1])));
  gl.uniform3fv(U('uSmoke'), new Float32Array(SMOKE.flatMap(([x, y], i) => [x / W, y / H, i * 3.7])));

  const smooth = (t) => t * t * (3 - 2 * t);
  function sample(t) {
    let a = SHOTS[0], b = SHOTS[0];
    for (let i = 0; i < SHOTS.length; i++) { if (SHOTS[i].t <= t) { a = SHOTS[i]; b = SHOTS[i + 1] || SHOTS[i]; } }
    // 각 장면의 앞 1.8초 동안 이전 → 현재로 이동, 이후 유지
    const TRANS = 1.8;
    const idx = SHOTS.indexOf(a);
    const prev = SHOTS[idx - 1] || a;
    const k = Math.min((t - a.t) / TRANS, 1);
    const e = smooth(Math.max(k, 0));
    const L = (p, q) => p + (q - p) * e;
    return {
      cx: L(prev.cx, a.cx), cy: L(prev.cy, a.cy), vw: L(prev.vw, a.vw),
      focus: L(prev.focus, a.focus), color: L(prev.color, a.color),
      speaker: a.speaker, talk: a.speaker >= 0 ? Math.min(Math.max((t - a.t - 0.6) / 0.8, 0), 1) : 0,
      line: a.line || 0, shot: idx, next: b,
    };
  }

  let t0 = performance.now(), raf = 0, running = false, lastLine = -1, ended = false, pausedAt = 0;
  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    return h / Math.max(w, 1);
  }
  function frame(now) {
    if (!running) return;
    const t = freezeAt !== null ? freezeAt : (now - t0) / 1000;   // ?at=초 — 검수용 정지 프레임
    const tt = Math.min(t, DURATION);
    const s = sample(tt);
    const aspect = size();
    // 세로가 전단지 밖으로 나가지 않게 중심 보정 (가능한 범위에서)
    const vh = s.vw * aspect / (H / W);
    // 전체 보기에서 전단지가 화면보다 작으면 가운데 정렬, 근접 장면은 삽화 중심 유지
    let cy = s.cy;
    if (vh >= 1) cy = 0.5 + (s.cy - 0.5) * Math.max(0, Math.min(1, (1.25 - vh) / 0.25));
    gl.uniform1f(uTime, t);
    gl.uniform1f(uFocus, s.focus);
    gl.uniform1f(uColor, s.color);
    gl.uniform1f(uAspect, aspect);
    gl.uniform3f(uView, s.cx, cy, s.vw);
    gl.uniform1f(uSpeaker, s.speaker);
    gl.uniform1f(uSpeakerX, s.speaker >= 0 ? HEADS[s.speaker][0] / W : 0.5);
    gl.uniform1f(uTalk, s.talk);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (s.line !== lastLine) { lastLine = s.line; onLine && onLine(s.line, s.speaker); }
    onTime && onTime(tt / DURATION);
    if (t >= DURATION && !ended) { ended = true; onEnd && onEnd(); }
    raf = requestAnimationFrame(frame);
  }
  return {
    play() { t0 = performance.now(); lastLine = -1; ended = false; running = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
    pause() { if (!running) return; running = false; pausedAt = performance.now(); cancelAnimationFrame(raf); },
    resume() { if (running) return; t0 += performance.now() - pausedAt; running = true; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    get running() { return running; },
  };
}
