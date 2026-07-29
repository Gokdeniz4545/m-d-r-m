"use client";

import { useActionState, useEffect, useRef } from "react";
import { recordPayment } from "@/lib/billing-actions";
import { Field } from "@/components/ui/field";
import { NumberField } from "@/components/ui/number-input";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };

export function PaymentForm({
  studentId,
  defaultAmount,
  defaultPeriod,
  defaultDate,
  defaultReceivedBy,
}: {
  studentId: string;
  defaultAmount: string;
  defaultPeriod: string;
  defaultDate: string;
  defaultReceivedBy?: string;
}) {
  const [state, action, pending] = useActionState(recordPayment, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="studentId" value={studentId} />
      <NumberField label="Tutar (₺)" name="amount" defaultValue={defaultAmount} />
      <label className="label">
        Ödeme tarihi
        <input
          type="date"
          name="paidAt"
          defaultValue={defaultDate}
          required
          className="input"
        />
      </label>
      <label className="label">
        Dönem (hangi ay)
        <input
          type="month"
          name="period"
          defaultValue={defaultPeriod}
          required
          className="input"
        />
      </label>
      <Field label="Not (isteğe bağlı)" name="note" />
      <Field
        label="Ödemeyi alan"
        name="receivedBy"
        defaultValue={defaultReceivedBy}
      />
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "..." : "Ödeme al"}
      </button>
      {state.error ? (
        <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="w-full text-sm text-green-600 dark:text-green-400">
          Ödeme kaydedildi.
        </p>
      ) : null}
    </form>
  );
}
