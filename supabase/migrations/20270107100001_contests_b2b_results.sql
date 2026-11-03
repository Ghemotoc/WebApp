/*
 * Migration: judging, publishing results and sending prizes (bundle CONTESTS, part b2b; story
 * S1-E11-15 criteria 7, 8 and 10).
 *
 * What it adds:
 * - contest_entries.award (winner or finalist), prize_sent_at and prize_parent_consent: the
 *   result staff chose and whether the prize went out, never the delivery details themselves
 *   (CLAUDE.md rule 5: no addresses or legal names are stored);
 * - contests.results_published_at;
 * - admin_set_contest_placing(): owner and admins choose winners and finalists once entries close.
 *   Judges are our staff plus any named partner judges who tell staff their choice; there is no
 *   public vote and the sponsor has no say (criterion 7, proposal);
 * - admin_publish_contest_results(): needs at least one winner; the landing page then shows the
 *   winners and finalists by pen name only, never age, school or real name (criterion 8);
 * - admin_mark_contest_prize_sent(): for a winner under 16, staff must confirm that a parent's or
 *   guardian's consent for the delivery details is on file (criterion 10, proposal; GDPR art. 8);
 * - contest_results_json() and landing_page() returning it as results;
 * - admin_contest_entries() also returns placing, prize_sent_at and needs_parent_consent.
 * Who calls it: src/features/contests/ (Staff › Contests) and src/features/landing-pages/ (the
 * results on /c/<name>).
 * What comes next: certificates for participants, finalists and winners (part 13b2c).
 */

/* ---------- 1. The columns ---------- */

alter table public.contest_entries
  -- The result staff chose: winner, finalist or none (a participant).
  add column award text,
  -- When staff marked the prize as sent. The address or other delivery details are never stored;
  -- they travel by email outside the app.
  add column prize_sent_at timestamptz,
  -- Criterion 10: for a winner under 16, staff confirmed that a parent's or guardian's consent for
  -- the delivery details is on file before sending (proposal).
  add column prize_parent_consent boolean not null default false,
  add constraint contest_entries_award_is_known check (award is null or award in ('winner', 'finalist')),
  add constraint contest_entries_prize_only_for_winners check (prize_sent_at is null or award = 'winner');

alter table public.contests
  -- When an admin published the results on the landing page (criterion 8).
  add column results_published_at timestamptz;

comment on column public.contest_entries.award is
  'The result staff chose for the entry: winner, finalist or null for a participant (S1-E11-15 criterion 7).';
comment on column public.contests.results_published_at is
  'When the results went public on the landing page (S1-E11-15 criterion 8).';

/* ---------- 2. Choosing winners and finalists ---------- */

/**
 * contest_entries_have_closed: true once the contest's last entry day is over, in Romanian time.
 * Internal. Input: the contest. Returns: boolean.
 */
create or replace function public.contest_entries_have_closed(target public.contests)
returns boolean
language sql
stable
set search_path = ''
as $$
  select target.opened_at is not null and target.entries_close_on < public.romania_today();
$$;
revoke execute on function public.contest_entries_have_closed(public.contests) from public, anon, authenticated;

/**
 * admin_set_contest_placing: marks a valid entry as winner, finalist or neither (criterion 7).
 * Inputs: target_entry_id; wanted_placing, 'winner', 'finalist' or null for none.
 * Returns: nothing.
 * Errors (with hints): insufficient_privilege (not owner or admin); no_data_found (no_entry);
 *   check_violation (bad_placing, not_valid: only a valid entry places, entries_open: judging
 *   starts once entries close).
 * Where it fits: the Placing control in ContestEntriesSection. Logged with before and after.
 */
