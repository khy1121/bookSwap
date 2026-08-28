"use server";

import { createClient, getUser } from "@/lib/supabase/server";
import { track } from "@/lib/events";

type SubJSON = { endpoint: string; keys: { p256dh: string; auth: string } };

/** 브라우저 PushSubscription 저장 (기기마다 1행, endpoint 기준 upsert) */
export async function savePushSubscription(sub: SubJSON, userAgent: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false, error: "구독 정보가 올바르지 않습니다." };
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, user_agent: userAgent.slice(0, 200), last_seen_at: new Date().toISOString() },
    { onConflict: "endpoint" },
  );
  if (error) { console.error("[push] save", error.message); return { ok: false, error: "알림 설정을 저장하지 못했습니다." }; }
  await track("push_enabled", {});
  return { ok: true };
}

export async function removePushSubscription(endpoint: string) {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  await track("push_disabled", {});
}

/** 이 기기가 구독돼 있는지 (endpoint 기준) */
export async function hasPushSubscription(endpoint: string): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("push_subscriptions").select("id").eq("endpoint", endpoint).eq("user_id", user.id).maybeSingle();
  return !!data;
}
