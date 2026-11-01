/*
 * Migration: block and report inside messages (story S1-E9-02;
 * docs/stories/s1-e09-private-messages.md; bundle MESSAGES, part c; board Messages 5.5).
 *
 * How it works, from the top:
 * - blocking from a chat uses the same set_block() as the profile (S1-E5-05, S1-E6-05): it ends
 *   the follows both ways, and S1-E9-01's send_message() and conversation_with() already refuse a
 *   blocked pair both ways, so neither can message or follow the other (criterion 1). The blocked
 *   person isn't told: nothing is sent to them. There are no @mentions yet; when they arrive they
 *   must ask is_blocked_with() too;
 * - a reported message carries its context (criterion 2): message_with_context() gives the
 *   message and up to the 20 messages before it in the same chat, oldest first, with who wrote
 *   each one. The case page reads it through admin_case_message(), and the safeguarding evidence
 *   pack through case_item_content();
 * - the context is read from the chat when staff open the case, not copied at report time:
 *   messages can't be edited, and part d (S1-E9-04) keeps a reported message and its context
 *   until the retention period ends, even when both people delete the chat;
 * - staff read private messages only through a case about one (architecture 1.8.3, "private
 *   messages are hidden unless they are part of a report"), and each read is logged as a
 *   sensitive read.
 * Screens: the chat header's Block and Report (src/features/messages/components/ChatHeader.tsx),
 * the report dialog's note for a message and CaseMessagePanel on the case page.
 * Personal data: nothing new is stored; staff can now read up to 21 messages of a reported chat.
 * Tests: supabase/tests/database/207-messages-block-and-report.test.sql.
 */

/* ---------- The context of a reported message ---------- */

/**
 * message_with_context: a message and up to the 20 messages before it in the same chat, oldest
 * first (S1-E9-02 criterion 2; board 5.5, "We'll send this message and up to 20 messages before
 * it"). Staff see every one, including any the moderation team hid or removed, because they need
 * the whole exchange to decide.
 * Input: the reported message's ID. Returns: a JSON list of {id, from_handle, text, sent_at,
 *   is_reported}, or an empty list when the message is gone.
 * Internal: called by admin_case_message() and case_item_content(), never by a screen.
 */
create or replace function public.message_with_context(reported_message_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with reported as (
    select messages.id, messages.conversation_id, messages.created_at
    from public.messages where messages.id = reported_message_id
  ),
  -- The reported message and the 20 sent just before it, newest first so the limit keeps them.
  window_of_messages as (
    select messages.id, messages.user_id, messages.body, messages.created_at
    from public.messages
    join reported on reported.conversation_id = messages.conversation_id
    where (messages.created_at, messages.id) <= (reported.created_at, reported.id)
    order by messages.created_at desc, messages.id desc
    limit 21
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', window_of_messages.id,
      'from_handle', profiles.handle,
      'text', window_of_messages.body,
      'sent_at', window_of_messages.created_at,
      'is_reported', window_of_messages.id = reported_message_id)
    order by window_of_messages.created_at, window_of_messages.id), '[]'::jsonb)
  from window_of_messages
  join public.profiles on profiles.id = window_of_messages.user_id;
$$;

comment on function public.message_with_context(uuid) is
  'A reported message and up to 20 before it in the same chat, oldest first (S1-E9-02); internal.';
revoke execute on function public.message_with_context(uuid) from public, anon, authenticated;

/* ---------- The case page ---------- */

/**
 * admin_case_message: the reported message of a message case with its context, for the case page
 * (S1-E9-02 criterion 2).
 * Input: target_case_id. Returns: {between: [the two handles], messages: [as in
 *   message_with_context()]} or null when the case isn't about a message.
 * Errors: insufficient_privilege unless the caller may see the case (moderation staff; the
 *   safeguarding permission for a safeguarding case).
 * Logging: every read is a sensitive read (sensitive_read.case_message), with the reported
 *   message's writer as the affected account (architecture 1.8.3).
 */
create or replace function public.admin_case_message(target_case_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases;
  chat public.conversations;
begin
  -- Step 1: staff who may see this case, in the same order as the other case panels.
  select * into target from public.cases where id = target_case_id;
  if target.id is null or not public.staff_may('moderation', 'view') or not public.may_see_case(target.is_safeguarding) then
    raise exception 'You can''t see this case.' using errcode = 'insufficient_privilege';
  end if;
  if target.item_type <> 'message' then
    return null;
  end if;
  -- Step 2: the chat the message belongs to; nothing when it has gone since the report.
  select conversations.* into chat
  from public.conversations
  join public.messages on messages.conversation_id = conversations.id
  where messages.id = target.item_id;
  if chat.id is null then
    return jsonb_build_object('between', '[]'::jsonb, 'messages', '[]'::jsonb);
  end if;
  -- Step 3: reading private messages is a sensitive read, logged before anything is returned.
  perform public.log_staff_action('sensitive_read.case_message', 'messages', target.item_id::text, target.user_id);
  -- Step 4: the two people and the messages.
  return jsonb_build_object(
    'between', (select jsonb_agg(profiles.handle order by profiles.handle)
      from public.profiles where profiles.id in (chat.user_id, chat.recipient_user_id)),
    'messages', public.message_with_context(target.item_id));
end;
$$;

comment on function public.admin_case_message(uuid) is
  'A message case''s reported message and up to 20 before it, for the case page; a logged sensitive read (S1-E9-02).';
revoke execute on function public.admin_case_message(uuid) from public, anon;
grant execute on function public.admin_case_message(uuid) to authenticated;

/* ---------- The evidence pack ---------- */

/**
 * case_item_content: as in S1-E9-01, and a reported message also carries its context, so the
 * safeguarding evidence pack (S1-E10-10) holds the same messages the case page shows (S1-E9-02).
 */
create or replace function public.case_item_content(target public.cases)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case target.item_type
    when 'story' then (select jsonb_build_object('title', stories.title, 'blurb', stories.blurb,
        'created_at', stories.created_at) from public.stories where stories.id = target.item_id)
    when 'chapter' then (select jsonb_build_object('title', chapters.published_title, 'text', chapters.published_body,
        'first_published_at', chapters.first_published_at) from public.chapters where chapters.id = target.item_id)
    when 'comment' then (select jsonb_build_object('text', comments.body, 'created_at', comments.created_at)
        from public.comments where comments.id = target.item_id)
    when 'profile' then (select jsonb_build_object('handle', profiles.handle, 'pen_name', profiles.pen_name,
        'bio', profiles.bio) from public.profiles where profiles.id = target.item_id)
    when 'picture' then (select jsonb_build_object('kind', picture_checks.kind, 'bucket', picture_checks.bucket,
        'path', picture_checks.path, 'flags', picture_checks.flags, 'uploaded_at', picture_checks.created_at,
        'checked_at', picture_checks.checked_at) from public.picture_checks where picture_checks.id = target.item_id)
    when 'embed' then (select jsonb_build_object('service', chapter_embeds.service,
        'source_url', chapter_embeds.source_url, 'title', chapter_embeds.title,
        'author_name', chapter_embeds.author_name, 'added_at', chapter_embeds.created_at)
        from public.chapter_embeds where chapter_embeds.id = target.item_id)
    when 'atlas_item' then public.plan_item_content(target.item_id)
    -- The reported message's words, plus it and up to 20 before it as context (S1-E9-02).
    when 'message' then (select jsonb_build_object('text', messages.body, 'sent_at', messages.created_at,
        'context', public.message_with_context(messages.id))
        from public.messages where messages.id = target.item_id)
  end;
$$;
