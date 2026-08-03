"use client";

import { useActionState } from "react";
import { changeStudentTeacher } from "@/lib/teacher-change-actions";

const initial = { error: null as string | null, ok: false };

export function ChangeTeacherForm({
  studentId,
  currentTeacherId,
  teachers,
}: {
  studentId: string;
  currentTeacherId: string | null;
  teachers: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(changeStudentTeacher, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="studentId" value={studentId} />
      <label className="label">
        Öğretmen
        <select
          name="teacherId"
          defaultValue={currentTeacherId ?? ""}
          className="input"
        >
          <option value="">Atanmadı</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "..." : "Kaydet"}
      </button>
      {state.error ? (
        <p className="w-full text-sm text-danger">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="w-full text-sm text-emerald-600 dark:text-emerald-400">
          Öğretmen güncellendi. Yaklaşan dersler yeni öğretmene taşındı.
        </p>
      ) : null}
    </form>
  );
}
