// 채팅 e2e (2계정): 테스트 계정으로 방·메시지·사진을 만들고 판매자 답장을 실시간으로 기다린다. 사용: npx tsx --env-file=.env.local scripts/chat-e2e.ts (끝나면 방·계정 정리 필요)
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const TEST_EMAIL = "bookswap.test@hansung.ac.kr";
const OUT = "scripts/chat-e2e.json";

async function main() {
  // 1) 테스트 계정 (있으면 재사용)
  const { data: list } = await admin.auth.admin.listUsers();
  let test = list!.users.find((u) => u.email === TEST_EMAIL);
  if (!test) {
    const { data, error } = await admin.auth.admin.createUser({ email: TEST_EMAIL, email_confirm: true, user_metadata: { referral_source: "e2e" } });
    if (error) throw error;
    test = data.user;
  }
  const owner = list!.users.find((u) => u.email !== TEST_EMAIL)!;
  console.log("test user:", test.id, "| owner:", owner.id);

  // 2) 테스트 계정 세션 (magiclink token_hash → verifyOtp) — 메일 발송 없음
  const { data: link, error: lerr } = await admin.auth.admin.generateLink({ type: "magiclink", email: TEST_EMAIL });
  if (lerr) throw lerr;
  const t = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { error: verr } = await t.auth.verifyOtp({ type: "email", token_hash: link.properties.hashed_token });
  if (verr) throw verr;
  console.log("test user signed in");

  // 3) 소유자의 열린 매물 하나
  const { data: listing } = await admin.from("listings").select("id, book_title").eq("user_id", owner.id).eq("status", "open").limit(1).single();
  if (!listing) throw new Error("소유자의 열린 매물이 없음");
  console.log("listing:", listing.book_title);

  // 4) 방 생성 (RLS: buyer=본인, seller=매물 주인)
  let room = (await t.from("chat_rooms").select("id").eq("listing_id", listing.id).eq("buyer_id", test.id).maybeSingle()).data;
  if (!room) {
    const { data, error: rerr } = await t.from("chat_rooms").insert({ listing_id: listing.id, buyer_id: test.id, seller_id: owner.id }).select("id").single();
    if (rerr) throw new Error("room insert: " + rerr.message);
    room = data;
  }
  console.log("room:", room.id);

  // 5) 실시간 구독 (내가 받는 쪽)
  let gotReply: string | null = null;
  const ch = t.channel(`e2e:${room.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${room.id}` }, (p) => {
    const m = p.new as { sender_id: string; body: string | null; image_url: string | null };
    if (m.sender_id === owner.id) { gotReply = m.body ?? "(사진)"; console.log("REALTIME 수신:", gotReply); }
  });
  await new Promise<void>((res) => ch.subscribe((s) => { console.log("realtime:", s); if (s === "SUBSCRIBED") res(); }));

  // 6) 텍스트 + 사진 메시지 (RLS 경유)
  const { error: m1 } = await t.from("chat_messages").insert({ room_id: room.id, sender_id: test.id, body: "안녕하세요! 이 책 아직 있나요? 필기 상태 궁금해요 (e2e 테스트)" });
  if (m1) throw new Error("msg1: " + m1.message);
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  const path = `${room.id}/e2e-${Date.now()}.png`;
  const { error: uerr } = await t.storage.from("chat-photos").upload(path, png, { contentType: "image/png" });
  if (uerr) throw new Error("upload: " + uerr.message);
  const image_url = t.storage.from("chat-photos").getPublicUrl(path).data.publicUrl;
  const { error: m2 } = await t.from("chat_messages").insert({ room_id: room.id, sender_id: test.id, image_url });
  if (m2) throw new Error("msg2: " + m2.message);
  console.log("sent: text + photo");
  writeFileSync(OUT, JSON.stringify({ room: room.id, test: test.id, path }), "utf8");

  // 7) 판매자 답장 대기 (브라우저에서 보냄)
  const deadline = Date.now() + 120_000;
  while (!gotReply && Date.now() < deadline) await new Promise((r) => setTimeout(r, 1000));
  console.log(gotReply ? "PASS: 실시간 답장 수신" : "TIMEOUT: 답장 없음");
  // 읽음 처리 확인
  const { data: mine } = await t.from("chat_messages").select("id, read_at").eq("room_id", room.id).eq("sender_id", test.id);
  console.log("내 메시지 read_at:", mine?.map((m) => (m.read_at ? "읽음" : "안읽음")).join(", "));
  await t.removeChannel(ch);
  process.exit(0);
}
main().catch((e) => { console.error("FAIL", e.message ?? e); process.exit(1); });
