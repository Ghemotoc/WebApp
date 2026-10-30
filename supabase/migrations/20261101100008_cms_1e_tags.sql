/*
 * Migration: tags that staff approve, one tag per idea with a name in each language, and the
 * recommended tags (CMS-1e; Robert's tag task, 30 Oct 2026, 10:43 to 10:50).
 *
 * What it changes and adds:
 *   tags                     + status (waiting, approved, rejected), is_recommended, who decided
 *                            and when. Every tag already in use is approved, so nothing a reader
 *                            sees today disappears.
 *   tag_names                the tag's name in each language (Fantasy, Fantezie, Fantaisie). The
 *                            app shows the name in the interface language; a name typed in any
 *                            language finds the same tag (Robert, 30 Oct 2026, 10:48).
 *   set_story_tags()         a typed name finds its tag in any language; a name nobody used
 *                            before makes a waiting tag; a rejected tag is not added again
 *   tag_for_name()           the approved tag a name stands for, in any language (tag pages)
 *   list_holds_story()       a tag page lists a story only through an approved tag
 *   get_story_page()         readers get only approved tags
 *   admin_list_tags(), admin_name_tag(), admin_reject_tag()
 *                            the staff queue: approve or rename (names in every interface
 *                            language), reject with a reason (the tag leaves every story and the
 *                            writers are told). Owner, admin and moderator (area moderation, act),
 *                            each logged in the audit log in the same transaction.
 *   about 40 recommended tags in Romanian and English, shown under the tag box. The tags already
 *   in use that mean the same thing are merged into them (family and familie become Family).
 *
 * Rules (Robert, 30 Oct 2026):
 *   - "There should be always some option to add tags. The tags are separated by comma."
 *   - "Users can add additional tags, however, they need to be approved by a member of staff."
 *     A waiting tag stays on the writer's story but readers, Discover and search don't see it.
 *   - "Staff translate tag names by hand when a market opens"; an AI translation may come later
 *     (by-hand list). admin_list_tags('missing') lists every approved tag that lacks a name in an
 *     interface language.
 */

/* ---------- Tags: status and recommendation ---------- */

alter table public.tags
  add column status public.tag_status not null default 'waiting',
  -- Shown as a suggestion under the tag box (Robert: "add some recommended tags in advance").
  add column is_recommended boolean not null default false,
  -- The member of staff who approved, renamed or rejected it last; a role name, never the owner.
  add column decided_by_user_id uuid references public.profiles (id) on delete set null,
  add column decided_at timestamptz,
  -- Why a tag was rejected, in staff's words, for the audit trail and the queue.
  add column decision_reason text,
  add constraint tags_decision_reason_length check (decision_reason is null or char_length(decision_reason) <= 300);

-- Every tag in use before this migration was shown to readers, so it stays shown.
update public.tags set status = 'approved';

comment on column public.tags.status is
  'waiting (only the writer sees it), approved (everyone) or rejected (taken off every story) (CMS-1e).';

/* ---------- Tag names in each language ---------- */

create table public.tag_names (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.tags (id) on delete cascade,
  -- A BCP 47 code from languages ("ro", "en", later "fr").
  language_code text not null references public.languages (code) on delete cascade,
  name text not null,
  -- normalise_tag(name): a writer typing any language's name finds this tag.
  normalised_name text not null,
  -- The member of staff who named it last; null for the seeded names.
  named_by_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tag_names_one_per_language unique (tag_id, language_code),
  constraint tag_names_unique_in_language unique (language_code, normalised_name),
  constraint tag_names_name_length check (char_length(name) between 1 and 40),
  constraint tag_names_normalised_name_matches check (normalised_name = public.normalise_tag(name))
);

comment on table public.tag_names is
  'kind: platform
A tag''s name in one language; staff name every approved tag in each interface language (CMS-1e).';

create index tag_names_normalised_name on public.tag_names (normalised_name);

create trigger tag_names_set_updated_at
  before update on public.tag_names
  for each row execute function public.set_updated_at();

alter table public.tag_names enable row level security;

/**
 * Policy tag_names_select_public: anyone, signed out included, reads the names of approved tags.
 * Why: the app shows every tag in the reader's interface language and recognises a name typed in
 * another language; a tag's name is never personal.
 */
