/*
 * Class competitions and a teacher's own criteria templates (bundle CLASS-POINTS, part 2; stories
 * S1-E8-15 and S1-E8-19; Robert, 13 Nov 2026, 19:01 to 19:40 UTC).
 *
 * What it builds:
 * - spaces.class_grade: the school year of a class, set by its teacher. A competition needs it,
 *   and below the 8th grade nobody is ever Winner or Finalist (decision 10).
 * - class_competitions and class_competition_criteria: a competition the teacher runs in their
 *   class, with a name, dates and 1 to 6 criteria. Every criterion has a label, a maximum, a
 *   description and 1 to 8 outcomes saying what the work must have (decision 13). Pupils read all
 *   of it from the start.
 * - class_competition_entrants: pupils choose to join; nobody is added automatically, and a pupil
 *   can leave before the competition ends (decision 17; Robert, 19:40 UTC).
 * - class_competition_scores and class_competition_results: after the end the teacher scores each
 *   entrant per criterion, assesses the entries and confirms exactly one Winner and any number of
 *   Finalists; every other entrant is a Contestant (the enum value 'participant'). The app never
 *   chooses or preselects anyone (GDPR art. 22: a person decides). The entrant with the most class
 *   points who isn't the Winner also gets "Readers' choice" (decision 16).
 * - class_criteria_templates: a teacher's own saved sets of criteria. We ship none (decision 14).
 * - Functions for everyone in the class: class_competitions(), join_class_competition(),
 *   leave_class_competition(). For the teacher: set_class_grade(), save_class_competition(),
 *   end_class_competition(), delete_class_competition(), class_competition_scoring(),
 *   save_class_competition_scores(), publish_class_competition(), my_criteria_templates(),
 *   save_criteria_template(), delete_criteria_template().
 * - Teacher points on an entrant's work from the competition's dates lock once its results are
 *   published (S1-E8-14 criterion 1), through a trigger on class_teacher_points.
 * - Reporting: a competition's name and criteria are words a teacher wrote for pupils, so the
 *   type 'class_competition' is reportable (CLAUDE.md rule 6) and a competition our moderators
 *   hid stops showing to the class.
 * - Retention: competitions go with the class's points 30 days after it is archived, and a
 *   pupil's entry, scores and result go when they leave the class (S1-E8-16 criteria 5 and 6).
 *
 * Who sees what: pupils read a competition, its criteria and whether they joined. After the
 * results are published the class sees one Winner card (competition, pen name, winning chapter)
 * and the Readers' choice pen names, never a score, a total or another result; each entrant also
 * reads their own result. Scores are the teacher's and are written to the class's log, which
 * only the teacher and our moderators read.
 *
 * Who calls it: src/features/class-competitions/.
 * Tests: supabase/tests/database/379-class-competitions.test.sql and
 * 380-class-competition-results.test.sql.
 */

/* ---------- 1. Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('class_competition_min_winner_grade', '8'::jsonb, true,
   'The lowest school year in which a class competition has a Winner and Finalists; below it every entrant is a Contestant (S1-E8-15; decided 13 Nov 2026).'),
  ('class_criteria_templates_max', '50'::jsonb, false,
   'The most criteria templates one teacher can keep (S1-E8-19; builder proposal).')
on conflict (key) do nothing;

/* ---------- 2. The grade of a class ---------- */

alter table public.spaces
  add column class_grade smallint,
  add constraint spaces_class_grade_range check (class_grade is null or class_grade between 1 and 13),
  add constraint spaces_class_grade_only_class check (class_grade is null or kind = 'class');

comment on column public.spaces.class_grade is
  'The school year of a class (1 to 13), set by its teacher; a class competition needs it, and below the 8th grade there is no Winner or Finalist (S1-E8-15).';

/* ---------- 3. The tables ---------- */

