// C-4 나다르 사진관 체험 부스 — Step1 현장 촬영 → Step2 QR 코드 인식 → Step3 초상화·19세기 사진 비교 및 저장
import { $, $$, ICON, createFlow, toast, startCamera, stopCamera, cameraErrorText, loadImage, clamp } from './common.js';
import * as N from './nadar.js';

$$('[data-ic]').forEach((e) => (e.outerHTML = ICON[e.dataset.ic]));

// 검수용: ?debug=1 — 기기(iPhone Safari 등)에서 콘솔을 화면에 띄운다
if (new URLSearchParams(location.search).has('debug')) {
  const box = document.createElement('pre');
  box.style.cssText = 'position:fixed;left:0;right:0;top:0;pointer-events:none;max-height:30vh;overflow:auto;margin:0;padding:6px 8px;font:10px/1.35 monospace;background:rgba(0,0,0,.82);color:#9f9;z-index:999;white-space:pre-wrap';
  document.body.appendChild(box);
  const log = (k) => (...a) => { box.textContent += `[${k}] ${a.map((x) => (x && x.message) || (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')}\n`; box.scrollTop = 1e9; };
  ['info', 'warn', 'error'].forEach((k) => { const o = console[k].bind(console); console[k] = (...a) => { o(...a); log(k)(...a); }; });
  window.addEventListener('error', (e) => log('onerror')(e.message, e.filename, e.lineno));
  window.addEventListener('unhandledrejection', (e) => log('reject')(e.reason));
  log('ua')(navigator.userAgent);
  ['pointerdown', 'click'].forEach((t) => document.addEventListener(t, (e) => log(t)(e.target.tagName + '#' + (e.target.id || '') + '.' + (e.target.className || '') + ' @' + Math.round(e.clientX) + ',' + Math.round(e.clientY)), true));
}

const flow = createFlow({
  total: 3,
  booth: '4층 C-4 나다르 사진관',
  titles: ['나다르 사진관 촬영 체험', 'QR 코드 인식', '촬영 이미지 확인 및 저장'],
  onEnter(n) {
    document.querySelector('meta[name=theme-color]').content = n === 2 ? '#000000' : '#FFFFFF';
    if (n === 2) resetQR();
  },
  onLeave(prev) { if (prev === 2) stopQR(); },
});
$$('[data-next]').forEach((b) => b.addEventListener('click', () => flow.next()));

// ── Step2: QR (BarcodeDetector → 없으면 jsQR)
const video = $('#qrVideo');
let scanning = false, detector = null, jsQRfn = null, scanTimer = 0;
const work = document.createElement('canvas');
const wctx = work.getContext('2d', { willReadFrequently: true });

function resetQR() {
  $('#qrStart').hidden = false;
  $('#qrMsg').hidden = true;
  $('#qrFrame').classList.remove('found');
  setQrPill('전시 모니터에 표시된 QR 코드를 비춰주세요');
}
function setQrPill(t, found = false) { const p = $('#qrPill'); p.textContent = t; p.classList.toggle('found', found); }

async function loadJsQR() {
  if (jsQRfn) return jsQRfn;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'js/vendor/jsQR-1.4.0.js';
    s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
  jsQRfn = window.jsQR;
  return jsQRfn;
}

