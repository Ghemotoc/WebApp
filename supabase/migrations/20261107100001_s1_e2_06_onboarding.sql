/*
 * Migration: onboarding, "Set up your profile" (story S1-E2-06; bundle ACCOUNTS-2, part d;
 * board Onboarding 2.5).
 *
 * How it works, from the top:
 * - a new account sees three short steps once it may (after the age check for under-18s;
 *   my_onboarding() says when): (1) the username if it has none (board fix, 25 Oct 2026: it is
 *   usually chosen at sign-up), the interface language and an optional county; (2) what the
 *   person likes to read and write, and topics; (3) "Staying safe here" for under-18s, where a
 *   16 or 17-year-old can let adults message them (off by default; S1-E9-03), or the Teacher
 *   badge for adults (S1-E2-11, part f). Only the username is required (criterion 1);
 * - "Go to Discover" calls finish_onboarding(), so the steps don't come back;
 * - the likes are explicit choices stored in reading_preferences, never inferred from reading,
 *   and fill Discover's "Picked for you" shelf, list kind 'picked' (criterion 2);
 * - the county is used only if chosen, for the later "Popular in your area" shelf; the country is
 *   never asked (it comes from the connection, S1-E2-10).
 * Every profile that exists already counts as set up, so nobody is sent back through the steps.
 * Who calls it: src/features/onboarding/ and the Settings page's "What you like" section.
 */

/* ---------- Counties ---------- */

create table public.regions (
  -- ISO 3166-2 code, for example 'RO-CJ' for Cluj and 'RO-B' for Bucharest.
  code text primary key,
  -- The country the region belongs to (ISO 3166-1 alpha-2).
  country_code text not null,
  -- The region's name in Romanian and in English; proper names, so most are the same.
  name_ro text not null,
  name_en text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint regions_code_is_iso check (code ~ '^[A-Z]{2}-[A-Z0-9]{1,3}$'),
  constraint regions_country_matches check (left(code, 2) = country_code)
);
comment on table public.regions is
  'kind: platform
The counties a person may pick in onboarding and Settings (S1-E2-06). Reference data, seeded here.';
create trigger regions_set_updated_at
  before update on public.regions
  for each row execute function public.set_updated_at();
alter table public.regions enable row level security;

-- Who: everyone, signed in or not. Why: the county drop-down is reference data with nothing
-- personal in it. Nobody writes it except migrations.
create policy regions_select_everyone on public.regions
  for select to anon, authenticated
  using (true);
grant select on public.regions to anon, authenticated;

insert into public.regions (code, country_code, name_ro, name_en) values
  ('RO-AB', 'RO', 'Alba', 'Alba'), ('RO-AR', 'RO', 'Arad', 'Arad'), ('RO-AG', 'RO', 'Argeș', 'Argeș'),
  ('RO-BC', 'RO', 'Bacău', 'Bacău'), ('RO-BH', 'RO', 'Bihor', 'Bihor'),
  ('RO-BN', 'RO', 'Bistrița-Năsăud', 'Bistrița-Năsăud'), ('RO-BT', 'RO', 'Botoșani', 'Botoșani'),
  ('RO-BV', 'RO', 'Brașov', 'Brașov'), ('RO-BR', 'RO', 'Brăila', 'Brăila'),
  ('RO-B', 'RO', 'București', 'Bucharest'), ('RO-BZ', 'RO', 'Buzău', 'Buzău'),
  ('RO-CS', 'RO', 'Caraș-Severin', 'Caraș-Severin'), ('RO-CL', 'RO', 'Călărași', 'Călărași'),
  ('RO-CJ', 'RO', 'Cluj', 'Cluj'), ('RO-CT', 'RO', 'Constanța', 'Constanța'),
  ('RO-CV', 'RO', 'Covasna', 'Covasna'), ('RO-DB', 'RO', 'Dâmbovița', 'Dâmbovița'),
  ('RO-DJ', 'RO', 'Dolj', 'Dolj'), ('RO-GL', 'RO', 'Galați', 'Galați'),
  ('RO-GR', 'RO', 'Giurgiu', 'Giurgiu'), ('RO-GJ', 'RO', 'Gorj', 'Gorj'),
  ('RO-HR', 'RO', 'Harghita', 'Harghita'), ('RO-HD', 'RO', 'Hunedoara', 'Hunedoara'),
  ('RO-IL', 'RO', 'Ialomița', 'Ialomița'), ('RO-IS', 'RO', 'Iași', 'Iași'),
  ('RO-IF', 'RO', 'Ilfov', 'Ilfov'), ('RO-MM', 'RO', 'Maramureș', 'Maramureș'),
  ('RO-MH', 'RO', 'Mehedinți', 'Mehedinți'), ('RO-MS', 'RO', 'Mureș', 'Mureș'),
  ('RO-NT', 'RO', 'Neamț', 'Neamț'), ('RO-OT', 'RO', 'Olt', 'Olt'),
  ('RO-PH', 'RO', 'Prahova', 'Prahova'), ('RO-SM', 'RO', 'Satu Mare', 'Satu Mare'),
  ('RO-SJ', 'RO', 'Sălaj', 'Sălaj'), ('RO-SB', 'RO', 'Sibiu', 'Sibiu'),
  ('RO-SV', 'RO', 'Suceava', 'Suceava'), ('RO-TR', 'RO', 'Teleorman', 'Teleorman'),
  ('RO-TM', 'RO', 'Timiș', 'Timiș'), ('RO-TL', 'RO', 'Tulcea', 'Tulcea'),
  ('RO-VS', 'RO', 'Vaslui', 'Vaslui'), ('RO-VL', 'RO', 'Vâlcea', 'Vâlcea'),
  ('RO-VN', 'RO', 'Vrancea', 'Vrancea');

