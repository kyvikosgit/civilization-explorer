// 11/27 '탐사 도구' 카메라 — 조준점을 물건에 대면 그 물건 실루엣만 연두빛으로 칠해지고, 2.2초 비추면 인식
//   인식되는 순간 화면을 멈추고 그 물건을 실루엣 그대로 오려(누끼) 가운데로 띄운 뒤 → onFound(오린 그림 주소) — 다음 화면(수집 완료)으로 자연스럽게
//   분할 AI = YOLO11n-seg 320(tools/seg) · 실행 = onnxruntime-web CPU(wasm) 하나 — 그래픽 칩(WebGPU)은 메모리를 많이 써 폰에서 터짐(11/26)
//   앱 안(폰 안 묶음, file://) = 엔진을 묶음 안(design/_vendor/ort/)에서, 사이트 = CDN. 분석마다 새 그림 · 텐서를 만들지 않음(고정 버퍼), 인식 뒤 엔진을 내림
//   openSegScan({ model, name, title, find, onFound(cutUrl, rect), onClose })
const V3 = new URL('./', import.meta.url).href;
const ORT_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/';
const ORT_LOCAL = new URL('../_vendor/ort/', import.meta.url).href;
const S = 320, P = 80, NM = 32, DWELL = 2200;
const T = (s) => (window.M100_T ? window.M100_T(s) : s);

const CSS = `
.v3-seg{position:fixed;inset:0;z-index:8000;background:#000;color:#fff;font-family:Freesentation,-apple-system,sans-serif;word-break:keep-all}
.v3-seg video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.v3-seg canvas.fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.v3-seg .dim{position:absolute;inset:0;background:rgba(0,0,0,.62);opacity:0;transition:opacity .45s;pointer-events:none}
.v3-seg.caught .dim{opacity:1}
.v3-seg .top{position:absolute;left:0;right:0;top:0;padding:calc(env(safe-area-inset-top,0px)) 12px 0;height:calc(52px + env(safe-area-inset-top,0px));display:grid;grid-template-columns:40px 1fr 40px;align-items:center;background:linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,0));z-index:3;transition:opacity .3s}
.v3-seg .top button{width:40px;height:40px;border-radius:20px;border:0;background:none;color:#fff;display:grid;place-items:center}
.v3-seg .top svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.v3-seg .top b{text-align:center;font-size:16px;font-weight:700}
.v3-seg .ret{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;z-index:2;pointer-events:none;transition:transform .25s,opacity .3s}
.v3-seg .ret i{position:absolute;width:12px;height:12px;border:2px solid rgba(255,255,255,.85)}
.v3-seg .ret i:nth-child(1){left:0;top:0;border-right:0;border-bottom:0}.v3-seg .ret i:nth-child(2){right:0;top:0;border-left:0;border-bottom:0}
.v3-seg .ret i:nth-child(3){left:0;bottom:0;border-right:0;border-top:0}.v3-seg .ret i:nth-child(4){right:0;bottom:0;border-left:0;border-top:0}
.v3-seg .ret b{position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px;border-radius:50%;background:#fff}
.v3-seg .ret.on{transform:scale(.8)}.v3-seg .ret.on i{border-color:#bfe8b9}
.v3-seg .ring{position:absolute;left:50%;top:50%;width:64px;height:64px;margin:-32px 0 0 -32px;z-index:2;pointer-events:none;transition:opacity .3s}
.v3-seg .ring circle{fill:none;stroke:#bfe8b9;stroke-width:3;stroke-linecap:round;transform:rotate(-90deg);transform-origin:50% 50%}
.v3-seg .msg{position:absolute;left:16px;right:16px;bottom:calc(40px + env(safe-area-inset-bottom,0px));text-align:center;z-index:2;transition:opacity .3s}
.v3-seg .msg span{display:inline-block;background:rgba(0,0,0,.55);padding:10px 16px;border-radius:20px;font-size:15px;line-height:1.5;white-space:pre-line}
.v3-seg.caught .top,.v3-seg.caught .ret,.v3-seg.caught .ring,.v3-seg.caught .msg{opacity:0}
.v3-seg img.cut{position:absolute;max-width:none;max-height:none;z-index:4;pointer-events:none;filter:drop-shadow(0 0 14px rgba(214,245,207,.75)) drop-shadow(0 10px 20px rgba(0,0,0,.35));transform-origin:center;will-change:transform,left,top,width,height}
.v3-seg .wait{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:5;background:#000;font-size:15px;color:#bbb;text-align:center;padding:28px;line-height:1.6}
`;
let styled = false, ort = null, sess = null, cur = null;
function style() { if (styled) return; styled = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }

