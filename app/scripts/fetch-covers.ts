// courses.book(교재명 원문) → 책 API로 표지 URL 조회 → courses.cover_url
// 사용: npm run covers [-- --reset]   (KAKAO_REST_API_KEY 있으면 카카오, 없으면 Google Books). --reset: 기존 표지 전부 다시 조회
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
const KAKAO = process.env.KAKAO_REST_API_KEY;
const supabase = createClient(url, key, { auth: { persistSession: false } });

/** "명품 자바 프로그래밍, 개정5판(2024년 7월 출시), 생능출판사 - 개정 4판에..." → "명품 자바 프로그래밍" */
const NOT_A_BOOK =
  /(강의\s*자료|수업\s*자료|학습\s*자료|강의\s*안|수업\s*안|교안|강의\s*노트|PPT|프린트|핸드\s*아웃|hand-?\s*out|유인물|없음|미정|자체\s*제작|별도|업로드|게시판|배포|참고|추후|공지|제공|과정|논문|판례|법전|교수\s*제작|^tba$|to be announced|^pdf|pdf\s*파일|coursepack|course\s*pack|^주교재$|^부교재$|^교재$|^기타\.?$|^kbs$|^iso$|^미용사$|reading materials|자료\s*배포|학과\s*제작|^ppt|^https?|^www\.|^url)/i;

/** 3글자 한글 = 사람 이름일 확률이 높다 ("박정식", "김재범") */
const looksLikeName = (s: string) => /^[가-힣]{3}$/.test(s) || /^[가-힣]{2,4}\s*(외|등)\s*\d*\s*인?$/.test(s);

