/**
 * 서비스워커. 배포마다 BUILD 값이 바뀌어 바이트가 달라지므로 브라우저가 "새 버전"을 감지한다.
 * 캐싱은 하지 않는다(Next 정적 자산은 해시로 이미 캐시됨) — 역할은 업데이트 감지·적용뿐.
 */
const BUILD = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

export async function GET() {
  const js = `// BookSwap service worker — build ${BUILD}
const BUILD = ${JSON.stringify(BUILD)};
self.addEventListener("install", () => {
  // 대기 상태로 두고, 페이지가 SKIP_WAITING을 보낼 때만 활성화 (사용자가 '업데이트하기'를 누른 시점)
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // 이전 빌드의 정적 캐시는 정리
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("bs-static-") && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
// 앱 셸 정적 자원 캐시: /_next/static(해시 이름 → 영구), /fonts·/icons(갱신되면 뒤에서 교체). HTML·API는 항상 네트워크.
const CACHE = "bs-static-" + BUILD;
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const immutable = url.pathname.startsWith("/_next/static/");
  const swr = url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/icons/");
  if (!immutable && !swr) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    const fetching = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    if (hit) { if (swr) void fetching.catch(() => {}); return hit; }
    return fetching;
  })());
});
// 푸시 수신 → 알림 표시 (OS 기본 알림음·진동). data.url로 이동
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: "BookSwap", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "BookSwap";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    tag: data.tag || undefined,
    renotify: !!data.tag,
    vibrate: [100, 50, 100],
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  const target = new URL(url, self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // 1) 같은 주소가 이미 열려 있으면 포커스
    for (const c of all) {
      if (c.url === target && "focus" in c) { try { return await c.focus(); } catch (e) {} }
    }
    // 2) 열린 창(앱)이 있으면 그 창을 채팅방으로 이동 (실패하면 새 창으로 폴백)
    for (const c of all) {
      if ("navigate" in c) {
        try { const w = await c.navigate(target); if (w && "focus" in w) await w.focus(); return; } catch (e) {}
      }
    }
    // 3) 없으면 새 창(설치된 PWA면 앱으로 열림)
    try { await self.clients.openWindow(target); } catch (e) {}
  })());
});
    const target = new URL(url, self.location.origin).href;
    for (const c of all) {
      if (c.url === target && "focus" in c) return c.focus();
    }
    for (const c of all) {
      if ("navigate" in c && "focus" in c) { await c.navigate(target); return c.focus(); }
    }
    return self.clients.openWindow(target);
  })());
});
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === "GET_BUILD" && event.source) event.source.postMessage({ type: "BUILD", build: BUILD });
});
`;
  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
