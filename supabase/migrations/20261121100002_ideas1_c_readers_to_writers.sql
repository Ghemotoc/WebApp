/*
 * Readers to writers (bundle IDEAS-1, part c; ideas IDEA-20261031-3, -10 and -11, Robert's
 * comments of 31 Oct 2026).
 *
 * What it adds:
 * - "I finished it" (idea 3): finished_thanks, one row per reader per story they thanked the
 *   writer for, so each story can be thanked once. send_finished_thanks() records it and sends the
 *   writer a fixed, kind notification ('story_finished') with the reader's name; there is no free
 *   text, so there is nothing to moderate. Only for a story on the reader's Finished shelf, never
 *   for one's own, and nothing is sent across a block either way (reader_visible_story() hides a
 *   blocked writer's story, and notify() skips blocks too). No email: default_email_delivery()
 *   has no answer for the new kind. story_library_state() now also says whether the thanks went.
 * - A writer's quote-card colour (idea 10): stories.card_colour, one of our nine palette colours
 *   or null for our default. update_my_story() takes it; share_options() hands it to the reader's
 *   quote and picture cards, which start in it. The reader can still change it on their card.
 * - Sharing a whole story (idea 11) needs nothing here: the story page's address already has its
 *   link preview (server/link-preview.ts, S1-E4-04).
 * - Download my data includes finished_thanks; deleting the account deletes it.
 * Who calls it: the story page's Library row (src/features/library/), the story settings page
 *   (src/features/writing/) and the sharing cards (src/features/sharing/). What it calls: notify().
 */

/* ---------- A writer's own card colour (idea 10) ---------- */

alter table public.stories
  add column card_colour text,
  -- The board's nine palette colours (src/features/sharing/lib/quoteCard.ts); null is our default.
  add constraint stories_card_colour_on_palette check (
    card_colour is null
    or card_colour in ('plum', 'violet', 'gold', 'ink', 'lilac', 'blush', 'sky', 'sage', 'paper')
  );
comment on column public.stories.card_colour is
  'The palette colour new quote and picture cards for this story start in; null for our default (IDEAS-1c).';

/**
 * update_my_story: as in S1-E4-11, now also taking `card_colour` in `changes` (IDEAS-1c): a
 *   palette colour, or null for our default; left out, it keeps its current value.
 */
