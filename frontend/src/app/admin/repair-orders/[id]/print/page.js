// frontend/src/app/admin/repair-orders/[id]/print/page.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Spinner, ErrorBanner } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/AdminContext";
import RepairOrderDocument, { toDocumentProps } from "@/components/admin/RepairOrderDocument";

export default function PrintRepairOrder({ params }) {
  const { shop } = useAdmin();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const [r, i, p] = await Promise.all([
        supabase.from("repair_orders").select("*, customer:customers(*), vehicle:customer_vehicles(*)").eq("id", params.id).single(),
        supabase.from("repair_order_items").select("*").eq("repair_order_id", params.id).order("position").order("created_at"),
        supabase.from("payments").select("*").eq("repair_order_id", params.id).order("received_at"),
      ]);
      if (r.error) return setError(r.error);
      setData({ ro: r.data, items: i.data || [], payments: p.data || [] });
    })();
  }, [params.id]);

  if (error) return <ErrorBanner error={error} />;
  if (!data) return <div className="flex h-[60vh] items-center justify-center"><Spinner /></div>;

  return (
    <div>
      <div className="no-print mb-5 flex items-center justify-between">
        <Link href={`/admin/repair-orders/${params.id}`} className="inline-flex items-center gap-1 text-sm text-a-muted hover:text-a-text">
          <ArrowLeft className="h-4 w-4" /> Back to RO #{data.ro.number}
        </Link>
        <Button variant="primary" icon={Printer} onClick={() => window.print()}>
          Print / Save PDF
        </Button>
      </div>
      <RepairOrderDocument {...toDocumentProps({ shop, ...data })} />
    </div>
  );
}
