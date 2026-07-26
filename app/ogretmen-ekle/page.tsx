import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { QuickAddUserForm } from "@/components/quick-add-user-form";
import { getMyAdminBranchIds } from "@/lib/dashboard-data";

export default async function OgretmenEkle() {
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

  return (
    <PanelShell title="Öğretmen ekle" profile={profile}>
      <QuickAddUserForm role="teacher" branches={branches} subjects={subjects} />
    </PanelShell>
  );
}
