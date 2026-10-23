# Decisions

Every decision Robert has made, with its date and source. The live list is the master plan's "Decisions made" tab; it wins if this file is out of date. Proposals and OPEN items are not decisions.

## Added 23 Oct 2026

| Decision | Source |
| --- | --- |
| An investor demo is planned for January 2027 (month only, date to be set). It is an earlier show-and-tell build, not the March test: the March test with invited adults is unchanged, and so is the March MVP scope | Chat, 23 Oct 2026 |
| No picture uploads for the January 2027 investor demo: drawn and automatic covers, and initials for avatars. The `picture_uploads` feature flag stays off; the flag itself is built by S1-E3-01 (Lane A), this entry only records the decision | Chat, 23 Oct 2026 |
| Demo content for the January 2027 investor demo: the public-domain classics seeded as a staging top-up (`supabase/staging-topups/`), plus 30 to 40 synthetic Romanian stories | Chat, 23 Oct 2026 |
| S1-E3-02 (chapter editor) and S1-E4-01 (chapter reader) are split into smaller stories before building; S1-E3-01 (create a story) too, if the cover picker grows past size M | Chat, 23 Oct 2026 |
| Approved as proposals for the January 2027 investor demo (proposals, not final product decisions): the canvas's rating wording (the lawyer still has to confirm it), a 600-word teaser, a fixed comment limit, and simple Discover shelves (newest and most liked) instead of the ranking job | Chat, 23 Oct 2026 |
| Scope of the January 2027 investor demo: the moderation queue is in; the teaser is in; notifications and the numbers page only if time allows | Chat, 23 Oct 2026 |
| The Contact page keeps placeholders for the company details until the company exists; Contact us is an email-backed form; the helpdesk product stays OPEN | Chat, 23 Oct 2026 |
| Several Claude Code sessions run in parallel, one epic or one self-contained chunk each. Migrations are named with the story ID and a timestamp so two sessions never clash, and every session rebases on main right before opening a pull request and again before it merges | Chat, 23 Oct 2026 |

## Added 23 Oct 2026 (Lane C: safety and admin; Robert, chat)

| Decision | Source |
| --- | --- |
| The investor demo is planned for January 2027 (month only); it needs the report button, a moderation queue with deadlines, and invite links Robert makes himself | Chat, 23 Oct 2026 |
| A staff session ends after 12 hours, enforced in the database (`staff_session_hours`); the person signs in again. Proposal from S1-E11-01, accepted | Chat, 23 Oct 2026 (Q11) |
| Changing a staff role needs a sign-in from the last 15 minutes (`staff_fresh_sign_in_minutes`); exports for someone else, "Emergency disable" and removing part of a writer's text ask the same when their stories land. Proposal, accepted | Chat, 23 Oct 2026 (Q11) |
| Invite links admit 1 to 50 people and last 1 to 90 days (the screen offers 1, 7, 14 or 30 days); the private note goes into the audit log's before and after values, so it is a first name or a role, never an email | Chat, 23 Oct 2026 (Q12) |
| Safety contacts (S1-E10-13a): the block shows the emergency number, the children's helpline, where to report child sexual abuse material and, where one exists, a youth crisis line; no adult-only line (Romania's ARPS line is left out); "Not your country?" lists all ten researched countries, Romania first; the international fallback is Child Helpline International's and INHOPE's directories, checked online before seeding with the check date; the block also shows on /legal/contact for signed-out visitors | Chat, 23 Oct 2026 (Q9) |
| Lane C's pull requests go on `claude/funny-einstein-pkv35k-<story-id>` branches, one per story, each cut from the one before; screenshots are sent in chat, never committed | Chat, 23 Oct 2026 (Q13, Q14) |

## Added 17 Oct 2026 (after the snapshot below)

