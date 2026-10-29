// frontend/src/app/admin/customers/[id]/page.js
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone, Mail, MapPin, Pencil, Plus, Car, Wrench, Trash2, CalendarDays, MessageSquareText, Building2, FileText, Receipt, BadgePercent } from "lucide-react";
import { TERMS } from "@/lib/invoicing";
import { supabase } from "@/lib/supabase";
import { money, customerName, vehicleName, phone as fmtPhone, telHref, date, time12, num } from "@/lib/format";
import {
  Button, Card, CardHeader, StatusBadge, RO_STATUS, PAYMENT_STATUS, APPT_STATUS, Modal, TextField, Spinner, ErrorBanner, EmptyState,
  IconButton, Toggle, Stat, Badge, useUI,
} from "@/components/admin/ui";
import { CustomerForm, cleanCustomer, VehicleForm, cleanVehicle, NewRepairOrderModal, CustomerPicker } from "@/components/admin/pickers";
import { FL_COUNTIES } from "@/lib/books";
import { uploadDocument, signedUrl } from "@/components/admin/booksKit";
import { Upload, Merge } from "lucide-react";

export default function CustomerPage({ params }) {
  const router = useRouter();
  const { toast, confirm } = useUI();
  const [c, setC] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [ros, setRos] = useState([]);
  const [appts, setAppts] = useState([]);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState({});
  const [vehicleEdit, setVehicleEdit] = useState(null);
  const [roOpen, setRoOpen] = useState(null);
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState(null);
  const loadDocs = () => supabase.from("documents").select("*").eq("entity_type", "customer").eq("entity_id", params.id).order("created_at").then(({ data }) => setDocs(data || []));
  useEffect(() => {
    loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const load = useCallback(async () => {
    const [cust, veh, r] = await Promise.all([
      supabase.from("customers").select("*").eq("id", params.id).single(),
      supabase.from("customer_vehicles").select("*").eq("customer_id", params.id).order("created_at", { ascending: false }),
      supabase
        .from("repair_orders")
        .select("id, number, invoice_number, status, total, balance_due, payment_status, invoiced_at, voided_at, created_at, complaint, mileage_in, vehicle:customer_vehicles(year,make,model)")
        .eq("customer_id", params.id)
        .order("created_at", { ascending: false }),
    ]);
    if (cust.error) return setError(cust.error.code === "PGRST116" ? "Customer not found." : cust.error);
    setC(cust.data);
    setVehicles(veh.data || []);
    setRos(r.data || []);
    const ors = [`customer_id.eq.${params.id}`];
    if (cust.data.email) ors.push(`customer_email.ilike.${cust.data.email}`);
    const { data: ap } = await supabase.from("appointments").select("*").or(ors.join(",")).order("appointment_date", { ascending: false }).limit(20);
    setAppts(ap || []);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const saveCustomer = async () => {
    setSaving(true);
    const { error: err } = await supabase.from("customers").update(cleanCustomer(draft)).eq("id", c.id);
    setSaving(false);
    if (err) return toast(err.message, "bad");
    toast("Customer saved");
    setEditOpen(false);
    load();
  };

  const saveVehicle = async () => {
    setSaving(true);
    const payload = cleanVehicle(vehicleEdit);
    const { error: err } = vehicleEdit.id
      ? await supabase.from("customer_vehicles").update(payload).eq("id", vehicleEdit.id)
      : await supabase.from("customer_vehicles").insert({ ...payload, customer_id: c.id });
    setSaving(false);
    if (err) return toast(err.message, "bad");
    toast("Vehicle saved");
    setVehicleEdit(null);
    load();
  };

  const uploadCert = async (file, kind = "Exemption certificate") => {
    if (!file) return;
    try {
      const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
      const path = await uploadDocument(file, `customers/${c.id}`, ext, file.type || "application/pdf");
      await supabase.from("documents").insert({ entity_type: "customer", entity_id: c.id, kind, path, file_name: file.name, mime_type: file.type, size_bytes: file.size });
      toast("Uploaded");
      loadDocs();
    } catch (e) {
      toast(e.message, "bad");
    }
  };
  const doMerge = async () => {
    const { error: err } = await supabase.rpc("merge_customers", { p_keep: mergeTarget.id, p_drop: c.id });
    if (err) return toast(err.message, "bad");
    toast("Customers merged");
    router.push(`/admin/customers/${mergeTarget.id}`);
  };

  const deleteCustomer = async () => {
    const ok = await confirm({
      title: `Delete ${customerName(c)}?`,
      message: ros.length
        ? `Their ${vehicles.length} vehicle(s) will be deleted. Their ${ros.length} repair order(s) are kept but unlinked from the customer.`
        : "This also deletes their vehicles.",
      confirmLabel: "Delete customer",
      danger: true,
    });
    if (!ok) return;
    const { error: err } = await supabase.from("customers").delete().eq("id", c.id);
    if (err) return toast(err.message, "bad");
    toast("Customer deleted");
    router.push("/admin/customers");
  };

  if (error) return <ErrorBanner error={error} />;
  if (!c) return <div className="flex h-[60vh] items-center justify-center"><Spinner /></div>;

  const invoiced = ros.filter((r) => r.invoiced_at && r.status !== "cancelled" && !r.voided_at);
  const spend = invoiced.reduce((s, r) => s + Number(r.total), 0);
  const owed = invoiced.reduce((s, r) => s + Math.max(Number(r.balance_due), 0), 0);
  const address = [c.address_street, c.address_city, [c.address_state, c.address_zip].filter(Boolean).join(" "), c.address_country].filter(Boolean).join(", ");

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/admin/customers" className="mb-2 inline-flex text-[13px] text-a-muted hover:text-a-text">← Customers</Link>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-a-accent to-a-violet text-lg font-semibold uppercase text-white">
              {(c.first_name?.[0] || "") + (c.last_name?.[0] || "")}
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">{customerName(c)}</h1>
              <p className="text-sm text-a-muted">Customer since {date(c.created_at, { month: "long", year: "numeric" })}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.phone && <Button icon={Phone} href={telHref(c.phone)}>Call</Button>}
          {c.phone && <Button icon={MessageSquareText} href={`sms:${c.phone.replace(/[^\d+]/g, "")}`}>Text</Button>}
          <Button icon={CalendarDays} href="/admin/schedule?new=1">Book</Button>
          <Button icon={FileText} href={`/admin/customers/${c.id}/statement`} target="_blank">Statement</Button>
          <Button icon={Receipt} onClick={() => setRoOpen({ customer: c, asInvoice: true })}>New invoice</Button>
          <Button variant="primary" icon={Wrench} onClick={() => setRoOpen({ customer: c, vehicle: vehicles.length === 1 ? vehicles[0] : null })}>New repair order</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Lifetime spend" value={money(spend)} tone="good" />
        <Stat label="Visits" value={ros.filter((r) => r.status !== "cancelled").length} />
        <Stat label="Average ticket" value={money(invoiced.length ? spend / invoiced.length : 0)} tone="violet" />
        <Stat label="Balance owed" value={money(owed)} tone={owed > 0 ? "warn" : "good"} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Contact" actions={<IconButton icon={Pencil} label="Edit" onClick={() => { setDraft(c); setEditOpen(true); }} />} />
            <div className="space-y-2.5 px-5 pb-5 text-sm">
              {c.company && <div className="flex items-center gap-2.5"><Building2 className="h-4 w-4 text-a-faint" />{c.company}</div>}
              {c.phone ? <a href={telHref(c.phone)} className="flex items-center gap-2.5 hover:text-a-accent"><Phone className="h-4 w-4 text-a-faint" />{fmtPhone(c.phone)}</a> : <div className="text-a-faint">No phone</div>}
              {c.email ? <a href={`mailto:${c.email}`} className="flex items-center gap-2.5 break-all hover:text-a-accent"><Mail className="h-4 w-4 shrink-0 text-a-faint" />{c.email}</a> : <div className="text-a-faint">No email</div>}
              {address && <div className="flex items-start gap-2.5"><MapPin className="mt-0.5 h-4 w-4 text-a-faint" />{address}</div>}
              {(c.tax_exempt || c.default_terms) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {c.tax_exempt && <Badge tone="warn"><BadgePercent className="h-3 w-3" /> Tax-exempt{c.tax_exempt_reason ? ` · ${c.tax_exempt_reason}` : ""}</Badge>}
                  {c.default_terms && <Badge>Terms: {c.default_terms}</Badge>}
                </div>
              )}
              <div className="pt-1 text-xs text-a-faint">Prefers {c.preferred_contact_method || "phone"} · {c.marketing_opt_in ? "OK to send reminders" : "No marketing"}</div>
              {c.notes && <p className="whitespace-pre-wrap rounded-lg bg-a-raised p-3 text-a-muted">{c.notes}</p>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Vehicles" icon={Car} actions={<Button size="xs" variant="ghost" icon={Plus} onClick={() => setVehicleEdit({})}>Add</Button>} />
            <ul className="divide-y divide-a-line border-t border-a-line">
              {vehicles.map((v) => (
                <li key={v.id} className="group flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{vehicleName(v)}</div>
                    <div className="truncate text-xs text-a-faint">
                      {[v.license_plate, v.vin, v.mileage && `${num(v.mileage)} mi`].filter(Boolean).join(" · ") || "No details"}
                    </div>
                  </div>
                  <IconButton size="sm" icon={Wrench} label="New repair order for this vehicle" onClick={() => setRoOpen({ customer: c, vehicle: v, mileage: v.mileage || "" })} />
                  <IconButton size="sm" icon={Pencil} label="Edit vehicle" onClick={() => setVehicleEdit(v)} />
                </li>
              ))}
              {vehicles.length === 0 && <li className="px-5 py-6 text-center text-sm text-a-faint">No vehicles on file.</li>}
            </ul>
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-a-muted"><FileText className="h-4 w-4" /> Documents</h3>
            <ul className="space-y-1 text-sm">
              {docs.map((d) => <li key={d.id}><button className="text-a-accent" onClick={async () => window.open(await signedUrl(d.path), "_blank")}>{d.kind || "File"}: {d.file_name}</button></li>)}
              {!docs.length && <li className="text-a-faint">No certificates or files.</li>}
            </ul>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs text-a-accent">
              <Upload className="h-3.5 w-3.5" /> Upload
              <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => uploadCert(e.target.files?.[0], "Document")} />
            </label>
          </Card>
          <Button icon={Merge} className="w-full" onClick={() => setMergeOpen(true)}>Merge into another customer</Button>
          {ros.length === 0 && <Button variant="danger" icon={Trash2} className="w-full" onClick={deleteCustomer}>Delete customer</Button>}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Service history" icon={Wrench} />
            {ros.length === 0 ? (
              <EmptyState icon={Wrench} title="No repair orders yet" className="py-10" />
            ) : (
              <ul className="divide-y divide-a-line border-t border-a-line">
                {ros.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/repair-orders/${r.id}`} className="flex flex-col gap-2 px-5 py-3.5 hover:bg-a-hover/50 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-a-faint">{r.invoice_number ? `INV ${r.invoice_number}` : `RO ${r.number}`}</span>
                          <span className="font-medium">{vehicleName(r.vehicle)}</span>
                          <span className="text-a-faint">· {date(r.created_at)}</span>
                        </div>
                        {r.complaint && <div className="mt-0.5 truncate text-xs text-a-muted">{r.complaint}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge map={RO_STATUS} value={r.status} />
                        {r.invoiced_at && <StatusBadge map={PAYMENT_STATUS} value={r.payment_status} />}
                        <span className="w-24 text-right text-sm font-medium tnum">{money(r.total)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Appointments" icon={CalendarDays} />
            {appts.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-a-faint">No appointments.</p>
            ) : (
              <ul className="divide-y divide-a-line border-t border-a-line">
                {appts.map((a) => (
                  <li key={a.id}>
                    <Link href={`/admin/schedule?id=${a.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-a-hover/50">
                      <span>
                        {date(a.appointment_date || a.date)} <span className="text-a-faint">{time12(a.appointment_time || a.time)}</span> · {a.service}
                      </span>
                      <StatusBadge map={APPT_STATUS} value={a.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit customer"
        size="lg"
        footer={<><Button onClick={() => setEditOpen(false)}>Cancel</Button><Button variant="primary" loading={saving} onClick={saveCustomer}>Save</Button></>}
      >
        <div className="space-y-4">
          <CustomerForm value={draft} onChange={setDraft} />
          <div className="grid grid-cols-6 gap-3">
            <TextField className="col-span-6" label="Street" value={draft.address_street || ""} onChange={(e) => setDraft({ ...draft, address_street: e.target.value })} />
            <TextField className="col-span-3" label="City" value={draft.address_city || ""} onChange={(e) => setDraft({ ...draft, address_city: e.target.value })} />
            <TextField className="col-span-1" label="State" value={draft.address_state || ""} onChange={(e) => setDraft({ ...draft, address_state: e.target.value.toUpperCase().slice(0, 2) })} />
            <TextField className="col-span-2" label="ZIP / postal" value={draft.address_zip || ""} onChange={(e) => setDraft({ ...draft, address_zip: e.target.value })} />
            <TextField className="col-span-6" label="Country" placeholder="United States" value={draft.address_country || ""} onChange={(e) => setDraft({ ...draft, address_country: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-a-line p-3">
            <TextField as="select" label="Default invoice terms" value={draft.default_terms || ""} onChange={(e) => setDraft({ ...draft, default_terms: e.target.value })}>
              <option value="">Shop default</option>
              {TERMS.map((t) => <option key={t.value}>{t.value}</option>)}
            </TextField>
            <div className="flex items-end pb-2">
              <Toggle checked={Boolean(draft.tax_exempt)} onChange={(v) => setDraft({ ...draft, tax_exempt: v })} label="Tax-exempt" />
            </div>
            {draft.tax_exempt && (
              <TextField className="col-span-2" label="Exemption reason / certificate #" placeholder="e.g. Export sale, resale cert #12-3456" value={draft.tax_exempt_reason || ""} onChange={(e) => setDraft({ ...draft, tax_exempt_reason: e.target.value })} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField as="select" label="Customer type" value={draft.customer_type || "retail"} onChange={(e) => setDraft({ ...draft, customer_type: e.target.value })}>
              <option value="retail">Retail</option>
              <option value="fleet">Fleet / commercial</option>
              <option value="insurance">Insurance</option>
              <option value="dealer">Dealer / wholesale (resale certificate)</option>
            </TextField>
            <TextField as="select" label="Florida county (home)" value={draft.county || ""} onChange={(e) => setDraft({ ...draft, county: e.target.value })} hint="Used for surtax when they buy a car">
              <option value="">—</option>
              {FL_COUNTIES.map((x) => <option key={x}>{x}</option>)}
            </TextField>
          </div>
          {draft.tax_exempt && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-a-accent">
              <Upload className="h-4 w-4" /> Upload exemption / resale certificate
              <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => uploadCert(e.target.files?.[0])} />
            </label>
          )}
          <TextField as="select" label="Preferred contact" value={draft.preferred_contact_method || "phone"} onChange={(e) => setDraft({ ...draft, preferred_contact_method: e.target.value })}>
            <option value="phone">Phone call</option>
            <option value="text">Text message</option>
            <option value="email">Email</option>
          </TextField>
          <TextField as="textarea" rows={3} label="Notes" value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          <Toggle checked={draft.marketing_opt_in ?? true} onChange={(v) => setDraft({ ...draft, marketing_opt_in: v })} label="OK to send service reminders" />
        </div>
      </Modal>

      <Modal
        open={Boolean(vehicleEdit)}
        onClose={() => setVehicleEdit(null)}
        title={vehicleEdit?.id ? "Edit vehicle" : "Add vehicle"}
        size="lg"
        footer={
          <>
            {vehicleEdit?.id && (
              <Button
                variant="danger"
                icon={Trash2}
                className="mr-auto"
                onClick={async () => {
                  if (!(await confirm({ title: "Delete this vehicle?", message: "Past repair orders keep their totals but lose the vehicle link.", danger: true, confirmLabel: "Delete" }))) return;
                  const { error: err } = await supabase.from("customer_vehicles").delete().eq("id", vehicleEdit.id);
                  if (err) return toast(err.message, "bad");
                  setVehicleEdit(null);
                  load();
                }}
              >
                Delete
              </Button>
            )}
            <Button onClick={() => setVehicleEdit(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={saveVehicle}>Save vehicle</Button>
          </>
        }
      >
        {vehicleEdit && (
          <div className="space-y-4">
            <VehicleForm value={vehicleEdit} onChange={setVehicleEdit} />
            <TextField as="textarea" rows={2} label="Notes" value={vehicleEdit.notes || ""} onChange={(e) => setVehicleEdit({ ...vehicleEdit, notes: e.target.value })} />
          </div>
        )}
      </Modal>

      <Modal open={mergeOpen} onClose={() => setMergeOpen(false)} title={`Merge ${customerName(c)} into…`}
        description="Pick the record to keep. Repair orders, vehicles, sales and history move to it; this duplicate is archived."
        footer={<><Button onClick={() => setMergeOpen(false)}>Cancel</Button><Button variant="primary" disabled={!mergeTarget || mergeTarget.id === c.id} onClick={doMerge}>Merge</Button></>}>
        <CustomerPicker value={mergeTarget} onChange={setMergeTarget} />
      </Modal>

      <NewRepairOrderModal open={Boolean(roOpen)} onClose={() => setRoOpen(null)} initial={roOpen || {}} asInvoice={Boolean(roOpen?.asInvoice)} />
    </>
  );
}
