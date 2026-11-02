/**
 * Migration: stories shared only with a class (bundle CLASSES, part c; story S1-E8-11 criterion
 * "Given a student shares a story with the class, when it is published, then only members can
 * read it until the student makes it public; a teacher can never make it public for them").
 *
 * What it adds:
 *   stories.class_only and stories.class_space_id   a story shared only with one class space.
 *   story_class_allows()      the one gate: a class-only story opens only for its writer and for
 *                             people who may read that class (space_may_read(): fully active
 *                             members and our moderation team).
 *   story_class_share()       the writer's own answer: which class (if any) and which classes
 *                             they could share with.
 *   set_story_class()         the writer shares a story with one of their classes, or makes it
 *                             public again. Only the writer: never the teacher.
 *   class_space_stories()     the stories shared with a class, for its page.
 * What it changes, so a class-only story stays inside its class everywhere:
 *   chapter_is_readable(), story_has_readable_chapter() and reader_visible_story() add the gate
 *   (every reading path, comment, like and share goes through them); listed_stories() and
 *   profile_story_cards() leave class-only stories out of every public list and profile;
 *   story_cover_picture() hides the cover; notify_chapter_published() tells only followers who
 *   are in the class.
 * Who calls it: src/features/spaces/api/classStories.ts.
 */

/* ---------- The columns ---------- */

alter table public.stories
  add column class_only boolean not null default false,
  -- The class it is shared with. If the class disappears, the story stays class-only (only the
  -- writer reads it) rather than becoming public: class_only, not the link, decides.
  add column class_space_id uuid references public.spaces (id) on delete set null,
  add constraint stories_class_link_only_when_class_only check (class_only or class_space_id is null);

comment on column public.stories.class_only is
  'kind: setting. True while the writer shares the story only with one class space (S1-E8-11).';
comment on column public.stories.class_space_id is
  'kind: link. The class space a class-only story is shared with; null once that class is gone (S1-E8-11).';

create index stories_class_space_idx on public.stories (class_space_id) where class_space_id is not null;

/* ---------- The gate ---------- */

/**
 * story_class_allows: whether the caller may read a story, as far as class sharing goes.
 * Inputs: the story's class_only, class_space_id and writer (user_id).
 * Returns: true for a story that isn't class-only, for its writer, and for anyone who may read
 *   its class (space_may_read(): its fully active members and our moderation team). False for
 *   everyone else, signed-out visitors included, and for everyone but the writer when the class
 *   is gone.
 * Errors: none. Where it fits: every reading path below.
 */
