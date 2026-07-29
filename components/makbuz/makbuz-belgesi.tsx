import { tutarYaziyla } from "@/lib/sayi-yaziya";
import { formatTRY } from "@/lib/billing";
import { YazdirButonu } from "./yazdir-butonu";

// Makbuz sayfası her zaman açık (light) renklerle çizilir — temadan bağımsız,
// yazdırma/PDF için doğru görünüm.

export function MakbuzSayfa({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-neutral-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-[210mm] px-4 print:px-0">
        <div className="mb-4 flex justify-end print:hidden">
          <YazdirButonu />
        </div>
        {children}
      </div>
    </div>
  );
}

export function MakbuzYok() {
  return (
    <div className="flex min-h-full items-center justify-center bg-neutral-100 p-8 text-center text-neutral-900">
      <div>
        <div className="text-lg font-semibold">Makbuz bulunamadı</div>
        <p className="mt-1 text-sm text-neutral-500">
          Kayıt bulunamadı ya da erişim yetkiniz yok.
        </p>
      </div>
    </div>
  );
}

export function MakbuzBelgesi({
  baslik,
  kurumAdi,
  altBaslik,
  tarih,
  satirlar,
  tutar,
  solImza,
  sagImza,
}: {
  baslik: string;
  kurumAdi: string;
  altBaslik?: string | null;
  tarih: string;
  satirlar: { label: string; value: string }[];
  tutar: number;
  solImza: string;
  sagImza: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[210mm] bg-white p-8 text-neutral-900 shadow-sm print:p-6 print:shadow-none">
      {/* Başlık: kurum + tarih */}
      <div className="flex items-start justify-between gap-4 border-b-2 border-neutral-800 pb-4">
        <div>
          <div className="text-xl font-bold">{kurumAdi}</div>
          {altBaslik ? (
            <div className="mt-0.5 text-sm text-neutral-500">{altBaslik}</div>
          ) : null}
        </div>
        <div className="shrink-0 text-right text-sm text-neutral-500">
          Tarih:{" "}
          <span className="font-medium text-neutral-900">{tarih}</span>
        </div>
      </div>

      <h1 className="mt-6 text-center text-lg font-bold tracking-wide">
        {baslik}
      </h1>

      <div className="mt-6 space-y-2">
        {satirlar.map((s, i) => (
          <div key={i} className="flex gap-3 text-sm">
            <span className="w-32 shrink-0 text-neutral-500">{s.label}</span>
            <span className="min-w-0 font-medium">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-neutral-200 pt-4">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-neutral-500">Tutar</span>
          <span className="text-2xl font-bold tabular-nums">
            {formatTRY(tutar)}
          </span>
        </div>
        <div className="mt-1 text-right text-sm text-neutral-600">
          Yazıyla: {tutarYaziyla(tutar)}
        </div>
      </div>

      <div className="mt-14 flex justify-between gap-8 text-center text-sm">
        <div className="flex-1">
          <div className="border-t border-neutral-400 pt-1 text-neutral-500">
            {solImza}
          </div>
        </div>
        <div className="flex-1">
          <div className="border-t border-neutral-400 pt-1 text-neutral-500">
            {sagImza}
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-neutral-400">
        Bu belge resmî fatura / e-belge değildir.
      </p>
    </div>
  );
}
