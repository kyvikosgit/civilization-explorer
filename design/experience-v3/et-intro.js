// 에트르타 도입(11/09 · 3D) — 어두침침한 화실의 이젤. 빈 캔버스에 넓은 붓이 사선으로 슥슥 지나가며 모네 〈에트르타의 절벽〉(1885)이 칙칙한 색으로 그려진다.
//   그다음 카메라는 그대로 두고 둘레만 바뀐다: 화실 벽 · 바닥이 걷히고 바깥 빛이 들어와 에트르타 절벽 위(실사 사진)에 이젤 · 물감 상자가 서 있다 — 물감을 들고 밖으로 나간 것.
//   그림은 같은 그림 그대로 색만 생생해진다. 그 장면이 이 화면의 배경으로 남는다(기획 장표 배경 그림은 쓰지 않는다).
//   바깥 사진: 위키미디어 공용 'Étretat, Frankreich10.jpg'(Nikater, 2013 · 퍼블릭 도메인) — 바늘바위 · 아발 아치 · 절벽 위 풀밭
//   그림: 모네 〈에트르타의 절벽〉(1885, 클라크 미술관, 퍼블릭 도메인) — 사진과 같은 쪽에서 본 바늘바위 · 아발 아치
//   3D 카메라는 사진의 수평선 높이(사진 높이의 18.5%)에 맞춰 내려다보는 각을 정하고, 처음부터 끝까지 그 각을 지킨다(배경이 바뀌어도 이음매가 없게)
//   그림은 휘거나 일렁이지 않는다(붓질로 칠해짐 · 빛 · 색만).
//   playIntro({ onDone, instant }) — instant 면 끝 장면을 바로 그린다. 누르면 끝 장면으로
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// 소품 모델 · 풀 질감: Poly Haven(CC0) — 사이트 design/experience-v3/ph/<이름>/

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
  const DBG = location.search.includes('etdbg'), T00 = performance.now(), mark = (n) => DBG && console.log('[et]', n, Math.round(performance.now() - T00));
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
  let early = false; const earlyTap = () => { early = true; }; if (!instant) addEventListener('pointerdown', earlyTap, true);   // 모델을 불러오는 동안 누르면 준비되자마자 끝 장면으로

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
  // Poly Haven 모델 불러오기(높이 h 미터로 맞춤, 바닥이 y=0)
  const gl = new GLTFLoader();
  const loadModel = (id, h) => new Promise((res) => gl.load(`${V3}ph/${id}/${id}.gltf`, (g) => {
    const o = g.scene; o.traverse((c) => { if (c.isMesh) { c.castShadow = c.receiveShadow = true; c.material = c.material.clone(); } });
    const b = new T.Box3().setFromObject(o), sz = b.getSize(new T.Vector3()); o.scale.setScalar(h / sz.y);
    const b2 = new T.Box3().setFromObject(o); o.position.y = -b2.min.y; const w = new T.Group(); w.add(o); w.userData.size = b2.getSize(new T.Vector3()); res(w);
  }, undefined, () => res(null)));
  const texReady = (t) => new Promise((ok) => { if (t.image) ok(); else { const i = setInterval(() => { if (t.image) { clearInterval(i); ok(); } }, 50); setTimeout(() => { clearInterval(i); ok(); }, 8000); } });
  const MODELS = Promise.all([loadModel('WoodenTable_01', 0.78), loadModel('ceramic_vase_03', 0.24), loadModel('fancy_picture_frame_01', 0.52), loadModel('wooden_crate_01', 0.38), loadModel('folding_wooden_stool', 0.5)]);
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
  // ── 화실 살림(밖으로 나갈 때 함께 걷힘): 뒷벽 북쪽 창 · 벽에 건 살롱 그림 두 점(금박 액자) · 벽에 기대 둔 캔버스 뒷면 · 작업대(붓 꽂은 단지 · 병 · 걸레) · 걸레받이
  const room = new T.Group(); scene.add(room);
  const rmat = (o) => fadeMat(new T.MeshStandardMaterial(o));
  const rbox = (w, h, d, m, x, y, z, ry = 0, rx = 0, parent = room) => { const o = new T.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.2), m); o.position.set(x, y, z); o.rotation.set(rx, ry, 0); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
  rbox(10, 0.14, 0.03, rmat({ color: 0x241a12, roughness: 0.7 }), 0, 0.07, -2.18);                                    // 걸레받이
  { // 뒷벽 북쪽 창(높이 1.2~2.9, 이젤 왼쪽 뒤) — 바깥 흐린 하늘빛 + 창살 + 깊은 창틀
    const wx = -1.25, wy = 2.05, ww = 1.15, wh = 1.7;
    const glow = new T.Mesh(new T.PlaneGeometry(ww, wh), fadeMat(new T.MeshBasicMaterial({ color: 0x9aa9b6, fog: false, toneMapped: false }))); glow.position.set(wx, wy, -2.19); room.add(glow);
    const fm = rmat({ color: 0x2e261e, roughness: 0.8 });
    for (const [w, h, x, y] of [[ww + 0.12, 0.07, wx, wy + wh / 2], [ww + 0.12, 0.09, wx, wy - wh / 2], [0.07, wh, wx - ww / 2, wy], [0.07, wh, wx + ww / 2, wy], [0.04, wh, wx, wy], [ww, 0.035, wx, wy + wh / 6], [ww, 0.035, wx, wy - wh / 6]]) rbox(w, h, 0.07, fm, x, y, -2.15);
    rbox(ww + 0.24, 0.05, 0.22, fm, wx, wy - wh / 2 - 0.05, -2.08);                                                  // 창턱
  }
  // 벽에 기대 둔 캔버스 — 나무틀이 보이는 뒷면 셋(겹쳐서)
  const linenBack = rmat({ color: 0x5a4f3f, roughness: 1 }), stretcher = rmat({ color: 0x6b5236, roughness: 0.8 });
  for (const [x, w, h, ry, lean] of []) {   // 11/09: 회색 판처럼 보여 뺐다
    const g = new T.Group(); g.position.set(x, 0, -2.12 + Math.sin(lean) * h * 0.5); g.rotation.set(-lean, ry, 0); room.add(g);
    const b = new T.Mesh(new T.PlaneGeometry(w, h), linenBack); b.position.set(0, h / 2, 0.035); b.receiveShadow = true; g.add(b);   // 아마천 뒷면이 이쪽을 보게(나무틀 앞)
    for (const [bw, bh, bx, by] of [[w, 0.045, 0, 0.022], [w, 0.045, 0, h - 0.022], [0.045, h, -w / 2 + 0.022, h / 2], [0.045, h, w / 2 - 0.022, h / 2], [w - 0.09, 0.035, 0, h / 2]]) rbox(bw, bh, 0.03, stretcher, bx, by, 0.02, 0, 0, g);
  }
  // ── 바깥 땅(11/09 다시): 진짜 3D 절벽 위 풀밭 — 실사 질감(Poly Haven forrest_ground_01 · CC0) + 노멀 · 거칠기, 완만한 기복,
  //   이젤 뒤 약 1.7m 에서 둥글게 꺾여 흰 백악 절벽면(marble_cliff_05)으로 떨어진다. 그 너머가 배경 사진(바다 · 아치).
  //   이젤 · 의자는 이 땅 위에 서고, 해 그림자가 땅에 진다. 밖으로 나갈 때 나타남
  const tl = new T.TextureLoader();
  const ptex = (id, f, rep, srgb) => { const t = tl.load(`${V3}ph/${id}/${f}.jpg`); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = aniso; if (srgb) t.encoding = T.sRGBEncoding; return t; };
  const GR = [4.5, 4.0];
  // 11/09: 절벽 위 땅 = 흰 백악 바위(marble_cliff_05) 위에 풀이 군데군데(leafy_grass) — 얼룩 모양은 땅 위치 노이즈로 섞음
  const grassTex = ptex('leafy_grass', 'diff', GR, true);
  const groundMat = new T.MeshStandardMaterial({ map: ptex('marble_cliff_05', 'diff', GR, true), normalMap: ptex('marble_cliff_05', 'nor', GR), roughnessMap: ptex('marble_cliff_05', 'rough', GR), normalScale: new T.Vector2(1.2, 1.2), color: 0xF4F0E6 });
  groundMat.onBeforeCompile = (sh) => {
    sh.uniforms.grassMap = { value: grassTex };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWp; uniform sampler2D grassMap;
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { return 0.55 * vn(p) + 0.3 * vn(p * 2.3 + 7.1) + 0.15 * vn(p * 5.7 + 3.3); }`)
      .replace('#include <map_fragment>', `#ifdef USE_MAP
        vec4 chalkC = texture2D(map, vUv);
        vec4 grassC = texture2D(grassMap, vUv * 1.3) * vec4(0.95, 1.08, 0.85, 1.0);
        float n = fbm(vWp.xz * 1.6);
        float gm = smoothstep(0.42, 0.6, n + 0.12 * vn(vWp.xz * 14.0));   // 풀 덤불 · 사이사이 흰 바위
        diffuseColor *= mix(chalkC, grassC, gm);
      #endif`);
  };
  const EDGE = (x) => -1.7 + Math.sin(x * 1.3 + 0.4) * 0.14 + Math.sin(x * 3.7 + 1) * 0.05;
  const ZF = 5.0;                                                             // 앞쪽 끝(카메라 뒤)
  const hAt = (x, z) => {                                                     // 땅 높이 — 잔 기복, 가장자리 0.55m 에서 둥글게 꺾여 내려감
    let y = 0.035 * Math.sin(x * 1.9 + z * 0.8) + 0.025 * Math.sin(x * 4.1 - z * 3.3) + 0.015 * Math.sin(x * 9.0 + z * 7.0);
    const d = z - EDGE(x); if (d < 0.55) y -= Math.pow((0.55 - d) / 0.55, 2.2) * 0.42;
    return y;
  };
  {
    const NX = 150, NZ = 120, pos = [], uv = [], idx = [];
    for (let iz = 0; iz <= NZ; iz++) for (let ix = 0; ix <= NX; ix++) {
      const x = -4.5 + 9 * (ix / NX), e = EDGE(x), v = iz / NZ, z = e + (ZF - e) * Math.pow(v, 1.6);   // 가장자리 쪽을 촘촘히
      pos.push(x, hAt(x, z), z); uv.push((x + 4.5) / 9, 1 - (z + 2) / 7);
    }
    for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) { const a = iz * (NX + 1) + ix, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    var ground = new T.Mesh(geo, groundMat); ground.receiveShadow = true; ground.visible = false; scene.add(ground);
  }
  // 백악 절벽면 — 가장자리 바로 아래에서 바다까지(위쪽은 풀이 흘러내린 자국)
  const CR = [3, 4];
  const cliffMat = new T.MeshStandardMaterial({ map: ptex('marble_cliff_05', 'diff', CR, true), normalMap: ptex('marble_cliff_05', 'nor', CR), roughnessMap: ptex('marble_cliff_05', 'rough', CR), color: 0xF2EEE2, side: T.DoubleSide });
  {
    const NX = 150, NY = 40, pos = [], uv = [], idx = [];
    for (let iy = 0; iy <= NY; iy++) for (let ix = 0; ix <= NX; ix++) {
      const x = -4.5 + 9 * (ix / NX), u = iy / NY, drop = u * 9, e = EDGE(x);
      pos.push(x, hAt(x, e) - drop, e - 0.02 - drop * 0.12 + Math.sin(x * 2.3 + u * 6) * 0.08 * u); uv.push(ix / NX * 3, u * 4);
    }
    for (let iy = 0; iy < NY; iy++) for (let ix = 0; ix < NX; ix++) { const a = iy * (NX + 1) + ix, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    var face = new T.Mesh(geo, cliffMat); face.receiveShadow = true; face.visible = false; scene.add(face);
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

  // ── 이젤(11/09 다시) — 모든 이음이 실제로 닿게 계산: 앞다리 둘이 머리 블록에서 만나고, 가운데 기둥은 앞다리 면 바로 뒤에서 아래 가로대 위에 서고 위는 머리 블록에 박힌다.
  //   뒷다리는 머리 블록 뒷면 경첩에서 내려가고, 받침대는 기둥에 붙은 받침 블록 위, 캔버스는 받침대 위에서 기둥에 기댄다. 위 집게가 캔버스 윗변을 누른다. 이음마다 볼트 · 나비너트
  const easel = new T.Group(); scene.add(easel);
  const HEAD = 2.02, FOOT_X = 0.34, TOP_X = 0.04, FOOT_Z = 0.17, LT = 0.034, MT = 0.03;
  const legX = (y) => FOOT_X - (FOOT_X - TOP_X) * (y / HEAD), legZ = (y) => FOOT_Z * (1 - y / HEAD);
  const TILT = Math.atan(FOOT_Z / HEAD);
  const mastZ = (y) => legZ(y) + (LT + MT) / 2;                           // 앞다리 바로 앞(캔버스가 다리 앞에서 기둥에 기댄다)
  const rstick = (a, b, t, mat = wood, parent = easel, tz = t) => {
    const A = new T.Vector3(...a), B = new T.Vector3(...b), L = A.distanceTo(B);
    const m = add(new RoundedBoxGeometry(t, L, tz, 2, Math.min(t, tz) * 0.22), mat, parent); m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize()); return m;
  };
  const bolt = (x, y, z, ax = 'z', parent = easel) => { const c = add(new T.CylinderGeometry(0.008, 0.008, 0.012, 12), metal, parent); c.position.set(x, y, z); if (ax === 'z') c.rotation.x = Math.PI / 2; else c.rotation.z = Math.PI / 2; return c; };
  const wing = (x, y, z, parent = easel) => { const g = new T.Group(); g.position.set(x, y, z); parent.add(g); add(new T.CylinderGeometry(0.011, 0.011, 0.012, 12), metal, g).rotation.x = Math.PI / 2; for (const s of [-1, 1]) { const w = add(new RoundedBoxGeometry(0.03, 0.016, 0.004, 1, 0.002), metal, g); w.position.set(s * 0.02, 0.004, 0.004); w.rotation.z = s * 0.25; } return g; };
  // 앞다리 둘(위로 갈수록 가늘게 보이게 두 토막)
  for (const s of [-1, 1]) { rstick([s * FOOT_X, 0, FOOT_Z], [s * legX(HEAD - 0.02), HEAD - 0.02, legZ(HEAD - 0.02)], LT, wood, easel, LT * 1.15); }
  // 머리 블록 — 앞다리 끝 둘을 감싼다
  const headB = add(new RoundedBoxGeometry(0.15, 0.1, 0.1, 2, 0.012), wood2, easel); headB.position.set(0, HEAD - 0.01, legZ(HEAD) + 0.01); headB.rotation.x = -TILT;
  bolt(-0.045, HEAD - 0.01, legZ(HEAD) + 0.065); bolt(0.045, HEAD - 0.01, legZ(HEAD) + 0.065);
  // 아래 가로대(스프레더) — 두 앞다리 사이를 꼭 맞게, 끝은 다리 속으로 조금
  const SPY = 0.44;
  rstick([-legX(SPY) - 0.01, SPY, legZ(SPY)], [legX(SPY) + 0.01, SPY, legZ(SPY)], 0.036, wood2, easel, 0.024);
  bolt(-legX(SPY), SPY, legZ(SPY) + 0.02); bolt(legX(SPY), SPY, legZ(SPY) + 0.02);
  // 가운데 기둥 — 가로대 윗면에서 머리 블록 속까지
  rstick([0, SPY - 0.02, mastZ(SPY - 0.02)], [0, HEAD - 0.04, mastZ(HEAD - 0.04)], MT, wood, easel, MT);   // 가로대 앞면 · 머리 블록 앞면에 볼트로
  bolt(0, SPY, mastZ(SPY) + MT / 2 + 0.004);
  // 뒷다리 — 머리 블록 뒷면 경첩에서 바닥으로
  const hingeY = HEAD - 0.03, hingeZ = legZ(HEAD) - 0.045;
  add(new T.CylinderGeometry(0.012, 0.012, 0.09, 14), metal, easel).position.set(0, hingeY, hingeZ); easel.children[easel.children.length - 1].rotation.z = Math.PI / 2;
  rstick([0, hingeY - 0.01, hingeZ - 0.012], [0, 0, -0.52], 0.032, wood, easel, 0.028);   // 뒷다리를 짧게 벌림 — 발이 풀밭 안쪽에 오게
  // 받침대 — 기둥에 붙은 받침 블록 + 앞으로 내민 쟁반(앞턱 · 물감 얼룩)
  const LEDGE_Y = 1.05;
  const ledZ = mastZ(LEDGE_Y);
  const blk = add(new RoundedBoxGeometry(0.07, 0.14, 0.06, 2, 0.01), wood2, easel); blk.position.set(0, LEDGE_Y - 0.06, ledZ + 0.01); blk.rotation.x = -TILT;
  wing(0, LEDGE_Y - 0.06, ledZ + 0.045);
  const TRAY_D = 0.085, trayZ = ledZ + MT / 2 + TRAY_D / 2 - 0.005;
  const trayTex = canvasTex(512, 64, (g, w, h) => { g.drawImage(woodTex.image, 0, 0, w, h); const r = rnd(66); for (let i = 0; i < 30; i++) { g.fillStyle = ['#2F5C9A', '#D9A32E', '#B0362A', '#F2EEE4', '#6E8E3E'][(r() * 5) | 0]; g.globalAlpha = 0.5 + r() * 0.4; g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 6, 1 + r() * 3, 0, 0, 7); g.fill(); } g.globalAlpha = 1; }, aniso);
  const trayMat = new T.MeshStandardMaterial({ map: trayTex, roughness: 0.6, color: 0xC9A27A });
  add(new RoundedBoxGeometry(0.68, 0.024, TRAY_D, 2, 0.006), trayMat, easel).position.set(0, LEDGE_Y, trayZ);
  add(new RoundedBoxGeometry(0.68, 0.04, 0.012, 2, 0.004), wood2, easel).position.set(0, LEDGE_Y + 0.02, trayZ + TRAY_D / 2 - 0.006);
  for (let i = 0; i < 3; i++) { const b = add(new T.CylinderGeometry(0.0045, 0.006, 0.26, 8), new T.MeshStandardMaterial({ color: [0x8a2a1e, 0x22303a, 0xC9A27A][i], roughness: 0.5 }), easel); b.position.set(-0.2 + i * 0.03, LEDGE_Y + 0.02, trayZ + 0.01); b.rotation.set(0, 0.2, Math.PI / 2 - 0.05 * i); }
  // 위 집게 — 기둥을 감싸는 블록 + 캔버스 윗변을 누르는 턱
  const CANVAS_Y0 = LEDGE_Y + 0.012, clampY = CANVAS_Y0 + CVS.H * Math.cos(TILT) + 0.022;
  const clampZ = mastZ(clampY);
  const cb = add(new RoundedBoxGeometry(0.07, 0.07, 0.06, 2, 0.01), wood2, easel); cb.position.set(0, clampY, clampZ + 0.005); cb.rotation.x = -TILT;
  const lip = add(new RoundedBoxGeometry(0.1, 0.02, 0.05, 2, 0.006), wood2, easel); lip.position.set(0, clampY - 0.02, clampZ + MT / 2 + CVS.D + 0.01); lip.rotation.x = -TILT;
  wing(0, clampY, clampZ + 0.04);

  // ── 캔버스: 아마천 옆면 + 앞면은 칠해지는 판
  const paintCv = document.createElement('canvas'); paintCv.width = TEX_W; paintCv.height = TEX_H;
  const pg = paintCv.getContext('2d');
  pg.fillStyle = '#EDE3CF'; pg.fillRect(0, 0, TEX_W, TEX_H);
  for (let i = 0; i < 2600; i++) { pg.fillStyle = `rgba(120,100,70,${Math.random() * 0.05})`; pg.fillRect(Math.random() * TEX_W, Math.random() * TEX_H, 1 + Math.random() * 3, 1); }
  const paintTex = new T.CanvasTexture(paintCv); paintTex.encoding = T.sRGBEncoding; paintTex.anisotropy = aniso;
  const linen = new T.MeshStandardMaterial({ color: 0xD9CCB0, roughness: 0.95 });
  const front = new T.MeshStandardMaterial({ map: paintTex, roughness: 0.85, color: 0xB8B8B8 });
  const canvasMesh = add(new T.BoxGeometry(CVS.W, CVS.H, CVS.D), [linen, linen, linen, linen, front, linen], easel);
  { const yc = CANVAS_Y0 + (CVS.H / 2) * Math.cos(TILT); canvasMesh.position.set(0, yc, mastZ(yc) + MT / 2 + CVS.D / 2 + 0.002); canvasMesh.rotation.x = -TILT; }   // 받침대 위에서 기둥에 기댐
  easel.rotation.y = -0.12;

  // ── 접이식 의자 + 열린 화구 상자(금속 튜브물감 · 팔레트) — 이젤 왼쪽 앞
  const stool = new T.Group(); scene.add(stool); stool.position.set(-0.62, 0, -0.1); stool.rotation.y = 0.5;   // 접이식 의자(모델은 아래에서 붙임) — 위에 열린 물감 상자
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
  const hemi = new T.HemisphereLight(0x6f7680, 0x1a120c, 0.16); scene.add(hemi);
  const winFill = new T.PointLight(0xAFC0D0, 1.1, 4.5, 1.8); winFill.position.set(-1.25, 2.0, -1.7); scene.add(winFill);   // 뒷벽 창 둘레
  const key = new T.SpotLight(0xC9D4E0, 6, 9, 0.55, 0.75, 1.4); key.position.set(-2.4, 2.3, 0.6); key.target.position.set(0.1, 0.8, 0.1); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.camera.near = 0.5; key.shadow.camera.far = 10;
  const sun = new T.DirectionalLight(0xFFEBD0, 0); sun.position.set(-2.6, 6.0, 3.6); sun.target.position.set(0, 0.6, -0.4); scene.add(sun, sun.target);   // 앞 왼쪽 해 — 그림자가 이젤 뒤 풀밭(보이는 쪽)으로
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 1, far: 20 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  const skyCol = new T.Color(0xBFD6EE), roomSky = new T.Color(0x6f7680), roomGnd = new T.Color(0x1a120c), outGnd = new T.Color(0x7A7550);

  // ── 카메라: 사진의 수평선 높이에 맞춘 내려다보는 각(처음부터 끝까지 같음). 이젤은 화면 가로 62% · 다리 끝이 화면 84% 높이(풀밭)에 오게
  const tanV = Math.tan(T.MathUtils.degToRad(cam.fov / 2)), tanH = tanV * cam.aspect;
  const pitch = Math.atan((1 - 2 * hy) * tanV);                 // 아래로
  const FOOT = 0.975, CH = 2.5, dep = pitch + Math.atan((2 * FOOT - 1) * tanV);   // 이젤 앞발이 사진 속 풀밭 한가운데(풀밭 꼭대기 선보다 한참 아래)   // 사진 찍은 자리처럼 비탈 위에서 내려다봄 — 이젤이 화면을 다 채우지 않게
  const D1 = CH / Math.tan(dep), D0 = D1 * 0.8;                 // 끝 거리 · 칠할 때 거리(조금 가까이)
  const sx = (2 * 0.57 - 1) * tanH;                             // 이젤을 화면 오른쪽으로
  // 끝 자리(P1): 사진 속 수평선 · 풀밭에 맞춘 높은 자리. 화실에서는 같은 각도로 캔버스 가까이(P0, 캔버스가 화면 폭 78%) — 밖으로 나가며 물러난다
  const P1 = new T.Vector3(-sx * D1, CH, D1);
  scene.updateMatrixWorld(true);
  const cvC = new T.Vector3(); canvasMesh.getWorldPosition(cvC);
  const fwd = new T.Vector3(0, -Math.sin(pitch), -Math.cos(pitch));
  const dC = (CVS.W / 0.78 / 2) / tanH;
  const P0 = cvC.clone().addScaledVector(fwd, -dC).add(new T.Vector3(0, -0.04, 0));
  const pose = (t) => {
    const k = easeIO(clamp((t - OUT_GO + 0.2) / (OUT_D + 0.5)));
    cam.position.lerpVectors(P0, P1, k);
    cam.rotation.set(-pitch, 0, 0);
  };

  // ── 붓질: 넓은 붓 여덟 번(사선, 왼쪽 위 모서리부터) — 화실 안이라 칙칙한 색으로. 밖으로 나가면 같은 그림이 원래 색으로
  // ── 모델 배치: 화실(작업대 · 화병 · 상자 · 벽 그림 — 밖으로 나가면 걷힘) / 이젤 왼쪽 앞 접이식 의자(상자를 얹음) / 바깥 풀포기(밖에서만)
  mark('scene'); const [mTable, mVase, mFrame, mCrate, mStool] = await MODELS; const mGrass = null; mark('models');   // 11/09: 3D 풀포기는 뺐다
  const toFade = (o) => o && o.traverse((c) => { if (c.isMesh) fadeMat(c.material); });
  if (mTable) { mTable.position.set(-1.05, 0, -1.5); mTable.rotation.y = 0.2; room.add(mTable); toFade(mTable);
    if (mVase) { mVase.position.set(-1.2, mTable.userData.size.y, -1.5); room.add(mVase); toFade(mVase); } }
  if (mCrate) { mCrate.position.set(0.95, 0, -1.6); mCrate.rotation.y = -0.3; room.add(mCrate); toFade(mCrate); }
  if (mFrame) { const f2 = mFrame.clone(true); mFrame.position.set(0.35, 1.95, -2.17); room.add(mFrame); toFade(mFrame); f2.scale.setScalar(0.75); f2.position.set(1.2, 2.05, -2.17); room.add(f2); f2.traverse((c) => { if (c.isMesh) c.material = fadeMat(c.material.clone()); }); }
  if (mStool) { stool.add(mStool); box.position.y = mStool.userData.size.y + 0.002; }
  const fadeIn = [];
  if (mGrass) {
    // 풀밭 — 풀포기 모델(Poly Haven grass_medium_01)을 땅 전체에 빽빽이(인스턴싱). 가장자리까지 덮어 땅 끝이 풀숲으로 끝나고 그 너머가 바다
    const rg = rnd(91), spots = [], S = 0.12;
    for (let z = -2.0; z < 1.7; z += S) for (let x = -2.1; x < 1.7; x += S) {   // 화면에 보이는 땅만
      const px = x + (rg() - 0.5) * S, pz = z + (rg() - 0.5) * S, e = EDGE(px);
      if (pz < e + 0.12) continue;                                                     // 가장자리 바로 앞까지
      if (Math.hypot(px - 0.3, pz - 0.18) < 0.09 || Math.hypot(px + 0.3, pz - 0.18) < 0.09) continue;   // 이젤 발 둘레는 조금 비움
      const near = pz < e + 0.6 ? 1.25 : 1;                                             // 가장자리 쪽은 키 큰 풀
      spots.push([px, pz, (1.0 + rg() * 0.7) * near, rg() * 6.28]);
    }
    // 모델 파일에는 풀포기 17가지가 가로로 늘어서 있다 — 자리마다 하나만 골라 쓴다(가벼운 small · mid · tall 일곱 가지)
    const USE = /small_a|small_b|mid_b|mid_c/;   // 잎 넓은 tall 은 잡초처럼 보여 뺌
    const parts = []; mGrass.updateMatrixWorld(true);
    mGrass.traverse((c) => { if (c.isMesh && USE.test(c.name + (c.parent?.name || ''))) parts.push(c); });
    if (!parts.length) mGrass.traverse((c) => { if (c.isMesh) parts.push(c); });
    const tint = new T.Color(0xF2EDB0), M4 = new T.Matrix4(), Q = new T.Quaternion(), E3 = new T.Euler();
    const pick = spots.map(() => (rg() * parts.length) | 0);
    parts.forEach((c, pi) => {
      const mine = spots.filter((_, k) => pick[k] === pi); if (!mine.length) return;
      const local = c.matrixWorld.clone(); const tp = new T.Vector3(), tq = new T.Quaternion(), ts = new T.Vector3(); local.decompose(tp, tq, ts); local.compose(new T.Vector3(0, tp.y, 0), tq, ts);   // 늘어선 자리(x)는 버린다
      const mat = c.material.clone(); mat.color.copy(tint); mat.transparent = false; mat.alphaTest = 0.45; mat.depthWrite = true; mat.side = T.DoubleSide;
      const im = new T.InstancedMesh(c.geometry, mat, mine.length); im.receiveShadow = true; im.castShadow = false; im.visible = false; im.frustumCulled = false;
      mine.forEach(([x, z, sc, ry], k) => { E3.set(0, ry, 0); Q.setFromEuler(E3); M4.compose(new T.Vector3(x, 0, z), Q, new T.Vector3(sc, sc, sc)).multiply(local); im.setMatrixAt(k, M4); });
      scene.add(im); fadeIn.push(im);
    });
  }

  mark('grass'); let img; try { img = await load(PAINTING); } catch (e) { img = null; } mark('img');
  const vivid = img ? paintedVersion(img) : paintCv;
  const det = document.createElement('canvas'); det.width = TEX_W; det.height = TEX_H;
  { const d = det.getContext('2d'); d.filter = 'saturate(.45) brightness(.82) sepia(.22)'; d.drawImage(vivid, 0, 0); }
  mark('painted'); const pat = pg.createPattern(det, 'no-repeat');
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
  let outdoorShadows = false;
  const outTo = (t) => {
    const u = clamp((t - OUT_GO) / OUT_D), e = easeIO(u), w = easeIO(clamp(u * 1.6));
    for (const m of fade) m.opacity = 1 - w;
    renderer.setClearColor(0x0d0b09, 1 - w);
    photo.style.opacity = w.toFixed(3);
    photo.style.filter = `blur(1.6px) brightness(${(0.55 + 0.45 * e).toFixed(3)}) saturate(${(0.6 + 0.26 * e).toFixed(3)}) contrast(.9) sepia(.08)`;   // 실사를 3D 와 어울리게 살짝만
    flash.style.opacity = (0.55 * Math.sin(Math.PI * clamp(u * 1.4))).toFixed(3);
    key.intensity = 6 * (1 - w); winFill.intensity = 1.1 * (1 - w); sun.intensity = 2.6 * e;
    room.visible = floor.visible = w < 0.97; backWall.visible = leftWall.visible = w < 0.97;
    // 밖에서는 이젤 · 의자만 그림자(화실 창틀 등이 풀밭에 그림자를 드리우지 않게)
    if (w >= 0.97 && !outdoorShadows) { outdoorShadows = true; const keep = new Set(); [easel, stool].forEach((g) => g.traverse((c) => keep.add(c))); scene.traverse((c) => { if (c.isMesh && !keep.has(c)) c.castShadow = false; }); key.castShadow = false; key.visible = false; }   // 화실 창빛(스포트)도 그림자 계산에서 뺀다 — 안 그러면 풀밭 판 전체가 그 그늘로 어두워진다
    // 11/09: 땅은 흐릿하게 번져 나오지 않고 빛이 가장 환한 순간 한 번에 — 반쯤 투명한 땅 가장자리(둥근 끝)가 먼저 비쳐 보이던 것 없앰
    ground.visible = face.visible = u >= 0.34;

    for (const g of fadeIn) g.visible = w > 0.35;
    hemi.intensity = 0.16 + 1.0 * e; hemi.color.copy(roomSky).lerp(skyCol, e); hemi.groundColor.copy(roomGnd).lerp(outGnd, e);
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
  if (FREEZE != null) { window.__et = { cam, T, stool, box, scene }; const t = +FREEZE; paintTo(t); outTo(t); pose(t); render(); requestAnimationFrame(() => { title.classList.toggle('on', t <= PAINT_AT + 1.3); window.__etReady = true; }); return; }

  mark('start'); removeEventListener('pointerdown', earlyTap, true);
  if (early) { toEnd(); finish(); return; }
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