/* ---------- The profile's new columns ---------- */

-- When the person pressed "Go to Discover" (or skipped the last step); null until then.
alter table public.profiles add column onboarded_at timestamptz;
-- The county the person chose, only if they chose one (board 2.5, step 1).
alter table public.profiles add column region_code text references public.regions (code);
-- A 16 or 17-year-old let adults message them (S1-E9-03: off by default, only the teen changes
-- it). Ignored for anyone else: under-16s can never be messaged by adults.
alter table public.profiles add column adults_may_message boolean not null default false;

-- Everyone already here has set up: the steps are for new accounts.
update public.profiles set onboarded_at = coalesce(onboarded_at, created_at);

comment on column public.profiles.onboarded_at is
  'When onboarding was finished or skipped (S1-E2-06); null shows "Set up your profile".';
comment on column public.profiles.region_code is
  'The county the person chose, if any (S1-E2-06); used only for the "Popular in your area" shelf.';
comment on column public.profiles.adults_may_message is
  '16 and 17-year-olds only: adults may message them (S1-E9-03). Off by default.';

/* ---------- Likes ---------- */

create table public.reading_preferences (
  id uuid primary key default gen_random_uuid(),
  -- Whose likes these are (rule 15). They go with the account.
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 'read' and 'write' name a category; 'topic' names a tag.
  preference_kind text not null,
  category_id uuid references public.categories (id) on delete cascade,
  tag_id uuid references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_preferences_kind_is_known check (preference_kind in ('read', 'write', 'topic')),
  constraint reading_preferences_points_once check (
    (preference_kind in ('read', 'write') and category_id is not null and tag_id is null)
    or (preference_kind = 'topic' and tag_id is not null and category_id is null))
);
comment on table public.reading_preferences is
  'kind: user_action
What a person said they like to read and write, and topics (S1-E2-06). Explicit choices only, never inferred; they fill the "Picked for you" shelf.';

create unique index reading_preferences_one_each
  on public.reading_preferences (user_id, preference_kind, coalesce(category_id, tag_id));
create index reading_preferences_user_id on public.reading_preferences (user_id);
create trigger reading_preferences_set_updated_at
  before update on public.reading_preferences
  for each row execute function public.set_updated_at();
alter table public.reading_preferences enable row level security;

-- Who: the person. Why: onboarding and Settings show what they picked. Nobody else reads them,
-- and nobody writes the table directly; save_my_preferences() does.
create policy reading_preferences_select_own on public.reading_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.reading_preferences to authenticated;

/* ---------- Reads ---------- */

