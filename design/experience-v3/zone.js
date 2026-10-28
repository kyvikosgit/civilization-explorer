// v3 구역 화면 — zone.html?z=society | industry | monet (살롱 · 아틀리에 · 나다르는 각자 화면)
// 폰에서는 안내와 질문만. 답은 현장의 그림·전단지·소품을 카메라로 비춰야 열린다(시연 모드만 예외)
import { ZONES } from './data.js';
import { openCam, closeCam, esc } from './camui.js';
import { showDone } from './result.js';
import { store } from './store.js';

const $ = (s, r = document) => r.querySelector(s);
const zid = new URLSearchParams(location.search).get('z');
const zone = ZONES.find((z) => z.id === zid);
if (!zone) location.replace('index.html');
const zno = String(ZONES.indexOf(zone) + 1).padStart(2, '0');
const CAM_ICO = '<svg class="ico" viewBox="0 0 24 24"><path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg>';
const SUNRISE_VIDEO = '../experience-v2/proto/video/sunrise-scene.mp4';   // v2 C5 의 당시 장면 영상(AI 생성 · 10초)
const RATIO = { sunrise: [0.769, 0.744, 0.801, 1.255], flyer: [1.499, 1.502, 1.502] };   // .mind 원본 세로/가로

// 시민사회: 벽의 사람들을 만났거나(건너뛰었거나) — 이번 방문 동안만
const heardKey = 'm100v3_heard_' + zid;
const heard = () => { try { return sessionStorage.getItem(heardKey) === '1'; } catch { return false; } };
const setHeard = () => { try { sessionStorage.setItem(heardKey, '1'); } catch {} };

function status(t) {
  if (!t.collect) return '';
  if (store.saved(t.id)) return '<small class="ok">수집함에 담음</small>';
  if (store.solved(t.id)) return '<small class="ok">정답</small>';
  return '';
}

function render() {
  $('#tbT').textContent = zone.loc;
  document.title = `${zone.title} · MONET 100`;
  let h = `<p class="cap">${zno} · ${esc(zone.loc)}</p><h1>${esc(zone.title)}</h1>`;
  if (zone.intro) h += `<p class="lead">${esc(zone.intro)}</p>`;
  if (zone.wall) {
    const w = zone.wall;
    h += `<section class="wall"><h2>${esc(w.title)}</h2><p class="wl">${esc(w.lead)}</p>
      <div class="wall-strip">${w.items.map((it) => `<figure><div class="im"><img src="${esc(it.img)}" alt="" loading="lazy"></div>
        <figcaption><b>${esc(it.title)}</b><small>${esc(it.meta)}</small><span>${esc(it.desc)}</span></figcaption></figure>`).join('')}</div></section>`;
  }
  for (const t of zone.tasks) {
    const prev = t.after && zone.tasks.find((x) => x.id === t.after);
    const locked = prev && !heard();
    h += `<section class="task${locked ? ' locked' : ''}" id="t-${t.id}">`;
    if (prev) h += `<p class="next">${esc(prev.next)}</p>`;
    h += `<div class="tk"><h2>${esc(t.title || zone.title)}</h2>${status(t)}</div><p class="q">${esc(t.question)}</p>`;
    if (t.hold) h += `<p class="note wait">${esc(t.hold)}</p>`;
    else {
      if (!t.mind) h += `<p class="note wait">인식 타깃 준비 중 · ${esc(t.pending)}</p>`;
      h += `<button class="btn" data-scan="${t.id}">${CAM_ICO}카메라로 찾기</button>`;
      if (t.skip) h += `<div class="small-links"><button data-skip="${t.id}">${esc(t.skip)}</button></div>`;
    }
    h += `</section>`;
  }
  $('#page').innerHTML = h;
  $('#page').querySelectorAll('[data-scan]').forEach((b) => { b.onclick = () => scan(zone.tasks.find((t) => t.id === b.dataset.scan)); });
  $('#page').querySelectorAll('[data-skip]').forEach((b) => { b.onclick = () => unlockNext(); });
}

