/*
 * Migration: class points (bundle CLASS-POINTS, part 1; stories S1-E8-13 "Class points from
 * classmates", S1-E8-14 "Teacher points" and S1-E8-16 "Class points controls and safety";
 * Robert, 13 Nov 2026, 19:01 to 19:21 UTC, PRODUCT thread).
 *
 * What it is: inside a class space, pupils can give some of a small weekly budget of points to
 * classmates' chapters they opened, like upvotes, and the teacher can give their own points and a
 * private note on a pupil's chapter or assignment reply. There is no ranking anywhere.
 *
 * What it adds:
 * - spaces.class_points_on: off for every class until its teacher turns it on (S1-E8-16).
 * - class_point_gifts: one row per giver, chapter and week. The giver is user_id.
 * - class_teacher_points: the teacher's points and private note on one piece of a pupil's work.
 * - class_chapter_opens: that a pupil opened a classmate's chapter, so points can only be given to
 *   work that was opened (S1-E8-13 criterion 4).
 * - class_point_flags: quiet flags for our moderators only: a teacher's "these points look
 *   suspicious" and pairs of pupils who swap most of their points three weeks running.
 * - Two reportable types (rule 6): 'class_point_note' and 'class_teacher_note', with their
 *   branches in reportable_item_owner(), reportable_item_summary() and case_item_content().
 * - Functions for pupils: class_chapter_points(), give_class_points(), class_points_summary().
 * - Functions for the teacher: set_class_points(), set_teacher_points(), class_points_table(),
 *   report_class_points(), class_thread_teacher_points().
 * - Functions for our moderators: admin_class_point_flags(), admin_class_chapter_gifts(),
 *   admin_remove_class_gift(), admin_close_class_point_flag().
 * - Jobs: flag_class_point_pairs() (weekly) and purge_class_points() (nightly, with the other
 *   retention jobs).
 *
 * Who sees what (Robert, 13 Nov 2026, decisions 5 and 8):
 * - A pupil sees the points their own chapters received and the notes with them, never who gave
 *   them and never anyone else's points.
 * - The teacher sees totals per pupil and per chapter, never who gave them.
 * - Only our moderation team sees who gave which points.
 * - Nobody outside the class sees anything.
 * So the tables' own policies let a person read only the rows they wrote, and our moderators read
 * everything; everyone else's view goes through the functions below, which never return a giver.
 *
 * Numbers that may still change (weekly budget, the range of teacher points, how long the rows are
 * kept) are settings, so changing one needs no migration.
 *
 * It also repairs run_retention_jobs(): the abuse-image migration (20261222100001) rebuilt the
 * job list from an older copy and dropped purge_old_reading_minutes and
 * purge_class_certificate_names, so those two had stopped running at night. They are back.
 *
 * Who calls it: src/features/class-points/ and src/features/staff/ (Schools › Class points).
 * Tests: supabase/tests/database/377-class-points.test.sql and 378-class-points-safety.test.sql.
 */

/* ---------- 1. Settings and the kill switch ---------- */

insert into public.settings (key, value, is_public, description) values
  ('class_points_weekly_budget', '10'::jsonb, true,
   'How many points each pupil can give to classmates'' chapters in one week (S1-E8-13; Robert said "about 10", exact number OPEN).'),
  ('class_points_chapter_cap', '3'::jsonb, true,
   'The most points one pupil can give to the same chapter in one week (S1-E8-13; decided 13 Nov 2026).'),
  ('class_teacher_points_max', '10'::jsonb, true,
   'The most points a teacher can give to one piece of a pupil''s work; the least is 0 (S1-E8-14; range OPEN).'),
  ('class_point_note_max_characters', '140'::jsonb, true,
   'The longest note a pupil can add when giving class points, in characters (S1-E8-13).'),
  ('class_teacher_note_max_characters', '1000'::jsonb, true,
   'The longest private note a teacher can leave with their points, in characters (S1-E8-14; builder proposal).'),
  ('class_points_retention_days', '30'::jsonb, false,
   'How many days after a class is archived its points, notes and flags are deleted (S1-E8-16; OPEN, lawyer).'),
  ('class_points_timezone', '"Europe/Bucharest"'::jsonb, false,
   'The time zone a class points week is counted in: Monday 00:00 to Sunday 23:59 (S1-E8-13; proposal: one zone for every class until classes carry their own).')
on conflict (key) do nothing;

insert into public.feature_flags (key, is_enabled, is_public, description)
values ('class_teacher_notes', true, true,
  'While on, a teacher can leave a private note with their points on a pupil''s work. A staff kill switch: the lawyer confirms the notes before launch (S1-E8-14; Robert, 13 Nov 2026, 19:15 UTC).')
on conflict (key) do nothing;

/* ---------- 2. The switch on a class ---------- */

alter table public.spaces
  add column class_points_on boolean not null default false,
  add constraint spaces_class_points_only_class check (not class_points_on or kind = 'class');

comment on column public.spaces.class_points_on is
  'Whether the teacher turned class points on for this class; off for every new class (S1-E8-16 criterion 1).';

/* ---------- 3. The tables ---------- */

