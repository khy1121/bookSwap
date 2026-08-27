"use client";

import Link from "next/link";
import { useEffect } from "react";

/** 페이지 렌더/데이터 오류 경계. 서버에서 던진 메시지는 이미 한국어로 정리되어 온다. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page error]", error.digest ?? "", error.message);
  }, [error]);

  const friendly = error.message && !/^\s*$/.test(error.message) && !error.message.includes("Server Components render")
    ? error.message
    : "화면을 불러오는 중 문제가 생겼습니다.";

  return (
    <div className="anim-fade-up px-4 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff4e5] text-[#b45309]"><span aria-hidden className="icon-[lucide--triangle-alert] size-7" /></div>
      <h1 className="mt-4 text-[18px] font-bold">문제가 생겼습니다</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-2">{friendly}</p>
      {error.digest && <p className="mt-1 text-[11px] text-gray-3">오류 코드 {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={reset} className="press h-11 rounded-xl bg-navy px-5 text-[14px] font-semibold text-white">다시 시도</button>
        <Link href="/" className="press flex h-11 items-center rounded-xl border border-line bg-white px-5 text-[14px] font-semibold text-gray-1">홈으로</Link>
      </div>
    </div>
  );
}
