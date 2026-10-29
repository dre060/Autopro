// frontend/src/components/admin/booksKit.js — shared pieces for the money screens.
"use client";

import { useEffect, useState } from "react";
import { Download, Printer, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { download } from "@/lib/quickbooks";
import { toCsv, CPA_NOTE } from "@/lib/books";
import { Button, Select, cx } from "./ui";

let accountsCache = null;
let ratesCache = null;

export function useAccounts() {
  const [accounts, setAccounts] = useState(accountsCache);
  useEffect(() => {
    if (accountsCache) return;
    supabase.from("accounts").select("*").order("code").then(({ data }) => {
      accountsCache = data || [];
      setAccounts(accountsCache);
    });
  }, []);
  const byCode = (code) => (accounts || []).find((a) => a.code === code);
  const byId = (id) => (accounts || []).find((a) => a.id === id);
  return { accounts, byCode, byId, reload: () => { accountsCache = null; } };
}

export function useRates() {
  const [rates, setRates] = useState(ratesCache);
  useEffect(() => {
    if (ratesCache) return;
    supabase.from("tax_rates").select("*").order("effective_from").then(({ data }) => {
      ratesCache = data || [];
      setRates(ratesCache);
    });
  }, []);
  return rates;
}
export const clearRatesCache = () => { ratesCache = null; };

export function AccountSelect({ value, onChange, types, codes, className, placeholder = "Choose…" }) {
  const { accounts } = useAccounts();
  const list = (accounts || []).filter((a) => a.active && (!types || types.includes(a.type)) && (!codes || codes.includes(a.code)));
  return (
    <Select value={value || ""} onChange={(e) => onChange(e.target.value || null)} className={className}>
      <option value="">{placeholder}</option>
      {list.map((a) => (
        <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
      ))}
    </Select>
  );
}

// Shrinks a phone photo to a JPEG (max 1600px) so uploads and OCR are fast.
// Safari decodes HEIC here, so iPhone photos come out as JPEG too.
export async function resizeImage(file, max = 1600, quality = 0.82) {
  if (!file.type.startsWith("image/")) return { blob: file, type: file.type };
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
    return { blob, type: "image/jpeg" };
  } catch {
    return { blob: file, type: file.type };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

// Private "documents" bucket. Returns the storage path.
export async function uploadDocument(blob, folder, ext = "jpg", contentType = "image/jpeg") {
  const d = new Date();
  const path = `${folder}/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("documents").upload(path, blob, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

export async function signedUrl(path, seconds = 600) {
  if (!path) return null;
  const { data } = await supabase.storage.from("documents").createSignedUrl(path, seconds);
  return data?.signedUrl || null;
}

export function ExportButtons({ filename, rows, columns, print = true, size = "sm" }) {
  return (
    <div className="no-print flex gap-2">
      <Button size={size} icon={Download} disabled={!rows?.length} onClick={() => download(`${filename}.csv`, toCsv(rows, columns))}>CSV</Button>
      {print && <Button size={size} icon={Printer} onClick={() => window.print()}>Print / PDF</Button>}
    </div>
  );
}

export function EstimateNote({ className, children }) {
  return (
    <p className={cx("flex items-start gap-1.5 text-xs text-a-faint", className)}>
      <Info className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>{children || CPA_NOTE}</span>
    </p>
  );
}

// yyyy-mm-dd helpers for range pickers
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function presetRange(key, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const q = Math.floor(m / 3) * 3;
  switch (key) {
    case "this_month": return { from: ymd(new Date(y, m, 1)), to: ymd(new Date(y, m + 1, 0)) };
    case "last_month": return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) };
    case "this_quarter": return { from: ymd(new Date(y, q, 1)), to: ymd(new Date(y, q + 3, 0)) };
    case "last_quarter": return { from: ymd(new Date(y, q - 3, 1)), to: ymd(new Date(y, q, 0)) };
    case "last_year": return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case "ytd": return { from: `${y}-01-01`, to: ymd(now) };
    default: return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
}
export const RANGE_PRESETS = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_quarter", label: "This quarter" },
  { value: "last_quarter", label: "Last quarter" },
  { value: "ytd", label: "Year to date" },
  { value: "this_year", label: "This year" },
  { value: "last_year", label: "Last year" },
];
