// 11/20: 3D 도입을 '구역에 들어설 때' 따로 보여 주기 — 앱 구역 화면이 QR · 구역 순서로 들어오면 도입만 틀고, 미션을 누르면 도입 없이 바로
//   ?intro=only : 도입만. 끝나면 앱(웹뷰 · 웹 iframe)에 {type:'intro-done'} 을 보낸다. 역할 · 안내 글자는 숨김
//   ?nointro    : 도입 없이 바로 체험(끝 장면에서 시작)
//   보통 스크립트(모듈 아님) — industry.html 의 인라인 스크립트도 쓰므로 window.M100_INTRO 로 둔다
(function () {
  var q = new URLSearchParams(location.search);
  var mode = q.get('intro') === 'only' ? 'only' : q.has('nointro') ? 'skip' : 'normal';
  var sent = false;
  function ended(delay) {
    if (mode !== 'only' || sent) return; sent = true;
    setTimeout(function () {
      var m = JSON.stringify({ type: 'intro-done' });
      try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(m); } catch (e) {}
      try { if (window.parent !== window) window.parent.postMessage(m, '*'); } catch (e) {}
    }, delay == null ? 700 : delay);
  }
  window.M100_INTRO = { mode: mode, ended: ended };
  if (mode === 'only') {
    document.documentElement.classList.add('intro-only');
    var st = document.createElement('style');
    // 도입만 볼 때는 역할 줄 · 안내 · 건너뛰기 글자 · 단추를 숨긴다(미션은 앱 구역 화면 아래 카드에서)
    st.textContent = '.intro-only #role,.intro-only .role,.intro-only .intro-skip,.intro-only .guide,.intro-only #guide,.intro-only .intro-copy,.intro-only .cta,.intro-only #scan,.intro-only .scan-btn{visibility:hidden!important}';
    document.head.appendChild(st);
    setTimeout(function () { ended(0); }, 12000);   // 도입이 어떤 까닭으로 멈춰도 12초 뒤엔 구역 화면으로
  }
})();
