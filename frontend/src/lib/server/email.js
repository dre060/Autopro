// frontend/src/lib/server/email.js
// Resend email helper + shared HTML layout. Everything interpolated into
// HTML goes through esc() — form fields are attacker-controlled.

export const SHOP = {
  name: "Auto Pro Repairs Sales & Services",
  phone: process.env.NEXT_PUBLIC_PHONE ? formatPhone(process.env.NEXT_PUBLIC_PHONE) : "(352) 933-5181",
  email: process.env.NEXT_PUBLIC_EMAIL || "service@autoprorepairs.com",
  address: "806 Hood Ave, Leesburg, FL 34748",
  site: process.env.NEXT_PUBLIC_SITE_URL || "https://www.autoprorepairs.com",
};

const FROM = process.env.EMAIL_FROM || "Auto Pro Repairs <noreply@autoprorepairs.com>";

function formatPhone(p) {
  const d = String(p).replace(/\D/g, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p;
}

export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const nl2br = (s) => esc(s).replace(/\r?\n/g, "<br>");

export const isEmailConfigured = () => Boolean(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html, text, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY is not configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: FROM,
        to: Array.isArray(to) ? to : [to],
        subject: String(subject).replace(/[\r\n]+/g, " ").slice(0, 200),
        html,
        text,
        reply_to: replyTo || SHOP.email,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.message || `Resend HTTP ${res.status}` };
    return { success: true, id: data.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// rows: [[label, value], ...] — values are escaped here.
export function detailRows(rows) {
  return rows
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;width:38%;font-size:14px">${esc(k)}</td>` +
        `<td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px">${esc(v)}</td></tr>`
    )
    .join("");
}

export function button(href, label) {
  return `<a href="${esc(href)}" style="display:inline-block;background:#2f7bff;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 26px;border-radius:8px;font-size:15px">${esc(label)}</a>`;
}

// bodyHtml must already be escaped/trusted markup.
export function layout({ title, preheader = "", bodyHtml }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0b0d11;padding:22px 28px;border-bottom:3px solid #2f7bff">
<div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.3px">AUTO PRO</div>
<div style="color:#9ca3af;font-size:12px;margin-top:2px">Repairs · Sales · Services</div></td></tr>
<tr><td style="padding:28px">${bodyHtml}</td></tr>
<tr><td style="padding:18px 28px;background:#f9fafb;color:#6b7280;font-size:12px;line-height:1.6;text-align:center">
${esc(SHOP.name)} LLC<br>${esc(SHOP.address)}<br>${esc(SHOP.phone)} · ${esc(SHOP.email)}</td></tr>
</table></td></tr></table></body></html>`;
}

// Very small best-effort limiter for public form endpoints (per server
// instance; serverless instances each keep their own window).
const hits = new Map();
export function rateLimited(request, { limit = 5, windowMs = 10 * 60 * 1000 } = {}) {
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > limit;
}

export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || "").trim());
