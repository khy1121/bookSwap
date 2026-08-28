"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { logEvent } from "@/app/actions";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Platform = "android" | "ios" | "inapp" | "desktop";
const DISMISS_KEY = "bs_install_dismissed_at";
const DISMISS_DAYS = 7;

function detect(ua: string): Platform {
  if (/kakaotalk|instagram|fbav|fban|line\/|naver\(inapp|everytimeapp/i.test(ua)) return "inapp";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * PWA 설치 안내. Android는 네이티브 설치 프롬프트, iOS는 '홈 화면에 추가' 안내, 인앱 브라우저는 외부 브라우저로 열기 안내.
 * 이미 설치됐거나 7일 안에 닫았으면 표시하지 않는다. 개발 확인용: ?pwa=android|ios|inapp
 */
export function InstallPrompt() {
  const params = useSearchParams();
  const force = params.get("pwa") as Platform | null;
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone() && !force) return;
    try {
      const t = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      if (!force && t && Date.now() - t < DISMISS_DAYS * 86400_000) return;
    } catch { /* storage 접근 불가 시 그냥 표시 */ }
    const p = force ?? detect(navigator.userAgent);
    if (p === "desktop" && !force) return;
    const show = setTimeout(() => { setPlatform(p); setOpen(true); void logEvent("pwa_prompt_shown", { platform: p }); }, 1500);

    const onBIP = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setOpen(false); void logEvent("pwa_installed", {}); };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => { clearTimeout(show); window.removeEventListener("beforeinstallprompt", onBIP); window.removeEventListener("appinstalled", onInstalled); };
  }, [force]);

  function dismiss() {
    setOpen(false); setGuide(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    void logEvent("pwa_prompt_dismissed", { platform });
  }

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      void logEvent("pwa_install_choice", { outcome });
      if (outcome === "accepted") setOpen(false); else dismiss();
      setDeferred(null);
      return;
    }
    // 프롬프트를 못 받는 환경(iOS, 인앱, 설치 조건 미충족) → 안내
    setGuide(true);
    void logEvent("pwa_guide_shown", { platform });
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
            <button type="button" onClick={install} className="press h-9 shrink-0 rounded-full bg-blue px-3.5 text-[13px] font-bold text-white">
              {platform === "inapp" ? "방법 보기" : platform === "ios" ? "추가 방법" : "설치"}
            </button>
            <button type="button" onClick={dismiss} aria-label="닫기" className="press -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-3 hover:bg-surface">
              <span aria-hidden className="icon-[lucide--x] size-4" />
            </button>
          </div>
        </div>
      )}

      {guide && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="pwa-guide-title">
          <button aria-label="닫기" onClick={dismiss} className="anim-fade-in absolute inset-0 bg-black/40" />
          <div className="anim-sheet-up bottom-bar absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-2xl bg-white px-5 pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
            <h2 id="pwa-guide-title" className="text-[17px] font-bold">
              {platform === "inapp" ? "다른 브라우저로 열기" : platform === "ios" ? "iPhone에 추가하기" : "설치하기"}
            </h2>
            <ol className="mt-3 space-y-3 text-[14px] leading-relaxed text-gray-1">
              {platform === "inapp" && (
                <>
                  <Step n={1}>화면 오른쪽 위 <b>⋯</b> 또는 <b>공유</b> 버튼을 누릅니다.</Step>
                  <Step n={2}><b>다른 브라우저로 열기</b> (iPhone은 <b>Safari로 열기</b>)를 선택합니다.</Step>
                  <Step n={3}>열린 브라우저에서 이 안내가 다시 나오면 <b>설치</b>를 누릅니다.</Step>
                </>
              )}
              {platform === "ios" && (
                <>
                  <Step n={1}>Safari 하단 가운데 <b>공유</b> 버튼 <span aria-hidden className="icon-[lucide--share] size-4 text-blue" /> 을 누릅니다.</Step>
                  <Step n={2}>목록을 내려 <b>홈 화면에 추가</b> <span aria-hidden className="icon-[lucide--square-plus] size-4 text-blue" /> 를 누릅니다.</Step>
                  <Step n={3}>오른쪽 위 <b>추가</b>를 누르면 홈 화면에 BookSwap 아이콘이 생깁니다.</Step>
                </>
              )}
              {platform === "android" && (
                <>
                  <Step n={1}>브라우저 오른쪽 위 <b>⋮</b> 메뉴를 누릅니다.</Step>
                  <Step n={2}><b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 누릅니다.</Step>
                  <Step n={3}><b>설치</b>를 확인하면 앱 목록에 BookSwap이 생깁니다.</Step>
                </>
              )}
              {platform === "desktop" && (
                <Step n={1}>주소창 오른쪽의 <b>설치</b> 아이콘을 누르거나, 메뉴에서 <b>앱 설치</b>를 선택합니다.</Step>
              )}
            </ol>
            <button type="button" onClick={dismiss} className="press mt-5 h-12 w-full rounded-xl bg-navy text-[15px] font-bold text-white">확인</button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[12px] font-bold text-navy">{n}</span>
      <span>{children}</span>
    </li>
  );
}
