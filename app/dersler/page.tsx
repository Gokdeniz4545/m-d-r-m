import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { CLASS_TYPE_LABEL, type ClassType } from "@/lib/roles";
import { SubjectManager } from "@/components/dersler/subject-manager";
import { ClassForm } from "@/components/dersler/class-form";

export default async function DerslerPage() {
  const profile = await requireRole(["org_admin", "branch_admin"]);
  const supabase = await createClient();

  let branches: { id: string; name: string }[] = [];
  if (profile.role === "org_admin") {
    const { data } = await supabase.from("branches").select("id, name").order("name");
    branches = data ?? [];
  } else {
    const { data: mem } = await supabase
      .from("branch_memberships")
      .select("branch_id")
      .eq("user_id", profile.id)
      .eq("role", "branch_admin");
    const ids = (mem ?? []).map((m) => m.branch_id);
    if (ids.length > 0) {
      const { data } = await supabase
        .from("branches")
        .select("id, name")
        .in("id", ids)
        .order("name");
      branches = data ?? [];
    }
  }

  const { data: subjectsData } = await supabase
    .from("subjects")
    .select("id, name")
    .order("name");
  const subjects = subjectsData ?? [];

  const { data: teacherProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, username")
    .eq("role", "teacher");
  const { data: teacherMems } = await supabase
    .from("branch_memberships")
    .select("user_id, branch_id")
    .eq("role", "teacher");
  const teachers = (teacherProfiles ?? []).map((t) => ({
    id: t.id,
    name: t.full_name ?? t.username,
    branchIds: (teacherMems ?? [])
      .filter((m) => m.user_id === t.id)
      .map((m) => m.branch_id),
  }));

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, type, capacity, branch_id, subject_id, teacher_id")
    .order("created_at", { ascending: false });

  const { data: enr } = await supabase.from("enrollments").select("class_id");
  const enrolledCount = new Map<string, number>();
  (enr ?? []).forEach((e) =>
    enrolledCount.set(e.class_id, (enrolledCount.get(e.class_id) ?? 0) + 1),
  );

  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const branchName = new Map(branches.map((b) => [b.id, b.name]));
  const teacherName = new Map(teachers.map((t) => [t.id, t.name]));

  return (
    <PanelShell title="Dersler" profile={profile}>
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-8">
          <div>
            <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Branşlar
            </h2>
            <SubjectManager subjects={subjects} />
          </div>
          <div>
            <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Yeni ders
            </h2>
            <ClassForm branches={branches} subjects={subjects} teachers={teachers} />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Dersler ({classes?.length ?? 0})
          </h2>
          {classes && classes.length > 0 ? (
            <div className="flex flex-col gap-2">
              {classes.map((c) => (
                <Link
                  key={c.id}
                  href={`/dersler/${c.id}`}
                  className="card block p-3 transition hover:border-primary/40 hover:bg-accent"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {c.name}
                    </div>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {CLASS_TYPE_LABEL[c.type as ClassType]}
                    </span>
                  </div>
                  <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    {subjectName.get(c.subject_id) ?? "?"} ·{" "}
                    {branchName.get(c.branch_id) ?? "?"} ·{" "}
                    {c.teacher_id
                      ? (teacherName.get(c.teacher_id) ?? "?")
                      : "öğretmen atanmadı"}{" "}
                    · {enrolledCount.get(c.id) ?? 0}/{c.capacity} öğrenci
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Henüz ders yok.
            </p>
          )}
        </section>
      </div>
    </PanelShell>
  );
}
