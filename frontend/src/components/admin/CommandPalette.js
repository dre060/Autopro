// frontend/src/components/admin/CommandPalette.js
// ⌘K / Ctrl+K: jump to any page, customer, repair order or vehicle.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Wrench, Car, CornerDownLeft, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { customerName, vehicleName, money, phone as fmtPhone } from "@/lib/format";
import { cx, useDebounced } from "./ui";
import { navFor } from "./nav";
import { useAdmin } from "./AdminContext";

const ACTIONS = [
  { label: "Snap a receipt", href: "/admin/expenses?snap=1", icon: Plus },
  { label: "New vehicle sale", href: "/admin/deals?new=1", icon: Plus },
  { label: "New repair order", href: "/admin/repair-orders?new=1", icon: Plus },
  { label: "New appointment", href: "/admin/schedule?new=1", icon: Plus },
  { label: "New customer", href: "/admin/customers?new=1", icon: Plus },
  { label: "List a vehicle for sale", href: "/admin/inventory/new", icon: Plus },
  { label: "Add a part", href: "/admin/parts?new=1", icon: Plus },
];

export default function CommandPalette({ open, onClose }) {
  const router = useRouter();
  const { role } = useAdmin();
  const inputRef = useRef(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0);
  const dq = useDebounced(q, 180);

  useEffect(() => {
    if (open) {
      setQ("");
      setResults([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    const term = dq.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    (async () => {
      const like = `%${term.replace(/[%_,()]/g, " ")}%`;
      const digits = term.replace(/\D/g, "");
      const roNumber = /^#?\d+$/.test(term) ? Number(term.replace("#", "")) : null;

      const [cust, ros, cars, cvs] = await Promise.all([
        supabase
          .from("customers")
          .select("id, first_name, last_name, company, phone, email")
          .or(
            [`first_name.ilike.${like}`, `last_name.ilike.${like}`, `email.ilike.${like}`, `company.ilike.${like}`,
              digits.length >= 3 ? `phone.ilike.%${digits.slice(-7)}%` : null].filter(Boolean).join(",")
          )
          .limit(6),
        roNumber
          ? supabase.from("repair_orders").select("id, number, invoice_number, status, total, customer:customers(first_name,last_name)").or(`number.eq.${roNumber},invoice_number.eq.${roNumber}`).limit(4)
          : supabase.from("repair_orders").select("id, number, status, total, customer:customers(first_name,last_name)").ilike("complaint", like).limit(4),
        supabase.from("vehicles").select("id, year, make, model, stock_number, price").or(`make.ilike.${like},model.ilike.${like},stock_number.ilike.${like},vin.ilike.${like}`).limit(4),
        supabase.from("customer_vehicles").select("id, year, make, model, vin, license_plate, customer_id").or(`vin.ilike.${like},license_plate.ilike.${like},make.ilike.${like},model.ilike.${like}`).limit(4),
      ]);
      if (cancelled) return;
      const out = [];
      (cust.data || []).forEach((c) =>
        out.push({ key: `c${c.id}`, icon: User, label: customerName(c), hint: fmtPhone(c.phone) || c.email || "Customer", href: `/admin/customers/${c.id}` })
      );
      (ros.data || []).forEach((r) =>
        out.push({ key: `r${r.id}`, icon: Wrench, label: `${r.invoice_number ? `Invoice #${r.invoice_number}` : `RO #${r.number}`} · ${customerName(r.customer)}`, hint: money(r.total), href: `/admin/repair-orders/${r.id}` })
      );
      (cvs.data || []).forEach((v) =>
        out.push({ key: `v${v.id}`, icon: Car, label: vehicleName(v), hint: v.license_plate || v.vin || "Customer vehicle", href: `/admin/customers/${v.customer_id}` })
      );
      (cars.data || []).forEach((v) =>
        out.push({ key: `s${v.id}`, icon: Car, label: `${vehicleName(v)} (for sale)`, hint: v.stock_number || money(v.price), href: `/admin/inventory/${v.id}` })
      );
      setResults(out);
      setActive(0);
    })();
    return () => {
      cancelled = true;
    };
  }, [dq]);

  const staticItems = useMemo(() => {
    const term = q.trim().toLowerCase();
    const pages = navFor(role).flatMap((g) => g.items).map((i) => ({ key: i.href, icon: i.icon, label: i.label, hint: "Go to", href: i.href }));
    const acts = ACTIONS.map((a) => ({ key: a.href, icon: a.icon, label: a.label, hint: "Action", href: a.href }));
    const acts2 = role === "owner" || role === "manager" ? acts : [];
    const list = [...acts2, ...pages];
    return term ? list.filter((i) => i.label.toLowerCase().includes(term)) : list;
  }, [q, role]);

  const items = [...results, ...staticItems];

  const go = (item) => {
    if (!item) return;
    onClose();
    router.push(item.href);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[active]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-xl animate-slide-up overflow-hidden rounded-2xl border border-a-line bg-a-panel shadow-pop">
        <div className="flex items-center gap-3 border-b border-a-line px-4">
          <Search className="h-4 w-4 text-a-faint" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search customers, phone, VIN, plate, RO #… or jump to a page"
            className="h-14 w-full bg-transparent text-[15px] text-a-text outline-none placeholder:text-a-faint"
          />
          <kbd className="hidden rounded border border-a-line px-1.5 py-0.5 text-[11px] text-a-faint sm:block">ESC</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-a-muted">No matches</li>}
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <li key={item.key} role="option" aria-selected={i === active}>
                <button
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(item)}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm",
                    i === active ? "bg-a-hover text-a-text" : "text-a-muted"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-a-text">{item.label}</span>
                  <span className="truncate text-xs text-a-faint">{item.hint}</span>
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-a-faint" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
