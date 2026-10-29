// frontend/src/app/admin/deals/page.js — vehicle sales (dealer side)
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Handshake, Plus, CarFront, TrendingUp, Timer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { money, money0, date as fmtDate, customerName } from "@/lib/format";
import { Button, Card, PageHeader, Segmented, Table, Th, Td, Modal, TextField, Stat, Badge, EmptyState, SkeletonRows, ErrorBanner, cx, useUI } from "@/components/admin/ui";
import { ExportButtons } from "@/components/admin/booksKit";

const STATUS = { draft: { label: "Draft", tone: "warn" }, final: { label: "Sold", tone: "good" }, void: { label: "Void", tone: "neutral" } };
const vname = (v) => (v ? [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") : "—");

function DealsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useUI();
  const [deals, setDeals] = useState(null);
  const [stock, setStock] = useState([]);
  const [costs, setCosts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [pick, setPick] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from("vehicle_deals").select("*, vehicle:vehicles!vehicle_deals_vehicle_id_fkey(year,make,model,trim,vin,stock_number), customer:customers(first_name,last_name,company)").order("sale_date", { ascending: false }),
      supabase.from("vehicles").select("id, year, make, model, trim, vin, stock_number, price, sale_price, status, created_at").neq("status", "sold").order("created_at", { ascending: false }),
      supabase.from("vehicle_costs").select("vehicle_id, amount"),
    ]).then(([d, v, c]) => {
      if (d.error) setError(d.error);
      setDeals(d.data || []);
      setStock(v.data || []);
      setCosts(c.data || []);
      if (params.get("new") === "1") setPick(params.get("vehicle") || v.data?.[0]?.id || "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const year = String(new Date().getFullYear());
  const sold = (deals || []).filter((d) => d.status === "final");
  const soldYtd = sold.filter((d) => d.sale_date.startsWith(year));
  const costOf = (id) => costs.filter((c) => c.vehicle_id === id).reduce((s, c) => s + Number(c.amount), 0);
  const stockCost = stock.reduce((s, v) => s + costOf(v.id), 0);
  const avgDays = stock.length ? Math.round(stock.reduce((s, v) => s + (Date.now() - new Date(v.created_at)) / 86400000, 0) / stock.length) : 0;

  const shown = useMemo(() => (deals || []).filter((d) => filter === "all" || d.status === filter), [deals, filter]);

  const create = async () => {
    if (!pick) return toast("Pick a vehicle", "bad");
    const v = stock.find((x) => x.id === pick);
    const { data, error: err } = await supabase.from("vehicle_deals").insert({ vehicle_id: pick, sale_price: Number(v?.sale_price || v?.price || 0), buyer_county: "Lake" }).select("id").single();
    if (err) return toast(err.message, "bad");
    router.push(`/admin/deals/${data.id}`);
  };

  return (
    <>
      <PageHeader title="Vehicle sales" description="Deal sheets with Florida tax figured for you, gross profit per car, and a printable buyer's order."
        actions={<Button variant="primary" icon={Plus} onClick={() => setPick(stock[0]?.id || "")}>New sale</Button>} />
      <ErrorBanner error={error} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="In stock" value={stock.length} sub={`${money0(stockCost)} at cost`} icon={CarFront} href="/admin/inventory" />
        <Stat label="Avg. days in stock" value={avgDays} icon={Timer} tone={avgDays > 60 ? "warn" : "info"} />
        <Stat label={`Cars sold ${year}`} value={soldYtd.length} sub={money0(soldYtd.reduce((s, d) => s + Number(d.sale_price), 0))} icon={Handshake} tone="good" />
        <Stat label="Gross profit per car" value={money0(soldYtd.length ? soldYtd.reduce((s, d) => s + Number(d.gross_profit), 0) / soldYtd.length : 0)} sub="Year to date" icon={TrendingUp} tone="violet" />
      </div>
      <Card>
        <div className="flex flex-col gap-3 border-b border-a-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "draft", label: "Drafts" }, { value: "final", label: "Sold" }, { value: "void", label: "Void" }]} />
          <ExportButtons filename="vehicle-sales" rows={shown} columns={[
            { label: "Deal #", value: "number" }, { label: "Date", value: "sale_date" }, { label: "Vehicle", value: (d) => vname(d.vehicle) }, { label: "VIN", value: (d) => d.vehicle?.vin },
            { label: "Buyer", value: (d) => customerName(d.customer) }, { label: "Sale price", value: "sale_price" }, { label: "Trade allowance", value: "trade_allowance" },
            { label: "Tax", value: "total_tax" }, { label: "Total due", value: "total_due" }, { label: "Cost basis", value: "cost_basis" }, { label: "Gross profit", value: "gross_profit" }, { label: "Status", value: "status" },
          ]} />
        </div>
        {deals === null ? <SkeletonRows /> : shown.length === 0 ? (
          <EmptyState icon={Handshake} title="No sales yet" description="Start a deal from a car in inventory." action={<Button variant="primary" icon={Plus} onClick={() => setPick(stock[0]?.id || "")}>New sale</Button>} />
        ) : (
          <Table>
            <thead><tr><Th>Deal</Th><Th>Vehicle</Th><Th className="hidden md:table-cell">Buyer</Th><Th>Status</Th><Th align="right">Price</Th><Th align="right" className="hidden sm:table-cell">Profit</Th></tr></thead>
            <tbody>
              {shown.map((d) => (
                <tr key={d.id} className={cx("cursor-pointer hover:bg-a-hover/50", d.status === "void" && "opacity-50")} onClick={() => router.push(`/admin/deals/${d.id}`)}>
                  <Td><div className="font-medium">#{d.number}</div><div className="text-xs text-a-faint">{fmtDate(d.sale_date)}</div></Td>
                  <Td>{vname(d.vehicle)}<div className="text-xs text-a-faint">{d.vehicle?.stock_number}</div></Td>
                  <Td className="hidden md:table-cell">{d.customer ? customerName(d.customer) : <span className="text-a-faint">—</span>}</Td>
                  <Td><Badge tone={STATUS[d.status].tone} dot>{STATUS[d.status].label}</Badge></Td>
                  <Td align="right">{money(d.sale_price)}</Td>
                  <Td align="right" className={cx("hidden sm:table-cell", Number(d.gross_profit) < 0 && "text-a-bad")}>{d.status === "final" ? money(d.gross_profit) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Modal open={pick !== null} onClose={() => setPick(null)} title="New vehicle sale" footer={<><Button onClick={() => setPick(null)}>Cancel</Button><Button variant="primary" onClick={create}>Start deal sheet</Button></>}>
        {stock.length === 0 ? <p className="text-sm text-a-muted">No unsold cars in inventory. List one first.</p> : (
          <TextField as="select" label="Which car?" value={pick || ""} onChange={(e) => setPick(e.target.value)}>
            {stock.map((v) => <option key={v.id} value={v.id}>{vname(v)} · {v.stock_number || v.vin || ""} · {money0(v.sale_price || v.price)}</option>)}
          </TextField>
        )}
      </Modal>
    </>
  );
}

export default function DealsPage() {
  return (
    <Suspense fallback={null}>
      <DealsInner />
    </Suspense>
  );
}
