// frontend/src/app/admin/repair-orders/[id]/page.js
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Printer, Send, Link2, Trash2, Plus, Wrench, Package, Receipt, DollarSign, ChevronDown, Check, X,
  User, Car, Phone, Mail, ClipboardList, Eye, EyeOff, FileText, CircleDollarSign, ArrowRight,
  Copy, Ban, RotateCcw, FileSignature, BellRing, MessageSquareText, Smartphone, Repeat, Undo2, CarFront, Landmark,
} from "lucide-react";
import { priceFromMatrix, FEE_CODES, r2, rateOn } from "@/lib/books";
import { useRates } from "@/components/admin/booksKit";
import NotifyCustomerModal, { autoNotify } from "@/components/admin/NotifyCustomer";
import { supabase } from "@/lib/supabase";
import { money, customerName, vehicleName, phone as fmtPhone, telHref, dateTime, date, isoDay } from "@/lib/format";
import { TERMS, dueDateFor, ITEM_SUGGESTIONS, KIND_LABEL } from "@/lib/invoicing";
import {
  Button, Card, CardHeader, StatusBadge, RO_STATUS, PAYMENT_STATUS, Input, Select, Textarea, TextField, Field,
  Modal, ErrorBanner, Spinner, Badge, cx, useUI, IconButton, useDebounced,
} from "@/components/admin/ui";
import { CustomerPicker, VehiclePicker } from "@/components/admin/pickers";
import { useAdmin, adminFetch } from "@/components/admin/AdminContext";

const RO_SELECT = "*, customer:customers(*), vehicle:customer_vehicles(*), stock:vehicles(year,make,model,vin,stock_number)";

const NEXT_STEP = {
  estimate: { to: "approved", label: "Mark approved" },
  approved: { to: "in_progress", label: "Start work" },
  in_progress: { to: "ready", label: "Ready for pickup" },
  waiting_parts: { to: "in_progress", label: "Parts arrived" },
  ready: { to: "completed", label: "Picked up / complete" },
};

