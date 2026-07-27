"use server";

import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cloudConfigured,
  getOrgCloud,
  saveOrgCloud,
  registerPhone,
  sendTemplate,
} from "@/lib/whatsapp-cloud";

export type CloudStatus = {
  configured: boolean; // Meta App env'leri var mı
  connected: boolean;
  displayPhone: string | null;
};

async function requireOrgAdmin() {
  const p = await getSessionProfile();
  if (!p || p.role !== "org_admin" || !p.organization_id) return null;
  return p;
}

export async function getCloudStatus(): Promise<CloudStatus> {
  const configured = cloudConfigured();
  const p = await requireOrgAdmin();
  if (!p) return { configured, connected: false, displayPhone: null };
  const creds = await getOrgCloud(p.organization_id!);
  return {
    configured,
    connected: creds?.status === "connected",
    displayPhone: creds?.display_phone ?? null,
  };
}

// Test/manuel bağlama: Meta API Setup ekranındaki Phone Number ID + Token'ı
// doğrudan yapıştır (Embedded Signup'a gerek kalmadan gönderim testi).
export async function saveManualCloud(
  _prev: { error: string | null; ok: boolean },
  formData: FormData,
): Promise<{ error: string | null; ok: boolean }> {
  const p = await requireOrgAdmin();
  if (!p) return { error: "Yetki yok.", ok: false };
  const phoneNumberId = String(formData.get("phone_number_id") ?? "").trim();
  const token = String(formData.get("access_token") ?? "").trim();
  const displayPhone = String(formData.get("display_phone") ?? "").trim() || null;
  const wabaId = String(formData.get("waba_id") ?? "").trim() || "manual";
  if (!phoneNumberId || !token)
    return { error: "Phone Number ID ve Token gerekli.", ok: false };

  await registerPhone(phoneNumberId, token).catch(() => null);
  await saveOrgCloud(p.organization_id!, {
    waba_id: wabaId,
    phone_number_id: phoneNumberId,
    display_phone: displayPhone,
    access_token: token,
  });
  return { error: null, ok: true };
}

export async function disconnectCloud(): Promise<void> {
  const p = await requireOrgAdmin();
  if (!p) return;
  const admin = createAdminClient();
  await admin.from("wa_cloud").delete().eq("organization_id", p.organization_id);
}

// Test mesajı — Meta'nın hazır onaylı "hello_world" şablonu (en_US)
export async function sendCloudTest(
  _prev: { error: string | null; ok: boolean },
  formData: FormData,
): Promise<{ error: string | null; ok: boolean }> {
  const p = await requireOrgAdmin();
  if (!p) return { error: "Yetki yok.", ok: false };
  const to = String(formData.get("to") ?? "").trim();
  if (to.replace(/\D/g, "").length < 10) return { error: "Geçerli numara girin.", ok: false };
  const creds = await getOrgCloud(p.organization_id!);
  if (!creds || creds.status !== "connected")
    return { error: "Önce WhatsApp'ı bağla.", ok: false };
  const res = await sendTemplate(creds, to, "hello_world", "en_US");
  if (!res.ok) return { error: "Gönderilemedi: " + (res.error ?? ""), ok: false };
  return { error: null, ok: true };
}
