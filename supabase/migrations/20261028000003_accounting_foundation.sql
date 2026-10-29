-- Shop accounting & operations, phase 1 (foundation).
--  * staff roles: owner / manager / bookkeeper (read-only books) / technician
--  * audit_log (who, what, when, old -> new) on every financial table
--  * chart of accounts + double-entry journal (balanced, enforced)
--  * tax_rates with effective dates (Florida, IRS, payroll) – never hard-coded
--  * vendors, expenses/bills, deposits, parts movements, mileage, vehicle
--    costs and deals, employees, time clock, payroll, DR-15 periods, etc.

-- =========================================================== roles
alter table public.admin_users
  add column if not exists role text not null default 'manager'
    check (role in ('owner','manager','bookkeeper','technician'));
update public.admin_users set role = 'owner'
where email in ('service@autoprorepairs.com','andrelewis1533@gmail.com');

create or replace function public.staff_role()
returns text language sql stable security definer set search_path = '' as $$
  select a.role
  from auth.users u
  join public.admin_users a on a.email = lower(u.email)
  where u.id = auth.uid() and u.email_confirmed_at is not null and a.active
  limit 1;
$$;

-- Owners and managers run the shop and see costs/profit.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.staff_role() in ('owner','manager'), false);
$$;
create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.staff_role() = 'owner', false);
$$;
-- Owners, managers and the bookkeeper/CPA (read-only) see the books.
create or replace function public.can_read_books()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.staff_role() in ('owner','manager','bookkeeper'), false);
$$;

revoke all on function public.staff_role(), public.is_owner(), public.can_read_books() from public;
grant execute on function public.staff_role(), public.is_owner(), public.can_read_books() to authenticated;
grant execute on function public.is_admin() to anon, authenticated;  -- used inside public RLS policies

drop policy if exists "Admins read admin list" on public.admin_users;
create policy "Staff read team" on public.admin_users for select to authenticated
  using ((select public.staff_role()) is not null);
create policy "Owners manage team" on public.admin_users for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

create or replace function public.trg_keep_an_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.admin_users where role = 'owner' and active) then
    raise exception 'There must always be at least one active owner.';
  end if;
  return null;
end;
$$;
create constraint trigger admin_users_keep_owner after update or delete on public.admin_users
  deferrable initially deferred for each row execute function public.trg_keep_an_owner();

-- =========================================================== audit log
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       text default coalesce(auth.jwt() ->> 'email', 'system'),
  table_name  text not null,
  row_id      text,
  op          text not null,
  old_values  jsonb,
  new_values  jsonb
);
create index if not exists audit_log_row_idx on public.audit_log (table_name, row_id, at desc);
create index if not exists audit_log_at_idx on public.audit_log (at desc);
alter table public.audit_log enable row level security;
create policy "Books read audit log" on public.audit_log for select to authenticated
  using ((select public.can_read_books()));

create or replace function public.trg_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  d_old jsonb; d_new jsonb;
begin
  if tg_table_name = 'tax_ids' then   -- never copy taxpayer IDs into the log
    o := o - 'tin'; n := n - 'tin';
  end if;
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(k, o -> k), jsonb_object_agg(k, n -> k) into d_old, d_new
    from jsonb_object_keys(n) k
    where k not in ('updated_at') and (o -> k) is distinct from (n -> k);
    if d_new is null then return null; end if;
    o := d_old; n := d_new;
  end if;
  insert into public.audit_log (table_name, row_id, op, old_values, new_values)
  values (tg_table_name, coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id', to_jsonb(new) ->> 'email', to_jsonb(old) ->> 'email'),
          lower(tg_op), o, n);
  return null;
end;
$$;

-- =========================================================== rates & settings
-- Every tax rate, fee and threshold, each with an effective date.
create table if not exists public.tax_rates (
  id              uuid primary key default gen_random_uuid(),
  code            text not null,
  jurisdiction    text not null default '',
  value           numeric(14,6) not null,
  effective_from  date not null,
  effective_to    date,
  label           text,
  source          text,
  created_at      timestamptz not null default now(),
  unique (code, jurisdiction, effective_from)
);

create or replace function public.rate(p_code text, p_on date default current_date, p_jur text default '')
returns numeric language sql stable security definer set search_path = '' as $$
  select value from public.tax_rates
  where code = p_code and jurisdiction = coalesce(p_jur, '')
    and effective_from <= p_on and (effective_to is null or effective_to >= p_on)
  order by effective_from desc limit 1;
$$;
grant execute on function public.rate(text, date, text) to authenticated;

