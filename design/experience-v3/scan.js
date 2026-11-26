// 카메라 인식 — MindAR 이미지 타깃(특징점). 앱의 AR 뷰어(kippu-app/web-ar/ar-viewer.html)와 같은 엔진·버전
// 타깃이 0.35초 이상 잡혀 있어야 found — 스쳐 지나가는 오인식을 거른다
// setup({ THREE, mindar, anchors }) 으로 인식한 그림 위 3D 효과를 붙일 수 있다(살롱 정답 그림). 반환값의 tick(t) 은 매 프레임
// center: 그림이 나란히 걸린 벽(살롱 · 모네 · 칼럼 전단지)은 화면 가운데에 있는 그림만 — 구석에 걸쳐 보이는 옆 그림은 잡지 않는다
//   그림 한가운데가 화면 가운데 42% 칸 안에 들어오면 그 그림, 52% 칸 밖으로 나가면 놓친 것(앱 AR 뷰어와 같은 기준).
//   여러 점이 함께 보여도 고를 수 있게 동시에 3점까지 추적하고, 칸 안에서 가장 가운데에 가까운 그림을 고른다
import * as THREE from 'three';

let cur = null;
// MindAR 는 카메라를 못 켜면 이유 없이 실패한다(reject()) — 카메라 요청의 실제 오류(권한 거부 등)를 붙잡아 두었다가 넘긴다
let lastCamErr = null;
const md = navigator.mediaDevices;
if (md?.getUserMedia && !md.__m100wrap) {
  const gum = md.getUserMedia.bind(md);
  md.getUserMedia = (c) => { lastCamErr = null; return gum(c).catch((e) => { lastCamErr = e; throw e; }); };
  md.__m100wrap = true;
}

// 11/26 하이라이트: 잡힌 물체(전단지 · 기차표) 둘레에 빛나는 테두리가 그 물체에 붙어 그려지고 안쪽이 한 번 밝아진 뒤(약 0.9초) 다음으로 — QR 처럼 바로 넘어가지 않게
function makeHighlight(anchors, dims) {
  const items = anchors.map((a, i) => {
    const d = dims && dims[i], r = d ? d[1] / d[0] : 1;
    const g = new THREE.Group(); g.visible = false; g.renderOrder = 999;
    const mat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthTest: false, depthWrite: false });
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(1, r), mat(0xffffff, 0)); g.add(fill);
    const edge = [], glow = [];
    const bar = (w, h, x, y, arr, c, o) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(c, o)); m.position.set(x, y, 0.001); g.add(m); arr.push(m); };
    for (const [t, arr, c] of [[0.05, glow, 0xd8ecd4], [0.014, edge, 0xffffff]]) {
      bar(1 + t, t, 0, r / 2, arr, c, 0); bar(1 + t, t, 0, -r / 2, arr, c, 0);
      bar(t, r + t, -0.5, 0, arr, c, 0); bar(t, r + t, 0.5, 0, arr, c, 0);
    }
    a.group.add(g);
    return { g, fill, edge, glow, t0: 0, cb: null, timer: 0 };
  });
  return {
    start(i, cb) {
      const h = items[i]; if (!h) { cb(); return; }
      h.g.visible = true; h.t0 = performance.now(); clearTimeout(h.timer);
      h.timer = setTimeout(() => cb(), 900);
    },
    stop(i) { const h = items[i]; if (!h) return; clearTimeout(h.timer); h.g.visible = false; h.t0 = 0; },
    tick() {
      const now = performance.now();
      for (const h of items) {
        if (!h.g.visible || !h.t0) continue;
        const t = (now - h.t0) / 1000, p = Math.min(1, t / 0.45), e = 1 - Math.pow(1 - p, 3);
        h.g.scale.setScalar(1.1 - 0.1 * e);                                   // 살짝 크게 나타나 물체 테두리에 딱 맞게 붙음
        h.edge.forEach((m) => (m.material.opacity = e));
        h.glow.forEach((m) => (m.material.opacity = 0.55 * e * (0.75 + 0.25 * Math.sin(t * 6))));   // 은은히 숨 쉬는 바깥 빛
        h.fill.material.opacity = t < 0.9 ? 0.22 * Math.sin(Math.min(1, t / 0.9) * Math.PI) : 0;   // 안쪽이 한 번 밝아졌다 가라앉음
      }
    },
  };
}

