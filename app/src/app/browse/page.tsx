import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Major = { code: string; name: string };

/** "[V021] 모바일소프트웨어트랙" → "모바일소프트웨어트랙" */
const clean = (name: string) => name.replace(/^\[.*?\]\s*/, "");

function bucket(name: string): "학부·학과" | "트랙" | "교양·기타" {
  const n = clean(name);
  if (/트랙$/.test(n)) return "트랙";
  if (/(학부|학과|전공|학과군|대학원)$/.test(n)) return "학부·학과";
  return "교양·기타";
}

export default async function BrowsePage() {
  const supabase = await createClient();
  // majors 배열을 펼쳐 학과별 과목 수를 센다 (1,400여 행이라 서버에서 집계해도 가볍다)
  const rows: { majors: Major[]; course_code: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from("courses").select("majors, course_code").range(from, from + 999);
    rows.push(...((data ?? []) as typeof rows));
    if (!data || data.length < 1000) break;
  }
  const count = new Map<string, { name: string; courses: Set<string> }>();
  for (const r of rows) {
    for (const m of r.majors ?? []) {
      const e = count.get(m.code) ?? { name: m.name, courses: new Set<string>() };
      e.courses.add(r.course_code);
      count.set(m.code, e);
    }
  }
  const groups = new Map<string, { code: string; name: string; n: number }[]>();
  for (const [code, e] of count) {
    const b = bucket(e.name);
    groups.set(b, [...(groups.get(b) ?? []), { code, name: clean(e.name), n: e.courses.size }]);
  }
  const order: ("학부·학과" | "트랙" | "교양·기타")[] = ["학부·학과", "트랙", "교양·기타"];

  return (
    <div className="pb-8">
      <section className="px-4 pt-5 pb-3">
        <h1 className="text-[20px] font-bold tracking-tight">학과·트랙으로 찾기</h1>
        <p className="mt-1 text-[13px] text-gray-2">2026-2학기 수업계획서 기준 · 교수가 적은 주교재를 함께 표시</p>
      </section>
      {order.map((title) => {
        const list = (groups.get(title) ?? []).sort((a, b) => a.name.localeCompare(b.name, "ko"));
        if (list.length === 0) return null;
        return (
          <section key={title} className="border-t-8 border-surface">
            <h2 className="px-4 pt-5 pb-2 text-[15px] font-bold">
              {title} <span className="text-gray-3">{list.length}</span>
            </h2>
            <ul className="grid grid-cols-2 gap-px bg-line">
              {list.map((m) => (
                <li key={m.code} className="bg-white">
                  <Link href={`/browse/${m.code}`} className="flex h-full flex-col justify-between px-4 py-3 hover:bg-surface-soft">
                    <span className="text-[14px] font-medium leading-snug">{m.name}</span>
                    <span className="mt-1 text-[11px] text-gray-3">
                      <span className="course-code mr-1">{m.code}</span>과목 {m.n}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
