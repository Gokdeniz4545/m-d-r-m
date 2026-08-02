"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAppUser, autoCredentials } from "@/lib/user-admin";

type State = { error: string | null; ok: boolean; studentId?: string };

function num(v: FormDataEntryValue | null): number {
  return Number(String(v ?? "").replace(",", "."));
}
function isoWeekday(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1;
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// Tek formdan öğrenci kaydı: öğrenci + öğretmen ataması + abonelik (ders hakkı) + haftalık program.
// "Ders/branş" kavramı yok — öğrenci doğrudan bir öğretmene bağlanır (profiles.teacher_id).
export async function registerStudent(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const actor = await getSessionProfile();
  if (!actor || !["org_admin", "branch_admin"].includes(actor.role)) {
    return { error: "Yetki yok.", ok: false };
  }

  const branchId = String(formData.get("branchId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  // Öğrenci giriş yapmaz — kimlik otomatik üretilir.
  const { username, password } = autoCredentials("student");
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const guardianName = String(formData.get("guardianName") ?? "").trim();
  const guardianPhone = String(formData.get("guardianPhone") ?? "").trim();
  const tcKimlik = String(formData.get("tc_kimlik_no") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const notifyConsent = formData.get("notifyConsent") != null;
  const teacherId = String(formData.get("teacherId") ?? "");
  const monthlyFee = num(formData.get("monthly_fee"));
  const monthlyQuota = parseInt(String(formData.get("monthly_quota") ?? "0"), 10);
  const totalMonthsRaw = parseInt(String(formData.get("total_months") ?? "1"), 10);
  const totalMonths = totalMonthsRaw >= 1 && totalMonthsRaw <= 12 ? totalMonthsRaw : 1;
  const weekday = parseInt(String(formData.get("weekday") ?? ""), 10);
  const startTime = String(formData.get("start_time") ?? "");
  const endTime = String(formData.get("end_time") ?? "");
  const startDateInput = String(formData.get("start_date") ?? "").trim();
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(startDateInput)
    ? startDateInput
    : new Date().toISOString().slice(0, 10);
  const initialPayment = num(formData.get("initial_payment"));
  const openingUsed = parseInt(String(formData.get("opening_used") ?? "0"), 10) || 0;
  const openingBalance = num(formData.get("opening_balance")) || 0;
  const makeupCredits =
    parseInt(String(formData.get("makeup_credits") ?? "0"), 10) || 0;
  // Devir (bu ay önceden kullanılmış ders) geçişin YAPILDIĞI aya bağlanır.
  const curPeriod = new Date().toISOString().slice(0, 7);

  if (!branchId) return { error: "Şube seçilmeli.", ok: false };
  if (tcKimlik && !/^\d{11}$/.test(tcKimlik))
    return { error: "TC kimlik no 11 haneli olmalı.", ok: false };

  // Şube yetkisi
  const supabase = await createClient();
  let allowed = false;
  if (actor.role === "org_admin") {
    const { data } = await supabase
      .from("branches")
      .select("id")
      .eq("id", branchId)
      .eq("organization_id", actor.organization_id!)
      .maybeSingle();
    allowed = !!data;
  } else {
    const { data } = await supabase
      .from("branch_memberships")
      .select("id")
      .eq("user_id", actor.id)
      .eq("branch_id", branchId)
      .eq("role", "branch_admin")
      .maybeSingle();
    allowed = !!data;
  }
  if (!allowed) return { error: "Bu şubede yetkiniz yok.", ok: false };

  // Öğretmen (opsiyonel) — verildiyse aynı kurumda öğretmen olmalı.
  let validTeacherId: string | null = null;
  if (teacherId) {
    const { data: t } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", teacherId)
      .eq("role", "teacher")
      .eq("organization_id", actor.organization_id!)
      .maybeSingle();
    if (!t) return { error: "Seçilen öğretmen bulunamadı.", ok: false };
    validTeacherId = t.id;
  }

  // 1) Öğrenci hesabı (+ öğretmen ataması)
  const userRes = await createAppUser({
    username,
    password,
    fullName,
    phone,
    email,
    notifyConsent,
    guardianName,
    guardianPhone,
    tcKimlik,
    address,
    teacherId: validTeacherId,
    role: "student",
    organizationId: actor.organization_id,
    branchIds: [branchId],
  });
  if (!userRes.ok) return { error: userRes.error, ok: false };
  const studentId = userRes.userId;

  const admin = createAdminClient();

  // 2) Abonelik (ders hakkı / telafi / borç)
  await admin.from("subscriptions").upsert(
    {
      student_id: studentId,
      monthly_fee: monthlyFee >= 0 ? monthlyFee : 0,
      monthly_quota: monthlyQuota >= 0 ? monthlyQuota : 0,
      total_months: totalMonths,
      start_date: startDate,
      status: "active",
      opening_used: openingUsed,
      opening_period: openingUsed > 0 ? curPeriod : null,
      opening_balance: openingBalance,
      makeup_credits: makeupCredits,
    },
    { onConflict: "student_id" },
  );

  // 2b) Kayıtta ödeme alındıysa kaydet
  if (initialPayment > 0) {
    await admin.from("payments").insert({
      student_id: studentId,
      amount: initialPayment,
      period_month: startDate.slice(0, 7) + "-01",
      note: "Kayıt ödemesi",
    });
  }

  // 3) Haftalık program + oturumlar (öğretmen seçildiyse ve geçerli gün/saat girildiyse)
  if (
    validTeacherId &&
    weekday >= 1 &&
    weekday <= 7 &&
    startTime &&
    endTime &&
    endTime > startTime
  ) {
    const { data: slot } = await admin
      .from("schedule_slots")
      .insert({
        student_id: studentId,
        teacher_id: validTeacherId,
        weekday,
        start_time: startTime,
        end_time: endTime,
      })
      .select("id")
      .single();
    if (slot) {
      const rows: {
        student_id: string;
        teacher_id: string;
        date: string;
        start_time: string;
        end_time: string;
        slot_id: string;
      }[] = [];
      const base = new Date(startDate + "T00:00:00");
      for (let i = 0; i < 28; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        if (isoWeekday(d) === weekday) {
          rows.push({
            student_id: studentId,
            teacher_id: validTeacherId,
            date: ymd(d),
            start_time: startTime,
            end_time: endTime,
            slot_id: slot.id,
          });
        }
      }
      if (rows.length > 0) {
        // Yeni öğrenci; çakışma yok — düz insert.
        await admin.from("sessions").insert(rows);
      }
    }
  }

  revalidatePath("/kurum");
  revalidatePath("/sube");
  revalidatePath("/takvim");
  return { error: null, ok: true, studentId };
}
