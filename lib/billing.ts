import { createClient } from "@/lib/supabase/server";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// Öğrencinin bu ay kullandığı ders hakkı = bu aya ait oturumlardaki
// yoklama kayıtları (izinli hariç). Yoklama girilmemiş ders hak düşürmez.
export async function getStudentUsedThisMonth(studentId: string): Promise<number> {
  const supabase = await createClient();
  const now = new Date();
  const curPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let used = 0;
  const { data: enr } = await supabase
    .from("enrollments")
    .select("class_id")
    .eq("student_id", studentId);
  const cids = [...new Set((enr ?? []).map((e) => e.class_id))];
  if (cids.length > 0) {
    const first = `${curPeriod}-01`;
    const { data: sess } = await supabase
      .from("sessions")
      .select("id")
      .in("class_id", cids)
      .gte("date", first)
      .lte("date", ymd(now));
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
  }

  // Açılış devri (geçiş ayı): önceden kullanılmış dersleri bu ay için ekle
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("opening_used, opening_period")
    .eq("student_id", studentId)
    .maybeSingle();
  if (sub?.opening_used && sub.opening_period === curPeriod) {
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
  balance: number; // > 0 → borçlu, < 0 → alacaklı (fazla ödeme)
  unpaidDueCount: number;
};

// Tek öğrencinin ay ay cari hesabı.
export async function getStudentLedger(studentId: string): Promise<StudentLedger> {
  const supabase = await createClient();
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

  if (!sub) {
    return {
      hasSubscription: false,
      monthlyFee: 0,
      totalMonths: 0,
      periods: [],
      dueExpected: 0,
      totalPaid,
      openingBalance: 0,
      balance: -totalPaid,
      unpaidDueCount: 0,
    };
  }
  const openingBalance = Number(sub.opening_balance ?? 0);

  const monthlyFee = Number(sub.monthly_fee);
  const totalMonths = Number(sub.total_months) || 1;
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
  const balance = openingBalance + dueExpected - totalPaid;
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
    balance,
    unpaidDueCount,
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

  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name, username, phone, role")
    .in("id", ids);
  const profById = new Map((profs ?? []).map((p) => [p.id, p]));

  const now = new Date();
  const rows: OutstandingRow[] = [];
  for (const s of list) {
    const prof = profById.get(s.student_id);
    if (!prof || prof.role !== "student") continue;
    const fee = Number(s.monthly_fee);
    const dueCount = duePeriodsCount(s.start_date, Number(s.total_months) || 1, now);
    const opening = Number(s.opening_balance ?? 0);
    const balance = opening + fee * dueCount - (paidById.get(s.student_id) ?? 0);
    if (balance > 0.5) {
      rows.push({
        id: prof.id,
        name: prof.full_name ?? prof.username,
        phone: prof.phone,
        balance,
        unpaidMonths: fee > 0 ? Math.round(balance / fee) : 0,
      });
    }
  }
  rows.sort((a, b) => b.balance - a.balance);
  const total = rows.reduce((s, r) => s + r.balance, 0);
  return { rows, total };
}
