// frontend/src/app/admin/reports/page.js — financial statements & shop reports
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { money, money0, date as fmtDate, customerName, isoDay } from "@/lib/format";
import { r2, balanceOf } from "@/lib/books";
import { Card, CardHeader, PageHeader, Segmented, Table, Th, Td, Select, Input, Badge, SkeletonRows, Stat, cx } from "@/components/admin/ui";
import { ExportButtons, EstimateNote, presetRange, RANGE_PRESETS, ymd } from "@/components/admin/booksKit";

const COLORS = ["rgb(var(--a-accent))", "rgb(var(--a-good))", "rgb(var(--a-violet))", "rgb(var(--a-warn))", "rgb(var(--a-info))", "rgb(var(--a-bad))", "rgb(var(--a-faint))"];
const tooltipStyle = { background: "rgb(var(--a-raised))", border: "1px solid rgb(var(--a-line))", borderRadius: 10, color: "rgb(var(--a-text))", fontSize: 13 };
const TABS = [
  { value: "pnl", label: "Profit & loss" }, { value: "bs", label: "Balance sheet" }, { value: "cash", label: "Cash flow" }, { value: "ar", label: "Owed to you" },
  { value: "ap", label: "You owe" }, { value: "sales", label: "Sales" }, { value: "vehicles", label: "Vehicles" }, { value: "expenses", label: "Expenses" },
];

// Year-to-date style ranges compare with the same dates last year; others with
// the period just before.
function priorRange(from, to) {
  if (from.endsWith("-01-01")) {
    const back = (d) => `${Number(d.slice(0, 4)) - 1}${d.slice(4)}`;
    return { from: back(from), to: back(to).replace(/-02-29$/, "-02-28") };
  }
  const f = new Date(`${from}T12:00:00`);
  const t = new Date(`${to}T12:00:00`);
  const days = Math.round((t - f) / 86400000) + 1;
  const pt = new Date(f.getTime() - 86400000);
  const pf = new Date(pt.getTime() - (days - 1) * 86400000);
  return { from: ymd(pf), to: ymd(pt) };
}

function RangePicker({ range, setRange, custom, setCustom }) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Select value={range} onChange={(e) => setRange(e.target.value)} className="w-40">
        {RANGE_PRESETS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        <option value="custom">Custom…</option>
      </Select>
      {range === "custom" && (
        <>
          <Input type="date" className="w-40" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
          <Input type="date" className="w-40" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
        </>
      )}
    </div>
  );
}

function ReportsInner() {
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") || "pnl");
  const [range, setRange] = useState("ytd");
  const [custom, setCustom] = useState(() => presetRange("this_month"));
  const { from, to } = range === "custom" ? custom : presetRange(range);
  const picker = <RangePicker range={range} setRange={setRange} custom={custom} setCustom={setCustom} />;
  return (
    <>
      <PageHeader title="Reports" description={`${fmtDate(from)} – ${fmtDate(to)}. Sales tax you collect is never counted as income — it's the state's money.`} />
      <div className="no-print mb-5 overflow-x-auto"><Segmented value={tab} onChange={setTab} options={TABS} /></div>
      {tab === "pnl" && <ProfitLoss from={from} to={to} picker={picker} />}
      {tab === "bs" && <BalanceSheet />}
      {tab === "cash" && <CashFlow from={from} to={to} picker={picker} />}
      {tab === "ar" && <Receivables />}
      {tab === "ap" && <Payables />}
      {tab === "sales" && <Sales from={from} to={to} picker={picker} />}
      {tab === "vehicles" && <Vehicles from={from} to={to} picker={picker} />}
      {tab === "expenses" && <Expenses from={from} to={to} picker={picker} />}
    </>
  );
}

// ================================================================ P&L
function pnlFromGl(rows) {
  const pick = (types) => rows.filter((a) => types.includes(a.type)).map((a) => ({ ...a, amount: r2(balanceOf(a)) }));
  const income = pick(["income"]);
  const cogs = pick(["cogs"]);
  const expense = pick(["expense"]);
  const sum = (l) => r2(l.reduce((s, a) => s + a.amount, 0));
  const repair = sum(income.filter((a) => a.subtype === "repair"));
  const vehicle = sum(income.filter((a) => a.subtype === "vehicle"));
  const ti = sum(income);
  const tc = sum(cogs);
  const te = sum(expense);
  return { income, cogs, expense, repair, vehicle, ti, tc, te, gross: r2(ti - tc), net: r2(ti - tc - te) };
}

