"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export function BattlesPagination({
  page,
  totalPages,
  total,
  hasNext,
  hasPrev,
}: PaginationProps) {
  const searchParams = useSearchParams();

  const createPageUrl = (pageNum: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (pageNum === 1) {
      params.delete("page");
    } else {
      params.set("page", String(pageNum));
    }
    const queryString = params.toString();
    return `/battles${queryString ? `?${queryString}` : ""}`;
  };

  if (totalPages <= 1) {
    return (
      <div className="mt-4 text-center text-sm text-muted">
        {total} {total === 1 ? "battle" : "battles"}
      </div>
    );
  }

  const pageNumbers: (number | "ellipsis")[] = [];
  const delta = 2;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - delta && i <= page + delta)
    ) {
      pageNumbers.push(i);
    } else if (pageNumbers[pageNumbers.length - 1] !== "ellipsis") {
      pageNumbers.push("ellipsis");
    }
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      <div className="order-2 text-sm text-muted sm:order-1">
        {total} {total === 1 ? "battle" : "battles"} · Page {page} of{" "}
        {totalPages}
      </div>

      <div className="order-1 flex items-center gap-1 sm:order-2">
        {hasPrev ? (
          <Link
            href={createPageUrl(page - 1)}
            className="border border-white/20 bg-surface px-4 py-2 text-sm transition-colors hover:bg-surface-light sm:px-3 sm:py-1.5"
          >
            Prev
          </Link>
        ) : (
          <span className="cursor-not-allowed border border-white/10 bg-surface px-4 py-2 text-sm text-muted sm:px-3 sm:py-1.5">
            Prev
          </span>
        )}

        {/* Hide page numbers on mobile, show only prev/next */}
        <div className="hidden items-center gap-1 sm:flex">
          {pageNumbers.map((num) => {
            if (num === "ellipsis") {
              return (
                <span
                  key={`ellipsis-before-${pageNumbers.indexOf(num)}`}
                  className="px-2 text-muted"
                >
                  ...
                </span>
              );
            }
            return (
              <Link
                key={num}
                href={createPageUrl(num)}
                className={`border px-3 py-1.5 text-sm transition-colors ${
                  num === page
                    ? "border-accent bg-accent/20 text-accent"
                    : "border-white/20 bg-surface hover:bg-surface-light"
                }`}
              >
                {num}
              </Link>
            );
          })}
        </div>

        {/* Mobile: show current page indicator */}
        <span className="px-3 text-sm text-muted sm:hidden">
          {page}/{totalPages}
        </span>

        {hasNext ? (
          <Link
            href={createPageUrl(page + 1)}
            className="border border-white/20 bg-surface px-4 py-2 text-sm transition-colors hover:bg-surface-light sm:px-3 sm:py-1.5"
          >
            Next
          </Link>
        ) : (
          <span className="cursor-not-allowed border border-white/10 bg-surface px-4 py-2 text-sm text-muted sm:px-3 sm:py-1.5">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
