import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { CLASS_TYPE_LABEL, type ClassType } from "@/lib/roles";

export default async function OgretmenDerslerim() {
  const profile = await requireRole(["teacher"]);
  const supabase = await createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, type, capacity, subject_id")
    .eq("teacher_id", profile.id)
    .order("created_at", { ascending: false });

  const subjectIds = [...new Set((classes ?? []).map((c) => c.subject_id))];
  const subjectName = new Map<string, string>();
  if (subjectIds.length > 0) {
    const { data } = await supabase
      .from("subjects")
      .select("id, name")
      .in("id", subjectIds);
    (data ?? []).forEach((s) => subjectName.set(s.id, s.name));
  }

  const classIds = (classes ?? []).map((c) => c.id);
  let enrollments: { class_id: string; student_id: string }[] = [];
  if (classIds.length > 0) {
    const { data } = await supabase
      .from("enrollments")
      .select("class_id, student_id")
      .in("class_id", classIds);
    enrollments = data ?? [];
  }
  const studentIds = [...new Set(enrollments.map((e) => e.student_id))];
  const studentName = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", studentIds);
    (data ?? []).forEach((p) => studentName.set(p.id, p.full_name ?? p.username));
  }
  const studentsByClass = new Map<string, string[]>();
  enrollments.forEach((e) => {
    const arr = studentsByClass.get(e.class_id) ?? [];
    arr.push(studentName.get(e.student_id) ?? "?");
    studentsByClass.set(e.class_id, arr);
  });

  return (
    <PanelShell title="Derslerim" profile={profile}>
      <Link
        href="/ogretmen"
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← Panele dön
      </Link>
      <h2 className="section-title mb-3">Derslerim ({classes?.length ?? 0})</h2>
      {classes && classes.length > 0 ? (
        <div className="flex flex-col gap-3">
          {classes.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{c.name}</div>
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-muted">
                  {CLASS_TYPE_LABEL[c.type as ClassType]}
                </span>
              </div>
              <div className="text-sm text-muted">
                {subjectName.get(c.subject_id) ?? "?"}
              </div>
              <div className="mt-2 text-sm">
                Öğrenciler ({studentsByClass.get(c.id)?.length ?? 0}):{" "}
                {studentsByClass.get(c.id)?.join(", ") || "—"}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Henüz size atanmış ders yok.</p>
      )}
    </PanelShell>
  );
}
