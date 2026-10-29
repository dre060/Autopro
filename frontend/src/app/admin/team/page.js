// frontend/src/app/admin/team/page.js — employees, app access, timesheets, payroll
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UserCog, Plus, Clock, Banknote, ShieldCheck, Printer, Ban, CheckCircle2, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { money, date as fmtDate, isoDay } from "@/lib/format";
import { r2, n0, calcStub, applyTaxes, hoursByWeek, PERIODS_PER_YEAR, toDay, parseDay } from "@/lib/books";
import {
  Button, Card, CardHeader, PageHeader, Segmented, Table, Th, Td, Input, Modal, TextField, Stat, Badge, Toggle, EmptyState, SkeletonRows, ErrorBanner, IconButton, cx, useUI,
} from "@/components/admin/ui";
import { useAdmin, ROLE_LABEL } from "@/components/admin/AdminContext";
import { useRates, useAccounts, ExportButtons, EstimateNote } from "@/components/admin/booksKit";

const PAY_TYPE = { hourly: "Hourly", salary: "Salary", flat_rate: "Flat rate (per flag hour)", commission: "Commission only" };
const fullName = (e) => [e?.first_name, e?.last_name].filter(Boolean).join(" ");
const hrs = (t) => (t.clock_out ? Math.max((new Date(t.clock_out) - new Date(t.clock_in)) / 3600000 - (t.break_minutes || 0) / 60, 0) : 0);
const localInput = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  return `${toDay(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function TeamInner() {
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") || "team");
  const [employees, setEmployees] = useState(null);
  const load = () => supabase.from("employees").select("*").order("active", { ascending: false }).order("first_name").then(({ data }) => setEmployees(data || []));
  useEffect(() => {
    load();
  }, []);
  return (
    <>
      <PageHeader
        title="Team & payroll"
        description="Who works here, their hours, and what they're paid. W-2 and 1099 workers both supported."
        actions={<Segmented value={tab} onChange={setTab} options={[
          { value: "team", label: "Team" }, { value: "time", label: "Timesheets" }, { value: "payroll", label: "Payroll" }, { value: "access", label: "App access" },
        ]} />}
      />
      {employees === null ? <Card><SkeletonRows /></Card> :
        tab === "team" ? <People employees={employees} reload={load} /> :
        tab === "time" ? <Timesheets employees={employees} /> :
        tab === "payroll" ? <Payroll employees={employees} /> :
        <Access employees={employees} />}
    </>
  );
}

// =================================================================== people
function People({ employees, reload }) {
  const { toast } = useUI();
  const { isOwner } = useAdmin();
  const [edit, setEdit] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const list = employees.filter((e) => showInactive || e.active);

  const open = async (e) => {
    let tin = {};
    if (isOwner && e.id) {
      const { data } = await supabase.from("tax_ids").select("tin, tin_type").eq("party_type", "employee").eq("party_id", e.id).maybeSingle();
      tin = { tin: data?.tin || "", _tin: data?.tin || "", tin_type: data?.tin_type || "SSN" };
    }
    setEdit({ ...e, ...tin });
  };

  const save = async () => {
    if (!edit.first_name?.trim()) return toast("Enter a first name", "bad");
    const t = (x) => (String(x ?? "").trim() || null);
    const payload = {
      first_name: edit.first_name.trim(), last_name: t(edit.last_name), email: t(edit.email)?.toLowerCase() || null, phone: t(edit.phone), title: t(edit.title),
      address_street: t(edit.address_street), address_city: t(edit.address_city), address_state: t(edit.address_state), address_zip: t(edit.address_zip),
      worker_type: edit.worker_type, pay_type: edit.pay_type, pay_rate: r2(n0(edit.pay_rate)), commission_pct: n0(edit.commission_pct),
      overtime_eligible: edit.worker_type === "w2" && Boolean(edit.overtime_eligible), federal_withholding_pct: n0(edit.federal_withholding_pct),
      pay_frequency: edit.pay_frequency, hire_date: edit.hire_date || null, termination_date: edit.termination_date || null, active: Boolean(edit.active), notes: t(edit.notes),
    };
    const res = edit.id ? await supabase.from("employees").update(payload).eq("id", edit.id).select().single() : await supabase.from("employees").insert(payload).select().single();
    if (res.error) return toast(res.error.message, "bad");
    if (isOwner && edit.tin !== undefined && edit.tin !== edit._tin) {
      const { error } = await supabase.from("tax_ids").upsert({ party_type: "employee", party_id: res.data.id, tin: t(edit.tin), tin_type: edit.tin_type || "SSN", legal_name: fullName(payload) }, { onConflict: "party_type,party_id" });
      if (error) return toast(error.message, "bad");
    }
    toast("Saved");
    setEdit(null);
    reload();
  };

  const blank = { first_name: "", worker_type: "w2", pay_type: "hourly", pay_rate: "", commission_pct: "", overtime_eligible: true, federal_withholding_pct: "", pay_frequency: "weekly", active: true, hire_date: isoDay() };

  return (
    <Card>
      <CardHeader title="People" icon={UserCog} actions={<>
        <Toggle checked={showInactive} onChange={setShowInactive} label="Show former" />
        <Button size="sm" variant="primary" icon={Plus} onClick={() => setEdit(blank)}>Add person</Button>
      </>} />
      {list.length === 0 ? (
        <EmptyState icon={UserCog} title="No one added yet" description="Add technicians, office staff and 1099 contractors to track hours and pay." action={<Button variant="primary" icon={Plus} onClick={() => setEdit(blank)}>Add person</Button>} />
      ) : (
        <Table>
          <thead><tr><Th>Name</Th><Th>Type</Th><Th>Pay</Th><Th className="hidden md:table-cell">Contact</Th></tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} className={cx("cursor-pointer hover:bg-a-hover/50", !e.active && "opacity-50")} onClick={() => open(e)}>
                <Td><div className="font-medium">{fullName(e)}</div><div className="text-xs text-a-faint">{e.title || "—"}</div></Td>
                <Td><Badge tone={e.worker_type === "w2" ? "info" : "violet"}>{e.worker_type === "w2" ? "W-2 employee" : "1099 contractor"}</Badge></Td>
                <Td>{e.pay_type === "salary" ? `${money(e.pay_rate)}/yr` : e.pay_type === "commission" ? `${e.commission_pct}%` : `${money(e.pay_rate)}/${e.pay_type === "flat_rate" ? "flag hr" : "hr"}`}{Number(e.commission_pct) > 0 && e.pay_type !== "commission" && ` + ${e.commission_pct}%`}</Td>
                <Td className="hidden text-a-muted md:table-cell">{[e.phone, e.email].filter(Boolean).join(" · ") || "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} size="lg" title={edit?.id ? fullName(edit) : "Add person"}
        footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {edit && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <TextField label="First name" required value={edit.first_name || ""} onChange={(e) => setEdit({ ...edit, first_name: e.target.value })} />
            <TextField label="Last name" value={edit.last_name || ""} onChange={(e) => setEdit({ ...edit, last_name: e.target.value })} />
            <TextField className="col-span-2" label="Job title" value={edit.title || ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Lead technician" />
            <TextField className="col-span-2" label="Email" value={edit.email || ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
            <TextField className="col-span-2" label="Phone" value={edit.phone || ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
            <TextField className="col-span-2 md:col-span-4" label="Street" value={edit.address_street || ""} onChange={(e) => setEdit({ ...edit, address_street: e.target.value })} />
            <TextField className="col-span-2" label="City" value={edit.address_city || ""} onChange={(e) => setEdit({ ...edit, address_city: e.target.value })} />
            <TextField label="State" value={edit.address_state || ""} onChange={(e) => setEdit({ ...edit, address_state: e.target.value })} />
            <TextField label="ZIP" value={edit.address_zip || ""} onChange={(e) => setEdit({ ...edit, address_zip: e.target.value })} />
            <div className="col-span-2 md:col-span-4"><Segmented value={edit.worker_type} onChange={(v) => setEdit({ ...edit, worker_type: v })} options={[{ value: "w2", label: "W-2 employee" }, { value: "1099", label: "1099 contractor" }]} /></div>
            <TextField className="col-span-2" as="select" label="Paid by" value={edit.pay_type} onChange={(e) => setEdit({ ...edit, pay_type: e.target.value })}>
              {Object.entries(PAY_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </TextField>
            {edit.pay_type !== "commission" && <TextField label={edit.pay_type === "salary" ? "Salary per year" : edit.pay_type === "flat_rate" ? "Per flag hour" : "Per hour"} inputMode="decimal" value={edit.pay_rate ?? ""} onChange={(e) => setEdit({ ...edit, pay_rate: e.target.value })} />}
            <TextField label="Commission %" inputMode="decimal" value={edit.commission_pct ?? ""} onChange={(e) => setEdit({ ...edit, commission_pct: e.target.value })} hint="Of labor + parts sold" />
            <TextField as="select" label="Pay schedule" value={edit.pay_frequency} onChange={(e) => setEdit({ ...edit, pay_frequency: e.target.value })}>
              <option value="weekly">Weekly</option><option value="biweekly">Every 2 weeks</option><option value="semimonthly">Twice a month</option><option value="monthly">Monthly</option>
            </TextField>
            {edit.worker_type === "w2" && <TextField label="Federal withholding %" inputMode="decimal" value={edit.federal_withholding_pct ?? ""} onChange={(e) => setEdit({ ...edit, federal_withholding_pct: e.target.value })} hint="From their W-4 / your payroll provider" />}
            <TextField label="Hire date" type="date" value={edit.hire_date || ""} onChange={(e) => setEdit({ ...edit, hire_date: e.target.value })} />
            <TextField label="End date" type="date" value={edit.termination_date || ""} onChange={(e) => setEdit({ ...edit, termination_date: e.target.value })} />
            {edit.worker_type === "w2" && <div className="col-span-2"><Toggle checked={Boolean(edit.overtime_eligible)} onChange={(v) => setEdit({ ...edit, overtime_eligible: v })} label="Overtime after 40 hrs/week (1.5×)" /></div>}
            <div className="col-span-2"><Toggle checked={Boolean(edit.active)} onChange={(v) => setEdit({ ...edit, active: v })} label="Currently working here" /></div>
            {isOwner ? (
              <>
                <TextField as="select" label="ID type" value={edit.tin_type || "SSN"} onChange={(e) => setEdit({ ...edit, tin_type: e.target.value })}><option>SSN</option><option>EIN</option><option>ITIN</option></TextField>
                <TextField className="col-span-1 md:col-span-3" label={edit.worker_type === "1099" ? "Taxpayer ID (for 1099)" : "SSN (for W-2)"} value={edit.tin || ""} onChange={(e) => setEdit({ ...edit, tin: e.target.value })} autoComplete="off" hint="Owners only. Never shown in logs." />
              </>
            ) : <p className="col-span-2 text-xs text-a-faint md:col-span-4">Only the owner can see taxpayer IDs.</p>}
            <TextField className="col-span-2 md:col-span-4" as="textarea" rows={2} label="Notes" value={edit.notes || ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
          </div>
        )}
      </Modal>
    </Card>
  );
}

// =================================================================== timesheets
function Timesheets({ employees }) {
  const { toast, confirm } = useUI();
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    return toDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)));
  });
  const [entries, setEntries] = useState(null);
  const [edit, setEdit] = useState(null);
  const end = toDay(new Date(parseDay(weekStart).getTime() + 7 * 86400000));

  const load = () => supabase.from("time_entries").select("*, ro:repair_orders(number)").gte("clock_in", `${weekStart}T00:00:00`).lt("clock_in", `${end}T00:00:00`).order("clock_in").then(({ data }) => setEntries(data || []));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const shift = (days) => setWeekStart(toDay(new Date(parseDay(weekStart).getTime() + days * 86400000)));
  const active = employees.filter((e) => e.active);

  const save = async () => {
    if (!edit.employee_id || !edit.clock_in) return toast("Pick a person and start time", "bad");
    const payload = {
      employee_id: edit.employee_id, clock_in: new Date(edit.clock_in).toISOString(), clock_out: edit.clock_out ? new Date(edit.clock_out).toISOString() : null,
      break_minutes: Math.max(parseInt(edit.break_minutes, 10) || 0, 0), notes: edit.notes?.trim() || null, approved: Boolean(edit.approved),
    };
    const res = edit.id ? await supabase.from("time_entries").update(payload).eq("id", edit.id) : await supabase.from("time_entries").insert(payload);
    if (res.error) return toast(res.error.message, "bad");
    setEdit(null);
    load();
  };
  const remove = async () => {
    if (!(await confirm({ title: "Delete this time entry?", danger: true, confirmLabel: "Delete" }))) return;
    await supabase.from("time_entries").delete().eq("id", edit.id);
    setEdit(null);
    load();
  };
  const approveAll = async () => {
    const ids = (entries || []).filter((t) => t.clock_out && !t.approved).map((t) => t.id);
    if (!ids.length) return;
    await supabase.from("time_entries").update({ approved: true }).in("id", ids);
    toast(`Approved ${ids.length} entr${ids.length === 1 ? "y" : "ies"}`);
    load();
  };

  return (
    <Card>
      <CardHeader title={`Week of ${fmtDate(weekStart, { month: "short", day: "numeric", year: "numeric" })}`} icon={Clock}
        description="Mon–Sun workweek. Technicians clock in from the app; you can add or fix entries here."
        actions={<>
          <IconButton icon={ChevronLeft} label="Previous week" onClick={() => shift(-7)} />
          <IconButton icon={ChevronRight} label="Next week" onClick={() => shift(7)} />
          <Button size="sm" icon={CheckCircle2} onClick={approveAll}>Approve all</Button>
          <Button size="sm" variant="primary" icon={Plus} onClick={() => setEdit({ employee_id: active[0]?.id || "", clock_in: `${isoDay()}T08:00`, clock_out: `${isoDay()}T17:00`, break_minutes: 30 })}>Add time</Button>
        </>} />
      {entries === null ? <SkeletonRows /> : (
        <div className="space-y-4 px-1 pb-4">
          {active.map((emp) => {
            const mine = entries.filter((t) => t.employee_id === emp.id);
            const total = mine.reduce((s, t) => s + hrs(t), 0);
            const ot = emp.overtime_eligible ? Math.max(total - 40, 0) : 0;
            return (
              <div key={emp.id}>
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="font-medium">{fullName(emp)}</div>
                  <div className="text-sm tnum">{total.toFixed(2)} hrs {ot > 0 && <Badge tone="warn" className="ml-1">{ot.toFixed(2)} OT</Badge>}</div>
                </div>
                {mine.length > 0 && (
                  <Table>
                    <tbody>
                      {mine.map((t) => (
                        <tr key={t.id} className="cursor-pointer hover:bg-a-hover/50" onClick={() => setEdit({ ...t, clock_in: localInput(t.clock_in), clock_out: localInput(t.clock_out) })}>
                          <Td className="w-40 text-a-muted">{fmtDate(t.clock_in, { weekday: "short", month: "short", day: "numeric" })}</Td>
                          <Td>{new Date(t.clock_in).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – {t.clock_out ? new Date(t.clock_out).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : <Badge tone="good" dot>On the clock</Badge>}</Td>
                          <Td className="hidden text-a-muted sm:table-cell">{t.ro ? `RO #${t.ro.number}` : ""}{t.break_minutes ? ` · ${t.break_minutes}m break` : ""}</Td>
                          <Td align="right">{hrs(t).toFixed(2)}</Td>
                          <Td className="w-24">{t.approved ? <Badge tone="good">Approved</Badge> : t.clock_out ? <Badge>Pending</Badge> : null}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            );
          })}
          {!active.length && <EmptyState icon={Clock} title="Add people first" description="Then they can clock in from the app." />}
        </div>
      )}
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.id ? "Edit time" : "Add time"}
        footer={<>{edit?.id && <Button variant="danger" icon={Trash2} className="mr-auto" onClick={remove}>Delete</Button>}<Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            <TextField className="col-span-2" as="select" label="Person" value={edit.employee_id} onChange={(e) => setEdit({ ...edit, employee_id: e.target.value })}>
              {employees.map((e) => <option key={e.id} value={e.id}>{fullName(e)}</option>)}
            </TextField>
            <TextField label="In" type="datetime-local" value={edit.clock_in} onChange={(e) => setEdit({ ...edit, clock_in: e.target.value })} />
            <TextField label="Out" type="datetime-local" value={edit.clock_out || ""} onChange={(e) => setEdit({ ...edit, clock_out: e.target.value })} />
            <TextField label="Unpaid break (min)" inputMode="numeric" value={edit.break_minutes ?? 0} onChange={(e) => setEdit({ ...edit, break_minutes: e.target.value })} />
            <div className="flex items-end"><Toggle checked={Boolean(edit.approved)} onChange={(v) => setEdit({ ...edit, approved: v })} label="Approved" /></div>
            <TextField className="col-span-2" label="Notes" value={edit.notes || ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
          </div>
        )}
      </Modal>
    </Card>
  );
}

