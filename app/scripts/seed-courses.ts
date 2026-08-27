// data/hansung_<term>_textbooks.csv → public.courses upsert (plan 기준)
// 사용: npx tsx scripts/seed-courses.ts 20262
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const term = process.argv[2] ?? "20262";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요 (.env.local)");

const csvPath = resolve(process.cwd(), `../data/hansung_${term}_textbooks.csv`);
const rows = parse(readFileSync(csvPath, "utf8"), { columns: true, bom: true }) as Record<string, string>[];
const supabase = createClient(url, key, { auth: { persistSession: false } });

const records = rows.map((r) => ({
  term, plan: r.plan, major_code: r.major_code, major: r.major,
  course_code: r.course_code, course: r.course, prof: r.prof, bunban: r.bunban,
  book: r.book || null, subbook: r.subbook || null,
}));

async function main() {
let done = 0;
for (let i = 0; i < records.length; i += 500) {
  const { error } = await supabase.from("courses").upsert(records.slice(i, i + 500), { onConflict: "plan" });
  if (error) throw error;
  done += Math.min(500, records.length - i);
  console.log(`${done}/${records.length}`);
}
console.log("seed 완료");
}
main().catch((e) => { console.error(e); process.exit(1); });
