"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type MajorItem = { code: string; name: string; kind: "dept" | "track" | "other"; courses: number; parentName?: string };

const KIND = { dept: "학부·학과", track: "트랙", other: "교양·기타" } as const;

/** 학부·학과·트랙 이름 검색. 서버에서 받은 평면 목록을 브라우저에서 즉시 필터한다 (100개 남짓). */
export function MajorSearch({ items }: { items: MajorItem[] }) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const n = q.trim().toLowerCase().replace(/\s+/g, "");
    if (!n) return [];
    return items
      .filter((m) => m.name.toLowerCase().replace(/\s+/g, "").includes(n) || m.code.toLowerCase() === n)
      .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name, "ko") : a.kind === "dept" ? -1 : 1))
      .slice(0, 20);
  }, [q, items]);

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="학과·트랙 이름 검색 (예: 컴퓨터, 패션, 웹공학)"
        className="h-12 w-full rounded-lg border border-line bg-surface px-4 text-[15px] outline-none focus:border-action placeholder:text-gray-3"
        aria-label="학과·트랙 검색"
      />
      {q.trim() && (
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-white">
          {hits.length === 0 && <li className="px-4 py-3 text-[13px] text-gray-2">해당하는 학과·트랙이 없습니다.</li>}
          {hits.map((m) => (
            <li key={m.code}>
              <Link href={`/browse/${m.code}`} className="flex items-center justify-between px-4 py-3 hover:bg-surface-soft">
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium">{m.name}</span>
                  <span className="block text-[11px] text-gray-3">
                    {KIND[m.kind]}{m.parentName ? ` · ${m.parentName}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] text-gray-3">과목 {m.courses}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
