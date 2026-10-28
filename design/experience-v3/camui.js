// 카메라 화면 — 파인더 → 인식(훑는 빛) → 하단 도슨트 레이어. 살롱(3D 장면 위)과 구역 화면이 같이 쓴다
// 인식 결과를 어떻게 보여줄지는 부르는 쪽이 정한다(onFound 에서 ui.show). 시연 모드면 아래 띠에서 눌러 인식한 것처럼
import { startScan, stopScan } from './scan.js';

const ICO = {
  close: '<svg class="ico" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export { esc };

let root = null;
function build() {
  root = document.createElement('div');
  root.className = 'v3-cam';
  root.innerHTML = `
    <div class="ar"></div>
    <div class="aura"></div>
    <div class="flash"></div>
    <div class="top"><button class="x" aria-label="닫기">${ICO.close}</button><div class="t"></div></div>
    <div class="finder"><i></i><i></i><i></i><i></i><span class="bar"></span></div>
    <div class="msg"></div>
    <div class="err"></div>
    <div class="demo"><p>시연 모드 · 현장 대신 눌러서 인식</p><div class="strip"></div></div>
    <div class="docent"></div>`;
  document.body.appendChild(root);
  return root;
}

let cur = null;
export function openCam(o) {
  if (!root) build();
  closeCam(true);
  const el = root, $ = (s) => el.querySelector(s);
  const me = { o, locked: false, fx: null };
  cur = me;
  el.className = 'v3-cam on' + (o.demo ? ' demo-on' : '');
  $('.t').textContent = o.title || '';
  $('.msg').textContent = o.find || '';
  $('.docent').innerHTML = '';
  $('.x').onclick = () => { closeCam(); o.onClose?.(); };

  const ui = {
    // 도슨트 레이어 채우기. buttons: [{ label, cls, on }]
    show({ html, golden = false, buttons = [] }) {
      me.locked = true;
      el.classList.add('locked'); el.classList.toggle('golden', golden);
      const d = $('.docent');
      d.innerHTML = html + (buttons.length ? `<div class="btns">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div>` : '');
      d.querySelectorAll('.btns button').forEach((b) => { b.onclick = () => buttons[+b.dataset.i].on?.(); });
      d.scrollTop = 0;
      return d;
    },
    // 다시 찾기 — 파인더로
    release() { me.locked = false; el.classList.remove('locked', 'golden'); me.fx?.release?.(); },
    close() { closeCam(); },
    get el() { return el; },
    get fx() { return me.fx; },   // setup 이 돌려준 효과 객체(인식한 그림의 화면 자리 등)
  };
  me.ui = ui;

  const found = (i) => {
    if (cur !== me || me.locked) return;
    const f = $('.flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    navigator.vibrate?.(18);
    me.fx?.found?.(i);
    o.onFound(i, ui);
  };

  // 시연 띠
  const strip = $('.strip');
  strip.innerHTML = (o.targets || []).map((t, i) => `<button data-i="${i}" aria-label="${esc(t.title)}">${t.img ? `<img src="${esc(t.img)}" alt="">` : `<span class="ph">${esc(t.title)}</span>`}</button>`).join('');
  strip.querySelectorAll('button').forEach((b) => { b.onclick = () => found(+b.dataset.i); });

  if (o.mind) {
    startScan($('.ar'), o.mind, (o.targets || []).length, {
      setup: o.fx ? (ctx) => (me.fx = o.fx(ctx)) : null,
      onFound: found,
      onLost: (i) => me.fx?.lost?.(i),
      onError: (e) => {
        el.classList.add('failed');
        $('.err').textContent = /Permission|NotAllowed/i.test(e?.name + e?.message)
          ? '카메라를 쓸 수 없습니다.\n브라우저 설정에서 카메라 권한을 허용해 주세요.'
          : '카메라를 켜지 못했습니다.\n' + (o.demo ? '아래에서 눌러 확인할 수 있습니다.' : '잠시 후 다시 시도해 주세요.');
      },
    });
  } else {
    el.classList.add('failed');
    $('.err').textContent = (o.pending || '인식 타깃을 준비하고 있습니다') + (o.demo ? '\n\n아래에서 눌러 확인할 수 있습니다.' : '');
  }
  return ui;
}

export function closeCam(silent) {
  if (!cur) return;
  cur = null;
  stopScan();
  if (root) { root.className = 'v3-cam'; root.querySelector('.ar').innerHTML = ''; }
}
