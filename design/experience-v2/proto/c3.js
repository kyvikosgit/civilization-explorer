// C3 화가의 아틀리에 — 밖의 빛으로 칠하기
// 어두운 실내 캔버스(img, 1860년대 아틀리에 팔레트로 재현 — img/c3-indoor.py) 위에 reveal 캔버스를 얹고, 손가락이 지나간 자리에 붓자국 마스크로 야외 캔버스를 드러낸다.
// 마스크 = 굵은 결(브리슬) 획(작업 해상도 200~270px ≈ 폰 화면 95~125px) + 가장자리의 부드러운 번짐. 임파스토 하이라이트는 soft-light 로 얹는다. 3~5번 쓸면 대부분 드러나고, 약 70% 에서 남은 곳이 번지며 채워진다.
// 숫자·진행률은 화면에 없다. 모든 처리는 기기 안 캔버스.
import { toast, loadImage, clamp } from '../../../booth/js/common.js';

const $ = (s) => document.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const OUTDOOR = 'img/c3-outdoor.jpg';   // 임시: 모네 〈아르장퇴유의 화가의 집〉 1873 (AIC · CC0), 6:5 로 자른 1200×1000
const stage = $('#stage'), reveal = $('#reveal'), hint = $('#hint');
const LABEL = { indoor: '아틀리에에서 그린 그림', outdoor: '밖에서 그린 그림' };
function setLabel(which) { $('#labelMain').textContent = LABEL[which]; }

let W = 0, H = 0;                 // 작업 해상도 (6:5)
let outdoor = null;               // 6:5 로 자른 야외 캔버스
let mask, mctx, gloss, gctx, rctx, wet, wctx, spec, sctx;
let painting = false, last = null, lastT = 0, dabs = 0, done = false, touched = false;
let probe, pctx;
let wetAmt = 0, glintAt = null, dryRaf = 0;
// 물감이 마른다: 손을 떼면 1.5초쯤에 걸쳐 젖은 윤기가 사라진다(결의 두께는 남는다)
function dryLoop() {
  cancelAnimationFrame(dryRaf);
  const tick = () => {
    wctx.globalCompositeOperation = 'destination-out'; wctx.fillStyle = 'rgba(0,0,0,.03)'; wctx.fillRect(0, 0, W, H); wctx.globalCompositeOperation = 'source-over';
    wetAmt *= painting ? 1 : 0.965; if (!painting) render();
    if (done && wetAmt <= 0.5) { render(); return; }                         // 다 칠한 뒤: 반쯤 마른 윤기를 남긴다
    if (wetAmt > 0.02) dryRaf = requestAnimationFrame(tick); else if (!painting) { wctx.clearRect(0, 0, W, H); wetAmt = 0; render(); }
  };
  dryRaf = requestAnimationFrame(tick);
}

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
  wet = makeCanvas(W, H); wctx = wet.getContext('2d');      // 갓 칠한 물감의 젖은 윤기(시간이 지나면 마른다)
  spec = makeCanvas(W, H); sctx = spec.getContext('2d');   // 손가락 근처에서 빛을 받는 반짝임
  probe = makeCanvas(48, 40); pctx = probe.getContext('2d', { willReadFrequently: true });
  render();
}

