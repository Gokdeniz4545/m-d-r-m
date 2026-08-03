import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { getMakeupPool } from "@/lib/makeup";
import { MakeupPoolCard } from "@/components/makeup-pool-card";

export default async function TelafiPage({
  searchParams,
}: {
  searchParams: Promise<{ sube?: string }>;
}) {
  const profile = await requireRole(["org_admin", "branch_admin"]);
  const sp = await searchParams;
  const sube = sp.sube || undefined;
  const pool = await getMakeupPool(sube);

  let branchName: string | null = null;
  let back = profile.role === "org_admin" ? "/kurum" : "/sube";
  if (sube) {
    const supabase = await createClient();
    const { data: b } = await supabase
      .from("branches")
      .select("name")
      .eq("id", sube)
      .maybeSingle();
    branchName = b?.name ?? null;
    back = `/kurum/sube/${sube}`;
  }

  return (
    <PanelShell
      title={
        branchName
          ? `Aboneliği bitmek üzere olanlar · ${branchName}`
          : "Aboneliği bitmek üzere olanlar"
      }
      profile={profile}
    >
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
