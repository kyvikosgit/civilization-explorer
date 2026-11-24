// v3 살롱 — v2 c0.js 사본. 입장 연출은 그대로, 벽에 선 뒤 화면을 누르면 카메라(salon-ar.js)로 넘어간다
//   바꾼 곳: 의존 경로, 후보작 5번(마네 〈르 봉 보크〉 → 기획안 후보작 카바넬 〈클레오파트라〉 — 현장 그림·인식 타깃과 맞춤), 벽에서 누르기, 처음으로 → v3 목록
// (아래는 v2 원문 주석)
// C0 아카데미 살롱 — 올해의 메달 한 점
//   한 장면(three.js) 안에서 모두 일어난다 — 화면 전환 없음.
//   입장: 어두운 대기실의 두 짝 문이 열리고 → 열린 문간을 지나(벽을 뚫지 않는다) 천창 아래 전시실을 눈높이로 걸어 들어가 → 후보작 벽 앞에 정면으로 선다.
//   벽: 적갈색 살롱 벽에 후보작 다섯 점(11/17 전개도 최종대로 한 줄, 왼쪽부터 01–05), 둘레는 빽빽한 살롱 걸기. 역할 문장은 위에 얇게 겹친다.
//   누르면: 그 그림이 벽에서 떨어져 앞으로 나오고 카메라가 그 앞으로 미끄러진다(같은 장면). 나머지 방은 어두워진다. 끌면 돌아가고, 두 손가락으로 확대.
//   뒤로(또는 그림 바깥 누르기) → 그림이 제자리로 돌아가 걸리고 카메라가 벽 앞으로 물러난다. 다른 그림을 누른다.
//   "이 그림에 메달" → 확인 → 메달이 날아와 아래 테두리에 앉고 번호판이 이름판으로 뒤집힌다 → 이름판을 읽을 틈
//   → 메달이 한 번 반짝이고 그 자리에서 금빛이 번져 화면을 채웠다가 → 따로 한 장의 결과 화면(#s3): 금박 액자에 메달을 단 내 그림, 아래에 오늘의 다섯 점.
//   다시 고르기 → 결과 화면이 어둠으로 닫히고, 장면에서는 메달이 떠나며 그림이 벽으로 돌아가 걸린다.
//   카메라는 늘 정면(-z)을 본다. 높이는 렌즈 시프트(투영 행렬의 중심 이동)로 맞춘다 — 눈높이에 서서 큰 벽을 올려다봐도 세로선이 기울지 않는다.
//   후보작·문구: 보드 experience-v2.html C0-A, 앱 missions.ts 'salon'. 비율·인원은 예시 수치. 제목은 고른 뒤에만.
//   three.js 0.147. 텍스처 ≤1400px, 픽셀 비율 ≤2, 움직임이 없으면 그리지 않는다.
import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { $, $$, icons, sheet, toast, sleep, reduceMotion, haptic, saveChoice } from '../experience-v2/proto/js/proto-common.js';
import { buildSalon, HALL } from './salon-intro.js';
import { ZONES } from './data.js';
import { store } from './store.js';
import { collect, mountEnd, showComplete } from './done.js';

// 11/03: 벽 전체를 비춘 뒤(PICK) 벽에서 고르는 정답형. 정답 = data.js 의 correct(메르송 〈환영: 14세기의 전설〉 = n 3)
let PICK = false;
const WIN_N = ZONES.find((z) => z.id === 'salon').tasks[0].targets.findIndex((t) => t.correct) + 1;
// 11/17: 살롱 전개도 최종(261115) B 정면 5점 그대로 — 왼쪽부터 01–05, 한 줄. 그림 = 전개도의 A1 재단본(841 × 594)
const WORKS = [
  { n: 1, src: '../../experience-v3/img/salon_01.jpg', hd: '../../experience-v3/img/salon_01.jpg', w: 989,  h: 1400, title: '모성',                  artist: '레옹 페로',          year: '1873', coll: '',          shown: '1873년 살롱 출품', desc: '어머니 무릎 위에 올라선 아기와, 아기를 받쳐 안은 젊은 어머니. 비단 옷자락과 아기의 살결이 부드럽고 매끄럽게 그려졌습니다.' },
  { n: 2, src: '../../experience-v3/img/salon_02.jpg', hd: '../../experience-v3/img/salon_02.jpg', w: 989,  h: 1400, title: '세르비아의 젊은 집시',     artist: '샤를 랑델',          year: '1872', coll: '',          shown: '1873년 살롱 출품', desc: '붉은 모자에 갈색 망토를 두른 젊은 집시가 조용히 이쪽을 바라봅니다.' },
  { n: 3, src: '../../experience-v3/img/salon_03.jpg', hd: '../../experience-v3/img/salon_03.jpg', w: 1400, h: 989,  title: '환영: 14세기의 전설',     artist: '뤽 올리비에 메르송', year: '1872', coll: '릴 미술관',  shown: '1873년 살롱 출품', desc: '십자가 앞에 쓰러진 수도사 곁으로 천사들이 음악을 연주하고, 십자가의 그리스도가 한 손을 내밉니다. 중세 전설을 옮긴 그림입니다.' },
  { n: 4, src: '../../experience-v3/img/salon_04.jpg', hd: '../../experience-v3/img/salon_04.jpg', w: 989,  h: 1400, title: '봄',                    artist: '피에르 오귀스트 코트', year: '1873', coll: '메트로폴리탄', shown: '1873년 살롱 출품', desc: '숲속 그네 위의 젊은 두 연인. 매끈한 살결과 꼼꼼한 마무리로 그린 그림입니다.' },
  { n: 5, src: '../../experience-v3/img/salon_05.jpg', hd: '../../experience-v3/img/salon_05.jpg', w: 989,  h: 1400, title: '독서하는 돈키호테',        artist: '셀레스탱 낭퇴유',     year: '1873', coll: '',          shown: '1873년 살롱 출품', desc: '기사 이야기를 읽다 말고 칼을 치켜든 늙은 돈키호테. 책상 위에는 펼친 책, 발치에는 투구와 갑옷이 흩어져 있습니다.' },
];
// 벽에 거는 자리 — 전개도 그대로 한 줄. 그림 가운데 높이가 모두 같다(바닥에서 2,030mm)
//   액자 바깥(전개도): 700 · 740 · 971 · 754 · 700mm, 사이 57 · 30 · 3 · 3mm → 배치 폭 3,958mm. 아래 HANG_X = 액자 가운데(덩어리 가운데 기준, m)
//   그림 크기: A1 재단 841mm에서 사방 7mm 물림 → 보이는 긴 변 0.827m
//   11/17 저녁: 둘레 채움 그림보다 너무 작아 보여서 배치 비율은 그대로 두고 1.4배로 키움(가운데 높이 2.2m — 아래 이름표가 징두리 위에 오게)
const HANG_X_REAL = [-1.629, -0.852, 0.0335, 0.899, 1.629], HANG_Y_REAL = 2.03, CANVAS_REAL = 0.827;   // 실제 벽(전개도) 그대로
const WALL_K = 1.4, HANG_X = HANG_X_REAL.map((x) => x * WALL_K), HANG_Y = 2.2, CANVAS_LONG = CANVAS_REAL * WALL_K;
// 고르는 화면(벽을 비춘 뒤 PICK) — 세로 화면에서 크게 보고 비교하도록 2 · 1 · 2 로 벽 앞으로 나와 선다(방은 조금 어두워짐)
const PICK_ROWS = [[0, 1], [2], [3, 4]], PICK_S = 1.0, PICK_Z = 0.9, PICK_GX = 0.5, PICK_GY = 0.7, PICK_CY = 3.3;   // 11/24 줄 간격 0.42→0.7(큰 이름표 자리)
const TODAY = { 1: 9, 2: 27, 3: 18, 4: 39, 5: 7 };   // 예시 수치
const JURY = '1,284';
const stampLine = (total, at = new Date()) => `오늘 ${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')} 기준 · ${total}명 · 수치는 예시`;

