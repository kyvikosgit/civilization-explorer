// 문명탐험가 웹 시안 공통 컴포넌트 — GNB·푸터 마크업 단일 출처 (시안마다 스타일만 A.css/B.css/C.css로 다름)
// 사용: <header class="gnb" data-current="exhibition|feature"></header> … <footer class="site-footer"></footer>
//       <script src="kit.js" data-concept="A"></script>
(function () {
  var me = document.currentScript;
  var C = me.getAttribute('data-concept') || 'A';
  var HOME = me.getAttribute('data-home') || C + '-home.html';
  var EXHIBIT = me.getAttribute('data-exhibit') || C + '-exhibit.html';
  var ICON_SEARCH = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/></svg>';

  var g = document.querySelector('header.gnb');
  if (g) {
    var cur = g.getAttribute('data-current');
    var item = function (key, label, href) {
      return '<a class="gnb-link' + (key === cur ? ' is-on' : '') + '" href="' + href + '">' + label + '</a>';
    };
    g.innerHTML =
      '<div class="gnb-in">' +
        '<a class="gnb-logo" href="' + HOME + '">문명탐험가</a>' +
        '<nav class="gnb-menu" aria-label="주 메뉴">' +
          item('exhibition', '전시', HOME + '#now') +
          item('feature', '특징', HOME + '#features') +
        '</nav>' +
        '<form class="gnb-search" role="search">' + ICON_SEARCH +
          '<input type="search" placeholder="전시 검색" autocomplete="off" aria-label="전시 검색">' +
        '</form>' +
        '<a class="gnb-app" href="' + HOME + '#app">앱 다운로드</a>' +
      '</div>';
    g.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = g.querySelector('input').value.trim().toLowerCase();
      if (!q) return;
      location.href = /모네|monet|100|인상|해돋이|신세계|헤리티지/.test(q) ? EXHIBIT : HOME + '#now';
    });
  }

  var f = document.querySelector('footer.site-footer');
  if (f) {
    f.innerHTML =
      '<div class="foot-in">' +
        '<div class="foot-top">' +
          '<a class="foot-logo" href="' + HOME + '">문명탐험가</a>' +
          '<nav class="foot-legal" aria-label="약관">' +
            '<a href="../monet100-web/terms.html">이용약관</a>' +
            '<a href="../monet100-web/privacy.html">개인정보처리방침</a>' +
            '<a href="../monet100-web/refund.html">취소·환불 규정</a>' +
          '</nav>' +
        '</div>' +
        '<address class="foot-addr">' +
          '<span>상호 주식회사 큐비크스 (Kyvikos Co., Ltd.)</span><span>대표 김지희</span><span>사업자등록번호 319-86-02250</span><br>' +
          '<span>서울특별시 종로구 자하문로7길 43, 4층</span><span>info@kyvikos.com</span>' +
        '</address>' +
        '<small class="foot-copy">© 2026 Kyvikos Co., Ltd. All rights reserved.</small>' +
      '</div>';
  }

  // D-day — 오픈일 2026-12-05 기준
  var n = Math.ceil((new Date('2026-12-05T00:00:00+09:00') - Date.now()) / 86400000);
  document.querySelectorAll('[data-dday]').forEach(function (el) { el.textContent = n <= 0 ? 'NOW OPEN' : 'D-' + n; });
})();
