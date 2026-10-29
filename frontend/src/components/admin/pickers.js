// frontend/src/components/admin/pickers.js
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Car, Plus, ScanLine, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { customerName, vehicleName, phone as fmtPhone } from "@/lib/format";
import { decodeVin, isVin } from "@/lib/vin";
import { TERMS, dueDateFor } from "@/lib/invoicing";
import { Button, Input, TextField, Modal, Textarea, Field, cx, useDebounced, useUI } from "./ui";

// ------------------------------------------------------------ customers
export function CustomerForm({ value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid grid-cols-2 gap-3">
      <TextField label="First name" value={value.first_name || ""} onChange={set("first_name")} autoComplete="off" />
      <TextField label="Last name" value={value.last_name || ""} onChange={set("last_name")} autoComplete="off" />
      <TextField label="Phone" type="tel" value={value.phone || ""} onChange={set("phone")} autoComplete="off" />
      <TextField label="Email" type="email" value={value.email || ""} onChange={set("email")} autoComplete="off" />
      <TextField className="col-span-2" label="Company (optional)" value={value.company || ""} onChange={set("company")} />
    </div>
  );
}

export function cleanCustomer(c) {
  const t = (s) => (typeof s === "string" ? s.trim() || null : s ?? null);
  return {
    first_name: t(c.first_name) || (t(c.company) ? null : "Customer"),
    last_name: t(c.last_name),
    phone: t(c.phone),
    email: t(c.email)?.toLowerCase() || null,
    company: t(c.company),
    address_street: t(c.address_street),
    address_city: t(c.address_city),
    address_state: t(c.address_state),
    address_zip: t(c.address_zip),
    address_country: t(c.address_country),
    default_terms: t(c.default_terms),
    tax_exempt: Boolean(c.tax_exempt),
    tax_exempt_reason: t(c.tax_exempt_reason),
    notes: t(c.notes),
    preferred_contact_method: c.preferred_contact_method || "phone",
    marketing_opt_in: c.marketing_opt_in ?? true,
    customer_type: c.customer_type || "retail",
    county: t(c.county),
  };
}

export function CustomerPicker({ value, onChange, autoFocus }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const { toast } = useUI();
  const dq = useDebounced(q, 200);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const term = dq.trim().replace(/[%_,()]/g, " ");
      let query = supabase.from("customers").select("id, first_name, last_name, company, phone, email, tax_exempt, tax_exempt_reason, default_terms").order("updated_at", { ascending: false }).limit(8);
      if (term) {
        const digits = term.replace(/\D/g, "");
        query = query.or(
          [`first_name.ilike.%${term}%`, `last_name.ilike.%${term}%`, `email.ilike.%${term}%`, `company.ilike.%${term}%`,
            digits.length >= 3 ? `phone.ilike.%${digits.slice(-7)}%` : null].filter(Boolean).join(",")
        );
      }
      const { data } = await query;
      if (!cancelled) setResults(data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [dq]);

  const create = async () => {
    if (!draft.first_name?.trim() && !draft.company?.trim()) return toast("Enter a first name or a company.", "bad");
    setSaving(true);
    const { data, error } = await supabase.from("customers").insert(cleanCustomer(draft)).select().single();
    setSaving(false);
    if (error) return toast(error.message, "bad");
    onChange(data);
    setCreating(false);
    setDraft({});
  };

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-a-line bg-a-raised px-3 py-2.5">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-a-text">{customerName(value)}</div>
          <div className="truncate text-xs text-a-muted">{[fmtPhone(value.phone), value.email].filter(Boolean).join(" · ") || "No contact info"}</div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="space-y-3 rounded-lg border border-a-line bg-a-raised p-3">
        <CustomerForm value={draft} onChange={setDraft} />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
            Back to search
          </Button>
          <Button size="sm" variant="primary" icon={Check} loading={saving} onClick={create}>
            Save customer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-a-line">
      <div className="relative border-b border-a-line">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-a-faint" />
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, phone or email…"
          className="h-10 w-full rounded-t-lg bg-transparent pl-9 pr-3 text-sm text-a-text outline-none placeholder:text-a-faint"
        />
      </div>
      <ul className="max-h-56 overflow-y-auto p-1">
        {results.map((c) => (
          <li key={c.id}>
            <button onClick={() => onChange(c)} className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-a-hover">
              <span className="truncate text-sm text-a-text">{customerName(c)}</span>
              <span className="truncate text-xs text-a-faint">{fmtPhone(c.phone) || c.email}</span>
            </button>
          </li>
        ))}
        {results.length === 0 && <li className="px-3 py-3 text-sm text-a-muted">No customers found.</li>}
      </ul>
      <button
        onClick={() => {
          const parts = q.trim().split(/\s+/);
          const looksPhone = /\d{3}/.test(q);
          setDraft(looksPhone ? { phone: q.trim() } : { first_name: parts[0] || "", last_name: parts.slice(1).join(" ") });
          setCreating(true);
        }}
        className="flex w-full items-center gap-2 border-t border-a-line px-4 py-2.5 text-sm font-medium text-a-accent hover:bg-a-hover"
      >
        <UserPlus className="h-4 w-4" /> New customer{q.trim() ? ` “${q.trim()}”` : ""}
      </button>
    </div>
  );
}

