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
    <div class="sim"><div class="sim-view"><img class="sim-art" alt=""><i class="sim-glow"></i><div class="sim-medal"><small>SALON</small><b>1873</b></div>${'<u></u>'.repeat(10)}</div></div>
    <div class="aura"></div>
    <div class="flash"></div>
    <div class="top"><button class="x" aria-label="닫기">${ICO.close}</button><div class="tt"><small class="cap"></small><b class="t"></b><span class="dots"></span></div><span></span></div>
    <div class="finder"><i></i><i></i><i></i><i></i><span class="bar"></span></div>
    <div class="msg"></div>
    <div class="err"></div>
    <div class="demo"><button class="nfc-again" type="button" hidden>태그에 폰 대기</button><button class="pick-open" type="button">카메라 없이 고르기</button><p></p><div class="strip"></div><button class="pick-close" type="button">카메라로 돌아가기</button></div>
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
  el.className = 'v3-cam on' + (o.hold ? ' pre' : '');
  el.style.clipPath = '';
  // 위 한 줄: '구역 · 할 일' 을 둘로 나눠 작은 캡션과 제목으로
  const [cap, ...rest] = String(o.title || '').split(' · ');
  $('.cap').textContent = rest.length ? cap : ''; $('.t').textContent = rest.length ? rest.join(' · ') : cap;
  // 찾은 개수 — 대상이 여럿일 때만, 회색 → 금색 두 단계
  //   o.pick: 카메라 없이 고르기에 내놓을 대상 수(앞에서부터) — 같은 벽을 부분으로 나눈 인식 대상은 고르기에 안 보인다
  const n = o.pick ?? (o.targets || []).length, seen = new Set();
  $('.dots').innerHTML = n > 1 ? '<i></i>'.repeat(n) : '';
  const markSeen = (i) => { seen.add(i); $('.dots').children[i]?.classList.add('on'); el.querySelectorAll('.strip button')[i]?.classList.add('seen'); };
  el.querySelector('.finder').removeAttribute('style');
  $('.msg').textContent = o.find || '';
  $('.docent').innerHTML = '';
  // 한동안 아무것도 못 찾으면 안내를 바꾼다
  const armHint = () => {
    clearTimeout(me.hintT); $('.msg').textContent = o.find || '';
    if (o.hint) me.hintT = setTimeout(() => { if (cur === me && !me.locked) $('.msg').textContent = o.hint; }, o.hintAfter || 10000);
  };
  me.armHint = armHint;
  $('.x').onclick = () => { closeCam(true); o.onClose?.(); };

  const ui = {
    // 도슨트 레이어 채우기. buttons: [{ label, cls, on }]
    show({ html, golden = false, buttons = [] }) {
      me.locked = true; me.nfcStop?.();
      el.classList.add('locked'); el.classList.toggle('golden', golden);
      const d = $('.docent');
      d.innerHTML = html + (buttons.length ? `<div class="btns">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div>` : '');
      d.querySelectorAll('.btns button').forEach((b) => { b.onclick = () => buttons[+b.dataset.i].on?.(); });
      d.scrollTop = 0;
      return d;
    },
    // 다시 찾기 — 파인더로
    release() { me.locked = false; me.snapTo = null; el.classList.remove('locked', 'golden', 'snap'); $('.finder').removeAttribute('style'); me.fx?.release?.(); armHint(); me.nfcRe?.(); },
    close() { closeCam(); },
    get el() { return el; },
    // 프로토타입: 뷰파인더에 보이는 그림의 화면 자리
    simRect() { const r = $('.sim-art').getBoundingClientRect(); return r.width ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null; },
    get fx() { return me.fx; },   // setup 이 돌려준 효과 객체(인식한 그림의 화면 자리 등)
  };
  me.ui = ui;

  // 장면 → 카메라: 켜질 때까지 뒤에서 기다렸다가, 파인더 자리에 창이 열리고 화면으로 번진다
  function reveal() {
    if (cur !== me) return;
    const f = $('.finder').getBoundingClientRect(), W = innerWidth, H = innerHeight;
    o.onEnter?.(ui);
    el.classList.remove('pre');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.classList.add('opening');
    const ins = `inset(${f.top}px ${W - f.right}px ${H - f.bottom}px ${f.left}px)`;
    el.style.clipPath = ins;
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: 'ease-out' });
    el.animate([{ clipPath: ins }, { clipPath: ins, offset: 0.42 }, { clipPath: 'inset(0px 0px 0px 0px)' }], { duration: 1700, easing: 'cubic-bezier(.6,0,.25,1)' })
      .finished.then(() => { el.style.clipPath = ''; el.classList.remove('opening'); }).catch(() => {});
  }

  const found = (i) => {
    if (me.shown === i) clearTimeout(me.lostT);                   // 잠깐 놓쳤다가 다시 잡힘 — 그대로 둔다
    // 나란히 걸린 그림에서 다른 그림으로 바로 옮겨 감 — 보던 해설을 닫고 새 그림으로
    else if (o.releaseOnLost && me.locked && cur === me) { clearTimeout(me.lostT); ui.release(); }
    if (cur !== me || me.locked) return;
    me.shown = i;
    clearTimeout(me.hintT);
    const f = $('.flash'), fr = $('.finder').getBoundingClientRect();
    f.style.setProperty('--fx', `${fr.left + fr.width / 2}px`); f.style.setProperty('--fy', `${fr.top + fr.height / 2}px`);
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    markSeen(i);
    navigator.vibrate?.(18);
    me.fx?.found?.(i);
    o.onFound(i, ui);
  };

  // ── 예비: 카메라를 쓸 수 없을 때만 — 아래 [카메라 없이 고르기]를 눌러 펼치고, 사람이 직접 눌러야 그 대상을 비춘 것처럼 된다(자동으로 고르지 않는다)
  const strip = $('.strip'), art = $('.sim-art'), finder = $('.finder'), targets = (o.targets || []).slice(0, n);
  strip.innerHTML = targets.map((t, i) => `<button data-i="${i}" aria-label="${esc(t.title)}">${t.img ? `<img src="${esc(t.img)}" alt="">` : `<span class="ph">${esc(t.title)}</span>`}</button>`).join('');
  const btns = [...strip.querySelectorAll('button')];
  art.removeAttribute('src');
  const openPick = (why) => { el.classList.add('picking'); $('.demo p').textContent = why || '비출 곳을 고르세요'; };
  $('.pick-open').onclick = () => openPick();
  $('.pick-close').onclick = () => { if (me.camless) return; el.classList.remove('picking', 'sim-on', 'snap'); me.snapTo = null; finder.removeAttribute('style'); clearTimeout(me.aimT); clearTimeout(me.snapT); btns.forEach((b) => b.classList.remove('on')); };
  const follow = () => {
    if (cur !== me) return;
    if (me.snapTo != null) { const r = art.getBoundingClientRect(), g = 8; if (r.width) Object.assign(finder.style, { left: `${r.left - g}px`, top: `${r.top - g}px`, width: `${r.width + g * 2}px`, height: `${r.height + g * 2}px` }); }
    requestAnimationFrame(follow);
  };
  follow();
  const aim = (i) => {
    if (cur !== me || me.locked) return;
    clearTimeout(me.aimT); clearTimeout(me.snapT);
    me.snapTo = null; el.classList.remove('snap'); finder.removeAttribute('style');
    btns.forEach((b, n) => b.classList.toggle('on', n === i));
    art.src = targets[i].img; el.classList.add('sim-on');
    me.snapT = setTimeout(() => { me.snapTo = i; el.classList.add('snap'); }, 650);
    me.aimT = setTimeout(() => found(i), 1500);
  };
  btns.forEach((b, i) => { b.onclick = () => aim(i); });
  $('.pick-open').hidden = !btns.length;
  // ── 앱(NFC 가능, exp/[id].tsx 가 __m100app.nfc 를 알려 준다): 카메라와 함께 — 비추든 태그에 대든 그 대상으로(링크로 넘어가지 않음)
  //    안드로이드: 시스템 창 없이 뒤에서 태그를 기다린다 — 안내만 보이고, 대면 바로
  //    아이폰: 앱이 태그를 읽으면 시스템 창('스캔 준비 완료')이 반드시 뜬다(애플 규칙, 끌 수 없음) — 그래서 저절로 띄우지 않고
  //      [태그로 찍기]를 누른 사람에게만. o.nfcAuto: '폰 대기'를 눌러 들어온 화면(아틀리에)이면 바로
  //    o.nfc = { 태그 키: 대상 번호 } · 태그 주소 …/n/?t=키 · o.nfcFind: 안드로이드에서 위 안내(비추거나 대거나)
  const appNfc = !!(window.__m100app && window.__m100app.nfc && o.nfc && window.ReactNativeWebView);
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const quiet = appNfc && !ios, nb = $('.nfc-again');
  const nfcRead = () => {
    if (!appNfc || cur !== me || me.locked || me.nfcOn) return;
    me.nfcOn = true; el.classList.add('nfc-wait');
    window.__m100nfc = (url) => {
      me.nfcOn = false; el.classList.remove('nfc-wait');
      if (cur !== me || me.locked) return;
      let key = null;
      try { const u = new URL(url, location.href); key = u.searchParams.get('t') || u.searchParams.get('o'); } catch { key = url; }
      // 시연용(11/03): 태그 주소가 이 화면 것이 아니어도 태그가 읽히기만 하면 찾은 것으로 — o.nfcAny(번호 또는 번호를 돌려주는 함수)
      const any = typeof o.nfcAny === 'function' ? o.nfcAny() : o.nfcAny;
      const i = url ? (key != null && o.nfc[key] != null ? o.nfc[key] : any) : undefined;
      if (i != null) return found(i);
      if (!quiet) { nb.textContent = url ? '이 태그가 아닙니다 · 다시 찍기' : o.nfcBtn || '태그로 찍기'; return; }
      if (!url) return;                                           // 안드로이드 NFC 꺼짐 등 — 카메라로만
      clearTimeout(me.hintT); $('.msg').textContent = '이 태그가 아닙니다';
      me.hintT = setTimeout(() => { if (cur === me && !me.locked) armHint(); }, 2200);
      setTimeout(nfcRead, 1200);                                  // 다른 태그를 다시 기다린다
    };
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'nfc', msg: o.nfcMsg }));   // msg: 아이폰 시스템 창 문구
  };
  // 카메라로 찾았거나 닫힐 때 — 기다리던 태그 읽기를 거둔다(안드로이드는 계속 기다리고 있다)
  me.nfcStop = () => { if (me.nfcOn) { me.nfcOn = false; el.classList.remove('nfc-wait'); window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'nfc-cancel' })); } };
  me.nfcRe = () => { if (quiet) setTimeout(nfcRead, 300); };
  nb.hidden = !appNfc || quiet;
  if (appNfc) {
    nb.textContent = o.nfcBtn || '태그로 찍기'; nb.onclick = nfcRead;
    if (quiet) { if (o.nfcFind) { o = { ...o, find: o.nfcFind }; me.o = o; $('.msg').textContent = o.find; } setTimeout(nfcRead, o.hold ? 1700 : 300); }
    else if (o.nfcAuto) setTimeout(nfcRead, 300);
  }
  me.nfcRead = nfcRead;

  // 카메라를 아예 못 쓰면(권한 거부 · 카메라 없음 · 인식 타깃 준비 전) 고르기를 바로 펼친다
  const camless = (why) => { me.camless = true; el.classList.add('camless'); openPick(why); if (o.hold) reveal(); };

  if (o.mind) {
    startScan($('.ar'), o.mind, (o.targets || []).length, {
      setup: o.fx ? (ctx) => (me.fx = o.fx(ctx)) : null, center: !!o.center,
      onFound: found,
      onLost: (i) => {
        me.fx?.lost?.(i);
        // o.releaseOnLost: 보던 대상이 화면에서 벗어나면(0.8초) 해설을 닫고 다시 찾는 화면으로
        if (o.releaseOnLost && me.locked && me.shown === i) { clearTimeout(me.lostT); me.lostT = setTimeout(() => { if (cur === me && me.locked && !me.o.keepOnLost) { me.shown = -1; ui.release(); } }, 800); }
      },
      onReady: () => { armHint(); if (o.hold) reveal(); },
      onError: (e) => {
        console.warn('[cam]', e);
        const denied = /Permission|NotAllowed/i.test(e?.name + e?.message);
        const msg = denied ? '카메라 권한이 없어 직접 골라 봅니다' : '카메라를 켜지 못해 직접 골라 봅니다';
        if (!btns.length) { if (o.onFail) return o.onFail(denied ? '카메라를 쓸 수 없습니다.\n브라우저 설정에서 카메라 권한을 허용해 주세요.' : '카메라를 켜지 못했습니다.\n잠시 후 다시 시도해 주세요.'); el.classList.add('failed'); $('.err').textContent = msg; if (o.hold) reveal(); return; }
        camless(msg);
      },
    });
  } else {
    camless(appNfc ? '태그에 폰 윗부분을 대세요' : (o.pending ? '인식 준비 전이라 직접 골라 봅니다' : ''));
  }
  return ui;
}

// fade: 끊기지 않게 어두워지며 뒤의 장면으로 돌아간다
export async function closeCam(fade) {
  if (!cur) return;
  const me0 = cur;
  clearTimeout(cur.hintT); cur.nfcStop?.();
  cur = null;
  clearTimeout(me0.aimT); clearTimeout(me0.snapT);
  // 뒤 장면(3D)이 무거워 프레임이 밀려도 닫힘이 멈추지 않게 시간으로도 끊는다
  if (fade && root) await Promise.race([root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {}), new Promise((r) => setTimeout(r, 600))]);
  stopScan();
  if (root) { root.getAnimations().forEach((a) => a.cancel()); root.style.clipPath = ''; root.className = 'v3-cam'; root.querySelector('.ar').innerHTML = ''; }
}
