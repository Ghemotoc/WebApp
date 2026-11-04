/*
 * Migration: forum help and passages (bundle 14d IDEAS-3, part f; ideas IDEA-20261102-8 and
 * IDEA-20261102-10, approved by Robert on 2 Nov 2026 at 22:01).
 *
 * What it adds:
 * - Idea 8, an answered help thread: forum_threads.answer_post_id, set by the thread's starter
 *   only with mark_forum_thread_answer() ("This answered it" on a reply). The thread page links the
 *   answer at the top (forum_thread_header_json() "answer") and lists show "Answered"
 *   (forum_thread_summary_json() "is_answered"). An answer that was deleted or hidden stops
 *   counting, so a list never points at words nobody can read.
 * - Idea 10, a thread from a chapter passage: passage_discussion_allowed() says whether the reader
 *   may take a passage of a chapter to the forums. It uses the same gate as sharing a passage
 *   (shareable_chapter(): a chapter the reader may read, by the rating and block rules, and the
 *   writer's passage switch, which is off for 16+ and 18+), and adds that the story must be public:
 *   not unlisted, private, class-only or restricted by staff. The quote itself is ordinary text in
 *   the new thread, so the forum's own rules and reporting cover it.
 * No new table or policy. Called by: src/features/forums/api/forumAnswers.ts and
 *   src/features/sharing/api/sharing.ts.
 */

/* ---------- An answered help thread (idea 8) ---------- */

alter table public.forum_threads add column answer_post_id uuid
  references public.forum_posts (id) on delete set null;
comment on column public.forum_threads.answer_post_id is
  'The reply the thread''s starter marked "This answered it"; null for none (IDEA-20261102-8).';

/**
 * forum_answer_post: the reply a thread's starter marked as the answer, while readers can read it.
 * Input: the thread. Returns: the post, or null when there is none or it was deleted or hidden.
 * Internal: the thread's header, its list row and its posts.
 */
create or replace function public.forum_answer_post(target public.forum_threads)
returns public.forum_posts
language sql
stable
security definer
set search_path = ''
as $$
  select forum_posts.* from public.forum_posts
  where forum_posts.id = target.answer_post_id
    and forum_posts.deleted_at is null
    and not public.is_moderated_away('forum_post', forum_posts.id);
$$;
comment on function public.forum_answer_post(public.forum_threads) is
  'Internal: a thread''s marked answer while everyone can read it (IDEA-20261102-8).';
revoke execute on function public.forum_answer_post(public.forum_threads) from public, anon, authenticated;

/**
 * mark_forum_thread_answer: "This answered it": the thread's starter marks the reply that answered
 *   their question, or takes the mark away.
 * Inputs: thread_number; post_number, the reply (null takes the mark away).
 * Returns: {"answer_post_number"}: the marked reply's number, or null.
 * Errors: insufficient_privilege (hint 'answer:not_starter') for anyone but the thread's starter
 *   (criterion 2), or a starter whose account may not write; no_data_found (hint
 *   'thread:missing') for a thread that isn't there; check_violation (hint 'answer:not_reply')
 *   for the opening post, the starter's own reply, or a reply that was deleted or hidden.
 * Where it fits: the "This answered it" button on each reply, for the thread's starter.
 */
