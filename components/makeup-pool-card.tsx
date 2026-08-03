import Link from "next/link";
import { weekdayLabel } from "@/lib/roles";
import type { MakeupPoolRow } from "@/lib/makeup";
import { AutoRenewToggle } from "@/components/renewal-controls";

function fmtMiss(date: string, start: string) {
  const d = new Date(date + "T00:00:00");
  const wd = ((d.getDay() + 6) % 7) + 1;
  const dd = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
  return `${weekdayLabel(wd)} ${dd} ${start.slice(0, 5)}`;
}

export function MakeupPoolCard({ pool }: { pool: MakeupPoolRow[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Aboneliği bitmek üzere olanlar</h2>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-sm font-medium text-muted">
          {pool.length}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        Son 1 ders hakkı kalan veya izinli olup telafi bekleyen öğrenciler.
      </p>
      {pool.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2">
          {pool.map((r) => (
            <div key={r.id} className="rounded-lg bg-accent px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/kisi/${r.id}`} className="font-medium hover:underline">
                    {r.name}
                  </Link>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    {r.lowQuota ? (
                      <span className="rounded-md bg-danger/15 px-2 py-0.5 font-medium text-danger">
                        1 ders hakkı kaldı
                      </span>
                    ) : null}
                    {r.teacherName ? <span>{r.teacherName}</span> : null}
                  </div>
                </div>
                <AutoRenewToggle studentId={r.id} on={r.autoRenew} />
              </div>
              {r.missed.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5 border-t border-border pt-1.5">
                  {r.missed.map((m, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300"
                    >
                      İzinli: {fmtMiss(m.date, m.start)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Şu an bekleyen öğrenci yok.</p>
      )}
    </div>
  );
}
