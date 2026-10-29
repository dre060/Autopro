// frontend/src/lib/quickbooks.js
// Builds QuickBooks import files from Auto Pro invoices.
//  - QuickBooks Online: "Import invoices" CSV and "Import customers" CSV
//    (Settings ⚙ → Import data in QBO).
//  - QuickBooks Desktop: IIF file with customers, invoices and payments
//    (File → Utilities → Import → IIF Files).
import { QB_DEFAULTS, itemName } from "./invoicing";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const fixed = (n) => r2(n).toFixed(2);

export function qbDate(v) {
  if (!v) return "";
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T12:00:00` : v);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

// The customer's display name in QuickBooks. Must match between the
// customer file and the invoice file.
export function qbCustomerName(c) {
  if (!c) return "Walk-in Customer";
  return (c.company || [c.first_name, c.last_name].filter(Boolean).join(" ") || "Customer").trim();
}

function csv(rows) {
  return rows
    .map((r) => r.map((v) => {
      const s = String(v ?? "");
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","))
    .join("\r\n");
}

const flat = (s) => String(s ?? "").replace(/[\t\r]+/g, " ").replace(/\n+/g, "; ").trim();

// Split the invoice's tax across taxable lines so the parts add up exactly.
function lineTaxes(inv, lines) {
  const taxable = lines.filter((l) => l.taxable);
  const out = new Map();
  let assigned = 0;
  taxable.forEach((l, i) => {
    const amt = r2(l.quantity * l.unit_price);
    const t = i === taxable.length - 1 ? r2(Number(inv.tax_amount) - assigned) : r2(amt * Number(inv.tax_rate));
    assigned = r2(assigned + t);
    out.set(l.id, t);
  });
  return out;
}

const includedLines = (inv) => (inv.items || []).filter((l) => l.approved !== false).sort((a, b) => a.position - b.position);

// ------------------------------------------------------------ QBO invoices
export function qboInvoicesCsv(invoices, qbSettings = {}) {
  const qb = { ...QB_DEFAULTS, ...qbSettings };
  const header = [
    "InvoiceNo", "Customer", "InvoiceDate", "DueDate", "Terms", "Location", "Memo",
    "Item(Product/Service)", "ItemDescription", "ItemQuantity", "ItemRate", "ItemAmount", "ItemTaxCode", "ItemTaxAmount", "Service Date",
  ];
  const rows = [header];
  for (const inv of invoices) {
    const lines = includedLines(inv);
    const taxes = lineTaxes(inv, lines);
    const memo = flat([inv.po_number && `PO ${inv.po_number}`, inv.vehicle && `${[inv.vehicle.year, inv.vehicle.make, inv.vehicle.model].filter(Boolean).join(" ")}${inv.vehicle.vin ? ` VIN ${inv.vehicle.vin}` : ""}`, `Auto Pro RO #${inv.number}`].filter(Boolean).join(" | "));
    const base = [inv.invoice_number, qbCustomerName(inv.customer), qbDate(inv.invoiced_at), qbDate(inv.due_date || inv.invoiced_at), inv.terms || "", "", memo];
    lines.forEach((l) => {
      const amt = r2(l.quantity * l.unit_price);
      rows.push([...base, itemName(l, qb), flat(l.description), Number(l.quantity), fixed(l.unit_price), fixed(amt), l.taxable ? "TAX" : "NON", l.taxable ? fixed(taxes.get(l.id) || 0) : "", qbDate(inv.invoiced_at)]);
    });
    if (Number(inv.discount_amount) > 0) {
      rows.push([...base, qb.item_discount, "Discount", 1, fixed(-inv.discount_amount), fixed(-inv.discount_amount), "NON", "", qbDate(inv.invoiced_at)]);
    }
  }
  return csv(rows);
}

// ------------------------------------------------------------ QBO customers
export function qboCustomersCsv(customers) {
  const header = ["Name", "Company", "First Name", "Last Name", "Email", "Phone", "Street", "City", "State", "ZIP", "Country", "Terms", "Taxable", "Notes"];
  const rows = [header];
  for (const c of customers) {
    rows.push([
      qbCustomerName(c), c.company || "", c.first_name || "", c.last_name || "", c.email || "", c.phone || "",
      c.address_street || "", c.address_city || "", c.address_state || "", c.address_zip || "", c.address_country || "",
      c.default_terms || "", c.tax_exempt ? "No" : "Yes", flat(c.tax_exempt ? `Tax-exempt: ${c.tax_exempt_reason || ""}` : c.notes || ""),
    ]);
  }
  return csv(rows);
}

// ------------------------------------------------------------ payments (CSV, for QBO "Receive payment" or bank matching)
export function paymentsCsv(payments) {
  const rows = [["Date", "Customer", "Invoice", "Amount", "Method", "Reference", "Memo"]];
  for (const p of payments) {
    rows.push([qbDate(p.received_at), qbCustomerName(p.customer), p.invoice_number || "", fixed(p.amount), p.method, p.reference || "", flat(p.notes)]);
  }
  return csv(rows);
}

