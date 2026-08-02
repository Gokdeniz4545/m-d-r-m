"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { quickAddUser } from "@/lib/people-actions";
import { Field } from "@/components/ui/field";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };
type Branch = { id: string; name: string };

export function QuickAddUserForm({
  role,
  branches,
}: {
  role: "student" | "teacher";
  branches: Branch[];
}) {
  const [state, action, pending] = useActionState(quickAddUser, initial);
  const [compType, setCompType] = useState<"per_session" | "monthly">(
    "per_session",
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  if (branches.length === 0) {
    return (
      <p className="text-sm text-muted">
        Önce bir şube oluşturulmalı.
      </p>
    );
  }

  const label = role === "student" ? "Öğrenci" : "Öğretmen";

  return (
    <form ref={ref} action={action} className="card flex max-w-md flex-col gap-3 p-5">
      <input type="hidden" name="role" value={role} />
      <label className="label">
        Şube
        <select
          name="branchId"
          required
          defaultValue={branches.length === 1 ? branches[0].id : ""}
          className="input"
        >
          {branches.length > 1 ? (
            <option value="" disabled>
              Şube seçin
            </option>
          ) : null}
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <Field label="Ad soyad" name="fullName" required />
      <Field label="Telefon" name="phone" type="tel" placeholder="05xx xxx xx xx" />
      <Field label="E-posta (isteğe bağlı)" name="email" type="email" />
      {role === "student" ? (
        <>
          <Field label="Veli adı soyadı" name="guardianName" />
          <Field label="Veli telefonu" name="guardianPhone" type="tel" placeholder="05xx xxx xx xx" />
        </>
      ) : null}
      <p className="text-xs text-muted">
        {label} giriş yapmaz; kullanıcı adı/şifre gerekmez.
      </p>
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" name="notifyConsent" defaultChecked className="mt-0.5 h-4 w-4 accent-primary" />
        <span className="text-muted">İletişim/bildirim onayı var (KVKK).</span>
      </label>

      {role === "teacher" ? (
        <>
          <div className="label">
            Maaş / hakediş tipi
            <div className="flex gap-2">
              {(["per_session", "monthly"] as const).map((t) => (
                <label
                  key={t}
                  className={
                    "flex flex-1 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition " +
                    (compType === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted hover:bg-accent")
                  }
                >
                  <input
                    type="radio"
                    name="comp_type"
                    value={t}
                    checked={compType === t}
                    onChange={() => setCompType(t)}
                    className="sr-only"
                  />
                  {t === "per_session" ? "Ders başı" : "Aylık"}
                </label>
              ))}
            </div>
          </div>
          <Field
            label={compType === "per_session" ? "Ders başı ücret (₺)" : "Aylık ücret (₺)"}
            name="rate"
            type="number"
          />
        </>
      ) : null}

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-green-600 dark:text-green-400">
          {label} eklendi.
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Ekleniyor..." : `${label} ekle`}
      </button>
    </form>
  );
}
