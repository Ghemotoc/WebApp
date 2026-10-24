-- Migration: ratings and labels (story S1-E3-06; architecture B13, B02; CLAUDE.md rule 18).
--
-- What it adds:
--   story_rating, ai_disclosure   the enums.
--   stories.rating                All ages, 13+, 16+, 18+; every story has one (the writer must
--                                 pick it before saving).
--   stories.is_fan_fiction, is_parody, deals_with_abuse_or_coercion, content_note,
--   ai_disclosure, ai_undisclosed_labelled_at
--   rating_allows(rating)         may the signed-in person (or a visitor) see a story with this
--                                 rating: the one rule every reader path calls (ADR 0004).
--   jobs                          the queue for things another story sends (statements of
--                                 reasons, S1-E10-04; notifications, S1-E7-01).
--   admin_raise_story_rating()    staff raise a rating, never lower it; logged; a statement of
--                                 reasons is queued.
--   admin_set_ai_undisclosed_label()  the "AI-written, not disclosed" label after confirmed
--                                 reports (the counting comes with S1-E10); logged; queued.
--   create_story(), update_my_story(), get_story_page()  take and serve the labels; the page
--                                 applies rating_allows().
-- Decisions:
--   - Ratings replace the Mature label; each is hidden from anyone younger (Q17, 16 Oct 2026),
--     enforced in the database through age_band() (CLAUDE.md rule 18).
--   - The rating wording on canvas 4.2 is used as written; it is a PROPOSAL pending the lawyer
--     (L14; Robert, 23 Oct 2026). The words live in src/locales/*/writing.json.
--   - A story dealing with abuse or coercion must be 16+ or 18+ and carries a content note
--     (17 Oct 2026, 10:36); 16 and 17-year-old characters' relationships with no sexual content
--     can be 13+ (17 Oct 2026, 11:53).
--   - 18+ in March: while adults_only is on, 18 or over by birth year is enough; once the flag is
--     off, the Yoti "18 or over" result is required. A proposal pending the lawyer (Robert,
--     23 Oct 2026, Q5).
--   - Signed-out visitors count as under 16: All ages and 13+ only. A proposal, L14 (Q6).
--   - Staff may raise a rating but never lower one (S1-E3-06); the AI label needs
--     ai_label_confirmed_reports (3, a setting) reports confirmed true, never a detector (Q24).

/* ---------- Enums ---------- */

/** story_rating: All ages, 13+, 16+, 18+ (Q17). */
create type public.story_rating as enum ('all_ages', '13_plus', '16_plus', '18_plus');
comment on type public.story_rating is 'All ages, 13+, 16+ or 18+; each hidden from anyone younger (Q17, rule 18).';

/** ai_disclosure: the writer's AI answer (Q24). */
create type public.ai_disclosure as enum ('no_ai', 'ai_brainstorming', 'partly_ai_written');
comment on type public.ai_disclosure is 'No AI, AI for brainstorming or outlining, or partly AI-written (Q24).';

/* ---------- Columns ---------- */

alter table public.stories
  add column rating public.story_rating,
  add column is_fan_fiction boolean not null default false,
  add column is_parody boolean not null default false,
  add column deals_with_abuse_or_coercion boolean not null default false,
  add column content_note text not null default '',
  add column ai_disclosure public.ai_disclosure not null default 'no_ai',
  -- Set only by staff after confirmed reports; shown as "AI-written, not disclosed" (Q24).
  add column ai_undisclosed_labelled_at timestamptz;

-- The seed stories (and any story made before this migration) start at All ages; from now on
-- the writer picks the rating and the column refuses null.
update public.stories set rating = 'all_ages' where rating is null;
alter table public.stories
  alter column rating set not null,
  add constraint stories_content_note_length check (char_length(content_note) <= 300),
  -- Abuse or coercion as a theme needs 16+ or 18+ and a content note (17 Oct 2026, 10:36).
  add constraint stories_abuse_needs_rating_and_note check (
    not deals_with_abuse_or_coercion
    or (rating in ('16_plus', '18_plus') and btrim(content_note) <> '')
  );

comment on column public.stories.rating is
  'All ages, 13+, 16+ or 18+; readers younger than it never see the story (Q17; rule 18; rating_allows()).';
