// 정답 화면 — 수집품 카드 + 기획안 해설. 끝 단추는 모든 체험 공통 [처음으로 | 수집함에 저장]
import { esc } from './camui.js';
import { store } from './store.js';

let root = null;
export function showDone(task, { hub = 'index.html', base = '' } = {}) {
  if (!root) { root = document.createElement('div'); root.className = 'v3-done'; document.body.appendChild(root); }
  store.solve(task.id);
  const it = task.item, src = base + it.img;
  root.innerHTML = `<div class="in">
    <div class="cap">${esc(task.successTitle || '정답입니다')}</div>
    <h1>${esc(it.name)}</h1>
    <div class="icard"><div class="im${it.contain ? ' contain' : ''}"><img src="${esc(src)}" alt=""></div>
      <div class="tx"><b>${esc(it.name)}</b><small>${esc(it.sub || '')}</small></div></div>
    ${task.successVerdict ? `<div class="verdict">${esc(task.successVerdict)}</div>` : ''}
    <p class="body">${esc(task.successBody)}</p>
    ${task.extraPending ? `<p class="wait">${esc(task.extraPending)}</p>` : ''}
    ${task.after ? `<p class="after">${esc(task.after)}</p>` : ''}
    <div class="btns"><button class="btn line" data-a="home">처음으로</button><button class="btn" data-a="save">수집함에 저장</button></div>
  </div>`;
  const save = root.querySelector('[data-a="save"]');
  const mark = () => { save.disabled = true; save.textContent = '수집함에 담았어요'; };
  if (store.saved(task.id)) mark();
  save.onclick = () => { store.save(task.id); mark(); navigator.vibrate?.(16); };
  root.querySelector('[data-a="home"]').onclick = () => { location.href = hub; };
  root.scrollTop = 0;
  root.classList.add('on');
}
