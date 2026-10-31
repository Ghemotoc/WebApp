-- Staging top-up for S1-E2-11 (the Teacher badge): the teacher persona's badge and approved
-- check, and the moderator persona's teacher checks permission, which seed.sql now adds, for
-- staging, which already holds the personas and can't load seed.sql again (CLAUDE.md, Safety
-- while building). Safe to run twice: each change is made only when it isn't there yet. Adds no
-- accounts. Paste into the staging SQL editor after the migration has reached staging.
update public.profiles set teacher_badge_since = now()
where id = '00000000-0000-4000-8000-000000000007' and teacher_badge_since is null;
insert into public.teacher_checks (user_id, way, school_domain, status, decided_at)
select '00000000-0000-4000-8000-000000000007', 'school_email', 'liceul-exemplu.edu.ro', 'approved', now()
where exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-000000000007')
  and not exists (select 1 from public.teacher_checks where user_id = '00000000-0000-4000-8000-000000000007');
insert into public.staff_permissions (user_id, permission, granted_by_user_id)
select '00000000-0000-4000-8000-000000000010', 'teacher_checks', '00000000-0000-4000-8000-000000000008'
where exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-000000000010')
  and not exists (select 1 from public.staff_permissions
                  where user_id = '00000000-0000-4000-8000-000000000010' and permission = 'teacher_checks');
