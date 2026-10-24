/**
 * Makes and removes throwaway accounts for end-to-end tests that change a password or log devices
 * out (story S1-E2-05), so the seed personas stay as the seed made them.
 *
 * Who calls it: e2e/sign-in.spec.ts. What it calls: the local database through runSql(). The
 * account is made the way supabase/seed.sql makes personas: a confirmed email, a password, the
 * email identity, a profile with a username, and the current terms accepted.
 * Test data: synthetic @example.com addresses only (CLAUDE.md, Safety while building).
 */
import { runSql } from './database';

/**
 * Makes an adult account that can log in straight away.
 *
 * @param email - a synthetic @example.com address
 * @param password - its password
 * @param handle - its username
 */
export function createTestAccount(email: string, password: string, handle: string) {
  runSql(`
    do $$
    declare new_id uuid := gen_random_uuid();
    begin
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change)
      values ('00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated', '${email}',
        extensions.crypt('${password}', extensions.gen_salt('bf')), now(),
        '{"provider": "email", "providers": ["email"], "seed_persona": true}', '{"locale": "en"}', now(), now(),
        '', '', '', '');
      insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
      values (new_id::text, new_id, jsonb_build_object('sub', new_id::text, 'email', '${email}', 'email_verified', true),
        'email', now(), now());
      insert into public.profiles (id, birth_year, handle, locale) values (new_id, 1990, '${handle}', 'en');
      insert into public.consents (user_id, legal_document_version_id, method)
      select new_id, versions.id, 'sign_up' from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.needs_acceptance and versions.version_label = '0.1' and versions.language = 'en';
    end $$;`);
}

/**
 * Removes a test account and everything it left: consents, profile, sessions, wrong tries.
 * An account the audit log names (invite.redeemed at sign-up, S1-E11-17) keeps its profile and
 * login, because audit rows can never be deleted; test addresses are unique per run, so a kept
 * account never gets in the way of the next run.
 *
 * @param email - the account's address
 */
export function removeTestAccount(email: string) {
  runSql(`
    delete from public.sign_in_failures where email_hash = public.hash_email('${email}');
    delete from public.consents where user_id in (select id from auth.users where email = '${email}');
    delete from public.profiles where id in (select id from auth.users where email = '${email}')
      and id not in (select user_id from public.audit_log where user_id is not null);
    delete from auth.users where email = '${email}' and id not in (select id from public.profiles);`);
}
