"use client";

import { useActionState, useEffect, useRef } from "react";
import { addSlot } from "@/lib/schedule-actions";
import { WEEKDAYS } from "@/lib/roles";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };

export function SlotForm({ classId }: { classId: string }) {
  const [state, action, pending] = useActionState(addSlot, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="classId" value={classId} />
      <label className="label">
        Gün
        <select name="weekday" required defaultValue="1" className="input">
          {WEEKDAYS.map((d, i) => (
            <option key={i} value={i + 1}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <label className="label">
        Başlangıç
        <input type="time" name="start_time" required defaultValue="15:00" className="input" />
      </label>
      <label className="label">
        Bitiş
        <input type="time" name="end_time" required defaultValue="16:00" className="input" />
      </label>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "..." : "Slot ekle"}
      </button>
      {state.error ? (
        <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
    </form>
  );
}
