import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameToEmail, type UserRole, type Profile } from "@/lib/roles";

export const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

export type CreateUserInput = {
  username: string;
  password: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  notifyConsent?: boolean;
  guardianName?: string | null;
  guardianPhone?: string | null;
  role: UserRole;
  organizationId: string | null;
  branchIds?: string[];
};

export type CreateUserResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

// Auth kullanıcısı + profil (+ isteğe bağlı şube üyeliği) oluşturur.
// Service-role ile çalışır; hata olursa yarım kalan kayıtları geri alır.
export async function createAppUser(
  input: CreateUserInput,
): Promise<CreateUserResult> {
  const username = input.username.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      error: "Kullanıcı adı 3-32 karakter olmalı; sadece küçük harf, rakam, . _ -",
    };
  }
  if (input.password.length < 8) {
    return { ok: false, error: "Şifre en az 8 karakter olmalı." };
  }
  if (!input.fullName.trim()) {
    return { ok: false, error: "Ad soyad gerekli." };
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "Bu kullanıcı adı zaten kullanımda." };
  }

  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password: input.password,
    email_confirm: true,
    app_metadata: { role: input.role, organization_id: input.organizationId },
  });
  if (userErr || !created.user) {
    return { ok: false, error: "Hesap oluşturulamadı: " + (userErr?.message ?? "") };
  }

  const userId = created.user.id;

  const { error: profErr } = await admin.from("profiles").insert({
    id: userId,
    organization_id: input.organizationId,
    username,
    full_name: input.fullName.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    notify_consent: input.notifyConsent ?? false,
    guardian_name: input.guardianName?.trim() || null,
    guardian_phone: input.guardianPhone?.trim() || null,
    role: input.role,
    is_active: true,
  });
  if (profErr) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: "Profil oluşturulamadı: " + profErr.message };
  }

  if (input.branchIds && input.branchIds.length > 0) {
    const rows = input.branchIds.map((bid) => ({
      user_id: userId,
      branch_id: bid,
      role: input.role,
    }));
    const { error: bmErr } = await admin.from("branch_memberships").insert(rows);
    if (bmErr) {
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      return { ok: false, error: "Şube ataması yapılamadı: " + bmErr.message };
    }
  }

  return { ok: true, userId };
}

type ManageOk = { ok: true } | { ok: false; error: string };

// actor'ın targetId'li kullanıcıyı yönetme yetkisi var mı?
async function canManage(
  admin: SupabaseClient,
  actor: Profile,
  targetId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (actor.id === targetId) {
    return { ok: false, error: "Kendinizi buradan yönetemezsiniz." };
  }

  const { data: target } = await admin
    .from("profiles")
    .select("id, organization_id, role")
    .eq("id", targetId)
    .single();
  if (!target) return { ok: false, error: "Kullanıcı bulunamadı." };

  if (actor.role === "super_admin") {
    return target.role === "org_admin"
      ? { ok: true }
      : { ok: false, error: "Yetki yok." };
  }

  if (actor.role === "org_admin") {
    const inScope =
      target.organization_id === actor.organization_id &&
      ["branch_admin", "teacher", "student"].includes(target.role);
    return inScope ? { ok: true } : { ok: false, error: "Yetki yok." };
  }

  if (actor.role === "branch_admin") {
    if (!["teacher", "student"].includes(target.role)) {
      return { ok: false, error: "Yetki yok." };
    }
    const { data: actorBranches } = await admin
      .from("branch_memberships")
      .select("branch_id")
      .eq("user_id", actor.id)
      .eq("role", "branch_admin");
    const { data: targetBranches } = await admin
      .from("branch_memberships")
      .select("branch_id")
      .eq("user_id", targetId);
    const adminSet = new Set((actorBranches ?? []).map((b) => b.branch_id));
    const shares = (targetBranches ?? []).some((b) => adminSet.has(b.branch_id));
    return shares ? { ok: true } : { ok: false, error: "Yetki yok." };
  }

  return { ok: false, error: "Yetki yok." };
}

export async function setUserActive(
  actor: Profile,
  targetId: string,
  isActive: boolean,
): Promise<ManageOk> {
  const admin = createAdminClient();
  const auth = await canManage(admin, actor, targetId);
  if (!auth.ok) return auth;

  const { error } = await admin
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", targetId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setUserPassword(
  actor: Profile,
  targetId: string,
  newPassword: string,
): Promise<ManageOk> {
  if (newPassword.length < 8) {
    return { ok: false, error: "Şifre en az 8 karakter olmalı." };
  }
  const admin = createAdminClient();
  const auth = await canManage(admin, actor, targetId);
  if (!auth.ok) return auth;

  const { error } = await admin.auth.admin.updateUserById(targetId, {
    password: newPassword,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
