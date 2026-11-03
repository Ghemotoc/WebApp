-- Staging top-up for ADMIN-2e2a (bundle ADMIN-2, part e2a; Robert's brief of 2 Nov 2026,
-- section 5), 3 Nov 2026.
--
-- What it adds: the picture review permission for the owner, admin and moderator personas
-- (supabase/seed.sql), so they can keep using Moderation › Pictures to check on staging. Real
-- staff accounts get it from an owner or admin on Staff › Roles.
-- Rules (supabase/staging-topups/README.md): adds no accounts, touches only persona rows and is
-- safe to run twice: a permission is added only when the persona exists and lacks it.
-- How to check it worked: the last query lists the three personas.
begin;

insert into public.staff_permissions (user_id, permission, granted_by_user_id)
select profiles.id, 'picture_review', '00000000-0000-4000-8000-000000000008'
from public.profiles
where profiles.id in ('00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000009',
                      '00000000-0000-4000-8000-000000000010')
on conflict do nothing;

commit;

select profiles.handle from public.staff_permissions
join public.profiles on profiles.id = staff_permissions.user_id
where staff_permissions.permission = 'picture_review'
order by profiles.handle;
