// 카메라 인식 — MindAR 이미지 타깃(특징점). 앱의 AR 뷰어(kippu-app/web-ar/ar-viewer.html)와 같은 엔진·버전
// 타깃이 0.35초 이상 잡혀 있어야 found — 스쳐 지나가는 오인식을 거른다
// setup({ THREE, mindar, anchors }) 으로 인식한 그림 위 3D 효과를 붙일 수 있다(살롱 정답 그림). 반환값의 tick(t) 은 매 프레임
// center: 그림이 나란히 걸린 벽(살롱 · 모네 · 칼럼 전단지)은 화면 가운데에 있는 그림만 — 구석에 걸쳐 보이는 옆 그림은 잡지 않는다
//   그림 한가운데가 화면 가운데 42% 칸 안에 들어오면 그 그림, 52% 칸 밖으로 나가면 놓친 것(앱 AR 뷰어와 같은 기준).
//   여러 점이 함께 보여도 고를 수 있게 동시에 3점까지 추적하고, 칸 안에서 가장 가운데에 가까운 그림을 고른다
import * as THREE from 'three';

let cur = null;

export async function startScan(container, mindUrl, count, { onFound, onLost, onError, onReady, setup, center = false }) {
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
    for (let i = 0; i < count; i++) {
      const a = mindar.addAnchor(i);
      anchors.push(a);
      if (center) continue;                             // 가운데 판정은 아래 매 프레임에서
      a.onTargetFound = () => { clearTimeout(timer); timer = setTimeout(() => { shown = i; onFound(i); }, 350); };
      a.onTargetLost = () => { clearTimeout(timer); if (shown === i) { shown = -1; onLost?.(i); } };
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
        if (now - outT > 500) { const i = shown; shown = -1; outT = 0; onLost?.(i); }
      } else outT = 0;
      if (shown < 0 && want >= 0 && now - wantT > 350) { shown = want; onFound(want); }
    };
    const fx = setup ? setup({ THREE, mindar, anchors }) : null;
    await mindar.start();
    if (me.stopped) { await stopScan(me); return; }
    const { renderer, scene, camera } = mindar;
    const t0 = performance.now();
    renderer.setAnimationLoop(() => { if (center) centerTick(); me.fxTick?.((performance.now() - t0) / 1000); renderer.render(scene, camera); });
    me.fxTick = fx?.tick;
    onReady?.();
  } catch (e) {
    if (!me.stopped) onError?.(e);
  }
}

export async function stopScan(me = cur) {
  if (!me) return;
  me.stopped = true;
  if (cur === me) cur = null;
  try { me.mindar?.renderer.setAnimationLoop(null); me.mindar?.stop(); } catch {}
  me.container.innerHTML = '';
}
