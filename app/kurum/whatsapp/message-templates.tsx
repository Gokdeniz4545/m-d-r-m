"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/lib/message-actions";
import { TEMPLATE_VARS } from "@/lib/render-template";
import { Field } from "@/components/ui/field";

type Tpl = { id: string; name: string; body: string };
const initial = { error: null as string | null, ok: false };

function VarHint() {
  return (
    <p className="text-xs text-muted">
      Değişkenler:{" "}
      {TEMPLATE_VARS.map((v) => (
        <code key={v.key} className="mr-1">
          {`{${v.key}}`}
        </code>
      ))}
      <br />
      Örn: <code>{"Sayın {veli}, {ogrenci} için {bakiye} ödeme bekliyoruz."}</code>
    </p>
  );
}

function CreateForm() {
  const [state, action, pending] = useActionState(createTemplate, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <Field label="Mesaj türü adı (örn. Derse gelmedi)" name="name" />
      <label className="label">
        Mesaj metni
        <textarea name="body" rows={3} className="input text-sm" />
      </label>
      <VarHint />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.ok ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">Eklendi.</p>
      ) : null}
      <button type="submit" disabled={pending} className="btn-primary self-start">
        {pending ? "…" : "Mesaj türü ekle"}
      </button>
    </form>
  );
}

function EditRow({ tpl }: { tpl: Tpl }) {
  const [state, action, pending] = useActionState(updateTemplate, initial);
  return (
    <details className="card p-3">
      <summary className="cursor-pointer text-sm font-medium">{tpl.name}</summary>
      <form action={action} className="mt-3 flex flex-col gap-2">
        <input type="hidden" name="id" value={tpl.id} />
        <Field label="Tür adı" name="name" defaultValue={tpl.name} />
        <label className="label">
          Metin
          <textarea
            name="body"
            rows={3}
            defaultValue={tpl.body}
            className="input text-sm"
          />
        </label>
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        {state.ok ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Güncellendi.
          </p>
        ) : null}
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "…" : "Kaydet"}
          </button>
        </div>
      </form>
      <form action={deleteTemplate} className="mt-2">
        <input type="hidden" name="id" value={tpl.id} />
        <button
          type="submit"
          className="text-xs font-medium text-danger hover:underline"
        >
          Bu türü sil
        </button>
      </form>
    </details>
  );
}

export function MessageTemplates({ templates }: { templates: Tpl[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-5">
        <h3 className="mb-3 font-semibold">Yeni mesaj türü</h3>
        <CreateForm />
      </div>
      <div>
        <h3 className="mb-3 font-semibold">
          Mesaj türleri ({templates.length})
        </h3>
        {templates.length > 0 ? (
          <div className="flex flex-col gap-2">
            {templates.map((t) => (
              <EditRow key={t.id} tpl={t} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Henüz mesaj türü yok. Soldan ekleyin (ödeme hatırlatma, derse gelmedi,
            telafi…).
          </p>
        )}
      </div>
    </div>
  );
}
