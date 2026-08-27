// 매칭 결과 감사: 카탈로그 교재명 → 채택된 책. 사람이 훑어보기 위한 표.
import { createClient } from "@supabase/supabase-js";
import { normalizeTitle, kakaoCandidates, pickBest } from "./fetch-covers";
import { writeFileSync } from "node:fs";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
async function main() {
  const rows: { course: string; book: string; cover_url: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await s.from("courses").select("course, book, cover_url").not("book", "is", null).range(from, from + 999);
    rows.push(...(data ?? [])); if (!data || data.length < 1000) break;
  }
  const seen = new Map<string, { course: string; raw: string }>();
  for (const r of rows) { const t = normalizeTitle(r.book); if (t && r.cover_url && !seen.has(t)) seen.set(t, { course: r.course, raw: r.book }); }
  const out: string[] = ["| 과목 | 카탈로그 교재명(정규화) | 채택된 책 | 저자 |", "|---|---|---|---|"];
  for (const [t, { course, raw }] of seen) {
    const d = pickBest(t, raw, await kakaoCandidates(t));
    out.push(`| ${course} | ${t} | ${d?.title ?? "-"} | ${d?.authors?.join(",") ?? ""} |`);
    await new Promise((r) => setTimeout(r, 60));
  }
  writeFileSync("../docs/startup/cover-audit.md", "# 표지 매칭 감사 (" + seen.size + "종)\n\n" + out.join("\n") + "\n", "utf8");
  console.log(out.join("\n"));
}
main();
