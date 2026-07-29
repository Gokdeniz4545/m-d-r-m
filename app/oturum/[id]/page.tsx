import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { AttendanceButtons } from "@/components/attendance-buttons";

export default async function OturumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireRole(["org_admin", "branch_admin", "teacher"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, class_id, date, start_time, end_time, is_makeup")
    .eq("id", id)
    .maybeSingle();
  if (!session) redirect("/takvim");

  const { data: cls } = await supabase
    .from("classes")
    .select("name, subject_id")
    .eq("id", session.class_id)
    .maybeSingle();
  let subjectName = "";
  if (cls?.subject_id) {
    const { data: subj } = await supabase
      .from("subjects")
      .select("name")
      .eq("id", cls.subject_id)
      .maybeSingle();
    subjectName = subj?.name ?? "";
  }

  const { data: enr } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("class_id", session.class_id);
  const studentIds = (enr ?? []).map((e) => e.student_id);

  const nameById = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", studentIds);
    (data ?? []).forEach((p) => nameById.set(p.id, p.full_name ?? p.username));
  }

  const { data: att } = await supabase
    .from("attendance")
    .select("student_id, status")
    .eq("session_id", id);
  const statusByStudent = new Map<string, string>();
  (att ?? []).forEach((a) => statusByStudent.set(a.student_id, a.status));

  // Telafi ders hakkı (öğrenci başına) — "izinli" uyarısı için
  const makeupByStudent = new Map<string, number>();
  if (studentIds.length > 0) {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("student_id, makeup_credits")
      .in("student_id", studentIds);
    (subs ?? []).forEach((s) =>
      makeupByStudent.set(s.student_id, s.makeup_credits ?? 0),
    );
  }

  const dateLabel = new Date(session.date).toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <PanelShell title="Yoklama" profile={profile}>
      <Link
        href="/takvim"
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← Takvime dön
      </Link>

      <div className="card mb-6 p-4">
        <div className="font-semibold">{cls?.name ?? "Ders"}</div>
        <div className="text-sm text-muted">
          {subjectName ? subjectName + " · " : ""}
          {dateLabel} · {session.start_time.slice(0, 5)}–
          {session.end_time.slice(0, 5)}
          {session.is_makeup ? " · Telafi" : ""}
        </div>
      </div>

      {studentIds.length > 0 ? (
        <div className="flex flex-col gap-2">
          {studentIds.map((sid) => {
            const current = statusByStudent.get(sid);
            return (
              <div
                key={sid}
                className="card flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div>
                  <span className="font-medium">{nameById.get(sid) ?? "?"}</span>
                  <div className="text-xs text-muted">
                    Telafi hakkı: {makeupByStudent.get(sid) ?? 0}
                  </div>
                </div>
                <AttendanceButtons
                  sessionId={id}
                  studentId={sid}
                  current={current}
                  makeupCredits={makeupByStudent.get(sid) ?? 0}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">Bu derste kayıtlı öğrenci yok.</p>
      )}
    </PanelShell>
  );
}
