"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function markAttendance(formData: FormData): Promise<void> {
  const p = await getSessionProfile();
  if (!p || !["org_admin", "branch_admin", "teacher"].includes(p.role)) return;

  const sessionId = String(formData.get("sessionId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!sessionId || !studentId) return;
  // Durumlar: Geldi / Gelmedi / İzinli ("geç geldi" kaldırıldı)
  if (!["present", "absent", "excused"].includes(status)) return;

  const supabase = await createClient();

  // Oturum telafi mi? + önceki yoklama durumu (telafi hakkı hesabı için)
  const { data: sess } = await supabase
    .from("sessions")
    .select("is_makeup")
    .eq("id", sessionId)
    .maybeSingle();
  const isMakeup = !!sess?.is_makeup;

  const { data: prev } = await supabase
    .from("attendance")
    .select("status")
    .eq("session_id", sessionId)
    .eq("student_id", studentId)
    .maybeSingle();
  const prevStatus = prev?.status ?? null;

  await supabase.from("attendance").upsert(
    {
      session_id: sessionId,
      student_id: studentId,
      status,
      recorded_by: p.id,
      recorded_at: new Date().toISOString(),
    },
    { onConflict: "session_id,student_id" },
  );

  // Telafi hakkı (makeup_credits):
  //  - Normal derste "İzinli" → +1 (öğrenci telafi hak eder, havuza düşer); izinliden çıkınca -1.
  //  - Telafi dersinde "Geldi" → -1 (telafi tüketildi); geldiden çıkınca +1.
  // Ders hakkı (işlenen) ayrı hesaplanır: izinli hariç yoklamalar (bkz. getStudentUsedThisMonth).
  let delta = 0;
  if (!isMakeup) {
    if (status === "excused" && prevStatus !== "excused") delta = 1;
    else if (prevStatus === "excused" && status !== "excused") delta = -1;
  } else {
    if (status === "present" && prevStatus !== "present") delta = -1;
    else if (prevStatus === "present" && status !== "present") delta = 1;
  }
  if (delta !== 0) {
    // subscriptions güncellemesi RLS'i aşmak için admin (öğretmen de işaretleyebilir).
    const admin = createAdminClient();
    const { data: sub } = await admin
      .from("subscriptions")
      .select("makeup_credits")
      .eq("student_id", studentId)
      .maybeSingle();
    if (sub) {
      const next = Math.max(0, (sub.makeup_credits ?? 0) + delta);
      await admin
        .from("subscriptions")
        .update({ makeup_credits: next })
        .eq("student_id", studentId);
    }
  }

  revalidatePath(`/oturum/${sessionId}`);
  revalidatePath(`/kisi/${studentId}`);
  revalidatePath("/kurum");
  revalidatePath("/sube");
}
