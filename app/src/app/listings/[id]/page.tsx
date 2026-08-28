import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ListingPublic } from "@/lib/types";
import { KIND_COLOR, KIND_LABEL, ROLE_LABEL, won } from "@/lib/types";
import { RevealContact } from "./RevealContact";
import { OwnerActions } from "@/components/OwnerActions";
import { Cover } from "@/components/Cover";

export default async function ListingPage(props: PageProps<"/listings/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  // 매물·사용자·소유 확인을 한 번에 (listings 원본은 RLS로 본인 것만 보인다)
  const [{ data: l }, user, { data: own }] = await Promise.all([
    supabase.from("listings_public").select("*").eq("id", id).single<ListingPublic>(),
    getUser(),
    supabase.from("listings").select("user_id").eq("id", id).maybeSingle(),
  ]);
  if (!l) notFound();
  const isOwner = !!user && own?.user_id === user.id;
  const done = l.status === "done";

  return (
    <div className="pb-28">
      {l.photos?.length > 0 ? (
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto bg-surface px-4 py-3">
          {l.photos.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={`실물 사진 ${i + 1}`}
              className="anim-fade-up h-64 w-[85%] shrink-0 snap-center rounded-xl object-cover"
            />
          ))}
        </div>
      ) : l.cover_url ? (
        <div className="flex justify-center bg-surface py-5">
          <Cover src={l.cover_url} alt={l.book_title} size="lg" />
        </div>
      ) : null}

      <section className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2 text-[12px]">
          <span className={`font-bold ${KIND_COLOR[l.kind]}`}>{ROLE_LABEL[l.kind]}의 {KIND_LABEL[l.kind]}</span>
          {done && <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-gray-2">거래 완료</span>}
        </div>
        <h1 className="mt-2 text-[22px] font-bold leading-tight tracking-tight">
          {l.book_title}
          {l.edition ? <span className="text-gray-3"> {l.edition}</span> : null}
        </h1>
        <p className="mt-2 text-[24px] font-bold tabular-nums">{won(l.price)}</p>
        {l.course_id && (
          <Link href={`/courses/${l.course_id}`} className="press mt-2 inline-flex items-center gap-1 rounded-full text-[13px] text-action">
            {l.course} · {l.prof} 교수<span aria-hidden className="icon-[lucide--chevron-right] size-3.5" />
          </Link>
        )}
      </section>

      <section className="border-t-8 border-surface px-4 py-4">
        <dl className="divide-y divide-line text-[14px]">
          <div className="flex py-3">
            <dt className="w-24 shrink-0 text-gray-3">상태</dt>
            <dd>{l.condition ?? "미기재"}</dd>
          </div>
          {l.note && (
            <div className="flex py-3">
              <dt className="w-24 shrink-0 text-gray-3">메모</dt>
              <dd className="whitespace-pre-line">{l.note}</dd>
            </div>
          )}
          <div className="flex py-3">
            <dt className="w-24 shrink-0 text-gray-3">올린 날</dt>
            <dd>{new Date(l.created_at).toLocaleDateString("ko-KR")}</dd>
          </div>
        </dl>

        {l.course_book && (
          <div className="mt-2 rounded-xl bg-surface-soft p-4">
            <div className="text-[11px] font-semibold tracking-wide text-navy">교수 지정 주교재 (공식)</div>
            <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-gray-1">{l.course_book}</p>
            <p className="mt-2 text-[11px] text-gray-3">판본이 다를 수 있으니 {ROLE_LABEL[l.kind]}에게 확인하세요.</p>
          </div>
        )}
      </section>

      {isOwner && (
        <div className="px-4 py-2">
          <OwnerActions listingId={l.id} status={l.status} title={l.book_title} />
        </div>
      )}

      {!done && !isOwner && <RevealContact listingId={l.id} loggedIn={!!user} kind={l.kind} />}
    </div>
  );
}