insert into public.tax_rates (code, jurisdiction, value, effective_from, label, source) values
  ('fl_state_rate',            '', 0.06,   '2000-01-01', 'Florida state sales tax', 'FL DOR'),
  ('surtax_item_cap',          '', 5000,   '2000-01-01', 'Surtax applies to the first $ of each item', 'FL DOR discretionary surtax'),
  ('tire_fee',                 '', 1.00,   '2000-01-01', 'New tire fee (per tire)', 'FL DOR GT-800019 – verify'),
  ('battery_fee',              '', 1.50,   '2000-01-01', 'Lead-acid battery fee (per battery)', 'FL DOR – verify'),
  ('collection_allowance_rate','', 0.025,  '2000-01-01', 'Collection allowance (e-file & pay on time)', 'DR-15 instructions'),
  ('collection_allowance_base','', 1200,   '2000-01-01', 'Allowance applies to first $ of tax', 'DR-15 instructions'),
  ('collection_allowance_max', '', 30,     '2000-01-01', 'Collection allowance cap', 'DR-15 instructions'),
  ('irs_mileage_rate',         '', 0.70,   '2025-01-01', 'IRS business mileage (per mile)', 'IRS'),
  ('irs_mileage_rate',         '', 0.725,  '2026-01-01', 'IRS business mileage (per mile)', 'IR-2025-128'),
  ('irs_mileage_rate',         '', 0.76,   '2026-07-01', 'IRS business mileage (per mile)', 'IRS Announcement 2026-11 – verify'),
  ('nec_1099_threshold',       '', 600,    '2000-01-01', '1099-NEC reporting threshold', 'IRS'),
  ('nec_1099_threshold',       '', 2000,   '2026-01-01', '1099-NEC reporting threshold', 'OBBBA §70433'),
  ('fica_ss_rate',             '', 0.062,  '2000-01-01', 'Social Security (each side)', 'IRS'),
  ('fica_medicare_rate',       '', 0.0145, '2000-01-01', 'Medicare (each side)', 'IRS'),
  ('ss_wage_base',             '', 176100, '2025-01-01', 'Social Security wage base', 'SSA'),
  ('ss_wage_base',             '', 184500, '2026-01-01', 'Social Security wage base', 'SSA'),
  ('futa_rate',                '', 0.006,  '2000-01-01', 'FUTA (after state credit)', 'IRS'),
  ('futa_wage_base',           '', 7000,   '2000-01-01', 'FUTA wage base', 'IRS'),
  ('fl_rt_rate',               '', 0.027,  '2000-01-01', 'FL reemployment tax (new employer)', 'FL DOR – use your assigned rate'),
  ('fl_rt_wage_base',          '', 7000,   '2015-01-01', 'FL reemployment tax wage base', 'FL DOR'),
  ('se_tax_rate',              '', 0.153,  '2000-01-01', 'Self-employment tax', 'IRS'),
  ('se_earnings_factor',       '', 0.9235, '2000-01-01', 'Net earnings factor for SE tax', 'IRS'),
  ('qbi_rate',                 '', 0.20,   '2018-01-01', 'Qualified business income deduction', 'IRS'),
  ('std_deduction_single',     '', 15750,  '2025-01-01', 'Standard deduction – single', 'IRS'),
  ('std_deduction_single',     '', 16100,  '2026-01-01', 'Standard deduction – single', 'Rev. Proc. 2025-32'),
  ('std_deduction_mfj',        '', 31500,  '2025-01-01', 'Standard deduction – married filing jointly', 'IRS'),
  ('std_deduction_mfj',        '', 32200,  '2026-01-01', 'Standard deduction – married filing jointly', 'Rev. Proc. 2025-32')
on conflict do nothing;

-- County surtax rates, DR-15DSS for calendar year 2026.
insert into public.tax_rates (code, jurisdiction, value, effective_from, label, source)
select 'surtax', c, r, '2026-01-01', 'Discretionary sales surtax', 'DR-15DSS R. 11/25 (CY 2026)'
from (values
  ('Alachua',.015),('Baker',.01),('Bay',.01),('Bradford',.01),('Brevard',.01),('Broward',.01),
  ('Calhoun',.015),('Charlotte',.01),('Citrus',0),('Clay',.015),('Collier',0),('Columbia',.015),
  ('DeSoto',.015),('Dixie',.01),('Duval',.015),('Escambia',.015),('Flagler',.01),('Franklin',.015),
  ('Gadsden',.015),('Gilchrist',.01),('Glades',.01),('Gulf',.01),('Hamilton',.02),('Hardee',.01),
  ('Hendry',.015),('Hernando',.005),('Highlands',.015),('Hillsborough',.015),('Holmes',.015),
  ('Indian River',.01),('Jackson',.015),('Jefferson',.01),('Lafayette',.01),('Lake',.01),('Lee',.005),
  ('Leon',.015),('Levy',.01),('Liberty',.015),('Madison',.015),('Manatee',.01),('Marion',.015),
  ('Martin',.005),('Miami-Dade',.01),('Monroe',.015),('Nassau',.01),('Okaloosa',.01),('Okeechobee',.01),
  ('Orange',.005),('Osceola',.015),('Palm Beach',.005),('Pasco',.01),('Pinellas',.01),('Polk',.01),
  ('Putnam',.01),('St. Johns',.005),('St. Lucie',.01),('Santa Rosa',.01),('Sarasota',.01),
  ('Seminole',.01),('Sumter',.01),('Suwannee',.01),('Taylor',.01),('Union',.01),('Volusia',.005),
  ('Wakulla',.015),('Walton',.01),('Washington',.015)
) as t(c, r)
on conflict do nothing;
insert into public.tax_rates (code, jurisdiction, value, effective_from, label, source)
values ('surtax','Lake',.01,'1988-01-01','Discretionary sales surtax','DR-15DSS') on conflict do nothing;

-- 2026 federal brackets (taxable-income floor -> rate), single and MFJ.
insert into public.tax_rates (code, jurisdiction, value, effective_from, label, source)
select 'fed_bracket_' || s, f::text, r, '2026-01-01', 'Federal income tax bracket', 'Rev. Proc. 2025-32'
from (values
  ('single',0,.10),('single',12400,.12),('single',50400,.22),('single',105700,.24),
  ('single',201775,.32),('single',256225,.35),('single',640600,.37),
  ('mfj',0,.10),('mfj',24800,.12),('mfj',100800,.22),('mfj',211400,.24),
  ('mfj',403550,.32),('mfj',512450,.35),('mfj',768700,.37)
) as t(s, f, r)
on conflict do nothing;

