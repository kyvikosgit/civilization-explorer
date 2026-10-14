// C-4 나다르 사진관 체험 부스 — Step1 현장 촬영 → Step2 QR 코드 인식 → Step3 초상화·19세기 사진 비교 및 저장
import { $, $$, ICON, createFlow, toast, startCamera, stopCamera, cameraErrorText, loadImage, clamp } from './common.js';
import * as N from './nadar.js';

$$('[data-ic]').forEach((e) => (e.outerHTML = ICON[e.dataset.ic]));

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
    s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
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
let worker = null;
let job = 0, pick = 'paint', pos = 0.5;
let state = null;            // { compPaint, face, engine }
const FORCE_FALLBACK = new URLSearchParams(location.search).has('fallback'); // 검수용: ML·WebGL 실패 경로 확인
const cvPhoto = $('#cvPhoto'), cvPaint = $('#cvPaint'), cmp = $('#cmp'), handle = $('#handle');
const STAGES = [
  { id: 'seg', t: '인물 분리', s: 'MediaPipe 셀피 세그멘터 · 처음 한 번 최대 약 10MB(엔진 포함)' },
  { id: 'photo', t: '19세기 사진 현상', s: 'WebGL 셰이더 — 정색성 감광·할레이션·습판 가장자리' },
  { id: 'style', t: '초상화 화풍 변환', s: 'Magenta 임의 화풍 변환 · 처음 한 번 약 18MB' },
];
function setStage(id, st, sub) {
  const li = $(`#stages li[data-id="${id}"]`); if (!li) return;
  li.className = st;
  li.querySelector('.st').innerHTML = st === 'done' ? ICON.check : st === 'fail' ? '!' : '';
  if (sub) li.querySelector('small').textContent = sub;
}
function show(v) {
  $('#pick').hidden = v !== 'pick';
  $('#busy').hidden = v !== 'busy';
  $('#compare').hidden = v !== 'compare';
}
show('pick');

function runWorker(comp) {
  // 대체 경로 — 기존 캔버스 필터 워커 (19세기 사진 · 쿠와하라 초상화)
  worker ||= new Worker('js/filters-worker.js');
  const w = comp.width, h = comp.height;
  const data = comp.getContext('2d').getImageData(0, 0, w, h);
  const id = Math.random();
  return new Promise((res, rej) => {
    const out = {};
    worker.onmessage = (e) => {
      const m = e.data; if (m.id !== id) return;
      if (m.error) return rej(new Error(m.error));
      const c = document.createElement('canvas'); c.width = m.w; c.height = m.h;
      c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(m.buf), m.w, m.h), 0, 0);
      out[m.kind] = c;
      if (out.photo && out.paint) res(out);
    };
    worker.postMessage({ id, w, h, buf: data.data.buffer }, [data.data.buffer]);
  });
}
function paintTo(cv, src) { cv.width = src.width; cv.height = src.height; cv.getContext('2d').drawImage(src, 0, 0); }

async function processImage(src) {
  const id = ++job;
  show('busy');
  $('#stages').innerHTML = STAGES.map((s) => `<li class="wait" data-id="${s.id}"><span class="st"></span><div>${s.t}<small>${s.s}</small></div></li>`).join('');
  const t0 = performance.now();
  let img;
  try { img = await loadImage(src); } catch (e) { toast('이미지를 열 수 없습니다.'); show('pick'); return; }
  const base = N.cropTo34(img);
  const engine = { seg: false, photo: 'webgl', paint: 'magenta', face: false };

  // 1) 인물 분리 + 얼굴 위치
  setStage('seg', 'run');
  let mask = null, face = null;
  try {
    if (FORCE_FALLBACK) throw new Error('forced');
    const r = await N.personMask(base);
    if (r.cover > 0.02 && r.cover < 0.98) { mask = r.mask; engine.seg = true; setStage('seg', 'done'); }
    else setStage('seg', 'fail', '인물을 찾지 못해 원래 배경을 유지합니다');
  } catch (e) { console.warn('[nadar] segmentation', e); setStage('seg', 'fail', '모델을 불러오지 못해 원래 배경을 유지합니다'); }
  try { if (!FORCE_FALLBACK) { face = await N.faceBox(base); engine.face = !!face; } } catch (e) { console.warn('[nadar] face', e); }
  if (id !== job) return;
  const compPhoto = mask ? N.compositeOn(base, mask, N.studioBackdrop('photo', 7)) : base;
  const compPaint = mask ? N.compositeOn(base, mask, N.studioBackdrop('paint', 11)) : base;

  // 2) 19세기 사진
  setStage('photo', 'run');
  await new Promise((r) => setTimeout(r, 30));
  let photoCard = null, fallback = null;
  try { if (FORCE_FALLBACK) throw new Error('forced'); photoCard = N.renderPhoto19(compPhoto, face); setStage('photo', 'done'); }
  catch (e) {
    console.warn('[nadar] webgl', e); engine.photo = 'canvas';
    fallback = await runWorker(compPhoto); photoCard = N.mountFallback(fallback.photo);
    setStage('photo', 'done', 'WebGL 을 쓸 수 없어 캔버스 필터로 대체했습니다');
  }
  if (id !== job) return;

  // 3) 초상화
  setStage('style', 'run');
  let paintCard = null;
  const strength = parseFloat($('#strength').value);
  try {
    if (FORCE_FALLBACK) throw new Error('forced');
    const styled = await N.stylize(compPaint, strength);
    paintCard = N.finishPortrait(styled, compPaint, face);
    setStage('style', 'done');
  } catch (e) {
    console.warn('[nadar] style transfer', e); engine.paint = 'kuwahara';
    fallback ||= await runWorker(compPaint);
    paintCard = N.framePainting(fallback.paint);
    setStage('style', 'fail', '화풍 모델을 불러오지 못해 회화 필터로 대체했습니다');
  }
  if (id !== job) return;
  state = { compPaint, face, engine };
  paintTo(cvPhoto, photoCard); paintTo(cvPaint, paintCard);
  console.info(`[nadar] ${Math.round(performance.now() - t0)}ms`, engine);
  $('#strengthRow').classList.toggle('off', engine.paint !== 'magenta');
  $('#engineNote').innerHTML = [
    engine.paint === 'magenta' ? '초상화: 신경망 화풍 변환 — 기준 그림 클로드 모네 〈베레모를 쓴 자화상〉 1886 (퍼블릭 도메인)' : '초상화: 회화 필터(대체 경로)',
    engine.photo === 'webgl' ? '19세기 사진: WebGL 현상' : '19세기 사진: 캔버스 필터(대체 경로)',
    engine.seg ? '배경: 인물 분리 후 사진관 배경 합성' : '배경: 원본 유지',
  ].join('<br>');
  show('compare'); setPos(0.5); setPick(pick);
}

// 화풍 강도 — 바뀌면 다시 변환 (잠시 후)
let restyleT = 0, restyleJob = 0;
$('#strength').addEventListener('input', (e) => {
  $('#strengthOut').textContent = Math.round(e.target.value * 100);
  if (!state || state.engine.paint !== 'magenta') return;
  clearTimeout(restyleT);
  restyleT = setTimeout(async () => {
    const my = ++restyleJob;
    $('#restyle').hidden = false;
    try {
      const styled = await N.stylize(state.compPaint, parseFloat(e.target.value));
      if (my === restyleJob) paintTo(cvPaint, N.finishPortrait(styled, state.compPaint, state.face));
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
$('#demoImg').addEventListener('click', () => { toast('구성안 PDF의 시안 이미지로 변환합니다.'); processImage('assets/concept/c4_demo_portrait.jpg'); });
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
