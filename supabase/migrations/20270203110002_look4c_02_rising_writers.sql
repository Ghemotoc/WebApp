-- Migration: who may be suggested to other people, the parent's separate yes, and New and rising
-- writers (stories S1-E5-11 and S1-E2-03b, bundle LOOK-4c; Robert, 6 Nov 2026: D4 "writers 16
-- and over; under-16s only with their parent's expressed consent"; "Suggest me" starts on for 18+
-- and off for under-18s, who turn it on themselves).
--
-- What it adds:
--   profiles.suggest_me                   the writer's own "Suggest me and my stories to other
--                                         people" switch; null means "not chosen", which is on for
--                                         18 and over and off for under-18s, so nothing needs
--                                         back-filling and a writer who turns 18 follows the adult
--                                         default unless they chose
--   parental_consents.spotlight_*         the parent's separate, optional yes to suggestions,
--                                         when it was given or withdrawn, and the link sent to ask
--   has_spotlight_consent()               is that yes in force?
--   may_spotlight_writer()                the one rule for putting a person or their work on show
--   may_feature_writer()                  now may_spotlight_writer() and 16 or over (LOOK-4a)
--   featured_ineligible_reason()          also says when the writer's switch is off
--   my_privacy_settings()                 also says where the switch stands
--   set_suggest_me()                      the switch in Settings › Privacy
--   begin_spotlight_request()             the server asks a parent who agreed earlier (signed)
--   parental_spotlight_request()          what the parent's one-question page shows
--   answer_spotlight_consent()            the parent's yes or withdrawal (signed)
--   answer_parental_consent()             the consent page's optional box (a fifth input)
--   admin_withdraw_spotlight_consent()    staff withdraw it from the account page, logged
--   rising_writers()                      New and rising writers, for visitors and members
--   notification_category()               the two new kinds join the account group
--
-- Who calls it: Settings › Privacy (src/features/privacy), the parent's pages
-- (src/features/parent-consent) through server/parent-consent.ts, the account page in admin, and
-- the Discover "writers" shelf (src/features/discovery).
--
-- Rules it follows:
--   - GDPR art. 6(1)(a), 7 and 8: a separate, specific consent for a separate purpose, never
--     bundled with the account's consent, and as easy to withdraw as to give (art. 7(3)).
--   - DoD privacy: anything social defaults to the most private setting for minors.
--   - CLAUDE.md rule 15 and architecture 1.6: no list here ever returns a user ID.
--   - Rule 6: blocked people either way never appear; rule 18: a card's story is one the reader
--     may read.

/* ---------- 1. The writer's switch and the parent's separate yes ---------- */

alter table public.profiles add column suggest_me boolean;
comment on column public.profiles.suggest_me is
  'The writer''s "Suggest me and my stories to other people" switch; null: not chosen, which is on for 18+ and off for under-18s (S1-E5-11; Robert, 6 Nov 2026).';

alter table public.parental_consents
  add column spotlight_agreed_at timestamptz,
  add column spotlight_withdrawn_at timestamptz,
  add column spotlight_token_hash text,
  add column spotlight_requested_at timestamptz;
comment on column public.parental_consents.spotlight_agreed_at is
  'When the parent last agreed that the child may be suggested to other people (S1-E2-03b; GDPR art. 8).';
comment on column public.parental_consents.spotlight_withdrawn_at is
  'When that yes was last withdrawn, by the parent or by staff; a later yes clears it (S1-E2-03b).';
comment on column public.parental_consents.spotlight_token_hash is
  'SHA-256 of the link in the latest "may we suggest your child?" email; the link itself is never stored (S1-E2-03b).';
comment on column public.parental_consents.spotlight_requested_at is
  'When that email was last sent, so a child can''t send it again and again (S1-E2-03b).';

create unique index parental_consents_spotlight_token_idx on public.parental_consents (spotlight_token_hash)
  where spotlight_token_hash is not null;

