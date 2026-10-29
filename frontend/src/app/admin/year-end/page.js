// frontend/src/app/admin/year-end/page.js — checklist, 1099-NEC, depreciation, inventory count, CPA package
"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, FileSpreadsheet, Package, Hammer, Archive, Plus, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { money, money0, date as fmtDate, isoDay, customerName } from "@/lib/format";
import { r2, n0, rateOn, toCsv, balanceOf, estimatedTaxDueDates } from "@/lib/books";
import { download } from "@/lib/quickbooks";
import { Button, Card, CardHeader, PageHeader, Table, Th, Td, Select, Modal, TextField, Badge, SkeletonRows, Stat, cx, useUI } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/AdminContext";
import { load1099, NEC_COLUMNS } from "@/lib/ten99";
import { useRates, ExportButtons, EstimateNote, signedUrl } from "@/components/admin/booksKit";

const CHECKLIST = (year, entity) => [
  { key: "dr15_dec", label: `File December ${year} DR-15 (sales tax)`, due: `${year + 1}-01-20` },
  { key: "est_q4", label: `Q4 ${year} federal estimated tax`, due: estimatedTaxDueDates(year)[3].due.toISOString().slice(0, 10) },
  { key: "nec", label: "Send 1099-NEC to contractors and file with the IRS", due: `${year + 1}-01-31` },
  { key: "w2", label: "W-2s to employees, W-3 to SSA (if you had W-2 staff)", due: `${year + 1}-01-31` },
  { key: "f940", label: "Form 940 (FUTA) and Q4 Form 941", due: `${year + 1}-01-31` },
  { key: "rt6", label: "Florida RT-6 reemployment tax (Q4)", due: `${year + 1}-01-31` },
  { key: "count", label: "Count parts inventory (Dec 31) and post the adjustment below", due: `${year}-12-31` },
  { key: "dep", label: "Record depreciation for tools & equipment bought", due: `${year}-12-31` },
  { key: "w9", label: "Collect W-9s from every 1099 vendor", due: `${year}-12-31` },
  { key: "dr405", label: "Lake County tangible personal property return (DR-405)", due: `${year + 1}-04-01` },
  { key: "sunbiz", label: "Florida LLC annual report (Sunbiz)", due: `${year + 1}-05-01` },
  { key: "return", label: entity === "single_member" ? "Federal return with Schedule C (Form 1040)" : entity === "s_corp" ? "Form 1120-S and K-1s" : "Form 1065 and K-1s", due: entity === "single_member" ? `${year + 1}-04-15` : `${year + 1}-03-15` },
  { key: "cpa", label: "Send the CPA package (button below)", due: `${year + 1}-02-15` },
];

