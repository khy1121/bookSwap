/**
 * 전체 테이블 JSON 백업: npm run backup  → backups/YYYY-MM-DD_HHMM/<table>.json (gitignore됨)
 * Supabase 무료 플랜엔 자동 백업이 없으므로 주 1회 이상 실행 권장.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TABLES = ["profiles", "courses", "listings", "chat_rooms", "chat_messages", "course_watches", "push_subscriptions", "events"];
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function main() {
  const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "");
  const dir = join("backups", stamp);
  mkdirSync(dir, { recursive: true });
  for (const t of TABLES) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from(t).select("*").range(from, from + 999);
      if (error) throw new Error(`${t}: ${error.message}`);
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    writeFileSync(join(dir, `${t}.json`), JSON.stringify(rows), "utf8");
    console.log(t.padEnd(20), rows.length);
  }
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  writeFileSync(join(dir, "auth_users.json"), JSON.stringify((users?.users ?? []).map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at }))), "utf8");
  console.log("auth_users".padEnd(20), users?.users.length ?? 0, "\n→", dir);
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
