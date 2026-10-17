# Full demo: every Stage 1 screen (16 Oct 2026)

Robert asked for a full demo of every page the Stage 1 user stories imply.
- **Look:** the new Discover style for all of them.
- **Links:** linked so Play clicks through, while still reading as static designs on the canvas.

Read these files with this one:
- `/home/claude/demo/_RESTYLE_BRIEF.md`: look, copy rules and workflow. This file overrides the brief where they differ, for example on links.
- `/home/claude/demo/_nav-signed-in.html`: the canonical signed-in nav, with links already set. Copy it exactly and move `aria-current` plus the bold and gold underline to the right item.
- The story text for your screens in `/home/claude/outputs/cto/stage-1-stories.md`. Each story's acceptance criteria tell you what the screen must show. Show the states the criteria name, for example "Saved" and "Saving", or an empty state.

## Shared cast (keep it consistent across screens)

**Signed-in user**
- Lia Popescu, handle `@lia.writes`, avatar initials LP on gold.
- Born 2010, so she is 16. She chose Prahova as her area. Interface in English.
- She writes "Chapter one, untitled", a draft of 1,240 words. Her published story is "The Girl Who Fixed Radios" (Fiction, ongoing, 6 chapters).
- She reads "The Salt Mine Choir" by inkwolf.

**Other writers** (all fictional)

| Writer | Work | Type |
| --- | --- | --- |
| inkwolf | The Salt Mine Choir: a choir rehearses in an old salt mine turned museum, and a new singer joins whose name is on no list | Fiction, ongoing, 15 chapters |
| poppyverse | Small Rooms | Poetry |
| matei.writes | Inside the Student Housing Waitlist | Journalism |
| Ana Radu | What Our Grandparents Didn’t Post | Essays |
| corbu | Night Bus to Ploiești | Fiction, completed |
| geo.andrei | Rivers That Moved Towns | Academic |
| ilinca.r | The Last Tram Home | Fiction |

**Staff:** moderator Andrei Mureșan (staff, 2FA on) and admin Robert (founder).

**Other names**
- Class space: "Class 9B, Liceul Teoretic [School name], Ploiești", teacher "Ms Ionescu".
- Partners: always `[Partner]`.
- Illustrative numbers (reads, followers) are fine. No real statistics.

## Link map (use these exact hrefs)

**Signed-in nav**
| Item | Goes to |
| --- | --- |
| Home and Discover | `Discover.dc.html` (Home opens the personal dashboard, which is Discover for now) |
| Library | `Library.dc.html` |
| Forums | `Forums.dc.html` |
| Messages | `Messages.dc.html` |
| Bell | `Notifications.dc.html` |
| Write | `WriterDashboard.dc.html` |
| Avatar | `Settings.dc.html` |

**Page footer** on every app screen (small, under the content): Community guidelines, Terms, Privacy, Accessibility, Contact, Report without an account, then "A house of brands by The Magic Coffin" and a Română / English switch.
- Report without an account → `NoticeForm.dc.html`.
- Every other footer link → `Legal.dc.html`.

**Signed-out island** (wordmark, "Log in", dark "Join free" pill)
- Wordmark → `Main.dc.html`
- Log in → `SignIn.dc.html`
- Join free → `Main.dc.html#join`

**Staff island**
| Item | Goes to |
| --- | --- |
| Wordmark plus "Staff" pill | `Moderation.dc.html` |
| Queue | `Moderation.dc.html` |
| Appeals | `Appeals.dc.html` |
| Users | `AdminUsers.dc.html` |
| Sponsors | `AdminSponsors.dc.html` |
| Schools | `AdminSchools.dc.html` |
| Metrics | `AdminMetrics.dc.html` |
| Settings | `AdminSettings.dc.html` |

Signed-out staff page: `StaffSignIn.dc.html`.

**Story, writer and other cards:** a story card → `Story.dc.html`, "Read" or "Continue" → `Reader.dc.html`, a writer name → `Profile.dc.html`, a thread → `Thread.dc.html`, a space → `Space.dc.html`. Report buttons → `ReportDialog.dc.html`, Share → `Share.dc.html`.