| Decision | Source |
| --- | --- |
| Build in Claude Code first, on our own Supabase project in the EU (West EU, Ireland, eu-west-1) from day one, owned by Robert and then the company. Replaces "Lovable's database first" (Q37); S1-E1-06 is no longer needed | Chat, 17 Oct 2026, 11:20 |
| The staging Supabase project stays in West EU (Ireland, eu-west-1); Frankfurt is no longer required | Chat, 17 Oct 2026, 11:40 |
| Romania is the first market; English-speaking countries open later, one by one, each after its legal check (replaces "all English-speaking countries at the same time", 16 Oct) | Chat, 17 Oct 2026, 11:48 |
| The interface opens in Romanian for everyone; English is available in the language menu (English and Romanian both still ship) | Chat, 17 Oct 2026, 11:48 |
| Every screen is responsive for every screen size: phones, tablets and desktops | Chat, 17 Oct 2026, 11:48 |
| The March MVP takes in five more Must stories: S1-E3-04, S1-E6-02, S1-E6-04, S1-E10-08, S1-E10-13 (54 stories, about 594 hours) | Chat, 17 Oct 2026, 11:53 |
| Staff sign in with Google Workspace only; Google's own 2-Step Verification is the second factor, no separate code | Chat, 17 Oct 2026, 11:53 |
| A relationship between 16 and 17-year-old characters with no sexual content can be rated 13+; every rating is explained where the writer picks it | Chat, 17 Oct 2026, 11:53 |
| At most 2 ad slots on any page | Chat, 17 Oct 2026, 11:53 |
| Staff can add public-domain classics from the admin site (S1-E11-16, canvas 8.16; its details are proposals) | Chat, 17 Oct 2026, 12:00 |
| Code must be clean enough for any junior programmer to read and change, with plenty of plain-English explanations of where things start and how they connect: header and step comments, and docs/code-tour.md as the map (the Readable code section of CLAUDE.md; ESLint limits are a proposal) | Chat, 17 Oct 2026, 12:26 and 12:27 |
| Code comments and developer docs are in English only; the extra time the explanations take is accepted | Chat, 17 Oct 2026, 12:29 |
| "Download my data" gives one ZIP: a machine-readable JSON file plus every story as a Word file | Chat, 17 Oct 2026, 12:34 |
| Staff handling a manual age check can see the year of birth (an exception to "age group only") | Chat, 17 Oct 2026, 12:34 |
| The First Chapter contest is scrapped for now; contests are a campaign for later. The contest and landing page features stay after March | Chat, 17 Oct 2026, 12:34 |
| Metrics use aggregated data only, never per-reader records; aggregated data is kept for 3 years | Chat, 17 Oct 2026, 12:34 |
| Until the apps exist everything is on the web: for March the public home page lives inside the web app, with no separate website database yet | Chat, 17 Oct 2026, 12:34 |
| March MVP is a working product for invited adults only, no under-18s. Yoti, parental consent, data-rights screens (handled by email) and staff Google sign-in (a staff flag on a normal login instead) move after March. Replaces, for March only, consent on from launch (Q15), the Yoti check in March and Google-only staff sign-in in March | Chat, 17 Oct 2026, 12:44 (option A) |
| Notice banners show on the website and in the app, from one table | Chat, 17 Oct 2026, 12:44 |
| Class certificates may print the student's real name with the school name; deleted 30 days after the class is archived; the teacher is told to keep copies. Other certificates use the pen name | Chat, 17 Oct 2026, 12:44 |
| Only employees with the admin role manage Classics; content editors will also hold the admin role | Chat, 17 Oct 2026, 12:44 |
| Safety contacts use the researched defaults (research G4) for now; the monthly check starts at go-live | Chat, 17 Oct 2026, 12:44 |
| On wide screens two ads can be in view at once, and they must be different ones | Chat, 17 Oct 2026, 12:44 |
| A to Z sorting follows Romanian alphabetical order; the six reaction emoji are the ones on the Reader board | Chat, 17 Oct 2026, 12:44 |
| Staff Google sign-in uses the Google Workspace domain themagiccoffin.com until the product name is bought | Chat, 17 Oct 2026, 12:47 |
| "Ghemotoc" is a working name until the name and domain are bought; product name, domain and emails are settings, never hard-coded (replaces the 16 Oct wording that the app is called Ghemotoc) | Chat, 17 Oct 2026, 12:47 |
| Contact and support email is hello@themagiccoffin.com until the product's own domain is bought | Chat, 17 Oct 2026, 12:50 |
| The working site is ghemotoc.themagiccoffin.com once hosting is chosen, until the product's own domain is bought | Chat, 17 Oct 2026, 12:50 |
| The web app is hosted on Cloudflare Pages (free plan for March); Cloudflare already runs Robert's DNS | Chat, 17 Oct 2026, 12:57 |
| Admins make invite links for the March test in the admin site (S1-E11-17), with the same logic as class-space invites (one shared invites table) | Chat, 17 Oct 2026, 13:01 |
| Node.js 24 LTS everywhere (repository, CI and Cloudflare) | Chat, 17 Oct 2026, 13:18 |
| Staff can build landing pages for contests and campaigns, run contests, and book sponsors into ad slots; the ad network fills unbooked slots automatically (stories S1-E11-14, S1-E11-15, S1-E12-05; their details are proposals until confirmed) | Chat, 17 Oct 2026, 11:06 |
| Story issues (Q39): a story issue template plus a "Sync story issues" workflow, started by hand, that creates one issue per Stage 1 story still missing one; Claude Code doesn't create the issues from a session | Claude Code session S1-E1-01, 17 Oct 2026 |
| The brand-name check ignores letter case: any spelling of the product name, site domain, contact addresses or handle fails CI outside `src/config/brand.ts` and the locale files | Claude Code session S1-E1-01, 17 Oct 2026 |
| When a `VITE_BRAND_*` variable is missing, `src/config/brand.ts` uses today's values, so builds work without setting variables in Cloudflare | Claude Code session S1-E1-01, 17 Oct 2026 |
| The production release workflow covers the web app only; how migrations reach the production database is decided when the production Supabase project exists | Claude Code session S1-E1-01, 17 Oct 2026 |
| S1-E1-02 creates minimal `profiles` (user ID and age columns) and `staff_roles` tables, so the account gate and the seed personas work now; S1-E2-01 and S1-E2-07a add the rest | Claude Code session, epic S1-E1 plan, 17 Oct 2026 |
| The seed personas share one documented test password, the same locally and on staging (synthetic accounts only) | Claude Code session, epic S1-E1 plan, 17 Oct 2026 |
| The /design components page is reachable locally and on staging only, never in production | Claude Code session, epic S1-E1 plan, 17 Oct 2026 |
| Night mode colours are derived from the board colours and shown on the /design page | Claude Code session (S1-E1-03), 17 Oct 2026 |
| The focus ring is plum on light backgrounds and gold on dark ones | Claude Code session (S1-E1-03), 17 Oct 2026 |
| Night mode follows the device setting by default, with a Device / Light / Night drop-down in the footer and no switch in the top bar | Claude Code session (S1-E1-03), 17 Oct 2026 |
| Audit log entries are kept for 3 years; the purge job comes with the retention jobs story (S1-E13-04), and until then the log stays append-only for every role | Claude Code session (S1-E1-03), 17 Oct 2026, 17:41 |
| The branch ruleset on `main` (a pull request and the three CI checks) stays as created but unenforced: GitHub doesn't enforce rulesets on a private repository on the Free plan. The no-push-to-main rule in CLAUDE.md and green CI before each merge cover it for now | Claude Code session (S1-E1-QA), 17 Oct 2026 |
| Epic check reports live in `docs/epic-reports/<epic>.md` | Claude Code session, epic S1-E1 plan, 17 Oct 2026 |
| Legal texts in Romanian for March: Claude Code drafts a Romanian version of each legal text, clearly marked as a draft not checked by a lawyer; Robert reads all new Romanian text before release (Q1 of the epic S1-E2 plan) | Chat, 17 Oct 2026, 19:43 |
| The Legal centre shows the drafts' [placeholders] and [OPEN] notes as they are, highlighted; it leaves out the "Drafting notes for the lawyer" and "Open points" sections; it shows the proposed sections; and it marks inline, without changing any words, the lines that apply only after the invited test (Q2) | Chat, 17 Oct 2026, 19:43 |
| Sign-up and password changes check new passwords against Have I Been Pwned's free range service through our own Cloudflare Pages Function (only the first 5 characters of the password's SHA-1 hash leave us, never the password or the visitor's IP), with a one-line ADR (Q3) | Chat, 17 Oct 2026, 19:43 |
| Claude Code drafts the English and Romanian username swearword lists; Robert checks the Romanian one (Q4) | Chat, 17 Oct 2026, 19:43 |
| The product and company names that usernames may not imitate are stored in the `settings` table by one dedicated migration, the back end's one brand place (allowed by the brand-value check). Replaces, for these names only, the S1-E1-02 note that `settings` holds no brand values (Q5) | Chat, 17 Oct 2026, 19:43 |
| The country at sign-up comes as a token signed by our Cloudflare Pages Function and checked by the database (Q6a). While `invite_only` and `adults_only` are both on, a valid invite admits someone from any country, including unknown, VPN or Tor connections; the market rules (closed markets, Australia under-16s) apply once sign-up opens to the public (Q6b, Q6c) | Chat, 17 Oct 2026, 19:43 |
| The rest of the epic S1-E2 plan's defaults are accepted (Q7 to Q15): an important (material) change is marked in each legal version's migration and confirmed in its pull request; Settings starts with S1-E2-04; invite test codes live in `supabase/seed.sql` only; the March refusal copy as drafted; usernames and pen names can each change once every 30 days (a setting), with old names kept in the audit log; sign-in pauses for 15 minutes after 5 wrong tries (settings), cleared by a password reset; signed-in devices are read from Supabase's own `auth.sessions` (never the IP) instead of a `user_sessions` copy; an account with a staff role is read-only as a member, the first owner is created by one SQL line, and a small `/staff/roles` page manages roles until the admin shell exists; the "not open yet" page keeps no email | Chat, 17 Oct 2026, 19:43 |
| The authorities' and the privacy contact address are hello@themagiccoffin.com until the company exists (Q16) | Chat, 17 Oct 2026, 19:43 |
| The email provider is Brevo (EU), with a data processing agreement; Robert sets it up before the first real invite (Q17; closes Q49 for email) | Chat, 17 Oct 2026, 19:43 |
| Factual correction in the privacy notice draft: the database is our own Supabase project in the EU (Ireland), the website is hosted on Cloudflare Pages and the email provider is Brevo (EU); Lovable and Frankfurt are dropped. A factual correction, not a change to legal wording | Chat, 17 Oct 2026, 19:43 |
| Each legal version is its own migration, generated from `content/legal/` by `scripts/build-legal-migration.ts`; brand values are stored as `{{tokens}}` filled in from `src/config/brand.ts`, and published versions are never edited | Claude Code session (S1-E14-01), 17 Oct 2026 |
| The Legal centre's documents are links with their own web addresses (`/legal/terms`, `/legal/privacy`, `/legal/guidelines`) instead of the board's tabs, so sign-up, Settings and the footer can link to one document | Claude Code session (S1-E14-01), 17 Oct 2026 |
| "We've updated our Terms" is a panel at the top of every page, not a blocking dialog: reading never stops, and the database refuses posting until the new version is accepted | Claude Code session (S1-E14-01), 17 Oct 2026 |
| Sign-up is checked in one trigger on `auth.users` that creates the profile and consents or refuses everything (ADR 0002) | Claude Code session (S1-E2-01), 17 Oct 2026 |
| Email links carry a one-time token hash and land on `/auth/confirm`, so a confirmation or log-in link works on any device | Claude Code session (S1-E2-01), 17 Oct 2026 |
| Forms use zod rules with plain React state; react-hook-form (architecture 1.5) isn't added while the forms stay this small, because the shared fields don't pass refs | Claude Code session (S1-E2-01), 17 Oct 2026 |
| While the age check isn't part of sign-up (`adults_only` on), the sign-up screen leaves out the "Age check" step and the Yoti and parent lines, and its handwritten tag says the test is for invited writers | Claude Code session (S1-E2-01), 17 Oct 2026 |
| No picture uploads in the investor demo (January 2027): S1-E3-01 ships drawn covers and the automatic cover (S1-E3-13 pulled into the epic); the upload path is the contract only (the `picture_uploads` flag, off; the covers bucket and its rules; the columns) and the upload screen is its own story once S1-E10-05 exists | Chat, 23 Oct 2026 (Lane A) |
| S1-E3-02 is built as 02a (editor, autosave, toolbar) and 02b (offline keep, paste cleaning, conflict warning); S1-E4-01 as 01a (reader, navigation, phone width) and 01b (performance budget, 200% zoom, banner slot below the text); one pull request per half | Chat, 23 Oct 2026 (Lane A) |
| Readers reach stories and chapters only through `get_story_page()` and `get_chapter()`, which apply `rating_allows()` with `age_band()` in the database; no direct table access for readers (ADR 0004) | Chat, 23 Oct 2026 (Lane A, Q2) |
| The rating wording on canvas 4.2 is used as written, with a code comment and this line saying it is a proposal pending the lawyer (L14) | Chat, 23 Oct 2026 (Lane A) |
| The teaser for signed-out visitors is 600 words, as the seeded setting `teaser_length` | Chat, 23 Oct 2026 (Lane A) |
| Automatic covers: the story page and the writer's own screens always show the design taken from the story's ID; only a list moves a clashing card, to a second design also taken from the ID (the S1-E3-13 proposal, accepted) | Chat, 23 Oct 2026 (Lane A, Q4) |
| For March only, while `adults_only` is on, being 18 or over by birth year is enough to read an 18+ story; once the flag is off the Yoti "18 or over" result is required. A proposal pending the lawyer (added to the lawyer list by S1-E3-06) | Chat, 23 Oct 2026 (Lane A, Q5) |
| Signed-out visitors count as under 16: they get the All ages and 13+ teasers and only the title of 16+ and 18+ stories. A proposal; L14 stays on the lawyer list | Chat, 23 Oct 2026 (Lane A, Q6) |
| The link preview picture is Q13's fallback B (a plain picture in the cover's colour, the title beside it as text), because drawing the cover with satori and resvg needs 30 to 50 ms of processor time a picture and Cloudflare's free plan allows 10 ms a request (measured 24 Oct 2026) | Chat, 23 Oct 2026 (Q13: "try A, fall back to B if it doesn't fit"); S1-E4-04 |
| Scheduled chapters use Europe/Bucharest for everyone in March; editing a published chapter autosaves to the draft and readers see the change only after "Update chapter", which sets "Edited on"; the comments switch is stored by S1-E3-05 and enforced by S1-E6-01; the undisclosed-AI label needs 3 confirmed reports (a setting); the 2-second reader target is proved by emulation on the production build (Robert also checks on his phone) | Chat, 23 Oct 2026 (Lane A, Q7 to Q12) |
| A "Your writing" page (`/write`, the lower half of board 4.1) and a story page shell (3.4) are built inside S1-E3-01 and S1-E3-05, because the demo needs a way in and something to read | Chat, 23 Oct 2026 (Lane A, Q15) |
| Lane A builds the first doodle component and the DoD's doodle-overlap check (`e2e/support/doodles.ts`); Lane B recolours the doodles through tokens, and Lane A takes the token names from its pull request when it lands | Chat, 23 Oct 2026 |

