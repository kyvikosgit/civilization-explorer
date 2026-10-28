// 소품 인식(입체 물체) — 학습한 물체 인식 모델(MediaPipe Object Detector, model/props.tflite)을 카메라 영상에 매 프레임 돌린다
// 화면에 잡힌 소품마다 점선 테두리, 가운데에 가장 가까운 하나는 포커스(밝은 점선이 돌고 이름표). 0.7초 머물면 인식
// MindAR(평면 그림)와 달리 각도·거리가 달라도 잡는다. 지금 모델은 대체 소품(공개 사진)으로 학습한 시험판 — 현장 소품으로 다시 학습하면 그대로 바뀐다
const TV = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const HOLD_MS = 700;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');

let detector = null, loading = null;
async function getDetector(modelUrl, scoreThreshold) {
  if (detector) return detector;
  loading ||= (async () => {
    const { FilesetResolver, ObjectDetector } = await import(`${TV}/vision_bundle.mjs`);
    const fs = await FilesetResolver.forVisionTasks(`${TV}/wasm`);
    const make = (delegate) => ObjectDetector.createFromOptions(fs, {
      baseOptions: { modelAssetPath: modelUrl, delegate }, runningMode: 'VIDEO', scoreThreshold, maxResults: 6,
    });
    try { detector = await make('GPU'); } catch { detector = await make('CPU'); }
    return detector;
  })();
  return loading;
}

let cur = null;
// o: { title, find, model, names: { 라벨: 표시 이름 }, onFound(label), onClose, threshold }
export function openDetect(o) {
  closeDetect();
  const root = document.createElement('div');
  root.className = 'v3-cam on det';
  root.innerHTML = `
    <div class="ar"><video playsinline muted autoplay></video><canvas></canvas></div>
    <div class="top"><button class="x" aria-label="닫기"><svg class="ico" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button><div class="t">${esc(o.title)}</div></div>
    <div class="msg det-msg">${esc(o.find)}</div>
    <div class="err"></div>
    <div class="det-load">인식 모델을 불러오는 중</div>`;
  document.body.appendChild(root);
  const me = { root, stop: false, stream: null, tracks: new Map(), focus: null, focusT: 0, fired: false };
  cur = me;
  const video = root.querySelector('video'), cv = root.querySelector('canvas'), g = cv.getContext('2d');
  root.querySelector('.x').onclick = () => { closeDetect(); o.onClose?.(); };
  const fail = (m) => { root.classList.add('failed'); root.querySelector('.err').textContent = m; };

  (async () => {
    try {
      me.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch (e) { return fail('카메라를 쓸 수 없습니다.\n브라우저 설정에서 카메라 권한을 허용해 주세요.'); }
    if (me.stop) return me.stream.getTracks().forEach((t) => t.stop());
    video.srcObject = me.stream;
    await video.play().catch(() => {});
    let det;
    try { det = await getDetector(o.model, o.threshold ?? 0.45); } catch (e) { return fail('인식 모델을 불러오지 못했습니다.'); }
    root.querySelector('.det-load').remove();
    let last = -1;
    const loop = () => {
      if (me.stop) return;
      requestAnimationFrame(loop);
      if (video.readyState < 2 || video.currentTime === last) return;
      last = video.currentTime;
      const res = det.detectForVideo(video, performance.now());
      draw(res.detections || []);
    };
    loop();
  })();

  // 영상 좌표 → 화면 좌표(object-fit: cover)
  function mapper() {
    const W = cv.clientWidth, H = cv.clientHeight, vw = video.videoWidth || 1, vh = video.videoHeight || 1;
    const s = Math.max(W / vw, H / vh), ox = (W - vw * s) / 2, oy = (H - vh * s) / 2;
    return (b) => ({ x: b.originX * s + ox, y: b.originY * s + oy, w: b.width * s, h: b.height * s });
  }

  function draw(dets) {
    const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const map = mapper(), now = performance.now(), seen = new Set();
    // 라벨마다 가장 높은 것 하나 — 부드럽게 따라가게(이전 자리와 섞는다)
    const best = new Map();
    for (const d of dets) { const c = d.categories?.[0]; if (!c || !o.names[c.categoryName]) continue; if (!best.has(c.categoryName) || best.get(c.categoryName).score < c.score) best.set(c.categoryName, { score: c.score, box: map(d.boundingBox) }); }
    for (const [k, v] of best) {
      const p = me.tracks.get(k), a = 0.45;
      me.tracks.set(k, p ? { ...v, box: { x: p.box.x + (v.box.x - p.box.x) * a, y: p.box.y + (v.box.y - p.box.y) * a, w: p.box.w + (v.box.w - p.box.w) * a, h: p.box.h + (v.box.h - p.box.h) * a }, t: now } : { ...v, t: now });
      seen.add(k);
    }
    for (const [k, v] of me.tracks) if (!seen.has(k) && now - v.t > 300) me.tracks.delete(k);   // 잠깐 놓친 건 0.3초 유지
    // 포커스 = 화면 가운데에 가장 가까운 것
    let fk = null, fd = Infinity;
    for (const [k, v] of me.tracks) { const cx = v.box.x + v.box.w / 2 - W / 2, cy = v.box.y + v.box.h / 2 - H * 0.45; const d = cx * cx + cy * cy; if (d < fd) { fd = d; fk = k; } }
    if (fk !== me.focus) { me.focus = fk; me.focusT = now; me.fired = false; }
    root.classList.toggle('has', !!fk);
    for (const [k, v] of me.tracks) {
      const f = k === fk, b = v.box, r = 10;
      g.lineWidth = f ? 3 : 1.5;
      g.setLineDash(f ? [10, 7] : [6, 6]);
      g.lineDashOffset = f ? -now / 40 : 0;                                  // 포커스는 점선이 돈다
      g.strokeStyle = f ? '#F2EDE2' : 'rgba(242,237,226,.45)';
      g.shadowColor = f ? 'rgba(233,199,122,.9)' : 'transparent'; g.shadowBlur = f ? 14 : 0;
      g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, r); g.stroke(); g.shadowBlur = 0;
      if (f) {
        // 이름표 + 머문 시간 막대
        const name = o.names[k], hold = Math.min(1, (now - me.focusT) / HOLD_MS);
        g.setLineDash([]); g.font = '700 15px Freesentation, sans-serif';
        const tw = g.measureText(name).width + 24, tx = Math.max(8, Math.min(W - tw - 8, b.x)), ty = Math.max(70, b.y - 36);
        g.fillStyle = 'rgba(10,12,11,.82)'; g.beginPath(); g.roundRect(tx, ty, tw, 28, 14); g.fill();
        g.fillStyle = '#F2EDE2'; g.fillText(name, tx + 12, ty + 19);
        g.fillStyle = '#E9C77A'; g.fillRect(tx + 12, ty + 24, (tw - 24) * hold, 2);
        if (hold >= 1 && !me.fired) { me.fired = true; navigator.vibrate?.(18); o.onFound(k); }
      }
    }
  }
  return { close: closeDetect };
}

export function closeDetect() {
  if (!cur) return;
  cur.stop = true;
  cur.stream?.getTracks().forEach((t) => t.stop());
  cur.root.remove();
  cur = null;
}
