"use client";

import { markAttendance } from "@/lib/attendance-actions";
import { ATTENDANCE_OPTIONS } from "@/lib/roles";

// Yoklama butonları. "İzinli" seçilince telafi hakkı 0 ise uyarı çıkar.
export function AttendanceButtons({
  sessionId,
  studentId,
  current,
  makeupCredits,
}: {
  sessionId: string;
  studentId: string;
  current: string | undefined;
  makeupCredits: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ATTENDANCE_OPTIONS.map((opt) => {
        const active = current === opt.value;
        return (
          <form action={markAttendance} key={opt.value}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="studentId" value={studentId} />
            <input type="hidden" name="status" value={opt.value} />
            <button
              type="submit"
              onClick={(e) => {
                if (
                  opt.value === "excused" &&
                  current !== "excused" &&
                  makeupCredits <= 0 &&
                  !window.confirm(
                    "Öğrencinin telafi ders hakkı kalmadı. Yine de izinli işaretlensin mi?",
                  )
                ) {
                  e.preventDefault();
                }
              }}
              className={
                active
                  ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  : "rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
              }
            >
              {opt.label}
            </button>
          </form>
        );
      })}
    </div>
  );
}
