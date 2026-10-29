-- Defense in depth. RLS already blocks rows, but the API roles still held
-- every table privilege (incl. TRUNCATE, which RLS does not cover). Grant only
-- what the public website needs; everything else goes through signed-in staff.

revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- New objects created by migrations no longer get anon grants automatically.
alter default privileges for role postgres in schema public revoke all on tables    from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke truncate, references, trigger on tables from authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon;

-- What the public site uses (all still filtered by RLS):
grant select on public.services, public.testimonials to anon;
grant insert on public.appointments, public.contact_messages, public.vehicle_analytics to anon;
grant select (
  id, vin, stock_number, year, make, model, trim, body_type, engine, transmission,
  drivetrain, fuel_type, mileage, exterior_color, interior_color, interior_material,
  list_price, sale_price, price, status, condition, sold_date, description, features,
  key_features, accident_history, number_of_owners, slug, meta_title, meta_description,
  views, featured, is_active, created_at, updated_at, carfax_available, carfax_url,
  financing_available, images, monthly_payment, service_records, title_status
) on public.vehicles to anon;

-- Trigger functions are never called directly.
revoke execute on function public.trg_repair_order_status() from public, anon, authenticated;
revoke execute on function public.update_updated_at_column() from public, anon, authenticated;
revoke execute on function public.generate_vehicle_slug() from public, anon, authenticated;

-- Legacy custom-auth table (empty; replaced by Supabase Auth). It held a
-- password_hash column, so remove it rather than leave it around.
drop table if exists public.users cascade;

-- Storage: private bucket for receipts, title docs, tax certificates.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 15728640,
        array['image/png','image/jpeg','image/webp','image/heic','image/heif','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
