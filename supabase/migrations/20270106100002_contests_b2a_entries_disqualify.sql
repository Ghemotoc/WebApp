/*
 * Migration: the entries list for staff and disqualifying an entry (bundle CONTESTS, part b2a;
 * story S1-E11-15 criteria 5 and 6).
 *
 * What it adds:
 * - contest_entries gains disqualified_at, disqualified_by_user_id and statement_id, so a
 *   disqualified entry points at the statement of reasons the writer got;
 * - admin_contest_entries(): one contest's entries for owner and admins, by pen name and age group
 *   only (never the year of birth), with the story's title, rating and published words, the date
 *   and the status (criterion 5). Staff never edit an entry's words (architecture 1.8.5);
 * - admin_disqualify_contest_entry(): a reason is required; the writer gets a statement of reasons
 *   (S1-E10-04) and can appeal it (S1-E10-07) (criterion 6);
 * - decider_of_statement() and undo_decision_for_appeal() learn about contest entries: the admin
 *   who disqualified decided, and an overturned appeal makes the entry valid again;
 * - contest_entry_options() also returns a disqualified entry, so the writer's story card says so
 *   and points to the decision instead of offering to enter again.
 * Who calls it: src/features/contests/ (Staff › Contests and the story settings card).
 * What comes next: results and certificates (part 13b2b).
 */

/* ---------- 1. The entry remembers its disqualification ---------- */

alter table public.contest_entries
  -- When staff disqualified it; cleared if an appeal overturns the decision.
  add column disqualified_at timestamptz,
  -- The admin who decided, so a different moderator decides the appeal (S1-E10-07 criterion 2).
  add column disqualified_by_user_id uuid references public.profiles (id) on delete set null,
  -- The statement of reasons the writer got (DSA art. 17). Kept after an overturned appeal as
  -- the record of what happened.
  add column statement_id uuid references public.statements_of_reasons (id) on delete set null,
  add constraint contest_entries_disqualified_has_a_time
    check ((status = 'disqualified') = (disqualified_at is not null));

comment on column public.contest_entries.statement_id is
  'The statement of reasons sent when staff disqualified the entry (S1-E11-15 criterion 6).';

create index contest_entries_by_statement on public.contest_entries (statement_id);

/* ---------- 2. The entries list for staff ---------- */

/**
 * admin_contest_entries: every entry in one contest, for judging and checking (criterion 5).
 * Inputs: target_contest_id. Returns: a JSON array, newest first: id, pen_name (the pen name, or
 *   the username when there is none), age_group (never the year of birth), story_title,
 *   story_slug, rating, words (published chapters), entered_at, status (valid, withdrawn,
 *   disqualified) and statement_reference (the statement sent when it was disqualified).
 *   Never the writer's user ID.
 * Errors: insufficient_privilege when the caller isn't owner or admin (require_contest_staff()).
 * Where it fits: ContestEntriesSection in the contest's editor.
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
        'statement_reference', statements.reference
      ) order by entries.entered_at desc), '[]'::jsonb)
    from public.contest_entries as entries
    join public.profiles on profiles.id = entries.user_id
    join public.stories on stories.id = entries.story_id
    left join public.statements_of_reasons as statements on statements.id = entries.statement_id
    where entries.contest_id = target_contest_id
  );
end;
$$;

comment on function public.admin_contest_entries(uuid) is
  'Owner and admins: one contest''s entries by pen name and age group only (S1-E11-15 criterion 5).';
revoke execute on function public.admin_contest_entries(uuid) from public, anon;
grant execute on function public.admin_contest_entries(uuid) to authenticated;

/* ---------- 3. Disqualifying an entry ---------- */

/**
 * admin_disqualify_contest_entry: disqualifies an entry that breaks the contest's rules
 * (criterion 6).
 * Inputs: target_entry_id; reason, the facts in staff's words to the writer (1 to 2,000
 *   characters, required). Returns: the statement's reference, for example S-000123.
 * Errors (each with a hint the screen turns into words): insufficient_privilege (not owner or
 *   admin); no_data_found (no_entry); check_violation (reason_needed, not_valid: only a valid
 *   entry can be disqualified).
 * What happens: the entry becomes Disqualified, the writer gets a statement of reasons resting on
 *   the contest's rules (DSA art. 17) with a notification, they can appeal it for six months
 *   (S1-E10-07), and the audit log keeps who did it and why.
 */
