// frontend/src/app/admin/reviews/page.js — customer testimonials
"use client";

import { useEffect, useState } from "react";
import { Plus, Star, Trash2, Check, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { date } from "@/lib/format";
import { Button, Card, PageHeader, Segmented, Modal, TextField, Toggle, EmptyState, SkeletonRows, ErrorBanner, Badge, cx, useUI } from "@/components/admin/ui";

const EMPTY = { customer_name: "", customer_email: "", rating: 5, title: "", message: "", service_received: "", vehicle_info: "", is_approved: true, is_featured: false };

function Stars({ value, onChange, size = "h-4 w-4" }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${n} stars`}>
          <Star className={cx(size, n <= value ? "fill-a-warn text-a-warn" : "text-a-line")} />
        </button>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { toast, confirm } = useUI();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    supabase.from("testimonials").select("*").order("created_at", { ascending: false }).then(({ data, error: err }) => {
      if (err) setError(err);
      setRows(data || []);
    });
  useEffect(() => {
    load();
  }, []);

  const patch = async (r, p, msg) => {
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, ...p } : x)));
    const { error: err } = await supabase.from("testimonials").update(p).eq("id", r.id);
    if (err) {
      toast(err.message, "bad");
      load();
    } else toast(msg);
  };

  const save = async () => {
    if (!edit.customer_name.trim() || !edit.message.trim()) return toast("Name and review text are required.", "bad");
    setSaving(true);
    const payload = { ...edit, customer_email: edit.customer_email?.trim() || "unknown@autoprorepairs.com" };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
    const { error: err } = edit.id ? await supabase.from("testimonials").update(payload).eq("id", edit.id) : await supabase.from("testimonials").insert(payload);
    setSaving(false);
    if (err) return toast(err.message, "bad");
    toast("Review saved");
    setEdit(null);
    load();
  };

  const shown = (rows || []).filter((r) => (filter === "pending" ? !r.is_approved : filter === "published" ? r.is_approved : true));
  const avg = rows?.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0;

  return (
    <>
      <PageHeader
        title="Reviews"
        description={rows?.length ? `${rows.length} reviews · ${avg.toFixed(1)} average` : "Customer testimonials for the website."}
        actions={<Button variant="primary" icon={Plus} onClick={() => setEdit(EMPTY)}>Add review</Button>}
      />
      <ErrorBanner error={error} />
      <Segmented
        className="mb-4"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All" },
          { value: "published", label: "Published" },
          { value: "pending", label: "Hidden", count: (rows || []).filter((r) => !r.is_approved).length },
        ]}
      />
      {rows === null ? (
        <Card><SkeletonRows /></Card>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState icon={Star} title="No reviews yet" description="Paste in great Google or Facebook reviews from happy customers." action={<Button variant="primary" icon={Plus} onClick={() => setEdit(EMPTY)}>Add review</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => (
            <Card key={r.id} className="flex flex-col p-5">
              <div className="flex items-center justify-between">
                <Stars value={r.rating} />
                <div className="flex gap-1.5">
                  {r.is_featured && <Badge tone="warn">Featured</Badge>}
                  {r.is_approved ? <Badge tone="good">Published</Badge> : <Badge>Hidden</Badge>}
                </div>
              </div>
              {r.title && <div className="mt-3 font-semibold">{r.title}</div>}
              <p className="mt-2 line-clamp-5 flex-1 text-sm text-a-muted">“{r.message}”</p>
              <div className="mt-4 text-sm font-medium">{r.customer_name}</div>
              <div className="text-xs text-a-faint">{[r.service_received, r.vehicle_info, date(r.created_at)].filter(Boolean).join(" · ")}</div>
              <div className="mt-4 flex gap-1 border-t border-a-line pt-3">
                <Button size="xs" variant="ghost" icon={r.is_approved ? EyeOff : Check} onClick={() => patch(r, { is_approved: !r.is_approved }, r.is_approved ? "Hidden" : "Published")}>{r.is_approved ? "Hide" : "Publish"}</Button>
                <Button size="xs" variant="ghost" icon={Star} onClick={() => patch(r, { is_featured: !r.is_featured }, r.is_featured ? "Unfeatured" : "Featured")}>{r.is_featured ? "Unfeature" : "Feature"}</Button>
                <Button size="xs" variant="ghost" onClick={() => setEdit(r)}>Edit</Button>
                <Button size="xs" variant="ghost" icon={Trash2} className="ml-auto" aria-label="Delete" onClick={async () => {
                  if (!(await confirm({ title: "Delete this review?", danger: true, confirmLabel: "Delete" }))) return;
                  await supabase.from("testimonials").delete().eq("id", r.id);
                  load();
                }} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        title={edit?.id ? "Edit review" : "Add review"}
        size="lg"
        footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save</Button></>}
      >
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Stars value={edit.rating} onChange={(n) => setEdit({ ...edit, rating: n })} size="h-6 w-6" /></div>
            <TextField label="Customer name" required value={edit.customer_name} onChange={(e) => setEdit({ ...edit, customer_name: e.target.value })} placeholder="Jessica R." />
            <TextField label="Email (private)" value={edit.customer_email || ""} onChange={(e) => setEdit({ ...edit, customer_email: e.target.value })} />
            <TextField className="col-span-2" label="Headline" value={edit.title || ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            <TextField className="col-span-2" as="textarea" rows={4} label="Review" required value={edit.message} onChange={(e) => setEdit({ ...edit, message: e.target.value })} />
            <TextField label="Service" value={edit.service_received || ""} onChange={(e) => setEdit({ ...edit, service_received: e.target.value })} />
            <TextField label="Vehicle" value={edit.vehicle_info || ""} onChange={(e) => setEdit({ ...edit, vehicle_info: e.target.value })} />
            <Toggle checked={edit.is_approved} onChange={(v) => setEdit({ ...edit, is_approved: v })} label="Published" />
            <Toggle checked={edit.is_featured} onChange={(v) => setEdit({ ...edit, is_featured: v })} label="Featured" />
          </div>
        )}
      </Modal>
    </>
  );
}