// ── 붓자국: 손가락이 지나간 자리에 굵은 획들이 이어진다
//   한 획 = 결(브리슬) 선 30~40 가닥이 같은 방향으로 눕고(굵기 200~270px, 화면에서 약 95~125px), 길이는 130~220px 에서 끊긴다. 획마다 굵기·불투명도·옆으로 휘는 결이 다르고,
//   끊긴 자리는 조금 어긋나 다음 획이 시작된다. 결 바깥으로 부드러운 번짐(할로)이 깃털처럼 퍼져, 한 번 쓸면 폭의 1.5배가 열린다. 가장자리에는 임파스토 빛·그늘이 얹힌다.
const HALO = makeHalo();                            // 깃털 같은 번짐 — 가운데 1 → 가장자리 0 의 둥근 그라데이션 한 장(획마다 늘려 찍는다)
function makeHalo() {
  const c = makeCanvas(256, 256), g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,.55)'); r.addColorStop(0.8, 'rgba(255,255,255,.12)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  return c;
}
let stroke = null;                                  // 지금 그리는 획 { w, a, len, cap, phase, off, bristles: [{o, a, lw}] }
function newStroke() {
  const n = 30 + Math.floor(Math.random() * 11);
  stroke = { w: 200 + Math.random() * 70, a: 0.6 + Math.random() * 0.35, len: 0, cap: 130 + Math.random() * 90, phase: Math.random() * Math.PI * 2,
    curve: (Math.random() - 0.5) * 0.9, off: (Math.random() - 0.5) * 16, bristles: [] };
  for (let i = 0; i < n; i++) stroke.bristles.push({ o: (i / (n - 1) - 0.5) + (Math.random() - 0.5) * 0.05, a: 0.4 + Math.random() * 0.6, lw: 2.5 + Math.random() * 4.5 });
}
function dab(x, y, dir, step) {
  if (!stroke) newStroke();
  const S = stroke;
  S.len += step;
  // 옆으로 살짝 휘고(결), 획마다 조금 어긋난다
  const bend = Math.sin(S.len * 0.03 + S.phase) * 9 * S.curve + S.off;
  const nx = -Math.sin(dir), ny = Math.cos(dir);
  const cx = x + nx * bend, cy = y + ny * bend;
  const w = S.w * (0.88 + 0.24 * Math.sin(S.len * 0.05 + S.phase));      // 눌렀다 떼는 굵기 변화
  const tail = Math.min(1, (S.cap - S.len) / 28), head = Math.min(1, S.len / 20);   // 획의 시작·끝은 가늘게
  const k = Math.max(0.25, Math.min(head, tail));
  const L = step * 1.6 + 3;
  // 번짐 — 결보다 넓게, 깃털처럼 (여기서 대부분이 열린다)
  mctx.save(); mctx.translate(cx, cy); mctx.rotate(dir);
  mctx.globalAlpha = 0.16 * S.a * k;
  const hr = w * 0.78;
  mctx.drawImage(HALO, -L - hr * 0.3, -hr, (L + hr * 0.3) * 2, hr * 2);
  // 결(브리슬)
  mctx.lineCap = 'round';
  // 빛은 왼쪽 위 창에서 — 결 하나하나의 빛 받는 쪽(밝은 선)과 그늘 쪽(어두운 선)이 임파스토 두께를 만든다
  const lightSide = (-Math.sin(dir) * -0.7 + Math.cos(dir) * -0.7) > 0 ? 1 : -1;
  wctx.save(); wctx.translate(cx, cy); wctx.rotate(dir); wctx.lineCap = 'round'; wctx.strokeStyle = '#fff';
  gctx.save(); gctx.translate(cx, cy); gctx.rotate(dir); gctx.lineCap = 'round';
  S.bristles.forEach((b, i) => {
    mctx.globalAlpha = S.a * b.a * k;
    mctx.strokeStyle = '#fff'; mctx.lineWidth = b.lw * (0.7 + 0.6 * k);
    const oy = b.o * w, j1 = (Math.random() - 0.5) * 2, j2 = (Math.random() - 0.5) * 2;
    mctx.beginPath(); mctx.moveTo(-L, oy + j1); mctx.lineTo(L * 0.6, oy + j2); mctx.stroke();
    if (i % 3 === 0) {
      wctx.globalAlpha = 0.4 * b.a * k; wctx.lineWidth = b.lw * 0.7;
      wctx.beginPath(); wctx.moveTo(-L, oy + j1); wctx.lineTo(L * 0.6, oy + j2); wctx.stroke();
      gctx.globalAlpha = 0.34 * b.a * k; gctx.lineWidth = 1.2;
      gctx.strokeStyle = 'rgba(255,246,222,.8)'; gctx.beginPath(); gctx.moveTo(-L, oy + j1 + lightSide * b.lw * 0.5); gctx.lineTo(L * 0.6, oy + j2 + lightSide * b.lw * 0.5); gctx.stroke();
      gctx.strokeStyle = 'rgba(30,18,8,.55)'; gctx.beginPath(); gctx.moveTo(-L, oy + j1 - lightSide * b.lw * 0.5); gctx.lineTo(L * 0.6, oy + j2 - lightSide * b.lw * 0.5); gctx.stroke();
    }
  });
  wctx.restore(); gctx.restore();
  // 결 사이를 메우는 옅은 바탕(획 가운데만)
  mctx.globalAlpha = 0.36 * S.a * k;
  mctx.fillStyle = '#fff';
  mctx.beginPath(); mctx.ellipse(0, 0, L + w * 0.1, w * 0.4, 0, 0, Math.PI * 2); mctx.fill();
  mctx.restore();
  // 임파스토 — 획 가장자리의 빛과 그늘 (soft-light 로 얹힌다)
  gctx.save(); gctx.translate(cx, cy); gctx.rotate(dir); gctx.lineCap = 'round'; gctx.lineWidth = 2.4;
  const e = w * 0.46;
  gctx.globalAlpha = 0.5 * k;
  gctx.strokeStyle = 'rgba(255,248,225,.5)'; gctx.beginPath(); gctx.moveTo(-L, -e); gctx.lineTo(L * 0.6, -e + (Math.random() - 0.5) * 3); gctx.stroke();
  gctx.strokeStyle = 'rgba(40,24,10,.28)'; gctx.beginPath(); gctx.moveTo(-L, e); gctx.lineTo(L * 0.6, e + (Math.random() - 0.5) * 3); gctx.stroke();
  gctx.restore();
  if (S.len >= S.cap) stroke = null;                // 획이 끝나면 다음 획은 새 굵기·결로
}

