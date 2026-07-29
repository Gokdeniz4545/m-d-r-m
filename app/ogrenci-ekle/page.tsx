import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { RegistrationForm } from "@/components/registration-form";
import { getMyAdminBranchIds } from "@/lib/dashboard-data";

export default async function OgrenciKaydi() {
  const profile = await requireRole(["org_admin", "branch_admin"]);
  const supabase = await createClient();

  let branches: { id: string; name: string }[] = [];
  if (profile.role === "org_admin") {
    const { data } = await supabase.from("branches").select("id, name").order("name");
    branches = data ?? [];
  } else {
    const ids = await getMyAdminBranchIds(profile.id);
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
  const { data: teacherSubs } = await supabase
    .from("teacher_subjects")
    .select("teacher_id, subject_id");
  const teachers = (teacherProfiles ?? []).map((t) => ({
    id: t.id,
    name: t.full_name ?? t.username,
    branchIds: (teacherMems ?? [])
      .filter((m) => m.user_id === t.id)
      .map((m) => m.branch_id),
    subjectIds: (teacherSubs ?? [])
      .filter((s) => s.teacher_id === t.id)
      .map((s) => s.subject_id),
  }));

  return (
    <PanelShell title="Öğrenci Kaydı" profile={profile}>
      <RegistrationForm branches={branches} teachers={teachers} subjects={subjects} />
    </PanelShell>
  );
}
