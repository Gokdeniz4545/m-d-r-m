"use client";

import { useActionState, useTransition } from "react";
import { sendCloudTest, disconnectCloud } from "@/lib/wa-cloud-actions";

const initial = { error: null as string | null, ok: false };

export function CloudControls({ displayPhone }: { displayPhone: string | null }) {
  const [state, action, pending] = useActionState(sendCloudTest, initial);
  const [disc, startDisc] = useTransition();

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        <span className="font-semibold">Bağlı (resmi API)</span>
      </div>
      {displayPhone ? (
        <p className="mt-1 text-sm text-muted">
          Numara: <span className="tabular">{displayPhone}</span>
        </p>
      ) : null}

      <form action={action} className="mt-4 flex flex-wrap items-end gap-2">
        <label className="label">
          Test mesajı gönder (numara)
          <input
            name="to"
            type="tel"
            placeholder="05xx xxx xx xx"
            className="input"
          />
        </label>
        <button type="submit" disabled={pending} className="btn-ghost">
          {pending ? "…" : "Test gönder"}
        </button>
      </form>
      <p className="mt-1 text-xs text-muted">
        Test, Meta&apos;nın hazır &quot;hello_world&quot; şablonunu gönderir.
      </p>
      {state.error ? <p className="mt-2 text-sm text-danger">{state.error}</p> : null}
      {state.ok ? (
        <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
          Test mesajı gönderildi.
        </p>
      ) : null}

      <button
        onClick={() =>
          startDisc(async () => {
            await disconnectCloud();
            location.reload();
          })
        }
        disabled={disc}
        className="btn-danger mt-4"
      >
        Bağlantıyı kes
      </button>
    </div>
  );
}
