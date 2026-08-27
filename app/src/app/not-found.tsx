import Link from "next/link";

export default function NotFound() {
  return (
    <div className="anim-fade-up px-4 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-soft text-[26px]">📭</div>
      <h1 className="mt-4 text-[18px] font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-2">삭제된 거래이거나 주소가 잘못되었습니다.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/" className="press flex h-11 items-center rounded-xl bg-navy px-5 text-[14px] font-semibold text-white">홈으로</Link>
        <Link href="/browse" className="press flex h-11 items-center rounded-xl border border-line bg-white px-5 text-[14px] font-semibold text-gray-1">학과에서 찾기</Link>
      </div>
    </div>
  );
}
