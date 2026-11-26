-- classic_plain_covers: every classic gets a plain solid Label cover in one of ten colours, and
-- three classics get their approved artwork backdrop under the same paper label.
--
-- Story: classic covers (Robert, DESIGN covers thread, 26 Nov 2026, 18:20 UTC: "No, I decided,
-- the classics make them all simple colours, except for the raven, luceafărul and goblin market -
-- those are really Amazing"; 18:20 UTC: "Plain solid yes").
-- Who calls it: Supabase applies it with the other migrations (locally on `npx supabase db reset`,
-- on staging through the GitHub integration when main changes), so no SQL is run by hand.
-- What it changes:
--   1. The design check accepts six new plain designs (crimson, seaglass, peach, pistachio, candy,
--      linkblue) and three artwork designs (classic_luceafarul, classic_the_raven,
--      classic_goblin_market); the palette check accepts the six new colours. They match
--      coverDesignKeys and coverPalette in src/components/covers/coverDesigns.ts.
--   2. classic_cover_colour(story_id) picks one of the ten colours from the story's ID, so a
--      classic always keeps the same colour; classic_cover_design(slug) names the artwork for the
--      three classics Robert kept.
--   3. A trigger gives every new classic (the classics account's first editions, drawn or
--      automatic) that cover on insert, so the 268 classics of the bulk load and any later ones
--      get it with no extra step, and refuses the classic-only designs and colours on anyone
--      else's story (the writer's picker never offers them either).
--   4. Every classic already in the database gets its cover now. Language editions follow their
--      first edition by the existing triggers (stories_edition_rules, stories_editions_follow_first).
-- Uploaded covers are left as they are: someone chose that picture on purpose.

-- Step 1: the checks list the new keys, in the same order as coverDesigns.ts.
alter table public.stories drop constraint if exists stories_cover_design_is_approved;
alter table public.stories add constraint stories_cover_design_is_approved check (
  cover_design is null or cover_design = any (array[
    'plum', 'ink', 'violet', 'gold', 'lilac', 'blush', 'sky', 'sage', 'paper',
    'stripes', 'dots', 'grid', 'waves', 'starry', 'sparkles', 'twotone',
    'arches', 'rings', 'forestwaves',
    'blushdots', 'skylines', 'goldgrid',
    'crimson', 'seaglass', 'peach', 'pistachio', 'candy', 'linkblue',
    'classic_luceafarul', 'classic_the_raven', 'classic_goblin_market'
  ])
);
comment on constraint stories_cover_design_is_approved on public.stories is
  'A drawn cover uses one of the designs the app can draw (src/components/covers/coverDesigns.ts); the last nine (six plain colours and three artwork backdrops) are for the classics account only (classic covers, 26 Nov 2026).';

alter table public.stories drop constraint if exists stories_cover_colours_are_in_the_palette;
alter table public.stories add constraint stories_cover_colours_are_in_the_palette check (
  (cover_background is null or cover_background = any (array[
    'plum', 'ink', 'violet', 'gold', 'lilac', 'blush', 'sky', 'sage', 'paper',
    'crimson', 'seaglass', 'peach', 'pistachio', 'candy', 'linkblue']))
  and (cover_accent is null or cover_accent = any (array[
    'plum', 'ink', 'violet', 'gold', 'lilac', 'blush', 'sky', 'sage', 'paper',
    'crimson', 'seaglass', 'peach', 'pistachio', 'candy', 'linkblue']))
);
comment on constraint stories_cover_colours_are_in_the_palette on public.stories is
  'A drawn cover uses the 9-colour palette (16 Oct 2026); the last six colours are for the classics account only (classic covers, 26 Nov 2026).';

/**
 * classic_cover_colour: the solid colour a classic's cover takes, always the same for that story.
 *
 * Input: story_id, the classic's ID.
 * Returns: one of the ten classic colours (Robert's list, 26 Nov 2026), in the order of
 *   classicCoverColourKeys in coverDesigns.ts.
 * Errors: none.
 * Where it fits: called by the classic cover trigger and by step 4 below. The first 8 hex digits
 * of the ID's MD5 give a number, taken modulo 10, so the choice depends only on the ID.
 */
