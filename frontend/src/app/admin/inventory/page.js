// frontend/src/app/admin/inventory/page.js — cars for sale
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, CarFront, Search, Eye, Star, ExternalLink, ImageOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { normalizeImages } from "@/lib/vehicleImages";
import { money0, num, relative } from "@/lib/format";
import { localVehicles } from "@/data/localInventory";
import { Button, Card, PageHeader, Segmented, Badge, EmptyState, Skeleton, Input, ErrorBanner, cx, useUI } from "@/components/admin/ui";

const STATUS_TONE = { available: "good", pending: "warn", reserved: "info", sold: "neutral" };

export default function InventoryPage() {
  const { toast } = useUI();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("active");
  const [q, setQ] = useState("");

  const load = () =>
    supabase
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err);
        setRows(data || []);
      });

  useEffect(() => {
    load();
  }, []);

  const dbStock = new Set((rows || []).map((v) => v.stock_number));
  const codeListed = localVehicles.filter((v) => !dbStock.has(v.stock_number));

  const shown = useMemo(() => {
    let r = rows || [];
    if (filter === "active") r = r.filter((v) => v.is_active !== false && v.status !== "sold");
    else if (filter === "sold") r = r.filter((v) => v.status === "sold");
    else if (filter === "hidden") r = r.filter((v) => v.is_active === false);
    const t = q.trim().toLowerCase();
    if (t) r = r.filter((v) => `${v.year} ${v.make} ${v.model} ${v.trim || ""} ${v.stock_number || ""} ${v.vin || ""}`.toLowerCase().includes(t));
    return r;
  }, [rows, filter, q]);

  const quick = async (v, patch, msg) => {
    setRows((rs) => rs.map((x) => (x.id === v.id ? { ...x, ...patch } : x)));
    const { error: err } = await supabase.from("vehicles").update(patch).eq("id", v.id);
    if (err) {
      toast(err.message, "bad");
      load();
    } else toast(msg);
  };

  const all = rows || [];
  const counts = {
    active: all.filter((v) => v.is_active !== false && v.status !== "sold").length,
    sold: all.filter((v) => v.status === "sold").length,
    hidden: all.filter((v) => v.is_active === false).length,
    all: all.length,
  };
  const listedValue = all.filter((v) => v.is_active !== false && v.status === "available").reduce((s, v) => s + Number(v.sale_price || v.price || 0), 0);

  return (
    <>
      <PageHeader
        title="Cars for sale"
        description={rows ? `${counts.active} on the lot · ${money0(listedValue)} listed` : " "}
        actions={
          <>
            <Button icon={ExternalLink} href="/inventory" target="_blank">View on website</Button>
            <Button variant="primary" icon={Plus} href="/admin/inventory/new">List a vehicle</Button>
          </>
        }
      />
      <ErrorBanner error={error} />

      {codeListed.length > 0 && (
        <div className="mb-4 rounded-lg border border-a-info/30 bg-a-info/10 px-4 py-3 text-sm text-a-info">
          {codeListed.map((v) => `${v.year} ${v.make} ${v.model}`).join(", ")} {codeListed.length === 1 ? "is" : "are"} listed in the website code
          (src/data/localInventory.js), not here. Add it with stock # <span className="font-mono">{codeListed[0].stock_number}</span> to manage it from the admin; the code copy is then hidden automatically.
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "active", label: "On the lot", count: counts.active },
            { value: "sold", label: "Sold", count: counts.sold },
            { value: "hidden", label: "Hidden", count: counts.hidden },
            { value: "all", label: "All", count: counts.all },
          ]}
        />
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-a-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search year, make, stock #…" className="pl-9" />
        </div>
      </div>

      {rows === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}</div>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState icon={CarFront} title="No vehicles here" action={<Button variant="primary" icon={Plus} href="/admin/inventory/new">List a vehicle</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((v) => {
            const img = normalizeImages(v)[0];
            const price = Number(v.sale_price || v.price || 0);
            return (
              <Card key={v.id} className={cx("overflow-hidden", v.is_active === false && "opacity-60")}>
                <Link href={`/admin/inventory/${v.id}`} className="block">
                  <div className="relative aspect-[16/10] bg-a-raised">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img.url} alt={img.alt} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-a-faint">
                        <ImageOff className="h-7 w-7" />
                        <span className="text-xs">No photos — add some</span>
                      </div>
                    )}
                    <div className="absolute left-3 top-3 flex gap-1.5">
                      <Badge tone={STATUS_TONE[v.status] || "neutral"} className="bg-a-panel/90 backdrop-blur">{v.status}</Badge>
                      {v.featured && <Badge tone="warn" className="bg-a-panel/90 backdrop-blur"><Star className="h-3 w-3" /> Featured</Badge>}
                      {v.is_active === false && <Badge className="bg-a-panel/90">Hidden</Badge>}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{v.year} {v.make} {v.model}</div>
                        <div className="truncate text-xs text-a-faint">{[v.trim, v.stock_number && `Stock ${v.stock_number}`].filter(Boolean).join(" · ")}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-lg font-semibold tnum">{money0(price)}</div>
                        {v.sale_price && v.price && Number(v.sale_price) < Number(v.price) && <div className="text-xs text-a-faint line-through">{money0(v.price)}</div>}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-a-faint">
                      <span>{num(v.mileage)} mi</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{num(v.views)} views</span>
                      <span className="ml-auto">{relative(v.created_at)}</span>
                    </div>
                  </div>
                </Link>
                <div className="flex gap-1 border-t border-a-line p-2">
                  {v.status !== "sold" ? (
                    <Button size="xs" variant="ghost" onClick={() => quick(v, { status: "sold", sold_date: new Date().toISOString().slice(0, 10) }, "Marked sold")}>Mark sold</Button>
                  ) : (
                    <Button size="xs" variant="ghost" onClick={() => quick(v, { status: "available", sold_date: null }, "Back on the lot")}>Relist</Button>
                  )}
                  <Button size="xs" variant="ghost" onClick={() => quick(v, { featured: !v.featured }, v.featured ? "Unfeatured" : "Featured on homepage")}>
                    {v.featured ? "Unfeature" : "Feature"}
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => quick(v, { is_active: v.is_active === false }, v.is_active === false ? "Visible on website" : "Hidden from website")}>
                    {v.is_active === false ? "Show" : "Hide"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
