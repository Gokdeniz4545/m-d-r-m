import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { PanelShell } from "@/components/panel-shell";
import { ImportForm } from "./import-form";

export default async function IceAktarPage() {
  const profile = await requireRole(["org_admin"]);
  return (
    <PanelShell title="Toplu içe aktar" profile={profile}>
      <Link
        href="/kurum"
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← Panele dön
      </Link>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Mevcut öğrencilerini tek seferde sisteme aktar. Önce <b>Önizle</b> ile
        kontrol et, sonra <b>İçe aktar</b>. Devir alanlarıyla öğrenciler kaldıkları
        yerden (kalan ders + bakiye) devam eder.
      </p>
      <ImportForm />
    </PanelShell>
  );
}