function render(extra) {
  rctx.globalCompositeOperation = 'source-over';
  rctx.clearRect(0, 0, W, H);
  rctx.drawImage(outdoor, 0, 0);
  rctx.globalCompositeOperation = 'soft-light';
  rctx.globalAlpha = 1;                      // 완성 뒤에도 붓자국 결은 그대로
  rctx.drawImage(gloss, 0, 0);
  rctx.globalAlpha = 1;
  if (wetAmt > 0.01) {
    // 젖은 물감: 결을 따라 윤기(soft-light) + 손가락 근처에서 빛을 받아 반짝임(screen)
    rctx.globalCompositeOperation = 'soft-light'; rctx.drawImage(wet, 0, 0);
    rctx.globalCompositeOperation = 'screen'; rctx.globalAlpha = 0.1; rctx.drawImage(wet, 0, 0); rctx.globalAlpha = 1;
    if (glintAt) {
      sctx.globalCompositeOperation = 'source-over'; sctx.clearRect(0, 0, W, H); sctx.drawImage(wet, 0, 0);
      sctx.globalCompositeOperation = 'source-in';
      const g = sctx.createRadialGradient(glintAt.x - 30, glintAt.y - 30, 0, glintAt.x - 30, glintAt.y - 30, 150);
      g.addColorStop(0, 'rgba(255,250,235,.95)'); g.addColorStop(1, 'rgba(255,250,235,0)');
      sctx.fillStyle = g; sctx.fillRect(0, 0, W, H);
      rctx.globalCompositeOperation = 'screen'; rctx.globalAlpha = 0.38 * Math.min(1, wetAmt * 1.5); rctx.drawImage(spec, 0, 0); rctx.globalAlpha = 1;
    }
  }
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
  last = p; lastT = now; wetAmt = 1; glintAt = p;
  render(); dryLoop();
  if (dabs % 6 === 0 && coverage() >= 0.7) complete(p);
}
function onUp() { if (painting && !done && outdoor && coverage() >= 0.7) complete(last); painting = false; last = null; stroke = null; }   // 손을 뗄 때도 확인
stage.addEventListener('pointerdown', onDown);
stage.addEventListener('pointermove', onMove);
stage.addEventListener('pointerup', onUp);
stage.addEventListener('pointercancel', onUp);

