// C3 화가의 아틀리에 — 밖의 빛으로 칠하기
// 어두운 실내 캔버스(img) 위에 reveal 캔버스를 얹고, 손가락이 지나간 자리에 붓자국 마스크로 야외 캔버스를 드러낸다.
// 마스크 = 부드러운 타원 + 결(브리슬) 선. 임파스토 하이라이트는 soft-light 로 얹는다. 약 70% 드러나면 남은 곳이 번지며 채워진다.
// 숫자·진행률은 화면에 없다. 모든 처리는 기기 안 캔버스.
import { toast, loadImage, clamp } from '../../../booth/js/common.js';

const $ = (s) => document.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const OUTDOOR = 'img/c3-outdoor-tmp.jpg';   // 임시: 모네 〈양귀비 들판〉 1873 원본
const stage = $('#stage'), reveal = $('#reveal'), hint = $('#hint'), label = $('#label'), tube = $('#tube');

let W = 0, H = 0;                 // 작업 해상도 (6:5)
let outdoor = null;               // 6:5 로 자른 야외 캔버스
let mask, mctx, gloss, gctx, rctx;
let painting = false, last = null, lastT = 0, dabs = 0, done = false, touched = false;
let probe, pctx;

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

async function init() {
  const img = await loadImage(OUTDOOR);
  // 6:5 로 가운데 자르기 (기획서: 두 캔버스 비율 6:5)
  const iw = img.naturalWidth, ih = img.naturalHeight;
  let sw = iw, sh = ih, sx = 0, sy = 0;
  if (iw / ih > 1.2) { sw = ih * 1.2; sx = (iw - sw) / 2; } else { sh = iw / 1.2; sy = (ih - sh) / 2; }
  W = 720; H = 600;
  outdoor = makeCanvas(W, H);
  const oc = outdoor.getContext('2d'); oc.imageSmoothingQuality = 'high';
  oc.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  reveal.width = W; reveal.height = H; rctx = reveal.getContext('2d');
  mask = makeCanvas(W, H); mctx = mask.getContext('2d');
  gloss = makeCanvas(W, H); gctx = gloss.getContext('2d');
  probe = makeCanvas(48, 40); pctx = probe.getContext('2d', { willReadFrequently: true });
  render();
}

// ── 붓자국 한 점: 진행 방향으로 누운 타원 + 결 선 몇 가닥. 굵기는 속도에 따라 조금 달라진다
function dab(x, y, dir, w) {
  const cos = Math.cos(dir), sin = Math.sin(dir);
  mctx.save();
  mctx.translate(x, y); mctx.rotate(dir);
  // 부드러운 타원
  const g = mctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.62);
  g.addColorStop(0, 'rgba(255,255,255,.62)'); g.addColorStop(0.65, 'rgba(255,255,255,.38)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  mctx.fillStyle = g;
  mctx.beginPath(); mctx.ellipse(0, 0, w * 0.62, w * 0.44, 0, 0, Math.PI * 2); mctx.fill();
  // 결 선 (브리슬)
  mctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const off = (Math.random() - 0.5) * w * 0.9;
    const len = w * (0.5 + Math.random() * 0.6);
    mctx.strokeStyle = `rgba(255,255,255,${0.35 + Math.random() * 0.5})`;
    mctx.lineWidth = 1.2 + Math.random() * 2.4;
    mctx.beginPath(); mctx.moveTo(-len / 2 + (Math.random() - 0.5) * 6, off); mctx.lineTo(len / 2, off + (Math.random() - 0.5) * 3); mctx.stroke();
  }
  mctx.restore();
  // 임파스토 — 획 가장자리의 빛과 그늘 (soft-light 로 얹힌다)
  gctx.save();
  gctx.translate(x, y); gctx.rotate(dir);
  gctx.lineCap = 'round'; gctx.lineWidth = 1.1;
  const l = w * 0.3;
  const oy = (Math.random() - 0.5) * w * 0.6;
  gctx.strokeStyle = 'rgba(255,248,225,.26)';
  gctx.beginPath(); gctx.moveTo(-l, oy - 1); gctx.lineTo(l, oy - 1 + (Math.random() - 0.5) * 2); gctx.stroke();
  gctx.strokeStyle = 'rgba(40,24,10,.2)';
  gctx.beginPath(); gctx.moveTo(-l, oy + 1); gctx.lineTo(l, oy + 1 + (Math.random() - 0.5) * 2); gctx.stroke();
  gctx.restore();
  void cos; void sin;
}

