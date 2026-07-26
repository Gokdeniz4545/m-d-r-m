import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActionCard } from "@/components/dashboard/action-card";
import { CLASS_TYPE_LABEL, type ClassType } from "@/lib/roles";
import { getStudentUsedThisMonth } from "@/lib/billing";

export default async function OgrenciHome() {
  const profile = await requireRole(["student"]);
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("monthly_quota")
    .eq("student_id", profile.id)
    .maybeSingle();
  const quota = sub?.monthly_quota ?? 0;
  const used = await getStudentUsedThisMonth(profile.id);
  const remaining = quota - used;

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("class_id")
    .eq("student_id", profile.id);
  const classIds = (enrollments ?? []).map((e) => e.class_id);

  let classes: {
    id: string;
    name: string;
    type: ClassType;
    subject_id: string;
    teacher_id: string | null;
  }[] = [];
  if (classIds.length > 0) {
    const { data } = await supabase
      .from("classes")
      .select("id, name, type, subject_id, teacher_id")
      .in("id", classIds);
    classes = (data ?? []) as typeof classes;
  }

  const subjectIds = [...new Set(classes.map((c) => c.subject_id))];
  const teacherIds = [
    ...new Set(classes.map((c) => c.teacher_id).filter(Boolean) as string[]),
  ];
  const subjectName = new Map<string, string>();
  if (subjectIds.length > 0) {
    const { data } = await supabase
      .from("subjects")
      .select("id, name")
      .in("id", subjectIds);
    (data ?? []).forEach((s) => subjectName.set(s.id, s.name));
  }
  const teacherName = new Map<string, string>();
  if (teacherIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", teacherIds);
    (data ?? []).forEach((p) => teacherName.set(p.id, p.full_name ?? p.username));
  }

  return (
    <PanelShell title="Öğrenci Paneli" profile={profile}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Derslerim" value={classes.length} />
        <StatCard
          label="Kalan ders hakkım"
          value={remaining}
          sublabel={`${quota} hak · ${used} kullanıldı`}
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard title="Takvim" description="Ders programım" href="/takvim" />
        <ActionCard title="İzin talebi" description="Derse gelemeyeceğimi bildir" soon />
      </div>

      <h2 className="section-title mt-8 mb-3">Derslerim</h2>
      {classes.length > 0 ? (
        <div className="flex flex-col gap-3">
          {classes.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{c.name}</div>
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-muted">
                  {CLASS_TYPE_LABEL[c.type]}
                </span>
              </div>
              <div className="text-sm text-muted">
                {subjectName.get(c.subject_id) ?? "?"}
                {c.teacher_id
                  ? " · " + (teacherName.get(c.teacher_id) ?? "?")
                  : ""}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Henüz kayıtlı olduğun ders yok.</p>
      )}
    </PanelShell>
  );
}
