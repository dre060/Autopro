-- Security lockdown for the Auto Pro database.
--
-- Before this migration any signed-in user (and in several places any
-- anonymous visitor) could read or modify every table: "Authenticated full
-- access" policies, six tables without RLS, anonymous storage upload/delete,
-- and SECURITY DEFINER functions without a fixed search_path.
--
-- Admin access is now an explicit allowlist (public.admin_users) checked by
-- public.is_admin(), which also requires the account's email to be verified.

-- ---------------------------------------------------------------------------
-- Admin allowlist
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  email       text primary key check (email = lower(email)),
  full_name   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into public.admin_users (email, full_name) values
  ('service@autoprorepairs.com', 'Auto Pro Service'),
  ('andrelewis1533@gmail.com',   'Andre Lewis')
on conflict (email) do update set active = true;

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.admin_users a on a.email = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
      and a.active
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create policy "Admins read admin list" on public.admin_users
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Drop every existing policy on the app tables, then rebuild them cleanly.
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('appointments','contact_messages','profiles','services',
                        'testimonials','vehicle_analytics','vehicles')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;

  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in ('Admin Upload','Anon Delete vehicle images','Anon Upload vehicle images',
                         'Public Access','Public read access for vehicle images')
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

-- Tables that previously had RLS disabled. Legacy tables (users,
-- vehicle_images, appointment_services, service_history) are unused by the
-- app; they get RLS with an admin-only policy so nothing is exposed.
alter table public.customers            enable row level security;
alter table public.settings             enable row level security;
alter table public.users                enable row level security;
alter table public.vehicle_images       enable row level security;
alter table public.appointment_services enable row level security;
alter table public.service_history      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['customers','settings','users','vehicle_images',
                           'appointment_services','service_history']
  loop
    execute format(
      'create policy "Admins manage %1$s" on public.%1$I for all to authenticated
         using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;

-- vehicles: public catalog, admin writes
create policy "Public can view active vehicles" on public.vehicles
  for select to anon, authenticated
  using (coalesce(is_active, true) or (select public.is_admin()));
create policy "Admins insert vehicles" on public.vehicles
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update vehicles" on public.vehicles
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete vehicles" on public.vehicles
  for delete to authenticated using ((select public.is_admin()));

-- Dealer cost fields must not be readable by the public.
revoke select on public.vehicles from anon;
grant select (
  id, vin, stock_number, year, make, model, trim, body_type, engine, transmission,
  drivetrain, fuel_type, mileage, exterior_color, interior_color, interior_material,
  list_price, sale_price, price, status, condition, sold_date, description, features,
  key_features, accident_history, number_of_owners, slug, meta_title, meta_description,
  views, featured, is_active, created_at, updated_at, carfax_available, carfax_url,
  financing_available, images, monthly_payment, service_records
) on public.vehicles to anon;

-- services
create policy "Public can view active services" on public.services
  for select to anon, authenticated
  using (coalesce(is_active, true) or (select public.is_admin()));
create policy "Admins manage services" on public.services
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- testimonials
create policy "Public can view approved testimonials" on public.testimonials
  for select to anon, authenticated
  using (coalesce(is_approved, false) or (select public.is_admin()));
create policy "Admins manage testimonials" on public.testimonials
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- appointments: anyone may request one (pending only); admins do the rest
create policy "Public can request appointments" on public.appointments
  for insert to anon, authenticated
  with check (
    coalesce(status, 'pending') = 'pending'
    and internal_notes is null and actual_cost is null
    and coalesce(payment_status, 'pending') = 'pending'
  );
create policy "Admins read appointments" on public.appointments
  for select to authenticated using ((select public.is_admin()));
create policy "Admins update appointments" on public.appointments
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete appointments" on public.appointments
  for delete to authenticated using ((select public.is_admin()));

-- contact messages: anyone may send; admins read/manage
create policy "Public can send messages" on public.contact_messages
  for insert to anon, authenticated
  with check (coalesce(responded, false) = false and response_notes is null);
create policy "Admins read messages" on public.contact_messages
  for select to authenticated using ((select public.is_admin()));
create policy "Admins update messages" on public.contact_messages
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete messages" on public.contact_messages
  for delete to authenticated using ((select public.is_admin()));

-- profiles: own row or admin (was readable by everyone)
create policy "Users read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins manage profiles" on public.profiles
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- vehicle analytics: anonymous page-view inserts, admin reads
create policy "Public can record vehicle views" on public.vehicle_analytics
  for insert to anon, authenticated with check (vehicle_id is not null);
create policy "Admins read vehicle analytics" on public.vehicle_analytics
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Storage: the bucket stays public for <img> URLs, but only admins may
-- upload, replace, delete or list files.
-- ---------------------------------------------------------------------------
update storage.buckets
set file_size_limit = 15728640,
    allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif','image/avif']
where id = 'vehicle-images';

create policy "Admins list vehicle images" on storage.objects
  for select to authenticated
  using (bucket_id = 'vehicle-images' and (select public.is_admin()));
create policy "Admins upload vehicle images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vehicle-images' and (select public.is_admin()));
create policy "Admins update vehicle images" on storage.objects
  for update to authenticated
  using (bucket_id = 'vehicle-images' and (select public.is_admin()));
create policy "Admins delete vehicle images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'vehicle-images' and (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Functions: fixed search_path, no RPC access to trigger functions.
-- ---------------------------------------------------------------------------
drop function if exists public.create_admin_user();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.increment_vehicle_views(vehicle_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.vehicles set views = coalesce(views, 0) + 1 where id = vehicle_id;
end;
$$;
revoke all on function public.increment_vehicle_views(uuid) from public;
grant execute on function public.increment_vehicle_views(uuid) to anon, authenticated;

create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.generate_vehicle_slug()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.slug = lower(regexp_replace(
    new.year || '-' || new.make || '-' || new.model || '-' || coalesce(new.stock_number, new.id::text),
    '[^a-zA-Z0-9]+', '-', 'g'));
  return new;
end;
$$;

-- generate_vehicle_slug_trigger was attached twice (insert and update rows
-- reported separately by information_schema); nothing to change there.

-- ---------------------------------------------------------------------------
-- Indexes for foreign keys flagged by the performance advisor
-- ---------------------------------------------------------------------------
create index if not exists appointment_services_appointment_id_idx on public.appointment_services (appointment_id);
create index if not exists appointment_services_service_id_idx     on public.appointment_services (service_id);
create index if not exists appointments_customer_id_idx            on public.appointments (customer_id);
create index if not exists service_history_appointment_id_idx      on public.service_history (appointment_id);
create index if not exists service_history_customer_id_idx         on public.service_history (customer_id);
create index if not exists vehicle_analytics_vehicle_id_idx        on public.vehicle_analytics (vehicle_id);
create index if not exists vehicle_images_vehicle_id_idx           on public.vehicle_images (vehicle_id);
create index if not exists appointments_date_idx                   on public.appointments (appointment_date);
create index if not exists contact_messages_created_idx            on public.contact_messages (created_at desc);