async function startQR() {
  $('#qrStart').hidden = true;
  $('#qrMsg').hidden = true;
  try {
    await startCamera(video, 'environment');
  } catch (e) {
    $('#qrStart').hidden = false;
    const m = $('#qrMsg'); m.hidden = false; m.textContent = `${cameraErrorText(e)} ‘데모로 진행’으로 이어갈 수 있습니다.`;
    return;
  }
  try {
    if ('BarcodeDetector' in window) {
      const fmts = await window.BarcodeDetector.getSupportedFormats?.() ?? ['qr_code'];
      if (fmts.includes('qr_code')) detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    }
  } catch (e) { detector = null; }
  if (!detector) {
    try { await loadJsQR(); } catch (e) { toast('QR 인식 모듈을 불러오지 못했습니다. ‘데모로 진행’을 이용하세요.', 3200); }
  }
  scanning = true;
  loop();
}
async function loop() {
  if (!scanning) return;
  let text = null;
  try {
    if (video.readyState >= 2 && video.videoWidth) {
      if (detector) {
        const r = await detector.detect(video);
        if (r && r.length) text = r[0].rawValue;
      } else if (jsQRfn) {
        const s = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
        work.width = Math.round(video.videoWidth * s); work.height = Math.round(video.videoHeight * s);
        wctx.drawImage(video, 0, 0, work.width, work.height);
        const img = wctx.getImageData(0, 0, work.width, work.height);
        const r = jsQRfn(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (r) text = r.data;
      }
    }
  } catch (e) { /* 프레임 하나 실패는 무시 */ }
  if (text !== null) return onQR(text);
  scanTimer = setTimeout(loop, 180);
}
function stopQR() { scanning = false; clearTimeout(scanTimer); stopCamera(video); }
async function onQR(text) {
  scanning = false;
  $('#qrFrame').classList.add('found');
  setQrPill('QR 코드를 인식했어요', true);
  if (navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate(30);
  console.info('[QR]', text);
  await new Promise((r) => setTimeout(r, 700));
  flow.to(3);
}
$('#qrStart').addEventListener('click', startQR);
$('#qrDemo').addEventListener('click', () => { stopQR(); onQR('demo'); });

// ── Step3: 사진 → 인물 분리·스튜디오 합성 → 19세기 사진(WebGL) / 초상화(신경망 화풍 변환) → 비교 슬라이더 → 저장
let job = 0, pick = 'paint', pos = 0.5;
let state = null;            // { compPaint, face, engine, painterly } — 실제 변환 결과일 때만 (데모는 null)
const FORCE_FALLBACK = new URLSearchParams(location.search).has('fallback'); // 검수용: ML·WebGL 실패 경로 확인
const cvPhoto = $('#cvPhoto'), cvPaint = $('#cvPaint'), cmp = $('#cmp'), handle = $('#handle');
const STYLE_NOTE = '화풍 기준: 클로드 모네 〈베레모를 쓴 자화상〉 1886 (퍼블릭 도메인)';
function show(v) {
  $('#pick').hidden = v !== 'pick';
  $('#busy').hidden = v !== 'busy';
  $('#compare').hidden = v !== 'compare';
  // 화면이 아래로 내려가 있던 상태에서도 로딩·결과가 바로 보이게
  const el = { pick: '#pick', busy: '#busy', compare: '#compare' }[v];
  if (el && v !== 'pick') { try { $(el).scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) { $(el).scrollIntoView(); } }
}
show('pick');
// 단계마다 시간 제한 — 모델 다운로드·실행이 멈춰도(모바일 Safari 등) 대체 경로로 결과를 낸다
const withTimeout = (p, ms, name) => { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`${name}_timeout`)), ms); })]).finally(() => clearTimeout(t)); };
const raf2 = () => new Promise((r) => setTimeout(r, 16));   // 로딩 화면이 그려질 틈 (rAF 는 백그라운드 탭에서 멈추므로 쓰지 않는다)
// 단계별 제한(ms). 모델은 Step1 부터 미리 받아 두므로 보통 몇 초 안에 끝난다. TOTAL 이 지나면 그때까지 나온 것으로 바로 결과를 낸다
const T = { font: 3000, image: 10000, seg: 12000, face: 4000, style: 20000, painterly: 10000, total: 35000 };

