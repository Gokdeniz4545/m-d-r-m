"use client";

import { useActionState, useEffect, useRef } from "react";
import { enrollStudent } from "@/lib/class-actions";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };

export function EnrollForm({
  classId,
  students,
}: {
  classId: string;
  students: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(enrollStudent, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  if (students.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Bu şubede kaydedilebilecek başka öğrenci yok.
      </p>
    );
  }

  return (
    <div>
      <form ref={ref} action={action} className="flex items-end gap-2">
        <input type="hidden" name="classId" value={classId} />
        <label className="label flex-1">
          Öğrenci ekle
          <select name="studentId" required defaultValue="" className="input">

            <option value="" disabled>
              Öğrenci seçin
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "..." : "Kaydet"}
        </button>
      </form>
      {state.error ? (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
    </div>
  );
}
