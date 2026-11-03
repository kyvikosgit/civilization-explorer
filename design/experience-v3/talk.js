// 벽면 인물 대화 AR — 카페 게르부아 · 박람회 벽면을 비추고, 그 벽의 사람을 누르면 그 창만 움직이며 그 사람이 말한다(말풍선 + 목소리)
// 대사 · 인물 자리는 체험장치 기획서(260928) 22–25쪽. 목소리는 임시 합성음(audio/) — 성우로 교체
// 창 영상(spots[].video)은 그 벽 그림의 그 창을 잘라 만든 영상만 쓴다 — 첫 장면 = 벽 그림 그 자리, clip(벽 안 영상 자리) · glass(영상 안 창 유리 자리)
// 영상이 없는 벽은 창 불빛 · 말풍선만
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 소리: 폰은 사용자가 누른 순간에만 재생을 허락한다 — [카메라 켜기]에서 같은 Audio 를 한 번 열어 둔다
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

// three 장면: 창 영상 — 그 창 유리 자리에 영상을 통째로 깔고, 색·밝기를 카메라에 비친 그 창에 맞춘다(해리포터의 움직이는 그림처럼)
//   경계는 그림 속 창틀 그대로라 자연스럽고, 영상 안을 잘라내지 않는다(색 차이로 잘라내면 폰 카메라 잡음에 얼룩덜룩 잘린다)
//   색 맞춤: 카메라에 비친 그 창 유리 자리와 영상 첫 장면 유리 자리의 채널별 평균·흩어짐을 재서(0.25초마다, 부드럽게)
//     영상 색 = (영상 − 첫 장면 평균) × (카메라 흩어짐 ÷ 첫 장면 흩어짐) + 카메라 평균
//   walls = 같은 벽의 인식 대상들(벽 전체 · 창 하나씩) — k 번째 사람은 어느 대상에서나 같은 사람. 영상은 사람마다 하나를 같이 쓰고,
//   지금 잡힌 대상(maxTrack 1 이라 하나) 위에 그린다
const FRAG = `
uniform sampler2D map; uniform vec4 g; uniform vec3 mA, sA, mB, sB; uniform float f, on;
varying vec2 q;
void main(){
  float a = smoothstep(g.x, g.x + f, q.x) * (1. - smoothstep(g.z - f, g.z, q.x)) * smoothstep(g.y, g.y + f, q.y) * (1. - smoothstep(g.w - f, g.w, q.y));
  vec3 v = texture2D(map, q).rgb;
  vec3 o = clamp((v - mA) * (sB / max(sA, vec3(.01))) + mB, 0., 1.);
  gl_FragColor = vec4(o, a * on);
}`;
export function talkFx(walls) {
  return ({ THREE, mindar, anchors }) => {
    const v3 = new THREE.Vector3();
    const vids = [], shared = new Map();
    // 작은 캔버스에 줄여 그려 채널별 평균·흩어짐(0–1)을 잰다
    const box = document.createElement('canvas'); box.width = box.height = 32;
    const bx = box.getContext('2d', { willReadFrequently: true });
    const stats = (img, sx, sy, sw, sh) => {
      bx.clearRect(0, 0, 32, 32); bx.drawImage(img, sx, sy, sw, sh, 0, 0, 32, 32);
      const d = bx.getImageData(0, 0, 32, 32).data, n = d.length / 4, m = [0, 0, 0], q = [0, 0, 0];
      for (let p = 0; p < d.length; p += 4) for (let j = 0; j < 3; j++) { const x = d[p + j] / 255; m[j] += x; q[j] += x * x; }
      return { m: m.map((x) => x / n), s: q.map((x, j) => Math.sqrt(Math.max(0, x / n - (m[j] / n) ** 2))) };
    };
    // 영상 첫 장면(= 벽 그림 그 창) 유리 자리의 색 — 영상마다 한 번
    const vidOf = (src) => {
      if (shared.has(src)) return shared.get(src);
      const v = winVideo(src), o = { v, tex: new THREE.VideoTexture(v), ref: null };
      v.addEventListener('loadeddata', () => { o.ready = true; }, { once: true });
      shared.set(src, o); return o;
    };
    walls.forEach((w, i) => {
      w.spots.forEach((s, k) => {
        if (!s.video) return;
        const o = vidOf(s.video), [cx, cy, cw, ch] = s.clip, [gx, gy, gw, gh] = s.glass;
        const mat = new THREE.ShaderMaterial({
          transparent: true, depthWrite: false,
          uniforms: { map: { value: o.tex }, g: { value: new THREE.Vector4(gx, 1 - gy - gh, gx + gw, 1 - gy) }, f: { value: 0.03 }, on: { value: 0 },
            mA: { value: new THREE.Vector3(0.5, 0.5, 0.5) }, sA: { value: new THREE.Vector3(1, 1, 1) }, mB: { value: new THREE.Vector3(0.5, 0.5, 0.5) }, sB: { value: new THREE.Vector3(1, 1, 1) } },
          vertexShader: 'varying vec2 q; void main(){ q = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
          fragmentShader: FRAG,
        });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch * w.ratio), mat);
        m.position.set(cx + cw / 2 - 0.5, (0.5 - cy - ch / 2) * w.ratio, 0.0008); anchors[i].group.add(m);
        vids.push({ v: o.v, o, m, i, k, s, glass: [cx + gx * cw, cy + gy * ch, gw * cw, gh * ch], cam: null });
      });
    });
    const toScreen = (i, u, v) => {
      const w = walls[i], c = mindar.container;
      v3.set(u - 0.5, (0.5 - v) * w.ratio, 0).applyMatrix4(anchors[i].group.matrixWorld).project(mindar.camera);
      return [(v3.x * 0.5 + 0.5) * c.clientWidth, (1 - (v3.y * 0.5 + 0.5)) * c.clientHeight];
    };
    // 영상 첫 장면 유리 자리(영상 좌표)
    const refOf = (o) => {
      if (o.o.ref || !o.o.ready || !o.v.videoWidth || o.v.currentTime > 0.05) return o.o.ref;
      const [gx, gy, gw, gh] = o.s.glass, W = o.v.videoWidth, H = o.v.videoHeight;
      try { o.o.ref = stats(o.v, gx * W, gy * H, gw * W, gh * H); } catch {}
      return o.o.ref;
    };
    // 카메라에 비친 그 창 유리 자리(카메라 영상 좌표)
    const camOf = (o) => {
      const cv = mindar.video, ct = mindar.container;
      if (!cv || !cv.videoWidth || !ct) return null;
      const a = cv.getBoundingClientRect(), b = ct.getBoundingClientRect();
      const [gx, gy, gw, gh] = o.glass, pts = [toScreen(o.i, gx, gy), toScreen(o.i, gx + gw, gy), toScreen(o.i, gx, gy + gh), toScreen(o.i, gx + gw, gy + gh)];
      const xs = pts.map((p) => p[0] + b.left - a.left), ys = pts.map((p) => p[1] + b.top - a.top);
      const kx = cv.videoWidth / a.width, ky = cv.videoHeight / a.height;
      // 유리 안쪽 80%만 — 창틀이 섞이지 않게
      let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const ix = (x1 - x0) * 0.1, iy = (y1 - y0) * 0.1; x0 += ix; x1 -= ix; y0 += iy; y1 -= iy;
      let sx = x0 * kx, sy = y0 * ky, sw = (x1 - x0) * kx, sh = (y1 - y0) * ky;
      sx = Math.max(0, sx); sy = Math.max(0, sy); sw = Math.min(cv.videoWidth - sx, sw); sh = Math.min(cv.videoHeight - sy, sh);
      if (sw < 12 || sh < 12) return null;
      try { return stats(cv, sx, sy, sw, sh); } catch { return null; }
    };
    let active = -1, last = 0;
    return {
      setActive(k) {
        active = k;
        const o = vids.find((o) => o.k === k); if (o) playFromStart(o.v);
      },
      video(k) { return vids.find((o) => o.k === k)?.v || null; },
      tick() {
        const now = performance.now(), measure = now - last > 250;
        if (measure) last = now;
        const live = new Set();
        vids.forEach((o) => {
          const vis = anchors[o.i].group.visible, on = vis && active === o.k, u = o.m.material.uniforms;
          u.on.value += ((on ? 1 : 0) - u.on.value) * (on ? 0.25 : 0.2);   // 끝날 때도 빨리 거둬 겹쳐 보이는 시간을 줄인다
          if (on || u.on.value >= 0.01) live.add(o.v);
          const ref = refOf(o);
          if (ref) u.mA.value.fromArray(ref.m), u.sA.value.fromArray(ref.s);
          // 색 맞춤: 보이는 창은 0.25초마다 카메라 쪽을 다시 재서 부드럽게 따라간다(처음 잰 값은 바로)
          if (measure && vis && ref) {
            const c = camOf(o);
            if (c) {
              const k = o.cam ? 0.35 : 1;
              o.cam = o.cam || { m: [...c.m], s: [...c.s] };
              for (let j = 0; j < 3; j++) { o.cam.m[j] += (c.m[j] - o.cam.m[j]) * k; o.cam.s[j] += (c.s[j] - o.cam.s[j]) * k; }
            }
          }
          const cam = o.cam || ref;
          if (cam) {
            u.mB.value.fromArray(cam.m);
            // 대비는 0.5–1.6배 안에서만(카메라가 아주 흐리거나 하이라이트가 날아가도 영상이 뭉개지지 않게)
            u.sB.value.fromArray(cam.s.map((x, j) => Math.min(1.6 * (ref ? ref.s[j] : x), Math.max(0.5 * (ref ? ref.s[j] : x), x))));
          }
        });
        vids.forEach((o) => { if (!live.has(o.v) && active !== o.k && !o.v.paused) o.v.pause(); });
      },
      // 지금 잡혀 있는 대상: i(벽 전체 0 · 창 하나 1–3)와 그 대상이 가리키는 사람(창 하나면 그 창, 벽 전체면 null)
      target() { const i = anchors.findIndex((a) => a.group.visible); return i < 0 ? null : { i, focus: walls[i].focus ?? null }; },
      // k 번째 사람의 화면 자리 — 지금 잡혀 있는 대상 기준
      project(k) {
        const i = anchors.findIndex((a) => a.group.visible);
        if (i < 0) return null;
        const s = walls[i].spots[k], c = mindar.container;
        v3.set(s.x - 0.5, (0.5 - s.y) * walls[i].ratio, 0).applyMatrix4(anchors[i].group.matrixWorld).project(mindar.camera);
        return { x: (v3.x * 0.5 + 0.5) * c.clientWidth, y: (1 - (v3.y * 0.5 + 0.5)) * c.clientHeight };
      },
    };
  };
}