create or replace function public.mark_forum_thread_answer(thread_number bigint, post_number integer default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.forum_threads;
  answer public.forum_posts;
begin
  -- Step 1: the live thread, locked for the change.
  select * into thread from public.forum_threads
  where forum_threads.thread_number = mark_forum_thread_answer.thread_number and forum_threads.deleted_at is null
  for update;
  if thread.id is null or not public.forum_thread_is_shown(thread) then
    raise exception 'That thread isn''t there any more.' using errcode = 'no_data_found', hint = 'thread:missing';
  end if;
  -- Step 2: only the person who asked marks the answer (criterion 2).
  if thread.user_id is distinct from (select auth.uid()) or not public.is_active_member() then
    raise exception 'Only the person who started the thread can mark its answer.'
      using errcode = 'insufficient_privilege', hint = 'answer:not_starter';
  end if;
  -- Step 3: no number takes the mark away.
  if mark_forum_thread_answer.post_number is null then
    update public.forum_threads set answer_post_id = null where forum_threads.id = thread.id;
    return jsonb_build_object('answer_post_number', null);
  end if;
  -- Step 4: a live reply by someone else.
  select * into answer from public.forum_posts
  where forum_posts.thread_id = thread.id and forum_posts.post_number = mark_forum_thread_answer.post_number
    and forum_posts.post_number > 1 and forum_posts.user_id <> thread.user_id
    and forum_posts.deleted_at is null and not public.is_moderated_away('forum_post', forum_posts.id);
  if answer.id is null then
    raise exception 'Pick a reply someone else wrote.' using errcode = 'check_violation', hint = 'answer:not_reply';
  end if;
  update public.forum_threads set answer_post_id = answer.id where forum_threads.id = thread.id;
  return jsonb_build_object('answer_post_number', answer.post_number);
end;
$$;
comment on function public.mark_forum_thread_answer(bigint, integer) is
  'The thread''s starter marks the reply that answered it, or takes the mark away (IDEA-20261102-8).';
revoke execute on function public.mark_forum_thread_answer(bigint, integer) from public, anon;
grant execute on function public.mark_forum_thread_answer(bigint, integer) to authenticated;

/* ---------- What the screens get ---------- */

/** forum_thread_summary_json: as in FORUMS-1e, plus "is_answered" (IDEAS-3f, criterion 1). */
create or replace function public.forum_thread_summary_json(target public.forum_threads)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  first_unread integer := public.forum_first_unread_post(target);
begin
  return jsonb_build_object(
    'number', target.thread_number,
    'title', target.title,
    'author', public.forum_person_json(target.user_id),
    'created_at', target.created_at,
    'reply_count', greatest(public.forum_live_post_count(target.id) - 1, 0),
    'last_post_at', target.last_post_at,
    'bumped_at', target.bumped_at,
    'last_poster', (select public.forum_person_json(latest.user_id) from public.forum_posts as latest
                    where latest.thread_id = target.id
                      and public.forum_post_state_for_caller(latest) in ('live', 'hidden')
                    order by latest.post_number desc limit 1),
    'is_unread', case when (select auth.uid()) is null then null else first_unread is not null end,
    'first_unread_post', first_unread,
    'is_sticky', target.is_sticky,
    'is_locked', target.locked_at is not null,
    -- IDEAS-3f: the starter marked a reply that answered it, and that reply can still be read.
    'is_answered', (public.forum_answer_post(target)).id is not null);
end;
$$;

/** forum_thread_header_json: as in FORUMS-2b, plus "answer" {number, author} (IDEAS-3f). */
create or replace function public.forum_thread_header_json(target public.forum_threads)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target.id,
    'number', target.thread_number,
    'title', target.title,
    'forum_slug', (select forums.slug from public.forums where forums.id = target.forum_id),
    'space', (select jsonb_build_object('slug', space.slug, 'name', space.name)
              from public.space_of_forum(target.forum_id) as space where space.id is not null),
    'author', public.forum_person_json(target.user_id),
    'is_mine', target.user_id = (select auth.uid()),
    'state', case when public.moderated_state_of('forum_thread', target.id) = 'hidden' then 'hidden' else 'live' end,
    'created_at', target.created_at,
    'reply_count', greatest(public.forum_live_post_count(target.id) - 1, 0),
    'writer_count', (select count(distinct forum_posts.user_id)::integer from public.forum_posts
                     where forum_posts.thread_id = target.id
                       and public.forum_post_state_for_caller(forum_posts) in ('live', 'hidden')),
    'last_post_at', target.last_post_at,
    'last_post_number', target.last_post_number,
    'is_sticky', target.is_sticky,
    'lock', case when target.locked_at is null then null
                 else jsonb_build_object('locked_at', target.locked_at, 'reason', target.lock_reason) end,
    'can_reply', (select auth.uid()) is not null and target.locked_at is null and public.is_active_member()
                 and coalesce((select public.space_may_post(space) from public.space_of_forum(target.forum_id) as space
                               where space.id is not null), true),
    -- IDEAS-3f: the reply that answered it, linked at the top of the thread (criterion 1).
    'answer', (select jsonb_build_object('number', answer.post_number,
                                         'author', public.forum_person_json(answer.user_id))
               from public.forum_answer_post(target) as answer where answer.id is not null),
    'can_moderate', (select auth.uid()) is not null and (
                      public.staff_may('moderation', 'act')
                      or coalesce((select public.space_may_act(space, 'posts') from public.space_of_forum(target.forum_id) as space
                                   where space.id is not null), false)));
