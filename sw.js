const CACHE = 'geopdf-viewer-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

// 설치: 필수 파일 캐시
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      // CDN은 실패해도 무시 (네트워크 없을 때 대비)
      return c.addAll(['./index.html', './manifest.json']).then(() =>
        Promise.allSettled(ASSETS.slice(2).map(url => c.add(url)))
      );
    }).then(() => self.skipWaiting())
  );
});

// 활성화: 구버전 캐시 삭제
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 패치: 캐시 우선 → 네트워크 폴백
self.addEventListener('fetch', e => {
  // POST 요청은 캐시 안함
  if(e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        // 성공 응답만 캐시
        if(res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // 오프라인 폴백
        if(e.request.destination === 'document')
          return caches.match('./index.html');
      });
    })
  );
});
