// 에트르타 도입(11/09 · 3D) — 에트르타 절벽 위 풀밭에 선 나무 이젤. 빈 캔버스에 넓은 붓이 사선으로 슥슥 지나가며 모네 〈에트르타의 마네포르트〉(1883)가 그려지고,
//   카메라가 물러나며 이젤 · 튜브물감 상자 · 바다와 하늘이 드러난다. 그 장면이 그대로 이 화면의 배경으로 남는다(기획 장표의 배경 그림은 쓰지 않는다).
//   three.js(살롱 · 시민사회 도입과 같은 방식). 단위 미터, 캔버스 앞면이 +z(카메라 쪽), 바다는 -z.
//   그림은 휘거나 일렁이지 않는다(붓질로 칠해짐 · 카메라 이동 · 빛만).
//   playIntro({ onDone, instant }) — instant 면 끝 장면을 바로 그린다. 누르면 끝 장면으로
import * as T from 'three';

const V3 = new URL('./', import.meta.url).href;
const PAINTING = V3 + 'img/et_manneporte.jpg';   // 모네 〈에트르타의 마네포르트〉 1883 · 메트로폴리탄 미술관(DT1897) · CC0 (1905×1526, 위키미디어 공용)
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp = (v) => Math.max(0, Math.min(1, v));
const load = (src) => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

// 시간표(초)
// 11/09(3): 어두침침한 화실에서 캔버스에 칠해지고 → 카메라가 캔버스 속으로 → 밖의 빛(원래 그림의 생생한 색)으로 바뀐다
const PAINT_AT = 1.2, SWEEP = 0.5, GAP = 0.34, NS = 8;
const DET_AT = PAINT_AT + GAP * (NS - 1) + SWEEP, DET = 0.5;
const PUSH_AT = DET_AT + DET + 0.05, PUSH = 1.6;              // 캔버스 속으로
const VIV_AT = PUSH_AT + PUSH - 0.3, VIV = 1.5;               // 밖의 빛으로
const OUT_AT = VIV_AT + VIV + 0.1;

