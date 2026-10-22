// C0 아카데미 살롱 — 올해의 메달 한 점
//   1 역할 → 2 후보작 뷰어(한 점씩 3D 금박 액자. 끌면 돌아가고 관성·되돌아옴, 두 손가락으로 붓질까지 확대, 옆으로 밀면 다음 후보)
//   → "이 그림에 메달"(또는 그림 길게 누르기) → 액자에 금빛 테두리 + 메달이 아래 테두리에 내려앉음 → 확인 → 3 오늘의 심사위원단(다섯 액자가 한 줄로 물러나고 아래에 점) → 4 카드
//   후보작·문구: 보드 experience-v2.html C0-A, 앱 missions.ts 'salon'. 비율·인원은 예시 수치. 제목은 고른 뒤에만.
//   three.js 0.147 (부스 모리스 칼럼 뷰어와 같은 CDN·버전). 텍스처 ≤1400px, 픽셀 비율 ≤2, 움직임이 없으면 그리지 않는다.
import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { $, $$, icons, sheet, toast, sleep, reduceMotion, showScreen, haptic, saveChoice } from './js/proto-common.js';
import { createCrowd, dotsFor, split, packRect, scatter, targetsFor, stampLine } from './js/crowd.js';

const WORKS = [
  { n: 1, src: '../works/c0-cambyses.jpg',   hd: 'img/c0-cambyses.jpg',   w: 960,  h: 695,  title: '펠루시움의 캄비세스 왕', artist: '폴 마리 르누아르',   year: '1872', coll: '',               shown: '1873년 살롱 출품 · 미확인(Commons 설명만)' },
  { n: 2, src: '../works/c0-cartridges.jpg', hd: 'img/c0-cartridges.jpg', w: 1280, h: 832,  title: '마지막 탄약통',          artist: '알퐁스 드 뇌빌',     year: '1873', coll: '바제유 마지막 탄약통의 집', shown: '1873년 살롱 출품' },
  { n: 3, src: '../works/c0-vision.jpg',     hd: 'img/c0-vision.jpg',     w: 1400, h: 1169, title: '환상, 14세기 전설',      artist: '뤽 올리비에 메르송', year: '1872', coll: '릴 미술관',        shown: '1873년 살롱 출품 · 2차 자료만' },
  { n: 4, src: '../works/c0-spring.jpg',     hd: 'img/c0-spring.jpg',     w: 827,  h: 1400, title: '봄날',                  artist: '피에르 오귀스트 코트', year: '1873', coll: '메트로폴리탄',     shown: '1873년 살롱 출품' },
  { n: 5, src: '../works/c0-bonbock.jpg',    hd: 'img/c0-bonbock.jpg',    w: 1234, h: 1400, title: '르 봉 보크',            artist: '에두아르 마네',       year: '1873', coll: '필라델피아 미술관', shown: '1873년 살롱 출품 · 카바넬 〈클레오파트라〉(1887) 대신' },
];
const TODAY = { 1: 9, 2: 27, 3: 18, 4: 39, 5: 7 };   // 예시 수치
const JURY = '1,284';
const TOP = +Object.keys(TODAY).sort((a, b) => TODAY[b] - TODAY[a])[0];

