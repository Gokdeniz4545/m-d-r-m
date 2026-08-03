"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  planLesson,
  updateLesson,
  moveSession,
  deleteLesson,
  deleteSession,
} from "@/lib/schedule-actions";
import { addCalendarEvent, deleteCalendarEvent } from "@/lib/event-actions";
import { weekdayLabel, WEEKDAYS } from "@/lib/roles";

type Sess = {
  id: string;
  slot_id: string | null;
  start_time: string;
  end_time: string;
  is_makeup: boolean;
  studentName: string;
};
type Ev = { id: string; start_time: string; end_time: string; description: string | null };
type Student = { id: string; name: string };

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

const initial = { error: null as string | null, ok: false };

export function DayGrid({
  date,
  weekday,
  teacherId,
  students,
  sessions,
  events,
  canMark,
  makeupStudentId = null,
  makeupStudentName = null,
}: {
  date: string;
  weekday: number;
  teacherId: string;
  students: Student[];
  sessions: Sess[];
  events: Ev[];
  canMark: boolean;
  makeupStudentId?: string | null;
  makeupStudentName?: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [showEvent, setShowEvent] = useState(false);
  const [planState, planAction, planPending] = useActionState(planLesson, initial);
  const [evState, evAction, evPending] = useActionState(addCalendarEvent, initial);

  const covered = new Set<string>();
  const sessStart = new Map<string, { s: Sess; span: number }>();
  for (const s of sessions) {
    const st = s.start_time.slice(0, 5);
    const sl = spanSlots(st, s.end_time.slice(0, 5));
    sessStart.set(st, { s, span: sl.length });
    sl.slice(1).forEach((t) => covered.add(t));
  }
  const evStart = new Map<string, { e: Ev; span: number }>();
  for (const e of events) {
    const st = e.start_time.slice(0, 5);
    const sl = spanSlots(st, e.end_time.slice(0, 5));
    evStart.set(st, { e, span: sl.length });
    sl.slice(1).forEach((t) => covered.add(t));
  }

  return (
    <div className="card p-3">
      <table className="w-full border-collapse">
        <tbody>
          {SLOTS.map((t) => {
            if (covered.has(t)) {
              return (
                <tr key={t}>
                  <td className="tabular w-14 py-0.5 pr-2 text-right align-top text-[11px] text-muted">
                    {t}
                  </td>
                </tr>
              );
            }
            const sc = sessStart.get(t);
            const ec = evStart.get(t);
            return (
              <tr key={t}>
                <td className="tabular w-14 py-0.5 pr-2 text-right align-top text-[11px] text-muted">
                  {t}
                </td>
                {sc ? (
                  <td rowSpan={sc.span} className="p-0.5">
                    <div className="rounded-lg bg-primary/15 px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium">{sc.s.studentName || "Öğrenci"}</div>
                          <div className="text-xs text-muted">
                            {sc.s.start_time.slice(0, 5)}–{sc.s.end_time.slice(0, 5)}
                            {sc.s.is_makeup ? " · Telafi" : ""}
                          </div>
                        </div>
                        {canMark ? (
                          <button
                            type="button"
                            onClick={() => setEditId(editId === sc.s.id ? null : sc.s.id)}
                            className="shrink-0 text-xs font-medium text-primary hover:underline"
                          >
                            düzenle
                          </button>
                        ) : null}
                      </div>
                      {canMark ? (
                        <Link
                          href={`/oturum/${sc.s.id}`}
                          className="mt-0.5 inline-block text-xs font-medium text-primary hover:underline"
                        >
                          Yoklama →
                        </Link>
                      ) : null}
                      {canMark && editId === sc.s.id ? (
                        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2 text-xs">
                          {sc.s.slot_id ? (
                            <form action={updateLesson} className="flex flex-wrap items-end gap-1.5">
                              <input type="hidden" name="slotId" value={sc.s.slot_id} />
                              <select name="weekday" defaultValue={weekday} className="input h-8 py-0 text-xs">
                                {WEEKDAYS.map((d, i) => (
                                  <option key={i} value={i + 1}>{d}</option>
                                ))}
                              </select>
                              <input type="time" name="start_time" defaultValue={sc.s.start_time.slice(0, 5)} className="input h-8 w-24 py-0 text-xs" />
                              <button className="btn-ghost h-8 py-0 text-xs">Rutin taşı</button>
                            </form>
                          ) : null}
                          <form action={moveSession} className="flex flex-wrap items-end gap-1.5">
                            <input type="hidden" name="sessionId" value={sc.s.id} />
                            <input type="date" name="date" defaultValue={date} className="input h-8 py-0 text-xs" />
                            <input type="time" name="start_time" defaultValue={sc.s.start_time.slice(0, 5)} className="input h-8 w-24 py-0 text-xs" />
                            <button className="btn-ghost h-8 py-0 text-xs">Bu haftayı taşı</button>
                          </form>
                          <div className="flex gap-3">
                            {sc.s.slot_id ? (
                              <form action={deleteLesson}>
                                <input type="hidden" name="slotId" value={sc.s.slot_id} />
                                <button className="font-medium text-danger hover:underline">Dersi sil (haftalık)</button>
                              </form>
                            ) : null}
                            <form action={deleteSession}>
                              <input type="hidden" name="sessionId" value={sc.s.id} />
                              <button className="font-medium text-danger hover:underline">Bu oturumu sil</button>
                            </form>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </td>
                ) : ec ? (
                  <td rowSpan={ec.span} className="p-0.5">
                    <div className="rounded-lg bg-amber-500/15 px-3 py-2">
                      <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        {ec.e.start_time.slice(0, 5)}–{ec.e.end_time.slice(0, 5)} · Etkinlik
                      </div>
                      <div className="text-sm">{ec.e.description || "—"}</div>
                      {canMark ? (
                        <form action={deleteCalendarEvent} className="mt-0.5">
                          <input type="hidden" name="id" value={ec.e.id} />
                          <button className="text-xs font-medium text-danger hover:underline">sil</button>
                        </form>
                      ) : null}
                    </div>
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
          action={planAction}
          className="mt-4 flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3"
        >
          <div className="text-sm font-medium">
            {makeupStudentId ? `Telafi dersi: ${makeupStudentName ?? ""}` : "Ders planla"} — {date} · {selected} (45 dk)
          </div>
          <input type="hidden" name="teacherId" value={teacherId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="weekday" value={weekday} />
          <input type="hidden" name="start_time" value={selected} />
          {makeupStudentId ? (
            <>
              <input type="hidden" name="studentId" value={makeupStudentId} />
              <input type="hidden" name="mode" value="oneoff" />
              <input type="hidden" name="is_makeup" value="on" />
            </>
          ) : (
            <>
              <label className="label">
                Öğrenci
                <select name="studentId" required className="input">
                  <option value="">Seç</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
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
            </>
          )}
          {planState.error ? <p className="text-sm text-danger">{planState.error}</p> : null}
          {planState.ok ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Eklendi. Görmek için sayfayı yenile.</p>
          ) : null}
          <div className="flex gap-2">
            <button type="submit" disabled={planPending} className="btn-primary">
              {planPending ? "..." : "Planla"}
            </button>
            <button type="button" onClick={() => setSelected(null)} className="btn-ghost">İptal</button>
          </div>
        </form>
      ) : null}

      {canMark ? (
        <div className="mt-3">
          <button type="button" onClick={() => setShowEvent((v) => !v)} className="btn-ghost text-sm">
            {showEvent ? "− Özel etkinlik" : "+ Özel etkinlik"}
          </button>
          {showEvent ? (
            <form action={evAction} className="mt-2 flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <input type="hidden" name="teacherId" value={teacherId} />
              <input type="hidden" name="date" value={date} />
              <div className="flex flex-wrap gap-2">
                <label className="label">Başlangıç
                  <input type="time" name="start_time" required className="input" />
                </label>
                <label className="label">Bitiş
                  <input type="time" name="end_time" required className="input" />
                </label>
              </div>
              <label className="label">Açıklama
                <input name="description" className="input" placeholder="İzin, toplantı, etkinlik…" />
              </label>
              {evState.error ? <p className="text-sm text-danger">{evState.error}</p> : null}
              {evState.ok ? <p className="text-sm text-emerald-600 dark:text-emerald-400">Eklendi. Yenile.</p> : null}
              <button type="submit" disabled={evPending} className="btn-primary self-start">
                {evPending ? "..." : "Etkinlik ekle"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {students.length === 0 && !makeupStudentId ? (
        <p className="mt-3 text-xs text-muted">
          Bu öğretmene bağlı öğrenci yok; planlamak için önce öğrenci ata.
        </p>
      ) : null}
    </div>
  );
}
