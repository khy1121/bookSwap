import { createClient } from "@supabase/supabase-js";

/**
 * 서버 오류 기록. Sentry 대신 events 테이블에 event='error'로 남긴다 (npm run errors 로 조회).
 * 실패해도 기능을 막지 않고, 항상 console.error도 남긴다.
 */
export async function reportError(where: string, err: unknown, extra: Record<string, unknown> = {}, userId: string | null = null) {
  const e = err as { message?: string; code?: string; digest?: string } | null;
  const props = { where, message: e?.message ?? String(err), code: e?.code ?? null, ...extra };
  console.error(`[${where}]`, props.code ?? "", props.message);
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    const admin = createClient(url, key, { auth: { persistSession: false } });
    await admin.from("events").insert({ user_id: userId, event: "error", props });
  } catch (e2) {
    console.error("[report] failed", (e2 as Error).message);
  }
}
