"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { revealContact } from "@/app/actions";
import { KIND_BG, ROLE_LABEL } from "@/lib/types";

export function RevealContact({ listingId, loggedIn, kind }: { listingId: string; loggedIn: boolean; kind: "sell" | "buy" }) {
  const [contact, setContact] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const role = ROLE_LABEL[kind];

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-md px-4 py-3">
        {!loggedIn ? (
          <Link
            href={`/login?next=/listings/${listingId}`}
            className={`flex h-12 items-center justify-center rounded-lg text-[15px] font-bold text-white ${KIND_BG[kind]}`}
          >
            로그인하고 {role} 연락처 보기
          </Link>
        ) : contact ? (
          <div className="rounded-lg border border-line p-3">
            <div className="text-[11px] text-gray-3">{role} 연락처</div>
            {/^https?:\/\//.test(contact) ? (
              <a href={contact} target="_blank" rel="noreferrer" className="block break-all text-[15px] font-semibold text-action underline">
                {contact}
              </a>
            ) : (
              <div className="text-[15px] font-semibold">
                {contact} <span className="text-[12px] font-normal text-gray-3">에브리타임 쪽지</span>
              </div>
            )}
          </div>
        ) : (
          <>
            <button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await revealContact(listingId);
                  if (r.error) setError(r.error);
                  else setContact(r.contact ?? null);
                })
              }
              className={`h-12 w-full rounded-lg text-[15px] font-bold text-white disabled:opacity-60 ${KIND_BG[kind]}`}
            >
              {pending ? "불러오는 중…" : `${role}에게 연락하기`}
            </button>
            {error && <p className="mt-2 text-center text-[12px] text-red-600">{error}</p>}
          </>
        )}
        <p className="mt-2 text-center text-[11px] text-gray-3">학교 이메일로 로그인한 학생에게만 공개됩니다</p>
      </div>
    </div>
  );
}
