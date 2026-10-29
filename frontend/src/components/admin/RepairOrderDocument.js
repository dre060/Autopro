// frontend/src/components/admin/RepairOrderDocument.js
// Printable estimate / invoice in the same layout as the shop's QuickBooks
// invoices. Always rendered light (it's paper); used by the admin print view
// and the customer link at /i/<token>.
import { itemName } from "@/lib/invoicing";

const usd = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n) || 0);
const day = (v) => {
  if (!v) return "";
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T12:00:00` : v);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
};
const fmtPhone = (p) => {
  const d = String(p || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p;
};

export const FL_ESTIMATE_DISCLOSURE =
  "Under Florida's Motor Vehicle Repair Act you are entitled to a written estimate for repairs over $100. We will not charge more than this estimate by over $10 (estimates of $100 or less) or 10% up to $50 without your approval. You may ask for the return of replaced parts, except those returned for warranty or core credit.";
export const FL_INVOICE_DISCLOSURE =
  "Replaced parts are available on request unless returned for warranty or core credit. Parts are new unless marked used or rebuilt.";

const Label = ({ children }) => <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{children}</div>;

export default function RepairOrderDocument({ shop = {}, order, customer, vehicle, items = [], payments = [] }) {
  const invoice = Boolean(order.invoiced_at);
  const voided = Boolean(order.voided_at) || order.status === "cancelled";
  const lines = items.filter((i) => i.approved !== false);
  const declined = items.filter((i) => i.approved === false);
  const govtFees = Number(order.govt_fees_total || 0);
  const subtotal = Number(order.labor_total || 0) + Number(order.parts_total || 0) + Number(order.other_total || 0) - govtFees;
  const credit = order.doc_type === "credit_memo";
  const split = order.tax_state != null && Number(order.tax_amount) > 0;
  const showTax = Number(order.tax_amount) > 0 || Number(order.taxable_total) > 0;
  const vehicleTitle = vehicle ? [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ") : "";
  const qb = shop.qb || {};
  const balance = Number(order.balance_due || 0);
  const payLink = shop.payment_link && invoice && balance > 0 && !voided ? shop.payment_link : null;

  const expires = new Date(order.created_at || Date.now());
  expires.setDate(expires.getDate() + 30);

  const details = invoice
    ? [
        ["Invoice no.", order.invoice_number ?? order.number],
        ["Terms", order.terms || "Due on receipt"],
        ["Invoice date", day(order.invoiced_at)],
        ["Due date", day(order.due_date) || day(order.invoiced_at)],
        order.po_number && ["P.O. number", order.po_number],
        vehicle && ["Repair order", `#${order.number}`],
      ]
    : [
        ["Estimate no.", order.number],
        ["Estimate date", day(order.created_at)],
        ["Expiration date", day(expires.toISOString())],
        order.po_number && ["P.O. number", order.po_number],
      ];

  const addressLines = (c) =>
    [c.street, [c.city, [c.state, c.zip].filter(Boolean).join(" ")].filter(Boolean).join(", "), c.country && !/^(us|usa|united states)$/i.test(c.country) ? c.country : null].filter(Boolean);

  return (
    <article
      className="print-sheet relative mx-auto w-full max-w-[860px] overflow-hidden rounded-xl bg-white p-6 text-[13px] leading-relaxed text-slate-800 shadow-xl sm:p-10"
      style={{ colorScheme: "light" }}
    >
      {voided && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-[24deg] rounded-xl border-[6px] border-rose-500/50 px-10 py-2 text-7xl font-black tracking-widest text-rose-500/50">VOID</span>
        </div>
      )}

      {/* header */}
      <header className="flex flex-col-reverse gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-3xl font-bold tracking-tight text-slate-900">{credit ? "CREDIT MEMO" : invoice ? "INVOICE" : "ESTIMATE"}</div>
          <div className="mt-3 font-semibold text-slate-900">{shop.name || "Auto Pro Repairs Sales & Services"}</div>
          <div className="text-slate-600">{shop.address}</div>
          <div className="text-slate-600">{shop.email}</div>
          <div className="text-slate-600">{shop.phone}</div>
          {shop.website && <div className="text-slate-600">{shop.website.replace(/^https?:\/\//, "")}</div>}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand-emblem.png" alt="Auto Pro" className="h-auto w-[120px] self-start rounded-lg bg-slate-900 p-2" />
      </header>

      {/* parties + details */}
      <section className="mt-8 grid gap-6 border-y border-slate-200 py-5 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <Label>Bill to</Label>
          {customer ? (
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-900">{customer.company || customer.name}</div>
              {customer.company && customer.name && customer.name !== customer.company && <div>{customer.name}</div>}
              {addressLines(customer).map((l) => <div key={l}>{l}</div>)}
              {customer.phone && <div>{fmtPhone(customer.phone)}</div>}
              {customer.email && <div className="break-all">{customer.email}</div>}
            </div>
          ) : (
            <div className="text-slate-500">Walk-in customer</div>
          )}
        </div>
        <div className="space-y-4">
          {order.ship_to && (
            <div>
              <Label>Ship to</Label>
              <p className="whitespace-pre-wrap">{order.ship_to}</p>
            </div>
          )}
          {order.notify_party && (
            <div>
              <Label>Notify party</Label>
              <p className="whitespace-pre-wrap">{order.notify_party}</p>
            </div>
          )}
        </div>
        <div className="sm:min-w-[220px]">
          <Label>{invoice ? "Invoice details" : "Estimate details"}</Label>
          <dl className="space-y-0.5">
            {details.filter(Boolean).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6">
                <dt className="text-slate-500">{k}:</dt>
                <dd className="text-right font-medium text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* vehicle */}
      {vehicle && (
        <section className="flex flex-wrap gap-x-8 gap-y-1 border-b border-slate-200 py-3 text-slate-600">
          <span><span className="text-slate-400">Vehicle:</span> <span className="font-medium text-slate-900">{vehicleTitle}</span></span>
          {vehicle.vin && <span className="font-mono text-xs leading-5">VIN {vehicle.vin}</span>}
          {vehicle.license_plate && <span>Plate {vehicle.license_plate}</span>}
          {order.mileage_in && <span>{Number(order.mileage_in).toLocaleString()} mi in</span>}
          {order.mileage_out && <span>{Number(order.mileage_out).toLocaleString()} mi out</span>}
        </section>
      )}

      {(order.complaint || order.diagnosis) && (
        <section className="grid gap-6 border-b border-slate-200 py-4 sm:grid-cols-2">
          {order.complaint && (
            <div>
              <Label>Customer concern</Label>
              <p className="whitespace-pre-wrap">{order.complaint}</p>
            </div>
          )}
          {order.diagnosis && (
            <div>
              <Label>Findings</Label>
              <p className="whitespace-pre-wrap">{order.diagnosis}</p>
            </div>
          )}
        </section>
      )}

      {/* lines */}
      <section className="pt-5">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-800 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="w-8 py-2 pr-2">#</th>
              <th className="w-40 py-2 pr-3">Product or service</th>
              <th className="py-2 pr-3">Description</th>
              <th className="w-14 py-2 pr-3 text-right">Qty</th>
              <th className="w-24 py-2 pr-3 text-right">Rate</th>
              <th className="w-28 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((i, n) => (
              <tr key={i.id} className="break-inside-avoid border-b border-slate-100 align-top">
                <td className="py-2.5 pr-2 text-slate-500">{n + 1}.</td>
                <td className="py-2.5 pr-3 font-medium text-slate-900">{itemName(i, qb)}</td>
                <td className="whitespace-pre-wrap py-2.5 pr-3">
                  {i.description}
                  {i.part_number && <span className="ml-2 font-mono text-[11px] text-slate-400">{i.part_number}</span>}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{Number(i.quantity)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{usd(i.unit_price)}</td>
                <td className="py-2.5 text-right tabular-nums">{usd(Number(i.quantity) * Number(i.unit_price))}</td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">No line items yet.</td>
              </tr>
            )}
          </tbody>
        </table>

        {declined.length > 0 && (
          <div className="mt-5 rounded-lg bg-slate-50 p-4">
            <Label>Recommended – not included</Label>
            {declined.map((i) => (
              <div key={i.id} className="flex justify-between gap-4 py-0.5 text-slate-600">
                <span className="whitespace-pre-wrap">{i.description}</span>
                <span className="tabular-nums">{usd(Number(i.quantity) * Number(i.unit_price))}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-sm space-y-3">
            {payLink && (
              <>
                <a href={payLink} target="_blank" rel="noopener noreferrer" className="no-print inline-flex items-center rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700">
                  Pay {usd(balance)} now
                </a>
                <p className="hidden text-xs text-slate-500 print:block">Pay online: {payLink}</p>
              </>
            )}
            {invoice && shop.payment_instructions && <p className="whitespace-pre-wrap text-xs text-slate-500">{shop.payment_instructions}</p>}
          </div>
          <dl className="w-full space-y-1.5 tabular-nums sm:max-w-[300px]">
            <Row label="Subtotal" value={usd(subtotal)} />
            {Number(order.discount_amount) > 0 && <Row label="Discount" value={`−${usd(order.discount_amount)}`} />}
            {govtFees > 0 && <Row label="FL tire / battery fees" value={usd(govtFees)} />}
            {split ? (
              <>
                <Row label="Florida sales tax (6%)" value={usd(order.tax_state)} />
                {Number(order.tax_surtax) > 0 && <Row label={`${order.surtax_county || "County"} County surtax`} value={usd(order.tax_surtax)} />}
              </>
            ) : showTax ? (
              <Row label={`Sales tax (${(Number(order.tax_rate) * 100).toFixed(2).replace(/\.?0+$/, "")}%)`} value={usd(order.tax_amount)} />
            ) : null}
            {order.tax_exempt && <Row label="Sales tax" value="Exempt" />}
            <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-base font-bold text-slate-900">
              <dt>Total</dt>
              <dd>{usd(order.total)}</dd>
            </div>
            {invoice && Number(order.amount_paid) !== 0 && <Row label="Payments" value={`−${usd(order.amount_paid)}`} />}
            {invoice && (
              <div className="flex items-baseline justify-between pt-1 font-bold text-slate-900">
                <dt>Balance due</dt>
                <dd className="text-xl">{usd(balance)}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      {invoice && payments.length > 0 && (
        <section className="mt-6 border-t border-slate-200 pt-4">
          <Label>Payments received</Label>
          {payments.map((p, i) => (
            <div key={i} className="flex justify-between text-slate-600">
              <span>{day(p.received_at)} · <span className="capitalize">{p.method === "cashapp" ? "Cash App" : p.method}</span></span>
              <span className="tabular-nums">{usd(p.amount)}</span>
            </div>
          ))}
        </section>
      )}

      {(order.recommendations || order.customer_notes) && (
        <section className="mt-6 space-y-3 border-t border-slate-200 pt-4">
          {order.recommendations && (
            <div>
              <Label>Recommendations</Label>
              <p className="whitespace-pre-wrap">{order.recommendations}</p>
            </div>
          )}
          {order.customer_notes && (
            <div>
              <Label>Note to customer</Label>
              <p className="whitespace-pre-wrap">{order.customer_notes}</p>
            </div>
          )}
        </section>
      )}

      <footer className="mt-6 border-t border-slate-200 pt-4 text-[11.5px] text-slate-500">
        <p className="whitespace-pre-wrap">{invoice ? shop.invoice_terms : shop.estimate_terms}</p>
        {/* Florida Motor Vehicle Repair Act disclosures (wording editable in Settings → Invoicing) */}
        <p className="mt-2 whitespace-pre-wrap">{invoice ? shop.invoice_disclosure ?? FL_INVOICE_DISCLOSURE : shop.estimate_disclosure ?? FL_ESTIMATE_DISCLOSURE}</p>
        {shop.mv_repair_reg && <p className="mt-1">FL Motor Vehicle Repair Shop Registration #{shop.mv_repair_reg}</p>}
        {order.approved_by_name && order.approved_at && (
          <p className="mt-3 text-slate-700">
            Approved electronically by <strong>{order.approved_by_name}</strong> on {day(order.approved_at)}.
          </p>
        )}
        {!invoice && !order.approved_at && (
          <div className="mt-8 hidden grid-cols-2 gap-10 print:grid">
            <div className="border-t border-slate-400 pt-1">Customer signature</div>
            <div className="border-t border-slate-400 pt-1">Date</div>
          </div>
        )}
        <p className="mt-4 text-center text-slate-400">Thank you for your business!</p>
      </footer>
    </article>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-slate-600">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

// Map admin-side records into the shape the document expects (same shape the
// get_public_repair_order() function returns for customer links).
export function toDocumentProps({ shop, ro, items, payments }) {
  const c = ro.customer;
  return {
    shop,
    order: ro,
    customer: c
      ? {
          name: [c.first_name, c.last_name].filter(Boolean).join(" "),
          company: c.company, email: c.email, phone: c.phone,
          street: c.address_street, city: c.address_city, state: c.address_state, zip: c.address_zip, country: c.address_country,
        }
      : null,
    vehicle: ro.vehicle,
    items,
    payments,
  };
}

