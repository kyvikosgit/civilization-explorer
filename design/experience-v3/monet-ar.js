// v3 모네 전시관 — 어둠 · 조명 입장(v2) → 질문 → 현장 카메라(세로 그대로) → 〈인상, 해돋이〉를 비추면
//   비추는 그 그림 자리, 그 크기 그대로 그림이 당시 장면으로 살아난다(카메라 화면 속 그림 위에 붙어 따라간다 · 색은 카메라에 비친 그림에 맞춤)
//   → 끝나면(또는 건너뛰기) 그 자리에서 다시 그림이 된다 → 그 그림이 페이지의 액자 자리로 옮겨 가 끝 줄(v2)
//   화면 가득 커지는 단계는 없다
import { ZONES } from './data.js';
import { openCam, closeCam, esc } from './camui.js';
import { makeGuide } from './guide.js';
import { store } from './store.js';
import { collect, mountEnd } from './done.js';

const task = ZONES.find((z) => z.id === 'monet').tasks[0];
const V3 = '../../experience-v3/';
// 문서 기준(<base>)이 v2 폴더 — 영상 · 그림은 거기 있다
const VIDEO = new URL('video/sunrise-scene.mp4', document.baseURI).href;
const PAINT = new URL('img/c5/sunrise-painting.jpg', document.baseURI).href;
const VAR = 752 / 560;                                   // 영상 가로/세로
// 타깃 세로/가로 — mind/sunrise.mind 컴파일 순서(해돋이 원본 img/sunrise_target.jpg · 생라자르 · 에트르타 · 수련)
const RATIO = [1241 / 1600, 0.744, 0.801, 1.255];
const targets = task.targets.map((t) => ({ ...t, img: V3 + t.img }));
const WIN = targets.findIndex((t) => t.correct);
const guide = makeGuide();
const INFO = {
  coach: { img: V3 + 'img/hero_sunrise.jpg', kind: 'gilt', land: true },
  title: '“그냥 인상에 지나지 않는다”',
  sub: '1874년, 비평가를 화나게 한 그림을 찾아 비춰 보세요',
  buttons: [{ label: '그림 찾기', cam: true, on: start }],
};
function showGuide() { if (!guide.shown && window.__c5sun.state === 'scan') guide.show(INFO); }
setTimeout(showGuide, 3200);                     // 조명이 다 켜진 뒤
window.addEventListener('c5:scan', showGuide);
// 다시 보기: 페이지 액자 속 그림이 그 자리에서 다시 장면이 된다
window.addEventListener('c5:replay', () => {
  document.getElementById('sunEnd').classList.remove('on');
  inPlace(frameRect(), () => document.getElementById('sunEnd').classList.add('on'));
});