create table public.class_competitions (
  id uuid primary key default gen_random_uuid(),
  -- The teacher who runs it (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  space_id uuid not null references public.spaces (id) on delete cascade,
  -- Also printed as the programme on its certificates, so the same limit (S1-E8-17).
  name text not null constraint class_competitions_name_length check (char_length(name) between 1 and 120),
  starts_on date not null,
  ends_on date not null,
  -- Set when the teacher ends it before ends_on.
  ended_at timestamptz,
  -- Set when the teacher confirms the results; the competition is then locked.
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_competitions_dates_in_order check (ends_on >= starts_on)
);
comment on table public.class_competitions is
  'kind: user_content; reportable: class_competition
A competition a teacher runs in their class: a name, dates and criteria (S1-E8-15). Read through class_competitions(); pupils choose to join.';
-- One competition at a time: a class has at most one whose results aren't published yet.
create unique index class_competitions_one_running
  on public.class_competitions (space_id) where published_at is null;
create index class_competitions_space on public.class_competitions (space_id);
create index class_competitions_user_id on public.class_competitions (user_id);
create trigger class_competitions_set_updated_at
  before update on public.class_competitions
  for each row execute function public.set_updated_at();
create trigger class_competitions_refuse_user_id_change
  before update on public.class_competitions
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.class_competitions enable row level security;

-- Allows: the teacher who made the competition, reading their own rows (also for Download my
-- data). Why: it is their own work. Pupils read it through class_competitions(), which leaves out
-- a competition our moderators hid.
create policy class_competitions_select_own on public.class_competitions
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Allows: our moderation team. Why: a competition's name and criteria are content like any other,
-- and a reported one must be readable to decide on it (CLAUDE.md rule 6).
create policy class_competitions_select_moderators on public.class_competitions
  for select to authenticated
  using (public.staff_may('moderation', 'view'));

grant select on public.class_competitions to authenticated;

create table public.class_competition_criteria (
  id uuid primary key default gen_random_uuid(),
  -- The teacher who wrote it (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  competition_id uuid not null references public.class_competitions (id) on delete cascade,
  position smallint not null constraint class_competition_criteria_position check (position between 1 and 6),
  label text not null constraint class_competition_criteria_label_length check (char_length(label) between 1 and 80),
  max_points smallint not null constraint class_competition_criteria_max_points check (max_points between 1 and 100),
  description text not null constraint class_competition_criteria_description_length check (char_length(description) between 1 and 500),
  -- What the work must have, as bullets; each at most 200 characters, checked on save.
  outcomes text[] not null constraint class_competition_criteria_outcomes_count check (cardinality(outcomes) between 1 and 8),
  created_at timestamptz not null default now(),
  constraint class_competition_criteria_one_per_position unique (competition_id, position)
);
comment on table public.class_competition_criteria is
  'kind: user_content; reportable: class_competition
One grading criterion of a class competition: a label, a maximum, a description and 1 to 8 outcomes (S1-E8-15; Robert, 13 Nov 2026, 19:20 UTC). Reported with its competition.';
create index class_competition_criteria_user_id on public.class_competition_criteria (user_id);

alter table public.class_competition_criteria enable row level security;

-- Allows: the teacher who wrote the criteria, reading their own rows (also for Download my data).
-- Why: it is their own work. Pupils read criteria through class_competitions().
create policy class_competition_criteria_select_own on public.class_competition_criteria
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Allows: our moderation team. Why: criteria are reported with their competition.
create policy class_competition_criteria_select_moderators on public.class_competition_criteria
  for select to authenticated
  using (public.staff_may('moderation', 'view'));

grant select on public.class_competition_criteria to authenticated;

create table public.class_competition_entrants (
  id uuid primary key default gen_random_uuid(),
  -- The pupil who chose to join (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  competition_id uuid not null references public.class_competitions (id) on delete cascade,
  -- The class, kept here so leaving the class can find the row without a join.
  space_id uuid not null references public.spaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint class_competition_entrants_once unique (competition_id, user_id)
);
comment on table public.class_competition_entrants is
  'kind: user_action
That a pupil chose to join a class competition; nobody is added automatically, and leaving deletes the row (S1-E8-15; Robert, 13 Nov 2026, 19:40 UTC).';
create index class_competition_entrants_user_id on public.class_competition_entrants (user_id);
create index class_competition_entrants_space on public.class_competition_entrants (space_id);

alter table public.class_competition_entrants enable row level security;

-- Allows: the pupil, reading their own entries (Download my data). Why: it is their own choice.
-- The teacher reads who entered through class_competition_scoring().
create policy class_competition_entrants_select_own on public.class_competition_entrants
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.class_competition_entrants to authenticated;

create table public.class_competition_scores (
  id uuid primary key default gen_random_uuid(),
  -- The teacher who scored (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  competition_id uuid not null references public.class_competitions (id) on delete cascade,
  criterion_id uuid not null references public.class_competition_criteria (id) on delete cascade,
  -- The entrant the score is for.
  pupil_user_id uuid not null references public.profiles (id) on delete cascade,
  -- At most the criterion's maximum, checked on save.
  points smallint not null constraint class_competition_scores_points check (points between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_competition_scores_one_per_criterion unique (criterion_id, pupil_user_id),
  constraint class_competition_scores_not_own check (user_id <> pupil_user_id)
);
comment on table public.class_competition_scores is
  'kind: user_action
A teacher''s score for one entrant on one criterion of a class competition (S1-E8-15). Only the teacher and our moderators read scores; they are written to the class''s log when the results are published.';
create index class_competition_scores_competition on public.class_competition_scores (competition_id);
create index class_competition_scores_user_id on public.class_competition_scores (user_id);
create index class_competition_scores_pupil on public.class_competition_scores (pupil_user_id);
create trigger class_competition_scores_set_updated_at
  before update on public.class_competition_scores
  for each row execute function public.set_updated_at();

alter table public.class_competition_scores enable row level security;

-- Allows: the teacher who scored, reading their own rows (also for Download my data). Why: it is
-- their own marking. No pupil reads a score: the class sees only the Winner card.
create policy class_competition_scores_select_own on public.class_competition_scores
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.class_competition_scores to authenticated;

create table public.class_competition_results (
  id uuid primary key default gen_random_uuid(),
  -- The teacher who confirmed the result (CLAUDE.md rule 15; GDPR art. 22: a person decides).
  user_id uuid not null references public.profiles (id),
  competition_id uuid not null references public.class_competitions (id) on delete cascade,
  -- The entrant the result is for.
  pupil_user_id uuid not null references public.profiles (id) on delete cascade,
  -- 'participant' reads "Contestant" on every screen and certificate (decision 4).
  result public.certificate_result not null,
  -- "Readers' choice": the entrant with the most class points, when that isn't the Winner.
  readers_choice boolean not null default false,
  -- The Winner's chapter shown on the class's Winner card; null for everyone else.
  winning_chapter_id uuid references public.chapters (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint class_competition_results_one_per_pupil unique (competition_id, pupil_user_id),
  constraint class_competition_results_chapter_only_winner check (winning_chapter_id is null or result = 'winner'),
  constraint class_competition_results_not_own check (user_id <> pupil_user_id)
);
comment on table public.class_competition_results is
  'kind: user_action
The result the teacher confirmed for one entrant of a class competition: Winner, Finalist or Contestant, and whether they are the Readers'' choice (S1-E8-15). The class sees only the Winner card through class_competitions(); an entrant reads their own result there.';
-- Exactly one Winner at most: the database refuses a second.
create unique index class_competition_results_one_winner
  on public.class_competition_results (competition_id) where result = 'winner';
create index class_competition_results_user_id on public.class_competition_results (user_id);
create index class_competition_results_pupil on public.class_competition_results (pupil_user_id);
create index class_competition_results_chapter on public.class_competition_results (winning_chapter_id)
  where winning_chapter_id is not null;

alter table public.class_competition_results enable row level security;

-- Allows: the teacher who confirmed the results, reading their own rows (also for Download my
-- data). Why: it is their own decision. A pupil reads only their own result, through
-- class_competitions(), and never anyone else's.
create policy class_competition_results_select_own on public.class_competition_results
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.class_competition_results to authenticated;

create table public.class_criteria_templates (
  id uuid primary key default gen_random_uuid(),
  -- The teacher who saved it (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  name text not null constraint class_criteria_templates_name_length check (char_length(name) between 1 and 80),
  -- The criteria as check_class_criteria() cleaned them: [{label, max_points, description, outcomes}].
  criteria jsonb not null constraint class_criteria_templates_criteria_is_list check (jsonb_typeof(criteria) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.class_criteria_templates is
  'kind: user_action
A teacher''s own saved set of grading criteria, to start the next class competition from (S1-E8-19). Private to that teacher, so it is never shown to anyone else and has no Report button; we ship no ready-made templates (Robert, 13 Nov 2026, 19:21 UTC).';
create unique index class_criteria_templates_one_name
  on public.class_criteria_templates (user_id, lower(name));
create trigger class_criteria_templates_set_updated_at
  before update on public.class_criteria_templates
  for each row execute function public.set_updated_at();
create trigger class_criteria_templates_refuse_user_id_change
  before update on public.class_criteria_templates
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.class_criteria_templates enable row level security;

-- Allows: the teacher who saved the template. Why: it is their own material and nobody else's;
-- no other teacher, pupil or member of staff reads it (S1-E8-19 criterion 4).
create policy class_criteria_templates_select_own on public.class_criteria_templates
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.class_criteria_templates to authenticated;

/* ---------- 4. Small helpers ---------- */

/**
 * class_today: today's date where class weeks are counted (the setting class_points_timezone).
 * Returns: the date. Errors: none. Internal: a competition's dates are whole days in that zone.
 */
create function public.class_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone
    coalesce(public.setting_value('class_points_timezone') #>> '{}', 'Europe/Bucharest'))::date;
$$;
comment on function public.class_today() is
  'Internal: today''s date in the class points time zone (S1-E8-15).';
revoke execute on function public.class_today() from public, anon, authenticated;

/**
 * class_competition_phase: where a competition stands.
 * Input: target, the competition.
 * Returns: 'published' once the results are confirmed; 'judging' after its last day or once the
 *   teacher ended it; 'upcoming' before its first day; otherwise 'open'.
 * Errors: none. Internal.
 */
create function public.class_competition_phase(target public.class_competitions)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when target.published_at is not null then 'published'
    when target.ended_at is not null or public.class_today() > target.ends_on then 'judging'
    when public.class_today() < target.starts_on then 'upcoming'
    else 'open' end;
$$;
comment on function public.class_competition_phase(public.class_competitions) is
  'Internal: upcoming, open, judging or published (S1-E8-15).';
revoke execute on function public.class_competition_phase(public.class_competitions) from public, anon, authenticated;

/**
 * class_competition_last_day: the last day a competition ran: the day the teacher ended it, or
 *   its end date.
 * Input: target, the competition. Returns: the date. Errors: none. Internal.
 */
create function public.class_competition_last_day(target public.class_competitions)
returns date
language sql
stable
set search_path = ''
as $$
  select least(target.ends_on, coalesce((target.ended_at at time zone
    coalesce(public.setting_value('class_points_timezone') #>> '{}', 'Europe/Bucharest'))::date, target.ends_on));
$$;
comment on function public.class_competition_last_day(public.class_competitions) is
  'Internal: the last day a class competition ran (S1-E8-15).';
revoke execute on function public.class_competition_last_day(public.class_competitions) from public, anon, authenticated;

/**
 * class_winners_allowed: whether a class of this grade has a Winner and Finalists.
 * Input: grade, the class's school year, or null.
 * Returns: true from the setting class_competition_min_winner_grade (8) up; false below it and
 *   for a class with no grade (decision 10).
 * Errors: none. Internal.
 */
create function public.class_winners_allowed(grade smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(grade >= public.class_points_number('class_competition_min_winner_grade', 8), false);
$$;
comment on function public.class_winners_allowed(smallint) is
  'Internal: whether a class of this school year has a Winner and Finalists (S1-E8-15).';
revoke execute on function public.class_winners_allowed(smallint) from public, anon, authenticated;

/**
 * check_class_plain_text: one line of plain text a teacher typed, cleaned and checked.
 * Inputs: value; longest, the limit in characters; failure_hint, the hint to raise when it is
 *   empty or too long.
 * Returns: the text on one line, with Romanian letters written with the comma below.
 * Errors: check_violation with failure_hint, or with hint 'criteria:html' for an HTML tag
 *   (CLAUDE.md rule 8).
 * Internal: names, labels, descriptions and outcomes of competitions and templates.
 */
create function public.check_class_plain_text(value text, longest integer, failure_hint text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  clean text := btrim(regexp_replace(public.normalise_romanian_letters(coalesce(value, '')), '\s+', ' ', 'g'));
begin
  if char_length(clean) not between 1 and longest then
    raise exception 'Write 1 to % characters.', longest using errcode = 'check_violation', hint = failure_hint;
  end if;
  if public.has_html_tag(clean) then
    raise exception 'HTML tags are not allowed (CLAUDE.md rule 8).' using errcode = 'check_violation', hint = 'criteria:html';
  end if;
  return clean;
end;
$$;
comment on function public.check_class_plain_text(text, integer, text) is
  'Internal: one line of a teacher''s plain text, cleaned and checked (S1-E8-15, rule 8).';
revoke execute on function public.check_class_plain_text(text, integer, text) from public, anon, authenticated;

/**
 * check_class_criteria: the criteria a teacher typed, cleaned and checked.
 * Input: criteria, a JSON list of {label, max_points, description, outcomes: [text]}.
 * Returns: the same list, cleaned, in the order given.
 * Errors: check_violation with hint 'criteria:count' (not 1 to 6 criteria), 'criteria:label'
 *   (1 to 80 characters), 'criteria:points' (a whole number from 1 to 100), 'criteria:description'
 *   (1 to 500 characters), 'criteria:outcomes' (not 1 to 8 outcomes, or one that is empty or over
 *   200 characters: a criterion without an outcome can't be saved) or 'criteria:html'.
 * Internal: save_class_competition() and save_criteria_template().
 */
create function public.check_class_criteria(criteria jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  entry jsonb;
  outcome text;
  clean_outcomes text[];
  clean_list jsonb := '[]'::jsonb;
begin
  -- Step 1: 1 to 6 criteria.
  if jsonb_typeof(criteria) is distinct from 'array' or jsonb_array_length(criteria) not between 1 and 6 then
    raise exception 'Write 1 to 6 criteria.' using errcode = 'check_violation', hint = 'criteria:count';
  end if;
  -- Step 2: each criterion in turn.
  for entry in select value from jsonb_array_elements(criteria) loop
    if coalesce(entry ->> 'max_points', '') !~ '^\d{1,3}$' or (entry ->> 'max_points')::integer not between 1 and 100 then
      raise exception 'A criterion is worth 1 to 100 points.' using errcode = 'check_violation', hint = 'criteria:points';
    end if;
    if jsonb_typeof(entry -> 'outcomes') is distinct from 'array'
       or jsonb_array_length(entry -> 'outcomes') not between 1 and 8 then
      raise exception 'A criterion has 1 to 8 outcomes.' using errcode = 'check_violation', hint = 'criteria:outcomes';
    end if;
    clean_outcomes := '{}';
    for outcome in select value from jsonb_array_elements_text(entry -> 'outcomes') loop
      clean_outcomes := clean_outcomes || public.check_class_plain_text(outcome, 200, 'criteria:outcomes');
    end loop;
    clean_list := clean_list || jsonb_build_object(
      'label', public.check_class_plain_text(entry ->> 'label', 80, 'criteria:label'),
      'max_points', (entry ->> 'max_points')::integer,
      'description', public.check_class_plain_text(entry ->> 'description', 500, 'criteria:description'),
      'outcomes', to_jsonb(clean_outcomes));
  end loop;
  return clean_list;
end;
$$;
comment on function public.check_class_criteria(jsonb) is
  'Internal: a teacher''s criteria, cleaned and checked: 1 to 6, each with 1 to 8 outcomes (S1-E8-15).';
revoke execute on function public.check_class_criteria(jsonb) from public, anon, authenticated;

/**
 * class_competition_for_teacher: a competition and its class, for the class's teacher only.
 * Input: target_competition_id.
 * Returns: the competition's row, locked for the change that follows.
 * Errors: insufficient_privilege with hint 'signed_out'; no_data_found with hint
 *   'competition:missing' when there is none or the caller isn't the teacher of its class (the
 *   same answer, so nobody learns of a competition in a class they aren't in).
 * Internal: every teacher function below starts here.
 */
create function public.class_competition_for_teacher(target_competition_id uuid)
returns public.class_competitions
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  competition public.class_competitions;
begin
  select competitions.* into competition
  from public.class_competitions as competitions
  join public.spaces on spaces.id = competitions.space_id
  where competitions.id = target_competition_id and spaces.user_id = caller_id
    and spaces.deleted_at is null
  for update of competitions;
  if competition.id is null then
    raise exception 'There is no such competition.' using errcode = 'no_data_found', hint = 'competition:missing';
  end if;
  return competition;
end;
$$;
comment on function public.class_competition_for_teacher(uuid) is
  'Internal: a class competition, for the teacher of its class only (S1-E8-15).';
revoke execute on function public.class_competition_for_teacher(uuid) from public, anon, authenticated;

/**
 * class_competition_class_points: the class points an entrant received during a competition.
 * Inputs: competition; pupil_id.
 * Returns: the points classmates gave to the pupil's chapters in that class from the
 *   competition's first day to its last, gifts our moderators removed left out.
 * Errors: none. Internal: the teacher's guide column and "Readers' choice".
 */
create function public.class_competition_class_points(competition public.class_competitions, pupil_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(gifts.points), 0)::integer
  from public.class_point_gifts as gifts
  where gifts.space_id = competition.space_id and gifts.receiver_user_id = pupil_id
    and gifts.removed_at is null
    and (gifts.created_at at time zone
         coalesce(public.setting_value('class_points_timezone') #>> '{}', 'Europe/Bucharest'))::date
        between competition.starts_on and public.class_competition_last_day(competition);
$$;
comment on function public.class_competition_class_points(public.class_competitions, uuid) is
  'Internal: the class points an entrant received during a class competition (S1-E8-15).';
revoke execute on function public.class_competition_class_points(public.class_competitions, uuid) from public, anon, authenticated;

/* ---------- 5. The grade ---------- */

/**
 * set_class_grade: the teacher says which school year their class is.
 * Inputs: slug, the class's address; grade, 1 to 13.
 * Returns: class_competitions() after the change.
 * Errors: as space_for_power(); check_violation with hint 'space:not_class', 'space:archived',
 *   'grade:range', or 'grade:running' while a competition's results aren't published yet (the
 *   grade decides whether it has a Winner, so it can't move under a running competition).
 * Where it fits: the Class competition card in the class's settings. Written to the class's log.
 */
create function public.set_class_grade(slug text, grade integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(slug, 'settings');
begin
  -- Step 1: a live class, and a real school year.
  perform public.check_certificate_class(space);
  if grade is null or grade not between 1 and 13 then
    raise exception 'A school year is 1 to 13.' using errcode = 'check_violation', hint = 'grade:range';
  end if;
  -- Step 2: not under a running competition.
  if space.class_grade is distinct from grade and exists (
       select 1 from public.class_competitions as competitions
       where competitions.space_id = space.id and competitions.published_at is null) then
    raise exception 'Finish or delete the competition first.' using errcode = 'check_violation', hint = 'grade:running';
  end if;
  -- Step 3: save it and write it in the class's log, only when it changes.
  if space.class_grade is distinct from grade then
    update public.spaces set class_grade = grade, updated_at = now() where spaces.id = space.id;
    perform public.log_space_action(space, 'class_grade_set', null, null, null, jsonb_build_object('grade', grade));
  end if;
  return public.class_competitions(slug);
end;
$$;
comment on function public.set_class_grade(text, integer) is
  'The teacher sets the school year of their class; a class competition needs it (S1-E8-15).';
revoke execute on function public.set_class_grade(text, integer) from public, anon;
grant execute on function public.set_class_grade(text, integer) to authenticated;

/* ---------- 6. Reading competitions ---------- */

/**
 * class_competition_criteria_json: a competition's criteria in order.
 * Input: target_competition_id.
 * Returns: a JSON list of {id, label, max_points, description, outcomes}.
 * Errors: none. Internal.
 */
create function public.class_competition_criteria_json(target_competition_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', criteria.id, 'label', criteria.label, 'max_points', criteria.max_points,
    'description', criteria.description, 'outcomes', to_jsonb(criteria.outcomes))
    order by criteria.position), '[]'::jsonb)
  from public.class_competition_criteria as criteria
  where criteria.competition_id = target_competition_id;
$$;
comment on function public.class_competition_criteria_json(uuid) is
  'Internal: a class competition''s criteria in order (S1-E8-15).';
revoke execute on function public.class_competition_criteria_json(uuid) from public, anon, authenticated;

/**
 * class_competition_running_json: the competition whose results aren't published yet, for the
 *   person looking.
 * Inputs: competition; space, its class; is_teacher.
 * Returns: JSON {id, name, starts_on, ends_on, phase, criteria, is_entrant, can_join, can_leave,
 *   entrant_count, can_edit, can_end, can_score}. A pupil gets is_entrant, can_join and can_leave;
 *   the teacher gets entrant_count, can_edit (before anyone joined or before it starts), can_end
 *   (while open) and can_score (while judging).
 * Errors: none. Internal: class_competitions().
 */
create function public.class_competition_running_json(competition public.class_competitions, space public.spaces, is_teacher boolean)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  phase text := public.class_competition_phase(competition);
  entrant_count integer;
  is_entrant boolean;
  may_take_part boolean;
begin
  select count(*), coalesce(bool_or(entrants.user_id = caller_id), false) into entrant_count, is_entrant
  from public.class_competition_entrants as entrants where entrants.competition_id = competition.id;
  -- A pupil joins or leaves before the end, in a class that is still open, as a full member.
  may_take_part := not is_teacher and phase in ('upcoming', 'open')
    and not public.space_is_locked(space) and public.is_active_member();
  return jsonb_build_object(
    'id', competition.id, 'name', competition.name,
    'starts_on', competition.starts_on, 'ends_on', competition.ends_on, 'phase', phase,
    'criteria', public.class_competition_criteria_json(competition.id),
    'is_entrant', case when not is_teacher then is_entrant end,
    'can_join', may_take_part and not is_entrant,
    'can_leave', may_take_part and is_entrant,
    'entrant_count', case when is_teacher then entrant_count end,
    'can_edit', is_teacher and (phase = 'upcoming' or (phase = 'open' and entrant_count = 0)),
    'can_end', is_teacher and phase = 'open',
    'can_score', is_teacher and phase = 'judging');
end;
$$;
comment on function public.class_competition_running_json(public.class_competitions, public.spaces, boolean) is
  'Internal: the running class competition as the person looking may see it (S1-E8-15).';
revoke execute on function public.class_competition_running_json(public.class_competitions, public.spaces, boolean) from public, anon, authenticated;

/**
 * class_competition_card_json: the Winner card of a competition whose results are published.
 * Inputs: competition; is_teacher.
 * Returns: JSON {id, name, published_on, winner (the Winner's pen name, or null below the 8th
 *   grade), winning_chapter ({title, story_title, story_slug, chapter_code}, or null),
 *   readers_choice (pen names), my_result ('winner', 'finalist' or 'participant' for an entrant
 *   looking at their own; null otherwise), my_readers_choice, has_results (for the teacher: the
 *   certificates can be made from it)}. No score, no total and no other pupil's result
 *   (S1-E8-15 criterion 11).
 * Errors: none. Internal: class_competitions().
 */
create function public.class_competition_card_json(competition public.class_competitions, is_teacher boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', competition.id, 'name', competition.name,
    'published_on', (competition.published_at at time zone
      coalesce(public.setting_value('class_points_timezone') #>> '{}', 'Europe/Bucharest'))::date,
    'winner', (
      select public.display_name(profiles.handle, profiles.pen_name)
      from public.class_competition_results as results
      join public.profiles on profiles.id = results.pupil_user_id
      where results.competition_id = competition.id and results.result = 'winner'),
    'winning_chapter', (
      select jsonb_build_object('title', chapters.published_title, 'story_title', stories.title,
                                'story_slug', stories.slug, 'chapter_code', chapters.code)
      from public.class_competition_results as results
      join public.chapters on chapters.id = results.winning_chapter_id
      join public.stories on stories.id = chapters.story_id
      where results.competition_id = competition.id and results.result = 'winner'
        and public.chapter_is_readable(chapters.id)),
    'readers_choice', (
      select coalesce(jsonb_agg(public.display_name(profiles.handle, profiles.pen_name)
                                order by public.display_name(profiles.handle, profiles.pen_name)), '[]'::jsonb)
      from public.class_competition_results as results
      join public.profiles on profiles.id = results.pupil_user_id
      where results.competition_id = competition.id and results.readers_choice),
    'my_result', (
      select results.result from public.class_competition_results as results
      where results.competition_id = competition.id and results.pupil_user_id = (select auth.uid())),
    'my_readers_choice', coalesce((
      select results.readers_choice from public.class_competition_results as results
      where results.competition_id = competition.id and results.pupil_user_id = (select auth.uid())), false),
    'has_results', is_teacher);
$$;
comment on function public.class_competition_card_json(public.class_competitions, boolean) is
  'Internal: the Winner card of a published class competition: pen names only, no scores (S1-E8-15).';
revoke execute on function public.class_competition_card_json(public.class_competitions, boolean) from public, anon, authenticated;

/**
 * class_competitions: what a class page says about competitions to the person looking.
 * Input: slug, the class's address.
 * Returns: null for anyone who isn't the teacher or a pupil who may read the class. Otherwise JSON
 *   {role ('teacher' or 'pupil'), grade, winners_allowed, is_archived, today (today's date where
 *   class weeks are counted, so the form starts on a day the database accepts whatever the
 *   device's clock says), running (the competition
 *   whose results aren't published yet, see class_competition_running_json(), or null),
 *   published (Winner cards, newest first, see class_competition_card_json())}. A competition our
 *   moderators hid is left out for pupils.
 * Errors: none. Where it fits: ClassCompetitionCard on the class page and every competition
 *   screen.
 */
create function public.class_competitions(slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  space public.spaces;
  is_teacher boolean;
  running public.class_competitions;
begin
  -- Step 1: the class, for its teacher and its pupils only.
  select * into space from public.spaces
  where spaces.slug = class_competitions.slug and spaces.kind = 'class' and spaces.deleted_at is null;
  if caller_id is null or space.id is null or not public.space_may_read(space) then
    return null;
  end if;
  is_teacher := space.user_id = caller_id;
  if not is_teacher and not public.class_points_is_pupil(space, caller_id) then
    return null;
  end if;
  -- Step 2: the running competition, unless our moderators hid it from the class.
  select competitions.* into running from public.class_competitions as competitions
  where competitions.space_id = space.id and competitions.published_at is null
    and (is_teacher or not public.is_moderated_away('class_competition', competitions.id));
  -- Step 3: the answer, with the Winner cards newest first.
  return jsonb_build_object(
    'role', case when is_teacher then 'teacher' else 'pupil' end,
    'grade', space.class_grade,
    'winners_allowed', public.class_winners_allowed(space.class_grade),
    'is_archived', space.archived_at is not null,
    'today', public.class_today(),
    'running', case when running.id is not null then
      public.class_competition_running_json(running, space, is_teacher) end,
    'published', (
      select coalesce(jsonb_agg(public.class_competition_card_json(competitions, is_teacher)
                                order by competitions.published_at desc), '[]'::jsonb)
      from public.class_competitions as competitions
      where competitions.space_id = space.id and competitions.published_at is not null
        and (is_teacher or not public.is_moderated_away('class_competition', competitions.id))));
end;
$$;
comment on function public.class_competitions(text) is
  'Class competitions on a class page: the running one with its criteria, and the Winner cards (S1-E8-15).';
revoke execute on function public.class_competitions(text) from public, anon;
grant execute on function public.class_competitions(text) to authenticated;

/* ---------- 7. The teacher makes, changes, ends and deletes a competition ---------- */

/**
 * save_class_competition: the teacher starts a class competition, or changes one nobody joined.
 * Inputs: slug, the class's address; details, JSON {name, starts_on, ends_on, criteria} with
 *   criteria as check_class_criteria() takes them; target_competition_id, the competition to
 *   change, or null for a new one.
 * Returns: class_competitions() after the change.
 * Errors: as space_for_power(); insufficient_privilege with hint 'competition:not_teacher' for
 *   anyone but the class's teacher; check_violation with hint 'space:not_class',
 *   'space:archived', 'competition:grade' (the class has no school year yet), 'competition:name',
 *   'competition:dates' (not real dates, the end before the start, a new one starting in the past,
 *   or an end after the day the class closes), 'competition:exists' (one is still running),
 *   'competition:started' (it has entrants or is over, so it can't change) or any 'criteria:…'
 *   hint; no_data_found with hint 'competition:missing'.
 * Where it fits: the competition form. Written to the class's log.
 */
create function public.save_class_competition(slug text, details jsonb, target_competition_id uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(slug, 'settings');
  caller_id uuid := (select auth.uid());
  clean_name text;
  clean_criteria jsonb;
  first_day date;
  last_day date;
  existing public.class_competitions;
  saved_id uuid;
begin
  -- Step 1: a live class with a school year, and only its own teacher.
  perform public.check_certificate_class(space);
  if space.user_id is distinct from caller_id then
    raise exception 'Only the class''s teacher runs its competitions.'
      using errcode = 'insufficient_privilege', hint = 'competition:not_teacher';
  end if;
  if space.class_grade is null then
    raise exception 'Say which school year the class is first.' using errcode = 'check_violation', hint = 'competition:grade';
  end if;
  -- Step 2: the name, the criteria and the dates.
  clean_name := public.check_class_plain_text(details ->> 'name', 120, 'competition:name');
  clean_criteria := public.check_class_criteria(details -> 'criteria');
  begin
    first_day := (details ->> 'starts_on')::date;
    last_day := (details ->> 'ends_on')::date;
  exception when others then
    first_day := null;
  end;
  if first_day is null or last_day is null or last_day < first_day
     or (space.locks_at is not null and last_day >= (space.locks_at at time zone
           coalesce(public.setting_value('class_points_timezone') #>> '{}', 'Europe/Bucharest'))::date) then
    raise exception 'Choose a start and an end before the class closes.' using errcode = 'check_violation', hint = 'competition:dates';
  end if;
  -- Step 3: a new competition, or one that nobody has joined yet.
  if target_competition_id is null then
    if first_day < public.class_today() then
      raise exception 'A competition can''t start in the past.' using errcode = 'check_violation', hint = 'competition:dates';
    end if;
    if exists (select 1 from public.class_competitions as competitions
               where competitions.space_id = space.id and competitions.published_at is null) then
      raise exception 'This class already has a competition running.' using errcode = 'check_violation', hint = 'competition:exists';
    end if;
    insert into public.class_competitions (user_id, space_id, name, starts_on, ends_on)
    values (caller_id, space.id, clean_name, first_day, last_day)
    returning id into saved_id;
  else
    existing := public.class_competition_for_teacher(target_competition_id);
    if existing.space_id <> space.id then
      raise exception 'There is no such competition.' using errcode = 'no_data_found', hint = 'competition:missing';
    end if;
    if public.class_competition_phase(existing) not in ('upcoming', 'open')
       or (public.class_competition_phase(existing) = 'open' and exists (
             select 1 from public.class_competition_entrants as entrants
             where entrants.competition_id = existing.id)) then
      raise exception 'Pupils have joined, so it can''t change.' using errcode = 'check_violation', hint = 'competition:started';
    end if;
    update public.class_competitions set name = clean_name, starts_on = first_day, ends_on = last_day
    where class_competitions.id = existing.id;
    delete from public.class_competition_criteria as criteria where criteria.competition_id = existing.id;
    saved_id := existing.id;
  end if;
  -- Step 4: the criteria, in the order typed.
  insert into public.class_competition_criteria (user_id, competition_id, position, label, max_points, description, outcomes)
  select caller_id, saved_id, entries.position, entries.value ->> 'label', (entries.value ->> 'max_points')::smallint,
         entries.value ->> 'description',
         array(select jsonb_array_elements_text(entries.value -> 'outcomes'))
  from jsonb_array_elements(clean_criteria) with ordinality as entries (value, position);
  -- Step 5: the class's log.
  perform public.log_space_action(space,
    case when target_competition_id is null then 'competition_started' else 'competition_changed' end,
    null, null, null, jsonb_build_object('name', clean_name, 'starts_on', first_day, 'ends_on', last_day));
  return public.class_competitions(slug);
end;
$$;
comment on function public.save_class_competition(text, jsonb, uuid) is
  'The teacher starts a class competition with a name, dates and 1 to 6 criteria, or changes one nobody joined (S1-E8-15).';
revoke execute on function public.save_class_competition(text, jsonb, uuid) from public, anon;
grant execute on function public.save_class_competition(text, jsonb, uuid) to authenticated;

/**
 * end_class_competition: the teacher ends an open competition today, before its end date.
 * Input: target_competition_id.
 * Returns: class_competitions() after the change.
 * Errors: as class_competition_for_teacher(); check_violation with hint 'competition:not_open'.
 * Where it fits: "End the competition now" on the competition page. Written to the class's log.
 */
create function public.end_class_competition(target_competition_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  competition public.class_competitions := public.class_competition_for_teacher(target_competition_id);
  space public.spaces;
begin
  if public.class_competition_phase(competition) <> 'open' then
    raise exception 'Only an open competition can be ended.' using errcode = 'check_violation', hint = 'competition:not_open';
  end if;
  select * into space from public.spaces where spaces.id = competition.space_id;
  update public.class_competitions set ended_at = now() where class_competitions.id = competition.id;
  perform public.log_space_action(space, 'competition_ended', null, null, null,
    jsonb_build_object('name', competition.name));
  return public.class_competitions(space.slug);
end;
$$;
comment on function public.end_class_competition(uuid) is
  'The teacher ends an open class competition before its end date (S1-E8-15).';
revoke execute on function public.end_class_competition(uuid) from public, anon;
grant execute on function public.end_class_competition(uuid) to authenticated;

/**
 * delete_class_competition: the teacher deletes a competition whose results aren't published.
 * Input: target_competition_id.
 * Returns: class_competitions() after the change.
 * Errors: as class_competition_for_teacher(); check_violation with hint 'competition:published'
 *   (published results stay until the class's points are deleted).
 * Where it fits: "Delete the competition" on the competition page. Entries and scores go with it.
 *   Written to the class's log.
 */
create function public.delete_class_competition(target_competition_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  competition public.class_competitions := public.class_competition_for_teacher(target_competition_id);
  space public.spaces;
begin
  if competition.published_at is not null then
    raise exception 'Published results can''t be deleted.' using errcode = 'check_violation', hint = 'competition:published';
  end if;
  select * into space from public.spaces where spaces.id = competition.space_id;
  delete from public.class_competitions where class_competitions.id = competition.id;
  perform public.log_space_action(space, 'competition_deleted', null, null, null,
    jsonb_build_object('name', competition.name));
  return public.class_competitions(space.slug);
end;
$$;
comment on function public.delete_class_competition(uuid) is
  'The teacher deletes a class competition whose results aren''t published (S1-E8-15).';
revoke execute on function public.delete_class_competition(uuid) from public, anon;
grant execute on function public.delete_class_competition(uuid) to authenticated;

/* ---------- 8. Pupils join and leave ---------- */

/**
 * class_competition_for_pupil: a competition a pupil may join or leave now.
 * Input: target_competition_id.
 * Returns: the competition's row.
 * Errors: insufficient_privilege with hint 'signed_out'; no_data_found with hint
 *   'competition:missing' when there is none, our moderators hid it or the caller isn't a pupil of
 *   its class; check_violation with hint 'competition:closed' when it has ended, the class is
 *   locked or the caller isn't a full member (the account gate).
 * Internal: join_class_competition() and leave_class_competition().
 */
create function public.class_competition_for_pupil(target_competition_id uuid)
returns public.class_competitions
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  competition public.class_competitions;
  space public.spaces;
begin
  select * into competition from public.class_competitions as competitions
  where competitions.id = target_competition_id;
  select * into space from public.spaces where spaces.id = competition.space_id and spaces.deleted_at is null;
  if competition.id is null or space.id is null or not public.space_may_read(space)
     or not public.class_points_is_pupil(space, caller_id)
     or public.is_moderated_away('class_competition', competition.id) then
    raise exception 'There is no such competition.' using errcode = 'no_data_found', hint = 'competition:missing';
  end if;
  if public.class_competition_phase(competition) not in ('upcoming', 'open')
     or public.space_is_locked(space) or not public.is_active_member() then
    raise exception 'This competition is closed.' using errcode = 'check_violation', hint = 'competition:closed';
  end if;
  return competition;
end;
$$;
comment on function public.class_competition_for_pupil(uuid) is
  'Internal: a class competition a pupil may join or leave now (S1-E8-15).';
revoke execute on function public.class_competition_for_pupil(uuid) from public, anon, authenticated;

/**
 * join_class_competition: a pupil chooses to join their class's competition.
 * Input: target_competition_id.
 * Returns: class_competitions() after the change.
 * Errors: as class_competition_for_pupil().
 * Where it fits: "Join the competition" on the class page and the competition page. Nobody is
 *   ever added by anyone else (Robert, 13 Nov 2026, 19:40 UTC). Joining twice changes nothing.
 */
create function public.join_class_competition(target_competition_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  competition public.class_competitions := public.class_competition_for_pupil(target_competition_id);
begin
  insert into public.class_competition_entrants (user_id, competition_id, space_id)
  values ((select auth.uid()), competition.id, competition.space_id)
  on conflict (competition_id, user_id) do nothing;
  return public.class_competitions((select spaces.slug from public.spaces where spaces.id = competition.space_id));
end;
$$;
comment on function public.join_class_competition(uuid) is
  'A pupil chooses to join their class''s competition; nobody is added automatically (S1-E8-15).';
revoke execute on function public.join_class_competition(uuid) from public, anon;
grant execute on function public.join_class_competition(uuid) to authenticated;

/**
 * leave_class_competition: a pupil leaves a competition before it ends.
 * Input: target_competition_id.
 * Returns: class_competitions() after the change.
 * Errors: as class_competition_for_pupil().
 * Where it fits: "Leave the competition" on the competition page. The entry is deleted.
 */
create function public.leave_class_competition(target_competition_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  competition public.class_competitions := public.class_competition_for_pupil(target_competition_id);
begin
  delete from public.class_competition_entrants as entrants
  where entrants.competition_id = competition.id and entrants.user_id = (select auth.uid());
  return public.class_competitions((select spaces.slug from public.spaces where spaces.id = competition.space_id));
end;
$$;
comment on function public.leave_class_competition(uuid) is
  'A pupil leaves their class''s competition before it ends (S1-E8-15).';
revoke execute on function public.leave_class_competition(uuid) from public, anon;
grant execute on function public.leave_class_competition(uuid) to authenticated;

/* ---------- 9. Scoring and results ---------- */

/**
 * class_competition_scoring: everything the teacher needs to score the entrants.
 * Input: target_competition_id.
 * Returns: JSON {id, name, phase, class_slug, winners_allowed, criteria, entrants}. Each entrant
 *   is {handle, display_name, class_points and teacher_points (guides only: what the pupil
 *   received in the class during the competition), chapters (their published chapters shared with
 *   the class: {id, title, story_title, position}), scores ({criterion id: points}), result and
 *   readers_choice (once published)}, by name. There is no rank, no order by points and no
 *   suggestion of a Winner: the teacher decides (GDPR art. 22).
 * Errors: as class_competition_for_teacher().
 * Where it fits: the results page.
 */
create function public.class_competition_scoring(target_competition_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  competition public.class_competitions := public.class_competition_for_teacher(target_competition_id);
  space public.spaces;
begin
  select * into space from public.spaces where spaces.id = competition.space_id;
  return jsonb_build_object(
    'id', competition.id, 'name', competition.name,
    'phase', public.class_competition_phase(competition),
    'class_slug', space.slug,
    'winners_allowed', public.class_winners_allowed(space.class_grade),
    'criteria', public.class_competition_criteria_json(competition.id),
    'entrants', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'handle', profiles.handle,
        'display_name', public.display_name(profiles.handle, profiles.pen_name),
        'class_points', public.class_competition_class_points(competition, profiles.id),
        'teacher_points', (
          select coalesce(sum(marks.points), 0)::integer from public.class_teacher_points as marks
          where marks.space_id = space.id and marks.pupil_user_id = profiles.id),
        'chapters', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', chapters.id, 'title', chapters.published_title, 'story_title', stories.title,
            'position', chapters.position) order by stories.title, chapters.position), '[]'::jsonb)
          from public.chapters join public.stories on stories.id = chapters.story_id
          where chapters.user_id = profiles.id and stories.class_only and stories.class_space_id = space.id
            and chapters.status = 'published' and chapters.deleted_at is null and stories.deleted_at is null),
        'scores', (
          select coalesce(jsonb_object_agg(scores.criterion_id, scores.points), '{}'::jsonb)
          from public.class_competition_scores as scores
          where scores.competition_id = competition.id and scores.pupil_user_id = profiles.id),
        'result', results.result,
        'readers_choice', coalesce(results.readers_choice, false))
        order by public.display_name(profiles.handle, profiles.pen_name), profiles.handle), '[]'::jsonb)
      from public.class_competition_entrants as entrants
      join public.profiles on profiles.id = entrants.user_id
      left join public.class_competition_results as results
        on results.competition_id = competition.id and results.pupil_user_id = profiles.id
      where entrants.competition_id = competition.id));
end;
$$;
comment on function public.class_competition_scoring(uuid) is
  'For the teacher: a class competition''s entrants by name with their scores and the guide numbers, never a rank (S1-E8-15).';
revoke execute on function public.class_competition_scoring(uuid) from public, anon;
grant execute on function public.class_competition_scoring(uuid) to authenticated;

/**
 * class_competition_entrant_id: the entrant of a competition with this username.
 * Inputs: competition; typed_handle.
 * Returns: the pupil's user ID.
 * Errors: check_violation with hint 'competition:not_entrant'.
 * Internal: scoring and results take usernames, never user IDs (architecture 1.6).
 */
create function public.class_competition_entrant_id(competition public.class_competitions, typed_handle text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  pupil_id uuid;
begin
  select entrants.user_id into pupil_id
  from public.class_competition_entrants as entrants
  join public.profiles on profiles.id = entrants.user_id
  where entrants.competition_id = competition.id
    and profiles.handle = ltrim(lower(btrim(coalesce(typed_handle, ''))), '@');
  if pupil_id is null then
    raise exception 'Only pupils who joined get a score or a result.' using errcode = 'check_violation', hint = 'competition:not_entrant';
  end if;
  return pupil_id;
end;
$$;
comment on function public.class_competition_entrant_id(public.class_competitions, text) is
  'Internal: the entrant of a class competition with this username (S1-E8-15).';
revoke execute on function public.class_competition_entrant_id(public.class_competitions, text) from public, anon, authenticated;

/**
 * save_class_competition_scores: the teacher scores one entrant on the criteria.
 * Inputs: target_competition_id; pupil_handle, the entrant's username; scores, JSON
 *   {criterion id: points}; a criterion left out keeps its score, and null clears it.
 * Returns: the entrant's scores, JSON {criterion id: points}.
 * Errors: as class_competition_for_teacher(); check_violation with hint 'competition:not_judging'
 *   (it is still running, or its results are published and locked), 'competition:not_entrant',
 *   'score:criterion' (not a criterion of this competition) or 'score:range' (not a whole number
 *   from 0 to the criterion's maximum).
 * Where it fits: the results page, one entrant at a time.
 */
create function public.save_class_competition_scores(target_competition_id uuid, pupil_handle text, scores jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  competition public.class_competitions := public.class_competition_for_teacher(target_competition_id);
  pupil_id uuid;
  entry record;
  criterion public.class_competition_criteria;
begin
  -- Step 1: only after the end and before the results are published.
  if public.class_competition_phase(competition) <> 'judging' then
    raise exception 'Scores are given after the competition ends, until its results are published.'
      using errcode = 'check_violation', hint = 'competition:not_judging';
  end if;
  pupil_id := public.class_competition_entrant_id(competition, pupil_handle);
  if jsonb_typeof(scores) is distinct from 'object' then
    raise exception 'Scores are a list by criterion.' using errcode = 'check_violation', hint = 'score:criterion';
  end if;
  -- Step 2: each score in turn.
  for entry in select key, value from jsonb_each(scores) loop
    select * into criterion from public.class_competition_criteria as criteria
    where criteria.competition_id = competition.id and criteria.id::text = entry.key;
    if criterion.id is null then
      raise exception 'That isn''t a criterion of this competition.' using errcode = 'check_violation', hint = 'score:criterion';
    end if;
    if jsonb_typeof(entry.value) = 'null' then
      delete from public.class_competition_scores as saved
      where saved.criterion_id = criterion.id and saved.pupil_user_id = pupil_id;
      continue;
    end if;
    if entry.value #>> '{}' !~ '^\d{1,3}$' or (entry.value #>> '{}')::integer > criterion.max_points then
      raise exception 'A score is 0 to the criterion''s maximum.' using errcode = 'check_violation', hint = 'score:range';
    end if;
    insert into public.class_competition_scores (user_id, competition_id, criterion_id, pupil_user_id, points)
    values ((select auth.uid()), competition.id, criterion.id, pupil_id, (entry.value #>> '{}')::smallint)
    on conflict (criterion_id, pupil_user_id) do update set points = excluded.points;
  end loop;
  return (select coalesce(jsonb_object_agg(saved.criterion_id, saved.points), '{}'::jsonb)
          from public.class_competition_scores as saved
          where saved.competition_id = competition.id and saved.pupil_user_id = pupil_id);
end;
$$;
comment on function public.save_class_competition_scores(uuid, text, jsonb) is
  'The teacher scores one entrant of a class competition on its criteria, after it ends (S1-E8-15).';
revoke execute on function public.save_class_competition_scores(uuid, text, jsonb) from public, anon;
grant execute on function public.save_class_competition_scores(uuid, text, jsonb) to authenticated;

/**
 * class_competition_is_scored: whether an entrant has a score on every criterion.
 * Inputs: competition; pupil_id. Returns: true or false. Errors: none. Internal.
 */
create function public.class_competition_is_scored(competition public.class_competitions, pupil_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.class_competition_criteria as criteria
    where criteria.competition_id = competition.id and not exists (
      select 1 from public.class_competition_scores as scores
      where scores.criterion_id = criteria.id and scores.pupil_user_id = pupil_id));
$$;
comment on function public.class_competition_is_scored(public.class_competitions, uuid) is
  'Internal: whether an entrant of a class competition has a score on every criterion (S1-E8-15).';
revoke execute on function public.class_competition_is_scored(public.class_competitions, uuid) from public, anon, authenticated;

/**
 * class_competition_log_details: what the class's log keeps of published results.
 * Input: competition.
 * Returns: JSON {name, entrants: [{handle, result, readers_choice, scores: {label: points}}]}.
 * Errors: none. Internal: publish_class_competition(); only the teacher and our moderators read
 *   the class's log (S1-E8-15 criterion 9).
 */
create function public.class_competition_log_details(competition public.class_competitions)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('name', competition.name, 'entrants', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'handle', profiles.handle, 'result', results.result, 'readers_choice', results.readers_choice,
      'scores', (
        select coalesce(jsonb_object_agg(criteria.label, scores.points), '{}'::jsonb)
        from public.class_competition_scores as scores
        join public.class_competition_criteria as criteria on criteria.id = scores.criterion_id
        where scores.competition_id = competition.id and scores.pupil_user_id = results.pupil_user_id))
      order by profiles.handle), '[]'::jsonb)
    from public.class_competition_results as results
    join public.profiles on profiles.id = results.pupil_user_id
    where results.competition_id = competition.id));
$$;
comment on function public.class_competition_log_details(public.class_competitions) is
  'Internal: published class competition results and scores, for the class''s log (S1-E8-15).';
revoke execute on function public.class_competition_log_details(public.class_competitions) from public, anon, authenticated;

/**
 * mark_readers_choice: marks "Readers' choice" on a competition's saved results.
 * Inputs: competition; space, its class.
 * What it does: among the entrants, finds the most class points received during the competition.
 *   Every entrant with that many who isn't the Winner is marked; when the Winner has the most
 *   alone, nobody is. Nobody is marked below the 8th grade, while class points are off, or when
 *   no entrant received a point (decision 16).
 * Returns: nothing. Errors: none. Internal: publish_class_competition().
 */
create function public.mark_readers_choice(competition public.class_competitions, space public.spaces)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  most integer;
begin
  if not space.class_points_on or not public.class_winners_allowed(space.class_grade) then
    return;
  end if;
  select max(public.class_competition_class_points(competition, results.pupil_user_id)) into most
  from public.class_competition_results as results where results.competition_id = competition.id;
  if coalesce(most, 0) = 0 then
    return;
  end if;
  update public.class_competition_results as results set readers_choice = true
  where results.competition_id = competition.id and results.result <> 'winner'
    and public.class_competition_class_points(competition, results.pupil_user_id) = most;
end;
$$;
comment on function public.mark_readers_choice(public.class_competitions, public.spaces) is
  'Internal: marks the entrants with the most class points, other than the Winner, as Readers'' choice (S1-E8-15).';
revoke execute on function public.mark_readers_choice(public.class_competitions, public.spaces) from public, anon, authenticated;

/**
 * tell_class_competition_results: tells the class about published results, the Winner first.
 * Inputs: competition; space, its class.
 * What it does: one notification to the Winner, then one to each Readers' choice pupil, then one
 *   to every other pupil of the class (S1-E8-15 criterion 10: the winner is told first, then the
 *   class; there is no opt-out). A notification carries the class only, never a score.
 * Returns: nothing. Errors: none. Internal: publish_class_competition().
 */
create function public.tell_class_competition_results(competition public.class_competitions, space public.spaces)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  about jsonb := jsonb_build_object('space_id', space.id);
  pupil record;
begin
  -- Step 1: the Winner, before anyone else.
  for pupil in select results.pupil_user_id from public.class_competition_results as results
               where results.competition_id = competition.id and results.result = 'winner' loop
    perform public.notify(pupil.pupil_user_id, 'class_competition_won', null, about);
  end loop;
  -- Step 2: the Readers' choice pupils.
  for pupil in select results.pupil_user_id from public.class_competition_results as results
               where results.competition_id = competition.id and results.readers_choice loop
    perform public.notify(pupil.pupil_user_id, 'class_readers_choice', null, about);
  end loop;
  -- Step 3: every other pupil of the class.
  for pupil in select members.user_id from public.space_members as members
               where members.space_id = space.id and members.status = 'active'
                 and members.user_id <> space.user_id
                 and not exists (
                   select 1 from public.class_competition_results as results
                   where results.competition_id = competition.id and results.pupil_user_id = members.user_id
                     and (results.result = 'winner' or results.readers_choice)) loop
    perform public.notify(pupil.user_id, 'class_competition_results', null, about);
  end loop;
end;
$$;
comment on function public.tell_class_competition_results(public.class_competitions, public.spaces) is
  'Internal: notifies the Winner first, then the Readers'' choice pupils, then the rest of the class (S1-E8-15).';
revoke execute on function public.tell_class_competition_results(public.class_competitions, public.spaces) from public, anon, authenticated;

/**
 * publish_class_competition: the teacher confirms the results; the competition then locks.
 * Inputs: target_competition_id; results, JSON {winner (the Winner's username, or null),
 *   winning_chapter_id (one of the Winner's chapters shared with the class, or null), finalists
 *   (usernames)}. Every other entrant is a Contestant.
 * Returns: class_competitions() after the change.
 * Errors: as class_competition_for_teacher(); check_violation with hint 'competition:not_judging'
 *   (still running, or already published), 'competition:no_entrants', 'competition:winner' (from
 *   the 8th grade up there is exactly one Winner; the teacher names them, the app never does),
 *   'competition:no_winners' (below the 8th grade nobody is Winner or Finalist),
 *   'competition:not_entrant', 'competition:twice' (a pupil named as Winner and Finalist, or
 *   twice), 'competition:unscored' (the Winner and every Finalist need a score on every
 *   criterion) or 'competition:chapter' (not a chapter of the Winner's shared with this class).
 * Where it fits: "Confirm the results" on the results page. Results and scores go to the class's
 *   log, the Winner is told first and then the class.
 */
create function public.publish_class_competition(target_competition_id uuid, results jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  competition public.class_competitions := public.class_competition_for_teacher(target_competition_id);
  caller_id uuid := (select auth.uid());
  space public.spaces;
  winners_allowed boolean;
  winner_id uuid;
  winning_chapter uuid;
  finalist_ids uuid[] := '{}';
  finalist_handle text;
  finalist_id uuid;
begin
  -- Step 1: only after the end, once, and only with entrants.
  select * into space from public.spaces where spaces.id = competition.space_id;
  if public.class_competition_phase(competition) <> 'judging' then
    raise exception 'Results are confirmed once, after the competition ends.'
      using errcode = 'check_violation', hint = 'competition:not_judging';
  end if;
  if not exists (select 1 from public.class_competition_entrants as entrants
                 where entrants.competition_id = competition.id) then
    raise exception 'Nobody joined this competition.' using errcode = 'check_violation', hint = 'competition:no_entrants';
  end if;
  winners_allowed := public.class_winners_allowed(space.class_grade);
  -- Step 2: who the teacher named.
  if nullif(btrim(coalesce(results ->> 'winner', '')), '') is not null then
    winner_id := public.class_competition_entrant_id(competition, results ->> 'winner');
  end if;
  for finalist_handle in select value from jsonb_array_elements_text(
      case when jsonb_typeof(results -> 'finalists') = 'array' then results -> 'finalists' else '[]'::jsonb end) loop
    finalist_id := public.class_competition_entrant_id(competition, finalist_handle);
    if finalist_id = winner_id or finalist_id = any (finalist_ids) then
      raise exception 'A pupil has one result.' using errcode = 'check_violation', hint = 'competition:twice';
    end if;
    finalist_ids := finalist_ids || finalist_id;
  end loop;
  -- Step 3: the rules by school year (decision 10) and exactly one Winner (decision 2).
  if not winners_allowed and (winner_id is not null or cardinality(finalist_ids) > 0) then
    raise exception 'Below the 8th grade nobody is Winner or Finalist.' using errcode = 'check_violation', hint = 'competition:no_winners';
  end if;
  if winners_allowed and winner_id is null then
    raise exception 'Name exactly one Winner.' using errcode = 'check_violation', hint = 'competition:winner';
  end if;
  -- Step 4: the teacher assessed everyone they honour (decision 15).
  if exists (select 1 from unnest(finalist_ids || winner_id) as honoured (pupil_id)
             where honoured.pupil_id is not null
               and not public.class_competition_is_scored(competition, honoured.pupil_id)) then
    raise exception 'Score the Winner and every Finalist on every criterion first.'
      using errcode = 'check_violation', hint = 'competition:unscored';
  end if;
  -- Step 5: the winning chapter is one of the Winner's, shared with this class.
  if nullif(btrim(coalesce(results ->> 'winning_chapter_id', '')), '') is not null then
    select chapters.id into winning_chapter
    from public.chapters join public.stories on stories.id = chapters.story_id
    where chapters.id::text = results ->> 'winning_chapter_id' and chapters.user_id = winner_id
      and stories.class_only and stories.class_space_id = space.id
      and chapters.status = 'published' and chapters.deleted_at is null and stories.deleted_at is null;
    if winning_chapter is null then
      raise exception 'Choose one of the Winner''s chapters shared with this class.'
        using errcode = 'check_violation', hint = 'competition:chapter';
    end if;
  end if;
  -- Step 6: one result per entrant; everyone not named is a Contestant.
  insert into public.class_competition_results (user_id, competition_id, pupil_user_id, result, winning_chapter_id)
  select caller_id, competition.id, entrants.user_id,
         case when entrants.user_id = winner_id then 'winner'
              when entrants.user_id = any (finalist_ids) then 'finalist'
              else 'participant' end::public.certificate_result,
         case when entrants.user_id = winner_id then winning_chapter end
  from public.class_competition_entrants as entrants
  where entrants.competition_id = competition.id;
  perform public.mark_readers_choice(competition, space);
  -- Step 7: lock it, write the class's log and tell the class, the Winner first.
  update public.class_competitions set published_at = now() where class_competitions.id = competition.id;
  perform public.log_space_action(space, 'competition_published', winner_id, null, null,
    public.class_competition_log_details(competition));
  perform public.tell_class_competition_results(competition, space);
  return public.class_competitions(space.slug);
end;
$$;
comment on function public.publish_class_competition(uuid, jsonb) is
  'The teacher confirms a class competition''s results: exactly one Winner from the 8th grade up, any Finalists, everyone else a Contestant; the app never chooses (S1-E8-15).';
revoke execute on function public.publish_class_competition(uuid, jsonb) from public, anon;
grant execute on function public.publish_class_competition(uuid, jsonb) to authenticated;

/* ---------- 10. Teacher points lock once the results are out ---------- */

/**
 * refuse_teacher_points_after_results: teacher points on an entrant's work can't change once the
 *   competition that work belongs to has published results (S1-E8-14 criterion 1).
 * Trigger: before a row of class_teacher_points is added, changed or deleted by the teacher.
 *   Work "belongs" to a competition when its writer has a result in it and the chapter was first
 *   published, or the reply written, from the competition's first day to its last.
 * Errors: check_violation with hint 'points:locked'. Deletes by our own jobs and by leaving the
 *   class (no signed-in teacher, or not that teacher) go through.
 */
create function public.refuse_teacher_points_after_results()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mark public.class_teacher_points := coalesce(new, old);
  made_on date;
begin
  -- Only the teacher's own changes are held back; clean-up jobs and leaving the class go through.
  if (select auth.uid()) is distinct from mark.user_id then
    return coalesce(new, old);
  end if;
  select (coalesce(chapters.first_published_at, forum_posts.created_at) at time zone
          coalesce(public.setting_value('class_points_timezone') #>> '{}', 'Europe/Bucharest'))::date
  into made_on
  from (select 1) as one
  left join public.chapters on chapters.id = mark.chapter_id
  left join public.forum_posts on forum_posts.id = mark.forum_post_id;
  if exists (
    select 1 from public.class_competitions as competitions
    join public.class_competition_results as results on results.competition_id = competitions.id
    where competitions.space_id = mark.space_id and competitions.published_at is not null
      and results.pupil_user_id = mark.pupil_user_id
      and made_on between competitions.starts_on and public.class_competition_last_day(competitions)) then
    raise exception 'The competition''s results are published, so these points are locked.'
      using errcode = 'check_violation', hint = 'points:locked';
  end if;
  return coalesce(new, old);
end;
$$;
comment on function public.refuse_teacher_points_after_results() is
  'Trigger: teacher points on an entrant''s work lock once the competition''s results are published (S1-E8-14).';
revoke execute on function public.refuse_teacher_points_after_results() from public, anon, authenticated;

create trigger class_teacher_points_lock_after_results
  before insert or update or delete on public.class_teacher_points
  for each row execute function public.refuse_teacher_points_after_results();

/* ---------- 11. A teacher's own criteria templates ---------- */

/**
 * my_criteria_templates: the caller's own saved sets of criteria.
 * Returns: a JSON list of {id, name, criteria, updated_at}, by name; empty for someone with none.
 * Errors: none. Where it fits: "Start from a template" and the Templates page. Nobody ever reads
 *   another person's templates (S1-E8-19 criterion 4).
 */
create function public.my_criteria_templates()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', templates.id, 'name', templates.name, 'criteria', templates.criteria,
    'updated_at', templates.updated_at) order by lower(templates.name)), '[]'::jsonb)
  from public.class_criteria_templates as templates
  where templates.user_id = (select auth.uid());
$$;
comment on function public.my_criteria_templates() is
  'A teacher''s own saved criteria templates, and nobody else''s (S1-E8-19).';
revoke execute on function public.my_criteria_templates() from public, anon;
grant execute on function public.my_criteria_templates() to authenticated;

/**
 * save_criteria_template: a teacher saves a set of criteria as their own template, or changes
 *   one. Competitions already made from it never change: a competition keeps its own copy.
 * Inputs: template_name, 1 to 80 characters; criteria, as check_class_criteria() takes them;
 *   target_template_id, the template to change, or null for a new one.
 * Returns: my_criteria_templates() after the change.
 * Errors: insufficient_privilege with hint 'signed_out', or 'template:not_teacher' for someone
 *   who teaches no class; check_violation with hint 'template:name', 'template:name_taken',
 *   'template:too_many' (the setting class_criteria_templates_max) or any 'criteria:…' hint;
 *   no_data_found with hint 'template:missing'.
 * Where it fits: "Save as template" on the competition form, and the Templates page.
 */
create function public.save_criteria_template(template_name text, criteria jsonb, target_template_id uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  clean_name text;
  clean_criteria jsonb;
begin
  -- Step 1: only someone who teaches a class keeps templates.
  if not exists (select 1 from public.spaces
                 where spaces.user_id = caller_id and spaces.kind = 'class' and spaces.deleted_at is null) then
    raise exception 'Only a class''s teacher keeps criteria templates.'
      using errcode = 'insufficient_privilege', hint = 'template:not_teacher';
  end if;
  clean_name := public.check_class_plain_text(template_name, 80, 'template:name');
  clean_criteria := public.check_class_criteria(criteria);
  -- Step 2: one name once per teacher.
  if exists (select 1 from public.class_criteria_templates as templates
             where templates.user_id = caller_id and lower(templates.name) = lower(clean_name)
               and templates.id is distinct from target_template_id) then
    raise exception 'You already have a template with this name.' using errcode = 'check_violation', hint = 'template:name_taken';
  end if;
  -- Step 3: a new template, within the limit, or a change to one of the caller's own.
  if target_template_id is null then
    if (select count(*) from public.class_criteria_templates as templates where templates.user_id = caller_id)
       >= public.class_points_number('class_criteria_templates_max', 50) then
      raise exception 'Delete a template first.' using errcode = 'check_violation', hint = 'template:too_many';
    end if;
    insert into public.class_criteria_templates (user_id, name, criteria)
    values (caller_id, clean_name, clean_criteria);
  else
    update public.class_criteria_templates as templates set name = clean_name, criteria = clean_criteria
    where templates.id = target_template_id and templates.user_id = caller_id;
    if not found then
      raise exception 'There is no such template.' using errcode = 'no_data_found', hint = 'template:missing';
    end if;
  end if;
  return public.my_criteria_templates();
end;
$$;
comment on function public.save_criteria_template(text, jsonb, uuid) is
  'A teacher saves a set of criteria as their own template, or renames or edits one (S1-E8-19).';
revoke execute on function public.save_criteria_template(text, jsonb, uuid) from public, anon;
grant execute on function public.save_criteria_template(text, jsonb, uuid) to authenticated;

/**
 * delete_criteria_template: a teacher deletes one of their own templates.
 * Input: target_template_id.
 * Returns: my_criteria_templates() after the change.
 * Errors: insufficient_privilege with hint 'signed_out'; no_data_found with hint
 *   'template:missing' (none, or someone else's).
 * Where it fits: the Templates page. Competitions made from it stay as they are.
 */
create function public.delete_criteria_template(target_template_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
begin
  delete from public.class_criteria_templates as templates
  where templates.id = target_template_id and templates.user_id = caller_id;
  if not found then
    raise exception 'There is no such template.' using errcode = 'no_data_found', hint = 'template:missing';
  end if;
  return public.my_criteria_templates();
end;
$$;
comment on function public.delete_criteria_template(uuid) is
  'A teacher deletes one of their own criteria templates (S1-E8-19).';
revoke execute on function public.delete_criteria_template(uuid) from public, anon;
grant execute on function public.delete_criteria_template(uuid) to authenticated;

/* ---------- 12. The shared reporting contract: a class competition ---------- */

/**
 * reportable_item_owner: as in CLASS-POINTS part 1, plus 'class_competition': a member of the
 *   class can report a competition's name and criteria; its owner is the teacher.
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
    -- A class competition (its name and criteria) for a member of that class, who can read it;
    -- its "owner" is the teacher who wrote it (S1-E8-15).
    when 'class_competition' then
      return query
        select competitions.id, competitions.user_id from public.class_competitions as competitions
        join public.spaces on spaces.id = competitions.space_id
        where is_row_id and competitions.id = item_reference::uuid
          and public.space_may_read(spaces);
  end case;
  if not found then
    raise exception 'There is no such % to report.', item_type using errcode = 'check_violation';
  end if;
end;
$$;

/**
 * reportable_item_summary: as in CLASS-POINTS part 1, and a class competition says its name and
 *   its class.
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
    when 'class_competition' then
      select format('Class competition "%s" in the class "%s"', competitions.name, spaces.name)
        into summary
      from public.class_competitions as competitions
      join public.spaces on spaces.id = competitions.space_id
      where competitions.id = item_id;
  end case;
  return coalesce(summary, '(gone)');
end;
$$;

/**
 * case_item_content: as in CLASS-POINTS part 1, plus a class competition with its criteria, for
 *   the moderator's case page.
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
    -- A class competition: its name, dates, class and every criterion in full (S1-E8-15).
    when 'class_competition' then (select jsonb_build_object('name', competitions.name,
        'class', spaces.name, 'starts_on', competitions.starts_on, 'ends_on', competitions.ends_on,
        'criteria', public.class_competition_criteria_json(competitions.id),
        'created_at', competitions.created_at)
        from public.class_competitions as competitions
        join public.spaces on spaces.id = competitions.space_id
        where competitions.id = target.item_id)
  end;
$$;

/* ---------- 13. Notifications ---------- */

/**
 * notification_category: as in INACTIVE-2, and the three class competition notices sit with the
 *   account notices, as a certificate does (S1-E8-15).
 * Inputs: kind. Returns: 'stories', 'follows', 'staff' or 'replies'. Errors: none.
 * Where it fits: the tabs of the Notifications page.
 */
create or replace function public.notification_category(kind public.notification_kind)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $$
  select case kind
    when 'new_chapter' then 'stories'
    when 'new_follower' then 'follows'
    when 'moderation_decision' then 'staff'
    when 'report_outcome' then 'staff'
    when 'appeal_decided' then 'staff'
    when 'moderator_mail_reply' then 'staff'
    when 'tag_rejected' then 'staff'
    when 'age_check_decided' then 'staff'
    when 'age_check_18_invite' then 'staff'
    when 'parental_consent_agreed' then 'staff'
    when 'parental_consent_withdrawn' then 'staff'
    when 'login_method_added' then 'staff'
    when 'login_method_removed' then 'staff'
    when 'teacher_check_decided' then 'staff'
    when 'teacher_badge_removed' then 'staff'
    when 'data_export_ready' then 'staff'
    when 'stories_export_ready' then 'staff'
    when 'reading_reminder' then 'staff'
    when 'space_join_request' then 'follows'
    when 'space_join_approved' then 'follows'
    when 'customisation_change_requested' then 'staff'
    when 'certificate_issued' then 'staff'
    when 'class_archived' then 'staff'
    when 'story_changed_by_staff' then 'staff'
    when 'data_request_confirm' then 'staff'
    when 'data_request_extended' then 'staff'
    when 'data_request_copy_ready' then 'staff'
    when 'picture_opened_by_staff' then 'staff'
    when 'landing_entries_open' then 'stories'
    when 'live_session_soon' then 'stories'
    when 'rank_reached' then 'stories'
    when 'space_handover_offered' then 'follows'
    when 'story_featured' then 'stories'
    when 'spotlight_consent_agreed' then 'staff'
    when 'spotlight_consent_withdrawn' then 'staff'
    when 'waitlist_admitted' then 'staff'
    when 'home_comment_invited' then 'staff'
    when 'account_unused_month' then 'staff'
    when 'account_unused_week' then 'staff'
    when 'account_unused_nudge' then 'staff'
    when 'account_unused_closed' then 'staff'
    when 'class_competition_won' then 'staff'
    when 'class_competition_results' then 'staff'
    when 'class_readers_choice' then 'staff'
    else 'replies'
  end;
$$;

/* ---------- 14. Download my data and deleting an account ---------- */

/**
 * data_export_tables: as in CLASS-POINTS part 1, plus the six class competition tables, all
 *   included: a teacher gets their competitions, criteria, scores, results and templates; a
 *   pupil gets the competitions they joined.
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
    ('class_competition_criteria', true, null),
    ('class_competition_entrants', true, null),
    ('class_competition_results', true, null),
    ('class_competition_scores', true, null),
    ('class_competitions', true, null),
    ('class_criteria_templates', true, null),
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
 * account_deletion_rules: as in CLASS-POINTS part 1, plus the six class competition tables,
 *   deleted with the account: scores, results and entries first, then criteria, then the
 *   competitions themselves. What a pupil received (scores and a result) goes with their profile.
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
    ('class_competition_criteria', 'delete', 2, null),
    ('class_competition_entrants', 'delete', 1, null),
    ('class_competition_results', 'delete', 1, null),
    ('class_competition_scores', 'delete', 1, null),
    ('class_competitions', 'delete', 3, null),
    ('class_criteria_templates', 'delete', 1, null),
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

/* ---------- 15. Leaving a class, and retention ---------- */

/**
 * forget_class_points_of_member: as in CLASS-POINTS part 1, and the person's entries, scores and
 *   results in the class's competitions go too (S1-E8-16 criterion 6; GDPR art. 5(1)(c)).
 * Trigger: after a row of space_members is deleted. Returns nothing useful (an after trigger).
 * Errors: none.
 */
create or replace function public.forget_class_points_of_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: the points they gave and received, their marks, opens and flags (part 1).
  delete from public.class_point_gifts as gifts
  where gifts.space_id = old.space_id and (gifts.user_id = old.user_id or gifts.receiver_user_id = old.user_id);
  delete from public.class_teacher_points as marks
  where marks.space_id = old.space_id and marks.pupil_user_id = old.user_id;
  delete from public.class_chapter_opens as opens
  where opens.space_id = old.space_id and opens.user_id = old.user_id;
  delete from public.class_point_flags as flags
  where flags.space_id = old.space_id and flags.kind = 'pair'
    and (flags.first_user_id = old.user_id or flags.second_user_id = old.user_id);
  -- Step 2: their place in the class's competitions: the entry, the scores and the result.
  delete from public.class_competition_entrants as entrants
  where entrants.space_id = old.space_id and entrants.user_id = old.user_id;
  delete from public.class_competition_scores as scores using public.class_competitions as competitions
  where competitions.id = scores.competition_id and competitions.space_id = old.space_id
    and scores.pupil_user_id = old.user_id;
  delete from public.class_competition_results as results using public.class_competitions as competitions
  where competitions.id = results.competition_id and competitions.space_id = old.space_id
    and results.pupil_user_id = old.user_id;
  return null;
end;
$$;

/**
 * purge_class_points: as in CLASS-POINTS part 1, and the class's competitions go at the same
 *   time, with their criteria, entries, scores and results (S1-E8-16 criterion 5; GDPR
 *   art. 5(1)(e)). Certificates stay (S1-E8-12), and so do a teacher's templates, which belong to
 *   the teacher and not to one class.
 * Returns: how many rows it deleted (a competition counts as one). Errors: none.
 * Where it fits: run_retention_jobs(), every night; docs/retention.md.
 */
create or replace function public.purge_class_points()
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
  removed_count := removed_count + removed_now;
  -- Competitions take their criteria, entries, scores and results with them (on delete cascade).
  delete from public.class_competitions as competitions using public.spaces
  where spaces.id = competitions.space_id and spaces.archived_at < cutoff;
  get diagnostics removed_now = row_count;
  return removed_count + removed_now;
end;
$$;
comment on function public.purge_class_points() is
  'Internal retention job: deletes class points, notes, opens, flags and class competitions 30 days after the class is archived (S1-E8-16).';
