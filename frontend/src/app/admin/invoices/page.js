// frontend/src/app/admin/invoices/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Search, AlertTriangle, CheckCircle2, Clock, Download, Plus, BookOpen } from "lucide-react";
import { invoiceState } from "@/lib/invoicing";
import { NewRepairOrderModal } from "@/components/admin/pickers";
import { supabase } from "@/lib/supabase";
import { money, money0, customerName, vehicleName, date, isoDay } from "@/lib/format";
import {
  Button, Card, PageHeader, Segmented, Badge, EmptyState, SkeletonRows, Table, Th, Td, Input, Stat, ErrorBanner, cx, useDebounced,
} from "@/components/admin/ui";

const daysPast = (due) => (due ? Math.floor((Date.now() - new Date(`${due}T23:59:59`).getTime()) / 864e5) : 0);

export default function InvoicesPage() {
  const router = useRouter();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("unpaid");
  const [q, setQ] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  // App shortcut / links: /admin/invoices?new=1 opens "New invoice".
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") setNewOpen(true);
  }, []);
  const dq = useDebounced(q);

  useEffect(() => {
    supabase
      .from("repair_orders")
      .select("id, number, invoice_number, total, amount_paid, balance_due, payment_status, invoiced_at, due_date, terms, status, sent_at, viewed_at, voided_at, customer:customers(first_name,last_name,company,phone,email), vehicle:customer_vehicles(year,make,model)")
      .not("invoiced_at", "is", null)
      .order("invoiced_at", { ascending: false })
      .limit(1000)
      .then(({ data, error: err }) => {
        if (err) setError(err);
        setRows(data || []);
      });
  }, []);

  const today = isoDay();
  const stats = useMemo(() => {
    const all = rows || [];
    const r = all.filter((x) => !x.voided_at && x.status !== "cancelled");
    const open = r.filter((x) => Number(x.balance_due) > 0);
    const aging = { current: 0, d30: 0, d60: 0, d90: 0 };
    open.forEach((x) => {
      const d = daysPast(x.due_date);
      const b = Number(x.balance_due);
      if (d <= 0) aging.current += b;
      else if (d <= 30) aging.d30 += b;
      else if (d <= 60) aging.d60 += b;
      else aging.d90 += b;
    });
    const monthStart = isoDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    return {
      outstanding: open.reduce((s, x) => s + Number(x.balance_due), 0),
      overdue: open.filter((x) => x.due_date && x.due_date < today),
      billedThisMonth: r.filter((x) => isoDay(new Date(x.invoiced_at)) >= monthStart).reduce((s, x) => s + Number(x.total), 0),
      aging,
      counts: {
        unpaid: open.length,
        overdue: open.filter((x) => x.due_date && x.due_date < today).length,
        paid: r.filter((x) => x.payment_status === "paid").length,
        all: r.length,
        void: all.length - r.length,
      },
    };
  }, [rows, today]);

  const shown = useMemo(() => {
    let r = (rows || []).filter((x) => (filter === "void" ? x.voided_at || x.status === "cancelled" : !x.voided_at && x.status !== "cancelled"));
    if (filter === "unpaid") r = r.filter((x) => Number(x.balance_due) > 0);
    if (filter === "overdue") r = r.filter((x) => Number(x.balance_due) > 0 && x.due_date && x.due_date < today);
    if (filter === "paid") r = r.filter((x) => x.payment_status === "paid");
    const t = dq.trim().toLowerCase();
    if (t) r = r.filter((x) => [String(x.invoice_number), String(x.number), customerName(x.customer), x.customer?.phone, vehicleName(x.vehicle)].filter(Boolean).some((s) => s.toLowerCase().includes(t)));
    return r;
  }, [rows, filter, dq, today]);

  const exportCsv = () => {
    const header = ["Invoice", "Date", "Due", "Customer", "Phone", "Email", "Vehicle", "Total", "Paid", "Balance", "Status"];
    const lines = shown.map((x) => [
      x.invoice_number, isoDay(new Date(x.invoiced_at)), x.due_date || "", customerName(x.customer), x.customer?.phone || "", x.customer?.email || "",
      vehicleName(x.vehicle), x.total, x.amount_paid, x.balance_due, x.payment_status,
    ]);
    const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `autopro-invoices-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bar = (v) => (stats.outstanding ? `${Math.max((v / stats.outstanding) * 100, v ? 3 : 0)}%` : "0%");

  return (
    <>
      <PageHeader
        title="Invoices"
        description="What customers owe and what's been collected."
        actions={
          <>
            <Button icon={BookOpen} href="/admin/exports">QuickBooks export</Button>
            <Button icon={Download} onClick={exportCsv} disabled={!rows?.length}>CSV</Button>
            <Button variant="primary" icon={Plus} onClick={() => setNewOpen(true)}>New invoice</Button>
          </>
        }
      />
      <ErrorBanner error={error} />

      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Outstanding" value={money0(stats.outstanding)} icon={Clock} tone="warn" sub={`${stats.counts.unpaid} open invoices`} />
        <Stat label="Overdue" value={money0(stats.overdue.reduce((s, x) => s + Number(x.balance_due), 0))} icon={AlertTriangle} tone="bad" sub={`${stats.counts.overdue} invoices past due`} />
        <Stat label="Billed this month" value={money0(stats.billedThisMonth)} icon={CheckCircle2} tone="good" />
      </div>

      <Card className="mt-3 p-5">
        <div className="mb-3 text-[13px] font-medium text-a-muted">Aging</div>
        <div className="flex h-3 overflow-hidden rounded-full bg-a-hover">
          <div className="bg-a-good" style={{ width: bar(stats.aging.current) }} />
          <div className="bg-a-warn" style={{ width: bar(stats.aging.d30) }} />
          <div className="bg-orange-500" style={{ width: bar(stats.aging.d60) }} />
          <div className="bg-a-bad" style={{ width: bar(stats.aging.d90) }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {[
            ["Current", stats.aging.current, "bg-a-good"],
            ["1–30 days", stats.aging.d30, "bg-a-warn"],
            ["31–60 days", stats.aging.d60, "bg-orange-500"],
            ["60+ days", stats.aging.d90, "bg-a-bad"],
          ].map(([l, v, c]) => (
            <div key={l} className="flex items-center gap-2">
              <span className={cx("h-2.5 w-2.5 rounded-full", c)} />
              <span className="text-a-muted">{l}</span>
              <span className="ml-auto font-medium tnum">{money0(v)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 border-b border-a-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "unpaid", label: "Unpaid", count: stats.counts.unpaid },
              { value: "overdue", label: "Overdue", count: stats.counts.overdue },
              { value: "paid", label: "Paid", count: stats.counts.paid },
              { value: "all", label: "All", count: stats.counts.all },
              ...(stats.counts.void ? [{ value: "void", label: "Void", count: stats.counts.void }] : []),
            ]}
          />
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-a-faint" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9" />
          </div>
        </div>
        {rows === null ? (
          <SkeletonRows />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={filter === "unpaid" ? "Everything's paid up" : "No invoices"}
            description="Create one from a repair order with “Create invoice”, or start a standalone invoice for parts sales and transport."
            action={<Button variant="primary" icon={Plus} onClick={() => setNewOpen(true)}>New invoice</Button>}
          />
        ) : (
          <Table>
            <thead>
              <tr><Th>Invoice</Th><Th>Customer</Th><Th>Vehicle</Th><Th>Date</Th><Th>Due</Th><Th>Status</Th><Th align="right">Total</Th><Th align="right">Balance</Th></tr>
            </thead>
            <tbody>
              {shown.map((x) => {
                const late = Number(x.balance_due) > 0 && x.due_date && x.due_date < today;
                return (
                  <tr key={x.id} className="cursor-pointer hover:bg-a-hover/50" onClick={() => router.push(`/admin/repair-orders/${x.id}`)}>
                    <Td className="font-mono text-a-muted">#{x.invoice_number}</Td>
                    <Td className="font-medium">{customerName(x.customer)}</Td>
                    <Td className="text-a-muted">{vehicleName(x.vehicle)}</Td>
                    <Td className="text-a-muted">{date(x.invoiced_at)}</Td>
                    <Td className={late ? "font-medium text-a-bad" : "text-a-muted"}>
                      {x.due_date ? date(x.due_date) : "—"}
                      {late && <span className="ml-1 text-xs">({daysPast(x.due_date)}d)</span>}
                    </Td>
                    <Td><InvoiceStateBadge state={invoiceState(x, today)} /></Td>
                    <Td align="right">{money(x.total)}</Td>
                    <Td align="right" className={Number(x.balance_due) > 0 ? "font-semibold text-a-warn" : "text-a-faint"}>{money(x.balance_due)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
      <NewRepairOrderModal open={newOpen} onClose={() => setNewOpen(false)} asInvoice />
    </>
  );
}

const STATE = {
  open: ["Open", "neutral"],
  sent: ["Sent", "info"],
  viewed: ["Viewed", "violet"],
  partial: ["Partially paid", "warn"],
  overdue: ["Overdue", "bad"],
  paid: ["Paid", "good"],
  void: ["Void", "neutral"],
};

function InvoiceStateBadge({ state }) {
  const [label, tone] = STATE[state] || [state, "neutral"];
  return <Badge tone={tone} dot>{label}</Badge>;
}