comment on column public.stories.deals_with_abuse_or_coercion is
  'Abuse or coercion as a theme: must be 16+ or 18+ with a content note (17 Oct 2026).';
comment on column public.stories.ai_undisclosed_labelled_at is
  'When staff labelled the story "AI-written, not disclosed" after confirmed reports (Q24); never from a detector.';

insert into public.settings (key, value, is_public, description) values
  ('ai_label_confirmed_reports', '3'::jsonb, false,
   'Confirmed reports (from different accounts) before the "AI-written, not disclosed" label (S1-E3-06, proposal 3).');

/* ---------- The rating rule ---------- */

/**
 * rating_allows: may the caller see a story with this rating?
 * Input: story_rating. Returns: true when the caller's age group allows it:
 *   all_ages: everyone;  13_plus: 13 and over, and signed-out visitors (they count as under 16,
 *   a proposal, L14);  16_plus: 16 and over;  18_plus: 18 and over by year, and (once
 *   adults_only is off) with the Yoti "18 or over" result (a proposal pending the lawyer).
 * Where it fits: get_story_page(), get_chapter() (S1-E4-01a) and Discover's lists (S1-E5-01)
 * call it; the owner is exempt in those functions, not here (CLAUDE.md rule 18; ADR 0004).
 */
create or replace function public.rating_allows(story_rating public.story_rating)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  band public.age_band := public.age_band();
  check_result public.age_check_result;
