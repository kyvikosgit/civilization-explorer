// 에트르타 도입(11/06) — 빈 캔버스에 붓질로 에트르타가 그려지고, 카메라가 물러나면 그 캔버스가 이젤 위에 놓인 실제 바닷가가 된다.
//   배경 그림(img/etretat_scene.jpg 903×879) 안 이젤 캔버스 자리 = (508, 348) 244×246 — img/et_canvas.jpg 가 그 자리를 잘라 키운 것(맞춰 봄 0.99)
//   그림은 휘거나 일렁이지 않는다: 붓질로 드러남 · 확대 · 밝기 · 빛줄기만. 끝 장면은 .room-bg .ph 와 같은 구도(inset -2% · cover 40% 40%)
//   playIntro({ onDone }) — 누르면 끝 장면으로
const IMG_W = 903, IMG_H = 879;
const CV = { x: 508, y: 348, w: 244, h: 246 };
const V3 = new URL('./', import.meta.url).href;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v) => Math.max(0, Math.min(1, v));
const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

// 붓질 — 정해 둔 길이 아니라, 그림을 보고 화가처럼 칠한다(굵은 붓으로 큰 덩어리 → 점점 가는 붓으로 모양):
//   붓 크기마다 그림을 그만큼 흐리게 보고, 아직 덜 칠한 자리에서 시작해 색의 결(밝기 기울기의 직각)을 따라 한 획을 긋는다(Hertzmann 1998 방식).
//   계산은 작은 판(M×M)에서 미리 하고, 화면에는 획마다 털 결 · 물감 두께(밝은 가장자리)를 얹어 큰 해상도로 그린다
const M = 220;                              // 계산 판
const LAYERS = [                            // 붓 반지름(계산 판 px) · 칠할 만큼 다른가(색 차이)
  { r: 15, th: 26 },
  { r: 8, th: 22 },
  { r: 4.5, th: 20 },
  { r: 2.5, th: 18 },
];
// 11/09: 작은 붓질 수천 개를 여기저기 빨리 찍으면 벌레 떼처럼 보인다 —
//   눈에 보이는 붓질은 굵은 붓 한 겹만, 위에서 아래로 좌우를 오가며 한 획씩 그어지고(획은 길이를 따라 자란다),
//   가는 붓 겹은 미리 다 칠해 둔 판을 천천히 겹쳐 그림이 또렷해지게
// 11/09(2): 그래도 정신없다 — 넓은 붓으로 일곱 번 슥슥(위에서 아래로, 좌우 번갈아). 붓이 지나간 자리에 칠해진 그림(위 방식으로 미리 다 칠한 판)이 묻어난다
const PAINT_AT = 0.9, SWEEP = 0.5, GAP = 0.34, NS = 8;     // 한 번 긋는 시간 · 다음 획까지 · 횟수
const DET_AT = PAINT_AT + GAP * (NS - 1) + SWEEP, DET = 0.5; // 붓 사이 빈틈을 채우는 마무리
const PULL_AT = DET_AT + DET + 0.2, PULL = 2.4, OUT_AT = PULL_AT + PULL + 0.1;

