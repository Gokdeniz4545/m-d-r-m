import type { ReactNode } from "react";

/**
 * Profil bölümü — başlığa tıklayınca açılan/kapanan kart.
 * Native <details> kullanır; JS gerektirmez.
 */
export function Section({
  title,
  count,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="card group mb-3 overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 font-semibold select-none hover:bg-accent/50 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 truncate">
          {title}
          {count !== undefined ? (
            <span className="ml-1.5 text-sm font-normal text-muted">({count})</span>
          ) : null}
          {hint ? (
            <span className="ml-2 text-sm font-normal text-muted">{hint}</span>
          ) : null}
        </span>
        <svg
          className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 7.5l5 5 5-5" />
        </svg>
      </summary>
      <div className="border-t border-border p-4">{children}</div>
    </details>
  );
}
