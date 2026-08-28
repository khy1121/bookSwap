"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleWatch } from "@/app/watch/actions";
import { usePush } from "@/lib/usePush";
import { InstallGuideSheet } from "./InstallGuideSheet";

/**
 * "새 매물 알림 받기" — 과목을 구독하고, 이 기기의 푸시가 꺼져 있으면 같이 켠다.
 * 비로그인 상태면 로그인으로 보낸다.
 */
export function WatchButton({ courseId, initialWatching, initialCount, loggedIn }: { courseId: string; initialWatching: boolean; initialCount: number; loggedIn: boolean }) {
  const router = useRouter();
  const push = usePush();
  const [watching, setWatching] = useState(initialWatching);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);

  async function onClick() {
    setMsg(null);
    if (!loggedIn) { router.push(`/login?next=/courses/${courseId}`); return; }
    if (!watching && push.state === "ios-needs-install") { setGuide(true); return; }
    setBusy(true);
    try {
      // 켜는 경우: 이 기기의 푸시부터 (권한 요청은 클릭 안에서만 가능)
      let pushNote: string | null = null;
      if (!watching && push.state === "off") {
        const r = await push.enable();
        if (r !== true) pushNote = r;
      }
      const r = await toggleWatch(courseId);
      if (r.error) { setMsg(r.error); return; }
      setWatching(r.watching); setCount(r.count);
      setMsg(r.watching
        ? pushNote ? `알림 대기에 등록됐지만 이 기기 푸시는 꺼져 있습니다 — ${pushNote}` : "이 수업에 새 판매·구매가 올라오면 바로 알려드릴게요."
        : "알림을 껐습니다.");
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-3">
      <button type="button" onClick={onClick} disabled={busy || push.state === "busy"}
        className={`press inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold disabled:opacity-60 ${
          watching ? "border-blue bg-surface-soft text-blue" : "border-line bg-white text-gray-1 hover:border-action hover:text-action"
        }`}>
        <span aria-hidden className={`${busy ? "icon-[lucide--loader-circle] animate-spin" : watching ? "icon-[lucide--bell-ring]" : "icon-[lucide--bell-plus]"} size-4`} />
        {watching ? "새 매물 알림 켜짐" : "새 매물 알림 받기"}
        <span className={`text-[12px] font-medium ${watching ? "text-blue/70" : "text-gray-3"}`}>· 대기 {count}명</span>
      </button>
      {msg && <p className="mt-1.5 text-[12px] text-gray-2">{msg}</p>}
      <InstallGuideSheet platform="ios" open={guide} onClose={() => setGuide(false)} />
    </div>
  );
}
