-- Staging top-up for SAFE-3 (stories S1-E10-04, S1-E10-09 and S1-E10-10), 26 Oct 2026.
--
-- What it adds: the owner persona's "on call for removal orders" permission and a 30-day on-call
-- shift starting now (supabase/seed.sql, the S1-E10-09 block), so an order on staging alerts
-- someone by name and /staff/on-call has a shift to show.
-- Rules (supabase/staging-topups/README.md): adds no accounts, touches only persona rows and is
-- safe to run twice: the permission is added only when missing, and the shift only when the
-- rota has no shift that hasn't ended (shifts can't overlap).
-- How to check it worked: the last query shows the owner's shift.
begin;

insert into public.staff_permissions (user_id, permission, granted_by_user_id)
values ('00000000-0000-4000-8000-000000000008', 'on_call', '00000000-0000-4000-8000-000000000008')
on conflict do nothing;

insert into public.on_call_rota (user_id, starts_at, ends_at, created_by_user_id)
select '00000000-0000-4000-8000-000000000008', now(), now() + interval '30 days', '00000000-0000-4000-8000-000000000008'
where not exists (
  select 1 from public.on_call_rota where on_call_rota.ends_at > now()
);

select profiles.handle, on_call_rota.starts_at, on_call_rota.ends_at
from public.on_call_rota
join public.profiles on profiles.id = on_call_rota.user_id
where on_call_rota.ends_at > now();

commit;
