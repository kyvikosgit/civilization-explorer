// C3 화가의 아틀리에 — 밖의 빛으로 칠하기
// 어두운 실내 캔버스(img) 위에 reveal 캔버스를 얹고, 손가락이 지나간 자리에 붓자국 마스크로 야외 캔버스를 드러낸다.
// 마스크 = 짧은 결(브리슬) 획. 임파스토 하이라이트는 soft-light 로 얹는다. 약 70%(확률 표본 68%) 드러나면 남은 곳이 번지며 채워진다.
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

// ── 붓자국: 손가락이 지나간 자리에 짧은 획들이 이어진다
//   한 획 = 결(브리슬) 선 여러 가닥이 같은 방향으로 눕고, 길이는 60~110px 에서 끊긴다. 획마다 굵기·불투명도·옆으로 휘는 결이 다르고,
//   끊긴 자리는 조금 어긋나 다음 획이 시작된다. 가장자리에는 임파스토 빛·그늘이 얇게 얹힌다. (곧은 띠가 아니라 칠한 자국으로 읽히게)
let stroke = null;                                  // 지금 그리는 획 { w, a, len, cap, phase, off, bristles: [{o, a, lw}] }
function newStroke() {
  const n = 12 + Math.floor(Math.random() * 6);
  stroke = { w: 30 + Math.random() * 18, a: 0.55 + Math.random() * 0.4, len: 0, cap: 60 + Math.random() * 50, phase: Math.random() * Math.PI * 2,
    curve: (Math.random() - 0.5) * 0.9, off: (Math.random() - 0.5) * 10, bristles: [] };
  for (let i = 0; i < n; i++) stroke.bristles.push({ o: (i / (n - 1) - 0.5) + (Math.random() - 0.5) * 0.12, a: 0.35 + Math.random() * 0.65, lw: 1 + Math.random() * 2.2 });
}
function dab(x, y, dir, step) {
  if (!stroke) newStroke();
  const S = stroke;
  S.len += step;
  // 옆으로 살짝 휘고(결), 획마다 조금 어긋난다
  const bend = Math.sin(S.len * 0.045 + S.phase) * 5 * S.curve + S.off;
  const nx = -Math.sin(dir), ny = Math.cos(dir);
  const cx = x + nx * bend, cy = y + ny * bend;
  const w = S.w * (0.85 + 0.3 * Math.sin(S.len * 0.08 + S.phase));       // 눌렀다 떼는 굵기 변화
  const tail = Math.min(1, (S.cap - S.len) / 14), head = Math.min(1, S.len / 10);   // 획의 시작·끝은 가늘게
  const k = Math.max(0.15, Math.min(head, tail));
  mctx.save(); mctx.translate(cx, cy); mctx.rotate(dir);
  mctx.lineCap = 'round';
  const L = step * 1.6 + 2;
  S.bristles.forEach((b) => {
    mctx.globalAlpha = S.a * b.a * k;
    mctx.strokeStyle = '#fff'; mctx.lineWidth = b.lw * (0.7 + 0.6 * k);
    const oy = b.o * w;
    mctx.beginPath(); mctx.moveTo(-L, oy + (Math.random() - 0.5) * 1.2); mctx.lineTo(L * 0.6, oy + (Math.random() - 0.5) * 1.2); mctx.stroke();
  });
  // 결 사이를 메우는 옅은 바탕(획 가운데만)
  mctx.globalAlpha = 0.34 * S.a * k;
  mctx.fillStyle = '#fff';
  mctx.beginPath(); mctx.ellipse(0, 0, L + w * 0.1, w * 0.38, 0, 0, Math.PI * 2); mctx.fill();
  mctx.restore();
  // 임파스토 — 획 가장자리의 빛과 그늘 (soft-light 로 얹힌다)
  gctx.save(); gctx.translate(cx, cy); gctx.rotate(dir); gctx.lineCap = 'round'; gctx.lineWidth = 1.1;
  const e = w * 0.46;
  gctx.globalAlpha = 0.5 * k;
  gctx.strokeStyle = 'rgba(255,248,225,.5)'; gctx.beginPath(); gctx.moveTo(-L, -e); gctx.lineTo(L * 0.6, -e + (Math.random() - 0.5) * 1.5); gctx.stroke();
  gctx.strokeStyle = 'rgba(40,24,10,.28)'; gctx.beginPath(); gctx.moveTo(-L, e); gctx.lineTo(L * 0.6, e + (Math.random() - 0.5) * 1.5); gctx.stroke();
  gctx.restore();
  if (S.len >= S.cap) stroke = null;                // 획이 끝나면 다음 획은 새 굵기·결로
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
  for (let i = 3; i < d.length; i += 4) if (d[i] > 48) n++;
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
  tube.classList.add('squeeze');                              // 캔버스 모서리의 튜브가 한 번 짜이고 가라앉는다
  const settle = () => tube.classList.add('squeezed');
  if (REDUCED) setTimeout(settle, 600); else tube.addEventListener('animationend', settle, { once: true });
}

function onDown(e) {
  if (done || !outdoor) return;
  painting = true;
  stage.setPointerCapture(e.pointerId);
  firstTouch();
  const p = toLocal(e);
  last = p; lastT = performance.now(); stroke = null;
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
  const dir = Math.atan2(dy, dx) + clamp(speed, 0, 1.5) * (Math.random() - 0.5) * 0.12;
  const step = 5;
  for (let s = step; s <= dist; s += step) {
    const t = s / dist;
    dab(last.x + dx * t, last.y + dy * t, dir + (Math.random() - 0.5) * 0.2, step);
    dabs++;
  }
  last = p; lastT = now;
  render();
  if (dabs % 6 === 0 && coverage() >= 0.68) complete(p);
}
function onUp() { if (painting && !done && outdoor && coverage() >= 0.68) complete(last); painting = false; last = null; stroke = null; }   // 손을 뗄 때도 확인
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
  $('#after').hidden = false; hint.hidden = true;
  setTimeout(() => { $('#after').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); }, REDUCED ? 0 : 350);
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
// 검수용
window.__c3 = { get done() { return done; }, get touched() { return touched; }, coverage: () => (outdoor ? coverage() : 0) };
