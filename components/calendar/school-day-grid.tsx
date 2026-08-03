import Link from "next/link";

type Sess = {
  id: string;
  start: string;
  end: string;
  is_makeup: boolean;
  studentName: string;
};
type Column = { teacherId: string; teacherName: string; sessions: Sess[] };

const SLOTS: string[] = [];
for (let m = 9 * 60; m < 21 * 60; m += 15)
  SLOTS.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);

const hhmm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const spanSlots = (start: string, end: string) => {
  const res: string[] = [];
  for (let x = toMin(start); x < toMin(end); x += 15) res.push(hhmm(x));
  return res.length > 0 ? res : [start];
};

// Okul günlük — öğretmen başına sütun (salt-okunur genel bakış).
export function SchoolDayGrid({ columns, canMark }: { columns: Column[]; canMark: boolean }) {
  if (columns.length === 0) {
    return (
      <div className="card p-4">
        <p className="text-sm text-muted">Bu gün ders yok.</p>
      </div>
    );
  }
  const cols = columns.map((c) => {
    const startAt = new Map<string, { s: Sess; span: number }>();
    const covered = new Set<string>();
    for (const s of c.sessions) {
      const st = s.start.slice(0, 5);
      const sl = spanSlots(st, s.end.slice(0, 5));
      startAt.set(st, { s, span: sl.length });
      sl.slice(1).forEach((t) => covered.add(t));
    }
    return { ...c, startAt, covered };
  });

  return (
    <div className="card overflow-x-auto p-3">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-12" />
            {cols.map((c) => (
              <th key={c.teacherId} className="px-2 py-1 text-left font-medium">
                {c.teacherName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SLOTS.map((t) => (
            <tr key={t}>
              <td className="tabular pr-2 text-right align-top text-[10px] text-muted">
                {t}
              </td>
              {cols.map((c) => {
                if (c.covered.has(t)) return null;
                const sc = c.startAt.get(t);
                if (sc) {
                  const block = (
                    <div className="min-w-[96px] rounded bg-primary/15 px-1.5 py-1">
                      <div className="truncate font-medium">
                        {sc.s.studentName || "Öğrenci"}
                      </div>
                      <div className="text-muted">
                        {sc.s.start.slice(0, 5)}
                        {sc.s.is_makeup ? " · T" : ""}
                      </div>
                    </div>
                  );
                  return (
                    <td key={c.teacherId} rowSpan={sc.span} className="p-0.5 align-top">
                      {canMark ? (
                        <Link href={`/oturum/${sc.s.id}`} className="block transition hover:opacity-80">
                          {block}
                        </Link>
                      ) : (
                        block
                      )}
                    </td>
                  );
                }
                return (
                  <td key={c.teacherId} className="p-0.5">
                    <div className="h-4 min-w-[96px]" />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
