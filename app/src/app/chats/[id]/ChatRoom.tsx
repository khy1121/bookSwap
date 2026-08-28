"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { shrinkImage } from "@/lib/image";
import { markRead, sendMessage, type ChatMessage } from "../actions";

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
}
function dayOf(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

type Msg = ChatMessage & { pending?: boolean; failed?: boolean };

export function ChatRoom({
  roomId, me, initial, counterpartRole, disabled = false,
}: { roomId: string; me: string; initial: ChatMessage[]; counterpartRole: string; disabled?: boolean }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [live, setLive] = useState<"connecting" | "on" | "off">("connecting");
  const router = useRouter();

  // 방에 들어오면 읽음 처리 후 레이아웃(안 읽음 배지)을 새로 그린다. 서버 렌더 시점엔 배지가 먼저 계산돼 1이 남을 수 있어서.
  useEffect(() => {
    const t = setTimeout(async () => {
      if (initial.some((m) => m.sender_id !== me && !m.read_at)) { await markRead(roomId); router.refresh(); }
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);
  const listRef = useRef<HTMLDivElement>(null);
  const [unseen, setUnseen] = useState(0); // 아래로 스크롤 안 한 상태에서 도착한 상대 메시지 수
  const atBottomRef = useRef(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Realtime: 이 방의 새 메시지를 받는다 (RLS로 참여자만). 내가 보낸 건 응답으로 이미 넣었으니 중복 제거.
  useEffect(() => {
    const sb = supabaseBrowser();
    let ch: ReturnType<typeof sb.channel> | null = null;
    let cancelled = false;
    (async () => {
      // Realtime은 RLS를 쓰므로 세션 토큰을 먼저 붙여야 구독이 열린다
      const { data } = await sb.auth.getSession();
      if (cancelled) return;
      if (data.session) sb.realtime.setAuth(data.session.access_token);
      ch = sb
      .channel(`room:${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` }, (p: { new: ChatMessage }) => {
        const m = p.new as ChatMessage;
        // 내가 보낸 게 서버 응답보다 먼저 도착하면 같은 내용의 임시 말풍선을 치운다
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev.filter((x) => !(x.pending && x.sender_id === m.sender_id && x.body === m.body && !x.image_url === !m.image_url)), m]));
        if (m.sender_id !== me) void markRead(roomId).then(() => router.refresh());
      })
      .subscribe((status: string) => setLive(status === "SUBSCRIBED" ? "on" : status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "off" : "connecting"));
    })();
    return () => { cancelled = true; if (ch) void sb.removeChannel(ch); };
  }, [roomId, me, router]);

  // 실시간이 끊기면 3초마다, 붙어 있어도 안전망으로 20초마다 보충 조회 (탭이 숨겨져 있으면 쉰다)
  useEffect(() => {
    const t = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const sb = supabaseBrowser();
      const lastId = Math.max(0, ...messages.filter((m) => !m.pending).map((m) => m.id));
      const { data } = await sb.from("chat_messages").select("*").eq("room_id", roomId).gt("id", lastId).order("created_at");
      if (data?.length) setMessages((prev) => [...prev, ...(data as ChatMessage[]).filter((m) => !prev.some((x) => x.id === m.id))]);
    }, live === "on" ? 20000 : 3000);
    return () => clearInterval(t);
  }, [live, roomId, messages]);

  // 스크롤: 처음엔 맨 아래로(즉시). 이후엔 내가 보냈거나 이미 바닥 근처일 때만 따라 내려가고,
  // 위쪽을 읽는 중이면 자리를 지키고 "새 메시지" 표시만 띄운다.
  const scrollToBottom = (smooth = false) => {
    const el = listRef.current; if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setUnseen(0);
  };
  const lastCount = useRef(0);
  useEffect(() => {
    const el = listRef.current; if (!el) return;
    const last = messages[messages.length - 1];
    if (lastCount.current === 0 || !last) { scrollToBottom(false); lastCount.current = messages.length; return; }
    if (messages.length === lastCount.current) return;
    lastCount.current = messages.length;
    if (last.sender_id === me || atBottomRef.current) scrollToBottom(true);
    else setUnseen((n) => n + 1);
  }, [messages, me]);
  // 이미지가 늦게 로드돼 높이가 늘어도 바닥에 붙어 있게
  useEffect(() => {
    const el = listRef.current; if (!el) return;
    const ro = new ResizeObserver(() => { if (atBottomRef.current) el.scrollTop = el.scrollHeight; });
    ro.observe(el.firstElementChild ?? el);
    return () => ro.disconnect();
  }, []);
  const onScroll = () => {
    const el = listRef.current; if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = near;
    if (near) setUnseen(0);
  };

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
    textarea.current?.focus();
    const sent = photo;
    setPhoto(null);
    // 낙관적 표시: 서버 응답을 기다리지 않고 바로 말풍선을 그린다 (카톡처럼)
    const tempId = -Date.now();
    const temp: Msg = { id: tempId, room_id: roomId, sender_id: me, body: body || null, image_url: sent?.url ?? null, created_at: new Date().toISOString(), read_at: null, pending: true };
    setMessages((prev) => [...prev, temp]);
    start(async () => {
      const r = await sendMessage(roomId, fd);
      if (r.error) {
        setMessages((prev) => prev.filter((x) => x.id !== tempId));
        setError(r.error); setText(body); if (sent) setPhoto(sent); return;
      }
      if (r.message) setMessages((prev) => {
        const rest = prev.filter((x) => x.id !== tempId);
        return rest.some((x) => x.id === r.message!.id) ? rest : [...rest, r.message!];
      });
      if (sent) URL.revokeObjectURL(sent.url);
    });
  }

  return (
    <>
      <div ref={listRef} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface px-4 py-3 [-webkit-overflow-scrolling:touch]">
       <div className="space-y-2">
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
              <div className={`anim-fade-up flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"} ${m.pending ? "opacity-60" : ""}`}>
                {mine && <span className="text-[10px] text-gray-3">{timeOf(m.created_at)}</span>}
                <div className={`max-w-[78%] overflow-hidden rounded-2xl ${mine ? "rounded-br-md bg-blue text-white" : "rounded-bl-md bg-white text-ink shadow-[0_1px_2px_rgba(0,44,119,0.08)]"}`}>
                  {m.image_url && (
                    <a href={m.image_url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.image_url} alt="보낸 사진" className="block max-h-72 min-h-24 w-full min-w-40 bg-surface object-cover" loading="lazy" />
                    </a>
                  )}
                  {m.body && <p className="whitespace-pre-wrap break-words px-3.5 py-2 text-[14px] leading-relaxed">{m.body}</p>}
                </div>
                {!mine && <span className="text-[10px] text-gray-3">{timeOf(m.created_at)}</span>}
              </div>
            </div>
          );
        })}
       </div>
      </div>

      {unseen > 0 && (
        <button type="button" onClick={() => scrollToBottom(true)}
          className="press anim-fade-up absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-navy px-3 py-1.5 text-[12px] font-semibold text-white shadow-lg">
          <span aria-hidden className="icon-[lucide--arrow-down] size-3.5" />새 메시지 {unseen}
        </button>
      )}

      <div className="bottom-bar shrink-0 border-t border-line bg-white px-3 pt-2">
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
            <textarea ref={textarea} value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={500} enterKeyHint="send"
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
          {live === "on" ? "실시간 연결됨" : live === "connecting" ? "연결 중…" : "실시간 연결이 끊겨 3초마다 새로고침합니다"}
        </p>
      </div>
    </>
  );
}
