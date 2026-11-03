// v3 모네 전시관 — 어둠 · 조명 입장(v2) → 질문 → 현장 카메라(세로 그대로) → 〈인상, 해돋이〉를 비추면 그 그림 자리에서 당시 장면 영상이 살아나 커지고,
//   끝나면 다시 비추던 그 자리로 줄어들며 그림으로 돌아온 뒤 페이지의 액자 자리로 옮겨 가 끝 줄(v2)
import { ZONES } from './data.js';
import { openCam, closeCam, esc } from './camui.js';
import { makeGuide } from './guide.js';
import { store } from './store.js';

const task = ZONES.find((z) => z.id === 'monet').tasks[0];
const V3 = '../../experience-v3/', VIDEO = 'video/sunrise-scene.mp4';
const RATIO = [0.769, 0.744, 0.801, 1.255];
const targets = task.targets.map((t) => ({ ...t, img: V3 + t.img }));
const guide = makeGuide();
const INFO = {
  coach: { img: V3 + 'img/hero_sunrise.jpg', kind: 'gilt', land: true },
  title: '“그냥 인상에 지나지 않는다”',
  sub: '1874년, 비평가를 화나게 한 그림을 찾아 비춰 보세요',
  buttons: [{ label: '카메라 켜기', cam: true, on: start }],
};
function showGuide() { if (!guide.shown && window.__c5sun.state === 'scan') guide.show(INFO); }
setTimeout(showGuide, 3200);                     // 조명이 다 켜진 뒤
window.addEventListener('c5:scan', showGuide);
window.addEventListener('c5:replay', () => { document.getElementById('sunEnd').classList.remove('on'); bloom(null, () => document.getElementById('sunEnd').classList.add('on')); });

