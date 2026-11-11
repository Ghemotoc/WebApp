-- Migration: four new markets and three Nordic interface languages, all closed (bundle MARKETS-2,
-- part a; stories S1-E11-30 and S1-E11-31).
--
-- What it does:
--   1. Adds the languages sv (Swedish), da (Danish) and nb (Norwegian Bokmål) as interface
--      languages, closed. A language opens only from Staff › Settings, and only with a moderator who
--      reads it (admin_set_language_status(), S1-E11-05); nothing here opens one.
--   2. Adds the markets SE, DK, NO and MD, closed, legal check not started, minimum age 13 (their
--      age rows came with MARKETS-1, country_age_rules). Ireland is already a market and stays
--      closed: the owner opens it like the others.
--   3. One list of interface languages for the database, public.interface_language_codes(), the
--      twin of src/schemas/interfaceLanguages.ts, plus three small helpers: is_interface_language(),
--      is_open_interface_language() and written_language_for().
--   4. A person's interface language (profiles.locale) and a live session's language may now be any
--      of the five. The tables that store the language an email or a statement is WRITTEN in
--      (support tickets, public notices, parental consents, statements of reasons, the opening
--      list) stay ro or en: every text there exists only in those two, and written_language_for()
--      gives Swedish, Danish and Norwegian readers English.
--   5. The functions that turned a profile's language into "en or else ro" now ask
--      written_language_for(), so a Swedish account gets English replies instead of Romanian.
--   6. "Interface language" used to mean "always open". Now that sv, da and nb are interface
--      languages that start closed: only Romanian and English must stay open
--      (admin_set_language_status()), and forum and tag names are needed in the OPEN interface
--      languages only (forum_name_problems(), tag_name_problems(), admin_list_forums(),
--      admin_list_tags(), write_space_forum_names()), so staff aren't asked for a Swedish name
--      before Swedish opens.
--   Steps 5 and 6 copy each function's body unchanged apart from the line marked MARKETS-2a.
-- Who decided: Robert, 8 Nov 2026, 07:52 UTC (launch countries), 07:53 UTC (site copy in Swedish,
-- Danish and Norwegian) and 08:06 UTC (Ireland added).
-- Where it fits: the app reads the open languages through the languages table
-- (useOpenInterfaceLanguages()); set_my_locale() and create_profile_from_sign_up() store them.

-- Step 1: the three Nordic interface languages, closed until staff open them.
insert into public.languages (code, status, is_interface)
values ('sv', 'closed', true), ('da', 'closed', true), ('nb', 'closed', true)
on conflict (code) do nothing;

