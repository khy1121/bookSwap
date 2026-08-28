/**
 * 최근 오류 보기: npm run errors [-- hours]   (기본 24시간)
 * events.event = 'error' | 'client_error' | 'push_sent'(failed>0) 를 모아 where별로 묶어 보여준다.
 */
import { createClient } from "@supabase/supabase-js";

const hours = Number(process.argv[2] ?? 24);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function main() {
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const { data, error } = await admin
    .from("events").select("ts, user_id, event, props")
    .in("event", ["error", "client_error"]).gte("ts", since).order("ts", { ascending: false }).limit(500);
  if (error) throw error;
  const rows = data ?? [];
  console.log(`최근 ${hours}시간 오류 ${rows.length}건`);
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const p = r.props as { where?: string; message?: string };
    const key = `${r.event}:${p.where ?? "client"}:${(p.message ?? "").slice(0, 60)}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  for (const [key, list] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const last = list[0];
    console.log(`\n× ${list.length}  ${key}`);
    console.log(`   마지막 ${new Date(last.ts).toLocaleString("ko-KR")}  user=${last.user_id ?? "-"}`);
    console.log(`   ${JSON.stringify(last.props).slice(0, 300)}`);
  }
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
