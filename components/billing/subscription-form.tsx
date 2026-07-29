"use client";

import { useActionState } from "react";
import { setSubscription } from "@/lib/billing-actions";
import { Field } from "@/components/ui/field";
import { NumberField } from "@/components/ui/number-input";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };
type Sub = {
  monthly_fee: number;
  monthly_quota: number;
  total_months: number;
  start_date: string;
  opening_used?: number;
  opening_balance?: number;
  makeup_credits?: number;
  billing_period?: string | null;
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
      <NumberField
        label="Aylık ücret (₺)"
        name="monthly_fee"
        defaultValue={sub ? String(sub.monthly_fee) : ""}
      />
      <NumberField
        label="Aylık ders hakkı"
        name="monthly_quota"
        defaultValue={sub ? String(sub.monthly_quota) : ""}
      />
      <NumberField
        label="Telafi ders hakkı"
        name="makeup_credits"
        defaultValue={sub?.makeup_credits ? String(sub.makeup_credits) : ""}
      />
      <NumberField
        label="Abonelik süresi (ay, 1-12)"
        name="total_months"
        defaultValue={sub ? String(sub.total_months) : "1"}
      />
      <label className="label">
        Abonelik türü (ödeme periyodu)
        <select
          name="billing_period"
          defaultValue={sub?.billing_period ?? "aylik"}
          className="input"
        >
          <option value="aylik">Aylık</option>
          <option value="3_aylik">3 Aylık</option>
          <option value="6_aylik">6 Aylık</option>
          <option value="yillik">Yıllık</option>
        </select>
      </label>
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
          <NumberField
            label="Bu ay önceden kullanılmış ders (devir)"
            name="opening_used"
            defaultValue={sub?.opening_used ? String(sub.opening_used) : ""}
          />
          <NumberField
            label="Açılış bakiyesi (borç +, alacak −)"
            name="opening_balance"
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
