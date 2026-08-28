"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { track } from "@/lib/events";
import { CONDITIONS } from "@/lib/types";
import { LIMITS, toMessage } from "@/lib/errors";

const DOMAIN = "@hansung.ac.kr";

export type ActionState = { error?: string; ok?: boolean; message?: string };

export async function signIn(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const referral = String(form.get("referral") ?? "").slice(0, 40);
  const nextRaw = String(form.get("next") ?? "/");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  if (!/^[a-z0-9._%+-]+@hansung\.ac\.kr$/.test(email)) return { error: `${DOMAIN} 이메일만 사용할 수 있습니다.` };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=${encodeURIComponent(next)}`,
      data: { referral_source: referral || null },
    },
  });
  if (error) { console.error("[signIn]", error.message); return { error: toMessage(error) }; }
  await track("login_link_sent", { referral });
  return { ok: true, message: `${email} 로 로그인 링크를 보냈습니다. 메일함을 확인하세요.` };
}

/** 학교 Google 계정 로그인 (hansung.ac.kr Google Workspace). 도메인은 hd 힌트 + DB 트리거로 이중 검사. */
export async function signInWithGoogle(next = "/") {
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  // Supabase 허용 목록은 쿼리스트링까지 정확히 비교하므로 redirectTo에는 붙이지 않고, 돌아갈 경로는 쿠키로 전달
  (await cookies()).set("bs_next", safeNext, { path: "/", maxAge: 600, httpOnly: true, sameSite: "lax" });
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      queryParams: { hd: "hansung.ac.kr", prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    console.error("[google]", error?.message);
    redirect(`/login?error=${encodeURIComponent("Google 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.")}`);
  }
  await track("login_google_start", {});
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

const MAX_PHOTOS = 3;

/** 폼 공통 필드 파싱·검증. 등록과 수정이 같이 쓴다. */
function parseListingForm(form: FormData) {
  const kind = form.get("kind") === "buy" ? "buy" : "sell";
  const courseRaw = String(form.get("course_id") ?? "").trim();
  const course_id = /^[0-9a-f-]{36}$/i.test(courseRaw) ? courseRaw : null;
  const book_title = String(form.get("book_title") ?? "").replace(/\s+/g, " ").trim();
  const edition = String(form.get("edition") ?? "").trim().slice(0, LIMITS.edition) || null;
  const condRaw = String(form.get("condition") ?? "");
  const condition = (CONDITIONS as readonly string[]).includes(condRaw) ? condRaw : null;
  const priceRaw = String(form.get("price") ?? "").replace(/[^\d]/g, "");
  const price = priceRaw ? Number(priceRaw) : null;
  const contact = String(form.get("contact") ?? "").trim();
  const note = String(form.get("note") ?? "").trim().slice(0, LIMITS.note) || null;
  if (!book_title) return { error: "교재명을 입력하세요." } as const;
  if (book_title.length > LIMITS.title) return { error: `교재명은 ${LIMITS.title}자 이내로 입력하세요.` } as const;
  if (price != null && (!Number.isFinite(price) || price > LIMITS.priceMax)) return { error: `가격은 ${LIMITS.priceMax.toLocaleString("ko-KR")}원 이하로 입력하세요.` } as const;
  if (!contact) return { error: "연락 방법(오픈채팅 링크 또는 에타 닉)을 입력하세요." } as const;
  if (contact.length > LIMITS.contact) return { error: "연락 방법이 너무 깁니다." } as const;
  if (/^https?:\/\//i.test(contact) && !/^https:\/\/open\.kakao\.com\//i.test(contact)) return { error: "링크는 카카오 오픈채팅(https://open.kakao.com/…)만 넣을 수 있습니다. 다른 연락처는 에브리타임 닉네임으로 적어주세요." } as const;
  if (/@|\d{3}-?\d{3,4}-?\d{4}/.test(contact)) return { error: "이메일·전화번호는 넣지 마세요. 오픈채팅 링크나 에타 닉네임만 받습니다." } as const;
  return { fields: { kind, course_id, book_title, edition, condition, price, contact, note } } as const;
}

/** 판매자 실물 사진 업로드. 경로는 user_id/… (Storage RLS가 폴더 소유 검사). 성공 시 public URL 목록. */
async function uploadPhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  files: File[],
): Promise<{ urls: string[] } | { error: string }> {
  const urls: string[] = [];
  for (const [i, f] of files.entries()) {
    if (!f.type.startsWith("image/")) return { error: "이미지 파일만 올릴 수 있습니다." };
    if (f.size > LIMITS.photoBytes) return { error: "사진 한 장은 3MB 이하여야 합니다." };
    const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage.from("listing-photos").upload(path, f, { contentType: f.type });
    if (error) { console.error("[upload]", error.message); return { error: `사진 업로드 실패: ${toMessage(error)}` }; }
    urls.push(supabase.storage.from("listing-photos").getPublicUrl(path).data.publicUrl);
  }
  return { urls };
}

const newFiles = (form: FormData) =>
  form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, LIMITS.photos);

export async function createListing(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: "로그인이 필요합니다." };
  const parsed = parseListingForm(form);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const supabase = await createClient();
  const { count } = await supabase.from("listings").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "open");
  if ((count ?? 0) >= LIMITS.openListingsPerUser) return { error: `진행 중인 거래는 ${LIMITS.openListingsPerUser}개까지 올릴 수 있습니다. 끝난 거래를 완료 처리해 주세요.` };
  let photos: string[] = [];
  if (fields.kind === "sell") {
    const up = await uploadPhotos(supabase, user.id, newFiles(form).slice(0, MAX_PHOTOS));
    if ("error" in up) return { error: up.error };
    photos = up.urls;
  }

  const { data, error } = await supabase
    .from("listings")
    .insert({ user_id: user.id, ...fields, photos })
    .select("id")
    .single();
  if (error) { console.error("[createListing]", error.code, error.message); return { error: toMessage(error) }; }

  await track("listing_created", { kind: fields.kind, course_id: fields.course_id, has_price: fields.price != null, photos: photos.length });
  revalidatePath("/");
  redirect(`/listings/${data.id}?toast=created`);
}

/** 본인 매물 수정. 기존 사진은 keep_photos(JSON 배열)로 유지 목록을 받고, 새 사진은 photos로 추가한다. */
export async function updateListing(listingId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: "로그인이 필요합니다." };
  const parsed = parseListingForm(form);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const supabase = await createClient();
  const { data: own } = await supabase.from("listings").select("user_id, photos").eq("id", listingId).single();
  if (!own) return { error: "거래를 찾을 수 없습니다. 삭제되었을 수 있습니다." };
  if (own.user_id !== user.id) return { error: "본인 매물만 수정할 수 있습니다." };

  let photos: string[] = [];
  if (fields.kind === "sell") {
    let keep: string[] = [];
    try { keep = JSON.parse(String(form.get("keep_photos") ?? "[]")); } catch { keep = []; }
    keep = keep.filter((u) => (own.photos as string[]).includes(u)); // 원래 이 매물 사진만 유지 가능
    const up = await uploadPhotos(supabase, user.id, newFiles(form).slice(0, Math.max(0, MAX_PHOTOS - keep.length)));
    if ("error" in up) return { error: up.error };
    photos = [...keep, ...up.urls];
  }

  const { error } = await supabase.from("listings").update({ ...fields, photos }).eq("id", listingId).eq("user_id", user.id);
  if (error) { console.error("[updateListing]", error.code, error.message); return { error: toMessage(error) }; }

  await track("listing_updated", { listing_id: listingId, kind: fields.kind });
  revalidatePath("/");
  revalidatePath("/my");
  revalidatePath(`/listings/${listingId}`);
  redirect(`/listings/${listingId}?toast=updated`);
}

/** 본인 매물 삭제. 사진 파일도 함께 지운다(실패해도 삭제는 진행). */
export async function deleteListing(listingId: string) {
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const { data: own } = await supabase.from("listings").select("user_id, photos, course_id").eq("id", listingId).single();
  if (!own) redirect("/my?toast=error");
  if (own.user_id !== user.id) redirect("/my?toast=forbidden");

  const paths = (own.photos as string[])
    .map((u) => u.split("/listing-photos/")[1])
    .filter((p): p is string => !!p);
  if (paths.length) {
    const { error: rmErr } = await supabase.storage.from("listing-photos").remove(paths);
    if (rmErr) console.error("[deleteListing] photo cleanup", rmErr.message); // 사진 정리 실패는 삭제를 막지 않는다
  }

  const { data: deleted, error } = await supabase.from("listings").delete().eq("id", listingId).eq("user_id", user.id).select("id");
  if (error) { console.error("[deleteListing]", error.code, error.message); redirect("/my?toast=error"); }
  if (!deleted?.length) redirect("/my?toast=forbidden"); // RLS에 막히면 0건

  await track("listing_deleted", { listing_id: listingId });
  revalidatePath("/");
  revalidatePath("/my");
  if (own.course_id) revalidatePath(`/courses/${own.course_id}`);
  redirect("/my?toast=deleted");
}

/** 활성화 이벤트: 로그인한 사용자가 판매자/구매자 연락처를 연다. */
export async function revealContact(listingId: string): Promise<{ contact?: string; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "로그인 후 연락처를 볼 수 있습니다." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("listings").select("contact, kind, course_id, status").eq("id", listingId).single();
  if (error || !data) return { error: "거래를 찾을 수 없습니다. 삭제되었을 수 있습니다." };
  if (data.status === "done") return { error: "이미 끝난 거래입니다." };
  await track("contact_clicked", { listing_id: listingId, kind: data.kind, course_id: data.course_id });
  return { contact: data.contact };
}

export async function markDone(listingId: string) {
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const { data: updated, error } = await supabase.from("listings").update({ status: "done" }).eq("id", listingId).eq("user_id", user.id).select("id");
  if (error) { console.error("[markDone]", error.message); redirect(`/listings/${listingId}?toast=error`); }
  if (!updated?.length) redirect(`/listings/${listingId}?toast=forbidden`);
  await track("listing_done", { listing_id: listingId });
  revalidatePath("/");
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/my");
  redirect(`/listings/${listingId}?toast=done`);
}

/** 클라이언트에서 오는 계측 이벤트. 허용 목록 밖은 무시 (임의 이벤트 주입 방지). */
const CLIENT_EVENTS = new Set(["pwa_prompt_shown", "pwa_prompt_dismissed", "pwa_install_choice", "pwa_installed", "pwa_guide_shown", "app_update_prompted", "app_update_applied", "push_permission", "push_clicked"]);
export async function logEvent(event: string, props: Record<string, unknown> = {}) {
  if (!CLIENT_EVENTS.has(event)) return;
  await track(event, props);
}
