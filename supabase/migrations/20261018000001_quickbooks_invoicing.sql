-- QuickBooks-style invoicing: separate invoice numbers (continuing the
-- shop's QuickBooks sequence), terms, ship-to / notify party, PO numbers,
-- product/service names on lines, tax-exempt customers, viewed tracking.

-- Customers
alter table public.customers add column if not exists address_country    text;
alter table public.customers add column if not exists default_terms      text;
alter table public.customers add column if not exists tax_exempt         boolean not null default false;
alter table public.customers add column if not exists tax_exempt_reason  text;

-- Invoices / repair orders
create sequence if not exists public.invoice_number_seq start 1097;

alter table public.repair_orders add column if not exists invoice_number bigint unique;
alter table public.repair_orders add column if not exists terms          text;
alter table public.repair_orders add column if not exists ship_to        text;
alter table public.repair_orders add column if not exists notify_party   text;
alter table public.repair_orders add column if not exists po_number      text;
alter table public.repair_orders add column if not exists viewed_at      timestamptz;
alter table public.repair_orders add column if not exists voided_at      timestamptz;

alter table public.repair_order_items add column if not exists item_name text;

-- Assign the next invoice number the moment a repair order is invoiced.
create or replace function public.trg_assign_invoice_number()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.invoiced_at is not null and new.invoice_number is null then
    new.invoice_number := nextval('public.invoice_number_seq');
  end if;
  return new;
end;
$$;
revoke all on function public.trg_assign_invoice_number() from public, anon, authenticated;
drop trigger if exists repair_orders_invoice_number on public.repair_orders;
create trigger repair_orders_invoice_number before insert or update of invoiced_at on public.repair_orders
  for each row execute function public.trg_assign_invoice_number();

-- Admins can see / change the next invoice number from Settings.
create or replace function public.get_next_invoice_number()
returns bigint language plpgsql security definer set search_path = '' as $$
declare v bigint; called boolean;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select last_value, is_called into v, called from public.invoice_number_seq;
  return case when called then v + 1 else v end;
end;
$$;
revoke all on function public.get_next_invoice_number() from public, anon;
grant execute on function public.get_next_invoice_number() to authenticated;

create or replace function public.set_next_invoice_number(p_next bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_max bigint;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select coalesce(max(invoice_number), 0) into v_max from public.repair_orders;
  if p_next <= v_max then
    raise exception 'Invoice #% is already used. Pick a number above %.', p_next, v_max;
  end if;
  perform setval('public.invoice_number_seq', p_next, false);
  return p_next;
end;
$$;
revoke all on function public.set_next_invoice_number(bigint) from public, anon;
grant execute on function public.set_next_invoice_number(bigint) to authenticated;

-- Activity log wording uses the invoice number.
create or replace function public.trg_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_summary text; v_action text; v_id text;
begin
  v_action := lower(tg_op);
  if tg_table_name = 'repair_orders' then
    if tg_op = 'UPDATE' and new.status is not distinct from old.status
       and new.invoiced_at is not distinct from old.invoiced_at
       and new.voided_at is not distinct from old.voided_at then
      return null;
    end if;
    v_id := coalesce(new.id, old.id)::text;
    v_summary := case
      when tg_op = 'INSERT' and new.invoiced_at is not null then 'Created invoice #' || new.invoice_number
      when tg_op = 'INSERT' then 'Created RO #' || new.number
      when tg_op = 'DELETE' then 'Deleted ' || coalesce('invoice #' || old.invoice_number, 'RO #' || old.number)
      when new.voided_at is not null and old.voided_at is null then 'Voided invoice #' || coalesce(new.invoice_number::text, new.number::text)
      when new.invoiced_at is not null and old.invoiced_at is null then 'Invoice #' || new.invoice_number || ' created from RO #' || new.number
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

-- Customer opened the link: record the first view (shown as "Viewed").
create or replace function public.mark_document_viewed(p_token uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_label text;
begin
  update public.repair_orders set viewed_at = now()
  where public_token = p_token and viewed_at is null and status <> 'cancelled'
  returning id, coalesce('invoice #' || invoice_number, 'estimate #' || number) into v_id, v_label;
  if v_id is not null then
    insert into public.activity_log (actor, action, entity, entity_id, summary)
    values ('customer', 'view', 'repair_orders', v_id::text, 'Customer viewed ' || v_label);
  end if;
end;
$$;
revoke all on function public.mark_document_viewed(uuid) from public;
grant execute on function public.mark_document_viewed(uuid) to anon, authenticated;

-- Customer link payload gains the new fields.
create or replace function public.get_public_repair_order(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'shop', (select value from public.settings where key = 'shop'),
    'order', jsonb_build_object(
      'number', ro.number, 'invoice_number', ro.invoice_number, 'status', ro.status,
      'terms', ro.terms, 'ship_to', ro.ship_to, 'notify_party', ro.notify_party, 'po_number', ro.po_number,
      'complaint', ro.complaint, 'diagnosis', ro.diagnosis, 'recommendations', ro.recommendations,
      'customer_notes', ro.customer_notes, 'mileage_in', ro.mileage_in,
      'mileage_out', ro.mileage_out, 'tax_rate', ro.tax_rate,
      'discount_amount', ro.discount_amount, 'labor_total', ro.labor_total,
      'parts_total', ro.parts_total, 'other_total', ro.other_total,
      'tax_amount', ro.tax_amount, 'total', ro.total, 'amount_paid', ro.amount_paid,
      'balance_due', ro.balance_due, 'payment_status', ro.payment_status,
      'approved_at', ro.approved_at, 'approved_by_name', ro.approved_by_name,
      'declined_at', ro.declined_at, 'invoiced_at', ro.invoiced_at,
      'due_date', ro.due_date, 'created_at', ro.created_at, 'completed_at', ro.completed_at
    ),
    'customer', case when c.id is null then null else jsonb_build_object(
      'name', trim(concat_ws(' ', c.first_name, c.last_name)), 'company', c.company,
      'email', c.email, 'phone', c.phone, 'street', c.address_street, 'city', c.address_city,
      'state', c.address_state, 'zip', c.address_zip, 'country', c.address_country) end,
    'vehicle', case when v.id is null then null else jsonb_build_object(
      'year', v.year, 'make', v.make, 'model', v.model, 'trim', v.trim,
      'vin', v.vin, 'license_plate', v.license_plate, 'color', v.color) end,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'kind', i.kind, 'item_name', i.item_name, 'description', i.description,
        'part_number', i.part_number, 'quantity', i.quantity, 'unit_price', i.unit_price,
        'taxable', i.taxable, 'approved', i.approved, 'amount', round(i.quantity * i.unit_price, 2))
        order by i.position, i.created_at)
      from public.repair_order_items i where i.repair_order_id = ro.id), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object('amount', p.amount, 'method', p.method,
                                          'received_at', p.received_at) order by p.received_at)
      from public.payments p where p.repair_order_id = ro.id), '[]'::jsonb)
  )
  from public.repair_orders ro
  left join public.customers c on c.id = ro.customer_id
  left join public.customer_vehicles v on v.id = ro.vehicle_id
  where ro.public_token = p_token and ro.status <> 'cancelled';
$$;

-- Settings defaults for invoicing + QuickBooks mapping
update public.settings
set value = value
  || jsonb_build_object(
       'address', '806 Hood Ave, Leesburg, FL 34748-5652',
       'default_terms', coalesce(value->>'default_terms', 'Due on receipt'),
       'payment_link', coalesce(value->>'payment_link', ''),
       'payment_instructions', coalesce(value->>'payment_instructions', ''),
       'qb', coalesce(value->'qb', jsonb_build_object(
         'item_labor', 'Labor', 'item_part', 'Parts', 'item_fee', 'Fees', 'item_sublet', 'Sublet',
         'item_discount', 'Discount', 'item_tax', 'Sales Tax',
         'acct_labor', 'Labor Income', 'acct_part', 'Parts Income', 'acct_fee', 'Other Income',
         'acct_sublet', 'Sublet Income', 'acct_discount', 'Discounts Given',
         'acct_ar', 'Accounts Receivable', 'acct_tax', 'Sales Tax Payable',
         'acct_deposit', 'Undeposited Funds')))
where key = 'shop';

create index if not exists repair_orders_invoice_number_idx on public.repair_orders (invoice_number);