// 메달 — 금 원반, 월계관 두 가지, 가운데 연도. 이모지 없음. id 는 그라데이션 충돌을 피하려고 자리마다 다르게
function medalSVG(id, year = true, vb = '0 0 100 100') {
  // 주조 메달 — 작은 크기에서도 깨지지 않게: 가는 선 없이 면으로, 잎은 적고 크게, 글자는 돋을새김(밝은 그림자 한 겹)
  const leaves = [];
  for (let i = 0; i < 6; i++) {
    for (const deg of [104 + i * 15, 76 - i * 15]) {
      const a = deg * Math.PI / 180, cx = 50 + Math.cos(a) * 28.5, cy = 56 + Math.sin(a) * 28.5;
      leaves.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="3.3" ry="6.6" transform="rotate(${(deg + (deg > 90 ? 28 : -28)).toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})" fill="url(#${id}l)"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" shape-rendering="geometricPrecision" aria-hidden="true">
    <defs>
      <radialGradient id="${id}g" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="#FFF5CC"/><stop offset=".38" stop-color="#EFC965"/><stop offset=".78" stop-color="#C4922C"/><stop offset="1" stop-color="#8A6216"/></radialGradient>
      <linearGradient id="${id}r" x1=".15" y1="0" x2=".85" y2="1"><stop offset="0" stop-color="#FFF0B4"/><stop offset=".45" stop-color="#D2A443"/><stop offset="1" stop-color="#6E4A0E"/></linearGradient>
      <linearGradient id="${id}l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F7DC8C"/><stop offset="1" stop-color="#A57826"/></linearGradient>
    </defs>
    <path d="M39 1 h22 v15 l-11 -5 l-11 5 z" fill="#A61F2A"/><path d="M47 1 h6 v12.4 l-3 -1.4 l-3 1.4 z" fill="#E7C66E"/>
    <circle cx="50" cy="56" r="43" fill="url(#${id}r)"/>
    <circle cx="50" cy="56" r="37.5" fill="#7C5612"/>
    <circle cx="50" cy="56.6" r="36.6" fill="url(#${id}g)"/>
    ${leaves.join('')}
    ${year ? `<g font-family="Georgia, 'Times New Roman', serif" font-weight="700" text-anchor="middle">
      <text x="50" y="53.6" font-size="9.5" letter-spacing="1.4" fill="#FFF3C6" opacity=".7">SALON</text><text x="50" y="53" font-size="9.5" letter-spacing="1.4" fill="#5A3B08">SALON</text>
      <text x="50" y="70.6" font-size="14.5" letter-spacing=".6" fill="#FFF3C6" opacity=".7">1873</text><text x="50" y="70" font-size="14.5" letter-spacing=".6" fill="#4A3008">1873</text></g>` : ''}
  </svg>`;
}

icons();
$('#cardMedal').innerHTML = medalSVG('k');
$('#awardMedal').innerHTML = medalSVG('a', false);
// 역할 문장은 한 글자씩 타이핑된다 — 글자마다 span(자리는 처음부터 잡혀 있어 줄바꿈이 흔들리지 않는다)
(() => {
  const h1 = $('.role h1'); let k = 0;
  h1.innerHTML = h1.innerHTML.split(/(<br>)/).map((part) => (part === '<br>' ? part : part.split(' ').map((w) => { const c = [...w].map((ch) => `<span class="ch" style="--k:${k++}">${ch}</span>`).join(''); return /[A-Za-z\uAC00-\uD7A3]/.test(w) ? `<span class="w" style="white-space:nowrap">${c}</span>` : c; }).join(' '))).join('');
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
const stage = $('#stage'), cv = $('#gl'), dock = $('#dock'), gest = $('#gest'), award = $('#award'), roleEl = $('#role');
let wallT0 = 0;   // 벽에 선 시각 — 테두리 빛이 이때부터 차례로
const setMode = (m) => { if (m === 'wall' && mode !== 'wall') wallT0 = performance.now(); mode = m; stage.dataset.mode = m; };
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
const unitPlane = new T.PlaneGeometry(1, 1);
const PLATE_K = 2.6, PLATE_DROP = 0.24;    // 번호판: 어느 액자든 벽에서 같은 크기(0.52m), 액자 아래 0.24m
const texLoads = [];
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
  // 벽의 빛 웅덩이(장면에 직접 — 액자와 같이 움직이지 않는다)
  const pool = new T.Mesh(unitPlane, new T.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
  scene.add(pool);
  return { w, i, g, pw, ph, ow: pw + 2 * M, oh: ph + 2 * M, mats, paint, plate, plateFace, brass, titlePlate, tpFace, TPW, TPH, tpOn: false, glow, glowV: 0, glowT: 0, pool,
    hx: 0, hy: 0, s: 1, zb: 0, lift: 0, act: 0, k: -1 };
}
const frames = WORKS.map(buildFrame);
// 11/17: 정답(〈환영〉)에만 — 액자 뒤에서 가장자리로 은은하게 새어 나오는 빛(액자에 붙어서, 바깥으로 짧게 흐려짐). 다른 그림에는 없다
// 11/24 정답 그림 오라 — 게임에서 고른 아이템처럼 액자 둘레를 따라 빛이 일렁이며 흐른다(셰이더).
//   네모난 후광판 · 빛살은 뺐다. 액자 모서리를 둥글게 따라가는 거리 + 둘레를 도는 잡음 → 가장자리에서 진하고 바깥으로 짧게 번짐
const AURA = (() => {
  const f = frames[WIN_N - 1], P = 0.7, w = f.ow + 2 * P, h = f.oh + 2 * P;
  const mat = new T.ShaderMaterial({
    uniforms: { t: { value: 0 }, op: { value: 0 }, hs: { value: new T.Vector2(f.ow / 2, f.oh / 2) }, size: { value: new T.Vector2(w, h) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float t, op; uniform vec2 hs, size; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { v += a * noise(p); p *= 2.0; a *= 0.5; } return v; }
      void main(){
        vec2 p = (vUv - 0.5) * size;
        float r = 0.06; vec2 q = abs(p) - hs + r; float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;   // 액자 둘레까지 거리(밖 +)
        if (d < -0.02) discard;
        float ang = atan(p.y, p.x);
        float n = fbm(vec2(ang * 2.2 + t * 0.35, d * 5.0 - t * 0.9));            // 둘레를 따라 돌며 바깥으로 흘러 나가는 결
        float n2 = fbm(vec2(-ang * 3.1 + t * 0.22, d * 9.0 - t * 1.4));
        float core = exp(-max(d, 0.0) * 14.0);                                   // 가장자리 바로 바깥 진한 빛
        float flame = exp(-max(d, 0.0) * 3.0) * smoothstep(0.3, 0.8, n * 0.7 + n2 * 0.5) * (1.0 - smoothstep(0.45, 0.68, d));   // 바깥으로 일렁이는 혀
        float a = clamp(core * 0.9 + flame * 1.15, 0.0, 1.0) * op;
        vec3 col = mix(vec3(1.0, 0.62, 0.22), vec3(1.0, 0.93, 0.72), core);
        gl_FragColor = vec4(col * a, a);
      }`,
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
  });
  const m = new T.Mesh(new T.PlaneGeometry(w, h), mat); m.position.z = -0.077; f.g.add(m); return m;
})();
// 이름표 — 벽에서 각 그림 아래: 제목 · 화가, 연도(번호 대신)
const _lp = new T.Vector3(), _lp2 = new T.Vector3();
frames.forEach((f) => {
  const el = document.createElement('div'); el.className = 'lb';
  el.innerHTML = `<b>${f.w.title}</b><small>${[f.w.artist, f.w.year].filter(Boolean).join(', ')}</small>`;
  $('#labels').appendChild(el); f.lab = el;
});
// 거는 자리 — 벽(W): 전개도 위치 그대로 한 줄 · 고르는 화면(P): 2 · 1 · 2 로 벽 앞에. f.hx · hy · s · zb 는 지금 자리(둘 사이를 오간다)
frames.forEach((f, i) => {
  const s = CANVAS_LONG / Math.max(f.pw, f.ph); f.W = { x: HANG_X[i], y: HANG_Y, s, z: 0.08 * s };   // z = 뒤판이 벽에 닿는 깊이
  f.F = f.W;   // 옮겨 가기 시작하는 자리(가상 살롱 벽의 한 줄)
});
(() => {
  const hs = (i) => frames[i].oh * PICK_S, ws = (i) => frames[i].ow * PICK_S;
  const tot = PICK_ROWS.reduce((a, r) => a + Math.max(...r.map(hs)), 0) + PICK_GY * (PICK_ROWS.length - 1);
  let y = PICK_CY + tot / 2;
  PICK_ROWS.forEach((r) => {
    const hR = Math.max(...r.map(hs)), wR = r.reduce((a, i) => a + ws(i), 0) + PICK_GX * (r.length - 1);
    let x = -wR / 2;
    r.forEach((i) => { frames[i].P = { x: x + ws(i) / 2, y: y - hR / 2, s: PICK_S, z: PICK_Z }; x += ws(i) + PICK_GX; });
    y -= hR + PICK_GY;
  });
})();
let pickK = 0, pickT = 0;
function poseAt(k) {   // (eio · lerp 는 아래에서 정의 — 처음 부를 때를 위해 여기서 직접 계산)
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, L = (a, b) => a + (b - a) * e;
  frames.forEach((f) => {
    const A = f.F, B = f.P;
    f.hx = L(A.x, B.x); f.hy = L(A.y, B.y); f.s = L(A.s, B.s); f.zb = L(A.z, B.z);
    f.plate.scale.setScalar(PLATE_K / f.s); f.plate.position.set(0, -f.oh / 2 - PLATE_DROP / f.s, -0.05);
    f.pool.position.set(f.hx, f.hy + 0.1 * f.s, 0.008); f.pool.scale.set(f.ow * f.s * 1.9, f.oh * f.s * 1.8, 1);
  });
}
poseAt(0);
// 후보작 덩어리의 사각형(월드) — 벽 카메라가 이것을 화면에 맞춘다(아래 번호판까지)
function clOf(k) {
  const q = frames.map((f) => f[k]);
  const x0 = Math.min(...frames.map((f, i) => q[i].x - f.ow * q[i].s / 2)), x1 = Math.max(...frames.map((f, i) => q[i].x + f.ow * q[i].s / 2));
  const y0 = Math.min(...frames.map((f, i) => q[i].y - f.oh * q[i].s / 2)) - PLATE_DROP - 0.12 - (k === 'P' ? 0.5 : 0), y1 = Math.max(...frames.map((f, i) => q[i].y + f.oh * q[i].s / 2));   // 11/24 고르는 화면: 아랫줄 이름표 자리까지
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, z: k === 'P' ? PICK_Z + 0.02 : 0.1 };
}
let CL = clOf('W');
// 채움 그림이 비켜 갈 자리 — 후보작 한 줄 띠
const AVOID = [{ x0: CL.cx - CL.w / 2 - 0.25, x1: CL.cx + CL.w / 2 + 0.25, y0: CL.cy - CL.h / 2 - 0.15, y1: CL.cy + CL.h / 2 + 0.2 }];
const salon = buildSalon(scene, { aniso: ANISO, avoid: AVOID, kick: () => kick() });


