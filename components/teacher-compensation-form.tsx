"use client";

import { useActionState, useState } from "react";
import { setCompensation } from "@/lib/compensation-actions";
import { Field } from "@/components/ui/field";
import type { CompType, TeacherComp } from "@/lib/compensation";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };

export function TeacherCompensationForm({
  teacherId,
  comp,
}: {
  teacherId: string;
  comp: TeacherComp;
}) {
  const [state, action, pending] = useActionState(setCompensation, initial);
  const [type, setType] = useState<CompType>(comp?.comp_type ?? "per_session");

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="teacherId" value={teacherId} />

      <div className="label">
        Ücret tipi
        <div className="flex gap-2">
          {(["per_session", "monthly"] as CompType[]).map((t) => (
            <label
              key={t}
              className={
                "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition " +
                (type === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted hover:bg-accent")
              }
            >
              <input
                type="radio"
                name="comp_type"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                className="sr-only"
              />
              {t === "per_session" ? "Ders başı" : "Aylık"}
            </label>
          ))}
        </div>
      </div>

      <Field
        label={type === "per_session" ? "Ders başı ücret (₺)" : "Aylık ücret (₺)"}
        name="rate"
        type="number"
        defaultValue={comp ? String(comp.rate) : ""}
      />

      {state.error ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Kaydedildi.
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "..." : "Hakediş ayarını kaydet"}
      </button>
    </form>
  );
}
