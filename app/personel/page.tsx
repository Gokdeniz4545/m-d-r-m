import { requireRole } from "@/lib/auth";
import { PanelShell } from "@/components/panel-shell";

export default async function PersonelHome() {
  const profile = await requireRole(["staff"]);
  return (
    <PanelShell title="Personel" profile={profile}>
      <div className="card p-6">
        <p className="text-sm text-muted">
          Hoş geldiniz, {profile.full_name ?? profile.username}. Kurumunuz sizi
          personel olarak kaydetti.
        </p>
      </div>
    </PanelShell>
  );
}
