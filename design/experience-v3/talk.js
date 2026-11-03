// 벽면 인물 대화 — 카페 게르부아 벽을 비추면, 비추는 그 창이 그 자리에서 화면 가득 커져 그 창 사람들이 움직이며 말하고(말풍선 + 목소리),
// 끝나면 그 창 자리로 줄어들며 카메라 화면으로 돌아온다. 영상을 벽 위에 붙여 두면 손떨림 · 추적 지연으로 모서리 · 크기가 어긋나 보여서(11/03) 이렇게 바꿨다
// 대사 · 인물 자리는 체험장치 기획서(260928) 22–25쪽. 목소리는 임시 합성음(audio/) — 성우로 교체
// 창 영상(spots[].video)은 그 벽 그림의 그 창을 잘라 만든 영상만 쓴다 — 첫 장면 = 벽 그림 그 자리, clip(벽 안 영상 자리) · glass(영상 안 창 유리 자리)
// 영상이 없는 벽은 창 불빛 · 말풍선만
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 소리: 폰은 사용자가 누른 순간에만 재생을 허락한다 — [대화 엿듣기]에서 같은 Audio 를 한 번 열어 둔다
const voice = new Audio();
voice.playsInline = true;
export function unlockAudio(firstSrc) {
  voice.muted = true; voice.src = firstSrc;
  voice.play().then(() => { voice.pause(); voice.currentTime = 0; voice.muted = false; }).catch(() => { voice.muted = false; });
}
function speak(src, textLen) {
  const least = Math.max(2600, textLen * 95);
  return new Promise((done) => {
    let off = false; const end = () => { if (off) return; off = true; voice.onended = null; done(); };
    const t0 = performance.now();
    voice.src = src; voice.onended = () => setTimeout(end, Math.max(0, 900 - (performance.now() - t0) + 0));
    voice.play().catch(() => setTimeout(end, least));
    setTimeout(end, least + 6000);                                // 소리가 끝나지 않는 경우 대비
  });
}
export function stopVoice() { try { voice.pause(); } catch {} }

