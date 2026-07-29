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

export async function setSubscription(
  _prev: State,
  formData: FormData,
): Promise<State> {
  if (!(await requireAdmin())) return { error: "Yetki yok.", ok: false };

  const studentId = String(formData.get("studentId") ?? "");
  const monthlyFee = num(formData.get("monthly_fee"));
  const monthlyQuota = parseInt(String(formData.get("monthly_quota") ?? "0"), 10);
  const totalMonths = parseInt(String(formData.get("total_months") ?? "1"), 10);
  const startDate = String(formData.get("start_date") ?? "");
  const openingUsed = parseInt(String(formData.get("opening_used") ?? "0"), 10) || 0;
  const openingBalance = num(formData.get("opening_balance")) || 0;

  if (!studentId) return { error: "Öğrenci yok.", ok: false };
  if (!(monthlyFee >= 0)) return { error: "Geçerli aylık ücret girin.", ok: false };
  if (!(monthlyQuota >= 0)) return { error: "Geçerli ders hakkı girin.", ok: false };
  if (!(totalMonths >= 1 && totalMonths <= 12))
    return { error: "Abonelik 1-12 ay olmalı.", ok: false };

  const now = new Date();
  const curPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const supabase = await createClient();
  const { error } = await supabase.from("subscriptions").upsert(
    {
      student_id: studentId,
      monthly_fee: monthlyFee,
      monthly_quota: monthlyQuota,
      total_months: totalMonths,
      start_date: startDate || now.toISOString().slice(0, 10),
      status: "active",
      opening_used: openingUsed,
      opening_period: openingUsed > 0 ? curPeriod : null,
      opening_balance: openingBalance,
    },
    { onConflict: "student_id" },
  );
  if (error) return { error: "Abonelik kaydedilemedi: " + error.message, ok: false };

  revalidatePath(`/kisi/${studentId}`);
  return { error: null, ok: true };
}

export async function recordPayment(
  _prev: State,
  formData: FormData,
): Promise<State> {
  if (!(await requireAdmin())) return { error: "Yetki yok.", ok: false };

  const studentId = String(formData.get("studentId") ?? "");
  const amount = num(formData.get("amount"));
  const period = String(formData.get("period") ?? "");
  const paidAt = String(formData.get("paidAt") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!studentId) return { error: "Öğrenci yok.", ok: false };
  if (!(amount > 0)) return { error: "Geçerli tutar girin.", ok: false };
  if (!/^\d{4}-\d{2}$/.test(period)) return { error: "Dönem (ay) seçin.", ok: false };
  if (paidAt && !/^\d{4}-\d{2}-\d{2}$/.test(paidAt))
    return { error: "Ödeme tarihi geçersiz.", ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    student_id: studentId,
    amount,
    period_month: period + "-01",
    // Tam tarih girildiyse onu kullan (öğlen 12:00 → saat dilimi kaymasını önler),
    // boşsa varsayılan now().
    paid_at: paidAt ? paidAt + "T12:00:00" : undefined,
    note: note || null,
  });
  if (error) return { error: "Ödeme kaydedilemedi: " + error.message, ok: false };

  revalidatePath(`/kisi/${studentId}`);
  revalidatePath("/raporlar");
  return { error: null, ok: true };
}

export async function deletePayment(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const id = String(formData.get("id") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("payments").delete().eq("id", id);
  if (studentId) revalidatePath(`/kisi/${studentId}`);
  revalidatePath("/raporlar");
}
