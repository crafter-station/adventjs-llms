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
    <div className="mt-6 flex items-center justify-between">
      <div className="text-sm text-muted">
        {total} {total === 1 ? "battle" : "battles"} · Page {page} of{" "}
        {totalPages}
      </div>

      <div className="flex items-center gap-1">
        {hasPrev ? (
          <Link
            href={createPageUrl(page - 1)}
            className="border border-white/20 bg-surface px-3 py-1.5 text-sm transition-colors hover:bg-surface-light"
          >
            Prev
          </Link>
        ) : (
          <span className="cursor-not-allowed border border-white/10 bg-surface px-3 py-1.5 text-sm text-muted">
            Prev
          </span>
        )}

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

        {hasNext ? (
          <Link
            href={createPageUrl(page + 1)}
            className="border border-white/20 bg-surface px-3 py-1.5 text-sm transition-colors hover:bg-surface-light"
          >
            Next
          </Link>
        ) : (
          <span className="cursor-not-allowed border border-white/10 bg-surface px-3 py-1.5 text-sm text-muted">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
