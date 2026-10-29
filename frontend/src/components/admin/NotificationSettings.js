// frontend/src/components/admin/NotificationSettings.js
"use client";

import { useEffect, useState } from "react";
import { BellRing, Smartphone, CheckCircle2, XCircle, Download, Send } from "lucide-react";
import { DEFAULT_NOTIFY } from "@/lib/notifyTemplates";
import { Button, Card, CardHeader, TextField, Toggle, Badge, useUI } from "./ui";
import { adminFetch } from "./AdminContext";
import { notifyCapabilities } from "./NotifyCustomer";
import { pushSupport, currentPushSubscription, enablePush, disablePush, useInstallPrompt, isStandalone } from "./pwa";

// Customer message settings (saved with the rest of Settings).
export function CustomerNotificationSettings({ value, onChange }) {
  const n = { ...DEFAULT_NOTIFY, ...(value || {}) };
  const set = (k, v) => onChange({ ...n, [k]: v });
  const [caps, setCaps] = useState(null);
  useEffect(() => {
    notifyCapabilities().then(setCaps);
  }, []);

  const Status = ({ ok, label, detail }) => (
    <div className="flex items-start gap-2 text-sm">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-a-good" /> : <XCircle className="mt-0.5 h-4 w-4 text-a-faint" />}
      <span>
        <span className="text-a-text">{label}</span>
        <span className="block text-xs text-a-faint">{detail}</span>
      </span>
    </div>
  );

  return (
    <Card>
      <CardHeader icon={BellRing} title="Customer notifications" description="Tell customers when their vehicle is ready for pickup." />
      <div className="space-y-4 px-5 pb-5">
        <div className="grid gap-3 rounded-lg border border-a-line p-3 sm:grid-cols-3">
          <Status ok={caps?.email} label="Email" detail={caps?.email ? "Sends from your Resend account" : "Add RESEND_API_KEY"} />
          <Status ok={caps?.sms} label="Automatic texts" detail={caps?.sms ? "Sends through Twilio" : "Add Twilio keys to enable"} />
          <Status ok label="Text from phone" detail="Always available in the app" />
        </div>
        <Toggle
          checked={Boolean(n.auto_ready)}
          onChange={(v) => set("auto_ready", v)}
          label="Notify automatically when a job is marked “Ready for pickup”"
          description="Sends by text (if set up) and email right away. When off, you're asked first and can edit the message."
        />
        <TextField as="textarea" rows={3} label="“Ready for pickup” message" value={n.ready_template} onChange={(e) => set("ready_template", e.target.value)} />
        <TextField as="textarea" rows={3} label="Status update message" value={n.status_template} onChange={(e) => set("status_template", e.target.value)} />
        <p className="text-xs text-a-faint">
          Placeholders: {"{first_name} {vehicle} {total} {balance} {link} {status} {shop_phone} {ro_number} {invoice_number}"}. {"{link}"} opens a page where the customer sees the job status and invoice.
        </p>
      </div>
    </Card>
  );
}

// Per-device: install the app + push alerts for the shop.
export function DeviceAppSettings() {
  const { toast } = useUI();
  const { canInstall, install, installed, needsIOSSteps } = useInstallPrompt();
  const [support, setSupport] = useState(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setSupport(pushSupport());
    setSubscribed(Boolean(await currentPushSubscription()));
  };
  useEffect(() => {
    refresh();
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      if (subscribed) {
        await disablePush();
        toast("Notifications turned off on this device");
      } else {
        await enablePush();
        toast("Notifications on — you'll get alerts for bookings, messages and approvals");
      }
    } catch (e) {
      toast(e.message, "bad");
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const test = async () => {
    setBusy(true);
    try {
      const r = await adminFetch("/api/admin/notify", { testPush: true });
      toast(`Test sent to ${r.sent} device${r.sent === 1 ? "" : "s"}`);
    } catch (e) {
      toast(e.message, "bad");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader icon={Smartphone} title="This device" description="Install Auto Pro as an app and get alerts on this phone or computer." />
      <div className="space-y-4 px-5 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-a-line p-3">
          <div>
            <div className="text-sm font-medium">App</div>
            <div className="text-xs text-a-faint">
              {installed || isStandalone() ? "Running as the installed app." : needsIOSSteps ? "iPhone: Safari → Share → Add to Home Screen." : canInstall ? "Ready to install." : "Use your browser menu → Install app / Add to Home screen."}
            </div>
          </div>
          {installed || isStandalone() ? <Badge tone="good" dot>Installed</Badge> : canInstall ? <Button size="sm" icon={Download} onClick={install}>Install</Button> : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-a-line p-3">
          <div>
            <div className="text-sm font-medium">Push notifications</div>
            <div className="text-xs text-a-faint">
              {!support ? "Checking…" : !support.supported ? "Not supported in this browser." : support.needsInstall ? "On iPhone, install the app first, then turn this on from the app." : subscribed ? "On: new bookings, website messages and estimate approvals." : "Off on this device."}
            </div>
          </div>
          <div className="flex gap-2">
            {subscribed && <Button size="sm" variant="ghost" icon={Send} loading={busy} onClick={test}>Test</Button>}
            <Button size="sm" variant={subscribed ? "secondary" : "primary"} loading={busy} disabled={!support?.supported || support?.needsInstall} onClick={toggle}>
              {subscribed ? "Turn off" : "Turn on"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
