// C1 칼럼 — 인쇄물 데이터 (보드 experience-v2.html C1-A 반영)
//   떼어 읽을 수 있는 인쇄물 = 전단지 3장(부스 morris-items.js 그대로) + 포스터 3장(배경 아틀라스의 실제 포스터에서 올림, Commons 퍼블릭 도메인)
//     + 살롱 1874 공고(재현, 캔버스 조판 js/c1-posters.js) + 화가들의 전시 전단지(재현, 접힌 채 압정에 꽂혀 있다 — 찾을 것)
//   자리(ang 라디안 · cy 높이 m · w 폭 m)는 직접 정한다: 처음 보이는 면 반대쪽, 살롱 공고 바로 아래에 접힌 전단지가 꽂혀 있다
//   도미에 만평 3장(1865, Met CC0)은 배경으로만. 4~6번 설명은 포스터에 인쇄된 문구에서(큐레이터 원고 전 임시)
const B = '../../../booth/assets/';
const ROW0 = 2.806, ROW1 = 1.826;   // 위 줄 · 아래 줄 윗변 높이(m) — 칼럼 몸통 0.728 ~ 2.906

export const ITEMS = [
  { id: 'f1', src: B + 'img/fl_batignolles.jpg', ratio: 946 / 631, video: B + 'video/guerbois.mp4', ang: -0.2, top: ROW0, w: 0.6,
    label: '카페 게르부아 · 바티뇰파 모임',
    body: '매주 목요일과 일요일 저녁, 카페 게르부아의 한 켠에서 바티뇰파 모임이 열립니다. 관심 있는 자, 누구든 환영합니다.', meta: '' },
  { id: 'f2', src: B + 'img/fl_bonmarche.jpg', ratio: 972 / 647, video: B + 'video/bonmarche.mp4', ang: 1.45, top: ROW0, w: 0.6,
    label: '봉 마르셰 백화점',
    body: '취향은 더 이상 귀족만의 특권이 아닙니다. 이곳에서는, 당신의 취향이 곧 당신의 이름입니다.', meta: '' },
  { id: 'salon', gen: 'salon', ratio: 1.5, ang: 3.02, top: ROW0 + 0.02, w: 0.62,
    label: '살롱 1874 공고',
    body: '나라가 해마다 여는 공식 전람회. 심사위원이 고른 작품만 걸립니다. 5월 1일, 샹젤리제 궁에서 문을 엽니다.', meta: '재현 · 1874 살롱 도록 표제에서' },
  { id: 'f3', src: B + 'img/fl_expo.jpg', ratio: 978 / 651, video: B + 'video/expo.mp4', ang: 4.6, top: ROW0, w: 0.6,
    label: '파리 만국 박람회',
    body: '42개국이 참가해 5만여 점의 전시품을 선보입니다. 직접 와서 보고, 경험하고, 느껴보십시오.', meta: '' },
  { id: 'p4', src: 'img/fl_carjat.jpg', ratio: 440 / 599, ang: 0.78, top: ROW1, w: 0.56,
    label: '카르자 사진관',
    body: '사진가이자 풍자화가 에티엔 카르자의 사진관 광고. “주소를 헷갈리지 마시라” — 피갈 거리 62번지.', meta: '에티엔 카르자 · 1868' },
  { id: 'p5', src: 'img/fl_godard.jpg', ratio: 350 / 218, ang: 2.0, top: ROW1, w: 0.5,
    label: '고다르의 거대한 기구',
    body: '기구 조종사 외젠 고다르의 기구 전시. 입장료 1프랑, 일요일엔 생미셸 광장에서 998번째로 하늘에 띄웁니다.', meta: 'Imprimerie Savy · 1870' },
  { id: 'expo', gen: 'expo', fresh: true, ratio: 0.5, ang: 3.12, top: ROW0 + 0.02 - 0.93 + 0.035, w: 0.42,
    label: '화가들의 전시 전단지', body: '', meta: '' },
  { id: 'p6', src: 'img/fl_mabille.jpg', ratio: 440 / 328, ang: 4.25, top: ROW1, w: 0.54,
    label: '마빌 정원',
    body: '샹젤리제 몽테뉴 가 87번지의 야외 무도장. 매일 밤 여덟 시, 음악과 춤의 저녁이 열립니다.', meta: '작자 미상 · 1874' },
];
export const SALON = ITEMS.findIndex((it) => it.id === 'salon');
export const EXPO = ITEMS.findIndex((it) => it.id === 'expo');

// 바탕 포스터 (장식 · 탭 없음) — 부스 아틀라스 20장 중 전단지로 올린 3장(마빌·고다르·카르자 1868)을 빼고, 도미에 만평 3장을 더했다
//   img/morris_atlas_proto.jpg = booth/assets/img/morris_posters_atlas.jpg + 아래 한 줄(y 1790) 만평 3장 → 2048×2240
export const FILLER = {
  src: 'img/morris_atlas_proto.jpg',
  w: 2048, h: 2240,
  rects: [
    { x: 0, y: 0, w: 316, h: 440 }, { x: 322, y: 0, w: 326, h: 440 }, { x: 654, y: 0, w: 330, h: 440 }, { x: 990, y: 0, w: 331, h: 440 },
    { x: 1327, y: 0, w: 329, h: 440 }, { x: 1662, y: 0, w: 347, h: 440 },
    { x: 0, y: 446, w: 325, h: 440 }, { x: 331, y: 446, w: 338, h: 440 },
    { x: 1009, y: 446, w: 313, h: 440 }, { x: 1328, y: 446, w: 309, h: 440 }, { x: 1643, y: 446, w: 302, h: 440 },
    { x: 224, y: 892, w: 307, h: 440 }, { x: 537, y: 892, w: 313, h: 440 }, { x: 856, y: 892, w: 337, h: 440 }, { x: 1199, y: 892, w: 336, h: 440 },
    { x: 605, y: 1338, w: 322, h: 440 }, { x: 933, y: 1338, w: 299, h: 440 },
    // 도미에 〈살롱 스케치〉 1865 (Met CC0) — 배경 전용
    { x: 0, y: 1790, w: 430, h: 440 }, { x: 436, y: 1790, w: 416, h: 440 }, { x: 858, y: 1790, w: 425, h: 440 },
  ],
};

export const BACKDROP = B + 'img/morris_bg_capucines.jpg';
export const VISITORS = '2,031';
