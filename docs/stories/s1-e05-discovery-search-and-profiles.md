> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E5 Discovery, search and profiles

**Back end and build order:** section 1.7, group C (screens 3.1 to 3.3), group A (the website) and group F (6.1), waves 2 and 4.

Goal: readers find new writers without an algorithmic feed (the personalised feed is Stage 2).

##### S1-E5-01 Browse by category and tag

As a reader, I want to browse by category and tag so that I find stories I like.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E3-01, S1-E3-06 (ratings), S1-E5-05 (blocks), S1-E5-09 (See all)
- **Updated:** 16 Oct 2026 (late evening): one-side faded edge (true fade), SVG doodles and icons; ratings replace the mature label; shelves of at most 20 with View more.
- **Acceptance criteria:**
  - Given a category page, when it opens, then it shows stories in that category with the category's accent colour and filters for ongoing or completed and language.
  - Given a tag, when it is tapped, then a tag page lists every visible story with that tag.
  - Given a reader, when they browse, then stories rated above their age (16+ for under-16s, 18+ for anyone without an "18 or over" result) are hidden and can't be opened; signed-out visitors see All ages and 13+ only (proposal).
  - Given a blocked writer, when the reader browses, then that writer's stories are hidden.
  - Given story cards on Discover, category and tag pages, when covers are shown, then the full title fits on every drawn or automatic cover and side-scrolling rows fade out on one side only, never both; every doodle and icon is an SVG file (Definition of Done, design rules).
  - Given any shelf on these pages, when it has more than 20 stories, then it shows 20 in one scrolling line and ends with a "View more" card that opens its See all page (S1-E5-09); a shelf is never a grid of several rows.
- **Legal and compliance:** ratings hidden from anyone younger (decided 16 Oct 2026, late evening, Q17) follow DSA Art 28 (micro and small platforms are exempt, but the plan applies the minors' rules anyway).

##### S1-E5-02 Sort options

As a reader, I want to sort stories in different ways so that I can explore beyond the most popular.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E5-01; S1-E5-03 for popularity
- **Acceptance criteria:**
  - Given any story list, when the reader opens "Sort", then the options are popularity (default), newest, oldest, A to Z, Z to A and by writer.
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

- **Priority:** Should (proposal: for the March test a short version is enough, with the hero, the safety lines, the questions and the download buttons; the live rows can follow) · **Size:** M · **Depends on:** S1-E1-03, S1-E1-04, S1-E11-06, S1-E11-12, S1-E5-03 (for the rows), S1-E16-02 (download links); back end: the website's own database and `public-shelves` (section 1.7, group A)
- **Added:** 16 Oct 2026 (late evening). The website was on the canvas (1.1) but no story built it.
- **Acceptance criteria:**
  - Given the home page, when it loads, then the hero shows the published copy from the website's database in the visitor's language: the line above the headline, the two-line headline with its gold-underlined word, the line under it, the two buttons and the three short points. The copy is "Write stories. Get read." with "Post your stories, poems and essays, one chapter at a time, and find the people who want to read them." (decided 16 Oct 2026, late evening: no "articles"). If the read fails, the last published version shows.
  - Given the safety block, when it is shown, then it includes "Yoti does the age check. We only get the result, never a photo." and the one messaging line (Q6, Q13): messaging is never possible between under-16s and adults, and for 16 and 17-year-olds it is off by default and only the teen can turn it on; both lines come from the CMS.
  - Given the Trending, Completed and New and rising rows, when they load, then they come from `public-shelves`, which returns only public stories rated All ages or 13+: never chapter text from an app-only story, never a 16+ or 18+ story, never anything from a private class space and never a user ID. App-only stories show "In the app only".
  - Given a row with more than 20 stories, when it is shown, then it holds 20 in one scrolling line and ends with a "View more" card to its See all page (S1-E5-09).
  - Given the top bar and the footer, when they are shown, then both have the language drop-down (S1-E1-04).
  - Given the questions section, when it loads, then the questions and answers come from the help and questions CMS (S1-E11-12) in the visitor's language, including "What is a class space?".
  - Given the side-scrolling rows, when they are shown, then the row fades out on one side only, never both; every doodle and icon is an SVG file (Definition of Done, design rules).
  - Given any visitor, when the page loads, then it sets no cookies and loads no third-party script apart from the cookieless analytics (S1-E15-01), and each language version has the right `lang` attribute and one `h1`.
- **Legal and compliance:**
  - Consumer law: "free", "no tracking ads", "you keep your rights" and the Yoti line must stay true while they are live (Law 363/2007). The Yoti line is true only while S1-E2-08 stores the result and nothing else.
  - The questions say 13 to 15-year-olds need a parent's or guardian's consent (Q8). That is now true: consent is the legal basis and S1-E2-03 is on from launch (Q15).
  - The contest block (ages 13 to 19, a prize and a partner still in brackets) needs published contest rules, and for school partners the ROFUIP art. 178(2) check in S1-E8-12. The example contest copy names no announcement date (Q10).
  - Decided (Q54): the website's CMS is new, built from scratch on its own database. For the March MVP a short version is enough (proposal): hero, safety lines, questions and the rows, with the copy in the locale files until the CMS stories land. Hosting: in the EU (Q38).

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

---
