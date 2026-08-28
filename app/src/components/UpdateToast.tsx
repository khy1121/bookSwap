"use client";

import { useEffect, useState } from "react";
import { logEvent } from "@/app/actions";

/**
 * 새 배포 감지 → 바닥에서 올라오는 토스트 → [업데이트하기] → 새 서비스워커 활성화 → 자동 새로고침.
 * 감지: 페이지 로드·탭 복귀·15분 주기로 registration.update() 호출.
 */
export function UpdateToast() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let reg: ServiceWorkerRegistration | undefined;
    let reloading = false;

    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const watch = (r: ServiceWorkerRegistration) => {
      // 이미 대기 중인 워커가 있으면(이전 방문에서 받아둔 새 버전) 바로 안내
      if (r.waiting && navigator.serviceWorker.controller) setWaiting(r.waiting);
      r.addEventListener("updatefound", () => {
        const nw = r.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          // 첫 설치(controller 없음)는 새 버전이 아니므로 제외
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(nw);
            void logEvent("app_update_prompted", {});
          }
        });
      });
    };

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((r) => { reg = r; watch(r); }).catch(() => { /* 등록 실패는 조용히 */ });

    const check = () => reg?.update().catch(() => {});
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    const t = setInterval(check, 15 * 60_000);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(t);
    };
  }, []);

  if (!waiting) return null;

  function apply() {
    if (!waiting) return;
    setApplying(true);
    void logEvent("app_update_applied", {});
    waiting.postMessage({ type: "SKIP_WAITING" });
    // controllerchange가 안 오는 예외 상황 대비: 3초 뒤 강제 새로고침
    setTimeout(() => window.location.reload(), 3000);
  }

  return (
    <div role="status" aria-live="polite"
      className="anim-toast fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm sm:bottom-6">
      <div className="flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <span aria-hidden className="icon-[lucide--sparkles] size-5 shrink-0 text-sky" />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold">새로운 버전이 있어요!</div>
          <div className="text-[12px] text-white/70">업데이트하면 최신 화면으로 바뀝니다.</div>
        </div>
        <button type="button" onClick={apply} disabled={applying}
          className="press h-9 shrink-0 rounded-full bg-white px-3.5 text-[13px] font-bold text-ink disabled:opacity-60">
          {applying ? <span aria-hidden className="icon-[lucide--loader-circle] size-4 animate-spin" /> : "업데이트하기"}
        </button>
      </div>
    </div>
  );
}
