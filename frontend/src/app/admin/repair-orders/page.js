// frontend/src/app/admin/repair-orders/page.js
"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Wrench, LayoutGrid, List, Search, Clock, User, ChevronRight, BellRing } from "lucide-react";
import NotifyCustomerModal, { autoNotify } from "@/components/admin/NotifyCustomer";
import { supabase } from "@/lib/supabase";
import { money, customerName, vehicleName, relative, date } from "@/lib/format";
import {
  Button, Card, PageHeader, Segmented, StatusBadge, RO_STATUS, PAYMENT_STATUS, EmptyState, SkeletonRows,
  Table, Th, Td, Input, Select, ErrorBanner, cx, useUI, useDebounced,
} from "@/components/admin/ui";
import { NewRepairOrderModal } from "@/components/admin/pickers";
import { useAdmin } from "@/components/admin/AdminContext";

const BOARD = ["estimate", "approved", "in_progress", "waiting_parts", "ready"];
const SELECT = "id, number, invoice_number, status, public_token, total, balance_due, payment_status, complaint, technician, promised_at, invoiced_at, customer_notified_at, created_at, updated_at, customer:customers(id, first_name, last_name, company, phone, email), vehicle:customer_vehicles(year, make, model, license_plate)";
const NEXT = {
  estimate: ["approved", "Approved"],
  approved: ["in_progress", "Start work"],
  in_progress: ["ready", "Ready for pickup"],
  waiting_parts: ["in_progress", "Parts arrived"],
  ready: ["completed", "Picked up"],
};

function RepairOrdersInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useUI();
  const { refreshCounts, shop } = useAdmin();
  const [notifyRo, setNotifyRo] = useState(null);
  const [view, setView] = useState("board");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [newOpen, setNewOpen] = useState(params.get("new") === "1");
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const dq = useDebounced(q);

  useEffect(() => {
    try {
      const v = localStorage.getItem("autopro-ro-view");
      if (v === "list" || v === "board") setView(v);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setError(null);
    let query = supabase.from("repair_orders").select(SELECT).order("updated_at", { ascending: false });
    if (view === "board") query = query.in("status", BOARD);
    else if (statusFilter === "open") query = query.in("status", BOARD);
    else if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (view === "list") query = query.limit(300);
    const { data, error: err } = await query;
    if (err) setError(err);
    setRows(data || []);
  }, [view, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const term = dq.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [String(r.number), customerName(r.customer), vehicleName(r.vehicle), r.complaint, r.vehicle?.license_plate, r.customer?.phone, r.technician]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(term))
    );
  }, [rows, dq]);

  const moveTo = async (id, status) => {
    const row = rows.find((r) => r.id === id);
    if (!row || row.status === status) return;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error: err } = await supabase.from("repair_orders").update({ status }).eq("id", id);
    if (err) {
      toast(err.message, "bad");
      load();
    } else {
      toast(`RO #${row.number} → ${RO_STATUS[status].label}`);
      refreshCounts();
      if (status === "ready" && row.customer) {
        if (shop.notify?.auto_ready) {
          autoNotify({ ...row, status }, shop)
            .then((r) => (r?.skipped ? setNotifyRo({ ...row, status }) : toast(`${customerName(row.customer)} was told it's ready`)))
            .catch((e) => toast(e.message, "bad"));
        } else {
          setNotifyRo({ ...row, status });
        }
      }
    }
  };

  const changeView = (v) => {
    setView(v);
    try {
      localStorage.setItem("autopro-ro-view", v);
    } catch {}
  };

  return (
    <>
      <PageHeader
        title="Repair orders"
        description="Every job from estimate to pickup. Drag cards between columns to update status."
        actions={
          <>
            <Segmented
              value={view}
              onChange={changeView}
              options={[
                { value: "board", label: <><LayoutGrid className="h-3.5 w-3.5" /> Board</> },
                { value: "list", label: <><List className="h-3.5 w-3.5" /> List</> },
              ]}
            />
            <Button variant="primary" icon={Plus} onClick={() => setNewOpen(true)}>
              New repair order
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-a-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search RO #, customer, vehicle, plate…" className="pl-9" />
        </div>
        {view === "list" && (
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
            <option value="open">Open jobs</option>
            <option value="all">All</option>
            {Object.entries(RO_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        )}
      </div>

      <ErrorBanner error={error} onRetry={load} />

      {filtered === null ? (
        <Card><SkeletonRows /></Card>
      ) : view === "board" ? (
        <>
        {/* phones: grouped list with one-tap next step */}
        <div className="space-y-5 md:hidden">
          {BOARD.map((status) => {
            const cards = filtered.filter((r) => r.status === status);
            if (!cards.length) return null;
            return (
              <section key={status}>
                <div className="mb-2 flex items-center justify-between">
                  <StatusBadge map={RO_STATUS} value={status} />
                  <span className="text-xs text-a-faint">{cards.length}</span>
                </div>
                <div className="space-y-2">
                  {cards.map((r) => (
                    <Card key={r.id} className="overflow-hidden">
                      <Link href={`/admin/repair-orders/${r.id}`} className="flex items-center gap-3 p-3.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{customerName(r.customer)}</span>
                            <span className="font-mono text-[11px] text-a-faint">#{r.number}</span>
                          </div>
                          <div className="truncate text-xs text-a-muted">{vehicleName(r.vehicle)}</div>
                          {r.status === "ready" && (
                            <div className={cx("mt-1 flex items-center gap-1 text-[11px]", r.customer_notified_at ? "text-a-good" : "text-a-warn")}>
                              <BellRing className="h-3 w-3" /> {r.customer_notified_at ? `Customer notified ${relative(r.customer_notified_at)}` : "Customer not notified yet"}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-semibold tnum">{money(r.total)}</span>
                        <ChevronRight className="h-4 w-4 text-a-faint" />
                      </Link>
                      <div className="flex border-t border-a-line">
                        {r.status === "ready" && !r.customer_notified_at && (
                          <button onClick={() => setNotifyRo(r)} className="flex-1 border-r border-a-line py-2.5 text-[13px] font-medium text-a-warn">
                            Notify customer
                          </button>
                        )}
                        {NEXT[r.status] && (
                          <button onClick={() => moveTo(r.id, NEXT[r.status][0])} className="flex-1 py-2.5 text-[13px] font-medium text-a-accent">
                            {NEXT[r.status][1]} →
                          </button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
          {filtered.length === 0 && (
            <Card><EmptyState icon={Wrench} title="No open jobs" action={<Button variant="primary" icon={Plus} onClick={() => setNewOpen(true)}>New repair order</Button>} /></Card>
          )}
        </div>
        <div className="-mx-4 hidden overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:block lg:-mx-8 lg:px-8">
          <div className="grid min-w-[1100px] grid-cols-5 gap-3">
            {BOARD.map((status) => {
              const cards = filtered.filter((r) => r.status === status);
              const sum = cards.reduce((s, r) => s + Number(r.total || 0), 0);
              return (
                <div
                  key={status}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverCol(status);
                  }}
                  onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOverCol(null);
                    if (dragId) moveTo(dragId, status);
                    setDragId(null);
                  }}
                  className={cx(
                    "flex min-h-[60vh] flex-col rounded-xl border bg-a-panel/60 transition-colors",
                    overCol === status ? "border-a-accent bg-a-accent/5" : "border-a-line"
                  )}
                >
                  <div className="flex items-center justify-between px-3 pb-2 pt-3">
                    <StatusBadge map={RO_STATUS} value={status} />
                    <span className="text-xs text-a-faint tnum">
                      {cards.length} · {money(sum)}
                    </span>
                  </div>
                  <div className="flex-1 space-y-2 p-2">
                    {cards.map((r) => (
                      <Link
                        key={r.id}
                        href={`/admin/repair-orders/${r.id}`}
                        draggable
                        onDragStart={() => setDragId(r.id)}
                        onDragEnd={() => setDragId(null)}
                        className={cx(
                          "block cursor-grab rounded-lg border border-a-line bg-a-raised p-3 transition-[border,transform,opacity] hover:border-a-faint/60 active:cursor-grabbing",
                          dragId === r.id && "opacity-50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-a-faint">#{r.number}</span>
                          <span className="text-sm font-semibold text-a-text tnum">{money(r.total)}</span>
                        </div>
                        <div className="mt-1.5 truncate text-sm font-medium text-a-text">{customerName(r.customer)}</div>
                        <div className="truncate text-xs text-a-muted">{vehicleName(r.vehicle)}</div>
                        {r.complaint && <div className="mt-2 line-clamp-2 text-xs text-a-faint">{r.complaint}</div>}
                        <div className="mt-2.5 flex items-center gap-3 text-[11px] text-a-faint">
                          {r.status === "ready" && (
                            <span className={cx("flex items-center gap-1", r.customer_notified_at ? "text-a-good" : "text-a-warn")} title={r.customer_notified_at ? "Customer notified" : "Customer not notified yet"}>
                              <BellRing className="h-3 w-3" />{r.customer_notified_at ? "Notified" : "Not notified"}
                            </span>
                          )}
                          {r.technician && (
                            <span className="flex items-center gap-1"><User className="h-3 w-3" />{r.technician}</span>
                          )}
                          {r.promised_at ? (
                            <span className={cx("flex items-center gap-1", new Date(r.promised_at) < new Date() && "text-a-bad")}>
                              <Clock className="h-3 w-3" />Due {date(r.promised_at, { month: "short", day: "numeric" })}
                            </span>
                          ) : (
                            <span>{relative(r.updated_at)}</span>
                          )}
                        </div>
                      </Link>
                    ))}
                    {cards.length === 0 && <div className="rounded-lg border border-dashed border-a-line px-3 py-6 text-center text-xs text-a-faint">Drop here</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </>
      ) : (
        <Card>
          {filtered.length === 0 ? (
            <EmptyState icon={Wrench} title="No repair orders" description="Create one to start an estimate." action={<Button variant="primary" icon={Plus} onClick={() => setNewOpen(true)}>New repair order</Button>} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>RO</Th><Th>Customer</Th><Th>Vehicle</Th><Th>Status</Th><Th>Payment</Th><Th align="right">Total</Th><Th align="right">Balance</Th><Th align="right">Updated</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} onClick={() => router.push(`/admin/repair-orders/${r.id}`)} className="cursor-pointer hover:bg-a-hover/50">
                    <Td className="font-mono text-a-muted">#{r.number}</Td>
                    <Td className="font-medium text-a-text">{customerName(r.customer)}</Td>
                    <Td className="text-a-muted">{vehicleName(r.vehicle)}</Td>
                    <Td><StatusBadge map={RO_STATUS} value={r.status} /></Td>
                    <Td>{r.invoiced_at ? <StatusBadge map={PAYMENT_STATUS} value={r.payment_status} /> : <span className="text-xs text-a-faint">Not invoiced</span>}</Td>
                    <Td align="right">{money(r.total)}</Td>
                    <Td align="right" className={Number(r.balance_due) > 0 && r.invoiced_at ? "text-a-warn" : "text-a-muted"}>{money(r.balance_due)}</Td>
                    <Td align="right" className="text-a-faint">{relative(r.updated_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      <NewRepairOrderModal open={newOpen} onClose={() => setNewOpen(false)} />
      <NotifyCustomerModal
        open={Boolean(notifyRo)}
        ro={notifyRo}
        event="ready"
        onClose={() => setNotifyRo(null)}
        onSent={() => {
          setRows((rs) => rs.map((x) => (x.id === notifyRo?.id ? { ...x, customer_notified_at: new Date().toISOString() } : x)));
        }}
      />
    </>
  );
}

export default function RepairOrdersPage() {
  return (
    <Suspense fallback={null}>
      <RepairOrdersInner />
    </Suspense>
  );
}
