"use client";

import { useActionState, useEffect, useRef } from "react";
import { createOrgWithAdmin } from "./actions";
import { Field } from "@/components/ui/field";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };

export function CreateOrgForm() {
  const [state, action, pending] = useActionState(createOrgWithAdmin, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <Field label="Kurum adı" name="orgName" required />
      <Field label="Yetkili adı soyadı" name="fullName" required />
      <Field label="Kullanıcı adı" name="username" required autoComplete="off" />
      <Field
        label="Şifre"
        name="password"
        type="password"
        required
        autoComplete="new-password"
      />

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-green-600 dark:text-green-400">
          Kurum ve yöneticisi oluşturuldu.
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-primary mt-1">
        {pending ? "Oluşturuluyor..." : "Kurum + yönetici oluştur"}
      </button>
    </form>
  );
}
