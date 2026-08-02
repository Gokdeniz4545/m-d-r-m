"use server";

import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type BusySlot = { weekday: number; start: string; end: string };

// Öğretmenin haftalık dolu saatleri (tüm derslerinin schedule_slots'u).
export async function getTeacherWeeklyBusy(
  teacherId: string,
): Promise<BusySlot[]> {
  const p = await getSessionProfile();
  if (!p || !["org_admin", "branch_admin"].includes(p.role)) return [];
  if (!teacherId) return [];

  const supabase = await createClient();
  // Öğretmenin haftalık dolu saatleri: doğrudan slot.teacher_id üzerinden.
  const { data: slots } = await supabase
    .from("schedule_slots")
    .select("weekday, start_time, end_time")
    .eq("teacher_id", teacherId);
  return (slots ?? []).map((s) => ({
    weekday: s.weekday,
    start: s.start_time.slice(0, 5),
    end: s.end_time.slice(0, 5),
  }));
}
