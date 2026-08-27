import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { flattenMajors, loadMajorTree, type MajorNode } from "@/lib/majors";
import { MajorSearch } from "@/components/MajorSearch";

function Card({ m, sub }: { m: MajorNode; sub?: string }) {
  return (
    <li className="bg-white">
      <Link href={`/browse/${m.code}`} className="row flex h-full flex-col justify-between px-4 py-3">
        <span className="text-[14px] font-medium leading-snug">{m.name}</span>
        <span className="mt-1 text-[11px] text-gray-3">
          <span className="course-code mr-1">{m.code}</span>
          과목 {m.courses}{sub ? ` · ${sub}` : ""}
        </span>
      </Link>
    </li>
  );
}

export default async function BrowsePage() {
  const supabase = await createClient();
  const tree = await loadMajorTree(supabase);
  const items = flattenMajors(tree);

  return (
    <div className="pb-8">
      <section className="px-4 pt-5 pb-4">
        <h1 className="text-[20px] font-bold tracking-tight">학과·트랙으로 찾기</h1>
        <p className="mt-1 text-[13px] text-gray-2">학부·학과를 고르면 그 안의 트랙이 보입니다. 2026-2학기 수업계획서 기준.</p>
        <div className="mt-4">
          <MajorSearch items={items} />
        </div>
      </section>

      <section className="border-t-8 border-surface">
        <h2 className="px-4 pt-5 pb-2 text-[15px] font-bold">
          학부·학과 <span className="text-gray-3">{tree.tree.length}</span>
        </h2>
        <ul className="grid grid-cols-2 gap-px bg-line">
          {tree.tree.map((d) => (
            <Card key={d.code} m={d} sub={d.tracks.length ? `트랙 ${d.tracks.length}` : undefined} />
          ))}
        </ul>
      </section>

      {tree.others.length > 0 && (
        <section className="border-t-8 border-surface">
          <h2 className="px-4 pt-5 pb-2 text-[15px] font-bold">
            교양·기타 <span className="text-gray-3">{tree.others.length}</span>
          </h2>
          <ul className="grid grid-cols-2 gap-px bg-line">
            {tree.others.map((m) => <Card key={m.code} m={m} />)}
          </ul>
        </section>
      )}

      {tree.orphans.length > 0 && (
        <section className="border-t-8 border-surface">
          <h2 className="px-4 pt-5 pb-1 text-[15px] font-bold">
            소속 미확인 트랙 <span className="text-gray-3">{tree.orphans.length}</span>
          </h2>
          <p className="px-4 pb-2 text-[11px] text-gray-3">분반을 공유하는 학부·학과가 뚜렷하지 않은 트랙입니다.</p>
          <ul className="grid grid-cols-2 gap-px bg-line">
            {tree.orphans.map((m) => <Card key={m.code} m={m} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
