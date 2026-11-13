// UNIVERSE SIMULATOR 서비스 워커: 다시 방문하면 코드·텍스처를 캐시에서 바로 씁니다.
// - 페이지(HTML): 네트워크 먼저, 끊기면 캐시
// - 해시가 붙은 코드(assets/)와 텍스처(textures/): 캐시 먼저
const VERSION = 'v1'
const PAGE_CACHE = `universe-pages-${VERSION}`
const ASSET_CACHE = `universe-assets-${VERSION}`
const SCOPE = new URL(self.registration.scope).pathname

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PAGE_CACHE).then((cache) => cache.add(SCOPE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('universe-') && key !== PAGE_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return
  // Storybook은 따로 둠
  if (url.pathname.startsWith(`${SCOPE}storybook/`)) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 오프라인용 첫 화면은 정상 HTML 응답으로만 갱신
          // (없는 주소의 404.html이나, 주소창으로 직접 연 텍스처·스크립트로 덮어쓰지 않음)
          const html = (response.headers.get('content-type') ?? '').includes('text/html')
          if (response.ok && html) {
            const copy = response.clone()
            // 응답을 돌려준 뒤에도 캐시 쓰기가 끝날 때까지 서비스 워커를 살려 둠
            event.waitUntil(
              caches
                .open(PAGE_CACHE)
                .then((cache) => cache.put(SCOPE, copy))
                .catch(() => {}),
            )
          }
          return response
        })
        .catch(() => caches.match(SCOPE).then((cached) => cached ?? Response.error())),
    )
    return
  }

  const path = url.pathname.slice(SCOPE.length)
  if (path.startsWith('assets/') || path.startsWith('textures/')) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok)
          event.waitUntil(cache.put(request, response.clone()).catch(() => {}))
        return response
      }),
    )
  }
})
