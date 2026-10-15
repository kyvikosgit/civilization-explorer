// C-4 나다르 사진관 — 촬영 이미지 두 가지 스타일 변환 (메인 스레드 멈춤 방지용 워커)
//   photo : 19세기 사진 — 알부민 인화 톤(세피아), 소프트 포커스, 가장자리 흐림, 하이라이트 번짐, 비네트, 입자, 바랜 가장자리
//   paint : 초상화 — 일반화 쿠와하라(사분면 분산 가중 평균) 2회 + 따뜻한 팔레트 + 윤곽 강조 + 캔버스 결
self.onmessage = (e) => {
  const { id, w, h, buf, kinds = ['photo', 'paint'] } = e.data;   // kinds: 필요한 것만 계산 (메모리·시간 절약)
  const src = new Uint8ClampedArray(buf);
  try {
    if (kinds.includes('photo')) {
      const photo = photo19(src, w, h);
      self.postMessage({ id, kind: 'photo', w, h, buf: photo.buffer }, [photo.buffer]);
    }
    if (kinds.includes('paint')) {
      const paint = portrait(src, w, h);
      self.postMessage({ id, kind: 'paint', w, h, buf: paint.buffer }, [paint.buffer]);
    }
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// 분리형 박스 블러 (3회 = 가우시안 근사)
function boxBlur(src, w, h, r) {
  r = Math.max(1, Math.round(r));
  let a = src, b = new Float32Array(w * h);
  for (let pass = 0; pass < 3; pass++) {
    // 가로
    for (let y = 0; y < h; y++) {
      const o = y * w; let acc = 0;
      for (let x = -r; x <= r; x++) acc += a[o + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        b[o + x] = acc / (2 * r + 1);
        acc += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)];
      }
    }
    // 세로
    const c = new Float32Array(w * h);
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        c[y * w + x] = acc / (2 * r + 1);
        acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
    a = c;
  }
  return a;
}

// 결정적 난수 (같은 사진 = 같은 결과)
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function photo19(src, w, h) {
  const n = w * h, L = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = src[i * 4] / 255, g = src[i * 4 + 1] / 255, b = src[i * 4 + 2] / 255;
    // 초기 감광 유제는 청색에 민감 — 청색 비중을 높인 흑백 변환
    L[i] = 0.22 * r + 0.5 * g + 0.28 * b;
  }
  const k = Math.max(w, h) / 1000;
  const soft = boxBlur(L, w, h, 1.6 * k);
  const big = boxBlur(L, w, h, 7 * k);
  const hi = new Float32Array(n);
  for (let i = 0; i < n; i++) hi[i] = Math.max(0, L[i] - 0.6);
  const bloom = boxBlur(hi, w, h, 14 * k);
  const rand = rng(n + w * 31);
  const out = new Uint8ClampedArray(n * 4);
  const dark = [0.15, 0.095, 0.065], mid = [0.55, 0.40, 0.27], light = [0.95, 0.89, 0.76], paper = [0.86, 0.78, 0.62];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const nx = (x / w - 0.5) * 2, ny = (y / h - 0.5) * 2;
      const d = Math.sqrt(nx * nx * 0.9 + ny * ny * 0.75);
      // 소프트 포커스 + 가장자리로 갈수록 흐림 (초기 렌즈)
      let v = L[i] * 0.62 + soft[i] * 0.38;
      v = v + (big[i] - v) * smooth(0.5, 1.05, d) * 0.85;
      v += bloom[i] * 0.9;
      // 톤: 대비 약간 낮추고 검정 띄움, 하이라이트 완만히
      v = clamp01((v - 0.5) * 1.12 + 0.5);
      v = 0.05 + v * 0.9;
      v = 1 - Math.pow(1 - v, 1.15);
      // 비네트
      v *= 1 - 0.52 * smooth(0.5, 1.25, d);
      // 입자
      v += ((rand() + rand()) - 1) * 0.045;
      v = clamp01(v);
      // 알부민 인화 색
      let c;
      if (v < 0.5) { const t = v * 2; c = [dark[0] + (mid[0] - dark[0]) * t, dark[1] + (mid[1] - dark[1]) * t, dark[2] + (mid[2] - dark[2]) * t]; }
      else { const t = (v - 0.5) * 2; c = [mid[0] + (light[0] - mid[0]) * t, mid[1] + (light[1] - mid[1]) * t, mid[2] + (light[2] - mid[2]) * t]; }
      // 바랜 가장자리
      const ex = Math.min(x, w - 1 - x) / w, ey = Math.min(y, h - 1 - y) / h;
      const fade = 1 - smooth(0.0, 0.045, Math.min(ex, ey * (h / w)));
      for (let ch = 0; ch < 3; ch++) c[ch] = c[ch] + (paper[ch] - c[ch]) * fade * 0.75;
      out[i * 4] = c[0] * 255; out[i * 4 + 1] = c[1] * 255; out[i * 4 + 2] = c[2] * 255; out[i * 4 + 3] = 255;
    }
  }
  return out;
}

