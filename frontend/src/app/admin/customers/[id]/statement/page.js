// frontend/src/app/admin/customers/[id]/statement/page.js
// Open-item customer statement (QuickBooks style): every unpaid invoice,
// aging buckets and the total amount due.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isoDay } from "@/lib/format";
import { Button, Spinner, ErrorBanner, Segmented } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/AdminContext";

const usd = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n) || 0);
const day = (v) => {
  if (!v) return "";
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T12:00:00` : v);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
};

export default function StatementPage({ params }) {
  const { shop } = useAdmin();
  const [mode, setMode] = useState("open");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const [c, r] = await Promise.all([
        supabase.from("customers").select("*").eq("id", params.id).single(),
        supabase
          .from("repair_orders")
          .select("id, number, invoice_number, invoiced_at, due_date, total, amount_paid, balance_due, terms, voided_at, status, payments(amount, method, received_at)")
          .eq("customer_id", params.id)
          .not("invoiced_at", "is", null)
          .is("voided_at", null)
          .neq("status", "cancelled")
          .order("invoiced_at"),
      ]);
      if (c.error) return setError(c.error);
      setData({ customer: c.data, invoices: r.data || [] });
    })();
  }, [params.id]);

  if (error) return <ErrorBanner error={error} />;
  if (!data) return <div className="flex h-[60vh] items-center justify-center"><Spinner /></div>;

  const { customer: c, invoices } = data;
  const today = isoDay();
  const open = invoices.filter((i) => Number(i.balance_due) > 0.004);
  const rows = mode === "open" ? open : invoices;
  const totalDue = open.reduce((s, i) => s + Number(i.balance_due), 0);

  const aging = { current: 0, d30: 0, d60: 0, d90: 0, over: 0 };
  open.forEach((i) => {
    const late = i.due_date ? Math.floor((Date.now() - new Date(`${i.due_date}T23:59:59`).getTime()) / 864e5) : 0;
    const b = Number(i.balance_due);
    if (late <= 0) aging.current += b;
    else if (late <= 30) aging.d30 += b;
    else if (late <= 60) aging.d60 += b;
    else if (late <= 90) aging.d90 += b;
    else aging.over += b;
  });

  const name = c.company || [c.first_name, c.last_name].filter(Boolean).join(" ");
  const addr = [c.address_street, [c.address_city, [c.address_state, c.address_zip].filter(Boolean).join(" ")].filter(Boolean).join(", "), c.address_country].filter(Boolean);

  return (
    <div>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/customers/${c.id}`} className="inline-flex items-center gap-1 text-sm text-a-muted hover:text-a-text">
          <ArrowLeft className="h-4 w-4" /> Back to {name}
        </Link>
        <div className="flex items-center gap-2">
          <Segmented value={mode} onChange={setMode} options={[{ value: "open", label: "Open invoices" }, { value: "all", label: "All activity" }]} />
          <Button variant="primary" icon={Printer} onClick={() => window.print()}>Print / Save PDF</Button>
        </div>
      </div>

      <article className="print-sheet mx-auto w-full max-w-[860px] rounded-xl bg-white p-6 text-[13px] leading-relaxed text-slate-800 shadow-xl sm:p-10" style={{ colorScheme: "light" }}>
        <header className="flex flex-col-reverse gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-3xl font-bold tracking-tight text-slate-900">STATEMENT</div>
            <div className="mt-3 font-semibold text-slate-900">{shop.name}</div>
            <div className="text-slate-600">{shop.address}</div>
            <div className="text-slate-600">{shop.email}</div>
            <div className="text-slate-600">{shop.phone}</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand-emblem.png" alt="Auto Pro" className="h-auto w-[120px] self-start rounded-lg bg-slate-900 p-2" />
        </header>

        <section className="mt-8 grid gap-6 border-y border-slate-200 py-5 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">To</div>
            <div className="font-semibold text-slate-900">{name}</div>
            {c.company && (c.first_name || c.last_name) && <div>{[c.first_name, c.last_name].filter(Boolean).join(" ")}</div>}
            {addr.map((l) => <div key={l}>{l}</div>)}
            {c.email && <div>{c.email}</div>}
          </div>
          <div className="sm:text-right">
            <div className="text-slate-500">Statement date: <span className="font-medium text-slate-900">{day(today)}</span></div>
            <div className="mt-3 text-slate-500">Total due</div>
            <div className="text-3xl font-bold text-slate-900">{usd(totalDue)}</div>
          </div>
        </section>

        <table className="mt-5 w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-800 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Activity</th>
              <th className="py-2 pr-3">Due</th>
              <th className="py-2 pr-3 text-right">Amount</th>
              <th className="py-2 pr-3 text-right">Paid</th>
              <th className="py-2 text-right">Open balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const late = Number(i.balance_due) > 0 && i.due_date && i.due_date < today;
              return (
                <tr key={i.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{day(i.invoiced_at)}</td>
                  <td className="py-2 pr-3">Invoice #{i.invoice_number}{i.terms ? <span className="text-slate-400"> · {i.terms}</span> : null}</td>
                  <td className={`py-2 pr-3 ${late ? "font-semibold text-rose-600" : ""}`}>{day(i.due_date)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{usd(i.total)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{usd(i.amount_paid)}</td>
                  <td className="py-2 text-right font-medium tabular-nums">{usd(i.balance_due)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">No open invoices — this account is paid in full.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-8 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 text-center sm:grid-cols-6">
          {[
            ["Current", aging.current], ["1–30 days", aging.d30], ["31–60 days", aging.d60], ["61–90 days", aging.d90], ["90+ days", aging.over], ["Amount due", totalDue],
          ].map(([l, v], i) => (
            <div key={l} className={`border-slate-200 p-3 ${i < 5 ? "border-r" : "bg-slate-50"}`}>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">{l}</div>
              <div className={`mt-1 tabular-nums ${i === 5 ? "font-bold text-slate-900" : "text-slate-700"}`}>{usd(v)}</div>
            </div>
          ))}
        </div>

        {shop.payment_link && totalDue > 0 && (
          <p className="mt-6 text-sm text-slate-600">
            Pay online: <a className="font-medium text-emerald-700 underline" href={shop.payment_link}>{shop.payment_link}</a>
          </p>
        )}
        {shop.payment_instructions && <p className="mt-3 whitespace-pre-wrap text-xs text-slate-500">{shop.payment_instructions}</p>}
        <p className="mt-8 text-center text-[11.5px] text-slate-400">Questions about your account? Call {shop.phone} or email {shop.email}.</p>
      </article>
    </div>
  );
}
