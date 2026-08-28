"use client";

import { useEffect, useState } from "react";
import { hasPushSubscription, removePushSubscription, savePushSubscription } from "@/app/push/actions";
import { logEvent } from "@/app/actions";
import { detectPlatform, isStandalone } from "@/lib/useInstall";
import { InstallGuideSheet } from "./InstallGuideSheet";

type State = "loading" | "unsupported" | "ios-needs-install" | "denied" | "off" | "on" | "busy";

function b64ToUint8(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** 채팅 푸시 알림 켜기/끄기. 권한 요청은 브라우저 규칙상 버튼 클릭에서만 가능. */
export function PushToggle({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>("loading");
  const [guide, setGuide] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState(detectPlatform(navigator.userAgent) === "ios" && !isStandalone() ? "ios-needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") { setState("denied"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub && (await hasPushSubscription(sub.endpoint))) setState("on");
      else setState("off");
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function enable() {
    setMsg(null);
    if (state === "ios-needs-install") { setGuide(true); return; }
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      void logEvent("push_permission", { result: perm });
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); return; }
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) { setMsg("알림 서버 키가 설정되지 않았습니다."); setState("off"); return; }
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(key) }));
      const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const r = await savePushSubscription(j, navigator.userAgent);
      if (!r.ok) { setMsg(r.error ?? "저장 실패"); setState("off"); return; }
      setState("on");
      setMsg("이제 새 채팅이 오면 폰 알림이 울립니다.");
    } catch (e) {
      console.error(e);
      setMsg("알림을 켜지 못했습니다. 브라우저 설정에서 알림 권한을 확인해 주세요.");
      setState("off");
    }
  }

  async function disable() {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await removePushSubscription(sub.endpoint); await sub.unsubscribe(); }
      setState("off"); setMsg("알림을 껐습니다.");
    } catch { setState("on"); }
  }

  if (state === "loading" || state === "unsupported") return null;

  const on = state === "on";
  const label =
    state === "ios-needs-install" ? "알림 받으려면 홈 화면에 추가"
    : state === "denied" ? "알림이 차단됨 — 브라우저 설정에서 허용"
    : on ? "채팅 알림 켜짐" : "채팅 알림 켜기";
  const icon = on ? "icon-[lucide--bell-ring]" : state === "denied" ? "icon-[lucide--bell-off]" : "icon-[lucide--bell]";

  return (
    <div className={compact ? "flex items-center justify-between gap-2" : ""}>
      <button type="button" disabled={state === "busy" || state === "denied"} onClick={on ? disable : enable}
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
