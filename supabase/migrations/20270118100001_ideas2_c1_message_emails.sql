/*
 * Migration: an email when a private message arrives, with quiet hours (bundle IDEAS-2, part c1;
 * idea IDEA-20261101-6, approved by Robert on 2 Nov 2026, 22:00).
 *
 * Until now a private message never sent an email. This adds one, with the person's own quiet
 * hours, through the notification email worker that already sends every other notice
 * (S1-E7-02, server/notification-emails.ts):
 * - four columns on profiles: whether message emails are on and the quiet hours (on, from, until).
 *   Empty means the default for the age group: emails on for everyone; quiet hours on for anyone
 *   under 18 (or of unknown age), 21:00 to 07:00 (the idea's proposal), and off for adults, who
 *   may switch them on (22:00 to 07:00 offered). Under-18s can move the hours but never turn them
 *   off or make them shorter than 22:00 to 07:00 (Q50, the quiet hours already decided for push).
 * - email_outbox gains conversation_id and send_after, and the delivery 'message'. A new message
 *   queues one email per chat, no sooner than 5 minutes later (someone chatting in the app gets
 *   none) and never inside the recipient's quiet hours: it waits until they end.
 * - email_worker_claim() leaves an email until its send_after, and when it is due checks that the
 *   chat still has unread messages from that person, that nobody blocked the other and that the
 *   request wasn't deleted; otherwise it closes it without sending. The email names the sender
 *   and links to the chat, never the words (CLAUDE.md rule 12).
 * - my_message_settings() also returns the email choices; set_message_emails() saves them; the
 *   one-click unsubscribe turns message emails off too.
 * Times are Romanian time (Europe/Bucharest): Romania is the first market, and profiles hold no
 * time zone. A per-person time zone is a follow-up once other markets open.
 * Who calls it: Settings > Messages (src/features/messages/components/MessageEmailSettings.tsx),
 *   the messages trigger, and the email worker.
 * Tests: supabase/tests/database/280-message-emails.test.sql.
 */

/* ---------- The person's choices ---------- */

alter table public.profiles
  add column message_emails_on boolean,
  add column message_quiet_hours_on boolean,
  add column message_quiet_from time,
  add column message_quiet_until time;

comment on column public.profiles.message_emails_on is
  'Whether a new private message is emailed; empty means on (IDEAS-2 idea 6). Never public.';
comment on column public.profiles.message_quiet_hours_on is
  'Whether message emails wait for the end of quiet hours; empty means on under 18, off for adults (IDEAS-2 idea 6; Q50).';
comment on column public.profiles.message_quiet_from is
  'When message quiet hours start, Romanian time; empty means the default for the age group.';
comment on column public.profiles.message_quiet_until is
  'When message quiet hours end, Romanian time; empty means 07:00.';

/* ---------- The outbox ---------- */

alter table public.email_outbox
  add column conversation_id uuid references public.conversations (id) on delete cascade,
  add column send_after timestamptz;
alter table public.email_outbox drop constraint email_outbox_delivery_is_known;
alter table public.email_outbox add constraint email_outbox_delivery_is_known
  check (delivery in ('instant', 'daily', 'required', 'message'));
alter table public.email_outbox add constraint email_outbox_message_has_chat
  check ((delivery = 'message') = (conversation_id is not null));
create index email_outbox_conversation on public.email_outbox (conversation_id)
  where conversation_id is not null;

comment on column public.email_outbox.conversation_id is
  'For a message email: the chat it is about. Never the words.';
comment on column public.email_outbox.send_after is
  'Not sent before this time: 5 minutes after the message, or the end of quiet hours.';

/* ---------- Quiet hours ---------- */

/**
 * message_email_choices: one person's message email choices, with the defaults filled in.
 * Input: the profile. Returns: JSON {emails_on, quiet_hours_on, quiet_from, quiet_until,
 *   must_keep_quiet_hours} with times as 'HH:MM'.
 * Internal: my_message_settings(), message_email_send_time() and set_message_emails().
 */
