// frontend/src/lib/ten99.js — 1099-NEC list: 1099 workers paid through payroll
// plus vendors marked "Gets a 1099" (card payments excluded: 1099-K).
import { supabase } from "@/lib/supabase";
import { r2, rateOn } from "@/lib/books";

export async function load1099(year, rates) {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const threshold = Number(rateOn(rates, "nec_1099_threshold", to) ?? 600);
  const [stubs, exps, vendors, emps, card, tins] = await Promise.all([
    supabase.from("pay_stubs").select("employee_id, gross, worker_type, run:pay_runs!inner(status, pay_date)").eq("worker_type", "1099").eq("run.status", "paid").gte("run.pay_date", from).lte("run.pay_date", to),
    supabase.from("expenses").select("vendor_id, total, paid_from_account_id, paid_at, expense_date").eq("status", "paid").is("voided_at", null).not("vendor_id", "is", null),
    supabase.from("vendors").select("*").eq("is_1099", true),
    supabase.from("employees").select("*").eq("worker_type", "1099"),
    supabase.from("accounts").select("id").eq("code", "2300").maybeSingle(),
    supabase.from("tax_ids").select("*"),
  ]);
  const tinOf = (type, id) => (tins.data || []).find((t) => t.party_type === type && t.party_id === id);
  const out = [];
  for (const e of emps.data || []) {
    const amt = r2((stubs.data || []).filter((s) => s.employee_id === e.id).reduce((s, x) => s + Number(x.gross), 0));
    if (!amt) continue;
    const t = tinOf("employee", e.id);
    out.push({ kind: "Worker", name: [e.first_name, e.last_name].filter(Boolean).join(" "), legal: t?.legal_name, tin_type: t?.tin_type, tin: t?.tin, street: e.address_street, city: e.address_city, state: e.address_state, zip: e.address_zip, email: e.email, amount: amt, w9: Boolean(t?.tin) });
  }
  for (const v of vendors.data || []) {
    // Card payments are reported by the card company on a 1099-K, not by you.
    const amt = r2((exps.data || []).filter((x) => x.vendor_id === v.id && x.paid_from_account_id !== card.data?.id && (x.paid_at || x.expense_date) >= from && (x.paid_at || x.expense_date) <= to).reduce((s, x) => s + Number(x.total), 0));
    if (!amt) continue;
    const t = tinOf("vendor", v.id);
    out.push({ kind: "Vendor", name: v.name, legal: t?.legal_name, tin_type: t?.tin_type, tin: t?.tin, street: v.address_street, city: v.address_city, state: v.address_state, zip: v.address_zip, email: v.email, amount: amt, w9: v.w9_on_file || Boolean(t?.tin) });
  }
  return { threshold, rows: out.map((r) => ({ ...r, required: r.amount >= threshold })).sort((a, b) => b.amount - a.amount) };
}

export const NEC_COLUMNS = [
  { label: "Recipient Name", value: (r) => r.legal || r.name }, { label: "DBA", value: (r) => (r.legal && r.legal !== r.name ? r.name : "") },
  { label: "TIN Type", value: "tin_type" }, { label: "TIN", value: "tin" }, { label: "Address", value: "street" }, { label: "City", value: "city" },
  { label: "State", value: "state" }, { label: "ZIP", value: "zip" }, { label: "Email", value: "email" }, { label: "Box 1 Nonemployee Compensation", value: "amount" },
];