// ------------------------------------------------------------ vehicles
export function VehicleForm({ value, onChange }) {
  const [decoding, setDecoding] = useState(false);
  const { toast } = useUI();
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });

  const decode = async () => {
    setDecoding(true);
    try {
      const d = await decodeVin(value.vin);
      onChange({ ...value, vin: d.vin, year: d.year || value.year, make: d.make || value.make, model: d.model || value.model, trim: d.trim || value.trim, engine: d.engine || value.engine });
      toast(`Decoded: ${[d.year, d.make, d.model].filter(Boolean).join(" ")}`);
    } catch (err) {
      toast(err.message, "bad");
    } finally {
      setDecoding(false);
    }
  };

  return (
    <div className="grid grid-cols-6 gap-3">
      <Field label="VIN" className="col-span-6" hint="Paste a VIN and decode to fill in the details.">
        {(id) => (
          <div className="flex gap-2">
            <Input id={id} value={value.vin || ""} onChange={(e) => onChange({ ...value, vin: e.target.value.toUpperCase() })} maxLength={17} className="font-mono tracking-wide" />
            <Button icon={ScanLine} onClick={decode} loading={decoding} disabled={!isVin(value.vin)}>
              Decode
            </Button>
          </div>
        )}
      </Field>
      <TextField className="col-span-2" label="Year" inputMode="numeric" value={value.year || ""} onChange={set("year")} />
      <TextField className="col-span-2" label="Make" value={value.make || ""} onChange={set("make")} />
      <TextField className="col-span-2" label="Model" value={value.model || ""} onChange={set("model")} />
      <TextField className="col-span-3" label="Trim" value={value.trim || ""} onChange={set("trim")} />
      <TextField className="col-span-3" label="Engine" value={value.engine || ""} onChange={set("engine")} />
      <TextField className="col-span-2" label="Plate" value={value.license_plate || ""} onChange={(e) => onChange({ ...value, license_plate: e.target.value.toUpperCase() })} />
      <TextField className="col-span-2" label="Color" value={value.color || ""} onChange={set("color")} />
      <TextField className="col-span-2" label="Mileage" inputMode="numeric" value={value.mileage || ""} onChange={set("mileage")} />
    </div>
  );
}

export function cleanVehicle(v) {
  const t = (s) => (typeof s === "string" ? s.trim() || null : s ?? null);
  const int = (s) => (String(s ?? "").replace(/\D/g, "") ? parseInt(String(s).replace(/\D/g, ""), 10) : null);
  return {
    year: int(v.year),
    make: t(v.make),
    model: t(v.model),
    trim: t(v.trim),
    engine: t(v.engine),
    vin: t(v.vin)?.toUpperCase() || null,
    license_plate: t(v.license_plate)?.toUpperCase() || null,
    color: t(v.color),
    mileage: int(v.mileage),
    notes: t(v.notes),
  };
}

export function VehiclePicker({ customerId, value, onChange, optional = false }) {
  const [vehicles, setVehicles] = useState([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const { toast } = useUI();

  useEffect(() => {
    if (!customerId) return setVehicles([]);
    supabase
      .from("customer_vehicles")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setVehicles(data || []);
        if (data?.length === 0 && !optional) setAdding(true);
      });
  }, [customerId]);

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from("customer_vehicles")
      .insert({ ...cleanVehicle(draft), customer_id: customerId })
      .select()
      .single();
    setSaving(false);
    if (error) return toast(error.message, "bad");
    setVehicles((v) => [data, ...v]);
    onChange(data);
    setAdding(false);
    setDraft({});
  };

  if (!customerId) return <p className="text-sm text-a-faint">Pick a customer first.</p>;

  return (
    <div className="space-y-2">
      {vehicles.map((v) => (
        <button
          key={v.id}
          onClick={() => onChange(value?.id === v.id ? null : v)}
          className={cx(
            "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
            value?.id === v.id ? "border-a-accent bg-a-accent/10" : "border-a-line hover:bg-a-hover"
          )}
        >
          <Car className="h-4 w-4 text-a-muted" />
          <span className="flex-1">
            <span className="block text-sm text-a-text">{vehicleName(v)}</span>
            <span className="block text-xs text-a-faint">{[v.license_plate, v.vin].filter(Boolean).join(" · ") || "No plate/VIN"}</span>
          </span>
          {value?.id === v.id && <Check className="h-4 w-4 text-a-accent" />}
        </button>
      ))}
      {adding ? (
        <div className="space-y-3 rounded-lg border border-a-line bg-a-raised p-3">
          <VehicleForm value={draft} onChange={setDraft} />
          <div className="flex justify-end gap-2">
            {vehicles.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            )}
            <Button size="sm" variant="primary" icon={Check} loading={saving} onClick={save}>
              Save vehicle
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="ghost" icon={Plus} onClick={() => setAdding(true)}>
          Add vehicle
        </Button>
      )}
    </div>
  );
}

