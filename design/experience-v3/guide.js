// 장면 위 안내 시트 — 처음 온 사람이 지금 뭘 하면 되는지 말해 주고, 사람이 직접 다음으로 넘어간다. 살롱 · 시민사회 · 산업혁명 · 해돋이가 같이 쓴다
// makeGuide({ cap, title, steps: [문장], body, buttons: [{ label, on, cls }], note, link: { label, on } })
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
export function makeGuide(host = document.body) {
  const el = document.createElement('div');
  el.className = 'v3-guide';
  host.appendChild(el);
  let cur = null, firstBtn = null, firstLabel = '';
  const api = {
    el,
    show(o) {
      cur = o;
      el.innerHTML = `${o.cap ? `<p class="g-cap">${esc(o.cap)}</p>` : ''}${o.title ? `<h3 class="g-title">${esc(o.title)}</h3>` : ''}
        ${o.steps ? `<ol>${o.steps.map((s, i) => `<li><b>${i + 1}</b><span>${s}</span></li>`).join('')}</ol>` : ''}
        ${o.body ? `<p class="g-body">${esc(o.body)}</p>` : ''}
        ${o.buttons ? `<div class="g-btns">${o.buttons.map((b, i) => `<button type="button" class="g-go ${b.cls || ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div>` : ''}
        ${o.note ? `<p class="g-note">${esc(o.note)}</p>` : ''}
        ${o.link ? `<button type="button" class="g-link">${esc(o.link.label)}</button>` : ''}`;
      el.querySelectorAll('.g-go').forEach((b) => { b.onclick = () => o.buttons[+b.dataset.i].on?.(b); });
      const l = el.querySelector('.g-link'); if (l) l.onclick = () => o.link.on?.();
      firstBtn = el.querySelector('.g-go'); firstLabel = firstBtn?.textContent || '';
      requestAnimationFrame(() => el.classList.add('on'));
      return el.offsetHeight;
    },
    hide() { el.classList.remove('on'); },
    busy(t) { if (firstBtn) { firstBtn.disabled = true; firstBtn.textContent = t; } },
    fail(msg) {
      if (firstBtn) { firstBtn.disabled = false; firstBtn.textContent = firstLabel; }
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