create policy tag_names_select_public
  on public.tag_names
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.tags where tags.id = tag_names.tag_id and tags.status = 'approved'));

comment on policy tag_names_select_public on public.tag_names is
  'Allows anyone to read the names of approved tags in every language (CMS-1e).';

-- Table privileges, exactly what the policy needs. Names are written only by the admin_* functions.
revoke all on public.tag_names from anon, authenticated;
grant select on public.tag_names to anon, authenticated;  -- tag_names_select_public

/* ---------- Who reads which tags ---------- */

drop policy tags_select_public on public.tags;

/**
 * Policy tags_select_public: anyone, signed out included, reads the approved tags.
 * Why: approved tags show on story pages and Discover filters by them; a waiting tag stays hidden
 * until staff approve it (Robert, 30 Oct 2026).
 */
create policy tags_select_public
  on public.tags
  for select
  to anon, authenticated
  using (status = 'approved');

comment on policy tags_select_public on public.tags is
  'Allows anyone, signed out included, to read the approved tags; waiting and rejected ones stay hidden (CMS-1e).';

/**
 * Policy tags_select_on_own_story: a writer reads every tag on their own stories, waiting ones
 * included. Why: the story's settings show a waiting tag with "waiting for approval".
 */
create policy tags_select_on_own_story
  on public.tags
  for select
  to authenticated
  using (exists (
    select 1 from public.story_tags
    where story_tags.tag_id = tags.id and story_tags.user_id = (select auth.uid())));

comment on policy tags_select_on_own_story on public.tags is
  'Allows a writer to read the tags on their own stories, waiting ones included (CMS-1e).';

/**
 * Policy tags_select_staff: owner, admin and moderator read every tag. Why: they approve, rename
 * and reject them (Robert, 30 Oct 2026: "approved by a member of staff").
 */
create policy tags_select_staff
  on public.tags
  for select
  to authenticated
  using ((select public.staff_may('moderation', 'view')));

comment on policy tags_select_staff on public.tags is
  'Allows staff who act on moderation to read every tag, waiting and rejected included (CMS-1e).';

/* ---------- Finding a tag by any of its names ---------- */

/**
 * tag_for_name: the tag a typed name stands for, in any language.
 * Inputs: typed_name (as typed); preferred_language (a BCP 47 code, used only when two tags share
 *   a name in different languages); include_waiting (true when a writer is tagging: their own
 *   earlier waiting tag is reused).
 * Returns: the tag's id, or null when no tag has that name. Rejected tags are never returned.
 * Where it fits: set_story_tags() and list_holds_story().
 */
