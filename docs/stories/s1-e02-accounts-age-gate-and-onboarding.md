> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E2 Accounts, age gate and onboarding

**Back end and build order:** section 1.7, group B (screens 2.1 to 2.5), waves 1 and 1b; this epic holds the launch gate (section 1.7.8).

Goal: one account type for everyone, pen name optional, the minimum personal data, a real age check at sign-up and age-aware protections.

##### S1-E2-01 Sign up with email

As a new user, I want to create an account with my email and a password or a magic link so that I can write, comment and follow.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E1-02, S1-E1-04, S1-E14-01 (its table; a seeded version stands in until the final text exists)
- **Updated:** 16 Oct 2026 (late evening): the automatic user ID (Robert, chat).
- **Acceptance criteria:**
  - Given the sign-up form, when it is shown, then it asks only for email, password (or "Email me a sign-in link instead"), confirm password and year of birth (plus the month only when S1-E2-02 needs it), plus acceptance of the current terms and consent to the privacy notice; the username and optional pen name come in setup after the age check (S1-E2-06, canvas 16 Oct 2026).
  - Given a new account, when the email is not yet verified, then the user can read but cannot publish, comment, post or message.
  - Given a password, when it is entered, then it must be at least 10 characters (canvas 2.1), is checked against known breached passwords and pasting is allowed.
  - Given the sign-up form, when the person types a password, then they type it a second time in "Confirm password", and the form shows whether the two match before they can continue (Robert, canvas comment, 16 Oct 2026).
  - Given sign-up completes, when the record is saved, then the accepted terms and privacy notice versions are stored with a timestamp.
  - Given any sign-up (email, Google, Apple or Microsoft), when the account is created, then Supabase Auth creates a random UUID and the same value becomes `profiles.id`: this is the user's ID. It never changes and is never given to anyone else, even after the account is deleted.
  - Given the feature flag `invite_only` (proposal, decided 17 Oct 2026, 12:44; on in March), when someone opens sign-up, then they need an invite link or code made by an admin; without one, sign-up explains that the test is by invitation and stores nothing. Admins make the links in the admin site (S1-E11-17, decided 17 Oct 2026, 13:01); until that story lands, invites are seeded by a migration for local and staging testing.
  - Given a user changes their handle or pen name, when they save, then their user ID stays the same and everything they made stays linked to it.
  - Given any public screen, URL, link preview, share card or public view, when it is shown, then the user ID is not in it; staff see it in the admin site and the user sees it only in their own exports.
- **Legal and compliance:** consent is the legal basis (decided 16 Oct 2026, late evening, Q15): the consent wording, its version and the time are stored, and withdrawing consent must be as easy as giving it (GDPR Art 7(3)); an avocat checks this (section 6). GDPR Art 5(1)(c) data minimisation (email, handle, optional pen name, year of birth, the month only where needed, the country code and the age check result only; this updates the Q78 recommendation after the 16 Oct 2026 decisions). WCAG 2.2 criterion 3.3.8 (no cognitive function test to sign in unless an alternative or assisting mechanism exists). Google, Apple and Microsoft sign-up is in S1-E2-09; Apple guideline 4.8 is met there by offering Sign in with Apple (check before relying on it).

##### S1-E2-02 Year of birth at sign-up

