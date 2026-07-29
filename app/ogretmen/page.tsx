import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActionCard } from "@/components/dashboard/action-card";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default async function OgretmenHome() {
  const profile = await requireRole(["teacher"]);
  const supabase = await createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", profile.id);
  const classIds = (classes ?? []).map((c) => c.id);
  const className = new Map((classes ?? []).map((c) => [c.id, c.name]));

  let enrollments: { class_id: string; student_id: string; created_at: string }[] = [];
  if (classIds.length > 0) {
    const { data } = await supabase
      .from("enrollments")
      .select("class_id, student_id, created_at")
      .in("class_id", classIds);
    enrollments = data ?? [];
  }
  const studentIds = [...new Set(enrollments.map((e) => e.student_id))];
  const studentName = new Map<string, string>();
  let activeStudents = 0;
  if (studentIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, is_active")
      .in("id", studentIds);
    (data ?? []).forEach((p) => {
      studentName.set(p.id, p.full_name ?? p.username);
      if (p.is_active) activeStudents++;
    });
  }
  const studentsByClass = new Map<string, string[]>();
  for (const e of enrollments) {
    const a = studentsByClass.get(e.class_id) ?? [];
    a.push(studentName.get(e.student_id) ?? "?");
    studentsByClass.set(e.class_id, a);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = ymd(today);
  const newToday = enrollments.filter((e) => new Date(e.created_at) >= today).length;

  // Bugünkü dersler (saat sırasına göre)
  let todaySessions: {
    id: string;
    class_id: string;
    start_time: string;
    end_time: string;
    is_makeup: boolean;
  }[] = [];
  if (classIds.length > 0) {
    const { data } = await supabase
      .from("sessions")
      .select("id, class_id, start_time, end_time, is_makeup")
      .in("class_id", classIds)
      .eq("date", todayStr)
      .order("start_time");
    todaySessions = data ?? [];
  }

  return (
    <PanelShell title="Öğretmen Paneli" profile={profile}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Aktif öğrencilerim" value={activeStudents} icon="kisiler" />
        <StatCard label="Derslerim" value={classIds.length} icon="ders" />
        <StatCard label="Bugünkü ders" value={todaySessions.length} icon="takvim" />
      </div>

      <h2 className="section-title mb-3 mt-8">Bugünkü derslerim</h2>
      {todaySessions.length > 0 ? (
        <div className="flex flex-col gap-2">
          {todaySessions.map((s) => {
            const students = studentsByClass.get(s.class_id) ?? [];
            return (
              <Link
                key={s.id}
                href={`/oturum/${s.id}`}
                className="card flex items-center justify-between gap-3 p-4 transition hover:border-primary/40 hover:bg-accent"
              >
                <div className="min-w-0">
                  <div className="tabular font-semibold">
                    {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                  </div>
                  <div className="text-sm">
                    {className.get(s.class_id) ?? "Ders"}
                    {s.is_makeup ? " · Telafi" : ""}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted">
                    {students.length > 0 ? students.join(", ") : "Öğrenci yok"}
                  </div>
                </div>
                <span className="chip shrink-0">Yoklama →</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card p-6 text-center text-sm text-muted">
          Bugün dersin yok.
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          title="Derslerim"
          description="Derslerin ve öğrencilerin"
          href="/ogretmen/derslerim"
        />
        <ActionCard title="Takvim" description="Ders programın" href="/takvim" />
      </div>
    </PanelShell>
  );
}
