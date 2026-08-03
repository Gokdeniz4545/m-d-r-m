"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { planLesson } from "@/lib/schedule-actions";
import { weekdayLabel } from "@/lib/roles";

type Sess = {
  id: string;
  start_time: string;
  end_time: string;
  is_makeup: boolean;
  studentName: string;
};
type Student = { id: string; name: string };

// 09:00–21:00, 15 dk adım → başlangıç satırları 09:00..20:45
const SLOTS: string[] = [];
for (let m = 9 * 60; m < 21 * 60; m += 15)
  SLOTS.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);

const hhmm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

const initial = { error: null as string | null, ok: false };

export function DayGrid({
  date,
  weekday,
  teacherId,
  students,
  sessions,
  canMark,
}: {
  date: string;
  weekday: number;
  teacherId: string;
  students: Student[];
  sessions: Sess[];
  canMark: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [state, action, pending] = useActionState(planLesson, initial);

  // Blok başlangıçları + kapladıkları (3×15 dk) devam satırları
  const startAt = new Map<string, Sess>();
  const covered = new Set<string>();
  for (const s of sessions) {
    const st = s.start_time.slice(0, 5);
    startAt.set(st, s);
    const [h, m] = st.split(":").map(Number);
    const base = h * 60 + m;
    covered.add(hhmm(base + 15));
    covered.add(hhmm(base + 30));
  }

  return (
    <div className="card p-3">
      <table className="w-full border-collapse">
        <tbody>
          {SLOTS.map((t) => {
            const isCovered = covered.has(t);
            const sess = startAt.get(t);
            return (
              <tr key={t}>
                <td className="tabular w-14 py-0.5 pr-2 text-right align-top text-[11px] text-muted">
                  {t}
                </td>
                {isCovered ? null : sess ? (
                  <td rowSpan={3} className="p-0.5">
                    {canMark ? (
                      <Link
                        href={`/oturum/${sess.id}`}
                        className="block h-full rounded-lg bg-primary/15 px-3 py-2 transition hover:bg-primary/25"
                      >
                        <div className="font-medium">{sess.studentName || "Öğrenci"}</div>
                        <div className="text-xs text-muted">
                          {sess.start_time.slice(0, 5)}–{sess.end_time.slice(0, 5)}
                          {sess.is_makeup ? " · Telafi" : ""} · Yoklama →
                        </div>
                      </Link>
                    ) : (
                      <div className="h-full rounded-lg bg-primary/15 px-3 py-2">
                        <div className="font-medium">{sess.studentName || "Öğrenci"}</div>
                        <div className="text-xs text-muted">
                          {sess.start_time.slice(0, 5)}–{sess.end_time.slice(0, 5)}
                          {sess.is_makeup ? " · Telafi" : ""}
                        </div>
                      </div>
                    )}
                  </td>
                ) : (
                  <td className="p-0.5">
                    {canMark ? (
                      <button
                        type="button"
                        onClick={() => setSelected(t)}
                        className={
                          "h-5 w-full rounded border border-dashed text-[11px] leading-none transition " +
                          (selected === t
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-transparent text-transparent hover:border-primary/40 hover:text-primary/60")
                        }
                      >
                        {selected === t ? "seçildi" : "+"}
                      </button>
                    ) : (
                      <div className="h-5" />
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {selected && canMark ? (
        <form
          action={action}
          className="mt-4 flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3"
        >
          <div className="text-sm font-medium">
            {date} · {selected} — ders planla (45 dk)
          </div>
          <input type="hidden" name="teacherId" value={teacherId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="weekday" value={weekday} />
          <input type="hidden" name="start_time" value={selected} />
          <label className="label">
            Öğrenci
            <select name="studentId" required className="input">
              <option value="">Seç</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="mode" value="weekly" defaultChecked className="accent-primary" />
              Her hafta ({weekdayLabel(weekday)})
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="mode" value="oneoff" className="accent-primary" />
              Sadece bu gün
            </label>
          </div>
          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
          {state.ok ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Eklendi. Görmek için sayfayı yenile.
            </p>
          ) : null}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "..." : "Planla"}
            </button>
            <button type="button" onClick={() => setSelected(null)} className="btn-ghost">
              İptal
            </button>
          </div>
        </form>
      ) : null}

      {students.length === 0 ? (
        <p className="mt-3 text-xs text-muted">
          Bu öğretmene bağlı öğrenci yok; planlamak için önce öğrenci ata.
        </p>
      ) : null}
    </div>
  );
}
