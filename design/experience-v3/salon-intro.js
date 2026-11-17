// v3 사본 — 채움 그림의 클레오파트라를 르 봉 보크로 바꿈(클레오파트라가 후보작으로 올라가서 겹치지 않게). 나머지는 v2 c0-intro.js 그대로
// C0 살롱 전시실 — 1873년 살롱(팔레 드 랭뒤스트리)의 한 방을 three.js 로 짓는다. c0.js 의 장면 하나에 들어가며, 입장·벽·확대·결과 카메라가 모두 이 방 안에서 움직인다.
//   단위: 미터. 안쪽 벽(후보작 벽) z=0, 바닥 y=0, 입구 문 z=L. 카메라는 늘 -z 를 본다(정면), 눈높이 1.6m.
//   천장: 유리 천창 아래 벨룸(빛을 거르는 천)의 격자 · 금박 코니스 · 오목 몰딩(cove). 벽: 적갈색 다마스크 · 나무 징두리 · 살롱식으로 빽빽이 건 그림. 안쪽 벽 앞 붉은 로프.
//   채움 그림(살롱 걸기)은 텍스처마다 InstancedMesh 하나 — 그림이 많아도 그리기 호출은 서른 남짓.
//   채움 그림 출처(모두 퍼블릭 도메인, Wikimedia Commons, 2026-10 내려받아 440px 로 줄임 → img/c0-fill/):
//     카바넬〈비너스의 탄생〉1863 · 〈타락천사〉1847 / 부그로〈님프와 사티로스〉1873 · 〈죽음 앞의 평등〉1848 / 제롬〈폴리케 베르소〉1872 · 〈가면무도회 뒤의 결투〉1857
//     로자 보뇌르〈니베르네의 밭갈이〉1849 / 코로〈모르트퐁텐의 추억〉1864 / 메소니에〈1814년 프랑스 전투〉1864 / 르뇨〈살로메〉1870 / 카롤뤼스뒤랑〈장갑을 낀 여인〉1869
//     보드리〈진주와 파도〉1862 / 쿠튀르〈퇴폐기의 로마인들〉1847 / 도비니〈우아즈 강가〉 / 글레르〈잃어버린 환상〉1843
//   그 밖의 채움 그림은 프로토타입의 works/ 폴더에 이미 있는 1860–70년대 초상.
import * as T from 'three';

export const HALL = { W: 12, L: 24, WALL_H: 8.9, CEIL: 9.75, DOOR_W: 3.2, DOOR_H: 5.4, EYE: 1.6 };

