import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { BarChart } from "@/components/dashboard/bar-chart";
import { ScaleSelector } from "@/components/reports/scale-selector";
import { formatTRY } from "@/lib/billing";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/expenses";
import {
  getBuckets,
  bucketize,
  isScale,
  type Scale,
} from "@/lib/report-buckets";

const WINDOW_LABEL: Record<Scale, string> = {
  gun: "Son 30 gün",
  hafta: "Son 12 hafta",
  ay: "Son 12 ay",
};

// Çok kovada yatay kaydırılabilir grafik sarmalayıcı.
function ScrollChart({
  data,
  count,
  format,
}: {
  data: { label: string; value: number }[];
  count: number;
  format?: (v: number) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: Math.max(280, count * 26) }}>
        <BarChart data={data} format={format} />
      </div>
    </div>
  );
}

export default async function RaporlarPage({
  searchParams,
}: {
  searchParams: Promise<{ olcek?: string }>;
}) {
  const profile = await requireRole(["org_admin"]);
  const supabase = await createClient();

  const { olcek } = await searchParams;
  const scale: Scale = isScale(olcek) ? olcek : "ay";
  const buckets = getBuckets(scale);
  const firstStart = buckets[0].start;
  const firstISO = firstStart.toISOString();
  const firstDate = firstISO.slice(0, 10);

  // Ciro: gerçek ödeme tarihine (paid_at) göre — gün/hafta/ay tutarlı olsun.
  const { data: payments } = await supabase
    .from("payments")
    .select("amount, paid_at, period_month, student_id")
    .gte("paid_at", firstISO)
    .order("paid_at", { ascending: false });
  const pays = payments ?? [];

  // Gider: expense_date bazlı.
  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount, expense_date, category, note, teacher_id")
    .gte("expense_date", firstDate)
    .order("expense_date", { ascending: false });
  const exps = expenses ?? [];

  // Öğrenci: tümü (birikimli için pencereden önceki kayıtlar da lazım).
  const { data: studentRows } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("role", "student");
  const students = studentRows ?? [];

  // Kalem kalem için isimler
  const studentIds = [...new Set(pays.map((p) => p.student_id))];
  const teacherIds = [
    ...new Set(exps.map((e) => e.teacher_id).filter(Boolean) as string[]),
  ];
  const nameById = new Map<string, string>();
  const allIds = [...new Set([...studentIds, ...teacherIds])];
  if (allIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", allIds);
    (profs ?? []).forEach((p) =>
      nameById.set(p.id, p.full_name ?? p.username ?? "?"),
    );
  }

  // Seriler
  const ciroSeries = bucketize(
    buckets,
    scale,
    pays.map((p) => ({ date: p.paid_at, value: Number(p.amount) })),
  );
  const giderSeries = bucketize(
    buckets,
    scale,
    exps.map((e) => ({ date: e.expense_date, value: Number(e.amount) })),
  );
  const netSeries = ciroSeries.map((c, i) => c - giderSeries[i]);
  const newStudentSeries = bucketize(
    buckets,
    scale,
    students.map((s) => ({ date: s.created_at, value: 1 })),
  );
  // Birikimli: her kova sonuna kadarki toplam öğrenci
  const createdTimes = students
    .map((s) => new Date(s.created_at).getTime())
    .sort((a, b) => a - b);
  const cumulativeSeries = buckets.map((b) => {
    const t = b.end.getTime();
    // createdTimes sıralı → t'den küçük/eşit sayısı
    let lo = 0;
    let hi = createdTimes.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (createdTimes[mid] <= t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  });

  const toData = (series: number[]) =>
    buckets.map((b, i) => ({ label: b.label, value: series[i] }));

  const totalCiro = ciroSeries.reduce((a, b) => a + b, 0);
  const totalGider = giderSeries.reduce((a, b) => a + b, 0);
  const netProfit = totalCiro - totalGider;
  const money = (v: number) => (v !== 0 ? formatTRY(v) : "0");

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  const donem = (period: string | null) =>
    period
      ? new Date(period).toLocaleDateString("tr-TR", {
          month: "long",
          year: "numeric",
        })
      : "";

  const win = WINDOW_LABEL[scale];
  const gelirKalem = pays.slice(0, 100);
  const giderKalem = exps.slice(0, 100);

  return (
    <PanelShell title="Raporlar" profile={profile}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={profile.role === "org_admin" ? "/kurum" : "/sube"}
          className="text-sm text-muted hover:underline"
        >
          ← Panele dön
        </Link>
        <ScaleSelector current={scale} />
      </div>

      {/* Özet */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-sm text-muted">Toplam ciro ({win})</div>
          <div className="tabular mt-0.5 text-2xl font-bold tracking-tight">
            {formatTRY(totalCiro)}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">Toplam gider ({win})</div>
          <div className="tabular mt-0.5 text-2xl font-bold tracking-tight">
            {formatTRY(totalGider)}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">Net kâr ({win})</div>
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
          <div className="mb-1 font-semibold">Ciro</div>
          <div className="mb-4 text-sm text-muted">Gelen ödemeler ({win})</div>
          <ScrollChart data={toData(ciroSeries)} count={buckets.length} format={money} />
        </div>

        <div className="card p-5">
          <div className="mb-1 font-semibold">Gider</div>
          <div className="mb-4 text-sm text-muted">Tüm giderler ({win})</div>
          <ScrollChart data={toData(giderSeries)} count={buckets.length} format={money} />
        </div>

        <div className="card p-5">
          <div className="mb-1 font-semibold">Net kâr</div>
          <div className="mb-4 text-sm text-muted">Ciro − gider ({win})</div>
          <ScrollChart data={toData(netSeries)} count={buckets.length} format={money} />
        </div>

        <div className="card p-5">
          <div className="mb-1 font-semibold">Yeni öğrenci</div>
          <div className="mb-4 text-sm text-muted">Dönem başına ({win})</div>
          <ScrollChart data={toData(newStudentSeries)} count={buckets.length} />
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-1 font-semibold">Toplam öğrenci</div>
          <div className="mb-4 text-sm text-muted">
            Birikimli — dönem sonu itibarıyla ({win})
          </div>
          <ScrollChart data={toData(cumulativeSeries)} count={buckets.length} />
        </div>
      </div>

      {/* Kalem kalem */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="font-semibold">Gelir kalemleri</span>
            <span className="text-sm text-muted">{pays.length} kalem · {win}</span>
          </div>
          {gelirKalem.length > 0 ? (
            <div className="divide-y divide-border">
              {gelirKalem.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {nameById.get(p.student_id) ?? "?"}
                    </div>
                    <div className="text-xs text-muted">
                      {fmtDate(p.paid_at)}
                      {p.period_month ? ` · ${donem(p.period_month)} dönemi` : ""}
                    </div>
                  </div>
                  <span className="tabular shrink-0 font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatTRY(Number(p.amount))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Bu dönemde gelir kaydı yok.</p>
          )}
          {pays.length > gelirKalem.length ? (
            <p className="mt-2 text-xs text-muted">
              +{pays.length - gelirKalem.length} kalem daha
            </p>
          ) : null}
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="font-semibold">Gider kalemleri</span>
            <span className="text-sm text-muted">{exps.length} kalem · {win}</span>
          </div>
          {giderKalem.length > 0 ? (
            <div className="divide-y divide-border">
              {giderKalem.map((e, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {EXPENSE_CATEGORY_LABEL[e.category] ?? e.category}
                      {e.teacher_id
                        ? ` · ${nameById.get(e.teacher_id) ?? "?"}`
                        : ""}
                    </div>
                    <div className="text-xs text-muted">
                      {fmtDate(e.expense_date)}
                      {e.note ? ` · ${e.note}` : ""}
                    </div>
                  </div>
                  <span className="tabular shrink-0 font-semibold text-danger">
                    {formatTRY(Number(e.amount))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Bu dönemde gider kaydı yok.</p>
          )}
          {exps.length > giderKalem.length ? (
            <p className="mt-2 text-xs text-muted">
              +{exps.length - giderKalem.length} kalem daha
            </p>
          ) : null}
        </div>
      </div>
    </PanelShell>
  );
}
