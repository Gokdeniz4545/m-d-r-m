"use client";

import { useActionState } from "react";
import { updatePersonContact } from "@/lib/people-actions";
import { Field } from "@/components/ui/field";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };

export function PersonContactForm({
  personId,
  person,
}: {
  personId: string;
  person: {
    phone: string | null;
    email: string | null;
    tc_kimlik_no: string | null;
    address: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
  };
}) {
  const [state, action, pending] = useActionState(updatePersonContact, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="personId" value={personId} />
      <Field
        label="TC kimlik no (11 hane)"
        name="tc_kimlik_no"
        inputMode="numeric"
        defaultValue={person.tc_kimlik_no ?? ""}
        placeholder="12345678901"
      />
      <Field
        label="Telefon"
        name="phone"
        type="tel"
        defaultValue={person.phone ?? ""}
        placeholder="05xx xxx xx xx"
      />
      <Field
        label="E-posta"
        name="email"
        type="email"
        defaultValue={person.email ?? ""}
      />
      <label className="label">
        Adres
        <textarea
          name="address"
          rows={2}
          defaultValue={person.address ?? ""}
          placeholder="Mahalle, cadde, no, ilçe/il"
          className="input"
        />
      </label>
      <Field
        label="Veli adı soyadı"
        name="guardian_name"
        defaultValue={person.guardian_name ?? ""}
      />
      <Field
        label="Veli telefonu"
        name="guardian_phone"
        type="tel"
        defaultValue={person.guardian_phone ?? ""}
        placeholder="05xx xxx xx xx"
      />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.ok ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Bilgiler güncellendi.
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn-primary self-start">
        {pending ? "…" : "Kaydet"}
      </button>
    </form>
  );
}
