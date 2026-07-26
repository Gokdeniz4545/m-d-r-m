import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { UsersList } from "@/components/users-list";
import { type UserRole } from "@/lib/roles";
import { CreateUserForm } from "../../../create-user-form";

export default async function KurumSubeKullanicilar({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireRole(["org_admin"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: branch } = await supabase
    .from("branches")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!branch) redirect("/kurum/subeler");

  const { data: mems } = await supabase
    .from("branch_memberships")
    .select("user_id")
    .eq("branch_id", id);
  const userIds = [...new Set((mems ?? []).map((m) => m.user_id))];

  let users: {
    id: string;
    username: string;
    full_name: string | null;
    role: string;
    is_active: boolean;
  }[] = [];
  if (userIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, role, is_active")
      .in("id", userIds)
      .order("created_at", { ascending: false });
    users = data ?? [];
  }

  return (
    <PanelShell title={`${branch.name} · Kullanıcılar`} profile={profile}>
      <Link
        href={`/kurum/sube/${id}`}
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← Şube paneli
      </Link>
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="section-title mb-3">Kullanıcılar ({users.length})</h2>
          <UsersList
            users={users.map((u) => ({
              id: u.id,
              name: u.full_name ?? u.username,
              username: u.username,
              role: u.role as UserRole,
              branch: branch.name,
              isActive: u.is_active,
            }))}
          />
        </section>

        <section>
          <h2 className="section-title mb-3">Yeni kullanıcı ekle</h2>
          <CreateUserForm branches={[{ id: branch.id, name: branch.name }]} />
        </section>
      </div>
    </PanelShell>
  );
}
