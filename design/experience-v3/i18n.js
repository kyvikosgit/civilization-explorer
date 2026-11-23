/* 체험 페이지 언어(11/23) — 앱 언어 설정을 따른다(앱이 주소에 ?lang=en|ja|zh 를 붙여 연다. 없으면 지난번 값 → 기기 언어)
 * 페이지 코드는 한국어 그대로 두고, 화면에 찍히는 글자 마디 · 속성 · 캔버스 글자 · 알림창을 사전(i18n/<언어>.js)으로 바꾼다
 *   사전 키 = 한국어 원문 조각(태그 사이 글자). {0} {1} 은 틀('{0}점' ↔ '3점'). 만드는 법: kippu-app/scripts/i18n/extract_exp.py → 번역 → build_exp.py
 *   각 체험 페이지 <head> 맨 앞(<base> 다음)에서 불러야 한다 — 사전을 동기로 읽어 첫 화면부터 바꾼다 */
(function () {
  var LANGS = ['ko', 'en', 'ja', 'zh'];
  var L = null;
  try { L = new URLSearchParams(location.search).get('lang'); } catch (e) {}
  try { if (LANGS.indexOf(L) < 0) L = localStorage.getItem('m100-lang'); } catch (e) {}
  if (LANGS.indexOf(L) < 0) {
    var n = String((navigator.language || 'ko')).toLowerCase();
    L = n.indexOf('ko') === 0 ? 'ko' : n.indexOf('ja') === 0 ? 'ja' : n.indexOf('zh') === 0 ? 'zh' : 'en';
  }
  try { localStorage.setItem('m100-lang', L); } catch (e) {}
  window.M100_LANG = L;
  document.documentElement.lang = L;
  if (L === 'ko') return;
  if (L === 'ja' || L === 'zh') {
    document.write('<style>*{word-break:normal!important;line-break:auto!important}</style>');
  }
  var me = document.currentScript && document.currentScript.src;
  var dir = me ? me.slice(0, me.lastIndexOf('/') + 1) : '';
  window.M100_I18N_INIT = install;
  document.write('<script src="' + dir + 'i18n/' + L + '.js"><\/script>');

  function install() {
    var D = window.M100_DICT || {};
    var HANGUL = /[가-힣]/;
    var pats = [];
    Object.keys(D).forEach(function (k) {
      if (!/\{\d\}/.test(k)) return;
      var src = '^' + k.split(/(\{\d\})/).map(function (p) { return /^\{\d\}$/.test(p) ? '([\\s\\S]+?)' : p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('') + '$';
      try { pats.push({ re: new RegExp(src), to: D[k], w: k.replace(/\{\d\}/g, '').length }); } catch (e) {}
    });
    pats.sort(function (a, b) { return b.w - a.w; });
    var SEPS = ['\n', ' · ', ' — ', ' / ', ' | ', ' → ', ', '];
    var cache = new Map();
    function tr(s, depth) {
      if (D[s] != null) return D[s];
      var c = s.replace(/\s+/g, ' ').trim();
      if (D[c] != null) return D[c];
      if (depth > 3) return s;
      // 틀: 잡힌 값에 한글이 있으면 그 값도 끝까지 번역돼야 맞는 틀로 본다
      for (var i = 0; i < pats.length; i++) {
        var m = c.match(pats[i].re);
        if (!m) continue;
        var ok = true;
        var out = pats[i].to.replace(/\{(\d)\}/g, function (_, j) { var v = m[+j + 1] || ''; if (!HANGUL.test(v)) return v; var x = tr(v, depth + 1); if (HANGUL.test(x)) ok = false; return x; });
        if (ok) return out;
      }
      for (var k = 0; k < SEPS.length; k++) {
        if (c.indexOf(SEPS[k]) >= 0) return c.split(SEPS[k]).map(function (x) { return HANGUL.test(x) ? tr(x, depth + 1) : x; }).join(SEPS[k]);
      }
      return s;
    }
    function t(s) {
      if (!s || typeof s !== 'string' || !HANGUL.test(s)) return s;
      var h = cache.get(s); if (h !== undefined) return h;
      var m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
      var core = tr(m[2], 0);
      var r = core === m[2] ? s : m[1] + core + m[3];
      cache.set(s, r);
      return r;
    }
    window.M100_T = t;
    var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1 };
    var ATTRS = ['placeholder', 'title', 'alt', 'aria-label'];
    function textNode(n) {
      var p = n.parentNode; if (!p || SKIP[p.nodeName]) return;
      var v = n.nodeValue; if (!v || !HANGUL.test(v)) return;
      var r = t(v); if (r !== v) n.nodeValue = r;
    }
    function el(e) {
      if (e.nodeType !== 1 || SKIP[e.nodeName]) return;
      for (var i = 0; i < ATTRS.length; i++) {
        var a = e.getAttribute(ATTRS[i]);
        if (a && HANGUL.test(a)) { var r = t(a); if (r !== a) e.setAttribute(ATTRS[i], r); }
      }
      if ((e.nodeName === 'INPUT' || e.nodeName === 'BUTTON') && e.value && HANGUL.test(e.value) && (e.type === 'button' || e.type === 'submit')) e.value = t(e.value);
    }
    function walk(root) {
      if (!root) return;
      if (root.nodeType === 3) { textNode(root); return; }
      if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
      if (root.nodeType === 1) { if (SKIP[root.nodeName]) return; el(root); }
      var w = document.createTreeWalker(root, 5 /* ELEMENT | TEXT */);
      var n;
      while ((n = w.nextNode())) { if (n.nodeType === 3) textNode(n); else el(n); }
    }
    var mo = new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.type === 'characterData') textNode(m.target);
        else if (m.type === 'attributes') el(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      }
    });
    function start() {
      walk(document.documentElement);
      mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    }
    mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { walk(document.documentElement); });
    else start();
    // 문서 제목
    try {
      var td = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
      if (td && td.set) Object.defineProperty(document, 'title', { get: function () { return td.get.call(document); }, set: function (v) { td.set.call(document, t(v)); }, configurable: true });
      document.addEventListener('DOMContentLoaded', function () { if (HANGUL.test(document.title)) document.title = document.title; });
    } catch (e) {}
    // 캔버스 글자
    try {
      var P = CanvasRenderingContext2D.prototype;
      ['fillText', 'strokeText', 'measureText'].forEach(function (f) {
        var o = P[f]; if (!o) return;
        P[f] = function (s) { var a = Array.prototype.slice.call(arguments); if (typeof s === 'string') a[0] = t(s); return o.apply(this, a); };
      });
    } catch (e) {}
    // 알림창
    ['alert', 'confirm', 'prompt'].forEach(function (f) {
      var o = window[f]; if (typeof o !== 'function') return;
      window[f] = function (s) { var a = Array.prototype.slice.call(arguments); if (typeof s === 'string') a[0] = t(s); return o.apply(window, a); };
    });
  }
})();
