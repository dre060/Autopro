// frontend/src/app/admin/inventory/[id]/page.js — create / edit a car for sale
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScanLine, Upload, Trash2, Star, ChevronLeft, ChevronRight, Save, ExternalLink, ImagePlus, Loader2 } from "lucide-react";
import { supabase, VEHICLE_BUCKET } from "@/lib/supabase";
import { normalizeImages, serializeImages } from "@/lib/vehicleImages";
import { decodeVin, isVin } from "@/lib/vin";

import { Button, Card, CardHeader, TextField, Field, Input, Textarea, Toggle, Spinner, ErrorBanner, cx, useUI } from "@/components/admin/ui";
import VehicleCosts from "@/components/admin/VehicleCosts";

const BODY = ["Sedan", "SUV", "Truck", "Coupe", "Hatchback", "Van", "Minivan", "Wagon", "Convertible", "Commercial"];
const FUEL = ["Gasoline", "Diesel", "Hybrid", "Electric", "Flex fuel"];
const TRANS = ["Automatic", "Manual", "CVT"];
const DRIVE = ["FWD", "RWD", "AWD", "4x4"];
const TITLES = ["Clean", "Rebuilt", "Salvage", "Flood", "Lemon buyback", "Other"];

const EMPTY = {
  year: "", make: "", model: "", trim: "", vin: "", stock_number: "", body_type: "Sedan", exterior_color: "", interior_color: "",
  mileage: "", engine: "", transmission: "Automatic", drivetrain: "", fuel_type: "Gasoline", condition: "Good", price: "", sale_price: "",
  monthly_payment: "", financing_available: false, status: "available", featured: false, is_active: true,
  title_status: "Clean", accident_history: false, number_of_owners: 1, carfax_available: false, carfax_url: "", service_records: "",
  description: "", key_features: [], features: [],
};

