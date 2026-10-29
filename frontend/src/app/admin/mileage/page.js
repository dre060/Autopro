// frontend/src/app/admin/mileage/page.js — business mileage log (IRS standard rate)
"use client";

import { useEffect, useMemo, useState } from "react";
import { Route, Plus, Trash2, Repeat } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { money, date as fmtDate, isoDay } from "@/lib/format";
import { r2, n0, rateOn } from "@/lib/books";
import { Button, Card, CardHeader, PageHeader, Table, Th, Td, Modal, TextField, Stat, Toggle, EmptyState, SkeletonRows, Select, cx, useUI } from "@/components/admin/ui";
import { useRates, ExportButtons, EstimateNote } from "@/components/admin/booksKit";

const PURPOSES = { parts_run: "Parts run", test_drive: "Test drive", delivery: "Vehicle delivery", auction: "Auction", customer: "Customer pickup / drop-off", bank: "Bank / supplies", other: "Other" };

export default function MileagePage() {
  const { toast, confirm } = useUI();
  const rates = useRates();
  const [year, setYear] = useState(new Date().getFullYear());
  const [trips, setTrips] = useState(null);
  const [edit, setEdit] = useState(null);

  const load = () => supabase.from("mileage_trips").select("*").gte("trip_date", `${year}-01-01`).lte("trip_date", `${year}-12-31`).order("trip_date", { ascending: false }).then(({ data }) => setTrips(data || []));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const milesOf = (t) => Number(t.miles) * (t.round_trip ? 2 : 1);
  const rateFor = (d) => Number((rates && rateOn(rates, "irs_mileage_rate", d)) || 0.725);
  const rows = useMemo(() => (trips || []).map((t) => ({ ...t, total_miles: milesOf(t), deduction: r2(milesOf(t) * rateFor(t.trip_date)) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trips, rates]);
  const totalMiles = rows.reduce((s, t) => s + t.total_miles, 0);
  const totalDed = r2(rows.reduce((s, t) => s + t.deduction, 0));
  const recentPlaces = [...new Set((trips || []).flatMap((t) => [t.from_place, t.to_place]).filter(Boolean))].slice(0, 20);

  const save = async () => {
    if (!(n0(edit.miles) > 0)) return toast("Enter the miles", "bad");
    const payload = { trip_date: edit.trip_date, from_place: edit.from_place?.trim() || null, to_place: edit.to_place?.trim() || null, miles: n0(edit.miles), round_trip: Boolean(edit.round_trip), purpose: edit.purpose, vehicle: edit.vehicle?.trim() || null, notes: edit.notes?.trim() || null };
    const res = edit.id ? await supabase.from("mileage_trips").update(payload).eq("id", edit.id) : await supabase.from("mileage_trips").insert(payload);
    if (res.error) return toast(res.error.message, "bad");
    try { localStorage.setItem("autopro-last-trip", JSON.stringify({ from_place: payload.from_place, vehicle: payload.vehicle })); } catch {}
    toast("Trip saved");
    setEdit(null);
    load();
  };
  const blank = () => {
    let last = {};
    try { last = JSON.parse(localStorage.getItem("autopro-last-trip") || "{}"); } catch {}
    return { trip_date: isoDay(), from_place: last.from_place || "Shop — 806 Hood Ave, Leesburg", to_place: "", miles: "", round_trip: true, purpose: "parts_run", vehicle: last.vehicle || "" };
  };

  return (
    <>
      <PageHeader title="Mileage" description="Log business trips. The deduction uses the IRS standard rate for each trip's date (rates are in Settings)."
        actions={<>
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28">{[0, 1, 2].map((i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}</Select>
          <Button variant="primary" icon={Plus} onClick={() => setEdit(blank())}>Log trip</Button>
        </>} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label={`Business miles ${year}`} value={Math.round(totalMiles).toLocaleString()} icon={Route} />
        <Stat label="Deduction" value={money(totalDed)} tone="good" sub="Feeds the year-end tax estimate" />
        <Stat label="Current IRS rate" value={`${(rateFor(isoDay()) * 100).toFixed(1)}¢`} sub="per mile" tone="info" />
      </div>
      <Card>
        <CardHeader title="Trips" actions={<ExportButtons filename={`mileage-log-${year}`} rows={rows} columns={[
          { label: "Date", value: "trip_date" }, { label: "From", value: "from_place" }, { label: "To", value: "to_place" }, { label: "Purpose", value: (t) => PURPOSES[t.purpose] || t.purpose },
          { label: "Round trip", value: (t) => (t.round_trip ? "yes" : "no") }, { label: "Miles", value: "total_miles" }, { label: "Vehicle", value: "vehicle" }, { label: "Deduction", value: "deduction" }, { label: "Notes", value: "notes" },
        ]} />} />
        {trips === null ? <SkeletonRows /> : rows.length === 0 ? (
          <EmptyState icon={Route} title="No trips logged" description="Every parts run counts. A year of short trips adds up to real money." action={<Button variant="primary" icon={Plus} onClick={() => setEdit(blank())}>Log trip</Button>} />
        ) : (
          <Table>
            <thead><tr><Th>Date</Th><Th>Trip</Th><Th className="hidden sm:table-cell">Purpose</Th><Th align="right">Miles</Th><Th align="right">Deduction</Th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="cursor-pointer hover:bg-a-hover/50" onClick={() => setEdit({ ...t, miles: String(t.miles) })}>
                  <Td className="whitespace-nowrap text-a-muted">{fmtDate(t.trip_date)}</Td>
                  <Td><div className="flex items-center gap-1">{t.to_place || "—"}{t.round_trip && <Repeat className="h-3.5 w-3.5 text-a-faint" />}</div><div className="text-xs text-a-faint">from {t.from_place || "—"}</div></Td>
                  <Td className="hidden text-a-muted sm:table-cell">{PURPOSES[t.purpose] || t.purpose}</Td>
                  <Td align="right">{t.total_miles}</Td>
                  <Td align="right">{money(t.deduction)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <div className="px-5 py-3"><EstimateNote>Keep the log as you go; the IRS expects records made at the time of the trip.</EstimateNote></div>
      </Card>

      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.id ? "Edit trip" : "Log trip"}
        footer={<>{edit?.id && <Button variant="danger" icon={Trash2} className="mr-auto" onClick={async () => {
          if (!(await confirm({ title: "Delete this trip?", danger: true, confirmLabel: "Delete" }))) return;
          await supabase.from("mileage_trips").delete().eq("id", edit.id); setEdit(null); load();
        }}>Delete</Button>}<Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Date" type="date" value={edit.trip_date} onChange={(e) => setEdit({ ...edit, trip_date: e.target.value })} />
            <TextField as="select" label="Purpose" value={edit.purpose} onChange={(e) => setEdit({ ...edit, purpose: e.target.value })}>{Object.entries(PURPOSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</TextField>
            <TextField className="col-span-2" label="From" list="places" value={edit.from_place || ""} onChange={(e) => setEdit({ ...edit, from_place: e.target.value })} />
            <TextField className="col-span-2" label="To" list="places" value={edit.to_place || ""} onChange={(e) => setEdit({ ...edit, to_place: e.target.value })} placeholder="NAPA Leesburg, Manheim Orlando…" />
            <datalist id="places">{recentPlaces.map((p) => <option key={p} value={p} />)}</datalist>
            <TextField label="Miles one way" inputMode="decimal" value={edit.miles} onChange={(e) => setEdit({ ...edit, miles: e.target.value })}
              hint={edit.to_place ? <a className="text-a-accent" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(edit.from_place || "")}&destination=${encodeURIComponent(edit.to_place)}`}>Check distance on the map</a> : undefined} />
            <div className="flex items-end pb-2"><Toggle checked={Boolean(edit.round_trip)} onChange={(v) => setEdit({ ...edit, round_trip: v })} label="Round trip (×2)" /></div>
            <TextField label="Vehicle" value={edit.vehicle || ""} onChange={(e) => setEdit({ ...edit, vehicle: e.target.value })} placeholder="Shop truck" />
            <div className={cx("flex items-end pb-2 text-sm text-a-muted")}>= {r2(n0(edit.miles) * (edit.round_trip ? 2 : 1))} mi · {money(n0(edit.miles) * (edit.round_trip ? 2 : 1) * rateFor(edit.trip_date))}</div>
            <TextField className="col-span-2" label="Notes" value={edit.notes || ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
          </div>
        )}
      </Modal>
    </>
  );
}
