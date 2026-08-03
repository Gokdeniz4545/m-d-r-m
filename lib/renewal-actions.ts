"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renewSubscription } from "@/lib/renewal-core";

async function requireAdmin() {
  const p = await getSessionProfile();
  if (!p || !["org_admin", "branch_admin"].includes(p.role)) return null;
  return p;
}

// Otomatik yenileme şalteri (aç/kapat).
export async function setAutoRenew(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const studentId = String(formData.get("studentId") ?? "");
  const on = String(formData.get("on") ?? "") === "true";
  if (!studentId) return;
  const supabase = await createClient();
  await supabase
    .from("subscriptions")
    .update({ auto_renew: on })
    .eq("student_id", studentId);
  revalidatePath(`/kisi/${studentId}`);
  revalidatePath("/sube");
  revalidatePath("/kurum");
}

// Yenile: pasif öğrenciyi aktif yap + oto-yenilemeyi aç + aboneliği yenile
// (ders hakkını paket kadar uzat + borç oluştur + renewed_at damgala).
export async function renewStudent(formData: FormData): Promise<void> {
  const actor = await requireAdmin();
  if (!actor) return;
  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) return;
  const admin = createAdminClient();
  await admin.from("profiles").update({ is_active: true }).eq("id", studentId);
  await admin
    .from("subscriptions")
    .update({ auto_renew: true })
    .eq("student_id", studentId);
  await renewSubscription(admin, studentId, actor.id);
  revalidatePath(`/kisi/${studentId}`);
  revalidatePath("/sube");
  revalidatePath("/kurum");
}
