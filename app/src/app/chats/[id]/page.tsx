import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { must } from "@/lib/errors";
import { Cover } from "@/components/Cover";
import { KIND_LABEL, won } from "@/lib/types";
import { ChatRoom } from "./ChatRoom";
import type { ChatMessage } from "../actions";

export default async function ChatRoomPage(props: PageProps<"/chats/[id]">) {
  const { id } = await props.params;
  const user = await getUser();
  if (!user) redirect(`/login?next=/chats/${id}`);
  const supabase = await createClient();

  const { data: room } = await supabase.from("chat_rooms").select("id, listing_id, buyer_id, seller_id").eq("id", id).maybeSingle();
  if (!room) notFound();

  const { data: l } = await supabase.from("listings_public").select("id, book_title, kind, status, price, course, prof, cover_url, photos").eq("id", room.listing_id).single();
  const messages = (must(await supabase.from("chat_messages").select("*").eq("room_id", id).order("created_at").limit(200), "메시지") ?? []) as ChatMessage[];
  // 읽음 처리: 렌더 중이라 revalidatePath는 못 쓰고 DB만 갱신 (목록 배지는 다음 요청에 반영)
  await supabase.from("chat_messages").update({ read_at: new Date().toISOString() }).eq("room_id", id).neq("sender_id", user.id).is("read_at", null);

  const iAmBuyer = room.buyer_id === user.id;
  const counterpartRole = iAmBuyer ? "판매자" : "구매자";

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      {/* 매물 카드 고정 */}
      {l && (
        <Link href={`/listings/${l.id}`} className="row flex items-center gap-3 border-b border-line px-4 py-2.5">
          <Cover src={l.photos?.[0] ?? l.cover_url} alt="" size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold">{l.book_title}</span>
            <span className="block truncate text-[12px] text-gray-2">
              {KIND_LABEL[l.kind as "sell" | "buy"]} · {won(l.price)}{l.course ? ` · ${l.course}` : ""}{l.status === "done" ? " · 거래 완료" : ""}
            </span>
          </span>
          <span className="shrink-0 text-[11px] text-gray-3">상대: {counterpartRole}</span>
          <span aria-hidden className="icon-[lucide--chevron-right] size-4 text-gray-3" />
        </Link>
      )}
      <ChatRoom roomId={id} me={user.id} initial={messages} counterpartRole={counterpartRole} disabled={l?.status === "done"} />
    </div>
  );
}
