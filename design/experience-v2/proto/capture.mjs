// 프로토타입 화면 캡처 — 헤드리스 Chromium 1개, localhost:8805 (python3 -m http.server 8805 --bind 127.0.0.1 를 kippu-site 에서 먼저)
// 실행: node capture.mjs [c0|c1|c4|c5|board|all]  (board 는 1440·390 보드를 3000px 조각으로, 상세 페이지 첫 화면을 찍는다; 조각은 python 으로 이어 붙인다) [390x844|430x932|375x667]  → shots/<page>-<n>.png (@2x)
// Playwright 는 kippu-app/scripts/store-capture 의 설치본을 쓴다 (추가 설치 없음)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire('/Users/hare/Documents/monet/kippu-app/scripts/store-capture/package.json');
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ORIGIN = 'http://127.0.0.1:8805';
const BASE = ORIGIN + '/design/experience-v2/proto/';
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
    bad: [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1) && getComputedStyle(e).position !== 'absolute' && getComputedStyle(e).position !== 'fixed' && !e.closest('.hang, .tags, .stage, .mv, .guide, .col-tags, .unfold, .track, .gallery, .wall, .iris, .glow, .sunrise'); }).map((e) => e.className || e.tagName).slice(0, 5) }));
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

// C1 자격을 묻기: 스캔 → 돌려보기 → 안내문 살펴보기 → 펼침 → 질문 → 오늘 · 그때는 → 수집함
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
  // 다른 전단지(봉 마르셰)를 먼저 떼어 본다 — 안내문이 아니면 계속 찾기
  await page.evaluate(() => window.__c1.focus(1));
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.__c1.inspect(1));
  await page.waitForTimeout(1700);
  await shot(page, 'c1-3a'); await overflowCheck(page, 'c1-3a');
  await page.click('#closeBtn');
  await page.waitForFunction(() => window.__c1.step === 2, null, { timeout: 60000 });
  await page.waitForTimeout(600);
  // 안내문(1번)을 찾아 떼어 본다
  await page.evaluate(() => window.__c1.focus(0));
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.__c1.inspect(0));
  await page.waitForTimeout(1700);
  await shot(page, 'c1-3'); await overflowCheck(page, 'c1-3');
  await page.click('#openBtn');
  await page.waitForTimeout(2200);
  await shot(page, 'c1-4'); await overflowCheck(page, 'c1-4');
  await page.click('#toAsk');
  await page.waitForTimeout(600);
  await shot(page, 'c1-5'); await overflowCheck(page, 'c1-5');
  await page.click('.stance[data-k="viewer"]');
  await page.waitForTimeout(1400);
  await shot(page, 'c1-6'); await overflowCheck(page, 'c1-6');
  await page.click('#collect');
  await page.waitForTimeout(900);
  await shot(page, 'c1-6b');
  await page.waitForTimeout(1500);
  await shot(page, 'c1-7'); await overflowCheck(page, 'c1-7');
}

// C4 그림인가 사진인가: 셔터 4번 → 질문 → 오늘 · 그때는 → 저장
async function c4(page) {
  await page.goto(BASE + 'c4.html', { waitUntil: 'networkidle' });
  await fonts(page);
  await page.waitForTimeout(400);
  await shot(page, 'c4-1'); await overflowCheck(page, 'c4-1');
  for (let i = 0; i < 4; i++) {
    await page.click('#shutter');
    await page.waitForTimeout(1500);
    if (i === 0) await shot(page, 'c4-2');
    if (i < 3) { await page.click('#shutter'); await page.waitForTimeout(800); }
  }
  await shot(page, 'c4-3'); await overflowCheck(page, 'c4-3');
  await page.click('#toAsk');
  await page.waitForTimeout(500);
  await shot(page, 'c4-4'); await overflowCheck(page, 'c4-4');
  await page.click('.stance[data-k="photo"]');
  await page.waitForTimeout(1300);
  await shot(page, 'c4-5'); await overflowCheck(page, 'c4-5');
  await page.click('#saveStance');
  await page.waitForTimeout(600);
  await shot(page, 'c4-6'); await overflowCheck(page, 'c4-6');
}

// C5 모아 보기: 마무리 화면 → 저장·공유 이미지
async function c5(page) {
  await page.goto(BASE + 'c5.html', { waitUntil: 'networkidle' });
  await fonts(page);
  await page.waitForTimeout(1400);
  await shot(page, 'c5-1'); await overflowCheck(page, 'c5-1');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await shot(page, 'c5-1b'); await overflowCheck(page, 'c5-1b');
  await page.click('#share');
  await page.waitForTimeout(1800);
  await shot(page, 'c5-2'); await overflowCheck(page, 'c5-2');
  // 공유 이미지 원본(1080×1920)도 저장
  const data = await page.evaluate(() => document.getElementById('shareImg').src);
  const { writeFileSync } = await import('node:fs');
  writeFileSync(path.join(OUT, `c5-share${suffix}.png`), Buffer.from(data.split(',')[1], 'base64'));
}

// 보드(제안서) + 상세 페이지 — 전체 페이지 캡처
async function board(ctx) {
  for (const [name, w, h, file] of [['board-1440', 1440, 900, 'experience-v2.html'], ['board-390', 390, 844, 'experience-v2.html'], ['detail-1440', 1440, 900, 'experience-v2-detail.html']]) {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${ORIGIN}/design/${file}`, { waitUntil: 'networkidle' });
    await fonts(page);
    // lazy 이미지를 다 불러오게 끝까지 훑는다
    await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
    for (let t = 0; t < 40; t++) { const ok = await page.evaluate(() => [...document.images].every((i) => i.complete)); if (ok) break; await page.waitForTimeout(500); }
    await page.waitForTimeout(800);
    const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight }));
    console.log(`   ${name}: scrollWidth ${o.sw} / clientWidth ${o.cw} / height ${o.h}${o.sw > o.cw ? '  ! overflow' : ''}`);
    if (name === 'detail-1440') { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); }
    else {
      // 아주 긴 페이지는 fullPage 한 번에 찍으면 아래쪽 이미지가 검게 나온다(래스터 한계) → 3000px 씩 clip 으로 찍어 이어 붙인다
      const { PNG } = await import('pngjs').catch(() => ({ PNG: null }));
      const parts = [];
      for (let y = 0; y < o.h; y += 3000) {
        const hh = Math.min(3000, o.h - y);
        parts.push(await page.screenshot({ fullPage: true, clip: { x: 0, y, width: w, height: hh } }));
      }
      const { writeFileSync } = await import('node:fs');
      parts.forEach((buf, k) => writeFileSync(path.join(OUT, `${name}-part${k}.png`), buf));
      void PNG;
    }
    await page.close();
  }
}

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR', timezoneId: 'Asia/Seoul', colorScheme: 'light', reducedMotion: RM ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text(); if (!/GL Driver|ReadPixels/.test(t)) console.log('[console]', m.type(), t.slice(0, 200)); } });
  if (which === 'c0' || which === 'all') await c0(page);
  if (which === 'c1' || which === 'all') await c1(page);
  if (which === 'c4' || which === 'all') await c4(page);
  if (which === 'c5' || which === 'all') await c5(page);
  await ctx.close();
  if (which === 'board') {
    const bctx = await browser.newContext({ deviceScaleFactor: 1, locale: 'ko-KR', colorScheme: 'light' });
    await board(bctx);
    await bctx.close();
  }
} finally {
  await browser.close();
}
console.log('done', which, `${VW}x${VH}`);
