/**
 * Migration: rank badges on a story's cover (CMS-1g; Robert, 30 Oct 2026, 10:44 to 10:48).
 *
 * What it adds:
 * - stories.rank_badge_tag_ids: the up to 3 tags the writer picked for the badges, or null for
 *   "automatic" (the story's 3 best ranks). Written only by set_rank_badge_tags().
 * - The setting rank_badge_min_stories: a tag needs at least this many stories before a rank in it
 *   is shown, so "#1 in Owls" among 2 stories doesn't read as an achievement.
 * - story_tag_ranks(): where a story stands in each of its approved tags ("#4 in Fantasy, out of
 *   38"), for the badges under the cover on the story page and for the writer's picker.
 * - set_rank_badge_tags(): the writer picks which tags the badges show, or goes back to automatic.
 *
 * The rules Robert set:
 * - The same formula as every other ranking: the popular order of Discover and the tag page
 *   (story_scores from S1-E5-03, ties to the newer story, then the address), so the badge always
 *   matches the position on the tag page.
 * - Ranks count only the stories this reader may see (listed_stories(): the rating for their age,
 *   blocks and moderation), so a 14-year-old's "#3" is among the stories a 14-year-old can open.
 * - The cover shows the story's top 3 ranks by default; the writer may pick a different 3 "to stir
 *   the conversation in a different direction".
 * A story with no score yet (no activity in the ranking window) shows no badge: every story would
 *   otherwise tie at 0 and the rank would only say how new it is.
 * Who calls it: src/features/tags/api/tagRanks.ts (the story page and Story settings).
 * Tests: supabase/tests/database/176-tag-rank-badges.test.sql, e2e/tag-rank-badges.spec.ts.
 */

/* ---------- The writer's pick and the setting ---------- */

alter table public.stories
  add column rank_badge_tag_ids uuid[] check (rank_badge_tag_ids is null or cardinality(rank_badge_tag_ids) <= 3);
comment on column public.stories.rank_badge_tag_ids is
  'The up to 3 tags the writer picked for the rank badges on the cover; null means the 3 best ranks (CMS-1g).';

insert into public.settings (key, value, is_public, description) values
  ('rank_badge_min_stories', '5'::jsonb, false,
   'Rank badges: a tag needs at least this many stories the reader can see before a rank in it shows on a cover (CMS-1g).')
on conflict (key) do nothing;

/* ---------- Where a story stands in each of its tags ---------- */

/**
 * story_rank_in_tag: where one story stands among the stories with one tag that this reader may see.
 * Inputs: target_story_id; tag_name (the tag's stored name; the tag list finds it in any language).
 * Returns: one row (tag_rank, stories_in_tag), or no row when the story isn't in that list for
 *   this reader.
 * The order is the tag page's popular order (browse_stories(), S1-E5-03): the score, highest first,
 *   then the newer story, then the address.
 * Internal: story_tag_ranks().
 */
create or replace function public.story_rank_in_tag(target_story_id uuid, tag_name text)
returns table (tag_rank integer, stories_in_tag integer)
language sql
stable
security definer
set search_path = ''
as $$
  select ranked.position::integer, ranked.total::integer
  from (
    select listed.id,
      row_number() over (order by coalesce(scores.score, 0) desc,
        listed.first_published_at desc nulls last, listed.slug) as position,
      count(*) over () as total
    from public.listed_stories('tag', tag_name, null, null, null) as listed
    left join public.story_scores as scores on scores.story_id = listed.id
  ) as ranked
  where ranked.id = target_story_id;
$$;
comment on function public.story_rank_in_tag(uuid, text) is
  'Internal: a story''s place among the stories with a tag that this reader may see (CMS-1g).';
revoke execute on function public.story_rank_in_tag(uuid, text) from public, anon, authenticated;

/**
 * story_tag_ranks: where a story stands in each of its approved tags, and which of them the cover
 *   shows as badges.
 * Input: story_slug.
 * Returns: one row per approved tag on the story, in the story's tag order: tag_name (the stored
 *   name; the app shows it in the reader's language), tag_rank and stories_in_tag (null when a rank
 *   wouldn't be shown: the story has no score yet or the tag has fewer than rank_badge_min_stories
 *   stories for this reader), is_picked (the writer chose it) and is_badge (the cover shows it).
 *   No rows when the reader may not see the story (the same gate as get_story_page()).
 * Badges: the writer's picks that have a rank; with no picks, the 3 best ranks (ties go to the
 *   bigger tag, then the tag's name). The app shows them best rank first.
 * Where it fits: the story page's cover badges and the picker in Story settings
 *   (src/features/tags/api/tagRanks.ts).
 */
