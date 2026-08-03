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

// Özel etkinlik: öğretmen + tarih + saat aralığı + serbest açıklama.
// Takvimde o saatleri kapatır (üstüne ders planlanamaz). Tek seferlik.
export async function addCalendarEvent(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const actor = await requireAdmin();
  if (!actor) return { error: "Yetki yok.", ok: false };

  const teacherId = String(formData.get("teacherId") ?? "");
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start_time") ?? "");
  const end = String(formData.get("end_time") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  if (
    !teacherId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}$/.test(start) ||
    !/^\d{2}:\d{2}$/.test(end)
  )
    return { error: "Öğretmen, tarih ve saat aralığı gerekli.", ok: false };
  if (end <= start)
    return { error: "Bitiş saati başlangıçtan sonra olmalı.", ok: false };

  const supabase = await createClient();
  const { data: t } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", teacherId)
    .eq("role", "teacher")
    .eq("organization_id", actor.organization_id!)
    .maybeSingle();
  if (!t) return { error: "Öğretmen bulunamadı.", ok: false };

  const { error } = await supabase.from("calendar_events").insert({
    organization_id: actor.organization_id,
    teacher_id: teacherId,
    date,
    start_time: start,
    end_time: end,
    description: description || null,
    created_by: actor.id,
  });
  if (error) return { error: "Etkinlik eklenemedi: " + error.message, ok: false };

  revalidatePath("/takvim");
  return { error: null, ok: true };
}

export async function deleteCalendarEvent(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("calendar_events").delete().eq("id", id);
  revalidatePath("/takvim");
}
