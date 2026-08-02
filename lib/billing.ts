import { createClient } from "@/lib/supabase/server";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// Kurumun faturalama modu. 'package' = ders paketi (aylık tahakkuk yok);
// 'monthly' = aylık abonelik (varsayılan). Sütun yoksa (migration öncesi) güvenli
// varsayılan 'monthly' döner.
export type BillingMode = "monthly" | "package";

export async function getStudentBillingMode(
  studentId: string,
): Promise<BillingMode> {
  const supabase = await createClient();
  const { data: prof } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", studentId)
    .maybeSingle();
  if (!prof?.organization_id) return "monthly";
  const { data: org, error } = await supabase
    .from("organizations")
    .select("billing_mode")
    .eq("id", prof.organization_id)
    .maybeSingle();
  if (error) return "monthly";
  return org?.billing_mode === "package" ? "package" : "monthly";
}

// Öğrencinin kullandığı ders hakkı (izinli hariç yoklama kayıtları).
// Aylık modda: yalnız bu aya ait oturumlar + geçiş ayı devri (opening_used).
// Paket modunda: paket boyunca KÜMÜLATİF (tüm tarihli oturumlar) + opening_used
// her zaman (paket aylık sıfırlanmaz). Yoklama girilmemiş ders hak düşürmez.
export async function getStudentUsedThisMonth(studentId: string): Promise<number> {
  const supabase = await createClient();
  const mode = await getStudentBillingMode(studentId);
  const now = new Date();
  const curPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let used = 0;
  // İşlenen ders: doğrudan öğrencinin oturumları (sessions.student_id) üzerinden.
  let q = supabase.from("sessions").select("id").eq("student_id", studentId).lte("date", ymd(now));
  // Aylık modda yalnız içinde bulunulan ay; paket modunda tüm geçmiş.
  if (mode !== "package") q = q.gte("date", `${curPeriod}-01`);
  const { data: sess } = await q;
  const sids = (sess ?? []).map((s) => s.id);
  if (sids.length > 0) {
    const { count } = await supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .in("session_id", sids)
      .neq("status", "excused");
    used = count ?? 0;
  }

  // Açılış devri (opening_used): paket modunda her zaman; aylık modda yalnız geçiş ayında.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("opening_used, opening_period")
    .eq("student_id", studentId)
    .maybeSingle();
  if (sub?.opening_used && (mode === "package" || sub.opening_period === curPeriod)) {
    used += Number(sub.opening_used);
  }
  return used;
}

// ── Cari hesap / borç takibi ────────────────────────────────────
// Model: abonelik her ay `monthly_fee` tahakkuk ettirir (start_date'ten
// itibaren total_months ay). Vadesi gelmiş (bu ay dahil geçmiş) ayların
// toplamı beklenen borç; toplam ödeme düşülür. Bakiye > 0 → öğrenci borçlu.

export function formatTRY(n: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);
}

// Abonelik türü (ödeme periyodu)
export const BILLING_PERIODS = ["aylik", "3_aylik", "6_aylik", "yillik"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];
export const BILLING_PERIOD_LABEL: Record<string, string> = {
  aylik: "Aylık",
  "3_aylik": "3 Aylık",
  "6_aylik": "6 Aylık",
  yillik: "Yıllık",
};

function ymParts(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

// start_date'ten bugüne kadar vadesi gelmiş ay sayısı (bu ay dahil), total ile sınırlı.
function duePeriodsCount(startDate: string, totalMonths: number, now: Date): number {
  const start = new Date(startDate);
  const monthsSince =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth()) +
    1;
  return Math.max(0, Math.min(totalMonths, monthsSince));
}

export type LedgerPeriod = {
  period: string; // "YYYY-MM"
  expected: number;
  paid: number;
  due: boolean;
  status: "paid" | "partial" | "unpaid" | "upcoming";
};

export type StudentLedger = {
  hasSubscription: boolean;
  monthlyFee: number;
  totalMonths: number;
  periods: LedgerPeriod[];
  dueExpected: number;
  totalPaid: number;
  openingBalance: number; // geçişte devralınan bakiye (> 0 borç, < 0 alacak)
  adjustmentsTotal: number; // manuel bakiye düzeltmeleri toplamı (işaretli)
  balance: number; // > 0 → borçlu, < 0 → alacaklı (fazla ödeme)
  unpaidDueCount: number;
  billingMode: BillingMode;
};

