import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { must } from "@/lib/errors";
import { Cover } from "@/components/Cover";
import { KIND_LABEL } from "@/lib/types";

type Row = {
  room_id: string; listing_id: string; book_title: string; course: string | null; cover_url: string | null; photo: string | null;
  kind: "sell" | "buy"; status: "open" | "done"; counterpart_id: string; last_body: string | null; last_image: boolean; last_at: string | null; unread: number;
};

function ago(iso: string | null) {
  if (!iso) return "";
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "방금";
  if (d < 3600) return `${Math.floor(d / 60)}분 전`;
  if (d < 86400) return `${Math.floor(d / 3600)}시간 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

export default async function ChatsPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/chats");
  const supabase = await createClient();
  const rows = (must(await supabase.rpc("my_chat_rooms"), "채팅 목록") ?? []) as Row[];

  return (
    <div className="pb-8">
      <section className="px-4 pt-5 pb-3">
        <h1 className="text-[20px] font-bold tracking-tight">채팅</h1>
        <p className="mt-1 text-[13px] text-gray-2">거래 상대와 나눈 대화. 사진도 보낼 수 있습니다.</p>
      </section>
      {rows.length === 0 && (
        <div className="mx-4 my-6 rounded-xl border border-dashed border-line p-5 text-center">
          <span aria-hidden className="icon-[lucide--message-circle] size-7 text-gray-3" />
          <p className="mt-2 text-[14px] font-medium">아직 대화가 없습니다</p>
          <p className="mt-1 text-[12px] text-gray-2">매물에서 &ldquo;채팅하기&rdquo;를 누르면 여기에 모입니다.</p>
          <Link href="/" className="press mt-3 inline-flex h-9 items-center rounded-full bg-navy px-4 text-[13px] font-semibold text-white">수업 검색</Link>
        </div>
      )}
      <ul className="stagger border-t border-line">
        {rows.map((r) => (
          <li key={r.room_id} className="border-b border-line">
            <Link href={`/chats/${r.room_id}`} className="row flex items-center gap-3 px-4 py-3">
              <Cover src={r.photo ?? r.cover_url} alt="" size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[14px] font-semibold">{r.book_title}</span>
                  <span className="shrink-0 text-[11px] text-gray-3">{KIND_LABEL[r.kind]}{r.status === "done" ? " · 완료" : ""}</span>
                </span>
                <span className={`block truncate text-[13px] ${r.unread > 0 ? "font-medium text-ink" : "text-gray-2"}`}>
                  {r.last_image ? <><span aria-hidden className="icon-[lucide--image] mr-0.5 size-3.5" />사진</> : (r.last_body ?? "대화를 시작해 보세요")}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[11px] text-gray-3">{ago(r.last_at)}</span>
                {r.unread > 0 && <span className="min-w-5 rounded-full bg-blue px-1.5 text-center text-[11px] font-bold leading-5 text-white">{r.unread}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
