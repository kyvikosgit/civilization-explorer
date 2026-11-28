// 11/27 '탐사 도구' 카메라 — 조준점을 물건에 대면 그 물건 실루엣만 연두빛으로 칠해지고, 2.2초 비추면 인식
//   인식되는 순간 화면을 멈추고 그 물건을 실루엣 그대로 오려(누끼) 가운데로 띄운 뒤 → onFound(오린 그림 주소) — 다음 화면(수집 완료)으로 자연스럽게
//   분할 AI = YOLO11n-seg 320(tools/seg) · 실행 = onnxruntime-web CPU(wasm) 하나 — 그래픽 칩(WebGPU)은 메모리를 많이 써 폰에서 터짐(11/26)
//   앱 안(폰 안 묶음, file://) = 엔진을 묶음 안(design/_vendor/ort/)에서, 사이트 = CDN. 분석마다 새 그림 · 텐서를 만들지 않음(고정 버퍼), 인식 뒤 엔진을 내림
//   openSegScan({ model, name, title, find, onFound(cutUrl, rect, teardown), onClose, lift })
const V3 = new URL('./', import.meta.url).href;
const ORT_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/';
const ORT_LOCAL = new URL('../_vendor/ort/', import.meta.url).href;
const S = 320, P = 80, NM = 32, DWELL = 1200;   // 11/27 2.2초 → 1.2초(사용자: 너무 김)
const T = (s) => (window.M100_T ? window.M100_T(s) : s);

