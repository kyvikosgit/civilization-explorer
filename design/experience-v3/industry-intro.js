// 산업혁명(사업가의 사무실) 3D 도입(11/23) — 살롱 · 시민사회 · 에트르타처럼 three.js 한 장면, 아주 짧게(introctl.js 배속).
//   어두운 사무실 → 책상 등이 켜진다 → 벽의 세계지도 · 철도 지도 · 우키요에, 창 너머 생라자르역 → 카메라가 책상으로 내려가 기차표 앞에서 → 걷히며 안내판 장면으로
//   그림은 모두 이미 쓰던 자료(img/of_world · C2_map_ouest_chaix1870 · of_wave · C2_monet_gare_saint_lazare1877 · of_ledger · t_ticket). 가구는 단순한 상자 · 원기둥(외부 모델 없음 — 빨리 뜨게)
//   playIndustryIntro({ onDone }) — 누르면 바로 끝
import * as T from 'three';

const IMG = (n) => new URL('./img/' + n, import.meta.url).href;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t, a, d) => clamp((t - a) / d);
// 시간표(초, 배속 전)
const TL = { lamp: 0.35, lampD: 0.7, title: 0.3, dolly: 0.6, dollyD: 3.4, out: 3.9, outD: 0.6 };

export function playIndustryIntro({ onDone } = {}) {
  const root = document.createElement('div');
  root.id = 'inIntro'; root.setAttribute('aria-hidden', 'true');
  root.innerHTML = '<canvas></canvas><div class="in-title"><small>1870s · PARIS</small><b>사업가의 사무실</b></div>';
  const st = document.createElement('style');
  st.textContent = '#inIntro{position:fixed;inset:0;z-index:80;background:#0b0907;transition:opacity .5s ease}#inIntro.out{opacity:0;pointer-events:none}'
    + '#inIntro canvas{position:absolute;inset:0;width:100%;height:100%;display:block}'
    + '#inIntro .in-title{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top) + 64px);text-align:center;color:#F4E7CF;font-family:Paperlogy,Freesentation,sans-serif;opacity:0;transform:translateY(8px);transition:opacity .5s ease,transform .5s ease;text-shadow:0 2px 12px rgba(0,0,0,.6)}'
    + '#inIntro .in-title.on{opacity:1;transform:none}#inIntro .in-title small{display:block;font-size:12px;letter-spacing:.2em;color:#D9B77A;font-weight:600}#inIntro .in-title b{display:block;margin-top:6px;font-size:26px;font-weight:800}';
  document.head.appendChild(st); document.body.appendChild(root);
  const cv = root.querySelector('canvas'), title = root.querySelector('.in-title');
  const SPEED = (window.M100_INTRO && window.M100_INTRO.speed) || 1;

  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true }); }
  catch (e) { root.remove(); onDone?.(); return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(); scene.background = new T.Color(0x0b0907);
  const cam = new T.PerspectiveCamera(50, 1, 0.05, 40);
  const fit = () => { const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < 0.8 ? 62 : 50; cam.updateProjectionMatrix(); };
  fit(); addEventListener('resize', fit);

  const loader = new T.TextureLoader();
  const tex = (n) => { const t = loader.load(IMG(n), () => (dirty = true)); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; };
  const mat = (o) => new T.MeshStandardMaterial({ roughness: 0.8, metalness: 0, ...o });
  const box = (w, h, d, m, x, y, z) => { const b = new T.Mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; scene.add(b); return b; };
  const plane = (w, h, m, x, y, z, ry = 0, rx = 0) => { const p = new T.Mesh(new T.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.set(rx, ry, 0); p.receiveShadow = true; scene.add(p); return p; };
  let dirty = true;

  // 방 — 짙은 녹색 벽 · 나무 바닥 · 징두리
  const wallM = mat({ color: 0x2c3a2e, roughness: 0.92 });
  plane(9, 4, wallM, 0, 2, -2.2); plane(6, 4, wallM, -3.2, 2, 0.6, Math.PI / 2); plane(6, 4, wallM, 3.2, 2, 0.6, -Math.PI / 2);
  plane(9, 7, mat({ color: 0x3a2618, roughness: 0.6 }), 0, 0, 0.6, 0, -Math.PI / 2);
  box(9, 0.9, 0.04, mat({ color: 0x2a1a10, roughness: 0.55 }), 0, 0.45, -2.17);
  // 벽에 건 것들(액자 = 얇은 상자 + 그림 면)
  const frameM = mat({ color: 0x6b4a22, roughness: 0.45, metalness: 0.3 });
  const hang = (n, w, h, x, y) => { box(w + 0.08, h + 0.08, 0.04, frameM, x, y, -2.16); plane(w, h, mat({ map: tex(n), roughness: 0.7 }), x, y, -2.135); };
  hang('of_world.jpg', 1.5, 0.95, -1.75, 2.05);
  hang('C2_map_ouest_chaix1870.jpg', 1.1, 0.8, 1.85, 2.0);
  hang('of_wave.jpg', 0.42, 0.3, 1.85, 1.35);
  // 창 — 그 너머 생라자르역(조금 빛나게)
  box(1.3, 1.65, 0.06, mat({ color: 0x1b1410, roughness: 0.5 }), 0, 1.95, -2.15);
  plane(1.18, 1.52, new T.MeshBasicMaterial({ map: tex('C2_monet_gare_saint_lazare1877_orsay.jpg'), toneMapped: false, color: 0xcfd6e6 }), 0, 1.95, -2.11);
  box(0.04, 1.52, 0.03, mat({ color: 0x1b1410 }), 0, 1.95, -2.09); box(1.18, 0.04, 0.03, mat({ color: 0x1b1410 }), 0, 2.2, -2.09);
  // 책상
  const wood = mat({ color: 0x3a2212, roughness: 0.5 });
  box(1.9, 0.06, 0.95, wood, 0, 0.76, -0.4);
  for (const [x, z] of [[-0.88, -0.83], [0.88, -0.83], [-0.88, 0.03], [0.88, 0.03]]) box(0.07, 0.73, 0.07, wood, x, 0.37, z);
  box(1.9, 0.2, 0.05, wood, 0, 0.63, 0.06);
  // 책상 위 — 장부 · 종이 · 잉크병 · 기차표
  const paper = mat({ color: 0xd9ccb0, roughness: 0.95 });
  box(0.42, 0.05, 0.3, mat({ map: tex('of_ledger.jpg'), roughness: 0.8 }), -0.5, 0.815, -0.45).rotation.y = 0.18;
  for (let i = 0; i < 3; i++) { const p = plane(0.3, 0.4, paper, 0.38 + i * 0.03, 0.792 + i * 0.002, -0.55 + i * 0.02, 0, -Math.PI / 2); p.rotation.z = -0.2 + i * 0.12; }
  const ink = new T.Mesh(new T.CylinderGeometry(0.035, 0.045, 0.07, 20), mat({ color: 0x101820, roughness: 0.2, metalness: 0.2 })); ink.position.set(0.05, 0.825, -0.62); ink.castShadow = true; scene.add(ink);
  const ticket = plane(0.1, 0.2, new T.MeshStandardMaterial({ map: tex('t_ticket.png'), transparent: true, roughness: 0.85 }), 0.02, 0.793, -0.18, 0, -Math.PI / 2);
  ticket.rotation.z = 1.35;
  // 책상 등 — 받침 · 대 · 초록 갓 · 빛
  const brass = mat({ color: 0xb08a3e, roughness: 0.3, metalness: 0.8 });
  const lb = new T.Mesh(new T.CylinderGeometry(0.08, 0.09, 0.03, 24), brass); lb.position.set(-0.62, 0.805, -0.72); scene.add(lb);
  const ls = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.36, 10), brass); ls.position.set(-0.62, 0.98, -0.72); scene.add(ls);
  const shadeM = mat({ color: 0x1f5a3a, roughness: 0.35, emissive: 0x2a7a4a, emissiveIntensity: 0 });
  const shade = new T.Mesh(new T.CylinderGeometry(0.09, 0.17, 0.11, 24, 1, true), shadeM); shade.position.set(-0.62, 1.17, -0.72); shade.material.side = T.DoubleSide; scene.add(shade);
  const lamp = new T.SpotLight(0xffd59a, 0, 6, Math.PI / 3.2, 0.6, 1.2); lamp.position.set(-0.62, 1.12, -0.72); lamp.target.position.set(-0.1, 0.78, -0.3);
  lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); scene.add(lamp, lamp.target);
  const glow = new T.PointLight(0xffc98a, 0, 3.5, 1.6); glow.position.set(-0.62, 1.05, -0.6); scene.add(glow);
  const win = new T.DirectionalLight(0xa8b8d8, 0.35); win.position.set(0, 2.2, -1.8); win.target.position.set(0, 0.7, 0); scene.add(win, win.target);
  scene.add(new T.AmbientLight(0x6e7a90, 0.12));

  // 카메라: 방 한가운데 서서 → 책상 위 기차표로 내려간다
  const A = { p: new T.Vector3(0.35, 1.72, 3.0), l: new T.Vector3(0, 1.55, -2.0) };
  const B = { p: new T.Vector3(0.12, 1.22, 0.38), l: new T.Vector3(0.02, 0.79, -0.22) };
  const P = new T.Vector3(), L = new T.Vector3();
  function pose(t) {
    const k = ease(seg(t, TL.dolly, TL.dollyD));
    P.lerpVectors(A.p, B.p, k); L.lerpVectors(A.l, B.l, k);
    cam.position.copy(P); cam.lookAt(L);
    const on = ease(seg(t, TL.lamp, TL.lampD));
    lamp.intensity = 2.2 * on; glow.intensity = 0.7 * on; shadeM.emissiveIntensity = 0.5 * on;
  }
  let raf = 0, t0 = 0, done = false;
  function frame(now) {
    if (done) return;
    const t = (now - t0) / 1000 * SPEED;
    if (t > TL.title) title.classList.add('on');
    pose(t); renderer.render(scene, cam);
    if (t >= TL.out) { title.classList.remove('on'); root.classList.add('out'); }
    if (t >= TL.out + TL.outD) return finish();
    raf = requestAnimationFrame(frame);
  }
  function finish() {
    if (done) return; done = true; cancelAnimationFrame(raf);
    removeEventListener('pointerdown', skip, true); removeEventListener('resize', fit);
    root.classList.add('out'); onDone?.();
    setTimeout(() => { root.remove(); st.remove(); renderer.dispose(); }, 600);
  }
  function skip() { finish(); }
  pose(0); renderer.compile(scene, cam); renderer.render(scene, cam);
  t0 = performance.now(); raf = requestAnimationFrame(frame);
  addEventListener('pointerdown', skip, true);
  void dirty;
}
