import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ListingPublic } from "@/lib/types";
import { KIND_COLOR, KIND_LABEL, won } from "@/lib/types";

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
        {list.map((l) => (
          <li key={l.id} className="border-b border-line">
            <Link href={`/listings/${l.id}`} className="flex items-center gap-3 px-4 py-3">
              <span className={`w-8 shrink-0 text-[12px] font-bold ${l.status === "done" ? "text-gray-3" : KIND_COLOR[l.kind]}`}>
                {KIND_LABEL[l.kind]}
              </span>
              <span className={`min-w-0 flex-1 ${l.status === "done" ? "text-gray-3 line-through" : ""}`}>
                <span className="block truncate text-[14px] font-medium">{l.book_title}</span>
                <span className="block truncate text-[12px] text-gray-2">{l.course ?? "수업 미지정"}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[14px] font-semibold tabular-nums">{won(l.price)}</span>
                <span className="block text-[11px] text-gray-3">{l.status === "done" ? "완료" : "진행 중"}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
