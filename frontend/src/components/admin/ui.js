// frontend/src/components/admin/ui.js
// Admin UI kit. Colors come from the theme tokens in app/admin/admin.css.
"use client";

import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Loader2, CheckCircle2, AlertTriangle, Info, Inbox } from "lucide-react";

export const cx = (...c) => c.filter(Boolean).join(" ");

// ---------------------------------------------------------------- buttons
const BTN_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium rounded-lg transition-[background,color,border,box-shadow,transform] duration-100 active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none select-none";
const BTN_VARIANT = {
  primary: "bg-a-accent text-a-accent-fg hover:bg-a-accent/90 shadow-sm shadow-a-accent/20",
  secondary: "bg-a-raised text-a-text border border-a-line hover:bg-a-hover",
  ghost: "text-a-muted hover:text-a-text hover:bg-a-hover",
  danger: "bg-a-bad/10 text-a-bad border border-a-bad/30 hover:bg-a-bad/20",
  success: "bg-a-good text-white hover:bg-a-good/90",
};
const BTN_SIZE = { xs: "h-7 px-2 text-xs", sm: "h-8 px-3 text-[13px]", md: "h-9 px-3.5 text-sm", lg: "h-11 px-5 text-[15px]" };

export const Button = forwardRef(function Button(
  { variant = "secondary", size = "md", icon: Icon, loading, className, href, children, ...props },
  ref
) {
  const cls = cx(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className);
  const inner = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      {children}
    </>
  );
  if (href) {
    return (
      <Link ref={ref} href={href} className={cls} {...props}>
        {inner}
      </Link>
    );
  }
  return (
    <button ref={ref} type={props.type || "button"} className={cls} disabled={loading || props.disabled} {...props}>
      {inner}
    </button>
  );
});

export function IconButton({ icon: Icon, label, className, size = "md", ...props }) {
  const s = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx("inline-flex items-center justify-center rounded-lg text-a-muted hover:text-a-text hover:bg-a-hover transition-colors", s, className)}
      {...props}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

// ---------------------------------------------------------------- form fields
export function Field({ label, hint, error, children, className, required }) {
  const id = useId();
  const child = typeof children === "function" ? children(id) : children;
  return (
    <div className={cx("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="block text-[12.5px] font-medium text-a-muted">
          {label}
          {required && <span className="text-a-bad"> *</span>}
        </label>
      )}
      {child}
      {error ? <p className="text-xs text-a-bad">{error}</p> : hint ? <p className="text-xs text-a-faint">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cx("a-input", className)} {...props} />;
});
export const Textarea = forwardRef(function Textarea({ className, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cx("a-input", className)} {...props} />;
});
export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cx("a-input", className)} {...props}>
      {children}
    </select>
  );
});

// Labeled input in one line: <TextField label="Name" value onChange />
export function TextField({ label, hint, error, required, className, as = "input", ...props }) {
  const Comp = as === "textarea" ? Textarea : as === "select" ? Select : Input;
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {(id) => <Comp id={id} required={required} aria-invalid={error ? "true" : undefined} {...props} />}
    </Field>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className={cx("flex items-start gap-3 cursor-pointer", disabled && "opacity-50 cursor-not-allowed")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors",
          checked ? "border-a-accent bg-a-accent" : "border-a-line bg-a-hover"
        )}
      >
        <span
          className={cx(
            "absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
      {(label || description) && (
        <span>
          {label && <span className="block text-sm text-a-text">{label}</span>}
          {description && <span className="block text-xs text-a-faint">{description}</span>}
        </span>
      )}
    </label>
  );
}

