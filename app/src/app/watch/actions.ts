"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { track } from "@/lib/events";
import { reportError } from "@/lib/report";

/** 과목 새 매물 알림 켜기/끄기. 반환: 현재 상태와 대기 인원. */
export async function toggleWatch(courseId: string): Promise<{ watching: boolean; count: number; error?: string }> {
  const user = await getUser();
  if (!user) return { watching: false, count: 0, error: "로그인이 필요합니다." };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("course_watches").select("course_id").eq("course_id", courseId).eq("user_id", user.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("course_watches").delete().eq("course_id", courseId).eq("user_id", user.id)
    : await supabase.from("course_watches").insert({ course_id: courseId, user_id: user.id });
  if (error) { await reportError("toggleWatch", error, { courseId }, user.id); return { watching: !!existing, count: 0, error: "알림 설정을 저장하지 못했습니다." }; }
  await track(existing ? "watch_off" : "watch_on", { course_id: courseId });
  revalidatePath(`/courses/${courseId}`);
  const { data: count } = await supabase.rpc("course_watch_count", { p_course_id: courseId });
  return { watching: !existing, count: typeof count === "number" ? count : 0 };
}
