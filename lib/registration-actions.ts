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

// Tek formdan tam öğrenci kaydı: öğrenci + branş + birebir ders + kayıt + abonelik + program.
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
  const notifyConsent = formData.get("notifyConsent") != null;
  const subjectIdInput = String(formData.get("subjectId") ?? "");
  const newSubject = String(formData.get("newSubject") ?? "").trim();
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
  const curPeriod = startDate.slice(0, 7);

  if (!branchId) return { error: "Şube seçilmeli.", ok: false };
  const hasExistingSubject = subjectIdInput !== "" && subjectIdInput !== "__new__";
  if (!hasExistingSubject && newSubject.length < 2) {
    return { error: "Branş seçin veya yeni branş adı girin.", ok: false };
  }

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

  // 1) Öğrenci hesabı
  const userRes = await createAppUser({
    username,
    password,
    fullName,
    phone,
    email,
    notifyConsent,
    guardianName,
    guardianPhone,
    role: "student",
    organizationId: actor.organization_id,
    branchIds: [branchId],
  });
  if (!userRes.ok) return { error: userRes.error, ok: false };
  const studentId = userRes.userId;

  const admin = createAdminClient();
  const rollback = async () => {
    await admin.from("profiles").delete().eq("id", studentId);
    await admin.auth.admin.deleteUser(studentId);
  };

  // 2) Branş: seçilen veya yeni
  let subjectId: string;
  let subjectName: string;
  if (hasExistingSubject) {
    const { data: s } = await admin
      .from("subjects")
      .select("id, name")
      .eq("id", subjectIdInput)
      .eq("organization_id", actor.organization_id!)
      .maybeSingle();
    if (!s) {
      await rollback();
      return { error: "Branş bulunamadı.", ok: false };
    }
    subjectId = s.id;
    subjectName = s.name;
  } else {
    subjectName = newSubject;
    const { data: existingSubject } = await admin
      .from("subjects")
      .select("id")
      .eq("organization_id", actor.organization_id!)
      .eq("name", subjectName)
      .maybeSingle();
    if (existingSubject) {
      subjectId = existingSubject.id;
    } else {
      const { data: created, error } = await admin
        .from("subjects")
        .insert({ organization_id: actor.organization_id, name: subjectName })
        .select("id")
        .single();
      if (error || !created) {
        await rollback();
        return { error: "Branş oluşturulamadı.", ok: false };
      }
      subjectId = created.id;
    }
  }

  // 3) Birebir ders
  const { data: cls, error: clsErr } = await admin
    .from("classes")
    .insert({
      branch_id: branchId,
      subject_id: subjectId,
      teacher_id: teacherId || null,
      name: `${subjectName} (${fullName})`,
      type: "one_on_one",
      capacity: 1,
    })
    .select("id")
    .single();
  if (clsErr || !cls) {
    await rollback();
    return { error: "Ders oluşturulamadı: " + (clsErr?.message ?? ""), ok: false };
  }

  // 4) Kayıt
  await admin.from("enrollments").insert({ class_id: cls.id, student_id: studentId });

  // 5) Abonelik
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
    },
    { onConflict: "student_id" },
  );

  // 5b) Kayıtta ödeme alındıysa kaydet
  if (initialPayment > 0) {
    await admin.from("payments").insert({
      student_id: studentId,
      amount: initialPayment,
      period_month: startDate.slice(0, 7) + "-01",
      note: "Kayıt ödemesi",
    });
  }

  // 6) Haftalık program + oturumlar (geçerli gün/saat girildiyse)
  if (weekday >= 1 && weekday <= 7 && startTime && endTime && endTime > startTime) {
    const { data: slot } = await admin
      .from("schedule_slots")
      .insert({
        class_id: cls.id,
        weekday,
        start_time: startTime,
        end_time: endTime,
      })
      .select("id")
      .single();
    if (slot) {
      const rows: {
        class_id: string;
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
            class_id: cls.id,
            date: ymd(d),
            start_time: startTime,
            end_time: endTime,
            slot_id: slot.id,
          });
        }
      }
      if (rows.length > 0) {
        await admin
          .from("sessions")
          .upsert(rows, {
            onConflict: "class_id,date,start_time",
            ignoreDuplicates: true,
          });
      }
    }
  }

  revalidatePath("/kurum");
  revalidatePath("/sube");
  revalidatePath("/dersler");
  revalidatePath("/takvim");
  return { error: null, ok: true, studentId };
}
