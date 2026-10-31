# Ghemotoc: bundles for the full Stage 1 app (30 Oct 2026)

Saved from Robert's message in the builder thread (30 Oct 2026, 05:22 UTC). Source: `cto/lanes/02-full-app-bundles.md`.

Robert decided (chat, 30 Oct 2026, 06:09): build the full app with every Stage 1 user story, not only the March slice. Claude Code builds the bundles one by one. Anything that needs an API key, an account, a contract or a payment is built against a stub and switched on at the very end, by Robert, in one go (bundle GO-LIVE).

This replaces the March-only order in 01-replan-24-oct.md and the "Not March (don't build)" list in builder-brief.md. Everything else in the builder brief still applies (one bundle at a time, build first and one quality pass at the end, the local merge gate, rule 7 only app content, rule 8 decide and carry on).

## Already done (merged on main by 26 Oct 2026)

TOOL-1 #195, READ-1 #196, SAFE-1 #197, TOOL-2 #198, PEOPLE-1 #199, SAFE-2 #200, READ-2 #201, PEOPLE-2 #202, READ-3 #203, TOOL-3 #204, PEOPLE-3 #205, PEOPLE-4 #207, SAFE-3 #208. Plus the epics before them (S1-E1, most of S1-E2 and S1-E3, S1-E11-01, 01b and 17, S1-E14-01 and 04).

Before each bundle the builder checks main: a story that's already built is skipped; a story that's partly built (for example S1-E5-06 classics, S1-E11-16a, S1-E10-03 part b, S1-E5-QA part two) is finished in the bundle where it's listed below.

## The rule for anything external (the "plug in at the end" rule)

1. Every outside service sits behind one small adapter in the code (an interface plus a `stub` provider and a `real` provider), chosen by an environment variable such as `IMAGE_CHECK=stub|sightengine`.
2. The stub behaves like the real thing for tests and staging: it returns realistic results, including the failure cases, so every screen and rule can be built and tested end to end.
3. A feature that would mislead people while stubbed stays behind a feature flag, off on staging (for example picture uploads, social sign-in buttons and ads).
4. The real provider is written too, from the vendor's public documentation, with its tests run against recorded sample responses. Only the key is missing.
5. Every missing key, account, contract or click goes into `pr-drafts/by-hand-for-robert.md` under "GO-LIVE", never as a blocker. The builder never stops for it.

## The bundles, in order (each starts only when the one before is merged)

