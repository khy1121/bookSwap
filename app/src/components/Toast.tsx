"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** 서버 액션이 redirect(`...?toast=created`)로 넘기면 한 번 보여주고 URL에서 지운다. */
const MESSAGES: Record<string, string> = {
  created: "올렸습니다. 연락이 오면 알려드릴게요",
  updated: "저장했습니다",
  deleted: "삭제했습니다",
  done: "거래 완료로 표시했습니다",
  login: "로그인했습니다",
  error: "처리하지 못했습니다. 잠시 후 다시 시도해 주세요",
  forbidden: "본인 거래만 변경할 수 있습니다",
  expired: "로그인이 만료되었습니다. 다시 로그인해 주세요",
};

const DURATION = 2600;

export function Toast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = params.get("toast");
  const [msg, setMsg] = useState<string | null>(null);

  // 1) URL에 toast가 오면 메시지를 띄우고 파라미터는 바로 지운다 (뒤로가기 재표시 방지)
  useEffect(() => {
    if (!key) return;
    const m = MESSAGES[key] ?? null;
    const show = setTimeout(() => setMsg(m), 0);
    const next = new URLSearchParams(params.toString());
    next.delete("toast");
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
    return () => clearTimeout(show);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // 2) 닫기 타이머는 메시지 기준으로 따로 — URL이 바뀌어도 취소되지 않는다
  useEffect(() => {
    if (!msg) return;
    const hide = setTimeout(() => setMsg(null), DURATION);
    return () => clearTimeout(hide);
  }, [msg]);

  if (!msg) return null;
  return (
    <button type="button" onClick={() => setMsg(null)} role="status" aria-live="polite"
      className="anim-toast fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
      {msg}
    </button>
  );
}
