-- Customer-facing estimate/invoice link (/i/<public_token>).
-- Anonymous visitors can only reach a repair order by its unguessable token,
-- and only through these functions — never through the table itself.

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
      'number', ro.number, 'status', ro.status, 'complaint', ro.complaint,
      'diagnosis', ro.diagnosis, 'recommendations', ro.recommendations,
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
      'email', c.email, 'phone', c.phone,
      'address', nullif(concat_ws(', ', c.address_street, c.address_city,
                         nullif(concat_ws(' ', c.address_state, c.address_zip), '')), '')) end,
    'vehicle', case when v.id is null then null else jsonb_build_object(
      'year', v.year, 'make', v.make, 'model', v.model, 'trim', v.trim,
      'vin', v.vin, 'license_plate', v.license_plate, 'color', v.color) end,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'kind', i.kind, 'description', i.description, 'part_number', i.part_number,
        'quantity', i.quantity, 'unit_price', i.unit_price, 'taxable', i.taxable,
        'approved', i.approved, 'amount', round(i.quantity * i.unit_price, 2))
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

revoke all on function public.get_public_repair_order(uuid) from public;
grant execute on function public.get_public_repair_order(uuid) to anon, authenticated;

-- Customer approves or declines an estimate from the link.
create or replace function public.respond_to_estimate(p_token uuid, p_approve boolean, p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid; v_status text; v_number bigint;
begin
  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'Please type your full name to sign.';
  end if;

  select id, status, number into v_id, v_status, v_number
  from public.repair_orders where public_token = p_token for update;

  if v_id is null then raise exception 'Estimate not found.'; end if;
  if v_status <> 'estimate' then return v_status; end if;

  if p_approve then
    update public.repair_orders
    set status = 'approved', approved_at = now(), approved_by_name = left(trim(p_name), 120),
        declined_at = null
    where id = v_id;
  else
    update public.repair_orders
    set declined_at = now(), approved_by_name = left(trim(p_name), 120)
    where id = v_id;
  end if;

  insert into public.activity_log (actor, action, entity, entity_id, summary)
  values ('customer', case when p_approve then 'approve' else 'decline' end, 'repair_orders', v_id::text,
          'Customer ' || case when p_approve then 'approved' else 'declined' end ||
          ' estimate #' || v_number || ' (' || left(trim(p_name), 120) || ')');

  return case when p_approve then 'approved' else 'declined' end;
end;
$$;

revoke all on function public.respond_to_estimate(uuid, boolean, text) from public;
grant execute on function public.respond_to_estimate(uuid, boolean, text) to anon, authenticated;
