"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAppUser } from "@/lib/user-admin";
import type { UserRole } from "@/lib/roles";

type State = { error: string | null; ok: boolean };

export async function createBranchUser(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const profile = await requireRole(["branch_admin"]);

  const role = String(formData.get("role") ?? "") as UserRole;
  // Şube yöneticisi öğretmen/öğrenci/personel oluşturabilir (başka şube yöneticisi DEĞİL).
  if (!["teacher", "student", "staff"].includes(role)) {
    return { error: "Geçersiz rol.", ok: false };
  }
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const guardianName = String(formData.get("guardianName") ?? "").trim();
  const guardianPhone = String(formData.get("guardianPhone") ?? "").trim();
  const notifyConsent = formData.get("notifyConsent") != null;
  const branchId = String(formData.get("branchId") ?? "").trim();
  if (!branchId) {
    return { error: "Şube seçilmeli.", ok: false };
  }

  // Personel giriş yapmaz; kimlik otomatik üretilir (sadece maaş kaydı için).
  let username = String(formData.get("username") ?? "").trim();
  let password = String(formData.get("password") ?? "");
  if (role === "staff") {
    username = "personel." + crypto.randomUUID().replace(/-/g, "").slice(0, 10);
    password = crypto.randomUUID().replace(/-/g, "");
  }

  // Bu şube yöneticisi gerçekten bu şubeyi mi yönetiyor?
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("branch_memberships")
    .select("branch_id")
    .eq("user_id", profile.id)
    .eq("branch_id", branchId)
    .eq("role", "branch_admin")
    .maybeSingle();
  if (!m) {
    return { error: "Bu şubede yetkiniz yok.", ok: false };
  }

  const res = await createAppUser({
    username,
    password,
    fullName,
    phone,
    email,
    notifyConsent,
    guardianName: role === "student" ? guardianName : null,
    guardianPhone: role === "student" ? guardianPhone : null,
    role,
    organizationId: profile.organization_id,
    branchIds: [branchId],
  });
  if (!res.ok) {
    return { error: res.error, ok: false };
  }

  revalidatePath("/sube");
  return { error: null, ok: true };
}