// =================================================================== payroll
function Payroll({ employees }) {
  const { toast, confirm } = useUI();
  const rates = useRates();
  const { byCode } = useAccounts();
  const [runs, setRuns] = useState(null);
  const [draft, setDraft] = useState(null);
  const [view, setView] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => supabase.from("pay_runs").select("*, stubs:pay_stubs(*, employee:employees(first_name,last_name,worker_type))").order("pay_date", { ascending: false }).limit(60).then(({ data }) => setRuns(data || []));
  useEffect(() => {
    load();
  }, []);

  const start = async () => {
    const d = new Date();
    const lastSun = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 7) % 7 || 7));
    const s = new Date(lastSun.getFullYear(), lastSun.getMonth(), lastSun.getDate() - 6);
    setDraft({ period_start: toDay(s), period_end: toDay(lastSun), pay_date: isoDay(), paid_from: "1010", stubs: null });
  };

  const calculate = async () => {
    setBusy(true);
    const { period_start: ps, period_end: pe } = draft;
    const year = pe.slice(0, 4);
    const [te, labor, ytdStubs] = await Promise.all([
      supabase.from("time_entries").select("*").gte("clock_in", `${ps}T00:00:00`).lte("clock_in", `${pe}T23:59:59`),
      supabase.from("repair_order_items").select("quantity, unit_price, kind, technician, ro:repair_orders!inner(technician, invoiced_at, voided_at)")
        .gte("ro.invoiced_at", `${ps}T00:00:00`).lte("ro.invoiced_at", `${pe}T23:59:59`).is("ro.voided_at", null).eq("approved", true),
      supabase.from("pay_stubs").select("employee_id, gross, pay_run:pay_runs!inner(status, pay_date)").eq("pay_run.status", "paid").gte("pay_run.pay_date", `${year}-01-01`).lt("pay_run.pay_date", ps),
    ]);
    const ytd = {};
    (ytdStubs.data || []).forEach((s) => (ytd[s.employee_id] = (ytd[s.employee_id] || 0) + Number(s.gross)));
    const stubs = employees.filter((e) => e.active).map((emp) => {
      const name = fullName(emp).toLowerCase();
      const mine = (labor.data || []).filter((i) => (i.technician || i.ro?.technician || "").toLowerCase() === name);
      const flat = mine.filter((i) => i.kind === "labor").reduce((s, i) => s + Number(i.quantity), 0);
      const sold = mine.filter((i) => ["labor", "part"].includes(i.kind)).reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
      const stub = calcStub({
        emp, entries: (te.data || []).filter((t) => t.employee_id === emp.id), flatRateHours: flat, commissionBase: sold,
        periodsPerYear: PERIODS_PER_YEAR[emp.pay_frequency] || 52, ytdGross: ytd[emp.id] || 0, ytdFuta: ytd[emp.id] || 0, rates, on: pe,
      });
      return { ...stub, employee_id: emp.id, worker_type: emp.worker_type, emp, ytd: ytd[emp.id] || 0, include: stub.gross > 0 || emp.pay_type === "salary" };
    });
    setDraft((d) => ({ ...d, stubs }));
    setBusy(false);
  };

  const editStub = (id, patch) => setDraft((d) => ({
    ...d,
    stubs: d.stubs.map((s) => {
      if (s.employee_id !== id) return s;
      const merged = { ...s, ...patch };
      if ("regular_hours" in patch || "overtime_hours" in patch || "flat_rate_hours" in patch) {
        merged.regular_pay = r2(n0(merged.regular_hours) * (s.emp.pay_type === "hourly" ? merged.rate : 0));
        merged.overtime_pay = r2(n0(merged.overtime_hours) * merged.rate * 1.5);
        merged.flat_rate_pay = r2(n0(merged.flat_rate_hours) * (s.emp.pay_type === "flat_rate" ? merged.rate : 0));
      }
      const manual = "fed_withholding" in patch ? n0(patch.fed_withholding) : s.fed_withholding_set ? s.fed_withholding : undefined;
      const taxed = applyTaxes({ ...merged, fed_withholding_manual: manual }, { emp: s.emp, ytdGross: s.ytd, ytdFuta: s.ytd, rates, on: draft.period_end });
      return { ...taxed, emp: s.emp, ytd: s.ytd, include: merged.include, fed_withholding_set: s.fed_withholding_set || "fed_withholding" in patch };
    }),
  }));

  const saveRun = async (paid) => {
    const stubs = draft.stubs.filter((s) => s.include);
    if (!stubs.length) return toast("No one to pay", "bad");
    setBusy(true);
    const { data: run, error } = await supabase.from("pay_runs").insert({
      period_start: draft.period_start, period_end: draft.period_end, pay_date: draft.pay_date, status: "draft", paid_from_account_id: byCode(draft.paid_from)?.id,
    }).select().single();
    if (error) { setBusy(false); return toast(error.message, "bad"); }
    const cols = ["regular_hours", "overtime_hours", "flat_rate_hours", "rate", "regular_pay", "overtime_pay", "flat_rate_pay", "salary_pay", "commission_pay", "bonus", "reimbursement", "fed_withholding", "ss_employee", "medicare_employee", "other_deductions", "ss_employer", "medicare_employer", "futa", "suta"];
    const { error: e2 } = await supabase.from("pay_stubs").insert(stubs.map((s) => ({
      pay_run_id: run.id, employee_id: s.employee_id, worker_type: s.worker_type, method: s.method || null, check_number: s.check_number || null,
      ...Object.fromEntries(cols.map((c) => [c, r2(n0(s[c]))])),
    })));
    if (e2) { setBusy(false); return toast(e2.message, "bad"); }
    if (paid) await supabase.from("pay_runs").update({ status: "paid" }).eq("id", run.id);
    setBusy(false);
    toast(paid ? "Payroll recorded and posted to the books" : "Saved as draft");
    setDraft(null);
    load();
  };

  const markPaid = async (run) => {
    const { error } = await supabase.from("pay_runs").update({ status: "paid" }).eq("id", run.id);
    if (error) return toast(error.message, "bad");
    load();
    setView(null);
  };
  const voidRun = async (run) => {
    if (!(await confirm({ title: "Void this payroll?", message: "It stays on file; a reversing entry is posted. Re-run payroll to correct it.", danger: true, confirmLabel: "Void" }))) return;
    await supabase.from("pay_runs").update({ status: "void", voided_at: new Date().toISOString() }).eq("id", run.id);
    setView(null);
    load();
  };

  const year = String(new Date().getFullYear());
  const paidThisYear = (runs || []).filter((r) => r.status === "paid" && r.pay_date.startsWith(year));
  const gross = paidThisYear.flatMap((r) => r.stubs).reduce((s, x) => s + Number(x.gross), 0);
  const liab = paidThisYear.flatMap((r) => r.stubs).reduce((s, x) => s + Number(x.fed_withholding) + Number(x.ss_employee) + Number(x.medicare_employee) + Number(x.ss_employer) + Number(x.medicare_employer), 0);

  const ytdRows = useMemo(() => {
    const m = {};
    paidThisYear.forEach((r) => r.stubs.forEach((s) => {
      const k = s.employee_id;
      m[k] = m[k] || { name: fullName(s.employee), type: s.worker_type, gross: 0, fed: 0, ss: 0, med: 0, net: 0, hours: 0 };
      m[k].gross += Number(s.gross); m[k].fed += Number(s.fed_withholding); m[k].ss += Number(s.ss_employee); m[k].med += Number(s.medicare_employee); m[k].net += Number(s.net_pay);
      m[k].hours += Number(s.regular_hours) + Number(s.overtime_hours);
    }));
    return Object.values(m).map((x) => ({ ...x, gross: r2(x.gross), fed: r2(x.fed), ss: r2(x.ss), med: r2(x.med), net: r2(x.net), hours: r2(x.hours) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label={`Gross pay ${year}`} value={money(gross)} icon={Banknote} />
        <Stat label="Payroll taxes & withholding" value={money(liab)} sub="Deposit with the IRS (EFTPS) — record as an expense: Payroll tax deposit" tone="warn" />
        <Stat label="Pay runs" value={paidThisYear.length} sub="this year" tone="info" />
      </div>
      <Card>
        <CardHeader title="Pay runs" icon={Banknote} actions={<Button size="sm" variant="primary" icon={Plus} onClick={start}>Run payroll</Button>} />
        {runs === null ? <SkeletonRows /> : runs.length === 0 ? (
          <EmptyState icon={Banknote} title="No payroll yet" description="Run payroll from approved timesheets. Hours, overtime, flat-rate and commission are figured for you." />
        ) : (
          <Table>
            <thead><tr><Th>Period</Th><Th>Pay date</Th><Th>Status</Th><Th align="right">Gross</Th><Th align="right">Net</Th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className={cx("cursor-pointer hover:bg-a-hover/50", r.status === "void" && "opacity-50")} onClick={() => setView(r)}>
                  <Td className="font-medium">{fmtDate(r.period_start, { month: "short", day: "numeric" })} – {fmtDate(r.period_end)}</Td>
                  <Td>{fmtDate(r.pay_date)}</Td>
                  <Td><Badge tone={r.status === "paid" ? "good" : r.status === "void" ? "neutral" : "warn"} dot>{r.status}</Badge></Td>
                  <Td align="right">{money(r.stubs.reduce((s, x) => s + Number(x.gross), 0))}</Td>
                  <Td align="right">{money(r.stubs.reduce((s, x) => s + Number(x.net_pay), 0))}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title={`Year-to-date by person · ${year}`} description="For W-2s and 1099s (see Year-end for the 1099 export)" actions={
          <ExportButtons filename={`payroll-ytd-${year}`} rows={ytdRows} columns={[
            { label: "Name", value: "name" }, { label: "Type", value: "type" }, { label: "Hours", value: "hours" }, { label: "Gross", value: "gross" },
            { label: "Federal withholding", value: "fed" }, { label: "Social Security", value: "ss" }, { label: "Medicare", value: "med" }, { label: "Net", value: "net" },
          ]} />} />
        <Table>
          <thead><tr><Th>Name</Th><Th>Type</Th><Th align="right">Hours</Th><Th align="right">Gross</Th><Th align="right">Withheld</Th><Th align="right">Net</Th></tr></thead>
          <tbody>
            {ytdRows.length === 0 && <tr><Td colSpan={6} className="text-a-faint">No paid payroll this year</Td></tr>}
            {ytdRows.map((x) => (
              <tr key={x.name}><Td className="font-medium">{x.name}</Td><Td>{x.type === "w2" ? "W-2" : "1099"}</Td><Td align="right">{x.hours}</Td><Td align="right">{money(x.gross)}</Td><Td align="right">{money(x.fed + x.ss + x.med)}</Td><Td align="right">{money(x.net)}</Td></tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* run payroll */}
      <Modal open={Boolean(draft)} onClose={() => setDraft(null)} size="xl" title="Run payroll"
        description="Figures are estimates. If you use a payroll service, enter its withholding numbers."
        footer={draft?.stubs && <><Button onClick={() => setDraft(null)}>Cancel</Button><Button loading={busy} onClick={() => saveRun(false)}>Save draft</Button><Button variant="primary" loading={busy} onClick={() => saveRun(true)}>Record as paid</Button></>}>
        {draft && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <TextField label="Period start" type="date" value={draft.period_start} onChange={(e) => setDraft({ ...draft, period_start: e.target.value, stubs: null })} />
              <TextField label="Period end" type="date" value={draft.period_end} onChange={(e) => setDraft({ ...draft, period_end: e.target.value, stubs: null })} />
              <TextField label="Pay date" type="date" value={draft.pay_date} onChange={(e) => setDraft({ ...draft, pay_date: e.target.value })} />
              <TextField as="select" label="Paid from" value={draft.paid_from} onChange={(e) => setDraft({ ...draft, paid_from: e.target.value })}><option value="1010">Business checking</option><option value="1000">Cash</option></TextField>
            </div>
            {!draft.stubs ? <Button variant="primary" loading={busy} disabled={!rates} onClick={calculate}>Calculate from timesheets</Button> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead><tr className="text-left text-[11.5px] uppercase text-a-faint">
                    <th className="p-2" /><th className="p-2">Person</th><th className="p-2">Reg hrs</th><th className="p-2">OT hrs</th><th className="p-2">Flag hrs</th><th className="p-2">Bonus</th><th className="p-2">Reimb.</th><th className="p-2">Fed W/H</th><th className="p-2 text-right">Gross</th><th className="p-2 text-right">FICA</th><th className="p-2 text-right">Net</th>
                  </tr></thead>
                  <tbody>
                    {draft.stubs.map((s) => (
                      <tr key={s.employee_id} className={cx("border-t border-a-line", !s.include && "opacity-50")}>
                        <td className="p-2"><input type="checkbox" className="a-check" checked={s.include} onChange={(e) => editStub(s.employee_id, { include: e.target.checked })} /></td>
                        <td className="p-2"><div className="font-medium">{fullName(s.emp)}</div><div className="text-xs text-a-faint">{s.worker_type === "w2" ? "W-2" : "1099"} · {PAY_TYPE[s.emp.pay_type]}</div></td>
                        {["regular_hours", "overtime_hours", "flat_rate_hours", "bonus", "reimbursement"].map((f) => (
                          <td key={f} className="p-1"><Input className="h-8 w-20 text-right" inputMode="decimal" value={s[f]} onChange={(e) => editStub(s.employee_id, { [f]: e.target.value })} /></td>
                        ))}
                        <td className="p-1"><Input className="h-8 w-20 text-right" inputMode="decimal" disabled={s.worker_type !== "w2"} value={s.fed_withholding} onChange={(e) => editStub(s.employee_id, { fed_withholding: e.target.value })} /></td>
                        <td className="p-2 text-right tnum">{money(s.gross)}</td>
                        <td className="p-2 text-right tnum text-a-muted">{money(s.ss_employee + s.medicare_employee)}</td>
                        <td className="p-2 text-right font-semibold tnum">{money(s.net_pay)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <EstimateNote className="mt-3">Overtime is 1.5× over 40 hours per Mon–Sun week. Employer Social Security, Medicare, FUTA and Florida reemployment tax are added to payroll tax expense automatically. Confirm withholding with your CPA or payroll provider.</EstimateNote>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* view run / pay stubs */}
      <Modal open={Boolean(view)} onClose={() => setView(null)} size="xl" title={view && `Payroll ${fmtDate(view.period_start, { month: "short", day: "numeric" })} – ${fmtDate(view.period_end)}`}
        footer={view && <>
          {view.status !== "void" && <Button variant="danger" icon={Ban} className="mr-auto" onClick={() => voidRun(view)}>Void</Button>}
          <Button icon={Printer} onClick={() => window.print()}>Print stubs</Button>
          {view.status === "draft" && <Button variant="primary" onClick={() => markPaid(view)}>Record as paid</Button>}
        </>}>
        {view && (
          <div className="print-sheet space-y-4">
            {view.stubs.map((s) => (
              <div key={s.id} className="rounded-lg border border-a-line p-4" style={{ breakInside: "avoid" }}>
                <div className="flex justify-between"><div className="font-semibold">{fullName(s.employee)}</div><div className="text-sm text-a-muted">Pay date {fmtDate(view.pay_date)}</div></div>
                <div className="mt-2 grid grid-cols-2 gap-x-6 text-sm sm:grid-cols-4">
                  {[["Regular hrs", s.regular_hours], ["OT hrs", s.overtime_hours], ["Flag hrs", s.flat_rate_hours]].map(([l, v]) => <div key={l} className="flex justify-between"><span className="text-a-muted">{l}</span><span>{v}</span></div>)}
                  {[["Gross", s.gross], ["Fed W/H", s.fed_withholding], ["Soc. Sec.", s.ss_employee], ["Medicare", s.medicare_employee], ["Reimb.", s.reimbursement], ["Net pay", s.net_pay]].map(([l, v]) => <div key={l} className="flex justify-between"><span className="text-a-muted">{l}</span><span className="tnum">{money(v)}</span></div>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

// =================================================================== app access
function Access({ employees }) {
  const { toast } = useUI();
  const { isOwner, user } = useAdmin();
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null);
  const load = () => supabase.from("admin_users").select("*").order("created_at").then(({ data }) => setRows(data || []));
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    const email = edit.email?.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || "")) return toast("Enter a valid email", "bad");
    const payload = { email, full_name: edit.full_name?.trim() || null, role: edit.role, active: Boolean(edit.active), employee_id: edit.employee_id || null };
    const res = edit._existing ? await supabase.from("admin_users").update(payload).eq("email", edit._existing) : await supabase.from("admin_users").insert(payload);
    if (res.error) return toast(res.error.message.includes("owner") ? "There must always be at least one active owner." : res.error.message, "bad");
    toast("Access saved");
    setEdit(null);
    load();
  };

  return (
    <Card>
      <CardHeader title="Who can sign in" icon={ShieldCheck}
        description="Owners see everything. Managers run the shop. Bookkeeper/CPA gets read-only reports and books. Technicians only see the time clock and their jobs, with no prices, costs or profit."
        actions={isOwner && <Button size="sm" variant="primary" icon={Plus} onClick={() => setEdit({ email: "", role: "technician", active: true })}>Give access</Button>} />
      {rows === null ? <SkeletonRows rows={3} /> : (
        <Table>
          <thead><tr><Th>Email</Th><Th>Role</Th><Th>Employee</Th><Th>Status</Th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const emp = employees.find((e) => e.id === r.employee_id);
              return (
                <tr key={r.email} className={cx(isOwner && "cursor-pointer hover:bg-a-hover/50")} onClick={() => isOwner && setEdit({ ...r, _existing: r.email })}>
                  <Td className="font-medium">{r.email}{r.email === user?.email && <span className="ml-1 text-xs text-a-faint">(you)</span>}</Td>
                  <Td><Badge tone={r.role === "owner" ? "accent" : r.role === "technician" ? "neutral" : "info"}>{ROLE_LABEL[r.role]}</Badge></Td>
                  <Td className="text-a-muted">{emp ? fullName(emp) : "—"}</Td>
                  <Td>{r.active ? <Badge tone="good" dot>Active</Badge> : <Badge>Off</Badge>}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <p className="px-5 py-3 text-xs text-a-faint">New people sign in at /admin/login with “Email me a link” using this exact email. If you turned off sign-ups in Supabase, invite them there first (Authentication → Users → Invite).</p>
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?._existing ? edit._existing : "Give access"}
        footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            <TextField className="col-span-2" label="Email" value={edit.email} disabled={Boolean(edit._existing)} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
            <TextField label="Name" value={edit.full_name || ""} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} />
            <TextField as="select" label="Role" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </TextField>
            <TextField className="col-span-2" as="select" label="Linked employee (for the time clock)" value={edit.employee_id || ""} onChange={(e) => setEdit({ ...edit, employee_id: e.target.value })}>
              <option value="">—</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{fullName(e)}</option>)}
            </TextField>
            <div className="col-span-2"><Toggle checked={Boolean(edit.active)} onChange={(v) => setEdit({ ...edit, active: v })} label="Can sign in" /></div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={null}>
      <TeamInner />
    </Suspense>
  );
}
