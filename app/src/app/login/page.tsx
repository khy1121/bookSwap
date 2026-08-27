import { LoginForm } from "./LoginForm";

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const ref = typeof sp.ref === "string" ? sp.ref : "";

  return (
    <div className="px-4 pt-8 pb-8">
      <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight"><span aria-hidden className="icon-[lucide--mail] size-6 text-blue" />학교 이메일로 로그인</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-2">
        비밀번호 없이 <b className="text-ink">@hansung.ac.kr</b> 메일로 로그인 링크를 보내드립니다.
        <br />
        같은 학교 학생끼리만 연락처를 볼 수 있게 하기 위한 장치입니다.
      </p>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-[13px] text-red-700">{error}</p>}
      <LoginForm next={next} referral={ref} />
    </div>
  );
}
