// frontend/src/components/admin/KpiBoard.js — the money KPIs on the dashboard.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Landmark, TrendingUp, Gauge, Handshake, Wallet, Percent, Target, CarFront, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { money0, money, date as fmtDate, isoDay } from "@/lib/format";
import { r2, balanceOf, periodFor, dr15Dates, daysUntil, estimateIncomeTax, rateOn } from "@/lib/books";
import { Card, CardHeader, Stat, Skeleton, cx } from "./ui";
import { useAdmin } from "./AdminContext";
import { useRates } from "./booksKit";

const COLORS = ["rgb(var(--a-accent))", "rgb(var(--a-violet))", "rgb(var(--a-good))", "rgb(var(--a-warn))", "rgb(var(--a-info))", "rgb(var(--a-bad))"];
const tooltipStyle = { background: "rgb(var(--a-raised))", border: "1px solid rgb(var(--a-line))", borderRadius: 10, color: "rgb(var(--a-text))", fontSize: 13 };

function pl(rows) {
  const s = (t, sub) => rows.filter((a) => a.type === t && (!sub || a.subtype === sub)).reduce((x, a) => x + balanceOf(a), 0);
  const income = s("income");
  return { income: r2(income), repair: r2(s("income", "repair")), vehicle: r2(s("income", "vehicle")), net: r2(income - s("cogs") - s("expense")), cogs: r2(s("cogs")) };
}

