"use client";

import { useState } from "react";
import { usePush } from "@/lib/usePush";
import { InstallGuideSheet } from "./InstallGuideSheet";

/** 채팅 푸시 알림 켜기/끄기. 권한 요청은 브라우저 규칙상 버튼 클릭에서만 가능. */
export function PushToggle({ compact = false }: { compact?: boolean }) {
  const { state, enable, disable } = usePush();
  const [guide, setGuide] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onEnable() {
    setMsg(null);
    if (state === "ios-needs-install") { setGuide(true); return; }
    const r = await enable();
    setMsg(r === true ? "이제 새 채팅이 오면 폰 알림이 울립니다." : r);
  }
  async function onDisable() { await disable(); setMsg("알림을 껐습니다."); }

  if (state === "loading" || state === "unsupported") return null;

  const on = state === "on";
  const label =
    state === "ios-needs-install" ? "알림 받으려면 홈 화면에 추가"
    : state === "denied" ? "알림이 차단됨 — 브라우저 설정에서 허용"
    : on ? "채팅 알림 켜짐" : "채팅 알림 켜기";
  const icon = on ? "icon-[lucide--bell-ring]" : state === "denied" ? "icon-[lucide--bell-off]" : "icon-[lucide--bell]";

  return (
    <div className={compact ? "flex items-center justify-between gap-2" : ""}>
      <button type="button" disabled={state === "busy" || state === "denied"} onClick={on ? onDisable : onEnable}
        className={`press inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold disabled:opacity-60 ${
          on ? "border-blue bg-surface-soft text-blue" : "border-line bg-white text-gray-1 hover:border-action hover:text-action"
        }`}>
        <span aria-hidden className={`${state === "busy" ? "icon-[lucide--loader-circle] animate-spin" : icon} size-4`} />
        {label}
        {on && <span aria-hidden className="icon-[lucide--check] size-3.5" />}
      </button>
      {msg && <p className={`text-[12px] text-gray-2 ${compact ? "truncate" : "mt-1.5"}`}>{msg}</p>}
      <InstallGuideSheet platform="ios" open={guide} onClose={() => setGuide(false)} />
    </div>
  );
}
