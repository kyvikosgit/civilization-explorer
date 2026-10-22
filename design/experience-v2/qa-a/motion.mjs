// 움직임 점검 — 화면을 영상으로 녹화한 뒤 ffmpeg 로 일정 간격 프레임을 뽑아 한 장으로 본다
//   node motion.mjs <c0|c1|c2> <tag>  → qa-a/motion/<tag>-<page>.webm + 프레임 시트
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, renameSync, readdirSync } from 'node:fs';
const require = createRequire('/Users/hare/Documents/monet/kippu-app/scripts/store-capture/package.json');
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'motion'); mkdirSync(OUT, { recursive: true });
const ORIGIN = 'http://127.0.0.1:8824';
const which = process.argv[2], TAG = process.argv[3] || 'm';
const VW = 390, VH = 844;
const marks = []; let t0 = 0;
const mark = (name) => { marks.push([name, (Date.now() - t0) / 1000]); };
let cdp;
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
async function tapEl(page, sel) { const b = await page.locator(sel).first().boundingBox(); await touch('touchStart', [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }]); await page.waitForTimeout(50); await touch('touchEnd', []); }

const flows = {
  async c0(page) {
    await page.goto(ORIGIN + '/design/experience-v2/proto/c0.html', { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
    mark('enter'); await tapEl(page, '#enter'); await page.waitForTimeout(2200);
    mark('award'); await tapEl(page, '#award'); await page.waitForTimeout(1800);
    mark('ok'); await tapEl(page, '#cfOk'); await page.waitForTimeout(4500);
  },
  async c1(page) {
    await page.goto(ORIGIN + '/design/experience-v2/proto/c1.html?debug', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__c1 && window.__c1.loaded, null, { timeout: 60000 }); await page.waitForTimeout(500);
    mark('scan'); await tapEl(page, '#guide');
    await page.waitForFunction(() => window.__c1.step === 2, null, { timeout: 60000 }); await page.waitForTimeout(600);
    await page.evaluate(() => window.__c1.focus(0)); await page.waitForTimeout(1600);
    mark('inspect'); await page.evaluate(() => window.__c1.inspect(0)); await page.waitForTimeout(1800);
    mark('open'); await tapEl(page, '#openBtn'); await page.waitForTimeout(2600);
    mark('ask'); await tapEl(page, '#toAsk'); await page.waitForTimeout(1200);
    mark('pick'); await tapEl(page, '.paper[data-k="viewer"]'); await page.waitForTimeout(4200);
  },
  async c2(page) {
    await page.goto(ORIGIN + '/design/experience-v2/ticket/map-picker.html?d=21&m=10', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.mapReady, null, { timeout: 30000 }); await page.waitForTimeout(600);
    mark('chip'); await page.evaluate(() => window.pick('lehavre')); await page.waitForTimeout(900);
    mark('go'); await tapEl(page, '#pkGo'); await page.waitForTimeout(800);
    mark('buy'); await tapEl(page, '#buy'); await page.waitForTimeout(3200);
  },
};

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, recordVideo: { dir: OUT, size: { width: VW, height: VH } } });
const page = await ctx.newPage(); cdp = await ctx.newCDPSession(page);
t0 = Date.now();
await flows[which](page);
const vp = await page.video().path();
await ctx.close(); await browser.close();
const dst = path.join(OUT, `${TAG}-${which}.webm`); renameSync(vp, dst);
console.log(dst); console.log(JSON.stringify(marks));
void readdirSync;