create or replace function public.classic_cover_colour(story_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select (array['plum', 'violet', 'ink', 'gold', 'crimson', 'seaglass', 'peach', 'pistachio',
                'candy', 'linkblue'])[
    1 + (('x' || lpad(substr(md5(story_id::text), 1, 8), 16, '0'))::bit(64)::bigint % 10)::int];
$$;
comment on function public.classic_cover_colour(uuid) is
  'The solid colour a classic cover takes, picked from the story ID so it never changes (classic covers, 26 Nov 2026).';

/**
 * classic_cover_design: the artwork backdrop a classic keeps, for the three Robert chose.
 *
 * Input: story_slug, the classic's address name (the staging classics use these slugs).
 * Returns: the artwork design key, or null for every other classic (which gets a solid colour).
 * Errors: none.
 * Where it fits: called by the classic cover trigger and by step 4 below.
 */
create or replace function public.classic_cover_design(story_slug text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case story_slug
    when 'luceafarul-classic' then 'classic_luceafarul'
    when 'the-raven-classic' then 'classic_the_raven'
    when 'goblin-market-classic' then 'classic_goblin_market'
  end;
$$;
comment on function public.classic_cover_design(text) is
  'The artwork backdrop for Luceafărul, The Raven and Goblin Market; null for other classics (classic covers, 26 Nov 2026).';

/**
 * stories_classic_cover: the trigger function that keeps classic covers to Robert's rule.
 *
 * On insert: a first edition by the classics account with a drawn or automatic cover becomes a
 *   drawn Label cover, the artwork for the three classics with a backdrop and a solid colour for
 *   the rest.
 * On insert or update: a story by anyone else may not use the classic-only designs or colours.
 * Returns: the row to save.
 * Errors: check_violation (hint classic_cover_only) when another account's story uses a classic
 *   cover design or colour.
 * Where it fits: runs before stories_zz_cover_style_fits (triggers run in name order), after
 * stories_a_edition_rules has copied an edition's cover from its first edition.
 */
create or replace function public.stories_classic_cover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  classic_only_keys text[] := array['crimson', 'seaglass', 'peach', 'pistachio', 'candy',
    'linkblue', 'classic_luceafarul', 'classic_the_raven', 'classic_goblin_market'];
  is_classic boolean := public.is_classics_account(new.user_id);
begin
  -- Step 1: only the classics account may use the classic covers' designs and colours.
  if not is_classic and (new.cover_design = any (classic_only_keys)
      or new.cover_background = any (classic_only_keys)
      or new.cover_accent = any (classic_only_keys)) then
    raise exception 'This cover is only for classics.'
      using errcode = 'check_violation', hint = 'classic_cover_only';
  end if;

  -- Step 2: a new classic (a first edition, not an uploaded picture) gets its classic cover.
  if tg_op = 'INSERT' and is_classic and new.edition_of_story_id is null
      and new.cover_kind in ('automatic', 'drawn') then
    new.cover_kind := 'drawn';
    new.cover_style := 'label';
    new.cover_accent := 'paper';
    new.cover_design := coalesce(public.classic_cover_design(new.slug),
                                 public.classic_cover_colour(new.id));
    -- An artwork backdrop is plum underneath, so plum is its fall-back colour.
    new.cover_background := case
      when public.classic_cover_design(new.slug) is not null then 'plum'
      else public.classic_cover_colour(new.id) end;
  end if;
  return new;
end;
$$;
comment on function public.stories_classic_cover() is
  'Gives a new classic its solid colour or artwork Label cover, and keeps the classic-only covers off other accounts'' stories (classic covers, 26 Nov 2026).';

drop trigger if exists stories_b_classic_cover on public.stories;
create trigger stories_b_classic_cover
  before insert or update of cover_design, cover_background, cover_accent on public.stories
  for each row execute function public.stories_classic_cover();
comment on trigger stories_b_classic_cover on public.stories is
  'Classic covers (26 Nov 2026): a new classic gets its Label cover; nobody else may use the classic-only designs and colours.';

-- Step 3: every classic already saved gets its cover. Only first editions are changed; their
-- language editions follow through stories_editions_follow_first. Uploaded covers stay.
update public.stories
set cover_kind = 'drawn',
    cover_style = 'label',
    cover_accent = 'paper',
    cover_design = coalesce(public.classic_cover_design(stories.slug),
                            public.classic_cover_colour(stories.id)),
    cover_background = case
      when public.classic_cover_design(stories.slug) is not null then 'plum'
      else public.classic_cover_colour(stories.id) end
where public.is_classics_account(stories.user_id)
  and stories.edition_of_story_id is null
  and stories.cover_kind in ('automatic', 'drawn');

-- Nobody calls these directly: the trigger runs them as their owner.
revoke all on function public.classic_cover_colour(uuid) from public, anon, authenticated;
revoke all on function public.classic_cover_design(text) from public, anon, authenticated;
revoke all on function public.stories_classic_cover() from public, anon, authenticated;
