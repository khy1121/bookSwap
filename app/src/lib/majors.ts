import type { createClient } from "@/lib/supabase/server";

export type MajorNode = {
  code: string;
  name: string;              // "[K170] " 접두 제거된 이름
  kind: "dept" | "track" | "other";
  courses: number;           // 고유 과목 수
  sections: number;          // 분반 수
  parent?: string;           // 트랙의 소속 학부·학과 코드 (추론)
  share?: number;            // 소속 추론 근거: 분반 공유 비율 0~1
  tracks: MajorNode[];       // 학부·학과 아래 트랙
};

export const cleanMajor = (name: string) => name.replace(/^\[.*?\]\s*/, "");

const isTrack = (n: string) => /트랙$/.test(n);
const isDept = (n: string) => /(학부|학과|전공|학과군)$/.test(n) && !isTrack(n);

/** 트랙 → 학부·학과 소속을 "같은 분반을 얼마나 공유하는가"로 추론한다. 한성대 데이터에 명시된 계층이 없어서 쓰는 방법. */
const PARENT_MIN_SHARE = 0.4;

/**
 * courses.majors를 펼쳐 학부·학과 → 트랙 트리를 만든다. 1,500행 정도라 요청마다 계산해도 가볍다.
 * 반환: { tree: 학부·학과(트랙 포함) 목록, others: 교양·기타, orphans: 소속 미확인 트랙, byCode }
 */
export async function loadMajorTree(supabase: Awaited<ReturnType<typeof createClient>>) {
  const rows: { plan: string; course_code: string; majors: { code: string; name: string }[] }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("courses").select("plan, course_code, majors").range(from, from + 999);
    if (error) throw new Error(`학과 목록을 불러오지 못했습니다. ${error.message}`);
    rows.push(...((data ?? []) as typeof rows));
    if (!data || data.length < 1000) break;
  }

  const sections = new Map<string, Set<string>>();
  const courses = new Map<string, Set<string>>();
  const names = new Map<string, string>();
  for (const r of rows) {
    for (const m of r.majors ?? []) {
      names.set(m.code, cleanMajor(m.name));
      (sections.get(m.code) ?? sections.set(m.code, new Set()).get(m.code)!).add(r.plan);
      (courses.get(m.code) ?? courses.set(m.code, new Set()).get(m.code)!).add(r.course_code);
    }
  }

  const byCode = new Map<string, MajorNode>();
  for (const [code, name] of names) {
    byCode.set(code, {
      code, name, kind: isTrack(name) ? "track" : isDept(name) ? "dept" : "other",
      courses: courses.get(code)!.size, sections: sections.get(code)!.size, tracks: [],
    });
  }

  const depts = [...byCode.values()].filter((n) => n.kind === "dept");
  const orphans: MajorNode[] = [];
  for (const t of [...byCode.values()].filter((n) => n.kind === "track")) {
    const T = sections.get(t.code)!;
    let best: { d: MajorNode | null; share: number } = { d: null, share: 0 };
    for (const d of depts) {
      let inter = 0;
      for (const p of T) if (sections.get(d.code)!.has(p)) inter++;
      const share = inter / T.size;
      if (share > best.share) best = { d, share };
    }
    if (best.d && best.share >= PARENT_MIN_SHARE) {
      t.parent = best.d.code;
      t.share = best.share;
      best.d.tracks.push(t);
    } else {
      orphans.push(t);
    }
  }

  const ko = (a: MajorNode, b: MajorNode) => a.name.localeCompare(b.name, "ko");
  for (const d of depts) d.tracks.sort(ko);
  return {
    tree: depts.sort(ko),
    others: [...byCode.values()].filter((n) => n.kind === "other").sort(ko),
    orphans: orphans.sort(ko),
    byCode,
  };
}

/** 검색용 평면 목록 (학부·학과·트랙·기타 전부) */
export function flattenMajors(t: Awaited<ReturnType<typeof loadMajorTree>>) {
  return [...t.byCode.values()].map((n) => ({
    code: n.code, name: n.name, kind: n.kind, courses: n.courses,
    parentName: n.parent ? t.byCode.get(n.parent)?.name : undefined,
  }));
}
