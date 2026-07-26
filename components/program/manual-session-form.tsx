"use client";

import { useActionState, useEffect, useRef } from "react";
import { addManualSession } from "@/lib/schedule-actions";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };

export function ManualSessionForm({ classId }: { classId: string }) {
  const [state, action, pending] = useActionState(addManualSession, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="classId" value={classId} />
      <label className="label">
        Tarih
        <input type="date" name="date" required className="input" />
      </label>
      <label className="label">
        Başlangıç
        <input type="time" name="start_time" required defaultValue="15:00" className="input" />
      </label>
      <label className="label">
        Bitiş
        <input type="time" name="end_time" required defaultValue="16:00" className="input" />
      </label>
      <label className="flex items-center gap-2 pb-2.5 text-sm text-foreground">
        <input type="checkbox" name="is_makeup" className="h-4 w-4" />
        Telafi
      </label>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "..." : "Ders ekle"}
      </button>
      {state.error ? (
        <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
    </form>
  );
}
