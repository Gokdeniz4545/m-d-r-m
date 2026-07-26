// Müdürüm — Günlük otomatik hatırlatma zamanlayıcısı (Ünite B3)
// Worker tarafından günde bir çağrılır. Vadesi geçmiş ödeme + yarınki ders
// hatırlatmalarını notifications kuyruğuna ekler. Tekrar göndermeyi önler,
// yalnız onay veren (notify_consent) ve numarası olan kişilere, yalnız
// WhatsApp'ı bağlı kurumlar için.
//
// Elle çalıştırma (test):  node worker/scheduler.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

function formatTRY(n) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);
}

function duePeriodsCount(startDate, totalMonths, now) {
  const s = new Date(startDate);
  const m =
    (now.getFullYear() - s.getFullYear()) * 12 +
    (now.getMonth() - s.getMonth()) +
    1;
  return Math.max(0, Math.min(totalMonths, m));
}

function paymentMsg({ studentName, guardianName, amount, unpaidMonths }) {
  const hitap = guardianName ? `Sayın ${guardianName}` : "Merhaba";
  const ay = unpaidMonths > 0 ? `${unpaidMonths} aylık ` : "";
  return (
    `${hitap},\n${studentName} için ${ay}ödeme bakiyesi ${formatTRY(amount)}'dir. ` +
    `Ödemenizi en kısa sürede yapmanızı rica ederiz.`
  );
}

function lessonMsg({ studentName, guardianName, dateLabel, time }) {
  const hitap = guardianName ? `Sayın ${guardianName}` : "Merhaba";
  return `${hitap},\n${studentName} için ${dateLabel} günü saat ${time} dersini hatırlatırız.`;
}

const recip = (p) => (p.guardian_phone || p.phone || "").trim() || null;

export async function enqueueDailyReminders(supabase) {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);

  // Yalnız WhatsApp'ı bağlı kurumlar
  const { data: sess } = await supabase
    .from("wa_sessions")
    .select("organization_id")
    .eq("status", "connected");
  const connected = new Set((sess ?? []).map((s) => s.organization_id));
  if (connected.size === 0) {
    console.log("[scheduler] bağlı kurum yok, atlanıyor.");
    return 0;
  }

  // Bugün zaten gönderilmiş/kuyruğa alınmışları tekrar etme
  const { data: existing } = await supabase
    .from("notifications")
    .select("recipient_profile_id, template")
    .gte("created_at", todayIso + "T00:00:00Z");
  const seen = new Set(
    (existing ?? []).map((e) => `${e.recipient_profile_id}|${e.template}`),
  );

  const inserts = [];

  // ── Ödeme hatırlatmaları ──
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("student_id, monthly_fee, total_months, start_date, status");
  const active = (subs ?? []).filter((s) => (s.status ?? "active") === "active");
  const sids = active.map((s) => s.student_id);
  if (sids.length) {
    const { data: pays } = await supabase
      .from("payments")
      .select("student_id, amount")
      .in("student_id", sids);
    const paid = new Map();
    for (const p of pays ?? [])
      paid.set(p.student_id, (paid.get(p.student_id) ?? 0) + Number(p.amount));
    const { data: profs } = await supabase
      .from("profiles")
      .select(
        "id, full_name, username, phone, guardian_name, guardian_phone, notify_consent, organization_id, role",
      )
      .in("id", sids);
    const prof = new Map((profs ?? []).map((p) => [p.id, p]));

    for (const s of active) {
      const p = prof.get(s.student_id);
      if (!p || p.role !== "student" || !p.notify_consent) continue;
      if (!connected.has(p.organization_id)) continue;
      const to = recip(p);
      if (!to) continue;
      if (seen.has(`${s.student_id}|payment_reminder`)) continue;
      const fee = Number(s.monthly_fee);
      const due = duePeriodsCount(s.start_date, Number(s.total_months) || 1, now);
      const bal = fee * due - (paid.get(s.student_id) ?? 0);
      if (bal <= 0.5) continue;
      inserts.push({
        organization_id: p.organization_id,
        channel: "whatsapp",
        to_number: to,
        recipient_profile_id: s.student_id,
        template: "payment_reminder",
        body: paymentMsg({
          studentName: p.full_name ?? p.username,
          guardianName: p.guardian_name,
          amount: bal,
          unpaidMonths: fee > 0 ? Math.round(bal / fee) : 0,
        }),
        status: "queued",
      });
    }
  }

  // ── Yarınki ders hatırlatmaları ──
  const tmr = new Date(now);
  tmr.setDate(now.getDate() + 1);
  const tmrIso = tmr.toISOString().slice(0, 10);
  const { data: sessions } = await supabase
    .from("sessions")
    .select("class_id, start_time")
    .eq("date", tmrIso);
  const classIds = [...new Set((sessions ?? []).map((s) => s.class_id))];
  if (classIds.length) {
    const timeByClass = new Map();
    for (const s of sessions ?? [])
      if (!timeByClass.has(s.class_id)) timeByClass.set(s.class_id, s.start_time);

    const { data: cls } = await supabase
      .from("classes")
      .select("id, branch_id")
      .in("id", classIds);
    const branchIds = [...new Set((cls ?? []).map((c) => c.branch_id))];
    const { data: branches } = await supabase
      .from("branches")
      .select("id, organization_id")
      .in("id", branchIds);
    const orgByBranch = new Map((branches ?? []).map((b) => [b.id, b.organization_id]));
    const orgByClass = new Map(
      (cls ?? []).map((c) => [c.id, orgByBranch.get(c.branch_id)]),
    );

    const { data: enr } = await supabase
      .from("enrollments")
      .select("class_id, student_id")
      .in("class_id", classIds);
    const studIds = [...new Set((enr ?? []).map((e) => e.student_id))];
    const prof = new Map();
    if (studIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select(
          "id, full_name, username, phone, guardian_name, guardian_phone, notify_consent, organization_id, role",
        )
        .in("id", studIds);
      for (const p of profs ?? []) prof.set(p.id, p);
    }
    const dateLabel = tmr.toLocaleDateString("tr-TR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });

    for (const e of enr ?? []) {
      const p = prof.get(e.student_id);
      if (!p || p.role !== "student" || !p.notify_consent) continue;
      const org = orgByClass.get(e.class_id);
      if (!connected.has(org)) continue;
      const to = recip(p);
      if (!to) continue;
      const key = `${e.student_id}|lesson_reminder`;
      if (seen.has(key)) continue;
      seen.add(key);
      inserts.push({
        organization_id: org,
        channel: "whatsapp",
        to_number: to,
        recipient_profile_id: e.student_id,
        template: "lesson_reminder",
        body: lessonMsg({
          studentName: p.full_name ?? p.username,
          guardianName: p.guardian_name,
          dateLabel,
          time: String(timeByClass.get(e.class_id) || "").slice(0, 5),
        }),
        status: "queued",
      });
    }
  }

  if (inserts.length) await supabase.from("notifications").insert(inserts);
  console.log(`[scheduler] ${inserts.length} hatırlatma kuyruğa eklendi.`);
  return inserts.length;
}

// Doğrudan çalıştırıldıysa: env yükle + bir kez çalıştır
// (Yol karşılaştırmasını fileURLToPath ile yap — "müdürüm"deki ü url'de kodlanıyor)
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
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
  enqueueDailyReminders(supabase).then(() => process.exit(0));
}
