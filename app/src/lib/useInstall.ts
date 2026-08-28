"use client";

import { useEffect, useState } from "react";
import { logEvent } from "@/app/actions";

export type Platform = "android" | "ios" | "inapp" | "desktop";
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function detectPlatform(ua: string): Platform {
  if (/kakaotalk|instagram|fbav|fban|line\/|naver\(inapp|everytimeapp/i.test(ua)) return "inapp";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

// beforeinstallprompt는 페이지당 한 번만 오므로 모듈 스코프에 보관해 여러 컴포넌트가 공유
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e as BeforeInstallPromptEvent; listeners.forEach((l) => l()); });
  window.addEventListener("appinstalled", () => { deferredPrompt = null; listeners.forEach((l) => l()); });
}

/** 설치 상태·플랫폼·설치 실행. force는 미리보기(?pwa=)용. */
export function useInstall(force?: Platform | null) {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const sync = () => { setCanPrompt(!!deferredPrompt); if (!deferredPrompt && isStandalone()) setInstalled(true); };
    // 초기 상태는 다음 틱에 반영 (effect 안의 동기 setState 회피)
    const init = setTimeout(() => { setStandalone(isStandalone()); setPlatform(force ?? detectPlatform(navigator.userAgent)); sync(); }, 0);
    listeners.add(sync);
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => { clearTimeout(init); listeners.delete(sync); window.removeEventListener("appinstalled", onInstalled); };
  }, [force]);

  /** 네이티브 프롬프트가 가능하면 띄우고 결과를 돌려준다. 아니면 "guide" (안내 시트 필요). */
  async function install(): Promise<"accepted" | "dismissed" | "guide"> {
    if (deferredPrompt) {
      const p = deferredPrompt;
      await p.prompt();
      const { outcome } = await p.userChoice;
      void logEvent("pwa_install_choice", { outcome });
      deferredPrompt = null;
      listeners.forEach((l) => l());
      return outcome;
    }
    void logEvent("pwa_guide_shown", { platform });
    return "guide";
  }

  return { platform, standalone, canPrompt, installed, install };
}