// Downscale large phone photos before upload (keeps pages fast).
async function prepareImage(file) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export default function VehicleEditor({ params }) {
  const isNew = params.id === "new";
  const router = useRouter();
  const { toast, confirm } = useUI();
  const [v, setV] = useState(isNew ? EMPTY : null);
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [decoding, setDecoding] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (isNew) return;
    supabase
      .from("vehicles")
      .select("*")
      .eq("id", params.id)
      .single()
      .then(({ data, error: err }) => {
        if (err) return setError(err.code === "PGRST116" ? "Vehicle not found." : err);
        setV({ ...EMPTY, ...Object.fromEntries(Object.entries(data).map(([k, x]) => [k, x ?? EMPTY[k] ?? ""])) });
        setImages(normalizeImages(data));
      });
  }, [isNew, params.id]);

  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e }));

  const decode = async () => {
    setDecoding(true);
    try {
      const d = await decodeVin(v.vin);
      setV((x) => ({
        ...x,
        vin: d.vin,
        year: d.year || x.year,
        make: d.make || x.make,
        model: d.model || x.model,
        trim: d.trim || x.trim,
        engine: d.engine || x.engine,
        drivetrain: /4x4|4wd/i.test(d.drivetrain) ? "4x4" : /awd|all/i.test(d.drivetrain) ? "AWD" : /rwd|rear/i.test(d.drivetrain) ? "RWD" : /fwd|front/i.test(d.drivetrain) ? "FWD" : x.drivetrain,
        body_type: /pickup/i.test(d.body_type) ? "Truck" : /sport utility|suv/i.test(d.body_type) ? "SUV" : /sedan/i.test(d.body_type) ? "Sedan" : /coupe/i.test(d.body_type) ? "Coupe" : /hatch/i.test(d.body_type) ? "Hatchback" : /van/i.test(d.body_type) ? "Van" : x.body_type,
        fuel_type: /diesel/i.test(d.fuel_type) ? "Diesel" : /electric/i.test(d.fuel_type) ? "Electric" : x.fuel_type,
        transmission: /manual/i.test(d.transmission) ? "Manual" : /cvt|continuously/i.test(d.transmission) ? "CVT" : x.transmission,
      }));
      toast(`Decoded ${[d.year, d.make, d.model].filter(Boolean).join(" ")}`);
    } catch (err) {
      toast(err.message, "bad");
    } finally {
      setDecoding(false);
    }
  };

  const upload = async (files) => {
    const list = Array.from(files || []).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setUploading(list.length);
    const added = [];
    for (const original of list) {
      const file = await prepareImage(original);
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : "jpg";
      const path = `${(v.stock_number || "vehicle").replace(/[^\w-]/g, "")}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: err } = await supabase.storage.from(VEHICLE_BUCKET).upload(path, file, { cacheControl: "31536000", contentType: file.type, upsert: false });
      if (err) {
        toast(`${original.name}: ${err.message}`, "bad");
      } else {
        const { data } = supabase.storage.from(VEHICLE_BUCKET).getPublicUrl(path);
        added.push({ url: data.publicUrl, alt: `${v.year} ${v.make} ${v.model}`.trim(), path });
      }
      setUploading((n) => n - 1);
    }
    if (added.length) {
      setImages((imgs) => [...imgs, ...added]);
      toast(`${added.length} photo${added.length > 1 ? "s" : ""} uploaded — save to publish`);
    }
  };

  const removeImage = async (i) => {
    const img = images[i];
    setImages((imgs) => imgs.filter((_, j) => j !== i));
    if (img.path) await supabase.storage.from(VEHICLE_BUCKET).remove([img.path]);
  };

  const move = (from, to) => {
    if (to < 0 || to >= images.length || from === to) return;
    setImages((imgs) => {
      const next = [...imgs];
      const [x] = next.splice(from, 1);
      next.splice(to, 0, x);
      return next;
    });
  };

  const save = async () => {
    const required = [["year", "Year"], ["make", "Make"], ["model", "Model"], ["mileage", "Mileage"], ["exterior_color", "Exterior color"], ["interior_color", "Interior color"], ["price", "Price"]];
    const missing = required.filter(([k]) => !String(v[k] ?? "").trim()).map(([, l]) => l);
    if (missing.length) return toast(`Missing: ${missing.join(", ")}`, "bad");

    const int = (x) => (String(x ?? "").replace(/\D/g, "") ? parseInt(String(x).replace(/\D/g, ""), 10) : null);
    const dec = (x) => (String(x ?? "").trim() === "" ? null : Math.round(parseFloat(String(x).replace(/[^\d.]/g, "")) * 100) / 100);
    const t = (x) => (String(x ?? "").trim() || null);
    const lines = (x) => (Array.isArray(x) ? x : String(x || "").split("\n")).map((s) => s.trim()).filter(Boolean);

    const payload = {
      year: int(v.year), make: t(v.make), model: t(v.model), trim: t(v.trim), vin: t(v.vin)?.toUpperCase() || null,
      stock_number: t(v.stock_number) || `AP${Date.now().toString().slice(-6)}`,
      body_type: v.body_type, exterior_color: t(v.exterior_color), interior_color: t(v.interior_color), mileage: int(v.mileage),
      engine: t(v.engine), transmission: v.transmission, drivetrain: t(v.drivetrain), fuel_type: v.fuel_type, condition: v.condition,
      price: dec(v.price), list_price: dec(v.price), sale_price: dec(v.sale_price), monthly_payment: dec(v.monthly_payment),
      financing_available: Boolean(v.financing_available), status: v.status, featured: Boolean(v.featured), is_active: Boolean(v.is_active),
      title_status: v.title_status || null, accident_history: Boolean(v.accident_history), number_of_owners: int(v.number_of_owners) || 1,
      carfax_available: Boolean(v.carfax_available), carfax_url: t(v.carfax_url), service_records: t(v.service_records),
      description: t(v.description), key_features: lines(v.key_features), features: lines(v.features),
      images: serializeImages(images),
      sold_date: v.status === "sold" ? v.sold_date || new Date().toISOString().slice(0, 10) : null,
    };

    setSaving(true);
    const res = isNew
      ? await supabase.from("vehicles").insert(payload).select("id").single()
      : await supabase.from("vehicles").update(payload).eq("id", params.id).select("id").single();
    setSaving(false);
    if (res.error) return toast(res.error.message, "bad");
    toast(isNew ? "Vehicle listed" : "Saved");
    if (isNew) router.replace(`/admin/inventory/${res.data.id}`);
  };

  const del = async () => {
    if (!(await confirm({ title: "Delete this listing?", message: "The listing and its photos are removed permanently. To keep a record, mark it sold instead.", danger: true, confirmLabel: "Delete" }))) return;
    const paths = images.map((i) => i.path).filter(Boolean);
    const { error: err } = await supabase.from("vehicles").delete().eq("id", params.id);
    if (err) return toast(err.message, "bad");
    if (paths.length) await supabase.storage.from(VEHICLE_BUCKET).remove(paths);
    toast("Listing deleted");
    router.push("/admin/inventory");
  };

  if (error) return <ErrorBanner error={error} />;
  if (!v) return <div className="flex h-[60vh] items-center justify-center"><Spinner /></div>;

  const title = [v.year, v.make, v.model].filter(Boolean).join(" ") || "New vehicle";

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/inventory" className="mb-2 inline-flex text-[13px] text-a-muted hover:text-a-text">← Cars for sale</Link>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{isNew ? "List a vehicle" : title}</h1>
        </div>
        <div className="flex gap-2">
          {!isNew && <Button icon={ExternalLink} href={`/inventory/${params.id}`} target="_blank">View listing</Button>}
          <Button variant="primary" icon={Save} loading={saving} onClick={save}>{isNew ? "Publish listing" : "Save changes"}</Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* photos */}
          <Card>
            <CardHeader title="Photos" description="First photo is the cover. Drag to reorder." actions={
              <Button size="sm" icon={uploading ? Loader2 : Upload} onClick={() => fileRef.current?.click()} disabled={uploading > 0}>
                {uploading ? `Uploading ${uploading}…` : "Upload"}
              </Button>
            } />
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
            <div
              className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-3 lg:grid-cols-4"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.length) upload(e.dataTransfer.files);
              }}
            >
              {images.map((img, i) => (
                <div
                  key={img.url}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    if (dragIdx !== null) {
                      e.stopPropagation();
                      move(dragIdx, i);
                      setDragIdx(null);
                    }
                  }}
                  className={cx("group relative aspect-[4/3] overflow-hidden rounded-lg border bg-a-raised", i === 0 ? "border-a-accent" : "border-a-line", dragIdx === i && "opacity-40")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute left-2 top-2 rounded bg-a-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">COVER</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex">
                      <button className="rounded p-1 text-white hover:bg-white/20" aria-label="Move left" onClick={() => move(i, i - 1)}><ChevronLeft className="h-4 w-4" /></button>
                      <button className="rounded p-1 text-white hover:bg-white/20" aria-label="Make cover" onClick={() => move(i, 0)}><Star className="h-4 w-4" /></button>
                      <button className="rounded p-1 text-white hover:bg-white/20" aria-label="Move right" onClick={() => move(i, i + 1)}><ChevronRight className="h-4 w-4" /></button>
                    </div>
                    <button className="rounded p-1 text-white hover:bg-red-500/70" aria-label="Delete photo" onClick={() => removeImage(i)}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-a-line text-a-faint transition-colors hover:border-a-accent hover:text-a-accent"
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs">Add or drop photos</span>
              </button>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-[15px] font-semibold">Vehicle</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="VIN" className="col-span-2 md:col-span-4">
                {(id) => (
                  <div className="flex gap-2">
                    <Input id={id} value={v.vin} onChange={(e) => setV({ ...v, vin: e.target.value.toUpperCase() })} maxLength={17} className="font-mono tracking-wide" />
                    <Button icon={ScanLine} loading={decoding} disabled={!isVin(v.vin)} onClick={decode}>Decode VIN</Button>
                  </div>
                )}
              </Field>
              <TextField label="Year" required inputMode="numeric" value={v.year} onChange={set("year")} />
              <TextField label="Make" required value={v.make} onChange={set("make")} />
              <TextField label="Model" required value={v.model} onChange={set("model")} />
              <TextField label="Trim" value={v.trim} onChange={set("trim")} />
              <TextField label="Mileage" required inputMode="numeric" value={v.mileage} onChange={set("mileage")} />
              <TextField label="Exterior color" required value={v.exterior_color} onChange={set("exterior_color")} />
              <TextField label="Interior color" required value={v.interior_color} onChange={set("interior_color")} />
              <TextField label="Engine" value={v.engine} onChange={set("engine")} />
              <TextField as="select" label="Body" value={v.body_type} onChange={set("body_type")}>{BODY.map((x) => <option key={x}>{x}</option>)}</TextField>
              <TextField as="select" label="Transmission" value={v.transmission} onChange={set("transmission")}>{TRANS.map((x) => <option key={x}>{x}</option>)}</TextField>
              <TextField as="select" label="Drivetrain" value={v.drivetrain} onChange={set("drivetrain")}><option value="">—</option>{DRIVE.map((x) => <option key={x}>{x}</option>)}</TextField>
              <TextField as="select" label="Fuel" value={v.fuel_type} onChange={set("fuel_type")}>{FUEL.map((x) => <option key={x}>{x}</option>)}</TextField>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h3 className="text-[15px] font-semibold">Listing</h3>
            <Field label="Description">{(id) => <Textarea id={id} rows={5} value={v.description} onChange={set("description")} placeholder="What makes this one a good buy?" />}</Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Highlights (one per line)" hint="Shown as bullet points at the top of the listing.">
                {(id) => <Textarea id={id} rows={5} value={Array.isArray(v.key_features) ? v.key_features.join("\n") : v.key_features} onChange={(e) => setV({ ...v, key_features: e.target.value.split("\n") })} />}
              </Field>
              <Field label="Features & options (one per line)">
                {(id) => <Textarea id={id} rows={5} value={Array.isArray(v.features) ? v.features.join("\n") : v.features} onChange={(e) => setV({ ...v, features: e.target.value.split("\n") })} />}
              </Field>
            </div>
            <TextField label="Service records" value={v.service_records} onChange={set("service_records")} placeholder="e.g. Full dealer records, recent brakes & tires" />
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="space-y-3 p-5">
            <h3 className="text-[15px] font-semibold">Price</h3>
            <TextField label="Price" required inputMode="decimal" value={v.price} onChange={set("price")} />
            <TextField label="Sale price" hint="Shown with the regular price crossed out." inputMode="decimal" value={v.sale_price} onChange={set("sale_price")} />
            <Toggle checked={v.financing_available} onChange={set("financing_available")} label="Financing available" />
            {v.financing_available && <TextField label="Est. monthly payment" inputMode="decimal" value={v.monthly_payment} onChange={set("monthly_payment")} />}
          </Card>

          {!isNew && <VehicleCosts vehicle={{ ...v, id: params.id }} />}

          <Card className="space-y-3 p-5">
            <h3 className="text-[15px] font-semibold">Status</h3>
            <TextField as="select" label="Sale status" value={v.status} onChange={set("status")}>
              <option value="available">Available</option>
              <option value="pending">Sale pending</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
            </TextField>
            <TextField label="Stock #" value={v.stock_number} onChange={set("stock_number")} placeholder="Auto-generated if blank" />
            <Toggle checked={v.is_active} onChange={set("is_active")} label="Show on website" />
            <Toggle checked={v.featured} onChange={set("featured")} label="Feature on homepage" />
          </Card>

          <Card className="space-y-3 p-5">
            <h3 className="text-[15px] font-semibold">History & disclosures</h3>
            <TextField as="select" label="Title" value={v.title_status || "Clean"} onChange={set("title_status")} hint={v.title_status && v.title_status !== "Clean" ? "A title disclosure is shown on every view of this listing." : undefined}>
              {TITLES.map((x) => <option key={x}>{x}</option>)}
            </TextField>
            <TextField as="select" label="Condition" value={v.condition} onChange={set("condition")}>
              {["Excellent", "Good", "Fair", "Poor"].map((x) => <option key={x}>{x}</option>)}
            </TextField>
            <TextField label="Previous owners" inputMode="numeric" value={v.number_of_owners} onChange={set("number_of_owners")} />
            <Toggle checked={v.accident_history} onChange={set("accident_history")} label="Accident reported" />
            <Toggle checked={v.carfax_available} onChange={set("carfax_available")} label="Carfax report available" />
            {v.carfax_available && <TextField label="Carfax link" value={v.carfax_url} onChange={set("carfax_url")} />}
          </Card>

          {!isNew && <Button variant="danger" icon={Trash2} className="w-full" onClick={del}>Delete listing</Button>}
        </div>
      </div>
    </>
  );
}