create or replace function public.tag_for_name(
  typed_name text, preferred_language text default null, include_waiting boolean default false
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  with wanted as (select public.normalise_tag(typed_name) as normalised)
  select found.tag_id from (
    -- The tag's own stored form (as first typed, or the seeded English name).
    select tags.id as tag_id, 0 as rank_order
    from public.tags, wanted
    where tags.normalised_name = wanted.normalised
    union all
    -- Its name in any language; the preferred language first.
    select tag_names.tag_id, case when tag_names.language_code = preferred_language then 1 else 2 end
    from public.tag_names, wanted
    where tag_names.normalised_name = wanted.normalised
  ) as found
  join public.tags on tags.id = found.tag_id
  where tags.status = 'approved' or (include_waiting and tags.status = 'waiting')
  order by (tags.status = 'approved') desc, found.rank_order
  limit 1;
$$;

comment on function public.tag_for_name(text, text, boolean) is
  'The approved (or, for writers, waiting) tag a typed name stands for, in any language (CMS-1e).';
revoke execute on function public.tag_for_name(text, text, boolean) from public, anon, authenticated;

/**
 * set_story_tags: replaces a story's tags with the given names (S1-E3-01), now finding each
 * name's tag in any language (CMS-1e).
 * Inputs: target_story_id, owner_id (copied into story_tags.user_id), tag_names as typed.
 * Rules: each name is trimmed and empty ones dropped; a name in any language finds its tag
 *   ("fantezie" is Fantasy), so two names for one tag count once; a name nobody used before makes
 *   a new waiting tag that only the writer sees until staff approve it; a name of a rejected tag
 *   is left out; at most 10 (the trigger refuses more), each at most 40 characters.
 * Errors: check_violation for more than 10 tags or a tag over 40 characters.
 * Internal: called by create_story() and update_my_story().
 */
create or replace function public.set_story_tags(target_story_id uuid, owner_id uuid, tag_names text[])
returns void
language plpgsql
set search_path = ''
as $$
declare
  tag_name text;
  normalised text;
  seen uuid[] := '{}';
  tag_row_id uuid;
  writer_language text := (select profiles.locale from public.profiles where profiles.id = owner_id);
begin
  -- Step 1: start from a clean list, so the order and the merging are the same every time.
  delete from public.story_tags where story_tags.story_id = target_story_id;

  foreach tag_name in array coalesce(tag_names, '{}') loop
    -- Step 2: the one shared form; empty names are skipped.
    normalised := public.normalise_tag(tag_name);
    if normalised = '' then
      continue;
    end if;
    if char_length(normalised) > 40 then
      raise exception 'A tag can have at most 40 characters (S1-E3-01).' using errcode = 'check_violation';
    end if;

    -- Step 3: the tag this name stands for, in any language; else a new one waiting for staff,
    -- unless staff already rejected that name.
    tag_row_id := public.tag_for_name(tag_name, writer_language, true);
    if tag_row_id is null then
      if exists (select 1 from public.tags where tags.normalised_name = normalised) then
        continue;
      end if;
      insert into public.tags (name, normalised_name, status)
      values (regexp_replace(btrim(tag_name), '\s+', ' ', 'g'), normalised, 'waiting')
      returning tags.id into tag_row_id;
    end if;

    -- Step 4: link it once; the trigger refuses an eleventh tag.
    if tag_row_id = any (seen) then
      continue;
    end if;
    seen := seen || tag_row_id;
    insert into public.story_tags (story_id, tag_id, user_id) values (target_story_id, tag_row_id, owner_id);
  end loop;
end;
$$;

comment on function public.set_story_tags(uuid, uuid, text[]) is
  'Internal: replaces a story''s tags, finding each name''s tag in any language; new names wait for staff (CMS-1e).';
revoke execute on function public.set_story_tags(uuid, uuid, text[]) from public, anon, authenticated;
/* ---------- Readers see approved tags only ---------- */

/**
 * list_holds_story: whether a story belongs to a list, before the reader's rules (S1-E5-03).
 * Changed in CMS-1e: a tag page finds its tag by a name in any language and only an approved tag
 *   counts, so a waiting tag never lists a story.
 * Inputs: the story, list_kind and list_key. Returns: true when it belongs; false for an unknown kind.
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
    else false
  end;
$$;


/**
 * get_story_page: as in S1-E5-06 (the real author of a classic as the writer's name), with only
 * approved tags in "tags" (CMS-1e). Each tag is its stored name; the app shows it in the reader's
 * interface language from the tag_names list.
 */
create or replace function public.get_story_page(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story public.stories;
  caller_id uuid := (select auth.uid());
  is_owner boolean;
begin
  -- Step 1: the story, if it exists and isn't deleted.
  select * into story from public.stories where stories.slug = story_slug and stories.deleted_at is null;
  if not found then
    return null;
  end if;
  is_owner := caller_id is not null and caller_id = story.user_id;

  -- Step 2: readers see it only while a chapter is readable, if their age allows the rating
  -- (rule 18), no moderator hid it and neither side blocks the other (S1-E5-05).
  if not is_owner then
    if not public.story_has_readable_chapter(story.id) then
      return null;
    end if;
    if not public.rating_allows(story.rating) then
      return null;
    end if;
    if public.is_moderated_away('story', story.id) then
      return null;
    end if;
    if public.is_blocked_with(story.user_id) then
      return null;
    end if;
  end if;

  -- Step 3: the page, with the real author of a classic, else the writer's pen name or
  -- username, and never the user ID.
  return jsonb_build_object(
    'id', story.id,
    'slug', story.slug,
    'title', story.title,
    'blurb', story.blurb,
    'language_code', story.language_code,
    'category_slug', (select categories.slug from public.categories where categories.id = story.category_id),
    'tags', coalesce((
      select jsonb_agg(tags.name order by story_tags.created_at)
      from public.story_tags join public.tags on tags.id = story_tags.tag_id
      -- CMS-1e: readers see only approved tags; a waiting one shows only in the writer's settings.
      where story_tags.story_id = story.id and tags.status = 'approved'), '[]'::jsonb),
    'completion_status', story.completion_status,
    'comments_enabled', story.comments_enabled,
    'cover', jsonb_build_object('kind', story.cover_kind, 'design', story.cover_design,
      'background', story.cover_background, 'accent', story.cover_accent),
    'labels', jsonb_build_object('rating', story.rating, 'is_fan_fiction', story.is_fan_fiction,
      'is_parody', story.is_parody, 'deals_with_abuse_or_coercion', story.deals_with_abuse_or_coercion,
      'content_note', story.content_note, 'ai_disclosure', story.ai_disclosure,
      'ai_undisclosed_labelled', story.ai_undisclosed_labelled_at is not null),
    'writer', (select jsonb_build_object(
        'display_name', public.story_writer_name(story.id, profiles.handle, profiles.pen_name),
        'handle', profiles.handle, 'bio', profiles.bio,
        'classic_author', public.story_classic_author(story.id))
      from public.profiles where profiles.id = story.user_id),
    'first_published_at', story.first_published_at,
    'last_chapter_published_at', story.last_chapter_published_at,
    'is_public', public.story_has_readable_chapter(story.id),
    'chapters', public.story_page_chapters(story.id, is_owner),
    'is_owner', is_owner,
    'stats', jsonb_build_object(
      'likes', public.story_like_total(story.id),
      'comments', public.story_comment_total(story.id))
  );
end;
$$;

/* ---------- The staff queue ---------- */

/**
 * require_tag_staff: refuses anyone who may not decide on tags. Owner, admin and moderator act
 * (area moderation; Robert, 30 Oct 2026: "approved by a member of staff").
 * Errors: insufficient_privilege. Internal.
 */
create or replace function public.require_tag_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('moderation', 'act') then
    raise exception 'Only the moderation team can decide on tags.' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

comment on function public.require_tag_staff() is 'Internal: refuses anyone who may not decide on tags (CMS-1e).';
revoke execute on function public.require_tag_staff() from public, anon, authenticated;

/**
 * admin_list_tags: the tags staff work on.
 * Input: which_tags: 'waiting' (new tags, oldest first), 'missing' (approved tags without a name
 *   in an interface language, so a new market's names are easy to fill in) or 'approved' (all).
 * Returns: one row per tag: its id, stored name, status, whether it is recommended, how many
 *   stories use it, its names as {"ro": "Fantezie", "en": "Fantasy"} and the interface languages
 *   it has no name in. Never which writers used it.
 * Errors: insufficient_privilege unless owner, admin or moderator.
 */
create or replace function public.admin_list_tags(which_tags text)
returns table (
  tag_id uuid, name text, status public.tag_status, is_recommended boolean, story_count bigint,
  names jsonb, missing_languages text[], created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_tag_staff();
  return query
  with named as (
    select tags.id, tags.name, tags.status, tags.is_recommended, tags.created_at,
      (select count(*) from public.story_tags where story_tags.tag_id = tags.id) as story_count,
      coalesce((select jsonb_object_agg(tag_names.language_code, tag_names.name)
        from public.tag_names where tag_names.tag_id = tags.id), '{}'::jsonb) as names,
      array(select languages.code from public.languages
        where languages.is_interface and not exists (
          select 1 from public.tag_names
          where tag_names.tag_id = tags.id and tag_names.language_code = languages.code)
        order by languages.code) as missing_languages
    from public.tags
  )
  select named.id, named.name, named.status, named.is_recommended, named.story_count, named.names,
    named.missing_languages, named.created_at
  from named
  where case which_tags
      when 'waiting' then named.status = 'waiting'
      when 'missing' then named.status = 'approved' and cardinality(named.missing_languages) > 0
      when 'approved' then named.status = 'approved'
      else false
    end
  order by case when which_tags = 'waiting' then named.created_at end,
    named.name;
end;
$$;

comment on function public.admin_list_tags(text) is
  'The tags waiting for staff, missing a name, or approved, with story counts and names; moderation staff only (CMS-1e).';
revoke execute on function public.admin_list_tags(text) from public, anon;
grant execute on function public.admin_list_tags(text) to authenticated;

/**
 * tag_name_problems: what is wrong with the names staff gave a tag. Internal.
 * Inputs: the tag and its names as {"ro": "...", "en": "..."}.
 * Returns: hint words, one per problem: "ro:empty", "en:too_long", "ro:taken" (another tag has
 *   that name in that language), "fr:unknown_language".
 */
create or replace function public.tag_name_problems(target_tag_id uuid, names jsonb)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  -- Every interface language needs a name.
  select array(
    select languages.code || ':empty' from public.languages
    where languages.is_interface and public.normalise_tag(names ->> languages.code) = ''
    union all
    select given.key || ':unknown_language' from jsonb_each_text(coalesce(names, '{}')) as given
    where not exists (select 1 from public.languages where languages.code = given.key)
    union all
    select given.key || ':too_long' from jsonb_each_text(coalesce(names, '{}')) as given
    where char_length(btrim(given.value)) > 40
    union all
    select given.key || ':taken' from jsonb_each_text(coalesce(names, '{}')) as given
    where exists (
      select 1 from public.tag_names
      where tag_names.language_code = given.key and tag_names.tag_id <> target_tag_id
        and tag_names.normalised_name = public.normalise_tag(given.value))
  );
$$;

comment on function public.tag_name_problems(uuid, jsonb) is 'Internal: what is wrong with a tag''s names (CMS-1e).';
revoke execute on function public.tag_name_problems(uuid, jsonb) from public, anon, authenticated;

/**
 * admin_name_tag: approves a waiting tag, or renames an approved one, with a name in each
 * interface language (Robert, 30 Oct 2026: "Staff approve, rename or reject"; "manually
 * translated into every language by the staff when we open a new market").
 * Inputs: tag_id and names as {"ro": "Fantezie", "en": "Fantasy"}; a language left out keeps its
 *   name, and every interface language must end up with one.
 * Returns: nothing.
 * Errors: insufficient_privilege unless owner, admin or moderator; no_data_found for an unknown
 *   or rejected tag; check_violation with the problems as the hint ("ro:empty,en:taken").
 * Logged as tag.approved (a waiting tag) or tag.named (an approved one), with before and after.
 */
create or replace function public.admin_name_tag(tag_id uuid, names jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_tag public.tags;
  before_names jsonb;
  merged_names jsonb;
  problems text[];
  given record;
begin
  perform public.require_tag_staff();
  -- Step 1: the tag, which must be waiting or approved.
  select * into before_tag from public.tags where tags.id = admin_name_tag.tag_id for update;
  if before_tag.id is null or before_tag.status = 'rejected' then
    raise exception 'There is no tag to name with that id.' using errcode = 'no_data_found';
  end if;
  -- Step 2: the names it has now, with the given ones on top; refuse anything to fix.
  before_names := coalesce((select jsonb_object_agg(tag_names.language_code, tag_names.name)
    from public.tag_names where tag_names.tag_id = before_tag.id), '{}'::jsonb);
  merged_names := before_names || coalesce(names, '{}'::jsonb);
  problems := public.tag_name_problems(before_tag.id, merged_names);
  if cardinality(problems) > 0 then
    raise exception 'Fix the tag''s names before saving.' using errcode = 'check_violation', hint = array_to_string(problems, ',');
  end if;
  -- Step 3: write each name, then approve the tag.
  for given in select * from jsonb_each_text(coalesce(names, '{}'::jsonb)) loop
    insert into public.tag_names (tag_id, language_code, name, normalised_name, named_by_user_id)
    values (before_tag.id, given.key, regexp_replace(btrim(given.value), '\s+', ' ', 'g'),
      public.normalise_tag(given.value), (select auth.uid()))
    on conflict on constraint tag_names_one_per_language do update
      set name = excluded.name, normalised_name = excluded.normalised_name,
          named_by_user_id = excluded.named_by_user_id;
  end loop;
  update public.tags
  set status = 'approved', decided_by_user_id = (select auth.uid()), decided_at = now(), decision_reason = null
  where tags.id = before_tag.id;
  -- Step 4: the audit log.
  perform public.log_staff_action(
    case when before_tag.status = 'waiting' then 'tag.approved' else 'tag.named' end,
    'tags', before_tag.id::text, null, null,
    jsonb_build_object('name', before_tag.name, 'status', before_tag.status, 'names', before_names),
    jsonb_build_object('name', before_tag.name, 'status', 'approved', 'names', merged_names));
end;
$$;

comment on function public.admin_name_tag(uuid, jsonb) is
  'Approves or renames a tag with a name in every interface language; moderation staff; logged (CMS-1e).';
revoke execute on function public.admin_name_tag(uuid, jsonb) from public, anon;
grant execute on function public.admin_name_tag(uuid, jsonb) to authenticated;

/**
 * admin_reject_tag: rejects a tag. It leaves every story that used it, and each writer is told
 * (Robert, 30 Oct 2026). Writing the same name again doesn't bring it back.
 * Inputs: tag_id and reason (1 to 300 characters, for the audit log; never shown to writers).
 * Returns: how many stories lost the tag.
 * Errors: insufficient_privilege unless owner, admin or moderator; no_data_found for an unknown or
 *   already rejected tag; check_violation with hint "reason:empty" or "reason:too_long".
 * Logged as tag.rejected with the reason and the number of stories.
 */
create or replace function public.admin_reject_tag(tag_id uuid, reason text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_status public.tag_status;
  rejected public.tags;
  link record;
  removed_count integer := 0;
begin
  perform public.require_tag_staff();
  -- Step 1: the reason staff give.
  if btrim(coalesce(reason, '')) = '' then
    raise exception 'Give a reason.' using errcode = 'check_violation', hint = 'reason:empty';
  end if;
  if char_length(btrim(reason)) > 300 then
    raise exception 'The reason is too long.' using errcode = 'check_violation', hint = 'reason:too_long';
  end if;
  -- Step 2: the tag, rejected.
  select tags.status into before_status from public.tags where tags.id = admin_reject_tag.tag_id for update;
  update public.tags
  set status = 'rejected', decided_by_user_id = (select auth.uid()), decided_at = now(),
      decision_reason = btrim(reason)
  where tags.id = admin_reject_tag.tag_id and tags.status <> 'rejected'
  returning * into rejected;
  if rejected.id is null then
    raise exception 'There is no tag to reject with that id.' using errcode = 'no_data_found';
  end if;
  -- Step 3: off every story, and each writer told once per story.
  for link in
    delete from public.story_tags where story_tags.tag_id = rejected.id
    returning story_tags.story_id, story_tags.user_id
  loop
    perform public.notify(link.user_id, 'tag_rejected', null, jsonb_build_object('story_id', link.story_id));
    removed_count := removed_count + 1;
  end loop;
  -- Step 4: the audit log, with the reason and how many stories it left.
  perform public.log_staff_action('tag.rejected', 'tags', rejected.id::text, null, btrim(reason),
    jsonb_build_object('name', rejected.name, 'status', before_status),
    jsonb_build_object('name', rejected.name, 'status', 'rejected', 'stories', removed_count));
  return removed_count;
end;
$$;

comment on function public.admin_reject_tag(uuid, text) is
  'Rejects a tag: off every story, writers told; moderation staff; logged (CMS-1e).';
revoke execute on function public.admin_reject_tag(uuid, text) from public, anon;
grant execute on function public.admin_reject_tag(uuid, text) to authenticated;

/* ---------- The recommended tags ---------- */

/**
 * The first recommended tags, in English and Romanian (Robert, 30 Oct 2026: "Please add some
 * recommended tags in advance"). Staff can rename them later. A tag already in use that means the
 * same thing in either language becomes this one, its stories kept: "familie" and "family" both
 * become Family. The English name is the stored name.
 */
do $$
declare
  recommended record;
  keep_id uuid;
  other_id uuid;
begin
  for recommended in
    select * from (values
      ('Fantasy', 'Fantezie'), ('Science fiction', 'Științifico-fantastic'), ('Romance', 'Romantic'),
      ('Mystery', 'Mister'), ('Thriller', 'Thriller'), ('Horror', 'Horror'), ('Adventure', 'Aventură'),
      ('Historical', 'Istoric'), ('Humour', 'Umor'), ('Drama', 'Dramă'), ('Family', 'Familie'),
      ('Friendship', 'Prietenie'), ('Coming of age', 'Maturizare'), ('School', 'Școală'),
      ('Love', 'Dragoste'), ('Magic', 'Magie'), ('Dragons', 'Dragoni'), ('Dystopia', 'Distopie'),
      ('Paranormal', 'Paranormal'), ('Crime', 'Polițist'), ('Short story', 'Povestire'),
      ('Fairy tale', 'Basm'), ('Folklore', 'Folclor'), ('Mythology', 'Mitologie'), ('War', 'Război'),
      ('Travel', 'Călătorii'), ('Memoir', 'Memorii'), ('Diary', 'Jurnal'), ('Letters', 'Scrisori'),
      ('Nature', 'Natură'), ('Animals', 'Animale'), ('City', 'Oraș'), ('Village', 'Sat'),
      ('Grandparents', 'Bunici'), ('Neighbours', 'Vecini'), ('Set in Romania', 'Acțiunea în România'),
      ('Music', 'Muzică'), ('Art', 'Artă'), ('Sport', 'Sport'), ('Space', 'Spațiu'),
      ('Time travel', 'Călătorie în timp'), ('Superheroes', 'Supereroi'), ('Hope', 'Speranță'),
      ('Loss', 'Pierdere'), ('Everyday life', 'Viața de zi cu zi')
    ) as given (english, romanian)
  loop
    -- Step 1: a tag already in use under either name, the English one first.
    select tags.id into keep_id from public.tags
    where tags.normalised_name in (public.normalise_tag(recommended.english), public.normalise_tag(recommended.romanian))
    order by (tags.normalised_name = public.normalise_tag(recommended.english)) desc
    limit 1;
    -- Step 2: a second one (the other language) joins it: its stories move, then it goes.
    if keep_id is not null then
      for other_id in
        select tags.id from public.tags
        where tags.id <> keep_id
          and tags.normalised_name in (public.normalise_tag(recommended.english), public.normalise_tag(recommended.romanian))
      loop
        insert into public.story_tags (story_id, tag_id, user_id, created_at)
        select story_tags.story_id, keep_id, story_tags.user_id, story_tags.created_at
        from public.story_tags where story_tags.tag_id = other_id
        on conflict do nothing;
        delete from public.story_tags where story_tags.tag_id = other_id;
        delete from public.tags where tags.id = other_id;
      end loop;
      update public.tags
      set name = recommended.english, normalised_name = public.normalise_tag(recommended.english),
          status = 'approved', is_recommended = true
      where tags.id = keep_id;
    else
      insert into public.tags (name, normalised_name, status, is_recommended)
      values (recommended.english, public.normalise_tag(recommended.english), 'approved', true)
      returning tags.id into keep_id;
    end if;
    -- Step 3: its name in each interface language.
    insert into public.tag_names (tag_id, language_code, name, normalised_name)
    values (keep_id, 'en', recommended.english, public.normalise_tag(recommended.english)),
           (keep_id, 'ro', recommended.romanian, public.normalise_tag(recommended.romanian));
  end loop;
end;
$$;

/**
 * notification_category: as in S1-E10-07, with tag_rejected under the moderation team's chip
 * ("staff"), next to the other things staff decided (CMS-1e).
 * Input: the kind. Returns: 'stories', 'follows', 'staff' or 'replies'.
 * Internal: my_notifications().
 */
create or replace function public.notification_category(kind public.notification_kind)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'new_chapter' then 'stories'
    when 'new_follower' then 'follows'
    when 'moderation_decision' then 'staff'
    when 'report_outcome' then 'staff'
    when 'appeal_decided' then 'staff'
    when 'moderator_mail_reply' then 'staff'
    when 'tag_rejected' then 'staff'
    else 'replies'
  end;
$$;
