export default function Loading() {
  return (
    <div className="px-4 pt-5" aria-busy="true" aria-label="불러오는 중">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton mt-3 h-7 w-56" />
      <div className="skeleton mt-2 h-4 w-40" />
      <div className="mt-4 flex gap-4 rounded-xl bg-surface-soft p-4">
        <div className="skeleton h-36 w-[102px]" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line">
        <div className="skeleton h-16 rounded-none" />
        <div className="skeleton h-16 rounded-none" />
      </div>
    </div>
  );
}
