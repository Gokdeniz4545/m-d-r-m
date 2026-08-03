import { createClient } from "@/lib/supabase/server";

export type ExpiringRow = {
  id: string;
  name: string;
  remaining: number;
  autoRenew: boolean;
};

// Ders hakkı bitmek üzere (kalan <= 1) aktif öğrenciler.
// used = İŞLENEN devir (geçiş ayında) + izinli hariç yoklamalar (paket kümülatif).
export async function getExpiringStudents(
  branchIds?: string[],
): Promise<ExpiringRow[]> {
  const supabase = await createClient();
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name, username")
    .eq("role", "student")
    .eq("is_active", true);
  let students = profs ?? [];
  if (branchIds && branchIds.length > 0) {
    const { data: mems } = await supabase
      .from("branch_memberships")
      .select("user_id")
      .in("branch_id", branchIds)
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
    }
  >();
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabase
      .from("subscriptions")
      .select("student_id, monthly_quota, opening_used, opening_period, auto_renew")
      .in("student_id", ids.slice(i, i + 100));
    (data ?? []).forEach((s) =>
      subByStudent.set(s.student_id, {
        monthly_quota: Number(s.monthly_quota ?? 0),
        opening_used: Number(s.opening_used ?? 0),
        opening_period: s.opening_period,
        auto_renew: s.auto_renew ?? true,
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

  const rows: ExpiringRow[] = [];
  for (const st of students) {
    const sub = subByStudent.get(st.id);
    if (!sub || !(sub.monthly_quota > 0)) continue;
    const seed = sub.opening_period === curPeriod ? sub.opening_used : 0;
    const used = seed + (attCount.get(st.id) ?? 0);
    const remaining = sub.monthly_quota - used;
    if (remaining <= 1)
      rows.push({
        id: st.id,
        name: st.full_name ?? st.username,
        remaining,
        autoRenew: sub.auto_renew,
      });
  }
  rows.sort(
    (a, b) => a.remaining - b.remaining || a.name.localeCompare(b.name, "tr"),
  );
  return rows;
}
