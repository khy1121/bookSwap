"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useInstall, type Platform } from "@/lib/useInstall";
import { InstallGuideSheet } from "./InstallGuideSheet";

/** 홈 상단 인라인 설치 배너. 모바일 브라우저에서만, 이미 앱으로 열었으면 숨김. 미리보기 ?pwa= */
export function InstallBanner() {
  const params = useSearchParams();
  const force = params.get("pwa") as Platform | null;
  const { platform, standalone, installed, install } = useInstall(force);
  const [guide, setGuide] = useState(false);

  if (!platform || installed || (standalone && !force) || (platform === "desktop" && !force)) return null;

  async function onClick() {
    const r = await install();
    if (r === "guide") setGuide(true);
  }

  return (
    <>
      <section className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-navy to-blue p-3 text-white shadow-[0_6px_20px_rgba(0,44,119,0.25)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl shadow" />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold">앱으로 설치하면 더 빨라요</div>
          <div className="text-[12px] leading-snug text-white/80">
            {platform === "inapp" ? "Chrome·Safari로 열면 홈 화면에 추가할 수 있어요" : "홈 화면에서 바로 열고, 채팅 알림 배지도 확인"}
          </div>
        </div>
        <button type="button" onClick={onClick}
          className="press h-9 shrink-0 rounded-full bg-white px-3.5 text-[13px] font-bold text-navy">
          {platform === "inapp" ? "방법 보기" : platform === "ios" ? "추가하기" : "설치"}
        </button>
      </section>
      <InstallGuideSheet platform={platform} open={guide} onClose={() => setGuide(false)} />
    </>
  );
}