export default function RepairOrderPage({ params }) {
  const router = useRouter();
  const { toast, confirm } = useUI();
  const { shop, books, refreshCounts } = useAdmin();
  const rates = useRates();
  const [feeMenu, setFeeMenu] = useState(false);
  const [creditFor, setCreditFor] = useState(null);
  const [ro, setRo] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState(null);
  const [showCost, setShowCost] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [partOpen, setPartOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(false);
  const [statusMenu, setStatusMenu] = useState(false);
  const [notifyEvent, setNotifyEvent] = useState(null);
  const [notes, setNotes] = useState([]);

  const load = useCallback(async () => {
    const [r, i, p] = await Promise.all([
      supabase.from("repair_orders").select(RO_SELECT).eq("id", params.id).single(),
      supabase.from("repair_order_items").select("*").eq("repair_order_id", params.id).order("position").order("created_at"),
      supabase.from("payments").select("*").eq("repair_order_id", params.id).order("received_at"),
    ]);
    supabase.from("notifications").select("*").eq("repair_order_id", params.id).order("created_at", { ascending: false }).limit(20).then(({ data }) => setNotes(data || []));
    if (r.error) return setError(r.error.code === "PGRST116" ? "Repair order not found." : r.error);
    setRo(r.data);
    setItems(i.data || []);
    setPayments(p.data || []);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Totals are computed by the database; refresh just those columns.
  const refreshTotals = useCallback(async () => {
    const [{ data }, lines] = await Promise.all([
      supabase
        .from("repair_orders")
        .select("labor_total, parts_total, other_total, taxable_total, tax_amount, total, cost_total, amount_paid, balance_due, payment_status, tax_rate, tax_state, tax_surtax, surtax_county, govt_fees_total, exempt_total")
        .eq("id", params.id)
        .single(),
      supabase.from("repair_order_items").select("id, taxable").eq("repair_order_id", params.id),
    ]);
    if (data) setRo((r) => ({ ...r, ...data }));
    if (lines.data) setItems((xs) => xs.map((x) => ({ ...x, taxable: lines.data.find((y) => y.id === x.id)?.taxable ?? x.taxable })));
  }, [params.id]);

  const patchRo = async (patch, msg) => {
    setRo((r) => ({ ...r, ...patch }));
    const { error: err } = await supabase.from("repair_orders").update(patch).eq("id", params.id);
    if (err) {
      toast(err.message, "bad");
      load();
      return false;
    }
    if (msg) toast(msg);
    if (["discount_amount", "tax_exempt", "customer_supplied_parts", "invoiced_at"].some((k) => k in patch)) refreshTotals();
    if ("status" in patch || "invoiced_at" in patch || "voided_at" in patch) {
      refreshCounts();
      load();
    }
    // Job finished: tell the customer (automatically, or ask first).
    if (patch.status === "ready" && ro?.status !== "ready" && ro?.customer) {
      if (shop.notify?.auto_ready) {
        autoNotify({ ...ro, ...patch }, shop)
          .then((r) => {
            if (r?.skipped) setNotifyEvent("ready");
            else toast(`${customerName(ro.customer)} was told it's ready`);
            load();
          })
          .catch((e) => toast(e.message, "bad"));
      } else {
        setNotifyEvent("ready");
      }
    }
    return true;
  };

  // ------------------------------------------------------------ line items
  const addItem = async (item) => {
    const position = items.length ? Math.max(...items.map((i) => i.position)) + 1 : 0;
    const { data, error: err } = await supabase
      .from("repair_order_items")
      .insert({ repair_order_id: params.id, position, ...item })
      .select()
      .single();
    if (err) return toast(err.message, "bad");
    setItems((xs) => [...xs, data]);
    refreshTotals();
    setTimeout(() => document.getElementById(`desc-${data.id}`)?.focus(), 30);
  };

  // Taxability is decided by the database (Florida rules); see lib/books.itemTaxable.
  const laborRate = Number(books.labor_rates?.[0]?.rate) || Number(shop.labor_rate) || 0;
  const addLabor = () => addItem({ kind: "labor", labor_type: "hourly", technician: ro.technician || null, description: "", quantity: 1, unit_price: laborRate });
  const addFeeCode = (code) => {
    setFeeMenu(false);
    const f = books.fees?.[code] || {};
    const label = f.label || FEE_CODES.find((x) => x.code === code)?.label || "Fee";
    if (code === "shop_supplies") {
      const labor = items.filter((i) => i.kind === "labor" && i.approved).reduce((s2, i) => s2 + Number(i.quantity) * Number(i.unit_price), 0);
      const amt = r2(Math.min((labor * (Number(f.pct) || 0)) / 100, Number(f.cap) || Infinity));
      return addItem({ kind: "fee", fee_code: code, description: label, quantity: 1, unit_price: amt });
    }
    const per = code === "tire" ? Number(rateOn(rates || [], "tire_fee", isoDay()) ?? 1) : code === "battery" ? Number(rateOn(rates || [], "battery_fee", isoDay()) ?? 1.5) : Number(f.amount) || 0;
    addItem({ kind: "fee", fee_code: code, description: code === "tire" ? "Florida new tire fee" : code === "battery" ? "Florida lead-acid battery fee" : label, quantity: code === "tire" ? 4 : 1, unit_price: per });
  };

  const updateItemLocal = (id, patch) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const saveItem = async (id, patch) => {
    const { error: err } = await supabase.from("repair_order_items").update(patch).eq("id", id);
    if (err) {
      toast(err.message, "bad");
      load();
    } else refreshTotals();
  };

  const removeItem = async (item) => {
    setItems((xs) => xs.filter((x) => x.id !== item.id));
    const { error: err } = await supabase.from("repair_order_items").delete().eq("id", item.id);
    if (err) {
      toast(err.message, "bad");
      load();
    } else refreshTotals();
  };

  // ------------------------------------------------------------ actions
  const createInvoice = async () => {
    const terms = ro.terms || ro.customer?.default_terms || shop.default_terms || "Due on receipt";
    const ok = await confirm({
      title: `Create invoice from RO #${ro.number}?`,
      message: `It gets the next invoice number, is dated today and is due ${terms === "Due on receipt" ? "on receipt" : `in ${terms.replace("Net ", "")} days (${terms})`}. Line items can still be edited afterwards.`,
      confirmLabel: "Create invoice",
    });
    if (!ok) return;
    const patch = { invoiced_at: new Date().toISOString(), terms, due_date: dueDateFor(terms) };
    if (["estimate", "approved", "in_progress", "waiting_parts"].includes(ro.status)) patch.status = "ready";
    await patchRo(patch, "Invoice created");
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/i/${ro.public_token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Customer link copied");
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  const voidInvoice = async () => {
    const ok = await confirm({
      title: `Void invoice #${ro.invoice_number}?`,
      message: "The invoice keeps its number but its balance no longer counts as owed. Use this instead of deleting so your numbering stays intact (same as QuickBooks).",
      confirmLabel: "Void invoice",
      danger: true,
    });
    if (!ok) return;
    await patchRo({ voided_at: new Date().toISOString(), status: "cancelled" }, `Invoice #${ro.invoice_number} voided`);
  };

  const restore = () => patchRo({ voided_at: null, status: "completed" }, "Invoice restored");

  // Credit memo: reverses sales and sales tax for the lines you pick.
  const issueCredit = async () => {
    const ok = await confirm({
      title: `Credit memo for invoice #${ro.invoice_number}?`,
      message: "A credit memo is created with this invoice's lines. Remove the lines you're not crediting, then apply it to the invoice or record a refund. Sales tax is reversed automatically.",
      confirmLabel: "Create credit memo",
    });
    if (!ok) return;
    const { data: cm, error: err } = await supabase.from("repair_orders").insert({
      doc_type: "credit_memo", credit_for_id: ro.id, customer_id: ro.customer_id, vehicle_id: ro.vehicle_id, status: "completed",
      customer_supplied_parts: ro.customer_supplied_parts, tax_exempt: ro.tax_exempt, exempt_reason: ro.exempt_reason,
      customer_notes: `Credit for invoice #${ro.invoice_number}`,
    }).select("id").single();
    if (err) return toast(err.message, "bad");
    const lines = items.filter((i) => i.approved).map(({ kind, item_name, description, part_number, quantity, unit_price, unit_cost, position, fee_code, labor_type }) => ({
      repair_order_id: cm.id, kind, item_name, description, part_number, quantity, unit_price, unit_cost, position, fee_code, labor_type, approved: true,
    }));
    if (lines.length) await supabase.from("repair_order_items").insert(lines);
    await supabase.from("repair_orders").update({ invoiced_at: new Date().toISOString() }).eq("id", cm.id);
    router.push(`/admin/repair-orders/${cm.id}`);
  };

  const applyCredit = async () => {
    const { data: orig } = await supabase.from("repair_orders").select("id, invoice_number, balance_due").eq("id", ro.credit_for_id).single();
    const amt = r2(Math.min(Number(ro.balance_due), Math.max(Number(orig?.balance_due || 0), 0)));
    if (!(amt > 0)) return toast("Nothing left to apply — the invoice is already paid. Record a refund instead.", "warn");
    const now = new Date().toISOString();
    const res = await supabase.from("payments").insert([
      { repair_order_id: orig.id, amount: amt, method: "credit_memo", reference: `Credit memo #${ro.invoice_number}`, received_at: now },
      { repair_order_id: ro.id, amount: amt, method: "credit_memo", reference: `Applied to invoice #${orig.invoice_number}`, received_at: now },
    ]);
    if (res.error) return toast(res.error.message, "bad");
    toast(`${money(amt)} applied to invoice #${orig.invoice_number}`);
    load();
  };

  const closeInternal = async () => {
    const ok = await confirm({ title: "Close this recon repair order?", message: "Its parts and sublet cost is added to the car's cost basis. No invoice number is used.", confirmLabel: "Close" });
    if (ok) patchRo({ invoiced_at: new Date().toISOString(), status: "completed" }, "Cost added to the car");
  };

  const duplicate = async () => {
    const invoice = Boolean(ro.invoiced_at);
    const terms = ro.terms || shop.default_terms || "Due on receipt";
    const { data: copy, error: err } = await supabase
      .from("repair_orders")
      .insert({
        customer_id: ro.customer_id, vehicle_id: ro.vehicle_id, complaint: ro.complaint, customer_notes: ro.customer_notes,
        terms, ship_to: ro.ship_to, notify_party: ro.notify_party, discount_amount: ro.discount_amount,
        tax_exempt: ro.tax_exempt, exempt_reason: ro.exempt_reason, customer_supplied_parts: ro.customer_supplied_parts,
        status: invoice ? "completed" : "estimate",
        invoiced_at: invoice ? new Date().toISOString() : null,
        due_date: invoice ? dueDateFor(terms) : null,
      })
      .select("id")
      .single();
    if (err) return toast(err.message, "bad");
    if (items.length) {
      const { error: itemErr } = await supabase.from("repair_order_items").insert(
        items.map(({ kind, item_name, description, part_id, part_number, quantity, unit_price, unit_cost, approved, position, fee_code, labor_type, technician }) => ({
          repair_order_id: copy.id, kind, item_name, description, part_id, part_number, quantity, unit_price, unit_cost, approved, position, fee_code, labor_type, technician,
        }))
      );
      if (itemErr) toast(itemErr.message, "bad");
    }
    toast(invoice ? "Invoice duplicated" : "Estimate duplicated");
    router.push(`/admin/repair-orders/${copy.id}`);
  };

  const del = async () => {
    const ok = await confirm({
      title: ro.invoiced_at ? `Delete invoice #${ro.invoice_number}?` : `Delete RO #${ro.number}?`,
      message: ro.invoiced_at
        ? "This permanently removes the invoice, its lines and payments, and leaves a gap in your invoice numbers. Voiding is usually better."
        : "This permanently removes the repair order, its line items and payments.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    const { error: err } = await supabase.from("repair_orders").delete().eq("id", ro.id);
    if (err) return toast(err.message, "bad");
    toast(`RO #${ro.number} deleted`);
    router.push("/admin/repair-orders");
  };

  if (error) return <ErrorBanner error={error} />;
  if (!ro) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const next = NEXT_STEP[ro.status];
  const isInvoice = Boolean(ro.invoiced_at);
  const isCredit = ro.doc_type === "credit_memo";
  const isInternal = Boolean(ro.stock_vehicle_id);
  const profit = Number(ro.total) - Number(ro.tax_amount) - Number(ro.cost_total);
  const margin = Number(ro.total) - Number(ro.tax_amount) > 0 ? (profit / (Number(ro.total) - Number(ro.tax_amount))) * 100 : 0;

  return (
    <>
      {/* ---------------------------------------------------------------- header */}
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link href={isInvoice ? "/admin/invoices" : "/admin/repair-orders"} className="mb-2 inline-flex text-[13px] text-a-muted hover:text-a-text">
            ← {isInvoice ? "Invoices" : "Repair orders"}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {isCredit ? (
                <>Credit memo <span className="text-a-faint">#{ro.invoice_number}</span></>
              ) : isInternal ? (
                <>Recon RO <span className="text-a-faint">#{ro.number}</span></>
              ) : isInvoice ? (
                <>Invoice <span className="text-a-faint">#{ro.invoice_number}</span></>
              ) : (
                <>Repair order <span className="text-a-faint">#{ro.number}</span></>
              )}
            </h1>
            <div className="relative">
              <button onClick={() => setStatusMenu((s) => !s)} className="flex items-center gap-1" aria-haspopup="menu">
                <StatusBadge map={RO_STATUS} value={ro.status} />
                <ChevronDown className="h-3.5 w-3.5 text-a-faint" />
              </button>
              {statusMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusMenu(false)} />
                  <div className="absolute left-0 top-8 z-20 w-52 animate-slide-up rounded-xl border border-a-line bg-a-raised p-1 shadow-pop" role="menu">
                    {Object.entries(RO_STATUS).map(([k, v]) => (
                      <button
                        key={k}
                        role="menuitem"
                        onClick={() => {
                          setStatusMenu(false);
                          if (k !== ro.status) patchRo({ status: k }, `Status → ${v.label}`);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-a-hover"
                      >
                        <StatusBadge map={RO_STATUS} value={k} />
                        {k === ro.status && <Check className="h-4 w-4 text-a-accent" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {isInvoice && !ro.voided_at && <StatusBadge map={PAYMENT_STATUS} value={ro.payment_status} />}
            {ro.voided_at && <Badge tone="bad">Void</Badge>}
            {ro.viewed_at && <Badge tone="info"><Eye className="h-3 w-3" /> Viewed {dateTime(ro.viewed_at)}</Badge>}
            {ro.declined_at && ro.status === "estimate" && <Badge tone="bad">Customer declined</Badge>}
          </div>
          <p className="mt-1 text-sm text-a-muted">
            {isInvoice && ro.vehicle_id ? <>From RO #{ro.number} · </> : null}Opened {dateTime(ro.created_at)}
            {ro.approved_by_name && ro.approved_at && <> · Approved by {ro.approved_by_name} {dateTime(ro.approved_at)}</>}
            {ro.sent_at && <> · Sent {dateTime(ro.sent_at)}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button icon={Printer} href={`/admin/repair-orders/${ro.id}/print`} target="_blank">
            Print / PDF
          </Button>
          <Button icon={Link2} onClick={copyLink}>
            Copy link
          </Button>
          <Button icon={Send} onClick={() => setSendOpen(true)}>
            {isInvoice ? "Send invoice" : "Send estimate"}
          </Button>
          {!isInvoice && !isInternal && (
            <Button icon={Receipt} onClick={createInvoice}>
              Create invoice
            </Button>
          )}
          {isInternal && !isInvoice && (
            <Button icon={CarFront} onClick={closeInternal}>Close & add cost to car</Button>
          )}
          {isInvoice && !isCredit && !isInternal && !ro.voided_at && (
            <Button icon={Undo2} onClick={issueCredit}>Credit memo / refund</Button>
          )}
          <Button icon={Copy} onClick={duplicate}>Duplicate</Button>
          <Button icon={BellRing} onClick={() => setNotifyEvent(ro.status === "ready" || ro.status === "completed" ? "ready" : "status")}>
            Notify customer
          </Button>
          {next && (
            <Button variant="primary" onClick={() => patchRo({ status: next.to }, `Status → ${RO_STATUS[next.to].label}`)}>
              {next.label} <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        {/* ---------------------------------------------------------------- main column */}
        <div className="min-w-0 space-y-5">
          {/* customer + vehicle */}
          <Card>
            <div className="grid divide-y divide-a-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[12.5px] font-medium text-a-muted"><User className="h-4 w-4" /> Customer</span>
                  <Button size="xs" variant="ghost" onClick={() => setEditCustomer(true)}>Change</Button>
                </div>
                {ro.customer ? (
                  <>
                    <Link href={`/admin/customers/${ro.customer.id}`} className="text-[15px] font-semibold hover:text-a-accent">
                      {customerName(ro.customer)}
                    </Link>
                    <div className="mt-1.5 space-y-1 text-sm text-a-muted">
                      {ro.customer.phone && (
                        <a href={telHref(ro.customer.phone)} className="flex items-center gap-2 hover:text-a-text"><Phone className="h-3.5 w-3.5" />{fmtPhone(ro.customer.phone)}</a>
                      )}
                      {ro.customer.email && (
                        <a href={`mailto:${ro.customer.email}`} className="flex items-center gap-2 hover:text-a-text"><Mail className="h-3.5 w-3.5" />{ro.customer.email}</a>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-a-faint">No customer</p>
                )}
              </div>
              <div className="p-5">
                <div className="mb-2 flex items-center gap-2 text-[12.5px] font-medium text-a-muted"><Car className="h-4 w-4" /> Vehicle</div>
                {ro.vehicle ? (
                  <>
                    <div className="text-[15px] font-semibold">{vehicleName(ro.vehicle)}</div>
                    <div className="mt-1.5 space-y-0.5 text-sm text-a-muted">
                      {ro.vehicle.vin && <div className="font-mono text-xs">{ro.vehicle.vin}</div>}
                      <div>{[ro.vehicle.license_plate, ro.vehicle.color, ro.vehicle.engine].filter(Boolean).join(" · ")}</div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-a-faint">No vehicle</p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <NumberField label="Miles in" value={ro.mileage_in} onSave={(v) => patchRo({ mileage_in: v })} />
                  <NumberField label="Miles out" value={ro.mileage_out} onSave={(v) => patchRo({ mileage_out: v })} />
                </div>
              </div>
            </div>
          </Card>

          {/* concern / diagnosis */}
          <Card className="p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <AutoText label="Customer concern" value={ro.complaint} onSave={(v) => patchRo({ complaint: v })} placeholder="What the customer reported" />
              <AutoText label="Diagnosis / findings" value={ro.diagnosis} onSave={(v) => patchRo({ diagnosis: v })} placeholder="What the tech found (shown to customer)" />
            </div>
          </Card>

          {/* line items */}
          <Card>
            <CardHeader
              icon={ClipboardList}
              title="Labor & parts"
              description={ro.status === "estimate" ? "Untick “Include” for work the customer declines — it stays listed as a recommendation." : null}
              actions={
                <IconButton icon={showCost ? EyeOff : Eye} label={showCost ? "Hide cost" : "Show cost & margin"} onClick={() => setShowCost((s) => !s)} />
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-y border-a-line text-left text-[11px] font-semibold uppercase tracking-wide text-a-faint">
                    <th className="w-[92px] px-3 py-2">Type</th>
                    <th className="w-[150px] px-2 py-2">Product/service</th>
                    <th className="px-2 py-2">Description</th>
                    <th className="w-[76px] px-2 py-2 text-right">Qty/Hrs</th>
                    <th className="w-[100px] px-2 py-2 text-right">Price</th>
                    {showCost && <th className="w-[92px] px-2 py-2 text-right">Cost</th>}
                    <th className="w-[44px] px-1 py-2 text-center" title="Taxable">Tax</th>
                    <th className="w-[58px] px-1 py-2 text-center">Include</th>
                    <th className="w-[96px] px-3 py-2 text-right">Amount</th>
                    <th className="w-[40px]" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <ItemRow
                      key={it.id}
                      item={it}
                      showCost={showCost}
                      onLocal={(p) => updateItemLocal(it.id, p)}
                      onSave={(p) => saveItem(it.id, p)}
                      onRemove={() => removeItem(it)}
                      markup={books.markup_matrix}
                      technicians={shop.technicians || []}
                    />
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-sm text-a-faint">
                        No work added yet. Start with labor, a part, or a service from your price list.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <datalist id="item-names">{ITEM_SUGGESTIONS.map((n) => <option key={n} value={n} />)}</datalist>
            <div className="flex flex-wrap gap-2 border-t border-a-line p-3">
              <Button size="sm" icon={Wrench} onClick={addLabor}>Labor</Button>
              <Button size="sm" icon={Package} onClick={() => setPartOpen(true)}>Part</Button>
              <Button size="sm" icon={ClipboardList} onClick={() => setServiceOpen(true)}>From price list</Button>
              <div className="relative">
                <Button size="sm" icon={Plus} variant="ghost" onClick={() => setFeeMenu((m) => !m)}>Fee <ChevronDown className="h-3.5 w-3.5" /></Button>
                {feeMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setFeeMenu(false)} />
                    <div className="absolute bottom-10 left-0 z-20 w-60 rounded-xl border border-a-line bg-a-raised p-1 shadow-pop">
                      {FEE_CODES.map((f) => (
                        <button key={f.code} onClick={() => addFeeCode(f.code)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-a-hover">
                          {books.fees?.[f.code]?.label || f.label}
                          {f.code === "shop_supplies" && books.fees?.shop_supplies?.pct ? <span className="text-xs text-a-faint"> · {books.fees.shop_supplies.pct}% of labor</span> : null}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <Button size="sm" icon={Plus} variant="ghost" onClick={() => addItem({ kind: "sublet", description: "Sublet: ", quantity: 1, unit_price: 0 })}>Sublet</Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <AutoText label="Recommendations" value={ro.recommendations} onSave={(v) => patchRo({ recommendations: v })} placeholder="Future work to suggest (shown to customer)" />
              <AutoText label="Notes to customer" value={ro.customer_notes} onSave={(v) => patchRo({ customer_notes: v })} placeholder="Printed on the estimate/invoice" />
            </div>
          </Card>
        </div>

        {/* ---------------------------------------------------------------- sidebar */}
        <div className="space-y-5">
          <Card className="p-5">
            <dl className="space-y-2 text-sm tnum">
              <SumRow label="Labor" value={money(ro.labor_total)} />
              <SumRow label="Parts" value={money(ro.parts_total)} />
              <SumRow label="Fees & sublet" value={money(ro.other_total)} />
              <div className="flex items-center justify-between gap-3">
                <dt className="text-a-muted">Discount</dt>
                <dd><MoneyInput value={ro.discount_amount} onSave={(v) => patchRo({ discount_amount: v })} /></dd>
              </div>
              {Number(ro.govt_fees_total) > 0 && <SumRow label="Tire/battery fees (not taxed)" value={money(ro.govt_fees_total)} />}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-a-muted">
                  FL sales tax 6% <span className="text-a-faint">on {money(ro.taxable_total)}</span>
                </dt>
                <dd>{money(ro.tax_state)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-a-muted">{ro.surtax_county || books.shop_county || "Lake"} surtax</dt>
                <dd>{money(ro.tax_surtax)}</dd>
              </div>
              <div className="space-y-2 rounded-lg border border-a-line p-2.5 text-xs">
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="a-check mt-0.5" checked={Boolean(ro.customer_supplied_parts)} onChange={(e) => patchRo({ customer_supplied_parts: e.target.checked })} />
                  <span><span className="text-a-text">Customer-supplied parts</span><br /><span className="text-a-faint">Labor-only job: separately stated labor isn't taxed.</span></span>
                </label>
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="a-check mt-0.5" checked={Boolean(ro.tax_exempt)} onChange={(e) => patchRo({ tax_exempt: e.target.checked, exempt_reason: e.target.checked ? ro.exempt_reason || ro.customer?.tax_exempt_reason || null : null })} />
                  <span><span className="text-a-text">Tax-exempt sale</span><br /><span className="text-a-faint">Resale, exempt organization or export — certificate on file.</span></span>
                </label>
                {ro.tax_exempt && <Input className="h-8" placeholder="Certificate / reason" defaultValue={ro.exempt_reason || ""} onBlur={(e) => e.target.value !== (ro.exempt_reason || "") && patchRo({ exempt_reason: e.target.value || null })} />}
                {ro.customer?.tax_exempt && !ro.tax_exempt && (
                  <button onClick={() => patchRo({ tax_exempt: true, exempt_reason: ro.customer.tax_exempt_reason || "Exempt customer" }, "Marked tax-exempt")} className="text-a-warn">
                    {customerName(ro.customer)} is tax-exempt — apply
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-a-line pt-3">
                <dt className="font-semibold">Total</dt>
                <dd className="font-display text-2xl font-semibold">{money(ro.total)}</dd>
              </div>
              <SumRow label="Paid" value={money(ro.amount_paid)} />
              <div className="flex items-center justify-between">
                <dt className="font-medium">Balance due</dt>
                <dd className={cx("text-lg font-semibold", Number(ro.balance_due) > 0 ? "text-a-warn" : "text-a-good")}>{money(ro.balance_due)}</dd>
              </div>
            </dl>
            {showCost && (
              <div className="mt-4 rounded-lg bg-a-raised p-3 text-sm tnum">
                <SumRow label="Cost of parts/labor" value={money(ro.cost_total)} />
                <SumRow label="Gross profit" value={`${money(profit)} (${margin.toFixed(0)}%)`} />
              </div>
            )}
            {isCredit ? (
              <div className="mt-4 space-y-2">
                <Button variant="primary" className="w-full" icon={Undo2} disabled={!(Number(ro.balance_due) > 0)} onClick={applyCredit}>Apply to the invoice</Button>
                <Button className="w-full" icon={DollarSign} disabled={!(Number(ro.balance_due) > 0)} onClick={() => setPayOpen(true)}>Record refund paid out</Button>
                <Link href={`/admin/repair-orders/${ro.credit_for_id}`} className="block text-center text-xs text-a-accent">Open the original invoice</Link>
              </div>
            ) : isInternal ? (
              <p className="mt-4 rounded-lg bg-a-violet/10 px-3 py-2 text-xs text-a-violet">Internal job on {ro.stock ? `${ro.stock.year} ${ro.stock.make} ${ro.stock.model}` : "an inventory car"}: parts cost goes into the car's cost basis, not a customer invoice.</p>
            ) : (
              <Button variant="primary" className="mt-4 w-full" icon={DollarSign} onClick={() => setPayOpen(true)}>
                Record payment
              </Button>
            )}
          </Card>

          <Card>
            <CardHeader icon={CircleDollarSign} title="Payments" />
            <div className="px-5 pb-4">
              {payments.length === 0 ? (
                <p className="text-sm text-a-faint">No payments yet.</p>
              ) : (
                <ul className="divide-y divide-a-line">
                  {payments.map((p) => (
                    <li key={p.id} className={cx("group flex items-center justify-between gap-2 py-2 text-sm", p.voided_at && "opacity-50 line-through")}>
                      <div>
                        <div className="font-medium tnum">{money(p.amount)}</div>
                        <div className="text-xs text-a-faint">
                          {date(p.received_at)} · <span className="capitalize">{p.method}</span>
                          {p.reference && ` · ${p.reference}`}
                        </div>
                      </div>
                      {!p.voided_at && (
                        <IconButton
                          size="sm"
                          icon={Ban}
                          label="Void payment"
                          className="opacity-60 group-hover:opacity-100"
                          onClick={async () => {
                            if (!(await confirm({ title: "Void this payment?", message: `${money(p.amount)} via ${p.method}. It stays on record and a reversing entry is posted.`, danger: true, confirmLabel: "Void" }))) return;
                            const voided_at = new Date().toISOString();
                            const { error: err } = await supabase.from("payments").update({ voided_at }).eq("id", p.id);
                            if (err) return toast(err.message, "bad");
                            setPayments((xs) => xs.map((x) => (x.id === p.id ? { ...x, voided_at } : x)));
                            refreshTotals();
                          }}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-a-muted"><FileSignature className="h-4 w-4" /> {isInvoice ? "Invoice details" : "Billing"}</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Terms">
                {(id) => (
                  <Select
                    id={id}
                    value={ro.terms || ro.customer?.default_terms || shop.default_terms || "Due on receipt"}
                    onChange={(e) => {
                      const terms = e.target.value;
                      patchRo(isInvoice ? { terms, due_date: dueDateFor(terms, ro.invoiced_at) } : { terms }, isInvoice ? `Terms ${terms} · due date updated` : null);
                    }}
                  >
                    {TERMS.map((t) => <option key={t.value}>{t.value}</option>)}
                  </Select>
                )}
              </Field>
              {isInvoice ? (
                <Field label="Due date">
                  {(id) => <Input id={id} type="date" key={ro.due_date} defaultValue={ro.due_date || ""} onBlur={(e) => e.target.value !== (ro.due_date || "") && patchRo({ due_date: e.target.value || null })} />}
                </Field>
              ) : (
                <div />
              )}
            </div>
            <LineText label="P.O. / reference #" value={ro.po_number} onSave={(v) => patchRo({ po_number: v })} />
            {isInvoice && !isCredit && !isInternal && (
              <Field label="Repeat this invoice (fleet / recurring)">
                {(id) => (
                  <Select id={id} value={ro.recurrence || ""} onChange={(e) => {
                    const rec = e.target.value || null;
                    const d = new Date();
                    if (rec === "weekly") d.setDate(d.getDate() + 7); else if (rec === "monthly") d.setMonth(d.getMonth() + 1); else if (rec === "quarterly") d.setMonth(d.getMonth() + 3); else if (rec) d.setFullYear(d.getFullYear() + 1);
                    patchRo({ recurrence: rec, next_run_on: rec ? d.toISOString().slice(0, 10) : null }, rec ? `A copy will be created ${rec}` : "No longer repeats");
                  }}>
                    <option value="">Doesn't repeat</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
                  </Select>
                )}
              </Field>
            )}
            {ro.recurrence && <p className="-mt-2 flex items-center gap-1 text-xs text-a-faint"><Repeat className="h-3.5 w-3.5" />Next copy on {date(ro.next_run_on)}</p>}
            <AutoText label="Ship to" value={ro.ship_to} onSave={(v) => patchRo({ ship_to: v })} rows={2} placeholder="Leave blank to use the bill-to address" />
            <AutoText label="Notify party" value={ro.notify_party} onSave={(v) => patchRo({ notify_party: v })} rows={2} placeholder="e.g. consignee or broker for exports" />
          </Card>

          <Card className="space-y-4 p-5">
            <TechField value={ro.technician} technicians={shop.technicians || []} onSave={(v) => patchRo({ technician: v })} />
            <Field label="Promised by">
              {(id) => (
                <Input
                  id={id}
                  type="datetime-local"
                  defaultValue={ro.promised_at ? toLocalInput(ro.promised_at) : ""}
                  onBlur={(e) => {
                    const v = e.target.value ? new Date(e.target.value).toISOString() : null;
                    if (v !== ro.promised_at) patchRo({ promised_at: v });
                  }}
                />
              )}
            </Field>
            <AutoText label="Internal notes (never shown to customer)" value={ro.internal_notes} onSave={(v) => patchRo({ internal_notes: v })} rows={3} />
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-a-muted"><BellRing className="h-4 w-4" /> Customer updates</h3>
            {notes.length === 0 ? (
              <p className="text-sm text-a-faint">Nothing sent yet. When the job is marked ready you'll be asked to notify the customer.</p>
            ) : (
              <ul className="space-y-2.5">
                {notes.map((n) => {
                  const Icon = n.channel === "email" ? Mail : n.channel === "sms" ? MessageSquareText : Smartphone;
                  return (
                    <li key={n.id} className="flex gap-2.5 text-sm">
                      <Icon className={cx("mt-0.5 h-4 w-4 shrink-0", n.status === "failed" ? "text-a-bad" : "text-a-good")} />
                      <div className="min-w-0">
                        <div className="text-a-text">
                          {n.channel === "email" ? "Email" : n.channel === "sms" ? "Text" : "Text from phone"} · {n.event === "ready" ? "ready for pickup" : "update"}
                          {n.status === "failed" && <span className="text-a-bad"> · failed</span>}
                        </div>
                        <div className="truncate text-xs text-a-faint" title={n.error || n.body}>{n.status === "failed" ? n.error : n.recipient} · {dateTime(n.created_at)}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-[13px] font-semibold text-a-muted">Timeline</h3>
            <ol className="space-y-2.5 text-sm">
              {[
                ["Created", ro.created_at],
                ["Approved", ro.approved_at],
                ["Work started", ro.started_at],
                ["Completed", ro.completed_at],
                ["Invoiced", ro.invoiced_at],
                ["Sent to customer", ro.sent_at],
                ["Viewed by customer", ro.viewed_at],
                ...(ro.voided_at ? [["Voided", ro.voided_at]] : []),
              ].map(([label, at]) => (
                <li key={label} className="flex items-center gap-3">
                  <span className={cx("h-2 w-2 rounded-full", at ? "bg-a-good" : "bg-a-line")} />
                  <span className={cx("flex-1", at ? "text-a-text" : "text-a-faint")}>{label}</span>
                  <span className="text-xs text-a-faint">{at ? dateTime(at) : "—"}</span>
                </li>
              ))}
            </ol>
          </Card>

          {isInvoice && !ro.voided_at && (
            <Button variant="danger" icon={Ban} className="w-full" onClick={voidInvoice}>
              Void invoice
            </Button>
          )}
          {ro.voided_at && (
            <Button icon={RotateCcw} className="w-full" onClick={restore}>
              Restore voided invoice
            </Button>
          )}
          {!isInvoice && payments.length === 0 && (
            <Button variant="ghost" icon={Trash2} className="w-full text-a-bad" onClick={del}>
              Delete repair order
            </Button>
          )}
        </div>
      </div>

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        balance={Number(ro.balance_due)}
        onSaved={(p) => {
          setPayments((xs) => [...xs, p]);
          refreshTotals();
        }}
        roId={ro.id}
      />
      <SendModal open={sendOpen} onClose={() => setSendOpen(false)} ro={ro} onSent={() => load()} />
      <NotifyCustomerModal open={Boolean(notifyEvent)} event={notifyEvent || "ready"} ro={ro} onClose={() => setNotifyEvent(null)} onSent={() => load()} />
      <PartPickerModal open={partOpen} onClose={() => setPartOpen(false)} onPick={(item) => addItem(item)} />
      <ServicePickerModal
        open={serviceOpen}
        onClose={() => setServiceOpen(false)}
        onPick={(item) => addItem(item.kind === "labor" ? { ...item, labor_type: "flat", technician: ro.technician || null } : item)}
      />
      <Modal
        open={editCustomer}
        onClose={() => setEditCustomer(false)}
        title="Customer & vehicle"
        size="lg"
        footer={<Button variant="primary" onClick={() => setEditCustomer(false)}>Done</Button>}
      >
        <div className="space-y-5">
          <Field label="Customer">
            <CustomerPicker
              value={ro.customer}
              onChange={async (c) => {
                await patchRo({ customer_id: c?.id || null, vehicle_id: null });
                load();
              }}
            />
          </Field>
          <Field label="Vehicle">
            <VehiclePicker
              customerId={ro.customer?.id}
              value={ro.vehicle}
              onChange={async (v) => {
                await patchRo({ vehicle_id: v?.id || null });
                load();
              }}
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}

// ======================================================================= pieces

function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SumRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-a-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function AutoText({ label, value, onSave, placeholder, rows = 3 }) {
  const [v, setV] = useState(value || "");
  useEffect(() => setV(value || ""), [value]);
  return (
    <Field label={label}>
      {(id) => (
        <Textarea
          id={id}
          rows={rows}
          value={v}
          placeholder={placeholder}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => (v.trim() || null) !== (value || null) && onSave(v.trim() || null)}
        />
      )}
    </Field>
  );
}

function LineText({ label, value, onSave, placeholder }) {
  const [v, setV] = useState(value || "");
  useEffect(() => setV(value || ""), [value]);
  return (
    <TextField label={label} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={() => (v.trim() || null) !== (value || null) && onSave(v.trim() || null)} />
  );
}

function NumberField({ label, value, onSave }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <TextField
      label={label}
      inputMode="numeric"
      value={v}
      onChange={(e) => setV(e.target.value.replace(/[^\d]/g, ""))}
      onBlur={() => {
        const n = v === "" ? null : parseInt(v, 10);
        if (n !== (value ?? null)) onSave(n);
      }}
    />
  );
}

function MoneyInput({ value, onSave, className }) {
  const [v, setV] = useState(String(Number(value || 0)));
  useEffect(() => setV(String(Number(value || 0))), [value]);
  return (
    <div className={cx("relative w-28", className)}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-a-faint">$</span>
      <Input
        inputMode="decimal"
        value={v}
        onChange={(e) => setV(e.target.value.replace(/[^\d.]/g, ""))}
        onBlur={() => {
          const n = Math.max(0, Math.round((parseFloat(v) || 0) * 100) / 100);
          if (n !== Number(value || 0)) onSave(n);
          else setV(String(n));
        }}
        className="h-8 pl-6 text-right tnum"
      />
    </div>
  );
}

function PercentInput({ value, onSave }) {
  const toPct = (r) => String(Math.round(Number(r || 0) * 10000) / 100);
  const [v, setV] = useState(toPct(value));
  useEffect(() => setV(toPct(value)), [value]);
  return (
    <div className="relative w-20">
      <Input
        inputMode="decimal"
        value={v}
        onChange={(e) => setV(e.target.value.replace(/[^\d.]/g, ""))}
        onBlur={() => {
          const r = Math.min(Math.max((parseFloat(v) || 0) / 100, 0), 0.5);
          if (Math.abs(r - Number(value)) > 1e-9) onSave(Number(r.toFixed(4)));
        }}
        className="h-8 pr-6 text-right tnum"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-a-faint">%</span>
    </div>
  );
}

function TechField({ value, technicians, onSave }) {
  const [v, setV] = useState(value || "");
  useEffect(() => setV(value || ""), [value]);
  return (
    <Field label="Technician">
      {(id) => (
        <>
          <Input
            id={id}
            list="tech-list"
            value={v}
            placeholder="Who's working on it?"
            onChange={(e) => setV(e.target.value)}
            onBlur={() => (v.trim() || null) !== (value || null) && onSave(v.trim() || null)}
          />
          <datalist id="tech-list">
            {technicians.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </>
      )}
    </Field>
  );
}

const KIND_OPTIONS = [
  ["labor", "Labor"],
  ["part", "Part"],
  ["fee", "Fee"],
  ["sublet", "Sublet"],
];

function ItemRow({ item, showCost, onLocal, onSave, onRemove, markup, technicians }) {
  const cell = "px-2 py-1.5";
  const inputCls = "h-8 border-transparent bg-transparent hover:border-a-line focus:bg-a-bg";
  const amount = Number(item.quantity || 0) * Number(item.unit_price || 0);
  const num = (s) => {
    const n = parseFloat(String(s).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  };
  return (
    <tr className={cx("border-b border-a-line/60 align-middle", !item.approved && "opacity-55")}>
      <td className="px-3 py-1.5">
        <Select
          value={item.kind}
          className={cx(inputCls, "pl-2 text-xs")}
          onChange={(e) => {
            const kind = e.target.value;
            const patch = { kind, fee_code: kind === "fee" ? item.fee_code || "other" : null, labor_type: kind === "labor" ? item.labor_type || "hourly" : null };
            onLocal(patch);
            onSave(patch);
          }}
        >
          {KIND_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
      </td>
      <td className={cell}>
        <Input
          list="item-names"
          value={item.item_name || ""}
          placeholder={KIND_LABEL[item.kind]}
          className={cx(inputCls, "font-medium")}
          onChange={(e) => onLocal({ item_name: e.target.value })}
          onBlur={(e) => onSave({ item_name: e.target.value.trim() || null })}
        />
      </td>
      <td className={cell}>
        <Textarea
          id={`desc-${item.id}`}
          rows={Math.min(Math.max(String(item.description || "").split("\n").length, 1), 8)}
          value={item.description}
          placeholder={item.kind === "labor" ? "e.g. Replace front brake pads & rotors" : "Description (Shift+Enter for a new line)"}
          className={cx(inputCls, "h-auto min-h-[32px] resize-none py-1.5 leading-snug")}
          onChange={(e) => onLocal({ description: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          onBlur={(e) => onSave({ description: e.target.value.trim() || "Item" })}
        />
        {item.kind === "labor" && (
          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs">
            <Select value={item.labor_type || "hourly"} className={cx(inputCls, "h-7 w-[92px] pl-1.5 text-xs")} onChange={(e) => { onLocal({ labor_type: e.target.value }); onSave({ labor_type: e.target.value }); }}>
              <option value="hourly">Hourly</option>
              <option value="flat">Flat rate</option>
            </Select>
            <Input placeholder="Actual hrs" inputMode="decimal" className={cx(inputCls, "h-7 w-[84px] text-xs")} value={item.actual_hours ?? ""}
              onChange={(e) => onLocal({ actual_hours: e.target.value.replace(/[^\d.]/g, "") })}
              onBlur={(e) => onSave({ actual_hours: e.target.value === "" ? null : num(e.target.value) })} title="Hours the tech actually spent (for efficiency)" />
            <Input placeholder="Tech" list="tech-names" className={cx(inputCls, "h-7 w-[110px] text-xs")} value={item.technician || ""}
              onChange={(e) => onLocal({ technician: e.target.value })} onBlur={(e) => onSave({ technician: e.target.value.trim() || null })} />
            <datalist id="tech-names">{(technicians || []).map((t) => <option key={t} value={t} />)}</datalist>
          </div>
        )}
        {item.kind === "fee" && (
          <Select value={item.fee_code || "other"} className={cx(inputCls, "mt-0.5 h-7 w-[180px] pl-1.5 text-xs")} onChange={(e) => { onLocal({ fee_code: e.target.value }); onSave({ fee_code: e.target.value }); }}>
            {FEE_CODES.map((f) => <option key={f.code} value={f.code}>{f.label}</option>)}
          </Select>
        )}
        {item.kind === "part" && (
          <Input
            value={item.part_number || ""}
            placeholder="Part #"
            className={cx(inputCls, "mt-0.5 h-7 font-mono text-xs text-a-muted")}
            onChange={(e) => onLocal({ part_number: e.target.value })}
            onBlur={(e) => onSave({ part_number: e.target.value.trim() || null })}
          />
        )}
      </td>
      <td className={cell}>
        <Input
          inputMode="decimal"
          value={item.quantity}
          className={cx(inputCls, "text-right tnum")}
          onChange={(e) => onLocal({ quantity: e.target.value.replace(/[^\d.]/g, "") })}
          onBlur={(e) => {
            const q = num(e.target.value) || 1;
            onLocal({ quantity: q });
            onSave({ quantity: q });
          }}
        />
      </td>
      <td className={cell}>
        <Input
          inputMode="decimal"
          value={item.unit_price}
          className={cx(inputCls, "text-right tnum")}
          onChange={(e) => onLocal({ unit_price: e.target.value.replace(/[^\d.]/g, "") })}
          onBlur={(e) => {
            const p = num(e.target.value);
            onLocal({ unit_price: p });
            onSave({ unit_price: p });
          }}
        />
      </td>
      {showCost && (
        <td className={cell}>
          <Input
            inputMode="decimal"
            value={item.unit_cost}
            className={cx(inputCls, "text-right text-a-muted tnum")}
            onChange={(e) => onLocal({ unit_cost: e.target.value.replace(/[^\d.]/g, "") })}
            onBlur={(e) => {
              const c = num(e.target.value);
              // Parts with no price yet get one from the markup matrix.
              const suggest = item.kind === "part" && !Number(item.unit_price) && markup?.length ? priceFromMatrix(c, markup) : null;
              onLocal({ unit_cost: c, ...(suggest ? { unit_price: suggest } : {}) });
              onSave({ unit_cost: c, ...(suggest ? { unit_price: suggest } : {}) });
            }}
          />
        </td>
      )}
      <td className="px-1 py-1.5 text-center">
        <input
          type="checkbox"
          className="a-check"
          checked={Boolean(item.taxable)}
          aria-label="Taxable"
          readOnly
          disabled
          title="Set automatically by Florida rules: if the shop supplies any parts, the whole job is taxable; towing and tire/battery fees never are."

        />
      </td>
      <td className="px-1 py-1.5 text-center">
        <input
          type="checkbox"
          className="a-check"
          checked={item.approved}
          aria-label="Include in total"
          onChange={(e) => {
            onLocal({ approved: e.target.checked });
            onSave({ approved: e.target.checked });
          }}
        />
      </td>
      <td className="px-3 py-1.5 text-right font-medium tnum">{money(amount)}</td>
      <td className="pr-2 text-right">
        <IconButton size="sm" icon={X} label="Remove line" onClick={onRemove} />
      </td>
    </tr>
  );
}

function PaymentModal({ open, onClose, balance, onSaved, roId }) {
  const { toast } = useUI();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("card");
  const [reference, setReference] = useState("");
  const [when, setWhen] = useState(isoDay());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(balance > 0 ? balance.toFixed(2) : "");
      setReference("");
      setWhen(isoDay());
    }
  }, [open, balance]);

  const save = async () => {
    const n = Math.round(parseFloat(amount) * 100) / 100;
    if (!n) return toast("Enter an amount.", "bad");
    setSaving(true);
    const receivedAt = when === isoDay() ? new Date().toISOString() : new Date(`${when}T12:00:00`).toISOString();
    const { data, error } = await supabase
      .from("payments")
      .insert({ repair_order_id: roId, amount: n, method, reference: reference.trim() || null, received_at: receivedAt })
      .select()
      .single();
    setSaving(false);
    if (error) return toast(error.message, "bad");
    toast(`Payment of ${money(n)} recorded`);
    onSaved(data);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Record payment"
      description={`Balance due ${money(balance)}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={save}>Save payment</Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField label="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.-]/g, ""))} hint="Use a negative amount to record a refund." />
        <div className="grid grid-cols-4 gap-2">
          {["card", "cash", "check", "zelle", "cashapp", "financing", "other"].map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={cx(
                "h-9 rounded-lg border text-[13px] font-medium capitalize transition-colors",
                method === m ? "border-a-accent bg-a-accent/10 text-a-accent" : "border-a-line text-a-muted hover:bg-a-hover"
              )}
            >
              {m === "cashapp" ? "Cash App" : m}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Reference" placeholder="Last 4, check #…" value={reference} onChange={(e) => setReference(e.target.value)} />
          <TextField label="Date" type="date" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

function SendModal({ open, onClose, ro, onSent }) {
  const { toast } = useUI();
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(ro.customer?.email || "");
      setNote("");
    }
  }, [open, ro]);

  const send = async () => {
    setSending(true);
    try {
      await adminFetch("/api/admin/email", { type: "repair_order", id: ro.id, to, note });
      toast(`${ro.invoiced_at ? "Invoice" : "Estimate"} emailed to ${to}`);
      onSent();
      onClose();
    } catch (err) {
      toast(err.message, "bad");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ro.invoiced_at ? `Send invoice #${ro.invoice_number}` : `Send estimate #${ro.number}`}
      description={ro.invoiced_at ? "The customer gets a link to view and print the invoice." : "The customer gets a link to review and approve the estimate online."}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Send} loading={sending} onClick={send} disabled={!to}>Send email</Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField label="To" type="email" value={to} onChange={(e) => setTo(e.target.value)} />
        <TextField as="textarea" rows={4} label="Message (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a personal note…" />
        <p className="flex items-center gap-2 text-xs text-a-faint">
          <FileText className="h-3.5 w-3.5" /> Total {money(ro.total)}
          {ro.invoiced_at && <> · Balance {money(ro.balance_due)}</>}
        </p>
      </div>
    </Modal>
  );
}

function PartPickerModal({ open, onClose, onPick }) {
  const [q, setQ] = useState("");
  const [parts, setParts] = useState([]);
  const dq = useDebounced(q, 200);
  const custom = useRef(null);

  useEffect(() => {
    if (!open) return;
    let query = supabase.from("parts").select("*").eq("active", true).order("name").limit(30);
    const term = dq.trim().replace(/[%_,()]/g, " ");
    if (term) query = query.or(`name.ilike.%${term}%,part_number.ilike.%${term}%,brand.ilike.%${term}%`);
    query.then(({ data }) => setParts(data || []));
  }, [open, dq]);

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Add a part" description="Pick from inventory (stock updates automatically) or add a one-off part." size="lg">
      <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parts by name, number or brand…" />
      <ul className="mt-3 max-h-[46vh] divide-y divide-a-line overflow-y-auto rounded-lg border border-a-line">
        {parts.map((p) => (
          <li key={p.id}>
            <button
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-a-hover"
              onClick={() => {
                onPick({ kind: "part", description: p.name, part_number: p.part_number, part_id: p.id, quantity: 1, unit_price: Number(p.unit_price), unit_cost: Number(p.unit_cost) });
                onClose();
              }}
            >
              <Package className="h-4 w-4 text-a-faint" />
              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm text-a-text">{p.name}</span>
                <span className="block truncate text-xs text-a-faint">{[p.part_number, p.brand, p.location].filter(Boolean).join(" · ")}</span>
              </span>
              <span className={cx("text-xs tnum", Number(p.quantity_on_hand) <= Number(p.reorder_point) ? "text-a-warn" : "text-a-faint")}>
                {Number(p.quantity_on_hand)} in stock
              </span>
              <span className="w-20 text-right text-sm font-medium tnum">{money(p.unit_price)}</span>
            </button>
          </li>
        ))}
        {parts.length === 0 && <li className="px-3 py-6 text-center text-sm text-a-faint">No inventory parts match.</li>}
      </ul>
      <button
        ref={custom}
        onClick={() => {
          onPick({ kind: "part", description: q.trim() || "", quantity: 1, unit_price: 0, unit_cost: 0 });
          onClose();
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-a-line py-2.5 text-sm font-medium text-a-accent hover:bg-a-hover"
      >
        <Plus className="h-4 w-4" /> Add one-off part{q.trim() ? ` “${q.trim()}”` : ""}
      </button>
    </Modal>
  );
}

function ServicePickerModal({ open, onClose, onPick }) {
  const [services, setServices] = useState([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!open) return;
    setQ("");
    supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("display_order")
      .order("name")
      .then(({ data }) => setServices(data || []));
  }, [open]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? services.filter((s) => `${s.name} ${s.category} ${s.description || ""}`.toLowerCase().includes(t)) : services;
  }, [services, q]);

  return (
    <Modal open={open} onClose={onClose} title="Add from price list" description="Adds the service as a labor line at its listed price." size="lg">
      <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services…" />
      <ul className="mt-3 max-h-[52vh] divide-y divide-a-line overflow-y-auto rounded-lg border border-a-line">
        {shown.map((s) => (
          <li key={s.id}>
            <button
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-a-hover"
              onClick={() => {
                onPick({ kind: "labor", description: s.name, quantity: 1, unit_price: Number(s.base_price ?? s.price_range_min ?? 0) });
                onClose();
              }}
            >
              <ClipboardList className="h-4 w-4 text-a-faint" />
              <span className="flex-1">
                <span className="block text-sm text-a-text">{s.name}</span>
                <span className="block text-xs text-a-faint">{s.category}</span>
              </span>
              <span className="text-sm font-medium tnum">{money(s.base_price)}</span>
            </button>
          </li>
        ))}
        {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-a-faint">No services. Add them under Services & pricing.</li>}
      </ul>
    </Modal>
  );
}
