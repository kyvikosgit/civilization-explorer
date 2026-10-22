// 밤샘 품질 점검(qa-b) — C3 · C5 · 출구 A–E · 모음. 헤드리스 Chrome(H.264 영상 재생용 channel:'chrome') · 실제 터치(CDP)
// 실행: python3 -m http.server 8825 --bind 127.0.0.1 (kippu-site 에서) → node qa-b/qa.mjs <c3|c5|exit-e|exit|exit-b|exit-c|exit-d|index|all> [390x844|375x667|430x932] [tag]
//   → qa-b/<tag>/<page>-<n>[-W].png  (tag 기본 'now'). 콘솔 오류 · 가로 넘침 · 반응 없는 탭은 끝에 요약.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire('/Users/hare/Documents/monet/kippu-app/scripts/store-capture/package.json');
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://127.0.0.1:8825/design/experience-v2/proto/';
const which = process.argv[2] || 'all';
const [VW, VH] = (process.argv[3] || '390x844').split('x').map(Number);
const TAG = process.argv[4] || 'now';
const sfx = VW === 390 ? '' : `-${VW}`;
const OUT = path.join(HERE, TAG); mkdirSync(OUT, { recursive: true });
const problems = [];
const bad = (m) => { problems.push(m); console.log('   !', m); };
const shot = (page, name, full = false) => page.screenshot({ path: path.join(OUT, `${name}${sfx}.png`), fullPage: full });
const wait = (page, ms) => page.waitForTimeout(ms);

async function fonts(page) {
  await page.evaluate(async () => {
    const want = ['400 16px Freesentation', '500 16px Freesentation', '600 16px Freesentation', '700 16px Freesentation', '600 16px Paperlogy', '700 16px Paperlogy', '800 16px Paperlogy'];
    await Promise.all(want.map((f) => document.fonts.load(f, '모네가').catch(() => {})));
    await document.fonts.ready;
  });
}
async function overflow(page, tag) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (o.sw > o.cw) bad(`overflow ${tag}: ${JSON.stringify(o)}`);
}
let cdp = null;
async function touch(page, type, points) { if (!cdp) cdp = await page.context().newCDPSession(page); await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points }); }
async function tap(page, x, y) { await touch(page, 'touchStart', [{ x, y }]); await page.waitForTimeout(50); await touch(page, 'touchEnd', []); }
async function tapEl(page, sel) {
  const el = page.locator(sel).first();
  await el.waitFor({ state: 'visible', timeout: 15000 });
  let b = await el.boundingBox();
  if (b.y < 56 || b.y + b.height > VH - 4) { await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(400); b = await el.boundingBox(); }
  const hit = await page.evaluate(([x, y, q]) => { const e = document.elementFromPoint(x, y); const t = document.querySelector(q); return !!(e && t && (e === t || t.contains(e))); }, [b.x + b.width / 2, b.y + b.height / 2, sel]);
  if (!hit) bad(`tap target covered: ${sel}`);
  await tap(page, b.x + b.width / 2, b.y + b.height / 2);
}
async function press(page, sel, nextSel, label, timeout = 8000) {
  await tapEl(page, sel);
  try { await page.locator(nextSel).first().waitFor({ state: 'visible', timeout }); } catch (e) { bad(`TOUCH FAIL: ${label}`); }
}
async function swipe(page, from, to, steps = 18, ms = 360) {
  await touch(page, 'touchStart', [{ x: from.x, y: from.y }]);
  for (let i = 1; i <= steps; i++) { const t = i / steps; await touch(page, 'touchMove', [{ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }]); await page.waitForTimeout(ms / steps); }
  await touch(page, 'touchEnd', []);
}
// 화면을 손가락으로 올려 보며 찍는다(스크롤 컨테이너가 따로 있으면 그쪽)
async function scrollShots(page, name, { root = null, step = 0.72, pause = 1600, max = 14 } = {}) {
  for (let i = 0; i < max; i++) {
    await shot(page, `${name}-s${String(i).padStart(2, '0')}`);
    const done = await page.evaluate(([r, s]) => { const el = r ? document.querySelector(r) : document.scrollingElement; const before = el.scrollTop; el.scrollBy({ top: innerHeight * s, behavior: 'smooth' }); return before + el.clientHeight >= el.scrollHeight - 2; }, [root, step]);
    await wait(page, pause);
    if (done) break;
  }
}

