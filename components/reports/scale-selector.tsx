import Link from "next/link";
import type { Scale } from "@/lib/report-buckets";

const OPTS: { key: Scale; label: string }[] = [
  { key: "gun", label: "Gün" },
  { key: "hafta", label: "Hafta" },
  { key: "ay", label: "Ay" },
];

export function ScaleSelector({ current }: { current: Scale }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-accent p-0.5">
      {OPTS.map((o) => (
        <Link
          key={o.key}
          href={`/raporlar?olcek=${o.key}`}
          className={
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
            (current === o.key
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground")
          }
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