export default function YearEndPage() {
  const { toast } = useUI();
  const { books, isAdmin } = useAdmin();
  const rates = useRates();
  const [year, setYear] = useState(new Date().getMonth() < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear());
  const [checks, setChecks] = useState({});
  const [nec, setNec] = useState(null);
  const [assets, setAssets] = useState(null);
  const [assetEdit, setAssetEdit] = useState(null);
  const [parts, setParts] = useState(null);
  const [glInv, setGlInv] = useState(0);
  const [packing, setPacking] = useState(null);

  useEffect(() => {
    supabase.from("settings").select("value").eq("key", "yearend").maybeSingle().then(({ data }) => setChecks(data?.value || {}));
    supabase.from("fixed_assets").select("*").order("in_service_on").then(({ data }) => setAssets(data || []));
    supabase.from("parts").select("id, name, part_number, quantity_on_hand, unit_cost").eq("active", true).order("name").then(({ data }) => setParts((data || []).map((p) => ({ ...p, counted: String(p.quantity_on_hand) }))));
    supabase.rpc("gl_summary", { p_from: "2000-01-01", p_to: `${year}-12-31` }).then(({ data }) => setGlInv(balanceOf((data || []).find((a) => a.code === "1200") || { type: "asset", debit: 0, credit: 0 })));
  }, [year]);
  useEffect(() => {
    if (!rates) return;
    setNec(null);
    load1099(year, rates).then(setNec);
  }, [year, rates]);

  const toggle = async (key) => {
    const next = { ...checks, [year]: { ...(checks[year] || {}), [key]: !checks[year]?.[key] } };
    setChecks(next);
    await supabase.from("settings").upsert({ key: "yearend", category: "accounting", description: "Year-end checklist", value: next }, { onConflict: "key" });
  };

  const saveAsset = async () => {
    const payload = { name: assetEdit.name?.trim(), in_service_on: assetEdit.in_service_on, cost: r2(n0(assetEdit.cost)), life_years: parseInt(assetEdit.life_years, 10) || 7, method: assetEdit.method, disposed_on: assetEdit.disposed_on || null, notes: assetEdit.notes?.trim() || null };
    if (!payload.name || !payload.cost) return toast("Enter a name and cost", "bad");
    const res = assetEdit.id ? await supabase.from("fixed_assets").update(payload).eq("id", assetEdit.id) : await supabase.from("fixed_assets").insert(payload);
    if (res.error) return toast(res.error.message, "bad");
    setAssetEdit(null);
    supabase.from("fixed_assets").select("*").order("in_service_on").then(({ data }) => setAssets(data || []));
  };
  const postDep = async () => {
    const { data, error } = await supabase.rpc("post_depreciation", { p_year: year });
    if (error) return toast(error.message, "bad");
    toast(`Depreciation for ${year}: ${money(data)} posted`);
  };

  const counted = (parts || []).reduce((s, p) => s + n0(p.counted) * Number(p.unit_cost), 0);
  const saveCount = async () => {
    const changed = parts.filter((p) => n0(p.counted) !== Number(p.quantity_on_hand));
    for (const p of changed) {
      await supabase.from("parts").update({ quantity_on_hand: n0(p.counted) }).eq("id", p.id);
      await supabase.from("part_movements").insert({ part_id: p.id, quantity: r2(n0(p.counted) - Number(p.quantity_on_hand)), kind: "count", unit_cost: p.unit_cost, note: `Year-end count ${year}` });
    }
    const diff = r2(counted - glInv);
    if (diff) {
      const { data: e, error } = await supabase.from("journal_entries").insert({ entry_date: `${year}-12-31`, source_type: "manual", memo: `Parts inventory count adjustment ${year}` }).select().single();
      if (error) return toast(error.message, "bad");
      const inv = (await supabase.from("accounts").select("id, code").in("code", ["1200", "5000"])).data;
      const a1200 = inv.find((a) => a.code === "1200").id;
      const a5000 = inv.find((a) => a.code === "5000").id;
      await supabase.from("journal_lines").insert(diff > 0
        ? [{ entry_id: e.id, account_id: a1200, debit: diff, credit: 0 }, { entry_id: e.id, account_id: a5000, debit: 0, credit: diff }]
        : [{ entry_id: e.id, account_id: a5000, debit: -diff, credit: 0 }, { entry_id: e.id, account_id: a1200, debit: 0, credit: -diff }]);
    }
    toast(`Count saved${diff ? `; books adjusted by ${money(diff)}` : ""}`);
    setGlInv(counted);
  };

  // ------------------------------------------------------------------ CPA package
  const buildPackage = async () => {
    setPacking("Gathering…");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const from = `${year}-01-01`;
      const to = `${year}-12-31`;
      const csv = (name, rows, cols) => zip.file(name, toCsv(rows, cols));
      const [gl, je, exps, trips, dr15, deals, stubs, ar, fa] = await Promise.all([
        supabase.rpc("gl_summary", { p_from: from, p_to: to }),
        supabase.from("journal_entries").select("entry_date, source_type, memo, lines:journal_lines(debit, credit, memo, account:accounts(code,name))").gte("entry_date", from).lte("entry_date", to).order("entry_date").limit(20000),
        supabase.from("expenses").select("*, vendor:vendors(name), lines:expense_lines(amount, description, account:accounts(code,name))").gte("expense_date", from).lte("expense_date", to).order("expense_date"),
        supabase.from("mileage_trips").select("*").gte("trip_date", from).lte("trip_date", to).order("trip_date"),
        supabase.from("tax_periods").select("*").gte("period_start", from).lte("period_start", to).order("period_start"),
        supabase.from("vehicle_deals").select("number, sale_date, status, sale_price, doc_fee, trade_allowance, total_tax, cost_basis, gross_profit, buyer_county, vehicle:vehicles!vehicle_deals_vehicle_id_fkey(year,make,model,vin), customer:customers(first_name,last_name,company)").gte("sale_date", from).lte("sale_date", to),
        supabase.from("pay_stubs").select("*, employee:employees(first_name,last_name), run:pay_runs!inner(status, pay_date)").eq("run.status", "paid").gte("run.pay_date", from).lte("run.pay_date", to),
        supabase.from("repair_orders").select("invoice_number, invoiced_at, due_date, balance_due, customer:customers(first_name,last_name,company)").not("invoiced_at", "is", null).is("voided_at", null).gt("balance_due", 0),
        supabase.from("fixed_assets").select("*"),
      ]);
      const bsRes = await supabase.rpc("gl_summary", { p_from: "2000-01-01", p_to: to });
      const g = gl.data || [];
      csv("01 Profit and loss.csv", g.filter((a) => ["income", "cogs", "expense"].includes(a.type)).map((a) => ({ ...a, amount: r2(balanceOf(a)) })).filter((a) => a.amount), [{ label: "Type", value: "type" }, { label: "Account", value: "code" }, { label: "Name", value: "name" }, { label: "Schedule C", value: "schedule_c" }, { label: "Amount", value: "amount" }]);
      csv("02 Balance sheet.csv", (bsRes.data || []).filter((a) => ["asset", "liability", "equity"].includes(a.type)).map((a) => ({ ...a, amount: r2(balanceOf(a)) })).filter((a) => a.amount), [{ label: "Type", value: "type" }, { label: "Account", value: "code" }, { label: "Name", value: "name" }, { label: "Balance Dec 31", value: "amount" }]);
      csv("03 Trial balance.csv", (bsRes.data || []).filter((a) => Number(a.debit) || Number(a.credit)).map((a) => { const n = r2(a.debit - a.credit); return { ...a, dr: n > 0 ? n : 0, cr: n < 0 ? -n : 0 }; }), [{ label: "Account", value: "code" }, { label: "Name", value: "name" }, { label: "Debit", value: "dr" }, { label: "Credit", value: "cr" }]);
      csv("04 General ledger.csv", (je.data || []).flatMap((e) => e.lines.map((l) => ({ date: e.entry_date, type: e.source_type, memo: e.memo, account: `${l.account.code} ${l.account.name}`, debit: l.debit, credit: l.credit, line: l.memo }))), [{ label: "Date", value: "date" }, { label: "Type", value: "type" }, { label: "Memo", value: "memo" }, { label: "Account", value: "account" }, { label: "Debit", value: "debit" }, { label: "Credit", value: "credit" }, { label: "Line memo", value: "line" }]);
      const ex = exps.data || [];
      csv("05 Expense detail.csv", ex.flatMap((e) => e.lines.map((l) => ({ date: e.expense_date, vendor: e.vendor_name || e.vendor?.name, ref: e.ref_number, account: `${l.account.code} ${l.account.name}`, desc: l.description, amount: l.amount, status: e.voided_at ? "void" : e.status, receipt: e.receipt_path ? `receipts/${e.id}.jpg` : "" }))), [{ label: "Date", value: "date" }, { label: "Vendor", value: "vendor" }, { label: "Ref", value: "ref" }, { label: "Category", value: "account" }, { label: "Description", value: "desc" }, { label: "Amount", value: "amount" }, { label: "Status", value: "status" }, { label: "Receipt file", value: "receipt" }]);
      const rate = (d) => Number(rateOn(rates, "irs_mileage_rate", d) ?? 0.725);
      csv("06 Mileage log.csv", (trips.data || []).map((t) => ({ ...t, total: Number(t.miles) * (t.round_trip ? 2 : 1), ded: r2(Number(t.miles) * (t.round_trip ? 2 : 1) * rate(t.trip_date)) })), [{ label: "Date", value: "trip_date" }, { label: "From", value: "from_place" }, { label: "To", value: "to_place" }, { label: "Purpose", value: "purpose" }, { label: "Miles", value: "total" }, { label: "Deduction", value: "ded" }]);
      const n = await load1099(year, rates);
      csv("07 1099-NEC list.csv", n.rows.filter((r) => r.required), NEC_COLUMNS);
      csv("08 DR-15 history.csv", (dr15.data || []).map((p) => ({ ...p, ...(p.worksheet || {}) })), [{ label: "Period", value: "period_start" }, { label: "Gross sales", value: "gross_sales" }, { label: "Exempt", value: "exempt_sales" }, { label: "Taxable", value: "taxable_sales" }, { label: "Tax collected", value: "tax_collected" }, { label: "Use tax", value: "use_tax" }, { label: "Surtax", value: "surtax_collected" }, { label: "Fees", value: "govt_fees" }, { label: "Allowance", value: "allowance_taken" }, { label: "Paid", value: "amount_paid" }, { label: "Filed", value: "filed_on" }, { label: "Confirmation", value: "confirmation_number" }]);
      csv("09 Vehicle sales.csv", (deals.data || []).map((d) => ({ ...d, veh: [d.vehicle?.year, d.vehicle?.make, d.vehicle?.model].join(" "), vin: d.vehicle?.vin, buyer: customerName(d.customer) })), [{ label: "Deal", value: "number" }, { label: "Date", value: "sale_date" }, { label: "Status", value: "status" }, { label: "Vehicle", value: "veh" }, { label: "VIN", value: "vin" }, { label: "Buyer", value: "buyer" }, { label: "County", value: "buyer_county" }, { label: "Price", value: "sale_price" }, { label: "Dealer fee", value: "doc_fee" }, { label: "Trade", value: "trade_allowance" }, { label: "Tax", value: "total_tax" }, { label: "Cost basis", value: "cost_basis" }, { label: "Gross profit", value: "gross_profit" }]);
      csv("10 Payroll detail.csv", (stubs.data || []).map((s) => ({ ...s, name: [s.employee?.first_name, s.employee?.last_name].join(" "), date: s.run.pay_date })), [{ label: "Pay date", value: "date" }, { label: "Name", value: "name" }, { label: "Type", value: "worker_type" }, { label: "Hours", value: "regular_hours" }, { label: "OT", value: "overtime_hours" }, { label: "Gross", value: "gross" }, { label: "Fed W/H", value: "fed_withholding" }, { label: "SS", value: "ss_employee" }, { label: "Medicare", value: "medicare_employee" }, { label: "Net", value: "net_pay" }, { label: "Employer SS", value: "ss_employer" }, { label: "Employer Medicare", value: "medicare_employer" }, { label: "FUTA", value: "futa" }, { label: "FL RT", value: "suta" }]);
      csv("11 Unpaid invoices.csv", (ar.data || []).map((r) => ({ ...r, who: customerName(r.customer) })), [{ label: "Invoice", value: "invoice_number" }, { label: "Customer", value: "who" }, { label: "Date", value: "invoiced_at" }, { label: "Due", value: "due_date" }, { label: "Balance", value: "balance_due" }]);
      csv("12 Fixed assets.csv", fa.data || [], [{ label: "Asset", value: "name" }, { label: "In service", value: "in_service_on" }, { label: "Cost", value: "cost" }, { label: "Life (yrs)", value: "life_years" }, { label: "Method", value: "method" }, { label: "Disposed", value: "disposed_on" }]);
      zip.file("README.txt", `Auto Pro Repairs Sales & Services LLC — CPA package for ${year}\nPrepared ${new Date().toLocaleString()} from the Auto Pro admin app.\nEntity: ${books.entity_type}. Books are kept on the accrual basis; sales tax collected is a liability, not income.\nAll figures are estimates prepared by the owner for review by the CPA.\n`);
      const withReceipts = ex.filter((e) => e.receipt_path);
      let i = 0;
      for (const e of withReceipts) {
        setPacking(`Adding receipts ${++i}/${withReceipts.length}…`);
        const url = await signedUrl(e.receipt_path, 120);
        if (!url) continue;
        const blob = await fetch(url).then((r) => (r.ok ? r.blob() : null)).catch(() => null);
        if (blob) zip.file(`receipts/${e.id}.${e.receipt_path.split(".").pop()}`, blob);
      }
      setPacking("Zipping…");
      const blob = await zip.generateAsync({ type: "blob" });
      download(`AutoPro-CPA-package-${year}.zip`, blob, "application/zip");
      toast("CPA package downloaded");
    } catch (e) {
      toast(e.message || "Couldn't build the package", "bad");
    } finally {
      setPacking(null);
    }
  };

  const list = CHECKLIST(year, books.entity_type);
  const done = list.filter((c) => checks[year]?.[c.key]).length;
  const required = (nec?.rows || []).filter((r) => r.required);

  return (
    <>
      <PageHeader title="Year-end & 1099s" description="Everything to close the year and hand your CPA."
        actions={<>
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28">{[0, 1, 2].map((k) => { const y = new Date().getFullYear() - k; return <option key={y} value={y}>{y}</option>; })}</Select>
          <Button variant="primary" icon={packing ? Loader2 : Archive} disabled={Boolean(packing) || !rates} onClick={buildPackage}>{packing || "Download CPA package"}</Button>
        </>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Checklist" value={`${done}/${list.length}`} icon={CalendarCheck} tone={done === list.length ? "good" : "warn"} />
        <Stat label="1099-NECs to file" value={nec ? required.length : "…"} sub={nec ? `Threshold ${money0(nec.threshold)} for ${year}` : ""} icon={FileSpreadsheet} tone="violet" />
        <Stat label="Parts inventory (count)" value={money0(counted)} sub={`Books show ${money0(glInv)}`} icon={Package} tone="info" />
        <Stat label="Fixed assets" value={assets?.length ?? "…"} sub={money0((assets || []).reduce((s, a) => s + Number(a.cost), 0))} icon={Hammer} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={`Checklist for ${year}`} icon={CalendarCheck} />
          <ul className="divide-y divide-a-line/60">
            {list.map((c) => {
              const ok = checks[year]?.[c.key];
              const late = !ok && c.due < isoDay();
              return (
                <li key={c.key} className="flex cursor-pointer items-center gap-3 px-5 py-2.5 hover:bg-a-hover/40" onClick={() => isAdmin && toggle(c.key)}>
                  <input type="checkbox" className="a-check" readOnly checked={Boolean(ok)} />
                  <span className={cx("flex-1 text-sm", ok && "text-a-faint line-through")}>{c.label}</span>
                  <span className={cx("text-xs tnum", late ? "text-a-bad" : "text-a-faint")}>{fmtDate(c.due, { month: "short", day: "numeric", year: "numeric" })}</span>
                </li>
              );
            })}
          </ul>
          <div className="px-5 py-3"><EstimateNote>Due dates move to the next business day when they fall on a weekend or holiday. Confirm with your CPA.</EstimateNote></div>
        </Card>

        <Card>
          <CardHeader title={`1099-NEC · ${year}`} icon={FileSpreadsheet} description={`Contractors and 1099 vendors paid ${money0(nec?.threshold || 0)} or more (card payments excluded — those go on the card company's 1099-K).`}
            actions={nec && <ExportButtons filename={`1099-NEC-${year}`} rows={required} columns={NEC_COLUMNS} print={false} />} />
          {!nec ? <SkeletonRows rows={4} /> : (
            <Table>
              <thead><tr><Th>Recipient</Th><Th>TIN</Th><Th align="right">Paid</Th></tr></thead>
              <tbody>
                {nec.rows.map((r) => (
                  <tr key={`${r.kind}${r.name}`} className={cx(!r.required && "opacity-50")}>
                    <Td><div className="font-medium">{r.name}</div><div className="text-xs text-a-faint">{r.kind}{!r.required && " · under threshold"}</div></Td>
                    <Td>{r.tin ? <Badge tone="good">{r.tin_type} on file</Badge> : r.w9 ? <Badge tone="info">W-9 on file</Badge> : <Badge tone="bad">Need W-9</Badge>}</Td>
                    <Td align="right">{money(r.amount)}</Td>
                  </tr>
                ))}
                {!nec.rows.length && <tr><Td colSpan={3} className="text-a-faint">No contractor payments. Mark vendors “Gets a 1099” in Expenses → Vendors.</Td></tr>}
              </tbody>
            </Table>
          )}
          <p className="px-5 py-3 text-xs text-a-faint">The CSV works with IRS IRIS bulk upload templates and services like Track1099 / Tax1099. Taxpayer IDs are included only for the owner.</p>
        </Card>

        <Card>
          <CardHeader title="Tools & equipment (depreciation)" icon={Hammer} description="Big purchases are depreciated over their life (or expensed in full with Section 179 — ask your CPA)."
            actions={isAdmin && <><Button size="sm" icon={Plus} onClick={() => setAssetEdit({ name: "", in_service_on: `${year}-01-01`, cost: "", life_years: 7, method: "straight_line" })}>Add</Button><Button size="sm" variant="primary" onClick={postDep}>Record {year} depreciation</Button></>} />
          {!assets ? <SkeletonRows rows={3} /> : (
            <Table>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id} className="cursor-pointer hover:bg-a-hover/50" onClick={() => setAssetEdit({ ...a, cost: String(a.cost) })}>
                    <Td><div className="font-medium">{a.name}</div><div className="text-xs text-a-faint">In service {fmtDate(a.in_service_on)} · {a.method === "section_179" ? "Section 179" : `${a.life_years}-yr straight line`}</div></Td>
                    <Td align="right">{money(a.cost)}</Td>
                  </tr>
                ))}
                {!assets.length && <tr><Td className="text-a-faint">No assets yet. Add lifts, scanners, compressors, the shop truck…</Td></tr>}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title={`Parts inventory count · Dec 31, ${year}`} icon={Package} description="Enter what's on the shelf; the books are adjusted to match."
            actions={isAdmin && <Button size="sm" variant="primary" onClick={saveCount}>Save count</Button>} />
          {!parts ? <SkeletonRows rows={4} /> : (
            <div className="max-h-[420px] overflow-y-auto">
              <Table>
                <tbody>
                  {parts.map((p, i) => (
                    <tr key={p.id}>
                      <Td><div>{p.name}</div><div className="text-xs text-a-faint">{p.part_number} · {money(p.unit_cost)} ea · system {Number(p.quantity_on_hand)}</div></Td>
                      <Td align="right" className="w-28"><input className="a-input h-8 text-right" inputMode="decimal" value={p.counted} onChange={(e) => setParts(parts.map((x, k) => (k === i ? { ...x, counted: e.target.value } : x)))} /></Td>
                    </tr>
                  ))}
                  {!parts.length && <tr><Td className="text-a-faint">No parts tracked.</Td></tr>}
                </tbody>
              </Table>
            </div>
          )}
          {Math.abs(counted - glInv) > 0.01 && <p className="flex items-center gap-1.5 px-5 py-3 text-sm text-a-warn"><AlertTriangle className="h-4 w-4" />Saving posts a {money(counted - glInv)} adjustment to Parts inventory / Parts & materials.</p>}
          {Math.abs(counted - glInv) <= 0.01 && parts?.length > 0 && <p className="flex items-center gap-1.5 px-5 py-3 text-sm text-a-good"><CheckCircle2 className="h-4 w-4" />Books match the count.</p>}
        </Card>
      </div>

      <Modal open={Boolean(assetEdit)} onClose={() => setAssetEdit(null)} title={assetEdit?.id ? "Edit asset" : "Add asset"} footer={<><Button onClick={() => setAssetEdit(null)}>Cancel</Button><Button variant="primary" onClick={saveAsset}>Save</Button></>}>
        {assetEdit && (
          <div className="grid grid-cols-2 gap-3">
            <TextField className="col-span-2" label="What" value={assetEdit.name} onChange={(e) => setAssetEdit({ ...assetEdit, name: e.target.value })} placeholder="2-post lift" />
            <TextField label="In service" type="date" value={assetEdit.in_service_on} onChange={(e) => setAssetEdit({ ...assetEdit, in_service_on: e.target.value })} />
            <TextField label="Cost" inputMode="decimal" value={assetEdit.cost} onChange={(e) => setAssetEdit({ ...assetEdit, cost: e.target.value })} />
            <TextField as="select" label="Method" value={assetEdit.method} onChange={(e) => setAssetEdit({ ...assetEdit, method: e.target.value })}><option value="straight_line">Straight line</option><option value="section_179">Section 179 (all this year)</option></TextField>
            <TextField label="Life (years)" inputMode="numeric" value={assetEdit.life_years} onChange={(e) => setAssetEdit({ ...assetEdit, life_years: e.target.value })} />
            <TextField label="Sold / scrapped" type="date" value={assetEdit.disposed_on || ""} onChange={(e) => setAssetEdit({ ...assetEdit, disposed_on: e.target.value })} />
            <p className="col-span-2 text-xs text-a-faint">Record the purchase itself as an expense in the “Equipment (depreciate)” category so the cost lands in Tools & equipment.</p>
          </div>
        )}
      </Modal>
    </>
  );
}
