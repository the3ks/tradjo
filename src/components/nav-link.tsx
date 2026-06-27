"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import type { IconProps } from "@phosphor-icons/react";
import {
  ChartLineUp,
  Folders,
  GearSix,
  ListChecks,
  PlugsConnected
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

const icons = {
  dashboard: ChartLineUp,
  collections: Folders,
  trades: ListChecks,
  sync: PlugsConnected,
  settings: GearSix
} satisfies Record<string, React.ComponentType<IconProps>>;

type NavLinkProps = {
  href: Route;
  label: string;
  iconName: keyof typeof icons;
  compact?: boolean;
};

export function NavLink({ href, label, iconName, compact }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  const Icon = icons[iconName];

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-transparent text-sm font-medium text-muted transition hover:border-border hover:bg-surface-elevated hover:text-foreground active:translate-y-px",
        isActive && "border-border bg-surface-elevated text-foreground",
        compact
          ? "min-h-14 flex-col justify-center gap-1 px-1 py-1 text-[11px]"
          : "min-h-11 px-3 py-2"
      )}
    >
      <Icon
        aria-hidden="true"
        size={compact ? 20 : 18}
        weight={isActive ? "fill" : "regular"}
      />
      <span>{label}</span>
    </Link>
  );
}
