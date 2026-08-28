import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

/** 서버 전용: 서비스 롤로 구독을 읽고 web-push로 발송. 만료된 구독(404/410)은 지운다. */
export type PushPayload = { title: string; body: string; url?: string; tag?: string; icon?: string };

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY, subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<{ sent: number; removed: number; failed: number }> {
  if (!configure() || userIds.length === 0) return { sent: 0, removed: 0, failed: 0 };
  const db = admin();
  const { data: subs, error } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", userIds);
  if (error || !subs?.length) return { sent: 0, removed: 0, failed: 0 };

  const body = JSON.stringify({ icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", ...payload });
  let sent = 0, removed = 0, failed = 0;
  const gone: string[] = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60, urgency: "high" });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) { gone.push(s.id); removed++; }
      else { failed++; console.error("[push] send failed", code, (e as Error).message); }
    }
  }));
  if (gone.length) await db.from("push_subscriptions").delete().in("id", gone);
  return { sent, removed, failed };
}

/** 전체 구독자(중복 사용자 제거)에게 공지 */
export async function sendPushToAll(payload: PushPayload) {
  const db = admin();
  const { data } = await db.from("push_subscriptions").select("user_id");
  const ids = [...new Set((data ?? []).map((r) => r.user_id as string))];
  return sendPushToUsers(ids, payload);
}
