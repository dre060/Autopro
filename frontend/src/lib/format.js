// frontend/src/lib/format.js
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const money = (n) => usd.format(Number(n) || 0);
export const money0 = (n) => usd0.format(Number(n) || 0);
export const num = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

const TZ = "America/New_York";

// Dates stored as "YYYY-MM-DD" are calendar dates; don't let UTC shift them.
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d, 12);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function date(value, opts = { month: "short", day: "numeric", year: "numeric" }) {
  const d = toDate(value);
  return d ? d.toLocaleDateString("en-US", { timeZone: /T/.test(String(value)) ? TZ : undefined, ...opts }) : "—";
}

export function dateTime(value) {
  const d = toDate(value);
  return d
    ? d.toLocaleString("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";
}

export function time12(t) {
  if (!t) return "";
  if (/[ap]m/i.test(t)) return t.toUpperCase().replace(/\s+/g, " ");
  const [h, m] = String(t).split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${ampm}`;
}

export function relative(value) {
  const d = toDate(value);
  if (!d) return "";
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return date(value, { month: "short", day: "numeric" });
}

export function phone(p) {
  const digits = String(p || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (digits.length !== 10) return p || "";
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export const telHref = (p) => `tel:${String(p || "").replace(/[^\d+]/g, "")}`;

// Local YYYY-MM-DD for <input type="date"> defaults.
export function isoDay(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export const customerName = (c) =>
  c ? [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company || "Unnamed customer" : "Walk-in";

export const vehicleName = (v) =>
  v ? [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") || "Vehicle" : "No vehicle";
