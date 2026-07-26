import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { PanelShell } from "@/components/panel-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActionCard } from "@/components/dashboard/action-card";
import { getOrgStats } from "@/lib/dashboard-data";

export default async function KurumGenel() {
  const profile = await requireRole(["org_admin"]);
  const stats = await getOrgStats();

  return (
    <PanelShell title="Kurum Geneli" profile={profile}>
      <Link
        href="/kurum"
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← Panele dön
      </Link>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Aktif öğrenci"
          value={stats.activeStudents}
          href="/kisiler?tip=aktif-ogrenci"
        />
        <StatCard
          label="Toplam öğrenci"
          value={stats.students}
          href="/kisiler?tip=ogrenci"
        />
        <StatCard
          label="Öğretmen"
          value={stats.teachers}
          href="/kisiler?tip=ogretmen"
        />
        <StatCard
          label="Bugünün yeni kayıtları"
          value={stats.newToday}
          href="/kisiler?tip=yeni"
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard title="Takvim" description="Tüm okulun programı" href="/takvim" />
        <ActionCard
          title="Raporlar"
          description="Aktif öğrenci ve aylık ciro grafikleri"
          href="/raporlar"
        />
      </div>
    </PanelShell>
  );
}
