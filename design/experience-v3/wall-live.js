// 살아나는 벽(11/19 시제품) — 90도로 꺾인 벽(두 면)을 비추면, 화면에 보이는 그 자리의 그림이 움직이는 영상으로 바뀐다
// 원리
//   · 인식 대상(MindAR) = 면마다 통째 + 반쪽들(가까이서 일부만 비춰도 잡히게)
//   · 면마다 따로: 그 면의 조각이 잡혀 있으면 그 면은 그 자리에 정확히(평면 인식이라 어긋나지 않음)
//     11/25: 잡히지 않은 면은 띄우지 않는다(옆 면에서 90도로 계산해 붙이던 것 뺌 — 면마다 각자 비춰 보기)
//   · 두 면 위에 영상 판을 덮는다 — 화면에는 카메라에 보이는 범위만 나오므로 '비추는 곳만 살아나는' 것처럼 보인다
//   · 영상 = 두 면을 펼쳐 이어 붙인 한 편(면마다 잘라 씀 — 두 면이 같은 순간). 첫 장면 = 인쇄 원본
//   · 손떨림: 자리를 부드럽게 따라가고(섞기), 놓쳐도 0.4초는 그 자리에 둔 뒤 사라진다. 판 가장자리는 살짝 흐려 경계가 덜 보이게
// 설정(wall/*.json): faces[{id, w, h(미터), y(아래 끝 높이)}] · corner('inside' | 'outside') · video{src(여러 개면 재생되는 첫 번째), uv{면: [u,v,w,h]}} · mind · targets[{face, rect[x,y,w,h]}]
import * as THREE from 'three';

let cur = null;