const CSS = `
.v3-seg{position:fixed;inset:0;z-index:8000;background:#000;color:#fff;font-family:Freesentation,-apple-system,sans-serif;word-break:keep-all}
.v3-seg video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.v3-seg canvas.gl{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.v3-seg.pickmode .ret,.v3-seg.pickmode .ring{display:none!important}   /* 11/28 조준점 없이(다른 스캔과 같게) */
.v3-seg canvas.fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.v3-seg .dim{position:absolute;inset:0;background:rgba(0,0,0,.62);opacity:0;transition:opacity .45s;pointer-events:none}
.v3-seg.caught .dim{opacity:1}
.v3-seg .top{position:absolute;left:0;right:0;top:0;box-sizing:border-box;color:#fff;padding:env(safe-area-inset-top,0px) 12px 0;height:calc(52px + env(safe-area-inset-top,0px));display:grid;grid-template-columns:40px 1fr 40px;align-items:center;background:linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,0));z-index:3;transition:opacity .3s}
.v3-seg .top button{width:40px;height:40px;padding:0;margin:0;border-radius:20px;border:0;background:none;color:#fff;display:grid;place-items:center}
.v3-seg .top svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.v3-seg .top b{text-align:center;font-size:19px;font-weight:700;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}   /* 11/28 공통 위 막대 */
.v3-seg .ret{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;z-index:2;pointer-events:none;transition:transform .25s,opacity .3s}
.v3-seg .ret i{position:absolute;width:12px;height:12px;border:2px solid rgba(255,255,255,.85)}
.v3-seg .ret i:nth-child(1){left:0;top:0;border-right:0;border-bottom:0}.v3-seg .ret i:nth-child(2){right:0;top:0;border-left:0;border-bottom:0}
.v3-seg .ret i:nth-child(3){left:0;bottom:0;border-right:0;border-top:0}.v3-seg .ret i:nth-child(4){right:0;bottom:0;border-left:0;border-top:0}
.v3-seg .ret b{position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px;border-radius:50%;background:#fff}
.v3-seg .ret.on{transform:scale(.8)}.v3-seg .ret.on i{border-color:#bfe8b9}
.v3-seg .ring{display:none;position:absolute;left:50%;top:50%;width:64px;height:64px;margin:-32px 0 0 -32px;z-index:2;pointer-events:none;transition:opacity .3s}
.v3-seg .ring circle{fill:none;stroke:#bfe8b9;stroke-width:3;stroke-linecap:round;transform:rotate(-90deg);transform-origin:50% 50%}
.v3-seg .msg{display:none;position:absolute;left:16px;right:16px;bottom:calc(env(safe-area-inset-bottom,0px) + 32px);text-align:center;z-index:2;transition:opacity .3s}
.v3-seg .msg span{display:inline-block;max-width:100%;box-sizing:border-box;background:rgba(20,16,13,.6);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);padding:10px 18px;border-radius:20px;font-size:15px;font-weight:500;line-height:1.45;white-space:pre-line;word-break:keep-all}
.v3-seg.caught .top,.v3-seg.caught .ret,.v3-seg.caught .ring,.v3-seg.caught .msg{opacity:0}
.v3-seg img.cut{position:absolute;max-width:none;max-height:none;z-index:4;pointer-events:none;filter:drop-shadow(0 0 14px rgba(214,245,207,.75)) drop-shadow(0 10px 20px rgba(0,0,0,.35));transform-origin:center;will-change:transform,left,top,width,height}
.v3-seg .wait{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;z-index:2;background:#0E0C0A;font-size:15px;line-height:1.5;color:rgba(242,237,226,.72);text-align:center;padding:0 32px;white-space:pre-line;word-break:keep-all}   /* 11/28 체험 카메라 공통 로딩 화면(위 막대는 그대로) */
.v3-seg .wait::before{content:'';width:34px;height:34px;box-sizing:border-box;border-radius:50%;border:2.5px solid rgba(242,237,226,.14);border-top-color:#E9C77B;animation:m100spin .9s linear infinite}
.v3-seg .wait.fail::before{display:none}
@keyframes m100spin{to{transform:rotate(360deg)}}
/* 11/28 살롱 · 전단지 스캔과 같은 아래 설명 카드 · [선택] · 안내 줄(o.pick 일 때) */
.v3-seg .pick{position:fixed;left:0;right:0;bottom:0;z-index:8;padding:16px 20px calc(18px + env(safe-area-inset-bottom,0px));display:flex;justify-content:center;opacity:0;transform:translateY(16px);transition:opacity .35s,transform .35s cubic-bezier(.2,.8,.2,1);pointer-events:none}
.v3-seg .pick.on{opacity:1;transform:none;pointer-events:auto}
.v3-seg .card{position:fixed;left:16px;right:16px;bottom:calc(env(safe-area-inset-bottom,0px) + 32px);z-index:7;max-width:420px;margin:0 auto;box-sizing:border-box;display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;background:rgba(20,16,13,.8);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 10px 30px rgba(0,0,0,.35);opacity:0;transform:translateY(12px);transition:opacity .3s,transform .35s cubic-bezier(.2,.8,.2,1),bottom .35s cubic-bezier(.2,.8,.2,1);pointer-events:none}
.v3-seg .card.on{opacity:1;transform:none}
.v3-seg .card{flex-wrap:wrap}
.v3-seg .card .r{flex-basis:100%;margin:2px 0 0;padding-top:12px;border-top:1px solid rgba(242,237,226,.12);font-family:'Gowun Batang',serif;font-size:14.5px;line-height:1.7;color:rgba(242,237,226,.84);word-break:keep-all}   /* 11/28 오답 = 그 그림의 심사평(당선작이 아닌 이유) */
.v3-seg .card .r:empty,.v3-seg .card .n:empty,.v3-seg .card .v.off{display:none}
.v3-seg .card .k{display:none;margin:0 0 2px;font-family:'Gowun Batang',serif;font-size:12.5px;font-weight:700;letter-spacing:.08em;color:#E9C77B}
.v3-seg .card.win{border:1px solid rgba(233,199,123,.6);background:linear-gradient(180deg,rgba(74,54,24,.92) 0%,rgba(28,22,15,.9) 46%,rgba(20,16,13,.9) 100%);box-shadow:0 0 0 1px rgba(0,0,0,.25),0 14px 36px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,232,180,.25)}
.v3-seg .card.win .ct{padding-right:34px}
.v3-seg .card .n{flex-basis:100%;margin:0;font-size:14px;font-weight:600;color:rgba(242,237,226,.7)}
.v3-seg .card.up{bottom:calc(env(safe-area-inset-bottom,0px) + 104px)}
.v3-seg .card img{flex:none;width:58px;height:58px;object-fit:cover;border-radius:3px;box-shadow:0 0 0 2px #B08A45,0 0 0 3px rgba(0,0,0,.4)}
.v3-seg .card .ct{min-width:0;display:flex;flex-direction:column;gap:3px}
.v3-seg .card b{font-family:'Gowun Batang',serif;font-weight:700;font-size:17px;line-height:1.35;color:#F2EDE2;word-break:keep-all}
.v3-seg .card small{font-family:'Gowun Batang',serif;font-size:13.5px;color:rgba(242,237,226,.66);letter-spacing:.01em}
.v3-seg .card .v{margin-top:4px;font-size:14px;font-weight:500;color:rgba(242,237,226,.78)}   /* 11/28 아이콘 없이 글 한 줄 */
.v3-seg .card.win .v{color:#E9C77B}
.v3-seg .pick{bottom:0}
.v3-seg .pick button{width:100%;max-width:400px;box-sizing:border-box;min-height:56px;border:0;border-radius:12px;background:#F2EDE2;color:#141210;font:700 17px Freesentation,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.v3-seg.pickmode .msg{display:block}
.v3-seg .card{z-index:6}.v3-seg .pick{z-index:6}
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
  el.innerHTML = `<video playsinline muted autoplay></video><canvas class="gl"></canvas><canvas class="fx"></canvas><div class="dim"></div>
    <div class="top"><button type="button" aria-label="${T('닫기')}"><svg viewBox="0 0 24 24"><path d="M15.375 5.25L8.625 12l6.75 6.75" style="stroke-width:2.25"/></svg></button><b>${T(({ '에트르타': '화가의 작업 공간' })[String(o.title || '').split(' · ')[0]] || String(o.title || '').split(' · ')[0])}</b><span></span></div>
    <div class="ret"><i></i><i></i><i></i><i></i><b></b></div>
    <svg class="ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" stroke-dasharray="176" stroke-dashoffset="176"/></svg>
    <div class="msg"><span></span></div><div class="wait">${T('카메라를 켜고 있어요')}</div>
    ${o.pick ? `<div class="card win up"><img src="${o.pick.img}" alt=""><div class="ct"><p class="k">${T(o.pick.kicker || '')}</p><b>${T(o.pick.title || '')}</b><small>${T(o.pick.sub || '')}</small></div><p class="r">${T(o.pick.desc || '')}</p></div><div class="pick"><button type="button">${T('선택')}</button></div>` : ''}`;
  if (o.pick) { el.classList.add('pickmode'); if (!document.querySelector('link[href*="Gowun+Batang"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap'; document.head.appendChild(l); } }
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
  let inT = null, geo = null, hitT = 0, aimT = 0, prevHit = false, glowA = 0, caught = false, last = null, prog = 0, ready = false, readyA = 0;
  const lineCv = document.createElement('canvas'), lc = lineCv.getContext('2d');
  const size = () => { W = innerWidth; H = innerHeight; fx.width = W * dpr; fx.height = H * dpr; lineCv.width = W; lineCv.height = H; };
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
    const x0 = (bx - bw / 2) * q - 1, x1 = (bx + bw / 2) * q + 1, y0 = (by - bh / 2) * q - 1, y1 = (by + bh / 2) * q + 1;   // 실루엣은 물건 상자 + 한 칸(넓으면 가장자리 줄 · 좁으면 물건이 잘림)
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
    // 물건이 화면 안에 다 들어왔는가(가장자리에 걸리면 오린 그림이 잘림 → 다 들어올 때까지 인식을 끝내지 않음)
    const E = 3, full = bx - bw / 2 > px + E && bx + bw / 2 < px + lw - E && by - bh / 2 > py + E && by + bh / 2 < py + lh - E;
    geo = { x: rx, y: ry, w: rw, h: rh, px, py, k, r, lw, lh, full, b: [(bx - bw / 2 - px) / k, (by - bh / 2 - py) / k, bw / k, bh / k] };
    const cx = Math.round(W / 2 * k + px) - rx, cy = Math.round(H / 2 * k + py) - ry;
    const h1 = o.pick ? true : (cx >= 0 && cy >= 0 && cx < rw && cy < rh && al[(ry + cy) * S + rx + cx] > 0.5);   // 11/28 pick: 화면 어디서든 잡히면
    if (o.pick && h1) distField(rx, ry, rw, rh, Math.max(bw, bh));
    const hit = h1 && prevHit; prevHit = h1;
    if (hit) { hitT = performance.now(); if (full || !last) last = geo; }
  }
  // ── 11/28 살롱 · 전단지와 같은 오라 셰이더(WebGL) — 실루엣 바깥 거리장(거리 = 물건 긴 변 단위)을 매번 올려 그 둘레에 금빛이 일렁이며 번짐
  const DR = 128, dist = new Float32Array(S * S), dtex = new Uint8Array(S * S);
  let glOK = false, gl = null, gprog = null, gtex = null, Ugeo = null, Ut = null, Uop = null, Uscr = null, Ulen = 1, Uc = null, gcen = [0, 0];
  function distField(rx, ry, rw, rh, L) {   // 2패스 근사 거리(칸 단위): 안 = 0, 바깥 = 가까운 실루엣까지
    const pad = 70, x0 = Math.max(0, rx - pad), y0 = Math.max(0, ry - pad), x1 = Math.min(S, rx + rw + pad), y1 = Math.min(S, ry + rh + pad), INF = 1e4;
    dist.fill(INF);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (al[y * S + x] > 0.5) dist[y * S + x] = 0;
    const A = 1, B = 1.4142;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = y * S + x; let d = dist[i]; if (x > x0) d = Math.min(d, dist[i - 1] + A); if (y > y0) { d = Math.min(d, dist[i - S] + A); if (x > x0) d = Math.min(d, dist[i - S - 1] + B); if (x < x1 - 1) d = Math.min(d, dist[i - S + 1] + B); } dist[i] = d; }
    for (let y = y1 - 1; y >= y0; y--) for (let x = x1 - 1; x >= x0; x--) { const i = y * S + x; let d = dist[i]; if (x < x1 - 1) d = Math.min(d, dist[i + 1] + A); if (y < y1 - 1) { d = Math.min(d, dist[i + S] + A); if (x < x1 - 1) d = Math.min(d, dist[i + S + 1] + B); if (x > x0) d = Math.min(d, dist[i + S - 1] + B); } dist[i] = d; }
    for (let i = 0; i < S * S; i++) dtex[i] = Math.min(255, (Math.min(dist[i], DR) / DR) * 255);
    Ulen = L; gcen = [rx + rw / 2, ry + rh / 2];
    if (glOK) { gl.bindTexture(gl.TEXTURE_2D, gtex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, S, S, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, dtex); }
  }
  function glInit() {
    const c = el.querySelector('canvas.gl'); gl = c.getContext('webgl', { premultipliedAlpha: true, alpha: true }); if (!gl) return;
    const vs = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
    const fs = `precision highp float; uniform sampler2D D; uniform vec4 geo; uniform vec2 scr, cen; uniform float t, op, len;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int k = 0; k < 3; k++) { v += a * noise(p); p *= 2.0; a *= 0.5; } return v; }
      void main(){
        vec2 sp = vec2(gl_FragCoord.x, scr.y - gl_FragCoord.y) / scr * geo.zw;            /* 화면(CSS px) */
        vec2 m = vec2(sp.x * geo.x + PXY.x, sp.y * geo.x + PXY.y);   /* 화면 → 모델 칸(320) */
        float dpx = texture2D(D, m / ${S}.0).r * ${DR}.0; float d = dpx / len;
        if (dpx < 0.5) discard;
        vec2 rel = m - cen; float ang = atan(rel.y, rel.x);
        float n = fbm(vec2(ang * 2.2 + t * 0.35, d * 5.0 - t * 0.9)), n2 = fbm(vec2(-ang * 3.1 + t * 0.22, d * 9.0 - t * 1.4));
        float core = exp(-max(d, 0.0) * 7.5);
        float haze = exp(-max(d, 0.0) * 2.7) * (0.35 + 0.65 * smoothstep(0.3, 0.85, n * 0.7 + n2 * 0.5)) * (1.0 - smoothstep(0.52, 0.69, d));
        float a = clamp(core * 0.95 + haze * 0.7, 0.0, 1.0) * op;
        vec3 col = mix(vec3(1.0, 0.86, 0.55), vec3(1.0, 0.98, 0.9), core);
        gl_FragColor = vec4(col * a * a, a * a);   /* 살롱(three AdditiveBlending)과 같은 밝기 */
      }`;
    const mk = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(sh)); return null; } return sh; };
    const v1 = mk(gl.VERTEX_SHADER, vs), f1 = mk(gl.FRAGMENT_SHADER, fs.replace('uniform float t, op, len;', 'uniform float t, op, len; uniform vec2 PXY;')); if (!v1 || !f1) return;
    gprog = gl.createProgram(); gl.attachShader(gprog, v1); gl.attachShader(gprog, f1); gl.linkProgram(gprog); gl.useProgram(gprog);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(gprog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gtex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, gtex); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, S, S, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array(S * S).fill(255));
    Ugeo = gl.getUniformLocation(gprog, 'geo'); Ut = gl.getUniformLocation(gprog, 't'); Uop = gl.getUniformLocation(gprog, 'op'); Uscr = gl.getUniformLocation(gprog, 'scr'); Uc = gl.getUniformLocation(gprog, 'cen');
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); glOK = true;
  }
  function glDraw(op) {
    if (!glOK) return;
    const c = el.querySelector('canvas.gl'), cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
    gl.viewport(0, 0, cw, ch); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (op < 0.01 || !geo) return;
    gl.uniform4f(Ugeo, geo.k, 0, W, H); gl.uniform2f(gl.getUniformLocation(gprog, 'PXY'), geo.px, geo.py); gl.uniform2f(Uscr, cw, ch);
    gl.uniform1f(Ut, performance.now() / 1000); gl.uniform1f(Uop, op); gl.uniform1f(gl.getUniformLocation(gprog, 'len'), Ulen); gl.uniform2f(Uc, gcen[0], gcen[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  if (o.pick) glInit();
  // 점검용(?segtest): 가짜 실루엣(가운데 상자)으로 오라만 그려 봄
  if (o.pick && /segtest/.test(location.search)) window.__segTest = () => {
    const k = S / Math.max(W, H), lw = W * k, lh = H * k, px = (S - lw) / 2, py = (S - lh) / 2;
    al.fill(0); const bx0 = 130, by0 = 150, bw0 = 70, bh0 = 50;
    for (let y = by0; y < by0 + bh0; y++) for (let x = bx0; x < bx0 + bw0; x++) al[y * S + x] = (x - bx0 < 20 && y - by0 < 20 && (x - bx0) + (y - by0) < 20) ? 0 : 1;
    geo = { x: bx0, y: by0, w: bw0, h: bh0, px, py, k, full: true }; distField(bx0, by0, bw0, bh0, Math.max(bw0, bh0)); ready = true; readyA = 1; hitT = performance.now() + 1e9;
    el.querySelector('.card')?.classList.add('on'); el.querySelector('.pick')?.classList.add('on');
    const w = el.querySelector('.wait'); if (w) w.remove(); if (!raf) raf = requestAnimationFrame(frame);
  };
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
      let p = aimT ? Math.min(1, (now - aimT) / DWELL) : 0;
      if (p > 0.85 && !(geo && geo.full)) { p = 0.85; aimT = now - DWELL * 0.85; }   // 화면 밖으로 걸쳐 있으면 끝내지 않고 기다림
      prog += (p - prog) * 0.35;
      // 11/28 o.pick: 다 찾으면 저절로 넘기지 않고 — 물건 테두리에 금빛 오라 + 아래 설명 카드 · [선택](살롱 · 전단지와 같음). 물건이 화면에서 벗어나면 걷힘
      if (o.pick) {
        const want = on ? (ready || (p >= 1 && last && last.full)) : (ready && now - hitT < 900);
        if (want !== ready) { ready = want; el.querySelector('.card')?.classList.toggle('on', ready); el.querySelector('.pick')?.classList.toggle('on', ready); el.querySelector('.msg').style.opacity = ready ? '0' : ''; if (ready) navigator.vibrate?.([18, 50, 24]); }
      } else if (p >= 1 && last && last.full) catchIt();
    }
    fxx.setTransform(dpr, 0, 0, dpr, 0, 0); fxx.globalCompositeOperation = 'source-over'; fxx.globalAlpha = 1; fxx.clearRect(0, 0, W, H);
    if (o.pick) { readyA += ((ready ? 1 : 0) - readyA) * 0.15; glDraw(caught ? 0 : readyA); return; }   // 11/28 pick: 살롱과 같은 셰이더 오라만(초록 칠 · 훑는 빛 · 모서리 표식 없음)
    if (glowA < 0.02 || !geo || caught) return;
    const g = geo, gx = (g.x - g.px) / g.k, gy = (g.y - g.py) / g.k, gw = g.w / g.k, gh = g.h / g.k;
    // 11/27 진행 = 화면 효과로만: ① 실루엣이 옅게 칠해지고 ② 위에서 아래로 훑는 빛이 지나간 곳은 진하게 차오름(진행) ③ 물건 둘레 모서리 표식이 바깥에서 조여 들어옴
    readyA += ((ready ? 1 : 0) - readyA) * 0.15;
    if (readyA > 0.02) {   // 금빛 오라(살롱 정답과 같은 색) — 실루엣을 흐려 바깥으로 번지게 그리고 안쪽은 비워 물건이 그대로 보이게
      const t = now / 1000;
      lc.setTransform(1, 0, 0, 1, 0, 0); lc.globalCompositeOperation = 'source-over'; lc.globalAlpha = 1; lc.clearRect(0, 0, W, H);
      lc.drawImage(mask, g.x, g.y, g.w, g.h, gx, gy, gw, gh); lc.globalCompositeOperation = 'source-in'; lc.fillStyle = 'rgb(255,214,140)'; lc.fillRect(0, 0, W, H);
      fxx.save(); fxx.globalCompositeOperation = 'lighter';
      for (const [bl, al] of [[28, 0.55], [14, 0.6], [5, 0.75]]) { fxx.filter = `blur(${bl}px)`; fxx.globalAlpha = readyA * al * (0.8 + 0.2 * Math.sin(t * 2.4 + bl)); fxx.drawImage(lineCv, 0, 0, W, H); }
      fxx.filter = 'none'; fxx.globalCompositeOperation = 'destination-out'; fxx.globalAlpha = 1; fxx.drawImage(mask, g.x, g.y, g.w, g.h, gx, gy, gw, gh);
      fxx.restore();
      if (ready) return;
    }
    const sy = gy + gh * prog, band = 26;
    fxx.globalAlpha = 0.3 * glowA; fxx.drawImage(glow, g.x, g.y, g.w, g.h, gx, gy, gw, gh);
    if (prog > 0.01) {
      fxx.save(); fxx.beginPath(); fxx.rect(gx, gy, gw, sy - gy); fxx.clip();
      fxx.globalAlpha = 0.8 * glowA; fxx.drawImage(glow, g.x, g.y, g.w, g.h, gx, gy, gw, gh);   // 훑고 지나간 곳 — 조금 더 진하게(물건이 가려지지 않을 만큼)
      fxx.restore();
      // 훑는 빛(실루엣 모양으로 오림)
      const grd = fxx.createLinearGradient(0, sy - band, 0, sy + band * 0.4);
      grd.addColorStop(0, 'rgba(230,255,224,0)'); grd.addColorStop(0.75, 'rgba(240,255,236,.85)'); grd.addColorStop(1, 'rgba(240,255,236,0)');
      lc.clearRect(0, 0, W, H); lc.globalCompositeOperation = 'source-over'; lc.fillStyle = grd; lc.fillRect(gx, sy - band, gw, band * 1.4);
      lc.globalCompositeOperation = 'destination-in'; lc.drawImage(mask, g.x, g.y, g.w, g.h, gx, gy, gw, gh);
      fxx.globalAlpha = glowA; fxx.globalCompositeOperation = 'lighter'; fxx.drawImage(lineCv, 0, 0, W, H); fxx.globalCompositeOperation = 'source-over';
    }
    // 모서리 표식 — 물건 상자 둘레, 진행에 따라 바깥(22px)에서 상자 선까지 조여 듦
    const [bx0, by0, bw0, bh0] = g.b, pad = 22 * (1 - prog) + 4, L = Math.min(26, Math.min(bw0, bh0) * 0.22);
    const X0 = bx0 - pad, Y0 = by0 - pad, X1 = bx0 + bw0 + pad, Y1 = by0 + bh0 + pad;
    fxx.globalAlpha = glowA * (0.55 + 0.45 * prog); fxx.strokeStyle = '#D6F5CF'; fxx.lineWidth = 2.5; fxx.lineCap = 'round';
    fxx.beginPath();
    fxx.moveTo(X0, Y0 + L); fxx.lineTo(X0, Y0); fxx.lineTo(X0 + L, Y0);
    fxx.moveTo(X1 - L, Y0); fxx.lineTo(X1, Y0); fxx.lineTo(X1, Y0 + L);
    fxx.moveTo(X0, Y1 - L); fxx.lineTo(X0, Y1); fxx.lineTo(X0 + L, Y1);
    fxx.moveTo(X1 - L, Y1); fxx.lineTo(X1, Y1); fxx.lineTo(X1, Y1 - L);
    fxx.stroke(); fxx.globalAlpha = 1;
  }

  // 인식 — 화면을 멈추고 물건을 실루엣대로 오려 가운데로 띄운 뒤 onFound
  el.querySelector('.pick button')?.addEventListener('click', () => { if (!caught && ready && last) { el.querySelector('.card')?.classList.remove('on'); el.querySelector('.pick')?.classList.remove('on'); catchIt(); } });
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
    // 11/28 o.lift: 오린 그림을 여기서 띄우지 않고 부른 쪽(done.js liftToCard)에 화면 자리와 함께 넘긴다 — 깨끗한 수집품 그림으로 바뀌며 떠올라 카드로
    if (o.lift) {
      const teardown = () => {
        Promise.resolve(sess).then((s) => { try { s?.release(); } catch {} }); sess = null;
        try { stream?.getTracks().forEach((t) => t.stop()); } catch {}
        stopped = true; cancelAnimationFrame(raf); el.remove(); if (cur === api) cur = null;
        document.removeEventListener('visibilitychange', onVis); removeEventListener('resize', size);
      };
      // 11/28 사용자: 실루엣대로 오린 건 자글자글 — 상자 둘레를 넉넉하게(사방 22%) 네모로 잘라 가장자리만 부드럽게 흐린 사진을 넘긴다(그 사진이 떠오르며 물감통 사진으로 바뀜)
      const pad = 0.22, bx = Math.max(0, sx - sw * pad), by = Math.max(0, sy - sh * pad), bx1 = Math.min(W, sx + sw * (1 + pad)), by1 = Math.min(H, sy + sh * (1 + pad));
      const k = g.k * sc;   // 화면 1px = 영상 k 화소(위 오리기와 같은 대응: 영상 x = r.sx + 화면 x · k)
      const rc = document.createElement('canvas'), rw = Math.max(1, Math.round((bx1 - bx) * Math.min(2, k))), rh = Math.max(1, Math.round((by1 - by) * Math.min(2, k)));
      rc.width = rw; rc.height = rh; const rx = rc.getContext('2d');
      rx.drawImage(v, r.sx + bx * k, r.sy + by * k, (bx1 - bx) * k, (by1 - by) * k, 0, 0, rw, rh);
      rx.globalCompositeOperation = 'destination-in';   // 가장자리 9% 를 부드럽게 투명으로(네모 테두리가 딱 끊기지 않게)
      const f = Math.min(rw, rh) * 0.09;
      const gx = rx.createLinearGradient(0, 0, rw, 0); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(f / rw, '#000'); gx.addColorStop(1 - f / rw, '#000'); gx.addColorStop(1, 'rgba(0,0,0,0)');
      rx.fillStyle = gx; rx.fillRect(0, 0, rw, rh);
      const gy = rx.createLinearGradient(0, 0, 0, rh); gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(f / rh, '#000'); gy.addColorStop(1 - f / rh, '#000'); gy.addColorStop(1, 'rgba(0,0,0,0)');
      rx.fillStyle = gy; rx.fillRect(0, 0, rw, rh);
      let soft = url; try { soft = rc.toDataURL('image/png'); } catch {}
      o.onFound?.(soft, { l: bx, t: by, r: bx1, b: by1 }, teardown);
      return;
    }
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
      wait.classList.add('fail'); wait.textContent = T('카메라를 켜지 못했습니다. 카메라 사용을 허용해 주세요.'); return;
    }
    if (!sess) preloadSeg(o.model);
    const s = await sess;
    if (stopped) return;
    if (!s) { wait.classList.add('fail'); wait.textContent = T('네트워크를 확인해 주세요'); return; }
    wait.remove(); raf = requestAnimationFrame(frame); analyze();
  })();
  return api;
}