// ---------------------------------------------------------------- layout
export function Card({ className, children, ...props }) {
  return (
    <div className={cx("rounded-xl border border-a-line bg-a-panel", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, actions, className, icon: Icon }) {
  return (
    <div className={cx("flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3", className)}>
      <div className="min-w-[min(100%,220px)] flex-1">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-a-text">
          {Icon && <Icon className="h-4 w-4 text-a-muted" />}
          {title}
        </h3>
        {description && <p className="mt-0.5 text-[13px] text-a-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, back, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-[13px] text-a-muted hover:text-a-text">
            ← {back.label}
          </Link>
        )}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-a-text">{title}</h1>
        {description && <p className="mt-1 text-sm text-a-muted">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- badges
const TONES = {
  neutral: "bg-a-hover text-a-muted border-a-line",
  accent: "bg-a-accent/10 text-a-accent border-a-accent/25",
  good: "bg-a-good/10 text-a-good border-a-good/25",
  warn: "bg-a-warn/10 text-a-warn border-a-warn/25",
  bad: "bg-a-bad/10 text-a-bad border-a-bad/25",
  info: "bg-a-info/10 text-a-info border-a-info/25",
  violet: "bg-a-violet/10 text-a-violet border-a-violet/25",
};

export function Badge({ tone = "neutral", dot, className, children }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11.5px] font-medium",
        TONES[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const RO_STATUS = {
  estimate: { label: "Estimate", tone: "violet" },
  approved: { label: "Approved", tone: "info" },
  in_progress: { label: "In progress", tone: "accent" },
  waiting_parts: { label: "Waiting on parts", tone: "warn" },
  ready: { label: "Ready for pickup", tone: "good" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "bad" },
};
export const PAYMENT_STATUS = {
  unpaid: { label: "Unpaid", tone: "bad" },
  partial: { label: "Partial", tone: "warn" },
  paid: { label: "Paid", tone: "good" },
  refunded: { label: "Refunded", tone: "neutral" },
};
export const APPT_STATUS = {
  pending: { label: "Pending", tone: "warn" },
  confirmed: { label: "Confirmed", tone: "info" },
  "in-progress": { label: "In shop", tone: "accent" },
  completed: { label: "Completed", tone: "good" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  "no-show": { label: "No-show", tone: "bad" },
};

export function StatusBadge({ map, value }) {
  const s = map[value] || { label: value || "—", tone: "neutral" };
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

// ---------------------------------------------------------------- feedback
export function Spinner({ className }) {
  return <Loader2 className={cx("h-5 w-5 animate-spin text-a-muted", className)} />;
}

export function Skeleton({ className }) {
  return <div className={cx("a-skeleton", className)} />;
}

export function SkeletonRows({ rows = 6 }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={cx("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-a-line bg-a-raised">
        <Icon className="h-5 w-5 text-a-muted" />
      </div>
      <p className="text-[15px] font-medium text-a-text">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-a-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-a-bad/30 bg-a-bad/10 px-4 py-3 text-sm text-a-bad">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{typeof error === "string" ? error : error.message || "Something went wrong."}</div>
      {onRetry && (
        <button onClick={onRetry} className="font-medium underline underline-offset-2">
          Retry
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- overlays
function useLockScroll(open) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

function Portal({ children }) {
  const [el, setEl] = useState(null);
  useEffect(() => setEl(document.querySelector(".admin-root") || document.body), []);
  return el ? createPortal(children, el) : null;
}

export function Modal({ open, onClose, title, description, children, footer, size = "md" }) {
  useLockScroll(open);
  useEscape(open, onClose);
  const panelRef = useRef(null);
  useEffect(() => {
    if (open) setTimeout(() => panelRef.current?.querySelector("input,select,textarea,button")?.focus(), 30);
  }, [open]);
  if (!open) return null;
  const width = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
        <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
        <div
          ref={panelRef}
          className={cx(
            "relative flex max-h-[92vh] w-full animate-slide-up flex-col rounded-t-2xl border border-a-line bg-a-panel shadow-pop sm:rounded-2xl",
            width
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-a-line px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-a-text">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-a-muted">{description}</p>}
            </div>
            <IconButton icon={X} label="Close" size="sm" onClick={onClose} />
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-a-line px-5 py-3">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = "max-w-xl" }) {
  useLockScroll(open);
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
        <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={onClose} />
        <div className={cx("absolute inset-y-0 right-0 flex w-full animate-slide-in-right flex-col border-l border-a-line bg-a-panel shadow-pop", width)}>
          <div className="flex items-start justify-between gap-4 border-b border-a-line px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-a-text">{title}</h2>
              {subtitle && <div className="mt-0.5 text-sm text-a-muted">{subtitle}</div>}
            </div>
            <IconButton icon={X} label="Close" size="sm" onClick={onClose} />
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-a-line px-5 py-3">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

// ---------------------------------------------------------------- toasts + confirm
const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const toast = useCallback((message, tone = "good") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "bad" ? 6500 : 3500);
  }, []);

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setConfirmState({ ...opts, resolve });
      }),
    []
  );

  const close = (value) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  const icons = { good: CheckCircle2, bad: AlertTriangle, info: Info };

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed bottom-24 right-4 z-[100] lg:bottom-4 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2 no-print" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.tone] || Info;
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex animate-slide-up items-start gap-3 rounded-xl border border-a-line bg-a-raised px-4 py-3 text-sm text-a-text shadow-pop"
            >
              <Icon className={cx("mt-0.5 h-4 w-4 shrink-0", t.tone === "bad" ? "text-a-bad" : t.tone === "good" ? "text-a-good" : "text-a-info")} />
              <span className="flex-1">{t.message}</span>
            </div>
          );
        })}
      </div>
      <Modal
        open={Boolean(confirmState)}
        onClose={() => close(false)}
        title={confirmState?.title || "Are you sure?"}
        size="sm"
        footer={
          <>
            <Button onClick={() => close(false)}>Cancel</Button>
            <Button variant={confirmState?.danger ? "danger" : "primary"} onClick={() => close(true)}>
              {confirmState?.confirmLabel || "Confirm"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-a-muted">{confirmState?.message}</p>
      </Modal>
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside <UIProvider>");
  return ctx;
}

// ---------------------------------------------------------------- tables
export function Table({ children, className }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  );
}
export function Th({ children, className, align = "left" }) {
  return (
    <th
      className={cx(
        "whitespace-nowrap border-b border-a-line px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-a-faint",
        align === "right" && "text-right",
        className
      )}
    >
      {children}
    </th>
  );
}
export function Td({ children, className, align = "left", ...props }) {
  return (
    <td className={cx("border-b border-a-line/60 px-4 py-3 align-middle", align === "right" && "text-right tnum", className)} {...props}>
      {children}
    </td>
  );
}

// ---------------------------------------------------------------- tabs / segmented
export function Segmented({ value, onChange, options, className }) {
  return (
    <div className={cx("inline-flex rounded-lg border border-a-line bg-a-raised p-0.5", className)} role="tablist">
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className={cx(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              active ? "bg-a-panel text-a-text shadow-sm" : "text-a-muted hover:text-a-text"
            )}
          >
            {label}
            {typeof o === "object" && o.count !== undefined && (
              <span className={cx("rounded px-1.5 text-[11px] tnum", active ? "bg-a-hover" : "bg-a-hover/60")}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- stat
export function Stat({ label, value, sub, icon: Icon, tone = "accent", href }) {
  const toneCls = {
    accent: "text-a-accent bg-a-accent/10",
    good: "text-a-good bg-a-good/10",
    warn: "text-a-warn bg-a-warn/10",
    bad: "text-a-bad bg-a-bad/10",
    violet: "text-a-violet bg-a-violet/10",
    info: "text-a-info bg-a-info/10",
  }[tone];
  const body = (
    <Card className={cx("p-4 transition-colors", href && "hover:border-a-faint/50")}>
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-a-muted">{label}</span>
        {Icon && (
          <span className={cx("flex h-8 w-8 items-center justify-center rounded-lg", toneCls)}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mt-2 font-display text-[26px] font-semibold leading-none tracking-tight text-a-text tnum">{value}</div>
      {sub && <div className="mt-2 text-xs text-a-faint">{sub}</div>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

// Small helper for search-as-you-type inputs.
export function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
