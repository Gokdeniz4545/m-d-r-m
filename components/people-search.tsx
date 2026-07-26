"use client";

import { useState } from "react";
import Link from "next/link";
import { ROLE_LABEL, type UserRole } from "@/lib/roles";

type Person = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  branch: string;
  isActive: boolean;
  search: string;
};

export function PeopleSearch({ people }: { people: Person[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLocaleLowerCase("tr");
  const filtered = query
    ? people.filter((p) => p.search.includes(query))
    : people;

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Öğrenci, öğretmen veya ders adı ara..."
        className="input mb-4 w-full"
      />
      {filtered.length > 0 ? (
        <div className="flex flex-col gap-2">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/kisi/${p.id}`}
              className="card flex items-center justify-between gap-3 p-3 transition hover:border-primary/40 hover:bg-accent"
            >
              <div>
                <div className="font-medium">
                  {p.name}{" "}
                  <span className="text-sm font-normal text-muted">
                    ({p.username})
                  </span>
                </div>
                <div className="text-sm text-muted">
                  {ROLE_LABEL[p.role]}
                  {p.branch ? " · " + p.branch : ""}
                </div>
              </div>
              <span
                className={
                  p.isActive
                    ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    : "rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-muted"
                }
              >
                {p.isActive ? "Aktif" : "Pasif"}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Sonuç bulunamadı.</p>
      )}
    </div>
  );
}
