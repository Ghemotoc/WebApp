-- Staging top-up for S1-E2-03 (parental consent): the two consent rows seed.sql now adds, for
-- staging, which already holds the personas and can't load seed.sql again (CLAUDE.md, Safety
-- while building). Safe to run twice: each row is added only when the persona has none. Adds no
-- accounts. Paste into the staging SQL editor after the migration has reached staging.
insert into public.parental_consents (user_id, parent_email, language, token_hash, status,
  is_guardian_confirmed, decided_at)
select personas.user_id, personas.parent_email, 'ro',
  encode(extensions.digest(personas.token, 'sha256'), 'hex'), personas.status,
  personas.status = 'agreed', case when personas.status = 'agreed' then now() end
from (values
  ('00000000-0000-4000-8000-000000000003'::uuid, 'parent.kid14ok@example.com', 'seed-kid-14-ok-consent', 'agreed'),
  ('00000000-0000-4000-8000-000000000004'::uuid, 'parent.kid14waiting@example.com', 'seed-kid-14-waiting-consent', 'waiting')
) as personas (user_id, parent_email, token, status)
where exists (select 1 from public.profiles where profiles.id = personas.user_id)
  and not exists (select 1 from public.parental_consents where parental_consents.user_id = personas.user_id);
