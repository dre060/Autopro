// frontend/src/app/admin/settings/page.js
"use client";

import { useEffect, useState } from "react";
import { Save, Store, Percent, FileText, Users, KeyRound, ShieldCheck, Activity, X, Plus, CheckCircle2, XCircle, RefreshCw, Receipt, BookOpen } from "lucide-react";
import { TERMS, QB_DEFAULTS } from "@/lib/invoicing";
import { CustomerNotificationSettings, DeviceAppSettings } from "@/components/admin/NotificationSettings";
import { supabase } from "@/lib/supabase";
import { Button, Card, CardHeader, PageHeader, TextField, Toggle, Input, Badge, Spinner, useUI } from "@/components/admin/ui";
import { useAdmin, DEFAULT_SHOP } from "@/components/admin/AdminContext";
import BooksSettings from "@/components/admin/BooksSettings";
import { FL_ESTIMATE_DISCLOSURE, FL_INVOICE_DISCLOSURE } from "@/components/admin/RepairOrderDocument";

export default function SettingsPage() {
  const { shop, refreshShop, user } = useAdmin();
  const { toast } = useUI();
  const [f, setF] = useState(shop);
  const [saving, setSaving] = useState(false);
  const [tech, setTech] = useState("");
  const [pw, setPw] = useState({ a: "", b: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [health, setHealth] = useState(null);
  const [nextInvoice, setNextInvoice] = useState("");
  const [nextInvoiceSaved, setNextInvoiceSaved] = useState(null);

  useEffect(() => setF(shop), [shop]);
  useEffect(() => {
    supabase.from("admin_users").select("*").order("created_at").then(({ data }) => setAdmins(data || []));
    checkHealth();
    supabase.rpc("get_next_invoice_number").then(({ data }) => {
      if (data) {
        setNextInvoice(String(data));
        setNextInvoiceSaved(Number(data));
      }
    });
  }, []);

  const saveNextInvoice = async () => {
    const n = parseInt(nextInvoice, 10);
    if (!n) return toast("Enter a number.", "bad");
    const { error } = await supabase.rpc("set_next_invoice_number", { p_next: n });
    if (error) return toast(error.message, "bad");
    setNextInvoiceSaved(n);
    toast(`Next invoice will be #${n}`);
  };

  const qb = { ...QB_DEFAULTS, ...(f.qb || {}) };
  const setQb = (k) => (e) => setF((x) => ({ ...x, qb: { ...QB_DEFAULTS, ...(x.qb || {}), [k]: e.target.value } }));

  const checkHealth = async () => {
    setHealth(null);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      setHealth(await res.json());
    } catch {
      setHealth({ ok: false, checks: {} });
    }
  };

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));

  const save = async () => {
    const payload = {
      ...DEFAULT_SHOP,
      ...f,
      labor_rate: Math.max(parseFloat(f.labor_rate) || 0, 0),
      tax_rate: Math.min(Math.max((parseFloat(f.tax_rate_pct ?? f.tax_rate * 100) || 0) / 100, 0), 0.5),
      payment_terms_days: Math.max(parseInt(f.payment_terms_days, 10) || 0, 0),
    };
    delete payload.tax_rate_pct;
    setSaving(true);
    const { error } = await supabase.from("settings").update({ value: payload, updated_at: new Date().toISOString() }).eq("key", "shop");
    setSaving(false);
    if (error) return toast(error.message, "bad");
    toast("Settings saved");
    refreshShop();
  };

  const changePassword = async () => {
    if (pw.a.length < 10) return toast("Use at least 10 characters.", "bad");
    if (pw.a !== pw.b) return toast("Passwords don't match.", "bad");
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw.a });
    setPwSaving(false);
    if (error) return toast(error.message, "bad");
    setPw({ a: "", b: "" });
    toast("Password updated — you can now sign in with it");
  };

  const techs = f.technicians || [];
  const taxPct = f.tax_rate_pct ?? String(Math.round(Number(f.tax_rate || 0) * 10000) / 100);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Shop details and defaults used on estimates and invoices."
        actions={<Button variant="primary" icon={Save} loading={saving} onClick={save}>Save settings</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader icon={Store} title="Shop profile" description="Printed at the top of every estimate and invoice." />
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
            <TextField className="col-span-2" label="Business name" value={f.name || ""} onChange={set("name")} />
            <TextField label="Phone" value={f.phone || ""} onChange={set("phone")} />
            <TextField label="Email" value={f.email || ""} onChange={set("email")} />
            <TextField className="col-span-2" label="Address" value={f.address || ""} onChange={set("address")} />
            <TextField className="col-span-2" label="Website" value={f.website || ""} onChange={set("website")} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={Percent} title="Rates & tax" description="Defaults for new repair orders and line items." />
          <div className="space-y-4 px-5 pb-5">
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Labor rate ($/hr)" inputMode="decimal" value={f.labor_rate ?? ""} onChange={set("labor_rate")} />
              <TextField label="Payment terms (days)" inputMode="numeric" value={f.payment_terms_days ?? 0} onChange={set("payment_terms_days")} hint="0 = due on pickup" />
            </div>
            <p className="rounded-lg border border-a-line p-4 text-[13px] text-a-muted">
              Sales tax is figured automatically with Florida's rules (6% state + county surtax; when the shop supplies parts the whole job is taxable;
              labor-only jobs with customer parts, towing and tire/battery fees aren't). Rates, fees and the county are under <strong className="text-a-text">Accounting & tax</strong> below.
            </p>
          </div>
        </Card>

        <CustomerNotificationSettings value={f.notify} onChange={(notify) => setF((x) => ({ ...x, notify }))} />
        <DeviceAppSettings />

        <Card>
          <CardHeader icon={Receipt} title="Invoicing" description="Numbering, terms and how customers pay." />
          <div className="space-y-4 px-5 pb-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <TextField label="Next invoice number" inputMode="numeric" value={nextInvoice} onChange={(e) => setNextInvoice(e.target.value.replace(/\D/g, ""))} hint="Continues your QuickBooks numbering." />
                {nextInvoiceSaved !== null && Number(nextInvoice) !== nextInvoiceSaved && (
                  <Button size="sm" className="mt-2" onClick={saveNextInvoice}>Set to #{nextInvoice}</Button>
                )}
              </div>
              <TextField as="select" label="Default terms" value={f.default_terms || "Due on receipt"} onChange={set("default_terms")}>
                {TERMS.map((t) => <option key={t.value}>{t.value}</option>)}
              </TextField>
            </div>
            <TextField label="Online payment link (Pay now button)" placeholder="https://… (Square, Stripe, PayPal or QuickBooks Payments link)" value={f.payment_link || ""} onChange={set("payment_link")} hint="Shown as a green “Pay now” button on unpaid invoices and statements." />
            <TextField as="textarea" rows={3} label="Payment instructions" placeholder="e.g. Zelle: service@autoprorepairs.com · Checks payable to Auto Pro Repairs Sales & Services LLC" value={f.payment_instructions || ""} onChange={set("payment_instructions")} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={BookOpen} title="QuickBooks mapping" description="Names must match your QuickBooks products/services and chart of accounts." />
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
            <div className="col-span-2 text-[12px] font-semibold uppercase tracking-wide text-a-faint">Products / services</div>
            <TextField label="Labor item" value={qb.item_labor} onChange={setQb("item_labor")} />
            <TextField label="Parts item" value={qb.item_part} onChange={setQb("item_part")} />
            <TextField label="Fees item" value={qb.item_fee} onChange={setQb("item_fee")} />
            <TextField label="Sublet item" value={qb.item_sublet} onChange={setQb("item_sublet")} />
            <TextField label="Discount item" value={qb.item_discount} onChange={setQb("item_discount")} />
            <TextField label="Sales tax item (Desktop)" value={qb.item_tax} onChange={setQb("item_tax")} />
            <div className="col-span-2 mt-2 text-[12px] font-semibold uppercase tracking-wide text-a-faint">Accounts (QuickBooks Desktop IIF)</div>
            <TextField label="Labor income" value={qb.acct_labor} onChange={setQb("acct_labor")} />
            <TextField label="Parts income" value={qb.acct_part} onChange={setQb("acct_part")} />
            <TextField label="Fees income" value={qb.acct_fee} onChange={setQb("acct_fee")} />
            <TextField label="Sublet income" value={qb.acct_sublet} onChange={setQb("acct_sublet")} />
            <TextField label="Discounts" value={qb.acct_discount} onChange={setQb("acct_discount")} />
            <TextField label="Accounts receivable" value={qb.acct_ar} onChange={setQb("acct_ar")} />
            <TextField label="Sales tax payable" value={qb.acct_tax} onChange={setQb("acct_tax")} />
            <TextField label="Payments deposit to" value={qb.acct_deposit} onChange={setQb("acct_deposit")} />
            <p className="col-span-2 text-xs text-a-faint">A line's own “Product/service” name (e.g. Transportation) overrides these defaults. Remember to save settings.</p>
          </div>
        </Card>

        <Card>
          <CardHeader icon={FileText} title="Document terms" description="Fine print at the bottom of estimates and invoices." />
          <div className="space-y-3 px-5 pb-5">
            <TextField as="textarea" rows={3} label="Estimate terms" value={f.estimate_terms || ""} onChange={set("estimate_terms")} />
            <TextField as="textarea" rows={3} label="Invoice terms & warranty" value={f.invoice_terms || ""} onChange={set("invoice_terms")} />
            <TextField label="FL Motor Vehicle Repair Shop registration #" value={f.mv_repair_reg || ""} onChange={set("mv_repair_reg")} hint="Printed on every estimate and invoice (FDACS registration)." />
            <TextField as="textarea" rows={3} label="Estimate disclosure (Florida Motor Vehicle Repair Act)" value={f.estimate_disclosure ?? FL_ESTIMATE_DISCLOSURE} onChange={set("estimate_disclosure")} />
            <TextField as="textarea" rows={2} label="Invoice disclosure" value={f.invoice_disclosure ?? FL_INVOICE_DISCLOSURE} onChange={set("invoice_disclosure")} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={Users} title="Technicians" description="Suggested when assigning a repair order." />
          <div className="px-5 pb-5">
            <div className="mb-3 flex flex-wrap gap-2">
              {techs.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-lg border border-a-line bg-a-raised py-1 pl-3 pr-1 text-sm">
                  {t}
                  <button className="rounded p-0.5 text-a-faint hover:text-a-bad" aria-label={`Remove ${t}`} onClick={() => setF({ ...f, technicians: techs.filter((x) => x !== t) })}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {techs.length === 0 && <span className="text-sm text-a-faint">No technicians added.</span>}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const t = tech.trim();
                if (t && !techs.includes(t)) setF({ ...f, technicians: [...techs, t] });
                setTech("");
              }}
            >
              <Input value={tech} onChange={(e) => setTech(e.target.value)} placeholder="Name" />
              <Button type="submit" icon={Plus}>Add</Button>
            </form>
            <p className="mt-2 text-xs text-a-faint">Remember to save settings.</p>
          </div>
        </Card>

        <Card>
          <CardHeader icon={KeyRound} title="Your password" description={`Signed in as ${user?.email}. Set a password to sign in without an email link.`} />
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
            <TextField label="New password" type="password" autoComplete="new-password" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} />
            <TextField label="Confirm" type="password" autoComplete="new-password" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} />
            <div className="col-span-2">
              <Button loading={pwSaving} onClick={changePassword} disabled={!pw.a}>Update password</Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader icon={ShieldCheck} title="Admins" description="Only these emails can open the admin panel." />
          <ul className="divide-y divide-a-line border-t border-a-line">
            {admins.map((a) => (
              <li key={a.email} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>
                  <span className="block font-medium">{a.full_name || a.email}</span>
                  <span className="block text-xs text-a-faint">{a.email}</span>
                </span>
                {a.active ? <Badge tone="good" dot>Active</Badge> : <Badge>Disabled</Badge>}
              </li>
            ))}
          </ul>
          <p className="px-5 py-3 text-xs text-a-faint">Owners add people and set roles (manager, bookkeeper/CPA, technician) under <a href="/admin/team?tab=access" className="text-a-accent">Team → App access</a>.</p>
        </Card>

        <BooksSettings />

        <Card className="xl:col-span-2">
          <CardHeader icon={Activity} title="System health" actions={<Button size="sm" variant="ghost" icon={RefreshCw} onClick={checkHealth}>Recheck</Button>} />
          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
            {!health ? (
              <Spinner />
            ) : (
              [
                ["Database connection", health.checks?.database, health.checks?.database_error || "Website can read/write Supabase"],
                ["Email sending (Resend)", health.checks?.email_env, health.checks?.email_env ? "RESEND_API_KEY is set" : "RESEND_API_KEY missing — no emails will send"],
                ["No exposed email key", !health.checks?.public_resend_key_present, health.checks?.public_resend_key_present ? "Delete NEXT_PUBLIC_RESEND_API_KEY in Vercel" : "Good"],
                ["Service key removed", !health.checks?.service_role_key_present, health.checks?.service_role_key_present ? "SUPABASE_SERVICE_ROLE_KEY is no longer needed — delete it in Vercel" : "Good"],
              ].map(([label, ok, detail]) => (
                <div key={label} className="flex items-start gap-3 rounded-lg border border-a-line p-3">
                  {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-a-good" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-a-bad" />}
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-a-faint">{detail}</span>
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
