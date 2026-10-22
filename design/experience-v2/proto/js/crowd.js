// 오늘의 관람객 — 점으로 모이는 군중. C0·C1·C2·C4·출구가 같이 쓰는 부품 (css/crowd.css 와 한 쌍)
//   점 하나 = 열 사람. 처음엔 흩어져 있다가, 드러날 때 고른 쪽으로 흘러가 모인다(1.2–1.6초, 차례로). 내 점은 주황이고 조금 크며 맨 마지막에 간다.
//   그리기는 canvas 2D 하나(점은 DOM 이 아니다). 모션 줄이기면 모인 자리에 바로 놓는다. 막대·원그래프·게이지 없음.
export const PER_DOT = 10;
export const POINT = '#D9672F';

// 결정적 난수 — 캡처가 매번 같게
export function rng(seed = 7) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const num = (v) => (typeof v === 'string' ? parseInt(v.replace(/\D/g, ''), 10) : v);
export function dotsFor(total) { return Math.max(12, Math.round(num(total) / PER_DOT)); }
export function fmt(n) { return num(n).toLocaleString('ko-KR'); }
// "오늘 16:20 기준 · 1,284명 · 수치는 예시"
export function stampLine(total, at = new Date()) {
  const hh = String(at.getHours()).padStart(2, '0'), mm = String(at.getMinutes()).padStart(2, '0');
  return `오늘 ${hh}:${mm} 기준 · ${fmt(total)}명 · 수치는 예시`;
}
// 비율 → 점 수(합이 n). 큰 나머지 순으로 채운다
export function split(n, pcts) {
  const raw = pcts.map((p) => (n * p) / 100), base = raw.map(Math.floor);
  let rest = n - base.reduce((a, b) => a + b, 0);
  raw.map((v, i) => [v - base[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rest > 0) { base[i]++; rest--; } });
  return base;
}

// ── 자리 잡기: 가운데부터 육각 격자로 채우고 살짝 흔든다. 첫 자리(=가운데)는 내 점이 쓴다
function hexFill(n, inside, cx, cy, bw, bh, rnd, s0) {
  for (let s = s0; s >= 2.4; s *= 0.88) {
    const rows = Math.ceil(bh / (s * 0.866)) + 2, cols = Math.ceil(bw / s) + 2, pts = [];
    for (let r = -rows; r <= rows; r++) for (let c = -cols; c <= cols; c++) {
      const x = cx + (c + (r & 1 ? 0.5 : 0)) * s, y = cy + r * s * 0.866;
      if (inside(x, y)) pts.push([x, y]);
    }
    if (pts.length >= n) {
      pts.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy));
      return pts.slice(0, n).map(([x, y], i) => ({ x: x + (i ? (rnd() - 0.5) * s * 0.8 : 0), y: y + (i ? (rnd() - 0.5) * s * 0.8 : 0) }));
    }
  }
  return null;
}
export function packRect(n, r, rnd, s0 = 7.5) {
  if (!n) return [];
  return hexFill(n, (x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h, r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, rnd, s0)
    || Array.from({ length: n }, () => ({ x: r.x + rnd() * r.w, y: r.y + rnd() * r.h }));
}
export function discRadius(n, s = 2.5) { return Math.max(6, s * Math.sqrt(n) + 3); }
export function packDisc(n, cx, cy, r, rnd) {
  if (!n) return [];
  const rr = r || discRadius(n);
  return Array.from({ length: n }, (_, i) => { if (!i) return { x: cx, y: cy }; const a = i * 2.399963 + (rnd() - 0.5) * 0.5, d = rr * Math.sqrt((i + 0.5) / n) * (0.92 + rnd() * 0.12); return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d }; });
}
export function inPoly(x, y, pts) {
  let on = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) on = !on;
  }
  return on;
}
export function centroid(pts) { let a = 0, cx = 0, cy = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const f = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1]; a += f; cx += (pts[j][0] + pts[i][0]) * f; cy += (pts[j][1] + pts[i][1]) * f; } if (Math.abs(a) < 1e-6) { const n = pts.length; return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n]; } a *= 0.5; return [cx / (6 * a), cy / (6 * a)]; }
// 다각형(지도 영역) 안에 — 좁으면 가운데를 중심으로 둥글게 넘친다
export function packPoly(n, pts, rnd, s0 = 6.5) {
  if (!n) return [];
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const [cx, cy] = centroid(pts), bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
  return hexFill(n, (x, y) => inPoly(x, y, pts), cx, cy, bw, bh, rnd, s0) || packDisc(n, cx, cy, discRadius(n), rnd);
}
// 흩어진 처음 자리: 성긴 격자 + 큰 흔들림
export function scatter(n, r, rnd) {
  const s = Math.sqrt((r.w * r.h) / n), out = [];
  const cols = Math.ceil(r.w / s), rows = Math.ceil(r.h / s);
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) out.push({ x: r.x + (j + 0.5) * s + (rnd() - 0.5) * s * 0.9, y: r.y + (i + 0.5) * s + (rnd() - 0.5) * s * 0.9 });
  for (let i = out.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [out[i], out[k]] = [out[k], out[i]]; }
  return out.slice(0, n).map((p) => ({ x: Math.max(r.x + 2, Math.min(r.x + r.w - 2, p.x)), y: Math.max(r.y + 2, Math.min(r.y + r.h - 2, p.y)) }));
}
// 점마다 갈 자리: groups = [{ pts }] (내 무리의 첫 자리는 내 점). 지금 자리의 x 순서대로 왼쪽 무리부터 — 길이 덜 엇갈린다
export function targetsFor(crowd, groups, myGroup) {
  const n = crowd.dots.length, mine = crowd.mine, t = new Array(n).fill(null);
  const order = crowd.dots.map((d, i) => i).filter((i) => i !== mine).sort((a, b) => crowd.dots[a].x - crowd.dots[b].x || crowd.dots[a].y - crowd.dots[b].y);
  let k = 0;
  groups.forEach((g, gi) => { const pts = g.pts.slice(); if (gi === myGroup && pts.length) t[mine] = pts.shift(); pts.forEach((p) => { if (k < order.length) t[order[k++]] = p; }); });
  return t;
}

