// frontend/src/components/admin/BooksSettings.js — accounting choices + dated tax rates (Settings page)
"use client";

import { useEffect, useMemo, useState } from "react";
import { Landmark, Save, Plus, Trash2, CalendarRange } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { date as fmtDate } from "@/lib/format";
import { FL_COUNTIES, FEE_CODES, n0 } from "@/lib/books";
import { Button, Card, CardHeader, TextField, Toggle, Input, Select, Table, Th, Td, Modal, IconButton, useUI } from "./ui";
import { useAdmin, DEFAULT_BOOKS } from "./AdminContext";
import { clearRatesCache } from "./booksKit";

const RATE_GROUPS = [
  { title: "Florida sales tax", codes: ["fl_state_rate", "surtax_item_cap", "tire_fee", "battery_fee", "collection_allowance_rate", "collection_allowance_base", "collection_allowance_max"] },
  { title: "IRS & payroll", codes: ["irs_mileage_rate", "nec_1099_threshold", "fica_ss_rate", "fica_medicare_rate", "ss_wage_base", "futa_rate", "futa_wage_base", "fl_rt_rate", "fl_rt_wage_base", "se_tax_rate", "se_earnings_factor", "qbi_rate", "std_deduction_single", "std_deduction_mfj"] },
];

export default function BooksSettings() {
  const { books, refreshShop, isOwner } = useAdmin();
  const { toast } = useUI();
  const [b, setB] = useState(books);
  const [saving, setSaving] = useState(false);
  const [rates, setRates] = useState([]);
  const [newRate, setNewRate] = useState(null);
  const [county, setCounty] = useState(books.shop_county || "Lake");

  useEffect(() => setB({ ...DEFAULT_BOOKS, ...books }), [books]);
  const loadRates = () => supabase.from("tax_rates").select("*").order("code").order("effective_from", { ascending: false }).then(({ data }) => setRates(data || []));
  useEffect(() => {
    loadRates();
  }, []);

  const set = (k) => (e) => setB({ ...b, [k]: e?.target ? e.target.value : e });
  const fee = (code, patch) => setB({ ...b, fees: { ...b.fees, [code]: { ...(b.fees?.[code] || {}), ...patch } } });

  const save = async () => {
    setSaving(true);
    const value = {
      ...b,
      tax_set_aside_pct: n0(b.tax_set_aside_pct), holding_cost_pct: n0(b.holding_cost_pct ?? 10), owner_salary: n0(b.owner_salary),
      labor_rates: (b.labor_rates || []).filter((r) => r.name?.trim()).map((r) => ({ name: r.name.trim(), rate: n0(r.rate) })),
      markup_matrix: (b.markup_matrix || []).map((m) => ({ upto: m.upto === "" || m.upto == null ? null : n0(m.upto), markup: n0(m.markup) })),
      reminders: { ...b.reminders, days_after_due: String(b.reminders?.days_after_due ?? "").split(/[^\d]+/).filter(Boolean).map(Number) },
      tax_reminder_days: String(b.tax_reminder_days ?? "").split(/[^\d]+/).filter(Boolean).map(Number),
    };
    const { error } = await supabase.from("settings").upsert({ key: "books", category: "accounting", description: "Accounting & tax settings", value }, { onConflict: "key" });
    setSaving(false);
    if (error) return toast(error.message, "bad");
    toast("Accounting settings saved");
    refreshShop();
  };

  const addRate = async () => {
    const { error } = await supabase.from("tax_rates").insert({ code: newRate.code, jurisdiction: newRate.jurisdiction || "", value: n0(newRate.value), effective_from: newRate.effective_from, label: newRate.label || null, source: newRate.source || null });
    if (error) return toast(error.message, "bad");
    toast("Rate added — it applies from its effective date");
    clearRatesCache();
    setNewRate(null);
    loadRates();
  };

  const surtaxFor = useMemo(() => rates.filter((r) => r.code === "surtax" && r.jurisdiction === county), [rates, county]);
  const labelFor = (code) => rates.find((r) => r.code === code)?.label || code;
  const fmtVal = (r) => (Number(r.value) < 1 && !/threshold|base|cap|deduction|fee|max/.test(r.code) ? `${(Number(r.value) * 100).toFixed(3).replace(/\.?0+$/, "")}%` : Number(r.value).toLocaleString("en-US", { maximumFractionDigits: 3 }));

  return (
    <>
      <Card className="xl:col-span-2" id="books">
        <CardHeader icon={Landmark} title="Accounting & tax" description="How the business is taxed and how the app figures Florida tax, fees, reminders and prices."
          actions={<Button variant="primary" size="sm" icon={Save} loading={saving} onClick={save}>Save</Button>} />
        <div className="grid gap-5 px-5 pb-5 lg:grid-cols-3">
          <div className="space-y-3">
            <TextField as="select" label="How the LLC is taxed (federal)" value={b.entity_type} onChange={set("entity_type")} hint="Confirm with your CPA.">
              <option value="single_member">Single-member LLC (Schedule C)</option>
              <option value="partnership">Partnership (Form 1065, K-1s)</option>
              <option value="s_corp">S-corporation election (Form 1120-S)</option>
            </TextField>
            <TextField as="select" label="Owner's filing status" value={b.filing_status} onChange={set("filing_status")}>
              <option value="single">Single</option><option value="mfj">Married filing jointly</option>
            </TextField>
            {b.entity_type === "s_corp" && <TextField label="Owner salary per year" inputMode="decimal" value={b.owner_salary ?? ""} onChange={set("owner_salary")} />}
            <TextField label="Set aside for income tax (% of deposits)" inputMode="decimal" value={b.tax_set_aside_pct ?? ""} onChange={set("tax_set_aside_pct")} />
            <TextField label="Vehicle holding cost (%/yr of cost)" inputMode="decimal" value={b.holding_cost_pct ?? 10} onChange={set("holding_cost_pct")} hint="Floor-plan interest / cost of money" />
          </div>
          <div className="space-y-3">
            <TextField as="select" label="Shop's county (repair surtax)" value={b.shop_county} onChange={set("shop_county")}>{FL_COUNTIES.map((c) => <option key={c}>{c}</option>)}</TextField>
            <TextField as="select" label="DR-15 filing frequency (assigned by DOR)" value={b.dr15_frequency} onChange={set("dr15_frequency")}>
              <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="semiannual">Semiannual</option><option value="annual">Annual</option>
            </TextField>
            <TextField as="select" label="$5,000 surtax cap applies to" value={b.surtax_cap_basis} onChange={set("surtax_cap_basis")} hint="Per item is the usual reading; confirm with your CPA.">
              <option value="line">Each line item</option><option value="invoice">The whole invoice</option>
            </TextField>
            <TextField label="Motor vehicle dealer license #" value={b.dealer_license || ""} onChange={set("dealer_license")} hint="Printed on the buyer's order" />
            <TextField label="Sales-tax reminder days" value={Array.isArray(b.tax_reminder_days) ? b.tax_reminder_days.join(", ") : b.tax_reminder_days} onChange={set("tax_reminder_days")} hint="Day of the month (email + push)" />
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border border-a-line p-3">
              <div className="mb-2 text-[12.5px] font-medium text-a-muted">Payment reminders (unpaid invoices)</div>
              <Toggle checked={b.reminders?.enabled !== false} onChange={(v) => setB({ ...b, reminders: { ...b.reminders, enabled: v } })} label="Send reminders automatically" />
              <TextField className="mt-2" label="Days after due date" value={Array.isArray(b.reminders?.days_after_due) ? b.reminders.days_after_due.join(", ") : b.reminders?.days_after_due || ""} onChange={(e) => setB({ ...b, reminders: { ...b.reminders, days_after_due: e.target.value } })} />
              <div className="mt-2 flex gap-4">
                <Toggle checked={b.reminders?.email !== false} onChange={(v) => setB({ ...b, reminders: { ...b.reminders, email: v } })} label="Email" />
                <Toggle checked={Boolean(b.reminders?.sms)} onChange={(v) => setB({ ...b, reminders: { ...b.reminders, sms: v } })} label="Text (Twilio)" />
              </div>
            </div>
            <div className="rounded-lg border border-a-line p-3">
              <div className="mb-2 text-[12.5px] font-medium text-a-muted">Labor rates</div>
              {(b.labor_rates || []).map((r, i) => (
                <div key={i} className="mb-1.5 grid grid-cols-[1fr_90px_auto] gap-2">
                  <Input className="h-8" value={r.name} onChange={(e) => setB({ ...b, labor_rates: b.labor_rates.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} />
                  <Input className="h-8 text-right" inputMode="decimal" value={r.rate} onChange={(e) => setB({ ...b, labor_rates: b.labor_rates.map((x, k) => (k === i ? { ...x, rate: e.target.value } : x)) })} />
                  <IconButton size="sm" icon={Trash2} label="Remove" onClick={() => setB({ ...b, labor_rates: b.labor_rates.filter((_, k) => k !== i) })} />
                </div>
              ))}
              <Button size="xs" variant="ghost" icon={Plus} onClick={() => setB({ ...b, labor_rates: [...(b.labor_rates || []), { name: "", rate: "" }] })}>Rate</Button>
              <p className="mt-1 text-xs text-a-faint">The first rate is used for new labor lines.</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="mb-2 text-[12.5px] font-medium text-a-muted">Fees on repair orders</div>
            <Table>
              <thead><tr><Th>Fee</Th><Th>Amount</Th><Th>Sales tax</Th></tr></thead>
              <tbody>
                {FEE_CODES.map((f) => {
                  const v = b.fees?.[f.code] || {};
                  const state = f.code === "tire" || f.code === "battery";
                  return (
                    <tr key={f.code}>
                      <Td><Input className="h-8" value={v.label ?? f.label} onChange={(e) => fee(f.code, { label: e.target.value })} /></Td>
                      <Td>
                        {f.code === "shop_supplies" ? (
                          <div className="flex items-center gap-1.5 text-xs"><Input className="h-8 w-16 text-right" value={v.pct ?? ""} onChange={(e) => fee(f.code, { pct: n0(e.target.value) })} />% of labor, max $<Input className="h-8 w-16 text-right" value={v.cap ?? ""} onChange={(e) => fee(f.code, { cap: n0(e.target.value) })} /></div>
                        ) : state ? <span className="text-xs text-a-faint">Set by the state (rates below)</span> : (
                          <div className="flex items-center gap-1 text-xs">$<Input className="h-8 w-20 text-right" value={v.amount ?? ""} onChange={(e) => fee(f.code, { amount: n0(e.target.value) })} /></div>
                        )}
                      </Td>
                      <Td>
                        <Select className="h-8 text-xs" value={v.tax || (state || f.code === "towing" ? "never" : "follow_job")} disabled={state} onChange={(e) => fee(f.code, { tax: e.target.value })}>
                          <option value="follow_job">Taxable when the job has parts</option>
                          <option value="always">Always taxable</option>
                          <option value="never">Never taxable</option>
                        </Select>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
          <div>
            <div className="mb-2 text-[12.5px] font-medium text-a-muted">Parts markup by cost</div>
            {(b.markup_matrix || []).map((m, i) => (
              <div key={i} className="mb-1.5 flex items-center gap-1.5 text-xs">
                cost up to $<Input className="h-8 w-20 text-right" placeholder="any" value={m.upto ?? ""} onChange={(e) => setB({ ...b, markup_matrix: b.markup_matrix.map((x, k) => (k === i ? { ...x, upto: e.target.value } : x)) })} />
                → +<Input className="h-8 w-16 text-right" value={m.markup} onChange={(e) => setB({ ...b, markup_matrix: b.markup_matrix.map((x, k) => (k === i ? { ...x, markup: e.target.value } : x)) })} />%
                <IconButton size="sm" icon={Trash2} label="Remove" onClick={() => setB({ ...b, markup_matrix: b.markup_matrix.filter((_, k) => k !== i) })} />
              </div>
            ))}
            <Button size="xs" variant="ghost" icon={Plus} onClick={() => setB({ ...b, markup_matrix: [...(b.markup_matrix || []), { upto: "", markup: 30 }] })}>Tier</Button>
            <p className="mt-1 text-xs text-a-faint">Used to price a part when you enter its cost.</p>
          </div>
        </div>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader icon={CalendarRange} title="Tax rates & thresholds" description="Every rate has an effective date — add the new value when it changes (e.g. the IRS mileage rate each January). Past transactions keep the rate that applied then."
          actions={isOwner && <Button size="sm" icon={Plus} onClick={() => setNewRate({ code: "irs_mileage_rate", jurisdiction: "", value: "", effective_from: `${new Date().getFullYear() + 1}-01-01` })}>Add rate</Button>} />
        <div className="grid gap-5 px-5 pb-5 lg:grid-cols-3">
          {RATE_GROUPS.map((g) => (
            <div key={g.title}>
              <div className="mb-1 text-[12.5px] font-medium text-a-muted">{g.title}</div>
              <Table>
                <tbody>
                  {g.codes.flatMap((code) => rates.filter((r) => r.code === code).map((r, i) => (
                    <tr key={r.id} className={i > 0 ? "opacity-50" : ""}>
                      <Td className="py-1.5 text-xs">{r.label || code}<div className="text-[11px] text-a-faint">{r.source}</div></Td>
                      <Td className="py-1.5 text-xs text-a-faint">from {fmtDate(r.effective_from, { month: "short", year: "numeric" })}</Td>
                      <Td align="right" className="py-1.5 text-xs font-medium">{fmtVal(r)}</Td>
                    </tr>
                  )))}
                </tbody>
              </Table>
            </div>
          ))}
          <div>
            <div className="mb-1 flex items-center justify-between text-[12.5px] font-medium text-a-muted">
              County surtax (DR-15DSS)
              <Select className="h-8 w-40 text-xs" value={county} onChange={(e) => setCounty(e.target.value)}>{FL_COUNTIES.map((c) => <option key={c}>{c}</option>)}</Select>
            </div>
            <Table><tbody>
              {surtaxFor.map((r) => <tr key={r.id}><Td className="py-1.5 text-xs">{r.jurisdiction}<div className="text-[11px] text-a-faint">{r.source}</div></Td><Td className="py-1.5 text-xs text-a-faint">from {fmtDate(r.effective_from, { month: "short", year: "numeric" })}</Td><Td align="right" className="py-1.5 text-xs font-medium">{(Number(r.value) * 100).toFixed(1)}%</Td></tr>)}
            </tbody></Table>
            <p className="mt-2 text-xs text-a-faint">Florida updates these each January. Add the new rates with “Add rate” → code <span className="font-mono">surtax</span>.</p>
          </div>
        </div>
      </Card>

      <Modal open={Boolean(newRate)} onClose={() => setNewRate(null)} title="Add a rate" footer={<><Button onClick={() => setNewRate(null)}>Cancel</Button><Button variant="primary" onClick={addRate}>Add</Button></>}>
        {newRate && (
          <div className="grid grid-cols-2 gap-3">
            <TextField className="col-span-2" as="select" label="Rate" value={newRate.code} onChange={(e) => setNewRate({ ...newRate, code: e.target.value })}>
              {[...RATE_GROUPS.flatMap((g) => g.codes), "surtax"].map((c) => <option key={c} value={c}>{c === "surtax" ? "County surtax" : labelFor(c)}</option>)}
            </TextField>
            {newRate.code === "surtax" && (
              <TextField className="col-span-2" as="select" label="County" value={newRate.jurisdiction} onChange={(e) => setNewRate({ ...newRate, jurisdiction: e.target.value })}>
                <option value="">Choose…</option>{FL_COUNTIES.map((c) => <option key={c}>{c}</option>)}
              </TextField>
            )}
            <TextField label="Value" inputMode="decimal" value={newRate.value} onChange={(e) => setNewRate({ ...newRate, value: e.target.value })} hint="Percent as a decimal: 6% = 0.06; dollars as numbers" />
            <TextField label="Effective from" type="date" value={newRate.effective_from} onChange={(e) => setNewRate({ ...newRate, effective_from: e.target.value })} />
            <TextField className="col-span-2" label="Source" value={newRate.source || ""} onChange={(e) => setNewRate({ ...newRate, source: e.target.value })} placeholder="IRS notice, DR-15DSS 2027…" />
            <TextField className="col-span-2" label="Label" value={newRate.label || ""} onChange={(e) => setNewRate({ ...newRate, label: e.target.value })} />
          </div>
        )}
      </Modal>
    </>
  );
}

