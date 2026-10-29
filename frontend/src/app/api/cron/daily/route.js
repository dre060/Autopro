// frontend/src/app/api/cron/daily/route.js
// Runs once a day (Vercel Cron, see vercel.json). Vercel sends
// "Authorization: Bearer $CRON_SECRET"; the database checks the same secret
// (only its SHA-256 is stored) before handing over anything.
//  * creates recurring invoices and bills
//  * emails/texts payment reminders for overdue invoices
//  * reminds the shop about the DR-15 (10th & 18th), bills due, estimated tax
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { sendEmail, layout, button, esc, isEmail, SHOP } from "@/lib/server/email";
import { sendSms, isSmsConfigured } from "@/lib/server/sms";
import { notifyAdmins } from "@/lib/server/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const usd = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n) || 0);

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const db = supabaseServer();
  const out = { recurring: null, reminders: 0, sales_tax: false, bills: 0, estimated_tax: false };

  const rec = await db.rpc("cron_run_recurring", { p_secret: secret });
  out.recurring = rec.error ? rec.error.message : rec.data;

  const { data: d, error } = await db.rpc("cron_digest", { p_secret: secret });
  if (error) return NextResponse.json({ ...out, error: error.message }, { status: 500 });

  // ---- payment reminders
  const via = d.remind_via || {};
  const reminded = [];
  for (const r of d.reminders || []) {
    const link = `${SHOP.site}/i/${r.token}`;
    let sent = false;
    if (via.email !== false && isEmail(r.email)) {
      const res = await sendEmail({
        to: r.email,
        subject: `Reminder: invoice #${r.invoice_number} — ${usd(r.balance)} due`,
        html: layout({
          title: `Invoice #${r.invoice_number}`,
          preheader: `${usd(r.balance)} was due ${r.due_date}`,
          bodyHtml: `<p>Hi ${esc(r.name || "there")},</p>
            <p>This is a friendly reminder that invoice <strong>#${esc(r.invoice_number)}</strong> from ${esc(SHOP.name)} has a balance of <strong>${usd(r.balance)}</strong>, due ${esc(r.due_date)}.</p>
            <p style="margin:24px 0">${button(link, "View & pay invoice")}</p>
            <p>If you've already paid, thank you, and please ignore this note. Questions? Call ${esc(SHOP.phone)}.</p>`,
        }),
      });
      sent = res.success;
    }
    if (via.sms && isSmsConfigured() && r.phone) {
      const res = await sendSms({ to: r.phone, body: `Auto Pro: invoice #${r.invoice_number} has ${usd(r.balance)} due. View/pay: ${link}` }).catch(() => ({}));
      sent = sent || Boolean(res?.success);
    }
    if (sent) reminded.push(r.id);
  }
  if (reminded.length) await db.rpc("cron_mark_reminded", { p_secret: secret, p_ids: reminded });
  out.reminders = reminded.length;

  // ---- shop reminders
  if (d.sales_tax) {
    const w = d.sales_tax;
    const month = new Date(`${w.period_start}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const body = `${month} sales tax: ${usd(w.amount_due_with_fees)}. File by the 20th (zero returns too).`;
    await notifyAdmins({ title: "DR-15 sales tax due", body, url: "/admin/taxes", tag: "dr15" });
    await sendEmail({
      to: SHOP.email,
      subject: `DR-15 reminder: ${month} — ${usd(w.amount_due_with_fees)}`,
      html: layout({ title: "Florida sales tax reminder", bodyHtml: `<p>${esc(body)}</p><p style="margin:24px 0">${button(`${SHOP.site}/admin/taxes`, "Open the DR-15 worksheet")}</p><p style="color:#6b7280;font-size:13px">Estimate — confirm with your CPA before filing.</p>` }),
    });
    out.sales_tax = true;
  }
  if (d.bills_due?.length) {
    const total = d.bills_due.reduce((s, b) => s + Number(b.total), 0);
    await notifyAdmins({ title: `${d.bills_due.length} bill${d.bills_due.length === 1 ? "" : "s"} due this week`, body: `${usd(total)} total`, url: "/admin/expenses?tab=bills", tag: "bills" });
    out.bills = d.bills_due.length;
  }
  if (d.estimated_tax) {
    await notifyAdmins({ title: "Estimated tax payment due", body: `Federal estimated tax is due ${d.estimated_tax.due_date}.`, url: "/admin/taxes?tab=income", tag: "est-tax" });
    out.estimated_tax = true;
  }

  return NextResponse.json({ ok: true, ...out });
}
