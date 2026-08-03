import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { PanelShell } from "@/components/panel-shell";
import { getMakeupPool } from "@/lib/makeup";
import { MakeupPoolCard } from "@/components/makeup-pool-card";

export default async function TelafiPage() {
  const profile = await requireRole(["org_admin", "branch_admin"]);
  const pool = await getMakeupPool();
  const back = profile.role === "org_admin" ? "/kurum" : "/sube";
  return (
    <PanelShell title="Telafi Havuzu" profile={profile}>
      <Link
        href={back}
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← Panele dön
      </Link>
      <MakeupPoolCard pool={pool} />
    </PanelShell>
  );
}
