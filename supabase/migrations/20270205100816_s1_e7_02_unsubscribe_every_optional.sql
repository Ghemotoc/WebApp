/*
 * S1-E7-02 fix: one-click unsubscribe turns every optional notification email off.
 *
 * Why: the IDEAS-2 version of unsubscribe_from_emails() listed four kinds by hand
 * (comment_reply, new_chapter, comment_on_chapter, new_follower). A member who had
 * switched "reactions on my comments" (comment_reactions) on still got those emails
 * after pressing Unsubscribe, and story_completed had no row of its own. The link
 * promises "no more emails" (S1-E7-02), so the list now comes from the one place
 * that knows which kinds are optional: default_email_delivery(kind) is not null.
 * A kind added later is covered without touching this function again.
 *
 * Who calls it: the /unsubscribe page and the List-Unsubscribe header, signed out
 * included. What it calls next: nothing; the email sender reads the settings rows.
 */

/**
 * unsubscribe_from_emails: one-click unsubscribe (S1-E7-02, IDEAS-2 idea 6).
 * Input: the key from the link. Returns: true when the key was found, false otherwise.
 * Errors: none raised; an unknown key just returns false.
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
  -- Step 2: every optional notification email off. A kind is optional when it has a
  -- default delivery; required kinds (and in-app-only kinds) have none and are left alone.
  insert into public.notification_email_settings (user_id, kind, delivery)
  select owner_id, every_kind.kind, 'off'
  from unnest(enum_range(null::public.notification_kind)) as every_kind (kind)
  where public.default_email_delivery(every_kind.kind) is not null
  on conflict on constraint notification_email_settings_one_per_kind do update set delivery = 'off';
  -- Step 3: message emails off too (IDEAS-2 idea 6).
  update public.profiles set message_emails_on = false where profiles.id = owner_id;
  -- Step 4: emails already waiting stop too, except the required ones.
  update public.email_outbox set sent_at = now()
  where email_outbox.user_id = owner_id and email_outbox.sent_at is null and email_outbox.delivery <> 'required';
  return true;
end;
$$;
comment on function public.unsubscribe_from_emails(text) is
  'One-click unsubscribe: every optional notification email (each kind with a default delivery) and message emails off (S1-E7-02, IDEAS-2 idea 6).';
grant execute on function public.unsubscribe_from_emails(text) to anon, authenticated;
