import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "@/lib/push";

/**
 * Supabase Database Webhook (chat_messages INSERT) → 상대방에게 푸시.
 * 헤더 x-webhook-secret 검증. 2.5초 뒤 read_at을 다시 확인해, 이미 방을 보고 있으면 보내지 않는다.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = (await req.json().catch(() => null)) as { type?: string; table?: string; record?: { id: number; room_id: string; sender_id: string; body: string | null; image_url: string | null } } | null;
  const rec = payload?.record;
  if (payload?.type !== "INSERT" || payload.table !== "chat_messages" || !rec) return NextResponse.json({ skipped: "not a chat insert" });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: room } = await db.from("chat_rooms").select("buyer_id, seller_id, listing_id").eq("id", rec.room_id).single();
  if (!room) return NextResponse.json({ skipped: "no room" });
  const recipient = rec.sender_id === room.buyer_id ? room.seller_id : room.buyer_id;

  // 상대가 방을 열어두고 있으면 클라이언트가 곧바로 읽음 처리한다 → 잠깐 기다렸다가 확인
  await new Promise((r) => setTimeout(r, 2500));
  const { data: fresh } = await db.from("chat_messages").select("read_at").eq("id", rec.id).single();
  if (fresh?.read_at) return NextResponse.json({ skipped: "already read" });

  const { data: listing } = await db.from("listings").select("book_title").eq("id", room.listing_id).single();
  const role = rec.sender_id === room.buyer_id ? "구매자" : "판매자";
  const text = rec.body ? (rec.body.length > 60 ? rec.body.slice(0, 60) + "…" : rec.body) : "사진을 보냈습니다";

  const result = await sendPushToUsers([recipient], {
    title: `${listing?.book_title ?? "BookSwap"} · ${role}`,
    body: text,
    url: `/chats/${rec.room_id}`,
    tag: `room-${rec.room_id}`, // 같은 방 알림은 하나로 합쳐짐
  });
  await db.from("events").insert({ user_id: recipient, event: "push_sent", props: { kind: "chat", ...result } });
  return NextResponse.json(result);
}
