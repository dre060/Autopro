// frontend/src/app/admin/deals/[id]/page.js — deal sheet + buyer's order / bill of sale
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Save, CheckCircle2, Ban, Printer, Plus, Trash2, Upload, FileText, DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { money, date as fmtDate, isoDay, customerName } from "@/lib/format";
import { r2, n0, FL_COUNTIES, rateOn } from "@/lib/books";
import { Button, Card, CardHeader, TextField, Field, Input, Toggle, Badge, Modal, Spinner, ErrorBanner, IconButton, cx, useUI } from "@/components/admin/ui";
import { CustomerPicker } from "@/components/admin/pickers";
import { useAdmin } from "@/components/admin/AdminContext";
import { useRates, uploadDocument, signedUrl } from "@/components/admin/booksKit";
import { loadCostBasis } from "@/components/admin/VehicleCosts";

const NUM = ["sale_price", "doc_fee", "trade_allowance", "trade_payoff", "title_fee", "registration_fee", "other_passthrough", "down_payment", "lender_amount"];
const vname = (v) => (v ? [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") : "");

// Mirror of public.trg_calc_deal for the live preview (the database is authoritative).
function calc(d, rates) {
  const addons = d.addons || [];
  const addon = addons.reduce((s, a) => s + n0(a.price), 0);
  const addonTax = addons.filter((a) => a.taxable !== false).reduce((s, a) => s + n0(a.price), 0);
  const addonCost = addons.reduce((s, a) => s + n0(a.cost), 0);
  const pass = n0(d.title_fee) + n0(d.registration_fee) + n0(d.other_passthrough);
  const state = Number(rateOn(rates, "fl_state_rate", d.sale_date) ?? 0.06);
  const sur = d.out_of_state ? 0 : Number(rateOn(rates, "surtax", d.sale_date, d.buyer_county || "") ?? 0);
  const cap = Number(rateOn(rates, "surtax_item_cap", d.sale_date) ?? 5000);
  const taxable = d.tax_exempt ? 0 : Math.max(n0(d.sale_price) + n0(d.doc_fee) + addonTax - n0(d.trade_allowance), 0);
  const surBase = Math.min(taxable, cap);
  const override = d.tax_override !== "" && d.tax_override != null ? n0(d.tax_override) : null;
  const total = override ?? r2(taxable * state + surBase * sur);
  const surtax = override != null ? 0 : r2(surBase * sur);
  const due = r2(n0(d.sale_price) + n0(d.doc_fee) + addon + total + pass + n0(d.trade_payoff) - n0(d.trade_allowance));
  return { addon, addonCost, pass, taxable, state, sur, surtax, stateTax: r2(total - surtax), total, due };
}

export default function DealPage() {
  const params = useParams();
  const { toast, confirm } = useUI();
  const { shop, books } = useAdmin();
  const rates = useRates();
  const [d, setD] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [basis, setBasis] = useState(null);
  const [payments, setPayments] = useState([]);
  const [docs, setDocs] = useState([]);
  const [stock, setStock] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pay, setPay] = useState(null);

  const load = async () => {
    const { data, error: e } = await supabase.from("vehicle_deals").select("*").eq("id", params.id).single();
    if (e) return setError(e);
    const [v, c, p, docsRes, st] = await Promise.all([
      supabase.from("vehicles").select("*").eq("id", data.vehicle_id).single(),
      data.customer_id ? supabase.from("customers").select("*").eq("id", data.customer_id).single() : Promise.resolve({ data: null }),
      supabase.from("payments").select("*").eq("deal_id", params.id).order("received_at"),
      supabase.from("documents").select("*").eq("entity_type", "deal").eq("entity_id", params.id).order("created_at"),
      supabase.from("vehicles").select("id, year, make, model, vin, stock_number").neq("id", data.vehicle_id).neq("status", "sold").order("created_at", { ascending: false }),
    ]);
    const form = { ...data, tax_override: data.tax_override ?? "" };
    NUM.forEach((k) => (form[k] = String(data[k] ?? 0)));
    setD(form);
    setVehicle(v.data);
    setCustomer(c.data);
    setPayments(p.data || []);
    setDocs(docsRes.data || []);
    setStock(st.data || []);
    loadCostBasis(data.vehicle_id).then((b) => setBasis(b.total));
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (error) return <ErrorBanner error={error} />;
  if (!d || !rates) return <div className="flex h-[60vh] items-center justify-center"><Spinner /></div>;

  const locked = d.status !== "draft";
  const c = calc(d, rates);
  const set = (k) => (e) => setD({ ...d, [k]: e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e });
  const costBasis = d.status === "final" ? Number(d.cost_basis) : basis ?? 0;
  const profit = r2(n0(d.sale_price) + n0(d.doc_fee) + c.addon - c.addonCost - costBasis);
  const paid = payments.filter((p) => !p.voided_at).reduce((s, p) => s + Number(p.amount), 0);

  const save = async (status) => {
    if (status === "final" && !customer) return toast("Pick the buyer first", "bad");
    if (status === "final" && !d.buyer_county && !d.out_of_state) return toast("Choose the buyer's county", "bad");
    setSaving(true);
    const payload = {
      customer_id: customer?.id || null, sale_date: d.sale_date, buyer_county: d.buyer_county || null, out_of_state: Boolean(d.out_of_state),
      tax_exempt: Boolean(d.tax_exempt), exempt_reason: d.exempt_reason?.trim() || null, trade_description: d.trade_description?.trim() || null,
      trade_vin: d.trade_vin?.trim().toUpperCase() || null, trade_vehicle_id: d.trade_vehicle_id || null, lender_name: d.lender_name?.trim() || null,
      notes: d.notes?.trim() || null, tax_override: d.tax_override === "" ? null : n0(d.tax_override),
      addons: (d.addons || []).filter((a) => a.name?.trim() || n0(a.price)).map((a) => ({ name: a.name?.trim() || "Add-on", price: r2(n0(a.price)), cost: r2(n0(a.cost)), taxable: a.taxable !== false })),
      ...Object.fromEntries(NUM.map((k) => [k, r2(n0(d[k]))])),
      ...(status ? { status } : {}),
    };
    const { error: e } = await supabase.from("vehicle_deals").update(payload).eq("id", d.id);
    setSaving(false);
    if (e) return toast(e.message, "bad");
    toast(status === "final" ? "Sale finalized — posted to the books and the car is marked sold" : status === "void" ? "Deal voided" : "Saved");
    load();
  };

  const voidDeal = async () => {
    if (!(await confirm({ title: "Void this sale?", message: "The deal stays on file; revenue, tax and cost are reversed and the car goes back to available.", danger: true, confirmLabel: "Void sale" }))) return;
    save("void");
  };

  const recordPayment = async () => {
    const amt = r2(n0(pay.amount));
    if (!amt) return toast("Enter an amount", "bad");
    const { error: e } = await supabase.from("payments").insert({ deal_id: d.id, amount: amt, method: pay.method, reference: pay.reference?.trim() || null, received_at: new Date(`${pay.date}T12:00:00`).toISOString() });
    if (e) return toast(e.message, "bad");
    setPay(null);
    load();
  };
  const voidPayment = async (p) => {
    if (!(await confirm({ title: `Void ${money(p.amount)} payment?`, danger: true, confirmLabel: "Void" }))) return;
    await supabase.from("payments").update({ voided_at: new Date().toISOString() }).eq("id", p.id);
    load();
  };

  const uploadDoc = async (file, kind) => {
    if (!file) return;
    try {
      const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
      const path = await uploadDocument(file, `deals/${d.id}`, ext, file.type || "application/pdf");
      await supabase.from("documents").insert({ entity_type: "deal", entity_id: d.id, kind, path, file_name: file.name, mime_type: file.type, size_bytes: file.size });
      toast("Uploaded");
      load();
    } catch (e) {
      toast(e.message, "bad");
    }
  };

  const setAddon = (i, patch) => setD({ ...d, addons: d.addons.map((a, k) => (k === i ? { ...a, ...patch } : a)) });

  return (
    <>
      <div className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/deals" className="mb-2 inline-flex text-[13px] text-a-muted hover:text-a-text">← Vehicle sales</Link>
          <h1 className="flex items-center gap-3 font-display text-2xl font-semibold">
            Deal #{d.number}
            <Badge tone={d.status === "final" ? "good" : d.status === "void" ? "neutral" : "warn"} dot>{d.status === "final" ? "Sold" : d.status}</Badge>
          </h1>
          <p className="text-sm text-a-muted">{vname(vehicle)} · VIN {vehicle?.vin || "—"} · Stock {vehicle?.stock_number || "—"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={Printer} onClick={() => window.print()}>Buyer's order</Button>
          {d.status === "draft" && <Button icon={Save} loading={saving} onClick={() => save()}>Save</Button>}
          {d.status === "draft" && <Button variant="primary" icon={CheckCircle2} loading={saving} onClick={() => save("final")}>Finalize sale</Button>}
          {d.status === "final" && <Button variant="danger" icon={Ban} onClick={voidDeal}>Void</Button>}
        </div>
      </div>

      <div className="no-print grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card className="space-y-3 p-5">
            <h3 className="text-[15px] font-semibold">Buyer</h3>
            {locked ? <p>{customer ? customerName(customer) : "—"}</p> : (
              <Field label="Customer">{() => <CustomerPicker value={customer} onChange={(cu) => { setCustomer(cu); if (cu?.county && FL_COUNTIES.includes(cu.county)) setD((x) => ({ ...x, buyer_county: cu.county })); }} />}</Field>
            )}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <TextField label="Sale date" type="date" value={d.sale_date} disabled={locked} onChange={set("sale_date")} />
              <TextField as="select" label="Buyer's home county" value={d.buyer_county || ""} disabled={locked || d.out_of_state} onChange={set("buyer_county")} hint="Surtax follows where the buyer lives.">
                <option value="">Choose…</option>
                {FL_COUNTIES.map((x) => <option key={x}>{x}</option>)}
              </TextField>
              <div className="col-span-2 flex flex-col justify-end gap-2 md:col-span-1">
                <Toggle checked={Boolean(d.out_of_state)} disabled={locked} onChange={set("out_of_state")} label="Out-of-state buyer" />
                <Toggle checked={Boolean(d.tax_exempt)} disabled={locked} onChange={set("tax_exempt")} label="Tax-exempt sale" />
              </div>
            </div>
            {d.tax_exempt && <TextField label="Exemption (certificate on file)" value={d.exempt_reason || ""} disabled={locked} onChange={set("exempt_reason")} placeholder="Dealer resale certificate #…" />}
            {d.out_of_state && <p className="text-xs text-a-warn">Out-of-state buyers: Florida collects tax up to the buyer's home-state rate in many cases (GT-800030). Enter the tax to collect as an override below if it differs from 6%.</p>}
          </Card>

          <Card className="space-y-3 p-5">
            <h3 className="text-[15px] font-semibold">Price & fees</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <TextField label="Sale price" inputMode="decimal" value={d.sale_price} disabled={locked} onChange={set("sale_price")} />
              <TextField label="Dealer / doc fee" inputMode="decimal" value={d.doc_fee} disabled={locked} onChange={set("doc_fee")} hint="Taxable in Florida" />
              <TextField label="Title fee" inputMode="decimal" value={d.title_fee} disabled={locked} onChange={set("title_fee")} hint="Pass-through, not taxed" />
              <TextField label="Registration / tag" inputMode="decimal" value={d.registration_fee} disabled={locked} onChange={set("registration_fee")} />
              <TextField label="Other gov't fees" inputMode="decimal" value={d.other_passthrough} disabled={locked} onChange={set("other_passthrough")} />
              <TextField label="Tax override" inputMode="decimal" value={d.tax_override} disabled={locked} onChange={set("tax_override")} placeholder="auto" hint="Leave blank to calculate" />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[12.5px] font-medium text-a-muted">
                Add-ons (service contract, GAP, etc.)
                {!locked && <Button size="xs" variant="ghost" icon={Plus} onClick={() => setD({ ...d, addons: [...(d.addons || []), { name: "", price: "", cost: "", taxable: true }] })}>Add</Button>}
              </div>
              {(d.addons || []).map((a, i) => (
                <div key={i} className="mb-2 grid grid-cols-[1fr_100px_100px_auto_auto] items-center gap-2">
                  <Input placeholder="Name" value={a.name} disabled={locked} onChange={(e) => setAddon(i, { name: e.target.value })} />
                  <Input placeholder="Price" inputMode="decimal" value={a.price} disabled={locked} onChange={(e) => setAddon(i, { price: e.target.value })} />
                  <Input placeholder="Your cost" inputMode="decimal" value={a.cost} disabled={locked} onChange={(e) => setAddon(i, { cost: e.target.value })} />
                  <label className="flex items-center gap-1 text-xs text-a-muted"><input type="checkbox" className="a-check" disabled={locked} checked={a.taxable !== false} onChange={(e) => setAddon(i, { taxable: e.target.checked })} />Taxable</label>
                  {!locked && <IconButton size="sm" icon={Trash2} label="Remove" onClick={() => setD({ ...d, addons: d.addons.filter((_, k) => k !== i) })} />}
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <h3 className="text-[15px] font-semibold">Trade-in</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <TextField className="col-span-2" label="Vehicle" value={d.trade_description || ""} disabled={locked} onChange={set("trade_description")} placeholder="2012 Honda Civic, 140k mi" />
              <TextField label="VIN" value={d.trade_vin || ""} disabled={locked} onChange={set("trade_vin")} />
              <TextField label="Trade allowance" inputMode="decimal" value={d.trade_allowance} disabled={locked} onChange={set("trade_allowance")} hint="Reduces the taxable amount" />
              <TextField label="Payoff owed (we pay it)" inputMode="decimal" value={d.trade_payoff} disabled={locked} onChange={set("trade_payoff")} />
              <TextField as="select" label="Add trade to inventory as" value={d.trade_vehicle_id || ""} disabled={locked} onChange={set("trade_vehicle_id")} hint="List it under Cars for sale first, then link it">
                <option value="">Not linked</option>
                {stock.map((v) => <option key={v.id} value={v.id}>{vname(v)} {v.stock_number || v.vin || ""}</option>)}
              </TextField>
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <h3 className="text-[15px] font-semibold">Financing & payments</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <TextField label="Down payment" inputMode="decimal" value={d.down_payment} disabled={locked} onChange={set("down_payment")} />
              <TextField label="Outside lender" value={d.lender_name || ""} disabled={locked} onChange={set("lender_name")} placeholder="Bank / credit union" />
              <TextField label="Amount financed" inputMode="decimal" value={d.lender_amount} disabled={locked} onChange={set("lender_amount")} />
            </div>
            <div className="rounded-lg border border-a-line">
              {payments.map((p) => (
                <div key={p.id} className={cx("flex items-center justify-between border-b border-a-line/60 px-3 py-2 text-sm last:border-0", p.voided_at && "line-through opacity-50")}>
                  <span>{fmtDate(p.received_at)} · {p.method}{p.reference ? ` · ${p.reference}` : ""}</span>
                  <span className="flex items-center gap-2 tnum">{money(p.amount)}{!p.voided_at && <IconButton size="sm" icon={Ban} label="Void payment" onClick={() => voidPayment(p)} />}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-a-muted">Received {money(paid)} · balance {money(r2((d.status === "final" ? Number(d.total_due) : c.due) - paid))}</span>
                {d.status !== "void" && <Button size="xs" icon={DollarSign} onClick={() => setPay({ amount: String(r2((d.status === "final" ? Number(d.total_due) : c.due) - paid)), method: "check", date: isoDay(), reference: "" })}>Record payment</Button>}
              </div>
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <h3 className="text-[15px] font-semibold">Signed documents</h3>
            <ul className="space-y-1 text-sm">
              {docs.map((x) => (
                <li key={x.id}><button className="flex items-center gap-1.5 text-a-accent" onClick={async () => window.open(await signedUrl(x.path), "_blank")}><FileText className="h-4 w-4" />{x.kind ? `${x.kind}: ` : ""}{x.file_name}</button></li>
              ))}
              {!docs.length && <li className="text-a-faint">Upload the signed title, buyer's order, odometer statement…</li>}
            </ul>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-a-line px-3 py-1.5 text-sm hover:bg-a-hover">
              <Upload className="h-4 w-4" /> Upload
              <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => uploadDoc(e.target.files?.[0], "Signed")} />
            </label>
          </Card>
          <TextField as="textarea" rows={2} label="Notes" value={d.notes || ""} disabled={locked} onChange={set("notes")} />
        </div>

        {/* Summary */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5">
            <h3 className="mb-3 text-[15px] font-semibold">Deal summary</h3>
            <dl className="space-y-1.5 text-sm">
              {[
                ["Sale price", n0(d.sale_price)], ["Dealer fee", n0(d.doc_fee)], ["Add-ons", c.addon], ["Trade allowance", -n0(d.trade_allowance)],
                ["Taxable amount", c.taxable, true],
                [`FL sales tax ${(c.state * 100).toFixed(0)}%`, c.stateTax], [`${d.out_of_state ? "Surtax" : `${d.buyer_county || "County"} surtax ${(c.sur * 100).toFixed(1)}%`} (first $5,000)`, c.surtax],
                ["Title / tag (pass-through)", c.pass], ["Trade payoff", n0(d.trade_payoff)],
              ].map(([l, v, muted]) => (
                <div key={l} className={cx("flex justify-between", muted && "text-a-muted")}><dt>{l}</dt><dd className="tnum">{money(v)}</dd></div>
              ))}
              <div className="flex justify-between border-t border-a-line pt-2 text-base font-semibold"><dt>Total due from buyer</dt><dd className="tnum">{money(c.due)}</dd></div>
              <div className="flex justify-between text-a-muted"><dt>Less down payment</dt><dd className="tnum">{money(-n0(d.down_payment))}</dd></div>
              <div className="flex justify-between text-a-muted"><dt>Less financed</dt><dd className="tnum">{money(-n0(d.lender_amount))}</dd></div>
              <div className="flex justify-between font-medium"><dt>Balance at delivery</dt><dd className="tnum">{money(c.due - n0(d.down_payment) - n0(d.lender_amount))}</dd></div>
            </dl>
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 text-[15px] font-semibold">For you only</h3>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt>Tax collected → set aside for DR-15</dt><dd className="tnum font-medium text-a-violet">{money(c.total)}</dd></div>
              <div className="flex justify-between"><dt>Cost basis</dt><dd className="tnum">{money(costBasis)}</dd></div>
              <div className="flex justify-between"><dt>Add-on cost</dt><dd className="tnum">{money(c.addonCost)}</dd></div>
              <div className={cx("flex justify-between border-t border-a-line pt-2 text-base font-semibold", profit < 0 ? "text-a-bad" : "text-a-good")}><dt>Gross profit</dt><dd className="tnum">{money(profit)}</dd></div>
            </dl>
            <Link href={`/admin/inventory/${d.vehicle_id}`} className="mt-3 block text-xs text-a-accent">Edit car costs →</Link>
          </Card>
        </div>
      </div>

      {/* ---------------- printable buyer's order / bill of sale ---------------- */}
      <div className="print-only hidden print:block">
        <BuyersOrder d={d} c={c} vehicle={vehicle} customer={customer} shop={shop} books={books} />
      </div>

      <Modal open={Boolean(pay)} onClose={() => setPay(null)} title="Record payment" footer={<><Button onClick={() => setPay(null)}>Cancel</Button><Button variant="primary" onClick={recordPayment}>Save</Button></>}>
        {pay && (
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Amount" inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
            <TextField label="Date" type="date" value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} />
            <TextField as="select" label="Method" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
              <option value="check">Check</option><option value="cash">Cash</option><option value="card">Card</option><option value="ach">Bank transfer</option><option value="financing">Lender payout</option><option value="zelle">Zelle</option><option value="cashapp">Cash App</option><option value="other">Other</option>
            </TextField>
            <TextField label="Reference" value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} />
          </div>
        )}
      </Modal>
    </>
  );
}

function BuyersOrder({ d, c, vehicle, customer, shop, books }) {
  const row = (l, v) => <tr><td style={{ padding: "3px 0" }}>{l}</td><td style={{ textAlign: "right" }}>{money(v)}</td></tr>;
  return (
    <div style={{ color: "#000", fontSize: 12, fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #000", paddingBottom: 8 }}>
        <div><div style={{ fontSize: 18, fontWeight: 700 }}>{shop.name}</div><div>{shop.address}</div><div>{shop.phone}</div>{books.dealer_license && <div>FL Dealer License {books.dealer_license}</div>}</div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 18, fontWeight: 700 }}>BUYER'S ORDER / BILL OF SALE</div><div>Deal #{d.number}</div><div>Date {fmtDate(d.sale_date)}</div></div>
      </div>
      <table style={{ width: "100%", marginTop: 12 }}><tbody><tr>
        <td style={{ verticalAlign: "top", width: "50%" }}><b>Buyer</b><div>{customer ? customerName(customer) : ""}</div><div>{customer?.address_street}</div><div>{[customer?.address_city, customer?.address_state, customer?.address_zip].filter(Boolean).join(", ")}</div><div>{customer?.phone}</div><div>County: {d.out_of_state ? "Out of state" : d.buyer_county}</div></td>
        <td style={{ verticalAlign: "top" }}><b>Vehicle</b><div>{[vehicle?.year, vehicle?.make, vehicle?.model, vehicle?.trim].filter(Boolean).join(" ")}</div><div>VIN {vehicle?.vin}</div><div>Odometer {vehicle?.mileage?.toLocaleString?.()} mi · Color {vehicle?.exterior_color}</div><div>Stock {vehicle?.stock_number}</div><div>Title: {vehicle?.title_status || "Clean"}</div></td>
      </tr></tbody></table>
      <table style={{ width: "60%", marginLeft: "auto", marginTop: 12, borderCollapse: "collapse" }}><tbody>
        {row("Cash price of vehicle", n0(d.sale_price))}
        {n0(d.doc_fee) > 0 && row("Dealer fee", n0(d.doc_fee))}
        {(d.addons || []).map((a, i) => <tr key={i}><td>{a.name}</td><td style={{ textAlign: "right" }}>{money(n0(a.price))}</td></tr>)}
        {n0(d.trade_allowance) > 0 && row(`Trade-in allowance${d.trade_description ? ` (${d.trade_description})` : ""}`, -n0(d.trade_allowance))}
        {row("Florida sales tax", c.stateTax)}
        {row("Discretionary surtax", c.surtax)}
        {n0(d.title_fee) > 0 && row("Title fee", n0(d.title_fee))}
        {n0(d.registration_fee) > 0 && row("Registration / tag", n0(d.registration_fee))}
        {n0(d.other_passthrough) > 0 && row("Other government fees", n0(d.other_passthrough))}
        {n0(d.trade_payoff) > 0 && row("Payoff of trade-in lien", n0(d.trade_payoff))}
        <tr><td style={{ borderTop: "1px solid #000", fontWeight: 700, paddingTop: 4 }}>TOTAL</td><td style={{ borderTop: "1px solid #000", textAlign: "right", fontWeight: 700 }}>{money(c.due)}</td></tr>
        {row("Down payment", -n0(d.down_payment))}
        {n0(d.lender_amount) > 0 && row(`Financed by ${d.lender_name || "lender"}`, -n0(d.lender_amount))}
        <tr><td style={{ fontWeight: 700 }}>Balance due at delivery</td><td style={{ textAlign: "right", fontWeight: 700 }}>{money(c.due - n0(d.down_payment) - n0(d.lender_amount))}</td></tr>
      </tbody></table>
      <p style={{ marginTop: 16, fontSize: 10.5 }}>
        This vehicle is sold AS IS unless a written warranty is provided; see the Buyers Guide posted on the vehicle, which is part of this contract.
        The buyer acknowledges receipt of the Buyers Guide and the odometer disclosure statement. Dealer fee: this charge represents costs and profit to the dealer for items such as inspecting, cleaning and adjusting vehicles and preparing documents related to the sale.
      </p>
      <table style={{ width: "100%", marginTop: 40 }}><tbody><tr>
        <td style={{ width: "45%", borderTop: "1px solid #000", paddingTop: 4 }}>Buyer signature / date</td><td />
        <td style={{ width: "45%", borderTop: "1px solid #000", paddingTop: 4 }}>Dealer signature / date</td>
      </tr></tbody></table>
    </div>
  );
}