create or replace function public.story_tag_ranks(story_slug text)
returns table (tag_name text, tag_rank integer, stories_in_tag integer, is_picked boolean, is_badge boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story public.stories;
  has_score boolean;
  smallest_tag integer := public.ranking_setting('rank_badge_min_stories', 5)::integer;
begin
  -- Step 1: the story, if this reader may see it (the owner always; others as on its page).
  select * into story from public.stories where stories.slug = story_slug and stories.deleted_at is null;
  if not found then
    return;
  end if;
  if story.user_id is distinct from (select auth.uid()) and not (
      public.story_has_readable_chapter(story.id) and public.rating_allows(story.rating)
      and not public.is_moderated_away('story', story.id) and not public.is_blocked_with(story.user_id)) then
    return;
  end if;
  has_score := exists (select 1 from public.story_scores where story_scores.story_id = story.id and story_scores.score > 0);

  -- Step 2: each approved tag's rank, kept only when it means something; then the badges.
  return query
  with tag_rows as (
    select tags.id, tags.name, story_tags.created_at,
      array_position(story.rank_badge_tag_ids, tags.id) as pick_position
    from public.story_tags join public.tags on tags.id = story_tags.tag_id
    where story_tags.story_id = story.id and tags.status = 'approved'
  ),
  ranked as (
    select tag_rows.*, place.tag_rank, place.stories_in_tag
    from tag_rows
    -- A story without a score gets no rank at all (see the header).
    left join lateral public.story_rank_in_tag(story.id, tag_rows.name) as place on has_score
  ),
  shown as (
    select ranked.*,
      (ranked.tag_rank is not null and ranked.stories_in_tag >= smallest_tag) as has_rank
    from ranked
  ),
  badge_order as (
    select shown.id, row_number() over (order by
        shown.pick_position nulls last, shown.tag_rank, shown.stories_in_tag desc, shown.name) as position
    from shown
    where shown.has_rank and (story.rank_badge_tag_ids is null or shown.pick_position is not null)
  )
  select shown.name,
    case when shown.has_rank then shown.tag_rank end,
    case when shown.has_rank then shown.stories_in_tag end,
    shown.pick_position is not null,
    coalesce(badge_order.position <= 3, false)
  from shown left join badge_order on badge_order.id = shown.id
  order by shown.created_at;
end;
$$;
comment on function public.story_tag_ranks(text) is
  'A story''s rank in each of its approved tags among the stories the reader may see, and which ones the cover shows (CMS-1g).';
grant execute on function public.story_tag_ranks(text) to anon, authenticated;

/* ---------- The writer picks the badges ---------- */

/**
 * set_rank_badge_tags: the writer picks which tags the rank badges on their cover show.
 * Inputs: story_slug; tag_names (up to 3 of the story's approved tags, by any of their names), or
 *   null or an empty list for automatic (the 3 best ranks).
 * Returns: JSON {outcome: 'ok' | 'not_active' | 'not_found'}, as the other story settings.
 * Errors: insufficient_privilege when signed out; invalid_parameter_value (hint 'too_many' or
 *   'not_on_story') when more than 3 are picked or one isn't an approved tag on the story.
 * Where it fits: Story settings' save (src/features/tags/api/tagRanks.ts), after update_my_story().
 */
create or replace function public.set_rank_badge_tags(story_slug text, tag_names text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  picked_ids uuid[] := '{}';
  typed_name text;
  picked_id uuid;
begin
  -- Step 1: a signed-in writer who may write, and their own live story (as update_my_story()).
  if (select auth.uid()) is null then
    raise exception 'Sign in to change a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  -- Step 2: each picked name must be an approved tag already on the story; a repeat counts once.
  foreach typed_name in array coalesce(tag_names, '{}') loop
    picked_id := public.tag_for_name(typed_name);
    if picked_id is null or not exists (
        select 1 from public.story_tags join public.tags on tags.id = story_tags.tag_id
        where story_tags.story_id = target_story_id and story_tags.tag_id = picked_id and tags.status = 'approved') then
      raise exception 'Pick from the story''s approved tags.' using errcode = 'invalid_parameter_value', hint = 'not_on_story';
    end if;
    if not picked_id = any (picked_ids) then
      picked_ids := picked_ids || picked_id;
    end if;
  end loop;
  if cardinality(picked_ids) > 3 then
    raise exception 'Pick up to 3 tags.' using errcode = 'invalid_parameter_value', hint = 'too_many';
  end if;

  -- Step 3: save; an empty pick means automatic.
  update public.stories
  set rank_badge_tag_ids = case when cardinality(picked_ids) = 0 then null else picked_ids end
  where stories.id = target_story_id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;
comment on function public.set_rank_badge_tags(text, text[]) is
  'The writer picks up to 3 of their story''s tags for the rank badges on its cover, or automatic (CMS-1g).';
revoke execute on function public.set_rank_badge_tags(text, text[]) from public, anon;
grant execute on function public.set_rank_badge_tags(text, text[]) to authenticated;
