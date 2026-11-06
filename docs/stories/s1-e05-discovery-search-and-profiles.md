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
- **Acceptance criteria:**
  - Given a profile, when it opens, then it shows pen name or handle, avatar, a bio of up to 300 characters (proposal), published stories, rank chip, follow button, report and block.
  - Given any profile, when it is viewed by another user, then year of birth, age check result, email and online status are never shown unless the owner opted in to online status.
  - Given an avatar upload, when it is saved, then the same file rules and the picture check on upload apply as for covers (S1-E10-05).
- **Legal and compliance:** banners on spaces only, no profile banners (decided 16 Oct 2026, late evening, Q50).

##### S1-E5-06 Public-domain classics shelf

As a reader, I want Romanian classics on the platform from day one so that there is something good to read before many writers join.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E3-03, S1-E5-09
- **Updated:** 16 Oct 2026, late evening: decided, seed with any Romanian classics that are free (Q51).
- **Acceptance criteria:**
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
