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
  const now = new Date();
  const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  const curPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Gerçekten işlenen ders = bu ay "Geldi" işaretlenen yoklamalar (öğretmenin oturumları)
  let taught = 0;
  const { data: sess } = await supabase
    .from("sessions")
    .select("id")
    .eq("teacher_id", teacherId)
    .gte("date", first)
    .lte("date", last);
  const sessIds = (sess ?? []).map((s) => s.id);
  for (let i = 0; i < sessIds.length; i += 100) {
    const { count } = await supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .in("session_id", sessIds.slice(i, i + 100))
      .eq("status", "present");
    taught += count ?? 0;
  }

  // İlk kurulum seed: geçiş ayında (opening_period = bu ay) öğrencilerin İŞLENEN dersleri
  const { data: studs } = await supabase
    .from("profiles")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("role", "student");
  const studIds = (studs ?? []).map((s) => s.id);
  for (let i = 0; i < studIds.length; i += 100) {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("opening_used, opening_period")
      .in("student_id", studIds.slice(i, i + 100));
    for (const s of subs ?? []) {
      if (s.opening_period === curPeriod) taught += Number(s.opening_used ?? 0);
    }
  }

  return { comp, sessions: taught, earning: taught * comp.rate };
}
