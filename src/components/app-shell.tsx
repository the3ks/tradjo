import type { Route } from "next";
import type { Session } from "next-auth";

import { NavLink } from "@/components/nav-link";
import { signOutAction } from "@/app/(app)/settings/actions";

const navigation = [
  { href: "/dashboard", label: "Dashboard", iconName: "dashboard" },
  { href: "/collections", label: "Collections", iconName: "collections" },
  { href: "/trades", label: "Trades", iconName: "trades" },
  { href: "/sync", label: "Sync", iconName: "sync" },
  { href: "/settings", label: "Settings", iconName: "settings" }
] satisfies Array<{
  href: Route;
  label: string;
  iconName: "dashboard" | "collections" | "trades" | "sync" | "settings";
}>;

export function AppShell({
  children,
  user
}: {
  children: React.ReactNode;
  user: NonNullable<Session["user"]>;
}) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border bg-surface px-4 py-5 lg:block">
        <div className="mb-8">
          <p className="text-sm font-semibold tracking-tight">Trading Journal</p>
          <p className="mt-1 truncate text-xs text-muted">
            {user.email ?? "Synced trade review"}
          </p>
        </div>
        <nav aria-label="Primary" className="grid gap-1">
          {navigation.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
        <form action={signOutAction} className="absolute inset-x-4 bottom-5">
          <button className="min-h-10 w-full rounded-lg border border-border px-3 text-sm font-medium text-muted transition hover:bg-surface-elevated hover:text-foreground active:translate-y-px">
            Log out
          </button>
        </form>
      </aside>

      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <p className="text-sm font-semibold">Trading Journal</p>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </header>

      <main className="pb-24 lg:ml-64 lg:pb-0">{children}</main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface px-2 py-2 lg:hidden"
      >
        {navigation.map((item) => (
          <NavLink key={item.href} {...item} compact />
        ))}
      </nav>
    </div>
  );
}
