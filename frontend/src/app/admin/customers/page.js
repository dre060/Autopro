// frontend/src/app/admin/customers/page.js
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Users, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { money, customerName, phone as fmtPhone, date, isoDay } from "@/lib/format";
import { Button, Card, PageHeader, Input, Table, Th, Td, EmptyState, SkeletonRows, Modal, ErrorBanner, Select, useUI, useDebounced } from "@/components/admin/ui";
import { CustomerForm, cleanCustomer } from "@/components/admin/pickers";

function CustomersInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useUI();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [newOpen, setNewOpen] = useState(params.get("new") === "1");
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const dq = useDebounced(q);

  useEffect(() => {
    supabase
      .from("customers")
      .select("id, first_name, last_name, company, phone, email, created_at, updated_at, tags, customer_vehicles(id), repair_orders(total, balance_due, invoiced_at, created_at, status)")
      .order("updated_at", { ascending: false })
      .limit(2000)
      .then(({ data, error: err }) => {
        if (err) setError(err);
        setRows(
          (data || []).map((c) => {
            const ros = (c.repair_orders || []).filter((r) => r.status !== "cancelled");
            const invoiced = ros.filter((r) => r.invoiced_at);
            const last = ros.map((r) => r.created_at).sort().pop();
            return {
              ...c,
              vehicles: c.customer_vehicles?.length || 0,
              visits: ros.length,
              spend: invoiced.reduce((s, r) => s + Number(r.total), 0),
              owed: invoiced.reduce((s, r) => s + Math.max(Number(r.balance_due), 0), 0),
              lastVisit: last || null,
            };
          })
        );
      });
  }, []);

  const shown = useMemo(() => {
    let r = rows || [];
    const t = dq.trim().toLowerCase();
    const digits = t.replace(/\D/g, "");
    if (t) {
      r = r.filter(
        (c) =>
          customerName(c).toLowerCase().includes(t) ||
          (c.email || "").toLowerCase().includes(t) ||
          (c.company || "").toLowerCase().includes(t) ||
          (digits.length >= 3 && (c.phone || "").replace(/\D/g, "").includes(digits))
      );
    }
    const by = {
      recent: (a, b) => String(b.lastVisit || b.updated_at).localeCompare(String(a.lastVisit || a.updated_at)),
      name: (a, b) => customerName(a).localeCompare(customerName(b)),
      spend: (a, b) => b.spend - a.spend,
      owed: (a, b) => b.owed - a.owed,
    }[sort];
    return [...r].sort(by);
  }, [rows, dq, sort]);

  const create = async () => {
    if (!draft.first_name?.trim() && !draft.company?.trim()) return toast("Enter a first name or a company.", "bad");
    setSaving(true);
    const { data, error: err } = await supabase.from("customers").insert(cleanCustomer(draft)).select("id").single();
    setSaving(false);
    if (err) return toast(err.message, "bad");
    router.push(`/admin/customers/${data.id}`);
  };

  const exportCsv = () => {
    const header = ["First name", "Last name", "Company", "Phone", "Email", "Vehicles", "Visits", "Lifetime spend", "Balance owed", "Last visit"];
    const lines = shown.map((c) => [c.first_name, c.last_name, c.company, c.phone, c.email, c.vehicles, c.visits, c.spend.toFixed(2), c.owed.toFixed(2), c.lastVisit ? isoDay(new Date(c.lastVisit)) : ""]);
    const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `autopro-customers-${isoDay()}.csv`;
    a.click();
  };

  return (
    <>
      <PageHeader
        title="Customers"
        description={rows ? `${rows.length} customer${rows.length === 1 ? "" : "s"}` : " "}
        actions={
          <>
            <Button icon={Download} onClick={exportCsv} disabled={!rows?.length}>Export</Button>
            <Button variant="primary" icon={Plus} onClick={() => { setDraft({}); setNewOpen(true); }}>New customer</Button>
          </>
        }
      />
      <ErrorBanner error={error} />
      <Card>
        <div className="flex flex-col gap-3 border-b border-a-line px-4 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-a-faint" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email…" className="pl-9" />
          </div>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="sm:w-48">
            <option value="recent">Most recent</option>
            <option value="name">Name A–Z</option>
            <option value="spend">Top spenders</option>
            <option value="owed">Owes money</option>
          </Select>
        </div>
        {rows === null ? (
          <SkeletonRows />
        ) : shown.length === 0 ? (
          <EmptyState icon={Users} title={q ? "No matches" : "No customers yet"} description="Customers are added when you create a repair order or appointment, or here." />
        ) : (
          <Table>
            <thead>
              <tr><Th>Name</Th><Th>Phone</Th><Th>Email</Th><Th align="right">Vehicles</Th><Th align="right">Visits</Th><Th align="right">Lifetime</Th><Th align="right">Owes</Th><Th align="right">Last visit</Th></tr>
            </thead>
            <tbody>
              {shown.slice(0, 500).map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-a-hover/50" onClick={() => router.push(`/admin/customers/${c.id}`)}>
                  <Td>
                    <div className="font-medium">{customerName(c)}</div>
                    {c.company && c.first_name && <div className="text-xs text-a-faint">{c.company}</div>}
                  </Td>
                  <Td className="whitespace-nowrap text-a-muted">{fmtPhone(c.phone) || "—"}</Td>
                  <Td className="text-a-muted">{c.email || "—"}</Td>
                  <Td align="right">{c.vehicles}</Td>
                  <Td align="right">{c.visits}</Td>
                  <Td align="right">{money(c.spend)}</Td>
                  <Td align="right" className={c.owed > 0 ? "font-medium text-a-warn" : "text-a-faint"}>{c.owed > 0 ? money(c.owed) : "—"}</Td>
                  <Td align="right" className="text-a-faint">{c.lastVisit ? date(c.lastVisit) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New customer"
        footer={
          <>
            <Button onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={create}>Create customer</Button>
          </>
        }
      >
        <CustomerForm value={draft} onChange={setDraft} />
      </Modal>
    </>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={null}>
      <CustomersInner />
    </Suspense>
  );
}
