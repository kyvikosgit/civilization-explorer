// 미션 끝 공통(11/03 미팅) — 스캔 → 미션 → 수집품 받기 → 셋 중 하나: [목록으로 돌아가기 | 다음 미션으로 이동] · 체험 더보기(작게)
//   수집품은 정답과 함께 저절로 담긴다(저장 단추 없음). 체험 더보기 = 그 구역의 둘러보기 요소(메인 미션이 끝난 뒤에만)
//   문서 기준(<base>)이 v2 폴더인 페이지가 있어 주소는 이 파일 자리(v3)를 기준으로 만든다
import { ZONES, COLLECT_IDS, findTask } from './data.js';
import { store } from './store.js';

const V3 = new URL('./', import.meta.url).href;
export const HUB = V3 + 'index.html';
// 관람 동선 순서 — 다음 미션. 11/18: 나다르(C-4)는 앱 미션이 아니라 현장 촬영이라 사슬에서 뺀다(에트르타 → 모네). 나다르 화면 자체의 다음은 모네
const ORDER = ['salon', 'society', 'industry', 'atelier', 'monet'];
const PAGE = { salon: 'salon.html', society: 'society.html', industry: 'industry.html', atelier: 'atelier.html', nadar: 'nadar.html', monet: 'monet.html' };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function nextOf(zoneId) {
  const n = zoneId === 'nadar' ? 'monet' : ORDER[ORDER.indexOf(zoneId) + 1];
  return n ? { href: V3 + PAGE[n], title: ZONES.find((z) => z.id === n).title } : { href: V3 + 'exit.html', title: '완주 엠블럼 · 기념품' };
}

