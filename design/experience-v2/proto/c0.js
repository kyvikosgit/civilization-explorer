// C0 아카데미 살롱 — 올해의 메달 한 점
//   한 장면(three.js) 안에서 모두 일어난다 — 화면 전환 없음.
//   입장: 어두운 대기실의 두 짝 문이 열리고 → 열린 문간을 지나(벽을 뚫지 않는다) 천창 아래 전시실을 눈높이로 걸어 들어가 → 후보작 벽 앞에 정면으로 선다.
//   벽: 적갈색 살롱 벽에 후보작 다섯 점(1 / 2 · 3 / 4 · 5, 위에서 아래로 번호 순), 둘레는 빽빽한 살롱 걸기. 역할 문장은 위에 얇게 겹친다.
//   누르면: 그 그림이 벽에서 떨어져 앞으로 나오고 카메라가 그 앞으로 미끄러진다(같은 장면). 나머지 방은 어두워진다. 끌면 돌아가고, 두 손가락으로 확대.
//   뒤로(또는 그림 바깥 누르기) → 그림이 제자리로 돌아가 걸리고 카메라가 벽 앞으로 물러난다. 다른 그림을 누른다.
//   "이 그림에 메달" → 확인 → 메달이 날아와 아래 테두리에 앉고 번호판이 이름판으로 뒤집힌다 → 그림이 벽으로 돌아가며 카메라가 물러나고
//   → 다섯 액자가 오늘의 비율만큼 커지고 작아지며(그 크기가 곧 그래프) 번호판 옆에서 숫자가 센다 → 아래에서 결과 패널.
//   카메라는 늘 정면(-z)을 본다. 높이는 렌즈 시프트(투영 행렬의 중심 이동)로 맞춘다 — 눈높이에 서서 큰 벽을 올려다봐도 세로선이 기울지 않는다.
//   후보작·문구: 보드 experience-v2.html C0-A, 앱 missions.ts 'salon'. 비율·인원은 예시 수치. 제목은 고른 뒤에만.
//   three.js 0.147. 텍스처 ≤1400px, 픽셀 비율 ≤2, 움직임이 없으면 그리지 않는다.
import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { $, $$, icons, sheet, toast, sleep, reduceMotion, haptic, saveChoice } from './js/proto-common.js';
import { buildSalon, HALL } from './c0-intro.js';

const WORKS = [
  { n: 1, src: '../works/c0-cambyses.jpg',   hd: 'img/c0-cambyses.jpg',   w: 960,  h: 695,  title: '펠루시움의 캄비세스 왕', artist: '폴 마리 르누아르',   year: '1872', coll: '',               shown: '' },
  { n: 2, src: '../works/c0-cartridges.jpg', hd: 'img/c0-cartridges.jpg', w: 1280, h: 832,  title: '마지막 탄약통',          artist: '알퐁스 드 뇌빌',     year: '1873', coll: '바제유 마지막 탄약통의 집', shown: '1873년 살롱 출품' },
  { n: 3, src: '../works/c0-vision.jpg',     hd: 'img/c0-vision.jpg',     w: 1400, h: 1169, title: '환상, 14세기 전설',      artist: '뤽 올리비에 메르송', year: '1872', coll: '릴 미술관',        shown: '' },
  { n: 4, src: '../works/c0-spring.jpg',     hd: 'img/c0-spring.jpg',     w: 827,  h: 1400, title: '봄날',                  artist: '피에르 오귀스트 코트', year: '1873', coll: '메트로폴리탄',     shown: '1873년 살롱 출품' },
  { n: 5, src: '../works/c0-bonbock.jpg',    hd: 'img/c0-bonbock.jpg',    w: 1234, h: 1400, title: '르 봉 보크',            artist: '에두아르 마네',       year: '1873', coll: '필라델피아 미술관', shown: '1873년 살롱 출품' },
];
// 벽에 거는 자리 — 위에서 아래로 번호 순: 1 / 2 · 3 / 4 · 5. 줄마다 그림(캔버스) 높이(m)
const ROWS = [[0], [1, 2], [3, 4]], ROW_H = [1.45, 1.15, 1.9], GAP_X = 0.36, GAP_Y = 0.58, HANG_BOTTOM = 1.36;
const TODAY = { 1: 9, 2: 27, 3: 18, 4: 39, 5: 7 };   // 예시 수치
const JURY = '1,284';
const TOP = +Object.keys(TODAY).sort((a, b) => TODAY[b] - TODAY[a])[0];
const stampLine = (total, at = new Date()) => `오늘 ${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')} 기준 · ${total}명 · 수치는 예시`;

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
$('#cardMedal').innerHTML = medalSVG('k');
$('#awardMedal').innerHTML = medalSVG('a', false);
// 역할 문장은 한 글자씩 타이핑된다 — 글자마다 span(자리는 처음부터 잡혀 있어 줄바꿈이 흔들리지 않는다)
(() => {
  const h1 = $('.role h1'); let k = 0;
  h1.innerHTML = h1.innerHTML.split(/(<br>)/).map((part) => (part === '<br>' ? part : [...part].map((ch) => (ch === ' ' ? ' ' : `<span class="ch" style="--k:${k++}">${ch}</span>`)).join(''))).join('');
})();
function roleIn() { document.body.classList.remove('intro-pending', 'role-in'); void document.body.offsetWidth; document.body.classList.add('role-in'); }
function screenOn(id, on) { const el = $('#' + id); el.classList.toggle('on', on); return el; }
// 누름 반응 — 단추를 누르면 빛이 한 번 쓸고 지나간다(크기 줄어듦은 CSS :active)
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.btn, .icon-btn'); if (!b || reduceMotion) return;
  b.classList.remove('shine'); void b.offsetWidth; b.classList.add('shine');
}, { passive: true });
document.addEventListener('animationend', (e) => { if (e.animationName === 'shine') e.target.classList.remove('shine'); });
const critSheet = sheet($('#crit'));
$('#critBtn').addEventListener('click', () => critSheet.open());

// ═════════════════════════════ 장면 ═════════════════════════════
const stage = $('#stage'), cv = $('#gl'), dock = $('#dock'), gest = $('#gest'), award = $('#award'), tagsEl = $('#tags'), roleEl = $('#role');
const setMode = (m) => { mode = m; stage.dataset.mode = m; };
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
scene.background = new T.Color(0x0b0605);
const pmrem = new T.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const FOV = 56, TAN = Math.tan(FOV / 2 * Math.PI / 180);
const camera = new T.PerspectiveCamera(FOV, 1, 0.08, 80);
const ANISO = Math.min(4, renderer.capabilities.getMaxAnisotropy());

// 빛 — 천창의 낮빛(위·앞에서), 왼쪽 앞의 부드러운 키 라이트(금박의 결), 금박 위를 지나가는 반사광
scene.add(new T.HemisphereLight(0xFFF3E2, 0x3A1A12, 0.62));
const sky = new T.DirectionalLight(0xFFF1DC, 0.7); sky.position.set(0, 10, 6); scene.add(sky);
const key = new T.DirectionalLight(0xFFE7C6, 0.45); key.position.set(-3, 4, 8); scene.add(key);
const spec = new T.PointLight(0xFFF2D6, 0.9, 9, 1.2); spec.position.set(1.6, 6, 4); scene.add(spec);

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
// 결과 줄을 쓸고 지나가는 빛 — 세로로 긴 부드러운 빛줄기
const barTex = canvasTex(128, 256, (c, w, h) => {
  const gx = c.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(255,236,200,0)'); gx.addColorStop(0.5, 'rgba(255,240,214,1)'); gx.addColorStop(1, 'rgba(255,236,200,0)');
  c.fillStyle = gx; c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'destination-in'; const gy = c.createLinearGradient(0, 0, 0, h); gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.3, 'rgba(0,0,0,1)'); gy.addColorStop(0.7, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gy; c.fillRect(0, 0, w, h);
});
const bar = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: barTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: T.AdditiveBlending, toneMapped: false }));
bar.rotation.z = -0.18; bar.renderOrder = 20; bar.visible = false; scene.add(bar);
// 메달이 닿는 순간의 반짝임 — 네 갈래 별빛 + 둥근 번짐
const starTex = canvasTex(256, 256, (c, w) => {
  c.translate(w / 2, w / 2);
  const rg = c.createRadialGradient(0, 0, 0, 0, 0, w / 2); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.08, 'rgba(255,244,210,.9)'); rg.addColorStop(0.3, 'rgba(255,214,130,.18)'); rg.addColorStop(1, 'rgba(255,200,120,0)');
  c.fillStyle = rg; c.fillRect(-w / 2, -w / 2, w, w);
  for (const a of [0, Math.PI / 2]) { c.save(); c.rotate(a); const lg = c.createLinearGradient(-w / 2, 0, w / 2, 0); lg.addColorStop(0, 'rgba(255,240,200,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,1)'); lg.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = lg; c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(0, -3.5); c.lineTo(w / 2, 0); c.lineTo(0, 3.5); c.closePath(); c.fill(); c.restore(); }
});
const glint = new T.Sprite(new T.SpriteMaterial({ map: starTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: T.AdditiveBlending, toneMapped: false }));
glint.renderOrder = 30; glint.visible = false; scene.add(glint);
// 후보작 뒤 벽의 빛 웅덩이 — 갤러리 조명
const poolTex = canvasTex(256, 256, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,214,170,.5)'); gr.addColorStop(0.45, 'rgba(255,196,150,.2)'); gr.addColorStop(1, 'rgba(255,190,140,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });

