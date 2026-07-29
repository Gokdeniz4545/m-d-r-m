import { createClient } from "@/lib/supabase/server";

export type CompType = "per_session" | "monthly";

export const COMP_TYPE_LABEL: Record<CompType, string> = {
  per_session: "Ders başı",
  monthly: "Aylık",
};

export type TeacherComp = { comp_type: CompType; rate: number } | null;

export async function getTeacherCompensation(
  teacherId: string,
): Promise<TeacherComp> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teacher_compensation")
    .select("comp_type, rate")
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (!data) return null;
  return { comp_type: data.comp_type as CompType, rate: Number(data.rate) };
}

// Öğretmenin bu ayki hakedişi.
// Aylık → sabit ücret. Ders başı → bu ay verdiği ders (session) sayısı × ücret.
export async function getTeacherEarningThisMonth(
  teacherId: string,
): Promise<{ comp: TeacherComp; sessions: number; earning: number }> {
  const comp = await getTeacherCompensation(teacherId);
  if (!comp) return { comp: null, sessions: 0, earning: 0 };

  if (comp.comp_type === "monthly") {
    return { comp, sessions: 0, earning: comp.rate };
  }

  const supabase = await createClient();
  const { data: cls } = await supabase
    .from("classes")
    .select("id")
    .eq("teacher_id", teacherId);
  const classIds = (cls ?? []).map((c) => c.id);
  if (classIds.length === 0) return { comp, sessions: 0, earning: 0 };

  const now = new Date();
  const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  const { count } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .in("class_id", classIds)
    .gte("date", first)
    .lte("date", last);
  const sessions = count ?? 0;
  return { comp, sessions, earning: sessions * comp.rate };
}
