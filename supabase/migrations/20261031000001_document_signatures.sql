-- Customer signatures on estimates (authorize repairs) and invoices
-- (accept completed work). Drawn signature stored as a small PNG data URL,
-- with name, time, total at signing, IP and browser for the record.

create table if not exists public.document_signatures (
  id                uuid primary key default gen_random_uuid(),
  repair_order_id   uuid not null references public.repair_orders(id) on delete cascade,
  kind              text not null check (kind in ('estimate','invoice')),
  signer_name       text not null check (length(trim(signer_name)) >= 2),
  signature         text not null check (signature like 'data:image/png;base64,%' and length(signature) < 400000),
  source            text not null default 'online' check (source in ('online','in_shop')),
  total_at_signing  numeric(12,2),
  ip_address        text,
  user_agent        text,
  captured_by       text default coalesce(auth.jwt() ->> 'email', 'customer'),
  signed_at         timestamptz not null default now()
);
create index if not exists document_signatures_ro_idx on public.document_signatures (repair_order_id, kind, signed_at desc);

alter table public.document_signatures enable row level security;
create policy "Admins add and read signatures" on public.document_signatures for select to authenticated
  using ((select public.is_admin()) or (select public.can_read_books()));
create policy "Admins capture signatures in shop" on public.document_signatures for insert to authenticated
  with check ((select public.is_admin()));
-- Signatures are records: no updates or deletes from the API.
drop trigger if exists document_signatures_no_delete on public.document_signatures;
create trigger document_signatures_no_delete before delete on public.document_signatures
  for each row execute function public.trg_no_delete();
drop trigger if exists document_signatures_audit on public.document_signatures;
create trigger document_signatures_audit after insert on public.document_signatures
  for each row execute function public.trg_audit();

create or replace function public.request_meta()
returns jsonb language plpgsql stable set search_path = '' as $$
declare h json;
begin
  begin h := current_setting('request.headers', true)::json; exception when others then h := null; end;
  return jsonb_build_object(
    'ip', left(split_part(coalesce(h ->> 'x-forwarded-for', h ->> 'x-real-ip', ''), ',', 1), 60),
    'ua', left(h ->> 'user-agent', 300));
end;
$$;
revoke all on function public.request_meta() from public, anon, authenticated;

-- Estimate approval now takes a drawn signature (old 3-arg callers still work).
drop function if exists public.respond_to_estimate_lines(uuid, text, uuid[]);
create or replace function public.respond_to_estimate_lines(p_token uuid, p_name text, p_item_ids uuid[], p_signature text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_status text; v_number bigint; v_approve boolean; v_total numeric; m jsonb := public.request_meta();
        v_yes uuid[]; v_no uuid[];
begin
  if p_name is null or length(trim(p_name)) < 2 then raise exception 'Please type your full name to sign.'; end if;
  if p_signature is not null and (p_signature not like 'data:image/png;base64,%' or length(p_signature) >= 400000) then
    raise exception 'Signature image is invalid. Please sign again.';
  end if;
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

  insert into public.estimate_approvals (repair_order_id, approved, signer_name, items_approved, items_declined, total_approved, ip_address, user_agent)
  values (v_id, v_approve, left(trim(p_name), 120), v_yes, v_no, case when v_approve then v_total end, m ->> 'ip', m ->> 'ua');

  if v_approve and p_signature is not null then
    insert into public.document_signatures (repair_order_id, kind, signer_name, signature, source, total_at_signing, ip_address, user_agent, captured_by)
    values (v_id, 'estimate', left(trim(p_name), 120), p_signature, 'online', v_total, m ->> 'ip', m ->> 'ua', 'customer');
  end if;

  insert into public.activity_log (actor, action, entity, entity_id, summary)
  values ('customer', case when v_approve then 'approve' else 'decline' end, 'repair_orders', v_id::text,
          'Customer ' || case when v_approve then 'signed and approved ' || cardinality(v_yes) || ' of ' || (cardinality(v_yes) + cardinality(v_no)) || ' lines on'
                              else 'declined' end || ' estimate #' || v_number || ' (' || left(trim(p_name), 120) || ')');
  return case when v_approve then 'approved' else 'declined' end;
end;
$$;
revoke all on function public.respond_to_estimate_lines(uuid, text, uuid[], text) from public;
grant execute on function public.respond_to_estimate_lines(uuid, text, uuid[], text) to anon, authenticated;

-- Customer signs the invoice (accepts the completed work) from their link.
create or replace function public.sign_invoice(p_token uuid, p_name text, p_signature text)
returns text language plpgsql security definer set search_path = '' as $$
declare r record; m jsonb := public.request_meta();
begin
  if p_name is null or length(trim(p_name)) < 2 then raise exception 'Please type your full name to sign.'; end if;
  if p_signature is null or p_signature not like 'data:image/png;base64,%' or length(p_signature) >= 400000 then
    raise exception 'Please sign in the box first.';
  end if;
  select id, invoice_number, total, invoiced_at, voided_at, doc_type into r
  from public.repair_orders where public_token = p_token;
  if r.id is null or r.invoiced_at is null or r.voided_at is not null or r.doc_type <> 'invoice' then
    raise exception 'This invoice can''t be signed.';
  end if;
  if exists (select 1 from public.document_signatures where repair_order_id = r.id and kind = 'invoice') then
    return 'already_signed';
  end if;
  insert into public.document_signatures (repair_order_id, kind, signer_name, signature, source, total_at_signing, ip_address, user_agent, captured_by)
  values (r.id, 'invoice', left(trim(p_name), 120), p_signature, 'online', r.total, m ->> 'ip', m ->> 'ua', 'customer');
  insert into public.activity_log (actor, action, entity, entity_id, summary)
  values ('customer', 'sign', 'repair_orders', r.id::text, 'Customer signed invoice #' || r.invoice_number || ' (' || left(trim(p_name), 120) || ')');
  return 'signed';
end;
$$;
revoke all on function public.sign_invoice(uuid, text, text) from public;
grant execute on function public.sign_invoice(uuid, text, text) to anon, authenticated;

-- Customer page shows the signatures on the document.
do $$ begin
  execute replace(pg_get_functiondef('public.get_public_repair_order(uuid)'::regprocedure),
    '''payments'', coalesce((',
    '''signatures'', coalesce((
      select jsonb_agg(jsonb_build_object(''kind'', s.kind, ''signer_name'', s.signer_name, ''signed_at'', s.signed_at,
                                          ''signature'', s.signature, ''source'', s.source) order by s.signed_at)
      from (select distinct on (kind) * from public.document_signatures where repair_order_id = ro.id order by kind, signed_at desc) s), ''[]''::jsonb),
    ''payments'', coalesce((');
end $$;
