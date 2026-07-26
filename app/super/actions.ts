"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAppUser } from "@/lib/user-admin";

export async function createOrgWithAdmin(
  _prev: { error: string | null; ok: boolean },
  formData: FormData,
): Promise<{ error: string | null; ok: boolean }> {
  await requireRole(["super_admin"]);

  const orgName = String(formData.get("orgName") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (orgName.length < 2) {
    return { error: "Kurum adı en az 2 karakter olmalı.", ok: false };
  }

  const admin = createAdminClient();

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: orgName })
    .select("id")
    .single();
  if (orgErr || !org) {
    return { error: "Kurum oluşturulamadı: " + (orgErr?.message ?? ""), ok: false };
  }

  const res = await createAppUser({
    username,
    password,
    fullName,
    role: "org_admin",
    organizationId: org.id,
  });
  if (!res.ok) {
    await admin.from("organizations").delete().eq("id", org.id);
    return { error: res.error, ok: false };
  }

  revalidatePath("/super");
  return { error: null, ok: true };
}
