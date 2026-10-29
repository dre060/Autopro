// frontend/src/app/admin/tech/page.js — time clock + "my jobs" for everyone (no prices)
"use client";

import { useEffect, useState } from "react";
import { Timer, Play, Square, Wrench, StickyNote, CarFront, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { dateTime } from "@/lib/format";
import { Button, Card, PageHeader, StatusBadge, RO_STATUS, EmptyState, SkeletonRows, Textarea, Badge, cx, useUI } from "@/components/admin/ui";

const vname = (v) => (v ? [v.year, v.make, v.model].filter(Boolean).join(" ") : "Vehicle");

export default function TechPage() {
  const { toast } = useUI();
  const [me, setMe] = useState(null);
  const [jobs, setJobs] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState({});
  const [tick, setTick] = useState(Date.now());

  const load = async () => {
    const [a, b] = await Promise.all([supabase.rpc("tech_me"), supabase.rpc("tech_jobs")]);
    if (a.error) toast(a.error.message, "bad");
    setMe(a.data || {});
    setJobs(b.data || []);
  };
  useEffect(() => {
    load();
    const t = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clock = async (action, ro = null) => {
    setBusy(true);
    const { data, error } = await supabase.rpc("tech_clock", { p_action: action, p_repair_order: ro });
    setBusy(false);
    if (error) return toast(error.message, "bad");
    setMe(data);
    toast(action === "out" ? "Clocked out" : action === "in" ? "Clocked in" : "Switched job");
  };

  const update = async (ro, status) => {
    const { error } = await supabase.rpc("tech_update_job", { p_repair_order: ro.id, p_status: status || null, p_note: notes[ro.id] || null });
    if (error) return toast(error.message, "bad");
    setNotes((n) => ({ ...n, [ro.id]: "" }));
    toast(status ? `RO #${ro.number} → ${RO_STATUS[status].label}` : "Note added");
    load();
  };

  const open = me?.open_entry;
  const elapsed = open ? (tick - new Date(open.clock_in)) / 3600000 : 0;

  return (
    <>
      <PageHeader title="Time clock & my jobs" description="Clock in, pick the job you're on, and update its status." actions={<Button size="sm" icon={RefreshCw} onClick={load}>Refresh</Button>} />
      <Card className={cx("mb-5 p-5", open && "border-a-good/50")}>
        {me === null ? <SkeletonRows rows={2} /> : !me.employee ? (
          <p className="text-sm text-a-muted">Your login isn't linked to an employee yet. Ask the owner to link it under Team → App access.</p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className={cx("flex h-14 w-14 items-center justify-center rounded-2xl", open ? "bg-a-good/15 text-a-good" : "bg-a-hover text-a-muted")}><Timer className="h-7 w-7" /></span>
              <div>
                <div className="text-sm text-a-muted">{me.employee.name}</div>
                <div className="font-display text-2xl font-semibold">{open ? `On the clock · ${Math.floor(elapsed)}h ${Math.round((elapsed % 1) * 60)}m` : "Off the clock"}</div>
                <div className="text-sm text-a-faint">This week: {Number(me.week_hours || 0).toFixed(2)} hrs{open?.repair_order_id && jobs ? ` · on RO #${jobs.find((j) => j.id === open.repair_order_id)?.number ?? ""}` : ""}</div>
              </div>
            </div>
            {open ? (
              <Button size="lg" variant="danger" icon={Square} loading={busy} onClick={() => clock("out")}>Clock out</Button>
            ) : (
              <Button size="lg" variant="success" icon={Play} loading={busy} onClick={() => clock("in")}>Clock in</Button>
            )}
          </div>
        )}
      </Card>

      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-a-muted"><Wrench className="h-4 w-4" /> Jobs in the shop</h2>
      {jobs === null ? <Card><SkeletonRows /></Card> : jobs.length === 0 ? (
        <Card><EmptyState icon={Wrench} title="No open jobs" description="Approved repair orders show up here." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((j) => (
            <Card key={j.id} className={cx("p-4", open?.repair_order_id === j.id && "border-a-accent/60")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-a-faint">RO #{j.number}{j.customer ? ` · ${j.customer}` : ""}{j.technician ? ` · ${j.technician}` : ""}</div>
                  <div className="flex items-center gap-2 font-semibold"><CarFront className="h-4 w-4 text-a-muted" />{vname(j.vehicle)}{j.vehicle?.stock && <Badge tone="violet">Our car</Badge>}</div>
                  <div className="text-xs text-a-faint">{[j.vehicle?.plate, j.vehicle?.vin, j.vehicle?.engine, j.mileage_in && `${Number(j.mileage_in).toLocaleString()} mi`].filter(Boolean).join(" · ")}</div>
                </div>
                <StatusBadge map={RO_STATUS} value={j.status} />
              </div>
              {j.complaint && <p className="mt-3 text-sm"><span className="text-a-muted">Concern: </span>{j.complaint}</p>}
              {j.items.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {j.items.map((i, k) => (
                    <li key={k} className="flex justify-between gap-3">
                      <span>{i.kind === "part" ? "▪ " : "• "}{i.description}{i.part_number ? ` (${i.part_number})` : ""}</span>
                      <span className="shrink-0 text-a-faint">{i.hours ? `${i.hours} hr` : i.quantity ? `×${i.quantity}` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
              {j.promised_at && <p className="mt-2 text-xs text-a-warn">Promised {dateTime(j.promised_at)}</p>}
              {j.internal_notes && <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-a-raised p-2 font-sans text-xs text-a-muted">{j.internal_notes}</pre>}
              <Textarea rows={2} className="mt-3" placeholder="Add a note (what you found, parts needed…)" value={notes[j.id] || ""} onChange={(e) => setNotes((n) => ({ ...n, [j.id]: e.target.value }))} />
              <div className="mt-3 flex flex-wrap gap-2">
                {me?.employee && open?.repair_order_id !== j.id && (
                  <Button size="sm" icon={Timer} loading={busy} onClick={() => clock(open ? "switch" : "in", j.id)}>{open ? "Switch to this job" : "Clock in on this job"}</Button>
                )}
                {j.status !== "in_progress" && <Button size="sm" onClick={() => update(j, "in_progress")}>Start work</Button>}
                {j.status !== "waiting_parts" && <Button size="sm" onClick={() => update(j, "waiting_parts")}>Waiting on parts</Button>}
                {j.status !== "ready" && <Button size="sm" variant="success" onClick={() => update(j, "ready")}>Done — ready</Button>}
                {notes[j.id]?.trim() && <Button size="sm" icon={StickyNote} onClick={() => update(j, null)}>Save note</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
