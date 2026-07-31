"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createBranchUser } from "./actions";
import { Field } from "@/components/ui/field";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };

type Branch = { id: string; name: string };

export function CreateBranchUserForm({ branches }: { branches: Branch[] }) {
  const [state, action, pending] = useActionState(createBranchUser, initial);
  const [role, setRole] = useState("student");
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setRole("student");
    }
  }, [state.ok]);

  if (branches.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Henüz yönettiğiniz bir şube yok. Kurum yöneticinizle görüşün.
      </p>
    );
  }

  const selectClass = "input";

  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <label className="label">
        Rol
        <select
          name="role"
          required
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={selectClass}
        >
          <option value="student">Öğrenci</option>
          <option value="teacher">Öğretmen</option>
          <option value="staff">Personel (diğer)</option>
        </select>
      </label>

      <label className="label">
        Şube
        <select name="branchId" required defaultValue={branches.length === 1 ? branches[0].id : ""} className={selectClass}>
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
      {role === "staff" ? (
        <p className="text-xs text-muted">
          Personel giriş yapmaz; kullanıcı adı/şifre gerekmez. Yalnızca kayıt ve
          maaş takibi için tutulur.
        </p>
      ) : (
        <>
          <Field label="E-posta (isteğe bağlı)" name="email" type="email" />
          {role === "student" ? (
            <>
              <Field label="Veli adı soyadı" name="guardianName" />
              <Field label="Veli telefonu" name="guardianPhone" type="tel" placeholder="05xx xxx xx xx" />
            </>
          ) : null}
          <p className="text-xs text-muted">
            {role === "student" ? "Öğrenci" : "Öğretmen"} giriş yapmaz; kullanıcı
            adı/şifre gerekmez.
          </p>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" name="notifyConsent" defaultChecked className="mt-0.5 h-4 w-4 accent-primary" />
            <span className="text-muted">İletişim/bildirim onayı var (KVKK).</span>
          </label>
        </>
      )}

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-green-600 dark:text-green-400">
          Kullanıcı oluşturuldu.
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-primary mt-1">
        {pending ? "Oluşturuluyor..." : "Kullanıcı oluştur"}
      </button>
    </form>
  );
}
