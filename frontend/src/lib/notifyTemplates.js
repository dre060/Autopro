// frontend/src/lib/notifyTemplates.js — customer message templates
// Placeholders: {first_name} {name} {vehicle} {total} {balance} {link}
//               {status} {shop} {shop_phone} {ro_number} {invoice_number}

export const DEFAULT_NOTIFY = {
  auto_ready: false,
  ready_template:
    "Auto Pro: Hi {first_name}, your {vehicle} is ready for pickup! Total {total}. {link}",
  status_template: "Auto Pro: Hi {first_name}, update on your {vehicle}: {status}. Track it here: {link}",
};

export const STATUS_TEXT = {
  estimate: "your estimate is ready to review",
  approved: "we've got your approval and the job is scheduled",
  in_progress: "our technicians are working on it now",
  waiting_parts: "we're waiting on parts to arrive",
  ready: "it's ready for pickup",
  completed: "the job is complete — thank you!",
};

const usd = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n) || 0);

export function templateVars({ ro, shop = {}, origin = "" }) {
  const c = ro.customer || {};
  const v = ro.vehicle;
  return {
    first_name: c.first_name || c.company || "there",
    name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company || "",
    vehicle: v ? [v.year, v.make, v.model].filter(Boolean).join(" ") : "vehicle",
    total: usd(ro.total),
    balance: usd(ro.balance_due ?? ro.total),
    link: ro.public_token ? `${origin}/i/${ro.public_token}` : origin,
    status: STATUS_TEXT[ro.status] || String(ro.status || "").replace(/_/g, " "),
    shop: shop.name || "Auto Pro",
    shop_phone: shop.phone || "(352) 933-5181",
    ro_number: ro.number ?? "",
    invoice_number: ro.invoice_number ?? "",
  };
}

export function renderTemplate(template, vars) {
  return String(template || "").replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

// sms: link that opens the phone's Messages app with the text filled in.
export function smsHref(phone, body) {
  const num = String(phone || "").replace(/[^\d+]/g, "");
  const isApple = typeof navigator !== "undefined" && /iPhone|iPad|Macintosh/.test(navigator.userAgent);
  return `sms:${num}${isApple ? "&" : "?"}body=${encodeURIComponent(body)}`;
}
