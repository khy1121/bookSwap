export type Course = {
  id: string; term: string; major: string; course_code: string; course: string;
  prof: string; bunban: string | null; book: string | null; subbook: string | null; cover_url: string | null;
};
export type ListingPublic = {
  id: string; course_id: string | null; kind: "sell" | "buy"; book_title: string;
  edition: string | null; condition: string | null; price: number | null; note: string | null;
  status: "open" | "done"; created_at: string; course: string | null; prof: string | null; course_book: string | null;
  photos: string[]; cover_url: string | null;
};
/** kind: 매물의 성격. sell = 판매자가 올린 매물, buy = 구매자가 올린 요청 */
export const KIND_LABEL = { sell: "판매", buy: "구매" } as const;
export const ROLE_LABEL = { sell: "판매자", buy: "구매자" } as const;
/** 상대방: 판매 매물의 상대는 구매자, 구매 요청의 상대는 판매자 */
export const COUNTERPART_LABEL = { sell: "판매자", buy: "구매자" } as const;
export const KIND_COLOR = { sell: "text-sky", buy: "text-blue" } as const;
export const KIND_BG = { sell: "bg-sky", buy: "bg-blue" } as const;
export const CONDITIONS = ["새 책", "필기 거의 없음", "필기 있음"] as const;
export const won = (n: number | null) => (n == null ? "미정" : `${n.toLocaleString("ko-KR")}원`);
export const firstLine = (s: string | null | undefined, max = 60) => (s ?? "").split("\n")[0].slice(0, max);
