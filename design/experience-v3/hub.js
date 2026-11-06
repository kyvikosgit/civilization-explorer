// v3 체험 목록 — 구역 순서는 동선대로. 체험마다 v2 연출을 살린 자기 화면
import { ZONES, COLLECT_IDS, findTask } from './data.js';
import { store } from './store.js';
// 앱 웹 버전(iframe) 안에서 이 목록이 열리면(뒤로 · 목록으로 어느 길로 와도) 앱의 체험 목록으로 돌려보낸다
if (window.parent !== window && !window.ReactNativeWebView) { try { window.parent.postMessage({ m100: 'home' }, '*'); } catch {} }
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const $ = (s) => document.querySelector(s);
const PAGE = { salon: 'salon.html', society: 'society.html', industry: 'industry.html', atelier: 'atelier.html', nadar: 'nadar.html', monet: 'monet.html' };
const CHEV = '<svg class="ico chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';

// 구역 이름(번호는 왼쪽 칸에 있다). 제목과 같으면 쓰지 않는다
const place = (z) => { const l = z.loc.replace('4F · ', '').replace(`${z.no} `, ''); return l === z.title ? '' : l; };

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
    if (z.id === 'nadar') st = '촬영 · QR로 사진 받기';
    else if (col.length && col.every((t) => store.saved(t.id))) { st = '수집함에 담음'; ok = true; }
    return `<a class="row" href="${PAGE[z.id]}"><span class="no">${esc(z.no)}</span>
      <span class="b"><span class="tt">${esc(z.title)}</span><span class="st${ok ? ' ok' : ''}">${esc([place(z), st].filter(Boolean).join(' · '))}</span></span>${CHEV}</a>`;
  }).join('') + `<a class="row exit" href="exit.html"><span class="no">출구</span><span class="b"><span class="tt">기념품 받기</span>
    <span class="st">${store.redeemed() ? '기념품을 받았습니다' : got.length === COLLECT_IDS.length ? '모두 모았습니다 · 직원에게 보여 주세요' : `${COLLECT_IDS.length}가지를 모으면 · 지금 ${got.length}`}</span></span>${CHEV}</a>`;
}
$('#reset').onclick = () => {
  if (!confirm('수집·정답·기념품 기록을 모두 지울까요?')) return;
  store.reset();
  try { localStorage.removeItem('m100v3_atelier_seen'); sessionStorage.clear(); } catch {}
  render();
};
addEventListener('pageshow', render);
render();
