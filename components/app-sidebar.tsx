"use client";

import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppSidebar() {
  return (
    <aside className="flex h-svh w-[280px] flex-col border-r border-border bg-card/30 transition-colors duration-300">
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        <div className="size-9 rounded-xl bg-primary/10 ring-1 ring-border" />
        <div className="leading-tight">
          <div className="font-heading text-sm font-medium">Wishpr</div>
          <div className="text-xs text-muted-foreground">Outbound engine</div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors duration-300"
        >
          Dashboard
        </Link>
        <Link
          href="/leads"
          className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-300"
        >
          Leads
        </Link>
        <Link
          href="/campaigns"
          className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-300"
        >
          Campaigns
        </Link>
        <Link
          href="/settings/email-accounts"
          className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-300"
        >
          Email Accounts
        </Link>
        <Link
          href="/protected"
          className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-300"
        >
          Account
        </Link>
      </nav>

      <div className="mt-auto border-t border-border p-3">
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}

