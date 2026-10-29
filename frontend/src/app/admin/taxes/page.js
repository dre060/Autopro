// frontend/src/app/admin/taxes/page.js — Florida sales tax (DR-15) + federal income tax estimate
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Landmark, CalendarClock, Lock, CheckCircle2, ShieldCheck, PiggyBank, ChevronDown, ChevronRight, Plus, ExternalLink, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { money, money0, date as fmtDate, isoDay } from "@/lib/format";
import {
  r2, n0, periodFor, previousPeriod, periodLabel, dr15Dates, daysUntil, estimateIncomeTax, estimatedTaxDueDates, rateOn, balanceOf, CPA_NOTE,
} from "@/lib/books";
import {
  Button, Card, CardHeader, PageHeader, Segmented, Table, Th, Td, Modal, TextField, Stat, Badge, Toggle, SkeletonRows, ErrorBanner, cx, useUI,
} from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/AdminContext";
import { useRates, ExportButtons, EstimateNote, useAccounts } from "@/components/admin/booksKit";

const ENTITY = { single_member: "Single-member LLC (Schedule C)", partnership: "Partnership (K-1 per member)", s_corp: "S-corporation (salary + distributions)" };

function TaxesInner() {
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") || "sales");
  return (
    <>
      <PageHeader
        title="Florida & income taxes"
        description="What you owe, when it's due, and the numbers to copy into Florida's e-file site."
        actions={<Segmented value={tab} onChange={setTab} options={[{ value: "sales", label: "FL sales tax (DR-15)" }, { value: "income", label: "IRS estimate" }]} />}
      />
      {tab === "sales" ? <SalesTax /> : <IncomeTax />}
    </>
  );
}

