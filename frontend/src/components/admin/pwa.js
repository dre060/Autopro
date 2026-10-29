// frontend/src/components/admin/pwa.js — installable admin app helpers
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function registerAdminServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return Promise.resolve(null);
  // Dev chunk names aren't content-hashed, so the static cache would serve stale code.
  if (process.env.NODE_ENV === "development") return Promise.resolve(null);
  return navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" }).catch((err) => {
    console.warn("Service worker registration failed:", err.message);
    return null;
  });
}

export const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

export const isIOS = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);

// Captures Chrome/Edge/Android's install prompt so we can show our own button.
export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    const onPrompt = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return false;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    setPromptEvent(null);
    return outcome === "accepted";
  };

  return { canInstall: Boolean(promptEvent), installed, install, needsIOSSteps: !installed && isIOS() };
}

// ------------------------------------------------------------ push
function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupport() {
  if (typeof window === "undefined") return { supported: false };
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return {
    supported,
    configured: Boolean(VAPID_PUBLIC_KEY),
    permission: supported ? Notification.permission : "unsupported",
    // iPhone/iPad only allow web push for apps added to the Home Screen.
    needsInstall: isIOS() && !isStandalone(),
  };
}

export async function currentPushSubscription() {
  if (!pushSupport().supported) return null;
  const reg = await navigator.serviceWorker.getRegistration("/admin");
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function enablePush() {
  const support = pushSupport();
  if (!support.supported) throw new Error("This browser doesn't support notifications.");
  if (support.needsInstall) throw new Error("On iPhone, first add Auto Pro to your Home Screen (Share → Add to Home Screen), then open it from there.");
  if (!support.configured) throw new Error("Push keys aren't set up on the server yet.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications were blocked. Allow them in your browser/phone settings.");

  const reg = (await navigator.serviceWorker.getRegistration("/admin")) || (await registerAdminServiceWorker());
  if (!reg) throw new Error("Couldn't start the app's background worker.");
  await navigator.serviceWorker.ready;

  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
  const json = sub.toJSON();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent.slice(0, 250) },
      { onConflict: "endpoint" }
    );
  if (error) throw new Error(error.message);
  return true;
}

export async function disablePush() {
  const sub = await currentPushSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}