const CAP = '<div class="dc">1872년 11월 13일 아침, 르아브르</div><div class="ds">날짜는 추정 · AI로 재현한 장면</div>';
function start() {
  guide.hide();
  openCam({
    title: '모네 전시관 · 비평가가 본 그림 찾기', find: '비평가를 화나게 한 그림에\n카메라를 비춰 보세요',
    hint: '그림이 화면에 가득 차도록\n조금 더 가까이 다가가 보세요',
    mind: V3 + task.mind, targets, demo: store.demo(), hold: true, fx: sunFx, center: true, dots: false,
    onFail: (msg) => { closeCam(); guide.reset(); guide.fail(msg); },
    onClose: () => guide.reset(),
    onFound: async (i, ui) => {
      const t = targets[i];
      if (!t.correct) return ui.show({ html: `<div class="dc">모네 전시관</div><div class="dt">${esc(t.title)}</div><div class="ds">${esc(t.sub)}</div><div class="fb">${esc(task.wrong)}</div>`, buttons: [{ label: ui.el.classList.contains('sim-on') ? '다른 그림 고르기' : '다른 그림 비추기', on: () => ui.release() }] });
      store.solve(task.id); collect(task.id);   // 정답과 함께 저절로 — 영상 중간에 나가도 수집품은 남는다
      const live = ui.fx?.play && !ui.el.classList.contains('sim-on');
      let skip = null;
      ui.show({ html: CAP, buttons: [{ label: '건너뛰기', cls: 'line', on: () => skip?.() }] });
      navigator.vibrate?.([20, 60, 30]);
      if (live) {
        // 카메라 화면 속 그림 위에서 재생 → 끝나면 그림으로(겹친 영상이 걷히면 카메라에 비친 진짜 그림)
        await ui.fx.play((f) => { skip = f; });
        await ui.fx.fadeOut();
        await wait(250);
        handoff(ui.fx.rect(WIN) || ui.simRect?.());
      } else {
        // 카메라 없이 고르기: 화면에 보이는 그 그림 자리에서 — 해설 판이 뜨면 그림이 위로 올라가며 작아진다(cam.css .locked, .45초). 다 옮겨 간 뒤에 잰다
        await wait(500);
        const r = ui.simRect?.();
        await new Promise((done) => inPlace(r, done, (f) => { skip = f; }));
        handoff(r);
      }
    },
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frameRect = () => { const f = document.getElementById('sunImg')?.getBoundingClientRect(); return f && f.width > 20 ? { l: f.left, t: f.top, r: f.right, b: f.bottom } : null; };
const centerRect = () => { const W = innerWidth, H = innerHeight, w = Math.min(W * 0.8, H * 0.5 * VAR), h = w * RATIO[WIN]; return { l: (W - w) / 2, t: (H - h) / 2, r: (W + w) / 2, b: (H + h) / 2 }; };
const box = (el, r) => Object.assign(el.style, { left: `${r.l}px`, top: `${r.t}px`, width: `${r.r - r.l}px`, height: `${r.b - r.t}px` });
const kf = (r) => ({ left: `${r.l}px`, top: `${r.t}px`, width: `${r.r - r.l}px`, height: `${r.b - r.t}px` });
const EASE = 'cubic-bezier(.65,0,.25,1)';

// ── 현장: 인식한 그림 위에 영상 판을 붙인다(그림 비율 · 영상은 가운데를 그림 비율로). 색은 카메라에 비친 그 그림의 평균 · 흩어짐에 맞춘다
const FRAG = `
uniform sampler2D map; uniform vec2 k; uniform vec3 mA, sA, mB, sB; uniform float on;
varying vec2 q;
void main(){
  float f = .02;
  float a = smoothstep(0., f, q.x) * smoothstep(0., f, 1. - q.x) * smoothstep(0., f, q.y) * smoothstep(0., f, 1. - q.y);
  vec3 v = texture2D(map, .5 + (q - .5) * k).rgb;
  gl_FragColor = vec4(clamp((v - mA) * (sB / max(sA, vec3(.01))) + mB, 0., 1.), a * on);
}`;
function sunFx({ THREE, mindar, anchors }) {
  const v = document.createElement('video');
  Object.assign(v, { src: VIDEO, muted: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' }); v.setAttribute('playsinline', '');
  const par = 1 / RATIO[WIN], k = [Math.min(1, par / VAR), Math.min(1, VAR / par)];
  const U = { map: { value: new THREE.VideoTexture(v) }, k: { value: new THREE.Vector2(...k) }, on: { value: 0 },
    mA: { value: new THREE.Vector3(0.5, 0.5, 0.5) }, sA: { value: new THREE.Vector3(1, 1, 1) }, mB: { value: new THREE.Vector3(0.5, 0.5, 0.5) }, sB: { value: new THREE.Vector3(1, 1, 1) } };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, RATIO[WIN]), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: U, fragmentShader: FRAG,
    vertexShader: 'varying vec2 q; void main(){ q = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  }));
  m.position.z = 0.001; anchors[WIN].group.add(m);
  // 색 재기: 32×32 로 줄여 채널별 평균 · 흩어짐
  const bc = document.createElement('canvas'); bc.width = bc.height = 32;
  const bx = bc.getContext('2d', { willReadFrequently: true });
  const stats = (img, sx, sy, sw, sh) => {
    bx.drawImage(img, sx, sy, sw, sh, 0, 0, 32, 32);
    const d = bx.getImageData(0, 0, 32, 32).data, n = d.length / 4, a = [0, 0, 0], b = [0, 0, 0];
    for (let p = 0; p < d.length; p += 4) for (let j = 0; j < 3; j++) { const x = d[p + j] / 255; a[j] += x; b[j] += x * x; }
    return { m: a.map((x) => x / n), s: b.map((x, j) => Math.sqrt(Math.max(0, x / n - (a[j] / n) ** 2))) };
  };
  let ref = null, cam = null, last = 0, want = 0;
  v.addEventListener('loadeddata', () => {
    try { const W = v.videoWidth, H = v.videoHeight, cw = W * k[0], ch = H * k[1]; ref = stats(v, (W - cw) / 2 + cw * 0.1, (H - ch) / 2 + ch * 0.1, cw * 0.8, ch * 0.8); } catch {}
    if (ref) { U.mA.value.fromArray(ref.m); U.sA.value.fromArray(ref.s); if (!cam) { U.mB.value.fromArray(ref.m); U.sB.value.fromArray(ref.s); } }
  }, { once: true });
  const p3 = new THREE.Vector3();
  const rect = (i) => {
    const c = mindar.container, r = RATIO[i], cw = c.clientWidth, ch = c.clientHeight;
    if (!anchors[i].group.visible) return null;
    const pts = [[-0.5, r / 2], [0.5, r / 2], [0.5, -r / 2], [-0.5, -r / 2]].map(([x, y]) => {
      p3.set(x, y, 0).applyMatrix4(anchors[i].group.matrixWorld).project(mindar.camera);
      return [(p3.x * 0.5 + 0.5) * cw, (1 - (p3.y * 0.5 + 0.5)) * ch];
    });
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const b = { l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) };
    return b.r - b.l > 40 && b.b - b.t > 30 ? b : null;
  };
  const camStats = () => {
    const cv = mindar.video, ct = mindar.container, r = rect(WIN);
    if (!cv || !cv.videoWidth || !r) return null;
    const a = cv.getBoundingClientRect(), b = ct.getBoundingClientRect(), kx = cv.videoWidth / a.width, ky = cv.videoHeight / a.height;
    const ix = (r.r - r.l) * 0.1, iy = (r.b - r.t) * 0.1;
    let sx = (r.l + ix + b.left - a.left) * kx, sy = (r.t + iy + b.top - a.top) * ky, sw = (r.r - r.l - ix * 2) * kx, sh = (r.b - r.t - iy * 2) * ky;
    sx = Math.max(0, sx); sy = Math.max(0, sy); sw = Math.min(cv.videoWidth - sx, sw); sh = Math.min(cv.videoHeight - sy, sh);
    if (sw < 12 || sh < 12) return null;
    try { return stats(cv, sx, sy, sw, sh); } catch { return null; }
  };
  return {
    rect,
    // 처음부터 한 번 재생 — 끝나거나 건너뛰면 끝
    play(onSkip) {
      return new Promise((done) => {
        let over = false; const end = () => { if (over) return; over = true; done(); };
        onSkip?.(end);
        want = 1; try { v.currentTime = 0; } catch {} v.play().catch(() => setTimeout(end, 400));
        v.addEventListener('ended', end, { once: true });
      });
    },
    // 겹친 영상을 걷는다 — 아래의 카메라 화면 속 진짜 그림이 드러난다
    fadeOut() { want = 0; return wait(600).then(() => { try { v.pause(); } catch {} }); },
    tick() {
      const vis = anchors[WIN].group.visible;
      U.on.value += ((want && vis ? 1 : 0) - U.on.value) * (want ? 0.18 : 0.14);
      const now = performance.now();
      if (want && vis && ref && now - last > 250) {
        last = now;
        const c = camStats();
        if (c) {
          const f = cam ? 0.35 : 1; cam = cam || { m: [...c.m], s: [...c.s] };
          for (let j = 0; j < 3; j++) { cam.m[j] += (c.m[j] - cam.m[j]) * f; cam.s[j] += (c.s[j] - cam.s[j]) * f; }
          U.mB.value.fromArray(cam.m);
          U.sB.value.fromArray(cam.s.map((x, j) => Math.min(1.6 * ref.s[j], Math.max(0.5 * ref.s[j], x))));
        }
      }
    },
  };
}

// ── 화면 위 고정 자리에서(카메라 없이 고르기 · 다시 보기): 그 그림 자리 그대로 영상이 살아났다가 다시 그림이 된다
function inPlace(rect, then, onSkip) {
  const r = rect || centerRect();
  const el = document.createElement('div');
  el.className = 'v3-bloom';
  el.innerHTML = `<video playsinline muted autoplay preload="auto" src="${VIDEO}"></video>${onSkip ? '' : '<button class="bl-skip" type="button">건너뛰기</button>'}`;
  document.body.appendChild(el);
  const vid = el.querySelector('video');
  box(vid, r); vid.play().catch(() => {});
  vid.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: 'ease-out', fill: 'forwards' });
  setTimeout(() => el.classList.add('open'), 900);
  let over = false;
  const end = async () => {
    if (over) return; over = true; el.classList.remove('open');
    await vid.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: 'ease-in-out', fill: 'forwards' }).finished;
    el.remove(); then?.();
  };
  onSkip?.(end);
  vid.addEventListener('ended', end);
  el.querySelector('.bl-skip')?.addEventListener('click', end);
}