// ======================================================================= DR-15
function SalesTax() {
  const { books, isAdmin } = useAdmin();
  const { byCode } = useAccounts();
  const { toast } = useUI();
  const freq = books.dr15_frequency || "monthly";
  const current = periodFor(new Date(), freq);
  const previous = previousPeriod(current, freq);

  const [periods, setPeriods] = useState(null);
  const [sel, setSel] = useState(previous);
  const [ws, setWs] = useState(null);
  const [now, setNow] = useState(null);
  const [prev, setPrev] = useState(null);
  const [setAside, setSetAside] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filing, setFiling] = useState(null);
  const [error, setError] = useState(null);

  const loadPeriods = () => supabase.from("tax_periods").select("*").order("period_start", { ascending: false }).then(({ data }) => setPeriods(data || []));

  useEffect(() => {
    loadPeriods();
    Promise.all([
      supabase.rpc("dr15_worksheet", { p_start: current.start, p_end: current.end }),
      supabase.rpc("dr15_worksheet", { p_start: previous.start, p_end: previous.end }),
      supabase.rpc("gl_summary", { p_from: "2000-01-01", p_to: "2100-12-31" }),
    ]).then(([a, b, gl]) => {
      if (a.error) setError(a.error);
      setNow(a.data);
      setPrev(b.data);
      const liab = (gl.data || []).filter((x) => ["2100", "2110", "2120"].includes(x.code)).reduce((s, x) => s + balanceOf(x), 0);
      setSetAside(r2(liab));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setWs(null);
    setDetail(null);
    setShowDetail(false);
    supabase.rpc("dr15_worksheet", { p_start: sel.start, p_end: sel.end }).then(({ data, error: e }) => {
      if (e) setError(e);
      setWs(data);
    });
  }, [sel.start, sel.end]);

  const loadDetail = async () => {
    setShowDetail((s) => !s);
    if (detail) return;
    const startTs = `${sel.start}T00:00:00-05:00`;
    const endTs = `${sel.end}T23:59:59-04:00`;
    const [inv, deals, exps] = await Promise.all([
      supabase.from("repair_orders").select("id, number, invoice_number, doc_type, invoiced_at, voided_at, total, tax_amount, tax_surtax, taxable_total, exempt_total, govt_fees_total, tax_exempt, customer:customers(first_name,last_name,company)")
        .not("invoiced_at", "is", null).is("stock_vehicle_id", null).or(`and(invoiced_at.gte.${startTs},invoiced_at.lte.${endTs}),and(voided_at.gte.${startTs},voided_at.lte.${endTs})`).order("invoiced_at"),
      supabase.from("vehicle_deals").select("id, number, sale_date, status, sale_price, taxable_amount, total_tax, surtax, buyer_county, customer:customers(first_name,last_name,company)")
        .not("finalized_at", "is", null).gte("sale_date", sel.start).lte("sale_date", sel.end).order("sale_date"),
      supabase.from("expenses").select("id, vendor_name, expense_date, use_tax_base, use_tax_amount").is("voided_at", null).neq("use_tax_amount", 0).gte("expense_date", sel.start).lte("expense_date", sel.end),
    ]);
    setDetail({ inv: inv.data || [], deals: deals.data || [], exps: exps.data || [] });
  };

  const filed = (p) => (periods || []).find((x) => x.period_start === p.start && x.status === "filed");
  const selFiled = filed(sel);
  const dates = dr15Dates(sel.end);
  const prevDates = dr15Dates(previous.end);
  const prevFiled = filed(previous);
  const daysLeft = daysUntil(prevDates.lateAfter);

  const periodOptions = useMemo(() => {
    const out = [];
    let p = current;
    for (let i = 0; i < 18; i++) {
      out.push(p);
      p = previousPeriod(p, freq);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freq]);

  const lines = ws ? [
    { n: "1", label: "Gross sales", value: ws.gross_sales, help: "All repair invoices and vehicle sales, before tax. Credit memos subtract. Title/tag fees not included." },
    { n: "2", label: "Exempt sales", value: ws.exempt_sales, help: "Labor-only jobs with customer parts, towing, resale/exempt customers, trade-in credit." },
    { n: "3", label: "Taxable amount", value: ws.taxable_sales },
    { n: "4", label: "Tax collected", value: ws.tax_collected },
    { n: "B", label: "Taxable purchases (use tax)", value: ws.taxable_purchases, sub: `Use tax due ${money(ws.use_tax)}` },
    { n: "C", label: "Total tax due", value: ws.total_tax_due, strong: true },
    { n: "D", label: "Less collection allowance", value: -ws.collection_allowance, help: "Only if you e-file and pay on time: 2.5% of the first $1,200 of tax, max $30." },
    { n: "E", label: "Net tax due", value: ws.net_tax_due, strong: true },
    { n: "", label: "Discretionary surtax collected (included above)", value: ws.surtax_collected, muted: true },
    { n: "", label: "Sales over $5,000 exempt from surtax", value: ws.surtax_exempt_over_cap, muted: true },
    { n: "", label: `Solid waste fees — ${ws.tire_count} new tires, ${ws.battery_count} batteries`, value: ws.govt_fees },
    { n: "", label: "Total to pay (tax + fees)", value: ws.amount_due_with_fees, strong: true },
  ] : [];

  const csvRows = lines.map((l) => ({ line: l.n, label: l.label, amount: r2(l.value) }));

  const openFiling = () => setFiling({
    filed_on: isoDay(), confirmation_number: "", on_time: daysUntil(dates.lateAfter) >= 0,
    amount_paid: String(r2(ws.amount_due_with_fees)), paid_from: "1010", notes: "",
  });
  const saveFiling = async () => {
    const allowance = filing.on_time ? ws.collection_allowance : 0;
    const payload = {
      period_start: sel.start, period_end: sel.end, status: "filed", filed_on: filing.filed_on,
      confirmation_number: filing.confirmation_number.trim() || null, amount_paid: r2(n0(filing.amount_paid)),
      allowance_taken: allowance, paid_from_account_id: byCode(filing.paid_from)?.id, worksheet: ws, notes: filing.notes.trim() || null,
    };
    const existing = (periods || []).find((x) => x.period_start === sel.start);
    const res = existing ? await supabase.from("tax_periods").update(payload).eq("id", existing.id) : await supabase.from("tax_periods").insert(payload);
    if (res.error) return toast(res.error.message, "bad");
    toast(`${periodLabel(sel, freq)} marked filed & paid — locked`);
    setFiling(null);
    loadPeriods();
  };

  return (
    <div className="space-y-5">
      <ErrorBanner error={error} />
      {/* Headline card */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className={cx("p-5 lg:col-span-2", !prevFiled && daysLeft <= 5 && "border-a-bad/50")}>
          {prev === null ? <SkeletonRows rows={2} /> : prevFiled ? (
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-a-good/10 text-a-good"><CheckCircle2 className="h-6 w-6" /></span>
              <div>
                <div className="text-sm text-a-muted">{periodLabel(previous, freq)}</div>
                <div className="font-display text-2xl font-semibold">Filed & paid {money(prevFiled.amount_paid)}</div>
                <div className="mt-1 text-sm text-a-muted">Confirmation {prevFiled.confirmation_number || "—"} · {fmtDate(prevFiled.filed_on)}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <span className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", daysLeft <= 5 ? "bg-a-bad/10 text-a-bad" : "bg-a-accent/10 text-a-accent")}><Landmark className="h-6 w-6" /></span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-a-muted">Sales tax owed for {periodLabel(previous, freq)}</div>
                <div className="font-display text-3xl font-semibold tnum">{money(prev.amount_due_with_fees)}</div>
                <div className="mt-1 text-sm">
                  Due {fmtDate(prevDates.dueOn)}, <strong className={daysLeft <= 5 ? "text-a-bad" : ""}>late after {fmtDate(prevDates.lateAfter, { weekday: "short", month: "short", day: "numeric" })}</strong>
                  {" · "}{daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : daysLeft === 0 ? "due today" : `${-daysLeft} days late`}
                </div>
                {Number(prev.total_tax_due) === 0 && <div className="mt-2 text-sm text-a-warn">A zero return is still required — file it so the state doesn't send a notice.</div>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="primary" onClick={() => setSel(previous)}>Open worksheet</Button>
                  <Button size="sm" icon={ExternalLink} href="https://floridarevenue.com/taxes/eservices/Pages/default.aspx" target="_blank">FL e-file site</Button>
                </div>
              </div>
            </div>
          )}
        </Card>
        <div className="grid gap-4">
          <Stat label={`${periodLabel(current, freq)} so far`} value={money(now?.amount_due_with_fees || 0)} sub={`Due ${fmtDate(dr15Dates(current.end).dueOn)}`} icon={CalendarClock} tone="info" />
          <Stat label="Tax set-aside (collected, not yet paid)" value={setAside === null ? "…" : money(setAside)} sub="Keep this in the bank — it's the state's money" icon={PiggyBank} tone="violet" />
        </div>
      </div>

      {/* Worksheet */}
      <Card className="print-sheet">
        <CardHeader
          title={`DR-15 worksheet · ${periodLabel(sel, freq)}`}
          description={selFiled ? `Filed ${fmtDate(selFiled.filed_on)} · locked` : `Due ${fmtDate(dates.dueOn)}, late after ${fmtDate(dates.lateAfter)}`}
          icon={selFiled ? Lock : Landmark}
          actions={
            <div className="no-print flex flex-wrap items-center gap-2">
              <select className="a-input h-8 w-auto text-[13px]" value={sel.start} onChange={(e) => setSel(periodOptions.find((p) => p.start === e.target.value))}>
                {periodOptions.map((p) => <option key={p.start} value={p.start}>{periodLabel(p, freq)}{filed(p) ? " ✓" : ""}</option>)}
              </select>
              <ExportButtons filename={`DR-15-${sel.start}`} rows={csvRows} columns={[{ label: "Line", value: "line" }, { label: "Description", value: "label" }, { label: "Amount", value: "amount" }]} />
              {isAdmin && ws && !selFiled && sel.end < isoDay() && <Button size="sm" variant="primary" icon={Lock} onClick={openFiling}>Mark filed & paid</Button>}
            </div>
          }
        />
        {!ws ? <SkeletonRows rows={8} /> : (
          <>
            <Table>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className={cx(l.strong && "bg-a-raised/60")}>
                    <Td className="w-10 text-a-faint">{l.n}</Td>
                    <Td className={cx(l.muted && "text-a-muted", l.strong && "font-semibold")}>
                      {l.label}
                      {l.help && <div className="text-xs font-normal text-a-faint">{l.help}</div>}
                      {l.sub && <div className="text-xs font-normal text-a-violet">{l.sub}</div>}
                    </Td>
                    <Td align="right" className={cx(l.strong && "font-semibold", l.muted && "text-a-muted")}>{money(l.value)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <button className="no-print flex items-center gap-1 text-sm text-a-accent" onClick={loadDetail}>
                {showDetail ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                See the {ws.invoices} invoice{ws.invoices === 1 ? "" : "s"}, {ws.deals} vehicle sale{ws.deals === 1 ? "" : "s"} and {ws.use_tax_purchases} use-tax purchase{ws.use_tax_purchases === 1 ? "" : "s"} behind these numbers
              </button>
              <EstimateNote />
            </div>
            {showDetail && detail && <TraceTables detail={detail} />}
          </>
        )}
      </Card>

      {/* History */}
      <Card>
        <CardHeader title="Filing history" icon={ShieldCheck} description="Filed periods are locked. Later corrections post to the current month." />
        {periods === null ? <SkeletonRows rows={3} /> : periods.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-a-muted">No returns recorded yet.</p>
        ) : (
          <Table>
            <thead><tr><Th>Period</Th><Th>Filed</Th><Th>Confirmation</Th><Th align="right">Tax</Th><Th align="right">Allowance</Th><Th align="right">Paid</Th></tr></thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id} className="cursor-pointer hover:bg-a-hover/50" onClick={() => setSel({ start: p.period_start, end: p.period_end })}>
                  <Td className="font-medium">{periodLabel({ start: p.period_start, end: p.period_end }, freq)}</Td>
                  <Td>{p.status === "filed" ? fmtDate(p.filed_on) : <Badge tone="warn">Open</Badge>}</Td>
                  <Td className="font-mono text-xs">{p.confirmation_number || "—"}</Td>
                  <Td align="right">{money(p.worksheet?.total_tax_due)}</Td>
                  <Td align="right">{money(p.allowance_taken)}</Td>
                  <Td align="right" className="font-medium">{money(p.amount_paid)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={Boolean(filing)}
        onClose={() => setFiling(null)}
        title={`File ${periodLabel(sel, freq)}`}
        description="After you file on Florida's site, record it here. This locks the period."
        footer={<><Button onClick={() => setFiling(null)}>Cancel</Button><Button variant="primary" icon={Lock} onClick={saveFiling}>Mark filed & lock</Button></>}
      >
        {filing && ws && (
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Filed on" type="date" value={filing.filed_on} onChange={(e) => setFiling({ ...filing, filed_on: e.target.value })} />
            <TextField label="Confirmation #" value={filing.confirmation_number} onChange={(e) => setFiling({ ...filing, confirmation_number: e.target.value })} />
            <div className="col-span-2">
              <Toggle checked={filing.on_time} onChange={(v) => setFiling({ ...filing, on_time: v, amount_paid: String(r2(v ? ws.amount_due_with_fees : ws.amount_due_late)) })}
                label={`Filed electronically and on time (take the ${money(ws.collection_allowance)} collection allowance)`} />
            </div>
            <TextField label="Amount paid" inputMode="decimal" value={filing.amount_paid} onChange={(e) => setFiling({ ...filing, amount_paid: e.target.value })} hint="Any difference (penalty/interest) is recorded as an expense." />
            <TextField as="select" label="Paid from" value={filing.paid_from} onChange={(e) => setFiling({ ...filing, paid_from: e.target.value })}>
              <option value="1010">Business checking</option><option value="1000">Cash</option><option value="2300">Credit card</option>
            </TextField>
            <TextField className="col-span-2" as="textarea" rows={2} label="Notes" value={filing.notes} onChange={(e) => setFiling({ ...filing, notes: e.target.value })} />
          </div>
        )}
      </Modal>
    </div>
  );
}

function TraceTables({ detail }) {
  const name = (c) => (c ? c.company || [c.first_name, c.last_name].filter(Boolean).join(" ") : "—");
  return (
    <div className="space-y-4 border-t border-a-line px-1 pb-4 pt-2">
      <Table>
        <thead><tr><Th>Invoice</Th><Th>Customer</Th><Th>Date</Th><Th align="right">Taxable</Th><Th align="right">Exempt</Th><Th align="right">Tax</Th></tr></thead>
        <tbody>
          {detail.inv.length === 0 && <tr><Td colSpan={6} className="text-a-faint">No invoices</Td></tr>}
          {detail.inv.map((r) => {
            const s = r.doc_type === "credit_memo" ? -1 : 1;
            return (
              <tr key={r.id}>
                <Td><Link className="text-a-accent" href={`/admin/repair-orders/${r.id}`}>{r.doc_type === "credit_memo" ? "Credit memo" : "Invoice"} #{r.invoice_number || r.number}</Link>{r.voided_at && <Badge className="ml-1">Void</Badge>}{r.tax_exempt && <Badge tone="info" className="ml-1">Exempt</Badge>}</Td>
                <Td>{name(r.customer)}</Td>
                <Td className="text-a-muted">{fmtDate(r.invoiced_at)}</Td>
                <Td align="right">{money(s * r.taxable_total)}</Td>
                <Td align="right">{money(s * r.exempt_total)}</Td>
                <Td align="right">{money(s * r.tax_amount)}</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      {detail.deals.length > 0 && (
        <Table>
          <thead><tr><Th>Vehicle sale</Th><Th>Buyer</Th><Th>County</Th><Th align="right">Taxable</Th><Th align="right">Surtax</Th><Th align="right">Tax</Th></tr></thead>
          <tbody>
            {detail.deals.map((d) => (
              <tr key={d.id}>
                <Td><Link className="text-a-accent" href={`/admin/deals/${d.id}`}>Deal #{d.number}</Link>{d.status === "void" && <Badge className="ml-1">Void</Badge>}</Td>
                <Td>{name(d.customer)}</Td><Td>{d.buyer_county || "—"}</Td>
                <Td align="right">{money(d.taxable_amount)}</Td><Td align="right">{money(d.surtax)}</Td><Td align="right">{money(d.total_tax)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {detail.exps.length > 0 && (
        <Table>
          <thead><tr><Th>Use-tax purchase</Th><Th>Date</Th><Th align="right">Purchase</Th><Th align="right">Use tax</Th></tr></thead>
          <tbody>
            {detail.exps.map((e) => (
              <tr key={e.id}><Td>{e.vendor_name || "—"}</Td><Td>{fmtDate(e.expense_date)}</Td><Td align="right">{money(e.use_tax_base)}</Td><Td align="right">{money(e.use_tax_amount)}</Td></tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

// ======================================================================= IRS
function IncomeTax() {
  const { books, isAdmin } = useAdmin();
  const { toast } = useUI();
  const rates = useRates();
  const year = new Date().getFullYear();
  const [gl, setGl] = useState(null);
  const [trips, setTrips] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pay, setPay] = useState(null);

  const load = () => Promise.all([
    supabase.rpc("gl_summary", { p_from: `${year}-01-01`, p_to: `${year}-12-31` }),
    supabase.from("mileage_trips").select("trip_date, miles, round_trip").gte("trip_date", `${year}-01-01`).lte("trip_date", `${year}-12-31`),
    supabase.from("estimated_tax_payments").select("*").eq("tax_year", year).order("paid_on"),
  ]).then(([g, t, p]) => {
    setGl(g.data || []);
    setTrips(t.data || []);
    setPayments(p.data || []);
  });
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!gl || !rates) return <Card><SkeletonRows rows={6} /></Card>;

  const sum = (types) => gl.filter((a) => types.includes(a.type)).reduce((s, a) => s + balanceOf(a), 0);
  const income = sum(["income"]);
  const cogs = sum(["cogs"]);
  const expenses = sum(["expense"]);
  const net = r2(income - cogs - expenses);
  const depreciation = balanceOf(gl.find((a) => a.code === "6140") || { type: "expense", debit: 0, credit: 0 });
  const vehicleExpense = balanceOf(gl.find((a) => a.code === "6110") || { type: "expense", debit: 0, credit: 0 });
  const miles = trips.reduce((s, t) => s + Number(t.miles) * (t.round_trip ? 2 : 1), 0);
  const mileageDeduction = r2(trips.reduce((s, t) => s + Number(t.miles) * (t.round_trip ? 2 : 1) * Number(rateOn(rates, "irs_mileage_rate", t.trip_date) || 0.725), 0));

  const dayOfYear = Math.max(1, Math.round((Date.now() - new Date(year, 0, 1)) / 86400000));
  const factor = Math.min(365 / dayOfYear, 12);
  const ytd = estimateIncomeTax({ netProfit: net, mileageDeduction, entityType: books.entity_type, filingStatus: books.filing_status, ownerSalary: n0(books.owner_salary), rates, year });
  const projected = estimateIncomeTax({ netProfit: net * factor, mileageDeduction: mileageDeduction * factor, entityType: books.entity_type, filingStatus: books.filing_status, ownerSalary: n0(books.owner_salary), rates, year });
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const dueDates = estimatedTaxDueDates(year);
  const perQuarter = r2(Math.max(projected.total, 0) / 4);

  const savePay = async () => {
    const { error } = await supabase.from("estimated_tax_payments").insert({
      tax_year: year, quarter: Number(pay.quarter), paid_on: pay.paid_on, amount: r2(n0(pay.amount)), method: pay.method || null, confirmation: pay.confirmation || null,
    });
    if (error) return toast(error.message, "bad");
    toast("Payment recorded");
    setPay(null);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-a-line bg-a-raised px-4 py-2.5 text-[13px] text-a-muted">
        Taxed as <strong className="text-a-text">{ENTITY[books.entity_type] || books.entity_type}</strong>, filing {books.filing_status === "mfj" ? "married filing jointly" : "single"}.
        Florida has no personal income tax. <Link href="/admin/settings#books" className="text-a-accent">Change in Settings</Link>
      </div>
      {books.entity_type === "partnership" && (
        <p className="flex items-start gap-1.5 text-sm text-a-warn"><AlertTriangle className="mt-0.5 h-4 w-4" />Partnership: the figures below are for the whole business. Each member owes tax on their K-1 share.</p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Net profit ${year} so far`} value={money0(net)} sub={`Income ${money0(income)} − costs ${money0(cogs + expenses)}`} tone={net >= 0 ? "good" : "bad"} />
        <Stat label="Mileage deduction" value={money0(mileageDeduction)} sub={`${Math.round(miles).toLocaleString()} business miles`} tone="info" href="/admin/mileage" />
        <Stat label="Estimated federal tax so far" value={money0(ytd.total)} sub={`Income tax ${money0(ytd.incomeTax)} + SE ${money0(ytd.se)}`} icon={Landmark} tone="violet" />
        <Stat label={`Projected for all of ${year}`} value={money0(projected.total)} sub={`Paid so far ${money0(paid)}`} tone="warn" />
      </div>
      {vehicleExpense > 0 && mileageDeduction > 0 && (
        <p className="flex items-start gap-1.5 text-sm text-a-warn"><AlertTriangle className="mt-0.5 h-4 w-4" />You have both vehicle expenses ({money0(vehicleExpense)}) and a mileage log. For the same vehicle you generally use one method or the other — ask your CPA.</p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="How the estimate is figured" description="Year to date" />
          <Table>
            <tbody>
              <Row label="Net profit from your books" value={net} />
              <Row label="− Mileage deduction" value={-mileageDeduction} />
              <Row label="Depreciation (already in profit)" value={depreciation} muted />
              <Row label="= Business profit" value={ytd.profit} strong />
              {books.entity_type !== "s_corp" ? (
                <>
                  <Row label="Self-employment tax (15.3% of 92.35%)" value={ytd.se} />
                  <Row label="− Half of SE tax" value={-ytd.halfSe} muted />
                </>
              ) : <Row label="+ Owner salary (through payroll)" value={n0(books.owner_salary)} muted />}
              <Row label="− Standard deduction" value={-ytd.std} muted />
              <Row label="− Qualified business income deduction" value={-ytd.qbi} muted />
              <Row label="= Taxable income" value={ytd.taxable} />
              <Row label="Federal income tax" value={ytd.incomeTax} />
              <Row label="Total estimated (income + SE)" value={ytd.total} strong />
            </tbody>
          </Table>
          <div className="px-5 py-3"><EstimateNote>{CPA_NOTE} Assumes this business is your only income and you take the standard deduction.</EstimateNote></div>
        </Card>

        <Card>
          <CardHeader title="Quarterly estimated payments" description={`Suggested ${money0(perQuarter)} per quarter, based on the full-year projection`}
            actions={isAdmin && <Button size="sm" icon={Plus} onClick={() => setPay({ quarter: String(dueDates.find((d) => daysUntil(d.due) >= -30)?.q || 4), paid_on: isoDay(), amount: String(perQuarter), method: "IRS Direct Pay", confirmation: "" })}>Record payment</Button>} />
          <Table>
            <thead><tr><Th>Quarter</Th><Th>Due</Th><Th align="right">Suggested</Th><Th align="right">Paid</Th></tr></thead>
            <tbody>
              {dueDates.map((d) => {
                const p = payments.filter((x) => x.quarter === d.q).reduce((s, x) => s + Number(x.amount), 0);
                const left = daysUntil(d.due);
                return (
                  <tr key={d.q}>
                    <Td className="font-medium">Q{d.q}</Td>
                    <Td>{fmtDate(d.due)} {p === 0 && left >= 0 && left <= 30 && <Badge tone="warn" className="ml-1">{left}d</Badge>}</Td>
                    <Td align="right">{money(perQuarter)}</Td>
                    <Td align="right">{p ? <span className="text-a-good">{money(p)}</span> : left < 0 ? <span className="text-a-bad">Not recorded</span> : "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <div className="space-y-2 px-5 py-3 text-sm text-a-muted">
            <p>Set aside <strong className="text-a-text">{books.tax_set_aside_pct || 25}%</strong> of every deposit for taxes (change in Settings).</p>
            <EstimateNote>Paying 100% of last year's total tax (110% if your income was over $150k) in four equal payments also avoids the underpayment penalty.</EstimateNote>
          </div>
        </Card>
      </div>

      <Modal open={Boolean(pay)} onClose={() => setPay(null)} title="Record estimated tax payment" footer={<><Button onClick={() => setPay(null)}>Cancel</Button><Button variant="primary" onClick={savePay}>Save</Button></>}>
        {pay && (
          <div className="grid grid-cols-2 gap-3">
            <TextField as="select" label="Quarter" value={pay.quarter} onChange={(e) => setPay({ ...pay, quarter: e.target.value })}>{[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q} {year}</option>)}</TextField>
            <TextField label="Paid on" type="date" value={pay.paid_on} onChange={(e) => setPay({ ...pay, paid_on: e.target.value })} />
            <TextField label="Amount" inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
            <TextField label="How" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} />
            <TextField className="col-span-2" label="Confirmation #" value={pay.confirmation} onChange={(e) => setPay({ ...pay, confirmation: e.target.value })} />
            <p className="col-span-2 text-xs text-a-faint">Recorded as an owner draw from checking (personal tax for a single-member LLC).</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value, strong, muted }) {
  return (
    <tr>
      <Td className={cx(muted && "text-a-muted", strong && "font-semibold")}>{label}</Td>
      <Td align="right" className={cx(muted && "text-a-muted", strong && "font-semibold")}>{money(value)}</Td>
    </tr>
  );
}

export default function TaxesPage() {
  return (
    <Suspense fallback={null}>
      <TaxesInner />
    </Suspense>
  );
}
