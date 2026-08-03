import { createClient } from "@/lib/supabase/server";

export type MakeupMiss = { date: string; start: string; end: string };
export type MakeupPoolRow = {
  id: string;
  name: string;
  teacherId: string | null;
  teacherName: string | null;
  missed: MakeupMiss[];
};
export type RenewedRow = {
  id: string;
  name: string;
  teacherName: string | null;
  renewedAt: string;
};

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// İçinde bulunulan haftanın (Pazartesi–Pazar) sınırları.
function weekBounds(now: Date) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Pazartesi = 0
  const mon = new Date(d);
  mon.setDate(d.getDate() - dow);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { monISO: mon.toISOString(), monYmd: ymd(mon), sunYmd: ymd(sun) };
}

async function branchStudentIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  branchId?: string,
): Promise<Set<string> | null> {
  if (!branchId) return null;
  const { data: mems } = await supabase
    .from("branch_memberships")
    .select("user_id")
    .eq("branch_id", branchId)
    .eq("role", "student");
  return new Set((mems ?? []).map((m) => m.user_id));
}

async function teacherNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teacherIds: (string | null)[],
): Promise<Map<string, string>> {
  const tids = [...new Set(teacherIds.filter(Boolean) as string[])];
  const map = new Map<string, string>();
  if (tids.length === 0) return map;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, username")
    .in("id", tids);
  (data ?? []).forEach((t) => map.set(t.id, t.full_name ?? t.username));
  return map;
}

// Telafi Havuzu: bu hafta "izinli" olarak işaretlenen öğrenciler + giremedikleri
// ders gün/saatleri.
export async function getMakeupPool(branchId?: string): Promise<MakeupPoolRow[]> {
  const supabase = await createClient();
  const { monYmd, sunYmd } = weekBounds(new Date());

  // Bu haftaki oturumlar
  const { data: sess } = await supabase
    .from("sessions")
    .select("id, date, start_time, end_time, student_id")
    .gte("date", monYmd)
    .lte("date", sunYmd);
  const sessions = sess ?? [];
  if (sessions.length === 0) return [];
  const sessById = new Map(sessions.map((s) => [s.id, s]));
  const sessIds = sessions.map((s) => s.id);

  // Bu haftaki izinli yoklamalar
  const { data: atts } = await supabase
    .from("attendance")
    .select("student_id, session_id, status")
    .in("session_id", sessIds)
    .eq("status", "excused");
  const excused = atts ?? [];
  if (excused.length === 0) return [];

  const branchSet = await branchStudentIds(supabase, branchId);
  const missedByStudent = new Map<string, MakeupMiss[]>();
  for (const a of excused) {
    if (branchSet && !branchSet.has(a.student_id)) continue;
    const s = sessById.get(a.session_id);
    if (!s) continue;
    const arr = missedByStudent.get(a.student_id) ?? [];
    arr.push({ date: s.date, start: s.start_time, end: s.end_time });
    missedByStudent.set(a.student_id, arr);
  }
  const ids = [...missedByStudent.keys()];
  if (ids.length === 0) return [];

  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name, username, teacher_id, role")
    .in("id", ids);
  const tname = await teacherNames(
    supabase,
    (profs ?? []).map((p) => p.teacher_id),
  );

  const rows: MakeupPoolRow[] = [];
  for (const p of profs ?? []) {
    if (p.role !== "student") continue;
    const missed = (missedByStudent.get(p.id) ?? []).sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : a.start.localeCompare(b.start),
    );
    rows.push({
      id: p.id,
      name: p.full_name ?? p.username,
      teacherId: p.teacher_id,
      teacherName: p.teacher_id ? (tname.get(p.teacher_id) ?? null) : null,
      missed,
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return rows;
}

// Aboneliği bu hafta yenilenen öğrenciler (renewed_at bu hafta içinde).
export async function getRenewedStudents(
  branchId?: string,
): Promise<RenewedRow[]> {
  const supabase = await createClient();
  const { monISO } = weekBounds(new Date());

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("student_id, renewed_at")
    .gte("renewed_at", monISO);
  const list = subs ?? [];
  if (list.length === 0) return [];

  const branchSet = await branchStudentIds(supabase, branchId);
  const filtered = branchSet
    ? list.filter((s) => branchSet.has(s.student_id))
    : list;
  if (filtered.length === 0) return [];

  const ids = filtered.map((s) => s.student_id);
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name, username, teacher_id, role")
    .in("id", ids);
  const byId = new Map((profs ?? []).map((p) => [p.id, p]));
  const tname = await teacherNames(
    supabase,
    (profs ?? []).map((p) => p.teacher_id),
  );

  const rows: RenewedRow[] = [];
  for (const s of filtered) {
    const p = byId.get(s.student_id);
    if (!p || p.role !== "student") continue;
    rows.push({
      id: p.id,
      name: p.full_name ?? p.username,
      teacherName: p.teacher_id ? (tname.get(p.teacher_id) ?? null) : null,
      renewedAt: s.renewed_at as string,
    });
  }
  rows.sort((a, b) => (a.renewedAt < b.renewedAt ? 1 : -1));
  return rows;
}
