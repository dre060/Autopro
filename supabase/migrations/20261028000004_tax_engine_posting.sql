-- Florida sales-tax engine + automatic double-entry posting.
-- Every invoice, payment, deposit, expense/bill, vehicle cost, vehicle deal,
-- pay run, DR-15 payment and estimated-tax payment writes a balanced journal
-- entry. Voids post a reversing entry dated the void date.

-- =========================================================== recalc guard
create or replace function public.trg_recalc_from_child()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('autopro.in_recalc', true) = '1' then return null; end if;
  if tg_table_name = 'payments' then
    if coalesce(new.repair_order_id, old.repair_order_id) is not null then
      perform public.recalc_repair_order(coalesce(new.repair_order_id, old.repair_order_id));
    end if;
    if tg_op = 'UPDATE' and old.repair_order_id is distinct from new.repair_order_id and old.repair_order_id is not null then
      perform public.recalc_repair_order(old.repair_order_id);
    end if;
    if coalesce(new.deal_id, old.deal_id) is not null then
      perform public.refresh_deal_paid(coalesce(new.deal_id, old.deal_id));
    end if;
  else
    perform public.recalc_repair_order(coalesce(new.repair_order_id, old.repair_order_id));
  end if;
  return null;
end;
$$;

create or replace function public.trg_recalc_self()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('autopro.in_recalc', true) = '1' then return null; end if;
  perform public.recalc_repair_order(new.id);
  return null;
end;
$$;
drop trigger if exists repair_orders_recalc on public.repair_orders;
create trigger repair_orders_recalc after insert or update of discount_amount, tax_exempt, customer_supplied_parts, invoiced_at, stock_vehicle_id
  on public.repair_orders for each row execute function public.trg_recalc_self();

-- Internal repair orders (reconditioning a car for sale) don't use invoice numbers.
create or replace function public.trg_assign_invoice_number()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.invoiced_at is not null and new.invoice_number is null and new.stock_vehicle_id is null then
    new.invoice_number := nextval('public.invoice_number_seq');
  end if;
  return new;
end;
$$;