const F_ = 'img/c0-fill/', W_ = '../works/';
const FILL = [
  [F_ + 'cabanel-venus.jpg', 440 / 250], [F_ + 'bouguereau-nymphs.jpg', 304 / 440], [F_ + 'gerome-pollice.jpg', 440 / 296], [F_ + 'bonheur-nivernais.jpg', 440 / 225],
  [F_ + 'corot-mortefontaine.jpg', 440 / 318], [F_ + 'meissonier-1814.jpg', 440 / 286], [F_ + 'regnault-salome.jpg', 300 / 440], [F_ + 'carolus-gant.jpg', 307 / 440],
  [F_ + 'baudry-perle.jpg', 440 / 204], [F_ + 'gerome-duel.jpg', 440 / 302], [F_ + 'bouguereau-egalite.jpg', 440 / 232], [F_ + 'daubigny-oise.jpg', 440 / 242],
  [F_ + 'cabanel-ange.jpg', 440 / 301], [F_ + 'couture-romains.jpg', 440 / 263], [F_ + 'gleyre-illusions.jpg', 440 / 248],
  [W_ + 'c4-hugo-paint.jpg', 397 / 500], [W_ + 'c4-manet-paint.jpg', 480 / 640], [W_ + 'c4c-berlioz-paint.jpg', 646 / 800], [W_ + 'c4c-courbet-paint.jpg', 657 / 800],
  [W_ + 'c4c-liszt-paint.jpg', 609 / 800], [W_ + 'c4c-zola-paint.jpg', 608 / 800], [W_ + 'c4-bernhardt-paint.jpg', 398 / 500], [W_ + 'c0-bonbock.jpg', 520 / 589],
  [W_ + 'c0-alt-cointable.jpg', 520 / 371], [W_ + 'c4c-degas-paint.jpg', 456 / 574],
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

/**
 * @param {T.Scene} scene
 * @param {{ aniso:number, avoid:Array<{x0:number,x1:number,y0:number,y1:number}>, kick:()=>void, gilt:T.Material }} o
 *   avoid: 안쪽 벽에서 후보작이 걸리는 자리(채움 그림을 걸지 않는다)
 */
export function buildSalon(scene, o) {
  const { W: HW2, L, WALL_H, CEIL, DOOR_W, DOOR_H } = HALL, HW = HW2 / 2;
  const R = rnd(7);
  const dimList = [];                        // 확대 때 함께 어두워지는 재료 [material, 원래 색, 원래 env]
  const reg = (m) => { dimList.push([m, m.color.clone(), m.envMapIntensity]); return m; };
  const canvasTex = (w, h, draw, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = o.aniso; return t; };
  const add = (geo, mat, x, y, z, ry = 0, rx = 0, parent = scene) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); parent.add(m); return m; };

  // ── 재료
  // 다마스크 — 짙은 적갈색 바탕에 조금 밝은 플록 무늬(양털 결) + 어두운 윤곽. 한 장 512px 을 1.1m 에 한 번
  const damask = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#6F2627'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const v = Math.random(); g.fillStyle = v < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,190,170,.035)'; g.fillRect(Math.random() * w, Math.random() * h, 1, 2); }
    const motif = (cx, cy, s) => {
      g.save(); g.translate(cx, cy); g.scale(s, s);
      const p = new Path2D('M0 -118 C 26 -84 64 -70 70 -30 C 76 6 40 22 34 52 C 30 76 52 92 44 118 C 30 100 12 96 0 112 C -12 96 -30 100 -44 118 C -52 92 -30 76 -34 52 C -40 22 -76 6 -70 -30 C -64 -70 -26 -84 0 -118 Z');
      g.fillStyle = 'rgba(140,48,44,.38)'; g.fill(p); g.strokeStyle = 'rgba(40,6,6,.25)'; g.lineWidth = 2.2; g.stroke(p);
      const q = new Path2D('M0 -70 C 16 -50 30 -30 22 -4 C 16 14 6 24 0 40 C -6 24 -16 14 -22 -4 C -30 -30 -16 -50 0 -70 Z');
      g.fillStyle = 'rgba(60,12,12,.22)'; g.fill(q);
      g.strokeStyle = 'rgba(170,70,62,.5)'; g.lineWidth = 1.6; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 70, -30); g.bezierCurveTo(sx * 110, -40, sx * 120, 10, sx * 100, 40); g.stroke(); }
      g.restore();
    };
    motif(128, 128, 0.9); motif(384, 384, 0.9); motif(384, 128, 0.42); motif(128, 384, 0.42);
  });
  damask.wrapS = damask.wrapT = T.RepeatWrapping;
  const wallMat = (rw, rh) => { const t = damask.clone(); t.needsUpdate = true; t.repeat.set(rw / 1.15, rh / 1.15); return reg(new T.MeshLambertMaterial({ map: t, color: 0xD8C2BC })); };
  // 위는 천창 빛을 받아 밝고 아래로 갈수록 가라앉는다 — 벽 앞에 얇게 덮는 그늘(검정, 알파 그라데이션)
  const shadeTex = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.35, 'rgba(0,0,0,.06)'); gr.addColorStop(0.85, 'rgba(0,0,0,.38)'); gr.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false);
  const shadeMat = new T.MeshBasicMaterial({ map: shadeTex, transparent: true, depthWrite: false, toneMapped: false });
  const parquet = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#3a2215'; g.fillRect(0, 0, w, h);
    const L2 = rnd(5);
    for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) {
      const horiz = ((x + y) / 64) % 2 === 0;
      for (let k = 0; k < 4; k++) {
        const v = 52 + L2() * 30; g.fillStyle = `rgb(${v + 22 | 0},${v * 0.62 | 0},${v * 0.36 | 0})`;
        if (horiz) g.fillRect(x + 1, y + k * 16 + 1, 62, 14); else g.fillRect(x + k * 16 + 1, y + 1, 14, 62);
      }
    }
  });
  parquet.wrapS = parquet.wrapT = T.RepeatWrapping; parquet.repeat.set(HW2 / 1.4, (L + 2) / 1.4);
  const wood = reg(new T.MeshLambertMaterial({ color: 0x3B1E12 }));
  const woodDark = reg(new T.MeshLambertMaterial({ color: 0x24110A }));
  const gilt = reg(new T.MeshStandardMaterial({ color: 0x9A6A22, metalness: 1, roughness: 0.42, envMapIntensity: 0.5 }));
  const cream = reg(new T.MeshLambertMaterial({ color: 0xC9B79A }));

  // ── 방
  add(new T.PlaneGeometry(HW2, WALL_H), wallMat(HW2, WALL_H), 0, WALL_H / 2, 0);                                  // 안쪽 벽
  add(new T.PlaneGeometry(HW2, WALL_H), shadeMat, 0, WALL_H / 2, 0.004);
  for (const s of [-1, 1]) {
    add(new T.PlaneGeometry(L, WALL_H), wallMat(L, WALL_H), s * HW, WALL_H / 2, L / 2, -s * Math.PI / 2);         // 옆벽
    add(new T.PlaneGeometry(L, WALL_H), shadeMat, s * (HW - 0.004), WALL_H / 2, L / 2, -s * Math.PI / 2);
  }
  add(new T.PlaneGeometry(HW2, L + 0.4), reg(new T.MeshLambertMaterial({ map: parquet, color: 0xC8B4A4 })), 0, 0, L / 2, 0, -Math.PI / 2);
  // 징두리(나무 판 1m) · 걸레받이 · 의자 높이 몰딩 — 안쪽 벽과 옆벽
  const DADO = 1.0;
  add(new T.BoxGeometry(HW2, DADO, 0.06), wood, 0, DADO / 2, 0.03);
  add(new T.BoxGeometry(HW2, 0.05, 0.1), gilt, 0, DADO, 0.05);
  add(new T.BoxGeometry(HW2, 0.16, 0.08), woodDark, 0, 0.08, 0.04);
  for (const s of [-1, 1]) {
    add(new T.BoxGeometry(0.06, DADO, L), wood, s * (HW - 0.03), DADO / 2, L / 2);
    add(new T.BoxGeometry(0.1, 0.05, L), gilt, s * (HW - 0.05), DADO, L / 2);
  }
  // 징두리 판넬 — 금박 가는 선의 네모 칸
  for (let x = -HW + 0.35; x < HW - 0.6; x += 1.25) {
    for (const [w, h] of [[1.0, 0.04]]) { add(new T.BoxGeometry(w, 0.025, 0.02), gilt, x + 0.5, 0.82, 0.07); add(new T.BoxGeometry(w, 0.025, 0.02), gilt, x + 0.5, 0.28, 0.07); void h; }
    add(new T.BoxGeometry(0.025, 0.54, 0.02), gilt, x, 0.55, 0.07); add(new T.BoxGeometry(0.025, 0.54, 0.02), gilt, x + 1.0, 0.55, 0.07);
  }
  // 코니스(금박 몰딩 두 단) · 오목 몰딩(cove: 벽 꼭대기에서 천장까지 안으로 굽는 면) — 세 벽
  const COVE = CEIL - WALL_H;
  const coveTex = canvasTex(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#F3E6CC'); gr.addColorStop(0.55, '#D8C3A0'); gr.addColorStop(1, '#8E7656'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const coveMat = reg(new T.MeshLambertMaterial({ map: coveTex, side: T.DoubleSide }));
  // 사분원 면 — pt(u, a): u 는 몰딩 길이 방향(0..1), a 는 벽 꼭대기(0)→천장(π/2)
  const coveGeo = (pt) => {
    const NU = 2, NA = 10, pos = [], uv = [], idx = [];
    for (let j = 0; j <= NA; j++) for (let i = 0; i < NU; i++) { const a = j / NA * Math.PI / 2; pos.push(...pt(i / (NU - 1), a)); uv.push(i, j / NA); }
    for (let j = 0; j < NA; j++) { const a = j * NU, b = a + NU; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  scene.add(new T.Mesh(coveGeo((u, a) => [(u - 0.5) * HW2, WALL_H + COVE * Math.sin(a), COVE - COVE * Math.cos(a)]), coveMat));
  for (const s of [-1, 1]) scene.add(new T.Mesh(coveGeo((u, a) => [s * (HW - COVE + COVE * Math.cos(a)), WALL_H + COVE * Math.sin(a), u * L]), coveMat));
  add(new T.BoxGeometry(HW2, 0.22, 0.2), gilt, 0, WALL_H - 0.11, 0.1);
  add(new T.BoxGeometry(HW2, 0.08, 0.3), gilt, 0, WALL_H + 0.02, 0.15);
  add(new T.BoxGeometry(HW2, 0.05, 0.12), gilt, 0, WALL_H - 0.42, 0.06);
  for (const s of [-1, 1]) {
    add(new T.BoxGeometry(0.2, 0.22, L), gilt, s * (HW - 0.1), WALL_H - 0.11, L / 2);
    add(new T.BoxGeometry(0.3, 0.08, L), gilt, s * (HW - 0.15), WALL_H + 0.02, L / 2);
  }
  // 천장 — 벨룸 아래로 들어오는 낮빛. 금박 테두리 · 철골 격자 · 천 무늬
  const velum = canvasTex(512, 1024, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h * 0.3, 40, w / 2, h * 0.5, h * 0.7); gr.addColorStop(0, '#FFF9EC'); gr.addColorStop(1, '#E9DBBF'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(160,130,90,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1); }
    g.fillStyle = 'rgba(90,64,38,.3)'; for (let x = 0; x <= w; x += w / 6) g.fillRect(x - 3, 0, 6, h); for (let y = 0; y <= h; y += h / 12) g.fillRect(0, y - 2, w, 4);
    g.fillStyle = 'rgba(90,64,38,.18)'; for (let x = 0; x <= w; x += w / 24) g.fillRect(x - 1, 0, 2, h);
  });
  const ceilInW = HW2 - 2 * COVE - 1.2;
  add(new T.PlaneGeometry(ceilInW, L - COVE - 0.6), new T.MeshBasicMaterial({ map: velum, color: 0xD8C6A4 })   /* 11/17: 흰빛 → 천을 거친 따뜻한 낮빛 */, 0, CEIL - 0.01, (L + COVE) / 2, 0, Math.PI / 2);
  // 천창 둘레 — 크림 띠와 금박 선
  const band = reg(new T.MeshLambertMaterial({ color: 0xB7A27F, side: T.DoubleSide }));
  add(new T.PlaneGeometry(HW2, L + 0.4), band, 0, CEIL, L / 2, 0, Math.PI / 2);
  add(new T.BoxGeometry(ceilInW + 0.2, 0.12, 0.14), gilt, 0, CEIL - 0.05, COVE + 0.6);
  for (const s of [-1, 1]) add(new T.BoxGeometry(0.14, 0.12, L - COVE - 0.6), gilt, s * (ceilInW / 2 + 0.07), CEIL - 0.05, (L + COVE) / 2);

  // ── 채움 그림 — 살롱식(바닥 위부터 코니스까지 빽빽이). 텍스처마다 InstancedMesh
  const loader = new T.TextureLoader();
  const fillTex = FILL.map(([src]) => { const t = loader.load(src, () => o.kick()); t.encoding = T.sRGBEncoding; t.anisotropy = o.aniso; return t; });
  const slots = FILL.map(() => []), frames = [];
  let pick = 0; const order = FILL.map((_, i) => i).sort(() => R() - 0.5);
  const next = () => order[pick++ % order.length];
  // 띠마다 위에서 아래로 채운다. 한 줄 안에서 가운데 높이를 맞추고 크기는 조금씩 다르게
  function hang(x0, x1, y0, y1, hMin, hMax, toWorld, avoid) {
    let y = y1;
    while (true) {
      const rh = hMin + R() * (hMax - hMin);
      if (y - rh < y0) break;
      const cy = y - rh / 2, items = [];
      let x = x0, guard = 0, seg0 = 0;
      while (guard++ < 60) {
        const k = next(), a = FILL[k][1], h = rh * (0.7 + R() * 0.3), w = Math.min(h * a, rh * 1.9), hh = w / a, m = clamp(Math.min(w, hh) * 0.08, 0.06, 0.15), ow = w + 2 * m;
        if (x + ow > x1) break;
        const hit = avoid && avoid.find((r) => cy + hh / 2 + m > r.y0 && cy - hh / 2 - m < r.y1 && x + ow > r.x0 && x < r.x1);
        if (hit) {   // 비켜 갈 자리 앞의 그림들은 오른쪽으로 붙여, 후보작 양옆의 간격이 같아지게
          let sh = Infinity;
          for (let k = seg0; k < items.length; k++) {
            const it = items[k], r1 = it.x + it.ow / 2;
            avoid.forEach((r) => { if (cy + it.h / 2 + it.m > r.y0 && cy - it.h / 2 - it.m < r.y1 && r.x0 >= r1 - 1e-6) sh = Math.min(sh, r.x0 - 0.16 - r1); });
          }
          if (sh > 0 && sh < Infinity) for (let k = seg0; k < items.length; k++) items[k].x += sh;
          x = hit.x1 + 0.16; seg0 = items.length; continue;
        }
        items.push({ k, w, h: hh, m, ow, x: x + ow / 2 }); x += ow + 0.14 + R() * 0.14;
      }
      items.forEach((it) => { const p = toWorld(it.x, cy + (R() - 0.5) * 0.06); slots[it.k].push({ ...p, w: it.w, h: it.h }); frames.push({ ...p, w: it.w + 2 * it.m, h: it.h + 2 * it.m }); });
      y -= rh + 0.2 + R() * 0.1;
    }
    return y;
  }
  const BAND0 = DADO + 0.22, BAND1 = WALL_H - 0.55;
  // 11/17: 후보작이 한 줄로 낮게 걸려서 — 위는 후보작 띠 바로 위까지 빈틈없이, 띠 옆은 작은 그림으로 따로 채운다
  const BW = (x, y) => ({ x, y, z: 0, ry: 0 }), XA = -HW + 0.25, XB = HW - 0.25;
  const AV = o.avoid && o.avoid[0], YT = AV ? AV.y1 : BAND0;
  let yUp = hang(XA, XB, YT, BAND1, 0.95, 1.7, BW, null);
  for (let k = 0; k < 4 && yUp - YT > 0.42; k++) {   // 남은 높이에 맞춰 점점 작은 줄로
    const hMax = Math.min(0.95, yUp - YT - 0.02), y2 = hang(XA, XB, YT, yUp, Math.max(0.38, hMax * 0.75), hMax, BW, null);
    if (y2 === yUp) break; yUp = y2;
  }
  if (AV) {
    let yS = hang(XA, XB, BAND0, YT - 0.05, 0.5, Math.min(1.2, YT - 0.05 - BAND0), BW, o.avoid);
    if (yS - BAND0 > 0.45) hang(XA, XB, BAND0, yS, 0.38, Math.min(0.8, yS - BAND0 - 0.02), BW, o.avoid);
  }
  for (const s of [-1, 1]) hang(0.5, L - 0.6, BAND0, BAND1, 1.1, 2.3, (u, y) => ({ x: s * HW, y, z: s < 0 ? u : L - u, ry: -s * Math.PI / 2 }), null);
  const frameMat = gilt, fd = 0.08, mx = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), sc = new T.Vector3();
  const fr = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), frameMat, frames.length);
  frames.forEach((f, i) => {
    q.setFromEuler(e.set(0, f.ry, 0)); v.set(0, 0, fd / 2).applyQuaternion(q).add(new T.Vector3(f.x, f.y, f.z));
    fr.setMatrixAt(i, mx.compose(v, q, sc.set(f.w, f.h, fd)));
  });
  scene.add(fr);
  const plane = new T.PlaneGeometry(1, 1), fillMats = [];
  slots.forEach((list, k) => {
    if (!list.length) return;
    const mat = reg(new T.MeshLambertMaterial({ map: fillTex[k], color: 0x8A7C70 })); fillMats.push(mat);
    const im = new T.InstancedMesh(plane, mat, list.length);
    list.forEach((p, i) => { q.setFromEuler(e.set(0, p.ry, 0)); v.set(0, 0, fd + 0.004).applyQuaternion(q).add(new T.Vector3(p.x, p.y, p.z)); im.setMatrixAt(i, mx.compose(v, q, sc.set(p.w, p.h, 1))); });
    scene.add(im);
  });

  // ── 안쪽 벽 앞 붉은 로프 — 놋쇠 기둥 둘(화면 가운데에는 기둥이 없다), 가운데로 늘어진 벨벳 줄
  const brass = reg(new T.MeshStandardMaterial({ color: 0xC9A04A, metalness: 1, roughness: 0.3, envMapIntensity: 1 }));
  const velvet = reg(new T.MeshLambertMaterial({ color: 0x7A1018 }));
  const RZ = 1.7, posts = [-5.2, -2.6, 2.6, 5.2];
  posts.forEach((x) => { add(new T.CylinderGeometry(0.03, 0.035, 0.95, 12), brass, x, 0.475, RZ); add(new T.SphereGeometry(0.06, 14, 10), brass, x, 0.97, RZ); add(new T.CylinderGeometry(0.16, 0.18, 0.04, 20), brass, x, 0.02, RZ); });
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i], b = posts[i + 1], pts = [];
    for (let k = 0; k <= 16; k++) { const t = k / 16; pts.push(new T.Vector3(a + (b - a) * t, 0.93 - Math.sin(t * Math.PI) * 0.22 * (b - a) / 5.2, RZ)); }
    add(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.024, 8, false), velvet, 0, 0, 0);
  }
  // 긴 의자 둘 — 전시실 가운데 양쪽(붉은 벨벳)
  for (const s of [-1, 1]) for (const z of [9.5, 16.5]) {
    add(new T.BoxGeometry(1.0, 0.16, 2.6), velvet, s * 2.9, 0.44, z);
    add(new T.BoxGeometry(0.9, 0.34, 2.4), woodDark, s * 2.9, 0.19, z);
  }

  // ── 입구 — 1873년 살롱이 열린 팔레 드 랭뒤스트리(1855, 샹젤리제)의 정문 그대로
  //   고증: P. Blanchard 판화 〈Façade du pavillon et de l'entrée principale du Palais de l'industrie〉 1855(Brown Univ. Library · Wikimedia Commons)
  //         Charles Marville 사진 〈Palais de l'Industrie, Porte principale〉 1878(Wikimedia Commons)
  //   큰 아치 아래 둥근 아치문(위 반원 유리창 · 쇠살 / 아래 나무 문짝) · 장미꽃 장식이 박힌 아치 테 · 쐐기돌 · 받침대 위 홈 파인 코린트식 기둥
  //   · 기둥 위 띠의 새긴 글씨 "A·L'INDUSTRIE·ET·AUX·ARTS·"(판화) · 톱니 처마 · 가로 줄눈이 깊은 돌 벽(사진)
  const stone = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#ad9d80'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { const x = Math.random() * w, y = Math.random() * h, r = 40 + Math.random() * 120, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${Math.random() < 0.5 ? '96,82,60' : '210,198,170'},.18)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }   // 얼룩진 돌 톤
    for (let i = 0; i < 70; i++) { const x = Math.random() * w, y = Math.random() * h * 0.6, l = 60 + Math.random() * 220; const gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(70,58,42,.16)'); gr.addColorStop(1, 'rgba(70,58,42,0)'); g.fillStyle = gr; g.fillRect(x, y, 2 + Math.random() * 5, l); }   // 빗물 자국(세로로 흘러내린 때)
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '70,58,44' : '255,248,232'},${Math.random() * 0.055})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 2); }
    const CH = 128, CW = 340;                                           // 한 단 0.45m · 돌 길이 1.2m 안팎
    for (let y = 0; y < h; y += CH) {
      g.fillStyle = 'rgba(50,40,30,.55)'; g.fillRect(0, y, w, 6); g.fillStyle = 'rgba(255,250,236,.35)'; g.fillRect(0, y + 6, w, 3);   // 깊은 가로 줄눈(사진) — 그늘 + 아랫돌 윗모서리 빛
      for (let x = ((y / CH) % 2) * CW / 2; x < w; x += CW) { g.fillStyle = 'rgba(60,48,36,.35)'; g.fillRect(x, y, 2, CH); }
    }
  });
  stone.wrapS = stone.wrapT = T.RepeatWrapping;
  const stoneMat = (rw, rh, tint = 0x9c8b6f) => { const t = stone.clone(); t.needsUpdate = true; t.repeat.set(rw / 1.6, rh / 1.8); return new T.MeshStandardMaterial({ map: t, color: tint, roughness: 0.9, metalness: 0, envMapIntensity: 0.12 }); };
  const smooth = new T.MeshStandardMaterial({ color: 0x968466, roughness: 0.82, metalness: 0, envMapIntensity: 0.15 });
  const smoothD = new T.MeshStandardMaterial({ color: 0x75664f, roughness: 0.85, metalness: 0, envMapIntensity: 0.12 });
  const iron = new T.MeshStandardMaterial({ color: 0x1b1a18, roughness: 0.55, metalness: 0.6, envMapIntensity: 0.5 });
  const ext = new T.MeshStandardMaterial({ color: 0x9A6A22, metalness: 1, roughness: 0.32, envMapIntensity: 0.9 });     // 금박(문 손잡이 둘레 등 최소)
  const DZ = L + 0.3, FW = (HW2 - DOOR_W) / 2, FZ = DZ + 0.3, R0 = DOOR_W / 2, AY = DOOR_H, ATOP = AY + R0;   // 아치: 문 위 반원(반지름 = 문 폭 절반)
  for (const s of [-1, 1]) add(new T.BoxGeometry(FW, CEIL, 0.6), stoneMat(FW, CEIL), s * (DOOR_W / 2 + FW / 2), CEIL / 2, DZ);
  { // 문 위 벽 — 반원으로 파낸 돌(아치)
    const sh = new T.Shape(); sh.moveTo(-R0, AY); sh.lineTo(-R0, CEIL); sh.lineTo(R0, CEIL); sh.lineTo(R0, AY); sh.absarc(0, AY, R0, 0, Math.PI, false);
    const t = stone.clone(); t.needsUpdate = true; t.repeat.set(1 / 1.6, 1 / 1.8);
    const m = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false, curveSegments: 48 }), new T.MeshStandardMaterial({ map: t, color: 0x9c8b6f, roughness: 0.9, envMapIntensity: 0.12 }));
    m.position.set(0, 0, DZ - 0.3); scene.add(m);
  }
  // 문간 옆면(지나갈 때 보이는 두께)
  for (const s of [-1, 1]) { const t = stone.clone(); t.needsUpdate = true; t.repeat.set(0.4, 3); add(new T.PlaneGeometry(0.6, DOOR_H), new T.MeshLambertMaterial({ map: t, color: 0x9a8a76 }), s * (DOOR_W / 2 - 0.002), DOOR_H / 2, DZ, -s * Math.PI / 2); }
  { const t = stone.clone(); t.needsUpdate = true; t.repeat.set(2, 0.4); add(new T.PlaneGeometry(DOOR_W, 0.6), new T.MeshBasicMaterial({ map: t, color: 0xb8a68c }), 0, DOOR_H - 0.002, DZ, 0, Math.PI / 2); }
  // 반원 유리창(판화 · 사진: 아치 윗부분은 유리, 쇠살이 부채꼴로) — 안쪽 전시실 빛이 비친다
  const fan = new T.Group(); fan.position.set(0, AY, DZ + 0.02); scene.add(fan);
  fan.add(new T.Mesh(new T.CircleGeometry(R0, 48, 0, Math.PI), new T.MeshStandardMaterial({ color: 0x15130f, roughness: 0.12, metalness: 0.6, envMapIntensity: 1.1, transparent: true, opacity: 0.86 })   /* 11/17: 바깥에서 본 유리는 어둡게(사진) — 하늘빛만 살짝 비침 */));
  { const bar = (w, h, x, y, rz) => { const m = new T.Mesh(new T.BoxGeometry(w, h, 0.04), iron); m.position.set(x, y, 0.02); m.rotation.z = rz; fan.add(m); };
    bar(DOOR_W, 0.06, 0, 0.03, 0);                                                           // 문 위 가로대(문틀)
    for (let k = 1; k < 6; k++) { const a = Math.PI * k / 6; bar(0.03, R0, Math.cos(a) * R0 / 2, Math.sin(a) * R0 / 2, a - Math.PI / 2); }   // 부채살
    for (const r of [0.55, 1.05]) { const m = new T.Mesh(new T.TorusGeometry(r, 0.016, 6, 48, Math.PI), iron); m.position.z = 0.02; fan.add(m); }
    const m = new T.Mesh(new T.TorusGeometry(R0 - 0.02, 0.03, 6, 64, Math.PI), iron); m.position.z = 0.02; fan.add(m); }
  // 아치 테(판화: 여러 겹 띠 + 장미꽃 장식 줄) · 문 양옆으로 내려오는 띠 · 쐐기돌
  const archBand = (r, tube, m, z) => { const t = new T.Mesh(new T.TorusGeometry(r, tube, 10, 72, Math.PI), m); t.position.set(0, AY, z); scene.add(t); for (const s of [-1, 1]) add(new T.BoxGeometry(tube * 2, AY, tube * 2), m, s * r, AY / 2, z); };
  archBand(R0 + 0.06, 0.06, smooth, FZ + 0.04); archBand(R0 + 0.3, 0.07, smooth, FZ + 0.05); archBand(R0 + 0.42, 0.045, smoothD, FZ + 0.03);
  { // 띠 사이 판(평평한 돌) + 장미꽃(둥근 꽃 장식) 줄
    const sh = new T.Shape(); sh.absarc(0, 0, R0 + 0.36, 0, Math.PI, false); sh.lineTo(-(R0 + 0.36), -AY); sh.lineTo(-(R0 + 0.1), -AY); sh.absarc(0, 0, R0 + 0.1, Math.PI, 0, true); sh.lineTo(R0 + 0.1, -AY); sh.closePath();
    const m = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false, curveSegments: 48 }), smoothD); m.position.set(0, AY, FZ); scene.add(m);
    const ros = new T.CylinderGeometry(0.045, 0.045, 0.04, 16), cen = new T.SphereGeometry(0.022, 10, 8);
    const put = (x, y) => { const r = new T.Mesh(ros, smooth); r.rotation.x = Math.PI / 2; r.position.set(x, y, FZ + 0.07); scene.add(r); const c = new T.Mesh(cen, smooth); c.position.set(x, y, FZ + 0.09); scene.add(c); };
    for (let k = 1; k < 12; k++) { const a = Math.PI * k / 12; put(Math.cos(a) * (R0 + 0.18), AY + Math.sin(a) * (R0 + 0.18)); }
    for (const s of [-1, 1]) for (let y = AY - 0.45; y > 0.5; y -= 0.62) put(s * (R0 + 0.18), y);
  }
  { // 쐐기돌 — 아래가 좁은 돌 + 둘레 잎 장식(판화)
    const sh = new T.Shape(); sh.moveTo(-0.17, 0); sh.lineTo(0.17, 0); sh.lineTo(0.24, 0.62); sh.lineTo(-0.24, 0.62); sh.closePath();
    const k = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 }), smooth); k.position.set(0, ATOP - 0.08, FZ); scene.add(k);
    const sc = new T.Mesh(new T.CylinderGeometry(0.1, 0.12, 0.05, 20), smoothD); sc.rotation.x = Math.PI / 2; sc.position.set(0, ATOP + 0.24, FZ + 0.25); scene.add(sc);
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const lf = add(new T.SphereGeometry(0.05, 10, 6), smooth, s * (0.17 + i * 0.07), ATOP + 0.36 - i * 0.04, FZ + 0.16); lf.scale.set(1.4, 0.55, 0.45); lf.rotation.z = s * (0.5 - i * 0.18); }
  }
  // 기둥 — 받침대 · 받침(둥근 단 둘) · 홈 파인 몸(둥근 기둥) · 코린트식 머리(잎 두 줄 · 소용돌이 · 덮개판)
  const CX = R0 + 0.72, CR = 0.2, PED = 0.95, SH0 = PED + 0.18, CAP0 = ATOP - 0.05, CAP1 = CAP0 + 0.5;
  const flute = canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#c0b39c'; g.fillRect(0, 0, w, h);
    const n = 20, fw = w / n;
    for (let k = 0; k < n; k++) { const x = k * fw, gr = g.createLinearGradient(x, 0, x + fw, 0); gr.addColorStop(0, 'rgba(255,250,236,.6)'); gr.addColorStop(0.2, 'rgba(70,58,44,.45)'); gr.addColorStop(0.8, 'rgba(70,58,44,.12)'); gr.addColorStop(1, 'rgba(255,250,236,.5)'); g.fillStyle = gr; g.fillRect(x + fw * 0.12, 0, fw * 0.76, h); }
  });
  flute.wrapS = T.RepeatWrapping;
  const fluteMat = new T.MeshStandardMaterial({ map: flute, color: 0x968668, roughness: 0.8, metalness: 0, envMapIntensity: 0.15 });
  const leafGeo = new T.SphereGeometry(1, 10, 8);
  for (const s of [-1, 1]) {
    const x = s * CX;
    add(new T.BoxGeometry(0.66, PED - 0.12, 0.66), smooth, x, (PED - 0.12) / 2, FZ + 0.33);                 // 받침대
    add(new T.BoxGeometry(0.72, 0.12, 0.72), smoothD, x, PED - 0.06, FZ + 0.36);
    add(new T.CylinderGeometry(CR + 0.07, CR + 0.08, 0.1, 32), smooth, x, PED + 0.05, FZ + 0.33);            // 받침 둥근 단
    add(new T.TorusGeometry(CR + 0.03, 0.035, 10, 32), smooth, x, PED + 0.13, FZ + 0.33, 0, Math.PI / 2);
    add(new T.CylinderGeometry(CR, CR + 0.01, CAP0 - SH0, 32, 1, true), fluteMat, x, (SH0 + CAP0) / 2, FZ + 0.33);   // 홈 파인 몸
    add(new T.TorusGeometry(CR + 0.01, 0.02, 8, 32), smooth, x, CAP0 + 0.01, FZ + 0.33, 0, Math.PI / 2);      // 목 고리
    add(new T.CylinderGeometry(CR + 0.11, CR, 0.42, 32), smoothD, x, CAP0 + 0.23, FZ + 0.33);                  // 머리 몸(종 모양)
    for (let row = 0; row < 2; row++) for (let i = 0; i < 10; i++) {                                         // 아칸서스 잎 두 줄
      const a = (i + row * 0.5) / 10 * Math.PI * 2, r = CR + 0.04 + row * 0.04, lf = new T.Mesh(leafGeo, smooth);
      lf.position.set(x + Math.cos(a) * r, CAP0 + 0.1 + row * 0.15, FZ + 0.33 + Math.sin(a) * r); lf.scale.set(0.055, 0.12, 0.03); lf.lookAt(x + Math.cos(a) * 2, CAP0 + 0.4, FZ + 0.33 + Math.sin(a) * 2); scene.add(lf);
    }
    for (const sx of [-1, 1]) { const v = add(new T.TorusGeometry(0.045, 0.018, 8, 20), smooth, x + sx * (CR + 0.1), CAP1 - 0.1, FZ + 0.33 + CR + 0.08); }   // 모서리 소용돌이
    add(new T.BoxGeometry(0.74, 0.08, 0.74), smooth, x, CAP1 - 0.04, FZ + 0.33);                              // 덮개판
  }
  // 띠(엔타블러처) — 아래띠 두 단 · 글씨 띠 · 톱니 처마
  const EW = 2 * (CX + 0.42), E0 = CAP1, E1 = E0 + 0.3, E2 = E1 + 0.62, E3 = E2 + 0.42;
  add(new T.BoxGeometry(EW, 0.14, 0.72), smooth, 0, E0 + 0.07, FZ + 0.36); add(new T.BoxGeometry(EW, 0.16, 0.76), smoothD, 0, E0 + 0.22, FZ + 0.38);
  add(new T.BoxGeometry(EW, E2 - E1, 0.66), smooth, 0, (E1 + E2) / 2, FZ + 0.33);
  const insc = canvasTex(2048, 300, (g, w, h) => {                                                          // 새긴 글씨 판(판화 그대로)
    g.fillStyle = '#b9ac96'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '70,58,44' : '255,248,232'},${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.strokeStyle = 'rgba(60,48,36,.7)'; g.lineWidth = 6; g.strokeRect(40, 34, w - 80, h - 68); g.strokeStyle = 'rgba(255,250,236,.55)'; g.lineWidth = 3; g.strokeRect(48, 42, w - 96, h - 84);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '500 112px "Times New Roman", Georgia, serif';
    const txt = 'A·L’INDUSTRIE·ET·AUX·ARTS·', sp = 14;
    const chars = [...txt], widths = chars.map((c) => g.measureText(c).width + sp), tot = widths.reduce((a, b) => a + b, 0); let x = (w - tot) / 2;
    chars.forEach((c, i) => { const cx = x + widths[i] / 2; g.fillStyle = 'rgba(255,250,236,.55)'; g.fillText(c, cx + 2, h / 2 + 7); g.fillStyle = 'rgba(48,38,28,.9)'; g.fillText(c, cx, h / 2 + 4); x += widths[i]; });   // 새긴 글자: 아랫모서리 빛 + 파인 그늘
  });
  const IW = 3.9;   // 글씨 판 폭 — 휴대폰 세로 화면에서 양끝 글자가 잘리지 않게
  add(new T.PlaneGeometry(IW, IW * 300 / 2048), new T.MeshStandardMaterial({ map: insc, roughness: 0.85, envMapIntensity: 0.12, color: 0xa89878 }), 0, (E1 + E2) / 2, FZ + 0.665);
  add(new T.BoxGeometry(EW + 0.1, 0.08, 0.8), smoothD, 0, E2 + 0.04, FZ + 0.4);
  { const dn = Math.floor((EW + 0.1) / 0.13), dent = new T.InstancedMesh(new T.BoxGeometry(0.07, 0.1, 0.08), smooth, dn), m4 = new T.Matrix4();
    for (let i = 0; i < dn; i++) { m4.makeTranslation(-EW / 2 + 0.06 + i * 0.13, E2 + 0.13, FZ + 0.84); dent.setMatrixAt(i, m4); } scene.add(dent); }
  add(new T.BoxGeometry(EW + 0.3, 0.12, 0.98), smooth, 0, E2 + 0.24, FZ + 0.49); add(new T.BoxGeometry(EW + 0.4, 0.1, 1.04), smoothD, 0, E3 - 0.05, FZ + 0.52);
  // 아치와 기둥 사이 귀퉁이(스팬드럴) — 둥근 메달(사진 · 판화) + 덩굴 잎 부조
  const spandrel = canvasTex(1024, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const k = w / (2 * (CX - CR)), cx = w / 2, by = h;                                                       // 아치 밖 귀퉁이만
    for (const s of [-1, 1]) {
      const mx = cx + s * (R0 + 0.62) * k * 0.86, my = h * 0.3;
      g.fillStyle = 'rgba(70,58,44,.55)'; g.beginPath(); g.arc(mx + 3, my + 4, 54, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(205,193,172,1)'; g.beginPath(); g.arc(mx, my, 54, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(80,66,50,.7)'; g.lineWidth = 5; g.beginPath(); g.arc(mx, my, 44, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillStyle = 'rgba(90,74,56,.55)'; g.beginPath(); g.ellipse(mx + Math.cos(a) * 24, my + Math.sin(a) * 24, 6, 13, a, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = 'rgba(90,74,56,.55)'; g.lineWidth = 6;                                                  // 덩굴(메달 양옆으로 말리는 선)
      for (const d of [-1, 1]) { g.beginPath(); g.moveTo(mx + d * 58, my + 6); g.bezierCurveTo(mx + d * 110, my - 40, mx + d * 150, my + 50, mx + d * 120, my + 90); g.stroke(); g.beginPath(); g.arc(mx + d * 112, my + 70, 18, 0, Math.PI * 1.6); g.stroke(); }
    }
  });
  add(new T.PlaneGeometry(2 * (CX - CR), (2 * (CX - CR)) / 2), new T.MeshStandardMaterial({ map: spandrel, transparent: true, roughness: 0.85, envMapIntensity: 0.12, color: 0x9a8d77 }), 0, ATOP - 0.15, FZ + 0.012);
  // 대기실 — 바닥(흑백 대리석), 옆벽, 천장. 빛은 문틈과 양옆 벽등뿐이라 어둡게
  const marble = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#2a2420' : '#8b8278'; g.fillRect(x * 64, y * 64, 64, 64); } });
  marble.wrapS = marble.wrapT = T.RepeatWrapping; marble.repeat.set(4, 4);
  add(new T.PlaneGeometry(HW2, 12), new T.MeshLambertMaterial({ map: marble, color: 0x6a6058 }), 0, 0.001, L + 6.6, 0, -Math.PI / 2);
  for (const s of [-1, 1]) add(new T.PlaneGeometry(12, CEIL), stoneMat(12, CEIL), s * HW, CEIL / 2, L + 6.6, -s * Math.PI / 2);
  add(new T.PlaneGeometry(HW2, 12), new T.MeshLambertMaterial({ color: 0x0e0907, side: T.DoubleSide }), 0, CEIL, L + 6.6, 0, Math.PI / 2);
  const doorTex = (flip) => canvasTex(256, 864, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#1f120a'); gr.addColorStop(0.5, '#2b190e'); gr.addColorStop(1, '#1c1009'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1100; i++) { g.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 8 + Math.random() * 40); }
    const panel = (x, y, pw, ph) => { g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x, y, pw, ph); g.strokeStyle = '#4a3220'; g.lineWidth = 5; g.strokeRect(x, y, pw, ph); g.strokeStyle = 'rgba(150,110,70,.35)'; g.lineWidth = 1.5; g.strokeRect(x + 10, y + 10, pw - 20, ph - 20); };
    panel(28, 30, w - 56, 300); panel(28, 360, w - 56, 150); panel(28, 540, w - 56, 300);
    const hx = flip ? 10 : w - 18; g.fillStyle = '#d8ad55'; g.fillRect(hx, 420, 8, 80); g.fillStyle = '#fff1c0'; g.fillRect(hx + 2, 424, 2, 70);
  });
  const doorWood = new T.MeshStandardMaterial({ color: 0x2a170e, roughness: 0.6, metalness: 0 });
  const doors = [-1, 1].map((s) => {
    const hinge = new T.Group(); hinge.position.set(s * DOOR_W / 2, 0, DZ); scene.add(hinge);
    const face = new T.MeshStandardMaterial({ map: doorTex(s > 0), roughness: 0.42, metalness: 0.1, envMapIntensity: 0.5 });
    const d = new T.Mesh(new T.BoxGeometry(DOOR_W / 2, DOOR_H, 0.09), [doorWood, doorWood, doorWood, doorWood, face, face]);
    d.position.set(-s * DOOR_W / 4, DOOR_H / 2, 0); hinge.add(d);
    // 11/17: 판 둘레 돋은 몰딩(그림 판 자리 그대로) · 놋쇠 손잡이 — 문짝이 평평한 그림처럼 보이지 않게
    const LW = DOOR_W / 2, kx = LW / 256, ky = DOOR_H / 864, mold = new T.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.5, metalness: 0, envMapIntensity: 0.6 });
    const rim = (x0, y0, pw, ph) => {
      const cx = -LW / 2 + (x0 + pw / 2) * kx, cy = DOOR_H / 2 - (y0 + ph / 2) * ky, W2 = pw * kx, H2 = ph * ky, t = 0.035;
      for (const [w, h, x, y] of [[W2 + t, t, cx, cy + H2 / 2], [W2 + t, t, cx, cy - H2 / 2], [t, H2, cx - W2 / 2, cy], [t, H2, cx + W2 / 2, cy]]) {
        for (const zs of [1, -1]) { const m = new T.Mesh(new T.BoxGeometry(w, h, 0.03), mold); m.position.set(x, y, zs * 0.058); d.add(m); }
      }
    };
    rim(28, 30, 200, 300); rim(28, 360, 200, 150); rim(28, 540, 200, 300);
    const hx = (s > 0 ? -LW / 2 + 0.07 : LW / 2 - 0.07);
    for (const zs of [1, -1]) {
      const hd = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 0.5, 14), brass); hd.position.set(hx, DOOR_H / 2 - 0.65, zs * 0.11); d.add(hd);
      for (const dy of [0.22, -0.22]) { const st = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.07, 10), brass); st.rotation.x = Math.PI / 2; st.position.set(hx, DOOR_H / 2 - 0.65 + dy, zs * 0.075); d.add(st); }
    }
    return { hinge, s };
  });
  // 문틈의 빛 — 가운데 세로 한 줄(가늘게)과 문 아래 바닥으로 새는 빛
  const shaftTex = canvasTex(64, 256, (c, w, h) => {
    const gx = c.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gx; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'destination-in'; const gy = c.createLinearGradient(0, 0, 0, h); gy.addColorStop(0, 'rgba(0,0,0,.95)'); gy.addColorStop(0.75, 'rgba(0,0,0,.35)'); gy.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gy; c.fillRect(0, 0, w, h);
  });
  const glowTex = canvasTex(128, 128, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,236,200,1)'); gr.addColorStop(0.2, 'rgba(255,196,120,.5)'); gr.addColorStop(0.55, 'rgba(255,150,70,.1)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
  const addMat = (map, color, opacity = 1) => new T.MeshBasicMaterial({ map, color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
  const seam = add(plane, addMat(glowTex, 0xffd29a), 0, DOOR_H / 2, DZ + 0.06); seam.scale.set(0.12, DOOR_H * 1.05, 1);
  const sill = add(plane, addMat(glowTex, 0xffc27a), 0, 0.01, DZ + 0.5, 0, -Math.PI / 2); sill.scale.set(DOOR_W * 1.2, 0.9, 1);
  // 대기실 벽등(빛망울만)
  const sconces = [];
  for (const s of [-1, 1]) { const g = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xffb070, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); g.position.set(s * (DOOR_W / 2 + 1.6), 3.3, DZ + 0.5); g.scale.setScalar(1.3); scene.add(g); sconces.push(g); }
  // 천창에서 내려오는 빛줄기 · 빛 속의 먼지 — 입장할 때만 보인다
  const shafts = [];
  for (let k = 0; k < 6; k++) {
    const m = add(plane, new T.MeshBasicMaterial({ map: shaftTex, color: 0xfff0d6, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }), (R() - 0.5) * HW2 * 0.7, CEIL * 0.5, 2.5 + k * (L - 4) / 6 + R() * 1.5);
    m.scale.set(1.2 + R() * 1.0, CEIL * 1.15, 1); m.rotation.z = 0.16 + (R() - 0.5) * 0.08; shafts.push({ m, o: 0.05 + R() * 0.05 });
  }
  const N = 500, dpos = new Float32Array(N * 3), dseed = new Float32Array(N);
  const dotTex = canvasTex(32, 32, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
  for (let i = 0; i < N; i++) { dpos[i * 3] = (R() - 0.5) * HW2 * 0.9; dpos[i * 3 + 1] = R() * CEIL; dpos[i * 3 + 2] = 1 + R() * (L - 1); dseed[i] = R() * 100; }
  const dgeo = new T.BufferGeometry(); dgeo.setAttribute('position', new T.BufferAttribute(dpos.slice(), 3));
  const dust = new T.Points(dgeo, new T.PointsMaterial({ map: dotTex, size: 0.05, color: 0xffe6c4, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
  scene.add(dust);

  let dimK = 1;
  return {
    /** 문 열림 0..1 */
    setDoor(od, time) {
      doors.forEach(({ hinge, s }) => { hinge.rotation.y = -s * od * 1.62; });   // 안쪽(-z)으로 열린다
      const fl = 0.85 + 0.15 * Math.sin(time * 9);
      seam.material.opacity = (1 - Math.min(1, od * 3)) * fl; sill.material.opacity = (1 - od) * 0.8 * fl;
      sconces.forEach((g, k) => { g.material.opacity = 0.75 * (1 + 0.08 * Math.sin(time * 17 + k * 2.1)); });
    },
    /** 입장 동안의 공기(빛줄기·먼지) 0..1 */
    setAir(a, time) {
      shafts.forEach((s, k) => { s.m.material.opacity = s.o * a * (0.85 + 0.15 * Math.sin(time * 0.7 + k)); s.m.visible = a > 0.01; });
      dust.visible = a > 0.01; dust.material.opacity = 0.7 * a;
      if (a > 0.01) {
        const pa = dgeo.attributes.position.array;
        for (let i = 0; i < N; i++) { const s = dseed[i]; pa[i * 3] = dpos[i * 3] + Math.sin(time * 0.31 + s) * 0.2; pa[i * 3 + 1] = dpos[i * 3 + 1] + Math.sin(time * 0.23 + s * 1.7) * 0.15 - ((time * 0.05 + s * 0.09) % 0.6); pa[i * 3 + 2] = dpos[i * 3 + 2] + Math.cos(time * 0.27 + s) * 0.2; }
        dgeo.attributes.position.needsUpdate = true;
      }
    },
    /** 방 전체를 어둡게(확대 때 후보작 하나만 남도록) — k: 1 원래, 0.3 어둡게 */
    dim(k) {
      if (Math.abs(k - dimK) < 0.003) return; dimK = k;
      dimList.forEach(([m, c, env]) => { m.color.copy(c).multiplyScalar(k); if (env !== undefined) m.envMapIntensity = env * k; });
    },
  };
}