create or replace function public.message_email_choices(person public.profiles)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  is_young boolean := public.is_under_18_or_unknown(person.id);
  -- Step 1: the defaults: under-18s 21:00 to 07:00 (idea 6's proposal), adults 22:00 to 07:00.
  default_from time := case when is_young then time '21:00' else time '22:00' end;
begin
  -- Step 2: the saved choices over the defaults; under-18s always keep quiet hours (Q50).
  return jsonb_build_object(
    'emails_on', coalesce(person.message_emails_on, true),
    'quiet_hours_on', is_young or coalesce(person.message_quiet_hours_on, false),
    'quiet_from', to_char(coalesce(person.message_quiet_from, default_from), 'HH24:MI'),
    'quiet_until', to_char(coalesce(person.message_quiet_until, time '07:00'), 'HH24:MI'),
    'must_keep_quiet_hours', is_young);
end;
$$;
comment on function public.message_email_choices(public.profiles) is
  'Internal: one person''s message email choices with the age-group defaults (IDEAS-2 idea 6).';
revoke execute on function public.message_email_choices(public.profiles) from public, anon, authenticated;

/**
 * quiet_hours_end_after: when quiet hours that hold a moment end.
 * Inputs: the moment (Romanian local time), the start and the end of the hours (they may cross
 *   midnight). Returns: the local time they end, or null when the moment is outside them.
 * Internal: message_email_send_time().
 */
create or replace function public.quiet_hours_end_after(local_moment timestamp, starts time, ends time)
returns timestamp
language plpgsql
immutable
set search_path = ''
as $$
declare
  moment_time time := local_moment::time;
  moment_day date := local_moment::date;
begin
  -- Step 1: hours inside one day (say 13:00 to 15:00).
  if starts < ends then
    if moment_time >= starts and moment_time < ends then
      return moment_day + ends;
    end if;
    return null;
  end if;
  -- Step 2: hours across midnight (say 22:00 to 07:00): the evening part ends tomorrow.
  if moment_time >= starts then
    return (moment_day + 1) + ends;
  end if;
  if moment_time < ends then
    return moment_day + ends;
  end if;
  return null;
end;
$$;
comment on function public.quiet_hours_end_after(timestamp, time, time) is
  'Internal: when quiet hours that hold a local moment end, or null outside them (IDEAS-2 idea 6).';
revoke execute on function public.quiet_hours_end_after(timestamp, time, time) from public, anon, authenticated;

/**
 * message_email_send_time: when a message email to a person may leave, if it is queued at a moment.
 * Inputs: the recipient's ID and the moment. Returns: the moment plus 5 minutes, moved to the end
 *   of the person's quiet hours when it falls inside them (Romanian time).
 * Internal: the messages trigger.
 */
create or replace function public.message_email_send_time(person_id uuid, queued_at timestamptz)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  choices jsonb;
  earliest timestamptz := queued_at + interval '5 minutes';
  quiet_end timestamp;
begin
  -- Step 1: the person's choices; without quiet hours the email goes after the short wait.
  select public.message_email_choices(profiles) into choices
  from public.profiles where profiles.id = person_id;
  if choices is null or not (choices ->> 'quiet_hours_on')::boolean then
    return earliest;
  end if;
  -- Step 2: inside quiet hours, the email waits for their end (Romanian time).
  quiet_end := public.quiet_hours_end_after(earliest at time zone 'Europe/Bucharest',
    (choices ->> 'quiet_from')::time, (choices ->> 'quiet_until')::time);
  if quiet_end is null then
    return earliest;
  end if;
  return quiet_end at time zone 'Europe/Bucharest';
end;
$$;
comment on function public.message_email_send_time(uuid, timestamptz) is
  'Internal: when a message email may leave: 5 minutes on, after quiet hours (IDEAS-2 idea 6).';
revoke execute on function public.message_email_send_time(uuid, timestamptz) from public, anon, authenticated;

/* ---------- Queueing ---------- */

/**
 * queue_message_email: after a new message, queues one email to the other person in the chat,
 *   unless they turned message emails off, deleted the request, or one is already waiting for
 *   this chat (one email per chat until it leaves, however many messages arrive).
 * Trigger: after insert on messages.
 */
create or replace function public.queue_message_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chat public.conversations;
  recipient public.profiles;
begin
  -- Step 1: the chat and the other person in it.
  select * into chat from public.conversations where conversations.id = new.conversation_id;
  select profiles.* into recipient from public.profiles
  where profiles.id = case when chat.user_id = new.user_id then chat.recipient_user_id else chat.user_id end
    and profiles.deleted_at is null;
  if chat.id is null or recipient.id is null or chat.status = 'declined' then
    return new;
  end if;
  -- Step 2: their choice, and one email per chat at a time.
  if not (public.message_email_choices(recipient) ->> 'emails_on')::boolean then
    return new;
  end if;
  if exists (select 1 from public.email_outbox
             where email_outbox.user_id = recipient.id and email_outbox.conversation_id = chat.id
               and email_outbox.sent_at is null) then
    return new;
  end if;
  -- Step 3: the email, held until the short wait and any quiet hours are over.
  insert into public.email_outbox (user_id, delivery, notification_ids, conversation_id, send_after)
  values (recipient.id, 'message', '{}', chat.id, public.message_email_send_time(recipient.id, now()));
  return new;
end;
$$;
comment on function public.queue_message_email() is
  'Internal trigger: queues one email per chat for a new private message (IDEAS-2 idea 6).';
revoke execute on function public.queue_message_email() from public, anon, authenticated;
create trigger messages_queue_message_email
  after insert on public.messages
  for each row execute function public.queue_message_email();

/* ---------- Sending ---------- */

/**
 * message_email_items: what a due message email tells, as the one item the worker writes:
 *   {kind 'new_message', actors [{handle, display_name}], actor_count (unread messages), story,
 *   chapter, comment_excerpt (all null), is_request}. Empty when there is nothing left to tell:
 *   the chat is read, deleted or declined, a block stands, or message emails were turned off.
 * Input: the outbox row. Internal: email_worker_claim().
 */
create or replace function public.message_email_items(queued public.email_outbox)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  chat public.conversations;
  sender public.profiles;
  recipient public.profiles;
  read_up_to timestamptz;
  unread_count integer;
begin
  -- Step 1: the chat, the person who wrote and the person it goes to.
  select * into chat from public.conversations where conversations.id = queued.conversation_id;
  select * into recipient from public.profiles where profiles.id = queued.user_id;
  select * into sender from public.profiles
  where profiles.id = case when chat.user_id = queued.user_id then chat.recipient_user_id else chat.user_id end
    and profiles.deleted_at is null;
  if chat.id is null or sender.id is null or chat.status = 'declined'
     or not (public.message_email_choices(recipient) ->> 'emails_on')::boolean then
    return '[]'::jsonb;
  end if;
  -- Step 2: a block either way ends it (S1-E5-05).
  if exists (select 1 from public.blocks
             where (blocks.user_id = sender.id and blocks.blocked_user_id = recipient.id)
                or (blocks.user_id = recipient.id and blocks.blocked_user_id = sender.id)) then
    return '[]'::jsonb;
  end if;
  -- Step 3: the messages from that person the recipient hasn't read yet (since their last read
  -- and since they last cleared the chat).
  select greatest(conversation_members.last_read_at, public.chat_cleared_at(chat.id, recipient.id))
  into read_up_to from public.conversation_members
  where conversation_members.conversation_id = chat.id and conversation_members.user_id = recipient.id;
  select count(*)::integer into unread_count from public.messages
  where messages.conversation_id = chat.id and messages.user_id = sender.id
    and messages.deleted_at is null
    and messages.created_at > coalesce(read_up_to, '-infinity'::timestamptz);
  if unread_count = 0 then
    return '[]'::jsonb;
  end if;
  -- Step 4: one line: who wrote, never what.
  return jsonb_build_array(jsonb_build_object(
    'kind', 'new_message',
    'actors', jsonb_build_array(jsonb_build_object(
      'handle', sender.handle,
      'display_name', public.display_name(sender.handle, sender.pen_name))),
    'actor_count', unread_count,
    'story', null, 'chapter', null, 'comment_excerpt', null,
    'is_request', chat.status = 'request'));
