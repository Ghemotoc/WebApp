> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E5 Discovery, search and profiles

**Back end and build order:** section 1.7, group C (screens 3.1 to 3.3), group A (the website) and group F (6.1), waves 2 and 4.

Goal: readers find new writers without an algorithmic feed (the personalised feed is Stage 2).

##### S1-E5-01 Browse by category and tag

As a reader, I want to browse by category and tag so that I find stories I like.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E3-01, S1-E3-06 (ratings), S1-E5-05 (blocks)
- **Build note (17 Oct 2026, checker):** the "View more" card links to its shelf's See all address; the See all page itself is S1-E5-09, built after S1-E5-02. S1-E5-09 was listed as a dependency here, which made a loop with S1-E5-09 depending on this story.
- **Updated:** 16 Oct 2026 (late evening): one-side faded edge (true fade), SVG doodles and icons; ratings replace the mature label; shelves of at most 20 with View more.
- **Acceptance criteria:**
  - Given a category page, when it opens, then it shows stories in that category with the category's accent colour and filters for ongoing or completed and language.
  - Given a tag, when it is tapped, then a tag page lists every visible story with that tag.
  - Given a reader, when they browse, then stories rated above their age (16+ for under-16s, 18+ for anyone without an "18 or over" result) are hidden and can't be opened; signed-out visitors see All ages and 13+ only (proposal).
  - Given a blocked writer, when the reader browses, then that writer's stories are hidden.
  - Given story cards on Discover, category and tag pages, when covers are shown, then the full title fits on every drawn or automatic cover and side-scrolling rows fade out at each edge with cards hidden past it (both edges in the middle of a row; Robert, 6 Nov 2026, replacing "one side only, never both"); every doodle and icon is an SVG file (Definition of Done, design rules).
  - Given any shelf on these pages, when it has more than 20 stories, then it shows 20 in one scrolling line and ends with a "View more" card that opens its See all page (S1-E5-09); a shelf is never a grid of several rows.