create or replace function public.admin_set_contest_placing(target_entry_id uuid, wanted_placing text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.contest_entries;
  target public.contests;
begin
  -- Step 1: owner or admin, a known placing and a valid entry.
  perform public.require_contest_staff();
  if wanted_placing is not null and wanted_placing not in ('winner', 'finalist') then
    raise exception 'A placing is winner, finalist or none.' using errcode = 'check_violation', hint = 'bad_placing';
  end if;
  select * into entry from public.contest_entries where id = target_entry_id for update;
  if entry.id is null then
    raise exception 'There is no such entry.' using errcode = 'no_data_found', hint = 'no_entry';
  end if;
  if entry.status <> 'valid' then
    raise exception 'Only a valid entry can place.' using errcode = 'check_violation', hint = 'not_valid';
  end if;
  -- Step 2: judging starts once entries close, so nobody is placed while others can still enter.
  select * into target from public.contests where id = entry.contest_id;
  if not public.contest_entries_have_closed(target) then
    raise exception 'Choose results once entries close.' using errcode = 'check_violation', hint = 'entries_open';
  end if;
  -- Step 3: the placing, then the audit row.
  update public.contest_entries set award = wanted_placing where id = entry.id;
  perform public.log_staff_action('contest.placing_set', 'contests', entry.id::text, entry.user_id, null,
    jsonb_build_object('placing', entry.award), jsonb_build_object('placing', wanted_placing, 'contest_id', target.id));
end;
$$;

comment on function public.admin_set_contest_placing(uuid, text) is
  'Owner and admins: mark a contest entry as winner, finalist or neither, once entries close (S1-E11-15 criterion 7).';
revoke execute on function public.admin_set_contest_placing(uuid, text) from public, anon;
grant execute on function public.admin_set_contest_placing(uuid, text) to authenticated;

/**
 * admin_publish_contest_results: puts the results on the contest's landing page (criterion 8).
 * Inputs: target_contest_id. Returns: nothing.
 * Errors (with hints): insufficient_privilege; no_data_found (no_contest); check_violation
 *   (entries_open, no_winner, already_published).
 * After this, a change of placing shows on the page at once; staff can still correct a mistake.
 */
create or replace function public.admin_publish_contest_results(target_contest_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.contests;
begin
  -- Step 1: owner or admin, a closed contest, not published yet.
  perform public.require_contest_staff();
  select * into target from public.contests where id = target_contest_id for update;
  if target.id is null then
    raise exception 'There is no such contest.' using errcode = 'no_data_found', hint = 'no_contest';
  end if;
  if not public.contest_entries_have_closed(target) then
    raise exception 'Publish results once entries close.' using errcode = 'check_violation', hint = 'entries_open';
  end if;
  if target.results_published_at is not null then
    raise exception 'The results are already published.' using errcode = 'check_violation', hint = 'already_published';
  end if;
  -- Step 2: at least one winner, or there is nothing to announce.
  if not exists (select 1 from public.contest_entries as entries
                 where entries.contest_id = target.id and entries.status = 'valid' and entries.award = 'winner') then
    raise exception 'Choose at least one winner first.' using errcode = 'check_violation', hint = 'no_winner';
  end if;
  -- Step 3: publish, then the audit row.
  update public.contests set results_published_at = now() where id = target.id;
  perform public.log_staff_action('contest.results_published', 'contests', target.id::text, null, null,
    null, jsonb_build_object('results_published', true));
end;
$$;

comment on function public.admin_publish_contest_results(uuid) is
  'Owner and admins: publish a closed contest''s winners and finalists on its landing page (S1-E11-15 criterion 8).';
revoke execute on function public.admin_publish_contest_results(uuid) from public, anon;
grant execute on function public.admin_publish_contest_results(uuid) to authenticated;

/* ---------- 3. Sending a prize ---------- */

/**
 * admin_mark_contest_prize_sent: records that a winner's prize went out (criterion 10).
 * Inputs: target_entry_id; parent_consent_on_file, true when staff confirm a parent's or
 *   guardian's consent for the delivery details is on file. Returns: nothing.
 * Errors (with hints): insufficient_privilege; no_data_found (no_entry); check_violation
 *   (not_a_winner, not_published: results first, already_sent, parent_consent_needed: the winner
 *   is under 16, or their age is unknown, and the consent isn't confirmed).
 * Why: GDPR art. 8 and the story's legal notes; the proposal is that nothing goes to a child's
 *   address without a parent's or guardian's agreement. The details themselves stay outside the
 *   app, so nothing but the date and the confirmation is stored.
 */
create or replace function public.admin_mark_contest_prize_sent(target_entry_id uuid, parent_consent_on_file boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.contest_entries;
  needs_parent boolean;
begin
  -- Step 1: owner or admin, a valid winner of a contest whose results are out, not sent yet.
  perform public.require_contest_staff();
  select * into entry from public.contest_entries where id = target_entry_id for update;
  if entry.id is null then
    raise exception 'There is no such entry.' using errcode = 'no_data_found', hint = 'no_entry';
  end if;
  if entry.status <> 'valid' or entry.award is distinct from 'winner' then
    raise exception 'Only a winner gets a prize.' using errcode = 'check_violation', hint = 'not_a_winner';
  end if;
  if not exists (select 1 from public.contests where contests.id = entry.contest_id and contests.results_published_at is not null) then
    raise exception 'Publish the results first.' using errcode = 'check_violation', hint = 'not_published';
  end if;
  if entry.prize_sent_at is not null then
    raise exception 'This prize is already marked as sent.' using errcode = 'check_violation', hint = 'already_sent';
  end if;
  -- Step 2: under 16, or not known, needs the parent's or guardian's consent on file (criterion 10).
  needs_parent := public.age_band_of(entry.user_id) not in ('16_to_17', '18_plus');
  if needs_parent and not coalesce(parent_consent_on_file, false) then
    raise exception 'Confirm the parent''s or guardian''s consent first.' using errcode = 'check_violation', hint = 'parent_consent_needed';
  end if;
  -- Step 3: the date and the confirmation, then the audit row.
  update public.contest_entries
  set prize_sent_at = now(), prize_parent_consent = needs_parent and coalesce(parent_consent_on_file, false)
  where id = entry.id;
  perform public.log_staff_action('contest.prize_sent', 'contests', entry.id::text, entry.user_id, null,
    null, jsonb_build_object('parent_consent_on_file', needs_parent and coalesce(parent_consent_on_file, false)));
end;
$$;

comment on function public.admin_mark_contest_prize_sent(uuid, boolean) is
  'Owner and admins: record that a winner''s prize was sent; under 16 needs the parent''s consent on file (S1-E11-15 criterion 10).';
revoke execute on function public.admin_mark_contest_prize_sent(uuid, boolean) from public, anon;
grant execute on function public.admin_mark_contest_prize_sent(uuid, boolean) to authenticated;

/* ---------- 4. The results on the landing page ---------- */

/**
 * contest_results_json: the published results of the contest on one landing page, for the visitor.
 * Internal. Input: the page's ID and its live content.
 * Returns: null when the page has no contest or its results aren't published; otherwise
 *   [{placing, pen_name, story}] with winners first. Only the pen name (or the username when there
 *   is none), never age, school or real name (criterion 8). story is {slug, title} only when the
 *   visitor may see it in a public list (listed_stories(): moderation, blocks, the visitor's
 *   rating) and its rating suits the page's youngest readers; otherwise null and only the name shows.
 */
create or replace function public.contest_results_json(target_page_id uuid, content jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when contests.results_published_at is null then null else coalesce((
    select jsonb_agg(jsonb_build_object(
        'placing', entries.award,
        'pen_name', public.display_name(profiles.handle, profiles.pen_name),
        'story', (select jsonb_build_object('slug', listed.slug, 'title', listed.title)
                  from public.listed_stories('updated', null, null, null, null) as listed
                  where listed.id = entries.story_id
                    and listed.rating = any (public.landing_youngest_ratings(content)))
      ) order by entries.award desc, profiles.handle)
    from public.contest_entries as entries
    join public.profiles on profiles.id = entries.user_id
    where entries.contest_id = contests.id and entries.status = 'valid' and entries.award is not null
  ), '[]'::jsonb) end
  from public.contests
  where contests.landing_page_id = target_page_id;
$$;

comment on function public.contest_results_json(uuid, jsonb) is
  'Internal: a contest''s published winners and finalists by pen name, for its landing page (S1-E11-15 criterion 8).';
revoke execute on function public.contest_results_json(uuid, jsonb) from public, anon, authenticated;

/**
 * landing_page: as in part a2b, plus results: the contest's published winners and finalists
 * (contest_results_json()), or null. Inputs: page_slug. Returns: the page's JSON or null.
 */
create or replace function public.landing_page(page_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', pages.slug,
    'type', pages.page_type,
    'state', case when live.take_down_on is not null and live.take_down_on <= public.romania_today()
                  then 'ended' else 'live' end,
    'show_from', live.show_from,
    'take_down_on', live.take_down_on,
    'content', live.content,
    -- Part a2a: the pictures visitors may see, and each Featured stories block's story cards.
    'pictures', public.landing_page_pictures(live.content),
    'featured', public.landing_featured_cards(live.content),
    -- Part a2b: the Remind me block's state for this reader (null when the page has none).
    'reminder', public.landing_reminder_json(pages.id, live.content),
    -- Contests part b2b: the published results (null until then, or on a page without a contest).
    'results', public.contest_results_json(pages.id, live.content))
  from public.landing_pages as pages
  cross join lateral public.landing_page_live_version(pages.id) as live
  where pages.slug = lower(btrim(page_slug)) and pages.archived_at is null and live.id is not null;
$$;

/* ---------- 5. The staff list shows placings and prizes ---------- */

/**
 * admin_contest_entries: as in part b2a, plus placing, prize_sent_at and
 * needs_parent_consent (the writer is under 16 or their age is unknown, criterion 10).
 * Errors: insufficient_privilege when the caller isn't owner or admin.
 */
create or replace function public.admin_contest_entries(target_contest_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Step 1: only the owner and admins run contests.
  perform public.require_contest_staff();
  -- Step 2: the entries, with only what judging needs to know about the writer.
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
        'id', entries.id,
        'pen_name', public.display_name(profiles.handle, profiles.pen_name),
        'age_group', public.age_band_of(entries.user_id),
        'story_title', stories.title,
        'story_slug', stories.slug,
        'rating', stories.rating,
        'words', (select coalesce(sum(chapters.published_word_count), 0) from public.chapters
                  where chapters.story_id = stories.id and chapters.status = 'published'
                    and chapters.deleted_at is null),
        'entered_at', entries.entered_at,
        'status', entries.status,
        'statement_reference', statements.reference,
        'placing', entries.award,
        'prize_sent_at', entries.prize_sent_at,
        'needs_parent_consent', public.age_band_of(entries.user_id) not in ('16_to_17', '18_plus')
      ) order by entries.entered_at desc), '[]'::jsonb)
    from public.contest_entries as entries
    join public.profiles on profiles.id = entries.user_id
    join public.stories on stories.id = entries.story_id
    left join public.statements_of_reasons as statements on statements.id = entries.statement_id
    where entries.contest_id = target_contest_id
  );
end;
$$;
