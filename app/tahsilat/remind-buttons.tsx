"use client";

import { useActionState } from "react";
import { remindPayment, remindAllOverdue } from "@/lib/notification-actions";
import type { RemindState } from "@/lib/notification-actions";

const initial: RemindState = { ok: false, message: null, error: null };

export function RemindButton({ studentId }: { studentId: string }) {
  const [state, action, pending] = useActionState(remindPayment, initial);
  return (
    <form action={action} className="flex shrink-0 flex-col items-end gap-1">
      <input type="hidden" name="studentId" value={studentId} />
      <button type="submit" disabled={pending} className="btn-ghost text-xs">
        {pending ? "Gönderiliyor…" : state.ok ? "Tekrar hatırlat" : "Hatırlat"}
      </button>
      {state.ok && state.message ? (
        <span className="max-w-[12rem] text-right text-[11px] leading-tight text-emerald-600 dark:text-emerald-400">
          ✓ {state.message}
        </span>
      ) : null}
      {state.error ? (
        <span className="max-w-[12rem] text-right text-[11px] leading-tight text-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

export function RemindAllButton() {
  const [state, action, pending] = useActionState(remindAllOverdue, initial);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button type="submit" disabled={pending} className="btn-primary text-sm">
        {pending ? "Gönderiliyor…" : "Tümüne WhatsApp hatırlatması gönder"}
      </button>
      {state.ok && state.message ? (
        <span className="text-xs text-emerald-600 dark:text-emerald-400">
          ✓ {state.message}
        </span>
      ) : null}
      {state.error ? (
        <span className="text-xs text-danger">{state.error}</span>
      ) : null}
    </form>
  );
}
