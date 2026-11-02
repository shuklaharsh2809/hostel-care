"use client";

import { Command } from "cmdk";
import { Building2, FileText, LayoutDashboard, Plus, Receipt, Search, Settings, UserPlus, Users, UtensilsCrossed } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { money } from "@/lib/format";
import { studentPhoto } from "@/lib/photo";
import type { SearchResults } from "@/lib/types";
import { Avatar, InvoiceStatusBadge, cx } from "./ui";

const PaletteContext = createContext<() => void>(() => {});
/** Call to open the palette from any button. */
export const useOpenPalette = () => use(PaletteContext);

const ACTIONS = [
  { label: "Add student", href: "/app/students/new", icon: UserPlus, keywords: "new admission admit" },
  { label: "New invoice", href: "/app/invoices/new", icon: Plus, keywords: "bill create" },
  { label: "Monthly billing run", href: "/app/invoices/bulk", icon: Receipt, keywords: "bulk generate rent" },
  { label: "Dashboard", href: "/app", icon: LayoutDashboard, keywords: "home overview" },
  { label: "Branches & rooms", href: "/app/branches", icon: Building2, keywords: "beds hostel" },
  { label: "Students", href: "/app/students", icon: Users, keywords: "list" },
  { label: "Mess", href: "/app/mess", icon: UtensilsCrossed, keywords: "menu food expenses" },
  { label: "Invoices & payments", href: "/app/invoices", icon: FileText, keywords: "dues" },
  { label: "Settings", href: "/app/settings", icon: Settings, keywords: "gst prefix organization" },
];

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Bumped on every open so cmdk starts fresh (no stale highlighted item from the last visit).
  const [session, setSession] = useState(0);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(""); // item the user arrowed to; "" = follow the top result
  const show = () => {
    setSession((n) => n + 1);
    setOpen(true);
  };
  // Results remember which term they answer, so "loading" is derived instead of stored.
  const [found, setFound] = useState<{ term: string; data: SearchResults } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (open) setOpen(false);
        else show();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Debounced server search; stale responses are ignored.
  const term = q.trim();
  useEffect(() => {
    if (term.length < 2) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`).catch(() => null);
      if (!cancelled && res?.ok) setFound({ term, data: await res.json() });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term]);
  // Only show results that answer the current term (stale results would steal the highlight).
  const results = term.length >= 2 && found?.term === term ? found.data : null;
  const loading = term.length >= 2 && found?.term !== term;

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  const lower = term.toLowerCase();
  const actions = ACTIONS.filter((a) => !lower || `${a.label} ${a.keywords}`.toLowerCase().includes(lower));
  const values = [
    ...(results?.students.map((x) => `student-${x.id}`) ?? []),
    ...(results?.invoices.map((x) => `invoice-${x.id}`) ?? []),
    ...(results?.branches.map((x) => `branch-${x.id}`) ?? []),
    ...actions.map((a) => `action-${a.href}`),
  ];
  const active = values.includes(picked) ? picked : (values[0] ?? "");
  const empty = term.length >= 2 && !loading && results && !results.students.length && !results.invoices.length && !results.branches.length && !actions.length;

  return (
    <PaletteContext value={show}>
      {children}
      <Command.Dialog
        key={session}
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQ("");
        }}
        shouldFilter={false}
        value={active}
        onValueChange={setPicked}
        label="Search HostelCare"
        overlayClassName="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-[2px]"
        contentClassName="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-ink-100 px-4">
          <Search className="size-4 shrink-0 text-ink-400" />
          <Command.Input
            value={q}
            onValueChange={(v) => {
              setQ(v);
              setPicked("");
            }}
            placeholder="Search students, phone, room, invoice no…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-ink-400"
          />
          <kbd className="hidden rounded border border-ink-200 px-1.5 py-0.5 text-[10px] text-ink-500 sm:block">ESC</kbd>
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          {loading && <Command.Loading className="px-3 py-2 text-xs text-ink-400">Searching…</Command.Loading>}
          {empty && <p className="px-3 py-8 text-center text-sm text-ink-500">Nothing found for “{q.trim()}”.</p>}

          {results && results.students.length > 0 && (
            <Group heading="Students">
              {results.students.map((s) => (
                <Item key={s.id} value={`student-${s.id}`} onSelect={() => go(`/app/students/${s.id}`)}>
                  <Avatar name={s.fullName} src={studentPhoto(s.id, s.photoUrl)} className="size-7 text-[10px]" />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium text-ink-900">{s.fullName}</span>
                    <span className="ml-2 text-xs text-ink-500">
                      {s.branchCode}
                      {s.roomNumber ? ` · Room ${s.roomNumber}` : ""}
                      {s.phone ? ` · ${s.phone}` : ""}
                      {s.status === "left" ? " · Left" : ""}
                    </span>
                  </span>
                </Item>
              ))}
            </Group>
          )}
          {results && results.invoices.length > 0 && (
            <Group heading="Invoices">
              {results.invoices.map((inv) => (
                <Item key={inv.id} value={`invoice-${inv.id}`} onSelect={() => go(`/app/invoices/${inv.id}`)}>
                  <FileText className="size-4 text-ink-400" />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium text-ink-900">{inv.number}</span>
                    <span className="ml-2 text-xs text-ink-500">{inv.studentName}</span>
                  </span>
                  <span className="text-xs text-ink-600 tabular-nums">{money(inv.total)}</span>
                  <InvoiceStatusBadge status={inv.status} />
                </Item>
              ))}
            </Group>
          )}
          {results && results.branches.length > 0 && (
            <Group heading="Branches">
              {results.branches.map((b) => (
                <Item key={b.id} value={`branch-${b.id}`} onSelect={() => go(`/app/branches/${b.id}`)}>
                  <Building2 className="size-4 text-ink-400" />
                  <span className="font-medium text-ink-900">{b.name}</span>
                  <span className="text-xs text-ink-500">{b.city ?? b.code}</span>
                </Item>
              ))}
            </Group>
          )}
          {actions.length > 0 && (
            <Group heading={lower ? "Actions" : "Quick actions"}>
              {actions.map((a) => (
                <Item key={a.href} value={`action-${a.href}`} onSelect={() => go(a.href)}>
                  <a.icon className="size-4 text-ink-400" />
                  {a.label}
                </Item>
              ))}
            </Group>
          )}
        </Command.List>
      </Command.Dialog>
    </PaletteContext>
  );
}

function Group({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-500 [&_[cmdk-group-heading]]:uppercase"
    >
      {children}
    </Command.Group>
  );
}

function Item({ children, value, onSelect }: { children: ReactNode; value: string; onSelect: () => void }) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cx("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-700", "data-[selected=true]:bg-brand-50 data-[selected=true]:text-ink-900")}
    >
      {children}
    </Command.Item>
  );
}

/** Search box look-alike that opens the palette. */
export function SearchTrigger({ className }: { className?: string }) {
  const open = useOpenPalette();
  return (
    <button
      type="button"
      onClick={open}
      className={cx("flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-400 hover:border-ink-300", className)}
    >
      <Search className="size-4" />
      <span className="flex-1 text-left">Search…</span>
      <kbd className="rounded border border-ink-200 px-1.5 text-[10px] text-ink-500">⌘K</kbd>
    </button>
  );
}