function winVideo(src) {
  const v = document.createElement('video');
  Object.assign(v, { src, muted: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' }); v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
  return v;
}
// 창 영상 한 번 재생: 처음(= 벽 그림)부터. 끝나면 마지막 장면에 멈춰 있다가 말이 끝나면 사라진다
function playFromStart(v) { try { v.pause(); v.currentTime = 0; } catch {} v.play().catch(() => {}); }
const ended = (v, max) => new Promise((r) => { if (!v || v.ended || v.paused) return r(); const t = setTimeout(r, max); v.addEventListener('ended', () => { clearTimeout(t); r(); }, { once: true }); });

// 인식 정보만 — 지금 잡힌 대상(벽 전체 · 창 하나), 사람 · 창 자리의 화면 좌표
//   walls = 같은 벽의 인식 대상들(벽 전체 · 창 하나씩) — k 번째 사람은 어느 대상에서나 같은 사람
export function talkFx(walls) {
  return ({ THREE, mindar, anchors }) => {
    const v3 = new THREE.Vector3();
    const vis = () => anchors.findIndex((a) => a.group.visible);
    const toScreen = (i, u, v) => {
      const c = mindar.container;
      v3.set(u - 0.5, (0.5 - v) * walls[i].ratio, 0).applyMatrix4(anchors[i].group.matrixWorld).project(mindar.camera);
      return [(v3.x * 0.5 + 0.5) * c.clientWidth, (1 - (v3.y * 0.5 + 0.5)) * c.clientHeight];
    };
    return {
      // 지금 잡혀 있는 대상: i(벽 전체 0 · 창 하나 1–3)와 그 대상이 가리키는 사람(창 하나면 그 창, 벽 전체면 null)
      target() { const i = vis(); return i < 0 ? null : { i, focus: walls[i].focus ?? null }; },
      // k 번째 사람의 화면 자리
      project(k) {
        const i = vis(); if (i < 0) return null;
        const s = walls[i].spots[k], [x, y] = toScreen(i, s.x, s.y);
        return { x, y };
      },
      // k 번째 창(영상 자리)의 화면 사각형
      clipRect(k) {
        const i = vis(); if (i < 0) return null;
        const [cx, cy, cw, ch] = walls[i].spots[k].clip;
        const pts = [toScreen(i, cx, cy), toScreen(i, cx + cw, cy), toScreen(i, cx, cy + ch), toScreen(i, cx + cw, cy + ch)];
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
        return { l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) };
      },
    };
  };
}

// 화면 층: 누를 자리(보이지 않음) · 인식 표시 · 창이 커지는 막(영상 · 말풍선 · 건너뛰기)
//   카메라: 비추는 그 창(창 하나를 비추면 그 창, 벽 전체면 화면 가운데에 가장 가까운 창)이 0.4초 그대로면 그 창이 커져 재생된다.
//     재생 중에는 폰을 움직여도 끝까지(또는 건너뛰기). 끝나면 그 창 자리로 돌아간다. 같은 창은 벗어났다 다시 비추면 다시
//   카메라 없이 고르기: 화면의 그 벽 그림에서 사람(창)을 누르면 그 창이
export function startTalk(ui, wall, { base, onHeard }) {
  const host = ui.el, token = {}, heard = new Set();
  host.querySelector('.talk-layer')?.remove();
  host.querySelector('.t-big')?.remove();
  const layer = document.createElement('div');
  layer.className = 'talk-layer';
  const sim = host.classList.contains('sim-on') || !ui.fx?.project;
  layer.innerHTML = `${wall.spots.map((s, k) => `<button class="t-hit" type="button" aria-label="인물 ${k + 1}"></button>`).join('')}<p class="t-ok"><i></i>인식했어요</p>`;
  host.appendChild(layer);
  const hits = [...layer.querySelectorAll('.t-hit')], ok = layer.querySelector('.t-ok');
  // 창이 커지는 막
  const big = document.createElement('div');
  big.className = 't-big';
  big.innerHTML = `<div class="tb-bg"></div><div class="tb-win"><video playsinline muted preload="auto"></video></div><div class="t-bub"></div><button class="tb-skip" type="button">건너뛰기</button>`;
  host.appendChild(big);
  const bg = big.querySelector('.tb-bg'), win = big.querySelector('.tb-win'), bub = big.querySelector('.t-bub'), skipBtn = big.querySelector('.tb-skip');
  const vids = wall.spots.map((s) => (s.video ? winVideo(s.video) : null));     // 미리 받아 둔다
  const pos = wall.spots.map(() => null);
  const TOP = 76;
  let raf = 0, run = 0, busy = false, region = -1, want = -1, wantT = 0, skip = null;

  // 창의 화면 사각형: 카메라면 추적 자리, 카메라 없이면 화면의 벽 그림 위 자리
  const clipRect = (k) => {
    if (!sim) return ui.fx?.clipRect?.(k) || null;
    const r = ui.simRect?.(); if (!r) return null;
    const [cx, cy, cw, ch] = wall.spots[k].clip, W = r.r - r.l, H = r.b - r.t;
    return { l: r.l + cx * W, t: r.t + cy * H, r: r.l + (cx + cw) * W, b: r.t + (cy + ch) * H };
  };
  // 커진 자리: 화면 폭 가득(창 영상은 정사각), 제목 줄 아래 · 화면 가운데
  const bigRect = () => {
    const W = innerWidth, H = innerHeight, side = Math.min(W, H - TOP - 140), t = Math.max(TOP + 8, (H - side) / 2 - 30);
    return { l: (W - side) / 2, t, r: (W + side) / 2, b: t + side };
  };
  const kf = (r) => ({ left: `${r.l}px`, top: `${r.t}px`, width: `${r.r - r.l}px`, height: `${r.b - r.t}px` });
  const EASE = 'cubic-bezier(.65,0,.25,1)';

  // 지금 비추는 창(사람 번호) — 없으면 -1
  const regionNow = () => {
    const t = ui.fx?.target?.();
    if (!t) return -1;
    if (t.focus != null) return t.focus;
    let best = -1, bd = Infinity;
    const cx = innerWidth / 2, cy = innerHeight * 0.45;
    pos.forEach((p, k) => {
      if (!p || p.x < 0 || p.x > innerWidth || p.y < 0 || p.y > innerHeight) return;
      const d = Math.hypot(p.x - cx, p.y - cy);
      if (d < bd) { bd = d; best = k; }
    });
    return best;
  };
  const place = () => {
    if (token.dead) return;
    const r = sim ? ui.simRect?.() : null;
    wall.spots.forEach((s, k) => {
      const p = sim ? (r ? { x: r.l + s.x * (r.r - r.l), y: r.t + s.y * (r.b - r.t) } : null) : ui.fx.project(k);
      if (p) pos[k] = p;
      if (pos[k]) hits[k].style.transform = `translate(${pos[k].x}px, ${pos[k].y}px)`;
    });
    // 카메라: 비추는 창이 0.4초 그대로면 그 창(재생 중이면 기다린다). 아무 창도 안 보이면(0.6초) 다음에 같은 창도 다시 재생되게
    if (!sim && !busy) {
      const now = performance.now(), w = regionNow();
      if (w !== want) { want = w; wantT = now; }
      if (want !== region && now - wantT > (want < 0 ? 600 : 400)) { region = want; if (region >= 0) speakTo(region); }
    }
    raf = requestAnimationFrame(place);
  };
  place();

  // 말풍선: 커진 창 안 그 사람 위에(위가 모자라면 창 윗부분)
  const placeBub = (k, R) => {
    const s = wall.spots[k], [cx, cy, cw, ch] = s.clip;
    const px = R.l + ((s.x - cx) / cw) * (R.r - R.l), py = R.t + ((s.y - cy) / ch) * (R.b - R.t);
    const bw = bub.offsetWidth, bh = bub.offsetHeight, W = innerWidth;
    const x = Math.max(12, Math.min(W - bw - 12, px - bw / 2)), y = Math.max(R.t + 12, py - 44 - bh);
    bub.style.transform = `translate(${x}px, ${y}px)`;
    bub.style.setProperty('--tail', `${Math.max(18, Math.min(bw - 18, px - x))}px`);
  };

  // 그 창: 자리에서 커지며 재생 → 말 → 끝나면 그 창 자리로 돌아간다
  const speakTo = async (k) => {
    const s = wall.spots[k], v = vids[k];
    if (!v) return;
    const my = ++run; busy = true; stopVoice();
    const from = clipRect(k) || bigRect(), to = bigRect();
    win.innerHTML = ''; win.appendChild(v); v.className = '';
    try { v.pause(); v.currentTime = 0; } catch {}
    win.getAnimations().forEach((a) => a.cancel()); bg.getAnimations().forEach((a) => a.cancel());
    Object.assign(win.style, kf(from)); bub.classList.remove('on');
    big.classList.add('on'); host.classList.add('t-bigon');
    const done = new Promise((res) => { skip = res; });
    win.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'forwards' });
    bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
    await win.animate([kf(from), kf(to)], { duration: 900, easing: EASE, fill: 'forwards' }).finished.catch(() => {});
    if (my !== run || token.dead) return;
    v.play().catch(() => {});
    bub.textContent = s.line; void bub.offsetWidth; placeBub(k, to); bub.classList.add('on');
    await Promise.race([speak(base + s.audio, s.line.length).then(() => ended(v, 1500)), done]);
    if (my !== run || token.dead) return;
    stopVoice(); bub.classList.remove('on');
    // 돌아가기: 지금 비추고 있는 그 창 자리로(놓쳤으면 처음 자리로)
    const back = clipRect(k) || from;
    bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 800, easing: 'ease-in', fill: 'forwards' });
    win.animate([kf(to), kf(back)], { duration: 800, easing: EASE, fill: 'forwards' });
    await win.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 800, fill: 'forwards' }).finished.catch(() => {});
    if (my !== run || token.dead) return;
    try { v.pause(); } catch {}
    big.classList.remove('on'); host.classList.remove('t-bigon');
    busy = false;
    heard.add(k);
    onHeard?.(heard.size, wall.spots.length);
  };
  skipBtn.onclick = () => skip?.();
  hits.forEach((h, k) => { h.onclick = () => { if (!busy) speakTo(k); }; });
  ok.classList.add('on'); setTimeout(() => ok.classList.remove('on'), 1800);
  return () => { token.dead = true; run++; cancelAnimationFrame(raf); stopVoice(); vids.forEach((v) => { try { v?.pause(); } catch {} }); layer.remove(); big.remove(); host.classList.remove('t-bigon'); };
}
