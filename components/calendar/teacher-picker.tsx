"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function TeacherPicker({
  teachers,
  current,
}: {
  teachers: { id: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const go = (t: string) => {
    const params = new URLSearchParams(sp.toString());
    if (t) params.set("t", t);
    else params.delete("t");
    router.push(`/takvim?${params.toString()}`);
  };
  return (
    <select
      value={current}
      onChange={(e) => go(e.target.value)}
      className="input max-w-[16rem]"
      aria-label="Takvim seçimi"
    >
      <option value="">Okul takvimi (tümü)</option>
      {teachers.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
