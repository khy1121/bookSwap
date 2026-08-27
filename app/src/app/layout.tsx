import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import "./globals.css";
import { getUser } from "@/lib/supabase/server";
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
  const nav = "press inline-flex items-center rounded-full px-2.5 py-1.5 hover:bg-surface hover:text-ink";
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
              <Link href="/browse" className={nav}><span aria-hidden className="icon-[lucide--list] mr-1 size-4" />학과</Link>
              {user ? (
                <>
                  <Link href="/my" className={nav}><span aria-hidden className="icon-[lucide--user] mr-1 size-4" />내 거래</Link>
                  <form action={signOut}>
                    <button className={nav} aria-label="로그아웃"><span aria-hidden className="icon-[lucide--log-out] size-4" /></button>
                  </form>
                </>
              ) : (
                <Link href="/login" className={nav}><span aria-hidden className="icon-[lucide--mail] mr-1 size-4" />로그인</Link>
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
        </footer>
        <Suspense fallback={null}>
          <Toast />
        </Suspense>
      </body>
    </html>
  );
}
