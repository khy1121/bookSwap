import type { PostgrestError } from "@supabase/supabase-js";

/** Supabase/Postgres/Auth 오류를 사용자에게 보여줄 한국어 문장으로 바꾼다. 원문은 서버 로그에만 남긴다. */
export function toMessage(err: unknown, fallback = "잠시 후 다시 시도해 주세요."): string {
  const e = err as Partial<PostgrestError> & { message?: string; status?: number; code?: string };
  const code = e?.code ?? "";
  const msg = (e?.message ?? "").toLowerCase();

  // Auth
  if (msg.includes("rate limit")) return "로그인 메일을 너무 자주 요청했습니다. 잠시 후 다시 시도해 주세요.";
  if (msg.includes("hansung.ac.kr") || msg.includes("database error saving new user")) return "한성대 계정(@hansung.ac.kr)만 사용할 수 있습니다. 학교 Google 계정을 선택해 주세요.";
  if (msg.includes("invalid email") || msg.includes("unable to validate email")) return "이메일 형식을 확인해 주세요.";
  if (msg.includes("jwt") || msg.includes("session") || e?.status === 401) return "로그인이 만료되었습니다. 다시 로그인해 주세요.";

  // Postgres
  if (code === "23503") return "연결된 수업 정보를 찾을 수 없습니다. 수업을 다시 선택해 주세요.";
  if (code === "23505") return "이미 같은 내용이 등록되어 있습니다.";
  if (code === "23514" || code === "22P02" || code === "22003") return "입력값이 올바르지 않습니다.";
  if (code === "42501" || msg.includes("row-level security")) return "권한이 없습니다. 본인 거래만 변경할 수 있습니다.";
  if (code === "PGRST116") return "찾을 수 없습니다. 삭제되었거나 주소가 잘못되었습니다.";
  if (code === "57014" || msg.includes("timeout")) return "응답이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요.";
  if (msg.includes("fetch failed") || msg.includes("network")) return "네트워크 연결을 확인해 주세요.";

  // Storage
  if (msg.includes("payload too large") || msg.includes("exceeded the maximum allowed size")) return "사진 용량이 너무 큽니다. 3MB 이하로 올려주세요.";
  if (msg.includes("mime type") || msg.includes("not supported")) return "JPG·PNG·WebP 사진만 올릴 수 있습니다.";
  if (msg.includes("bucket")) return "사진 저장소에 접근할 수 없습니다. 잠시 후 다시 시도해 주세요.";

  return fallback;
}

/** 조회 결과에 error가 있으면 던진다 → 가장 가까운 error.tsx 경계가 받는다. */
export function must<T>(res: { data: T; error: PostgrestError | null }, what = "데이터"): T {
  if (res.error) {
    console.error(`[db] ${what}:`, res.error.code, res.error.message);
    throw new Error(`${what}를 불러오지 못했습니다. ${toMessage(res.error)}`);
  }
  return res.data;
}

/** 서버 액션 입력 검증 규칙 (클라이언트와 서버가 같은 상수를 쓴다) */
export const LIMITS = {
  title: 100,
  edition: 30,
  contact: 200,
  note: 500,
  priceMax: 1_000_000,
  photos: 3,
  photoBytes: 3 * 1024 * 1024,
  openListingsPerUser: 30,
  query: 50,
} as const;
