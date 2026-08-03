"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type State = { error: string | null; ok: boolean };

async function requireAdmin() {
  const p = await getSessionProfile();
  if (!p || !["org_admin", "branch_admin"].includes(p.role)) return null;
  return p;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// Kalıcı öğretmen değişikliği: öğrencinin teacher_id'si değişir; haftalık slotları
// ve yaklaşan (>=bugün) oturumları yeni öğretmene taşınır. Geçmiş oturumlar (tarihçe)
// eski öğretmende kalır. Ders hakkı/telafi/borç öğrencide değişmez.
export async function changeStudentTeacher(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const actor = await requireAdmin();
  if (!actor) return { error: "Yetki yok.", ok: false };

  const studentId = String(formData.get("studentId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");
  if (!studentId) return { error: "Öğrenci yok.", ok: false };

  const supabase = await createClient();

  // Öğretmen verildiyse aynı kurumda öğretmen olmalı.
  if (teacherId) {
    const { data: t } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", teacherId)
      .eq("role", "teacher")
      .eq("organization_id", actor.organization_id!)
      .maybeSingle();
    if (!t) return { error: "Seçilen öğretmen bulunamadı.", ok: false };
  }

  const newTeacher = teacherId || null;
  const { error } = await supabase
    .from("profiles")
    .update({ teacher_id: newTeacher })
    .eq("id", studentId);
  if (error) return { error: "Değiştirilemedi: " + error.message, ok: false };

  // Haftalık slotlar + yaklaşan oturumlar yeni öğretmene
  if (newTeacher) {
    const today = ymd(new Date());
    await supabase
      .from("schedule_slots")
      .update({ teacher_id: newTeacher })
      .eq("student_id", studentId);
    await supabase
      .from("sessions")
      .update({ teacher_id: newTeacher })
      .eq("student_id", studentId)
      .gte("date", today);
  }

  revalidatePath(`/kisi/${studentId}`);
  revalidatePath("/takvim");
  return { error: null, ok: true };
}

// Tek-derslik vekil: yalnız bu oturumun öğretmeni değişir (öğrencinin asıl öğretmeni değişmez).
export async function substituteSession(formData: FormData): Promise<void> {
  const actor = await requireAdmin();
  if (!actor) return;
  const sessionId = String(formData.get("sessionId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");
  if (!sessionId || !teacherId) return;

  const supabase = await createClient();
  const { data: t } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", teacherId)
    .eq("role", "teacher")
    .eq("organization_id", actor.organization_id!)
    .maybeSingle();
  if (!t) return;

  await supabase
    .from("sessions")
    .update({ teacher_id: teacherId })
    .eq("id", sessionId);
  revalidatePath(`/oturum/${sessionId}`);
  revalidatePath("/takvim");
}
