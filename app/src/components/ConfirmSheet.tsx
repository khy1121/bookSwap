"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** 바텀시트 확인창. body에 포털로 붙여 부모의 transform/overflow 영향을 받지 않는다. 배경 클릭·Esc로 닫힘. */
export function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  pending = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <button aria-label="닫기" onClick={onClose} className="anim-fade-in absolute inset-0 bg-black/40" />
      <div className="anim-sheet-up bottom-bar absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-2xl bg-white px-5 pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <h2 id="sheet-title" className="text-[17px] font-bold">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-gray-2">{description}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} disabled={pending}
            className="press h-12 rounded-xl border border-line bg-white text-[15px] font-semibold text-gray-1 disabled:opacity-50">
            취소
          </button>
          <button type="button" onClick={onConfirm} disabled={pending}
            className={`press h-12 rounded-xl text-[15px] font-bold text-white disabled:opacity-60 ${danger ? "bg-red-600" : "bg-blue"}`}>
            {pending ? "처리 중…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
