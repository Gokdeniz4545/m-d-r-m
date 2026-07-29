import { requireRole } from "@/lib/auth";
import { PanelShell } from "@/components/panel-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActionCard } from "@/components/dashboard/action-card";
import { getOrgStats } from "@/lib/dashboard-data";
import { getOutstanding, formatTRY } from "@/lib/billing";

export default async function KurumHome() {
  const profile = await requireRole(["org_admin"]);
  const stats = await getOrgStats();
  const { total: outstanding, rows: debtors } = await getOutstanding();

  return (
    <PanelShell title="Kurum Paneli" profile={profile}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Şube" value={stats.branches} href="/kurum/subeler" icon="panel" />
        <StatCard
          label="Aktif öğrenci"
          value={stats.activeStudents}
          href="/kisiler?tip=aktif-ogrenci"
          icon="kisiler"
        />
        <StatCard
          label="Öğretmen"
          value={stats.teachers}
          href="/kisiler?tip=ogretmen"
          icon="ogretmenEkle"
        />
        <StatCard
          label="Bugünün yeni kayıtları"
          value={stats.newToday}
          href="/kisiler?tip=yeni"
          icon="ogrenciEkle"
        />
      </div>

      <div className="mt-4">
        <StatCard
          label="Tahsil edilmemiş alacak"
          value={formatTRY(outstanding)}
          sublabel={
            debtors.length > 0
              ? `${debtors.length} borçlu öğrenci · listeyi aç`
              : "Tüm ödemeler güncel"
          }
          href="/tahsilat"
          icon="tahsilat"
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <ActionCard
          title="Şubelerim"
          description="Şubeleri gör ve tek tek yönet"
          href="/kurum/subeler"
        />
        <ActionCard
          title="Kurum geneli"
          description="Tüm okulun özeti ve raporları"
          href="/kurum/genel"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          title="Raporlar"
          description="Aktif öğrenci ve ciro grafikleri"
          href="/raporlar"
        />
      </div>
    </PanelShell>
  );
}