// 메달 — 금 원반, 월계관 두 가지, 가운데 연도. 이모지 없음. id 는 그라데이션 충돌을 피하려고 자리마다 다르게
function medalSVG(id, year = true, vb = '0 0 100 100') {
  const leaves = [];
  for (let i = 0; i < 9; i++) {
    for (const deg of [100 + i * 12.5, 80 - i * 12.5]) {
      const a = deg * Math.PI / 180, cx = 50 + Math.cos(a) * 31, cy = 55 + Math.sin(a) * 31;
      leaves.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="3.1" ry="6" transform="rotate(${deg.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})" fill="#7A5412" stroke="#F3DB8E" stroke-width=".7"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" aria-hidden="true">
    <defs>
      <radialGradient id="${id}g" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="#FFF4C4"/><stop offset=".42" stop-color="#E6BE55"/><stop offset=".8" stop-color="#A67A1E"/><stop offset="1" stop-color="#6E4A0E"/></radialGradient>
      <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1B8"/><stop offset="1" stop-color="#8A5E14"/></linearGradient>
    </defs>
    <path d="M44 2 h12 l-2 10 h-8 z" fill="#B3262E"/>
    <circle cx="50" cy="55" r="44" fill="url(#${id}g)" stroke="#5E3F0A" stroke-width="1.2"/>
    <circle cx="50" cy="55" r="39.5" fill="none" stroke="url(#${id}r)" stroke-width="1.6" opacity=".9"/>
    <circle cx="50" cy="55" r="36.5" fill="none" stroke="#6E4A0E" stroke-width=".8" opacity=".7"/>
    ${leaves.join('')}
    ${year ? '<text x="50" y="52" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" font-weight="700" font-size="9" letter-spacing="1.5" fill="#5E3F0A">SALON</text><text x="50" y="68" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" font-weight="700" font-size="15" letter-spacing="1" fill="#4A3008">1873</text>' : ''}
  </svg>`;
}

icons();

// ── 1 역할: 후보작 띠 — 누르면 그 그림부터 뷰어로
if (window.innerHeight >= 780) $('.crit').open = true;
$('#candStrip').innerHTML = WORKS.map((w, i) => `<button type="button" aria-label="${w.n}번 후보작 · 심사로" data-i="${i}"><b>${w.n}</b><span class="cf"><span class="mat"><img src="${w.src}" alt="" draggable="false"></span></span></button>`).join('');
$$('#candStrip button').forEach((b) => b.addEventListener('click', () => enterViewer(+b.dataset.i)));

$('#cfMedal').innerHTML = medalSVG('c');
$('#cardMedal').innerHTML = medalSVG('k');
$('#awardMedal').innerHTML = medalSVG('a', false);

// ═════════════════════════════ 3D 뷰어 ═════════════════════════════
const stage = $('#stage'), cv = $('#gl'), dock = $('#dock'), qEl = $('#q'), gest = $('#gest'), zoomtag = $('#zoomtag'), award = $('#award'), tagsEl = $('#tags');
const DPR = Math.min(2, window.devicePixelRatio || 1);
let renderer;
try {
  renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
} catch (e) { toast('이 기기에서는 3D 보기를 열 수 없습니다'); throw e; }
renderer.setPixelRatio(DPR);
renderer.outputEncoding = T.sRGBEncoding;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
const scene = new T.Scene();
scene.background = new T.Color(0x2A1012);
const pmrem = new T.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const FOV = 30, D = 6;
const camera = new T.PerspectiveCamera(FOV, 1, 0.1, 40);
camera.position.set(0, 0, D);
const ANISO = Math.min(4, renderer.capabilities.getMaxAnisotropy());

// 조명 — 부드러운 키 라이트(왼쪽 위), 금박 위를 지나가는 반사광(손가락·도착 때 움직임), 벽의 빛 웅덩이
scene.add(new T.HemisphereLight(0xFFF1DE, 0x2A1210, 0.18));
const key = new T.DirectionalLight(0xFFE7C6, 1.15); key.position.set(-2.2, 3.2, 5); scene.add(key);
const spec = new T.PointLight(0xFFF2D6, 0.9, 0, 0); spec.position.set(1.6, 1.4, 3.2); scene.add(spec);

// 텍스처 도우미
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = ANISO; return t;
}
// 금박 결 — 거친 정도 + 요철 (몰딩 방향의 잔결과 얼룩)
const giltNoise = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { const v = 90 + Math.random() * 110 | 0; g.fillStyle = `rgba(${v},${v},${v},.35)`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 6, 1 + Math.random() * 1.5); }
  for (let i = 0; i < 40; i++) { const v = Math.random() < 0.5 ? 40 : 200; g.fillStyle = `rgba(${v},${v},${v},.10)`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 6 + Math.random() * 22, 0, 6.3); g.fill(); }
}, false);
giltNoise.wrapS = giltNoise.wrapT = T.RepeatWrapping; giltNoise.repeat.set(5, 5);
// 살롱 벽 — 적갈색 다마스크 (experience/img/r_C0_a.jpg 전시실5 렌더의 재료)
const damask = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#722E2F'; g.fillRect(0, 0, w, h);   // 단색 — 타일 이음매가 보이지 않게
  const m = new Path2D('M32 4c6 8 12 12 24 14-12 2-18 6-24 14-6-8-12-12-24-14 12-2 18-6 24-14z'), c1 = new Path2D('M0 36c6 8 12 12 24 14M64 36c-6 8-12 12-24 14');
  g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 1.2;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.save(); g.translate(x * 64, y * 64); g.stroke(m); g.stroke(c1); g.beginPath(); g.arc(32, 18, 3, 0, 6.3); g.stroke(); g.beginPath(); g.arc(32, 50, 2, 0, 6.3); g.stroke(); g.restore(); }
});
damask.wrapS = damask.wrapT = T.RepeatWrapping; damask.repeat.set(30, 15);
const wall = new T.Mesh(new T.PlaneGeometry(60, 30), new T.MeshBasicMaterial({ map: damask, color: 0x8C7470, toneMapped: false }));
wall.position.z = -2.6; scene.add(wall);
// 벽의 빛 웅덩이 — 가운데 액자 뒤 (화면에 고정, 액자만 지나간다)
const poolTex = canvasTex(256, 256, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,200,150,.42)'); gr.addColorStop(0.5, 'rgba(255,190,140,.16)'); gr.addColorStop(1, 'rgba(255,190,140,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
const pool = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
pool.position.z = -2.55; scene.add(pool);

// 금박 액자 — 캔버스 가장자리에서 바깥으로: 안쪽 턱(sight edge) · 오목 몰딩(cove) · 구슬 줄 · 바깥 테두리(rim) · 뒤판
const M = 0.12;                      // 몰딩 폭 (그림 긴 변 = 1)
const GOLD = { lip: 0xD9A23C, cove: 0x8E6018, rim: 0xD69B36, bead: 0xF0C45A };
function ring(hw, hh, e0, e1, z0, z1, b, segs) {
  const o = [hw + e1 - b, hh + e1 - b], i = [hw + e0 + b, hh + e0 + b];
  const s = new T.Shape(); s.moveTo(-o[0], -o[1]); s.lineTo(o[0], -o[1]); s.lineTo(o[0], o[1]); s.lineTo(-o[0], o[1]); s.closePath();
  const h = new T.Path(); h.moveTo(-i[0], -i[1]); h.lineTo(-i[0], i[1]); h.lineTo(i[0], i[1]); h.lineTo(i[0], -i[1]); h.closePath(); s.holes.push(h);
  const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.002, z1 - z0 - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: segs, curveSegments: 1 });
  g.translate(0, 0, z0 + b);
  return g;
}
function gilt(color, rough) { return new T.MeshStandardMaterial({ color, metalness: 1, roughness: rough, roughnessMap: giltNoise, bumpMap: giltNoise, bumpScale: 0.0018, envMapIntensity: 0.62 }); }
const beadGeo = new T.SphereGeometry(1, 8, 6), boxBack = new T.MeshStandardMaterial({ color: 0x3A2616, roughness: 0.9, metalness: 0 });
const loader = new T.TextureLoader();

function buildFrame(w, i) {
  const a = w.w / w.h, pw = a >= 1 ? 1 : a, ph = a >= 1 ? 1 / a : 1, hw = pw / 2, hh = ph / 2;
  const g = new T.Group(); scene.add(g);
  const mats = { lip: gilt(GOLD.lip, 0.3), cove: gilt(GOLD.cove, 0.42), rim: gilt(GOLD.rim, 0.26), bead: gilt(GOLD.bead, 0.22) };
  g.add(new T.Mesh(ring(hw, hh, 0, 0.02, -0.01, 0.022, 0.006, 3), mats.lip));
  g.add(new T.Mesh(ring(hw, hh, 0.016, 0.086, -0.02, 0.05, 0.02, 5), mats.cove));
  g.add(new T.Mesh(ring(hw, hh, 0.08, M, -0.07, 0.075, 0.012, 3), mats.rim));
  // 구슬 줄 — cove 와 rim 사이
  const beadE = 0.081, bx = hw + beadE, by = hh + beadE, step = 0.019, pts = [];
  for (let x = -bx; x <= bx; x += step) { pts.push([x, by]); pts.push([x, -by]); }
  for (let y = -by + step; y < by - step / 2; y += step) { pts.push([bx, y]); pts.push([-bx, y]); }
  const beads = new T.InstancedMesh(beadGeo, mats.bead, pts.length), mx = new T.Matrix4();
  pts.forEach(([x, y], k) => { mx.makeScale(0.0068, 0.0068, 0.0052); mx.setPosition(x, y, 0.058); beads.setMatrixAt(k, mx); });
  g.add(beads);
  // 뒤판(옆에서 돌려 보면 보이는 두께와 뒷면)
  const back = new T.Mesh(new T.BoxGeometry(pw + 2 * M - 0.01, ph + 2 * M - 0.01, 0.03), boxBack); back.position.z = -0.06; g.add(back);
  // 캔버스 — 턱보다 안으로 들어간 면. 바니시 광택(clearcoat)
  const paint = new T.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0.62, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 0.12, toneMapped: false });
  const canvasMesh = new T.Mesh(new T.PlaneGeometry(pw, ph), paint); canvasMesh.position.z = -0.006; g.add(canvasMesh);
  loader.load(w.hd, (t) => { t.encoding = T.sRGBEncoding; t.anisotropy = ANISO; paint.map = t; paint.needsUpdate = true; kick(); });
  // 턱이 캔버스에 드리운 그림자(왼쪽 위 빛)
  const aoW = 256, aoH = Math.round(256 * ph / pw);
  const ao = canvasTex(aoW, aoH, (c, W2, H2) => {
    c.shadowColor = 'rgba(0,0,0,.78)'; c.shadowBlur = 12; c.shadowOffsetX = 3; c.shadowOffsetY = 5; c.fillStyle = '#000';
    c.beginPath(); c.rect(-60, -60, W2 + 120, H2 + 120); c.rect(0, 0, W2, H2); c.fill('evenodd');
  });
  const aoMesh = new T.Mesh(new T.PlaneGeometry(pw, ph), new T.MeshBasicMaterial({ map: ao, transparent: true, depthWrite: false, toneMapped: false }));
  aoMesh.position.z = -0.005; g.add(aoMesh);
  // 번호판 — 금색 판에 번호
  const plateTex = canvasTex(256, 96, (c, W2, H2) => {
    const gr = c.createLinearGradient(0, 0, 0, H2); gr.addColorStop(0, '#F4DB92'); gr.addColorStop(0.5, '#C9A14A'); gr.addColorStop(1, '#8E6A26'); c.fillStyle = gr; c.fillRect(0, 0, W2, H2);
    c.strokeStyle = 'rgba(70,45,8,.6)'; c.lineWidth = 4; c.strokeRect(8, 8, W2 - 16, H2 - 16);
    c.fillStyle = '#3E2A08'; c.font = '700 62px Georgia, "Times New Roman", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(w.n), W2 / 2, H2 / 2 + 3);
    c.fillStyle = 'rgba(60,40,8,.7)'; [[22, H2 / 2], [W2 - 22, H2 / 2]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 5, 0, 6.3); c.fill(); });
  });
  const brass = new T.MeshStandardMaterial({ color: 0xC9A04A, metalness: 1, roughness: 0.35 }), plateFace = new T.MeshStandardMaterial({ map: plateTex, metalness: 0.75, roughness: 0.38 });
  const plate = new T.Mesh(new T.BoxGeometry(0.17, 0.064, 0.012), [brass, brass, brass, brass, plateFace, brass]);
  plate.position.set(0, -hh - M - 0.075, -0.05); g.add(plate);
  // 고른 그림의 금빛 테두리 빛 — 액자 뒤의 부드러운 후광
  const glowTex = canvasTex(256, Math.round(256 * (ph + 2 * M + 0.5) / (pw + 2 * M + 0.5)), (c, W2, H2) => {
    const pad = 46; c.shadowColor = 'rgba(255,214,130,1)'; c.shadowBlur = 34; c.fillStyle = 'rgba(255,214,130,1)';
    c.fillRect(pad, pad, W2 - pad * 2, H2 - pad * 2); c.shadowBlur = 0; c.globalCompositeOperation = 'destination-out'; c.fillRect(pad + 6, pad + 6, W2 - pad * 2 - 12, H2 - pad * 2 - 12);
  });
  const glow = new T.Mesh(new T.PlaneGeometry(pw + 2 * M + 0.5, ph + 2 * M + 0.5), new T.MeshBasicMaterial({ map: glowTex, color: 0xFFD486, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
  glow.position.z = -0.08; g.add(glow);
  return { w, i, g, pw, ph, ow: pw + 2 * M, oh: ph + 2 * M, mats, paint, plate, plateFace, glow, glowV: 0, glowT: 0, sC: 1, row: null, k: -1 };
}
const frames = WORKS.map(buildFrame);

// 메달 — 원반 + 앞면 그림(월계관·SALON 1873). 고른 액자의 아래 테두리에 내려앉는다
const medal = new T.Group();
const MR = 0.075, MT = 0.014;
const medalRim = new T.MeshStandardMaterial({ color: 0xD9B055, metalness: 1, roughness: 0.28 });
const disc = new T.Mesh(new T.CylinderGeometry(MR, MR, MT, 48, 1, true), medalRim); disc.rotation.x = Math.PI / 2; medal.add(disc);
const faceMat = new T.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.55, roughness: 0.34 });
const face = new T.Mesh(new T.CircleGeometry(MR, 48), faceMat); face.position.z = MT / 2; medal.add(face);
const backFace = new T.Mesh(new T.CircleGeometry(MR, 48), medalRim); backFace.position.z = -MT / 2; backFace.rotation.y = Math.PI; medal.add(backFace);
(() => {
  const img = new Image();
  img.onload = () => { faceMat.map = canvasTex(256, 256, (c) => c.drawImage(img, 0, 0, 256, 256)); faceMat.needsUpdate = true; kick(); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(medalSVG('g', true, '6 11 88 88'));
})();
medal.visible = false;
const MED = { t0: 0, dir: 0, f: null, done: false };   // dir 1 = 내려앉는 중/앉음, -1 = 떠나는 중

// ── 상태
let W = 1, H = 1, wpp = 0.01, visW = 1, visH = 1, cyW = 0, spacingPx = 300;
let idx = 0, pos = 0, posV = 0, posT = 0;
let yaw = 0, pitch = 0, yawV = 0, pitchV = 0;
let zoom = 1, zoomT = 1, panX = 0, panY = 0, panXT = 0, panYT = 0;
let mode = 'pick';                         // pick | placed | reveal
let chosen = null;
let rv = 0, rvT = 0, rvFrom = 0, rvT0 = 0; // 결과 모드로의 전환(액자들이 한 줄로)
let glintT0 = -1e9, specX = 1.6, specXT = 1.6;
const X = [0, 0, 0, 0, 0];                 // 회전목마의 액자 중심(월드 x)
const LIM = 35 * Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outBack = (t, s = 1.5) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);

function layout() {
  const r = stage.getBoundingClientRect();
  W = r.width || 1; H = r.height || 1;
  renderer.setSize(W, H, false);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  visH = 2 * D * Math.tan(FOV / 2 * Math.PI / 180); wpp = visH / H; visW = visH * W / H;
  const top = qEl.getBoundingClientRect().bottom - r.top + 8, bottom = dock.getBoundingClientRect().top - r.top - 6;
  const cyPx = (top + bottom) / 2;
  cyW = -(cyPx - H / 2) * wpp;
  frames.forEach((f) => { f.sC = Math.min((W * 0.74 * wpp) / f.ow, ((bottom - top) * 0.84 * wpp) / (f.oh + 0.2)); });
  // 이웃은 뒤로 물러나 안쪽을 향한다 — 화면 가장자리에 조금 보이도록 간격을 잡는다
  const back = reduceMotion ? 1 : (D + 1) / D;
  for (let i = 1; i < 5; i++) X[i] = X[i - 1] + ((frames[i - 1].ow * frames[i - 1].sC + frames[i].ow * frames[i].sC) / 2 * 0.86 + visW * 0.05) * back;
  spacingPx = (X[1] - X[0]) / wpp / back;
  pool.position.y = cyW; pool.scale.set(visW * 1.5, visH * 0.62, 1);
  if (mode === 'reveal') rowLayout();
  apply(); renderer.render(scene, camera);
}
const Xat = (p) => { const i0 = clamp(Math.floor(p), 0, 3), t = p - i0; return lerp(X[i0], X[i0 + 1], t); };

// 결과: 다섯 액자가 한 줄로(옛 벽처럼). 결과 패널 위 남은 높이의 가운데에
let row = null;
function rowLayout() {
  const areaH = H - $('#reveal').offsetHeight;
  const pad = 10, gap = 6, fw = Math.floor((W - pad * 2 - gap * 4) / 5);
  const fh = frames.map((f) => fw * f.oh / f.ow), maxFh = Math.max(...fh);
  const BAND = areaH < 420 ? 34 : 44;
  const lineY = Math.max(areaH * 0.42, 62 + 34 + maxFh / 2 + 6);
  row = { fw, maxFh, BAND, lineY, items: frames.map((f, i) => ({ x: pad + fw / 2 + i * (fw + gap), y: lineY, fh: fh[i] })) };
  frames.forEach((f, i) => { const it = row.items[i]; f.row = { x: (it.x - W / 2) * wpp, y: -(it.y - H / 2) * wpp, s: fw * wpp / f.ow }; });
}

function dim(f, k) {
  if (Math.abs(f.k - k) < 0.004) return; f.k = k;
  f.mats.lip.color.setHex(GOLD.lip).multiplyScalar(k); f.mats.cove.color.setHex(GOLD.cove).multiplyScalar(k);
  f.mats.rim.color.setHex(GOLD.rim).multiplyScalar(k); f.mats.bead.color.setHex(GOLD.bead).multiplyScalar(k);
  for (const m of Object.values(f.mats)) m.envMapIntensity = 0.62 * k;
  f.paint.color.setScalar(k); f.plateFace.color.setScalar(k);
}

function apply() {
  const par = reduceMotion ? 0 : 1, t = eio(rv), Xp = Xat(pos);
  frames.forEach((f, i) => {
    const d = i - pos, ad = Math.min(Math.abs(d), 1.6), act = Math.max(0, 1 - Math.abs(d));
    const cx = X[i] - Xp, cy = cyW + 0.07 * f.sC, cz = -ad * par, ry = -clamp(d, -1, 1) * 0.42 * par;
    const r = f.row || { x: cx, y: cy, s: f.sC };
    f.g.visible = t > 0.01 || Math.abs(d) < 2.2;
    f.g.position.set(lerp(cx, r.x, t), lerp(cy, r.y, t), lerp(cz, 0, t));
    f.g.rotation.set(lerp(pitch * act, 0, t), lerp(ry + yaw * act, 0, t), 0);
    f.g.scale.setScalar(lerp(f.sC, r.s, t));
    dim(f, lerp(1 - 0.6 * Math.min(Math.abs(d), 1), 1, t));
    f.plate.visible = t < 0.5;
    f.glow.material.opacity = f.glowV * 0.75;
    f.mats.rim.emissive.setRGB(0.32, 0.22, 0.05).multiplyScalar(f.glowV * 0.5);
  });
  wall.position.set(-Xp * 0.22 * par * (1 - t), cyW, -2.6);
  pool.material.opacity = 1 - t * 0.6;
  if (MED.f && MED.dir === 1 && MED.done) medal.scale.setScalar(1 + t * 0.9);   // 결과의 작은 액자에서도 메달이 보이게
  camera.zoom = zoom; camera.position.set(panX, panY, D); camera.updateProjectionMatrix();
  spec.position.x = specX;
  // 확대 표시
  const z = zoom > 1.04 && mode === 'pick';
  zoomtag.classList.toggle('on', z); stage.classList.toggle('zoomed', z);
  if (z) $('#zoomv').textContent = zoom.toFixed(1) + '×';
}

// ── 렌더 루프 — 움직이는 것이 있을 때만
let raf = 0, last = 0;
function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
function tick(now) {
  raf = 0;
  const dt = Math.min(0.034, Math.max(0.001, (now - last) / 1000)); last = now;
  const busy = step(dt, now);
  apply(); renderer.render(scene, camera);
  if (busy) raf = requestAnimationFrame(tick);
}
function spring(x, v, target, k, c, dt) { const a = k * (target - x) - c * v; v += a * dt; x += v * dt; return [x, v]; }
function step(dt, now) {
  let busy = !!g;
  // 회전: 손을 떼면 관성으로 더 돌다가 제자리로 (모션 줄이기: 관성 없이 바로 돌아옴)
  if (!g || g.type !== 'one' || g.mode !== 'rotate') {
    const K = 70, C = reduceMotion ? 2 * Math.sqrt(K) : 7.5;
    [yaw, yawV] = spring(yaw, yawV, 0, K, C, dt); [pitch, pitchV] = spring(pitch, pitchV, 0, K, C, dt);
    if (Math.abs(yaw) > LIM) { yaw = Math.sign(yaw) * LIM; yawV *= -0.3; }
    if (Math.abs(pitch) > LIM) { pitch = Math.sign(pitch) * LIM; pitchV *= -0.3; }
    if (Math.abs(yaw) + Math.abs(pitch) + Math.abs(yawV) + Math.abs(pitchV) > 0.0006) busy = true; else { yaw = pitch = yawV = pitchV = 0; }
  }
  // 회전목마
  if (!g || !g.slide) {
    if (reduceMotion) { pos = posT; posV = 0; } else [pos, posV] = spring(pos, posV, posT, 120, 2 * Math.sqrt(120) * 0.92, dt);
    if (Math.abs(pos - posT) + Math.abs(posV) > 0.0005) busy = true; else { pos = posT; posV = 0; }
  }
  // 확대·이동 (두 번 탭·메달·결과로 돌아갈 때)
  if (!g || g.type !== 'pinch') {
    const e = 1 - Math.exp(-dt * 11);
    zoom += (zoomT - zoom) * e; panX += (panXT - panX) * e; panY += (panYT - panY) * e;
    if (Math.abs(zoom - zoomT) + Math.abs(panX - panXT) + Math.abs(panY - panYT) > 0.0004) busy = true; else { zoom = zoomT; panX = panXT; panY = panYT; }
  }
  // 금빛 테두리
  frames.forEach((f) => { const e = 1 - Math.exp(-dt * 6); f.glowV += (f.glowT - f.glowV) * e; if (Math.abs(f.glowT - f.glowV) > 0.003) busy = true; else f.glowV = f.glowT; });
  // 반사광: 도착하면 금박 위를 한 번 쓸고 지나간다 · 끄는 동안엔 손가락을 따라간다
  const gt = (now - glintT0) / 1300;
  if (gt >= 0 && gt < 1) { specX = lerp(-3.4, 1.6, eio(gt)); busy = true; }
  else { const e = 1 - Math.exp(-dt * 8); specX += (specXT - specX) * e; if (Math.abs(specX - specXT) > 0.004) busy = true; }
  // 메달
  if (MED.dir) busy = stepMedal(now) || busy;
  // 결과 전환
  if (rv !== rvT) { const p = clamp((now - rvT0) / (reduceMotion ? 1 : 950), 0, 1); rv = lerp(rvFrom, rvT, p); if (p >= 1) rv = rvT; busy = true; }
  return busy;
}

function stepMedal(now) {
  const f = MED.f; if (!f) return false;
  const yEnd = -(f.ph / 2 + M * 0.55), zEnd = 0.088;
  if (MED.dir > 0) {
    const p = clamp((now - MED.t0) / (reduceMotion ? 1 : 820), 0, 1);
    const e = outBack(p, 1.25);
    medal.position.set(0, lerp(yEnd + 0.55, yEnd, e), lerp(0.9, zEnd, Math.min(1, p * 1.25)));
    medal.rotation.set(lerp(-0.6, 0, p), (1 - eio(p)) * Math.PI * 2, lerp(0.5, -0.12, eio(p)));
    medal.scale.setScalar(lerp(1.5, 1, eio(p)));
    MED.done = p >= 1;
    return p < 1;
  }
  const p = clamp((now - MED.t0) / (reduceMotion ? 1 : 320), 0, 1);
  medal.position.set(0, yEnd + p * 0.25, zEnd + p * 0.4); medal.scale.setScalar(Math.max(0.001, 1 - p));
  if (p >= 1) { medal.visible = false; f.g.remove(medal); MED.dir = 0; MED.f = null; return false; }
  return true;
}

// ── 몸짓: 끌기(회전, 끝까지 끌면 옆 그림으로) · 튕기기(다음) · 집기(확대) · 확대 중 끌기(이동) · 두 번 탭(원래대로) · 길게 누르기(메달)
const pointers = new Map();
let g = null, lastTap = { t: 0, x: 0, y: 0 }, pressT = 0;
const rect = () => cv.getBoundingClientRect();
const ptOf = (e) => { const r = rect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
const KPX = LIM / 110;                     // 110px 끌면 한계 근처
function clampPan() {
  const f = frames[idx], s = f.sC, hw = f.ow * s / 2, hh = (f.oh + 0.2) * s / 2, cy = cyW + 0.07 * s, q = 1 - 1 / zoom;
  panX = clamp(panX, -hw * q, hw * q); panY = clamp(panY, cy * q - hh * q, cy * q + hh * q);
  panXT = panX; panYT = panY;
}
function hitPainting(p) {
  const ray = new T.Raycaster(), v = new T.Vector2((p.x / W) * 2 - 1, -(p.y / H) * 2 + 1);
  ray.setFromCamera(v, camera);
  return ray.intersectObject(frames[idx].g, true).length > 0;
}
function hideGest() { gest.classList.add('off'); }

cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('pointerdown', (e) => {
  if (mode !== 'pick') return;
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
  const p = ptOf(e); pointers.set(e.pointerId, p);
  clearTimeout(pressT);
  if (pointers.size === 1) {
    g = { type: 'one', id: e.pointerId, x0: p.x, y0: p.y, lx: p.x, ly: p.y, t0: performance.now(), moved: false, mode: zoom > 1.04 ? 'pan' : 'rotate', slide: false, over: 0, samples: [{ t: performance.now(), x: p.x, y: p.y }], yaw0: yaw, pitch0: pitch, consumed: false };
    yawV = pitchV = 0;
    if (zoom <= 1.04) pressT = setTimeout(() => {
      if (g && g.type === 'one' && !g.moved && pointers.size === 1 && mode === 'pick' && hitPainting({ x: g.x0, y: g.y0 })) { g.consumed = true; placeMedal(); }
    }, 520);
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()], mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (g && g.slide) { posT = idx; }
    g = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: zoom, wx: panX + (mid.x - W / 2) * wpp / zoom, wy: panY - (mid.y - H / 2) * wpp / zoom };
    hideGest();
  }
  kick();
});
cv.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId) || !g) return;
  const p = ptOf(e); pointers.set(e.pointerId, p);
  if (g.type === 'pinch' && pointers.size >= 2) {
    const [a, b] = [...pointers.values()], mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    zoom = clamp(g.z0 * Math.hypot(a.x - b.x, a.y - b.y) / g.d0, 1, 3); zoomT = zoom;
    panX = g.wx - (mid.x - W / 2) * wpp / zoom; panY = g.wy + (mid.y - H / 2) * wpp / zoom;
    clampPan();
    kick(); return;
  }
  if (g.type !== 'one' || e.pointerId !== g.id) return;
  const dx = p.x - g.x0, dy = p.y - g.y0, now = performance.now();
  if (!g.moved && Math.hypot(dx, dy) > 7) { g.moved = true; clearTimeout(pressT); hideGest(); }
  g.samples.push({ t: now, x: p.x, y: p.y }); while (g.samples.length > 2 && now - g.samples[0].t > 100) g.samples.shift();
  if (g.mode === 'pan') {
    panX -= (p.x - g.lx) * wpp / zoom; panY += (p.y - g.ly) * wpp / zoom; clampPan();
  } else if (g.moved) {
    // 돌리기 — ±35° 안에서 부드럽게 막힌다. 가로로 더 끌면 그만큼 회전목마가 따라온다
    yaw = LIM * Math.tanh((g.yaw0 + dx * KPX) / LIM);
    pitch = LIM * Math.tanh((g.pitch0 + dy * KPX) / LIM);
    const over = Math.abs(dx) > 120 && Math.abs(dx) > Math.abs(dy) ? (Math.abs(dx) - 120) * Math.sign(dx) : 0;
    g.over = over;
    if (over && !reduceMotion) {
      g.slide = true;
      let pp = idx - over / spacingPx;
      if (pp < 0) pp = -0.25 * (1 - Math.exp(pp * 2)); if (pp > 4) pp = 4 + 0.25 * (1 - Math.exp(-(pp - 4) * 2));
      pos = pp; posV = 0;
    } else if (g.slide) { g.slide = false; }
    specXT = clamp((p.x / W - 0.5) * 5, -3, 3);
  }
  g.lx = p.x; g.ly = p.y;
  kick();
});
function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  clearTimeout(pressT);
  if (!g) return;
  if (g.type === 'pinch') {
    if (pointers.size === 1) { const [id, p] = [...pointers.entries()][0]; g = { type: 'one', id, x0: p.x, y0: p.y, lx: p.x, ly: p.y, t0: performance.now(), moved: true, mode: zoom > 1.04 ? 'pan' : 'rotate', slide: false, over: 0, samples: [{ t: performance.now(), x: p.x, y: p.y }], yaw0: yaw, pitch0: pitch, consumed: true }; }
    else g = null;
    if (zoom < 1.06) { zoomT = 1; panXT = 0; panYT = 0; }
    kick(); return;
  }
  if (e.pointerId !== g.id) return;
  const a = g; g = null;
  specXT = 1.6;
  if (a.consumed) { kick(); return; }
  const now = performance.now(), dx = a.lx - a.x0, dy = a.ly - a.y0;
  if (!a.moved && now - a.t0 < 500 && e.type === 'pointerup') {
    // 두 번 탭 → 원래대로 / 가장자리 탭 → 옆 그림
    if (a.t0 - lastTap.t < 450 && Math.hypot(a.x0 - lastTap.x, a.y0 - lastTap.y) < 40) { resetView(); lastTap.t = 0; kick(); return; }
    lastTap = { t: now, x: a.x0, y: a.y0 };
    if (zoom <= 1.04) { if (a.x0 < W * 0.13) go(idx - 1); else if (a.x0 > W * 0.87) go(idx + 1); }
    kick(); return;
  }
  if (a.mode === 'rotate') {
    const s0 = a.samples[0], s1 = a.samples[a.samples.length - 1], dtm = Math.max(16, s1.t - s0.t);
    const vx = (s1.x - s0.x) / dtm, vy = (s1.y - s0.y) / dtm;   // px/ms
    const flick = Math.abs(vx) > 0.5 && Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.2;
    if (Math.abs(a.over) > W * 0.14 || flick) go(idx - Math.sign(dx));
    else posT = idx;
    if (!reduceMotion) { yawV = clamp(vx * 1000 * KPX, -7, 7); pitchV = clamp(vy * 1000 * KPX, -7, 7); }
  }
  kick();
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);

function resetView() { zoomT = 1; panXT = 0; panYT = 0; yawV = pitchV = 0; }
function go(i) {
  const n = clamp(i, 0, 4);
  if (n !== idx) { idx = n; haptic(8); if (!reduceMotion) glintT0 = performance.now() + 120; updateIdx(); }
  posT = idx; resetView(); kick();
}
function updateIdx() {
  $('#idx').textContent = `${idx + 1} / 5`;
  $$('#pips i').forEach((p, k) => p.classList.toggle('on', k === idx));
  $('#prev').disabled = idx === 0; $('#next').disabled = idx === 4;
}
$('#pips').innerHTML = WORKS.map(() => '<i></i>').join('');
$('#prev').addEventListener('click', () => go(idx - 1));
$('#next').addEventListener('click', () => go(idx + 1));

// ── 메달 → 확인
const confirm = sheet($('#confirm'));
async function placeMedal() {
  if (mode !== 'pick') return;
  mode = 'placed'; chosen = frames[idx];
  hideGest(); dock.classList.add('busy');
  resetView(); posT = idx;
  chosen.glowT = 1;
  if (MED.f && MED.f !== chosen) MED.f.g.remove(medal);
  chosen.g.add(medal); medal.visible = true; MED.f = chosen; MED.dir = 1; MED.t0 = performance.now() + (reduceMotion ? 0 : 160);
  haptic(24); kick();
  $('#cfImg').src = chosen.w.src; $('#cfNo').textContent = `${chosen.w.n}번`;
  await sleep(reduceMotion ? 150 : 1050);
  if (mode === 'placed') confirm.open();
}
function unplace() {
  confirm.close();
  if (mode !== 'placed') return;
  chosen.glowT = 0; MED.dir = -1; MED.t0 = performance.now();
  chosen = null; mode = 'pick'; dock.classList.remove('busy');
  kick();
}
award.addEventListener('click', placeMedal);
$('#cfBack').addEventListener('click', unplace);
$$('.sheet-dim').forEach((d) => d.addEventListener('click', () => { if (mode === 'placed') unplace(); }));
$('#cfOk').addEventListener('click', () => { confirm.close(); reveal(); });

// ── 3 오늘의 심사위원단: 다섯 액자가 한 줄로 물러나고, 심사위원(점 하나 = 열 사람)이 메달을 준 액자 아래로 모인다. 내 점은 주황, 맨 마지막에
const tagEls = frames.map((f) => {
  const num = document.createElement('div'); num.className = 'rownum'; num.textContent = f.w.n; tagsEl.appendChild(num);
  const tag = document.createElement('div'); tag.className = 'tag'; tagsEl.appendChild(tag);
  const today = document.createElement('div'); today.className = 'today'; today.innerHTML = `<i>${medalSVG('t' + f.w.n, false)}</i>오늘의 메달`; tagsEl.appendChild(today);
  return { num, tag, today };
});
function placeTags() {
  frames.forEach((f, i) => {
    const it = row.items[i], t = tagEls[i];
    t.num.style.transform = `translate(${it.x.toFixed(1)}px, ${(it.y - it.fh / 2 - 14).toFixed(1)}px) translate(-50%, -50%)`;
    t.tag.style.transform = `translate(${it.x.toFixed(1)}px, ${(it.y + it.fh / 2 + row.BAND + 18).toFixed(1)}px) translate(-50%, -50%)`;
    t.today.style.transform = `translate(${it.x.toFixed(1)}px, ${(it.y + it.fh / 2 + row.BAND + 42).toFixed(1)}px) translate(-50%, -50%)`;
  });
}
let crowd = null;
function crowdTargets() {
  const counts = split(crowd.n, frames.map((f) => TODAY[f.w.n]));
  const groups = frames.map((f, i) => { const it = row.items[i]; return { pts: packRect(counts[i], { x: it.x - row.fw / 2 + 2, y: it.y + it.fh / 2 + 10, w: row.fw - 4, h: row.BAND - 6 }, crowd.rnd, 7) }; });
  return targetsFor(crowd, groups, frames.indexOf(chosen));
}
function setRv(target) { rvFrom = rv; rvT = target; rvT0 = performance.now(); kick(); }
async function reveal() {
  mode = 'reveal';
  const me = chosen, mineTop = me.w.n === TOP;
  stage.classList.add('is-reveal');
  $('#wallTitle').textContent = '오늘의 심사위원단';
  $('#revTitle').textContent = mineTop ? `내가 메달을 준 ${me.w.n}번이 오늘의 메달` : `내가 메달을 준 ${me.w.n}번 · 오늘의 메달은 ${TOP}번`;
  $('#revFig').innerHTML = `<div class="crowd-big">${TODAY[me.w.n]}<i>%</i></div><div class="crowd-lab">${me.w.n}번 〈${me.w.title}〉 · 나<small>같은 그림에 메달을 준 심사위원</small></div>`;
  $('#revOthers').innerHTML = frames.filter((f) => f !== me).sort((a, b) => TODAY[b.w.n] - TODAY[a.w.n]).map((f) => `<span>${f.w.n}번 <b>${TODAY[f.w.n]}</b></span>`).join('');
  $('#revStamp').textContent = stampLine(JURY);
  frames.forEach((f, i) => { const t = tagEls[i]; t.tag.className = 'tag' + (f === me ? ' me' : ''); t.tag.innerHTML = `${TODAY[f.w.n]}%${f === me ? '<small>나</small>' : ''}`; t.num.classList.toggle('me', f === me); });
  $('#reveal').classList.add('on');
  zoomT = 1; panXT = 0; panYT = 0;
  await sleep(reduceMotion ? 50 : 380);
  rowLayout(); placeTags(); setRv(1);
  if (!crowd) crowd = createCrowd($('#crowdCv'), { theme: 'dark', n: dotsFor(JURY), reduceMotion, seed: 2 });
  crowd.resize();
  crowd.place(scatter(crowd.n, { x: 12, y: 70, w: W - 24, h: Math.max(60, row.lineY - row.maxFh / 2 - 90) }, crowd.rnd));
  const showNums = () => { tagEls.forEach((t) => t.tag.classList.add('show')); setTimeout(() => { tagEls[frames.indexOf(frames.find((f) => f.w.n === TOP))].today.classList.add('show'); haptic(16); }, reduceMotion ? 0 : 260); };
  setTimeout(() => { tagEls.forEach((t) => t.num.classList.add('show')); crowd.move(crowdTargets(), { duration: 1300, stagger: 420, onDone: showNums }); }, reduceMotion ? 0 : 900);
}
function clearReveal() {
  if (crowd) { crowd.stop(); crowd.clear(); }
  $('#reveal').classList.remove('on'); stage.classList.remove('is-reveal');
  tagEls.forEach((t) => { t.tag.classList.remove('show'); t.today.classList.remove('show'); t.num.classList.remove('show', 'me'); });
  $('#wallTitle').textContent = '후보작 심사';
}
$('#again').addEventListener('click', () => {
  clearReveal();
  if (chosen) { chosen.glowT = 0; MED.dir = -1; MED.t0 = performance.now(); }
  chosen = null; mode = 'pick'; dock.classList.remove('busy');
  setRv(0);
});

// ── 4 카드
$('#save').addEventListener('click', () => {
  const me = chosen;
  $('#cardImg').src = me.w.src;
  $('#cardPos').innerHTML = me.w.n === TOP ? `오늘 <b>${TODAY[me.w.n]}%</b> · 오늘의 메달` : `오늘 <b>${TODAY[me.w.n]}%</b> · 오늘의 메달은 ${TOP}번`;
  $('#cardNo').textContent = `후보작 ${me.w.n} · 내가 메달을 준 그림`;
  $('#cardTitle').textContent = `〈${me.w.title}〉`;
  $('#cardMeta').textContent = [me.w.artist, me.w.year, me.w.coll].filter(Boolean).join(' · ');
  $('#cardShown').textContent = me.w.shown;
  saveChoice('c0', { n: me.w.n, title: me.w.title, pct: TODAY[me.w.n] });   // 기기 안에만 · 출구 화면(exit.html)이 읽는다
  showScreen('s4');
  toast('수집함에 저장했습니다');
});

// ── 화면 흐름
function enterViewer(i = 0) {
  showScreen('s2');
  confirm.close(); clearReveal();
  frames.forEach((f) => { f.glowT = f.glowV = 0; });
  if (MED.f) { MED.f.g.remove(medal); MED.f = null; } medal.visible = false; MED.dir = 0;
  mode = 'pick'; chosen = null; dock.classList.remove('busy'); gest.classList.remove('off');
  rv = rvT = 0; zoom = zoomT = 1; panX = panY = panXT = panYT = 0; yaw = pitch = yawV = pitchV = 0;
  idx = clamp(i, 0, 4); posT = idx; updateIdx();
  layout();
  // 들어올 때: 오른쪽에서 미끄러져 들어오며 금박 위로 빛이 한 번 지나간다
  if (!reduceMotion) { pos = idx + 0.7; posV = 0; yaw = -0.35; glintT0 = performance.now() + 200; } else pos = idx;
  kick();
}
$('#enter').addEventListener('click', () => enterViewer(0));
$('#back2').addEventListener('click', () => { confirm.close(); showScreen('s1'); });
$('#back4').addEventListener('click', () => showScreen('s2'));
$('#restart').addEventListener('click', () => showScreen('s1'));
window.addEventListener('resize', () => {
  if (!$('#s2').classList.contains('on')) return;
  layout();
  if (mode === 'reveal' && row) { placeTags(); if (crowd) { crowd.stop(); crowd.resize(); crowd.place(crowdTargets()); } }
});

// 검수용
window.__c0 = {
  get idx() { return idx; }, get pos() { return pos; }, get mode() { return mode; }, get chosen() { return chosen ? chosen.w.n : null; }, get zoom() { return zoom; },
  go, place: placeMedal, reveal, enterViewer, get crowd() { return crowd; },
};
