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

  // Öğrencilerim (profiles.teacher_id)
  const { data: myStudents } = await supabase
    .from("profiles")
    .select("id, full_name, username, is_active, created_at")
    .eq("teacher_id", profile.id)
    .eq("role", "student");
  const students = myStudents ?? [];
  const activeStudents = students.filter((s) => s.is_active).length;
  const studentName = new Map(
    students.map((s) => [s.id, s.full_name ?? s.username]),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = ymd(today);

  // Bugünkü dersler (sessions.teacher_id)
  const { data: sess } = await supabase
    .from("sessions")
    .select("id, student_id, start_time, end_time, is_makeup")
    .eq("teacher_id", profile.id)
    .eq("date", todayStr)
    .order("start_time");
  const todaySessions = sess ?? [];

  return (
    <PanelShell title="Öğretmen Paneli" profile={profile}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Aktif öğrencilerim" value={activeStudents} icon="kisiler" />
        <StatCard label="Öğrencilerim" value={students.length} icon="kisiler" />
        <StatCard label="Bugünkü ders" value={todaySessions.length} icon="takvim" />
      </div>

      <h2 className="section-title mb-3 mt-8">Bugünkü derslerim</h2>
      {todaySessions.length > 0 ? (
        <div className="flex flex-col gap-2">
          {todaySessions.map((s) => (
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
                  {s.student_id ? (studentName.get(s.student_id) ?? "Öğrenci") : "Öğrenci"}
                  {s.is_makeup ? " · Telafi" : ""}
                </div>
              </div>
              <span className="chip shrink-0">Yoklama →</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-6 text-center text-sm text-muted">
          Bugün dersin yok.
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          title="Öğrencilerim"
          description="Öğrencilerin ve programları"
          href="/ogretmen/derslerim"
        />
        <ActionCard title="Takvim" description="Ders programın" href="/takvim" />
      </div>
    </PanelShell>
  );
}
