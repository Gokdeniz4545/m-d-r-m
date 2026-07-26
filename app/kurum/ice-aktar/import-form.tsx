"use client";

import { useActionState } from "react";
import { importStudents, type ImportState } from "@/lib/import-actions";

const initial: ImportState = { error: null, rows: [], created: 0, mode: null };

const TEMPLATE = `ad soyad;telefon;veli;veli telefon;şube;branş;aylık ücret;aylık ders;gün;saat;devir;açılış bakiye
Ayşe Yılmaz;05551112233;Fatma Yılmaz;05559998877;Merkez Şube;Matematik;2000;4;Pazartesi;15:00;3;0
Mehmet Demir;05553334455;;;Merkez Şube;İngilizce;1800;8;Salı;17:00;0;450`;

export function ImportForm() {
  const [state, action, pending] = useActionState(importStudents, initial);
  const okCount = state.rows.filter((r) => r.status === "ok").length;
  const errCount = state.rows.filter((r) => r.status === "error").length;

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="card p-4 text-sm text-muted">
        <p className="mb-2 font-medium text-foreground">CSV formatı</p>
        <p>
          Başlık satırı + her öğrenci bir satır. Sütunlar:{" "}
          <b>
            ad soyad, telefon, veli, veli telefon, şube, branş, aylık ücret, aylık
            ders, gün, saat, devir (bu ay kullanılmış ders), açılış bakiye (borç +,
            alacak −)
          </b>
          . Excel&apos;den kopyalayıp yapıştırabilirsin (ayraç «;» veya «,»). Şube
          adı sistemdekiyle eşleşmeli; tek şuben varsa boş bırakabilirsin.
        </p>
        <pre className="mt-2 overflow-x-auto rounded bg-accent p-2 text-xs">
          {TEMPLATE}
        </pre>
      </div>

      <textarea
        name="csv"
        rows={10}
        required
        placeholder="CSV'yi buraya yapıştır…"
        className="input font-mono text-sm"
      />

      <div className="flex gap-2">
        <button
          type="submit"
          name="mode"
          value="preview"
          disabled={pending}
          className="btn-ghost"
        >
          {pending ? "…" : "Önizle (kuru çalıştır)"}
        </button>
        <button
          type="submit"
          name="mode"
          value="import"
          disabled={pending}
          className="btn-primary"
        >
          {pending ? "…" : "İçe aktar"}
        </button>
      </div>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      {state.rows.length > 0 ? (
        <div>
          <p className="mb-2 text-sm">
            {state.mode === "import"
              ? `✅ ${state.created} öğrenci oluşturuldu.`
              : `${okCount} satır hazır, ${errCount} hata. Sorun yoksa "İçe aktar"a bas.`}
          </p>
          <div className="card divide-y divide-border text-sm">
            {state.rows.map((r, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-3 px-3 py-2"
              >
                <span>
                  <span className="text-muted">#{r.line}</span> {r.name}
                </span>
                <span
                  className={
                    r.status === "ok"
                      ? "text-right text-emerald-600 dark:text-emerald-400"
                      : "text-right text-danger"
                  }
                >
                  {r.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}
