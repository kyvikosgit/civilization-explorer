// 에트르타 도입(11/09 · 3D) — 어두침침한 화실의 이젤. 빈 캔버스에 넓은 붓이 사선으로 슥슥 지나가며 모네 〈에트르타의 절벽〉(1885)이 칙칙한 색으로 그려진다.
//   그다음 카메라는 그대로 두고 둘레만 바뀐다: 화실 벽 · 바닥이 걷히고 바깥 빛이 들어와 에트르타 절벽 위(실사 사진)에 이젤 · 물감 상자가 서 있다 — 물감을 들고 밖으로 나간 것.
//   그림은 같은 그림 그대로 색만 생생해진다. 그 장면이 이 화면의 배경으로 남는다(기획 장표 배경 그림은 쓰지 않는다).
//   바깥 사진: 위키미디어 공용 'Étretat, Frankreich10.jpg'(Nikater, 2013 · 퍼블릭 도메인) — 바늘바위 · 아발 아치 · 절벽 위 풀밭
//   그림: 모네 〈에트르타의 절벽〉(1885, 클라크 미술관, 퍼블릭 도메인) — 사진과 같은 쪽에서 본 바늘바위 · 아발 아치
//   3D 카메라는 사진의 수평선 높이(사진 높이의 18.5%)에 맞춰 내려다보는 각을 정하고, 처음부터 끝까지 그 각을 지킨다(배경이 바뀌어도 이음매가 없게)
//   그림은 휘거나 일렁이지 않는다(붓질로 칠해짐 · 빛 · 색만).
//   playIntro({ onDone, instant }) — instant 면 끝 장면을 바로 그린다. 누르면 끝 장면으로
import * as T from 'three';

const V3 = new URL('./', import.meta.url).href;
const PAINTING = V3 + 'img/et_monet_cliffs.jpg';   // 모네 〈에트르타의 절벽〉 1885 · 클라크 미술관 · 퍼블릭 도메인 — 사진과 같은 배치(왼쪽 바늘바위 · 오른쪽 아발 아치)
const OUTDOOR = V3 + 'img/et_outdoor.jpg', OUT_ASP = 2434 / 1757, HORIZON = 0.185, FOCUS_X = 0.2;   // 실사(살짝 흐림 · 채도 · 대비만 낮춤) · 수평선 높이 · 사진 가로 위치(바늘바위와 아치 사이)
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp = (v) => Math.max(0, Math.min(1, v));
const load = (src) => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

// 시간표(초) — 화실에서 칠하기 → 밖으로
const PAINT_AT = 1.1, SWEEP = 0.5, GAP = 0.34, NS = 8;
const DET_AT = PAINT_AT + GAP * (NS - 1) + SWEEP, DET = 0.5;
const OUT_GO = DET_AT + DET + 0.15, OUT_D = 2.2;              // 밖으로: 벽 · 바닥이 걷히고 빛 · 사진 · 그림 색
const OUT_AT = OUT_GO + OUT_D + 0.2;

// 캔버스(그림) 크기 — 그림 비율 그대로(야외용 작은 캔버스)
const CVS = { W: 0.52, H: 0.52 * 1279 / 1600, D: 0.022 };
const TEX_W = 1024, TEX_H = Math.round(1024 * 1279 / 1600);