function ProfitLoss({ from, to, picker }) {
  const [basis, setBasis] = useState("accrual");
  const [compare, setCompare] = useState(true);
  const [cur, setCur] = useState(null);
  const [prev, setPrev] = useState(null);
  const [months, setMonths] = useState(null);
  const pr = priorRange(from, to);

  useEffect(() => {
    setCur(null);
    const fetcher = (f, t) => basis === "accrual"
      ? supabase.rpc("gl_summary", { p_from: f, p_to: t }).then(({ data }) => data || [])
      // pnl_cash amounts are credit − debit; turn them back into debit/credit columns.
      : supabase.rpc("pnl_cash", { p_from: f, p_to: t }).then(({ data }) => (data || []).map((a) => ({ ...a, debit: Math.max(-a.amount, 0), credit: Math.max(a.amount, 0) })));
    Promise.all([fetcher(from, to), fetcher(pr.from, pr.to)]).then(([a, b]) => { setCur(pnlFromGl(a)); setPrev(pnlFromGl(b)); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, basis]);

  useEffect(() => {
    const now = new Date();
    const start = ymd(new Date(now.getFullYear(), now.getMonth() - 11, 1));
    supabase.from("journal_entries").select("entry_date, lines:journal_lines(debit, credit, account:accounts(type, subtype))").gte("entry_date", start).limit(5000).then(({ data }) => {
      const m = {};
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        m[ymd(d).slice(0, 7)] = { label: d.toLocaleDateString("en-US", { month: "short" }), repair: 0, vehicle: 0, profit: 0 };
      }
      (data || []).forEach((e) => {
        const k = e.entry_date.slice(0, 7);
        if (!m[k]) return;
        e.lines.forEach((l) => {
          const v = Number(l.credit) - Number(l.debit);
          if (l.account.type === "income") { m[k][l.account.subtype === "vehicle" ? "vehicle" : "repair"] += v; m[k].profit += v; }
          if (l.account.type === "cogs" || l.account.type === "expense") m[k].profit += v;
        });
      });
      setMonths(Object.values(m).map((x) => ({ ...x, repair: r2(x.repair), vehicle: r2(x.vehicle), profit: r2(x.profit) })));
    });
  }, []);

  if (!cur) return <Card><SkeletonRows /></Card>;
  const pv = (list, id) => list.find((a) => a.account_id === id)?.amount || 0;
  const section = (title, list, prevList, total, prevTotal) => (
    <>
      <tr className="bg-a-raised/60"><Td className="font-semibold" colSpan={compare ? 4 : 2}>{title}</Td></tr>
      {list.filter((a) => a.amount || pv(prevList, a.account_id)).map((a) => (
        <tr key={a.account_id}><Td className="pl-8">{a.name}</Td><Td align="right">{money(a.amount)}</Td>{compare && <><Td align="right" className="text-a-muted">{money(pv(prevList, a.account_id))}</Td><Td align="right"><Delta a={a.amount} b={pv(prevList, a.account_id)} /></Td></>}</tr>
      ))}
      <tr><Td className="font-medium">Total {title.toLowerCase()}</Td><Td align="right" className="font-medium">{money(total)}</Td>{compare && <><Td align="right" className="text-a-muted">{money(prevTotal)}</Td><Td align="right"><Delta a={total} b={prevTotal} /></Td></>}</tr>
    </>
  );
  const rows = [...cur.income, ...cur.cogs, ...cur.expense].filter((a) => a.amount).map((a) => ({ type: a.type, account: `${a.code} ${a.name}`, schedule_c: a.schedule_c, amount: a.amount }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Repair income" value={money0(cur.repair)} tone="accent" />
        <Stat label="Vehicle sales" value={money0(cur.vehicle)} tone="violet" />
        <Stat label="Gross profit" value={money0(cur.gross)} sub={cur.ti ? `${Math.round((cur.gross / cur.ti) * 100)}% margin` : ""} tone="info" />
        <Stat label="Net profit" value={money0(cur.net)} sub={`Prior period ${money0(prev?.net || 0)}`} tone={cur.net >= 0 ? "good" : "bad"} />
      </div>
      <Card className="print-sheet">
        <CardHeader title="Profit & loss" description={`${basis === "accrual" ? "Accrual" : "Cash"} basis · compared with ${fmtDate(pr.from)} – ${fmtDate(pr.to)}`}
          actions={<div className="no-print flex flex-wrap items-center gap-2">{picker}
            <Segmented value={basis} onChange={setBasis} options={[{ value: "accrual", label: "Accrual" }, { value: "cash", label: "Cash" }]} />
            <label className="flex items-center gap-1.5 text-xs text-a-muted"><input type="checkbox" className="a-check" checked={compare} onChange={(e) => setCompare(e.target.checked)} />Compare</label>
            <ExportButtons filename={`profit-and-loss-${from}-to-${to}`} rows={rows} columns={[{ label: "Type", value: "type" }, { label: "Account", value: "account" }, { label: "Schedule C", value: "schedule_c" }, { label: "Amount", value: "amount" }]} />
          </div>} />
        <Table>
          {compare && <thead><tr><Th /><Th align="right">This period</Th><Th align="right">Prior</Th><Th align="right">Change</Th></tr></thead>}
          <tbody>
            {section("Income", cur.income, prev?.income || [], cur.ti, prev?.ti || 0)}
            {section("Cost of sales", cur.cogs, prev?.cogs || [], cur.tc, prev?.tc || 0)}
            <tr className="bg-a-accent/5"><Td className="font-semibold">Gross profit</Td><Td align="right" className="font-semibold">{money(cur.gross)}</Td>{compare && <><Td align="right">{money(prev?.gross)}</Td><Td align="right"><Delta a={cur.gross} b={prev?.gross} /></Td></>}</tr>
            {section("Expenses", cur.expense, prev?.expense || [], cur.te, prev?.te || 0)}
            <tr className="bg-a-accent/10"><Td className="text-base font-semibold">Net profit</Td><Td align="right" className={cx("text-base font-semibold", cur.net < 0 && "text-a-bad")}>{money(cur.net)}</Td>{compare && <><Td align="right">{money(prev?.net)}</Td><Td align="right"><Delta a={cur.net} b={prev?.net} /></Td></>}</tr>
          </tbody>
        </Table>
        <div className="px-5 py-3"><EstimateNote>{basis === "cash" ? "Cash basis: income counted when paid (in proportion to each invoice), expenses when paid. " : ""}Confirm with your CPA before filing.</EstimateNote></div>
      </Card>
      <Card className="no-print">
        <CardHeader title="Revenue and profit, last 12 months" />
        <div className="h-72 px-2 pb-4">
          {months && (
            <ResponsiveContainer>
              <BarChart data={months}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--a-line))" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "rgb(var(--a-faint))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => money0(v)} tick={{ fill: "rgb(var(--a-faint))", fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} cursor={{ fill: "rgb(var(--a-hover) / .5)" }} />
                <Legend />
                <Bar dataKey="repair" name="Repair" stackId="r" fill={COLORS[0]} />
                <Bar dataKey="vehicle" name="Vehicle sales" stackId="r" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Net profit" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}

function Delta({ a, b }) {
  if (!b) return <span className="text-a-faint">—</span>;
  const pct = ((a - b) / Math.abs(b)) * 100;
  return <span className={cx("text-xs tnum", pct >= 0 ? "text-a-good" : "text-a-bad")}>{pct >= 0 ? "+" : ""}{pct.toFixed(0)}%</span>;
}

// ================================================================ balance sheet
function BalanceSheet() {
  const [asOf, setAsOf] = useState(isoDay());
  const [rows, setRows] = useState(null);
  useEffect(() => {
    setRows(null);
    supabase.rpc("gl_summary", { p_from: "2000-01-01", p_to: asOf }).then(({ data }) => setRows(data || []));
  }, [asOf]);
  if (!rows) return <Card><SkeletonRows /></Card>;
  const of = (t) => rows.filter((a) => a.type === t).map((a) => ({ ...a, amount: r2(balanceOf(a)) })).filter((a) => a.amount);
  const sum = (l) => r2(l.reduce((s, a) => s + a.amount, 0));
  const assets = of("asset");
  const liab = of("liability");
  const equity = of("equity");
  const earnings = r2(sum(of("income")) - sum(of("cogs")) - sum(of("expense")));
  const ta = sum(assets);
  const tl = sum(liab);
  const te = r2(sum(equity) + earnings);
  const ok = Math.abs(ta - (tl + te)) < 0.005;
  const block = (title, list, total, extra) => (
    <>
      <tr className="bg-a-raised/60"><Td className="font-semibold" colSpan={2}>{title}</Td></tr>
      {list.map((a) => <tr key={a.account_id}><Td className="pl-8">{a.name}</Td><Td align="right">{money(a.amount)}</Td></tr>)}
      {extra}
      <tr><Td className="font-medium">Total {title.toLowerCase()}</Td><Td align="right" className="font-medium">{money(total)}</Td></tr>
    </>
  );
  const csv = [...assets.map((a) => ({ section: "Assets", account: a.name, amount: a.amount })), ...liab.map((a) => ({ section: "Liabilities", account: a.name, amount: a.amount })), ...equity.map((a) => ({ section: "Equity", account: a.name, amount: a.amount })), { section: "Equity", account: "Profit to date (not yet closed)", amount: earnings }];
  return (
    <Card className="print-sheet">
      <CardHeader title={`Balance sheet as of ${fmtDate(asOf)}`} description={ok ? "Balanced: assets = liabilities + owner's equity" : "Out of balance — re-post the books (Books → Ledger)"} icon={ok ? CheckCircle2 : AlertTriangle}
        actions={<div className="no-print flex gap-2"><Input type="date" className="h-8 w-40" value={asOf} onChange={(e) => setAsOf(e.target.value)} /><ExportButtons filename={`balance-sheet-${asOf}`} rows={csv} columns={[{ label: "Section", value: "section" }, { label: "Account", value: "account" }, { label: "Amount", value: "amount" }]} /></div>} />
      <Table><tbody>
        {block("Assets", assets, ta)}
        {block("Liabilities", liab, tl)}
        {block("Owner's equity", equity, te, <tr><Td className="pl-8">Profit to date (not yet closed)</Td><Td align="right">{money(earnings)}</Td></tr>)}
        <tr className="bg-a-accent/10"><Td className="font-semibold">Liabilities + equity</Td><Td align="right" className="font-semibold">{money(tl + te)}</Td></tr>
      </tbody></Table>
      <div className="px-5 py-3"><EstimateNote>Vehicle inventory is at cost. Equipment shows less accumulated depreciation (Year-end → Depreciation).</EstimateNote></div>
    </Card>
  );
}

// ================================================================ cash flow
function CashFlow({ from, to, picker }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    setData(null);
    supabase.from("journal_entries").select("source_type, lines:journal_lines(debit, credit, account:accounts(code, subtype))").gte("entry_date", from).lte("entry_date", to).limit(5000).then(({ data: es }) => {
      const cashCodes = new Set(["1000", "1010", "1020", "1050"]);
      const groups = {};
      const name = (t) => ({ payment: "Collected from customers", payment_void: "Collected from customers", bill_payment: "Paid vendors & expenses", bill_payment_void: "Paid vendors & expenses", payroll: "Payroll", payroll_void: "Payroll", sales_tax_payment: "Sales tax paid (DR-15)", estimated_tax: "Owner draws & personal tax", vehicle_cost: "Vehicles bought", manual: "Adjustments / owner & loans", deposit: "Transfers to bank", bill: "Paid at purchase" }[t] || (t.startsWith("depreciation") ? null : "Other"));
      (es || []).forEach((e) => {
        const n = name(e.source_type);
        if (!n) return;
        const v = e.lines.filter((l) => cashCodes.has(l.account.code)).reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
        if (v) groups[n] = r2((groups[n] || 0) + v);
      });
      delete groups["Transfers to bank"];
      setData(Object.entries(groups).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v));
    });
  }, [from, to]);
  if (!data) return <Card><SkeletonRows /></Card>;
  const net = r2(data.reduce((s, x) => s + x.v, 0));
  return (
    <Card className="print-sheet">
      <CardHeader title="Cash flow summary" description="Money in and out of cash, checking, savings and undeposited funds" actions={<div className="no-print flex gap-2">{picker}<ExportButtons filename={`cash-flow-${from}-to-${to}`} rows={data} columns={[{ label: "Category", value: "k" }, { label: "Amount", value: "v" }]} /></div>} />
      <Table><tbody>
        {data.map((x) => <tr key={x.k}><Td>{x.k}</Td><Td align="right" className={x.v < 0 ? "text-a-bad" : "text-a-good"}>{money(x.v)}</Td></tr>)}
        <tr className="bg-a-accent/10"><Td className="font-semibold">Net change in cash</Td><Td align="right" className="font-semibold">{money(net)}</Td></tr>
      </tbody></Table>
    </Card>
  );
}

// ================================================================ AR / AP aging
const BUCKETS = ["Current", "1–30", "31–60", "61–90", "90+"];
const bucketOf = (due) => {
  if (!due) return 0;
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(`${due}T00:00:00`)) / 86400000);
  return days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4;
};

