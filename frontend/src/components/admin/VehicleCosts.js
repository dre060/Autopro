// frontend/src/components/admin/VehicleCosts.js — private cost basis for a car we own
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Handshake, Wrench } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { money, money0, date as fmtDate, isoDay } from "@/lib/format";
import { r2, n0, PAID_FROM } from "@/lib/books";
import { Button, Card, Modal, TextField, cx, useUI } from "./ui";
import { useAccounts } from "./booksKit";
import { useAdmin } from "./AdminContext";

export const COST_CATEGORY = {
  purchase: "Purchase price", auction_fee: "Auction / buyer fee", transport: "Transport", recon_parts: "Recon parts",
  recon_labor: "Recon labor", title: "Title & tag", other: "Other",
};

// Total cost of a car: its cost lines + parts/sublet from internal repair orders.
export async function loadCostBasis(vehicleId) {
  const [costs, ros] = await Promise.all([
    supabase.from("vehicle_costs").select("*").eq("vehicle_id", vehicleId).order("cost_date"),
    supabase.from("repair_orders").select("id, number, invoiced_at, voided_at, status, cost_total").eq("stock_vehicle_id", vehicleId).order("created_at"),
  ]);
  const roCost = (ros.data || []).filter((r) => r.invoiced_at && !r.voided_at).reduce((s, r) => s + Number(r.cost_total), 0);
  const lineCost = (costs.data || []).reduce((s, c) => s + Number(c.amount), 0);
  return { costs: costs.data || [], ros: ros.data || [], total: r2(lineCost + roCost) };
}

export default function VehicleCosts({ vehicle }) {
  const { toast } = useUI();
  const { books } = useAdmin();
  const { byCode, byId } = useAccounts();
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(null);

  const load = () => loadCostBasis(vehicle.id).then(setData);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.id]);

  const save = async () => {
    if (!n0(edit.amount)) return toast("Enter an amount", "bad");
    const payload = { vehicle_id: vehicle.id, cost_date: edit.cost_date, category: edit.category, description: edit.description?.trim() || null, amount: r2(n0(edit.amount)), paid_from_account_id: byCode(edit.paid_from)?.id };
    const res = edit.id ? await supabase.from("vehicle_costs").update(payload).eq("id", edit.id) : await supabase.from("vehicle_costs").insert(payload);
    if (res.error) return toast(res.error.message, "bad");
    setEdit(null);
    load();
  };

  const startRecon = async () => {
    const { data: ro, error } = await supabase.from("repair_orders").insert({ status: "approved", stock_vehicle_id: vehicle.id, complaint: "Reconditioning for sale", tax_exempt: true, exempt_reason: "Internal — our inventory" }).select("id").single();
    if (error) return toast(error.message, "bad");
    window.location.href = `/admin/repair-orders/${ro.id}`;
  };

  const since = vehicle.purchase_date || vehicle.created_at?.slice(0, 10);
  const end = vehicle.sold_date || isoDay();
  const days = since ? Math.max(Math.round((new Date(end) - new Date(since)) / 86400000), 0) : 0;
  const holding = data ? r2(data.total * (Number(books.holding_cost_pct ?? 10) / 100) * days / 365) : 0;
  const price = Number(vehicle.sale_price || vehicle.price || 0);
  const profit = data ? price - data.total : 0;

  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">Cost basis <span className="text-xs font-normal text-a-faint">(private)</span></h3>
        <Button size="xs" icon={Plus} onClick={() => setEdit({ cost_date: isoDay(), category: data?.costs.some((c) => c.category === "purchase") ? "recon_parts" : "purchase", amount: "", paid_from: "1010" })}>Add cost</Button>
      </div>
      {!data ? <div className="a-skeleton h-16" /> : (
        <>
          <ul className="space-y-1 text-sm">
            {data.costs.map((c) => (
              <li key={c.id} className={cx("flex justify-between gap-2", !c.deal_id && "cursor-pointer hover:text-a-accent")} onClick={() => !c.deal_id && setEdit({ ...c, amount: String(c.amount), paid_from: byId(c.paid_from_account_id)?.code || "1010" })}>
                <span className="truncate">{COST_CATEGORY[c.category]}{c.description ? ` · ${c.description}` : ""}</span>
                <span className="tnum">{money(c.amount)}</span>
              </li>
            ))}
            {data.ros.map((r) => (
              <li key={r.id} className="flex justify-between gap-2">
                <Link href={`/admin/repair-orders/${r.id}`} className="truncate text-a-accent">Recon RO #{r.number}{!r.invoiced_at && " (open)"}</Link>
                <span className="tnum">{r.invoiced_at && !r.voided_at ? money(r.cost_total) : "—"}</span>
              </li>
            ))}
            {!data.costs.length && !data.ros.length && <li className="text-a-faint">No costs yet. Add what you paid for it.</li>}
          </ul>
          <div className="flex justify-between border-t border-a-line pt-2 font-semibold"><span>Total cost</span><span className="tnum">{money(data.total)}</span></div>
          {price > 0 && <div className={cx("text-sm", profit >= 0 ? "text-a-good" : "text-a-bad")}>Gross profit at {money0(price)}: {money0(profit)}</div>}
          <div className="text-xs text-a-faint">{days} days in inventory · holding cost ≈ {money0(holding)} ({books.holding_cost_pct ?? 10}%/yr)</div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" icon={Wrench} onClick={startRecon}>Recon repair order</Button>
            {vehicle.status !== "sold" && <Button size="sm" variant="primary" icon={Handshake} href={`/admin/deals?new=1&vehicle=${vehicle.id}`}>Sell this car</Button>}
          </div>
        </>
      )}
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.id ? "Edit cost" : "Add cost"} footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            <TextField as="select" label="What" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
              {Object.entries(COST_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </TextField>
            <TextField label="Date" type="date" value={edit.cost_date} onChange={(e) => setEdit({ ...edit, cost_date: e.target.value })} />
            <TextField label="Amount" inputMode="decimal" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} />
            <TextField as="select" label="Paid from" value={edit.paid_from} onChange={(e) => setEdit({ ...edit, paid_from: e.target.value })}>
              {PAID_FROM.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
              <option value="2400">Loan / floor plan</option>
              <option value="2000">Owe the seller (bill)</option>
            </TextField>
            <TextField className="col-span-2" label="Description" value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="Manheim Orlando, lot 112" />
            {edit.id && <p className="col-span-2 text-xs text-a-faint">Costs can be corrected but not deleted (set to the right amount).</p>}
          </div>
        )}
      </Modal>
    </Card>
  );
}

