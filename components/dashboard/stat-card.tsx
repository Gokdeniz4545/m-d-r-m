import Link from "next/link";
import { Icon } from "@/components/icons";

export function StatCard({
  label,
  value,
  sublabel,
  href,
  icon,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  href?: string;
  icon?: string;
}) {
  const inner = (
    <div
      className={
        "card flex items-start gap-4 p-5 " +
        (href ? "transition hover:border-primary/40 hover:bg-accent" : "")
      }
    >
      {icon ? (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon name={icon} />
        </span>
      ) : null}
      <div className="min-w-0">
        <div className="text-sm text-muted">{label}</div>
        <div className="tabular mt-0.5 text-3xl font-bold tracking-tight">{value}</div>
        {sublabel ? <div className="mt-1 text-xs text-muted">{sublabel}</div> : null}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
