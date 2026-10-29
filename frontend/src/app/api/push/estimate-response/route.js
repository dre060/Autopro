// frontend/src/app/api/push/estimate-response/route.js
// Called by the customer page right after an estimate is approved/declined.
// Verifies the response really happened (via the token) before alerting admins.
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { notifyAdmins } from "@/lib/server/push";
import { rateLimited } from "@/lib/server/email";

export async function POST(request) {
  if (rateLimited(request, { limit: 5 })) return NextResponse.json({ ok: true });
  const { token } = await request.json().catch(() => ({}));
  if (!/^[0-9a-f-]{36}$/i.test(String(token || ""))) return NextResponse.json({ ok: true });

  const { data } = await supabaseServer().rpc("get_public_repair_order", { p_token: token });
  const o = data?.order;
  if (!o) return NextResponse.json({ ok: true });

  const recent = (at) => at && Date.now() - new Date(at).getTime() < 10 * 60 * 1000;
  const who = o.approved_by_name || data.customer?.name || "Customer";
  const vehicle = [data.vehicle?.year, data.vehicle?.make, data.vehicle?.model].filter(Boolean).join(" ");
  const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(o.total) || 0);

  if (o.status === "approved" && recent(o.approved_at)) {
    await notifyAdmins({ title: `✅ Estimate #${o.number} approved`, body: `${who} approved ${usd}${vehicle ? ` · ${vehicle}` : ""}`, url: "/admin/repair-orders", tag: `est-${o.number}` });
  } else if (recent(o.declined_at)) {
    await notifyAdmins({ title: `Estimate #${o.number} declined`, body: `${who} declined the estimate${vehicle ? ` for the ${vehicle}` : ""}.`, url: "/admin/repair-orders", tag: `est-${o.number}` });
  }
  return NextResponse.json({ ok: true });
}
