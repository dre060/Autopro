// frontend/src/lib/server/push.js — web push to every admin device that
// turned on notifications in the admin app. Device list comes from the
// push_targets() database function, unlocked with PUSH_SECRET.
import webpush from "web-push";
import { supabaseServer } from "@/lib/supabase";

export const isPushConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.PUSH_SECRET);

let configured = false;
function setup() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:service@autoprorepairs.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  configured = true;
}

// payload: { title, body, url, tag }
export async function notifyAdmins(payload) {
  if (!isPushConfigured()) return { sent: 0, skipped: true };
  try {
    setup();
    const db = supabaseServer();
    const { data: targets, error } = await db.rpc("push_targets", { p_secret: process.env.PUSH_SECRET });
    if (error || !targets?.length) return { sent: 0, error: error?.message };

    const message = JSON.stringify({ icon: "/android-chrome-192x192.png", badge: "/favicon-32x32.png", ...payload });
    let sent = 0;
    await Promise.all(
      targets.map(async (t) => {
        try {
          await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, message, { TTL: 60 * 60 * 24 });
          sent += 1;
        } catch (err) {
          // Device unsubscribed or uninstalled the app: forget it.
          if (err.statusCode === 404 || err.statusCode === 410) {
            await db.rpc("remove_push_target", { p_secret: process.env.PUSH_SECRET, p_endpoint: t.endpoint });
          } else {
            console.error("Push failed:", err.statusCode || err.message);
          }
        }
      })
    );
    return { sent };
  } catch (err) {
    console.error("Push error:", err.message);
    return { sent: 0, error: err.message };
  }
}
