// ticket/fx.js 사본(C4 마그네슘 연기 · 밤안개에 씀 — 원본은 C2 것, 고치지 않는다)
// C2 효과 공용 — 증기(입자) · 붓자국 디졸브. 캔버스 2D만, 화면 해상도의 절반으로 그려서 60fps 를 지킨다.
//   createSteam(canvas): 연속 분출구(emitter) + 한 번 터지는 김(burst). 입자 = 미리 그린 뭉게 스프라이트 한 장을 키우며 흘려 보낸다.
//   brushDissolve(canvas, from, to): 사진 위에 굵은 붓자국으로 그림이 칠해진다(C3 와 같은 결 붓).

const rnd = (a, b) => a + Math.random() * (b - a);

// 뭉게구름 한 장 — 둥근 그라데이션 여러 개를 겹쳐 가장자리가 울퉁불퉁한 김
function puffSprite(tint) {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, d = Math.random() * S * 0.2, r = S * rnd(0.16, 0.3);
    const x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${tint},.26)`); gr.addColorStop(0.55, `rgba(${tint},.1)`); gr.addColorStop(1, `rgba(${tint},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  return c;
}

export function createSteam(canvas, { res = 0.5, tints = ['236,238,246', '214,220,240', '250,244,232'] } = {}) {
  const ctx = canvas.getContext('2d');
  const sprites = tints.map(puffSprite);
  let W = 0, H = 0, raf = 0, last = 0, running = false;
  const parts = [], emitters = [];
  function resize() {
    const r = canvas.getBoundingClientRect(); W = r.width; H = r.height;
    canvas.width = Math.max(2, Math.round(W * res)); canvas.height = Math.max(2, Math.round(H * res));
  }
  function spawn(o) {
    parts.push({ x: o.x, y: o.y, vx: o.vx, vy: o.vy, s: o.s, gs: o.gs, a: o.a, life: 0, max: o.life, rot: Math.random() * 6.28, vr: rnd(-0.4, 0.4), spr: sprites[(Math.random() * sprites.length) | 0], drag: o.drag ?? 0.985, rise: o.rise ?? 0 });
  }
  // 연속 분출: 굴뚝(x,y)에서 위로 올라가며 퍼진다. rate = 초당 개수
  function emitter(e) { emitters.push({ acc: 0, on: true, ...e }); return emitters[emitters.length - 1]; }
  // 한 번에 터지는 김: 점(x,y) 둘레로 바깥으로 밀려 나간다
  function burst(x, y, n, { spread = 120, speed = 160, size = [50, 110], life = [0.9, 1.6], alpha = 0.7, w = 0, h = 0 } = {}) {
    for (let i = 0; i < n; i++) {
      // 사각형(w,h)의 가장자리에서 나온다 — 표가 바닥에 닿을 때 밑에서 밀려 나오는 김
      let px = x, py = y, ang = Math.random() * Math.PI * 2;
      if (w && h) {
        const side = Math.random();
        if (side < 0.38) { px = x + rnd(-w / 2, w / 2); py = y + h / 2; ang = rnd(0.2, Math.PI - 0.2); }
        else if (side < 0.56) { px = x + rnd(-w / 2, w / 2); py = y - h / 2; ang = rnd(Math.PI + 0.2, Math.PI * 2 - 0.2); }
        else if (side < 0.78) { px = x - w / 2; py = y + rnd(-h / 2, h / 2); ang = rnd(Math.PI * 0.7, Math.PI * 1.3); }
        else { px = x + w / 2; py = y + rnd(-h / 2, h / 2); ang = rnd(-Math.PI * 0.3, Math.PI * 0.3); }
      }
      const v = speed * rnd(0.5, 1.15);
      spawn({ x: px + rnd(-spread, spread) * 0.08, y: py, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, s: rnd(size[0], size[1]), gs: rnd(60, 130), a: alpha * rnd(0.6, 1), life: rnd(life[0], life[1]), drag: 0.93, rise: -18 });
    }
    if (!running) start();
  }
  function step(dt) {
    emitters.forEach((e) => {
      if (!e.on) return;
      e.acc += dt * e.rate;
      while (e.acc >= 1) {
        e.acc -= 1;
        spawn({ x: e.x + rnd(-e.jx || -6, e.jx || 6), y: e.y, vx: rnd(-1, 1) * (e.vx || 14) + (e.wind || 0), vy: -rnd(e.vy[0], e.vy[1]), s: rnd(e.size[0], e.size[1]), gs: rnd(e.grow[0], e.grow[1]), a: rnd(e.alpha[0], e.alpha[1]), life: rnd(e.life[0], e.life[1]), drag: 0.995 });
      }
    });
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.vx *= Math.pow(p.drag, dt * 60); p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.rise * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.s += p.gs * dt; p.rot += p.vr * dt;
    }
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(res, 0, 0, res, 0, 0);
    parts.forEach((p) => {
      const t = p.life / p.max, fade = t < 0.18 ? t / 0.18 : 1 - (t - 0.18) / 0.82;
      ctx.globalAlpha = Math.max(0, p.a * fade);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.drawImage(p.spr, -p.s / 2, -p.s / 2, p.s, p.s); ctx.restore();
    });
    ctx.globalAlpha = 1;
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    step(dt); draw();
    if (running && (parts.length || emitters.some((e) => e.on))) raf = requestAnimationFrame(frame);
    else { running = false; draw(); }
  }
  function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  // 미리 데워 두기: 처음 프레임부터 김이 피어 있게 (보이지 않게 몇 초를 돌린다)
  function prewarm(sec) { for (let t = 0; t < sec; t += 1 / 30) step(1 / 30); draw(); }
  resize();
  return { resize, emitter, burst, start, stop, prewarm, get count() { return parts.length; }, clear() { parts.length = 0; emitters.length = 0; draw(); } };
}

