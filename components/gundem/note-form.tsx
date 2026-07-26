"use client";

import { useActionState, useEffect, useRef } from "react";
import { addNote } from "@/lib/agenda-actions";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };

export function NoteForm() {
  const [state, action, pending] = useActionState(addNote, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="card flex flex-col gap-3 p-4">
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Bir not bırak..."
        className="input resize-none"
      />
      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      <button type="submit" disabled={pending} className="btn-primary self-end">
        {pending ? "..." : "Not ekle"}
      </button>
    </form>
  );
}
