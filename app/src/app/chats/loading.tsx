export default function Loading() {
  return (
    <div className="px-4 pt-5" aria-busy="true" aria-label="불러오는 중">
      <div className="skeleton h-7 w-24" />
      <div className="mt-6 space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="skeleton h-14 w-10" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
