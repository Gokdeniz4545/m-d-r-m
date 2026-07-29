import Link from "next/link";
import { getNow } from "@/lib/clock";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { CLASS_TYPE_LABEL, type ClassType } from "@/lib/roles";
import { EnrollForm } from "@/components/dersler/enroll-form";
import {
  unenroll,
  updateClass,
  addClassTeacher,
  removeClassTeacher,
} from "@/lib/class-actions";
import { SlotForm } from "@/components/program/slot-form";
import { EditSlotForm } from "@/components/program/edit-slot-form";
import { ManualSessionForm } from "@/components/program/manual-session-form";
import { deleteSlot, deleteSession, generateSessions } from "@/lib/schedule-actions";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireRole(["org_admin", "branch_admin"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, type, capacity, branch_id, subject_id, teacher_id")
    .eq("id", id)
    .maybeSingle();
  if (!cls) redirect("/dersler");

  const [{ data: subject }, { data: branch }] = await Promise.all([
    supabase.from("subjects").select("name").eq("id", cls.subject_id).maybeSingle(),
    supabase.from("branches").select("name").eq("id", cls.branch_id).maybeSingle(),
  ]);

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, student_id")
    .eq("class_id", id);
  const studentIds = (enrollments ?? []).map((e) => e.student_id);
  const enrollByStudent = new Map(
    (enrollments ?? []).map((e) => [e.student_id, e.id]),
  );

  let nameById = new Map<string, string>();
  if (studentIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", studentIds);
    nameById = new Map((data ?? []).map((p) => [p.id, p.full_name ?? p.username]));
  }

  const { data: branchMems } = await supabase
    .from("branch_memberships")
    .select("user_id")
    .eq("branch_id", cls.branch_id);
  const memberIds = (branchMems ?? [])
    .map((m) => m.user_id)
    .filter((uid) => !studentIds.includes(uid));
  let candidates: { id: string; name: string }[] = [];
  let branchTeachers: { id: string; name: string }[] = [];
  if (memberIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, role")
      .in("id", memberIds);
    candidates = (data ?? [])
      .filter((p) => p.role === "student")
      .map((p) => ({ id: p.id, name: p.full_name ?? p.username }));
    branchTeachers = (data ?? [])
      .filter((p) => p.role === "teacher")
      .map((p) => ({ id: p.id, name: p.full_name ?? p.username }));
  }

  // Derse atanmış öğretmenler (çoklu)
  const { data: classTeachers } = await supabase
    .from("class_teachers")
    .select("teacher_id")
    .eq("class_id", id);
  const assignedTeacherIds = (classTeachers ?? []).map((t) => t.teacher_id);
  const teacherNameMap = new Map(branchTeachers.map((t) => [t.id, t.name]));
  const assignedTeachers = assignedTeacherIds.map((tid) => ({
    id: tid,
    name: teacherNameMap.get(tid) ?? "?",
  }));
  const teacherCandidates = branchTeachers.filter(
    (t) => !assignedTeacherIds.includes(t.id),
  );

  const isFull = studentIds.length >= cls.capacity;

  const { data: slots } = await supabase
    .from("schedule_slots")
    .select("id, weekday, start_time, end_time")
    .eq("class_id", id)
    .order("weekday")
    .order("start_time");

  const now = await getNow();
  now.setHours(0, 0, 0, 0);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const { data: upcoming } = await supabase
    .from("sessions")
    .select("id, date, start_time, end_time, is_makeup")
    .eq("class_id", id)
    .gte("date", todayStr)
    .order("date")
    .order("start_time")
    .limit(30);

  return (
    <PanelShell title={cls.name} profile={profile}>
      <Link
        href="/dersler"
        className="mb-4 inline-block text-sm text-zinc-500 hover:underline dark:text-zinc-400"
      >
        ← Derslere dön
      </Link>

      <div className="card mb-6 p-4">
        <div className="text-sm text-muted">
          {subject?.name ?? "?"} · {branch?.name ?? "?"} ·{" "}
          {CLASS_TYPE_LABEL[cls.type as ClassType]} · {studentIds.length}/
          {cls.capacity} öğrenci
        </div>
      </div>

      {/* Ders düzenle */}
      <div className="card mb-6 p-4">
        <h2 className="section-title mb-3">Ders bilgileri</h2>
        <form action={updateClass} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="classId" value={cls.id} />
          <label className="label">
            Ders adı
            <input name="name" defaultValue={cls.name} className="input" />
          </label>
          {cls.type === "group" ? (
            <label className="label">
              Kontenjan
              <input
                type="number"
                name="capacity"
                defaultValue={cls.capacity}
                className="input w-28"
              />
            </label>
          ) : (
            <input type="hidden" name="capacity" value={cls.capacity} />
          )}
          <button type="submit" className="btn-primary">
            Kaydet
          </button>
        </form>
      </div>

      {/* Öğretmenler (çoklu) */}
      <h2 className="section-title mb-3">Öğretmenler ({assignedTeachers.length})</h2>
      <div className="mb-3 flex flex-col gap-2">
        {assignedTeachers.length > 0 ? (
          assignedTeachers.map((t) => (
            <div key={t.id} className="card flex items-center justify-between p-3">
              <span>{t.name}</span>
              <form action={removeClassTeacher}>
                <input type="hidden" name="classId" value={cls.id} />
                <input type="hidden" name="teacherId" value={t.id} />
                <button
                  type="submit"
                  className="text-xs font-medium text-danger hover:underline"
                >
                  Çıkar
                </button>
              </form>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">Bu derse atanmış öğretmen yok.</p>
        )}
      </div>
      {teacherCandidates.length > 0 ? (
        <form action={addClassTeacher} className="mb-6 flex items-end gap-2">
          <input type="hidden" name="classId" value={cls.id} />
          <label className="label">
            Öğretmen ekle
            <select name="teacherId" defaultValue="" required className="input">
              <option value="" disabled>
                Seç
              </option>
              {teacherCandidates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-ghost">
            Ekle
          </button>
        </form>
      ) : null}

      <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Kayıtlı öğrenciler ({studentIds.length})
      </h2>
      {studentIds.length > 0 ? (
        <div className="mb-6 flex flex-col gap-2">
          {studentIds.map((sid) => (
            <div
              key={sid}
              className="card flex items-center justify-between p-3"
            >
              <span className="text-foreground">
                {nameById.get(sid) ?? "?"}
              </span>
              <form action={unenroll}>
                <input type="hidden" name="enrollmentId" value={enrollByStudent.get(sid) ?? ""} />
                <input type="hidden" name="classId" value={cls.id} />
                <button
                  type="submit"
                  className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  Çıkar
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Henüz kayıtlı öğrenci yok.
        </p>
      )}

      {isFull ? (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Kontenjan dolu ({cls.capacity}/{cls.capacity}).
        </p>
      ) : (
        <EnrollForm classId={cls.id} students={candidates} />
      )}

      <h2 className="section-title mb-3 mt-10">Haftalık program</h2>
      {slots && slots.length > 0 ? (
        <div className="mb-3 flex flex-col gap-2">
          {slots.map((s) => (
            <div key={s.id} className="card flex items-start justify-between gap-3 p-3">
              <EditSlotForm
                classId={cls.id}
                slotId={s.id}
                weekday={s.weekday}
                startTime={s.start_time.slice(0, 5)}
                endTime={s.end_time.slice(0, 5)}
              />
              <form action={deleteSlot} className="pt-6">
                <input type="hidden" name="slotId" value={s.id} />
                <input type="hidden" name="classId" value={cls.id} />
                <button
                  type="submit"
                  className="text-xs font-medium text-danger hover:underline"
                >
                  Sil
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-sm text-muted">Henüz haftalık slot yok.</p>
      )}

      <div className="card mb-4 p-4">
        <SlotForm classId={cls.id} />
      </div>

      {slots && slots.length > 0 ? (
        <form action={generateSessions} className="mb-2">
          <input type="hidden" name="classId" value={cls.id} />
          <input type="hidden" name="weeks" value="4" />
          <button type="submit" className="btn-ghost">
            Önümüzdeki 4 hafta için oturumları üret
          </button>
        </form>
      ) : null}

      <h2 className="section-title mb-3 mt-10">
        Yaklaşan dersler ({upcoming?.length ?? 0})
      </h2>
      {upcoming && upcoming.length > 0 ? (
        <div className="mb-4 flex flex-col gap-2">
          {upcoming.map((s) => (
            <div key={s.id} className="card flex items-center justify-between p-3">
              <Link
                href={`/oturum/${s.id}`}
                className="hover:underline"
              >
                {new Date(s.date).toLocaleDateString("tr-TR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                })}{" "}
                · {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                {s.is_makeup ? (
                  <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-muted">
                    Telafi
                  </span>
                ) : null}
                <span className="ml-2 text-xs text-primary">Yoklama →</span>
              </Link>
              <form action={deleteSession}>
                <input type="hidden" name="sessionId" value={s.id} />
                <input type="hidden" name="classId" value={cls.id} />
                <button
                  type="submit"
                  className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  Sil
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-sm text-muted">
          Yaklaşan ders yok. Program ekleyip oturum üret veya elle ders ekle.
        </p>
      )}

      <div className="card p-4">
        <ManualSessionForm classId={cls.id} />
      </div>
    </PanelShell>
  );
}
