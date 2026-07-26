import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { UserManageRow } from "@/components/user-manage-row";
import { CreateOrgForm } from "./create-org-form";

export default async function SuperHome() {
  const profile = await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  const { data: admins } = await supabase
    .from("profiles")
    .select("id, organization_id, username, full_name, is_active")
    .eq("role", "org_admin");

  type AdminRow = {
    id: string;
    organization_id: string | null;
    username: string;
    full_name: string | null;
    is_active: boolean;
  };
  const adminByOrg = new Map<string, AdminRow>();
  admins?.forEach((a) => {
    if (a.organization_id) adminByOrg.set(a.organization_id, a as AdminRow);
  });

  return (
    <PanelShell title="Süper Yönetici Paneli" profile={profile}>
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Yeni kurum + yönetici
          </h2>
          <CreateOrgForm />
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Kurumlar ({orgs?.length ?? 0})
          </h2>
          {orgs && orgs.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {orgs.map((o) => {
                const admin = adminByOrg.get(o.id);
                return (
                  <li key={o.id} className="flex flex-col gap-2">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {o.name}
                    </div>
                    {admin ? (
                      <UserManageRow
                        user={{
                          id: admin.id,
                          username: admin.username,
                          full_name: admin.full_name,
                          role: "org_admin",
                          is_active: admin.is_active,
                        }}
                        branchesText=""
                      />
                    ) : (
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        Yönetici yok
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Henüz kurum yok. Soldaki formla ilk kurumu oluştur.
            </p>
          )}
        </section>
      </div>
    </PanelShell>
  );
}
