// 프로토타입 화면 캡처 + 터치 QA — 헤드리스 Chromium 1개, localhost:8809 (python3 -m http.server 8809 --bind 127.0.0.1 를 kippu-site 에서 먼저; PORT 로 바꿀 수 있다)
// 실행: node capture.mjs [c0|c1|c2|c3|c4|c5|c5morph|exit|board|all] [390x844|430x932|375x667]  → shots/<page>-<n>.png (@2x)
//   모든 입력은 실제 터치(hasTouch · isMobile · CDP Input.dispatchTouchEvent). 콘솔 오류 · 가로 넘침 · 반응 없는 탭은 끝에 요약해 종료 코드로 알린다.
//   board 는 1440·390 보드를 3000px 조각으로 찍는다(조각은 python 으로 이어 붙인다)
// Playwright 는 kippu-app/scripts/store-capture 의 설치본을 쓴다 (추가 설치 없음)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
const require = createRequire('/Users/hare/Documents/monet/kippu-app/scripts/store-capture/package.json');
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ORIGIN = `http://127.0.0.1:${process.env.PORT || 8809}`;
const BASE = ORIGIN + '/design/experience-v2/proto/';
const which = process.argv[2] || 'all';
const [VW, VH] = (process.argv[3] || '390x844').split('x').map(Number);
const RM = !!process.env.REDUCE;
const suffix = (process.argv[3] && process.argv[3] !== '390x844' ? `-${VW}` : '') + (RM ? '-rm' : '');
const FULL = !process.argv[3] || process.argv[3] !== '430x932';     // 390·375 는 전체 흐름(터치 패스), 430 은 대표 화면만
const OUT = path.join(HERE, 'shots');
const problems = [];
const bad = (m) => { problems.push(m); console.log('   !', m); };
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}${suffix}.png`) });
const wait = (page, ms) => page.waitForTimeout(RM ? Math.min(ms, 250) : ms);

async function fonts(page) {
  await page.evaluate(async () => {
    const want = ['400 16px Freesentation', '600 16px Freesentation', '700 16px Freesentation', '600 16px Paperlogy', '800 16px Paperlogy'];
    await Promise.all(want.map((f) => document.fonts.load(f, '문명탐험가').catch(() => {})));
    await document.fonts.ready;
  });
}
async function overflowCheck(page, tag) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth,
    bad: [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1) && cs.position !== 'absolute' && cs.position !== 'fixed' && cs.visibility !== 'hidden' && !e.closest('.hang, .tags, .stage, .crowd-stage, .flow-stage, .mv, .guide, .col-tags, .unfold, .track, .gallery, .wall, .wall-strip, .iris, .glow, .sunrise, .rail, .chips, .papers, .map-box, .card-wrap, .leaf, .view, .beat .img'); }).map((e) => (e.className || e.tagName) + '').slice(0, 5) }));
  if (o.sw > o.cw || o.bw > o.cw || o.bad.length) bad(`overflow ${tag}: ${JSON.stringify(o)}`);
}
// ── 터치 (CDP)
let cdp = null;
async function touch(page, type, points) { if (!cdp) cdp = await page.context().newCDPSession(page); await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points }); }
// 탭 = CDP touchStart → touchEnd (Playwright locator.tap/click 을 쓰지 않는다 — 실제 폰의 터치 경로)
async function tap(page, x, y) { await touch(page, 'touchStart', [{ x, y }]); await page.waitForTimeout(40); await touch(page, 'touchEnd', []); }
async function tapEl(page, sel) {
  const el = page.locator(sel).first();
  await el.waitFor({ state: 'visible', timeout: 15000 });
  let b = await el.boundingBox(); if (!b) throw new Error('no box ' + sel);
  if (b.y < 56 || b.y + b.height > VH - 4) { await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(250); b = await el.boundingBox(); }
  // 손가락이 닿는 자리에 정말 그 요소(또는 그 안)가 있어야 한다
  const hit = await page.evaluate(([x, y, q]) => { const e = document.elementFromPoint(x, y); const t = document.querySelector(q); return !!(e && t && (e === t || t.contains(e))); }, [b.x + b.width / 2, b.y + b.height / 2, sel]);
  if (!hit) bad(`tap target covered: ${sel} at ${Math.round(b.x + b.width / 2)},${Math.round(b.y + b.height / 2)}`);
  await tap(page, b.x + b.width / 2, b.y + b.height / 2);
}
// 주요 단추: CDP 탭 → 다음 화면·요소가 보여야 한다. 아니면 크게 알린다
async function press(page, sel, nextSel, label, timeout = 8000) {
  await tapEl(page, sel);
  try { await page.locator(nextSel).first().waitFor({ state: 'visible', timeout }); }
  catch (e) { bad(`TOUCH FAIL: ${label} — tapped ${sel}, expected ${nextSel} visible`); }
}
// 홈 인디케이터 영역(아래 34px + 16px)에 단추가 걸리지 않는지
async function safeBottom(page, sel, label) {
  const b = await page.locator(sel).first().boundingBox(); if (!b) return;
  if (b.y + b.height > VH - 50) bad(`${label}: ${sel} bottom ${Math.round(b.y + b.height)} > ${VH - 50} (home indicator zone)`);
}
async function drag(page, from, to, steps = 16, ms = 320, hold = 0) {
  await touch(page, 'touchStart', [{ x: from.x, y: from.y }]);
  if (hold) await page.waitForTimeout(hold);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, e = 1 - Math.pow(1 - t, 2);
    await touch(page, 'touchMove', [{ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }]);
    await page.waitForTimeout(ms / steps);
  }
  await touch(page, 'touchEnd', []);
}
// 탭이 반응했는지 — 상태 함수가 바뀌어야 한다
async function expectChange(page, label, fn, act, timeout = 6000) {
  const before = await page.evaluate(fn);
  await act();
  try { await page.waitForFunction((args) => { const v = (new Function('return (' + args.fn + ')()'))(); return JSON.stringify(v) !== args.before; }, { fn: fn.toString(), before: JSON.stringify(before) }, { timeout }); }
  catch (e) { bad(`no response: ${label} (${JSON.stringify(before)})`); }
}

// ── C0 심사하기 · 올해의 메달: 역할 → 한 줄 벽(그림 탭 → 들림) → 메달 끌어 올리기 → 확인(다시 고르기) → 메달 수여 → 확인 → 오늘의 심사위원단 → 카드
async function c0(page) {
  await page.goto(BASE + 'c0.html', { waitUntil: 'networkidle' }); await fonts(page); await wait(page, 300);
  await shot(page, 'c0-1'); await overflowCheck(page, 'c0-1');
  if (!FULL) return;
  await safeBottom(page, '#enter', 'c0');
  await press(page, '#enter', '#s2.on', 'c0 enter');
  await wait(page, 1500);
  await shot(page, 'c0-2a');
  // 4번을 톡 → 들리고 스포트라이트
  const p4 = await page.evaluate(() => window.__c0.center(4));
  await tap(page, p4.x, p4.y); await wait(page, 800);
  if ((await page.evaluate(() => window.__c0.sel)) !== 4) bad('TOUCH FAIL: c0 tap on frame 4 did not lift it');
  if (await page.evaluate(() => document.querySelector('#award').disabled)) bad('c0: award button still disabled after lift');
  await shot(page, 'c0-2'); await overflowCheck(page, 'c0-2');
  // 메달을 끌어 2번 액자에 올린다 → 확인 시트(2번)
  const m = await page.evaluate(() => window.__c0.medal()), p2 = await page.evaluate(() => window.__c0.center(2));
  await drag(page, m, { x: p2.x, y: p2.y + 4 }, 18, 420);
  await wait(page, 1100);
  if ((await page.evaluate(() => window.__c0.mode)) !== 'placed' || (await page.evaluate(() => window.__c0.chosen)) !== 2) bad('TOUCH FAIL: c0 medal drag onto frame 2 did not place (' + (await page.evaluate(() => window.__c0.mode + '/' + window.__c0.chosen)) + ')');
  await page.locator('#confirm.open').waitFor({ state: 'visible', timeout: 4000 }).catch(() => bad('c0: confirm sheet not open after drag'));
  await shot(page, 'c0-2b');
  // 다시 고르기 → 메달이 선반으로 → 4번 톡 → 메달 수여 → 확인
  await tapEl(page, '#cfBack'); await wait(page, 700);
  if ((await page.evaluate(() => window.__c0.mode)) !== 'pick') bad('c0: cfBack did not return to pick');
  const q4 = await page.evaluate(() => window.__c0.center(4));
  await tap(page, q4.x, q4.y); await wait(page, 500);
  if ((await page.evaluate(() => window.__c0.sel)) !== 4) bad('TOUCH FAIL: c0 second tap on frame 4 did not lift it');
  await safeBottom(page, '#award', 'c0 award');
  await press(page, '#award', '#confirm.open', 'c0 award');
  await wait(page, 500);
  if ((await page.evaluate(() => window.__c0.chosen)) !== 4) bad('c0: award did not place medal on 4');
  await press(page, '#cfOk', '#reveal.on', 'c0 confirm');
  // 오늘의 심사위원단: 벽에 흩어진 점이 액자 아래로 모이는 중(-a) · 모인 뒤(-b)
  await wait(page, 900); await shot(page, 'c0-3');
  await wait(page, 450); await shot(page, 'c0-reveal-a');
  await wait(page, 1900); await shot(page, 'c0-reveal-b');
  if (!(await page.evaluate(() => window.__c0.crowd && !window.__c0.crowd.busy))) bad('c0: crowd still moving after 3.2s');
  await wait(page, 400); await shot(page, 'c0-4'); await overflowCheck(page, 'c0-4');
  const shown = await page.evaluate(() => document.querySelectorAll('.tag.show').length); if (shown !== 5) bad(`c0: ${shown}/5 percent tags shown`);
  if (!(await page.evaluate(() => document.querySelector('.today.show')))) bad('c0: today medal tag not shown');
  await safeBottom(page, '#save', 'c0 reveal');
  await press(page, '#save', '#s4.on', 'c0 save');
  await wait(page, 700); await shot(page, 'c0-5'); await overflowCheck(page, 'c0-5');
}

// ── C1 자격을 묻기: 스캔 → 돌려보기 → 살펴보기 → 펼침 → 두 종이 → 오늘(두 종이의 크기) → 수집함
async function c1(page) {
  await page.goto(BASE + 'c1.html?debug', { waitUntil: 'networkidle' }); await fonts(page);
  await page.waitForFunction(() => window.__c1 && window.__c1.loaded, null, { timeout: 60000 }); await wait(page, 400);
  await shot(page, 'c1-1'); await overflowCheck(page, 'c1-1');
  if (!FULL) return;
  await press(page, '#guide', '#mv:not(.off)', 'c1 scan');
  await page.waitForFunction(() => window.__c1.viewer && window.__c1.viewer.riseT > 0.42, null, { timeout: 60000 });
  await shot(page, 'c1-2');
  await page.waitForFunction(() => window.__c1.step === 2, null, { timeout: 60000 }); await wait(page, 900);
  // 손가락으로 돌려본다(가로 끌기) — 회전값이 바뀌어야 한다
  const r0 = await page.evaluate(() => window.__c1.viewer.rot);
  await drag(page, { x: VW * 0.7, y: VH * 0.5 }, { x: VW * 0.25, y: VH * 0.5 }, 14, 300); await wait(page, 600);
  const r1 = await page.evaluate(() => window.__c1.viewer.rot); if (Math.abs(r1 - r0) < 0.05) bad('c1: column did not rotate on drag');
  await shot(page, 'c1-2b'); await overflowCheck(page, 'c1-2b');
  // 칩으로 봉 마르셰(2)를 앞으로 → 전단지를 탭해 떼어 본다 → 안내문이 아니면 돌려놓기
  await tapEl(page, '.chip[data-i="1"]'); await wait(page, 1800);
  await page.evaluate(() => window.__c1.inspect(1)); await wait(page, 1700);
  await shot(page, 'c1-3a'); await overflowCheck(page, 'c1-3a');
  await expectChange(page, 'c1 close inspect', () => window.__c1.step, () => tapEl(page, '#closeBtn'));
  await page.waitForFunction(() => window.__c1.step === 2, null, { timeout: 60000 }); await wait(page, 600);
  await tapEl(page, '.chip[data-i="0"]'); await wait(page, 1800);
  // 정면의 전단지를 실제로 탭한다
  const p = await page.evaluate(() => window.__c1.project(0));
  if (p && p.x) { await tap(page, p.x, p.y); } else { await page.evaluate(() => window.__c1.inspect(0)); }
  await page.waitForFunction(() => window.__c1.step === 3, null, { timeout: 8000 }).catch(() => bad('c1: tap on flyer did not inspect'));
  await wait(page, 1700);
  await shot(page, 'c1-3'); await overflowCheck(page, 'c1-3');
  await press(page, '#openBtn', 'body[data-step="4"] #histIntro', 'c1 open');
  await wait(page, 2200); await shot(page, 'c1-4'); await overflowCheck(page, 'c1-4');
  await safeBottom(page, '#toAsk', 'c1');
  await press(page, '#toAsk', 'body[data-step="5"] #papers', 'c1 toAsk');
  await wait(page, 900); await shot(page, 'c1-5'); await overflowCheck(page, 'c1-5');
  await press(page, '.paper[data-k="viewer"]', '#papers.decided', 'c1 pick paper', 3000);
  await wait(page, 500); await shot(page, 'c1-5b');
  await page.waitForFunction(() => window.__c1.step === 6, null, { timeout: 8000 }).catch(() => bad('c1: no reveal after pick'));
  // 오늘의 관람객: 점이 모이는 중(-a) · 모인 뒤(-b)
  await wait(page, 620); await shot(page, 'c1-reveal-a');
  await wait(page, 1700); await shot(page, 'c1-reveal-b');
  if (!(await page.evaluate(() => window.__c1.crowd && !window.__c1.crowd.busy))) bad('c1: crowd still moving after 2.3s');
  await shot(page, 'c1-6'); await overflowCheck(page, 'c1-6');
  await page.evaluate(() => { const b = document.querySelector('.unfold-body'); b.scrollTop = b.scrollHeight; }); await wait(page, 300);   // 6 은 세로로 넘치면 안에서 스크롤
  await safeBottom(page, '#collect', 'c1');
  await press(page, '#collect', '#collectN:not([hidden])', 'c1 collect');
  await wait(page, 500); await shot(page, 'c1-6b');
  await wait(page, 1500); await shot(page, 'c1-7'); await overflowCheck(page, 'c1-7');
}

// ── C2 어디까지: 지도 탭 → 표 끊기 → 표 끌기(페이지 안 움직임) → 표 밖 스와이프(스크롤) → 이야기 → 오늘 → 저장
async function c2(page) {
  await page.goto(ORIGIN + '/design/experience-v2/ticket/map-picker.html?d=21&m=10', { waitUntil: 'networkidle' }); await fonts(page);
  await page.waitForFunction(() => window.mapReady, null, { timeout: 30000 }); await wait(page, 1200);
  await shot(page, 'c2-1'); await overflowCheck(page, 'c2-1');
  if (!FULL) return;
  // 지도를 옆으로 민다 — 세로 스크롤은 없어야 하고 지도는 움직여야 한다
  const box = await page.locator('#mapBox').boundingBox();
  const tx0 = await page.evaluate(() => document.querySelector('#map g').getAttribute('transform'));
  await drag(page, { x: box.x + box.width * 0.75, y: box.y + box.height * 0.4 }, { x: box.x + box.width * 0.25, y: box.y + box.height * 0.42 }, 12, 260); await wait(page, 300);
  const tx1 = await page.evaluate(() => document.querySelector('#map g').getAttribute('transform'));
  const canPan = await page.evaluate(() => document.querySelector('#mapBox').getBoundingClientRect().height > 330);   // 작은 상자(375×667)는 지도가 폭에 맞아 밀 것이 없다
  if (canPan && tx0 === tx1) bad('c2: map did not pan on horizontal drag');
  // 역을 탭한다(르아브르 점 근처) — 실제 좌표는 지도 상태에서 계산
  const pt = await page.evaluate(() => { const l = [...document.querySelectorAll('#map circle')]; const c = l.find((x) => +x.getAttribute('r') === 7 && x.getAttribute('fill') === '#1E140C' && +x.getAttribute('cx') < 120); const r = document.querySelector('#mapBox').getBoundingClientRect(); return c ? { x: r.left + +c.getAttribute('cx'), y: r.top + +c.getAttribute('cy') } : null; });
  // 칩: 루앙 → 다시 르아브르(둘 다 터치로 골라진다)
  await press(page, '.chip[data-id="rouen"]', '.chip[data-id="rouen"].on', 'c2 chip rouen', 3000);
  await wait(page, 600);
  await expectChange(page, 'c2 tap station(map)', () => (window.getPicked() || {}).id, async () => { if (pt) await tap(page, pt.x, pt.y); else await tapEl(page, '.chip[data-id="lehavre"]'); });
  if ((await page.evaluate(() => (window.getPicked() || {}).id)) !== 'lehavre') await press(page, '.chip[data-id="lehavre"]', '.chip[data-id="lehavre"].on', 'c2 chip lehavre', 3000);
  await wait(page, 1300); await shot(page, 'c2-2'); await overflowCheck(page, 'c2-2');
  await safeBottom(page, '#buy', 'c2');
  await press(page, '#buy', '#flow:not([hidden]) #card3d', 'c2 buy');
  await wait(page, 1900); await shot(page, 'c2-3');
  // 표 위에서 끌기: 회전은 바뀌고 flow.scrollTop 은 0 그대로
  const cb = await page.locator('#card3d').boundingBox();
  const ry0 = await page.evaluate(() => window.flow.R.ry);
  await drag(page, { x: cb.x + cb.width * 0.5, y: cb.y + cb.height * 0.3 }, { x: cb.x + cb.width * 0.5 + 60, y: cb.y + cb.height * 0.3 + 90 }, 14, 320);
  await wait(page, 200);
  const st = await page.evaluate(() => document.querySelector('#flow').scrollTop), ry1 = await page.evaluate(() => window.flow.R.ry);
  if (st !== 0) bad(`c2: page scrolled while dragging card (scrollTop ${st})`);
  if (Math.abs(ry1 - ry0) < 2) bad('c2: card did not rotate on drag');
  await shot(page, 'c2-3b');
  // 표 아래(안내 문구 아래)를 위로 스와이프하면 페이지가 스크롤된다
  await drag(page, { x: VW / 2, y: Math.min(VH - 40, cb.y + cb.height + 120) }, { x: VW / 2, y: cb.y + 40 }, 12, 260);
  await wait(page, 700);
  const st2 = await page.evaluate(() => document.querySelector('#flow').scrollTop);
  if (st2 < 40) bad(`c2: swipe below card did not scroll page (scrollTop ${st2})`);
  await shot(page, 'c2-4'); await overflowCheck(page, 'c2-4');
  // 작아진 표 위를 세로로 밀어도 스크롤되어야 한다
  await page.evaluate(() => document.querySelector('#flow').scrollTo(0, 400)); await wait(page, 500);
  const st3 = await page.evaluate(() => document.querySelector('#flow').scrollTop);
  await drag(page, { x: 100, y: 30 }, { x: 100, y: 240 }, 10, 240); await wait(page, 600);
  const st4 = await page.evaluate(() => document.querySelector('#flow').scrollTop);
  if (st4 >= st3) bad(`c2: vertical swipe over small ticket did not scroll (${st3} → ${st4})`);
  // 이야기와 오늘의 관람객
  await page.evaluate(() => { const f = document.querySelector('#flow'); f.scrollTo(0, document.querySelector('#story').offsetTop - 60); }); await wait(page, 1200);
  await shot(page, 'c2-5');
  await page.evaluate(() => { const f = document.querySelector('#flow'); f.scrollTo(0, f.scrollHeight); });
  // 오늘의 관람객: 작은 지도 위로 점이 모이는 중(-a) · 모인 뒤(-b)
  await wait(page, 850); await shot(page, 'c2-reveal-a');
  await wait(page, 1600); await shot(page, 'c2-reveal-b');
  if (!(await page.evaluate(() => window.flow.crowd && !window.flow.crowd.busy))) bad('c2: crowd still moving after 2.4s');
  await shot(page, 'c2-6'); await overflowCheck(page, 'c2-6');
  await press(page, '#save', '#save[disabled]', 'c2 save', 3000);
  await wait(page, 2200); await shot(page, 'c2-7');
}

// ── C3 밖의 빛으로: 문지르기(터치 획) → 70% 에서 번짐 → 완성 → 누르고 있으면 실내
async function c3(page) {
  await page.goto(BASE + 'c3.html', { waitUntil: 'networkidle' }); await fonts(page); await wait(page, 600);
  await shot(page, 'c3-1'); await overflowCheck(page, 'c3-1');
  if (!FULL) return;
  const s = await page.locator('#stage').boundingBox();
  const y0 = await page.evaluate(() => window.scrollY);
  // 첫 획: 물결 모양으로 한 번
  await touch(page, 'touchStart', [{ x: s.x + 30, y: s.y + 60 }]);
  for (let i = 1; i <= 40; i++) { const t = i / 40; await touch(page, 'touchMove', [{ x: s.x + 30 + (s.width - 60) * t, y: s.y + 60 + Math.sin(t * Math.PI * 2.2) * 34 + t * 40 }]); await page.waitForTimeout(14); }
  await touch(page, 'touchEnd', []);
  await touch(page, 'touchStart', [{ x: s.x + s.width - 40, y: s.y + s.height - 50 }]);
  for (let i = 1; i <= 30; i++) { const t = i / 30; await touch(page, 'touchMove', [{ x: s.x + s.width - 40 - (s.width - 90) * t, y: s.y + s.height - 50 - Math.sin(t * Math.PI * 1.6) * 40 }]); await page.waitForTimeout(14); }
  await touch(page, 'touchEnd', []);
  await wait(page, 300);
  if (!(await page.evaluate(() => window.__c3.touched))) bad('c3: first stroke not registered');
  if ((await page.evaluate(() => window.scrollY)) !== y0) bad('c3: page scrolled while painting');
  await shot(page, 'c3-2'); await overflowCheck(page, 'c3-2');
  // 가로 획을 줄줄이 그어 70% 를 넘긴다
  // 손가락으로 문지르듯 촘촘히(위아래로 조금씩 흔들며)
  for (let i = 0; i < 26 && !(await page.evaluate(() => window.__c3.done)); i++) {
    const y = s.y + 14 + ((i * 23) % (s.height - 28));
    const L = i % 2 === 0;
    await touch(page, 'touchStart', [{ x: L ? s.x + 12 : s.x + s.width - 12, y }]);
    for (let k = 1; k <= 22; k++) { const t = k / 22; await touch(page, 'touchMove', [{ x: L ? s.x + 12 + (s.width - 24) * t : s.x + s.width - 12 - (s.width - 24) * t, y: y + Math.sin(t * Math.PI * 3) * 9 }]); await page.waitForTimeout(9); }
    await touch(page, 'touchEnd', []);
  }
  if (!(await page.evaluate(() => window.__c3.done))) bad('c3: did not complete after strokes (coverage ' + (await page.evaluate(() => window.__c3.coverage())).toFixed(2) + ')');
  await wait(page, 1900); await shot(page, 'c3-3'); await overflowCheck(page, 'c3-3');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(page, 500);
  await shot(page, 'c3-3b');
  const hb = await page.locator('#hold').boundingBox();
  if (!hb) { bad('c3: hold button not found'); return; }
  await touch(page, 'touchStart', [{ x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 }]); await wait(page, 500);
  if (!(await page.evaluate(() => document.querySelector('#reveal').classList.contains('hide')))) bad('TOUCH FAIL: c3 hold button did not show indoor canvas');
  await page.evaluate(() => window.scrollTo(0, 0)); await wait(page, 300);
  await shot(page, 'c3-hold');
  await touch(page, 'touchEnd', []);
}

// ── C4 그림인가 사진인가: 셔터 4번(현상) → 질문(두 줄) → 한 줄 고르기 → 오늘 · 그때는 → 저장 → 내 초상(데모)
async function c4(page) {
  await page.goto(BASE + 'c4.html', { waitUntil: 'networkidle' }); await fonts(page); await wait(page, 600);
  await shot(page, 'c4-1'); await overflowCheck(page, 'c4-1');
  if (!FULL) return;
  // 벽을 옆으로 밀면 다음 손님
  const g = await page.locator('#gallery').boundingBox();
  await expectChange(page, 'c4 swipe wall', () => window.__c4.cur, () => drag(page, { x: g.x + g.width * 0.75, y: g.y + g.height / 2 }, { x: g.x + g.width * 0.25, y: g.y + g.height / 2 }, 10, 220));
  await wait(page, 700);
  await press(page, '#dots button:nth-child(1)', '#dots button:nth-child(1).on', 'c4 dot', 2000); await wait(page, 700);
  await page.evaluate(() => window.scrollTo(0, 0)); await wait(page, 200);
  await safeBottom(page, '#shutter', 'c4 wall');
  for (let i = 0; i < 4; i++) {
    const before = await page.evaluate(() => window.__c4.dev.filter(Boolean).length);
    await tapEl(page, '#shutter');
    await page.waitForFunction((n) => window.__c4.dev.filter(Boolean).length > n, before, { timeout: 4000 }).catch(() => bad(`TOUCH FAIL: c4 shutter ${i + 1} did not develop`));
    if (i === 0) { await wait(page, 1300); await shot(page, 'c4-2'); }
    await wait(page, 2600);                                           // 현상 .85s + 저절로 다음 손님 1.4s
  }
  // 현상 중 연타도 삼키지 않는다: 다시 시작해 두 번 빠르게
  if ((await page.evaluate(() => window.__c4.dev.every(Boolean)))) {
    await page.locator('#askCta').waitFor({ state: 'visible', timeout: 3000 }).catch(() => bad('TOUCH FAIL: c4 askCta not visible after 4 shots'));
  }
  await shot(page, 'c4-3'); await overflowCheck(page, 'c4-3');
  await press(page, '#shutter', '#ask:not([hidden])', 'c4 shutter→question');
  await page.waitForFunction(() => [...document.querySelectorAll('#cols img')].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});
  await wait(page, 700); await shot(page, 'c4-4'); await overflowCheck(page, 'c4-4');
  // 사진 줄의 셋째 그림을 누른다
  await press(page, '#cols .cell[data-k="photo"]:nth-of-type(3), #cols .cell[data-k="photo"]', '#cols.picked', 'c4 pick column', 3000);
  await wait(page, 600); await shot(page, 'c4-4b');
  await page.waitForFunction(() => !document.querySelector('#result').hidden, null, { timeout: 5000 }).catch(() => bad('c4: no result after pick'));
  // 오늘의 관람객: 두 줄 아래로 점이 모이는 중(-a) · 모인 뒤(-b)
  await wait(page, 900); await shot(page, 'c4-reveal-a');
  await wait(page, 1500); await shot(page, 'c4-reveal-b');
  if (!(await page.evaluate(() => window.__c4.crowd && !window.__c4.crowd.busy))) bad('c4: crowd still moving after 2.4s');
  await shot(page, 'c4-5'); await overflowCheck(page, 'c4-5');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(page, 500);
  await shot(page, 'c4-5b');
  await press(page, '#saveStance', '#mineCard:not([hidden])', 'c4 save');
  await wait(page, 600); await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(page, 300);
  await shot(page, 'c4-6'); await overflowCheck(page, 'c4-6');
  // 내 초상(데모 이미지)
  await page.evaluate(() => window.scrollTo(0, 0));
  await press(page, '.tab[data-tab="me"]', '#me:not([hidden])', 'c4 tab me');
  await wait(page, 500); await shot(page, 'c4-me-1'); await overflowCheck(page, 'c4-me-1');
  await press(page, '#camDemo', '#meShoot:not([hidden])', 'c4 demo');
  await wait(page, 600); await shot(page, 'c4-me-2');
  await press(page, '#shoot', '#count:not([hidden])', 'c4 shoot', 3000); await wait(page, 1200); await shot(page, 'c4-me-cam');
  await page.waitForFunction(() => !document.querySelector('#meDone').hidden, null, { timeout: 30000 }).catch(() => bad('c4: develop did not finish'));
  await wait(page, 500); await shot(page, 'c4-me-3'); await overflowCheck(page, 'c4-me-3');
}

// ── C5 살아 있는 연작: 벽 → 모티프 열기(지금 시간의 때) → 해 끌기(모핑 중간) → 멈춤 → 다섯 방식 중간 캡처 → 남기기(한 장의 하루) → 벽으로(문장) → 나머지 모티프마다 중간 한 장
async function c5(page) {
  await page.goto(BASE + 'c5.html', { waitUntil: 'networkidle' }); await fonts(page);
  await page.waitForFunction(() => window.__c5 && [...document.querySelectorAll('#strip img')].every((i) => i.complete), null, { timeout: 60000 }); await wait(page, 700);
  await shot(page, 'c5-1'); await overflowCheck(page, 'c5-1');
  if (!FULL) return;
  const motifs = await page.evaluate(() => Object.keys(window.__c5.FR));
  if (motifs.length < 5) bad(`c5: only ${motifs.length} motifs`);
  const arcPt = (u) => page.evaluate((u) => window.__c5.sunPos(u), u);
  // 열리면 해는 지금 시간의 때에 가 있어야 한다
  const nowCheck = async (k) => {
    // 분이 바뀌는 순간에 열렸을 수 있으니 지금과 1분 전 둘 다 허용한다
    const r = await page.evaluate((k) => { const f = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; const d = new Date(), d1 = new Date(d.getTime() - 60000); const hh = f(d), h1 = f(d1); return { t: window.__c5.t, want: [window.__c5.frameForTime(k, hh), window.__c5.frameForTime(k, h1)], line: document.querySelector('#nowLine').textContent, hh, h1 }; }, k);
    if (!r.want.some((w) => Math.abs(r.t - w) < 0.001)) bad(`c5 ${k}: opened at t=${r.t}, now ${r.hh} maps to ${r.want[0]}`);
    if (!r.line.startsWith('지금 ' + r.hh) && !r.line.startsWith('지금 ' + r.h1)) bad(`c5 ${k}: now line "${r.line}"`);
  };
  // 해를 a → a+0.5 로 끌어 중간에서 멈춘다(손 떼면 저절로 가므로 그림을 눌러 멈춤)
  const toMid = async (k, a) => {
    const N = await page.evaluate((k) => window.__c5.FR[k].frames.length, k);
    const t0 = await page.evaluate(() => window.__c5.t); const u0 = t0 / (N - 1), u1 = (a + 0.5) / (N - 1);
    const p0 = await arcPt(u0); await touch(page, 'touchStart', [{ x: p0.x, y: p0.y }]);
    for (let i = 1; i <= 18; i++) { const p = await arcPt(u0 + (u1 - u0) * i / 18); await touch(page, 'touchMove', [{ x: p.x, y: p.y }]); await page.waitForTimeout(28); }
    await wait(page, 450);
    const tMid = await page.evaluate(() => window.__c5.t);
    if (Math.abs(tMid - (a + 0.5)) > 0.2) bad(`c5 ${k}: sun drag did not reach mid (t=${tMid.toFixed(2)}, want ${a + 0.5})`);
    return N;
  };
  await press(page, '.motif[data-k="haystacks"]', '#view:not([hidden])', 'c5 open haystacks');
  await page.waitForFunction(() => window.__c5.ready, null, { timeout: 60000 }); await wait(page, 400);
  if (!(await page.evaluate(() => window.__c5.gl))) bad('c5: WebGL transitions unavailable (2D fallback in use)');
  await nowCheck('haystacks');
  await shot(page, 'c5-2'); await overflowCheck(page, 'c5-2');
  // 해를 끈다 — 지금 때에서 1.5 로, 손을 떼지 않고 붓자국 중간을 찍는다
  await toMid('haystacks', 1);
  await shot(page, 'c5-3');                                   // 모핑 중간
  await touch(page, 'touchEnd', []);
  await wait(page, 400);
  // 손을 떼면 해가 저절로 간다
  const tA = await page.evaluate(() => window.__c5.t); await wait(page, 1500); const tB = await page.evaluate(() => window.__c5.t);
  if (!RM && !(tB > tA + 0.02)) bad(`c5: sun did not drift after release (${tA.toFixed(3)} → ${tB.toFixed(3)})`);
  if (!(await page.evaluate(() => window.__c5.playing)) && !RM) bad('c5: not playing after release');
  // 그림을 누르면 멈춘다
  const cb = await page.locator('#cv').boundingBox();
  await tap(page, cb.x + cb.width / 2, cb.y + cb.height / 2); await wait(page, 300);
  if (await page.evaluate(() => window.__c5.playing)) bad('TOUCH FAIL: c5 tap on painting did not pause');
  const tP = await page.evaluate(() => window.__c5.t); await wait(page, 700); if (Math.abs((await page.evaluate(() => window.__c5.t)) - tP) > 0.01) bad('c5: still moving while paused');
  // 멈춘 중간(정확히 1.5 로 맞춘다, 검수용 setT)에서 다섯 방식을 차례로 — 캔버스가 방식마다 달라야 한다
  await page.evaluate(() => window.__c5.setT(1.5));
  const sig = async () => page.evaluate(() => { const c = document.querySelector('#cv'); const o = document.createElement('canvas'); o.width = 48; o.height = 48; const x = o.getContext('2d'); x.drawImage(c, 0, 0, 48, 48); return [...x.getImageData(0, 0, 48, 48).data].filter((_, i) => i % 4 !== 3); });
  const sigs = [];
  for (const [st, name] of [[1, 'c5-3b'], [2, 'c5-3c'], [3, 'c5-3d'], [4, 'c5-3e'], [0, null]]) {
    await press(page, `#styles button[data-style="${st}"]`, `#styles button[data-style="${st}"].on`, `c5 style ${st}`, 3000); await wait(page, 500);
    if ((await page.evaluate(() => window.__c5.style)) !== st) bad(`c5: style ${st} not applied`);
    sigs.push(await sig());
    if (name) { await shot(page, name); await overflowCheck(page, name); }
  }
  for (let i = 0; i < sigs.length; i++) for (let j = i + 1; j < sigs.length; j++) { let d = 0; for (let q = 0; q < sigs[i].length; q++) d += Math.abs(sigs[i][q] - sigs[j][q]); d /= sigs[i].length; if (d < 4) bad(`c5: styles ${i}/${j} look the same (mean diff ${d.toFixed(1)})`); }
  await safeBottom(page, '#keep', 'c5 keep');
  await press(page, '#keep', '#kept:not([hidden])', 'c5 keep');
  await wait(page, 600); await shot(page, 'c5-4'); await overflowCheck(page, 'c5-4');
  const line = await page.evaluate(() => document.querySelector('#keptLine').textContent); if (!/^내가 온 시간 \d\d:\d\d · 멈춘 때 /.test(line)) bad('c5: kept line wrong: ' + line);
  const data = await page.evaluate(() => document.getElementById('keptImg').src);
  writeFileSync(path.join(OUT, `c5-share${suffix}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
  await press(page, '#viewClose', '#wallLine:not([hidden])', 'c5 close → wall line');
  await wait(page, 1900); await shot(page, 'c5-5'); await overflowCheck(page, 'c5-5');
  // 나머지 모티프 — 지금 시간에 열리는지, 중간 한 장씩(방식은 돌아가며)
  let n = 6;
  for (const k of motifs.filter((m) => m !== 'haystacks')) {
    await press(page, `.motif[data-k="${k}"]`, '#view:not([hidden])', `c5 open ${k}`);
    await page.waitForFunction(() => window.__c5.ready, null, { timeout: 60000 }); await wait(page, 300);
    await nowCheck(k);
    const st = (n - 6) % 5; await press(page, `#styles button[data-style="${st}"]`, `#styles button[data-style="${st}"].on`, `c5 ${k} style ${st}`, 3000);
    const N = await page.evaluate((k) => window.__c5.FR[k].frames.length, k);
    const t0 = await page.evaluate(() => window.__c5.t); const a = Math.floor(t0) >= N - 1 ? N - 2 : Math.max(0, Math.min(N - 2, Math.round(t0) + (Math.round(t0) >= N - 1 ? -1 : 0)));
    await toMid(k, a);
    await shot(page, `c5-${n}`); await overflowCheck(page, `c5-${n}`);
    await touch(page, 'touchEnd', []); await wait(page, 300);
    await press(page, '#viewClose', '#strip', `c5 close ${k}`); await wait(page, 400);
    n++;
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(page, 300);
  await safeBottom(page, '#toExit', 'c5');
  const href = await page.evaluate(() => document.querySelector('#toExit').getAttribute('href')); if (href !== 'exit.html') bad('c5: exit link wrong');
}

// ── C5 모핑 검수: 모티프마다 이웃 쌍의 중간(t=.5)을 모핑으로 그려 캔버스만 저장 → shots/c5-morph-<motif>-<i>.png
async function c5morph(page) {
  await page.goto(BASE + 'c5.html', { waitUntil: 'networkidle' }); await fonts(page);
  await page.waitForFunction(() => window.__c5, null, { timeout: 60000 });
  const motifs = await page.evaluate(() => Object.keys(window.__c5.FR));
  for (const k of motifs) {
    await page.evaluate((k) => window.__c5.open(k), k);
    await page.waitForFunction(() => window.__c5.ready, null, { timeout: 60000 }); await wait(page, 300);
    await page.evaluate(() => window.__c5.setStyle(0));
    const N = await page.evaluate((k) => window.__c5.FR[k].frames.length, k);
    for (let i = 0; i < N - 1; i++) {
      await page.evaluate((t) => window.__c5.setT(t), i + 0.5); await wait(page, 150);
      const b = await page.locator('#cv').boundingBox();
      await page.screenshot({ path: path.join(OUT, `c5-morph-${k}-${i + 1}.png`), clip: { x: b.x, y: b.y, width: b.width, height: b.height } });
    }
    await page.evaluate(() => window.__c5.close()); await wait(page, 200);
  }
}

// ── 출구 모아 보기: 마무리 화면 → 저장·공유 이미지
async function exit(page) {
  await page.goto(BASE + 'exit.html', { waitUntil: 'networkidle' }); await fonts(page); await wait(page, 1400);
  await shot(page, 'exit-1'); await overflowCheck(page, 'exit-1');
  if (!FULL) return;
  // 오늘의 관람객: 네 줄을 흘러 내려가는 중(-a) · 다 내려간 뒤(-b)
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.mine').offsetTop - 66));
  await wait(page, 900); await shot(page, 'exit-reveal-a');
  await wait(page, 4800); await shot(page, 'exit-reveal-b');
  if (!(await page.evaluate(() => window.__exit.started && window.__exit.crowd && !window.__exit.crowd.busy))) bad('exit: crowd still moving after 6s');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(page, 500);
  await shot(page, 'exit-1b'); await overflowCheck(page, 'exit-1b');
  await safeBottom(page, '#restart', 'exit');
  await press(page, '#share', '#shareOv:not([hidden]) #shareImg', 'exit share');
  await wait(page, 1800); await shot(page, 'exit-2'); await overflowCheck(page, 'exit-2');
  const data = await page.evaluate(() => document.getElementById('shareImg').src);
  writeFileSync(path.join(OUT, `exit-share${suffix}.png`), Buffer.from(data.split(',')[1], 'base64'));
  await press(page, '#shareClose', '#share', 'exit share close', 3000);
}

// 보드(제안서) + 상세 페이지 — 전체 페이지 캡처
async function board(ctx) {
  for (const [name, w, h, file] of [['board-1440', 1440, 900, 'experience-v2.html'], ['board-390', 390, 844, 'experience-v2.html'], ['detail-1440', 1440, 900, 'experience-v2-detail.html']]) {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${ORIGIN}/design/${file}`, { waitUntil: 'networkidle' });
    await fonts(page);
    await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
    for (let t = 0; t < 40; t++) { const ok = await page.evaluate(() => [...document.images].every((i) => i.complete)); if (ok) break; await page.waitForTimeout(500); }
    await page.waitForTimeout(800);
    const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight }));
    console.log(`   ${name}: scrollWidth ${o.sw} / clientWidth ${o.cw} / height ${o.h}${o.sw > o.cw ? '  ! overflow' : ''}`);
    if (o.sw > o.cw) bad(`${name} overflow`);
    if (name === 'detail-1440') { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); }
    else {
      const parts = [];
      for (let y = 0; y < o.h; y += 3000) { const hh = Math.min(3000, o.h - y); parts.push(await page.screenshot({ fullPage: true, clip: { x: 0, y, width: w, height: hh } })); }
      parts.forEach((buf, k) => writeFileSync(path.join(OUT, `${name}-part${k}.png`), buf));
    }
    await page.close();
  }
}

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR', timezoneId: 'Asia/Seoul', colorScheme: 'light', reducedMotion: RM ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = ':root{--safe-b:34px !important;--safe-t:0px !important}'; document.head.appendChild(st); }); });   // 홈 인디케이터 34px 흉내
  const page = await ctx.newPage();
  page.on('pageerror', (e) => bad('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text(); if (!/GL Driver|ReadPixels|Automatic fallback to software WebGL/.test(t)) bad(`[console ${m.type()}] ${t.slice(0, 200)}`); } });
  const runs = { c0, c1, c2, c3, c4, c5, exit };
  if (which === 'c5morph') { console.log('▶ c5morph'); try { await c5morph(page); } catch (e) { bad('c5morph crashed: ' + e.message.split('\n')[0]); } }
  for (const k of Object.keys(runs)) if (which === k || which === 'all') { console.log('▶', k, `${VW}x${VH}`); cdp = null; try { await runs[k](page); } catch (e) { bad(`${k} crashed: ${e.message.split('\n')[0]}`); } }
  await ctx.close();
  if (which === 'board') {
    const bctx = await browser.newContext({ deviceScaleFactor: 1, locale: 'ko-KR', colorScheme: 'light' });
    await board(bctx);
    await bctx.close();
  }
} finally {
  await browser.close();
}
console.log('done', which, `${VW}x${VH}`, problems.length ? `— ${problems.length} problem(s)` : '— clean');
problems.forEach((p) => console.log('  -', p));
process.exit(problems.length ? 1 : 0);
