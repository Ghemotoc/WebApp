<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E2-09 (sign up and log in with Google, Apple, Microsoft or a passkey). The story issue doesn't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 6 ACCOUNTS-2, part e: S1-E2-09, built and tested with every button hidden. The `social_login` and new `passkey_login` flags stay off until the providers are set up on the hosted projects (GO-LIVE), so nothing changes for anyone today.

## What changed

- **Database:** `20261108100001_s1_e2_09_enums.sql` (notification kinds `login_method_added`, `login_method_removed`) and `20261108100002_s1_e2_09_ways_to_log_in.sql`.
  - The sign-up trigger's checks moved into `create_profile_from_sign_up()`. A password sign-up runs them exactly as before. A Google, Apple or Microsoft account gets no profile from the trigger, so it can't read or write anything until `finish_social_sign_up(sign_up_data)` runs the same checks (age, market, username, invite, terms) with the answers from the sign-up form. A refusal names the rule and keeps nothing.
  - `cancel_social_sign_up()` removes an unfinished provider account. The hourly job `purge-unfinished-social-sign-ups` removes any left for more than a day.
  - Never merged silently (criterion 5): `guard_identity_link()`, a trigger on `auth.identities`, refuses a provider on an account that is already set up unless the person pressed Connect in Settings in the last ten minutes (`expect_identity_link()` writes to `identity_link_requests`, which only the owner reads).
  - `notify_login_method_change()` on `auth.identities` and `auth.webauthn_credentials` tells the person in the app, and always by email, when a way to log in is connected or disconnected (criterion 4). The message never says which one.
  - `my_login_methods()`: whether there is a password, the providers and the passkeys, never a provider's email.
  - New flag `passkey_login` (off, public).
- **Config:** `supabase/config.toml` turns on manual linking and passkeys locally, with `localhost` as the relying party.
- **Screens:**
  - Sign-up: under "Create account", "or sign up with" Google, Apple or Microsoft, and the line that they only replace the password (criterion 1). Pressing one checks the year, username and terms first (no email or password), keeps the answers in the tab's sessionStorage and leaves for the provider.
  - Log-in: the three providers and "Use a passkey" above the form, then "or".
  - `/auth/social-return`: finishes a sign-up with the kept answers and goes home. Otherwise it says why not: a rule refused (with the rule), the email already has an account (log in and connect it in Settings), the person never joined (join first), or they pressed Cancel.
  - Settings › Ways to log in: email and password, Google, Apple, Microsoft (Outlook) and each passkey, Connected or Not connected, with Connect, Disconnect, "Add a passkey" and "Set a password". The last way in can't be disconnected and the note says why (criterion 3).
  - The providers' own full-colour logos are SVG files in `src/assets/brands/`, unchanged.
  - Notifications and the email worker know the two new kinds, with their own subject.
- **Text:** `auth.json`, `account.json`, `notifications.json` and `email.json`, in ro and en.
- **Docs:** `docs/retention.md` (provider identities, unfinished sign-ups, passkeys, link requests), `docs/code-tour.md`, `supabase/README.md`, `docs/board-fixes.md` and the auth and account READMEs.

## How it was tested

- **pgTAP `203-ways-to-log-in` (24 tests):**
  - a provider account starts with no profile, and the gate treats it as no account;
  - finishing refuses a year under 13, a refused username or a missing invite and keeps nothing, then succeeds with good answers (profile and both consents), and a second finish changes nothing;
  - cancelling and the hourly clean-up;
  - Google can't join an existing account on its own, can once asked for, and `identity_link_requests_select_own` is tested allowed and denied;
  - connecting and disconnecting are notified and always emailed;
  - `my_login_methods()` lists Google without any email.
  - `021-signed-out-reads` is updated.
- **Unit:** `socialReturn.test.ts` (8 tests: the order of the return page's cases) and a new `notification-emails` test (the login email's subject, and it never names the provider).
- **e2e `ways-to-log-in.spec.ts` (10 tests):**
  - with both flags off, no button shows on log-in, sign-up or Settings;
  - sign-up asks for the year first, then leaves for Google with the right return address and keeps the answers;
  - coming back finishes the sign-up; a year under 13 removes the account; logging in without having joined asks to join first; the "already has an account" error says how to connect;
  - Settings shows the ways in and writes the link request before leaving for Google; an account with only Google can't disconnect it and is offered "Set a password";
  - a passkey is added in Settings, logs in from the log-in page and is removed again, using Chrome's virtual authenticator at `http://localhost:4173`;
  - axe with no sideways scroll on log-in, sign-up and Settings at 390, 768 and 1440 px, light and night, ro and en.
- **Screenshots:** checked by eye: log-in at 390 (light, en), sign-up and Settings › Moduri de autentificare at 1440 (night, ro), and the return page.

## Local check run

Run on Node 24.

- **Static checks:** prettier, lint, typecheck, types:check, i18n:check, migrations:check and third-party:check (after `npm run build`) all pass.
- **Unit tests:** `npx vitest run` passes 975 of 975.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 113 files, 2,502 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **e2e:** with `--workers=1`, `ways-to-log-in`, `sign-up`, `sign-in`, `onboarding`, `notifications`, `notification-emails`, `epic-s1-e2` and `settings-admin` pass 162 of 162. The full run comes at the end of the bundle (part f).

## By hand

- Nothing for staging today: both flags stay off and no account has a provider.
- Added to the GO-LIVE list, for when the flags go on: the Google, Apple and Microsoft developer apps and their secrets in Supabase; the return address `https://<site>/auth/social-return` in each and in Supabase's redirect list; manual linking and passkeys switched on in the hosted projects' Auth settings, with the site's domain as the passkey relying party; the privacy notice and the record of processing naming Google, Apple and Microsoft as sign-in providers; then the flags on.

## Board mismatches

- Settings (6.3): Email and password has no Disconnect, because Supabase Auth can't take a password off once set; without one, the row offers "Set a password", which emails a link. The board's masked email is left out: the address is in the Email address panel.
- Settings (6.3): one row per saved passkey with the date it was added, instead of one Passkey row saying "Saved on this computer" (the server can't tell which device holds it), then "Add another passkey".
- Settings (6.3): the red "You can't disconnect your last way to log in" shows only when the last way could be disconnected (a provider or a passkey). A password alone shows the count.
- SignIn (2.2) and SignUp (2.1): the board's provider buttons go straight to Discover. Here a provider sign-up comes back to a short "logging you in" page that finishes it with the form's answers, or says why not.
- All four are in `docs/board-fixes.md`.

## Follow-ups

- The plan had a "Finish joining" form on the return page. It isn't needed: the sign-up form already holds every answer, so the return page finishes the sign-up on its own, and someone who only logs in is sent to join first.
- Story issues for S1-E2 once the Sync story issues job can run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
