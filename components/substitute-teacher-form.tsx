"use client";

import { substituteSession } from "@/lib/teacher-change-actions";

// Tek-derslik vekil öğretmen (sadece bu oturum). Öğrencinin asıl öğretmeni değişmez.
export function SubstituteTeacherForm({
  sessionId,
  currentTeacherId,
  teachers,
}: {
  sessionId: string;
  currentTeacherId: string | null;
  teachers: { id: string; name: string }[];
}) {
  return (
    <form action={substituteSession} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="sessionId" value={sessionId} />
      <label className="label">
        Bu ders için öğretmen (vekil)
        <select
          name="teacherId"
          defaultValue={currentTeacherId ?? ""}
          required
          className="input"
        >
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn-ghost">
        Vekil ata
      </button>
    </form>
  );
}
