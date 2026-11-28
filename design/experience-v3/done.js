// 미션 끝 공통(11/03 미팅) — 스캔 → 미션 → 수집품 받기 → 셋 중 하나: [목록으로 돌아가기 | 다음 미션으로 이동] · 체험 더보기(작게)
//   수집품은 정답과 함께 저절로 담긴다(저장 단추 없음). 체험 더보기 = 그 구역의 둘러보기 요소(메인 미션이 끝난 뒤에만)
//   문서 기준(<base>)이 v2 폴더인 페이지가 있어 주소는 이 파일 자리(v3)를 기준으로 만든다
import { ZONES, COLLECT_IDS, findTask } from './data.js';
import { store, replay } from './store.js';

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
/* 11/26 뒤로 단추 = 체험 화면 위 막대와 똑같이(experience-v2/proto/proto-base.css .topbar · .icon-btn: 40칸 · 아이콘 24 · 선 2) */
.v3-done .d-bar{flex:none;height:calc(52px + env(safe-area-inset-top, 0px));padding:env(safe-area-inset-top, 0px) 12px 0;display:grid;grid-template-columns:40px 1fr 40px;align-items:center;border-bottom:1px solid transparent}
.v3-done .d-bar a{width:40px;height:40px;border-radius:20px;display:grid;place-items:center;color:var(--d-ink);text-decoration:none;position:relative}
.v3-done .d-bar svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.v3-done .d-loc{text-align:center;font-size:19px;font-weight:700;color:var(--d-ink);letter-spacing:-.01em}   /* 11/28 체험 화면 위 막대 제목 공통 19px */
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
.v3-done .d-again{display:block;box-sizing:border-box;margin:22px auto 6px;padding:8px 16px;border:1px solid var(--d-line);border-radius:999px;background:#fff;font:inherit;font-size:14px;font-weight:600;color:var(--d-sub)}
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
/* 11/28 '떠올라 수집품으로'(liftToCard) — 인식한 물건이 그 자리에서 떠올라 가운데 → 흰 완료 화면이 깔리며 카드 속 그 자리로 */
.v3-lift{position:fixed;inset:0;z-index:9500;pointer-events:none}
.v3-lift .lf-bg{position:absolute;inset:0;background:#FFFFFF;opacity:0}
.v3-lift .lf-o{position:absolute;will-change:left,top,width,height,transform}
.v3-lift .lf-o img{position:absolute;inset:0;width:100%;height:100%;display:block}
.v3-lift .lf-to{object-fit:contain;opacity:0;filter:drop-shadow(0 14px 22px rgba(40,28,16,.28))}
.v3-lift .lf-from{object-fit:contain}
.v3-lift .lf-curl{position:absolute;inset:0;perspective:900px;transform-style:preserve-3d}
.v3-lift .lf-curl i{position:absolute;left:0;width:100%;background-repeat:no-repeat;backface-visibility:hidden;will-change:transform}
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
.v3-end .ve-btn{flex:1;box-sizing:border-box;min-height:56px;padding:8px 12px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font:inherit;font-size:17px;font-weight:700;line-height:1.25;text-decoration:none;cursor:pointer}   /* 11/28 앱 주 단추와 같게(높이 56 · 17px) — 페이지마다 여백 계산이 달라 54/70 으로 갈리던 것(box-sizing 고정) */
.v3-end .ve-btn.line{background:transparent;color:var(--ve-ink);border:1px solid color-mix(in srgb,var(--ve-ink) 32%,transparent)}
.v3-end .ve-btn.fill{background:var(--ve-fill);color:var(--ve-on);border:0}
.v3-end .ve-btn small{font-size:13px;font-weight:600;opacity:.72}
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
  // 11/28 사용자: 큰 자리에 크림색 카드 바탕(세로로 긴 황색 네모)까지 박히던 것 — 큰 자리는 수집품 그림만(액자 · 물건, 투명 바탕 lift_<id>), 아래 작은 칸은 카드 그대로
  const big = slot >= 0 && LIFT[COLLECT_IDS[slot]] ? liftImg(COLLECT_IDS[slot]) : img;
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
      ${img ? `<div class="d-card"><img src="${esc(big)}" alt=""></div>` : ''}
      ${item?.name ? `<p class="d-name">${esc(item.name)}</p>` : ''}${item?.sub ? `<p class="d-sub">${esc(item.sub)}</p>` : ''}
      ${slot >= 0 ? `<div class="d-col"><p class="d-colt">나의 수집품<span class="d-cnt"><b>${got - 1}</b> / ${total}</span></p><div class="d-slots">${COLLECT_IDS.map((id, i) => { const it = findTask(id)?.task?.item; const on = i !== slot && store.saved(id); return `<span class="${on ? 'on' : ''}${i === slot ? ' me' : ''}">${on && (ccOf(id) || it?.img) ? `<img src="${esc(ccOf(id) || new URL(it.img, V3).href)}" alt="">` : ''}</span>`; }).join('')}</div></div>` : ''}
      <div class="d-txt">${title ? `<p class="d-title">${esc(title)}</p>` : ''}${body ? `<p class="d-body">${esc(body)}</p>` : ''}${note ? `<p class="d-note">${esc(note)}</p>` : ''}${guide ? `<p class="d-guide">${esc(guide)}</p>` : ''}</div>
    </div></div>
    <div class="d-foot"></div>`;
  // 11/23 앱 안 단추 이름: 새로 받은 수집품 = [수집품에 저장], 이미 담아 둔 것 = [확인] (누르면 구역 화면으로 돌아가 체험 카드로 줄어든다)
  el.querySelector('.d-foot').appendChild(endRow(zoneId, { light: true, then, btn: slot < 0 ? '다음' : '확인' }));   // 11/26 담기는 연출이 이미 끝났으니 [확인]('수집품에 저장' 뺌)
  document.body.appendChild(el);
  // 11/26 흰 완료 화면 위에서 아이폰 맨 위(시간 · 배터리) 글자가 흰색이라 묻히던 것 — 앱이 읽는 바탕색(theme-color)을 흰색으로 바꿔 상태 막대를 검은 글자로
  let tc = document.querySelector('meta[name=theme-color]'); if (!tc) { tc = document.createElement('meta'); tc.name = 'theme-color'; document.head.appendChild(tc); }
  const tc0 = tc.getAttribute('content'); tc.setAttribute('content', '#FFFFFF');
  // 11/26 '다시 체험'(작게) — 구역 화면에서 빼고 여기로. 누르면 이 체험을 처음부터 다시
  const again = document.createElement('button'); again.type = 'button'; again.className = 'd-again'; again.textContent = '다시 체험하기';
  again.onclick = () => replay(slot >= 0 ? [COLLECT_IDS[slot]] : []);   // 그냥 새로 고치면 '이미 모음'이라 완료 화면이 또 떴음
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
    const f = document.createElement('img'); f.src = big; f.className = 'v3-fly'; f.style.objectFit = 'contain'; f.style.boxShadow = 'none';
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

// ── 11/28 '떠올라 수집품으로' 공통(살롱 · 전단지 · 물감 · 해돋이) — 사용자: 인식되면 그 물건이 붕 떠서 수집품으로 자연스럽게
//   ① 인식한 화면 자리(rect)에 그 물건(from = 비친 그대로의 그림 · 오려 낸 사진)이 겹쳐 떠오르고(살짝 커지며 그림자)
//   ② 가운데로 옮겨 가는 동안 깨끗한 수집품 그림(lift_<id>.webp, 카드 속 물건과 똑같은 것)으로 바뀌고 뒤에 흰 바탕이 깔린다
//   ③ 완료 화면(complete())이 뜨면 그 그림이 카드 속 물건 자리로 정확히 내려앉아 카드가 된다 — 잘리거나 지저분한 사진이 남지 않게
//   lifted: 이미 가운데에 떠 있는 상태로 시작 · hold: 가운데까지만(살롱 · 해돋이 8th Wall 은 엔진을 끄려고 hold 로 멈춘 뒤 페이지를 새로 열어 lifted 로 이어 감)
const LIFT = { salon: [43, 194, 633, 538], flyer: [91, 134, 538, 667], ticket: [43, 284, 633, 342], paint: [64, 162, 592, 606], sunrise: [43, 211, 633, 500] };   // 카드(720×960) 안 물건 자리 — kippu-app/scripts/collect/lift_objs.py
export function liftRect(id) {
  const [, , w0, h0] = LIFT[id], a = w0 / h0, W = innerWidth, H = innerHeight;
  let w = Math.min(W * 0.72, 330), h = w / a;
  if (h > H * 0.42) { h = H * 0.42; w = h * a; }
  return { l: (W - w) / 2, t: H * 0.42 - h / 2, r: (W + w) / 2, b: H * 0.42 + h / 2 };
}
const LIFT_EASE = 'cubic-bezier(.45,0,.2,1)';
const pos = (r) => ({ left: `${r.l}px`, top: `${r.t}px`, width: `${r.r - r.l}px`, height: `${r.b - r.t}px` });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 말린 종이 → 평평하게: 그림을 가로 띠 N개로 나눠 원통처럼 위아래 끝이 앞으로 말린 모양에서 시작해 0.75초 동안 곡률을 0으로(띠는 서로 이어진 채로)
//   curl = 끝이 앞으로 꺾인 각도(라디안, 0.5 ≈ 29°). 끝나면 띠를 걷고 평평한 그림(fr)을 보인다
async function uncurl(o, fr, curl) {
  const N = 14, W = o.clientWidth, H = o.clientHeight, src = fr.currentSrc || fr.src;
  const box = document.createElement('div'); box.className = 'lf-curl'; o.appendChild(box);
  const sh = H / N, strips = [];
  for (let k = 0; k < N; k++) { const st = document.createElement('i'); Object.assign(st.style, { top: `${k * sh}px`, height: `${sh + 0.6}px`, backgroundImage: `url("${src}")`, backgroundSize: `${W}px ${H}px`, backgroundPosition: `0 ${-k * sh}px` }); box.appendChild(st); strips.push(st); }
  const set = (c, op) => {   // c = 끝 각도(라디안). 가운데에서 끝까지 각도가 고르게 늘어나는 원통 굽힘
    const R = c > 1e-4 ? (H / 2) / c : 0;
    strips.forEach((st, k) => {
      const s0 = (k + 0.5) * sh - H / 2, a = R ? s0 / R : 0;
      const y = R ? R * Math.sin(a) : s0, z = R ? R * (1 - Math.cos(a)) : 0;
      st.style.transform = `translate3d(0, ${(y - s0).toFixed(2)}px, ${z.toFixed(2)}px) rotateX(${(a * 180 / Math.PI).toFixed(2)}deg)`;
    });
    box.style.opacity = op;   // 띠마다 투명도를 주면 겹친 이음매가 줄로 보임 → 통째로
  };
  set(curl, 0); fr.style.opacity = '0';
  const t0 = performance.now(), T_IN = 240, T_FLAT = 760;
  await new Promise((done) => {
    const tick = () => {
      const t = performance.now() - t0, op = Math.min(1, t / T_IN), u = Math.max(0, Math.min(1, (t - T_IN * 0.6) / T_FLAT)), e = 1 - Math.pow(1 - u, 3);
      set(curl * (1 - e), op);
      if (u < 1) requestAnimationFrame(tick); else done();
    };
    requestAnimationFrame(tick);
  });
  fr.style.opacity = '1'; box.remove();
}
export function liftImg(id) { return new URL(`img/lift_${id}.webp`, V3).href; }
export async function liftToCard(id, { from = '', rect = null, complete, cleanup, lifted = false, hold = false, curl = 0, xfade = 420 } = {}) {
  style();
  const L = liftRect(id), r0 = rect || L, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div'); el.className = 'v3-lift';
  el.innerHTML = `<i class="lf-bg"></i><div class="lf-o"><img class="lf-to" src="${esc(liftImg(id))}" alt="">${from && !lifted ? `<img class="lf-from" src="${esc(from)}" alt="">` : ''}</div>`;
  document.body.appendChild(el);
  const o = el.querySelector('.lf-o'), to = el.querySelector('.lf-to'), fr = el.querySelector('.lf-from'), bg = el.querySelector('.lf-bg');
  Object.assign(o.style, pos(lifted ? L : r0));
  await Promise.all([to, fr].filter(Boolean).map((im) => im.decode().catch(() => {})));
  const A = (n, k, o2) => n.animate(k, { fill: 'forwards', ...o2 }).finished.catch(() => {});
  if (lifted) { bg.style.opacity = '1'; to.style.opacity = '1'; }
  else if (reduce) { bg.style.opacity = '1'; to.style.opacity = '1'; if (fr) fr.style.opacity = '0'; Object.assign(o.style, pos(L)); }
  else {
    if (fr && curl) await uncurl(o, fr, curl);                                          // 11/28 말려 있던 종이(현장 전단지)가 그 자리에서 살짝 펴짐
    else if (fr) await A(fr, [{ opacity: 0 }, { opacity: 1 }], { duration: 220 });     // 비친 그대로의 물건이 화면 위로 겹쳐 올라옴(카메라 화면과 같은 자리)
    else await A(to, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    navigator.vibrate?.(14);
    await A(o, [{ transform: 'none' }, { transform: 'translateY(-14px) scale(1.06)' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.3,1)' });   // 붕 — 떠오름
    const glide = A(o, [{ ...pos(r0), transform: 'translateY(-14px) scale(1.06)' }, { ...pos(L), transform: 'none' }], { duration: 760, easing: LIFT_EASE });
    if (fr) { A(to, [{ opacity: 0 }, { opacity: 1 }], { duration: xfade, delay: 160 }); A(fr, [{ opacity: 1 }, { opacity: 0 }], { duration: xfade, delay: 260 }); }
    A(bg, [{ opacity: 0 }, { opacity: 1 }], { duration: 560, delay: 200, easing: 'ease-out' });
    await glide; await sleep(220);
  }
  if (hold) return el;   // 가운데에 떠 있는 채로 멈춤(흰 바탕) — 부른 쪽이 페이지를 새로 열어 lifted 로 이어 감
  try { cleanup?.(); } catch {}
  const d = complete?.();
  const card = d?.el?.querySelector('.d-card'), cimg = card?.querySelector('img');
  if (!cimg || reduce) { await sleep(300); bg.style.opacity = '0'; await A(o, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 }); el.remove(); return d; }
  card.style.transition = 'none'; card.style.transform = 'none'; card.style.opacity = '1'; cimg.style.opacity = '0';
  try { await cimg.decode(); } catch {}
  await sleep(60);
  const c = cimg.getBoundingClientRect();
  const T = { l: c.left, t: c.top, r: c.right, b: c.bottom };   // 큰 자리 = 같은 물건 그림(lift_<id>)이라 그 칸에 그대로
  A(bg, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 120 });
  setTimeout(() => { cimg.style.transition = 'opacity .35s ease-out'; cimg.style.opacity = '1'; }, 560);
  await A(o, [{ ...pos(L) }, { ...pos(T) }], { duration: 760, easing: LIFT_EASE });
  await sleep(320);
  await A(o, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
  el.remove();
  return d;
}
