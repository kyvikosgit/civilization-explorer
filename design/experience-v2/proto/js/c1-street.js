// C1 해 질 녘 대로 — 칼럼 뒤에 서는 3D 거리 (three.js, 모두 절차 생성 · 외부 모델 없음)
//   치수는 오스만식 대로의 규칙에서: 처마 높이 17~19.5m(1층+중이층 · 발코니가 이어진 3층(2e) · 4·5층 · 발코니가 이어진 6층(5e)) + 45° 망사르 지붕과 지붕창,
//   창 간격 약 3.3m, 보도 8m · 차도 18m(카퓌신 대로 폭 약 35m), 가스 가로등(candélabre)은 연석을 따라 약 28m 간격, 보도 가장자리에 가로수(4월 — 잎 나기 전)
//   칼럼은 왼쪽 보도, 연석에서 1.6m 안쪽(원점). 대로는 카메라가 보는 방향(-z)에서 오른쪽으로 조금(0.05 rad) 틀어져 멀어진다
//   해 질 녘이라 건물 면은 빛을 미리 칠한 그림(가스등 쪽 아래가 따뜻하고 위로 갈수록 푸르게 어둡다, 불 켜진 창 몇) — MeshBasic + 안개
//   움직이는 것: 가로등 점화(호스트가 차례로), 가스 불꽃의 미세한 흔들림, 멀리 대로를 오가는 마차 등불과 젖은 길의 반사
function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

export const STREET = { TH: 0.05, FAC_L: -6.4, CURB_L: 1.6, CURB_R: 19.6, FAC_R: 27.6, T_END: 600 };

