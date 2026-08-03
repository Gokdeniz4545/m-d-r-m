import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActionCard } from "@/components/dashboard/action-card";
import { weekdayLabel } from "@/lib/roles";
import { getStudentUsedThisMonth } from "@/lib/billing";

export default async function OgrenciHome() {
  const profile = await requireRole(["student"]);
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("monthly_quota")
    .eq("student_id", profile.id)
    .maybeSingle();
  const quota = sub?.monthly_quota ?? 0;
  const used = await getStudentUsedThisMonth(profile.id);
  const remaining = quota - used;

  // Öğretmenim (profiles.teacher_id)
  const { data: me } = await supabase
    .from("profiles")
    .select("teacher_id")
    .eq("id", profile.id)
    .maybeSingle();
  let teacherName: string | null = null;
  if (me?.teacher_id) {
    const { data: t } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", me.teacher_id)
      .maybeSingle();
    teacherName = t ? (t.full_name ?? t.username) : null;
  }

  // Haftalık programım (schedule_slots.student_id)
  const { data: slots } = await supabase
    .from("schedule_slots")
    .select("id, weekday, start_time, end_time")
    .eq("student_id", profile.id)
    .order("weekday");
  const mySlots = slots ?? [];

  return (
    <PanelShell title="Öğrenci Paneli" profile={profile}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Kalan ders hakkım"
          value={remaining}
          sublabel={`${quota} hak · ${used} kullanıldı`}
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard title="Takvim" description="Ders programım" href="/takvim" />
        <ActionCard
          title="İzin talebi"
          description="Derse gelemeyeceğimi bildir"
          soon
        />
      </div>

      <h2 className="section-title mt-8 mb-3">Öğretmenim & programım</h2>
      <div className="card p-4">
        <div className="font-medium">Öğretmen: {teacherName ?? "Atanmadı"}</div>
        <div className="mt-1 text-sm text-muted">
          {mySlots.length > 0
            ? mySlots
                .map(
                  (s) =>
                    `Her ${weekdayLabel(s.weekday)} ${s.start_time.slice(0, 5)}`,
                )
                .join(", ")
            : "Program girilmemiş"}
        </div>
      </div>
    </PanelShell>
  );
}
