/*
 * TRIAL-1: the trial's "Report a bug" button and the "computers only" gate (TRIAL-FEEDBACK and
 * TRIAL-DESKTOP; Robert, 21 Nov 2026, 07:05 UTC; canvas boards J30 to J33, drawn by DESIGN).
 *
 * What it does:
 *   1. Two public feature flags, both off, so nothing changes until staff switch them on in
 *      Staff › Settings for the trial:
 *      - trial_feedback: a "Report a bug" tab on the right edge of every member page, for
 *        signed-in members. A report becomes a support ticket and an email to the support inbox,
 *        through the Contact us pipeline (server/contact.ts).
 *      - desktop_only: on a phone or tablet (a touch-first device, not a narrow window), the app
 *        shows one page, "For now, the test runs on a computer", with Copy link, instead of the
 *        page that was opened (board J33).
 *   2. contact_topic_subject() gives the new topic 'bug_report' its subject ("Bug report",
 *      "Raport de eroare"); every other topic keeps its subject.
 *   3. submit_contact_ticket() files a bug report under the support category 'bug' (it was
 *      'account' for the account topic and 'other' for everything else). Nothing else changes.
 * Privacy: a bug report carries the page's path (never its query or hash), the browser's name
 *   and version and the window and screen sizes, written into the message the person sends, so
 *   they sit in the ticket like any other message and follow the support retention schedule.
 *   No new column, no new table, no new personal data.
 * Who calls it: src/features/trial/ (the flags and the report) and server/contact.ts (the ticket).
 * Tests: supabase/tests/database/391-trial-feedback.test.sql.
 */

/* ---------- 1. The two flags, off until the trial starts ---------- */

insert into public.feature_flags (key, is_enabled, is_public, description)
values
  ('trial_feedback', false, true,
   'While on, signed-in members see a "Report a bug" tab on the right edge of member pages; a report becomes a support ticket (TRIAL-FEEDBACK).'),
  ('desktop_only', false, true,
   'While on, phones and tablets see "For now, the test runs on a computer" with Copy link instead of the page they opened (TRIAL-DESKTOP).')
on conflict (key) do nothing;

/* ---------- 2. The subject of a bug report ---------- */

/**
 * contact_topic_subject: the subject a Contact us ticket gets, in the person's language, from the
 * form's topic (the form has no subject field, S1-E14-04). TRIAL-1 adds 'bug_report'.
 * Inputs: the topic and the written language ('ro' or 'en'). Returns the subject. Raises nothing.
 * Called by submit_contact_ticket(). Internal.
 */
create or replace function public.contact_topic_subject(topic text, language text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when language = 'en' then case topic
      when 'question' then 'Question' when 'account' then 'Account problem'
      when 'data_request' then 'Data request' when 'bug_report' then 'Bug report'
      else 'Other' end
    else case topic
      when 'question' then 'Întrebare' when 'account' then 'Problemă cu contul'
      when 'data_request' then 'Cerere privind datele' when 'bug_report' then 'Raport de eroare'
      else 'Altceva' end
  end;
$$;

comment on function public.contact_topic_subject(text, text) is 'Internal: a Contact us ticket''s subject from its topic (S1-E11-13; bug_report since TRIAL-1).';
revoke execute on function public.contact_topic_subject(text, text) from public, anon, authenticated;

/* ---------- 3. A bug report's ticket category ---------- */

/**
 * submit_contact_ticket: saves a Contact us message, or a trial bug report, as a support ticket.
 * Inputs: the JSON payload our server built and its signature (support_ticket_secret in Vault).
 * Returns the ticket's number. Raises insufficient_privilege for an unsigned or old payload.
 * Called by server/contact.ts (S1-E11-13). Unchanged from MARKETS-2a apart from the category
 * line marked TRIAL-1.
 */
create or replace function public.submit_contact_ticket(payload text, signature text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
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
  -- Step 2: who wrote, and in which language (MARKETS-2a: sv, da, nb read in English).
  sender_email := btrim(fields ->> 'email');
  sender_language := public.written_language_for(fields ->> 'language');
  sender_account_id := public.account_for_email(sender_email);
  -- Step 3: the ticket, its first message and the first history line.
  insert into public.support_tickets (requester_user_id, requester_email, language, subject, channel, category)
  values (sender_account_id, sender_email, sender_language,
    public.contact_topic_subject(fields ->> 'topic', sender_language), 'contact_form',
    -- TRIAL-1: a bug report goes under Bug, so staff can filter the trial's reports.
    case fields ->> 'topic'
      when 'account' then 'account'::public.support_ticket_category
      when 'bug_report' then 'bug'::public.support_ticket_category
      else 'other'::public.support_ticket_category end)
  returning * into new_ticket;
  insert into public.support_ticket_messages (ticket_id, kind, author_user_id, body, channel)
  values (new_ticket.id, 'from_requester', sender_account_id, public.clean_mail_text(fields ->> 'message', 4000), 'contact_form');
  perform public.record_support_event(new_ticket.id, 'created', null,
    jsonb_build_object('channel', 'contact_form', 'topic', fields ->> 'topic'));
  return new_ticket.number;
end;
$$;

comment on function public.submit_contact_ticket(text, text) is
  'Saves a Contact us message or a trial bug report as a support ticket, signed by our server (S1-E11-13; TRIAL-1).';
revoke execute on function public.submit_contact_ticket(text, text) from public;
grant execute on function public.submit_contact_ticket(text, text) to anon, authenticated;