// 화면 층: 누를 자리(보이지 않음) · 말풍선 · 인식 표시 · (카메라 없이 고르기) 창 영상
//   카메라: 벽 위 자리를 three 로 투영 / 카메라 없이 고르기: 화면에 보이는 그 벽 그림(sim-art) 위 자리 그대로
//   카메라 없이 고르기에서는 벽 그림이 폰 화면 안에 작게 보이니, 그 창으로 다가가듯 확대했다가 말이 끝나면 돌아온다(실제 벽 앞에선 다가가면 된다)
//   카메라: 비추는 그 창의 영상·대사만 재생한다(창 하나를 비추면 그 창, 벽 전체면 화면 가운데에 가장 가까운 창). 그 창에서 벗어나면 바로 멈추고,
//   다른 창으로 옮기면 그 창으로 바뀐다. 한 번 끝난 창은 벗어났다 다시 비출 때 다시 재생. 자동으로 다음 사람으로 넘어가지 않는다
//   카메라 없이 고르기: 사람을 누르면 그 사람
export function startTalk(ui, wall, { base, onHeard }) {
  const host = ui.el, token = {}, heard = new Set();
  host.querySelector('.talk-layer')?.remove();
  const layer = document.createElement('div');
  layer.className = 'talk-layer';
  const sim = host.classList.contains('sim-on') || !ui.fx?.project;
  layer.innerHTML = `<i class="t-glow"></i>${wall.spots.map((s, k) => `<button class="t-hit" type="button" aria-label="인물 ${k + 1}"></button>`).join('')}<div class="t-bub"></div><p class="t-ok"><i></i>인식했어요</p>`;
  host.appendChild(layer);
  const hits = [...layer.querySelectorAll('.t-hit')], bub = layer.querySelector('.t-bub'), glow = layer.querySelector('.t-glow'), ok = layer.querySelector('.t-ok');
  const wins = wall.spots.map((s) => {
    if (!sim || !s.video) return null;
    const v = winVideo(s.video); v.className = 't-win';
    const [gx, gy, gw, gh] = s.glass, f = 0.025, p = (n) => `${(n * 100).toFixed(2)}%`;
    v.style.webkitMaskImage = v.style.maskImage = `linear-gradient(to right, transparent ${p(gx)}, #000 ${p(gx + f)}, #000 ${p(gx + gw - f)}, transparent ${p(gx + gw)}), linear-gradient(to bottom, transparent ${p(gy)}, #000 ${p(gy + f)}, #000 ${p(gy + gh - f)}, transparent ${p(gy + gh)})`;
    layer.prepend(v); return v;
  });
  const pos = wall.spots.map(() => null);
  const TOP = 76, stage = host.querySelector('.sim');
  let active = -1, raf = 0, run = 0, zoom = { s: 1, x: 0, y: 0 };
  let region = -1, want = -1, wantT = 0;
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
    // 카메라: 비추는 창이 0.4초 그대로면 그 창 재생, 0.6초 동안 아무 창도 안 보이면 멈춤(인식이 잠깐 끊기는 건 무시)
    if (!sim) {
      const now = performance.now(), w = regionNow();
      if (w !== want) { want = w; wantT = now; }
      if (want !== region && now - wantT > (want < 0 ? 600 : 400)) {
        region = want;
        if (region < 0) hush(); else speakTo(region);
      }
    }
    const r = sim ? ui.simRect?.() : null;
    wall.spots.forEach((s, k) => {
      if (wins[k] && r) {
        const W = r.r - r.l, H = r.b - r.t, [cx, cy, cw, ch] = s.clip;
        Object.assign(wins[k].style, { left: `${r.l + cx * W}px`, top: `${r.t + cy * H}px`, width: `${cw * W}px`, height: `${ch * H}px` });
      }
      const p = sim ? (r ? { x: r.l + s.x * (r.r - r.l), y: r.t + s.y * (r.b - r.t) } : null) : ui.fx.project(k);
      if (p) pos[k] = sim ? p : (pos[k] ? { x: pos[k].x + (p.x - pos[k].x) * 0.2, y: pos[k].y + (p.y - pos[k].y) * 0.2 } : p);
      if (pos[k]) hits[k].style.transform = `translate(${pos[k].x}px, ${pos[k].y}px)`;
    });
    if (active >= 0 && pos[active]) {
      const a = pos[active];
      glow.style.left = `${a.x}px`; glow.style.top = `${a.y}px`;   // transform 은 숨쉬기 애니메이션이 쓴다
      // 말풍선은 그 사람 위에. 위가 모자라면(상단 제목 줄과 겹치면) 아래로
      //   창 영상을 크게 볼 때는 창 윗부분(샹들리에 쪽)에 — 얼굴을 가리지 않게
      const W = innerWidth, bw = bub.offsetWidth, bh = bub.offsetHeight, s = wall.spots[active];
      const gTop = wins[active]?.classList.contains('on') && r ? r.t + (s.clip[1] + s.glass[1] * s.clip[3]) * (r.b - r.t) + 14 : null;
      const high = gTop != null && gTop + bh < a.y - 70 ? Math.max(TOP, gTop) : null;
      const below = high == null && a.y - 40 - bh < TOP;
      const x = Math.max(12, Math.min(W - bw - 12, a.x - bw / 2)), y = high ?? (below ? a.y + 40 : a.y - 40 - bh);
      bub.classList.toggle('below', below);
      bub.style.transform = `translate(${x}px, ${y}px)`;
      bub.style.setProperty('--tail', `${Math.max(18, Math.min(bw - 18, a.x - x))}px`);
    }
    raf = requestAnimationFrame(place);
  };
  place();
  // 카메라 없이: 누른 창이 화면 가운데(제목 줄과 아래 안내 사이)에 크게 오도록 벽 그림을 당겨 온다
  const zoomTo = (s) => {
    if (!sim || !stage) return;
    const r = ui.simRect?.(); if (!r) return;
    const bl = (r.l - zoom.x) / zoom.s, bt = (r.t - zoom.y) / zoom.s, bw = (r.r - r.l) / zoom.s, bh = (r.b - r.t) / zoom.s;   // 확대 전 자리
    const [cx, cy, cw, ch] = s.clip, [gx, gy, gw, gh] = s.glass;
    const g = { x: bl + (cx + gx * cw) * bw, y: bt + (cy + gy * ch) * bh, w: gw * cw * bw, h: gh * ch * bh };
    const dock = host.querySelector('.docent')?.getBoundingClientRect(), bottom = dock && dock.height ? dock.top - 14 : innerHeight - 24;
    const top = TOP + 8, k = Math.max(1, Math.min((innerWidth * 0.64) / g.w, (bottom - top) / g.h));
    zoom = { s: k, x: innerWidth / 2 - k * (g.x + g.w / 2), y: (top + bottom) / 2 - k * (g.y + g.h / 2) };
    stage.style.transformOrigin = '0 0';
    stage.style.transform = `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`;
    host.classList.add('t-zoomed');
  };
  const unzoom = () => {
    if (!stage) return;
    zoom = { s: 1, x: 0, y: 0 }; stage.style.transform = ''; host.classList.remove('t-zoomed');
  };
  // 누른 사람: 그 창만 움직이고(그 창 영상) 그 사람이 말한다. 다른 사람을 누르면 바로 바뀐다
  const speakTo = async (k) => {
    const my = ++run;
    stopVoice();
    wins.forEach((v, j) => { if (v && j !== k) { v.classList.remove('on'); v.pause(); } });
    active = k; ui.fx?.setActive?.(k);
    const s = wall.spots[k];
    if (wins[k]) { zoomTo(s); playFromStart(wins[k]); wins[k].classList.add('on'); }
    else if (!s.video) glow.classList.add('on');            // 창 영상이 없는 벽은 그 자리에 불빛만
    bub.textContent = s.line; bub.classList.remove('on'); void bub.offsetWidth; bub.classList.add('on');
    await speak(base + s.audio, s.line.length);
    if (my !== run || token.dead) return;
    bub.classList.remove('on');
    await ended(wins[k] || ui.fx?.video?.(k), 1500);   // 영상이 조금 남았으면 마저 보고
    if (my !== run || token.dead) return;
    wins[k]?.classList.remove('on'); glow.classList.remove('on'); unzoom();
    active = -1; ui.fx?.setActive?.(-1);
    heard.add(k); onHeard?.(heard.size, wall.spots.length);
    return true;
  };
  // 멈춤: 비추던 창에서 벗어났을 때 — 대사·말풍선·영상을 바로 거둔다
  function hush() {
    run++; stopVoice();
    bub.classList.remove('on'); glow.classList.remove('on');
    wins.forEach((v) => { if (v) { v.classList.remove('on'); v.pause(); } });
    active = -1; ui.fx?.setActive?.(-1); unzoom();
  }
  hits.forEach((h, k) => { h.onclick = () => speakTo(k); });
  ok.classList.add('on'); setTimeout(() => ok.classList.remove('on'), 1800);
  return () => { token.dead = true; run++; cancelAnimationFrame(raf); stopVoice(); ui.fx?.setActive?.(-1); unzoom(); layer.remove(); };
}