As a new user, I want to give my year of birth when I sign up so that the platform knows which age check to run and which protections apply to me.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E2-01
- **Updated:** 16 Oct 2026 (late evening): the explanation is a tooltip (canvas 2.1); the month is asked when the year leaves the age unclear at 13 or 16 (Q16).
- **Acceptance criteria:**
  - Given the sign-up form, when it asks about age, then it asks for year of birth only (a year picker, never a full date of birth); one plain sentence explaining why it is asked sits in a tooltip next to the field (it opens on hover, keyboard focus or tap; Definition of Done, design rules), and a visible line says a quick age check follows.
  - Given a year of birth, when the account is created, then `profiles.birth_year` is stored, `age_check_result` is `pending` and the account stays read-only until the age check in S1-E2-08 passes.
  - Given a year of birth that leaves the age unclear at 13 or 16 (in 2027, someone born in 2014 could be 12 or 13 and someone born in 2011 could be 15 or 16), when the person picks the year, then a month picker appears under it and the age is worked out from the year and the month (decided 16 Oct 2026, late evening, Q16); for every other year the month is never asked and never stored.
  - Given a year and a month, when the age is worked out, then the person counts as the younger possible age within that month, so they reach 13 or 16 on the first day of the month after their birthday month (someone born in May 2011 counts as 15 until 1 June 2027).
  - Given only a year (every other case), when the user's age is worked out, then the younger possible age is used, so the 18 line changes on 1 January of the year after the user turns 18 by year; an "18 or over" Yoti result is still needed for 18+ settings and stories (S1-E2-08).
  - Given a year (and, where asked, a month) that makes the user younger than 13 (the decided minimum age), when the form is submitted, then sign-up is refused with a neutral message ("We don’t keep anything you typed. You can try again once you turn 13."), no account, year or month is stored, and there is no device or IP block (decided 17 Oct 2026, canvas comment; the Yoti age check after sign-up is what catches a false year).
  - Given the March flag `adults_only` (proposal, decided 17 Oct 2026, 12:44: the March test is invited adults only), when the year of birth makes the person under 18, then sign-up is refused with a kind message in both languages (copy to be written) and nothing is stored. While the flag is on, an adult's account is active once the email is confirmed, without the age check (proposal). `birth_year`, `age_band()` and the account gate skeleton stay as they are so S1-E2-08 and S1-E2-03 slot in after March.
  - Given any screen, when another user views a profile, then year of birth, age and the age check result are never shown.
- **Legal and compliance:** minimum age 13 (decided 15 Oct 2026); year of birth then a Yoti check (decided 16 Oct 2026). Year only, never a full date, for data minimisation (GDPR Art 5(1)(c)). Self-declaration alone is not an appropriate age assurance method (Commission Guidelines C/2025/5519, para 52), so the year only chooses the check and S1-E2-08 confirms it. Consent is the legal basis (decided 16 Oct 2026, late evening, Q15), so GDPR Art 8 and the Romanian digital consent age of 16 apply: the month makes the 16 line exact without asking for a full date. ANSPDCP Decision 174/2018 requires a DPIA for processing minors' data and for innovative technology.

##### S1-E2-08 Age check with Yoti

Numbered 08 so that existing story IDs stay the same; it sits here because it runs straight after S1-E2-02.

As a new user, I want to confirm my age quickly with a selfie or an ID document so that I can use the platform with the protections that fit my age.

