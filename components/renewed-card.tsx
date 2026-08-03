import Link from "next/link";
import type { RenewedRow } from "@/lib/makeup";

function fmtRenewed(iso: string) {
  const d = new Date(iso);
  const wd = ((d.getDay() + 6) % 7) + 1;
  const days = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  const dd = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
  return `${days[wd - 1]} ${dd}`;
}

export function RenewedCard({ rows }: { rows: RenewedRow[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Aboneliği bu hafta yenilenen öğrenciler</h2>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-sm font-medium text-muted">
          {rows.length}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        Ders hakkı bitip bu hafta aboneliği yenilenen öğrenciler.
      </p>
      {rows.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent px-3 py-2"
            >
              <div className="min-w-0">
                <Link href={`/kisi/${r.id}`} className="font-medium hover:underline">
                  {r.name}
                </Link>
                {r.teacherName ? (
                  <div className="text-xs text-muted">{r.teacherName}</div>
                ) : null}
              </div>
              <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Yenilendi · {fmtRenewed(r.renewedAt)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Bu hafta yenilenen öğrenci yok.</p>
      )}
    </div>
  );
}