// 회화 필터(쿠와하라) · 대체용 19세기 사진 — 캔버스 필터 워커. 부를 때마다 새로 만들고 끝나면(시간 초과 포함) 종료해 메모리를 돌려준다
function runWorker(comp, kinds, ms) {
  const w = comp.width, h = comp.height;
  const data = comp.getContext('2d').getImageData(0, 0, w, h);
  const wk = new Worker('js/filters-worker.js');
  return new Promise((res, rej) => {
    const out = {};
    let t = 0;
    const done = (fn, v) => { clearTimeout(t); wk.terminate(); fn(v); };
    t = setTimeout(() => done(rej, new Error(`worker_${kinds.join('+')}_timeout`)), ms);
    wk.onmessage = (e) => {
      const m = e.data;
      if (m.error) return done(rej, new Error(m.error));
      const c = document.createElement('canvas'); c.width = m.w; c.height = m.h;
      c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(m.buf), m.w, m.h), 0, 0);
      out[m.kind] = c;
      if (kinds.every((k) => out[k])) done(res, out);
    };
    wk.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); done(rej, new Error(`worker_error ${(e && e.message) || ''}`)); };
    wk.onmessageerror = () => done(rej, new Error('worker_messageerror'));
    wk.postMessage({ id: 1, w, h, buf: data.data.buffer, kinds }, [data.data.buffer]);
  });
}
function paintTo(cv, src) { cv.width = src.width; cv.height = src.height; cv.getContext('2d').drawImage(src, 0, 0); }
function setDemo(on) { $('#compare').classList.toggle('demo', on); }
function present(photoCard, paintCard, note) {
  paintTo(cvPhoto, photoCard); paintTo(cvPaint, paintCard);
  $('#engineNote').textContent = note || '';
  show('compare'); setPos(0.5); setPick(pick);
}

class Superseded extends Error {}
async function processImage(src) {
  const id = ++job;
  setDemo(false); state = null;
  show('busy');
  const t0 = performance.now();
  const engine = { seg: false, photo: 'webgl', paint: 'neural+painterly', face: false };
  const x = { base: null, compPhoto: null, compPaint: null, face: null, photoCard: null, styled: null, painterly: null };
  let settled = false;
  const live = () => { if (settled || id !== job) throw new Superseded(); };

  // 어떤 단계가 멈추거나 실패해도 지금까지 나온 것으로 곧바로 결과를 만든다 (WebGL·워커 없이도 되는 경로)
  const fallback = (why) => {
    if (settled || id !== job) return;
    settled = true;
    console.warn('[nadar] fallback result —', why);
    const comp = x.compPaint || x.base;
    if (!comp) { toast('이미지를 불러오지 못했습니다. 다른 사진으로 다시 시도해 주세요.', 3200); show('pick'); return; }
    let photoCard = x.photoCard;
    if (!photoCard) {
      try { if (FORCE_FALLBACK) throw new Error('forced'); photoCard = N.renderPhoto19(x.compPhoto || x.base, x.face); }
      catch (e) { photoCard = N.quickPhoto(x.compPhoto || x.base); }
    }
    const paintCard = N.finishPortrait(null, comp, x.face, x.painterly);
    engine.paint = x.painterly ? 'painterly' : 'basic'; engine.fallback = why;
    state = { compPaint: comp, face: x.face, engine, painterly: x.painterly };
    $('#strengthRow').classList.add('off');
    present(photoCard, paintCard, '');
    console.info(`[nadar] ${Math.round(performance.now() - t0)}ms`, engine);
  };
  const deadline = setTimeout(() => fallback('deadline'), T.total);

  try {
    if (document.fonts && document.fonts.load) await withTimeout(Promise.all([document.fonts.load('800 30px "Paperlogy Local"'), document.fonts.load('800 24px "Paperlogy Local"')]), T.font, 'font').catch(() => {});
    const img = await withTimeout(loadImage(src), T.image, 'image');
    live();
    await raf2();
    x.base = N.cropTo34(img);

    // 1) 인물 분리 + 얼굴 위치
    let mask = null;
    try {
      if (FORCE_FALLBACK) throw new Error('forced');
      const r = await withTimeout(N.personMask(x.base), T.seg, 'seg');
      if (r.cover > 0.02 && r.cover < 0.98) { mask = r.mask; engine.seg = true; }
    } catch (e) { console.warn('[nadar] segmentation', e); }
    live();
    try { if (!FORCE_FALLBACK && engine.seg) { x.face = await withTimeout(N.faceBox(x.base), T.face, 'face'); engine.face = !!x.face; } } catch (e) { console.warn('[nadar] face', e); }
    live();
    x.compPhoto = mask ? N.compositeOn(x.base, mask, N.studioBackdrop('photo', 7)) : x.base;
    x.compPaint = mask ? N.compositeOn(x.base, mask, N.studioBackdrop('paint', 11)) : x.base;
    await raf2(); live();

    // 2) 19세기 사진 (WebGL — 실패하면 워커 필터)
    try { if (FORCE_FALLBACK) throw new Error('forced'); x.photoCard = N.renderPhoto19(x.compPhoto, x.face); }
    catch (e) {
      console.warn('[nadar] webgl', e); engine.photo = 'canvas';
      try { x.photoCard = N.mountFallback((await runWorker(x.compPhoto, ['photo'], T.painterly)).photo); }
      catch (err) { console.warn('[nadar] photo worker', err); engine.photo = 'quick'; x.photoCard = N.quickPhoto(x.compPhoto); }
    }
    live();

    // 3) 초상화 — 신경망 화풍(모네 자화상). 회화 필터 워커는 이것이 끝난 뒤에 돌린다 (동시에 돌리면 iPhone Safari 메모리 압박)
    try {
      if (FORCE_FALLBACK) throw new Error('forced');
      const st = await withTimeout(N.stylize(x.compPaint, parseFloat($('#strength').value)), T.style, 'style');
      const q = N.styledLooksValid(st, x.compPaint);
      console.info('[nadar] style check', q);
      if (q.ok) x.styled = st; else engine.paint = 'painterly (신경망 출력 품질 미달)';
    } catch (e) { if (e instanceof Superseded) throw e; console.warn('[nadar] style transfer', e); engine.paint = 'painterly'; }
    live();

    // 4) 회화 필터(쿠와하라) — 초상화의 바탕. 시간 초과·실패 시 원본 합성 위에 바로 마감
    try { x.painterly = (await runWorker(x.compPaint, ['paint'], T.painterly)).paint; }
    catch (e) { console.warn('[nadar] painterly', e); engine.paint += ' (회화 필터 생략)'; }
    live();

    const paintCard = N.finishPortrait(x.styled, x.compPaint, x.face, x.painterly);
    settled = true;
    state = { compPaint: x.compPaint, face: x.face, engine, painterly: x.painterly };
    console.info(`[nadar] ${Math.round(performance.now() - t0)}ms`, engine);
    $('#strengthRow').classList.toggle('off', !x.styled);
    present(x.photoCard, paintCard, x.styled ? STYLE_NOTE : '');
  } catch (e) {
    if (!(e instanceof Superseded)) { console.error('[nadar] failed', e); fallback(String((e && e.message) || e)); }
  } finally {
    clearTimeout(deadline);
  }
}

