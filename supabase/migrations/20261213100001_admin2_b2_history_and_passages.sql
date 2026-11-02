-- Migration: a story's version history, Restore and removing a passage (bundle ADMIN-2, part b2;
-- story S1-E11-08, part 08b; screen 8.11; architecture 1.8.4 and 1.8.5).
-- What it adds:
--   story_revisions.restores_revision_id  a restore points to the change it undid
--   story_revisions change kind 'passage' a passage removed from a chapter, or put back
--   setting removed_passage_marker        "[Removed by the moderation team]" in each language
--   removed_passages                      the original words of a removed passage, for staff only
--   admin_chapter_text()                  a published chapter's words, read-only, for staff who
--                                         may change stories (they select the passage in it)
--   admin_remove_chapter_passage()        cuts one exact passage out and puts the marker in its place
--   admin_restore_story_revision()        brings back what one change replaced, as a new version
--   admin_removed_passage()               shows staff a removed passage's words, and logs the read
--   admin_story_overview()                now also carries the version history
-- The rules (decided 16 Oct 2026, late evening, Q14; architecture 1.8.5): staff never edit the
-- writer's words. Removing an unlawful passage or someone's personal data is the one cut they may
-- make, and it leaves a visible marker; the rest of the chapter is untouched. The original stays
-- with the version, readable only by staff who may change stories (and, for a safeguarding case,
-- only with the safeguarding permission). How long it is kept is OPEN (story S1-E11-08; proposal:
-- as long as its case), so no job deletes it yet (CLAUDE.md rule 13).
-- Who may change (architecture 1.8.3): owner, admin and moderator (staff_may('story_changes')).
-- Called by: src/features/staff/api/staffStoryChanges.ts and api/staffStoryHistory.ts.

/* ---------- 1. Versions: a passage kind and the link from a restore ---------- */

alter table public.story_revisions
  drop constraint story_revisions_change_kind_is_known,
  add constraint story_revisions_change_kind_is_known
    check (change_kind in ('settings', 'visibility', 'chapter_visibility', 'passage')),
  -- Set on a version made by Restore: the earlier change whose "before" it brought back.
  add column restores_revision_id uuid references public.story_revisions (id) on delete set null,
  -- The moment each version is written, not the transaction's start, so two versions made in one
  -- go (a Restore, or a test) still list in the order they happened.
  alter column created_at set default clock_timestamp();

comment on column public.story_revisions.restores_revision_id is
  'For a version made by Restore: the earlier change it undid (S1-E11-08 criterion "Restore").';

/* ---------- 2. The marker, in each language ---------- */

-- The words that take a removed passage's place, in the story's own language. They live in the
-- settings, not in code, so staff can change them from Settings (S1-E11-03) and a new language
-- needs no release (CLAUDE.md rule 4). Board 8.11 and S1-E11-08: "[Removed by the moderation team]".
insert into public.settings (key, value, is_public, description) values
  ('removed_passage_marker',
   jsonb_build_object('ro', '[Eliminat de echipa de moderare]', 'en', '[Removed by the moderation team]'),
   false,
   'The words that replace a passage staff removed from a chapter, by story language; English when the story''s language has none (S1-E11-08).')
on conflict (key) do nothing;

/**
 * removed_passage_marker: the marker for a story's language.
 * Input: language_code. Returns: text; the English marker when the language has none.
 * Internal: admin_remove_chapter_passage() and the put-back step.
 */
create or replace function public.removed_passage_marker(language_code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.setting_value('removed_passage_marker') ->> language_code,
    public.setting_value('removed_passage_marker') ->> 'en',
    '[Removed by the moderation team]');
$$;
comment on function public.removed_passage_marker(text) is
  'Internal: the words that replace a removed passage, in the story''s language (S1-E11-08).';
revoke execute on function public.removed_passage_marker(text) from public, anon, authenticated;

/* ---------- 3. The originals of removed passages ---------- */

