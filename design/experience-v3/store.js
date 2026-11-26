// 수집 · 굿즈 수령 · 시연 모드 — 폰 안(localStorage)에만 남는다
const K = 'm100v3';
const read = () => { try { return JSON.parse(localStorage.getItem(K)) || {}; } catch { return {}; } };
const write = (s) => { try { localStorage.setItem(K, JSON.stringify(s)); } catch {} };

// 11/23: 앱에서 열리면(주소에 got= 가 있으면, 비어 있어도) 앱의 수집 목록이 유일한 기준 — 이 페이지에 따로 남아 있던 기록은 버리고 그대로 덮는다.
//   (예전엔 합치기만 해서 앱에서 '수집 초기화'를 해도 체험은 계속 '이미 모음'으로 열렸다.) 사이트에서 바로 열면(got 없음) 이 페이지 기록 그대로
try {
  const got = new URLSearchParams(location.search).get('got');
  if (got !== null) {
    const s = read(); s.saved = {}; s.solved = {};
    got.split(',').filter(Boolean).forEach((id) => { s.saved[id] = Date.now(); s.solved[id] = Date.now(); });
    write(s);
  }
} catch {}

// 11/26 '다시 체험하기' — 이 체험의 수집품만 이번 탭에서 '안 모은 것'처럼 다룬다(수집함 기록은 그대로). 다시 맞혀 담으면 풀림
const AG = 'm100again';
const again = () => { try { return JSON.parse(sessionStorage.getItem(AG)) || []; } catch { return []; } };
const unagain = (id) => { try { const a = again().filter((x) => x !== id); a.length ? sessionStorage.setItem(AG, JSON.stringify(a)) : sessionStorage.removeItem(AG); } catch {} };
export function replay(ids) { try { sessionStorage.setItem(AG, JSON.stringify(ids)); } catch {} location.reload(); }

export const store = {
  solved: (id) => !again().includes(id) && !!read().solved?.[id],      // 정답을 맞힘
  saved: (id) => window.M100_INTRO?.mode !== 'only' && !again().includes(id) && !!read().saved?.[id],        // 수집함에 담음 (11/20: 도입만 볼 때는 늘 처음처럼 — 결과 화면이 도입 위에 뜨지 않게)
  solve(id) { const s = read(); (s.solved ||= {})[id] = Date.now(); write(s); },
  save(id) { unagain(id); const s = read(); (s.saved ||= {})[id] = Date.now(); (s.solved ||= {})[id] ||= Date.now(); write(s); },
  redeemed: () => read().redeemed || 0,       // 굿즈 수령 시각
  redeem() { const s = read(); s.redeemed = Date.now(); write(s); },
  // 늘 실제 카메라. 카메라를 쓸 수 없을 때의 직접 고르기는 카메라 화면 안의 예비 단추(camui.js)
  demo: () => false,
  reset() { write({}); },
};
