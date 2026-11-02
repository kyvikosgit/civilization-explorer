// 벽면 인물 대화 AR — 카페 게르부아 · 박람회 벽면을 비추면 창 안에서 사람들이 움직이고, 지정된 인물이 차례로 말한다(말풍선 + 목소리)
// 대사 · 인물 자리는 체험장치 기획서(260928) 22–25쪽. 목소리는 임시 합성음(audio/), 창 안 움직임은 전단지 삽화 영상(guerbois.mp4)의 실루엣 — 성우 · 실제 영상으로 교체
const VIDEO = '../../../booth/assets/video/guerbois.mp4';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 창마다 삽화의 다른 자리(u0, v0, 폭, 높이 — 영상 좌표, v 는 아래에서 위로)
const CROPS = [[0.5, 0.2, 0.46, 0.17], [0.26, 0.2, 0.46, 0.17], [0.04, 0.2, 0.46, 0.17]];

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

// three 장면: 창 안 실루엣과 따뜻한 빛
export function talkFx(walls) {
  return ({ THREE, mindar, anchors }) => {
    const v3 = new THREE.Vector3();
    const vid = document.createElement('video');
    Object.assign(vid, { src: VIDEO, loop: true, muted: true, playsInline: true, crossOrigin: 'anonymous' });
    vid.setAttribute('playsinline', ''); vid.setAttribute('muted', '');
    const tex = new THREE.VideoTexture(vid);
    const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(255,190,110,.9)'); g.addColorStop(1, 'rgba(255,170,80,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
    const mats = [], glows = [];
    walls.forEach((w, i) => {
      if (!w.windows) return;
      w.spots.forEach((s, k) => {
        const px = s.x - 0.5, py = (0.5 - s.y) * w.ratio, ww = w.windows.w, wh = w.windows.h;
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(ww * 1.7, ww * 1.7), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3 }));
        glow.position.set(px, py, 0.001); anchors[i].group.add(glow); glows.push({ m: glow, i, k });
        const crop = CROPS[k % CROPS.length];
        const m = new THREE.ShaderMaterial({
          transparent: true, depthWrite: false,
          uniforms: { map: { value: tex }, crop: { value: new THREE.Vector4(...crop) }, on: { value: 0 } },
          vertexShader: 'varying vec2 q; void main(){ q = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
          fragmentShader: `uniform sampler2D map; uniform vec4 crop; uniform float on; varying vec2 q;
            void main(){ vec3 c = texture2D(map, crop.xy + q * crop.zw).rgb; float l = dot(c, vec3(.3, .59, .11));
              float edge = smoothstep(0., .14, q.x) * smoothstep(0., .14, 1. - q.x) * smoothstep(0., .14, q.y) * smoothstep(0., .1, 1. - q.y);
              gl_FragColor = vec4(.13, .07, .04, smoothstep(.5, .2, l) * edge * on * .82); }`,
        });
        const p = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), m);
        p.position.set(px, py, 0.002); anchors[i].group.add(p); mats.push({ m, i, k });
      });
    });
    let active = -1;
    return {
      found() { vid.play().catch(() => {}); },
      setActive(k) { active = k; },
      tick(t) {
        const now = t || 0;
        mats.forEach((o) => { const want = anchors[o.i].group.visible ? (active === o.k ? 1 : 0.72) : 0; o.m.uniforms.on.value += (want - o.m.uniforms.on.value) * 0.06; });
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

// 화면 층: 인물 고리와 말풍선(글자는 또렷해야 하니 화면 요소로, 위치만 벽을 따라간다)
export function playTalk(ui, wall, { base, onEach, onEnd }) {
  const host = ui.el, token = {};
  host.querySelector('.talk-layer')?.remove();
  const layer = document.createElement('div');
  layer.className = 'talk-layer';
  const still = !ui.fx?.project || host.classList.contains('demo-on');
  layer.innerHTML = `${still ? `<img class="talk-still" src="${wall.img}" alt="">` : ''}${wall.spots.map(() => '<i class="t-ring"></i>').join('')}<div class="t-bub"></div>`;
  host.appendChild(layer);
  const rings = [...layer.querySelectorAll('.t-ring')], bub = layer.querySelector('.t-bub'), img = layer.querySelector('.talk-still');
  const pos = wall.spots.map(() => null);
  let active = -1, raf = 0;
  const place = () => {
    if (token.dead) return;
    wall.spots.forEach((s, k) => {
      let p = null;
      if (img) { const r = img.getBoundingClientRect(); p = { x: r.left + s.x * r.width, y: r.top + s.y * r.height }; } else p = ui.fx.project(wall.index, s);
      if (p) pos[k] = pos[k] ? { x: pos[k].x + (p.x - pos[k].x) * 0.16, y: pos[k].y + (p.y - pos[k].y) * 0.16 } : p;
      if (pos[k]) { rings[k].style.transform = `translate(${pos[k].x}px, ${pos[k].y}px)`; rings[k].style.opacity = 1; }
    });
    if (active >= 0 && pos[active]) {
      const W = innerWidth, bw = bub.offsetWidth, bh = bub.offsetHeight, a = pos[active];
      const x = Math.max(12, Math.min(W - bw - 12, a.x - bw / 2)), y = Math.max(64, a.y - bh - 40);
      bub.style.transform = `translate(${x}px, ${y}px)`;
      bub.style.setProperty('--tail', `${Math.max(18, Math.min(bw - 18, a.x - x))}px`);
    }
    raf = requestAnimationFrame(place);
  };
  place();
  (async () => {
    ui.fx?.found?.();
    for (let k = 0; k < wall.spots.length; k++) {
      if (token.dead) return;
      active = k; ui.fx?.setActive?.(k); onEach?.(k);
      rings.forEach((r, n) => r.classList.toggle('on', n === k));
      bub.textContent = wall.spots[k].line; bub.classList.remove('on'); void bub.offsetWidth; bub.classList.add('on');
      await speak(base + wall.spots[k].audio, wall.spots[k].line.length);
      if (token.dead) return;
      bub.classList.remove('on'); await wait(350);
    }
    active = -1; ui.fx?.setActive?.(-1); rings.forEach((r) => r.classList.remove('on'));
    if (!token.dead) onEnd?.();
  })();
  return () => { token.dead = true; cancelAnimationFrame(raf); stopVoice(); ui.fx?.setActive?.(-1); layer.remove(); };
}
