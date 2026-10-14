// C-4 나다르 사진관 체험 부스 — Step1 현장 촬영 → Step2 QR 코드 인식 → Step3 초상화·19세기 사진 비교 및 저장
import { $, $$, ICON, createFlow, toast, startCamera, stopCamera, cameraErrorText, loadImage, clamp } from './common.js';

$$('[data-ic]').forEach((e) => (e.outerHTML = ICON[e.dataset.ic]));

const flow = createFlow({
  total: 3,
  booth: '4층 C-4 나다르 사진관',
  titles: ['나다르 사진관 촬영 체험', 'QR 코드 인식', '촬영 이미지 확인 및 저장'],
  onEnter(n) {
    document.querySelector('meta[name=theme-color]').content = n === 1 ? '#EFE4CC' : '#15100B';
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
  if (navigator.vibrate) navigator.vibrate(30);
  console.info('[QR]', text);
  await new Promise((r) => setTimeout(r, 700));
  flow.to(3);
}
$('#qrStart').addEventListener('click', startQR);
$('#qrDemo').addEventListener('click', () => { stopQR(); onQR('demo'); });

// ── Step3: 사진 → 두 스타일 → 비교 슬라이더 → 저장
const worker = new Worker('js/filters-worker.js');
let job = 0, pick = 'paint', pos = 0.5;
const cvPhoto = $('#cvPhoto'), cvPaint = $('#cvPaint'), cmp = $('#cmp'), handle = $('#handle');

function show(state) {
  $('#pick').hidden = state !== 'pick';
  $('#busy').hidden = state !== 'busy';
  $('#compare').hidden = state !== 'compare';
}
show('pick');

async function useImage(src) {
  show('busy');
  let img;
  try { img = await loadImage(src); } catch (e) { toast('이미지를 열 수 없습니다.'); show('pick'); return; }
  // 긴 변 1000px 기준으로 맞춤 (작은 사진은 키워서 붓 터치 크기가 일정하게)
  const MAX = 1000;
  const s = MAX / Math.max(img.naturalWidth, img.naturalHeight);
  const w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  [cvPhoto, cvPaint].forEach((cv) => { cv.width = w; cv.height = h; });
  const id = ++job;
  let got = 0;
  const t0 = performance.now();
  worker.onmessage = (e) => {
    const m = e.data; if (m.id !== id) return;
    if (m.error) { console.error(m.error); toast('변환에 실패했습니다.'); show('pick'); return; }
    const cv = m.kind === 'photo' ? cvPhoto : cvPaint;
    cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(m.buf), m.w, m.h), 0, 0);
    if (++got === 2) {
      console.info(`[filters] ${w}×${h} ${(performance.now() - t0).toFixed(0)}ms`);
      show('compare'); fitCompare(w, h); setPos(0.5); setPick(pick);
    }
  };
  worker.postMessage({ id, w, h, buf: data.data.buffer }, [data.data.buffer]);
}
function fitCompare(w, h) {
  // 화면 높이에 맞춰 액자 폭 결정 (세로 사진도 한 화면에)
  const maxH = window.innerHeight * 0.58;
  const maxW = Math.min(window.innerWidth, 480) - 36 - 24;
  const dispW = Math.min(maxW, maxH * (w / h));
  $('.compare .gilt').style.width = `${dispW + 24}px`;
}
function setPos(p) {
  pos = clamp(p, 0, 1);
  cvPaint.style.clipPath = `inset(0 ${(1 - pos) * 100}% 0 0)`;
  handle.style.left = `${pos * 100}%`;
}
function setPick(k) {
  pick = k;
  $$('.cmp-tag').forEach((b) => b.classList.toggle('on', b.dataset.pick === k));
  $('#saveLabel').textContent = `${k === 'paint' ? '초상화' : '19세기 사진'} 저장`;
}
$$('.cmp-tag').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); setPick(b.dataset.pick); setPos(b.dataset.pick === 'paint' ? 0.85 : 0.15); }));
{
  let drag = false;
  const at = (e) => { const r = cmp.getBoundingClientRect(); setPos((e.clientX - r.left) / r.width); };
  cmp.addEventListener('pointerdown', (e) => { if (e.target.closest('.cmp-tag')) return; drag = true; cmp.setPointerCapture(e.pointerId); at(e); });
  cmp.addEventListener('pointermove', (e) => { if (drag) at(e); });
  const end = () => { drag = false; };
  cmp.addEventListener('pointerup', end); cmp.addEventListener('pointercancel', end);
}

function onFile(input) {
  const f = input.files && input.files[0]; if (!f) return;
  const url = URL.createObjectURL(f);
  useImage(url).finally(() => setTimeout(() => URL.revokeObjectURL(url), 2000));
  input.value = '';
}
$('#fileCam').addEventListener('change', (e) => onFile(e.target));
$('#fileLib').addEventListener('change', (e) => onFile(e.target));
$('#demoImg').addEventListener('click', () => { toast('구성안 PDF의 시안 이미지로 변환합니다.'); useImage('assets/concept/c4_demo_portrait.jpg'); });
$('#again').addEventListener('click', () => show('pick'));

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
