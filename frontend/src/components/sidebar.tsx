"use client";

import { Building2, FileText, LayoutDashboard, Menu, Search, Settings, UserCog, Users, UtensilsCrossed, X } from "lucide-react";
import { SearchTrigger, useOpenPalette } from "./command-palette";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./logo";
import { cx } from "./ui";

type NavItem = { href: string; label: string; icon: typeof Users; exact?: boolean };
const nav: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/branches", label: "Branches & Rooms", icon: Building2 },
  { href: "/app/students", label: "Students", icon: Users },
  { href: "/app/mess", label: "Mess", icon: UtensilsCrossed },
  { href: "/app/invoices", label: "Invoices & Payments", icon: FileText },
];
const ownerNav: NavItem[] = [
  { href: "/app/team", label: "Team", icon: UserCog },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  orgName,
  userName,
  role,
  logout,
}: {
  orgName: string;
  userName: string;
  role: string;
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const openPalette = useOpenPalette();
  const items = role === "owner" ? [...nav, ...ownerNav] : nav;

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/app" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="size-5 text-ink-500" />
        </button>
      </div>
      <div className="mx-3 mb-4 rounded-lg bg-brand-50 px-3 py-2.5">
        <p className="text-xs text-brand-700/80">Organization</p>
        <p className="truncate text-sm font-semibold text-brand-900">{orgName}</p>
      </div>
      <div className="mb-3 px-3">
        <SearchTrigger className="w-full" />
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
              )}
            >
              <item.icon className="size-4.5" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-ink-100 p-4">
        <p className="truncate text-sm font-medium text-ink-900">{userName}</p>
        <p className="text-xs capitalize text-ink-500">{role}</p>
        <form action={logout} className="mt-3">
          <button className="text-sm font-medium text-ink-600 hover:text-red-700">Log out</button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink-200 bg-white px-4 lg:hidden">
        <Logo />
        <div className="flex gap-1">
          <button onClick={openPalette} aria-label="Search" className="rounded-lg p-2 hover:bg-ink-100">
            <Search className="size-5" />
          </button>
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-ink-100">
            <Menu className="size-5" />
          </button>
        </div>
      </header>
      <aside className="no-print fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-ink-200 bg-white lg:block">{content}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">{content}</aside>
        </div>
      )}
    </>
  );
}
