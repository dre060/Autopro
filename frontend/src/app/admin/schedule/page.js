// frontend/src/app/admin/schedule/page.js
"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays, List, Phone, Mail, Car, CheckCircle2, XCircle, Wrench, Trash2, UserX, Inbox,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { time12, isoDay, date, phone as fmtPhone, telHref, relative } from "@/lib/format";
import {
  Button, Card, CardHeader, PageHeader, Segmented, StatusBadge, APPT_STATUS, Drawer, Modal, TextField, Select, Field,
  EmptyState, ErrorBanner, SkeletonRows, Table, Th, Td, Toggle, cx, useUI,
} from "@/components/admin/ui";
import { CustomerPicker, NewRepairOrderModal, cleanCustomer, cleanVehicle } from "@/components/admin/pickers";
import { useAdmin, adminFetch } from "@/components/admin/AdminContext";

const SERVICES = ["Oil change", "Brake service", "Engine diagnostics", "AC service", "Tire service", "Transmission service", "Battery & electrical", "Alignment", "State inspection", "General repair", "Other"];
const TIMES = Array.from({ length: 21 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 ? "30" : "00";
  return `${String(h).padStart(2, "0")}:${m}`;
});

const apptName = (a) => a.customer_name || a.name || "Customer";
const apptDate = (a) => a.appointment_date || a.date;
const apptTime = (a) => (a.appointment_time ? a.appointment_time.slice(0, 5) : a.time);
const apptVehicle = (a) =>
  [a.vehicle_year, a.vehicle_make, a.vehicle_model].filter(Boolean).join(" ") ||
  [a.vehicle_info?.year, a.vehicle_info?.make, a.vehicle_info?.model].filter(Boolean).join(" ");

function startOfWeek(d) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  x.setHours(12, 0, 0, 0);
  return x;
}