/* ---------- 2. The rule ---------- */

/**
 * has_spotlight_consent: has a parent or guardian agreed, separately, that this child may be
 * suggested to other people, and not withdrawn it?
 * Input: person_id. Returns: true only with an agreed parental consent whose spotlight yes is in
 *   force. Where it fits: may_spotlight_writer().
 */
create or replace function public.has_spotlight_consent(person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.parental_consents
    where parental_consents.user_id = person_id
      and parental_consents.status = 'agreed'
      and parental_consents.spotlight_agreed_at is not null
      and parental_consents.spotlight_withdrawn_at is null);
$$;

comment on function public.has_spotlight_consent(uuid) is
  'Internal: true while a parent''s separate yes to suggestions is in force (S1-E2-03b; GDPR art. 8).';
revoke execute on function public.has_spotlight_consent(uuid) from public, anon, authenticated;

/**
 * suggests_me: where a writer's "Suggest me" switch stands, with the default for their age.
 * Input: person_id. Returns: their choice, or on for 18 and over and off for anyone younger when
 *   they never chose (DoD: the most private default for minors).
 */
create or replace function public.suggests_me(person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(profiles.suggest_me, public.age_band_of(profiles.id) = '18_plus')
  from public.profiles where profiles.id = person_id;
$$;

comment on function public.suggests_me(uuid) is
  'Internal: the writer''s Suggest me switch, defaulting to on for 18+ and off for under-18s (S1-E5-11).';
revoke execute on function public.suggests_me(uuid) from public, anon, authenticated;

/**
 * may_spotlight_writer: may this person, or their work, be shown to strangers in a suggestion
 * (New and rising writers, Writers to follow, Featured this week)?
 * Input: person_id. Returns: true for the classics account, or when all of these hold:
 *   1. the account is active (not suspended, banned, closed or waiting for anything);
 *   2. the writer's own switch is on (suggests_me());
 *   3. they are 16 or over, or 13 to 15 with an agreed parental consent and the parent's separate
 *      yes (has_spotlight_consent()). Under-13s and unknown ages never are.
 * Checked every time a list is read, so a suspension, a withdrawn yes or the switch turned off
 * takes the writer out at once.
 */
create or replace function public.may_spotlight_writer(person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select person_id is not null and (
    public.is_classics_account(person_id)
    or (public.account_state(person_id) = 'active'
        and coalesce(public.suggests_me(person_id), false)
        and (public.age_band_of(person_id) in ('16_to_17', '18_plus')
             or (public.age_band_of(person_id) = '13_to_15'
                 and public.has_parental_consent(person_id)
                 and public.has_spotlight_consent(person_id)))));
$$;

comment on function public.may_spotlight_writer(uuid) is
  'Internal: the one rule for suggesting a writer to strangers: active, switch on, 16+ or 13-15 with the parent''s separate yes (S1-E5-11, S1-E2-03b; Robert, 6 Nov 2026).';
revoke execute on function public.may_spotlight_writer(uuid) from public, anon, authenticated;

/**
 * may_feature_writer: as in LOOK-4a, now built on may_spotlight_writer(): Featured is stricter,
 * 16 or over only, with no consent route in (Robert, 6 Nov 2026, D2).
 */
create or replace function public.may_feature_writer(person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select person_id is not null and (
    public.is_classics_account(person_id)
    or (public.may_spotlight_writer(person_id)
        and public.age_band_of(person_id) in ('16_to_17', '18_plus')));
$$;

comment on function public.may_feature_writer(uuid) is
  'Internal: true when a writer may be featured: may_spotlight_writer() and 16 or over (S1-E5-10, S1-E5-11).';
revoke execute on function public.may_feature_writer(uuid) from public, anon, authenticated;

/**
 * featured_ineligible_reason: as in LOOK-4a, plus writer_not_suggested when the writer's own
 * "Suggest me" switch is off, so the ranking screen says why instead of "age unknown".
 */
create or replace function public.featured_ineligible_reason(target_story_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target public.stories%rowtype;
  writer_band public.age_band;
begin
  -- Step 1: the story itself must be open to everyone on the web.
  select * into target from public.stories where stories.id = target_story_id;
  if not found then
    return 'not_found';
  end if;
  if target.deleted_at is not null or target.visibility <> 'public' or target.class_only then
    return 'not_public';
  end if;
  -- Step 2: moderators haven't hidden or restricted it, and it has a chapter to read.
  if public.is_moderated_away('story', target.id) then
    return 'moderated';
  end if;
  if exists (select 1 from public.story_restrictions
             where story_restrictions.story_id = target.id and story_restrictions.lifted_at is null) then
    return 'restricted';
  end if;
  if not public.story_has_readable_chapter(target.id) then
    return 'no_chapter';
  end if;
  -- Step 3: the writer (the classics account always passes).
  if public.may_feature_writer(target.user_id) then
    return null;
  end if;
  if public.account_state(target.user_id) <> 'active' then
    return 'writer_not_active';
  end if;
  writer_band := public.age_band_of(target.user_id);
  if writer_band in ('under_13', '13_to_15') then
    return 'writer_under_16';
  end if;
  -- Step 4 (LOOK-4c): old enough, but their own "Suggest me" switch is off.
  if not coalesce(public.suggests_me(target.user_id), false) then
    return 'writer_not_suggested';
  end if;
  return 'writer_age_unknown';
end;
$$;


/* ---------- 3. The switch in Settings › Privacy ---------- */

/**
 * my_privacy_settings: as in S1-E13-01, plus where "Suggest me" stands.
 * Returns also: suggest_me (the switch, with the age default), parent_spotlight ('not_needed' for
 *   16 and over, 'agreed', 'asked' after the email went, or 'none'), and can_ask_parent (13 to 15
 *   with an agreed parental consent, so the parent can be asked).
 */
create or replace function public.my_privacy_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'profile_audience', public.profile_audience_of(profiles),
    'library_audience', profiles.library_visible_to,
    'shows_online_status', profiles.shows_online_status,
    'message_audience', public.message_audience_of(profiles),
    'is_under_18', public.message_age_group(profiles) <> 'adult',
    'suggest_me', coalesce(public.suggests_me(profiles.id), false),
    'parent_spotlight', case
      when public.age_band_of(profiles.id) <> '13_to_15' then 'not_needed'
      when public.has_spotlight_consent(profiles.id) then 'agreed'
      when exists (select 1 from public.parental_consents
                   where parental_consents.user_id = profiles.id and parental_consents.status = 'agreed'
                     and parental_consents.spotlight_requested_at is not null
                     and parental_consents.spotlight_requested_at
                         > coalesce(parental_consents.spotlight_withdrawn_at, '-infinity')) then 'asked'
      else 'none'
    end,
    'can_ask_parent', public.age_band_of(profiles.id) = '13_to_15' and public.has_parental_consent(profiles.id))
  from public.profiles where profiles.id = public.require_live_profile();
$$;

comment on function public.my_privacy_settings() is
  'The signed-in member''s privacy settings, with Suggest me and the parent''s separate yes (S1-E13-01, S1-E5-11, S1-E2-03b).';

/**
 * set_suggest_me: turns the signed-in writer's "Suggest me" switch on or off.
 * Input: should_suggest. Returns: nothing.
 * Errors: as require_live_profile() (signed out or a closed account).
 * For a writer aged 13 to 15 the switch can be on while the parent hasn't agreed yet: nothing is
 * suggested until they do (may_spotlight_writer()), and the screen says "Waiting for your parent".
 */
create or replace function public.set_suggest_me(should_suggest boolean)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.profiles set suggest_me = coalesce(should_suggest, false), updated_at = now()
  where profiles.id = public.require_live_profile();
$$;

comment on function public.set_suggest_me(boolean) is
  'The signed-in writer turns Suggest me on or off (S1-E5-11).';
revoke execute on function public.set_suggest_me(boolean) from public, anon;
grant execute on function public.set_suggest_me(boolean) to authenticated;

/* ---------- 4. Asking a parent who agreed earlier ---------- */

/**
 * begin_spotlight_request: stores the link the server is about to email to the parent of a
 * writer aged 13 to 15, asking whether the writer may be suggested to other people.
 * Inputs: token_hash, the SHA-256 of the link's token (the token itself never reaches the
 *   database); signature, the server's HMAC of "spotlight|<user ID>|<hash>" (so the writer can't
 *   store a link they know and answer for their parent).
 * Returns: {outcome 'ok', parent_email, language, handle}, or {outcome 'not_needed'} when the
 *   writer isn't 13 to 15, has no agreed parental consent, the switch is off or the yes is given.
 * Errors: insufficient_privilege (42501) unsigned; check_violation (23514, hint too_soon) within
 *   an hour of the last email.
 */
create or replace function public.begin_spotlight_request(token_hash text, signature text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  consent public.parental_consents;
begin
  -- Step 1: signed in, and the link came from our server.
  if me is null or not public.parental_consent_is_signed(
      'spotlight|' || me || '|' || begin_spotlight_request.token_hash, signature) then
    raise exception 'This request wasn''t signed by our server.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: only for a 13 to 15-year-old with an agreed consent, the switch on, no yes yet.
  select * into consent from public.parental_consents
  where parental_consents.user_id = me and parental_consents.status = 'agreed' for update;
  if consent.id is null or public.age_band_of(me) <> '13_to_15'
     or not coalesce(public.suggests_me(me), false) or public.has_spotlight_consent(me) then
    return jsonb_build_object('outcome', 'not_needed');
  end if;
  -- Step 3: no flood of emails to a parent.
  if consent.spotlight_requested_at > now() - interval '1 hour' then
    raise exception 'Wait an hour before asking again.' using errcode = 'check_violation', hint = 'too_soon';
  end if;
  -- Step 4: the new link counts; an older one stops working.
  update public.parental_consents
  set spotlight_token_hash = lower(begin_spotlight_request.token_hash), spotlight_requested_at = now()
  where id = consent.id;
  return jsonb_build_object('outcome', 'ok', 'parent_email', consent.parent_email,
    'language', consent.language, 'handle', (select handle from public.profiles where id = me));
end;
$$;

comment on function public.begin_spotlight_request(text, text) is
  'The server stores the link it emails a parent asking whether their child may be suggested to other people (S1-E2-03b).';
revoke execute on function public.begin_spotlight_request(text, text) from public, anon;
grant execute on function public.begin_spotlight_request(text, text) to authenticated;

/**
 * spotlight_consent_by_token: the agreed consent a spotlight link belongs to (internal).
 * Input: token, from the spotlight email's link or the consent email's own link. Returns: the row, or nulls when there is none.
 */
create or replace function public.spotlight_consent_by_token(token text)
returns public.parental_consents
language sql
stable
security definer
set search_path = ''
as $$
  -- Either link works: the "may we suggest your child?" email's, or the consent email's own link,
  -- so a parent who ticked the box on the consent page can take that yes back on its own
  -- (GDPR art. 7(3): as easy to withdraw as to give).
  select parental_consents.* from public.parental_consents
  where encode(extensions.digest(coalesce(token, ''), 'sha256'), 'hex')
          in (parental_consents.spotlight_token_hash, parental_consents.token_hash)
    and parental_consents.status = 'agreed'
  limit 1;
$$;

comment on function public.spotlight_consent_by_token(text) is
  'Internal: the agreed parental consent a spotlight link belongs to (S1-E2-03b).';
revoke execute on function public.spotlight_consent_by_token(text) from public, anon, authenticated;

/**
 * parental_spotlight_request: what the parent's one-question page shows.
 * Input: token, from the link (after "#", so it never reaches a server log).
 * Returns: {outcome 'ok', handle, language, is_agreed} or {outcome 'gone'} for an unknown or
 *   replaced link, a withdrawn account consent or a closed account.
 * Open to visitors: the token is the proof, as on the consent page (S1-E2-03).
 */
create or replace function public.parental_spotlight_request(token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  consent public.parental_consents := public.spotlight_consent_by_token(token);
  writer_handle text;
begin
  select profiles.handle into writer_handle from public.profiles
  where profiles.id = consent.user_id and profiles.deleted_at is null;
  if consent.id is null or writer_handle is null then
    return jsonb_build_object('outcome', 'gone');
  end if;
  return jsonb_build_object('outcome', 'ok', 'handle', writer_handle, 'language', consent.language,
    'is_agreed', consent.spotlight_agreed_at is not null and consent.spotlight_withdrawn_at is null);
end;
$$;

comment on function public.parental_spotlight_request(text) is
  'The parent''s one-question page: whose account, and whether the yes to suggestions stands (S1-E2-03b).';
revoke execute on function public.parental_spotlight_request(text) from public;
grant execute on function public.parental_spotlight_request(text) to anon, authenticated;

/**
 * answer_spotlight_consent: the parent's yes, or withdrawal, from the one-question page.
 * Inputs: token, from the link; decision, 'agree' or 'withdraw'; signature, the server's HMAC of
 *   "spotlight-answer|<hash>|<decision>".
 * Returns: {outcome 'ok', decision, parent_email, language, handle}, or {outcome 'gone'} or
 *   {outcome 'already_answered'} (a yes that stands, or nothing to withdraw).
 * Errors: insufficient_privilege (42501) unsigned.
 * The writer is told in plain words either way (spotlight_consent_agreed or _withdrawn).
 */
create or replace function public.answer_spotlight_consent(token text, decision text, signature text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  consent public.parental_consents := public.spotlight_consent_by_token(token);
  is_agreed boolean := consent.spotlight_agreed_at is not null and consent.spotlight_withdrawn_at is null;
begin
  -- Step 1: the answer came through our server.
  if not public.parental_consent_is_signed('spotlight-answer|'
      || encode(extensions.digest(coalesce(token, ''), 'sha256'), 'hex') || '|' || decision, signature) then
    raise exception 'This answer wasn''t signed by our server.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: a live link, and an answer that changes something.
  if consent.id is null or exists (select 1 from public.profiles
                                   where id = consent.user_id and deleted_at is not null) then
    return jsonb_build_object('outcome', 'gone');
  end if;
  if decision not in ('agree', 'withdraw') or (decision = 'agree') = is_agreed then
    return jsonb_build_object('outcome', 'already_answered');
  end if;
  -- Step 3: the answer, then the writer is told.
  if decision = 'agree' then
    update public.parental_consents set spotlight_agreed_at = now(), spotlight_withdrawn_at = null
    where id = consent.id;
    perform public.notify(consent.user_id, 'spotlight_consent_agreed', null, '{}'::jsonb);
  else
    update public.parental_consents set spotlight_withdrawn_at = now() where id = consent.id;
    perform public.notify(consent.user_id, 'spotlight_consent_withdrawn', null, '{}'::jsonb);
  end if;
  return jsonb_build_object('outcome', 'ok', 'decision', decision, 'parent_email', consent.parent_email,
    'language', consent.language, 'handle', (select handle from public.profiles where id = consent.user_id));
end;
$$;

comment on function public.answer_spotlight_consent(text, text, text) is
  'The parent''s yes to suggestions, or its withdrawal, from the one-question page; signed by our server (S1-E2-03b).';
revoke execute on function public.answer_spotlight_consent(text, text, text) from public;
grant execute on function public.answer_spotlight_consent(text, text, text) to anon, authenticated;

/**
 * admin_withdraw_spotlight_consent: staff withdraw a parent's yes to suggestions, for example when
 * a parent asks by email (S1-E2-03b).
 * Inputs: target_user_id, the writer; reason_given, why (required).
 * Returns: true. Errors: insufficient_privilege (42501, hint not_allowed) without the Users area
 *   to act; check_violation (23514) with hint reason_missing or no_spotlight.
 * Logged as parental_spotlight.withdrawn; the writer is told.
 */
create or replace function public.admin_withdraw_spotlight_consent(target_user_id uuid, reason_given text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  consent public.parental_consents;
begin
  -- Step 1: staff who act on accounts, with a reason.
  if not public.staff_may('users', 'act') then
    raise exception 'Only the owner, admins and moderators can do this.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  if coalesce(trim(reason_given), '') = '' then
    raise exception 'Say why.' using errcode = 'check_violation', hint = 'reason_missing';
  end if;
  -- Step 2: a yes in force.
  select * into consent from public.parental_consents
  where user_id = target_user_id and status = 'agreed'
    and spotlight_agreed_at is not null and spotlight_withdrawn_at is null
  for update;
  if consent.id is null then
    raise exception 'There is no yes to suggestions to withdraw.' using errcode = 'check_violation', hint = 'no_spotlight';
  end if;
  -- Step 3: withdraw, log and tell the writer.
  update public.parental_consents set spotlight_withdrawn_at = now() where id = consent.id;
  perform public.log_staff_action('parental_spotlight.withdrawn', 'parental_consents', consent.id::text,
    target_user_id, trim(reason_given), jsonb_build_object('spotlight', 'agreed'),
    jsonb_build_object('spotlight', 'withdrawn'));
  perform public.notify(target_user_id, 'spotlight_consent_withdrawn', null, '{}'::jsonb);
  return true;
end;
$$;

comment on function public.admin_withdraw_spotlight_consent(uuid, text) is
  'Staff with the Users area withdraw a parent''s yes to suggestions, logged (S1-E2-03b).';
revoke execute on function public.admin_withdraw_spotlight_consent(uuid, text) from public, anon;
grant execute on function public.admin_withdraw_spotlight_consent(uuid, text) to authenticated;

/* ---------- 5. New and rising writers ---------- */

/**
 * rising_writers: writers whose first chapter came out within rising_writer_days (90 today),
 * for the home page and the Discover "writers" shelf (S1-E5-11).
 * Input: page_size, 1 to 20 (default 20).
 * Returns: a jsonb array of cards, best first (the summed score of their public stories, then
 *   followers gained in 7 days): handle, display_name (pen name, else the handle), category_slug
 *   (their most used category), latest_story (the newest story this reader may read, as
 *   story_card_json(), or null), followers_this_week (only when 5 or more, the writer stats'
 *   "fewer than 5" rule; else null) and is_following.
 * It leaves out the reader themself, anyone blocked either way and anyone failing
 * may_spotlight_writer(). Never a user ID. Open to visitors and members.
 */
create or replace function public.rising_writers(page_size integer default 20)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with caller as (
    select (select auth.uid()) as id
  ),
  blocked as (
    select blocks.blocked_user_id as person_id from public.blocks, caller where blocks.user_id = caller.id
    union
    select blocks.user_id from public.blocks, caller where blocks.blocked_user_id = caller.id
  ),
  -- Stories anyone may find: public, not class-only, readable, not moderated or restricted.
  open_stories as (
    select stories.* from public.stories
    where stories.deleted_at is null and stories.visibility = 'public' and not stories.class_only
      and public.story_has_readable_chapter(stories.id)
      and not public.is_moderated_away('story', stories.id)
      and not exists (select 1 from public.story_restrictions
                      where story_restrictions.story_id = stories.id and story_restrictions.lifted_at is null)
  ),
  writers as (
    select open_stories.user_id,
      min(open_stories.first_published_at) as first_at,
      coalesce(sum(story_scores.score), 0) as score
    from open_stories left join public.story_scores on story_scores.story_id = open_stories.id
    group by open_stories.user_id
  ),
  rising as (
    select writers.*, profiles.handle, coalesce(nullif(profiles.pen_name, ''), profiles.handle) as display_name,
      (select count(*) from public.follows_users
       where follows_users.followed_user_id = writers.user_id
         and follows_users.created_at > now() - interval '7 days') as gained
    from writers
    join public.profiles on profiles.id = writers.user_id and profiles.deleted_at is null
    where writers.first_at >= now()
        - make_interval(days => (public.setting_value('rising_writer_days'))::text::integer)
      and profiles.handle is not null
      and writers.user_id is distinct from (select caller.id from caller)
      and not exists (select 1 from blocked where blocked.person_id = writers.user_id)
      and public.may_spotlight_writer(writers.user_id)
    order by writers.score desc, gained desc, profiles.handle
    limit least(greatest(coalesce(page_size, 20), 1), 20)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'handle', rising.handle,
      'display_name', rising.display_name,
      'category_slug', (select categories.slug from open_stories
                        join public.categories on categories.id = open_stories.category_id
                        where open_stories.user_id = rising.user_id
                        group by categories.slug order by count(*) desc, categories.slug limit 1),
      'latest_story', (select public.story_card_json(open_stories.id) from open_stories
                       where open_stories.user_id = rising.user_id
                         and public.rating_allows(open_stories.rating)
                       order by open_stories.last_chapter_published_at desc nulls last limit 1),
      'followers_this_week', case when rising.gained >= 5 then rising.gained end,
      'is_following', exists (select 1 from public.follows_users, caller
                              where follows_users.user_id = caller.id
                                and follows_users.followed_user_id = rising.user_id))
    order by rising.score desc, rising.gained desc, rising.handle), '[]'::jsonb)
  from rising;
$$;

comment on function public.rising_writers(integer) is
  'New and rising writers: first chapter within rising_writer_days, best first, for this reader; never a user ID (S1-E5-11).';
revoke execute on function public.rising_writers(integer) from public;
grant execute on function public.rising_writers(integer) to anon, authenticated;

/* ---------- 6. The notifications' group ---------- */

/** notification_category: as in LOOK-4a, plus the two spotlight kinds in the account group. */
create or replace function public.notification_category(kind public.notification_kind)
returns text
language sql
immutable
set search_path = ''
as $$
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
    when 'rank_reached' then 'stories'
    when 'space_handover_offered' then 'follows'
    when 'story_featured' then 'stories'
    when 'spotlight_consent_agreed' then 'staff'
    when 'spotlight_consent_withdrawn' then 'staff'
    else 'replies'
  end;
$$;

/* ---------- 7. The consent page's optional box ---------- */

/**
 * answer_parental_consent: as in S1-E2-03, plus a fifth input for the separate, unticked box
 * "You may also suggest my child and their stories to other readers" (S1-E2-03b). The box only
 * counts with "agree"; the server signs it into the message ('answer|<hash>|agree|spotlight'), so
 * nobody can tick it for the parent. Withdrawing the account's consent also ends this yes,
 * because has_spotlight_consent() asks for an agreed consent first.
 * Inputs: the link's token, agree, refuse or withdraw, the page's language, the server's signature
 *   and whether the box was ticked. Returns: as before. Errors: insufficient_privilege when the
 *   signature doesn't match. Where it fits: POST /api/parent-consent/answer.
 */
drop function public.answer_parental_consent(text, text, text, text);
create or replace function public.answer_parental_consent(
  token text,
  decision text,
  page_language text,
  signature text,
  allow_spotlight boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.parental_consents;
  answer jsonb;
  -- The box counts only with a yes (GDPR art. 7: a separate, specific consent).
  wants_spotlight boolean := coalesce(allow_spotlight, false) and decision = 'agree';
  signed_message text;
begin
  -- Step 1: the request came through our server; a ticked box is part of what it signed.
  signed_message := 'answer|' || encode(extensions.digest(coalesce(token, ''), 'sha256'), 'hex')
    || '|' || decision;
  if wants_spotlight then
    signed_message := signed_message || '|spotlight';
  end if;
  if not public.parental_consent_is_signed(signed_message, signature) then
    raise exception 'This answer wasn''t signed by our server.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: a live request; agree and refuse need a waiting one, withdraw an agreed one.
  request := public.parental_consent_by_token(token);
  if request.id is null or request.status = 'replaced'
     or exists (select 1 from public.profiles where id = request.user_id and deleted_at is not null) then
    return jsonb_build_object('outcome', 'gone');
  end if;
  if (decision in ('agree', 'refuse') and request.status <> 'waiting')
     or (decision = 'withdraw' and request.status <> 'agreed')
     or decision not in ('agree', 'refuse', 'withdraw') then
    return jsonb_build_object('outcome', 'already_answered', 'status', request.status);
  end if;
  -- Step 3: who to write to, read before a refusal erases the writer's address.
  select jsonb_build_object('outcome', 'ok', 'decision', decision, 'writer_email', users.email,
      'writer_language', coalesce(profiles.locale, 'ro'), 'handle', profiles.handle,
      'parent_email', request.parent_email, 'parent_language', request.language,
      'allow_spotlight', wants_spotlight)
    into answer
  from public.profiles join auth.users on users.id = profiles.id
  where profiles.id = request.user_id;
  -- Step 4: the answer itself.
  if decision = 'agree' then
    perform public.parental_consent_agree(request, coalesce(nullif(page_language, ''), request.language));
    if wants_spotlight then
      update public.parental_consents
      set spotlight_agreed_at = now(), spotlight_withdrawn_at = null
      where id = request.id;
    end if;
  elsif decision = 'refuse' then
    update public.parental_consents set status = 'refused', decided_at = now() where id = request.id;
    perform public.erase_unchecked_account(request.user_id);
  else
    update public.parental_consents
    set status = 'withdrawn', withdrawn_at = now(), withdrawn_by = 'parent',
        spotlight_withdrawn_at = case when spotlight_agreed_at is not null then now() end
    where id = request.id;
    perform public.notify(request.user_id, 'parental_consent_withdrawn', null, '{}'::jsonb);
  end if;
  return answer;
end;
$$;
comment on function public.answer_parental_consent(text, text, text, text, boolean) is
  'A parent''s or guardian''s answer from the consent link, with the optional suggestions box, signed by our server (S1-E2-03, S1-E2-03b).';
revoke execute on function public.answer_parental_consent(text, text, text, text, boolean) from public;
grant execute on function public.answer_parental_consent(text, text, text, text, boolean) to anon, authenticated;

/* ---------- 8. Discover's shelf ---------- */

-- "writers" (Writers to follow this week, S1-E5-11) joins Discover's shelves straight after
-- "rising", as on board Discover. Staff can move or remove it like any other word. Safe to run
-- twice: a list that already has it is left alone.
update public.settings
set value = coalesce((
    select jsonb_agg(words.word order by words.position)
    from (
      select listed.word, listed.position::numeric as position
      from jsonb_array_elements(settings.value) with ordinality as listed (word, position)
      union all
      select '"writers"'::jsonb,
        coalesce((select listed.position from jsonb_array_elements(settings.value)
                    with ordinality as listed (word, position)
                  where listed.word = '"rising"'), 0) + 0.5
    ) as words), settings.value)
where settings.key = 'discover_shelves' and not settings.value ? 'writers';
