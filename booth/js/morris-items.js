// C-1 모리스 칼럼 인쇄물 데이터 — 앱 소스 src/lib/morrisColumn.ts 에서 복사 (읽기 전용 원본, 수정 금지)
// 상호작용 6장: 전단지 3 (missions.ts 'flyer' 실제 이미지·문구) + 살롱 비판 풍자화 3
//   Honoré Daumier, 'Croquis pris au Salon', Le Charivari 1865 — The Met Open Access (Public Domain / CC0)
//   754603 → sat_venus_1865.jpg · 393322 → sat_critic_1865.jpg · 754581 → sat_quality_1865.jpg
// 부스 사양: Step2 에서 '활성화된' 전단지는 카페 게르부아(바티뇰파) 한 장 (active: true)

export const ITEMS = [
  { id: 'f1', kind: 'flyer', row: 0, src: 'assets/img/fl_batignolles.jpg', ratio: 946 / 631, active: true,
    label: '까페 게르부아 — 바티뇰파 모임',
    body: '매주 목요일과 일요일 저녁, 까페 게르부아의 한 켠에서 바티뇰파 모임이 열립니다. 관심 있는 자, 누구든 환영합니다.' },
  { id: 'f2', kind: 'flyer', row: 0, src: 'assets/img/fl_bonmarche.jpg', ratio: 972 / 647,
    label: '봉 마르셰 백화점',
    body: '취향은 더 이상 귀족만의 특권이 아닙니다. 이곳에서는, 당신의 취향이 곧 당신의 이름입니다.' },
  { id: 'f3', kind: 'flyer', row: 0, src: 'assets/img/fl_expo.jpg', ratio: 978 / 651,
    label: '파리 만국 박람회',
    body: '42개국이 참가해 5만여 점의 전시품을 선보입니다. 직접 와서 보고, 경험하고, 느껴보십시오.' },
  { id: 'sat1', kind: 'satire', row: 1, src: 'assets/img/sat_venus_1865.jpg', ratio: 613 / 599,
    label: '살롱 비판 풍자화',
    body: '소오름~ 올해도 다 비너스 그림뿐이야. 하긴 늘 언제나 비너스만 있지. 저렇게 생긴 여자가 있기라도 한 거야?',
    meta: '오노레 도미에 · 르 샤리바리, 1865.05.10' },
  { id: 'sat2', kind: 'satire', row: 1, src: 'assets/img/sat_critic_1865.jpg', ratio: 625 / 591,
    label: '살롱 비판 풍자화',
    body: '살롱 비평가다! 다들 인사하라고! 비평가님 잘 부탁드려요~',
    meta: '오노레 도미에 · 르 샤리바리, 1865.06.24' },
  { id: 'sat3', kind: 'satire', row: 1, src: 'assets/img/sat_quality_1865.jpg', ratio: 621 / 600,
    label: '살롱 비판 풍자화',
    body: '음, 자세히 살펴보면 꽤 괜찮은 작품을 발견할지도 모르지.',
    meta: '오노레 도미에 · 르 샤리바리, 1865.06.16' },
];