function render(extra) {
  rctx.globalCompositeOperation = 'source-over';
  rctx.clearRect(0, 0, W, H);
  rctx.drawImage(outdoor, 0, 0);
  rctx.globalCompositeOperation = 'soft-light';
  rctx.globalAlpha = done ? 0.45 : 1;        // 완성 뒤엔 붓자국 결만 희미하게 남긴다
  rctx.drawImage(gloss, 0, 0);
  rctx.globalAlpha = 1;
  rctx.globalCompositeOperation = 'destination-in';
  rctx.drawImage(mask, 0, 0);
  rctx.globalCompositeOperation = 'source-over';
  if (extra) extra(rctx);
}

function coverage() {
  pctx.clearRect(0, 0, 48, 40);
  pctx.drawImage(mask, 0, 0, 48, 40);
  const d = pctx.getImageData(0, 0, 48, 40).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 110) n++;
  return n / (48 * 40);
}

function toLocal(e) {
  const r = stage.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}

function firstTouch() {
  if (touched) return;
  touched = true;
  hint.classList.add('off');
  tube.classList.add('squeeze');
  tube.addEventListener('animationend', () => tube.classList.add('squeezed'), { once: true });
  $('#tubeText').textContent = '밖의 빛으로';
}

function onDown(e) {
  if (done || !outdoor) return;
  painting = true;
  stage.setPointerCapture(e.pointerId);
  firstTouch();
  const p = toLocal(e);
  last = p; lastT = performance.now();
  dab(p.x, p.y, Math.random() * Math.PI, 34);
  render();
}
function onMove(e) {
  if (!painting || done) return;
  const p = toLocal(e);
  const now = performance.now();
  const dx = p.x - last.x, dy = p.y - last.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return;
  const speed = dist / Math.max(1, now - lastT);           // px/ms
  const w = clamp(30 + speed * 14, 26, 50);                 // 빠르면 조금 굵게
  const dir = Math.atan2(dy, dx);
  const step = w * 0.32;
  for (let s = step; s <= dist; s += step) {
    const t = s / dist;
    dab(last.x + dx * t + (Math.random() - 0.5) * 3, last.y + dy * t + (Math.random() - 0.5) * 3, dir + (Math.random() - 0.5) * 0.25, w * (0.9 + Math.random() * 0.2));
    dabs++;
  }
  last = p; lastT = now;
  render();
  if (dabs % 6 === 0 && coverage() >= 0.7) complete(p);
}
function onUp() { painting = false; last = null; }
stage.addEventListener('pointerdown', onDown);
stage.addEventListener('pointermove', onMove);
stage.addEventListener('pointerup', onUp);
stage.addEventListener('pointercancel', onUp);

