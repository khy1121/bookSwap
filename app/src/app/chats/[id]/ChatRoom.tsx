"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { shrinkImage } from "@/lib/image";
import { markRead, sendMessage, type ChatMessage } from "../actions";

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
}
function dayOf(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

export function ChatRoom({
  roomId, me, initial, counterpartRole, disabled = false,
}: { roomId: string; me: string; initial: ChatMessage[]; counterpartRole: string; disabled?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [live, setLive] = useState<"connecting" | "on" | "off">("connecting");
  const bottom = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Realtime: 이 방의 새 메시지를 받는다 (RLS로 참여자만). 내가 보낸 건 응답으로 이미 넣었으니 중복 제거.
  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb
      .channel(`room:${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` }, (p: { new: ChatMessage }) => {
        const m = p.new as ChatMessage;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (m.sender_id !== me) void markRead(roomId);
      })
      .subscribe((status: string) => setLive(status === "SUBSCRIBED" ? "on" : status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "off" : "connecting"));
    return () => { void sb.removeChannel(ch); };
  }, [roomId, me]);

  // 실시간이 끊겨도 놓치지 않게 15초마다 보충 조회
  useEffect(() => {
    if (live === "on") return;
    const t = setInterval(async () => {
      const sb = supabaseBrowser();
      const lastId = messages[messages.length - 1]?.id ?? 0;
      const { data } = await sb.from("chat_messages").select("*").eq("room_id", roomId).gt("id", lastId).order("created_at");
      if (data?.length) setMessages((prev) => [...prev, ...(data as ChatMessage[]).filter((m) => !prev.some((x) => x.id === m.id))]);
    }, 15000);
    return () => clearInterval(t);
  }, [live, roomId, messages]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  async function pick(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    setError(null);
    try {
      const small = await shrinkImage(f, 1280, 0.8);
      setPhoto({ file: small, url: URL.createObjectURL(small) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "사진을 불러오지 못했습니다.");
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  function submit() {
    if (pending || disabled) return;
    const body = text.trim();
    if (!body && !photo) return;
    const fd = new FormData();
    if (body) fd.set("body", body);
    if (photo) fd.set("photo", photo.file, photo.file.name);
    setText("");
    const sent = photo;
    setPhoto(null);
    start(async () => {
      const r = await sendMessage(roomId, fd);
      if (r.error) { setError(r.error); setText(body); if (sent) setPhoto(sent); return; }
      if (r.message) setMessages((prev) => (prev.some((x) => x.id === r.message!.id) ? prev : [...prev, r.message!]));
      if (sent) URL.revokeObjectURL(sent.url);
    });
  }

  return (
    <>
      <div className="flex-1 space-y-2 overflow-y-auto bg-surface px-4 py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-[13px] text-gray-3">{counterpartRole}에게 첫 메시지를 보내보세요.<br />거래 장소·시간, 책 상태를 물어보면 좋습니다.</p>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === me;
          const day = dayOf(m.created_at);
          const showDay = i === 0 || day !== dayOf(messages[i - 1].created_at);
          return (
            <div key={m.id}>
              {showDay && <div className="my-3 text-center text-[11px] text-gray-3">{day}</div>}
              <div className={`anim-fade-up flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
                {mine && <span className="text-[10px] text-gray-3">{timeOf(m.created_at)}</span>}
                <div className={`max-w-[78%] overflow-hidden rounded-2xl ${mine ? "rounded-br-md bg-blue text-white" : "rounded-bl-md bg-white text-ink shadow-[0_1px_2px_rgba(0,44,119,0.08)]"}`}>
                  {m.image_url && (
                    <a href={m.image_url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.image_url} alt="보낸 사진" className="block max-h-72 w-full object-cover" loading="lazy" />
                    </a>
                  )}
                  {m.body && <p className="whitespace-pre-wrap break-words px-3.5 py-2 text-[14px] leading-relaxed">{m.body}</p>}
                </div>
                {!mine && <span className="text-[10px] text-gray-3">{timeOf(m.created_at)}</span>}
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <div className="bottom-bar sticky bottom-0 border-t border-line bg-white px-3 pt-2">
        {photo && (
          <div className="mb-2 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
            <button type="button" onClick={() => { URL.revokeObjectURL(photo.url); setPhoto(null); }} className="press text-[12px] text-gray-2 underline">사진 빼기</button>
          </div>
        )}
        {error && <p className="mb-1 text-[12px] text-red-600">{error}</p>}
        {disabled ? (
          <p className="py-2 text-center text-[13px] text-gray-3">완료된 거래라 메시지를 보낼 수 없습니다.</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex items-end gap-1.5">
            <button type="button" aria-label="사진 보내기" onClick={() => fileInput.current?.click()}
              className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-2 hover:bg-surface hover:text-ink">
              <span aria-hidden className="icon-[lucide--image-plus] size-5" />
            </button>
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files)} />
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={500}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
              placeholder="메시지 입력"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-2.5 text-[14px] outline-none transition-[border-color,box-shadow] focus:border-action focus:shadow-[0_0_0_3px_rgba(0,100,239,0.12)]" />
            <button type="submit" disabled={pending || (!text.trim() && !photo)} aria-label="보내기"
              className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue text-white disabled:opacity-40">
              <span aria-hidden className={`${pending ? "icon-[lucide--loader-circle] animate-spin" : "icon-[lucide--send]"} size-5`} />
            </button>
          </form>
        )}
        <p className="mt-1 text-center text-[10px] text-gray-3">
          {live === "on" ? "실시간 연결됨" : live === "connecting" ? "연결 중…" : "실시간 연결이 끊겨 15초마다 새로고침합니다"}
        </p>
      </div>
    </>
  );
}
