// 장면 위 안내 — 글 목록 대신, 폰이 실제 그림에 다가가 비추는 동작을 그림으로 보여 주고 한 줄과 단추 하나만 둔다. 살롱 · 시민사회 · 산업혁명 · 해돋이 공통
// show({ coach: { img, kind: 'gilt'|'paper'|'photo'|'ticket', land }, cap, title, sub, buttons: [{ label, on, cls, cam }], note, link: { label, on } })
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const coachHTML = (c) => `<div class="g-coach${c.land ? ' land' : ''}" aria-hidden="true">
  <div class="c-art ${c.kind || 'gilt'}"><img src="${esc(c.img)}" alt=""></div>
  <div class="c-phone"><i class="c-cam"></i><span class="c-finder"><i></i><i></i><i></i><i></i></span></div>
  <i class="c-ping"></i>
</div>`;
export function makeGuide(host = document.body) {
  const el = document.createElement('div');
  el.className = 'v3-guide';
  host.appendChild(el);
  let cur = null, firstBtn = null, firstHTML = '';
  const api = {
    el,
    show(o) {
      cur = o;
      el.className = 'v3-guide' + (o.coach ? ' has-coach' : '') + (o.coach?.land ? ' side' : '');
      el.innerHTML = `<div class="g-in">
        ${o.coach ? coachHTML(o.coach) : ''}
        <div class="g-tx">
          ${o.cap ? `<p class="g-cap">${esc(o.cap)}</p>` : ''}
          ${o.title ? `<h3 class="g-title">${esc(o.title)}</h3>` : ''}
          ${o.sub ? `<p class="g-sub">${esc(o.sub)}</p>` : ''}
          ${o.buttons ? `<div class="g-btns">${o.buttons.map((b, i) => `<button type="button" class="g-go ${b.cls || ''}" data-i="${i}">${b.cam ? CAM : ''}<span>${esc(b.label)}</span></button>`).join('')}</div>` : ''}
          ${o.note ? `<p class="g-note">${esc(o.note)}</p>` : ''}
          ${o.link ? `<button type="button" class="g-link">${esc(o.link.label)}</button>` : ''}
        </div></div>`;
      el.querySelectorAll('.g-go').forEach((b) => { b.onclick = () => o.buttons[+b.dataset.i].on?.(b); });
      const l = el.querySelector('.g-link'); if (l) l.onclick = () => o.link.on?.();
      firstBtn = el.querySelector('.g-go'); firstHTML = firstBtn?.innerHTML || '';
      void el.offsetWidth; el.classList.add('on');
      return el.offsetHeight;
    },
    hide() { el.classList.remove('on'); },
    busy(t) { if (firstBtn) { firstBtn.disabled = true; firstBtn.innerHTML = `<span>${esc(t)}</span>`; } },
    fail(msg) {
      if (firstBtn) { firstBtn.disabled = false; firstBtn.innerHTML = firstHTML; }
      const n = el.querySelector('.g-note'); if (n) { n.textContent = msg; n.classList.add('bad'); }
    },
    reset() { if (cur) api.show(cur); },
    get height() { return el.offsetHeight; },
    get shown() { return el.classList.contains('on'); },
  };
  return api;
}

// 폰을 가로로 — 이미 가로면 바로 넘어간다
export function askLandscape(go) {
  const mq = matchMedia('(orientation: landscape)');
  if (mq.matches) return go();
  const o = document.createElement('div');
  o.className = 'v3-rotate';
  o.innerHTML = '<div class="rt-in"><div class="phone" aria-hidden="true"><i></i></div><p>폰을 가로로 돌려 주세요</p><small>그림 속 장면이 화면 가득 펼쳐집니다</small><button type="button">세로로 계속</button></div>';
  document.body.appendChild(o);
  const done = () => { mq.removeEventListener?.('change', on); o.remove(); go(); };
  const on = () => { if (mq.matches) setTimeout(done, 350); };
  mq.addEventListener?.('change', on);
  o.querySelector('button').onclick = done;
}