// 일반화 쿠와하라 — 적분 영상으로 사분면 평균·분산을 O(1)에 구하고, 분산이 낮은 사분면에 큰 가중치
function kuwahara(R, G, B, w, h, rad) {
  const W1 = w + 1, n1 = W1 * (h + 1);
  const SR = new Float64Array(n1), SG = new Float64Array(n1), SB = new Float64Array(n1), SL = new Float64Array(n1), SL2 = new Float64Array(n1);
  for (let y = 0; y < h; y++) {
    let ar = 0, ag = 0, ab = 0, al = 0, al2 = 0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const l = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i];
      ar += R[i]; ag += G[i]; ab += B[i]; al += l; al2 += l * l;
      const j = (y + 1) * W1 + x + 1, u = y * W1 + x + 1;
      SR[j] = SR[u] + ar; SG[j] = SG[u] + ag; SB[j] = SB[u] + ab; SL[j] = SL[u] + al; SL2[j] = SL2[u] + al2;
    }
  }
  const sum = (S, x0, y0, x1, y1) => S[(y1 + 1) * W1 + x1 + 1] - S[y0 * W1 + x1 + 1] - S[(y1 + 1) * W1 + x0] + S[y0 * W1 + x0];
  const oR = new Float32Array(w * h), oG = new Float32Array(w * h), oB = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const ya = Math.max(0, y - rad), yb = Math.min(h - 1, y + rad);
    for (let x = 0; x < w; x++) {
      const xa = Math.max(0, x - rad), xb = Math.min(w - 1, x + rad);
      const Q = [[xa, ya, x, y], [x, ya, xb, y], [xa, y, x, yb], [x, y, xb, yb]];
      let wr = 0, wg = 0, wb = 0, ws = 0;
      for (let q = 0; q < 4; q++) {
        const [x0, y0, x1, y1] = Q[q];
        const cnt = (x1 - x0 + 1) * (y1 - y0 + 1);
        const ml = sum(SL, x0, y0, x1, y1) / cnt;
        const v = Math.max(0, sum(SL2, x0, y0, x1, y1) / cnt - ml * ml);
        const wt = 1 / Math.pow(v * 400 + 0.02, 2);
        wr += wt * sum(SR, x0, y0, x1, y1) / cnt; wg += wt * sum(SG, x0, y0, x1, y1) / cnt; wb += wt * sum(SB, x0, y0, x1, y1) / cnt; ws += wt;
      }
      const i = y * w + x;
      oR[i] = wr / ws; oG[i] = wg / ws; oB[i] = wb / ws;
    }
  }
  return [oR, oG, oB];
}

function portrait(src, w, h) {
  const n = w * h;
  let R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let r = src[i * 4] / 255, g = src[i * 4 + 1] / 255, b = src[i * 4 + 2] / 255;
    // 따뜻한 화이트밸런스 + 채도 약간
    r *= 1.05; b *= 0.9;
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    r = l + (r - l) * 1.18; g = l + (g - l) * 1.18; b = l + (b - l) * 1.18;
    R[i] = clamp01(r); G[i] = clamp01(g); B[i] = clamp01(b);
  }
  const base = Math.min(w, h) / 1000;
  [R, G, B] = kuwahara(R, G, B, w, h, Math.max(3, Math.round(7 * base)));
  [R, G, B] = kuwahara(R, G, B, w, h, Math.max(2, Math.round(3 * base)));
  // 윤곽 (소벨) — 붓 터치 경계를 약간 어둡게
  const Lm = new Float32Array(n);
  for (let i = 0; i < n; i++) Lm[i] = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i];
  const lo = boxBlur(Lm, w, h, 22 * base);   // 저주파 — 붓 자국 밝기 요동
  const rand = rng(n * 7 + h);
  const out = new Uint8ClampedArray(n * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const xm = Math.max(0, x - 1), xp = Math.min(w - 1, x + 1), ym = Math.max(0, y - 1), yp = Math.min(h - 1, y + 1);
      const gx = Lm[y * w + xp] - Lm[y * w + xm], gy = Lm[yp * w + x] - Lm[ym * w + x];
      const edge = Math.sqrt(gx * gx + gy * gy);
      let r = R[i], g = G[i], b = B[i];
      // 국소 대비 (밝기 - 저주파) 강조로 붓질감
      const detail = Lm[i] - lo[i];
      r += detail * 0.35; g += detail * 0.35; b += detail * 0.35;
      // 따뜻한 팔레트: 어두운 곳은 적갈색, 밝은 곳은 크림색으로
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      const sh = 1 - smooth(0.0, 0.45, l), hl = smooth(0.6, 1.0, l);
      r = r * 0.92 + sh * 0.06 + hl * 0.03; g = g * 0.9 + sh * 0.025 + hl * 0.02; b = b * 0.82 + sh * 0.0;
      // 오래된 바니시 톤
      r = r * 1.02; g = g * 0.97; b = b * 0.86;
      r *= 1 - smooth(0.06, 0.22, edge) * 0.22; g *= 1 - smooth(0.06, 0.22, edge) * 0.24; b *= 1 - smooth(0.06, 0.22, edge) * 0.26;
      // 어두운 배경 비네트 (고전 초상화)
      const nx = (x / w - 0.5) * 2, ny = (y / h - 0.5) * 2;
      const vig = 1 - 0.42 * smooth(0.45, 1.3, Math.sqrt(nx * nx + ny * ny * 0.8));
      // 캔버스 결
      const weave = (Math.sin(x * 1.7) * Math.sin(y * 1.7)) * 0.5 + 0.5;
      const tex = 0.965 + 0.05 * weave + (rand() - 0.5) * 0.03;
      r = clamp01(r * vig * tex); g = clamp01(g * vig * tex); b = clamp01(b * vig * tex);
      out[i * 4] = r * 255; out[i * 4 + 1] = g * 255; out[i * 4 + 2] = b * 255; out[i * 4 + 3] = 255;
    }
  }
  return out;
}
