import { createClient } from "@/lib/supabase/server";
import { loadMajorTree } from "@/lib/majors";
import { BrowseSplit, type DeptItem, type OtherItem } from "@/components/BrowseSplit";

export default async function BrowsePage() {
  const supabase = await createClient();
  const tree = await loadMajorTree(supabase);

  const depts: DeptItem[] = tree.tree.map((d) => ({
    code: d.code, name: d.name, courses: d.courses,
    tracks: d.tracks.map((t) => ({ code: t.code, name: t.name, courses: t.courses })),
  }));
  const others: OtherItem[] = tree.others.map((m) => ({ code: m.code, name: m.name, courses: m.courses }));
  const orphans: OtherItem[] = tree.orphans.map((m) => ({ code: m.code, name: m.name, courses: m.courses }));

  return (
    <div className="pb-8">
      <section className="px-4 pt-5 pb-4">
        <h1 className="text-[20px] font-bold tracking-tight">학과·트랙으로 찾기</h1>
        <p className="mt-1 text-[13px] text-gray-2">계열을 고르면 학부·학과와 그 안의 트랙이 보입니다.</p>
      </section>
      <BrowseSplit depts={depts} others={others} orphans={orphans} />
    </div>
  );
}
