// frontend/src/app/api/vehicles/route.js
// Public vehicle catalog. Database rows are merged with cars listed in code
// (src/data/localInventory.js). Creating/editing vehicles happens in the
// admin panel, directly against Supabase under the admin's session.
import { NextResponse } from "next/server";
import { supabaseServer, PUBLIC_VEHICLE_COLUMNS } from "@/lib/supabase";
import { displayImages } from "@/lib/vehicleImages";
import { filterLocalVehicles } from "@/data/localInventory";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const localMatches = filterLocalVehicles(searchParams);

  let query = supabaseServer()
    .from("vehicles")
    .select(PUBLIC_VEHICLE_COLUMNS)
    .or("is_active.is.null,is_active.eq.true")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  const status = searchParams.get("status");
  if (status) query = query.eq("status", status);
  const featured = searchParams.get("featured");
  if (featured) query = query.eq("featured", featured === "true");
  const make = searchParams.get("make");
  if (make && make !== "All Makes") query = query.eq("make", make);
  const model = searchParams.get("model");
  if (model && model !== "All Models") query = query.eq("model", model);
  const year = parseInt(searchParams.get("year"), 10);
  if (year) query = query.eq("year", year);
  const minPrice = parseInt(searchParams.get("minPrice"), 10);
  if (minPrice) query = query.gte("price", minPrice);
  const maxPrice = parseInt(searchParams.get("maxPrice"), 10);
  if (maxPrice) query = query.lte("price", maxPrice);
  const bodyType = searchParams.get("bodyType");
  if (bodyType) query = query.eq("body_type", bodyType);
  const limit = Math.min(parseInt(searchParams.get("limit"), 10) || 0, 200);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error("Vehicle query failed:", error.message);
    if (localMatches.length) {
      return NextResponse.json({ vehicles: localMatches, total: localMatches.length, degraded: true });
    }
    return NextResponse.json({ error: "Failed to fetch vehicles", vehicles: [] }, { status: 500 });
  }

  const dbVehicles = (data || []).map((v) => ({
    ...v,
    price: v.price ?? v.list_price,
    images: displayImages(v),
  }));
  const dbStock = new Set(dbVehicles.map((v) => v.stock_number).filter(Boolean));
  let vehicles = [...localMatches.filter((v) => !dbStock.has(v.stock_number)), ...dbVehicles];
  if (limit) vehicles = vehicles.slice(0, limit);

  return NextResponse.json(
    { vehicles, total: vehicles.length },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
