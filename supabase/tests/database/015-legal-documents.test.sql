-- Database tests for the Legal centre's documents and versions (story S1-E14-01).
-- What it proves: anyone, signed out included, reads the documents and the versions that have
-- gone live (allowed and denied, CLAUDE.md rule 1); a version prepared for a later date stays
-- hidden from everyone but owner and admin; nobody writes to these tables through the API; and
-- version 0.1 exists in English and Romanian for each document, with the brand stored as tokens.
-- How a persona is "signed in": the authenticated role plus the JWT claims (supabase/README.md).
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

-- A version prepared for next year, so the "not live yet" rules have something to hide.
insert into public.legal_document_versions (
  document_id, version_label, language, title, body_markdown, is_material, published_at
)
select id, '9.9', 'en', 'Future terms', '## In short', true, now() + interval '1 year'
from public.legal_documents where slug = 'terms';

-- Version 0.1 of each document, in both languages (decided 17 Oct 2026, 19:43, Q1).
select results_eq(
  $$ select documents.slug, array_agg(versions.language order by versions.language)
     from public.legal_document_versions as versions
     join public.legal_documents as documents on documents.id = versions.document_id
     where versions.version_label = '0.1'
     group by documents.slug order by documents.slug $$,
  $$ values ('accessibility', array['en', 'ro']), ('contact', array['en', 'ro']), ('guidelines', array['en', 'ro']),
            ('privacy', array['en', 'ro']), ('terms', array['en', 'ro']) $$,
  'version 0.1 of the terms, privacy notice, guidelines, contact page (S1-E14-02) and accessibility statement (S1-E14-03) exists in English and Romanian'
);

select is_empty(
  $$ select id from public.legal_document_versions
     where version_label = '0.1' and body_markdown not like '%{{productName}}%' $$,
  'the product name is stored as the {{productName}} token, filled in from the brand config; the
   brand-value check (scripts/legal/prepare-legal-text.test.ts) proves no brand value is stored'
);

select is_empty(
  $$ select id from public.legal_document_versions
     where body_markdown like '%Drafting notes for the lawyer%' or body_markdown like '%## Open points%' $$,
  'the lawyer-only sections are not stored (decided 17 Oct 2026, 19:43, Q2)'
);

-- Signed out.
set local role anon;

select is(
  (select count(*)::integer from public.legal_documents),
  5,
  'allowed: legal_documents_select_public: a signed-out visitor reads the list of documents'
);

select is(
  (select count(*)::integer from public.legal_document_versions where version_label = '0.1'),
  10,
  'allowed: legal_document_versions_select_published: a signed-out visitor reads every live version'
);

select is_empty(
  $$ select id from public.legal_document_versions where version_label = '9.9' $$,
  'denied: legal_document_versions_select_published: a version not live yet is hidden from visitors'
);

select throws_ok(
  $$ insert into public.legal_documents (slug, sort_order) values ('fake', 9) $$,
  '42501',
  null,
  'denied: legal_documents_select_public: a signed-out visitor cannot add a document'
);

-- Signed in as adult_writer, a member with no staff role.
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';

select is_empty(
  $$ select id from public.legal_document_versions where version_label = '9.9' $$,
  'denied: legal_document_versions_select_admin: a member cannot read a version before it is live'
);

select throws_ok(
  $$ update public.legal_document_versions set title = 'Changed' where version_label = '0.1' $$,
  '42501',
  null,
  'nobody can edit a published legal version through the API, so the history stays true'
);

-- Signed in as admin.
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000009", "role": "authenticated"}';

select is(
  (select count(*)::integer from public.legal_document_versions where version_label = '9.9'),
  1,
  'allowed: legal_document_versions_select_admin: an admin reads a version before it goes live'
);

-- Signed in as owner.
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000008", "role": "authenticated"}';

select is(
  (select count(*)::integer from public.legal_document_versions where version_label = '9.9'),
  1,
  'the owner reads a version before it goes live too'
);

-- Signed in as a moderator: not one of the roles that prepares legal texts.
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000010", "role": "authenticated"}';

select is_empty(
  $$ select id from public.legal_document_versions where version_label = '9.9' $$,
  'a moderator cannot read a legal version before it is live (architecture 1.8.3)'
);

select * from finish();

rollback;
