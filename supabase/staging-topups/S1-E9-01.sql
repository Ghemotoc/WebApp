-- Staging top-up for S1-E9-01 (private messages): the one seeded chat between the teacher and
-- adult_writer personas, as supabase/seed.sql adds it locally. Safe to run twice: every insert
-- skips rows that are already there. Adds no accounts.
insert into public.conversations (id, user_id, recipient_user_id, status, accepted_at, last_message_at)
values ('00000000-0000-4000-a000-000000000901', '00000000-0000-4000-8000-000000000007',
        '00000000-0000-4000-8000-000000000001', 'accepted', now() - interval '2 hours', now() - interval '1 hour')
on conflict do nothing;
insert into public.conversation_members (conversation_id, user_id, last_read_at)
values ('00000000-0000-4000-a000-000000000901', '00000000-0000-4000-8000-000000000007', now() - interval '1 hour'),
       ('00000000-0000-4000-a000-000000000901', '00000000-0000-4000-8000-000000000001', now() - interval '1 hour')
on conflict do nothing;
insert into public.messages (conversation_id, user_id, body, created_at)
select '00000000-0000-4000-a000-000000000901', seeded.user_id::uuid, seeded.body, now() - seeded.age
from (values
  ('00000000-0000-4000-8000-000000000007', 'Hi! My class is reading your story this week. Would you answer a few questions from them?', interval '2 hours'),
  ('00000000-0000-4000-8000-000000000001', 'Of course. Send them over whenever you like.', interval '90 minutes'),
  ('00000000-0000-4000-8000-000000000007', 'Thank you! I’ll collect them on Friday.', interval '1 hour')
) as seeded (user_id, body, age)
where not exists (select 1 from public.messages
                  where messages.conversation_id = '00000000-0000-4000-a000-000000000901' and messages.body = seeded.body);
