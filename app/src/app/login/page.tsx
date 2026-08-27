import { signInWithGoogle } from "@/app/actions";
import { LoginForm } from "./LoginForm";

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const ref = typeof sp.ref === "string" ? sp.ref : "";
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "on"; // Supabase Google 제공자 설정 후 켠다

  return (
    <div className="px-4 pt-8 pb-8">
      <h1 className="text-[22px] font-bold tracking-tight">학교 계정으로 로그인</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-2">
        한성대 <b className="text-ink">@hansung.ac.kr</b> 계정만 쓸 수 있습니다.
        <br />
        같은 학교 학생끼리만 연락처와 채팅을 열 수 있게 하기 위한 장치입니다.
      </p>
      {error && <p className="anim-fade-up mt-4 rounded-xl bg-red-50 p-3 text-[13px] text-red-700">{error}</p>}

      {googleEnabled && (
        <form action={signInWithGoogle.bind(null, next)} className="mt-6">
          <button type="submit" className="press flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-white text-[15px] font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:bg-surface">
            <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 7-10.3 7-17.7z" />
              <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
              <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.8 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
            </svg>
            한성대 Google 계정으로 로그인
          </button>
          <p className="mt-2 text-center text-[11px] text-gray-3">학교 메일(Gmail)에 로그인된 계정을 고르면 바로 끝납니다. 메일 확인 없음.</p>
        </form>
      )}

      <details className="mt-6 rounded-xl border border-line bg-white p-4">
        <summary className="cursor-pointer text-[13px] font-medium text-gray-2">
          <span aria-hidden className="icon-[lucide--mail] mr-1 size-3.5" />Google 로그인이 안 되면 — 메일로 로그인 링크 받기
        </summary>
        <div className="mt-3">
          <LoginForm next={next} referral={ref} />
        </div>
      </details>
    </div>
  );
}