// ── 약 70% 에서 남은 곳을 붓이 마저 칠한다(1.6초): 아직 안 드러난 띠만 골라 같은 결의 획으로 지그재그. 평평하게 드러내지 않는다 — 다 칠한 캔버스 전체에 붓자국이 남는다
function remainingPlan() {
  pctx.clearRect(0, 0, 48, 40); pctx.drawImage(mask, 0, 0, 48, 40);
  const d = pctx.getImageData(0, 0, 48, 40).data, cw = W / 48, ch = H / 40;
  const open = (cx, cy) => d[(cy * 48 + cx) * 4 + 3] < 150;
  const segs = [], band = 150, rows = Math.ceil(H / band);
  for (let r = 0; r < rows; r++) {
    const y = (r + 0.5) * (H / rows), c0 = Math.max(0, Math.floor((y - band / 2) / ch)), c1 = Math.min(39, Math.floor((y + band / 2) / ch));
    const colOpen = Array.from({ length: 48 }, (_, x) => { let n = 0; for (let yy = c0; yy <= c1; yy++) if (open(x, yy)) n++; return n > 0; });
    let x = 0;
    while (x < 48) {
      if (!colOpen[x]) { x++; continue; }
      let e = x; while (e < 47 && (colOpen[e + 1] || colOpen[Math.min(47, e + 2)] || colOpen[Math.min(47, e + 3)])) e++;
      const a = Math.max(-20, x * cw - 40), b = Math.min(W + 20, (e + 1) * cw + 40);
      segs.push(r % 2 ? { x0: b, x1: a, y } : { x0: a, x1: b, y });
      x = e + 1;
    }
  }
  return segs;
}
function complete() {
  if (done) return;
  done = true; painting = false; stroke = null;
  if (REDUCED) { finish(); return; }
  const slow = new URLSearchParams(location.search).has('slow');
  let segs = remainingPlan();
  const total = segs.reduce((n, sg) => n + Math.abs(sg.x1 - sg.x0), 0) || 1;
  const dur = (slow ? 4000 : 1600) * Math.min(1, 0.5 + total / (W * 4)), speed = total / dur;   // px/ms
  let si = 0, pos = 0, lastF = performance.now(), pass = 0;
  const frame = (now) => {
    let adv = speed * Math.min(40, now - lastF); lastF = now;
    while (adv > 0 && si < segs.length) {
      const sg = segs[si], len = Math.abs(sg.x1 - sg.x0), dir = sg.x1 > sg.x0 ? 0 : Math.PI;
      const step = Math.min(adv, len - pos), n = Math.max(1, Math.round(step / 5));
      for (let i = 1; i <= n; i++) {
        const p = pos + (step * i) / n, x = sg.x0 + Math.sign(sg.x1 - sg.x0) * p, y = sg.y + Math.sin(p * 0.012 + si) * 18;
        dab(x, y, dir + Math.cos(p * 0.012 + si) * 0.18 + (Math.random() - 0.5) * 0.12, step / n);
        glintAt = { x, y };
      }
      pos += step; adv -= step;
      if (pos >= len - 0.01) { si++; pos = 0; stroke = null; }
    }
    wetAmt = 1; render();
    if (si < segs.length) { requestAnimationFrame(frame); return; }
    // 한 번 더: 남은 작은 틈만 짧게 덧칠(최대 한 번)
    if (pass === 0) { pass = 1; segs = remainingPlan(); si = 0; pos = 0; if (segs.length) { requestAnimationFrame(frame); return; } }
    finish();
  };
  requestAnimationFrame(frame);
}
function finish() {
  // 완성: 아주 작은 틈만 메운다(붓자국·임파스토·젖은 윤기는 그대로 남는다). 이후 윤기는 반쯤 마른 채로 멈춘다
  mctx.fillStyle = '#FFF'; mctx.fillRect(0, 0, W, H);
  glintAt = null; render(); dryLoop();
  const label = $('#labelMain'); label.style.opacity = 0;
  setTimeout(() => { setLabel('outdoor'); label.style.opacity = ''; }, 260);
  // 다 칠한 캔버스를 어두운 방에서 잠시(0.4초) 본 뒤 flooding: 방이 창 쪽으로 돌며 빛이 번져 하얗게 덮이고(1.2초, c3-env.js) — 그 순간 lit(바깥) — 빛이 물러나며 들판. 그다음 아래 글
  const T_FLOOD = REDUCED ? 0 : 400, T_LIT = REDUCED ? 300 : T_FLOOD + 950, T_AFTER = REDUCED ? 600 : T_FLOOD + 2500;
  setTimeout(() => document.body.classList.add('flooding'), T_FLOOD);
  setTimeout(() => {
    document.body.classList.add('lit'); document.documentElement.classList.add('lit');
    document.querySelector('meta[name=theme-color]').content = '#FFFFFF';
  }, T_LIT);
  setTimeout(() => {
    // 레이아웃이 바뀌어도 캔버스는 제자리 — 가운데 맞춤 여백을 지금 값으로 고정한다
    const easel = $('.easel'), hd = $('.room .role-hd'), gap = easel.getBoundingClientRect().top - hd.getBoundingClientRect().bottom;
    hint.hidden = true; $('#after').hidden = false;
    document.body.classList.add('done');
    easel.style.marginTop = `${Math.max(6, gap)}px`;
    const tip = $('#holdTip'); tip.hidden = false; tip.classList.add('in'); tip.addEventListener('animationend', () => tip.classList.remove('in'), { once: true });
    $('#roleSub').textContent = '같은 장면을 밖의 빛으로 다시 칠했습니다';
    requestAnimationFrame(() => $('#after').classList.add('in'));
  }, T_AFTER);
}
// ── 다 칠한 뒤: 캔버스를 누르고 있는 동안 아틀리에에서 그린 그림 (250ms 크로스페이드)
{
  let held = false;
  const on = (e) => { if (!document.body.classList.contains('done') || held) return; e.preventDefault(); held = true; stage.classList.add('held'); reveal.classList.add('hide'); document.body.classList.add('held'); setLabel('indoor'); try { stage.setPointerCapture(e.pointerId); } catch (_) { /* noop */ } };
  const off = () => { if (!held) return; held = false; stage.classList.remove('held'); reveal.classList.remove('hide'); document.body.classList.remove('held'); setLabel('outdoor'); };
  stage.addEventListener('pointerdown', on);
  stage.addEventListener('pointerup', off); stage.addEventListener('pointercancel', off); stage.addEventListener('lostpointercapture', off);
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ── 저장: 액자 + 야외 캔버스를 세로 카드 한 장으로
$('#save')?.addEventListener('click', async () => {   // 저장 단추는 뺐다(10/23) — 끝에는 처음으로만
  const CW = 1080, CH = 1350, c = makeCanvas(CW, CH), g = c.getContext('2d');
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, CW, CH);
  const fw = CW - 120, fh = fw / 1.2, fx = 60, fy = 150;
  const wood = g.createLinearGradient(fx, fy, fx + fw, fy + fh);
  wood.addColorStop(0, '#8A6238'); wood.addColorStop(0.4, '#5A3E27'); wood.addColorStop(1, '#2E1F13');
  g.fillStyle = wood; g.fillRect(fx - 18, fy - 18, fw + 36, fh + 36);
  g.drawImage(reveal, fx, fy, fw, fh);       // 화면 그대로 — 붓자국·임파스토·윤기까지
  g.fillStyle = '#707070'; g.font = '600 24px Paperlogy, Freesentation, sans-serif'; g.fillText('MONET 100 · 화가의 아틀리에', 60, 100);
  g.fillStyle = '#111111'; g.font = '800 44px Paperlogy, Freesentation, sans-serif';
  g.fillText('밖의 빛으로 다시 칠했다', 60, fy + fh + 110);
  g.fillStyle = '#A3A3A0'; g.font = '500 20px Freesentation, sans-serif';
  g.fillText('임시 이미지 · 모네 〈아르장퇴유의 화가의 집〉 1873, 시카고 미술관', 60, CH - 60);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
  if (!blob) return toast('저장에 실패했습니다.');
  const file = new File([blob], 'monet100_밖의빛으로.jpg', { type: 'image/jpeg' });
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('이미지를 저장했습니다.');
});