function planStrokes(img) {
  const c = document.createElement('canvas'); c.width = c.height = M;
  const x = c.getContext('2d', { willReadFrequently: true });
  const cur = new Float32Array(M * M * 3).fill(0);
  for (let i = 0; i < M * M; i++) { cur[i * 3] = 237; cur[i * 3 + 1] = 227; cur[i * 3 + 2] = 207; }   // 초벌칠 색
  const rand = (() => { let k = 7; return () => { k = (k * 16807) % 2147483647; return (k - 1) / 2147483646; }; })();
  const out = [];
  LAYERS.forEach((L, li) => {
    x.filter = `blur(${Math.max(0.5, L.r * 0.5)}px)`; x.clearRect(0, 0, M, M); x.drawImage(img, 0, 0, M, M); x.filter = 'none';
    const ref = x.getImageData(0, 0, M, M).data;
    const lum = new Float32Array(M * M); for (let i = 0; i < M * M; i++) lum[i] = 0.3 * ref[i * 4] + 0.59 * ref[i * 4 + 1] + 0.11 * ref[i * 4 + 2];
    const at = (px, py) => { const X = Math.max(0, Math.min(M - 1, px | 0)), Y = Math.max(0, Math.min(M - 1, py | 0)); return Y * M + X; };
    const diff = (k) => { const a = ref[k * 4] - cur[k * 3], b = ref[k * 4 + 1] - cur[k * 3 + 1], d = ref[k * 4 + 2] - cur[k * 3 + 2]; return Math.sqrt(a * a + b * b + d * d); };
    const layer = [];
    const step = Math.max(1, Math.round(L.r));
    for (let gy = 0; gy < M; gy += step) for (let gx = 0; gx < M; gx += step) {
      // 칸 안에서 가장 덜 칠한 자리
      let best = -1, bk = 0, sum = 0, n = 0;
      for (let yy = gy; yy < Math.min(M, gy + step); yy++) for (let xx = gx; xx < Math.min(M, gx + step); xx++) { const k = yy * M + xx, e = diff(k); sum += e; n++; if (e > best) { best = e; bk = k; } }
      if (sum / n < L.th) continue;
      let px = bk % M, py = (bk / M) | 0;
      const k0 = bk, col = [ref[k0 * 4], ref[k0 * 4 + 1], ref[k0 * 4 + 2]];
      const pts = [[px, py]]; let ldx = 0, ldy = 0;
      const maxLen = L.r > 10 ? 5 : L.r > 5 ? 7 : 9;
      for (let s = 1; s < maxLen; s++) {
        const k = at(px, py);
        if (s > 2) { const dc = Math.hypot(ref[k * 4] - col[0], ref[k * 4 + 1] - col[1], ref[k * 4 + 2] - col[2]), dn = Math.hypot(cur[k * 3] - col[0], cur[k * 3 + 1] - col[1], cur[k * 3 + 2] - col[2]); if (dc > dn) break; }
        const gx_ = lum[at(px + 1, py)] - lum[at(px - 1, py)], gy_ = lum[at(px, py + 1)] - lum[at(px, py - 1)];
        if (Math.hypot(gx_, gy_) < 0.5) { if (!ldx && !ldy) { ldx = 1; ldy = 0.15 * (rand() - 0.5); } }   // 결이 없으면(하늘 · 바다) 가로로 길게
        else if (!ldx && !ldy) { const l0 = Math.hypot(gx_, gy_); ldx = -gy_ / l0; ldy = gx_ / l0; }
        else { let dx = -gy_, dy = gx_; const l = Math.hypot(dx, dy); dx /= l; dy /= l; if (ldx * dx + ldy * dy < 0) { dx = -dx; dy = -dy; } const sm = L.r > 6 ? 0.82 : 0.6; ldx = sm * ldx + (1 - sm) * dx; ldy = sm * ldy + (1 - sm) * dy; }   // 큰 붓일수록 곧게
        const ll = Math.hypot(ldx, ldy) || 1; px += (ldx / ll) * L.r; py += (ldy / ll) * L.r;
        if (px < -L.r || py < -L.r || px > M + L.r || py > M + L.r) break;
        pts.push([px, py]);
      }
      // 계산 판에도 칠한다(다음 획 · 다음 층이 본다)
      for (const [qx, qy] of pts) {
        const R = Math.ceil(L.r);
        for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) {
          if (xx * xx + yy * yy > L.r * L.r) continue;
          const X = (qx + xx) | 0, Y = (qy + yy) | 0; if (X < 0 || Y < 0 || X >= M || Y >= M) continue;
          const k = Y * M + X; cur[k * 3] = col[0]; cur[k * 3 + 1] = col[1]; cur[k * 3 + 2] = col[2];
        }
      }
      layer.push({ pts, col, r: L.r, seed: rand(), li });
    }
    if (li === 0) {   // 굵은 붓: 위 띠부터, 띠 안에서는 왼→오 · 오→왼 번갈아(화가가 캔버스를 쓸어 가듯)
      const band = L.r * 2.2;
      layer.sort((a, b) => { const ba = Math.floor(a.pts[0][1] / band), bb = Math.floor(b.pts[0][1] / band); if (ba !== bb) return ba - bb; return ba % 2 ? b.pts[0][0] - a.pts[0][0] : a.pts[0][0] - b.pts[0][0]; });
    }
    out.push(...layer);
  });
  return out;
}

