import type { NextRequest } from "next/server";

/**
 * 서비스워커. 배포마다 BUILD 값이 바뀌어 바이트가 달라지므로 브라우저가 "새 버전"을 감지한다.
 * 캐싱은 하지 않는다(Next 정적 자산은 해시로 이미 캐시됨) — 역할은 업데이트 감지·적용뿐.
 */
const BUILD = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

export async function GET(_req: NextRequest) {
  const js = `// BookSwap service worker — build ${BUILD}
const BUILD = ${JSON.stringify(BUILD)};
self.addEventListener("install", () => {
  // 대기 상태로 두고, 페이지가 SKIP_WAITING을 보낼 때만 활성화 (사용자가 '업데이트하기'를 누른 시점)
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
