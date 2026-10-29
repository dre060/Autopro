// frontend/src/components/admin/NotifyCustomer.js
// "Your car is ready" / status update to the customer by email, SMS (Twilio)
// or a text sent from the admin's own phone.
"use client";

import { useEffect, useState } from "react";
import { Mail, MessageSquareText, Smartphone, Send, BellRing } from "lucide-react";
import { DEFAULT_NOTIFY, templateVars, renderTemplate, smsHref } from "@/lib/notifyTemplates";
import { customerName, phone as fmtPhone } from "@/lib/format";
import { Button, Modal, Textarea, Field, cx, useUI } from "./ui";
import { useAdmin, adminFetch } from "./AdminContext";

let capsCache = null;
export async function notifyCapabilities() {
  if (!capsCache) capsCache = adminFetch("/api/admin/notify").catch(() => ({ email: false, sms: false, push: false }));
  return capsCache;
}

export function buildMessage(ro, shop, event) {
  const n = { ...DEFAULT_NOTIFY, ...(shop.notify || {}) };
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return renderTemplate(event === "ready" ? n.ready_template : n.status_template, templateVars({ ro, shop, origin }));
}

// Sends without a dialog (used by "auto-notify when ready").
export async function autoNotify(ro, shop) {
  const caps = await notifyCapabilities();
  const channels = [];
  if (caps.sms && ro.customer?.phone) channels.push("sms");
  if (caps.email && ro.customer?.email) channels.push("email");
  if (!channels.length) return { skipped: true };
  return adminFetch("/api/admin/notify", { roId: ro.id, channels, message: buildMessage(ro, shop, "ready"), event: "ready" });
}

export default function NotifyCustomerModal({ open, onClose, ro, event = "ready", onSent }) {
  const { shop } = useAdmin();
  const { toast } = useUI();
  const [caps, setCaps] = useState(null);
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState({ email: false, sms: false, manual: false });
  const [sending, setSending] = useState(false);

  const c = ro?.customer;
  const hasEmail = Boolean(c?.email);
  const hasPhone = Boolean(c?.phone);

  useEffect(() => {
    if (!open || !ro) return;
    setMessage(buildMessage(ro, shop, event));
    notifyCapabilities().then((cap) => {
      setCaps(cap);
      setChannels({
        email: hasEmail && cap.email,
        sms: hasPhone && cap.sms,
        manual: hasPhone && !cap.sms,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ro?.id, event]);

  if (!ro) return null;

  const send = async () => {
    const list = [channels.email && "email", channels.sms && "sms"].filter(Boolean);
    if (!list.length && !channels.manual) return toast("Pick at least one way to reach the customer.", "bad");
    setSending(true);
    try {
      if (channels.manual) list.push("sms_manual");
      const res = await adminFetch("/api/admin/notify", { roId: ro.id, channels: list, message, event });
      // Then open the phone's Messages app with the text ready to send.
      if (channels.manual) window.location.href = smsHref(c.phone, message);
      const failed = res.results.filter((r) => !r.success);
      if (failed.length) toast(`${failed.map((f) => `${f.channel}: ${f.error}`).join(" · ")}`, "bad");
      else toast(`${customerName(c)} was notified`);
      onSent?.();
      onClose();
    } catch (err) {
      toast(err.message, "bad");
    } finally {
      setSending(false);
    }
  };

  const Option = ({ id, icon: Icon, title, detail, disabled }) => (
    <label
      className={cx(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
        disabled ? "cursor-not-allowed opacity-50" : channels[id] ? "border-a-accent bg-a-accent/10" : "border-a-line hover:bg-a-hover"
      )}
    >
      <input
        type="checkbox"
        className="a-check mt-0.5"
        disabled={disabled}
        checked={Boolean(channels[id]) && !disabled}
        onChange={(e) => setChannels((ch) => ({ ...ch, [id]: e.target.checked, ...(id === "sms" && e.target.checked ? { manual: false } : {}), ...(id === "manual" && e.target.checked ? { sms: false } : {}) }))}
      />
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-a-muted" />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-a-text">{title}</span>
        <span className="block truncate text-xs text-a-faint">{detail}</span>
      </span>
    </label>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event === "ready" ? "Let the customer know it's ready" : "Send a status update"}
      description={c ? `${customerName(c)}${ro.vehicle ? ` · ${[ro.vehicle.year, ro.vehicle.make, ro.vehicle.model].filter(Boolean).join(" ")}` : ""}` : "No customer on this job"}
      footer={
        <>
          <Button onClick={onClose}>Not now</Button>
          <Button variant="primary" icon={Send} loading={sending} onClick={send} disabled={!c || !caps}>
            Notify customer
          </Button>
        </>
      }
    >
      {!c ? (
        <p className="text-sm text-a-muted">Add a customer to this repair order first.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Option id="sms" icon={MessageSquareText} title="Text message (automatic)" detail={!hasPhone ? "No phone number on file" : caps && !caps.sms ? "Set up Twilio to send texts automatically" : fmtPhone(c.phone)} disabled={!hasPhone || !caps?.sms} />
            <Option id="manual" icon={Smartphone} title="Text from my phone" detail={hasPhone ? `Opens Messages to ${fmtPhone(c.phone)} with the text filled in` : "No phone number on file"} disabled={!hasPhone} />
            <Option id="email" icon={Mail} title="Email" detail={!hasEmail ? "No email on file" : caps && !caps.email ? "Email sending isn't set up (Resend)" : c.email} disabled={!hasEmail || !caps?.email} />
          </div>
          <Field label="Message" hint="Includes a link where they can see the status and invoice. Edit the default wording in Settings → Notifications.">
            {(id) => <Textarea id={id} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />}
          </Field>
          <p className="flex items-center gap-1.5 text-xs text-a-faint">
            <BellRing className="h-3.5 w-3.5" /> {message.length} characters{message.length > 160 ? ` · ${Math.ceil(message.length / 153)} text segments` : ""}
          </p>
        </div>
      )}
    </Modal>
  );
}