-- Step 2: the four new markets, closed with their legal check not started. Each lists its own
-- language first and English second, so a market can open on English alone while its own
-- language is still being translated (the brief: "when the owner opens one with the legal check
-- done and English open, then sign-ups from it work").
insert into public.markets (country_code, status, legal_check, minimum_age, languages)
values
  ('SE', 'closed', 'not_started', 13, array['sv', 'en']),
  ('DK', 'closed', 'not_started', 13, array['da', 'en']),
  ('NO', 'closed', 'not_started', 13, array['nb', 'en']),
  ('MD', 'closed', 'not_started', 13, array['ro', 'en'])
on conflict (country_code) do nothing;

-- Step 3: the one list, and the helpers built on it.

/**
 * interface_language_codes: every interface language the app knows, open or not.
 * Returns: text[] in the language menus' order. The twin of interfaceLanguages in
 * src/schemas/interfaceLanguages.ts: change both together.
 * Errors: none. Where it fits: the checks and functions below.
 */
create or replace function public.interface_language_codes()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['en', 'ro', 'sv', 'da', 'nb']::text[];
$$;

comment on function public.interface_language_codes() is
  'Every interface language the app knows, open or not: en, ro, sv, da, nb (MARKETS-2a). The twin of src/schemas/interfaceLanguages.ts.';

/**
 * is_interface_language: whether a code is one of the interface languages.
 * Input: code, a language code (may be null). Returns: true or false, never null.
 */
create or replace function public.is_interface_language(code text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(code = any (public.interface_language_codes()), false);
$$;

comment on function public.is_interface_language(text) is
  'True when the code is one of the interface languages (MARKETS-2a); used by the table checks.';

/**
 * is_open_interface_language: whether a code is an interface language staff have opened.
 * Input: code. Returns: true only for an interface language whose languages row is open.
 * Stable, not immutable: it reads the languages table, which staff change.
 */
create or replace function public.is_open_interface_language(code text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.is_interface_language(code)
    and exists (
      select 1 from public.languages
      where languages.code = is_open_interface_language.code
        and languages.status = 'open'
        and languages.is_interface
    );
$$;

comment on function public.is_open_interface_language(text) is
  'True for an interface language whose languages row is open (MARKETS-2a); a closed one is never saved as a person''s language.';

/**
 * written_language_for: the language a text is written in for a person's language.
 * Input: code, the person's language (may be null). Returns: 'ro' or 'en'. Romanian and English
 * stay as they are; Swedish, Danish and Norwegian read in English until their texts exist (the
 * MARKETS-2 brief); nothing known keeps Romanian, as before. The twin of writtenLanguageFor().
 */
create or replace function public.written_language_for(code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when code in ('ro', 'en') then code
    when public.is_interface_language(code) then 'en'
    else 'ro'
  end;
$$;

comment on function public.written_language_for(text) is
  'ro or en: the language an email or statement is written in for a person''s language; sv, da and nb read in English (MARKETS-2a).';

-- The helpers hold nothing private, and the sign-up and language functions call them.
grant execute on function public.interface_language_codes() to anon, authenticated;
grant execute on function public.is_interface_language(text) to anon, authenticated;
grant execute on function public.is_open_interface_language(text) to anon, authenticated;
grant execute on function public.written_language_for(text) to anon, authenticated;

-- Step 4: a person's language and a live session's language may be any interface language.
alter table public.profiles drop constraint profiles_locale_is_supported;
alter table public.profiles add constraint profiles_locale_is_supported
  check (public.is_interface_language(locale));

comment on column public.profiles.locale is
  'Interface language the person chose: one of interface_language_codes(), and only an open one is saved (set_my_locale(); S1-E1-04, MARKETS-2a).';

alter table public.live_sessions drop constraint live_sessions_language_known;
alter table public.live_sessions add constraint live_sessions_language_known
  check (public.is_interface_language(language_code));

-- Step 5: saving one's language accepts any OPEN interface language.

/**
 * set_my_locale: saves the signed-in person's interface language on their own profile (S1-E1-04).
 * Input: new_locale, an interface language code. Returns: the saved code.
 * Errors: insufficient_privilege when signed out; invalid_parameter_value for a code that isn't an
 * open interface language (MARKETS-2a: a closed language can't be chosen, the menus never show
 * one); no_data_found when the account has no live profile.
 */
create or replace function public.set_my_locale(new_locale text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_locale text;
begin
  -- Step 1: only a signed-in person has a profile to save to.
  if (select auth.uid()) is null then
    raise exception 'Sign in to save your language to your account.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Step 2: refuse anything but an open interface language, with a clear message (the table's
  -- check would refuse an unknown code too, but with a less helpful one, and it can't see status).
  if new_locale is null or not public.is_open_interface_language(new_locale) then
    raise exception 'Unsupported interface language: %. Use one of the open languages.',
      coalesce(new_locale, 'null')
      using errcode = 'invalid_parameter_value';
  end if;

  -- Step 3: change the caller's own row only, and only while the account is live.
  update public.profiles
    set locale = new_locale
    where profiles.id = (select auth.uid()) and profiles.deleted_at is null
    returning profiles.locale into saved_locale;

  -- Step 4: no row means a deleted account or a sign-up whose profile doesn't exist yet.
  if saved_locale is null then
    raise exception 'This account has no profile to save the language to.'
      using errcode = 'no_data_found';
  end if;

  return saved_locale;
end;
$$;

comment on function public.set_my_locale(text) is
  'Saves the signed-in person''s interface language (any open one) on their own profile (S1-E1-04, MARKETS-2a).';

-- Steps 5 and 6: the functions below, each copied as it stands with one line changed.

-- admin_set_language_status: unchanged apart from the language line marked MARKETS-2a.
CREATE OR REPLACE FUNCTION public.admin_set_language_status(language_code text, new_status language_status)
 RETURNS language_status
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  target public.languages;
  moderator_count integer;
begin
  perform public.require_settings_staff();
  select * into target from public.languages where code = language_code for update;
  if target.id is null then
    raise exception 'There is no such language.' using errcode = 'no_data_found';
  end if;
  -- Step 1: Romanian and English stay open: every screen is written in them. MARKETS-2a: the
  -- Nordic interface languages (sv, da, nb) open and close like any other.
  if target.is_interface and target.code in ('ro', 'en') and new_status <> 'open' then
    raise exception 'The interface is in this language, so it stays open.' using errcode = 'check_violation', hint = 'interface_language';
  end if;
  -- Step 2: criterion 2: a language opens only with a moderator who reads it.
  select moderators into moderator_count from public.language_moderator_counts() where code = language_code;
  if new_status <> 'closed' and coalesce(moderator_count, 0) = 0 then
    raise exception 'No moderator who reads this language is on the rota yet.' using errcode = 'check_violation', hint = 'no_moderator';
  end if;
  update public.languages set status = new_status where id = target.id;
  perform public.log_staff_action('settings.language_status', 'languages', target.code, null, null,
    jsonb_build_object('status', target.status), jsonb_build_object('status', new_status));
  return new_status;
end;
$function$;

-- admin_list_forums: unchanged apart from the language line marked MARKETS-2a.
CREATE OR REPLACE FUNCTION public.admin_list_forums()
 RETURNS TABLE(id uuid, parent_id uuid, level smallint, slug text, "position" integer, is_pinned boolean, accent forum_accent, names jsonb, missing_languages text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  -- Only forum staff may see the list.
  perform public.require_forum_staff();
  -- Every live public forum, with its names per language and the interface languages it lacks.
  return query
  select forums.id, forums.parent_id, forums.level, forums.slug, forums.position, forums.is_pinned,
    forums.accent,
    coalesce((select jsonb_object_agg(forum_names.language_code,
        jsonb_build_object('name', forum_names.name, 'description', forum_names.description))
      from public.forum_names where forum_names.forum_id = forums.id), '{}'::jsonb),
    array(select languages.code from public.languages
      where languages.is_interface and languages.status = 'open' and not exists (
        select 1 from public.forum_names
        where forum_names.forum_id = forums.id and forum_names.language_code = languages.code)
      order by languages.code)
  from public.forums
  where forums.deleted_at is null and forums.space_id is null
  order by forums.level, forums.position, forums.slug;
end;
$function$;

-- admin_list_tags: unchanged apart from the language line marked MARKETS-2a.
CREATE OR REPLACE FUNCTION public.admin_list_tags(which_tags text)
 RETURNS TABLE(tag_id uuid, name text, status tag_status, is_recommended boolean, story_count bigint, names jsonb, missing_languages text[], created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public.require_tag_staff();
  return query
  with named as (
    select tags.id, tags.name, tags.status, tags.is_recommended, tags.created_at,
      (select count(*) from public.story_tags where story_tags.tag_id = tags.id) as story_count,
      coalesce((select jsonb_object_agg(tag_names.language_code, tag_names.name)
        from public.tag_names where tag_names.tag_id = tags.id), '{}'::jsonb) as names,
      array(select languages.code from public.languages
        where languages.is_interface and languages.status = 'open' and not exists (
          select 1 from public.tag_names
          where tag_names.tag_id = tags.id and tag_names.language_code = languages.code)
        order by languages.code) as missing_languages
    from public.tags
  )
  select named.id, named.name, named.status, named.is_recommended, named.story_count, named.names,
    named.missing_languages, named.created_at
  from named
  where case which_tags
      when 'waiting' then named.status = 'waiting'
      when 'missing' then named.status = 'approved' and cardinality(named.missing_languages) > 0
      when 'approved' then named.status = 'approved'
      else false
    end
  order by case when which_tags = 'waiting' then named.created_at end,
    named.name;
end;
$function$;

-- forum_name_problems: unchanged apart from the language line marked MARKETS-2a.
CREATE OR REPLACE FUNCTION public.forum_name_problems(names jsonb)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select array(
    select languages.code || ':empty' from public.languages
    where languages.is_interface and languages.status = 'open' and coalesce(btrim(names -> languages.code ->> 'name'), '') = ''
    union all
    select given.key || ':unknown_language' from jsonb_each(coalesce(names, '{}')) as given
    where not exists (select 1 from public.languages where languages.code = given.key)
    union all
    select given.key || ':too_long' from jsonb_each(coalesce(names, '{}')) as given
    where char_length(btrim(coalesce(given.value ->> 'name', ''))) > 80
    union all
    select given.key || ':description_too_long' from jsonb_each(coalesce(names, '{}')) as given
    where char_length(btrim(coalesce(given.value ->> 'description', ''))) > 200
  );
$function$;

-- tag_name_problems: unchanged apart from the language line marked MARKETS-2a.
CREATE OR REPLACE FUNCTION public.tag_name_problems(target_tag_id uuid, names jsonb)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  -- Every interface language needs a name.
  select array(
    select languages.code || ':empty' from public.languages
    where languages.is_interface and languages.status = 'open' and public.normalise_tag(names ->> languages.code) = ''
    union all
    select given.key || ':unknown_language' from jsonb_each_text(coalesce(names, '{}')) as given
    where not exists (select 1 from public.languages where languages.code = given.key)
    union all
    select given.key || ':too_long' from jsonb_each_text(coalesce(names, '{}')) as given
    where char_length(btrim(given.value)) > 40
    union all
    select given.key || ':taken' from jsonb_each_text(coalesce(names, '{}')) as given
    where exists (
      select 1 from public.tag_names
      where tag_names.language_code = given.key and tag_names.tag_id <> target_tag_id
        and tag_names.normalised_name = public.normalise_tag(given.value))
  );
$function$;

-- write_space_forum_names: unchanged apart from the language line marked MARKETS-2a.
CREATE OR REPLACE FUNCTION public.write_space_forum_names(target_space_id uuid, name text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  insert into public.forum_names (forum_id, language_code, name)
  select public.space_forum_id(target_space_id), languages.code, name
  from public.languages where languages.is_interface and languages.status = 'open'
  on conflict on constraint forum_names_one_per_language do update set name = excluded.name;
$function$;

-- create_my_support_ticket: unchanged apart from the language line marked MARKETS-2a.
CREATE OR REPLACE FUNCTION public.create_my_support_ticket(subject text, body text, category support_ticket_category DEFAULT 'other'::support_ticket_category)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller_id uuid := (select auth.uid());
  clean_subject text := public.clean_mail_text(subject, 150);
  clean_body text := public.clean_mail_text(body, 4000);
  caller_language text;
  new_ticket public.support_tickets;
begin
  -- Step 1: signed in, and within the hourly limit.
  if caller_id is null then
    raise exception 'Log in to ask for help.' using errcode = 'insufficient_privilege';
  end if;
  perform public.take_rate_limit('support_ticket');
  -- Step 2: the ticket in the member's language, its first message and the first history line.
  -- MARKETS-2a: the replies' language is the written one for the person's language (sv, da
  -- and nb read in English until their texts exist).
  select public.written_language_for(profiles.locale) into caller_language
  from public.profiles where profiles.id = caller_id;
  insert into public.support_tickets (requester_user_id, language, subject, channel, category)
  values (caller_id, coalesce(caller_language, 'ro'), clean_subject, 'in_app', coalesce(category, 'other'))
  returning * into new_ticket;
  insert into public.support_ticket_messages (ticket_id, kind, author_user_id, body, channel)
  values (new_ticket.id, 'from_requester', caller_id, clean_body, 'in_app');
  perform public.record_support_event(new_ticket.id, 'created', null, jsonb_build_object('channel', 'in_app'));
  return jsonb_build_object('number', new_ticket.number);
end;
$function$;

-- start_email_support_ticket: unchanged apart from the language line marked MARKETS-2a.
CREATE OR REPLACE FUNCTION public.start_email_support_ticket(sender text, subject text, body text, email_message_id text, is_automatic boolean, follow_up_of uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  sender_account uuid := public.account_for_email(sender);
  sender_language text;
  is_known_spam boolean := public.support_sender_is_spam(sender, sender_account);
  new_ticket public.support_tickets;
  recent_acknowledgements integer;
begin
  -- Step 1: the language: the account's, or Romanian (the acknowledgement then carries both).
  -- MARKETS-2a: the written language for the account's language (sv, da, nb read in English).
  select public.written_language_for(profiles.locale) into sender_language
  from public.profiles where profiles.id = sender_account;
  -- Step 2: the ticket, its first message and its first history line.
  insert into public.support_tickets (requester_user_id, requester_email, language, subject, channel,
    follow_up_of_ticket_id, is_spam, marked_spam_at)
  values (sender_account, lower(btrim(sender)), coalesce(sender_language, 'ro'), subject, 'email', follow_up_of,
    is_known_spam, case when is_known_spam then now() end)
  returning * into new_ticket;
  insert into public.support_ticket_messages (ticket_id, kind, author_user_id, body, channel, email_message_id)
  values (new_ticket.id, 'from_requester', sender_account, body, 'email', email_message_id);
  perform public.record_support_event(new_ticket.id, 'created', null, jsonb_strip_nulls(jsonb_build_object(
    'channel', 'email',
    'follow_up_of', (select tickets.number from public.support_tickets as tickets where tickets.id = follow_up_of))));
  -- Step 3: no acknowledgement for spam, a machine, or a loop.
  select count(*) into recent_acknowledgements
  from public.support_ticket_emails as emails
  join public.support_tickets as tickets on tickets.id = emails.ticket_id
  where emails.kind = 'acknowledgement' and emails.created_at > now() - interval '1 hour'
    and tickets.requester_email = new_ticket.requester_email;
  if is_known_spam or coalesce(is_automatic, false) or recent_acknowledgements >= 3 then
    return jsonb_build_object('number', new_ticket.number, 'acknowledged', false);
  end if;
  insert into public.support_ticket_emails (ticket_id, kind) values (new_ticket.id, 'acknowledgement');
  return jsonb_build_object('number', new_ticket.number, 'acknowledged', true);
end;
$function$;

-- issue_statement_of_reasons: unchanged apart from the language line marked MARKETS-2a.
CREATE OR REPLACE FUNCTION public.issue_statement_of_reasons(recipient_id uuid, chosen_action statement_action, ground statement_ground, ground_key text, facts text, about jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  new_statement public.statements_of_reasons;
  item_type public.reportable_type := (about ->> 'item_type')::public.reportable_type;
  item_id uuid := (about ->> 'item_id')::uuid;
begin
  -- Step 1: the stored copy, with a summary of the item made now.
  insert into public.statements_of_reasons (reference, user_id, case_id, sanction_id, story_id, action,
    item_type, item_summary, facts, ground, ground_key, automated_detection, restriction_ends_at,
    language, appeal_until)
  values (
    'S-' || lpad(nextval('public.statement_reference_seq')::text, 6, '0'),
    recipient_id, (about ->> 'case_id')::uuid, (about ->> 'sanction_id')::uuid, (about ->> 'story_id')::uuid,
    chosen_action, item_type,
    case when item_type is not null and item_id is not null then public.reportable_item_summary(item_type, item_id) end,
    nullif(btrim(coalesce(facts, '')), ''), ground, ground_key,
    coalesce((about ->> 'automated_detection')::boolean, false),
    (about ->> 'restriction_ends_at')::timestamptz,
    coalesce((select public.written_language_for(profiles.locale)
              from public.profiles where profiles.id = recipient_id), 'ro'),
    now() + interval '6 months')
  returning * into new_statement;
  -- Step 2: a statement without a case tells the person now; a case's notification links it.
  if new_statement.case_id is null then
    perform public.notify(recipient_id, 'moderation_decision', null,
      jsonb_build_object('statement_id', new_statement.id, 'story_id', new_statement.story_id));
  end if;
  return new_statement.id;
end;
$function$;

-- submit_contact_ticket: unchanged apart from the language line marked MARKETS-2a.
CREATE OR REPLACE FUNCTION public.submit_contact_ticket(payload text, signature text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  fields jsonb;
  sender_email text;
  sender_language text;
  sender_account_id uuid;
  new_ticket public.support_tickets;
begin
  -- Step 1: only a fresh payload our server signed.
  if not public.support_payload_is_signed(payload, signature) then
    raise exception 'This message didn''t come through the form.' using errcode = 'insufficient_privilege';
  end if;
  fields := payload::jsonb;
  if (fields ->> 'sentAt')::timestamptz < now() - interval '15 minutes' then
    raise exception 'This message is too old to save.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: who wrote, and in which language.
  sender_email := btrim(fields ->> 'email');
  -- MARKETS-2a: the written language for the page's language (sv, da, nb read in English).
  sender_language := public.written_language_for(fields ->> 'language');
  sender_account_id := public.account_for_email(sender_email);
  -- Step 3: the ticket, its first message and the first history line.
  insert into public.support_tickets (requester_user_id, requester_email, language, subject, channel, category)
  values (sender_account_id, sender_email, sender_language,
    public.contact_topic_subject(fields ->> 'topic', sender_language), 'contact_form',
    case when fields ->> 'topic' = 'account' then 'account'::public.support_ticket_category else 'other' end)
  returning * into new_ticket;
  insert into public.support_ticket_messages (ticket_id, kind, author_user_id, body, channel)
  values (new_ticket.id, 'from_requester', sender_account_id, public.clean_mail_text(fields ->> 'message', 4000), 'contact_form');
  perform public.record_support_event(new_ticket.id, 'created', null,
    jsonb_build_object('channel', 'contact_form', 'topic', fields ->> 'topic'));
  return new_ticket.number;
end;
$function$;

-- create_profile_from_sign_up: unchanged apart from the language line marked MARKETS-2a.
CREATE OR REPLACE FUNCTION public.create_profile_from_sign_up(new_user_id uuid, sign_up_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  chosen_locale text := sign_up_data ->> 'locale';
  place jsonb := public.sign_up_country(sign_up_data);
  birth_year smallint;
  birth_month smallint;
  country text;
  chosen_handle text;
  outcome text;
begin
  -- Step 1: the year (and month) of birth, and the product's own age rules (S1-E2-02).
  birth_year := public.sign_up_birth_year(sign_up_data);
  birth_month := public.sign_up_birth_month(sign_up_data, birth_year);
  outcome := public.sign_up_age_outcome(birth_year, birth_month);
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the age rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 2: the country: the person's own answer, else the connection's (S1-E2-10), and its rules.
  country := coalesce(place ->> 'country', public.verified_signup_country(sign_up_data ->> 'signup_context'));
  outcome := public.sign_up_market_outcome(country, birth_year, birth_month, place ->> 'region');
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the market rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 3: the username (S1-E2-04).
  chosen_handle := public.sign_up_handle(sign_up_data);

  -- Step 4: the profile, with the form's language, the country (and region) and the username.
  insert into public.profiles (id, birth_year, birth_month, locale, country_code, legal_region_code,
    country_chosen_at, handle)
  values (
    new_user_id,
    birth_year,
    birth_month,
    -- MARKETS-2a: any open interface language (sv, da, nb once staff open them), else Romanian.
    case when public.is_open_interface_language(chosen_locale) then chosen_locale else 'ro' end,
    country,
    place ->> 'region',
    case when place ->> 'country' is not null then now() end,
    chosen_handle
  );

  -- Step 5: the waiting list (WAITLIST-1), else the invite while the test is invite only
  -- (S1-E11-17), after the profile so the invite's audit row can name the new account. A class
  -- link counts too, and joins the class (IDEAS-3c).
  if public.is_feature_enabled('waitlist') then
    perform public.join_waitlist_at_sign_up(new_user_id, sign_up_data);
  elsif public.is_feature_enabled('invite_only') then
    perform public.use_sign_up_invite(sign_up_data ->> 'invite_code', new_user_id);
  end if;

  -- Step 6: which terms and privacy notice the person accepted, and when (Q15).
  perform public.record_sign_up_consent(new_user_id, 'terms', sign_up_data ->> 'accepted_terms_version_id');
  perform public.record_sign_up_consent(new_user_id, 'privacy', sign_up_data ->> 'accepted_privacy_version_id');

  -- Step 7: the scrambled IP, and a moderator's case if it matches an account banned in the
  -- last 30 days (part f2). Never a refusal: schools share addresses, so a person decides.
  perform public.record_sign_up_ips(new_user_id, sign_up_data ->> 'signup_ip');
end;
$function$;