// ── 군중
export function createCrowd(canvas, { theme = 'dark', n = 128, reduceMotion = false, seed = 11, dotR = 1.9 } = {}) {
  const ctx = canvas.getContext('2d');
  const rnd = rng(seed);
  const dots = Array.from({ length: n }, () => ({ x: -20, y: -20, r: dotR * (0.78 + rnd() * 0.44), a: 0.74 + rnd() * 0.24, a1: null, anim: null }));
  const mine = n - 1;
  dots[mine].r = dotR * 1.75; dots[mine].a = 1;
  const col = theme === 'dark' ? '255,247,234' : '17,17,17';
  let W = 0, H = 0, dpr = 1, raf = 0, running = false, onDone = null;
  function resize() {
    const r = canvas.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr));
    draw();
  }
  const ease = (p) => 1 - Math.pow(1 - p, 3);
  function step(d, now) {
    const a = d.anim, p = (now - a.t0) / a.dur;
    if (p <= 0) return true;
    if (p >= 1) { d.x = a.x1; d.y = a.y1; if (d.a1 !== null) { d.a = d.a1; d.a1 = null; } d.anim = null; return false; }
    const e = ease(p), sw = Math.sin(p * Math.PI) * a.bend;
    d.x = a.x0 + (a.x1 - a.x0) * e + a.nx * sw; d.y = a.y0 + (a.y1 - a.y0) * e + a.ny * sw;
    if (d.a1 !== null) d.a = a.a0 + (d.a1 - a.a0) * p;
    return true;
  }
  function draw(now = performance.now()) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    let active = false;
    for (let i = 0; i < n; i++) { const d = dots[i]; if (d.anim) active = step(d, now) || active; }
    for (let i = 0; i < n; i++) {
      if (i === mine) continue;
      const d = dots[i];
      ctx.fillStyle = `rgba(${col},${d.a.toFixed(3)})`; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.2832); ctx.fill();
    }
    const m = dots[mine];
    ctx.fillStyle = 'rgba(217,103,47,.22)'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r + 4, 0, 6.2832); ctx.fill();
    ctx.fillStyle = POINT; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832); ctx.fill();
    return active;
  }
  function loop(now) { if (draw(now)) raf = requestAnimationFrame(loop); else { running = false; raf = 0; const f = onDone; onDone = null; if (f) f(); } }
  function kick() { if (!running) { running = true; raf = requestAnimationFrame(loop); } }
  // 바로 놓기
  function place(pts, alpha) {
    pts.forEach((p, i) => { if (!p) return; const d = dots[i]; d.x = p.x; d.y = p.y; d.anim = null; d.a1 = null; const a = alpha == null ? null : typeof alpha === 'function' ? alpha(i) : alpha; if (a != null) d.a = a; });
    draw();
  }
  // 흘러가기: targets[i] = {x,y} | null(그 자리). 차례로 출발(stagger), 1.2~1.6초 안에 모두 도착, 내 점은 마지막
  function move(targets, { duration = 1250, stagger = 360, mineDelay = null, bend = 0.22, alpha = null, onDone: cb = null } = {}) {
    if (reduceMotion) { place(targets, alpha); if (cb) cb(); return; }
    const now = performance.now();
    targets.forEach((p, i) => {
      if (!p) return;
      const d = dots[i], isMine = i === mine, dx = p.x - d.x, dy = p.y - d.y, L = Math.hypot(dx, dy) || 1;
      const a1 = alpha == null ? null : typeof alpha === 'function' ? alpha(i) : alpha;
      d.a1 = a1; d.anim = { x0: d.x, y0: d.y, x1: p.x, y1: p.y, a0: d.a, nx: -dy / L, ny: dx / L, bend: (rnd() - 0.5) * 2 * bend * Math.min(L, 160),
        t0: now + (isMine ? (mineDelay == null ? stagger + duration * 0.25 : mineDelay) : rnd() * stagger), dur: duration * (isMine ? 0.9 : 0.78 + rnd() * 0.3) };
    });
    onDone = cb; kick();
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; running = false; onDone = null; dots.forEach((d) => { if (d.anim) { d.x = d.anim.x1; d.y = d.anim.y1; d.anim = null; } if (d.a1 !== null) { d.a = d.a1; d.a1 = null; } }); }
  function clear() { stop(); dots.forEach((d) => { d.x = -40; d.y = -40; }); draw(); }
  return { dots, mine, n, rnd, resize, draw, place, move, stop, clear, get busy() { return running; }, get size() { return { w: W, h: H }; } };
}
