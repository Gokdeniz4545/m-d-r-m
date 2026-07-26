"use client";

import { useState } from "react";
import { updateSlot } from "@/lib/schedule-actions";
import { WEEKDAYS } from "@/lib/roles";

export function EditSlotForm({
  classId,
  slotId,
  weekday,
  startTime,
  endTime,
}: {
  classId: string;
  slotId: string;
  weekday: number;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}) {
  const [wd, setWd] = useState(String(weekday));
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime);
  const [informed, setInformed] = useState(false);

  const dirty = wd !== String(weekday) || start !== startTime || end !== endTime;

  return (
    <form action={updateSlot} className="flex flex-1 flex-wrap items-end gap-2">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="slotId" value={slotId} />
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

      <button
        type="submit"
        disabled={!dirty || !informed}
        className="btn-primary"
      >
        Kaydet
      </button>
    </form>
  );
}
