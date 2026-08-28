"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { logEvent } from "@/app/actions";
import { useInstall, type Platform } from "@/lib/useInstall";
import { InstallGuideSheet } from "./InstallGuideSheet";

const DISMISS_KEY = "bs_install_dismissed_at";
const DISMISS_DAYS = 7;

/**
 * 떠다니는 설치 프롬프트 (첫 방문 1.5초 후). Android는 네이티브 설치, iOS/인앱은 안내 시트.
 * 이미 설치됐거나 7일 안에 닫았으면 표시하지 않는다. 개발 확인용: ?pwa=android|ios|inapp
 */
export function InstallPrompt() {
  const params = useSearchParams();
  const pathname = usePathname();
  const force = params.get("pwa") as Platform | null;
  const { platform, standalone, installed, install } = useInstall(force);
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    if (!platform) return;
    if (pathname === "/") return; // 홈에는 인라인 배너가 있으니 겹치지 않게
    if ((standalone || platform === "desktop") && !force) return;
    try {
      const t = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      if (!force && t && Date.now() - t < DISMISS_DAYS * 86400_000) return;
    } catch { /* storage 접근 불가 시 그냥 표시 */ }
    const show = setTimeout(() => { setOpen(true); void logEvent("pwa_prompt_shown", { platform }); }, 1500);
    return () => clearTimeout(show);
  }, [platform, standalone, force, pathname]);

  function dismiss() {
    setOpen(false); setGuide(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    void logEvent("pwa_prompt_dismissed", { platform });
  }

  async function onInstall() {
    const r = await install();
    if (r === "accepted") setOpen(false);
    else if (r === "dismissed") dismiss();
    else setGuide(true);
  }

  if (!open || installed || !platform) return null;

  const title = platform === "inapp" ? "앱으로 열면 더 편해요" : "홈 화면에 BookSwap 추가";
  const body =
    platform === "inapp" ? "지금 보고 있는 브라우저(카톡 등)에서는 설치가 안 됩니다. Chrome이나 Safari로 열어주세요."
    : platform === "ios" ? "앱처럼 바로 열고, 채팅 확인이 빨라집니다."
    : "한 번 설치하면 주소창 없이 앱처럼 열립니다.";

  return (
    <>
      {!guide && (
        <div role="dialog" aria-label="앱 설치 안내"
          className="anim-fade-up fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md px-3 sm:bottom-4">
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-[0_8px_30px_rgba(0,44,119,0.14)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold">{title}</div>
              <div className="text-[12px] leading-snug text-gray-2">{body}</div>
            </div>
            <button type="button" onClick={onInstall} className="press h-9 shrink-0 rounded-full bg-blue px-3.5 text-[13px] font-bold text-white">
              {platform === "inapp" ? "방법 보기" : platform === "ios" ? "추가 방법" : "설치"}
            </button>
            <button type="button" onClick={dismiss} aria-label="닫기" className="press -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-3 hover:bg-surface">
              <span aria-hidden className="icon-[lucide--x] size-4" />
            </button>
          </div>
        </div>
      )}
      <InstallGuideSheet platform={platform} open={guide} onClose={dismiss} />
    </>
  );
}
