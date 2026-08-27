"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteListing, markDone } from "@/app/actions";
import { ConfirmSheet } from "./ConfirmSheet";

/** 본인 매물에만 보이는 수정 · 거래 완료 · 삭제 버튼. 완료·삭제는 바텀시트로 확인 후 실행, 결과는 토스트. */
export function OwnerActions({ listingId, status, title }: { listingId: string; status: "open" | "done"; title: string }) {
  const [sheet, setSheet] = useState<"delete" | "done" | null>(null);
  const [pending, start] = useTransition();
  const base = "press flex h-10 flex-1 items-center justify-center gap-1 rounded-xl text-[13px] font-semibold";

  return (
    <>
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <Link href={`/listings/${listingId}/edit`} className={`${base} border border-line bg-white text-gray-1 hover:border-action hover:text-action`}>
          <span aria-hidden className="icon-[lucide--pencil] size-4" />수정
        </Link>
        {status === "open" && (
          <button type="button" onClick={() => setSheet("done")} className={`${base} bg-navy text-white`}>
            <span aria-hidden className="icon-[lucide--check] size-4" />거래 완료
          </button>
        )}
        <button type="button" onClick={() => setSheet("delete")}
          className={`${base} border border-red-200 bg-red-50 text-red-600 hover:bg-red-100`}>
          <span aria-hidden className="icon-[lucide--trash-2] size-4" />삭제
        </button>
      </div>

      <ConfirmSheet
        open={sheet === "delete"}
        title="이 거래를 삭제할까요?"
        description={`"${title}" 글과 사진이 지워지고 되돌릴 수 없습니다. 거래가 끝났다면 삭제 대신 '거래 완료'를 눌러도 됩니다.`}
        confirmLabel="삭제"
        danger
        pending={pending}
        onConfirm={() => start(() => deleteListing(listingId))}
        onClose={() => setSheet(null)}
      />
      <ConfirmSheet
        open={sheet === "done"}
        title="거래 완료로 표시할까요?"
        description="목록과 즉시가에서 빠지고, 내 거래에 완료로 남습니다."
        confirmLabel="완료로 표시"
        pending={pending}
        onConfirm={() => start(() => markDone(listingId))}
        onClose={() => setSheet(null)}
      />
    </>
  );
}