**Account flow:** Main (sign up) → AgeCheck → ParentConsent (Lia is 16, so she skips it; show the under-16 path anyway) → Onboarding → Discover. SignIn → Discover.

## Every screen (file, what it is, stories, nav, agent group)

| # | File | Screen | Stories | Nav | Group |
|---|---|---|---|---|---|
| 1 | Main.dc.html (exists) | App landing and sign-up: email, password, year of birth | E2-01, E2-02 | signed-out | A |
| 2 | SignIn.dc.html | Sign in, plus "forgot password" and the reset-sent state | E2-05 | signed-out | A |
| 3 | AgeCheck.dc.html (exists) | Yoti age check: before, in progress, passed, failed or retry | E2-08 | signed-out | A |
| 4 | ParentConsent.dc.html | Under-16 waiting screen ("we emailed your parent"), and beside it the parent's consent page | E2-03 | signed-out | A |
| 5 | Onboarding.dc.html | Handle and optional pen name, interests, optional area (county), language, guidelines | E2-04, E2-06, E1-04 | signed-out | A |
| 6 | Teaser.dc.html | Public web teaser of a shared chapter: first part, then "Join free to read on" | E4-04, E4-05 | signed-out | B |
| 7 | NoticeForm.dc.html | Report illegal content without an account (DSA notice form) | E10-02 | signed-out | B |
| 8 | Legal.dc.html | Legal centre with tabs: Terms, Privacy notice, Community guidelines, Contact and company details, Accessibility statement. Show one tab open, with plain-language summaries and placeholders for legal text | E14-01, E14-02, E14-03 | signed-out | B |
| 9 | States.dc.html | Error, offline, maintenance and not-found states on one board, as four panels | E1-05 | signed-in | B |
| 10 | GetApp.dc.html | Get the app: Windows, macOS, Linux downloads; install the web app; phones "after the March test" | E16-01, E16-02, E16-03 | signed-in | B |
| 11 | Discover.dc.html (exists, approved) | Copy and link fixes only | E5-01 to E5-03 | signed-in | J |
| 12 | Search.dc.html | Search results with tabs (Stories, Writers, Forum posts), Romanian diacritics tip, empty state | E5-04, E8-10 | signed-in | C |
| 13 | Classics.dc.html | Public-domain classics shelf (Romanian and world classics) | E5-06 | signed-in | C |
| 14 | Story.dc.html (exists) | Story page: cover, blurb, labels, follow story, like, chapter list, writer card | E5, E6-03, E6-05, E3-06 labels | signed-in | C |
| 15 | Reader.dc.html (exists) | Chapter reader: reading settings panel, paragraph comments, comments with reactions, like, private downvote, banner after the chapter, traceable copy notice | E4-01, E4-02, E4-06, E6-01 to E6-04, E6-06, E12-01 | signed-in | C |
| 16 | Share.dc.html | Share sheet over the reader, and the quote-share card | E4-05, E4-07 | signed-in | C |
| 17 | Library.dc.html | Library: continue reading, followed stories, reading lists, downloaded for offline (desktop) | E4-03, E4-08 | signed-in | D |
| 18 | Profile.dc.html | inkwolf's public writer profile as Lia sees it: bio, stories, follow, rank chip, signature, certificates shelf, report | E5-05, E6-05, E8-08, E8-09, E8-12 | signed-in | D |
| 19 | Notifications.dc.html | Notifications list with filters (All, Replies, Follows, Stories, Staff), mark all read | E7-01 | signed-in | D |
| 20 | Settings.dc.html | Settings with side tabs: Account, Privacy, Notifications (email digest, push), Messages (who can message me, retention), Language, My certificates, Download my data, Delete account. Show Privacy open, plus the delete-account confirmation as a second panel | E13-01 to E13-03, E7-02, E7-03, E9-04, E1-04, E8-12 | signed-in | D |
| 21 | WriterDashboard.dc.html | Writer dashboard: my stories, drafts, reads, comments, followers over time, "New story" | E3-07 | signed-in (Write active) | E |
| 22 | NewStory.dc.html | Create a story: title, blurb, category, tags, cover (drawn), language, status, content labels (fan fiction, parody, mature content, AI assistance) | E3-01, E3-05, E3-06 | signed-in | E |
| 23 | Editor.dc.html (exists) | Chapter editor: autosave states, publish now, schedule, unpublish | E3-02, E3-03 | signed-in | E |
| 24 | Chapters.dc.html | Manage chapters: reorder, rename, scheduled, draft and published states, delete | E3-04 | signed-in | E |
| 25 | Forums.dc.html (exists) | Forum index: categories, subforums, unread markers, spaces list | E8-01, E8-04 | signed-in | F |
| 26 | Thread.dc.html (exists) | Thread: posts with safe formatting, quote and multi-quote, quick reply, sticky or locked, "don’t bump" | E8-02, E8-03, E8-05 | signed-in | F |
| 27 | Space.dc.html | A user-created space ("Fantasy writers’ circle"): rules, moderators, members-only posting, plus a "Create a space" panel | E8-06, E8-07 | signed-in | F |
| 28 | ClassSpace.dc.html | Private class space (Class 9B): teacher badge, invite code, class threads, contest board, class-only stories | E8-11 | signed-in | F |
| 29 | Messages.dc.html (exists) | Messages: one-to-one chat, block and report, the adult-to-minor rule notice | E9-01 to E9-03 | signed-in | G |
| 30 | ReportDialog.dc.html | Report dialog over a chapter: reasons, including "copied from a published work", details, confirmation | E10-01, E10-08 | signed-in | G |
| 31 | MyReports.dc.html | My reports and decisions: report status, statement of reasons received, appeal form | E10-04, E10-07 | signed-in | G |
| 32 | AdFormats.dc.html (exists) | Ad and sponsor formats explainer (keep its purpose) | E12-01, E12-02 | signed-in | G |
| 33 | StaffSignIn.dc.html | Staff sign-in with two-factor code | E2-07, E11-01 | staff, signed out | H |
| 34 | Moderation.dc.html (exists) | Moderation queue with priority tiers and pre-screening flags | E10-03, E10-05 | staff | H |
| 35 | ModCase.dc.html | One case: content, flags, history, decision, statement of reasons, sanction ladder, moderator mail, safeguarding escalation | E10-04, E10-06, E10-10, E10-11 | staff | H |
| 36 | Appeals.dc.html | Appeals queue, plus terrorist content removal orders (one-hour clock) | E10-07, E10-09 | staff | H |
| 37 | AdminUsers.dc.html | User management: search, roles, sanctions, age-check status (result only, no images) | E11-02 | staff | I |
| 38 | AdminSettings.dc.html | Content settings and feature flags (parental consent, adult-to-minor messaging, images in posts, teaser length), rate limits | E11-03, E10-12 | staff | I |
| 39 | AdminMetrics.dc.html | Metrics and compliance logs: March test numbers, moderation times, DSA log export, retention schedule | E11-04, E15-01 to E15-03, E13-04 | staff | I |
| 40 | AdminSponsors.dc.html | Sponsor campaigns, "presented by" placements, banner slots, sponsor report | E12-02, E12-03 | staff | I |
| 41 | AdminSchools.dc.html | Schools: set up class spaces for pilot schools, verify teachers, issue certificates | E8-11, E8-12 | staff | I |
| 42 | Website-Home.dc.html | Public website home page (marketing) | none | website | K |

## Rules for new files
- **Page skeleton:** the same as Discover, as a fluid page.
  - Root: `width: 100%; min-height: 100vh; background: #FAF8F5`.
  - Content in a `max-width: 1280px` container.
  - Set `$preview` to `{"width":1440,"height":<your estimate>}`.
  - Include the helmet font link and focus-ring style exactly as Discover has them.
- **Interactivity:** where a screen has a real control that is cheap to make work (tabs, a toggle, a dialog open or close), make it work with state. That's optional; links are not.
- **Dialogs** (Share, ReportDialog, the delete confirmation): draw the page behind dimmed (`rgba(38,20,46,0.45)`) with the dialog card on top, so the board reads as a static picture.
- **Publishing:** publish each file as soon as it's written; only your own files, never `canvas.json`.
  - If a publish is refused with "you haven't viewed the latest version", do a plain Artifact read of the canvas url (no path), then publish again.
  - If it names files, read those again first.
