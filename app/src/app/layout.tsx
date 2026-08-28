import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import "./globals.css";
import { createClient, getUser } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { Toast } from "@/components/Toast";

export const metadata: Metadata = {
  title: "BookSwap — 한성대 과목별 중고 교재",
  description: "한성대 과목·교수 기준으로 중고 교재를 사고팝니다. 교수님이 지정한 주교재를 같이 확인하세요.",
};
/** 피드백 채널(공개 오픈채팅). 환경변수가 있으면 그걸 우선한다. */
const FEEDBACK_URL = "https://open.kakao.com/o/sfnqXPKi";

export const viewport: Viewport = { themeColor: "#0a4da1", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();
  let unread = 0;
  if (user) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.rpc("my_unread_count");
      unread = typeof data === "number" ? data : 0;
    } catch { unread = 0; }
  }
  const nav = "press inline-flex items-center rounded-full px-2 py-1.5 text-[12px] sm:text-[13px] hover:bg-surface hover:text-ink";
  // 아이콘만 있는 항목: 호버·포커스 시 라벨이 옆으로 펼쳐진다 (reduced-motion이면 전환 없이 표시)
  const reveal =
    // 기본(터치 기기): 라벨 항상 표시. 호버 가능한 기기(마우스): 접혀 있다가 호버·포커스 시 펼침
    "ml-1 max-w-16 whitespace-nowrap opacity-100 transition-[max-width,opacity,margin] duration-200 " +
    "[@media(hover:hover)]:ml-0 [@media(hover:hover)]:max-w-0 [@media(hover:hover)]:overflow-hidden [@media(hover:hover)]:opacity-0 " +
    "[@media(hover:hover)]:group-hover:ml-1 [@media(hover:hover)]:group-hover:max-w-16 [@media(hover:hover)]:group-hover:opacity-100 " +
    "[@media(hover:hover)]:group-focus-visible:ml-1 [@media(hover:hover)]:group-focus-visible:max-w-16 [@media(hover:hover)]:group-focus-visible:opacity-100";
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col bg-surface">
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
          <nav className="mx-auto flex h-14 max-w-md items-center justify-between px-3">
            <Link href="/" className="press flex items-baseline gap-1.5 rounded-full px-1.5 py-1">
              <span className="flex items-center gap-1 text-lg font-extrabold tracking-tight text-navy">
                <span aria-hidden className="icon-[lucide--book-open] size-5 text-blue" />BookSwap
              </span>
              <span className="text-[11px] font-semibold tracking-wider text-sky">HANSUNG</span>
            </Link>
            <div className="flex items-center gap-0.5 text-[13px] font-medium text-gray-2">
              <Link href="/browse" className={`${nav} group`} aria-label="학과"><span aria-hidden className="icon-[lucide--list] size-4" /><span aria-hidden className={reveal}>학과</span></Link>
              {user ? (
                <>
                  <Link href="/chats" className={`${nav} group relative`} aria-label={unread ? `채팅, 안 읽음 ${unread}` : "채팅"}>
                    <span aria-hidden className="icon-[lucide--message-circle] size-4" />
                    <span aria-hidden className={reveal}>채팅</span>
                    {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-blue px-1 text-center text-[10px] font-bold leading-4 text-white">{unread > 99 ? "99+" : unread}</span>}
                  </Link>
                  <Link href="/my" className={`${nav} group`} aria-label="내 거래"><span aria-hidden className="icon-[lucide--user] size-4" /><span aria-hidden className={reveal}>내 거래</span></Link>
                  <form action={signOut}>
                    <button className={`${nav} group`} aria-label="로그아웃">
                      <span aria-hidden className="icon-[lucide--log-out] size-4" />
                      <span aria-hidden className={reveal}>로그아웃</span>
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className={`${nav} group`} aria-label="로그인"><span aria-hidden className="icon-[lucide--log-in] size-4" /><span aria-hidden className={reveal}>로그인</span></Link>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-md flex-1 bg-white">{children}</main>
        <footer className="mx-auto w-full max-w-md bg-white px-4 py-8 text-[11px] leading-relaxed text-gray-3">
          <p><b className="text-gray-2">BookSwap</b> · 한성대 학생이 만든 비공식 서비스입니다. 거래는 당사자 간 직거래로 진행됩니다.</p>
          <p className="mt-1">
            불편한 점이 있으면{" "}
            <a className="text-action underline" href={process.env.NEXT_PUBLIC_FEEDBACK_URL ?? FEEDBACK_URL} target="_blank" rel="noreferrer">
              <span aria-hidden className="icon-[lucide--message-circle] mr-0.5 size-3" />오픈채팅
            </a>
            으로 알려주세요.
          </p>
          <p className="mt-1">
            <Link href="/privacy" className="underline">개인정보처리방침</Link>
          </p>
        </footer>
        <Suspense fallback={null}>
          <Toast />
        </Suspense>
      </body>
    </html>
  );
}
