-- Company-only customers (e.g. export dealers) don't need a person's first name.
alter table public.customers alter column first_name drop not null;

-- Default invoice fine print that works for any terms.
update public.settings set value = value || jsonb_build_object('invoice_terms',
  'Payment is due by the due date shown above. All parts and labor carry a 12-month / 12,000-mile limited warranty unless noted otherwise.')
where key = 'shop' and value->>'invoice_terms' like 'Payment is due when the vehicle is picked up%';