create or replace function public.story_class_allows(
  is_class_only boolean,
  target_space_id uuid,
  writer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not is_class_only
    or writer_id = (select auth.uid())
    or exists (
      select 1 from public.spaces
      where spaces.id = target_space_id and public.space_may_read(spaces)
    );
$$;
comment on function public.story_class_allows(boolean, uuid, uuid) is
  'Internal: whether the caller may read a story as far as class sharing goes (S1-E8-11).';
revoke execute on function public.story_class_allows(boolean, uuid, uuid) from public, anon, authenticated;

/* ---------- Every reading path, with the gate ---------- */

/**
 * chapter_is_readable, story_has_readable_chapter, reader_visible_story: as before, and a
 * class-only story opens only for its writer and its class (story_class_allows()).
 * listed_stories, profile_story_cards: as before, and class-only stories are in no public list
 * or profile. story_cover_picture: as before, and the cover of a class-only story shows only to
 * its class. notify_chapter_published: as before, and only followers in the class are told.
 */
/* chapter_is_readable */
create or replace function public.chapter_is_readable(chapter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chapters
    join public.stories on stories.id = chapters.story_id
    where chapters.id = chapter_id
      and chapters.status = 'published'
      and chapters.deleted_at is null
      and stories.deleted_at is null
      and not public.is_moderated_away('chapter', chapters.id)
      and not public.is_moderated_away('story', stories.id)
      -- S1-E8-11: a story shared only with a class opens only for its writer and that class.
      and public.story_class_allows(stories.class_only, stories.class_space_id, stories.user_id)
  );
$$;

/* story_has_readable_chapter */
create or replace function public.story_has_readable_chapter(target_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chapters
    join public.stories on stories.id = chapters.story_id
    where chapters.story_id = target_story_id
      -- S1-E8-11: a story shared only with a class counts only for its writer and that class.
      and public.story_class_allows(stories.class_only, stories.class_space_id, stories.user_id)
      and chapters.status = 'published'
      and chapters.deleted_at is null
      and not public.is_moderated_away('chapter', chapters.id)
  );
$$;

/* reader_visible_story */
create or replace function public.reader_visible_story(story_slug text)
returns setof public.stories
language sql
stable
security definer
set search_path = ''
as $$
  select stories.* from public.stories
  where stories.slug = story_slug
    and stories.deleted_at is null
    and not public.is_moderated_away('story', stories.id)
    -- S1-E8-11: a story shared only with a class opens only for its writer and that class.
    and public.story_class_allows(stories.class_only, stories.class_space_id, stories.user_id)
    and (
      stories.user_id = (select auth.uid())
      or (public.rating_allows(stories.rating) and not public.is_blocked_with(stories.user_id))
    );
$$;

/* listed_stories */
create or replace function public.listed_stories(
  list_kind text,
  list_key text,
  category_slug text,
  completion public.completion_status,
  language text
)
returns setof public.stories
language sql
stable
security definer
set search_path = ''
as $$
  select stories.* from public.stories
  join public.categories on categories.id = stories.category_id
  where stories.deleted_at is null
    and public.story_has_readable_chapter(stories.id)
    and not public.is_moderated_away('story', stories.id)
    -- S1-E8-11: a class-only story is in no public list, only on its class's page.
    and (not stories.class_only or stories.user_id = (select auth.uid()))
    and (
      stories.user_id = (select auth.uid())
      or (public.rating_allows(stories.rating) and not public.is_blocked_with(stories.user_id))
    )
    and (category_slug is null or categories.slug = category_slug)
    and (completion is null or stories.completion_status = completion)
    and (language is null or stories.language_code = language)
    and public.list_holds_story(stories, list_kind, list_key);
$$;

/* notify_chapter_published */
create or replace function public.notify_chapter_published(payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  story public.stories;
  follower_id uuid;
begin
  select * into story from public.stories where stories.id = (payload ->> 'story_id')::uuid;
  if story.id is null then
    return;
  end if;
  for follower_id in
    select follows_users.user_id from public.follows_users where follows_users.followed_user_id = story.user_id
    union
    select follows_stories.user_id from public.follows_stories where follows_stories.story_id = story.id
  loop
    -- S1-E8-11: a chapter of a class-only story tells only followers who are in that class, so
    -- nobody else learns its title.
    if story.class_only and not exists (
      select 1 from public.space_members
      where space_members.space_id = story.class_space_id
        and space_members.user_id = follower_id
        and space_members.status = 'active'
    ) then
      continue;
    end if;
    perform public.notify(follower_id, 'new_chapter', story.user_id,
      jsonb_build_object('story_id', story.id, 'chapter_id', payload ->> 'chapter_id'));
  end loop;
end;
$$;

/* profile_story_cards */
create or replace function public.profile_story_cards(writer_id uuid, is_owner boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', stories.id,
      'slug', stories.slug,
      'title', stories.title,
      'blurb', stories.blurb,
      'category_slug', categories.slug,
      'completion_status', stories.completion_status,
      'rating', stories.rating,
      'cover', jsonb_build_object('kind', stories.cover_kind, 'design', stories.cover_design,
        'background', stories.cover_background, 'accent', stories.cover_accent),
      'chapter_count', (select count(*) from public.chapters
        where chapters.story_id = stories.id and public.chapter_is_readable(chapters.id)),
      'last_chapter_published_at', stories.last_chapter_published_at
    ) order by stories.last_chapter_published_at desc nulls last, stories.title), '[]'::jsonb)
  from public.stories
  join public.categories on categories.id = stories.category_id
  where stories.user_id = writer_id
    and stories.deleted_at is null
    and public.story_has_readable_chapter(stories.id)
    and not public.is_moderated_away('story', stories.id)
    and (is_owner or public.rating_allows(stories.rating))
    -- S1-E8-11: a class-only story isn't on the writer's public profile.
    and (is_owner or not stories.class_only);
$$;

/* story_cover_picture */
create or replace function public.story_cover_picture(story_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.picture_state_json(picture_checks)
  from public.stories
  join public.picture_checks on picture_checks.bucket = 'covers' and picture_checks.path = stories.cover_tall_path
  where stories.slug = story_slug and stories.cover_kind = 'upload' and stories.deleted_at is null
    and (stories.user_id = (select auth.uid())
         or (stories.first_published_at is not null and public.rating_allows(stories.rating)
             -- S1-E8-11: a class-only story's cover shows only to that class.
             and public.story_class_allows(stories.class_only, stories.class_space_id, stories.user_id)));
$$;

/* ---------- The writer's choice ---------- */

/**
 * my_class_choices: the class spaces the caller could share a story with: classes they are an
 * active member of, may read now (their account is fully active) and that aren't locked.
 * Returns: JSON [{slug, name}], by name. Internal: story_class_share(), set_story_class().
 */
create or replace function public.my_class_choices()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('slug', spaces.slug, 'name', spaces.name)
    order by spaces.name), '[]'::jsonb)
  from public.spaces
  join public.space_members on space_members.space_id = spaces.id
  where space_members.user_id = (select auth.uid())
    and space_members.status = 'active'
    and spaces.kind = 'class'
    and spaces.deleted_at is null
    and public.space_may_read(spaces)
    and not public.space_is_locked(spaces);
