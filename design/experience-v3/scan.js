// 카메라 인식 — MindAR 이미지 타깃(특징점). 앱의 AR 뷰어(kippu-app/web-ar/ar-viewer.html)와 같은 엔진·버전
// 타깃이 0.35초 이상 잡혀 있어야 found — 스쳐 지나가는 오인식을 거른다
// setup({ THREE, mindar, anchors }) 으로 인식한 그림 위 3D 효과를 붙일 수 있다(살롱 정답 그림). 반환값의 tick(t) 은 매 프레임
import * as THREE from 'three';

let cur = null;

export async function startScan(container, mindUrl, count, { onFound, onLost, onError, setup }) {
  await stopScan();
  const me = { stopped: false, container };
  cur = me;
  try {
    const { MindARThree } = await import('mindar-image-three');
    if (me.stopped) return;
    const mindar = new MindARThree({
      container, imageTargetSrc: mindUrl, maxTrack: 1,
      uiScanning: 'no', uiLoading: 'no', filterMinCF: 0.0001, filterBeta: 0.001,
    });
    me.mindar = mindar;
    const anchors = [];
    let timer = 0, shown = -1;
    for (let i = 0; i < count; i++) {
      const a = mindar.addAnchor(i);
      anchors.push(a);
      a.onTargetFound = () => { clearTimeout(timer); timer = setTimeout(() => { shown = i; onFound(i); }, 350); };
      a.onTargetLost = () => { clearTimeout(timer); if (shown === i) { shown = -1; onLost?.(i); } };
    }
    const fx = setup ? setup({ THREE, mindar, anchors }) : null;
    await mindar.start();
    if (me.stopped) { await stopScan(me); return; }
    const { renderer, scene, camera } = mindar;
    const t0 = performance.now();
    renderer.setAnimationLoop(() => { me.fxTick?.((performance.now() - t0) / 1000); renderer.render(scene, camera); });
    me.fxTick = fx?.tick;
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
