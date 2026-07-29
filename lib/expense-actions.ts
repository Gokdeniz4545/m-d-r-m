"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type State = { error: string | null; ok: boolean };

function num(v: FormDataEntryValue | null): number {
  return Number(String(v ?? "").replace(",", "."));
}

async function requireAdmin() {
  const p = await getSessionProfile();
  if (!p || !["org_admin", "branch_admin"].includes(p.role)) return null;
  return p;
}

export async function addExpense(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Yetki yok.", ok: false };

  const category = String(formData.get("category") ?? "");
  const amount = num(formData.get("amount"));
  const expenseDate = String(formData.get("expense_date") ?? "");
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const teacherId = String(formData.get("teacher_id") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim();

  if (!category) return { error: "Kategori seçin.", ok: false };
  if (!(amount > 0)) return { error: "Geçerli tutar girin.", ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    organization_id: admin.organization_id,
    category,
    amount,
    expense_date: expenseDate || new Date().toISOString().slice(0, 10),
    due_date: /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : null,
    teacher_id: category === "maas" ? teacherId : null,
    note: note || null,
    created_by: admin.id,
  });
  if (error) return { error: "Gider kaydedilemedi: " + error.message, ok: false };

  revalidatePath("/giderler");
  revalidatePath("/raporlar");
  return { error: null, ok: true };
}

export async function deleteExpense(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", id);
  revalidatePath("/giderler");
  revalidatePath("/raporlar");
}
