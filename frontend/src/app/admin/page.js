// frontend/src/app/admin/page.js — Dashboard
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import {
  DollarSign, Wrench, CalendarDays, Receipt, Plus, ArrowUpRight, ArrowDownRight, MessageSquare, CarFront,
  Activity, Clock, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { money, money0, customerName, vehicleName, time12, relative, isoDay } from "@/lib/format";
import { Button, Card, CardHeader, Stat, StatusBadge, APPT_STATUS, EmptyState, Skeleton, cx } from "@/components/admin/ui";
import { NewRepairOrderModal } from "@/components/admin/pickers";
import { useAdmin } from "@/components/admin/AdminContext";
import KpiBoard from "@/components/admin/KpiBoard";

const OPEN = ["estimate", "approved", "in_progress", "waiting_parts", "ready"];

function monthStart(offset = 0) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
}

export default function Dashboard() {
  const { user, counts, canBooks } = useAdmin();
  const [data, setData] = useState(null);
  const [newRo, setNewRo] = useState(false);

  useEffect(() => {
    (async () => {
      const today = isoDay();
      const sixMonthsAgo = monthStart(-5);
      const [pay, open, ar, appts, ready, msgs, activity] = await Promise.all([
        supabase.from("payments").select("amount, received_at").gte("received_at", sixMonthsAgo.toISOString()),
        supabase.from("repair_orders").select("id, status, total").in("status", OPEN),
        supabase.from("repair_orders").select("id, balance_due, due_date").not("invoiced_at", "is", null).is("voided_at", null).gt("balance_due", 0),
        supabase
          .from("appointments")
          .select("id, customer_name, name, service, appointment_time, time, status, vehicle_year, vehicle_make, vehicle_model")
          .eq("appointment_date", today)
          .neq("status", "cancelled")
          .order("appointment_time"),
        supabase
          .from("repair_orders")
          .select("id, number, total, balance_due, customer:customers(first_name,last_name,company,phone), vehicle:customer_vehicles(year,make,model)")
          .eq("status", "ready")
          .order("updated_at", { ascending: false })
          .limit(6),
        supabase.from("contact_messages").select("id, name, subject, created_at").eq("responded", false).order("created_at", { ascending: false }).limit(5),
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(12),
      ]);

      const months = Array.from({ length: 6 }, (_, i) => {
        const d = monthStart(i - 5);
        return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-US", { month: "short" }), revenue: 0 };
      });
      (pay.data || []).forEach((p) => {
        const d = new Date(p.received_at);
        const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
        if (m) m.revenue += Number(p.amount);
      });

      const thisMonth = months[5].revenue;
      const lastMonth = months[4].revenue;
      const todayRevenue = (pay.data || []).filter((p) => isoDay(new Date(p.received_at)) === today).reduce((s, p) => s + Number(p.amount), 0);

      setData({
        months,
        thisMonth,
        lastMonth,
        todayRevenue,
        openCount: open.data?.length || 0,
        openValue: (open.data || []).reduce((s, r) => s + Number(r.total), 0),
        estimates: (open.data || []).filter((r) => r.status === "estimate").length,
        arTotal: (ar.data || []).reduce((s, r) => s + Number(r.balance_due), 0),
        arOverdue: (ar.data || []).filter((r) => r.due_date && r.due_date < today).length,
        appts: appts.data || [],
        ready: ready.data || [],
        msgs: msgs.data || [],
        activity: activity.data || [],
      });
    })();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.email?.startsWith("andre") ? "Andre" : "";
  const change = data && data.lastMonth > 0 ? ((data.thisMonth - data.lastMonth) / data.lastMonth) * 100 : null;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-a-muted">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {greeting}
            {firstName && `, ${firstName}`}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={CalendarDays} href="/admin/schedule?new=1">Book appointment</Button>
          <Button variant="primary" icon={Plus} onClick={() => setNewRo(true)}>New repair order</Button>
        </div>
      </div>

      {canBooks && (
        <div className="mb-5">
          <KpiBoard />
        </div>
      )}

      {/* Shop at a glance */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {!data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[112px] rounded-xl" />)
        ) : (
          <>
            <Stat
              label="Revenue this month"
              value={money0(data.thisMonth)}
              icon={DollarSign}
              tone="good"
              href="/admin/reports"
              sub={
                change === null ? (
                  `${money0(data.todayRevenue)} collected today`
                ) : (
                  <span className={cx("inline-flex items-center gap-1", change >= 0 ? "text-a-good" : "text-a-bad")}>
                    {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(change).toFixed(0)}% vs last month
                  </span>
                )
              }
            />
            <Stat label="Open jobs" value={data.openCount} icon={Wrench} href="/admin/repair-orders" sub={`${money0(data.openValue)} in progress · ${data.estimates} estimates`} />
            <Stat
              label="Today's appointments"
              value={data.appts.length}
              icon={CalendarDays}
              tone="violet"
              href="/admin/schedule"
              sub={counts.pendingAppointments ? `${counts.pendingAppointments} requests need confirming` : "All requests confirmed"}
            />
            <Stat
              label="Unpaid invoices"
              value={money0(data.arTotal)}
              icon={Receipt}
              tone={data.arOverdue ? "bad" : "warn"}
              href="/admin/invoices"
              sub={data.arOverdue ? `${data.arOverdue} overdue` : "Nothing overdue"}
            />
          </>
        )}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        {/* revenue chart */}
        <Card className="xl:col-span-2">
          <CardHeader title="Revenue" description="Payments received, last 6 months" />
          <div className="h-[260px] px-2 pb-4">
            {data ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.months} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgb(var(--a-line))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "rgb(var(--a-faint))", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: "rgb(var(--a-faint))", fontSize: 12 }} tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)} />
                  <Tooltip
                    cursor={{ fill: "rgb(var(--a-hover))" }}
                    contentStyle={{ background: "rgb(var(--a-raised))", border: "1px solid rgb(var(--a-line))", borderRadius: 10, color: "rgb(var(--a-text))", fontSize: 13 }}
                    formatter={(v) => [money(v), "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="rgb(var(--a-accent))" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="mx-3 h-full" />
            )}
          </div>
        </Card>

        {/* today */}
        <Card>
          <CardHeader title="Today's schedule" icon={Clock} actions={<Button size="xs" variant="ghost" href="/admin/schedule">View all</Button>} />
          <div className="px-2 pb-3">
            {!data ? (
              <div className="space-y-2 px-3"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
            ) : data.appts.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No appointments today" className="py-8" />
            ) : (
              <ul>
                {data.appts.map((a) => (
                  <li key={a.id}>
                    <Link href={`/admin/schedule?id=${a.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-a-hover">
                      <span className="w-16 text-[13px] font-medium text-a-accent tnum">{time12(a.appointment_time || a.time)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{a.customer_name || a.name}</span>
                        <span className="block truncate text-xs text-a-faint">
                          {a.service}
                          {a.vehicle_make && ` · ${[a.vehicle_year, a.vehicle_make, a.vehicle_model].filter(Boolean).join(" ")}`}
                        </span>
                      </span>
                      <StatusBadge map={APPT_STATUS} value={a.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Ready for pickup" icon={CheckCircle2} actions={<Button size="xs" variant="ghost" href="/admin/repair-orders">Board</Button>} />
          <div className="px-2 pb-3">
            {data?.ready.length === 0 ? (
              <EmptyState icon={CarFront} title="Nothing waiting" className="py-8" />
            ) : (
              <ul>
                {(data?.ready || []).map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/repair-orders/${r.id}`} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-a-hover">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{customerName(r.customer)}</span>
                        <span className="block truncate text-xs text-a-faint">#{r.number} · {vehicleName(r.vehicle)}</span>
                      </span>
                      <span className="text-right text-sm tnum">
                        {money(r.total)}
                        {Number(r.balance_due) > 0 && <span className="block text-[11px] text-a-warn">{money(r.balance_due)} due</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="New messages" icon={MessageSquare} actions={<Button size="xs" variant="ghost" href="/admin/messages">Inbox</Button>} />
          <div className="px-2 pb-3">
            {data?.msgs.length === 0 ? (
              <EmptyState icon={MessageSquare} title="Inbox zero" description="Every message has been answered." className="py-8" />
            ) : (
              <ul>
                {(data?.msgs || []).map((m) => (
                  <li key={m.id}>
                    <Link href={`/admin/messages?id=${m.id}`} className="block rounded-lg px-3 py-2.5 hover:bg-a-hover">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{m.name}</span>
                        <span className="shrink-0 text-[11px] text-a-faint">{relative(m.created_at)}</span>
                      </span>
                      <span className="block truncate text-xs text-a-muted">{m.subject}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Activity" icon={Activity} />
          <ol className="max-h-[320px] space-y-3 overflow-y-auto px-5 pb-5">
            {(data?.activity || []).map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-a-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block text-a-text">{a.summary}</span>
                  <span className="block text-[11px] text-a-faint">
                    {relative(a.created_at)} · {a.actor === "website" ? "Website" : a.actor === "customer" ? "Customer" : a.actor?.split("@")[0]}
                  </span>
                </span>
              </li>
            ))}
            {data?.activity.length === 0 && <li className="py-6 text-center text-sm text-a-faint">No activity yet.</li>}
          </ol>
        </Card>
      </div>

      <NewRepairOrderModal open={newRo} onClose={() => setNewRo(false)} />
    </>
  );
}
