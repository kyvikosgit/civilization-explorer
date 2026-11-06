// 에트르타 도입(11/06) — 빈 캔버스에 붓질로 에트르타가 그려지고, 카메라가 물러나면 그 캔버스가 이젤 위에 놓인 실제 바닷가가 된다.
//   배경 그림(img/etretat_scene.jpg 903×879) 안 이젤 캔버스 자리 = (508, 348) 244×246 — img/et_canvas.jpg 가 그 자리를 잘라 키운 것(맞춰 봄 0.99)
//   그림은 휘거나 일렁이지 않는다: 붓질로 드러남 · 확대 · 밝기 · 빛줄기만. 끝 장면은 .room-bg .ph 와 같은 구도(inset -2% · cover 40% 40%)
//   playIntro({ onDone }) — 누르면 끝 장면으로
const IMG_W = 903, IMG_H = 879;
const CV = { x: 508, y: 348, w: 244, h: 246 };
const V3 = new URL('./', import.meta.url).href;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v) => Math.max(0, Math.min(1, v));
const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

// 붓질 — 캔버스 비율 좌표. 그리는 순서대로: 하늘(가로로 길게) → 절벽(비스듬히 · 세로로) → 바다(가로로) → 가장자리
const STROKES = [
  [[-0.05, 0.05], [0.35, 0.03], [0.7, 0.07], [1.05, 0.04]],
  [[1.05, 0.14], [0.7, 0.12], [0.35, 0.16], [-0.05, 0.13]],
  [[-0.05, 0.23], [0.3, 0.21], [0.65, 0.25], [1.05, 0.22]],
  [[1.05, 0.32], [0.7, 0.3], [0.4, 0.33]],
  [[0.02, 0.52], [0.08, 0.38], [0.18, 0.29], [0.28, 0.27]],
  [[0.12, 0.62], [0.2, 0.45], [0.3, 0.33], [0.42, 0.29]],
  [[0.3, 0.62], [0.36, 0.46], [0.44, 0.34], [0.54, 0.31]],
  [[0.46, 0.62], [0.5, 0.48], [0.56, 0.38], [0.64, 0.36]],
  [[0.6, 0.64], [0.64, 0.5], [0.7, 0.4], [0.76, 0.42]],
  [[0.74, 0.64], [0.78, 0.52], [0.82, 0.42]],
  [[1.05, 0.46], [0.88, 0.43], [0.72, 0.48]],
  [[-0.05, 0.42], [0.1, 0.4], [0.2, 0.44]],
  [[-0.05, 0.6], [0.3, 0.63], [0.65, 0.6], [1.05, 0.64]],
  [[1.05, 0.71], [0.65, 0.68], [0.3, 0.72], [-0.05, 0.69]],
  [[-0.05, 0.8], [0.35, 0.77], [0.7, 0.81], [1.05, 0.78]],
  [[1.05, 0.89], [0.6, 0.86], [0.25, 0.9], [-0.05, 0.87]],
  [[-0.05, 0.98], [0.4, 0.96], [0.75, 0.99], [1.05, 0.97]],
  [[0.93, -0.05], [0.95, 0.4], [0.93, 0.8], [0.96, 1.05]],
];
const STEP = 0.15, DUR = 0.36;            // 붓질 하나 0.34초, 0.19초 간격으로 겹쳐서
const PAINT_AT = 1.0, GLAZE = 0.5;
const PAINT_END = PAINT_AT + STEP * (STROKES.length - 1) + DUR;
const PULL_AT = PAINT_END + GLAZE + 0.25, PULL = 2.3, OUT_AT = PULL_AT + PULL + 0.1;

// 곡선 위 점(캣멀-롬) — 붓이 지나간 길을 촘촘히
function sample(pts, n = 40) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(t)), u = t - k;
    const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(pts.length - 1, k + 2)];
    const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
    out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
  }
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
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  // 그림을 캔버스 크기 그대로 깐 무늬 — 붓이 지나간 자리에 그 색이 묻는다
  const off = document.createElement('canvas'); off.width = W; off.height = H; off.getContext('2d').drawImage(img, 0, 0, W, H);
  const pat = g.createPattern(off, 'no-repeat');
  // 초벌칠(젯소) — 크림 바탕 + 아주 옅은 결
  const primer = () => {
    g.fillStyle = '#EDE3CF'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,100,70,${Math.random() * 0.05})`; g.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1); }
  };
  primer();
  // 붓질마다 털 아홉 가닥 — 가닥마다 굵기 · 진하기 · 흔들림이 달라 가장자리가 붓처럼 갈라진다
  const BW = W * 0.15;
  const strokes = STROKES.map((pts) => {
    const path = sample(pts.map(([x, y]) => [x * W, y * H]));
    const hairs = Array.from({ length: 15 }, (_, i) => ({ off: ((i / 14) - 0.5) * BW * (0.85 + Math.random() * 0.25), w: BW * (0.07 + Math.random() * 0.12), a: 0.55 + Math.random() * 0.45, j: Math.random() * 6,
      s: Math.random() * 0.12, e: 1 - Math.random() * 0.14 }));   // 가닥마다 붓이 닿고 떨어지는 자리가 조금씩 달라 끝이 갈라진다
    return { path, hairs, drawn: 0 };
  });
  function drawStroke(st, upto) {
    const P = st.path, n = Math.floor(upto * (P.length - 1));
    if (n <= st.drawn) return;
    g.save(); g.strokeStyle = pat; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const h of st.hairs) {
      g.globalAlpha = h.a; g.lineWidth = h.w; g.beginPath();
      const i0 = Math.max(Math.max(0, st.drawn - 1), Math.ceil(h.s * (P.length - 1))), i1 = Math.min(n, Math.floor(h.e * (P.length - 1)));
      if (i1 <= i0) continue;
      for (let i = i0; i <= i1; i++) {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L, ny = dx / L, wob = Math.sin(i * 0.55 + h.j) * BW * 0.06;
        const x = P[i][0] + nx * (h.off + wob), y = P[i][1] + ny * (h.off + wob);
        if (i === i0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.restore(); st.drawn = n;
  }

  let done = false, skipped = false, raf = 0, glazed = 0;
  const T0 = performance.now();
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
  addEventListener('pointerdown', skip, true);

  function tick(now) {
    if (done || skipped) return;
    const t = (now - T0) / 1000;
    // 붓질
    strokes.forEach((st, i) => { const u = (t - PAINT_AT - i * STEP) / DUR; if (u > 0) drawStroke(st, clamp(u)); });
    // 마무리 덧칠 — 붓 사이 빈틈을 그림 그대로 채운다
    if (t > PAINT_END) { const a = clamp((t - PAINT_END) / GLAZE); if (a > glazed) { g.globalAlpha = (a - glazed) / (1 - glazed + 1e-6); g.drawImage(off, 0, 0); g.globalAlpha = 1; glazed = a; } }
    if (t > PAINT_END - 0.4) title.classList.remove('on');
    // 물러나기 — 캔버스가 이젤 위 자리로, 둘레에 바닷가가 밝아진다
    const p = clamp((t - PULL_AT) / PULL);
    place(p);
    sun.style.opacity = (p < 0.6 ? 0.55 * clamp(p / 0.6) : 0.55 - 0.2 * clamp((p - 0.6) / 0.4)).toFixed(3);
    if (t >= OUT_AT) return finish();
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
}
