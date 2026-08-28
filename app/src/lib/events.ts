import { createClient, getUser } from "@/lib/supabase/server";

/** 이벤트 기록: user_id, event, ts, props. 실패해도 기능을 막지 않는다. */
export async function track(event: string, props: Record<string, unknown> = {}) {
  try {
    const [supabase, user] = await Promise.all([createClient(), getUser()]);
    await supabase.from("events").insert({ user_id: user?.id ?? null, event, props });
  } catch (e) {
    console.error("track failed", event, e);
  }
}
