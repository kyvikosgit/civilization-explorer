// 관람 시뮬레이션(11/23) — 4층 3D(tour.js)를 1인칭으로 걸으며, 구역마다 세운 QR POP 을 찍으면 화면 아래 휴대폰(실제 웹앱 app.it-ta.com)이
// 그 구역 화면을 연다. 휴대폰 자세: 걷기 = 아래에 들고 · 도슨트 = 살짝 기울여 내림 · 미션(체험) = 들어 올려 크게.
// 앱은 액자 안에서 지금 화면(주소 · 단계)을 postMessage({type:'m100-app', path, s}) 로 알린다(kippu-app src/app/_layout.tsx SimBeacon).
import * as THREE from 'three';
import { createTour } from './tour.js?v=37';

const APP = (new URLSearchParams(location.search).get('app') || 'https://app.it-ta.com').replace(/\/$/, '');
// 4층 동선 = 앱 구역 순서(kippu-app src/lib/tour.ts STOPS). 자리는 Blender 평면 좌표(x, y) — 3D 에서는 (x, −y)
//   at: POP 세울 자리(가까운 빈 칸으로 맞춤) · face: POP 앞면이 향하는 평면 방향(관람객이 다가오는 쪽)
const STOPS = [
  { id: 'entrance', name: '프롤로그', sub: '접수 및 안내', at: [6.6, -5.2], face: [0, -1] },
  { id: 'salon', name: '아카데미 살롱', sub: '미션 · 올해의 그림', at: [7.75, -2.55], face: [0, -1] },
  { id: 'society', name: '시민사회', sub: '미션 · 바티뇰파 전단지', at: [1.75, -3.05], face: [0.45, -1] },
  { id: 'industry', name: '사업가의 사무실', sub: '미션 · 노르망디행 기차표', at: [-2.65, -3.05], face: [0.45, -1] },
  { id: 'atelier', name: '화가의 아틀리에', sub: '미션 · 튜브 물감', at: [-5.5, -3.05], face: [0.45, -1] },
  { id: 'nadar', name: '나다르 사진관', sub: '나의 초상 사진', at: [-11.1, -3.05], face: [0.45, -1] },
  { id: 'monet', name: '인상파 전시회', sub: '미션 · 〈인상, 해돋이〉', at: [-21.0, -2.45], face: [1, -0.25] },
];
const START = { x: 6.6, y: -8.2, yaw: 0 };   // 리셉션 · 서쪽 복도에서 북쪽(프롤로그 POP)을 보며 시작

const $ = (s) => document.querySelector(s);
const stage = $('#sim-stage'), plan = $('#sim-plan svg'), phone = $('#phone'), frame = $('#phone iframe'), prompt = $('#prompt');
const list = $('#steps'), toast = $('#toast');

const T = createTour({ stage, plan, onZone: () => {} });
// 휴대폰 배율: 들고 걷기 = 화면 높이 40% · 도슨트 = 34% · 들어 올림 = 88%
const sizePhone = () => { const h = innerHeight; for (const [k, f] of [['hold', 0.40], ['doc', 0.34], ['up', 0.88]]) phone.style.setProperty('--s-' + k, (h * f / 844).toFixed(4)); };
addEventListener('resize', sizePhone); sizePhone();
stage.classList.add('is-full');

// ---- 휴대폰 자세 ----
let pose = 'hold', manualUp = false;
function setPose(p) {
  pose = p; const up = p === 'mission' || manualUp;
  phone.dataset.pose = up ? 'up' : p;
  stage.classList.toggle('modal-open', up);   // 들어 올렸을 때는 3D 걷기 멈춤(tour.js paused)
  document.body.classList.toggle('phone-up', up);
  $('#hud-pose').textContent = up ? (p === 'mission' ? '미션 중 — 휴대폰을 들어 봅니다' : '휴대폰을 들어 보는 중') : p === 'doc' ? '도슨트 듣는 중 — 걸으며 둘러보세요' : '';
}
addEventListener('message', (e) => {
  const d = e.data; if (!d || d.type !== 'm100-app') return;
  const path = String(d.path || '');
  if (path.startsWith('/exp/')) setPose('mission');
  else if (path.startsWith('/stop/')) setPose(d.s === 'exp' ? 'hold' : 'doc');
  else setPose('hold');
  if (pose !== 'mission' && manualUp) { manualUp = false; setPose(pose); }
});
const openApp = (path) => { frame.src = APP + path; };

