"use client";

import { useActionState } from "react";
import { updateBalance } from "@/lib/billing-actions";
import { NumberField } from "@/components/ui/number-input";
import { Field } from "@/components/ui/field";

type State = { error: string | null; ok: boolean };
const initial: State = { error: null, ok: false };

const tl = (n: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(n);

export function BalanceForm({
  studentId,
  currentBalance,
}: {
  studentId: string;
  currentBalance: number;
}) {
  const [state, action, pending] = useActionState(updateBalance, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="studentId" value={studentId} />
      <div className="text-sm text-muted">
        Mevcut bakiye:{" "}
        <span
          className={
            "font-semibold " +
            (currentBalance > 0.5
              ? "text-danger"
              : currentBalance < -0.5
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-foreground")
          }
        >
          {tl(currentBalance)}
        </span>{" "}
        {currentBalance > 0.5 ? "(borç)" : currentBalance < -0.5 ? "(alacak)" : ""}
      </div>
      <NumberField
        label="Yeni bakiye (₺, borç +, alacak −)"
        name="newBalance"
        defaultValue={String(Math.round(currentBalance))}
      />
      <Field label="Not (isteğe bağlı)" name="note" />
      {state.error ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Bakiye güncellendi.
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn-primary self-start">
        {pending ? "…" : "Bakiyeyi güncelle"}
      </button>
    </form>
  );
}
