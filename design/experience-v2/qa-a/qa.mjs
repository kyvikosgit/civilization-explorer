// C0 · C1 · C2 품질 점검용 캡처 (qa-a 전용 — proto/capture.mjs 와 별개)
//   서버: kippu-site 에서 python3 -m http.server 8824 --bind 127.0.0.1
//   실행: node qa.mjs <c0|c1|c2|all> <before|after|tag> [390x844|375x667|430x932]
//   모든 입력은 CDP 터치(isMobile · hasTouch). 결과: qa-a/<tag>-<page>-<w>-<n>.png
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire('/Users/hare/Documents/monet/kippu-app/scripts/store-capture/package.json');
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ORIGIN = 'http://127.0.0.1:8824';
const PROTO = ORIGIN + '/design/experience-v2/proto/';
const which = process.argv[2] || 'all';
const TAG = process.argv[3] || 'shot';
const [VW, VH] = (process.argv[4] || '390x844').split('x').map(Number);
const problems = [];
const bad = (m) => { problems.push(m); console.log('   !', m); };
let n = 0, cur = '';
const shot = async (page, name) => { n++; const f = `${TAG}-${cur}-${VW}-${String(n).padStart(2, '0')}-${name}.png`; await page.screenshot({ path: path.join(HERE, f) }); };
const wait = (page, ms) => page.waitForTimeout(ms);

async function fonts(page) {
  await page.evaluate(async () => {
    const want = ['400 16px Freesentation', '600 16px Freesentation', '700 16px Freesentation', '600 16px Paperlogy', '800 16px Paperlogy'];
    await Promise.all(want.map((f) => document.fonts.load(f, '가나다').catch(() => {})));
    await document.fonts.ready;
  });
}
let cdp = null;
async function touch(page, type, points) { if (!cdp) cdp = await page.context().newCDPSession(page); await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points }); }
async function tap(page, x, y) { await touch(page, 'touchStart', [{ x, y }]); await page.waitForTimeout(50); await touch(page, 'touchEnd', []); }
async function tapEl(page, sel) {
  const el = page.locator(sel).first();
  await el.waitFor({ state: 'visible', timeout: 15000 });
  let b = await el.boundingBox();
  if (b.y < 0 || b.y + b.height > VH || b.x < 0 || b.x + b.width > VW) { await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); b = await el.boundingBox(); }
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  const hit = await page.evaluate(([x, y, q]) => { const e = document.elementFromPoint(x, y); const t = document.querySelector(q); return !!(e && t && (e === t || t.contains(e))); }, [x, y, sel]);
  if (!hit) bad(`tap target covered: ${sel}`);
  await tap(page, x, y);
}
async function drag(page, from, to, steps = 16, ms = 320) {
  await touch(page, 'touchStart', [{ x: from.x, y: from.y }]);
  for (let i = 1; i <= steps; i++) { const t = i / steps, e = 1 - Math.pow(1 - t, 2); await touch(page, 'touchMove', [{ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }]); await page.waitForTimeout(ms / steps); }
  await touch(page, 'touchEnd', []);
}
async function pinch(page, c, d0, d1, steps = 14) {
  for (let i = 0; i <= steps; i++) {
    const d = d0 + (d1 - d0) * (i / steps), pts = [{ x: c.x - d / 2, y: c.y, id: 1 }, { x: c.x + d / 2, y: c.y, id: 2 }];
    await touch(page, i ? 'touchMove' : 'touchStart', pts); await page.waitForTimeout(22);
  }
  await touch(page, 'touchEnd', []);
}
async function overflow(page, tag) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (o.sw > o.cw) bad(`h-overflow ${tag} ${o.sw}>${o.cw}`);
}

