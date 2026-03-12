import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationBarProps {
  page: number;
  totalPages: number;
  basePath: string;
  query: Record<string, string | undefined>;
}

function buildHref(
  basePath: string,
  query: Record<string, string | undefined>,
  page: number
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value);
    }
  }

  params.set("page", String(page));

  return `${basePath}?${params.toString()}`;
}

export function PaginationBar({
  page,
  totalPages,
  basePath,
  query,
}: PaginationBarProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
    Math.max(0, page - 3),
    Math.max(5, Math.min(totalPages, page + 2))
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-6 py-5">
      <p className="text-sm text-slate-500">
        Trang <span className="font-semibold text-slate-900">{page}</span> /{" "}
        <span className="font-semibold text-slate-900">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        {page <= 1 ? (
          <span className={cn(buttonVariants("outline", "sm"), "pointer-events-none opacity-50")}>
            Trước
          </span>
        ) : (
          <Link className={buttonVariants("outline", "sm")} href={buildHref(basePath, query, page - 1)}>
            Trước
          </Link>
        )}
        {pages.map((value) => (
          value === page ? (
            <span
              key={value}
              className={buttonVariants("default", "sm")}
            >
              {value}
            </span>
          ) : (
            <Link
              key={value}
              className={buttonVariants("outline", "sm")}
              href={buildHref(basePath, query, value)}
            >
              {value}
            </Link>
          )
        ))}
        {page >= totalPages ? (
          <span className={cn(buttonVariants("outline", "sm"), "pointer-events-none opacity-50")}>
            Sau
          </span>
        ) : (
          <Link className={buttonVariants("outline", "sm")} href={buildHref(basePath, query, page + 1)}>
            Sau
          </Link>
        )}
      </div>
    </div>
  );
}