create table public.removed_passages (
  id uuid primary key default gen_random_uuid(),
  -- The writer whose chapter it was (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  story_id uuid not null references public.stories (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  -- The version that removed it.
  story_revision_id uuid not null unique references public.story_revisions (id) on delete cascade,
  -- The case it was removed for, when staff named one.
  case_id uuid references public.cases (id) on delete set null,
  -- Copied from the case, so the read policy needs no lookup in cases (whose own policy would
  -- hide a safeguarding case from the very staff this check is about).
  case_is_safeguarding boolean not null default false,
  removed_by_user_id uuid not null references public.profiles (id),
  -- The writer's original words (S1-E11-08: "the original stays in the version history").
  removed_text text not null constraint removed_passages_text_is_written
    check (removed_text <> '' and char_length(removed_text) <= 20000),
  -- Where the marker starts in the published chapter, counted in characters from 1, and the
  -- marker itself, so Restore can find it again.
  marker_starts_at integer not null constraint removed_passages_marker_place_positive
    check (marker_starts_at >= 1),
  marker text not null,
  -- Set when Restore put the words back.
  put_back_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.removed_passages is
  'kind: staff
The original words of a passage staff removed from a chapter (S1-E11-08): readable only by staff who may change stories, safeguarding ones only with that permission. Kept as long as its case: OPEN (story S1-E11-08), so nothing deletes it yet.';

create index removed_passages_story on public.removed_passages (story_id);
create index removed_passages_user on public.removed_passages (user_id);

create trigger removed_passages_set_updated_at
  before update on public.removed_passages
  for each row execute function public.set_updated_at();

create trigger removed_passages_refuse_user_id_change
  before update on public.removed_passages
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.removed_passages enable row level security;

/** Policy removed_passages_select_staff: staff who may change stories read removed passages. */
create policy removed_passages_select_staff
  on public.removed_passages
  for select
  to authenticated
  using ((select public.staff_may('story_changes', 'act')) and public.may_see_case(case_is_safeguarding));

comment on policy removed_passages_select_staff on public.removed_passages is
  'Allows owner, admin and moderator, in a staff session, to read the original words of a removed passage; one removed for a safeguarding case only with the safeguarding permission; support, content editors and members never (S1-E11-08).';

revoke all on public.removed_passages from anon, authenticated;
grant select on public.removed_passages to authenticated;

/* ---------- 4. A published chapter's words, for staff ---------- */

/**
 * admin_chapter_text: a published chapter's words, so staff can select the passage to remove.
 *   Published words are what readers already see; a draft's words are never returned.
 * Input: target_chapter_id. Returns: { chapter_id, number, title, text }.
 * Errors: insufficient_privilege (hint not_allowed) unless the caller may change stories;
 *   check_violation (hint no_such_story) for a missing or deleted chapter, or not_published for a
 *   chapter that has never been published.
 * Where it fits: ChapterPassageForm → useStaffChapterText → api/staffStoryHistory.ts → here.
 */
create or replace function public.admin_chapter_text(target_chapter_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  chapter_row public.chapters;
begin
  -- Step 1: only staff who may change stories need the words.
  if not public.staff_may('story_changes', 'act') then
    raise exception 'Only owner, admin and moderator staff can read a chapter here.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  -- Step 2: a live chapter with published words.
  select * into chapter_row from public.chapters
  where chapters.id = target_chapter_id and chapters.deleted_at is null;
  if not found then
    raise exception 'There is no such chapter.' using errcode = 'check_violation', hint = 'no_such_story';
  end if;
  if chapter_row.published_body is null then
    raise exception 'This chapter has never been published.'
      using errcode = 'check_violation', hint = 'not_published';
  end if;
  return jsonb_build_object('chapter_id', chapter_row.id, 'number', chapter_row.position,
    'title', chapter_row.published_title, 'text', chapter_row.published_body);
end;
$$;
comment on function public.admin_chapter_text(uuid) is
  'A published chapter''s words, read-only, for staff who may change stories (S1-E11-08).';
revoke execute on function public.admin_chapter_text(uuid) from public, anon;
grant execute on function public.admin_chapter_text(uuid) to authenticated;

/* ---------- 5. Removing a passage ---------- */

/**
 * admin_passage_place: where the nth copy of a passage starts in a text, counted in characters
 *   from 1. Copies may overlap, exactly as the screen counts them (ChapterPassageForm).
 * Input: full_text, passage, occurrence (0 for the first copy). Returns: integer, or null.
 * Internal: admin_remove_chapter_passage().
 */
create or replace function public.admin_passage_place(full_text text, passage text, occurrence integer)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  searched_from integer := 1;
  found_at integer;
  copies_seen integer := 0;
begin
  loop
    -- Step 1: the next copy after the last one found.
    found_at := strpos(substr(full_text, searched_from), passage);
    if found_at = 0 then
      return null;
    end if;
    found_at := searched_from + found_at - 1;
    -- Step 2: the one staff selected, or move one character on and look again.
    if copies_seen = occurrence then
      return found_at;
    end if;
    copies_seen := copies_seen + 1;
    searched_from := found_at + 1;
  end loop;
end;
$$;
comment on function public.admin_passage_place(text, text, integer) is
  'Internal: where the nth copy of a passage starts, in characters from 1 (S1-E11-08).';
revoke execute on function public.admin_passage_place(text, text, integer) from public, anon, authenticated;

/**
 * admin_passage_case: the case staff named for a removal, by its reference.
 * Input: case_reference (R-000123 and so on), or null or blank for none. Returns: the case row,
 *   or an empty row for none.
 * Errors: check_violation (hint no_such_case) when the reference names no case the caller may see.
 * Internal: admin_remove_chapter_passage().
 */
create or replace function public.admin_passage_case(case_reference text)
returns public.cases
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  case_row public.cases;
begin
  if btrim(coalesce(case_reference, '')) = '' then
    return case_row;
  end if;
  select * into case_row from public.cases
  where cases.reference = upper(btrim(case_reference)) and public.may_see_case(cases.is_safeguarding);
  if not found then
    raise exception 'There is no such case.' using errcode = 'check_violation', hint = 'no_such_case';
  end if;
  return case_row;
end;
$$;
comment on function public.admin_passage_case(text) is
  'Internal: the case named for a passage removal, if the caller may see it (S1-E11-08).';
revoke execute on function public.admin_passage_case(text) from public, anon, authenticated;

/**
 * admin_swap_chapter_words: puts `replacement` where `original` sits at `starts_at` in the
 *   published chapter, and in the draft too, so the writer's next publish doesn't bring the
 *   passage back. A draft that matched the published words takes the new published words; any
 *   other draft has each copy of `original` swapped. The draft's version goes up, so a writer's
 *   open editor sees that the chapter changed instead of saving over it (S1-E3-02a).
 * Input: chapter_row, starts_at (characters from 1), original, replacement. Returns nothing.
 * Internal: removing a passage and putting one back.
 */
create or replace function public.admin_swap_chapter_words(
  chapter_row public.chapters, starts_at integer, original text, replacement text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_published text := overlay(chapter_row.published_body placing replacement
                                from starts_at for char_length(original));
begin
  update public.chapters set
    published_body = new_published,
    published_word_count = public.count_words(new_published),
    draft_body = case when chapter_row.draft_body = chapter_row.published_body then new_published
                      else replace(chapter_row.draft_body, original, replacement) end,
    word_count = public.count_words(case when chapter_row.draft_body = chapter_row.published_body
                   then new_published else replace(chapter_row.draft_body, original, replacement) end),
    draft_version = chapter_row.draft_version + 1
  where chapters.id = chapter_row.id;
end;
$$;
comment on function public.admin_swap_chapter_words(public.chapters, integer, text, text) is
  'Internal: swaps one passage in a chapter''s published words and its draft (S1-E11-08).';
revoke execute on function public.admin_swap_chapter_words(public.chapters, integer, text, text)
  from public, anon, authenticated;

/**
 * admin_remove_chapter_passage: staff cut one exact passage out of a published chapter; the
 *   marker takes its place and the rest of the chapter is untouched (S1-E11-08).
 * Input: target_chapter_id; passage, the exact words selected; occurrence, which copy of them
 *   (0 for the first), since the same words can appear twice; case_reference, the case it is for
 *   (optional); reason_code and reason_text.
 * Returns: the new story_revisions id.
 * Errors: as admin_story_change_target(); check_violation with hint not_published, no_such_case,
 *   or text_changed when those words are no longer at that place (the writer changed the chapter
 *   since staff opened it), or passage_too_long beyond 20,000 characters.
 * The writer gets a statement of reasons ('remove', DSA art. 17); the original goes into
 *   removed_passages, never into the version's before and after, which support staff can read.
 * Where it fits: ChapterPassageForm → useChangeStaffStory → api/staffStoryChanges.ts → here.
 */
create or replace function public.admin_remove_chapter_passage(
  target_chapter_id uuid, passage text, occurrence integer, case_reference text,
  reason_code text, reason_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapter_row public.chapters;
  story_row public.stories;
  case_row public.cases;
  starts_at integer;
  marker text;
  revision_id uuid;
begin
  -- Step 1: the chapter, then the checks every change starts with.
  select * into chapter_row from public.chapters
  where chapters.id = target_chapter_id and chapters.deleted_at is null;
  story_row := public.admin_story_change_target(chapter_row.story_id, reason_code, reason_text);
  if chapter_row.published_body is null then
    raise exception 'This chapter has never been published.'
      using errcode = 'check_violation', hint = 'not_published';
  end if;
  if char_length(coalesce(passage, '')) > 20000 then
    raise exception 'Remove at most 20,000 characters at once.'
      using errcode = 'check_violation', hint = 'passage_too_long';
  end if;
  case_row := public.admin_passage_case(case_reference);
  -- Step 2: the exact words must still be where staff selected them.
  starts_at := public.admin_passage_place(chapter_row.published_body, passage, coalesce(occurrence, 0));
  if coalesce(passage, '') = '' or starts_at is null then
    raise exception 'Those words are no longer in the chapter; open it again.'
      using errcode = 'check_violation', hint = 'text_changed';
  end if;
  -- Step 3: the cut. The marker is in the story's language.
  marker := public.removed_passage_marker(story_row.language_code);
  perform public.admin_swap_chapter_words(chapter_row, starts_at, passage, marker);
  -- Step 4: the version (no words in it), the audit log and the statement of reasons.
  revision_id := public.admin_record_story_change(story_row, chapter_row.id, 'passage', reason_code,
    reason_text,
    jsonb_build_object('passage', jsonb_build_object('characters', char_length(passage))),
    jsonb_build_object('passage', 'removed'),
    'remove');
  -- Step 5: the original, for staff only.
  insert into public.removed_passages (user_id, story_id, chapter_id, story_revision_id, case_id,
    case_is_safeguarding, removed_by_user_id, removed_text, marker_starts_at, marker)
  values (story_row.user_id, story_row.id, chapter_row.id, revision_id, case_row.id,
    coalesce(case_row.is_safeguarding, false), (select auth.uid()), passage, starts_at, marker);
  return revision_id;
end;
$$;
comment on function public.admin_remove_chapter_passage(uuid, text, integer, text, text, text) is
  'Staff cut one exact passage out of a chapter, leaving the marker; versioned, audited, the writer gets a statement of reasons (S1-E11-08).';
revoke execute on function public.admin_remove_chapter_passage(uuid, text, integer, text, text, text) from public, anon;
grant execute on function public.admin_remove_chapter_passage(uuid, text, integer, text, text, text) to authenticated;

/* ---------- 6. Restore ---------- */

/**
 * admin_put_back_passage: Restore for a removal: the original words go back where the marker is.
 * Input: story_row, the removal's version, the reason. Returns: the new story_revisions id.
 * Errors: check_violation with hint text_changed when the marker is no longer where it was (the
 *   writer edited the chapter since), or nothing_changed when the words are already back.
 * The writer gets a notification (nothing is restricted). Internal: admin_restore_story_revision().
 */
create or replace function public.admin_put_back_passage(
  story_row public.stories, removal public.story_revisions, reason_code text, reason_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  passage_row public.removed_passages;
  chapter_row public.chapters;
begin
  -- Step 1: the original, while it hasn't been put back already.
  select * into passage_row from public.removed_passages
  where removed_passages.story_revision_id = removal.id;
  if not found or passage_row.put_back_at is not null then
    raise exception 'Nothing changed.' using errcode = 'check_violation', hint = 'nothing_changed';
  end if;
  -- Step 2: the marker must still be where the cut left it.
  select * into chapter_row from public.chapters
  where chapters.id = passage_row.chapter_id and chapters.deleted_at is null;
  if substr(coalesce(chapter_row.published_body, ''), passage_row.marker_starts_at,
            char_length(passage_row.marker)) is distinct from passage_row.marker then
    raise exception 'The writer has changed this chapter since; the words can''t go back by themselves.'
      using errcode = 'check_violation', hint = 'text_changed';
  end if;
  -- Step 3: put the words back and note it.
  perform public.admin_swap_chapter_words(chapter_row, passage_row.marker_starts_at,
    passage_row.marker, passage_row.removed_text);
  update public.removed_passages set put_back_at = now() where removed_passages.id = passage_row.id;
  return public.admin_record_story_change(story_row, chapter_row.id, 'passage', reason_code, reason_text,
    jsonb_build_object('passage', 'removed'), jsonb_build_object('passage', 'put_back'), null);
end;
$$;
comment on function public.admin_put_back_passage(public.stories, public.story_revisions, text, text) is
  'Internal: Restore for a removed passage: the words go back where the marker is (S1-E11-08).';
revoke execute on function public.admin_put_back_passage(public.stories, public.story_revisions, text, text)
  from public, anon, authenticated;

/**
 * admin_restore_story_revision: Restore on a version: what that change replaced comes back, as a
 *   new version with its own reason, and the writer is told (S1-E11-08 criterion "Restore").
 *   Settings go back through the same checks as any settings change; a story or chapter goes back
 *   to how visible it was; a removed passage goes back in place of its marker.
 * Input: target_revision_id, reason_code, reason_text.
 * Returns: the new story_revisions id.
 * Errors: as admin_story_change_target() (no_such_story also when there is no such version);
 *   check_violation with hint cannot_restore for a put-back passage (its words are already back), plus whatever the change
 *   itself raises (nothing_changed when the story already holds those values, text_changed,
 *   removed_by_case and the writer's own checks).
 * Where it fits: StaffStoryHistory → useChangeStaffStory → api/staffStoryChanges.ts → here.
 */
create or replace function public.admin_restore_story_revision(
  target_revision_id uuid, reason_code text, reason_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  earlier public.story_revisions;
  story_row public.stories;
  revision_id uuid;
begin
  -- Step 1: the version, read as the server (support may read it too, but not restore it).
  select * into earlier from public.story_revisions where story_revisions.id = target_revision_id;
  -- A missing version has no story, so the shared checks answer no_such_story.
  story_row := public.admin_story_change_target(earlier.story_id, reason_code, reason_text);
  -- Step 2: each kind of change goes back its own way.
  if earlier.change_kind = 'settings' then
    revision_id := (public.admin_change_story_settings(story_row.id, earlier.before_values,
      reason_code, reason_text) ->> 'revision_id')::uuid;
  elsif earlier.change_kind = 'visibility' then
    revision_id := public.admin_set_story_visibility(story_row.id,
      earlier.before_values ->> 'visibility', reason_code, reason_text);
  elsif earlier.change_kind = 'chapter_visibility' then
    revision_id := public.admin_set_chapter_visibility(earlier.chapter_id,
      earlier.before_values ->> 'visibility', reason_code, reason_text);
  elsif earlier.after_values ->> 'passage' = 'removed' then
    revision_id := public.admin_put_back_passage(story_row, earlier, reason_code, reason_text);
  else
    raise exception 'These words are already back.' using errcode = 'check_violation', hint = 'cannot_restore';
  end if;
  -- Step 3: the new version says which change it undid.
  update public.story_revisions set restores_revision_id = earlier.id where story_revisions.id = revision_id;
  return revision_id;
end;
$$;
comment on function public.admin_restore_story_revision(uuid, text, text) is
  'Staff bring back what one earlier change replaced, as a new version with a reason; the writer told (S1-E11-08).';
revoke execute on function public.admin_restore_story_revision(uuid, text, text) from public, anon;
grant execute on function public.admin_restore_story_revision(uuid, text, text) to authenticated;

/* ---------- 7. Reading a removed passage ---------- */

/**
 * admin_removed_passage: the original words of a removed passage, for staff working on it. Reading
 *   them is a sensitive read, so it is logged (architecture 1.8.3, least privilege).
 * Input: target_revision_id, the removal's version. Returns: { text, case_reference, put_back }.
 * Errors: insufficient_privilege (hint not_allowed) unless the caller may change stories and see
 *   its case; check_violation (hint no_such_version) when that version removed no passage.
 * Where it fits: RemovedPassageReveal → api/staffStoryHistory.ts → here.
 */
create or replace function public.admin_removed_passage(target_revision_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  passage_row public.removed_passages;
begin
  -- Step 1: the passage, then who may read it.
  select * into passage_row from public.removed_passages
  where removed_passages.story_revision_id = target_revision_id;
  if not public.staff_may('story_changes', 'act')
     or (found and not public.may_see_case(passage_row.case_is_safeguarding)) then
    raise exception 'Only the staff working on this can read a removed passage.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  if not found then
    raise exception 'That version removed no passage.' using errcode = 'check_violation', hint = 'no_such_version';
  end if;
  -- Step 2: the read goes in the audit log, with the writer's user ID.
  perform public.log_staff_action('story.removed_passage_read', 'chapter', passage_row.chapter_id::text,
    passage_row.user_id, null, null, null);
  return jsonb_build_object('text', passage_row.removed_text,
    'case_reference', (select cases.reference from public.cases where cases.id = passage_row.case_id),
    'put_back', passage_row.put_back_at is not null);
end;
$$;
comment on function public.admin_removed_passage(uuid) is
  'The original words of a removed passage for staff who may change stories; the read is logged (S1-E11-08).';
revoke execute on function public.admin_removed_passage(uuid) from public, anon;
grant execute on function public.admin_removed_passage(uuid) to authenticated;

/* ---------- 8. The history on the story's staff page ---------- */

/**
 * admin_story_history_json: a story's versions, newest first, without a removed passage's words.
 * Input: target_story_id. Returns: [{ id, at, kind, chapter_number, changed_by_handle,
 *   reason_code, reason_text, before, after, restores_revision_id, passage_kept }].
 *   passage_kept is true while a removal's original is kept and not yet put back.
 * Internal: admin_story_overview().
 */
create or replace function public.admin_story_history_json(target_story_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', story_revisions.id,
      'at', story_revisions.created_at,
      'kind', story_revisions.change_kind,
      'chapter_number', chapters.position,
      'changed_by_handle', profiles.handle,
      'reason_code', story_revisions.reason_code,
      'reason_text', story_revisions.reason_text,
      'before', story_revisions.before_values,
      'after', story_revisions.after_values,
      'restores_revision_id', story_revisions.restores_revision_id,
      'passage_kept', exists (select 1 from public.removed_passages
                              where removed_passages.story_revision_id = story_revisions.id
                                and removed_passages.put_back_at is null))
    order by story_revisions.created_at desc, story_revisions.id), '[]'::jsonb)
  from public.story_revisions
  left join public.chapters on chapters.id = story_revisions.chapter_id
  left join public.profiles on profiles.id = story_revisions.changed_by_user_id
  where story_revisions.story_id = target_story_id;
$$;
comment on function public.admin_story_history_json(uuid) is
  'Internal: a story''s staff versions, newest first, never a removed passage''s words (S1-E11-08).';
revoke execute on function public.admin_story_history_json(uuid) from public, anon, authenticated;

/**
 * admin_story_overview: as in ADMIN-2b1, plus 'history', the story's versions newest first
 *   (S1-E11-08 criterion 1: "and the story's version history").
 * Input: target_story_id. Returns: JSON, never chapter text, a year of birth or an email.
 * Errors: insufficient_privilege (hint not_allowed) unless the caller may view Stories;
 *   check_violation (hint no_such_story) when there is no such story.
 * Where it fits: /staff/stories/:storyId → useStaffStory → api/staffStories.ts → here.
 */
create or replace function public.admin_story_overview(target_story_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story_row public.stories;
begin
  -- Step 1: the same staff as the list.
  if not public.staff_may('stories', 'view') then
    raise exception 'Only staff with the Stories area can open a story.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  -- Step 2: the story, even one its writer deleted (staff may need it for a case).
  select * into story_row from public.stories where stories.id = target_story_id;
  if not found then
    raise exception 'There is no such story.' using errcode = 'check_violation', hint = 'no_such_story';
  end if;
  -- Step 3: the details, the settings, the chapter list and the history, never the words.
  return public.admin_story_row(story_row) || jsonb_build_object(
    'blurb', story_row.blurb,
    'created_at', story_row.created_at,
    'first_published_at', story_row.first_published_at,
    'deleted_at', story_row.deleted_at,
    'comments_enabled', story_row.comments_enabled,
    'settings', public.admin_story_settings_json(story_row),
    'visibility', public.admin_story_visibility(story_row.id),
    'can_change', public.staff_may('story_changes', 'act'),
    'history', public.admin_story_history_json(story_row.id),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', chapters.id,
          'number', chapters.position,
          'title', case when chapters.status = 'published' then chapters.published_title end,
          'status', chapters.status,
          'is_hidden', public.is_moderated_away('chapter', chapters.id),
          'moderated_state', public.moderated_state_of('chapter', chapters.id),
          'has_published_text', chapters.published_body is not null,
          'words', coalesce(chapters.published_word_count, 0),
          'published_at', chapters.last_published_at,
          'updated_at', chapters.updated_at)
        order by chapters.position)
      from public.chapters
      where chapters.story_id = story_row.id and chapters.deleted_at is null), '[]'::jsonb));
end;
$$;
