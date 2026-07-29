import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Test saati: uygulamanın "şimdi"si = gerçek zaman + offset_days gün.
// offset 0 iken tamamen gerçek zaman. Sadece test/demo için.

let cache: { offset: number; at: number } | null = null;
const TTL = 5000; // ms — istekler arası tekrar sorguyu azaltır

export async function getClockOffsetDays(): Promise<number> {
  if (cache && Date.now() - cache.at < TTL) return cache.offset;
  let offset = 0;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("app_clock")
      .select("offset_days")
      .eq("id", 1)
      .maybeSingle();
    offset = data?.offset_days ?? 0;
  } catch {
    // Tablo yoksa (migration çalışmadıysa) gerçek zamana düş.
    offset = 0;
  }
  cache = { offset, at: Date.now() };
  return offset;
}

// Sunucu tarafı "şimdi". new Date() yerine bunu kullan.
export async function getNow(): Promise<Date> {
  const off = await getClockOffsetDays();
  return new Date(Date.now() + off * 86_400_000);
}

// YYYY-MM-DD (yerel değil, kaydırılmış now'a göre)
export async function getToday(): Promise<string> {
  const d = await getNow();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
