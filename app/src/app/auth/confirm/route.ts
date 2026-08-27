import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { track } from "@/lib/events";
import { toMessage } from "@/lib/errors";

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
  // 돌아갈 경로: 쿼리(next) 또는 Google 로그인 시작 시 심어둔 쿠키(bs_next)
  const cookieStore = await cookies();
  const nextRaw = searchParams.get("next") ?? cookieStore.get("bs_next")?.value ?? "/";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  const to = request.nextUrl.clone();
  to.search = "";

  // OAuth 제공자가 오류를 돌려준 경우 (도메인 밖 계정 등)
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError && !code && !token_hash) {
    to.pathname = "/login";
    to.searchParams.set("error", toMessage({ message: providerError }, "Google 로그인이 취소되었거나 실패했습니다."));
    return NextResponse.redirect(to);
  }

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (token_hash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash })).error;
  }

  if (ok) {
    await track("login_success", { via: code ? "oauth" : "magiclink" });
    to.pathname = next;
    to.searchParams.set("toast", "login");
    const res = NextResponse.redirect(to);
    res.cookies.set("bs_next", "", { path: "/", maxAge: 0 });
    return res;
  }
  to.pathname = "/login";
  to.searchParams.set("error", code ? "학교 계정으로 로그인하지 못했습니다. 한성대 Google 계정(@hansung.ac.kr)인지 확인해 주세요." : "링크가 만료되었거나 잘못되었습니다. 다시 요청하세요.");
  return NextResponse.redirect(to);
}
