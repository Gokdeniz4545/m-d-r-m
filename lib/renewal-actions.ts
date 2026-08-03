"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

// Yenile: pasif öğrenciyi aktif yap + oto-yenilemeyi aç.
// (Yeni paket ders hakkı/ücreti ve program, öğretmen randevu sihirbazından ayarlanır.)
export async function renewStudent(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ is_active: true }).eq("id", studentId);
  await supabase
    .from("subscriptions")
    .update({ auto_renew: true })
    .eq("student_id", studentId);
  revalidatePath(`/kisi/${studentId}`);
  revalidatePath("/sube");
  revalidatePath("/kurum");
}