// ------------------------------------------------------------ new repair order
// asInvoice: create a standalone invoice (parts sale, transport, etc.) instead
// of a repair estimate.
export function NewRepairOrderModal({ open, onClose, initial = {}, asInvoice = false }) {
  const router = useRouter();
  const { toast } = useUI();
  const [customer, setCustomer] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [complaint, setComplaint] = useState("");
  const [mileage, setMileage] = useState("");
  const [terms, setTerms] = useState("");
  const [saving, setSaving] = useState(false);
  const initialised = useRef(false);

  useEffect(() => {
    if (!open) {
      initialised.current = false;
      return;
    }
    if (initialised.current) return;
    initialised.current = true;
    setCustomer(initial.customer || null);
    setVehicle(initial.vehicle || null);
    setComplaint(initial.complaint || "");
    setMileage(initial.mileage || "");
    setTerms("");
  }, [open, initial]);

  const create = async () => {
    setSaving(true);
    const { data: settings } = await supabase.from("settings").select("value").eq("key", "shop").maybeSingle();
    const useTerms = terms || customer?.default_terms || settings?.value?.default_terms || "Due on receipt";
    const { data, error } = await supabase
      .from("repair_orders")
      .insert({
        customer_id: customer?.id || null,
        vehicle_id: vehicle?.id || null,
        appointment_id: initial.appointmentId || null,
        complaint: complaint.trim() || null,
        mileage_in: parseInt(String(mileage).replace(/\D/g, ""), 10) || vehicle?.mileage || null,
        tax_rate: customer?.tax_exempt ? 0 : Number(settings?.value?.tax_rate ?? 0.07),
        terms: useTerms,
        ...(asInvoice ? { status: "completed", invoiced_at: new Date().toISOString(), due_date: dueDateFor(useTerms) } : {}),
      })
      .select("id")
      .single();
    if (error) {
      setSaving(false);
      return toast(error.message, "bad");
    }
    if (initial.appointmentId) {
      await supabase.from("appointments").update({ status: "in-progress", customer_id: customer?.id || null }).eq("id", initial.appointmentId);
    }
    if (vehicle?.id && mileage) {
      await supabase.from("customer_vehicles").update({ mileage: parseInt(String(mileage).replace(/\D/g, ""), 10) }).eq("id", vehicle.id);
    }
    setSaving(false);
    onClose();
    router.push(`/admin/repair-orders/${data.id}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={asInvoice ? "New invoice" : "New repair order"}
      description={asInvoice ? "For parts sales, transportation and other billing without a repair job." : "Starts as an estimate. Add labor and parts on the next screen."}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={create} disabled={!customer}>
            {asInvoice ? "Create invoice" : "Create estimate"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Customer" required>
          <CustomerPicker value={customer} onChange={(c) => { setCustomer(c); setVehicle(null); }} autoFocus />
        </Field>
        {customer?.tax_exempt && (
          <p className="rounded-lg bg-a-warn/10 px-3 py-2 text-xs text-a-warn">
            Tax-exempt customer{customer.tax_exempt_reason ? ` (${customer.tax_exempt_reason})` : ""}: sales tax starts at 0%.
          </p>
        )}
        {asInvoice ? (
          <TextField as="select" label="Terms" value={terms || customer?.default_terms || ""} onChange={(e) => setTerms(e.target.value)} hint="Defaults to the customer's terms, then your shop default.">
            <option value="">Default</option>
            {TERMS.map((t) => <option key={t.value}>{t.value}</option>)}
          </TextField>
        ) : null}
        <Field label={asInvoice ? "Vehicle (optional)" : "Vehicle"}>
          <VehiclePicker customerId={customer?.id} value={vehicle} onChange={setVehicle} optional={asInvoice} />
        </Field>
        {!asInvoice && (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Customer concern" className="col-span-3 sm:col-span-2">
            {(id) => <Textarea id={id} rows={2} value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="e.g. Grinding noise when braking, check engine light on" />}
          </Field>
          <TextField className="col-span-3 sm:col-span-1" label="Mileage in" inputMode="numeric" value={mileage} onChange={(e) => setMileage(e.target.value)} />
        </div>
        )}
      </div>
    </Modal>
  );
}
