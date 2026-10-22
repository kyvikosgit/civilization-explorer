// C1 칼럼 돌려보기 — 인쇄물 데이터 (보드 experience-v2.html C1-A 반영)
//   상호작용 전단지 6장 = 현재 3장(부스 morris-items.js 그대로) + 추가 3장(보드의 후보: 배경 아틀라스의 실제 포스터에서 올림, Commons 퍼블릭 도메인)
//   도미에 만평 3장(1865, Met CC0)은 배경으로만 — 고를 수 없다. 추가 3장의 설명 문구는 보드 표기 그대로(큐레이터 원고 전 임시)
const B = '../../../booth/assets/';

export const ITEMS = [
  { id: 'f1', n: 1, row: 0, src: B + 'img/fl_batignolles.jpg', ratio: 946 / 631, video: B + 'video/guerbois.mp4',
    label: '카페 게르부아 · 바티뇰파 모임', short: '카페 게르부아',
    body: '매주 목요일과 일요일 저녁, 카페 게르부아의 한 켠에서 바티뇰파 모임이 열립니다. 관심 있는 자, 누구든 환영합니다.',
    meta: '' },
  { id: 'f2', n: 2, row: 0, src: B + 'img/fl_bonmarche.jpg', ratio: 972 / 647, video: B + 'video/bonmarche.mp4',
    label: '봉 마르셰 백화점', short: '봉 마르셰',
    body: '취향은 더 이상 귀족만의 특권이 아닙니다. 이곳에서는, 당신의 취향이 곧 당신의 이름입니다.',
    meta: '' },
  { id: 'f3', n: 3, row: 0, src: B + 'img/fl_expo.jpg', ratio: 978 / 651, video: B + 'video/expo.mp4',
    label: '파리 만국 박람회', short: '만국박람회',
    body: '42개국이 참가해 5만여 점의 전시품을 선보입니다. 직접 와서 보고, 경험하고, 느껴보십시오.',
    meta: '' },
  { id: 'p4', n: 4, row: 1, src: 'img/fl_carjat.jpg', ratio: 440 / 599,
    label: '카르자 사진관 광고', short: '카르자 사진관',
    body: '나다르와 같은 시대의 사진관.',
    meta: '에티엔 카르자 · 1868' },
  { id: 'p5', n: 5, row: 1, src: 'img/fl_godard.jpg', ratio: 350 / 218,
    label: '외젠 고다르 기구 전시', short: '고다르 기구',
    body: '나다르의 기구와 같은 유행.',
    meta: 'Imprimerie Savy · 1870' },
  { id: 'p6', n: 6, row: 1, src: 'img/fl_mabille.jpg', ratio: 440 / 328,
    label: '마빌 정원', short: '마빌 정원',
    body: '1874년 파리의 밤놀이.',
    meta: '작자 미상 · 1874' },
];

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

// 오늘의 관람객 — 보드 와이어프레임 예시 수치(1~3번) + 4~6번은 36%를 나눈 예시
export const TODAY = { 1: 24, 2: 21, 3: 19, 4: 14, 5: 12, 6: 10 };
export const VISITORS = '2,031';
