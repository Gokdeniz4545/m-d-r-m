import { requireRole } from "@/lib/auth";
import { PanelShell } from "@/components/panel-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActionCard } from "@/components/dashboard/action-card";
import { getBranchStats, getMyAdminBranchIds } from "@/lib/dashboard-data";
import { getMakeupPool } from "@/lib/makeup";

export default async function SubeHome() {
  const profile = await requireRole(["branch_admin"]);
  const branchIds = await getMyAdminBranchIds(profile.id);
  const stats = await getBranchStats(branchIds);
  const makeupPool = await getMakeupPool();

  return (
    <PanelShell title="Şube Paneli" profile={profile}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Aktif öğrenci"
          value={stats.activeStudents}
          href="/kisiler?tip=aktif-ogrenci"
        />
        <StatCard
          label="Öğretmenlerim"
          value={stats.teachers}
          href="/kisiler?tip=ogretmen"
        />
        <StatCard
          label="Bugünün yeni kayıtları"
          value={stats.newToday}
          href="/kisiler?tip=yeni"
        />
      </div>

      <div className="mt-4">
        <StatCard
          label="Aboneliği bitmek üzere"
          value={makeupPool.length}
          sublabel={
            makeupPool.length > 0
              ? "ders hakkı bitmek üzere · aç"
              : "Bekleyen yok"
          }
          href="/telafi"
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          title="Kullanıcılar"
          description="Kullanıcıları görüntüle, ekle, yönet"
          href="/sube/kullanicilar"
        />
        <ActionCard
          title="Takvim"
          description="Haftalık ders programı"
          href="/takvim"
        />
      </div>
    </PanelShell>
  );
}
