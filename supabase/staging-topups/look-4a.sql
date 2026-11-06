-- Staging top-up: two picks for Featured this week (story S1-E5-10, bundle LOOK-4a), so the band
-- shows at the top of Discover on staging, as seed.sql does locally.
--
-- What it does: when nothing is picked yet, picks the first two All ages demo stories (or, without
-- the demo content, seed stories) that may be featured, as the admin persona. Adds no accounts.
-- Rules (supabase/staging-topups/README.md): safe to run twice (it does nothing once a pick
-- exists); never production (step 1). Run it after the LOOK-4a migrations reach staging.
-- How to check it worked: the last query shows two rows, in order.
begin;

-- 1. Never production: the 16 seed personas exist only on local and staging databases.
do $$
begin
  if (select count(*) from auth.users where email like '%@personas.test') < 16 then
    raise exception 'This top-up is for local and staging databases only: the 16 seed personas are missing.';
  end if;
end;
$$;

-- 2. The picks: demo stories first (IDs …-9100-…), then seed stories, only when none is picked.
insert into public.featured_picks (story_id, position, user_id)
select picked.id, picked.place, '00000000-0000-4000-8000-000000000009'
from (
  select stories.id, row_number() over (
      order by (stories.id::text like '00000000-0000-4000-9100-%') desc, stories.id)::integer as place
  from public.stories
  where stories.rating = 'all_ages' and public.featured_ineligible_reason(stories.id) is null
  order by place
  limit 2
) as picked
where not exists (select 1 from public.featured_picks where removed_at is null);

commit;

-- 3. The check: the band's stories in order.
select featured_picks.position, stories.title
from public.featured_picks join public.stories on stories.id = featured_picks.story_id
where featured_picks.removed_at is null
order by featured_picks.position;