function AgingTable({ rows, title, csvName, linkFn }) {
  const totals = BUCKETS.map((_, i) => r2(rows.filter((r) => r.bucket === i).reduce((s, r) => s + r.balance, 0)));
  return (
    <Card className="print-sheet">
      <CardHeader title={title} description={`${rows.length} open · ${money(totals.reduce((s, x) => s + x, 0))}`} actions={<ExportButtons filename={csvName} rows={rows} columns={[
        { label: "Name", value: "name" }, { label: "Document", value: "doc" }, { label: "Date", value: "date" }, { label: "Due", value: "due" }, { label: "Bucket", value: (r) => BUCKETS[r.bucket] }, { label: "Balance", value: "balance" },
      ]} />} />
      <div className="grid grid-cols-5 gap-2 px-5 pb-4">
        {BUCKETS.map((b, i) => <div key={b} className={cx("rounded-lg border border-a-line p-3", i >= 3 && totals[i] && "border-a-bad/40")}><div className="text-xs text-a-faint">{b} days</div><div className="font-semibold tnum">{money0(totals[i])}</div></div>)}
      </div>
      <Table>
        <thead><tr><Th>Name</Th><Th>Document</Th><Th>Due</Th><Th>Age</Th><Th align="right">Balance</Th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}><Td className="font-medium">{r.name}</Td><Td>{linkFn ? <Link className="text-a-accent" href={linkFn(r)}>{r.doc}</Link> : r.doc}</Td><Td className="text-a-muted">{r.due ? fmtDate(r.due) : "—"}</Td><Td><Badge tone={["good", "info", "warn", "bad", "bad"][r.bucket]}>{BUCKETS[r.bucket]}</Badge></Td><Td align="right">{money(r.balance)}</Td></tr>
          ))}
          {!rows.length && <tr><Td colSpan={5} className="text-a-faint">Nothing open</Td></tr>}
        </tbody>
      </Table>
    </Card>
  );
}

