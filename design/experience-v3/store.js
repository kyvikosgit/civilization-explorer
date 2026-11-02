// 수집 · 굿즈 수령 · 시연 모드 — 폰 안(localStorage)에만 남는다
const K = 'm100v3';
const read = () => { try { return JSON.parse(localStorage.getItem(K)) || {}; } catch { return {}; } };
const write = (s) => { try { localStorage.setItem(K, JSON.stringify(s)); } catch {} };

export const store = {
  solved: (id) => !!read().solved?.[id],      // 정답을 맞힘
  saved: (id) => !!read().saved?.[id],        // 수집함에 담음
  solve(id) { const s = read(); (s.solved ||= {})[id] = Date.now(); write(s); },
  save(id) { const s = read(); (s.saved ||= {})[id] = Date.now(); (s.solved ||= {})[id] ||= Date.now(); write(s); },
  redeemed: () => read().redeemed || 0,       // 굿즈 수령 시각
  redeem() { const s = read(); s.redeemed = Date.now(); write(s); },
  // 기본은 프로토타입: 벽 · 그림 · 소품이 없어도 화면 안에서 끝까지 돈다. 현장(실제 벽이 있는 곳)에서만 실제 카메라로 바꾼다
  demo: () => !read().live,
  setLive(v) { const s = read(); s.live = !!v; write(s); },
  reset() { const l = read().live; write(l ? { live: true } : {}); },
};