export async function startScan(container, mindUrl, count, { onFound, onLost, onError, onReady, setup, center = false, highlight = false }) {
  await stopScan();
  const me = { stopped: false, container };
  cur = me;
  try {
    const { MindARThree } = await import('mindar-image-three');
    if (me.stopped) return;
    const mindar = new MindARThree({
      container, imageTargetSrc: mindUrl, maxTrack: center ? Math.min(3, count) : 1,
      uiScanning: 'no', uiLoading: 'no', filterMinCF: 0.0001, filterBeta: 0.001,
    });
    me.mindar = mindar;
    const anchors = [];
    let timer = 0, shown = -1;
    let hl = null;
    const fire = (i) => (hl ? hl.start(i, () => { if (shown === i) onFound(i); }) : onFound(i));
    for (let i = 0; i < count; i++) {
      const a = mindar.addAnchor(i);
      anchors.push(a);
      if (center) continue;                             // 가운데 판정은 아래 매 프레임에서
      a.onTargetFound = () => { clearTimeout(timer); timer = setTimeout(() => { shown = i; fire(i); }, 350); };
      a.onTargetLost = () => { clearTimeout(timer); hl?.stop(i); if (shown === i) { shown = -1; onLost?.(i); } };
    }
    // 가운데 판정: 보이는 그림마다 한가운데를 화면에 투영해 칸 안인지 본다
    const v = new THREE.Vector3();
    let want = -1, wantT = 0, outT = 0;
    const pick = () => {
      let best = -1, bd = Infinity, keep = false;
      anchors.forEach((a, i) => {
        if (!a.group.visible) return;
        v.setFromMatrixPosition(a.group.matrixWorld).project(mindar.camera);
        const dx = Math.abs(v.x) / 2, dy = Math.abs(v.y) / 2;          // 화면 가운데에서 떨어진 정도(0 = 가운데, 0.5 = 가장자리)
        if (i === shown && dx < 0.26 && dy < 0.26) keep = true;          // 52% 칸 안이면 지금 그림을 유지
        if (dx < 0.21 && dy < 0.21) { const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = i; } }   // 42% 칸 안에서 가장 가운데
      });
      return keep ? shown : best;
    };
    const centerTick = () => {
      const now = performance.now(), p = pick();
      if (p !== want) { want = p; wantT = now; }
      if (shown >= 0 && p !== shown) {                                  // 지금 그림이 칸을 벗어남 — 0.5초 유예
        if (!outT) outT = now;
        if (now - outT > 500) { const i = shown; shown = -1; outT = 0; hl?.stop(i); onLost?.(i); }
      } else outT = 0;
      if (shown < 0 && want >= 0 && now - wantT > 350) { shown = want; fire(want); }
    };
    const fx = setup ? setup({ THREE, mindar, anchors }) : null;
    await mindar.start();
    if (me.stopped) { await stopScan(me); return; }
    if (highlight) { try { hl = makeHighlight(anchors, mindar.controller?.markerDimensions); } catch (e) { hl = null; } }
    const { renderer, scene, camera } = mindar;
    const t0 = performance.now();
    renderer.setAnimationLoop(() => { if (center) centerTick(); hl?.tick(); me.fxTick?.((performance.now() - t0) / 1000); renderer.render(scene, camera); });
    me.fxTick = fx?.tick;
    onReady?.();
  } catch (e) {
    if (!me.stopped) onError?.(e || lastCamErr || (navigator.mediaDevices?.getUserMedia ? new Error('camera start failed') : Object.assign(new Error('camera API unavailable'), { name: 'NotSupportedError' })));
  }
}

export async function stopScan(me = cur) {
  if (!me) return;
  me.stopped = true;
  if (cur === me) cur = null;
  try { me.mindar?.renderer.setAnimationLoop(null); me.mindar?.stop(); } catch {}
  me.container.innerHTML = '';
}
