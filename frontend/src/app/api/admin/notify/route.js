// frontend/src/app/api/admin/notify/route.js
// GET  → which channels are set up (email / sms / push)
// POST → { roId, channels: ["email","sms","sms_manual"], message, event }
//        sends the customer update and records it in `notifications`
// POST → { testPush: true } sends a test alert to every admin device
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminAuth";
import { sendEmail, layout, button, nl2br, esc, isEmailConfigured, isEmail, SHOP } from "@/lib/server/email";
import { sendSms, isSmsConfigured } from "@/lib/server/sms";
import { notifyAdmins, isPushConfigured } from "@/lib/server/push";

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  return NextResponse.json({ email: isEmailConfigured(), sms: isSmsConfigured(), push: isPushConfigured() });
}

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const { db, user } = auth;
  const body = await request.json().catch(() => ({}));

  if (body.testPush) {
    const r = await notifyAdmins({ title: "Auto Pro admin", body: `Test notification from ${user.email}. You're all set!`, url: "/admin", tag: "test" });
    if (r.skipped) return NextResponse.json({ error: "Push isn't configured on the server yet (VAPID keys / PUSH_SECRET)." }, { status: 400 });
    return NextResponse.json({ success: true, sent: r.sent });
  }

  const channels = Array.isArray(body.channels) ? body.channels.filter((c) => ["email", "sms", "sms_manual"].includes(c)) : [];
  const message = String(body.message || "").trim().slice(0, 1500);
  const event = ["ready", "status", "custom"].includes(body.event) ? body.event : "custom";
  if (!channels.length) return NextResponse.json({ error: "Pick at least one way to notify." }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Write a message first." }, { status: 400 });

  const { data: ro, error } = await db
    .from("repair_orders")
    .select("id, number, invoice_number, status, public_token, total, balance_due, customer_id, customer:customers(first_name,last_name,company,email,phone), vehicle:customer_vehicles(year,make,model)")
    .eq("id", body.roId)
    .single();
  if (error || !ro) return NextResponse.json({ error: "Repair order not found" }, { status: 404 });

  const origin = request.headers.get("origin") || SHOP.site;
  const link = `${origin}/i/${ro.public_token}`;
  const vehicle = [ro.vehicle?.year, ro.vehicle?.make, ro.vehicle?.model].filter(Boolean).join(" ");
  const results = [];

  for (const channel of channels) {
    let r;
    let recipient;
    if (channel === "email") {
      recipient = ro.customer?.email;
      if (!isEmail(recipient)) r = { success: false, error: "No valid email on file" };
      else {
        const subject = event === "ready"
          ? `Your ${vehicle || "vehicle"} is ready for pickup – Auto Pro`
          : `Update on your ${vehicle || "vehicle"} – Auto Pro`;
        r = await sendEmail({
          to: recipient,
          subject,
          html: layout({
            title: subject,
            preheader: message.slice(0, 120),
            bodyHtml: `${event === "ready" ? `<div style="font-size:40px;line-height:1;margin-bottom:8px">✅</div><h2 style="margin:0 0 14px;font-size:21px;color:#111827">Your ${esc(vehicle || "vehicle")} is ready!</h2>` : `<h2 style="margin:0 0 14px;font-size:20px;color:#111827">Update on your ${esc(vehicle || "vehicle")}</h2>`}
<div style="color:#374151;font-size:15px;line-height:1.65">${nl2br(message.split(link).join("").replace(/\s*(Details|Track it here):\s*(–\s*)?/g, " ").replace(/\s{2,}/g, " ").trim())}</div>
<p style="margin:24px 0 6px;text-align:center">${button(link, event === "ready" ? "View invoice & details" : "Track your vehicle")}</p>
<p style="margin:14px 0 0;text-align:center;color:#6b7280;font-size:13px">${esc(SHOP.address)} · ${esc(SHOP.phone)}</p>`,
          }),
        });
      }
    } else if (channel === "sms") {
      recipient = ro.customer?.phone;
      r = recipient ? await sendSms({ to: recipient, body: message }) : { success: false, error: "No phone number on file" };
    } else {
      // Sent from the admin's own phone (Messages app) — just record it.
      recipient = ro.customer?.phone;
      r = { success: true };
    }

    results.push({ channel, ...r });
    await db.from("notifications").insert({
      repair_order_id: ro.id,
      customer_id: ro.customer_id,
      channel,
      event,
      recipient: recipient || null,
      body: message,
      status: r.success ? "sent" : "failed",
      error: r.success ? null : r.error,
      provider_id: r.id || null,
    });
  }

  const ok = results.filter((r) => r.success);
  if (ok.length) {
    await db.from("repair_orders").update({ customer_notified_at: new Date().toISOString() }).eq("id", ro.id);
    await db.from("activity_log").insert({
      action: "notify",
      entity: "repair_orders",
      entity_id: ro.id,
      summary: `Notified customer (${ok.map((r) => (r.channel === "sms_manual" ? "text" : r.channel)).join(", ")}): ${event === "ready" ? "ready for pickup" : "status update"} – RO #${ro.number}`,
    });
  }

  return NextResponse.json({ success: ok.length > 0, results }, { status: ok.length ? 200 : 502 });
}