function titleTex(f) {
  const W2 = 1024, H2 = Math.round(W2 * f.TPH / f.TPW);
  return canvasTex(W2, H2, (c) => {
    const gr = c.createLinearGradient(0, 0, 0, H2); gr.addColorStop(0, '#F4DB92'); gr.addColorStop(0.5, '#C9A14A'); gr.addColorStop(1, '#8E6A26'); c.fillStyle = gr; c.fillRect(0, 0, W2, H2);
    c.strokeStyle = 'rgba(70,45,8,.55)'; c.lineWidth = 5; c.strokeRect(12, 12, W2 - 24, H2 - 24);
    c.fillStyle = '#2E1F05'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const fit = (txt, wt, px) => { let s = px; do { c.font = `${wt} ${s}px Freesentation, "Apple SD Gothic Neo", sans-serif`; s -= 2; } while (c.measureText(txt).width > W2 - 90 && s > 20); };
    const t1 = `〈${f.w.title}〉`, t2 = [f.w.artist, f.w.year].filter(Boolean).join(' · ');
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
  img.onload = () => { faceMat.map = canvasTex(512, 512, (c) => c.drawImage(img, 0, 0, 512, 512)); faceMat.needsUpdate = true; kick(); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(medalSVG('g', true, '7 13 86 86'));
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
const THUD = { t0: -1e9 }, FLIP = { f: null, t0: 0 }, GLINT = { t0: -1e9, k: 1 };   // GLINT.k: 별빛 크기(결과로 넘어갈 때 더 크게)
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
  if (k === 'door') {   // 11/17 팔레 드 랭뒤스트리 정문 — 기둥 둘 · 아치 · 글씨 띠 · 처마까지 한 화면에
    return fit({ cx: 0, cy: 4.35, w: 5.0, h: 9.0, z: HALL.L + 0.7 }, { l: 0, r: W, t: H * 0.06, b: H * 0.97 }, HALL.EYE);
  }
  if (k === 'wall') {   // 후보작 벽 — 역할 문장 아래부터 안내 위까지, 눈높이에서 정면
    const rb = roleEl.getBoundingClientRect(), top = Math.max(safeT + 96, rb.bottom - stage.getBoundingClientRect().top + 14);
    // 11/17 고르는 화면(세로 2 · 1 · 2): 위 글과 겹치지 않게 넉넉히 띄우고, 아래엔 안내가 없으니 바닥까지 쓴다 — 위아래 여백을 맞춘다
    if (PICK) return fit(CL, { l: 22, r: W - 22, t: rb.bottom - stage.getBoundingClientRect().top + 26, b: H - safeB() - 18 }, HALL.EYE);
    return fit(CL, { l: 30, r: W - 30, t: top, b: H - (window.__salonGuideH || 96) - safeB() }, HALL.EYE);
  }
  if (k === 'near') {   // v3: 카메라로 넘어갈 때 벽으로 한 걸음 다가간다
    const c = { ...camFor('wall') }; c.z = c.tz + (c.z - c.tz) * 0.5; return shift(c);
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
  // 11/17: 메달 이름판 자리(0.26)는 메달 연출을 뺀 뒤 안 써서 없앰 — 액자는 위 안내(끌어서 돌려 보기)와 아래 설명 글 사이 정가운데
  const rect = { l: W * 0.06, r: W * 0.94, t: safeT + 88, b: H - dock.offsetHeight - ($('#fcap').offsetHeight || 0) - 22 };
  const z = f.zb + 0.5 * (cam.z - f.zb), ppm = pxPerM(z);
  const k = Math.min((rect.r - rect.l) / (f.ow * f.s * ppm), (rect.b - rect.t) / (f.oh * f.s * ppm));
  const p = screenToWorld((rect.l + rect.r) / 2, (rect.t + rect.b) / 2, z);
  return { x: p.x, y: p.y, z, s: f.s * k };
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
  const tk = (now - THUD.t0) / 520, thud = tk > 0 && tk < 1 ? Math.sin(tk * Math.PI * 2.5) * Math.exp(-tk * 4.2) : 0;
  const dk = eio(dimV);
  applyCam();
  if (fi >= 0 && (mode === 'focus' || mode === 'placed')) frames[fi].fp = focusPose(frames[fi]);
  frames.forEach((f, i) => {
    const sHome = f.s, zHome = f.zb, a = f.act, P = f.fp, me = i === fi;
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
    f.pool.material.opacity = (1 - 0.8 * dk) * (1 - pickK);
    f.plate.visible = false; f.titlePlate.visible = f.tpOn;   // 번호판은 쓰지 않는다 — 벽에서는 아래 이름표(글자), 메달을 주면 이름판
    const inv = f.inv || 0;
    // 11/17: 정답(〈환영〉)에만 뒤로 금빛 후광 — 숨 쉬듯 천천히(쉽게 맞추도록)
    f.glow.material.opacity = f.glowV * 0.75 + inv * 0.5;
    if (f.w.n === WIN_N) {   // 11/24 정답: 액자 둘레를 따라 오라가 일렁이며 흐른다(고르는 화면에서 더 진하게)
      AURA.material.uniforms.t.value = now / 1000;
      AURA.material.uniforms.op.value = mode !== 'intro' ? 0.55 + 0.45 * eio(pickK) : 0;
    }
    f.mats.rim.emissive.setRGB(0.32, 0.22, 0.05).multiplyScalar(f.glowV * 0.5 + inv * 0.45 + (f.w.n === WIN_N && mode !== 'intro' ? 0.35 + 0.3 * (0.5 + 0.5 * Math.sin(now / 650)) : 0));
    f.mats.bead.emissive.setRGB(0.3, 0.2, 0.04).multiplyScalar(inv * 0.5);
    // 이름표 — 벽의 제자리 아래(그림이 앞으로 나와도 이름표는 벽에 남는다)
    if (f.lab) f.lab.style.visibility = PICK && pickK > 0.98 ? 'visible' : 'hidden';   // 11/17: 가로 한 줄 벽에서는 이름표 없음(좁아서 줄바꿈이 깨짐) — 세로로 다 옮겨 간 뒤에만
    if (f.lab) {
      _lp.set(f.hx + f.ow * f.s / 2, f.hy - f.oh * f.s / 2 - 0.05, f.zb).project(camera); const xr = (_lp.x + 1) / 2 * W;
      _lp.set(f.hx, f.hy - f.oh * f.s / 2 - 0.05, f.zb).project(camera);
      const lw = Math.round(2 * (xr - (_lp.x + 1) / 2 * W));   // 한 줄 다섯 점 — 이름표 폭을 액자 폭에 맞춰 줄바꿈(옆 이름표와 겹치지 않게)
      // 11/24 이름표 폭: 같은 줄 옆 그림과의 중심 거리까지(겹치지 않는 데까지 넓게) · 가운데 한 점은 넉넉히
      const mateI = { 0: 1, 1: 0, 3: 4, 4: 3 }[frames.indexOf(f)], cx0 = (_lp.x + 1) / 2 * W;
      let room = 250;
      if (mateI != null) { const m2 = frames[mateI]; _lp2.set(m2.hx, m2.hy, m2.zb).project(camera); room = Math.abs((_lp2.x + 1) / 2 * W - cx0) - 8; }
      const lw2 = Math.round(Math.max(lw + 12, Math.min(room, 230)));
      if (f.labW !== lw2) { f.labW = lw2; f.lab.style.width = lw2 + 'px'; }
      f.lab.style.transform = `translate(${((_lp.x + 1) / 2 * W).toFixed(1)}px, ${((1 - _lp.y) / 2 * H).toFixed(1)}px) translateX(-50%)`;
    }
  });
  salon.dim((1 - 0.7 * dk) * (1 - 0.72 * eio(pickK)));   // 고르는 화면: 둘레 그림을 많이 낮춰 다섯 점 · 이름표가 또렷하게
  // 메달은 고른 액자에 붙은 채
  if (MED.f && MED.dir !== 2) { medal.visible = MED.dir !== 0; medal.scale.setScalar(MED.sc * (1 + 0.14 * Math.max(0, thud))); }
  camera.position.y += 0.006 * thud;
  // 반사광 — 앞으로 나온 그림 앞, 아니면 벽 앞
  if (MED.dir !== 2) {
    const f = fi >= 0 ? frames[fi] : null, a = f ? f.act : 0, fs = f ? f.g.scale.x : 1;
    const bx = lerp(CL.cx, f ? f.g.position.x : CL.cx, a), by = lerp(CL.cy + 1.5, f ? f.g.position.y + 0.7 * fs : CL.cy, a);
    const bz = Math.min(cam.z - 0.3, lerp(4.5, f ? f.g.position.z + 2.2 * fs : 4.5, a));
    spec.position.set(bx + specX * lerp(1.1, 0.55 * fs, a), by, bz);
  }
  stage.classList.toggle('zoomed', zoom > 1.04);
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
const TL = { doors: [120, 700], walk: [480, 1950], air: [380, 950], airOut: [1550, 2000], sweep: [1600, 2000], role: 1650, end: 2000 };   // 11/23 2초 안(문 열림 → 걸어 들어감 → 벽 앞)   // 11/23 압축(전: doors 350–1650 · walk 1250–4300 · end 4500)
// 11/23 짧은 도입: 장면은 모두 두고(문 열림 → 걸어 들어감 → 벽 앞) 구간마다 시간을 줄임(4.5초 → 3.2초)
let tI = 0, speed = (window.M100_INTRO && window.M100_INTRO.speed) || 1, roleShown = false, introCams = null;
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
    window.dispatchEvent(new CustomEvent('salon:wall'));
    (window.M100_INTRO || { mode: 'normal', ended() {} }).ended();   // 11/20: 도입만 보기(앱 구역 화면)면 여기서 알림
    return false;
  }
  return true;
}
function skipIntro() { if (mode === 'intro') speed = Math.max(speed, 6); }

function step(dt, now) {
  let busy = !!g;
  if (mode === 'intro') busy = stepIntro(dt, now) || busy;
  // 회전 — 앞으로 나온 그림은 자유롭게 돌려 본다(손을 떼면 관성으로 조금 더 돌다 그 자리에 멈춘다, 정면으로 끌려가지 않는다).
  //   벽으로 돌아갈 때 · 메달을 줄 때 · 두 번 탭에만 정면으로(넘치지 않게)
  if (!g || g.type !== 'one' || g.mode !== 'rotate') {
    if (mode === 'focus' && !homing) {
      const fr = Math.exp(-dt * 3.2);
      yaw += yawV * dt; pitch += pitchV * dt; yawV *= fr; pitchV *= fr;
      if (Math.abs(pitch) > PLIM) { pitch = Math.sign(pitch) * PLIM; pitchV = 0; }
      if (Math.abs(yaw) > YLIM) { yaw = Math.sign(yaw) * YLIM; yawV = 0; }
      if (Math.abs(yawV) + Math.abs(pitchV) > 0.002) busy = true; else yawV = pitchV = 0;
    } else {
      const K = 40, C = 2 * Math.sqrt(K);
      [yaw, yawV] = spring(yaw, yawV, 0, K, C, dt); [pitch, pitchV] = spring(pitch, pitchV, 0, K, C, dt);
      if (Math.abs(yaw) + Math.abs(pitch) + Math.abs(yawV) + Math.abs(pitchV) > 0.0006) busy = true; else { yaw = pitch = yawV = pitchV = 0; homing = false; }
    }
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
    const on = i === fi && (mode === 'focus' || mode === 'placed' || mode === 'reveal');
    const lT = on ? LIFT : 0, aT = on ? 1 : 0;
    f.lift += (lT - f.lift) * ef; f.act += (aT - f.act) * ef;
    if (Math.abs(lT - f.lift) > 0.002 || Math.abs(aT - f.act) > 0.002) busy = true; else { f.lift = lT; f.act = aT; }
  });
  dimV += (dimT - dimV) * ef; if (Math.abs(dimT - dimV) > 0.002) busy = true; else dimV = dimT;
  if (pickK !== pickT) { const st = reduceMotion ? 1 : dt / 1.4; pickK = pickT > pickK ? Math.min(pickT, pickK + st) : Math.max(pickT, pickK - st); poseAt(pickK); busy = true; }   // 1.4초 — 카메라 이동과 같은 박자(움직임 곡선은 poseAt 안)
  frames.forEach((f) => { const e = 1 - Math.exp(-dt * 6); f.glowV += (f.glowT - f.glowV) * e; if (Math.abs(f.glowT - f.glowV) > 0.003) busy = true; else f.glowV = f.glowT; });
  // 벽에 서 있는 동안 — 금박 테두리에 빛이 위에서부터 차례로 번졌다 사라진다(누를 수 있다는 신호, 글 안내 대신)
  const inviting = mode === 'wall' && !reduceMotion, wt = now - wallT0 - 700;
  frames.forEach((f) => { f.inv = 0; });   // 11/17: 액자마다 차례로 빛나던 효과는 뺌(가운데 〈환영〉의 선만 남김)
  if (inviting) busy = true;
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
    const k = (now - GLINT.t0) / (640 * GLINT.k);
    if (k >= 1) { glint.visible = false; glint.material.opacity = 0; spec.intensity = 0.9; }
    else { const s = Math.sin(clamp(k, 0, 1) * Math.PI); glint.material.opacity = s; glint.material.rotation = k * 0.9; glint.scale.setScalar((0.08 + 0.34 * s) * GLINT.k * (MED.f ? MED.f.g.scale.x : 1)); spec.intensity = 0.9 + 2.4 * s; busy = true; }
  }
  return busy;
}

const _v = new T.Vector3(), _w = new T.Vector3();
function screenToWorld(x, y, z) {   // 화면 점(px) → 깊이 z 평면 위의 월드 점
  _v.set((x / W) * 2 - 1, -(y / H) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
  return camera.position.clone().addScaledVector(_v, (z - camera.position.z) / _v.z);
}
const MED_Y = (f) => -(f.ph / 2 + M * 0.55), MED_Z = 0.088;
// 메달 위의 별빛 — 앉는 순간(k 1) · 결과로 넘어가기 직전(k 1.6, 더 크고 길게)
function glintAt(f, now, k) {
  if (reduceMotion) return;
  GLINT.t0 = now; GLINT.k = k; glint.visible = true;
  f.g.updateMatrixWorld(true); f.g.localToWorld(glint.position.set(-MR * 0.45, MED_Y(f) + MR * 0.5, MED_Z + 0.05)); kick();
}
function stepMedal(now) {
  const f = MED.f; if (!f) return false;
  const yEnd = MED_Y(f), zEnd = MED_Z;
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
      glintAt(f, now, 1);
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
const KPX = LIM / 110, KYAW = Math.PI / 420, YLIM = 60 * Math.PI / 180, PLIM = 35 * Math.PI / 180;   // 좌우 60° · 위아래 35°까지(뒷면은 보이지 않게), 그 안에서는 놓은 자리에 멈춘다
let homing = false;
const ray = new T.Raycaster();
function hitFrame(p, list) {
  ray.setFromCamera(new T.Vector2((p.x / W) * 2 - 1, -(p.y / H) * 2 + 1), camera);
  let best = null;
  // 보이는 액자·그림만(뒤의 금빛 후광 판 · 숨긴 판은 빼고) — 그래야 그림 바깥 빈 곳을 누르면 벽으로 돌아간다
  list.forEach((f) => { const h = ray.intersectObject(f.g, true).find((x) => x.object.visible && x.object !== f.glow && x.object !== AURA && !(x.object.material && x.object.material.transparent && x.object.material.opacity === 0)); if (h && (!best || h.distance < best.d)) best = { f, d: h.distance }; });
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
  // v3: 입장이 끝난 벽에서 화면을 누르면 카메라로(벽 위 그림 고르기 대신 현장의 그림을 비춘다) — salon-ar.js
  //     11/03: 벽 전체를 비추고 나면(PICK) 이 벽에서 직접 한 점을 눌러 고른다
  if (mode === 'wall' && !PICK) { e.preventDefault(); window.dispatchEvent(new CustomEvent('salon:tap')); return; }
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
      /* 11/17: 확인 단계를 없앴으니 그림을 한 번 눌러서는 고르지 않는다(단추로만) */
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
    homing = false;
    yaw = clamp(g.yaw0 + dx * KYAW, -YLIM, YLIM);
    pitch = clamp(g.pitch0 + dy * KYAW * 0.6, -PLIM, PLIM);
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
    if (a.t0 - lastTap.t < 450 && Math.hypot(a.x0 - lastTap.x, a.y0 - lastTap.y) < 40) { resetView(); homing = true; lastTap.t = 0; kick(); return; }
    lastTap = { t: now, x: a.x0, y: a.y0 };
    // 그림 바깥을 누르면 벽으로(확대 중에는 아님)
    if (zoom <= 1.04 && !hitFrame({ x: a.x0, y: a.y0 }, [frames[fi]])) { setTimeout(() => { if (lastTap.t === now && mode === 'focus') toWall(); }, 260); }
    kick(); return;
  }
  if (a.mode === 'rotate' && a.moved && !reduceMotion) {   // 던지면 관성으로 조금 더 돈다(되돌아오지 않는다)
    const s0 = a.samples[0], s1 = a.samples[a.samples.length - 1], dtm = Math.max(16, s1.t - s0.t);
    yawV = clamp((s1.x - s0.x) / dtm * 1000 * KYAW, -9, 9); pitchV = clamp((s1.y - s0.y) / dtm * 1000 * KYAW * 0.6, -4, 4);
  } else { yawV = pitchV = 0; }
  kick();
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
function resetView() { zoomT = 1; panXT = 0; panYT = 0; yawV = pitchV = 0; }

// ── 벽 ↔ 그림 앞 — 같은 장면 안에서. 그림이 벽에서 떨어져 앞으로 나오고 카메라가 그 앞으로, 방은 어두워진다
function focus(i) {
  if (mode !== 'wall') return;
  fi = i; setMode('focus'); haptic(10);
  $('#wallTitle').textContent = WORKS[i].title;
  // 앞으로 나온 그림 아래 해설 — 무엇을 그렸는지만(당시 평가 · 수상은 말하지 않는다)
  $('#fcT').textContent = `〈${WORKS[i].title}〉`; $('#fcM').textContent = `${WORKS[i].artist} · ${WORKS[i].year}`; $('#fcD').textContent = WORKS[i].desc;
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
$('#otherBtn').addEventListener('click', () => { if (mode === 'focus') toWall(); });
$('#back2').addEventListener('click', () => { if (mode === 'focus') toWall(); else if (mode === 'reveal') again(); });

// ── 메달 → 확인
const confirm = sheet($('#confirm'));
async function placeMedal() {
  if (mode !== 'focus') return;
  setMode('placed'); chosen = frames[fi];
  hideGest(); resetView();
  chosen.glowT = 1; if (!reduceMotion) glintT0 = performance.now();
  haptic(14); kick();
  // 11/17: '당선작으로 고를까요?' 확인 없이 바로 — 정답이면 완료, 아니면 그 그림의 심사평
  await sleep(reduceMotion ? 100 : 420);
  if (mode !== 'placed') return;
  if (PICK && chosen.w.n !== WIN_N) return wrongPick(chosen);
  reveal(award);
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
$('#cfOk').addEventListener('click', () => {
  if (mode !== 'placed') return;
  if (PICK && chosen.w.n !== WIN_N) return wrongPick(chosen);   // 11/03: 정답형 — 아니면 심사평을 보이고 벽으로
  reveal($('#cfOk'));
});
// 아닌 그림 — 그 그림의 심사평(기획안) → [다른 그림 고르기] = 벽으로
const wrongSheet = sheet($('#wrong'));
function wrongPick(f) {
  confirm.close();
  const t = ZONES.find((z) => z.id === 'salon').tasks[0].targets[f.w.n - 1];
  $('#wrT').textContent = `〈${f.w.title}〉`;
  $('#wrB').textContent = (t?.feedback || '').replace(/^심사평 — /, '').replace(/\n?다른 작품을 심사해보세요\.?\s*$/, '');   // 할 일은 아래 단추가 말한다
  wrongSheet.open(); haptic(8);
}
$('#wrOk').addEventListener('click', () => {
  wrongSheet.close();
  if (mode === 'placed') { chosen.glowT = 0; chosen = null; setMode('focus'); toWall(); }
});

// ── 메달 → 결과
//   메달이 날아와 앉고 번호판이 이름판으로 뒤집힌다 → 이름판을 읽을 틈 → 메달이 한 번 크게 반짝이고, 둘레가 어두워지며
//   메달 자리에서 금빛이 번져 화면을 채운다 → 그 빛이 가라앉으며 결과 화면(#s3). 장면은 그 뒤에서 그대로 멈춰 있다.
let revSeq = 0;
function showTitle(f) {
  if (!f.tpFace.map) { f.tpFace.map = titleTex(f); f.tpFace.needsUpdate = true; }
  FLIP.f = f; FLIP.t0 = performance.now(); f.titlePlate.scale.set(0.32, 1, 1); f.titlePlate.rotation.x = -Math.PI / 2; kick();
}
function hideTitles() { frames.forEach((f) => { f.tpOn = false; f.plate.rotation.x = 0; f.titlePlate.rotation.x = 0; }); FLIP.f = null; kick(); }
function countUp(el, to, ms, delay = 0) {
  if (reduceMotion) { el.textContent = to; return; }
  el.textContent = '0';
  const t0 = performance.now() + delay; const tick2 = (now) => { const p = clamp((now - t0) / ms, 0, 1); el.textContent = Math.round(to * eo(p)); if (p < 1) requestAnimationFrame(tick2); }; requestAnimationFrame(tick2);
}
async function reveal(fromEl) {
  setMode('reveal');
  const me = chosen, seq = ++revSeq;
  confirm.close();
  if (document.fonts) await Promise.race([document.fonts.load('700 40px Freesentation', '가'), sleep(300)]).catch(() => {});
  if (!me.tpFace.map) { me.tpFace.map = titleTex(me); me.tpFace.needsUpdate = true; }
  fillResult(me);
  // 11/06: 메달이 날아와 앉는 연출은 뺀다(당선작 고르기) — 정답이면 바로 공통 완료 화면
  if (winDone) { await sleep(reduceMotion ? 0 : 200); winDone(); winDone = null; haptic(10); return; }
  await flyMedal(fromEl);
  if (seq !== revSeq) return;
  await sleep(reduceMotion ? 0 : 240);
  showTitle(me); haptic(10);
  await sleep(reduceMotion ? 900 : 720 + 1300);
  if (seq !== revSeq || mode !== 'reveal') return;
  await toResult(me, seq);
}

// ── 결과 화면(#s3) — 금박 액자에 메달을 단 내 그림 하나를 크게, 아래에 오늘의 다섯 점(많이 고른 순)
const res = $('#s3'), xf = $('#xfade');
$('#resMedal .m-svg').innerHTML = medalSVG('h');
const RANK = WORKS.map((w) => ({ w, p: TODAY[w.n] })).sort((a, b) => b.p - a.p), MAXP = RANK[0].p;
// 그림 크기 — 화면 높이에 맞춰(390×844 에서 세로 약 210px, 375×667 에서도 170px), 가로는 액자 두께를 빼고
function sizeHero(w) {
  const vw = Math.min(window.innerWidth, 480), vh = window.innerHeight;
  const maxW = Math.min(vw - 40 - 36 - 28, 320), maxH = clamp(vh - 636, 170, 300), a = w.w / w.h;
  const iw = a > maxW / maxH ? maxW : maxH * a, ih = iw / a, img = $('#resImg');
  img.style.width = iw.toFixed(1) + 'px'; img.style.height = ih.toFixed(1) + 'px';
}
let resWork = null, winDone = null;
function fillResult(me) {
  const w = me.w; resWork = w;
  const t = ZONES.find((z) => z.id === 'salon').tasks[0];
  const img = $('#resImg'); img.src = w.hd; sizeHero(w);
  $('#resTitle').textContent = `〈${w.title}〉`;
  $('#resMeta').textContent = [w.artist, w.year].filter(Boolean).join(' · ');
  const line = $('#resLine'); line.classList.add('plan'); line.textContent = t.successBody;
  if (!$('.res-verdict')) {
    line.insertAdjacentHTML('afterend', `<p class="res-verdict"></p><p class="res-after"></p>`);
    $('.res-verdict').textContent = t.successVerdict; $('.res-after').textContent = t.after;
  }
  // 11/03: 수집품은 정답과 함께 저절로 → 끝 줄 [목록으로 | 다음 미션] · 체험 더보기(후보작 하나씩 살펴보기)
  if (w.n === WIN_N) {
    collect('salon');
    mountEnd($('.res-btns'), 'salon', { item: t.item });   // 11/17: 체험 더보기(후보작 하나씩 비추기 = 예전 방식) 뺌
    // 11/06: 미션 완료는 구역 공통 화면 — 금빛이 번진 자리에서 이 판이 덮는다(toResult)
    winDone = () => showComplete('salon', { item: t.item, title: `〈${w.title}〉 · ${[w.artist, w.year].filter(Boolean).join(', ')}`, body: `${t.successBody}\n\n${t.successVerdict}`, note: t.after });   // 11/17: 체험 더보기 뺌
  }
}
window.addEventListener('resize', () => { if (resWork) sizeHero(resWork); });
function medalScreen() {
  const v = new T.Vector3(); medal.getWorldPosition(v); v.project(camera);
  return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H };
}
function resIn() {
  res.scrollTop = 0; $('#resScroll').scrollTop = 0;
  res.classList.remove('in'); void res.offsetWidth; res.classList.add('in');
}
async function toResult(me, seq) {
  if (reduceMotion) {
    if (winDone) { winDone(); winDone = null; return; }
    screenOn('s3', true); resIn();
    await res.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260 }).finished.catch(() => {});
    return;
  }
  // 메달이 한 번 크게 반짝이고 → 둘레가 어두워지며(메달만 남는다) → 메달 자리에서 금빛이 번져 화면을 채운다
  glintAt(me, performance.now(), 1.7); haptic(12);
  const p = medalScreen(), R = Math.hypot(Math.max(p.x, W - p.x), Math.max(p.y, H - p.y)) * 1.15;
  xf.style.setProperty('--x', p.x.toFixed(1) + 'px'); xf.style.setProperty('--y', p.y.toFixed(1) + 'px'); xf.style.setProperty('--r', R.toFixed(0) + 'px');
  xf.classList.add('on');
  const gold = $('.xf-gold', xf), dark = $('.xf-dark', xf);
  const aDark = dark.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
  await sleep(420);
  if (seq !== revSeq) { aDark.cancel(); xf.classList.remove('on'); return; }
  const aGold = gold.animate([
    { transform: 'translate(-50%, -50%) scale(.02)', opacity: 0 },
    { transform: 'translate(-50%, -50%) scale(.18)', opacity: 1, offset: 0.22 },
    { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
  ], { duration: 980, easing: 'cubic-bezier(.55,0,.25,1)', fill: 'forwards' });
  await sleep(860);
  if (seq !== revSeq) { aDark.cancel(); aGold.cancel(); xf.classList.remove('on'); return; }
  // 금빛이 가라앉으며 결과 화면 — 그 빛은 액자 위 조명으로 남는다
  if (winDone) { winDone(); winDone = null; haptic(10); } else { screenOn('s3', true); resIn(); haptic(10); }
  await xf.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, easing: 'cubic-bezier(.3,0,.2,1)' }).finished.catch(() => {});
  aDark.cancel(); aGold.cancel(); xf.classList.remove('on');
}
function clearReveal() {
  revSeq++; hideTitles();
  frames.forEach((f) => { f.glowT = 0; });
  $('#wallTitle').textContent = '';
}
// 다시 고르기 — 결과 화면이 어둠으로 닫히고, 장면에서는 메달이 위로 떠서 사라지며 그림이 벽으로 돌아가 걸린다(번호판도 돌아온다)
let closing = false;
async function again() {
  if (mode !== 'reveal' || closing) return;
  closing = true; markSaved(false);
  if (res.classList.contains('on')) {
    await res.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.02)' }], { duration: reduceMotion ? 160 : 480, easing: 'cubic-bezier(.4,0,.2,1)' }).finished.catch(() => {});
    screenOn('s3', false); res.classList.remove('in');
  }
  closing = false;
  const was = chosen;
  clearReveal(); confirm.close();
  if (was && MED.f) { MED.dir = -1; MED.t0 = performance.now() + (reduceMotion ? 0 : 280); }
  chosen = null; fi = -1; setMode('rewind');
  dimT = 0; camTo('wall', 1000);
  await sleep(reduceMotion ? 0 : 1000);
  setMode('wall'); kick();
}
$('#again').addEventListener('click', again);
$('#back3').addEventListener('click', again);

