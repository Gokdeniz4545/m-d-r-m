import { LogoutButton } from "@/components/logout-button";
import { SidebarNav } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { ROLE_LABEL, ROLE_NAV, type Profile } from "@/lib/roles";

export function PanelShell({
  title,
  profile,
  children,
}: {
  title: string;
  profile: Profile;
  children?: React.ReactNode;
}) {
  const nav = ROLE_NAV[profile.role];
  const displayName = profile.full_name ?? profile.username;
  const initial = displayName.charAt(0).toLocaleUpperCase("tr");

  return (
    <div className="flex min-h-screen">
      {/* Kenar çubuğu (masaüstü) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar p-4 md:flex">
        <div className="mb-6 px-2">
          <Wordmark />
        </div>

        <SidebarNav items={nav} />

        <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-2 px-1">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">
              {initial}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{displayName}</div>
              <div className="truncate text-xs text-muted">
                {ROLE_LABEL[profile.role]}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LogoutButton />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* İçerik */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobil üst bar */}
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <Wordmark />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>
        <div className="overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
          <SidebarNav items={nav} orientation="horizontal" />
        </div>

        {/* Masaüstü başlık */}
        <header className="hidden items-center justify-between border-b border-border px-8 py-5 md:flex">
          <h1 className="text-xl font-bold">{title}</h1>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-5 md:p-8">
          <h1 className="mb-5 text-xl font-bold md:hidden">{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
}
