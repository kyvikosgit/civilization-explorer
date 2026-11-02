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
  // 늘 실제 카메라. 카메라를 쓸 수 없을 때의 직접 고르기는 카메라 화면 안의 예비 단추(camui.js)
  demo: () => false,
  reset() { write({}); },
};
