"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import type { NavItem } from "@/lib/roles";

export function SidebarNav({
  items,
  orientation = "vertical",
}: {
  items: NavItem[];
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  const horizontal = orientation === "horizontal";

  return (
    <nav className={horizontal ? "flex gap-1" : "flex flex-col gap-0.5"}>
      {items.map((it) => {
        const active =
          pathname === it.href ||
          (it.href !== "/" && pathname.startsWith(it.href + "/"));
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition " +
              (horizontal ? "shrink-0 " : "") +
              (active
                ? "bg-primary/10 font-semibold text-primary"
                : "font-medium text-muted hover:bg-accent hover:text-foreground")
            }
          >
            {it.icon ? (
              <Icon name={it.icon} className={active ? "opacity-100" : "opacity-70"} />
            ) : null}
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
