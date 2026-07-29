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
  // Hem birincil öğretmen (classes.teacher_id) hem çoklu öğretmen (class_teachers)
  const [{ data: primary }, { data: co }] = await Promise.all([
    supabase.from("classes").select("id").eq("teacher_id", teacherId),
    supabase.from("class_teachers").select("class_id").eq("teacher_id", teacherId),
  ]);
  const ids = [
    ...new Set([
      ...(primary ?? []).map((c) => c.id),
      ...(co ?? []).map((c) => c.class_id),
    ]),
  ];
  if (ids.length === 0) return [];

  const { data: slots } = await supabase
    .from("schedule_slots")
    .select("weekday, start_time, end_time")
    .in("class_id", ids);
  return (slots ?? []).map((s) => ({
    weekday: s.weekday,
    start: s.start_time.slice(0, 5),
    end: s.end_time.slice(0, 5),
  }));
}
