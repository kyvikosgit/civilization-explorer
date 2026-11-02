// v3 모네 전시관 — 어둠 · 조명 입장(v2) → 질문 → 폰을 가로로 → 현장 카메라 → 〈인상, 해돋이〉를 비추면 그림 자리에서 당시 장면 영상이 화면 끝까지 번진다 → 끝 줄(v2)
import { ZONES } from './data.js';
import { openCam, closeCam, esc } from './camui.js';
import { makeGuide, askLandscape } from './guide.js';
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
  note: '다음 화면에서 폰을 가로로 돌려 주세요',
};
function showGuide() { if (!guide.shown && window.__c5sun.state === 'scan') guide.show(INFO); }
setTimeout(showGuide, 3200);                     // 조명이 다 켜진 뒤
window.addEventListener('c5:scan', showGuide);
window.addEventListener('c5:replay', () => { document.getElementById('sunEnd').classList.remove('on'); bloom(null, () => document.getElementById('sunEnd').classList.add('on')); });

function start() {
  guide.hide();
  askLandscape(() => {
    openCam({
      title: '모네 전시관', find: '비평가를 화나게 한 그림에\n카메라를 비춰 보세요',
      hint: '그림이 화면에 가득 차도록\n조금 더 가까이 다가가 보세요',
      mind: V3 + task.mind, targets, demo: store.demo(), hold: true, fx: rectFx,
      onFail: (msg) => { closeCam(); guide.reset(); guide.fail(msg); },
      onClose: () => guide.reset(),
      onFound: (i, ui) => {
        const t = targets[i];
        if (!t.correct) return ui.show({ html: `<div class="dc">모네 전시관</div><div class="dt">${esc(t.title)}</div><div class="ds">${esc(t.sub)}</div><div class="fb">${esc(task.wrong)}</div>`, buttons: [{ label: '다른 그림 비추기', on: () => ui.release() }] });
        ui.el.classList.add('locked');
        const r = ui.fx?.rect?.(i);
        store.solve(task.id);
        bloom(r, () => window.__c5sun.endNow());
      },
    });
  });
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
// ① 그림 자리 안에서 장면이 살아난다 ② 잠깐 흐른 뒤 틀 밖으로 화면 끝까지 번진다 ③ 때와 곳
function bloom(rect, then) {
  const W = innerWidth, H = innerHeight;
  let r = rect;
  if (!r) { const w = Math.min(W, H * 1.3) * 0.6, h = w * 0.76; r = { l: (W - w) / 2, t: (H - h) / 2, r: (W + w) / 2, b: (H + h) / 2 }; }
  const ins = `inset(${r.t}px ${W - r.r}px ${H - r.b}px ${r.l}px)`;
  const el = document.createElement('div');
  el.className = 'v3-bloom';
  el.innerHTML = `<video playsinline muted autoplay preload="auto" src="${VIDEO}"></video><div class="glow"></div>
    <div class="bl-cap"><b>1872년 11월 13일 아침, 르아브르</b><small>날짜는 추정 · AI로 재현한 장면</small></div><button class="bl-skip" type="button">건너뛰기</button>`;
  document.body.appendChild(el);
  const vid = el.querySelector('video');
  vid.style.clipPath = ins; vid.play().catch(() => {});
  navigator.vibrate?.([20, 60, 30]);
  const a1 = vid.animate([{ opacity: 0, filter: 'brightness(1.8)' }, { opacity: 1, filter: 'brightness(1)' }], { duration: 700, easing: 'ease-out', fill: 'forwards' });
  el.querySelector('.glow').animate([{ opacity: 0 }, { opacity: 0.9, offset: 0.25 }, { opacity: 0 }], { duration: 1400, easing: 'ease-out' });
  let ended = false;
  const finish = () => {
    if (ended) return; ended = true;
    then?.();
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, fill: 'forwards' }).finished.then(() => el.remove());
  };
  a1.finished.then(() => new Promise((res) => setTimeout(res, 900))).then(() => {
    el.classList.add('open');
    return vid.animate([{ clipPath: ins }, { clipPath: 'inset(0px 0px 0px 0px)' }], { duration: 1800, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' }).finished;
  }).then(() => { closeCam(); el.querySelector('.bl-cap').classList.add('on'); });
  vid.addEventListener('ended', finish);
  el.querySelector('.bl-skip').onclick = finish;
}
