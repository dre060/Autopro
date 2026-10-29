-- Admins can book appointments directly in any status (the public policy
-- only allows "pending" requests).
create policy "Admins insert appointments" on public.appointments
  for insert to authenticated with check ((select public.is_admin()));
