// 11/24 관람 지도 — 리플렛 관람 지도를 옮긴 3D 지도(three.js 0.147). 끌어서 돌리고 · 두 손가락 확대 · 위에서 보기 · 구역 누르면 그 자리로
//   좌표 = map-data.js(리플렛 그림에서 뽑은 벽 · 동선 · 구역 · 시설, m). 평면 (x, y) → 3D (X = x − W/2, Z = y − D/2), Y 위
import * as T from 'three';
import { MAP } from './map-data.js';

const qs = new URLSearchParams(location.search);
const LANG = ['ko', 'en', 'ja', 'zh'].includes(qs.get('lang')) ? qs.get('lang') : 'ko';
const TXT = {
  ko: { hall1n: '제1관', hall1s: '이해하는 공간', hall2n: '제2관', hall2s: '체험하는 공간', top: '위에서 보기', d3: '입체로 보기', hint: '끌어서 돌리고, 두 손가락으로 확대해 보세요', reset: '처음 모양으로',
    z: { hall1: ['살롱', '변화의 복도', '인상파 전시회', '미디어 전시'], hall2: ['모네 연작', '지베르니', '건초더미', '감각의 계보'] },
    p: { entrance: '입구', exit: '출구', ticket: '티켓·안내', wc_f: '여자 화장실', wc_m: '남자 화장실', escalator: '에스컬레이터', elevator: '엘리베이터', stairs: '비상구', shop: '아트숍' } },
  en: { hall1n: 'Hall 1', hall1s: 'Space of Understanding', hall2n: 'Hall 2', hall2s: 'Space of Experience', top: 'Top view', d3: '3D view', hint: 'Drag to rotate, pinch to zoom', reset: 'Reset view',
    z: { hall1: ['Salon', 'Corridor of Change', 'Impressionist Exhibition', 'Media Exhibition'], hall2: ['Monet Series', 'Giverny', 'Haystacks', 'Lineage of Senses'] },
    p: { entrance: 'Entrance', exit: 'Exit', ticket: 'Tickets & Info', wc_f: 'Women', wc_m: 'Men', escalator: 'Escalator', elevator: 'Elevator', stairs: 'Emergency exit', shop: 'Art shop' } },
  ja: { hall1n: '第1館', hall1s: '理解する空間', hall2n: '第2館', hall2s: '体験する空間', top: '真上から', d3: '立体で見る', hint: 'ドラッグで回転、ピンチで拡大できます', reset: '元に戻す',
    z: { hall1: ['サロン', '変化の回廊', '印象派展', 'メディア展示'], hall2: ['モネの連作', 'ジヴェルニー', '積みわら', '感覚の系譜'] },
    p: { entrance: '入口', exit: '出口', ticket: 'チケット・案内', wc_f: '女性トイレ', wc_m: '男性トイレ', escalator: 'エスカレーター', elevator: 'エレベーター', stairs: '非常口', shop: 'アートショップ' } },
  zh: { hall1n: '第1馆', hall1s: '理解的空间', hall2n: '第2馆', hall2s: '体验的空间', top: '俯视', d3: '立体视图', hint: '拖动旋转，双指缩放', reset: '恢复视角',
    z: { hall1: ['沙龙', '变革长廊', '印象派画展', '媒体展'], hall2: ['莫奈系列', '吉维尼', '干草堆', '感知的谱系'] },
    p: { entrance: '入口', exit: '出口', ticket: '售票·咨询', wc_f: '女卫生间', wc_m: '男卫生间', escalator: '自动扶梯', elevator: '电梯', stairs: '安全出口', shop: '艺术商店' } },
}[LANG];
document.documentElement.lang = LANG;
document.querySelectorAll('[data-t]').forEach((el) => { if (TXT[el.dataset.t]) el.textContent = TXT[el.dataset.t]; });
document.getElementById('resetBtn').setAttribute('aria-label', TXT.reset);
const SHOT = qs.has('shot'); if (SHOT) document.body.classList.add('shot');
document.getElementById('backBtn').addEventListener('click', () => {   // 앱 안이면 앱 화면을 닫고, 웹이면 이전 페이지로
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'close' }));
  else if (window.parent !== window) window.parent.postMessage(JSON.stringify({ type: 'close' }), '*');
  else history.back();
});

