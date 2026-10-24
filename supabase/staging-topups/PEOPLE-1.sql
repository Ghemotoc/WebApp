-- Staging top-up for PEOPLE-1 (S1-E5-05 profiles and blocks, S1-E6-05 follows).
--
-- Who runs it: Robert, once, in the Supabase SQL editor on staging, after the PEOPLE-1 pull
-- request is merged and its migrations have reached staging. Never on production.
-- What it does: the same persona rows supabase/seed.sql adds for PEOPLE-1 (two bios, blocker
-- blocks blocked, teen_17 follows adult_writer and "Stația meteo"). It adds no accounts and is
-- safe to run twice: every insert skips a row that is already there, and the bios are only set
-- while they are still empty.
-- Expect: one row, "people_1_ready | t".
update public.profiles set bio = 'Scriu povești scurte despre orașe mici și oamenii care le țin minte.'
  where id = '00000000-0000-4000-8000-000000000001' and bio = '';
update public.profiles set bio = 'Poems on the night bus. Mostly about weather.'
  where id = '00000000-0000-4000-8000-000000000015' and bio = '';
insert into public.blocks (user_id, blocked_user_id)
  values ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000016')
  on conflict on constraint blocks_one_per_pair do nothing;
insert into public.follows_users (user_id, followed_user_id)
  values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001')
  on conflict on constraint follows_users_one_per_pair do nothing;
insert into public.follows_stories (user_id, story_id)
  select '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-9000-000000000001'
  where exists (select 1 from public.stories where id = '00000000-0000-4000-9000-000000000001')
  on conflict on constraint follows_stories_one_per_pair do nothing;
select exists (select 1 from public.blocks
  where user_id = '00000000-0000-4000-8000-000000000015'
    and blocked_user_id = '00000000-0000-4000-8000-000000000016') as people_1_ready;