// ── 그림이 된 그 자리에서 → 페이지의 액자 자리로 옮겨 가며 카메라를 닫고 끝 줄
async function handoff(rect) {
  const r = rect || centerRect();
  const el = document.createElement('div');
  el.className = 'v3-bloom';
  el.innerHTML = `<div class="bl-bg"></div><img class="bl-paint" src="${PAINT}" alt="">`;
  document.body.appendChild(el);
  const paint = el.querySelector('.bl-paint'), bg = el.querySelector('.bl-bg');
  box(paint, r);
  await Promise.all([
    paint.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'forwards' }).finished,
    bg.animate([{ opacity: 0 }, { opacity: 0.92 }], { duration: 450, easing: 'ease-out', fill: 'forwards' }).finished,
  ]);
  closeCam();
  window.__c5sun.endNow();
  await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
  const to = frameRect() || r;
  const move = { duration: 1100, easing: EASE, fill: 'forwards' };
  paint.animate([kf(r), kf(to)], move);
  await bg.animate([{ opacity: 0.92 }, { opacity: 0 }], move).finished;
  await el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished;
  el.remove();
  finishMission();
}
// 11/03: 영상 ↔ 그림 전환이 한 바퀴 돌면 수집품 — 끝 줄 [목록으로 | 다음 미션(출구)] · 체험 더보기(연작 보기)
function finishMission() {
  mountEnd(document.getElementById('sunEndRow'), 'monet', { item: task.item, more: () => { document.body.classList.add('more'); const b = document.getElementById('toSeries'); if (b.getAttribute('aria-expanded') !== 'true') b.click(); } });
}
