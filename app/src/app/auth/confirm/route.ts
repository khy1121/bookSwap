import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { track } from "@/lib/events";

/**
 * 두 가지 매직링크 형식을 모두 처리한다.
 * - 기본 템플릿({{ .ConfirmationURL }}, PKCE): ?code=...            → exchangeCodeForSession
 * - 커스텀 템플릿({{ .TokenHash }}):           ?token_hash=...&type= → verifyOtp
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextRaw = searchParams.get("next") ?? "/";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  const to = request.nextUrl.clone();
  to.search = "";

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (token_hash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash })).error;
  }

  if (ok) {
    await track("login_success");
    to.pathname = next;
    return NextResponse.redirect(to);
  }
  to.pathname = "/login";
  to.searchParams.set("error", "링크가 만료되었거나 잘못되었습니다. 다시 요청하세요.");
  return NextResponse.redirect(to);
}
