// frontend/src/lib/invoicing.js — terms, numbering and QuickBooks naming

export const TERMS = [
  { value: "Due on receipt", days: 0 },
  { value: "Net 7", days: 7 },
  { value: "Net 15", days: 15 },
  { value: "Net 30", days: 30 },
  { value: "Net 45", days: 45 },
  { value: "Net 60", days: 60 },
];

export function termsDays(terms) {
  const t = TERMS.find((x) => x.value === terms);
  if (t) return t.days;
  const m = String(terms || "").match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

// YYYY-MM-DD due date for an invoice dated `from` with the given terms.
export function dueDateFor(terms, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + termsDays(terms));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const isInvoice = (ro) => Boolean(ro?.invoiced_at);
export const isVoid = (ro) => Boolean(ro?.voided_at) || ro?.status === "cancelled";

// "Invoice #1097" / "Estimate #1004"
export function docLabel(ro) {
  if (!ro) return "";
  return isInvoice(ro) ? `Invoice #${ro.invoice_number ?? ro.number}` : `Estimate #${ro.number}`;
}

export const KIND_LABEL = { labor: "Labor", part: "Parts", fee: "Fees", sublet: "Sublet" };

// Product/service name shown on the invoice and sent to QuickBooks.
export function itemName(line, qb = {}) {
  return (line.item_name || "").trim() || qb[`item_${line.kind}`] || KIND_LABEL[line.kind] || "Services";
}

// Common product/service names (QuickBooks "Products and services").
export const ITEM_SUGGESTIONS = ["Labor", "Parts", "Transportation", "Towing", "Diagnostic", "Shop supplies", "Sublet", "Tires", "Fluids", "Storage"];

export const QB_DEFAULTS = {
  item_labor: "Labor", item_part: "Parts", item_fee: "Fees", item_sublet: "Sublet",
  item_discount: "Discount", item_tax: "Sales Tax",
  acct_labor: "Labor Income", acct_part: "Parts Income", acct_fee: "Other Income", acct_sublet: "Sublet Income",
  acct_discount: "Discounts Given", acct_ar: "Accounts Receivable", acct_tax: "Sales Tax Payable",
  acct_deposit: "Undeposited Funds",
};

// Invoice status in QuickBooks terms.
export function invoiceState(ro, today) {
  if (isVoid(ro)) return "void";
  if (!isInvoice(ro)) return "estimate";
  if (ro.payment_status === "paid" || (Number(ro.balance_due) <= 0 && Number(ro.total) > 0)) return "paid";
  if (ro.due_date && ro.due_date < today) return "overdue";
  if (Number(ro.amount_paid) > 0) return "partial";
  if (ro.viewed_at) return "viewed";
  if (ro.sent_at) return "sent";
  return "open";
}