// ── 붓자국 디졸브: from(사진) 위에 to(그림)가 굵은 붓으로 칠해진다. 둘 다 cover 로 캔버스에 맞춘다
export function coverDraw(g, img, w, h) {
  const iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(w / iw, h / ih), sw = w / s, sh = h / s;
  g.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h);
}
// 붓 도장 한 장: 결(브리슬) 줄 여럿 + 옅은 바탕, 가장자리·끝이 깃털처럼 흐려진다. 획 = 이 도장을 방향대로 촘촘히 찍은 것
function brushStamp() {
  const c = document.createElement('canvas'); c.width = 200; c.height = 100; const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(100, 50, 92, 40, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#fff'; g.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const y = 8 + Math.random() * 84; g.globalAlpha = 0.35 + Math.random() * 0.65; g.lineWidth = 1 + Math.random() * 3.2;
    g.beginPath(); g.moveTo(4 + Math.random() * 30, y); g.lineTo(196 - Math.random() * 40, y + (Math.random() - 0.5) * 3); g.stroke();
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in';
  const r = g.createRadialGradient(100, 50, 10, 100, 50, 100);
  r.addColorStop(0, '#000'); r.addColorStop(0.62, 'rgba(0,0,0,.9)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.setTransform(1, 0, 0, 0.5, 0, 25); g.fillStyle = r; g.fillRect(0, -50, 200, 200);   // 세로로 눌린 타원 감쇠(가장자리·끝이 깃털처럼)
  return c;
}
export function brushDissolve(canvas, from, to, { duration = 1700, onDone } = {}) {
  const w = canvas.width, h = canvas.height, g = canvas.getContext('2d');
  const A = document.createElement('canvas'); A.width = w; A.height = h; coverDraw(A.getContext('2d'), from, w, h);
  const B = document.createElement('canvas'); B.width = w; B.height = h; coverDraw(B.getContext('2d'), to, w, h);
  const M = document.createElement('canvas'); M.width = w; M.height = h; const m = M.getContext('2d');
  const T = document.createElement('canvas'); T.width = w; T.height = h; const t = T.getContext('2d');
  const stamp = brushStamp();
  // 붓질 계획: 짧고 굵은 획 수십 개가 왼쪽 위에서 오른쪽 아래로 번져 간다. 획마다 길이·굵기·기울기가 다르고(주된 방향 둘), 순서는 조금씩 섞인다
  const base = Math.min(w, h), strokes = [];
  const N = 58;
  for (let i = 0; i < N; i++) {
    const x = rnd(-0.05, 1.05) * w, y = rnd(-0.05, 1.05) * h;
    const dir = (Math.random() < 0.6 ? rnd(-0.5, 0.15) : rnd(1.2, 1.9)) + (Math.random() < 0.5 ? 0 : Math.PI);
    const len = base * rnd(0.32, 0.62), bw = base * rnd(0.15, 0.24);
    const order = (x / w) * 0.45 + (y / h) * 0.55 + rnd(-0.18, 0.18);
    strokes.push({ x: x - Math.cos(dir) * len / 2, y: y - Math.sin(dir) * len / 2, dir, len, bw, order, drawn: 0 });
  }
  strokes.sort((a, b) => a.order - b.order);
  strokes.forEach((S, i) => { S.t0 = (i / N) * 0.78; S.t1 = S.t0 + 0.2; });
  const t0 = performance.now();
  let done = false;
  function paint(k) {
    // 새로 뻗은 부분만 마스크에 찍는다(누적) — 프레임마다 다시 그리지 않는다
    strokes.forEach((S) => {
      if (k <= S.t0) return;
      const target = Math.min(1, (k - S.t0) / (S.t1 - S.t0)) * S.len, step = S.bw * 0.16;
      while (S.drawn < target) {
        const p = S.drawn, taper = Math.min(1, p / (S.bw * 0.6), (S.len - p) / (S.bw * 0.5) + 0.35);
        m.save(); m.translate(S.x + Math.cos(S.dir) * p, S.y + Math.sin(S.dir) * p); m.rotate(S.dir);
        m.globalAlpha = 0.5 * Math.max(0.3, taper);
        const sw = S.bw * 1.3, sh = S.bw * (0.75 + 0.25 * taper);
        m.drawImage(stamp, -sw / 2, -sh / 2, sw, sh); m.restore();
        S.drawn += step;
      }
    });
    let mask = M;
    // 끝 무렵엔 남은 틈을 고르게 채운다
    if (k > 0.84) { mask = T; t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, w, h); t.drawImage(M, 0, 0); t.globalAlpha = Math.min(1, (k - 0.84) / 0.16); t.fillStyle = '#fff'; t.fillRect(0, 0, w, h); t.globalAlpha = 1; }
    g.globalCompositeOperation = 'source-over'; g.drawImage(A, 0, 0);
    // 그림 = B 를 마스크로 오려서 얹는다 (T 를 재사용하지 않도록 임시 캔버스 하나 더)
    const C = paint.c || (paint.c = Object.assign(document.createElement('canvas'), { width: w, height: h })), c = C.getContext('2d');
    c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, w, h); c.drawImage(B, 0, 0);
    c.globalCompositeOperation = 'destination-in'; c.drawImage(mask, 0, 0);
    g.drawImage(C, 0, 0);
  }
  function frame(now) {
    if (done) return;
    const k = Math.min(1, (now - t0) / duration);
    paint(k);
    if (k < 1) requestAnimationFrame(frame); else { done = true; onDone && onDone(); }
  }
  g.drawImage(A, 0, 0);
  requestAnimationFrame(frame);
  return { cancel() { done = true; } };
}