// ── 약 70% 에서 남은 곳이 번지며 채워진다
function complete(at) {
  if (done) return;
  done = true; painting = false;
  const cx = at ? at.x : W / 2, cy = at ? at.y : H / 2;
  const dur = REDUCED ? 0 : (new URLSearchParams(location.search).has('slow') ? 6000 : 1500);   // ?slow: 검수용 느린 번짐
  const t0 = performance.now();
  const frame = () => {
    const t = dur ? clamp((performance.now() - t0) / dur, 0, 1) : 1;
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    render((ctx) => {
      // 남은 부분: 터치한 곳에서 바깥으로 퍼지는 원 + 전체 페이드
      ctx.save();
      ctx.globalAlpha = e;
      ctx.drawImage(outdoor, 0, 0);
      ctx.restore();
      if (dur && t < 1) {
        const r = Math.max(W, H) * (0.1 + e * 1.1);
        const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        const a = Math.sin(Math.PI * t) * 0.55;
        bloom.addColorStop(0, `rgba(255,250,235,${a})`); bloom.addColorStop(0.6, `rgba(255,245,220,${a * 0.5})`); bloom.addColorStop(1, 'rgba(255,245,220,0)');
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = bloom; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
    });
    if (t < 1) requestAnimationFrame(frame); else finish();
  };
  requestAnimationFrame(frame);
}
function finish() {
  // 완성: 마스크를 가득 채워 이후 렌더가 항상 야외 캔버스
  mctx.fillStyle = '#FFF'; mctx.fillRect(0, 0, W, H);
  render();
  label.textContent = '야외 캔버스'; label.classList.add('out');
  document.body.classList.add('done');
  document.querySelector('meta[name=theme-color]').content = '#FFFFFF';
  $('#roleSub').textContent = '같은 장면, 밖의 빛';
  $('#after').hidden = false;
}

// ── 누르고 있으면 실내 캔버스
{
  const b = $('#hold');
  const on = (e) => { e.preventDefault(); b.classList.add('on'); reveal.classList.add('hide'); label.textContent = '실내 캔버스'; label.classList.remove('out'); b.setPointerCapture && b.setPointerCapture(e.pointerId); };
  const off = () => { b.classList.remove('on'); reveal.classList.remove('hide'); label.textContent = '야외 캔버스'; label.classList.add('out'); };
  b.addEventListener('pointerdown', on);
  b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  b.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); on(e); } });
  b.addEventListener('keyup', off);
}

// ── 저장: 액자 + 야외 캔버스 + 일기장 한 줄을 세로 카드 한 장으로
$('#save').addEventListener('click', async () => {
  const CW = 1080, CH = 1350, c = makeCanvas(CW, CH), g = c.getContext('2d');
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, CW, CH);
  const fw = CW - 120, fh = fw / 1.2, fx = 60, fy = 150;
  const wood = g.createLinearGradient(fx, fy, fx + fw, fy + fh);
  wood.addColorStop(0, '#8A6238'); wood.addColorStop(0.4, '#5A3E27'); wood.addColorStop(1, '#2E1F13');
  g.fillStyle = wood; g.fillRect(fx - 18, fy - 18, fw + 36, fh + 36);
  g.drawImage(outdoor, fx, fy, fw, fh);
  g.fillStyle = '#D9672F'; g.font = '600 24px Paperlogy, Freesentation, sans-serif'; g.fillText('MONET 100 · C3 화가의 아틀리에', 60, 100);
  g.fillStyle = '#111111'; g.font = '800 44px Paperlogy, Freesentation, sans-serif';
  g.fillText('밖의 빛으로 다시 칠했다', 60, fy + fh + 110);
  g.font = '600 30px Paperlogy, Freesentation, sans-serif';
  g.fillText('“정오와 저녁의 햇빛은 같은 나무도', 60, fy + fh + 180); g.fillText('전혀 다른 색으로 만든다.”', 60, fy + fh + 224);
  g.fillStyle = '#707070'; g.font = '500 22px Freesentation, sans-serif';
  g.fillText('화가의 일기장 · 1841 존 고프 랜드, 접는 금속 튜브 특허', 60, fy + fh + 280);
  g.fillText('임시 · 제작 전 대체 이미지(모네 〈양귀비 들판〉 1873, 오르세 · PD)', 60, CH - 60);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
  if (!blob) return toast('저장에 실패했습니다.');
  const file = new File([blob], 'c3_밖의빛으로.jpg', { type: 'image/jpeg' });
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('이미지를 저장했습니다.');
});

init().catch((e) => { console.error(e); toast('캔버스 이미지를 불러오지 못했습니다.'); });
