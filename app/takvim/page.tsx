import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { WEEKDAYS } from "@/lib/roles";
import { DayGrid } from "@/components/calendar/day-grid";
import { TeacherPicker } from "@/components/calendar/teacher-picker";

const SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default async function TakvimPage({
  searchParams,
}: {
  searchParams: Promise<{
    h?: string;
    g?: string;
    d?: string;
    t?: string;
    mk?: string;
  }>;
}) {
  const profile = await requireRole([
    "org_admin",
    "branch_admin",
    "teacher",
    "student",
  ]);
  const sp = await searchParams;
  const offset = parseInt(sp.h ?? "0", 10) || 0;
  const view = sp.g === "ay" ? "ay" : sp.g === "gun" ? "gun" : "hafta";
  const canMark = profile.role !== "student";
  const supabase = await createClient();

  // Öğretmen seçici için öğretmen listesi; seçili öğretmen (öğretmen takvimi)
  const { data: teacherList } = await supabase
    .from("profiles")
    .select("id, full_name, username")
    .eq("role", "teacher")
    .order("full_name");
  const teachers = (teacherList ?? []).map((t) => ({
    id: t.id,
    name: t.full_name ?? t.username,
  }));
  const teacherId =
    sp.t && teachers.some((t) => t.id === sp.t) ? sp.t : "";
  const selectedTeacherName = teachers.find((t) => t.id === teacherId)?.name ?? null;

  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const todayStr = ymd(base);

  let gridDays: Date[];
  let rangeLabel: string;
  let monthIndex = -1;

  if (view === "gun") {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "")
      ? new Date(sp.d + "T00:00:00")
      : new Date(base);
    gridDays = [day];
    rangeLabel = day.toLocaleDateString("tr-TR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } else if (view === "hafta") {
    const dow = (base.getDay() + 6) % 7;
    const monday = new Date(base);
    monday.setDate(base.getDate() - dow + offset * 7);
    gridDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
    const sunday = gridDays[6];
    rangeLabel = `${monday.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })} – ${sunday.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })}`;
  } else {
    const monthStart = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    monthIndex = monthStart.getMonth();
    const dow = (monthStart.getDay() + 6) % 7;
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - dow);
    gridDays = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
    rangeLabel = monthStart.toLocaleDateString("tr-TR", {
      month: "long",
      year: "numeric",
    });
  }

  const rangeStart = ymd(gridDays[0]);
  const rangeEnd = ymd(gridDays[gridDays.length - 1]);

  let sessQuery = supabase
    .from("sessions")
    .select("id, slot_id, student_id, teacher_id, date, start_time, end_time, is_makeup")
    .gte("date", rangeStart)
    .lte("date", rangeEnd)
    .order("start_time");
  if (teacherId) sessQuery = sessQuery.eq("teacher_id", teacherId);
  const { data: sessions } = await sessQuery;

  // Özel etkinlikler (aralık): okul takviminde tümü, öğretmen seçiliyse o öğretmenin
  let evQuery = supabase
    .from("calendar_events")
    .select("id, teacher_id, date, start_time, end_time, description")
    .gte("date", rangeStart)
    .lte("date", rangeEnd)
    .order("start_time");
  if (teacherId) evQuery = evQuery.eq("teacher_id", teacherId);
  const { data: rangeEvents } = await evQuery;

  // Oturum + etkinlik → isim eşlemesi
  const personIds = [
    ...new Set(
      [
        ...(sessions ?? []).flatMap((s) => [s.student_id, s.teacher_id]),
        ...(rangeEvents ?? []).map((e) => e.teacher_id),
      ].filter(Boolean) as string[],
    ),
  ];
  const nameById = new Map<string, string>();
  if (personIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", personIds);
    (data ?? []).forEach((p) => nameById.set(p.id, p.full_name ?? p.username));
  }
  const infoOf = (s: { student_id: string | null; teacher_id: string | null }) => ({
    name: s.student_id ? (nameById.get(s.student_id) ?? null) : null,
    teacher: s.teacher_id ? (nameById.get(s.teacher_id) ?? null) : null,
  });

  // Etkinlikleri güne göre grupla (okul + öğretmen görünümlerinde göster)
  const byDayEvents = new Map<
    string,
    { id: string; teacherName: string; start: string; end: string; description: string | null }[]
  >();
  (rangeEvents ?? []).forEach((e) => {
    const arr = byDayEvents.get(e.date) ?? [];
    arr.push({
      id: e.id,
      teacherName: e.teacher_id ? (nameById.get(e.teacher_id) ?? "?") : "?",
      start: e.start_time,
      end: e.end_time,
      description: e.description,
    });
    byDayEvents.set(e.date, arr);
  });

  // Öğretmen takvimi — günlük 15 dk ızgara verisi
  const showGrid = teacherId !== "" && view === "gun";
  let daygridStudents: { id: string; name: string }[] = [];
  if (showGrid) {
    const { data: studs } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .eq("teacher_id", teacherId)
      .eq("role", "student")
      .order("full_name");
    daygridStudents = (studs ?? []).map((s) => ({
      id: s.id,
      name: s.full_name ?? s.username,
    }));
  }
  const daygridSessions = (sessions ?? [])
    .filter((s) => s.date === ymd(gridDays[0]))
    .map((s) => ({
      id: s.id,
      slot_id: s.slot_id,
      start_time: s.start_time,
      end_time: s.end_time,
      is_makeup: s.is_makeup,
      studentName: s.student_id ? (nameById.get(s.student_id) ?? "") : "",
    }));
  const daygridWeekday = ((gridDays[0].getDay() + 6) % 7) + 1;

  // Öğretmen takvimi günlük — özel etkinlikler
  const daygridEvents = (rangeEvents ?? [])
    .filter((e) => e.date === ymd(gridDays[0]))
    .map((e) => ({
      id: e.id,
      start_time: e.start_time,
      end_time: e.end_time,
      description: e.description,
    }));
  const makeupStudentId =
    showGrid && sp.mk && daygridStudents.some((s) => s.id === sp.mk)
      ? sp.mk
      : null;
  const makeupStudentName = makeupStudentId
    ? (daygridStudents.find((s) => s.id === makeupStudentId)?.name ?? null)
    : null;


  const byDay = new Map<string, typeof sessions>();
  (sessions ?? []).forEach((s) => {
    const arr = byDay.get(s.date) ?? [];
    arr.push(s);
    byDay.set(s.date, arr);
  });

  // Yoklama durumları (oturum başına) — takvimde renkli nokta için
  const sessIds = (sessions ?? []).map((s) => s.id);
  const attBySession = new Map<string, string[]>();
  if (sessIds.length > 0) {
    const { data: atts } = await supabase
      .from("attendance")
      .select("session_id, status")
      .in("session_id", sessIds);
    (atts ?? []).forEach((a) => {
      const arr = attBySession.get(a.session_id) ?? [];
      arr.push(a.status);
      attBySession.set(a.session_id, arr);
    });
  }
  const dotClass = (status: string) =>
    status === "present" || status === "late"
      ? "bg-emerald-500"
      : status === "excused"
        ? "bg-amber-500"
        : status === "absent"
          ? "bg-red-500"
          : "bg-zinc-400";
  const dots = (sid: string) => {
    const st = attBySession.get(sid) ?? [];
    if (st.length === 0) return null;
    return (
      <span className="inline-flex items-center gap-0.5">
        {st.map((s, i) => (
          <span
            key={i}
            className={"inline-block h-2 w-2 shrink-0 rounded-full " + dotClass(s)}
          />
        ))}
      </span>
    );
  };

  const navBtn = "btn-ghost";
  const gunDay = gridDays[0];
  const prevHref =
    view === "gun"
      ? `/takvim?g=gun&d=${ymd(new Date(gunDay.getTime() - 864e5))}`
      : `/takvim?g=${view}&h=${offset - 1}`;
  const nextHref =
    view === "gun"
      ? `/takvim?g=gun&d=${ymd(new Date(gunDay.getTime() + 864e5))}`
      : `/takvim?g=${view}&h=${offset + 1}`;
  const todayHref = view === "gun" ? `/takvim?g=gun&d=${todayStr}` : `/takvim?g=${view}`;
  const tab = (v: string, label: string) => (
    <Link
      href={v === "gun" ? `/takvim?g=gun&d=${todayStr}` : `/takvim?g=${v}`}
      className={
        view === v
          ? "rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
          : navBtn
      }
    >
      {label}
    </Link>
  );

  return (
    <PanelShell title="Takvim" profile={profile}>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href={prevHref} className={navBtn}>
          ‹ Önceki
        </Link>
        <Link href={todayHref} className={navBtn}>
          Bugün
        </Link>
        <Link href={nextHref} className={navBtn}>
          Sonraki ›
        </Link>
        <span className="ml-1 text-sm font-medium">{rangeLabel}</span>
        <div className="ml-auto flex gap-1">
          {tab("gun", "Gün")}
          {tab("hafta", "Hafta")}
          {tab("ay", "Ay")}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TeacherPicker teachers={teachers} current={teacherId} />
        <span className="text-sm text-muted">
          {selectedTeacherName
            ? `Öğretmen takvimi · ${selectedTeacherName}`
            : "Okul takvimi"}
        </span>
        {teacherId && view !== "gun" ? (
          <Link
            href={`/takvim?g=gun&t=${teacherId}`}
            className="text-xs font-medium text-primary hover:underline"
          >
            Günlük ızgaraya geç (planlama)
          </Link>
        ) : null}
      </div>

      {view === "gun" ? (
        showGrid ? (
          <>
            {makeupStudentName ? (
              <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                Telafi planlama: <strong>{makeupStudentName}</strong> için boş bir
                slota tıkla → telafi dersi eklenir.
              </div>
            ) : null}
            <DayGrid
              date={ymd(gridDays[0])}
              weekday={daygridWeekday}
              teacherId={teacherId}
              students={daygridStudents}
              sessions={daygridSessions}
              events={daygridEvents}
              canMark={canMark}
              makeupStudentId={makeupStudentId}
              makeupStudentName={makeupStudentName}
            />
          </>
        ) : (
        <div className="card p-4">
          {(byDay.get(ymd(gridDays[0])) ?? []).length > 0 ||
          (byDayEvents.get(ymd(gridDays[0])) ?? []).length > 0 ? (
            <div className="flex flex-col gap-2">
              {(byDayEvents.get(ymd(gridDays[0])) ?? []).map((e) => (
                <div
                  key={e.id}
                  className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm"
                >
                  <span className="tabular font-medium">
                    {e.start.slice(0, 5)}–{e.end.slice(0, 5)}
                  </span>
                  <span className="text-muted">
                    {" · "}
                    {e.teacherName} · Etkinlik: {e.description || "—"}
                  </span>
                </div>
              ))}
              {(byDay.get(ymd(gridDays[0])) ?? []).map((s) => {
                const info = infoOf(s);
                const content = (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="tabular font-medium">
                        {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted">
                        {dots(s.id)}
                        <span>
                          {info?.name ?? "Ders"}
                          {info?.teacher ? ` · ${info.teacher}` : ""}
                          {s.is_makeup ? " · Telafi" : ""}
                        </span>
                      </div>
                    </div>
                    {canMark ? <span className="chip">Yoklama →</span> : null}
                  </div>
                );
                return canMark ? (
                  <Link
                    key={s.id}
                    href={`/oturum/${s.id}`}
                    className="block rounded-lg bg-accent px-3 py-2.5 transition hover:bg-primary/15"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={s.id} className="rounded-lg bg-accent px-3 py-2.5">
                    {content}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">Bu gün ders/etkinlik yok.</p>
          )}
        </div>
        )
      ) : view === "hafta" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {gridDays.map((d, i) => {
            const key = ymd(d);
            const list = byDay.get(key) ?? [];
            const isToday = key === todayStr;
            return (
              <div
                key={key}
                className={"card p-3 " + (isToday ? "ring-2 ring-primary" : "")}
              >
                <Link
                  href={`/takvim?g=gun&d=${key}`}
                  className="mb-2 flex items-baseline justify-between hover:text-primary"
                >
                  <span className="font-semibold">{WEEKDAYS[i]}</span>
                  <span className="text-xs text-muted">
                    {d.toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                </Link>
                {list.length > 0 || (byDayEvents.get(key) ?? []).length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {(byDayEvents.get(key) ?? []).map((e) => (
                      <div
                        key={e.id}
                        className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-sm"
                      >
                        <div className="font-medium">
                          {e.start.slice(0, 5)}–{e.end.slice(0, 5)}
                        </div>
                        <div className="truncate text-muted">
                          {e.teacherName} · {e.description || "Etkinlik"}
                        </div>
                      </div>
                    ))}
                    {list.map((s) => {
                      const info = infoOf(s);
                      const content = (
                        <>
                          <div className="font-medium">
                            {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                          </div>
                          <div className="flex items-center gap-1 text-muted">
                            {dots(s.id)}
                            <span>
                              {info?.name ?? "Ders"}
                              {info?.teacher ? ` · ${info.teacher}` : ""}
                              {s.is_makeup ? " · Telafi" : ""}
                            </span>
                          </div>
                        </>
                      );
                      return canMark ? (
                        <Link
                          key={s.id}
                          href={`/oturum/${s.id}`}
                          className="block rounded-lg bg-accent px-2 py-1.5 text-sm transition hover:bg-primary/15"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div
                          key={s.id}
                          className="rounded-lg bg-accent px-2 py-1.5 text-sm"
                        >
                          {content}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted">—</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {SHORT.map((d) => (
            <div key={d} className="py-1 text-center text-xs font-medium text-muted">
              {d}
            </div>
          ))}
          {gridDays.map((d) => {
            const key = ymd(d);
            const list = byDay.get(key) ?? [];
            const inMonth = d.getMonth() === monthIndex;
            const isToday = key === todayStr;
            return (
              <div
                key={key}
                className={
                  "min-h-[80px] rounded-lg border p-1 " +
                  (inMonth
                    ? "border-border bg-card"
                    : "border-transparent opacity-40") +
                  (isToday ? " ring-2 ring-primary" : "")
                }
              >
                <Link
                  href={`/takvim?g=gun&d=${key}`}
                  className="mb-0.5 block text-xs text-muted hover:text-primary"
                >
                  {d.getDate()}
                </Link>
                <div className="flex flex-col gap-0.5">
                  {list.slice(0, 3).map((s) => {
                    const info = infoOf(s);
                    const text = `${s.start_time.slice(0, 5)} ${info?.name ?? "Ders"}`;
                    return canMark ? (
                      <Link
                        key={s.id}
                        href={`/oturum/${s.id}`}
                        className="flex items-center gap-1 rounded bg-accent px-1 py-0.5 text-[11px] transition hover:bg-primary/15"
                        title={text}
                      >
                        {dots(s.id)}
                        <span className="truncate">{text}</span>
                      </Link>
                    ) : (
                      <span
                        key={s.id}
                        className="flex items-center gap-1 rounded bg-accent px-1 py-0.5 text-[11px]"
                        title={text}
                      >
                        {dots(s.id)}
                        <span className="truncate">{text}</span>
                      </span>
                    );
                  })}
                  {list.length > 3 ? (
                    <span className="text-[10px] text-muted">
                      +{list.length - 3} ders
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}
