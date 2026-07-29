"use client";

import { useEffect, useState } from "react";

// Bugünün tarihi — kullanıcının kendi saat dilimine göre, istemcide hesaplanır.
// offsetDays: test saati (gün ofseti); 0 iken gerçek zaman.
export function TodayDate({
  className = "",
  offsetDays = 0,
}: {
  className?: string;
  offsetDays?: number;
}) {
  const [today, setToday] = useState("");

  useEffect(() => {
    const fmt = () => {
      const d = new Date(Date.now() + offsetDays * 86_400_000);
      const tarih = d.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const gun = d.toLocaleDateString("tr-TR", { weekday: "long" });
      setToday(`${tarih} · ${gun}`);
    };
    fmt();
    // Gün değişince (gece yarısı) güncellensin
    const id = setInterval(fmt, 60_000);
    return () => clearInterval(id);
  }, [offsetDays]);

  return (
    <span
      suppressHydrationWarning
      className={"text-sm font-medium text-muted " + className}
    >
      {today}
    </span>
  );
}
