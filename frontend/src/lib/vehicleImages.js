// frontend/src/lib/vehicleImages.js
// The vehicles.images column is text[]. Older rows store each element as a
// JSON string ({"url": ..., "alt": ..., "isPrimary": ...}); newer rows store
// the same JSON. This turns any of those shapes into [{ url, alt, isPrimary }].

export const FALLBACK_VEHICLE_IMAGE = "/hero.jpg";

// Hosts that no longer exist (the original Supabase project was deleted).
const DEAD_HOSTS = ["fgzfltveywwzvvhqfuse.supabase.co"];

function parseOne(item) {
  if (!item) return null;
  if (typeof item === "object") return item;
  if (typeof item !== "string") return null;
  const s = item.trim();
  if (s.startsWith("{")) {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }
  return { url: s };
}

export function normalizeImages(vehicle) {
  let raw = vehicle?.images;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [raw];
    }
  }
  if (!Array.isArray(raw)) raw = raw ? [raw] : [];

  const title = [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" ") || "Vehicle";
  const images = raw
    .map(parseOne)
    .filter(Boolean)
    .map((img, i) => ({
      url: (img.url || img.publicUrl || img.src || "").trim(),
      alt: img.alt || title,
      isPrimary: Boolean(img.isPrimary ?? i === 0),
      path: img.path || img.fileName || null,
    }))
    .filter((img) => /^(https?:\/\/|\/)/.test(img.url))
    .filter((img) => !DEAD_HOSTS.some((h) => img.url.includes(h)));

  images.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  if (images.length) images.forEach((img, i) => (img.isPrimary = i === 0));
  return images;
}

// Same as normalizeImages but never empty (adds a placeholder).
export function displayImages(vehicle) {
  const images = normalizeImages(vehicle);
  if (images.length) return images;
  const title = [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" ");
  return [{ url: FALLBACK_VEHICLE_IMAGE, alt: title || "Vehicle", isPrimary: true, isFallback: true }];
}

// Serialize for the text[] column.
export function serializeImages(images) {
  return images.map((img, i) =>
    JSON.stringify({ url: img.url, alt: img.alt || "", isPrimary: i === 0, path: img.path || null })
  );
}
