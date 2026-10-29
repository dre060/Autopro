// frontend/src/app/api/appointments/route.js
// Public appointment request. Saves through the anon key (RLS only allows
// inserting a *pending* request) and emails the shop + customer via Resend.
// Reading appointments happens in the admin panel under the admin's session.
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseServer } from "@/lib/supabase";
import { sendEmail, layout, detailRows, button, nl2br, esc, SHOP, rateLimited, isEmail } from "@/lib/server/email";
import { notifyAdmins } from "@/lib/server/push";

const clean = (v, max = 500) => String(v ?? "").trim().slice(0, max);

// "3:00 PM" / "15:00" -> "15:00"
function to24h(t) {
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})\s*([ap]m)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23 || Number(m[2]) > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Honeypot: real visitors never fill this hidden field.
  if (body.website || body.company_website) {
    return NextResponse.json({ success: true, message: "Appointment request received." });
  }
  if (rateLimited(request, { limit: 5 })) {
    return NextResponse.json(
      { error: `Too many requests. Please call us at ${SHOP.phone}.` },
      { status: 429 }
    );
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 200).toLowerCase();
  const phone = clean(body.phone, 40);
  const service = clean(body.service, 120);
  const date = clean(body.date, 10);
  const time = clean(body.time, 20);
  const message = clean(body.message, 4000);
  const vehicleYear = clean(body.vehicleYear, 4);
  const vehicleMake = clean(body.vehicleMake, 60);
  const vehicleModel = clean(body.vehicleModel, 60);

  const missing = [["name", name], ["email", email], ["phone", phone], ["service", service], ["date", date], ["time", time]]
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    return NextResponse.json({ error: `Please fill in: ${missing.join(", ")}` }, { status: 400 });
  }
  if (!isEmail(email)) return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ error: "Please enter a valid phone number" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return NextResponse.json({ error: "Please choose a valid date" }, { status: 400 });
  }
  const time24 = to24h(time);
  if (!time24) return NextResponse.json({ error: "Please choose a valid time" }, { status: 400 });

  const year = /^\d{4}$/.test(vehicleYear) ? Number(vehicleYear) : null;
  const id = randomUUID();

  const row = {
    id,
    status: "pending",
    urgency: "medium",
    customer_name: name,
    customer_email: email,
    customer_phone: phone,
    appointment_date: date,
    appointment_time: time24,
    service,
    notes: message || null,
    vehicle_year: year,
    vehicle_make: vehicleMake || null,
    vehicle_model: vehicleModel || null,
    // legacy columns still read by older reports
    name,
    email,
    phone,
    date,
    time,
    message: message || null,
    vehicle_info: { year: vehicleYear || null, make: vehicleMake || null, model: vehicleModel || null },
  };

  const { error: dbError } = await supabaseServer().from("appointments").insert(row);
  if (dbError) console.error("Appointment insert failed:", dbError.message);

  const vehicle = [vehicleYear, vehicleMake, vehicleModel].filter(Boolean).join(" ");
  const when = `${new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at ${time}`;

  const shopEmail = await sendEmail({
    to: SHOP.email,
    replyTo: email,
    subject: `New appointment request: ${name} – ${service} (${date})`,
    html: layout({
      title: "New appointment request",
      preheader: `${name} · ${service} · ${when}`,
      bodyHtml: `<h2 style="margin:0 0 6px;font-size:20px;color:#111827">New appointment request</h2>
<p style="margin:0 0 18px;color:#6b7280;font-size:14px">${dbError ? "<strong style=\"color:#dc2626\">Not saved to the database — enter it manually.</strong>" : "Saved to the admin schedule as <strong>pending</strong>."}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${detailRows([
        ["Customer", name], ["Phone", phone], ["Email", email], ["Service", service],
        ["Requested", when], ["Vehicle", vehicle],
      ])}</table>
${message ? `<p style="margin:18px 0 6px;font-weight:600;color:#111827">Message</p><div style="background:#f9fafb;border-left:3px solid #2f7bff;padding:12px 14px;color:#374151;font-size:14px">${nl2br(message)}</div>` : ""}
<p style="margin:24px 0 0;text-align:center">${button(`${SHOP.site}/admin/schedule`, "Open schedule")}</p>`,
    }),
  });
  if (!shopEmail.success) console.error("Shop notification failed:", shopEmail.error);

  const customerEmail = await sendEmail({
    to: email,
    subject: "We received your appointment request – Auto Pro",
    html: layout({
      title: "Appointment request received",
      preheader: `We'll confirm your ${service} appointment shortly.`,
      bodyHtml: `<h2 style="margin:0 0 12px;font-size:20px;color:#111827">Thanks, ${esc(name.split(" ")[0])}!</h2>
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 18px">We received your appointment request and will call or email you to confirm it, usually within one business day.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${detailRows([
        ["Service", service], ["Requested time", when], ["Vehicle", vehicle],
      ])}</table>
<p style="color:#374151;font-size:14px;line-height:1.6;margin:18px 0">Need to change something? Just reply to this email or call us.</p>
<p style="margin:0;text-align:center">${button(`tel:${SHOP.phone.replace(/\D/g, "")}`, `Call ${SHOP.phone}`)}</p>`,
    }),
  });

  await notifyAdmins({
    title: "📅 New appointment request",
    body: `${name} · ${service} · ${when}`,
    url: dbError ? "/admin/schedule" : `/admin/schedule?id=${id}`,
    tag: `appt-${id}`,
  });

  if (dbError && !shopEmail.success) {
    return NextResponse.json(
      { error: `Sorry, we couldn't submit your request. Please call us at ${SHOP.phone}.` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Appointment request submitted! We'll confirm within one business day.",
    appointment: { id: dbError ? null : id, date, time, service, status: "pending" },
    notifications: { shopNotified: shopEmail.success, customerConfirmed: customerEmail.success },
  });
}
