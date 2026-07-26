import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PanelShell } from "@/components/panel-shell";
import { CreateBranchForm } from "../create-branch-form";

export default async function KurumSubeler() {
  const profile = await requireRole(["org_admin"]);
  const supabase = await createClient();

  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, address, phone")
    .order("name");

  return (
    <PanelShell title="Şubeler" profile={profile}>
      <Link
        href="/kurum"
        className="mb-4 inline-block text-sm text-muted hover:underline"
      >
        ← Panele dön
      </Link>
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="section-title mb-3">Şubeler ({branches?.length ?? 0})</h2>
          {branches && branches.length > 0 ? (
            <div className="flex flex-col gap-2">
              {branches.map((b) => (
                <Link
                  key={b.id}
                  href={`/kurum/sube/${b.id}`}
                  className="card block p-4 transition hover:border-primary/40 hover:bg-accent"
                >
                  <div className="font-medium">{b.name}</div>
                  {b.address || b.phone ? (
                    <div className="text-sm text-muted">
                      {[b.address, b.phone].filter(Boolean).join(" · ")}
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Henüz şube yok.</p>
          )}
        </section>

        <section>
          <h2 className="section-title mb-3">Yeni şube</h2>
          <CreateBranchForm />
        </section>
      </div>
    </PanelShell>
  );
}
