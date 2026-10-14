// 공용 유틸 — 단계 흐름(해시 라우팅), 카메라, 바텀시트, 토스트, 아이콘
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

export const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M7 12h10"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M5 17l4.5-4.5 3.5 3.5 2.5-2.5L19 17"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 19h14"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
  replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  fleuron: '<svg viewBox="0 0 30 10" fill="currentColor"><path d="M15 1.5c1.6 2 3.6 3.5 6 3.5-2.4 0-4.4 1.5-6 3.5-1.6-2-3.6-3.5-6-3.5 2.4 0 4.4-1.5 6-3.5z"/><circle cx="3" cy="5" r="1.2"/><circle cx="27" cy="5" r="1.2"/></svg>',
};

// ── 단계 흐름: <section class="step" data-step="1..N"> + 해시(#1..#N)로 브라우저 뒤로가기 지원
export function createFlow({ total, titles, onEnter, onLeave, booth }) {
  let cur = 0;
  const go = (n) => {
    n = Math.max(1, Math.min(total, n | 0));
    if (n === cur) return;
    const prev = cur;
    if (prev) onLeave && onLeave(prev, n);
    cur = n;
    $$('.step').forEach((s) => s.classList.toggle('active', +s.dataset.step === n));
    $$('[data-progress]').forEach((p) => {
      p.innerHTML = Array.from({ length: total }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
    });
    $$('[data-step-label]').forEach((el) => { el.innerHTML = `<small>${booth}</small>Step ${n}/${total} · ${titles[n - 1]}`; });
    window.scrollTo(0, 0);
    onEnter && onEnter(n, prev);
  };
  const fromHash = () => {
    const n = parseInt((location.hash || '').replace('#', ''), 10);
    go(Number.isFinite(n) ? n : 1);
  };
  window.addEventListener('hashchange', fromHash);
  const api = {
    get current() { return cur; },
    to(n) { if (`#${n}` === location.hash) go(n); else location.hash = `#${n}`; },
    next() { api.to(cur + 1); },
    back() { if (cur <= 1) location.href = 'index.html'; else api.to(cur - 1); },
    start() {
      // 새로고침 시에도 첫 단계부터 (카메라·인식 상태를 이어받을 수 없으므로)
      if (location.hash && location.hash !== '#1') history.replaceState(null, '', '#1');
      fromHash();
    },
  };
  $$('[data-back]').forEach((b) => { b.innerHTML = ICON.back; b.setAttribute('aria-label', '뒤로'); b.addEventListener('click', () => api.back()); });
  return api;
}

// ── 카메라
export function cameraSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext;
}
export async function startCamera(video, facing = 'environment') {
  if (!cameraSupported()) throw new Error(window.isSecureContext ? 'no_media' : 'insecure');
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
  });
  video.setAttribute('playsinline', ''); video.muted = true;
  video.srcObject = stream;
  await video.play().catch(() => {});
  return stream;
}
export function stopCamera(video) {
  const s = video && video.srcObject;
  if (s) s.getTracks().forEach((t) => t.stop());
  if (video) video.srcObject = null;
}
export function cameraErrorText(e) {
  const m = (e && (e.name || e.message)) || '';
  if (m === 'insecure') return '카메라는 HTTPS 또는 localhost에서만 사용할 수 있습니다.';
  if (/NotAllowed|Permission/i.test(m)) return '카메라 권한이 거부되었습니다.';
  if (/NotFound|Overconstrained|no_media/i.test(m)) return '사용할 수 있는 카메라가 없습니다.';
  return '카메라를 시작하지 못했습니다.';
}

// ── 바텀시트
export function sheet(el) {
  let dim = el.previousElementSibling;
  if (!dim || !dim.classList.contains('sheet-dim')) {
    dim = document.createElement('div'); dim.className = 'sheet-dim';
    el.parentNode.insertBefore(dim, el);
  }
  const api = {
    open() { dim.classList.add('open'); el.classList.add('open'); },
    close() { dim.classList.remove('open'); el.classList.remove('open'); },
    get isOpen() { return el.classList.contains('open'); },
  };
  dim.addEventListener('click', api.close);
  $$('[data-sheet-close]', el).forEach((b) => b.addEventListener('click', api.close));
  return api;
}

// ── 토스트
let toastEl, toastT;
export function toast(msg, ms = 2200) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('show'), ms);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
