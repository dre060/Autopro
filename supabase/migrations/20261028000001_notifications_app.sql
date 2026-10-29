-- Admin app (PWA) + customer notifications.
--  * notifications: every message sent to a customer (email / SMS / manual text)
--  * push_subscriptions: admin devices that receive push alerts
--  * push_targets(): lets the website's server fan out pushes using a shared
--    secret instead of the all-powerful service-role key.

alter table public.repair_orders add column if not exists customer_notified_at timestamptz;

create table if not exists public.notifications (
  id               uuid primary key default gen_random_uuid(),
  repair_order_id  uuid references public.repair_orders(id) on delete cascade,
  customer_id      uuid references public.customers(id) on delete set null,
  channel          text not null check (channel in ('email','sms','sms_manual','push')),
  event            text not null default 'custom' check (event in ('ready','status','custom','reminder')),
  recipient        text,
  body             text,
  status           text not null default 'sent' check (status in ('sent','failed','queued')),
  error            text,
  provider_id      text,
  sent_by          text default (auth.jwt() ->> 'email'),
  created_at       timestamptz not null default now()
);
create index if not exists notifications_ro_idx on public.notifications (repair_order_id, created_at desc);
create index if not exists notifications_customer_idx on public.notifications (customer_id);
alter table public.notifications enable row level security;
create policy "Admins manage notifications" on public.notifications for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_email    text default (auth.jwt() ->> 'email'),
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);
alter table public.push_subscriptions enable row level security;
create policy "Admins manage push subscriptions" on public.push_subscriptions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Secrets the server proves it knows (only a SHA-256 hash is stored).
create table if not exists public.app_secrets (
  name         text primary key,
  secret_hash  text not null,
  updated_at   timestamptz not null default now()
);
alter table public.app_secrets enable row level security;  -- no policies: invisible to the API

create or replace function public.push_targets(p_secret text)
returns table (endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.app_secrets
                 where name = 'push' and secret_hash = encode(sha256(convert_to(p_secret, 'UTF8')), 'hex')) then
    raise exception 'Not authorized';
  end if;
  update public.push_subscriptions set last_used_at = now() where true;  -- Supabase requires a WHERE on UPDATE
  return query select s.endpoint, s.p256dh, s.auth from public.push_subscriptions s;
end;
$$;
revoke all on function public.push_targets(text) from public;
grant execute on function public.push_targets(text) to anon, authenticated;

create or replace function public.remove_push_target(p_secret text, p_endpoint text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.app_secrets
                 where name = 'push' and secret_hash = encode(sha256(convert_to(p_secret, 'UTF8')), 'hex')) then
    raise exception 'Not authorized';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
end;
$$;
revoke all on function public.remove_push_target(text, text) from public;
grant execute on function public.remove_push_target(text, text) to anon, authenticated;

-- Notification defaults in shop settings
update public.settings
set value = value || jsonb_build_object('notify', coalesce(value->'notify', jsonb_build_object(
  'auto_ready', false,
  'ready_template', 'Auto Pro: Hi {first_name}, your {vehicle} is ready for pickup! Total {total}. {link}',
  'status_template', 'Auto Pro: Hi {first_name}, update on your {vehicle}: {status}. Track it here: {link}'
)))
where key = 'shop';
