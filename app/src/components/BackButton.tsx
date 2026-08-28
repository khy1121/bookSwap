"use client";

import { usePathname, useRouter } from "next/navigation";

/** 홈 외 모든 화면의 뒤로가기. 히스토리가 없으면(딥링크·PWA 첫 화면) 상위 화면으로. */
function parentOf(pathname: string): string {
  if (/^\/chats\/[^/]+$/.test(pathname)) return "/chats";
  if (/^\/listings\/[^/]+\/edit$/.test(pathname)) return pathname.replace(/\/edit$/, "");
  if (/^\/listings\/new/.test(pathname)) return "/";
  if (/^\/listings\/[^/]+$/.test(pathname)) return "/";
  if (/^\/courses\/[^/]+$/.test(pathname)) return "/browse";
  if (/^\/browse\/[^/]+$/.test(pathname)) return "/browse";
  return "/";
}

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/") return null;

  function back() {
    // 같은 사이트 안에서 이동해 온 기록이 있으면 뒤로, 아니면 상위 화면으로
    const cameFromSite = typeof document !== "undefined" && document.referrer.startsWith(window.location.origin);
    if (window.history.length > 1 && (cameFromSite || window.history.state)) router.back();
    else router.push(parentOf(pathname));
  }

  return (
    <button type="button" onClick={back} aria-label="뒤로"
      className="press -ml-1 mr-1 flex h-9 w-9 items-center justify-center rounded-full text-gray-1 hover:bg-surface">
      <span aria-hidden className="icon-[lucide--chevron-left] size-5" />
    </button>
  );
}
