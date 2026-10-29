// frontend/src/components/admin/AdminShell.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, Sun, Moon, LogOut, ExternalLink, X, Download, Share, LayoutDashboard, Wrench, CalendarDays, Receipt, MoreHorizontal, Timer, Wallet, BarChart3, Landmark, BookText } from "lucide-react";
import { registerAdminServiceWorker, useInstallPrompt } from "./pwa";
import { supabase } from "@/lib/supabase";
import { useAdmin, ROLE_LABEL } from "./AdminContext";
import CommandPalette from "./CommandPalette";
import { navFor } from "./nav";

// Phone tab bar per role (the fifth slot is always "More").
const HOME = { href: "/admin", label: "Home", icon: LayoutDashboard, exact: true };
const TABS = {
  owner: [
    HOME,
    { href: "/admin/repair-orders", label: "Jobs", icon: Wrench, badge: "readyForPickup" },
    { href: "/admin/expenses", label: "Expenses", icon: Wallet, badge: "billsDue" },
    { href: "/admin/invoices", label: "Invoices", icon: Receipt },
  ],
  manager: [
    HOME,
    { href: "/admin/repair-orders", label: "Jobs", icon: Wrench, badge: "readyForPickup" },
    { href: "/admin/schedule", label: "Schedule", icon: CalendarDays, badge: "pendingAppointments" },
    { href: "/admin/invoices", label: "Invoices", icon: Receipt },
  ],
  bookkeeper: [
    HOME,
    { href: "/admin/reports", label: "Reports", icon: BarChart3 },
    { href: "/admin/taxes", label: "Taxes", icon: Landmark },
    { href: "/admin/books", label: "Books", icon: BookText },
  ],
  technician: [{ href: "/admin/tech", label: "Clock & jobs", icon: Timer }],
};
import { cx, IconButton } from "./ui";

export default function AdminShell({ theme, setTheme, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, counts } = useAdmin();
  const nav = navFor(role);
  const tabs = TABS[role] || TABS.owner;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const { canInstall, install, needsIOSSteps } = useInstallPrompt();
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    registerAdminServiceWorker();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  const isActive = (item) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 px-5">
        <Image src="/brand-emblem.png" alt="" width={44} height={26} className="h-auto w-[44px] object-contain" />
        <div className="leading-tight">
          <div className="font-display text-[15px] font-semibold text-a-text">Auto Pro</div>
          <div className="text-[11px] text-a-faint">Shop manager</div>
        </div>
      </div>

      <button
        onClick={() => setPaletteOpen(true)}
        className="mx-3 mb-3 flex h-9 items-center gap-2 rounded-lg border border-a-line bg-a-bg px-3 text-[13px] text-a-faint transition-colors hover:text-a-muted"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded border border-a-line px-1.5 text-[10.5px]">⌘K</kbd>
      </button>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Admin">
        {nav.map((group) => (
          <div key={group.label}>
            <div className="px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[.08em] text-a-faint">{group.label}</div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                const badge = item.badge ? counts[item.badge] : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors",
                        active ? "bg-a-hover text-a-text" : "text-a-muted hover:bg-a-hover/60 hover:text-a-text"
                      )}
                    >
                      {active && <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r bg-a-accent" />}
                      <Icon className={cx("h-[17px] w-[17px] shrink-0", active ? "text-a-accent" : "text-a-faint group-hover:text-a-muted")} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge > 0 && (
                        <span className="min-w-[20px] rounded-full bg-a-accent px-1.5 text-center text-[11px] font-semibold leading-5 text-white tnum">
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-a-line p-3">
        {(canInstall || needsIOSSteps) && (
          <button
            onClick={() => (canInstall ? install() : setIosHelp(true))}
            className="mb-2 flex w-full items-center gap-2.5 rounded-lg bg-a-accent/10 px-3 py-2 text-[13px] font-medium text-a-accent hover:bg-a-accent/20"
          >
            <Download className="h-4 w-4" /> Install the Auto Pro app
          </button>
        )}
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-a-accent to-a-violet text-[12px] font-semibold uppercase text-white">
            {(user?.email || "?").slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-medium text-a-text">{user?.email}</div>
            <div className="text-[11px] text-a-faint">{ROLE_LABEL[role] || "Staff"}</div>
          </div>
          <IconButton size="sm" icon={theme === "dark" ? Sun : Moon} label="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} />
          <IconButton size="sm" icon={LogOut} label="Sign out" onClick={signOut} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-a-line bg-a-panel lg:block">{sidebar}</aside>

      {/* mobile sidebar */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[272px] animate-slide-up border-r border-a-line bg-a-panel">
            <IconButton icon={X} label="Close menu" className="absolute right-2 top-3" onClick={() => setMobileOpen(false)} />
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-[248px]">
        {/* top bar (mobile) */}
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-a-line bg-a-panel/85 px-3 backdrop-blur lg:hidden">
          <IconButton icon={Menu} label="Open menu" onClick={() => setMobileOpen(true)} />
          <span className="font-display font-semibold">Auto Pro</span>
          <div className="flex-1" />
          <IconButton icon={Search} label="Search" onClick={() => setPaletteOpen(true)} />
          <Link href="/" target="_blank" className="p-2 text-a-muted" aria-label="View website">
            <ExternalLink className="h-[18px] w-[18px]" />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {/* phone tab bar */}
      <nav
        className={cx("no-print fixed inset-x-0 bottom-0 z-30 grid border-t border-a-line bg-a-panel/95 backdrop-blur lg:hidden", tabs.length === 4 ? "grid-cols-5" : "grid-cols-2")}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="App"
      >
        {tabs.map((tab) => {
          const t = { ...tab, badge: tab.badge ? counts[tab.badge] : 0 };
          const Icon = t.icon;
          const active = isActive(t);
          return (
            <Link key={t.href} href={t.href} className={cx("relative flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium", active ? "text-a-accent" : "text-a-faint")}>
              <Icon className="h-[22px] w-[22px]" />
              {t.label}
              {t.badge > 0 && <span className="absolute right-[22%] top-1 min-w-[17px] rounded-full bg-a-accent px-1 text-center text-[10px] font-semibold leading-[17px] text-white">{t.badge}</span>}
            </Link>
          );
        })}
        <button onClick={() => setMobileOpen(true)} className="relative flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium text-a-faint">
          <MoreHorizontal className="h-[22px] w-[22px]" />
          More
          {counts.unreadMessages > 0 && <span className="absolute right-[22%] top-1 h-2 w-2 rounded-full bg-a-accent" />}
        </button>
      </nav>

      {iosHelp && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIosHelp(false)} />
          <div className="relative m-3 w-full max-w-sm animate-slide-up rounded-2xl border border-a-line bg-a-panel p-6 shadow-pop">
            <h2 className="text-base font-semibold">Install on iPhone or iPad</h2>
            <ol className="mt-3 space-y-2 text-sm text-a-muted">
              <li>1. Open this page in <strong className="text-a-text">Safari</strong>.</li>
              <li className="flex items-center gap-1">2. Tap <Share className="mx-1 inline h-4 w-4 text-a-accent" /> <strong className="text-a-text">Share</strong>.</li>
              <li>3. Choose <strong className="text-a-text">Add to Home Screen</strong>, then <strong className="text-a-text">Add</strong>.</li>
              <li>4. Open Auto Pro from your Home Screen and turn on notifications in Settings.</li>
            </ol>
            <button onClick={() => setIosHelp(false)} className="mt-5 w-full rounded-lg bg-a-accent py-2.5 text-sm font-semibold text-white">Got it</button>
          </div>
        </div>
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
