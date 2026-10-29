// frontend/src/app/admin/layout.js
// Auth gate for every /admin page except /admin/login. Access requires a
// Supabase session whose (verified) email is in public.admin_users; the
// staff role (owner/manager/bookkeeper/technician) decides which pages open.
"use client";

import "./admin.css";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AdminProvider } from "@/components/admin/AdminContext";
import AdminShell from "@/components/admin/AdminShell";
import { UIProvider, Spinner } from "@/components/admin/ui";
import { NAV, canSee, homeFor } from "@/components/admin/nav";

const BOOKKEEPER_READ = ["/admin/repair-orders", "/admin/invoices", "/admin/customers"];
function allowed(pathname, role) {
  if (role === "owner" || role === "manager") return true;
  const item = NAV.flatMap((g) => g.items)
    .filter((i) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (item && canSee(item, role)) return true;
  // the bookkeeper may open invoices, statements and their print views
  return role === "bookkeeper" && BOOKKEEPER_READ.some((p) => pathname.startsWith(p));
}

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [theme, setThemeState] = useState("dark");
  const [state, setState] = useState({ status: "checking", user: null, role: null });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("autopro-admin-theme");
      if (saved === "light" || saved === "dark") setThemeState(saved);
    } catch {}
  }, []);

  const setTheme = (t) => {
    setThemeState(t);
    try {
      localStorage.setItem("autopro-admin-theme", t);
    } catch {}
  };

  useEffect(() => {
    if (isLogin) return;
    let cancelled = false;

    const check = async (session) => {
      if (!session) {
        router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      const { data: role, error } = await supabase.rpc("staff_role");
      if (cancelled) return;
      if (error || !role) {
        await supabase.auth.signOut();
        router.replace("/admin/login?denied=1");
        return;
      }
      setState({ status: "ok", user: session.user, role });
    };

    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") router.replace("/admin/login");
      if (event === "TOKEN_REFRESHED" && session) setState((s) => ({ ...s, user: session.user }));
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogin]);

  // Keep each role on the pages it may use.
  useEffect(() => {
    if (state.status === "ok" && !isLogin && !allowed(pathname, state.role)) router.replace(homeFor(state.role));
  }, [state, pathname, isLogin, router]);

  return (
    <div className="admin-root" data-theme={theme}>
      <UIProvider>
        {isLogin ? (
          children
        ) : state.status !== "ok" ? (
          <div className="flex min-h-screen items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <AdminProvider user={state.user} role={state.role}>
            <AdminShell theme={theme} setTheme={setTheme}>
              {children}
            </AdminShell>
          </AdminProvider>
        )}
      </UIProvider>
    </div>
  );
}