// Tek öğrencinin ay ay cari hesabı.
export async function getStudentLedger(studentId: string): Promise<StudentLedger> {
  const supabase = await createClient();
  const mode = await getStudentBillingMode(studentId);
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("monthly_fee, total_months, start_date, status, opening_balance")
    .eq("student_id", studentId)
    .maybeSingle();
  const { data: pays } = await supabase
    .from("payments")
    .select("amount, period_month")
    .eq("student_id", studentId);
  const payments = pays ?? [];
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

  const { data: adjs } = await supabase
    .from("adjustments")
    .select("amount")
    .eq("student_id", studentId);
  const adjustmentsTotal = (adjs ?? []).reduce((s, a) => s + Number(a.amount), 0);

  if (!sub) {
    return {
      hasSubscription: false,
      monthlyFee: 0,
      totalMonths: 0,
      periods: [],
      dueExpected: 0,
      totalPaid,
      openingBalance: 0,
      adjustmentsTotal,
      balance: adjustmentsTotal - totalPaid,
      unpaidDueCount: 0,
      billingMode: mode,
    };
  }
  const openingBalance = Number(sub.opening_balance ?? 0);
  const monthlyFee = Number(sub.monthly_fee);
  const totalMonths = Number(sub.total_months) || 1;

  // Paket modu: aylık tahakkuk yok. Bakiye = devir(borç) − ödeme + düzeltme.
  if (mode === "package") {
    return {
      hasSubscription: true,
      monthlyFee,
      totalMonths,
      periods: [],
      dueExpected: 0,
      totalPaid,
      openingBalance,
      adjustmentsTotal,
      balance: openingBalance - totalPaid + adjustmentsTotal,
      unpaidDueCount: 0,
      billingMode: "package",
    };
  }

  const start = new Date(sub.start_date);
  const startY = start.getFullYear();
  const startM = start.getMonth();
  const now = new Date();

  const paidByPeriod = new Map<string, number>();
  for (const p of payments) {
    if (!p.period_month) continue;
    const d = new Date(p.period_month);
    const key = ymParts(d.getFullYear(), d.getMonth());
    paidByPeriod.set(key, (paidByPeriod.get(key) ?? 0) + Number(p.amount));
  }

  const periods: LedgerPeriod[] = [];
  let dueCount = 0;
  for (let i = 0; i < totalMonths; i++) {
    const y = startY + Math.floor((startM + i) / 12);
    const m = (startM + i) % 12;
    const key = ymParts(y, m);
    const due =
      y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth());
    const paid = paidByPeriod.get(key) ?? 0;
    let status: LedgerPeriod["status"];
    if (!due) status = "upcoming";
    else if (monthlyFee > 0 && paid >= monthlyFee) status = "paid";
    else if (paid > 0) status = "partial";
    else status = "unpaid";
    if (due) dueCount++;
    periods.push({ period: key, expected: monthlyFee, paid, due, status });
  }

  const dueExpected = monthlyFee * dueCount;
  const balance = openingBalance + dueExpected - totalPaid + adjustmentsTotal;
  const unpaidDueCount = periods.filter(
    (p) => p.due && p.status !== "paid",
  ).length;

  return {
    hasSubscription: true,
    monthlyFee,
    totalMonths,
    periods,
    dueExpected,
    totalPaid,
    openingBalance,
    adjustmentsTotal,
    balance,
    unpaidDueCount,
    billingMode: "monthly",
  };
}

export type OutstandingRow = {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  unpaidMonths: number;
};

// Kurum/şube (RLS kapsamında) borçlu öğrenciler, çoktan aza.
export async function getOutstanding(): Promise<{
  rows: OutstandingRow[];
  total: number;
}> {
  const supabase = await createClient();
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("student_id, monthly_fee, total_months, start_date, status, opening_balance");
  const list = (subs ?? []).filter((s) => (s.status ?? "active") === "active");
  if (list.length === 0) return { rows: [], total: 0 };

  const ids = list.map((s) => s.student_id);
  const { data: pays } = await supabase
    .from("payments")
    .select("student_id, amount")
    .in("student_id", ids);
  const paidById = new Map<string, number>();
  for (const p of pays ?? []) {
    paidById.set(p.student_id, (paidById.get(p.student_id) ?? 0) + Number(p.amount));
  }
  const { data: adjs } = await supabase
    .from("adjustments")
    .select("student_id, amount")
    .in("student_id", ids);
  const adjById = new Map<string, number>();
  for (const a of adjs ?? []) {
    adjById.set(a.student_id, (adjById.get(a.student_id) ?? 0) + Number(a.amount));
  }

  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name, username, phone, role, organization_id")
    .in("id", ids);
  const profById = new Map((profs ?? []).map((p) => [p.id, p]));

  // İlgili kurumların faturalama modları (paket kurumda aylık tahakkuk yok).
  const orgIds = [...new Set((profs ?? []).map((p) => p.organization_id).filter(Boolean))];
  const modeByOrg = new Map<string, string>();
  if (orgIds.length > 0) {
    const { data: orgs, error } = await supabase
      .from("organizations")
      .select("id, billing_mode")
      .in("id", orgIds);
    if (!error) for (const o of orgs ?? []) modeByOrg.set(o.id, o.billing_mode);
  }

  const now = new Date();
  const rows: OutstandingRow[] = [];
  for (const s of list) {
    const prof = profById.get(s.student_id);
    if (!prof || prof.role !== "student") continue;
    const fee = Number(s.monthly_fee);
    const isPackage = modeByOrg.get(prof.organization_id) === "package";
    const dueCount = isPackage
      ? 0
      : duePeriodsCount(s.start_date, Number(s.total_months) || 1, now);
    const opening = Number(s.opening_balance ?? 0);
    const balance =
      opening +
      fee * dueCount -
      (paidById.get(s.student_id) ?? 0) +
      (adjById.get(s.student_id) ?? 0);
    if (balance > 0.5) {
      rows.push({
        id: prof.id,
        name: prof.full_name ?? prof.username,
        phone: prof.phone,
        balance,
        unpaidMonths: isPackage || fee <= 0 ? 0 : Math.round(balance / fee),
      });
    }
  }
  rows.sort((a, b) => b.balance - a.balance);
  const total = rows.reduce((s, r) => s + r.balance, 0);
  return { rows, total };
}