async function c0(page) {
  await page.goto(PROTO + 'c0.html', { waitUntil: 'networkidle' }); await fonts(page); await wait(page, 500);
  await shot(page, 'role'); await overflow(page, 'role');
  await page.evaluate(() => { const r = document.querySelector('.role'); r.scrollTop = r.scrollHeight; }); await wait(page, 200);
  await shot(page, 'role-bottom');
  await page.evaluate(() => { document.querySelector('.role').scrollTop = 0; });
  await tapEl(page, '#enter');
  await wait(page, 180); await shot(page, 'enter-mid');
  await wait(page, 1400); await shot(page, 'viewer');
  // 돌려 보기(끄는 중)
  await touch(page, 'touchStart', [{ x: VW * 0.5, y: VH * 0.45 }]);
  for (let i = 1; i <= 8; i++) { await touch(page, 'touchMove', [{ x: VW * 0.5 + i * 9, y: VH * 0.45 + i * 3 }]); await wait(page, 20); }
  await shot(page, 'rotate-hold');
  await touch(page, 'touchEnd', []); await wait(page, 1200);
  // 옆으로 밀기 → 다음
  await drag(page, { x: VW * 0.8, y: VH * 0.45 }, { x: VW * 0.15, y: VH * 0.45 }, 10, 160); await wait(page, 260); await shot(page, 'swipe-mid');
  await wait(page, 900); await shot(page, 'next');
  if ((await page.evaluate(() => window.__c0.idx)) !== 1) bad('c0 swipe did not advance');
  // 확대
  await pinch(page, { x: VW / 2, y: VH * 0.45 }, 80, 260); await wait(page, 300); await shot(page, 'zoom');
  // 두 번 탭 → 원래대로
  await tap(page, VW / 2, VH * 0.45); await wait(page, 120); await tap(page, VW / 2, VH * 0.45); await wait(page, 1800);
  if ((await page.evaluate(() => window.__c0.zoom)) > 1.05) bad('c0 double tap did not reset zoom');
  // 4번으로
  for (let i = 0; i < 3; i++) { await tapEl(page, '#next'); await wait(page, 500); }
  await wait(page, 600); await shot(page, 'cand4');
  await tapEl(page, '#award'); await wait(page, 380); await shot(page, 'medal-mid');
  await wait(page, 1100); await shot(page, 'confirm');
  await tapEl(page, '#cfBack'); await wait(page, 700); await shot(page, 'after-cancel');
  if ((await page.evaluate(() => window.__c0.mode)) !== 'pick') bad('c0 cancel not clean');
  await tapEl(page, '#award'); await wait(page, 1500);
  await tapEl(page, '#cfOk');
  await wait(page, 500); await shot(page, 'reveal-0.5s');
  await wait(page, 700); await shot(page, 'reveal-1.2s');
  await wait(page, 800); await shot(page, 'reveal-2s');
  await wait(page, 1600); await shot(page, 'reveal-done');
  await tapEl(page, '#save'); await wait(page, 600); await shot(page, 'card');
  await overflow(page, 'card');
  await tapEl(page, '#back4'); await wait(page, 700); await shot(page, 'card-back');
  await tapEl(page, '#again'); await wait(page, 1400); await shot(page, 'again');
  if ((await page.evaluate(() => window.__c0.mode)) !== 'pick') bad('c0 again not clean');
}

