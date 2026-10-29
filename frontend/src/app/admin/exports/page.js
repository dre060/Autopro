// frontend/src/app/admin/exports/page.js — QuickBooks & accounting export
"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, Users, CreditCard, BookOpen, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { money, isoDay } from "@/lib/format";
import { qboInvoicesCsv, qboCustomersCsv, paymentsCsv, iifFile, qbCustomerName, download } from "@/lib/quickbooks";
import { Button, Card, CardHeader, PageHeader, Input, Field, Toggle, Segmented, Spinner, Badge, useUI } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/AdminContext";

const INV_SELECT =
  "id, number, invoice_number, invoiced_at, due_date, terms, po_number, total, tax_amount, tax_rate, discount_amount, voided_at, status, qb_exported_at, " +
  "customer:customers(id, first_name, last_name, company, email, phone, address_street, address_city, address_state, address_zip, address_country, default_terms, tax_exempt, tax_exempt_reason, notes), " +
  "vehicle:customer_vehicles(year, make, model, vin), items:repair_order_items(id, kind, item_name, description, quantity, unit_price, taxable, approved, position)";

function monthStart(offset = 0) {
  const d = new Date();
  return isoDay(new Date(d.getFullYear(), d.getMonth() + offset, 1));
}

export default function ExportsPage() {
  const { shop } = useAdmin();
  const { toast, confirm } = useUI();
  const [target, setTarget] = useState("qbo");
  const [from, setFrom] = useState(monthStart(-1));
  const [to, setTo] = useState(isoDay());
  const [onlyNew, setOnlyNew] = useState(true);
  const [data, setData] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setData(null);
    (async () => {
      const toExclusive = new Date(`${to}T00:00:00`);
      toExclusive.setDate(toExclusive.getDate() + 1);
      let iq = supabase
        .from("repair_orders")
        .select(INV_SELECT)
        .not("invoiced_at", "is", null)
        .is("voided_at", null)
        .neq("status", "cancelled")
        .gte("invoiced_at", new Date(`${from}T00:00:00`).toISOString())
        .lt("invoiced_at", toExclusive.toISOString())
        .order("invoice_number");
      let pq = supabase
        .from("payments")
        .select("id, amount, method, reference, notes, received_at, qb_exported_at, ro:repair_orders(invoice_number, customer:customers(first_name, last_name, company))")
        .gte("received_at", new Date(`${from}T00:00:00`).toISOString())
        .lt("received_at", toExclusive.toISOString())
        .order("received_at");
      if (onlyNew) {
        iq = iq.is("qb_exported_at", null);
        pq = pq.is("qb_exported_at", null);
      }
      const [inv, pay] = await Promise.all([iq, pq]);
      const invoices = inv.data || [];
      const payments = (pay.data || []).map((p) => ({ ...p, invoice_number: p.ro?.invoice_number, customer: p.ro?.customer }));
      const custMap = new Map();
      invoices.forEach((i) => i.customer && custMap.set(i.customer.id, i.customer));
      setData({ invoices, payments, customers: [...custMap.values()], error: inv.error || pay.error });
    })();
  }, [from, to, onlyNew, reloadKey]);

  const warnings = useMemo(() => {
    if (!data) return [];
    const w = [];
    const noCustomer = data.invoices.filter((i) => !i.customer);
    if (noCustomer.length) w.push(`${noCustomer.length} invoice(s) have no customer and will import as “Walk-in Customer”.`);
    const empty = data.invoices.filter((i) => !(i.items || []).some((l) => l.approved !== false));
    if (empty.length) w.push(`Invoice(s) ${empty.map((i) => `#${i.invoice_number}`).join(", ")} have no line items and will be skipped by QuickBooks.`);
    const names = new Map();
    data.customers.forEach((c) => {
      const n = qbCustomerName(c).toLowerCase();
      names.set(n, (names.get(n) || 0) + 1);
    });
    const dupes = [...names.entries()].filter(([, n]) => n > 1).map(([k]) => k);
    if (dupes.length) w.push(`Two different customers share the name “${dupes[0]}”. QuickBooks will merge them — add a company or last name to tell them apart.`);
    return w;
  }, [data]);

  const stamp = `${from}_to_${to}`;
  const total = data ? data.invoices.reduce((s, i) => s + Number(i.total), 0) : 0;
  const paid = data ? data.payments.reduce((s, p) => s + Number(p.amount), 0) : 0;

  const markExported = async (kind) => {
    const ok = await confirm({
      title: "Mark as exported?",
      message: `Marks these ${kind === "payments" ? `${data.payments.length} payments` : `${data.invoices.length} invoices`} as sent to QuickBooks, so “Only not yet exported” skips them next time. Do this after QuickBooks accepted the import.`,
      confirmLabel: "Mark exported",
    });
    if (!ok) return;
    const now = new Date().toISOString();
    const table = kind === "payments" ? "payments" : "repair_orders";
    const ids = (kind === "payments" ? data.payments : data.invoices).map((x) => x.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase.from(table).update({ qb_exported_at: now }).in("id", ids.slice(i, i + 200));
      if (error) return toast(error.message, "bad");
    }
    toast("Marked as exported");
    setReloadKey((k) => k + 1);
  };

  const ready = data && !data.error;

  return (
    <>
      <PageHeader
        title="QuickBooks export"
        description="Send invoices, customers and payments to QuickBooks Online or Desktop."
      />

      <Card className="mb-5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <Field label="Accounting software">
            {() => (
              <Segmented
                value={target}
                onChange={setTarget}
                options={[
                  { value: "qbo", label: "QuickBooks Online" },
                  { value: "qbd", label: "QuickBooks Desktop" },
                  { value: "csv", label: "Spreadsheet" },
                ]}
              />
            )}
          </Field>
          <Field label="From (invoice / payment date)">{(id) => <Input id={id} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />}</Field>
          <Field label="To">{(id) => <Input id={id} type="date" value={to} onChange={(e) => setTo(e.target.value)} />}</Field>
          <div className="pb-2">
            <Toggle checked={onlyNew} onChange={setOnlyNew} label="Only not yet exported" />
          </div>
        </div>
      </Card>

      {!data ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <Card className="p-4"><div className="text-[12.5px] text-a-muted">Invoices</div><div className="mt-1 font-display text-2xl font-semibold tnum">{data.invoices.length}</div><div className="text-xs text-a-faint">{money(total)}</div></Card>
            <Card className="p-4"><div className="text-[12.5px] text-a-muted">Customers on these invoices</div><div className="mt-1 font-display text-2xl font-semibold tnum">{data.customers.length}</div></Card>
            <Card className="p-4"><div className="text-[12.5px] text-a-muted">Payments</div><div className="mt-1 font-display text-2xl font-semibold tnum">{data.payments.length}</div><div className="text-xs text-a-faint">{money(paid)}</div></Card>
          </div>

          {warnings.map((w) => (
            <div key={w} className="mb-3 flex items-start gap-2 rounded-lg border border-a-warn/30 bg-a-warn/10 px-4 py-3 text-sm text-a-warn">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}
            </div>
          ))}

          {target === "qbo" && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader icon={Users} title="1. Customers" description="Import first so invoice names match." />
                <div className="space-y-3 px-5 pb-5">
                  <Button icon={Download} disabled={!ready || !data.customers.length} onClick={() => download(`autopro-qbo-customers-${stamp}.csv`, qboCustomersCsv(data.customers))}>
                    Download customers CSV
                  </Button>
                  <p className="text-xs text-a-faint">QuickBooks Online → ⚙ Settings → Import data → Customers. Customers already in QuickBooks with the same name are skipped.</p>
                </div>
              </Card>
              <Card>
                <CardHeader icon={FileSpreadsheet} title="2. Invoices" description="Uses your Auto Pro invoice numbers." />
                <div className="space-y-3 px-5 pb-5">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" icon={Download} disabled={!ready || !data.invoices.length} onClick={() => download(`autopro-qbo-invoices-${stamp}.csv`, qboInvoicesCsv(data.invoices, shop.qb))}>
                      Download invoices CSV
                    </Button>
                    <Button variant="ghost" icon={CheckCircle2} disabled={!data.invoices.length} onClick={() => markExported("invoices")}>Mark exported</Button>
                  </div>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-a-faint">
                    <li>⚙ Settings → Import data → Invoices. Pick “MM/DD/YYYY” dates.</li>
                    <li>Turn on <em>Custom transaction numbers</em> in QuickBooks (Account and settings → Sales) so the invoice numbers carry over.</li>
                    <li>Products/services named in the file ({[shop.qb?.item_labor, shop.qb?.item_part, shop.qb?.item_fee].filter(Boolean).join(", ") || "Labor, Parts, Fees"}…) must exist in QuickBooks — QBO offers to create missing ones.</li>
                    <li>QBO imports up to 1,000 lines per file.</li>
                  </ul>
                </div>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader icon={CreditCard} title="3. Payments" description="QuickBooks Online can't import payments from a file — record them with “Receive payment”. This list makes that quick." />
                <div className="flex flex-wrap gap-2 px-5 pb-5">
                  <Button icon={Download} disabled={!ready || !data.payments.length} onClick={() => download(`autopro-payments-${stamp}.csv`, paymentsCsv(data.payments))}>Download payments list</Button>
                  <Button variant="ghost" icon={CheckCircle2} disabled={!data.payments.length} onClick={() => markExported("payments")}>Mark exported</Button>
                </div>
              </Card>
            </div>
          )}

          {target === "qbd" && (
            <Card>
              <CardHeader icon={BookOpen} title="IIF file (customers + invoices + payments)" description="One file for QuickBooks Desktop Pro / Premier / Enterprise." />
              <div className="space-y-4 px-5 pb-5">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    icon={Download}
                    disabled={!ready || (!data.invoices.length && !data.payments.length)}
                    onClick={() => download(`autopro-quickbooks-${stamp}.iif`, iifFile({ invoices: data.invoices, payments: data.payments, customers: data.customers }, shop.qb), "text/plain")}
                  >
                    Download IIF
                  </Button>
                  <Button variant="ghost" icon={CheckCircle2} disabled={!data.invoices.length} onClick={() => markExported("invoices")}>Mark invoices exported</Button>
                  <Button variant="ghost" icon={CheckCircle2} disabled={!data.payments.length} onClick={() => markExported("payments")}>Mark payments exported</Button>
                </div>
                <ul className="list-disc space-y-1 pl-5 text-xs text-a-faint">
                  <li>Back up your company file first, then File → Utilities → Import → IIF Files.</li>
                  <li>Accounts and items used: {Object.entries(shop.qb || {}).filter(([k]) => k.startsWith("acct_")).map(([, v]) => v).join(", ")}. Change them in Settings → QuickBooks if your chart of accounts uses different names.</li>
                  <li>Imported payments land in Undeposited Funds; apply them to invoices with Receive Payments if QuickBooks doesn't auto-apply.</li>
                </ul>
              </div>
            </Card>
          )}

          {target === "csv" && (
            <Card>
              <CardHeader icon={FileSpreadsheet} title="Spreadsheet export" description="For your accountant, Excel or Google Sheets." />
              <div className="flex flex-wrap gap-2 px-5 pb-5">
                <Button icon={Download} disabled={!ready || !data.invoices.length} onClick={() => download(`autopro-invoice-lines-${stamp}.csv`, qboInvoicesCsv(data.invoices, shop.qb))}>Invoice lines</Button>
                <Button icon={Download} disabled={!ready || !data.payments.length} onClick={() => download(`autopro-payments-${stamp}.csv`, paymentsCsv(data.payments))}>Payments</Button>
                <Button icon={Download} disabled={!ready || !data.customers.length} onClick={() => download(`autopro-customers-${stamp}.csv`, qboCustomersCsv(data.customers))}>Customers</Button>
              </div>
            </Card>
          )}

          <p className="mt-5 flex items-start gap-2 text-xs text-a-faint">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Voided invoices are never exported. {onlyNew ? "Showing only items not yet marked exported." : "Showing everything in the date range, including items already exported."}
            {data.invoices.some((i) => i.qb_exported_at) && <Badge className="ml-1">some already exported</Badge>}
          </p>
        </>
      )}
    </>
  );
}
