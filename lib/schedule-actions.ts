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

function isoWeekday(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1;
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
// Ders 45 dk (3×15 dk slot). Başlangıçtan bitiş.
function end45(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const t = h * 60 + m + 45;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

// Haftalık ders: slot (desen) + önümüzdeki 4 haftanın oturumları.
export async function addWeeklyLesson(
  _prev: State,
  formData: FormData,
): Promise<State> {
  if (!(await requireAdmin())) return { error: "Yetki yok.", ok: false };
  const studentId = String(formData.get("studentId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");
  const weekday = parseInt(String(formData.get("weekday") ?? ""), 10);
  const start = String(formData.get("start_time") ?? "");
  if (
    !studentId ||
    !teacherId ||
    !(weekday >= 1 && weekday <= 7) ||
    !/^\d{2}:\d{2}$/.test(start)
  )
    return { error: "Öğrenci, öğretmen, gün ve saat gerekli.", ok: false };
  const end = end45(start);

  const supabase = await createClient();
  const { data: slot, error } = await supabase
    .from("schedule_slots")
    .insert({
      student_id: studentId,
      teacher_id: teacherId,
      weekday,
      start_time: start,
      end_time: end,
    })
    .select("id")
    .single();
  if (error || !slot)
    return { error: "Ders eklenemedi: " + (error?.message ?? ""), ok: false };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows: {
    student_id: string;
    teacher_id: string;
    date: string;
    start_time: string;
    end_time: string;
    slot_id: string;
  }[] = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (isoWeekday(d) === weekday)
      rows.push({
        student_id: studentId,
        teacher_id: teacherId,
        date: ymd(d),
        start_time: start,
        end_time: end,
        slot_id: slot.id,
      });
  }
  if (rows.length > 0) await supabase.from("sessions").insert(rows);

  revalidatePath("/takvim");
  return { error: null, ok: true };
}

// Tek seferlik ders/oturum (belirli tarih). Telafi de olabilir.
export async function addOneoffSession(
  _prev: State,
  formData: FormData,
): Promise<State> {
  if (!(await requireAdmin())) return { error: "Yetki yok.", ok: false };
  const studentId = String(formData.get("studentId") ?? "");
  const teacherId = String(formData.get("teacherId") ?? "");
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start_time") ?? "");
  const isMakeup = String(formData.get("is_makeup") ?? "") === "on";
  if (
    !studentId ||
    !teacherId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}$/.test(start)
  )
    return { error: "Öğrenci, öğretmen, tarih ve saat gerekli.", ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("sessions").insert({
    student_id: studentId,
    teacher_id: teacherId,
    date,
    start_time: start,
    end_time: end45(start),
    is_makeup: isMakeup,
  });
  if (error) return { error: "Ders eklenemedi: " + error.message, ok: false };
  revalidatePath("/takvim");
  return { error: null, ok: true };
}

// Rutin değişiklik: slotu güncelle + yaklaşan oturumları (>=bugün) yeniden üret.
export async function updateLesson(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const slotId = String(formData.get("slotId") ?? "");
  const weekday = parseInt(String(formData.get("weekday") ?? ""), 10);
  const start = String(formData.get("start_time") ?? "");
  if (!slotId || !(weekday >= 1 && weekday <= 7) || !/^\d{2}:\d{2}$/.test(start))
    return;
  const end = end45(start);

  const supabase = await createClient();
  const { data: slot } = await supabase
    .from("schedule_slots")
    .select("student_id, teacher_id")
    .eq("id", slotId)
    .maybeSingle();
  if (!slot) return;

  await supabase
    .from("schedule_slots")
    .update({ weekday, start_time: start, end_time: end })
    .eq("id", slotId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await supabase.from("sessions").delete().eq("slot_id", slotId).gte("date", ymd(today));
  const rows: {
    student_id: string;
    teacher_id: string;
    date: string;
    start_time: string;
    end_time: string;
    slot_id: string;
  }[] = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (isoWeekday(d) === weekday)
      rows.push({
        student_id: slot.student_id,
        teacher_id: slot.teacher_id,
        date: ymd(d),
        start_time: start,
        end_time: end,
        slot_id: slotId,
      });
  }
  if (rows.length > 0) await supabase.from("sessions").insert(rows);
  revalidatePath("/takvim");
}

// O haftaya özel: tek oturumu taşı (desen/slot değişmez).
export async function moveSession(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const sessionId = String(formData.get("sessionId") ?? "");
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start_time") ?? "");
  if (!sessionId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start))
    return;
  const supabase = await createClient();
  await supabase
    .from("sessions")
    .update({ date, start_time: start, end_time: end45(start) })
    .eq("id", sessionId);
  revalidatePath("/takvim");
}

// Haftalık dersi bitir: slot + yaklaşan oturumları sil (geçmiş kalır).
export async function deleteLesson(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const slotId = String(formData.get("slotId") ?? "");
  if (!slotId) return;
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await supabase.from("sessions").delete().eq("slot_id", slotId).gte("date", ymd(today));
  await supabase.from("schedule_slots").delete().eq("id", slotId);
  revalidatePath("/takvim");
}

export async function deleteSession(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return;
  const supabase = await createClient();
  await supabase.from("sessions").delete().eq("id", sessionId);
  revalidatePath("/takvim");
}