| # | Bundle | Stories | External, stubbed until GO-LIVE |
|---|---|---|---|
| 1 | SAFE-4: picture check and safety round two | S1-E10-05 picture check, S1-E10-03 part b (if left), S1-E10-07 appeals, S1-E10-11 moderator mail, S1-E10-12 spam and abuse rate limits, S1-E10-13b, S1-E10-QA round 2, S1-E14-03 accessibility statement and no-cookie check, S1-E14-QA | Sightengine and Arachnid Shield (picture_uploads flag stays off) |
| 2 | CMS-1: website, settings and emails | S1-E11-03 content settings and flags (what's left), S1-E11-05 markets and languages, S1-E2-10 country from the connection (if left), S1-E11-06 home page copy, S1-E11-10 notice banners, S1-E11-12 help pages, S1-E11-19 every email through the Send Email hook and Brevo with editable text, S1-E11-11 doodle schedule, S1-E5-07 seasonal doodles, S1-E5-08 public home page, S1-E5-QA part two | none new (Brevo is in) |
| 3 | DISCOVER-2: search and classics | S1-E5-04 search stories and writers, S1-E5-06 classics shelf (the rest), S1-E11-16 add and manage classics (the rest) | none |
| 4 | READ-4: reading and numbers | S1-E4-02 reading settings, S1-E4-03 library and continue reading, S1-E4-05 share a chapter, S1-E4-07 quote-share card, S1-E3-07 writer dashboard, S1-E7-02 email notifications and digests, S1-E15-01 cookieless analytics, S1-E15-03 event catalogue, S1-E11-04 metrics and compliance logs | analytics product (Plausible or Umami, OPEN) |
| 5 | WRITE-2: richer chapters | S1-E3-09 pictures in chapters, S1-E3-10 music and video from other services, S1-E3-11 drawings, S1-E3-12 Canva covers, S1-E4-11 share a passage or a picture, S1-E6-06 inline paragraph comments | Canva app keys; pictures use SAFE-4's check |
| 5b | ATLAS: Story Atlas, the planning side of every story (added 31 Oct 2026, Robert) | S1-E17-01 to S1-E17-31 and S1-E17-QA (`docs/stories/s1-e17-story-atlas.md`), in lettered parts: a stories, details and at a glance; b characters, custom fields and images; c relationships, map and family tree; d story bible; e chapter planning fields and the writing view with the existing editor; f board, timeline and POV lanes; g questions and ideas, marketing notes; h search and [[cross-links]], then the epic check | none (images use SAFE-4's picture check) |
| 6 | ACCOUNTS-2: age check and minors | S1-E2-08 age check with Yoti (08a on the web), S1-E2-03 parental consent for under-16s, S1-E2-06 onboarding, S1-E2-09 sign in with Google, Apple or Microsoft, S1-E2-11 teacher badge, S1-E2-QA round 2 | Yoti (stub returns pass, fail and pending), the three sign-in providers' client IDs |
| 7 | MESSAGES | S1-E9-03 adult and minor messaging rules, S1-E9-01 private messages, S1-E9-02 block and report in messages, S1-E9-04 message settings and retention, S1-E9-QA | none |
| 8 | PRIVACY | S1-E13-01 privacy settings, S1-E13-02 download my data, S1-E13-03 delete my account, S1-E13-04 retention schedule, S1-E13-05 download my stories, S1-E13-QA | none |
| 9 | FORUMS-1 | S1-E8-01 categories, S1-E8-02 threads and posts, S1-E8-03 quotes and quick reply, S1-E8-04 read and unread, S1-E8-05 sticky and locked, S1-E8-10 forum search | none |
| 10 | FORUMS-2: spaces | S1-E8-06 user-created spaces, S1-E8-07 space moderators, S1-E8-08 signatures, S1-E8-09 ranks and reputation | none |
| 11 | CLASSES | S1-E8-11 private class spaces, S1-E8-12 writing certificates, S1-E8-QA | none |
| 12 | ADMIN-2 | S1-E11-07 every story in the admin site, S1-E11-08 staff can open and change any story, S1-E11-09 data requests and story export, S1-E11-13 support tickets, S1-E11-QA round 2 | helpdesk product (OPEN): built as tickets inside the admin site with an adapter for the outside helpdesk |
| 13 | CONTESTS | S1-E11-14 landing pages for contests and campaigns, S1-E11-15 contests | none |
| 14 | SPONSORS | S1-E12-01 banner slot, S1-E12-02 sponsor campaigns, S1-E12-03 sponsor reporting, S1-E12-04 ad-network ads that are never personalised, S1-E12-05 slot booking and fill order, S1-E12-QA | ad network account (ads flag off) |
| 15 | APPS-1: web app and desktop | S1-E16-01 installable web app, S1-E3-08 web and app or app only, S1-E4-09 "Only in the app" notice, S1-E16-02 desktop apps (Tauri 2), S1-E4-06b capture protection in the apps, S1-E4-10 device fonts | code-signing certificates (builds come out unsigned until GO-LIVE) |
| 16 | APPS-2: phones | S1-E16-03 iOS and Android (Capacitor) with deep links, S1-E7-03 push notifications, S1-E4-08 offline reading, S1-E16-04 app store compliance pack, S1-E16-QA | Apple and Google developer accounts, push certificates (APNs, Firebase); builds run on simulators and emulators |
| 17 | CHECK: the whole app | Every epic's check run again on the finished app, every built story's issue closed, epic reports for every epic, the rule 7 clean-up (non-app files such as docs/history briefs and business rows leave the repo), and the final GO-LIVE list | none |
| 18 | GO-LIVE (Robert, with the builder) | Robert creates the accounts and keys on the list; the builder switches each adapter to `real`, turns on the flags and runs the checks again against the real services on staging | all of the above |

Not built: S1-E1-06 (Won't, replaced on 17 Oct). Stages 2 to 7 are not in this plan.

## The GO-LIVE list (what Robert will do at the end, in one sitting where possible)

The builder keeps this list current in `pr-drafts/by-hand-for-robert.md`. Expected items:

- Already on the list: the Vault secret `banned_email_secret`, `public_notice_secret` and `NOTICE_SECRET`, BREVO_API_KEY in Cloudflare, the Cloudflare rate-limit rule, revoking the test invite before real invitees, reading the Romanian copy.
- Picture check: Sightengine account and keys; Arachnid Shield application (Canadian Centre for Child Protection), approval and key.
- Age check: Yoti account, contract, keys and webhook secret.
- Sign-in: Google, Apple and Microsoft app registrations (client IDs and secrets) in Supabase Auth.
- Analytics: Plausible or Umami account (choice OPEN).
- Helpdesk: product choice (OPEN) and its API key.
- Canva: Canva developer app keys.
- Ads: ad-network account (only if ads are wanted).
- Apps: Apple Developer and Google Play accounts (need the company and a D-U-N-S number), code-signing certificates for Windows and macOS, APNs key and Firebase project for push.
- Legal before real users: the lawyer's review of the legal pages and of everything touching minors, statements of reasons and authority orders; ANCOM notification within 45 days of starting the service.

## Rough size

About 80 stories left (several are L). At the pace of 24 to 26 Oct (about 3 bundles a day while the Claude allowance lasts), roughly 6 to 10 working days of builder time, spread over the weekly allowance. The app stores add calendar time that can't be sped up (company, D-U-N-S, Google's 14-day closed test, Apple review).
