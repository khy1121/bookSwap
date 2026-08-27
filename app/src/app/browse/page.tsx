import { createClient } from "@/lib/supabase/server";
import { loadMajorTree } from "@/lib/majors";
import { BrowseTabs, type BrowseItem } from "@/components/BrowseTabs";

export default async function BrowsePage() {
  const supabase = await createClient();
  const tree = await loadMajorTree(supabase);

  const dept: BrowseItem[] = tree.tree.map((d) => ({ code: d.code, name: d.name, courses: d.courses, tracks: d.tracks.length }));
  const track: BrowseItem[] = [
    ...tree.tree.flatMap((d) => d.tracks.map((t) => ({ code: t.code, name: t.name, courses: t.courses, parentName: d.name }))),
    ...tree.orphans.map((t) => ({ code: t.code, name: t.name, courses: t.courses })),
  ].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const other: BrowseItem[] = tree.others.map((m) => ({ code: m.code, name: m.name, courses: m.courses }));

  return (
    <div className="pb-8">
      <section className="px-4 pt-5 pb-4">
        <h1 className="text-[20px] font-bold tracking-tight">학과·트랙으로 찾기</h1>
        <p className="mt-1 text-[13px] text-gray-2">학부·학과를 고르면 그 안의 트랙과 과목이 보입니다.</p>
      </section>
      <BrowseTabs groups={{ dept, track, other }} />
    </div>
  );
}
