// frontend/src/app/i/[token]/page.js
// Customer view of an estimate or invoice. Data comes from the
// get_public_repair_order() database function, which only answers for the
// exact (unguessable) token in the link.
"use client";

import { useCallback, useEffect, useState } from "react";
import { Printer, CheckCircle2, XCircle, Phone, Loader2, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import RepairOrderDocument from "@/components/admin/RepairOrderDocument";
import "../../admin/admin.css";

export default function CustomerDocumentPage({ params }) {
  const [doc, setDoc] = useState(undefined);
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [picked, setPicked] = useState(null); // item ids the customer approves

  const load = useCallback(async () => {
    if (!/^[0-9a-f-]{36}$/i.test(params.token)) return setDoc(null);
    const { data, error: err } = await supabase.rpc("get_public_repair_order", { p_token: params.token });
    setDoc(err ? null : data);
    if (data?.items) setPicked((p) => p ?? data.items.filter((i) => i.approved !== false).map((i) => i.id));
  }, [params.token]);

  // Record the customer's first view (skipped when a signed-in admin opens it).
  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(params.token)) return;
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) supabase.rpc("mark_document_viewed", { p_token: params.token }).then(() => {});
    });
  }, [params.token]);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (approve) => {
    setError("");
    if (name.trim().length < 2) return setError("Type your full name to sign.");
    if (approve && !agree) return setError("Please check the box to authorize the work.");
    if (approve && !picked?.length) return setError("Select at least one item to approve, or decline the estimate.");
    setBusy(approve ? "approve" : "decline");
    const { data, error: err } = await supabase.rpc("respond_to_estimate_lines", { p_token: params.token, p_name: name.trim(), p_item_ids: approve ? picked : [] });
    setBusy(null);
    if (err) return setError(err.message);
    setDone(data);
    // Alert the shop's devices (server verifies the response via the token).
    fetch("/api/push/estimate-response", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: params.token }) }).catch(() => {});
    load();
  };

  if (doc === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-center text-slate-700">
        <div>
          <h1 className="text-xl font-semibold">This link isn&apos;t valid</h1>
          <p className="mt-2 text-sm text-slate-500">It may have been cancelled. Please call Auto Pro at (352) 933-5181.</p>
        </div>
      </div>
    );
  }

  const order = doc.order;
  const shop = doc.shop || {};
  const canRespond = order.status === "estimate" && !order.invoiced_at && !order.declined_at;

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-6 sm:py-10" style={{ colorScheme: "light" }}>
      <div className="no-print mx-auto mb-4 flex max-w-[860px] flex-wrap items-center justify-between gap-3">
        <a href={`tel:${String(shop.phone || "3529335181").replace(/\D/g, "")}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <Phone className="h-4 w-4" /> Questions? Call {shop.phone || "(352) 933-5181"}
        </a>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      {done && (
        <div className={`no-print mx-auto mb-4 flex max-w-[860px] items-center gap-3 rounded-xl px-5 py-4 text-sm font-medium ${done === "approved" ? "bg-emerald-50 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
          {done === "approved" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          {done === "approved" ? "Thank you! Your approval was sent to the shop and we'll get started." : "Got it — we've let the shop know. Call us if you have questions."}
        </div>
      )}

      {doc.vehicle && order.status !== "cancelled" && !(order.invoiced_at && order.payment_status === "paid" && order.status === "completed") && (
        <JobTracker status={order.status} vehicle={doc.vehicle} shop={shop} />
      )}

      <RepairOrderDocument shop={shop} order={order} customer={doc.customer} vehicle={doc.vehicle} items={doc.items} payments={doc.payments} />

      {canRespond && (
        <div className="no-print mx-auto mt-5 max-w-[860px] rounded-xl bg-white p-6 shadow-xl sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Approve this estimate</h2>
          <p className="mt-1 text-sm text-slate-500">Choose the work you want done, then type your name to sign. Unchecked items won&apos;t be done.</p>
          <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200">
            {doc.items.map((i) => {
              const on = picked?.includes(i.id);
              return (
                <li key={i.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-4 py-3 text-sm">
                    <input type="checkbox" className="mt-0.5 h-4 w-4" checked={Boolean(on)} onChange={() => setPicked((p) => (on ? p.filter((x) => x !== i.id) : [...(p || []), i.id]))} />
                    <span className={`flex-1 ${on ? "text-slate-900" : "text-slate-400 line-through"}`}>{i.item_name ? `${i.item_name}: ` : ""}{i.description}</span>
                    <span className={`tabular-nums ${on ? "text-slate-900" : "text-slate-400"}`}>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(i.amount)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-right text-sm text-slate-600">
            Selected work {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(doc.items.filter((i) => picked?.includes(i.id)).reduce((t, i) => t + Number(i.amount), 0))} plus applicable Florida sales tax
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="h-11 flex-1 rounded-lg border border-slate-300 px-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <label className="mt-3 flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4" />
            I authorize Auto Pro to perform the work I selected above, plus tax, and any additional work only with my further approval.
          </label>
          {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => respond(true)}
              disabled={Boolean(busy)}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-6 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve selected work
            </button>
            <button
              onClick={() => respond(false)}
              disabled={Boolean(busy)}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 px-5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {busy === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Decline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const STEPS = [
  { key: "approved", label: "Approved" },
  { key: "in_progress", label: "In progress" },
  { key: "ready", label: "Ready for pickup" },
  { key: "completed", label: "Picked up" },
];
const RANK = { estimate: 0, approved: 1, waiting_parts: 2, in_progress: 2, ready: 3, completed: 4 };

function JobTracker({ status, vehicle, shop }) {
  const rank = RANK[status] ?? 0;
  const title = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  const headline = {
    estimate: "Waiting for your approval",
    approved: "Approved — we'll start soon",
    in_progress: "We're working on it",
    waiting_parts: "Waiting on parts",
    ready: "Ready for pickup!",
    completed: "Picked up — thank you!",
  }[status];
  return (
    <div className="no-print mx-auto mb-4 max-w-[860px] rounded-xl bg-white p-5 shadow-xl sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your {title}</div>
          <div className={`mt-0.5 text-xl font-bold ${status === "ready" ? "text-emerald-600" : "text-slate-900"}`}>{headline}</div>
        </div>
        {status === "ready" && shop.address && <div className="text-sm text-slate-500">Pick up at {shop.address}</div>}
      </div>
      <ol className="mt-5 grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => {
          const reached = rank >= i + 1;
          return (
            <li key={s.key} className="flex flex-col gap-2">
              <div className={`h-1.5 rounded-full ${reached ? (status === "ready" || status === "completed" ? "bg-emerald-500" : "bg-blue-600") : "bg-slate-200"}`} />
              <div className={`flex items-center gap-1 text-[11px] font-medium sm:text-xs ${reached ? "text-slate-900" : "text-slate-400"}`}>
                {reached && <Check className="h-3 w-3" />}
                {s.key === "in_progress" && status === "waiting_parts" ? "Waiting on parts" : s.label}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
