import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ListingPublic } from "@/lib/types";
import { KIND_COLOR, KIND_LABEL, won } from "@/lib/types";
import { Cover } from "@/components/Cover";
import { OwnerActions } from "@/components/OwnerActions";

export default async function MyPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/my");
  const supabase = await createClient();
  const { data: mine } = await supabase.from("listings").select("id").eq("user_id", user.id);
  const ids = (mine ?? []).map((m) => m.id);
  const { data } = ids.length
    ? await supabase.from("listings_public").select("*").in("id", ids).order("created_at", { ascending: false })
    : { data: [] };
  const list = (data ?? []) as ListingPublic[];

  return (
    <div className="pb-8">
      <section className="px-4 pt-5 pb-3">
        <h1 className="text-[20px] font-bold tracking-tight">내 거래</h1>
        <p className="mt-1 text-[12px] text-gray-3">{user.email}</p>
      </section>
      {list.length === 0 && (
        <p className="px-4 py-6 text-[13px] text-gray-2">
          올린 거래가 없습니다. <Link href="/" className="text-action underline">수업을 검색</Link>해서 시작하세요.
        </p>
      )}
      <ul className="border-t border-line">
        {list.map((l) => {
          const done = l.status === "done";
          return (
            <li key={l.id} className="border-b border-line px-4 py-3">
              <Link href={`/listings/${l.id}`} className="flex items-center gap-3">
                <Cover src={l.photos?.[0] ?? l.cover_url} alt="" size="sm" />
                <span className={`min-w-0 flex-1 ${done ? "text-gray-3" : ""}`}>
                  <span className={`block text-[11px] font-bold ${done ? "text-gray-3" : KIND_COLOR[l.kind]}`}>
                    {KIND_LABEL[l.kind]}{done && " · 완료"}
                  </span>
                  <span className={`block truncate text-[14px] font-medium ${done ? "line-through" : ""}`}>{l.book_title}</span>
                  <span className="block truncate text-[12px] text-gray-2">{l.course ?? "수업 미지정"}</span>
                </span>
                <span className="shrink-0 text-[14px] font-semibold tabular-nums">{won(l.price)}</span>
              </Link>
              <div className="mt-2 pl-[52px]">
                <OwnerActions listingId={l.id} status={l.status} compact />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