export async function playIntro({ onDone } = {}) {
  const root = document.createElement('div');
  root.id = 'etIntro'; root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `<div class="ei-world"><div class="ei-scene"></div><canvas class="ei-cv"></canvas></div><div class="ei-sun"></div><div class="ei-shade"></div>
    <div class="ei-title"><b>ÉTRETAT</b><small>EN PLEIN AIR</small></div><p class="et-skip">누르면 건너뜁니다</p>`;
  document.body.appendChild(root);
  const world = root.querySelector('.ei-world'), scene = root.querySelector('.ei-scene'), cv = root.querySelector('.ei-cv'), sun = root.querySelector('.ei-sun'), shade = root.querySelector('.ei-shade'), title = root.querySelector('.ei-title');
  let img;
  try { img = await load(V3 + 'img/et_canvas.jpg'); } catch (e) { root.remove(); onDone?.(); return; }

  // 끝 장면 구도 = .room-bg .ph(화면보다 4% 큰 상자에 cover 40% 40%)
  const rb = document.querySelector('.room-bg')?.getBoundingClientRect() || { left: 0, top: 0, width: innerWidth, height: innerHeight };
  // 도입 화면은 .room-bg 와 같은 칸(태블릿에선 가운데 480) — 좌표는 그 칸 기준
  Object.assign(root.style, { left: `${rb.left}px`, top: `${rb.top}px`, width: `${rb.width}px`, height: `${rb.height}px` });
  const vw = rb.width, vh = rb.height, bw = vw * 1.04, bh = vh * 1.04;
  const s = Math.max(bw / IMG_W, bh / IMG_H), dw = IMG_W * s, dh = IMG_H * s;
  const left = -vw * 0.02 + (bw - dw) * 0.4, top = -vh * 0.02 + (bh - dh) * 0.4;
  Object.assign(world.style, { left: `${left}px`, top: `${top}px`, width: `${dw}px`, height: `${dh}px` });
  const cx = (CV.x + CV.w / 2) * s, cy = (CV.y + CV.h / 2) * s, cw = CV.w * s, ch = CV.h * s;
  Object.assign(cv.style, { left: `${CV.x * s}px`, top: `${CV.y * s}px`, width: `${cw}px`, height: `${ch}px` });
  // 시작: 캔버스가 화면 가로 84%(태블릿은 세로 기준으로 제한)
  const Z0 = Math.min((vw * 0.84) / cw, (vh * 0.56) / ch);
  const startC = [vw / 2, vh * 0.52], endC = [left + cx, top + cy];
  const R = Math.min(1100, Math.round(cw * Z0 * Math.min(2, devicePixelRatio || 1)));
  cv.width = R; cv.height = Math.round((R * ch) / cw);
  const g = cv.getContext('2d'), g0 = g;
  const W = cv.width, H = cv.height;
  // 끝에 겹쳐 드러낼 원본(물러날 때 배경 그림과 그대로 이어지게)
  const off = document.createElement('canvas'); off.width = W; off.height = H; off.getContext('2d').drawImage(img, 0, 0, W, H);
  // 초벌칠(젯소) — 크림 바탕 + 아주 옅은 결
  g.fillStyle = '#EDE3CF'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(120,100,70,${Math.random() * 0.05})`; g.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 3, 1); }
  const plan = planStrokes(img);
  const k = W / M;
  const shade_ = (c, f) => `rgb(${Math.min(255, Math.max(0, c[0] * f)) | 0},${Math.min(255, Math.max(0, c[1] * f)) | 0},${Math.min(255, Math.max(0, c[2] * f)) | 0})`;
  // 한 획: 몸통(제 색) → 털 결(조금 어둡고 밝은 가는 줄 몇 가닥) → 물감 두께(위쪽 가장자리에 옅은 하이라이트)
  function drawStroke(st, u = 1, g = g0) {
    let P = st.pts.map(([x, y]) => [x * k, y * k]); const w = st.r * 2 * k;
    if (u < 1) { const n = Math.max(1, Math.ceil(u * P.length)); P = P.slice(0, n); }
    const line = (off, lw, color, alpha) => {
      g.globalAlpha = alpha; g.strokeStyle = color; g.lineWidth = lw; g.beginPath();
      P.forEach(([x, y], i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L; const X = x + nx * off, Y = y + ny * off; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
      if (P.length === 1) g.lineTo(P[0][0] + w * 0.35, P[0][1]);
      g.stroke();
    };
    g.lineCap = st.li === 0 ? 'butt' : 'round'; g.lineJoin = 'round';   // 굵은 붓은 납작붓 끝(소시지처럼 둥글지 않게)
    line(0, w, shade_(st.col, 1), u < 1 ? 1 : 0.95);
    if (u < 1) { g.globalAlpha = 1; return; }
    let sd = st.seed * 1000;
    const r = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
    const hairs = st.r > 6 ? 5 : 3;
    for (let i = 0; i < hairs; i++) line((r() - 0.5) * w * 0.8, Math.max(0.6, w * (0.06 + r() * 0.08)), shade_(st.col, r() < 0.5 ? 0.86 : 1.12), 0.35);
    line(-w * 0.32, Math.max(0.6, w * 0.12), shade_(st.col, 1.22), 0.18);
    g.globalAlpha = 1;
  }
  // 가는 붓 겹까지 다 칠한 판(미리)
  const det = document.createElement('canvas'); det.width = W; det.height = H; const dg = det.getContext('2d');
  dg.drawImage(cv, 0, 0); for (const st of plan) drawStroke(st, 1, dg);
  // 넓은 붓 일곱 획 — 가로로 살짝 휘며 지나가고, 털 열여덟 가닥이 굵기 · 진하기 · 닿고 떨어지는 자리가 조금씩 달라 가장자리가 붓처럼 갈라진다
  const pat = g.createPattern(det, 'no-repeat');
  const BW = H * 0.2;
  // 11/09: 사선으로 — 왼쪽 아래에서 오른쪽 위로 긋는 결(30도), 왼쪽 위 모서리부터 오른쪽 아래 모서리까지 차례로
  const ANG = -Math.PI / 6, dx = Math.cos(ANG), dy = Math.sin(ANG), nx = -dy, ny = dx;
  const projs = [[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => (x - W / 2) * nx + (y - H / 2) * ny);
  const pMin = Math.min(...projs) + BW * 0.35, pMax = Math.max(...projs) - BW * 0.35, half = Math.hypot(W, H) * 0.62;
  const sweeps = Array.from({ length: NS }, (_, i) => {
    const o = pMin + (pMax - pMin) * (i / (NS - 1)), dir = i % 2 ? -1 : 1;
    const cx0 = W / 2 + nx * o, cy0 = H / 2 + ny * o, bend = (i % 3 - 1) * H * 0.025;
    const path = Array.from({ length: 48 }, (_, k) => { const u = k / 47, a = (dir > 0 ? -1 + 2 * u : 1 - 2 * u) * half, w = Math.sin(u * Math.PI) * bend + Math.sin(u * 7 + i) * H * 0.006;
      return [cx0 + dx * a + nx * w, cy0 + dy * a + ny * w]; });
    const hairs = Array.from({ length: 18 }, (_, h) => ({ off: ((h / 17) - 0.5) * BW * (0.9 + Math.random() * 0.2), w: BW * (0.06 + Math.random() * 0.1), a: 0.6 + Math.random() * 0.4, s: Math.random() * 0.08, e: 1 - Math.random() * 0.1 }));
    return { path, hairs, at: PAINT_AT + i * GAP, drawn: 0 };
  });
  function sweepTo(sw, u) {
    const P = sw.path, n = Math.floor(u * (P.length - 1));
    if (n <= sw.drawn) return;
    g.save(); g.strokeStyle = pat; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const h of sw.hairs) {
      const i0 = Math.max(Math.max(0, sw.drawn - 1), Math.ceil(h.s * (P.length - 1))), i1 = Math.min(n, Math.floor(h.e * (P.length - 1)));
      if (i1 <= i0) continue;
      g.globalAlpha = h.a; g.lineWidth = h.w; g.beginPath();
      for (let i = i0; i <= i1; i++) { const x = P[i][0] + nx * h.off, y = P[i][1] + ny * h.off; i === i0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
    }
    g.restore(); sw.drawn = n;
  }
  let detA = 0;
  const paintTo = (t) => {
    for (const sw of sweeps) { const u = (t - sw.at) / SWEEP; if (u > 0) sweepTo(sw, clamp(easeIO(clamp(u)))); }
    if (t > DET_AT) { const a = clamp((t - DET_AT) / DET); if (a > detA) { g.globalAlpha = (a - detA) / (1 - detA + 1e-6); g.drawImage(det, 0, 0); g.globalAlpha = 1; detA = a; } }
  };
  let done = false, skipped = false, raf = 0, glazed = 0;
  const GL0 = PULL_AT + 0.3, GL = 1.3;   // 물러나면서 원본 그림으로 덮어 배경과 이어지게
  function place(t) {   // 0 = 캔버스 확대, 1 = 끝 장면
    const e = ease(t), Z = Math.exp(Math.log(Z0) * (1 - e));
    const c = [startC[0] + (endC[0] - startC[0]) * e, startC[1] + (endC[1] - startC[1]) * e];
    world.style.transform = `translate(${c[0] - left - Z * cx}px,${c[1] - top - Z * cy}px) scale(${Z})`;
    scene.style.filter = `brightness(${(0.16 + 0.46 * clamp(e * 1.2)).toFixed(3)}) saturate(.95)`;
    cv.style.filter = `brightness(${(1 - 0.38 * e).toFixed(3)}) saturate(${(1 - 0.05 * e).toFixed(3)})`;
    shade.style.opacity = e.toFixed(3);
  }
  place(0);
  cv.style.opacity = '0'; cv.style.transition = 'opacity .9s ease';
  requestAnimationFrame(() => { cv.style.opacity = '1'; title.classList.add('on'); });

  function finish() {
    if (done) return; done = true; cancelAnimationFrame(raf);
    removeEventListener('pointerdown', skip, true);
    root.classList.add('out'); onDone?.();
    setTimeout(() => root.remove(), 900);
  }
  function skip() {
    if (done || skipped) return; skipped = true;
    g.globalAlpha = 1; g.drawImage(off, 0, 0); place(1); sun.style.opacity = '.35'; title.classList.remove('on');
    setTimeout(finish, 80);
  }
  const FREEZE = new URLSearchParams(location.search).get('etT');
  if (FREEZE != null) {
    const t = +FREEZE; cv.style.transition = 'none'; cv.style.opacity = '1'; paintTo(t); if (t > GL0) { g.globalAlpha = clamp((t - GL0) / GL); g.drawImage(off, 0, 0); g.globalAlpha = 1; }
    place(clamp((t - PULL_AT) / PULL)); requestAnimationFrame(() => requestAnimationFrame(() => { title.classList.toggle('on', t <= PAINT_AT + 1.3); window.__etReady = true; })); return;
  }
  addEventListener('pointerdown', skip, true);

  function tick(now) {
    if (done || skipped) return;
    const t = (now - T0) / 1000;
    paintTo(t);
    if (t > GL0) { const a = clamp((t - GL0) / GL); if (a > glazed) { g.globalAlpha = (a - glazed) / (1 - glazed + 1e-6); g.drawImage(off, 0, 0); g.globalAlpha = 1; glazed = a; } }
    if (t > PAINT_AT + 1.3) title.classList.remove('on');
    // 물러나기 — 캔버스가 이젤 위 자리로, 둘레에 바닷가가 밝아진다
    const p = clamp((t - PULL_AT) / PULL);
    place(p);
    sun.style.opacity = (p < 0.6 ? 0.55 * clamp(p / 0.6) : 0.55 - 0.2 * clamp((p - 0.6) / 0.4)).toFixed(3);
    if (t >= OUT_AT) return finish();
    raf = requestAnimationFrame(tick);
  }
  const T0 = performance.now();
  raf = requestAnimationFrame(tick);
}
