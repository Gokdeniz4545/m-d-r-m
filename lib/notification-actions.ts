"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStudentLedger, getOutstanding } from "@/lib/billing";
import { paymentReminderMessage } from "@/lib/notifications";

async function requireAdmin() {
  const p = await getSessionProfile();
  if (!p || !["org_admin", "branch_admin"].includes(p.role) || !p.organization_id)
    return null;
  return p;
}

type StudentContact = {
  full_name: string | null;
  username: string;
  phone: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  organization_id: string | null;
  role: string;
};

function recipientNumber(s: {
  guardian_phone: string | null;
  phone: string | null;
}): string | null {
  const n = (s.guardian_phone || s.phone || "").trim();
  return n || null;
}

// Tek öğrenciye ödeme hatırlatması (WhatsApp).
export async function remindPayment(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;
  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) return;

  const supabase = await createClient();
  const { data: st } = await supabase
    .from("profiles")
    .select(
      "full_name, username, phone, guardian_name, guardian_phone, organization_id, role",
    )
    .eq("id", studentId)
    .maybeSingle();
  const student = st as StudentContact | null;
  if (!student || student.role !== "student") return;

  const to = recipientNumber(student);
  if (!to) return;

  const ledger = await getStudentLedger(studentId);
  if (ledger.balance <= 0.5) return; // borç yoksa gönderme

  const body = paymentReminderMessage({
    studentName: student.full_name ?? student.username,
    guardianName: student.guardian_name,
    amount: ledger.balance,
    unpaidMonths: ledger.unpaidDueCount,
  });

  await supabase.from("notifications").insert({
    organization_id: student.organization_id,
    channel: "whatsapp",
    to_number: to,
    recipient_profile_id: studentId,
    template: "payment_reminder",
    body,
    status: "queued",
    created_by: admin.id,
  });

  revalidatePath("/tahsilat");
  revalidatePath("/kurum/whatsapp");
}

// Tüm borçlulara ödeme hatırlatması.
export async function remindAllOverdue(): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;

  const { rows } = await getOutstanding();
  if (rows.length === 0) return;

  const supabase = await createClient();
  const ids = rows.map((r) => r.id);
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name, username, phone, guardian_name, guardian_phone, organization_id")
    .in("id", ids);
  const byId = new Map((profs ?? []).map((p) => [p.id, p]));

  const inserts = [];
  for (const r of rows) {
    const s = byId.get(r.id);
    if (!s) continue;
    const to = recipientNumber(s);
    if (!to) continue;
    inserts.push({
      organization_id: s.organization_id,
      channel: "whatsapp",
      to_number: to,
      recipient_profile_id: r.id,
      template: "payment_reminder",
      body: paymentReminderMessage({
        studentName: s.full_name ?? s.username,
        guardianName: s.guardian_name,
        amount: r.balance,
        unpaidMonths: r.unpaidMonths,
      }),
      status: "queued",
      created_by: admin.id,
    });
  }
  if (inserts.length > 0) {
    await supabase.from("notifications").insert(inserts);
  }
  revalidatePath("/tahsilat");
  revalidatePath("/kurum/whatsapp");
}
