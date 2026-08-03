import Link from "next/link";
import { AutoRenewToggle } from "@/components/renewal-controls";
import type { ExpiringRow } from "@/lib/renewal";

export function ExpiringCard({ rows }: { rows: ExpiringRow[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Ders hakkı bitmek üzere</h2>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-sm font-medium text-muted">
          {rows.length}
        </span>
      </div>
      {rows.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-accent px-3 py-2"
            >
              <div className="min-w-0">
                <Link href={`/kisi/${r.id}`} className="font-medium hover:underline">
                  {r.name}
                </Link>
                <div className="text-xs text-muted">
                  {r.remaining <= 0 ? "hakkı bitti" : `${r.remaining} ders kaldı`}
                </div>
              </div>
              <AutoRenewToggle studentId={r.id} on={r.autoRenew} />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Hakkı bitmek üzere öğrenci yok.</p>
      )}
    </div>
  );
}
