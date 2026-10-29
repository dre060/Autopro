// frontend/src/app/api/contact/route.js
// Public contact form + vehicle inquiries. Saves to contact_messages (anon
// insert allowed by RLS) and notifies the shop via Resend.
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { sendEmail, layout, detailRows, button, nl2br, SHOP, rateLimited, isEmail } from "@/lib/server/email";
import { notifyAdmins } from "@/lib/server/push";

const clean = (v, max = 500) => String(v ?? "").trim().slice(0, max);

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.website || body.company_website) {
    return NextResponse.json({ success: true, message: "Message sent." });
  }
  if (rateLimited(request, { limit: 6 })) {
    return NextResponse.json({ error: `Too many messages. Please call us at ${SHOP.phone}.` }, { status: 429 });
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 200).toLowerCase();
  const phone = clean(body.phone, 40);
  let subject = clean(body.subject, 200);
  let message = clean(body.message, 5000);

  // Vehicle inquiries from /inventory/[id]
  const v = body.vehicleInfo && typeof body.vehicleInfo === "object" ? body.vehicleInfo : null;
  if (v) {
    const title = [v.year, v.make, v.model, v.trim].map((x) => clean(x, 60)).filter(Boolean).join(" ");
    subject = subject || `Vehicle inquiry – ${title}`;
    message = [
      message,
      "",
      `Vehicle: ${title}`,
      `Stock #: ${clean(v.stock_number, 40) || "N/A"}`,
      v.vin ? `VIN: ${clean(v.vin, 40)}` : null,
      `Trade-in: ${body.tradeIn ? "Yes" : "No"}`,
    ]
      .filter((x) => x !== null)
      .join("\n")
      .trim();
  }

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "Please fill in your name, email, subject and message." }, { status: 400 });
  }
  if (!isEmail(email)) return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });

  const { error: dbError } = await supabaseServer()
    .from("contact_messages")
    .insert({ name, email, phone: phone || null, subject, message, responded: false });
  if (dbError) console.error("Contact insert failed:", dbError.message);

  const result = await sendEmail({
    to: SHOP.email,
    replyTo: email,
    subject: `${v ? "Vehicle inquiry" : "Website message"}: ${subject} – ${name}`,
    html: layout({
      title: "New website message",
      preheader: `${name}: ${subject}`,
      bodyHtml: `<h2 style="margin:0 0 16px;font-size:20px;color:#111827">${v ? "New vehicle inquiry" : "New website message"}</h2>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${detailRows([
        ["From", name], ["Email", email], ["Phone", phone], ["Subject", subject],
      ])}</table>
<div style="background:#f9fafb;border-left:3px solid #2f7bff;padding:12px 14px;margin:18px 0;color:#374151;font-size:14px;line-height:1.6">${nl2br(message)}</div>
<p style="margin:0;text-align:center">${button(`${SHOP.site}/admin/messages`, "Open inbox")}</p>`,
    }),
  });
  if (!result.success) console.error("Contact email failed:", result.error);

  await notifyAdmins({
    title: v ? "🚗 New vehicle inquiry" : "💬 New website message",
    body: `${name}: ${subject}`,
    url: "/admin/messages",
    tag: `msg-${Date.now()}`,
  });

  if (dbError && !result.success) {
    return NextResponse.json({ error: `Sorry, your message didn't go through. Please call ${SHOP.phone}.` }, { status: 500 });
  }
  return NextResponse.json({ success: true, message: "Message sent! We'll get back to you soon." });
}