- **Legal and compliance:** ratings hidden from anyone younger (decided 16 Oct 2026, late evening, Q17) follow DSA Art 28 (micro and small platforms are exempt, but the plan applies the minors' rules anyway).

##### S1-E5-02 Sort options

As a reader, I want to sort stories in different ways so that I can explore beyond the most popular.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E5-01, S1-E5-03 (popularity is the default sort and is there from the start, as the last criterion says)
- **Acceptance criteria:**
  - Given any story list, when the reader opens "Sort", then the options are popularity (default), newest, oldest, A to Z, Z to A and by writer.
  - Given A to Z or Z to A, when titles or writers are sorted, then the order follows the Romanian alphabet (ă after a, â after ă, î after i, ș after s, ț after t), using `Intl.Collator('ro')` in the app or the Postgres ICU collation "ro-x-icu" in the database (decided 17 Oct 2026, 12:44).
  - Given two stories with equal scores, when sorted by popularity, then the newer one appears first.
  - Given a chosen sort, when the reader moves to another list in the same session, then the choice is kept.
  - Given a shelf, when it is shown, then it keeps its own order (for example newest or popular) and Sort applies on its See all page (S1-E5-09). S1-E5-03 is in the March MVP, so popularity is there from the start (decided 16 Oct 2026, late evening, Q46).
- **Legal and compliance:** none beyond the global checklist.

##### S1-E5-03 Popularity ranking

As a reader, I want "popular" to reflect what people actually enjoy so that good stories rise.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E6-03, S1-E15-02, S1-E11-03 (weights); shares count once S1-E4-05 exists
- **Acceptance criteria:**
  - Given the hourly job (proposal), when it runs, then each story's score is calculated from reads, likes, comments, shares and read-through, with time decay.
  - Given the weights, when they are changed in admin, then the next run uses them, with no code change.
  - Given private downvotes, when the score is calculated, then they are never used.
  - Given the "How ranking works" page, when a user opens it, then it lists these signals in plain language.
  - Given Discover, when it opens, then it mixes shelves from the start (for example Popular, New, Completed and New and rising) instead of one ranked list; which shelves show, their order and how many new writers appear can be changed and tried out without a release (decided 16 Oct 2026, late evening, Q46: "we play a bit with the algorithm"). No shelf uses a person's reading history.
- **Legal and compliance:** the weights are OPEN and will be tuned with real data. Explaining ranking signals follows DSA Art 27 as good practice (micro and small platforms are exempt). A "New and rising" shelf for first-time writers would answer Q13; my proposal, not decided.

##### S1-E5-04 Search stories and writers

As a reader, I want to search by title, tag or pen name so that I can find a specific story or writer.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E3-01, S1-E3-06, S1-E5-05 (blocks)
- **Acceptance criteria:**
  - Given a search term, when it is entered, then results match titles, blurbs, tags and pen names using Romanian and English stemming.
  - Given a search without diacritics, when "povesti" is searched, then "povești" matches.
  - Given search results, when they are shown, then they respect blocks, ratings and removed content.
  - Given search results grouped by kind (stories, writers, tags), when a group has more than 20, then it is one scrolling line of 20 with a "View more" card to its See all page (S1-E5-09).
  - Given story results with covers, when they are shown, then the full title fits on every drawn or automatic cover (Definition of Done, design rules).
- **Legal and compliance:** none beyond the global checklist.

##### S1-E5-05 Writer profile page

As a reader, I want a writer's profile with their stories so that I can follow them.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E2-04
- **Updated:** 2 Nov 2026: avatars are never uploaded; they are built with the avatar builder or are the initials (Robert; bundle ADMIN-2g). 6 Nov 2026: the builder uses DiceBear's Micah art, close up, with tabs of picture tiles and colour swatches and no drop-downs, and credits the art's designer (Robert, 11:03 to 11:16 UTC; bundle AVATAR-1, ADR 0016).
- **Acceptance criteria:**
  - Given a profile, when it opens, then it shows pen name or handle, avatar, a bio of up to 300 characters (proposal), published stories, rank chip, follow button, report and block.
  - Given any profile, when it is viewed by another user, then year of birth, age check result, email and online status are never shown unless the owner opted in to online status.
  - ~~Given an avatar upload, when it is saved, then the same file rules and the picture check on upload apply as for covers (S1-E10-05).~~ Replaced on 2 Nov 2026: there are no avatar uploads.
  - Given Settings › Profile, when a person builds an avatar, then each part is a named picture tile or colour swatch on one of four tabs (Face; Hair; Glasses and earrings; Clothes and background), every hairstyle takes any hair colour, glasses, earrings and beard start at none, and the tabs and tiles work by keyboard (AVATAR-1).
  - Given the avatar editor, when it shows, then the art is credited under it ("Avatar Illustration System" by Micah Lanier, CC BY 4.0, with a link to the licence), and every drawn avatar's SVG carries the same credit (AVATAR-1).
  - Given an avatar saved in the old Open Peeps shape, when the AVATAR-1 migration runs, then it becomes the nearest Micah avatar with the same colours, and the old shape is refused from then on (AVATAR-1).
- **Legal and compliance:** banners on spaces only, no profile banners (decided 16 Oct 2026, late evening, Q50).

##### S1-E5-06 Public-domain classics shelf

As a reader, I want Romanian classics on the platform from day one so that there is something good to read before many writers join.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E3-03, S1-E5-09
- **Updated:** 16 Oct 2026, late evening: decided, seed with any Romanian classics that are free (Q51).
- **Updated:** 6 Nov 2026, 10:58 to 11:00 UTC (Robert): a classic is always Completed (its author is dead), names its real author everywhere, and shows the year the work was first published under "Labels from the writer".
- **Acceptance criteria:**
  - Given a classic, when a reader opens it, then the byline and the author card name its real author, it shows as Completed and, when staff saved the year, "First published" gives the year the work first came out (not the day it was added here).
  - Given an official platform account, when classics are imported, then each work is checked as public domain (the author's life plus 70 years has run out, counted from 1 January of the year after death, so in 2026 authors who died in 1955 or earlier; and the text used is not a protected modern edition or translation, which has its own copyright) and labelled "Public domain".
  - Given the classics shelf, when a reader opens it, then it works like any other shelf: one scrolling line of at most 20 with a "View more" card to its See all page (S1-E5-09).
- **Legal and compliance:** copyright in Romania lasts 70 years after the author's death, counted from 1 January of the following year (Law 8/1996 art. 28(1) and art. 34; research G5); translations, modern editions and editors' notes may still be protected, so only texts we know are free are used. Early Wattpad added about 17,000 to 20,000 Project Gutenberg titles in early 2007 (fact check, master-plan/07).

##### S1-E5-07 Seasonal doodles

As a reader, I want the doodle by the Discover greeting and the one by Search's popular tags to change with the season and special days so that Ghemotoc feels alive.

- **Priority:** Could · **Size:** S · **Depends on:** S1-E1-03, S1-E5-01, S1-E5-04, S1-E11-11 (the schedule)
- **Updated:** 16 Oct 2026 (late evening): the admin schedule moved to S1-E11-11; doodles are SVG files.
- **Added:** 16 Oct 2026, Robert's decision (canvas, Discover and Search).
- **Acceptance criteria:**
  - Given today's date on the reader's own device, when Discover opens, then the greeting doodle comes from the set for that season or occasion (for example a jack-o'-lantern in October, a snowman or a Christmas tree in winter), with a default doodle for days without an occasion.
  - Given the same date, when Search opens, then the popular-tags doodle switches in the same way.
  - Given the schedule staff keep in S1-E11-11, when an occasion is added or changed, then the app shows the new doodle within a minute with no release.
  - Given any seasonal doodle, when it is shown, then it is an SVG file, it is decorative (hidden from screen readers, takes no clicks, never over text) and it does not move or animate.
- **Legal and compliance:** none beyond the global checklist; no location is used, only the device's date. OPEN: the list of occasions, and whether they should follow the reader's country once English-speaking countries open after Romania (Romania first, decided 17 Oct 2026).

##### S1-E5-08 Public website home page

As a visitor without an account, I want a public home page that explains Ghemotoc and shows what people are reading so that I can decide whether to join or get the app.

- **Priority:** Should (proposal: for the March test a short version is enough: the hero, the safety lines and the questions; the live rows can follow) · **Size:** M · **Depends on:** S1-E1-03, S1-E1-04, S1-E11-06, S1-E11-12; S1-E5-03 and S1-E5-09 for the live rows (rows can follow), S1-E16-02 for the download links (after March); back end for March: the published CMS views in the app's database (B31) and the app's own public views or `public-shelves`, no website database (section 1.7, group A)
- **Added:** 16 Oct 2026 (late evening). The website was on the canvas (1.1) but no story built it.
- **Updated:** 17 Oct 2026, 12:34 (Robert): until the apps exist everything is on the web, so for March the public home page lives inside the web app, with live rows from the app's own public views or `public-shelves` and no separate website database yet. (Its copy source was the locale files until 19:14.)
- **Updated:** 17 Oct 2026, 19:14 to 19:16 (Robert): the page's text (hero, safety lines, questions) comes only from the CMS (S1-E11-06, S1-E11-12), never from the locale files; the CMS is built before March and stores its content in the app's database until the website database exists. The page shows the published version for the visitor's market and language; a visitor from a country with no page of its own sees the Romanian market's English page.
- **Updated:** 6 Nov 2026 (Robert's go for the design catch-up, 06:43 UTC; bundle LOOK-2): the hero gets the board's cover wall beside the headline, with the gold "Your rights" card (its words from the CMS) and two doodles; "Why write here" becomes one joined card and the safety block the board's quiet row under it. The board's reader comment card is left out until staff can pick real comments (design gap D1; S1-E5-13, parked).
- **Updated:** 6 Nov 2026 (bundle LOOK-3): the board's other sections come back. Trending gets genre chips (one radio group; the row keeps its place while it loads); New and rising writers reads `rising_writers()` (LOOK-4c, so only writers who may be put on show; D4) and hides when empty; four CMS bands follow (the writers' band with four points, the forums band beside `public_forum_highlights()`, the gold "Start your first story" and "Apps come later"), each left out while its heading is empty; the questions sit in two columns with the balloon doodle; the big footer adds the CMS footer note and three link columns. `public_forum_highlights()` lists only the platform's own forums and public 16+ spaces, never a class, private or under-16 space (pgTAP 306). Board mismatches: the writers' band's drawn chapter with a reader's comment is left out (D1: no made-up comments), the first story band says nothing about under-16 consent while S1-E2-03 is off (Law 363/2007), and the footer's "For teachers" and "For partners" mail links wait for their pages.
- **Acceptance criteria:**
  - Given the home page, when it loads, then the hero shows the published CMS version (S1-E11-06) for the visitor's market (the country from the connection, S1-E2-10) and language, never text from the locale files: the line above the headline, the two-line headline with its gold-underlined word, the line under it, the two buttons and the three short points. The copy is "Write stories. Get read." with "Post your stories, poems and essays, one chapter at a time, and find the people who want to read them." (decided 16 Oct 2026, late evening: no "articles"), seeded as version 1. If the CMS read fails, the last published version shows.
  - Given the hero, when the Trending list has stories rated All ages or 13+, then a wall of up to six of their covers sits beside the headline, as one picture named by their titles, whoever is looking (never a 16+ or 18+ story, even to an adult); the gold "Your rights" card shows the CMS's `rightsCard` words and is hidden while its title is empty (LOOK-2).
  - Given the safety block, when it is shown, then it includes "Yoti does the age check. We only get the result, never a photo." and the one messaging line (Q6, Q13): messaging is never possible between under-16s and adults, and for 16 and 17-year-olds it is off by default and only the teen can turn it on; both lines come from the CMS (S1-E11-06), and for the March test the published lines must be true for March (see the legal notes).
  - Given the Trending, Completed and New and rising rows, when they load, then they come from the app's own public views or `public-shelves`, which return only public stories rated All ages or 13+: never chapter text from an app-only story, never a 16+ or 18+ story, never anything from a private class space and never a user ID. App-only stories show "In the app only".
  - Given a row with more than 20 stories, when it is shown, then it holds 20 in one scrolling line and ends with a "View more" card to its See all page (S1-E5-09).
  - Given the top bar and the footer, when they are shown, then both have the language drop-down (S1-E1-04).
  - Given the questions section, when it loads, then the questions and answers are the published questions marked for the home page in the help and questions CMS (S1-E11-12) for the visitor's market and language, including "What is a class space?".
  - Given a visitor from a country with no page of its own, when the page loads, then it shows the Romanian market's English page, questions included (decided 17 Oct 2026, 19:16).
  - Given the top bar, the footer and the language menu, when they are shown, then they are interface text from the locale files (with admin overrides, S1-E11-18); the hero, safety lines and questions never come from the locale files (decided 17 Oct 2026, 19:14).
  - Given the side-scrolling rows, when they are shown, then the row fades out at each edge with cards hidden past it (both edges in the middle of a row; Robert, 6 Nov 2026); every doodle and icon is an SVG file (Definition of Done, design rules).
  - Given any visitor, when the page loads, then it sets no cookies and loads no third-party script apart from the cookieless analytics (S1-E15-01), and each language version has the right `lang` attribute and one `h1`.
- **Legal and compliance:**
  - Consumer law: "free", "no tracking ads", "you keep your rights" and the Yoti line must stay true while they are live (Law 363/2007). The Yoti line is true only while S1-E2-08 stores the result and nothing else.
  - The questions say 13 to 15-year-olds need a parent's or guardian's consent (Q8). That is true from the public launch (consent is the legal basis, Q15), but S1-E2-03 comes after March (17 Oct 2026, 12:44).
  - For the invited-adults March test (decided 17 Oct 2026, 12:44), the safety copy and questions published in the CMS must be true for March: for example no claim that Yoti checks ages or that parents consent while S1-E2-08 and S1-E2-03 are not live, and a line that the test is for invited adults (Law 363/2007; docs/board-fixes.md).
  - No contest block for March: no contest is planned for now; contests are a campaign for later (decided 17 Oct 2026, 12:34). When one comes back it needs published contest rules, and for school partners the ROFUIP art. 178(2) check in S1-E8-12.
  - Decided (Q54): the website's CMS is new, built from scratch on its own database. From March: inside the app until the website database exists (decided 17 Oct 2026, 12:34): for the March MVP the page is part of the web app, and its text comes only from the CMS, stored in the app's database behind the store interface (decided 17 Oct 2026, 19:14 and 19:16). A short version is enough for March (proposal): hero, safety lines, questions; rows can follow. Hosting: in the EU (Q38), on Cloudflare Pages (decided 17 Oct 2026, 12:57).

##### S1-E5-09 See all page for a shelf

As a reader, I want a "View more" card at the end of a full shelf that opens a page listing every story in it so that I can see everything without the shelf turning into a wall of covers.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E5-01, S1-E5-02
- **Added:** 16 Oct 2026, late evening: the shelf design rule (Definition of Done, design rules).
- **Acceptance criteria:**
  - Given any shelf (Discover, category and tag pages, Classics, Search, Library or the website home page), when it has more than 20 stories, then it shows the first 20 in one horizontally scrollable line and ends with a "View more" card; with 20 or fewer there is no card.
  - Given the "View more" card, when it is shown, then it is a real link with an accessible name that says what it opens and how many ("View all 54 in Trending"), reachable by keyboard and by the row's scroll buttons.
  - Given the card is used, when the See all page opens, then it lists every story in that shelf in the same order, with the same filters and the Sort options (S1-E5-02), loading more as the reader scrolls or with a "Load more" button.
  - Given the See all page, when it is shown, then it respects ratings, blocks, app-only rules and removed content exactly as the shelf does, and the page has its own address so it can be shared.
  - Given covers on the See all page, when they are shown, then the full title fits on every drawn or automatic cover (Definition of Done, design rules).
- **Legal and compliance:** none beyond the global checklist; no personal reading history is used to fill a shelf.

##### S1-E5-10 Featured this week, picked by staff with help from the ranking

As a staff member, I want to see how every active story ranks and pick a few for the Featured band, so that readers meet both well-known stories and promising less-known ones.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E5-03 (story_scores), S1-E11-07 (Stories area), S1-E7-01 (notifications) · **Bundle:** LOOK-4a
- **Added:** 6 Nov 2026 (Robert, answer D2 in the LOOK brief): "Staff pick it. They see the ranks of all current active stories and choose from them … The writer must be 16 or over." Admins and the owner pick; "active" means a chapter in the last 60 days; "promising" means at least 60% read-through with fewer reads than the median; an empty band is hidden.
- **Data touched:** `featured_picks` (kind staff: the story, its place 1 to 5, the staff member who picked it as `user_id`, and a removed date when a later save takes it out); `story_rank_snapshots` (kind platform: each story's rank and score once a day, kept 35 days); settings `featured_max` (5), `featured_active_days` (60) and `featured_promising_read_through` (0.6); notification kind `story_featured`. Staff read both tables; nobody writes them directly.
- **Database functions:** `admin_featured_candidates(view, category_slug, rating, page_size, page_offset)` (the ranking screen: rank, change in 7 days, score, reads this week, read-through, followers, first chapter, rating, new writer, and whether the story can be featured with the reason; views All ranked, Rising, New writers, Promising); `admin_set_featured_picks(story_ids, reason)` (replaces the list, refuses a story that can't be featured, duplicates and more than `featured_max`, logs before and after, tells each newly picked writer); `featured_stories_now()` (the band's cards for this reader); `may_feature_writer()` (active and 16 or over, or the classics account; LOOK-4c adds the writer's "Suggest me" switch).
- **Acceptance criteria:**
  - Given staff open Stories › Featured, when the page loads, then they see every current active story with its rank, rank change, score, reads this week, read-through, followers, first-chapter date, rating and whether it can be featured. A story that cannot be featured says why ("The writer is under 16", "Not public on the web").
  - Given the ranking table, when staff sort or filter it, then only the view changes; ranks and scores are read-only and the same for everyone.
  - Given staff tick up to five stories and save with a reason, when `admin_set_featured_picks()` runs, then the band shows them in that order on the next page load, the audit log has the before and after lists, and each newly picked writer gets a notification.
  - Given a writer aged 13 to 15 (persona `kid_14_ok`), when staff try to pick their story, then the database refuses it (pgTAP denied test) and the screen shows the reason before saving.
  - Given a picked story whose writer is later suspended or turns off "Suggest me", when anyone opens Discover, then that story is gone from the band without staff doing anything.
  - Given a 14-year-old reader and a pick rated 16+, when they open Discover, then they do not see that pick (pgTAP and e2e).
  - Given the picks contain no All ages or 13+ story, when staff save, then the screen warns that younger readers and signed-out visitors will see an empty band (a warning, not a block).
  - Given no picks, when Discover opens, then the band is not shown. No automatic fallback.
  - Given a support or moderator account, when it calls either admin function, then it is refused (pgTAP denied test).
  - Given the "How ranking works" page, when it is read, then it has one plain line: "Featured this week is picked by our team, with help from the ranking." (DSA art. 27 as good practice).
- **Screens:** the Discover band (board Discover top): a plum card with the eyebrow, title, blurb, "Read the story", byline and the tilted cover pair, with dots, arrows and a pause control; it never moves by itself under `prefers-reduced-motion` or while the focus or pointer is inside it. Stories › Featured is a plain staff table (no doodles).
- **Legal and compliance:** staff curation of minors' work. The 16+ writer rule is Robert's decision, 6 Nov 2026. The writer is told, and the "Suggest me" setting (LOOK-4c) lets them opt out.

##### S1-E5-11 New and rising writers, and "Suggest me"

As a reader, I want to meet new writers worth following, and as a writer I want to choose whether I am suggested to strangers, so that new voices are found without anyone being put on show against their will.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E5-03 (story_scores), S1-E5-05 (profiles, blocks), S1-E6-05 (follows), S1-E2-03b · **Bundles:** LOOK-4c (the rule, the function, the Discover shelf and the switch), LOOK-3 (the home page section)
- **Added:** 6 Nov 2026 (Robert, answers in the LOOK brief): D4 "writers 16 and over; under-16s only with their parent's expressed consent"; "Suggest me" on for 18+ and off for under-18s, who turn it on themselves.
- **Data touched:** `profiles.suggest_me` (null means "not chosen": on for 18+, off for under-18s, so a writer who turns 18 follows the adult default unless they chose). No new table; follower gains come from `follows_users.created_at`.
- **Database functions:** `may_spotlight_writer(person_id)` (internal: the one rule for every suggestion: active, the switch on, 16 or over, or 13 to 15 with an agreed consent and the parent's separate yes; the classics account always), `may_feature_writer()` rebuilt on it (16 or over only), `suggests_me()`, `set_suggest_me(should_suggest)`, `my_privacy_settings()` (adds `suggest_me`, `parent_spotlight` and `can_ask_parent`), `rising_writers(page_size)` (visitors and members: first chapter within `rising_writer_days`, best summed score then followers gained in 7 days, at most 20, no blocks either way, never the reader, the latest story one the reader may read, followers only when 5 or more, never a user ID). The word `writers` joins `discover_shelves` after `rising`.
- **Acceptance criteria:**
  - Given `adult_writer` is a new writer, when a visitor reads the list, then they appear (pgTAP).
  - Given `teen_17` has not turned the switch on, when anyone reads the list, then they are not in it; once they turn it on, they can be (pgTAP).
  - Given `kid_14_ok` turned the switch on but the parent has not said yes, when the list is read, then they are not in it; once the parent says yes they can be; when the parent withdraws they drop out at once (pgTAP).
  - Given `suspended_user`, a blocked writer or the reader themselves, when the list is read, then none appear (pgTAP).
  - Given a writer gained fewer than 5 followers this week, when their card shows, then there is no follower line.
  - Given Discover, when `writers` is in `discover_shelves`, then "Writers to follow this week" is one scrolling row of cards with Follow buttons (e2e).
  - Given Settings › Privacy, when a writer turns "Suggest me and my stories to other people" off, then they leave every suggestion at once (e2e).
- **Screens:** Discover's "Writers to follow this week" (board Discover, shelf 3: 248 px cards, a 48 px avatar, the name and category, the growth line, the latest story and Follow); the switch in Settings › Privacy.
- **Legal and compliance:** shows minors' pen names publicly only with the parent's separate yes (GDPR art. 8). Under-18 default off (DoD privacy). The privacy notice gains the purpose "Suggesting writers to other readers"; points for the lawyer in `docs/for-the-lawyer.md`.

##### S1-E5-12 Discover greeting, "pick up where you left off" cards and five shelves

As a signed-in reader, I want Discover to greet me and put my unfinished story and my draft first, so that I can carry on in one tap.

- **Priority:** Should · **Size:** M (about 12 h) · **Depends on:** S1-E4-03 (reading places), S1-E3-02 (drafts), S1-E5-03 (discover_shelves) · **Bundle:** LOOK-4b
- **Added:** 6 Nov 2026 (Robert's go for the design catch-up; design gap D5: Discover has 5 shelves, not 10).
- **Data touched:** the public setting `discover_shelves` becomes `["following", "popular", "rising", "classics", "writers"]`; category shelves move to the category chips above them. Staff can change it back without a release (Q46). No new table.
- **Database functions:** `my_discover_cards()` (members only; `insufficient_privilege` signed out). It reads only the caller's own rows: their unfinished story read most recently, only one they may still read (through `listed_stories()`: ratings, blocks, moderation), with "chapter n of N", how far in and, when a newer chapter came out after they last read, its number; a story read to the end of its last chapter is finished and left out. Then their draft chapter saved most recently, in a story they still have. Then whether they may write (`is_active_member()`).
- **Acceptance criteria:**
  - Given a signed-in reader, when Discover opens, then the h1 is "Good morning / afternoon / evening, <pen name, or the username if there is none>." by their device's clock (the birthday month and joining anniversary greetings of S1-E2-13 still win), with the board's gold line under the name. It never uses a real name (CLAUDE.md rule 5). The eyebrow reads "Discover · <weekday, day month>", in the reader's language (e2e).
  - Given the reader has no unfinished story, when the cards draw, then Continue reading is not shown; the same for a reader with no draft. The gold "Start a new story" card shows for every member who may write (pgTAP and e2e).
  - Given "Chapter n is out", when it shows, then a newer chapter really came out after the reader last read (pgTAP).
  - Given a story across a block, when the cards draw, then it is not offered to carry on (pgTAP).
  - Given a signed-out visitor, when Discover opens, then they see the heading without a name and none of the three cards (pgTAP and e2e).
  - Given the five shelves, when Discover draws, then they follow the setting's order and every shelf keeps the 20 plus View more rule (e2e).
- **Screens:** Discover's heading and "Your dashboard" (board Discover: Continue reading two columns wide with a 104 px cover, a progress line and Continue; Your draft with "Open draft"; the gold "Start a new story" card). Each card is one link.
- **Board mismatches:** the board's line under the greeting counts updates from followed writers; Stage 1 has no such count, so the page keeps its own line with "How ranking works" (DSA art. 27). The board's Filters button beside search is left out: filtering lives on the See all pages (S1-E5-09).
- **Legal and compliance:** none beyond the global list. No reading history leaves the reader's own account.

##### S1-E5-QA Epic check: Discovery, search and profiles

As the founder, I want every story in this epic tested together end to end so that the pieces work with each other, not just alone.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E5-01, S1-E5-02, S1-E5-03, S1-E5-05, S1-E5-08, S1-E5-09
- **Added:** 17 Oct 2026, 12:36 (Robert, chat): every epic ends with a quality-check story, and every prompt has a quality check built in. It covers the epic's March MVP stories and comes last among them in the build order. The epic's after-March stories (S1-E5-04, S1-E5-06, S1-E5-07) get the same check when they land (proposal).
- **Main journeys:** a visitor goes from the public home page to Discover, browses by category and tag, sorts, opens a See all page and a writer profile.
- **Acceptance criteria:**
  - Given the epic's stories are merged, when the end-to-end suite runs, then Playwright tests walk the main journeys across those stories with the seed personas `adult_writer`, `teen_17`, `kid_14_ok` and `kid_14_waiting`, and every journey passes.
  - Given a journey breaks where two stories meet, when it is found, then it is fixed in this pull request or ticketed as a GitHub issue that names the stories involved.
  - Given every screen in the epic, when axe runs at 390, 768 and 1440 px wide, then it reports no serious or critical issues.
  - Given the RLS tests, when they run as one suite (`npx supabase test db`), then every policy on every table the epic touches has an allowed and a denied test, with no gaps.
  - Given `docs/code-tour.md`, when it is read, then it covers the epic: where its screens, hooks, tables, functions and jobs live and how one main journey travels through them.
  - Given the check is finished, when the pull request is opened, then it includes a short epic report listing what works, the known gaps and every stub or mock still on (with the story that removes it, `docs/mocks.md`).
- **Legal and compliance:** minors' journeys are tested with the under-16 (`kid_14_ok`, `kid_14_waiting`) and 16 to 17 (`teen_17`) personas, so the age gate, ratings, blocks and under-18 defaults are proved across stories, not only inside each one. In March only invited adults sign up (`adults_only`, decided 17 Oct 2026, 12:44), so the minor personas are seed data that prove these protections are ready before minors are let in. The test data is the seed personas only, never real user data (CLAUDE.md, Safety while building).

---
