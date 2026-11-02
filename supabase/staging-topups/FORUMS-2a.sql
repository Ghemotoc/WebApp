-- Staging top-up for FORUMS-2a (story S1-E8-06): the two seed spaces.
--
-- What it is for: supabase/seed.sql now starts two spaces so /spaces and the forum index's
-- Spaces card have something to show. Staging already holds the seed personas, so the seed can't
-- be loaded again (duplicate keys); this file adds only the spaces.
-- How to run it: in the Supabase SQL Editor for staging, paste the whole file and run it. It is
-- safe to run twice (fixed IDs, "on conflict do nothing") and adds no accounts.
-- Never production: it does nothing on a database without the seed personas.
do $$
begin
  if not exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-000000000001') then
    raise notice 'No seed personas here: nothing to do.';
    return;
  end if;

  -- 1. The spaces: a 16+ one by adult_writer (members-only posting, the owner approves) and an
  --    under-16 one by kid_14_ok (read by its members only, anyone under 16 may post and join).
  insert into public.spaces (id, user_id, slug, name, name_key, description, rules, age_group, readers, posting, joining, banner)
  values
    ('00000000-0000-4000-a000-000000000a01', '00000000-0000-4000-8000-000000000001', 'fantasy-writers-circle',
     'Fantasy writers’ circle', public.space_name_key('Fantasy writers’ circle'),
     'For people who write fantasy: magic systems, invented worlds and stories based on Romanian folklore. Share chapters, ask for feedback and take part in the monthly prompt.',
     E'Fantasy only. Science fiction goes in the main forums.\nWhen you ask for feedback, say what kind you want.\nMark spoilers for published books.',
     '16_plus', 'everybody', 'members', 'approve', 'plum'),
    ('00000000-0000-4000-a000-000000000a02', '00000000-0000-4000-8000-000000000003', 'young-poets',
     'Young poets', public.space_name_key('Young poets'),
     'Poems by and for writers under 16. Post one, read others, say something kind.',
     E'Poems only.\nBe kind and specific.',
     'under_16', 'members', 'anyone', 'open', 'gold')
  on conflict (id) do nothing;

  -- 2. Each space's hidden forum, named after it.
  insert into public.forums (id, slug, space_id)
  values ('00000000-0000-4000-a000-000000000a11', 'space-fantasy-writers-circle', '00000000-0000-4000-a000-000000000a01'),
         ('00000000-0000-4000-a000-000000000a12', 'space-young-poets', '00000000-0000-4000-a000-000000000a02')
  on conflict (id) do nothing;
  perform public.write_space_forum_names('00000000-0000-4000-a000-000000000a01', 'Fantasy writers’ circle');
  perform public.write_space_forum_names('00000000-0000-4000-a000-000000000a02', 'Young poets');

  -- 3. The owners, and teacher as a member of the 16+ space.
  insert into public.space_members (user_id, space_id, role, status, joined_at)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-a000-000000000a01', 'owner', 'active', now()),
         ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-a000-000000000a02', 'owner', 'active', now()),
         ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-a000-000000000a01', 'member', 'active', now())
  on conflict on constraint space_members_once do nothing;
end;
$$;