const PAY_METHOD = { cash: "Cash", card: "Credit Card", check: "Check", zelle: "Zelle", cashapp: "Cash App", financing: "Financing", other: "Other" };

// ------------------------------------------------------------ QuickBooks Desktop IIF
export function iifFile({ invoices = [], payments = [], customers = [] }, qbSettings = {}) {
  const qb = { ...QB_DEFAULTS, ...qbSettings };
  const T = (...cols) => cols.map((c) => flat(c)).join("\t");
  const out = [];
  const acctFor = (kind) => qb[`acct_${kind}`] || qb.acct_fee;

  if (customers.length) {
    out.push(T("!CUST", "NAME", "BADDR1", "BADDR2", "BADDR3", "BADDR4", "BADDR5", "PHONE1", "EMAIL", "CONT1", "TERMS", "TAXABLE", "NOTE"));
    for (const c of customers) {
      const contact = [c.first_name, c.last_name].filter(Boolean).join(" ");
      const cityLine = [c.address_city, [c.address_state, c.address_zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
      const addr = [qbCustomerName(c), c.company && contact ? contact : null, c.address_street, cityLine, c.address_country].filter(Boolean);
      while (addr.length < 5) addr.push("");
      out.push(T("CUST", qbCustomerName(c), ...addr.slice(0, 5), c.phone || "", c.email || "", contact,
        c.default_terms || "", c.tax_exempt ? "N" : "Y", c.tax_exempt ? `Tax-exempt: ${c.tax_exempt_reason || ""}` : ""));
    }
  }

  if (invoices.length) {
    out.push(T("!TRNS", "TRNSID", "TRNSTYPE", "DATE", "ACCNT", "NAME", "AMOUNT", "DOCNUM", "MEMO", "TOPRINT", "DUEDATE", "TERMS", "PONUM"));
    out.push(T("!SPL", "SPLID", "TRNSTYPE", "DATE", "ACCNT", "NAME", "AMOUNT", "DOCNUM", "MEMO", "QNTY", "PRICE", "INVITEM", "TAXABLE", "EXTRA"));
    out.push("!ENDTRNS");
    for (const inv of invoices) {
      const name = qbCustomerName(inv.customer);
      const date = qbDate(inv.invoiced_at);
      out.push(T("TRNS", "", "INVOICE", date, qb.acct_ar, name, fixed(inv.total), inv.invoice_number, `Auto Pro RO #${inv.number}`, "N", qbDate(inv.due_date || inv.invoiced_at), inv.terms || "", inv.po_number || ""));
      for (const l of includedLines(inv)) {
        const amt = r2(l.quantity * l.unit_price);
        out.push(T("SPL", "", "INVOICE", date, acctFor(l.kind), name, fixed(-amt), inv.invoice_number, l.description, -Number(l.quantity), fixed(l.unit_price), itemName(l, qb), l.taxable ? "Y" : "N", ""));
      }
      if (Number(inv.discount_amount) > 0) {
        out.push(T("SPL", "", "INVOICE", date, qb.acct_discount, name, fixed(inv.discount_amount), inv.invoice_number, "Discount", "", fixed(-inv.discount_amount), qb.item_discount, "N", ""));
      }
      if (Number(inv.tax_amount) > 0) {
        out.push(T("SPL", "", "INVOICE", date, qb.acct_tax, name, fixed(-inv.tax_amount), inv.invoice_number, "Sales tax", "", `${r2(Number(inv.tax_rate) * 100)}%`, qb.item_tax, "N", "AUTOSTAX"));
      }
      out.push("ENDTRNS");
    }
  }

  if (payments.length) {
    out.push(T("!TRNS", "TRNSID", "TRNSTYPE", "DATE", "ACCNT", "NAME", "AMOUNT", "DOCNUM", "MEMO", "PAYMETH"));
    out.push(T("!SPL", "SPLID", "TRNSTYPE", "DATE", "ACCNT", "NAME", "AMOUNT", "DOCNUM", "MEMO"));
    out.push("!ENDTRNS");
    for (const p of payments) {
      const name = qbCustomerName(p.customer);
      const date = qbDate(p.received_at);
      const memo = `Payment on invoice #${p.invoice_number || ""}${p.reference ? ` (${p.reference})` : ""}`;
      out.push(T("TRNS", "", "PAYMENT", date, qb.acct_deposit, name, fixed(p.amount), p.reference || "", memo, PAY_METHOD[p.method] || p.method));
      out.push(T("SPL", "", "PAYMENT", date, qb.acct_ar, name, fixed(-p.amount), p.reference || "", memo));
      out.push("ENDTRNS");
    }
  }

  return out.join("\r\n") + "\r\n";
}

export function download(filename, content, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
