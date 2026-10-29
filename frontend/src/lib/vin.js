// frontend/src/lib/vin.js
// Decode a VIN with NHTSA's free vPIC API (no key required).
export const isVin = (v) => /^[A-HJ-NPR-Z0-9]{17}$/i.test(String(v || "").trim());

export async function decodeVin(vin) {
  const v = String(vin || "").trim().toUpperCase();
  if (!isVin(v)) throw new Error("A VIN is 17 letters/numbers (no I, O or Q).");
  const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${v}?format=json`);
  if (!res.ok) throw new Error("VIN lookup is unavailable right now.");
  const json = await res.json();
  const r = json?.Results?.[0] || {};
  if (!r.Make) throw new Error("No match for that VIN.");
  const title = (s) => (s ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "");
  const engine = [
    r.DisplacementL ? `${Number(r.DisplacementL).toFixed(1)}L` : "",
    r.EngineCylinders ? `${r.EngineConfiguration?.startsWith("V") ? "V" : r.EngineConfiguration?.startsWith("In-Line") ? "I" : ""}${r.EngineCylinders}` : "",
    r.FuelTypePrimary && !/gasoline/i.test(r.FuelTypePrimary) ? r.FuelTypePrimary : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    vin: v,
    year: r.ModelYear ? Number(r.ModelYear) : null,
    make: title(r.Make),
    model: r.Model || "",
    trim: r.Trim || r.Series || "",
    engine,
    body_type: r.BodyClass || "",
    drivetrain: r.DriveType || "",
    fuel_type: r.FuelTypePrimary || "",
    transmission: r.TransmissionStyle || "",
  };
}
