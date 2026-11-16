
/**
 * PhishGuard AI Service Worker
 * Version 1.0.0
 */

const CACHE_NAME = "phishguard-cache-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];


// ==========================================
// 1. 서비스 워커 설치
// ==========================================

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});


// ==========================================
// 2. 서비스 워커 활성화
// ==========================================

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names => {
        return Promise.all(
          names
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});


// ==========================================
// 3. 네트워크 및 캐시 처리
// ==========================================

self.addEventListener("fetch", event => {
  const request = event.request;

  // GET 요청만 처리
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 다른 서버의 요청은 가로채지 않음
  if (url.origin !== self.location.origin) return;

  // 서비스 워커 적용 범위 밖은 처리하지 않음
  if (!url.pathname.startsWith(
    new URL(self.registration.scope).pathname
  )) {
    return;
  }

  // HTML 페이지는 네트워크 우선
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();

            event.waitUntil(
              caches.open(CACHE_NAME).then(cache => {
                return cache.put(request, copy);
              })
            );
          }

          return response;
        })
        .catch(async () => {
          return (
            await caches.match(request) ||
            await caches.match("./index.html")
          );
        })
    );

    return;
  }

  // 나머지 정적 파일은 캐시 우선
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;

        return fetch(request)
          .then(response => {
            if (response.ok) {
              const copy = response.clone();

              event.waitUntil(
                caches.open(CACHE_NAME).then(cache => {
                  return cache.put(request, copy);
                })
              );
            }

            return response;
          });
      })
  );
});
