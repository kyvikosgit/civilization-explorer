// 벽면 인물 대화 AR — 카페 게르부아 · 박람회 벽면을 비추고, 그 벽의 사람을 누르면 그 자리만 움직이며 그 사람이 말한다(말풍선 + 목소리)
// 대사 · 인물 자리는 체험장치 기획서(260928) 22–25쪽. 목소리는 임시 합성음(audio/) — 성우로 교체
// 벽 영상(walls[].video)은 그 벽 그림 자체로 만든 영상만 쓴다 — 다른 그림 · 다른 영상을 끼워 넣지 말 것. 영상이 없으면 창 불빛 · 고리 · 말풍선만
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

// three 장면: 말하는 사람의 창에 따뜻한 빛
export function talkFx(walls) {
  return ({ THREE, mindar, anchors }) => {
    const v3 = new THREE.Vector3();
    const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(255,190,110,.9)'); g.addColorStop(1, 'rgba(255,170,80,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
    const glows = [], vids = [];
    walls.forEach((w, i) => {
      if (w.video) {                                     // 같은 구도의 벽 영상 — 누른 사람 자리만 보이게(타원 마스크)
        const v = document.createElement('video');
        Object.assign(v, { src: w.video, loop: true, muted: true, playsInline: true, crossOrigin: 'anonymous' }); v.setAttribute('playsinline', '');
        const mat = new THREE.ShaderMaterial({
          transparent: true, depthWrite: false,
          uniforms: { map: { value: new THREE.VideoTexture(v) }, c: { value: new THREE.Vector2(0.5, 0.5) }, r: { value: new THREE.Vector2(0.14, 0.22) }, on: { value: 0 } },
          vertexShader: 'varying vec2 q; void main(){ q = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
          fragmentShader: 'uniform sampler2D map; uniform vec2 c, r; uniform float on; varying vec2 q; void main(){ vec2 d = (q - c) / r; float a = 1. - smoothstep(.55, 1., length(d)); gl_FragColor = vec4(texture2D(map, q).rgb, a * on); }',
        });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, w.ratio), mat);
        m.position.z = 0.0005; anchors[i].group.add(m); vids.push({ v, m, i, w });
      }
      if (!w.windows) return;
      w.spots.forEach((s, k) => {
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(w.windows.w * 1.7, w.windows.w * 1.7), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3 }));
        glow.position.set(s.x - 0.5, (0.5 - s.y) * w.ratio, 0.001); anchors[i].group.add(glow); glows.push({ m: glow, k });
      });
    });
    let active = -1;
    return {
      setActive(k) { active = k; },
      tick(t) {
        const now = t || 0;
        vids.forEach((o) => {
          const vis = anchors[o.i].group.visible, sp = o.w.spots[active], u = o.m.material.uniforms;
          if (vis && o.v.paused) o.v.play().catch(() => {});
          if (sp) { u.c.value.set(sp.x, 1 - sp.y); u.r.value.set(o.w.region?.w || 0.14, o.w.region?.h || 0.22); }
          u.on.value += ((vis && sp ? 1 : 0) - u.on.value) * 0.08;
        });
        glows.forEach((o) => { o.m.material.opacity = (active === o.k ? 0.62 : 0.28) + 0.05 * Math.sin(now * 2.4 + o.k); });
      },
      project(i, s) {
        const w = walls[i], c = mindar.container;
        v3.set(s.x - 0.5, (0.5 - s.y) * w.ratio, 0).applyMatrix4(anchors[i].group.matrixWorld).project(mindar.camera);
        return anchors[i].group.visible ? { x: (v3.x * 0.5 + 0.5) * c.clientWidth, y: (1 - (v3.y * 0.5 + 0.5)) * c.clientHeight } : null;
      },
    };
  };
}