// ── 데모: 시안 이미지(assets/concept/c4_demo_portrait.jpg)를 실제 파이프라인으로 한 번 돌려 저장해 둔 결과 — 변환 없이 바로 보여준다
const DEMO = { paint: 'assets/concept/c4_demo_paint.jpg', photo: 'assets/concept/c4_demo_photo.jpg' };
let demoP = null;
const demoImages = () => (demoP ||= Promise.all([loadImage(DEMO.paint), loadImage(DEMO.photo)]).catch((e) => { demoP = null; throw e; }));
async function showDemo() {
  const id = ++job;
  setDemo(true); state = null;
  try {
    const [paint, photo] = await withTimeout(demoImages(), T.image, 'demo');
    if (id !== job) return;
    present(photo, paint, `시안 이미지 데모 — 미리 변환해 둔 결과입니다. ${STYLE_NOTE}`);
  } catch (e) {
    console.warn('[nadar] demo', e);
    if (id !== job) return;
    setDemo(false);
    toast('시안 이미지를 불러오지 못했습니다.', 2600);
    show('pick');
  }
}

// ── 미리 받기: 서비스 워커(기기에 보관) 등록 → 모델·라이브러리를 낮은 우선순위로 하나씩 받아 둔다 (Step3 에서 바로 쓰도록)
const SW_OK = 'serviceWorker' in navigator && window.isSecureContext;
const MODEL_CACHE = 'c4-models-v1';   // c4-sw.js 의 MODELS 와 같게 유지
if (SW_OK) navigator.serviceWorker.register('c4-sw.js', { updateViaCache: 'none' }).catch((e) => console.warn('[sw]', e));
function whenControlled(ms) {
  if (!SW_OK || navigator.serviceWorker.controller) return Promise.resolve();
  return new Promise((r) => { const t = setTimeout(r, ms); navigator.serviceWorker.addEventListener('controllerchange', () => { clearTimeout(t); r(); }, { once: true }); });
}
function startPreload() {
  const idle = window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 2000 }) : (f) => setTimeout(f, 600);
  idle(async () => {
    demoImages().catch(() => {});
    await whenControlled(5000);   // 첫 방문: 서비스 워커가 페이지를 맡은 뒤에 받아야 캐시에 남는다
    const t = performance.now();
    const r = await N.preloadModels(MODEL_CACHE).catch((e) => ({ error: String(e) }));
    console.info(`[preload] ${Math.round(performance.now() - t)}ms`, r);
  });
}
if (document.readyState === 'complete') startPreload(); else window.addEventListener('load', startPreload, { once: true });

