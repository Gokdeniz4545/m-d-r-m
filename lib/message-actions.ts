"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStudentLedger, formatTRY } from "@/lib/billing";
import { renderTemplate } from "@/lib/render-template";

type State = { error: string | null; ok: boolean };

async function requireAdmin() {
  const p = await getSessionProfile();
  if (!p || !["org_admin", "branch_admin"].includes(p.role) || !p.organization_id)
    return null;
  return p;
}

// ── Şablon yönetimi (kurum yöneticisi) ──
export async function createTemplate(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const p = await requireAdmin();
  if (!p || p.role !== "org_admin") return { error: "Yetki yok.", ok: false };
  const name = String(formData.get("name") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (name.length < 2) return { error: "Tür adı en az 2 karakter olmalı.", ok: false };
  if (body.length < 2) return { error: "Mesaj metni gerekli.", ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("message_templates").insert({
    organization_id: p.organization_id,
    name,
    body,
    created_by: p.id,
  });
  if (error) return { error: "Kaydedilemedi: " + error.message, ok: false };
  revalidatePath("/kurum/whatsapp");
  return { error: null, ok: true };
}

export async function updateTemplate(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const p = await requireAdmin();
  if (!p || p.role !== "org_admin") return { error: "Yetki yok.", ok: false };
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!id || name.length < 2 || body.length < 2)
    return { error: "Tür adı ve metin gerekli.", ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("message_templates")
    .update({ name, body })
    .eq("id", id);
  if (error) return { error: "Güncellenemedi: " + error.message, ok: false };
  revalidatePath("/kurum/whatsapp");
  return { error: null, ok: true };
}

export async function deleteTemplate(formData: FormData): Promise<void> {
  const p = await requireAdmin();
  if (!p || p.role !== "org_admin") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("message_templates").delete().eq("id", id);
  revalidatePath("/kurum/whatsapp");
}

// ── Öğrenci profilinden mesaj gönder ──
export async function sendStudentMessage(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const p = await requireAdmin();
  if (!p) return { error: "Yetki yok.", ok: false };
  const studentId = String(formData.get("studentId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  if (!studentId || !templateId)
    return { error: "Öğrenci ve mesaj türü seçin.", ok: false };

  const supabase = await createClient();
  const { data: tpl } = await supabase
    .from("message_templates")
    .select("body")
    .eq("id", templateId)
    .maybeSingle();
  if (!tpl) return { error: "Mesaj türü bulunamadı.", ok: false };

  const { data: st } = await supabase
    .from("profiles")
    .select("full_name, username, phone, guardian_name, guardian_phone, organization_id, role")
    .eq("id", studentId)
    .maybeSingle();
  if (!st || st.role !== "student") return { error: "Öğrenci bulunamadı.", ok: false };

  const to = (st.guardian_phone || st.phone || "").trim();
  if (!to) return { error: "Öğrenci/veli telefonu yok.", ok: false };

  const ledger = await getStudentLedger(studentId);
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", st.organization_id)
    .maybeSingle();

  const body = renderTemplate(tpl.body, {
    ogrenci: st.full_name ?? st.username,
    veli: st.guardian_name ?? "",
    bakiye: formatTRY(Math.max(0, ledger.balance)),
    ay: String(ledger.unpaidDueCount),
    kurum: org?.name ?? "",
  });

  const { error } = await supabase.from("notifications").insert({
    organization_id: st.organization_id,
    channel: "whatsapp",
    to_number: to,
    recipient_profile_id: studentId,
    template: "custom",
    body,
    status: "queued",
    created_by: p.id,
  });
  if (error) return { error: "Gönderilemedi: " + error.message, ok: false };
  revalidatePath(`/kisi/${studentId}`);
  return { error: null, ok: true };
}