end;
$$;
comment on function public.message_email_items(public.email_outbox) is
  'Internal: the one line a due message email tells, or nothing when it no longer applies (IDEAS-2 idea 6).';
revoke execute on function public.message_email_items(public.email_outbox) from public, anon, authenticated;

/**
 * email_worker_claim: as in S1-E7-02, plus message emails (IDEAS-2 idea 6): an email waits until
 *   its send_after, and a message email's line comes from message_email_items().
 * Inputs: worker_key (the Vault secret email_worker_key); batch_size (1 to 100, default 50).
 * Returns: JSON array of {outbox_id, to, language, delivery, items, unsubscribe_key}.
 * Errors: insufficient_privilege for a wrong or missing key.
 * Where it fits: server/notification-emails.ts, step 1.
 */
create or replace function public.email_worker_claim(worker_key text, batch_size integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  queued public.email_outbox;
  recipient record;
  items jsonb;
  claimed jsonb := '[]'::jsonb;
  saved_claims text := current_setting('request.jwt.claims', true);
begin
  -- Step 1: only our worker may ask.
  if not public.email_worker_key_matches(worker_key) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the oldest due emails nobody else is sending; a held one waits for its time.
  for queued in
    select * from public.email_outbox
    where email_outbox.sent_at is null and email_outbox.attempts < 5
      and (email_outbox.send_after is null or email_outbox.send_after <= now())
      and (email_outbox.claimed_at is null or email_outbox.claimed_at < now() - interval '15 minutes')
    order by coalesce(email_outbox.send_after, email_outbox.created_at)
    limit least(greatest(coalesce(batch_size, 50), 1), 100)
    for update skip locked
  loop
    select users.email, profiles.locale into recipient
    from public.profiles join auth.users on users.id = profiles.id
    where profiles.id = queued.user_id and profiles.deleted_at is null
      and users.email_confirmed_at is not null;
    -- The recipient's own view: blocks, ratings and moderation as on their Notifications page.
    perform public.email_worker_act_as(queued.user_id);
    if queued.delivery = 'message' then
      items := public.message_email_items(queued);
    else
      items := public.email_worker_items(queued);
    end if;
    -- Step 3: nothing to tell, or nobody to tell it to: close it without sending.
    if recipient.email is null or jsonb_array_length(items) = 0 then
      update public.email_outbox set sent_at = now() where email_outbox.id = queued.id;
      continue;
    end if;
    update public.email_outbox set claimed_at = now(), attempts = queued.attempts + 1
    where email_outbox.id = queued.id;
    claimed := claimed || jsonb_build_object(
      'outbox_id', queued.id, 'to', recipient.email, 'language', coalesce(recipient.locale, 'ro'),
      'delivery', queued.delivery, 'items', items,
      'unsubscribe_key', case when queued.delivery = 'required' then null
                              else public.email_worker_unsubscribe_key(queued.user_id) end);
  end loop;
  perform public.email_worker_act_as(null, saved_claims);
  return claimed;
end;
$$;
comment on function public.email_worker_claim(text, integer) is
  'The email worker''s due emails, claimed for 15 minutes; needs the Vault key (S1-E7-02, IDEAS-2 idea 6).';
revoke execute on function public.email_worker_claim(text, integer) from public;
grant execute on function public.email_worker_claim(text, integer) to anon, authenticated;

/**
 * run_email_worker: as in S1-E7-02; an email held for quiet hours doesn't wake the worker.
 * Returns: true when it called the worker. Internal: pg_cron, every 5 minutes.
 */
create or replace function public.run_email_worker()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  worker_url text;
  worker_key text;
begin
  select decrypted_secret into worker_url from vault.decrypted_secrets where name = 'email_worker_url';
  select decrypted_secret into worker_key from vault.decrypted_secrets where name = 'email_worker_key';
  if coalesce(worker_url, '') = '' or coalesce(worker_key, '') = ''
     or not exists (select 1 from public.email_outbox
                    where email_outbox.sent_at is null
                      and (email_outbox.send_after is null or email_outbox.send_after <= now())) then
    return false;
  end if;
  perform net.http_post(
    url := worker_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || worker_key, 'Content-Type', 'application/json'),
    body := '{}'::jsonb);
  return true;
