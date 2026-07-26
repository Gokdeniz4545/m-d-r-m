"use server";

import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type WaStatus = {
  status: "disconnected" | "connect_requested" | "qr_pending" | "connected";
  qr: string | null; // data URL (PNG)
  phoneNumber: string | null;
  error: string | null;
};

async function requireOrgAdmin() {
  const p = await getSessionProfile();
  if (!p || p.role !== "org_admin" || !p.organization_id) return null;
  return p;
}

export async function getWaStatus(): Promise<WaStatus> {
  const p = await requireOrgAdmin();
  if (!p) return { status: "disconnected", qr: null, phoneNumber: null, error: null };
  const supabase = await createClient();
  const { data } = await supabase
    .from("wa_sessions")
    .select("status, qr, phone_number, last_error")
    .eq("organization_id", p.organization_id)
    .maybeSingle();
  return {
    status: (data?.status as WaStatus["status"]) ?? "disconnected",
    qr: data?.qr ?? null,
    phoneNumber: data?.phone_number ?? null,
    error: data?.last_error ?? null,
  };
}

export async function requestWaConnect(): Promise<void> {
  const p = await requireOrgAdmin();
  if (!p) return;
  const supabase = await createClient();
  await supabase.from("wa_sessions").upsert(
    {
      organization_id: p.organization_id,
      status: "connect_requested",
      qr: null,
      pair_phone: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );
}

// Numarayla (pairing code) bağlama: telefona kod girerek.
export async function requestWaPairing(phone: string): Promise<void> {
  const p = await requireOrgAdmin();
  if (!p) return;
  const clean = String(phone).replace(/\D/g, "");
  if (clean.length < 10) return;
  const supabase = await createClient();
  await supabase.from("wa_sessions").upsert(
    {
      organization_id: p.organization_id,
      status: "connect_requested",
      qr: null,
      pair_phone: clean,
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );
}

export async function disconnectWa(): Promise<void> {
  const p = await requireOrgAdmin();
  if (!p) return;
  const supabase = await createClient();
  await supabase
    .from("wa_sessions")
    .update({ status: "disconnected", qr: null, phone_number: null })
    .eq("organization_id", p.organization_id);
}
