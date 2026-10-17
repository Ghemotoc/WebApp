-- Database tests for "accept before posting again" (story S1-E14-01).
-- What it proves: when a new important version of the terms goes live, a signed-in person who
-- hasn't accepted it can't write (account_state() answers legal_acceptance_required) but can
-- still read; a small (non-material) change asks nothing; accepting lets them write again; and
-- the notice's list shows only the caller's own documents.
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

-- Before any change: adult_writer accepted version 0.1 (seed), so nothing is waiting.
select is(
  public.account_state('00000000-0000-4000-8000-000000000001')::text,
  'active',
  'adult_writer is active with version 0.1 accepted'
);

-- A small change goes live: it doesn't ask anyone to accept again.
insert into public.legal_document_versions (
  document_id, version_label, language, title, body_markdown, is_material, published_at
)
select id, '0.1.1', 'en', 'Terms of use', '## In short', false, now() - interval '1 minute'
from public.legal_documents where slug = 'terms';

select is(
  public.account_state('00000000-0000-4000-8000-000000000001')::text,
  'active',
  'a small (non-material) change does not stop anyone posting'
);

-- An important change goes live.
insert into public.legal_document_versions (
  document_id, version_label, language, title, body_markdown, is_material, published_at, change_summary
)
select id, '0.2', 'en', 'Terms of use', '## In short', true, now() - interval '30 seconds',
  'Clearer moderation rules'
from public.legal_documents where slug = 'terms';

select is(
  public.account_state('00000000-0000-4000-8000-000000000001')::text,
  'legal_acceptance_required',
  'after an important change, adult_writer must accept before posting again'
);

-- Signed in as adult_writer.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';

select ok(
  not public.is_active_member(),
  'is_active_member() is false, so every write policy refuses until the new terms are accepted'
);

select results_eq(
  $$ select document_slug, version_label, change_summary from public.my_legal_documents_to_accept() $$,
  $$ values ('terms', '0.2', 'Clearer moderation rules') $$,
  'the notice lists the new terms, with what changed'
);

select ok(
  (select count(*) from public.legal_document_versions where version_label = '0.2') = 1,
  'reading never stops: adult_writer still reads the new version while it waits'
);

select is(
  public.accept_current_legal_versions(array['terms'], 'en'),
  1,
  'adult_writer accepts the new terms'
);

select ok(
  public.is_active_member(),
  'after accepting, adult_writer can post again'
);

-- teen_17 hasn't accepted 0.2 either, but adult_writer's list never shows anyone else's.
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select results_eq(
  $$ select document_slug from public.my_legal_documents_to_accept() $$,
  $$ values ('terms') $$,
  'each person sees only their own waiting documents'
);

select * from finish();

rollback;
