// 현장 장치(촬영기 폰 · 태블릿 · 액자) 자동 업데이트 — 11/20
// 1분마다 이 페이지와 주요 스크립트를 새로 받아 보고, 바뀌었으면 쉬는 틈(isBusy() 가 아닐 때)에 스스로 새로고침한다
// 배포한 뒤 현장에서 기기마다 새로고침하지 않아도 최신 화면이 되게. 내용이 같으면 아무 일도 하지 않음
const sig = async (urls) => {
  const parts = await Promise.all(urls.map((u) => fetch(u, { cache: 'no-store' }).then((r) => (r.ok ? r.text() : '')).catch(() => null)));
  if (parts.some((p) => p === null)) return null;   // 인터넷이 잠깐 끊긴 것 — 판단하지 않음
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts.join('\u0000')));
  return [...new Uint8Array(b)].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('');
};
// onNew 를 주면 저절로 새로고침하지 않고 알리기만 한다(촬영기 폰: 새로고침하면 카메라 허용을 다시 물을 수 있어서)
export function autoUpdate({ files = [], isBusy = () => false, every = 60000, onNew = null } = {}) {
  if (location.protocol === 'file:') return;   // 앱 묶음(폰 안 사본)은 OTA 로 바뀐다
  const urls = [location.href.split('#')[0], ...files.map((f) => new URL(f, document.baseURI).href)];
  let base = null, want = false;
  sig(urls).then((s) => { base = s; });
  setInterval(async () => {
    if (!want) { const s = await sig(urls); if (s && base && s !== base) { want = true; onNew?.(); } else if (s && !base) base = s; }
    if (want && !onNew && !isBusy() && document.visibilityState === 'visible') location.reload();
  }, every);
}
