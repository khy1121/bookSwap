"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { track } from "@/lib/events";
import { LIMITS, toMessage } from "@/lib/errors";

export type ChatMessage = {
  id: number;
  room_id: string;
  sender_id: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
  read_at: string | null;
};

/** 매물 상세 "채팅하기": 방이 있으면 그 방으로, 없으면 만든다. 판매자 본인·완료된 거래는 거부. */
export async function openChat(listingId: string) {
  const user = await getUser();
  if (!user) redirect(`/login?next=/listings/${listingId}`);
  const supabase = await createClient();

  const { data: l } = await supabase.from("listings").select("user_id, status").eq("id", listingId).single();
  if (!l) redirect(`/listings/${listingId}?toast=error`);
  if (l.user_id === user.id) redirect(`/listings/${listingId}?toast=forbidden`);
  if (l.status === "done") redirect(`/listings/${listingId}?toast=error`);

  const { data: existing } = await supabase.from("chat_rooms").select("id").eq("listing_id", listingId).eq("buyer_id", user.id).maybeSingle();
  if (existing) redirect(`/chats/${existing.id}`);

  const { data: room, error } = await supabase
    .from("chat_rooms")
    .insert({ listing_id: listingId, buyer_id: user.id, seller_id: l.user_id })
    .select("id")
    .single();
  if (error) { console.error("[openChat]", error.code, error.message); redirect(`/listings/${listingId}?toast=error`); }

  await track("chat_started", { listing_id: listingId, room_id: room.id });
  redirect(`/chats/${room.id}`);
}

const PER_MINUTE = 20;

/** 메시지 전송: 텍스트 또는 사진(둘 중 하나 이상). 분당 20건 제한. */
export async function sendMessage(roomId: string, form: FormData): Promise<{ error?: string; message?: ChatMessage }> {
  const user = await getUser();
  if (!user) return { error: "로그인이 만료되었습니다. 다시 로그인해 주세요." };
  const supabase = await createClient();

  const body = String(form.get("body") ?? "").trim().slice(0, 500) || null;
  const file = form.get("photo");
  const photo = file instanceof File && file.size > 0 ? file : null;
  if (!body && !photo) return { error: "내용을 입력하세요." };

  // 참여자 확인 (RLS도 막지만 메시지를 명확히 주기 위해)
  const { data: room } = await supabase.from("chat_rooms").select("id, buyer_id, seller_id").eq("id", roomId).single();
  if (!room || ![room.buyer_id, room.seller_id].includes(user.id)) return { error: "이 채팅방에 참여하고 있지 않습니다." };

  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("room_id", roomId).eq("sender_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= PER_MINUTE) return { error: "메시지를 너무 빠르게 보내고 있습니다. 잠시 후 다시 보내주세요." };

  let image_url: string | null = null;
  if (photo) {
    if (!photo.type.startsWith("image/")) return { error: "이미지 파일만 보낼 수 있습니다." };
    if (photo.size > LIMITS.photoBytes) return { error: "사진은 3MB 이하여야 합니다." };
    const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    const path = `${roomId}/${Date.now()}-${user.id.slice(0, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("chat-photos").upload(path, photo, { contentType: photo.type });
    if (upErr) { console.error("[chat upload]", upErr.message); return { error: `사진 전송 실패: ${toMessage(upErr)}` }; }
    image_url = supabase.storage.from("chat-photos").getPublicUrl(path).data.publicUrl;
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ room_id: roomId, sender_id: user.id, body, image_url })
    .select("*")
    .single();
  if (error) { console.error("[sendMessage]", error.code, error.message); return { error: toMessage(error) }; }

  await track("chat_message", { room_id: roomId, has_image: !!image_url });
  revalidatePath("/chats");
  return { message: data as ChatMessage };
}

/** 상대가 보낸 안 읽은 메시지를 읽음 처리 (방 열 때·새 메시지 받을 때) */
export async function markRead(roomId: string) {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("chat_messages").update({ read_at: new Date().toISOString() }).eq("room_id", roomId).neq("sender_id", user.id).is("read_at", null);
  revalidatePath("/chats");
}
