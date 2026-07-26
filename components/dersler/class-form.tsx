"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createClass } from "@/lib/class-actions";
import { Field } from "@/components/ui/field";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };

type Branch = { id: string; name: string };
type Subject = { id: string; name: string };
type Teacher = { id: string; name: string; branchIds: string[] };

const labelClass = "label";
const selectClass = "input";

export function ClassForm({
  branches,
  subjects,
  teachers,
}: {
  branches: Branch[];
  subjects: Subject[];
  teachers: Teacher[];
}) {
  const [state, action, pending] = useActionState(createClass, initial);
  const ref = useRef<HTMLFormElement>(null);
  const [branchId, setBranchId] = useState(branches.length === 1 ? branches[0].id : "");
  const [type, setType] = useState("one_on_one");

  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setBranchId(branches.length === 1 ? branches[0].id : "");
      setType("one_on_one");
    }
  }, [state.ok, branches]);

  if (branches.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Önce bir şube oluşturun.
      </p>
    );
  }
  if (subjects.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Önce bir branş ekleyin.
      </p>
    );
  }

  const branchTeachers = teachers.filter((t) => t.branchIds.includes(branchId));

  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <label className={labelClass}>
        Şube
        <select
          name="branchId"
          required
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className={selectClass}
        >
          <option value="" disabled>
            Şube seçin
          </option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        Branş
        <select name="subjectId" required defaultValue="" className={selectClass}>
          <option value="" disabled>
            Branş seçin
          </option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        Ders tipi
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={selectClass}
        >
          <option value="one_on_one">Birebir</option>
          <option value="group">Grup</option>
        </select>
      </label>

      {type === "group" ? (
        <Field label="Kontenjan" name="capacity" type="number" defaultValue="5" />
      ) : null}

      <label className={labelClass}>
        Öğretmen (isteğe bağlı)
        <select key={branchId} name="teacherId" defaultValue="" className={selectClass}>
          <option value="">Atanmadı</option>
          {branchTeachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <Field label="Ders adı" name="name" required />

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-green-600 dark:text-green-400">
          Ders oluşturuldu.
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-primary mt-1">
        {pending ? "Oluşturuluyor..." : "Ders oluştur"}
      </button>
    </form>
  );
}
