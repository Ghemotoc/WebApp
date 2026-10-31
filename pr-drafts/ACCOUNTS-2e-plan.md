# ACCOUNTS-2e plan: S1-E2-09 sign up and log in with Google, Apple, Microsoft or a passkey

Buttons off until the keys exist: `social_login` (exists, off) and a new `passkey_login` flag (off; on locally in e2e).

## Database (migration `…_s1_e2_09_ways_to_log_in.sql`)
- Refactor: `create_profile_from_sign_up(user_id, sign_up_data)` holds steps 3 to 8 of `handle_new_auth_user()`; the trigger calls it. A provider sign-up (app_meta provider google, apple or azure) keeps the banned-email check but creates no profile yet.
- `finish_social_sign_up(sign_up_data jsonb)`: for the signed-in account with no profile and a provider identity: the same checks (age, market, username, invite, consents), then the profile. Hints from the same refusals.
- `cancel_social_sign_up()`: deletes an unfinished provider account (no profile).
- `purge_unfinished_social_sign_ups()` + pg_cron: unfinished provider accounts older than 24 hours are deleted.
- `identity_link_requests` (user_id, provider, expires_at): `expect_identity_link(provider)` writes one for 10 minutes; owner reads own.
- Trigger before insert on `auth.identities`: a new non-email identity for an account that already has a profile needs a fresh request, otherwise refused (`identity_link_not_requested`), so a provider with a matching email is never merged silently (criterion 5).
- Triggers after insert/delete on `auth.identities` and `auth.webauthn_credentials`: notify kinds `login_method_added` / `login_method_removed` (required emails, account and safety), only for accounts with a profile.
- `my_login_methods()`: providers connected (no emails), passkey count, `has_password`.

## Front end
- `src/features/auth/`: `SocialButtons` (official full-colour logos, SVG files, provider brand rules) on sign-up (below, "or sign up with" divider) and log-in; `signInWithOAuth` with minimum scopes (email, name), `redirectTo /auth/social-return`.
- Sign-up page: the provider line ("Google, Apple and Microsoft don't tell us how old you are."); pressing a provider keeps year, month, username, invite and accepted versions in sessionStorage.
- `/auth/social-return`: error → plain message (existing email: log in the usual way and connect it in Settings); new provider account → "Finish joining" form (year, month, username, invite, terms) prefilled from sessionStorage → `finish_social_sign_up()` → `/setup`; "Cancel" → `cancel_social_sign_up()`.
- Log-in page: "Use a passkey" (`signInWithPasskey`), when `passkey_login` is on.
- Settings › Ways to log in: email and password, Google, Apple, Microsoft, Passkey; Connect (`expect_identity_link` then `linkIdentity`), Disconnect (`unlinkIdentity`), Add a passkey (`registerPasskey`), remove; the last method can't be disconnected; "You have n ways to log in."
- Emails: `notificationEmails.login_method_added/removed` in email.json; in-app texts.

## Config
- `config.toml`: `enable_manual_linking = true`; `[auth.passkey] enabled = true`; `[auth.webauthn]` for localhost; provider blocks stay disabled with `env()` secrets.

## Tests
- pgTAP `203-ways-to-log-in`: provider sign-up makes no profile; finish runs the rules (refusals and success); cancel; purge; link guard (refused without a request, allowed with one, email identity always allowed, fresh sign-up allowed); notifications on add/remove; policy `identity_link_requests_select_own` allowed and denied.
- e2e `ways-to-log-in.spec.ts`: buttons hidden while flags off, shown when on; finish joining for a provider account (made in SQL); Settings › Ways to log in shows methods, blocks the last one; passkey add and log in with a CDP virtual authenticator; axe at every view.

## By hand / GO-LIVE
- Google, Apple and Microsoft developer apps and their secrets in Supabase; redirect URLs; the passkey relying party (rp_id, origins) on hosted projects; flags on.