export default function KpiBoard() {
  const { books } = useAdmin();
  const rates = useRates();
  const [k, setK] = useState(null);

  useEffect(() => {
    if (!rates) return;
    (async () => {
      const today = isoDay();
      const y = today.slice(0, 4);
      const ms = `${today.slice(0, 7)}-01`;
      const per = periodFor(new Date(), books.dr15_frequency || "monthly");
      const in14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
      const [glDay, glMtd, glYtd, glAll, dr, ros, items, time, est, stock, costs, deals, bills, trips] = await Promise.all([
        supabase.rpc("gl_summary", { p_from: today, p_to: today }),
        supabase.rpc("gl_summary", { p_from: ms, p_to: today }),
        supabase.rpc("gl_summary", { p_from: `${y}-01-01`, p_to: today }),
        supabase.rpc("gl_summary", { p_from: "2000-01-01", p_to: today }),
        supabase.rpc("dr15_worksheet", { p_start: per.start, p_end: per.end }),
        supabase.from("repair_orders").select("id, total, tax_amount, govt_fees_total").eq("doc_type", "invoice").is("stock_vehicle_id", null).is("voided_at", null).gte("invoiced_at", `${ms}T00:00:00`),
        supabase.from("repair_order_items").select("kind, quantity, unit_price, unit_cost, ro:repair_orders!inner(invoiced_at, voided_at, stock_vehicle_id)").eq("approved", true).gte("ro.invoiced_at", `${ms}T00:00:00`).is("ro.voided_at", null).is("ro.stock_vehicle_id", null),
        supabase.from("time_entries").select("clock_in, clock_out, break_minutes").gte("clock_in", `${ms}T00:00:00`).not("clock_out", "is", null),
        supabase.from("repair_orders").select("sent_at, approved_at").not("sent_at", "is", null).gte("sent_at", `${y}-01-01`),
        supabase.from("vehicles").select("id, created_at").neq("status", "sold"),
        supabase.from("vehicle_costs").select("vehicle_id, amount"),
        supabase.from("vehicle_deals").select("gross_profit").eq("status", "final").gte("sale_date", `${y}-01-01`),
        supabase.from("expenses").select("total").eq("status", "unpaid").is("voided_at", null).lte("due_date", in14),
        supabase.from("mileage_trips").select("trip_date, miles, round_trip").gte("trip_date", `${y}-01-01`),
      ]);
      const day = pl(glDay.data || []);
      const mtd = pl(glMtd.data || []);
      const ytd = pl(glYtd.data || []);
      const all = glAll.data || [];
      const cash = r2(all.filter((a) => ["1000", "1010", "1020", "1050"].includes(a.code)).reduce((s, a) => s + balanceOf(a), 0));
      const ar = r2(balanceOf(all.find((a) => a.code === "1100") || { type: "asset", debit: 0, credit: 0 }));

      const it = items.data || [];
      const sum = (kind, f) => it.filter((i) => i.kind === kind).reduce((s, i) => s + Number(i.quantity) * Number(i[f]), 0);
      const partsRev = sum("part", "unit_price");
      const partsCost = sum("part", "unit_cost");
      const laborRev = sum("labor", "unit_price");
      const billed = it.filter((i) => i.kind === "labor").reduce((s, i) => s + Number(i.quantity), 0);
      const wages = (glMtd.data || []).filter((a) => ["6090", "6080"].includes(a.code)).reduce((s, a) => s + balanceOf(a), 0);
      const actual = (time.data || []).reduce((s, t) => s + (new Date(t.clock_out) - new Date(t.clock_in)) / 3600000 - (t.break_minutes || 0) / 60, 0);
      const inv = ros.data || [];
      const repairNet = inv.reduce((s, r) => s + Number(r.total) - Number(r.tax_amount) - Number(r.govt_fees_total), 0);
      const sent = est.data || [];
      const costOf = (id) => (costs.data || []).filter((c) => c.vehicle_id === id).reduce((s, c) => s + Number(c.amount), 0);
      const st = stock.data || [];
      const miles = (trips.data || []).reduce((s, t) => s + Number(t.miles) * (t.round_trip ? 2 : 1) * Number(rateOn(rates, "irs_mileage_rate", t.trip_date) ?? 0.725), 0);
      const tax = estimateIncomeTax({ netProfit: ytd.net, mileageDeduction: miles, entityType: books.entity_type, filingStatus: books.filing_status, ownerSalary: Number(books.owner_salary) || 0, rates, year: Number(y) });
      const dl = deals.data || [];
      const billsDue = r2((bills.data || []).reduce((s, b) => s + Number(b.total), 0));

      setK({
        day, mtd, ytd, cash, ar, billsDue,
        salesTax: dr.data?.amount_due_with_fees || 0, taxDates: dr15Dates(per.end),
        incomeTax: tax.total,
        cars: inv.length, aro: inv.length ? repairNet / inv.length : 0,
        partsGp: partsRev ? ((partsRev - partsCost) / partsRev) * 100 : null,
        laborGp: laborRev && wages ? ((laborRev - wages) / laborRev) * 100 : null,
        overallGp: mtd.income ? ((mtd.income - mtd.cogs) / mtd.income) * 100 : null,
        efficiency: actual ? (billed / actual) * 100 : null, billed, actual,
        closeRate: sent.length ? (sent.filter((s) => s.approved_at).length / sent.length) * 100 : null, sentCount: sent.length,
        stockCount: st.length, stockCost: r2(st.reduce((s, v) => s + costOf(v.id), 0)),
        avgDays: st.length ? Math.round(st.reduce((s, v) => s + (Date.now() - new Date(v.created_at)) / 86400000, 0) / st.length) : 0,
        gpPerCar: dl.length ? dl.reduce((s, d) => s + Number(d.gross_profit), 0) / dl.length : null, carsSold: dl.length,
        mix: [{ name: "Repair", value: ytd.repair }, { name: "Vehicle sales", value: ytd.vehicle }].filter((x) => x.value > 0),
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates]);

  if (!k) return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[112px] rounded-xl" />)}</div>;

  const pct = (v) => (v == null ? "—" : `${v.toFixed(0)}%`);
  const left = daysUntil(k.taxDates.lateAfter);
  const short = k.cash < k.billsDue;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue (net of tax)" value={money0(k.mtd.income)} sub={`Today ${money0(k.day.income)} · YTD ${money0(k.ytd.income)}`} icon={TrendingUp} tone="good" href="/admin/reports" />
        <Stat label="Net profit" value={money0(k.mtd.net)} sub={`Month to date · YTD ${money0(k.ytd.net)}`} icon={Wallet} tone={k.mtd.net >= 0 ? "good" : "bad"} href="/admin/reports" />
        <Stat label="Sales tax owed this month" value={money(k.salesTax)} sub={`Due ${fmtDate(k.taxDates.dueOn, { month: "short", day: "numeric" })}, late after ${fmtDate(k.taxDates.lateAfter, { month: "short", day: "numeric" })} (${left}d)`} icon={Landmark} tone="violet" href="/admin/taxes" />
        <Stat label="Est. income tax YTD" value={money0(k.incomeTax)} sub="Federal · estimate" icon={Landmark} tone="warn" href="/admin/taxes?tab=income" />
        <Stat label="Car count · ARO" value={`${k.cars} · ${money0(k.aro)}`} sub="Repair orders closed this month" icon={Gauge} tone="info" href="/admin/reports?tab=sales" />
        <Stat label="Gross profit" value={pct(k.overallGp)} sub={`Parts ${pct(k.partsGp)} · Labor ${pct(k.laborGp)}`} icon={Percent} tone="accent" />
        <Stat label="Labor efficiency" value={pct(k.efficiency)} sub={k.actual ? `${k.billed.toFixed(1)} billed / ${k.actual.toFixed(1)} clocked hrs` : "No clocked hours yet"} icon={Gauge} tone="info" href="/admin/team?tab=time" />
        <Stat label="Estimate close rate" value={pct(k.closeRate)} sub={`${k.sentCount} estimates sent this year`} icon={Target} tone="violet" />
      </div>
      <div className="grid gap-3 lg:grid-cols-4">
        <Stat label="Vehicles in stock" value={k.stockCount} sub={`${money0(k.stockCost)} at cost · avg ${k.avgDays} days`} icon={CarFront} href="/admin/deals" />
        <Stat label="Gross profit per car sold" value={k.gpPerCar == null ? "—" : money0(k.gpPerCar)} sub={`${k.carsSold} sold this year`} icon={Handshake} tone="good" href="/admin/reports?tab=vehicles" />
        <Card className={cx("p-4 lg:col-span-1", short && "border-a-bad/50")}>
          <div className="text-[12.5px] font-medium text-a-muted">Cash vs. bills due in 14 days</div>
          <div className="mt-2 font-display text-[22px] font-semibold tnum">{money0(k.cash)} <span className="text-sm font-normal text-a-faint">vs</span> {money0(k.billsDue)}</div>
          <div className={cx("mt-2 flex items-center gap-1 text-xs", short ? "text-a-bad" : "text-a-faint")}>{short && <AlertTriangle className="h-3.5 w-3.5" />}{short ? "Not enough cash for upcoming bills" : `Owed to you: ${money0(k.ar)}`}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[12.5px] font-medium text-a-muted">Revenue mix (YTD)</div>
          {k.mix.length ? (
            <div className="flex items-center gap-3">
              <div className="h-[72px] w-[72px]"><ResponsiveContainer><PieChart><Pie data={k.mix} dataKey="value" innerRadius={20} outerRadius={34}>{k.mix.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(v) => money0(v)} /></PieChart></ResponsiveContainer></div>
              <div className="space-y-0.5 text-xs">{k.mix.map((m, i) => <div key={m.name} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />{m.name} {money0(m.value)}</div>)}</div>
            </div>
          ) : <div className="mt-2 text-sm text-a-faint">No sales yet</div>}
        </Card>
      </div>
      <p className="text-right text-xs text-a-faint"><Link href="/admin/reports" className="hover:text-a-muted">Full reports →</Link> · Tax figures are estimates — confirm with your CPA.</p>
    </div>
  );
}