end;
$$;
comment on function public.run_email_worker() is
  'Internal: calls the email worker through pg_net when emails are due (S1-E7-02); pg_cron every 5 minutes.';
revoke execute on function public.run_email_worker() from public, anon, authenticated;

/* ---------- Settings ---------- */

/**
 * my_message_settings: as in S1-E9-01, plus the email choices (IDEAS-2 idea 6).
 * Returns: JSON {audience, age_group, adults_may_message, email: {emails_on, quiet_hours_on,
 *   quiet_from, quiet_until, must_keep_quiet_hours}}.
 * Errors: insufficient_privilege when signed out. Where it fits: Settings > Messages.
 */
create or replace function public.my_message_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'audience', public.message_audience_of(profiles),
    'age_group', public.message_age_group(profiles),
    'adults_may_message', profiles.adults_may_message,
    'email', public.message_email_choices(profiles))
  from public.profiles where profiles.id = public.require_messaging_caller();
$$;
comment on function public.my_message_settings() is
  'The caller''s own message settings, age group and message email choices (S1-E9-01, IDEAS-2 idea 6).';
revoke execute on function public.my_message_settings() from public, anon;
grant execute on function public.my_message_settings() to authenticated;

/**
 * set_message_emails: saves the signed-in person's message email choices.
 * Inputs: wanted_emails_on; wanted_quiet_hours_on; wanted_from and wanted_until (Romanian time).
 * Returns: the choices as my_message_settings() shows them.
 * Errors: insufficient_privilege when signed out; check_violation with hint 'same_times' when the
 *   hours start and end at the same time, or 'quiet_hours_needed' when someone under 18 turns quiet
 *   hours off or makes them shorter than 22:00 to 07:00 (Q50).
 * Where it fits: Settings > Messages, "Save".
 */
