"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FAMILIES, familyOf } from "@/lib/majorIcon";

export type DeptItem = { code: string; name: string; courses: number; tracks: { code: string; name: string; courses: number }[] };
export type OtherItem = { code: string; name: string; courses: number };

/**
 * 스플릿 뷰 (무신사·29CM·숨고 카테고리 패턴): 좌측 레일 = 계열 8개, 우측 = 그 계열의 학부·학과 카드 + 소속 트랙 칩.
 * 한 화면에 계열 하나만 펼치므로 46개 학과·43개 트랙을 한꺼번에 늘어놓지 않는다. 검색 중엔 전체에서 즉시 필터.
 */
export function BrowseSplit({ depts, others, orphans }: { depts: DeptItem[]; others: OtherItem[]; orphans: OtherItem[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase().replace(/\s+/g, "");

  // 계열별로 학과를 묶는다. 소속 미확인 트랙은 이름으로 계열만 잡아 트랙 없는 카드로.
  const byFamily = useMemo(() => {
    const m = new Map<string, { depts: DeptItem[]; loose: OtherItem[] }>();
    const get = (k: string) => m.get(k) ?? m.set(k, { depts: [], loose: [] }).get(k)!;
    for (const d of depts) get(familyOf(d.name).key).depts.push(d);
    for (const t of orphans) get(familyOf(t.name).key).loose.push(t);
    for (const o of others) get(familyOf(o.name).key === "etc" ? "general" : familyOf(o.name).key).loose.push(o);
    return m;
  }, [depts, others, orphans]);

  const rail = FAMILIES.filter((f) => byFamily.has(f.key)).map((f) => {
    const g = byFamily.get(f.key)!;
    return { ...f, count: g.depts.length + g.loose.length };
  });
  const [active, setActive] = useState(rail[0]?.key ?? "tech");
  const fam = FAMILIES.find((f) => f.key === active) ?? FAMILIES[0];
  const group = byFamily.get(active) ?? { depts: [], loose: [] };

  // 검색: 학과·트랙·기타 전부에서
  const hits = useMemo(() => {
    if (!query) return null;
    const out: { code: string; name: string; sub?: string; courses: number }[] = [];
    for (const d of depts) {
      if (d.name.toLowerCase().replace(/\s+/g, "").includes(query)) out.push({ code: d.code, name: d.name, courses: d.courses, sub: "학부·학과" });
      for (const t of d.tracks) if (t.name.toLowerCase().replace(/\s+/g, "").includes(query)) out.push({ code: t.code, name: t.name, courses: t.courses, sub: d.name });
    }
    for (const o of [...orphans, ...others]) if (o.name.toLowerCase().replace(/\s+/g, "").includes(query)) out.push({ code: o.code, name: o.name, courses: o.courses });
    return out.slice(0, 30);
  }, [query, depts, others, orphans]);

  const chip = "press inline-flex h-7 items-center gap-1 rounded-full border border-line bg-white px-2.5 text-[12px] font-medium text-gray-1 hover:border-action hover:text-action";

  return (
    <div>
      <div className="px-4">
        <div className="relative">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="학과·트랙 이름 검색" aria-label="학과·트랙 검색"
            className="h-12 w-full rounded-xl border border-line bg-surface pl-10 pr-10 text-[15px] outline-none transition-[border-color,box-shadow] placeholder:text-gray-3 focus:border-action focus:shadow-[0_0_0_3px_rgba(0,100,239,0.12)]" />
          <span aria-hidden className="icon-[lucide--search] pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-3" />
          {q && (
            <button type="button" aria-label="지우기" onClick={() => setQ("")} className="press absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 text-gray-3 hover:text-ink">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-line"><span aria-hidden className="icon-[lucide--x] size-3" /></span>
            </button>
          )}
        </div>
      </div>

      {hits ? (
        <ul className="anim-fade-up mx-4 mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
          {hits.length === 0 && <li className="px-4 py-4 text-center text-[13px] text-gray-2">해당하는 학과·트랙이 없습니다.</li>}
          {hits.map((h) => {
            const f = familyOf(h.name);
            return (
              <li key={h.code}>
                <Link href={`/browse/${h.code}`} className="row flex items-center gap-3 px-4 py-3">
                  <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${f.bg} ${f.fg}`}><span className={`${f.icon} size-4`} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{h.name}</span>
                    <span className="block text-[11px] text-gray-3">{h.sub ? `${h.sub} · ` : ""}과목 {h.courses}</span>
                  </span>
                  <span aria-hidden className="icon-[lucide--chevron-right] size-4 text-gray-3" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 flex border-t border-line" style={{ minHeight: "60vh" }}>
          {/* 좌측 레일: 계열 */}
          <nav aria-label="계열" className="sticky top-14 w-[104px] shrink-0 self-start border-r border-line bg-surface">
            <ul>
              {rail.map((f) => {
                const on = f.key === active;
                return (
                  <li key={f.key}>
                    <button type="button" onClick={() => setActive(f.key)} aria-current={on ? "true" : undefined}
                      className={`press relative flex w-full flex-col items-center gap-1 px-2 py-3.5 text-[12px] font-semibold transition-colors ${on ? "bg-white text-ink" : "text-gray-3 hover:text-gray-1"}`}>
                      {on && <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-navy" />}
                      <span aria-hidden className={`flex h-8 w-8 items-center justify-center rounded-lg ${on ? `${f.bg} ${f.fg}` : "bg-transparent text-gray-3"}`}><span className={`${f.icon} size-4`} /></span>
                      <span className="leading-tight">{f.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* 우측: 학과 카드 + 트랙 칩 */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 px-4 pt-4 pb-2">
              <span aria-hidden className={`flex h-7 w-7 items-center justify-center rounded-lg ${fam.bg} ${fam.fg}`}><span className={`${fam.icon} size-4`} /></span>
              <h2 className="text-[15px] font-bold">{fam.label}</h2>
              <span className="text-[12px] text-gray-3">{group.depts.length + group.loose.length}</span>
            </div>
            <ul key={active} className="stagger">
              {group.depts.map((d) => (
                <li key={d.code} className="border-b border-line px-4 py-3">
                  <Link href={`/browse/${d.code}`} className="row -mx-2 flex items-center gap-2 rounded-lg px-2 py-1">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{d.name}</span>
                      <span className="block text-[11px] text-gray-3">과목 {d.courses}{d.tracks.length ? ` · 트랙 ${d.tracks.length}` : ""}</span>
                    </span>
                    <span aria-hidden className="icon-[lucide--chevron-right] size-4 text-gray-3" />
                  </Link>
                  {d.tracks.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {d.tracks.map((t) => (
                        <li key={t.code}>
                          <Link href={`/browse/${t.code}`} className={chip}>
                            {t.name.replace(/트랙$/, "")}<span className="text-gray-3">{t.courses}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              {group.loose.map((o) => (
                <li key={o.code} className="border-b border-line px-4 py-3">
                  <Link href={`/browse/${o.code}`} className="row -mx-2 flex items-center gap-2 rounded-lg px-2 py-1">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{o.name}</span>
                      <span className="block text-[11px] text-gray-3">과목 {o.courses}</span>
                    </span>
                    <span aria-hidden className="icon-[lucide--chevron-right] size-4 text-gray-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
