import Link from "next/link";
import { weekdayLabel } from "@/lib/roles";
import type { MakeupPoolRow } from "@/lib/makeup";

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
        <h2 className="section-title">Telafi Havuzu</h2>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-sm font-medium text-muted">
          {pool.length}
        </span>
      </div>
      {pool.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2">
          {pool.map((r) => (
            <div key={r.id} className="rounded-lg bg-accent px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/kisi/${r.id}`} className="font-medium hover:underline">
                    {r.name}
                  </Link>
                  <div className="text-xs text-muted">
                    {r.credits} telafi hakkı
                    {r.teacherName ? ` · ${r.teacherName}` : ""}
                  </div>
                </div>
                {r.teacherId ? (
                  <Link
                    href={`/takvim?g=gun&t=${r.teacherId}&mk=${r.id}`}
                    className="chip shrink-0"
                  >
                    Telafi planla →
                  </Link>
                ) : (
                  <span className="shrink-0 text-xs text-danger">
                    Öğretmen atanmalı
                  </span>
                )}
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
        <p className="mt-3 text-sm text-muted">Telafi bekleyen öğrenci yok.</p>
      )}
    </div>
  );
}
