"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAppUser, autoCredentials } from "@/lib/user-admin";
import { NON_LOGIN_ROLES, type UserRole } from "@/lib/roles";

type State = { error: string | null; ok: boolean };

export async function createBranch(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const profile = await requireRole(["org_admin"]);

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (name.length < 2) {
    return { error: "Şube adı en az 2 karakter olmalı.", ok: false };
  }

  // Şube, org_admin'in kendi oturumuyla (RLS) eklenir.
  const supabase = await createClient();
  const { error } = await supabase.from("branches").insert({
    organization_id: profile.organization_id,
    name,
    address: address || null,
    phone: phone || null,
  });
  if (error) {
    return { error: "Şube oluşturulamadı: " + error.message, ok: false };
  }

  revalidatePath("/kurum");
  return { error: null, ok: true };
}

export async function createOrgUser(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const profile = await requireRole(["org_admin"]);

  const role = String(formData.get("role") ?? "") as UserRole;
  if (!["branch_admin", "teacher", "student", "staff"].includes(role)) {
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

  // Öğrenci/öğretmen/personel giriş yapmaz; kimlik otomatik üretilir.
  // Sadece yöneticiler (branch_admin) kullanıcı adı/şifre girer.
  let username = String(formData.get("username") ?? "").trim();
  let password = String(formData.get("password") ?? "");
  if (NON_LOGIN_ROLES.includes(role)) {
    ({ username, password } = autoCredentials(role));
  }

  // Seçilen şube gerçekten bu kuruma mı ait? (RLS zaten kısıtlar, çift kontrol)
  const supabase = await createClient();
  const { data: branch } = await supabase
    .from("branches")
    .select("id")
    .eq("id", branchId)
    .eq("organization_id", profile.organization_id!)
    .maybeSingle();
  if (!branch) {
    return { error: "Şube bulunamadı.", ok: false };
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

  revalidatePath("/kurum");
  return { error: null, ok: true };
}