const CSS = `
/* ── 미션 완료 공통 화면(11/06) — 구역마다 다르던 끝 화면을 하나로. 정답 연출이 끝나면 이 판이 덮는다 */
.v3-done{--d-bg:#FFFFFF;--d-ink:#111111;--d-sub:#707070;--d-line:#ECE9E2;--d-panel:#F5F5F3;--d-pt:#739071;--d-sage:#739071;--d-sage-deep:#5B7559;--d-tint:#EEF2EC;position:fixed;inset:0;z-index:9000;background:var(--d-bg);color:var(--d-ink);font-family:Freesentation,Pretendard,sans-serif;word-break:keep-all;display:flex;flex-direction:column;opacity:0;transition:opacity .35s ease}
.v3-done.on{opacity:1}
.v3-done .d-bar{flex:none;height:calc(52px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 12px 0;display:grid;grid-template-columns:44px 1fr 44px;align-items:center;border-bottom:1px solid transparent}
.v3-done .d-bar a{width:44px;height:44px;display:grid;place-items:center;color:var(--d-ink);text-decoration:none;position:relative}
.v3-done .d-bar svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.v3-done .d-loc{text-align:center;font-size:17px;font-weight:700;color:var(--d-ink);letter-spacing:-.01em}
.v3-done .d-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px 20px 24px}
.v3-done .d-in{max-width:440px;margin:0 auto}
.v3-done .d-cap{margin:6px auto 0;width:max-content;display:flex;align-items:center;gap:6px;padding:7px 14px 7px 9px;border-radius:999px;background:var(--d-tint);color:var(--d-sage-deep);font-size:14.5px;font-weight:700;letter-spacing:-.01em}
.v3-done .d-cap::before{content:'';width:18px;height:18px;border-radius:50%;background:var(--d-sage) center/12px no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5' fill='none' stroke='%23fff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")}
.v3-done .d-cap small{display:block}
.v3-done .d-card{position:relative;margin:14px auto 0;width:100%;height:min(32vh,260px);border-radius:14px;background:transparent;display:flex;align-items:center;justify-content:center;overflow:visible;transform:scale(.92);opacity:0;transition:transform .5s cubic-bezier(.2,.8,.2,1),opacity .4s}
.v3-done.on .d-card{transform:none;opacity:1}
.v3-done .d-card img{max-width:88%;max-height:86%;width:auto;height:auto;object-fit:contain;filter:drop-shadow(0 10px 18px rgba(0,0,0,.18))}   /* 11/17: 세로로 긴 그림(전단지)이 위아래로 잘리지 않게 — 카드 높이 안에 다 들어감 */
.v3-done .d-card img.cover{max-width:100%;max-height:100%;width:100%;height:100%;object-fit:cover;filter:none}
.v3-done .d-name{margin-top:16px;text-align:center;font-family:Paperlogy,Freesentation,sans-serif;font-size:23px;font-weight:800;line-height:1.3}
.v3-done .d-sub{margin-top:5px;text-align:center;font-size:14px;color:var(--d-sub)}
.v3-done .d-txt{margin-top:20px;padding-top:18px;border-top:1px solid var(--d-line);text-align:center;opacity:0;transform:translateY(8px);transition:opacity .5s,transform .5s}
.v3-done.read .d-txt{opacity:1;transform:none}
.v3-done .d-title{font-family:Paperlogy,Freesentation,sans-serif;font-size:19px;font-weight:800;line-height:1.4}
.v3-done .d-again{display:block;margin:22px auto 6px;padding:8px 16px;border:1px solid var(--d-line);border-radius:999px;background:#fff;font:inherit;font-size:14px;font-weight:600;color:var(--d-sub)}
.v3-done .d-guide{margin-top:18px;padding:12px 14px;border-radius:12px;background:var(--d-panel);font-size:15px;font-weight:700;line-height:1.5;text-align:center;white-space:pre-line}
.v3-done .d-body{margin-top:8px;font-size:15.5px;line-height:1.7;white-space:pre-line}
.v3-done .d-note{margin:34px auto 4px;max-width:320px;text-align:center;font-family:Paperlogy,Freesentation,sans-serif;font-size:15.5px;font-weight:600;line-height:1.8;letter-spacing:-.01em;color:var(--d-ink);white-space:pre-line;word-break:keep-all;opacity:0;transform:translateY(8px);transition:opacity 1s .6s,transform 1s .6s}
.v3-done.read .d-note{opacity:1;transform:none}
.v3-done .d-note::before,.v3-done .d-note::after{content:'';display:block;width:40px;height:1.5px;margin:0 auto;background:var(--d-line);border-radius:1px}
.v3-done .d-note::before{margin-bottom:14px}
.v3-done .d-note::after{margin-top:14px}
.v3-done .d-foot{flex:none;padding:12px 20px calc(14px + env(safe-area-inset-bottom));border-top:1px solid var(--d-line);background:var(--d-bg);opacity:0;transition:opacity .5s}
.v3-done.read .d-foot{opacity:1}
.v3-done .d-foot .v3-end{margin:0 auto;padding:0}
.v3-done .d-foot .v3-end .ve-got{display:none}
.v3-done .d-foot .v3-end .ve-more{margin-top:6px;padding:6px 12px}
.v3-fly{position:fixed;z-index:9001;pointer-events:none;object-fit:cover;box-shadow:0 8px 22px rgba(0,0,0,.18)}
.v3-done .d-col{margin-top:18px;text-align:center;padding:14px 12px 16px;border-radius:16px;background:var(--d-panel)}   /* 11/26 나의 수집품 = 한 판으로 감쌈 */
.v3-done .d-col .d-slots span:not(.on){background:#FFFFFF}
.v3-done .d-colt{display:flex;align-items:center;justify-content:center;gap:8px;font-family:Paperlogy,Freesentation,sans-serif;font-size:16px;font-weight:800;color:var(--d-ink);letter-spacing:-.01em}
.v3-done .d-colt .d-cnt{display:inline-flex;align-items:baseline;gap:2px;padding:3px 10px;border-radius:999px;background:var(--d-tint);color:var(--d-sage-deep);font-family:Freesentation,sans-serif;font-size:14px;font-weight:700}
.v3-done .d-colt b{font-size:16px;font-weight:800;color:var(--d-sage-deep)}
.v3-done .d-slots{margin-top:12px;display:flex;justify-content:center;gap:8px}
/* 11/23 앱과 같은 수집품 카드: 크림 종이 + 이중 액자(앱 src/lib/CollectCard.tsx) · 못 모은 칸 = 점선 */
.v3-done .d-slots span{width:46px;height:61px;border-radius:4px;background:#F6F3EE;border:1.5px dashed #D3CCBE;overflow:hidden;display:block;box-sizing:border-box}
.v3-done .d-slots span.me{border-color:var(--d-pt)}
.v3-done .d-slots span{border-radius:7px}
.v3-done .d-slots span.on{background:#F0E9DC;border:1px solid rgba(58,53,43,.14)}
.v3-done .d-slots span img{width:100%;height:100%;object-fit:contain;display:block;padding:3px;box-sizing:border-box}   /* 11/24 작은 칸도 잘리지 않게 */
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
export function style() {   // 11/18: 출구(exit.html)도 같은 판 모양(금장식 머리 · 수집품 칸 · 맺음줄)을 쓴다
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
    // 11/18 미팅: 앱에서는 '다음'이 다음 체험이 아니라 다음 구역(그 구역 도슨트부터) — 앱이 정한다
    else if (/\/experience-v3\/(salon|society|industry|atelier|nadar|monet|exit)\.html$/.test(u.pathname) && u.pathname !== location.pathname) { e.preventDefault(); e.stopPropagation(); window.parent.postMessage({ m100: 'next' }, '*'); }
  }, true);
}

// 끝 줄 하나. item: { name, img, contain } · more: 체험 더보기를 누르면(없으면 단추 없음) · light: 밝은 바탕 페이지
export function endRow(zoneId, { item, got = '수집품을 받았습니다', more, moreLabel = '체험 더보기', light = false, btn = '다음', then = null } = {}) {
  style();
  const nx = then ? { href: then.href, title: '' } : nextOf(zoneId);   // 11/26 then = 이어지는 체험(시민사회 → 사람들의 대화 벽 AR)
  // 앱 안(웹뷰 · 앱 웹 버전 iframe)에서는 다음 구역으로 — 앱이 그 구역 도슨트부터 이어 준다(어느 구역인지는 앱 동선이 정함)
  const inApp = !!window.__m100app || EMBED;
  const el = document.createElement('div');
  el.className = 'v3-end' + (light ? ' light' : '');
  const pic = item?.img ? `<img src="${esc(new URL(item.img, V3).href)}" alt=""${item.contain ? ' class="contain"' : ''}>` : '';
  el.innerHTML = `${item ? `<p class="ve-got">${pic}<span>${esc(got)} · <b>${esc(item.name)}</b></span></p>` : ''}
    ${inApp
      // 11/20: 앱 안에서는 [다음] 하나 — 누르면 구역 화면으로 돌아가며 이 화면이 체험 카드로 줄어든다(앱 src/lib/expReturn.ts)
      ? `<div class="ve-btns"><a class="ve-btn fill" href="${esc(nx.href)}" style="flex:1">${esc(then ? then.label : btn)}</a></div>`
      : `<div class="ve-btns"><a class="ve-btn line" href="${esc(HUB)}">목록으로 돌아가기</a><a class="ve-btn fill" href="${esc(nx.href)}">${then ? esc(then.label) : `다음 미션으로<small>${esc(nx.title)}</small>`}</a></div>`}
