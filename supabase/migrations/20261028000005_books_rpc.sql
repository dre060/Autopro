-- Reports, DR-15 worksheet, technician app, scheduled jobs, estimate
-- line approvals, customer merge and global search.

-- =========================================================== GL summaries
create or replace function public.gl_summary(p_from date, p_to date)
returns table (account_id uuid, code text, name text, type text, subtype text, schedule_c text, debit numeric, credit numeric)
language sql stable security invoker set search_path = '' as $$
  select a.id, a.code, a.name, a.type, a.subtype, a.schedule_c,
         coalesce(sum(l.debit), 0), coalesce(sum(l.credit), 0)
  from public.accounts a
  left join (public.journal_lines l join public.journal_entries e on e.id = l.entry_id and e.entry_date between p_from and p_to)
    on l.account_id = a.id
  group by a.id
  order by a.code;
$$;
grant execute on function public.gl_summary(date, date) to authenticated;

-- Cash-basis P&L: income/cost of sales recognised in proportion to money
-- received; expenses when paid.
create or replace function public.pnl_cash(p_from date, p_to date)
returns table (account_id uuid, code text, name text, type text, amount numeric)
language sql stable security invoker set search_path = '' as $$
  with pay as (
    select p.amount, p.repair_order_id, p.deal_id
    from public.payments p
    where p.voided_at is null and p.method <> 'credit_memo'
      and public.local_day(p.received_at) between p_from and p_to
  ), sales as (
    -- invoice share
    select l.account_id, (l.credit - l.debit) * pay.amount / nullif(ro.total, 0) amt
    from pay join public.repair_orders ro on ro.id = pay.repair_order_id and ro.voided_at is null
    join public.journal_entries e on e.source_type = 'invoice' and e.source_id = ro.id
    join public.journal_lines l on l.entry_id = e.id
    join public.accounts a on a.id = l.account_id and a.type in ('income','cogs')
    union all
    -- deal share
    select l.account_id, (l.credit - l.debit) * pay.amount / nullif(d.total_due, 0)
    from pay join public.vehicle_deals d on d.id = pay.deal_id and d.status = 'final'
    join public.journal_entries e on e.source_type in ('deal','deal_cogs') and e.source_id = d.id
    join public.journal_lines l on l.entry_id = e.id
    join public.accounts a on a.id = l.account_id and a.type in ('income','cogs')
  ), spend as (
    select l.account_id, l.credit - l.debit amt
    from public.journal_entries e join public.journal_lines l on l.entry_id = e.id
    join public.accounts a on a.id = l.account_id and a.type in ('cogs','expense')
    where (e.source_type = 'bill' and exists (select 1 from public.expenses x where x.id = e.source_id and x.status = 'paid'
              and x.voided_at is null and coalesce(x.paid_at, x.expense_date) between p_from and p_to))
       or (e.source_type in ('payroll','manual','estimated_tax') or e.source_type like 'depreciation_%')
          and e.entry_date between p_from and p_to
  )
  select a.id, a.code, a.name, a.type, round(coalesce(sum(x.amt), 0), 2)
  from public.accounts a left join (select * from sales union all select * from spend) x on x.account_id = a.id
  where a.type in ('income','cogs','expense')
  group by a.id order by a.code;
$$;
grant execute on function public.pnl_cash(date, date) to authenticated;

