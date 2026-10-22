// C4 품질 점검 — 헤드리스 Chromium · CDP 터치 · localhost:8820 (kippu-site 에서 python3 -m http.server 8820 --bind 127.0.0.1)
// 실행: node qa.mjs <round> [390x844,375x667,430x932] [rm]
//   모든 상태(움직이는 중간 포함)를 shots/<round>/<w>-<nn>-<name>.png 로 남기고, 콘솔 오류 · 가로 넘침 · 화면 안 중복 인물 · 단추 가림 · 홈 표시줄 겹침을 요약한다.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire('/Users/hare/Documents/monet/kippu-app/scripts/store-capture/package.json');
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL = 'http://127.0.0.1:8820/design/experience-v2/proto/c4.html';
const round = process.argv[2] || 'r0';
const sizes = (process.argv[3] || '390x844,375x667,430x932').split(',').map((s) => s.split('x').map(Number));
const RM = process.argv[4] === 'rm';
const OUT = path.join(HERE, 'shots', round); mkdirSync(OUT, { recursive: true });
const problems = [];

async function run([VW, VH]) {
  const tag = `${VW}${RM ? '-rm' : ''}`;
  const bad = (m) => { problems.push(`[${tag}] ${m}`); console.log('   !', m); };
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR', timezoneId: 'Asia/Seoul', reducedMotion: RM ? 'reduce' : 'no-preference', acceptDownloads: true });
  await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = ':root{--safe-b:34px !important;--safe-t:0px !important}'; document.head.appendChild(st); }); });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => bad('[pageerror] ' + e.message));
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/GL Driver|ReadPixels|software WebGL/.test(m.text())) bad(`[console ${m.type()}] ${m.text().slice(0, 200)}`); });
  page.on('requestfailed', (r) => bad('[requestfailed] ' + r.url()));
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const tap = async (x, y) => { await touch('touchStart', [{ x, y }]); await page.waitForTimeout(40); await touch('touchEnd', []); };
  let n = 0;
  const shot = async (name) => { n++; await page.screenshot({ path: path.join(OUT, `${tag}-${String(n).padStart(2, '0')}-${name}.png`) }); };
  const W = (ms) => page.waitForTimeout(ms);
  const tapSel = async (sel, label) => {
    let b = await page.locator(sel).first().boundingBox(); if (!b) { bad(`missing ${label || sel}`); return; }
    if (b.y + b.height > VH && await page.evaluate(() => document.querySelector('#me') && !document.querySelector('#me').hidden)) { await page.locator(sel).first().scrollIntoViewIfNeeded(); await W(250); b = await page.locator(sel).first().boundingBox(); }
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    const hit = await page.evaluate(([x, y, q]) => { const e = document.elementFromPoint(x, y), t = document.querySelector(q); return !!(e && t && (e === t || t.contains(e))); }, [x, y, sel]);
    if (!hit) bad(`covered: ${label || sel}`);
    if (b.y + b.height > VH - 40) bad(`home-indicator overlap: ${label || sel} bottom ${Math.round(b.y + b.height)}`);
    await tap(x, y);
  };
  const overflow = async (where) => { const o = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]); if (o[0] > o[1]) bad(`h-overflow ${where} ${o}`); };
  const dupCheck = async (where) => {
    const d = await page.evaluate(() => { const r = document.querySelector('#halves').getBoundingClientRect(); return ['#hangPaint', '#hangPhoto'].map((q) => { const ids = [...document.querySelectorAll(q + ' .fr')].filter((f) => { const b = f.getBoundingClientRect(); return b.bottom > r.top && b.top < r.bottom; }).map((f) => f.dataset.id); return ids.length - new Set(ids).size; }); });
    if (d.some((x) => x)) bad(`duplicate in view ${where} ${d}`);
  };

  await page.goto(URL); await W(250); await shot('load-0.25s');
  await page.waitForFunction(() => window.__c4 && window.__c4.people > 0 && [...document.querySelectorAll('.fr img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30000 }).catch(() => bad('images not loaded'));
  await page.evaluate(() => document.fonts.ready);
  await W(600); await shot('load-settled'); await overflow('load'); await dupCheck('load');
  // 질문이 화면을 이끄는가: 제목 크기 · 자리
  const q = await page.evaluate(() => { const h = document.querySelector('.q-ask h1'); const b = h.getBoundingClientRect(); return { fs: parseFloat(getComputedStyle(h).fontSize), top: b.top, bottom: b.bottom }; });
  console.log('   question', JSON.stringify(q));
  // 흐름 속도(px/s) 실측
  const sp = await page.evaluate(async () => { const y = () => [...document.querySelectorAll('#hangPaint, #hangPhoto')].map((t) => new DOMMatrix(getComputedStyle(t).transform).m42); const a = y(); await new Promise((r) => setTimeout(r, 2000)); const b = y(); return a.map((v, i) => ((b[i] - v) / 2).toFixed(1)); });
  console.log('   drift px/s', sp.join(' / '));
  await W(1500); await dupCheck('drift');
  // 같은 사람이 함께 빛나는 순간: 시작 직후 · 가운데 · 끝 무렵
  await page.waitForFunction(() => window.__c4.lit === 0, null, { timeout: 8000 }).catch(() => {});
  const lit = await page.waitForFunction(() => window.__c4.lit >= 2, null, { timeout: 12000 }).then(() => true).catch(() => { bad('no pair glow within 12s'); return false; });
  if (lit) { await W(120); await shot('glow-start'); await W(500); await shot('glow-mid'); await W(1700); await shot('glow-end'); }
  // 액자 하나 → 시트(열리는 중 · 열림 · 큰 판) → 두 손가락 확대 → 이동 → 두 번 눌러 원래대로 → 닫기
  const fc = await page.evaluate(() => { const r = document.querySelector('#halves').getBoundingClientRect(); const f = [...document.querySelectorAll('#hangPaint .fr')].map((e) => e.getBoundingClientRect()).find((b) => b.top > r.top + 20 && b.bottom < r.bottom - 140); return f && { x: f.left + f.width / 2, y: f.top + f.height / 2 }; });
  if (fc) { await tap(fc.x, fc.y); await W(120); await shot('sheet-opening'); }
  await page.waitForFunction(() => window.__c4.sheet, null, { timeout: 3000 }).catch(() => bad('sheet did not open'));
  await W(900); await shot('sheet-open'); await overflow('sheet');
  const sb = await page.locator('#pairSheet').boundingBox(); if (sb && sb.y < 40) bad('sheet too tall ' + sb.y);
  const zb = await page.locator('figure[data-k="paint"] .ps-img').boundingBox({ timeout: 3000 }).catch(() => null);
  if (zb) {
    const cx = zb.x + zb.width / 2, cy = zb.y + zb.height / 2;
    await touch('touchStart', [{ x: cx - 20, y: cy, id: 1 }, { x: cx + 20, y: cy, id: 2 }]);
    for (let i = 1; i <= 12; i++) { await touch('touchMove', [{ x: cx - 20 - 4 * i, y: cy - 2 * i, id: 1 }, { x: cx + 20 + 4 * i, y: cy + 2 * i, id: 2 }]); await W(25); }
    await touch('touchEnd', []); await W(200); await shot('sheet-zoomed');
    const z = await page.evaluate(() => window.__c4.zoom); if (!(z > 1.5)) bad('pinch zoom ' + z);
    await touch('touchStart', [{ x: cx, y: cy, id: 3 }]); for (let i = 1; i <= 8; i++) { await touch('touchMove', [{ x: cx + 8 * i, y: cy + 5 * i, id: 3 }]); await W(25); } await touch('touchEnd', []);
    await W(150); await shot('sheet-panned');
    await tap(cx, cy); await W(120); await tap(cx, cy); await W(300);
    const z2 = await page.evaluate(() => window.__c4.zoom); if (z2 !== 1) bad('double-tap did not reset zoom ' + z2);
  }
  await tapSel('#psClose', 'sheet close'); await W(150); await shot('sheet-closing');
  await page.waitForFunction(() => !window.__c4.sheet, null, { timeout: 3000 }).catch(() => bad('sheet did not close'));
  await W(600); await shot('after-close');
  if (!RM && !(await page.evaluate(() => window.__c4.flowing))) bad('drift did not resume after sheet');
  // 사진 쪽 고르기: 전환 중간 · 공개 중간 · 점이 모인 뒤 · 아래까지
  await tapSel('.pick[data-k="photo"]', 'pick photo'); await W(300); await shot('pick-mid');
  await W(700); await shot('reveal-rising');
  await W(2300); await shot('reveal-settled'); await overflow('reveal');
  await page.evaluate(() => { const r = document.querySelector('#rvScroll'); r.scrollTop = r.scrollHeight; }); await W(300); await shot('reveal-bottom');
  await tapSel('#saveStance', 'save');
  await page.waitForFunction(() => window.__c4.card, null, { timeout: 8000 }).catch(() => bad('card not made'));
  await W(400); await shot('saved');
  const card = await page.evaluate(() => window.__c4.cardURL && window.__c4.cardURL());
  if (card) writeFileSync(path.join(OUT, `${tag}-card.jpg`), Buffer.from(card.split(',')[1], 'base64'));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('m100_choice') || '{}').c4);
  if (!saved || saved.stance !== 'photo') bad('stance not saved');
  // 다시 고르기 → 그림 쪽
  await page.evaluate(() => { document.querySelector('#rvScroll').scrollTop = 0; });
  await tapSel('#again', 'again'); await W(900); await shot('again');
  if (await page.evaluate(() => window.__c4.stance)) bad('again did not reset');
  await tapSel('.pick[data-k="paint"]', 'pick paint'); await W(3200); await shot('reveal-paint');
  await tapSel('#saveStance', 'save paint'); await page.waitForFunction(() => window.__c4.card, null, { timeout: 8000 }).catch(() => bad('paint card not made'));
  await W(400); await shot('saved-paint');
  const card2 = await page.evaluate(() => window.__c4.cardURL && window.__c4.cardURL());
  if (card2) writeFileSync(path.join(OUT, `${tag}-card-paint.jpg`), Buffer.from(card2.split(',')[1], 'base64'));
  // 내 초상
  await page.evaluate(() => { document.querySelector('#rvScroll').scrollTop = 0; window.scrollTo(0, 0); });
  await tapSel('.tab[data-tab="me"]', 'tab me'); await W(500); await shot('me-1'); await overflow('me');
  await tapSel('#camDemo', 'demo'); await W(600); await shot('me-2');
  await tapSel('#shoot', 'shoot'); await W(1500); await shot('me-count');
  await page.waitForFunction(() => !document.querySelector('#meDone').hidden, null, { timeout: 30000 }).catch(() => bad('me develop'));
  await W(500); await shot('me-done');
  await tapSel('.tab[data-tab="ask"]', 'tab ask'); await W(700); await shot('back-to-ask');
  await browser.close();
}
for (const s of sizes) { console.log('▶', s.join('x'), RM ? 'reduced' : ''); try { await run(s); } catch (e) { problems.push(`${s} crashed: ${e.message.split('\n')[0]}`); } }
console.log(problems.length ? `${problems.length} problem(s)` : 'clean'); problems.forEach((p) => console.log('  -', p));