-- =========================================================== line taxability
-- Florida: when the shop supplies any part, the whole job (parts, labor,
-- sublet, shop fees) is taxable. Labor-only jobs with customer-supplied parts
-- are not taxable when separately stated. Towing and the state tire/battery
-- fees are not taxable. Each fee's treatment comes from settings.books.fees.
create or replace function public.item_taxable(p_kind text, p_fee_code text, p_has_parts boolean, p_exempt boolean, p_fees jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select case
    when p_exempt then false
    when p_kind = 'part' then true
    when p_kind in ('labor','sublet') then p_has_parts
    when p_kind = 'fee' then case coalesce(p_fees -> coalesce(p_fee_code, 'other') ->> 'tax', 'follow_job')
        when 'always' then true when 'never' then false else p_has_parts end
    else false end;
$$;

create or replace function public.recalc_repair_order(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.repair_orders%rowtype;
  v_day date; v_books jsonb; v_fees jsonb; v_county text;
  v_state numeric; v_sur numeric; v_cap numeric; v_capbasis text;
  v_has_parts boolean;
  v_labor numeric; v_parts numeric; v_other numeric; v_govt numeric; v_cost numeric;
  v_taxable numeric; v_sur_raw numeric;
  v_sub numeric; v_disc numeric; v_disc_tax numeric; v_state_base numeric; v_sur_base numeric;
  v_tax numeric; v_sur_tax numeric; v_total numeric; v_paid numeric;
begin
  select * into r from public.repair_orders where id = p_id;
  if not found then return; end if;

  v_day      := coalesce(public.local_day(r.invoiced_at), public.local_day(now()));
  select value into v_books from public.settings where key = 'books';
  v_fees     := coalesce(v_books -> 'fees', '{}'::jsonb);
  v_county   := coalesce(nullif(v_books ->> 'shop_county', ''), 'Lake');
  v_capbasis := coalesce(v_books ->> 'surtax_cap_basis', 'line');
  v_state    := coalesce(public.rate('fl_state_rate', v_day), 0.06);
  v_sur      := coalesce(public.rate('surtax', v_day, v_county), 0);
  v_cap      := coalesce(public.rate('surtax_item_cap', v_day), 5000);

  v_has_parts := not r.customer_supplied_parts and exists (
    select 1 from public.repair_order_items where repair_order_id = p_id and approved and kind = 'part');

  -- Store each line's taxability so documents and reports can show it.
  perform set_config('autopro.in_recalc', '1', true);
  update public.repair_order_items i
  set taxable = public.item_taxable(i.kind, i.fee_code, v_has_parts, r.tax_exempt, v_fees)
  where i.repair_order_id = p_id
    and i.taxable is distinct from public.item_taxable(i.kind, i.fee_code, v_has_parts, r.tax_exempt, v_fees);
  perform set_config('autopro.in_recalc', '0', true);

  select
    coalesce(sum(amt) filter (where kind = 'labor'), 0),
    coalesce(sum(amt) filter (where kind = 'part'), 0),
    coalesce(sum(amt) filter (where kind in ('fee','sublet')), 0),
    coalesce(sum(amt) filter (where kind = 'fee' and fee_code in ('tire','battery')), 0),
    coalesce(sum(round(quantity * unit_cost, 2)), 0),
    coalesce(sum(amt) filter (where taxable), 0),
    coalesce(sum(least(amt, v_cap)) filter (where taxable), 0)
  into v_labor, v_parts, v_other, v_govt, v_cost, v_taxable, v_sur_raw
  from (select *, round(quantity * unit_price, 2) amt from public.repair_order_items
        where repair_order_id = p_id and approved) x;

  v_sub  := v_labor + v_parts + v_other - v_govt;         -- sales, before discount and state fees
  v_disc := least(r.discount_amount, v_sub);
  v_disc_tax   := case when v_sub > 0 then round(v_disc * v_taxable / v_sub, 2) else 0 end;
  v_state_base := greatest(v_taxable - v_disc_tax, 0);
  v_sur_base   := case
    when v_capbasis = 'invoice' then least(v_state_base, v_cap)
    when v_taxable > 0 then round(v_sur_raw * v_state_base / v_taxable, 2)
    else 0 end;

  -- Round once per invoice, half up (Florida bracket rounding).
  v_tax     := round(v_state_base * v_state + v_sur_base * v_sur, 2);
  v_sur_tax := round(v_sur_base * v_sur, 2);
  v_total   := v_sub - v_disc + v_govt + v_tax;

  select coalesce(sum(amount), 0) into v_paid
  from public.payments where repair_order_id = p_id and voided_at is null;

  perform set_config('autopro.in_recalc', '1', true);
  update public.repair_orders set
    labor_total     = v_labor,
    parts_total     = v_parts,
    other_total     = v_other,
    govt_fees_total = v_govt,
    taxable_total   = v_state_base,
    exempt_total    = v_sub - v_disc - v_state_base,
    tax_rate        = case when r.tax_exempt then 0 else v_state + v_sur end,
    tax_state       = v_tax - v_sur_tax,
    tax_surtax      = v_sur_tax,
    surtax_county   = v_county,
    surtax_over_cap = v_state_base - v_sur_base,
    tax_amount      = v_tax,
    total           = v_total,
    cost_total      = v_cost,
    amount_paid     = v_paid,
    balance_due     = v_total - v_paid,
    payment_status  = case
      when v_paid < 0 then 'refunded'
      when v_paid = 0 then 'unpaid'
      when v_paid >= v_total and v_total > 0 then 'paid'
      else 'partial' end
  where id = p_id;
  perform set_config('autopro.in_recalc', '0', true);
end;
$$;
revoke all on function public.recalc_repair_order(uuid) from public, anon, authenticated;

-- =========================================================== posting core
create or replace function public.post_entry(p_type text, p_source uuid, p_date date, p_memo text, p_lines jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; n int;
begin
  delete from public.journal_entries where source_type = p_type and source_id = p_source;
  if p_lines is null or p_date is null or jsonb_array_length(p_lines) = 0 then return null; end if;

  insert into public.journal_entries (entry_date, source_type, source_id, memo)
  values (p_date, p_type, p_source, p_memo) returning id into v_id;

  insert into public.journal_lines (entry_id, account_id, debit, credit, memo, customer_id, vendor_id, vehicle_id)
  select v_id, public.acct(l.acct),
         greatest(coalesce(l.dr,0) - coalesce(l.cr,0), 0),
         greatest(coalesce(l.cr,0) - coalesce(l.dr,0), 0),
         l.memo, l.customer_id, l.vendor_id, l.vehicle_id
  from jsonb_to_recordset(p_lines) as l(acct text, dr numeric, cr numeric, memo text, customer_id uuid, vendor_id uuid, vehicle_id uuid)
  where round(coalesce(l.dr,0) - coalesce(l.cr,0), 2) <> 0;
  get diagnostics n = row_count;
  if n = 0 then delete from public.journal_entries where id = v_id; return null; end if;
  return v_id;
end;
$$;

-- Reversal of an entry's lines, used for voids.
create or replace function public.post_reversal(p_of_type text, p_source uuid, p_type text, p_date date, p_memo text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_lines jsonb;
begin
  select jsonb_agg(jsonb_build_object('acct', a.code, 'dr', l.credit, 'cr', l.debit, 'memo', l.memo,
                                      'customer_id', l.customer_id, 'vendor_id', l.vendor_id, 'vehicle_id', l.vehicle_id))
  into v_lines
  from public.journal_entries e join public.journal_lines l on l.entry_id = e.id join public.accounts a on a.id = l.account_id
  where e.source_type = p_of_type and e.source_id = p_source;
  perform public.post_entry(p_type, p_source, case when p_date is null then null else p_date end, p_memo, v_lines);
end;
$$;

-- =========================================================== invoices / credit memos
create or replace function public.post_repair_order(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.repair_orders%rowtype; s int; v_day date; v_memo text;
  v_fees numeric; v_sublet numeric; v_parts_cost numeric; v_sublet_cost numeric; v_disc numeric; v_lines jsonb;
begin
  select * into r from public.repair_orders where id = p_id;
  if not found or r.invoiced_at is null then
    perform public.post_entry('invoice', p_id, null, null, null);
    perform public.post_entry('invoice_void', p_id, null, null, null);
    return;
  end if;

  s := case when r.doc_type = 'credit_memo' then -1 else 1 end;
  v_day := public.local_day(r.invoiced_at);
  select
    coalesce(sum(round(quantity*unit_price,2)) filter (where kind = 'fee' and coalesce(fee_code,'') not in ('tire','battery')), 0),
    coalesce(sum(round(quantity*unit_price,2)) filter (where kind = 'sublet'), 0),
    coalesce(sum(round(quantity*unit_cost,2))  filter (where kind = 'part'), 0),
    coalesce(sum(round(quantity*unit_cost,2))  filter (where kind = 'sublet'), 0)
  into v_fees, v_sublet, v_parts_cost, v_sublet_cost
  from public.repair_order_items where repair_order_id = p_id and approved;

  if r.stock_vehicle_id is not null then
    -- Reconditioning a car we own: parts/sublet cost goes into the car's cost basis.
    v_memo := 'Internal RO #' || r.number;
    v_lines := jsonb_build_array(
      jsonb_build_object('acct','1210','dr', v_parts_cost + v_sublet_cost, 'vehicle_id', r.stock_vehicle_id),
      jsonb_build_object('acct','1200','cr', v_parts_cost),
      jsonb_build_object('acct','5010','cr', v_sublet_cost));
  else
    v_memo := case when s < 0 then 'Credit memo #' else 'Invoice #' end || coalesce(r.invoice_number::text, r.number::text);
    -- discount actually applied = sales - (total - tax - state fees)
    v_disc := (r.labor_total + r.parts_total + r.other_total - r.govt_fees_total) - (r.total - r.tax_amount - r.govt_fees_total);
    v_lines := jsonb_build_array(
      jsonb_build_object('acct','1100','dr', s * r.total, 'customer_id', r.customer_id),
      jsonb_build_object('acct','4000','cr', s * r.labor_total),
      jsonb_build_object('acct','4010','cr', s * r.parts_total),
      jsonb_build_object('acct','4020','cr', s * v_fees),
      jsonb_build_object('acct','4030','cr', s * v_sublet),
      jsonb_build_object('acct','4040','dr', s * v_disc),
      jsonb_build_object('acct','2100','cr', s * r.tax_amount, 'memo', 'Sales tax'),
      jsonb_build_object('acct','2110','cr', s * r.govt_fees_total, 'memo', 'Tire/battery fees'),
      jsonb_build_object('acct','5000','dr', s * v_parts_cost),
      jsonb_build_object('acct','1200','cr', s * v_parts_cost));
  end if;

  perform public.post_entry('invoice', p_id, v_day, v_memo, v_lines);
  if r.voided_at is not null then
    perform public.post_reversal('invoice', p_id, 'invoice_void', public.local_day(r.voided_at), 'Void ' || v_memo);
  else
    perform public.post_entry('invoice_void', p_id, null, null, null);
  end if;
end;
$$;

create or replace function public.trg_post_repair_order()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.post_repair_order(new.id);
  return null;
end;
$$;
drop trigger if exists repair_orders_post on public.repair_orders;
create trigger repair_orders_post after insert or update on public.repair_orders
  for each row execute function public.trg_post_repair_order();

-- =========================================================== payments & deposits
create or replace function public.post_payment(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.payments%rowtype; v_cust uuid; v_memo text;
begin
  select * into p from public.payments where id = p_id;
  if not found or p.method = 'credit_memo' then   -- applying a credit memo moves no money
    perform public.post_entry('payment', p_id, null, null, null);
    perform public.post_entry('payment_void', p_id, null, null, null);
    return;
  end if;
  if p.repair_order_id is not null then
    select customer_id, 'Payment – ' || coalesce('invoice #' || invoice_number, 'RO #' || number)
    into v_cust, v_memo from public.repair_orders where id = p.repair_order_id;
  else
    select customer_id, 'Payment – deal #' || number into v_cust, v_memo from public.vehicle_deals where id = p.deal_id;
  end if;
  perform public.post_entry('payment', p_id, public.local_day(p.received_at), v_memo || ' (' || p.method || ')', jsonb_build_array(
    jsonb_build_object('acct','1050','dr', p.amount),
    jsonb_build_object('acct','1100','cr', p.amount, 'customer_id', v_cust)));
  if p.voided_at is not null then
    perform public.post_reversal('payment', p_id, 'payment_void', public.local_day(p.voided_at), 'Void ' || v_memo);
  else
    perform public.post_entry('payment_void', p_id, null, null, null);
  end if;
end;
$$;

create or replace function public.post_deposit(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.deposits%rowtype; v_sum numeric; v_code text;
begin
  select * into d from public.deposits where id = p_id;
  if not found then return; end if;
  select coalesce(sum(amount), 0) into v_sum from public.payments where deposit_id = p_id and voided_at is null;
  update public.deposits set total = v_sum where id = p_id and total is distinct from v_sum;
  select code into v_code from public.accounts where id = d.account_id;
  perform public.post_entry('deposit', p_id, d.deposit_date, coalesce(d.memo, 'Bank deposit'), jsonb_build_array(
    jsonb_build_object('acct', v_code, 'dr', v_sum),
    jsonb_build_object('acct','1050','cr', v_sum)));
end;
$$;

create or replace function public.trg_post_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.post_payment(new.id);
  if new.deposit_id is not null then perform public.post_deposit(new.deposit_id); end if;
  if tg_op = 'UPDATE' and old.deposit_id is not null and old.deposit_id is distinct from new.deposit_id then
    perform public.post_deposit(old.deposit_id);
  end if;
  return null;
end;
$$;
drop trigger if exists payments_post on public.payments;
create trigger payments_post after insert or update on public.payments
  for each row execute function public.trg_post_payment();

create or replace function public.trg_post_deposit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if pg_trigger_depth() > 1 then return null; end if;
  perform public.post_deposit(new.id);
  return null;
end;
$$;
drop trigger if exists deposits_post on public.deposits;
create trigger deposits_post after insert or update on public.deposits
  for each row execute function public.trg_post_deposit();

-- =========================================================== expenses & bills
create or replace function public.post_expense(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.expenses%rowtype; v_lines jsonb; v_sum numeric; v_use_acct text; v_paid_code text; v_memo text;
begin
  select * into e from public.expenses where id = p_id;
  if not found then return; end if;
  v_memo := coalesce(e.vendor_name, (select name from public.vendors where id = e.vendor_id), 'Expense')
            || coalesce(' #' || e.ref_number, '');

  select coalesce(jsonb_agg(jsonb_build_object('acct', a.code, 'dr', l.amount, 'memo', l.description, 'vendor_id', e.vendor_id) order by l.position), '[]'::jsonb),
         coalesce(sum(l.amount), 0)
  into v_lines, v_sum
  from public.expense_lines l join public.accounts a on a.id = l.account_id
  where l.expense_id = p_id;

  -- Use tax owed on untaxed purchases the shop consumes: added to the item's cost.
  if e.use_tax_amount <> 0 then
    select a.code into v_use_acct from public.expense_lines l join public.accounts a on a.id = l.account_id
    where l.expense_id = p_id order by l.use_taxable desc, l.amount desc limit 1;
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('acct', coalesce(v_use_acct, '6900'), 'dr', e.use_tax_amount, 'memo', 'Use tax'),
      jsonb_build_object('acct', '2120', 'cr', e.use_tax_amount, 'memo', 'Use tax'));
  end if;
  v_lines := v_lines || jsonb_build_array(jsonb_build_object('acct','2000','cr', v_sum, 'vendor_id', e.vendor_id));

  perform public.post_entry('bill', p_id, e.expense_date, v_memo, v_lines);

  if e.status = 'paid' then
    select code into v_paid_code from public.accounts where id = e.paid_from_account_id;
    perform public.post_entry('bill_payment', p_id, coalesce(e.paid_at, e.expense_date), 'Paid ' || v_memo, jsonb_build_array(
      jsonb_build_object('acct','2000','dr', v_sum, 'vendor_id', e.vendor_id),
      jsonb_build_object('acct', coalesce(v_paid_code, '1010'), 'cr', v_sum)));
  else
    perform public.post_entry('bill_payment', p_id, null, null, null);
  end if;

  if e.voided_at is not null then
    perform public.post_reversal('bill', p_id, 'bill_void', public.local_day(e.voided_at), 'Void ' || v_memo);
    perform public.post_reversal('bill_payment', p_id, 'bill_payment_void', public.local_day(e.voided_at), 'Void payment ' || v_memo);
  else
    perform public.post_entry('bill_void', p_id, null, null, null);
    perform public.post_entry('bill_payment_void', p_id, null, null, null);
  end if;
end;
$$;

create or replace function public.trg_post_expense()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'expenses' then
    perform public.post_expense(new.id);
  else
    perform public.post_expense(coalesce(new.expense_id, old.expense_id));
    -- receiving stock from a vendor bill
    if tg_op in ('UPDATE','DELETE') and old.part_id is not null and coalesce(old.quantity,0) <> 0 then
      update public.parts set quantity_on_hand = quantity_on_hand - old.quantity where id = old.part_id;
      insert into public.part_movements (part_id, quantity, kind, source_type, source_id, note)
      values (old.part_id, -old.quantity, 'adjust', 'expense', old.expense_id, 'Bill line changed');
    end if;
    if tg_op in ('INSERT','UPDATE') and new.part_id is not null and coalesce(new.quantity,0) <> 0 then
      update public.parts set quantity_on_hand = quantity_on_hand + new.quantity,
        unit_cost = round(new.amount / new.quantity, 2)
      where id = new.part_id;
      insert into public.part_movements (part_id, quantity, kind, unit_cost, source_type, source_id)
      values (new.part_id, new.quantity, 'receive', round(new.amount / new.quantity, 2), 'expense', new.expense_id);
    end if;
  end if;
  return null;
end;
$$;
drop trigger if exists expenses_post on public.expenses;
create trigger expenses_post after insert or update on public.expenses
  for each row execute function public.trg_post_expense();
drop trigger if exists expense_lines_post on public.expense_lines;
create trigger expense_lines_post after insert or update or delete on public.expense_lines
  for each row execute function public.trg_post_expense();

-- =========================================================== vehicles
create or replace function public.vehicle_cost_basis(p_vehicle uuid)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce((select sum(amount) from public.vehicle_costs where vehicle_id = p_vehicle), 0)
       + coalesce((select sum(i.quantity * i.unit_cost)
                   from public.repair_orders ro join public.repair_order_items i on i.repair_order_id = ro.id
                   where ro.stock_vehicle_id = p_vehicle and ro.invoiced_at is not null and ro.voided_at is null
                     and i.approved and i.kind in ('part','sublet')), 0);
$$;

create or replace function public.post_vehicle_cost(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.vehicle_costs%rowtype; v_code text;
begin
  select * into c from public.vehicle_costs where id = p_id;
  if not found or c.deal_id is not null then      -- trade-ins are posted by the deal
    perform public.post_entry('vehicle_cost', p_id, null, null, null);
    return;
  end if;
  select code into v_code from public.accounts where id = c.paid_from_account_id;
  perform public.post_entry('vehicle_cost', p_id, c.cost_date, 'Vehicle ' || replace(c.category, '_', ' ') || coalesce(' – ' || c.description, ''),
    jsonb_build_array(
      jsonb_build_object('acct','1210','dr', c.amount, 'vehicle_id', c.vehicle_id, 'vendor_id', c.vendor_id),
      jsonb_build_object('acct', coalesce(v_code, '1010'), 'cr', c.amount, 'vendor_id', c.vendor_id)));
end;
$$;

create or replace function public.trg_post_vehicle_cost()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    perform public.post_entry('vehicle_cost', old.id, null, null, null);
  else
    perform public.post_vehicle_cost(new.id);
  end if;
  return null;
end;
$$;
drop trigger if exists vehicle_costs_post on public.vehicle_costs;
create trigger vehicle_costs_post after insert or update or delete on public.vehicle_costs
  for each row execute function public.trg_post_vehicle_cost();

-- Deal math (before save). Florida: 6% state on price + dealer fee + taxable
-- add-ons, less trade-in; surtax at the buyer's county rate on the first $5,000.
create or replace function public.trg_calc_deal()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_addon numeric; v_addon_tax numeric; v_addon_cost numeric; v_pass numeric;
        v_state numeric; v_sur numeric; v_cap numeric; v_sur_base numeric;
begin
  select coalesce(sum((a ->> 'price')::numeric), 0),
         coalesce(sum((a ->> 'price')::numeric) filter (where coalesce((a ->> 'taxable')::boolean, true)), 0),
         coalesce(sum(coalesce((a ->> 'cost')::numeric, 0)), 0)
  into v_addon, v_addon_tax, v_addon_cost
  from jsonb_array_elements(coalesce(new.addons, '[]'::jsonb)) a;

  v_pass  := new.title_fee + new.registration_fee + new.other_passthrough;
  v_state := coalesce(public.rate('fl_state_rate', new.sale_date), 0.06);
  v_sur   := case when new.out_of_state then 0 else coalesce(public.rate('surtax', new.sale_date, coalesce(new.buyer_county, '')), 0) end;
  v_cap   := coalesce(public.rate('surtax_item_cap', new.sale_date), 5000);

  new.taxable_amount := case when new.tax_exempt then 0
                             else greatest(new.sale_price + new.doc_fee + v_addon_tax - new.trade_allowance, 0) end;
  v_sur_base := least(new.taxable_amount, v_cap);
  if new.tax_override is not null then
    new.total_tax := new.tax_override; new.surtax := 0; new.state_tax := new.tax_override;
  else
    new.total_tax := round(new.taxable_amount * v_state + v_sur_base * v_sur, 2);
    new.surtax    := round(v_sur_base * v_sur, 2);
    new.state_tax := new.total_tax - new.surtax;
  end if;
  new.addon_cost := v_addon_cost;
  new.total_due  := new.sale_price + new.doc_fee + v_addon + new.total_tax + v_pass + new.trade_payoff - new.trade_allowance;

  if new.status = 'final' and (tg_op = 'INSERT' or old.status <> 'final' or new.cost_basis = 0) then
    new.cost_basis := public.vehicle_cost_basis(new.vehicle_id);
    new.finalized_at := coalesce(new.finalized_at, now());
  end if;
  if new.status = 'void' and new.voided_at is null then new.voided_at := now(); end if;
  new.gross_profit := new.sale_price + new.doc_fee + v_addon - v_addon_cost - new.cost_basis;
  return new;
end;
$$;
drop trigger if exists vehicle_deals_calc on public.vehicle_deals;
create trigger vehicle_deals_calc before insert or update on public.vehicle_deals
  for each row execute function public.trg_calc_deal();

create or replace function public.post_deal(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.vehicle_deals%rowtype; v_addon numeric; v_pass numeric; v_memo text;
begin
  select * into d from public.vehicle_deals where id = p_id;
  if not found or d.status = 'draft' then
    perform public.post_entry('deal', p_id, null, null, null);
    perform public.post_entry('deal_cogs', p_id, null, null, null);
    perform public.post_entry('deal_void', p_id, null, null, null);
    perform public.post_entry('deal_cogs_void', p_id, null, null, null);
    return;
  end if;
  select coalesce(sum((a ->> 'price')::numeric), 0) into v_addon
  from jsonb_array_elements(d.addons) a;
  v_pass := d.title_fee + d.registration_fee + d.other_passthrough;
  v_memo := 'Vehicle sale – deal #' || d.number;

  perform public.post_entry('deal', p_id, d.sale_date, v_memo, jsonb_build_array(
    jsonb_build_object('acct','1100','dr', d.total_due, 'customer_id', d.customer_id),
    jsonb_build_object('acct','1210','dr', d.trade_allowance, 'vehicle_id', d.trade_vehicle_id, 'memo', 'Trade-in'),
    jsonb_build_object('acct','4100','cr', d.sale_price, 'vehicle_id', d.vehicle_id),
    jsonb_build_object('acct','4110','cr', d.doc_fee),
    jsonb_build_object('acct','4120','cr', v_addon),
    jsonb_build_object('acct','2100','cr', d.total_tax, 'memo', 'Sales tax'),
    jsonb_build_object('acct','2600','cr', v_pass, 'memo', 'Title / registration'),
    jsonb_build_object('acct','2700','cr', d.trade_payoff, 'memo', 'Trade-in payoff owed')));
  perform public.post_entry('deal_cogs', p_id, d.sale_date, 'Cost of deal #' || d.number, jsonb_build_array(
    jsonb_build_object('acct','5100','dr', d.cost_basis + d.addon_cost, 'vehicle_id', d.vehicle_id),
    jsonb_build_object('acct','1210','cr', d.cost_basis, 'vehicle_id', d.vehicle_id),
    jsonb_build_object('acct','2000','cr', d.addon_cost, 'memo', 'Add-on product cost')));

  if d.status = 'void' then
    perform public.post_reversal('deal', p_id, 'deal_void', public.local_day(d.voided_at), 'Void ' || v_memo);
    perform public.post_reversal('deal_cogs', p_id, 'deal_cogs_void', public.local_day(d.voided_at), 'Void cost of deal #' || d.number);
  else
    perform public.post_entry('deal_void', p_id, null, null, null);
    perform public.post_entry('deal_cogs_void', p_id, null, null, null);
  end if;
end;
$$;

create or replace function public.refresh_deal_paid(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.vehicle_deals d set amount_paid = x.s
  from (select coalesce(sum(amount), 0) s from public.payments where deal_id = p_id and voided_at is null) x
  where d.id = p_id and d.amount_paid is distinct from x.s;
end;
$$;

create or replace function public.trg_post_deal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- trade-in: the traded car enters inventory at the allowance (posted by the deal itself)
  delete from public.vehicle_costs where deal_id = new.id;
  if new.status = 'final' and new.trade_vehicle_id is not null and new.trade_allowance > 0 then
    insert into public.vehicle_costs (vehicle_id, cost_date, category, description, amount, deal_id)
    values (new.trade_vehicle_id, new.sale_date, 'purchase', 'Trade-in on deal #' || new.number, new.trade_allowance, new.id);
  end if;
  if new.status = 'final' then
    update public.vehicles set status = 'sold', sold_date = new.sale_date, sale_price = new.sale_price
    where id = new.vehicle_id and status is distinct from 'sold';
  elsif tg_op = 'UPDATE' and new.status = 'void' and old.status = 'final' then
    update public.vehicles set status = 'available', sold_date = null where id = new.vehicle_id;
  end if;
  perform public.post_deal(new.id);
  return null;
end;
$$;
drop trigger if exists vehicle_deals_post on public.vehicle_deals;
create trigger vehicle_deals_post after insert or update on public.vehicle_deals
  for each row execute function public.trg_post_deal();

drop trigger if exists payments_recalc on public.payments;
create trigger payments_recalc after insert or delete or update on public.payments
  for each row execute function public.trg_recalc_from_child();

-- =========================================================== payroll
create or replace function public.post_pay_run(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.pay_runs%rowtype; v_lines jsonb := '[]'::jsonb; s record; v_code text;
begin
  select * into r from public.pay_runs where id = p_id;
  if not found or r.status = 'draft' then
    perform public.post_entry('payroll', p_id, null, null, null);
    perform public.post_entry('payroll_void', p_id, null, null, null);
    return;
  end if;
  select code into v_code from public.accounts where id = r.paid_from_account_id;
  v_code := coalesce(v_code, '1010');
  for s in select * from public.pay_stubs where pay_run_id = p_id loop
    if s.worker_type = '1099' then
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('acct','6080','dr', s.gross),
        jsonb_build_object('acct','6900','dr', s.reimbursement, 'memo', 'Reimbursement'),
        jsonb_build_object('acct', v_code, 'cr', s.net_pay));
    else
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('acct','6090','dr', s.gross),
        jsonb_build_object('acct','6900','dr', s.reimbursement, 'memo', 'Reimbursement'),
        jsonb_build_object('acct','6095','dr', s.ss_employer + s.medicare_employer + s.futa + s.suta),
        jsonb_build_object('acct', v_code, 'cr', s.net_pay),
        jsonb_build_object('acct','2200','cr', s.fed_withholding + s.ss_employee + s.medicare_employee + s.other_deductions
                                                + s.ss_employer + s.medicare_employer + s.futa + s.suta));
    end if;
  end loop;
  perform public.post_entry('payroll', p_id, r.pay_date, 'Payroll ' || to_char(r.period_start, 'Mon DD') || '–' || to_char(r.period_end, 'Mon DD, YYYY'), v_lines);
  if r.status = 'void' then
    perform public.post_reversal('payroll', p_id, 'payroll_void', public.local_day(coalesce(r.voided_at, now())), 'Void payroll');
  else
    perform public.post_entry('payroll_void', p_id, null, null, null);
  end if;
end;
$$;

create or replace function public.trg_post_pay_run()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'pay_runs' then
    perform public.post_pay_run(new.id);
  else
    perform public.post_pay_run(coalesce(new.pay_run_id, old.pay_run_id));
  end if;
  return null;
end;
$$;
drop trigger if exists pay_runs_post on public.pay_runs;
create trigger pay_runs_post after insert or update on public.pay_runs
  for each row execute function public.trg_post_pay_run();
drop trigger if exists pay_stubs_post on public.pay_stubs;
create trigger pay_stubs_post after insert or update on public.pay_stubs
  for each row execute function public.trg_post_pay_run();

-- Paid payroll can't be edited (void it and run again).
create or replace function public.trg_guard_pay_stub()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.pay_runs where id = coalesce(new.pay_run_id, old.pay_run_id) and status <> 'draft') then
    raise exception 'This payroll is already paid. Void it and create a new one to make changes.';
  end if;
  new.gross := new.regular_pay + new.overtime_pay + new.flat_rate_pay + new.salary_pay + new.commission_pay + new.bonus;
  if new.worker_type = '1099' then
    new.fed_withholding := 0; new.ss_employee := 0; new.medicare_employee := 0; new.other_deductions := 0;
    new.ss_employer := 0; new.medicare_employer := 0; new.futa := 0; new.suta := 0;
  end if;
  new.net_pay := new.gross + new.reimbursement - new.fed_withholding - new.ss_employee - new.medicare_employee - new.other_deductions;
  return new;
end;
$$;
drop trigger if exists pay_stubs_guard on public.pay_stubs;
create trigger pay_stubs_guard before insert or update on public.pay_stubs
  for each row execute function public.trg_guard_pay_stub();

-- =========================================================== taxes paid
create or replace function public.post_tax_period(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.tax_periods%rowtype; w jsonb; v_code text; v_due numeric; v_tax numeric; v_use numeric; v_fees numeric; v_allow numeric;
begin
  select * into t from public.tax_periods where id = p_id;
  if not found or t.status <> 'filed' or t.amount_paid is null then
    perform public.post_entry('sales_tax_payment', p_id, null, null, null);
    return;
  end if;
  w := coalesce(t.worksheet, '{}'::jsonb);
  v_tax  := coalesce((w ->> 'tax_collected')::numeric, 0);
  v_use  := coalesce((w ->> 'use_tax')::numeric, 0);
  v_fees := coalesce((w ->> 'govt_fees')::numeric, 0);
  v_allow := t.allowance_taken;
  v_due := v_tax + v_use + v_fees - v_allow;
  select code into v_code from public.accounts where id = t.paid_from_account_id;
  perform public.post_entry('sales_tax_payment', p_id, coalesce(t.filed_on, t.period_end),
    'DR-15 ' || to_char(t.period_start, 'Mon YYYY') || coalesce(' – conf. ' || t.confirmation_number, ''),
    jsonb_build_array(
      jsonb_build_object('acct','2100','dr', v_tax),
      jsonb_build_object('acct','2120','dr', v_use),
      jsonb_build_object('acct','2110','dr', v_fees),
      jsonb_build_object('acct','4900','cr', v_allow, 'memo', 'Collection allowance'),
      jsonb_build_object('acct','6070','dr', t.amount_paid - v_due, 'memo', 'Penalty/interest or difference'),
      jsonb_build_object('acct', coalesce(v_code, '1010'), 'cr', t.amount_paid)));
end;
$$;
create or replace function public.trg_post_tax_period()
returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.post_tax_period(new.id); return null; end;
$$;
drop trigger if exists tax_periods_post on public.tax_periods;
create trigger tax_periods_post after insert or update on public.tax_periods
  for each row execute function public.trg_post_tax_period();

-- Estimated federal tax is personal for a single-member LLC: an owner draw.
create or replace function public.trg_post_est_tax()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.post_entry('estimated_tax', new.id, new.paid_on,
    'Estimated tax ' || new.tax_year || ' Q' || new.quarter, jsonb_build_array(
      jsonb_build_object('acct','3100','dr', new.amount),
      jsonb_build_object('acct','1010','cr', new.amount)));
  return null;
end;
$$;
drop trigger if exists estimated_tax_payments_post on public.estimated_tax_payments;
create trigger estimated_tax_payments_post after insert or update on public.estimated_tax_payments
  for each row execute function public.trg_post_est_tax();

-- =========================================================== depreciation
create or replace function public.post_depreciation(p_year int)
returns numeric language plpgsql security definer set search_path = '' as $$
declare a record; v_amt numeric; v_total numeric := 0; v_prior numeric; v_months int;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  for a in select * from public.fixed_assets where extract(year from in_service_on) <= p_year
           and (disposed_on is null or extract(year from disposed_on) >= p_year) loop
    select coalesce(sum(l.debit), 0) into v_prior
    from public.journal_entries e join public.journal_lines l on l.entry_id = e.id
    where e.source_id = a.id and e.source_type like 'depreciation_%' and e.source_type <> 'depreciation_' || p_year
      and l.account_id = public.acct('6140');
    if a.method = 'section_179' then
      v_amt := case when extract(year from a.in_service_on) = p_year then a.cost else 0 end;
    else
      v_months := case when extract(year from a.in_service_on) = p_year then 13 - extract(month from a.in_service_on)::int else 12 end;
      v_amt := round(a.cost / (a.life_years * 12) * v_months, 2);
    end if;
    v_amt := greatest(least(v_amt, a.cost - v_prior), 0);
    perform public.post_entry('depreciation_' || p_year, a.id, make_date(p_year, 12, 31), 'Depreciation ' || p_year || ' – ' || a.name,
      jsonb_build_array(jsonb_build_object('acct','6140','dr', v_amt), jsonb_build_object('acct','1510','cr', v_amt)));
    v_total := v_total + v_amt;
  end loop;
  return v_total;
end;
$$;
grant execute on function public.post_depreciation(int) to authenticated;

-- =========================================================== repost everything
create or replace function public.repost_all()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare x record; n int := 0;
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'Not authorized'; end if;
  for x in select id from public.repair_orders loop perform public.recalc_repair_order(x.id); perform public.post_repair_order(x.id); n := n + 1; end loop;
  for x in select id from public.payments loop perform public.post_payment(x.id); n := n + 1; end loop;
  for x in select id from public.deposits loop perform public.post_deposit(x.id); n := n + 1; end loop;
  for x in select id from public.expenses loop perform public.post_expense(x.id); n := n + 1; end loop;
  for x in select id from public.vehicle_costs loop perform public.post_vehicle_cost(x.id); n := n + 1; end loop;
  for x in select id from public.vehicle_deals loop perform public.post_deal(x.id); n := n + 1; end loop;
  for x in select id from public.pay_runs loop perform public.post_pay_run(x.id); n := n + 1; end loop;
  for x in select id from public.tax_periods loop perform public.post_tax_period(x.id); n := n + 1; end loop;
  return jsonb_build_object('documents', n);
end;
$$;
grant execute on function public.repost_all() to authenticated;

do $$
declare f text;
begin
  foreach f in array array['item_taxable(text,text,boolean,boolean,jsonb)','post_entry(text,uuid,date,text,jsonb)',
    'post_reversal(text,uuid,text,date,text)','post_repair_order(uuid)','trg_post_repair_order()','post_payment(uuid)',
    'post_deposit(uuid)','trg_post_payment()','trg_post_deposit()','post_expense(uuid)','trg_post_expense()',
    'post_vehicle_cost(uuid)','trg_post_vehicle_cost()','trg_calc_deal()','post_deal(uuid)','refresh_deal_paid(uuid)',
    'trg_post_deal()','post_pay_run(uuid)','trg_post_pay_run()','trg_guard_pay_stub()','post_tax_period(uuid)',
    'trg_post_tax_period()','trg_post_est_tax()','trg_recalc_from_child()','trg_recalc_self()',
    'trg_assign_invoice_number()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
revoke all on function public.vehicle_cost_basis(uuid) from public, anon, authenticated;

select public.repost_all();
