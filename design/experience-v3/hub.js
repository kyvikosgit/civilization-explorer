// v3 체험 목록 — 구역 순서는 동선대로. 살롱 · 아틀리에 · 나다르는 각자 화면, 나머지는 zone.html
import { ZONES, COLLECT_IDS, findTask } from './data.js';
import { store } from './store.js';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const $ = (s) => document.querySelector(s);
const PAGE = { salon: 'salon.html', atelier: 'atelier.html', nadar: 'nadar.html' };
const CHEV = '<svg class="ico chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';

function render() {
  const got = COLLECT_IDS.filter((id) => store.saved(id));
  $('#tally').textContent = `${got.length} / ${COLLECT_IDS.length}`;
  $('#slots').innerHTML = COLLECT_IDS.map((id) => {
    const it = findTask(id).task.item;
    return `<div class="slot${store.saved(id) ? ' on' : ''}${it.contain ? ' contain' : ''}"><img src="${esc(it.img)}" alt=""></div>`;
  }).join('');
  $('#rows').innerHTML = ZONES.map((z) => {
    const col = z.tasks.filter((t) => t.collect);
    let st = '', ok = false;
    if (z.id === 'nadar') st = '사진 · 벽의 액자에 걸기';
    else if (col.length && col.every((t) => store.saved(t.id))) { st = '수집함에 담음'; ok = true; }
    else if (col.some((t) => store.solved(t.id))) { st = '정답 · 저장 전'; ok = true; }
    return `<a class="row" href="${PAGE[z.id] || `zone.html?z=${z.id}`}"><span class="no">${esc(z.no)}</span>
      <span class="b"><span class="tt">${esc(z.title)}</span><span class="st${ok ? ' ok' : ''}">${esc(z.loc.replace('4F · ', ''))}${st ? ` · ${esc(st)}` : ''}</span></span>${CHEV}</a>`;
  }).join('') + `<a class="row exit" href="exit.html"><span class="no">출구</span><span class="b"><span class="tt">기념품 받기</span>
    <span class="st">${got.length === COLLECT_IDS.length ? '다섯 가지를 모두 모았습니다' : `다섯 가지를 모으면 · 지금 ${got.length}`}</span></span>${CHEV}</a>`;
  $('#demo').classList.toggle('on', store.demo());
}
$('#demo').onclick = () => { store.setDemo(!store.demo()); render(); };
$('#reset').onclick = () => {
  if (!confirm('수집·정답·기념품 기록을 모두 지울까요?')) return;
  store.reset();
  try { localStorage.removeItem('m100v3_atelier_seen'); sessionStorage.clear(); } catch {}
  render();
};
addEventListener('pageshow', render);
render();
