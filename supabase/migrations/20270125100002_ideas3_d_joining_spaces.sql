/*
 * Migration: joining spaces (bundle 14d IDEAS-3, part d; ideas IDEA-20261102-6 and
 * IDEA-20261102-9, approved by Robert on 2 Nov 2026 at 22:01).
 *
 * What it adds:
 * - Idea 6, a welcome note: spaces.welcome_note, which the owner (or a moderator with the settings
 *   power) writes with set_space_welcome_note(); at most 500 characters and no HTML, like the rules
 *   (CLAUDE.md rule 8). space_members.welcome_seen_at records "Got it", so each member sees the note
 *   once, at the top of the space (dismiss_space_welcome()). The note is part of the space: it is
 *   read only by its members and the people who run it, and a report of the space covers it.
 * - Idea 9, a note with a request to join: join_space() takes an optional note of at most 200
 *   characters for a space that approves each request. The note lives in its own table,
 *   space_join_notes, because it is text a person writes for others (CLAUDE.md rule 15: it has the
 *   writer's user_id). It is a new reportable type, 'space_join_note' (rule 6), with its branches
 *   in reportable_item_owner(), reportable_item_summary() and case_item_content(), and a hidden or
 *   removed note is left out of space_join_requests(). A note stays when its request is decided, so
 *   a report about it can still be looked at.
 * Who reads what: the writer reads their own notes (the table's one policy, for Download my data);
 *   the owner and moderators with the members power read the notes of the requests waiting in
 *   their space through space_join_requests(). Nobody else.
 * Called by: src/features/spaces/api/spaces.ts (joinSpace, fetchJoinRequests) and
 *   src/features/spaces/api/spaceWelcome.ts.
 */

/* ---------- Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('space_welcome_max_characters', '500'::jsonb, true,
   'The longest welcome note for a space''s new members, in characters (IDEA-20261102-6).'),
  ('space_join_note_max_characters', '200'::jsonb, true,
   'The longest note with a request to join a space, in characters (IDEA-20261102-9).')
on conflict (key) do nothing;

/* ---------- The welcome note (idea 6) ---------- */

alter table public.spaces add column welcome_note text
  constraint spaces_welcome_note_length check (char_length(welcome_note) <= 2000);
comment on column public.spaces.welcome_note is
  'What each new member sees once at the top of the space, written by the owner; null for none (IDEA-20261102-6). The 500-character limit is a setting, checked on save.';

alter table public.space_members add column welcome_seen_at timestamptz;
comment on column public.space_members.welcome_seen_at is
  'When the member pressed "Got it" on the space''s welcome note; null while it still shows (IDEA-20261102-6).';

/* ---------- The note with a request to join (idea 9) ---------- */