function Receivables() {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    Promise.all([
      supabase.from("repair_orders").select("id, number, invoice_number, invoiced_at, due_date, balance_due, customer_id, customer:customers(first_name,last_name,company)").not("invoiced_at", "is", null).is("voided_at", null).eq("doc_type", "invoice").gt("balance_due", 0).order("due_date"),
      supabase.from("vehicle_deals").select("id, number, sale_date, total_due, amount_paid, customer:customers(first_name,last_name,company)").eq("status", "final"),
    ]).then(([a, b]) => {
      const inv = (a.data || []).map((r) => ({ key: r.id, id: r.id, customer_id: r.customer_id, kind: "ro", name: customerName(r.customer), doc: `Invoice #${r.invoice_number}`, date: r.invoiced_at?.slice(0, 10), due: r.due_date, balance: Number(r.balance_due), bucket: bucketOf(r.due_date) }));
      const deals = (b.data || []).filter((d) => Number(d.total_due) - Number(d.amount_paid) > 0.004).map((d) => ({ key: d.id, id: d.id, kind: "deal", name: customerName(d.customer), doc: `Deal #${d.number}`, date: d.sale_date, due: d.sale_date, balance: r2(Number(d.total_due) - Number(d.amount_paid)), bucket: bucketOf(d.sale_date) }));
      setRows([...inv, ...deals].sort((x, y) => y.bucket - x.bucket || y.balance - x.balance));
    });
  }, []);
  if (!rows) return <Card><SkeletonRows /></Card>;
  return <AgingTable rows={rows} title="Unpaid invoices (accounts receivable aging)" csvName="ar-aging" linkFn={(r) => (r.kind === "deal" ? `/admin/deals/${r.id}` : `/admin/repair-orders/${r.id}`)} />;
}

