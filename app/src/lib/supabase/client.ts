"use client";

import { createBrowserClient } from "@supabase/ssr";

/** 브라우저 전용 클라이언트 — Realtime 구독처럼 서버에서 못 하는 것에만 쓴다. 세션은 @supabase/ssr 쿠키에서 읽는다. */
let client: ReturnType<typeof createBrowserClient> | null = null;
export function supabaseBrowser() {
  client ??= createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return client;
}