// 캔버스(그림) 크기 — 그림 비율 그대로
const CVS = { W: 0.74, H: 0.74 * 721 / 900, D: 0.024 };
const TEX_W = 1024, TEX_H = Math.round(1024 * 721 / 900);

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
  // 3D 판은 배경 자리(.room-bg)에 깔고 그대로 남긴다. 제목 · 건너뛰기 안내만 위에
  const cv = document.createElement('canvas'); cv.className = 'et3d';
  host.insertBefore(cv, host.querySelector('.shade') || null);
  host.classList.add('has3d');
  const ui = document.createElement('div'); ui.id = 'etIntro'; ui.setAttribute('aria-hidden', 'true');
  ui.innerHTML = '<div class="ei-title"><b>ÉTRETAT</b><small>EN PLEIN AIR</small></div><p class="et-skip">누르면 건너뜁니다</p>';
  Object.assign(ui.style, { left: `${rb.left}px`, top: `${rb.top}px`, width: `${VW}px`, height: `${VH}px` });
  if (!instant) document.body.appendChild(ui);
  const title = ui.querySelector('.ei-title');

  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true }); }
  catch (e) { cv.remove(); host.classList.remove('has3d'); ui.remove(); onDone?.(); return; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(VW, VH, false);
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const scene = new T.Scene();
  const portrait = VW / VH < 0.8;
  const cam = new T.PerspectiveCamera(portrait ? 58 : 46, VW / VH, 0.05, 3000);
  const R = rnd(5);

  // ── 화실: 어두침침한 실내(회갈색 회벽 · 짙은 마루 · 왼쪽 창으로 흐린 빛 한 줄기 · 벽에 기대 둔 캔버스 뒷면)
  scene.background = new T.Color(0x0d0b09);
  scene.fog = new T.Fog(0x0d0b09, 4, 11);
  const floorTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#2a1d14'; g.fillRect(0, 0, w, h);
    const r = rnd(12);
    for (let y = 0; y < h; y += 64) { g.fillStyle = `rgba(0,0,0,${0.25 + r() * 0.2})`; g.fillRect(0, y, w, 2); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '80,55,35' : '10,6,3'},${0.1 + r() * 0.15})`; g.fillRect(r() * w, y + 4 + r() * 56, 40 + r() * 200, 1 + r() * 2); } }
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${[ '120,90,60', '70,80,90', '110,60,40'][i % 3]},${0.06 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 10, 2 + r() * 6, r() * 3, 0, 7); g.fill(); }   // 물감 얼룩
  }, aniso);
  floorTex.wrapS = floorTex.wrapT = T.RepeatWrapping; floorTex.repeat.set(4, 4);
  const floor = new T.Mesh(new T.PlaneGeometry(30, 30), new T.MeshStandardMaterial({ map: floorTex, roughness: 0.65, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const plasterTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#4a433b'; g.fillRect(0, 0, w, h);
    const r = rnd(21);
    for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h, rr = 20 + r() * 120; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(${r() < 0.5 ? '20,16,12' : '120,108,92'},${0.06 + r() * 0.08})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    for (let i = 0; i < 20000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 1, 1); }
  }, aniso);
  plasterTex.wrapS = plasterTex.wrapT = T.RepeatWrapping;
  const wallMat = new T.MeshStandardMaterial({ map: plasterTex, roughness: 0.95 });
  const backWall = new T.Mesh(new T.PlaneGeometry(9, 5), wallMat); backWall.position.set(0, 2.5, -1.9); backWall.receiveShadow = true; scene.add(backWall);
  const leftWall = new T.Mesh(new T.PlaneGeometry(8, 5), wallMat); leftWall.rotation.y = Math.PI / 2; leftWall.position.set(-2.5, 2.5, 1.6); leftWall.receiveShadow = true; scene.add(leftWall);
  // 왼쪽 벽 창(흐린 바깥빛) — 창틀 · 가로살
  const winGlow = new T.Mesh(new T.PlaneGeometry(1.1, 1.7), new T.MeshBasicMaterial({ color: 0x8e9caa, fog: false, toneMapped: false }));
  winGlow.rotation.y = Math.PI / 2; winGlow.position.set(-2.49, 2.0, 0.6); scene.add(winGlow);
  const frameMat = new T.MeshStandardMaterial({ color: 0x2b241d, roughness: 0.8 });
  for (const [w, h, y, z] of [[0.08, 1.8, 2.0, 0.05], [0.08, 1.8, 2.0, 1.15], [0.08, 1.8, 2.0, 0.6], [1.2, 0.08, 1.15, 0.6], [1.2, 0.08, 2.85, 0.6], [1.2, 0.05, 2.0, 0.6]]) { const b = new T.Mesh(new T.BoxGeometry(0.06, h, w), frameMat); b.position.set(-2.46, y, z); scene.add(b); }
  // 벽에 기대 둔 캔버스 뒷면 두 장(나무틀 · 아마천)
  for (const [x, w, h, ry] of []) {
    const g = new T.Group(); g.position.set(x, 0, -1.6); g.rotation.set(-0.16, ry, 0); scene.add(g);
    const back = new T.Mesh(new T.BoxGeometry(w, h, 0.02), new T.MeshStandardMaterial({ color: 0x4d4436, roughness: 1 })); back.position.y = h / 2; back.castShadow = back.receiveShadow = true; g.add(back);
    for (const [bw, bh, bx, by] of [[w, 0.04, 0, 0.02], [w, 0.04, 0, h - 0.02], [0.04, h, -w / 2 + 0.02, h / 2], [0.04, h, w / 2 - 0.02, h / 2], [0.03, h, 0, h / 2]]) { const b = new T.Mesh(new T.BoxGeometry(bw, bh, 0.03), new T.MeshStandardMaterial({ color: 0x6b5236, roughness: 0.8 })); b.position.set(bx, by, -0.02); b.castShadow = true; g.add(b); }
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
  // 두 점을 잇는 각목
  const stick = (a, b, t, mat = wood, parent = scene) => {
    const A = new T.Vector3(...a), B = new T.Vector3(...b), L = A.distanceTo(B);
    const m = add(new T.BoxGeometry(t, L, t), mat, parent); m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize()); return m;
  };

  // ── 이젤(삼각 다리 + 가운데 기둥 + 받침대 + 위 집게)
  const easel = new T.Group(); scene.add(easel);
  stick([-0.36, 0, 0.16], [-0.05, 1.86, 0.0], 0.035, wood, easel);
  stick([0.36, 0, 0.16], [0.05, 1.86, 0.0], 0.035, wood, easel);
  stick([0, 0, -0.72], [0, 1.7, -0.04], 0.032, wood, easel);
  stick([0, 0.62, 0.03], [0, 2.02, 0.03], 0.03, wood, easel);                                    // 기둥
  stick([-0.25, 0.42, 0.11], [0.25, 0.42, 0.11], 0.022, wood, easel);                            // 가로대
  const LEDGE_Y = 0.9;
  const ledge = add(new T.BoxGeometry(0.84, 0.03, 0.1), wood2, easel); ledge.position.set(0, LEDGE_Y, 0.09);
  add(new T.BoxGeometry(0.84, 0.05, 0.012), wood2, easel).position.set(0, LEDGE_Y + 0.03, 0.135);
  const clamp_ = add(new T.BoxGeometry(0.12, 0.05, 0.07), wood2, easel); clamp_.position.set(0, LEDGE_Y + 0.02 + CVS.H + 0.02, 0.07);

  // ── 캔버스: 아마천 옆면 + 앞면은 칠해지는 판(CanvasTexture)
  const paintCv = document.createElement('canvas'); paintCv.width = TEX_W; paintCv.height = TEX_H;
  const pg = paintCv.getContext('2d');
  pg.fillStyle = '#EDE3CF'; pg.fillRect(0, 0, TEX_W, TEX_H);
  for (let i = 0; i < 2600; i++) { pg.fillStyle = `rgba(120,100,70,${Math.random() * 0.05})`; pg.fillRect(Math.random() * TEX_W, Math.random() * TEX_H, 1 + Math.random() * 3, 1); }
  const paintTex = new T.CanvasTexture(paintCv); paintTex.encoding = T.sRGBEncoding; paintTex.anisotropy = aniso;
  const linen = new T.MeshStandardMaterial({ color: 0xD9CCB0, roughness: 0.95 });
  const front = new T.MeshStandardMaterial({ map: paintTex, roughness: 0.85, color: 0xA4A4A4 });   // 해를 정면으로 받아도 하얗게 날지 않게
  const canvasMesh = add(new T.BoxGeometry(CVS.W, CVS.H, CVS.D), [linen, linen, linen, linen, front, linen], easel);
  canvasMesh.position.set(0, LEDGE_Y + 0.02 + CVS.H / 2, 0.08); canvasMesh.rotation.x = -0.06;
  easel.rotation.y = 0.08;

  // ── 접이식 의자 + 그 위 열린 화구 상자(금속 튜브물감 · 팔레트)
  const stool = new T.Group(); stool.position.set(-0.5, 0, 0.95); stool.rotation.y = 0.35; scene.add(stool);   // 열린 상자가 카메라 쪽을 보게
  for (const sx of [-1, 1]) { stick([sx * 0.17, 0, -0.16], [sx * 0.17, 0.44, 0.16], 0.022, wood, stool); stick([sx * 0.17, 0, 0.16], [sx * 0.17, 0.44, -0.16], 0.022, wood, stool); }
  const seat = add(new T.BoxGeometry(0.4, 0.02, 0.36), new T.MeshStandardMaterial({ color: 0x6B4A2E, roughness: 0.9 }), stool); seat.position.y = 0.45;
  const box = new T.Group(); box.position.set(0, 0.47, 0); stool.add(box);
  const bw = 0.36, bd = 0.25, bh = 0.06;
  add(new T.BoxGeometry(bw, 0.01, bd), wood2, box).position.y = 0.005;
  for (const [w, d, x, z] of [[bw, 0.012, 0, bd / 2], [bw, 0.012, 0, -bd / 2], [0.012, bd, bw / 2, 0], [0.012, bd, -bw / 2, 0]]) add(new T.BoxGeometry(w, bh, d), wood2, box).position.set(x, bh / 2, z);
  const lid = new T.Group(); lid.position.set(0, bh, -bd / 2); lid.rotation.x = -2.05; box.add(lid);
  add(new T.BoxGeometry(bw, 0.012, bd), wood2, lid).position.set(0, 0, bd / 2);
  // 팔레트(뚜껑 안쪽) — 물감 몇 점
  const palTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#B98B5B'; g.fillRect(0, 0, w, h); const cols = ['#F2EEE4', '#2F5C9A', '#D9A32E', '#B0362A', '#6E8E3E', '#E7D9B8']; cols.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.ellipse(40 + i * 36, 60 + (i % 2) * 20, 16, 12, 0.3, 0, 7); g.fill(); }); });
  const pal = add(new T.PlaneGeometry(bw * 0.9, bd * 0.85), new T.MeshStandardMaterial({ map: palTex, roughness: 0.6 }), lid); pal.rotation.x = Math.PI / 2; pal.position.set(0, -0.007, bd / 2);   // 뚜껑 안쪽(열면 카메라 쪽)
  const TUBE_COLS = [0xF2EEE4, 0x2F5C9A, 0xD9A32E, 0xB0362A, 0x6E8E3E, 0x7A4A8A, 0xE7C28A];
  TUBE_COLS.forEach((c, i) => {
    const tube = new T.Group(); tube.position.set(-0.14 + i * 0.045, 0.024, 0.02 + (i % 2) * 0.02); tube.rotation.set(0, 0.05 * (i - 3), Math.PI / 2); box.add(tube);
    add(new T.CylinderGeometry(0.011, 0.013, 0.1, 14), metal, tube);
    const band = add(new T.CylinderGeometry(0.0132, 0.0132, 0.04, 14), new T.MeshStandardMaterial({ color: c, roughness: 0.5 }), tube); band.position.y = 0.005;
    const cap = add(new T.CylinderGeometry(0.006, 0.006, 0.014, 10), new T.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.4 }), tube); cap.position.y = 0.057;
    const crimp = add(new T.BoxGeometry(0.026, 0.008, 0.004), metal, tube); crimp.position.y = -0.053;
  });
  // 붓 몇 자루(받침대 위)
  for (let i = 0; i < 3; i++) stick([-0.3 + i * 0.03, LEDGE_Y + 0.035, 0.11], [-0.04 + i * 0.03, LEDGE_Y + 0.05, 0.13], 0.008, new T.MeshStandardMaterial({ color: [0x8a2a1e, 0x22303a, 0xC9A27A][i], roughness: 0.5 }), easel);

  // ── 빛: 왼쪽 창에서 흐린 빛 한 줄기(차갑게) + 아주 옅은 바탕빛 — 화실은 어두침침하게
  scene.add(new T.HemisphereLight(0x6f7680, 0x1a120c, 0.22));
  const key = new T.SpotLight(0xC9D4E0, 9, 9, 0.62, 0.7, 1.4); key.position.set(-2.3, 2.3, 0.6); key.target.position.set(0.1, 0.9, 0.1); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.camera.near = 0.5; key.shadow.camera.far = 10;
  const warm = new T.PointLight(0xFFB070, 0.5, 4, 2); warm.position.set(1.2, 1.4, 1.6); scene.add(warm);   // 오른쪽 앞 낮은 등잔빛(아주 약하게)
  renderer.toneMappingExposure = 0.9;

  // ── 카메라: 화실 안 이젤(캔버스가 화면 폭 62%) → 칠하는 동안 조금 다가감(80%) → 캔버스 속으로(그림이 화면을 꽉 채움) → 밖의 빛으로
  scene.updateMatrixWorld(true);
  const cvW = new T.Vector3(); canvasMesh.getWorldPosition(cvW);
  const cq = new T.Quaternion(); canvasMesh.getWorldQuaternion(cq);
  const nrm = new T.Vector3(0, 0, 1).applyQuaternion(cq), cup = new T.Vector3(0, 1, 0).applyQuaternion(cq);
  const tanV = Math.tan(T.MathUtils.degToRad(cam.fov / 2)), tanH = tanV * cam.aspect;
  const distW = (f) => (CVS.W / f / 2) / tanH;
  const imgAsp = CVS.W / CVS.H, heightFit = cam.aspect < imgAsp;            // 세로 화면이면 그림 높이를 화면 높이에 맞춘다(= 덮기)
  const dC = heightFit ? (CVS.H / 2) / tanV : (CVS.W / 2) / tanH;
  const PA = cvW.clone().addScaledVector(nrm, distW(0.62)).add(new T.Vector3(-0.28, 0.18, 0));
  const PB = cvW.clone().addScaledVector(nrm, distW(0.8)).add(new T.Vector3(-0.05, 0.03, 0));
  const FX = 0.36;   // 화면을 채울 때 가운데 둘 그림의 가로 위치(아치가 보이게)
  const cright = new T.Vector3(1, 0, 0).applyQuaternion(cq);
  const PC = cvW.clone().addScaledVector(nrm, dC).addScaledVector(cright, heightFit ? (FX - 0.5) * CVS.W : 0);
  const LC = cvW.clone().addScaledVector(cright, heightFit ? (FX - 0.5) * CVS.W : 0);
  const LA = cvW.clone().add(new T.Vector3(0.05, -0.12, 0));
  const pose = (t) => {
    const a = easeIO(clamp(t / PUSH_AT)), b = ease(clamp((t - PUSH_AT) / PUSH));
    const p = new T.Vector3().lerpVectors(PA, PB, a).lerp(PC, b);
    cam.position.copy(p); cam.up.set(0, 1, 0).lerp(cup, b).normalize();
    cam.lookAt(new T.Vector3().lerpVectors(LA, cvW, a * 0.6).lerp(LC, b));
  };
  // 밖의 빛 — 원래 그림(생생한 색)을 화면 가득. 캔버스 속으로 들어간 마지막 구도와 같은 자리에서 칙칙한 색 → 원래 색으로
  const vivid = document.createElement('div'); vivid.className = 'et-vivid';
  vivid.style.backgroundImage = `url("${PAINTING}")`; vivid.style.backgroundSize = heightFit ? 'auto 100%' : '100% auto';
  if (heightFit) { const IW = VH * imgAsp; vivid.style.backgroundPosition = `${(VW / 2 - IW * FX) / (VW - IW) * 100}% 50%`; }
  host.insertBefore(vivid, host.querySelector('.shade') || null);
  const vividAt = (t) => {
    const u = clamp((t - VIV_AT) / VIV), e = easeIO(u);
    vivid.style.opacity = clamp(u * 2.2).toFixed(3);
    const br = 0.8 + 0.22 * e + 0.22 * Math.sin(Math.PI * clamp(u * 1.3)), sat = 0.5 + 0.62 * e, sep = 0.2 * (1 - e);
    vivid.style.filter = `brightness(${br.toFixed(3)}) saturate(${sat.toFixed(3)}) sepia(${sep.toFixed(3)})`;
  };

  // ── 붓질: 넓은 붓 여덟 번(사선, 왼쪽 위 모서리부터) — 붓이 지나간 자리에 칠한 판(det)이 묻어난다
  let img; try { img = await load(PAINTING); } catch (e) { img = null; }
  // 화실 안에서 칠해지는 그림은 칙칙하게(채도 · 밝기를 낮춤) — 밖으로 나가면 원래 색
  const det0 = img ? paintedVersion(img) : paintCv;
  const det = document.createElement('canvas'); det.width = TEX_W; det.height = TEX_H;
  { const d = det.getContext('2d'); d.filter = 'saturate(.5) brightness(.85) sepia(.2)'; d.drawImage(det0, 0, 0); }
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
  let detA = 0;
  const paintTo = (t) => {
    let ch = false;
    for (const sw of sweeps) { const u = (t - sw.at) / SWEEP; if (u > 0) ch = sweepTo(sw, clamp(easeIO(clamp(u)))) || ch; }
    if (t > DET_AT) { const a = clamp((t - DET_AT) / DET); if (a > detA) { pg.globalAlpha = (a - detA) / (1 - detA + 1e-6); pg.drawImage(det, 0, 0); pg.globalAlpha = 1; detA = a; ch = true; } }
    if (ch) paintTex.needsUpdate = true;
  };

  const render = () => renderer.render(scene, cam);
  let done = false, raf = 0;
  function finish() {
    if (done) return; done = true; cancelAnimationFrame(raf);
    removeEventListener('pointerdown', skip, true);
    ui.classList.add('out'); host.classList.add('et3d-done'); onDone?.();
    setTimeout(() => { cv.style.display = 'none'; renderer.dispose(); }, 400);   // 밖의 그림이 다 덮었으니 3D 는 멈춘다
    setTimeout(() => ui.remove(), 900);
  }
  function toEnd() { paintTo(99); pose(99); vividAt(99); render(); }
  function skip() { if (done) return; title.classList.remove('on'); toEnd(); setTimeout(finish, 60); }

  const FREEZE = new URLSearchParams(location.search).get('etT');
  if (instant) { toEnd(); finish(); return; }
  if (FREEZE != null) { const t = +FREEZE; paintTo(t); pose(t); vividAt(t); render(); requestAnimationFrame(() => { title.classList.toggle('on', t <= PAINT_AT + 1.3); window.__etReady = true; }); return; }

  pose(0); vividAt(0); render();
  requestAnimationFrame(() => title.classList.add('on'));
  addEventListener('pointerdown', skip, true);
  const T0 = performance.now();
  const tick = (now) => {
    if (done) return;
    const t = (now - T0) / 1000;
    paintTo(t);
    if (t > PAINT_AT + 1.3) title.classList.remove('on');
    pose(t); vividAt(t); render();
    if (t >= OUT_AT) return finish();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
