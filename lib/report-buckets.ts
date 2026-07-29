// Raporlar için zaman kovaları: gün / hafta / ay ölçeğinde son N dönem.

export type Scale = "gun" | "hafta" | "ay";

export type Bucket = { key: string; label: string; start: Date; end: Date };

export const SCALE_COUNT: Record<Scale, number> = {
  gun: 30, // son 30 gün
  hafta: 12, // son 12 hafta
  ay: 12, // son 12 ay
};

export function isScale(v: unknown): v is Scale {
  return v === "gun" || v === "hafta" || v === "ay";
}

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Haftanın başı (Pazartesi), saat sıfırlı.
function startOfWeek(d: Date): Date {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  const dow = (m.getDay() + 6) % 7; // 0 = Pazartesi
  m.setDate(m.getDate() - dow);
  return m;
}

/** Seçilen ölçek için kronolojik (eskiden yeniye) kova listesi. */
export function getBuckets(scale: Scale): Bucket[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const n = SCALE_COUNT[scale];
  const buckets: Bucket[] = [];

  if (scale === "gun") {
    for (let i = n - 1; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - i);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      buckets.push({
        key: dayKey(start),
        label: `${pad(start.getDate())}.${pad(start.getMonth() + 1)}`,
        start,
        end,
      });
    }
  } else if (scale === "hafta") {
    const thisMonday = startOfWeek(now);
    for (let i = n - 1; i >= 0; i--) {
      const start = new Date(thisMonday);
      start.setDate(thisMonday.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      buckets.push({
        key: dayKey(start),
        label: `${pad(start.getDate())}.${pad(start.getMonth() + 1)}`,
        start,
        end,
      });
    }
  } else {
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = n - 1; i >= 0; i--) {
      const start = new Date(
        firstOfThisMonth.getFullYear(),
        firstOfThisMonth.getMonth() - i,
        1,
      );
      const end = new Date(
        start.getFullYear(),
        start.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      buckets.push({
        key: `${start.getFullYear()}-${pad(start.getMonth() + 1)}`,
        label: start.toLocaleDateString("tr-TR", {
          month: "short",
          year: "2-digit",
        }),
        start,
        end,
      });
    }
  }
  return buckets;
}

/** Bir tarihin, verilen ölçekteki kova anahtarı. getBuckets ile aynı kural. */
export function bucketKeyOf(scale: Scale, date: Date): string {
  const d = new Date(date);
  if (scale === "ay") return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  if (scale === "gun") {
    d.setHours(0, 0, 0, 0);
    return dayKey(d);
  }
  return dayKey(startOfWeek(d));
}

/** Tarih/tutar kayıtlarını ölçeğe göre toplayıp kova sırasına dizer. */
export function bucketize(
  buckets: Bucket[],
  scale: Scale,
  items: { date: string | Date; value: number }[],
): number[] {
  const sum = new Map<string, number>();
  for (const it of items) {
    const k = bucketKeyOf(scale, new Date(it.date));
    sum.set(k, (sum.get(k) ?? 0) + it.value);
  }
  return buckets.map((b) => sum.get(b.key) ?? 0);
}
