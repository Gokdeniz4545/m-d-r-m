import Link from "next/link";

export function ActionCard({
  title,
  description,
  href,
  soon,
}: {
  title: string;
  description?: string;
  href?: string;
  soon?: boolean;
}) {
  const clickable = !soon && !!href;
  const inner = (
    <div
      className={
        "card group flex h-full items-center gap-3 p-5 transition " +
        (clickable ? "hover:border-primary/40 hover:bg-accent" : "opacity-60")
      }
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{title}</span>
          {soon ? (
            <span className="chip">Yakında</span>
          ) : null}
        </div>
        {description ? (
          <div className="mt-0.5 text-sm text-muted">{description}</div>
        ) : null}
      </div>
      {clickable ? (
        <svg
          className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary"
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      ) : null}
    </div>
  );

  if (!clickable) return inner;
  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  );
}
