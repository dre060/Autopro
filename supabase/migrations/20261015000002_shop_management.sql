-- Shop management: customers + their vehicles, repair orders (estimate ->
-- work order -> invoice), line items, payments, parts inventory, activity log
-- and shop settings. Totals are maintained by triggers so every screen and
-- report reads the same numbers.

-- ---------------------------------------------------------------------------
-- Customers (existing table, loosened so a walk-in only needs a name)
-- ---------------------------------------------------------------------------
alter table public.customers alter column last_name drop not null;
alter table public.customers alter column email     drop not null;
alter table public.customers alter column phone     drop not null;
alter table public.customers add column if not exists company           text;
alter table public.customers add column if not exists tags              text[] not null default '{}';
alter table public.customers add column if not exists marketing_opt_in  boolean not null default true;
create index if not exists customers_name_idx  on public.customers (lower(last_name), lower(first_name));
create index if not exists customers_email_idx on public.customers (lower(email));
create index if not exists customers_phone_idx on public.customers (phone);

-- ---------------------------------------------------------------------------
-- Customer vehicles
-- ---------------------------------------------------------------------------
create table if not exists public.customer_vehicles (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customers(id) on delete cascade,
  year           integer check (year between 1900 and 2100),
  make           text,
  model          text,
  trim           text,
  engine         text,
  vin            text,
  license_plate  text,
  color          text,
  mileage        integer check (mileage >= 0),
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists customer_vehicles_customer_idx on public.customer_vehicles (customer_id);
create index if not exists customer_vehicles_vin_idx      on public.customer_vehicles (upper(vin));
create trigger customer_vehicles_updated_at before update on public.customer_vehicles
  for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Parts inventory
-- ---------------------------------------------------------------------------
create table if not exists public.parts (
  id                uuid primary key default gen_random_uuid(),
  part_number       text,
  name              text not null,
  brand             text,
  category          text,
  location          text,
  supplier          text,
  unit_cost         numeric(10,2) not null default 0 check (unit_cost >= 0),
  unit_price        numeric(10,2) not null default 0 check (unit_price >= 0),
  quantity_on_hand  numeric(10,2) not null default 0,
  reorder_point     numeric(10,2) not null default 0,
  notes             text,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists parts_number_idx on public.parts (lower(part_number));
create index if not exists parts_name_idx   on public.parts (lower(name));
create trigger parts_updated_at before update on public.parts
  for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Repair orders. One record moves through estimate -> approved -> in
-- progress -> ready -> completed; "invoiced_at" turns it into an invoice.
-- ---------------------------------------------------------------------------
create sequence if not exists public.repair_order_number_seq start 1001;

create table if not exists public.repair_orders (
  id                 uuid primary key default gen_random_uuid(),
  number             bigint not null unique default nextval('public.repair_order_number_seq'),
  public_token       uuid not null unique default gen_random_uuid(),
  status             text not null default 'estimate'
                     check (status in ('estimate','approved','in_progress','waiting_parts',
                                       'ready','completed','cancelled')),
  customer_id        uuid references public.customers(id) on delete set null,
  vehicle_id         uuid references public.customer_vehicles(id) on delete set null,
  appointment_id     uuid references public.appointments(id) on delete set null,
  technician         text,
  mileage_in         integer check (mileage_in >= 0),
  mileage_out        integer check (mileage_out >= 0),
  complaint          text,
  diagnosis          text,
  recommendations    text,
  customer_notes     text,
  internal_notes     text,
  promised_at        timestamptz,
  tax_rate           numeric(6,4) not null default 0.07 check (tax_rate >= 0 and tax_rate < 1),
  discount_amount    numeric(10,2) not null default 0 check (discount_amount >= 0),
  -- maintained by trigger
  labor_total        numeric(12,2) not null default 0,
  parts_total        numeric(12,2) not null default 0,
  other_total        numeric(12,2) not null default 0,
  taxable_total      numeric(12,2) not null default 0,
  tax_amount         numeric(12,2) not null default 0,
  total              numeric(12,2) not null default 0,
  cost_total         numeric(12,2) not null default 0,
  amount_paid        numeric(12,2) not null default 0,
  balance_due        numeric(12,2) not null default 0,
  payment_status     text not null default 'unpaid' check (payment_status in ('unpaid','partial','paid','refunded')),
  -- lifecycle
  approved_at        timestamptz,
  approved_by_name   text,
  declined_at        timestamptz,
  started_at         timestamptz,
  completed_at       timestamptz,
  invoiced_at        timestamptz,
  due_date           date,
  sent_at            timestamptz,
  created_by         text default (auth.jwt() ->> 'email'),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists repair_orders_customer_idx    on public.repair_orders (customer_id);
create index if not exists repair_orders_vehicle_idx     on public.repair_orders (vehicle_id);
create index if not exists repair_orders_appointment_idx on public.repair_orders (appointment_id);
create index if not exists repair_orders_status_idx      on public.repair_orders (status);
create index if not exists repair_orders_invoiced_idx    on public.repair_orders (invoiced_at desc);
create index if not exists repair_orders_created_idx     on public.repair_orders (created_at desc);
create trigger repair_orders_updated_at before update on public.repair_orders
  for each row execute function public.update_updated_at_column();

create table if not exists public.repair_order_items (
  id               uuid primary key default gen_random_uuid(),
  repair_order_id  uuid not null references public.repair_orders(id) on delete cascade,
  kind             text not null default 'labor' check (kind in ('labor','part','fee','sublet')),
  description      text not null,
  part_id          uuid references public.parts(id) on delete set null,
  part_number      text,
  quantity         numeric(10,2) not null default 1 check (quantity > 0),
  unit_price       numeric(10,2) not null default 0 check (unit_price >= 0),
  unit_cost        numeric(10,2) not null default 0 check (unit_cost >= 0),
  taxable          boolean not null default false,
  approved         boolean not null default true,
  position         integer not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists repair_order_items_ro_idx   on public.repair_order_items (repair_order_id, position);
create index if not exists repair_order_items_part_idx on public.repair_order_items (part_id);

create table if not exists public.payments (
  id               uuid primary key default gen_random_uuid(),
  repair_order_id  uuid not null references public.repair_orders(id) on delete cascade,
  amount           numeric(12,2) not null check (amount <> 0),
  method           text not null default 'card'
                   check (method in ('cash','card','check','zelle','cashapp','financing','other')),
  reference        text,
  notes            text,
  received_at      timestamptz not null default now(),
  recorded_by      text default (auth.jwt() ->> 'email'),
  created_at       timestamptz not null default now()
);
create index if not exists payments_ro_idx       on public.payments (repair_order_id);
create index if not exists payments_received_idx on public.payments (received_at desc);

-- ---------------------------------------------------------------------------
-- Totals
-- ---------------------------------------------------------------------------
create or replace function public.recalc_repair_order(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_labor numeric; v_parts numeric; v_other numeric; v_taxable numeric; v_cost numeric;
  v_rate numeric; v_discount numeric; v_tax numeric; v_total numeric; v_paid numeric;
begin
  select
    coalesce(sum(round(quantity * unit_price, 2)) filter (where kind = 'labor'), 0),
    coalesce(sum(round(quantity * unit_price, 2)) filter (where kind = 'part'), 0),
    coalesce(sum(round(quantity * unit_price, 2)) filter (where kind in ('fee','sublet')), 0),
    coalesce(sum(round(quantity * unit_price, 2)) filter (where taxable), 0),
    coalesce(sum(round(quantity * unit_cost, 2)), 0)
  into v_labor, v_parts, v_other, v_taxable, v_cost
  from public.repair_order_items
  where repair_order_id = p_id and approved;

  select tax_rate, discount_amount into v_rate, v_discount
  from public.repair_orders where id = p_id;
  if not found then return; end if;

  v_tax   := round(v_taxable * v_rate, 2);
  v_total := greatest(v_labor + v_parts + v_other - v_discount, 0) + v_tax;

  select coalesce(sum(amount), 0) into v_paid from public.payments where repair_order_id = p_id;

  update public.repair_orders set
    labor_total    = v_labor,
    parts_total    = v_parts,
    other_total    = v_other,
    taxable_total  = v_taxable,
    tax_amount     = v_tax,
    total          = v_total,
    cost_total     = v_cost,
    amount_paid    = v_paid,
    balance_due    = v_total - v_paid,
    payment_status = case
      when v_paid < 0 then 'refunded'
      when v_paid = 0 then 'unpaid'
      when v_paid >= v_total and v_total > 0 then 'paid'
      else 'partial' end
  where id = p_id;
end;
$$;
revoke all on function public.recalc_repair_order(uuid) from public, anon, authenticated;

create or replace function public.trg_recalc_from_child()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE','DELETE') then
    perform public.recalc_repair_order(old.repair_order_id);
  end if;
  if tg_op = 'INSERT'
     or (tg_op = 'UPDATE' and new.repair_order_id is distinct from old.repair_order_id) then
    perform public.recalc_repair_order(new.repair_order_id);
  end if;
  return null;
end;
$$;
revoke all on function public.trg_recalc_from_child() from public, anon, authenticated;

create trigger repair_order_items_recalc after insert or update or delete on public.repair_order_items
  for each row execute function public.trg_recalc_from_child();
create trigger payments_recalc after insert or update or delete on public.payments
  for each row execute function public.trg_recalc_from_child();

create or replace function public.trg_recalc_self()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tax_rate is distinct from old.tax_rate or new.discount_amount is distinct from old.discount_amount then
    perform public.recalc_repair_order(new.id);
  end if;
  return null;
end;
$$;
revoke all on function public.trg_recalc_self() from public, anon, authenticated;
create trigger repair_orders_recalc after update of tax_rate, discount_amount on public.repair_orders
  for each row execute function public.trg_recalc_self();

-- Status timestamps
create or replace function public.trg_repair_order_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'approved' and new.approved_at is null then new.approved_at := now(); end if;
    if new.status = 'in_progress' and new.started_at is null then new.started_at := now(); end if;
    if new.status = 'completed' and new.completed_at is null then new.completed_at := now(); end if;
  end if;
  return new;
end;
$$;
create trigger repair_orders_status_ts before update of status on public.repair_orders
  for each row execute function public.trg_repair_order_status();

-- ---------------------------------------------------------------------------
-- Parts stock follows line items that reference an inventory part
-- ---------------------------------------------------------------------------
create or replace function public.trg_part_stock()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE','DELETE') and old.part_id is not null then
    update public.parts set quantity_on_hand = quantity_on_hand + old.quantity where id = old.part_id;
  end if;
  if tg_op in ('INSERT','UPDATE') and new.part_id is not null then
    update public.parts set quantity_on_hand = quantity_on_hand - new.quantity where id = new.part_id;
  end if;
  return null;
end;
$$;
revoke all on function public.trg_part_stock() from public, anon, authenticated;
create trigger repair_order_items_stock after insert or update of part_id, quantity or delete
  on public.repair_order_items for each row execute function public.trg_part_stock();

-- ---------------------------------------------------------------------------
-- Activity log
-- ---------------------------------------------------------------------------
create table if not exists public.activity_log (
  id          bigint generated always as identity primary key,
  actor       text default coalesce(auth.jwt() ->> 'email', 'website'),
  action      text not null,
  entity      text not null,
  entity_id   text,
  summary     text,
  created_at  timestamptz not null default now()
);
create index if not exists activity_log_created_idx on public.activity_log (created_at desc);

create or replace function public.trg_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_summary text; v_action text; v_id text;
begin
  v_action := lower(tg_op);
  if tg_table_name = 'repair_orders' then
    if tg_op = 'UPDATE' and new.status is not distinct from old.status
       and new.invoiced_at is not distinct from old.invoiced_at then
      return null;
    end if;
    v_id := coalesce(new.id, old.id)::text;
    v_summary := case
      when tg_op = 'INSERT' then 'Created RO #' || new.number
      when tg_op = 'DELETE' then 'Deleted RO #' || old.number
      when new.invoiced_at is not null and old.invoiced_at is null then 'Invoiced RO #' || new.number || ' ($' || new.total || ')'
      else 'RO #' || new.number || ' → ' || replace(new.status, '_', ' ') end;
  elsif tg_table_name = 'payments' then
    if tg_op = 'UPDATE' then return null; end if;
    v_id := coalesce(new.repair_order_id, old.repair_order_id)::text;
    v_summary := case when tg_op = 'INSERT'
      then 'Payment $' || new.amount || ' (' || new.method || ')'
      else 'Removed payment $' || old.amount end;
  elsif tg_table_name = 'appointments' then
    if tg_op = 'UPDATE' and new.status is not distinct from old.status then return null; end if;
    v_id := coalesce(new.id, old.id)::text;
    v_summary := case
      when tg_op = 'INSERT' then 'Appointment request: ' || coalesce(new.customer_name, new.name, 'customer') || ' – ' || coalesce(new.service, '')
      when tg_op = 'DELETE' then 'Deleted appointment for ' || coalesce(old.customer_name, old.name, 'customer')
      else 'Appointment for ' || coalesce(new.customer_name, new.name, 'customer') || ' → ' || new.status end;
  elsif tg_table_name = 'contact_messages' then
    if tg_op <> 'INSERT' then return null; end if;
    v_id := new.id::text;
    v_summary := 'Message from ' || new.name || ': ' || left(new.subject, 80);
  elsif tg_table_name = 'vehicles' then
    if tg_op = 'UPDATE' and new.status is not distinct from old.status then return null; end if;
    v_id := coalesce(new.id, old.id)::text;
    v_summary := case
      when tg_op = 'INSERT' then 'Listed ' || new.year || ' ' || new.make || ' ' || new.model
      when tg_op = 'DELETE' then 'Removed ' || old.year || ' ' || old.make || ' ' || old.model
      else new.year || ' ' || new.make || ' ' || new.model || ' → ' || new.status end;
  end if;

  insert into public.activity_log (action, entity, entity_id, summary)
  values (v_action, tg_table_name, v_id, v_summary);
  return null;
end;
$$;
revoke all on function public.trg_activity() from public, anon, authenticated;

create trigger repair_orders_activity after insert or update or delete on public.repair_orders
  for each row execute function public.trg_activity();
create trigger payments_activity after insert or update or delete on public.payments
  for each row execute function public.trg_activity();
create trigger appointments_activity after insert or update or delete on public.appointments
  for each row execute function public.trg_activity();
create trigger contact_messages_activity after insert on public.contact_messages
  for each row execute function public.trg_activity();
create trigger vehicles_activity after insert or update or delete on public.vehicles
  for each row execute function public.trg_activity();

-- ---------------------------------------------------------------------------
-- Shop settings (single row of the existing key/value table)
-- ---------------------------------------------------------------------------
create unique index if not exists settings_key_idx on public.settings (key);
insert into public.settings (key, category, description, value) values (
  'shop', 'general', 'Shop profile, rates and invoice defaults',
  jsonb_build_object(
    'name', 'Auto Pro Repairs Sales & Services LLC',
    'phone', '(352) 933-5181',
    'email', 'service@autoprorepairs.com',
    'address', '806 Hood Ave, Leesburg, FL 34748',
    'website', 'https://www.autoprorepairs.com',
    'labor_rate', 120,
    'tax_rate', 0.07,
    'tax_labor', false,
    'tax_parts', true,
    'tax_fees', true,
    'payment_terms_days', 0,
    'invoice_terms', 'Payment is due when the vehicle is picked up. All parts and labor carry a 12-month / 12,000-mile limited warranty unless noted otherwise.',
    'estimate_terms', 'Estimates are valid for 30 days. Additional work will not be performed without your approval.',
    'technicians', jsonb_build_array()
  )
) on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- RLS for the new tables: admins only
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['customer_vehicles','parts','repair_orders','repair_order_items',
                           'payments','activity_log']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Admins manage %1$s" on public.%1$I for all to authenticated
         using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;

grant usage on sequence public.repair_order_number_seq to authenticated;
