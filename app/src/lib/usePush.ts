"use client";

import { useEffect, useState } from "react";
import { hasPushSubscription, removePushSubscription, savePushSubscription } from "@/app/push/actions";
import { logEvent } from "@/app/actions";
import { detectPlatform, isStandalone } from "@/lib/useInstall";

export type PushState = "loading" | "unsupported" | "ios-needs-install" | "denied" | "off" | "on" | "busy";

function b64ToUint8(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** 이 기기의 푸시 구독 상태와 켜기/끄기. 권한 요청은 브라우저 규칙상 사용자 클릭 안에서만 가능하다. */
export function usePush() {
  const [state, setState] = useState<PushState>("loading");

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState(detectPlatform(navigator.userAgent) === "ios" && !isStandalone() ? "ios-needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") { setState("denied"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub && (await hasPushSubscription(sub.endpoint)) ? "on" : "off");
    }, 0);
    return () => clearTimeout(t);
  }, []);

  /** 켜기. 성공하면 true. 실패 사유는 문자열로 돌려준다. */
  async function enable(): Promise<true | string> {
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      void logEvent("push_permission", { result: perm });
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); return perm === "denied" ? "알림이 차단돼 있습니다. 브라우저 설정에서 허용해 주세요." : "알림 권한을 허용해야 받을 수 있습니다."; }
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) { setState("off"); return "알림 서버 키가 설정되지 않았습니다."; }
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(key) }));
      const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const r = await savePushSubscription(j, navigator.userAgent);
      if (!r.ok) { setState("off"); return r.error ?? "저장 실패"; }
      setState("on");
      return true;
    } catch (e) {
      console.error(e);
      setState("off");
      return "알림을 켜지 못했습니다. 브라우저 설정에서 알림 권한을 확인해 주세요.";
    }
  }

  async function disable() {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await removePushSubscription(sub.endpoint); await sub.unsubscribe(); }
      setState("off");
    } catch { setState("on"); }
  }

  return { state, enable, disable };
}