`;   // 11/20: 체험 더보기는 모두 뺌(사용자 지시) — more · moreLabel 은 받기만 함
  void more; void moreLabel;
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
// 이 페이지를 열 때 이미 담겨 있던 수집품(앱이 ?got= 으로 넘김) — 다시 들어왔을 때 담기는 연출을 되풀이하지 않게
const SAVED0 = new Set(COLLECT_IDS.filter((id) => store.saved(id)));
// 11/23 수집품 카드 그림 — 앱과 같은 것(kippu-app/scripts/collect/make_cards.py): 같은 바탕 · 크기 · 그림자 · 금 액자
const CC = { salon: 'img/cc_salon.jpg', flyer: 'img/cc_flyer.jpg', ticket: 'img/cc_ticket.jpg', paint: 'img/cc_paint.jpg', sunrise: 'img/cc_sunrise.jpg' };
const ccOf = (id) => (CC[id] ? new URL(CC[id], V3).href : '');
// 11/26 위 가운데 = 앱 구역 화면과 같은 구역 이름(구역 번호 B · C-2 같은 운영 코드는 안 보임)
const ZONE_NAME = { salon: '아카데미 살롱', society: '시민사회', industry: '사업가의 방', atelier: '화가의 작업 공간', nadar: '나다르 사진관', monet: '인상파 전시회' };
export function showComplete(zoneId, { item, title = '', body = '', note = '', more, cap = '미션 완료', then = null } = {}) {
  style();
  void more;
  const zone = ZONES.find((z) => z.id === zoneId);
  const total = COLLECT_IDS.length, got = COLLECT_IDS.filter((id) => store.saved(id)).length;
  const slot = COLLECT_IDS.findIndex((id) => ZONES.find((z) => z.id === zoneId)?.tasks.some((t) => t.id === id));   // 이 구역 수집품 칸(없으면 -1 · 나다르)
  const cc = slot >= 0 ? ccOf(COLLECT_IDS[slot]) : '';   // 11/23 수집품 카드 그림(앱과 같은 것) — 큰 카드 · 날아가는 사본 · 칸 모두
  const img = cc || (item?.img ? new URL(item.img, V3).href : '');
  if (cc && item) item = { ...item, contain: false };
  // 11/26 클라이언트 완료 문구: 제목 = successTitle, 기존 해설(제목 · 본문)은 그 아래 그대로, 맨 아래 = successGuide(다음 이동 안내)
  const ct = slot >= 0 ? findTask(COLLECT_IDS[slot])?.task : null;
  let guide = '';
  if (ct?.successTitle) { body = [title, (body || '').trim()].filter(Boolean).join('\n\n'); title = ct.successTitle; guide = ct.successGuide || ''; }
  const el = document.createElement('div');
  el.className = 'v3-done';
  el.innerHTML = `<div class="d-bar"><a href="${esc(HUB)}" aria-label="목록으로"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></a>
      <div class="d-loc">${esc(ZONE_NAME[zoneId] || (zone ? zone.loc.replace('4F · ', '').replace(`${zone.no} `, '') : ''))}</div>
      <span></span></div>
    <div class="d-scroll"><div class="d-in">
      <p class="d-cap">${esc(cap)}</p>
      ${img ? `<div class="d-card"><img src="${esc(img)}" alt=""></div>` : ''}
      ${item?.name ? `<p class="d-name">${esc(item.name)}</p>` : ''}${item?.sub ? `<p class="d-sub">${esc(item.sub)}</p>` : ''}
      ${slot >= 0 ? `<div class="d-col"><p class="d-colt">나의 수집품<span class="d-cnt"><b>${got - 1}</b> / ${total}</span></p><div class="d-slots">${COLLECT_IDS.map((id, i) => { const it = findTask(id)?.task?.item; const on = i !== slot && store.saved(id); return `<span class="${on ? 'on' : ''}${i === slot ? ' me' : ''}">${on && (ccOf(id) || it?.img) ? `<img src="${esc(ccOf(id) || new URL(it.img, V3).href)}" alt="">` : ''}</span>`; }).join('')}</div></div>` : ''}
      <div class="d-txt">${title ? `<p class="d-title">${esc(title)}</p>` : ''}${body ? `<p class="d-body">${esc(body)}</p>` : ''}${note ? `<p class="d-note">${esc(note)}</p>` : ''}${guide ? `<p class="d-guide">${esc(guide)}</p>` : ''}</div>
    </div></div>
    <div class="d-foot"></div>`;
  // 11/23 앱 안 단추 이름: 새로 받은 수집품 = [수집품에 저장], 이미 담아 둔 것 = [확인] (누르면 구역 화면으로 돌아가 체험 카드로 줄어든다)
  const already = slot >= 0 && SAVED0.has(COLLECT_IDS[slot]);
  el.querySelector('.d-foot').appendChild(endRow(zoneId, { light: true, then, btn: slot < 0 ? '다음' : already ? '확인' : '수집품에 저장' }));
  document.body.appendChild(el);
  // 11/26 흰 완료 화면 위에서 아이폰 맨 위(시간 · 배터리) 글자가 흰색이라 묻히던 것 — 앱이 읽는 바탕색(theme-color)을 흰색으로 바꿔 상태 막대를 검은 글자로
  let tc = document.querySelector('meta[name=theme-color]'); if (!tc) { tc = document.createElement('meta'); tc.name = 'theme-color'; document.head.appendChild(tc); }
  const tc0 = tc.getAttribute('content'); tc.setAttribute('content', '#FFFFFF');
  // 11/26 '다시 체험'(작게) — 구역 화면에서 빼고 여기로. 누르면 이 체험을 처음부터 다시
  const again = document.createElement('button'); again.type = 'button'; again.className = 'd-again'; again.textContent = '다시 체험하기';
  again.onclick = () => location.reload();
  el.querySelector('.d-txt')?.after(again);
  const api = { el, hide() { el.classList.remove('on'); if (tc0) tc.setAttribute('content', tc0); setTimeout(() => el.remove(), 350); } };
  // 11/26 기차표도 다른 미션처럼 단추를 눌러야 넘어감(완료 화면 자동 넘김은 사용자 지시로 뺌 — 수집품 · 해설을 읽는 중에 넘어가 버림)
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on'))); setTimeout(() => el.classList.add('on'), 80);   // 그리기가 잠깐 멈춘 화면(뒤 3D 로딩 중)에서도 뜨게
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const land = (flew) => { const sp = el.querySelectorAll('.d-slots span')[slot]; if (sp) { sp.classList.add('on'); if (!flew) sp.classList.add('pop'); sp.innerHTML = `<img src="${esc(img)}" alt="">`; } const n = el.querySelector('.d-colt b'); if (n) n.textContent = got; el.classList.add('read'); };
  // 11/20: 이미 담아 둔 수집품(다시 들어온 경우) — 담기는 연출 없이, 칸에 이미 들어 있는 완료 화면만
  if (slot >= 0 && SAVED0.has(COLLECT_IDS[slot])) {
    const sp = el.querySelectorAll('.d-slots span')[slot]; if (sp) { sp.classList.add('on'); if (img) sp.innerHTML = `<img src="${esc(img)}" alt="">`; }
    const n = el.querySelector('.d-colt b'); if (n) n.textContent = got; el.classList.add('read'); return api;
  }
  if (!img || reduce || slot < 0) { setTimeout(land, 500); return api; }
  // 날아가는 사본 — 카드 속 사진 자리에서 수집품 칸으로. 크기 · 비율 · 모서리 둥글기를 한 번에 칸 모양으로 바꿔 가며 정확히 그 칸에 내려앉는다(11/17: 줄었다 다시 커지는 튐 없앰)
  setTimeout(() => {
    const src = el.querySelector('.d-card img'), card = el.querySelector('.d-card'), box = el.querySelectorAll('.d-slots span')[slot];
    const a = src.getBoundingClientRect(), b = box.getBoundingClientRect();
    const r0 = parseFloat(getComputedStyle(card).borderRadius) || 14, r1 = parseFloat(getComputedStyle(box).borderRadius) || 8;
    const f = document.createElement('img'); f.src = img; f.className = 'v3-fly';
    Object.assign(f.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px', borderRadius: r0 + 'px' });
    document.body.appendChild(f);
    const anim = f.animate([
      { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px', borderRadius: r0 + 'px', boxShadow: '0 8px 22px rgba(0,0,0,.18)' },
      { left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px', borderRadius: r1 + 'px', boxShadow: '0 0 0 rgba(0,0,0,0)' },
    ], { duration: 820, easing: 'cubic-bezier(.55,0,.2,1)', fill: 'forwards' });
    const done = () => { land(true); requestAnimationFrame(() => f.remove()); };   // 칸 사진을 먼저 넣고 다음 프레임에 사본을 지운다(깜빡임 없게)
    anim.finished.then(done, done);
  }, 1100);
  return api;
}
