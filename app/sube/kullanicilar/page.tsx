import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { type UserRole } from "@/lib/roles";
import { UsersList } from "@/components/users-list";
import { CreateBranchUserForm } from "../create-user-form";

export default async function SubeKullanicilar() {
  const profile = await requireRole(["branch_admin"]);
  const supabase = await createClient();

  const { data: myMemberships } = await supabase
    .from("branch_memberships")
    .select("branch_id")
    .eq("user_id", profile.id)
    .eq("role", "branch_admin");
  const branchIds = (myMemberships ?? []).map((m) => m.branch_id);

  let branches: { id: string; name: string }[] = [];
  if (branchIds.length > 0) {
    const { data } = await supabase
      .from("branches")
      .select("id, name")
      .in("id", branchIds)
      .order("name");
    branches = data ?? [];
  }

  const { data: users } = await supabase
    .from("profiles")
    .select("id, username, full_name, role, is_active")
    .neq("id", profile.id)
    .order("created_at", { ascending: false });

  const { data: memberships } = await supabase
    .from("branch_memberships")
    .select("user_id, branch_id");

  const branchName = new Map(branches.map((b) => [b.id, b.name]));
  const userBranches = new Map<string, string[]>();
  (memberships ?? []).forEach((m) => {
    const name = branchName.get(m.branch_id);
    if (!name) return;
    const arr = userBranches.get(m.user_id) ?? [];
    arr.push(name);
    userBranches.set(m.user_id, arr);
  });

  return (
    <PanelShell title="Kullanıcılar" profile={profile}>
      <Link
        href="/sube"
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← Panele dön
      </Link>
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="section-title mb-3">
            Şubemdeki kullanıcılar ({users?.length ?? 0})
          </h2>
          <UsersList
            users={(users ?? []).map((u) => ({
              id: u.id,
              name: u.full_name ?? u.username,
              username: u.username,
              role: u.role as UserRole,
              branch: userBranches.get(u.id)?.join(", ") ?? "",
              isActive: u.is_active,
            }))}
          />
        </section>

        <section>
          <h2 className="section-title mb-3">Yeni kullanıcı ekle</h2>
          <CreateBranchUserForm branches={branches} />
        </section>
      </div>
    </PanelShell>
  );
}