create or replace function public.update_my_story(story_slug text, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
  current_row public.stories;
  new_title text;
  new_blurb text;
  new_language text;
  new_category_slug text;
  new_category_id uuid;
  new_cover jsonb;
  new_labels jsonb;
begin
  -- Step 1: a signed-in writer who may write, and their own live story.
  if caller_id is null then
    raise exception 'Sign in to change a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  select * into current_row from public.stories where stories.id = target_story_id;

  -- Step 2: the basics: anything not in `changes` keeps its current value, then all are checked.
  new_title := regexp_replace(btrim(coalesce(changes ->> 'title', current_row.title)), '\s+', ' ', 'g');
  new_blurb := btrim(coalesce(changes ->> 'blurb', current_row.blurb));
  new_language := coalesce(changes ->> 'language_code', current_row.language_code);
  new_category_slug := coalesce(changes ->> 'category_slug',
    (select categories.slug from public.categories where categories.id = current_row.category_id));
  new_category_id := public.check_story_basics(new_title, new_blurb, new_language, new_category_slug);

  -- Step 3: the cover, when given; the labels, filled from the current row and checked together.
  new_cover := changes -> 'cover';
  if new_cover is not null then
    perform public.check_story_cover(new_cover);
  end if;
  new_labels := jsonb_build_object(
    'rating', current_row.rating, 'is_fan_fiction', current_row.is_fan_fiction, 'is_parody', current_row.is_parody,
    'deals_with_abuse_or_coercion', current_row.deals_with_abuse_or_coercion,
    'content_note', current_row.content_note, 'ai_disclosure', current_row.ai_disclosure
  ) || coalesce(changes -> 'labels', '{}'::jsonb);
  perform public.check_story_labels(new_labels);

  -- Step 4: save. The slug never changes (shared links survive a rename, S1-E3-01).
  update public.stories set
    title = new_title,
    blurb = new_blurb,
    language_code = new_language,
    category_id = new_category_id,
    completion_status = coalesce((changes ->> 'completion_status')::public.completion_status, completion_status),
    comments_enabled = coalesce((changes ->> 'comments_enabled')::boolean, comments_enabled),
    -- S1-E4-07: the writer's switch for quote cards.
    quote_cards_enabled = coalesce((changes ->> 'quote_cards_enabled')::boolean, quote_cards_enabled),
    -- S1-E4-11: the writer's switch for sharing the chapters' pictures.
    picture_sharing_enabled = coalesce((changes ->> 'picture_sharing_enabled')::boolean, picture_sharing_enabled),
    -- IDEAS-1c: the colour new quote and picture cards start in. Sent as null, it goes back to
    -- our default; left out, it stays. The column's check refuses anything off the palette.
    card_colour = case when changes ? 'card_colour' then changes ->> 'card_colour' else card_colour end,
    cover_kind = coalesce((new_cover ->> 'kind')::public.cover_kind, cover_kind),
    cover_design = case when new_cover is null then cover_design else new_cover ->> 'design' end,
    cover_background = case when new_cover is null then cover_background else new_cover ->> 'background' end,
    cover_accent = case when new_cover is null then cover_accent else new_cover ->> 'accent' end,
    cover_tall_path = case when new_cover is null then cover_tall_path else new_cover ->> 'tall_path' end,
    cover_square_path = case when new_cover is null then cover_square_path else new_cover ->> 'square_path' end,
    rating = (new_labels ->> 'rating')::public.story_rating,
    is_fan_fiction = (new_labels ->> 'is_fan_fiction')::boolean,
    is_parody = (new_labels ->> 'is_parody')::boolean,
    deals_with_abuse_or_coercion = (new_labels ->> 'deals_with_abuse_or_coercion')::boolean,
    content_note = btrim(coalesce(new_labels ->> 'content_note', '')),
    ai_disclosure = (new_labels ->> 'ai_disclosure')::public.ai_disclosure
  where stories.id = target_story_id;

  -- Step 5: the tags, when given.
  if changes ? 'tag_names' then
    if jsonb_array_length(changes -> 'tag_names') > 10 then
      raise exception 'A story can have at most 10 tags (S1-E3-01).' using errcode = 'check_violation';
    end if;
    perform public.set_story_tags(target_story_id, caller_id,
      array(select jsonb_array_elements_text(changes -> 'tag_names')));
  end if;

  return jsonb_build_object('outcome', 'ok');
end;
$$;
comment on function public.update_my_story(text, jsonb) is
  'Changes the writer''s own story: basics, cover, status, comments, quote cards, picture sharing, card colour, labels and tags (S1-E3-05, S1-E3-06, S1-E4-07, S1-E4-11, IDEAS-1c).';
revoke execute on function public.update_my_story(text, jsonb) from public, anon;
grant execute on function public.update_my_story(text, jsonb) to authenticated;

/**
 * share_options: as in S1-E4-11, now also with card_colour (IDEAS-1c): the writer's colour for
 *   new cards, or null for our default. Still all off for a visitor or a chapter the caller may
 *   not read, and card_colour is then null.
 * Inputs: story_slug, chapter_code.
 * Returns: {passages, pictures, card_colour}.
 * Errors: none. Flow: the reader's share bar, picture Share button and both card dialogs → this.
 */
create or replace function public.share_options(story_slug text, chapter_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  shared record;
  pictures_on boolean;
  colour text;
begin
  -- Step 1: a signed-in reader and a chapter they may read, or nothing at all.
  select * into shared from public.shareable_chapter(story_slug, chapter_code);
  if (select auth.uid()) is null or not found then
    return jsonb_build_object('passages', false, 'pictures', false, 'card_colour', null);
  end if;
  -- Step 2: the writer's picture switch (never for 16+ or 18+) and their card colour.
  select stories.picture_sharing_enabled and public.story_shares_content(stories.rating),
    stories.card_colour
    into pictures_on, colour
  from public.chapters join public.stories on stories.id = chapters.story_id
  where chapters.id = shared.chapter_id;
  return jsonb_build_object('passages', shared.quote_cards_enabled,
    'pictures', coalesce(pictures_on, false), 'card_colour', colour);
end;
$$;
comment on function public.share_options(text, text) is
  'Whether the caller may share passages and pictures from a chapter, and the writer''s card colour (S1-E4-11, IDEAS-1c).';

/* ---------- "I finished it" (idea 3) ---------- */

create table public.finished_thanks (
  id uuid primary key default gen_random_uuid(),
  -- The reader who said thanks (CLAUDE.md rule 15). The writer is the story's owner.
  user_id uuid not null references public.profiles (id),
  story_id uuid not null references public.stories (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Once per story (the idea's second criterion).
  constraint finished_thanks_once_a_story unique (user_id, story_id)
);
comment on table public.finished_thanks is
  'kind: user_action
A reader told a story''s writer they finished it, once per story (IDEAS-1c). No text is stored; the writer hears through a notification.';
create trigger finished_thanks_set_updated_at
  before update on public.finished_thanks
  for each row execute function public.set_updated_at();
alter table public.finished_thanks enable row level security;

-- Who: the reader. Why: which stories they thanked is theirs to see ("Sent" on the button); the
-- writer learns of it only through the notification. Writes go only through
-- send_finished_thanks().
create policy finished_thanks_select_own on public.finished_thanks
  for select to authenticated
  using (user_id = (select auth.uid()));
comment on policy finished_thanks_select_own on public.finished_thanks is
  'The reader reads their own thank-yous; nobody else (IDEAS-1c).';

grant select on public.finished_thanks to authenticated;

/**
 * story_library_state: as in S1-E4-03, now also with thanks_sent (IDEAS-1c): whether the caller
 *   already told the writer they finished it.
 * Input: story_slug. Returns: JSON {shelf, place, thanks_sent}, or null when the caller may not
 *   see the story. Signed out: {shelf: null, place: null, thanks_sent: false}.
 */
create or replace function public.story_library_state(story_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'shelf', (select library_entries.shelf from public.library_entries
      where library_entries.user_id = (select auth.uid()) and library_entries.story_id = story.id),
    'place', public.latest_place_json(story.id),
    'thanks_sent', exists (select 1 from public.finished_thanks
      where finished_thanks.user_id = (select auth.uid()) and finished_thanks.story_id = story.id))
  from public.reader_visible_story(story_slug) as story;
$$;
comment on function public.story_library_state(text) is
  'A story''s shelf in the caller''s library, their latest place in it and whether they thanked the writer (S1-E4-03, IDEAS-1c).';

/**
 * send_finished_thanks: tells a story's writer, in fixed kind words, that the caller finished it
 *   (idea IDEA-20261031-3).
 * Input: story_slug.
 * Returns: {outcome}: 'ok'; 'already_sent' the second time (once per story); 'not_finished'
 *   when the story isn't on the caller's Finished shelf; 'own_story' for the caller's own;
 *   'not_active' for an account that can't act yet; 'not_found' when the caller may not see the
 *   story (deleted, hidden, above their age or blocked either way).
 * Errors: insufficient_privilege when signed out.
 * Flow: the story page's "Tell the writer you finished it" → this → notify(), which skips a
 *   block as well, so nothing ever crosses one.
 */
create or replace function public.send_finished_thanks(story_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  story public.stories;
begin
  -- Step 1: a signed-in member who may act (the account gate, B02).
  if caller_id is null then
    raise exception 'Log in to thank a writer.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  -- Step 2: a story the caller may see, not their own, and on their Finished shelf.
  select * into story from public.reader_visible_story(story_slug);
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if story.user_id = caller_id then
    return jsonb_build_object('outcome', 'own_story');
  end if;
  if not exists (select 1 from public.library_entries
    where library_entries.user_id = caller_id and library_entries.story_id = story.id
      and library_entries.shelf = 'finished') then
    return jsonb_build_object('outcome', 'not_finished');
  end if;
  -- Step 3: once per story; a second press changes nothing.
  insert into public.finished_thanks (user_id, story_id) values (caller_id, story.id)
  on conflict on constraint finished_thanks_once_a_story do nothing;
  if not found then
    return jsonb_build_object('outcome', 'already_sent');
  end if;
  -- Step 4: the writer's notification: who and which story, never any text from the reader.
  perform public.notify(story.user_id, 'story_finished', caller_id,
    jsonb_build_object('story_id', story.id));
  return jsonb_build_object('outcome', 'ok');
end;
$$;
comment on function public.send_finished_thanks(text) is
  'Tells a story''s writer, in fixed words, that the caller finished it; once per story (IDEAS-1c).';
revoke execute on function public.send_finished_thanks(text) from public, anon;
grant execute on function public.send_finished_thanks(text) to authenticated;

/* ---------- Download my data and account deletion ---------- */

/**
 * data_export_tables: as in IDEAS-1b, plus finished_thanks (the stories the person thanked).
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
    ('consents', true, null),
    ('conversation_members', true, null),
    ('conversations', true, null),
    ('email_outbox', false, 'copies of notifications waiting to be emailed; the notifications themselves are included'),
    ('email_unsubscribe_keys', false, 'a secret key for the one-click unsubscribe link'),
    ('finished_thanks', true, null),
    ('follows_stories', true, null),
    ('follows_users', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
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
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile');
$$;

comment on function public.data_export_tables() is
  'Internal: which user tables Download my data includes, and why any is left out (S1-E13-02, S1-E13-03, IDEAS-1b, IDEAS-1c).';
revoke execute on function public.data_export_tables() from public, anon, authenticated;

/**
 * account_deletion_rules: as in IDEAS-1b, plus finished_thanks, deleted with the account.
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
    ('consents', 'kept', 0, 'proof of what the person agreed to (GDPR art. 7(1)); how long after deletion is OPEN for the lawyer'),
    ('conversation_members', 'own_step', 0, 'marked deleted for the person, so the chat goes once the other person deletes it too'),
    ('conversations', 'kept', 0, 'the other person''s chat; removed by the chat clean-up once they delete it (S1-E9-04)'),
    ('email_outbox', 'delete', 1, null),
    ('email_unsubscribe_keys', 'delete', 1, null),
    ('exports', 'delete', 1, null),
    ('finished_thanks', 'delete', 1, null),
    ('follows_stories', 'delete', 1, null),
    ('follows_users', 'own_step', 0, 'deleted both ways: whom the person followed and who followed them'),
    ('identity_link_requests', 'delete', 1, null),
    ('invites', 'kept', 0, 'invites staff made; purged 90 days after they expire (docs/retention.md)'),
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
    ('username_approvals', 'delete', 1, null);
$$;

comment on function public.account_deletion_rules() is
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03, IDEAS-1b, IDEAS-1c).';
revoke execute on function public.account_deletion_rules() from public, anon, authenticated;
