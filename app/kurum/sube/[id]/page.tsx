import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActionCard } from "@/components/dashboard/action-card";
import { getBranchStats } from "@/lib/dashboard-data";
import { getMakeupPool, getRenewedStudents } from "@/lib/makeup";
import { MakeupPoolCard } from "@/components/makeup-pool-card";
import { RenewedCard } from "@/components/renewed-card";

export default async function KurumSubeDetay({
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

  const stats = await getBranchStats([id]);
  const makeupPool = await getMakeupPool(id);
  const renewed = await getRenewedStudents(id);

  return (
    <PanelShell title={branch.name} profile={profile}>
      <Link
        href="/kurum/subeler"
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← Şubeler
      </Link>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Aktif öğrenci"
          value={stats.activeStudents}
          href={`/kisiler?tip=aktif-ogrenci&sube=${id}`}
        />
        <StatCard
          label="Öğrenci"
          value={stats.students}
          href={`/kisiler?tip=ogrenci&sube=${id}`}
        />
        <StatCard
          label="Öğretmen"
          value={stats.teachers}
          href={`/kisiler?tip=ogretmen&sube=${id}`}
        />
        <StatCard
          label="Bugünün yeni kayıtları"
          value={stats.newToday}
          href={`/kisiler?tip=yeni&sube=${id}`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RenewedCard rows={renewed} />
        <MakeupPoolCard pool={makeupPool} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          title="Öğrenci & öğretmenler"
          description="Bu şubenin kullanıcıları"
          href={`/kurum/sube/${id}/kullanicilar`}
        />
        <ActionCard
          title="Öğrenci kaydı"
          description="Yeni öğrenci ekle"
          href="/ogrenci-ekle"
        />
        <ActionCard title="Takvim" description="Ders programı" href="/takvim" />
      </div>
    </PanelShell>
  );
}
