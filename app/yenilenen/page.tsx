import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { getRenewedStudents } from "@/lib/makeup";
import { RenewedCard } from "@/components/renewed-card";

export default async function YenilenenPage({
  searchParams,
}: {
  searchParams: Promise<{ sube?: string }>;
}) {
  const profile = await requireRole(["org_admin", "branch_admin"]);
  const sp = await searchParams;
  const sube = sp.sube || undefined;
  const rows = await getRenewedStudents(sube);

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
          ? `Aboneliği bu hafta yenilenen · ${branchName}`
          : "Aboneliği bu hafta yenilenen"
      }
      profile={profile}
    >
      <Link
        href={back}
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← Panele dön
      </Link>
      <RenewedCard rows={rows} />
    </PanelShell>
  );
}
