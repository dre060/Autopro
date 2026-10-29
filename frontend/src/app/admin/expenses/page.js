// frontend/src/app/admin/expenses/page.js — expenses, bills to pay, vendors, receipt snapping
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Camera, Plus, Wallet, Search, Trash2, Receipt, AlertTriangle, CheckCircle2, Store, Loader2, Sparkles, Ban, FileImage, Repeat,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { money, money0, date as fmtDate, isoDay } from "@/lib/format";
import { r2, n0, EXPENSE_CATEGORIES, categoryByKey, USE_TAX_CODES, PAID_FROM, rateOn } from "@/lib/books";
import {
  Button, Card, CardHeader, PageHeader, Segmented, Table, Th, Td, Input, Select, Modal, TextField, Field, Stat, EmptyState,
  SkeletonRows, ErrorBanner, Badge, IconButton, Toggle, cx, useUI,
} from "@/components/admin/ui";
import { adminFetch, useAdmin } from "@/components/admin/AdminContext";
import {
  useAccounts, useRates, AccountSelect, resizeImage, blobToBase64, uploadDocument, signedUrl, ExportButtons, presetRange, RANGE_PRESETS,
} from "@/components/admin/booksKit";

const today = () => isoDay();
const blankLine = (account_id = null) => ({ key: crypto.randomUUID(), account_id, description: "", amount: "", part_id: null, quantity: "", use_taxable: false });

function blankExpense(acct) {
  return {
    kind: "expense", vendor_id: null, vendor_name: "", ref_number: "", expense_date: today(), due_date: "",
    status: "paid", paid_at: today(), paid_from_account_id: acct("1010")?.id || null, payment_method: "card", memo: "",
    receipt_path: null, ocr: null, tax_charged: "", use_tax: false, recurrence: "", lines: [blankLine()],
  };
}

