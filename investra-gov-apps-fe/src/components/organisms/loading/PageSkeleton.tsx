import { Skeleton } from "@/components/ui/skeleton";

interface BasicPageSkeletonProps {
  cardCount?: number;
  contentBlockCount?: number;
}

export function BasicPageSkeleton({
  cardCount = 4,
  contentBlockCount = 2,
}: BasicPageSkeletonProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cardCount }).map((_, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 bg-white p-5">
            <Skeleton className="mb-3 h-4 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>

      {Array.from({ length: contentBlockCount }).map((_, idx) => (
        <div key={idx} className="rounded-lg border border-gray-200 bg-white p-6 space-y-3">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-48 w-full" />
        </div>
      ))}
    </div>
  );
}

interface TablePageSkeletonProps {
  columnCount?: number;
  rowCount?: number;
}

export function TablePageSkeleton({
  columnCount = 6,
  rowCount = 8,
}: TablePageSkeletonProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-20 w-full" />
          ))}
        </div>

        <div className="space-y-3">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
            {Array.from({ length: columnCount }).map((_, idx) => (
              <Skeleton key={idx} className="h-4 w-full" />
            ))}
          </div>
          {Array.from({ length: rowCount }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columnCount }).map((_, colIdx) => (
                <Skeleton key={`${rowIdx}-${colIdx}`} className="h-8 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface BlockSkeletonProps {
  heightClassName?: string;
}

export function BlockSkeleton({ heightClassName = "h-64" }: BlockSkeletonProps) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-48" />
      <Skeleton className={`w-full ${heightClassName}`} />
    </div>
  );
}
