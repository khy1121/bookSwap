"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 모바일 하단 탭바 (앱 규격). sm 이상에서는 숨기고 헤더 내비를 쓴다.
 * 자체 하단 바가 있는 화면(과목 상세 CTA, 매물 상세 연락, 채팅방 입력)에서는 숨긴다.
 */
const tabsFor = (loggedIn: boolean) => [
  { href: "/", label: "홈", icon: "icon-[lucide--house]", match: (p: string) => p === "/" },
  { href: "/browse", label: "학과", icon: "icon-[lucide--list]", match: (p: string) => p.startsWith("/browse") },
  { href: loggedIn ? "/chats" : "/login?next=/chats", label: "채팅", icon: "icon-[lucide--message-circle]", match: (p: string) => p.startsWith("/chats") },
  loggedIn
    ? { href: "/my", label: "내 거래", icon: "icon-[lucide--user]", match: (p: string) => p.startsWith("/my") }
    : { href: "/login", label: "로그인", icon: "icon-[lucide--log-in]", match: (p: string) => p.startsWith("/login") },
];

const HIDE = [/^\/courses\/[^/]+$/, /^\/listings\/[^/]+$/, /^\/chats\/[^/]+$/, /^\/listings\/new/, /^\/listings\/[^/]+\/edit$/];

export function TabBar({ unread = 0, loggedIn = false }: { unread?: number; loggedIn?: boolean }) {
  const pathname = usePathname();
  const TABS = tabsFor(loggedIn);
  if (HIDE.some((re) => re.test(pathname))) return null;
  return (
    <nav aria-label="주요 메뉴" className="bottom-bar fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur sm:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map((t) => {
          const on = t.match(pathname);
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={on ? "page" : undefined}
                className={`press relative flex flex-col items-center gap-0.5 pt-2 pb-1 text-[11px] font-medium ${on ? "text-navy" : "text-gray-3"}`}>
                <span aria-hidden className={`${t.icon} size-6`} />
                {t.label === "채팅" && unread > 0 && (
                  <span className="absolute left-1/2 top-1 ml-1 min-w-4 rounded-full bg-blue px-1 text-center text-[10px] font-bold leading-4 text-white">{unread > 99 ? "99+" : unread}</span>
                )}
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
