// frontend/src/app/api/health/route.js
// Configuration + connectivity check. Reports only yes/no flags, never values.
import { NextResponse } from "next/server";
import { supabaseServer, isSupabaseConfigured, SUPABASE_URL } from "@/lib/supabase";
import { isEmailConfigured } from "@/lib/server/email";
import { isSmsConfigured } from "@/lib/server/sms";
import { isPushConfigured } from "@/lib/server/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    supabase_env: isSupabaseConfigured,
    supabase_project: SUPABASE_URL ? new URL(SUPABASE_URL).hostname.split(".")[0] : null,
    database: false,
    database_error: null,
    email_env: isEmailConfigured(),
    sms_env: isSmsConfigured(),
    push_env: isPushConfigured(),
    receipt_ocr_env: Boolean(process.env.ANTHROPIC_API_KEY),
    cron_env: Boolean(process.env.CRON_SECRET),
    // The service role key is no longer used by this app; it should be removed.
    service_role_key_present: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    public_resend_key_present: Boolean(process.env.NEXT_PUBLIC_RESEND_API_KEY),
  };

  if (isSupabaseConfigured) {
    const { error } = await supabaseServer().from("services").select("id", { head: true, count: "exact" });
    checks.database = !error;
    if (error) checks.database_error = error.message?.includes("Invalid API key") ? "Invalid API key" : error.code || "error";
  }

  const ok = checks.supabase_env && checks.database && checks.email_env && !checks.public_resend_key_present;
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
