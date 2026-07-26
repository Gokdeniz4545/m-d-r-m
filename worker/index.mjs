// Müdürüm — WhatsApp worker (Ünite B1/B2)
// Kurum başına WhatsApp Web oturumu (Baileys). Web ile Supabase tabloları
// üzerinden konuşur: wa_sessions (durum/QR), notifications (gönderim kuyruğu).
// AYRI bir Node sürecidir (Next uygulamasına dahil değil). Geliştirmede lokal,
// canlıda 7/24 açık bir VPS'te çalışır.
//
// Çalıştırma:  node worker/index.mjs

import { readFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import pino from "pino";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import { enqueueDailyReminders } from "./scheduler.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const AUTH_DIR = join(__dirname, "auth");

// .env.local yükle
const env = readFileSync(join(ROOT, ".env.local"), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const logger = pino({ level: "silent" });

const sockets = new Map(); // organization_id -> sock
const SEND_DELAY_MS = 4000; // mesajlar arası gecikme (ban azaltma)

// Çökmeye karşı koruma: tek bir oturum hatası tüm worker'ı düşürmesin.
process.on("unhandledRejection", (e) =>
  console.error("unhandledRejection:", e?.message ?? e),
);
process.on("uncaughtException", (e) =>
  console.error("uncaughtException:", e?.message ?? e),
);

async function setSession(orgId, patch) {
  await supabase.from("wa_sessions").upsert(
    { organization_id: orgId, ...patch, updated_at: new Date().toISOString() },
    { onConflict: "organization_id" },
  );
}

async function startSession(orgId) {
  if (sockets.has(orgId)) return;
  const dir = join(AUTH_DIR, orgId);
  mkdirSync(dir, { recursive: true });

  // Numarayla bağlama isteği var mı?
  const { data: row } = await supabase
    .from("wa_sessions")
    .select("pair_phone")
    .eq("organization_id", orgId)
    .maybeSingle();
  const pairPhone = row?.pair_phone || null;

  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const sock = makeWASocket({
    auth: state,
    logger,
    browser: ["Müdürüm", "Chrome", "1.0"],
  });
  sockets.set(orgId, sock);
  sock.ev.on("creds.update", saveCreds);

  // Pairing code: telefona girilecek 8 haneli kod
  if (pairPhone && !state.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(toMsisdn(pairPhone));
        await setSession(orgId, {
          status: "qr_pending",
          qr: "PAIR:" + code,
          last_error: null,
        });
        console.log(`[${orgId}] pairing code: ${code}`);
      } catch (e) {
        await setSession(orgId, {
          status: "disconnected",
          qr: null,
          pair_phone: null,
          last_error: "Kod alınamadı: " + (e?.message ?? e),
        });
      }
    }, 3000);
  }

  sock.ev.on("connection.update", async (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr && !pairPhone) {
      const dataUrl = await QRCode.toDataURL(qr);
      await setSession(orgId, { status: "qr_pending", qr: dataUrl, last_error: null });
    }
    if (connection === "open") {
      const phone = sock.user?.id?.split(":")[0]?.split("@")[0] ?? null;
      await setSession(orgId, {
        status: "connected",
        qr: null,
        pair_phone: null,
        phone_number: phone,
        last_error: null,
      });
      console.log(`[${orgId}] bağlandı: ${phone}`);
    }
    if (connection === "close") {
      sockets.delete(orgId);
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        rmSync(dir, { recursive: true, force: true });
        await setSession(orgId, {
          status: "disconnected",
          qr: null,
          phone_number: null,
          last_error: "Oturum kapatıldı (telefondan çıkış).",
        });
        console.log(`[${orgId}] oturum kapandı.`);
      } else {
        await setSession(orgId, { status: "connect_requested", qr: null });
        setTimeout(() => startSession(orgId), 3000);
        console.log(`[${orgId}] bağlantı koptu, yeniden deneniyor...`);
      }
    }
  });
}

async function stopSession(orgId) {
  const sock = sockets.get(orgId);
  if (sock) {
    try {
      await sock.logout();
    } catch {}
    sockets.delete(orgId);
  }
  rmSync(join(AUTH_DIR, orgId), { recursive: true, force: true });
  await setSession(orgId, { status: "disconnected", qr: null, phone_number: null });
}

// TR telefon → uluslararası (905xxxxxxxxx)
function toMsisdn(phone) {
  let d = String(phone).replace(/\D/g, "");
  if (d.startsWith("0")) d = "90" + d.slice(1);
  else if (d.length === 10) d = "90" + d;
  return d;
}
// TR telefon → WhatsApp JID
function toJid(phone) {
  return toMsisdn(phone) + "@s.whatsapp.net";
}

// Bağlanması istenen / bağlı oturumları ayakta tut
async function pollConnect() {
  const { data } = await supabase
    .from("wa_sessions")
    .select("organization_id, status")
    .in("status", ["connect_requested", "qr_pending", "connected"]);
  for (const row of data ?? []) {
    if (!sockets.has(row.organization_id)) startSession(row.organization_id);
  }
}

// "disconnect" istekleri (status=disconnected ama socket açık) — kapat
async function pollDisconnect() {
  for (const orgId of sockets.keys()) {
    const { data } = await supabase
      .from("wa_sessions")
      .select("status")
      .eq("organization_id", orgId)
      .maybeSingle();
    if (data && data.status === "disconnected") await stopSession(orgId);
  }
}

// Bildirim kuyruğunu işle
let sending = false;
async function pollQueue() {
  if (sending) return;
  sending = true;
  try {
    const { data } = await supabase
      .from("notifications")
      .select("id, organization_id, to_number, body")
      .eq("status", "queued")
      .eq("channel", "whatsapp")
      .order("created_at", { ascending: true })
      .limit(20);
    for (const n of data ?? []) {
      const sock = sockets.get(n.organization_id);
      if (!sock) continue; // henüz bağlı değil → kuyrukta bekle
      if (!n.to_number) {
        await supabase
          .from("notifications")
          .update({ status: "failed", error: "Alıcı numara yok." })
          .eq("id", n.id);
        continue;
      }
      await supabase.from("notifications").update({ status: "sending" }).eq("id", n.id);
      try {
        await sock.sendMessage(toJid(n.to_number), { text: n.body });
        await supabase
          .from("notifications")
          .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
          .eq("id", n.id);
        console.log(`[${n.organization_id}] gönderildi → ${n.to_number}`);
      } catch (e) {
        await supabase
          .from("notifications")
          .update({ status: "failed", error: String(e?.message ?? e) })
          .eq("id", n.id);
        console.log(`[${n.organization_id}] HATA → ${n.to_number}: ${e?.message ?? e}`);
      }
      await new Promise((r) => setTimeout(r, SEND_DELAY_MS));
    }
  } finally {
    sending = false;
  }
}

// Günlük otomatik hatırlatma zamanlayıcısı
const SEND_HOUR = 10; // her gün saat 10:00'dan sonra bir kez
let lastSchedDay = null;
async function pollScheduler() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (now.getHours() >= SEND_HOUR && lastSchedDay !== today) {
    lastSchedDay = today;
    try {
      await enqueueDailyReminders(supabase);
    } catch (e) {
      console.error("scheduler:", e?.message ?? e);
    }
  }
}

console.log("Müdürüm WhatsApp worker başladı. (Ctrl+C ile durdur)");
setInterval(pollConnect, 3000);
setInterval(pollDisconnect, 4000);
setInterval(pollQueue, 5000);
setInterval(pollScheduler, 10 * 60 * 1000); // 10 dk'da bir kontrol
pollConnect();
