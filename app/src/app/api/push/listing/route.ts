import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "@/lib/push";
import { KIND_LABEL } from "@/lib/types";
import { won } from "@/lib/types";

/**
 * listings INSERT 트리거(pg_net) → 그 과목(같은 과목명+교수, 분반 무관)을 구독한 사용자에게 푸시.
 * 올린 본인은 제외. 헤더 x-webhook-secret 검증.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = (await req.json().catch(() => null)) as {
    type?: string; table?: string;
    record?: { id: string; user_id: string; course_id: string | null; kind: "sell" | "buy"; book_title: string; price: number | null; status: string };
  } | null;
  const rec = payload?.record;
  if (payload?.type !== "INSERT" || payload.table !== "listings" || !rec) return NextResponse.json({ skipped: "not a listing insert" });
  if (!rec.course_id || rec.status !== "open") return NextResponse.json({ skipped: "no course" });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: course } = await db.from("courses").select("course, prof").eq("id", rec.course_id).single();
  if (!course) return NextResponse.json({ skipped: "course missing" });

  // 같은 수업의 모든 분반 id → 그 분반들을 구독한 사용자
  const { data: siblings } = await db.from("courses").select("id").eq("course", course.course).eq("prof", course.prof);
  const ids = (siblings ?? []).map((c) => c.id);
  const { data: watches } = await db.from("course_watches").select("user_id").in("course_id", ids).neq("user_id", rec.user_id);
  const users = [...new Set((watches ?? []).map((w) => w.user_id as string))];
  if (users.length === 0) return NextResponse.json({ skipped: "no watchers" });

  const result = await sendPushToUsers(users, {
    title: `${course.course} · 새 ${KIND_LABEL[rec.kind]} 등록`,
    body: `${rec.book_title} · ${won(rec.price)}${rec.kind === "sell" ? " — 지금 채팅으로 문의해 보세요" : " — 이 책이 있다면 판매해 보세요"}`,
    url: `/listings/${rec.id}`,
    tag: `course-${rec.course_id}`,
  });
  await db.from("events").insert({ user_id: null, event: "push_sent", props: { kind: "listing", listing_id: rec.id, watchers: users.length, ...result } });
  return NextResponse.json({ watchers: users.length, ...result });
}
