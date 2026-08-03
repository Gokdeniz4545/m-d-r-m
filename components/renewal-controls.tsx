"use client";

import { setAutoRenew, renewStudent } from "@/lib/renewal-actions";

export function AutoRenewToggle({
  studentId,
  on,
}: {
  studentId: string;
  on: boolean;
}) {
  return (
    <form action={setAutoRenew} className="flex items-center gap-2">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="on" value={on ? "false" : "true"} />
      <span className="text-sm">
        Otomatik yenileme:{" "}
        <strong>{on ? "Açık" : "Kapalı"}</strong>
      </span>
      <button
        type="submit"
        className={
          "rounded-full px-3 py-1 text-xs font-medium transition " +
          (on
            ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400"
            : "bg-danger/15 text-danger hover:bg-danger/25")
        }
      >
        {on ? "Kapat" : "Aç"}
      </button>
    </form>
  );
}

export function RenewButton({ studentId }: { studentId: string }) {
  return (
    <form action={renewStudent}>
      <input type="hidden" name="studentId" value={studentId} />
      <button type="submit" className="btn-primary">
        Yenile — aktifleştir + oto-yenilemeyi aç
      </button>
    </form>
  );
}
