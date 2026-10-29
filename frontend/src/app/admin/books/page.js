// frontend/src/app/admin/books/page.js — chart of accounts, ledger, trial balance, deposits, audit log
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookText, Plus, Landmark, History, Scale, Trash2, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { money, date as fmtDate, dateTime, isoDay } from "@/lib/format";
import { r2, n0, TYPE_LABEL, balanceOf } from "@/lib/books";
import { Button, Card, CardHeader, PageHeader, Segmented, Table, Th, Td, Input, Select, Modal, TextField, Badge, EmptyState, SkeletonRows, IconButton, cx, useUI } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/AdminContext";
import { AccountSelect, ExportButtons, presetRange, RANGE_PRESETS } from "@/components/admin/booksKit";

const SOURCE_LABEL = {
  invoice: "Invoice", invoice_void: "Invoice void", payment: "Payment", payment_void: "Payment void", deposit: "Deposit", bill: "Expense / bill",
  bill_payment: "Bill paid", bill_void: "Expense void", bill_payment_void: "Bill payment void", vehicle_cost: "Vehicle cost", deal: "Vehicle sale",
  deal_cogs: "Vehicle cost of sale", deal_void: "Sale void", deal_cogs_void: "Cost of sale void", payroll: "Payroll", payroll_void: "Payroll void",
  sales_tax_payment: "DR-15 payment", estimated_tax: "Estimated tax", manual: "Adjustment",
};
const label = (t) => SOURCE_LABEL[t] || (t.startsWith("depreciation_") ? `Depreciation ${t.slice(13)}` : t);

function BooksInner() {
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") || "accounts");
  return (
    <>
      <PageHeader title="Books & ledger" description="The double-entry books behind every screen. Every invoice, payment, bill, sale and payroll posts here automatically."
        actions={<Segmented value={tab} onChange={setTab} options={[
          { value: "accounts", label: "Accounts" }, { value: "ledger", label: "Ledger" }, { value: "trial", label: "Trial balance" }, { value: "deposits", label: "Deposits" }, { value: "audit", label: "Audit log" },
        ]} />} />
      {tab === "accounts" ? <Accounts /> : tab === "ledger" ? <Ledger /> : tab === "trial" ? <TrialBalance /> : tab === "deposits" ? <Deposits /> : <Audit />}
    </>
  );
}

// ------------------------------------------------------------------ accounts
function Accounts() {
  const { isAdmin } = useAdmin();
  const { toast } = useUI();
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null);
  const load = () => supabase.rpc("gl_summary", { p_from: "2000-01-01", p_to: isoDay() }).then(({ data }) => setRows(data || []));
  useEffect(() => {
    load();
  }, []);
  const [meta, setMeta] = useState({});
  useEffect(() => {
    supabase.from("accounts").select("*").then(({ data }) => setMeta(Object.fromEntries((data || []).map((a) => [a.id, a]))));
  }, [rows]);

  const save = async () => {
    const payload = { code: edit.code.trim(), name: edit.name.trim(), type: edit.type, schedule_c: edit.schedule_c?.trim() || null, description: edit.description?.trim() || null, active: Boolean(edit.active) };
    if (!payload.code || !payload.name) return toast("Enter a number and name", "bad");
    const res = edit.id ? await supabase.from("accounts").update(payload).eq("id", edit.id) : await supabase.from("accounts").insert(payload);
    if (res.error) return toast(res.error.message, "bad");
    setEdit(null);
    load();
  };

  return (
    <Card>
      <CardHeader title="Chart of accounts" icon={BookText} description="Balances as of today. Expense accounts show their Schedule C line."
        actions={isAdmin && <Button size="sm" icon={Plus} onClick={() => setEdit({ code: "", name: "", type: "expense", active: true })}>Add account</Button>} />
      {!rows ? <SkeletonRows /> : (
        <Table>
          <tbody>
            {Object.keys(TYPE_LABEL).map((type) => (
              <FragmentRows key={type} title={TYPE_LABEL[type]} rows={rows.filter((a) => a.type === type)} meta={meta} onEdit={isAdmin ? (a) => setEdit({ ...meta[a.account_id] }) : null} />
            ))}
          </tbody>
        </Table>
      )}
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.id ? edit.name : "Add account"} footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {edit && (
          <div className="grid grid-cols-3 gap-3">
            <TextField label="Number" value={edit.code} disabled={edit.is_system} onChange={(e) => setEdit({ ...edit, code: e.target.value })} />
            <TextField className="col-span-2" label="Name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <TextField as="select" label="Type" value={edit.type} disabled={edit.is_system} onChange={(e) => setEdit({ ...edit, type: e.target.value })}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</TextField>
            <TextField className="col-span-2" label="Schedule C line" value={edit.schedule_c || ""} onChange={(e) => setEdit({ ...edit, schedule_c: e.target.value })} placeholder="Line 27a" />
            <TextField className="col-span-3" label="Description" value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            {!edit.is_system && <label className="col-span-3 flex items-center gap-2 text-sm"><input type="checkbox" className="a-check" checked={Boolean(edit.active)} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />Active</label>}
            {edit.is_system && <p className="col-span-3 text-xs text-a-faint">Built-in account: the app posts to it automatically, so its number and type are fixed.</p>}
          </div>
        )}
      </Modal>
    </Card>
  );
}

