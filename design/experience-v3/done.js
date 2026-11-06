// 미션 끝 공통(11/03 미팅) — 스캔 → 미션 → 수집품 받기 → 셋 중 하나: [목록으로 돌아가기 | 다음 미션으로 이동] · 체험 더보기(작게)
//   수집품은 정답과 함께 저절로 담긴다(저장 단추 없음). 체험 더보기 = 그 구역의 둘러보기 요소(메인 미션이 끝난 뒤에만)
//   문서 기준(<base>)이 v2 폴더인 페이지가 있어 주소는 이 파일 자리(v3)를 기준으로 만든다
import { ZONES } from './data.js';
import { store } from './store.js';

const V3 = new URL('./', import.meta.url).href;
export const HUB = V3 + 'index.html';
// 관람 동선 순서 — 다음 미션
const ORDER = ['salon', 'society', 'industry', 'atelier', 'nadar', 'monet'];
const PAGE = { salon: 'salon.html', society: 'society.html', industry: 'industry.html', atelier: 'atelier.html', nadar: 'nadar.html', monet: 'monet.html' };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function nextOf(zoneId) {
  const n = ORDER[ORDER.indexOf(zoneId) + 1];
  return n ? { href: V3 + PAGE[n], title: ZONES.find((z) => z.id === n).title } : { href: V3 + 'exit.html', title: '출구 · 기념품 받기' };
}

const CSS = `
.v3-end{--ve-ink:#F2EDE2;--ve-fill:#F2EDE2;--ve-on:#16110c;width:100%;max-width:420px;margin:0 auto;color:var(--ve-ink);font-family:Freesentation,Pretendard,sans-serif;word-break:keep-all;text-align:center}
.v3-end.light{--ve-ink:#2A2119;--ve-fill:#2A2119;--ve-on:#F7F0DF}
.v3-end .ve-got{display:flex;align-items:center;justify-content:center;gap:8px;margin:0 0 14px;font-size:14px;font-weight:600;opacity:.9}
.v3-end .ve-got img{width:28px;height:28px;object-fit:cover;border-radius:4px;flex:none}
.v3-end .ve-got img.contain{object-fit:contain;background:rgba(127,127,127,.15)}
.v3-end .ve-btns{display:flex;gap:8px}
.v3-end .ve-btn{flex:1;min-height:54px;padding:8px 10px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font:inherit;font-size:16px;font-weight:800;line-height:1.25;text-decoration:none;cursor:pointer}
.v3-end .ve-btn.line{background:transparent;color:var(--ve-ink);border:1px solid color-mix(in srgb,var(--ve-ink) 32%,transparent)}
.v3-end .ve-btn.fill{background:var(--ve-fill);color:var(--ve-on);border:0}
.v3-end .ve-btn small{font-size:12px;font-weight:600;opacity:.72}
.v3-end .ve-more{margin:12px auto 0;padding:10px 12px;display:inline-flex;align-items:center;gap:2px;background:none;border:0;font:inherit;font-size:14px;font-weight:600;color:var(--ve-ink);opacity:.62;cursor:pointer}
.v3-end .ve-more svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
`;
let styled = false;
function style() {
  if (styled) return; styled = true;
  const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
}

// 수집품 받기 — 정답 순간에 저절로
//   앱 웹뷰 안이면 앱 수집함에도(exp/[id].tsx 가 {type:'collect'} 를 받아 이 페이지의 수집품으로 담는다 — 저장 단추가 없어졌으므로)
export function collect(taskId) {
  store.save(taskId); navigator.vibrate?.(16);
  try { window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'collect', url: location.href })); } catch {}
  // 앱 웹 버전(다른 주소의 iframe) — 부모 창에 알린다
  if (EMBED) try { window.parent.postMessage({ m100: 'collect', url: location.href }, '*'); } catch {}
}

// 앱 웹 버전 안(iframe)에서는 체험 목록(v3 index)으로 가는 이동을 앱 목록으로 돌린다 — 웹 프로토타입 목록이 뜨지 않게
const EMBED = window.parent !== window && !window.ReactNativeWebView;
if (EMBED) {
  document.addEventListener('click', (e) => {
    const a = e.target?.closest?.('a[href]'); if (!a) return;
    const u = new URL(a.getAttribute('href'), location.href);
    if (/\/experience-v3\/(index\.html)?$/.test(u.pathname)) { e.preventDefault(); e.stopPropagation(); window.parent.postMessage({ m100: 'home' }, '*'); }
  }, true);
}

// 끝 줄 하나. item: { name, img, contain } · more: 체험 더보기를 누르면(없으면 단추 없음) · light: 밝은 바탕 페이지
export function endRow(zoneId, { item, got = '수집품을 받았습니다', more, moreLabel = '체험 더보기', light = false } = {}) {
  style();
  const nx = nextOf(zoneId);
  const el = document.createElement('div');
  el.className = 'v3-end' + (light ? ' light' : '');
  const pic = item?.img ? `<img src="${esc(new URL(item.img, V3).href)}" alt=""${item.contain ? ' class="contain"' : ''}>` : '';
  el.innerHTML = `${item ? `<p class="ve-got">${pic}<span>${esc(got)} · <b>${esc(item.name)}</b></span></p>` : ''}
    <div class="ve-btns"><a class="ve-btn line" href="${esc(HUB)}">목록으로 돌아가기</a><a class="ve-btn fill" href="${esc(nx.href)}">다음 미션으로<small>${esc(nx.title)}</small></a></div>
    ${more ? `<button class="ve-more" type="button">${esc(moreLabel)}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>` : ''}`;
  if (more) el.querySelector('.ve-more').onclick = more;
  return el;
}

// 자리에 끼우기 — 그 자리의 원래 끝 단추를 대신한다
export function mountEnd(host, zoneId, opts) {
  const el = endRow(zoneId, opts);
  host.innerHTML = ''; host.appendChild(el);
  return el;
}