/**
 * onboarding_is_due: whether a person should see "Set up your profile" now: not yet set up, and
 * not held at an earlier step (email, age check, sanctions that end the account).
 * Input: the user ID. Returns: true or false. Internal: my_onboarding().
 */
create or replace function public.onboarding_is_due(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where profiles.id = target_user_id and profiles.deleted_at is null and profiles.onboarded_at is null)
    and public.account_state(target_user_id) not in
      ('deleted', 'email_unconfirmed', 'banned', 'age_check_failed', 'minor_not_admitted', 'age_check_pending');
$$;
comment on function public.onboarding_is_due(uuid) is
  'Internal: whether the onboarding steps should show for this account now (S1-E2-06).';
revoke execute on function public.onboarding_is_due(uuid) from public, anon, authenticated;

/**
 * my_onboarding: what the steps need for the signed-in person.
 * Returns: jsonb {outcome: 'ok' | 'signed_out', is_due, has_handle, age_band, region_code,
 *   adults_may_message, read_categories, write_categories, topic_tag_ids}. Never the year of birth.
 * Errors: none. Called by: useMyOnboarding (src/features/onboarding/).
 */
create or replace function public.my_onboarding()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_build_object(
      'outcome', 'ok',
      'is_due', public.onboarding_is_due(profiles.id),
      'has_handle', profiles.handle is not null,
      'age_band', public.age_band(),
      'region_code', profiles.region_code,
      'adults_may_message', profiles.adults_may_message,
      'read_categories', coalesce((
        select jsonb_agg(categories.slug order by categories.position)
        from public.reading_preferences join public.categories on categories.id = reading_preferences.category_id
        where reading_preferences.user_id = profiles.id and reading_preferences.preference_kind = 'read'), '[]'),
      'write_categories', coalesce((
        select jsonb_agg(categories.slug order by categories.position)
        from public.reading_preferences join public.categories on categories.id = reading_preferences.category_id
        where reading_preferences.user_id = profiles.id and reading_preferences.preference_kind = 'write'), '[]'),
      'topic_tag_ids', coalesce((
        select jsonb_agg(reading_preferences.tag_id)
        from public.reading_preferences
        where reading_preferences.user_id = profiles.id and reading_preferences.preference_kind = 'topic'), '[]'))
    from public.profiles
    where profiles.id = (select auth.uid()) and profiles.deleted_at is null),
    jsonb_build_object('outcome', 'signed_out'));
$$;
comment on function public.my_onboarding() is
  'The signed-in person''s onboarding: whether it is due, their county, likes and the adult messages switch (S1-E2-06).';
revoke execute on function public.my_onboarding() from public;
grant execute on function public.my_onboarding() to anon, authenticated;

/**
 * onboarding_topics: the topics a person can pick: the approved, recommended tags, named in the
 * page's language (Romanian when a tag has no name in it).
 * Input: wanted_language 'ro' or 'en'. Returns: rows (tag_id, name), by name.
 * Called by: useOnboardingTopics (step 2 and Settings).
 */
create or replace function public.onboarding_topics(wanted_language text)
returns table (tag_id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select tags.id, coalesce(wanted.name, romanian.name, tags.name)
  from public.tags
  left join public.tag_names as wanted
    on wanted.tag_id = tags.id and wanted.language_code = wanted_language
  left join public.tag_names as romanian
    on romanian.tag_id = tags.id and romanian.language_code = 'ro'
  where tags.status = 'approved' and tags.is_recommended
  order by 2;
$$;
comment on function public.onboarding_topics(text) is
  'The recommended tags a person can pick as topics, in one language (S1-E2-06).';
revoke execute on function public.onboarding_topics(text) from public;
grant execute on function public.onboarding_topics(text) to anon, authenticated;

/* ---------- Writes ---------- */

/**
 * require_live_profile: the caller's user ID, or an error when they aren't signed in with a live
 * profile. Internal: the onboarding writes.
 */
create or replace function public.require_live_profile()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.deleted_at is null
  ) then
    raise exception 'Sign in first.' using errcode = 'insufficient_privilege', hint = 'signed_out';
  end if;
  return (select auth.uid());
end;
$$;
comment on function public.require_live_profile() is 'Internal: the caller''s user ID, if signed in (S1-E2-06).';
revoke execute on function public.require_live_profile() from public, anon, authenticated;