function unlockNext() {
  setHeard();
  const sec = $('.task.locked');
  if (!sec) return;
  sec.classList.remove('locked');
  sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const head = (cap, t, gold) => `<div class="dc${gold ? ' gold' : ''}">${esc(cap)}</div><div class="dt">${esc(t.title)}</div>${t.sub ? `<div class="ds">${esc(t.sub)}</div>` : ''}`;
const win = (t) => { closeCam(); showDone(t); };

function scan(task) {
  const base = {
    title: `${zone.loc.replace('4F · ', '')} · ${task.title || zone.title}`,
    find: task.find, mind: task.mind, pending: task.pending,
    targets: task.targets, demo: store.demo(),
  };
  if (task.kind === 'talk') return openCam({ ...base, onFound: (i, ui) => talk(task, i, ui) });
  if (task.id === 'sunrise') return landscapeFirst(() => openCam({ ...base, fx: rectFx(RATIO.sunrise), onFound: (i, ui) => sunrise(task, i, ui) }));
  openCam({ ...base, onFound: (i, ui) => {
    const t = task.targets[i];
    if (task.direct) return win(task);                               // 정답 하나뿐(기차표) — 비추면 바로
    ui.show({ html: head(zone.title, t) + (t.desc ? `<div class="dd">${esc(t.desc)}</div>` : ''),
      buttons: [
        { label: '다른 것 비추기', cls: 'line', on: () => ui.release() },
        { label: task.cta, on: () => (t.correct ? win(task) : ui.show({ html: head(zone.title, t) + `<div class="fb">${esc(t.feedback || task.wrong)}</div>`, buttons: [{ label: '다시 찾기', on: () => ui.release() }] })) },
      ] });
  } });
}

// ── 시민사회 · 벽의 사람들: 비추면 그 사람의 말이 한 줄씩(원고가 오면 영상 · 3D 인물로). 다 듣거나 건너뛰면 전단지로
function talk(task, i, ui) {
  const t = task.targets[i];
  const lines = t.lines || [];
  const body = lines.length
    ? `<div class="talk">${lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div><div class="prog"><i></i></div>`
    : `<div class="talk"><p class="on wait">발언 원고 대기 · 이 자리에서 영상 또는 3D 인물이 그 시대 사람의 말을 들려줍니다</p></div>`;
  const d = ui.show({ html: head('벽의 사람들', t) + body, buttons: [
    { label: '다른 인물 비추기', cls: 'line', on: () => ui.release() },
    { label: '전단지 찾으러', on: () => { closeCam(); unlockNext(); } },
  ] });
  setHeard();
  const ps = d.querySelectorAll('.talk p:not(.wait)'), bar = d.querySelector('.prog i');
  ps.forEach((p, k) => setTimeout(() => { p.classList.add('on'); if (bar) bar.style.width = `${((k + 1) / ps.length) * 100}%`; }, 300 + k * 2200));
}

// ── 모네 전시관: 가로로 돌리게 하고 → 〈인상, 해돋이〉를 비추면 그림 자리에서 당시 장면 영상이 화면 끝까지 번진다
const isLand = () => matchMedia('(orientation: landscape)').matches;
function landscapeFirst(go) {
  if (isLand()) return go();
  const o = document.createElement('div');
  o.className = 'rotate';
  o.innerHTML = `<div class="rt-in"><div class="phone" aria-hidden="true"><i></i></div><p>폰을 가로로 돌려 주세요</p><small>그림 속 장면을 크게 봅니다</small><button type="button">세로로 계속</button></div>`;
  document.body.appendChild(o);
  const mq = matchMedia('(orientation: landscape)');
  const done = () => { mq.removeEventListener?.('change', on); o.remove(); go(); };
  const on = () => { if (mq.matches) setTimeout(done, 350); };
  mq.addEventListener?.('change', on);
  o.querySelector('button').onclick = done;
}

// 인식한 그림의 화면 자리(px) — 영상이 거기서 시작한다
function rectFx(ratios) {
  return ({ THREE, mindar, anchors }) => {
    const v = new THREE.Vector3();
    return {
      rect(i) {
        const c = mindar.container, r = ratios[i] || 0.75, cw = c.clientWidth, ch = c.clientHeight;
        const pts = [[-0.5, r / 2], [0.5, r / 2], [0.5, -r / 2], [-0.5, -r / 2]].map(([x, y]) => {
          v.set(x, y, 0).applyMatrix4(anchors[i].group.matrixWorld).project(mindar.camera);
          return [(v.x * 0.5 + 0.5) * cw, (1 - (v.y * 0.5 + 0.5)) * ch];
        });
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
        const b = { l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) };
        return b.r - b.l > 40 && b.b - b.t > 30 && isFinite(b.l) ? b : null;
      },
    };
  };
}

function sunrise(task, i, ui) {
  const t = task.targets[i];
  if (!t.correct) {
    ui.show({ html: head('모네 전시관', t) + `<div class="fb">${esc(task.wrong)}</div>`, buttons: [{ label: '다른 그림 비추기', on: () => ui.release() }] });
    return;
  }
  ui.el.classList.add('locked');                                    // 파인더를 걷고
  const W = innerWidth, H = innerHeight;
  let r = ui.fx?.rect?.(i);
  if (!r) { const w = Math.min(W, H * 1.3) * 0.6, h = w * 0.76; r = { l: (W - w) / 2, t: (H - h) / 2, r: (W + w) / 2, b: (H + h) / 2 }; }
  const ins = `inset(${r.t}px ${W - r.r}px ${H - r.b}px ${r.l}px)`;
  const el = document.createElement('div');
  el.className = 'bloom';
  el.innerHTML = `<video playsinline muted autoplay preload="auto" src="${SUNRISE_VIDEO}"></video><div class="glow"></div>
    <div class="bl-cap"><b>${esc(t.title)}</b><span>${esc(t.sub)}</span></div><button class="bl-skip" type="button">건너뛰기</button>`;
  document.body.appendChild(el);
  const vid = el.querySelector('video');
  vid.style.clipPath = ins;
  vid.play().catch(() => {});
  navigator.vibrate?.([20, 60, 30]);
  // ① 그림 자리 안에서 그림이 장면으로 살아난다 ② 잠깐 흐른 뒤 장면이 틀 밖으로 화면 끝까지 번진다 ③ 제목
  const a1 = vid.animate([{ opacity: 0, filter: 'brightness(1.8)' }, { opacity: 1, filter: 'brightness(1)' }], { duration: 700, easing: 'ease-out', fill: 'forwards' });
  el.querySelector('.glow').animate([{ opacity: 0 }, { opacity: 0.9, offset: 0.25 }, { opacity: 0 }], { duration: 1400, easing: 'ease-out' });
  let ended = false;
  const finish = () => {
    if (ended) return; ended = true;
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' }).finished.then(() => { el.remove(); });
    closeCam(); showDone(task);
  };
  a1.finished.then(() => new Promise((res) => setTimeout(res, 900))).then(() => {
    el.classList.add('open');
    return vid.animate([{ clipPath: ins }, { clipPath: 'inset(0px 0px 0px 0px)' }], { duration: 1800, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' }).finished;
  }).then(() => {
    closeCam();
    el.querySelector('.bl-cap').classList.add('on');
  });
  vid.addEventListener('ended', finish);
  el.querySelector('.bl-skip').onclick = finish;
}

render();