// ---- QR POP ----
const qrTex = (stop, i) => {
  const W = 512, H = 724, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#111111'; g.fillRect(0, 0, W, 92);
  g.fillStyle = '#FFFFFF'; g.font = '700 34px Paperlogy, sans-serif'; g.textAlign = 'center'; g.fillText('MONET 100', W / 2, 60);
  g.fillStyle = '#D9672F'; g.font = '700 26px Freesentation, sans-serif'; g.fillText(`4F · ${String(i + 1).padStart(2, '0')}`, W / 2, 140);
  g.fillStyle = '#111111'; g.font = '800 46px Paperlogy, sans-serif'; g.fillText(stop.name, W / 2, 196);
  const q = window.qrcode(0, 'M'); q.addData(`https://it-ta.com/z/${stop.id}`); q.make();
  const n = q.getModuleCount(), S = 330, cell = S / n, x0 = (W - S) / 2, y0 = 232;
  g.fillStyle = '#111111';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(x0 + c * cell, y0 + r * cell, cell + 0.6, cell + 0.6);
  g.fillStyle = '#5F5F58'; g.font = '600 26px Freesentation, sans-serif'; g.fillText('잇다 앱으로 QR을 찍어 주세요', W / 2, 620);
  g.font = '500 22px Freesentation, sans-serif'; g.fillText('오디오 도슨트 · 미션', W / 2, 660);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
const pops = [];
let ring, marker;
function addPops() {
  const metal = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.45, metalness: 0.6 });
  const back = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
  STOPS.forEach((st, i) => {
    // 빈 칸 찾기(벽·가구와 겹치지 않게) — 처음 자리에서 가까운 순
    let x = st.at[0], z = -st.at[1];
    if (!T.cellFree(x, z)) {
      let best = null;
      for (let r = 0.1; r <= 0.9 && !best; r += 0.1) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, xx = x + Math.cos(a) * r, zz = z + Math.sin(a) * r; if (T.cellFree(xx, zz)) { best = [xx, zz]; break; } }
      if (best) [x, z] = best;
    }
    const fx = st.face[0], fz = -st.face[1], fl = Math.hypot(fx, fz), nx = fx / fl, nz = fz / fl;
    const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = Math.atan2(nx, nz);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.025, 32), metal); base.position.y = 0.0125;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.02, 12), metal); pole.position.y = 0.535;
    const face = new THREE.MeshStandardMaterial({ map: qrTex(st, i), roughness: 0.55, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0 });
    face.emissiveMap = face.map; face.emissiveIntensity = 0.32;   // 어두운 모네 방에서도 읽히게 살짝 빛나게
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.48, 0.014), [back, back, back, back, face, back]);
    board.position.set(0, 1.22, 0); board.rotation.x = -0.2;
    grp.add(base, pole, board); T.scene.add(grp); T.block(x, z, 0.2);
    pops.push({ ...st, i, x, z, nx, nz, grp, done: false });
  });
  ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 48), new THREE.MeshBasicMaterial({ color: 0xE2733D, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; T.scene.add(ring);
  marker = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 4), new THREE.MeshBasicMaterial({ color: 0xE2733D })); marker.rotation.x = Math.PI; T.scene.add(marker);
}
let cur = 0;   // 다음에 찍을 POP
const nextPop = () => pops[cur];
function placeGuide() {
  const p = nextPop(); ring.visible = marker.visible = !!p; if (!p) return;
  ring.position.set(p.x + p.nx * 0.95, 0.012, p.z + p.nz * 0.95);
}
function renderList() {
  list.innerHTML = pops.map((p, i) => `<li class="${p.done ? 'done' : ''}${i === cur ? ' cur' : ''}"><b>${String(i + 1).padStart(2, '0')}</b><span>${p.name}<small>${p.sub}</small></span></li>`).join('') +
    '<li class="note"><b>→</b><span>미디어 전시 · 3층<small>3D 모델은 4층까지</small></span></li>';
}

