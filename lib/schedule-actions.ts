"use server";

import { revalidatePath } from "next/cache";
import { getNow } from "@/lib/clock";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type State = { error: string | null; ok: boolean };

async function requireAdmin() {
  const p = await getSessionProfile();
  if (!p || !["org_admin", "branch_admin"].includes(p.role)) return null;
  return p;
}

function isoWeekday(d: Date): number {
  // 1 = Pazartesi .. 7 = Pazar
  return ((d.getDay() + 6) % 7) + 1;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function addSlot(_prev: State, formData: FormData): Promise<State> {
  if (!(await requireAdmin())) return { error: "Yetki yok.", ok: false };

  const classId = String(formData.get("classId") ?? "");
  const weekday = parseInt(String(formData.get("weekday") ?? ""), 10);
  const start = String(formData.get("start_time") ?? "");
  const end = String(formData.get("end_time") ?? "");
  if (!classId || !(weekday >= 1 && weekday <= 7) || !start || !end) {
    return { error: "Gün ve saatler gerekli.", ok: false };
  }
  if (end <= start) return { error: "Bitiş saati başlangıçtan sonra olmalı.", ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("schedule_slots").insert({
    class_id: classId,
    weekday,
    start_time: start,
    end_time: end,
  });
  if (error) return { error: "Slot eklenemedi: " + error.message, ok: false };

  revalidatePath(`/dersler/${classId}`);
  return { error: null, ok: true };
}

// Slot (ders gün/saati) düzenle. "informed" (öğrenci bilgilendirildi) zorunlu.
// Değişiklik uygulanınca bu slotun yaklaşan oturumları yeni gün/saate taşınır.
export async function updateSlot(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const slotId = String(formData.get("slotId") ?? "");
  const classId = String(formData.get("classId") ?? "");
  const weekday = parseInt(String(formData.get("weekday") ?? ""), 10);
  const start = String(formData.get("start_time") ?? "");
  const end = String(formData.get("end_time") ?? "");
  const informed = String(formData.get("informed") ?? "") === "on";
  if (!slotId || !classId || !(weekday >= 1 && weekday <= 7) || !start || !end) return;
  if (end <= start) return;
  if (!informed) return; // öğrenci bilgilendirilmeden değişiklik uygulanmaz

  const supabase = await createClient();
  await supabase
    .from("schedule_slots")
    .update({ weekday, start_time: start, end_time: end })
    .eq("id", slotId);

  // Yaklaşan dersleri yeni gün/saate taşı
  const today = await getNow();
  today.setHours(0, 0, 0, 0);
  await supabase.from("sessions").delete().eq("slot_id", slotId).gte("date", ymd(today));
  const rows: {
    class_id: string;
    date: string;
    start_time: string;
    end_time: string;
    slot_id: string;
  }[] = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (isoWeekday(d) === weekday) {
      rows.push({
        class_id: classId,
        date: ymd(d),
        start_time: start,
        end_time: end,
        slot_id: slotId,
      });
    }
  }
  if (rows.length > 0) {
    await supabase
      .from("sessions")
      .upsert(rows, { onConflict: "class_id,date,start_time", ignoreDuplicates: true });
  }

  revalidatePath(`/dersler/${classId}`);
  revalidatePath("/takvim");
}

export async function deleteSlot(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const slotId = String(formData.get("slotId") ?? "");
  const classId = String(formData.get("classId") ?? "");
  if (!slotId) return;
  const supabase = await createClient();
  await supabase.from("schedule_slots").delete().eq("id", slotId);
  if (classId) revalidatePath(`/dersler/${classId}`);
}

export async function generateSessions(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const classId = String(formData.get("classId") ?? "");
  const weeks = Math.min(12, Math.max(1, parseInt(String(formData.get("weeks") ?? "4"), 10) || 4));
  if (!classId) return;

  const supabase = await createClient();
  const { data: slots } = await supabase
    .from("schedule_slots")
    .select("id, weekday, start_time, end_time")
    .eq("class_id", classId);
  if (!slots || slots.length === 0) return;

  const rows: {
    class_id: string;
    date: string;
    start_time: string;
    end_time: string;
    slot_id: string;
  }[] = [];
  const today = await getNow();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const wd = isoWeekday(d);
    for (const s of slots) {
      if (s.weekday === wd) {
        rows.push({
          class_id: classId,
          date: ymd(d),
          start_time: s.start_time,
          end_time: s.end_time,
          slot_id: s.id,
        });
      }
    }
  }
  if (rows.length > 0) {
    await supabase
      .from("sessions")
      .upsert(rows, { onConflict: "class_id,date,start_time", ignoreDuplicates: true });
  }

  revalidatePath(`/dersler/${classId}`);
  revalidatePath("/takvim");
}

export async function addManualSession(
  _prev: State,
  formData: FormData,
): Promise<State> {
  if (!(await requireAdmin())) return { error: "Yetki yok.", ok: false };

  const classId = String(formData.get("classId") ?? "");
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start_time") ?? "");
  const end = String(formData.get("end_time") ?? "");
  const isMakeup = String(formData.get("is_makeup") ?? "") === "on";
  if (!classId || !date || !start || !end) {
    return { error: "Tarih ve saatler gerekli.", ok: false };
  }
  if (end <= start) return { error: "Bitiş saati başlangıçtan sonra olmalı.", ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("sessions").insert({
    class_id: classId,
    date,
    start_time: start,
    end_time: end,
    is_makeup: isMakeup,
  });
  if (error) {
    if (error.code === "23505")
      return { error: "Bu tarih ve saatte ders zaten var.", ok: false };
    return { error: "Ders eklenemedi: " + error.message, ok: false };
  }

  revalidatePath(`/dersler/${classId}`);
  revalidatePath("/takvim");
  return { error: null, ok: true };
}

export async function deleteSession(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const sessionId = String(formData.get("sessionId") ?? "");
  const classId = String(formData.get("classId") ?? "");
  if (!sessionId) return;
  const supabase = await createClient();
  await supabase.from("sessions").delete().eq("id", sessionId);
  if (classId) revalidatePath(`/dersler/${classId}`);
  revalidatePath("/takvim");
}
