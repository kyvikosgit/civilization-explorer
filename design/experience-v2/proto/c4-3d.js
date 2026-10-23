// C4 나다르 사진관 — three.js(0.147) 장면 둘: 밤의 거리(들어가기) · 사진관 안 초상 벽(살롱식 걸기).
//
// 거리: 나다르가 직접 찍은 35, boulevard des Capucines 정면 사진(퍼블릭 도메인, img/c4n/build.py 에 출처)을 밤으로 옮긴 판 +
//   창빛 마스크(위층 · 아래층 · 길) · 실제 간판 자리에 켜지는 서명 "Nadar"(가스 불빛) · 안개 판 · 앞쪽 가스 가로등(3D) → 유리 스튜디오의 마그네슘 섬광 속으로.
// 사진관: 나다르의 붉은 방 — 붉은 다마스크 벽 · 호두나무 징두리 · 놋쇠 그림 레일과 걸개줄 · 쪽매 바닥 · 벽 가스등 · 찬장 위 램프.
//   24점은 액자마다 몰딩 단면(2D 프로파일)을 사각 · 타원 둘레로 쓸어 만든 진짜 입체(마이터 모서리, 단면을 따라 이어지는 노멀)에
//   단면 띠마다 다른 조각 무늬(구슬 · 달걀과 화살 · 아칸서스 · 꼰 줄 · 갈대 · 리본)의 노멀 · 거칠기 · 때 낀 색을 입힌다.
//   양식 8가지: 로코코 금박(모서리 조개 장식) · 흑단과 금 · 타원 금박 · 깊은 호두나무 · 가는 금테와 매트 · 벨벳 미니어처 · 명함판 대지 · 바르비종 넓은 금박.
//   벽에 거는 것은 위가 앞으로 기울고(걸개줄 두 가닥), 찬장 위에 세우거나 이젤에 올린 것도 있다. 그림자는 액자마다 부드러운 판.
// 바꾸기: 액자를 누르면(레이캐스트) 앞에서 마그네슘 섬광 · 연기가 피고, 그 판이 종이에서부터 현상된다(어두운 곳 먼저, 호박빛 → 맑게).
//   되돌리면 니스 빛이 대각선으로 쓸며 그림이 돌아온다. 메시는 움직이지 않는다(셰이더 색만).
// 질문: 벽이 가장 가까운 칸 사이에서 두 문처럼 갈라져 열리고(왼쪽 = 그림, 오른쪽 = 사진으로 현상), 틈으로 빛이 샌다.
//   고르면 고른 문이 화면을 채우고, 결과에서는 두 문이 닫히며 이음매가 오늘의 비율 자리로 옮겨 간다.
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
  renderer.toneMappingExposure = 1.1;
  const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const tex = (c, srgb = true, rep = false) => { const t = new T.CanvasTexture(c); t.encoding = srgb ? T.sRGBEncoding : T.LinearEncoding; t.anisotropy = ANISO; if (rep) t.wrapS = t.wrapT = T.RepeatWrapping; return t; };
  const R = rng(1873);

  // ───────────────────────── 텍스처(모두 기기 안에서 그린다)
  // 높이 → 노멀(접선 공간). 캔버스 y 는 아래로, 텍스처 v 는 위로
  function normalFrom(src, k) {
    const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data;
    const out = cnv(w, h), og = out.getContext('2d'), od = og.createImageData(w, h), o = od.data;
    const H = (x, y) => d[(clamp(y, 0, h - 1) * w + ((x + w) % w)) * 4];
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
  // 조각 무늬 띠 8개(띠마다 64px): 0 구슬 · 1 달걀과 화살 · 2 아칸서스 잎 · 3 꼰 줄 · 4 갈대 · 5 민무늬(젯소) · 6 리본 감기 · 7 부채살(모서리 조개)
  const NB = 8, BH = 64, AW = 1024;
  const ornH = (() => {
    const c = cnv(AW, BH * NB), g = c.getContext('2d');
    g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, AW, BH * NB);
    const band = (k, bg, fn) => { g.save(); g.beginPath(); g.rect(0, k * BH, AW, BH); g.clip(); g.translate(0, k * BH); g.fillStyle = `rgb(${bg},${bg},${bg})`; g.fillRect(0, 0, AW, BH); fn(); g.restore(); };
    band(0, 96, () => { for (let x = 16; x < AW + 32; x += 32) dome(g, x, 32, 14, 15); });
    band(1, 92, () => {
      for (let x = 32; x < AW + 64; x += 64) {
        dome(g, x, 30, 26, 30, 0, 200, 110); dome(g, x, 30, 21, 25, 0, 95, 80); dome(g, x, 30, 17, 21, 0, 255, 120);
        g.fillStyle = 'rgb(210,210,210)'; g.beginPath(); g.moveTo(x + 27, 2); g.lineTo(x + 37, 2); g.lineTo(x + 32, 60); g.closePath(); g.fill();
      }
    });
    band(2, 88, () => {
      for (let x = 0; x < AW + 128; x += 128) {
        for (let i = 0; i < 9; i++) { const t = i / 8, px = x - 52 + t * 104, py = 52 - Math.sin(t * Math.PI * 0.9) * 26 - t * 18, r = lerp(17, 6, t); dome(g, px, py, r * 1.15, r, -0.6 + t * 0.9, 245, 120); }
        for (let i = 0; i < 4; i++) { const t = (i + 0.5) / 4, px = x - 40 + t * 80, py = 58 - t * 30; dome(g, px + 10, py + 6, 9, 5, 0.9, 200, 110); }
        g.strokeStyle = 'rgb(70,70,70)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x - 52, 54); g.quadraticCurveTo(x, 36, x + 52, 12); g.stroke();
        for (let i = 0; i < 6; i++) { const t = (i + 0.5) / 6; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - 52 + t * 104, 54 - t * 40); g.lineTo(x - 44 + t * 104, 62 - t * 36); g.stroke(); }
      }
    });
    band(3, 100, () => { for (let x = -20; x < AW + 40; x += 20) dome(g, x, 32, 9, 36, 0.62, 245, 100); });
    band(4, 110, () => { for (let k = 0; k < 4; k++) { const y = 8 + k * 16, gr = g.createLinearGradient(0, y - 8, 0, y + 8); gr.addColorStop(0, 'rgb(95,95,95)'); gr.addColorStop(0.5, 'rgb(235,235,235)'); gr.addColorStop(1, 'rgb(95,95,95)'); g.fillStyle = gr; g.fillRect(0, y - 8, AW, 16); } });
    band(5, 128, () => { const r2 = rng(5); for (let i = 0; i < 2600; i++) { const v = 118 + r2() * 22 | 0; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(r2() * AW, r2() * BH, 1 + r2() * 5, 1 + r2() * 2); } });
    band(6, 96, () => {
      for (let x = -40; x < AW + 48; x += 48) {
        const gr = g.createLinearGradient(x, 0, x + 26, 0); gr.addColorStop(0, 'rgb(110,110,110)'); gr.addColorStop(0.5, 'rgb(245,245,245)'); gr.addColorStop(1, 'rgb(120,120,120)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 24, 0); g.lineTo(x + 46, BH); g.lineTo(x + 22, BH); g.closePath(); g.fill();
      }
    });
    band(7, 90, () => { for (let x = 0; x < AW + 16; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgb(80,80,80)'); gr.addColorStop(0.5, 'rgb(240,240,240)'); gr.addColorStop(1, 'rgb(80,80,80)'); g.fillStyle = gr; g.fillRect(x, 0, 16, BH); } });
    return c;
  })();
  const ornN = tex(normalFrom(ornH, 7.5), false); ornN.wrapS = T.RepeatWrapping;
  // 금박의 색(파인 곳엔 때 · 붉은 볼), 거칠기(솟은 곳은 닳아 반들반들)
  const [ornCol, ornRough] = (() => {
    const w = AW, h = BH * NB, d = ornH.getContext('2d').getImageData(0, 0, w, h).data;
    const cc = cnv(w, h), rc = cnv(w, h), cg = cc.getContext('2d'), rg = rc.getContext('2d'), ci = cg.createImageData(w, h), ri = rg.createImageData(w, h), r2 = rng(9);
    for (let i = 0; i < w * h; i++) {
      const v = d[i * 4] / 255, n = r2(), t = sstep(0.32, 0.8, v);
      ci.data[i * 4] = lerp(150, 255, t) * (0.96 + n * 0.04); ci.data[i * 4 + 1] = lerp(104, 246, t) * (0.95 + n * 0.05); ci.data[i * 4 + 2] = lerp(56, 220, t); ci.data[i * 4 + 3] = 255;
      const r = clamp(0.62 - t * 0.4 + (n - 0.5) * 0.12, 0.12, 0.9) * 255; ri.data[i * 4] = ri.data[i * 4 + 1] = ri.data[i * 4 + 2] = r; ri.data[i * 4 + 3] = 255;
    }
    cg.putImageData(ci, 0, 0); rg.putImageData(ri, 0, 0);
    const a = tex(cc, true), b = tex(rc, false); a.wrapS = b.wrapS = T.RepeatWrapping; return [a, b];
  })();
  // 호두나무 결
  const woodC = (() => {
    const c = cnv(512, 512), g = c.getContext('2d'), r2 = rng(3);
    g.fillStyle = '#4a2c1a'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 230; i++) {
      const y0 = r2() * 512, a = 2 + r2() * 9, f = 0.004 + r2() * 0.01, ph = r2() * 6, dark = r2() < 0.6;
      g.strokeStyle = dark ? `rgba(28,14,7,${0.15 + r2() * 0.35})` : `rgba(120,72,38,${0.08 + r2() * 0.2})`; g.lineWidth = 0.6 + r2() * 2.4;
      g.beginPath(); for (let x = -4; x <= 516; x += 8) { const y = y0 + Math.sin(x * f + ph) * a + Math.sin(x * f * 3.1 + ph) * a * 0.3; x < 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
    }
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(15,8,4,${r2() * 0.35})`; g.fillRect(r2() * 512, r2() * 512, 1 + r2() * 3, 1); }
    return c;
  })();
  const woodT = tex(woodC, true, true);
  // 붉은 다마스크(벨벳 꽃무늬가 살짝 솟음) — 나다르의 붉은 방
  const [damC, damH] = (() => {   // 벨벳 꽃무늬는 색 차이를 거의 두지 않고 결(노멀)로만 — 빛이 비스듬히 닿는 곳에서만 보인다
    const S = 512, c = cnv(S, S), h = cnv(S, S), g = c.getContext('2d'), gh = h.getContext('2d');
    g.fillStyle = '#58101a'; g.fillRect(0, 0, S, S); gh.fillStyle = '#606060'; gh.fillRect(0, 0, S, S);
    const motif = (ctx, fill) => {
      ctx.fillStyle = fill;
      for (const [ox, oy] of [[0, 0], [S / 2, S / 2], [S, 0], [0, S], [S, S], [S / 2, -S / 2], [-S / 2, S / 2], [S / 2, S * 1.5], [S * 1.5, S / 2]]) {
        ctx.save(); ctx.translate(ox + S / 4, oy + S / 4);
        for (const sx of [1, -1]) {
          ctx.save(); ctx.scale(sx, 1); ctx.beginPath();
          ctx.moveTo(0, -110); ctx.bezierCurveTo(30, -90, 70, -70, 58, -24); ctx.bezierCurveTo(48, 8, 84, 30, 64, 66); ctx.bezierCurveTo(48, 92, 18, 96, 0, 120);
          ctx.lineTo(0, 92); ctx.bezierCurveTo(14, 70, 36, 58, 30, 30); ctx.bezierCurveTo(22, 0, 16, -40, 0, -60); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.ellipse(26, -4, 10, 18, 0.4, 0, 6.28); ctx.fill();
          ctx.beginPath(); ctx.ellipse(40, 80, 7, 12, -0.6, 0, 6.28); ctx.fill();
          ctx.restore();
        }
        ctx.beginPath(); ctx.ellipse(0, 0, 14, 26, 0, 0, 6.28); ctx.fill(); ctx.beginPath(); ctx.arc(0, -84, 9, 0, 6.28); ctx.fill();
        ctx.restore();
      }
    };
    motif(g, '#5f1219'); motif(gh, '#a4a4a4');
    g.strokeStyle = 'rgba(150,60,60,.18)'; g.lineWidth = 1.5; for (let x = 0; x < S; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke(); }
    const r2 = rng(4);
    for (let i = 0; i < 9000; i++) { const x = r2() * S, y = r2() * S; g.fillStyle = `rgba(${r2() < 0.5 ? '20,0,0' : '150,50,50'},${r2() * 0.08})`; g.fillRect(x, y, 1, 2 + r2() * 3); }
    return [c, normalFrom(h, 2.2)];
  })();
  const damT = tex(damC, true, true), damN = tex(damH, false, true);
  // 헤링본 쪽매
  const parC = (() => {
    const c = cnv(512, 512), g = c.getContext('2d'), r2 = rng(6);
    g.fillStyle = '#1c100a'; g.fillRect(0, 0, 512, 512);
    const L = 128, Wd = 32;
    for (let row = -4; row < 12; row++) for (let k = -2; k < 10; k++) {
      for (const s of [1, -1]) {
        g.save(); g.translate(k * 2 * Wd * 1.414 + (s > 0 ? 0 : Wd * 1.414), row * Wd * 1.414 * 2 + (s > 0 ? 0 : Wd * 0.707)); g.rotate(s * Math.PI / 4);
        const v = 0.75 + r2() * 0.4; g.fillStyle = `rgb(${88 * v | 0},${52 * v | 0},${30 * v | 0})`; g.fillRect(0, 0, L, Wd - 1.5);
        g.globalAlpha = 0.25; for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(30,14,6,1)'; g.fillRect(0, r2() * Wd, L, 0.8); } g.globalAlpha = 1; g.restore();
      }
    }
    return c;
  })();
  const parT = tex(parC, true, true);
  // 캔버스 올(그림 면)
  // (노멀맵의 반복값이 그림 판의 uv 를 바꾸므로 반복 없이 촘촘하게 그린다)
  const weaveN = (() => { const c = cnv(512, 640), g = c.getContext('2d'), r2 = rng(2); g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 640); for (let i = 0; i < 640; i += 4) { g.fillStyle = `rgba(255,255,255,${0.25 + r2() * 0.15})`; g.fillRect(0, i, 512, 2); } for (let i = 0; i < 512; i += 4) { g.fillStyle = `rgba(0,0,0,${0.18 + r2() * 0.12})`; g.fillRect(i, 0, 2, 640); } for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(${r2() < 0.5 ? '255,255,255' : '0,0,0'},.25)`; g.lineWidth = 1; g.beginPath(); const x = r2() * 512, y = r2() * 640; g.moveTo(x, y); g.lineTo(x + (r2() - 0.5) * 60, y + (r2() - 0.5) * 60); g.stroke(); } return tex(normalFrom(c, 1.2), false); })();
  // 부드러운 그림자 판 · 빛 번짐 · 연기
  const shadowT = (() => { const c = cnv(128, 128), g = c.getContext('2d'); g.shadowColor = 'rgba(0,0,0,1)'; g.shadowBlur = 18; g.shadowOffsetX = 400; g.fillStyle = '#000'; g.fillRect(-400 + 26, 26, 76, 76); return tex(c, false); })();
  const glowT = (() => { const c = cnv(128, 128), g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,.55)'); gr.addColorStop(0.45, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return tex(c, false); })();
  const puffT = (() => {
    const S = 128, c = cnv(S, S), g = c.getContext('2d'), r2 = rng(8);
    for (let i = 0; i < 16; i++) { const a = r2() * 6.28, d = r2() * S * 0.18, r = S * (0.16 + r2() * 0.14), x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.3)'); gr.addColorStop(0.6, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.28); g.fill(); }
    return tex(c, false);
  })();
  const beamT = (() => { const c = cnv(64, 256), g = c.getContext('2d'), gx = g.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gx; g.fillRect(0, 0, 64, 256); g.globalCompositeOperation = 'destination-in'; const gy = g.createLinearGradient(0, 0, 0, 256); gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.2, 'rgba(0,0,0,1)'); gy.addColorStop(0.8, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gy; g.fillRect(0, 0, 64, 256); return tex(c, false); })();

  // ───────────────────────── 환경(반사): 붉은 방 · 가스 불꽃 몇 개 · 문 쪽 따뜻한 빛
  const pmrem = new T.PMREMGenerator(renderer);
  const envTex = (() => {
    const s = new T.Scene(), basic = (c, k = 1) => new T.MeshBasicMaterial({ color: C(c).multiplyScalar(k), side: T.BackSide });
    const room = new T.Mesh(new T.BoxGeometry(16, 6, 16), basic('#2c0d0c')); room.position.set(0, 2.5, 2); s.add(room);
    const fl = new T.Mesh(new T.PlaneGeometry(16, 16), new T.MeshBasicMaterial({ color: C('#140906') })); fl.rotation.x = -Math.PI / 2; fl.position.y = -0.4; s.add(fl);
    const lamp = (x, y, z, r, k) => { const m = new T.Mesh(new T.SphereGeometry(r, 16, 12), new T.MeshBasicMaterial({ color: C('#ffd296').multiplyScalar(k) })); m.position.set(x, y, z); s.add(m); };
    lamp(-3, 3.9, 3, 0.5, 9); lamp(3, 3.9, 3, 0.5, 9); lamp(0, 4.6, 6, 0.8, 5); lamp(-5, 1.9, 0.5, 0.25, 12); lamp(5, 1.9, 0.5, 0.25, 12); lamp(1.5, 1.2, 4, 0.3, 6);
    const pane = new T.Mesh(new T.PlaneGeometry(6, 3), new T.MeshBasicMaterial({ color: C('#7a4a2a').multiplyScalar(1.6), side: T.DoubleSide })); pane.position.set(0, 2.2, 9.5); s.add(pane);
    const t = pmrem.fromScene(s, 0.035).texture; return t;
  })();

  // ───────────────────────── 재질
  const M = {
    gilt: new T.MeshStandardMaterial({ color: C('#efc46e'), metalness: 1, roughness: 1, map: ornCol, roughnessMap: ornRough, normalMap: ornN, normalScale: new T.Vector2(1, 1), vertexColors: true, envMapIntensity: 1.25 }),
    giltOld: new T.MeshStandardMaterial({ color: C('#d2a457'), metalness: 1, roughness: 1, map: ornCol, roughnessMap: ornRough, normalMap: ornN, normalScale: new T.Vector2(1.1, 1.1), vertexColors: true, envMapIntensity: 1.1 }),
    giltPale: new T.MeshStandardMaterial({ color: C('#f2d48c'), metalness: 1, roughness: 0.9, map: ornCol, roughnessMap: ornRough, normalMap: ornN, vertexColors: true, envMapIntensity: 1.3 }),
    black: new T.MeshStandardMaterial({ color: C('#0d0a09'), metalness: 0.1, roughness: 0.22, vertexColors: true, envMapIntensity: 1.2 }),
    walnut: new T.MeshStandardMaterial({ color: C('#b08060'), map: woodT, metalness: 0, roughness: 0.42, vertexColors: true, envMapIntensity: 0.8 }),
    wood: new T.MeshStandardMaterial({ color: C('#9a7458'), map: woodT, metalness: 0, roughness: 0.5, envMapIntensity: 0.6 }),
    velvet: new T.MeshStandardMaterial({ color: C('#3c0b12'), roughness: 1, metalness: 0, envMapIntensity: 0.25 }),
    mat: new T.MeshStandardMaterial({ color: C('#e6dac0'), roughness: 0.92, metalness: 0, envMapIntensity: 0.35 }),
    matCore: new T.MeshStandardMaterial({ color: C('#f6efe0'), roughness: 0.85, metalness: 0, envMapIntensity: 0.35, vertexColors: true }),
    brass: new T.MeshStandardMaterial({ color: C('#d4a957'), metalness: 1, roughness: 0.3, envMapIntensity: 1.2 }),
    iron: new T.MeshStandardMaterial({ color: C('#1b1716'), metalness: 0.7, roughness: 0.45 }),
    wall: new T.MeshStandardMaterial({ color: C('#b89a9a'), map: damT, normalMap: damN, normalScale: new T.Vector2(0.45, 0.45), roughness: 0.78, metalness: 0, envMapIntensity: 0.3 }),
    slab: new T.MeshStandardMaterial({ color: C('#1a0c0a'), roughness: 0.9 }),
    floor: new T.MeshStandardMaterial({ color: C('#ffffff'), map: parT, roughness: 0.34, metalness: 0, envMapIntensity: 0.7 }),
    ceil: new T.MeshStandardMaterial({ color: C('#2a120d'), roughness: 1 }),
    curtain: new T.MeshStandardMaterial({ color: C('#5c0e14'), roughness: 0.95, metalness: 0, envMapIntensity: 0.3, side: T.DoubleSide }),
    shadow: new T.MeshBasicMaterial({ map: shadowT, color: 0x000000, transparent: true, opacity: 0.62, depthWrite: false, toneMapped: false }),
  };
  M.walnut.map = woodT;

  // ───────────────────────── 몰딩: 단면(d = 안쪽 턱에서 바깥으로 0..1, z = 높이 0..1)을 둘레를 따라 쓸어 낸다
  // 명령: {p:[d,z]} 점 · {a:[cx,cz,r,a0,a1,n]} 호(도) · b = 무늬 띠 · m = 재질 번호(그 점으로 끝나는 구간)
  function prof(cmds) {
    const P = []; let b = 5, m = 0;
    for (const c of cmds) {
      if (c.b !== undefined) b = c.b; if (c.m !== undefined) m = c.m;
      if (c.p) P.push({ d: c.p[0], z: c.p[1], b, m });
      if (c.a) { const [cx, cz, r, a0, a1, n] = c.a; for (let i = 1; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; P.push({ d: cx + r * Math.cos(a), z: cz + r * Math.sin(a), b, m }); } }
    }
    return P;
  }
  const PROF = {
    rococo: prof([{ p: [0, 0.22] }, { p: [0, 0.4] }, { b: 1, a: [0.12, 0.4, 0.12, 180, 90, 5] }, { b: 5, p: [0.15, 0.52] }, { p: [0.15, 0.56] }, { b: 5, a: [0.15, 0.795, 0.235, -90, 0, 6] }, { p: [0.4, 0.8] }, { b: 2, a: [0.62, 0.8, 0.22, 180, 0, 9] }, { b: 5, p: [0.86, 0.76] }, { b: 3, a: [0.93, 0.76, 0.07, 180, 0, 5] }, { b: 5, p: [1, 0.0] }]),
    ebony: prof([{ m: 0, p: [0, 0.25] }, { p: [0, 0.42] }, { b: 0, a: [0.04, 0.42, 0.04, 180, 0, 5] }, { b: 5, p: [0.1, 0.42] }, { m: 1, p: [0.1, 0.55] }, { p: [0.45, 0.74] }, { p: [0.72, 0.84] }, { m: 0, p: [0.74, 0.84] }, { b: 0, a: [0.8, 0.84, 0.06, 180, 0, 5] }, { b: 5, m: 1, p: [0.88, 0.8] }, { a: [0.88, 0.7, 0.1, 90, 0, 4] }, { p: [1, 0.0] }]),
    oval: prof([{ p: [0, 0.25] }, { p: [0, 0.45] }, { b: 1, a: [0.15, 0.45, 0.15, 180, 90, 5] }, { b: 5, p: [0.2, 0.6] }, { b: 6, a: [0.55, 0.6, 0.35, 180, 0, 10] }, { b: 0, a: [0.95, 0.6, 0.05, 180, 0, 4] }, { b: 5, p: [1, 0.0] }]),
    walnut: prof([{ m: 0, p: [0, 0.2] }, { p: [0, 0.32] }, { b: 0, a: [0.05, 0.32, 0.05, 180, 0, 4] }, { b: 5, p: [0.12, 0.36] }, { m: 1, p: [0.13, 0.44] }, { p: [0.7, 0.92] }, { a: [0.82, 0.92, 0.12, 180, 0, 6] }, { p: [1, 0.85] }, { p: [1, 0.0] }]),
    fillet: prof([{ p: [0, 0.3] }, { p: [0, 0.55] }, { b: 4, a: [0.5, 0.55, 0.5, 180, 0, 8] }, { b: 5, p: [1, 0.0] }]),
    mini: prof([{ p: [0, 0.3] }, { p: [0, 0.5] }, { b: 0, a: [0.3, 0.5, 0.3, 180, 90, 5] }, { b: 5, p: [0.6, 0.8] }, { b: 3, a: [0.8, 0.8, 0.2, 180, 0, 5] }, { b: 5, p: [1, 0.0] }]),
    cdv: prof([{ p: [0, 0.3] }, { p: [0, 0.6] }, { p: [0.6, 0.92] }, { a: [0.8, 0.82, 0.2, 90, 0, 4] }, { p: [1, 0.0] }]),
    empire: prof([{ p: [0, 0.18] }, { p: [0, 0.32] }, { b: 0, a: [0.03, 0.32, 0.03, 180, 0, 4] }, { b: 5, p: [0.07, 0.36] }, { b: 1, a: [0.17, 0.36, 0.1, 180, 90, 5] }, { b: 5, p: [0.19, 0.46] }, { p: [0.19, 0.5] }, { b: 5, a: [0.19, 0.8, 0.3, -90, 0, 7] }, { p: [0.51, 0.8] }, { b: 2, a: [0.7, 0.8, 0.19, 180, 0, 9] }, { b: 5, p: [0.91, 0.76] }, { b: 3, a: [0.955, 0.76, 0.045, 180, 0, 4] }, { b: 5, p: [1, 0.0] }]),
    bead: prof([{ p: [0, 0.0] }, { b: 0, a: [0.5, 0.0, 0.5, 180, 0, 6] }]),
    bevel: prof([{ p: [-1, -1] }, { p: [0, 0] }]),
  };
  const PERIOD = [0.024, 0.05, 0.1, 0.018, 0.4, 0.3, 0.036, 0.012];   // 띠마다 무늬 한 번의 길이(m)
  // 둘레(path): 사각은 네 변(마이터), 타원은 한 바퀴. sample = { pos(off) → [x,y], o:[ox,oy] 바깥 방향, s: 길이 좌표 }
  const rectPath = (hw, hh) => [
    [{ pos: (o) => [-(hw + o), hh + o], o: [0, 1], s: (o) => -(hw + o) }, { pos: (o) => [hw + o, hh + o], o: [0, 1], s: (o) => hw + o }],
    [{ pos: (o) => [hw + o, hh + o], o: [1, 0], s: (o) => -(hh + o) }, { pos: (o) => [hw + o, -(hh + o)], o: [1, 0], s: (o) => hh + o }],
    [{ pos: (o) => [hw + o, -(hh + o)], o: [0, -1], s: (o) => -(hw + o) }, { pos: (o) => [-(hw + o), -(hh + o)], o: [0, -1], s: (o) => hw + o }],
    [{ pos: (o) => [-(hw + o), -(hh + o)], o: [-1, 0], s: (o) => -(hh + o) }, { pos: (o) => [-(hw + o), hh + o], o: [-1, 0], s: (o) => hh + o }],
  ];
  const ovalPath = (rx, ry, N = 72) => {
    const strip = [];
    for (let j = 0; j <= N; j++) {
      const a = j / N * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), nx = c / rx, ny = s / ry, l = Math.hypot(nx, ny);
      strip.push({ pos: (o) => [(rx + o) * c, (ry + o) * s], o: [nx / l, ny / l], s: () => a * (rx + ry) / 2 });
    }
    return [strip];
  };
  function sweep(P, path, Mw, Dz, nMat) {
    const segs = []; for (let i = 1; i < P.length; i++) segs.push({ a: P[i - 1], b: P[i], band: P[i].b, mat: P[i].m });
    const sn = segs.map((s) => { const dd = (s.b.d - s.a.d) * Mw, dz = (s.b.z - s.a.z) * Dz, l = Math.hypot(dd, dz) || 1; return [-dz / l, dd / l]; });
    const nrm = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }, dot = (a, b) => a[0] * b[0] + a[1] * b[1];
    const en = segs.map((s, i) => {
      let n0 = sn[i], n1 = sn[i];
      if (i > 0 && dot(sn[i - 1], sn[i]) > 0.7) n0 = nrm([sn[i - 1][0] + sn[i][0], sn[i - 1][1] + sn[i][1]]);
      if (i < segs.length - 1 && dot(sn[i], sn[i + 1]) > 0.7) n1 = nrm([sn[i][0] + sn[i + 1][0], sn[i][1] + sn[i + 1][1]]);
      return [n0, n1];
    });
    // 띠 안에서의 v(같은 띠가 이어지는 구간의 길이 비율)
    const vv = []; let i0 = 0;
    while (i0 < segs.length) {
      let i1 = i0; while (i1 + 1 < segs.length && segs[i1 + 1].band === segs[i0].band) i1++;
      const len = []; let tot = 0; for (let i = i0; i <= i1; i++) { const l = Math.hypot((segs[i].b.d - segs[i].a.d) * Mw, (segs[i].b.z - segs[i].a.z) * Dz); len.push(l); tot += l; }
      let acc = 0; for (let i = i0; i <= i1; i++) { const l = len[i - i0]; vv[i] = [acc / (tot || 1), (acc + l) / (tot || 1)]; acc += l; }
      i0 = i1 + 1;
    }
    const zs = P.map((p) => p.z), zmin = Math.min(...zs), zmax = Math.max(...zs);
    const out = Array.from({ length: nMat }, () => ({ p: [], n: [], u: [], c: [], i: [] }));
    for (const strip of path) for (let k = 0; k < segs.length; k++) {
      const s = segs[k], o = out[s.mat] || out[0], band = s.band, per = PERIOD[band];
      const vb = (t) => 1 - (band + 0.08 + 0.84 * t) / NB;
      const ao = (p, n2) => (0.5 + 0.5 * sstep(zmin, zmax, p.z)) * (n2[0] > 0.8 ? 0.72 : 1);
      for (let j = 0; j < strip.length - 1; j++) {
        const A = strip[j], B = strip[j + 1], base = o.p.length / 3;
        const put = (S, pp, n2, v) => {
          const off = pp.d * Mw, xy = S.pos(off), on = S.o;
          o.p.push(xy[0], xy[1], pp.z * Dz); o.n.push(on[0] * n2[0], on[1] * n2[0], n2[1]); o.u.push(S.s(off) / per, vb(v)); const a = ao(pp, n2); o.c.push(a, a, a);
        };
        put(A, s.a, en[k][0], vv[k][0]); put(B, s.a, en[k][0], vv[k][0]); put(A, s.b, en[k][1], vv[k][1]); put(B, s.b, en[k][1], vv[k][1]);
        // 감김 방향: 면의 법선이 정점 법선과 같은 쪽을 보게
        const p = o.p, q = (ix) => [p[(base + ix) * 3], p[(base + ix) * 3 + 1], p[(base + ix) * 3 + 2]];
        const v0 = q(0), v1 = q(1), v2 = q(2), e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]], e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
        const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], nn = [o.n[base * 3], o.n[base * 3 + 1], o.n[base * 3 + 2]];
        if (cr[0] * nn[0] + cr[1] * nn[1] + cr[2] * nn[2] >= 0) o.i.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
        else o.i.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      }
    }
    return out.map((o) => {
      if (!o.i.length) return null;
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(o.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(o.n, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(o.u, 2)); g.setAttribute('color', new T.Float32BufferAttribute(o.c, 3)); g.setIndex(o.i);
      return g;
    });
  }
  // 모서리 조개 장식(로코코 · 엠파이어) — 부채꼴 가장자리가 물결치는 조개 + 양옆으로 말린 잎. 부채살 무늬(띠 7)를 방사형으로 입힌다
  function shellGeo(R0, depth, spread = 1) {
    const sh = new T.Shape(), N = 40;
    for (let i = 0; i <= N; i++) {
      const t = i / N, phi = (t - 0.5) * Math.PI * 1.25 * spread, r = R0 * (0.62 + 0.38 * Math.cos(phi * 0.8)) * (0.88 + 0.12 * Math.abs(Math.cos(phi * 6)));
      const x = Math.sin(phi) * r, y = Math.cos(phi) * r; i ? sh.lineTo(x, y) : sh.moveTo(x, y);
    }
    sh.quadraticCurveTo(R0 * 0.55, -R0 * 0.1, R0 * 0.95, -R0 * 0.42); sh.quadraticCurveTo(R0 * 0.62, -R0 * 0.5, R0 * 0.3, -R0 * 0.28);
    sh.quadraticCurveTo(0, -R0 * 0.42, -R0 * 0.3, -R0 * 0.28); sh.quadraticCurveTo(-R0 * 0.62, -R0 * 0.5, -R0 * 0.95, -R0 * 0.42); sh.quadraticCurveTo(-R0 * 0.55, -R0 * 0.1, 0, 0);
    const g = new T.ExtrudeGeometry(sh, { depth: depth * 0.4, bevelEnabled: true, bevelThickness: depth * 0.6, bevelSize: R0 * 0.12, bevelSegments: 3, curveSegments: 6 });
    const p = g.attributes.position, uv = g.attributes.uv, col = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, y), r = Math.hypot(x, y) / (R0 * 1.1);
      uv.setXY(i, a * R0 * 1.4 / PERIOD[7], 1 - (7 + 0.08 + 0.84 * clamp(r, 0, 1)) / NB);
      const c = 0.6 + 0.4 * clamp(z / depth, 0, 1); col.push(c, c, c);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    return g;
  }
  const disposeLater = [];

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
// 니스 빛 띠(그림 쪽 고르기): uGlow 0→1 동안 대각선으로 한 번 지나간다
float c4band(vec2 uv){ float e = uv.x*0.55 + (1.0-uv.y)*0.45; return uGlow > 0.0 ? exp(-pow((uGlow*1.5-0.25 - e)/0.09, 2.0)) : 0.0; }`;
  function picMaterial(paintT, photoT) {
    const m = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0, normalMap: weaveN, normalScale: new T.Vector2(0.22, 0.22), envMapIntensity: 0.35 });
    const u = { tPaint: { value: paintT }, tPhoto: { value: photoT }, uT: { value: 0 }, uDir: { value: 1 }, uFlash: { value: 0 }, uGlow: { value: 0 }, uSeed: { value: R() * 20 } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + PIC_GLSL)
        .replace('#include <map_fragment>', 'float sheen = 0.0; vec3 pcol = c4pic(vUv, sheen); diffuseColor.rgb *= pcol;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += pcol*0.07 + vec3(1.0,0.97,0.93)*uFlash*1.8 + vec3(1.0,0.62,0.3)*(sheen*0.85 + c4band(vUv)*0.75)*(0.25+pcol);');
    };
    m.customProgramCacheKey = () => 'c4pic';
    return { m, u };
  }

  // ───────────────────────── 그림 · 사진 판(캔버스에 맞춰 얹기). 사진은 알부민 빛(따뜻한 갈색)으로, 큰 액자는 명함판 대지째
  const imgs = {};
  await Promise.all(people.flatMap((p) => ['paint', 'photo'].map(async (k) => { imgs[`${p.id}-${k}`] = await loadImg(thumb(p.id, k)); })));
  const cover = (g, im, x, y, w, h) => { if (!im) { g.fillStyle = '#3a2a20'; g.fillRect(x, y, w, h); return; } const s = Math.max(w / im.naturalWidth, h / im.naturalHeight), sw = w / s, sh = h / s; g.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, x, y, w, h); };
  const albumen = (g, x, y, w, h) => { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(244,214,168,.85)'; g.fillRect(x, y, w, h); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(40,24,12,.9)'; g.fillRect(x, y, w, h); g.restore(); };
  function paintTex(id, big) { const W = big ? 384 : 256, H = W * 1.25, c = cnv(W, H), g = c.getContext('2d'); cover(g, imgs[`${id}-paint`], 0, 0, W, H); return tex(c); }
  function photoTex(id, big, card, arch) {
    const W = big ? 384 : 256, H = W * 1.25, c = cnv(W, H), g = c.getContext('2d'), im = imgs[`${id}-photo`];
    if (!card) { cover(g, im, 0, 0, W, H); albumen(g, 0, 0, W, H); return tex(c); }
    // 명함판 대지: 크림색 판 · 창(아치 또는 둥근 모서리) · 금선 · 스튜디오 이름(기록된 곳만)
    const pg = g.createLinearGradient(0, 0, W, H); pg.addColorStop(0, '#efe4cb'); pg.addColorStop(0.7, '#e0d1af'); pg.addColorStop(1, '#d4c29b'); g.fillStyle = pg; g.fillRect(0, 0, W, H);
    const r2 = rng(id.length * 31); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,90,40,${r2() * 0.06})`; g.fillRect(r2() * W, r2() * H, 1 + r2() * 2, 1); }
    const x = W * 0.1, y = H * 0.065, w = W * 0.8, h = H * 0.735, path = () => { g.beginPath(); if (arch) { const r = w / 2; g.moveTo(x, y + h); g.lineTo(x, y + r); g.arc(x + r, y + r, r, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); } else { g.roundRect ? g.roundRect(x, y, w, h, W * 0.02) : g.rect(x, y, w, h); } };
    g.save(); path(); g.clip(); cover(g, im, x, y, w, h); albumen(g, x, y, w, h); g.restore();
    g.strokeStyle = 'rgba(150,112,48,.9)'; g.lineWidth = W * 0.006; path(); g.stroke();
    g.save(); g.translate(0, 0); g.strokeStyle = 'rgba(150,112,48,.45)'; g.lineWidth = W * 0.003; g.strokeRect(W * 0.06, H * 0.04, W * 0.88, H * 0.92); g.restore();
    const st = studioOf(id);
    if (st) { g.fillStyle = '#6e5226'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `italic 400 ${Math.round(W * 0.075)}px Georgia, "Times New Roman", serif`; g.fillText(st, W / 2, H * 0.885); }
    return tex(c);
  }

  // ───────────────────────── 사진관 장면
  const scene = new T.Scene();
  scene.background = C('#0a0605');
  scene.fog = new T.Fog(C('#0a0605'), 9, 22);
  scene.environment = envTex;
  scene.add(new T.HemisphereLight(C('#ffe0bc'), C('#2a0c08'), 0.2));
  const key = new T.DirectionalLight(C('#ffd9a8'), 0.3); key.position.set(-2, 5, 6); scene.add(key);
  const lights = [];
  const addLight = (x, y, z, k, dist, decay, col = '#ffc27a') => { const l = new T.PointLight(C(col), k, dist, decay); l.position.set(x, y, z); scene.add(l); lights.push({ l, k, ph: R() * 10 }); return l; };
  addLight(-1.9, 3.5, 2.2, 1.1, 6.5, 1.4); addLight(1.7, 3.5, 2.2, 1.1, 6.5, 1.4);
  const flashL = new T.PointLight(C('#eef2ff'), 0, 3.4, 2); scene.add(flashL);
  const WHITE = C('#eef2ff'), WARM = C('#ffb760'), sweepPos = new T.Vector3();   // 섬광(흰) · 니스 빛(따뜻한)은 점광원 하나를 번갈아 쓴다

  const root = new T.Group(); scene.add(root);
  // 바닥 · 천장 · 문간의 벨벳 휘장
  const floor = new T.Mesh(new T.PlaneGeometry(30, 16), M.floor); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 6);
  floor.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? 16 : 30) / 1.1; }); scene.add(floor);
  const ceil = new T.Mesh(new T.PlaneGeometry(30, 16), M.ceil); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 4.6, 6); scene.add(ceil);
  const contact = new T.Mesh(new T.PlaneGeometry(30, 0.5), new T.MeshBasicMaterial({ map: beamT, color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false })); contact.rotation.x = -Math.PI / 2; contact.position.set(0, 0.003, 0.15); scene.add(contact);
  const curtains = [];
  for (const sx of [-1, 1]) {
    const g = new T.PlaneGeometry(1.1, 4.6, 40, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), t = (x + 0.55) / 1.1, pinch = 1 - 0.55 * Math.exp(-Math.pow((y + 0.6) / 0.5, 2)) * (sx < 0 ? t : 1 - t); p.setX(i, x * pinch + (sx < 0 ? -0.55 : 0.55) * (1 - pinch)); p.setZ(i, Math.sin(t * Math.PI * 7) * 0.06 * pinch); }
    g.computeVertexNormals(); const m = new T.Mesh(g, M.curtain); m.position.set(sx * 1.15, 2.3, 6.0); scene.add(m); curtains.push(m);
  }

  // 벽 칸(bay): 칸마다 벽 · 징두리 · 레일 · 액자를 한 묶음으로(질문에서 두 문으로 나뉠 때 칸 사이에서 자른다)
  const WALL_TOP = 4.6, DADO = 0.88, RAIL_Y = 4.08;
  const bays = [];
  const box = (w, h, d, mat, x, y, z, r = 0) => { const m = new T.Mesh(r ? new RoundedBoxGeometry(w, h, d, 2, r) : new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
  function makeBay(x0, w) {
    const g = new T.Group(); g.position.x = x0 + w / 2; root.add(g);
    const wallG = new T.PlaneGeometry(w + 0.01, WALL_TOP - DADO); const uv = wallG.attributes.uv, pp = wallG.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pp.getX(i) + x0 + w / 2) / 0.36, (pp.getY(i) + (WALL_TOP + DADO) / 2) / 0.36);
    const wall = new T.Mesh(wallG, M.wall); wall.position.set(0, (WALL_TOP + DADO) / 2, 0.002); g.add(wall);
    g.add(box(w, WALL_TOP, 0.14, M.slab, 0, WALL_TOP / 2, -0.07));
    // 징두리: 판 · 솟은 널 · 걸레받이 · 띠 몰딩
    const woodParts = [new T.BoxGeometry(w, DADO, 0.04).translate(0, DADO / 2, 0.02), new T.BoxGeometry(w, 0.16, 0.035).translate(0, 0.08, 0.055), new RoundedBoxGeometry(w, 0.06, 0.06, 2, 0.02).translate(0, DADO, 0.04)];
    const np = Math.max(1, Math.round(w / 0.62)), pw = w / np;
    for (let i = 0; i < np; i++) woodParts.push(new RoundedBoxGeometry(pw - 0.12, 0.5, 0.03, 2, 0.012).translate(-w / 2 + pw * (i + 0.5), 0.5, 0.045));
    g.add(new T.Mesh(mergeSafe(woodParts), M.wood));
    // 코니스(천장 띠)
    const cs = new T.Shape(); cs.moveTo(0, 0); cs.lineTo(-0.05, 0); cs.quadraticCurveTo(-0.06, 0.12, -0.2, 0.2); cs.lineTo(-0.22, 0.28); cs.lineTo(0, 0.28); cs.closePath();
    const cg = new T.ExtrudeGeometry(cs, { depth: w, bevelEnabled: false, curveSegments: 6 }); cg.rotateY(Math.PI / 2); cg.translate(-w / 2, WALL_TOP - 0.28, 0);
    g.add(new T.Mesh(cg, M.wood));
    // 놋쇠 그림 레일
    const rail = new T.Mesh(new T.CylinderGeometry(0.011, 0.011, w, 10).rotateZ(Math.PI / 2), M.brass); rail.position.set(0, RAIL_Y, 0.035); g.add(rail);
    const bay = { g, x0, w, cx: x0 + w / 2, frames: [], wires: [], shadows: [] };
    bays.push(bay); return bay;
  }
  function mergeSafe(list) {
    const gs = list.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n; });
    return mergeBufferGeometries(gs);
  }

  // 액자 양식 — 몰딩 폭 M · 깊이 D · 재질 · 매트
  const STY = {
    rococo: { prof: 'rococo', Mw: 0.11, Dz: 0.075, mats: [M.gilt], corner: true, card: true },
    ebony: { prof: 'ebony', Mw: 0.075, Dz: 0.05, mats: [M.gilt, M.black], card: true, arch: true },
    oval: { prof: 'oval', Mw: 0.07, Dz: 0.05, mats: [M.giltPale], oval: true },
    walnut: { prof: 'walnut', Mw: 0.09, Dz: 0.085, mats: [M.giltOld, M.walnut], card: true },
    fillet: { prof: 'fillet', Mw: 0.026, Dz: 0.022, mats: [M.gilt], mat: 0.07 },
    mini: { prof: 'mini', Mw: 0.034, Dz: 0.026, mats: [M.giltOld], velvet: 0.05 },
    cdv: { prof: 'cdv', Mw: 0.022, Dz: 0.02, mats: [M.walnut], cdv: true },
    empire: { prof: 'empire', Mw: 0.15, Dz: 0.095, mats: [M.giltOld], corner: true, card: true, arch: true },
  };
  const frames = [], pickables = [];
  const planeShape = (w, h) => { const s = new T.Shape(); s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.closePath(); return s; };
  const rectHole = (w, h, oy) => { const p = new T.Path(); p.moveTo(-w / 2, oy - h / 2); p.lineTo(-w / 2, oy + h / 2); p.lineTo(w / 2, oy + h / 2); p.lineTo(w / 2, oy - h / 2); p.closePath(); return p; };
  const ellPath = (rx, ry, oy = 0) => { const p = new T.Path(); p.absellipse(0, oy, rx, ry, 0, Math.PI * 2, true); return p; };
  const archPath = (w, h, oy = 0) => { const p = new T.Path(), r = w / 2; p.moveTo(-w / 2, oy - h / 2); p.lineTo(-w / 2, oy + h / 2 - r); p.absarc(0, oy + h / 2 - r, r, Math.PI, 0, true); p.lineTo(w / 2, oy - h / 2); p.closePath(); return p; };
  const uvFromPos = (g, w, h) => { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5); return g; };
  // 하나의 액자. spec: { id, style, w, x, y(벽: 가운데 높이 / 받침: 아래 높이), on:'wall'|'stand', lean, z, rot }
  function buildFrame(bay, spec) {
    const S = STY[spec.style], pw = spec.w, ph = pw * 1.25, big = pw >= 0.36;
    const inner = new T.Group(), pivot = new T.Group(); pivot.add(inner);
    let ow = pw, oh = ph;                 // 몰딩 안쪽(시야) 크기
    const zPic = S.Dz * 0.22;
    const paintT = paintTex(spec.id, big), photoT = photoTex(spec.id, big, !!S.card, !!S.arch);
    const { m: pm, u } = picMaterial(paintT, photoT);
    let pic;
    if (S.oval) {
      pic = new T.Mesh(new T.CircleGeometry(0.5, 64), pm); pic.scale.set(pw, ph, 1); pic.position.z = zPic; inner.add(pic);
      const ms = sweep(PROF[S.prof], ovalPath(pw / 2, ph / 2), S.Mw, S.Dz, S.mats.length);
      ms.forEach((g, i) => { if (g) inner.add(new T.Mesh(g, S.mats[i])); });
      ow = pw; oh = ph;
    } else if (S.mat || S.velvet || S.cdv) {
      // 매트(크림색 · 비스듬히 자른 흰 속살) / 벨벳 위 놋쇠 타원 / 명함판 대지(아치 창)
      const mx = S.mat || S.velvet || 0.032, mt = S.cdv ? 0.03 : mx, mb = S.cdv ? 0.07 : mx;
      ow = pw + 2 * mx; oh = ph + mt + mb;
      const cy = (mb - mt) / 2;          // 그림 중심이 매트 중심보다 위로
      const holeW = pw * (S.velvet ? 0.86 : 1), holeH = ph * (S.velvet ? 0.86 : 1), BV = 0.006;
      const sh = planeShape(ow, oh); sh.holes.push(S.velvet ? ellPath(holeW / 2, holeH / 2, cy) : S.cdv ? archPath(pw, ph, cy) : rectHole(pw + 2 * BV, ph + 2 * BV, cy));
      const mg = new T.ShapeGeometry(sh, 24);
      const matMesh = new T.Mesh(mg, S.velvet ? M.velvet : M.mat); matMesh.position.z = S.Dz * 0.32; inner.add(matMesh);
      if (S.mat) { const bv = sweep(PROF.bevel, rectPath(pw / 2 + BV, ph / 2 + BV), BV, BV, 1)[0]; const bm = new T.Mesh(bv, M.matCore); bm.position.set(0, cy, S.Dz * 0.32 + 0.0001); inner.add(bm); }
      if (S.velvet) { const rg = sweep(PROF.bead, ovalPath(holeW / 2, holeH / 2, 64), 0.008, 0.006, 1)[0]; const rm = new T.Mesh(rg, M.giltPale); rm.position.set(0, cy, S.Dz * 0.32); inner.add(rm); }
      if (S.cdv) { const rg = sweep(PROF.bead, [archPts(pw / 2, ph / 2)], 0.005, 0.003, 1)[0]; const rm = new T.Mesh(rg, M.giltPale); rm.position.set(0, cy, S.Dz * 0.32); inner.add(rm); }
      const pg = S.velvet ? uvFromPos(new T.ShapeGeometry((() => { const s = new T.Shape(); s.absellipse(0, 0, holeW / 2 + 0.002, holeH / 2 + 0.002, 0, Math.PI * 2, false); return s; })(), 48), pw, ph)
        : S.cdv ? uvFromPos(new T.ShapeGeometry((() => { const s = new T.Shape(), r = pw / 2; s.moveTo(-pw / 2, -ph / 2); s.lineTo(pw / 2, -ph / 2); s.lineTo(pw / 2, ph / 2 - r); s.absarc(0, ph / 2 - r, r, 0, Math.PI, false); s.closePath(); return s; })(), 32), pw, ph)
          : new T.PlaneGeometry(pw, ph);
      pic = new T.Mesh(pg, pm); pic.position.set(0, cy, S.Dz * 0.2); inner.add(pic);
      const ms = sweep(PROF[S.prof], rectPath(ow / 2, oh / 2), S.Mw, S.Dz, S.mats.length);
      ms.forEach((g, i) => { if (g) inner.add(new T.Mesh(g, S.mats[i])); });
    } else {
      pic = new T.Mesh(new T.PlaneGeometry(pw, ph), pm); pic.position.z = zPic; inner.add(pic);
      const ms = sweep(PROF[S.prof], rectPath(pw / 2, ph / 2), S.Mw, S.Dz, S.mats.length);
      ms.forEach((g, i) => { if (g) inner.add(new T.Mesh(g, S.mats[i])); });
      if (S.corner) {
        const top = Math.max(...PROF[S.prof].map((p) => p.z)) * S.Dz, sg = shellGeo(S.Mw * 0.56, S.Dz * 0.26);
        const cx = pw / 2 + S.Mw * 0.52, cy = ph / 2 + S.Mw * 0.52;
        for (const [sx, sy] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) {
          const m = new T.Mesh(sg, S.mats[0]); m.position.set(sx * cx, sy * cy, top * 0.86); m.rotation.z = Math.atan2(-sx, sy); inner.add(m);
        }
        if (spec.crest) { const cg = shellGeo(S.Mw * 0.95, S.Dz * 0.32, 1.1); const m = new T.Mesh(cg, S.mats[0]); m.position.set(0, ph / 2 + S.Mw * 0.7, top * 0.88); inner.add(m); }
      }
    }
    const OW = ow + 2 * S.Mw, OH = oh + 2 * S.Mw;
    inner.position.y = OH / 2;
    // 놓기: 벽(위가 앞으로 기울어 걸림) · 받침(찬장 위 · 이젤, 뒤로 기댐)
    const lean = spec.lean ?? (spec.on === 'wall' ? clamp(0.02 + (spec.y - 1.6) * 0.022, 0.015, 0.075) : -0.1);
    const ang = Math.asin(clamp(lean / OH, -0.4, 0.4)) * (spec.on === 'wall' ? 1 : 1);
    pivot.rotation.x = spec.on === 'wall' ? ang : -Math.abs(spec.lean ?? 0.18);
    pivot.rotation.z = spec.rot || 0;
    const yb = spec.on === 'wall' ? spec.y - OH / 2 : spec.y;
    pivot.position.set(spec.x, yb, spec.z ?? 0.012);
    bay.g.add(pivot);
    // 그림자: 벽에(빛이 위 · 앞에서 오므로 아래로 조금, 기울수록 크게)
    const sw = OW * 1.22 + 0.06, shh = OH * 1.18 + 0.06;
    if (spec.on === 'wall') {
      const sm = new T.Mesh(new T.PlaneGeometry(sw, shh), M.shadow); sm.position.set(spec.x + 0.015, spec.y - 0.05 - lean * 0.6, 0.004); sm.rotation.z = spec.rot || 0; bay.g.add(sm);
    } else if (spec.shadowWall) {
      const sm = new T.Mesh(new T.PlaneGeometry(sw, shh * 0.9), M.shadow); sm.position.set(spec.x + 0.02, yb + OH * 0.45, 0.004); bay.g.add(sm);
    }
    const f = { i: frames.length, id: spec.id, style: spec.style, pivot, inner, pic, u, ph: false, anim: null, bay, OW, OH, spec, puffed: 0 };
    inner.traverse((o) => { if (o.isMesh) { o.userData.fi = f.i; pickables.push(o); } });
    frames.push(f); bay.frames.push(f);
    return f;
  }
  function archPts(hw, hh) {   // 아치 창 둘레(아래 왼쪽 → 위 아치 → 아래 오른쪽 → 아래 왼쪽)
    const r = hw, cy = hh - r, pts = [];
    pts.push([-hw, -hh]); pts.push([-hw, cy]);
    for (let i = 1; i < 24; i++) { const a = Math.PI - i / 24 * Math.PI; pts.push([Math.cos(a) * r, cy + Math.sin(a) * r]); }
    pts.push([hw, cy]); pts.push([hw, -hh]); pts.push([-hw, -hh]);
    const strip = []; let acc = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i]; let nx, ny;
      if (y > cy + 1e-6) { nx = x / r; ny = (y - cy) / r; } else { const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)]; const tx = next[0] - prev[0], ty = next[1] - prev[1]; const l = Math.hypot(tx, ty) || 1; nx = ty / l; ny = -tx / l; if (Math.abs(y + hh) < 1e-6) { nx = 0; ny = -1; } if (Math.abs(Math.abs(x) - hw) < 1e-6 && y <= cy && y > -hh + 1e-6) { nx = Math.sign(x); ny = 0; } }
      if (i) acc += Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]);
      const s0 = acc; strip.push({ pos: (o) => [x + nx * o, y + ny * o], o: [nx, ny], s: () => s0 });
    }
    return strip;
  }
  // 가스 벽등: 놋쇠 받침 · 휜 팔 · 불꽃 컵 · 유리 공(빛남) + 번짐 + 점광원
  const glowMat = (col, op) => new T.SpriteMaterial({ map: glowT, color: C(col), transparent: true, opacity: op, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
  const flames = [];
  function sconce(bay, x, y) {
    const g = new T.Group(); g.position.set(x, y, 0); bay.g.add(g);
    g.add(new T.Mesh(new T.CylinderGeometry(0.05, 0.06, 0.02, 20).rotateX(Math.PI / 2).translate(0, 0, 0.012), M.brass));
    const curve = new T.CatmullRomCurve3([new T.Vector3(0, 0, 0.02), new T.Vector3(0, -0.05, 0.1), new T.Vector3(0, 0.0, 0.2), new T.Vector3(0, 0.08, 0.24)]);
    g.add(new T.Mesh(new T.TubeGeometry(curve, 24, 0.008, 8), M.brass));
    g.add(new T.Mesh(new T.LatheGeometry([new T.Vector2(0.004, 0), new T.Vector2(0.03, 0.01), new T.Vector2(0.034, 0.04), new T.Vector2(0.02, 0.05)], 16).translate(0, 0.07, 0.24), M.brass));
    const globe = new T.Mesh(new T.SphereGeometry(0.07, 24, 16), new T.MeshStandardMaterial({ color: C('#f4c890'), emissive: C('#e8893a'), emissiveIntensity: 1.0, roughness: 0.3, transparent: true, opacity: 0.92 })); globe.position.set(0, 0.17, 0.24); g.add(globe);
    const sp = new T.Sprite(glowMat('#ff9e48', 0.6)); sp.scale.set(0.7, 0.7, 1); sp.position.set(0, 0.17, 0.27); g.add(sp);
    const l = new T.PointLight(C('#ffb768'), 0.9, 2.8, 2); l.position.set(0, 0.17, 0.32); g.add(l);
    flames.push({ globe, sp, l, ph: R() * 10 });
  }

  // ── 걸기(살롱식). 칸 너비 · 액자(양식 · 그림 폭 · 위치). 24명은 c4.js 순서대로 채운다(사람 목록은 바꾸지 않는다)
  const BAYS = [
    { w: 1.0, filler: true },
    { w: 0.9, f: [['fillet', 0.3, -0.04, 3.4], ['rococo', 0.5, 0, 2.5], ['oval', 0.36, 0.03, 1.55]] },
    { w: 1.1, f: [['empire', 0.42, -0.05, 3.22], ['walnut', 0.34, -0.17, 2.24], ['mini', 0.15, 0.33, 2.44], ['mini', 0.15, 0.33, 1.99], ['cdv', 0.17, -0.12, 1.45]], sconceR: true },
    { w: 1.5, sideboard: true, f: [['walnut', 0.3, -0.36, 0.91, 'stand', { lean: 0.2, z: 0.1, shadowWall: true }], ['ebony', 0.2, 0.18, 0.91, 'stand', { lean: 0.26, z: 0.3 }], ['rococo', 0.5, -0.12, 2.22], ['fillet', 0.28, 0.48, 2.5], ['oval', 0.3, -0.1, 3.22]] },
    { w: 0.86, f: [['ebony', 0.38, 0, 3.12], ['oval', 0.32, 0.02, 2.14, 'wall', { rot: 0.01 }]] },
    { w: 1.24, easel: true, f: [['empire', 0.42, 0, 0.0, 'easel'], ['walnut', 0.36, -0.28, 3.25], ['fillet', 0.26, 0.34, 2.82]] },
    { w: 1.0, f: [['oval', 0.28, 0, 3.5], ['rococo', 0.48, 0, 2.6, 'wall', { crest: true }], ['mini', 0.14, -0.21, 1.66], ['mini', 0.14, 0.21, 1.7]], sconceR: true },
    { w: 0.9, f: [['walnut', 0.4, 0, 2.9, 'wall', { rot: -0.008 }], ['ebony', 0.28, 0.02, 1.78]] },
    { w: 1.0, filler: true },
  ];
  const SCALE = 1.12;
  const TOTAL = BAYS.reduce((a, b) => a + b.w, 0);
  let xc = -TOTAL / 2, pi = 0;
  const easelObjs = [];
  for (const B of BAYS) {
    const bay = makeBay(xc, B.w); xc += B.w;
    bay.filler = !!B.filler;
    if (B.sideboard) {
      const sbW = 1.5, sb = new T.Group(); sb.position.set(0, 0, 0.27); bay.g.add(sb);
      sb.add(box(sbW, 0.76, 0.46, M.wood, 0, 0.16 + 0.38, 0, 0.012));
      sb.add(box(sbW + 0.08, 0.045, 0.52, M.wood, 0, 0.94, 0.0, 0.015));
      for (let i = 0; i < 3; i++) { sb.add(box(0.42, 0.52, 0.025, M.wood, -0.48 + i * 0.48, 0.52, 0.235, 0.01)); sb.add(new T.Mesh(new T.SphereGeometry(0.014, 12, 8), M.brass).translateX(-0.48 + i * 0.48 + 0.16).translateY(0.55).translateZ(0.26)); }
      for (const [lx, lz] of [[-0.68, -0.18], [0.68, -0.18], [-0.68, 0.18], [0.68, 0.18]]) sb.add(new T.Mesh(new T.LatheGeometry([new T.Vector2(0.02, 0), new T.Vector2(0.035, 0.04), new T.Vector2(0.025, 0.09), new T.Vector2(0.04, 0.14), new T.Vector2(0.04, 0.16)], 12), M.wood).translateX(lx).translateZ(lz));
      // 찬장 위 램프
      const lamp = new T.Group(); lamp.position.set(0.58, 0.965, 0.05); sb.add(lamp);
      lamp.add(new T.Mesh(new T.LatheGeometry([new T.Vector2(0.0, 0), new T.Vector2(0.07, 0), new T.Vector2(0.06, 0.03), new T.Vector2(0.02, 0.06), new T.Vector2(0.015, 0.2), new T.Vector2(0.05, 0.26), new T.Vector2(0.03, 0.3)], 20), M.brass));
      const globe = new T.Mesh(new T.SphereGeometry(0.085, 24, 16), new T.MeshStandardMaterial({ color: C('#f4c890'), emissive: C('#e8893a'), emissiveIntensity: 1.0, roughness: 0.25, transparent: true, opacity: 0.9 })); globe.position.y = 0.37; lamp.add(globe);
      const sp = new T.Sprite(glowMat('#ff9e48', 0.6)); sp.scale.set(0.8, 0.8, 1); sp.position.set(0, 0.37, 0.03); lamp.add(sp);
      const l = new T.PointLight(C('#ffb768'), 1.0, 3.0, 2); l.position.set(0, 0.42, 0.15); lamp.add(l);
      flames.push({ globe, sp, l, ph: R() * 10 });
      const cs = new T.Mesh(new T.PlaneGeometry(sbW + 0.4, 0.9), M.shadow); cs.rotation.x = -Math.PI / 2; cs.position.set(0, 0.002, 0.3); bay.g.add(cs);
    }
    if (B.easel) {
      const e = new T.Group(); e.position.set(0, 0, 0.78); e.rotation.x = -0.16; bay.g.add(e);
      for (const sx of [-1, 1]) { const leg = box(0.035, 2.05, 0.03, M.wood, sx * 0.24, 1.02, 0); leg.rotation.z = sx * 0.07; e.add(leg); }
      const back = box(0.03, 2.0, 0.03, M.wood, 0, 0.97, -0.37); back.rotation.x = 0.33; e.add(back);
      e.add(box(0.7, 0.04, 0.09, M.wood, 0, 0.86, 0.03, 0.01)); e.add(box(0.5, 0.05, 0.04, M.wood, 0, 1.92, 0));
      easelObjs.push(e);
      const cs = new T.Mesh(new T.PlaneGeometry(1.2, 0.9), M.shadow); cs.rotation.x = -Math.PI / 2; cs.position.set(0, 0.002, 0.7); bay.g.add(cs);
      bay.easel = e;
    }
    (B.f || []).forEach(([style, w0, x, y, on = 'wall', extra = {}]) => {
      const p = people[pi++]; if (!p) return;
      const w = w0 * SCALE;
      if (on === 'easel') {
        const f = buildFrame(bay, { id: p.id, style, w, x: 0, y: 0.88, on: 'stand', lean: 0, z: 0.05, ...extra });
        bay.g.remove(f.pivot); bay.easel.add(f.pivot); f.pivot.rotation.x = 0; f.pivot.position.set(0, 0.88, 0.05);
      } else buildFrame(bay, { id: p.id, style, w, x, y, on, ...extra });
    });
    if (B.sconceR) sconce(bay, B.w / 2, 1.78);
  }
  // 걸개줄 · 고리: 칸마다 하나로 합친다(벽에 걸린 것만)
  for (const bay of bays) {
    const parts = [];
    for (const f of bay.frames) {
      if (f.spec.on !== 'wall') continue;
      f.pivot.updateMatrix(); f.inner.updateMatrix();
      const m = new T.Matrix4().multiplyMatrices(f.pivot.matrix, f.inner.matrix);
      const hook = new T.Vector3(f.spec.x, RAIL_Y - 0.02, 0.04);
      for (const sx of [-1, 1]) {
        const a = new T.Vector3(sx * f.OW * 0.32, f.OH / 2 - 0.05, 0.0).applyMatrix4(m), d = a.clone().sub(hook), len = d.length();
        const cyl = new T.CylinderGeometry(0.0016, 0.0016, len, 4); cyl.translate(0, len / 2, 0);
        const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize()); cyl.applyQuaternion(q); cyl.translate(hook.x, hook.y, hook.z);
        parts.push(cyl);
      }
      parts.push(new T.BoxGeometry(0.018, 0.05, 0.012).translate(hook.x, RAIL_Y - 0.005, 0.045));
    }
    if (parts.length) bay.g.add(new T.Mesh(mergeSafe(parts), M.brass));
  }
  // 먼지(빛 속을 떠도는 티끌)
  const dust = (() => {
    const N = 260, pos = new Float32Array(N * 3), ph = new Float32Array(N), r2 = rng(12);
    for (let i = 0; i < N; i++) { pos[i * 3] = (r2() - 0.5) * TOTAL; pos[i * 3 + 1] = 0.4 + r2() * 4.2; pos[i * 3 + 2] = 0.2 + r2() * 2.8; ph[i] = r2() * 100; }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('ph', new T.BufferAttribute(ph, 1));
    const m = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uT: { value: 0 }, uS: { value: renderer.getPixelRatio() } },
      vertexShader: 'attribute float ph; uniform float uT, uS; varying float vA; void main(){ vec3 p = position; p.x += sin(uT*0.13+ph)*0.12; p.y += mod(uT*0.018 + ph*0.05, 1.0)*0.5 - 0.25 + sin(uT*0.2+ph*1.7)*0.05; p.z += cos(uT*0.11+ph)*0.08; vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = uS*(1.4 + fract(ph)*2.2)*(3.2/-mv.z); vA = 0.35 + 0.65*abs(sin(uT*0.7+ph)); }',
      fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d)*vA*0.55; gl_FragColor = vec4(vec3(1.0,0.82,0.6)*a, a); }' });
    const pts = new T.Points(g, m); pts.frustumCulled = false; scene.add(pts); return m;
  })();
  // 섬광 · 연기 · 빛줄기(질문)
  const flashSpr = new T.Sprite(glowMat('#f2f4ff', 0)); flashSpr.renderOrder = 20; scene.add(flashSpr);
  const puffs = Array.from({ length: 36 }, () => { const s = new T.Sprite(new T.SpriteMaterial({ map: puffT, color: C('#a9a6ae'), transparent: true, opacity: 0, depthWrite: false })); s.visible = false; s.renderOrder = 21; scene.add(s); return { s, life: 0, max: 1, v: new T.Vector3(), g: 0 }; });
  let puffI = 0;
  function puff(x, y, z, n, size = 0.35, speed = 0.5) {
    for (let i = 0; i < n; i++) {
      const p = puffs[puffI++ % puffs.length]; p.s.visible = true; p.life = 0; p.max = 2.2 + R() * 1.6; p.s.position.set(x + (R() - 0.5) * 0.15, y + (R() - 0.5) * 0.1, z + R() * 0.2);
      p.v.set((R() - 0.5) * speed, 0.12 + R() * speed * 0.5, 0.05 + R() * 0.15); p.base = size * (0.5 + R() * 0.5); p.g = 0.5 + R() * 0.5; p.s.material.rotation = R() * 6.28; p.a = 0.14 + R() * 0.12;
    }
  }
  const beamMat = new T.MeshBasicMaterial({ map: beamT, color: C('#ffe2b0'), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
  const seamBeam = new T.Mesh(new T.PlaneGeometry(1, 5.2), beamMat); seamBeam.position.set(0, 2.5, 0.06); seamBeam.renderOrder = 15; scene.add(seamBeam);
  const hazeMat = new T.MeshBasicMaterial({ map: beamT, color: C('#ffcf96'), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
  const haze = new T.Mesh(new T.PlaneGeometry(1, 6), hazeMat); haze.position.set(0, 2.4, 1.2); haze.renderOrder = 14; scene.add(haze);
  const behind = new T.Mesh(new T.PlaneGeometry(9, 7), new T.MeshBasicMaterial({ map: glowT, color: C('#ffd9a4').multiplyScalar(1.4), transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); behind.position.set(0, 2.5, -2.2); scene.add(behind);

  // ───────────────────────── 카메라 · 흐름
  const cam = new T.PerspectiveCamera(50, 1, 0.05, 80);
  const CAM = { y: 1.78, z: 4.35, ty: 2.5 };
  const XLIM = TOTAL / 2 - 1.0 - 0.75;
  const st = { x: -0.55, v: 0, dir: 1, pitch: 0, pitchT: 0, z: CAM.z, y: CAM.y, ty: CAM.ty, tx: 0, mode: 'street', drag: null, cruise: reduced ? 0 : 0.075, ramp: 0, entering: null, q: null };
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
    const z0 = 8.7, z1 = CAM.z;
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
  const frameWorld = (f, out = tmpV) => { f.inner.updateWorldMatrix(true, false); return out.setFromMatrixPosition(f.inner.matrixWorld); };
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

  // ───────────────────────── 질문: 두 문
  const pivL = new T.Group(), pivR = new T.Group(); scene.add(pivL, pivR);
  const Q = { open: false, seam: 0, aL: 0, aR: 0, sL: 0, sR: 0, saved: null, busy: false };
  function applyDoors() {
    pivL.rotation.y = Q.aL; pivR.rotation.y = -Q.aR;
    pivL.position.x = Q.pL + Q.sL; pivR.position.x = Q.pR + Q.sR;
    // 열린 문 뒤로 넘어간 칸은 숨긴다(카메라 쪽으로 돌아 들어오지 않게)
    for (const b of bays) if (b.side) b.g.visible = !(b.outer && (b.side === 'L' ? Q.aL : Q.aR) > 0.02);
    const gap = Math.max(Q.aL, Q.aR);
    behind.material.opacity = clamp(gap * 2.2, 0, 1); hazeMat.opacity = clamp(gap * 0.5, 0, 0.22) * Q.hz;
  }
  async function toQuestion() {
    if (Q.open || Q.busy) return; Q.busy = true; Q.hz = 1;
    st.mode = 'q';
    // 가장 가까운 칸 사이를 이음매로
    let best = null; for (let i = 1; i < bays.length; i++) { const x = bays[i].x0; if (!best || Math.abs(x - st.x) < Math.abs(best - st.x)) best = x; }
    Q.seam = best; const zq = CAM.z + 0.55, hw = viewW(zq) / 2;
    Q.pL = best - hw * 1.02; Q.pR = best + hw * 1.02; Q.hw = hw; Q.zq = zq;
    pivL.position.set(Q.pL, 0, 0); pivR.position.set(Q.pR, 0, 0); pivL.rotation.set(0, 0, 0); pivR.rotation.set(0, 0, 0);
    for (const b of bays) {
      const L = b.x0 + b.w / 2 <= best; b.side = L ? 'L' : 'R';
      b.outer = L ? b.x0 + b.w < Q.pL + 0.05 || b.x0 < Q.pL - 0.6 : b.x0 > Q.pR - 0.05 || b.x0 + b.w > Q.pR + 0.6;
      (L ? pivL : pivR).attach(b.g);
    }
    Q.saved = frames.map((f) => f.ph);
    seamBeam.position.x = best; haze.position.x = best; behind.position.x = best;
    const sx0 = st.x, z0 = st.z, y0 = st.y, ty0 = st.ty;
    await tween(reduced ? 0 : 650, (e) => { st.x = lerp(sx0, best, e); st.z = lerp(z0, zq, e); st.y = lerp(y0, CAM.y + 0.05, e); st.ty = lerp(ty0, 2.55, e); st.pitch *= 1 - e; }, eio);
    // 이음매에서 빛이 샌다 → 문이 열린다. 왼쪽은 모두 그림, 오른쪽은 위에서부터 사진으로 현상
    if (!reduced) anims.push({ t0: performance.now(), dur: 900, fn: (t) => { beamMat.opacity = 0.85 * Math.sin(Math.min(1, t * 1.6) * Math.PI / 2) * (1 - sstep(0.7, 1, t) * 0.5); seamBeam.scale.x = lerp(0.02, 0.2, eo(t)); } });
    frames.forEach((f) => { if (f.bay.side === 'L' && f.ph) setPerson(f.id, false, 0, true); });
    const rf = frames.filter((f) => f.bay.side === 'R' && !f.ph).sort((a, b) => frameWorld(b, new T.Vector3()).y - frameWorld(a, new T.Vector3()).y);
    rf.forEach((f, i) => setPerson(f.id, true, reduced ? 0 : 260 + i * 70, i < 6));
    const A = 0.86;
    await tween(reduced ? 0 : 1100, (e) => { Q.aL = Q.aR = A * e; Q.sL = Q.sR = 0; applyDoors(); }, (t) => eio(clamp((t * 1100 - 250) / 850, 0, 1)));
    if (!reduced) anims.push({ t0: performance.now(), dur: 500, fn: (t) => { beamMat.opacity = 0.5 * (1 - t); } }); else beamMat.opacity = 0;
    Q.open = true; Q.busy = false;
  }
  async function toWall() {
    if (!Q.open || Q.busy) return; Q.busy = true;
    const a0 = Q.aL, a1 = Q.aR, s0 = Q.sL, s1 = Q.sR;
    await tween(reduced ? 0 : 850, (e) => { Q.aL = lerp(a0, 0, e); Q.aR = lerp(a1, 0, e); Q.sL = lerp(s0, 0, e); Q.sR = lerp(s1, 0, e); applyDoors(); }, eio);
    for (const b of bays) { root.attach(b.g); b.g.visible = true; b.side = null; }
    pivL.rotation.set(0, 0, 0); pivR.rotation.set(0, 0, 0);
    frames.forEach((f, i) => { if (f.ph !== Q.saved[i]) setPerson(f.id, Q.saved[i], 0, false); });
    behind.material.opacity = 0; hazeMat.opacity = 0; beamMat.opacity = 0;
    Q.open = false; Q.busy = false; st.mode = 'wall'; st.ramp = 0;
  }
  // 고르기: 고른 문이 화면을 채우고, 다른 문은 활짝 열려 물러난다
  async function choose(k) {
    if (!Q.open) return;
    const L = k === 'paint', hw = Q.hw;
    const a0 = [Q.aL, Q.aR, Q.sL, Q.sR];
    if (!reduced) {
      if (L) { // 니스 빛: 왼쪽 문의 그림들이 차례로 따뜻하게
        const lf = frames.filter((f) => f.bay.side === 'L').sort((a, b) => frameWorld(a, new T.Vector3()).x - frameWorld(b, new T.Vector3()).x);
        lf.forEach((f, i) => later(120 + i * 45, () => anims.push({ t0: performance.now(), dur: 1100, fn: (t) => { f.u.uGlow.value = t >= 1 ? 0 : t; } })));
        anims.push({ t0: performance.now(), dur: 1400, fn: (t) => { flashL.color.copy(WARM); flashL.distance = 3.4; flashL.position.set(Q.seam - hw * 1.2 + t * hw * 2.2, 2.6, 0.9); flashL.intensity = Math.sin(t * Math.PI) * 2.4; } });
      } else {  // 섬광: 오른쪽 문 전체
        const rf = frames.filter((f) => f.bay.side === 'R');
        anims.push({ t0: performance.now(), dur: 900, fn: (t) => { const v = t < 0.08 ? t / 0.08 : Math.pow(1 - (t - 0.08) / 0.92, 2); rf.forEach((f) => { f.u.uFlash.value = v * 0.8; }); flashL.color.copy(WHITE); flashL.position.set(Q.seam + hw * 0.5, 2.6, 1.4); flashL.intensity = v * 5; flashL.distance = 6; } });
      }
    }
    await tween(reduced ? 0 : 900, (e) => {
      if (L) { Q.aL = lerp(a0[0], 0, e); Q.sL = lerp(a0[2], hw * 1.02, e); Q.aR = lerp(a0[1], 1.25, e); Q.sR = lerp(a0[3], hw * 0.6, e); }
      else { Q.aR = lerp(a0[1], 0, e); Q.sR = lerp(a0[3], -hw * 1.02, e); Q.aL = lerp(a0[0], 1.25, e); Q.sL = lerp(a0[2], -hw * 0.6, e); }
      Q.hz = 1 - e; applyDoors();
      if (L) { for (const b of bays) if (b.side === 'L') b.g.visible = true; } else { for (const b of bays) if (b.side === 'R') b.g.visible = true; }
    }, eio);
  }
  // 결과: 두 문이 닫히며 이음매가 비율 자리(왼쪽 pa %)로
  async function split(pa) {
    const hw = Q.hw, s = (pa / 100 - 0.5) * 2 * hw, a0 = [Q.aL, Q.aR, Q.sL, Q.sR];
    await tween(reduced ? 0 : 1100, (e) => {
      Q.aL = lerp(a0[0], 0, e); Q.aR = lerp(a0[1], 0, e); Q.sL = lerp(a0[2], s, e); Q.sR = lerp(a0[3], s, e); applyDoors();
      for (const b of bays) b.g.visible = true;
      seamBeam.position.x = Q.seam + Q.sL; beamMat.opacity = 0.55 * e; seamBeam.scale.x = 0.09;
    }, (t) => 1 - Math.pow(1 - t, 4));
  }
  async function unchoose() {
    const a0 = [Q.aL, Q.aR, Q.sL, Q.sR], A = 0.86;
    beamMat.opacity = 0; Q.hz = 1;
    await tween(reduced ? 0 : 800, (e) => { Q.aL = lerp(a0[0], A, e); Q.aR = lerp(a0[1], A, e); Q.sL = lerp(a0[2], 0, e); Q.sR = lerp(a0[3], 0, e); applyDoors(); }, eio);
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
    // 액자 바꾸기
    for (const f of frames) {
      if (!f.anim) continue;
      const t = clamp((now - f.anim.t0) / f.anim.dur, 0, 1);
      f.u.uT.value = t;
      if (f.anim.ph) f.u.uFlash.value = t < 0.025 ? t / 0.025 : Math.max(0, 1 - (t - 0.025) / 0.2) ** 2;
      if (t >= 1) { f.anim = null; f.u.uDir.value = 1; f.u.uT.value = f.ph ? 1 : 0; f.u.uFlash.value = 0; f.u.uGlow.value = 0; }
    }
    const fa = (now - flashBusy) / 1000;
    const anyBack = frames.some((f) => f.anim && !f.anim.ph);
    if (st.mode !== 'q') {
      if (fa < 0.55) { flashL.color.copy(WHITE); flashL.intensity = (fa < 0.03 ? fa / 0.03 : Math.pow(1 - (fa - 0.03) / 0.52, 2)) * 9; flashL.distance = 4.5; }
      else if (anyBack) { flashL.color.copy(WARM); flashL.position.copy(sweepPos); flashL.intensity = 1.2; flashL.distance = 3.2; }
      else flashL.intensity *= 0.9;
    }
    flashSpr.material.opacity = fa < 0.5 ? (fa < 0.03 ? fa / 0.03 : Math.pow(1 - (fa - 0.03) / 0.47, 2)) * 0.95 : 0;
    for (const p of puffs) {
      if (!p.s.visible) continue; p.life += dt; const t = p.life / p.max;
      if (t >= 1) { p.s.visible = false; continue; }
      p.v.multiplyScalar(0.985); p.v.y += 0.04 * dt; p.s.position.addScaledVector(p.v, dt);
      const sc = p.base * (1 + t * 1.8 * p.g); p.s.scale.set(sc, sc, 1); p.s.material.opacity = (t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88) * p.a; p.s.material.rotation += dt * 0.15;
    }
    // 가스 불꽃 흔들림(밝기만)
    for (const fl of flames) { const k = 0.9 + 0.07 * Math.sin(tSec * 7.1 + fl.ph) + 0.04 * Math.sin(tSec * 13.3 + fl.ph * 2); fl.l.intensity = 0.9 * k; fl.sp.material.opacity = 0.55 * k; fl.globe.material.emissiveIntensity = 1.0 * k; }
    for (const L of lights) L.l.intensity = L.k * (0.96 + 0.04 * Math.sin(tSec * 3.3 + L.ph));
    dust.uniforms.uT.value = tSec;
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
    const bob = reduced ? 0 : Math.sin(tSec * 0.31) * 0.03;
    // 벽을 비스듬히(가는 쪽을 조금 앞서 보며) — 액자의 두께 · 몰딩 옆면이 보이고 앞뒤 시차가 생긴다
    const look = st.mode === 'wall' || st.mode === 'entering' ? (reduced ? 0.25 : clamp(st.dir * 0.42 + st.v * 1.2, -0.6, 0.6)) : 0;
    st.tx += (look - st.tx) * Math.min(1, dt * 0.7);
    cam.position.set(st.x - st.tx * 1.15, st.y + bob + st.pitch * 0.25, st.z);
    cam.lookAt(st.x + st.tx * 0.35, st.ty + st.pitch + bob * 0.5, 0);
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
  for (const f of frames) { renderer.initTexture(f.u.tPaint.value); renderer.initTexture(f.u.tPhoto.value); }   // 흐르다 처음 보이는 액자에서 멈칫하지 않게
  raf = requestAnimationFrame(frame);

  return {
    playIntro, skipIntro, setPerson, setAll, toQuestion, toWall, choose, split, unchoose, bindInput, setActive, resize,
    isPhoto: (id) => !!(frames.find((f) => f.id === id) || {}).ph,
    get mode() { return st.mode; }, get phase() { return phase; }, get flowing() { return st.mode === 'wall' && Math.abs(st.v) > 0.005; },
    get frames() { return frames.length; },
    debug: { st, cam, frames, bays, scene, renderer, frameWorld, Q, street, info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, tex: renderer.info.memory.textures, geo: renderer.info.memory.geometries, progs: renderer.info.programs.length }) },
  };
}