function ScheduleInner() {
  const params = useSearchParams();
  const { toast, confirm } = useUI();
  const { refreshCounts } = useAdmin();
  const [view, setView] = useState("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [rows, setRows] = useState(null);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState(null);
  const [listFilter, setListFilter] = useState("upcoming");
  const [selected, setSelected] = useState(null);
  const [newOpen, setNewOpen] = useState(params.get("new") === "1");
  const [roFrom, setRoFrom] = useState(null);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart]
  );

  const load = useCallback(async () => {
    setError(null);
    let q = supabase.from("appointments").select("*");
    if (view === "week") {
      q = q.gte("appointment_date", isoDay(days[0])).lte("appointment_date", isoDay(days[6])).order("appointment_date").order("appointment_time");
    } else if (listFilter === "upcoming") {
      q = q.gte("appointment_date", isoDay()).order("appointment_date").order("appointment_time").limit(300);
    } else if (listFilter === "past") {
      q = q.lt("appointment_date", isoDay()).order("appointment_date", { ascending: false }).limit(300);
    } else {
      q = q.eq("status", listFilter).order("appointment_date", { ascending: false }).limit(300);
    }
    const [{ data, error: err }, pend] = await Promise.all([
      q,
      supabase.from("appointments").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(20),
    ]);
    if (err) setError(err);
    setRows(data || []);
    setPending(pend.data || []);
  }, [view, days, listFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Deep link: /admin/schedule?id=<appointment>
  useEffect(() => {
    const id = params.get("id");
    if (!id) return;
    supabase.from("appointments").select("*").eq("id", id).single().then(({ data }) => data && setSelected(data));
  }, [params]);

  const update = async (a, patch, msg) => {
    const { data, error: err } = await supabase.from("appointments").update(patch).eq("id", a.id).select().single();
    if (err) return toast(err.message, "bad");
    setSelected((s) => (s?.id === a.id ? data : s));
    if (msg) toast(msg);
    refreshCounts();
    load();
    return data;
  };

  const confirmAppt = async (a, sendEmail) => {
    const updated = await update(a, { status: "confirmed" }, "Appointment confirmed");
    if (updated && sendEmail && (a.customer_email || a.email)) {
      try {
        await adminFetch("/api/admin/email", { type: "appointment", id: a.id, kind: "confirmed" });
        toast("Confirmation emailed to customer");
      } catch (e) {
        toast(e.message, "bad");
      }
    }
  };

  const cancelAppt = async (a) => {
    const ok = await confirm({ title: "Cancel this appointment?", message: `${apptName(a)} – ${date(apptDate(a))} ${time12(apptTime(a))}. The customer will be emailed.`, confirmLabel: "Cancel appointment", danger: true });
    if (!ok) return;
    const updated = await update(a, { status: "cancelled" }, "Appointment cancelled");
    if (updated && (a.customer_email || a.email)) {
      adminFetch("/api/admin/email", { type: "appointment", id: a.id, kind: "cancelled" }).catch((e) => toast(e.message, "bad"));
    }
  };

  // Find (or create) the customer + vehicle for an appointment, then open a new RO.
  const startRepairOrder = async (a) => {
    let customer = null;
    if (a.customer_id) {
      customer = (await supabase.from("customers").select("*").eq("id", a.customer_id).maybeSingle()).data;
    }
    const email = (a.customer_email || a.email || "").toLowerCase();
    const digits = (a.customer_phone || a.phone || "").replace(/\D/g, "").slice(-10);
    if (!customer && email) customer = (await supabase.from("customers").select("*").ilike("email", email).limit(1)).data?.[0];
    if (!customer && digits.length === 10) customer = (await supabase.from("customers").select("*").ilike("phone", `%${digits.slice(-4)}%`).limit(20)).data?.find((c) => (c.phone || "").replace(/\D/g, "").endsWith(digits));
    if (!customer) {
      const [first, ...rest] = apptName(a).split(" ");
      const { data, error: err } = await supabase
        .from("customers")
        .insert(cleanCustomer({ first_name: first, last_name: rest.join(" "), email, phone: a.customer_phone || a.phone }))
        .select()
        .single();
      if (err) return toast(err.message, "bad");
      customer = data;
    }
    let vehicle = null;
    const make = a.vehicle_make || a.vehicle_info?.make;
    if (make) {
      const { data: existing } = await supabase.from("customer_vehicles").select("*").eq("customer_id", customer.id).ilike("make", make);
      vehicle = existing?.find((v) => !a.vehicle_model || (v.model || "").toLowerCase() === String(a.vehicle_model || a.vehicle_info?.model).toLowerCase());
      if (!vehicle) {
        const { data } = await supabase
          .from("customer_vehicles")
          .insert({ ...cleanVehicle({ year: a.vehicle_year || a.vehicle_info?.year, make, model: a.vehicle_model || a.vehicle_info?.model }), customer_id: customer.id })
          .select()
          .single();
        vehicle = data;
      }
    }
    await supabase.from("appointments").update({ customer_id: customer.id }).eq("id", a.id);
    setRoFrom({ customer, vehicle, complaint: [a.service, a.notes || a.message].filter(Boolean).join(" — "), appointmentId: a.id });
    setSelected(null);
  };

  const today = isoDay();

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Appointments booked online or by phone."
        actions={
          <>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "week", label: <><CalendarDays className="h-3.5 w-3.5" /> Week</> },
                { value: "list", label: <><List className="h-3.5 w-3.5" /> List</> },
              ]}
            />
            <Button variant="primary" icon={Plus} onClick={() => setNewOpen(true)}>
              New appointment
            </Button>
          </>
        }
      />

      {pending.length > 0 && (
        <Card className="mb-5 border-a-warn/40">
          <CardHeader icon={Inbox} title={`${pending.length} request${pending.length > 1 ? "s" : ""} waiting for confirmation`} description="Booked on the website. Confirm to email the customer." />
          <ul className="divide-y divide-a-line border-t border-a-line">
            {pending.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center">
                <button className="min-w-0 flex-1 text-left" onClick={() => setSelected(a)}>
                  <div className="text-sm font-medium">
                    {apptName(a)} <span className="font-normal text-a-muted">· {a.service}</span>
                  </div>
                  <div className="text-xs text-a-faint">
                    {date(apptDate(a), { weekday: "short", month: "short", day: "numeric" })} at {time12(apptTime(a))}
                    {apptVehicle(a) && ` · ${apptVehicle(a)}`} · requested {relative(a.created_at)}
                  </div>
                </button>
                <div className="flex gap-2">
                  <Button size="sm" icon={Phone} href={telHref(a.customer_phone || a.phone)}>Call</Button>
                  <Button size="sm" variant="primary" icon={CheckCircle2} onClick={() => confirmAppt(a, true)}>Confirm</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ErrorBanner error={error} onRetry={load} />

      {view === "week" ? (
        <Card>
          <div className="flex items-center justify-between gap-2 border-b border-a-line px-4 py-3">
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" icon={ChevronLeft} aria-label="Previous week" onClick={() => setWeekStart((w) => new Date(w.getTime() - 7 * 864e5))} />
              <Button size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</Button>
              <Button size="sm" variant="ghost" icon={ChevronRight} aria-label="Next week" onClick={() => setWeekStart((w) => new Date(w.getTime() + 7 * 864e5))} />
            </div>
            <div className="text-sm font-medium">
              {days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
          {rows === null ? (
            <SkeletonRows />
          ) : (
            <div className="overflow-x-auto">
              <div className="grid min-w-[980px] grid-cols-7 divide-x divide-a-line">
                {days.map((d) => {
                  const key = isoDay(d);
                  const list = rows.filter((a) => apptDate(a) === key && a.status !== "cancelled");
                  const isToday = key === today;
                  return (
                    <div key={key} className={cx("min-h-[420px]", d.getDay() === 0 && "bg-a-bg/40")}>
                      <div className={cx("sticky top-0 border-b border-a-line px-3 py-2.5", isToday && "bg-a-accent/10")}>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-a-faint">{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                        <div className={cx("font-display text-xl font-semibold", isToday && "text-a-accent")}>{d.getDate()}</div>
                      </div>
                      <div className="space-y-2 p-2">
                        {list.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => setSelected(a)}
                            className={cx(
                              "block w-full rounded-lg border-l-[3px] bg-a-raised px-2.5 py-2 text-left transition-colors hover:bg-a-hover",
                              {
                                pending: "border-a-warn",
                                confirmed: "border-a-info",
                                "in-progress": "border-a-accent",
                                completed: "border-a-good",
                                "no-show": "border-a-bad",
                              }[a.status] || "border-a-line"
                            )}
                          >
                            <div className="text-[11px] font-semibold text-a-muted tnum">{time12(apptTime(a))}</div>
                            <div className="truncate text-[13px] font-medium">{apptName(a)}</div>
                            <div className="truncate text-[11.5px] text-a-faint">{a.service}</div>
                          </button>
                        ))}
                        {list.length === 0 && d.getDay() !== 0 && (
                          <button
                            onClick={() => setNewOpen({ date: key })}
                            className="block w-full rounded-lg border border-dashed border-transparent py-6 text-center text-xs text-a-faint opacity-0 transition hover:border-a-line hover:opacity-100"
                          >
                            + Book
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <div className="border-b border-a-line px-4 py-3">
            <Segmented
              value={listFilter}
              onChange={setListFilter}
              options={[
                { value: "upcoming", label: "Upcoming" },
                { value: "past", label: "Past" },
                { value: "pending", label: "Pending" },
                { value: "no-show", label: "No-shows" },
                { value: "cancelled", label: "Cancelled" },
              ]}
            />
          </div>
          {rows === null ? (
            <SkeletonRows />
          ) : rows.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No appointments" />
          ) : (
            <Table>
              <thead>
                <tr><Th>When</Th><Th>Customer</Th><Th>Service</Th><Th>Vehicle</Th><Th>Status</Th></tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="cursor-pointer hover:bg-a-hover/50" onClick={() => setSelected(a)}>
                    <Td className="whitespace-nowrap">
                      {date(apptDate(a), { weekday: "short", month: "short", day: "numeric" })} <span className="text-a-faint">{time12(apptTime(a))}</span>
                    </Td>
                    <Td className="font-medium">{apptName(a)}</Td>
                    <Td className="text-a-muted">{a.service}</Td>
                    <Td className="text-a-muted">{apptVehicle(a) || "—"}</Td>
                    <Td><StatusBadge map={APPT_STATUS} value={a.status} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {/* detail drawer */}
      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? apptName(selected) : ""}
        subtitle={selected && <StatusBadge map={APPT_STATUS} value={selected.status} />}
        footer={
          selected && (
            <>
              <Button variant="danger" icon={Trash2} onClick={async () => {
                if (!(await confirm({ title: "Delete appointment?", message: "This can't be undone.", danger: true, confirmLabel: "Delete" }))) return;
                const { error: err } = await supabase.from("appointments").delete().eq("id", selected.id);
                if (err) return toast(err.message, "bad");
                toast("Appointment deleted");
                setSelected(null);
                refreshCounts();
                load();
              }}>Delete</Button>
              <div className="flex-1" />
              {selected.status !== "cancelled" && <Button icon={XCircle} onClick={() => cancelAppt(selected)}>Cancel</Button>}
              {selected.status === "pending" && <Button variant="primary" icon={CheckCircle2} onClick={() => confirmAppt(selected, true)}>Confirm & email</Button>}
              {["confirmed", "in-progress"].includes(selected.status) && <Button variant="primary" icon={Wrench} onClick={() => startRepairOrder(selected)}>Start repair order</Button>}
            </>
          )
        }
      >
        {selected && <AppointmentDetail a={selected} onUpdate={(patch, msg) => update(selected, patch, msg)} onStartRo={() => startRepairOrder(selected)} />}
      </Drawer>

      <NewAppointmentModal
        open={Boolean(newOpen)}
        defaults={typeof newOpen === "object" ? newOpen : {}}
        onClose={() => setNewOpen(false)}
        onSaved={() => {
          load();
          refreshCounts();
        }}
      />
      <NewRepairOrderModal open={Boolean(roFrom)} onClose={() => setRoFrom(null)} initial={roFrom || {}} />
    </>
  );
}

function AppointmentDetail({ a, onUpdate, onStartRo }) {
  const [d, setD] = useState(apptDate(a));
  const [t, setT] = useState(apptTime(a) || "09:00");
  const [notes, setNotes] = useState(a.internal_notes || "");
  useEffect(() => {
    setD(apptDate(a));
    setT(apptTime(a) || "09:00");
    setNotes(a.internal_notes || "");
  }, [a]);
  const phoneNum = a.customer_phone || a.phone;
  const email = a.customer_email || a.email;
  const vehicle = apptVehicle(a);
  const changed = d !== apptDate(a) || t !== apptTime(a);

  return (
    <div className="space-y-6">
      <div className="grid gap-2 text-sm">
        {phoneNum && <a className="flex items-center gap-2 text-a-text hover:text-a-accent" href={telHref(phoneNum)}><Phone className="h-4 w-4 text-a-faint" />{fmtPhone(phoneNum)}</a>}
        {email && <a className="flex items-center gap-2 text-a-text hover:text-a-accent" href={`mailto:${email}`}><Mail className="h-4 w-4 text-a-faint" />{email}</a>}
        {vehicle && <div className="flex items-center gap-2"><Car className="h-4 w-4 text-a-faint" />{vehicle}</div>}
      </div>

      <div className="rounded-xl border border-a-line bg-a-raised p-4">
        <div className="text-xs font-medium text-a-faint">Service requested</div>
        <div className="mt-0.5 font-medium">{a.service}</div>
        {(a.notes || a.message) && <p className="mt-3 whitespace-pre-wrap text-sm text-a-muted">{a.notes || a.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField label="Date" type="date" value={d || ""} onChange={(e) => setD(e.target.value)} />
        <TextField as="select" label="Time" value={t} onChange={(e) => setT(e.target.value)}>
          {[...new Set([t, ...TIMES])].filter(Boolean).sort().map((x) => <option key={x} value={x}>{time12(x)}</option>)}
        </TextField>
        {changed && (
          <Button className="col-span-2" onClick={() => onUpdate({ appointment_date: d, appointment_time: t, date: d, time: time12(t) }, "Rescheduled")}>
            Save new time
          </Button>
        )}
      </div>

      <TextField
        as="textarea"
        label="Internal notes"
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => notes !== (a.internal_notes || "") && onUpdate({ internal_notes: notes || null }, "Notes saved")}
      />

      <div className="flex flex-wrap gap-2">
        {a.status !== "completed" && <Button size="sm" icon={CheckCircle2} onClick={() => onUpdate({ status: "completed" }, "Marked completed")}>Mark completed</Button>}
        {a.status !== "no-show" && <Button size="sm" icon={UserX} onClick={() => onUpdate({ status: "no-show" }, "Marked no-show")}>No-show</Button>}
        {a.status === "pending" && <Button size="sm" icon={Wrench} onClick={onStartRo}>Start repair order</Button>}
      </div>

      <p className="text-xs text-a-faint">
        Requested {relative(a.created_at)}
        {a.confirmation_sent && " · confirmation email sent"}
      </p>
    </div>
  );
}

function NewAppointmentModal({ open, onClose, onSaved, defaults }) {
  const { toast } = useUI();
  const [customer, setCustomer] = useState(null);
  const [f, setF] = useState({});
  const [sendEmail, setSendEmail] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCustomer(null);
      setF({ date: defaults.date || isoDay(), time: "09:00", service: SERVICES[0] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    if (!customer) return toast("Pick or add a customer.", "bad");
    setSaving(true);
    const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ");
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        customer_id: customer.id,
        customer_name: name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        name,
        email: customer.email,
        phone: customer.phone,
        appointment_date: f.date,
        appointment_time: f.time,
        date: f.date,
        time: time12(f.time),
        service: f.service,
        notes: f.notes || null,
        vehicle_year: parseInt(f.year, 10) || null,
        vehicle_make: f.make || null,
        vehicle_model: f.model || null,
        status: "confirmed",
      })
      .select()
      .single();
    if (error) {
      setSaving(false);
      return toast(error.message, "bad");
    }
    if (sendEmail && customer.email) {
      adminFetch("/api/admin/email", { type: "appointment", id: data.id, kind: "confirmed" }).catch((e) => toast(e.message, "bad"));
    }
    setSaving(false);
    toast("Appointment booked");
    onSaved();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="New appointment"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={save}>Book appointment</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Customer" required>
          <CustomerPicker value={customer} onChange={setCustomer} />
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <TextField label="Date" type="date" value={f.date || ""} onChange={set("date")} />
          <TextField as="select" label="Time" value={f.time || ""} onChange={set("time")}>
            {TIMES.map((x) => <option key={x} value={x}>{time12(x)}</option>)}
          </TextField>
          <TextField as="select" label="Service" className="col-span-2 sm:col-span-1" value={f.service || ""} onChange={set("service")}>
            {SERVICES.map((s) => <option key={s}>{s}</option>)}
          </TextField>
          <TextField label="Vehicle year" inputMode="numeric" value={f.year || ""} onChange={set("year")} />
          <TextField label="Make" value={f.make || ""} onChange={set("make")} />
          <TextField label="Model" value={f.model || ""} onChange={set("model")} />
        </div>
        <TextField as="textarea" rows={2} label="Notes" value={f.notes || ""} onChange={set("notes")} />
        <Toggle checked={sendEmail} onChange={setSendEmail} label="Email a confirmation to the customer" description={customer && !customer.email ? "This customer has no email on file." : undefined} disabled={customer && !customer.email} />
      </div>
    </Modal>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={null}>
      <ScheduleInner />
    </Suspense>
  );
}
