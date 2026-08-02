import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { weekdayLabel } from "@/lib/roles";

export default async function OgretmenDerslerim() {
  const profile = await requireRole(["teacher"]);
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("profiles")
    .select("id, full_name, username, is_active")
    .eq("teacher_id", profile.id)
    .eq("role", "student")
    .order("full_name");
  const list = students ?? [];
  const ids = list.map((s) => s.id);

  // Her öğrencinin haftalık programı (schedule_slots.student_id)
  const slotsByStudent = new Map<
    string,
    { weekday: number; start_time: string }[]
  >();
  if (ids.length > 0) {
    const { data: slots } = await supabase
      .from("schedule_slots")
      .select("student_id, weekday, start_time")
      .in("student_id", ids)
      .order("weekday");
    (slots ?? []).forEach((s) => {
      const a = slotsByStudent.get(s.student_id) ?? [];
      a.push({ weekday: s.weekday, start_time: s.start_time });
      slotsByStudent.set(s.student_id, a);
    });
  }

  return (
    <PanelShell title="Öğrencilerim" profile={profile}>
      <Link
        href="/ogretmen"
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← Panele dön
      </Link>
      <h2 className="section-title mb-3">Öğrencilerim ({list.length})</h2>
      {list.length > 0 ? (
        <div className="flex flex-col gap-3">
          {list.map((s) => {
            const prog = (slotsByStudent.get(s.id) ?? []).map(
              (sl) => `${weekdayLabel(sl.weekday)} ${sl.start_time.slice(0, 5)}`,
            );
            return (
              <Link
                key={s.id}
                href={`/kisi/${s.id}`}
                className="card p-4 transition hover:border-primary/40 hover:bg-accent"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{s.full_name ?? s.username}</div>
                  <span className="text-xs text-muted">
                    {s.is_active ? "Aktif" : "Pasif"}
                  </span>
                </div>
                <div className="mt-1 text-sm text-muted">
                  {prog.length > 0 ? prog.join(", ") : "Program girilmemiş"}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">Henüz size atanmış öğrenci yok.</p>
      )}
    </PanelShell>
  );
}
