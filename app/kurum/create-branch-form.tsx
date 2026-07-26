"use client";

import { useActionState, useEffect, useRef } from "react";
import { createBranch } from "./actions";
import { Field } from "@/components/ui/field";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };

export function CreateBranchForm() {
  const [state, action, pending] = useActionState(createBranch, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <Field label="Şube adı" name="name" required />
      <Field label="Adres (isteğe bağlı)" name="address" />
      <Field label="Telefon (isteğe bağlı)" name="phone" />

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-green-600 dark:text-green-400">Şube eklendi.</p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-primary mt-1">
        {pending ? "Ekleniyor..." : "Şube ekle"}
      </button>
    </form>
  );
}