create table public.space_join_notes (
  id uuid primary key default gen_random_uuid(),
  -- Who wrote it: the person asking to join (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  space_id uuid not null references public.spaces (id) on delete cascade,
  note text not null check (char_length(note) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
comment on table public.space_join_notes is
  'kind: user_content; reportable: space_join_note
The short note someone sends with a request to join a space that approves each request (IDEA-20261102-9).';
create index space_join_notes_space_person on public.space_join_notes (space_id, user_id, created_at desc);
create index space_join_notes_person on public.space_join_notes (user_id);
create trigger space_join_notes_set_updated_at
  before update on public.space_join_notes
  for each row execute function public.set_updated_at();
create trigger space_join_notes_refuse_user_id_change
  before update on public.space_join_notes
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.space_join_notes enable row level security;

-- Allows: the writer, reading their own notes (Download my data). Why: it is their own text. The
-- people who decide the request read it through space_join_requests(), never the table, so
-- nobody else can list notes. Writes go only through join_space().
create policy space_join_notes_select_own on public.space_join_notes
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.space_join_notes to authenticated;

/* ---------- Checking the words ---------- */

/**
 * check_space_text: as in FORUMS-2a, and two more fields that may be empty, like the rules: the
 *   welcome note ('welcome', at most 500 characters) and the note with a request to join
 *   ('join_note', at most 200). Hints are '<field>:too_long' and '<field>:html'.
 */
create or replace function public.check_space_text(value text, field text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  clean text := btrim(public.normalise_romanian_letters(coalesce(value, '')));
  longest integer := coalesce((public.setting_value('space_' || field || '_max_characters'))::integer, 300);
begin
  -- Step 1: a name is one line with single spaces.
  if field = 'name' then
    clean := regexp_replace(clean, '\s+', ' ', 'g');
  end if;
  -- Step 2: a name and a description are needed; the rules and the two notes may be empty.
  if clean = '' and field not in ('rules', 'welcome', 'join_note') then
    raise exception 'Fill in the %.', field using errcode = 'check_violation', hint = field || ':empty';
  end if;
  if char_length(clean) > longest then
    raise exception 'At most % characters.', longest using errcode = 'check_violation', hint = field || ':too_long';
  end if;
  -- Step 3: no raw HTML, so nothing in it can run (CLAUDE.md rule 8; idea 6, criterion 2).
  if clean ~ '<[[:alpha:]/!?]' then
    raise exception 'HTML tags are not allowed (CLAUDE.md rule 8).' using errcode = 'check_violation', hint = field || ':html';
  end if;
  return clean;
end;
$$;

/**
 * set_space_welcome_note: saves the welcome note new members see once.
 * Inputs: slug, the space's address; note, the words (empty takes the note away).
 * Returns: space_json() of the changed space.
 * Errors: as space_for_power() (only the owner, a moderator with the settings power or our
 *   moderation team); check_violation with hint 'welcome:too_long' (over 500 characters) or
 *   'welcome:html' (HTML tags), so nothing is saved (idea 6, criterion 2).
 * Where it fits: the Welcome note card in Space settings. Logged in the space's log.
 */
create or replace function public.set_space_welcome_note(slug text, note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(set_space_welcome_note.slug, 'settings');
  clean_note text := nullif(public.check_space_text(note, 'welcome'), '');
begin
  -- Step 1: nothing to do when the words are the same.
  if clean_note is not distinct from space.welcome_note then
    return public.space_json(space);
  end if;
  -- Step 2: the change, and the log line (without the words: the space has them).
  update public.spaces set welcome_note = clean_note where spaces.id = space.id returning * into space;
  perform public.log_space_action(space, 'welcome_note_changed', null, null, null,
    jsonb_build_object('has_note', clean_note is not null));
  return public.space_json(space);
end;
$$;
comment on function public.set_space_welcome_note(text, text) is
  'Saves the welcome note a space''s new members see once, for whoever holds the settings power; logged (IDEA-20261102-6).';
revoke execute on function public.set_space_welcome_note(text, text) from public, anon;
grant execute on function public.set_space_welcome_note(text, text) to authenticated;

/**
 * dismiss_space_welcome: "Got it" on a space's welcome note, so it doesn't show again.
 * Input: slug, the space's address. Returns: nothing.
 * Errors: no_data_found (hint 'space:missing') when the caller isn't a member of a live space.
 * Where it fits: the welcome note at the top of the space page.
 */
create or replace function public.dismiss_space_welcome(slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: mark the caller's own active membership; nobody else's.
  update public.space_members set welcome_seen_at = now()
  from public.spaces
  where spaces.id = space_members.space_id
    and spaces.slug = dismiss_space_welcome.slug and spaces.deleted_at is null
    and space_members.user_id = (select auth.uid()) and space_members.status = 'active';
  -- Step 2: a space the caller isn't in says so.
  if not found then
    raise exception 'You''re not in that space.' using errcode = 'no_data_found', hint = 'space:missing';
  end if;
end;
$$;
comment on function public.dismiss_space_welcome(text) is
  'A member''s "Got it" on a space''s welcome note, so it shows once (IDEA-20261102-6).';
revoke execute on function public.dismiss_space_welcome(text) from public, anon;
grant execute on function public.dismiss_space_welcome(text) to authenticated;

/**
 * space_viewer_json: as in CLASSES-a, plus "welcome_note" (the note, for the people who run the
 *   space and its members, so a reader outside never sees it) and "show_welcome" (true for a
 *   member who hasn't pressed "Got it" yet; never for the owner, who wrote it).
 */
create or replace function public.space_viewer_json(target public.spaces)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'membership', case
      when membership.role = 'owner' then 'owner'
      when membership.role = 'moderator' then 'moderator'
      when membership.status = 'active' then 'member'
      when membership.status = 'pending' then 'pending' end,
    'can_read', public.space_may_read(target),
    'can_join', public.space_may_join(target),
    'can_post', public.space_may_post(target),
    'can_manage', public.space_may_act(target, 'settings'),
    'can_appoint', target.user_id = (select auth.uid()) or public.staff_may('moderation', 'act'),
    'can_read_log', target.user_id = (select auth.uid()) or public.staff_may('moderation', 'view'),
    'can_invite', target.kind = 'class' and public.space_may_act(target, 'members'),
    'waits_for_account', public.space_is_in_class(target) and not public.space_may_read(target),
    'powers', to_jsonb(public.space_powers_of_caller(target)),
    -- IDEAS-3d: the welcome note, for members and the people who run the space only.
    'welcome_note', case when membership.status = 'active' or public.space_may_act(target, 'settings')
                         then target.welcome_note end,
    'show_welcome', coalesce(target.welcome_note is not null and membership.status = 'active'
                             and membership.role <> 'owner' and membership.welcome_seen_at is null, false))
  from (select (public.space_membership_of_caller(target.id)).*) as membership;
$$;

/**
 * join_space: as in CLASSES-a, with an optional note for a space that approves each request.
 * Inputs: slug, the space's address; note, at most 200 characters, no HTML (idea 9, criterion 1).
 *   The note is kept only with a request: joining an open space ignores it.
 * Returns: {"status": "active" | "pending"}.
 * Errors: as before; check_violation with hint 'join_note:too_long' or 'join_note:html'.
 */
drop function public.join_space(text);
create function public.join_space(slug text, note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_space_starter();
  space public.spaces;
  membership public.space_members;
  clean_note text := nullif(public.check_space_text(note, 'join_note'), '');
begin
  -- Step 1: a space the caller may know about.
  select * into space from public.spaces where spaces.slug = join_space.slug and spaces.deleted_at is null;
  if space.id is null or not public.space_card_visible(space) then
    raise exception 'There is no such space.' using errcode = 'no_data_found', hint = 'space:missing';
  end if;
  -- Step 2: already in, or already asked.
  membership := public.space_membership_of_caller(space.id);
  if membership.id is not null then
    return jsonb_build_object('status', membership.status);
  end if;
  -- Step 3 (S1-E8-11): a class space takes its teacher's code instead.
  if space.kind = 'class' then
    raise exception 'Join a class with your teacher''s code.' using errcode = 'insufficient_privilege', hint = 'space:class';
  end if;
  -- Step 4: only people in the space's age group join it.
  if not public.space_may_join(space) then
    raise exception 'This space is for another age group.' using errcode = 'insufficient_privilege', hint = 'space:age';
  end if;
  perform public.take_rate_limit('space_join');
  -- Step 5: in straight away, or waiting for the owner.
  insert into public.space_members (user_id, space_id, status, joined_at)
  values (caller_id, space.id,
          case when space.joining = 'open' then 'active'::public.space_member_status else 'pending' end,
          case when space.joining = 'open' then now() end)
  returning * into membership;
  -- Step 6 (IDEAS-3d): the note goes with a request only.
  if membership.status = 'pending' and clean_note is not null then
    insert into public.space_join_notes (user_id, space_id, note) values (caller_id, space.id, clean_note);
  end if;
  return jsonb_build_object('status', membership.status);
end;
$$;
comment on function public.join_space(text, text) is
  'Joins a space, or asks its owner with an optional note, by the age rules (S1-E8-06, IDEA-20261102-9).';
revoke execute on function public.join_space(text, text) from public, anon;
grant execute on function public.join_space(text, text) to authenticated;

/**
 * space_join_note_for: the note with someone's waiting request: the newest live note they wrote
 *   for the space since they asked, unless our moderators hid or removed it.
 * Inputs: the request (a space_members row). Returns: {"id", "text"}, or null. Internal.
 */
create or replace function public.space_join_note_for(request public.space_members)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', notes.id, 'text', notes.note)
  from public.space_join_notes as notes
  where notes.space_id = request.space_id and notes.user_id = request.user_id
    and notes.created_at >= request.requested_at and notes.deleted_at is null
    and not public.is_moderated_away('space_join_note', notes.id)
  order by notes.created_at desc
  limit 1;
$$;
comment on function public.space_join_note_for(public.space_members) is
  'Internal: the live note with a waiting request to join a space (IDEA-20261102-9).';
revoke execute on function public.space_join_note_for(public.space_members) from public, anon, authenticated;

/**
 * space_join_requests: as in FORUMS-2b, and each request carries its note ("note": {"id", "text"}
 *   or null), for the owner and moderators with the members power (idea 9, criterion 2).
 */
create or replace function public.space_join_requests(slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(space_join_requests.slug, 'members');
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('person', public.forum_person_json(space_members.user_id),
                       'requested_at', space_members.requested_at,
                       'note', public.space_join_note_for(space_members)) order by space_members.requested_at)
    from public.space_members
    where space_members.space_id = space.id and space_members.status = 'pending'
      and public.forum_person_json(space_members.user_id) is not null), '[]'::jsonb);
end;
$$;

/* ---------- The shared reporting contract: the note's branches ---------- */

/**
 * reportable_item_owner: as in FORUMS-2a, plus 'space_join_note' (IDEA-20261102-9).
 */
create or replace function public.reportable_item_owner(
  item_type public.reportable_type,
  item_reference text
)
returns table (item_id uuid, owner_user_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  is_row_id boolean := item_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  case item_type
    when 'profile' then
      return query
        select profiles.id, profiles.id from public.profiles
        where profiles.handle_skeleton = public.username_skeleton(btrim(item_reference, ' @'))
          and profiles.deleted_at is null;
    -- A story or a chapter by its row ID, and only once readers can see it: published and not
    -- deleted, so a draft's existence never leaks.
    when 'story' then
      return query
        select stories.id, stories.user_id from public.stories
        where is_row_id and stories.id = item_reference::uuid
          and stories.first_published_at is not null
          and stories.deleted_at is null;
    when 'chapter' then
      return query
        select chapters.id, chapters.user_id from public.chapters
        join public.stories on stories.id = chapters.story_id
        where is_row_id and chapters.id = item_reference::uuid
          and chapters.status = 'published'
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    when 'comment' then
      return query
        select comments.id, comments.user_id from public.comments
        join public.chapters on chapters.id = comments.chapter_id
        join public.stories on stories.id = chapters.story_id
        where is_row_id and comments.id = item_reference::uuid
          and comments.deleted_at is null
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    when 'picture' then
      return query
        select picture_checks.id, picture_checks.user_id from public.picture_checks
        where is_row_id and picture_checks.id = item_reference::uuid
          and picture_checks.status in ('passed', 'approved')
          and picture_checks.deleted_at is null;
    when 'embed' then
      return query
        select chapter_embeds.id, chapter_embeds.user_id from public.chapter_embeds
        join public.chapters on chapters.id = chapter_embeds.chapter_id
        join public.stories on stories.id = chapters.story_id
        where is_row_id and chapter_embeds.id = item_reference::uuid
          and chapter_embeds.deleted_at is null
          and chapters.status = 'published'
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    -- A Story Atlas item only while readers can see it, so a private one never leaks (S1-E17-34).
    when 'atlas_item' then
      return query
        select item_reference::uuid, item.owner_user_id
        from public.plan_item_row(case when is_row_id then item_reference::uuid end) as item
        where public.plan_item_is_public(item_reference::uuid);
    -- A private message only for the two people in its chat, so its existence never leaks to
    -- anyone else (S1-E9-01). Deleted ones can't be reported.
    when 'message' then
      return query
        select messages.id, messages.user_id from public.messages
        join public.conversations on conversations.id = messages.conversation_id
        where is_row_id and messages.id = item_reference::uuid
          and messages.deleted_at is null
          and (select auth.uid()) in (conversations.user_id, conversations.recipient_user_id);
    -- A forum thread or post only while readers can see it: not deleted, in a live thread and
    -- forum, so a deleted one's existence never leaks (S1-E8-02).
    when 'forum_thread' then
      return query
        select forum_threads.id, forum_threads.user_id from public.forum_threads
        join public.forums on forums.id = forum_threads.forum_id
        where is_row_id and forum_threads.id = item_reference::uuid
          and forum_threads.deleted_at is null and forums.deleted_at is null;
    when 'forum_post' then
      return query
        select forum_posts.id, forum_posts.user_id from public.forum_posts
        join public.forum_threads on forum_threads.id = forum_posts.thread_id
        join public.forums on forums.id = forum_threads.forum_id
        where is_row_id and forum_posts.id = item_reference::uuid
          and forum_posts.deleted_at is null and forum_threads.deleted_at is null
          and forums.deleted_at is null;
    -- A space only while the reporter may see that it exists, so a hidden under-16 space never
    -- leaks to an adult through the report form (S1-E8-06).
    when 'space' then
      return query
        select spaces.id, spaces.user_id from public.spaces
        where is_row_id and spaces.id = item_reference::uuid and public.space_card_visible(spaces);
    -- A note with a request to join only for the people who decide that space's requests, so a
    -- note never reaches anyone else through the report form (IDEA-20261102-9).
    when 'space_join_note' then
      return query
        select space_join_notes.id, space_join_notes.user_id from public.space_join_notes
        join public.spaces on spaces.id = space_join_notes.space_id
        where is_row_id and space_join_notes.id = item_reference::uuid
          and space_join_notes.deleted_at is null and spaces.deleted_at is null
          and public.space_may_act(spaces, 'members');
  end case;
  if not found then
    raise exception 'There is no such % to report.', item_type using errcode = 'check_violation';
  end if;
end;
$$;

comment on function public.reportable_item_owner(public.reportable_type, text) is
  'The reported item''s ID and owner, one branch per reportable_type (shared contract, S1-E10-01; comment S1-E6-01; picture S1-E10-05; embed S1-E3-10; atlas_item S1-E17-34; message S1-E9-01; forum_thread and forum_post S1-E8-02; space S1-E8-06; space_join_note IDEA-20261102-9).';

/**
 * reportable_item_summary: as in FORUMS-2a, and a note with a request to join says which space and
 *   its first words (IDEA-20261102-9).
 */
create or replace function public.reportable_item_summary(
  item_type public.reportable_type,
  item_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  summary text;
begin
  case item_type
    when 'profile' then
      select '@' || coalesce(profiles.handle, '…') into summary
      from public.profiles where profiles.id = item_id;
    when 'story' then
      select stories.title into summary from public.stories where stories.id = item_id;
    when 'chapter' then
      select format('Chapter %s of %s', chapters.position, stories.title) into summary
      from public.chapters join public.stories on stories.id = chapters.story_id
      where chapters.id = item_id;
    when 'comment' then
      select format('Comment on chapter %s of %s: %s', chapters.position, stories.title,
          case when char_length(comments.body) > 80 then left(comments.body, 80) || '…' else comments.body end)
        into summary
      from public.comments
      join public.chapters on chapters.id = comments.chapter_id
      join public.stories on stories.id = chapters.story_id
      where comments.id = item_id;
    when 'picture' then
      select case picture_checks.kind
          when 'cover' then format('Cover picture of %s', coalesce(stories.title, 'a story'))
          when 'avatar' then format('Profile picture of @%s', coalesce(profiles.handle, '…'))
          when 'chapter_picture' then format('Picture in chapter %s of %s',
            coalesce(chapters.position::text, '?'), coalesce(stories.title, 'a story'))
          else format('Picture (%s)', picture_checks.kind) end
        into summary
      from public.picture_checks
      left join public.stories on stories.id = picture_checks.story_id
      left join public.chapters on chapters.id = picture_checks.chapter_id
      left join public.profiles on profiles.id = picture_checks.user_id
      where picture_checks.id = item_id;
    when 'embed' then
      select format('%s from %s in chapter %s of %s',
          case when chapter_embeds.service in ('spotify', 'apple_music') then 'Music' else 'Video' end,
          case chapter_embeds.service when 'youtube' then 'YouTube' when 'vimeo' then 'Vimeo'
            when 'loom' then 'Loom' when 'spotify' then 'Spotify' else 'Apple Music' end,
          chapters.position, stories.title)
        into summary
      from public.chapter_embeds
      join public.chapters on chapters.id = chapter_embeds.chapter_id
      join public.stories on stories.id = chapters.story_id
      where chapter_embeds.id = item_id;
    when 'atlas_item' then
      select format('%s "%s" in the world of %s',
          case item.item_kind when 'character' then 'Character' when 'relationship' then 'Relationship between'
            when 'section' then 'World section' when 'entry' then 'World entry' else 'Timeline event' end,
          item.title, stories.title)
        into summary
      from public.plan_item_row(item_id) as item
      join public.stories on stories.id = item.story_id;
    when 'message' then
      select format('Private message from @%s: %s', coalesce(profiles.handle, '…'),
          case when char_length(messages.body) > 80 then left(messages.body, 80) || '…' else messages.body end)
        into summary
      from public.messages
      left join public.profiles on profiles.id = messages.user_id
      where messages.id = item_id;
    when 'forum_thread' then
      select format('Forum thread "%s"', forum_threads.title) into summary
      from public.forum_threads where forum_threads.id = item_id;
    when 'forum_post' then
      select format('Post #%s in "%s": %s', forum_posts.post_number, forum_threads.title,
          case when char_length(forum_posts.body) > 80 then left(forum_posts.body, 80) || '…' else forum_posts.body end)
        into summary
      from public.forum_posts join public.forum_threads on forum_threads.id = forum_posts.thread_id
      where forum_posts.id = item_id;
    when 'space' then
      select format('Space "%s"', spaces.name) into summary from public.spaces where spaces.id = item_id;
    when 'space_join_note' then
      select format('Note asking to join "%s": %s', spaces.name,
          case when char_length(space_join_notes.note) > 80 then left(space_join_notes.note, 80) || '…' else space_join_notes.note end)
        into summary
      from public.space_join_notes join public.spaces on spaces.id = space_join_notes.space_id
      where space_join_notes.id = item_id;
  end case;
  return coalesce(summary, '(gone)');
end;
$$;

/** case_item_content: as in ADMIN-2e2b, with a note with a request to join (IDEA-20261102-9). */
create or replace function public.case_item_content(target public.cases)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case target.item_type
    when 'story' then (select jsonb_build_object('title', stories.title, 'blurb', stories.blurb,
        'created_at', stories.created_at) from public.stories where stories.id = target.item_id)
    when 'chapter' then (select jsonb_build_object('title', chapters.published_title, 'text', chapters.published_body,
        'first_published_at', chapters.first_published_at) from public.chapters where chapters.id = target.item_id)
    when 'comment' then (select jsonb_build_object('text', comments.body, 'created_at', comments.created_at)
        from public.comments where comments.id = target.item_id)
    when 'profile' then (select jsonb_build_object('handle', profiles.handle, 'pen_name', profiles.pen_name,
        'bio', profiles.bio) from public.profiles where profiles.id = target.item_id)
    when 'picture' then public.picture_item_content(target.item_id)
    when 'embed' then (select jsonb_build_object('service', chapter_embeds.service,
        'source_url', chapter_embeds.source_url, 'title', chapter_embeds.title,
        'author_name', chapter_embeds.author_name, 'added_at', chapter_embeds.created_at)
        from public.chapter_embeds where chapter_embeds.id = target.item_id)
    when 'atlas_item' then public.plan_item_content(target.item_id)
    -- The reported message's words, plus it and up to 20 before it as context (S1-E9-02).
    when 'message' then (select jsonb_build_object('text', messages.body, 'sent_at', messages.created_at,
        'context', public.message_with_context(messages.id))
        from public.messages where messages.id = target.item_id)
    -- A thread's title with its first post; a post's words, when it was written and edited, and
    -- its earlier versions (S1-E8-02 criterion 4).
    when 'forum_thread' then (select jsonb_build_object('title', forum_threads.title,
        'started_at', forum_threads.created_at,
        'text', (select first_post.body from public.forum_posts as first_post
                 where first_post.thread_id = forum_threads.id and first_post.post_number = 1))
        from public.forum_threads where forum_threads.id = target.item_id)
    when 'forum_post' then (select jsonb_build_object('text', forum_posts.body, 'number', forum_posts.post_number,
        'posted_at', forum_posts.created_at, 'edited_at', forum_posts.edited_at,
        'earlier_versions', (select coalesce(jsonb_agg(jsonb_build_object('text', revisions.body,
            'title', revisions.title, 'written_at', revisions.written_at) order by revisions.written_at), '[]'::jsonb)
          from public.forum_post_revisions as revisions where revisions.post_id = forum_posts.id))
        from public.forum_posts where forum_posts.id = target.item_id)
    -- A space's name, description and rules, as its page shows them (S1-E8-06).
    when 'space' then (select jsonb_build_object('name', spaces.name, 'description', spaces.description,
        'rules', spaces.rules, 'started_at', spaces.created_at)
        from public.spaces where spaces.id = target.item_id)
    -- A note with a request to join, with the space it was for (IDEA-20261102-9).
    when 'space_join_note' then (select jsonb_build_object('text', space_join_notes.note,
        'space', spaces.name, 'created_at', space_join_notes.created_at)
        from public.space_join_notes join public.spaces on spaces.id = space_join_notes.space_id
        where space_join_notes.id = target.item_id)
  end;
$$;

/* ---------- Download my data and deleting an account ---------- */

/**
 * data_export_tables: as before, plus space_join_notes (included: the person's own notes).
 */
create or replace function public.data_export_tables()
returns table (table_name text, is_included boolean, why_left_out text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', true, null),
    ('age_check_attempts', true, null),
    ('age_check_sessions', false, 'a short-lived link to a Yoti session, deleted once the result is stored; the result is in the account part'),
    ('appeals', true, null),
    ('blocks', true, null),
    ('canva_connections', false, 'holds the keys to the person''s own Canva account, which must never leave the server'),
    ('certificates', true, null),
    ('chapter_embeds', true, null),
    ('chapter_likes', true, null),
    ('chapter_plan_characters', true, null),
    ('chapter_plans', true, null),
    ('chapter_revisions', true, null),
    ('chapter_scenes', true, null),
    ('chapters', true, null),
    ('comment_downvotes', true, null),
    ('comment_reactions', true, null),
    ('comments', true, null),
    ('customisation_change_requests', true, null),
    ('consents', true, null),
    ('conversation_members', true, null),
    ('contest_entries', true, null),
    ('conversations', true, null),
    ('email_outbox', false, 'copies of notifications waiting to be emailed; the notifications themselves are included'),
    ('email_unsubscribe_keys', false, 'a secret key for the one-click unsubscribe link'),
    ('finished_thanks', true, null),
    ('follows_stories', true, null),
    ('follows_users', true, null),
    ('forum_post_revisions', true, null),
    ('forum_posts', true, null),
    ('forum_read_marks', true, null),
    ('forum_thread_reads', true, null),
    ('forum_threads', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
    ('landing_page_reminders', true, null),
    ('library_entries', true, null),
    ('manual_age_checks', true, null),
    ('messages', true, null),
    ('moderator_mail_messages', true, null),
    ('moderator_mail_threads', true, null),
    ('notification_email_settings', true, null),
    ('notifications', true, null),
    ('parental_consents', true, null),
    ('picture_checks', true, null),
    ('quote_cards', true, null),
    ('rate_limit_events', false, 'a security counter kept for two days'),
    ('reading_habits', true, null),
    ('reading_minutes', true, null),
    ('reading_positions', true, null),
    ('reading_preferences', true, null),
    ('reading_settings', true, null),
    ('report_detail_requests', true, null),
    ('reports', true, null),
    ('space_join_notes', true, null),
    ('space_members', true, null),
    ('space_moderation_log', true, null),
    ('spaces', true, null),
    ('statements_of_reasons', true, null),
    ('stories', true, null),
    ('story_bible_entries', true, null),
    ('story_bible_sections', true, null),
    ('story_character_fields', true, null),
    ('story_character_relationships', true, null),
    ('story_characters', true, null),
    ('story_events', true, null),
    ('story_ideas', true, null),
    ('story_marketing', true, null),
    ('story_plan_acts', true, null),
    ('story_plans', true, null),
    ('story_tags', true, null),
    ('teacher_checks', true, null),
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile'),
    ('writer_ranks', false, 'worked out from the person''s published chapters, which are in the export; the rank itself shows on the profile');
$$;

/**
 * account_deletion_rules: as before, plus space_join_notes (deleted with the account).
 */
create or replace function public.account_deletion_rules()
returns table (table_name text, action text, step integer, why text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', 'kept', 0, 'the record that the account was deleted, with no personal data in it'),
    ('age_check_attempts', 'delete', 1, null),
    ('age_check_sessions', 'delete', 1, null),
    ('appeals', 'kept', 0, 'a moderation record, kept as long as its statement of reasons and case (docs/retention.md)'),
    ('blocks', 'own_step', 0, 'deleted both ways: who the person blocked and who blocked them'),
    ('canva_connections', 'delete', 1, null),
    ('certificates', 'delete', 1, null),
    ('chapter_embeds', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_likes', 'delete', 1, null),
    ('chapter_plan_characters', 'delete', 1, null),
    ('chapter_plans', 'delete', 2, null),
    ('chapter_revisions', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_scenes', 'delete', 1, null),
    ('chapters', 'own_step', 0, 'deleted unless under an open case'),
    ('comment_downvotes', 'delete', 1, null),
    ('comment_reactions', 'delete', 1, null),
    ('comments', 'own_step', 0, 'deleted unless under an open case; one with replies keeps its place, with its words erased'),
    ('customisation_change_requests', 'delete', 1, null),
    ('consents', 'kept', 0, 'proof of what the person agreed to (GDPR art. 7(1)); how long after deletion is OPEN for the lawyer'),
    ('conversation_members', 'own_step', 0, 'marked deleted for the person, so the chat goes once the other person deletes it too'),
    ('contest_entries', 'delete', 1, null),
    ('conversations', 'kept', 0, 'the other person''s chat; removed by the chat clean-up once they delete it (S1-E9-04)'),
    ('email_outbox', 'delete', 1, null),
    ('email_unsubscribe_keys', 'delete', 1, null),
    ('exports', 'delete', 1, null),
    ('finished_thanks', 'delete', 1, null),
    ('follows_stories', 'delete', 1, null),
    ('follows_users', 'own_step', 0, 'deleted both ways: whom the person followed and who followed them'),
    ('forum_post_revisions', 'own_step', 0, 'deleted with the account''s posts, unless a case holds the post'),
    ('forum_posts', 'own_step', 0, 'words erased unless under an open case; the post keeps its number as a "Post deleted" marker so the thread''s numbering stays'),
    ('forum_read_marks', 'delete', 1, null),
    ('forum_thread_reads', 'delete', 1, null),
    ('forum_threads', 'own_step', 0, 'deleted when nobody else posted in it; otherwise kept for the other people''s replies, its starter shown as a deleted account'),
    ('identity_link_requests', 'delete', 1, null),
    ('invites', 'kept', 0, 'invites staff made; purged 90 days after they expire (docs/retention.md)'),
    ('landing_page_reminders', 'delete', 1, null),
    ('library_entries', 'delete', 1, null),
    ('manual_age_checks', 'delete', 1, null),
    ('messages', 'own_step', 0, 'the person''s own messages are deleted, unless reported and still held (S1-E9-02)'),
    ('moderator_mail_messages', 'kept', 0, 'a moderation record, purged a year after the thread was last updated (docs/retention.md)'),
    ('moderator_mail_threads', 'kept', 0, 'a moderation record, purged a year after it was last updated (docs/retention.md)'),
    ('notification_email_settings', 'delete', 1, null),
    ('notifications', 'delete', 1, null),
    ('parental_consents', 'delete', 1, null),
    ('picture_checks', 'own_step', 0, 'deleted unless a case or an authority''s order keeps the picture'),
    ('quote_cards', 'delete', 1, null),
    ('rate_limit_events', 'delete', 1, null),
    ('reading_habits', 'delete', 1, null),
    ('reading_minutes', 'delete', 1, null),
    ('reading_positions', 'delete', 1, null),
    ('reading_preferences', 'delete', 1, null),
    ('reading_settings', 'delete', 1, null),
    ('report_detail_requests', 'kept', 0, 'part of a report, kept as long as the report and its case (docs/retention.md)'),
    ('reports', 'kept', 0, 'a moderation record, kept as long as its case (docs/retention.md, OPEN)'),
    ('space_join_notes', 'delete', 1, null),
    ('space_members', 'delete', 1, null),
    ('space_moderation_log', 'kept', 0, 'a record of moderation in the space, kept while the space exists, the moderator shown as a deleted account'),
    ('spaces', 'kept', 0, 'the space stays for its members, its owner shown as a deleted account (a question for Robert, FORUMS-2a)'),
    ('statements_of_reasons', 'kept', 0, 'a moderation record, kept 6 months after the decision and as long as its case (DSA art. 17)'),
    ('stories', 'own_step', 0, 'deleted unless the story or one of its chapters is under an open case'),
    ('story_bible_entries', 'delete', 1, null),
    ('story_bible_sections', 'delete', 2, null),
    ('story_character_fields', 'delete', 1, null),
    ('story_character_relationships', 'delete', 1, null),
    ('story_characters', 'delete', 2, null),
    ('story_events', 'delete', 1, null),
    ('story_ideas', 'delete', 1, null),
    ('story_marketing', 'delete', 1, null),
    ('story_plan_acts', 'delete', 2, null),
    ('story_plans', 'delete', 3, null),
    ('story_tags', 'own_step', 0, 'deleted with their story, unless the story is kept for a case'),
    ('teacher_checks', 'delete', 1, null),
    ('username_approvals', 'delete', 1, null),
    ('writer_ranks', 'delete', 1, null);
$$;
