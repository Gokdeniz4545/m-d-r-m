import type { SupabaseClient } from "@supabase/supabase-js";

// Aboneliği yeniler: ders hakkını bir paket kadar uzatır, ücret kadar borç
// oluşturur (adjustment) ve renewed_at damgasını atar. Hem manuel "Yenile"
// butonu hem de otomatik yenileme (auto_renew açıkken hak bitince) bunu çağırır.
// admin = createAdminClient() (RLS bypass). createdBy: manuel yenilemede yönetici
// id'si, otomatik yenilemede null.
export async function renewSubscription(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any, any, any>,
  studentId: string,
  createdBy: string | null,
): Promise<void> {
  const { data: sub } = await admin
    .from("subscriptions")
    .select("monthly_quota, package_quota, monthly_fee")
    .eq("student_id", studentId)
    .maybeSingle();
  if (!sub) return;

  const currentQuota = Number(sub.monthly_quota ?? 0);
  const pkg = Number(sub.package_quota ?? sub.monthly_quota ?? 0);
  const fee = Number(sub.monthly_fee ?? 0);

  await admin
    .from("subscriptions")
    .update({
      monthly_quota: currentQuota + pkg,
      renewed_at: new Date().toISOString(),
      status: "active",
    })
    .eq("student_id", studentId);

  // Yenileme anında borç: yalnız PAKET modlu kurumlarda (aylık modda bu ayın
  // ücreti zaten otomatik tahakkuk ediyor — burada eklersek borç ikiye katlanır).
  if (fee > 0) {
    const { data: prof } = await admin
      .from("profiles")
      .select("organization_id")
      .eq("id", studentId)
      .maybeSingle();
    const { data: org } = prof?.organization_id
      ? await admin
          .from("organizations")
          .select("billing_mode")
          .eq("id", prof.organization_id)
          .maybeSingle()
      : { data: null };
    if (org?.billing_mode === "package") {
      await admin.from("adjustments").insert({
        student_id: studentId,
        amount: fee,
        note: "Abonelik yenileme",
        created_by: createdBy,
      });
    }
  }
}
