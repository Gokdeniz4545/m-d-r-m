"use client";

import { useActionState, useEffect, useRef } from "react";
import { createSubject } from "@/lib/class-actions";
import { Field } from "@/components/ui/field";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };

export function SubjectManager({
  subjects,
}: {
  subjects: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createSubject, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <div>
      {subjects.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {subjects.map((s) => (
            <span
              key={s.id}
              className="rounded-full border border-border bg-accent px-3 py-1 text-sm text-foreground"
            >
              {s.name}
            </span>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
          Henüz branş yok.
        </p>
      )}

      <form ref={ref} action={action} className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="Yeni branş" name="name" required />
        </div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "..." : "Ekle"}
        </button>
      </form>
      {state.error ? (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
    </div>
  );
}