## Notes from the CTO pack (decisions applied to the stories)

> **Decisions made after this was written (15 October 2026, chat).** These override any "OPEN" marker below:
> - **17 Oct 2026, 11:45:** three new staff stories at Robert's request: S1-E11-14 landing pages, S1-E11-15 contests and S1-E12-05 ad slot booking (sponsors booked by hand, the ad network fills the rest automatically). Legal notes from research G6. Eleven citation fixes from the primary-source check (research H3).
> - 17 Oct 2026, 11:30: fact-check of every story (see changes list). Every "decided" now matches the master plan's Decisions made tab or is relabelled as a proposal or OPEN; numbers without a source are marked "(proposal)"; legal citations the research files don't cover are marked "(to verify)" and vendor facts "(check before relying on it)". The full list is in `changes.md` and `to-verify.md` next to this file.
> - **17 Oct 2026, 11:20 (Robert, chat):** our own Supabase project in the EU (West EU, Ireland, eu-west-1) from day one, and Claude Code builds first. This replaces Q37 ("Lovable's database first, then our own Supabase"), so S1-E1-06 (the move) is no longer needed (Won't) and the March MVP drops to 49 stories, about 552 hours. Research H2 (17 Oct 2026): new Lovable projects use TanStack Start, not React and Vite, and Lovable can't import an existing repository, so Lovable's role is **OPEN** pending a two-screen trial.
> - **17 Oct 2026, 10:23 to 10:36 (Robert, chat):** Eyebrows in Cutive and handwriting in Shadows Into Light Two (Definition of Done). Headings stay Bricolage Grotesque and body text stays Inter (a switch to Playfair Display and Barlow was reversed at 10:43). The decks keep The Magic Coffin branding. 16 and 17-year-olds accept the Terms without a parent (Civil Code art. 41 risk on the lawyer list). Writers get no share of ad or sponsor income. Minors in fiction: abuse may be a theme and 16 and 17-year-old characters can have relationships, but no explicit or eroticised description of sexual activity involving anyone under 18, real or fictional; such stories are rated 16+ or 18+ with a content note (S1-E10). Draft legal texts for all Legal centre documents are in project knowledge under legal/.
> - **17 Oct 2026, 08:30 (Robert, chat and canvas comments):** ads show on every public page, but never too many: neutral, non-personalised ads, with a big banner on Discover, a portrait ad on Search and ads in forums (in a thread: below the reply box, plus a side ad on desktop). The per-page limits are a proposal in S1-E12-01 for Robert to confirm. Under-13 sign-up says "You can try again once you turn 13" and nothing is kept; the 24-hour device block is removed (S1-E2-02). Safety contacts research G4 has landed: Telefonul Copilului 116 111 now runs Monday to Friday 10:00 to 20:00 (no longer 24/7), Romania has no confirmed youth crisis line, and the UK's Papyrus HOPELINE247 closed in September 2026 (S1-E10-13). Design rules: one drop-down style everywhere (Definition of Done).
> - **17 Oct 2026, morning (Robert, chat):** March is web only, apps after (34o, replaces desktop first). Hours a week or the test date are decided in November; the stories keep the best functional MVP (34m). Staff single sign-on is Google Workspace (34n). Adults can read an under-16 space only if its owner made it public to everybody; a member who turns 16 stays in groups joined before but can't start or join under-16 groups (34p). Class spaces are invitation-based with any age mix, never split at 16. Never any advertising of any kind in class spaces. Schools own only the data the teacher provides; the teacher grades, the final work belongs to the pupil. State high schools free, universities and private schools pay a licence, paid extras for every school shown clearly. Support tickets live inside the admin site, with a ready-made external helpdesk behind it through its API (S1-E11-13).
> - **16 Oct 2026, late evening, after 22:55 (Robert's answers to the 71 open questions; logged in the master plan; "Q" numbers with this date refer to that list):** consent is the legal basis, so a parent's or guardian's consent for under-16s is on from launch (S1-E2-03 is now Must). Age is the year of birth, then the month when the year leaves the age unclear at 13 or 16. Ratings All ages, 13+, 16+ and 18+, each hidden from anyone younger, replace the Mature label. Picture uploads are on from launch: every picture is checked on upload by Sightengine (nudity, gore) and Arachnid Shield (known child abuse images), and a flagged picture waits for an in-house moderator (S1-E10-05). Moderation is in-house and report-based: no outside moderation vendors and no hold before publishing. One web form takes every report, including authority removal orders: it is our TCO contact point, in English and Romanian, and it alerts the on-call founder; the founding team rotates on call; one-hour removal is mandatory (Regulation (EU) 2021/784, art. 3(3)) and the first order comes with 12 hours' notice. Country comes from the connection and is never asked. Usernames take any character but block swearwords (English and Romanian lists, moderators can approve false hits), staff look-alikes and confusable characters, and are normalised for web addresses. 16 and 17-year-olds choose whether adults can message them (off by default); under-16s and adults never. Staff log in with company SSO and never edit a writer's words. Word (.docx) exports from the first version, no EPUB; 13 to 15-year-olds download their own data and parents are checked against the consent record. Anyone can create a space; under-16 spaces take only under-16s and 16+ spaces only 16 and over, class spaces excepted. Class spaces lock at the end of the academic year and members keep reading access for life; no ads, sponsored items or sponsor credits in them. Certificates are co-signed by Ghemotoc and the leading teacher. Undisclosed AI: a label and a warning after several reports confirmed as true. No emoji auto-delete. Forum categories pinned, threads by latest activity; Discover mixes newest, popular and more from the start. Deleted accounts: forum posts stay as "Deleted user", stories are deleted. IP addresses scrambled and kept 30 days. Full chapters on the web for signed-in readers until the apps exist, with right-click and copy off and writers told; search engines index title, blurb and author only; the apps use each platform's screen-capture protection. Lovable's database first, then our own Supabase (replaced on 17 Oct 2026, 11:20: own Supabase in the EU from day one); EU hosting; GitHub Issues; a new website CMS built from scratch on its own database; a ready-made EU helpdesk (S1-E14-04). No new-chat limit for new accounts. "Ad" marks ad-network ads (only vendors that don't personalise, for everyone) and "Sponsored" marks direct sponsors. Language drop-down in the top bar and the footer. No journalism or articles at launch: fiction, poetry and nonfiction essays. Romanian public-domain classics are seeded. New design rule: every story shelf is one horizontally scrollable line of at most 20 items, with a "View more" card that opens a See all page (S1-E5-09). Robert builds without a programmer, so the March slice is re-cut (section 1.13). New stories: S1-E1-06, S1-E5-09, S1-E12-04 and S1-E14-04. Legal points are collected in section 6, "For the lawyer before March".
> - **16 Oct 2026, late evening (Robert, chat):** every account gets an automatic, permanent user ID, and every story and everything else a person makes is linked to it (section 1.6). Staff can open every story in the admin site (what they may change is OPEN, section 1.8.5) and download any user's stories as Word or PDF for a data request (S1-E11-09). The website home page now reads "Write stories. Get read.", says "Yoti does the age check. We only get the result, never a photo." and has a new question, "What is a class space?"; its copy is edited in the admin site (S1-E11-06). Design rules: side-scrolling rows fade out on the cut-off side only (a true fade, 22:07 fix), doodles and icons are always SVG files and short explanations use one tooltip pattern.
> - **16 Oct 2026, evening (Robert, chat and canvas):** the app is called **Ghemotoc** ("An app by The Magic Coffin"); under the earlier rule that the website uses the .com and handles are the bare name, that means ghemotoc.com and @ghemotoc (trademark and domain availability still to be checked). Covers: 16 approved drawn backgrounds (9 plain, 7 patterns) recolourable within the palette; a story without its own cover gets one automatically (S1-E3-13); the full title must fit on every cover at every size. Doodles (hand-drawn, fine-ink) replace ordinary icons with listed exceptions, never on the chapter reader, sharing, reporting or staff screens; seasonal doodles switch by date (S1-E5-07). Teacher badge: adults only, optional, in setup, by school email or proof that staff check and then delete (S1-E2-11); only Teacher badge accounts see the Class space option.
> - **Minimum age to join is 13.** The legal basis was decided on 16 Oct 2026 (late evening): consent, so 13 to 15-year-olds need a parent's or guardian's consent (GDPR Art 8(1); Romania has not set a lower age).
> - **March 2027 is web only** (decided 17 Oct 2026, 34o; replaces desktop first). Desktop (Tauri) and phone apps come after; the phone wrapper is decided with a programmer later.
> - **Not applying to Start-Up Nation.** The company is proposed for about 1 February 2027 (proposal; whether it is a Romanian SRL or a Swedish AB, and when, is **OPEN**, Q55 of 16 Oct), so company-owned accounts (domain, GitHub, Supabase, code signing) wait until then.
> - **Onboarding asks for year of birth; age is verified with Yoti (16 Oct 2026).** No age bands.
> - **16 Oct 2026, afternoon (chat):** sign-up and log-in with Google, Apple and Microsoft (the Yoti check still applies); writers choose per story whether it can be read on the web and in the app or in the app only, and the web shows an "only in the app" notice; the apps let readers use any font on their device; chapters can hold pictures, drawings and click-to-load music and video; launch in English and Romanian for English-speaking countries and Romania, each language opening only when moderators for it exist, and the story language is chosen at creation. Country from the connection is a proposal (S1-E2-10; decided later that evening, Q20). Markets: **OPEN** whether all English-speaking countries open with Romania or Romania comes first (see section 1.2).

Prepared 15 October 2026 by the interim CTO (Claude) for Robert-Marian Stănescu. Sources: the master plan export (files 01 to 07). Where the plan has decided something, this pack follows it. Where the plan leaves something open, it is marked **OPEN** and listed in section 5. Legal points are an engineer's reading of the plan's own research, not legal advice; a Romanian lawyer signs off before launch.

**How to use this pack**

- Sections 1 and 2 go into the repository as `docs/architecture.md` and `docs/definition-of-done.md`, and the short versions go into `CLAUDE.md` (template in section 4).
- Section 3 is the backlog. Each stage also has its own file (`stage-1-stories.md` to `stage-7-stories.md`). Paste one story at a time into Claude Code.
- Section 1.7 is the build map: what every screen needs from the back end, what can be mocked and the order to build in. Section 1.8 describes the admin site and the website CMS.
- Section 5 lists the decisions only you can make. Several block the build, so answer those first.
- Section 6 lists every legal point for the lawyer before March.

## Snapshot of the master plan's Decisions made tab (17 Oct 2026)

These are settled unless you reopen them. Q numbers point to your answers file; "Chat" means our conversation on 14 October 2026.

## Shape of the business

| Decision | Source |
| --- | --- |
| Seven stages: platform, newsroom, freelancers, publishers, imprint and newspapers, academia and press, NGO | Chat |
| The Magic Coffin is the group brand (house of brands). Consulting sits at consulting.themagiccoffin.com, the publishing house is The Magic Coffin, journals sit under The Magic Coffin Press. The app is called Ghemotoc | Chat |
| The goal is generational wealth (replaced on 16 Oct by the four-founder equal split below, which says it replaces this goal) | Chat |
| Spring 2027 runs quietly, at a loss, funded from your own money | Chat |
| The Library of Alexandria sits in a separate NGO; NGO sponsors don't sit on the company board | Q63–Q65 |
| Physical schools are 15–20 years away | Q67 |
| The platform follows Romanian and EU law (the EU Digital Services Act and GDPR apply to every EU user) | Q96, Chat |
| You are CEO and COO at the start; one Romanian company first, split later (refined 17 Oct: Romania is the first market; which country the company is registered in, Romania or Sweden, is still open, Q55) | Q27, Q103, Chat |
| The NGO may get its own name, separate from The Magic Coffin | Q112, Chat |
| Plagiarism scanning only for work the imprint publishes; readers can report copies of published works | Doc comments |
| The company is LGBTQIA+ and feminist | Chat, 16 Oct |
| Founding team plan: you, a tech co-founder (reaching out to friends in tech), a community manager and a graphic designer | Chat, 16 Oct |
| Majority control (at most 40% ever sold) is stated in the master deck only, not in the investor deck | Chat, 16 Oct |
| The 40% cap applies to investors only, not to co-founders' shares | Chat, 16 Oct |
| Pre-seed covers founding-team salaries for one to two years plus running costs and licences; VC or angel funding decided after that | Chat, 16 Oct |
| Four founders split the shares equally, 25% each. The CEO (Robert) has a casting vote on deadlocks. Everyone vests over 4 years. Replaces 'keep majority control' and the generational-wealth goal | Chat, 16 Oct |
| Pre-seed sized for founders earning about EUR 2,000 net a month each, not the minimum wage; ask for the most investors will give. All money shown in euros | Chat, 16 Oct |
| App name shortlist: Graia, Taifas, Rapsod, Scrivo and Condei (Romanian-sounding but neutral, Latin roots welcome). Graia was the top pick but is ruled out: GRAIA, an AI company in Europe, already uses the name. Next candidates being screened: Dor, Sera, Zori, Pluvia, Verdia, Estiva and Dor&Co. The final name is still OPEN until trademark screening (replaced on 16 Oct by Ghemotoc, row below) | Chat, 16 Oct |
| Social handles must be the bare app name on every platform (no 'app' or other add-ons). The website uses the .com domain | Chat, 16 Oct |
| The app's name is Ghemotoc. This closes the name shortlist above; under the handle and domain rule that means @ghemotoc everywhere and ghemotoc.com | Chat, 16 Oct |

## Product

| Decision | Source |
| --- | --- |
| Stage 1 covers web, iOS, Android and desktop, plus an admin site for payments and top-ups. Two prototype iterations come before it | Chat |
| It is a social platform: anyone writes, anyone reads, one account type | Chat |
| Readers and writers are always free | Brief |
| Forums are part of Stage 1: no auto-archive, private messages, and user-created spaces anyone can read (owners can make posting members-only) (refined on 16 Oct by Q26 below: spaces are split at 16 except class spaces; who may read under-16 spaces settled on 17 Oct, 34p row below) | Chat |
| Journalism is a content category from Stage 1; the newsroom with a personalised feed comes in Stage 2 (replaced on 16 Oct by Q52: no journalism or articles at launch) | Chat |
| A 1–2 page web teaser before the app | Q1 |
| Pen name optional | Brief |
| Downvotes are private and used for moderation only | Q22, Chat |
| Build with Claude Code, then Lovable; real users by March 2027 | Chat |
| Launch in Romania with high-school and university writers (replaced on 16 Oct by the English and Romanian launch below) | Q11 |
| Minimum age to join is 13. The legal basis for processing under-16s' data is still open (consent brings in parental consent under GDPR Art. 8; the age of digital consent in Romania is already 16 today) (settled on 16 Oct by Q15: consent, so parental consent for under-16s from launch) | Chat, 15 Oct |
| March 2027 build: desktop app first, phone apps after the March test (fixes the capacity problem in the CTO pack) (reopened on 16 Oct: the re-cut March MVP proposes web only, desktop after March; replaced on 17 Oct by web only, 34o row below) | Chat, 15 Oct |
| Onboarding asks for year of birth, then Yoti verifies the user's age. No age bands anywhere. Replaces the earlier 'age band, not birth date' approach; minimum age stays 13 | Chat, 16 Oct |
| Launch in English and Romanian, for English-speaking countries (UK, Ireland, US, Canada, Australia, New Zealand, Singapore and others) and Romania. A language opens only when moderators who read it are on the rota; writers choose each story's language when they create it. Replaces 'Launch in Romania' (Q11) | Chat, 16 Oct |
| Sign up and log in with email, Google, Apple or Microsoft (Outlook), plus passkeys. Google, Apple and Microsoft don't confirm age, so year of birth and the Yoti check still apply | Chat, 16 Oct |
| Writers choose per story where it can be read: on the web and in the app (default), or in the app only. On the web an app-only story shows its cover, blurb and chapter list, and a notice that the writer chose the app for more privacy and control | Chat, 16 Oct |
| In the downloaded apps readers can use any font installed on their device; in the browser they choose from our fonts | Chat, 16 Oct |
| Chapters can include pictures, simple drawings, and music and video from an allowed list (Spotify, Apple Music, YouTube, Vimeo, Loom to confirm; Loom confirmed on 16 Oct, Q22). Nothing loads from those services until the reader presses play | Chat, 16 Oct |
| Every screen uses the floating top bar (Home, Discover, Library, Forums, Messages) instead of a side menu; the Discover dashboard design is approved | Chat, 16 Oct |
| Private class spaces and contest certificates go into the backlog (S1-E8-11, S1-E8-12); schools can add their logo to certificates with their permission | Canvas comments, 16 Oct |
| All English-speaking countries open at the same time as Romania, at launch, not one at a time. The moderator rule still applies, so English and Romanian moderators must be on the rota from day one | Chat, 16 Oct |
| The public website gets its own database, separate from the app | Chat, 16 Oct |
| Home and Discover are separate screens for now, and Discover is the main one. When the recommendations improve, they merge into one overarching dashboard | Chat, 16 Oct |
| The March 2027 target is 20 writers publishing, from any open market, not only Romanian students | Chat, 16 Oct |
| Not pursuing the 2027 county school-contest calendars (CPEEJ) for now | Chat, 16 Oct |
| Adults can't message under-18s by default. Under-16s can't message adults at all, not even teachers (replaced on 16 Oct by Q6 and Q13 below: never between under-16s and adults; for 16 and 17-year-olds off by default and only the teen can turn it on) | Chat, 16 Oct |
| The founding team moderates in both English and Romanian from day one, which meets the rule that a language opens only with moderators who read it | Chat, 16 Oct |
| The footer and certificate line reads "An app by The Magic Coffin" (not "A house of brands by The Magic Coffin") | Canvas comment, 16 Oct |
| Drawn covers use the 16 approved backgrounds: 9 plain colours and 7 patterns | Chat, 16 Oct |
| Doodles in the fine ink and colour style decorate the website, empty states and certificates, including seasonal ones (100 in total) | Chat, 16 Oct |
| Doodle icons replace ordinary icons, except arrows, controls and status icons that must stay clear for accessibility. No doodles or doodle icons at all on the chapter reader, sharing, reporting and staff screens. Elsewhere a few per screen, in mixed sizes | Chat and canvas comments, 16 Oct |
| The Discover greeting doodle and the Search tags doodle change with the seasons and occasions | Canvas comments, 16 Oct |
| Stories without their own cover get one of the 16 designs automatically, always the same for that story and different from the cards next to it. The full title always fits on every cover | Canvas comment and chat, 16 Oct |
| Rows that scroll sideways fade out where cards are cut off, on one side only, never both (a true fade: card, outline and shadow fade together) | Canvas comment, 16 Oct |
| Teacher status is part of setup: a school email address or proof of teaching, checked by staff. Only accounts with a Teacher badge see the Class space option | Canvas comment, 16 Oct |
| Website headline is "Write stories. Get read." with the lead line "Post your stories, poems and essays, one chapter at a time, and find the people who want to read them." The age line reads "Yoti does the age check. We only get the result, never a photo." "Everyone is welcome" is removed | Canvas comments, 16 Oct |
| Staff can update the website's featured content and copy from the admin site, roughly monthly | Canvas comment, 16 Oct |
| Every account gets a user ID automatically when it is set up, and every story is linked to it | Chat, 16 Oct |
| The admin site can open every story. Staff may hide or restrict a story, fix its settings and details and remove unlawful parts, but never edit the writer's words (refined by Q14, 16 Oct) | Chat, 16 Oct |
| For a data request, staff can download every story of a user as a Word document or PDF from the admin site | Chat, 16 Oct |
| Doodles and doodle icons are always SVG files, so quality stays sharp | Canvas comment, 16 Oct |
| Short explanations (such as why we ask for year of birth) sit in a note people hover over or tap to read | Canvas comment, 16 Oct |
| Romanian versions of the design screens and the four decks are separate copies, made only after the English copy is final | Chat, 16 Oct |
| "In the app only" also shows as a label on the cover wherever stories appear on the website; not inside the apps | Q4 and canvas comment, 16 Oct |
| The sign-up screen uses the website headline "Write stories. Get read." | Q5, 16 Oct |
| One messaging line everywhere: off by default for 16 and 17-year-olds, never possible between under-16s and adults | Q6, 16 Oct |
| "Ad" labels ads from an ad network; "Sponsored" labels placements paid for directly by our sponsors (for example Cărturești or a ministry) | Q7, 16 Oct |
| Consent wording says "parent or guardian" | Q8, 16 Oct |
| Copy protection is described as "makes copying harder", never as blocking screenshots | Q9, 16 Oct |
| Example contest copy on the website names no announcement date | Q10, 16 Oct |
| Language picker is a drop-down, in the top bar and in the footer | Q11, 16 Oct |
| Palette: red or orange accents and blue for the waves cover, open to change for the final version | Q12, 16 Oct |
| Legal basis for processing personal data is consent (lawyer to review before March) | Q15, 16 Oct |
| Sign-up asks the year of birth; when that year leaves the age unclear at a limit (13 or 16), it also asks the month and works the age out from both | Q16, 16 Oct |
| Stories carry movie-style age ratings instead of a single Mature label: All ages, 13+, 16+ and 18+, each hidden from anyone younger | Q17, 16 Oct |
| Picture uploads work from launch | Q18, 16 Oct |
| Australia stays closed to under-16s until a lawyer says otherwise | Q19, 16 Oct |
| Country comes from the connection at sign-up; people are not asked | Q20, 16 Oct |
| Usernames may use any character, but names with swearwords, names copying staff accounts and confusable look-alike characters are blocked | Q21, 16 Oct |
| The embeds list includes Loom | Q22, 16 Oct |
| School contest certificates carry two signatures: Ghemotoc and the teacher leading the contest | Q23 and Q71, 16 Oct |
| Undisclosed AI writing: after several truthful reports the work is labelled and the writer warned | Q24, 16 Oct |
| Emoji-only comments are not deleted automatically | Q25, 16 Oct |
| Anyone can create a space. Spaces made by under-16s admit only under-16s, spaces made by people 16 and over admit only people 16 and over; class spaces are the exception and include the teacher (refined on 17 Oct: adults read an under-16 space only if its owner made it public; class spaces are by invitation and mix ages, rows below) | Q26, 16 Oct |
| 13 to 15-year-olds can download their own data from their account; a parent asking for a child's data is checked against the consent record | Q27, 16 Oct |
| Data exports are Word (.docx) files from the first version, so writers can edit them or send them to an agent | Q28 and Q29, 16 Oct |
| Staff log in to the admin site with company single sign-on (Google Workspace, decided 17 Oct); they may also keep a personal account | Q30, 16 Oct |
| Website copy goes live without a second approver for now | Q31, 16 Oct |
| Until the apps exist, signed-in readers read full chapters in the browser and writers are told so. On the web, right-click and copy are turned off; screenshots still work | Q35, 16 Oct |
| Search engines may index only a story's title, blurb and author | Q36, 16 Oct |
| Start on Lovable's database, then move to a company-owned Supabase project; hosting in the EU; user stories tracked in GitHub Issues | Q37 to Q39, 16 Oct |
| In the apps, each platform's own protection blanks the screen during screenshots and screen recordings | Q41, 16 Oct |
| Moderation is done by in-house moderators acting on reports; no outside moderation tools and no hold before publishing | Q42 and Q43, 16 Oct |
| Forums sort by latest activity, with the starting categories pinned. Discovery mixes newest, popular and most interacted-with from the start | Q45 and Q46, 16 Oct |
| When an account is deleted, its forum posts stay as "Deleted user" and its stories are deleted | Q47, 16 Oct |
| IP addresses are stored scrambled and kept for 30 days | Q48, 16 Oct |
| Minors get quiet hours and no marketing email; follower lists are visible to the writer only; banners only on spaces | Q50, 16 Oct |
| Seed the reader side with free public-domain Romanian classics | Q51, 16 Oct |
| Launch categories are fiction, poetry and nonfiction essays. No journalism or articles at launch, and copy that mentions them comes out | Q52, 16 Oct |
| The website CMS is built new, on its own database, linked neatly with the front end | Q54, 16 Oct |
| Support uses a ready-made helpdesk hosted in the EU, with a Contact us form (refined on 17 Oct: tickets inside the admin site, row below) | Q60, 16 Oct |
| No limit on how many new chats a new account can start (replaces the 10 a day in the first 7 days) | Q61, 16 Oct |
| Creator posts marked #ad may reach any age | Q64, 16 Oct |
| School pilots can run as a writing club, the First Chapter contest or both; no school inspectorate involvement until autumn 2027 | Q66 and Q67, 16 Oct |
| At the end of the academic year a class space locks: no new posts, but members can read it for as long as they have an account | Q69, 16 Oct |
| Never any advertising of any kind inside class spaces: no ads, sponsored items or sponsor credits (confirmed again 17 Oct) | Q70, 16 Oct |
| Decks are also made as Google Slides, so PDFs can be exported from there | Q2, 16 Oct |
| A 16 or 17-year-old chooses for themselves whether adults can message them (off by default) | Q13, chat 16 Oct |
| Only ad-network vendors that don't personalise ads are used, for everyone, so the "No tracking ads" promise holds | Chat, 16 Oct |
| The founding team rotates the on-call duty for one-hour terrorist content removal orders | Chat, 16 Oct |
| One web form takes all reports, including removal orders from authorities (our published contact point) | Chat, 16 Oct |
| Uploaded pictures are checked automatically: Sightengine flags nudity and Arachnid Shield matches known child abuse images; flagged pictures wait for an in-house moderator | Chat, 16 Oct |
| Every shelf of stories (for example Romanian classics or world classics) is one scrollable line of at most 20; when there are more, "View more" opens a page with all of them | Chat, 16 Oct |
| March 2027 is web only; the desktop and phone apps come after (replaces desktop first, 15 Oct) | Chat, 17 Oct (34o) |
| The user stories hold the best functional MVP; hours a week or the test date are decided in November | Chat, 17 Oct (34m) |
| The company uses Google Workspace, which is also the staff single sign-on | Chat, 17 Oct (34n) |
| Adults can read an under-16 space only if its owner has made it public to everybody. A member who turns 16 can stay in groups they joined before, but can't start or join under-16 groups | Chat, 17 Oct (34p) |
| Class spaces are by invitation and follow the people in the room: ages can be mixed and classes are never split at 16 | Chat, 17 Oct |
| Schools own only the data the teacher provides; the teacher grades assignments, but the final work belongs to the pupil | Chat, 17 Oct |
| State high schools use class spaces free; universities and private schools pay a licence; paid extras are open to every school and must be shown clearly | Chat, 17 Oct |
| Support tickets are handled inside the admin site, linked to a general support email address, following normal ticketing logic; the engine is a ready-made external helpdesk connected to our admin screens through its API (decided 17 Oct, cheapest suitable option to be chosen) | Chat, 17 Oct (refines Q60) |
| Ranks: New writer (first chapter), Writer (5 chapters), Storyteller (15 chapters or 30,000 words), Novelist (100,000 words). Given automatically from published chapters and words, never forum posts. Each rank has its own doodle sticker on the profile picture: pencil, quill and ink, open book with sparkles, crown | Canvas comment, 17 Oct |
| Uploaded covers: a tall cover first, then a square one (cropped from the tall cover with a movable square, or uploaded separately); we never add our title on top of an uploaded cover | Canvas comments, 17 Oct |
| Reports (and the reporter's name and email) are kept for 3 years after the report is closed, then deleted | Canvas comment, 17 Oct |
| Safety contacts (emergency number, children's helpline, abuse-reporting links) follow the account's country, and a support task checks them every month | Canvas comment, 17 Oct |
| Ads show on every public page, but never too many. They are neutral, non-personalised ads: a big banner on Discover, a portrait ad on Search, and ads in forums, including between forum replies. They never appear in class spaces, inside chapter text, full screen or as pop-ups. The exact limits per page are a proposal in S1-E12-01, waiting for Robert to confirm them. | Chat and canvas comments, 17 Oct |
| Under-13s who try to sign up see "We don't keep anything you typed. You can try again once you turn 13." Nothing they typed is kept, and there is no device or IP block. | Canvas comment, 17 Oct |
| Ad placements, refined: Library can show ads too. Side ads go on the forum thread, Forums and the app-only story page, as well as the portrait ad on Search. | Canvas comments, 17 Oct |
| In forum threads, the ad goes below the reply box rather than between replies (replaces "between messages" from earlier the same morning). | Canvas comment, 17 Oct |
| Brand type on the app and site: small eyebrow labels in Cutive, sentence case, no capitals; card headings in Playfair Display; body text in Barlow (replaces Inter); handwritten accents in Shadows Into Light Two (replaces Architects Daughter). Page titles stay in Bricolage Grotesque (whether page titles also move to Playfair is still to confirm). | Canvas comments and chat, 17 Oct |
| Playfair Display replaces Bricolage Grotesque everywhere on the app and site, including page titles and the wordmark. The decks keep The Magic Coffin branding and are not restyled. | Chat, 17 Oct, 10:23 |
| 16 and 17-year-olds sign up and accept the Terms without a parent's approval; only under-16s need a parent or guardian. Risk: Civil Code art. 41 (limited legal capacity from 14 to 18) may make the Terms and the licence hard to enforce against a 16 or 17-year-old. This is on the lawyer's list. | Chat, 17 Oct, 10:23 |
| Minors in fiction. Stories may tell of abuse, coercion and what they do to people. Characters aged 16 or 17 can have relationships, feelings and kisses, and a story can say that something happened between them. No explicit or eroticised description of sexual activity involving anyone under 18, real or fictional. Stories with these themes are rated 16+ or 18+ and carry a content note. | Chat, 17 Oct, 10:36 |
| Reversed: headings stay Bricolage Grotesque and body text stays Inter (replaces the Playfair Display and Barlow rows from earlier this morning). Cutive eyebrows and Shadows Into Light Two handwriting stay. | Chat, 17 Oct, 10:43 |

## Money

| Decision | Source |
| --- | --- |
| Ads: contextual banners only, no tracking ads, never interrupting reading; everyone, adults and minors, sees the same contextual banners (refined on 16 Oct by Q7: ad-network ads from vendors that don't personalise are also allowed, labelled "Ad"; direct sponsors are labelled "Sponsored"; see Product) | Chat |
| Sponsors are the early money | Chat |
| Credits (Upwork-style): freelancers pay to send quotes, publishers for offers, writers for newsletters beyond one free a month | Chat |
| A supporter tier only if it offers more than removing banners | Chat |
| Licensed third parties handle payments and payouts; the company never holds users' money | Q96, Q99 |
| Identity checks only where money changes hands | Q47, Q70 |
| Writers own their work and can publish anywhere | Q58, Q60 |
| The imprint takes 5% of TV and film adaptation rights. This is generous to authors; agents usually take 15–20% | Q56 |
| Not applying to Start-Up Nation (score capped at 80 of 100 for a software or publishing company; no budget yet for the qualified signature or co-financing) | Chat, 15 Oct |
| Supporter tier payouts work like Apple Music, not Spotify: writers are paid only from paying supporters' money, with no ad money and no free users in the pool. Each month's earnings are reported one month later, and writers can withdraw whenever they want. The exact formula (one shared pool or each supporter's money to the writers they read) is OPEN (settled on 16 Oct: formula B, next row) | Master deck comment, 16 Oct |
| Supporter pay formula B (user-centric): each supporter's writer share is split between the writers that supporter read. Of an example €5 a month, €2 goes to writers and €3 stays with the company (split basis after VAT and app store fees: OPEN) | Master deck comment, 16 Oct |
| Writer monetisation programme: only writers aged 18 or over, living in a country we can pay out to, with more than 1,000 followers, get paid. Minors are never paid out. The paid supporter tier comes much later, once this programme is ready | Master deck comment, 16 Oct |
| Budget approved for database backups, a penetration test before launch and app signing | Q53, 16 Oct |
| Robert funds the running costs himself, aiming for one year | Q56, 16 Oct |
| Company accounts (GitHub, Supabase, Apple, Google, domains) open in Robert's name now, with a written plan to transfer them to the company | Q34, 16 Oct |
| Writers get no share of ad or sponsor income. | Chat, 17 Oct, 10:23 |

## People and learning

| Decision | Source |
| --- | --- |
| Interns are paid employees with supervisors and an employee assistance programme | Q91–Q93 |
| SSES Path A: Finance for Start-ups comes after there is a product | Chat |
| The March MVP is built without a programmer | Q32, 16 Oct |
| Robert chooses his own co-founders and team, not through the SSES Execution programme | Q57, 16 Oct |
| A lawyer reviews everything before March; until then the goal is an MVP | Chat, 16 Oct |
| The website CMS is built before March and is in the March MVP. Website pages (starting with the home page) get their text only from the CMS, never from the language files. Replaces the 12:34 rule that the March home page copy sits in the locale files; the page itself still lives inside the web app (12:34) | Chat, 17 Oct 2026, 19:14 |
| In the CMS, staff pick the market (country) and the language of the page they edit; every market can have its own home page in each of its languages | Chat, 17 Oct 2026, 19:14 |
| CMS content has a "show from" date: it goes live at 00:00 Romanian time on that date (within a minute if today), and the current version stays up until then | Chat, 17 Oct 2026, 19:14 |
| The app's interface text (buttons, errors, labels) stays in the ro and en language files, but staff can edit it from the admin site so changing copy never needs an engineer. Edited text is stored in the database on top of the file text; the files stay the default and what CI checks | Chat, 17 Oct 2026, 19:16 |
| A visitor from a country with no page of its own sees the Romanian market's English page | Chat, 17 Oct 2026, 19:16 |
| Until the separate website database exists (its set-up is still OPEN), CMS content is stored in the app's own database behind one interface (a `WebsiteContentStore` contract), so moving it later swaps only the storage, not the editors | Chat, 17 Oct 2026, 19:16 |
| "Edit interface text" (S1-E11-18) is in the March MVP, straight after the CMS, and reuses the same editor | Chat, 17 Oct 2026, 19:19 |
| Most content not written by writers is admin-only to edit: website pages, questions and help, notice banners and interface text are edited and published by staff with the admin role (and the owner). Fits the 12:44 decision that content editors hold the admin role. Wording with legal weight (age, consent, privacy, reporting, messaging rules) is admin-only in any case | Chat, 17 Oct 2026, 19:19 |
| Interface text has one version per language, not per country, but the data model allows regional variants later (for example UK English and US or international English): languages are stored as BCP 47 locale codes (ro, en, later en-GB, en-US), not a fixed two-value list | Chat, 17 Oct 2026, 19:19 |
| March 2027 is a target, not a deadline: the MVP scope stays as planned and the test date moves if the work needs it. Replaces "hours a week or the test date are decided in November" (34m) | Chat, 17 Oct 2026, 19:22 |
| Robert reads all new Romanian text himself before release (he is a native speaker); the Definition of Done item "Romanian copy checked by a native speaker" means his read | Chat, 17 Oct 2026, 19:33 |
| S1-E1-05 (error, offline and maintenance states, with error tracking) is built now, before epic 3, instead of after March | Chat, 18 Oct 2026, 10:30 |
| Error tracking for March is our own simple error log in our own database (no outside service, no new processor); Sentry may come later | Chat, 18 Oct 2026, 10:46 |
| The shared-link teaser page (board 3.8, S1-E4-04) keeps a few decorative doodles around the edges, never touching the chapter text; it is the shop window for new readers. Replaces the open question in docs/board-fixes.md | Chat, 18 Oct 2026, 10:46 |
| Staff should be able to choose and change the doodles on individual pages (the teaser and website pages) from the admin site; which story builds it and when is still to be planned | Chat, 18 Oct 2026, 10:46 |