function ExpensesInner() {
  const params = useSearchParams();
  const { toast, confirm } = useUI();
  const { isOwner, books, refreshCounts } = useAdmin();
  const { accounts, byCode, byId } = useAccounts();
  const rates = useRates();
  const fileRef = useRef(null);

  const [tab, setTab] = useState(params.get("tab") || "expenses");
  const [range, setRange] = useState("this_month");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [parts, setParts] = useState([]);
  const [error, setError] = useState(null);
  const [edit, setEdit] = useState(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [vendorEdit, setVendorEdit] = useState(null);
  const [ocrReady, setOcrReady] = useState(null);

  const { from, to } = presetRange(range);

  const load = async () => {
    const [ex, vs, ps] = await Promise.all([
      supabase.from("expenses").select("*, vendor:vendors(name), lines:expense_lines(*)")
        .or(`and(expense_date.gte.${from},expense_date.lte.${to}),and(status.eq.unpaid,voided_at.is.null)`)
        .order("expense_date", { ascending: false }).limit(500),
      supabase.from("vendors").select("*").eq("active", true).order("name"),
      supabase.from("parts").select("id, name, part_number, unit_cost").eq("active", true).order("name"),
    ]);
    if (ex.error) setError(ex.error);
    setRows(ex.data || []);
    setVendors(vs.data || []);
    setParts(ps.data || []);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);
  useEffect(() => {
    adminFetch("/api/admin/receipt").then((r) => setOcrReady(r.configured)).catch(() => setOcrReady(false));
  }, []);
  useEffect(() => {
    if (accounts && params.get("snap") === "1") fileRef.current?.click();
    if (accounts && params.get("new") === "1") setEdit(blankExpense(byCode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  // ------------------------------------------------------------ derived
  const inRange = (e) => e.expense_date >= from && e.expense_date <= to;
  const live = (rows || []).filter((e) => !e.voided_at);
  const unpaid = live.filter((e) => e.status === "unpaid").sort((a, b) => (a.due_date || "9") < (b.due_date || "9") ? -1 : 1);
  const weekOut = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const dueSoon = unpaid.filter((e) => e.due_date && e.due_date <= weekOut);
  const spent = live.filter(inRange).reduce((s, e) => s + Number(e.total), 0);
  const useTax = live.filter(inRange).reduce((s, e) => s + Number(e.use_tax_amount), 0);

  const shown = useMemo(() => {
    let r = tab === "bills" ? unpaid : (rows || []).filter(inRange);
    const t = q.trim().toLowerCase();
    if (t) r = r.filter((e) => `${e.vendor_name || ""} ${e.vendor?.name || ""} ${e.memo || ""} ${e.ref_number || ""} ${e.lines.map((l) => l.description).join(" ")}`.toLowerCase().includes(t));
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, tab, q, from, to]);

  const catLabel = (e) => {
    const names = [...new Set(e.lines.map((l) => byId(l.account_id)?.name).filter(Boolean))];
    return names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0] || "—";
  };

  // ------------------------------------------------------------ snap a receipt
  const onFile = async (file) => {
    if (!file) return;
    const base = blankExpense(byCode);
    setEdit(base);
    setReading(true);
    try {
      const { blob, type } = await resizeImage(file);
      setPreview(URL.createObjectURL(blob));
      const path = await uploadDocument(blob, "receipts", type === "image/jpeg" ? "jpg" : (type.split("/")[1] || "jpg"), type);
      setEdit((e) => ({ ...e, receipt_path: path }));
      if (!ocrReady) return;
      const { data } = await adminFetch("/api/admin/receipt", { image: await blobToBase64(blob), mediaType: type });
      if (!data?.is_receipt) {
        toast("That doesn't look like a receipt — fill it in by hand.", "warn");
        return;
      }
      const cat = categoryByKey(data.category);
      const acct = byCode(cat.code);
      const vendor = vendors.find((v) => v.name.toLowerCase() === String(data.vendor || "").toLowerCase());
      const total = n0(data.total);
      const tax = n0(data.tax);
      setEdit((e) => ({
        ...e,
        ocr: data,
        vendor_id: vendor?.id || null,
        vendor_name: vendor?.name || data.vendor || "",
        expense_date: data.date || e.expense_date,
        paid_at: data.date || e.paid_at,
        tax_charged: tax ? String(tax) : "",
        memo: data.notes || "",
        use_tax: !tax && USE_TAX_CODES.has(cat.code),
        lines: [{ ...blankLine(acct?.id || vendor?.default_account_id || null), description: (data.line_items || []).slice(0, 3).map((l) => l.description).join(", "), amount: total ? String(total) : "", use_taxable: !tax && USE_TAX_CODES.has(cat.code) }],
      }));
    } catch (err) {
      toast(err.message || "Couldn't read the receipt", "bad");
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ------------------------------------------------------------ expense editing
  const lineTotal = edit ? r2(edit.lines.reduce((s, l) => s + n0(l.amount), 0)) : 0;
  const useBase = edit && edit.use_tax ? r2(edit.lines.filter((l) => l.use_taxable).reduce((s, l) => s + n0(l.amount), 0)) : 0;
  const useRate = rates ? Number(rateOn(rates, "fl_state_rate", edit?.expense_date || today()) || 0.06) + Number(rateOn(rates, "surtax", edit?.expense_date || today(), books.shop_county || "Lake") || 0) : 0.07;
  const useAmount = r2(useBase * useRate);

  const openExisting = async (e) => {
    setPreview(e.receipt_path ? await signedUrl(e.receipt_path) : null);
    setEdit({
      ...e,
      vendor_name: e.vendor_name || e.vendor?.name || "",
      due_date: e.due_date || "",
      tax_charged: Number(e.tax_charged) ? String(e.tax_charged) : "",
      use_tax: Number(e.use_tax_amount) > 0,
      recurrence: e.recurrence || "",
      lines: e.lines.sort((a, b) => a.position - b.position).map((l) => ({ ...l, key: l.id, amount: String(l.amount), quantity: l.quantity ?? "" })),
    });
  };

  const setLine = (key, patch) => setEdit((e) => ({ ...e, lines: e.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }));

  const save = async () => {
    const lines = edit.lines.filter((l) => n0(l.amount) !== 0);
    if (!lines.length) return toast("Enter an amount.", "bad");
    if (lines.some((l) => !l.account_id)) return toast("Pick a category for every line.", "bad");
    if (!edit.vendor_name.trim() && !edit.vendor_id) return toast("Who did you pay?", "bad");
    setSaving(true);
    try {
      let vendorId = edit.vendor_id;
      const name = edit.vendor_name.trim();
      const match = vendors.find((v) => v.name.toLowerCase() === name.toLowerCase());
      if (match) vendorId = match.id;
      else if (name) {
        const { data: v, error: ve } = await supabase.from("vendors").insert({ name, default_account_id: lines[0].account_id }).select().single();
        if (ve) throw ve;
        vendorId = v.id;
      }
      const payload = {
        kind: edit.status === "unpaid" ? "bill" : edit.kind,
        vendor_id: vendorId, vendor_name: name || null, ref_number: edit.ref_number?.trim() || null,
        expense_date: edit.expense_date, due_date: edit.due_date || null, total: r2(lines.reduce((s, l) => s + n0(l.amount), 0)),
        tax_charged: n0(edit.tax_charged), use_tax_base: edit.use_tax ? useBase : 0, use_tax_amount: edit.use_tax ? useAmount : 0,
        status: edit.status, paid_at: edit.status === "paid" ? edit.paid_at || edit.expense_date : null,
        paid_from_account_id: edit.paid_from_account_id, payment_method: edit.payment_method || null, memo: edit.memo?.trim() || null,
        receipt_path: edit.receipt_path, ocr: edit.ocr || null, recurrence: edit.recurrence || null,
        next_run_on: edit.recurrence ? edit.next_run_on || nextDate(edit.expense_date, edit.recurrence) : null,
      };
      let id = edit.id;
      if (id) {
        const { error: e1 } = await supabase.from("expenses").update(payload).eq("id", id);
        if (e1) throw e1;
        const { error: e2 } = await supabase.from("expense_lines").delete().eq("expense_id", id);
        if (e2) throw e2;
      } else {
        const { data, error: e1 } = await supabase.from("expenses").insert(payload).select("id").single();
        if (e1) throw e1;
        id = data.id;
      }
      const { error: e3 } = await supabase.from("expense_lines").insert(
        lines.map((l, i) => ({
          expense_id: id, account_id: l.account_id, description: l.description?.trim() || null, amount: r2(n0(l.amount)),
          part_id: l.part_id || null, quantity: l.part_id ? n0(l.quantity) || 1 : null, use_taxable: edit.use_tax && l.use_taxable, position: i,
        }))
      );
      if (e3) throw e3;
      if (edit.receipt_path && !edit.id) {
        await supabase.from("documents").insert({ entity_type: "expense", entity_id: id, kind: "receipt", path: edit.receipt_path, file_name: "receipt.jpg", mime_type: "image/jpeg" });
      }
      toast(edit.id ? "Saved" : edit.status === "unpaid" ? "Bill added" : "Expense saved");
      setEdit(null);
      setPreview(null);
      load();
      refreshCounts();
    } catch (err) {
      toast(err.message, "bad");
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (e) => {
    const { error: err } = await supabase.from("expenses").update({ status: "paid", paid_at: today(), paid_from_account_id: e.paid_from_account_id || byCode("1010")?.id }).eq("id", e.id);
    if (err) return toast(err.message, "bad");
    toast("Marked paid");
    load();
    refreshCounts();
  };

  const voidExpense = async () => {
    if (!(await confirm({ title: "Void this expense?", message: "It stays on file but no longer counts in your books. A reversing entry is posted today.", danger: true, confirmLabel: "Void" }))) return;
    const { error: err } = await supabase.from("expenses").update({ voided_at: new Date().toISOString(), recurrence: null }).eq("id", edit.id);
    if (err) return toast(err.message, "bad");
    setEdit(null);
    load();
  };

  // ------------------------------------------------------------ vendors
  const vendorPaidYtd = useMemo(() => {
    const m = {};
    live.filter((e) => e.status === "paid" && (e.paid_at || "").startsWith(String(new Date().getFullYear()))).forEach((e) => {
      if (e.vendor_id) m[e.vendor_id] = (m[e.vendor_id] || 0) + Number(e.total);
    });
    return m;
  }, [live]);

  const saveVendor = async () => {
    const v = vendorEdit;
    if (!v.name?.trim()) return toast("Enter a name", "bad");
    const t = (x) => (String(x ?? "").trim() || null);
    const payload = {
      name: v.name.trim(), contact_name: t(v.contact_name), email: t(v.email), phone: t(v.phone), address_street: t(v.address_street),
      address_city: t(v.address_city), address_state: t(v.address_state), address_zip: t(v.address_zip), is_1099: Boolean(v.is_1099),
      w9_on_file: Boolean(v.w9_on_file), default_account_id: v.default_account_id || null, charges_tax_on_resale: Boolean(v.charges_tax_on_resale), notes: t(v.notes),
    };
    const res = v.id ? await supabase.from("vendors").update(payload).eq("id", v.id).select().single() : await supabase.from("vendors").insert(payload).select().single();
    if (res.error) return toast(res.error.message, "bad");
    if (isOwner && v.tin !== undefined && v.tin !== v._tin) {
      const { error: te } = await supabase.from("tax_ids").upsert({ party_type: "vendor", party_id: res.data.id, tin: t(v.tin), tin_type: v.tin_type || "EIN", legal_name: t(v.legal_name) || payload.name }, { onConflict: "party_type,party_id" });
      if (te) return toast(te.message, "bad");
    }
    toast("Vendor saved");
    setVendorEdit(null);
    load();
  };
  const openVendor = async (v) => {
    let tin = {};
    if (isOwner && v.id) {
      const { data } = await supabase.from("tax_ids").select("tin, tin_type, legal_name").eq("party_type", "vendor").eq("party_id", v.id).maybeSingle();
      tin = { tin: data?.tin || "", _tin: data?.tin || "", tin_type: data?.tin_type || "EIN", legal_name: data?.legal_name || "" };
    }
    setVendorEdit({ ...v, ...tin });
  };

  const csvCols = [
    { label: "Date", value: "expense_date" }, { label: "Vendor", value: (e) => e.vendor_name || e.vendor?.name || "" },
    { label: "Category", value: (e) => catLabel(e) }, { label: "Ref #", value: "ref_number" }, { label: "Total", value: "total" },
    { label: "Sales tax charged", value: "tax_charged" }, { label: "Use tax owed", value: "use_tax_amount" }, { label: "Status", value: (e) => (e.voided_at ? "void" : e.status) },
    { label: "Due", value: "due_date" }, { label: "Paid", value: "paid_at" }, { label: "Memo", value: "memo" },
  ];

  return (
    <>
      <PageHeader
        title="Expenses & bills"
        description="Snap a receipt and Claude reads the vendor, date, total and tax. You confirm with one tap."
        actions={
          <>
            <Button icon={Plus} onClick={() => setEdit({ ...blankExpense(byCode), status: "unpaid", kind: "bill", due_date: today() })}>Add bill</Button>
            <Button icon={Plus} onClick={() => setEdit(blankExpense(byCode))}>Add expense</Button>
            <Button variant="primary" icon={Camera} onClick={() => fileRef.current?.click()}>Snap receipt</Button>
          </>
        }
      />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <ErrorBanner error={error} />
      {ocrReady === false && (
        <div className="mb-4 rounded-lg border border-a-warn/30 bg-a-warn/10 px-4 py-2.5 text-[13px] text-a-warn">
          Automatic receipt reading needs an <code>ANTHROPIC_API_KEY</code> in Vercel. Photos still save; you type the details.
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Spent · ${RANGE_PRESETS.find((r) => r.value === range)?.label}`} value={money0(spent)} icon={Wallet} />
        <Stat label="Unpaid bills" value={money0(unpaid.reduce((s, e) => s + Number(e.total), 0))} sub={`${unpaid.length} bill${unpaid.length === 1 ? "" : "s"}`} icon={Receipt} tone="warn" />
        <Stat label="Due in 7 days" value={money0(dueSoon.reduce((s, e) => s + Number(e.total), 0))} sub={dueSoon.length ? `${dueSoon.length} to pay` : "Nothing due"} icon={AlertTriangle} tone={dueSoon.length ? "bad" : "good"} />
        <Stat label="Use tax owed" value={money(useTax)} sub="Added to this period's DR-15" icon={Sparkles} tone="violet" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-a-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <Segmented value={tab} onChange={setTab} options={[
            { value: "expenses", label: "Expenses" },
            { value: "bills", label: "Bills to pay", count: unpaid.length },
            { value: "vendors", label: "Vendors", count: vendors.length },
          ]} />
          {tab !== "vendors" ? (
            <div className="flex flex-wrap items-center gap-2">
              {tab === "expenses" && (
                <Select value={range} onChange={(e) => setRange(e.target.value)} className="w-40">
                  {RANGE_PRESETS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </Select>
              )}
              <div className="relative sm:w-60">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-a-faint" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9" />
              </div>
              <ExportButtons filename={`expenses-${from}-to-${to}`} rows={shown} columns={csvCols} />
            </div>
          ) : (
            <Button size="sm" icon={Plus} onClick={() => setVendorEdit({ name: "", is_1099: false })}>Add vendor</Button>
          )}
        </div>

        {rows === null ? (
          <SkeletonRows />
        ) : tab === "vendors" ? (
          vendors.length === 0 ? (
            <EmptyState icon={Store} title="No vendors yet" description="Vendors are added automatically when you save an expense." />
          ) : (
            <Table>
              <thead><tr><Th>Vendor</Th><Th>Default category</Th><Th>1099</Th><Th align="right">Paid this year</Th></tr></thead>
              <tbody>
                {vendors.map((v) => {
                  const ytd = vendorPaidYtd[v.id] || 0;
                  return (
                    <tr key={v.id} className="cursor-pointer hover:bg-a-hover/50" onClick={() => openVendor(v)}>
                      <Td><div className="font-medium">{v.name}</div><div className="text-xs text-a-faint">{[v.phone, v.email].filter(Boolean).join(" · ")}</div></Td>
                      <Td className="text-a-muted">{byId(v.default_account_id)?.name || "—"}</Td>
                      <Td>{v.is_1099 ? <Badge tone={v.w9_on_file ? "good" : "warn"}>{v.w9_on_file ? "1099 · W-9 on file" : "1099 · need W-9"}</Badge> : <span className="text-a-faint">—</span>}</Td>
                      <Td align="right">{money(ytd)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )
        ) : shown.length === 0 ? (
          <EmptyState icon={tab === "bills" ? CheckCircle2 : Receipt} title={tab === "bills" ? "No unpaid bills" : "No expenses in this range"} description={tab === "bills" ? "Bills you add with a due date show up here." : "Snap a receipt from your phone to add one in seconds."} action={tab !== "bills" && <Button variant="primary" icon={Camera} onClick={() => fileRef.current?.click()}>Snap receipt</Button>} />
        ) : (
          <Table>
            <thead><tr><Th>Date</Th><Th>Vendor</Th><Th className="hidden md:table-cell">Category</Th><Th>Status</Th><Th align="right">Total</Th><Th /></tr></thead>
            <tbody>
              {shown.map((e) => {
                const overdue = e.status === "unpaid" && e.due_date && e.due_date < today();
                return (
                  <tr key={e.id} className={cx("cursor-pointer hover:bg-a-hover/50", e.voided_at && "opacity-50")} onClick={() => openExisting(e)}>
                    <Td className="whitespace-nowrap text-a-muted">{fmtDate(e.expense_date)}</Td>
                    <Td>
                      <div className="flex items-center gap-1.5 font-medium">
                        {e.vendor_name || e.vendor?.name || "—"}
                        {e.receipt_path && <FileImage className="h-3.5 w-3.5 text-a-faint" />}
                        {e.recurrence && <Repeat className="h-3.5 w-3.5 text-a-faint" />}
                      </div>
                      {e.memo && <div className="max-w-[260px] truncate text-xs text-a-faint">{e.memo}</div>}
                    </Td>
                    <Td className="hidden text-a-muted md:table-cell">{catLabel(e)}</Td>
                    <Td>
                      {e.voided_at ? <Badge>Void</Badge> : e.status === "paid" ? <Badge tone="good" dot>Paid</Badge> : <Badge tone={overdue ? "bad" : "warn"} dot>{overdue ? "Overdue" : e.due_date ? `Due ${fmtDate(e.due_date, { month: "short", day: "numeric" })}` : "Unpaid"}</Badge>}
                      {Number(e.use_tax_amount) > 0 && <Badge tone="violet" className="ml-1">Use tax</Badge>}
                    </Td>
                    <Td align="right" className="font-medium">{money(e.total)}</Td>
                    <Td align="right" onClick={(ev) => ev.stopPropagation()}>
                      {e.status === "unpaid" && !e.voided_at && <Button size="xs" variant="success" onClick={() => markPaid(e)}>Mark paid</Button>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {/* --------------------------------------------------- expense modal */}
      <Modal
        open={Boolean(edit)}
        onClose={() => { setEdit(null); setPreview(null); }}
        size="xl"
        title={edit?.id ? (edit.status === "unpaid" ? "Bill" : "Expense") : edit?.status === "unpaid" ? "New bill" : "New expense"}
        description={reading ? undefined : edit?.ocr ? "Read from your receipt — check it and save." : undefined}
        footer={
          <>
            {edit?.id && !edit.voided_at && <Button variant="danger" icon={Ban} className="mr-auto" onClick={voidExpense}>Void</Button>}
            <Button onClick={() => { setEdit(null); setPreview(null); }}>Cancel</Button>
            <Button variant="primary" loading={saving} disabled={reading || edit?.voided_at} onClick={save}>{edit?.status === "unpaid" ? "Save bill" : "Save expense"}</Button>
          </>
        }
      >
        {edit && (
          <div className="grid gap-5 md:grid-cols-[1fr_220px]">
            <div className="space-y-4">
              {reading && (
                <div className="flex items-center gap-2 rounded-lg border border-a-accent/30 bg-a-accent/10 px-3 py-2 text-sm text-a-accent">
                  <Loader2 className="h-4 w-4 animate-spin" /> Reading your receipt…
                </div>
              )}
              <Segmented value={edit.status} onChange={(v) => setEdit({ ...edit, status: v, due_date: v === "unpaid" ? edit.due_date || today() : edit.due_date })}
                options={[{ value: "paid", label: "Paid already" }, { value: "unpaid", label: "Bill — pay later" }]} />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Field label="Vendor" required className="col-span-2">
                  {(id) => (
                    <>
                      <Input id={id} list="vendor-list" value={edit.vendor_name} onChange={(e) => {
                        const v = vendors.find((x) => x.name.toLowerCase() === e.target.value.toLowerCase());
                        setEdit((x) => ({ ...x, vendor_name: e.target.value, vendor_id: v?.id || null, lines: v?.default_account_id && x.lines.length === 1 && !x.lines[0].account_id ? [{ ...x.lines[0], account_id: v.default_account_id }] : x.lines }));
                      }} placeholder="NAPA, AutoZone, FPL…" />
                      <datalist id="vendor-list">{vendors.map((v) => <option key={v.id} value={v.name} />)}</datalist>
                    </>
                  )}
                </Field>
                <TextField label="Date" type="date" value={edit.expense_date} onChange={(e) => setEdit({ ...edit, expense_date: e.target.value })} />
                {edit.status === "unpaid" ? (
                  <TextField label="Due date" type="date" value={edit.due_date} onChange={(e) => setEdit({ ...edit, due_date: e.target.value })} />
                ) : (
                  <TextField label="Paid on" type="date" value={edit.paid_at || edit.expense_date} onChange={(e) => setEdit({ ...edit, paid_at: e.target.value })} />
                )}
                <TextField as="select" label={edit.status === "unpaid" ? "Will pay from" : "Paid from"} value={byId(edit.paid_from_account_id)?.code || "1010"} onChange={(e) => setEdit({ ...edit, paid_from_account_id: byCode(e.target.value)?.id })}>
                  {PAID_FROM.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
                </TextField>
                <TextField label="Invoice / ref #" value={edit.ref_number || ""} onChange={(e) => setEdit({ ...edit, ref_number: e.target.value })} />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-a-muted">What was it for?</span>
                  <Button size="xs" variant="ghost" icon={Plus} onClick={() => setEdit({ ...edit, lines: [...edit.lines, blankLine()] })}>Split</Button>
                </div>
                <div className="space-y-2">
                  {edit.lines.map((l) => {
                    const code = byId(l.account_id)?.code;
                    return (
                      <div key={l.key} className="rounded-lg border border-a-line p-2.5">
                        <div className="grid grid-cols-[1fr_110px_auto] gap-2">
                          <Select value={code || ""} onChange={(e) => {
                            const c = e.target.value;
                            setLine(l.key, { account_id: byCode(c)?.id || null, use_taxable: USE_TAX_CODES.has(c) && !n0(edit.tax_charged) });
                          }}>
                            <option value="">Category…</option>
                            {EXPENSE_CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                          </Select>
                          <Input inputMode="decimal" placeholder="0.00" value={l.amount} onChange={(e) => setLine(l.key, { amount: e.target.value })} className="text-right" />
                          <IconButton icon={Trash2} label="Remove line" disabled={edit.lines.length === 1} onClick={() => setEdit({ ...edit, lines: edit.lines.filter((x) => x.key !== l.key) })} />
                        </div>
                        <Input className="mt-2" placeholder="Description (optional)" value={l.description || ""} onChange={(e) => setLine(l.key, { description: e.target.value })} />
                        {code === "1200" && (
                          <div className="mt-2 grid grid-cols-[1fr_90px] gap-2">
                            <Select value={l.part_id || ""} onChange={(e) => setLine(l.key, { part_id: e.target.value || null })}>
                              <option value="">Which part? (adds to stock)</option>
                              {parts.map((p) => <option key={p.id} value={p.id}>{p.name}{p.part_number ? ` · ${p.part_number}` : ""}</option>)}
                            </Select>
                            <Input inputMode="decimal" placeholder="Qty" value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value })} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-right text-sm">Total <span className="ml-2 font-display text-lg font-semibold tnum">{money(lineTotal)}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TextField label="Sales tax on the receipt" inputMode="decimal" value={edit.tax_charged} onChange={(e) => setEdit({ ...edit, tax_charged: e.target.value })} hint="Included in the total above." />
                <TextField as="select" label="Repeats" value={edit.recurrence || ""} onChange={(e) => setEdit({ ...edit, recurrence: e.target.value })} hint={edit.recurrence ? "A new bill is created automatically." : undefined}>
                  <option value="">Doesn't repeat</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
                </TextField>
              </div>

              <div className="rounded-lg border border-a-line p-3">
                <Toggle
                  checked={edit.use_tax}
                  onChange={(v) => setEdit({ ...edit, use_tax: v, lines: edit.lines.map((l) => ({ ...l, use_taxable: v && USE_TAX_CODES.has(byId(l.account_id)?.code) })) })}
                  label="No Florida sales tax was charged (owe use tax)"
                  description="For tools, equipment and supplies the shop uses itself, bought online or out of state without FL tax."
                />
                {edit.use_tax && (
                  <p className="mt-2 text-sm text-a-violet">
                    Use tax {money(useAmount)} on {money(useBase)} ({(useRate * 100).toFixed(1)}%) goes on this period's DR-15.
                  </p>
                )}
                {!edit.use_tax && n0(edit.tax_charged) > 0 && byId(edit.lines[0]?.account_id)?.code === "1200" && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-a-warn"><AlertTriangle className="mt-px h-3.5 w-3.5" />Parts bought for resale should be tax-free with your resale certificate. Ask this vendor to put it on file.</p>
                )}
              </div>
              <TextField as="textarea" rows={2} label="Notes" value={edit.memo || ""} onChange={(e) => setEdit({ ...edit, memo: e.target.value })} />
            </div>

            <div>
              <div className="text-[12.5px] font-medium text-a-muted">Receipt</div>
              {preview ? (
                <a href={preview} target="_blank" rel="noreferrer" className="mt-1.5 block overflow-hidden rounded-lg border border-a-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Receipt" className="max-h-[420px] w-full object-contain bg-white" />
                </a>
              ) : (
                <button onClick={() => fileRef.current?.click()} className="mt-1.5 flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-a-line text-sm text-a-faint hover:text-a-muted">
                  <Camera className="h-6 w-6" /> Add a photo
                </button>
              )}
              {edit.ocr?.payment_method && <p className="mt-2 text-xs text-a-faint">Paid with {edit.ocr.payment_method}</p>}
            </div>
          </div>
        )}
      </Modal>

      {/* --------------------------------------------------- vendor modal */}
      <Modal
        open={Boolean(vendorEdit)}
        onClose={() => setVendorEdit(null)}
        size="lg"
        title={vendorEdit?.id ? vendorEdit.name : "Add vendor"}
        footer={<><Button onClick={() => setVendorEdit(null)}>Cancel</Button><Button variant="primary" onClick={saveVendor}>Save vendor</Button></>}
      >
        {vendorEdit && (
          <div className="grid grid-cols-2 gap-3">
            <TextField className="col-span-2" label="Name" required value={vendorEdit.name || ""} onChange={(e) => setVendorEdit({ ...vendorEdit, name: e.target.value })} />
            <TextField label="Contact" value={vendorEdit.contact_name || ""} onChange={(e) => setVendorEdit({ ...vendorEdit, contact_name: e.target.value })} />
            <TextField label="Phone" value={vendorEdit.phone || ""} onChange={(e) => setVendorEdit({ ...vendorEdit, phone: e.target.value })} />
            <TextField className="col-span-2" label="Email" value={vendorEdit.email || ""} onChange={(e) => setVendorEdit({ ...vendorEdit, email: e.target.value })} />
            <TextField className="col-span-2" label="Street" value={vendorEdit.address_street || ""} onChange={(e) => setVendorEdit({ ...vendorEdit, address_street: e.target.value })} />
            <TextField label="City" value={vendorEdit.address_city || ""} onChange={(e) => setVendorEdit({ ...vendorEdit, address_city: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="State" value={vendorEdit.address_state || ""} onChange={(e) => setVendorEdit({ ...vendorEdit, address_state: e.target.value })} />
              <TextField label="ZIP" value={vendorEdit.address_zip || ""} onChange={(e) => setVendorEdit({ ...vendorEdit, address_zip: e.target.value })} />
            </div>
            <Field label="Default category" className="col-span-2">
              {() => <AccountSelect value={vendorEdit.default_account_id} onChange={(v) => setVendorEdit({ ...vendorEdit, default_account_id: v })} types={["expense", "cogs", "asset"]} />}
            </Field>
            <div className="col-span-2 space-y-3 rounded-lg border border-a-line p-3">
              <Toggle checked={Boolean(vendorEdit.is_1099)} onChange={(v) => setVendorEdit({ ...vendorEdit, is_1099: v })} label="Gets a 1099-NEC" description="Contractors and other unincorporated service providers. You'll get a 1099 list at year-end." />
              {vendorEdit.is_1099 && (
                <>
                  <Toggle checked={Boolean(vendorEdit.w9_on_file)} onChange={(v) => setVendorEdit({ ...vendorEdit, w9_on_file: v })} label="W-9 on file" />
                  {isOwner ? (
                    <div className="grid grid-cols-3 gap-3">
                      <TextField className="col-span-2" label="Legal name (from W-9)" value={vendorEdit.legal_name || ""} onChange={(e) => setVendorEdit({ ...vendorEdit, legal_name: e.target.value })} />
                      <TextField as="select" label="ID type" value={vendorEdit.tin_type || "EIN"} onChange={(e) => setVendorEdit({ ...vendorEdit, tin_type: e.target.value })}><option>EIN</option><option>SSN</option><option>ITIN</option></TextField>
                      <TextField className="col-span-3" label="Taxpayer ID" value={vendorEdit.tin || ""} onChange={(e) => setVendorEdit({ ...vendorEdit, tin: e.target.value })} hint="Visible to owners only. Used for the 1099 export." autoComplete="off" />
                    </div>
                  ) : <p className="text-xs text-a-faint">Only the owner can view or enter the taxpayer ID.</p>}
                </>
              )}
              <Toggle checked={Boolean(vendorEdit.charges_tax_on_resale)} onChange={(v) => setVendorEdit({ ...vendorEdit, charges_tax_on_resale: v })} label="Charges sales tax on parts for resale" description="Flag to send them your resale certificate." />
            </div>
            <TextField className="col-span-2" as="textarea" rows={2} label="Notes" value={vendorEdit.notes || ""} onChange={(e) => setVendorEdit({ ...vendorEdit, notes: e.target.value })} />
          </div>
        )}
      </Modal>
    </>
  );
}

function nextDate(from, rec) {
  const d = new Date(`${from}T12:00:00`);
  if (rec === "weekly") d.setDate(d.getDate() + 7);
  else if (rec === "monthly") d.setMonth(d.getMonth() + 1);
  else if (rec === "quarterly") d.setMonth(d.getMonth() + 3);
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={null}>
      <ExpensesInner />
    </Suspense>
  );
}
