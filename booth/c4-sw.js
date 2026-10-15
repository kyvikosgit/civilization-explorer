// C-4 나다르 사진관 — 서비스 워커 (범위: booth-prototype 폴더)
//   · 무거운 고정 파일(모델·라이브러리·폰트 — 경로에 버전이 박혀 있어 내용이 바뀌지 않음) → 캐시 우선. 한 번 받으면 다시 받지 않는다
//   · C-4 화면 파일(html·js·css·이미지) → 네트워크 우선, 실패(오프라인)할 때만 캐시. 낡은 화면이 계속 나오지 않게
//   · 그 밖의 요청(C-1·C-2 등 다른 부스 파일, 영상 범위 요청)은 손대지 않고 그대로 통과
// 모델·라이브러리를 바꿀 때는 새 버전 경로로 넣고 MODELS 이름을 올린다
const MODELS = 'c4-models-v1';
const SHELL = 'c4-shell-v1';
const KEEP = [MODELS, SHELL];

const BASE = new URL('./', self.location).pathname;          // /booth-prototype/ (배포 위치에 따라)
const IMMUTABLE = ['js/vendor/', 'assets/models/', 'assets/fonts/'];
const SHELL_FILES = [
  'c4.html', 'js/c4.js', 'js/nadar.js', 'js/common.js', 'js/filters-worker.js', 'css/base.css', 'css/c4.css',
  'assets/concept/c4_booth.jpg', 'assets/concept/c4_demo_portrait.jpg', 'assets/concept/c4_demo_paint.jpg', 'assets/concept/c4_demo_photo.jpg',
  'assets/img/style_monet_beret_1886.jpg',
];

const rel = (url) => { const u = new URL(url); return u.origin === self.location.origin && u.pathname.startsWith(BASE) ? u.pathname.slice(BASE.length) : null; };
const isImmutable = (p) => IMMUTABLE.some((d) => p.startsWith(d));
const isShell = (p) => SHELL_FILES.includes(p);

self.addEventListener('install', (e) => {
  // 화면 파일만 미리 담는다(작음). 모델은 페이지가 뒤에서 받아 두면 fetch 단계에서 담긴다
  e.waitUntil(caches.open(SHELL).then((c) => Promise.all(SHELL_FILES.map((f) => c.add(new Request(f, { cache: 'no-cache' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('c4-') && !KEEP.includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const inflight = new Map();   // 같은 파일을 미리 받기와 변환이 동시에 요청해도 한 번만 받는다
async function cacheFirst(req) {
  const key = req.url;
  const cache = await caches.open(MODELS);
  const hit = await cache.match(key);
  if (hit) return hit;
  if (!inflight.has(key)) {
    inflight.set(key, (async () => {
      const res = await fetch(key, { credentials: 'same-origin' });
      if (res.ok && res.status === 200) await cache.put(key, res.clone());
      return res;
    })().finally(() => inflight.delete(key)));
  }
  const res = await inflight.get(key);
  return res.clone();
}
async function networkFirst(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (res.ok && res.status === 200) cache.put(req.url.split('?')[0].split('#')[0], res.clone()).catch(() => {});
    return res;
  } catch (e) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    throw e;
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const p = rel(req.url);
  if (p === null) return;
  if (isImmutable(p)) e.respondWith(cacheFirst(req));
  else if (isShell(p)) e.respondWith(networkFirst(req));
});