// ── 카드 — 결과 화면의 그림이 카드 속 액자로 옮겨 앉는다
function frameScreenRect(f) {
  const b = new T.Box3().setFromObject(f.g.children.find((m) => m.material === f.paint) || f.g);
  const a = b.min.clone().project(camera), c = b.max.clone().project(camera), sr = stage.getBoundingClientRect();
  return { x: sr.left + (a.x + 1) / 2 * W, y: sr.top + (1 - c.y) / 2 * H, w: (c.x - a.x) / 2 * W, h: (c.y - a.y) / 2 * H };
}
// 끝 단추 공통: 처음으로(체험 목록) · 수집함에 저장 → 저장하면 같은 자리에서 '수집함에 담았어요'
//   11/03: 끝 줄은 done.js 공통(fillResult 에서 끼운다) — 저장 단추 없음
const markSaved = () => {};
// 카드 → 결과: 카드가 내려가며 사라지고 뒤의 결과 화면이 그대로
$('#back4').addEventListener('click', async () => {
  const s4 = $('#s4'); kick();
  await s4.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(30px)' }], { duration: reduceMotion ? 200 : 460, easing: 'cubic-bezier(.4,0,.2,1)' }).finished.catch(() => {});
  screenOn('s4', false);
});
// 처음으로 — 체험 목록으로(이 체험의 처음이 아니라). 화면이 어두워지며 넘어간다
$('#restart').addEventListener('click', async () => {
  await $('#s4').animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduceMotion ? 120 : 380, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
  location.href = '../../experience-v3/index.html';
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
  if (reduceMotion || new URLSearchParams(location.search).has('nointro')) {   // ?nointro = 앱 구역 화면의 미션 카드로 들어옴(도입은 구역에 들어설 때 이미 봄)
    salon.setDoor(1, 0); salon.setAir(0, 0);
    roleIn(); setMode('wall'); camKey = 'wall'; camB = camFor('wall'); camT0 = 0; camMs = 1; Object.assign(cam, camB);
    stage.classList.add('lit'); kick(); window.dispatchEvent(new CustomEvent('salon:wall')); return;
  }
  cv.addEventListener('pointerdown', skipIntro);
  Object.assign(cam, camFor('door')); salon.setDoor(0, 0);
  stage.classList.add('lit');
  kick();
})();

