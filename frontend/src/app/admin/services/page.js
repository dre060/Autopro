// frontend/src/app/admin/services/page.js — service menu / price list
"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, ClipboardList, Trash2, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { money } from "@/lib/format";
import { Button, Card, PageHeader, Table, Th, Td, Modal, TextField, Toggle, EmptyState, SkeletonRows, ErrorBanner, Badge, useUI } from "@/components/admin/ui";

const EMPTY = { name: "", category: "Maintenance", description: "", base_price: "", price_range_min: "", price_range_max: "", estimated_time_min: "", estimated_time_max: "", is_active: true, featured: false, display_order: 0 };

export default function ServicesPage() {
  const { toast, confirm } = useUI();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    supabase.from("services").select("*").order("category").order("display_order").order("name").then(({ data, error: err }) => {
      if (err) setError(err);
      setRows(data || []);
    });
  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(() => [...new Set((rows || []).map((s) => s.category).filter(Boolean))], [rows]);

  const save = async () => {
    if (!edit.name?.trim()) return toast("Enter a name.", "bad");
    const dec = (x) => (String(x ?? "").trim() === "" ? null : Math.round(parseFloat(String(x).replace(/[^\d.]/g, "")) * 100) / 100);
    const int = (x) => (String(x ?? "").trim() === "" ? null : parseInt(String(x).replace(/\D/g, ""), 10));
    const payload = {
      name: edit.name.trim(), category: edit.category?.trim() || "General", description: edit.description?.trim() || null,
      base_price: dec(edit.base_price), price_range_min: dec(edit.price_range_min), price_range_max: dec(edit.price_range_max),
      estimated_time_min: int(edit.estimated_time_min), estimated_time_max: int(edit.estimated_time_max),
      is_active: Boolean(edit.is_active), featured: Boolean(edit.featured), display_order: int(edit.display_order) || 0,
    };
    setSaving(true);
    const { error: err } = edit.id ? await supabase.from("services").update(payload).eq("id", edit.id) : await supabase.from("services").insert(payload);
    setSaving(false);
    if (err) return toast(err.message, "bad");
    toast("Service saved");
    setEdit(null);
    load();
  };

  const groups = categories.map((c) => ({ c, items: (rows || []).filter((s) => s.category === c) }));

  return (
    <>
      <PageHeader
        title="Services & pricing"
        description="Your price list. Use “From price list” on a repair order to add these in one click."
        actions={<Button variant="primary" icon={Plus} onClick={() => setEdit(EMPTY)}>Add service</Button>}
      />
      <ErrorBanner error={error} />
      {rows === null ? (
        <Card><SkeletonRows /></Card>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={ClipboardList} title="No services yet" action={<Button variant="primary" icon={Plus} onClick={() => setEdit(EMPTY)}>Add service</Button>} /></Card>
      ) : (
        <div className="space-y-5">
          {groups.map(({ c, items }) => (
            <Card key={c}>
              <div className="px-5 pb-1 pt-4 text-[13px] font-semibold text-a-muted">{c}</div>
              <Table>
                <thead>
                  <tr><Th>Service</Th><Th align="right">Price</Th><Th align="right">Range</Th><Th align="right">Time</Th><Th>Status</Th></tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id} className="cursor-pointer hover:bg-a-hover/50" onClick={() => setEdit(s)}>
                      <Td>
                        <div className="flex items-center gap-2 font-medium">{s.name}{s.featured && <Star className="h-3.5 w-3.5 fill-a-warn text-a-warn" />}</div>
                        {s.description && <div className="max-w-md truncate text-xs text-a-faint">{s.description}</div>}
                      </Td>
                      <Td align="right">{s.base_price != null ? money(s.base_price) : "—"}</Td>
                      <Td align="right" className="text-a-muted">{s.price_range_min != null ? `${money(s.price_range_min)}–${money(s.price_range_max)}` : "—"}</Td>
                      <Td align="right" className="text-a-muted">{s.estimated_time_min ? `${s.estimated_time_min}${s.estimated_time_max ? `–${s.estimated_time_max}` : ""} min` : "—"}</Td>
                      <Td>{s.is_active ? <Badge tone="good" dot>Active</Badge> : <Badge>Hidden</Badge>}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        size="lg"
        title={edit?.id ? "Edit service" : "Add service"}
        footer={
          <>
            {edit?.id && (
              <Button variant="danger" icon={Trash2} className="mr-auto" onClick={async () => {
                if (!(await confirm({ title: `Delete ${edit.name}?`, message: "Past repair orders are not affected.", danger: true, confirmLabel: "Delete" }))) return;
                const { error: err } = await supabase.from("services").delete().eq("id", edit.id);
                if (err) return toast(err.message, "bad");
                setEdit(null);
                load();
              }}>Delete</Button>
            )}
            <Button onClick={() => setEdit(null)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={save}>Save</Button>
          </>
        }
      >
        {edit && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <TextField className="col-span-2" label="Name" required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <TextField className="col-span-2" label="Category" list="svc-cats" value={edit.category || ""} onChange={(e) => setEdit({ ...edit, category: e.target.value })} />
            <datalist id="svc-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            <TextField className="col-span-2 md:col-span-4" as="textarea" rows={2} label="Description" value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            <TextField label="Price" inputMode="decimal" value={edit.base_price ?? ""} onChange={(e) => setEdit({ ...edit, base_price: e.target.value })} />
            <TextField label="Range from" inputMode="decimal" value={edit.price_range_min ?? ""} onChange={(e) => setEdit({ ...edit, price_range_min: e.target.value })} />
            <TextField label="Range to" inputMode="decimal" value={edit.price_range_max ?? ""} onChange={(e) => setEdit({ ...edit, price_range_max: e.target.value })} />
            <TextField label="Sort order" inputMode="numeric" value={edit.display_order ?? 0} onChange={(e) => setEdit({ ...edit, display_order: e.target.value })} />
            <TextField label="Time min (minutes)" inputMode="numeric" value={edit.estimated_time_min ?? ""} onChange={(e) => setEdit({ ...edit, estimated_time_min: e.target.value })} />
            <TextField label="Time max (minutes)" inputMode="numeric" value={edit.estimated_time_max ?? ""} onChange={(e) => setEdit({ ...edit, estimated_time_max: e.target.value })} />
            <div className="col-span-2 flex flex-col justify-end gap-2">
              <Toggle checked={Boolean(edit.is_active)} onChange={(v) => setEdit({ ...edit, is_active: v })} label="Active" />
              <Toggle checked={Boolean(edit.featured)} onChange={(v) => setEdit({ ...edit, featured: v })} label="Featured" />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
