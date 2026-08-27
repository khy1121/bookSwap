export default function Loading() {
  return (
    <div className="px-4 pt-6" aria-busy="true" aria-label="불러오는 중">
      <div className="skeleton h-7 w-48" />
      <div className="skeleton mt-2 h-7 w-64" />
      <div className="skeleton mt-4 h-12 w-full" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="skeleton h-14 w-10" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-12" />
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
