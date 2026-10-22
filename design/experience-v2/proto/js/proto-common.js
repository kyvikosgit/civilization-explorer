// 체험 재기획 v2 프로토타입 공용 유틸 — 부스 프로토타입 booth/js/common.js 의 아이콘·시트·토스트를 그대로 가져옴 (해시 라우팅은 쓰지 않는다)
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

export const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 9h16v10H4zM3 5h18v4H3zM10 12h4"/></svg>',
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M7 12h10"/></svg>',
};
export function icons(root = document) { $$('[data-ic]', root).forEach((e) => { e.innerHTML = ICON[e.dataset.ic]; }); }

// 바텀시트
export function sheet(el) {
  let dim = el.previousElementSibling;
  if (!dim || !dim.classList.contains('sheet-dim')) { dim = document.createElement('div'); dim.className = 'sheet-dim'; el.parentNode.insertBefore(dim, el); }
  const api = {
    open() { dim.classList.add('open'); el.classList.add('open'); },
    close() { dim.classList.remove('open'); el.classList.remove('open'); },
    get isOpen() { return el.classList.contains('open'); },
  };
  dim.addEventListener('click', api.close);
  $$('[data-sheet-close]', el).forEach((b) => b.addEventListener('click', api.close));
  return api;
}

// 토스트
let toastEl, toastT;
export function toast(msg, ms = 2200) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('show'), ms);
}

// 화면 전환
export function showScreen(id) {
  $$('.scr').forEach((s) => s.classList.toggle('on', s.id === id));
  window.scrollTo(0, 0);
}

export function haptic(ms = 18) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* noop */ } }

// 내 입장 저장 — 기기 안(localStorage)에만. 출구 화면(exit.html)이 읽는다. 서버 없음
const CHOICE_KEY = 'm100_choice';
export function loadChoices() { try { return JSON.parse(localStorage.getItem(CHOICE_KEY) || '{}') || {}; } catch (e) { return {}; } }
export function saveChoice(station, data) {
  try { const all = loadChoices(); all[station] = { ...data, at: Date.now() }; localStorage.setItem(CHOICE_KEY, JSON.stringify(all)); } catch (e) { /* noop */ }
}
export function clearChoices() { try { localStorage.removeItem(CHOICE_KEY); } catch (e) { /* noop */ } }
