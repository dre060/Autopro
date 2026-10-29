-- Title brand disclosure (rebuilt/salvage/etc.) for vehicles listed in the
-- admin panel; the public listing pages already display it.
alter table public.vehicles add column if not exists title_status text
  check (title_status in ('Clean','Rebuilt','Salvage','Flood','Lemon buyback','Other'));
grant select (title_status) on public.vehicles to anon;
