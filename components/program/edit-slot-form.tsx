"use client";

import { useEffect, useState, useTransition } from "react";
import { updateSlot } from "@/lib/schedule-actions";
import { WEEKDAYS } from "@/lib/roles";
import { getTeacherWeeklyBusy, type BusySlot } from "@/lib/teacher-availability";
import { BookingGrid } from "@/components/booking-grid";

function addHour(h: string): string {
  const [hh, mm] = h.split(":").map(Number);
  return `${String((hh + 1) % 24).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function EditSlotForm({
  classId,
  slotId,
  weekday,
  startTime,
  endTime,
  teacherId,
}: {
  classId: string;
  slotId: string;
  weekday: number;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  teacherId?: string | null;
}) {
  const [wd, setWd] = useState(String(weekday));
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime);
  const [informed, setInformed] = useState(false);
  const [busy, setBusy] = useState<BusySlot[]>([]);
  const [loading, startBusy] = useTransition();

  // Öğretmenin dolu saatleri (öğrencinin kendi mevcut saati hariç → seçilebilir)
  useEffect(() => {
    if (!teacherId) return;
    startBusy(async () => {
      const all = await getTeacherWeeklyBusy(teacherId);
      setBusy(
        all.filter(
          (b) =>
            !(b.weekday === weekday && b.start === startTime && b.end === endTime),
        ),
      );
    });
  }, [teacherId, weekday, startTime, endTime]);

  const dirty = wd !== String(weekday) || start !== startTime || end !== endTime;

  const selectSlot = (w: number, h: string) => {
    setWd(String(w));
    setStart(h);
    setEnd(addHour(h));
  };

  return (
    <form action={updateSlot} className="flex flex-1 flex-wrap items-end gap-2">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="slotId" value={slotId} />

      {teacherId ? (
        <div className="w-full rounded-lg border border-border p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Öğretmen takvimi — boş saat seç
          </div>
          <BookingGrid
            busy={busy}
            weekday={parseInt(wd, 10)}
            start={start}
            onSelect={selectSlot}
            loading={loading}
          />
        </div>
      ) : null}

      <label className="label">
        Gün
        <select
          name="weekday"
          value={wd}
          onChange={(e) => setWd(e.target.value)}
          className="input"
        >
          {WEEKDAYS.map((d, i) => (
            <option key={i} value={i + 1}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <label className="label">
        Başlangıç
        <input
          type="time"
          name="start_time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="input"
        />
      </label>
      <label className="label">
        Bitiş
        <input
          type="time"
          name="end_time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="input"
        />
      </label>

      {dirty ? (
        <label className="flex w-full items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="informed"
            checked={informed}
            onChange={(e) => setInformed(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Öğrenci bilgilendirildi
        </label>
      ) : null}

      <button type="submit" disabled={!dirty || !informed} className="btn-primary">
        Kaydet
      </button>
    </form>
  );
}
