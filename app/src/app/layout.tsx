import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { Toast } from "@/components/Toast";

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "북스왑 — 한성대 과목별 중고 교재",
  description: "한성대 과목·교수 기준으로 중고 교재를 사고팝니다. 교수님이 지정한 주교재를 같이 확인하세요.",
};
export const viewport: Viewport = { themeColor: "#0a4da1", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();
  const nav = "press rounded-full px-2.5 py-1 hover:bg-surface hover:text-ink";
  return (
    <html lang="ko" className={`${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-surface">
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
          <nav className="mx-auto flex h-14 max-w-md items-center justify-between px-3">
            <Link href="/" className="press flex items-baseline gap-1.5 rounded-full px-1.5 py-1">
              <span className="text-lg font-extrabold tracking-tight text-navy">북스왑</span>
              <span className="text-[11px] font-semibold tracking-wider text-sky">HANSUNG</span>
            </Link>
            <div className="flex items-center gap-0.5 text-[13px] font-medium text-gray-2">
              <Link href="/browse" className={nav}>학과</Link>
              {user ? (
                <>
                  <Link href="/my" className={nav}>내 거래</Link>
                  <form action={signOut}>
                    <button className={nav}>로그아웃</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className={nav}>로그인</Link>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-md flex-1 bg-white">{children}</main>
        <footer className="mx-auto w-full max-w-md bg-white px-4 py-8 text-[11px] leading-relaxed text-gray-3">
          <p>한성대 학생이 만든 비공식 서비스입니다. 거래는 당사자 간 직거래로 진행됩니다.</p>
          <p className="mt-1">
            불편한 점이 있으면{" "}
            <a className="text-action underline" href={process.env.NEXT_PUBLIC_FEEDBACK_URL ?? "#"}>
              오픈채팅
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
