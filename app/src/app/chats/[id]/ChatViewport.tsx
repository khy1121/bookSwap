"use client";

import { useEffect, useRef } from "react";

/**
 * 채팅 화면 컨테이너. 헤더 아래를 꽉 채우고(문서 스크롤 없음), iOS에서 키보드가 올라오면
 * visualViewport 높이에 맞춰 줄어들어 입력창이 항상 키보드 바로 위에 붙는다.
 */
export function ChatViewport({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    const el = ref.current;
    if (!vv || !el) return;
    const HEADER = 56; // h-14
    const apply = () => {
      // 키보드가 올라오면 레이아웃 뷰포트는 그대로고 visualViewport만 줄어든다 → 그 높이를 따라간다
      const h = Math.round(vv.height - HEADER);
      el.style.height = `${h}px`;
      // iOS가 포커스 시 페이지를 밀어 올리는 것을 되돌린다
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => { vv.removeEventListener("resize", apply); vv.removeEventListener("scroll", apply); el.style.height = ""; };
  }, []);

  return (
    <div ref={ref} data-chat-room className="fixed inset-x-0 top-14 z-10 mx-auto flex h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col overflow-hidden bg-white">
      {children}
    </div>
  );
}
