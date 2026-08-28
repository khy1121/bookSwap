"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { Platform } from "@/lib/useInstall";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[12px] font-bold text-navy">{n}</span>
      <span>{children}</span>
    </li>
  );
}

/** 플랫폼별 수동 설치 안내 바텀시트 (iOS·인앱 브라우저·프롬프트 미지원 Android) */
export function InstallGuideSheet({ platform, open, onClose }: { platform: Platform; open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 0); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="pwa-guide-title">
      <button aria-label="닫기" onClick={onClose} className="anim-fade-in absolute inset-0 bg-black/40" />
      <div className="anim-sheet-up bottom-bar absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-2xl bg-white px-5 pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <h2 id="pwa-guide-title" className="text-[17px] font-bold">
          {platform === "inapp" ? "다른 브라우저로 열기" : platform === "ios" ? "iPhone 홈 화면에 추가하기" : "설치하기"}
        </h2>
        <ol className="mt-3 space-y-3 text-[14px] leading-relaxed text-gray-1">
          {platform === "inapp" && (
            <>
              <Step n={1}>화면 오른쪽 위 <b>⋯</b> 또는 <b>공유</b> 버튼을 누릅니다.</Step>
              <Step n={2}><b>다른 브라우저로 열기</b> (iPhone은 <b>Safari로 열기</b>)를 선택합니다.</Step>
              <Step n={3}>열린 브라우저에서 <b>앱 설치</b>를 누릅니다.</Step>
            </>
          )}
          {platform === "ios" && (
            <>
              <Step n={1}>Safari 하단 가운데 <b>공유</b> 버튼 <span aria-hidden className="icon-[lucide--share] size-4 text-blue" /> 을 누릅니다.</Step>
              <Step n={2}>목록을 내려 <b>홈 화면에 추가</b> <span aria-hidden className="icon-[lucide--square-plus] size-4 text-blue" /> 를 누릅니다.</Step>
              <Step n={3}>오른쪽 위 <b>추가</b>를 누르면 홈 화면에 BookSwap 아이콘이 생깁니다.</Step>
              <li className="rounded-lg bg-surface-soft px-3 py-2 text-[12px] text-gray-2">추가한 앱에서는 로그인을 한 번 더 해야 합니다 (Safari와 로그인이 따로 저장됨).</li>
            </>
          )}
          {(platform === "android" || platform === "desktop") && (
            <>
              <Step n={1}>브라우저 오른쪽 위 <b>⋮</b> 메뉴를 누릅니다.</Step>
              <Step n={2}><b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 누릅니다.</Step>
              <Step n={3}><b>설치</b>를 확인하면 앱 목록에 BookSwap이 생깁니다.</Step>
            </>
          )}
        </ol>
        <button type="button" onClick={onClose} className="press mt-5 h-12 w-full rounded-xl bg-navy text-[15px] font-bold text-white">확인</button>
      </div>
    </div>,
    document.body,
  );
}
