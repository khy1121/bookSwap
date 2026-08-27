/** 학과 이름 키워드로 계열(대분류)·아이콘(lucide)·색을 정한다. 데이터에 단과대 정보가 없어서 쓰는 근사치. */
export type Family = { key: string; label: string; icon: string; bg: string; fg: string };

export const FAMILIES: Family[] = [
  { key: "tech", label: "공학·IT", icon: "icon-[lucide--cpu]", bg: "bg-[#e8f0fb]", fg: "text-blue" },
  { key: "design", label: "디자인·예술", icon: "icon-[lucide--palette]", bg: "bg-[#fdeef2]", fg: "text-[#c2417a]" },
  { key: "biz", label: "경영·경제", icon: "icon-[lucide--trending-up]", bg: "bg-[#e9f7ef]", fg: "text-[#1f8a4c]" },
  { key: "human", label: "인문·어문", icon: "icon-[lucide--book-open]", bg: "bg-[#fff4e5]", fg: "text-[#b45309]" },
  { key: "beauty", label: "뷰티·패션", icon: "icon-[lucide--scissors]", bg: "bg-[#f3e8ff]", fg: "text-[#7c3aed]" },
  { key: "public", label: "행정·부동산", icon: "icon-[lucide--landmark]", bg: "bg-[#eef2f6]", fg: "text-navy" },
  { key: "arts", label: "예체능", icon: "icon-[lucide--drama]", bg: "bg-[#fdf2e9]", fg: "text-[#c2410c]" },
  { key: "general", label: "교양", icon: "icon-[lucide--graduation-cap]", bg: "bg-surface", fg: "text-gray-2" },
  { key: "etc", label: "기타", icon: "icon-[lucide--school]", bg: "bg-surface", fg: "text-gray-2" },
];
const F = Object.fromEntries(FAMILIES.map((f) => [f.key, f])) as Record<string, Family>;

const RULES: [RegExp, string][] = [
  [/문헌|큐레이션/i, "human"],
  [/만화|웹툰/i, "design"], // 문헌정보·만화(웹툰)는 공학 키워드보다 먼저
  [/컴퓨터|소프트웨어|AI|인공지능|IT|정보|데이터|웹|모바일|보안|사이버|반도체|전자|기계|로봇|공학|시스템|산업/i, "tech"],
  [/디자인|미술|회화|동양화|서양화|콘텐츠|영상|애니|게임|UX|VMD|전시|인테리어/i, "design"],
  [/경영|경제|무역|회계|재무|금융|비즈니스|창업|마케팅|분석/i, "biz"],
  [/국문|국어|영어|영문|일본|중국|어문|언어|문학|역사|문화|큐레이션|인문|철학|지식/i, "human"],
  [/뷰티|패션|헤어|네일|메이크업|에스테틱|의류/i, "beauty"],
  [/부동산|행정|법|정책|도시|교통|공공|정부/i, "public"],
  [/무용|발레|음악|연극|공연|예술|체육|스포츠/i, "arts"],
  [/교양|필수|선택|기초|공통|일반/i, "general"],
];

export function familyOf(name: string): Family {
  for (const [re, key] of RULES) if (re.test(name)) return F[key];
  return F.etc;
}

/** 하위 호환: 아이콘·색만 필요한 곳 */
export function majorIcon(name: string) {
  const f = familyOf(name);
  return { icon: f.icon, bg: f.bg, fg: f.fg };
}

/** 한글 초성 (ㄱ~ㅎ). 그 외 문자는 '#'. */
const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const CHO_MERGE: Record<string, string> = { ㄲ: "ㄱ", ㄸ: "ㄷ", ㅃ: "ㅂ", ㅆ: "ㅅ", ㅉ: "ㅈ" };
export function chosung(s: string): string {
  const c = s.trim().charCodeAt(0);
  if (c >= 0xac00 && c <= 0xd7a3) {
    const k = CHO[Math.floor((c - 0xac00) / 588)];
    return CHO_MERGE[k] ?? k;
  }
  if (/[A-Za-z]/.test(s[0] ?? "")) return "A-Z";
  return "#";
}
