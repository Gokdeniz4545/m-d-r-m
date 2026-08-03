import { createClient } from "@/lib/supabase/server";

export type MakeupPoolRow = {
  id: string;
  name: string;
  credits: number;
  teacherId: string | null;
  teacherName: string | null;
};

// Telafi havuzu: telafi hakkı (makeup_credits) > 0 olan öğrenciler.
// RLS abonelikleri yöneticinin kurumuna kısıtlar.
export async function getMakeupPool(): Promise<MakeupPoolRow[]> {
  const supabase = await createClient();
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("student_id, makeup_credits")
    .gt("makeup_credits", 0);
  const list = subs ?? [];
  if (list.length === 0) return [];

  const ids = list.map((s) => s.student_id);
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name, username, teacher_id, role, is_active")
    .in("id", ids);
  const byId = new Map((profs ?? []).map((p) => [p.id, p]));

  const tids = [
    ...new Set(
      (profs ?? []).map((p) => p.teacher_id).filter(Boolean) as string[],
    ),
  ];
  const tname = new Map<string, string>();
  if (tids.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", tids);
    (data ?? []).forEach((t) => tname.set(t.id, t.full_name ?? t.username));
  }

  const rows: MakeupPoolRow[] = [];
  for (const s of list) {
    const p = byId.get(s.student_id);
    if (!p || p.role !== "student") continue;
    rows.push({
      id: p.id,
      name: p.full_name ?? p.username,
      credits: s.makeup_credits,
      teacherId: p.teacher_id,
      teacherName: p.teacher_id ? (tname.get(p.teacher_id) ?? null) : null,
    });
  }
  rows.sort((a, b) => b.credits - a.credits || a.name.localeCompare(b.name, "tr"));
  return rows;
}