// ---- 가까운 POP · 찍기 ----
let near = null;
function checkNear() {
  const c = T.camera; if (!c || !pops.length) return;
  const dir = new THREE.Vector3(); c.getWorldDirection(dir);
  let best = null;
  for (const p of pops) {
    const dx = p.x - c.position.x, dz = p.z - c.position.z, d = Math.hypot(dx, dz);
    if (d > 2.2) continue;
    const facing = (dx * dir.x + dz * dir.z) / (d || 1);
    if (facing < 0.55) continue;
    if (!best || d < best.d) best = { p, d };
  }
  const n = best?.p ?? null;
  if (n !== near) { near = n; prompt.hidden = !n; if (n) prompt.querySelector('span').textContent = `${n.name} QR 찍기`; }
}
function scan(p = near) {
  if (!p) return;
  phone.classList.remove('scan'); void phone.offsetWidth; phone.classList.add('scan');
  showToast(`QR 인식 · ${p.name}`);
  p.done = true; if (p.i >= cur) cur = p.i + 1;
  manualUp = false; openApp(`/stop/${p.id}?a=1`); setPose('doc');
  renderList(); placeGuide(); T.redraw();
}
let toastT = 0;
function showToast(t) { toast.textContent = t; toast.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toast.hidden = true; }, 1800); }

// 다음 구역까지 걸어가기(길 찾기는 tour.js travelTo)
async function walkNext() {
  const p = nextPop(); if (!p || !T.ready) return;
  if (pose === 'mission' || manualUp) { manualUp = false; setPose('hold'); }
  // POP 앞 1.7 m(복도가 좁으면 빈 칸이 나올 때까지 당기고 옆으로 비킴) — 판이 화면 가운데에 오게 살짝 내려다봄
  let sx = p.x + p.nx * 1.2, sz = p.z + p.nz * 1.2;
  found: for (const d of [1.7, 1.5, 1.3, 1.1]) for (const side of [0, 0.4, -0.4, 0.8, -0.8]) {
    const x = p.x + p.nx * d + p.nz * side, z = p.z + p.nz * d - p.nx * side;
    let ok = true; for (let k = 0.4; k <= 1; k += 0.2) if (!T.cellFree(p.x + (x - p.x) * k, p.z + (z - p.z) * k)) ok = false;
    if (ok && T.cellFree(x, z)) { sx = x; sz = z; break found; }
  }
  await T.travelTo({ pos: new THREE.Vector3(sx, 1.6, sz), yaw: Math.atan2(sx - p.x, sz - p.z), pitch: -0.2 }, { maxWalk: 80 });
}

// ---- 입력 ----
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input,textarea')) return;
  if (e.code === 'KeyE' && near && !document.body.classList.contains('phone-up')) { e.preventDefault(); scan(); }
  else if (e.code === 'Space') { e.preventDefault(); if (pose === 'mission') return; manualUp = !manualUp; setPose(pose); }
  else if (e.code === 'KeyN' && !document.body.classList.contains('phone-up')) { e.preventDefault(); walkNext(); }
});
prompt.addEventListener('click', () => scan());
$('#btn-next').addEventListener('click', walkNext);
$('#btn-lift').addEventListener('click', () => { if (pose === 'mission') return; manualUp = !manualUp; setPose(pose); });
$('#phone-down').addEventListener('click', () => { manualUp = false; setPose(pose === 'mission' ? 'hold' : pose); if (pose === 'hold') openApp('/'); });

// ---- 시작 ----
$('#start').addEventListener('click', () => {
  $('#intro').hidden = true; document.body.classList.add('started');
  openApp('/'); setPose('hold');
});
T.loaded?.then(() => {
  addPops(); renderList(); placeGuide();
  T.camera.position.set(START.x, 1.6, -START.y); T.V.yaw = T.V.yawT = START.yaw; T.V.pitch = T.V.pitchT = 0; T.redraw();
  $('#start').disabled = false; $('#start').textContent = '시뮬레이션 시작';
  T.onMove = () => checkNear();
  const t0 = performance.now();
  const loop = () => {
    requestAnimationFrame(loop);
    const t = (performance.now() - t0) / 1000, p = nextPop();
    if (p && marker) { const c = T.camera.position; marker.visible = Math.hypot(c.x - p.x, c.z - p.z) > 2.8; marker.position.set(p.x, 2.05 + Math.sin(t * 3) * 0.06, p.z); marker.rotation.y = t * 1.5; ring.material.opacity = 0.45 + 0.35 * (0.5 + 0.5 * Math.sin(t * 4)); T.redraw(); }
    checkNear();
  };
  loop();
});
if (/[?&]debug\b/.test(location.search)) window.__sim = { T, pops, scan, walkNext, setPose };
