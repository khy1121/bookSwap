"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { revealContact } from "@/app/actions";
import { openChat } from "@/app/chats/actions";
import { KIND_BG, ROLE_LABEL } from "@/lib/types";

export function RevealContact({ listingId, loggedIn, kind }: { listingId: string; loggedIn: boolean; kind: "sell" | "buy" }) {
  const [contact, setContact] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const role = ROLE_LABEL[kind];
  const isUrl = !!contact && /^https?:\/\//.test(contact);

  async function copy() {
    if (!contact) return;
    try {
      await navigator.clipboard.writeText(contact);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* 클립보드 권한 없으면 조용히 무시 — 값은 화면에 보인다 */
    }
  }

  return (
    <div className="bottom-bar anim-fade-up fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-md px-4 pt-3">
        {!loggedIn ? (
          <Link href={`/login?next=/listings/${listingId}`}
            className={`press flex h-12 items-center justify-center rounded-xl text-[15px] font-bold text-white ${KIND_BG[kind]}`}>
            <span aria-hidden className="icon-[lucide--mail] mr-1.5 size-4" />로그인하고 {role} 연락처 보기
          </Link>
        ) : contact ? (
          <div className="anim-fade-up rounded-xl border border-line p-3">
            <div className="text-[11px] text-gray-3">{role} 연락처</div>
            <div className="mt-0.5 flex items-center gap-2">
              {isUrl ? (
                <a href={contact} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-[15px] font-semibold text-action underline">
                  {contact}
                </a>
              ) : (
                <div className="min-w-0 flex-1">
                  <span className="text-[15px] font-semibold">{contact}</span>
                  <span className="ml-1 text-[12px] text-gray-3">에브리타임 쪽지</span>
                </div>
              )}
              <button type="button" onClick={copy}
                className="press h-8 shrink-0 rounded-full border border-line bg-white px-3 text-[12px] font-medium text-gray-1 hover:border-action hover:text-action">
                {copied ? <><span aria-hidden className="icon-[lucide--check] mr-1 size-3.5" />복사됨</> : <><span aria-hidden className="icon-[lucide--copy] mr-1 size-3.5" />복사</>}
              </button>
            </div>
            {isUrl && (
              <a href={contact} target="_blank" rel="noreferrer"
                className={`press mt-3 flex h-11 items-center justify-center rounded-xl text-[14px] font-bold text-white ${KIND_BG[kind]}`}>
                <span aria-hidden className="icon-[lucide--external-link] mr-1.5 size-4" />오픈채팅 열기
              </a>
            )}
          </div>
        ) : (
          <>
            <form action={openChat.bind(null, listingId)}>
              <button type="submit" className={`press flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-bold text-white ${KIND_BG[kind]}`}>
                <span aria-hidden className="icon-[lucide--message-circle] mr-1.5 size-4" />{role}와 채팅하기
              </button>
            </form>
            <button disabled={pending}
              onClick={() => start(async () => {
                const r = await revealContact(listingId);
                if (r.error) setError(r.error);
                else setContact(r.contact ?? null);
              })}
              className="press mt-2 h-10 w-full rounded-xl border border-line bg-white text-[13px] font-semibold text-gray-1 disabled:opacity-60">
              {pending ? <><span aria-hidden className="icon-[lucide--loader-circle] mr-1.5 size-4 animate-spin" />불러오는 중…</> : <><span aria-hidden className="icon-[lucide--external-link] mr-1.5 size-4" />오픈채팅·에타 연락처 보기</>}
            </button>
            {error && <p className="mt-2 text-center text-[12px] text-red-600">{error}</p>}
          </>
        )}
        <p className="mt-2 text-center text-[11px] text-gray-3">학교 이메일로 로그인한 학생에게만 공개됩니다</p>
      </div>
    </div>
  );
}
