import { notFound, redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Course } from "@/lib/types";
import { firstLine } from "@/lib/types";
import { ListingForm, type ListingInitial } from "@/app/listings/new/ListingForm";

export default async function EditListingPage(props: PageProps<"/listings/[id]/edit">) {
  const { id } = await props.params;
  const user = await getUser();
  if (!user) redirect(`/login?next=/listings/${id}/edit`);

  const supabase = await createClient();
  const { data: l } = await supabase
    .from("listings")
    .select("id, user_id, course_id, kind, book_title, edition, condition, price, contact, note, photos")
    .eq("id", id)
    .single();
  if (!l) notFound();
  if (l.user_id !== user.id) redirect(`/listings/${id}`);

  let course: Course | null = null;
  if (l.course_id) {
    const { data } = await supabase.from("courses").select("*").eq("id", l.course_id).single<Course>();
    course = data;
  }

  const initial: ListingInitial = {
    id: l.id, kind: l.kind, book_title: l.book_title, edition: l.edition, condition: l.condition,
    price: l.price, contact: l.contact, note: l.note, photos: l.photos ?? [],
  };

  return (
    <div className="pb-8">
      <section className="px-4 pt-5 pb-3">
        <h1 className="text-[20px] font-bold tracking-tight">거래 수정</h1>
      </section>
      {course && (
        <div className="mx-4 rounded-lg border border-line p-4">
          <div className="flex items-center gap-2">
            <span className="course-code">{course.course_code}</span>
            <span className="text-[14px] font-semibold">{course.course}</span>
          </div>
          <p className="mt-1 text-[12px] text-gray-2">
            {course.prof} 교수{course.bunban ? ` · ${course.bunban}분반` : ""}
          </p>
          <p className="mt-2 text-[13px] text-gray-1">지정 교재 · {firstLine(course.book) || "미기재"}</p>
        </div>
      )}
      <ListingForm courseId={l.course_id ?? ""} defaultKind={l.kind} defaultTitle={l.book_title} initial={initial} />
    </div>
  );
}
