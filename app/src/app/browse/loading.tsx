export default function Loading() {
  return (
    <div className="px-4 pt-5" aria-busy="true" aria-label="불러오는 중">
      <div className="skeleton h-7 w-40" />
      <div className="skeleton mt-2 h-4 w-72" />
      <div className="skeleton mt-4 h-12 w-full" />
      <div className="mt-8 grid grid-cols-2 gap-px">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2 p-3">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