create table public.class_point_gifts (
  id uuid primary key default gen_random_uuid(),
  -- The pupil who gave the points (CLAUDE.md rule 15). Never shown to pupils or the teacher.
  user_id uuid not null references public.profiles (id),
  space_id uuid not null references public.spaces (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  -- The chapter's writer when the points were given.
  receiver_user_id uuid not null references public.profiles (id),
  -- The Monday of the week the points belong to (class_points_week_start()).
  week_start date not null,
  -- The weekly cap is a setting, checked on save; this only stops nonsense.
  points smallint not null constraint class_point_gifts_points_range check (points between 1 and 20),
  -- One line for the writer; the limit is a setting, checked on save.
  note text constraint class_point_gifts_note_length check (note is null or char_length(note) between 1 and 500),
  -- Set when one of our moderators removes the gift; it then counts for nothing.
  removed_at timestamptz,
  removed_by_user_id uuid references public.profiles (id) on delete set null,
  removed_reason text
    constraint class_point_gifts_removed_reason_length check (removed_reason is null or char_length(removed_reason) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_point_gifts_one_per_week unique (user_id, chapter_id, week_start),
  constraint class_point_gifts_not_own_chapter check (user_id <> receiver_user_id),
  constraint class_point_gifts_removal_is_whole check ((removed_at is null) = (removed_reason is null))
);
comment on table public.class_point_gifts is
  'kind: user_content; reportable: class_point_note
Points one pupil gave to a classmate''s chapter in one week, with an optional one-line note (S1-E8-13). Read only through class_chapter_points() and class_points_table(), which never say who gave them.';
create index class_point_gifts_space_week on public.class_point_gifts (space_id, week_start);
create index class_point_gifts_chapter on public.class_point_gifts (chapter_id);
create index class_point_gifts_receiver on public.class_point_gifts (receiver_user_id);
create trigger class_point_gifts_set_updated_at
  before update on public.class_point_gifts
  for each row execute function public.set_updated_at();
create trigger class_point_gifts_refuse_user_id_change
  before update on public.class_point_gifts
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.class_point_gifts enable row level security;

-- Allows: the pupil who gave the points, reading their own gifts (also for Download my data).
-- Why: it is their own action. The writer and the teacher never read this table: they get totals
-- from class_chapter_points() and class_points_table(), without the giver (Robert, 13 Nov 2026).
create policy class_point_gifts_select_own on public.class_point_gifts
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Allows: our moderation team, reading every gift with its giver. Why: only they may see who gave
-- points, to look into bullying or pupils swapping points (S1-E8-16 criterion 4).
create policy class_point_gifts_select_moderators on public.class_point_gifts
  for select to authenticated
  using (public.staff_may('moderation', 'view'));

grant select on public.class_point_gifts to authenticated;

create table public.class_teacher_points (
  id uuid primary key default gen_random_uuid(),
  -- The teacher who gave the points (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  space_id uuid not null references public.spaces (id) on delete cascade,
  -- The pupil whose work it is.
  pupil_user_id uuid not null references public.profiles (id),
  -- The work: a chapter shared with the class, or a reply to an assignment. Exactly one.
  chapter_id uuid references public.chapters (id) on delete cascade,
  forum_post_id uuid references public.forum_posts (id) on delete cascade,
  -- The top of the range is a setting, checked on save; this only stops nonsense.
  points smallint not null constraint class_teacher_points_points_range check (points between 0 and 100),
  -- The private note: only the pupil, the teacher and our moderators read it. The limit is a
  -- setting, checked on save.
  note text constraint class_teacher_points_note_length check (note is null or char_length(note) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_teacher_points_one_target check ((chapter_id is null) <> (forum_post_id is null)),
  constraint class_teacher_points_not_own_work check (user_id <> pupil_user_id)
);
comment on table public.class_teacher_points is
  'kind: user_content; reportable: class_teacher_note
A teacher''s points on one piece of a pupil''s work in their class, with an optional private note (S1-E8-14). The pupil reads theirs through class_chapter_points() and class_thread_teacher_points().';
create unique index class_teacher_points_one_per_chapter
  on public.class_teacher_points (space_id, chapter_id) where chapter_id is not null;
create unique index class_teacher_points_one_per_post
  on public.class_teacher_points (forum_post_id) where forum_post_id is not null;
create index class_teacher_points_pupil on public.class_teacher_points (pupil_user_id);
create trigger class_teacher_points_set_updated_at
  before update on public.class_teacher_points
  for each row execute function public.set_updated_at();
create trigger class_teacher_points_refuse_user_id_change
  before update on public.class_teacher_points
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.class_teacher_points enable row level security;

-- Allows: the teacher who gave the points, reading their own rows (also for Download my data).
-- Why: it is their own marking. The pupil reads their points through the functions, so a note our
-- moderators hid never reaches them through the table.
create policy class_teacher_points_select_own on public.class_teacher_points
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Allows: our moderation team. Why: a teacher's private note to a pupil is content like any other,
-- and moderators must be able to read and remove it (S1-E8-14 criterion 4, S1-E8-16 criterion 4).
create policy class_teacher_points_select_moderators on public.class_teacher_points
  for select to authenticated
  using (public.staff_may('moderation', 'view'));

grant select on public.class_teacher_points to authenticated;

create table public.class_chapter_opens (
  id uuid primary key default gen_random_uuid(),
  -- The pupil who opened the chapter (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  space_id uuid not null references public.spaces (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint class_chapter_opens_once unique (user_id, chapter_id)
);
comment on table public.class_chapter_opens is
  'kind: user_action
That a pupil opened a classmate''s chapter in a class with points on, so points go only to work that was opened (S1-E8-13 criterion 4). Only inside classes; deleted with the class''s points.';
create index class_chapter_opens_space on public.class_chapter_opens (space_id);

alter table public.class_chapter_opens enable row level security;

-- Allows: the pupil, reading their own rows (Download my data). Why: it is a record of what they
-- did. Nobody else reads it, the teacher included: it is not a reading log for the class.
create policy class_chapter_opens_select_own on public.class_chapter_opens
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.class_chapter_opens to authenticated;

create table public.class_point_flags (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  -- 'teacher_report': the teacher said a chapter's points look suspicious.
  -- 'pair': two pupils gave each other most of their points three weeks running.
  kind text not null constraint class_point_flags_kind_is_known check (kind in ('teacher_report', 'pair')),
  -- The chapter a teacher's report is about; null for a pair.
  chapter_id uuid references public.chapters (id) on delete cascade,
  -- The teacher who reported; null for a pair, which the weekly job finds.
  reporter_user_id uuid references public.profiles (id) on delete set null,
  -- The two pupils of a pair, the lower ID first; null for a teacher's report.
  first_user_id uuid references public.profiles (id) on delete cascade,
  second_user_id uuid references public.profiles (id) on delete cascade,
  -- The last of the three weeks a pair was seen in; null for a teacher's report.
  week_start date,
  note text constraint class_point_flags_note_length check (note is null or char_length(note) between 1 and 500),
  closed_at timestamptz,
  closed_by_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_point_flags_shape check (
    (kind = 'teacher_report' and chapter_id is not null and first_user_id is null and second_user_id is null)
    or (kind = 'pair' and chapter_id is null and first_user_id is not null and second_user_id is not null
        and week_start is not null))
);
comment on table public.class_point_flags is
  'kind: platform
Quiet flags about class points for our moderation team only: a teacher''s report of a chapter''s points, or two pupils swapping most of their points three weeks running (S1-E8-16 criteria 2 and 3). The teacher never sees a pair flag.';
create unique index class_point_flags_one_pair_per_week
  on public.class_point_flags (space_id, first_user_id, second_user_id, week_start) where kind = 'pair';
create unique index class_point_flags_one_open_report
  on public.class_point_flags (chapter_id) where kind = 'teacher_report' and closed_at is null;
create trigger class_point_flags_set_updated_at
  before update on public.class_point_flags
  for each row execute function public.set_updated_at();

alter table public.class_point_flags enable row level security;

-- Allows: our moderation team. Why: a flag names pupils and is only for the people who look into
-- it. The teacher learns that their own report is open from class_points_table(), nothing more.
create policy class_point_flags_select_moderators on public.class_point_flags
  for select to authenticated
  using (public.staff_may('moderation', 'view'));

grant select on public.class_point_flags to authenticated;

/* ---------- 4. Small helpers ---------- */

/**
 * class_points_number: one of the class points settings as a whole number.
 * Inputs: setting_key (for example 'class_points_weekly_budget'); fallback, used when the setting
 *   is missing.
 * Returns: the number. Errors: none. Internal: every function below reads its limits here, so the
 *   numbers live in one place (the settings table).
 */
create function public.class_points_number(setting_key text, fallback integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((public.setting_value(setting_key))::integer, fallback);
$$;
comment on function public.class_points_number(text, integer) is
  'Internal: one class points setting as a whole number, or the fallback (S1-E8-13).';
revoke execute on function public.class_points_number(text, integer) from public, anon, authenticated;

/**
 * class_points_week_start: the Monday of the class points week a moment falls in.
 * Input: moment (now by default).
 * Returns: that Monday's date in the class points time zone (a week runs Monday 00:00 to Sunday
 *   23:59; S1-E8-13 criterion 5).
 * Errors: none. Internal: the budget, the cap and the weekly job all count in these weeks.
 */
create function public.class_points_week_start(moment timestamptz default now())
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select date_trunc('week', moment at time zone
    coalesce(public.setting_value('class_points_timezone') #>> '{}', 'Europe/Bucharest'))::date;
$$;
comment on function public.class_points_week_start(timestamptz) is
  'Internal: the Monday of the class points week a moment falls in (S1-E8-13).';
revoke execute on function public.class_points_week_start(timestamptz) from public, anon, authenticated;

/**
 * class_points_chapter_space: the class a chapter is shared with, when the caller may read it.
 * Input: target_chapter_id.
 * Returns: the class space's row; a null row when the chapter isn't published, isn't shared only
 *   with a class, or the caller may not read it (chapter_is_readable(): the writer, the class's
 *   fully active members and our moderators).
 * Errors: none. Internal: every chapter function below starts here.
 */
create function public.class_points_chapter_space(target_chapter_id uuid)
returns public.spaces
language sql
stable
security definer
set search_path = ''
as $$
  select spaces.*
  from public.chapters
  join public.stories on stories.id = chapters.story_id
  join public.spaces on spaces.id = stories.class_space_id
  where chapters.id = target_chapter_id
    and stories.class_only
    and spaces.kind = 'class'
    and spaces.deleted_at is null
    and public.chapter_is_readable(chapters.id);
$$;
comment on function public.class_points_chapter_space(uuid) is
  'Internal: the class a readable chapter is shared with, or a null row (S1-E8-13).';
revoke execute on function public.class_points_chapter_space(uuid) from public, anon, authenticated;

/**
 * class_points_is_pupil: whether a person is a pupil of a class: an active member who isn't its
 *   teacher (the owner).
 * Inputs: target, the class; person_id.
 * Returns: true or false. Errors: none. Internal.
 */
create function public.class_points_is_pupil(target public.spaces, person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target.kind = 'class' and target.user_id is distinct from person_id and exists (
    select 1 from public.space_members
    where space_members.space_id = target.id and space_members.user_id = person_id
      and space_members.status = 'active');
$$;
comment on function public.class_points_is_pupil(public.spaces, uuid) is
  'Internal: whether a person is an active member of a class and not its teacher (S1-E8-13).';
revoke execute on function public.class_points_is_pupil(public.spaces, uuid) from public, anon, authenticated;

/**
 * class_points_spent: how many points a pupil has given in a class in one week.
 * Inputs: target_space_id; giver_id; week, the week's Monday; skip_chapter_id, a chapter to leave
 *   out (the one being changed), or null.
 * Returns: the sum; gifts a moderator removed count for nothing, so the giver has those points
 *   back while the week is open (S1-E8-16 criterion 2).
 * Errors: none. Internal.
 */
create function public.class_points_spent(target_space_id uuid, giver_id uuid, week date, skip_chapter_id uuid default null)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(gifts.points), 0)::integer
  from public.class_point_gifts as gifts
  where gifts.space_id = target_space_id and gifts.user_id = giver_id and gifts.week_start = week
    and gifts.removed_at is null
    and (skip_chapter_id is null or gifts.chapter_id <> skip_chapter_id);
$$;
comment on function public.class_points_spent(uuid, uuid, date, uuid) is
  'Internal: the points a pupil gave in a class in one week, removed gifts left out (S1-E8-13).';
revoke execute on function public.class_points_spent(uuid, uuid, date, uuid) from public, anon, authenticated;

/**
 * check_class_note: cleans a note written with points and refuses what a comment would refuse.
 * Inputs: value, the typed note (null or empty for none); longest, the limit in characters.
 * Returns: the clean note on one line, or null for none.
 * Errors: check_violation with hint 'note:too_long', 'note:html' or 'note:link' (the same filters
 *   as a comment: no raw HTML, only http, https and mailto links; CLAUDE.md rule 8).
 * Internal: give_class_points() and set_teacher_points().
 */
create function public.check_class_note(value text, longest integer)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  -- One line with single spaces, and Romanian letters with the comma below.
  clean text := btrim(regexp_replace(public.normalise_romanian_letters(coalesce(value, '')), '\s+', ' ', 'g'));
begin
  if clean = '' then
    return null;
  end if;
  if char_length(clean) > longest then
    raise exception 'At most % characters.', longest using errcode = 'check_violation', hint = 'note:too_long';
  end if;
  if public.has_html_tag(clean) then
    raise exception 'HTML tags are not allowed (CLAUDE.md rule 8).' using errcode = 'check_violation', hint = 'note:html';
  end if;
  if public.has_unsafe_link(clean) then
    raise exception 'Only http, https and mailto links are allowed (CLAUDE.md rule 8).' using errcode = 'check_violation', hint = 'note:link';
  end if;
  return clean;
end;
$$;
comment on function public.check_class_note(text, integer) is
  'Internal: a note with class points, cleaned and checked like a comment (S1-E8-13, rule 8).';
revoke execute on function public.check_class_note(text, integer) from public, anon, authenticated;

/* ---------- 5. Turning class points on and off ---------- */

/**
 * set_class_points: the teacher turns class points on or off for their class.
 * Inputs: slug, the class's address; turn_on.
 * Returns: class_points_summary() after the change.
 * Errors: as space_for_power() (no such space; not allowed); check_violation with hint
 *   'space:not_class' for a space that isn't a class, and 'space:archived' when turning them on in
 *   an archived class.
 * Where it fits: the Class points card in the class's settings. Written to the class's log.
 */
create function public.set_class_points(slug text, turn_on boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(slug, 'settings');
begin
  -- Step 1: only a class has points, and an archived class starts nothing new.
  if space.kind <> 'class' then
    raise exception 'Only a class space has class points.' using errcode = 'check_violation', hint = 'space:not_class';
  end if;
  if turn_on and space.archived_at is not null then
    raise exception 'This class is archived.' using errcode = 'check_violation', hint = 'space:archived';
  end if;
  -- Step 2: save the switch and write it in the class's log, only when it changes.
  if space.class_points_on is distinct from turn_on then
    update public.spaces set class_points_on = turn_on, updated_at = now() where spaces.id = space.id;
    perform public.log_space_action(space,
      case when turn_on then 'class_points_on' else 'class_points_off' end, null, null, null);
  end if;
  return public.class_points_summary(slug);
end;
$$;
comment on function public.set_class_points(text, boolean) is
  'The teacher turns class points on or off for their class; off for every new class (S1-E8-16).';
revoke execute on function public.set_class_points(text, boolean) from public, anon;
grant execute on function public.set_class_points(text, boolean) to authenticated;

/**
 * class_points_summary: what the class page says about class points to the person looking.
 * Input: slug, the class's address.
 * Returns: null for anyone who isn't the teacher or a pupil who may read the class. Otherwise JSON
 *   {enabled, role ('teacher' or 'pupil'), can_switch, budget, left, cap, resets_on,
 *   received_total}. budget, left and resets_on are for a pupil: this week's budget, what is left
 *   of it and the day a new budget starts. received_total is the points the pupil's own chapters
 *   received in this class. A teacher gets nulls there.
 * Errors: none. Where it fits: ClassPointsCard on the class page and in its settings.
 */
create function public.class_points_summary(slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with class as (
    select spaces.*, spaces.user_id = (select auth.uid()) as is_teacher,
           public.class_points_week_start() as week
    from public.spaces
    where spaces.slug = class_points_summary.slug and spaces.kind = 'class' and spaces.deleted_at is null
      and public.space_may_read(spaces)
      and (spaces.user_id = (select auth.uid()) or public.class_points_is_pupil(spaces, (select auth.uid())))
  )
  select jsonb_build_object(
    'enabled', class.class_points_on,
    'role', case when class.is_teacher then 'teacher' else 'pupil' end,
    'can_switch', class.is_teacher and class.archived_at is null,
    'budget', case when not class.is_teacher then public.class_points_number('class_points_weekly_budget', 10) end,
    'left', case when not class.is_teacher then
      greatest(public.class_points_number('class_points_weekly_budget', 10)
               - public.class_points_spent(class.id, (select auth.uid()), class.week), 0) end,
    'cap', public.class_points_number('class_points_chapter_cap', 3),
    'resets_on', case when not class.is_teacher then class.week + 7 end,
    'received_total', case when not class.is_teacher then (
      select coalesce(sum(gifts.points), 0)::integer from public.class_point_gifts as gifts
      where gifts.space_id = class.id and gifts.receiver_user_id = (select auth.uid())
        and gifts.removed_at is null) end)
  from class;
$$;
comment on function public.class_points_summary(text) is
  'Class points on a class page: on or off, and for a pupil their budget and the points they received (S1-E8-13).';
revoke execute on function public.class_points_summary(text) from public, anon;
grant execute on function public.class_points_summary(text) to authenticated;

/* ---------- 6. A chapter's points ---------- */

/**
 * class_teacher_points_json: a teacher's points on one piece of work, as the person looking may
 *   see them.
 * Input: target, the row (a null row gives null).
 * Returns: JSON {id, points, note}; the note is null when there is none, when the kill switch
 *   class_teacher_notes is off, or when our moderators hid or removed it.
 * Errors: none. Internal: the callers decide who may see the row at all.
 */
create function public.class_teacher_points_json(target public.class_teacher_points)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when target.id is not null then jsonb_build_object(
    'id', target.id,
    'points', target.points,
    'note', case when public.is_feature_enabled('class_teacher_notes')
                      and not public.is_moderated_away('class_teacher_note', target.id)
                 then target.note end) end;
$$;
comment on function public.class_teacher_points_json(public.class_teacher_points) is
  'Internal: a teacher''s points and note on one piece of work, the note only while it may show (S1-E8-14).';
revoke execute on function public.class_teacher_points_json(public.class_teacher_points) from public, anon, authenticated;

/**
 * class_chapter_points: everything about class points on one chapter, for the person reading it.
 * Input: target_chapter_id.
 * Returns: null when the chapter isn't shared with a class, the class has points off, or the
 *   caller isn't the writer, the teacher or a pupil of that class. Otherwise JSON
 *   {class: {slug, name}, role, giving, received, teacher}:
 *   - role 'classmate': giving = {budget, left, cap, given, note, resets_on, can_give}; received
 *     and teacher are null, so a classmate never sees a counter (criterion 8).
 *   - role 'writer': received = {total, notes: [{id, note}]}, never who gave them (criterion 7);
 *     teacher = {id, points, note} or null.
 *   - role 'teacher': teacher = {id, points, note} or null, plus teacher_max and notes_on; received
 *     = {total} without the notes, which are for the writer.
 * Side effect: for a classmate it records that they opened the chapter, which give_class_points()
 *   asks for (criterion 4). That is why it is not a plain read.
 * Errors: none. Where it fits: ChapterClassPoints under a chapter's text.
 */
create function public.class_chapter_points(target_chapter_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  space public.spaces;
  writer_id uuid;
  viewer_role text;
  week date := public.class_points_week_start();
  budget integer := public.class_points_number('class_points_weekly_budget', 10);
  my_gift public.class_point_gifts;
  teacher_row public.class_teacher_points;
  received_total integer;
begin
  -- Step 1: only a chapter shared with a class that has points on, and only for a signed-in reader.
  if caller_id is null then
    return null;
  end if;
  space := public.class_points_chapter_space(target_chapter_id);
  if space.id is null or not space.class_points_on then
    return null;
  end if;
  -- Step 2: who is looking: the writer, the teacher or a classmate. Anyone else gets nothing.
  select chapters.user_id into writer_id from public.chapters where chapters.id = target_chapter_id;
  viewer_role := case
    when writer_id = caller_id then 'writer'
    when space.user_id = caller_id then 'teacher'
    when public.class_points_is_pupil(space, caller_id) and public.is_active_member() then 'classmate' end;
  if viewer_role is null then
    return null;
  end if;
  -- Step 3: a classmate has now opened the chapter (criterion 4).
  if viewer_role = 'classmate' then
    insert into public.class_chapter_opens (user_id, space_id, chapter_id)
    values (caller_id, space.id, target_chapter_id)
    on conflict on constraint class_chapter_opens_once do nothing;
    select * into my_gift from public.class_point_gifts as gifts
    where gifts.user_id = caller_id and gifts.chapter_id = target_chapter_id and gifts.week_start = week;
  end if;
  -- Step 4: the totals, for the writer and the teacher only.
  select coalesce(sum(gifts.points), 0)::integer into received_total
  from public.class_point_gifts as gifts
  where gifts.chapter_id = target_chapter_id and gifts.space_id = space.id and gifts.removed_at is null;
  select * into teacher_row from public.class_teacher_points as marks
  where marks.space_id = space.id and marks.chapter_id = target_chapter_id;
  -- Step 5: the answer, with only the parts this viewer may see.
  return jsonb_build_object(
    'class', jsonb_build_object('slug', space.slug, 'name', space.name),
    'role', viewer_role,
    'giving', case when viewer_role = 'classmate' then jsonb_build_object(
      'budget', budget,
      'left', greatest(budget - public.class_points_spent(space.id, caller_id, week), 0),
      'cap', public.class_points_number('class_points_chapter_cap', 3),
      'given', case when my_gift.removed_at is null then coalesce(my_gift.points, 0) else 0 end,
      'note', case when my_gift.removed_at is null then my_gift.note end,
      'resets_on', week + 7,
      -- Not offered in a locked class, to someone blocked either way, or after a moderator
      -- removed this week's gift to this chapter.
      'can_give', not public.space_is_locked(space) and not public.is_blocked_with(writer_id)
                  and my_gift.removed_at is null) end,
    'received', case
      when viewer_role = 'writer' then jsonb_build_object(
        'total', received_total,
        'notes', (select coalesce(jsonb_agg(jsonb_build_object('id', gifts.id, 'note', gifts.note)
                    order by gifts.created_at), '[]'::jsonb)
                  from public.class_point_gifts as gifts
                  where gifts.chapter_id = target_chapter_id and gifts.space_id = space.id
                    and gifts.removed_at is null and gifts.note is not null
                    and not public.is_moderated_away('class_point_note', gifts.id)))
      when viewer_role = 'teacher' then jsonb_build_object('total', received_total) end,
    'teacher', case when viewer_role in ('writer', 'teacher') then public.class_teacher_points_json(teacher_row) end,
    'teacher_max', case when viewer_role = 'teacher' then public.class_points_number('class_teacher_points_max', 10) end,
    'notes_on', case when viewer_role = 'teacher' then public.is_feature_enabled('class_teacher_notes') end,
    'is_locked', public.space_is_locked(space));
end;
$$;
comment on function public.class_chapter_points(uuid) is
  'Class points on one chapter for its writer, the teacher or a classmate; records that a classmate opened it (S1-E8-13, S1-E8-14).';
revoke execute on function public.class_chapter_points(uuid) from public, anon;
grant execute on function public.class_chapter_points(uuid) to authenticated;

/**
 * give_class_points: a pupil gives points to a classmate's chapter for this week, changes them or
 *   takes them back.
 * Inputs: target_chapter_id; new_points, 0 to the weekly cap (0 takes them back); new_note, one
 *   optional line for the writer.
 * Returns: class_chapter_points() after the change.
 * Errors: insufficient_privilege with hint 'signed_out'; check_violation with hint
 *   'points:not_offered' (no such chapter in a class with points on, the caller isn't a pupil of
 *   it, it is their own chapter, the class is locked, the two blocked each other, or a moderator
 *   removed this week's gift), 'points:not_opened' (they haven't opened the chapter),
 *   'points:cap' (more than the cap for one chapter, or below 0), 'points:budget' (more than is
 *   left this week), and 'note:too_long', 'note:html' or 'note:link'.
 * Where it fits: the give control under a classmate's chapter. Past weeks can't be changed: the
 *   function only ever touches this week's row (criterion 5).
 */
create function public.give_class_points(target_chapter_id uuid, new_points integer, new_note text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  space public.spaces := public.class_points_chapter_space(target_chapter_id);
  writer_id uuid;
  week date := public.class_points_week_start();
  clean_note text;
begin
  -- Step 1: the control is offered only to a pupil of a class with points on, on a classmate's
  -- chapter, while the class is open and the two haven't blocked each other.
  select chapters.user_id into writer_id from public.chapters where chapters.id = target_chapter_id;
  if space.id is null or not space.class_points_on or writer_id = caller_id
     or not public.class_points_is_pupil(space, caller_id) or not public.is_active_member()
     or public.space_is_locked(space) or public.is_blocked_with(writer_id)
     or exists (select 1 from public.class_point_gifts as gifts
                where gifts.user_id = caller_id and gifts.chapter_id = target_chapter_id
                  and gifts.week_start = week and gifts.removed_at is not null) then
    raise exception 'Points can''t be given here.' using errcode = 'check_violation', hint = 'points:not_offered';
  end if;
  -- Step 2: only work the pupil opened (criterion 4).
  if not exists (select 1 from public.class_chapter_opens as opens
                 where opens.user_id = caller_id and opens.chapter_id = target_chapter_id) then
    raise exception 'Open the chapter first.' using errcode = 'check_violation', hint = 'points:not_opened';
  end if;
  -- Step 3: at most the cap for one chapter, and never more than is left of this week's budget.
  -- The pupil's own row for this class and week is locked so two taps can't both pass the sum.
  perform 1 from public.space_members
  where space_members.space_id = space.id and space_members.user_id = caller_id for update;
  if new_points is null or new_points < 0
     or new_points > public.class_points_number('class_points_chapter_cap', 3) then
    raise exception 'Too many points for one chapter.' using errcode = 'check_violation', hint = 'points:cap';
  end if;
  if public.class_points_spent(space.id, caller_id, week, target_chapter_id) + new_points
     > public.class_points_number('class_points_weekly_budget', 10) then
    raise exception 'Not enough points left this week.' using errcode = 'check_violation', hint = 'points:budget';
  end if;
  -- Step 4: zero takes the points back; anything else saves this week's row with its note.
  if new_points = 0 then
    delete from public.class_point_gifts as gifts
    where gifts.user_id = caller_id and gifts.chapter_id = target_chapter_id and gifts.week_start = week;
    return public.class_chapter_points(target_chapter_id);
  end if;
  clean_note := public.check_class_note(new_note, public.class_points_number('class_point_note_max_characters', 140));
  insert into public.class_point_gifts (user_id, space_id, chapter_id, receiver_user_id, week_start, points, note)
  values (caller_id, space.id, target_chapter_id, writer_id, week, new_points, clean_note)
  on conflict on constraint class_point_gifts_one_per_week
  do update set points = excluded.points, note = excluded.note;
  return public.class_chapter_points(target_chapter_id);
end;
$$;
comment on function public.give_class_points(uuid, integer, text) is
  'A pupil gives this week''s points to a classmate''s chapter they opened, within the cap and the weekly budget (S1-E8-13).';
revoke execute on function public.give_class_points(uuid, integer, text) from public, anon;
grant execute on function public.give_class_points(uuid, integer, text) to authenticated;

/* ---------- 7. Teacher points ---------- */

/**
 * set_teacher_points: the teacher gives points to a pupil's chapter or assignment reply, changes
 *   them, or takes them away.
 * Inputs: target_kind, 'chapter' or 'reply'; target_id, the chapter's or the reply's ID;
 *   new_points, 0 to the setting class_teacher_points_max, or null to take the points away;
 *   new_note, the optional private note.
 * Returns: JSON {id, points, note}, or null after taking the points away.
 * Errors: insufficient_privilege with hint 'signed_out', or 'points:not_teacher' when the caller
 *   isn't the teacher of the class the work is in (moderators of the class and our own staff
 *   can't mark for the teacher); check_violation with hint 'points:not_offered' (no such work in a
 *   class with points on, it isn't a pupil's, or the class is locked), 'points:range', and
 *   'note:off' (the kill switch class_teacher_notes is off), 'note:too_long', 'note:html' or
 *   'note:link'.
 * Where it fits: TeacherPointsForm under a chapter and beside an assignment reply. Each save is
 *   written to the class's log (who and how many points, never the note's words).
 */
create function public.set_teacher_points(target_kind text, target_id uuid, new_points integer, new_note text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  space public.spaces;
  pupil_id uuid;
  thread_id uuid;
  clean_note text;
  saved public.class_teacher_points;
begin
  -- Step 1: find the class the work is in and whose work it is.
  if target_kind = 'chapter' then
    space := public.class_points_chapter_space(target_id);
    select chapters.user_id into pupil_id from public.chapters where chapters.id = target_id;
  elsif target_kind = 'reply' then
    select forum_posts.user_id, forum_posts.thread_id into pupil_id, thread_id
    from public.forum_posts where forum_posts.id = target_id and forum_posts.deleted_at is null;
    space := public.class_space_of_thread(thread_id);
  end if;
  if space.id is null or not space.class_points_on or pupil_id is null then
    raise exception 'Points can''t be given here.' using errcode = 'check_violation', hint = 'points:not_offered';
  end if;
  -- Step 2: only the class's teacher marks (GDPR art. 22: a person decides, and it is the teacher).
  if space.user_id is distinct from caller_id then
    raise exception 'Only the class''s teacher gives teacher points.'
      using errcode = 'insufficient_privilege', hint = 'points:not_teacher';
  end if;
  -- Step 3: only a pupil's work, in a class that is still open.
  if not public.class_points_is_pupil(space, pupil_id) or public.space_is_locked(space) then
    raise exception 'Points can''t be given here.' using errcode = 'check_violation', hint = 'points:not_offered';
  end if;
  -- Step 4: no points means the teacher takes them away, with the note.
  if new_points is null then
    delete from public.class_teacher_points as marks
    where marks.space_id = space.id
      and ((target_kind = 'chapter' and marks.chapter_id = target_id)
           or (target_kind = 'reply' and marks.forum_post_id = target_id));
    if found then
      perform public.log_space_action(space, 'teacher_points_removed', pupil_id, thread_id, null);
    end if;
    return null;
  end if;
  -- Step 5: the range, and the note with the same filters as a comment.
  if new_points < 0 or new_points > public.class_points_number('class_teacher_points_max', 10) then
    raise exception 'Outside the range of teacher points.' using errcode = 'check_violation', hint = 'points:range';
  end if;
  clean_note := public.check_class_note(new_note, public.class_points_number('class_teacher_note_max_characters', 1000));
  if clean_note is not null and not public.is_feature_enabled('class_teacher_notes') then
    raise exception 'Teacher notes are switched off.' using errcode = 'check_violation', hint = 'note:off';
  end if;
  -- Step 6: one row per piece of work; saving again changes it.
  update public.class_teacher_points as marks
  set points = new_points, note = clean_note
  where marks.space_id = space.id
    and ((target_kind = 'chapter' and marks.chapter_id = target_id)
         or (target_kind = 'reply' and marks.forum_post_id = target_id))
  returning marks.* into saved;
  if saved.id is null then
    insert into public.class_teacher_points (user_id, space_id, pupil_user_id, chapter_id, forum_post_id, points, note)
    values (caller_id, space.id, pupil_id,
            case when target_kind = 'chapter' then target_id end,
            case when target_kind = 'reply' then target_id end, new_points, clean_note)
    returning * into saved;
  end if;
  -- Step 7: the class's log says that points were saved and whether a note came with them.
  perform public.log_space_action(space, 'teacher_points_saved', pupil_id, thread_id, null,
    jsonb_build_object('points', new_points, 'with_note', clean_note is not null));
  return public.class_teacher_points_json(saved);
end;
$$;
comment on function public.set_teacher_points(text, uuid, integer, text) is
  'The class''s teacher gives points and an optional private note to a pupil''s chapter or assignment reply (S1-E8-14).';
revoke execute on function public.set_teacher_points(text, uuid, integer, text) from public, anon;
grant execute on function public.set_teacher_points(text, uuid, integer, text) to authenticated;

/**
 * class_thread_teacher_points: the teacher points on the replies of one class thread.
 * Input: target_thread_id.
 * Returns: null when the thread isn't in a class with points on, or the caller is neither its
 *   teacher nor a pupil who may read it. Otherwise JSON {is_teacher, teacher_max, notes_on,
 *   is_locked, replies: [{post_id, id, points, note}]}: every marked reply for the teacher, only
 *   the caller's own replies for a pupil.
 * Errors: none. Where it fits: ReplyTeacherPoints beside each reply of a class thread.
 */
create function public.class_thread_teacher_points(target_thread_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with class as (
    select space.*, space.user_id = (select auth.uid()) as is_teacher
    from public.class_space_of_thread(target_thread_id) as space
    where space.id is not null and space.class_points_on and public.space_may_read(space)
      and (space.user_id = (select auth.uid()) or public.class_points_is_pupil(space, (select auth.uid())))
  )
  select jsonb_build_object(
    'is_teacher', class.is_teacher,
    'teacher_max', public.class_points_number('class_teacher_points_max', 10),
    'notes_on', public.is_feature_enabled('class_teacher_notes'),
    'is_locked', public.space_is_locked(public.class_space_of_thread(target_thread_id)),
    'replies', (
      select coalesce(jsonb_agg(public.class_teacher_points_json(marks)
                 || jsonb_build_object('post_id', marks.forum_post_id) order by forum_posts.post_number), '[]'::jsonb)
      from public.class_teacher_points as marks
      join public.forum_posts on forum_posts.id = marks.forum_post_id
      where marks.space_id = class.id and forum_posts.thread_id = target_thread_id
        and forum_posts.deleted_at is null
        and (class.is_teacher or marks.pupil_user_id = (select auth.uid()))))
  from class;
$$;
comment on function public.class_thread_teacher_points(uuid) is
  'The teacher points on a class thread''s replies: all for the teacher, their own for a pupil (S1-E8-14).';
revoke execute on function public.class_thread_teacher_points(uuid) from public, anon;
grant execute on function public.class_thread_teacher_points(uuid) to authenticated;

/**
 * class_points_table: the teacher's table of class points and teacher points, pupil by pupil.
 * Input: slug, the class's address.
 * Returns: null for anyone but the class's teacher, or while points are off. Otherwise JSON
 *   {pupils: [{handle, display_name, class_points, teacher_points, chapters: [{chapter_id,
 *   story_slug, story_title, chapter_code, chapter_position, chapter_title, class_points,
 *   teacher_points, is_reported}]}]}, pupils by name. There is no rank and no giver anywhere in it
 *   (Robert, 13 Nov 2026, decisions 2 and 8). teacher_points is null for work with no mark.
 * Errors: none. Where it fits: ClassPointsPage at /spaces/<slug>/points.
 */
create function public.class_points_table(slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with class as (
    select spaces.* from public.spaces
    where spaces.slug = class_points_table.slug and spaces.kind = 'class' and spaces.deleted_at is null
      and spaces.class_points_on and spaces.user_id = (select auth.uid())
  ),
  pupils as (
    select space_members.user_id, profiles.handle,
           public.display_name(profiles.handle, profiles.pen_name) as display_name
    from class
    join public.space_members on space_members.space_id = class.id and space_members.status = 'active'
    join public.profiles on profiles.id = space_members.user_id and profiles.deleted_at is null
    where space_members.user_id <> class.user_id
  ),
  -- Every chapter a pupil shares with this class now, with its two numbers.
  pieces as (
    select chapters.id as chapter_id, chapters.user_id, chapters.code, chapters.position,
           chapters.published_title, stories.slug as story_slug, stories.title as story_title,
           (select coalesce(sum(gifts.points), 0)::integer from public.class_point_gifts as gifts
            where gifts.chapter_id = chapters.id and gifts.space_id = class.id and gifts.removed_at is null) as class_points,
           (select marks.points from public.class_teacher_points as marks
            where marks.chapter_id = chapters.id and marks.space_id = class.id) as teacher_points,
           exists (select 1 from public.class_point_flags as flags
                   where flags.chapter_id = chapters.id and flags.kind = 'teacher_report'
                     and flags.closed_at is null) as is_reported
    from class
    join public.stories on stories.class_space_id = class.id and stories.class_only and stories.deleted_at is null
    join public.chapters on chapters.story_id = stories.id and chapters.status = 'published'
                        and chapters.deleted_at is null
    where not public.is_moderated_away('story', stories.id)
      and not public.is_moderated_away('chapter', chapters.id)
  )
  select jsonb_build_object('pupils', coalesce((
    select jsonb_agg(jsonb_build_object(
        'handle', pupils.handle,
        'display_name', pupils.display_name,
        'class_points', (select coalesce(sum(pieces.class_points), 0)::integer from pieces
                         where pieces.user_id = pupils.user_id),
        -- Teacher points on chapters and on assignment replies together.
        'teacher_points', (select coalesce(sum(marks.points), 0)::integer
                           from public.class_teacher_points as marks, class
                           where marks.space_id = class.id and marks.pupil_user_id = pupils.user_id),
        'chapters', (select coalesce(jsonb_agg(jsonb_build_object(
              'chapter_id', pieces.chapter_id,
              'story_slug', pieces.story_slug,
              'story_title', pieces.story_title,
              'chapter_code', pieces.code,
              'chapter_position', pieces.position,
              'chapter_title', pieces.published_title,
              'class_points', pieces.class_points,
              'teacher_points', pieces.teacher_points,
              'is_reported', pieces.is_reported)
            order by pieces.story_title, pieces.position), '[]'::jsonb)
          from pieces where pieces.user_id = pupils.user_id))
      order by pupils.display_name, pupils.handle)
    from pupils), '[]'::jsonb))
  from class;
$$;
comment on function public.class_points_table(text) is
  'The teacher''s table: each pupil''s class points and teacher points, with no rank and no givers (S1-E8-14).';
revoke execute on function public.class_points_table(text) from public, anon;
grant execute on function public.class_points_table(text) to authenticated;

/**
 * report_class_points: the teacher tells our moderators that a chapter's points look suspicious.
 * Inputs: target_chapter_id; why, an optional line for the moderators.
 * Returns: nothing. Reporting the same chapter again while a report is open changes nothing.
 * Errors: insufficient_privilege with hint 'signed_out' or 'points:not_teacher'; check_violation
 *   with hint 'points:not_offered' (no such chapter in a class with points on) or 'note:too_long',
 *   'note:html', 'note:link'.
 * Where it fits: "Report points as suspicious" in the teacher's table. The teacher never learns
 *   who gave the points: our moderators look and, if needed, remove gifts (S1-E8-16 criterion 2).
 */
create function public.report_class_points(target_chapter_id uuid, why text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  space public.spaces := public.class_points_chapter_space(target_chapter_id);
  writer_id uuid;
  clean_why text;
begin
  if space.id is null or not space.class_points_on then
    raise exception 'There are no class points here.' using errcode = 'check_violation', hint = 'points:not_offered';
  end if;
  if space.user_id is distinct from caller_id then
    raise exception 'Only the class''s teacher can report its points.'
      using errcode = 'insufficient_privilege', hint = 'points:not_teacher';
  end if;
  clean_why := public.check_class_note(why, 500);
  select chapters.user_id into writer_id from public.chapters where chapters.id = target_chapter_id;
  insert into public.class_point_flags (space_id, kind, chapter_id, reporter_user_id, note)
  values (space.id, 'teacher_report', target_chapter_id, caller_id, clean_why)
  on conflict (chapter_id) where kind = 'teacher_report' and closed_at is null do nothing;
  if found then
    perform public.log_space_action(space, 'class_points_reported', writer_id, null, null);
  end if;
end;
$$;
comment on function public.report_class_points(uuid, text) is
  'The teacher reports a chapter''s class points as suspicious to our moderators (S1-E8-16).';
revoke execute on function public.report_class_points(uuid, text) from public, anon;
grant execute on function public.report_class_points(uuid, text) to authenticated;

/* ---------- 8. Our moderators ---------- */

/**
 * admin_class_point_flags: the open class points flags, oldest first.
 * Returns: JSON [{id, kind, class: {slug, name}, chapter: {id, story_title, position, title} or
 *   null, writer_handle, pair: [handle, handle] or null, week_start, note, created_at}].
 * Errors: insufficient_privilege unless the caller is staff who may view moderation.
 * Where it fits: Staff › Schools › Class points.
 */
create function public.admin_class_point_flags()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('moderation', 'view') then
    raise exception 'Only the moderation team reads class points flags.' using errcode = 'insufficient_privilege';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
        'id', flags.id,
        'kind', flags.kind,
        'class', jsonb_build_object('slug', spaces.slug, 'name', spaces.name),
        'chapter', case when chapters.id is not null then jsonb_build_object(
          'id', chapters.id, 'story_title', stories.title, 'position', chapters.position,
          'title', chapters.published_title) end,
        'writer_handle', (select profiles.handle from public.profiles where profiles.id = chapters.user_id),
        'pair', case when flags.kind = 'pair' then jsonb_build_array(
          (select profiles.handle from public.profiles where profiles.id = flags.first_user_id),
          (select profiles.handle from public.profiles where profiles.id = flags.second_user_id)) end,
        'week_start', flags.week_start,
        'note', flags.note,
        'created_at', flags.created_at) order by flags.created_at), '[]'::jsonb)
    from public.class_point_flags as flags
    join public.spaces on spaces.id = flags.space_id
    left join public.chapters on chapters.id = flags.chapter_id
    left join public.stories on stories.id = chapters.story_id
    where flags.closed_at is null);
end;
$$;
comment on function public.admin_class_point_flags() is
  'Staff: the open class points flags, for the moderation team (S1-E8-16).';
revoke execute on function public.admin_class_point_flags() from public, anon;
grant execute on function public.admin_class_point_flags() to authenticated;

/**
 * admin_class_gifts: the class points gifts our moderators look into, with who gave them.
 * Inputs: target_chapter_id, for one chapter's gifts; or first_handle and second_handle, for the
 *   gifts two pupils gave each other (a pair flag). Give one or the other.
 * Returns: JSON [{id, giver_handle, receiver_handle, story_title, chapter_position, points, note,
 *   week_start, removed_at, removed_reason}], newest week first.
 * Errors: insufficient_privilege unless the caller is staff who may view moderation.
 * Where it fits: a flag's detail in Staff › Schools › Class points. Seeing who gave points is a
 *   sensitive read, so it is written to the audit log (architecture 1.8.3).
 */
create function public.admin_class_gifts(
  target_chapter_id uuid default null,
  first_handle text default null,
  second_handle text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  first_id uuid;
  second_id uuid;
begin
  if not public.staff_may('moderation', 'view') then
    raise exception 'Only the moderation team sees who gave class points.' using errcode = 'insufficient_privilege';
  end if;
  select profiles.id into first_id from public.profiles where profiles.handle = first_handle;
  select profiles.id into second_id from public.profiles where profiles.handle = second_handle;
  -- The sensitive read, logged before the answer.
  perform public.log_staff_action('class_points.givers_viewed', 'class_point_gifts',
    coalesce(target_chapter_id::text, first_handle || ' + ' || second_handle), first_id, null, null, null);
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
        'id', gifts.id,
        'giver_handle', givers.handle,
        'receiver_handle', receivers.handle,
        'story_title', stories.title,
        'chapter_position', chapters.position,
        'points', gifts.points,
        'note', gifts.note,
        'week_start', gifts.week_start,
        'removed_at', gifts.removed_at,
        'removed_reason', gifts.removed_reason) order by gifts.week_start desc, gifts.created_at), '[]'::jsonb)
    from public.class_point_gifts as gifts
    join public.profiles as givers on givers.id = gifts.user_id
    join public.profiles as receivers on receivers.id = gifts.receiver_user_id
    join public.chapters on chapters.id = gifts.chapter_id
    join public.stories on stories.id = chapters.story_id
    where (target_chapter_id is not null and gifts.chapter_id = target_chapter_id)
       or (target_chapter_id is null and first_id is not null and second_id is not null
           and ((gifts.user_id = first_id and gifts.receiver_user_id = second_id)
                or (gifts.user_id = second_id and gifts.receiver_user_id = first_id))));
end;
$$;
comment on function public.admin_class_gifts(uuid, text, text) is
  'Staff: a chapter''s or a pair''s class points gifts with their givers; the read is in the audit log (S1-E8-16).';
revoke execute on function public.admin_class_gifts(uuid, text, text) from public, anon;
grant execute on function public.admin_class_gifts(uuid, text, text) to authenticated;

/**
 * admin_remove_class_gift: one of our moderators removes a gift of class points.
 * Inputs: gift_id; reason, required.
 * Returns: nothing. The gift then counts for nothing; while its week is still open the giver has
 *   those points back, because removed gifts aren't counted as spent (criterion 2).
 * Errors: insufficient_privilege unless the caller is staff who may act in moderation;
 *   check_violation with hint 'reason:empty' or 'reason:too_long'; no_data_found with hint
 *   'gift:missing' when there is no such gift or it was removed already.
 * Where it fits: Staff › Schools › Class points. The class's log says that points were removed
 *   and why, never whose they were; the audit log has the giver.
 */
create function public.admin_remove_class_gift(gift_id uuid, reason text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  clean_reason text := btrim(coalesce(reason, ''));
  gift public.class_point_gifts;
  space public.spaces;
begin
  if not public.staff_may('moderation', 'act') then
    raise exception 'Only the moderation team removes class points.' using errcode = 'insufficient_privilege';
  end if;
  if clean_reason = '' then
    raise exception 'Say why.' using errcode = 'check_violation', hint = 'reason:empty';
  end if;
  if char_length(clean_reason) > 500 then
    raise exception 'At most 500 characters.' using errcode = 'check_violation', hint = 'reason:too_long';
  end if;
  update public.class_point_gifts as gifts
  set removed_at = now(), removed_by_user_id = (select auth.uid()), removed_reason = clean_reason
  where gifts.id = gift_id and gifts.removed_at is null
  returning gifts.* into gift;
  if gift.id is null then
    raise exception 'There is no such gift.' using errcode = 'no_data_found', hint = 'gift:missing';
  end if;
  select * into space from public.spaces where spaces.id = gift.space_id;
  -- The class's log: about the writer whose chapter lost points, with the reason, no giver.
  perform public.log_space_action(space, 'class_points_removed', gift.receiver_user_id, null, clean_reason,
    jsonb_build_object('points', gift.points));
  -- The audit log: the giver, for our own records only.
  perform public.log_staff_action('class_points.gift_removed', 'class_point_gifts', gift.id::text,
    gift.user_id, clean_reason, null, jsonb_build_object('points', gift.points, 'week_start', gift.week_start));
end;
$$;
comment on function public.admin_remove_class_gift(uuid, text) is
  'Staff: removes a gift of class points with a reason; logged in the class''s log and the audit log (S1-E8-16).';
revoke execute on function public.admin_remove_class_gift(uuid, text) from public, anon;
grant execute on function public.admin_remove_class_gift(uuid, text) to authenticated;

/**
 * admin_close_class_point_flag: one of our moderators closes a flag once it was looked into.
 * Input: flag_id.
 * Returns: nothing.
 * Errors: insufficient_privilege unless the caller is staff who may act in moderation;
 *   no_data_found with hint 'flag:missing'.
 * Where it fits: Staff › Schools › Class points. Written to the audit log.
 */
create function public.admin_close_class_point_flag(flag_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  flag public.class_point_flags;
begin
  if not public.staff_may('moderation', 'act') then
    raise exception 'Only the moderation team closes class points flags.' using errcode = 'insufficient_privilege';
  end if;
  update public.class_point_flags as flags
  set closed_at = now(), closed_by_user_id = (select auth.uid())
  where flags.id = flag_id and flags.closed_at is null
  returning flags.* into flag;
  if flag.id is null then
    raise exception 'There is no such open flag.' using errcode = 'no_data_found', hint = 'flag:missing';
  end if;
  perform public.log_staff_action('class_points.flag_closed', 'class_point_flags', flag.id::text,
    null, null, null, jsonb_build_object('kind', flag.kind));
end;
$$;
comment on function public.admin_close_class_point_flag(uuid) is
  'Staff: closes a class points flag once it was looked into; in the audit log (S1-E8-16).';
revoke execute on function public.admin_close_class_point_flag(uuid) from public, anon;
grant execute on function public.admin_close_class_point_flag(uuid) to authenticated;

/* ---------- 9. The weekly job: pupils who swap points ---------- */

/**
 * flag_class_point_pairs: flags two pupils who gave each other most of their points three weeks
 *   running (S1-E8-16 criterion 3).
 * Input: run_at, the moment to count from (now by default; the tests pass a date).
 * Returns: how many new flags it wrote.
 * How it counts: for each of the three weeks that ended before run_at, a pupil's "most" is more
 *   than half of all the points they gave in that class that week. A pair is flagged when each
 *   gave the other most of their points in all three weeks. Removed gifts don't count.
 * Errors: none. Where it fits: pg_cron, every Monday. Only our moderators see the flag; the
 *   teacher and the pupils are never told.
 */
create function public.flag_class_point_pairs(run_at timestamptz default now())
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  this_week date := public.class_points_week_start(run_at);
  new_flags integer;
begin
  with given as (
    -- What each pupil gave each classmate in each of the last three whole weeks.
    select gifts.space_id, gifts.week_start, gifts.user_id, gifts.receiver_user_id, sum(gifts.points) as points
    from public.class_point_gifts as gifts
    where gifts.removed_at is null
      and gifts.week_start in (this_week - 7, this_week - 14, this_week - 21)
    group by gifts.space_id, gifts.week_start, gifts.user_id, gifts.receiver_user_id
  ),
  totals as (
    select given.space_id, given.week_start, given.user_id, sum(given.points) as points
    from given group by given.space_id, given.week_start, given.user_id
  ),
  -- A week in which each of the two gave the other more than half of what they gave.
  swap_weeks as (
    select one.space_id, one.week_start, one.user_id as first_user_id, other.user_id as second_user_id
    from given as one
    join given as other
      on other.space_id = one.space_id and other.week_start = one.week_start
     and other.user_id = one.receiver_user_id and other.receiver_user_id = one.user_id
    join totals as one_total
      on one_total.space_id = one.space_id and one_total.week_start = one.week_start and one_total.user_id = one.user_id
    join totals as other_total
      on other_total.space_id = other.space_id and other_total.week_start = other.week_start and other_total.user_id = other.user_id
    where one.user_id < other.user_id
      and one.points * 2 > one_total.points
      and other.points * 2 > other_total.points
  ),
  pairs as (
    select swap_weeks.space_id, swap_weeks.first_user_id, swap_weeks.second_user_id
    from swap_weeks
    group by swap_weeks.space_id, swap_weeks.first_user_id, swap_weeks.second_user_id
    having count(*) = 3
  ),
  written as (
    insert into public.class_point_flags (space_id, kind, first_user_id, second_user_id, week_start)
    select pairs.space_id, 'pair', pairs.first_user_id, pairs.second_user_id, this_week - 7 from pairs
    on conflict (space_id, first_user_id, second_user_id, week_start) where kind = 'pair' do nothing
    returning 1
  )
  select count(*)::integer into new_flags from written;
  return new_flags;
end;
$$;
comment on function public.flag_class_point_pairs(timestamptz) is
  'Weekly job: flags pupils who gave each other most of their class points three weeks running, for moderators only (S1-E8-16).';
revoke execute on function public.flag_class_point_pairs(timestamptz) from public, anon, authenticated;

-- Every Monday at 02:20 UTC, after the week closed in every European time zone. Naming the job
-- makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('flag-class-point-pairs', '20 2 * * 1', 'select public.flag_class_point_pairs()');

/* ---------- 10. Leaving the class ---------- */

/**
 * forget_class_points_of_member: when someone leaves a class (or is removed, or their account is
 *   deleted), the points they gave come off their classmates' totals and the points and notes
 *   they received are deleted (S1-E8-16 criterion 6; GDPR art. 5(1)(c)).
 * Trigger: after a row of space_members is deleted. Returns nothing useful (an after trigger).
 * Errors: none.
 */
create function public.forget_class_points_of_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.class_point_gifts as gifts
  where gifts.space_id = old.space_id and (gifts.user_id = old.user_id or gifts.receiver_user_id = old.user_id);
  delete from public.class_teacher_points as marks
  where marks.space_id = old.space_id and marks.pupil_user_id = old.user_id;
  delete from public.class_chapter_opens as opens
  where opens.space_id = old.space_id and opens.user_id = old.user_id;
  delete from public.class_point_flags as flags
  where flags.space_id = old.space_id and flags.kind = 'pair'
    and (flags.first_user_id = old.user_id or flags.second_user_id = old.user_id);
  return null;
end;
$$;
comment on function public.forget_class_points_of_member() is
  'Trigger: deletes the class points a person gave and received when they leave a class (S1-E8-16).';
revoke execute on function public.forget_class_points_of_member() from public, anon, authenticated;

create trigger space_members_forget_class_points
  after delete on public.space_members
  for each row execute function public.forget_class_points_of_member();

/* ---------- 11. Retention ---------- */

/**
 * purge_class_points: deletes a class's points, notes, opens and flags once it has been archived
 *   for class_points_retention_days (30; S1-E8-16 criterion 5; GDPR art. 5(1)(e)). Certificates
 *   stay (S1-E8-12).
 * Returns: how many rows it deleted. Errors: none.
 * Where it fits: run_retention_jobs(), every night; docs/retention.md.
 */
create function public.purge_class_points()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  cutoff timestamptz := now() - make_interval(days => public.class_points_number('class_points_retention_days', 30));
  removed_now integer;
  removed_count integer := 0;
begin
  delete from public.class_point_gifts as gifts using public.spaces
  where spaces.id = gifts.space_id and spaces.archived_at < cutoff;
  get diagnostics removed_now = row_count;
  removed_count := removed_count + removed_now;
  delete from public.class_teacher_points as marks using public.spaces
  where spaces.id = marks.space_id and spaces.archived_at < cutoff;
  get diagnostics removed_now = row_count;
  removed_count := removed_count + removed_now;
  delete from public.class_chapter_opens as opens using public.spaces
  where spaces.id = opens.space_id and spaces.archived_at < cutoff;
  get diagnostics removed_now = row_count;
  removed_count := removed_count + removed_now;
  delete from public.class_point_flags as flags using public.spaces
  where spaces.id = flags.space_id and spaces.archived_at < cutoff;
  get diagnostics removed_now = row_count;
  return removed_count + removed_now;
end;
$$;
comment on function public.purge_class_points() is
  'Internal retention job: deletes class points, notes, opens and flags 30 days after the class is archived (S1-E8-16).';
revoke execute on function public.purge_class_points() from public, anon, authenticated;

/**
 * run_retention_jobs: as in ADMIN-2 e2b, plus purge_class_points (S1-E8-16), and with
 * purge_old_reading_minutes (IDEAS-1b) and purge_class_certificate_names (S1-E8-12) back in the
 * list: the abuse-image migration had rebuilt the list from an older copy and dropped them, so a
 * student's real name on a certificate was no longer deleted 30 days after the class was archived.
 */
create or replace function public.run_retention_jobs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_name text;
  removed_count integer;
  total_removed integer := 0;
begin
  -- Accounts first, so their exports and pictures are caught by the purges after them.
  foreach job_name in array array[
    'purge_unconfirmed_accounts', 'purge_expired_exports', 'purge_deleted_pictures',
    'purge_old_staff_records', 'purge_old_audit_log', 'fold_old_daily_totals',
    'purge_abuse_image_evidence', 'blank_old_scrambled_ips',
    'purge_old_reading_minutes', 'purge_class_certificate_names', 'purge_class_points']
  loop
    execute format('select public.%I()', job_name) into removed_count;
    perform public.record_retention_run(job_name, removed_count);
    total_removed := total_removed + removed_count;
  end loop;
  return total_removed;
end;
$$;

/* ---------- 12. The shared reporting contract: the two notes' branches ---------- */

/**
 * reportable_item_owner: as in GAPS-6, plus 'class_point_note' (only the chapter's writer can
 *   report a note they received) and 'class_teacher_note' (only the pupil it was written to).
 */
create or replace function public.reportable_item_owner(item_type public.reportable_type, item_reference text)
 RETURNS TABLE(item_id uuid, owner_user_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
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
    -- A reading list only while the reporter may see it: someone else's public list, so a private
    -- list's existence never leaks through the report form (GAPS-6).
    when 'reading_list' then
      return query
        select reading_lists.id, reading_lists.user_id from public.reading_lists
        where is_row_id and reading_lists.id = item_reference::uuid
          and reading_lists.is_public and public.reading_list_is_visible(reading_lists);
    -- A note with class points only for the chapter's writer, the one person who reads it, so
    -- nobody else can reach a note, or learn who wrote it, through the report form (S1-E8-13).
    when 'class_point_note' then
      return query
        select gifts.id, gifts.user_id from public.class_point_gifts as gifts
        where is_row_id and gifts.id = item_reference::uuid
          and gifts.note is not null and gifts.removed_at is null
          and gifts.receiver_user_id = (select auth.uid());
    -- A teacher's private note only for the pupil it was written to (S1-E8-14).
    when 'class_teacher_note' then
      return query
        select marks.id, marks.user_id from public.class_teacher_points as marks
        where is_row_id and marks.id = item_reference::uuid
          and marks.note is not null
          and marks.pupil_user_id = (select auth.uid());
  end case;
  if not found then
    raise exception 'There is no such % to report.', item_type using errcode = 'check_violation';
  end if;
end;
$$;

/**
 * reportable_item_summary: as in GAPS-6, and the two notes say where they were written and their
 *   first words.
 */
create or replace function public.reportable_item_summary(item_type public.reportable_type, item_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
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
    when 'reading_list' then
      select format('Reading list "%s"', reading_lists.name) into summary
      from public.reading_lists where reading_lists.id = item_id;
    when 'class_point_note' then
      select format('Note with class points on chapter %s of %s: %s', chapters.position, stories.title,
          case when char_length(gifts.note) > 80 then left(gifts.note, 80) || '…' else gifts.note end)
        into summary
      from public.class_point_gifts as gifts
      join public.chapters on chapters.id = gifts.chapter_id
      join public.stories on stories.id = chapters.story_id
      where gifts.id = item_id;
    when 'class_teacher_note' then
      select format('Teacher''s note in the class "%s": %s', spaces.name,
          case when char_length(marks.note) > 80 then left(marks.note, 80) || '…' else marks.note end)
        into summary
      from public.class_teacher_points as marks
      join public.spaces on spaces.id = marks.space_id
      where marks.id = item_id;
  end case;
  return coalesce(summary, '(gone)');
end;
$$;

/**
 * case_item_content: as in GAPS-6, plus the two notes, for the moderator's case page.
 */
create or replace function public.case_item_content(target public.cases)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
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
    -- A reading list's name, whether it is public and the titles in it (GAPS-6).
    when 'reading_list' then (select jsonb_build_object('name', reading_lists.name,
        'is_public', reading_lists.is_public, 'created_at', reading_lists.created_at,
        'stories', (select coalesce(jsonb_agg(stories.title order by entries.created_at), '[]'::jsonb)
          from public.reading_list_stories as entries
          join public.stories on stories.id = entries.story_id
          where entries.list_id = reading_lists.id))
        from public.reading_lists where reading_lists.id = target.item_id)
    -- A note with class points: its words, the points, the class and the chapter (S1-E8-13).
    when 'class_point_note' then (select jsonb_build_object('text', gifts.note, 'points', gifts.points,
        'class', spaces.name, 'story', stories.title, 'chapter_position', chapters.position,
        'created_at', gifts.created_at)
        from public.class_point_gifts as gifts
        join public.spaces on spaces.id = gifts.space_id
        join public.chapters on chapters.id = gifts.chapter_id
        join public.stories on stories.id = chapters.story_id
        where gifts.id = target.item_id)
    -- A teacher's private note to a pupil: its words, the points and the class (S1-E8-14).
    when 'class_teacher_note' then (select jsonb_build_object('text', marks.note, 'points', marks.points,
        'class', spaces.name, 'created_at', marks.created_at)
        from public.class_teacher_points as marks
        join public.spaces on spaces.id = marks.space_id
        where marks.id = target.item_id)
  end;
$$;

/* ---------- 13. Download my data and deleting an account ---------- */

/**
 * data_export_tables: as before, plus class_point_gifts (the points the person gave),
 *   class_teacher_points (the marks a teacher gave) and class_chapter_opens (the classmates'
 *   chapters they opened), all included.
 */
create or replace function public.data_export_tables()
 RETURNS TABLE(table_name text, is_included boolean, why_left_out text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $$
  values
    ('account_deletions', true, null),
    ('account_last_used', true, null),
    ('age_check_attempts', true, null),
    ('age_check_sessions', false, 'a short-lived link to a Yoti session, deleted once the result is stored; the result is in the account part'),
    ('appeals', true, null),
    ('blocks', true, null),
    ('canva_connections', false, 'holds the keys to the person''s own Canva account, which must never leave the server'),
    ('certificates', true, null),
    ('chapter_embeds', true, null),
    ('chapter_likes', true, null),
    ('chapter_moves', true, null),
    ('chapter_plan_characters', true, null),
    ('chapter_plans', true, null),
    ('chapter_revisions', true, null),
    ('chapter_scenes', true, null),
    ('chapters', true, null),
    ('class_chapter_opens', true, null),
    ('class_point_gifts', true, null),
    ('class_teacher_points', true, null),
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
    ('forum_post_votes', true, null),
    ('forum_thread_follows', true, null),
    ('forum_thread_reads', true, null),
    ('forum_threads', true, null),
    ('home_comment_picks', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
    ('landing_page_reminders', true, null),
    ('learning_path_progress', true, null),
    ('library_entries', true, null),
    ('live_session_reminders', true, null),
    ('manual_age_checks', true, null),
    ('member_last_active', true, null),
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
    ('reading_list_stories', true, null),
    ('reading_lists', true, null),
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
    ('story_archives', false, 'the stories of a closed account, kept for their writer; a person who brings them back gets them as their own stories'),
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
    ('waitlist_entries', true, null),
    ('writer_spotlights', true, null),
    ('writing_days', true, null),
    ('writer_ranks', false, 'worked out from the person''s published chapters, which are in the export; the rank itself shows on the profile');
$$;

/**
 * account_deletion_rules: as before, plus the three class points tables, deleted with the
 *   account. The points and notes a person received go when their membership rows are deleted
 *   (forget_class_points_of_member()).
 */
create or replace function public.account_deletion_rules()
 RETURNS TABLE(table_name text, action text, step integer, why text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $$
  values
    ('account_deletions', 'kept', 0, 'the record that the account was deleted, with no personal data in it'),
    ('account_last_used', 'delete', 1, null),
    ('age_check_attempts', 'delete', 1, null),
    ('age_check_sessions', 'delete', 1, null),
    ('appeals', 'kept', 0, 'a moderation record, kept as long as its statement of reasons and case (docs/retention.md)'),
    ('blocks', 'own_step', 0, 'deleted both ways: who the person blocked and who blocked them'),
    ('canva_connections', 'delete', 1, null),
    ('certificates', 'delete', 1, null),
    ('chapter_embeds', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_likes', 'delete', 1, null),
    ('chapter_moves', 'delete', 1, null),
    ('chapter_plan_characters', 'delete', 1, null),
    ('chapter_plans', 'delete', 2, null),
    ('chapter_revisions', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_scenes', 'delete', 1, null),
    ('chapters', 'own_step', 0, 'deleted unless under an open case'),
    ('class_chapter_opens', 'delete', 1, null),
    ('class_point_gifts', 'delete', 1, null),
    ('class_teacher_points', 'delete', 1, null),
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
    ('forum_post_votes', 'delete', 1, null),
    ('forum_thread_follows', 'delete', 1, null),
    ('forum_thread_reads', 'delete', 1, null),
    ('forum_threads', 'own_step', 0, 'deleted when nobody else posted in it; otherwise kept for the other people''s replies, its starter shown as a deleted account'),
    ('home_comment_picks', 'delete', 1, null),
    ('identity_link_requests', 'delete', 1, null),
    ('invites', 'kept', 0, 'invites staff made; purged 90 days after they expire (docs/retention.md)'),
    ('landing_page_reminders', 'delete', 1, null),
    ('learning_path_progress', 'delete', 1, null),
    ('library_entries', 'delete', 1, null),
    ('live_session_reminders', 'delete', 1, null),
    ('manual_age_checks', 'delete', 1, null),
    ('member_last_active', 'delete', 1, null),
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
    ('reading_list_stories', 'delete', 1, null),
    ('reading_lists', 'delete', 2, null),
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
    ('story_archives', 'kept', 0, 'the archive of an unused account''s stories, kept story_archive_years so the writer can bring them back (ARCHIVE-1)'),
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
    ('waitlist_entries', 'delete', 1, null),
    ('writer_ranks', 'delete', 1, null),
    ('writer_spotlights', 'delete', 1, null),
    ('writing_days', 'delete', 1, null);
$$;
