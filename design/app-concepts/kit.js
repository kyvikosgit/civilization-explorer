// 앱 시안 공통 컴포넌트 — 상태 표시줄·상단 바(52h, 좌우 20)·하단 탭·아이콘·도슨트 트랙 데이터의 단일 출처
// 사용: <html class="A"> … <div class="sb"></div> <header class="tb" data-left="brand|back|down" data-title="" data-right="text:로그인|chip|scan"></header>
//       <nav class="tabbar" data-set="platform|ex" data-on="home"></nav>  <script src="kit.js"></script>
(function () {
  var C = (document.documentElement.className.match(/\b([ABC])\b/) || [, 'A'])[1];
  if (/[?&]full\b/.test(location.search)) document.documentElement.classList.add('full');

  var I = {
    back: '<svg class="ic" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
    down: '<svg class="ic" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    chev: '<svg class="ic chev" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>',
    home: '<svg class="ic" viewBox="0 0 24 24"><path d="M3.5 10.2 12 3.5l8.5 6.7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/></svg>',
    ticket: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 6h16a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4V7a1 1 0 0 1 1-1z"/><path d="M14.5 6.5v2M14.5 11v2M14.5 15.5v2"/></svg>',
    person: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.8-3.6 3.9-6 7.5-6s6.7 2.4 7.5 6"/></svg>',
    scan: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 8.5V5a1 1 0 0 1 1-1h3.5M15.5 4H19a1 1 0 0 1 1 1v3.5M20 15.5V19a1 1 0 0 1-1 1h-3.5M8.5 20H5a1 1 0 0 1-1-1v-3.5M4 12h16"/></svg>',
    info: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.1"/></svg>',
    audio: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 16v-3.5a8 8 0 0 1 16 0V16"/><path d="M4 15h3.2v5.5H5a1 1 0 0 1-1-1zM20 15h-3.2v5.5H19a1 1 0 0 0 1-1z"/></svg>',
    frame: '<svg class="ic" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="1"/><path d="M3.5 16l5-5 4 4 2.5-2.5 5.5 5.5"/></svg>',
    grid: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>',
    play: '<svg class="ic icf" viewBox="0 0 24 24"><path d="M8 5.2v13.6L19 12z"/></svg>',
    pause: '<svg class="ic icf" viewBox="0 0 24 24"><path d="M6.5 5h3.8v14H6.5zM13.7 5h3.8v14h-3.8z"/></svg>',
    prev: '<svg class="ic icf" viewBox="0 0 24 24"><path d="M5.5 5h2.2v14H5.5zM19.5 5.4v13.2L9 12z"/></svg>',
    next: '<svg class="ic icf" viewBox="0 0 24 24"><path d="M16.3 5h2.2v14h-2.2zM4.5 5.4v13.2L15 12z"/></svg>'
  };
  window.ICON = I;

  // 오디오 도슨트 14트랙 — docent.tsx 트랙명(존 이름 / 트랙 제목으로 분리), 길이는 monet100-web/audio 실측(초 버림)
  // img: 그 존에 걸린 작품 이미지가 있을 때만 (artworks.ts의 위치 기준)
  window.TRACKS = [
    { n: 1, f: '4F', z: 'A', zone: '접수 및 안내', t: '전시를 시작하며', d: '0:54' },
    { n: 2, f: '4F', z: 'B', zone: '아카데미 살롱', t: '권위가 아름다움을 심사하다 1', d: '1:07', img: 'vision' },
    { n: 3, f: '4F', z: 'B', zone: '아카데미 살롱', t: '권위가 아름다움을 심사하다 2', d: '0:21', img: 'vision' },
    { n: 4, f: '4F', z: 'C', zone: '변화의 복도', t: '시대는 이미 변하고 있었다 1', d: '1:09' },
    { n: 5, f: '4F', z: 'C', zone: '변화의 복도', t: '시대는 이미 변하고 있었다 2', d: '0:30' },
    { n: 6, f: '4F', z: 'D', zone: '모네 전시관', t: '새로운 시대가 시작되다', d: '0:30', img: 'sunrise' },
    { n: 7, f: '4F', z: 'E', zone: '미디어 전시', t: '헤리티지, 모네의 캔버스가 되다', d: '0:52' },
    { n: 8, f: '3F', z: 'A', zone: '생라자르역', t: '산업혁명의 빛이 쏟아지다', d: '1:01', img: 'lazare' },
    { n: 9, f: '3F', z: 'B', zone: '에트르타', t: '빛이 부서지는 절벽', d: '0:58', img: 'etretat' },
    { n: 10, f: '3F', z: 'C', zone: '건초더미', t: '빛으로 완성된 그림', d: '1:06', img: 'meules' },
    { n: 11, f: '3F', z: 'D', zone: '지베르니', t: '빛과 물의 실험실 1', d: '1:06', img: 'giverny' },
    { n: 12, f: '3F', z: 'D', zone: '지베르니', t: '빛과 물의 실험실 2', d: '0:29', img: 'giverny' },
    { n: 13, f: '3F', z: 'E', zone: '미시아 살롱', t: '한 시대가 저물고', d: '1:07' },
    { n: 14, f: '3F', z: 'E', zone: '미시아 살롱', t: '새로운 시대가 태어나다', d: '0:35' }
  ];
  // 공간 — zones.ts 층·존 구성 (층 이름은 guide.tsx). img는 그 존에 걸린 작품이 있을 때만
  window.FLOORS = [
    { f: '4F', name: '이해의 층', sub: '변화의 시대', zones: [
      { c: 'A', n: '접수 및 안내' },
      { c: 'B', n: '아카데미 살롱', img: 'vision' },
      { c: 'C', n: '변화의 복도', s: '시민사회 · 산업혁명 · 화가의 아틀리에 · 나다르 사진관' },
      { c: 'D', n: '모네 전시관', img: 'sunrise' },
      { c: 'E', n: '메인 미디어관' } ] },
    { f: '3F', name: '체험의 층', sub: '모네의 세계', zones: [
      { c: 'A', n: '생라자르역', img: 'lazare' },
      { c: 'B', n: '에트르타', img: 'etretat' },
      { c: 'C', n: '건초더미', img: 'meules' },
      { c: 'D', n: '지베르니', img: 'giverny' },
      { c: 'E', n: '미시아 살롱' },
      { c: 'F', n: '굿즈샵' } ] }
  ];
  window.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

  // 상태 표시줄
  var SB_IC = '<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg>' +
    '<svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.4 6.8a6.5 6.5 0 0 1 9.2 0l-1.5 1.5a4.4 4.4 0 0 0-6.2 0zM1 4.4a9.9 9.9 0 0 1 14 0l-1.5 1.5a7.8 7.8 0 0 0-11 0z" fill="currentColor"/></svg>' +
    '<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="currentColor" opacity=".45"/></svg>';
  document.querySelectorAll('.sb').forEach(function (el) {
    el.innerHTML = '<span class="sb-time">9:41</span><span class="sb-ic">' + SB_IC + '</span>';
  });

  // 상단 바 — 시안마다 이 하나만 쓴다 (스타일은 A.css/B.css/C.css)
  var HOME = C + '-home.html';
  document.querySelectorAll('header.tb').forEach(function (el) {
    var L = el.dataset.left || '', T = el.dataset.title || '', R = el.dataset.right || '', href = el.dataset.href || HOME;
    var left = '';
    if (L === 'brand') left += '<a class="tb-brand" href="' + HOME + '">문명탐험가</a>';
    if (L === 'back') left += '<a class="tb-back" href="' + href + '" aria-label="뒤로">' + I.back + '</a>';
    if (L === 'down') left += '<a class="tb-back" href="' + href + '" aria-label="닫기">' + I.down + '</a>';
    if (T) left += '<h1 class="tb-title">' + T + '</h1>';
    var right = R.split('|').filter(Boolean).map(function (r) {
      if (r === 'chip') return '<span class="tb-chip" data-dday>D-46</span>';
      if (r === 'scan') return '<a class="tb-scan" href="#">' + I.scan + 'QR 스캔</a>';
      if (r.indexOf('text:') === 0) return '<a class="tb-text" href="#">' + r.slice(5) + '</a>';
      return '';
    }).join('');
    el.innerHTML = '<div class="tb-left">' + left + '</div>' + (right ? '<div class="tb-right">' + right + '</div>' : '');
  });

  // 하단 탭 — platform: 홈·내 티켓·마이 / ex: 전시 안 탭(시안 C)
  var SETS = {
    platform: [['home', '홈', I.home, HOME], ['ticket', '내 티켓', I.ticket, C + '-ticket.html'], ['my', '마이', I.person, C + '-my.html']],
    ex: [['guide', '안내', I.info, 'C-hub.html'], ['audio', '오디오', I.audio, 'C-audio.html'], ['art', '작품', I.frame, '#'], ['collect', '수집품', I.grid, '#']]
  };
  document.querySelectorAll('nav.tabbar').forEach(function (el) {
    var on = el.dataset.on;
    el.innerHTML = SETS[el.dataset.set || 'platform'].map(function (t) {
      return '<a class="' + (t[0] === on ? 'on' : '') + '" href="' + t[3] + '">' + t[2] + '<span>' + t[1] + '</span></a>';
    }).join('');
  });

  // D-day — 오픈 2026-12-05
  var n = Math.ceil((new Date('2026-12-05T00:00:00+09:00') - Date.now()) / 86400000);
  document.querySelectorAll('[data-dday]').forEach(function (el) { el.textContent = n <= 0 ? '전시 중' : 'D-' + n; });

  // 홈 인디케이터
  var ph = document.querySelector('.phone');
  if (ph && !ph.querySelector('.hi')) { var h = document.createElement('i'); h.className = 'hi'; ph.appendChild(h); }
})();