-- Shop accounting settings (rates live in tax_rates; these are choices).
insert into public.settings (key, category, description, value) values ('books', 'accounting', 'Accounting & tax settings', jsonb_build_object(
  'shop_county', 'Lake',
  'entity_type', 'single_member',      -- single_member | partnership | s_corp
  'filing_status', 'single',           -- single | mfj (owner's personal return)
  'dr15_frequency', 'monthly',
  'dealer_license', '',
  'surtax_cap_basis', 'line',          -- apply the $5,000 surtax cap per line item
  'tax_set_aside_pct', 25,
  'owner_salary', 0,
  'fees', jsonb_build_object(
    'shop_supplies', jsonb_build_object('label','Shop supplies','pct',5,'cap',35,'tax','follow_job'),
    'disposal',      jsonb_build_object('label','Environmental / disposal fee','amount',5,'tax','follow_job'),
    'tire',          jsonb_build_object('label','FL new tire fee','tax','never'),
    'battery',       jsonb_build_object('label','FL battery fee','tax','never'),
    'towing',        jsonb_build_object('label','Towing','tax','never'),
    'other',         jsonb_build_object('label','Other fee','tax','follow_job')),
  'labor_rates', jsonb_build_array(
    jsonb_build_object('name','Standard','rate',120),
    jsonb_build_object('name','Diagnostic','rate',140)),
  'markup_matrix', jsonb_build_array(
    jsonb_build_object('upto',10,'markup',100),
    jsonb_build_object('upto',50,'markup',70),
    jsonb_build_object('upto',150,'markup',50),
    jsonb_build_object('upto',500,'markup',35),
    jsonb_build_object('upto',null,'markup',25)),
  'reminders', jsonb_build_object('enabled', true, 'days_after_due', jsonb_build_array(3,14,30), 'email', true, 'sms', false),
  'tax_reminder_days', jsonb_build_array(10,18)
))
on conflict (key) do nothing;

-- =========================================================== chart of accounts
create table if not exists public.accounts (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  type        text not null check (type in ('asset','liability','equity','income','cogs','expense')),
  subtype     text,
  schedule_c  text,
  is_system   boolean not null default false,
  active      boolean not null default true,
  description text,
  created_at  timestamptz not null default now()
);

insert into public.accounts (code, name, type, subtype, schedule_c, is_system) values
  ('1000','Cash on hand','asset','cash',null,true),
  ('1010','Business checking','asset','bank',null,true),
  ('1020','Savings','asset','bank',null,false),
  ('1050','Undeposited funds','asset','undeposited',null,true),
  ('1100','Accounts receivable','asset','ar',null,true),
  ('1200','Parts inventory','asset','inventory',null,true),
  ('1210','Vehicle inventory','asset','inventory',null,true),
  ('1300','Prepaid expenses','asset','other',null,false),
  ('1500','Tools & equipment','asset','fixed',null,true),
  ('1510','Accumulated depreciation','asset','contra',null,true),
  ('2000','Accounts payable','liability','ap',null,true),
  ('2100','Sales tax payable','liability','tax',null,true),
  ('2110','Tire & battery fees payable','liability','tax',null,true),
  ('2120','Use tax payable','liability','tax',null,true),
  ('2200','Payroll liabilities','liability','payroll',null,true),
  ('2300','Credit card','liability','credit_card',null,false),
  ('2400','Loans payable','liability','loan',null,false),
  ('2600','Title & registration fees payable','liability','passthrough',null,true),
  ('2700','Trade-in payoffs payable','liability','other',null,true),
  ('3000','Owner contributions','equity','contrib',null,true),
  ('3100','Owner draws','equity','draw',null,true),
  ('3900','Opening balance equity','equity','opening',null,true),
  ('4000','Labor income','income','repair','Line 1',true),
  ('4010','Parts sales','income','repair','Line 1',true),
  ('4020','Shop fees income','income','repair','Line 1',true),
  ('4030','Sublet income','income','repair','Line 1',true),
  ('4040','Discounts given','income','repair','Line 2',true),
  ('4100','Vehicle sales','income','vehicle','Line 1',true),
  ('4110','Dealer / doc fees','income','vehicle','Line 1',true),
  ('4120','Add-on products (warranty, etc.)','income','vehicle','Line 1',true),
  ('4900','Other income','income','other','Line 6',true),
  ('5000','Parts & materials','cogs','repair','Part III line 38',true),
  ('5010','Sublet work','cogs','repair','Part III line 37',true),
  ('5100','Cost of vehicles sold','cogs','vehicle','Part III line 36',true),
  ('6000','Rent','expense',null,'Line 20b',false),
  ('6010','Utilities','expense',null,'Line 25',false),
  ('6020','Tools & small equipment','expense',null,'Line 22',false),
  ('6030','Insurance','expense',null,'Line 15',false),
  ('6040','Advertising','expense',null,'Line 8',false),
  ('6050','Software & subscriptions','expense',null,'Line 27a',false),
  ('6060','Repairs & maintenance','expense',null,'Line 21',false),
  ('6070','Licenses & fees','expense',null,'Line 23',false),
  ('6080','Contract labor','expense',null,'Line 11',true),
  ('6090','Wages','expense',null,'Line 26',true),
  ('6095','Payroll taxes','expense',null,'Line 23',true),
  ('6100','Office expense','expense',null,'Line 18',false),
  ('6110','Vehicle expense','expense',null,'Line 9',false),
  ('6120','Meals (50%)','expense',null,'Line 24b',false),
  ('6130','Bank & card fees','expense',null,'Line 27a',false),
  ('6140','Depreciation','expense',null,'Line 13',true),
  ('6150','Interest','expense',null,'Line 16b',false),
  ('6160','Shop supplies','expense',null,'Line 22',false),
  ('6900','Other expenses','expense',null,'Line 27a',false)
on conflict (code) do nothing;

create or replace function public.acct(p_code text)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.accounts where code = p_code;
$$;
revoke all on function public.acct(text) from public;

-- =========================================================== journal
create table if not exists public.journal_entries (
  id           uuid primary key default gen_random_uuid(),
  entry_date   date not null,
  source_type  text not null,     -- invoice, invoice_void, payment, deposit, bill, bill_payment, deal, ...
  source_id    uuid,
  memo         text,
  created_by   text default coalesce(auth.jwt() ->> 'email', 'system'),
  created_at   timestamptz not null default now()
);
create unique index if not exists journal_entries_source_uidx
  on public.journal_entries (source_type, source_id) where source_type <> 'manual';
create index if not exists journal_entries_date_idx on public.journal_entries (entry_date);

create table if not exists public.journal_lines (
  id           uuid primary key default gen_random_uuid(),
  entry_id     uuid not null references public.journal_entries(id) on delete cascade,
  account_id   uuid not null references public.accounts(id),
  debit        numeric(14,2) not null default 0 check (debit >= 0),
  credit       numeric(14,2) not null default 0 check (credit >= 0),
  memo         text,
  customer_id  uuid,
  vendor_id    uuid,
  vehicle_id   uuid,
  check (not (debit > 0 and credit > 0))
);
create index if not exists journal_lines_entry_idx on public.journal_lines (entry_id);
create index if not exists journal_lines_account_idx on public.journal_lines (account_id);

-- Debits must equal credits for every entry, checked at commit.
create or replace function public.trg_journal_balanced()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id uuid := coalesce(new.entry_id, old.entry_id); v_diff numeric;
begin
  select coalesce(sum(debit),0) - coalesce(sum(credit),0) into v_diff
  from public.journal_lines where entry_id = v_id;
  if v_diff <> 0 then
    raise exception 'Journal entry % is out of balance by %', v_id, v_diff;
  end if;
  return null;
end;
$$;
create constraint trigger journal_lines_balanced after insert or update or delete on public.journal_lines
  deferrable initially deferred for each row execute function public.trg_journal_balanced();

-- =========================================================== vendors & tax IDs
create table if not exists public.vendors (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  contact_name       text,
  email              text,
  phone              text,
  address_street     text,
  address_city       text,
  address_state      text,
  address_zip        text,
  is_1099            boolean not null default false,
  w9_on_file         boolean not null default false,
  default_account_id uuid references public.accounts(id),
  charges_tax_on_resale boolean not null default false,
  notes              text,
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- SSNs/EINs for 1099s. Owner-only, kept out of the audit log.
create table if not exists public.tax_ids (
  id          uuid primary key default gen_random_uuid(),
  party_type  text not null check (party_type in ('vendor','employee')),
  party_id    uuid not null,
  legal_name  text,
  tin_type    text check (tin_type in ('SSN','EIN','ITIN')),
  tin         text,
  updated_at  timestamptz not null default now(),
  unique (party_type, party_id)
);

-- =========================================================== customers (extend)
alter table public.customers
  add column if not exists customer_type text not null default 'retail'
    check (customer_type in ('retail','fleet','insurance','dealer')),
  add column if not exists county text,
  add column if not exists merged_into uuid references public.customers(id);
create index if not exists customers_phone_idx on public.customers (phone);
create index if not exists customer_vehicles_plate_idx on public.customer_vehicles (lower(license_plate));
create index if not exists customer_vehicles_vin_idx on public.customer_vehicles (upper(vin));

-- =========================================================== repair orders (extend)
alter table public.repair_orders
  add column if not exists doc_type text not null default 'invoice' check (doc_type in ('invoice','credit_memo')),
  add column if not exists credit_for_id uuid references public.repair_orders(id),
  add column if not exists customer_supplied_parts boolean not null default false,
  add column if not exists tax_exempt boolean not null default false,
  add column if not exists exempt_reason text,
  add column if not exists stock_vehicle_id uuid references public.vehicles(id),
  add column if not exists tax_state numeric(12,2) not null default 0,
  add column if not exists tax_surtax numeric(12,2) not null default 0,
  add column if not exists surtax_county text,
  add column if not exists surtax_over_cap numeric(12,2) not null default 0,
  add column if not exists exempt_total numeric(12,2) not null default 0,
  add column if not exists govt_fees_total numeric(12,2) not null default 0,
  add column if not exists valid_until date,
  add column if not exists recurrence text check (recurrence in ('weekly','monthly','quarterly','yearly')),
  add column if not exists next_run_on date,
  add column if not exists reminder_count integer not null default 0,
  add column if not exists last_reminder_at timestamptz;

alter table public.repair_order_items
  add column if not exists labor_type text check (labor_type in ('hourly','flat')),
  add column if not exists actual_hours numeric(8,2),
  add column if not exists technician text,
  add column if not exists fee_code text check (fee_code in ('shop_supplies','disposal','tire','battery','towing','other')),
  add column if not exists vendor text;

create table if not exists public.estimate_approvals (
  id               uuid primary key default gen_random_uuid(),
  repair_order_id  uuid not null references public.repair_orders(id) on delete cascade,
  decided_at       timestamptz not null default now(),
  approved         boolean not null,
  signer_name      text not null,
  items_approved   uuid[] not null default '{}',
  items_declined   uuid[] not null default '{}',
  total_approved   numeric(12,2),
  ip_address       text,
  user_agent       text
);
create index if not exists estimate_approvals_ro_idx on public.estimate_approvals (repair_order_id);

-- =========================================================== payments & deposits
create table if not exists public.deposits (
  id            uuid primary key default gen_random_uuid(),
  deposit_date  date not null default current_date,
  account_id    uuid not null references public.accounts(id),
  total         numeric(12,2) not null default 0,
  memo          text,
  created_at    timestamptz not null default now()
);

alter table public.payments
  alter column repair_order_id drop not null,
  add column if not exists deal_id uuid,
  add column if not exists deposit_id uuid references public.deposits(id),
  add column if not exists voided_at timestamptz;
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check
  check (method in ('cash','card','check','zelle','cashapp','ach','financing','credit_memo','other'));
create index if not exists payments_deposit_idx on public.payments (deposit_id);

-- =========================================================== parts movements
create table if not exists public.part_movements (
  id           uuid primary key default gen_random_uuid(),
  part_id      uuid not null references public.parts(id),
  moved_at     timestamptz not null default now(),
  quantity     numeric(12,2) not null,
  kind         text not null check (kind in ('receive','use','return','adjust','count')),
  unit_cost    numeric(12,2),
  source_type  text,
  source_id    uuid,
  note         text,
  created_by   text default coalesce(auth.jwt() ->> 'email', 'system')
);
create index if not exists part_movements_part_idx on public.part_movements (part_id, moved_at desc);
alter table public.parts add column if not exists vendor_id uuid references public.vendors(id);

create or replace function public.trg_part_stock()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE','DELETE') and old.part_id is not null then
    update public.parts set quantity_on_hand = quantity_on_hand + old.quantity where id = old.part_id;
    insert into public.part_movements (part_id, quantity, kind, unit_cost, source_type, source_id)
    values (old.part_id, old.quantity, 'return', old.unit_cost, 'repair_order', old.repair_order_id);
  end if;
  if tg_op in ('INSERT','UPDATE') and new.part_id is not null then
    update public.parts set quantity_on_hand = quantity_on_hand - new.quantity where id = new.part_id;
    insert into public.part_movements (part_id, quantity, kind, unit_cost, source_type, source_id)
    values (new.part_id, -new.quantity, 'use', new.unit_cost, 'repair_order', new.repair_order_id);
  end if;
  return null;
end;
$$;
drop trigger if exists repair_order_items_stock on public.repair_order_items;
create trigger repair_order_items_stock after insert or delete or update of part_id, quantity
  on public.repair_order_items for each row execute function public.trg_part_stock();

-- =========================================================== expenses & bills
create table if not exists public.expenses (
  id                    uuid primary key default gen_random_uuid(),
  kind                  text not null default 'expense' check (kind in ('expense','bill')),
  vendor_id             uuid references public.vendors(id),
  vendor_name           text,
  ref_number            text,
  expense_date          date not null default current_date,
  due_date              date,
  total                 numeric(12,2) not null default 0,
  tax_charged           numeric(12,2) not null default 0,
  use_tax_base          numeric(12,2) not null default 0,
  use_tax_amount        numeric(12,2) not null default 0,
  status                text not null default 'paid' check (status in ('unpaid','paid')),
  paid_at               date,
  paid_from_account_id  uuid references public.accounts(id),
  payment_method        text,
  memo                  text,
  receipt_path          text,
  ocr                   jsonb,
  recurrence            text check (recurrence in ('weekly','monthly','quarterly','yearly')),
  next_run_on           date,
  voided_at             timestamptz,
  created_by            text default coalesce(auth.jwt() ->> 'email', 'system'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists expenses_date_idx on public.expenses (expense_date);
create index if not exists expenses_vendor_idx on public.expenses (vendor_id);

create table if not exists public.expense_lines (
  id           uuid primary key default gen_random_uuid(),
  expense_id   uuid not null references public.expenses(id) on delete cascade,
  account_id   uuid not null references public.accounts(id),
  part_id      uuid references public.parts(id),
  quantity     numeric(12,2),
  description  text,
  amount       numeric(12,2) not null,
  use_taxable  boolean not null default false,
  position     integer not null default 0
);
create index if not exists expense_lines_expense_idx on public.expense_lines (expense_id);

-- =========================================================== fixed assets
create table if not exists public.fixed_assets (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  in_service_on   date not null,
  cost            numeric(12,2) not null,
  life_years      integer not null default 7,
  method          text not null default 'straight_line' check (method in ('straight_line','section_179')),
  disposed_on     date,
  notes           text,
  created_at      timestamptz not null default now()
);

-- =========================================================== mileage
create table if not exists public.mileage_trips (
  id          uuid primary key default gen_random_uuid(),
  trip_date   date not null default current_date,
  from_place  text,
  to_place    text,
  miles       numeric(8,1) not null check (miles > 0),
  round_trip  boolean not null default false,
  purpose     text not null default 'parts_run',
  vehicle     text,
  notes       text,
  created_by  text default coalesce(auth.jwt() ->> 'email', 'system'),
  created_at  timestamptz not null default now()
);
create index if not exists mileage_trips_date_idx on public.mileage_trips (trip_date);

-- =========================================================== vehicles: cost basis & deals
create table if not exists public.vehicle_costs (
  id                    uuid primary key default gen_random_uuid(),
  vehicle_id            uuid not null references public.vehicles(id) on delete cascade,
  cost_date             date not null default current_date,
  category              text not null check (category in ('purchase','auction_fee','transport','recon_parts','recon_labor','title','other')),
  description           text,
  amount                numeric(12,2) not null,
  vendor_id             uuid references public.vendors(id),
  paid_from_account_id  uuid references public.accounts(id),
  deal_id               uuid,
  created_at            timestamptz not null default now()
);
create index if not exists vehicle_costs_vehicle_idx on public.vehicle_costs (vehicle_id);

create sequence if not exists public.deal_number_seq start 1001;
create table if not exists public.vehicle_deals (
  id                uuid primary key default gen_random_uuid(),
  number            bigint not null unique default nextval('public.deal_number_seq'),
  vehicle_id        uuid not null references public.vehicles(id),
  customer_id       uuid references public.customers(id),
  status            text not null default 'draft' check (status in ('draft','final','void')),
  sale_date         date not null default current_date,
  sale_price        numeric(12,2) not null default 0,
  doc_fee           numeric(12,2) not null default 0,
  addons            jsonb not null default '[]',
  trade_allowance   numeric(12,2) not null default 0,
  trade_payoff      numeric(12,2) not null default 0,
  trade_description text,
  trade_vin         text,
  trade_vehicle_id  uuid references public.vehicles(id),
  title_fee         numeric(12,2) not null default 0,
  registration_fee  numeric(12,2) not null default 0,
  other_passthrough numeric(12,2) not null default 0,
  buyer_county      text,
  out_of_state      boolean not null default false,
  tax_exempt        boolean not null default false,
  exempt_reason     text,
  taxable_amount    numeric(12,2) not null default 0,
  state_tax         numeric(12,2) not null default 0,
  surtax            numeric(12,2) not null default 0,
  total_tax         numeric(12,2) not null default 0,
  tax_override      numeric(12,2),
  total_due         numeric(12,2) not null default 0,
  down_payment      numeric(12,2) not null default 0,
  lender_name       text,
  lender_amount     numeric(12,2) not null default 0,
  cost_basis        numeric(12,2) not null default 0,
  addon_cost        numeric(12,2) not null default 0,
  gross_profit      numeric(12,2) not null default 0,
  amount_paid       numeric(12,2) not null default 0,
  notes             text,
  finalized_at      timestamptz,
  voided_at         timestamptz,
  created_by        text default coalesce(auth.jwt() ->> 'email', 'system'),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.payments drop constraint if exists payments_deal_id_fkey;
alter table public.payments add constraint payments_deal_id_fkey foreign key (deal_id) references public.vehicle_deals(id);
alter table public.vehicle_costs drop constraint if exists vehicle_costs_deal_id_fkey;
alter table public.vehicle_costs add constraint vehicle_costs_deal_id_fkey foreign key (deal_id) references public.vehicle_deals(id);

-- Move dealer cost out of the vehicles table (it was readable by any signed-in
-- user) into vehicle_costs, which only owners/managers can see.
insert into public.vehicle_costs (vehicle_id, cost_date, category, description, amount, paid_from_account_id)
select v.id, coalesce(v.purchase_date, v.created_at::date, current_date), 'purchase', 'Purchase price (migrated)',
       v.purchase_price, public.acct('3900')
from public.vehicles v
where coalesce(v.purchase_price, 0) > 0
  and not exists (select 1 from public.vehicle_costs c where c.vehicle_id = v.id and c.category = 'purchase');
alter table public.vehicles drop column if exists purchase_price;

-- =========================================================== documents
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null check (entity_type in ('customer','vehicle','deal','expense','vendor','employee','repair_order','tax_period','other')),
  entity_id    uuid,
  kind         text,
  path         text not null unique,
  file_name    text,
  mime_type    text,
  size_bytes   integer,
  uploaded_by  text default coalesce(auth.jwt() ->> 'email', 'system'),
  created_at   timestamptz not null default now()
);
create index if not exists documents_entity_idx on public.documents (entity_type, entity_id);

-- =========================================================== team & payroll
create table if not exists public.employees (
  id                       uuid primary key default gen_random_uuid(),
  first_name               text not null,
  last_name                text,
  email                    text,
  phone                    text,
  address_street           text,
  address_city             text,
  address_state            text,
  address_zip              text,
  worker_type              text not null default 'w2' check (worker_type in ('w2','1099')),
  title                    text,
  pay_type                 text not null default 'hourly' check (pay_type in ('hourly','salary','flat_rate','commission')),
  pay_rate                 numeric(12,2) not null default 0,  -- $/hr, $/flag hr, or $/year (salary)
  commission_pct           numeric(6,3) not null default 0,
  overtime_eligible        boolean not null default true,
  federal_withholding_pct  numeric(6,3) not null default 0,
  pay_frequency            text not null default 'weekly' check (pay_frequency in ('weekly','biweekly','semimonthly','monthly')),
  hire_date                date,
  termination_date         date,
  active                   boolean not null default true,
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
alter table public.admin_users add column if not exists employee_id uuid references public.employees(id);

create table if not exists public.time_entries (
  id               uuid primary key default gen_random_uuid(),
  employee_id      uuid not null references public.employees(id),
  clock_in         timestamptz not null default now(),
  clock_out        timestamptz,
  break_minutes    integer not null default 0 check (break_minutes >= 0),
  repair_order_id  uuid references public.repair_orders(id),
  notes            text,
  approved         boolean not null default false,
  created_by       text default coalesce(auth.jwt() ->> 'email', 'system'),
  created_at       timestamptz not null default now(),
  check (clock_out is null or clock_out > clock_in)
);
create index if not exists time_entries_emp_idx on public.time_entries (employee_id, clock_in desc);
create unique index if not exists time_entries_one_open_idx on public.time_entries (employee_id) where clock_out is null;

create table if not exists public.pay_runs (
  id                    uuid primary key default gen_random_uuid(),
  period_start          date not null,
  period_end            date not null,
  pay_date              date not null,
  status                text not null default 'draft' check (status in ('draft','paid','void')),
  paid_from_account_id  uuid references public.accounts(id),
  memo                  text,
  voided_at             timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.pay_stubs (
  id                 uuid primary key default gen_random_uuid(),
  pay_run_id         uuid not null references public.pay_runs(id) on delete cascade,
  employee_id        uuid not null references public.employees(id),
  worker_type        text not null,
  regular_hours      numeric(8,2) not null default 0,
  overtime_hours     numeric(8,2) not null default 0,
  flat_rate_hours    numeric(8,2) not null default 0,
  rate               numeric(12,2) not null default 0,
  regular_pay        numeric(12,2) not null default 0,
  overtime_pay       numeric(12,2) not null default 0,
  flat_rate_pay      numeric(12,2) not null default 0,
  salary_pay         numeric(12,2) not null default 0,
  commission_pay     numeric(12,2) not null default 0,
  bonus              numeric(12,2) not null default 0,
  reimbursement      numeric(12,2) not null default 0,
  gross              numeric(12,2) not null default 0,
  fed_withholding    numeric(12,2) not null default 0,
  ss_employee        numeric(12,2) not null default 0,
  medicare_employee  numeric(12,2) not null default 0,
  other_deductions   numeric(12,2) not null default 0,
  net_pay            numeric(12,2) not null default 0,
  ss_employer        numeric(12,2) not null default 0,
  medicare_employer  numeric(12,2) not null default 0,
  futa               numeric(12,2) not null default 0,
  suta               numeric(12,2) not null default 0,
  method             text,
  check_number       text,
  notes              text,
  unique (pay_run_id, employee_id)
);
create index if not exists pay_stubs_employee_idx on public.pay_stubs (employee_id);

-- =========================================================== taxes
create table if not exists public.tax_periods (
  id                    uuid primary key default gen_random_uuid(),
  period_start          date not null unique,
  period_end            date not null,
  status                text not null default 'open' check (status in ('open','filed')),
  filed_on              date,
  confirmation_number   text,
  amount_paid           numeric(12,2),
  allowance_taken       numeric(12,2) not null default 0,
  paid_from_account_id  uuid references public.accounts(id),
  worksheet             jsonb,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.estimated_tax_payments (
  id            uuid primary key default gen_random_uuid(),
  tax_year      integer not null,
  quarter       integer not null check (quarter between 1 and 4),
  paid_on       date not null,
  amount        numeric(12,2) not null check (amount > 0),
  method        text,
  confirmation  text,
  notes         text,
  created_at    timestamptz not null default now()
);

-- =========================================================== period lock
create or replace function public.period_locked(p_day date)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_day is not null and exists (
    select 1 from public.tax_periods
    where status = 'filed' and p_day between period_start and period_end);
$$;
grant execute on function public.period_locked(date) to authenticated;

create or replace function public.local_day(p_ts timestamptz)
returns date language sql immutable set search_path = '' as $$
  select (p_ts at time zone 'America/New_York')::date;
$$;

-- Generic guard: TG_ARGV are the date/timestamp columns that place the row in a period.
create or replace function public.trg_guard_period()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c text; o jsonb := to_jsonb(old); n jsonb := to_jsonb(new); d date;
begin
  foreach c in array tg_argv loop
    for d in select public.local_day((x)::timestamptz)
             from unnest(array[o ->> c, n ->> c]) x where x is not null loop
      if public.period_locked(d) then
        raise exception 'That transaction is in a sales-tax period you already filed (%). Record a correction in the current month instead.', to_char(d, 'Mon YYYY');
      end if;
    end loop;
  end loop;
  return coalesce(new, old);
end;
$$;

create or replace function public.trg_guard_repair_order()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (old.total, old.tax_amount, old.invoiced_at, old.voided_at, old.customer_id,
                           old.discount_amount, old.doc_type, old.tax_exempt)
       is not distinct from (new.total, new.tax_amount, new.invoiced_at, new.voided_at, new.customer_id,
                             new.discount_amount, new.doc_type, new.tax_exempt) then
    return new;
  end if;
  if public.period_locked(public.local_day(old.invoiced_at)) or public.period_locked(public.local_day(new.invoiced_at)) then
    raise exception 'Invoice is in a sales-tax period you already filed. Issue a credit memo or a new invoice instead.';
  end if;
  if tg_op = 'DELETE' then
    if old.invoiced_at is not null then
      raise exception 'Invoices cannot be deleted. Void it instead.';
    end if;
    if exists (select 1 from public.payments where repair_order_id = old.id) then
      raise exception 'This repair order has payments. Cancel it instead of deleting.';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists repair_orders_guard on public.repair_orders;
create trigger repair_orders_guard before update or delete on public.repair_orders
  for each row execute function public.trg_guard_repair_order();

create or replace function public.trg_guard_ro_item()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_inv timestamptz;
begin
  select invoiced_at into v_inv from public.repair_orders
  where id = coalesce(new.repair_order_id, old.repair_order_id);
  if public.period_locked(public.local_day(v_inv)) then
    raise exception 'Invoice is in a sales-tax period you already filed. Issue a credit memo instead.';
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists repair_order_items_guard on public.repair_order_items;
create trigger repair_order_items_guard before insert or update or delete on public.repair_order_items
  for each row execute function public.trg_guard_ro_item();

-- Financial records are voided, never deleted.
create or replace function public.trg_no_delete()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception '% records cannot be deleted. Void them instead.', replace(tg_table_name, '_', ' ');
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['payments','expenses','vehicle_deals','pay_runs','pay_stubs','tax_periods','estimated_tax_payments','deposits'] loop
    execute format('drop trigger if exists %I_no_delete on public.%I', t, t);
    execute format('create trigger %I_no_delete before delete on public.%I for each row execute function public.trg_no_delete()', t, t);
  end loop;
end $$;

drop trigger if exists payments_guard on public.payments;
create trigger payments_guard before insert or update on public.payments
  for each row execute function public.trg_guard_period('received_at');
drop trigger if exists expenses_guard on public.expenses;
create trigger expenses_guard before insert or update on public.expenses
  for each row execute function public.trg_guard_period('expense_date','paid_at');
drop trigger if exists vehicle_deals_guard on public.vehicle_deals;
create trigger vehicle_deals_guard before update on public.vehicle_deals
  for each row execute function public.trg_guard_period('sale_date');

create or replace function public.trg_guard_expense_line()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_d date;
begin
  select expense_date into v_d from public.expenses where id = coalesce(new.expense_id, old.expense_id);
  if public.period_locked(v_d) then
    raise exception 'That expense is in a sales-tax period you already filed.';
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists expense_lines_guard on public.expense_lines;
create trigger expense_lines_guard before insert or update or delete on public.expense_lines
  for each row execute function public.trg_guard_expense_line();

-- =========================================================== updated_at
do $$
declare t text;
begin
  foreach t in array array['vendors','expenses','vehicle_deals','employees','pay_runs','tax_periods'] loop
    execute format('drop trigger if exists %I_updated_at on public.%I', t, t);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.update_updated_at_column()', t, t);
  end loop;
end $$;

-- =========================================================== RLS
do $$
declare t text;
begin
  -- Owners/managers manage; bookkeeper/CPA reads.
  foreach t in array array['tax_rates','accounts','journal_entries','journal_lines','vendors','deposits',
    'part_movements','expenses','expense_lines','fixed_assets','mileage_trips','vehicle_costs','vehicle_deals',
    'documents','employees','time_entries','pay_runs','pay_stubs','tax_periods','estimated_tax_payments',
    'estimate_approvals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Admins manage %s" on public.%I', t, t);
    execute format('create policy "Admins manage %s" on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t, t);
    execute format('drop policy if exists "Books read %s" on public.%I', t, t);
    execute format('create policy "Books read %s" on public.%I for select to authenticated using ((select public.can_read_books()))', t, t);
  end loop;
  -- Existing operational tables: give the bookkeeper read access too.
  foreach t in array array['customers','customer_vehicles','repair_orders','repair_order_items','payments',
    'parts','settings','activity_log','notifications','appointments','services'] loop
    execute format('drop policy if exists "Books read %s" on public.%I', t, t);
    execute format('create policy "Books read %s" on public.%I for select to authenticated using ((select public.can_read_books()))', t, t);
  end loop;
end $$;

-- Posted journal entries are written only by the posting functions; people
-- can add manual entries (adjustments) but not edit system ones.
drop policy if exists "Admins manage journal_entries" on public.journal_entries;
create policy "Admins manage manual journal entries" on public.journal_entries for all to authenticated
  using ((select public.is_admin()) and source_type = 'manual')
  with check ((select public.is_admin()) and source_type = 'manual');
drop policy if exists "Admins manage journal_lines" on public.journal_lines;
create policy "Admins manage manual journal lines" on public.journal_lines for all to authenticated
  using ((select public.is_admin()) and exists (select 1 from public.journal_entries e where e.id = entry_id and e.source_type = 'manual'))
  with check ((select public.is_admin()) and exists (select 1 from public.journal_entries e where e.id = entry_id and e.source_type = 'manual'));

-- Accounts: system accounts can be renamed but not removed or retyped.
create or replace function public.trg_guard_account()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'Accounts cannot be deleted. Mark it inactive instead.'; end if;
  if old.is_system and (new.type <> old.type or new.code <> old.code or not new.active) then
    raise exception 'This is a built-in account; you can rename it but not change its type, number or remove it.';
  end if;
  return new;
end;
$$;
drop trigger if exists accounts_guard on public.accounts;
create trigger accounts_guard before update or delete on public.accounts
  for each row execute function public.trg_guard_account();

-- Taxpayer IDs: owner only.
alter table public.tax_ids enable row level security;
create policy "Owners manage tax ids" on public.tax_ids for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

-- Rates: only the owner changes them.
drop policy if exists "Admins manage tax_rates" on public.tax_rates;
create policy "Owners manage tax_rates" on public.tax_rates for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
create policy "Staff read tax_rates" on public.tax_rates for select to authenticated
  using ((select public.staff_role()) is not null);

-- =========================================================== audit triggers
do $$
declare t text;
begin
  foreach t in array array['repair_orders','repair_order_items','payments','customers','vendors','tax_ids',
    'expenses','expense_lines','deposits','vehicle_deals','vehicle_costs','employees','time_entries',
    'pay_runs','pay_stubs','tax_periods','tax_rates','accounts','journal_entries','journal_lines','settings',
    'admin_users','parts','estimated_tax_payments','fixed_assets','mileage_trips'] loop
    execute format('drop trigger if exists %I_audit on public.%I', t, t);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.trg_audit()', t, t);
  end loop;
end $$;

-- =========================================================== storage: documents bucket
create policy "Admins manage documents" on storage.objects for all to authenticated
  using (bucket_id = 'documents' and (select public.is_admin()))
  with check (bucket_id = 'documents' and (select public.is_admin()));
create policy "Books read documents" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (select public.can_read_books()));

revoke all on function public.trg_audit(), public.trg_journal_balanced(), public.trg_guard_period(),
  public.trg_guard_repair_order(), public.trg_guard_ro_item(), public.trg_no_delete(),
  public.trg_guard_expense_line(), public.trg_guard_account(), public.trg_keep_an_owner(),
  public.trg_part_stock() from public, anon, authenticated;