// ── C3
async function c3(page) {
  await page.goto(BASE + 'c3.html', { waitUntil: 'networkidle' }); await fonts(page); await wait(page, 1200);
  await shot(page, 'c3-0'); await overflow(page, 'c3-0');
  const box = await page.locator('#stage').boundingBox();
  const L = box.x + box.width * 0.08, R = box.x + box.width * 0.92;
  const y = (f) => box.y + box.height * f;
  await swipe(page, { x: L, y: y(0.2) }, { x: R, y: y(0.24) }, 20, 520);
  await wait(page, 260); await shot(page, 'c3-1');
  await swipe(page, { x: R, y: y(0.5) }, { x: L, y: y(0.54) }, 20, 520);
  await wait(page, 200); await shot(page, 'c3-2');
  const cov2 = await page.evaluate(() => window.__c3.coverage());
  console.log('   c3 coverage after 2 sweeps', cov2.toFixed(2));
  // 셋째 획에서 완성 애니메이션 중간을 찍는다
  await swipe(page, { x: L, y: y(0.8) }, { x: R, y: y(0.78) }, 20, 520);
  await wait(page, 450); await shot(page, 'c3-3mid');
  let n = 3;
  while (!(await page.evaluate(() => window.__c3.done)) && n < 8) { await swipe(page, { x: L, y: y(0.15 + (n % 4) * 0.22) }, { x: R, y: y(0.2 + (n % 4) * 0.2) }, 20, 520); n++; await wait(page, 300); }
  console.log('   c3 sweeps to done', n, 'done', await page.evaluate(() => window.__c3.done));
  if (n > 5) bad(`c3: needed ${n} sweeps`);
  await wait(page, 700); await shot(page, 'c3-4mid');
  await wait(page, 2200); await shot(page, 'c3-5done'); await overflow(page, 'c3-5');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(page, 1200);
  await shot(page, 'c3-6after');
  const hb = await page.locator('#hold').boundingBox();
  if (hb) {
    await touch(page, 'touchStart', [{ x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 }]); await wait(page, 500);
    await page.evaluate(() => window.scrollTo(0, 0)); await wait(page, 300);
    await shot(page, 'c3-7hold');
    await touch(page, 'touchEnd', []); await wait(page, 500);
    if (await page.evaluate(() => document.querySelector('#reveal').classList.contains('hide'))) bad('c3: hold release did not restore');
    await shot(page, 'c3-8release');
  }
  await shot(page, 'c3-9full', true);
}

// ── C5
async function c5(page) {
  await page.goto(BASE + 'c5.html', { waitUntil: 'networkidle' }); await fonts(page); await wait(page, 1200);
  await shot(page, 'c5-0scan'); await overflow(page, 'c5-0');
  await tapEl(page, '#scan');
  await wait(page, 350); await shot(page, 'c5-1found');
  const t0 = Date.now();
  const at = async (ms, name) => { const d = ms - (Date.now() - t0); if (d > 0) await wait(page, d); const s = await page.evaluate(() => ({ st: window.__c5sun.state, mix: window.__c5sun.mix, vt: window.__c5sun.vt })); console.log(`   c5 ${name} t=${Date.now() - t0}ms`, JSON.stringify(s)); await shot(page, name); };
  const marks = (process.env.C5MARKS || '1200,2600,3400,4200,5200,7000,9500,12000,13000,13800,14600,15600,17500').split(',').map(Number);
  for (const ms of marks) await at(ms, `c5-2t${String(ms).padStart(5, '0')}`);
  try { await page.waitForFunction(() => window.__c5sun.state === 'end', null, { timeout: 20000 }); } catch (e) { bad('c5: sunrise never reached end'); }
  await wait(page, 1500); await shot(page, 'c5-3end'); await overflow(page, 'c5-3');
  // 다시 보기
  await tapEl(page, '#sunReplay'); await wait(page, 600);
  if ((await page.evaluate(() => window.__c5sun.state)) === 'end') bad('TOUCH FAIL: c5 replay');
  await shot(page, 'c5-4replay');
  // 연작 보기
  await press(page, '#toSeries', '#wall:not([hidden])', 'c5 연작 보기');
  await page.waitForFunction(() => window.__c5 && [...document.querySelectorAll('#strip img')].every((i) => i.complete), null, { timeout: 60000 }); await wait(page, 1500);
  await shot(page, 'c5-5wall');
  await press(page, '.motif[data-k="haystacks"]', '#view:not([hidden])', 'c5 open haystacks');
  await page.waitForFunction(() => window.__c5.ready, null, { timeout: 60000 }); await wait(page, 900);
  await shot(page, 'c5-6view'); await overflow(page, 'c5-6');
  await page.evaluate(() => window.__c5.setT(1.5)); await wait(page, 400); await shot(page, 'c5-7mid');
  await press(page, '#keep', '#kept:not([hidden])', 'c5 keep'); await wait(page, 700); await shot(page, 'c5-8kept');
  await press(page, '#viewClose', '#wallLine:not([hidden])', 'c5 close'); await wait(page, 2200); await shot(page, 'c5-9closed');
  await page.evaluate(() => window.scrollTo(0, 0)); await wait(page, 500); await tapEl(page, '#toSeries'); await wait(page, 900); if (!(await page.evaluate(() => document.querySelector('#wall').hidden))) bad('c5: series did not collapse');
  await shot(page, 'c5-10collapsed');
  await shot(page, 'c5-11full', true);
}