- **Priority:** Must · **Size:** L (split before building: 08a hosted check, deep link and webhook; 08b retries, manual check and appeal) · **Depends on:** S1-E1-02, S1-E2-02; S1-E16-02 for the desktop return (08a works on the web first, section 1.7.4, group B)
- **Updated:** 17 Oct 2026, 12:44 (Robert): after March. The March test is invited adults only, so this story comes before going live to minors, not before the March test. Priority unchanged.
- **Updated:** 17 Oct 2026 (fact-check): March 2027 is web only (34o), so 08a runs on the web: Yoti's hosted page opens from the browser and returns through a normal web redirect (section 1.7.6, "08a web"). The Tauri criteria below apply when the desktop app is built after March.
- **Acceptance criteria:**
  - Given a user with a pending check, when they start it, then a Supabase edge function creates a Yoti Age Verification session (API key and SDK ID only in Supabase secrets, never in the client; `reference_id` is a random value with no personal data) and returns only the session ID and SDK ID to the app.
  - Given the desktop app (Tauri 2), when the check opens, then Yoti's hosted page opens in the system browser through the Tauri Opener plugin, not inside the app's webview, and the user can choose facial age estimation or an ID document.
  - Given the user finishes or cancels on Yoti's page, when Yoti redirects to the callback, then a deep link (a custom scheme registered with the Tauri deep-link plugin, plus the single-instance plugin on Windows and Linux) brings the user back to the running app, which shows "Checking your age" until the result arrives.
  - Given Yoti sends a result, when the webhook reaches the edge function, then the RSA-SHA256 PSS signature is verified with Yoti's public key, unsigned or invalid calls are rejected and the function fetches the session result from Yoti before saving anything.
  - Given a valid result, when it is saved, then the profile stores only `age_check_result` (`13_or_over`, `18_or_over` or `failed`), `age_checked_at` and `age_check_method` (`facial_estimation`, `id_document` or `manual`); no selfie, document image, estimated age or Yoti evidence is stored and the temporary `age_check_sessions` row is deleted.
  - Given a year of birth that says 18 or over, when the check confirms only "13 or over", then under-18 protections apply until an "18 or over" result is stored, and the user is offered the ID document route.
  - Given a failed or unclear check, when the user retries, then they can use the remaining facial estimation attempts (Yoti allows 2 per session) or switch to an ID document; after that they can ask for a manual check, and the account stays read-only meanwhile.
  - Given a request for a manual check (appeal), when staff handle it, then they see only the handle, the year of birth with the age group and the attempt history (never images; the year of birth is a named exception in architecture 1.8.3, decided 17 Oct 2026, 12:34), record a decision with a reason in the audit log within 5 working days (canvas 2.3) and the user is told the outcome and how to complete it. The manual check method is OPEN (for example Yoti's ID document route with manual review, or a parent confirming for a 13 to 15-year-old without ID).
  - Given a user under 16 (by year, or by year and month), when the check passes, then the parental consent step in S1-E2-03 starts before the account becomes active (on from launch, decided 16 Oct 2026, late evening).
  - Given a user who turns 18 by year of birth on 1 January, when the nightly job runs, then under-18 protections stay on and they are invited to take an "18 or over" check to unlock adult settings.
  - Given the Yoti session expires or the browser is closed, when the user returns to the app, then they can start a new check and nothing from the old session is kept.
  - Given no passed check and no open appeal within 14 days of sign-up (canvas 2.3), when the cleanup job runs, then the account and its year of birth are deleted.
- **Legal and compliance:**
  - DPIA before go-live (ANSPDCP Decision 174/2018; EDPB Statement 1/2025, para 13, says age assurance is high risk "in many cases"). It must record why facial age estimation is or is not special category data (GDPR Art 9; Law 190/2018 art 3 on biometric data) and name Yoti as processor under its data processing agreement.
  - Commission Guidelines C/2025/5519 paras 47 and 48: estimation suits a minimum age below 18 and must come from an independent third party or be audited; check age at account creation; offer more than one method; give a way to challenge a wrong result. The guidelines exclude micro and small enterprises (para 8), but regulators use them as the benchmark.
  - Yoti client terms (22 Sep 2026): the platform must not store the selfie without Yoti's written approval (cl 2.8(l)); Yoti deletes the photo when the check completes and keeps results for 6 months; Yoti can suspend estimation if no suitable age buffer is set (cl 7.2(f)); keep Yoti's consent screen on.
  - Spain: the AEPD fined Yoti EUR 950,000 in March 2026 over its Digital ID app (facial template kept, pre-ticked R&D consent, retention). Yoti says the decision covers the app only and has appealed. Use the hosted check only, with no Digital ID template and no reuse for R&D, and watch the appeal.
  - OPEN: the buffer at the 13 gate. Yoti publishes no accuracy table at 13; the Australian trial passed 86% of 12-year-olds at an unbuffered 13 gate and says a buffer of at least 2 to 3 years is needed. A buffer sends many real 13 and 14-year-olds to the ID route, and most Romanians get their first ID card at 14.
  - OPEN: whether Yoti also verifies the 16 step (the parental consent line) or we rely on the year and month; facial estimation is weak at 16 (the same trial passed about 57% of 15-year-olds).
  - OPEN: Yoti cost per check (published "Age only" GBP 0.15, about EUR 0.18, with a GBP 15 monthly minimum; current age estimation price unconfirmed; default set-up fee GBP 250, about EUR 295) and whether Yoti onboards before the company exists (SRL or AB: OPEN, Q55).
  - Staff handling a manual check see the year of birth (decided 17 Oct 2026, 12:34); the record of processing must say so (GDPR Art 30), and only staff handling that check see it.
  - OPEN: camera access if the check ever runs inside the desktop app on macOS and Linux; the system browser route avoids it for now. Whether one Yoti session can test both 13 and 18 is unconfirmed.

##### S1-E2-03 Parental consent for under-16s

As a parent or guardian of a user under 16, I want to give or refuse consent by email so that my child's account follows Romanian law.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E2-02, S1-E2-08
- **Updated:** 17 Oct 2026, 12:44 (Robert): after March. The March test is invited adults only, so this story comes before going live to minors, not before the March test. Priority unchanged.
- **Updated:** 16 Oct 2026, late evening: consent is the legal basis (Q15), so this is on from launch, Must and in the March MVP; "parent or guardian" in the wording (Q8).
- **Acceptance criteria:**
  - Given a user under 16 (by year, or by year and month), when they pass the age check, then they enter a parent's or guardian's email, the account stays read-only and the parent or guardian receives a consent link in Romanian or English.
  - Given the parent or guardian confirms, when the link is used, then the account is fully active and the consent record (who, when, which notice version, the email it was sent to) is stored.
  - Given the parent or guardian refuses, when they press Refuse, then the account and its data are deleted and the young person is told.
  - Given no consent within 14 days (canvas 2.4), when the cleanup job runs, then the account and its data are deleted.
  - Given a parent or guardian withdraws consent later, when they use the link in their confirmation email or write to us, then the account goes read-only and the young person and the parent are told what happens next (what exactly happens is on the lawyer's list, section 6).
  - Given the `parental_consent` flag, when staff look at it, then it is on; it stays only as an emergency switch and turning it off is owner-only and logged.
- **Legal and compliance:** GDPR Art 8 (Romania's digital consent age is 16) with consent as the legal basis (decided 16 Oct 2026, late evening). How the parent or guardian is verified is **OPEN** for an avocat (section 6); email alone is weak. Romania's digital majority bill (PL-x 356/2025) is still pending. 16 and 17-year-olds join and accept the Terms without a parent (decided 17 Oct 2026, 10:23); the Civil Code art. 41 risk (capacity from 14 to 18) is on the lawyer's list (section 6). This story is part of the launch gate (section 1.7.8).

##### S1-E2-04 Username and optional pen name

As a writer, I want to choose a username and an optional pen name so that I can publish without using my real name.

- **Priority:** Must · **Size:** M (was S; the word lists and look-alike checks add work) · **Depends on:** S1-E2-01; S1-E11-02 for approving false hits
- **Updated:** 16 Oct 2026, late evening (Q21 and the 22:55 limits).
- **Acceptance criteria:**
  - Given a username, when it is chosen, then it is 3 to 30 characters (canvas 2.5) and may use any character in any script (dots, underscores, letters with diacritics, symbols and emoji included), except invisible and control characters (zero-width spaces, direction overrides), which are refused because they are used to fake names.
  - Given a username, when it is checked, then it is refused if it contains a word on the English or Romanian swearword lists (matched after folding case, diacritics, look-alike letters and digits such as 0 for o), imitates staff or the brand (staff, admin, moderator, support, Ghemotoc, The Magic Coffin and their look-alikes) or uses confusable characters to look like an existing username (Unicode TR39 "skeleton" comparison).
  - Given a refusal the person thinks is wrong (a false hit, for example a Romanian surname that contains a listed word), when they ask for a review, then a moderator can approve that exact username from the account page (S1-E11-02), and the approval is logged.
  - Given a username, when its web address is made, then it is normalised (Unicode NFKC, lower case, diacritics and look-alikes folded, anything else percent-encoded); the normalised form must be unique, so two usernames that differ only in case or look-alike letters can't both exist.
  - Given a pen name is set, when the user's content is shown, then the pen name is displayed; without one, the handle is displayed.
  - Given a user changes their pen name, when they save, then the change is allowed at most once every 30 days (proposal) and the old value is kept in the audit log for moderators.
  - Given a pen name, when it is submitted, then the same swearword, staff look-alike and invisible-character checks apply.
- **Legal and compliance:** the platform never collects legal names in Stage 1. Identity checks only arrive where money changes hands (Stage 3). The word lists hold offensive words, not personal data. Username rules go in the community guidelines (S1-E14-01).

##### S1-E2-05 Sign in, sessions and account recovery

As a user, I want to sign in, reset my password and see where I'm signed in so that my account stays mine.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E2-01
- **Acceptance criteria:**
  - Given wrong credentials, when sign-in fails, then the message does not reveal whether the email exists.
  - Given five failed attempts in a row (canvas 2.2; the 15-minute window is a proposal), when a sixth is made, then sign-in for that account is paused for 15 minutes (canvas 2.2).
  - Given account settings, when the user opens "Sessions", then they see active devices and can sign out of all of them.
  - Given a password reset, when it completes, then all other sessions are signed out and the user gets an email.
  - Given Settings › Email address, when any signed-in user (minors included) opens it, then they see their own address (only they ever see it) and can change it at any time (Robert, 25 Oct 2026, 07:04).
  - Given a new address, when the user presses "Change email", then a 6-digit code goes to the current address and another to the new one, and the panel shows two boxes, "Code from your current address" and "Code from your new address"; the address changes only once both codes are right, so the person proves they can read both inboxes without leaving Settings (Robert, 25 Oct 2026, 09:15; replaces the two emailed links shipped in PEOPLE-3). Supabase Auth makes, checks and expires the codes (`verifyOtp` with type `email_change`, once per address; `double_confirm_changes` on); we never make or store a code ourselves.
  - Given a wrong or expired code, when it is typed, then the box says so in plain words and offers "Send new codes"; nothing changes until both are right.
- **Legal and compliance:** GDPR Art 32. CTO note: Supabase Auth doesn't give users a list of their signed-in devices (check before relying on it), so "Sessions" needs our own `user_sessions` table (a device name and a last-seen date, no IP address) written at sign-in; "Sign out of all" uses Supabase's global sign-out.

##### S1-E2-06 Onboarding

As a new user, I want a short setup that asks my name, language and what I like so that my first screen is relevant.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E2-01, S1-E2-04, S1-E2-08, S1-E5-01
- **Updated:** 16 Oct 2026 to match the canvas (setup after the age check; the Teacher badge step for adults).
- **Acceptance criteria:**
  - Given a passed age check, when setup ("Set up your profile") starts, then it has three steps: (1) username, optional pen name, interface language and an optional county or region (country is never asked; it comes from the connection, S1-E2-10); (2) what I like to read and write, with tags; (3) "Staying safe here" for under-18s or the optional Teacher badge for adults. Only the username is required; everything else can be skipped and changed later in Settings.
  - Given the user picks categories and tags, when setup ends, then these are stored as explicit preferences and shape Discover (the main screen; Home and Discover are separate for now and merge later).
  - Given an under-18 user, when step 3 runs, then it shows how to block, report and control who can message them (messaging is never possible between under-16s and adults; 16 and 17-year-olds choose whether adults can message them, off by default), plus the community guidelines in short.
  - Given a user with an "18 or over" age check result, when step 3 runs, then it asks "Are you a teacher?" with the two ways in S1-E2-11 and "Not a teacher? Skip this"; under-18s never see this step. Until S1-E2-11 is built, adults skip step 3 (this removes a circular dependency between the two stories).
  - Given the last step, when the user finishes or skips it, then "Go to Discover" takes them to Discover.
- **Legal and compliance:** preferences are explicit choices, not inferred profiling. Ads are never personalised for anyone (decided 16 Oct 2026, late evening).

##### S1-E2-07 Staff roles with mandatory two-factor sign-in

As the founder, I want staff roles that require two-factor sign-in so that moderation and admin powers are protected.

- **Priority:** Must · **Size:** M (split, decided 17 Oct 2026, 12:44: 07a staff roles on the normal email login, S, in the March MVP; 07b Google Workspace sign-in, M, after March) · **Depends on:** S1-E1-02, S1-E2-05
- **Split (Robert, decided 17 Oct 2026, 12:44):** 07a (March): staff roles as a flag on the normal email login, with roles and permissions, `is_staff()` checks and the audit log. `is_staff_session()` exists as a function that returns true for any session of an account with a staff role, with a comment saying it becomes the Google Workspace check in 07b. 07b (after March): Google Workspace sign-in with Google's 2-Step Verification, and `is_staff_session()` made real.
- **Updated:** 16 Oct 2026 (late evening): support and content editor roles, per-person permissions (Robert, chat); staff log in only with company SSO (Q30).
- **Acceptance criteria:**
  - Given the role model, when it is created, then it has the member roles `user` and `space_moderator` (scoped to one space) and the staff roles `owner`, `admin`, `moderator`, `support` and `content_editor`, plus three permissions given per person: `safeguarding`, `teacher_checks` and `on_call` (section 1.8.3).
  - Given March (07a), when a staff member signs in, then they use the normal email login on a staff account; an owner or admin sets the staff role as a flag on that account, `is_staff()` checks the role and permissions, and `is_staff_session()` returns true for any session of an account with a staff role, with a comment saying it becomes the Google Workspace check in 07b (decided 17 Oct 2026, 12:44).
  - Given 07b (after March), when a staff member signs in, then it is only through the company's single sign-on (SSO) into a staff account; a personal writer account, if they have one, stays separate and never holds a staff role.
  - Given any staff role (07b), when the session didn't come from Google sign-in with an account on the company's Google Workspace domain, themagiccoffin.com (read from the setting `STAFF_EMAIL_DOMAIN`, decided 17 Oct 2026, 12:47), then database policies deny every staff action (`is_staff_session()`); Google's own 2-Step Verification is the second factor and is enforced for every staff account in the Workspace admin console (decided 17 Oct 2026, 11:53).
  - Given a staff member, when they use an admin area, then the database allows only what the table in section 1.8.3 gives their role and permissions, and nobody can change their own role.
  - Given a role change, when it is saved, then it is written to the audit log with who changed it and why.
  - Given public sign-up, when a user registers, then they can never receive a staff role without an owner or admin granting it.
- **Legal and compliance:** GDPR Art 32. Interns and part-time moderators will see personal data, so confidentiality terms in their contracts (Q47) must exist before access is granted. CTO notes: the identity provider is Google Workspace on the company's domain, themagiccoffin.com, read from `STAFF_EMAIL_DOMAIN` and never hard-coded (decided 17 Oct 2026, 34n; domain decided 17 Oct 2026, 12:47), and Supabase's SAML SSO needs a paid plan (check before relying on it). Google's own two-step check is enough; no separate code (decided 17 Oct 2026, 11:53). CTO note: plain "Sign in with Google" restricted to the company domain (themagiccoffin.com) works on the free Supabase plan; SAML SSO is the stronger option once on a paid plan.


##### S1-E2-09 Sign up and log in with Google, Apple or Microsoft

As a reader or writer, I want to join and log in with my Google, Apple or Microsoft (Outlook) account or a passkey so that I don't need another password.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E2-01, S1-E2-05, S1-E2-08
- **Added:** 16 Oct 2026, Robert's request (chat).
- **Acceptance criteria:**
  - Given the sign-up page, when it loads, then it offers Continue with Google, Continue with Apple and Continue with Microsoft below the email sign-up, after an "or sign up with" divider (Robert, canvas comment, 16 Oct 2026).
  - Given a new account made with one of these, when the provider returns, then the person still gives their year of birth (S1-E2-02) and passes the Yoti age check (S1-E2-08), and under-16s still go through parental consent (S1-E2-03). The page says: "Google, Apple and Microsoft don’t tell us how old you are."
  - Given the log-in page, when it loads, then it also offers "Use a passkey".
  - Given Settings › Ways to log in, when a user connects or disconnects a method, then the change is saved and an email confirms it; disconnecting the last remaining method is blocked.
  - Given a provider returns an email that already has an account, when the person signs in, then they are asked to log in the usual way first and link the two, never merged silently.
  - We ask the provider for the minimum scopes (name optional, email); no contacts, no age, no profile photo by default.
- **Legal and compliance:**
  - Provider sign-in is not age assurance; self-declared or provider age signals do not meet the DSA Art 28 guidelines (C/2025/5519), Ofcom or eSafety expectations (research H1, 16 Oct 2026). Yoti stays.
  - App Store Guideline 4.8: an iOS app that offers third-party logins must also offer an equivalent privacy-focused option; Sign in with Apple meets it (check before relying on it).
  - Staff log in only through company SSO (S1-E2-07, decided 16 Oct 2026, late evening); member social log-in never gives staff access.
  - Provider data in the privacy notice and the record of processing.

##### S1-E2-10 Country from the connection at sign-up

As the company, I want to know each account's country without storing IP addresses so that we can open or close markets by country (Romania first, decided 17 Oct 2026, 11:48; section 1.2), apply the right local rules and report users by country.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E2-01, S1-E11-05
- **Added:** 16 Oct 2026 as a proposal; decided 16 Oct 2026, late evening (Q20): the country comes from the connection and is never asked.
- **Acceptance criteria:**
  - Given a sign-up, when the request reaches our hosting edge, then the provider's country header (for example a two-letter code) is read and only that code is stored on the account; the IP address is not stored by us.
  - Given sign-up and setup, when they run, then nobody is asked for their country; Settings shows it as "From your connection", and someone who thinks it is wrong can ask support (S1-E14-04) to correct it (proposal).
  - Given a sign-up from Australia by someone under 16, when the age is worked out (S1-E2-02), then sign-up is refused with "Ghemotoc isn't open to under-16s in Australia yet" and nothing is stored (decided 16 Oct 2026, late evening, Q19).
  - Given a country whose market is closed, when someone signs up from it, then they see a polite "not open in your country yet" page and can leave an email for when it opens (OPEN: whether to keep that email).
  - The optional county or region for "Popular in your area" stays a separate, self-chosen field.
- **Legal and compliance:** reading the IP at the edge is still processing personal data (CJEU C-582/14 Breyer, where the provider has legal means to identify the person); legal basis legitimate interest, listed in the privacy notice and DPIA; no cookie or device storage is involved, so the ePrivacy consent rule is unlikely to apply (EDPB, research H1). VPNs make it approximate, so it is never used alone for age or legal eligibility.

##### S1-E2-11 Teacher badge

As an adult who teaches, I want to show that I'm a teacher when I set up my account so that I can create private class spaces for my students.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E2-06, S1-E2-08, S1-E7-01, S1-E11-01, S1-E13-04
- **Added:** 16 Oct 2026, Robert's decision (canvas, Onboarding step 3 and Create a space).
- **Acceptance criteria:**
  - Given a user whose age check result is "18 or over", when setup reaches step 3, then it shows "Are you a teacher?", explains that a Teacher badge lets them create private class spaces, offers two ways (confirm a school email, or upload proof that you teach) and "Not a teacher? Skip this"; users without an "18 or over" result never see the badge option anywhere.
  - Given the user skips, when setup ends, then nothing about teaching is stored and they can ask for the badge later (proposal: from Settings).
  - Given the school email way, when the user types an address, then personal addresses (Gmail, Yahoo, Outlook, Hotmail, iCloud, Proton and similar) are refused with "This looks like a personal address. Use your school one, or upload proof instead."; an institutional address (for example one ending in .edu.ro or the school's own domain) is accepted and we email it a one-time link.
  - Given the user opens the link, when the address ends in .edu.ro, then the badge is granted; for any other school domain, staff confirm the domain belongs to a school before the badge is granted.
  - Given the proof way, when the user uploads a letter from the school or a staff card, then only JPG, PNG or PDF is accepted (size limit OPEN, proposal 10 MB), location data is removed and the file goes to a private bucket that only staff with the teacher-check permission can open; the screen says "We only use it to check that you teach. Once the check is done, we delete it."
  - Given a check is pending, when the user uses Ghemotoc, then the account works as normal and their own account shows "Teacher badge · pending" (proposal: nobody else sees a pending badge); staff check proofs usually within two working days (proposal).
  - Given staff open Teacher checks in the admin site (part of the Schools area), when they review a request, then they see the handle, the way chosen and the school domain or the proof file. They approve or reject with a reason, and the decision goes to the audit log.
  - Given a decision is saved, when it is approved or rejected, then the proof file is deleted straight away, only the way, the decision, the date and the staff member are kept. The user gets a notification (S1-E7-01) with the outcome and, if rejected, the reason and how to try again.
  - Given an approved badge, when the user's profile is shown, then it carries a "Teacher" badge and Create a space shows the Class space option (S1-E8-11).
  - Given staff remove a badge (for example the person no longer teaches), when they save, then the badge and the Class space option go and existing class spaces stay for staff to reassign; the action is logged.
- **Legal and compliance:**
  - Lawyer hat: proof documents and school email addresses are personal data. GDPR Art 5(1)(c) data minimisation: ask only for what shows the person teaches (the upload screen should say to cover anything else, such as ID numbers). Art 5(1)(e) storage limitation: delete the proof after the check, and add it to the record of processing, the privacy notice and `docs/retention.md`. Whether to keep the school email address or only its domain after the check is OPEN (proposal: domain only).
  - An avocat should check the whole teacher check before launch, including whether a school email or a letter is enough for someone who will moderate a class of mostly under-18s.
  - The badge is not a background check. Teachers still follow the adult and minor messaging rules (S1-E9-03): no messages with under-16s, ever.
  - OPEN: how long the email link works, how staff confirm a non-.edu.ro school domain and when a badge is reviewed again.

##### S1-E2-12 Optional birthday greeting

As a user, I want to add my birthday (day and month only) so that the app wishes me a happy birthday.

- **Priority:** Could · **Size:** S · **Depends on:** S1-E2-05, S1-E11-02, S1-E14-01
- **Added:** 25 Oct 2026, 07:08 to 07:11 (Robert, chat). Built when the builder resumes on 29 Oct 2026, before SAFE-3.
- **Data:** `profiles.birthday_month` (1 to 12) and `profiles.birthday_day` (1 to 31, only with a month), both optional and never stored with a year. Readable only by the owner (not in any public view); staff see them only when correcting them.
- **Acceptance criteria:**
  - Given Settings, when a user adds only a month, then all that month the signed-in greeting says "Happy birthday month, <name>".
  - Given a day and a month, when it is that month, then the greeting says "Happy birthday month" all month and "Happy birthday, <name>" on the day (Romanian date).
  - Given the user saved a wrong birthday, when they ask support, then staff correct it with an `admin_*` function that writes the audit log; the user can also clear it themselves.
  - Given the year of birth set at sign-up (S1-E2-02), when anyone (staff included) tries to change it, then it is refused: someone who entered it wrongly deletes the account, waits for the deletion to finish and signs up again (Robert, 25 Oct 2026, 07:10 to 07:11).
- **Legal and compliance:** CLAUDE.md rule 5 bans full dates of birth; a day and month without the year is not one, but the privacy notice needs a line for it (optional, used only for the greeting) and it goes on the lawyer's list.

##### S1-E2-13 Joining anniversary greeting

As a user, I want the app to mark the month I joined so that coming back feels personal.

- **Priority:** Could · **Size:** S · **Depends on:** S1-E2-01
- **Added:** 25 Oct 2026, 07:07 (Robert, chat). Built when the builder resumes on 29 Oct 2026, with S1-E2-12 (they share the greeting line).
- **Acceptance criteria:**
  - Given a signed-in user in the month they joined (from `profiles.created_at`, Romanian date), from the first anniversary on, when they open the app, then the greeting line says "Happy {{productName}} anniversary, <name>".
  - Given a birthday greeting on the same day, when both apply, then the birthday wins (proposal).
  - Given there is no greeting line yet, when this story lands, then it adds a small greeting line at the top of Discover for signed-in users; its wording is interface text that admins can edit (S1-E11-18).

##### S1-E2-QA Epic check: Accounts, age gate and onboarding

As the founder, I want every story in this epic tested together end to end so that the pieces work with each other, not just alone.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E2-01, S1-E2-02, S1-E2-04, S1-E2-05, S1-E2-07a, S1-E2-10
- **Added:** 17 Oct 2026, 12:36 (Robert, chat): every epic ends with a quality-check story, and every prompt has a quality check built in. It covers the epic's March MVP stories and comes last among them in the build order. The epic's after-March stories (S1-E2-03, S1-E2-06, S1-E2-07b, S1-E2-08, S1-E2-09, S1-E2-11) get the same check when they land (proposal).
- **Main journeys:** an invited adult signs up with an invite code made by an admin and gives a year of birth (a year under 18 is refused while `adults_only` is on), chooses a username and pen name, signs out and back in, recovers the account and sees the country taken from the connection; a staff member signs in with the normal login and a staff role (decided 17 Oct 2026, 12:44).
- **Acceptance criteria:**
  - Given the epic's stories are merged, when the end-to-end suite runs, then Playwright tests walk the main journeys across those stories with the seed personas `adult_writer`, `teen_17`, `kid_14_ok` and `kid_14_waiting` and the staff personas the epic uses, and every journey passes.
  - Given a journey breaks where two stories meet, when it is found, then it is fixed in this pull request or ticketed as a GitHub issue that names the stories involved.
  - Given every screen in the epic, when axe runs at 390, 768 and 1440 px wide, then it reports no serious or critical issues.
  - Given the RLS tests, when they run as one suite (`npx supabase test db`), then every policy on every table the epic touches has an allowed and a denied test, with no gaps.
  - Given `docs/code-tour.md`, when it is read, then it covers the epic: where its screens, hooks, tables, functions and jobs live and how one main journey travels through them.
  - Given the check is finished, when the pull request is opened, then it includes a short epic report listing what works, the known gaps and every stub or mock still on (with the story that removes it, `docs/mocks.md`).
- **Legal and compliance:** minors' journeys are tested with the under-16 (`kid_14_ok`, `kid_14_waiting`) and 16 to 17 (`teen_17`) personas, so the age gate, ratings, blocks and under-18 defaults are proved across stories, not only inside each one. In March only invited adults sign up (`adults_only`, decided 17 Oct 2026, 12:44), so the minor personas are seed data that prove these protections are ready before minors are let in. The test data is the seed personas only, never real user data (CLAUDE.md, Safety while building).

---
