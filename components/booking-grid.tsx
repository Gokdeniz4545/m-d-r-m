"use client";

import type { BusySlot } from "@/lib/teacher-availability";

const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
// 09:00–21:00 arası saatlik slotlar
const HOURS = Array.from({ length: 13 }, (_, i) => `${String(9 + i).padStart(2, "0")}:00`);

export function BookingGrid({
  busy,
  weekday,
  start,
  onSelect,
  loading,
}: {
  busy: BusySlot[];
  weekday: number;
  start: string;
  onSelect: (weekday: number, start: string) => void;
  loading?: boolean;
}) {
  const isBusy = (wd: number, h: string) =>
    busy.some((b) => b.weekday === wd && b.start <= h && h < b.end);

  return (
    <div className="overflow-x-auto">
      {loading ? (
        <p className="mb-2 text-xs text-muted">Uygun saatler yükleniyor…</p>
      ) : null}
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-1" />
            {DAYS.map((d) => (
              <th key={d} className="p-1 font-medium text-muted">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((h) => (
            <tr key={h}>
              <td className="tabular pr-2 text-right text-muted">{h}</td>
              {DAYS.map((_, i) => {
                const wd = i + 1;
                const busyCell = isBusy(wd, h);
                const selected = weekday === wd && start === h;
                return (
                  <td key={i} className="p-0.5">
                    <button
                      type="button"
                      disabled={busyCell}
                      onClick={() => onSelect(wd, h)}
                      title={busyCell ? "Öğretmen dolu" : `${DAYS[i]} ${h}`}
                      className={
                        "h-7 w-12 rounded text-[10px] font-medium transition " +
                        (busyCell
                          ? "cursor-not-allowed bg-danger/15 text-danger"
                          : selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent hover:bg-primary/20")
                      }
                    >
                      {busyCell ? "dolu" : selected ? "✓" : ""}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted">
        Boş kutuya tıkla → ders o gün/saate ayarlanır (bitiş +1 saat). İstersen
        aşağıdan elle değiştir.
      </p>
    </div>
  );
}