create or replace function public.set_message_emails(
  wanted_emails_on boolean,
  wanted_quiet_hours_on boolean,
  wanted_from time,
  wanted_until time
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_messaging_caller();
  saved public.profiles;
begin
  -- Step 1: the hours must be a real span.
  if wanted_from is null or wanted_until is null or wanted_from = wanted_until then
    raise exception 'Quiet hours need a start and a different end.' using errcode = 'check_violation', hint = 'same_times';
  end if;
  -- Step 2: under-18s keep quiet hours that cover at least 22:00 to 07:00 (Q50): an evening
  -- start no later than 22:00 and a morning end no earlier than 07:00.
  if public.is_under_18_or_unknown(caller_id) and not (
       coalesce(wanted_quiet_hours_on, false)
       and wanted_from between time '12:00' and time '22:00'
       and wanted_until between time '07:00' and time '12:00') then
    raise exception 'Quiet hours stay on and cover 22:00 to 07:00 for members under 18.'
      using errcode = 'check_violation', hint = 'quiet_hours_needed';
  end if;
  -- Step 3: save; emails already waiting keep their time, new ones follow the new hours.
  update public.profiles
    set message_emails_on = coalesce(wanted_emails_on, true),
        message_quiet_hours_on = coalesce(wanted_quiet_hours_on, false),
        message_quiet_from = wanted_from,
        message_quiet_until = wanted_until
    where profiles.id = caller_id
    returning * into saved;
  -- Step 4: turning emails off stops the ones still waiting.
  if not coalesce(wanted_emails_on, true) then
    update public.email_outbox set sent_at = now()
    where email_outbox.user_id = caller_id and email_outbox.delivery = 'message' and email_outbox.sent_at is null;
  end if;
  return public.message_email_choices(saved);
end;
$$;
comment on function public.set_message_emails(boolean, boolean, time, time) is
  'Saves the signed-in person''s message email choices; under-18s keep quiet hours (IDEAS-2 idea 6; Q50).';
revoke execute on function public.set_message_emails(boolean, boolean, time, time) from public, anon;
grant execute on function public.set_message_emails(boolean, boolean, time, time) to authenticated;

/**
 * unsubscribe_from_emails: as in S1-E7-02, and message emails go off too (IDEAS-2 idea 6).
 * Input: the key from the link. Returns: true when the key was found.
 * Who may call it: anyone, signed out included; the key is 48 random characters.
 */
create or replace function public.unsubscribe_from_emails(unsubscribe_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
begin
  -- Step 1: whose key it is.
  select keys.user_id into owner_id from public.email_unsubscribe_keys as keys
  where keys.unsubscribe_key = lower(btrim(coalesce(unsubscribe_from_emails.unsubscribe_key, '')));
  if owner_id is null then
    return false;
  end if;
  -- Step 2: every optional notification email off, and message emails off.
  insert into public.notification_email_settings (user_id, kind, delivery)
  select owner_id, listed.kind, 'off'
  from unnest(array['comment_reply', 'new_chapter', 'comment_on_chapter', 'new_follower']::public.notification_kind[])
    as listed (kind)
  on conflict on constraint notification_email_settings_one_per_kind do update set delivery = 'off';
  update public.profiles set message_emails_on = false where profiles.id = owner_id;
  -- Step 3: emails already waiting stop too, except the required ones.
  update public.email_outbox set sent_at = now()
  where email_outbox.user_id = owner_id and email_outbox.sent_at is null and email_outbox.delivery <> 'required';
  return true;
end;
$$;
comment on function public.unsubscribe_from_emails(text) is
  'One-click unsubscribe: every optional notification email and message emails off (S1-E7-02, IDEAS-2 idea 6).';
grant execute on function public.unsubscribe_from_emails(text) to anon, authenticated;