export async function startWall(container, cfgUrl, { onState, onStats, debug = false } = {}) {
  await stopWall();
  const me = { stopped: false, container };
  cur = me;
  const base = new URL(cfgUrl, document.baseURI);
  const cfg = await (await fetch(base)).json();
  const at = (p) => new URL(p, base).href;
  const [L, R] = cfg.faces;

  // ── 면 자리(틀 기준, 미터): 왼쪽 면 가운데 = 원점, 오른쪽 면은 모서리(왼쪽 면 오른쪽 끝)에서 90도
  const inside = cfg.corner !== 'outside';
  const faceMat = { [L.id]: new THREE.Matrix4() };
  if (R) {
    const yR = ((R.y ?? 0) + R.h / 2) - ((L.y ?? 0) + L.h / 2);
    faceMat[R.id] = new THREE.Matrix4().compose(new THREE.Vector3(L.w / 2, yR, inside ? R.w / 2 : -R.w / 2),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), inside ? -Math.PI / 2 : Math.PI / 2), new THREE.Vector3(1, 1, 1));
  }
  // 면 A 자리 → 면 B 자리
  const rel = (a, b) => faceMat[a].clone().invert().multiply(faceMat[b]);

  // ── MindAR
  const { MindARThree } = await import('mindar-image-three');
  if (me.stopped) return;
  const mindar = new MindARThree({ container, imageTargetSrc: at(cfg.mind), maxTrack: cfg.maxTrack ?? 3, uiScanning: 'no', uiLoading: 'no', filterMinCF: 0.0001, filterBeta: 0.001 });
  me.mindar = mindar;
  const { renderer, scene, camera } = mindar;

  // 인식 대상마다: 앵커(그 조각 가운데, 폭 1) 안에 '그 면이 어디 있는지'(면 가운데 · 미터)
  const probes = cfg.targets.map((t, i) => {
    const a = mindar.addAnchor(i), f = cfg.faces.find((x) => x.id === t.face), [rx, ry, rw, rh] = t.rect;
    const k = 1 / (rw * f.w), cx = (rx + rw / 2 - 0.5) * f.w, cy = -(ry + rh / 2 - 0.5) * f.h;
    const p = new THREE.Object3D(); p.matrixAutoUpdate = false;
    p.matrix.makeScale(k, k, k).multiply(new THREE.Matrix4().makeTranslation(-cx, -cy, 0));
    a.group.add(p);
    return { a, p, t, since: 0 };
  });

  // ── 영상(한 편을 면마다 잘라서). 여러 형식이면 이 기기에서 재생되는 첫 번째
  const video = document.createElement('video');
  const srcs = [].concat(cfg.video?.src || []);
  const pickSrc = srcs.find((s) => video.canPlayType(/\.webm$/i.test(s) ? 'video/webm; codecs="vp9"' : 'video/mp4; codecs="avc1.42E01E"')) || srcs[0];
  Object.assign(video, { muted: true, loop: true, playsInline: true, crossOrigin: 'anonymous', preload: 'auto' });
  video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '');
  if (pickSrc) video.src = at(pickSrc);
  const vt = new THREE.VideoTexture(video);   // 색 변환 없이 그대로(MindAR 렌더러가 선형 출력이라 영상 색 = 화면 색)
  const edge = (() => {   // 가장자리 흐림(경계 · 어긋남이 덜 보이게)
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), e = 256 * (cfg.feather ?? 0.02);
    const lin = (x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, '#000'); gr.addColorStop(1, '#fff'); return gr; };
    g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256); g.globalCompositeOperation = 'multiply';
    g.fillStyle = lin(0, 0, e, 0); g.fillRect(0, 0, e, 256); g.fillStyle = lin(256, 0, 256 - e, 0); g.fillRect(256 - e, 0, e, 256);
    g.fillStyle = lin(0, 0, 0, e); g.fillRect(0, 0, 256, e); g.fillStyle = lin(0, 256, 0, 256 - e); g.fillRect(0, 256 - e, 256, e);
    return new THREE.CanvasTexture(c);
  })();
  // 면마다 판 하나(각자 자리 · 각자 부드럽게)
  const faces = cfg.faces.map((f) => {
    // 영상이 아직 없으면(설정에 video 없음) 그 면 그림을 그대로 얹는다 — 인식 · 정렬 시험용
    const [u, v, uw, vh] = cfg.video ? cfg.video.uv[f.id] : [0, 0, 1, 1];
    const geo = new THREE.PlaneGeometry(f.w, f.h);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, u + uv.getX(i) * uw, 1 - v - vh + uv.getY(i) * vh); uv.needsUpdate = true;
    const m = new THREE.MeshBasicMaterial({ map: cfg.video ? vt : new THREE.TextureLoader().load(at(f.img)), alphaMap: edge, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    if (cfg.tone) m.color.setRGB(...cfg.tone);   // 현장 조명에 맞춰 영상 밝기 · 색 조절(예: [0.9, 0.88, 0.82])
    if (debug) m.color.setRGB(1, 0.62, 0.62);   // 점검: 영상 판을 붉게(실제 벽과 구분)
    const g = new THREE.Group(); g.matrixAutoUpdate = false; g.visible = false; scene.add(g);
    g.add(new THREE.Mesh(geo, m));
    if (debug) g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x33ff66 })));   // 점검: 면 테두리
    return { f, g, m, has: false, last: 0, fade: 0, pos: new THREE.Vector3(), q: new THREE.Quaternion(), sc: new THREE.Vector3(), master: null, how: '' };
  });
  const byId = Object.fromEntries(faces.map((x) => [x.f.id, x]));

  // ── 머리 위 대사(cfg.heads: [{face, x, y(면 안 비율 — 머리 꼭대기), text, at:[시작초, 끝초](영상 안 시간, 없으면 차례로 나눔)}])
  //   그 면이 보이고 그 머리가 화면 안에 있을 때만, 영상 시간에 맞춰 — 3D 자리를 매 장면 화면 좌표로 옮겨 따라다니게
  const heads = (cfg.heads || []).map((h, i, all) => {
    const el = document.createElement('div'); el.className = 'wl-say'; el.textContent = h.text; container.appendChild(el);
    const f = cfg.faces.find((x) => x.id === h.face);
    return { ...h, el, p: new THREE.Vector3((h.x - 0.5) * f.w, -(h.y - 0.5) * f.h + (cfg.headLift ?? 0.04), 0), at: h.at || null, i, n: all.length };
  });
  const hv = new THREE.Vector3();
  const placeHeads = () => {
    if (!heads.length) return;
    const r = renderer.domElement.getBoundingClientRect(), cr = container.getBoundingClientRect(), dur = video.duration || 0, t = video.currentTime || 0;
    for (const h of heads) {
      const fc = byId[h.face], span = h.at || (dur ? [dur * h.i / h.n, dur * (h.i + 1) / h.n] : [0, 1e9]);
      let on = fc.fade > 0.5 && t >= span[0] && t < span[1];
      if (on) {
        hv.copy(h.p).applyMatrix4(fc.g.matrixWorld).project(camera);
        const x = r.left - cr.left + (hv.x + 1) / 2 * r.width, y = r.top - cr.top + (1 - hv.y) / 2 * r.height;
        on = hv.z < 1 && x > 20 && x < cr.width - 20 && y > 40 && y < cr.height - 20;
        if (on) {   // 상자는 화면 안으로 밀어 넣고, 머리를 가리키는 선은 제자리(--dx)
          const w = h.el.offsetWidth, xc = Math.max(w / 2 + 8, Math.min(cr.width - w / 2 - 8, x));
          h.el.style.transform = `translate(${xc}px, ${y}px) translate(-50%, -100%)`; h.el.style.setProperty('--dx', `${Math.max(-w / 2 + 12, Math.min(w / 2 - 12, x - xc))}px`);
        }
      }
      h.el.classList.toggle('on', on);
    }
  };

  // ── 매 장면
  const W = new THREE.Matrix4(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  let lastT = performance.now(), n = 0, t0 = performance.now();
  const tick = () => {
    const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    for (const x of probes) x.since = x.a.group.visible ? (x.since || now) : 0;
    // 1) 그 면 조각이 보이면 그 조각으로(가장 오래 잡혀 있는 것 — 자주 바뀌면 흔들리니까)
    const direct = {};
    for (const fc of faces) {
      const vis = probes.filter((x) => x.t.face === fc.f.id && x.a.group.visible);
      if (!vis.length) { fc.master = null; continue; }
      if (!fc.master || !fc.master.a.group.visible) fc.master = vis.reduce((a, b) => (a.since <= b.since ? a : b));
      fc.master.p.updateMatrixWorld(true); direct[fc.f.id] = fc.master.p.matrixWorld.clone();
    }
    // 2) 11/25: 면마다 각자 비춰서 잡힌 면에만 붙인다 — 옆 면에서 90도로 계산해 붙이지 않음(사용자 지시, 계산 자리는 뒤틀려 보임)
    for (const fc of faces) {
      const w = direct[fc.f.id], how = 'direct';
      if (w) {
        w.decompose(pos, q, sc);
        if (!fc.has) { fc.pos.copy(pos); fc.q.copy(q); fc.sc.copy(sc); fc.has = true; }
        else { const k = 1 - Math.pow(0.001, dt * (cfg.follow ?? 2.2)); fc.pos.lerp(pos, k); fc.q.slerp(q, k); fc.sc.lerp(sc, k); }
        fc.last = now; fc.how = how;
      }
      const showing = fc.has && now - fc.last < (cfg.hold ?? 400);
      fc.fade = Math.max(0, Math.min(1, fc.fade + (showing ? dt / 0.35 : -dt / 0.3)));
      if (!showing && fc.fade === 0) fc.has = false;
      fc.g.visible = fc.fade > 0; fc.m.opacity = fc.fade;
      if (fc.g.visible) { fc.g.matrix.compose(fc.pos, fc.q, fc.sc); fc.g.matrixWorldNeedsUpdate = true; }
    }
    const live = faces.some((x) => x.fade > 0.5);
    if (live && video.paused) video.play().catch(() => {});
    onState?.(live ? 'live' : 'scan');
    n++; if (onStats && now - t0 > 1000) {
      onStats({ fps: n * 1000 / (now - t0), tracked: probes.filter((x) => x.a.group.visible).map((x) => x.t.face + ':' + x.t.rect.join(',')).join(' '), faces: faces.map((x) => `${x.f.id}:${x.fade > 0 ? x.how : '-'}`).join(' '), video: video.readyState });
      n = 0; t0 = now;
    }
    renderer.render(scene, camera);
    placeHeads();
  };
  await mindar.start();
  if (me.stopped) { await stopWall(me); return; }
  renderer.setAnimationLoop(tick);
  me.video = video;
  return me;
}

export async function stopWall(me = cur) {
  if (!me) return;
  me.stopped = true; if (cur === me) cur = null;
  try { me.mindar?.renderer.setAnimationLoop(null); me.mindar?.stop(); } catch {}
  try { me.video?.pause(); } catch {}
  me.container.innerHTML = '';
}
