import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { PanelShell } from "@/components/panel-shell";
import { getOutstanding, formatTRY } from "@/lib/billing";

export default async function TahsilatPage() {
  const profile = await requireRole(["org_admin"]);
  const { rows, total } = await getOutstanding();

  return (
    <PanelShell title="Tahsilat" profile={profile}>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="card p-5">
          <div className="text-sm text-muted">Toplam alacak</div>
          <div className="tabular mt-0.5 text-3xl font-bold tracking-tight text-danger">
            {formatTRY(total)}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">Borçlu öğrenci</div>
          <div className="tabular mt-0.5 text-3xl font-bold tracking-tight">
            {rows.length}
          </div>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="card divide-y divide-border">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <Link
                  href={`/kisi/${r.id}`}
                  className="min-w-0 flex-1 hover:underline"
                >
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="text-xs text-muted">
                    {r.unpaidMonths} ay ödenmemiş
                    {r.phone ? ` · ${r.phone}` : ""}
                  </div>
                </Link>
                <div className="tabular shrink-0 font-semibold text-danger">
                  {formatTRY(r.balance)}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="card p-8 text-center text-sm text-muted">
          Borçlu öğrenci yok. Tüm ödemeler güncel. 🎉
        </div>
      )}
    </PanelShell>
  );
}
