import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Course } from "@/lib/types";
import { firstLine } from "@/lib/types";
import { loadMajorTree } from "@/lib/majors";
import { Cover } from "@/components/Cover";
import { majorIcon } from "@/lib/majorIcon";

type Row = Course & { majors: { code: string; name: string }[] };

export default async function BrowseMajorPage(props: PageProps<"/browse/[code]">) {
  const { code } = await props.params;
  const supabase = await createClient();

  const tree = await loadMajorTree(supabase);
  const node = tree.byCode.get(code);
  if (!node) notFound();
  const parent = node.parent ? tree.byCode.get(node.parent) : undefined;
  const ic = majorIcon(node.name);

  const { data } = await supabase
    .from("courses")
    .select("*")
    .contains("majors", JSON.stringify([{ code }]))
    .order("course");
  const rows = (data ?? []) as Row[];

  // 열린 매물 수 (과목별)
  const ids = rows.map((r) => r.id);
  const { data: open } = ids.length
    ? await supabase.from("listings_public").select("course_id, kind").in("course_id", ids).eq("status", "open")
    : { data: [] };
  const listingCount = new Map<string, { sell: number; buy: number }>();
  for (const l of open ?? []) {
    if (!l.course_id) continue;
    const e = listingCount.get(l.course_id) ?? { sell: 0, buy: 0 };
    e[l.kind as "sell" | "buy"]++;
    listingCount.set(l.course_id, e);
  }

  const grouped = new Map<string, Row[]>();
  for (const r of rows) grouped.set(r.course, [...(grouped.get(r.course) ?? []), r]);

  return (
    <div className="pb-8">
      <section className="px-4 pt-4 pb-3">
        <nav className="flex items-center gap-1 text-[12px] text-gray-3">
          <Link href="/browse" className="press rounded-full hover:text-action">학과·트랙</Link>
          {parent && (
            <>
              <span>›</span>
              <Link href={`/browse/${parent.code}`} className="press rounded-full hover:text-action">{parent.name}</Link>
            </>
          )}
        </nav>
        <div className="mt-3 flex items-center gap-3">
          <span aria-hidden className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[22px] ${ic.bg}`}>{ic.icon}</span>
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-bold tracking-tight">{node.name}</h1>
            <p className="text-[12px] text-gray-2">
              <span className="course-code mr-1.5">{code}</span>
              과목 {grouped.size} · 분반 {rows.length}
              {node.kind === "track" && node.share != null && parent ? ` · ${parent.name} 분반의 ${Math.round(node.share * 100)}%` : ""}
            </p>
          </div>
        </div>
      </section>

      {/* 학부·학과면 트랙 필터 바 (가로 스크롤 칩) — 당근 카테고리 칩 패턴 */}
      {node.tracks.length > 0 && (
        <div className="sticky top-14 z-10 border-y border-line bg-white/95 backdrop-blur">
          <ul className="flex gap-1.5 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <li className="shrink-0">
              <span className="inline-flex h-8 items-center rounded-full bg-navy px-3 text-[12px] font-semibold text-white">전체 {grouped.size}</span>
            </li>
            {node.tracks.map((t) => (
              <li key={t.code} className="shrink-0">
                <Link href={`/browse/${t.code}`}
                  className="press inline-flex h-8 items-center gap-1 rounded-full border border-line bg-white px-3 text-[12px] font-medium text-gray-1 hover:border-action hover:text-action">
                  {t.name.replace(/트랙$/, "")}
                  <span className="text-gray-3">{t.courses}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="stagger">
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
                      <Link href={`/courses/${c.id}`} className="group flex items-baseline gap-2 rounded text-[13px]">
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