export function buildStreet(T, { maxAniso = 4, reduceMotion = false, mobile = true } = {}) {
  const { TH, FAC_L, CURB_L, CURB_R, FAC_R, T_END } = STREET;
  const root = new T.Group();
  const B = new T.Group(); B.rotation.y = -TH; root.add(B);   // B 안에서 x = 가로(보도→차도), z = -t(멀어지는 쪽), y = 높이
  const R = rnd(1874);
  const PXM = mobile ? 24 : 32;                                // 건물 면 텍스처 px/m
  const tex = (c, rep) => { const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = maxAniso; if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; } return t; };
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // ── 건물 면 — 변형 6가지(층 높이·석재 색·불 켜진 창이 다르다). 한 장 = 폭 19.8m(창 6칸 × 3.3m) × 처마까지 높이
  const BAY = 3.3, NB = 6, FW = BAY * NB;
  function facade(seed, H, stone) {
    const r = rnd(seed), W = Math.round(FW * PXM), Hp = Math.round(H * PXM), c = canvas(W, Hp), g = c.getContext('2d');
    const Y = (m) => Hp - m * PXM, X = (m) => m * PXM;
    // 석재 — 아래(가스등)는 따뜻하게, 위(하늘빛)는 푸르게 어둡다
    const gr = g.createLinearGradient(0, Hp, 0, 0);
    gr.addColorStop(0, `rgb(${stone[0] + 34},${stone[1] + 18},${stone[2] - 2})`);
    gr.addColorStop(0.28, `rgb(${stone[0]},${stone[1]},${stone[2]})`);
    gr.addColorStop(1, `rgb(${stone[0] - 46},${stone[1] - 40},${stone[2] - 22})`);
    g.fillStyle = gr; g.fillRect(0, 0, W, Hp);
    for (let k = 0; k < W * Hp / 60; k++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,240,220'},${0.02 + r() * 0.03})`; g.fillRect(r() * W, r() * Hp, 1 + r() * 3, 1 + r() * 2); }
    // 층 (m): 1층 0–4.2 · 중이층 4.2–6.6 · 2e 6.6–(…) · 3e · 4e · 5e(발코니) · 처마 H
    const f2 = 6.6, f5 = H - 2.6, mid = (f5 - f2) / 3;
    const floors = [[f2, f2 + mid, 2.15], [f2 + mid, f2 + 2 * mid, 1.95], [f2 + 2 * mid, f5, 1.8], [f5, H - 0.5, 1.6]];
    // 석재 줄눈(1층·중이층 bossage)
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1;
    for (let y = 0.45; y < 6.6; y += 0.45) { g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(W, Y(y)); g.stroke(); }
    // 띠 · 처마돌림
    const band = (y, h, light = 0.22) => { g.fillStyle = `rgba(255,236,205,${light})`; g.fillRect(0, Y(y + h), W, h * PXM); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, Y(y), W, Math.max(2, 0.12 * PXM)); };
    band(4.2, 0.25, 0.12); band(f2 - 0.1, 0.3, 0.18); band(H - 0.55, 0.55, 0.26);
    const lit = () => r() < 0.3;
    function win(x, y0, h, on, rail) {
      const ww = 1.25;
      const x0 = X(x - ww / 2), y = Y(y0 + h), wpx = ww * PXM, hpx = h * PXM;
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x0 - 3, y - 3, wpx + 6, hpx + 4);            // 창틀 그늘
      if (on) {
        const lg = g.createLinearGradient(0, y, 0, y + hpx);
        lg.addColorStop(0, '#ffcf8a'); lg.addColorStop(1, '#d98a45');
        g.fillStyle = lg; g.fillRect(x0, y, wpx, hpx);
        g.fillStyle = 'rgba(120,50,20,.35)'; g.fillRect(x0, y, wpx * 0.22, hpx); g.fillRect(x0 + wpx * 0.78, y, wpx * 0.22, hpx);   // 커튼
      } else {
        const dg = g.createLinearGradient(0, y, 0, y + hpx);
        dg.addColorStop(0, 'rgb(52,54,74)'); dg.addColorStop(1, 'rgb(22,22,30)');
        g.fillStyle = dg; g.fillRect(x0, y, wpx, hpx);
      }
      g.fillStyle = on ? 'rgba(60,30,10,.7)' : 'rgba(0,0,0,.55)';
      g.fillRect(x0 + wpx / 2 - 1, y, 2, hpx); g.fillRect(x0, y + hpx * 0.38, wpx, 2);   // 창살
      g.fillStyle = 'rgba(255,240,215,.22)'; g.fillRect(x0 - 4, y - 5, wpx + 8, 4);    // 창 위 장식돌
      if (rail) { g.fillStyle = 'rgba(10,10,12,.75)'; g.fillRect(x0 - 2, Y(y0 + 0.95), wpx + 4, 2); for (let k = 0; k <= 8; k++) g.fillRect(x0 + k * wpx / 8, Y(y0 + 0.95), 1.2, 0.95 * PXM); }
    }
    for (let b = 0; b < NB; b++) {
      const cx = BAY * (b + 0.5);
      // 1층 가게 — 큰 진열창(몇은 불이 환하다), 위에 간판 띠
      const shop = r() < 0.4;
      const x0 = X(cx - 1.35), sw = 2.7 * PXM, y = Y(3.5), sh = 3.3 * PXM;
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x0 - 3, y - 3, sw + 6, sh + 3);
      if (shop) { const sg = g.createLinearGradient(0, y, 0, y + sh); sg.addColorStop(0, '#f2c486'); sg.addColorStop(1, '#a8652f'); g.fillStyle = sg; }
      else g.fillStyle = 'rgb(26,24,28)';
      g.fillRect(x0, y, sw, sh);
      if (shop) { g.fillStyle = 'rgba(70,35,15,.55)'; for (let k = 1; k < 4; k++) g.fillRect(x0 + k * sw / 4 - 1, y, 2, sh); g.fillRect(x0, y + sh * 0.3, sw, 2); }
      g.fillStyle = `rgba(${20 + r() * 30 | 0},${16 + r() * 12 | 0},${14 + r() * 10 | 0},.9)`; g.fillRect(x0 - 4, Y(4.15), sw + 8, 0.5 * PXM);   // 간판
      win(cx, 4.55, 1.5, lit() && r() < 0.6, false);                                    // 중이층
      floors.forEach(([a, b2, h], fi) => win(cx, a + 0.25, Math.min(h, b2 - a - 0.55), lit(), fi > 0 && fi < 3));
    }
    // 이어진 발코니(2e · 5e) — 쇠 난간
    [f2, f5].forEach((y) => {
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, Y(y), W, 0.22 * PXM);
      g.fillStyle = 'rgba(12,11,14,.85)'; g.fillRect(0, Y(y + 1.0), W, 2.5);
      for (let x = 0; x < W; x += 0.14 * PXM) g.fillRect(x, Y(y + 1.0), 1.2, 0.95 * PXM);
      g.fillStyle = 'rgba(255,236,205,.16)'; g.fillRect(0, Y(y) - 1, W, 2);
    });
    // 건물 사이 경계(벽기둥)
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 0, 3, Hp); g.fillRect(W - 3, 0, 3, Hp);
    return c;
  }
  function roofTex(seed) {   // 망사르 지붕(경사 4.2m) — 슬레이트, 지붕창(몇은 불), 위 끝 아연 마감
    const r = rnd(seed), W = Math.round(FW * PXM), Hp = Math.round(4.6 * PXM), c = canvas(W, Hp), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, Hp, 0, 0); gr.addColorStop(0, 'rgb(58,62,76)'); gr.addColorStop(1, 'rgb(28,30,40)');
    g.fillStyle = gr; g.fillRect(0, 0, W, Hp);
    g.strokeStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < Hp; y += 5) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (let b = 0; b < NB; b++) {
      const cx = (BAY * (b + 0.5)) * PXM, ww = 0.9 * PXM, hh = 1.35 * PXM, y = Hp - 2.6 * PXM;
      g.fillStyle = 'rgba(205,195,180,.55)'; g.fillRect(cx - ww / 2 - 4, y - 6, ww + 8, hh + 8);
      g.beginPath(); g.moveTo(cx - ww / 2 - 6, y - 4); g.lineTo(cx, y - 0.5 * PXM); g.lineTo(cx + ww / 2 + 6, y - 4); g.fill();
      g.fillStyle = r() < 0.25 ? '#f2b56e' : 'rgb(24,25,34)'; g.fillRect(cx - ww / 2, y, ww, hh);
    }
    g.fillStyle = 'rgba(150,150,160,.35)'; g.fillRect(0, 0, W, 3);
    return c;
  }
  const STONES = [[132, 120, 106], [124, 114, 104], [140, 126, 108], [118, 110, 102], [136, 124, 112], [128, 116, 98]];
  const facMats = STONES.map((s, i) => {
    const H = 17.2 + (i % 3) * 0.9;
    return { H, mat: new T.MeshBasicMaterial({ map: tex(facade(100 + i * 17, H, s)), fog: true }) };
  });
  const roofMats = [0, 1, 2].map((i) => new T.MeshBasicMaterial({ map: tex(roofTex(300 + i)), fog: true }));
  const chimneyMat = new T.MeshBasicMaterial({ color: 0x1d1c22, fog: true });

  // 면 하나 = 직사각형(사각형 4점) — 같은 재질끼리 한 기하로 묶는다
  const quads = new Map();
  function quad(mat, p0, p1, p2, p3, u1 = 1) {   // p0 왼아래 p1 오른아래 p2 오른위 p3 왼위 (B 좌표)
    if (!quads.has(mat)) quads.set(mat, { pos: [], uv: [], idx: [] });
    const q = quads.get(mat), n = q.pos.length / 3;
    [p0, p1, p2, p3].forEach((p) => q.pos.push(p[0], p[1], p[2]));
    q.uv.push(0, 0, u1, 0, u1, 1, 0, 1);
    q.idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  }
  const chimneys = [];
  // 한쪽 줄 — side -1 왼쪽(면이 +x 를 본다) · +1 오른쪽(면이 -x 를 본다)
  function row(side, xFace, t0) {
    let t = t0, k = side < 0 ? 0 : 3;
    while (t < T_END) {
      const fm = facMats[(k + (R() * 2 | 0)) % facMats.length]; k++;
      const n = 1 + (R() < 0.45 ? 1 : 0), w = FW * n, H = fm.H;
      const za = -t, zb = -(t + w);
      // 면: 왼쪽 줄은 보는 쪽(+x)에서 봐서 왼아래가 가까운 쪽(z 큰 쪽)
      if (side < 0) quad(fm.mat, [xFace, 0, za], [xFace, 0, zb], [xFace, H, zb], [xFace, H, za], n);
      else quad(fm.mat, [xFace, 0, zb], [xFace, 0, za], [xFace, H, za], [xFace, H, zb], n);
      // 망사르 — 처마에서 3m 안으로 들어가며 4.2m 올라간다(약 54°)
      const xr = xFace + side * 3.0, rm = roofMats[(R() * 3) | 0];
      if (side < 0) quad(rm, [xFace, H, za], [xFace, H, zb], [xr, H + 4.2, zb], [xr, H + 4.2, za], n);
      else quad(rm, [xFace, H, zb], [xFace, H, za], [xr, H + 4.2, za], [xr, H + 4.2, zb], n);
      // 굴뚝 — 하늘을 배경으로 실루엣
      for (let c = 0; c < n * 2; c++) if (R() < 0.75) chimneys.push([xr + side * (0.8 + R() * 2), H + 4.2, -(t + 2 + R() * (w - 4)), 0.5 + R() * 0.9, 1.2 + R() * 1.4]);
      t += w;
      if (R() < 0.12 && t > 60) t += 14 + R() * 6;          // 옆길 — 사이로 어둠과 먼 불빛
    }
  }
  row(-1, FAC_L, -40); row(1, FAC_R, -60);
  quads.forEach((q, mat) => {
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(q.pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(q.uv, 2));
    geo.setIndex(q.idx);
    const m = new T.Mesh(geo, mat); m.frustumCulled = false; B.add(m);
    if (mat.map) { mat.map.wrapS = T.RepeatWrapping; }
  });
  // 굴뚝 — 한 덩어리
  {
    const cg = new T.BoxGeometry(1, 1, 1); cg.translate(0, 0.5, 0);
    const im = new T.InstancedMesh(cg, chimneyMat, chimneys.length), m4 = new T.Matrix4();
    chimneys.forEach(([x, y, z, w, h], i) => { m4.makeScale(w, h, w * 0.6); m4.setPosition(x, y, z); im.setMatrixAt(i, m4); });
    B.add(im);
  }
  // 옆길 사이의 먼 벽(어둠 속 창 몇) — 대로 뒤 한 겹
  {
    const c = canvas(512, 256), g = c.getContext('2d'); g.fillStyle = 'rgb(30,26,34)'; g.fillRect(0, 0, 512, 256);
    const r = rnd(7); for (let k = 0; k < 40; k++) { g.fillStyle = r() < 0.4 ? 'rgba(255,190,110,.85)' : 'rgba(60,60,80,.6)'; g.fillRect(r() * 500, 40 + r() * 200, 10, 16); }
    const m = new T.MeshBasicMaterial({ map: tex(c), fog: true });
    [[FAC_L - 22, 1], [FAC_R + 22, -1]].forEach(([x, s]) => { const p = new T.Mesh(new T.PlaneGeometry(T_END, 20), m); p.rotation.y = s * Math.PI / 2; p.position.set(x, 10, -T_END / 2); B.add(p); });
  }

  // ── 바닥 — 보도(아스팔트 · 연석) · 차도(포석, 젖은 윤기). 칼럼 그림자를 받는다
  function groundTex(kind) {
    const S = 512, c = canvas(S, S), g = c.getContext('2d'), r = rnd(kind === 'road' ? 41 : 43);
    if (kind === 'road') {
      g.fillStyle = '#2f2b29'; g.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 16) for (let x = (y / 16) % 2 ? -12 : 0; x < S; x += 24) {
        const v = 52 + r() * 26; g.fillStyle = `rgb(${v | 0},${(v - 4) | 0},${(v - 8) | 0})`; g.fillRect(x + 1.5, y + 1.5, 21, 13);
      }
    } else {
      g.fillStyle = '#3a3633'; g.fillRect(0, 0, S, S);
      const id = g.getImageData(0, 0, S, S), d = id.data; for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(id, 0, 0);
      g.strokeStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < S; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
    }
    return tex(c, true);
  }
  const roadMap = groundTex('road'), walkMap = groundTex('walk');
  function slab(x0, x1, y, map, rx, rz, rough) {
    const geo = new T.PlaneGeometry(x1 - x0, T_END + 80); geo.rotateX(-Math.PI / 2);
    const mp = map.clone(); mp.needsUpdate = true; mp.repeat.set(rx, rz);
    const m = new T.Mesh(geo, new T.MeshStandardMaterial({ map: mp, roughness: rough, metalness: 0, color: 0xb8b0a8, envMapIntensity: 0.25 }));
    m.position.set((x0 + x1) / 2, y, -(T_END + 80) / 2 + 40); m.receiveShadow = true; m.renderOrder = -3; B.add(m);
    return m;
  }
  slab(FAC_L, CURB_L, 0, walkMap, 3, 120, 0.75);
  slab(CURB_L, CURB_R, -0.15, roadMap, 18 / 3, (T_END + 80) / 3, 0.42);
  slab(CURB_R, FAC_R, 0, walkMap, 3, 120, 0.75);
  [CURB_L, CURB_R].forEach((x) => {   // 연석(화강암)
    const geo = new T.BoxGeometry(0.28, 0.16, T_END + 80);
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0x38332e, fog: true }));   // 환경광을 받으면 하얀 띠로 튀어서 — 빛을 미리 칠한 어두운 화강암 m.position.set(x, -0.07, -(T_END + 80) / 2 + 40); m.receiveShadow = true; B.add(m);
  });

  // ── 빛 텍스처
  function glowTex(stops) { const c = canvas(128, 128), g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new T.CanvasTexture(c); return t; }
  const flameTex = glowTex([[0, 'rgba(255,248,225,1)'], [0.12, 'rgba(255,214,140,.95)'], [0.35, 'rgba(255,160,70,.32)'], [1, 'rgba(255,140,60,0)']]);
  const haloTex = glowTex([[0, 'rgba(255,190,110,.55)'], [0.4, 'rgba(255,150,70,.12)'], [1, 'rgba(255,140,60,0)']]);
  const poolTex = glowTex([[0, 'rgba(255,175,95,.55)'], [0.5, 'rgba(255,150,80,.16)'], [1, 'rgba(255,140,70,0)']]);
  const streakTex = (() => { const c = canvas(64, 256), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,190,110,0)'); gr.addColorStop(0.2, 'rgba(255,190,110,.55)'); gr.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); const h = g.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = h; g.fillRect(0, 0, 64, 256); return new T.CanvasTexture(c); })();
  const add = (map, opacity = 1) => new T.MeshBasicMaterial({ map, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, fog: true, toneMapped: false, vertexColors: false });

  // ── 가스 가로등 — 철 기둥 + 등 + 불꽃(빛) + 둘레 빛무리 + 바닥 빛 웅덩이 + 젖은 길 반사. 인스턴스로 묶는다
  const lamps = [];
  for (let t = 15; t < 420; t += 27 + R() * 3) lamps.push({ x: CURB_L - 0.55, t });
  for (let t = 3; t < 420; t += 27 + R() * 3) lamps.push({ x: CURB_R + 0.55, t });
  lamps.sort((a, b) => b.t - a.t);                            // 먼 것부터 — 점화 순서
  const LH = 3.9;
  const ironMat = new T.MeshStandardMaterial({ color: 0x1a201b, metalness: 0.6, roughness: 0.5 });
  const postG = new T.CylinderGeometry(0.055, 0.09, LH - 0.55, 10); postG.translate(0, (LH - 0.55) / 2 + 0.35, 0);
  const baseG = new T.CylinderGeometry(0.17, 0.22, 0.6, 12); baseG.translate(0, 0.3, 0);
  const capG = new T.ConeGeometry(0.3, 0.32, 6); capG.translate(0, LH + 0.42, 0);
  const lanternG = new T.CylinderGeometry(0.22, 0.15, 0.5, 6, 1, true); lanternG.translate(0, LH + 0.05, 0);
  const lanternMat = new T.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.35, side: T.DoubleSide, fog: true, toneMapped: false });
  const iPost = new T.InstancedMesh(postG, ironMat, lamps.length), iBase = new T.InstancedMesh(baseG, ironMat, lamps.length), iCap = new T.InstancedMesh(capG, ironMat, lamps.length), iLan = new T.InstancedMesh(lanternG, lanternMat, lamps.length);
  const qG = new T.PlaneGeometry(1, 1);
  const iFlame = new T.InstancedMesh(qG, add(flameTex), lamps.length), iHalo = new T.InstancedMesh(qG, add(haloTex), lamps.length);
  const poolG = new T.PlaneGeometry(1, 1); poolG.rotateX(-Math.PI / 2);
  const iPool = new T.InstancedMesh(poolG, add(poolTex), lamps.length), iStreak = new T.InstancedMesh(poolG, add(streakTex), lamps.length);
  [iFlame, iHalo, iPool, iStreak, iLan].forEach((m) => { m.renderOrder = 2; m.frustumCulled = false; });
  const m4 = new T.Matrix4(), q4 = new T.Quaternion(), s3 = new T.Vector3(), p3 = new T.Vector3(), black = new T.Color(0, 0, 0);
  lamps.forEach((l, i) => {
    l.on = 0; l.ph = R() * 10;
    m4.makeTranslation(l.x, 0, -l.t); [iPost, iBase, iCap, iLan].forEach((m) => m.setMatrixAt(i, m4));
    m4.compose(p3.set(l.x, -0.13, -l.t), q4.identity(), s3.set(9, 1, 9)); iPool.setMatrixAt(i, m4);
    [iFlame, iHalo, iPool, iStreak, iLan].forEach((m) => m.setColorAt(i, black));
  });
  [iPost, iBase, iCap].forEach((m) => { m.castShadow = false; B.add(m); });
  [iLan, iFlame, iHalo, iPool, iStreak].forEach((m) => B.add(m));
  // 불꽃·빛무리·반사는 카메라를 향해 선다 — 카메라가 움직이므로 매 프레임 방향을 맞춘다(빌보드)
  const camB = new T.Vector3(), tmpQ = new T.Quaternion(), col = new T.Color();

  // ── 가로수 — 4월, 잎 나기 전 가는 가지. 실루엣(카메라를 향한 판)
  function treeTex(seed) {
    const c = canvas(256, 384), g = c.getContext('2d'), r = rnd(seed);
    g.strokeStyle = 'rgba(18,16,20,1)'; g.lineCap = 'round';
    const br = (x, y, a, len, w, d) => {
      const x2 = x + Math.cos(a) * len, y2 = y - Math.sin(a) * len;
      g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      if (d <= 0 || w < 0.6) return;
      const n = 2 + (r() < 0.4 ? 1 : 0);
      for (let k = 0; k < n; k++) br(x2, y2, a + (r() - 0.5) * 1.1 + (k - (n - 1) / 2) * 0.35, len * (0.68 + r() * 0.18), w * 0.66, d - 1);
    };
    br(128, 384, Math.PI / 2 + (r() - 0.5) * 0.08, 120, 9, 7);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(70,80,50,.25)'; g.fillRect(0, 0, 256, 220);   // 4월 — 가지 끝의 옅은 새순 빛
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
  }
  const treeMats = [11, 23].map((s) => new T.MeshBasicMaterial({ map: treeTex(s), transparent: true, alphaTest: 0.08, depthWrite: true, fog: true, side: T.DoubleSide }));
  const treeG = new T.PlaneGeometry(9, 13.5); treeG.translate(0, 6.75, 0);
  const trees = [[], []];
  for (let t = 22; t < T_END - 40; t += 9 + R() * 2) trees[R() < 0.5 ? 0 : 1].push([CURB_L - 1.3, t, 0.85 + R() * 0.3]);
  for (let t = 10; t < T_END - 40; t += 9 + R() * 2) trees[R() < 0.5 ? 0 : 1].push([CURB_R + 1.3, t, 0.85 + R() * 0.3]);
  const iTrees = trees.map((list, k) => { const m = new T.InstancedMesh(treeG, treeMats[k], list.length); list.forEach(([x, t, s], i) => { m4.compose(p3.set(x, 0, -t), q4.identity(), s3.set(s * (R() < 0.5 ? -1 : 1), s, s)); m.setMatrixAt(i, m4); }); m.frustumCulled = false; B.add(m); return m; });

  // ── 마차 등불 — 두 개(마부석 양옆) + 젖은 길 반사. 멀리 대로에서만 오간다
  const cars = [0, 1, 2, 3].map((k) => {
    const g = new T.Group();
    const mk = (x) => { const f = new T.Mesh(qG, add(flameTex)); f.scale.set(0.9, 0.9, 1); f.position.set(x, 1.9, 0); g.add(f); const s = new T.Mesh(poolG, add(streakTex, 0.8)); s.scale.set(0.5, 1, 7); s.position.set(x, -0.12, 3.2); g.add(s); return f; };
    mk(-0.8); mk(0.8);
    const body = new T.Mesh(new T.BoxGeometry(1.9, 1.7, 3.2), new T.MeshBasicMaterial({ color: 0x0c0b0e, fog: true })); body.position.set(0, 1.4, -1.9); g.add(body);   // 등불 뒤(카메라에서 먼 쪽)
    B.add(g);
    return { g, dir: k % 2 ? 1 : -1, lane: k % 2 ? CURB_R - 4.5 : CURB_L + 5.5, speed: 6 + R() * 2.5, t: 60 + R() * 300 };
  });

  // ── 갱신 — 점화 · 흔들림 · 빌보드 · 마차
  let ignited = 0;
  function update(time, dt, camera) {
    camera.getWorldDirection(camB);
    // 빌보드 회전(B 좌표): 카메라 쪽을 향하는 y축 회전만
    const yaw = Math.atan2(-camB.x, -camB.z) + TH;
    tmpQ.setFromAxisAngle(new T.Vector3(0, 1, 0), yaw);
    lamps.forEach((l, i) => {
      if (l.target != null) l.on += (l.target - l.on) * Math.min(1, dt * (l.target > l.on ? 5 : 3));
      const fl = reduceMotion ? 1 : 0.92 + 0.08 * Math.sin(time * 7.3 + l.ph) * Math.sin(time * 3.1 + l.ph * 2);
      const ign = l.ignT != null && !reduceMotion ? Math.max(0, 1 - (time - l.ignT) / 0.5) : 0;   // 켜지는 순간 한 번 번쩍
      const a = Math.min(1.6, l.on * fl * (1 + ign * 0.9));
      m4.compose(p3.set(l.x, LH + 0.05, -l.t), tmpQ, s3.set(1.1, 1.1, 1)); iFlame.setMatrixAt(i, m4);
      m4.compose(p3.set(l.x, LH, -l.t), tmpQ, s3.set(7, 7, 1)); iHalo.setMatrixAt(i, m4);
      m4.compose(p3.set(l.x + (l.x < 10 ? 1.2 : -1.2), -0.12, -l.t + 6), tmpQ, s3.set(0.7, 1, 13)); iStreak.setMatrixAt(i, m4);
      col.setRGB(a, a, a); iFlame.setColorAt(i, col); iLan.setColorAt(i, col);
      col.setRGB(a * 0.8, a * 0.8, a * 0.8); iHalo.setColorAt(i, col); iPool.setColorAt(i, col);
      col.setRGB(a * 0.55, a * 0.55, a * 0.55); iStreak.setColorAt(i, col);
    });
    [iFlame, iHalo, iStreak].forEach((m) => { m.instanceMatrix.needsUpdate = true; });
    [iFlame, iHalo, iPool, iStreak, iLan].forEach((m) => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    cars.forEach((c) => {
      if (!reduceMotion) c.t += c.dir * c.speed * dt;
      if (c.t < 70) { c.t = T_END - 40; } if (c.t > T_END - 30) { c.t = 70; }
      c.g.position.set(c.lane, 0, -c.t);
      c.g.children.forEach((ch) => { if (ch.material && ch.material.map === flameTex) ch.quaternion.copy(tmpQ); });
      c.g.visible = ignited > 0;
    });
  }
  // 점화 — 먼 가로등부터 하나씩(호스트가 부른다). k = 몇 개까지, at = 시각(s)
  function igniteTo(k, now) { for (let i = 0; i < Math.min(k, lamps.length); i++) if (lamps[i].target !== 1) { lamps[i].target = 1; lamps[i].ignT = now; } ignited = Math.max(ignited, k); }
  function igniteAll(now) { igniteTo(lamps.length, now); lamps.forEach((l) => { l.on = 1; }); }
  return { root, update, igniteTo, igniteAll, get lampCount() { return lamps.length; } };
}