begin
  -- Step 1: the two ratings every signed-in person and every visitor may see.
  if story_rating = 'all_ages' then
    return true;
  end if;
  if story_rating = '13_plus' then
    return band in ('13_to_15', '16_to_17', '18_plus', 'unknown');
  end if;
  -- Step 2: 16+ needs 16 and over (a visitor's band is 'unknown': no).
  if story_rating = '16_plus' then
    return band in ('16_to_17', '18_plus');
  end if;
  -- Step 3: 18+ needs 18 and over by year, and the Yoti result once the March flag is off.
  if band <> '18_plus' then
    return false;
  end if;
  if public.is_feature_enabled('adults_only') then
    return true;
  end if;
  select profiles.age_check_result into check_result
  from public.profiles where profiles.id = (select auth.uid());
  return check_result = '18_or_over';
end;
$$;

comment on function public.rating_allows(public.story_rating) is
  'May the caller see a story with this rating; the one rule every reader path uses (S1-E3-06, rule 18).';
grant execute on function public.rating_allows(public.story_rating) to anon, authenticated;

/* ---------- Checking the labels a writer sends ---------- */

/**
 * check_story_labels: the labels as the form sends them, checked and as columns.
 * Input: labels, a JSON object: rating (required), is_fan_fiction, is_parody,
 *   deals_with_abuse_or_coercion, content_note, ai_disclosure (required). Returns: nothing;
 *   the caller reads the values back with the ->> operators after this passes.
 * Errors: check_violation for a missing or unknown rating or AI answer, a content note over
 *   300 characters, or abuse/coercion without 16+/18+ and a note.
 * Internal: create_story() and update_my_story() call it.
 */
create or replace function public.check_story_labels(labels jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if labels ->> 'rating' is null or labels ->> 'rating' not in ('all_ages', '13_plus', '16_plus', '18_plus') then
    raise exception 'Pick a rating: All ages, 13+, 16+ or 18+ (S1-E3-06).' using errcode = 'check_violation';
  end if;
  if labels ->> 'ai_disclosure' is null
     or labels ->> 'ai_disclosure' not in ('no_ai', 'ai_brainstorming', 'partly_ai_written') then
    raise exception 'Say whether AI was used (S1-E3-06).' using errcode = 'check_violation';
  end if;
  if char_length(coalesce(labels ->> 'content_note', '')) > 300 then
    raise exception 'A content note can have at most 300 characters (S1-E3-06).' using errcode = 'check_violation';
  end if;
  if coalesce((labels ->> 'deals_with_abuse_or_coercion')::boolean, false)
     and not (labels ->> 'rating' in ('16_plus', '18_plus') and btrim(coalesce(labels ->> 'content_note', '')) <> '') then
    raise exception 'A story about abuse or coercion must be rated 16+ or 18+ and carry a content note (17 Oct 2026).'
      using errcode = 'check_violation';
  end if;
end;
$$;

comment on function public.check_story_labels(jsonb) is
  'Internal: refuses labels the rules don''t allow, with a plain message (S1-E3-06).';
revoke execute on function public.check_story_labels(jsonb) from public, anon, authenticated;

/* ---------- create_story() with labels ---------- */

drop function public.create_story(text, text, text, text, text[], jsonb, uuid);

/**
 * create_story: makes a new story for the signed-in writer.
 * Inputs: as before (S1-E3-01, S1-E3-13) plus labels: {rating, is_fan_fiction, is_parody,
 *   deals_with_abuse_or_coercion, content_note, ai_disclosure} (see check_story_labels()).
 * Returns and errors: as before; check_violation for labels the rules refuse, including a
 *   missing rating (the writer must pick one before saving, S1-E3-06).
 */
create or replace function public.create_story(
  title text,
  blurb text,
  language_code text,
  category_slug text,
  tag_names text[],
  cover jsonb,
  story_id uuid default null,
  labels jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  clean_title text := regexp_replace(btrim(coalesce(title, '')), '\s+', ' ', 'g');
  clean_blurb text := btrim(coalesce(blurb, ''));
  chosen_category_id uuid;
  new_story_id uuid := coalesce(story_id, gen_random_uuid());
  new_slug text;
begin
  -- Step 1: a signed-in person who may write (the account gate; every write checks it).
  if caller_id is null then
    raise exception 'Sign in to create a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;

  -- Step 2: the shared rules, the tags cap, the cover and the labels; an ID in use is never reused.
  chosen_category_id := public.check_story_basics(clean_title, clean_blurb, language_code, category_slug);
  if cardinality(coalesce(tag_names, '{}')) > 10 then
    raise exception 'A story can have at most 10 tags (S1-E3-01).' using errcode = 'check_violation';
  end if;
  perform public.check_story_cover(cover);
  perform public.check_story_labels(coalesce(labels, '{}'::jsonb));
  if exists (select 1 from public.stories where stories.id = new_story_id) then
    raise exception 'That story ID is already in use (S1-E3-13).' using errcode = 'check_violation';
  end if;

  -- Step 3: the row, with a fresh address; a one-in-two-billion clash just picks another.
  loop
    new_slug := public.story_slug_for(clean_title);
    exit when not exists (select 1 from public.stories where stories.slug = new_slug);
  end loop;
  insert into public.stories (
    id, user_id, slug, title, blurb, language_code, category_id,
    cover_kind, cover_design, cover_background, cover_accent, cover_tall_path, cover_square_path,
    rating, is_fan_fiction, is_parody, deals_with_abuse_or_coercion, content_note, ai_disclosure
  ) values (
    new_story_id, caller_id, new_slug, clean_title, clean_blurb, language_code, chosen_category_id,
    (cover ->> 'kind')::public.cover_kind, cover ->> 'design', cover ->> 'background', cover ->> 'accent',
    cover ->> 'tall_path', cover ->> 'square_path',
    (labels ->> 'rating')::public.story_rating,
    coalesce((labels ->> 'is_fan_fiction')::boolean, false),
    coalesce((labels ->> 'is_parody')::boolean, false),
    coalesce((labels ->> 'deals_with_abuse_or_coercion')::boolean, false),
    btrim(coalesce(labels ->> 'content_note', '')),
    (labels ->> 'ai_disclosure')::public.ai_disclosure
  );

  -- Step 4: the tags, merged and capped.
  perform public.set_story_tags(new_story_id, caller_id, tag_names);

  return jsonb_build_object('outcome', 'ok', 'slug', new_slug);
end;
$$;

comment on function public.create_story(text, text, text, text, text[], jsonb, uuid, jsonb) is
  'Makes a story for the signed-in writer with its labels: {outcome: ok, slug} or {outcome: not_active} (S1-E3-01, 13, 06).';
revoke execute on function public.create_story(text, text, text, text, text[], jsonb, uuid, jsonb) from public, anon;
grant execute on function public.create_story(text, text, text, text, text[], jsonb, uuid, jsonb) to authenticated;

/* ---------- update_my_story() with labels ---------- */

/**
 * update_my_story: as in S1-E3-05, now also taking a `labels` key in `changes` (the same shape
 * as create_story()'s labels; keys left out keep their current value). Staff-set labels
 * (ai_undisclosed_labelled_at) are never touched here.
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

/* ---------- The jobs queue ---------- */

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  -- What to do, for example 'statement_of_reasons_needed' (S1-E10-04) or 'chapter_published'
  -- (S1-E3-03, read by S1-E7-01).
  kind text not null,
  -- IDs and codes only: never user text, emails or IPs (CLAUDE.md rule 12).
  payload jsonb not null default '{}'::jsonb,
  run_after timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_kind_is_a_key check (kind ~ '^[a-z_]{2,60}$')
);

comment on table public.jobs is
  'kind: platform
Work queued for another story''s job or edge function (architecture B16); IDs only in the payload.';

create index jobs_unprocessed_idx on public.jobs (kind, run_after) where processed_at is null;

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;

/**
 * Policy jobs_select_staff: staff who may view the Stories area read the queue.
 * Why: moderators and admins check what is waiting (a statement of reasons to send); the
 * payloads hold IDs only. Nobody writes jobs through the API: functions queue them.
 */
create policy jobs_select_staff
  on public.jobs
  for select
  to authenticated
  using ((select public.staff_may('stories', 'view')));

comment on policy jobs_select_staff on public.jobs is
  'Allows staff with the Stories area to read the job queue; functions write it (S1-E3-06).';

revoke all on public.jobs from anon, authenticated;
grant select on public.jobs to authenticated;  -- jobs_select_staff

/* ---------- Staff: raise a rating, label undisclosed AI ---------- */

/**
 * admin_raise_story_rating: a moderator raises a story's rating after a report; never lowers it.
 * Inputs: target_story_id, new_rating, reason_given (required). Returns: the audit row's ID.
 * Errors: insufficient_privilege unless staff_may('story_changes', 'act'); check_violation for
 *   a rating equal to or lower than today's, or an empty reason; no_data_found for no such story.
 * What it does: updates the rating, writes audit_log in the same transaction and queues a
 *   'statement_of_reasons_needed' job for S1-E10-04, which tells the writer. Staff never lower a
 *   rating the writer chose (S1-E3-06).
 */
create or replace function public.admin_raise_story_rating(
  target_story_id uuid,
  new_rating public.story_rating,
  reason_given text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  story public.stories;
  audit_id uuid;
begin
  -- Step 1: a staff session with the Stories › change permission (architecture 1.8.3).
  if not public.staff_may('story_changes', 'act') then
    raise exception 'Only staff who may change stories can raise a rating.' using errcode = 'insufficient_privilege';
  end if;
  if btrim(coalesce(reason_given, '')) = '' then
    raise exception 'A reason is required.' using errcode = 'check_violation';
  end if;
  select * into story from public.stories where stories.id = target_story_id;
  if not found then
    raise exception 'No such story.' using errcode = 'no_data_found';
  end if;
  -- Step 2: only up, never down or sideways (the enum's order is the ratings' order).
  if new_rating <= story.rating then
    raise exception 'A rating can only be raised, never lowered (S1-E3-06).' using errcode = 'check_violation';
  end if;
  -- Step 3: change, log and queue the statement of reasons, all in one transaction.
  update public.stories set rating = new_rating where stories.id = target_story_id;
  audit_id := public.log_staff_action('story.rating_raised', 'stories', target_story_id::text, story.user_id,
    reason_given, jsonb_build_object('rating', story.rating), jsonb_build_object('rating', new_rating));
  insert into public.jobs (kind, payload) values ('statement_of_reasons_needed',
    jsonb_build_object('story_id', target_story_id, 'audit_log_id', audit_id, 'action', 'rating_raised'));
  return audit_id;
end;
$$;

comment on function public.admin_raise_story_rating(uuid, public.story_rating, text) is
  'Staff raise a story''s rating (never lower); logged; a statement of reasons is queued (S1-E3-06).';
revoke execute on function public.admin_raise_story_rating(uuid, public.story_rating, text) from public, anon;
grant execute on function public.admin_raise_story_rating(uuid, public.story_rating, text) to authenticated;

/**
 * admin_set_ai_undisclosed_label: labels a story "AI-written, not disclosed" after
 * ai_label_confirmed_reports reports were confirmed true (the counting is S1-E10's; this is the
 * action). Never from a detector score (Q24).
 * Inputs: target_story_id, reason_given. Returns: the audit row's ID. Errors: as above.
 * Queues a 'statement_of_reasons_needed' job (the writer's warning, S1-E10-04).
 */
create or replace function public.admin_set_ai_undisclosed_label(target_story_id uuid, reason_given text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  story public.stories;
  audit_id uuid;
begin
  if not public.staff_may('story_changes', 'act') then
    raise exception 'Only staff who may change stories can add this label.' using errcode = 'insufficient_privilege';
  end if;
  if btrim(coalesce(reason_given, '')) = '' then
    raise exception 'A reason is required.' using errcode = 'check_violation';
  end if;
  select * into story from public.stories where stories.id = target_story_id;
  if not found then
    raise exception 'No such story.' using errcode = 'no_data_found';
  end if;
  update public.stories set ai_undisclosed_labelled_at = now() where stories.id = target_story_id;
  audit_id := public.log_staff_action('story.ai_undisclosed_labelled', 'stories', target_story_id::text, story.user_id,
    reason_given, jsonb_build_object('ai_undisclosed_labelled_at', story.ai_undisclosed_labelled_at),
    jsonb_build_object('ai_undisclosed_labelled_at', now()));
  insert into public.jobs (kind, payload) values ('statement_of_reasons_needed',
    jsonb_build_object('story_id', target_story_id, 'audit_log_id', audit_id, 'action', 'ai_undisclosed_labelled'));
  return audit_id;
end;
$$;

comment on function public.admin_set_ai_undisclosed_label(uuid, text) is
  'Staff label a story "AI-written, not disclosed" after confirmed reports; logged; queued (S1-E3-06, Q24).';
revoke execute on function public.admin_set_ai_undisclosed_label(uuid, text) from public, anon;
grant execute on function public.admin_set_ai_undisclosed_label(uuid, text) to authenticated;

/* ---------- get_story_page() with the rating rule and the labels ---------- */

/**
 * get_story_page: as in S1-E3-05, now hidden from anyone younger than the story's rating
 * (rating_allows(); the owner is exempt) and serving the labels: rating, is_fan_fiction,
 * is_parody, deals_with_abuse_or_coercion, content_note, ai_disclosure, ai_undisclosed_labelled.
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

  -- Step 2: readers see it only once a chapter is published, if their age allows the rating
  -- (rule 18) and no moderator hid it.
  if not is_owner then
    if story.first_published_at is null then
      return null;
    end if;
    if not public.rating_allows(story.rating) then
      return null;
    end if;
    if public.is_moderated_away('story', story.id) then
      return null;
    end if;
  end if;

  -- Step 3: the page, with the writer's pen name or username and never the user ID.
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
      where story_tags.story_id = story.id), '[]'::jsonb),
    'completion_status', story.completion_status,
    'comments_enabled', story.comments_enabled,
    'cover', jsonb_build_object('kind', story.cover_kind, 'design', story.cover_design,
      'background', story.cover_background, 'accent', story.cover_accent),
    'labels', jsonb_build_object('rating', story.rating, 'is_fan_fiction', story.is_fan_fiction,
      'is_parody', story.is_parody, 'deals_with_abuse_or_coercion', story.deals_with_abuse_or_coercion,
      'content_note', story.content_note, 'ai_disclosure', story.ai_disclosure,
      'ai_undisclosed_labelled', story.ai_undisclosed_labelled_at is not null),
    'writer', (select jsonb_build_object('display_name', public.display_name(profiles.handle, profiles.pen_name),
      'handle', profiles.handle) from public.profiles where profiles.id = story.user_id),
    'first_published_at', story.first_published_at,
    'last_chapter_published_at', story.last_chapter_published_at,
    'chapters', '[]'::jsonb,
    'is_owner', is_owner
  );
end;
$$;
