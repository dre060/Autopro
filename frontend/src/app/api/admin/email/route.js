// frontend/src/app/api/admin/email/route.js
// Outbound customer email from the admin panel: estimate/invoice links,
// replies to website messages and appointment confirmations.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminAuth";
import { sendEmail, layout, detailRows, button, nl2br, esc, SHOP, isEmail } from "@/lib/server/email";

const money = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n) || 0);

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const { db } = auth;

  const body = await request.json().catch(() => ({}));
  const origin = request.headers.get("origin") || SHOP.site;
  const note = String(body.note || "").slice(0, 4000);

  if (body.type === "repair_order") {
    const { data: ro, error } = await db
      .from("repair_orders")
      .select("id, number, invoice_number, status, public_token, total, balance_due, invoiced_at, due_date, terms, customer:customers(first_name,last_name,company,email), vehicle:customer_vehicles(year,make,model)")
      .eq("id", body.id)
      .single();
    if (error || !ro) return NextResponse.json({ error: "Repair order not found" }, { status: 404 });

    const to = String(body.to || ro.customer?.email || "").trim();
    if (!isEmail(to)) return NextResponse.json({ error: "This customer has no valid email address." }, { status: 400 });

    const isInvoice = Boolean(ro.invoiced_at);
    const docName = isInvoice ? "Invoice" : "Estimate";
    const docNumber = isInvoice ? ro.invoice_number : ro.number;
    const { data: shopRow } = await db.from("settings").select("value").eq("key", "shop").maybeSingle();
    const payLink = isInvoice && Number(ro.balance_due) > 0 ? shopRow?.value?.payment_link : null;
    const link = `${origin}/i/${ro.public_token}`;
    const vehicle = [ro.vehicle?.year, ro.vehicle?.make, ro.vehicle?.model].filter(Boolean).join(" ");
    const first = ro.customer?.first_name || ro.customer?.company || "there";

    const result = await sendEmail({
      to,
      subject: `${docName} #${docNumber} from Auto Pro${vehicle ? ` – ${vehicle}` : ""}`,
      html: layout({
        title: `${docName} #${docNumber}`,
        preheader: isInvoice ? `Balance due ${money(ro.balance_due)}` : `Estimate total ${money(ro.total)} – review and approve online`,
        bodyHtml: `<h2 style="margin:0 0 12px;font-size:20px;color:#111827">Hi ${esc(first)},</h2>
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 18px">${
          isInvoice
            ? "Here is your invoice from Auto Pro. You can view, download or print it online."
            : "Here is your estimate from Auto Pro. Please review it online and approve it so we can get started."
        }</p>
${note ? `<div style="background:#f9fafb;border-left:3px solid #2f7bff;padding:12px 14px;margin:0 0 18px;color:#374151;font-size:14px;line-height:1.6">${nl2br(note)}</div>` : ""}
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${detailRows([
          [`${docName} #`, String(docNumber)],
          ["Vehicle", vehicle],
          ["Total", money(ro.total)],
          isInvoice ? ["Balance due", money(ro.balance_due)] : null,
          isInvoice && ro.due_date ? ["Due date", new Date(`${ro.due_date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })] : null,
          isInvoice && ro.terms ? ["Terms", ro.terms] : null,
        ].filter(Boolean))}</table>
<p style="margin:24px 0 8px;text-align:center">${button(link, isInvoice ? "View invoice" : "Review & approve estimate")}</p>
${payLink ? `<p style="margin:8px 0;text-align:center"><a href="${esc(payLink)}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 26px;border-radius:8px;font-size:15px">Pay ${esc(money(ro.balance_due))} online</a></p>` : ""}
<p style="margin:0;text-align:center;color:#9ca3af;font-size:12px">Questions? Reply to this email or call ${esc(SHOP.phone)}.</p>`,
      }),
    });
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 502 });
    await db.from("repair_orders").update({ sent_at: new Date().toISOString() }).eq("id", ro.id);
    return NextResponse.json({ success: true, link });
  }

  if (body.type === "message_reply") {
    const { data: msg, error } = await db.from("contact_messages").select("*").eq("id", body.id).single();
    if (error || !msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    if (!note.trim()) return NextResponse.json({ error: "Write a reply first." }, { status: 400 });

    const result = await sendEmail({
      to: msg.email,
      subject: `Re: ${msg.subject}`,
      html: layout({
        title: `Re: ${msg.subject}`,
        bodyHtml: `<div style="color:#111827;font-size:15px;line-height:1.7">${nl2br(note)}</div>
<div style="margin-top:26px;padding-top:14px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px">
<div style="margin-bottom:6px">On ${esc(new Date(msg.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }))}, ${esc(msg.name)} wrote:</div>
<div style="padding-left:12px;border-left:2px solid #e5e7eb">${nl2br(msg.message)}</div></div>`,
      }),
    });
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 502 });

    const stamp = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
    await db
      .from("contact_messages")
      .update({
        responded: true,
        response_notes: `${msg.response_notes ? `${msg.response_notes}\n\n` : ""}[Emailed ${stamp}]\n${note}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", msg.id);
    return NextResponse.json({ success: true });
  }

  if (body.type === "appointment") {
    const { data: a, error } = await db.from("appointments").select("*").eq("id", body.id).single();
    if (error || !a) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    const to = a.customer_email || a.email;
    if (!isEmail(to)) return NextResponse.json({ error: "This appointment has no valid email address." }, { status: 400 });

    const name = a.customer_name || a.name || "there";
    const day = a.appointment_date || a.date;
    const when = `${new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}${
      a.appointment_time ? ` at ${fmtTime(a.appointment_time)}` : a.time ? ` at ${a.time}` : ""
    }`;
    const cancelled = body.kind === "cancelled";

    const result = await sendEmail({
      to,
      subject: cancelled ? "Your Auto Pro appointment was cancelled" : `Confirmed: ${a.service || "your appointment"} on ${when}`,
      html: layout({
        title: cancelled ? "Appointment cancelled" : "Appointment confirmed",
        bodyHtml: `<h2 style="margin:0 0 12px;font-size:20px;color:#111827">${cancelled ? "Appointment cancelled" : "You're all set!"}</h2>
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 18px">Hi ${esc(name.split(" ")[0])}, ${
          cancelled
            ? "your appointment below has been cancelled. Call or reply if you'd like to reschedule."
            : "your appointment is confirmed. Please bring your vehicle to the shop at the time below."
        }</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${detailRows([
          ["Service", a.service], ["When", when], ["Where", SHOP.address],
        ])}</table>
${note ? `<div style="background:#f9fafb;border-left:3px solid #2f7bff;padding:12px 14px;margin:18px 0 0;color:#374151;font-size:14px;line-height:1.6">${nl2br(note)}</div>` : ""}`,
      }),
    });
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 502 });
    if (!cancelled) await db.from("appointments").update({ confirmation_sent: true }).eq("id", a.id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
}

function fmtTime(t) {
  const [h, m] = String(t).split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