-- =========================================================== DR-15 worksheet
create or replace function public.dr15_worksheet(p_start date, p_end date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  rep record; dl record; ex record; v_tax numeric; v_allow numeric; v_rate numeric; v_base numeric; v_max numeric; v_cap numeric;
begin
  if not public.can_read_books() and current_setting('autopro.cron', true) is distinct from '1' then
    raise exception 'Not authorized';
  end if;
  v_cap := coalesce(public.rate('surtax_item_cap', p_end), 5000);

  with docs as (
    select ro.*, case when ro.doc_type = 'credit_memo' then -1 else 1 end s
    from public.repair_orders ro
    where ro.invoiced_at is not null and ro.stock_vehicle_id is null
  ), ev as (
    select id, s sign, total, tax_amount, govt_fees_total, taxable_total, tax_surtax, surtax_over_cap from docs
    where public.local_day(invoiced_at) between p_start and p_end
    union all
    select id, -s, total, tax_amount, govt_fees_total, taxable_total, tax_surtax, surtax_over_cap from docs
    where voided_at is not null and public.local_day(voided_at) between p_start and p_end
  )
  select count(*) n,
    coalesce(sum(sign * (total - tax_amount - govt_fees_total)), 0) gross,
    coalesce(sum(sign * taxable_total), 0) taxable,
    coalesce(sum(sign * tax_amount), 0) tax,
    coalesce(sum(sign * tax_surtax), 0) surtax,
    coalesce(sum(sign * surtax_over_cap), 0) over_cap,
    coalesce(sum(sign * govt_fees_total), 0) govt,
    coalesce(sum(sign * (select coalesce(sum(quantity), 0) from public.repair_order_items i where i.repair_order_id = ev.id and i.approved and i.fee_code = 'tire')), 0) tires,
    coalesce(sum(sign * (select coalesce(sum(quantity), 0) from public.repair_order_items i where i.repair_order_id = ev.id and i.approved and i.fee_code = 'battery')), 0) batteries
  into rep from ev;

  with ev as (
    select d.*, 1 sign from public.vehicle_deals d
    where d.finalized_at is not null and d.sale_date between p_start and p_end
    union all
    select d.*, -1 from public.vehicle_deals d
    where d.status = 'void' and d.finalized_at is not null and public.local_day(d.voided_at) between p_start and p_end
  )
  select count(*) n,
    coalesce(sum(sign * (sale_price + doc_fee + (select coalesce(sum((a ->> 'price')::numeric), 0) from jsonb_array_elements(addons) a))), 0) gross,
    coalesce(sum(sign * taxable_amount), 0) taxable,
    coalesce(sum(sign * total_tax), 0) tax,
    coalesce(sum(sign * surtax), 0) surtax,
    coalesce(sum(sign * (taxable_amount - least(taxable_amount, v_cap))), 0) over_cap
  into dl from ev;

  select count(*) n, coalesce(sum(use_tax_base), 0) base, coalesce(sum(use_tax_amount), 0) tax
  into ex from public.expenses
  where voided_at is null and use_tax_amount <> 0 and expense_date between p_start and p_end;

  v_tax  := rep.tax + dl.tax + ex.tax;
  v_rate := coalesce(public.rate('collection_allowance_rate', p_end), 0.025);
  v_base := coalesce(public.rate('collection_allowance_base', p_end), 1200);
  v_max  := coalesce(public.rate('collection_allowance_max', p_end), 30);
  v_allow := greatest(least(round(least(v_tax, v_base) * v_rate, 2), v_max), 0);

  return jsonb_build_object(
    'period_start', p_start, 'period_end', p_end,
    'invoices', rep.n, 'deals', dl.n, 'use_tax_purchases', ex.n,
    'gross_sales', rep.gross + dl.gross,
    'repair_gross', rep.gross, 'vehicle_gross', dl.gross,
    'taxable_sales', rep.taxable + dl.taxable,
    'exempt_sales', (rep.gross + dl.gross) - (rep.taxable + dl.taxable),
    'taxable_purchases', ex.base,
    'tax_collected', rep.tax + dl.tax,
    'use_tax', ex.tax,
    'surtax_collected', rep.surtax + dl.surtax,
    'surtax_exempt_over_cap', round(rep.over_cap + dl.over_cap, 2),
    'tire_count', rep.tires, 'battery_count', rep.batteries,
    'govt_fees', rep.govt,
    'total_tax_due', v_tax,
    'collection_allowance', v_allow,
    'net_tax_due', v_tax - v_allow,
    'amount_due_with_fees', v_tax - v_allow + rep.govt,
    'amount_due_late', v_tax + rep.govt);
end;
$$;
grant execute on function public.dr15_worksheet(date, date) to authenticated;

-- =========================================================== technician app
create or replace function public.my_employee_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select a.employee_id from auth.users u join public.admin_users a on a.email = lower(u.email)
  where u.id = auth.uid() and a.active limit 1;
$$;

create or replace function public.tech_me()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_emp uuid := public.my_employee_id();
begin
  if public.staff_role() is null then raise exception 'Not authorized'; end if;
  return jsonb_build_object(
    'role', public.staff_role(),
    'employee', (select jsonb_build_object('id', id, 'name', trim(first_name || ' ' || coalesce(last_name, '')))
                 from public.employees where id = v_emp),
    'open_entry', (select to_jsonb(t) from (select id, clock_in, repair_order_id from public.time_entries
                   where employee_id = v_emp and clock_out is null) t),
    'week_hours', (select round(coalesce(sum(extract(epoch from (coalesce(clock_out, now()) - clock_in)) / 3600
                    - break_minutes / 60.0), 0)::numeric, 2)
                   from public.time_entries where employee_id = v_emp
                     and clock_in >= date_trunc('week', now() at time zone 'America/New_York') at time zone 'America/New_York'));
end;
$$;

create or replace function public.tech_jobs()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if public.staff_role() is null then raise exception 'Not authorized'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', ro.id, 'number', ro.number, 'status', ro.status, 'technician', ro.technician,
      'promised_at', ro.promised_at, 'complaint', ro.complaint, 'diagnosis', ro.diagnosis,
      'recommendations', ro.recommendations, 'internal_notes', ro.internal_notes, 'mileage_in', ro.mileage_in,
      'customer', coalesce(c.first_name, c.company),
      'vehicle', case when v.id is not null then jsonb_build_object('year', v.year, 'make', v.make, 'model', v.model,
                   'plate', v.license_plate, 'vin', v.vin, 'color', v.color, 'engine', v.engine)
                 when sv.id is not null then jsonb_build_object('year', sv.year, 'make', sv.make, 'model', sv.model, 'vin', sv.vin, 'stock', true) end,
      'items', coalesce((select jsonb_agg(jsonb_build_object('kind', i.kind, 'description', coalesce(i.item_name || ': ', '') || i.description,
                          'hours', case when i.kind = 'labor' then i.quantity end, 'part_number', i.part_number,
                          'quantity', case when i.kind = 'part' then i.quantity end) order by i.position, i.created_at)
                         from public.repair_order_items i where i.repair_order_id = ro.id and i.approved and i.kind in ('labor','part','sublet')), '[]'::jsonb)
    ) order by ro.promised_at nulls last, ro.number)
    from public.repair_orders ro
    left join public.customers c on c.id = ro.customer_id
    left join public.customer_vehicles v on v.id = ro.vehicle_id
    left join public.vehicles sv on sv.id = ro.stock_vehicle_id
    where ro.status in ('approved','in_progress','waiting_parts','ready') and ro.voided_at is null), '[]'::jsonb);
