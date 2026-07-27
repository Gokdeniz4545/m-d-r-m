import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const API_VERSION = process.env.WA_API_VERSION || "v21.0";
const GRAPH = `https://graph.facebook.com/${API_VERSION}`;

export function cloudConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FB_APP_ID &&
    process.env.FB_APP_SECRET &&
    process.env.NEXT_PUBLIC_FB_CONFIG_ID
  );
}

// Embedded Signup'tan gelen code → kurumun (business) access token'ı
export async function exchangeCode(code: string): Promise<string | null> {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_FB_APP_ID ?? "",
    client_secret: process.env.FB_APP_SECRET ?? "",
    code,
  });
  const r = await fetch(`${GRAPH}/oauth/access_token?${params}`);
  const j = await r.json().catch(() => ({}));
  return j.access_token ?? null;
}

// Numarayı Cloud API'ye kaydet (gönderim öncesi bir kez gerekir)
export async function registerPhone(
  phoneNumberId: string,
  token: string,
  pin = "000000",
): Promise<{ ok: boolean; error?: string }> {
  const r = await fetch(`${GRAPH}/${phoneNumberId}/register`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", pin }),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, error: j?.error?.message };
}

export type OrgCloud = {
  waba_id: string | null;
  phone_number_id: string | null;
  display_phone: string | null;
  access_token: string | null;
  status: string;
} | null;

export async function getOrgCloud(orgId: string): Promise<OrgCloud> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("wa_cloud")
    .select("waba_id, phone_number_id, display_phone, access_token, status")
    .eq("organization_id", orgId)
    .maybeSingle();
  return (data as OrgCloud) ?? null;
}

export async function saveOrgCloud(
  orgId: string,
  creds: {
    waba_id: string;
    phone_number_id: string;
    display_phone?: string | null;
    access_token: string;
  },
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("wa_cloud").upsert(
    {
      organization_id: orgId,
      waba_id: creds.waba_id,
      phone_number_id: creds.phone_number_id,
      display_phone: creds.display_phone ?? null,
      access_token: creds.access_token,
      status: "connected",
      last_error: null,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );
}

// TR telefon → uluslararası (905xxxxxxxxx)
export function toMsisdn(phone: string): string {
  let d = String(phone).replace(/\D/g, "");
  if (d.startsWith("0")) d = "90" + d.slice(1);
  else if (d.length === 10) d = "90" + d;
  return d;
}

// Onaylı şablon mesajı gönder (işletme-başlatan hatırlatmalar için)
export async function sendTemplate(
  creds: NonNullable<OrgCloud>,
  to: string,
  templateName: string,
  lang = "tr",
  components: unknown[] = [],
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const r = await fetch(`${GRAPH}/${creds.phone_number_id}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toMsisdn(to),
      type: "template",
      template: { name: templateName, language: { code: lang }, components },
    }),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, error: j?.error?.message, id: j?.messages?.[0]?.id };
}
