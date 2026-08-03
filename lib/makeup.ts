import { createClient } from "@/lib/supabase/server";

export type MakeupMiss = { date: string; start: string; end: string };
export type MakeupPoolRow = {
  id: string;
  name: string;
  credits: number;
  teacherId: string | null;
  teacherName: string | null;
  missed: MakeupMiss[];
};

// Telafi havuzu: telafi hakkı (makeup_credits) > 0 olan öğrenciler.
// Her öğrencinin altında "izinli" işaretlenen (giremediği) dersler: tarih + saat.
export async function getMakeupPool(branchId?: string): Promise<MakeupPoolRow[]> {
  const supabase = await createClient();
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("student_id, makeup_credits")
    .gt("makeup_credits", 0);
  let list = subs ?? [];
  if (list.length === 0) return [];

  // İsteğe bağlı şube filtresi (kurum yöneticisi tek şube panelinde)
  if (branchId) {
    const { data: mems } = await supabase
      .from("branch_memberships")
      .select("user_id")
      .eq("branch_id", branchId)
      .eq("role", "student");
    const inBranch = new Set((mems ?? []).map((m) => m.user_id));
    list = list.filter((s) => inBranch.has(s.student_id));
    if (list.length === 0) return [];
  }

  const ids = list.map((s) => s.student_id);
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name, username, teacher_id, role")
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

  // İzinli (excused) oturumlar → giremediği dersler
  const missedByStudent = new Map<string, MakeupMiss[]>();
  const { data: atts } = await supabase
    .from("attendance")
    .select("student_id, session_id, status")
    .in("student_id", ids)
    .eq("status", "excused");
  const attList = atts ?? [];
  if (attList.length > 0) {
    const sessIds = [...new Set(attList.map((a) => a.session_id))];
    const sessById = new Map<
      string,
      { date: string; start_time: string; end_time: string }
    >();
    for (let i = 0; i < sessIds.length; i += 100) {
      const { data: sess } = await supabase
        .from("sessions")
        .select("id, date, start_time, end_time")
        .in("id", sessIds.slice(i, i + 100));
      (sess ?? []).forEach((s) =>
        sessById.set(s.id, {
          date: s.date,
          start_time: s.start_time,
          end_time: s.end_time,
        }),
      );
    }
    for (const a of attList) {
      const s = sessById.get(a.session_id);
      if (!s) continue;
      const arr = missedByStudent.get(a.student_id) ?? [];
      arr.push({ date: s.date, start: s.start_time, end: s.end_time });
      missedByStudent.set(a.student_id, arr);
    }
  }

  const rows: MakeupPoolRow[] = [];
  for (const s of list) {
    const p = byId.get(s.student_id);
    if (!p || p.role !== "student") continue;
    const missed = (missedByStudent.get(s.student_id) ?? []).sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : a.start.localeCompare(b.start),
    );
    rows.push({
      id: p.id,
      name: p.full_name ?? p.username,
      credits: s.makeup_credits,
      teacherId: p.teacher_id,
      teacherName: p.teacher_id ? (tname.get(p.teacher_id) ?? null) : null,
      missed,
    });
  }
  rows.sort((a, b) => b.credits - a.credits || a.name.localeCompare(b.name, "tr"));
  return rows;
}
