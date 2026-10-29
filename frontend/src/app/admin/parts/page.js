// frontend/src/app/admin/parts/page.js
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Package, Search, AlertTriangle, Trash2, Minus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { money, money0, num } from "@/lib/format";
import {
  Button, Card, PageHeader, Segmented, Table, Th, Td, Input, Modal, TextField, Stat, EmptyState, SkeletonRows, ErrorBanner, Badge, IconButton, cx, useUI,
} from "@/components/admin/ui";

const EMPTY = { name: "", part_number: "", brand: "", category: "", location: "", supplier: "", unit_cost: "", unit_price: "", quantity_on_hand: "", reorder_point: "", notes: "" };

function PartsInner() {
  const params = useSearchParams();
  const { toast, confirm } = useUI();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState(params.get("new") === "1" ? EMPTY : null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    supabase.from("parts").select("*").eq("active", true).order("name").then(({ data, error: err }) => {
      if (err) setError(err);
      setRows(data || []);
    });
  useEffect(() => {
    load();
  }, []);

  const low = (p) => Number(p.quantity_on_hand) <= Number(p.reorder_point);
  const shown = useMemo(() => {
    let r = rows || [];
    if (filter === "low") r = r.filter(low);
    const t = q.trim().toLowerCase();
    if (t) r = r.filter((p) => `${p.name} ${p.part_number || ""} ${p.brand || ""} ${p.category || ""} ${p.supplier || ""}`.toLowerCase().includes(t));
    return r;
  }, [rows, filter, q]);

  const value = (rows || []).reduce((s, p) => s + Math.max(Number(p.quantity_on_hand), 0) * Number(p.unit_cost), 0);
  const lowCount = (rows || []).filter(low).length;

  const save = async () => {
    if (!edit.name?.trim()) return toast("Enter a part name.", "bad");
    const dec = (x) => Math.round((parseFloat(String(x).replace(/[^\d.-]/g, "")) || 0) * 100) / 100;
    const t = (x) => String(x ?? "").trim() || null;
    const payload = {
      name: edit.name.trim(), part_number: t(edit.part_number), brand: t(edit.brand), category: t(edit.category), location: t(edit.location),
      supplier: t(edit.supplier), notes: t(edit.notes), unit_cost: Math.max(dec(edit.unit_cost), 0), unit_price: Math.max(dec(edit.unit_price), 0),
      quantity_on_hand: dec(edit.quantity_on_hand), reorder_point: Math.max(dec(edit.reorder_point), 0),
    };
    setSaving(true);
    const { error: err } = edit.id ? await supabase.from("parts").update(payload).eq("id", edit.id) : await supabase.from("parts").insert(payload);
    setSaving(false);
    if (err) return toast(err.message, "bad");
    toast(edit.id ? "Part saved" : "Part added");
    setEdit(null);
    load();
  };

  const adjust = async (p, delta) => {
    const qty = Number(p.quantity_on_hand) + delta;
    setRows((rs) => rs.map((x) => (x.id === p.id ? { ...x, quantity_on_hand: qty } : x)));
    const { error: err } = await supabase.from("parts").update({ quantity_on_hand: qty }).eq("id", p.id);
    if (err) {
      toast(err.message, "bad");
      load();
    }
  };

  const markup = edit && Number(edit.unit_cost) > 0 ? ((Number(edit.unit_price) - Number(edit.unit_cost)) / Number(edit.unit_cost)) * 100 : null;

  return (
    <>
      <PageHeader
        title="Parts"
        description="Stock on the shelf. Adding an inventory part to a repair order takes it out of stock automatically."
        actions={<Button variant="primary" icon={Plus} onClick={() => setEdit(EMPTY)}>Add part</Button>}
      />
      <ErrorBanner error={error} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Parts tracked" value={num(rows?.length || 0)} icon={Package} />
        <Stat label="Inventory value (cost)" value={money0(value)} tone="good" />
        <Stat label="Low stock" value={lowCount} icon={AlertTriangle} tone={lowCount ? "warn" : "good"} sub={lowCount ? "At or below reorder point" : "All stocked"} />
      </div>
      <Card>
        <div className="flex flex-col gap-3 border-b border-a-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented value={filter} onChange={setFilter} options={[{ value: "all", label: "All", count: rows?.length || 0 }, { value: "low", label: "Low stock", count: lowCount }]} />
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-a-faint" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, part #, brand…" className="pl-9" />
          </div>
        </div>
        {rows === null ? (
          <SkeletonRows />
        ) : shown.length === 0 ? (
          <EmptyState icon={Package} title={rows.length ? "No matches" : "No parts yet"} description="Track oil filters, pads, wipers — anything you keep in stock." action={!rows.length && <Button variant="primary" icon={Plus} onClick={() => setEdit(EMPTY)}>Add part</Button>} />
        ) : (
          <Table>
            <thead>
              <tr><Th>Part</Th><Th>Brand</Th><Th>Location</Th><Th align="right">Cost</Th><Th align="right">Price</Th><Th align="right">On hand</Th><Th /></tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className="cursor-pointer hover:bg-a-hover/50" onClick={() => setEdit(p)}>
                  <Td>
                    <div className="font-medium">{p.name}</div>
                    {p.part_number && <div className="font-mono text-xs text-a-faint">{p.part_number}</div>}
                  </Td>
                  <Td className="text-a-muted">{p.brand || "—"}</Td>
                  <Td className="text-a-muted">{p.location || "—"}</Td>
                  <Td align="right" className="text-a-muted">{money(p.unit_cost)}</Td>
                  <Td align="right">{money(p.unit_price)}</Td>
                  <Td align="right">
                    <span className={cx("font-semibold", low(p) && "text-a-warn")}>{num(p.quantity_on_hand)}</span>
                    {low(p) && <Badge tone="warn" className="ml-2">Reorder</Badge>}
                  </Td>
                  <Td align="right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex">
                      <IconButton size="sm" icon={Minus} label="Remove one" onClick={() => adjust(p, -1)} />
                      <IconButton size="sm" icon={Plus} label="Add one" onClick={() => adjust(p, 1)} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        size="lg"
        title={edit?.id ? "Edit part" : "Add part"}
        footer={
          <>
            {edit?.id && (
              <Button variant="danger" icon={Trash2} className="mr-auto" onClick={async () => {
                if (!(await confirm({ title: `Remove ${edit.name}?`, message: "It disappears from the parts list. Past repair orders keep their line items.", danger: true, confirmLabel: "Remove" }))) return;
                await supabase.from("parts").update({ active: false }).eq("id", edit.id);
                setEdit(null);
                load();
              }}>Remove</Button>
            )}
            <Button onClick={() => setEdit(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={save}>Save part</Button>
          </>
        }
      >
        {edit && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <TextField className="col-span-2" label="Name" required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Oil filter" />
            <TextField label="Part #" value={edit.part_number || ""} onChange={(e) => setEdit({ ...edit, part_number: e.target.value })} />
            <TextField label="Brand" value={edit.brand || ""} onChange={(e) => setEdit({ ...edit, brand: e.target.value })} />
            <TextField label="Category" value={edit.category || ""} onChange={(e) => setEdit({ ...edit, category: e.target.value })} />
            <TextField label="Shelf / bin" value={edit.location || ""} onChange={(e) => setEdit({ ...edit, location: e.target.value })} />
            <TextField className="col-span-2" label="Supplier" value={edit.supplier || ""} onChange={(e) => setEdit({ ...edit, supplier: e.target.value })} placeholder="NAPA, AutoZone, O'Reilly…" />
            <TextField label="Your cost" inputMode="decimal" value={edit.unit_cost} onChange={(e) => setEdit({ ...edit, unit_cost: e.target.value })} />
            <TextField label="Sell price" inputMode="decimal" value={edit.unit_price} onChange={(e) => setEdit({ ...edit, unit_price: e.target.value })} hint={markup !== null ? `${markup.toFixed(0)}% markup` : undefined} />
            <TextField label="On hand" inputMode="decimal" value={edit.quantity_on_hand} onChange={(e) => setEdit({ ...edit, quantity_on_hand: e.target.value })} />
            <TextField label="Reorder at" inputMode="decimal" value={edit.reorder_point} onChange={(e) => setEdit({ ...edit, reorder_point: e.target.value })} />
            <TextField className="col-span-2 md:col-span-4" as="textarea" rows={2} label="Notes" value={edit.notes || ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
          </div>
        )}
      </Modal>
    </>
  );
}

export default function PartsPage() {
  return (
    <Suspense fallback={null}>
      <PartsInner />
    </Suspense>
  );
}
