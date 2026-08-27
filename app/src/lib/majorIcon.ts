/** 학과 이름 키워드로 계열 아이콘·색을 정한다. 데이터에 단과대 정보가 없어서 쓰는 근사치. */
const RULES: [RegExp, { icon: string; bg: string; fg: string }][] = [
  [/컴퓨터|소프트웨어|AI|인공지능|IT|정보|데이터|웹|모바일|보안|사이버|반도체|전자|기계|로봇|공학|시스템|산업/i, { icon: "⚙️", bg: "bg-[#e8f0fb]", fg: "text-blue" }],
  [/디자인|미술|회화|동양화|서양화|콘텐츠|영상|애니|게임|UX|VMD|전시|인테리어/i, { icon: "🎨", bg: "bg-[#fdeef2]", fg: "text-[#c2417a]" }],
  [/경영|경제|무역|회계|재무|금융|비즈니스|창업|마케팅|분석/i, { icon: "📈", bg: "bg-[#e9f7ef]", fg: "text-[#1f8a4c]" }],
  [/국문|국어|영어|영문|일본|중국|어문|언어|문학|역사|문화|큐레이션|인문|철학|지식/i, { icon: "📚", bg: "bg-[#fff4e5]", fg: "text-[#b45309]" }],
  [/뷰티|패션|헤어|네일|메이크업|에스테틱|의류/i, { icon: "✂️", bg: "bg-[#f3e8ff]", fg: "text-[#7c3aed]" }],
  [/부동산|행정|법|정책|도시|교통|공공|정부/i, { icon: "🏛️", bg: "bg-[#eef2f6]", fg: "text-navy" }],
  [/무용|발레|음악|연극|공연|예술|체육|스포츠/i, { icon: "🎭", bg: "bg-[#fdf2e9]", fg: "text-[#c2410c]" }],
  [/교양|필수|선택|기초|공통|일반/i, { icon: "🎓", bg: "bg-surface", fg: "text-gray-2" }],
];

export function majorIcon(name: string) {
  for (const [re, v] of RULES) if (re.test(name)) return v;
  return { icon: "🏫", bg: "bg-surface", fg: "text-gray-2" };
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
