// frontend/src/data/localInventory.js
// Vehicles listed directly in code, merged into /api/vehicles and the
// detail page. Use this for cars that need to go live before they're entered
// in the admin panel. Once a car is added through /admin/vehicles, remove it
// here (the API also skips a local car whose stock_number already exists in
// the database, so a duplicate will never show twice).

const TACOMA_DIR = "/inventory/2022-toyota-tacoma-trd-off-road";

export const localVehicles = [
  {
    id: "2022-toyota-tacoma-trd-off-road",
    local: true,
    stock_number: "AP-TAC22",
    status: "available",
    featured: true,
    spotlight: true,
    year: 2022,
    make: "Toyota",
    model: "Tacoma",
    trim: "TRD Off-Road Double Cab",
    price: 27000,
    sale_price: null,
    mileage: 17000,
    body_type: "Truck",
    title_status: "Rebuilt", // Florida rebuilt title: shown on every listing view
    exterior_color: "Army Green",
    fuel_type: "Gasoline",
    engine: "3.5L V6",
    drivetrain: "4x4",
    financing_available: false,
    description:
      "This truck has a Florida rebuilt title. Low-mile 2022 Tacoma TRD Off-Road with only 17,000 miles. It's been lifted and set up on large black aftermarket wheels with aggressive all-terrain tires, and it keeps the TRD Off-Road's 3.5L V6 and 4x4. Come see it in person at our Hood Ave lot or call to set up a test drive, and ask us about its history.",
    key_features: [
      "Only 17,000 miles",
      "3.5L V6 with 4x4",
      "Lifted on aftermarket wheels",
    ],
    features: [
      "Lift with oversized all-terrain tires",
      "Black aftermarket wheels",
      "Tri-fold hard tonneau cover",
      "Drop-step running boards",
      "Roof rails with crossbars",
      "Tinted windows with rain visors",
      "LED headlights",
      "Hood scoop",
      "Double Cab seating for five",
    ],
    images: [
      { url: `${TACOMA_DIR}/driver-front.jpg`, alt: "2022 Toyota Tacoma TRD Off-Road, front driver side", isPrimary: true },
      { url: `${TACOMA_DIR}/passenger-rear.jpg`, alt: "2022 Toyota Tacoma TRD Off-Road, rear passenger side with TRD 4x4 decal", isPrimary: false },
      { url: `${TACOMA_DIR}/driver-rear.jpg`, alt: "2022 Toyota Tacoma TRD Off-Road, rear driver side", isPrimary: false },
      { url: `${TACOMA_DIR}/tailgate.jpg`, alt: "2022 Toyota Tacoma tailgate with tonneau cover and V6 badge", isPrimary: false },
    ],
    created_at: "2026-09-30T00:00:00.000Z",
  },
];

export const getLocalVehicle = (id) =>
  localVehicles.find((v) => v.id === id) || null;

// Mirrors the filters /api/vehicles supports so local cars behave like DB rows.
export const filterLocalVehicles = (searchParams) => {
  const get = (k) => searchParams.get(k);
  return localVehicles.filter((v) => {
    if (get("status") && v.status !== get("status")) return false;
    if (get("featured") && v.featured !== (get("featured") === "true")) return false;
    if (get("make") && get("make") !== "All Makes" && v.make !== get("make")) return false;
    if (get("model") && get("model") !== "All Models" && v.model !== get("model")) return false;
    if (get("year") && get("year") !== "All Years" && v.year !== parseInt(get("year"))) return false;
    if (get("minPrice") && v.price < parseInt(get("minPrice"))) return false;
    if (get("maxPrice") && v.price > parseInt(get("maxPrice"))) return false;
    if (get("bodyType") && v.body_type !== get("bodyType")) return false;
    return true;
  });
};
