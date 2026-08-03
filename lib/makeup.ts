import { createClient } from "@/lib/supabase/server";

export type MakeupMiss = { date: string; start: string; end: string };
export type MakeupPoolRow = {
  id: string;
  name: string;
  teacherId: string | null;
  teacherName: string | null;
  autoRenew: boolean;
  lowQuota: boolean; // kalan ders hakkı == 1
  missed: MakeupMiss[]; // izinli (giremediği) dersler — telafi bekliyor
};

// "Aboneliği bitmek üzere olanlar" havuzu. İki grubun birleşimi:
//  (1) İzinli olup telafi bekleyen öğrenciler (makeup_credits > 0) — giremediği
//      ders gün/saatleriyle.
//  (2) Kalan ders hakkı tam 1 olan (aboneliği bitmek üzere) öğrenciler.
// used = İŞLENEN devir (geçiş ayında) + izinli hariç yoklamalar (paket kümülatif).
export async function getMakeupPool(branchId?: string): Promise<MakeupPoolRow[]> {
  const supabase = await createClient();
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name, username, teacher_id")
    .eq("role", "student")
    .eq("is_active", true);
  let students = profs ?? [];

  if (branchId) {
    const { data: mems } = await supabase
      .from("branch_memberships")
      .select("user_id")
      .eq("branch_id", branchId)
      .eq("role", "student");
    const set = new Set((mems ?? []).map((m) => m.user_id));
    students = students.filter((s) => set.has(s.id));
  }
  if (students.length === 0) return [];

  const ids = students.map((s) => s.id);
  const now = new Date();
  const curPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const subByStudent = new Map<
    string,
    {
      monthly_quota: number;
      opening_used: number;
      opening_period: string | null;
      auto_renew: boolean;
      makeup_credits: number;
    }
  >();
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabase
      .from("subscriptions")
      .select(
        "student_id, monthly_quota, opening_used, opening_period, auto_renew, makeup_credits",
      )
      .in("student_id", ids.slice(i, i + 100));
    (data ?? []).forEach((s) =>
      subByStudent.set(s.student_id, {
        monthly_quota: Number(s.monthly_quota ?? 0),
        opening_used: Number(s.opening_used ?? 0),
        opening_period: s.opening_period,
        auto_renew: s.auto_renew ?? true,
        makeup_credits: Number(s.makeup_credits ?? 0),
      }),
    );
  }

  const attCount = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabase
      .from("attendance")
      .select("student_id, status")
      .in("student_id", ids.slice(i, i + 100))
      .neq("status", "excused");
    (data ?? []).forEach((a) =>
      attCount.set(a.student_id, (attCount.get(a.student_id) ?? 0) + 1),
    );
  }

  // İzinli (excused) oturumlar → giremediği dersler (telafi bekleyenler için)
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

  // Öğretmen adları
  const tids = [
    ...new Set(students.map((s) => s.teacher_id).filter(Boolean) as string[]),
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
  for (const st of students) {
    const sub = subByStudent.get(st.id);
    if (!sub) continue;
    const seed = sub.opening_period === curPeriod ? sub.opening_used : 0;
    const used = seed + (attCount.get(st.id) ?? 0);
    const remaining = sub.monthly_quota - used;
    const lowQuota = sub.monthly_quota > 0 && remaining === 1;
    const missed =
      sub.makeup_credits > 0
        ? (missedByStudent.get(st.id) ?? []).sort((a, b) =>
            a.date < b.date ? 1 : a.date > b.date ? -1 : a.start.localeCompare(b.start),
          )
        : [];
    // Havuza yalnızca ilgili öğrenciler girer.
    if (!lowQuota && missed.length === 0) continue;
    rows.push({
      id: st.id,
      name: st.full_name ?? st.username,
      teacherId: st.teacher_id,
      teacherName: st.teacher_id ? (tname.get(st.teacher_id) ?? null) : null,
      autoRenew: sub.auto_renew,
      lowQuota,
      missed,
    });
  }
  // Önce ders hakkı bitenler, sonra isim
  rows.sort(
    (a, b) =>
      Number(b.lowQuota) - Number(a.lowQuota) ||
      a.name.localeCompare(b.name, "tr"),
  );
  return rows;
}