$$;
comment on function public.my_class_choices() is
  'Internal: the class spaces the caller could share a story with (S1-E8-11).';
revoke execute on function public.my_class_choices() from public, anon, authenticated;

/**
 * story_class_share: who reads one of the caller's own stories, as far as classes go.
 * Input: story_slug, the caller's own story.
 * Returns: JSON {class_only, class: {slug, name} or null (also null once the class is gone),
 *   choices: [{slug, name}]}; null when it isn't the caller's story.
 * Errors: none. Where it fits: the "Who can read it" card in Story settings.
 */
create or replace function public.story_class_share(story_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'class_only', stories.class_only,
    'class', (select jsonb_build_object('slug', spaces.slug, 'name', spaces.name)
      from public.spaces where spaces.id = stories.class_space_id and spaces.deleted_at is null),
    'choices', public.my_class_choices())
  from public.stories
  where stories.id = public.my_live_story_id(story_slug);
$$;
comment on function public.story_class_share(text) is
  'The writer''s own story: shared with a class or not, and the classes they could pick (S1-E8-11).';
revoke execute on function public.story_class_share(text) from public, anon;
grant execute on function public.story_class_share(text) to authenticated;

/**
 * set_story_class: shares one of the caller's own stories only with one of their classes, or
 * makes it readable by everyone again (criterion: only the writer, never the teacher).
 * Inputs: story_slug (the caller's own story); class_slug (a class from my_class_choices()), or
 *   null to make the story public again.
 * Returns: story_class_share() after the change.
 * Errors: check_violation with hint 'story:missing' when it isn't the caller's live story;
 *   hint 'class:not_yours' when the class isn't one they may share with (not a member, not yet
 *   active, locked or not a class).
 * Where it fits: the "Who can read it" card. Writes no log: it is the writer's own setting, like
 * the rating.
 */
create or replace function public.set_story_class(story_slug text, class_slug text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_story_id uuid := public.my_live_story_id(story_slug);
  target_space_id uuid;
begin
  -- Step 1: only the writer changes this, so a teacher can never make a student's story public.
  if target_story_id is null then
    raise exception 'There is no such story of yours.' using errcode = 'check_violation', hint = 'story:missing';
  end if;
  -- Step 2: no class means everyone may read it again (the usual rating rules still apply).
  if class_slug is null then
    update public.stories set class_only = false, class_space_id = null, updated_at = now()
    where stories.id = target_story_id;
    return public.story_class_share(story_slug);
  end if;
  -- Step 3: the class must be one the writer is in and may read now, and not locked.
  select spaces.id into target_space_id from public.spaces
  where spaces.slug = class_slug
    and public.my_class_choices() @> jsonb_build_array(jsonb_build_object('slug', spaces.slug, 'name', spaces.name));
  if target_space_id is null then
    raise exception 'You can only share with a class you are in.' using errcode = 'check_violation', hint = 'class:not_yours';
  end if;
  update public.stories set class_only = true, class_space_id = target_space_id, updated_at = now()
  where stories.id = target_story_id;
  return public.story_class_share(story_slug);
end;
$$;
comment on function public.set_story_class(text, text) is
  'The writer shares their own story only with one of their classes, or makes it public again (S1-E8-11).';
revoke execute on function public.set_story_class(text, text) from public, anon;
grant execute on function public.set_story_class(text, text) to authenticated;

/* ---------- The class's page ---------- */

/**
 * class_space_stories: the stories shared only with a class, for its page (board ClassSpace,
 * "Stories shared with the class").
 * Input: slug, the class space's address.
 * Returns: JSON [story_card_json()], recently updated first, only stories with a chapter the
 *   caller may read and a rating their age allows; an empty list for anyone who may not read the class (nobody learns it has
 *   any).
 * Errors: none. Where it fits: ClassStoriesCard on the space page.
 */
create or replace function public.class_space_stories(slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.story_card_json(stories.id)
    order by stories.last_chapter_published_at desc nulls last), '[]'::jsonb)
  from public.spaces
  join public.stories on stories.class_space_id = spaces.id and stories.class_only
  where spaces.slug = class_space_stories.slug
    and spaces.kind = 'class'
    and public.space_may_read(spaces)
    and stories.deleted_at is null
    and not public.is_moderated_away('story', stories.id)
    and not public.is_blocked_with(stories.user_id)
    -- A story's rating still applies inside a class: a 14-year-old never sees a classmate's 16+ story.
    and (stories.user_id = (select auth.uid()) or public.rating_allows(stories.rating))
    and public.story_has_readable_chapter(stories.id);
$$;
comment on function public.class_space_stories(text) is
  'The stories shared only with a class, for those who may read the class (S1-E8-11).';
revoke execute on function public.class_space_stories(text) from public, anon;
grant execute on function public.class_space_stories(text) to authenticated;
