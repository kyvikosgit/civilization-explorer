// KIPPU GNB — 홈페이지·전시 페이지 공통 상단 바 (마크업·검색 동작 단일 출처)
// 사용: <div class="kgnb" data-current="exhibition"></div><script src="/gnb.js"></script>
//       data-current — 현재 메뉴 강조 (exhibition | feature), 없으면 강조 없음
(function () {
  var MENU = [
    { key: 'exhibition', label: '전시', href: '/#now' },
    { key: 'feature', label: '특징', href: '/#only' },
  ];
  var ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/></svg>';

  document.querySelectorAll('.kgnb:not([data-ready])').forEach(function (el) {
    var cur = el.getAttribute('data-current');
    el.setAttribute('data-ready', '');
    el.innerHTML =
      '<div class="in">' +
        '<a class="logo" href="/">KIPPU</a>' +
        '<form class="search" role="search">' + ICON +
          '<input type="search" placeholder="전시 검색" autocomplete="off" aria-label="전시 검색">' +
        '</form>' +
        '<nav>' +
          MENU.map(function (m) {
            return '<a href="' + m.href + '"' + (m.key === cur ? ' class="on"' : '') + '>' + m.label + '</a>';
          }).join('') +
          '<a class="app" href="/#app">앱 다운로드</a>' +
        '</nav>' +
      '</div>';

    // 검색 — 현재 전시 대상
    el.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = el.querySelector('input').value.trim().toLowerCase();
      if (!q) return;
      if (/모네|monet|100|인상|해돋이|신세계|헤리티지/.test(q)) location.href = '/monet100-web/';
      else location.href = '/#now';
    });
  });
})();