// ── 칠해진 그림 한 장(미리): 그림을 보고 굵은 붓 → 가는 붓으로 칠한 판(Hertzmann 1998 방식). 넓은 붓이 지나갈 때 이 판이 묻어난다
function paintedVersion(img) {
  const MX = 240, MY = Math.round(240 * TEX_H / TEX_W);
  const c = document.createElement('canvas'); c.width = MX; c.height = MY;
  const x = c.getContext('2d', { willReadFrequently: true });
  const cur = new Float32Array(MX * MY * 3);
  for (let i = 0; i < MX * MY; i++) { cur[i * 3] = 237; cur[i * 3 + 1] = 227; cur[i * 3 + 2] = 207; }
  const rand = rnd(7);
  const det = document.createElement('canvas'); det.width = TEX_W; det.height = TEX_H;
  const g = det.getContext('2d');
  g.fillStyle = '#EDE3CF'; g.fillRect(0, 0, TEX_W, TEX_H);
  const k = TEX_W / MX;
  const sh = (c, f) => `rgb(${Math.min(255, c[0] * f) | 0},${Math.min(255, c[1] * f) | 0},${Math.min(255, c[2] * f) | 0})`;
  for (const L of [{ r: 12, th: 24 }, { r: 7, th: 20 }, { r: 4, th: 18 }, { r: 2.2, th: 16 }]) {
    x.filter = `blur(${Math.max(0.5, L.r * 0.5)}px)`; x.clearRect(0, 0, MX, MY); x.drawImage(img, 0, 0, MX, MY); x.filter = 'none';
    const ref = x.getImageData(0, 0, MX, MY).data;
    const lum = new Float32Array(MX * MY); for (let i = 0; i < MX * MY; i++) lum[i] = 0.3 * ref[i * 4] + 0.59 * ref[i * 4 + 1] + 0.11 * ref[i * 4 + 2];
    const at = (px, py) => Math.max(0, Math.min(MY - 1, py | 0)) * MX + Math.max(0, Math.min(MX - 1, px | 0));
    const diff = (q) => Math.hypot(ref[q * 4] - cur[q * 3], ref[q * 4 + 1] - cur[q * 3 + 1], ref[q * 4 + 2] - cur[q * 3 + 2]);
    const layer = [], step = Math.max(1, Math.round(L.r));
    for (let gy = 0; gy < MY; gy += step) for (let gx = 0; gx < MX; gx += step) {
      let best = -1, bk = 0, sum = 0, n = 0;
      for (let yy = gy; yy < Math.min(MY, gy + step); yy++) for (let xx = gx; xx < Math.min(MX, gx + step); xx++) { const q = yy * MX + xx, e = diff(q); sum += e; n++; if (e > best) { best = e; bk = q; } }
      if (sum / n < L.th) continue;
      let px = bk % MX, py = (bk / MX) | 0;
      const col = [ref[bk * 4], ref[bk * 4 + 1], ref[bk * 4 + 2]], pts = [[px, py]];
      let ldx = 0, ldy = 0;
      for (let s = 1; s < 8; s++) {
        const q = at(px, py);
        if (s > 2 && Math.hypot(ref[q * 4] - col[0], ref[q * 4 + 1] - col[1], ref[q * 4 + 2] - col[2]) > Math.hypot(cur[q * 3] - col[0], cur[q * 3 + 1] - col[1], cur[q * 3 + 2] - col[2])) break;
        const gx_ = lum[at(px + 1, py)] - lum[at(px - 1, py)], gy_ = lum[at(px, py + 1)] - lum[at(px, py - 1)];
        if (Math.hypot(gx_, gy_) < 0.5) { if (!ldx && !ldy) { ldx = 1; ldy = 0.1 * (rand() - 0.5); } }
        else { let dx = -gy_, dy = gx_; const l = Math.hypot(dx, dy); dx /= l; dy /= l; if (!ldx && !ldy) { ldx = dx; ldy = dy; } else { if (ldx * dx + ldy * dy < 0) { dx = -dx; dy = -dy; } ldx = 0.7 * ldx + 0.3 * dx; ldy = 0.7 * ldy + 0.3 * dy; } }
        const ll = Math.hypot(ldx, ldy) || 1; px += (ldx / ll) * L.r; py += (ldy / ll) * L.r;
        pts.push([px, py]);
      }
      for (const [qx, qy] of pts) { const R = Math.ceil(L.r); for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) { if (xx * xx + yy * yy > L.r * L.r) continue; const X = (qx + xx) | 0, Y = (qy + yy) | 0; if (X < 0 || Y < 0 || X >= MX || Y >= MY) continue; const q = Y * MX + X; cur[q * 3] = col[0]; cur[q * 3 + 1] = col[1]; cur[q * 3 + 2] = col[2]; } }
      layer.push({ pts, col, r: L.r, seed: rand() });
    }
    for (let i = layer.length - 1; i > 0; i--) { const j = (rand() * (i + 1)) | 0; [layer[i], layer[j]] = [layer[j], layer[i]]; }
    for (const st of layer) {
      const P = st.pts.map(([a, b]) => [a * k, b * k]), w = st.r * 2 * k;
      const line = (off, lw, color, alpha) => { g.globalAlpha = alpha; g.strokeStyle = color; g.lineWidth = lw; g.beginPath(); P.forEach(([a, b], i) => { const p0 = P[Math.max(0, i - 1)], p1 = P[Math.min(P.length - 1, i + 1)], dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1; const X = a - (dy / l) * off, Y = b + (dx / l) * off; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); if (P.length === 1) g.lineTo(P[0][0] + w * 0.3, P[0][1]); g.stroke(); };
      g.lineCap = 'round'; g.lineJoin = 'round';
      line(0, w, sh(st.col, 1), 0.95);
      let sd = st.seed * 1000; const r = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
      for (let i = 0; i < 3; i++) line((r() - 0.5) * w * 0.8, Math.max(0.6, w * (0.06 + r() * 0.08)), sh(st.col, r() < 0.5 ? 0.86 : 1.12), 0.35);
      line(-w * 0.32, Math.max(0.6, w * 0.12), sh(st.col, 1.2), 0.16);
    }
  }
  g.globalAlpha = 1;
  return det;
}

