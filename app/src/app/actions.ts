"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { track } from "@/lib/events";
import { CONDITIONS } from "@/lib/types";

const DOMAIN = "@hansung.ac.kr";

export type ActionState = { error?: string; ok?: boolean; message?: string };

export async function signIn(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const referral = String(form.get("referral") ?? "").slice(0, 40);
  const nextRaw = String(form.get("next") ?? "/");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  if (!email.endsWith(DOMAIN)) return { error: `${DOMAIN} 이메일만 사용할 수 있습니다.` };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=${encodeURIComponent(next)}`,
      data: { referral_source: referral || null },
    },
  });
  if (error) return { error: error.message };
  await track("login_link_sent", { referral });
  return { ok: true, message: `${email} 로 로그인 링크를 보냈습니다. 메일함을 확인하세요.` };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function createListing(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const kind = form.get("kind") === "buy" ? "buy" : "sell";
  const course_id = String(form.get("course_id") ?? "") || null;
  const book_title = String(form.get("book_title") ?? "").trim();
  const edition = String(form.get("edition") ?? "").trim() || null;
  const condRaw = String(form.get("condition") ?? "");
  const condition = (CONDITIONS as readonly string[]).includes(condRaw) ? condRaw : null;
  const priceRaw = String(form.get("price") ?? "").replace(/[^\d]/g, "");
  const price = priceRaw ? Number(priceRaw) : null;
  const contact = String(form.get("contact") ?? "").trim();
  const note = String(form.get("note") ?? "").trim().slice(0, 500) || null;

  if (!book_title) return { error: "교재명을 입력하세요." };
  if (!contact) return { error: "연락 방법(오픈채팅 링크 또는 에타 닉)을 입력하세요." };

  const supabase = await createClient();

  // 판매자 실물 사진: 최대 3장, 3MB 이하, 이미지만. 경로는 user_id/… (Storage RLS가 폴더 소유 검사)
  const photos: string[] = [];
  if (kind === "sell") {
    const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 3);
    for (const [i, f] of files.entries()) {
      if (!f.type.startsWith("image/")) return { error: "이미지 파일만 올릴 수 있습니다." };
      if (f.size > 3 * 1024 * 1024) return { error: "사진 한 장은 3MB 이하여야 합니다." };
      const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}/${Date.now()}-${i}.${ext}`;
      const { error: upErr } = await supabase.storage.from("listing-photos").upload(path, f, { contentType: f.type });
      if (upErr) return { error: `사진 업로드 실패: ${upErr.message}` };
      photos.push(supabase.storage.from("listing-photos").getPublicUrl(path).data.publicUrl);
    }
  }

  const { data, error } = await supabase
    .from("listings")
    .insert({ user_id: user.id, course_id, kind, book_title, edition, condition, price, contact, note, photos })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await track("listing_created", { kind, course_id, has_price: price != null, photos: photos.length });
  revalidatePath("/");
  redirect(`/listings/${data.id}`);
}

/** 활성화 이벤트: 로그인한 사용자가 판매자/구매자 연락처를 연다. */
export async function revealContact(listingId: string): Promise<{ contact?: string; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "로그인 후 연락처를 볼 수 있습니다." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("listings").select("contact, kind, course_id").eq("id", listingId).single();
  if (error || !data) return { error: "매물을 찾을 수 없습니다." };
  await track("contact_clicked", { listing_id: listingId, kind: data.kind, course_id: data.course_id });
  return { contact: data.contact };
}

export async function markDone(listingId: string) {
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  await supabase.from("listings").update({ status: "done" }).eq("id", listingId).eq("user_id", user.id);
  await track("listing_done", { listing_id: listingId });
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/my");
}
