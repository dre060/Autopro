-- Tracks which invoices/payments were already sent to QuickBooks so exports
-- can skip them (prevents double-importing).
alter table public.repair_orders add column if not exists qb_exported_at timestamptz;
alter table public.payments add column if not exists qb_exported_at timestamptz;
