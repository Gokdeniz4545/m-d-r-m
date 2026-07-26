"use client";

import { useState } from "react";
import Link from "next/link";
import { ROLE_LABEL, type UserRole } from "@/lib/roles";

export type UserRow = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  branch: string;
  isActive: boolean;
};

const CATS: { key: string; label: string; match: (r: UserRow) => boolean }[] = [
  { key: "all", label: "Tümü", match: () => true },
  { key: "student", label: "Öğrenciler", match: (r) => r.role === "student" },
  { key: "teacher", label: "Öğretmenler", match: (r) => r.role === "teacher" },
  { key: "staff", label: "Personel", match: (r) => r.role === "staff" },
  {
    key: "admin",
    label: "Yöneticiler",
    match: (r) => r.role === "branch_admin" || r.role === "org_admin",
  },
];

export function UsersList({ users }: { users: UserRow[] }) {
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const query = q.trim().toLocaleLowerCase("tr");
  const catFn = CATS.find((c) => c.key === cat)?.match ?? (() => true);

  const filtered = users.filter(catFn).filter((r) => {
    if (!query) return true;
    return (r.name + " " + r.username + " " + r.branch + " " + ROLE_LABEL[r.role])
      .toLocaleLowerCase("tr")
      .includes(query);
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CATS.map((c) => {
          const count = users.filter(c.match).length;
          if (c.key !== "all" && count === 0) return null;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCat(c.key)}
              className={
                "rounded-full px-3 py-1 text-sm transition " +
                (cat === c.key
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "border border-border bg-card text-muted hover:bg-accent")
              }
            >
              {c.label} ({count})
            </button>
          );
        })}
      </div>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="İsim, kullanıcı adı veya şube ara…"
        className="input mb-4 w-full"
      />

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-2">
          {filtered.map((r) => (
            <Link
              key={r.id}
              href={`/kisi/${r.id}`}
              className="card flex items-center justify-between gap-3 p-3 transition hover:border-primary/40 hover:bg-accent"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {r.name}{" "}
                  <span className="text-sm font-normal text-muted">
                    ({r.username})
                  </span>
                </div>
                <div className="text-sm text-muted">
                  {ROLE_LABEL[r.role]}
                  {r.branch ? " · " + r.branch : ""}
                </div>
              </div>
              <span
                className={
                  "chip shrink-0 " +
                  (r.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted")
                }
              >
                {r.isActive ? "Aktif" : "Pasif"}
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
