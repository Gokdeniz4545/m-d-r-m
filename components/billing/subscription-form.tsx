"use client";

import { useActionState } from "react";
import { setSubscription } from "@/lib/billing-actions";
import { Field } from "@/components/ui/field";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };
type Sub = {
  monthly_fee: number;
  monthly_quota: number;
  total_months: number;
  start_date: string;
  opening_used?: number;
  opening_balance?: number;
} | null;

export function SubscriptionForm({
  studentId,
  sub,
}: {
  studentId: string;
  sub: Sub;
}) {
  const [state, action, pending] = useActionState(setSubscription, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="studentId" value={studentId} />
      <Field
        label="Aylık ücret (₺)"
        name="monthly_fee"
        type="number"
        defaultValue={sub ? String(sub.monthly_fee) : ""}
      />
      <Field
        label="Aylık ders hakkı"
        name="monthly_quota"
        type="number"
        defaultValue={sub ? String(sub.monthly_quota) : ""}
      />
      <Field
        label="Abonelik süresi (ay, 1-12)"
        name="total_months"
        type="number"
        defaultValue={sub ? String(sub.total_months) : "1"}
      />
      <Field
        label="Başlangıç tarihi"
        name="start_date"
        type="date"
        defaultValue={sub?.start_date ?? ""}
      />

      <div className="rounded-lg border border-dashed border-border p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Geçiş / devir (mevcut öğrenci)
        </div>
        <div className="flex flex-col gap-3">
          <Field
            label="Bu ay önceden kullanılmış ders (devir)"
            name="opening_used"
            type="number"
            defaultValue={sub?.opening_used ? String(sub.opening_used) : ""}
          />
          <Field
            label="Açılış bakiyesi (borç +, alacak −)"
            name="opening_balance"
            type="number"
            defaultValue={sub?.opening_balance ? String(sub.opening_balance) : ""}
          />
          <p className="text-xs text-muted">
            Örn. öğrenci bu ay 3 ders aldıysa &quot;3&quot;; sisteme geçmeden önce
            300₺ borcu varsa açılış bakiyesine &quot;300&quot; yazın.
          </p>
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-green-600 dark:text-green-400">Kaydedildi.</p>
      ) : null}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "..." : "Aboneliği kaydet"}
      </button>
    </form>
  );
}
