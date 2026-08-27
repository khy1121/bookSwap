import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { track } from "@/lib/events";
import type { Course, ListingPublic } from "@/lib/types";
import { KIND_COLOR, KIND_LABEL, firstLine, won } from "@/lib/types";
import { Cover } from "@/components/Cover";

export default async function Home(props: PageProps<"/">) {
  const { q = "" } = await props.searchParams;
  const query = String(q).trim();
  const supabase = await createClient();

  let courses: Course[] = [];
  if (query) {
    const safe = query.replace(/[%,()]/g, " ");
    const { data } = await supabase
      .from("courses")
      .select("id, term, major, course_code, course, prof, bunban, book, subbook, cover_url")
      .or(`course.ilike.%${safe}%,prof.ilike.%${safe}%,book.ilike.%${safe}%`)
      .order("course")
      .limit(50);
    courses = (data ?? []) as Course[];
    await track("search", { q: query, results: courses.length });
  }

  const { data: recent } = await supabase
    .from("listings_public")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(12);
  const listings = (recent ?? []) as ListingPublic[];

  const grouped = new Map<string, Course[]>();
  for (const c of courses) grouped.set(c.course, [...(grouped.get(c.course) ?? []), c]);

  return (
    <div className="pb-8">
      <section className="px-4 pt-6 pb-4">
        <h1 className="text-[22px] font-bold leading-snug tracking-tight text-ink">
          이번 학기 교재,
          <br />
          <span className="text-blue">수업 기준</span>으로 찾으세요
        </h1>
        <p className="mt-2 text-[13px] text-gray-2">과목명·교수명·책 제목 중 아무거나</p>
        <form className="mt-4 flex h-12 overflow-hidden rounded-lg border border-line bg-surface" action="/">
          <input
            name="q"
            defaultValue={query}
            placeholder="예) 객체지향언어2"
            className="min-w-0 flex-1 bg-transparent px-4 text-[15px] outline-none placeholder:text-gray-3"
            autoFocus
          />
          <button className="px-5 text-[14px] font-semibold text-white bg-navy">검색</button>
        </form>
        <Link href="/browse" className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-action">
          학과·트랙으로 찾기 →
        </Link>
      </section>

      {query && (
        <section className="border-t-8 border-surface">
          <h2 className="px-4 pt-5 pb-2 text-[15px] font-bold">
            수업 <span className="text-blue">{grouped.size}</span>
          </h2>
          {grouped.size === 0 && (
            <p className="px-4 pb-6 text-[13px] text-gray-2">
              해당하는 수업이 없습니다. 다른 표기로 검색하거나{" "}
              <Link className="text-action underline" href="/listings/new">
                수업 없이 등록
              </Link>
              하세요.
            </p>
          )}
          <ul>
            {[...grouped.entries()].map(([name, list]) => (
              <li key={name} className="flex gap-3 border-b border-line px-4 py-3">
                <Cover src={list.find((c) => c.cover_url)?.cover_url} alt="" size="md" className="mt-0.5" />
                <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="course-code">{list[0].course_code}</span>
                  <span className="text-[15px] font-semibold">{name}</span>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {list.map((c) => (
                    <li key={c.id}>
                      <Link href={`/courses/${c.id}`} className="group flex items-baseline gap-2 text-[13px]">
                        <span className="shrink-0 font-medium text-ink group-hover:text-action">
                          {c.prof}
                          {c.bunban ? <span className="text-gray-3"> {c.bunban}</span> : null}
                        </span>
                        <span className="truncate text-gray-2">{c.book ? firstLine(c.book) : "주교재 미기재"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="border-t-8 border-surface">
        <h2 className="px-4 pt-5 pb-2 text-[15px] font-bold">최근 올라온 거래</h2>
        {listings.length === 0 && (
          <p className="px-4 pb-6 text-[13px] text-gray-2">아직 없습니다. 수업을 검색해서 첫 거래를 올려보세요.</p>
        )}
        <ul>
          {listings.map((l) => (
            <li key={l.id} className="border-b border-line">
              <Link href={`/listings/${l.id}`} className="flex items-center gap-3 px-4 py-3">
                <Cover src={l.photos?.[0] ?? l.cover_url} alt="" size="sm" />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[11px] font-bold ${KIND_COLOR[l.kind]}`}>{KIND_LABEL[l.kind]}</span>
                  <span className="block truncate text-[14px] font-medium">
                    {l.book_title}
                    {l.edition ? <span className="text-gray-3"> · {l.edition}</span> : null}
                  </span>
                  <span className="block truncate text-[12px] text-gray-2">
                    {l.course ? `${l.course} · ${l.prof}` : "수업 미지정"}
                  </span>
                </span>
                <span className="shrink-0 text-[14px] font-semibold tabular-nums">{won(l.price)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