// ── 출구
async function exitPage(page, file, name, opts = {}) {
  if (opts.store) await page.addInitScript((s) => { try { localStorage.setItem('m100_choice', JSON.stringify(s)); } catch (e) {} }, opts.store);
  await page.goto(BASE + file, { waitUntil: 'networkidle' }); await fonts(page); await wait(page, 1500);
  await overflow(page, name);
  const root = await page.evaluate(() => { const d = document.querySelector('#deck'); return d && getComputedStyle(d).overflowY !== 'visible' && d.scrollHeight > d.clientHeight + 4 ? '#deck' : null; });
  if (opts.flow) await opts.flow(page, name);
  else await scrollShots(page, name, { root });
  // 공유
  const shareSel = await page.evaluate(() => (document.querySelector('#share') ? '#share' : null));
  if (shareSel) {
    await tapEl(page, shareSel);
    try { await page.locator('.xs-ov:not([hidden]) img, #shareOv:not([hidden]) img').first().waitFor({ state: 'visible', timeout: 12000 }); } catch (e) { bad(`${name}: share preview did not open`); }
    await wait(page, 900); await shot(page, `${name}-share`);
    const src = await page.evaluate(() => { const i = document.querySelector('.xs-ov:not([hidden]) img, #shareOv:not([hidden]) img'); return i && i.src; });
    if (src && src.startsWith('data:')) writeFileSync(path.join(OUT, `${name}-share-img${sfx}.png`), Buffer.from(src.split(',')[1], 'base64'));
    const closeSel = await page.evaluate(() => (document.querySelector('.xs-ov:not([hidden]) [data-x]') ? '.xs-ov:not([hidden]) [data-x]' : document.querySelector('#shareClose') ? '#shareClose' : null));
    if (closeSel) { await tapEl(page, closeSel); await wait(page, 600); const open = await page.evaluate(() => !!document.querySelector('.xs-ov:not([hidden]), #shareOv:not([hidden])')); if (open) bad(`${name}: share close failed`); }
  }
}
async function exitD(page, name) {
  for (let i = 0; i < 8; i++) {
    await shot(page, `${name}-s${String(i).padStart(2, '0')}`);
    const has = await page.evaluate(() => { const b = document.querySelector('#next'); return b && b.offsetParent ? b.textContent : null; });
    if (!has) break;
    await wait(page, 2200); await shot(page, `${name}-s${String(i).padStart(2, '0')}b`);
    await tapEl(page, '#next'); await wait(page, 2400);
  }
}
async function exitB(page, name) {
  for (let i = 0; i < 8; i++) {
    await shot(page, `${name}-s${String(i).padStart(2, '0')}`);
    const dk = await page.evaluate(() => { const d = document.querySelector('#deck') || document.scrollingElement; const b = d.scrollTop; d.scrollBy({ top: innerHeight, behavior: 'smooth' }); return b + d.clientHeight >= d.scrollHeight - 2; });
    await wait(page, 1800); if (dk) break;
  }
}

async function index(page) {
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle' }); await fonts(page); await wait(page, 600);
  await shot(page, 'index-0'); await shot(page, 'index-full', true); await overflow(page, 'index');
}

const RUN = {
  c3, c5, index,
  'exit-e': (p) => exitPage(p, 'exit-e.html', 'exitE'),
  'exit-e2': (p) => exitPage(p, 'exit-e.html', 'exitE2', { store: { c1: { stance: 'jury' }, c4: { stance: 'paint' }, c0: { n: 5 } } }),
  exit: (p) => exitPage(p, 'exit.html', 'exitA'),
  'exit-b': (p) => exitPage(p, 'exit-b.html', 'exitB', { flow: exitB }),
  'exit-c': (p) => exitPage(p, 'exit-c.html', 'exitC'),
  'exit-d': (p) => exitPage(p, 'exit-d.html', 'exitD', { flow: exitD }),
};
const list = which === 'all' ? Object.keys(RUN) : which.split(',');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
for (const k of list) {
  console.log(`== ${k} ${VW}x${VH}`);
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  const page = await ctx.newPage(); cdp = null;
  page.on('console', (m) => { if (m.type() === 'error') bad(`${k} console: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => bad(`${k} pageerror: ${e.message.slice(0, 200)}`));
  try { await RUN[k](page); } catch (e) { bad(`${k} crashed: ${e.message.split('\n')[0]}`); }
  await ctx.close();
}
await browser.close();
console.log(problems.length ? `\n${problems.length} problem(s):\n - ` + problems.join('\n - ') : '\nclean');
