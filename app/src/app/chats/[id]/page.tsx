import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { must } from "@/lib/errors";
import { Cover } from "@/components/Cover";
import { KIND_LABEL, won } from "@/lib/types";
import { ChatRoom } from "./ChatRoom";
import { PushToggle } from "@/components/PushToggle";
import { ChatViewport } from "./ChatViewport";
import type { ChatMessage } from "../actions";

export default async function ChatRoomPage(props: PageProps<"/chats/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  // 사용자 확인과 방 조회를 동시에 (RLS가 참여자만 통과시킨다)
  const [user, { data: room }] = await Promise.all([
    getUser(),
    supabase.from("chat_rooms").select("id, listing_id, buyer_id, seller_id").eq("id", id).maybeSingle(),
  ]);
  if (!user) redirect(`/login?next=/chats/${id}`);
  if (!room) notFound();

  // 매물·메시지·읽음 처리도 동시에. 읽음 처리는 렌더 중이라 revalidatePath 없이 DB만 갱신
  const [{ data: l }, msgRes] = await Promise.all([
    supabase.from("listings_public").select("id, book_title, kind, status, price, course, prof, cover_url, photos").eq("id", room.listing_id).single(),
    supabase.from("chat_messages").select("*").eq("room_id", id).order("created_at").limit(200),
    supabase.from("chat_messages").update({ read_at: new Date().toISOString() }).eq("room_id", id).neq("sender_id", user.id).is("read_at", null),
  ]);
  const messages = (must(msgRes, "메시지") ?? []) as ChatMessage[];

  const iAmBuyer = room.buyer_id === user.id;
  const counterpartRole = iAmBuyer ? "판매자" : "구매자";

  return (
    <ChatViewport>
      {/* 매물 카드 고정 */}
      {l && (
        <Link href={`/listings/${l.id}`} className="row flex shrink-0 items-center gap-3 border-b border-line px-4 py-2">
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
      <div className="shrink-0 border-b border-line bg-surface px-4 py-1.5"><PushToggle compact /></div>
      <ChatRoom roomId={id} me={user.id} initial={messages} counterpartRole={counterpartRole} disabled={l?.status === "done"} />
    </ChatViewport>
  );
}