async function c1(page) {
  await page.goto(PROTO + 'c1.html?debug', { waitUntil: 'networkidle' }); await fonts(page);
  await page.waitForFunction(() => window.__c1 && window.__c1.loaded, null, { timeout: 60000 }); await wait(page, 500);
  await shot(page, 'scan');
  await tapEl(page, '#guide'); await wait(page, 300); await shot(page, 'scan-found');
  await page.waitForFunction(() => window.__c1.viewer && window.__c1.viewer.riseT > 0.4, null, { timeout: 60000 }); await shot(page, 'rise-mid');
  await page.waitForFunction(() => window.__c1.step === 2, null, { timeout: 60000 }); await wait(page, 900);
  await shot(page, 'spin');
  await drag(page, { x: VW * 0.7, y: VH * 0.5 }, { x: VW * 0.25, y: VH * 0.5 }, 14, 300); await wait(page, 700); await shot(page, 'spin-drag');
  await tapEl(page, '.chip[data-i="1"]'); await wait(page, 1800);
  await page.waitForFunction(() => document.querySelector('.chip.on'), null, { timeout: 8000 }).catch(() => {}); await wait(page, 800);
  const p1 = await page.evaluate(() => window.__c1.project(1));
  if (p1 && p1.x) await tap(page, p1.x, p1.y);
  if (!(await page.waitForFunction(() => window.__c1.step === 3, null, { timeout: 3000 }).catch(() => false))) { bad('c1 poster tap (1) missed'); await page.evaluate(() => window.__c1.inspect(1)); }
  await wait(page, 300); await shot(page, 'inspect-mid');
  await wait(page, 1400); await shot(page, 'inspect-other');
  await tapEl(page, '#closeBtn'); await page.waitForFunction(() => window.__c1.step === 2, null, { timeout: 10000 }).catch(() => bad('c1 close failed')); await wait(page, 900);
  await shot(page, 'after-close');
  await tapEl(page, '.chip[data-i="0"]'); await wait(page, 1800);
  await wait(page, 800);
  const p = await page.evaluate(() => window.__c1.project(0));
  if (p && p.x) await tap(page, p.x, p.y); else await page.evaluate(() => window.__c1.inspect(0));
  await page.waitForFunction(() => window.__c1.step === 3, null, { timeout: 8000 }).catch(() => bad('c1 tap flyer failed'));
  await wait(page, 1800); await shot(page, 'inspect-target');
  await tapEl(page, '#openBtn'); await wait(page, 700); await shot(page, 'unfold-mid');
  await wait(page, 1700); await shot(page, 'unfold');
  await tapEl(page, '#toAsk'); await wait(page, 250); await shot(page, 'ask-mid');
  await wait(page, 900); await shot(page, 'ask');
  await tapEl(page, '.paper[data-k="viewer"]'); await wait(page, 450); await shot(page, 'pick-mid');
  await page.waitForFunction(() => window.__c1.step === 6, null, { timeout: 8000 }).catch(() => bad('c1 no reveal'));
  await wait(page, 500); await shot(page, 'reveal-0.5s');
  await wait(page, 700); await shot(page, 'reveal-1.2s');
  await wait(page, 1500); await shot(page, 'reveal-done');
  await page.evaluate(() => { const b = document.querySelector('.unfold-body'); b.scrollTop = b.scrollHeight; }); await wait(page, 300); await shot(page, 'reveal-bottom');
  await tapEl(page, '#collect'); await wait(page, 400); await shot(page, 'collect-mid');
  await wait(page, 1500); await shot(page, 'collected');
  await page.evaluate(() => { const b = document.querySelector('.unfold-body'); b.scrollTop = b.scrollHeight; }); await wait(page, 300); await shot(page, 'collected-bottom');
}