function start() {
  guide.hide();
  {
    openCam({
      title: '모네 전시관 · 비평가가 본 그림 찾기', find: '비평가를 화나게 한 그림에\n카메라를 비춰 보세요',
      hint: '그림이 화면에 가득 차도록\n조금 더 가까이 다가가 보세요',
      mind: V3 + task.mind, targets, demo: store.demo(), hold: true, fx: rectFx,
      onFail: (msg) => { closeCam(); guide.reset(); guide.fail(msg); },
      onClose: () => guide.reset(),
      onFound: (i, ui) => {
        const t = targets[i];
        if (!t.correct) return ui.show({ html: `<div class="dc">모네 전시관</div><div class="dt">${esc(t.title)}</div><div class="ds">${esc(t.sub)}</div><div class="fb">${esc(task.wrong)}</div>`, buttons: [{ label: '다른 그림 비추기', on: () => ui.release() }] });
        ui.el.classList.add('locked');
        const r = ui.fx?.rect?.(i) || ui.simRect?.();
        store.solve(task.id);
        bloom(r, () => window.__c5sun.endNow());
      },
    });
  }
}
// 인식한 그림의 화면 자리 — 영상이 거기서 시작한다
function rectFx({ THREE, mindar, anchors }) {
  const v = new THREE.Vector3();
  return {
    rect(i) {
      const c = mindar.container, r = RATIO[i], cw = c.clientWidth, ch = c.clientHeight;
      const pts = [[-0.5, r / 2], [0.5, r / 2], [0.5, -r / 2], [-0.5, -r / 2]].map(([x, y]) => {
        v.set(x, y, 0).applyMatrix4(anchors[i].group.matrixWorld).project(mindar.camera);
        return [(v.x * 0.5 + 0.5) * cw, (1 - (v.y * 0.5 + 0.5)) * ch];
      });
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const b = { l: Math.max(0, Math.min(...xs)), t: Math.max(0, Math.min(...ys)), r: Math.min(cw, Math.max(...xs)), b: Math.min(ch, Math.max(...ys)) };
      return b.r - b.l > 40 && b.b - b.t > 30 ? b : null;
    },
  };
}
// ① 비추던 그림 자리에서 장면이 살아난다 ② 그 자리에서 화면 폭에 맞게 커진다(세로 · 가로 모두 영상 전체가 보이게)
// ③ 끝나면(또는 건너뛰기) 비추던 그 자리로 다시 줄어들며 그림으로 바뀐다 ④ 그 그림이 페이지의 액자 자리로 옮겨 가고 끝 줄
const PAINT = 'img/c5/sunrise-painting.jpg', VAR = 752 / 560;   // 영상 비율(그림 2048/1589 와 거의 같다)
const box = (el, r) => Object.assign(el.style, { left: `${r.l}px`, top: `${r.t}px`, width: `${r.r - r.l}px`, height: `${r.b - r.t}px` });
const kf = (r) => ({ left: `${r.l}px`, top: `${r.t}px`, width: `${r.r - r.l}px`, height: `${r.b - r.t}px` });
function bloom(rect, then) {
  const W = innerWidth, H = innerHeight;
  let r = rect;
  if (!r) { const w = Math.min(W * 0.72, H * 0.5 * VAR), h = w / VAR; r = { l: (W - w) / 2, t: (H - h) / 2, r: (W + w) / 2, b: (H + h) / 2 }; }
  // 커진 자리: 화면 안에 영상 전체가 들어가는 가장 큰 크기(세로 폰이면 화면 폭 가득)
  const fw = Math.min(W, H * VAR), fh = fw / VAR, big = { l: (W - fw) / 2, t: (H - fh) / 2, r: (W + fw) / 2, b: (H + fh) / 2 };
  const el = document.createElement('div');
  el.className = 'v3-bloom';
  el.innerHTML = `<div class="bl-bg"></div><video playsinline muted autoplay preload="auto" src="${VIDEO}"></video><img class="bl-paint" src="${PAINT}" alt=""><div class="glow"></div>
    <div class="bl-cap"><b>1872년 11월 13일 아침, 르아브르</b><small>날짜는 추정 · AI로 재현한 장면</small></div><button class="bl-skip" type="button">건너뛰기</button>`;
  document.body.appendChild(el);
  const vid = el.querySelector('video'), paint = el.querySelector('.bl-paint'), bg = el.querySelector('.bl-bg');
  box(vid, r); box(paint, r);
  vid.play().catch(() => {});
  navigator.vibrate?.([20, 60, 30]);
  const ease = 'cubic-bezier(.65,0,.25,1)';
  const a1 = vid.animate([{ opacity: 0, filter: 'brightness(1.6)' }, { opacity: 1, filter: 'brightness(1)' }], { duration: 700, easing: 'ease-out', fill: 'forwards' });
  el.querySelector('.glow').animate([{ opacity: 0 }, { opacity: 0.8, offset: 0.25 }, { opacity: 0 }], { duration: 1400, easing: 'ease-out' });
  let ended = false, grown = false;
  const grow = a1.finished.then(() => new Promise((res) => setTimeout(res, 900))).then(() => {
    if (ended) return;
    el.classList.add('open');
    bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1500, easing: 'ease-out', fill: 'forwards' });
    return vid.animate([kf(r), kf(big)], { duration: 1800, easing: ease, fill: 'forwards' }).finished;
  }).then(() => { if (ended) return; grown = true; closeCam(); el.querySelector('.bl-cap').classList.add('on'); });
  const finish = async () => {
    if (ended) return; ended = true;
    el.classList.remove('open'); el.querySelector('.bl-cap').classList.remove('on');
    await grow.catch(() => {});
    closeCam();
    // ③ 비추던 자리로 줄어들며 그림으로
    const from = grown ? big : r;
    vid.getAnimations().forEach((a) => a.cancel()); box(vid, from); vid.style.opacity = 1;
    box(paint, from);
    const back = { duration: 1400, easing: ease, fill: 'forwards' };
    vid.animate([kf(from), kf(r)], back);
    paint.animate([kf(from), kf(r)], back);
    paint.animate([{ opacity: 0 }, { opacity: 0 , offset: 0.25 }, { opacity: 1 }], back);
    await vid.animate([{ opacity: 1 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], back).finished;
    // ④ 페이지가 끝 상태로(액자에 그림) → 그 액자 자리로 옮겨 가며 어두운 막을 걷는다
    then?.();
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const f = document.getElementById('sunImg')?.getBoundingClientRect();
    const to = f && f.width > 20 ? { l: f.left, t: f.top, r: f.right, b: f.bottom } : r;
    const move = { duration: 1100, easing: ease, fill: 'forwards' };
    paint.animate([kf(r), kf(to)], move);
    await bg.animate([{ opacity: 1 }, { opacity: 0 }], move).finished;
    await el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'forwards' }).finished;
    el.remove();
  };
  vid.addEventListener('ended', finish);
  el.querySelector('.bl-skip').onclick = finish;
}