// ── 바탕 포스터 (장식 · 탭 없음) — 실제 1860~1875 파리 포스터, Wikimedia Commons 퍼블릭 도메인
//    원본 대부분은 BnF Gallica 소장 디지털본. 20장을 한 장의 아틀라스(2048², JPEG q80, 약 900KB)로 묶었다:
//    assets/img/morris_posters_atlas.jpg — 각 칸은 세로 440px, 아래 rect 순서 = 아틀라스 배치 순서
//    제외: 'Armand Ben à l'Alcazar d'hiver'(1873, 인종 희화 이미지), 1874 제1회 인상파전 카탈로그 표지(포스터 아님·정답 암시 우려),
//          'Au grand Bon Marché'(1878, 오답 전단지 봉 마르셰와 혼동)
export const FILLER = {
  src: 'assets/img/morris_posters_atlas.jpg',
  w: 2048,
  h: 2048,
  rects: [
    // 1869 · Chéret, Jules (1836-1932). Illustrateur · Public domain · https://commons.wikimedia.org/wiki/File:...Valentino...samedi_et_mardi_gras_grand_bal_de_nuit_paré,_masqué_et_travesti..._-_affiche_-_non_signée_-_btv1b9015591p.jpg
    { x: 0, y: 0, w: 316, h: 440 },
    // 1870 · Chéret, Jules (1836-1932). Illustrateur · Public domain · https://commons.wikimedia.org/wiki/File:A_la_Nouvelle_Héloïse_grands_magasins_de_nouveautés._14_rue_Rambuteau._Changement_de_propriétaire._Agrandissement_considérable._Réouverture_14_mars_affiche,_Jules_Chéret.jpg
    { x: 322, y: 0, w: 326, h: 440 },
    // 1872 · Chéret, Jules (1836-1932). Illustrateur · Public domain · https://commons.wikimedia.org/wiki/File:Au_Masque_de_fer.Nouveautés._affiche,_Jules_Chéret.jpg
    { x: 654, y: 0, w: 330, h: 440 },
    // 1873 · Émile Butscha · Public domain · https://commons.wikimedia.org/wiki/File:Bon_Génie,_maison_de_vente_à_crédit_(affiche_Butscha,_1873).jpeg
    { x: 990, y: 0, w: 331, h: 440 },
    // 1868 · Jules Chéret · Public domain · https://commons.wikimedia.org/wiki/File:Cheret,_Jules_-_La_Grande_Duchesse_de_Gerolstein.jpg
    { x: 1327, y: 0, w: 329, h: 440 },
    // 1868 · Chéret, Jules (1836-1932). Illustrateur · Public domain · https://commons.wikimedia.org/wiki/File:Chéret_-_La_Diva,_affiche.jpg
    { x: 1662, y: 0, w: 347, h: 440 },
    // 1868 · Chéret, Jules (1836-1932). Illustrateur · Public domain · https://commons.wikimedia.org/wiki/File:Chéret_-_Vert-Vert,_affiche.jpg
    { x: 0, y: 446, w: 325, h: 440 },
    // 1872 · Célestin Nanteuil / Adam Cuerden · Public domain · https://commons.wikimedia.org/wiki/File:Célestin_Nanteuil_-_Jules_Massenet_-_Don_César_de_Bazan.jpg
    { x: 331, y: 446, w: 338, h: 440 },
    // 1874 · 작자 미상 · Public domain · https://commons.wikimedia.org/wiki/File:Jardin_Mabille_-_Château_des_fleurs.jpg
    { x: 675, y: 446, w: 328, h: 440 },
    // 1861 · Louis Émile Benassit (1833-1902) · Public domain · https://commons.wikimedia.org/wiki/File:Affiche_Carjat_par_émile_Benassit_1861.jpg
    { x: 1009, y: 446, w: 313, h: 440 },
    // 1860 · Hoster, lithographe · Public domain · https://commons.wikimedia.org/wiki/File:Ambigu-Comique-Juif_errant-1860.jpg
    { x: 1328, y: 446, w: 309, h: 440 },
    // 1868 · Jules Champfleury · Public domain · https://commons.wikimedia.org/wiki/File:Champfleury_1868.jpg
    { x: 1643, y: 446, w: 302, h: 440 },
    // 1870 · Published by Imprimerie Savy · Public domain · https://commons.wikimedia.org/wiki/File:Exposition_du_ballon_d'Eugène_Godard_1870.jpg
    { x: 0, y: 892, w: 218, h: 440 },
    // 1861 · Étienne Carjat / Paul Hadol · Public domain · https://commons.wikimedia.org/wiki/File:Gaulois,_Le_(affiche).jpeg
    { x: 224, y: 892, w: 307, h: 440 },
    // 1869 · Unknown. Publisher: Typographie Morris, père et fils, 64 rue · Public domain · https://commons.wikimedia.org/wiki/File:Gustave_Lambert_poster_1869_-_1.jpg
    { x: 537, y: 892, w: 313, h: 440 },
    // 1866 · Jules Chéret · Public domain · https://commons.wikimedia.org/wiki/File:Mignon_(opera)_1866_poster_NGO3p383.jpg
    { x: 856, y: 892, w: 337, h: 440 },
    // 1865 · Grévin, Alfred (1827-1892), illustrateur · Public domain · https://commons.wikimedia.org/wiki/File:Théâtre_du_Vaudeville-La_famille_Benoiton-1865.jpg
    { x: 1199, y: 892, w: 336, h: 440 },
    // 1868 · Étienne Carjat · Public domain · https://commons.wikimedia.org/wiki/File:Affiche_Carjat_1868.jpg
    { x: 0, y: 1338, w: 599, h: 440 },
    // 1875 · Chéret, Jules (1836-1932). Illustrateur · Public domain · https://commons.wikimedia.org/wiki/File:Alcazar_d'Eté._spectacle,_concert,_promenade._affiche,_Jules_Chéret.jpg
    { x: 605, y: 1338, w: 322, h: 440 },
    // 1875 · 작자 미상 · Public domain · https://commons.wikimedia.org/wiki/File:Alcazar_d'hiver-1875.jpg
    { x: 933, y: 1338, w: 299, h: 440 },
  ],
};

// ── 배경 — 클로드 모네 〈카퓌신 대로 Boulevard des Capucines〉 1873–74, 넬슨-앳킨스 미술관 소장
//    1874년 나다르 사진관(카퓌신 대로 35번지) 제1회 인상파전 출품작. 퍼블릭 도메인 (Wikimedia Commons)
//    https://commons.wikimedia.org/wiki/File:Claude_Monet_-_Boulevard_des_Capucines_-_Google_Art_Project.jpg
//    1280px 썸네일을 720×972 로 줄이고 가우시안 흐림(5px)·채도 0.8·대비 0.88 처리 → assets/img/morris_bg_capucines.jpg (약 33KB)
export const BACKDROP = 'assets/img/morris_bg_capucines.jpg';