function Payables() {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    supabase.from("expenses").select("id, vendor_name, ref_number, expense_date, due_date, total, vendor:vendors(name)").eq("status", "unpaid").is("voided_at", null).order("due_date").then(({ data }) =>
      setRows((data || []).map((e) => ({ key: e.id, name: e.vendor_name || e.vendor?.name || "—", doc: e.ref_number ? `Bill #${e.ref_number}` : "Bill", date: e.expense_date, due: e.due_date, balance: Number(e.total), bucket: bucketOf(e.due_date) }))));
  }, []);
  if (!rows) return <Card><SkeletonRows /></Card>;
  return <AgingTable rows={rows} title="Unpaid bills (accounts payable aging)" csvName="ap-aging" linkFn={() => "/admin/expenses?tab=bills"} />;
}

// ================================================================ sales
function Sales({ from, to, picker }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    setD(null);
    const f = `${from}T00:00:00`;
    const t = `${to}T23:59:59`;
    (async () => {
      const [ros, pays, time] = await Promise.all([
        supabase.from("repair_orders").select("id, number, total, tax_amount, govt_fees_total, labor_total, parts_total, cost_total, technician, customer_id, doc_type, customer:customers(first_name,last_name,company)")
          .not("invoiced_at", "is", null).is("voided_at", null).is("stock_vehicle_id", null).gte("invoiced_at", f).lte("invoiced_at", t),
        supabase.from("payments").select("amount, method").is("voided_at", null).neq("method", "credit_memo").gte("received_at", f).lte("received_at", t),
        supabase.from("time_entries").select("repair_order_id, clock_in, clock_out, break_minutes, employee:employees(first_name,last_name)").not("repair_order_id", "is", null).gte("clock_in", f).lte("clock_in", t),
      ]);
      const ids = (ros.data || []).map((r) => r.id);
      let items = [];
      for (let i = 0; i < ids.length; i += 200) {
        const { data } = await supabase.from("repair_order_items").select("repair_order_id, kind, description, item_name, quantity, unit_price, unit_cost, technician, actual_hours").in("repair_order_id", ids.slice(i, i + 200)).eq("approved", true);
        items = items.concat(data || []);
      }
      setD({ ros: ros.data || [], pays: pays.data || [], time: time.data || [], items });
    })();
  }, [from, to]);

  const r = useMemo(() => {
    if (!d) return null;
    const s = (x) => (x.doc_type === "credit_memo" ? -1 : 1);
    const invoices = d.ros.filter((x) => x.doc_type === "invoice");
    const net = (x) => s(x) * (Number(x.total) - Number(x.tax_amount) - Number(x.govt_fees_total));
    const byCust = {};
    d.ros.forEach((x) => {
      const k = x.customer_id || "none";
      byCust[k] = byCust[k] || { name: customerName(x.customer) || "Walk-in", jobs: 0, sales: 0 };
      byCust[k].jobs += s(x) > 0 ? 1 : 0;
      byCust[k].sales += net(x);
    });
    const roTech = Object.fromEntries(d.ros.map((x) => [x.id, x.technician || "Unassigned"]));
    const techs = {};
    d.items.filter((i) => i.kind === "labor").forEach((i) => {
      const t = i.technician || roTech[i.repair_order_id];
      techs[t] = techs[t] || { name: t, billed: 0, actual: 0, labor: 0 };
      techs[t].billed += Number(i.quantity);
      techs[t].labor += Number(i.quantity) * Number(i.unit_price);
      if (i.actual_hours) techs[t].actual += Number(i.actual_hours);
    });
    d.time.forEach((t) => {
      const name = [t.employee?.first_name, t.employee?.last_name].filter(Boolean).join(" ");
      if (!t.clock_out || !name) return;
      techs[name] = techs[name] || { name, billed: 0, actual: 0, labor: 0 };
      techs[name].clocked = (techs[name].clocked || 0) + (new Date(t.clock_out) - new Date(t.clock_in)) / 3600000 - (t.break_minutes || 0) / 60;
    });
    const svc = {};
    d.items.filter((i) => i.kind === "labor").forEach((i) => {
      const k = (i.item_name || i.description).trim().toLowerCase();
      svc[k] = svc[k] || { name: (i.item_name || i.description).trim(), count: 0, revenue: 0 };
      svc[k].count += 1;
      svc[k].revenue += Number(i.quantity) * Number(i.unit_price);
    });
    const parts = d.items.filter((i) => i.kind === "part");
    const partsRev = parts.reduce((a, i) => a + Number(i.quantity) * Number(i.unit_price), 0);
    const partsCost = parts.reduce((a, i) => a + Number(i.quantity) * Number(i.unit_cost), 0);
    const methods = {};
    d.pays.forEach((p) => (methods[p.method] = (methods[p.method] || 0) + Number(p.amount)));
    const sales = r2(d.ros.reduce((a, x) => a + net(x), 0));
    return {
      sales, cars: invoices.length, aro: invoices.length ? sales / invoices.length : 0,
      partsGp: partsRev ? ((partsRev - partsCost) / partsRev) * 100 : 0,
      customers: Object.values(byCust).sort((a, b) => b.sales - a.sales),
      techs: Object.values(techs).sort((a, b) => b.labor - a.labor),
      services: Object.values(svc).sort((a, b) => b.revenue - a.revenue).slice(0, 15),
      methods: Object.entries(methods).map(([name, value]) => ({ name, value: r2(value) })),
    };
  }, [d]);

  if (!r) return <Card><SkeletonRows /></Card>;
  return (
    <div className="space-y-5">
      <div className="no-print flex justify-end">{picker}</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Repair sales (net of tax)" value={money0(r.sales)} />
        <Stat label="Car count" value={r.cars} tone="info" />
        <Stat label="Average repair order" value={money0(r.aro)} tone="violet" />
        <Stat label="Parts gross profit" value={`${r.partsGp.toFixed(0)}%`} tone="good" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="By technician" description="Billed hours vs. actual hours (from line items or the time clock)" actions={<ExportButtons filename="sales-by-tech" rows={r.techs} columns={[{ label: "Tech", value: "name" }, { label: "Billed hrs", value: "billed" }, { label: "Actual hrs", value: (t) => r2(t.actual || t.clocked || 0) }, { label: "Labor $", value: "labor" }]} print={false} />} />
          <Table>
            <thead><tr><Th>Tech</Th><Th align="right">Billed</Th><Th align="right">Actual</Th><Th align="right">Efficiency</Th><Th align="right">Labor</Th></tr></thead>
            <tbody>{r.techs.map((t) => { const act = t.actual || t.clocked || 0; return (
              <tr key={t.name}><Td>{t.name}</Td><Td align="right">{t.billed.toFixed(1)}</Td><Td align="right">{act ? act.toFixed(1) : "—"}</Td><Td align="right">{act ? <span className={t.billed / act >= 1 ? "text-a-good" : "text-a-warn"}>{Math.round((t.billed / act) * 100)}%</span> : "—"}</Td><Td align="right">{money(t.labor)}</Td></tr>
            ); })}</tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Payments by method" />
          <div className="h-60">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={r.methods} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>{r.methods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Top customers" actions={<ExportButtons filename="sales-by-customer" rows={r.customers} columns={[{ label: "Customer", value: "name" }, { label: "Jobs", value: "jobs" }, { label: "Sales", value: (c) => r2(c.sales) }]} print={false} />} />
          <Table><tbody>{r.customers.slice(0, 15).map((c) => <tr key={c.name}><Td>{c.name}</Td><Td align="right" className="text-a-muted">{c.jobs} jobs</Td><Td align="right">{money(c.sales)}</Td></tr>)}</tbody></Table>
        </Card>
        <Card>
          <CardHeader title="Top services" actions={<ExportButtons filename="sales-by-service" rows={r.services} columns={[{ label: "Service", value: "name" }, { label: "Count", value: "count" }, { label: "Labor $", value: (s) => r2(s.revenue) }]} print={false} />} />
          <Table><tbody>{r.services.map((s) => <tr key={s.name}><Td>{s.name}</Td><Td align="right" className="text-a-muted">×{s.count}</Td><Td align="right">{money(s.revenue)}</Td></tr>)}</tbody></Table>
        </Card>
      </div>
    </div>
  );
}

