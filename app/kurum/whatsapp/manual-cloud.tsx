"use client";

import { useActionState, useEffect } from "react";
import { saveManualCloud } from "@/lib/wa-cloud-actions";
import { Field } from "@/components/ui/field";

const initial = { error: null as string | null, ok: false };

export function ManualCloud() {
  const [state, action, pending] = useActionState(saveManualCloud, initial);

  useEffect(() => {
    if (state.ok) setTimeout(() => location.reload(), 800);
  }, [state.ok]);

  return (
    <details className="card p-5">
      <summary className="cursor-pointer text-sm font-semibold">
        Test / manuel bağlama (Meta API Setup bilgileriyle)
      </summary>
      <p className="mt-3 text-sm text-muted">
        Meta&apos;da <b>WhatsApp → API Setup</b> ekranındaki değerleri yapıştır.
        Test numarası için Embedded Signup gerekmez.
      </p>
      <form action={action} className="mt-3 flex flex-col gap-3">
        <Field label="Phone Number ID" name="phone_number_id" />
        <label className="label">
          Access Token (geçici veya kalıcı)
          <textarea
            name="access_token"
            rows={3}
            className="input font-mono text-xs"
            placeholder="EAAG..."
          />
        </label>
        <Field label="Görünen numara (isteğe bağlı)" name="display_phone" />
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        {state.ok ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Kaydedildi, yenileniyor…
          </p>
        ) : null}
        <button type="submit" disabled={pending} className="btn-primary self-start">
          {pending ? "…" : "Bağla (test)"}
        </button>
      </form>
    </details>
  );
}
