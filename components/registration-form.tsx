"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerStudent } from "@/lib/registration-actions";
import { Field } from "@/components/ui/field";
import { WEEKDAYS } from "@/lib/roles";

type State = { error: string | null; ok: boolean; studentId?: string };
const initial: State = { error: null, ok: false };
type Branch = { id: string; name: string };
type Teacher = { id: string; name: string; branchIds: string[] };

export function RegistrationForm({
  branches,
  teachers,
  subjects,
}: {
  branches: Branch[];
  teachers: Teacher[];
  subjects: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(registerStudent, initial);
  const [branchId, setBranchId] = useState(
    branches.length === 1 ? branches[0].id : "",
  );
  const [subjectChoice, setSubjectChoice] = useState(
    subjects.length > 0 ? "" : "__new__",
  );

  if (branches.length === 0) {
    return <p className="text-sm text-muted">Önce bir şube oluşturulmalı.</p>;
  }

  const branchTeachers = teachers.filter((t) => t.branchIds.includes(branchId));

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
            onChange={(e) => setBranchId(e.target.value)}
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
        <Field label="Telefon (WhatsApp için)" name="phone" type="tel" placeholder="05xx xxx xx xx" />
        <Field label="E-posta (isteğe bağlı)" name="email" type="email" />
        <p className="text-xs text-muted">
          Öğrenci giriş yapmaz; kullanıcı adı/şifre gerekmez.
        </p>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="section-title">Veli & bildirim</h2>
        <Field label="Veli adı soyadı" name="guardianName" />
        <Field
          label="Veli telefonu (WhatsApp hatırlatmaları için)"
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
            Öğrenci/veli, ödeme ve ders hatırlatmalarının WhatsApp/SMS/e-posta ile
            gönderilmesine onay veriyor (KVKK).
          </span>
        </label>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="section-title">Ders (birebir)</h2>
        <label className="label">
          Branş
          <select
            name="subjectId"
            required
            value={subjectChoice}
            onChange={(e) => setSubjectChoice(e.target.value)}
            className="input"
          >
            <option value="" disabled>
              Branş seçin
            </option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="__new__">+ Yeni branş ekle</option>
          </select>
        </label>
        {subjectChoice === "__new__" ? (
          <Field label="Yeni branş adı" name="newSubject" required />
        ) : null}
        <label className="label">
          Öğretmen (isteğe bağlı)
          <select key={branchId} name="teacherId" defaultValue="" className="input">
            <option value="">Atanmadı</option>
            {branchTeachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="section-title">Ücret & abonelik</h2>
        <Field label="Aylık ücret (₺)" name="monthly_fee" type="number" />
        <Field label="Aylık ders hakkı" name="monthly_quota" type="number" />
        <Field
          label="Abonelik süresi (ay, 1-12)"
          name="total_months"
          type="number"
          defaultValue="1"
        />
        <Field
          label="Ders başlangıç tarihi"
          name="start_date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
        <Field
          label="Kayıtta alınan ödeme (₺, isteğe bağlı)"
          name="initial_payment"
          type="number"
        />
        <div className="rounded-lg border border-dashed border-border p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Geçiş / devir (mevcut öğrenci ise)
          </div>
          <div className="flex flex-col gap-3">
            <Field
              label="Bu ay önceden kullanılmış ders"
              name="opening_used"
              type="number"
            />
            <Field
              label="Açılış bakiyesi (borç +, alacak −)"
              name="opening_balance"
              type="number"
            />
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="section-title">Haftalık program</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="label">
            Gün
            <select name="weekday" defaultValue="1" className="input">
              {WEEKDAYS.map((d, i) => (
                <option key={i} value={i + 1}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Başlangıç
            <input type="time" name="start_time" defaultValue="15:00" className="input" />
          </label>
          <label className="label">
            Bitiş
            <input type="time" name="end_time" defaultValue="16:00" className="input" />
          </label>
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
