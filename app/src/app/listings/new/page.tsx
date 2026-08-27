import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Course } from "@/lib/types";
import { KIND_LABEL, ROLE_LABEL, firstLine } from "@/lib/types";
import { ListingForm } from "./ListingForm";

export default async function NewListingPage(props: PageProps<"/listings/new">) {
  const sp = await props.searchParams;
  const courseId = typeof sp.course === "string" ? sp.course : "";
  const kind = sp.kind === "buy" ? "buy" : "sell";

  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/listings/new?course=${courseId}&kind=${kind}`)}`);

  let course: Course | null = null;
  if (courseId) {
    const supabase = await createClient();
    const { data } = await supabase.from("courses").select("*").eq("id", courseId).single<Course>();
    course = data;
  }

  return (
    <div className="pb-8">
      <section className="px-4 pt-5 pb-3">
        <h1 className="text-[20px] font-bold tracking-tight">
          {ROLE_LABEL[kind]}로 {KIND_LABEL[kind]} 올리기
        </h1>
      </section>

      {/* KREAM '보유 상품 추가'처럼 상품(수업·교재)은 고정 카드 */}
      {course ? (
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
      ) : (
        <div className="mx-4 rounded-lg bg-surface-soft p-4 text-[13px] text-gray-2">
          수업이 지정되지 않았습니다. <Link className="text-action underline" href="/">수업을 먼저 검색</Link>하면 같은 수업 학생과 바로 연결됩니다.
        </div>
      )}

      <ListingForm courseId={course?.id ?? ""} defaultKind={kind} defaultTitle={firstLine(course?.book?.split(",")[0])} />
    </div>
  );
}