// 화풍 강도 — 바뀌면 다시 변환 (잠시 후)
let restyleT = 0, restyleJob = 0;
$('#strength').addEventListener('input', (e) => {
  $('#strengthOut').textContent = Math.round(e.target.value * 100);
  if (!state || !state.engine.paint.startsWith('neural')) return;
  clearTimeout(restyleT);
  restyleT = setTimeout(async () => {
    const my = ++restyleJob;
    $('#restyle').hidden = false;
    try {
      const styled = await withTimeout(N.stylize(state.compPaint, parseFloat(e.target.value)), T.style, 'restyle');
      if (my === restyleJob && N.styledLooksValid(styled, state.compPaint).ok) paintTo(cvPaint, N.finishPortrait(styled, state.compPaint, state.face, state.painterly));
    } catch (err) { console.warn(err); }
    if (my === restyleJob) $('#restyle').hidden = true;
  }, 380);
});

function setPos(p) {
  pos = clamp(p, 0, 1);
  cvPaint.style.clipPath = `inset(0 ${(1 - pos) * 100}% 0 0)`;
  handle.style.left = `${pos * 100}%`;
}
function setPick(k) {
  pick = k;
  $$('.seg-btn').forEach((b) => { const on = b.dataset.pick === k; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
  $('#saveLabel').textContent = `${k === 'paint' ? '초상화' : '19세기 사진'} 저장`;
}
$$('.seg-btn').forEach((b) => b.addEventListener('click', () => { setPick(b.dataset.pick); setPos(b.dataset.pick === 'paint' ? 0.9 : 0.1); }));
{
  let drag = false;
  const at = (e) => { const r = cmp.getBoundingClientRect(); setPos((e.clientX - r.left) / r.width); };
  cmp.addEventListener('pointerdown', (e) => { drag = true; cmp.setPointerCapture(e.pointerId); at(e); });
  cmp.addEventListener('pointermove', (e) => { if (drag) at(e); });
  const end = () => { drag = false; };
  cmp.addEventListener('pointerup', end); cmp.addEventListener('pointercancel', end);
}

function onFile(input) {
  const f = input.files && input.files[0]; if (!f) return;
  const url = URL.createObjectURL(f);
  processImage(url).finally(() => setTimeout(() => URL.revokeObjectURL(url), 2000));
  input.value = '';
}
$('#fileCam').addEventListener('change', (e) => onFile(e.target));
$('#fileLib').addEventListener('change', (e) => onFile(e.target));
$('#demoImg').addEventListener('click', showDemo);
$('#again').addEventListener('click', () => { job++; show('pick'); });

$('#save').addEventListener('click', async () => {
  const cv = pick === 'paint' ? cvPaint : cvPhoto;
  const name = pick === 'paint' ? 'nadar_초상화.jpg' : 'nadar_19세기사진.jpg';
  const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.92));
  if (!blob) return toast('저장에 실패했습니다.');
  const file = new File([blob], name, { type: 'image/jpeg' });
  // 모바일: 공유 시트(사진에 저장) 우선, 그 외: 파일 다운로드
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('이미지를 저장했습니다.');
});

flow.start();
