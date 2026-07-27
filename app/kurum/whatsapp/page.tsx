import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { getWaStatus } from "@/lib/wa-actions";
import { WhatsAppConnect } from "./whatsapp-connect";

const STATUS_LABEL: Record<string, string> = {
  queued: "Kuyrukta",
  sending: "Gönderiliyor",
  sent: "Gönderildi",
  failed: "Başarısız",
  canceled: "İptal",
};

export default async function WhatsAppPage() {
  const profile = await requireRole(["org_admin"]);
  const initial = await getWaStatus();

  const supabase = await createClient();
  const { data: recent } = await supabase
    .from("notifications")
    .select("id, to_number, body, status, error, sent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  const fmt = (d: string) =>
    new Date(d).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <PanelShell title="WhatsApp Bağlantısı" profile={profile}>
      <Link
        href="/kurum"
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← Panele dön
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="max-w-md">
          <WhatsAppConnect initial={initial} />
        </div>

        <div className="card p-5 text-sm text-muted">
          <h3 className="mb-2 font-semibold text-foreground">Nasıl çalışır?</h3>
          <ol className="list-decimal space-y-1.5 pl-4">
            <li>&quot;WhatsApp bağla&quot; ile QR kodu oluştur.</li>
            <li>Kurumun telefonundan QR&apos;ı okut (Bağlı cihazlar).</li>
            <li>Bağlandıktan sonra hatırlatmalar bu numaradan gider.</li>
          </ol>
          <p className="mt-3 text-xs">
            Not: Bu yöntem kurumun kendi WhatsApp numarasını kullanır. Yoğun/otomatik
            gönderimde WhatsApp&apos;ın numarayı kısıtlama riski vardır; hatırlatmalar
            makul aralıklarla gönderilir.
          </p>
        </div>
      </div>

      <h2 className="section-title mb-3 mt-8">Gönderim geçmişi</h2>
      {recent && recent.length > 0 ? (
        <div className="card divide-y divide-border">
          {recent.map((n) => (
            <div key={n.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="tabular text-xs text-muted">{n.to_number ?? "—"}</div>
                <div className="truncate text-foreground">{n.body}</div>
                {n.error ? <div className="text-xs text-danger">{n.error}</div> : null}
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={
                    "chip " +
                    (n.status === "sent"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : n.status === "failed"
                        ? "text-danger"
                        : "")
                  }
                >
                  {STATUS_LABEL[n.status] ?? n.status}
                </span>
                <div className="mt-1 text-xs text-muted">
                  {fmt(n.sent_at ?? n.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Henüz bildirim gönderilmedi.</p>
      )}
    </PanelShell>
  );
}