// 시설 그림(리플렛의 회색 네모 아이콘을 단순화)
const ICON = {
  entrance: '<path d="M10 6l6 6-6 6M16 12H4M14 4h5a1 1 0 011 1v14a1 1 0 01-1 1h-5"/>',
  exit: '<path d="M14 6l-6 6 6 6M8 12h12M10 4H5a1 1 0 00-1 1v14a1 1 0 001 1h5"/>',
  ticket: '<path d="M4 7h16v3a2 2 0 000 4v3H4v-3a2 2 0 000-4z"/>',
  wc_f: '<circle cx="12" cy="5" r="2"/><path d="M12 8l-4 8h8zM10 16v4M14 16v4"/>',
  wc_m: '<circle cx="12" cy="5" r="2"/><path d="M9 9h6v6h-1v5h-4v-5H9z"/>',
  escalator: '<path d="M4 18h4l8-10h4M6 14l2-2"/>',
  elevator: '<path d="M5 3h14v18H5zM9 9l2-2 2 2M15 15l-2 2-2-2"/>',
  stairs: '<path d="M4 19h5v-4h4v-4h4V7h3"/>',
  shop: '<path d="M6 8h12l-1 12H7zM9 8a3 3 0 016 0"/>',
};

// ── 렌더러 · 장면
const cv = document.getElementById('cv'), labels = document.getElementById('labels');
T.ColorManagement.legacyMode = false;
const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.outputEncoding = T.sRGBEncoding;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene(); scene.background = new T.Color('#F2EFE7');
const cam = new T.PerspectiveCamera(32, 1, 1, 600);
scene.add(new T.HemisphereLight(0xffffff, 0xd9d3c4, 0.95));
const sun = new T.DirectionalLight(0xffffff, 0.7); sun.position.set(-24, 46, 30); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 30, bottom: -30, near: 1, far: 140 }); scene.add(sun);

const M = {
  slab: new T.MeshStandardMaterial({ color: '#FBFAF6', roughness: 0.95 }),
  slabSide: new T.MeshStandardMaterial({ color: '#DCD6C8', roughness: 0.95 }),
  wall: new T.MeshStandardMaterial({ color: '#EEEAE0', roughness: 0.9 }),
  outer: new T.MeshStandardMaterial({ color: '#E7E2D6', roughness: 0.9 }),
  cap: new T.MeshStandardMaterial({ color: '#9FAE9A', roughness: 0.8 }),
  desk: new T.MeshStandardMaterial({ color: '#CFC8B6', roughness: 0.8 }),
};
function stripeTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 16; const g = c.getContext('2d');
  g.fillStyle = '#C9C3B4'; g.fillRect(0, 0, 64, 16); g.fillStyle = '#AFA897'; for (let x = 0; x < 64; x += 8) g.fillRect(x, 0, 3, 16);
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; return t;
}
function chevronTex() {   // 동선 위를 흐르는 화살 무늬
  const c = document.createElement('canvas'); c.width = 128; c.height = 32; const g = c.getContext('2d');
  g.fillStyle = '#5E7D5F'; g.fillRect(0, 0, 128, 32);
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(52, 8); g.lineTo(68, 16); g.lineTo(52, 24); g.stroke();
  const t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
}
const CHEV = chevronTex();
const routeMat = new T.MeshBasicMaterial({ map: CHEV, side: T.DoubleSide });
const arrowMat = new T.MeshBasicMaterial({ color: '#5E7D5F', side: T.DoubleSide });

