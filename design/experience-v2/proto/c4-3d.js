// C4 나다르 사진관 — three.js(0.147) 장면 둘: 밤의 거리(들어가기) · 사진관 안(35, boulevard des Capucines, 1860년대 초).
//
// ── 고증 근거(무엇을 어디서) ───────────────────────────────────────────────────────────
//  거리: 나다르가 직접 찍은 35, boulevard des Capucines 정면 사진(퍼블릭 도메인, img/c4n/build.py 에 출처)을 밤으로 옮긴 판.
//  사진관 안 — 나다르 아틀리에 실내 사진 세 장(BnF, c.1861; expositions.bnf.fr/les-nadar/grand_en/nad_088 · nad_089 · nad_311)
//   · 나무 판벽과 두 짝 문(아래 긴 판 · 가운데 짧은 판 · 위 넓은 판)            ← nad_088 · nad_089
//   · 문 위쪽 판에 걸린 작은 금박 액자의 유화들(한 짝에 셋씩 세로로)           ← nad_088 · nad_089  → 초상 12점이 여기
//   · 오래된 타일 난로(흰 유약 타일 7줄 격자 · 메달 · 벽감 · 둘째 줄 통풍 창살 · 받침 · 위의 육각 탑과 톱니)  ← nad_088 · nad_089
//   · 난로 양옆 조각된 나무 콘솔(위에 천사 머리, 아래로 늘어진 과일 · 잎 장식)   ← nad_088 · nad_089
//   · 난로 위 그릇 넷, 탑 양옆 벽 선반 위 키 큰 그릇(사진에서 어두움 — 재질 미확정, 어두운 청동빛으로 = '청동 몇 점'),
//     벽의 도자기 접시들(문 위 한 줄 · 난로 옆 세로 셋)  ← nad_088
//   · 위의 들보 앞면(가로 몰딩 띠)에 접시가 한 줄, 그 위로 유리 지붕 · 유리창(낮빛)  ← nad_088 · nad_089 · nad_311
//   · 기하 무늬 바닥(재질 — 타일인지 깔개인지 — 은 사진으로 확정 못 함, 무늬만)    ← nad_088 · nad_089
//   · 모서리 벽: 얇은 어두운 리플(물결 골) 몰딩 액자 + 흰 매트, 한 매트에 작은 그림 여럿을 나란히,
//     가로 매트 액자들을 거의 맞붙여 격자로 쌓음(카리커처 · 소묘)              ← nad_311  → 초상 12점이 여기
//   · 색: 1876년 라캉(Lacan)의 기록(2차 인용) — 건물 안팎을 입구부터 유리 지붕까지 붉게 칠함 → 판벽 · 문 · 벽을 붉은 갈색 칠로.
//     (다마스크 천은 기록에 없음 → 쓰지 않음)
//  기록이 말하지 않는 것(중립으로만 채움, 꾸미지 않음):
//   · 세 장면(모서리 · 문 · 난로)의 실제 위치 관계 — 한 벽에 나란히 이어 붙였다. 양 끝은 장식 없는 판벽.
//   · 도자기 · 타일의 색(사진이 흑백) — 크림색 유약 + 갈회색 무늬 하나로만. 타일 메달 · 벽감 속 인물은 형태만(얼굴 · 성인상은 새로 그리지 않음).
//   · 나다르 판테온(Panthéon Nadar) 판화 — nad_311 모서리 맨 위에 있지만 이 기기에 실을 판본이 없어 그 자리는 비워 둔다.
//   · 콘솔 위 나무 성인상 · 선반 위 작은 조상 · 청동 샹들리에 · 의자 · 장의자 · 탁자 · 음악 상자 · 시계 · 사진기 — 기록에 있으나 생략
//     (형태를 지어내 조잡해지느니 비운다. 초상을 더 걸 가구도 만들지 않는다).
//   · 그림 자리에 거는 것은 24명의 초상(유화). 매트 안의 그림도 원래는 카리커처 · 소묘였으나, 여기서는 같은 사람의 초상화를 그대로 넣는다.
//   · 사진으로 바뀌면: 나다르의 명함판(카드에 붙인 알부민 인화) 모양 — 문 액자는 크림색 대지(아래 스튜디오 이름, 기록된 곳만),
//     매트 안은 대지 테두리만 좁게.
//  빼 버린 것(기록에 없음 · 다른 건물인 rue d'Anjou 살롱 c.1910 에서 온 것): 살롱식 사진 벽 · 타원 액자 · 이젤 · 붉은 다마스크 ·
//     그림 레일과 걸개줄 · 조개 장식 모서리 액자 · 찬장 · 가스 벽등.
// ────────────────────────────────────────────────────────────────────────────────
// 바꾸기: 그림을 누르면(레이캐스트) 앞에서 마그네슘 섬광 · 연기가 피고, 그 판이 종이에서부터 현상된다(어두운 곳 먼저, 호박빛 → 맑게).
//   되돌리면 니스 빛이 대각선으로 쓸며 그림이 돌아온다. 메시는 움직이지 않는다(셰이더 색만).
// 낮의 사진관: 빛은 위의 유리 지붕에서(흰 낮빛), 가스등은 없다.
import * as T from 'three';
import { mergeBufferGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eo = (t) => 1 - Math.pow(1 - t, 3);
const ei = (t) => t * t * t;
const C = (h) => new T.Color(h).convertSRGBToLinear();
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const loadImg = (src) => new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

export async function createNadar({ canvas, reduced = false, people, thumb, studioOf = () => '', onTap = () => {}, onDragStart = () => {} }) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  renderer.setPixelRatio(DPR);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const tex = (c, srgb = true, rep = false) => { const t = new T.CanvasTexture(c); t.encoding = srgb ? T.sRGBEncoding : T.LinearEncoding; t.anisotropy = ANISO; if (rep) t.wrapS = t.wrapT = T.RepeatWrapping; return t; };
  const R = rng(1861);
  const ctx2 = (c) => c.getContext('2d', { willReadFrequently: true });

  // ───────────────────────── 텍스처(모두 기기 안에서 그린다)
  // 높이 → 노멀(접선 공간). 캔버스 y 는 아래로, 텍스처 v 는 위로
  function normalFrom(src, k, wrap = true) {
    const w = src.width, h = src.height, d = ctx2(src).getImageData(0, 0, w, h).data;
    const out = cnv(w, h), og = out.getContext('2d'), od = og.createImageData(w, h), o = od.data;
    const H = (x, y) => d[(clamp(y, 0, h - 1) * w + (wrap ? (x + w) % w : clamp(x, 0, w - 1))) * 4];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = -(H(x + 1, y) - H(x - 1, y)) / 255 * k, ny = (H(x, y + 1) - H(x, y - 1)) / 255 * k, l = Math.hypot(nx, ny, 1), i = (y * w + x) * 4;
      o[i] = (nx / l * 0.5 + 0.5) * 255; o[i + 1] = (ny / l * 0.5 + 0.5) * 255; o[i + 2] = (1 / l * 0.5 + 0.5) * 255; o[i + 3] = 255;
    }
    og.putImageData(od, 0, 0); return out;
  }
  function dome(g, x, y, rx, ry, rot = 0, top = 250, edge = 120) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(rx, ry);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1), v = (t) => { const c = Math.round(lerp(edge, top, t)); return `rgb(${c},${c},${c})`; };
    gr.addColorStop(0, v(1)); gr.addColorStop(0.45, v(0.9)); gr.addColorStop(0.75, v(0.62)); gr.addColorStop(1, v(0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, 6.2832); g.fill(); g.restore();
  }
  // 몰딩 무늬 띠(띠마다 64px): 0 구슬 · 1 – · 2 – · 3 – · 4 갈대(세로 골) · 5 민무늬 · 6 – · 7 가로 골(리플 몰딩)
  const NB = 8, BH = 64, AW = 1024;
  const ornH = (() => {
    const c = cnv(AW, BH * NB), g = ctx2(c);
    g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, AW, BH * NB);
    const band = (k, bg, fn) => { g.save(); g.beginPath(); g.rect(0, k * BH, AW, BH); g.clip(); g.translate(0, k * BH); g.fillStyle = `rgb(${bg},${bg},${bg})`; g.fillRect(0, 0, AW, BH); fn(); g.restore(); };
    band(0, 96, () => { for (let x = 16; x < AW + 32; x += 32) dome(g, x, 32, 14, 15); });
    band(4, 110, () => { for (let k = 0; k < 4; k++) { const y = 8 + k * 16, gr = g.createLinearGradient(0, y - 8, 0, y + 8); gr.addColorStop(0, 'rgb(95,95,95)'); gr.addColorStop(0.5, 'rgb(235,235,235)'); gr.addColorStop(1, 'rgb(95,95,95)'); g.fillStyle = gr; g.fillRect(0, y - 8, AW, 16); } });
    band(5, 128, () => { const r2 = rng(5); for (let i = 0; i < 2600; i++) { const v = 118 + r2() * 22 | 0; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(r2() * AW, r2() * BH, 1 + r2() * 5, 1 + r2() * 2); } });
    // 리플 몰딩: 몰딩을 가로지르는 촘촘한 골이 살짝 물결친다(nad_311 의 검은 액자)
    band(7, 90, () => { for (let x = -16; x < AW + 16; x += 8) { g.save(); g.translate(x, 0); g.beginPath(); for (let y = 0; y <= BH; y += 4) { const dx = Math.sin(y / BH * Math.PI * 2) * 2.2; y ? g.lineTo(dx, y) : g.moveTo(dx, y); } g.lineWidth = 4; g.strokeStyle = 'rgb(230,230,230)'; g.stroke(); g.restore(); } });
    return c;
  })();
  const ornN = tex(normalFrom(ornH, 6), false); ornN.wrapS = T.RepeatWrapping;
  // 금박의 색(파인 곳엔 때), 거칠기(솟은 곳은 닳아 반들반들)
  const [ornCol, ornRough] = (() => {
    const w = AW, h = BH * NB, d = ctx2(ornH).getImageData(0, 0, w, h).data;
    const cc = cnv(w, h), rc = cnv(w, h), cg = cc.getContext('2d'), rg = rc.getContext('2d'), ci = cg.createImageData(w, h), ri = rg.createImageData(w, h), r2 = rng(9);
    for (let i = 0; i < w * h; i++) {
      const v = d[i * 4] / 255, n = r2(), t = sstep(0.32, 0.8, v);
      ci.data[i * 4] = lerp(150, 255, t) * (0.96 + n * 0.04); ci.data[i * 4 + 1] = lerp(108, 244, t) * (0.95 + n * 0.05); ci.data[i * 4 + 2] = lerp(62, 214, t); ci.data[i * 4 + 3] = 255;
      const r = clamp(0.58 - t * 0.36 + (n - 0.5) * 0.12, 0.14, 0.9) * 255; ri.data[i * 4] = ri.data[i * 4 + 1] = ri.data[i * 4 + 2] = r; ri.data[i * 4 + 3] = 255;
    }
    cg.putImageData(ci, 0, 0); rg.putImageData(ri, 0, 0);
    const a = tex(cc, true), b = tex(rc, false); a.wrapS = b.wrapS = T.RepeatWrapping; return [a, b];
  })();
  // 붉은 칠(라캉 1876: 안팎을 붉게) — 칠 밑으로 나뭇결 · 붓자국이 아주 옅게
  const paintT = (() => {
    const S = 512, c = cnv(S, S), g = c.getContext('2d'), r2 = rng(31);
    g.fillStyle = '#62261d'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 90; i++) { const x = r2() * S, w = 1 + r2() * 4; g.fillStyle = `rgba(${r2() < 0.55 ? '40,8,4' : '150,70,55'},${0.006 + r2() * 0.012})`; g.fillRect(x, 0, w, S); }
    for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(${r2() < 0.5 ? '30,6,3' : '170,86,66'},${r2() * 0.05})`; g.fillRect(r2() * S, r2() * S, 1, 1 + r2() * 7); }
    return tex(c, true, true);
  })();
  // 바닥: nad_088 · 089 의 기하 무늬(네모 칸 · 마름모 넷이 만드는 십자 · 가운데 작은 네모). 색은 기록이 없어 무채 갈색 셋
  const floorT = (() => {
    const S = 512, c = cnv(S, S), g = c.getContext('2d'), r2 = rng(44), n = 4, s = S / n;
    g.fillStyle = '#6d5b4a'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = i * s, y = j * s, cx = x + s / 2, cy = y + s / 2;
      g.fillStyle = '#5a4a3c'; g.fillRect(x + 3, y + 3, s - 6, s - 6);
      g.fillStyle = '#a8957c';
      for (let k = 0; k < 4; k++) { g.save(); g.translate(cx, cy); g.rotate(k * Math.PI / 2); g.beginPath(); g.moveTo(0, -s * 0.06); g.lineTo(s * 0.09, -s * 0.24); g.lineTo(0, -s * 0.44); g.lineTo(-s * 0.09, -s * 0.24); g.closePath(); g.fill(); g.restore(); }
      g.fillStyle = '#8c7a64'; g.fillRect(cx - s * 0.06, cy - s * 0.06, s * 0.12, s * 0.12);
      for (const [ax, ay] of [[x, y], [x + s, y], [x, y + s], [x + s, y + s]]) { g.fillStyle = '#9a876e'; g.beginPath(); g.moveTo(ax, ay - s * 0.12); g.lineTo(ax + s * 0.12, ay); g.lineTo(ax, ay + s * 0.12); g.lineTo(ax - s * 0.12, ay); g.closePath(); g.fill(); }
    }
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r2() < 0.5 ? '20,12,6' : '200,180,150'},${r2() * 0.06})`; g.fillRect(r2() * S, r2() * S, 1 + r2() * 2, 1 + r2() * 2); }
    return tex(c, true, true);
  })();
  // 유약 타일(난로): 높이 그림 → 노멀 · 색. 메달 · 벽감은 형태만(얼굴 · 인물은 그리지 않는다)
  function tileSheet(W, H, cols, rows, typeAt, bands = 0) {
    const h = cnv(W, H), g = ctx2(h);
    g.fillStyle = 'rgb(60,60,60)'; g.fillRect(0, 0, W, H);
    const tb = bands * H, rh = (H - 2 * tb) / rows;
    for (const yb of bands ? [0, H - tb] : []) { const gr = g.createLinearGradient(0, yb, 0, yb + tb); gr.addColorStop(0, 'rgb(110,110,110)'); gr.addColorStop(0.35, 'rgb(225,225,225)'); gr.addColorStop(0.6, 'rgb(160,160,160)'); gr.addColorStop(1, 'rgb(100,100,100)'); g.fillStyle = gr; g.fillRect(0, yb, W, tb); }
    let x = 0;
    cols.forEach((cw, ci) => {
      const w = cw * W;
      for (let r = 0; r < rows; r++) {
        const y = tb + r * rh, X = x + 2, Y = y + 2, w2 = w - 4, h2 = rh - 4, type = typeAt(ci, r);
        g.fillStyle = 'rgb(150,150,150)'; g.fillRect(X, Y, w2, h2);
        const gr = g.createLinearGradient(X, Y, X + w2 * 0.2, Y + h2 * 0.2); gr.addColorStop(0, 'rgb(205,205,205)'); gr.addColorStop(1, 'rgb(180,180,180)'); g.fillStyle = gr; g.fillRect(X + 4, Y + 4, w2 - 8, h2 - 8);
        const cx = X + w2 / 2, cy = Y + h2 / 2, m = Math.min(w2, h2);
        if (type === 'roundel') {
          dome(g, cx, cy, m * 0.43, m * 0.43, 0, 235, 150); g.fillStyle = 'rgb(130,130,130)'; g.beginPath(); g.arc(cx, cy, m * 0.33, 0, 6.2832); g.fill(); dome(g, cx, cy, m * 0.28, m * 0.28, 0, 215, 140);
        } else if (type === 'niche') {
          const nw = w2 * 0.56, nh = h2 * 0.8, nx = cx - nw / 2, ny = cy - nh / 2;
          g.fillStyle = 'rgb(105,105,105)'; g.beginPath(); g.moveTo(nx, ny + nh); g.lineTo(nx, ny + nw / 2); g.arc(cx, ny + nw / 2, nw / 2, Math.PI, 0); g.lineTo(nx + nw, ny + nh); g.closePath(); g.fill();
          dome(g, cx, cy + nh * 0.12, nw * 0.24, nh * 0.34, 0, 225, 120); dome(g, cx, cy - nh * 0.26, nw * 0.13, nw * 0.13, 0, 225, 120);
        } else if (type === 'grille') {
          g.fillStyle = 'rgb(35,35,35)'; g.fillRect(X + w2 * 0.16, Y + h2 * 0.16, w2 * 0.68, h2 * 0.68);
          for (let k = 0; k < 6; k++) dome(g, X + w2 * (0.22 + k * 0.112), cy, w2 * 0.022, h2 * 0.32, 0, 215, 90);
        }
      }
      x += w;
    });
    return h;
  }
  function glazeFrom(hc) {   // 높이 → 크림색 유약(파인 곳은 조금 짙게)
    const w = hc.width, h = hc.height, d = ctx2(hc).getImageData(0, 0, w, h).data, c = cnv(w, h), g = c.getContext('2d'), im = g.createImageData(w, h), r2 = rng(17);
    for (let i = 0; i < w * h; i++) {
      const v = d[i * 4] / 255, t = sstep(0.18, 0.75, v), n = r2() * 0.03;
      im.data[i * 4] = lerp(112, 222, t) * (0.98 + n); im.data[i * 4 + 1] = lerp(102, 213, t) * (0.98 + n); im.data[i * 4 + 2] = lerp(86, 192, t) * (0.98 + n); im.data[i * 4 + 3] = 255;
    }
    g.putImageData(im, 0, 0); return c;
  }
  // 난로 앞면(nad_088): 좁은 기둥 · 넓은 다섯 · 좁은 기둥 / 여섯 줄, 둘째 줄의 1 · 3 · 5 칸은 통풍 창살, 나머지는 메달과 벽감이 엇갈린다
  const stoveFrontH = tileSheet(768, 744, [0.075, 0.17, 0.17, 0.17, 0.17, 0.17, 0.075], 7, (c, r) => (c === 0 || c === 6) ? 'niche' : (r === 1 && c % 2 === 1) ? 'grille' : ((r + c) % 2 ? 'roundel' : 'niche'), 0.035);
  const stoveSideH = tileSheet(384, 744, [0.5, 0.5], 6, () => 'plain', 0.035);
  const towerH = tileSheet(768, 384, [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6], 3, () => 'niche');
  const stoveTex = (hc, k) => [tex(glazeFrom(hc)), tex(normalFrom(hc, k, false), false)];
  const [sfC, sfN] = stoveTex(stoveFrontH, 9), [ssC, ssN] = stoveTex(stoveSideH, 7), [twC, twN] = stoveTex(towerH, 7);
  // 조각 콘솔(nad_088 의 난로 양옆): 위에 소용돌이 머리 · 천사 머리와 날개 · 아래로 늘어진 과일 · 잎 · 끝의 방울
  const carveN = (() => {
    const W = 128, H = 640, c = cnv(W, H), g = ctx2(c), r2 = rng(23);
    g.fillStyle = 'rgb(90,90,90)'; g.fillRect(0, 0, W, H);
    dome(g, W * 0.3, 40, 30, 26, 0, 230, 110); dome(g, W * 0.7, 40, 30, 26, 0, 230, 110); dome(g, W / 2, 30, 50, 12, 0, 200, 110);
    for (let k = 0; k < 9; k++) { const a = -0.2 + k * 0.17; for (const s of [-1, 1]) dome(g, W / 2 + s * (26 + k * 2.4), 128 - k * 4.5, 22, 5, s * a + (s < 0 ? Math.PI : 0), 210, 110); }
    dome(g, W / 2, 128, 26, 30, 0, 245, 120);
    for (let row = 0; row < 14; row++) { const y = 190 + row * 28, wd = lerp(46, 16, row / 13), n = row < 10 ? 3 : 2; for (let k = 0; k < n; k++) dome(g, W / 2 + (k - (n - 1) / 2) * wd * 0.8 + (r2() - 0.5) * 4, y + (r2() - 0.5) * 6, wd * 0.42, 15, 0, 238, 115); if (row % 3 === 0) for (const s of [-1, 1]) dome(g, W / 2 + s * wd * 1.05, y + 8, 18, 7, s * 0.9, 200, 100); }
    dome(g, W / 2, 610, 10, 22, 0, 230, 110);
    return tex(normalFrom(c, 5, false), false);
  })();
  // 도자기 접시(4가지): 0 테두리 띠 + 가운데 그림 자리 · 1 둘레 골(꽃잎 접시) · 2 민 접시에 가는 선 · 3 짙은 바탕에 밝은 테두리 점. 색은 중립(크림 · 갈회색)
  const plateT = (() => {
    const S = 256, c = cnv(S * 4, S), g = c.getContext('2d'), deco = '#7f6a50', deco2 = '#625a52';
    for (let k = 0; k < 4; k++) {
      const cx = k * S + S / 2, cy = S / 2, R0 = S / 2;
      g.fillStyle = k === 3 ? '#7a5e44' : '#ddd3bd'; g.fillRect(k * S, 0, S, S);
      const ring = (r, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.stroke(); };
      if (k === 0) { ring(R0 * 0.84, R0 * 0.2, 'rgba(110,88,62,.8)'); for (let i = 0; i < 24; i++) { const a = i / 24 * 6.2832; g.fillStyle = '#ece5d4'; g.beginPath(); g.ellipse(cx + Math.cos(a) * R0 * 0.84, cy + Math.sin(a) * R0 * 0.84, R0 * 0.06, R0 * 0.03, a, 0, 6.2832); g.fill(); } ring(R0 * 0.6, 3, deco); const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R0 * 0.55); gr.addColorStop(0, 'rgba(98,90,82,.35)'); gr.addColorStop(1, 'rgba(98,90,82,.12)'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R0 * 0.55, 0, 6.2832); g.fill(); }
      if (k === 1) { for (let i = 0; i < 16; i++) { const a = i / 16 * 6.2832; g.fillStyle = i % 2 ? 'rgba(110,88,62,.6)' : 'rgba(255,255,255,.15)'; g.beginPath(); g.moveTo(cx + Math.cos(a) * R0 * 0.5, cy + Math.sin(a) * R0 * 0.5); g.arc(cx, cy, R0, a, a + 6.2832 / 16); g.lineTo(cx + Math.cos(a + 6.2832 / 16) * R0 * 0.5, cy + Math.sin(a + 6.2832 / 16) * R0 * 0.5); g.fill(); } ring(R0 * 0.5, 3, deco); ring(R0 * 0.2, R0 * 0.12, 'rgba(98,90,82,.4)'); }
      if (k === 2) { ring(R0 * 0.9, 4, deco2); ring(R0 * 0.8, 3, deco2); ring(R0 * 0.5, 4, deco2); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832; g.fillStyle = 'rgba(98,90,82,.55)'; g.beginPath(); g.ellipse(cx + Math.cos(a) * R0 * 0.65, cy + Math.sin(a) * R0 * 0.65, R0 * 0.08, R0 * 0.035, a, 0, 6.2832); g.fill(); } }
      if (k === 3) { ring(R0 * 0.82, R0 * 0.16, 'rgba(236,229,212,.7)'); for (let i = 0; i < 30; i++) { const a = i / 30 * 6.2832; g.fillStyle = '#5a4430'; g.beginPath(); g.arc(cx + Math.cos(a) * R0 * 0.82, cy + Math.sin(a) * R0 * 0.82, R0 * 0.025, 0, 6.2832); g.fill(); } ring(R0 * 0.55, 2, '#d8cdb6'); }
    }
    return tex(c);
  })();
  // 그릇(난로 위 · 선반): 크림 유약에 갈회색 가로 띠만(사진이 흑백 — 무늬는 중립)
  const vaseT = (() => { const c = cnv(16, 256), g = c.getContext('2d'); g.fillStyle = '#cfc4ac'; g.fillRect(0, 0, 16, 256); for (const [y, h, a] of [[30, 10, 0.7], [46, 3, 0.6], [110, 50, 0.32], [170, 3, 0.6], [214, 8, 0.7]]) { g.fillStyle = `rgba(105,84,60,${a})`; g.fillRect(0, y, 16, h); } return tex(c); })();
  // 유리 지붕 · 유리창: 가는 쇠살, 낮빛
  const glassT = (() => { const c = cnv(256, 256), g = c.getContext('2d'); g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#4a3a32'; g.fillRect(0, 0, 5, 256); g.fillRect(128, 0, 3, 256); g.fillRect(0, 0, 256, 4); g.fillRect(0, 170, 256, 3); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(210,205,195,.35)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return tex(c, true, true); })();
  // 캔버스 올(그림 면) — 노멀맵의 반복값이 그림 판의 uv 를 바꾸므로 반복 없이 촘촘하게 그린다
  const weaveN = (() => { const c = cnv(512, 640), g = ctx2(c), r2 = rng(2); g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 640); for (let i = 0; i < 640; i += 4) { g.fillStyle = `rgba(255,255,255,${0.25 + r2() * 0.15})`; g.fillRect(0, i, 512, 2); } for (let i = 0; i < 512; i += 4) { g.fillStyle = `rgba(0,0,0,${0.18 + r2() * 0.12})`; g.fillRect(i, 0, 2, 640); } return tex(normalFrom(c, 1.2), false); })();
  // 부드러운 그림자 판 · 빛 번짐 · 연기
  const shadowT = (() => { const c = cnv(128, 128), g = c.getContext('2d'); g.shadowColor = 'rgba(0,0,0,1)'; g.shadowBlur = 14; g.shadowOffsetX = 400; g.fillStyle = '#000'; g.fillRect(-400 + 22, 22, 84, 84); return tex(c, false); })();
  const glowT = (() => { const c = cnv(128, 128), g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,.55)'); gr.addColorStop(0.45, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return tex(c, false); })();
  const puffT = (() => {
    const S = 128, c = cnv(S, S), g = c.getContext('2d'), r2 = rng(8);
    for (let i = 0; i < 16; i++) { const a = r2() * 6.28, d = r2() * S * 0.18, r = S * (0.16 + r2() * 0.14), x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.3)'); gr.addColorStop(0.6, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.28); g.fill(); }
    return tex(c, false);
  })();
  const beamT = (() => { const c = cnv(64, 256), g = c.getContext('2d'), gx = g.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gx; g.fillRect(0, 0, 64, 256); g.globalCompositeOperation = 'destination-in'; const gy = g.createLinearGradient(0, 0, 0, 256); gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.2, 'rgba(0,0,0,1)'); gy.addColorStop(0.8, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gy; g.fillRect(0, 0, 64, 256); return tex(c, false); })();
  const glowMat = (col, op) => new T.SpriteMaterial({ map: glowT, color: C(col), transparent: true, opacity: op, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });

  // ───────────────────────── 환경(반사): 붉은 방 · 위의 유리 지붕(흰 낮빛) · 앞쪽 큰 창
  const pmrem = new T.PMREMGenerator(renderer);
  const envTex = (() => {
    const s = new T.Scene(), basic = (c, k = 1, side = T.FrontSide) => new T.MeshBasicMaterial({ color: C(c).multiplyScalar(k), side });
    const room = new T.Mesh(new T.BoxGeometry(14, 6, 14), basic('#4a1c14', 1, T.BackSide)); room.position.set(0, 2.5, 2); s.add(room);
    const fl = new T.Mesh(new T.PlaneGeometry(14, 14), basic('#5e4c3c')); fl.rotation.x = -Math.PI / 2; fl.position.y = -0.45; s.add(fl);
    const roof = new T.Mesh(new T.PlaneGeometry(12, 6), basic('#f4f2ec', 2.6)); roof.rotation.x = Math.PI / 2; roof.position.set(0, 5.4, 2); s.add(roof);
    const win = new T.Mesh(new T.PlaneGeometry(8, 3), basic('#eef0f0', 1.3)); win.rotation.y = Math.PI; win.position.set(0, 2.6, 8.9); s.add(win);
    return pmrem.fromScene(s, 0.04).texture;
  })();

  // ───────────────────────── 재질
  const M = {
    paint: new T.MeshStandardMaterial({ color: C('#ffffff'), map: paintT, roughness: 0.6, metalness: 0, vertexColors: true, envMapIntensity: 0.45 }),
    paintDark: new T.MeshStandardMaterial({ color: C('#e0c8c0'), emissive: C('#2e100b'), map: paintT, roughness: 0.75, metalness: 0, envMapIntensity: 0.3 }),
    gilt: new T.MeshStandardMaterial({ color: C('#e6c477'), metalness: 1, roughness: 1, map: ornCol, roughnessMap: ornRough, normalMap: ornN, vertexColors: true, envMapIntensity: 1.15 }),
    ebon: new T.MeshStandardMaterial({ color: C('#1a1310'), metalness: 0.05, roughness: 0.38, normalMap: ornN, normalScale: new T.Vector2(1.4, 1.4), vertexColors: true, envMapIntensity: 0.9 }),
    mat: new T.MeshStandardMaterial({ color: C('#ece6d6'), roughness: 0.95, metalness: 0, envMapIntensity: 0.3 }),
    matCore: new T.MeshStandardMaterial({ color: C('#f6f1e4'), roughness: 0.9, metalness: 0, envMapIntensity: 0.3, vertexColors: true }),
    brass: new T.MeshStandardMaterial({ color: C('#c9a35a'), metalness: 1, roughness: 0.38, envMapIntensity: 1.1 }),
    bronze: new T.MeshStandardMaterial({ color: C('#7a5a34'), metalness: 1, roughness: 0.5, envMapIntensity: 1.0 }),
    iron: new T.MeshStandardMaterial({ color: C('#1b1716'), metalness: 0.7, roughness: 0.45 }),
    carved: new T.MeshStandardMaterial({ color: C('#3d281c'), roughness: 0.55, metalness: 0, normalMap: carveN, normalScale: new T.Vector2(1.6, 1.6), envMapIntensity: 0.6 }),
    wood: new T.MeshStandardMaterial({ color: C('#3a2419'), roughness: 0.6, metalness: 0, vertexColors: true, envMapIntensity: 0.5 }),
    stoveF: new T.MeshStandardMaterial({ color: C('#ddd4c4'), map: sfC, normalMap: sfN, roughness: 0.22, metalness: 0, envMapIntensity: 1.0 }),
    stoveS: new T.MeshStandardMaterial({ color: C('#ddd4c4'), map: ssC, normalMap: ssN, roughness: 0.22, metalness: 0, envMapIntensity: 1.0 }),
    stoveT: new T.MeshStandardMaterial({ color: C('#ddd4c4'), map: twC, normalMap: twN, roughness: 0.22, metalness: 0, envMapIntensity: 1.0 }),
    glaze: new T.MeshStandardMaterial({ color: C('#bdb29c'), roughness: 0.26, metalness: 0, vertexColors: true, envMapIntensity: 0.8 }),
    vase: new T.MeshStandardMaterial({ color: C('#d9d0c0'), map: vaseT, roughness: 0.26, metalness: 0, envMapIntensity: 0.8 }),
    plate: new T.MeshStandardMaterial({ map: plateT, color: C('#d8d0c0'), roughness: 0.3, metalness: 0, envMapIntensity: 0.75, side: T.DoubleSide }),
    floor: new T.MeshStandardMaterial({ map: floorT, roughness: 0.7, metalness: 0, envMapIntensity: 0.35 }),
    glass: new T.MeshBasicMaterial({ map: glassT, color: C('#ffffff').multiplyScalar(1.05), toneMapped: false }),
    shadow: new T.MeshBasicMaterial({ map: shadowT, color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }),
    hit: new T.MeshBasicMaterial({ visible: false }),
  };

  // ───────────────────────── 몰딩: 단면(d = 안쪽 턱에서 바깥으로 0..1, z = 높이 0..1)을 둘레를 따라 쓸어 낸다
  // 명령: {p:[d,z]} 점 · {a:[cx,cz,r,a0,a1,n]} 호(도) · b = 무늬 띠
  function prof(cmds) {
    const P = []; let b = 5;
    for (const c of cmds) {
      if (c.b !== undefined) b = c.b;
      if (c.p) P.push({ d: c.p[0], z: c.p[1], b });
      if (c.a) { const [cx, cz, r, a0, a1, n] = c.a; for (let i = 1; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; P.push({ d: cx + r * Math.cos(a), z: cz + r * Math.sin(a), b }); } }
    }
    return P;
  }
  const PROF = {
    // 문 위 유화의 작은 금박 액자(nad_088): 안쪽 구슬 · 낮은 경사면 · 바깥 둥근 턱(세로 골). 두 가지로 조금씩 다르게
    giltA: prof([{ p: [0, 0.3] }, { p: [0, 0.46] }, { b: 0, a: [0.07, 0.46, 0.07, 180, 0, 5] }, { b: 5, p: [0.16, 0.5] }, { p: [0.52, 0.66] }, { b: 4, a: [0.75, 0.66, 0.23, 180, 0, 8] }, { b: 5, p: [1, 0.0] }]),
    giltB: prof([{ p: [0, 0.3] }, { p: [0, 0.52] }, { b: 5, a: [0.24, 0.52, 0.24, 180, 90, 5] }, { p: [0.62, 0.8] }, { b: 0, a: [0.8, 0.8, 0.18, 180, 0, 6] }, { b: 5, p: [1, 0.0] }]),
    // 매트 액자(nad_311): 가는 어두운 리플 몰딩 — 둥근 낯 전체에 가로 골
    ripple: prof([{ p: [0, 0.4] }, { p: [0, 0.62] }, { b: 7, a: [0.5, 0.62, 0.5, 180, 0, 8] }, { b: 5, p: [1, 0.0] }]),
    // 판벽 · 문의 판 테두리(볼렉션)
    panel: prof([{ p: [0, 0] }, { p: [0.05, 0.5] }, { a: [0.35, 0.5, 0.3, 180, 90, 4] }, { p: [0.7, 0.8] }, { a: [0.85, 0.8, 0.15, 180, 0, 3] }, { p: [1, 0] }]),
    bevel: prof([{ p: [-1, -1] }, { p: [0, 0] }]),
  };
  const PERIOD = [0.024, 0.05, 0.1, 0.018, 0.4, 0.3, 0.036, 0.008];   // 띠마다 무늬 한 번의 길이(m)
  const rectPath = (hw, hh) => [
    [{ pos: (o) => [-(hw + o), hh + o], o: [0, 1], s: (o) => -(hw + o) }, { pos: (o) => [hw + o, hh + o], o: [0, 1], s: (o) => hw + o }],
    [{ pos: (o) => [hw + o, hh + o], o: [1, 0], s: (o) => -(hh + o) }, { pos: (o) => [hw + o, -(hh + o)], o: [1, 0], s: (o) => hh + o }],
    [{ pos: (o) => [hw + o, -(hh + o)], o: [0, -1], s: (o) => -(hw + o) }, { pos: (o) => [-(hw + o), -(hh + o)], o: [0, -1], s: (o) => hw + o }],
    [{ pos: (o) => [-(hw + o), -(hh + o)], o: [-1, 0], s: (o) => -(hh + o) }, { pos: (o) => [-(hw + o), hh + o], o: [-1, 0], s: (o) => hh + o }],
  ];
  function sweep(P, path, Mw, Dz) {
    const segs = []; for (let i = 1; i < P.length; i++) segs.push({ a: P[i - 1], b: P[i], band: P[i].b });
    const sn = segs.map((s) => { const dd = (s.b.d - s.a.d) * Mw, dz = (s.b.z - s.a.z) * Dz, l = Math.hypot(dd, dz) || 1; return [-dz / l, dd / l]; });
    const nrm = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }, dot = (a, b) => a[0] * b[0] + a[1] * b[1];
    const en = segs.map((s, i) => {
      let n0 = sn[i], n1 = sn[i];
      if (i > 0 && dot(sn[i - 1], sn[i]) > 0.7) n0 = nrm([sn[i - 1][0] + sn[i][0], sn[i - 1][1] + sn[i][1]]);
      if (i < segs.length - 1 && dot(sn[i], sn[i + 1]) > 0.7) n1 = nrm([sn[i][0] + sn[i + 1][0], sn[i][1] + sn[i + 1][1]]);
      return [n0, n1];
    });
    const vv = []; let i0 = 0;
    while (i0 < segs.length) {
      let i1 = i0; while (i1 + 1 < segs.length && segs[i1 + 1].band === segs[i0].band) i1++;
      const len = []; let tot = 0; for (let i = i0; i <= i1; i++) { const l = Math.hypot((segs[i].b.d - segs[i].a.d) * Mw, (segs[i].b.z - segs[i].a.z) * Dz); len.push(l); tot += l; }
      let acc = 0; for (let i = i0; i <= i1; i++) { const l = len[i - i0]; vv[i] = [acc / (tot || 1), (acc + l) / (tot || 1)]; acc += l; }
      i0 = i1 + 1;
    }
    const zs = P.map((p) => p.z), zmin = Math.min(...zs), zmax = Math.max(...zs);
    const o = { p: [], n: [], u: [], c: [], i: [] };
    for (const strip of path) for (let k = 0; k < segs.length; k++) {
      const s = segs[k], band = s.band, per = PERIOD[band];
      const vb = (t) => 1 - (band + 0.08 + 0.84 * t) / NB;
      const ao = (p, n2) => (0.55 + 0.45 * sstep(zmin, zmax, p.z)) * (n2[0] > 0.8 ? 0.75 : 1);
      for (let j = 0; j < strip.length - 1; j++) {
        const A = strip[j], B = strip[j + 1], base = o.p.length / 3;
        const put = (S, pp, n2, v) => {
          const off = pp.d * Mw, xy = S.pos(off), on = S.o;
          o.p.push(xy[0], xy[1], pp.z * Dz); o.n.push(on[0] * n2[0], on[1] * n2[0], n2[1]); o.u.push(S.s(off) / per, vb(v)); const a = ao(pp, n2); o.c.push(a, a, a);
        };
        put(A, s.a, en[k][0], vv[k][0]); put(B, s.a, en[k][0], vv[k][0]); put(A, s.b, en[k][1], vv[k][1]); put(B, s.b, en[k][1], vv[k][1]);
        const p = o.p, q = (ix) => [p[(base + ix) * 3], p[(base + ix) * 3 + 1], p[(base + ix) * 3 + 2]];
        const v0 = q(0), v1 = q(1), v2 = q(2), e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]], e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
        const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], nn = [o.n[base * 3], o.n[base * 3 + 1], o.n[base * 3 + 2]];
        if (cr[0] * nn[0] + cr[1] * nn[1] + cr[2] * nn[2] >= 0) o.i.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
        else o.i.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(o.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(o.n, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(o.u, 2)); g.setAttribute('color', new T.Float32BufferAttribute(o.c, 3)); g.setIndex(o.i);
    return g;
  }

  // ───────────────────────── 그림 면 재질: 그림 ↔ 사진(현상 · 니스 빛). 같은 프로그램을 모두 공유
  const PIC_GLSL = `
uniform sampler2D tPaint; uniform sampler2D tPhoto; uniform float uT, uDir, uFlash, uGlow, uSeed;
float c4h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float c4n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(c4h(i), c4h(i+vec2(1,0)), f.x), mix(c4h(i+vec2(0,1)), c4h(i+vec2(1,1)), f.x), f.y); }
vec3 c4pic(vec2 uv, out float sheen){
  vec3 P = texture2D(tPaint, uv).rgb, Q = texture2D(tPhoto, uv).rgb;
  float n = c4n(uv*vec2(5.0,6.0)+uSeed)*0.6 + c4n(uv*vec2(17.0,21.0)+uSeed*2.0)*0.4;
  sheen = 0.0;
  if (uDir > 0.0) {
    float dev = clamp((uT - 0.06)/0.94, 0.0, 1.0), l = dot(Q, vec3(0.3,0.59,0.11));
    float k = smoothstep(0.0, 0.45, dev*1.55 - l*0.55 - n*0.32 + 0.02);
    vec3 amber = mix(vec3(1.3,0.8,0.42), vec3(1.0), smoothstep(0.35, 0.95, dev));
    vec3 ph = mix(vec3(0.82,0.77,0.66), Q*amber, k);
    return mix(P, ph, smoothstep(0.02, 0.07, uT));
  }
  float e = uv.x*0.55 + (1.0-uv.y)*0.45 + (n-0.5)*0.18, f = uT*1.36 - 0.18;
  sheen = exp(-pow((f-e)/0.06, 2.0)) * step(0.001, uT) * step(uT, 0.999);
  return mix(Q, P, smoothstep(e-0.05, e+0.05, f));
}
float c4band(vec2 uv){ float e = uv.x*0.55 + (1.0-uv.y)*0.45; return uGlow > 0.0 ? exp(-pow((uGlow*1.5-0.25 - e)/0.09, 2.0)) : 0.0; }`;
  function picMaterial(paintT, photoT) {
    const m = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0, normalMap: weaveN, normalScale: new T.Vector2(0.18, 0.18), envMapIntensity: 0.3 });
    const u = { tPaint: { value: paintT }, tPhoto: { value: photoT }, uT: { value: 0 }, uDir: { value: 1 }, uFlash: { value: 0 }, uGlow: { value: 0 }, uSeed: { value: R() * 20 } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + PIC_GLSL)
        .replace('#include <map_fragment>', 'float sheen = 0.0; vec3 pcol = c4pic(vUv, sheen); diffuseColor.rgb *= pcol;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += pcol*0.05 + vec3(1.0,0.97,0.93)*uFlash*1.8 + vec3(1.0,0.62,0.3)*(sheen*0.85 + c4band(vUv)*0.75)*(0.25+pcol);');
    };
    m.customProgramCacheKey = () => 'c4pic';
    return { m, u };
  }

  // ───────────────────────── 그림 · 사진 판. 사진은 나다르의 명함판처럼 크림색 대지에 붙인 알부민 인화
  const imgs = {};
  await Promise.all(people.flatMap((p) => ['paint', 'photo'].map(async (k) => { imgs[`${p.id}-${k}`] = await loadImg(thumb(p.id, k)); })));
  const cover = (g, im, x, y, w, h) => { if (!im) { g.fillStyle = '#3a2a20'; g.fillRect(x, y, w, h); return; } const s = Math.max(w / im.naturalWidth, h / im.naturalHeight), sw = w / s, sh = h / s; g.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, x, y, w, h); };
  const albumen = (g, x, y, w, h) => { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(244,214,168,.85)'; g.fillRect(x, y, w, h); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(40,24,12,.9)'; g.fillRect(x, y, w, h); g.restore(); };
  function paintTex(id) { const W = 256, H = 320, c = cnv(W, H), g = c.getContext('2d'); cover(g, imgs[`${id}-paint`], 0, 0, W, H); return tex(c); }
  // kind: 'card' = 문 액자(대지 · 아래 스튜디오 이름, 기록된 곳만) · 'slim' = 매트 창 안(대지 테두리만 좁게)
  function photoTex(id, kind) {
    const W = 256, H = 320, c = cnv(W, H), g = c.getContext('2d'), im = imgs[`${id}-photo`];
    const pg = g.createLinearGradient(0, 0, W, H); pg.addColorStop(0, '#efe4cb'); pg.addColorStop(0.7, '#e0d1af'); pg.addColorStop(1, '#d4c29b'); g.fillStyle = pg; g.fillRect(0, 0, W, H);
    const r2 = rng(id.length * 31); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,90,40,${r2() * 0.06})`; g.fillRect(r2() * W, r2() * H, 1 + r2() * 2, 1); }
    const slim = kind === 'slim', x = W * (slim ? 0.06 : 0.1), y = H * (slim ? 0.05 : 0.065), w = W - 2 * x, h = slim ? H - 2 * y : H * 0.735;
    const path = () => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, W * 0.02) : g.rect(x, y, w, h); };
    g.save(); path(); g.clip(); cover(g, im, x, y, w, h); albumen(g, x, y, w, h); g.restore();
    if (slim) return tex(c);
    g.strokeStyle = 'rgba(150,112,48,.9)'; g.lineWidth = W * 0.006; path(); g.stroke();
    g.strokeStyle = 'rgba(150,112,48,.45)'; g.lineWidth = W * 0.003; g.strokeRect(W * 0.06, H * 0.04, W * 0.88, H * 0.92);
    const st = studioOf(id);
    if (st) { g.fillStyle = '#6e5226'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `italic 400 ${Math.round(W * 0.075)}px Georgia, "Times New Roman", serif`; g.fillText(st, W / 2, H * 0.885); }
    return tex(c);
  }

  // ───────────────────────── 사진관 장면(낮)
  const scene = new T.Scene();
  scene.background = C('#2a1410');
  scene.environment = envTex;
  scene.add(new T.HemisphereLight(C('#f4efe6'), C('#4a2018'), 0.62));
  const sun = new T.DirectionalLight(C('#fff4e4'), 1.2); sun.position.set(1.2, 9, 4.2); scene.add(sun);       // 유리 지붕의 낮빛(위 · 조금 앞)
  const fillL = new T.DirectionalLight(C('#e9edf2'), 0.3); fillL.position.set(-2, 2.2, 8); scene.add(fillL);   // 앞쪽 창
  const flashL = new T.PointLight(C('#eef2ff'), 0, 3.4, 2); scene.add(flashL);
  const WHITE = C('#eef2ff'), WARM = C('#ffb760'), sweepPos = new T.Vector3();   // 섬광(흰) · 니스 빛(따뜻한)은 점광원 하나를 번갈아 쓴다
  const root = new T.Group(); scene.add(root);

  // 정적인 것은 재질마다 하나로 합친다(그림 판만 따로 — 셰이더 값이 하나씩 다르다)
  const G = new Map();
  const put = (mat, g) => { if (!G.has(mat)) G.set(mat, []); G.get(mat).push(g); return g; };
  function mergeG(list, col) {
    const gs = list.map((g) => {
      const n = g.index ? g.toNonIndexed() : g;
      if (!n.attributes.uv) n.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
      if (col && !n.attributes.color) n.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 3).fill(1), 3));
      for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv', ...(col ? ['color'] : [])].includes(k)) n.deleteAttribute(k);
      return n;
    });
    return mergeBufferGeometries(gs);
  }
  const box = (w, h, d, x, y, z) => new T.BoxGeometry(w, h, d).translate(x, y, z);
  const rbox = (w, h, d, x, y, z, r = 0.008) => new RoundedBoxGeometry(w, h, d, 2, r).translate(x, y, z);
  const worldUV = (g, s = 0.9) => { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) / s, p.getY(i) / s); return g; };
  const lathe = (pts, seg = 20) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), seg);

  // ── 크기(m). 한 벽에 왼쪽부터: 판벽 · 모서리 매트 격자(nad_311) · 문 1 · 난로(nad_088) · 문 2 · 판벽
  const WALL_H = 3.45, OPEN = 1.3, LEAF_H = 2.7;
  const SEC = []; let xc = 0;
  for (const [k, w] of [['fill', 0.9], ['corner', 2.0], ['strip', 0.2], ['door', 1.5], ['strip', 0.15], ['stove', 2.3], ['strip', 0.15], ['door', 1.5], ['fill', 0.9]]) { SEC.push({ k, x0: xc, w, cx: xc + w / 2 }); xc += w; }
  const TOTAL = xc;
  const doors = SEC.filter((s) => s.k === 'door'), corner = SEC.find((s) => s.k === 'corner'), stoveS = SEC.find((s) => s.k === 'stove');
  const X0 = corner.cx - 0.2, X1 = doors[1].cx + 0.1, MID = (X0 + X1) / 2;   // 카메라가 오가는 범위(가운데를 0으로)
  root.position.x = -MID;

  // 벽 · 걸레받이 · 바닥 · 위의 들보(아랫면 · 앞면의 가로 띠) · 유리
  put(M.paint, worldUV(new T.PlaneGeometry(TOTAL, WALL_H).translate(TOTAL / 2, WALL_H / 2, 0)));
  put(M.paint, rbox(TOTAL, 0.16, 0.025, TOTAL / 2, 0.08, 0.0125, 0.006));
  put(M.paint, rbox(TOTAL, 0.03, 0.035, TOTAL / 2, 0.165, 0.016, 0.01));
  const floor = new T.Mesh(new T.PlaneGeometry(TOTAL + 8, 10).translate(TOTAL / 2, -5, 0), M.floor); floor.rotation.x = -Math.PI / 2;
  floor.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? 10 : TOTAL + 8) / 1.2; }); root.add(floor);
  const contact = new T.Mesh(new T.PlaneGeometry(TOTAL, 0.4).translate(TOTAL / 2, 0, 0), new T.MeshBasicMaterial({ map: beamT, color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })); contact.rotation.x = -Math.PI / 2; contact.position.set(0, 0.003, 0.06); root.add(contact);
  const BZ = 0.85, BY0 = WALL_H, BY1 = 4.05;
  put(M.paintDark, new T.PlaneGeometry(TOTAL, BZ).rotateX(Math.PI / 2).translate(TOTAL / 2, BY0, BZ / 2));
  put(M.paint, worldUV(box(TOTAL, BY1 - BY0, 0.06, TOTAL / 2, (BY0 + BY1) / 2, BZ + 0.03)));
  for (const [y, h, d] of [[BY0 + 0.025, 0.05, 0.05], [BY0 + 0.12, 0.025, 0.03], [BY1 - 0.09, 0.025, 0.03], [BY1 - 0.02, 0.05, 0.06]]) put(M.paint, rbox(TOTAL, h, d, TOTAL / 2, y, BZ + 0.06 + d / 2, 0.01));
  const glassG = new T.PlaneGeometry(TOTAL, 1.7).translate(TOTAL / 2, BY1 + 0.85, BZ); glassG.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? 1.7 : TOTAL) / 1.0; });
  root.add(new T.Mesh(glassG, M.glass));

  // 판(볼렉션 테두리 + 솟은 면)
  function panel(cx, cy, w, h, z, raised = true) {
    put(M.paint, sweep(PROF.panel, rectPath(w / 2, h / 2), 0.03, 0.016).translate(cx, cy, z));
    if (raised) put(M.paint, rbox(w - 0.03, h - 0.03, 0.014, cx, cy, z + 0.005, 0.006));
  }
  // 도자기 접시: 오목한 접시(돌림판) · kind 1 은 둘레가 꽃잎처럼 물결
  function plate(x, y, z, r, kind) {
    const g = lathe([[0, 0], [r * 0.5, 0.004], [r * 0.6, 0.012], [r * 0.9, 0.02], [r, 0.026], [r * 1.0, 0.012], [r * 0.6, 0.0]], 40).rotateX(Math.PI / 2);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      let px = p.getX(i), py = p.getY(i); const a = Math.atan2(py, px), rr = Math.hypot(px, py) / r;
      if (kind === 1) { const k = 1 + 0.07 * Math.cos(a * 16) * rr * rr; px *= k; py *= k; p.setXY(i, px, py); }
      uv.setXY(i, (kind + 0.5 + px / (2.16 * r)) / 4, 0.5 + py / (2.16 * r));
    }
    g.computeVertexNormals();
    put(M.plate, g.translate(x, y, z + 0.004));
    put(M.shadow, new T.PlaneGeometry(r * 2.5, r * 2.5).translate(x + 0.008, y - 0.02, z + 0.001));
  }

  // ── 그림(초상) 하나: 그림 판(바꾸기 셰이더) + 누르는 판(보이지 않음)
  const frames = [], pickables = [];
  function addPic(id, cx, cy, z, w, h, kind) {
    const { m, u } = picMaterial(paintTex(id), photoTex(id, kind));
    const pic = new T.Mesh(new T.PlaneGeometry(w, h), m); pic.position.set(cx, cy, z); root.add(pic);
    const f = { i: frames.length, id, pic, u, ph: false, anim: null, OW: w, OH: h };
    frames.push(f); return f;
  }
  function hitPlane(f, cx, cy, z, w, h) { const m = new T.Mesh(new T.PlaneGeometry(w, h), M.hit); m.position.set(cx, cy, z); m.userData.fi = f.i; root.add(m); pickables.push(m); }
  // 문 판의 작은 금박 액자 유화(nad_088)
  function giltFrame(id, cx, cy, pw, pr, z) {
    const ph = pw * 1.25, Mw = 0.04, Dz = 0.03;
    put(M.gilt, sweep(PROF[pr], rectPath(pw / 2, ph / 2), Mw, Dz).translate(cx, cy, z));
    put(M.wood, box(pw + 0.01, ph + 0.01, 0.002, cx, cy, z + 0.001));
    const f = addPic(id, cx, cy, z + Dz * 0.22, pw + 0.006, ph + 0.006, 'card');
    f.OW = pw + 2 * Mw; f.OH = ph + 2 * Mw;
    hitPlane(f, cx, cy, z + Dz + 0.004, f.OW, f.OH);
    put(M.shadow, new T.PlaneGeometry(f.OW * 1.2 + 0.04, f.OH * 1.16 + 0.04).translate(cx + 0.006, cy - 0.022, z + 0.0008));
  }
  // 흰 매트 + 어두운 리플 몰딩(nad_311). 한 매트에 그림 여럿 — wins: [{ id, x, y, pw }](매트 가운데 기준)
  function matFrame(cx, cy, mw, mh, wins, z) {
    const Mw = 0.032, Dz = 0.024, zMat = z + Dz * 0.42, BV = 0.005;
    const sh = new T.Shape(); sh.moveTo(-mw / 2, -mh / 2); sh.lineTo(mw / 2, -mh / 2); sh.lineTo(mw / 2, mh / 2); sh.lineTo(-mw / 2, mh / 2); sh.closePath();
    for (const w of wins) {
      const ph = w.pw * 1.25, hw = w.pw / 2 + BV, hh = ph / 2 + BV, hp = new T.Path();
      hp.moveTo(w.x - hw, w.y - hh); hp.lineTo(w.x - hw, w.y + hh); hp.lineTo(w.x + hw, w.y + hh); hp.lineTo(w.x + hw, w.y - hh); hp.closePath(); sh.holes.push(hp);
      put(M.matCore, sweep(PROF.bevel, rectPath(hw, hh), BV, BV).translate(cx + w.x, cy + w.y, zMat));
      const f = addPic(w.id, cx + w.x, cy + w.y, z + Dz * 0.16, w.pw + 0.014, ph + 0.014, 'slim');
      f.OW = w.pw + 0.05; f.OH = ph + 0.05;
      hitPlane(f, cx + w.x, cy + w.y, zMat + 0.004, w.pw + 0.035, ph + 0.035);
    }
    put(M.mat, new T.ShapeGeometry(sh).translate(cx, cy, zMat));
    put(M.wood, box(mw, mh, 0.002, cx, cy, z + 0.001));
    put(M.ebon, sweep(PROF.ripple, rectPath(mw / 2, mh / 2), Mw, Dz).translate(cx, cy, z));
    put(M.shadow, new T.PlaneGeometry((mw + 2 * Mw) * 1.12 + 0.03, (mh + 2 * Mw) * 1.14 + 0.03).translate(cx + 0.005, cy - 0.018, z + 0.0008));
  }

  // ── 24명: 문 1(6) · 문 2(6) · 모서리 매트 격자(12). 사람 목록 순서는 그대로, 어디에 거는지만 정한다
  let pi = 0; const next = () => people[pi++];
  // 두 짝 문(nad_088 · 089): 문틀 · 문짝마다 아래 긴 판 · 가운데 짧은 판 · 위 넓은 판, 위 판에 작은 금박 액자 셋
  const LEAF_FR = [[[0.25, 0.012, 'giltA'], [0.235, -0.01, 'giltB'], [0.25, 0.006, 'giltA']], [[0.24, -0.008, 'giltB'], [0.25, 0.01, 'giltA'], [0.235, -0.004, 'giltB']]];
  doors.forEach((s, di) => {
    const c = s.cx, LW = OPEN / 2, zS = 0.03;
    for (const sx of [-1, 1]) put(M.paint, rbox(0.1, LEAF_H + 0.12, 0.06, c + sx * (OPEN / 2 + 0.05), (LEAF_H + 0.12) / 2, 0.03));
    put(M.paint, rbox(OPEN + 0.2, 0.12, 0.065, c, LEAF_H + 0.06, 0.0325));
    put(M.paint, rbox(OPEN + 0.28, 0.035, 0.09, c, LEAF_H + 0.135, 0.045));
    for (const sx of [-1, 1]) {
      const lx = c + sx * LW / 2, fr = LEAF_FR[(sx < 0 ? 0 : 1) ^ di];
      put(M.paint, box(LW - 0.004, LEAF_H, 0.03, lx, LEAF_H / 2, zS - 0.015));
      panel(lx, 0.555, 0.47, 0.79, zS); panel(lx, 1.16, 0.47, 0.22, zS); panel(lx, 1.995, 0.51, 1.25, zS, false);
      // 위 판: 액자 셋을 세로로(크기 · 좌우가 조금씩 다르게 — 사진에서처럼 줄 맞춤이 아니다)
      let y = 2.6;
      for (const [pw, dx, pr] of fr) { const oh = pw * 1.25 + 0.08; y -= oh / 2; const p = next(); if (p) giltFrame(p.id, lx + dx, y, pw, pr, zS + 0.001); y -= oh / 2 + 0.028; }
    }
    put(M.wood, box(0.006, LEAF_H - 0.02, 0.004, c, LEAF_H / 2, zS + 0.001));
    put(M.brass, box(0.012, 2.3, 0.008, c + 0.026, 1.3, zS + 0.006));                   // 걸쇠 막대
    put(M.brass, rbox(0.05, 0.11, 0.012, c + 0.026, 1.12, zS + 0.008, 0.004));
    for (const sx of [-1, 1]) put(M.brass, new T.SphereGeometry(0.02, 14, 10).translate(c + sx * 0.05, 1.12, zS + 0.03));
    // 문 위 접시(nad_088: 문틀 위로 큰 접시와 작은 접시)
    [[-0.56, 0.1, 2], [-0.27, 0.135, 0], [0.02, 0.1, 3], [0.3, 0.14, 1], [0.58, 0.095, 2]].forEach(([dx, r, k], j) => plate(c + (di ? -dx : dx), 3.0 + (j % 2) * 0.03, 0, r, k));
  });
  // 모서리(nad_311): 가로 매트 넷을 거의 맞붙여 2×2 격자(매트마다 3 · 3 · 2 · 2), 위에 세로 매트 둘
  {
    const c = corner.cx, PW = 0.155, MW = 0.66, MH = 0.31, OW = MW + 0.064, OH = MH + 0.064, gap = 0.01;
    const three = (ids) => ids.map((p, k) => ({ id: p.id, x: (k - 1) * (PW + 0.04), y: 0, pw: PW }));
    const two = (ids) => ids.map((p, k) => ({ id: p.id, x: (k - 0.5) * (PW + 0.12), y: 0, pw: PW }));
    const yB = 1.62, yT = yB + OH + gap;
    const tl = [next(), next(), next()].filter(Boolean), tr = [next(), next(), next()].filter(Boolean), bl = [next(), next()].filter(Boolean), br = [next(), next()].filter(Boolean);
    matFrame(c - (OW + gap) / 2, yT, MW, MH, three(tl), 0.002);
    matFrame(c + (OW + gap) / 2, yT, MW, MH, three(tr), 0.002);
    matFrame(c - (OW + gap) / 2, yB, MW, MH, two(bl), 0.002);
    matFrame(c + (OW + gap) / 2, yB, MW, MH, two(br), 0.002);
    const s1 = next(), s2 = next(), yS = yT + OH / 2 + 0.03;
    if (s1) matFrame(c - 0.47, yS + 0.27, 0.36, 0.44, [{ id: s1.id, x: 0, y: 0.012, pw: 0.24 }], 0.002);
    if (s2) matFrame(c + 0.52, yS + 0.24, 0.32, 0.38, [{ id: s2.id, x: 0, y: 0.01, pw: 0.21 }], 0.002);
  }
  while (pi < people.length) { const p = next(); console.warn('[c4] 걸 자리가 없는 사람', p && p.id); }
  // 양 끝 · 사이 띠: 장식 없는 판벽(기록 없음 — 중립)
  for (const s of SEC) {
    if (s.k === 'fill') { const n = Math.round(s.w / 0.45); for (let i = 0; i < n; i++) { const x = s.x0 + s.w * (i + 0.5) / n; panel(x, 0.6, s.w / n - 0.12, 0.72, 0.0); panel(x, 2.1, s.w / n - 0.12, 1.9, 0.0); } }
    if (s.k === 'strip') panel(s.cx, 1.45, s.w - 0.08, 2.5, 0.0);
  }
  // 난로(nad_088): 받침 · 아래 띠 · 몸통(타일 격자) · 위 처마 · 탑 · 위의 그릇. 양옆 조각 콘솔 · 벽 선반(그릇 · 작은 청동 조상) · 접시
  {
    const c = stoveS.cx, sz = 0.31, bw = 1.5, bh = 1.42, bd = 0.58, y0 = 0.36;
    put(M.wood, rbox(1.64, 0.3, 0.68, c, 0.15, sz + 0.02, 0.012));
    put(M.glaze, rbox(1.56, 0.06, 0.62, c, y0 - 0.03, sz, 0.015));
    const body = new T.Mesh(new T.BoxGeometry(bw, bh, bd), [M.stoveS, M.stoveS, M.glaze, M.glaze, M.stoveF, M.stoveS]); body.position.set(c, y0 + bh / 2, sz); root.add(body);
    put(M.glaze, rbox(1.6, 0.05, 0.64, c, y0 + bh + 0.025, sz, 0.012));
    put(M.glaze, rbox(1.64, 0.05, 0.68, c, y0 + bh + 0.075, sz, 0.015));
    const top = y0 + bh + 0.1;
    const tower = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 0.62, 6, 1, true).rotateY(Math.PI / 6), M.stoveT); tower.position.set(c, top + 0.31, sz - 0.05); root.add(tower);
    put(M.glaze, new T.CylinderGeometry(0.235, 0.22, 0.06, 6).rotateY(Math.PI / 6).translate(c, top + 0.03, sz - 0.05));
    put(M.glaze, new T.CylinderGeometry(0.235, 0.205, 0.07, 6).rotateY(Math.PI / 6).translate(c, top + 0.655, sz - 0.05));
    put(M.glaze, new T.CylinderGeometry(0.17, 0.235, 0.035, 6).rotateY(Math.PI / 6).translate(c, top + 0.707, sz - 0.05));
    for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; put(M.glaze, rbox(0.06, 0.06, 0.03, c + Math.cos(a) * 0.2, top + 0.72, sz - 0.05 + Math.sin(a) * 0.2, 0.008)); }   // 탑 위 톱니(nad_088)
    const jug = (x, h) => put(M.vase, lathe([[0, 0], [0.05, 0], [0.065, 0.05 * h], [0.072, 0.11 * h], [0.05, 0.17 * h], [0.038, 0.19 * h], [0.046, 0.23 * h], [0.04, 0.235 * h], [0, 0.235 * h]], 18).translate(x, top, sz + 0.05));
    jug(c - 0.36, 0.85); jug(c + 0.36, 0.85); jug(c - 0.62, 0.7); jug(c + 0.62, 0.7);
    for (const sx of [-1, 1]) {
      // 조각 콘솔
      const kx = c + sx * 0.95;
      const k = new T.Mesh(new T.BoxGeometry(0.26, 1.3, 0.13), [M.wood, M.wood, M.wood, M.wood, M.carved, M.wood]); k.position.set(kx, 1.15, 0.065); root.add(k);
      put(M.wood, rbox(0.34, 0.09, 0.2, kx, 1.845, 0.1, 0.01)); put(M.wood, rbox(0.3, 0.06, 0.16, kx, 0.47, 0.08, 0.01));
      // 벽 선반 둘: 키 큰 그릇 · 작은 청동 조상
      const bx = c + sx * 0.5, by = 2.15;
      put(M.wood, rbox(0.32, 0.035, 0.2, bx, by, 0.1, 0.008));
      { const bs = new T.Shape(); bs.moveTo(0, 0); bs.lineTo(0.17, 0); bs.lineTo(0.17, -0.03); bs.quadraticCurveTo(0.05, -0.04, 0.02, -0.2); bs.lineTo(0, -0.2); bs.closePath(); put(M.wood, new T.ExtrudeGeometry(bs, { depth: 0.05, bevelEnabled: false, curveSegments: 8 }).rotateY(-Math.PI / 2).translate(bx + 0.025, by - 0.0175, 0)); }
      // 선반 위 키 큰 그릇(nad_088 에서 탑 양옆의 어두운 원통형 그릇 — 재질은 사진으로 확정 못 함, 어두운 청동빛으로)
      put(M.bronze, lathe([[0, 0], [0.05, 0], [0.05, 0.02], [0.03, 0.04], [0.03, 0.06], [0.06, 0.12], [0.075, 0.2], [0.07, 0.27], [0.045, 0.33], [0.035, 0.37], [0.05, 0.4], [0.042, 0.41], [0, 0.41]], 20).translate(bx, by + 0.0175, 0.1));
      // 접시: 콘솔 위 세로 셋(작게) · 그 위 큰 접시
      for (let i = 0; i < 3; i++) plate(c + sx * 0.97, 2.26 + i * 0.22, 0, 0.075, (i + (sx > 0 ? 1 : 0)) % 2 ? 2 : 0);
      plate(c + sx * 0.72, 3.08, 0, 0.14, sx > 0 ? 1 : 0);
    }
  }
  // 들보 앞면의 접시 한 줄(nad_088 · 311: 꽃잎 접시와 둥근 접시가 번갈아)
  for (let x = 0.5, k = 0; x < TOTAL - 0.3; x += 0.78, k++) plate(x, (BY0 + BY1) / 2 + 0.02, BZ + 0.06, k % 2 ? 0.13 : 0.12, k % 2 ? 1 : 0);
  // 합치기
  for (const [mat, list] of G) { const mesh = new T.Mesh(mergeG(list, !!mat.vertexColors), mat); if (mat === M.shadow) mesh.renderOrder = 1; root.add(mesh); }
  G.clear();

  // 섬광 · 연기
  const flashSpr = new T.Sprite(glowMat('#f2f4ff', 0)); flashSpr.renderOrder = 20; scene.add(flashSpr);
  const puffs = Array.from({ length: 36 }, () => { const s = new T.Sprite(new T.SpriteMaterial({ map: puffT, color: C('#c9c6cc'), transparent: true, opacity: 0, depthWrite: false })); s.visible = false; s.renderOrder = 21; scene.add(s); return { s, life: 0, max: 1, v: new T.Vector3(), g: 0 }; });
  let puffI = 0;
  function puff(x, y, z, n, size = 0.35, speed = 0.5) {
    for (let i = 0; i < n; i++) {
      const p = puffs[puffI++ % puffs.length]; p.s.visible = true; p.life = 0; p.max = 2.2 + R() * 1.6; p.s.position.set(x + (R() - 0.5) * 0.15, y + (R() - 0.5) * 0.1, z + R() * 0.2);
      p.v.set((R() - 0.5) * speed, 0.12 + R() * speed * 0.5, 0.05 + R() * 0.15); p.base = size * (0.5 + R() * 0.5); p.g = 0.5 + R() * 0.5; p.s.material.rotation = R() * 6.28; p.a = 0.14 + R() * 0.12;
    }
  }

  // ───────────────────────── 카메라 · 흐름
  const cam = new T.PerspectiveCamera(50, 1, 0.05, 80);
  const CAM = { y: 1.9, z: 3.4, ty: 2.3 };
  const XLIM = (X1 - X0) / 2;
  const st = { x: doors[0].cx - MID, v: 0, dir: 1, pitch: 0, pitchT: 0, z: CAM.z, y: CAM.y, ty: CAM.ty, tx: 0, mode: 'street', drag: null, cruise: reduced ? 0 : 0.075, ramp: 0, entering: null, q: null };
  let W = 1, H = 1;
  function resize() {
    const r = canvas.getBoundingClientRect(); W = Math.max(2, r.width); H = Math.max(2, r.height);
    renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); street.cam.aspect = W / H; street.cam.updateProjectionMatrix();
  }
  const viewW = (d) => 2 * d * Math.tan(T.MathUtils.degToRad(cam.fov / 2)) * cam.aspect;

  // ───────────────────────── 거리 장면(들어가기)
  const street = await (async () => {
    const s = new T.Scene(); s.background = C('#010103');
    const [bImg, lImg] = await Promise.all([loadImg('img/c4n/facade.jpg'), loadImg('img/c4n/lights.png')]);
    const bT = new T.Texture(bImg); bT.encoding = T.sRGBEncoding; bT.anisotropy = ANISO; bT.needsUpdate = true;
    const lT = new T.Texture(lImg); lT.needsUpdate = true;
    const FW = 8, FH = 8 * (bImg ? bImg.naturalHeight / bImg.naturalWidth : 1.14);
    const U = (x) => (x - 2) / 94, V = (y) => (y - 6) / 82.5;          // 원본 % → 판 0..1
    const at = (x, y) => [(U(x) - 0.5) * FW, (0.5 - V(y)) * FH];
    const fu = { tB: { value: bT }, tL: { value: lT }, uAmb: { value: 0.75 }, uUp: { value: 0.12 }, uLow: { value: 0.18 }, uSt: { value: 0.3 }, uFlash: { value: 0 }, uT: { value: 0 } };
    const facade = new T.Mesh(new T.PlaneGeometry(FW, FH), new T.ShaderMaterial({
      uniforms: fu,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform sampler2D tB, tL; uniform float uAmb, uUp, uLow, uSt, uFlash, uT; varying vec2 vUv;
        void main(){
          vec3 b = texture2D(tB, vUv).rgb; vec3 L = texture2D(tL, vUv).rgb;
          float fl = 0.9 + 0.06*sin(uT*7.3 + vUv.x*31.0) + 0.04*sin(uT*13.1 + vUv.y*57.0);
          vec3 warm = vec3(1.0, 0.6, 0.27);
          vec3 c = b*uAmb + warm*warm*(L.r*uUp*1.35 + L.g*uLow*1.15)*fl + vec3(1.0,0.66,0.36)*L.b*uSt*1.3;
          c += vec3(0.92,0.95,1.0)*uFlash*(L.r*6.0 + 0.25);
          float ex = smoothstep(0.0, 0.05, vUv.x)*smoothstep(1.0, 0.95, vUv.x);
          float ey = smoothstep(0.0, 0.12, vUv.y);
          c *= mix(0.15, 1.0, ex) * mix(0.1, 1.0, ey);
          c = mix(c, vec3(0.0016,0.0017,0.0035), smoothstep(0.955, 1.0, vUv.y));
          c *= mix(0.45, 1.0, smoothstep(0.08, 0.24, vUv.y));
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`,
    }));
    s.add(facade);
    // 하늘: 판 위로 이어지는 밤(같은 색에서 더 어둡게) · 달빛 번짐
    const skyC = cnv(8, 256), sg = skyC.getContext('2d'), gr = sg.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#010102'); gr.addColorStop(0.7, '#030308'); gr.addColorStop(1, '#05050b'); sg.fillStyle = gr; sg.fillRect(0, 0, 8, 256);
    const sky = new T.Mesh(new T.PlaneGeometry(80, 60), new T.MeshBasicMaterial({ map: tex(skyC) }));   // 판의 하늘과 같이 톤매핑 — 이음매가 보이지 않게 sky.position.set(0, FH / 2 + 30 - 0.4, -0.5); s.add(sky);
    const moon = new T.Sprite(glowMat('#7e8cc0', 0.16)); moon.scale.set(11, 11, 1); moon.position.set(3.6, FH / 2 + 2.4, -0.4); s.add(moon);
    // 간판 "Nadar" — 실제 간판 자리(원본 x 33–63 %, y 36–44 %, 오른쪽으로 오르는 서명)에 가스 불빛 글씨. 한 글자씩
    const SW = 1024, SH = 340, signC = cnv(SW, SH), sgc = signC.getContext('2d');
    const word = 'Nadar', fpx = 250; sgc.font = `${fpx}px Sacramento, 'Snell Roundhand', cursive`;
    const xs = []; const total = sgc.measureText(word).width; let x0 = (SW - total) / 2;
    for (let i = 0; i < word.length; i++) xs.push(x0 + sgc.measureText(word.slice(0, i)).width);
    const letterCanvas = word.split('').map((ch, i) => {
      const c = cnv(SW, SH), g = c.getContext('2d'); g.font = sgc.font; g.textBaseline = 'alphabetic';
      const y = SH * 0.66;
      for (const [blur, col, a] of [[46, 'rgba(255,120,40,1)', 0.9], [18, 'rgba(255,170,80,1)', 1], [5, 'rgba(255,226,170,1)', 1]]) { g.shadowColor = col; g.shadowBlur = blur; g.globalAlpha = a; g.fillStyle = col; g.fillText(ch, xs[i], y); }
      g.shadowBlur = 0; g.globalAlpha = 1; g.fillStyle = '#fff6e2'; g.fillText(ch, xs[i], y);
      return c;
    });
    const offC = cnv(SW, SH); { const g = offC.getContext('2d'); g.font = sgc.font; g.fillStyle = 'rgba(150,80,50,.22)'; g.fillText(word, xs[0], SH * 0.66); }
    const signT = tex(signC);
    const lit = [0, 0, 0, 0, 0];
    const drawSign = () => { sgc.clearRect(0, 0, SW, SH); sgc.drawImage(offC, 0, 0); for (let i = 0; i < 5; i++) if (lit[i] > 0) { sgc.globalAlpha = clamp(lit[i], 0, 1); sgc.drawImage(letterCanvas[i], 0, 0); } sgc.globalAlpha = 1; signT.needsUpdate = true; };
    drawSign();
    const [sx0, sy0] = at(33.5, 41.4), [sx1, sy1] = at(62.5, 38.0);
    const sLen = Math.hypot(sx1 - sx0, sy1 - sy0) * 1.18;
    const sign = new T.Mesh(new T.PlaneGeometry(sLen, sLen * SH / SW), new T.MeshBasicMaterial({ map: signT, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
    sign.position.set((sx0 + sx1) / 2, (sy0 + sy1) / 2 + 0.05, 0.02); sign.rotation.z = Math.atan2(sy1 - sy0, sx1 - sx0) * 0.75; s.add(sign);
    const signGlow = new T.Sprite(glowMat('#ff9a4a', 0)); signGlow.scale.set(sLen * 1.5, sLen * 0.8, 1); signGlow.position.copy(sign.position).setZ(0.03); s.add(signGlow);
    // 길의 가스등 번짐(사진 속 가로등 · 광고탑 자리)
    const lampGlows = [[63.1, 66.4, 1.1], [9.0, 66.2, 1.3]].map(([x, y, k]) => { const [lx, ly] = at(x, y); const sp = new T.Sprite(glowMat('#ffbe78', 0)); sp.scale.set(k, k, 1); sp.position.set(lx, ly, 0.05); s.add(sp); return sp; });
    const studioGlow = new T.Sprite(glowMat('#ffffff', 0)); const [ax, ay] = at(47, 30.5); studioGlow.position.set(ax, ay, 0.1); studioGlow.scale.set(6, 4.5, 1); s.add(studioGlow);
    // 안개 판(깊이마다)
    const fogs = [];
    for (let i = 0; i < 7; i++) {
      const m = new T.Mesh(new T.PlaneGeometry(9, 2.4), new T.MeshBasicMaterial({ map: puffT, color: C('#7a7690'), transparent: true, opacity: 0.0, depthWrite: false, toneMapped: false }));
      const z = 0.4 + i * 1.6; m.position.set((R() - 0.5) * 4, -FH / 2 + 0.6 + R() * 1.2 + (i % 3) * 0.3, z); m.userData = { vx: (0.05 + R() * 0.08) * (R() < 0.5 ? -1 : 1), op: 0.12 + R() * 0.1 }; s.add(m); fogs.push(m);
    }
    // 앞의 가스 가로등(주철 기둥 · 등롱) — 다가가며 화면 왼쪽으로 지나간다
    const post = new T.Group(); post.position.set(-0.98, -FH / 2 + 0.6, 7.6); s.add(post);
    post.add(new T.Mesh(new T.LatheGeometry([new T.Vector2(0.0, 0), new T.Vector2(0.17, 0), new T.Vector2(0.15, 0.2), new T.Vector2(0.09, 0.32), new T.Vector2(0.08, 0.9), new T.Vector2(0.06, 1.0), new T.Vector2(0.05, 3.2), new T.Vector2(0.07, 3.3), new T.Vector2(0.045, 3.45), new T.Vector2(0.0, 3.46)], 18), M.iron));
    // 등롱: 위가 넓은 네모 유리(호박빛) · 주철 모서리 살 · 위아래 테 · 지붕과 꼭지 · 안의 불꽃
    const lantern = new T.Group(); lantern.position.y = 3.46; post.add(lantern);
    lantern.add(new T.Mesh(new T.CylinderGeometry(0.075, 0.05, 0.1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.05, 0), M.iron));
    const glassM = new T.MeshStandardMaterial({ color: C('#6a3a18'), emissive: C('#ff9a3c'), emissiveIntensity: 0.55, transparent: true, opacity: 0.6, roughness: 0.15, metalness: 0, side: T.DoubleSide, depthWrite: false });
    lantern.add(new T.Mesh(new T.CylinderGeometry(0.17, 0.115, 0.42, 4, 1, true).rotateY(Math.PI / 4).translate(0, 0.32, 0), glassM));
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2, bar = new T.Mesh(new T.BoxGeometry(0.018, 0.44, 0.018), M.iron);
      bar.position.set(Math.cos(a) * 0.143 * 1.0, 0.32, Math.sin(a) * 0.143); bar.lookAt(Math.cos(a) * 0.2, 0.53, Math.sin(a) * 0.2); bar.rotateX(Math.PI / 2); lantern.add(bar);
    }
    lantern.add(new T.Mesh(new T.CylinderGeometry(0.125, 0.125, 0.025, 4, 1).rotateY(Math.PI / 4).translate(0, 0.11, 0), M.iron));
    lantern.add(new T.Mesh(new T.CylinderGeometry(0.185, 0.185, 0.03, 4, 1).rotateY(Math.PI / 4).translate(0, 0.54, 0), M.iron));
    lantern.add(new T.Mesh(new T.ConeGeometry(0.25, 0.2, 4).rotateY(Math.PI / 4).translate(0, 0.65, 0), M.iron));
    lantern.add(new T.Mesh(new T.LatheGeometry([new T.Vector2(0.0, 0), new T.Vector2(0.04, 0), new T.Vector2(0.025, 0.05), new T.Vector2(0.035, 0.09), new T.Vector2(0.0, 0.16)], 10).translate(0, 0.74, 0), M.iron));
    const flame = new T.Sprite(glowMat('#fff0c8', 1)); flame.scale.set(0.14, 0.2, 1); flame.position.set(0, 0.28, 0); lantern.add(flame);
    const lanternGlow = new T.Sprite(glowMat('#ff9e48', 0.8)); lanternGlow.scale.set(1.6, 1.6, 1); lanternGlow.position.set(0, 0.32, 0.05); lantern.add(lanternGlow);
    s.add(new T.HemisphereLight(C('#8a8cb8'), C('#100808'), 0.5));
    const pl = new T.PointLight(C('#ffb468'), 1.4, 4, 2); pl.position.set(-0.8, -FH / 2 + 4.4, 7.9); s.add(pl);
    const c = new T.PerspectiveCamera(50, 1, 0.05, 100);
    const [cx0] = at(47.6, 40), [, cyS] = at(47, 41), [px, py] = at(47, 30.5);
    const P0 = new T.Vector3(cx0, 0.5, 12.6), P1 = new T.Vector3(cx0 - 0.02, cyS + 0.62, 8.2), P2 = new T.Vector3(px, py, 0.7);
    return { s, cam: c, fu, lit, drawSign, signGlow, lampGlows, studioGlow, fogs, P0, P1, P2, lanternGlow, glassM };
  })();

  // ───────────────────────── 시간 · 트윈
  const tweens = [];
  function tween(dur, fn, ease = eio) {
    return new Promise((res) => {
      if (reduced || dur <= 0) { fn(1); res(); return; }
      tweens.push({ t0: performance.now(), dur, fn, ease, res });
    });
  }
  const anims = [];      // { t0, dur, fn(t) } — 프레임마다
  const later = (ms, f) => setTimeout(f, ms);

  // ───────────────────────── 들어가기
  let phase = 'street', introT0 = 0, introCb = {}, introDone = false;
  function playIntro(cb) {
    introCb = cb || {};
    introT0 = performance.now(); phase = 'street';
    const c = street.cam; c.position.copy(street.P0); c.lookAt(street.P0.x, street.P0.y, 0);
    if (reduced) {
      street.lit.fill(1); street.drawSign(); street.fu.uUp.value = 1; street.fu.uLow.value = 0.85; street.fu.uSt.value = 1; street.signGlow.material.opacity = 0.5;
      street.lampGlows.forEach((g) => { g.material.opacity = 0.7; });
      later(1300, () => enterStudio(true));
      return;
    }
    for (let i = 0; i < 5; i++) later(380 + i * 190, () => ignite(i));
    later(1150, () => anims.push({ t0: performance.now(), dur: 700, fn: (t) => { const e = eo(t); street.fu.uUp.value = lerp(0.12, 1, e); street.signGlow.material.opacity = 0.55 * e; } }));
    later(1350, () => anims.push({ t0: performance.now(), dur: 900, fn: (t) => { const e = eo(t); street.fu.uLow.value = lerp(0.18, 0.85, e); street.fu.uSt.value = lerp(0.3, 1, e); street.lampGlows.forEach((g) => { g.material.opacity = 0.75 * e; }); } }));
    flashAt = 2250;
  }
  let flashAt = Infinity, flashed = false, ready = true;
  function ignite(i) {
    const seq = [0.2, 1, 0.35, 1, 0.6, 1], t0 = performance.now();
    anims.push({ t0, dur: 600, fn: (t) => { street.lit[i] = seq[Math.min(seq.length - 1, Math.floor(t * seq.length))]; street.drawSign(); } });
  }
  function streetFlash() {
    flashed = true; introCb.onFlash && introCb.onFlash();
    const t0 = performance.now();
    anims.push({ t0, dur: 650, fn: (t) => { street.fu.uFlash.value = t < 0.1 ? t / 0.1 : Math.pow(1 - (t - 0.1) / 0.9, 2); street.studioGlow.material.opacity = street.fu.uFlash.value; } });
    later(150, () => enterStudio(false));
  }
  function enterStudio(instant) {
    if (phase !== 'street') return;
    phase = 'studio'; introCb.onEnter && introCb.onEnter();
    st.mode = 'entering';
    const z0 = 7.4, z1 = CAM.z;
    st.x = clamp(st.x, -XLIM, XLIM);
    if (instant || reduced) { st.z = z1; st.mode = 'wall'; st.ramp = 1; introDone = true; introCb.onDone && introCb.onDone(); return; }
    st.z = z0; st.y = 1.62;
    puff(st.x, 2.0, 2.6, 4, 0.45, 0.35);
    tween(1900, (e) => { st.z = lerp(z0, z1, e); st.y = lerp(1.62, CAM.y, e); }, eo).then(() => { st.mode = 'wall'; introDone = true; introCb.onDone && introCb.onDone(); });
  }
  function skipIntro() {
    if (phase !== 'street') return;
    flashAt = Infinity; if (!flashed) { flashed = true; introCb.onFlash && introCb.onFlash(true); }
    enterStudio(true);
  }

  // ───────────────────────── 그림 ↔ 사진
  const tmpV = new T.Vector3();
  const frameWorld = (f, out = tmpV) => { f.pic.updateWorldMatrix(true, false); return out.setFromMatrixPosition(f.pic.matrixWorld); };
  let flashBusy = 0;
  function setPerson(id, ph, delay = 0, fx = true) {
    const f = frames.find((x) => x.id === id); if (!f || f.ph === ph) return false;
    f.ph = ph;
    const go = () => {
      if (reduced || !fx) { f.u.uDir.value = 1; f.u.uT.value = ph ? 1 : 0; f.anim = null; return; }
      f.anim = { t0: performance.now(), dur: ph ? 1800 : 1250, ph };
      f.u.uDir.value = ph ? 1 : -1; f.u.uT.value = 0;
      const p = frameWorld(f).clone();
      if (ph) {
        // 섬광: 액자 앞 점광원 · 번짐 · 연기 몇 줌
        flashL.position.set(p.x, p.y + 0.15, p.z + 0.7); flashBusy = performance.now();
        flashSpr.position.set(p.x, p.y, p.z + 0.2); flashSpr.scale.set(Math.max(1.2, f.OW * 3.2), Math.max(1.2, f.OW * 3.2), 1);
        puff(p.x + f.OW * 0.25, p.y - f.OH * 0.45, p.z + 0.2, frames.filter((x) => x.anim).length > 3 ? 1 : 3, Math.max(0.22, f.OW * 0.55), 0.3);
      } else { sweepPos.set(p.x - f.OW * 0.4, p.y + f.OH * 0.3, p.z + 0.45); }
    };
    delay ? later(delay, go) : go();
    return true;
  }
  function setAll(ph, opts = {}) {
    const list = frames.slice().sort((a, b) => frameWorld(a, new T.Vector3()).x - frameWorld(b, new T.Vector3()).x);
    if (ph) list.reverse();
    // 지금 화면 근처부터 물결이 가도록 — 화면 밖은 조금 늦게 몰아서
    let n = 0, k = 0;
    const cx = st.x, vw = viewW(st.z) * 0.6;
    list.forEach((f) => { const x = frameWorld(f, new T.Vector3()).x, on = Math.abs(x - cx) < vw; if (f.ph !== ph) { setPerson(f.id, ph, reduced ? 0 : (on ? k++ * 90 : 600 + n * 20), opts.fx !== false && on); n++; } });
    return n;
  }

  // ───────────────────────── 손가락: 끌어서 둘러보기 · 누르면 액자
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  let ptr = null, inputEl = null;
  function bindInput(el) {
    inputEl = el;
    el.addEventListener('pointerdown', (e) => { if (st.mode !== 'wall' || e.target.closest('button,a')) return; ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now(), moved: false, vx: 0, lt: performance.now() }; });
    el.addEventListener('pointermove', (e) => {
      if (!ptr || e.pointerId !== ptr.id) return;
      const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y, now = performance.now();
      if (!ptr.moved && Math.hypot(e.clientX - ptr.x0, e.clientY - ptr.y0) > 9) { ptr.moved = true; onDragStart(); try { el.setPointerCapture(e.pointerId); } catch (_) { /* noop */ } }
      if (ptr.moved) {
        const ppm = W / viewW(st.z);
        st.x = clamp(st.x - dx / ppm, -XLIM - 0.3, XLIM + 0.3); st.pitchT = clamp(st.pitchT - dy / ppm * 0.6, -0.55, 0.55);
        const dt = Math.max(1, now - ptr.lt); ptr.vx = lerp(ptr.vx, -dx / ppm / (dt / 1000), 0.35); st.v = 0;
      }
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.lt = now;
    });
    const end = (e) => {
      if (!ptr || e.pointerId !== ptr.id) return;
      if (!ptr.moved && performance.now() - ptr.t < 600) {
        const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, cam); const hit = ray.intersectObjects(pickables, false)[0];
        if (hit) onTap(frames[hit.object.userData.fi].id);
      } else if (ptr.moved) { st.v = clamp(ptr.vx, -2.5, 2.5); if (Math.abs(st.v) > 0.05) st.dir = Math.sign(st.v); }
      ptr = null;
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', (e) => { ptr = null; });
  }

  // ───────────────────────── 매 프레임
  let raf = 0, last = performance.now(), active = true, tSec = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; tSec += dt;
    for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i], t = clamp((now - tw.t0) / tw.dur, 0, 1); tw.fn(tw.ease(t)); if (t >= 1) { tweens.splice(i, 1); tw.res(); } }
    for (let i = anims.length - 1; i >= 0; i--) { const a = anims[i], t = clamp((now - a.t0) / a.dur, 0, 1); a.fn(t); if (t >= 1) anims.splice(i, 1); }
    if (phase === 'street') { renderStreet(now, dt); return; }
    // 그림 바꾸기
    for (const f of frames) {
      if (!f.anim) continue;
      const t = clamp((now - f.anim.t0) / f.anim.dur, 0, 1);
      f.u.uT.value = t;
      if (f.anim.ph) f.u.uFlash.value = t < 0.025 ? t / 0.025 : Math.max(0, 1 - (t - 0.025) / 0.2) ** 2;
      if (t >= 1) { f.anim = null; f.u.uDir.value = 1; f.u.uT.value = f.ph ? 1 : 0; f.u.uFlash.value = 0; f.u.uGlow.value = 0; }
    }
    const fa = (now - flashBusy) / 1000;
    const anyBack = frames.some((f) => f.anim && !f.anim.ph);
    if (fa < 0.55) { flashL.color.copy(WHITE); flashL.intensity = (fa < 0.03 ? fa / 0.03 : Math.pow(1 - (fa - 0.03) / 0.52, 2)) * 9; flashL.distance = 4.5; }
    else if (anyBack) { flashL.color.copy(WARM); flashL.position.copy(sweepPos); flashL.intensity = 1.2; flashL.distance = 3.2; }
    else flashL.intensity *= 0.9;
    flashSpr.material.opacity = fa < 0.5 ? (fa < 0.03 ? fa / 0.03 : Math.pow(1 - (fa - 0.03) / 0.47, 2)) * 0.95 : 0;
    for (const p of puffs) {
      if (!p.s.visible) continue; p.life += dt; const t = p.life / p.max;
      if (t >= 1) { p.s.visible = false; continue; }
      p.v.multiplyScalar(0.985); p.v.y += 0.04 * dt; p.s.position.addScaledVector(p.v, dt);
      const sc = p.base * (1 + t * 1.8 * p.g); p.s.scale.set(sc, sc, 1); p.s.material.opacity = (t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88) * p.a; p.s.material.rotation += dt * 0.15;
    }
    // 흐름: 벽을 따라 천천히(끝에서는 부드럽게 돌아선다). 끌면 그만큼, 놓으면 관성
    if (st.mode === 'wall' && !(ptr && ptr.moved)) {
      st.ramp = Math.min(1, st.ramp + dt / 1.6);
      const edge = st.dir > 0 ? XLIM - st.x : st.x + XLIM;
      if (edge < 0.05 && Math.abs(st.v) < 0.02) st.dir *= -1;
      const target = st.dir * st.cruise * st.ramp * sstep(-0.1, 0.9, edge);
      const k = Math.abs(st.v) > st.cruise * 1.5 ? 1.6 : 0.8;
      st.v += (target - st.v) * Math.min(1, dt * k);
      st.x += st.v * dt;
      if (st.x > XLIM + 0.3 || st.x < -XLIM - 0.3) { st.x = clamp(st.x, -XLIM - 0.3, XLIM + 0.3); st.v *= -0.2; }
      if (!ptr) st.pitchT *= 1 - Math.min(1, dt * 0.25);
    }
    st.pitch += (st.pitchT - st.pitch) * Math.min(1, dt * 6);
    const bob = reduced ? 0 : Math.sin(tSec * 0.31) * 0.02;
    // 벽을 비스듬히(가는 쪽을 조금 앞서 보며) — 액자 · 문틀 · 난로의 두께가 보이고 앞뒤 시차가 생긴다
    const look = st.mode === 'wall' || st.mode === 'entering' ? (reduced ? 0.2 : clamp(st.dir * 0.32 + st.v * 1.2, -0.5, 0.5)) : 0;
    st.tx += (look - st.tx) * Math.min(1, dt * 0.7);
    cam.position.set(st.x - st.tx * 1.0, st.y + bob + st.pitch * 0.25, st.z);
    cam.lookAt(st.x + st.tx * 0.3, st.ty + st.pitch + bob * 0.5, 0);
    renderer.render(scene, cam);
  }
  function renderStreet(now, dt) {
    const c = street.cam, t = now - introT0;
    street.fu.uT.value = t / 1000;
    if (!reduced) {
      if (!flashed && t >= flashAt && ready) streetFlash();
      if (!flashed) { const e = eio(clamp(t / 2250, 0, 1)) * 0.9 + clamp(t / 2250, 0, 1) * 0.1; c.position.lerpVectors(street.P0, street.P1, e); }
      else { const e = ei(clamp((t - flashAt) / 380, 0, 1)); c.position.lerpVectors(street.P1, street.P2, e); }
      c.lookAt(c.position.x, c.position.y + 0.02, 0);
      street.fogs.forEach((m) => { m.position.x += m.userData.vx * dt; if (m.position.x > 6) m.position.x = -6; if (m.position.x < -6) m.position.x = 6; m.material.opacity = m.userData.op * clamp(t / 900, 0, 1); });
      const k = 0.9 + 0.08 * Math.sin(t / 1000 * 6.3) + 0.04 * Math.sin(t / 1000 * 15.1); street.lanternGlow.material.opacity = 0.7 * k; street.glassM.emissiveIntensity = 0.55 * k;
    } else { c.position.copy(street.P0).lerp(street.P1, 0.35); c.lookAt(c.position.x, c.position.y, 0); street.fogs.forEach((m) => { m.material.opacity = m.userData.op; }); }
    renderer.render(street.s, c);
  }
  function setActive(on) { if (on === active) return; active = on; if (on) { last = performance.now(); raf = requestAnimationFrame(frame); } else cancelAnimationFrame(raf); }
  document.addEventListener('visibilitychange', () => setActive(document.visibilityState === 'visible' && !canvas.hidden));
  window.addEventListener('resize', resize);
  resize();
  // 셰이더를 미리 굽는다(첫 섬광에서 멈추지 않게)
  renderer.compile(scene, cam); renderer.compile(street.s, street.cam);
  for (const f of frames) { renderer.initTexture(f.u.tPaint.value); renderer.initTexture(f.u.tPhoto.value); }   // 흐르다 처음 보이는 그림에서 멈칫하지 않게
  raf = requestAnimationFrame(frame);

  return {
    playIntro, skipIntro, setPerson, setAll, bindInput, setActive, resize,
    isPhoto: (id) => !!(frames.find((f) => f.id === id) || {}).ph,
    get mode() { return st.mode; }, get phase() { return phase; }, get flowing() { return st.mode === 'wall' && Math.abs(st.v) > 0.005; },
    get frames() { return frames.length; },
    debug: { st, cam, frames, scene, renderer, frameWorld, street, info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, tex: renderer.info.memory.textures, geo: renderer.info.memory.geometries, progs: renderer.info.programs.length }) },
  };
}
