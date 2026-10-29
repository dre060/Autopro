// frontend/src/components/admin/AdminContext.js
"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const DEFAULT_SHOP = {
  name: "Auto Pro Repairs Sales & Services LLC",
  phone: "(352) 933-5181",
  email: "service@autoprorepairs.com",
  address: "806 Hood Ave, Leesburg, FL 34748",
  website: "https://www.autoprorepairs.com",
  labor_rate: 120,
  tax_rate: 0.07,
  tax_labor: false,
  tax_parts: true,
  tax_fees: true,
  payment_terms_days: 0,
  invoice_terms: "",
  estimate_terms: "",
  technicians: [],
  default_terms: "Due on receipt",
  payment_link: "",
  payment_instructions: "",
  qb: {},
  notify: {},
};

// Accounting choices (the rates themselves live in public.tax_rates).
export const DEFAULT_BOOKS = {
  shop_county: "Lake",
  entity_type: "single_member",
  filing_status: "single",
  dr15_frequency: "monthly",
  dealer_license: "",
  surtax_cap_basis: "line",
  tax_set_aside_pct: 25,
  owner_salary: 0,
  fees: {},
  labor_rates: [{ name: "Standard", rate: 120 }],
  markup_matrix: [],
  reminders: { enabled: true, days_after_due: [3, 14, 30], email: true, sms: false },
  tax_reminder_days: [10, 18],
};

export const ROLE_LABEL = { owner: "Owner", manager: "Manager", bookkeeper: "Bookkeeper / CPA", technician: "Technician" };

const AdminContext = createContext(null);

export function AdminProvider({ user, role = "owner", children }) {
  const [shop, setShop] = useState(DEFAULT_SHOP);
  const [books, setBooks] = useState(DEFAULT_BOOKS);
  const [counts, setCounts] = useState({ pendingAppointments: 0, unreadMessages: 0, readyForPickup: 0, billsDue: 0 });
  const isAdmin = role === "owner" || role === "manager";

  const refreshShop = useCallback(async () => {
    const { data } = await supabase.from("settings").select("key, value").in("key", ["shop", "books"]);
    for (const row of data || []) {
      if (row.key === "shop") setShop({ ...DEFAULT_SHOP, ...row.value });
      if (row.key === "books") setBooks({ ...DEFAULT_BOOKS, ...row.value });
    }
  }, []);

  const refreshCounts = useCallback(async () => {
    if (!isAdmin) return;
    const soon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const [appts, msgs, ready, bills] = await Promise.all([
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("responded", false),
      supabase.from("repair_orders").select("id", { count: "exact", head: true }).eq("status", "ready"),
      supabase.from("expenses").select("id", { count: "exact", head: true }).eq("status", "unpaid").is("voided_at", null).lte("due_date", soon),
    ]);
    setCounts({
      pendingAppointments: appts.count || 0,
      unreadMessages: msgs.count || 0,
      readyForPickup: ready.count || 0,
      billsDue: bills.count || 0,
    });
  }, [isAdmin]);

  useEffect(() => {
    refreshShop();
    refreshCounts();
    const t = setInterval(refreshCounts, 60_000);
    const onFocus = () => refreshCounts();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshShop, refreshCounts]);

  return (
    <AdminContext.Provider
      value={{
        user, role, isAdmin, isOwner: role === "owner", canBooks: isAdmin || role === "bookkeeper",
        shop, books, refreshShop, counts, refreshCounts,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminProvider>");
  return ctx;
}

// fetch() for /api/admin/* routes with the current session token attached.
export async function adminFetch(path, body) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}
