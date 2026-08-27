"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { chosung, majorIcon } from "@/lib/majorIcon";

export type BrowseItem = { code: string; name: string; courses: number; tracks?: number; parentName?: string };
type TabKey = "dept" | "track" | "other";
const TABS: { key: TabKey; label: string }[] = [
  { key: "dept", label: "학부·학과" },
  { key: "track", label: "트랙" },
  { key: "other", label: "교양·기타" },
];

/** 세그먼트 탭으로 한 그룹만 보여주고, 초성 헤더로 훑게 한다. 검색 중엔 전체에서 즉시 필터. */
export function BrowseTabs({ groups }: { groups: Record<TabKey, BrowseItem[]> }) {
  const [tab, setTab] = useState<TabKey>("dept");
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase().replace(/\s+/g, "");

  const searching = query.length > 0;
  const list = useMemo(() => {
    if (searching) {
      return (["dept", "track", "other"] as TabKey[])
        .flatMap((k) => groups[k].map((m) => ({ ...m, kind: k })))
        .filter((m) => m.name.toLowerCase().replace(/\s+/g, "").includes(query) || m.code.toLowerCase() === query)
        .slice(0, 30);
    }
    return groups[tab].map((m) => ({ ...m, kind: tab }));
  }, [groups, tab, query, searching]);

  // 초성 그룹 (검색 중엔 그룹 없이 평면)
  const sections = useMemo(() => {
    if (searching) return [{ head: null as string | null, items: list }];
    const map = new Map<string, typeof list>();
    for (const m of list) {
      const h = chosung(m.name);
      map.set(h, [...(map.get(h) ?? []), m]);
    }
    return [...map.entries()].map(([head, items]) => ({ head, items }));
  }, [list, searching]);

  return (
    <div>
      <div className="px-4">
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="학과·트랙 이름 검색"
            aria-label="학과·트랙 검색"
            className="h-12 w-full rounded-xl border border-line bg-surface pl-10 pr-10 text-[15px] outline-none transition-[border-color,box-shadow] placeholder:text-gray-3 focus:border-action focus:shadow-[0_0_0_3px_rgba(0,100,239,0.12)]"
          />
          <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-3">⌕</span>
          {q && (
            <button type="button" aria-label="지우기" onClick={() => setQ("")}
              className="press absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 text-gray-3 hover:text-ink">
              <span className="inline-block h-5 w-5 rounded-full bg-line text-center text-[12px] leading-5">×</span>
            </button>
          )}
        </div>
      </div>

      {!searching && (
        <div role="tablist" className="sticky top-14 z-10 mt-4 flex border-b border-line bg-white px-4">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button key={t.key} role="tab" aria-selected={active} onClick={() => setTab(t.key)}
                className={`press relative flex-1 py-3 text-[14px] font-semibold transition-colors ${active ? "text-ink" : "text-gray-3 hover:text-gray-1"}`}>
                {t.label}
                <span className="ml-1 text-[11px] font-medium text-gray-3">{groups[t.key].length}</span>
                {active && <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-navy" />}
              </button>
            );
          })}
        </div>
      )}

      {searching && list.length === 0 && (
        <p className="px-4 pt-6 text-center text-[13px] text-gray-2">해당하는 학과·트랙이 없습니다.</p>
      )}

      {sections.map(({ head, items }) => (
        <section key={head ?? "search"}>
          {head && (
            <div className="sticky top-[6.6rem] z-[5] bg-white/95 px-4 pt-4 pb-1 text-[12px] font-bold text-gray-3 backdrop-blur">{head}</div>
          )}
          <ul className={`${searching ? "mt-2" : ""} stagger`}>
            {items.map((m) => {
              const ic = majorIcon(m.name);
              return (
                <li key={m.code} className="border-b border-line last:border-0">
                  <Link href={`/browse/${m.code}`} className="row flex items-center gap-3 px-4 py-3">
                    <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[18px] ${ic.bg}`}>{ic.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{m.name}</span>
                      <span className="block text-[12px] text-gray-3">
                        {m.kind === "track" && m.parentName ? `${m.parentName} · ` : ""}
                        과목 {m.courses}
                        {m.tracks ? ` · 트랙 ${m.tracks}` : ""}
                      </span>
                    </span>
                    <span aria-hidden className="text-gray-3">›</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