$$;

/** forum_post_json: as in FORUMS-2e, plus "is_answer" and "can_mark_answer" (IDEAS-3f). */
create or replace function public.forum_post_json(target public.forum_posts, starter_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  state text := public.forum_post_state_for_caller(target);
  is_own boolean := caller_id is not null and target.user_id = caller_id;
  is_shown boolean := state in ('live', 'hidden');
begin
  return jsonb_build_object(
    'id', target.id,
    'number', target.post_number,
    'author', public.forum_person_json(target.user_id),
    'is_starter', target.user_id = starter_id,
    'is_mine', is_own,
    'created_at', target.created_at,
    'edited_at', target.edited_at,
    'state', state,
    'body', case when is_shown then target.body end,
    'quotes', case when is_shown then (
      select coalesce(jsonb_agg(public.forum_quote_json(quoted_id) order by position), '[]'::jsonb)
      from unnest(target.quoted_post_ids) with ordinality as quoted(quoted_id, position)
      where public.forum_quote_json(quoted_id) is not null) else '[]'::jsonb end,
    'can_edit', is_own and is_shown,
    'can_delete', is_own and is_shown,
    'has_history', target.edited_at is not null and caller_id is not null
      and public.staff_may('moderation', 'view'),
    -- S1-E8-08: the author's signature, under the post on bigger screens (Q25).
    'signature', case when is_shown then public.signature_json(target.user_id) end,
    -- S1-E8-09: the author's rank, a chip next to their name (null before a published chapter).
    'author_rank', public.rank_of(target.user_id),
    -- IDEAS-3f: whether this reply is the thread's marked answer, and whether the caller (the
    -- thread's starter) may mark it: a live reply by someone else (criteria 1 and 2).
    'is_answer', target.id = (select forum_threads.answer_post_id from public.forum_threads
                              where forum_threads.id = target.thread_id),
    'can_mark_answer', is_own is false and caller_id is not null and caller_id = starter_id
                       and target.post_number > 1 and state = 'live');
end;
$$;

/* ---------- A thread from a chapter passage (idea 10) ---------- */

/**
 * passage_discussion_allowed: whether the reader may start a forum thread quoting a passage of a
 *   chapter ("Discuss in the forums" in the reader's selection bar).
 * Inputs: story_slug, chapter_code (the chapter's address).
 * Returns: true for a signed-in reader of a chapter they may read (rating and block rules), when
 *   the writer lets passages be shared (never for 16+ and 18+) and the story is public: not
 *   unlisted, private, class-only or restricted by staff (criterion 2). False otherwise.
 * Errors: none. Where it fits: the reader's selection bar asks once per chapter.
 */
create or replace function public.passage_discussion_allowed(story_slug text, chapter_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and coalesce((
    select shared.quote_cards_enabled
           and stories.visibility = 'public' and not stories.class_only
           and not public.is_story_restricted(stories.id)
    from public.shareable_chapter(story_slug, chapter_code) as shared
    join public.chapters on chapters.id = shared.chapter_id
    join public.stories on stories.id = chapters.story_id), false);
$$;
comment on function public.passage_discussion_allowed(text, text) is
  'Whether the reader may start a forum thread quoting a passage of a public chapter (IDEA-20261102-10).';
revoke execute on function public.passage_discussion_allowed(text, text) from public;
grant execute on function public.passage_discussion_allowed(text, text) to anon, authenticated;