/**
 * save_my_region: sets or clears the caller's county.
 * Input: wanted_region, a regions code; null or left out clears it.
 * Errors: insufficient_privilege (hint signed_out); check_violation (hint unknown_region).
 * Called by: step 1 and Settings.
 */
create or replace function public.save_my_region(wanted_region text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := public.require_live_profile();
begin
  if wanted_region is not null and not exists (select 1 from public.regions where code = wanted_region) then
    raise exception 'Pick a county from the list.' using errcode = 'check_violation', hint = 'unknown_region';
  end if;
  update public.profiles set region_code = wanted_region where id = caller;
end;
$$;
comment on function public.save_my_region(text) is 'Sets or clears the caller''s county (S1-E2-06).';
revoke execute on function public.save_my_region(text) from public, anon;
grant execute on function public.save_my_region(text) to authenticated;

/**
 * save_my_preferences: replaces the caller's likes with these.
 * Inputs: read_categories and write_categories (category slugs), topic_tag_ids (approved,
 *   recommended tags). Unknown slugs and tags are refused, not skipped. At most 30 topics.
 * Errors: insufficient_privilege (hint signed_out); check_violation (hint unknown_choice,
 *   too_many_topics). Called by: step 2 and Settings.
 */
create or replace function public.save_my_preferences(
  read_categories text[],
  write_categories text[],
  topic_tag_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := public.require_live_profile();
  wanted_categories text[] := coalesce(read_categories, '{}') || coalesce(write_categories, '{}');
  wanted_topics uuid[] := coalesce(topic_tag_ids, '{}');
begin
  -- Step 1: every choice must be one the screen offers.
  if cardinality(wanted_topics) > 30 then
    raise exception 'Pick at most 30 topics.' using errcode = 'check_violation', hint = 'too_many_topics';
  end if;
  if exists (select 1 from unnest(wanted_categories) as wanted_slug
             where not exists (select 1 from public.categories where categories.slug = wanted_slug))
     or exists (select 1 from unnest(wanted_topics) as wanted_tag
                where not exists (select 1 from public.tags where tags.id = wanted_tag
                                  and tags.status = 'approved' and tags.is_recommended)) then
    raise exception 'That choice isn''t on the list.' using errcode = 'check_violation', hint = 'unknown_choice';
  end if;
  -- Step 2: the new set replaces the old one.
  delete from public.reading_preferences where user_id = caller;
  insert into public.reading_preferences (user_id, preference_kind, category_id)
  select caller, 'read', categories.id from public.categories where categories.slug = any (read_categories)
  union all
  select caller, 'write', categories.id from public.categories where categories.slug = any (write_categories);
  insert into public.reading_preferences (user_id, preference_kind, tag_id)
  select distinct caller, 'topic', wanted_tag from unnest(wanted_topics) as wanted_tag;
end;
$$;
comment on function public.save_my_preferences(text[], text[], uuid[]) is
  'Replaces the caller''s likes: categories to read and write, and topics (S1-E2-06).';
revoke execute on function public.save_my_preferences(text[], text[], uuid[]) from public, anon;
grant execute on function public.save_my_preferences(text[], text[], uuid[]) to authenticated;

/**
 * set_adults_may_message: a 16 or 17-year-old lets adults message them, or stops it (S1-E9-03:
 * only the teen changes it, never a parent, staff or the adult).
 * Input: allowed. Errors: insufficient_privilege (hint signed_out, not_16_or_17).
 * Called by: step 3 (and Settings with S1-E9-04).
 */
create or replace function public.set_adults_may_message(allowed boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := public.require_live_profile();
begin
  -- Under-16s can never be messaged by adults, and adults have nothing to switch.
  if public.age_band() <> '16_to_17' then
    raise exception 'Only 16 and 17-year-olds have this switch.'
      using errcode = 'insufficient_privilege', hint = 'not_16_or_17';
  end if;
  update public.profiles set adults_may_message = coalesce(allowed, false) where id = caller;
end;
$$;
comment on function public.set_adults_may_message(boolean) is
  'A 16 or 17-year-old switches adult messages on or off (S1-E2-06, S1-E9-03).';
revoke execute on function public.set_adults_may_message(boolean) from public, anon;
grant execute on function public.set_adults_may_message(boolean) to authenticated;

/**
 * finish_onboarding: marks setup done, so the steps and the notice stop showing. A username is
 * required first (criterion 1). Doing it twice keeps the first time.
 * Errors: insufficient_privilege (hint signed_out); check_violation (hint handle_missing).
 * Called by: "Go to Discover" (and "Skip" on the last step).
 */
create or replace function public.finish_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := public.require_live_profile();
begin
  if (select handle from public.profiles where id = caller) is null then
    raise exception 'Choose a username first.' using errcode = 'check_violation', hint = 'handle_missing';
  end if;
  update public.profiles set onboarded_at = coalesce(onboarded_at, now()) where id = caller;
end;
$$;
comment on function public.finish_onboarding() is 'Marks the caller''s setup as done (S1-E2-06).';
revoke execute on function public.finish_onboarding() from public, anon;
grant execute on function public.finish_onboarding() to authenticated;

/* ---------- Discover: "Picked for you" ---------- */

/**
 * list_holds_story: whether a story belongs to a list.
 * As in S1-E4-03, plus 'picked' (S1-E2-06): a story in a category the caller likes to read, or
 * with a topic they picked. Explicit choices only; nothing is learned from reading.
 * Internal: listed_stories().
 */
create or replace function public.list_holds_story(target public.stories, list_kind text, list_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case list_kind
    when 'updated' then true
    when 'new' then true
    when 'popular' then true
    when 'rising' then (
      select min(earlier.first_published_at) from public.stories as earlier
      where earlier.user_id = target.user_id and earlier.deleted_at is null
    ) >= now() - make_interval(days => coalesce(public.setting_value('rising_writer_days') #>> '{}', '90')::integer)
    when 'completed' then target.completion_status = 'completed'
    when 'category' then exists (
      select 1 from public.categories where categories.id = target.category_id and categories.slug = list_key)
    -- CMS-1e: the tag a name stands for in any language ("fantezie" is Fantasy), approved only.
    when 'tag' then exists (
      select 1 from public.story_tags
      where story_tags.story_id = target.id and story_tags.tag_id = public.tag_for_name(list_key))
    when 'following' then exists (
      select 1 from public.follows_users
      where follows_users.user_id = (select auth.uid()) and follows_users.followed_user_id = target.user_id)
    when 'writer' then target.user_id = (select profile.id from public.profile_for_handle(list_key) as profile)
    -- S1-E5-04: the stories that answer the search term.
    when 'search' then public.story_matches_search(target, list_key)
    -- S1-E5-06: the public-domain classics.
    when 'classics' then target.classic_author_id is not null
    -- S1-E4-03: one shelf of the caller's own library.
    when 'library' then exists (
      select 1 from public.library_entries
      where library_entries.user_id = (select auth.uid()) and library_entries.story_id = target.id
        and library_entries.shelf::text = list_key)
    -- S1-E2-06: the caller's own likes.
    when 'picked' then exists (
      select 1 from public.reading_preferences
      where reading_preferences.user_id = (select auth.uid())
        and ((reading_preferences.preference_kind = 'read' and reading_preferences.category_id = target.category_id)
          or (reading_preferences.preference_kind = 'topic' and exists (
            select 1 from public.story_tags
            where story_tags.story_id = target.id and story_tags.tag_id = reading_preferences.tag_id))))
    else false
  end;
$$;

/**
 * is_story_list_kind: whether browse_stories() knows a list.
 * As in S1-E4-03, plus 'picked' (S1-E2-06). Internal: browse_stories().
 */
create or replace function public.is_story_list_kind(list_kind text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select list_kind in ('updated', 'new', 'popular', 'rising', 'completed', 'category', 'tag',
    'following', 'writer', 'search', 'classics', 'library', 'picked');
$$;

-- The shelf goes after "New from writers you follow"; a changed setting is left as staff set it.
update public.settings
set value = '["following", "picked", "popular", "rising", "new", "completed", "updated", "classics", "categories"]'::jsonb
where key = 'discover_shelves'
  and value = '["following", "popular", "rising", "new", "completed", "updated", "classics", "categories"]'::jsonb;
