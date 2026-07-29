import Link from "next/link";
import { getNow } from "@/lib/clock";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { BarChart } from "@/components/dashboard/bar-chart";
import { formatTRY } from "@/lib/billing";

export default async function RaporlarPage() {
  const profile = await requireRole(["org_admin", "branch_admin"]);
  const supabase = await createClient();

  // Son 6 ay
  const d0 = await getNow();
  d0.setDate(1);
  d0.setHours(0, 0, 0, 0);
  const months = Array.from({ length: 6 }, (_, idx) => {
    const d = new Date(d0);
    d.setMonth(d0.getMonth() - (5 - idx));
    return d;
  });
  const monthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const label = (d: Date) =>
    d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
  const firstKey = `${monthKey(months[0])}-01`;

  // Ciro: ödemeler (period_month bazlı)
  const { data: payments } = await supabase
    .from("payments")
    .select("amount, period_month")
    .gte("period_month", firstKey);
  const ciroByMonth = new Map<string, number>();
  (payments ?? []).forEach((p) => {
    const k = String(p.period_month).slice(0, 7);
    ciroByMonth.set(k, (ciroByMonth.get(k) ?? 0) + Number(p.amount));
  });

  // Gider: expenses (expense_date bazlı)
  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount, expense_date")
    .gte("expense_date", firstKey);
  const giderByMonth = new Map<string, number>();
  (expenses ?? []).forEach((e) => {
    const k = String(e.expense_date).slice(0, 7);
    giderByMonth.set(k, (giderByMonth.get(k) ?? 0) + Number(e.amount));
  });

  // Aylık yeni öğrenci
  const { data: students } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("role", "student");
  const newByMonth = new Map<string, number>();
  (students ?? []).forEach((s) => {
    const k = String(s.created_at).slice(0, 7);
    newByMonth.set(k, (newByMonth.get(k) ?? 0) + 1);
  });

  const ciroData = months.map((d) => ({
    label: label(d),
    value: ciroByMonth.get(monthKey(d)) ?? 0,
  }));
  const giderData = months.map((d) => ({
    label: label(d),
    value: giderByMonth.get(monthKey(d)) ?? 0,
  }));
  const netData = months.map((d) => ({
    label: label(d),
    value:
      (ciroByMonth.get(monthKey(d)) ?? 0) - (giderByMonth.get(monthKey(d)) ?? 0),
  }));
  const newStudentData = months.map((d) => ({
    label: label(d),
    value: newByMonth.get(monthKey(d)) ?? 0,
  }));

  const totalCiro = ciroData.reduce((a, b) => a + b.value, 0);
  const totalGider = giderData.reduce((a, b) => a + b.value, 0);
  const netProfit = totalCiro - totalGider;
  const money = (v: number) => (v !== 0 ? formatTRY(v) : "0");

  return (
    <PanelShell title="Raporlar" profile={profile}>
      <Link
        href={profile.role === "org_admin" ? "/kurum" : "/sube"}
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← Panele dön
      </Link>

      {/* Son 6 ay özeti */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-sm text-muted">Toplam ciro (6 ay)</div>
          <div className="tabular mt-0.5 text-2xl font-bold tracking-tight">
            {formatTRY(totalCiro)}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">Toplam gider (6 ay)</div>
          <div className="tabular mt-0.5 text-2xl font-bold tracking-tight">
            {formatTRY(totalGider)}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">Net kâr (6 ay)</div>
          <div
            className={
              "tabular mt-0.5 text-2xl font-bold tracking-tight " +
              (netProfit >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-danger")
            }
          >
            {formatTRY(netProfit)}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-1 font-semibold">Aylık ciro</div>
          <div className="mb-4 text-sm text-muted">Gelen ödemeler</div>
          <BarChart data={ciroData} format={money} />
        </div>

        <div className="card p-5">
          <div className="mb-1 font-semibold">Aylık gider</div>
          <div className="mb-4 text-sm text-muted">Tüm giderler</div>
          <BarChart data={giderData} format={money} />
        </div>

        <div className="card p-5">
          <div className="mb-1 font-semibold">Aylık net kâr</div>
          <div className="mb-4 text-sm text-muted">Ciro − gider</div>
          <BarChart data={netData} format={money} />
        </div>

        <div className="card p-5">
          <div className="mb-1 font-semibold">Aylık yeni öğrenci</div>
          <div className="mb-4 text-sm text-muted">Son 6 ay</div>
          <BarChart data={newStudentData} />
        </div>
      </div>
    </PanelShell>
  );
}