// 11/17: 이미 맞혔으면 들어오자마자 결과 화면(다시 체험 화면이 아니라)
if (store.saved('salon')) {
  const t = ZONES.find((z) => z.id === 'salon').tasks[0], w = WORKS[WIN_N - 1];
  setTimeout(() => showComplete('salon', { item: t.item, title: `〈${w.title}〉 · ${[w.artist, w.year].filter(Boolean).join(', ')}`, body: `${t.successBody}\n\n${t.successVerdict}`, note: t.after }), 0);
}
// v3: 안내 · 카메라 전환에서 장면을 움직인다(salon-ar.js)
window.__salon = {
  to: (k, ms) => camTo(k, ms),
  // 11/03: 현장의 벽을 비춘 뒤 — 같은 벽이 화면에 그대로 있고, 여기서 한 점을 눌러 고른다
  pick() {
    PICK = true; window.__salonGuideH = 96; document.body.classList.add('pick');
    // 스캔 직후: 먼저 카메라로 비춘 그대로(다섯 점 가로 한 줄이 화면을 채운 구도) — 그다음 arrange() 에서 세로로 옮겨 간다
    pickT = pickK = 0; poseAt(0); CL = clOf('W');   // 비춘 그대로(가상 살롱 벽의 가로 한 줄) — 카메라가 닫히면 arrange() 로 세로 정렬
    $('#role .lead').innerHTML = '올해의 당선작을 눌러 고르세요. <button type="button" class="crit-link" id="critBtn2">살롱의 기준</button>';
    $('#critBtn2').addEventListener('click', () => critSheet.open());   // 원래 단추(#critBtn)는 위 문장을 바꾸며 사라졌으니 시트를 바로 연다
    camTo('wall', 1); kick();
  },
  // 카메라가 닫힌 뒤: 가로 한 줄 → 2 · 1 · 2 세로 정렬로 액자들이 옮겨 가고, 카메라는 그 덩어리에 맞춰 같이 움직인다
  arrange() {
    pickT = 1; CL = clOf('P');
    camTo('wall', reduceMotion ? 1 : 1400); kick();
  },
  // 카메라에서 정답을 고른 뒤: 벽으로 돌아와 그 그림이 앞으로 나오고 → 메달이 날아와 앉고 → 금빛 → 결과 화면
  async award(i) {
    window.__salonGuideH = 96;
    camTo('wall', reduceMotion ? 1 : 900); await sleep(reduceMotion ? 0 : 900);
    store.solve('salon');
    focus(i); await sleep(reduceMotion ? 100 : 1300);
    setMode('placed'); chosen = frames[fi]; chosen.glowT = 1; haptic(14); kick();
    await sleep(reduceMotion ? 100 : 500);
    reveal(award);
  },
};

// 검수용
window.__c0 = {
  get info() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, tex: renderer.info.memory.textures, geo: renderer.info.memory.geometries, prog: renderer.info.programs.length }; },
  get mode() { return mode; }, get fi() { return fi; }, get chosen() { return chosen ? chosen.w.n : null; }, get zoom() { return zoom; }, get yaw() { return +yaw.toFixed(3); }, get cam() { return { ...cam }; }, get tI() { return tI; },
  get titleShown() { return !!(chosen && chosen.tpOn && chosen.titlePlate.visible); },
  // 후보작 그림 면의 화면 사각형(px)
  rect(i) { return frameScreenRect(frames[i]); },
  focus, toWall, place: placeMedal, reveal, again, get medDir() { return MED.dir; }, get resOn() { return res.classList.contains('on'); },
};