async function c2(page) {
  await page.goto(ORIGIN + '/design/experience-v2/ticket/map-picker.html?d=21&m=10', { waitUntil: 'networkidle' }); await fonts(page);
  await page.waitForFunction(() => window.mapReady, null, { timeout: 30000 }); await wait(page, 900);
  await shot(page, 'map');
  await tapEl(page, '#openClues'); await wait(page, 500); await shot(page, 'clues');
  await tapEl(page, '#clueSheet [data-sheet-close]'); await wait(page, 500);
  await tapEl(page, '.chip[data-id="rouen"]'); await wait(page, 120); await shot(page, 'pick-mid');
  await wait(page, 600); await shot(page, 'pick-rouen');
  // 지도에서 르아브르 점 탭
  const s = await page.evaluate(() => window.screenOf('lehavre')); const box = await page.locator('#mapBox').boundingBox();
  await tap(page, box.x + s[0], box.y + s[1]); await wait(page, 700); await shot(page, 'pick-havre');
  if ((await page.evaluate(() => window.getPicked() && window.getPicked().id)) !== 'lehavre') bad('c2 map tap lehavre failed');
  await tapEl(page, '#pkGo'); await wait(page, 500); await shot(page, 'confirm');
  await tapEl(page, '#cfRetry'); await wait(page, 600); await shot(page, 'after-retry');
  const st = await page.evaluate(() => window.mapState()); if (st.picked || st.card || st.route) bad('c2 retry not clean ' + JSON.stringify(st));
  await tapEl(page, '.chip[data-id="lehavre"]'); await wait(page, 500);
  await tapEl(page, '#placeCard'); await wait(page, 500);
  await tapEl(page, '#buy');
  await wait(page, 380); await shot(page, 'issue-0.4s');
  await wait(page, 300); await shot(page, 'issue-0.7s');
  await wait(page, 500); await shot(page, 'issue-1.2s');
  await wait(page, 500); await shot(page, 'issue-1.7s');
  await wait(page, 900); await shot(page, 'docked');
  await tapEl(page, '#cardWrap'); await wait(page, 800); await shot(page, 'ticket-open');
  await tap(page, VW / 2, VH - 60); await wait(page, 800); await shot(page, 'ticket-redocked');
  const fl = page.locator('#flow');
  const scrollTo = async (sel, off = 70) => { await page.evaluate(([q, o]) => { const f = document.querySelector('#flow'); const e = document.querySelector(q); f.scrollTop = e.getBoundingClientRect().top - f.getBoundingClientRect().top + f.scrollTop - o; }, [sel, off]); await wait(page, 900); };
  await scrollTo('#story'); await shot(page, 'story');
  await scrollTo('.pf.paint'); await shot(page, 'paint');
  await scrollTo('#postcard'); await shot(page, 'postcard');
  await tapEl(page, '#pcInk'); await wait(page, 300);
  await page.keyboard.type('바다 냄새가 여기까지 납니다', { delay: 20 }); await wait(page, 300); await shot(page, 'postcard-typing');
  await page.evaluate(() => document.querySelector('#pcMsg').blur()); await wait(page, 300);
  await tapEl(page, '#pcFlip'); await wait(page, 400); await shot(page, 'postcard-flip-mid');
  await wait(page, 700); await shot(page, 'postcard-back');
  await tapEl(page, '#pcFlip'); await wait(page, 1000);
  await scrollTo('#today', 60); await wait(page, 200); await shot(page, 'today-0.6s');
  await wait(page, 900); await shot(page, 'today-1.5s');
  await wait(page, 1500); await shot(page, 'today-done');
  await page.evaluate(() => { const f = document.querySelector('#flow'); f.scrollTop = f.scrollHeight; }); await wait(page, 400); await shot(page, 'bottom');
  await tapEl(page, '#save'); await wait(page, 500); await shot(page, 'save-mid');
  await wait(page, 1200); await shot(page, 'saved');
  await tapEl(page, '#again'); await wait(page, 700); await shot(page, 'again');
  const st2 = await page.evaluate(() => window.mapState()); if (st2.picked || st2.card || st2.route) bad('c2 again not clean ' + JSON.stringify(st2));
  void fl;
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const name of which === 'all' ? ['c0', 'c1', 'c2'] : which.split(',')) {
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR', reducedMotion: process.env.REDUCE ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(); cdp = null; n = 0; cur = name;
  page.on('console', (m) => { if (m.type() === 'error') bad(`${name} console: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => bad(`${name} pageerror: ${e.message.slice(0, 200)}`));
  console.log(`── ${name} ${VW}x${VH}`);
  try { await ({ c0, c1, c2 })[name](page); } catch (e) { bad(`${name} threw: ${e.message.split('\n')[0]}`); await shot(page, 'error').catch(() => {}); }
  await ctx.close();
}
await browser.close();
console.log(problems.length ? `\n${problems.length} problem(s)` : '\nok');
process.exit(problems.length ? 1 : 0);
