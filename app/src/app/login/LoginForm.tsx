"use client";

import { useActionState } from "react";
import { signIn, type ActionState } from "@/app/actions";

export function LoginForm({ next, referral }: { next: string; referral: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(signIn, {});

  if (state.ok) {
    return (
      <div className="rounded-lg bg-surface-soft p-4">
        <p className="text-[14px] font-semibold text-navy">메일을 보냈습니다</p>
        <p className="mt-1 text-[13px] leading-relaxed text-gray-2">{state.message}</p>
        <p className="mt-2 text-[11px] text-gray-3">안 보이면 스팸함을 확인하세요. 링크는 한 번만 쓸 수 있습니다.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="referral" value={referral} />
      <input
        type="email"
        name="email"
        required
        autoFocus
        placeholder="학번@hansung.ac.kr"
        className="h-12 w-full rounded-xl border border-line bg-white px-3 text-[15px] outline-none transition-[border-color,box-shadow] focus:border-action focus:shadow-[0_0_0_3px_rgba(0,100,239,0.12)]"
      />
      {state.error && <p className="text-[13px] text-red-600">{state.error}</p>}
      <button disabled={pending} className="press h-12 w-full rounded-xl bg-blue text-[15px] font-bold text-white disabled:opacity-60">
        {pending ? "보내는 중…" : "로그인 링크 받기"}
      </button>
    </form>
  );
}
