// 프로토타입 C0·C1 화면 캡처 — 헤드리스 Chromium 1개, localhost:8802 (python3 -m http.server 8802 --bind 127.0.0.1 를 kippu-site 에서 먼저)
// 실행: node capture.mjs [c0|c1|all] [390x844|430x932|375x667]  → shots/<page>-<n>.png (@2x)
// Playwright 는 kippu-app/scripts/store-capture 의 설치본을 쓴다 (추가 설치 없음)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire('/Users/hare/Documents/monet/kippu-app/scripts/store-capture/package.json');
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:8802/design/experience-v2/proto/';
const which = process.argv[2] || 'all';
const [VW, VH] = (process.argv[3] || '390x844').split('x').map(Number);
const RM = !!process.env.REDUCE;
const suffix = (process.argv[3] && process.argv[3] !== '390x844' ? `-${VW}` : '') + (RM ? '-rm' : '');
const OUT = path.join(HERE, 'shots');
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}${suffix}.png`) });

async function fonts(page) {
  await page.evaluate(async () => {
    const want = ['400 16px Freesentation', '600 16px Freesentation', '700 16px Freesentation', '600 16px Paperlogy', '800 16px Paperlogy'];
    await Promise.all(want.map((f) => document.fonts.load(f, '문명탐험가').catch(() => {})));
    await document.fonts.ready;
  });
}
async function overflowCheck(page, tag) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    bad: [...document.querySelectorAll('.scr.on *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1) && getComputedStyle(e).position !== 'absolute' && !e.closest('.hang, .tags, .stage, .mv, .guide, .col-tags, .unfold'); }).map((e) => e.className || e.tagName).slice(0, 5) }));
  if (o.sw > o.cw || o.bad.length) console.log(`   ! overflow ${tag}:`, o);
}

async function c0(page) {
  await page.goto(BASE + 'c0.html', { waitUntil: 'networkidle' });
  await fonts(page);
  await page.waitForTimeout(300);
  await shot(page, 'c0-1'); await overflowCheck(page, 'c0-1');
  await page.click('#enter');
  await page.waitForTimeout(1500);
  await shot(page, 'c0-2a');
  // 4번(봄날)을 끌어 가운데로 — 중간에 한 장
  const from = await page.evaluate(() => window.__c0.center(4));
  const to = await page.evaluate(() => window.__c0.target());
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const steps = 14;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, e = 1 - Math.pow(1 - t, 2);
    await page.mouse.move(from.x + (to.x - from.x) * e * 0.72, from.y + (to.y - from.y) * e * 0.72);
    await page.waitForTimeout(28);
  }
  await page.waitForTimeout(60);
  await shot(page, 'c0-2'); await overflowCheck(page, 'c0-2');
  for (let i = 1; i <= 8; i++) { await page.mouse.move(from.x + (to.x - from.x) * (0.72 + 0.28 * i / 8), from.y + (to.y - from.y) * (0.72 + 0.28 * i / 8)); await page.waitForTimeout(30); }
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(1400);
  await shot(page, 'c0-2b');
  await page.click('#cfOk');
  await page.waitForTimeout(900);
  await shot(page, 'c0-3');
  await page.waitForTimeout(2600);
  await shot(page, 'c0-4'); await overflowCheck(page, 'c0-4');
  await page.click('#save');
  await page.waitForTimeout(700);
  await shot(page, 'c0-5'); await overflowCheck(page, 'c0-5');
}

async function c1(page) {
  await page.goto(BASE + 'c1.html?debug', { waitUntil: 'networkidle' });
  await fonts(page);
  await page.waitForFunction(() => window.__c1 && window.__c1.loaded, null, { timeout: 60000 });
  await page.waitForTimeout(400);
  await shot(page, 'c1-1'); await overflowCheck(page, 'c1-1');
  await page.click('#guide');
  await page.waitForFunction(() => window.__c1.viewer && window.__c1.viewer.riseT > 0.42, null, { timeout: 60000 });
  await shot(page, 'c1-2');
  await page.waitForFunction(() => window.__c1.step === 2, null, { timeout: 60000 });
  await page.waitForTimeout(900);
  await shot(page, 'c1-2b'); await overflowCheck(page, 'c1-2b');
  // 봉 마르셰(2번)를 정면으로 돌린 뒤 떼어 본다
  await page.evaluate(() => window.__c1.focus(1));
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.__c1.inspect(1));
  await page.waitForTimeout(1700);
  await shot(page, 'c1-3'); await overflowCheck(page, 'c1-3');
  await page.click('#pickBtn');
  await page.waitForTimeout(600);
  await shot(page, 'c1-3b');
  await page.click('#cfOk');
  await page.waitForFunction(() => document.querySelectorAll('.ctag.show').length >= 4, null, { timeout: 90000 });
  await page.waitForTimeout(500);
  await shot(page, 'c1-4'); await overflowCheck(page, 'c1-4');
  await page.waitForFunction(() => window.__c1.step === 5, null, { timeout: 90000 });
  await page.waitForTimeout(700);
  await shot(page, 'c1-5a');
  await page.waitForTimeout(2200);
  await shot(page, 'c1-5'); await overflowCheck(page, 'c1-5');
  await page.click('#collect');
  await page.waitForTimeout(900);
  await shot(page, 'c1-5b');
  await page.waitForTimeout(1600);
  await shot(page, 'c1-6');
}

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR', timezoneId: 'Asia/Seoul', colorScheme: 'light', reducedMotion: RM ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text(); if (!/GL Driver|ReadPixels/.test(t)) console.log('[console]', m.type(), t.slice(0, 200)); } });
  if (which === 'c0' || which === 'all') await c0(page);
  if (which === 'c1' || which === 'all') await c1(page);
  await ctx.close();
} finally {
  await browser.close();
}
console.log('done', which, `${VW}x${VH}`);