// ================================================================ vehicles
function Vehicles({ from, to, picker }) {
  const [deals, setDeals] = useState(null);
  useEffect(() => {
    supabase.from("vehicle_deals").select("number, sale_date, sale_price, doc_fee, cost_basis, addon_cost, gross_profit, total_tax, vehicle:vehicles!vehicle_deals_vehicle_id_fkey(year,make,model,vin,created_at)")
      .eq("status", "final").gte("sale_date", from).lte("sale_date", to).order("sale_date").then(({ data }) => setDeals(data || []));
  }, [from, to]);
  if (!deals) return <Card><SkeletonRows /></Card>;
  const rows = deals.map((d) => ({ ...d, name: [d.vehicle?.year, d.vehicle?.make, d.vehicle?.model].filter(Boolean).join(" "), days: d.vehicle?.created_at ? Math.round((new Date(d.sale_date) - new Date(d.vehicle.created_at)) / 86400000) : null }));
  const gp = rows.reduce((s, d) => s + Number(d.gross_profit), 0);
  return (
    <Card className="print-sheet">
      <CardHeader title="Vehicle sale profit" description={`${rows.length} sold · gross profit ${money(gp)} · ${money(rows.length ? gp / rows.length : 0)} per car`}
        actions={<div className="no-print flex gap-2">{picker}<ExportButtons filename={`vehicle-profit-${from}-to-${to}`} rows={rows} columns={[{ label: "Deal", value: "number" }, { label: "Date", value: "sale_date" }, { label: "Vehicle", value: "name" }, { label: "VIN", value: (d) => d.vehicle?.vin }, { label: "Price", value: "sale_price" }, { label: "Dealer fee", value: "doc_fee" }, { label: "Cost basis", value: "cost_basis" }, { label: "Gross profit", value: "gross_profit" }, { label: "Days in stock", value: "days" }]} /></div>} />
      <Table>
        <thead><tr><Th>Deal</Th><Th>Vehicle</Th><Th align="right">Price</Th><Th align="right">Cost</Th><Th align="right">Profit</Th><Th align="right">Days</Th></tr></thead>
        <tbody>
          {rows.map((d) => <tr key={d.number}><Td>#{d.number}<div className="text-xs text-a-faint">{fmtDate(d.sale_date)}</div></Td><Td>{d.name}</Td><Td align="right">{money(d.sale_price)}</Td><Td align="right">{money(Number(d.cost_basis) + Number(d.addon_cost))}</Td><Td align="right" className={Number(d.gross_profit) < 0 ? "text-a-bad" : "text-a-good"}>{money(d.gross_profit)}</Td><Td align="right">{d.days ?? "—"}</Td></tr>)}
          {!rows.length && <tr><Td colSpan={6} className="text-a-faint">No sales in this range</Td></tr>}
        </tbody>
      </Table>
    </Card>
  );
}

// ================================================================ expenses by category
function Expenses({ from, to, picker }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    supabase.rpc("gl_summary", { p_from: from, p_to: to }).then(({ data }) => setRows((data || []).filter((a) => ["expense", "cogs"].includes(a.type)).map((a) => ({ ...a, amount: r2(balanceOf(a)) })).filter((a) => a.amount).sort((a, b) => b.amount - a.amount)));
  }, [from, to]);
  if (!rows) return <Card><SkeletonRows /></Card>;
  const total = rows.reduce((s, a) => s + a.amount, 0);
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <Card className="print-sheet">
        <CardHeader title="Expenses by category" description={`Total ${money(total)} · mapped to Schedule C lines`} actions={<div className="no-print flex gap-2">{picker}<ExportButtons filename={`expenses-by-category-${from}-to-${to}`} rows={rows} columns={[{ label: "Account", value: "name" }, { label: "Schedule C", value: "schedule_c" }, { label: "Amount", value: "amount" }]} /></div>} />
        <Table><tbody>{rows.map((a) => <tr key={a.account_id}><Td>{a.name}<span className="ml-2 text-xs text-a-faint">{a.schedule_c}</span></Td><Td align="right" className="text-a-muted">{total ? Math.round((a.amount / total) * 100) : 0}%</Td><Td align="right">{money(a.amount)}</Td></tr>)}</tbody></Table>
      </Card>
      <Card className="no-print">
        <CardHeader title="Breakdown" />
        <div className="h-72">
          <ResponsiveContainer>
            <PieChart><Pie data={rows.slice(0, 7)} dataKey="amount" nameKey="name" innerRadius={60} outerRadius={100}>{rows.slice(0, 7).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} /></PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsInner />
    </Suspense>
  );
}