end;
$$;

create or replace function public.tech_clock(p_action text, p_repair_order uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_emp uuid := public.my_employee_id();
begin
  if public.staff_role() is null then raise exception 'Not authorized'; end if;
  if v_emp is null then raise exception 'Your login is not linked to an employee yet. Ask the owner to link it under Team.'; end if;
  if p_action in ('out','switch') then
    update public.time_entries set clock_out = now() where employee_id = v_emp and clock_out is null;
  end if;
  if p_action in ('in','switch') then
    if exists (select 1 from public.time_entries where employee_id = v_emp and clock_out is null) then
      raise exception 'You are already clocked in.';
    end if;
    insert into public.time_entries (employee_id, repair_order_id) values (v_emp, p_repair_order);
  end if;
  return public.tech_me();
end;
$$;

create or replace function public.tech_update_job(p_repair_order uuid, p_status text default null, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_who text := coalesce(auth.jwt() ->> 'email', 'tech');
begin
  if public.staff_role() is null then raise exception 'Not authorized'; end if;
  if p_status is not null and p_status not in ('in_progress','waiting_parts','ready') then
    raise exception 'Technicians can set In progress, Waiting on parts or Ready.';
  end if;
  update public.repair_orders set
    status = coalesce(p_status, status),
    internal_notes = case when nullif(trim(p_note), '') is null then internal_notes
      else concat_ws(E'\n', internal_notes, to_char(now() at time zone 'America/New_York', 'Mon DD HH12:MIam') || ' ' || split_part(v_who, '@', 1) || ': ' || left(trim(p_note), 1000)) end
  where id = p_repair_order and status in ('approved','in_progress','waiting_parts','ready');
end;
$$;

-- =========================================================== scheduled jobs (Vercel cron)
create or replace function public.cron_check(p_secret text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.app_secrets
                 where name = 'cron' and secret_hash = encode(sha256(convert_to(p_secret, 'UTF8')), 'hex')) then
    raise exception 'Not authorized';
  end if;
  perform set_config('autopro.cron', '1', true);
end;
$$;

create or replace function public.cron_digest(p_secret text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_books jsonb; v_today date := public.local_day(now()); v_days int[]; v_prev_start date; v_prev_end date;
  v_tax jsonb := null; v_reminders jsonb; v_bills jsonb; v_est jsonb := null; q date;
begin
  perform public.cron_check(p_secret);
  select value into v_books from public.settings where key = 'books';
  select coalesce(array_agg(x::int order by x::int), '{3,14,30}') into v_days
  from jsonb_array_elements_text(coalesce(v_books -> 'reminders' -> 'days_after_due', '[]')) x;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', ro.id, 'invoice_number', ro.invoice_number, 'balance', ro.balance_due, 'due_date', ro.due_date,
      'days_overdue', v_today - ro.due_date, 'token', ro.public_token,
      'name', coalesce(c.first_name, c.company), 'email', c.email, 'phone', c.phone)), '[]'::jsonb)
  into v_reminders
  from public.repair_orders ro join public.customers c on c.id = ro.customer_id
  where coalesce((v_books -> 'reminders' ->> 'enabled')::boolean, true)
    and ro.invoiced_at is not null and ro.voided_at is null and ro.doc_type = 'invoice' and ro.stock_vehicle_id is null
    and ro.balance_due > 0 and ro.due_date is not null
    and ro.reminder_count < coalesce(array_length(v_days, 1), 0)
    and v_today - ro.due_date >= v_days[ro.reminder_count + 1]
    and (ro.last_reminder_at is null or ro.last_reminder_at < now() - interval '2 days');

  -- Sales-tax reminder on the configured days (default 10th and 18th) for last month.
  v_prev_start := (date_trunc('month', v_today) - interval '1 month')::date;
  v_prev_end   := (date_trunc('month', v_today) - interval '1 day')::date;
  if extract(day from v_today)::int in (select (x)::int from jsonb_array_elements_text(coalesce(v_books -> 'tax_reminder_days', '[10,18]')) x)
     and not exists (select 1 from public.tax_periods where period_start = v_prev_start and status = 'filed') then
    v_tax := public.dr15_worksheet(v_prev_start, v_prev_end);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'vendor', vendor_name, 'total', total, 'due_date', due_date)), '[]'::jsonb)
  into v_bills from public.expenses
  where status = 'unpaid' and voided_at is null and due_date between v_today and v_today + 7;

  -- Federal estimated tax due dates: Apr 15, Jun 15, Sep 15, Jan 15.
  foreach q in array array[make_date(extract(year from v_today)::int, 4, 15), make_date(extract(year from v_today)::int, 6, 15),
                           make_date(extract(year from v_today)::int, 9, 15), make_date(extract(year from v_today)::int + 1, 1, 15)] loop
    if q - v_today in (7, 1) then v_est := jsonb_build_object('due_date', q); end if;
  end loop;

  return jsonb_build_object('today', v_today, 'reminders', v_reminders, 'sales_tax', v_tax, 'bills_due', v_bills,
                            'estimated_tax', v_est, 'remind_via', v_books -> 'reminders');
