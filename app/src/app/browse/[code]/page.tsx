import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Course } from "@/lib/types";
import { firstLine } from "@/lib/types";
import { Cover } from "@/components/Cover";

type Row = Course & { majors: { code: string; name: string }[] };

export default async function BrowseMajorPage(props: PageProps<"/browse/[code]">) {
  const { code } = await props.params;
  const supabase = await createClient();

  // majors 배열에 이 학과 코드가 포함된 분반 전부
  const { data } = await supabase
    .from("courses")
    .select("*")
    .contains("majors", JSON.stringify([{ code }]))
    .order("course");
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) notFound();
  const majorName = rows[0].majors.find((m) => m.code === code)?.name.replace(/^\[.*?\]\s*/, "") ?? code;

  // 열린 매물 수 (과목별)
  const ids = rows.map((r) => r.id);
  const { data: open } = await supabase.from("listings_public").select("course_id, kind").in("course_id", ids).eq("status", "open");
  const listingCount = new Map<string, { sell: number; buy: number }>();
  for (const l of open ?? []) {
    if (!l.course_id) continue;
    const e = listingCount.get(l.course_id) ?? { sell: 0, buy: 0 };
    e[l.kind as "sell" | "buy"]++;
    listingCount.set(l.course_id, e);
  }

  // 과목명으로 묶기 (교수·분반은 그 아래)
  const grouped = new Map<string, Row[]>();
  for (const r of rows) grouped.set(r.course, [...(grouped.get(r.course) ?? []), r]);

  return (
    <div className="pb-8">
      <section className="px-4 pt-5 pb-3">
        <Link href="/browse" className="text-[12px] text-gray-3">← 학과·트랙</Link>
        <div className="mt-2 flex items-center gap-2">
          <span className="course-code">{code}</span>
          <h1 className="text-[20px] font-bold tracking-tight">{majorName}</h1>
        </div>
        <p className="mt-1 text-[13px] text-gray-2">과목 {grouped.size} · 분반 {rows.length}</p>
      </section>
      <ul className="border-t border-line">
        {[...grouped.entries()].map(([name, list]) => {
          const sum = list.reduce(
            (a, c) => { const e = listingCount.get(c.id); return { sell: a.sell + (e?.sell ?? 0), buy: a.buy + (e?.buy ?? 0) }; },
            { sell: 0, buy: 0 },
          );
          return (
            <li key={name} className="flex gap-3 border-b border-line px-4 py-3">
              <Cover src={list.find((c) => c.cover_url)?.cover_url} alt="" size="md" className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-semibold">{name}</span>
                  {(sum.sell > 0 || sum.buy > 0) && (
                    <span className="shrink-0 text-[11px]">
                      {sum.sell > 0 && <span className="text-sky">판매 {sum.sell}</span>}
                      {sum.sell > 0 && sum.buy > 0 && " · "}
                      {sum.buy > 0 && <span className="text-blue">구매 {sum.buy}</span>}
                    </span>
                  )}
                </div>
                <ul className="mt-1.5 space-y-1">
                  {list.map((c) => (
                    <li key={c.id}>
                      <Link href={`/courses/${c.id}`} className="group flex items-baseline gap-2 text-[13px]">
                        <span className="shrink-0 font-medium text-ink group-hover:text-action">
                          {c.prof}{c.bunban ? <span className="text-gray-3"> {c.bunban}</span> : null}
                        </span>
                        <span className="truncate text-gray-2">{c.book ? firstLine(c.book) : "주교재 미기재"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
