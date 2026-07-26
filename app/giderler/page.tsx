import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { ExpenseForm } from "@/components/expense-form";
import { deleteExpense } from "@/lib/expense-actions";
import { EXPENSE_CATEGORY_LABEL, type ExpenseRow } from "@/lib/expenses";
import { formatTRY } from "@/lib/billing";

export default async function GiderlerPage() {
  const profile = await requireRole(["org_admin", "branch_admin"]);
  const supabase = await createClient();

  const { data: expenseData } = await supabase
    .from("expenses")
    .select("id, category, amount, expense_date, due_date, note, teacher_id")
    .order("expense_date", { ascending: false })
    .limit(100);
  const expenses: ExpenseRow[] = (expenseData ?? []).map((e) => ({
    ...e,
    amount: Number(e.amount),
  }));

  // Maaş giderleri için öğretmen adları
  const teacherIds = [
    ...new Set(expenses.map((e) => e.teacher_id).filter(Boolean) as string[]),
  ];
  const { data: payeeProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, role")
    .in("role", ["teacher", "staff"]);
  const teachers = (payeeProfiles ?? [])
    .filter((p) => p.role === "teacher")
    .map((t) => ({ id: t.id, name: t.full_name ?? t.username }));
  const staff = (payeeProfiles ?? [])
    .filter((p) => p.role === "staff")
    .map((t) => ({ id: t.id, name: t.full_name ?? t.username }));
  const teacherName = new Map(
    (payeeProfiles ?? []).map((t) => [t.id, t.full_name ?? t.username]),
  );
  void teacherIds;

  // Bu ay toplamı
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = expenses.filter((e) => e.expense_date.startsWith(monthKey));
  const monthTotal = thisMonth.reduce((s, e) => s + e.amount, 0);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  const monthName = now.toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });

  return (
    <PanelShell title="Giderler" profile={profile}>
      <Link
        href={profile.role === "org_admin" ? "/kurum" : "/sube"}
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← Panele dön
      </Link>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="card p-5">
          <div className="text-sm text-muted">{monthName} gideri</div>
          <div className="tabular mt-0.5 text-3xl font-bold tracking-tight">
            {formatTRY(monthTotal)}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">Bu ay kalem</div>
          <div className="tabular mt-0.5 text-3xl font-bold tracking-tight">
            {thisMonth.length}
          </div>
        </div>
      </div>

      <div className="card mb-6 p-5">
        <h3 className="mb-3 font-semibold">Yeni gider</h3>
        <ExpenseForm teachers={teachers} staff={staff} />
      </div>

      <h3 className="mb-2 font-semibold">Son giderler ({expenses.length})</h3>
      {expenses.length > 0 ? (
        <div className="card divide-y divide-border">
          {expenses.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium">
                  {EXPENSE_CATEGORY_LABEL[e.category] ?? e.category}
                  {e.teacher_id ? ` · ${teacherName.get(e.teacher_id) ?? "?"}` : ""}
                </div>
                <div className="text-xs text-muted">
                  {fmtDate(e.expense_date)}
                  {e.due_date ? ` · son ödeme: ${fmtDate(e.due_date)}` : ""}
                  {e.note ? ` · ${e.note}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="tabular font-semibold">{formatTRY(e.amount)}</span>
                <form action={deleteExpense}>
                  <input type="hidden" name="id" value={e.id} />
                  <button
                    type="submit"
                    className="text-xs font-medium text-danger hover:underline"
                  >
                    Sil
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center text-sm text-muted">
          Henüz gider kaydı yok.
        </div>
      )}
    </PanelShell>
  );
}
