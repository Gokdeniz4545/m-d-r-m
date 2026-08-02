"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAppUser, autoCredentials } from "@/lib/user-admin";
import type { UserRole } from "@/lib/roles";

type State = { error: string | null; ok: boolean };

// Öğrenci kişisel/iletişim bilgilerini güncelle (TC, adres, telefon, e-posta, veli).
export async function updatePersonContact(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const actor = await getSessionProfile();
  if (!actor || !["org_admin", "branch_admin"].includes(actor.role)) {
    return { error: "Yetki yok.", ok: false };
  }
  const personId = String(formData.get("personId") ?? "");
  if (!personId) return { error: "Kişi seçilmedi.", ok: false };
  const tc = String(formData.get("tc_kimlik_no") ?? "").trim();
  if (tc && !/^\d{11}$/.test(tc))
    return { error: "TC kimlik no 11 haneli olmalı.", ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      tc_kimlik_no: tc || null,
      address: String(formData.get("address") ?? "").trim() || null,
      guardian_name: String(formData.get("guardian_name") ?? "").trim() || null,
      guardian_phone: String(formData.get("guardian_phone") ?? "").trim() || null,
    })
    .eq("id", personId);
  if (error) return { error: "Güncellenemedi: " + error.message, ok: false };

  revalidatePath(`/kisi/${personId}`);
  return { error: null, ok: true };
}

export async function quickAddUser(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const actor = await getSessionProfile();
  if (!actor || !["org_admin", "branch_admin"].includes(actor.role)) {
    return { error: "Yetki yok.", ok: false };
  }

  const role = String(formData.get("role") ?? "") as UserRole;
  if (!["student", "teacher"].includes(role)) {
    return { error: "Geçersiz rol.", ok: false };
  }
  const branchId = String(formData.get("branchId") ?? "");
  if (!branchId) return { error: "Şube seçilmeli.", ok: false };

  const fullName = String(formData.get("fullName") ?? "").trim();
  // Öğrenci/öğretmen giriş yapmaz — kimlik otomatik üretilir.
  const { username, password } = autoCredentials(role);
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const notifyConsent = formData.get("notifyConsent") != null;

  const supabase = await createClient();
  let allowed = false;
  if (actor.role === "org_admin") {
    const { data } = await supabase
      .from("branches")
      .select("id")
      .eq("id", branchId)
      .eq("organization_id", actor.organization_id!)
      .maybeSingle();
    allowed = !!data;
  } else {
    const { data } = await supabase
      .from("branch_memberships")
      .select("id")
      .eq("user_id", actor.id)
      .eq("branch_id", branchId)
      .eq("role", "branch_admin")
      .maybeSingle();
    allowed = !!data;
  }
  if (!allowed) return { error: "Bu şubede yetkiniz yok.", ok: false };

  const res = await createAppUser({
    username,
    password,
    fullName,
    phone,
    email,
    notifyConsent,
    role,
    organizationId: actor.organization_id,
    branchIds: [branchId],
  });
  if (!res.ok) return { error: res.error, ok: false };

  // Öğretmen ise: hakediş ayarı
  if (role === "teacher") {
    const compType = String(formData.get("comp_type") ?? "");
    const rate = Number(String(formData.get("rate") ?? "").replace(",", "."));
    if (["per_session", "monthly"].includes(compType) && rate >= 0) {
      await supabase.from("teacher_compensation").upsert(
        { teacher_id: res.userId, comp_type: compType, rate },
        { onConflict: "teacher_id" },
      );
    }
  }

  revalidatePath("/kurum");
  revalidatePath("/sube");
  return { error: null, ok: true };
}