const halls = {};
function buildHall(key) {
  const d = MAP[key], g = new T.Group(), W = d.W, D = d.D;
  const X = (x) => x - W / 2, Z = (y) => y - D / 2;
  // 바닥판(두께) + 그림자 받는 바닥
  const slab = new T.Mesh(new T.BoxGeometry(W + 1.2, 0.5, D + 1.2), [M.slabSide, M.slabSide, M.slab, M.slabSide, M.slabSide, M.slabSide]);
  slab.position.y = -0.25; slab.receiveShadow = true; g.add(slab);
  const shadow = new T.Mesh(new T.PlaneGeometry(W * 3, D * 3), new T.ShadowMaterial({ opacity: 0.1 })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.52; shadow.receiveShadow = true; g.add(shadow);
  const wall = (x1, y1, x2, y2, h, t, mat) => {
    const L = Math.hypot(x2 - x1, y2 - y1); if (L < 0.05) return;
    const m = new T.Mesh(new T.BoxGeometry(L + t, h, t), mat); m.position.set(X((x1 + x2) / 2), h / 2, Z((y1 + y2) / 2));
    m.rotation.y = -Math.atan2(y2 - y1, x2 - x1); m.castShadow = true; m.receiveShadow = true; g.add(m);
    const c = new T.Mesh(new T.BoxGeometry(L + t, 0.05, t + 0.02), M.cap); c.position.set(m.position.x, h + 0.025, m.position.z); c.rotation.y = m.rotation.y; g.add(c);
  };
  // 바깥 벽(리플렛 테두리) · 안쪽 벽
  [[0, 0, W, 0], [W, 0, W, D], [W, D, 0, D], [0, D, 0, 0]].forEach(([a, b, c, e]) => wall(a, b, c, e, 1.7, 0.32, M.outer));
  d.walls.forEach(([a, b, c, e]) => wall(a, b, c, e, 1.35, 0.16, M.wall));
  // 낮은 덩어리(에스컬레이터 · 안내 데스크)
  d.boxes.forEach((b) => {
    const s = new T.Shape(b.pts.map(([x, y]) => new T.Vector2(X(x), -Z(y))));
    const geo = new T.ExtrudeGeometry(s, { depth: b.h, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
    let mat = M.desk;
    if (b.t === 'esc') { const tx = stripeTex(); tx.repeat.set(0.35, 0.35); mat = new T.MeshStandardMaterial({ map: tx, roughness: 0.9 }); }
    const m = new T.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; g.add(m);
  });
  // 구역 바닥 빛(옅은 초록 원)
  const glows = d.zones.map((z) => {
    const m = new T.Mesh(new T.CircleGeometry(3.4, 48), new T.MeshBasicMaterial({ color: '#7E9B7C', transparent: true, opacity: 0.16, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(X(z.p[0]), 0.015, Z(z.p[1])); g.add(m); return m;
  });
  // 동선: 리본(흐르는 화살 무늬) + 끝 화살촉
  d.routes.forEach((r) => {
    const pts = r.map(([x, y]) => new T.Vector3(X(x), 0.06, Z(y))), w = 0.5;
    const pos = [], uv = [], idx = []; let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], dir = b.clone().sub(a), L = dir.length(); dir.normalize();
      const n = new T.Vector3(-dir.z, 0, dir.x).multiplyScalar(w / 2), base = pos.length / 3;
      const a2 = a.clone().addScaledVector(dir, -w / 2 * (i > 0 ? 1 : 0)), b2 = b.clone().addScaledVector(dir, i < pts.length - 2 ? w / 2 : 0);
      [a2.clone().add(n), a2.clone().sub(n), b2.clone().add(n), b2.clone().sub(n)].forEach((p) => pos.push(p.x, p.y + i * 0.0005, p.z));
      const u0 = acc / 1.3, u1 = (acc + L) / 1.3; uv.push(u0, 1, u0, 0, u1, 1, u1, 0); acc += L;
      idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    g.add(new T.Mesh(geo, routeMat));
    const a = pts[pts.length - 2], b = pts[pts.length - 1], dir = b.clone().sub(a).normalize(), n = new T.Vector3(-dir.z, 0, dir.x);
    const tip = b.clone().addScaledVector(dir, 0.9), l = b.clone().addScaledVector(n, 0.65), rr = b.clone().addScaledVector(n, -0.65);
    const ag = new T.BufferGeometry(); ag.setAttribute('position', new T.Float32BufferAttribute([tip.x, 0.07, tip.z, l.x, 0.07, l.z, rr.x, 0.07, rr.z], 3));
    g.add(new T.Mesh(ag, arrowMat));
  });
  scene.add(g); g.visible = false;
  // 글자(구역 번호 · 시설) — HTML 을 3D 점에 붙인다
  const pins = d.zones.map((z, i) => {
    const el = document.createElement('div'); el.className = 'pin'; el.innerHTML = `<i>${z.n}</i><b>${TXT.z[key][i]}</b>`;
    labels.appendChild(el); return { el, v: new T.Vector3(X(z.p[0]), 2.4, Z(z.p[1])), n: z.n };
  });
  const pois = d.poi.map((p) => {
    const el = document.createElement('div'); el.className = 'poi';
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[p.t] || ''}</svg>${TXT.p[p.t] || ''}`;
    labels.appendChild(el); return { el, v: new T.Vector3(X(p.p[0]), 1.2, Z(p.p[1])) };
  });
  return { g, d, pins, pois, glows, W, D, zones: d.zones.map((z) => new T.Vector3(X(z.p[0]), 0, Z(z.p[1]))) };
}
halls.hall1 = buildHall('hall1'); halls.hall2 = buildHall('hall2');

// ── 카메라(구면 좌표) · 손가락 조작
const AZ0 = 1.12, PH0 = 0.72;   // 처음 각도 — 세로 화면에 꽉 차게 긴 쪽을 세움(입구 · 살롱이 위쪽)
const view = { tx: 0, tz: 0, r: 60, az: AZ0, ph: PH0 }, goal = { ...view };
let cur = null, active = -1, top = false;
// 관 전체가 머리(관 고르기)와 아래 구역 목록 사이에 꽉 차게 — 모서리 8점을 비춰 보며 거리 · 중심을 맞춘다
const tmp = new T.PerspectiveCamera(32, 1, 1, 600), pv = new T.Vector3();
function frameAt(h, az, ph, tx, tz, r) {
  tmp.aspect = innerWidth / innerHeight; tmp.updateProjectionMatrix();
  const sp = Math.sin(ph); tmp.position.set(tx + r * sp * Math.sin(az), r * Math.cos(ph), tz + r * sp * Math.cos(az));
  tmp.up.set(-Math.sin(az), 0, -Math.cos(az)).lerp(new T.Vector3(0, 1, 0), Math.min(1, ph * 4)).normalize(); tmp.lookAt(tx, 0, tz); tmp.updateMatrixWorld();
  let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
  for (const x of [-h.W / 2 - 0.6, h.W / 2 + 0.6]) for (const z of [-h.D / 2 - 0.6, h.D / 2 + 0.6]) for (const y of [-0.5, 1.7]) {
    pv.set(x, y, z).project(tmp); x0 = Math.min(x0, pv.x); x1 = Math.max(x1, pv.x); y0 = Math.min(y0, pv.y); y1 = Math.max(y1, pv.y);
  }
  return { x0, x1, y0, y1 };
}
function fitView(h, az, ph) {
  const H = innerHeight, topPx = SHOT ? 16 : (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-t')) || 0) + 132, botPx = SHOT ? 16 : 146;
  const yHi = 1 - 2 * topPx / H, yLo = -1 + 2 * botPx / H, xm = 1 - 2 * 12 / innerWidth, yC = (yHi + yLo) / 2;
  const R = [Math.cos(az), -Math.sin(az)], F = [-Math.sin(az), -Math.cos(az)];   // 땅 위 화면 오른쪽 · 화면 안쪽 방향
  let u = 0, w = 0, r = 80;
  const at = (uu, ww, rr) => frameAt(h, az, ph, uu * R[0] + ww * F[0], uu * R[1] + ww * F[1], rr);
  for (let it = 0; it < 3; it++) {
    let lo = 8, hi = 400;
    for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2, bb = at(u, w, m); if (bb.x1 - bb.x0 <= 2 * xm && bb.y1 - bb.y0 <= yHi - yLo) hi = m; else lo = m; }
    r = hi;
    // 가운데 맞춤: 화면 위 중심이 맞을 때까지 땅 위로 옮긴다(할선법)
    const solve = (get, set, goalV) => { let a0 = 0, a1 = h.W * 0.1, f0 = get(a0) - goalV, f1 = get(a1) - goalV;
      for (let k = 0; k < 8 && Math.abs(f1) > 1e-4 && f1 !== f0; k++) { const a2 = a1 - f1 * (a1 - a0) / (f1 - f0); a0 = a1; f0 = f1; a1 = a2; f1 = get(a1) - goalV; } set(a1); };
    const cx = (uu) => { const bb = at(u + uu, w, r); return (bb.x0 + bb.x1) / 2; }, cy = (ww) => { const bb = at(u, w + ww, r); return (bb.y0 + bb.y1) / 2; };
    solve(cx, (d) => (u += d), 0); solve(cy, (d) => (w += d), yC);
  }
  return { tx: u * R[0] + w * F[0], tz: u * R[1] + w * F[1], r };
}
let fitCache = {};
function fitR(h) { return (fitCache[(top ? 't' : 'd') + h.W] ||= fitView(h, AZ0, top ? 0.001 : PH0)).r; }
function home(animate = true) {
  const f = fitCache[(top ? 't' : 'd') + cur.W] ||= fitView(cur, AZ0, top ? 0.001 : PH0);
  Object.assign(goal, { tx: f.tx, tz: f.tz, r: f.r, az: AZ0, ph: top ? 0.001 : PH0 });
  if (!animate) Object.assign(view, goal);
}
function setHall(key, animate = true) {
  Object.values(halls).forEach((h) => { h.g.visible = false; h.pins.concat(h.pois).forEach((p) => (p.el.style.display = 'none')); });
  cur = halls[key]; cur.g.visible = true; cur.pins.concat(cur.pois).forEach((p) => (p.el.style.display = ''));
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.hall === key));
  active = -1; buildLegend(key); home(animate);
}
function focusZone(i) {
  active = active === i ? -1 : i;
  cur.pins.forEach((p, k) => { p.el.classList.toggle('on', k === active); p.el.classList.toggle('dim', active >= 0 && k !== active); });
  cur.glows.forEach((m, k) => (m.material.opacity = active < 0 ? 0.16 : k === active ? 0.36 : 0.08));
  document.querySelectorAll('.lg').forEach((b, k) => b.classList.toggle('on', k === active));
  if (active < 0) { home(); return; }
  const z = cur.zones[active]; Object.assign(goal, { tx: z.x, tz: z.z + 1, r: fitR(cur) * 0.55 });
}
function buildLegend(key) {
  const nav = document.getElementById('legend'); nav.innerHTML = '';
  TXT.z[key].forEach((name, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'lg'; b.innerHTML = `<i>${i + 1}</i><b>${name}</b>`;
    b.addEventListener('click', () => focusZone(i)); nav.appendChild(b);
  });
}
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setHall(b.dataset.hall)));
const viewBtn = document.getElementById('viewBtn');
function setTop(on) {
  top = on; viewBtn.setAttribute('aria-pressed', String(on)); viewBtn.querySelector('span').textContent = on ? TXT.d3 : TXT.top;
  goal.ph = on ? 0.001 : PH0; if (active < 0) home();
}
viewBtn.addEventListener('click', () => setTop(!top));
document.getElementById('resetBtn').addEventListener('click', () => { active = 0; focusZone(0); home(); });

// 손가락: 한 손가락 = 돌리기(좌우) · 기울이기(위아래), 두 손가락 = 확대 · 옮기기, 두 번 톡 = 처음 모양
const pts = new Map(); let last = null, pinch = null, tapT = 0, moved = false;
const hint = document.getElementById('hint'); const hideHint = () => hint.classList.add('off'); setTimeout(hideHint, 6000);
cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); last = { x: e.clientX, y: e.clientY }; moved = false; pinch = null; });
cv.addEventListener('pointermove', (e) => {
  if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pts.size === 1) {
    const dx = e.clientX - last.x, dy = e.clientY - last.y; last = { x: e.clientX, y: e.clientY };
    if (Math.abs(dx) + Math.abs(dy) > 2) { moved = true; hideHint(); }
    goal.az -= dx * 0.008; if (!top) goal.ph = T.MathUtils.clamp(goal.ph - dy * 0.006, 0.12, 1.25);
  } else if (pts.size === 2) {
    const [a, b] = [...pts.values()], dist = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (pinch) {
      goal.r = T.MathUtils.clamp(goal.r * pinch.d / dist, 12, fitR(cur) * 1.6);
      const k = goal.r / innerHeight * 0.9, dx = (mid.x - pinch.m.x) * k, dy = (mid.y - pinch.m.y) * k;
      const s = Math.sin(goal.az), c = Math.cos(goal.az);
      goal.tx = T.MathUtils.clamp(goal.tx - dx * c - dy * s * (top ? 1 : 1.3), -cur.W / 2, cur.W / 2);
      goal.tz = T.MathUtils.clamp(goal.tz + dx * s - dy * c * (top ? 1 : 1.3), -cur.D / 2, cur.D / 2);
    }
    pinch = { d: dist, m: mid }; moved = true; hideHint();
  }
});
const up = (e) => {
  pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
  if (!moved && pts.size === 0) { const now = performance.now(); if (now - tapT < 320) { active = 0; focusZone(0); home(); } tapT = now; }
  if (pts.size === 1) last = [...pts.values()][0];
};
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', (e) => { e.preventDefault(); goal.r = T.MathUtils.clamp(goal.r * Math.exp(e.deltaY * 0.0012), 12, fitR(cur) * 1.6); hideHint(); }, { passive: false });

// ── 그리기
function size() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize', () => { size(); fitCache = {}; if (cur && active < 0) home(); });
const v3 = new T.Vector3();
let prev = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
  const k = 1 - Math.pow(0.0015, dt);
  for (const key of ['tx', 'tz', 'r', 'az', 'ph']) view[key] += (goal[key] - view[key]) * k;
  const sp = Math.sin(view.ph);
  cam.position.set(view.tx + view.r * sp * Math.sin(view.az), view.r * Math.cos(view.ph), view.tz + view.r * sp * Math.cos(view.az));
  cam.up.set(-Math.sin(view.az), 0, -Math.cos(view.az)).lerp(new T.Vector3(0, 1, 0), Math.min(1, view.ph * 4)).normalize();   // 위에서 볼 때도 방향 유지
  cam.lookAt(view.tx, 0, view.tz);
  CHEV.offset.x -= dt * 0.55;
  renderer.render(scene, cam);
  // 글자 위치
  const W = innerWidth, H = innerHeight;
  const place = (p, isPoi) => {
    v3.copy(p.v).project(cam);
    const off = v3.z > 1 || Math.abs(v3.x) > 1.2 || Math.abs(v3.y) > 1.2;
    p.el.style.transform = `translate(${((v3.x + 1) / 2 * W).toFixed(1)}px, ${((1 - v3.y) / 2 * H).toFixed(1)}px) translate(${isPoi ? '-50%' : '-15px'}, -50%)`;
    p.el.style.visibility = off ? 'hidden' : 'visible';
    if (isPoi) p.el.classList.toggle('far', view.r > fitR(cur) * 0.78);   // 멀리서는 아이콘만
  };
  cur.pins.forEach((p) => place(p, false)); cur.pois.forEach((p) => place(p, true));
  requestAnimationFrame(frame);
}
size();
const hall0 = qs.get('hall') === '2' ? 'hall2' : 'hall1';
setHall(hall0, false);
const z0 = parseInt(qs.get('zone'), 10); if (z0 >= 1 && z0 <= 4) { focusZone(z0 - 1); Object.assign(view, goal); }
requestAnimationFrame(frame);
window.__mapReady = true;
