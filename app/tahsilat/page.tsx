import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { PanelShell } from "@/components/panel-shell";
import { getOutstanding, formatTRY } from "@/lib/billing";
import { remindPayment, remindAllOverdue } from "@/lib/notification-actions";

export default async function TahsilatPage() {
  const profile = await requireRole(["org_admin", "branch_admin"]);
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
        <>
          <div className="mb-3 flex justify-end">
            <form action={remindAllOverdue}>
              <button type="submit" className="btn-primary text-sm">
                Tümüne WhatsApp hatırlatması gönder
              </button>
            </form>
          </div>
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
                <form action={remindPayment}>
                  <input type="hidden" name="studentId" value={r.id} />
                  <button type="submit" className="btn-ghost shrink-0 text-xs">
                    Hatırlat
                  </button>
                </form>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="card p-8 text-center text-sm text-muted">
          Borçlu öğrenci yok. Tüm ödemeler güncel. 🎉
        </div>
      )}
    </PanelShell>
  );
}
