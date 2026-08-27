"use client";

import { useState } from "react";

/** 교재 표지 또는 실물 사진 썸네일. 없거나 로드에 실패하면 책등 모양 플레이스홀더. */
export function Cover({
  src,
  alt,
  size = "sm",
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const dim = { sm: "h-14 w-10", md: "h-24 w-[68px]", lg: "h-36 w-[102px]" }[size];
  if (!src || failed) {
    return (
      <div
        aria-hidden
        className={`${dim} ${className} shrink-0 rounded-[3px] border-l-[3px] border-l-blue bg-surface-soft`}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${dim} ${className} shrink-0 rounded-[3px] object-cover shadow-[0_1px_3px_rgba(0,44,119,0.18)]`}
    />
  );
}
