import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { getCloudStatus } from "@/lib/wa-cloud-actions";
import { WhatsAppEmbedded } from "./whatsapp-embedded";
import { CloudControls } from "./cloud-controls";

const STATUS_LABEL: Record<string, string> = {
  queued: "Kuyrukta",
  sending: "Gönderiliyor",
  sent: "Gönderildi",
  failed: "Başarısız",
  canceled: "İptal",
};

export default async function WhatsAppPage() {
  const profile = await requireRole(["org_admin"]);
  const status = await getCloudStatus();

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
          {status.connected ? (
            <CloudControls displayPhone={status.displayPhone} />
          ) : (
            <WhatsAppEmbedded />
          )}
        </div>

        <div className="card p-5 text-sm text-muted">
          <h3 className="mb-2 font-semibold text-foreground">Resmi WhatsApp API</h3>
          <p>
            Kurumun kendi WhatsApp Business numarasını Meta&apos;nın resmi akışıyla
            bağlar. Banlanma riski yoktur, sunucu (worker) gerekmez.
          </p>
          <p className="mt-2 text-xs">
            Not: Gerçek müşterilere hatırlatma için Meta işletme doğrulaması ve
            şablon onayı gerekir (bir defalık kurulum).
          </p>
        </div>
      </div>

      <h2 className="section-title mb-3 mt-8">Gönderim geçmişi</h2>
      {recent && recent.length > 0 ? (
        <div className="card divide-y divide-border">
          {recent.map((n) => (
            <div
              key={n.id}
              className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
            >
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
