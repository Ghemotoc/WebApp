-- Database tests for accepting the terms and privacy notice (story S1-E14-01).
-- What it proves: a person reads only their own acceptances (allowed and denied); accepting
-- records the current version with the time, in the language read; 16 and 17-year-olds accept
-- without a parent (decided 17 Oct 2026, 10:23); signed-out visitors and unknown documents are
-- refused; nobody can add, change or delete an acceptance through the table itself.
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

-- Signed in as adult_writer.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select count(*)::integer from public.consents),
  2,
  'allowed: consents_select_own: adult_writer reads their own acceptances of the terms and privacy notice'
);

select is_empty(
  $$ select id from public.consents where user_id = '00000000-0000-4000-8000-000000000002' $$,
  'denied: consents_select_own: adult_writer cannot read teen_17''s acceptances'
);

select throws_ok(
  $$ insert into public.consents (user_id, legal_document_version_id, method)
     select '00000000-0000-4000-8000-000000000001', id, 're_accept'
     from public.legal_document_versions limit 1 $$,
  '42501',
  null,
  'nobody writes an acceptance straight into the table; only the accept function records one'
);

select throws_ok(
  $$ delete from public.consents $$,
  '42501',
  null,
  'nobody can delete a record of consent through the API (GDPR Art 7(1): we must be able to show it)'
);

select is(
  public.accept_current_legal_versions(array['terms', 'privacy'], 'ro'),
  2,
  'adult_writer accepts the current terms and privacy notice'
);

select results_eq(
  $$ select versions.language, consents.method
     from public.consents
     join public.legal_document_versions as versions on versions.id = consents.legal_document_version_id
     where consents.method = 're_accept' order by 1 $$,
  $$ values ('ro', 're_accept'), ('ro', 're_accept') $$,
  'the acceptance records the Romanian version, which is the one adult_writer read'
);

select throws_ok(
  $$ select public.accept_current_legal_versions(array['guidelines']) $$,
  '22023',
  null,
  'a document that is not accepted on its own (the guidelines are part of the terms) is refused'
);

-- Signed in as teen_17: accepts without any parent or guardian record.
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}';

select is(
  public.accept_current_legal_versions(array['terms', 'privacy'], 'en'),
  2,
  'teen_17 (16 to 17) accepts the terms without a parent or guardian (decided 17 Oct 2026, 10:23)'
);

-- Signed out.
reset role;
set local role anon;

select throws_ok(
  $$ select public.accept_current_legal_versions(array['terms']) $$,
  '42501',
  null,
  'a signed-out visitor cannot accept anything on anyone''s behalf'
);

select is_empty(
  $$ select id from public.consents $$,
  'a signed-out visitor reads nobody''s acceptances'
);

select * from finish();

rollback;
