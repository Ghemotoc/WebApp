-- Staging top-up for story S1-E10-06 (sanctions), 23 Oct 2026.
--
-- What it adds: the sanctions the seed's decided cases carry out (supabase/seed.sql, the
-- S1-E10-03a block): a 7-day suspension on suspended_user and a ban on banned_user, as the
-- moderator persona. Needed only when the S1-E10-03a top-up ran before this story was merged
-- (then its decided cases closed without an action); otherwise nothing changes.
-- Rules (supabase/staging-topups/README.md): adds no accounts, touches only persona rows and is
-- safe to run twice: a live sanction of the same kind is left alone.
-- Needs: the Vault secret banned_email_secret (By hand in the pull request); without it the ban
-- still applies, but the email isn't blocked from signing up again.
-- How to check it worked: the last query shows suspended_user suspended and banned_user banned.
begin;

do $$
declare
  moderator_id constant uuid := '00000000-0000-4000-8000-000000000010';
  suspended_id constant uuid := '00000000-0000-4000-8000-000000000013';
  banned_id constant uuid := '00000000-0000-4000-8000-000000000014';
begin
  perform set_config('request.jwt.claims', json_build_object('sub', moderator_id, 'role', 'authenticated')::text, true);
  if (public.active_sanction(suspended_id, 'suspension')).id is null then
    perform public.admin_apply_sanction(suspended_id, 'suspension', 7,
      (select id from public.cases where user_id = suspended_id and decision = 'suspend' limit 1),
      'Seed: second upheld case in 30 days; a 7-day suspension.');
  end if;
  if (public.active_sanction(banned_id, 'ban')).id is null then
    perform public.admin_apply_sanction(banned_id, 'ban', null,
      (select id from public.cases where user_id = banned_id and decision = 'ban' limit 1),
      'Seed: repeat hate speech after a suspension.');
  end if;
  perform set_config('request.jwt.claims', '', true);
end;
$$;

select profiles.handle, public.account_state(profiles.id) as state
from public.profiles
where profiles.id in ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000014');

commit;
