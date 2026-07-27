import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import {
  cloudConfigured,
  exchangeCode,
  registerPhone,
  saveOrgCloud,
} from "@/lib/whatsapp-cloud";

// Embedded Signup akışı: client'tan { code, wabaId, phoneNumberId } gelir.
export async function POST(req: Request) {
  if (!cloudConfigured()) {
    return NextResponse.json({ error: "WhatsApp API yapılandırılmamış." }, { status: 400 });
  }
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "org_admin" || !profile.organization_id) {
    return NextResponse.json({ error: "Yetki yok." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "");
  const wabaId = String(body.wabaId ?? "");
  const phoneNumberId = String(body.phoneNumberId ?? "");
  const displayPhone = body.displayPhone ? String(body.displayPhone) : null;

  if (!code || !wabaId || !phoneNumberId) {
    return NextResponse.json({ error: "Eksik bilgi (code/waba/phone)." }, { status: 400 });
  }

  const token = await exchangeCode(code);
  if (!token) {
    return NextResponse.json({ error: "Token alınamadı (code geçersiz olabilir)." }, { status: 400 });
  }

  // Numarayı gönderime hazır hale getir (kayıt)
  await registerPhone(phoneNumberId, token).catch(() => null);

  await saveOrgCloud(profile.organization_id, {
    waba_id: wabaId,
    phone_number_id: phoneNumberId,
    display_phone: displayPhone,
    access_token: token,
  });

  return NextResponse.json({ ok: true });
}
