import { createRequire } from 'node:module';
const require = createRequire('/Users/hare/Documents/monet/kippu-app/scripts/store-capture/package.json');
const { chromium } = require('playwright');
const b = await chromium.launch();
for (const [w,h] of [[390,844],[375,667]]) {
const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:8824/design/experience-v2/proto/c1.html');
await page.evaluate(() => { document.body.dataset.step = '5'; document.querySelectorAll('[data-on]').forEach((el) => { el.hidden = !el.dataset.on.split(' ').includes('5'); }); });
await page.waitForTimeout(800);
console.log(w, JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.paper .notice')].map((n) => { const f = n.querySelector('.n-foot').getBoundingClientRect(), t = n.querySelector('.n-tag').getBoundingClientRect(), r = n.getBoundingClientRect(); return { ch: n.clientHeight, sh: n.scrollHeight, footBottom: Math.round(f.bottom - r.top), footL: Math.round(f.left - r.left), footR: Math.round(f.right - r.left), tagTop: Math.round(t.top - r.top), tagL: Math.round(t.left - r.left) }; }))));
await ctx.close(); }
await b.close();
