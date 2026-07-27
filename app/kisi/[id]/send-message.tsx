"use client";

import { useActionState, useState } from "react";
import { sendStudentMessage } from "@/lib/message-actions";

type Tpl = { id: string; name: string; rendered: string };
const initial = { error: null as string | null, ok: false };

export function SendMessage({
  studentId,
  templates,
}: {
  studentId: string;
  templates: Tpl[];
}) {
  const [state, action, pending] = useActionState(sendStudentMessage, initial);
  const [sel, setSel] = useState(templates[0]?.id ?? "");
  const preview = templates.find((t) => t.id === sel)?.rendered ?? "";

  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted">
        Henüz mesaj türü yok. WhatsApp panelinden ekleyin (ödeme hatırlatma, derse
        gelmedi, telafi…).
      </p>
    );
  }

  return (
    <form action={action} className="card flex flex-col gap-3 p-5">
      <input type="hidden" name="studentId" value={studentId} />
      <label className="label">
        Mesaj türü
        <select
          name="templateId"
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          className="input"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      {preview ? (
        <div className="whitespace-pre-wrap rounded-lg bg-accent p-3 text-sm">
          {preview}
        </div>
      ) : null}
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.ok ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Mesaj kuyruğa eklendi.
        </p>
      ) : null}
      <button type="submit" disabled={pending || !sel} className="btn-primary self-start">
        {pending ? "…" : "WhatsApp'tan gönder"}
      </button>
    </form>
  );
}
