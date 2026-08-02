import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { UserManageRow } from "@/components/user-manage-row";
import {
  CLASS_TYPE_LABEL,
  ROLE_LABEL,
  weekdayLabel,
  type ClassType,
  type UserRole,
} from "@/lib/roles";
import { SubscriptionForm } from "@/components/billing/subscription-form";
import { PaymentForm } from "@/components/billing/payment-form";
import { BalanceForm } from "@/components/billing/balance-form";
import { deletePayment, deleteAdjustment } from "@/lib/billing-actions";
import {
  getStudentUsedThisMonth,
  getStudentLedger,
  formatTRY,
  BILLING_PERIOD_LABEL,
} from "@/lib/billing";
import { getTeacherEarningThisMonth, COMP_TYPE_LABEL } from "@/lib/compensation";
import { TeacherCompensationForm } from "@/components/teacher-compensation-form";
import { addTeacherSubject, removeTeacherSubject } from "@/lib/class-actions";
import { Section } from "@/components/collapsible-section";
import { EditSlotForm } from "@/components/program/edit-slot-form";
import { SlotForm } from "@/components/program/slot-form";
import { PersonContactForm } from "@/components/person-contact-form";

export default async function KisiProfil({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireRole(["org_admin", "branch_admin", "teacher"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: person } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, phone, email, guardian_name, guardian_phone, tc_kimlik_no, address, role, is_active, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!person) redirect("/kisiler");

  // Şubeleri
  const { data: mems } = await supabase
    .from("branch_memberships")
    .select("branch_id")
    .eq("user_id", id);
  const branchIds = (mems ?? []).map((m) => m.branch_id);
  let branchNames: string[] = [];
  if (branchIds.length > 0) {
    const { data: brs } = await supabase
      .from("branches")
      .select("name")
      .in("id", branchIds);
    branchNames = (brs ?? []).map((b) => b.name);
  }

  // Dersleri
  type ClassRow = {
    id: string;
    name: string;
    type: ClassType;
    subject_id: string;
    teacher_id: string | null;
  };
  let classes: ClassRow[] = [];
  if (person.role === "student") {
    const { data: enr } = await supabase
      .from("enrollments")
      .select("class_id")
      .eq("student_id", id);
    const cids = (enr ?? []).map((e) => e.class_id);
    if (cids.length > 0) {
      const { data } = await supabase
        .from("classes")
        .select("id, name, type, subject_id, teacher_id")
        .in("id", cids);
      classes = (data ?? []) as ClassRow[];
    }
  } else if (person.role === "teacher") {
    const { data } = await supabase
      .from("classes")
      .select("id, name, type, subject_id, teacher_id")
      .eq("teacher_id", id);
    classes = (data ?? []) as ClassRow[];
  }

  const subjectIds = [...new Set(classes.map((c) => c.subject_id))];
  const teacherIds = [
    ...new Set(classes.map((c) => c.teacher_id).filter(Boolean) as string[]),
  ];
  const [subjectName, teacherName] = await Promise.all([
    (async () => {
      const m = new Map<string, string>();
      if (subjectIds.length > 0) {
        const { data } = await supabase
          .from("subjects")
          .select("id, name")
          .in("id", subjectIds);
        (data ?? []).forEach((s) => m.set(s.id, s.name));
      }
      return m;
    })(),
    (async () => {
      const m = new Map<string, string>();
      if (teacherIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, username")
          .in("id", teacherIds);
        (data ?? []).forEach((p) => m.set(p.id, p.full_name ?? p.username));
      }
      return m;
    })(),
  ]);

  const classIds = classes.map((c) => c.id);
  const nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  const todayStr = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}-${String(nowDate.getDate()).padStart(2, "0")}`;
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  // Gün adı + tarih (örn. "Pazartesi 01.06.2026")
  const fmtDay = (d: string) => {
    const dt = new Date(d);
    const iso = ((dt.getDay() + 6) % 7) + 1;
    return `${weekdayLabel(iso)} ${fmt(d)}`;
  };

  // Öğrenci: haftalık program + sıradaki ders
  const slotsByClass = new Map<
    string,
    { id: string; weekday: number; start_time: string; end_time: string }[]
  >();
  const nextByClass = new Map<string, { date: string; is_makeup: boolean }>();
  if (person.role === "student" && classIds.length > 0) {
    const [slotsRes, nsRes] = await Promise.all([
      supabase
        .from("schedule_slots")
        .select("id, class_id, weekday, start_time, end_time")
        .in("class_id", classIds)
        .order("weekday"),
      supabase
        .from("sessions")
        .select("class_id, date, is_makeup")
        .in("class_id", classIds)
        .gte("date", todayStr)
        .order("date"),
    ]);
    (slotsRes.data ?? []).forEach((s) => {
      const a = slotsByClass.get(s.class_id) ?? [];
      a.push({
        id: s.id,
        weekday: s.weekday,
        start_time: s.start_time,
        end_time: s.end_time,
      });
      slotsByClass.set(s.class_id, a);
    });
    (nsRes.data ?? []).forEach((s) => {
      if (!nextByClass.has(s.class_id))
        nextByClass.set(s.class_id, { date: s.date, is_makeup: s.is_makeup });
    });
  }

  // Öğretmen: bu ay verilen ders + geçmiş
  let teacherMonthlyCount = 0;
  let teacherHistory: { id: string; date: string; className: string }[] = [];
  if (person.role === "teacher" && classIds.length > 0) {
    const first = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}-01`;
    const last = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}-31`;
    const [cntRes, pastRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .in("class_id", classIds)
        .gte("date", first)
        .lte("date", last),
      supabase
        .from("sessions")
        .select("id, date, class_id")
        .in("class_id", classIds)
        .lte("date", todayStr)
        .order("date", { ascending: false })
        .limit(20),
    ]);
    teacherMonthlyCount = cntRes.count ?? 0;
    const past = pastRes.data;
    const classNameById = new Map(classes.map((c) => [c.id, c.name]));
    teacherHistory = (past ?? []).map((s) => ({
      id: s.id,
      date: s.date,
      className: classNameById.get(s.class_id) ?? "Ders",
    }));
  }

  const canManage = viewer.role === "org_admin" || viewer.role === "branch_admin";

  // Öğretmen hakedişi (yönetici görünümünde)
  const showComp = canManage && person.role === "teacher";
  const earning = showComp ? await getTeacherEarningThisMonth(id) : null;

  // Öğretmen branşları (verebileceği dersler)
  let teacherSubjects: { id: string; name: string }[] = [];
  let subjectCandidates: { id: string; name: string }[] = [];
  if (showComp) {
    const { data: ts } = await supabase
      .from("teacher_subjects")
      .select("subject_id")
      .eq("teacher_id", id);
    const assignedIds = (ts ?? []).map((t) => t.subject_id);
    const { data: allSubs } = await supabase
      .from("subjects")
      .select("id, name")
      .order("name");
    const byId = new Map((allSubs ?? []).map((s) => [s.id, s.name]));
    teacherSubjects = assignedIds.map((sid) => ({
      id: sid,
      name: byId.get(sid) ?? "?",
    }));
    subjectCandidates = (allSubs ?? []).filter((s) => !assignedIds.includes(s.id));
  }

  // Ödeme geçmişi — verilen (maaş/hakediş): öğretmen ve personel için
  const showSalary =
    canManage && (person.role === "teacher" || person.role === "staff");
  let salaryPayments: {
    id: string;
    amount: number;
    expense_date: string;
    note: string | null;
  }[] = [];
  let salaryTotal = 0;
  if (showSalary) {
    const { data } = await supabase
      .from("expenses")
      .select("id, amount, expense_date, note")
      .eq("teacher_id", id)
      .eq("category", "maas")
      .order("expense_date", { ascending: false })
      .limit(24);
    salaryPayments = (data ?? []).map((e) => ({
      id: e.id,
      amount: Number(e.amount),
      expense_date: e.expense_date,
      note: e.note,
    }));
    salaryTotal = salaryPayments.reduce((s, e) => s + e.amount, 0);
  }

  // Öğrenci + yönetici görünümünde abonelik & ödeme
  const showBilling = canManage && person.role === "student";
  let sub: {
    monthly_fee: number;
    monthly_quota: number;
    total_months: number;
    start_date: string;
    opening_used: number;
    opening_balance: number;
    makeup_credits: number;
    billing_period: string | null;
  } | null = null;
  let payments: {
    id: string;
    amount: number;
    period_month: string;
    paid_at: string;
    note: string | null;
  }[] = [];
  let creditsUsed = 0;
  let adjustments: {
    id: string;
    amount: number;
    note: string | null;
    created_at: string;
  }[] = [];
  let ledger: Awaited<ReturnType<typeof getStudentLedger>> | null = null;
  if (showBilling) {
    // Abonelik, ödemeler, düzeltmeler, kullanılan ders ve defter — hepsi
    // birbirinden bağımsız; seri yerine paralel çalıştır.
    const [subRes, payRes, adjRes, used, lg] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("monthly_fee, monthly_quota, total_months, start_date, opening_used, opening_balance, makeup_credits, billing_period")
        .eq("student_id", id)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("id, amount, period_month, paid_at, note")
        .eq("student_id", id)
        .order("period_month", { ascending: false })
        .limit(12),
      supabase
        .from("adjustments")
        .select("id, amount, note, created_at")
        .eq("student_id", id)
        .order("created_at", { ascending: false }),
      getStudentUsedThisMonth(id),
      getStudentLedger(id),
    ]);
    sub = subRes.data;
    payments = payRes.data ?? [];
    adjustments = adjRes.data ?? [];
    creditsUsed = used;
    ledger = lg;
  }

  const monthLabel = (period: string) => {
    const [y, m] = period.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("tr-TR", {
      month: "short",
      year: "numeric",
    });
  };
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentDate = `${currentPeriod}-${String(now.getDate()).padStart(2, "0")}`;
  const quota = sub?.monthly_quota ?? 0;
  const remaining = quota - creditsUsed;
  const pkg = ledger?.billingMode === "package";

  // Ödeme geçmişi + bakiye düzeltmeleri birleşik, tarihe göre
  const history = [
    ...payments.map((p) => ({
      kind: "payment" as const,
      id: p.id,
      sort: p.paid_at,
      payment: p,
    })),
    ...adjustments.map((a) => ({
      kind: "adjustment" as const,
      id: a.id,
      sort: a.created_at,
      adj: a,
    })),
  ].sort((x, y) => (x.sort < y.sort ? 1 : -1));

  const backTip =
    person.role === "teacher"
      ? "ogretmen"
      : person.role === "staff"
        ? "personel"
        : "ogrenci";

  return (
    <PanelShell title={person.full_name ?? person.username} profile={viewer}>
      <Link
        href={`/kisiler?tip=${backTip}`}
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← Listeye dön
      </Link>

      <div className="card mb-6 p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-lg font-semibold text-primary">
            {(person.full_name ?? person.username).charAt(0).toLocaleUpperCase("tr")}
          </span>
          <div>
            <div className="text-lg font-semibold">
              {person.full_name ?? person.username}
            </div>
            <div className="text-sm text-muted">
              {ROLE_LABEL[person.role as UserRole]} · @{person.username}
              {person.is_active ? "" : " · Pasif"}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted">Telefon: </span>
            {person.phone || "—"}
          </div>
          <div>
            <span className="text-muted">Şube: </span>
            {branchNames.length ? branchNames.join(", ") : "—"}
          </div>
          <div>
            <span className="text-muted">E-posta: </span>
            {person.email || "—"}
          </div>
          <div>
            <span className="text-muted">İlk kayıt: </span>
            {person.created_at ? fmt(person.created_at) : "—"}
          </div>
          {person.role === "student" ? (
            <>
              <div>
                <span className="text-muted">Veli: </span>
                {person.guardian_name || "—"}
              </div>
              <div>
                <span className="text-muted">Veli telefonu: </span>
                {person.guardian_phone || "—"}
              </div>
              <div>
                <span className="text-muted">TC kimlik no: </span>
                {person.tc_kimlik_no || "—"}
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted">Adres: </span>
                {person.address || "—"}
              </div>
            </>
          ) : null}
        </div>

        {person.role === "student" ? (
          <div className="mt-4 grid gap-2 border-t border-border pt-4 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className="text-muted">Dersler: </span>
              {classes.length > 0
                ? classes
                    .map(
                      (c) =>
                        c.name +
                        (c.teacher_id
                          ? ` (${teacherName.get(c.teacher_id) ?? "?"})`
                          : ""),
                    )
                    .join(", ")
                : "—"}
            </div>
            <div className="sm:col-span-2">
              <span className="text-muted">Ders gün / saati: </span>
              {(() => {
                const prog = classes.flatMap((c) =>
                  (slotsByClass.get(c.id) ?? []).map(
                    (s) =>
                      `${weekdayLabel(s.weekday)} ${s.start_time.slice(0, 5)}`,
                  ),
                );
                return prog.length > 0 ? prog.join(", ") : "—";
              })()}
            </div>
            {sub ? (
              <>
                <div>
                  <span className="text-muted">Aylık aidat: </span>
                  {formatTRY(Number(sub.monthly_fee))}
                </div>
                <div>
                  <span className="text-muted">Abonelik türü: </span>
                  {sub.billing_period
                    ? (BILLING_PERIOD_LABEL[sub.billing_period] ??
                      sub.billing_period)
                    : "—"}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <Section
        title={person.role === "teacher" ? "Verdiği dersler" : "Aldığı dersler"}
        count={classes.length}
        defaultOpen
      >
      {classes.length > 0 ? (
        <div className="flex flex-col gap-2">
          {classes.map((c) => (
            <div key={c.id} className="card p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{c.name}</div>
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-muted">
                  {CLASS_TYPE_LABEL[c.type]}
                </span>
              </div>
              <div className="text-sm text-muted">
                {subjectName.get(c.subject_id) ?? "?"}
              </div>
              {person.role === "student" ? (
                <div className="mt-1 text-sm text-muted">
                  {(slotsByClass.get(c.id) ?? []).length > 0
                    ? (slotsByClass.get(c.id) ?? [])
                        .map(
                          (s) =>
                            `Her ${weekdayLabel(s.weekday)} ${s.start_time.slice(0, 5)}`,
                        )
                        .join(", ")
                    : "Program girilmemiş"}
                  {c.teacher_id
                    ? ` · ${teacherName.get(c.teacher_id) ?? "?"}`
                    : ""}
                  {nextByClass.get(c.id)
                    ? ` — Sıradaki ders: ${fmtDay(nextByClass.get(c.id)!.date)}${nextByClass.get(c.id)!.is_makeup ? " (telafi)" : ""}`
                    : ""}
                </div>
              ) : null}
              {canManage && person.role === "student" ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                    Ders günü / saati değiştir
                  </summary>
                  <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
                    {(slotsByClass.get(c.id) ?? []).map((s) => (
                      <EditSlotForm
                        key={s.id}
                        classId={c.id}
                        slotId={s.id}
                        weekday={s.weekday}
                        startTime={s.start_time.slice(0, 5)}
                        endTime={s.end_time.slice(0, 5)}
                        teacherId={c.teacher_id}
                      />
                    ))}
                    {(slotsByClass.get(c.id) ?? []).length === 0 ? (
                      <SlotForm classId={c.id} />
                    ) : null}
                  </div>
                </details>
              ) : null}
              {canManage ? (
                <Link
                  href={`/dersler/${c.id}`}
                  className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                >
                  Ders / program düzenle →
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Ders kaydı yok.</p>
      )}
      </Section>

      {canManage && person.role === "student" ? (
        <Section title="Kişisel bilgiler">
          <PersonContactForm
            personId={person.id}
            person={{
              phone: person.phone,
              email: person.email,
              tc_kimlik_no: person.tc_kimlik_no,
              address: person.address,
              guardian_name: person.guardian_name,
              guardian_phone: person.guardian_phone,
            }}
          />
        </Section>
      ) : null}

      {person.role === "teacher" ? (
        <>
          {showComp ? (
            <Section
              title="Verebileceği branşlar"
              count={teacherSubjects.length}
            >
              <div className="mb-3 flex flex-wrap gap-2">
                {teacherSubjects.length > 0 ? (
                  teacherSubjects.map((s) => (
                    <div
                      key={s.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent px-3 py-1 text-sm"
                    >
                      {s.name}
                      <form action={removeTeacherSubject}>
                        <input type="hidden" name="teacherId" value={person.id} />
                        <input type="hidden" name="subjectId" value={s.id} />
                        <button
                          type="submit"
                          className="font-bold text-danger"
                          title="Kaldır"
                        >
                          ×
                        </button>
                      </form>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">Henüz branş atanmadı.</p>
                )}
              </div>
              {subjectCandidates.length > 0 ? (
                <form action={addTeacherSubject} className="flex items-end gap-2">
                  <input type="hidden" name="teacherId" value={person.id} />
                  <label className="label">
                    Branş ekle
                    <select name="subjectId" defaultValue="" required className="input">
                      <option value="" disabled>
                        Seç
                      </option>
                      {subjectCandidates.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className="btn-ghost">
                    Ekle
                  </button>
                </form>
              ) : null}
            </Section>
          ) : null}

          <Section title="Ders durumu">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="card p-4">
                <div className="text-sm text-muted">Bu ay verilen ders</div>
                <div className="tabular mt-1 text-2xl font-bold">
                  {teacherMonthlyCount}
                </div>
              </div>
            </div>
          </Section>

          {showComp && earning ? (
            <Section title="Hakediş">
              <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="card p-4">
                  <div className="text-sm text-muted">Ücret tipi</div>
                  <div className="mt-1 text-lg font-semibold">
                    {earning.comp
                      ? COMP_TYPE_LABEL[earning.comp.comp_type]
                      : "Tanımsız"}
                  </div>
                  {earning.comp ? (
                    <div className="text-xs text-muted">
                      {formatTRY(earning.comp.rate)}
                      {earning.comp.comp_type === "per_session" ? " / ders" : " / ay"}
                    </div>
                  ) : null}
                </div>
                {earning.comp?.comp_type === "per_session" ? (
                  <div className="card p-4">
                    <div className="text-sm text-muted">Bu ay ders</div>
                    <div className="tabular mt-1 text-2xl font-bold">
                      {earning.sessions}
                    </div>
                  </div>
                ) : null}
                <div className="card p-4">
                  <div className="text-sm text-muted">Bu ay hakediş</div>
                  <div className="tabular mt-1 text-2xl font-bold text-primary">
                    {formatTRY(earning.earning)}
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="mb-3 font-semibold">Hakediş ayarı</h3>
                <TeacherCompensationForm
                  teacherId={person.id}
                  comp={earning.comp}
                />
              </div>
            </Section>
          ) : null}

          <Section title="Ders geçmişi" count={teacherHistory.length}>
          {teacherHistory.length > 0 ? (
            <div className="flex flex-col gap-2">
              {teacherHistory.map((h) => (
                <div
                  key={h.id}
                  className="card flex items-center justify-between p-3 text-sm"
                >
                  <span>{h.className}</span>
                  <span className="text-muted">{fmtDay(h.date)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Geçmiş ders yok.</p>
          )}
          </Section>
        </>
      ) : null}

      {showSalary ? (
        <Section
          title="Ödeme geçmişi — verilen (maaş / hakediş)"
          hint={formatTRY(salaryTotal)}
        >
          {salaryPayments.length > 0 ? (
            <div className="card divide-y divide-border">
              {salaryPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="text-muted">
                    {fmt(p.expense_date)}
                    {p.note ? ` · ${p.note}` : ""}
                  </span>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tabular font-semibold">
                      {formatTRY(p.amount)}
                    </span>
                    <Link
                      href={`/makbuz/gider/${p.id}`}
                      target="_blank"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Yazdır
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              Henüz maaş ödemesi yok. Giderler sayfasından ekleyebilirsiniz.
            </p>
          )}
        </Section>
      ) : null}

      {showBilling && ledger ? (
        <>
          <Section title="Borç durumu" defaultOpen>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-sm text-muted">
                  {ledger.balance > 0.5
                    ? "Güncel borç"
                    : ledger.balance < -0.5
                      ? "Alacaklı (fazla ödeme)"
                      : "Bakiye"}
                </div>
                <div
                  className={
                    "tabular mt-0.5 text-4xl font-bold tracking-tight " +
                    (ledger.balance > 0.5
                      ? "text-danger"
                      : ledger.balance < -0.5
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "")
                  }
                >
                  {formatTRY(Math.abs(ledger.balance))}
                </div>
                {ledger.balance > 0.5 ? (
                  <div className="mt-1 text-sm text-muted">
                    {pkg ? "Ödenmemiş bakiye" : `${ledger.unpaidDueCount} ay ödenmemiş`}
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-muted">Ödemeler güncel</div>
                )}
              </div>
              <div className="text-right text-sm text-muted">
                {ledger.openingBalance !== 0 ? (
                  <div>
                    Devir:{" "}
                    <span className="tabular font-medium text-foreground">
                      {formatTRY(ledger.openingBalance)}
                    </span>
                  </div>
                ) : null}
                {pkg ? null : (
                  <div>
                    Tahakkuk:{" "}
                    <span className="tabular font-medium text-foreground">
                      {formatTRY(ledger.dueExpected)}
                    </span>
                  </div>
                )}
                <div>
                  Ödenen:{" "}
                  <span className="tabular font-medium text-foreground">
                    {formatTRY(ledger.totalPaid)}
                  </span>
                </div>
              </div>
            </div>

            {ledger.periods.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
                {ledger.periods.map((p) => {
                  const cls =
                    p.status === "paid"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                      : p.status === "partial"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                        : p.status === "unpaid"
                          ? "bg-danger/10 text-danger border-danger/20"
                          : "bg-accent text-muted border-border";
                  const title =
                    p.status === "paid"
                      ? "Ödendi"
                      : p.status === "partial"
                        ? `Kısmi (${formatTRY(p.paid)})`
                        : p.status === "unpaid"
                          ? "Ödenmedi"
                          : "Vadesi gelmedi";
                  return (
                    <span
                      key={p.period}
                      title={title}
                      className={
                        "rounded-md border px-2 py-1 text-xs font-medium " + cls
                      }
                    >
                      {monthLabel(p.period)}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </Section>

          <Section title="Abonelik & ödeme">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="card p-4">
              <div className="text-sm text-muted">{pkg ? "Paket ücreti" : "Aylık ücret"}</div>
              <div className="mt-1 text-2xl font-bold">
                {sub ? `${Number(sub.monthly_fee)} ₺` : "—"}
              </div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-muted">{pkg ? "Ders hakkı" : "Aylık ders hakkı"}</div>
              <div className="mt-1 text-2xl font-bold">{quota}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-muted">{pkg ? "Kullanılan" : "Bu ay kullanılan"}</div>
              <div className="mt-1 text-2xl font-bold">{creditsUsed}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-muted">Kalan ders hakkı</div>
              <div className="mt-1 text-2xl font-bold">{remaining}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-muted">Telafi ders hakkı</div>
              <div className="mt-1 text-2xl font-bold">
                {sub?.makeup_credits ?? 0}
              </div>
            </div>
            </div>
          </Section>

          <Section title="Abonelik bilgileri">
            <SubscriptionForm studentId={person.id} sub={sub} />
          </Section>

          <Section title="Ödeme al">
            <PaymentForm
              studentId={person.id}
              defaultAmount={sub ? String(Number(sub.monthly_fee)) : ""}
              defaultPeriod={currentPeriod}
              defaultDate={currentDate}
              defaultReceivedBy={viewer.full_name ?? viewer.username}
            />
          </Section>

          {ledger ? (
            <Section title="Bakiyeyi güncelle">
              <BalanceForm studentId={person.id} currentBalance={ledger.balance} />
            </Section>
          ) : null}

          <Section title="Ödeme geçmişi" count={history.length}>
          {history.length > 0 ? (
            <div className="flex flex-col gap-2">
              {history.map((h) =>
                h.kind === "payment" ? (
                  <div
                    key={h.id}
                    className="card flex items-center justify-between p-3 text-sm"
                  >
                    <span>
                      {fmt(h.payment.paid_at)} · {Number(h.payment.amount)} ₺ ·{" "}
                      {new Date(h.payment.period_month).toLocaleDateString("tr-TR", {
                        month: "long",
                        year: "numeric",
                      })}{" "}
                      dönemi{h.payment.note ? " · " + h.payment.note : ""}
                    </span>
                    <div className="flex shrink-0 items-center gap-3">
                      <Link
                        href={`/makbuz/tahsilat/${h.id}`}
                        target="_blank"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Yazdır
                      </Link>
                      <form action={deletePayment}>
                        <input type="hidden" name="id" value={h.id} />
                        <input type="hidden" name="studentId" value={person.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                        >
                          Sil
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div
                    key={h.id}
                    className="card flex items-center justify-between gap-3 border-dashed p-3 text-sm"
                  >
                    <span>
                      {fmt(h.adj.created_at)} ·{" "}
                      <span className="font-medium">Bakiye güncellemesi</span>:{" "}
                      <span
                        className={
                          Number(h.adj.amount) >= 0
                            ? "text-danger"
                            : "text-emerald-600 dark:text-emerald-400"
                        }
                      >
                        {Number(h.adj.amount) >= 0 ? "+" : ""}
                        {Number(h.adj.amount)} ₺
                      </span>
                      {h.adj.note ? " · " + h.adj.note : ""}
                    </span>
                    <form action={deleteAdjustment}>
                      <input type="hidden" name="id" value={h.id} />
                      <input type="hidden" name="studentId" value={person.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                      >
                        Sil
                      </button>
                    </form>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">Henüz kayıt yok.</p>
          )}
          </Section>
        </>
      ) : null}

      {canManage ? (
        <Section title="Yönetim">
          <UserManageRow
            user={{
              id: person.id,
              username: person.username,
              full_name: person.full_name,
              role: person.role as UserRole,
              is_active: person.is_active,
            }}
            branchesText={branchNames.join(", ")}
          />
        </Section>
      ) : null}
    </PanelShell>
  );
}
