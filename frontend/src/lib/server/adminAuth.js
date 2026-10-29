// frontend/src/lib/server/adminAuth.js
// Verifies that an API request comes from a signed-in admin. The browser
// sends its Supabase access token as "Authorization: Bearer <token>"; we ask
// the database (public.is_admin()) under that token, so the allowlist lives
// in exactly one place.
import { NextResponse } from "next/server";
import { supabaseForToken } from "@/lib/supabase";

export async function requireAdmin(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }

  const db = supabaseForToken(token);
  const { data: userData, error: userError } = await db.auth.getUser(token);
  if (userError || !userData?.user) {
    return { error: NextResponse.json({ error: "Session expired" }, { status: 401 }) };
  }

  const { data: isAdmin, error } = await db.rpc("is_admin");
  if (error || isAdmin !== true) {
    return { error: NextResponse.json({ error: "Not authorized" }, { status: 403 }) };
  }

  return { db, user: userData.user };
}

// Emails allowed to request a sign-in link. The database allowlist
// (public.admin_users) is what actually grants access; this list only stops
// the login form from emailing links to arbitrary addresses.
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "service@autoprorepairs.com,andrelewis1533@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
