import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { WatchButton } from "@/components/WatchButton";
import { must } from "@/lib/errors";
import type { Course, ListingPublic } from "@/lib/types";
import { KIND_LABEL, firstLine, won } from "@/lib/types";
import { Cover } from "@/components/Cover";

function Rows({ title, list, empty }: { title: string; list: ListingPublic[]; empty: string }) {
  return (
    <section className="border-t-8 border-surface">
      <h2 className="px-4 pt-5 pb-2 text-[15px] font-bold">
        {title} <span className="text-gray-3">{list.length}</span>
      </h2>
      {list.length === 0 && <p className="px-4 pb-5 text-[13px] text-gray-2">{empty}</p>}
      <ul>
        {list.map((l) => (
          <li key={l.id} className="border-b border-line">
            <Link href={`/listings/${l.id}`} className="row flex items-center gap-3 px-4 py-3">
              {l.photos?.length > 0 && <Cover src={l.photos[0]} alt="" size="sm" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">
                  {l.book_title}
                  {l.edition ? <span className="text-gray-3"> · {l.edition}</span> : null}
                </span>
                <span className="block text-[12px] text-gray-2">
                  {l.condition ?? "상태 미기재"} · {new Date(l.created_at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                </span>
              </span>
              <span className="shrink-0 text-[14px] font-semibold tabular-nums">{won(l.price)}</span>
              <span aria-hidden className="icon-[lucide--chevron-right] size-4 text-gray-3" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function CoursePage(props: PageProps<"/courses/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const [{ data: course }, user, listRes, { data: watchCount }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).single<Course>(),
    getUser(),
    supabase.from("listings_public").select("*").eq("course_id", id).eq("status", "open").order("created_at", { ascending: false }),
    supabase.rpc("course_watch_count", { p_course_id: id }),
  ]);
  if (!course) notFound();
  const listings = (must(listRes, "매물 목록") ?? []) as ListingPublic[];
  const watching = user
    ? !!(await supabase.from("course_watches").select("course_id").eq("course_id", id).eq("user_id", user.id).maybeSingle()).data
    : false;
  const waiting = typeof watchCount === "number" ? watchCount : 0;
  const sells = listings.filter((l) => l.kind === "sell");
  const buys = listings.filter((l) => l.kind === "buy");
  const lowestAsk = sells.map((l) => l.price).filter((p): p is number => p != null).sort((a, b) => a - b)[0];
  const highestBid = buys.map((l) => l.price).filter((p): p is number => p != null).sort((a, b) => b - a)[0];

  return (
    <div className="pb-28">
      {/* 상품(교재) 카드 — KREAM 상품 상세처럼 상단 고정 정보 */}
      <section className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2">
          <span className="course-code">{course.course_code}</span>
          <span className="text-[12px] text-gray-3">{course.major.replace(/^\[.*?\]\s*/, "")}</span>
        </div>
        <h1 className="mt-2 text-[22px] font-bold leading-tight tracking-tight">{course.course}</h1>
        <p className="mt-1 text-[14px] text-gray-2">
          {course.prof} 교수
          {course.bunban ? ` · ${course.bunban}분반` : ""} · 2026-2
        </p>

        <div className="anim-fade-up mt-4 flex gap-4 rounded-xl bg-surface-soft p-4">
          <Cover src={course.cover_url} alt={firstLine(course.book) || "교재"} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold tracking-wide text-navy">교수 지정 주교재</div>
            <p className="mt-1 whitespace-pre-line text-[15px] font-medium leading-relaxed text-ink">
              {course.book || "수업계획서에 기재되지 않음"}
            </p>
            {course.subbook && course.subbook !== "없음" && (
              <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-gray-2">부교재 · {course.subbook}</p>
            )}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 divide-x divide-line overflow-hidden rounded-xl border border-line text-center">
          <div className="py-3">
            <dt className="text-[11px] text-gray-3">즉시 구매가 (최저 판매)</dt>
            <dd className="mt-0.5 text-[17px] font-bold tabular-nums text-blue">{lowestAsk != null ? won(lowestAsk) : "—"}</dd>
          </div>
          <div className="py-3">
            <dt className="text-[11px] text-gray-3">즉시 판매가 (최고 구매)</dt>
            <dd className="mt-0.5 text-[17px] font-bold tabular-nums text-sky">{highestBid != null ? won(highestBid) : "—"}</dd>
          </div>
        </dl>

        {/* 수요 신호 + 알림 구독: 매물이 없어도 "기다리는 사람"이 보이게 */}
        <WatchButton courseId={course.id} initialWatching={watching} initialCount={waiting} loggedIn={!!user} />
      </section>

      <Rows title="판매 중" list={sells} empty="아직 판매자가 없습니다. 이 책을 갖고 있다면 판매를 올려보세요." />
      <Rows title="구매 희망" list={buys} empty="아직 구매자가 없습니다. 이 책이 필요하면 구매를 올려보세요." />

      {/* 하단 고정 이중 CTA — KREAM 구매/판매 */}
      <div className="bottom-bar anim-fade-up fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-2 px-4 pt-3">
          <Link
            href={`/listings/new?course=${course.id}&kind=buy`}
            className="press flex flex-1 items-center justify-between rounded-xl bg-blue px-4 py-3 text-white"
          >
            <span className="text-[15px] font-bold">{KIND_LABEL.buy}</span>
            <span className="text-right leading-tight">
              <span className="block text-[13px] font-semibold tabular-nums">{lowestAsk != null ? won(lowestAsk) : "가격 제안"}</span>
              <span className="block text-[10px] opacity-80">{sells.length > 0 ? `판매자 ${sells.length}명` : waiting > 0 ? `${waiting}명이 기다리는 중` : "첫 구매자 되기"}</span>
            </span>
          </Link>
          <Link
            href={`/listings/new?course=${course.id}&kind=sell`}
            className="press flex flex-1 items-center justify-between rounded-xl bg-sky px-4 py-3 text-white"
          >
            <span className="text-[15px] font-bold">{KIND_LABEL.sell}</span>
            <span className="text-right leading-tight">
              <span className="block text-[13px] font-semibold tabular-nums">{highestBid != null ? won(highestBid) : "가격 제안"}</span>
              <span className="block text-[10px] opacity-80">{buys.length > 0 ? `구매자 ${buys.length}명` : waiting > 0 ? `${waiting}명이 기다리는 중` : "첫 판매자 되기"}</span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
