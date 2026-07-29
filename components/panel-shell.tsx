import { LogoutButton } from "@/components/logout-button";
import { SidebarNav } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { TodayDate } from "@/components/today-date";
import { Wordmark } from "@/components/wordmark";
import { ROLE_LABEL, ROLE_NAV, type Profile } from "@/lib/roles";
import { getClockOffsetDays } from "@/lib/clock";

export async function PanelShell({
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
  const clockOffset = await getClockOffsetDays();

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
        {clockOffset !== 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 border-b border-amber-500/30 bg-amber-500/15 px-4 py-1.5 text-center text-xs font-medium text-amber-700 dark:text-amber-300">
            <span>🕒 Test saati açık —</span>
            <TodayDate offsetDays={clockOffset} className="font-semibold" />
            <span className="text-amber-600/80 dark:text-amber-400/80">
              (gerçek değil, {clockOffset > 0 ? "+" : ""}
              {clockOffset} gün)
            </span>
          </div>
        ) : null}

        {/* Mobil üst bar */}
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <Wordmark />
          <div className="flex items-center gap-2">
            <TodayDate offsetDays={clockOffset} className="hidden text-xs min-[420px]:block" />
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
          <TodayDate offsetDays={clockOffset} />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-5 md:p-8">
          <h1 className="mb-5 text-xl font-bold md:hidden">{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
}