end;
$$;

create or replace function public.cron_mark_reminded(p_secret text, p_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.cron_check(p_secret);
  update public.repair_orders set reminder_count = reminder_count + 1, last_reminder_at = now() where id = any(p_ids);
end;
$$;

create or replace function public.next_occurrence(p_from date, p_rec text)
returns date language sql immutable set search_path = '' as $$
  select (p_from + case p_rec when 'weekly' then interval '7 days' when 'monthly' then interval '1 month'
                              when 'quarterly' then interval '3 months' else interval '1 year' end)::date;
$$;

create or replace function public.cron_run_recurring(p_secret text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; v_new uuid; v_today date := public.local_day(now()); v_inv int := 0; v_exp int := 0;
begin
  perform public.cron_check(p_secret);
  for r in select * from public.repair_orders where recurrence is not null and next_run_on <= v_today and voided_at is null for update loop
    insert into public.repair_orders (customer_id, vehicle_id, status, terms, po_number, ship_to, notify_party, customer_notes,
      tax_exempt, exempt_reason, discount_amount, technician, invoiced_at, due_date, created_by)
    values (r.customer_id, r.vehicle_id, 'completed', r.terms, r.po_number, r.ship_to, r.notify_party, r.customer_notes,
      r.tax_exempt, r.exempt_reason, r.discount_amount, r.technician, now(),
      v_today + coalesce(substring(coalesce(r.terms, '') from '\d+')::int, 0), 'recurring')
    returning id into v_new;
    insert into public.repair_order_items (repair_order_id, kind, item_name, description, part_id, part_number, quantity, unit_price,
      unit_cost, approved, position, labor_type, fee_code)
    select v_new, kind, item_name, description, null, part_number, quantity, unit_price, unit_cost, approved, position, labor_type, fee_code
    from public.repair_order_items where repair_order_id = r.id;
    update public.repair_orders set next_run_on = public.next_occurrence(r.next_run_on, r.recurrence) where id = r.id;
    v_inv := v_inv + 1;
  end loop;
  for r in select * from public.expenses where recurrence is not null and next_run_on <= v_today and voided_at is null for update loop
    insert into public.expenses (kind, vendor_id, vendor_name, expense_date, due_date, status, memo, paid_from_account_id, created_by)
    values ('bill', r.vendor_id, r.vendor_name, r.next_run_on, r.next_run_on + 7, 'unpaid', r.memo, r.paid_from_account_id, 'recurring')
    returning id into v_new;
    insert into public.expense_lines (expense_id, account_id, description, amount, position)
    select v_new, account_id, description, amount, position from public.expense_lines where expense_id = r.id and part_id is null;
    update public.expenses set total = (select coalesce(sum(amount), 0) from public.expense_lines where expense_id = v_new) where id = v_new;
    update public.expenses set next_run_on = public.next_occurrence(r.next_run_on, r.recurrence) where id = r.id;
    v_exp := v_exp + 1;
  end loop;
  return jsonb_build_object('invoices', v_inv, 'bills', v_exp);
end;
$$;

-- =========================================================== estimates: per-line approval
create or replace function public.respond_to_estimate_lines(p_token uuid, p_name text, p_item_ids uuid[])
returns text language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_status text; v_number bigint; v_approve boolean; v_total numeric; v_headers json;
        v_yes uuid[]; v_no uuid[];
begin
  if p_name is null or length(trim(p_name)) < 2 then raise exception 'Please type your full name to sign.'; end if;
  select id, status, number into v_id, v_status, v_number from public.repair_orders where public_token = p_token for update;
  if v_id is null then raise exception 'Estimate not found.'; end if;
  if v_status <> 'estimate' then return v_status; end if;

  select coalesce(array_agg(id) filter (where id = any(coalesce(p_item_ids, '{}'))), '{}'),
         coalesce(array_agg(id) filter (where not (id = any(coalesce(p_item_ids, '{}')))), '{}')
  into v_yes, v_no from public.repair_order_items where repair_order_id = v_id;
  v_approve := cardinality(v_yes) > 0;

  update public.repair_order_items set approved = (id = any(v_yes)) where repair_order_id = v_id;
  update public.repair_orders set
    status = case when v_approve then 'approved' else status end,
    approved_at = case when v_approve then now() end,
    declined_at = case when v_approve then null else now() end,
    approved_by_name = left(trim(p_name), 120)
  where id = v_id;
  select total into v_total from public.repair_orders where id = v_id;

  begin v_headers := current_setting('request.headers', true)::json; exception when others then v_headers := null; end;
  insert into public.estimate_approvals (repair_order_id, approved, signer_name, items_approved, items_declined, total_approved, ip_address, user_agent)
  values (v_id, v_approve, left(trim(p_name), 120), v_yes, v_no, case when v_approve then v_total end,
          left(split_part(coalesce(v_headers ->> 'x-forwarded-for', v_headers ->> 'x-real-ip', ''), ',', 1), 60),
          left(v_headers ->> 'user-agent', 300));

  insert into public.activity_log (actor, action, entity, entity_id, summary)
  values ('customer', case when v_approve then 'approve' else 'decline' end, 'repair_orders', v_id::text,
          'Customer ' || case when v_approve then 'approved ' || cardinality(v_yes) || ' of ' || (cardinality(v_yes) + cardinality(v_no)) || ' lines on'
                              else 'declined' end || ' estimate #' || v_number || ' (' || left(trim(p_name), 120) || ')');
  return case when v_approve then 'approved' else 'declined' end;
end;
$$;
revoke all on function public.respond_to_estimate_lines(uuid, text, uuid[]) from public;
grant execute on function public.respond_to_estimate_lines(uuid, text, uuid[]) to anon, authenticated;

-- Old all-or-nothing entry point now records the signature the same way.
create or replace function public.respond_to_estimate(p_token uuid, p_approve boolean, p_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[];
begin
  select coalesce(array_agg(i.id), '{}') into v_ids
  from public.repair_orders ro join public.repair_order_items i on i.repair_order_id = ro.id
  where ro.public_token = p_token and p_approve;
  return public.respond_to_estimate_lines(p_token, p_name, v_ids);
end;
$$;

-- Customer page: include tax split, state fees and estimate expiry.
create or replace function public.get_public_repair_order(p_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'shop', (select value from public.settings where key = 'shop'),
    'order', jsonb_build_object(
      'number', ro.number, 'invoice_number', ro.invoice_number, 'status', ro.status, 'doc_type', ro.doc_type,
      'terms', ro.terms, 'ship_to', ro.ship_to, 'notify_party', ro.notify_party, 'po_number', ro.po_number,
      'complaint', ro.complaint, 'diagnosis', ro.diagnosis, 'recommendations', ro.recommendations,
      'customer_notes', ro.customer_notes, 'mileage_in', ro.mileage_in,
      'mileage_out', ro.mileage_out, 'tax_rate', ro.tax_rate, 'tax_state', ro.tax_state, 'tax_surtax', ro.tax_surtax,
      'surtax_county', ro.surtax_county, 'govt_fees_total', ro.govt_fees_total, 'tax_exempt', ro.tax_exempt,
      'customer_supplied_parts', ro.customer_supplied_parts, 'valid_until', ro.valid_until,
      'discount_amount', ro.discount_amount, 'labor_total', ro.labor_total,
      'parts_total', ro.parts_total, 'other_total', ro.other_total,
      'tax_amount', ro.tax_amount, 'total', ro.total, 'amount_paid', ro.amount_paid,
      'balance_due', ro.balance_due, 'payment_status', ro.payment_status,
      'approved_at', ro.approved_at, 'approved_by_name', ro.approved_by_name,
      'declined_at', ro.declined_at, 'invoiced_at', ro.invoiced_at, 'voided_at', ro.voided_at,
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
        'id', i.id, 'kind', i.kind, 'item_name', i.item_name, 'description', i.description, 'fee_code', i.fee_code,
        'part_number', i.part_number, 'quantity', i.quantity, 'unit_price', i.unit_price,
        'taxable', i.taxable, 'approved', i.approved, 'amount', round(i.quantity * i.unit_price, 2))
        order by i.position, i.created_at)
      from public.repair_order_items i where i.repair_order_id = ro.id), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object('amount', p.amount, 'method', p.method,
                                          'received_at', p.received_at) order by p.received_at)
      from public.payments p where p.repair_order_id = ro.id and p.voided_at is null and p.method <> 'credit_memo'), '[]'::jsonb)
  )
  from public.repair_orders ro
  left join public.customers c on c.id = ro.customer_id
  left join public.customer_vehicles v on v.id = ro.vehicle_id
  where ro.public_token = p_token and ro.status <> 'cancelled' and ro.stock_vehicle_id is null;