// 화면 층: 누를 자리(보이지 않음) · 누른 자리의 움직임 · 말풍선. 글자는 또렷해야 하니 화면 요소로, 위치만 벽을 따라간다
//   카메라: 벽 위 자리를 three 로 투영 / 카메라 없이 고르기: 화면에 보이는 그 벽 그림(sim-art) 위 자리 그대로
export function startTalk(ui, wall, { base, onHeard }) {
  const host = ui.el, token = {}, heard = new Set();
  host.querySelector('.talk-layer')?.remove();
  const layer = document.createElement('div');
  layer.className = 'talk-layer';
  const sim = host.classList.contains('sim-on') || !ui.fx?.project;
  layer.innerHTML = `${sim && wall.video ? `<video class="t-vid" src="${wall.video}" muted loop playsinline autoplay></video>` : ''}<i class="t-glow"></i>${wall.spots.map((s, k) => `<button class="t-hit" type="button" aria-label="인물 ${k + 1}"></button>`).join('')}<div class="t-bub"></div><p class="t-tip">말을 걸 사람을 눌러 보세요</p>`;
  host.appendChild(layer);
  const hits = [...layer.querySelectorAll('.t-hit')], bub = layer.querySelector('.t-bub'), vid = layer.querySelector('.t-vid'), glow = layer.querySelector('.t-glow'), tip = layer.querySelector('.t-tip');
  const pos = wall.spots.map(() => null);
  const TOP = 76;
  let active = -1, raf = 0, run = 0;
  const place = () => {
    if (token.dead) return;
    const r = sim ? ui.simRect?.() : null;
    if (vid && r) Object.assign(vid.style, { left: `${r.l}px`, top: `${r.t}px`, width: `${r.r - r.l}px`, height: `${r.b - r.t}px` });
    wall.spots.forEach((s, k) => {
      const p = sim ? (r ? { x: r.l + s.x * (r.r - r.l), y: r.t + s.y * (r.b - r.t) } : null) : ui.fx.project(wall.index, s);
      if (p) pos[k] = pos[k] ? { x: pos[k].x + (p.x - pos[k].x) * 0.2, y: pos[k].y + (p.y - pos[k].y) * 0.2 } : p;
      if (pos[k]) hits[k].style.transform = `translate(${pos[k].x}px, ${pos[k].y}px)`;
    });
    const top = Math.min(...pos.filter(Boolean).map((p) => p.y), innerHeight * 0.5);
    tip.style.top = `${Math.max(TOP, top - 70)}px`;
    if (active >= 0 && pos[active]) {
      const a = pos[active];
      glow.style.left = `${a.x}px`; glow.style.top = `${a.y}px`;   // transform 은 숨쉬기 애니메이션이 쓴다
      // 말풍선은 그 사람 위에. 위가 모자라면(상단 제목 줄과 겹치면) 아래로
      const W = innerWidth, bw = bub.offsetWidth, bh = bub.offsetHeight, below = a.y - 40 - bh < TOP;
      const x = Math.max(12, Math.min(W - bw - 12, a.x - bw / 2)), y = below ? a.y + 40 : a.y - 40 - bh;
      bub.classList.toggle('below', below);
      bub.style.transform = `translate(${x}px, ${y}px)`;
      bub.style.setProperty('--tail', `${Math.max(18, Math.min(bw - 18, a.x - x))}px`);
    }
    raf = requestAnimationFrame(place);
  };
  place();
  // 누른 사람: 그 자리만 움직이고(벽 영상의 그 부분) 그 사람이 말한다. 다른 사람을 누르면 바로 바뀐다
  const speakTo = async (k) => {
    const my = ++run;
    stopVoice(); tip.classList.add('off');
    active = k; ui.fx?.setActive?.(k);
    const s = wall.spots[k];
    if (vid) { vid.style.setProperty('--mx', `${s.x * 100}%`); vid.style.setProperty('--my', `${s.y * 100}%`); vid.style.setProperty('--rw', `${(wall.region?.w || 0.14) * 100}%`); vid.style.setProperty('--rh', `${(wall.region?.h || 0.22) * 100}%`); vid.classList.add('on'); vid.play().catch(() => {}); }
    else glow.classList.add('on');                        // 벽 영상이 아직 없으면 그 자리에 불빛만
    bub.textContent = s.line; bub.classList.remove('on'); void bub.offsetWidth; bub.classList.add('on');
    await speak(base + s.audio, s.line.length);
    if (my !== run || token.dead) return;
    bub.classList.remove('on'); vid?.classList.remove('on'); glow.classList.remove('on');
    active = -1; ui.fx?.setActive?.(-1);
    heard.add(k); onHeard?.(heard.size, wall.spots.length);
  };
  hits.forEach((h, k) => { h.onclick = () => speakTo(k); });
  return () => { token.dead = true; run++; cancelAnimationFrame(raf); stopVoice(); ui.fx?.setActive?.(-1); layer.remove(); };
}
