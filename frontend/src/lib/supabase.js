// frontend/src/lib/supabase.js
// Browser + server Supabase client using the public (anon/publishable) key.
// Every permission check happens in the database through Row Level Security;
// admin rights come from public.is_admin() (see supabase/migrations).
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const VEHICLE_BUCKET = "vehicle-images";

const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!configured) {
  console.error(
    "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const supabase = configured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: typeof window !== "undefined",
        autoRefreshToken: typeof window !== "undefined",
        detectSessionInUrl: typeof window !== "undefined",
        storageKey: "autopro-admin-auth",
      },
    })
  : new Proxy(
      {},
      {
        get() {
          throw new Error("Supabase environment variables are missing.");
        },
      }
    );

// Columns the public site may read from `vehicles` (dealer cost fields are
// not granted to anonymous visitors, so `select('*')` would be rejected).
export const PUBLIC_VEHICLE_COLUMNS = [
  "id", "vin", "stock_number", "year", "make", "model", "trim", "body_type", "engine",
  "transmission", "drivetrain", "fuel_type", "mileage", "exterior_color", "interior_color",
  "interior_material", "list_price", "sale_price", "price", "status", "condition",
  "description", "features", "key_features", "accident_history", "number_of_owners",
  "slug", "views", "featured", "is_active", "created_at", "updated_at", "carfax_available",
  "carfax_url", "financing_available", "images", "monthly_payment", "service_records", "title_status",
].join(",");

// A client that acts as a specific signed-in user (used by API routes to run
// queries under the caller's own permissions).
export function supabaseForToken(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// Stateless server-side client for anonymous work (public forms, catalog).
export function supabaseServer() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export const isSupabaseConfigured = configured;
