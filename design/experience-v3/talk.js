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

// three 장면: 창 영상(벽 위 그 창 자리에 겹친 판, 유리 자리만 보이게) — 나머지는 카메라에 비친 벽 그대로(덧칠하지 않는다)
//   walls = 같은 벽의 인식 대상들(벽 전체 · 창 하나씩) — k 번째 사람은 어느 대상에서나 같은 사람. 영상은 사람마다 하나를 같이 쓰고,
//   지금 잡힌 대상(maxTrack 1 이라 하나) 위에 그린다. 창 하나로 시작했다가 옆 창으로 옮겨 가도 이어진다
export function talkFx(walls) {
  return ({ THREE, mindar, anchors }) => {
    const v3 = new THREE.Vector3();
    const vids = [], shared = new Map();
    const vidOf = (src) => { if (!shared.has(src)) { const v = winVideo(src); shared.set(src, { v, tex: new THREE.VideoTexture(v) }); } return shared.get(src); };
    walls.forEach((w, i) => {
      w.spots.forEach((s, k) => {
        if (s.video) {
          const { v, tex } = vidOf(s.video), [cx, cy, cw, ch] = s.clip, [gx, gy, gw, gh] = s.glass;
          const mat = new THREE.ShaderMaterial({
            transparent: true, depthWrite: false,
            uniforms: { map: { value: tex }, g: { value: new THREE.Vector4(gx, 1 - gy - gh, gx + gw, 1 - gy) }, f: { value: 0.025 }, on: { value: 0 } },
            vertexShader: 'varying vec2 q; void main(){ q = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
            fragmentShader: 'uniform sampler2D map; uniform vec4 g; uniform float f, on; varying vec2 q; void main(){ float a = smoothstep(g.x, g.x + f, q.x) * (1. - smoothstep(g.z - f, g.z, q.x)) * smoothstep(g.y, g.y + f, q.y) * (1. - smoothstep(g.w - f, g.w, q.y)); gl_FragColor = vec4(texture2D(map, q).rgb, a * on); }',
          });
          const m = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch * w.ratio), mat);
          m.position.set(cx + cw / 2 - 0.5, (0.5 - cy - ch / 2) * w.ratio, 0.0008); anchors[i].group.add(m); vids.push({ v, m, i, k });
        }
      });
    });
    let active = -1;
    return {
      setActive(k) {
        active = k;
        const o = vids.find((o) => o.k === k); if (o) playFromStart(o.v);
      },
      video(k) { return vids.find((o) => o.k === k)?.v || null; },
      tick() {
        const live = new Set();
        vids.forEach((o) => {
          const on = anchors[o.i].group.visible && active === o.k, u = o.m.material.uniforms;
          u.on.value += ((on ? 1 : 0) - u.on.value) * (on ? 0.25 : 0.08);
          if (on || u.on.value >= 0.01) live.add(o.v);
        });
        vids.forEach((o) => { if (!live.has(o.v) && active !== o.k && !o.v.paused) o.v.pause(); });
      },
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
//   인식되면 작은 '인식' 표시와 함께 바로 대화가 시작된다 — start 번째 사람부터 차례로(창 하나를 비췄으면 그 창부터). 사람을 누르면 그 사람으로 넘어간다
export function startTalk(ui, wall, { base, onHeard, start = 0 }) {
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
  const place = () => {
    if (token.dead) return;
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
  // k 부터 차례로: 한 사람이 끝나면 아직 안 들은 다음 사람(창 순서대로 돌아서). 누르면 거기서 다시 이어 간다
  const chain = async (k) => {
    if (!(await speakTo(k))) return;
    const n = wall.spots.length, next = [...Array(n).keys()].map((j) => (k + 1 + j) % n).find((j) => !heard.has(j));
    if (next == null) return;
    const my = run; await wait(500);
    if (my === run && !token.dead) chain(next);
  };
  hits.forEach((h, k) => { h.onclick = () => chain(k); });
  ok.classList.add('on'); setTimeout(() => ok.classList.remove('on'), 1800);
  setTimeout(() => { if (!token.dead && run === 0) chain(Math.min(start, wall.spots.length - 1)); }, 650);
  return () => { token.dead = true; run++; cancelAnimationFrame(raf); stopVoice(); ui.fx?.setActive?.(-1); unzoom(); layer.remove(); };
}