function FragmentRows({ title, rows, meta, onEdit }) {
  const total = rows.reduce((s, a) => s + balanceOf(a), 0);
  return (
    <>
      <tr className="bg-a-raised/60"><Td className="font-semibold" colSpan={2}>{title}</Td><Td align="right" className="font-semibold">{money(total)}</Td></tr>
      {rows.map((a) => (
        <tr key={a.account_id} className={cx(onEdit && "cursor-pointer hover:bg-a-hover/50", meta[a.account_id]?.active === false && "opacity-50")} onClick={() => onEdit?.(a)}>
          <Td className="w-20 font-mono text-xs text-a-faint">{a.code}</Td>
          <Td>{a.name}{a.schedule_c && <span className="ml-2 text-xs text-a-faint">{a.schedule_c}</span>}</Td>
          <Td align="right">{money(balanceOf(a))}</Td>
        </tr>
      ))}
    </>
  );
}

// ------------------------------------------------------------------ ledger
function Ledger() {
  const { isAdmin } = useAdmin();
  const { toast, confirm } = useUI();
  const [range, setRange] = useState("this_month");
  const [account, setAccount] = useState(null);
  const [q, setQ] = useState("");
  const [entries, setEntries] = useState(null);
  const [open, setOpen] = useState({});
  const [manual, setManual] = useState(null);
  const { from, to } = presetRange(range);

  const load = () => {
    let query = supabase.from("journal_entries").select("*, lines:journal_lines(*, account:accounts(code,name,type))").gte("entry_date", from).lte("entry_date", to).order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(1000);
    query.then(({ data }) => setEntries(data || []));
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const shown = useMemo(() => (entries || []).filter((e) => (!account || e.lines.some((l) => l.account_id === account)) && (!q || `${e.memo} ${label(e.source_type)}`.toLowerCase().includes(q.toLowerCase()))), [entries, account, q]);
  const flat = shown.flatMap((e) => e.lines.filter((l) => !account || l.account_id === account).map((l) => ({ date: e.entry_date, type: label(e.source_type), memo: e.memo, account: `${l.account.code} ${l.account.name}`, debit: l.debit, credit: l.credit, line_memo: l.memo })));

  const saveManual = async () => {
    const lines = manual.lines.filter((l) => l.account_id && (n0(l.debit) || n0(l.credit)));
    const dr = r2(lines.reduce((s, l) => s + n0(l.debit), 0));
    const cr = r2(lines.reduce((s, l) => s + n0(l.credit), 0));
    if (lines.length < 2 || dr !== cr) return toast(`Debits (${money(dr)}) must equal credits (${money(cr)})`, "bad");
    const { data: e, error } = await supabase.from("journal_entries").insert({ entry_date: manual.entry_date, source_type: "manual", memo: manual.memo?.trim() || "Adjustment" }).select().single();
    if (error) return toast(error.message, "bad");
    const { error: e2 } = await supabase.from("journal_lines").insert(lines.map((l) => ({ entry_id: e.id, account_id: l.account_id, debit: r2(n0(l.debit)), credit: r2(n0(l.credit)), memo: l.memo?.trim() || null })));
    if (e2) return toast(e2.message, "bad");
    toast("Entry posted");
    setManual(null);
    load();
  };
  const deleteManual = async (e) => {
    if (!(await confirm({ title: "Delete this adjustment?", message: "Only manual adjustments can be removed; it's kept in the audit log.", danger: true, confirmLabel: "Delete" }))) return;
    const { error } = await supabase.from("journal_entries").delete().eq("id", e.id);
    if (error) return toast(error.message, "bad");
    load();
  };
  const repost = async () => {
    const { data, error } = await supabase.rpc("repost_all");
    if (error) return toast(error.message, "bad");
    toast(`Re-posted ${data.documents} documents`);
    load();
  };

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-a-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={range} onChange={(e) => setRange(e.target.value)} className="w-40">{RANGE_PRESETS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select>
          <AccountSelect value={account} onChange={setAccount} placeholder="All accounts" className="w-64" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search memo…" className="w-48" />
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButtons filename={`general-ledger-${from}-to-${to}`} rows={flat} columns={[
            { label: "Date", value: "date" }, { label: "Type", value: "type" }, { label: "Memo", value: "memo" }, { label: "Account", value: "account" }, { label: "Debit", value: "debit" }, { label: "Credit", value: "credit" }, { label: "Line memo", value: "line_memo" },
          ]} />
          {isAdmin && <Button size="sm" icon={RefreshCw} onClick={repost} title="Rebuild every posted entry from its source document">Re-post</Button>}
          {isAdmin && <Button size="sm" variant="primary" icon={Plus} onClick={() => setManual({ entry_date: isoDay(), memo: "", lines: [{}, {}] })}>Adjusting entry</Button>}
        </div>
      </div>
      {entries === null ? <SkeletonRows /> : shown.length === 0 ? <EmptyState icon={BookText} title="No entries" description="Nothing posted in this range." /> : (
        <Table>
          <thead><tr><Th className="w-8" /><Th>Date</Th><Th>Type</Th><Th>Memo</Th><Th align="right">Amount</Th></tr></thead>
          <tbody>
            {shown.map((e) => {
              const amt = e.lines.reduce((s, l) => s + Number(l.debit), 0);
              return [
                <tr key={e.id} className="cursor-pointer hover:bg-a-hover/50" onClick={() => setOpen((o) => ({ ...o, [e.id]: !o[e.id] }))}>
                  <Td>{open[e.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Td>
                  <Td className="whitespace-nowrap text-a-muted">{fmtDate(e.entry_date)}</Td>
                  <Td><Badge tone={e.source_type.includes("void") ? "neutral" : e.source_type === "manual" ? "warn" : "info"}>{label(e.source_type)}</Badge></Td>
                  <Td className="max-w-[360px] truncate">{e.memo}</Td>
                  <Td align="right">{money(amt)}</Td>
                </tr>,
                open[e.id] && (
                  <tr key={`${e.id}-l`}><td colSpan={5} className="bg-a-raised/40 px-6 py-2">
                    <table className="w-full text-[13px]"><tbody>
                      {e.lines.map((l) => (
                        <tr key={l.id}><td className="py-0.5 font-mono text-xs text-a-faint">{l.account.code}</td><td className={cx(Number(l.credit) > 0 && "pl-6")}>{l.account.name}{l.memo ? <span className="text-a-faint"> · {l.memo}</span> : ""}</td><td className="text-right tnum">{Number(l.debit) ? money(l.debit) : ""}</td><td className="text-right tnum">{Number(l.credit) ? money(l.credit) : ""}</td></tr>
                      ))}
                    </tbody></table>
                    {isAdmin && e.source_type === "manual" && <Button size="xs" variant="danger" icon={Trash2} className="mt-2" onClick={() => deleteManual(e)}>Delete adjustment</Button>}
                  </td></tr>
                ),
              ];
            })}
          </tbody>
        </Table>
      )}
      <Modal open={Boolean(manual)} onClose={() => setManual(null)} size="xl" title="Adjusting journal entry" description="For opening balances, owner contributions, loan payments, inventory counts and CPA adjustments. Debits must equal credits."
        footer={<><Button onClick={() => setManual(null)}>Cancel</Button><Button variant="primary" onClick={saveManual}>Post entry</Button></>}>
        {manual && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <TextField label="Date" type="date" value={manual.entry_date} onChange={(e) => setManual({ ...manual, entry_date: e.target.value })} />
              <TextField className="col-span-2" label="Memo" value={manual.memo} onChange={(e) => setManual({ ...manual, memo: e.target.value })} placeholder="Opening balance — checking" />
            </div>
            {manual.lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_110px_110px_1fr_auto] gap-2">
                <AccountSelect value={l.account_id} onChange={(v) => setManual({ ...manual, lines: manual.lines.map((x, k) => (k === i ? { ...x, account_id: v } : x)) })} />
                <Input placeholder="Debit" inputMode="decimal" value={l.debit || ""} onChange={(e) => setManual({ ...manual, lines: manual.lines.map((x, k) => (k === i ? { ...x, debit: e.target.value, credit: "" } : x)) })} />
                <Input placeholder="Credit" inputMode="decimal" value={l.credit || ""} onChange={(e) => setManual({ ...manual, lines: manual.lines.map((x, k) => (k === i ? { ...x, credit: e.target.value, debit: "" } : x)) })} />
                <Input placeholder="Line memo" value={l.memo || ""} onChange={(e) => setManual({ ...manual, lines: manual.lines.map((x, k) => (k === i ? { ...x, memo: e.target.value } : x)) })} />
                <IconButton icon={Trash2} label="Remove" disabled={manual.lines.length <= 2} onClick={() => setManual({ ...manual, lines: manual.lines.filter((_, k) => k !== i) })} />
              </div>
            ))}
            <div className="flex items-center justify-between">
              <Button size="sm" variant="ghost" icon={Plus} onClick={() => setManual({ ...manual, lines: [...manual.lines, {}] })}>Line</Button>
              <span className="text-sm tnum">Debits {money(manual.lines.reduce((s, l) => s + n0(l.debit), 0))} · Credits {money(manual.lines.reduce((s, l) => s + n0(l.credit), 0))}</span>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

// ------------------------------------------------------------------ trial balance
function TrialBalance() {
  const [asOf, setAsOf] = useState(isoDay());
  const [rows, setRows] = useState(null);
  useEffect(() => {
    setRows(null);
    supabase.rpc("gl_summary", { p_from: "2000-01-01", p_to: asOf }).then(({ data }) => setRows((data || []).filter((a) => Number(a.debit) || Number(a.credit))));
  }, [asOf]);
  const tb = (rows || []).map((a) => { const net = r2(Number(a.debit) - Number(a.credit)); return { code: a.code, name: a.name, type: a.type, debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0 }; });
  const dr = r2(tb.reduce((s, a) => s + a.debit, 0));
  const cr = r2(tb.reduce((s, a) => s + a.credit, 0));
  return (
    <Card className="print-sheet">
      <CardHeader title={`Trial balance as of ${fmtDate(asOf)}`} icon={Scale} description={rows && (dr === cr ? "In balance — debits equal credits." : "Out of balance!")}
        actions={<div className="no-print flex gap-2"><Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="h-8 w-40" /><ExportButtons filename={`trial-balance-${asOf}`} rows={tb} columns={[{ label: "Account", value: "code" }, { label: "Name", value: "name" }, { label: "Debit", value: "debit" }, { label: "Credit", value: "credit" }]} /></div>} />
      {!rows ? <SkeletonRows /> : (
        <Table>
          <thead><tr><Th>Account</Th><Th align="right">Debit</Th><Th align="right">Credit</Th></tr></thead>
          <tbody>
            {tb.map((a) => <tr key={a.code}><Td><span className="mr-2 font-mono text-xs text-a-faint">{a.code}</span>{a.name}</Td><Td align="right">{a.debit ? money(a.debit) : ""}</Td><Td align="right">{a.credit ? money(a.credit) : ""}</Td></tr>)}
            <tr className="bg-a-raised/60 font-semibold"><Td className="flex items-center gap-2">{dr === cr ? <CheckCircle2 className="h-4 w-4 text-a-good" /> : <AlertTriangle className="h-4 w-4 text-a-bad" />}Totals</Td><Td align="right">{money(dr)}</Td><Td align="right">{money(cr)}</Td></tr>
          </tbody>
        </Table>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ deposits
function Deposits() {
  const { isAdmin } = useAdmin();
  const { toast } = useUI();
  const [pending, setPending] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [pick, setPick] = useState({});
  const [form, setForm] = useState({ date: isoDay(), account: "1010", memo: "" });
  const [accts, setAccts] = useState([]);

  const load = async () => {
    const [p, d, a] = await Promise.all([
      supabase.from("payments").select("*, ro:repair_orders(number, invoice_number, customer:customers(first_name,last_name,company)), deal:vehicle_deals(number)").is("deposit_id", null).is("voided_at", null).neq("method", "credit_memo").order("received_at"),
      supabase.from("deposits").select("*, account:accounts(name)").order("deposit_date", { ascending: false }).limit(50),
      supabase.from("accounts").select("id, code, name").in("code", ["1010", "1020", "1000"]),
    ]);
    setPending(p.data || []);
    setDeposits(d.data || []);
    setAccts(a.data || []);
    setPick({});
  };
  useEffect(() => {
    load();
  }, []);

  const chosen = (pending || []).filter((p) => pick[p.id]);
  const total = r2(chosen.reduce((s, p) => s + Number(p.amount), 0));

  const deposit = async () => {
    if (!chosen.length) return toast("Tick the payments that went into this deposit", "bad");
    const { data: dep, error } = await supabase.from("deposits").insert({ deposit_date: form.date, account_id: accts.find((a) => a.code === form.account)?.id, memo: form.memo.trim() || null }).select().single();
    if (error) return toast(error.message, "bad");
    const { error: e2 } = await supabase.from("payments").update({ deposit_id: dep.id }).in("id", chosen.map((p) => p.id));
    if (e2) return toast(e2.message, "bad");
    toast(`Deposit of ${money(total)} recorded`);
    load();
  };

  const who = (p) => {
    const c = p.ro?.customer;
    return p.deal ? `Deal #${p.deal.number}` : `${p.ro?.invoice_number ? `Inv #${p.ro.invoice_number}` : `RO #${p.ro?.number}`} · ${c ? c.company || [c.first_name, c.last_name].filter(Boolean).join(" ") : ""}`;
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader title="Payments not yet deposited" icon={Landmark} description="Group the checks and cash you take to the bank so each deposit matches your bank statement. Card payouts work the same way." />
        {pending === null ? <SkeletonRows /> : pending.length === 0 ? <EmptyState icon={CheckCircle2} title="Everything is deposited" /> : (
          <Table>
            <tbody>
              {pending.map((p) => (
                <tr key={p.id} className="cursor-pointer hover:bg-a-hover/50" onClick={() => setPick((x) => ({ ...x, [p.id]: !x[p.id] }))}>
                  <Td className="w-8"><input type="checkbox" className="a-check" readOnly checked={Boolean(pick[p.id])} /></Td>
                  <Td className="text-a-muted">{fmtDate(p.received_at)}</Td>
                  <Td>{who(p)}</Td>
                  <Td><Badge>{p.method}</Badge></Td>
                  <Td align="right">{money(p.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <div className="space-y-5">
        {isAdmin && (
          <Card className="space-y-3 p-5">
            <h3 className="text-[15px] font-semibold">New deposit · {money(total)}</h3>
            <TextField label="Deposit date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <TextField as="select" label="Into" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>{accts.map((a) => <option key={a.code} value={a.code}>{a.name}</option>)}</TextField>
            <TextField label="Memo" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} placeholder="Deposit slip #" />
            <Button variant="primary" className="w-full" onClick={deposit} disabled={!chosen.length}>Record deposit</Button>
          </Card>
        )}
        <Card>
          <CardHeader title="Recent deposits" />
          <Table><tbody>
            {deposits.map((d) => <tr key={d.id}><Td className="text-a-muted">{fmtDate(d.deposit_date)}</Td><Td>{d.account?.name}{d.memo ? ` · ${d.memo}` : ""}</Td><Td align="right">{money(d.total)}</Td></tr>)}
            {!deposits.length && <tr><Td className="text-a-faint">None yet</Td></tr>}
          </tbody></Table>
        </Card>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ audit log
function Audit() {
  const [rows, setRows] = useState(null);
  const [table, setTable] = useState("");
  useEffect(() => {
    let q = supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(300);
    if (table) q = q.eq("table_name", table);
    q.then(({ data }) => setRows(data || []));
  }, [table]);
  const tables = ["repair_orders", "repair_order_items", "payments", "expenses", "vehicle_deals", "vehicle_costs", "pay_runs", "pay_stubs", "employees", "time_entries", "tax_periods", "tax_rates", "settings", "accounts", "journal_entries", "customers", "vendors", "admin_users"];
  const fmt = (o) => (o ? Object.entries(o).filter(([k]) => !["id", "created_at"].includes(k)).slice(0, 8).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ") : "");
  return (
    <Card>
      <CardHeader title="Audit log" icon={History} description="Who changed what and when, with old and new values. Taxpayer IDs are never recorded."
        actions={<Select value={table} onChange={(e) => setTable(e.target.value)} className="w-52"><option value="">All records</option>{tables.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</Select>} />
      {rows === null ? <SkeletonRows /> : (
        <Table>
          <thead><tr><Th>When</Th><Th>Who</Th><Th>What</Th><Th>Change</Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap text-a-muted">{dateTime(r.at)}</Td>
                <Td className="text-a-muted">{r.actor}</Td>
                <Td><Badge tone={r.op === "delete" ? "bad" : r.op === "insert" ? "good" : "info"}>{r.op}</Badge> <span className="text-xs">{r.table_name.replace(/_/g, " ")}</span></Td>
                <Td className="max-w-[520px] text-xs">
                  {r.op === "update" ? <><div className="truncate text-a-faint line-through">{fmt(r.old_values)}</div><div className="truncate">{fmt(r.new_values)}</div></> : <div className="truncate text-a-muted">{fmt(r.new_values || r.old_values)}</div>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

export default function BooksPage() {
  return (
    <Suspense fallback={null}>
      <BooksInner />
    </Suspense>
  );
}
