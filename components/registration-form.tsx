"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { registerStudent } from "@/lib/registration-actions";
import { Field } from "@/components/ui/field";
import { NumberField } from "@/components/ui/number-input";
import { WEEKDAYS } from "@/lib/roles";
import { getTeacherWeeklyBusy, type BusySlot } from "@/lib/teacher-availability";
import { BookingGrid } from "@/components/booking-grid";

type State = { error: string | null; ok: boolean; studentId?: string };
const initial: State = { error: null, ok: false };
type Branch = { id: string; name: string };
type Teacher = {
  id: string;
  name: string;
  branchIds: string[];
};

// Tüm dersler 45 dk.
function addLessonLength(h: string): string {
  const [hh, mm] = h.split(":").map(Number);
  const t = hh * 60 + mm + 45;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export function RegistrationForm({
  branches,
  teachers,
}: {
  branches: Branch[];
  teachers: Teacher[];
}) {
  const [state, action, pending] = useActionState(registerStudent, initial);
  const [branchId, setBranchId] = useState(
    branches.length === 1 ? branches[0].id : "",
  );
  const [teacherId, setTeacherId] = useState("");
  const [weekday, setWeekday] = useState("1");
  const [startTime, setStartTime] = useState("15:00");
  const [endTime, setEndTime] = useState(addLessonLength("15:00"));
  const [busy, setBusy] = useState<BusySlot[]>([]);
  const [loadingBusy, startBusy] = useTransition();

  // Öğretmen seçilince haftalık dolu saatlerini getir
  useEffect(() => {
    if (!teacherId) {
      setBusy([]);
      return;
    }
    startBusy(async () => {
      setBusy(await getTeacherWeeklyBusy(teacherId));
    });
  }, [teacherId]);

  if (branches.length === 0) {
    return <p className="text-sm text-muted">Önce bir şube oluşturulmalı.</p>;
  }

  const branchTeachers = teachers.filter((t) => t.branchIds.includes(branchId));

  const selectSlot = (wd: number, h: string) => {
    setWeekday(String(wd));
    setStartTime(h);
    setEndTime(addLessonLength(h));
  };

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-6">
      <section className="card flex flex-col gap-3 p-5">
        <h2 className="section-title">Öğrenci bilgileri</h2>
        <label className="label">
          Şube
          <select
            name="branchId"
            required
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setTeacherId("");
            }}
            className="input"
          >
            <option value="" disabled>
              Şube seçin
            </option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <Field label="Ad soyad" name="fullName" required />
        <Field
          label="TC kimlik no (11 hane, isteğe bağlı)"
          name="tc_kimlik_no"
          inputMode="numeric"
          placeholder="12345678901"
        />
        <Field label="Telefon" name="phone" type="tel" placeholder="05xx xxx xx xx" />
        <Field label="E-posta (isteğe bağlı)" name="email" type="email" />
        <label className="label">
          Adres
          <textarea
            name="address"
            rows={2}
            placeholder="Mahalle, cadde, no, ilçe/il"
            className="input"
          />
        </label>
        <p className="text-xs text-muted">
          Öğrenci giriş yapmaz; kullanıcı adı/şifre gerekmez.
        </p>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="section-title">Veli & bildirim</h2>
        <Field label="Veli adı soyadı" name="guardianName" />
        <Field
          label="Veli telefonu"
          name="guardianPhone"
          type="tel"
          placeholder="05xx xxx xx xx"
        />
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="notifyConsent"
            defaultChecked
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span className="text-muted">
            Öğrenci/veli, ödeme ve ders hatırlatmaları için iletişime
            (telefon/SMS/e-posta) onay veriyor (KVKK).
          </span>
        </label>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="section-title">Öğretmen</h2>
        <label className="label">
          Öğretmen (isteğe bağlı)
          <select
            name="teacherId"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="input"
          >
            <option value="">Atanmadı</option>
            {branchTeachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {branchId && branchTeachers.length === 0 ? (
          <p className="text-xs text-muted">Bu şubede öğretmen yok.</p>
        ) : (
          <p className="text-xs text-muted">
            Öğrenci bu öğretmene bağlanır; dersleri onun takviminde planlanır.
          </p>
        )}
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="section-title">Ders hakkı & ücret</h2>
        <NumberField label="Ücret (₺)" name="monthly_fee" />
        <NumberField label="Ders hakkı (adet)" name="monthly_quota" />
        <NumberField label="Telafi ders hakkı" name="makeup_credits" />
        <NumberField
          label="Abonelik süresi (ay, 1-12)"
          name="total_months"
          defaultValue="1"
        />
        <Field
          label="Ders başlangıç tarihi"
          name="start_date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
        <NumberField
          label="Kayıtta alınan ödeme (₺, isteğe bağlı)"
          name="initial_payment"
        />
        <div className="rounded-lg border border-dashed border-border p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Geçiş / devir (mevcut öğrenci ise)
          </div>
          <div className="flex flex-col gap-3">
            <NumberField
              label="Bu ay önceden kullanılmış ders"
              name="opening_used"
            />
            <NumberField
              label="Açılış bakiyesi (borç +, alacak −)"
              name="opening_balance"
            />
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="section-title">Haftalık program</h2>
        {teacherId ? (
          <div className="rounded-lg border border-border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Öğretmen takvimi — boş saat seç
            </div>
            <BookingGrid
              busy={busy}
              weekday={parseInt(weekday, 10)}
              start={startTime}
              onSelect={selectSlot}
              loading={loadingBusy}
            />
          </div>
        ) : (
          <p className="text-xs text-muted">
            Öğretmen seçersen boş saatlerini takvimden seçebilirsin.
          </p>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <label className="label">
            Gün
            <select
              name="weekday"
              value={weekday}
              onChange={(e) => setWeekday(e.target.value)}
              className="input"
            >
              {WEEKDAYS.map((d, i) => (
                <option key={i} value={i + 1}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Başlangıç
            <input
              type="time"
              name="start_time"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                setEndTime(addLessonLength(e.target.value));
              }}
              className="input"
            />
          </label>
          <input type="hidden" name="end_time" value={endTime} />
          <span className="text-sm text-muted">— {endTime} (45 dk)</span>
        </div>
        <p className="text-xs text-muted">
          Girilen gün/saat için önümüzdeki 4 haftanın dersleri otomatik oluşturulur.
        </p>
      </section>

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-green-600 dark:text-green-400">
          Kayıt tamamlandı.{" "}
          {state.studentId ? (
            <Link href={`/kisi/${state.studentId}`} className="underline">
              Öğrenci profiline git →
            </Link>
          ) : null}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-primary self-start">
        {pending ? "Kaydediliyor..." : "Öğrenciyi kaydet"}
      </button>
    </form>
  );
}