function canvasTex(w, h, draw, aniso = 4, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = aniso; return t;
}


export async function playIntro({ onDone, instant = false } = {}) {
  const host = document.querySelector('.room-bg') || document.body;
  const rb = host.getBoundingClientRect();
  const VW = rb.width || innerWidth, VH = rb.height || innerHeight;
  // 바깥 사진(뒤) · 3D 판(앞, 투명 바탕) — 둘 다 배경 자리(.room-bg)에 깔고 그대로 남긴다. 제목 · 건너뛰기 안내만 위에
  const photo = document.createElement('div'); photo.className = 'et-photo';
  const cv = document.createElement('canvas'); cv.className = 'et3d';
  const flash = document.createElement('div'); flash.className = 'et-flash';
  const before = host.querySelector('.shade') || null;
  host.insertBefore(photo, before); host.insertBefore(cv, before); host.insertBefore(flash, before);
  host.classList.add('has3d');
  const ui = document.createElement('div'); ui.id = 'etIntro'; ui.setAttribute('aria-hidden', 'true');
  ui.innerHTML = '<div class="ei-title" hidden></div><p class="et-skip">누르면 건너뜁니다</p>';   // 11/09: 제목 글씨 없음
  Object.assign(ui.style, { left: `${rb.left}px`, top: `${rb.top}px`, width: `${VW}px`, height: `${VH}px` });
  if (!instant) document.body.appendChild(ui);
  const title = ui.querySelector('.ei-title');

  // 바깥 사진 구도 — 화면을 덮게. 세로 화면이면 높이를 맞추고 바늘바위와 아치 사이가 화면 왼쪽 30%에
  let IW, IH, PX, PY;
  if (VW / VH < OUT_ASP) { IH = VH; IW = VH * OUT_ASP; PX = Math.min(0, Math.max(VW - IW, VW * 0.26 - IW * FOCUS_X)); PY = 0; }   // 바늘바위 · 아치가 이젤 왼쪽에 보이게
  else { IW = VW; IH = VW / OUT_ASP; PX = 0; PY = (VH - IH) * 0.5; }
  Object.assign(photo.style, { backgroundImage: `url("${OUTDOOR}")`, backgroundSize: `${IW}px ${IH}px`, backgroundPosition: `${PX}px ${PY}px` });
  const hy = (PY + IH * HORIZON) / VH;                     // 화면에서 수평선 높이(0 위 ~ 1 아래)

  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); }
  catch (e) { photo.style.opacity = '1'; cv.remove(); ui.remove(); onDone?.(); return; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(VW, VH, false);
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.setClearColor(0x0d0b09, 1);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(VW / VH < 0.8 ? 56 : 44, VW / VH, 0.05, 200);
  cam.rotation.order = 'YXZ';
  const R = rnd(5);
  const fade = [];                                        // 밖으로 나갈 때 걷히는 것(재료)
  const fadeMat = (m) => { m.transparent = true; fade.push(m); return m; };

  // ── 화실: 짙은 마루(물감 얼룩) · 회갈색 회벽 · 왼쪽 창으로 흐린 빛
  scene.fog = new T.Fog(0x0d0b09, 4, 11);
  const floorTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#2a1d14'; g.fillRect(0, 0, w, h);
    const r = rnd(12);
    for (let y = 0; y < h; y += 64) { g.fillStyle = `rgba(0,0,0,${0.25 + r() * 0.2})`; g.fillRect(0, y, w, 2); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '80,55,35' : '10,6,3'},${0.1 + r() * 0.15})`; g.fillRect(r() * w, y + 4 + r() * 56, 40 + r() * 200, 1 + r() * 2); } }
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${['120,90,60', '70,80,90', '110,60,40'][i % 3]},${0.06 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 10, 2 + r() * 6, r() * 3, 0, 7); g.fill(); }
  }, aniso);
  floorTex.wrapS = floorTex.wrapT = T.RepeatWrapping; floorTex.repeat.set(4, 4);
  const floor = new T.Mesh(new T.PlaneGeometry(30, 30), fadeMat(new T.MeshStandardMaterial({ map: floorTex, roughness: 0.65 })));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const plasterTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#4a433b'; g.fillRect(0, 0, w, h);
    const r = rnd(21);
    for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h, rr = 20 + r() * 120; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(${r() < 0.5 ? '20,16,12' : '120,108,92'},${0.06 + r() * 0.08})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    for (let i = 0; i < 20000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 1, 1); }
  }, aniso);
  plasterTex.wrapS = plasterTex.wrapT = T.RepeatWrapping;
  const wallMat = fadeMat(new T.MeshStandardMaterial({ map: plasterTex, roughness: 0.95 }));
  const backWall = new T.Mesh(new T.PlaneGeometry(10, 6), wallMat); backWall.position.set(0, 3, -2.2); backWall.receiveShadow = true; scene.add(backWall);
  const leftWall = new T.Mesh(new T.PlaneGeometry(9, 6), wallMat); leftWall.rotation.y = Math.PI / 2; leftWall.position.set(-2.6, 3, 1.8); leftWall.receiveShadow = true; scene.add(leftWall);
  const winGlow = new T.Mesh(new T.PlaneGeometry(1.1, 1.7), fadeMat(new T.MeshBasicMaterial({ color: 0x8e9caa, fog: false, toneMapped: false })));
  winGlow.rotation.y = Math.PI / 2; winGlow.position.set(-2.59, 2.0, 0.6); scene.add(winGlow);
  const frameMat = fadeMat(new T.MeshStandardMaterial({ color: 0x2b241d, roughness: 0.8 }));
  for (const [w, h, y, z] of [[0.08, 1.8, 2.0, 0.05], [0.08, 1.8, 2.0, 1.15], [0.08, 1.8, 2.0, 0.6], [1.2, 0.08, 1.15, 0.6], [1.2, 0.08, 2.85, 0.6], [1.2, 0.05, 2.0, 0.6]]) { const b = new T.Mesh(new T.BoxGeometry(0.06, h, w), frameMat); b.position.set(-2.56, y, z); scene.add(b); }
  // ── 바깥 바닥: 절벽 위 풀밭(붓질로 칠한 질감) — 이젤 뒤 1.2m 쯤에서 끝나고, 가장자리 아래로 흰 백악 절벽면이 조금 보인다. 그 너머는 배경 그림(바다 · 바위)
  // 풀 질감 — 사진 앞쪽 마른 풀 색(금빛 · 올리브)으로 아주 가는 풀잎을 촘촘히. 무늬가 반복돼 보이지 않게 크게(2048)
  const grassPaint = canvasTex(2048, 2048, (g, w, h) => {
    g.fillStyle = '#7d7a45'; g.fillRect(0, 0, w, h);
    { const r0 = rnd(5); for (let i = 0; i < 140; i++) { const x = r0() * w, y = r0() * h, rr = 60 + r0() * 260, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, r0() < 0.5 ? 'rgba(60,66,28,.45)' : 'rgba(190,170,100,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); } }   // 덤불 · 마른 풀 얼룩
    const r = rnd(77), cols = ['#5d6330', '#8a8445', '#a69a58', '#c2b06c', '#6f7838', '#4d5428', '#b7a466', '#949055', '#d1c088'];
    g.lineCap = 'round';
    for (let i = 0; i < 140000; i++) { const x = r() * w, y = r() * h, l = 8 + r() * 26, a = -Math.PI / 2 + (r() - 0.5) * 0.9; g.strokeStyle = cols[(r() * cols.length) | 0]; g.globalAlpha = 0.35 + r() * 0.5; g.lineWidth = 0.8 + r() * 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    g.globalAlpha = 1;
  }, aniso);
  grassPaint.wrapS = grassPaint.wrapT = T.RepeatWrapping; grassPaint.repeat.set(1.6, 1.6);
  const groundMat = new T.MeshStandardMaterial({ map: grassPaint, roughness: 1, transparent: true, opacity: 0, color: 0xE6E0CC, depthWrite: false });
  // 가장자리는 칼로 자른 선이 아니라 풀이 성겨지며 사진 속으로 스며들게(뒤쪽 0.7m 동안 투명해짐)
  groundMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\nfloat edgeZ = -1.25 + sin(vWp.x * 1.7) * 0.12 + sin(vWp.x * 4.3 + 1.0) * 0.05;\nfloat nz = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));\ndiffuseColor.a *= smoothstep(edgeZ, edgeZ + 0.55, vWp.z + (nz - 0.35) * 0.9);   // 밝은 풀잎이 먼저 남고 어두운 데가 먼저 비어 — 풀 끝이 들쭉날쭉');
  };
  const EDGE = (x) => -1.25 + Math.sin(x * 1.7) * 0.12 + Math.sin(x * 4.3 + 1) * 0.05;
  const gPts = [[-9, 9], [9, 9]]; for (let x = 9; x >= -9; x -= 0.12) gPts.push([x, EDGE(x)]);
  const ground = new T.Mesh(new T.ShapeGeometry(new T.Shape(gPts.map(([x, z]) => new T.Vector2(x, -z))), 1), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0.002; ground.receiveShadow = true; scene.add(ground);
  { // 가장자리 아래 백악 절벽면 — 가장자리를 따라 내려가는 띠
    const chalkPaint = canvasTex(1024, 256, (g, w, h) => { g.fillStyle = '#e9e1cd'; g.fillRect(0, 0, w, h); const r = rnd(41); g.lineCap = 'round'; for (let i = 0; i < 1400; i++) { g.strokeStyle = ['#d8cfb8', '#f4eedd', '#bdb39a', '#cfc6ae'][(r() * 4) | 0]; g.globalAlpha = 0.5; g.lineWidth = 2 + r() * 6; const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 30, y + 6 + r() * 14); g.stroke(); } g.globalAlpha = 1; const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(70,80,40,.55)'); gr.addColorStop(0.18, 'rgba(70,80,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, aniso);
    chalkPaint.wrapS = T.RepeatWrapping; chalkPaint.repeat.set(6, 1);
    const xs = []; for (let x = -9; x <= 9; x += 0.12) xs.push(x);
    const pos = [], uv = [], idx = [];
    xs.forEach((x, i) => { const z = EDGE(x); pos.push(x, 0.002, z, x, -0.9, z - 0.18 - Math.abs(Math.sin(x * 3)) * 0.08); uv.push(i / (xs.length - 1), 0, i / (xs.length - 1), 1); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    var cliffMat = new T.MeshStandardMaterial({ map: chalkPaint, roughness: 1, side: T.DoubleSide, transparent: true, opacity: 0 });
    // 절벽면 띠는 사진과 겹쳐 어색해 그리지 않는다(재료만 둠)
  }

  // ── 나무 재료
  const woodTex = canvasTex(256, 1024, (g, w, h) => {
    g.fillStyle = '#9A6B40'; g.fillRect(0, 0, w, h);
    const r = rnd(4);
    for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '40,22,10' : '160,110,70'},${0.12 + r() * 0.2})`; g.lineWidth = 1 + r() * 3; g.beginPath(); const x = r() * w; g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 20, h * 0.3, x + (r() - 0.5) * 20, h * 0.7, x + (r() - 0.5) * 14, h); g.stroke(); }
  }, aniso);
  const wood = new T.MeshStandardMaterial({ map: woodTex, roughness: 0.7 });
  const wood2 = new T.MeshStandardMaterial({ map: woodTex, roughness: 0.6, color: 0xC9A27A });
  const metal = new T.MeshStandardMaterial({ color: 0xBFC3C6, roughness: 0.3, metalness: 0.85 });
  const add = (geo, mat, parent = scene) => { const m = new T.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const stick = (a, b, t, mat = wood, parent = scene) => {
    const A = new T.Vector3(...a), B = new T.Vector3(...b), L = A.distanceTo(B);
    const m = add(new T.BoxGeometry(t, L, t), mat, parent); m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize()); return m;
  };

  // ── 야외용 이젤(삼각 다리 · 기둥 · 받침대 · 위 집게)
  const easel = new T.Group(); scene.add(easel);
  stick([-0.32, 0, 0.17], [-0.04, 1.95, 0.0], 0.03, wood, easel);
  stick([0.32, 0, 0.17], [0.04, 1.95, 0.0], 0.03, wood, easel);
  stick([0, 0, -0.66], [0, 1.8, -0.04], 0.028, wood, easel);
  stick([0, 0.7, 0.03], [0, 2.06, 0.03], 0.026, wood, easel);
  stick([-0.22, 0.45, 0.115], [0.22, 0.45, 0.115], 0.02, wood, easel);
  const LEDGE_Y = 1.05;   // 서서 그리는 높이
  add(new T.BoxGeometry(0.62, 0.026, 0.09), wood2, easel).position.set(0, LEDGE_Y, 0.085);
  add(new T.BoxGeometry(0.62, 0.045, 0.011), wood2, easel).position.set(0, LEDGE_Y + 0.026, 0.126);
  add(new T.BoxGeometry(0.11, 0.045, 0.06), wood2, easel).position.set(0, LEDGE_Y + 0.02 + CVS.H + 0.02, 0.07);
  for (let i = 0; i < 3; i++) stick([-0.24 + i * 0.03, LEDGE_Y + 0.032, 0.105], [-0.04 + i * 0.03, LEDGE_Y + 0.045, 0.125], 0.007, new T.MeshStandardMaterial({ color: [0x8a2a1e, 0x22303a, 0xC9A27A][i], roughness: 0.5 }), easel);

  // ── 캔버스: 아마천 옆면 + 앞면은 칠해지는 판
  const paintCv = document.createElement('canvas'); paintCv.width = TEX_W; paintCv.height = TEX_H;
  const pg = paintCv.getContext('2d');
  pg.fillStyle = '#EDE3CF'; pg.fillRect(0, 0, TEX_W, TEX_H);
  for (let i = 0; i < 2600; i++) { pg.fillStyle = `rgba(120,100,70,${Math.random() * 0.05})`; pg.fillRect(Math.random() * TEX_W, Math.random() * TEX_H, 1 + Math.random() * 3, 1); }
  const paintTex = new T.CanvasTexture(paintCv); paintTex.encoding = T.sRGBEncoding; paintTex.anisotropy = aniso;
  const linen = new T.MeshStandardMaterial({ color: 0xD9CCB0, roughness: 0.95 });
  const front = new T.MeshStandardMaterial({ map: paintTex, roughness: 0.85, color: 0xB8B8B8 });
  const canvasMesh = add(new T.BoxGeometry(CVS.W, CVS.H, CVS.D), [linen, linen, linen, linen, front, linen], easel);
  canvasMesh.position.set(0, LEDGE_Y + 0.02 + CVS.H / 2, 0.075); canvasMesh.rotation.x = -0.06;
  easel.rotation.y = -0.12;

  // ── 접이식 의자 + 열린 화구 상자(금속 튜브물감 · 팔레트) — 이젤 왼쪽 앞
  const stool = new T.Group(); stool.position.set(-0.6, 0, 0.5); stool.rotation.y = 0.5; scene.add(stool);
  for (const sx of [-1, 1]) { stick([sx * 0.16, 0, -0.15], [sx * 0.16, 0.42, 0.15], 0.02, wood, stool); stick([sx * 0.16, 0, 0.15], [sx * 0.16, 0.42, -0.15], 0.02, wood, stool); }
  add(new T.BoxGeometry(0.38, 0.02, 0.34), new T.MeshStandardMaterial({ color: 0x6B4A2E, roughness: 0.9 }), stool).position.y = 0.43;
  const box = new T.Group(); box.position.set(0, 0.45, 0); stool.add(box);
  const bw = 0.34, bd = 0.24, bh = 0.055;
  add(new T.BoxGeometry(bw, 0.01, bd), wood2, box).position.y = 0.005;
  for (const [w, d, x, z] of [[bw, 0.012, 0, bd / 2], [bw, 0.012, 0, -bd / 2], [0.012, bd, bw / 2, 0], [0.012, bd, -bw / 2, 0]]) add(new T.BoxGeometry(w, bh, d), wood2, box).position.set(x, bh / 2, z);
  const lid = new T.Group(); lid.position.set(0, bh, -bd / 2); lid.rotation.x = -2.05; box.add(lid);
  add(new T.BoxGeometry(bw, 0.012, bd), wood2, lid).position.set(0, 0, bd / 2);
  const palTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#B98B5B'; g.fillRect(0, 0, w, h); ['#F2EEE4', '#2F5C9A', '#D9A32E', '#B0362A', '#6E8E3E', '#E7D9B8'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.ellipse(40 + i * 36, 60 + (i % 2) * 20, 16, 12, 0.3, 0, 7); g.fill(); }); });
  const pal = add(new T.PlaneGeometry(bw * 0.9, bd * 0.85), new T.MeshStandardMaterial({ map: palTex, roughness: 0.6 }), lid); pal.rotation.x = Math.PI / 2; pal.position.set(0, -0.007, bd / 2);
  [0xF2EEE4, 0x2F5C9A, 0xD9A32E, 0xB0362A, 0x6E8E3E, 0x7A4A8A, 0xE7C28A].forEach((c, i) => {
    const tube = new T.Group(); tube.position.set(-0.13 + i * 0.042, 0.022, 0.02 + (i % 2) * 0.02); tube.rotation.set(0, 0.05 * (i - 3), Math.PI / 2); box.add(tube);
    add(new T.CylinderGeometry(0.010, 0.012, 0.095, 14), metal, tube);
    add(new T.CylinderGeometry(0.0122, 0.0122, 0.038, 14), new T.MeshStandardMaterial({ color: c, roughness: 0.5 }), tube).position.y = 0.005;
    add(new T.CylinderGeometry(0.0055, 0.0055, 0.013, 10), new T.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.4 }), tube).position.y = 0.054;
    add(new T.BoxGeometry(0.024, 0.008, 0.004), metal, tube).position.y = -0.05;
  });

  // ── 빛: 화실 — 왼쪽 창에서 흐린 빛 한 줄기(차갑게) · 옅은 바탕빛 / 바깥 — 왼쪽 앞 위 해(따뜻하게) · 하늘빛
  const hemi = new T.HemisphereLight(0x6f7680, 0x1a120c, 0.22); scene.add(hemi);
  const key = new T.SpotLight(0xC9D4E0, 9, 9, 0.62, 0.7, 1.4); key.position.set(-2.4, 2.3, 0.6); key.target.position.set(0.1, 0.8, 0.1); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.camera.near = 0.5; key.shadow.camera.far = 10;
  const sun = new T.DirectionalLight(0xFFEBD0, 0); sun.position.set(-3.5, 6.5, 5); sun.target.position.set(0, 0.6, 0); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 1, far: 20 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  const skyCol = new T.Color(0xBFD6EE), roomSky = new T.Color(0x6f7680), roomGnd = new T.Color(0x1a120c), outGnd = new T.Color(0x7A7550);

  // ── 카메라: 사진의 수평선 높이에 맞춘 내려다보는 각(처음부터 끝까지 같음). 이젤은 화면 가로 62% · 다리 끝이 화면 84% 높이(풀밭)에 오게
  const tanV = Math.tan(T.MathUtils.degToRad(cam.fov / 2)), tanH = tanV * cam.aspect;
  const pitch = Math.atan((1 - 2 * hy) * tanV);                 // 아래로
  const CH = 1.6, dep = pitch + Math.atan((2 * 0.86 - 1) * tanV);
  const D1 = CH / Math.tan(dep), D0 = D1 * 0.8;                 // 끝 거리 · 칠할 때 거리(조금 가까이)
  const sx = (2 * 0.66 - 1) * tanH;                             // 이젤을 화면 오른쪽으로
  const pose = (t) => {
    const k = easeIO(clamp((t - OUT_GO + 0.4) / (OUT_D + 0.6)));   // 밖으로 나갈 때 천천히 물러나 이젤 둘레가 드러난다
    const d = D0 + (D1 - D0) * k;
    cam.position.set(-sx * d, CH - (D1 - d) * Math.tan(pitch) * 0.0, d + 0.0);
    cam.rotation.set(-pitch, 0, 0);
  };

  // ── 붓질: 넓은 붓 여덟 번(사선, 왼쪽 위 모서리부터) — 화실 안이라 칙칙한 색으로. 밖으로 나가면 같은 그림이 원래 색으로
  let img; try { img = await load(PAINTING); } catch (e) { img = null; }
  const vivid = img ? paintedVersion(img) : paintCv;
  const det = document.createElement('canvas'); det.width = TEX_W; det.height = TEX_H;
  { const d = det.getContext('2d'); d.filter = 'saturate(.45) brightness(.82) sepia(.22)'; d.drawImage(vivid, 0, 0); }
  const pat = pg.createPattern(det, 'no-repeat');
  const W = TEX_W, H = TEX_H, BW = H * 0.22;
  const ANG = -Math.PI / 6, dx = Math.cos(ANG), dy = Math.sin(ANG), nx = -dy, ny = dx;
  const projs = [[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => (x - W / 2) * nx + (y - H / 2) * ny);
  const pMin = Math.min(...projs) + BW * 0.35, pMax = Math.max(...projs) - BW * 0.35, half = Math.hypot(W, H) * 0.62;
  const sweeps = Array.from({ length: NS }, (_, i) => {
    const o = pMin + (pMax - pMin) * (i / (NS - 1)), dir = i % 2 ? -1 : 1, cx0 = W / 2 + nx * o, cy0 = H / 2 + ny * o, bend = (i % 3 - 1) * H * 0.025;
    const path = Array.from({ length: 48 }, (_, k) => { const u = k / 47, a = (dir > 0 ? -1 + 2 * u : 1 - 2 * u) * half, w = Math.sin(u * Math.PI) * bend + Math.sin(u * 7 + i) * H * 0.006; return [cx0 + dx * a + nx * w, cy0 + dy * a + ny * w]; });
    const hairs = Array.from({ length: 18 }, (_, h) => ({ off: ((h / 17) - 0.5) * BW * (0.9 + R() * 0.2), w: BW * (0.06 + R() * 0.1), a: 0.6 + R() * 0.4, s: R() * 0.08, e: 1 - R() * 0.1 }));
    return { path, hairs, at: PAINT_AT + i * GAP, drawn: 0 };
  });
  function sweepTo(sw, u) {
    const P = sw.path, n = Math.floor(u * (P.length - 1)); if (n <= sw.drawn) return false;
    pg.save(); pg.strokeStyle = pat; pg.lineCap = 'round'; pg.lineJoin = 'round';
    for (const h of sw.hairs) {
      const i0 = Math.max(Math.max(0, sw.drawn - 1), Math.ceil(h.s * (P.length - 1))), i1 = Math.min(n, Math.floor(h.e * (P.length - 1))); if (i1 <= i0) continue;
      pg.globalAlpha = h.a; pg.lineWidth = h.w; pg.beginPath();
      for (let i = i0; i <= i1; i++) { const x = P[i][0] + nx * h.off, y = P[i][1] + ny * h.off; i === i0 ? pg.moveTo(x, y) : pg.lineTo(x, y); }
      pg.stroke();
    }
    pg.restore(); sw.drawn = n; return true;
  }
  let detA = 0, vivA = 0;
  const paintTo = (t) => {
    let ch = false;
    for (const sw of sweeps) { const u = (t - sw.at) / SWEEP; if (u > 0) ch = sweepTo(sw, clamp(easeIO(clamp(u)))) || ch; }
    if (t > DET_AT) { const a = clamp((t - DET_AT) / DET); if (a > detA) { pg.globalAlpha = (a - detA) / (1 - detA + 1e-6); pg.drawImage(det, 0, 0); pg.globalAlpha = 1; detA = a; ch = true; } }
    const v = easeIO(clamp((t - OUT_GO - 0.3) / (OUT_D * 0.8)));                // 같은 그림이 원래 색으로
    if (v > vivA) { pg.globalAlpha = (v - vivA) / (1 - vivA + 1e-6); pg.drawImage(vivid, 0, 0); pg.globalAlpha = 1; vivA = v; ch = true; }
    if (ch) paintTex.needsUpdate = true;
  };
  // 밖으로: 벽 · 바닥 · 창이 걷히고(투명), 바깥 사진이 드러나고, 해가 들고, 한 번 환해진다
  const outTo = (t) => {
    const u = clamp((t - OUT_GO) / OUT_D), e = easeIO(u), w = easeIO(clamp(u * 1.6));
    for (const m of fade) m.opacity = 1 - w;
    renderer.setClearColor(0x0d0b09, 1 - w);
    photo.style.opacity = w.toFixed(3);
    photo.style.filter = `blur(1.6px) brightness(${(0.55 + 0.45 * e).toFixed(3)}) saturate(${(0.6 + 0.26 * e).toFixed(3)}) contrast(.9) sepia(.08)`;   // 실사를 3D 와 어울리게 살짝만
    flash.style.opacity = (0.55 * Math.sin(Math.PI * clamp(u * 1.4))).toFixed(3);
    key.intensity = 9 * (1 - w); sun.intensity = 2.6 * e; groundMat.opacity = w; cliffMat.opacity = w;
    hemi.intensity = 0.22 + 0.7 * e; hemi.color.copy(roomSky).lerp(skyCol, e); hemi.groundColor.copy(roomGnd).lerp(outGnd, e);
    scene.fog.near = 4 + 60 * w; scene.fog.far = 11 + 160 * w;
    front.color.setScalar(0.72 + 0.12 * e);
    renderer.toneMappingExposure = 0.9 + 0.1 * e;
  };

  const render = () => renderer.render(scene, cam);
  let done = false, raf = 0;
  function finish() {
    if (done) return; done = true; cancelAnimationFrame(raf);
    removeEventListener('pointerdown', skip, true);
    ui.classList.add('out'); host.classList.add('et3d-done'); onDone?.();
    setTimeout(() => ui.remove(), 900);
  }
  function toEnd() { paintTo(99); outTo(99); pose(99); render(); }
  function skip() { if (done) return; title.classList.remove('on'); toEnd(); setTimeout(finish, 60); }

  const FREEZE = new URLSearchParams(location.search).get('etT');
  if (instant) { toEnd(); finish(); return; }
  if (FREEZE != null) { const t = +FREEZE; paintTo(t); outTo(t); pose(t); render(); requestAnimationFrame(() => { title.classList.toggle('on', t <= PAINT_AT + 1.3); window.__etReady = true; }); return; }

  outTo(0); pose(0); render();
  requestAnimationFrame(() => title.classList.add('on'));
  addEventListener('pointerdown', skip, true);
  const T0 = performance.now();
  const tick = (now) => {
    if (done) return;
    const t = (now - T0) / 1000;
    paintTo(t); outTo(t);
    if (t > PAINT_AT + 1.3) title.classList.remove('on');
    pose(t); render();
    if (t >= OUT_AT) return finish();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
