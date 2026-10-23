// C1 모리스 칼럼 3D — 부스 프로토타입 booth/js/morris-viewer.js 의 사본 + 체험 재기획 프로토타입 확장 (부스 원본은 그대로 둔다)
//
// 프로토타입 확장 (아래 '// [proto]' 표시)
//   · rise(): 칼럼이 바닥에서 솟아오른다 — 바닥면 클리핑 + 회전 플러리시 + 배경 반투명 잔상(모션 블러 느낌) + 종이 펄럭임 + 위에서 내려오는 조명
//   · 자석: 손을 떼고 느려지면 가장 가까운 전단지가 정면에 오도록 끌어당기고, 멈추는 순간 살짝 튕긴다 — onEvent('centered', {index})
//   · 빛 쓸기: 돌릴 때 정면을 지나는 종이에 빛이 지나간다(emissive)
//   · project(index): 전단지 가운데의 화면 좌표·정면도 (오늘의 비율 표식 핀 고정용)
//   · focusItem 이 끝나면 onEvent('focused', {index})
//
// 이하 부스 원본 주석
// 원본에서 그대로 가져온 것
//   · 형태: 체험장치 기획안 260928 p15 모리스 칼럼 레플리카 이미지 실측 프로파일 (녹흑색 주철 + 금색 장식, 로브 돔, 다단 첨탑)
//   · 몸체를 덮는 실제 1860~75 파리 포스터 아틀라스(퍼블릭 도메인, 출처는 morris-items.js), 상호작용 인쇄물 6장(전단지 3 + 도미에 풍자화 3)
//   · 놋쇠 압정 + 가장자리 숨쉬기 빛, 떼어 내기 → 곡선 비행 → 화면 앞 살펴보기(기울이기·핀치), 흐린 정지 이미지 배경,
//     돌려놓기 마지막 프레임에서 칼럼을 먼저 그린 뒤 정지 이미지를 내림(깜빡임 없음)
//   · 모네 〈카퓌신 대로〉 흐린 배경 + 회전 시차, 절차 생성 포석 바닥 + 그림자, 안개
//
// 부스용으로 바꾼 것
//   · iframe/postMessage 대신 같은 페이지의 ES 모듈 (호스트 = js/c1.js). 이벤트는 onEvent 콜백
//   · 탭 판정은 호스트가 결정 (Step2 에서는 '활성화된' 전단지만 떼어 낸다) — onEvent('tap', index)
//   · 숨쉬기 빛은 활성 항목에만 (setHighlight)
//   · 스포트라이트: 활성 전단지(카페 게르부아)만 밝게, 나머지 칼럼·포스터·배경은 어둡게 (setSpotlight)
//   · 화면 크기는 창 대신 컨테이너 기준, 렌더 루프 일시정지(pause/resume)
export function createMorrisViewer(T, RoomEnvironment, container, { items, filler, backdrop, onEvent }) {
  const post = (type, extra) => onEvent && onEvent(type, extra);
  const W = () => container.clientWidth || 1, H = () => container.clientHeight || 1;
  const mobile = Math.min(W(), H()) < 600;

  // ── 렌더러 + 정지 이미지 캔버스
  const snap = document.createElement('canvas');
  snap.className = 'mv-snap';
  container.appendChild(snap);
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });   // [proto] 솟아오를 때 잔상을 남기려면 버퍼를 보존해야 한다
  renderer.domElement.className = 'mv-gl';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xffffff, 1);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(28, 1, 0.1, 100);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  if (RoomEnvironment) {
    const pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  } else {
    scene.add(new T.HemisphereLight(0xffffff, 0xcfcac0, 0.9));
  }
  const hemi = new T.HemisphereLight(0xdfeef2, 0x8f8a80, 0.25); scene.add(hemi);
  let clearA = 1, overheadMax = 2.4;   // [proto · C1 움직임] setAmbience — 배경을 비우고(뒤의 DOM 거리가 보이게) 해 질 녘 빛으로
  const key = new T.DirectionalLight(0xfff0dc, 1.5);
  key.position.set(2.6, 6.5, 4.2);
  key.target.position.set(0, 1.6, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  key.shadow.camera.left = -3.4; key.shadow.camera.right = 3.4;
  key.shadow.camera.top = 4.2; key.shadow.camera.bottom = -4.2;
  key.shadow.camera.near = 1; key.shadow.camera.far = 14;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  key.shadow.camera.updateProjectionMatrix();
  scene.add(key); scene.add(key.target);
  const fill = new T.DirectionalLight(0xdfe8ff, 0.35);
  fill.position.set(-5, 2.5, 3);
  scene.add(fill);
  // [proto] 위에서 내려오는 조명 — 솟아오를 때 켜진다
  const overhead = new T.SpotLight(0xfff2dc, 0, 16, Math.PI / 7, 0.55, 1.2);
  overhead.position.set(0.4, 9.5, 2.2); overhead.target.position.set(0, 2.2, 0);
  scene.add(overhead); scene.add(overhead.target);
  const riseState = { t: -1, dur: 1.9, spin: 0, flutter: 0, contact: null, done: false };
  const floorPlane = new T.Plane(new T.Vector3(0, 1, 0), 0.002);   // y ≥ -0.002 만 그린다 (바닥은 남고 칼럼은 바닥 아래가 잘린다)

  // ── 재질 텍스처 (캔버스) — 녹흑색 도장 주철 + 금색 장식
  const IRON = [29, 38, 31];
  const GOLD = '#b8924f';
  function rnd(seed) { let s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function ironSet(w, h, rx, ry, draw, seed) {
    const cc = document.createElement('canvas'), mc = document.createElement('canvas'), rc = document.createElement('canvas');
    cc.width = mc.width = rc.width = w; cc.height = mc.height = rc.height = h;
    const g = cc.getContext('2d'), m = mc.getContext('2d'), r = rc.getContext('2d');
    const R = rnd(seed || 7);
    const img = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const n = (R() - 0.5) * 9;
      img.data[i * 4] = IRON[0] + n; img.data[i * 4 + 1] = IRON[1] + n; img.data[i * 4 + 2] = IRON[2] + n * 0.8; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    for (let k = 0; k < (w * h) / 900; k++) {
      g.fillStyle = 'rgba(' + (60 + R() * 30 | 0) + ',' + (62 + R() * 20 | 0) + ',' + (45 + R() * 10 | 0) + ',' + (0.05 + R() * 0.08) + ')';
      g.beginPath(); g.ellipse(R() * w, R() * h, 1 + R() * 6, 1 + R() * 3, R() * 3, 0, 7); g.fill();
    }
    m.fillStyle = 'rgb(70,70,70)'; m.fillRect(0, 0, w, h);
    const rimg = r.createImageData(w, h);
    for (let j = 0; j < w * h; j++) { const v = 128 + (R() - 0.5) * 30; rimg.data[j * 4] = rimg.data[j * 4 + 1] = rimg.data[j * 4 + 2] = v; rimg.data[j * 4 + 3] = 255; }
    r.putImageData(rimg, 0, 0);
    if (draw) {
      g.fillStyle = g.strokeStyle = GOLD; m.fillStyle = m.strokeStyle = '#e6e6e6'; r.fillStyle = r.strokeStyle = '#5a5a5a';
      [g, m, r].forEach((ctx) => { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; draw(ctx, w, h); });
    }
    const tex = (cv, srgb) => {
      const t = new T.CanvasTexture(cv);
      t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = maxAniso;
      if (srgb) t.encoding = T.sRGBEncoding;
      return t;
    };
    return new T.MeshStandardMaterial({ map: tex(cc, true), metalnessMap: tex(mc), roughnessMap: tex(rc), metalness: 1, roughness: 1 });
  }
  function friezeMotif(c, w, h) {
    const cy = h / 2;
    c.lineWidth = h * 0.05;
    c.beginPath(); c.moveTo(0, h * 0.08); c.lineTo(w, h * 0.08); c.moveTo(0, h * 0.92); c.lineTo(w, h * 0.92); c.stroke();
    c.lineWidth = h * 0.06;
    c.beginPath();
    for (let a = 0; a < 4; a++) { const ang = a * Math.PI / 2; c.moveTo(w / 2 + Math.cos(ang) * h * 0.2 + h * 0.1, cy + Math.sin(ang) * h * 0.2); c.arc(w / 2 + Math.cos(ang) * h * 0.2, cy + Math.sin(ang) * h * 0.2, h * 0.1, 0, 7); }
    c.stroke();
    c.beginPath(); c.arc(w / 2, cy, h * 0.06, 0, 7); c.fill();
    c.beginPath();
    c.moveTo(w / 2 - h * 0.38, cy); c.bezierCurveTo(w * 0.32, cy - h * 0.3, w * 0.2, cy + h * 0.3, w * 0.06, cy);
    c.moveTo(w / 2 + h * 0.38, cy); c.bezierCurveTo(w * 0.68, cy - h * 0.3, w * 0.8, cy + h * 0.3, w * 0.94, cy);
    c.stroke();
    c.beginPath(); c.arc(0, cy, h * 0.07, 0, 7); c.arc(w, cy, h * 0.07, 0, 7); c.fill();
  }
  function plinthMotif(c, w, h) {
    const cy = h / 2;
    c.lineWidth = h * 0.035;
    c.beginPath(); c.moveTo(0, h * 0.1); c.lineTo(w, h * 0.1); c.moveTo(0, h * 0.9); c.lineTo(w, h * 0.9); c.stroke();
    c.lineWidth = h * 0.045;
    c.beginPath(); c.moveTo(0, cy); c.bezierCurveTo(w * 0.25, cy - h * 0.32, w * 0.25, cy + h * 0.32, w * 0.5, cy);
    c.bezierCurveTo(w * 0.75, cy - h * 0.32, w * 0.75, cy + h * 0.32, w, cy); c.stroke();
    c.beginPath(); c.arc(w * 0.25, cy - h * 0.2, h * 0.05, 0, 7); c.arc(w * 0.75, cy + h * 0.2, h * 0.05, 0, 7); c.fill();
  }
  function drumMotif(c, w, h) {
    c.save(); c.globalAlpha = 0.5; c.strokeStyle = 'rgba(0,0,0,0.9)'; c.lineWidth = w * 0.02;
    c.strokeRect(w * 0.06, h * 0.12, w * 0.88, h * 0.76); c.restore();
    c.save(); c.globalAlpha = 0.35; c.lineWidth = w * 0.012; c.strokeRect(w * 0.08, h * 0.14, w * 0.84, h * 0.72); c.restore();
    [[0.03, 0.06], [0.97, 0.06], [0.03, 0.94], [0.97, 0.94]].forEach((p) => { c.beginPath(); c.arc(p[0] * w, p[1] * h, w * 0.022, 0, 7); c.fill(); });
  }
  function dotsMotif(c, w, h) { c.beginPath(); c.arc(w / 2, h / 2, h * 0.22, 0, 7); c.fill(); }
  function domeMotif(c, w, h) {
    const cols = 4, rows = 8, sw = w / cols, sh = h / rows;
    c.save(); c.globalAlpha = 0.55; c.strokeStyle = 'rgba(95,105,90,1)'; c.lineWidth = sw * 0.05;
    for (let y = 0; y <= rows; y++) for (let x = -1; x <= cols; x++) {
      const ox = (y % 2) * sw / 2; c.beginPath(); c.arc(x * sw + ox + sw / 2, y * sh, sw / 2, 0, Math.PI); c.stroke();
    }
    c.restore();
    for (let y2 = 0; y2 < rows; y2++) for (let x2 = 0; x2 < cols; x2++) {
      if ((x2 + y2) % 2) continue;
      const ox2 = (y2 % 2) * sw / 2; c.beginPath(); c.arc(x2 * sw + ox2 + sw / 2, y2 * sh + sh * 0.5, sw * 0.06, 0, 7); c.fill();
    }
    c.lineWidth = w * 0.025; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, h); c.moveTo(w, 0); c.lineTo(w, h); c.stroke();
  }

  const plain = ironSet(256, 256, 4, 2, null, 3);
  const matFrieze = ironSet(512, 96, 14, 1, friezeMotif, 11);
  const matPlinth = ironSet(512, 128, 16, 1, plinthMotif, 13);
  const matDrum = ironSet(256, 256, 12, 1, drumMotif, 17);
  const matDots = ironSet(64, 64, 44, 1, dotsMotif, 19);
  const matDome = ironSet(256, 512, 10, 1, domeMotif, 23);

  const column = new T.Group();
  scene.add(column);
  const place = new T.Group();              // [proto] 바닥·접지 그림자 — 칼럼과 같이 돌지만 같이 솟지는 않는다
  scene.add(place);
  function addMesh(geo, mat) { const m = new T.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; column.add(m); return m; }
  function lathe(pts, mat, seg) { return addMesh(new T.LatheGeometry(pts.map((p) => new T.Vector2(p[0], p[1])), seg || 96), mat); }
  function band(r, y0, y1, mat) { const m = addMesh(new T.CylinderGeometry(r, r, y1 - y0, 96, 1, true), mat); m.position.y = (y0 + y1) / 2; return m; }

  lathe([[0, 0], [0.55, 0], [0.585, 0.03], [0.612, 0.06], [0.618, 0.08]], plain);
  band(0.618, 0.08, 0.207, matPlinth);
  lathe([[0.618, 0.207], [0.61, 0.24], [0.6, 0.26], [0.578, 0.28], [0.567, 0.3], [0.557, 0.323]], plain);
  band(0.557, 0.323, 0.54, matDrum);
  lathe([[0.557, 0.54], [0.57, 0.56], [0.576, 0.567]], plain);
  band(0.577, 0.567, 0.6, matDots);
  lathe([[0.576, 0.6], [0.565, 0.62], [0.55, 0.641], [0.535, 0.655], [0.515, 0.67], [0.513, 0.713], [0.5, 0.728]], plain);
  const SHAFT_Y0 = 0.728, SHAFT_Y1 = 2.906, R = 0.5;
  const shaft = band(R, SHAFT_Y0, SHAFT_Y1, plain);
  lathe([[0.5, 2.906], [0.506, 2.92], [0.513, 2.95], [0.543, 2.964], [0.56, 2.993], [0.545, 3.02]], plain);
  band(0.545, 3.02, 3.11, matFrieze);
  lathe([[0.545, 3.11], [0.56, 3.123], [0.59, 3.152], [0.598, 3.17], [0.598, 3.185], [0.57, 3.205], [0.5, 3.225], [0.45, 3.24]], plain);
  lathe([[0.45, 3.24], [0.442, 3.255], [0.44, 3.27], [0.44, 3.3]], plain);
  band(0.443, 3.3, 3.325, matDots);
  (function () {
    const pts = [[0.45, 3.325], [0.468, 3.354], [0.48, 3.398], [0.477, 3.441], [0.467, 3.484], [0.442, 3.528], [0.407, 3.571], [0.358, 3.614], [0.31, 3.643], [0.242, 3.672], [0.2, 3.687]];
    const geo = new T.LatheGeometry(pts.map((p) => new T.Vector2(p[0], p[1])), 200);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), u = uv.getX(i);
      const lobe = Math.pow(Math.abs(Math.sin(u * Math.PI * 10)), 0.45);
      const s = 0.955 + 0.045 * lobe;
      pos.setX(i, x * s); pos.setZ(i, z * s);
    }
    geo.computeVertexNormals();
    addMesh(geo, matDome);
  })();
  lathe([[0.2, 3.687], [0.17, 3.7], [0.167, 3.716], [0.154, 3.73], [0.12, 3.745], [0.065, 3.759], [0.046, 3.773]], plain, 64);
  lathe([[0.046, 3.773], [0.034, 3.802], [0.044, 3.817], [0.067, 3.846], [0.068, 3.86], [0.063, 3.875], [0.052, 3.889],
    [0.034, 3.904], [0.023, 3.918], [0.027, 3.947], [0.036, 3.961], [0.035, 3.975], [0.023, 3.99], [0.014, 4.019],
    [0.018, 4.063], [0.01, 4.092], [0.003, 4.164], [0, 4.165]], plain, 48);
  const TOTAL_H = 4.165, MAX_R = 0.618;

  // ── 장소 — 포석 바닥 + 접지 그림자 + 안개 + 그림 배경
  scene.fog = new T.Fog(0xaab0ae, 12, 30);
  (function () {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d'), L = rnd(31);
    g.fillStyle = '#4b473f'; g.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 8; r++) {
      const y0 = r * 64; let x = (r % 2) ? -30 : 0;
      while (x < 512) {
        const w = 54 + L() * 26, v = 112 + L() * 44;
        const col = 'rgb(' + (v | 0) + ',' + ((v - 5) | 0) + ',' + ((v - 13) | 0) + ')';
        [x, x - 512].forEach((xx) => {
          g.fillStyle = col;
          g.beginPath(); g.moveTo(xx + 6, y0 + 4); g.lineTo(xx + w - 5, y0 + 3 + L() * 2); g.lineTo(xx + w - 4, y0 + 59); g.lineTo(xx + 5, y0 + 60 - L() * 2); g.closePath(); g.fill();
          const gr = g.createLinearGradient(xx, y0, xx + w, y0 + 64);
          gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)');
          g.fillStyle = gr; g.fill();
        });
        x += w;
      }
    }
    const id = g.getImageData(0, 0, 512, 512), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const n = (L() - 0.5) * 16; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(id, 0, 0);
    const map = new T.CanvasTexture(c); map.encoding = T.sRGBEncoding;
    map.wrapS = map.wrapT = T.RepeatWrapping; map.repeat.set(19, 19); map.anisotropy = maxAniso;
    const bump = new T.CanvasTexture(c); bump.wrapS = bump.wrapT = T.RepeatWrapping; bump.repeat.set(19, 19);
    const gg = new T.RingGeometry(0.001, 9, 72, 14), gp = gg.attributes.position, gc = new Float32Array(gp.count * 4);
    for (let q = 0; q < gp.count; q++) {
      const rr = Math.hypot(gp.getX(q), gp.getY(q)) / 9;
      gc[q * 4] = gc[q * 4 + 1] = gc[q * 4 + 2] = 1;
      gc[q * 4 + 3] = rr < 0.5 ? 1 : Math.max(0, 1 - (rr - 0.5) / 0.5);
    }
    gg.setAttribute('color', new T.BufferAttribute(gc, 4));
    const ground = new T.Mesh(gg, new T.MeshStandardMaterial({
      map, bumpMap: bump, bumpScale: 0.015, roughness: 0.9, metalness: 0, color: 0xd8d4cc, envMapIntensity: 0.35,
      vertexColors: true, transparent: true, depthWrite: false,
    }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.renderOrder = -2;
    place.add(ground);
    const cc = document.createElement('canvas'); cc.width = cc.height = 256;
    const cg = cc.getContext('2d'), cgr = cg.createRadialGradient(128, 128, 30, 128, 128, 128);
    cgr.addColorStop(0, 'rgba(0,0,0,0.5)'); cgr.addColorStop(0.45, 'rgba(0,0,0,0.14)'); cgr.addColorStop(1, 'rgba(0,0,0,0)');
    cg.fillStyle = cgr; cg.fillRect(0, 0, 256, 256);
    const contact = new T.Mesh(new T.PlaneGeometry(2.2, 2.2),
      new T.MeshBasicMaterial({ map: new T.CanvasTexture(cc), transparent: true, depthWrite: false, toneMapped: false, fog: false }));
    contact.rotation.x = -Math.PI / 2; contact.position.y = 0.004; contact.renderOrder = -1;
    place.add(contact);
    riseState.contact = contact;
  })();
  scene.add(camera);
  let bgTex = null, bgAspect = 0.74;
  const backdropMesh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: 0xeef0ef, depthWrite: false, depthTest: false, fog: false, toneMapped: false }));
  backdropMesh.renderOrder = -100; backdropMesh.position.z = -40;
  camera.add(backdropMesh);
  function fitBackdrop() {
    const h = 2 * 40 * Math.tan(camera.fov * Math.PI / 360) * 1.02, w = h * camera.aspect;
    backdropMesh.scale.set(w, h, 1);
    if (!bgTex) return;
    const k = 0.9, a = camera.aspect;
    if (a < bgAspect) bgTex.repeat.set(a / bgAspect * k, k); else bgTex.repeat.set(k, bgAspect / a * k);
    bgTex.offset.y = (1 - bgTex.repeat.y) * 0.8;
  }
  function parallax() { if (bgTex) bgTex.offset.x = (1 - bgTex.repeat.x) / 2 - rot * 0.05; }
  function setBackdrop(src) {
    new T.TextureLoader().load(src, (t) => {
      t.encoding = T.sRGBEncoding; t.wrapS = T.MirroredRepeatWrapping; t.wrapT = T.ClampToEdgeWrapping;
      bgAspect = t.image.width / t.image.height; bgTex = t;
      backdropMesh.material.map = t; backdropMesh.material.color.set(0xf2f2f0); backdropMesh.material.needsUpdate = true;
      fitBackdrop(); parallax(); dirty = true;
    });
  }

  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeO = (t) => 1 - Math.pow(1 - t, 3);
  let dirty = true;

  function wrapLocal(o, x, y, out, nrm) {
    const c = Math.cos(o.tilt), s = Math.sin(o.tilt);
    const xx = x * c - y * s, yy = x * s + y * c;
    const th = o.ang + xx / o.r;
    out.set(o.r * Math.sin(th), o.cy + yy, o.r * Math.cos(th));
    if (nrm) nrm.set(Math.sin(th), 0, Math.cos(th));
    return out;
  }

  function tornPath(g, x, y, w, h, R2, j) {
    const step = Math.max(3, Math.min(w, h) / 40);
    g.beginPath();
    for (let a = 0; a <= w; a += step) g.lineTo(x + a, y + R2() * j);
    for (let b = 0; b <= h; b += step) g.lineTo(x + w - R2() * j, y + b);
    for (let c = w; c >= 0; c -= step) g.lineTo(x + c, y + h - R2() * j);
    for (let d = h; d >= 0; d -= step) g.lineTo(x + R2() * j, y + d);
    g.closePath();
  }
  function weather(g, x, y, w, h, R2, k) {
    const e = Math.max(w, h) * 0.06;
    [[x, y, x + e, y], [x + w, y, x + w - e, y], [x, y, x, y + e], [x, y + h, x, y + h - e]].forEach((s) => {
      const gr = g.createLinearGradient(s[0], s[1], s[2], s[3]);
      gr.addColorStop(0, 'rgba(70,55,30,' + (0.22 * k) + ')'); gr.addColorStop(1, 'rgba(70,55,30,0)');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
    });
    for (let i = 0; i < 3 * k; i++) {
      g.fillStyle = 'rgba(150,120,60,' + (0.05 + R2() * 0.07) * k + ')';
      g.beginPath(); g.ellipse(x + R2() * w, y + R2() * h, w * (0.05 + R2() * 0.15), h * (0.02 + R2() * 0.05), R2() * 3, 0, 7); g.fill();
    }
  }
  function paperize(img) {
    const max = 1024, sc = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const R2 = rnd(w * 31 + h);
    tornPath(g, 0, 0, w, h, R2, Math.max(1.5, w * 0.005));
    g.save(); g.clip();
    g.drawImage(img, 0, 0, w, h);
    weather(g, 0, 0, w, h, R2, 0.4);
    g.restore();
    const map = new T.CanvasTexture(c); map.encoding = T.sRGBEncoding; map.anisotropy = maxAniso;
    return map;
  }

  // ── 바탕 포스터 (장식, 탭 없음)
  let fillerMesh = null;
  function buildFillers(img, rects) {
    const sc = mobile ? 0.5 : 1;
    const AW = Math.round(img.width * sc), AH = Math.round(img.height * sc);
    const c = document.createElement('canvas'); c.width = AW; c.height = AH;
    const g = c.getContext('2d');
    const R2 = rnd(97);
    rects.forEach((r) => {
      const x = r.x * sc, y = r.y * sc, w = r.w * sc, h = r.h * sc;
      g.save(); tornPath(g, x + 2, y + 2, w - 4, h - 4, R2, Math.max(1.5, w * 0.018)); g.clip();
      g.drawImage(img, r.x, r.y, r.w, r.h, x, y, w, h);
      g.fillStyle = 'rgba(235,225,200,' + (0.16 + R2() * 0.12) + ')'; g.fillRect(x, y, w, h);
      weather(g, x, y, w, h, R2, 1);
      g.restore();
    });
    const tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = maxAniso;
    const L = rnd(42), inst = [];
    const order = rects.map((_, i) => i);
    for (let s = order.length - 1; s > 0; s--) { const t = (L() * (s + 1)) | 0, tmp = order[s]; order[s] = order[t]; order[t] = tmp; }
    let pick = 0; const next = () => order[(pick++) % order.length];
    const place = (k, hh, cy, ang) => {
      const rc = rects[k]; let ww = hh * rc.w / rc.h;
      if (ww > 0.82) { hh *= 0.82 / ww; ww = 0.82; }
      cy = clamp(cy, SHAFT_Y0 + 0.01 + hh / 2, SHAFT_Y1 - 0.01 - hh / 2);
      inst.push({ k, w: ww, h: hh, ang: ang + ww / 2 / R, cy, tilt: (L() - 0.5) * 0.07 });
      return ww;
    };
    [1.05, 1.58, 2.11, 2.6].forEach((cy) => {
      const Hh = 0.6 + L() * 0.07; let a = L() * 6.283; const end = a + 6.283 - 0.12;
      while (a < end) { const ww = place(next(), Hh * (0.9 + L() * 0.15), cy + (L() - 0.5) * 0.07, a); a += ww * (0.8 + L() * 0.1) / R; }
    });
    for (let e = 0; e < 9; e++) place(next(), 0.48 + L() * 0.16, SHAFT_Y0 + 0.3 + L() * 1.6, L() * 6.283);
    const SX = 6, SY = 2, per = (SX + 1) * (SY + 1);
    const pos = new Float32Array(inst.length * per * 3), uv = new Float32Array(inst.length * per * 2), idx = [];
    const v = new T.Vector3();
    inst.forEach((o, n) => {
      o.r = R + 0.0015 + n * 0.00022;
      const rc = rects[o.k];
      const u0 = rc.x / img.width, u1 = (rc.x + rc.w) / img.width, vt = 1 - rc.y / img.height, vb = 1 - (rc.y + rc.h) / img.height;
      for (let j = 0; j <= SY; j++) for (let i = 0; i <= SX; i++) {
        const q = n * per + j * (SX + 1) + i;
        wrapLocal(o, (i / SX - 0.5) * o.w, (0.5 - j / SY) * o.h, v);
        pos[q * 3] = v.x; pos[q * 3 + 1] = v.y; pos[q * 3 + 2] = v.z;
        uv[q * 2] = u0 + (u1 - u0) * i / SX; uv[q * 2 + 1] = vt + (vb - vt) * j / SY;
      }
      for (let jj = 0; jj < SY; jj++) for (let ii = 0; ii < SX; ii++) {
        const a0 = n * per + jj * (SX + 1) + ii, b0 = a0 + 1, c0 = a0 + SX + 1, d0 = c0 + 1;
        idx.push(a0, c0, b0, b0, c0, d0);
      }
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    fillerMesh = new T.Mesh(geo, new T.MeshStandardMaterial({ map: tex, color: 0xd2cbb9, roughness: 0.95, metalness: 0, alphaTest: 0.5 }));
    fillerMesh.receiveShadow = true;
    column.add(fillerMesh);
    dirty = true;
  }

  // ── 상호작용 인쇄물 (전단지 3 + 풍자화 3)
  const posters = [];
  const SEG_X = 14, SEG_Y = 20;
  const glowTex = (function () {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.shadowColor = '#fff'; g.shadowBlur = 3; g.fillStyle = '#fff';
    g.fillRect(3, 3, 122, 122);
    return new T.CanvasTexture(c);
  })();
  const tackGeo = new T.SphereGeometry(0.036, 20, 12); tackGeo.scale(1, 1, 0.42);
  const tackMat = new T.MeshStandardMaterial({ color: 0xc39a4a, metalness: 0.9, roughness: 0.32 });
  const tv = new T.Vector3(), tn = new T.Vector3();
  function makePoster(f, idx, o) {
    const geo = new T.PlaneGeometry(o.w, o.h, SEG_X, SEG_Y);
    const base = geo.attributes.position.array.slice();
    const front = new T.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.86, metalness: 0, alphaTest: 0.5, side: T.FrontSide });
    const back = new T.MeshStandardMaterial({ color: 0xd9d2c2, roughness: 0.95, metalness: 0, side: T.BackSide });
    const mesh = new T.Mesh(geo, front), backMesh = new T.Mesh(geo, back);
    mesh.add(backMesh);
    mesh.receiveShadow = true;
    mesh.userData.index = idx;
    const p = { o, geo, base, mesh, front, back, idx, lift: 0 };
    stickLocal(p);
    column.add(mesh);
    const go = { w: o.w + 0.06, h: o.h + 0.06, r: o.r - 0.0009, ang: o.ang, cy: o.cy, tilt: o.tilt };
    const gg = new T.PlaneGeometry(go.w, go.h, 10, 10), gpa = gg.attributes.position;
    for (let i = 0; i < gpa.count; i++) { wrapLocal(go, gpa.getX(i), gpa.getY(i), tv); gpa.setXYZ(i, tv.x, tv.y, tv.z); }
    p.glow = new T.Mesh(gg, new T.MeshBasicMaterial({ map: glowTex, color: 0xe0a238, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false, fog: false }));
    column.add(p.glow);
    wrapLocal(o, 0, o.h / 2 - 0.045, tv, tn);
    p.tack = new T.Mesh(tackGeo, tackMat);
    p.tackBase = tv.clone().addScaledVector(tn, 0.003);
    p.tack.position.copy(p.tackBase); p.tack.rotation.y = Math.atan2(tn.x, tn.z);
    p.tack.castShadow = true;
    column.add(p.tack);
    posters.push(p);
    return p;
  }
  function stickLocal(p) {
    const pa = p.geo.attributes.position, b = p.base;
    for (let i = 0; i < pa.count; i++) { wrapLocal(p.o, b[i * 3], b[i * 3 + 1], tv); pa.setXYZ(i, tv.x, tv.y, tv.z); }
    pa.needsUpdate = true; p.geo.computeVertexNormals(); p.geo.computeBoundingSphere();
    p.mesh.position.set(0, 0, 0); p.mesh.rotation.set(0, 0, 0); p.mesh.scale.set(1, 1, 1);
  }
  let pending = 0;
  function done() { dirty = true; if (--pending === 0) post('loaded'); }
  function addItems(list) {
    const rows = [[], []];
    list.forEach((f, i) => { rows[f.row === 1 ? 1 : 0].push(i); });
    const W0 = 0.6, W1 = 0.56, top0 = SHAFT_Y1 - 0.1; let row0H = 0;
    rows[0].forEach((i) => { row0H = Math.max(row0H, W0 * (list[i].ratio || 1.5)); });
    const L = rnd(5);
    const loader = new T.ImageLoader();
    [0, 1].forEach((rw) => {
      rows[rw].forEach((i, k) => {
        const f = list[i], w = rw ? W1 : W0, h = w * (f.ratio || 1.5);
        const n = rows[rw].length;
        const o = {
          w, h, r: R + 0.014,
          ang: (rw ? Math.PI / 3 : 0) + k * Math.PI * 2 / Math.max(n, 1) + (L() - 0.5) * 0.12,
          cy: rw ? top0 - row0H - 0.08 - h / 2 + (L() - 0.5) * 0.05 : top0 - h / 2 + (L() - 0.5) * 0.04,
          tilt: (L() - 0.5) * 0.05,
        };
        const p = makePoster(f, i, o);
        pending++;
        loader.load(f.src, (img) => {
          const map = paperize(img);
          p.front.map = map; p.front.emissiveMap = map; p.front.emissive.set(0xffffff); p.front.emissiveIntensity = 0;
          p.front.color.set(0xffffff); p.front.roughness = 0.8; p.front.needsUpdate = true;
          done();
        }, undefined, () => { done(); post('error', { message: 'item_load_failed_' + i }); });
      });
    });
  }

  // ── 부스 추가: 스포트라이트 — 활성 전단지만 남기고 칼럼·포스터·배경을 어둡게
  //   카메라에 붙은 반투명 검정 판(renderOrder 50)을 덮고, 활성 전단지는 같은 기하를 쓰는 복제본을 그 위에(깊이 같음 → 보이는 부분만) 다시 그린다
  const dimQuad = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false, fog: false }));
  dimQuad.position.z = -1; dimQuad.renderOrder = 50; dimQuad.visible = false;
  camera.add(dimQuad);
  let spot = false, spotAmt = 0;
  const spotClones = [];
  function ensureSpotClones() {
    posters.forEach((p) => {
      if (!active.has(p.idx) || p.spotClone) return;
      const m = new T.Mesh(p.geo, p.front.clone());
      m.material.transparent = true; m.material.depthWrite = false; m.material.depthFunc = T.LessEqualDepth;
      m.renderOrder = 60; m.userData.index = p.idx; m.raycast = () => {};
      p.spotClone = m; column.add(m); spotClones.push({ p, m });
    });
  }
  function syncSpotClones() { spotClones.forEach(({ p, m }) => { if (m.material.map !== p.front.map) { m.material.map = p.front.map; m.material.emissiveMap = p.front.emissiveMap; m.material.color.copy(p.front.color); m.material.emissive.copy(p.front.emissive); m.material.needsUpdate = true; } m.scale.copy(p.mesh.scale); }); }

  // ── 강조(숨쉬기 빛)·입력 허용 — 호스트가 단계별로 지정
  let active = new Set(items.map((_, i) => i).filter((i) => items[i].active));
  let highlight = false, interactive = false;

  // ── 시점
  const DEF = { rot: -0.3, elev: 0.08, zoom: 1 };
  let rot = DEF.rot, vel = 0, elev = DEF.elev, zoom = DEF.zoom;
  const ZMIN = 0.4; let idle = true, lastTouch = 0;
  let focusRot = null, focusIdx = -1;
  let magnet = false, bounce = 0, centeredIdx = -1;      // [proto]
  function focusItem(i) {
    const p = posters.filter((q) => q.idx === i)[0]; if (!p) return;
    let target = -p.o.ang + 0.12;                       // 살짝 비스듬히
    target += Math.round((rot - target) / (Math.PI * 2)) * Math.PI * 2;
    focusRot = target; focusIdx = i; idle = false; vel = 0; dirty = true; centeredIdx = i;
  }
  // [proto] 종이 펄럭임 — 압정(위 가운데)에서 멀수록 크게, 표면 법선 방향으로
  function flutterPosters(amt, time) {
    posters.forEach((q) => {
      if (q.mesh.parent !== column) return;
      const pa = q.geo.attributes.position, b = q.base, o = q.o;
      for (let i = 0; i < pa.count; i++) {
        const x = b[i * 3], y = b[i * 3 + 1];
        const u = x / o.w + 0.5, v = 0.5 - y / o.h;           // v: 0 위 → 1 아래
        wrapLocal(o, x, y, tv, tn);
        const k = Math.pow(v, 1.6) * (0.6 + 0.4 * Math.abs(u - 0.5) * 2);
        const wave = Math.sin(u * 5.2 + time * 11 + q.idx) * 0.5 + Math.sin(v * 7 + time * 8.5) * 0.5;
        const d = 0.045 * o.w * amt * k * wave + 0.02 * o.w * amt * k;
        pa.setXYZ(i, tv.x + tn.x * d, tv.y + tn.y * d, tv.z + tn.z * d);
      }
      pa.needsUpdate = true; q.geo.computeVertexNormals();
    });
    riseState.fluttered = true;
  }
  // [proto] 전단지 가운데의 화면 좌표 (컨테이너 기준 px) + 정면도(0~1)
  const pv = new T.Vector3(), pn = new T.Vector3();
  function project(i) {
    const p = posters.filter((q) => q.idx === i)[0]; if (!p) return null;
    column.updateMatrixWorld(true);
    wrapLocal(p.o, 0, -p.o.h * 0.5, pv, pn);
    pv.applyMatrix4(column.matrixWorld);
    const nm = new T.Matrix3().getNormalMatrix(column.matrixWorld); pn.applyMatrix3(nm).normalize();
    const facing = Math.max(0, pn.z);
    pv.project(camera);
    return { x: (pv.x + 1) / 2 * W(), y: (1 - pv.y) / 2 * H(), facing, onColumn: p.mesh.parent === column };
  }
  function setColumnClip(planes) {
    column.traverse((o) => { if (!o.material) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.clippingPlanes = planes; m.needsUpdate = true; }); });
  }
  function rise() {
    if (riseState.t >= 0) return;
    column.position.y = -TOTAL_H * 1.02;
    // 바닥 아래는 칼럼만 자른다(배경은 그대로) — 전역 clippingPlanes 는 배경까지 잘라 빈 사각형이 보였다
    renderer.localClippingEnabled = true; setColumnClip([floorPlane]);
    // [proto · C1 품질 점검] 잔상(색 버퍼를 지우지 않는 모션 블러)과 종이 펄럭임은 뺐다 — 칼럼은 조용히 솟고 반 바퀴 남짓 천천히 돈다
    riseState.t = 0; riseState.spin = reduceMotion ? 0 : 0.9; riseState.done = false;
    if (riseState.contact) riseState.contact.material.opacity = 0;
    idle = false; vel = 0; dirty = true;
  }
  function fitDist() {
    const vfov = camera.fov * Math.PI / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    return Math.max((TOTAL_H * 0.5 + 0.3) / Math.tan(vfov / 2), (MAX_R + 0.3) / Math.tan(hfov / 2));
  }
  function placeCamera() {
    const d = fitDist() * zoom, k = (1 - zoom) / (1 - ZMIN);
    const ty = TOTAL_H * 0.5 * (1 - k) + 2.0 * k;
    camera.position.set(0, ty + Math.sin(elev) * d, Math.cos(elev) * d);
    camera.lookAt(0, ty, 0);
  }
  function resize() {
    renderer.setSize(W(), H(), false);
    camera.aspect = W() / H(); camera.updateProjectionMatrix();
    fitBackdrop();
    dirty = true;
  }
  window.addEventListener('resize', resize);
  resize();

  // ── 살펴보기
  const paperScene = new T.Scene();
  paperScene.environment = scene.environment;
  if (!scene.environment) paperScene.add(new T.HemisphereLight(0xffffff, 0xcfcac0, 0.9));
  const pKey = new T.DirectionalLight(0xfff4e6, 1.1); pKey.position.set(1.5, 3, 4); paperScene.add(pKey);
  const shadowQuad = (function () {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 10, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0 }));
    m.renderOrder = -1; paperScene.add(m); return m;
  })();
  let mode = 'column'; // column | out | inspect | back
  let insp = null;
  const DUR_OUT = reduceMotion ? 0.25 : 0.82, DUR_BACK = reduceMotion ? 0.22 : 0.7;
  const camR = new T.Vector3(), camU = new T.Vector3(), camB = new T.Vector3(), camF = new T.Vector3();

  function setSnap(on) {
    snap.style.transition = 'filter ' + (on ? DUR_OUT : DUR_BACK) + 's ease, opacity 0.2s';
    snap.style.filter = on ? 'blur(5px) brightness(0.62) saturate(0.85)' : 'blur(0px) brightness(1) saturate(1)';
  }
  function inspect(i, opts = {}) {
    const p = posters.filter((q) => q.idx === i)[0];
    if (!p || mode !== 'column') return false;
    if (p.spotClone) p.spotClone.visible = false;
    idle = false; vel = 0;
    column.updateMatrixWorld(true);
    const n = p.geo.attributes.position.count, b = p.base;
    const A0 = new Float32Array(n * 3), N = new Float32Array(n * 3);
    const nm = new T.Matrix3().getNormalMatrix(column.matrixWorld);
    for (let k = 0; k < n; k++) {
      wrapLocal(p.o, b[k * 3], b[k * 3 + 1], tv, tn);
      tv.applyMatrix4(column.matrixWorld); tn.applyMatrix3(nm).normalize();
      A0[k * 3] = tv.x; A0[k * 3 + 1] = tv.y; A0[k * 3 + 2] = tv.z;
      N[k * 3] = tn.x; N[k * 3 + 1] = tn.y; N[k * 3 + 2] = tn.z;
    }
    column.remove(p.mesh);
    p.glow.visible = false; p.lift = 0; p.mesh.scale.set(1, 1, 1);
    p.front.emissiveIntensity = 0;
    renderer.setClearColor(0xffffff, clearA);
    renderer.render(scene, camera);
    snap.width = renderer.domElement.width; snap.height = renderer.domElement.height;
    snap.getContext('2d').drawImage(renderer.domElement, 0, 0);
    snap.style.display = 'block'; snap.style.transition = 'none'; snap.style.filter = 'none';
    void snap.offsetWidth;
    paperScene.add(p.mesh);
    insp = { p, t: 0, A0, N, yaw: 0, pitch: 0, zoom: 1, start: performance.now(), fill: !!opts.fill };
    mode = 'out';
    setSnap(true);
    if (reduceMotion) { p.front.transparent = true; p.back.transparent = true; }
    post('inspect', { index: i });
    renderInspect(performance.now());
    return true;
  }
  // 부스 추가: 떠 있는 종이에 움직이는 그림(삽화 애니메이션 영상/캔버스)을 입힌다 — null 이면 원래 인쇄물로
  //   찢긴 종이 가장자리는 원래 인쇄물 텍스처의 알파를 alphaMap 으로 그대로 쓴다
  let liveTex = null, savedMaps = null, edgeTex = null;
  function edgeAlpha(map) {
    const img = map && map.image; if (!img || !img.getContext) return null;
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) { const a = d.data[i + 3]; d.data[i] = d.data[i + 1] = d.data[i + 2] = a; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
    return new T.CanvasTexture(c);
  }
  function setInspectMap(src) {
    const p = insp && insp.p; if (!p) return;
    if (src) {
      if (!savedMaps) { savedMaps = { p, map: p.front.map, em: p.front.emissiveMap }; edgeTex = edgeAlpha(p.front.map); }
      if (liveTex) liveTex.dispose();
      liveTex = src.tagName === 'VIDEO' ? new T.VideoTexture(src) : new T.CanvasTexture(src);
      liveTex.encoding = T.sRGBEncoding;
      liveTex.minFilter = T.LinearFilter; liveTex.generateMipmaps = false; liveTex.anisotropy = maxAniso;
      p.front.map = liveTex; p.front.emissiveMap = liveTex; p.front.alphaMap = edgeTex; p.front.needsUpdate = true;
    } else restoreMaps();
  }
  function restoreMaps() {
    if (!savedMaps) return;
    const { p, map, em } = savedMaps;
    p.front.map = map; p.front.emissiveMap = em; p.front.alphaMap = null; p.front.needsUpdate = true;
    if (liveTex) liveTex.dispose();
    if (edgeTex) edgeTex.dispose();
    liveTex = null; savedMaps = null; edgeTex = null;
  }
  function renderInspect(now) {
    if (liveTex && !liveTex.isVideoTexture) liveTex.needsUpdate = true;
    poseInspect(now);
    renderer.setClearColor(0xffffff, 0);
    renderer.render(paperScene, camera);
  }
  function release() {
    if (mode !== 'inspect' && mode !== 'out') return;
    mode = 'back';
    setSnap(false);
    post('release');
    dirty = true;
  }
  function finishBack() {
    restoreMaps();
    const p = insp.p;
    paperScene.remove(p.mesh);
    p.front.transparent = false; p.back.transparent = false; p.front.opacity = 1; p.back.opacity = 1;
    stickLocal(p);
    column.add(p.mesh);
    p.glow.visible = true;
    if (p.spotClone) p.spotClone.visible = true;
    insp = null; mode = 'column';
    // 깜빡임 방지 — 정지 이미지를 내리기 전에 같은 프레임에서 살아 있는 칼럼을 먼저 그린다
    column.rotation.y = rot; placeCamera(); parallax();
    renderer.setClearColor(0xffffff, clearA);
    renderer.render(scene, camera);
    snap.style.transition = 'none';
    snap.style.display = 'none';
    lastTouch = performance.now();
    post('released');
    dirty = true;
  }
  const F = new T.Vector3(), A = new T.Vector3(), M = new T.Vector3(), C = new T.Vector3(), off = new T.Vector3();
  function poseInspect(now) {
    const p = insp.p, o = p.o, b = p.base, pa = p.geo.attributes.position, n = pa.count;
    const t = insp.t;
    const sPeel = reduceMotion ? 1 : easeO(clamp(t / 0.32, 0, 1));
    const sFly = reduceMotion ? 1 : easeIO(clamp((t - 0.14) / 0.86, 0, 1));
    camera.matrixWorld.extractBasis(camR, camU, camB);
    camF.copy(camB).negate();
    const D = 2.2, vh = 2 * D * Math.tan(camera.fov * Math.PI / 360), vw = vh * camera.aspect;
    // fill: 화면을 꽉 채우도록 (부스 Step3 — 이어서 삽화 애니메이션의 첫 장면과 같은 크기·위치)
    const S = insp.fill ? Math.min(vh / o.h, vw / o.w) : Math.min(0.56 * vh / o.h, 0.84 * vw / o.w) * insp.zoom; // 아래 30% 는 캡션 자리
    C.copy(camera.position).addScaledVector(camF, D).addScaledVector(camU, insp.fill ? 0 : vh * 0.1);
    const tt = now / 1000;
    const sway = insp.fill ? 0 : 1;
    const yaw = insp.yaw + (reduceMotion ? 0 : 0.05 * Math.sin(tt * 0.7)) * sFly * sway;
    const pitch = insp.pitch + (reduceMotion ? 0 : 0.03 * Math.sin(tt * 0.9 + 1)) * sFly * sway;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), spp = Math.sin(pitch);
    off.set(0, 0, 0);
    if (!reduceMotion) off.copy(camU).multiplyScalar(0.55).addScaledVector(camB, 0.5);
    for (let k = 0; k < n; k++) {
      const x = b[k * 3], y = b[k * 3 + 1];
      const u = clamp(x / o.w + 0.5, 0, 1), v = clamp(y / o.h + 0.5, 0, 1);
      const d = clamp((u + v) / 2, 0, 1), lift = 0.26 * o.w * sPeel * Math.pow(d, 2.3) * (1 - sFly);
      A.set(insp.A0[k * 3] + insp.N[k * 3] * lift, insp.A0[k * 3 + 1] + insp.N[k * 3 + 1] * lift, insp.A0[k * 3 + 2] + insp.N[k * 3 + 2] * lift);
      const lx = x * S, ly = y * S, lz = (insp.fill ? -0.012 * (1 - sFly) : -0.055) * S * o.w * Math.pow(2 * x / o.w, 2);
      const rx = lx * cyw + lz * syw; let rz = -lx * syw + lz * cyw;
      const ry = ly * cp - rz * spp; rz = ly * spp + rz * cp;
      F.copy(C).addScaledVector(camR, rx).addScaledVector(camU, ry).addScaledVector(camB, rz);
      M.copy(A).add(F).multiplyScalar(0.5).add(off);
      const s = sFly, a = (1 - s) * (1 - s), m2 = 2 * (1 - s) * s, c2 = s * s;
      const flap = reduceMotion ? 0 : Math.sin(Math.PI * s) * 0.09 * S * Math.sin(u * Math.PI * 2.2 + tt * 7);
      pa.setXYZ(k,
        A.x * a + M.x * m2 + F.x * c2 + camB.x * flap,
        A.y * a + M.y * m2 + F.y * c2 + camB.y * flap,
        A.z * a + M.z * m2 + F.z * c2 + camB.z * flap);
    }
    pa.needsUpdate = true; p.geo.computeVertexNormals(); p.geo.computeBoundingSphere();
    shadowQuad.position.copy(C).addScaledVector(camB, -0.35).addScaledVector(camU, -0.06 * S * o.h);
    shadowQuad.quaternion.copy(camera.quaternion);
    shadowQuad.scale.set(o.w * S * 1.3, o.h * S * 1.2, 1);
    shadowQuad.material.opacity = 0.32 * sFly;
    if (reduceMotion) { p.front.opacity = p.back.opacity = clamp(t, 0, 1); }
  }

  // ── 입력
  const el = renderer.domElement;
  const pts = {};
  let down = null, pinch0 = null, lastX = 0, lastT = 0;
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  let pressIdx = -1, hoverIdx = -1, hoverT = 0;
  const count = () => Object.keys(pts).length;
  function pinchDist() { const k = Object.keys(pts); const a = pts[k[0]], b = pts[k[1]]; return Math.hypot(a.x - b.x, a.y - b.y); }
  const liftable = (i) => i >= 0 && highlight && active.has(i);
  el.addEventListener('pointerdown', (e) => {
    if (!interactive) return;
    if (el.setPointerCapture) { try { el.setPointerCapture(e.pointerId); } catch (_) { /* noop */ } }
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    idle = false; vel = 0; dirty = true; lastTouch = performance.now();
    focusRot = null;
    if (mode === 'column' && count() === 1) { const i = posterAt(e.clientX, e.clientY); pressIdx = liftable(i) ? i : -1; }
    if (count() === 1) { down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false }; lastX = e.clientX; lastT = performance.now(); }
    else { down = null; pinch0 = { d: pinchDist(), z: mode === 'column' ? zoom : (insp ? insp.zoom : 1) }; }
  });
  el.addEventListener('pointermove', (e) => {
    const p = pts[e.pointerId];
    if (!p) {
      if (interactive && mode === 'column' && e.pointerType === 'mouse' && performance.now() - hoverT > 40) {
        hoverT = performance.now(); const i = posterAt(e.clientX, e.clientY); hoverIdx = liftable(i) ? i : -1;
        el.style.cursor = hoverIdx >= 0 ? 'pointer' : 'grab';
      }
      return;
    }
    if (pressIdx >= 0 && (Math.abs(e.clientX - lastX) > 6)) pressIdx = -1;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY; dirty = true; lastTouch = performance.now();
    if (count() >= 2 && pinch0) {
      const ratio = pinchDist() / Math.max(pinch0.d, 1);
      if (mode === 'column') zoom = clamp(pinch0.z / ratio, ZMIN, 1);
      else if (insp) insp.zoom = clamp(pinch0.z * ratio, 0.8, 2.4);
      return;
    }
    if (down && (Math.abs(e.clientX - down.x) > 6 || Math.abs(e.clientY - down.y) > 6)) down.moved = true;
    if (mode === 'inspect' && insp) {
      insp.yaw = clamp(insp.yaw + dx * 0.006, -1.1, 1.1);
      insp.pitch = clamp(insp.pitch + dy * 0.005, -0.6, 0.6);
      return;
    }
    if (mode !== 'column') return;
    const s = 2.4 / Math.max(W(), 1) * Math.PI;
    rot += dx * s;
    elev = clamp(elev + dy * 0.004, -0.12, 0.5);
    const now = performance.now(), dt = Math.max(now - lastT, 1);
    vel = (e.clientX - lastX) * s / dt * 16;
    lastX = e.clientX; lastT = now;
  });
  function end(e) {
    if (!pts[e.pointerId]) return;
    delete pts[e.pointerId];
    pressIdx = -1;
    if (count() < 2) pinch0 = null;
    if (e.type === 'pointerup' && down && !down.moved && performance.now() - down.t < 450) { vel = 0; tap(e.clientX, e.clientY); }
    if (performance.now() - lastT > 80) vel = 0;
    if (count() === 0) down = null;
    dirty = true;
  }
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', (e) => {
    if (!interactive) return;
    e.preventDefault(); idle = false; dirty = true; lastTouch = performance.now();
    if (mode === 'column') zoom = clamp(zoom * (1 + e.deltaY * 0.001), ZMIN, 1);
    else if (insp) insp.zoom = clamp(insp.zoom * (1 - e.deltaY * 0.001), 0.8, 2.4);
  }, { passive: false });
  function posterAt(x, y) {
    const r = el.getBoundingClientRect();
    ndc.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([shaft].concat(fillerMesh ? [fillerMesh] : [], posters.map((q) => q.mesh)), false)[0];
    return hit && hit.object.userData.index !== undefined ? hit.object.userData.index : -1;
  }
  function tap(x, y) {
    const r = el.getBoundingClientRect();
    ndc.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (mode === 'inspect') {
      const onPaper = ray.intersectObject(insp.p.mesh, false)[0];
      if (!onPaper) release();
      return;
    }
    if (mode !== 'column') return;
    const i = posterAt(x, y);
    if (i >= 0) post('tap', { index: i, active: active.has(i) });
  }
  function reset() {
    if (mode !== 'column') { release(); return; }
    rot = DEF.rot; vel = 0; elev = DEF.elev; zoom = DEF.zoom; idle = true; focusRot = null; dirty = true;
  }

  // ── 루프
  let prev = performance.now(), skip = false, running = true, raf = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    const time = now / 1000;
    let animating = false;
    if (mode === 'column') {
      if (riseState.t >= 0) {            // [proto] 솟아오르기
        riseState.t = Math.min(1, riseState.t + dt / riseState.dur);
        const t = riseState.t, e = reduceMotion ? 1 : 1 - Math.pow(1 - t, 3);
        const over = reduceMotion ? 0 : Math.sin(Math.min(1, t) * Math.PI) * 0.06 * (1 - t);
        column.position.y = -TOTAL_H * 1.02 * (1 - e) + over;
        riseState.spin *= Math.pow(0.25, dt);
        rot += riseState.spin * dt;
        overhead.intensity = overheadMax * e;
        if (riseState.contact) riseState.contact.material.opacity = e;
        animating = true;
        if (t >= 1) {
          riseState.t = -1; column.position.y = 0; setColumnClip(null);
          riseState.done = true; idle = false; vel = 0.006; lastTouch = performance.now();
          post('risen');
        }
      } else if (focusRot !== null) {           // 지정한 인쇄물이 정면에 오도록 돌린다
        const dlt = focusRot - rot; rot += dlt * Math.min(1, dt * 3.2); animating = true;
        if (Math.abs(dlt) < 0.002) { rot = focusRot; focusRot = null; post('focused', { index: focusIdx }); }
      } else if (idle) { rot += 0.12 * dt; animating = true; }
      else if (Math.abs(vel) > 0.0001 && count() === 0) { rot += vel; vel *= 0.94; animating = true; }
      // [proto] 자석 — 손을 뗀 뒤 느려지면 가장 가까운 전단지가 정면에 오도록 끌어당긴다. 멈추는 순간 살짝 튕기고 'centered'
      if (magnet && riseState.t < 0 && focusRot === null && !idle && count() === 0 && Math.abs(vel) < 0.012) {
        let best = null, bd = 1e9;
        posters.forEach((q) => {
          if (!active.has(q.idx)) return;
          let tgt = -q.o.ang + 0.12; tgt += Math.round((rot - tgt) / (Math.PI * 2)) * Math.PI * 2;
          const d = Math.abs(tgt - rot); if (d < bd) { bd = d; best = { q, tgt }; }
        });
        if (best && bd < 0.42) {
          const pull = (best.tgt - rot) * Math.min(1, dt * 4.5);
          rot += pull; vel *= 0.9; animating = true;
          if (bd < 0.012 && centeredIdx !== best.q.idx) { centeredIdx = best.q.idx; vel = 0; bounce = 1; post('centered', { index: best.q.idx }); }
        }
      }
      if (Math.abs(vel) > 0.02) centeredIdx = -1;
      if (bounce > 0) { bounce = Math.max(0, bounce - dt * 4); animating = true; }
      column.rotation.y = rot; place.rotation.y = rot;
      const bz = 1 - 0.012 * Math.sin(bounce * Math.PI);    // 튕김: 카메라가 아주 살짝 다가갔다 돌아온다
      column.scale.setScalar(bz); column.position.y = riseState.t >= 0 ? column.position.y : (1 - bz) * TOTAL_H * 0.5;
      parallax();
      // 상호작용 인쇄물 — 활성 항목만 가장자리 숨쉬기 빛, 누름/올림 들림
      const breath = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 / 2.6);
      let lifting = false;
      // [proto] 빛 쓸기 — 종이가 정면(카메라 쪽, 약간 왼쪽 위에서 오는 빛)을 지날 때 밝아진다. 돌리는 속도가 있을수록 또렷하게
      const sweepAmt = Math.min(1, Math.abs(vel) * 40 + (focusRot !== null ? 0.6 : 0)) * 0.22 + 0.06;
      posters.forEach((q) => {
        const target = q.idx === pressIdx ? 1 : (q.idx === hoverIdx ? 0.6 : 0);
        q.lift += (target - q.lift) * Math.min(1, dt * 14);
        if (Math.abs(target - q.lift) > 0.002) lifting = true;
        const sc = 1 + 0.022 * q.lift;
        q.mesh.scale.set(sc, 1, sc);
        q.tack.position.set(q.tackBase.x * sc, q.tackBase.y, q.tackBase.z * sc);
        q.glow.visible = highlight && active.has(q.idx);
        q.glow.material.opacity = Math.min(1, (0.45 + 0.55 * breath) * (1 + 0.6 * q.lift));
        const face = Math.cos(rot + q.o.ang - 0.35);                 // 1 = 빛을 정면으로 받는 각
        const sweep = Math.pow(Math.max(0, face), 9) * sweepAmt;
        q.front.emissiveIntensity = 0.05 * q.lift + sweep;
      });
      if (riseState.flutter > 0.001) { flutterPosters(riseState.flutter, time); animating = true; }
      else if (riseState.fluttered) { posters.forEach((q) => stickLocal(q)); riseState.fluttered = false; }
      // 스포트라이트
      spotAmt += ((spot ? 1 : 0) - spotAmt) * Math.min(1, dt * 4);
      if (Math.abs(spotAmt - (spot ? 1 : 0)) > 0.003) animating = true;
      dimQuad.visible = spotAmt > 0.005;
      dimQuad.material.opacity = 0.72 * spotAmt;
      if (spotClones.length) syncSpotClones();
      spotClones.forEach(({ p, m }) => { m.visible = dimQuad.visible && p.mesh.parent === column; });
      posters.forEach((q) => { q.glow.renderOrder = spot && active.has(q.idx) ? 61 : 0; });
      placeCamera();
      { const hh = 2 * Math.tan(camera.fov * Math.PI / 360) * 1.05; dimQuad.scale.set(hh * camera.aspect, hh, 1); }
      skip = !skip;
      if (animating || dirty || lifting || !skip) { renderer.render(scene, camera); dirty = false; }
    } else {
      if (mode === 'out') { insp.t = Math.min(1, insp.t + dt / DUR_OUT); if (insp.t >= 1) { mode = 'inspect'; post('settled'); } }
      else if (mode === 'back') { insp.t = Math.max(0, insp.t - dt / DUR_BACK); }
      renderInspect(now);
      if (mode === 'back' && insp.t <= 0) finishBack();
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // ── 초기화 (원본 뷰어 HTML의 전역 초기화 함수 처리)
  if (backdrop) setBackdrop(backdrop);
  pending = items.length + (filler ? 1 : 0);
  if (pending === 0) post('loaded');
  if (filler) {
    new T.ImageLoader().load(filler.src, (img) => {
      const k0 = img.width / (filler.w || img.width);
      buildFillers(img, (filler.rects || []).map((r) => ({ x: r.x * k0, y: r.y * k0, w: r.w * k0, h: r.h * k0 })));
      done();
    }, undefined, () => { done(); post('error', { message: 'filler_load_failed' }); });
  }
  pending -= items.length;
  addItems(items);

  return {
    get mode() { return mode; },
    inspect, release, reset, resize, focusItem, setInspectMap,
    rise, project, flutterPosters,                                 // [proto]
    setMagnet(on) { magnet = on; centeredIdx = -1; },              // [proto]
    setFlutter(a) { riseState.flutter = a; dirty = true; },        // [proto · C1 움직임] 솟는 동안 종이가 바람에 펄럭인다(호스트가 세기를 준다)
    setAmbience(o) {                                               // [proto · C1 움직임] 해 질 녘: 투명 배경 · 따뜻한 조명 · 어두운 안개
      if ('transparent' in o) { clearA = o.transparent ? 0 : 1; backdropMesh.visible = !o.transparent; renderer.setClearColor(0xffffff, clearA); }
      if (o.key != null) key.intensity = o.key; if (o.keyColor != null) key.color.set(o.keyColor);
      if (o.fill != null) fill.intensity = o.fill; if (o.fillColor != null) fill.color.set(o.fillColor);
      if (o.hemi != null) hemi.intensity = o.hemi;
      if (o.exposure != null) renderer.toneMappingExposure = o.exposure;
      if (o.fog != null) scene.fog.color.set(o.fog);
      if (o.overhead != null) { overheadMax = o.overhead; if (riseState.done) overhead.intensity = o.overhead; }
      if (o.overheadColor != null) overhead.color.set(o.overheadColor);
      dirty = true;
    },
    get rot() { return rot; }, get risen() { return riseState.done; }, get riseT() { return riseState.t; },
    setIdle(on) { idle = on; dirty = true; },
    get debugMap() { const p = insp && insp.p; return p ? { type: p.front.map && p.front.map.constructor.name, video: !!(p.front.map && p.front.map.isVideoTexture), alpha: !!p.front.alphaMap } : null; },
    setHighlight(on) { highlight = on; dirty = true; },
    setSpotlight(on) { spot = on; if (on) ensureSpotClones(); dirty = true; },
    setInteractive(on) { interactive = on; el.style.pointerEvents = on ? 'auto' : 'none'; if (!on) { hoverIdx = -1; pressIdx = -1; } },
    pause() { running = false; cancelAnimationFrame(raf); },
    resume() { if (!running) { running = true; prev = performance.now(); dirty = true; raf = requestAnimationFrame(frame); } },
  };
}