$$;

-- =========================================================== customers: merge & search
create or replace function public.merge_customers(p_keep uuid, p_drop uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_keep = p_drop then raise exception 'Pick two different customers.'; end if;
  update public.repair_orders     set customer_id = p_keep where customer_id = p_drop;
  update public.customer_vehicles set customer_id = p_keep where customer_id = p_drop;
  update public.vehicle_deals     set customer_id = p_keep where customer_id = p_drop;
  update public.appointments      set customer_id = p_keep where customer_id = p_drop;
  update public.notifications     set customer_id = p_keep where customer_id = p_drop;
  update public.documents         set entity_id = p_keep where entity_type = 'customer' and entity_id = p_drop;
  update public.journal_lines     set customer_id = p_keep where customer_id = p_drop;
  update public.customers k set
    email = coalesce(k.email, d.email), phone = coalesce(k.phone, d.phone), alternate_phone = coalesce(k.alternate_phone, d.alternate_phone),
    address_street = coalesce(k.address_street, d.address_street), address_city = coalesce(k.address_city, d.address_city),
    address_state = coalesce(k.address_state, d.address_state), address_zip = coalesce(k.address_zip, d.address_zip),
    company = coalesce(k.company, d.company), county = coalesce(k.county, d.county),
    notes = concat_ws(E'\n', k.notes, d.notes)
  from public.customers d where k.id = p_keep and d.id = p_drop;
  update public.customers set is_active = false, merged_into = p_keep where id = p_drop;
  insert into public.activity_log (actor, action, entity, entity_id, summary)
  values (coalesce(auth.jwt() ->> 'email', 'admin'), 'merge', 'customers', p_keep::text, 'Merged a duplicate customer record');
end;
$$;
grant execute on function public.merge_customers(uuid, uuid) to authenticated;

create or replace function public.search_all(p_q text)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare q text := trim(coalesce(p_q, '')); digits text := regexp_replace(coalesce(p_q, ''), '\D', '', 'g'); like_q text;
begin
  if length(q) < 2 then return '{}'::jsonb; end if;
  like_q := '%' || replace(replace(q, '%', ''), '_', '') || '%';
  return jsonb_build_object(
    'customers', coalesce((select jsonb_agg(x) from (
      select id, first_name, last_name, company, phone, email from public.customers
      where coalesce(is_active, true) and (
        concat_ws(' ', first_name, last_name) ilike like_q or company ilike like_q or email ilike like_q
        or (length(digits) >= 3 and regexp_replace(coalesce(phone, '') || ' ' || coalesce(alternate_phone, ''), '\D', '', 'g') like '%' || digits || '%'))
      order by last_name nulls last limit 8) x), '[]'),
    'vehicles', coalesce((select jsonb_agg(x) from (
      select v.id, v.customer_id, v.year, v.make, v.model, v.license_plate, v.vin, c.first_name, c.last_name, c.company
      from public.customer_vehicles v left join public.customers c on c.id = v.customer_id
      where v.license_plate ilike like_q or v.vin ilike like_q or concat_ws(' ', v.year, v.make, v.model) ilike like_q
      limit 8) x), '[]'),
    'orders', coalesce((select jsonb_agg(x) from (
      select id, number, invoice_number, status, total, doc_type from public.repair_orders
      where length(digits) >= 3 and (number::text = digits or invoice_number::text = digits)
      limit 5) x), '[]'));
end;
$$;
grant execute on function public.search_all(text) to authenticated;

do $$
declare f text;
begin
  foreach f in array array['my_employee_id()','tech_me()','tech_jobs()','tech_clock(text,uuid)','tech_update_job(uuid,text,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  revoke all on function public.cron_check(text) from public, anon, authenticated;
  foreach f in array array['cron_digest(text)','cron_mark_reminded(text,uuid[])','cron_run_recurring(text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;
revoke all on function public.next_occurrence(date, text) from public, anon, authenticated;