// 금박 액자 — 캔버스 가장자리에서 바깥으로: 안쪽 턱(sight edge) · 오목 몰딩(cove) · 구슬 줄 · 바깥 테두리(rim) · 뒤판. 그림 긴 변 = 1 (로컬 단위)
const M = 0.07;
const GOLD = { lip: 0xD9A23C, cove: 0x8E6018, rim: 0xD69B36, bead: 0xF0C45A };
function ring(hw, hh, e0, e1, z0, z1, b, segs) {
  const o = [hw + e1 - b, hh + e1 - b], i = [hw + e0 + b, hh + e0 + b];
  const s = new T.Shape(); s.moveTo(-o[0], -o[1]); s.lineTo(o[0], -o[1]); s.lineTo(o[0], o[1]); s.lineTo(-o[0], o[1]); s.closePath();
  const h = new T.Path(); h.moveTo(-i[0], -i[1]); h.lineTo(-i[0], i[1]); h.lineTo(i[0], i[1]); h.lineTo(i[0], -i[1]); h.closePath(); s.holes.push(h);
  const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.002, z1 - z0 - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: segs, curveSegments: 1 });
  g.translate(0, 0, z0 + b);
  return g;
}
function giltMat(color, rough) { return new T.MeshStandardMaterial({ color, metalness: 1, roughness: rough, roughnessMap: giltNoise, bumpMap: giltNoise, bumpScale: 0.0018, envMapIntensity: 0.62 }); }
const beadGeo = new T.SphereGeometry(1, 8, 6), boxBack = new T.MeshStandardMaterial({ color: 0x3A2616, roughness: 0.9, metalness: 0 });
const loader = new T.TextureLoader();
const unitPlane = new T.PlaneGeometry(1, 1), OL_COLOR = new T.Color(0xD9672F).convertSRGBToLinear();
const PLATE_K = 2.6, PLATE_DROP = 0.24;    // 번호판: 어느 액자든 벽에서 같은 크기(0.52m), 액자 아래 0.24m
const texLoads = [];
function setOutline(f, th) {
  const hw = f.pw / 2, hh = f.ph / 2, [t, b, l, r] = f.ol.children;
  t.scale.set(f.pw, th, 1); t.position.set(0, hh - th / 2, 0);
  b.scale.set(f.pw, th, 1); b.position.set(0, -hh + th / 2, 0);
  l.scale.set(th, f.ph - th * 2, 1); l.position.set(-hw + th / 2, 0, 0);
  r.scale.set(th, f.ph - th * 2, 1); r.position.set(hw - th / 2, 0, 0);
}
function buildFrame(w, i) {
  const a = w.w / w.h, pw = a >= 1 ? 1 : a, ph = a >= 1 ? 1 / a : 1, hw = pw / 2, hh = ph / 2;
  const g = new T.Group(); scene.add(g);
  const mats = { lip: giltMat(GOLD.lip, 0.3), cove: giltMat(GOLD.cove, 0.42), rim: giltMat(GOLD.rim, 0.26), bead: giltMat(GOLD.bead, 0.22) };
  g.add(new T.Mesh(ring(hw, hh, 0, 0.012, -0.01, 0.02, 0.0035, 3), mats.lip));
  g.add(new T.Mesh(ring(hw, hh, 0.009, 0.05, -0.02, 0.042, 0.012, 5), mats.cove));
  g.add(new T.Mesh(ring(hw, hh, 0.047, M, -0.06, 0.06, 0.007, 3), mats.rim));
  const beadE = 0.0475, bx = hw + beadE, by = hh + beadE, step = 0.012, pts = [];
  for (let x = -bx; x <= bx; x += step) { pts.push([x, by]); pts.push([x, -by]); }
  for (let y = -by + step; y < by - step / 2; y += step) { pts.push([bx, y]); pts.push([-bx, y]); }
  const beads = new T.InstancedMesh(beadGeo, mats.bead, pts.length), mx = new T.Matrix4();
  pts.forEach(([x, y], k) => { mx.makeScale(0.0042, 0.0042, 0.0034); mx.setPosition(x, y, 0.046); beads.setMatrixAt(k, mx); });
  g.add(beads);
  const back = new T.Mesh(new T.BoxGeometry(pw + 2 * M - 0.01, ph + 2 * M - 0.01, 0.03), boxBack); back.position.z = -0.06; g.add(back);
  // 캔버스 — 턱보다 안으로 들어간 면. 바니시 광택(clearcoat)
  const paint = new T.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0.62, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 0.12, toneMapped: false });
  const canvasMesh = new T.Mesh(new T.PlaneGeometry(pw, ph), paint); canvasMesh.position.z = -0.006; g.add(canvasMesh);
  texLoads.push(new Promise((res) => loader.load(w.hd, (t) => { t.encoding = T.sRGBEncoding; t.anisotropy = ANISO; paint.map = t; paint.needsUpdate = true; kick(); res(); }, undefined, res)));
  const aoW = 256, aoH = Math.round(256 * ph / pw);
  const ao = canvasTex(aoW, aoH, (c, W2, H2) => {
    c.shadowColor = 'rgba(0,0,0,.78)'; c.shadowBlur = 12; c.shadowOffsetX = 3; c.shadowOffsetY = 5; c.fillStyle = '#000';
    c.beginPath(); c.rect(-60, -60, W2 + 120, H2 + 120); c.rect(0, 0, W2, H2); c.fill('evenodd');
  });
  const aoMesh = new T.Mesh(new T.PlaneGeometry(pw, ph), new T.MeshBasicMaterial({ map: ao, transparent: true, depthWrite: false, toneMapped: false }));
  aoMesh.position.z = -0.005; g.add(aoMesh);
  // 번호판 — 놋쇠 판에 번호
  const plateTex = canvasTex(256, 96, (c, W2, H2) => {
    const gr = c.createLinearGradient(0, 0, 0, H2); gr.addColorStop(0, '#F4DB92'); gr.addColorStop(0.5, '#C9A14A'); gr.addColorStop(1, '#8E6A26'); c.fillStyle = gr; c.fillRect(0, 0, W2, H2);
    c.strokeStyle = 'rgba(70,45,8,.55)'; c.lineWidth = 3; c.strokeRect(7, 7, W2 - 14, H2 - 14);
    c.fillStyle = '#2E1F05'; c.font = '700 74px Georgia, "Times New Roman", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(w.n), W2 / 2, H2 / 2 + 4);
  });
  const brass = new T.MeshStandardMaterial({ color: 0xC9A04A, metalness: 1, roughness: 0.35 }), plateFace = new T.MeshStandardMaterial({ map: plateTex, metalness: 0.75, roughness: 0.38 });
  const plate = new T.Mesh(new T.BoxGeometry(0.2, 0.075, 0.012), [brass, brass, brass, brass, plateFace, brass]);
  g.add(plate);
  // 이름판 — 고르는 동안은 숨겨 두고, 메달을 준 뒤에만 번호판 자리에 제목 · 화가 · 연도
  const TPW = Math.min(0.66, (pw + 2 * M) * 0.92), TPH = 0.15;
  const tpFace = new T.MeshStandardMaterial({ metalness: 0.6, roughness: 0.42 });
  const titlePlate = new T.Mesh(new T.BoxGeometry(TPW, TPH, 0.012), [brass, brass, brass, brass, tpFace, brass]);
  titlePlate.position.set(0, -hh - M - 0.135, -0.05); titlePlate.visible = false; g.add(titlePlate);
  // 고른 그림의 금빛 후광 — 액자 뒤
  const glowTex = canvasTex(256, Math.round(256 * (ph + 2 * M + 0.5) / (pw + 2 * M + 0.5)), (c, W2, H2) => {
    const pad = 46; c.shadowColor = 'rgba(255,214,130,1)'; c.shadowBlur = 34; c.fillStyle = 'rgba(255,214,130,1)';
    c.fillRect(pad, pad, W2 - pad * 2, H2 - pad * 2); c.shadowBlur = 0; c.globalCompositeOperation = 'destination-out'; c.fillRect(pad + 6, pad + 6, W2 - pad * 2 - 12, H2 - pad * 2 - 12);
  });
  const glow = new T.Mesh(new T.PlaneGeometry(pw + 2 * M + 0.5, ph + 2 * M + 0.5), new T.MeshBasicMaterial({ map: glowTex, color: 0xFFD486, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
  glow.position.z = -0.07; g.add(glow);
  // 결과에서 내가 고른 그림 — 그림 가장자리 안쪽의 가는 주황 선(두께는 화면 2px)
  const olMat = new T.MeshBasicMaterial({ color: OL_COLOR, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const ol = new T.Group(); for (let s = 0; s < 4; s++) ol.add(new T.Mesh(unitPlane, olMat));
  ol.position.z = 0.004; ol.visible = false; g.add(ol);
  // 벽의 빛 웅덩이(장면에 직접 — 액자와 같이 움직이지 않는다)
  const pool = new T.Mesh(unitPlane, new T.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
  scene.add(pool);
  return { w, i, g, pw, ph, ow: pw + 2 * M, oh: ph + 2 * M, mats, paint, plate, plateFace, brass, titlePlate, tpFace, TPW, TPH, tpOn: false, glow, glowV: 0, glowT: 0, ol, olMat, olV: 0, olT: 0, pool,
    hx: 0, hy: 0, s: 1, zb: 0, lift: 0, act: 0, kShare: 1, k: -1 };
}
const frames = WORKS.map(buildFrame);
// 거는 자리 계산 — 아래 줄부터 쌓는다. 한 줄 안에서는 가운데 높이를 맞춘다
(() => {
  let y = HANG_BOTTOM;
  for (let r = ROWS.length - 1; r >= 0; r--) {
    const row = ROWS[r].map((i) => frames[i]);
    row.forEach((f) => { f.s = ROW_H[r] / f.ph; });
    const hRow = Math.max(...row.map((f) => f.oh * f.s)), wRow = row.reduce((a, f) => a + f.ow * f.s, 0) + GAP_X * (row.length - 1);
    let x = -wRow / 2;
    row.forEach((f) => { f.hx = x + f.ow * f.s / 2; f.hy = y + hRow / 2; x += f.ow * f.s + GAP_X; });
    y += hRow + GAP_Y;
  }
  const max = Math.max(...Object.values(TODAY));
  frames.forEach((f) => {
    f.zb = 0.08 * f.s;   // 뒤판이 벽에 닿는 깊이
    f.plate.scale.setScalar(PLATE_K / f.s); f.plate.position.set(0, -f.oh / 2 - PLATE_DROP / f.s, -0.05);
    f.pool.position.set(f.hx, f.hy + 0.1 * f.s, 0.008); f.pool.scale.set(f.ow * f.s * 1.9, f.oh * f.s * 1.8, 1);
    f.kShare = 0.62 + 0.38 * TODAY[f.w.n] / max;
  });
})();
// 후보작 덩어리의 사각형(월드) — 벽 카메라가 이것을 화면에 맞춘다(아래 번호판까지)
const CL = (() => {
  const x0 = Math.min(...frames.map((f) => f.hx - f.ow * f.s / 2)), x1 = Math.max(...frames.map((f) => f.hx + f.ow * f.s / 2));
  const y0 = Math.min(...frames.map((f) => f.hy - f.oh * f.s / 2)) - PLATE_DROP - 0.12, y1 = Math.max(...frames.map((f) => f.hy + f.oh * f.s / 2));
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, z: 0.1 };
})();
// 채움 그림이 비켜 갈 자리 — 줄마다 띠
const AVOID = ROWS.map((row) => {
  const fs = row.map((i) => frames[i]);
  return { x0: Math.min(...fs.map((f) => f.hx - f.ow * f.s / 2)) - 0.2, x1: Math.max(...fs.map((f) => f.hx + f.ow * f.s / 2)) + 0.2,
    y0: Math.min(...fs.map((f) => f.hy - f.oh * f.s / 2)) - PLATE_DROP - 0.2, y1: Math.max(...fs.map((f) => f.hy + f.oh * f.s / 2)) + 0.2 };
});
const salon = buildSalon(scene, { aniso: ANISO, avoid: AVOID, kick: () => kick() });

function titleTex(f) {
  const W2 = 1024, H2 = Math.round(W2 * f.TPH / f.TPW);
  return canvasTex(W2, H2, (c) => {
    const gr = c.createLinearGradient(0, 0, 0, H2); gr.addColorStop(0, '#F4DB92'); gr.addColorStop(0.5, '#C9A14A'); gr.addColorStop(1, '#8E6A26'); c.fillStyle = gr; c.fillRect(0, 0, W2, H2);
    c.strokeStyle = 'rgba(70,45,8,.55)'; c.lineWidth = 5; c.strokeRect(12, 12, W2 - 24, H2 - 24);
    c.fillStyle = '#2E1F05'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const fit = (txt, wt, px) => { let s = px; do { c.font = `${wt} ${s}px Freesentation, "Apple SD Gothic Neo", sans-serif`; s -= 2; } while (c.measureText(txt).width > W2 - 90 && s > 20); };
    const t1 = `〈${f.w.title}〉`, t2 = `${f.w.artist} · ${f.w.year}`;
    fit(t1, 700, Math.round(H2 * 0.3)); c.fillText(t1, W2 / 2, H2 * 0.4);
    c.fillStyle = 'rgba(46,31,5,.82)'; fit(t2, 500, Math.round(H2 * 0.19)); c.fillText(t2, W2 / 2, H2 * 0.72);
  });
}

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
[medalRim, faceMat].forEach((m) => { m.transparent = true; });
const medalAlpha = (a) => { medalRim.opacity = faceMat.opacity = a; };
medal.visible = false;
const MED = { t0: 0, dir: 0, f: null, done: false, sc: 1 };   // dir 2 = 날아오는 중, 1 = 앉음, -1 = 떠나는 중

// ── 상태
let W = 1, H = 1, safeT = 0;
let mode = 'intro';                       // intro | wall | focus | placed | reveal | rewind
let fi = -1;                              // 앞으로 나온 그림
let chosen = null;
let yaw = 0, pitch = 0, yawV = 0, pitchV = 0;
let zoom = 1, zoomT = 1, panX = 0, panY = 0, panXT = 0, panYT = 0;
let dimV = 0, dimT = 0;                   // 방이 어두워진 정도(앞으로 나온 그림만 밝게)
let rv = 0, rvT = 0, rvFrom = 0, rvT0 = 0, RV_MS = 1300;   // 결과로 물러나기
let sh = 0, shT = 0, shFrom = 0, shT0 = 0, SH_MS = 1100;   // 오늘의 비율만큼 커지고 작아지기
const THUD = { t0: -1e9 }, FLIP = { f: null, t0: 0 };
let glintT0 = -1e9, specX = 1.6, specXT = 1.6;
const LIM = 35 * Math.PI / 180, LIFT = 1.05;   // 앞으로 나오는 거리(m) — 35° 돌려도 액자 모서리가 벽에 닿지 않는다
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eo = (t) => 1 - Math.pow(1 - t, 3);
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

// ── 카메라 — 위치 + 렌즈 시프트(sx, sy: NDC). 늘 -z 정면
//   fit: 월드 사각형(box, 깊이 z)을 화면 사각형(rect, px)에 맞춘다. eyeY 를 주면 카메라 높이는 그대로 두고 시프트로 올려다본다
function fit(box, rect, eyeY) {
  const s = Math.min((rect.r - rect.l) / box.w, (rect.b - rect.t) / box.h);   // px/m
  const d = (H / s) / (2 * TAN), x = box.cx, y = eyeY == null ? box.cy : eyeY;
  const ny = 1 - 2 * ((rect.t + rect.b) / 2) / H, nx = 2 * ((rect.l + rect.r) / 2) / W - 1;
  return shift({ x, y, z: box.z + d, tx: box.cx, ty: box.cy, tz: box.z, nx, ny });
}
// 시프트는 '어느 월드 점(tx,ty,tz)을 화면의 어느 자리(nx,ny)에 둘지'에서 나온다 — 두 상태 사이를 지날 때도 보던 곳을 놓치지 않는다
function shift(c) { const d = c.z - c.tz; c.sy = (c.ty - c.y) / (d * TAN) - c.ny; c.sx = (c.tx - c.x) / (d * TAN * W / H) - c.nx; return c; }
const CAMK = ['x', 'y', 'z', 'tx', 'ty', 'tz', 'nx', 'ny'];
const cam = { x: 0, y: HALL.EYE, z: 10, tx: 0, ty: 4, tz: 0, nx: 0, ny: 0, sx: 0, sy: 0 };
let camA = { ...cam }, camKey = 'wall', camT0 = 0, camMs = 1, camB = { ...cam };
function camFor(k) {
  if (k === 'door') {   // 대기실 — 문과 문틀, 위의 명판까지 한 화면에
    return fit({ cx: 0, cy: 3.55, w: 4.3, h: 7.3, z: HALL.L + 0.7 }, { l: 0, r: W, t: H * 0.06, b: H * 0.97 }, HALL.EYE);
  }
  if (k === 'wall') {   // 후보작 벽 — 역할 문장 아래부터 안내 위까지, 눈높이에서 정면
    const rb = roleEl.getBoundingClientRect(), top = Math.max(safeT + 96, rb.bottom - stage.getBoundingClientRect().top + 14);
    return fit(CL, { l: 30, r: W - 30, t: top, b: H - 62 - safeB() }, HALL.EYE);
  }
  if (k === 'result') { // 결과 — 상단 바 아래부터 결과 패널 위까지
    const ph = $('#reveal').offsetHeight;
    return fit(CL, { l: 24, r: W - 24, t: safeT + 60, b: H - ph - 18 }, HALL.EYE);
  }
  // 'focus' — 앞으로 나온 그림(이름판 자리까지)을 상단 바와 메달 단추 사이에
  const f = frames[fi];
  const ext = 0.26 * f.s;
  return fit({ cx: f.hx, cy: f.hy - ext / 2, w: f.ow * f.s, h: f.oh * f.s + ext, z: f.zb + LIFT }, { l: W * 0.05, r: W * 0.95, t: safeT + 62, b: H - dock.offsetHeight - 14 });
}
const safeB = () => parseFloat(getComputedStyle($('#safeProbe')).paddingBottom) || 0;
function camTo(k, ms) { camA = { ...cam }; camKey = k; camB = camFor(k); camT0 = performance.now(); camMs = reduceMotion ? 1 : ms; kick(); }
// 카메라는 벽 앞에 고정 — 그림 앞으로 나오기 · 확대 · 이동은 카메라가 아니라 그림이 움직인다(뒤의 벽은 그대로)
function applyCam() {
  camera.position.set(cam.x, cam.y, cam.z); camera.zoom = 1;
  camera.updateProjectionMatrix();
  const e = camera.projectionMatrix.elements; e[8] = cam.sx; e[9] = cam.sy;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  camera.updateMatrixWorld();
}
const pxPerM = (z) => H / (2 * (cam.z - z) * TAN);   // 깊이 z 에서 1m 가 몇 px
// 그림 앞으로 — 벽과 카메라는 그대로, 그림만 벽에서 떨어져 화면 가운데로(상단 바와 메달 단추 사이를 채우는 크기, 아래 번호판까지)
function focusPose(f) {
  const ext = 0.26 * f.s, rect = { l: W * 0.06, r: W * 0.94, t: safeT + 88, b: H - dock.offsetHeight - 16 };
  const z = f.zb + 0.5 * (cam.z - f.zb), ppm = pxPerM(z);
  const k = Math.min((rect.r - rect.l) / (f.ow * f.s * ppm), (rect.b - rect.t) / ((f.oh * f.s + ext) * ppm));
  const p = screenToWorld((rect.l + rect.r) / 2, (rect.t + rect.b) / 2, z);
  return { x: p.x, y: p.y + ext * k / 2, z, s: f.s * k };
}

function layout() {
  const r = stage.getBoundingClientRect();
  W = r.width || 1; H = r.height || 1;
  safeT = parseFloat(getComputedStyle($('#safeProbe')).paddingTop) || 0; introCams = null;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  if (mode !== 'intro') { camB = camFor(camKey); if (performance.now() - camT0 >= camMs) Object.assign(cam, camB); }
  apply(); renderer.render(scene, camera);
}

function dim(f, k) {
  if (Math.abs(f.k - k) < 0.004) return; f.k = k;
  f.mats.lip.color.setHex(GOLD.lip).multiplyScalar(k); f.mats.cove.color.setHex(GOLD.cove).multiplyScalar(k);
  f.mats.rim.color.setHex(GOLD.rim).multiplyScalar(k); f.mats.bead.color.setHex(GOLD.bead).multiplyScalar(k);
  for (const m of Object.values(f.mats)) m.envMapIntensity = 0.62 * k;
  f.paint.color.setScalar(k); f.plateFace.color.setScalar(k); f.brass.color.setHex(0xC9A04A).multiplyScalar(k);
}

function apply(now = performance.now()) {
  const t = eio(rv), es = eio(sh);
  const tk = (now - THUD.t0) / 520, thud = tk > 0 && tk < 1 ? Math.sin(tk * Math.PI * 2.5) * Math.exp(-tk * 4.2) : 0;
  const dk = eio(dimV);
  applyCam();
  if (fi >= 0 && (mode === 'focus' || mode === 'placed')) frames[fi].fp = focusPose(frames[fi]);
  frames.forEach((f, i) => {
    const sHome = f.s * lerp(1, f.kShare, es), zHome = f.zb * lerp(1, f.kShare, es), a = f.act, P = f.fp, me = i === fi;
    let s = sHome, px = f.hx, py = f.hy, pz = zHome;
    if (P && a > 0) {
      const ea = eio(a);
      s = lerp(sHome, P.s * (me ? zoom : 1), ea);
      px = lerp(f.hx, P.x + (me ? panX : 0), ea); py = lerp(f.hy, P.y + (me ? panY : 0), ea); pz = lerp(zHome, P.z, ea);
    }
    f.g.position.set(px, py, pz);
    f.g.rotation.set(pitch * a, yaw * a, 0); f.g.scale.setScalar(s);
    if (thud && f === MED.f) { f.g.position.z -= 0.05 * thud * s; f.g.rotation.x += 0.025 * thud; }
    dim(f, 1 - 0.72 * dk * (1 - a));
    f.pool.material.opacity = (1 - 0.8 * dk) * (1 - 0.3 * t);
    if (t > 0) { const px = 0.2 * PLATE_K * lerp(1, f.kShare, es) * pxPerM(f.g.position.z); f.plate.scale.setScalar(PLATE_K / f.s * lerp(1, Math.max(1, 46 / px), t)); }
    f.plate.visible = !f.tpOn || t > 0.5; f.titlePlate.visible = f.tpOn && t <= 0.5;
    f.glow.material.opacity = f.glowV * 0.75 * (1 - t);
    f.mats.rim.emissive.setRGB(0.32, 0.22, 0.05).multiplyScalar(f.glowV * 0.5 * (1 - t));
    f.olMat.opacity = f.olV; f.ol.visible = f.olV > 0.01;
    if (f.ol.visible) setOutline(f, 2 / (s * pxPerM(f.g.position.z)));
  });
  salon.dim(1 - 0.7 * dk);
  // 메달은 고른 액자에 붙은 채 — 결과에서는 액자가 작아져도 화면에서 약 26px 로 남는다
  if (MED.f && MED.dir !== 2) {
    const f = MED.f, ppu = f.g.scale.x * pxPerM(f.g.position.z), up = Math.max(1, 26 / (2 * MR * ppu));
    medal.visible = MED.dir !== 0; medal.scale.setScalar(MED.sc * (1 + 0.14 * Math.max(0, thud)) * lerp(1, up, t));
  }
  camera.position.y += 0.006 * thud;
  // 반사광 — 앞으로 나온 그림 앞, 아니면 벽 앞
  if (MED.dir !== 2) {
    const f = fi >= 0 ? frames[fi] : null, a = f ? f.act : 0, fs = f ? f.g.scale.x : 1;
    const bx = lerp(CL.cx, f ? f.g.position.x : CL.cx, a), by = lerp(CL.cy + 1.5, f ? f.g.position.y + 0.7 * fs : CL.cy, a);
    const bz = Math.min(cam.z - 0.3, lerp(4.5, f ? f.g.position.z + 2.2 * fs : 4.5, a));
    spec.position.set(bx + specX * lerp(1.1, 0.55 * fs, a), by, bz);
  }
  stage.classList.toggle('zoomed', zoom > 1.04);
  if ((mode === 'reveal' || sh > 0) && rv > 0.98) placeTags();
}

// ── 렌더 루프 — 움직이는 것이 있을 때만
let raf = 0, last = 0;
function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
function tick(now) {
  raf = 0;
  const dt = Math.min(0.034, Math.max(0.001, (now - last) / 1000)); last = now;
  const busy = step(dt, now);
  apply(now); renderer.render(scene, camera);
  if (busy) raf = requestAnimationFrame(tick);
}
function spring(x, v, target, k, c, dt) { const a = k * (target - x) - c * v; v += a * dt; x += v * dt; return [x, v]; }

// ── 입장(약 4.4초, 누르면 빨리 감기)
//   대기실(어둠, 문틈의 빛) → 두 짝 문이 안쪽으로 열린다 → 문이 다 열린 뒤에 걷기 시작해 문간 한가운데를 지나(문짝·벽과 1.5m 이상 떨어져) 전시실로
//   → 천창의 빛줄기·먼지 속을 눈높이로 걸어 → 후보작 벽 앞에 정면으로 서고, 빛이 후보작을 한 번 쓸고 지나간다
const TL = { doors: [350, 1650], walk: [1250, 4300], air: [900, 2200], airOut: [3600, 4500], sweep: [3700, 4500], role: 3900, end: 4500 };
let tI = 0, speed = 1, roleShown = false, introCams = null;
function stepIntro(dt, now) {
  tI += dt * 1000 * speed; const time = now / 1000;
  const od = eio(seg(tI, ...TL.doors));
  salon.setDoor(od, time);
  renderer.toneMappingExposure = lerp(0.55, 1.0, eo(seg(tI, 200, 1900)));
  salon.setAir(eo(seg(tI, ...TL.air)) * (1 - seg(tI, ...TL.airOut)), time);
  // 걷기 — 처음엔 천천히 떼고, 길게 미끄러지다 벽 앞에서 부드럽게 선다. 높이는 내내 눈높이
  const p = seg(tI, ...TL.walk), q = Math.pow(p, 0.75), e = q * q * (3 - 2 * q);
  if (!introCams) introCams = [camFor('door'), camFor('wall')];
  const [A, B] = introCams;
  // 입장은 시프트를 직접 섞는다(문 → 벽으로 시선이 천천히 올라간다). 카메라는 x=0, 눈높이 그대로 — 문간 한가운데를 지난다
  for (const k of CAMK) cam[k] = lerp(A[k], B[k], k === 'z' ? e : eio(p));
  cam.x = 0; cam.y = HALL.EYE; cam.sx = lerp(A.sx, B.sx, e); cam.sy = lerp(A.sy, B.sy, eio(p));
  // 빛이 후보작 위를 쓸고 지나간다(반사광이 금박 위를 왼쪽에서 오른쪽으로)
  const sw = seg(tI, ...TL.sweep);
  specX = lerp(-3.2, 1.6, eio(sw)); spec.intensity = 0.9 + 1.6 * Math.sin(sw * Math.PI);
  if (!roleShown && tI >= TL.role) { roleShown = true; roleIn(); }
  if (tI >= TL.end) {
    salon.setDoor(1, time); salon.setAir(0, time); renderer.toneMappingExposure = 1; spec.intensity = 0.9; specX = specXT;
    camKey = 'wall'; camB = camFor('wall'); camT0 = 0; camMs = 1; Object.assign(cam, camB);
    setMode('wall'); cv.removeEventListener('pointerdown', skipIntro);
    return false;
  }
  return true;
}
function skipIntro() { if (mode === 'intro') speed = 4; }

function step(dt, now) {
  let busy = !!g;
  if (mode === 'intro') busy = stepIntro(dt, now) || busy;
  // 회전: 손을 떼면 관성으로 더 돌다가 제자리로 (모션 줄이기: 관성 없이 바로 돌아옴)
  if (!g || g.type !== 'one' || g.mode !== 'rotate') {
    const K = 70, C = reduceMotion ? 2 * Math.sqrt(K) : 7.5;
    [yaw, yawV] = spring(yaw, yawV, 0, K, C, dt); [pitch, pitchV] = spring(pitch, pitchV, 0, K, C, dt);
    if (Math.abs(yaw) > LIM) { yaw = Math.sign(yaw) * LIM; yawV *= -0.3; }
    if (Math.abs(pitch) > LIM) { pitch = Math.sign(pitch) * LIM; pitchV *= -0.3; }
    if (Math.abs(yaw) + Math.abs(pitch) + Math.abs(yawV) + Math.abs(pitchV) > 0.0006) busy = true; else { yaw = pitch = yawV = pitchV = 0; }
  }
  // 확대·이동
  if (!g || g.type !== 'pinch') {
    const e = 1 - Math.exp(-dt * 11);
    zoom += (zoomT - zoom) * e; panX += (panXT - panX) * e; panY += (panYT - panY) * e;
    if (Math.abs(zoom - zoomT) + Math.abs(panX - panXT) + Math.abs(panY - panYT) > 0.0004) busy = true; else { zoom = zoomT; panX = panXT; panY = panYT; }
  }
  // 카메라 이동 — 벽 ↔ 그림 앞 ↔ 결과
  if (mode !== 'intro') {
    const p = clamp((now - camT0) / camMs, 0, 1), e = eio(p);
    for (const k of CAMK) cam[k] = lerp(camA[k], camB[k], e);
    shift(cam);
    if (p < 1) busy = true;
  }
  // 그림이 벽에서 떨어져 나오고 / 돌아가 걸리고, 방이 어두워지고 / 밝아진다 — 카메라와 같은 박자
  const ef = reduceMotion ? 1 : 1 - Math.exp(-dt * 6.5);
  frames.forEach((f, i) => {
    const on = i === fi && (mode === 'focus' || mode === 'placed' || (mode === 'reveal' && rv < 0.05));
    const lT = on ? LIFT : 0, aT = on ? 1 : 0;
    f.lift += (lT - f.lift) * ef; f.act += (aT - f.act) * ef;
    if (Math.abs(lT - f.lift) > 0.002 || Math.abs(aT - f.act) > 0.002) busy = true; else { f.lift = lT; f.act = aT; }
  });
  dimV += (dimT - dimV) * ef; if (Math.abs(dimT - dimV) > 0.002) busy = true; else dimV = dimT;
  frames.forEach((f) => { const e = 1 - Math.exp(-dt * 6); f.glowV += (f.glowT - f.glowV) * e; if (Math.abs(f.glowT - f.glowV) > 0.003) busy = true; else f.glowV = f.glowT; });
  frames.forEach((f) => { const e = reduceMotion ? 1 : 1 - Math.exp(-dt * 7); f.olV += (f.olT - f.olV) * e; if (Math.abs(f.olT - f.olV) > 0.003) busy = true; else f.olV = f.olT; });
  // 반사광: 그림이 나오면 금박 위를 한 번 쓸고 지나간다 · 끄는 동안엔 손가락을 따라간다
  if (mode !== 'intro') {
    const gt = (now - glintT0) / 1300;
    if (gt >= 0 && gt < 1) { specX = lerp(-3.4, 1.6, eio(gt)); busy = true; }
    else { const e = 1 - Math.exp(-dt * 8); specX += (specXT - specX) * e; if (Math.abs(specX - specXT) > 0.004) busy = true; }
  }
  if (MED.dir) busy = stepMedal(now) || busy;
  // 번호판이 뒤집히며 이름판으로
  if (FLIP.f) {
    const f = FLIP.f, k = reduceMotion ? 1 : (now - FLIP.t0) / 720;
    if (k < 0.3) { f.tpOn = false; f.plate.rotation.x = eio(clamp(k / 0.3, 0, 1)) * Math.PI / 2; }
    else {
      const p = clamp((k - 0.3) / 0.7, 0, 1), back = 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
      f.tpOn = true; f.plate.rotation.x = 0; f.titlePlate.rotation.x = -Math.PI / 2 * (1 - back); f.titlePlate.scale.set(lerp(0.32, 1, eo(p)), 1, 1);
    }
    if (k < 1) busy = true; else { f.titlePlate.rotation.x = 0; f.titlePlate.scale.set(1, 1, 1); FLIP.f = null; }
  }
  if (now - THUD.t0 < 560) busy = true;
  if (glint.visible) {
    const k = (now - THUD.t0) / 640;
    if (k >= 1) { glint.visible = false; glint.material.opacity = 0; spec.intensity = 0.9; }
    else { const s = Math.sin(clamp(k, 0, 1) * Math.PI); glint.material.opacity = s; glint.material.rotation = k * 0.9; glint.scale.setScalar((0.08 + 0.34 * s) * (MED.f ? MED.f.g.scale.x : 1)); spec.intensity = 0.9 + 2.4 * s; busy = true; }
  }
  // 결과로 물러나기 · 비율만큼 커지고 작아지기 + 빛 쓸기 + 숫자 세기
  if (rv !== rvT) { const p = clamp((now - rvT0) / (reduceMotion ? 1 : RV_MS), 0, 1); rv = lerp(rvFrom, rvT, p); if (p >= 1) rv = rvT; busy = true; }
  if (sh !== shT) {
    const p = clamp((now - shT0) / (reduceMotion ? 1 : SH_MS), 0, 1); sh = lerp(shFrom, shT, p); if (p >= 1) sh = shT; busy = true;
    if (shT === 1) {
      bar.visible = !reduceMotion; bar.position.set(lerp(CL.cx - CL.w / 2 - 0.8, CL.cx + CL.w / 2 + 0.8, eio(p)), CL.cy, 0.6); bar.scale.set(0.9, CL.h * 1.25, 1); bar.material.opacity = Math.sin(p * Math.PI) * 0.4;
      specX = lerp(-2, 2, eio(p)); spec.intensity = 0.9 + 0.7 * Math.sin(p * Math.PI);
      tagEls.forEach((tg, i) => { tg.num.textContent = Math.round(TODAY[frames[i].w.n] * eo(p)); });
    }
    if (p >= 1) { bar.visible = false; spec.intensity = 0.9; specX = specXT; }
  }
  return busy;
}

const _v = new T.Vector3(), _w = new T.Vector3();
function screenToWorld(x, y, z) {   // 화면 점(px) → 깊이 z 평면 위의 월드 점
  _v.set((x / W) * 2 - 1, -(y / H) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
  return camera.position.clone().addScaledVector(_v, (z - camera.position.z) / _v.z);
}
function stepMedal(now) {
  const f = MED.f; if (!f) return false;
  const yEnd = -(f.ph / 2 + M * 0.55), zEnd = 0.088;
  if (MED.dir === 2) {
    // 날아오기 — 누른 단추 자리에서 포물선을 그리며 돌다가, 마지막에 앞면이 정면으로 오며 아래 테두리에 앉는다
    const F = MED.fly, p = clamp((now - F.t0) / (reduceMotion ? 1 : 980), 0, 1), e = p < 1 ? 1 - Math.pow(1 - p, 2.4) : 1;
    _w.copy(F.a).multiplyScalar((1 - e) * (1 - e)).addScaledVector(F.c, 2 * e * (1 - e)).addScaledVector(F.b, e * e);
    medal.position.copy(_w);
    medal.rotation.set(lerp(0.5, 0, e), (1 - eo(p)) * Math.PI * 5, lerp(-0.4, -0.12, e));
    medal.scale.setScalar(lerp(F.s0, f.g.scale.x, eo(p)));
    spec.position.set(_w.x + 0.3 * f.g.scale.x, _w.y + 0.25 * f.g.scale.x, Math.min(cam.z - 0.3, _w.z + 0.8 * f.g.scale.x));
    medalAlpha(Math.min(1, p * 5));
    if (p >= 1) {
      f.g.attach(medal); medal.position.set(0, yEnd, zEnd); medal.rotation.set(0, 0, -0.12); medal.scale.setScalar(1);
      MED.dir = 1; MED.done = true; MED.t0 = -1e9; MED.sc = 1;
      THUD.t0 = now; haptic([18, 30, 12]);
      glint.visible = !reduceMotion; f.g.localToWorld(glint.position.set(-MR * 0.45, yEnd + MR * 0.5, zEnd + 0.05));
      F.done();
    }
    return true;
  }
  if (MED.dir > 0) return false;
  const p = clamp((now - MED.t0) / (reduceMotion ? 1 : 360), 0, 1);
  medal.position.set(0, yEnd + p * 0.12, zEnd + p * 0.2); medalAlpha(1 - p);
  if (p >= 1) { medal.visible = false; f.g.remove(medal); MED.dir = 0; MED.f = null; return false; }
  return true;
}

// ── 몸짓
//   벽: 그림을 누르면 그 그림이 앞으로(같은 장면). 끌기는 없다.
//   앞으로 나온 그림: 끌기(회전) · 집기(확대) · 확대 중 끌기(이동) · 두 번 탭(원래대로) · 길게 누르기(메달) · 그림 바깥 누르기(벽으로)
const pointers = new Map();
let g = null, lastTap = { t: 0, x: 0, y: 0 }, pressT = 0;
const ptOf = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
const KPX = LIM / 110;
const ray = new T.Raycaster();
function hitFrame(p, list) {
  ray.setFromCamera(new T.Vector2((p.x / W) * 2 - 1, -(p.y / H) * 2 + 1), camera);
  let best = null;
  list.forEach((f) => { const h = ray.intersectObject(f.g, true)[0]; if (h && (!best || h.distance < best.d)) best = { f, d: h.distance }; });
  return best ? best.f : null;
}
function wppF() { const f = frames[fi]; return 2 * (cam.z - (f.fp ? f.fp.z : f.g.position.z)) * TAN / H; }   // 그림 면에서 1px 가 몇 m
// 확대한 그림을 옮길 수 있는 범위 — 그림 가장자리가 화면 가운데를 넘지 않게
function clampPan() {
  const f = frames[fi], P = f.fp; if (!P) return;
  const q = zoom - 1, hw = f.ow * P.s / 2 * q, hh = f.oh * P.s / 2 * q;
  panX = clamp(panX, -hw, hw); panY = clamp(panY, -hh, hh);
  panXT = panX; panYT = panY;
}
let gestSeen = false;
function hideGest() { gestSeen = true; gest.classList.add('off'); }

cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('pointerdown', (e) => {
  if (mode === 'intro') { skipIntro(); return; }
  if (mode !== 'wall' && mode !== 'focus') return;
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
  const p = ptOf(e); pointers.set(e.pointerId, p);
  clearTimeout(pressT);
  if (mode === 'wall') { g = { type: 'tap', id: e.pointerId, x0: p.x, y0: p.y, t0: performance.now(), moved: false }; return; }
  if (pointers.size === 1) {
    g = { type: 'one', id: e.pointerId, x0: p.x, y0: p.y, lx: p.x, ly: p.y, t0: performance.now(), moved: false, mode: zoom > 1.04 ? 'pan' : 'rotate', samples: [{ t: performance.now(), x: p.x, y: p.y }], yaw0: yaw, pitch0: pitch, consumed: false };
    yawV = pitchV = 0;
    if (zoom <= 1.04) pressT = setTimeout(() => {
      if (g && g.type === 'one' && !g.moved && pointers.size === 1 && mode === 'focus' && hitFrame({ x: g.x0, y: g.y0 }, [frames[fi]])) { g.consumed = true; placeMedal(); }
    }, 520);
  } else if (pointers.size === 2) {
    // 두 손가락 사이의 그림 위 점을 붙잡고 그림을 키운다(rx, ry: 확대 1 기준 그림 중심에서의 거리)
    const [a, b] = [...pointers.values()], mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, P = frames[fi].fp;
    const m = screenToWorld(mid.x, mid.y, P.z);
    g = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: zoom, rx: (m.x - P.x - panX) / zoom, ry: (m.y - P.y - panY) / zoom };
    hideGest();
  }
  kick();
});
cv.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId) || !g) return;
  const p = ptOf(e); pointers.set(e.pointerId, p);
  if (g.type === 'tap') { if (Math.hypot(p.x - g.x0, p.y - g.y0) > 10) g.moved = true; return; }
  if (g.type === 'pinch' && pointers.size >= 2) {
    const [a, b] = [...pointers.values()], mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const P = frames[fi].fp, m = screenToWorld(mid.x, mid.y, P.z);
    zoom = clamp(g.z0 * Math.hypot(a.x - b.x, a.y - b.y) / g.d0, 1, 3); zoomT = zoom;
    panX = m.x - P.x - g.rx * zoom; panY = m.y - P.y - g.ry * zoom;
    clampPan(); kick(); return;
  }
  if (g.type !== 'one' || e.pointerId !== g.id) return;
  const dx = p.x - g.x0, dy = p.y - g.y0, now = performance.now();
  if (!g.moved && Math.hypot(dx, dy) > 7) { g.moved = true; clearTimeout(pressT); hideGest(); }
  g.samples.push({ t: now, x: p.x, y: p.y }); while (g.samples.length > 2 && now - g.samples[0].t > 100) g.samples.shift();
  if (g.mode === 'pan') { const wpp = wppF(); panX += (p.x - g.lx) * wpp; panY -= (p.y - g.ly) * wpp; clampPan(); }
  else if (g.moved) {
    yaw = LIM * Math.tanh((g.yaw0 + dx * KPX) / LIM);
    pitch = LIM * Math.tanh((g.pitch0 + dy * KPX) / LIM);
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
  if (g.type === 'tap') {
    const a = g; g = null;
    if (e.type === 'pointerup' && !a.moved && performance.now() - a.t0 < 600 && mode === 'wall') { const f = hitFrame({ x: a.x0, y: a.y0 }, frames); if (f) focus(f.i); }
    return;
  }
  if (g.type === 'pinch') {
    if (pointers.size === 1) { const [id, p] = [...pointers.entries()][0]; g = { type: 'one', id, x0: p.x, y0: p.y, lx: p.x, ly: p.y, t0: performance.now(), moved: true, mode: zoom > 1.04 ? 'pan' : 'rotate', samples: [{ t: performance.now(), x: p.x, y: p.y }], yaw0: yaw, pitch0: pitch, consumed: true }; }
    else g = null;
    if (zoom < 1.06) { zoomT = 1; panXT = 0; panYT = 0; }
    kick(); return;
  }
  if (e.pointerId !== g.id) return;
  const a = g; g = null;
  specXT = 1.6;
  if (a.consumed) { kick(); return; }
  const now = performance.now();
  if (!a.moved && now - a.t0 < 500 && e.type === 'pointerup') {
    if (a.t0 - lastTap.t < 450 && Math.hypot(a.x0 - lastTap.x, a.y0 - lastTap.y) < 40) { resetView(); lastTap.t = 0; kick(); return; }
    lastTap = { t: now, x: a.x0, y: a.y0 };
    // 그림 바깥을 누르면 벽으로(확대 중에는 아님)
    if (zoom <= 1.04 && !hitFrame({ x: a.x0, y: a.y0 }, [frames[fi]])) { setTimeout(() => { if (lastTap.t === now && mode === 'focus') toWall(); }, 260); }
    kick(); return;
  }
  if (a.mode === 'rotate' && !reduceMotion) {
    const s0 = a.samples[0], s1 = a.samples[a.samples.length - 1], dtm = Math.max(16, s1.t - s0.t);
    yawV = clamp((s1.x - s0.x) / dtm * 1000 * KPX, -7, 7); pitchV = clamp((s1.y - s0.y) / dtm * 1000 * KPX, -7, 7);
  }
  kick();
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
function resetView() { zoomT = 1; panXT = 0; panYT = 0; yawV = pitchV = 0; }

// ── 벽 ↔ 그림 앞 — 같은 장면 안에서. 그림이 벽에서 떨어져 앞으로 나오고 카메라가 그 앞으로, 방은 어두워진다
function focus(i) {
  if (mode !== 'wall') return;
  fi = i; setMode('focus'); haptic(10);
  $('#wallTitle').textContent = `후보작 ${WORKS[i].n}번`;
  gest.classList.toggle('off', gestSeen);
  resetView(); zoom = 1; panX = panY = 0; dimT = 1; frames[i].fp = focusPose(frames[i]); kick();
  if (!reduceMotion) glintT0 = performance.now() + 500;
}
function toWall() {
  if (mode !== 'focus') return;
  setMode('wall'); resetView();
  dimT = 0; kick();
  $('#wallTitle').textContent = '';
}
$('#back2').addEventListener('click', () => { if (mode === 'focus') toWall(); else if (mode === 'reveal') again(); });

// ── 메달 → 확인
const confirm = sheet($('#confirm'));
async function placeMedal() {
  if (mode !== 'focus') return;
  setMode('placed'); chosen = frames[fi];
  hideGest(); resetView();
  chosen.glowT = 1; if (!reduceMotion) glintT0 = performance.now();
  haptic(14); kick();
  $('#cfTitle').textContent = `${chosen.w.n}번에 올해의 메달을 줄까요?`;
  await sleep(reduceMotion ? 100 : 420);
  if (mode === 'placed') confirm.open();
}
function unplace() {
  confirm.close();
  if (mode !== 'placed') return;
  chosen.glowT = 0; chosen = null; setMode('focus'); kick();
}
function flyMedal(fromEl) {
  return new Promise((done) => {
    const f = chosen;
    if (medal.parent) medal.parent.remove(medal);
    scene.add(medal); medal.visible = true; medalAlpha(0);
    f.g.updateMatrixWorld(true);
    const r = fromEl.getBoundingClientRect(), sr = stage.getBoundingClientRect(), d = cam.z - f.g.position.z;
    const a = screenToWorld(r.left + r.width / 2 - sr.left, r.top + r.height / 2 - sr.top, f.g.position.z + d * 0.55);
    const b = f.g.localToWorld(new T.Vector3(0, -(f.ph / 2 + M * 0.55), 0.088));
    const c = a.clone().lerp(b, 0.5); c.y = Math.max(a.y, b.y) + d * 0.16; c.z = f.g.position.z + d * 0.35;
    MED.f = f; MED.dir = 2; MED.done = false; MED.fly = { a, b, c, t0: performance.now(), s0: f.g.scale.x * 0.55, done };
    kick();
  });
}
award.addEventListener('click', placeMedal);
$('#cfBack').addEventListener('click', unplace);
$$('.sheet-dim').forEach((d) => d.addEventListener('click', () => { if (mode === 'placed') unplace(); }));
$('#cfOk').addEventListener('click', () => { if (mode === 'placed') reveal($('#cfOk')); });

// ── 오늘의 심사위원단
//   이름판을 읽을 틈 → 그림이 벽으로 돌아가 걸리며 카메라가 물러난다(방이 다시 밝아진다)
//   → 빛이 벽을 쓸고 지나가는 동안 다섯 액자가 오늘의 비율만큼 커지고 작아지며 번호판 옆 숫자가 센다 → 내 그림에 주황 선 → 패널
const tagEls = frames.map((f) => {
  const pct = document.createElement('div'); pct.className = 'rpct'; pct.innerHTML = `<b>${TODAY[f.w.n]}</b><i>%</i>`; tagsEl.appendChild(pct);
  return { pct, num: pct.querySelector('b') };
});
const _p = new T.Vector3();
function placeTags() {
  frames.forEach((f, i) => {
    f.plate.updateWorldMatrix(true, false);
    _p.set(0.1, 0, 0.006); f.plate.localToWorld(_p); _p.project(camera);
    const x = (_p.x + 1) / 2 * W + 6, y = (1 - _p.y) / 2 * H;
    tagEls[i].pct.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateY(-50%)`;
  });
}
function setRv(target, ms) { RV_MS = ms; rvFrom = rv; rvT = target; rvT0 = performance.now(); kick(); }
function setSh(target, ms) { SH_MS = ms; shFrom = sh; shT = target; shT0 = performance.now(); kick(); }
let revSeq = 0;
function showTitle(f) {
  if (!f.tpFace.map) { f.tpFace.map = titleTex(f); f.tpFace.needsUpdate = true; }
  FLIP.f = f; FLIP.t0 = performance.now(); f.titlePlate.scale.set(0.32, 1, 1); f.titlePlate.rotation.x = -Math.PI / 2; kick();
}
function hideTitles() { frames.forEach((f) => { f.tpOn = false; f.plate.rotation.x = 0; f.titlePlate.rotation.x = 0; }); FLIP.f = null; kick(); }
function countUp(el, to, ms) {
  if (reduceMotion) { el.textContent = to; return; }
  const t0 = performance.now(); const tick2 = (now) => { const p = clamp((now - t0) / ms, 0, 1); el.textContent = Math.round(to * eo(p)); if (p < 1) requestAnimationFrame(tick2); }; requestAnimationFrame(tick2);
}
async function reveal(fromEl) {
  setMode('reveal');
  const me = chosen, top = WORKS.find((w) => w.n === TOP), seq = ++revSeq;
  confirm.close();
  if (document.fonts) await Promise.race([document.fonts.load('700 40px Freesentation', '가'), sleep(300)]).catch(() => {});
  if (!me.tpFace.map) { me.tpFace.map = titleTex(me); me.tpFace.needsUpdate = true; }
  await flyMedal(fromEl);
  if (seq !== revSeq) return;
  await sleep(reduceMotion ? 0 : 240);
  showTitle(me); haptic(10);
  await sleep(reduceMotion ? 1200 : 720 + 1200);
  if (seq !== revSeq || mode !== 'reveal') return;
  $('#wallTitle').textContent = '오늘의 심사위원단';
  $('#revTitle').textContent = `〈${me.w.title}〉`;
  $('#revMeta').textContent = `${me.w.artist} · ${me.w.year}`;
  $('#revLine').innerHTML = `오늘 심사위원 <em><b>0</b>%</em>가 같은 그림을 골랐습니다.`;
  $('#revTop').textContent = me.w.n === TOP ? '오늘 가장 많은 심사위원이 고른 그림입니다.' : `가장 많이 고른 그림은 ${top.n}번 〈${top.title}〉 · ${TODAY[top.n]}%`;
  $('#revStamp').textContent = stampLine(JURY);
  tagEls.forEach((t, i) => { t.pct.classList.toggle('me', frames[i] === me); t.num.textContent = '0'; });
  me.glowT = 0; dimT = 0; zoomT = 1; panXT = 0; panYT = 0;
  stage.classList.add('is-reveal');
  setRv(1, 1300); camTo('result', 1300);
  await sleep(reduceMotion ? 0 : 1300 + 80);
  if (seq !== revSeq) return;
  placeTags(); tagEls.forEach((t) => t.pct.classList.add('show'));
  setSh(1, 1150);
  await sleep(reduceMotion ? 0 : 1150);
  if (seq !== revSeq) return;
  me.olT = 1; kick();
  await sleep(reduceMotion ? 0 : 380);
  if (seq !== revSeq) return;
  $('#reveal').classList.add('on'); haptic(10);
  countUp($('#revLine b'), TODAY[me.w.n], 900);
}
function clearReveal() {
  revSeq++; hideTitles();
  $('#reveal').classList.remove('on'); stage.classList.remove('is-reveal');
  tagEls.forEach((t) => t.pct.classList.remove('show', 'me'));
  frames.forEach((f) => { f.olT = 0; f.glowT = 0; });
  $('#wallTitle').textContent = '';
}
// 다시 고르기 — 비율 → 같은 크기, 메달은 위로 떠서 사라지고 번호판이 돌아온다, 카메라는 벽 앞으로
async function again() {
  if (mode !== 'reveal') return;
  const was = chosen;
  clearReveal(); confirm.close();
  if (was && MED.f) { MED.dir = -1; MED.t0 = performance.now(); }
  chosen = null; fi = -1; setMode('rewind');
  setSh(0, 600); setRv(0, 1000); dimT = 0; camTo('wall', 1000);
  await sleep(reduceMotion ? 0 : 1000);
  setMode('wall'); kick();
}
$('#again').addEventListener('click', again);

// ── 카드 — 고른 그림이 액자에서 카드 속 액자로 옮겨 앉는다
function frameScreenRect(f) {
  const b = new T.Box3().setFromObject(f.g.children.find((m) => m.material === f.paint) || f.g);
  const a = b.min.clone().project(camera), c = b.max.clone().project(camera), sr = stage.getBoundingClientRect();
  return { x: sr.left + (a.x + 1) / 2 * W, y: sr.top + (1 - c.y) / 2 * H, w: (c.x - a.x) / 2 * W, h: (c.y - a.y) / 2 * H };
}
$('#save').addEventListener('click', async () => {
  const me = chosen; if (!me) return;
  $('#cardImg').src = me.w.src;
  $('#cardPos').innerHTML = `오늘 심사위원 <b>${TODAY[me.w.n]}%</b>가 같은 그림을 골랐습니다`;
  $('#cardNo').textContent = `후보작 ${me.w.n}번`;
  $('#cardTitle').textContent = `〈${me.w.title}〉`;
  $('#cardMeta').textContent = [me.w.artist, me.w.year, me.w.coll].filter(Boolean).join(' · ');
  $('#cardShown').textContent = me.w.shown; $('#cardShown').hidden = !me.w.shown;
  saveChoice('c0', { n: me.w.n, title: me.w.title, pct: TODAY[me.w.n] });   // 기기 안에만 · 출구 화면(exit.html)이 읽는다
  const r0 = frameScreenRect(me);
  const s4 = $('#s4'); s4.classList.add('morph'); screenOn('s4', true);
  try { await $('#cardImg').decode(); } catch (e) { /* noop */ }
  const r1 = $('#cardImg').getBoundingClientRect();
  if (reduceMotion) { s4.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 }); await sleep(300); s4.classList.remove('morph'); toast('수집함에 저장했습니다', 1600); return; }
  const ghost = document.createElement('img'); ghost.src = me.w.src; ghost.className = 'fly-ghost';
  Object.assign(ghost.style, { left: r1.left + 'px', top: r1.top + 'px', width: r1.width + 'px', height: r1.height + 'px' });
  document.body.appendChild(ghost); $('#cardFrame').style.opacity = '0';
  const sx = r0.w / r1.width, sy = r0.h / r1.height, dx = r0.x - r1.left, dy = r0.y - r1.top;
  s4.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 520, easing: 'ease', fill: 'backwards', delay: 120 });
  $('.card', s4).animate([{ transform: 'translateY(40px) scale(.94)' }, { transform: 'none' }], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)', delay: 120, fill: 'backwards' });
  const a = ghost.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, boxShadow: '0 30px 60px rgba(0,0,0,.6)' },
    { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 30}px) scale(${lerp(sx, 1, 0.6)}, ${lerp(sy, 1, 0.6)}) rotate(-2deg)`, offset: 0.55 },
    { transform: 'none', boxShadow: '0 4px 8px rgba(0,0,0,.3)' },
  ], { duration: 980, easing: 'cubic-bezier(.45,0,.2,1)' });
  await a.finished.catch(() => {});
  $('#cardFrame').style.opacity = ''; ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }).finished.then(() => ghost.remove());
  $('#cardFrame').animate([{ transform: 'scale(1.06)', opacity: 0 }, { opacity: 1, offset: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.3,1.5,.4,1)' });
  $('#cardMedal').animate([{ transform: 'translateY(-26px) rotate(-30deg) scale(1.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.3,1.4,.4,1)' });
  s4.classList.remove('morph');
  haptic(16); toast('수집함에 저장했습니다', 1600);
});
// 카드 → 결과: 카드가 내려가며 사라지고 뒤의 결과가 그대로
$('#back4').addEventListener('click', async () => {
  const s4 = $('#s4'); kick();
  await s4.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(30px)' }], { duration: reduceMotion ? 200 : 460, easing: 'cubic-bezier(.4,0,.2,1)' }).finished.catch(() => {});
  screenOn('s4', false);
});
// 처음으로 — 카드가 물러나며 벽 앞으로, 역할 문장이 다시
$('#restart').addEventListener('click', async () => {
  const s4 = $('#s4');
  if (mode === 'reveal') again();
  roleIn();
  await s4.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.96)' }], { duration: reduceMotion ? 200 : 520, easing: 'cubic-bezier(.4,0,.2,1)' }).finished.catch(() => {});
  screenOn('s4', false);
});
window.addEventListener('resize', layout);
new ResizeObserver(() => layout()).observe(stage);

// ── 시작
(async function boot() {
  setMode('intro');
  layout();
  await Promise.race([Promise.all(texLoads), sleep(2500)]);
  if (document.fonts) await Promise.race([document.fonts.ready, sleep(800)]);
  layout();
  if (reduceMotion || new URLSearchParams(location.search).has('nointro')) {
    salon.setDoor(1, 0); salon.setAir(0, 0);
    roleIn(); setMode('wall'); camKey = 'wall'; camB = camFor('wall'); camT0 = 0; camMs = 1; Object.assign(cam, camB);
    stage.classList.add('lit'); kick(); return;
  }
  cv.addEventListener('pointerdown', skipIntro);
  Object.assign(cam, camFor('door')); salon.setDoor(0, 0);
  stage.classList.add('lit');
  kick();
})();

// 검수용
window.__c0 = {
  get info() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, tex: renderer.info.memory.textures, geo: renderer.info.memory.geometries, prog: renderer.info.programs.length }; },
  get mode() { return mode; }, get fi() { return fi; }, get chosen() { return chosen ? chosen.w.n : null; }, get zoom() { return zoom; }, get cam() { return { ...cam }; }, get tI() { return tI; },
  get titleShown() { return !!(chosen && chosen.tpOn && chosen.titlePlate.visible); },
  // 후보작 그림 면의 화면 사각형(px)
  rect(i) { return frameScreenRect(frames[i]); },
  focus, toWall, place: placeMedal, reveal, again, get rv() { return rv; }, get sh() { return sh; }, get medDir() { return MED.dir; },
};