create or replace function public.admin_disqualify_contest_entry(target_entry_id uuid, reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.contest_entries;
  clean_reason text := btrim(coalesce(reason, ''));
  new_statement_id uuid;
begin
  -- Step 1: only the owner and admins, and only a valid entry.
  perform public.require_contest_staff();
  select * into entry from public.contest_entries where id = target_entry_id for update;
  if entry.id is null then
    raise exception 'There is no such entry.' using errcode = 'no_data_found', hint = 'no_entry';
  end if;
  if entry.status <> 'valid' then
    raise exception 'Only a valid entry can be disqualified.' using errcode = 'check_violation', hint = 'not_valid';
  end if;
  -- Step 2: a reason is required, because the writer reads it (DSA art. 17(3)(b)).
  if clean_reason = '' or char_length(clean_reason) > 2000 then
    raise exception 'Write the reason, in at most 2,000 characters.' using errcode = 'check_violation', hint = 'reason_needed';
  end if;
  -- Step 3: the statement of reasons, which also notifies the writer.
  new_statement_id := public.issue_statement_of_reasons(entry.user_id, 'contest_disqualified', 'terms',
    'contest_rules', clean_reason,
    jsonb_build_object('story_id', entry.story_id, 'item_type', 'story', 'item_id', entry.story_id));
  -- Step 4: the entry, then the audit row.
  update public.contest_entries
  set status = 'disqualified', disqualified_at = now(), disqualified_by_user_id = (select auth.uid()),
      statement_id = new_statement_id
  where id = entry.id;
  perform public.log_staff_action('contest.entry_disqualified', 'contests', entry.id::text, entry.user_id,
    clean_reason, jsonb_build_object('status', 'valid'),
    jsonb_build_object('status', 'disqualified', 'contest_id', entry.contest_id));
  return (select statements.reference from public.statements_of_reasons as statements
          where statements.id = new_statement_id);
end;
$$;

comment on function public.admin_disqualify_contest_entry(uuid, text) is
  'Owner and admins: disqualify a contest entry with a reason and a statement of reasons (S1-E11-15 criterion 6).';
revoke execute on function public.admin_disqualify_contest_entry(uuid, text) from public, anon;
grant execute on function public.admin_disqualify_contest_entry(uuid, text) to authenticated;

/* ---------- 4. Appeals know about contest entries ---------- */

/**
 * decider_of_statement: as in S1-E10-07 (the case's decider, or the sanction's), plus the admin
 * who disqualified a contest entry, so a different moderator decides that appeal where possible.
 * Internal.
 */
create or replace function public.decider_of_statement(target public.statements_of_reasons)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select cases.decided_by_user_id from public.cases where cases.id = target.case_id),
    (select sanctions.applied_by_user_id from public.sanctions where sanctions.id = target.sanction_id),
    (select entries.disqualified_by_user_id from public.contest_entries as entries
     where entries.statement_id = target.id));
$$;

/**
 * undo_decision_for_appeal: as in S1-E10-07 (restore the case's items, lift its sanctions, show a
 * removed picture again), plus: a contest entry disqualified with this statement is valid again
 * (S1-E11-15 criterion 6). The writer can't have entered another story meanwhile, because a
 * disqualified entry still holds their one place (contest_entries_one_per_writer). Internal.
 */
create or replace function public.undo_decision_for_appeal(statement public.statements_of_reasons, appeal_reference text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reason_given text := format('Appeal %s overturned the decision.', appeal_reference);
  item_id uuid;
  sanction_id uuid;
  picture public.picture_checks;
begin
  -- Step 1: the items the case hid or removed come back.
  for item_id in
    select moderated_items.id from public.moderated_items
    where moderated_items.case_id = statement.case_id and moderated_items.restored_at is null
  loop
    perform public.admin_restore_item(item_id, reason_given);
  end loop;
  -- Step 2: the case's sanctions, or the statement's own sanction, are lifted.
  for sanction_id in
    select sanctions.id from public.sanctions
    where (sanctions.case_id = statement.case_id or sanctions.id = statement.sanction_id)
      and sanctions.lifted_at is null
  loop
    perform public.admin_lift_sanction(sanction_id, reason_given);
  end loop;
  -- Step 3: a removed picture is approved and shows again (S1-E10-05).
  update public.picture_checks set status = 'approved'
  where picture_checks.case_id = statement.case_id and picture_checks.status = 'removed'
  returning * into picture;
  if picture.id is not null then
    perform public.show_passed_avatar(picture);
  end if;
  -- Step 4: a disqualified contest entry is valid again (S1-E11-15).
  update public.contest_entries
  set status = 'valid', disqualified_at = null, disqualified_by_user_id = null
  where contest_entries.statement_id = statement.id and contest_entries.status = 'disqualified';
end;
$$;

/* ---------- 5. The writer's card sees a disqualified entry ---------- */

/**
 * contest_entry_options: as in part 13b1, but entry is the writer's valid or disqualified entry
 * (a disqualified one still holds their one place), with status and, when disqualified,
 * statement_reference, so the card points to the decision and the appeal.
 * Inputs: story_slug, the writer's own story. Returns: a JSON array, one item per open contest
 *   that takes entries today and fits the writer: id, name_ro, name_en, page_slug, closes_on,
 *   word_limit, entry ({story_slug, story_title, is_this_story, status, statement_reference} or
 *   null) and problems (why THIS story can't enter, or not_active). Empty for anyone else's story.
 */
create or replace function public.contest_entry_options(story_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', contests.id,
      'name_ro', contests.name_ro,
      'name_en', contests.name_en,
      'page_slug', pages.slug,
      'closes_on', contests.entries_close_on,
      'word_limit', contests.word_limit,
      'entry', (
        select jsonb_build_object('story_slug', entered.slug, 'story_title', entered.title,
                                  'is_this_story', entered.id = story.id, 'status', entries.status,
                                  'statement_reference', statements.reference)
        from public.contest_entries as entries
        join public.stories as entered on entered.id = entries.story_id
        left join public.statements_of_reasons as statements on statements.id = entries.statement_id
        where entries.contest_id = contests.id and entries.user_id = (select auth.uid())
          and entries.status in ('valid', 'disqualified')
      ),
      'problems', case when public.is_active_member() then to_jsonb(public.contest_story_problems(contests, story))
                       else '["not_active"]'::jsonb end
    ) order by contests.entries_close_on, contests.name_en), '[]'::jsonb)
  from public.stories as story
  cross join public.contests
  join public.landing_pages as pages on pages.id = contests.landing_page_id
  -- Only the writer's own live story, and only contests that take this writer's entry today.
  where story.slug = story_slug and story.user_id = (select auth.uid()) and story.deleted_at is null
    and public.contest_takes_entries_today(contests) and public.contest_writer_fits(contests);
$$;
