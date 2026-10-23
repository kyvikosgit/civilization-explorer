// 움직임 캡처 — 헤드리스 Chromium, CDP 터치, 390×844 @2x. node fx.mjs c0|c1
import { createRequire } from 'node:module';
const require = createRequire('/Users/hare/Documents/monet/kippu-app/scripts/store-capture/package.json');
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8832/design/experience-v2/proto/';
const OUT = '/Users/hare/Documents/monet/kippu-site/design/experience-v2/proto/shots/';
const which = process.argv[2] || 'c0';
const RM = !!process.env.REDUCE;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: RM ? 'reduce' : 'no-preference' });
const SLOW = +(process.env.SLOW || 4);   // 슬로모션 — 헤드리스 WebGL 이 느려도 정확한 순간을 찍는다(가상 시간 = 실제 / SLOW)
await ctx.addInitScript((k) => {
  const pn = performance.now.bind(performance), b = pn(), dn = Date.now.bind(Date), bd = dn();
  performance.now = () => b + (pn() - b) / k;
  Date.now = () => bd + (dn() - bd) / k;
  const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => raf(() => cb(performance.now()));
  const st = window.setTimeout.bind(window); window.setTimeout = (f, ms, ...a) => st(f, (ms || 0) * k, ...a);
}, SLOW);
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
const cdp = await ctx.newCDPSession(page);
await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / SLOW });
const tap = async (x, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await page.waitForTimeout(40); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
const tapEl = async (sel) => { const b = await page.locator(sel).first().boundingBox(); if (!b) throw new Error('no ' + sel); await tap(b.x + b.width / 2, b.y + b.height / 2); };
const suf = RM ? '-rm' : '';
const shot = (n) => page.screenshot({ path: `${OUT}fx-${which}-${n}${suf}.png` });
// 시간 기준 캡처: t0 이후 ms 지점마다
async function at(t0, list) { for (const [ms, n] of list) { const w = t0 + ms * SLOW - Date.now(); if (w > 0) await page.waitForTimeout(w); await shot(n); } }

if (which === 'c0') {
  await page.goto(BASE + 'c0.html', { waitUntil: 'domcontentloaded' });
  if (!RM) await page.waitForSelector('#intro.run', { timeout: 20000 }).catch(() => errs.push('intro never ran'));
  let t0 = Date.now();
  await at(t0, [[500, 'in05'], [1500, 'in15'], [2500, 'in25'], [3300, 'in33'], [4300, 'in43']]);
  if (process.env.ONLY_INTRO) { await browser.close(); process.exit(0); }
  await page.waitForSelector('#intro', { state: 'detached', timeout: 20000 }).catch(() => errs.push('intro not removed'));
  await page.waitForTimeout(1600 * SLOW); await shot('role');
  await tapEl('#candStrip button:nth-child(4)'); t0 = Date.now();
  await at(t0, [[250, 'ent03'], [600, 'ent06'], [1500, 'viewer']]);
  await tapEl('#award'); await page.waitForTimeout(900 * SLOW); await shot('confirm');
  await tapEl('#cfOk'); t0 = Date.now();
  await at(t0, [[420, 'medal1'], [700, 'medal2'], [1340, 'thud'], [1900, 'flip'], [3000, 'title'], [3700, 'pull1'], [4200, 'pull2'], [4900, 'share1'], [5300, 'share2'], [7000, 'result']]);
  await tapEl('#again'); t0 = Date.now(); await at(t0, [[400, 'rewind'], [1300, 'rewound']]);
  await tapEl('#award'); await page.waitForTimeout(800 * SLOW); await tapEl('#cfOk'); await page.waitForTimeout(7000 * SLOW);
  await tapEl('#save'); t0 = Date.now(); await at(t0, [[450, 'card1'], [1500, 'card']]);
  await tapEl('#back4'); await page.waitForTimeout(700 * SLOW); await tapEl('#again'); await page.waitForTimeout(1300 * SLOW);
  await tapEl('#back2'); t0 = Date.now(); await at(t0, [[450, 'back1'], [1400, 'back']]);
}
if (which === 'c1') {
  await page.goto(BASE + 'c1.html?debug', { waitUntil: 'domcontentloaded' });
  let t0 = Date.now();
  await at(t0, [[500, 'in05'], [1500, 'in15'], [2500, 'in25'], [3600, 'in36']]);
  await page.waitForFunction(() => window.__c1 && window.__c1.loaded, null, { timeout: 60000 });
  await page.waitForTimeout(600 * SLOW);
  await tapEl('#guide'); t0 = Date.now();
  await at(t0, [[900, 'rise1'], [1500, 'rise2'], [2200, 'rise3'], [3300, 'rise4']]);
  await page.waitForFunction(() => window.__c1.step === 2, null, { timeout: 30000 });
  await page.waitForTimeout(800 * SLOW); await shot('spin');
  // 접힌 전단지 찾기 → 펼침 → 놋쇠 명판 → 질문
  await page.evaluate(() => window.__c1.focus(window.__c1.EXPO)); await page.waitForTimeout(2200 * SLOW); await shot('flyer');
  const fr = await page.evaluate(() => { const p = window.__c1.project(window.__c1.EXPO); const m = document.querySelector('#mv').getBoundingClientRect(); return { x: m.left + p.cx, y: m.top + p.cy }; });
  await tap(fr.x, fr.y); t0 = Date.now();
  await at(t0, [[300, 'pull03'], [900, 'pull09'], [3900, 'found']]);
  await tapEl('#toAsk'); t0 = Date.now();
  await at(t0, [[250, 'ask03'], [600, 'ask06'], [1000, 'ask10'], [3000, 'ask']]);
  await tapEl('.paper[data-k="viewer"]'); t0 = Date.now();
  await at(t0, [[300, 'pick03'], [800, 'pick08']]);
  await page.waitForFunction(() => window.__c1.step === 6, null, { timeout: 8000 }); t0 = Date.now();
  await at(t0, [[300, 'rev03'], [900, 'rev09'], [1500, 'rev15'], [3200, 'result']]);
}
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console errors');
await browser.close();