// 엔진 · 모델 열기 — 앱 안(file://)은 묶음 안 엔진부터, 안 되면 CDN. 모델은 직접 받아 바이트로 넘김(폰 안 파일 읽기 대체 경로와 같은 길)
async function makeSession(model) {
  const bytes = new Uint8Array(await (await fetch(model)).arrayBuffer());
  const bases = location.protocol === 'file:' ? [ORT_LOCAL, ORT_CDN] : [ORT_CDN];
  for (const b of bases) {
    try {
      const m = await import(b + 'ort.wasm.min.mjs'); m.env.wasm.wasmPaths = b; m.env.wasm.numThreads = 1;
      const s = await m.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      await s.run({ images: new m.Tensor('float32', new Float32Array(3 * S * S), [1, 3, S, S]) });   // 미리 한 번
      ort = m; return s;
    } catch (e) { console.warn('[seg] engine', b, e?.message || e); }
  }
  throw new Error('engine');
}
/** 화면을 열기 전에 엔진 · 모델을 미리(체험 화면이 뜰 때) — 카메라를 켤 때 기다리지 않게 */
export function preloadSeg(model) { if (!sess) sess = makeSession(model).catch(() => null); return sess; }

export function closeSegScan() { cur?.close(); }

export function openSegScan(o) {
  style(); if (cur) cur.close(true);
  const el = document.createElement('div'); el.className = 'v3-seg';
  el.innerHTML = `<video playsinline muted autoplay></video><canvas class="fx"></canvas><div class="dim"></div>
    <div class="top"><button type="button" aria-label="${T('닫기')}"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><b>${T(o.title || '')}</b><span></span></div>
    <div class="ret"><i></i><i></i><i></i><i></i><b></b></div>
    <svg class="ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" stroke-dasharray="176" stroke-dashoffset="176"/></svg>
    <div class="msg"><span></span></div><div class="wait">${T('카메라를 켜는 중…')}</div>`;
  document.body.appendChild(el);
  const $ = (q) => el.querySelector(q);
  const v = $('video'), fx = $('canvas.fx'), fxx = fx.getContext('2d'), ring = $('.ring circle'), msgEl = $('.msg span'), wait = $('.wait');
  const FIND = T(o.find || `조준점을 ${o.name}에 대 보세요`), BUSY = T('분석 중… 그대로 비춰 주세요');
  msgEl.textContent = FIND;
  const inp = document.createElement('canvas'); inp.width = inp.height = S; const ix = inp.getContext('2d', { willReadFrequently: true });
  const tensor = new Float32Array(3 * S * S), coef = new Float32Array(NM), lg80 = new Float32Array(P * P), al = new Float32Array(S * S);
  const mask = document.createElement('canvas'), glow = document.createElement('canvas'); mask.width = mask.height = glow.width = glow.height = S;
  const mc = mask.getContext('2d'), gc = glow.getContext('2d'), mImg = mc.createImageData(S, S), gImg = gc.createImageData(S, S);
  let W = 0, H = 0, dpr = Math.min(2, devicePixelRatio || 1), stream = null, stopped = false, analyzing = false, timer = 0, lastDt = 60, raf = 0;
  let inT = null, geo = null, hitT = 0, aimT = 0, prevHit = false, glowA = 0, caught = false, last = null;
  const size = () => { W = innerWidth; H = innerHeight; fx.width = W * dpr; fx.height = H * dpr; };
  size(); addEventListener('resize', size);
  const view = () => { const vw = v.videoWidth, vh = v.videoHeight, s = Math.max(W / vw, H / vh); return { sx: (vw - W / s) / 2, sy: (vh - H / s) / 2, sw: W / s, sh: H / s }; };

  const close = (silent) => {
    if (stopped && !silent) return; stopped = true; clearTimeout(timer); cancelAnimationFrame(raf); removeEventListener('resize', size);
    try { stream?.getTracks().forEach((t) => t.stop()); } catch {}
    el.remove(); if (cur === api) cur = null;
    Promise.resolve(sess).then((s) => { try { s?.release(); } catch {} }); sess = null;   // 엔진을 내려 메모리 반납(다음엔 새로)
    if (!silent) o.onClose?.();
  };
  $('.top button').addEventListener('click', () => close());
  const api = { close }; cur = api;

  async function analyzeOnce() {
    const s = await sess; if (!s || !v.videoWidth) { await new Promise((r) => setTimeout(r, 60)); return; }
    const t0 = performance.now(), r = view();
    const k = S / Math.max(W, H), lw = W * k, lh = H * k, px = (S - lw) / 2, py = (S - lh) / 2;
    ix.fillStyle = '#727272'; ix.fillRect(0, 0, S, S); ix.drawImage(v, r.sx, r.sy, r.sw, r.sh, px, py, lw, lh);
    const d = ix.getImageData(0, 0, S, S).data, n = S * S;
    for (let i = 0; i < n; i++) { tensor[i] = d[i * 4] / 255; tensor[i + n] = d[i * 4 + 1] / 255; tensor[i + 2 * n] = d[i * 4 + 2] / 255; }
    if (!inT) inT = new ort.Tensor('float32', tensor, [1, 3, S, S]);
    let out; try { out = await s.run({ images: inT }); } catch { return; }
    const o0 = out.output0.data, o1 = out.output1.data, N = out.output0.dims[2];
    try { out.output0.dispose?.(); out.output1.dispose?.(); } catch {}
    let best = -1, bs = 0.6;
    for (let j = 0; j < N; j++) { const sc = o0[4 * N + j]; if (sc > bs) { bs = sc; best = j; } }
    lastDt = performance.now() - t0;
    if (best < 0) { prevHit = false; return; }
    const bx = o0[best], by = o0[N + best], bw = o0[2 * N + best], bh = o0[3 * N + best], q = P / S, PP = P * P;
    for (let m = 0; m < NM; m++) coef[m] = o0[(5 + m) * N + best];
    const x0 = (bx - bw / 2) * q, x1 = (bx + bw / 2) * q, y0 = (by - bh / 2) * q, y1 = (by + bh / 2) * q;   // 실루엣은 물건 상자 안만(밖으로 번지면 가장자리에 세로 줄)
    for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
      const pi = y * P + x; let a = -12;
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) { a = 0; for (let m = 0; m < NM; m++) a += coef[m] * o1[m * PP + pi]; }
      lg80[pi] = a;
    }
    const M = 14, rx = Math.max(0, Math.floor(bx - bw / 2 - M)), ry = Math.max(0, Math.floor(by - bh / 2 - M));
    const rw = Math.min(S, Math.ceil(bx + bw / 2 + M)) - rx, rh = Math.min(S, Math.ceil(by + bh / 2 + M)) - ry;
    if (rw < 8 || rh < 8) return;
    const md = mImg.data, gq = gImg.data;
    for (let y = 0; y < rh; y++) { const fy = Math.min(P - 1.001, Math.max(0, (ry + y + 0.5) / 4 - 0.5)), y8 = fy | 0, ty = fy - y8;
      for (let x = 0; x < rw; x++) { const fxp = Math.min(P - 1.001, Math.max(0, (rx + x + 0.5) / 4 - 0.5)), x8 = fxp | 0, tx = fxp - x8, i = y8 * P + x8;
        const l = (lg80[i] * (1 - tx) + lg80[i + 1] * tx) * (1 - ty) + (lg80[i + P] * (1 - tx) + lg80[i + P + 1] * tx) * ty;
        const p = 1 / (1 + Math.exp(-l)), t = Math.min(1, Math.max(0, (p - 0.3) / 0.4)), a = t * t * (3 - 2 * t);
        const ai = (ry + y) * S + rx + x; al[ai] = a; const oo = ai * 4;
        md[oo] = md[oo + 1] = md[oo + 2] = 255; md[oo + 3] = a * 255;
        gq[oo] = 191; gq[oo + 1] = 232; gq[oo + 2] = 185; gq[oo + 3] = a * 120; } }
    fillHoles(rx, ry, rw, rh);
    mc.putImageData(mImg, 0, 0, rx, ry, rw, rh); gc.putImageData(gImg, 0, 0, rx, ry, rw, rh);
    geo = { x: rx, y: ry, w: rw, h: rh, px, py, k, r, lw, lh };
    const cx = Math.round(W / 2 * k + px) - rx, cy = Math.round(H / 2 * k + py) - ry;
    const h1 = cx >= 0 && cy >= 0 && cx < rw && cy < rh && al[(ry + cy) * S + rx + cx] > 0.5;
    const hit = h1 && prevHit; prevHit = h1;
    if (hit) { hitT = performance.now(); last = geo; }
  }
  const seen = new Uint8Array(S * S), stack = new Int32Array(S * S), bA = new Uint8Array(S * S), bB = new Uint8Array(S * S);
  // 실루엣 다듬기 — 닫힘(팽창 → 침식, 반지름 R)으로 가장자리 틈을 막은 뒤, 바깥에서 닿지 않는 빈 칸(밝은 물감 · 화구)을 채움
  function morph(src, dst, rw, rh, r, isMax) {   // 가로 · 세로 최대(팽창) / 최소(침식)
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) { let v = isMax ? 0 : 1; for (let d = -r; d <= r; d++) { const xx = x + d; const u = xx < 0 || xx >= rw ? 0 : src[y * rw + xx]; v = isMax ? (u > v ? u : v) : (u < v ? u : v); } bB[y * rw + x] = v; }
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) { let v = isMax ? 0 : 1; for (let d = -r; d <= r; d++) { const yy = y + d; const u = yy < 0 || yy >= rh ? 0 : bB[yy * rw + x]; v = isMax ? (u > v ? u : v) : (u < v ? u : v); } dst[y * rw + x] = v; }
  }
  function fillHoles(rx, ry, rw, rh) {
    const R = 5;
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) bA[y * rw + x] = al[(ry + y) * S + rx + x] >= 0.5 ? 1 : 0;
    const cl = new Uint8Array(rw * rh); morph(bA, cl, rw, rh, R, true); morph(cl, cl, rw, rh, R, false);
    let sp = 0; seen.fill(0, 0, rw * rh);
    const push = (x, y) => { const i = y * rw + x; if (!seen[i] && !cl[i]) { seen[i] = 1; stack[sp++] = i; } };
    for (let x = 0; x < rw; x++) { push(x, 0); push(x, rh - 1); }
    for (let y = 0; y < rh; y++) { push(0, y); push(rw - 1, y); }
    while (sp) { const c = stack[--sp], x = c % rw, y = (c / rw) | 0; if (x > 0) push(x - 1, y); if (x < rw - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < rh - 1) push(x, y + 1); }
    const md = mImg.data, gq = gImg.data;
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) { const j = y * rw + x, i = (ry + y) * S + rx + x; if (!seen[j] && al[i] < 0.5) { al[i] = 1; md[i * 4 + 3] = 255; gq[i * 4 + 3] = 120; } }
  }
  async function analyze() {
    if (stopped || caught || analyzing || document.hidden) return;
    analyzing = true; try { await analyzeOnce(); } finally { analyzing = false; }
    if (stopped || caught) return;
    clearTimeout(timer); timer = setTimeout(analyze, Math.max(33, lastDt * 1.5));   // 폰 속도에 맞춤
  }
  const onVis = () => { if (!document.hidden && !stopped && !caught) { clearTimeout(timer); analyze(); } };
  document.addEventListener('visibilitychange', onVis);

  function frame() {
    if (stopped) return; raf = requestAnimationFrame(frame);
    const now = performance.now(), on = now - hitT < 500;
    glowA += ((on ? 1 : 0) - glowA) * 0.2;
    $('.ret').classList.toggle('on', on);
    if (!caught) {
      if (on) { if (!aimT) aimT = now; } else aimT = 0;
      const p = aimT ? Math.min(1, (now - aimT) / DWELL) : 0;
      ring.setAttribute('stroke-dashoffset', String(176 * (1 - p)));
      const mt = p > 0 ? BUSY : FIND; if (msgEl.textContent !== mt) msgEl.textContent = mt;
      if (p >= 1 && last) catchIt();
    }
    fxx.setTransform(dpr, 0, 0, dpr, 0, 0); fxx.globalCompositeOperation = 'source-over'; fxx.globalAlpha = 1; fxx.clearRect(0, 0, W, H);
    if (glowA < 0.02 || !geo || caught) return;
    const g = geo, gx = (g.x - g.px) / g.k, gy = (g.y - g.py) / g.k, gw = g.w / g.k, gh = g.h / g.k;
    const t = now / 1000, y = H * ((t * 0.55) % 1.3 - 0.15), grd = fxx.createLinearGradient(0, y - 60, 0, y + 60);
    grd.addColorStop(0, 'rgba(214,245,207,0)'); grd.addColorStop(0.5, 'rgba(214,245,207,.32)'); grd.addColorStop(1, 'rgba(214,245,207,0)');
    fxx.fillStyle = grd; fxx.fillRect(gx, Math.max(gy, y - 60), gw, Math.max(0, Math.min(gy + gh, y + 60) - Math.max(gy, y - 60)));
    fxx.imageSmoothingEnabled = true; fxx.imageSmoothingQuality = 'high';
    fxx.globalCompositeOperation = 'destination-in'; fxx.drawImage(mask, g.x, g.y, g.w, g.h, gx, gy, gw, gh);
    fxx.globalCompositeOperation = 'source-over'; fxx.globalAlpha = glowA; fxx.drawImage(glow, g.x, g.y, g.w, g.h, gx, gy, gw, gh); fxx.globalAlpha = 1;
  }

  // 인식 — 화면을 멈추고 물건을 실루엣대로 오려 가운데로 띄운 뒤 onFound
  function catchIt() {
    caught = true; clearTimeout(timer); navigator.vibrate?.([18, 50, 24]);
    const g = last, r = g.r, sc = r.sw / g.lw;                  // 모델 칸 1 = 영상 sc 화소
    const vx = r.sx + (g.x - g.px) * sc, vy = r.sy + (g.y - g.py) * sc, vw = g.w * sc, vh = g.h * sc;
    const out = document.createElement('canvas'); out.width = Math.max(1, Math.round(vw)); out.height = Math.max(1, Math.round(vh));
    const ox = out.getContext('2d'); ox.drawImage(v, vx, vy, vw, vh, 0, 0, out.width, out.height);
    const cm = document.createElement('canvas'); cm.width = g.w; cm.height = g.h; const cx2 = cm.getContext('2d'), cd = cx2.createImageData(g.w, g.h);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const a = al[(g.y + y) * S + g.x + x], o2 = (y * g.w + x) * 4; cd.data[o2 + 3] = Math.max(0, Math.min(255, (a - 0.4) / 0.2 * 255)); }
    cx2.putImageData(cd, 0, 0);
    ox.globalCompositeOperation = 'destination-in'; ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = 'high';
    ox.drawImage(cm, 0, 0, g.w, g.h, 0, 0, out.width, out.height);
    let url = ''; try { url = out.toDataURL('image/png'); } catch {}
    try { v.pause(); } catch {}
    el.classList.add('caught'); fxx.clearRect(0, 0, W, H);
    const sx = (g.x - g.px) / g.k, sy = (g.y - g.py) / g.k, sw = g.w / g.k, sh = g.h / g.k;
    const img = document.createElement('img'); img.className = 'cut'; img.alt = '';
    Object.assign(img.style, { left: sx + 'px', top: sy + 'px', width: sw + 'px', height: sh + 'px' });
    if (url) { img.src = url; el.appendChild(img); }
    // 가운데로(수집 완료 화면의 큰 카드 자리 쯤)
    const tw = Math.min(W * 0.62, 300), k2 = tw / sw, th = sh * k2, tx = (W - tw) / 2, ty = Math.max(90, H * 0.2);
    setTimeout(() => {
      img.animate([{ left: sx + 'px', top: sy + 'px', width: sw + 'px', height: sh + 'px' }, { left: tx + 'px', top: ty + 'px', width: tw + 'px', height: th + 'px' }],
        { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    }, 380);
    setTimeout(() => {
      Promise.resolve(sess).then((s) => { try { s?.release(); } catch {} }); sess = null;
      try { stream?.getTracks().forEach((t) => t.stop()); } catch {}
      o.onFound?.(url);
      // 다음 화면이 덮은 뒤 걷음
      setTimeout(() => { stopped = true; cancelAnimationFrame(raf); el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }); setTimeout(() => { el.remove(); if (cur === api) cur = null; }, 320); document.removeEventListener('visibilitychange', onVis); removeEventListener('resize', size); }, 450);
    }, 1350);
  }

  (async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 960 }, height: { ideal: 540 } }, audio: false });
      if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
      v.srcObject = stream; await v.play();
    } catch (e) {
      wait.textContent = T('카메라를 켜지 못했습니다. 카메라 사용을 허용해 주세요.'); return;
    }
    if (!sess) preloadSeg(o.model);
    const s = await sess;
    if (stopped) return;
    if (!s) { wait.textContent = T('네트워크를 확인해 주세요'); return; }
    wait.remove(); raf = requestAnimationFrame(frame); analyze();
  })();
  return api;
}
