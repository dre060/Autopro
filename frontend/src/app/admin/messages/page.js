// frontend/src/app/admin/messages/page.js
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Send, Phone, Mail, Trash2, CheckCheck, Search, ArrowLeft, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { relative, dateTime, phone as fmtPhone, telHref } from "@/lib/format";
import { Button, Card, PageHeader, Segmented, Input, Textarea, EmptyState, SkeletonRows, ErrorBanner, Badge, cx, useUI } from "@/components/admin/ui";
import { useAdmin, adminFetch } from "@/components/admin/AdminContext";
import { cleanCustomer } from "@/components/admin/pickers";
import { useRouter } from "next/navigation";

function MessagesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast, confirm } = useUI();
  const { refreshCounts } = useAdmin();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("open");
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState(params.get("id"));
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = () =>
    supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(500).then(({ data, error: err }) => {
      if (err) setError(err);
      setRows(data || []);
    });
  useEffect(() => {
    load();
  }, []);

  const shown = useMemo(() => {
    let r = rows || [];
    if (filter === "open") r = r.filter((m) => !m.responded);
    if (filter === "done") r = r.filter((m) => m.responded);
    const t = q.trim().toLowerCase();
    if (t) r = r.filter((m) => `${m.name} ${m.email} ${m.subject} ${m.message}`.toLowerCase().includes(t));
    return r;
  }, [rows, filter, q]);

  const active = (rows || []).find((m) => m.id === activeId);
  useEffect(() => setReply(""), [activeId]);

  const markDone = async (m, responded = true) => {
    const { error: err } = await supabase.from("contact_messages").update({ responded, updated_at: new Date().toISOString() }).eq("id", m.id);
    if (err) return toast(err.message, "bad");
    setRows((rs) => rs.map((x) => (x.id === m.id ? { ...x, responded } : x)));
    refreshCounts();
  };

  const send = async () => {
    setSending(true);
    try {
      await adminFetch("/api/admin/email", { type: "message_reply", id: active.id, note: reply });
      toast(`Reply sent to ${active.email}`);
      setReply("");
      await load();
      refreshCounts();
    } catch (e) {
      toast(e.message, "bad");
    } finally {
      setSending(false);
    }
  };

  const saveAsCustomer = async (m) => {
    const { data: existing } = await supabase.from("customers").select("id").ilike("email", m.email).limit(1);
    if (existing?.[0]) return router.push(`/admin/customers/${existing[0].id}`);
    const [first, ...rest] = m.name.split(" ");
    const { data, error: err } = await supabase.from("customers").insert(cleanCustomer({ first_name: first, last_name: rest.join(" "), email: m.email, phone: m.phone })).select("id").single();
    if (err) return toast(err.message, "bad");
    toast("Customer created");
    router.push(`/admin/customers/${data.id}`);
  };

  const openCount = (rows || []).filter((m) => !m.responded).length;

  return (
    <>
      <PageHeader title="Messages" description="Contact form and vehicle inquiries from the website." />
      <ErrorBanner error={error} />
      <Card className="grid min-h-[70vh] overflow-hidden lg:grid-cols-[380px_1fr]">
        <div className={cx("flex flex-col border-a-line lg:border-r", active && "hidden lg:flex")}>
          <div className="space-y-3 border-b border-a-line p-3">
            <Segmented
              className="w-full [&>button]:flex-1 [&>button]:justify-center"
              value={filter}
              onChange={setFilter}
              options={[{ value: "open", label: "Needs reply", count: openCount }, { value: "done", label: "Answered" }, { value: "all", label: "All" }]}
            />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-a-faint" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rows === null ? (
              <SkeletonRows />
            ) : shown.length === 0 ? (
              <EmptyState icon={MessageSquare} title={filter === "open" ? "All caught up" : "No messages"} />
            ) : (
              <ul>
                {shown.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => setActiveId(m.id)}
                      className={cx("block w-full border-b border-a-line/60 px-4 py-3 text-left transition-colors", m.id === activeId ? "bg-a-hover" : "hover:bg-a-hover/50")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={cx("flex items-center gap-2 truncate text-sm", !m.responded && "font-semibold")}>
                          {!m.responded && <span className="h-2 w-2 shrink-0 rounded-full bg-a-accent" />}
                          {m.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-a-faint">{relative(m.created_at)}</span>
                      </div>
                      <div className="mt-0.5 truncate text-[13px] text-a-text">{m.subject}</div>
                      <div className="truncate text-xs text-a-faint">{m.message}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={cx("flex flex-col", !active && "hidden lg:flex")}>
          {!active ? (
            <EmptyState icon={MessageSquare} title="Select a message" className="m-auto" />
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-a-line px-5 py-4">
                <div className="min-w-0">
                  <button className="mb-2 flex items-center gap-1 text-[13px] text-a-muted lg:hidden" onClick={() => setActiveId(null)}><ArrowLeft className="h-4 w-4" /> Back</button>
                  <h2 className="text-lg font-semibold">{active.subject}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-a-muted">
                    <span className="font-medium text-a-text">{active.name}</span>
                    <a href={`mailto:${active.email}`} className="flex items-center gap-1 hover:text-a-text"><Mail className="h-3.5 w-3.5" />{active.email}</a>
                    {active.phone && <a href={telHref(active.phone)} className="flex items-center gap-1 hover:text-a-text"><Phone className="h-3.5 w-3.5" />{fmtPhone(active.phone)}</a>}
                  </div>
                  <div className="mt-1 text-xs text-a-faint">{dateTime(active.created_at)}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" icon={UserPlus} onClick={() => saveAsCustomer(active)}>Customer</Button>
                  <Button size="sm" icon={CheckCheck} onClick={() => markDone(active, !active.responded)}>{active.responded ? "Mark unanswered" : "Mark answered"}</Button>
                  <Button size="sm" variant="danger" icon={Trash2} aria-label="Delete" onClick={async () => {
                    if (!(await confirm({ title: "Delete this message?", danger: true, confirmLabel: "Delete" }))) return;
                    const { error: err } = await supabase.from("contact_messages").delete().eq("id", active.id);
                    if (err) return toast(err.message, "bad");
                    setRows((rs) => rs.filter((x) => x.id !== active.id));
                    setActiveId(null);
                    refreshCounts();
                  }} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{active.message}</p>
                {active.response_notes && (
                  <div className="mt-6 rounded-xl border border-a-line bg-a-raised p-4">
                    <div className="mb-2 flex items-center gap-2"><Badge tone="good">Your replies</Badge></div>
                    <p className="whitespace-pre-wrap text-sm text-a-muted">{active.response_notes}</p>
                  </div>
                )}
              </div>
              <div className="border-t border-a-line p-4">
                <Textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply to ${active.name.split(" ")[0]}… (sent by email from the shop)`} />
                <div className="mt-2 flex items-center justify-between gap-2">
                  {active.phone ? <Button size="sm" variant="ghost" icon={Phone} href={telHref(active.phone)}>Call instead</Button> : <span />}
                  <Button variant="primary" icon={Send} loading={sending} disabled={!reply.trim()} onClick={send}>Send reply</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesInner />
    </Suspense>
  );
}
