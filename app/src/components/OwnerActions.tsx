"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteListing, markDone } from "@/app/actions";

/** 본인 매물에만 보이는 수정 · 거래완료 · 삭제. 삭제는 두 번 눌러 확인 (브라우저 confirm 대신). */
export function OwnerActions({ listingId, status, compact = false }: { listingId: string; status: "open" | "done"; compact?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const btn = compact ? "text-[12px]" : "text-[13px]";

  return (
    <div className={`flex items-center gap-3 ${btn}`} onClick={(e) => e.stopPropagation()}>
      <Link href={`/listings/${listingId}/edit`} className="text-action underline">수정</Link>
      {status === "open" && (
        <button type="button" disabled={pending} onClick={() => start(() => markDone(listingId))} className="text-gray-2 underline disabled:opacity-50">
          거래 완료
        </button>
      )}
      {confirming ? (
        <span className="flex items-center gap-2">
          <button type="button" disabled={pending} onClick={() => start(() => deleteListing(listingId))}
            className="rounded bg-red-600 px-2 py-0.5 font-semibold text-white disabled:opacity-50">
            {pending ? "삭제 중…" : "정말 삭제"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="text-gray-3 underline">취소</button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="text-red-600 underline">삭제</button>
      )}
    </div>
  );
}
