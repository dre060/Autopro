// frontend/src/app/admin/login/page.js
"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, KeyRound, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Input, Field, Segmented, ErrorBanner, Spinner } from "@/components/admin/ui";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next")?.startsWith("/admin") ? params.get("next") : "/admin";
  const [mode, setMode] = useState("link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("denied") ? "That account isn't on the admin list." : "");
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(true);

  // Arriving from an emailed link (tokens in the URL hash) or with an
  // existing session: verify admin access and continue.
  useEffect(() => {
    let done = false;
    const proceed = async (session) => {
      if (!session || done) return;
      done = true;
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (isAdmin === true) {
        router.replace(next);
      } else {
        await supabase.auth.signOut();
        setError("That account isn't on the admin list.");
        setChecking(false);
        done = false;
      }
    };
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) proceed(data.session);
      else setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") proceed(session);
    });
    const hashError = new URLSearchParams(window.location.hash.slice(1)).get("error_description");
    if (hashError) setError(hashError.replace(/\+/g, " "));
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendLink = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't send the link.");
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const signInWithPassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setError(
        /invalid login/i.test(err.message)
          ? "Wrong email or password. No password yet? Use “Email me a link”, then set one in Settings."
          : err.message
      );
      setBusy(false);
    }
    // success continues via onAuthStateChange
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(600px 300px at 20% 10%, rgb(var(--a-accent) / .18), transparent 70%), radial-gradient(500px 300px at 90% 90%, rgb(var(--a-violet) / .12), transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/brand-emblem.png" alt="Auto Pro" width={92} height={53} className="mb-4 h-auto w-[92px]" priority />
          <h1 className="font-display text-2xl font-semibold tracking-tight text-a-text">Shop manager</h1>
          <p className="mt-1 text-sm text-a-muted">Sign in to run the shop.</p>
        </div>

        <div className="rounded-2xl border border-a-line bg-a-panel p-6 shadow-pop">
          {sent ? (
            <div className="py-4 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-a-good" />
              <h2 className="text-base font-semibold text-a-text">Check your inbox</h2>
              <p className="mt-1 text-sm text-a-muted">
                If <span className="text-a-text">{email}</span> is an admin address, a sign-in link is on its way. Open it on this device.
              </p>
              <Button variant="ghost" size="sm" className="mt-5" onClick={() => setSent(false)}>
                Use a different email
              </Button>
            </div>
          ) : (
            <>
              <Segmented
                className="mb-5 w-full [&>button]:flex-1 [&>button]:justify-center"
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  setError("");
                }}
                options={[
                  { value: "link", label: "Email me a link" },
                  { value: "password", label: "Password" },
                ]}
              />
              <ErrorBanner error={error} />
              <form onSubmit={mode === "link" ? sendLink : signInWithPassword} className="space-y-4">
                <Field label="Email">
                  {(id) => (
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-a-faint" />
                      <Input
                        id={id}
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-10 pl-9"
                        placeholder="you@autoprorepairs.com"
                      />
                    </div>
                  )}
                </Field>
                {mode === "password" && (
                  <Field label="Password">
                    {(id) => (
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-a-faint" />
                        <Input
                          id={id}
                          type="password"
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-10 pl-9"
                        />
                      </div>
                    )}
                  </Field>
                )}
                <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
                  {mode === "link" ? "Send sign-in link" : "Sign in"}
                  {!busy && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-a-faint">
          <ShieldCheck className="h-3.5 w-3.5" /> Access is limited to approved Auto Pro admins.
        </p>
        <p className="mt-2 text-center text-xs">
          <Link href="/" className="text-a-muted hover:text-a-text">
            ← Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
