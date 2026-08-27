"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="press flex w-[72px] items-center justify-center bg-navy text-[14px] font-semibold text-white" disabled={pending} aria-label="검색">
      {pending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : "검색"}
    </button>
  );
}

/** 홈 검색창: 지우기 버튼, 제출 중 스피너. GET /?q= 로 동작해 JS 없이도 된다. */
export function SearchBox({ defaultValue = "" }: { defaultValue?: string }) {
  const [v, setV] = useState(defaultValue);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <form action="/" className="flex h-12 overflow-hidden rounded-xl border border-line bg-surface transition-[box-shadow,border-color] focus-within:border-action focus-within:shadow-[0_0_0_3px_rgba(0,100,239,0.12)]">
      <input ref={ref} name="q" value={v} onChange={(e) => setV(e.target.value)}
        placeholder="예) 객체지향언어2, 황기태, 컴퓨터공학부"
        className="min-w-0 flex-1 bg-transparent px-4 text-[15px] outline-none placeholder:text-gray-3"
        autoComplete="off" autoFocus maxLength={50} />
      {v && (
        <button type="button" aria-label="지우기" onClick={() => { setV(""); ref.current?.focus(); }}
          className="press px-2 text-gray-3 hover:text-ink">
          <span className="inline-block h-5 w-5 rounded-full bg-line text-center text-[12px] leading-5">×</span>
        </button>
      )}
      <Submit />
    </form>
  );
}
