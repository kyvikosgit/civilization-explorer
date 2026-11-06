// 미션 끝 공통(11/03 미팅) — 스캔 → 미션 → 수집품 받기 → 셋 중 하나: [목록으로 돌아가기 | 다음 미션으로 이동] · 체험 더보기(작게)
//   수집품은 정답과 함께 저절로 담긴다(저장 단추 없음). 체험 더보기 = 그 구역의 둘러보기 요소(메인 미션이 끝난 뒤에만)
//   문서 기준(<base>)이 v2 폴더인 페이지가 있어 주소는 이 파일 자리(v3)를 기준으로 만든다
import { ZONES, COLLECT_IDS, findTask } from './data.js';
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
/* ── 미션 완료 공통 화면(11/06) — 구역마다 다르던 끝 화면을 하나로. 정답 연출이 끝나면 이 판이 덮는다 */
.v3-done{--d-bg:#FFFFFF;--d-ink:#111111;--d-sub:#707070;--d-line:#ECE9E2;--d-panel:#F5F5F3;--d-pt:#D9672F;position:fixed;inset:0;z-index:9000;background:var(--d-bg);color:var(--d-ink);font-family:Freesentation,Pretendard,sans-serif;word-break:keep-all;display:flex;flex-direction:column;opacity:0;transition:opacity .35s ease}
.v3-done.on{opacity:1}
.v3-done .d-bar{flex:none;height:calc(52px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 12px 0;display:grid;grid-template-columns:44px 1fr 44px;align-items:center;border-bottom:1px solid transparent}
.v3-done .d-bar a{width:44px;height:44px;display:grid;place-items:center;color:var(--d-ink);text-decoration:none;position:relative}
.v3-done .d-bar svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.v3-done .d-loc{text-align:center;font-size:13px;font-weight:700;color:var(--d-sub)}
.v3-done .d-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px 20px 24px}
.v3-done .d-in{max-width:440px;margin:0 auto}
.v3-done .d-cap{font-size:13px;font-weight:800;color:var(--d-pt);text-align:center;margin-top:6px}
.v3-done .d-card{margin:12px auto 0;width:100%;height:min(30vh,240px);border-radius:14px;background:var(--d-panel);display:grid;place-items:center;overflow:hidden;transform:scale(.92);opacity:0;transition:transform .5s cubic-bezier(.2,.8,.2,1),opacity .4s}
.v3-done.on .d-card{transform:none;opacity:1}
.v3-done .d-card img{max-width:86%;max-height:84%;object-fit:contain;filter:drop-shadow(0 10px 18px rgba(0,0,0,.18))}
.v3-done .d-card img.cover{max-width:100%;max-height:100%;width:100%;height:100%;object-fit:cover;filter:none}
.v3-done .d-name{margin-top:14px;text-align:center;font-family:Paperlogy,Freesentation,sans-serif;font-size:21px;font-weight:800;line-height:1.3}
.v3-done .d-sub{margin-top:4px;text-align:center;font-size:13.5px;color:var(--d-sub)}
.v3-done .d-txt{margin-top:20px;padding-top:18px;border-top:1px solid var(--d-line);opacity:0;transform:translateY(8px);transition:opacity .5s,transform .5s}
.v3-done.read .d-txt{opacity:1;transform:none}
.v3-done .d-title{font-family:Paperlogy,Freesentation,sans-serif;font-size:18px;font-weight:800;line-height:1.4}
.v3-done .d-body{margin-top:8px;font-size:15.5px;line-height:1.7;white-space:pre-line}
.v3-done .d-note{margin-top:12px;font-size:13.5px;line-height:1.6;color:var(--d-sub);white-space:pre-line}
.v3-done .d-foot{flex:none;padding:12px 20px calc(14px + env(safe-area-inset-bottom));border-top:1px solid var(--d-line);background:var(--d-bg);opacity:0;transition:opacity .5s}
.v3-done.read .d-foot{opacity:1}
.v3-done .d-foot .v3-end{margin:0 auto;padding:0}
.v3-done .d-foot .v3-end .ve-got{display:none}
.v3-done .d-foot .v3-end .ve-more{margin-top:6px;padding:6px 12px}
.v3-fly{position:fixed;z-index:9001;pointer-events:none;object-fit:cover;transform-origin:center;transition:transform .8s cubic-bezier(.6,0,.2,1)}
.v3-done .d-col{margin-top:16px;text-align:center}
.v3-done .d-colt{font-size:12.5px;font-weight:700;color:var(--d-sub)}
.v3-done .d-colt b{color:var(--d-ink)}
.v3-done .d-slots{margin-top:8px;display:flex;justify-content:center;gap:8px}
.v3-done .d-slots span{width:44px;height:44px;border-radius:8px;background:var(--d-panel);border:1px dashed #CFCBC2;overflow:hidden;display:block}
.v3-done .d-slots span.me{border-color:var(--d-pt)}
.v3-done .d-slots span.on{border:1px solid var(--d-line)}
.v3-done .d-slots span img{width:100%;height:100%;object-fit:cover;display:block}
.v3-done .d-slots span.pop{animation:dpop .35s ease}
@keyframes dpop{50%{transform:scale(1.18)}}

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

// ── 미션 완료 공통 화면 — 정답 연출이 끝난 뒤 부른다
//   item: { name, sub, img, contain } · title · body · note · more(체험 더보기) · cap(머리 한 줄)
//   수집품 사진이 가운데 크게 → 그 사진이 오른쪽 위 보관함으로 날아 들어가 숫자가 오른다 → 해설 · 끝 줄
export function showComplete(zoneId, { item, title = '', body = '', note = '', more, cap = '미션 완료' } = {}) {
  style();
  const zone = ZONES.find((z) => z.id === zoneId);
  const total = COLLECT_IDS.length, got = COLLECT_IDS.filter((id) => store.saved(id)).length;
  const img = item?.img ? new URL(item.img, V3).href : '';
  const slot = COLLECT_IDS.findIndex((id) => ZONES.find((z) => z.id === zoneId)?.tasks.some((t) => t.id === id));   // 이 구역 수집품 칸(없으면 -1 · 나다르)
  const el = document.createElement('div');
  el.className = 'v3-done';
  el.innerHTML = `<div class="d-bar"><a href="${esc(HUB)}" aria-label="목록으로"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></a>
      <div class="d-loc">${esc(zone ? zone.loc.replace(/^4F · /, '').replace(' ', ' · ') : '')}</div>
      <span></span></div>
    <div class="d-scroll"><div class="d-in">
      <p class="d-cap">${esc(cap)}</p>
      ${img ? `<div class="d-card"><img src="${esc(img)}" alt="" class="${item.contain ? '' : 'cover'}"></div>` : ''}
      ${item?.name ? `<p class="d-name">${esc(item.name)}</p>` : ''}${item?.sub ? `<p class="d-sub">${esc(item.sub)}</p>` : ''}
      ${slot >= 0 ? `<div class="d-col"><p class="d-colt">나의 수집품 <b>${got - 1}</b> / ${total}</p><div class="d-slots">${COLLECT_IDS.map((id, i) => { const it = findTask(id)?.task?.item; const on = i !== slot && store.saved(id); return `<span class="${on ? 'on' : ''}${i === slot ? ' me' : ''}">${on && it?.img ? `<img src="${esc(new URL(it.img, V3).href)}" alt="">` : ''}</span>`; }).join('')}</div></div>` : ''}
      <div class="d-txt">${title ? `<p class="d-title">${esc(title)}</p>` : ''}${body ? `<p class="d-body">${esc(body)}</p>` : ''}${note ? `<p class="d-note">${esc(note)}</p>` : ''}</div>
    </div></div>
    <div class="d-foot"></div>`;
  el.querySelector('.d-foot').appendChild(endRow(zoneId, { light: true, more: more ? () => more(api) : undefined }));
  document.body.appendChild(el);
  const api = { el, hide() { el.classList.remove('on'); setTimeout(() => el.remove(), 350); } };
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const land = () => { const sp = el.querySelectorAll('.d-slots span')[slot]; if (sp) { sp.classList.add('on', 'pop'); sp.innerHTML = `<img src="${esc(img)}" alt="">`; } const n = el.querySelector('.d-colt b'); if (n) n.textContent = got; el.classList.add('read'); };
  if (!img || reduce || slot < 0) { setTimeout(land, 500); return api; }
  // 날아가는 사본 — 카드 속 사진 자리에서 보관함 아이콘 자리로
  setTimeout(() => {
    const src = el.querySelector('.d-card img'), box = el.querySelectorAll('.d-slots span')[slot];
    const a = src.getBoundingClientRect(), b = box.getBoundingClientRect();
    const f = document.createElement('img'); f.src = img; f.className = 'v3-fly';
    Object.assign(f.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
    document.body.appendChild(f);
    const s = Math.min(b.width / a.width, b.height / a.height);
    requestAnimationFrame(() => { f.style.transform = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(${s})`; });
    setTimeout(() => { f.remove(); land(); }, 800);
  }, 1100);
  return api;
}
