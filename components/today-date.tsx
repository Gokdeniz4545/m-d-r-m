"use client";

import { useEffect, useState } from "react";

// Bugünün tarihi — kullanıcının kendi saat dilimine göre, istemcide hesaplanır.
export function TodayDate({ className = "" }: { className?: string }) {
  const [today, setToday] = useState("");

  useEffect(() => {
    const fmt = () => {
      const d = new Date();
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
  }, []);

  return (
    <span
      suppressHydrationWarning
      className={"text-sm font-medium text-muted " + className}
    >
      {today}
    </span>
  );
}
