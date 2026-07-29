import { createClient } from "@/lib/supabase/server";

export type Stats = {
  students: number;
  teachers: number;
  activeStudents: number;
  newToday: number;
};

function tally(
  profiles: { role: string; is_active: boolean; created_at: string }[],
  today: Date,
): Stats {
  let students = 0;
  let teachers = 0;
  let activeStudents = 0;
  let newToday = 0;
  for (const p of profiles) {
    if (p.role === "student") {
      students++;
      if (p.is_active) activeStudents++;
    }
    if (p.role === "teacher") teachers++;
    // Bugünün yeni kayıtları: yalnızca öğrenci kayıtları sayılır.
    if (p.role === "student" && new Date(p.created_at) >= today) newToday++;
  }
  return { students, teachers, activeStudents, newToday };
}

// Bir veya birden çok şubedeki üyelerin istatistikleri (RLS kapsamında).
export async function getBranchStats(branchIds: string[]): Promise<Stats> {
  const empty: Stats = { students: 0, teachers: 0, activeStudents: 0, newToday: 0 };
  if (branchIds.length === 0) return empty;

  const supabase = await createClient();
  const { data: mems } = await supabase
    .from("branch_memberships")
    .select("user_id")
    .in("branch_id", branchIds);
  const userIds = [...new Set((mems ?? []).map((m) => m.user_id))];
  if (userIds.length === 0) return empty;

  const { data: profs } = await supabase
    .from("profiles")
    .select("role, is_active, created_at")
    .in("id", userIds);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return tally(profs ?? [], today);
}

// Kurum geneli istatistikleri (org_admin; RLS org profillerini döndürür).
export async function getOrgStats(): Promise<Stats & { branches: number }> {
  const supabase = await createClient();
  const { data: profs } = await supabase
    .from("profiles")
    .select("role, is_active, created_at");
  const { count: branches } = await supabase
    .from("branches")
    .select("id", { count: "exact", head: true });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return { ...tally(profs ?? [], today), branches: branches ?? 0 };
}

// branch_admin'in yönettiği şube id'leri.
export async function getMyAdminBranchIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("branch_memberships")
    .select("branch_id")
    .eq("user_id", userId)
    .eq("role", "branch_admin");
  return (data ?? []).map((m) => m.branch_id);
}