init().catch((e) => { console.error(e); toast('캔버스 이미지를 불러오지 못했습니다.'); });

// ── 들어가기(약 3.2초, 누르면 끝 장면으로): 어둠 → 기름등이 켜지며 이젤 위 실내 캔버스 → 제목 → 왼쪽 창 덧문이 열리고 → 햇빛이 바닥을 가로질러 이젤까지 → "쓸어 보세요"
const B = document.body, STEPS = [['s-lamp', 350], ['s-head', 950], ['s-win', 1550], ['s-beam', 2000], ['s-ready', 2850]];
let introTimers = [], introOn = true;
function introEnd() {
  if (!introOn) return; introOn = false; introTimers.forEach(clearTimeout);
  STEPS.forEach(([c]) => B.classList.add(c));
  stage.classList.add('ready'); setTimeout(() => stage.classList.remove('ready'), 1700);
}
// 뒤 장면(c3-env.js)이 준비된 뒤에 시작한다 — 사진·이젤이 늦게 와도 어둠에서부터(최대 4초 기다림)
let introGo = false;
const introStart = () => {
  if (introGo || !introOn) return; introGo = true;
  STEPS.forEach(([c, t]) => introTimers.push(setTimeout(() => { B.classList.add(c); if (c === 's-ready') introEnd(); }, t)));
};
if (REDUCED) { introEnd(); } else {
  addEventListener('c3env-ready', introStart, { once: true });
  if (window.__c3env && (window.__c3env.ready || window.__c3env.fallback)) introStart();
  introTimers.push(setTimeout(introStart, 4000));
}
// 장면을 누르면 끝으로(캔버스를 누른 것이면 그대로 칠하기 시작)
addEventListener('pointerdown', (e) => { if (introOn && !e.target.closest('a')) introEnd(); }, true);

// 아틀리에·들판·이젤·등불 깜빡임(--fl)·먼지는 c3-env.js (three.js)
// 검수용
window.__c3 = { introEnd, get intro() { return introOn; }, get done() { return done; }, get held() { return reveal.classList.contains('hide'); }, get touched() { return touched; }, coverage: () => (outdoor ? coverage() : 0) };
