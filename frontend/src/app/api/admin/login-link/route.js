// frontend/src/app/api/admin/login-link/route.js
// Emails a one-time sign-in link to an allowlisted admin. The first link also
// creates the account, so no password ever has to be shared. Responses are
// identical for allowed and unknown emails (no account enumeration).
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { ADMIN_EMAILS } from "@/lib/server/adminAuth";
import { rateLimited, isEmail } from "@/lib/server/email";

const GENERIC = { success: true, message: "If that email belongs to an admin, a sign-in link is on its way." };

export async function POST(request) {
  if (rateLimited(request, { limit: 5, windowMs: 15 * 60 * 1000 })) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const { email: raw } = await request.json().catch(() => ({}));
  const email = String(raw || "").trim().toLowerCase();
  if (!isEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!ADMIN_EMAILS.includes(email)) return NextResponse.json(GENERIC);

  const origin =
    request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://www.autoprorepairs.com";

  const { error } = await supabaseServer().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${origin}/admin/login` },
  });

  if (error) {
    console.error("Admin sign-in link failed:", error.message);
    const msg = /rate|limit|seconds/i.test(error.message)
      ? "A link was sent recently. Wait a minute, then try again."
      : "Couldn't send the sign-in link. Check the Supabase Auth email settings.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
  return NextResponse.json(GENERIC);
}