function cleanSegment(seg: string): string {
  let t = seg;
  t = t.replace(/(제?\s*\d+\s*판|개정판|개정\s*\d*판|\d+(st|nd|rd|th)\s*ed\.?|edition|ed\.)/gi, "");
  t = t.replace(/\b(저자?|지음|역|옮김|편저|공저)\s*:?.*$/, "");
  t = t.replace(/^[\s"'“”‘’『』「」《》<>〈〉\[\]【】()（）]+|[\s"'“”‘’『』「」《》<>〈〉\[\]【】()（）.]+$/g, "");
  return t.replace(/\s+/g, " ").trim();
}

/** "박정식, 박종원 『현대투자론』, 제5판" → "현대투자론"; "명품 자바 프로그래밍, 개정5판(2024), 생능" → "명품 자바 프로그래밍" */
export function normalizeTitle(raw: string): string | null {
  const line = raw.split("\n")[0].trim().replace(/^\s*(\d+[.)]|[-•·*])\s*/, ""); // "1. " / "- " 만 제거 (숫자로 시작하는 제목은 유지)
  const candidates: string[] = [];
  const quoted = line.match(/[『「《<〈"“]([^』」》>〉"”]{3,})[』」》>〉"”]/);
  if (quoted) candidates.push(quoted[1]);
  for (const seg of line.split(/[,，(（\[【/|:：]/)) candidates.push(seg);
  for (const c of candidates) {
    const t = cleanSegment(c);
    if (t.length < 3 || looksLikeName(t) || NOT_A_BOOK.test(t)) continue;
    if (/^(https?|www|url|pdf|ppt|tba)$/i.test(t)) continue; // URL 조각·약어
    return t;
  }
  return null;
}

type KakaoDoc = { title: string; authors?: string[]; publisher?: string; thumbnail?: string };

/** 한/영 표기가 섞인 교재명을 같은 토큰으로 맞춘다 ("명품 자바 프로그래밍" ↔ "명품 JAVA Programming") */
const SYN: Record<string, string> = {
  자바: "java", 프로그래밍: "programming", 파이썬: "python", 알고리즘: "algorithm", 알고리듬: "algorithm",
  데이터베이스: "database", 데이타베이스: "database", 네트워크: "network", 네트워킹: "networking", 컴퓨터: "computer",
  운영체제: "os", 자료구조: "datastructure", 인공지능: "ai", 머신러닝: "machinelearning", 딥러닝: "deeplearning",
  개론: "introduction", 입문: "introduction", 기초: "basic", 웹: "web", 시스템: "system", 시스템즈: "systems",
  마케팅: "marketing", 회계: "accounting", 경영: "management", 경제학: "economics", 통계학: "statistics", 통계: "statistics",
  express: "express", 익스프레스: "express", 씨: "c", 씨언어: "c", c언어: "c", 리눅스: "linux", 안드로이드: "android",
};
const tokens = (s: string) =>
  new Set(
    s.toLowerCase().replace(/[^0-9a-z가-힣+#]+/g, " ").split(" ")
      .map((t) => SYN[t] ?? t)
      .filter((t) => t.length >= 2 || t === "c"),
  );

/** 후보 5건 중 제목 토큰 일치도 + 저자/출판사가 원문에 등장하는지로 점수를 매겨 고른다. 낮으면 null. */
export function pickBest(q: string, raw: string, docs: KakaoDoc[]): KakaoDoc | null {
  const qt = tokens(q);
  const rawLower = raw.toLowerCase();
  let best: { d: KakaoDoc; score: number } | null = null;
  for (const d of docs) {
    if (!d.thumbnail) continue;
    const tt = tokens(d.title);
    let inter = 0;
    for (const t of qt) if (tt.has(t)) inter++;
    const jaccard = inter / (new Set([...qt, ...tt]).size || 1);
    const recall = inter / (qt.size || 1);
    if (recall < 0.75) continue; // 질의 토큰 대부분이 제목에 있어야 함 (근사치 오매칭 방지)
    // 1~2토큰짜리 짧은 질의("인권", "Four Corners")는 제목이 사실상 같을 때만 (부제·시리즈 붙은 정도까지 허용)
    if (qt.size <= 2 && jaccard < 0.67) continue;
    let score = 0.5 * jaccard + 0.5 * recall;
    if (d.authors?.some((a) => a.length >= 2 && rawLower.includes(a.toLowerCase()))) score += 0.1;
    if (d.publisher && rawLower.includes(d.publisher.toLowerCase().replace(/\(주\)|주식회사/g, "").trim())) score += 0.05;
    if (!best || score > best.score) best = { d, score };
  }
  return best ? best.d : null;
}

async function kakaoSearch(query: string): Promise<KakaoDoc[]> {
  const r = await fetch(`https://dapi.kakao.com/v3/search/book?target=title&size=6&query=${encodeURIComponent(query)}`, {
    headers: { Authorization: `KakaoAK ${KAKAO}` },
  });
  if (!r.ok) return [];
  return ((await r.json()) as { documents?: KakaoDoc[] }).documents ?? [];
}

/** 원문 질의 + 동의어 번역 질의("명품 자바 프로그래밍" → "명품 java programming")를 합쳐 후보를 모은다. */
export async function kakaoCandidates(q: string): Promise<KakaoDoc[]> {
  const translated = q.split(/\s+/).map((w) => SYN[w.toLowerCase()] ?? w).join(" ");
  const queries = translated.toLowerCase() !== q.toLowerCase() ? [q, translated] : [q];
  const seen = new Set<string>();
  const docs: KakaoDoc[] = [];
  for (const query of queries) {
    for (const d of await kakaoSearch(query)) {
      const k = d.thumbnail ?? d.title;
      if (!seen.has(k)) { seen.add(k); docs.push(d); }
    }
  }
  return docs;
}
async function kakao(q: string, raw: string): Promise<string | null> {
  return pickBest(q, raw, await kakaoCandidates(q))?.thumbnail ?? null;
}

async function google(q: string): Promise<string | null> {
  const r = await fetch(`https://www.googleapis.com/books/v1/volumes?maxResults=1&q=intitle:${encodeURIComponent(q)}`);
  if (!r.ok) return null;
  const j = (await r.json()) as { items?: { volumeInfo?: { imageLinks?: { thumbnail?: string } } }[] };
  const t = j.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
  return t ? t.replace(/^http:/, "https:").replace(/&edge=curl/, "") : null;
}

async function main() {
  // Supabase는 기본 1,000행 제한 → 페이지 단위로 전부 읽는다
  const rows: { id: string; book: string; cover_url: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("courses").select("id, book, cover_url").not("book", "is", null).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const RESET = process.argv.includes("--reset");
  if (RESET) { const { error: e } = await supabase.from("courses").update({ cover_url: null }).not("cover_url", "is", null); if (e) throw e; }
  const byTitle = new Map<string, string[]>();
  const rawOf = new Map<string, string>();
  for (const r of rows) {
    if (r.cover_url && !RESET) continue;
    const t = normalizeTitle(r.book);
    if (t) { byTitle.set(t, [...(byTitle.get(t) ?? []), r.id]); rawOf.set(t, (rawOf.get(t) ?? "") + " " + r.book); }
  }
  console.log(`${rows.length} rows, ${byTitle.size} unique titles to look up via ${KAKAO ? "Kakao" : "Google Books"}`);

  let hit = 0, i = 0;
  for (const [title, ids] of byTitle) {
    i++;
    const cover = KAKAO ? await kakao(title, rawOf.get(title) ?? "") : await google(title);
    if (cover) {
      hit++;
      const { error: e } = await supabase.from("courses").update({ cover_url: cover }).in("id", ids);
      if (e) console.error(e.message);
    }
    if (i % 25 === 0) console.log(`${i}/${byTitle.size} (hit ${hit})`);
    await new Promise((r) => setTimeout(r, KAKAO ? 60 : 250));
  }
  console.log(`done: ${hit}/${byTitle.size} titles matched`);
}
if (process.argv[1]?.replace(/\\/g, "/").endsWith("fetch-covers.ts")) main().catch((e) => { console.error(e); process.exit(1); });
