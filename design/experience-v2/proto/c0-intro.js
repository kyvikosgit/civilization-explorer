// C0 입장 — 1873년 살롱 전시실로 걸어 들어간다 (약 3.6초, 누르면 빨리 감기)
//   무거운 두 짝 문이 열리고 → 카메라가 적갈색 전시실 안으로 밀려 들어간다(바닥부터 천장까지 걸린 그림, 가스등 빛과 미세한 깜빡임, 빛 속의 먼지)
//   → 안쪽 벽의 후보작 다섯 점을 빛이 한 번 쓸고 → 그 벽이 역할 화면의 후보작 벽(.cands)으로 오므라든다(같은 자리·같은 크기 — 공유 요소 전환)
//   안쪽 벽은 화면 좌표 1px = 월드 1 단위로 놓아, 마지막 카메라에서 DOM 의 후보작 자리와 정확히 겹친다.
//   three.js 0.147 (c0.js 와 같은 CDN). 끝나면 렌더러를 버린다.
import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W_ = '../works/';
// 벽을 채우는 그림 — 1860~70년대 살롱풍 초상·역사화(프로토타입 안의 실제 그림). 후보작 다섯 점은 안쪽 벽에만
const FILL = [
  ['c0-alt-cointable.jpg', 520 / 371], ['c0-alt-nymphs.jpg', 420 / 580], ['c0-cleo.jpg', 420 / 241], ['c4-baudelaire-paint.jpg', 520 / 434],
  ['c4-bernhardt-paint.jpg', 398 / 500], ['c4-hugo-paint.jpg', 397 / 500], ['c4-manet-paint.jpg', 480 / 640], ['c4c-baudelaire-deroy-paint.jpg', 641 / 800],
  ['c4c-berlioz-paint.jpg', 646 / 800], ['c4c-courbet-paint.jpg', 657 / 800], ['c4c-liszt-paint.jpg', 609 / 800], ['c4c-zola-paint.jpg', 608 / 800],
  ['c4c-degas-paint.jpg', 456 / 574], ['c4-monet-paint.jpg', 500 / 411],
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eo = (t) => 1 - Math.pow(1 - t, 3);
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

// 타임라인(ms)
const TL = { fadeIn: [0, 420], doors: [300, 1500], cam: [380, 2700], sweep: [2050, 2900], settle: 2950 };

/**
 * @param {HTMLElement} root  전체 화면 덮개(#intro)
 * @param {{x:number,y:number,w:number,h:number}} box  .cands 의 화면 사각형
 * @param {Array<{src:string,a:number,n:number,cf:DOMRect,img:DOMRect,plate:DOMRect}>} cands
 * @param {() => void} onSettle  카메라가 멈추고 벽이 오므라들기 시작할 때(역할 문장이 타이핑된다)
 */
export function playIntro(root, box, cands, onSettle) {
  return new Promise((resolve) => {
    const W = root.clientWidth || innerWidth, H = root.clientHeight || innerHeight;
    const cv = root.querySelector('canvas');
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); }
    catch (e) { resolve(); return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H, false);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
    const scene = new T.Scene();
    scene.background = new T.Color(0x0b0403);
    scene.fog = new T.Fog(0x140706, 2200, 6400);
    const pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const FOV = 50, d0 = (H / 2) / Math.tan(FOV / 2 * Math.PI / 180);
    const camera = new T.PerspectiveCamera(FOV, W / H, 5, 9000);
    const ANISO = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const R = rnd(11);

    // 화면 px → 월드(안쪽 벽 z=0). z 만큼 앞에 놓인 것은 마지막 카메라에서 같은 자리에 보이도록 좁힌다
    const wx = (px, z = 0) => (px - W / 2) * (d0 - z) / d0;
    const wy = (py, z = 0) => (H / 2 - py) * (d0 - z) / d0;
    const bx = wx(box.x + box.w / 2), by = wy(box.y + box.h / 2);

    // 전시실 치수 (1 단위 ≈ 1.4cm): 폭 1180, 바닥 by-600, 천장 by+1250, 깊이 2700
    const HW = 590, FLOOR = by - 600, CEIL = by + 1250, L = 2700, HALL_H = CEIL - FLOOR;
    const CAM0 = { x: bx, y: by + 90, z: L + 980 }, CAM1 = { x: 0, y: 0, z: d0 };

    // ── 텍스처
    const canvasTex = (w, h, draw, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = ANISO; return t; };
    const damask = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#6E2A2B'; g.fillRect(0, 0, w, h);
      const m = new Path2D('M32 4c6 8 12 12 24 14-12 2-18 6-24 14-6-8-12-12-24-14 12-2 18-6 24-14z');
      g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1.4;
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.save(); g.translate(x * 64 + (y % 2) * 32, y * 64); g.stroke(m); g.beginPath(); g.arc(32, 46, 3, 0, 6.3); g.stroke(); g.restore(); }
    });
    damask.wrapS = damask.wrapT = T.RepeatWrapping;
    const wallMat = (rw, rh) => { const t = damask.clone(); t.needsUpdate = true; t.repeat.set(rw / 96, rh / 96); return new T.MeshLambertMaterial({ map: t, color: 0x7E605A }); };
    const parquet = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#2a170f'; g.fillRect(0, 0, w, h);
      const L2 = rnd(5);
      for (let y = 0; y < h; y += 32) for (let x = -(y / 32 % 2) * 64; x < w; x += 128) {
        const v = 38 + L2() * 26; g.fillStyle = `rgb(${v + 14 | 0},${v * 0.62 | 0},${v * 0.38 | 0})`; g.fillRect(x + 1, y + 1, 126, 30);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y, 128, 1);
      }
    });
    parquet.wrapS = parquet.wrapT = T.RepeatWrapping; parquet.repeat.set(5, 9);
    const glowTex = canvasTex(128, 128, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,236,200,1)'); gr.addColorStop(0.18, 'rgba(255,190,110,.55)'); gr.addColorStop(0.5, 'rgba(255,150,70,.12)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
    const dotTex = canvasTex(32, 32, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
    const shaftTex = canvasTex(64, 256, (c, w, h) => {
      const gx = c.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gx; c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'destination-in'; const gy = c.createLinearGradient(0, 0, 0, h); gy.addColorStop(0, 'rgba(0,0,0,.9)'); gy.addColorStop(0.7, 'rgba(0,0,0,.35)'); gy.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gy; c.fillRect(0, 0, w, h);
    });

    // ── 방
    const add = (geo, mat, x, y, z, ry = 0, rx = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); scene.add(m); return m; };
    add(new T.PlaneGeometry(L + 200, HALL_H), wallMat(L + 200, HALL_H), bx - HW, FLOOR + HALL_H / 2, L / 2, Math.PI / 2);
    add(new T.PlaneGeometry(L + 200, HALL_H), wallMat(L + 200, HALL_H), bx + HW, FLOOR + HALL_H / 2, L / 2, -Math.PI / 2);
    add(new T.PlaneGeometry(HW * 2, HALL_H), wallMat(HW * 2, HALL_H), bx, FLOOR + HALL_H / 2, -1);
    add(new T.PlaneGeometry(HW * 2, L + 1400), new T.MeshStandardMaterial({ map: parquet, roughness: 0.42, metalness: 0, color: 0x6a4e40, envMapIntensity: 0.06 }), bx, FLOOR, (L + 1400) / 2 - 200, 0, -Math.PI / 2);
    // 천장 — 어두운 유리 천장(벨라리움)의 격자
    const ceilTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#100705'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(52,36,28,.7)'; for (let i = 0; i <= 4; i++) { g.fillRect(i * 64 - 3, 0, 6, h); g.fillRect(0, i * 64 - 3, w, 6); } }, true);
    ceilTex.wrapS = ceilTex.wrapT = T.RepeatWrapping; ceilTex.repeat.set(4, 10);
    add(new T.PlaneGeometry(HW * 2, L + 400), new T.MeshLambertMaterial({ map: ceilTex }), bx, CEIL, L / 2, 0, Math.PI / 2);
    // 징두리(나무 판) · 코니스(금박 몰딩)
    const wood = new T.MeshStandardMaterial({ color: 0x2a140c, roughness: 0.6, metalness: 0.05, envMapIntensity: 0.08 });
    const gilt = new T.MeshStandardMaterial({ color: 0x8B5A16, metalness: 1, roughness: 0.32, envMapIntensity: 0.45 });
    for (const s of [-1, 1]) {
      add(new T.BoxGeometry(14, 170, L + 200), wood, bx + s * (HW - 7), FLOOR + 85, L / 2);
      add(new T.BoxGeometry(18, 26, L + 200), gilt, bx + s * (HW - 9), CEIL - 150, L / 2);
      add(new T.BoxGeometry(12, 10, L + 200), gilt, bx + s * (HW - 6), FLOOR + 176, L / 2);
    }
    add(new T.BoxGeometry(HW * 2, 170, 14), wood, bx, FLOOR + 85, 7);
    add(new T.BoxGeometry(HW * 2, 26, 18), gilt, bx, CEIL - 150, 9);

    // ── 그림
    const loader = new T.TextureLoader();
    const texCache = new Map(); const loads = [];
    function tex(src) {
      if (texCache.has(src)) return texCache.get(src);
      let done1; loads.push(new Promise((r) => { done1 = r; }));
      const t = loader.load(src, () => done1(), undefined, () => done1());
      t.encoding = T.sRGBEncoding; t.anisotropy = ANISO; texCache.set(src, t); return t;
    }
    const canvasMats = new Map();
    const paintMat = (src) => { if (!canvasMats.has(src)) canvasMats.set(src, new T.MeshLambertMaterial({ map: tex(W_ + src), color: 0xC9B8A6 })); return canvasMats.get(src); };
    const frameGeo = new T.BoxGeometry(1, 1, 1), planeGeo = new T.PlaneGeometry(1, 1);
    function painting(src, w, h, m, parent) {
      const g = new T.Group();
      const f = new T.Mesh(frameGeo, gilt); f.scale.set(w + 2 * m, h + 2 * m, Math.max(6, m * 0.6)); f.position.z = f.scale.z / 2; g.add(f);
      const c = new T.Mesh(planeGeo, paintMat(src)); c.scale.set(w, h, 1); c.position.z = f.scale.z + 0.6; g.add(c);
      parent.add(g); return g;
    }
    // 살롱식 걸기 — 위에서 아래로 줄을 채운다. 한 줄 안에서 크기는 조금씩 다르고, 가운데 높이를 맞춘다
    let pickN = 0; const order = FILL.map((_, i) => i).sort(() => R() - 0.5);
    const nextFill = () => FILL[order[pickN++ % order.length]];
    function hang(x0, x1, y0, y1, place, hMin, hMax, avoid) {
      let y = y1;
      while (true) {
        const rh = hMin + R() * (hMax - hMin);
        if (y - rh < y0) break;
        const cy = y - rh / 2, items = [];
        let x = x0, guard = 0;
        while (guard++ < 40) {
          const [src, a] = nextFill(), h = rh * (0.72 + R() * 0.28), w = h * a, m = clamp(Math.min(w, h) * 0.08, 7, 20), ow = w + 2 * m;
          if (x + ow > x1) break;
          if (avoid && cy + h / 2 + m > avoid.y0 && cy - h / 2 - m < avoid.y1 && x + ow > avoid.x0 && x < avoid.x1) { x = avoid.x1; continue; }
          items.push({ src, w, h, m, x: x + ow / 2 }); x += ow + 18 + R() * 16;
        }
        const slack = Math.max(0, x1 - x) / (items.length + 1);
        items.forEach((it, k) => place(it.src, it.w, it.h, it.m, it.x + (avoid ? 0 : slack * (k + 1)), cy + (R() - 0.5) * 10));
        y -= rh + 26 + R() * 12;
      }
    }
    for (const s of [-1, 1]) {
      const side = new T.Group(); side.position.set(bx + s * (HW - 2), 0, 0); side.rotation.y = -s * Math.PI / 2; scene.add(side);
      // 옆벽 로컬 x = 깊이 방향(입구 쪽이 +), 오른쪽 벽은 뒤집힌다
      hang(140, L - 140, FLOOR + 210, CEIL - 190, (src, w, h, m, x, y) => { const g = painting(src, w, h, m, side); g.position.set(s < 0 ? -x : x, y, 0); }, 130, 300);
    }
    // 안쪽 벽 — 후보작 자리(.cands)는 비워 두고 둘레를 채운다
    const back = new T.Group(); scene.add(back);
    const AV = { x0: wx(box.x) - 24, x1: wx(box.x + box.w) + 24, y0: wy(box.y + box.h) - 24, y1: wy(box.y) + 24 };
    hang(bx - HW + 30, bx + HW - 30, FLOOR + 210, CEIL - 190, (src, w, h, m, x, y) => { const g = painting(src, w, h, m, back); g.position.set(x, y, 0); }, 120, 230, AV);
    // 후보작 다섯 점 — DOM 의 액자(.cf)·그림(img)·번호판 자리 그대로
    const plateTex = (n) => canvasTex(96, 64, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#F4DB92'); gr.addColorStop(0.55, '#C9A14A'); gr.addColorStop(1, '#8E6A26'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#2E1F05'; c.font = '700 40px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), w / 2, h / 2 + 2); });
    const candMeshes = [];
    cands.forEach((cd) => {
      const z1 = 8, z2 = 9;
      const f = new T.Mesh(frameGeo, gilt); f.scale.set(cd.cf.width * (d0 - z1) / d0, cd.cf.height * (d0 - z1) / d0, 8); f.position.set(wx(cd.cf.x + cd.cf.width / 2, z1), wy(cd.cf.y + cd.cf.height / 2, z1), 4); back.add(f);
      const mat = new T.MeshLambertMaterial({ map: tex(cd.src), color: 0xF4ECE2 });
      const c = new T.Mesh(planeGeo, mat); c.scale.set(cd.img.width * (d0 - z2) / d0, cd.img.height * (d0 - z2) / d0, 1); c.position.set(wx(cd.img.x + cd.img.width / 2, z2), wy(cd.img.y + cd.img.height / 2, z2), z2); back.add(c);
      const p = new T.Mesh(planeGeo, new T.MeshLambertMaterial({ map: plateTex(cd.n) })); p.scale.set(cd.plate.width, cd.plate.height, 1); p.position.set(wx(cd.plate.x + cd.plate.width / 2, 2), wy(cd.plate.y + cd.plate.height / 2, 2), 2); back.add(p);
      candMeshes.push(mat);
    });

    // ── 문 — 짙은 옻칠 나무, 금박 몰딩 세 칸, 놋쇠 손잡이. 안쪽으로 열린다
    const DOOR_H = 1320;
    const doorTex = (flip) => canvasTex(256, 768, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#2b130d'); gr.addColorStop(0.5, '#3d1c13'); gr.addColorStop(1, '#2a120c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 6 + Math.random() * 30); }
      const panel = (x, y, pw, ph) => { g.strokeStyle = '#c9963e'; g.lineWidth = 5; g.strokeRect(x, y, pw, ph); g.strokeStyle = 'rgba(255,226,150,.5)'; g.lineWidth = 1.5; g.strokeRect(x + 9, y + 9, pw - 18, ph - 18); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 12, y + 12, pw - 24, ph - 24); };
      panel(30, 34, w - 60, 250); panel(30, 314, w - 60, 140); panel(30, 484, w - 60, 250);
      const hx = flip ? 14 : w - 22; g.fillStyle = '#d8ad55'; g.fillRect(hx, 380, 8, 70); g.fillStyle = '#fff1c0'; g.fillRect(hx + 2, 384, 2, 60);
    });
    const doors = [-1, 1].map((s) => {
      const hinge = new T.Group(); hinge.position.set(bx + s * HW, FLOOR, L); scene.add(hinge);
      const d = new T.Mesh(new T.BoxGeometry(HW, DOOR_H, 34), [wood, wood, wood, wood, new T.MeshStandardMaterial({ map: doorTex(s > 0), roughness: 0.38, metalness: 0.1, envMapIntensity: 0.6 }), wood]);
      d.position.set(-s * HW / 2, DOOR_H / 2, 0); hinge.add(d);
      return { hinge, s };
    });
    // 문 위·바깥 벽
    add(new T.PlaneGeometry(HW * 2 + 1600, HALL_H + 400), new T.MeshLambertMaterial({ color: 0x1a0907 }), bx, FLOOR + DOOR_H + (HALL_H + 400) / 2, L + 18);
    for (const s of [-1, 1]) add(new T.PlaneGeometry(1600, DOOR_H + 400), new T.MeshLambertMaterial({ color: 0x1a0907 }), bx + s * (HW + 800), FLOOR + DOOR_H / 2, L + 18);
    // 문틈의 빛
    const slit = new T.Mesh(planeGeo, new T.MeshBasicMaterial({ map: shaftTex, color: 0xffc27a, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 1, toneMapped: false }));
    slit.scale.set(34, DOOR_H * 1.1, 1); slit.position.set(bx, FLOOR + DOOR_H / 2, L + 20); slit.rotation.z = Math.PI; scene.add(slit);

    // ── 빛: 가스 샹들리에(점광원 넷 + 빛망울), 위에서 내려오는 빛줄기, 안쪽 벽을 쓰는 빛
    scene.add(new T.HemisphereLight(0xffe2c0, 0x1a0606, 0.12));
    const gas = [];
    [[0.18, -1], [0.18, 1], [0.6, -1], [0.6, 1]].forEach(([zk, s], i) => {
      const p = new T.PointLight(0xffa860, 0, 1700, 1.4); p.position.set(bx + s * (HW - 260), CEIL - 330, L * zk); scene.add(p);
      const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xffc58a, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      glow.position.copy(p.position); glow.scale.setScalar(300); scene.add(glow);
      // 샹들리에 불꽃 — 작은 빛 여러 개
      const flames = [];
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const f = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xffe0b0, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); f.position.set(p.position.x + Math.cos(a) * 60, p.position.y - 30, p.position.z + Math.sin(a) * 60); f.scale.setScalar(46); scene.add(f); flames.push(f); }
      gas.push({ p, glow, flames, ph: i * 1.7, base: 2.3 });
    });
    const sconce = [];
    for (const s of [-1, 1]) for (const zk of [0.36, 0.8]) {
      const g = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xffb070, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.9 }));
      g.position.set(bx + s * (HW - 30), FLOOR + 380, L * zk); g.scale.setScalar(150); scene.add(g); sconce.push(g);
    }
    const shafts = [];
    for (let k = 0; k < 5; k++) {
      const m = new T.Mesh(planeGeo, new T.MeshBasicMaterial({ map: shaftTex, color: 0xffd9a8, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false }));
      m.scale.set(170 + R() * 120, HALL_H * 1.1, 1); m.position.set(bx + (R() - 0.5) * HW * 1.3, CEIL - HALL_H * 0.5, 300 + k * (L / 5) + R() * 200); m.rotation.z = 0.22 + (R() - 0.5) * 0.12; scene.add(m); shafts.push({ m, o: 0.08 + R() * 0.07 });
    }
    const sweep = new T.SpotLight(0xfff1dc, 0, 3200, 0.2, 0.75, 1); sweep.position.set(bx, by + 900, 1500); scene.add(sweep); scene.add(sweep.target);
    const wash = new T.SpotLight(0xffe6c8, 0, 3200, 0.55, 0.9, 1); wash.position.set(bx, by + 700, 1700); wash.target.position.set(bx, by, 0); scene.add(wash); scene.add(wash.target);
    // 빛 속의 먼지
    const N = 700, dpos = new Float32Array(N * 3), dseed = new Float32Array(N);
    for (let i = 0; i < N; i++) { dpos[i * 3] = bx + (R() - 0.5) * HW * 1.9; dpos[i * 3 + 1] = FLOOR + R() * HALL_H; dpos[i * 3 + 2] = R() * (L + 900); dseed[i] = R() * 100; }
    const dgeo = new T.BufferGeometry(); dgeo.setAttribute('position', new T.BufferAttribute(dpos.slice(), 3));
    const dust = new T.Points(dgeo, new T.PointsMaterial({ map: dotTex, size: 7, color: 0xffdcae, transparent: true, opacity: 0.0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    scene.add(dust);

    // ── 진행
    let t = 0, speed = 1, last = 0, raf = 0, settled = false, done = false;
    const skip = () => { if (!settled) speed = 5; };
    root.addEventListener('pointerdown', skip);
    function frame(now) {
      if (done) return;
      const dt = last ? Math.min(50, now - last) : 16; last = now;
      t += dt * speed; const time = now / 1000;
      // 카메라 — 문 앞에서 전시실 안쪽 벽까지. 들어서며 아주 조금 올려다보고, 벽 앞에서 정면으로 선다
      const c = eio(seg(t, ...TL.cam));
      camera.position.set(lerp(CAM0.x, CAM1.x, c), lerp(CAM0.y, CAM1.y, eo(c)), lerp(CAM0.z, CAM1.z, c));
      camera.rotation.set(Math.sin(c * Math.PI) * 0.1, Math.sin(c * Math.PI * 2) * 0.012, 0);
      // 문
      const od = eio(seg(t, ...TL.doors));
      doors.forEach(({ hinge, s }) => { hinge.rotation.y = -s * od * 1.5; });
      slit.material.opacity = (1 - od) * (0.75 + 0.25 * Math.sin(time * 9)) * (0.4 + 0.6 * seg(t, 0, 400)); slit.scale.x = 34 + od * 700;
      // 노출 · 가스등 깜빡임
      renderer.toneMappingExposure = lerp(0.42, 1.05, eo(seg(t, 250, 1700)));
      const focus = eio(seg(t, TL.sweep[0], TL.sweep[1]));
      gas.forEach((g) => {
        const fl = 1 + 0.07 * Math.sin(time * 13 + g.ph) + 0.05 * Math.sin(time * 29.3 + g.ph * 2) + 0.03 * Math.sin(time * 47 + g.ph);
        g.p.intensity = g.base * fl * eo(seg(t, 200, 1300)) * (1 - focus * 0.35);
        g.glow.material.opacity = 0.8 * fl * (1 - focus * 0.25); g.glow.scale.setScalar(300 * (0.96 + 0.06 * fl));
        g.flames.forEach((f, k) => { f.material.opacity = 0.9 * (1 + 0.15 * Math.sin(time * 21 + k * 1.3 + g.ph)); });
      });
      sconce.forEach((g, k) => { g.material.opacity = 0.75 * (1 + 0.1 * Math.sin(time * 17 + k * 2.1)) * (1 - focus * 0.3); });
      shafts.forEach((s, k) => { s.m.material.opacity = s.o * eo(seg(t, 500, 1800)) * (1 - focus * 0.5) * (0.85 + 0.15 * Math.sin(time * 0.7 + k)); });
      // 먼지 — 천천히 떠다닌다
      const pa = dgeo.attributes.position.array;
      for (let i = 0; i < N; i++) { const s = dseed[i]; pa[i * 3] = dpos[i * 3] + Math.sin(time * 0.31 + s) * 22; pa[i * 3 + 1] = dpos[i * 3 + 1] + Math.sin(time * 0.23 + s * 1.7) * 18 - ((time * 6 + s * 9) % 60); pa[i * 3 + 2] = dpos[i * 3 + 2] + Math.cos(time * 0.27 + s) * 22; }
      dgeo.attributes.position.needsUpdate = true;
      dust.material.opacity = 0.75 * eo(seg(t, 400, 1500)) * (1 - focus * 0.3);
      // 후보작을 쓸고 지나가는 빛 → 다섯 점을 고르게 비춘다
      const sw = seg(t, TL.sweep[0], TL.sweep[1]);
      sweep.intensity = 2.6 * Math.sin(sw * Math.PI);
      sweep.target.position.set(lerp(wx(box.x) - 60, wx(box.x + box.w) + 60, eio(sw)), by + 20, 0);
      wash.intensity = 1.0 * eo(seg(t, TL.sweep[0] + 300, TL.sweep[1] + 200));
      renderer.render(scene, camera);
      if (!settled && t >= TL.settle) { settled = true; root.removeEventListener('pointerdown', skip); onSettle && onSettle(); finish(); }
      raf = requestAnimationFrame(frame);
    }
    // 벽이 .cands 자리로 오므라든 뒤 덮개를 걷고 렌더러를 버린다
    function finish() {
      const r = (v) => `${Math.round(v)}px`;
      const to = `inset(${r(box.y)} ${r(W - box.x - box.w)} ${r(H - box.y - box.h)} ${r(box.x)} round 8px)`;
      const a = root.animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: to }], { duration: 760, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' });
      a.finished.then(() => root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'ease', fill: 'forwards' }).finished).then(() => {
        done = true; cancelAnimationFrame(raf);
        renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* noop */ }
        root.remove(); resolve();
      }).catch(() => { done = true; root.remove(); resolve(); });
    }
    // 그림을 조금 기다렸다가(최대 1.2초) 시작 — 문이 닫힌 동안 대부분 들어온다
    Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 1200))]).then(() => {
      root.classList.add('run');
      raf = requestAnimationFrame(frame);
    });
  });
}
