# Open technical questions

> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

## 5. Open technical questions for the founder

Grouped by when the answer is needed. "Blocks" lists the stories that can't be finished without it. Updated 16 Oct 2026 (late evening) with Robert's answers to the 71 open questions: "Q" numbers with that date refer to that list (other Q numbers are the 120 organisation answers). **Decided** rows are settled unless Robert reopens them; **OPEN** rows still need him. A recommendation is never a decision.

### Needed before iteration 2 (November to December 2026)

| # | Question | Answer, or my recommendation | Status | Blocks |
| --- | --- | --- | --- | --- |
| 1 | **March scope.** Which lever do you pull? | We try our best without a programmer. The March slice is re-cut to an MVP of 58 stories, about 498 hours, invited adults only (section 1.13; S1-E1-06 dropped and five Must stories added on 17 Oct 2026; epic check stories added 17 Oct 2026, 12:36; minors' gate and data rights moved after March 17 Oct 2026, 12:44). Hours a week and the date stay open (34m) | Decided 16 Oct 2026, Q32 | Section 1.13 |
| 2 | **Domain and trademark** | ghemotoc.com and @ghemotoc are free. Still to do: the trademark search (OSIM, EUIPO) before filing | Decided 16 Oct 2026, Q33 (availability); trademark search OPEN | S1-E1-01, S1-E14-02, S1-E16 |
| 3 | **Company accounts** before the company exists | Open them in Robert's name with a written plan to transfer them; the plan is in section 1.11 | Decided 16 Oct 2026, Q34 | S1-E1-01, S1-E16-04 |
| 4 | **Minimum age** | 13 | Decided 15 Oct 2026 | S1-E2-02 |
| 4a | **Yoti cost and contract** | Published "Age only" GBP 0.15 (about EUR 0.18) per check, GBP 15 monthly minimum, GBP 250 (about EUR 295) set-up; ask for a written quote (Yoti and Didit emails are being drafted, Q62) | OPEN | S1-E2-08 |
| 4b | **Buffer at the 13 gate** | No Yoti table at 13; the Australian trial says at least 2 to 3 years. Decide with the DPIA | OPEN | S1-E2-08 |
| 4c | **DPIA for the Yoti check** | Needed before real users are checked | OPEN | S1-E2-08 |
| 4d | **Desktop camera on macOS and Linux** | Moot for March: the MVP is web only | OPEN, after March | S1-E2-08 |
| 5 | **GDPR legal basis** | Consent (my recommendation was contract) | Decided 16 Oct 2026, Q15; lawyer check (section 6) | S1-E2-01, S1-E2-03 |
| 6 | **Adult to 16 or 17-year-old messages** | The teen chooses; off by default; under-16s and adults never. Whether teachers' posts in class threads count is still open | Decided 16 Oct 2026, Q13 (teen); class threads OPEN | S1-E9-03 |
| 7 | **Reading in the browser** | Signed-in readers read full chapters on the web until the apps exist; right-click and copy off; writers are told; screenshots still possible. What changes on the web once the apps exist is open (34u) | Decided 16 Oct 2026, Q35 | S1-E4-04, S1-E4-06 |
| 8 | **Teaser rules** | Search engines index the title, blurb and author only, nothing else. Teaser length still open (recommendation about 600 words) | Decided 16 Oct 2026, Q36 (indexing); length OPEN | S1-E4-04 |
| 9 | **Database** | Our own Supabase project in the EU (West EU, Ireland, eu-west-1) from day one; Claude Code builds first. No move is needed, so S1-E1-06 is Won't. Lovable's role is OPEN pending a two-screen trial (research H2) | Decided 17 Oct 2026, 11:20 (replaces Q37 of 16 Oct) | S1-E1-01 |
| 10 | **Web hosting** | In the EU. Provider still open (one with EU servers, a DPA and a country header) | Decided 16 Oct 2026, Q38; provider OPEN | S1-E1-01, S1-E2-10 |
| 11 | **Tracker** | GitHub Issues, one issue per story ID | Decided 16 Oct 2026, Q39 | Workflow |

### Needed before the March test

| # | Question | Answer, or my recommendation | Status | Blocks |
| --- | --- | --- | --- | --- |
| 12 | **Mobile wrapper** | Decided with a programmer at that point (recommendation stays Capacitor) | OPEN, deferred (16 Oct 2026, Q40) | S1-E16-03, S1-E4-06 |
| 13 | **Copy protection** | Web: right-click and copy off. Apps: each platform's capture protection, so screenshots and recordings show blank where the platform allows. Per-reader watermark still open | Decided 16 Oct 2026, Q35 and Q41; watermark OPEN | S1-E4-06 |
| 14 | **Moderation vendors and the picture check** | In-house moderators only, acting on reports. Every picture checked on upload by Sightengine (nudity, gore) and Arachnid Shield (known CSAM); flagged pictures held for a moderator; both need DPAs | Decided 16 Oct 2026, Q42 and 22:59 | S1-E10-05, S1-E3-01 |
| 15 | **Hold chapters before they go public?** | No. Moderation acts on reports | Decided 16 Oct 2026, Q43 | S1-E3-03 |
| 16 | **On call for one-hour removal orders** | Robert asked if it is mandatory: yes. Regulation (EU) 2021/784, art. 3(3): removal within one hour of receiving an order; art. 1(2): applies to every hosting provider offering services in the EU; art. 15(1): a contact point; a provider's first order comes with 12 hours' notice (art. 3(2)). Checked on EUR-Lex 16 Oct 2026, high confidence. The founding team rotates on call; orders arrive at the published contact point (the one report form), not through user reports | Decided 16 Oct 2026, Q44 and 22:55 | S1-E10-02, S1-E10-09, S1-E10-10 |
| 17 | **Mature content** | Movie-style ratings: All ages, 13+, 16+, 18+, each hidden from anyone younger | Decided 16 Oct 2026, Q17 and 22:55 | S1-E3-06, S1-E5-01 |
| 18 | **Undisclosed AI** | Label and warn when several reports are confirmed as true | Decided 16 Oct 2026, Q24 | S1-E3-06 |
| 19 | **Emoji-only comments** | Never deleted automatically | Decided 16 Oct 2026, Q25 | S1-E6-01 |
| 20 | **Who can create spaces** | Anybody. Under-16 spaces take only under-16s, 16+ spaces only people 16 or over; class spaces are the exception, with the teacher. Adults read an under-16 space only if its owner made it public; members who turn 16 keep old groups only (17 Oct, 34p) | Decided 16 Oct 2026, Q26 | S1-E8-06 |
| 21 | **Forum ranking** | Latest activity, with the starting categories pinned | Decided 16 Oct 2026, Q45 | S1-E8-01, S1-E8-05 |
| 22 | **Popularity weights and a "New and rising" shelf** | Discover mixes newest, popular and more from the start; the weights get tuned with real data | Decided 16 Oct 2026, Q46 (the mix); weights OPEN | S1-E5-03 |
| 23 | **Return rate definition** | An aggregate approximation from daily totals: reads of chapter N+1 within 7 days of its release divided by reads of chapter N; no per-reader records | Decided 17 Oct 2026, 12:34 | S1-E15-02 |
| 24 | **Deleted accounts** | Forum posts stay as "Deleted user"; stories are deleted with the account | Decided 16 Oct 2026, Q47 | S1-E13-03 |
| 25 | **IP address retention** | Scrambled, kept 30 days | Decided 16 Oct 2026, Q48 | S1-E13-04 |
| 26 | **Analytics tool** | Recommendation in 34r | OPEN (Q49) | S1-E15-01 |
| 27 | **Email provider** | Recommendation in 34r | OPEN (Q49) | S1-E7-02, S1-E2-01 |
| 28 | **Pictures in forum posts and messages** | Not covered by "picture upload should work anytime"; recommendation: on for posts with the picture check, off for messages | OPEN | S1-E8-02, S1-E9-01 |
| 29 | **Follower lists** | Visible to the writer only | Decided 16 Oct 2026, Q50 | S1-E6-05 |
| 30 | **Defaults for minors** | Quiet hours for push and no marketing email | Decided 16 Oct 2026, Q50 | S1-E7-02, S1-E7-03 |
| 31 | **Profile or space banners** | Banners on spaces only | Decided 16 Oct 2026, Q50 | S1-E5-05, S1-E8-06 |
| 32 | **Seed with Romanian classics** | Yes, with any that are free (public domain) | Decided 16 Oct 2026, Q51 | S1-E5-06 |
| 33 | **Budget for backups, a penetration test and app signing** | Approved | Decided 16 Oct 2026, Q53 | Section 1.12 |
| 34 | **Content categories at launch** | Fiction, poetry and nonfiction essays; no journalism or articles at launch, the Stage 2 newsroom stays later. Replaces "journalism is a category from Stage 1" | Decided 16 Oct 2026, Q52 | S1-E3-01 |
| 34a | **Australia's under-16 law** | Closed to under-16s until a lawyer says otherwise | Decided 16 Oct 2026, Q19; lawyer check | S1-E2-10, S1-E11-05 |
| 34b | **Teacher check details**: email link lifetime, confirming a non-.edu.ro domain, keeping the domain only | Proposal: keep the domain only; avocat check | OPEN | S1-E2-11, S1-E8-11 |
| 34c | **Staff changes to a writer's story** | Staff may hide or restrict a story, fix its settings and details and remove unlawful parts. They cannot edit words | Decided 16 Oct 2026, Q14 | S1-E11-08, S1-E14-01 |
| 34d | **EPUB in data exports** | No EPUB: Word (.docx), so writers can edit it or send it to an agent | Decided 16 Oct 2026, Q28 | S1-E11-09 |
| 34e | **Data requests and under-16s** | 13 to 15-year-olds download their own data from their own account; parents are checked against the consent record | Decided 16 Oct 2026, Q27 | S1-E11-09, S1-E13-02, S1-E13-05 |
| 34f | **PDF tool** for story exports and certificates | Recommendation in 34r | OPEN (Q49) | S1-E11-09, S1-E8-12 |
| 34g | **Four eyes on the website CMS** | Decided (Q31): website copy goes live without a second approver for now; other people review copy outside the tool. Proposal: an admin approves legal and safety answers | Decided 16 Oct 2026, Q31; the admin exception OPEN | S1-E11-06, S1-E11-12 |
| 34h | **Data requests in the March slice** | Yes, the lighter version (the request log and deadline) plus Word from the beginning; PDF after | Decided 16 Oct 2026, Q29 | S1-E11-09, section 1.13 |
| 34i | **Popularity in March** | The usual ranking mixed with newest and other shelves from the start; S1-E5-03 is in the MVP | Decided 16 Oct 2026, Q46 | S1-E5-02, S1-E5-03 |
| 34j | **The website itself** | A new CMS built from scratch on the website's own database, linked neatly to the front end. From March: inside the app until the website database exists | Decided 16 Oct 2026, Q54; March part decided 17 Oct 2026, 12:34 | S1-E5-08, S1-E11-06, S1-E11-10, S1-E11-12 |
| 34k | **Picture uploads** | On from launch, with the picture check on upload (row 14) | Decided 16 Oct 2026, Q18 and 22:59 | S1-E3-01, S1-E3-09, S1-E5-05 |
| 34l | **Separate staff accounts** | Staff log in only with company SSO; they may also have a separate personal account | Decided 16 Oct 2026, Q30 | S1-E2-07, S1-E11-01 |
| 34m | **Hours a week and the March date** | Decided 17 Oct 2026: the stories keep the best functional MVP (section 1.13); hours a week or the test date are decided in November | Decided 17 Oct 2026 | Section 1.13 |
| 34n | **Staff SSO identity provider** | Decided 17 Oct 2026: Google Workspace, with Google's own 2-Step Verification as the only second factor (decided 17 Oct 2026, 11:53); no separate code | Decided 17 Oct 2026 | S1-E2-07 |
| 34o | **Desktop app after March** | Decided 17 Oct 2026: March is web only; the desktop and phone apps come after (replaces desktop first, 15 Oct) | Decided 17 Oct 2026 | S1-E16-02, S1-E3-08, S1-E4-09 |
| 34p | **Under-16 spaces** | Decided 17 Oct 2026: adults can read one only if its owner made it public to everybody; a member who turns 16 stays in groups joined before but can't start or join under-16 groups. Open: what happens when the owner turns 16 (proposal: they hand the space over) | Decided 17 Oct 2026 | S1-E8-06 |
| 34q | **Teacher's signature on certificates** | Proposal: the teacher's logged approval prints their name as signatory, "signed electronically" | OPEN | S1-E8-12 |
| 34r | **Analytics, email and file tools** (Robert asked "What do you recommend?") | My recommendation, not a decision: Plausible or Umami Cloud (EU) for cookieless analytics; Brevo (French, EU) for transactional email; the `docx` npm library for Word files; `pdf-lib` for certificates. PDF for stories stays open | Recommendation, waiting for Robert (Q49) | S1-E15-01, S1-E7-02, S1-E11-09, S1-E8-12 |
| 34s | **Ad network** (S1-E12-04): which vendor can serve non-personalised ads without cookies or device storage | Proposal: our own banners until a vendor can promise that | OPEN | S1-E12-04 |
| 34t | **Helpdesk product** (ready-made, EU-hosted) | Pick one with EU hosting, a DPA and no tracking script on our pages | OPEN | S1-E14-04 |
| 34u | **"Until we create the apps"**: does it mean the phone apps (the desktop app also counts as an app), and what changes on the web then | Proposal: the phone apps; decide before they ship | OPEN | S1-E4-04 |

### Also decided with the 71 answers (16 Oct 2026, late evening)

| Topic | Decision | Q | Stories |
| --- | --- | --- | --- |
| Age | Year of birth, then the month when the year leaves the age unclear at 13 or 16 | Q16 | S1-E2-02 |
| Country | Read from the connection, never asked | Q20 | S1-E2-10 |
| Usernames | Any character; block swearwords (English and Romanian lists, moderators can approve false hits), staff look-alikes and confusable characters; normalised for web addresses | Q21, 22:55 | S1-E2-04 |
| Embeds | "Lumo" is Loom | Q22 | S1-E3-10 |
| Certificates | Co-signed by Ghemotoc and the teacher leading the contest or class | Q23, Q71 | S1-E8-12 |
| New-account chat limit | Dropped (replaces the earlier limit for new accounts) | Q61 | S1-E9-01 |
| Helpdesk | A ready-made helpdesk hosted in the EU, with a Contact us story | Q60 | S1-E14-04 |
| Ad labels | "Ad" for ad-network ads (vendors that don't personalise, for everyone); "Sponsored" for direct sponsors | Q7, 22:55 | S1-E12-01, S1-E12-02, S1-E12-04 |
| Messaging wording | Off by default for 16 and 17-year-olds; never between under-16s and adults | Q6 | S1-E5-08, S1-E2-06 |
| Consent wording | "Parent or guardian" | Q8 | S1-E2-03 |
| Copy protection wording | "Makes copying harder" | Q9 | S1-E4-06 |
| Language switch | A drop-down in the top bar and the footer | Q11 | S1-E1-04 |
| Class spaces | Lock at the end of the academic year; members keep reading access while their account exists; no ads, sponsored items or sponsor credits | Q69, Q70 | S1-E8-11 |
| School pilot | Maybe a pilot around March, as a writing club, the contest or both; no inspectorate before autumn 2027 | Q65 to Q67 | S1-E8-11, S1-E8-12 |
| Shelves | One scrolling line of at most 20, then "View more" to a See all page | 23:00 | DoD, S1-E5-09 |

### Later stages (no need to answer now)

| # | Question | Stage |
| --- | --- | --- |
| 35 | Credits on iOS and Android: in-app purchase or EU and US link-outs? Merchant of record and VAT (OSS)? | 2 |
| 36 | Country price tiers (3 or 4 by purchasing power) | 2 |
| 37 | Under-16s and newsletter subscriptions; who is controller of a writer's subscriber list | 2 |
| 38 | Personalised feed: share of discovery slots and legal basis for using reading history | 2 |
| 39 | Payout model and provider (off-platform only, Stripe Connect, Payoneer, Wise, Trolley, Tipalti, dLocal) | 3 |
| 40 | KYC vendor, high-risk country list and minimum freelancer age | 3 |
| 41 | Publisher pricing (subscription, credits or both); how under-18 writers receive offers | 4 |
| 42 | Plagiarism scanner for acquired manuscripts | 5 |
| 43 | Build or adopt Open Journal Systems; DOI tombstones versus the right to erase | 6 |
| 44 | NGO name and whether it reuses the platform code under licence | 7 |
| 45 | Supporter money (decided 16 Oct 2026, a later stage, not Stage 1 and not the March slice): writers are paid only from paying supporters, none from free use; user-centric formula B (each supporter's writer share is split between the writers that supporter read); of a €5 subscription, €2 goes to writers and €3 is kept; a monthly report a month later and writers withdraw any time; only writers in the writer programme are paid (18+, living in a payout country, 1,000+ followers). Still open: a fixed €2 or 40% of what's left after VAT and app-store fees, and where the share for writers outside the programme goes | Later |

---

### Raised by the end-to-end check (17 Oct 2026)

Questions 1, 2, 4, 8 and 9 were answered by Robert on 17 Oct 2026, 12:34, and 3, 5, 6, 7, 11 and 12 at 12:44; question 10 (hosting) is still **OPEN** while a comparison is prepared. The options are the checker's; any recommendation is not a decision. Until answered, a prompt that touches an open one stops and asks.

Follow-up from the answers (not a decision): S1-E13-02 now builds the shared Word builder (about 18 hours moved from S1-E11-09a), so its size M may need to become L and 09a may shrink; the MVP total is unchanged.

| # | Question | Options | What each changes |
| --- | --- | --- | --- |
| 1 | What is in "Download my data"? | a) JSON plus readable HTML (story S1-E13-02); b) JSON plus Word files; c) Word only (board, Q28 read literally) | **Answered:** b) one ZIP with a machine-readable JSON file of everything about the account plus every story as a Word (.docx) file, reusing the shared Word builder (built in S1-E13-02, reused by S1-E11-09a). Decided 17 Oct 2026, 12:34 |
| 2 | Can staff doing a manual age check see the year of birth? | a) yes, as S1-E2-08 says; b) no, age group only, as architecture 1.8.3 says | **Answered:** a) yes: staff handling a manual age check see the year of birth with the age group; named exception in architecture 1.8.3; the record of processing must say so. Decided 17 Oct 2026, 12:34 |
| 3 | Where do notice banners show? | a) website only (S1-E11-10); b) website and app (AdminPages board) | **Answered:** b) on the website and in the app, from one table; in March that table is in the app's database. Decided 17 Oct 2026, 12:44 |
| 4 | Who can enter the First Chapter contest? | a) 13 to 19, with an "oldest age" field (AdminPages draws one, "proposal"); b) the age groups only (13 to 15, 16 to 17, 18 and over) | **Answered:** that contest is scrapped for now (a campaign for later). S1-E11-14 and S1-E11-15 stay as features (Should, after March) without a named first contest; who can enter uses the platform age groups (13 to 15, 16 to 17, 18 and over). Decided 17 Oct 2026, 12:34 |
| 5 | Certificates print a name the student types. CLAUDE.md rule 5 says store no legal names | a) allow it as a named exception, stored only on the certificate; b) print the pen name only; c) use the typed name to make the PDF and never store it | **Answered:** a class certificate may print the student's real name with the school name, stored only with the certificate and deleted 30 days after the class is archived; the teacher is told in the app and by email to keep copies; other certificates use the pen name. Decided 17 Oct 2026, 12:44 |
| 6 | Content editors and Classics | a) content editors may open Stories › Classics only; b) move Classics under Website; c) admins only | **Answered:** c) only staff with the admin role manage Classics; content editors will also hold the admin role. Decided 17 Oct 2026, 12:44 |
| 7 | S1-E10-13 (MVP) needs monthly support tickets (S1-E11-13, after March) and an editing screen in admin Settings (S1-E11-03, after March) | a) for March, the monthly job emails hello@themagiccoffin.com and contacts change by migration; b) move S1-E11-13a into the MVP (about 15 to 30 hours); c) a monthly calendar reminder and migrations | **Answered:** split S1-E10-13: 13a in March, seeded from research G4 (content/safety-contacts.json); 13b after March, the editing screen and the monthly check with its ticket, from go-live. Decided 17 Oct 2026, 12:44 |
| 8 | S1-E5-08 (MVP) needs the website's own database, which is OPEN | a) set up the website database before March; b) for March, the short page reads copy from the locale files and the app's `public-shelves`, with the CMS stories after; c) drop S1-E5-08 from the MVP (about 12 hours) | **Answered:** b) for March the home page lives inside the web app: copy from the locale files, rows from the app's own public views or `public-shelves`; the CMS stories and the website database come later. Decided 17 Oct 2026, 12:34 |
| 9 | The March return rate needs per-reader reads, but `chapter_reads` is daily totals (architecture 1.6 and 1.7.9 say totals are enough; they aren't) | a) keep per-reader read records for a short window (for example 30 days), then only totals; b) change the metric to an aggregate (reads of N+1 divided by reads of N); c) build the library (S1-E4-03) before March | **Answered:** b) only aggregated data, never per-reader records; return rate = reads of chapter N+1 within 7 days of its release divided by reads of chapter N, labelled an approximation; aggregated metrics kept 3 years. Decided 17 Oct 2026, 12:34 |
| 10 | Hosting provider (Q38) is OPEN, but S1-E2-10 (MVP) needs its country header and every story's "Done on staging" needs a host | Choose in November with the hours decision | **Still OPEN:** a hosting comparison is being prepared |
| 11 | Two ads in view at once on wide screens (forum thread, Discover) | Allow or not (S1-E12-01) | **Answered:** allowed; when two ads are in view they are always different (never the same ad twice; a sponsor, a house ad and a network ad each count as different). Decided 17 Oct 2026, 12:44 |
| 12 | Sort order A to Z with ă, â, î, ș, ț and the six reaction emoji | Confirm in the S1-E5-02 and S1-E6-02 plans | **Answered:** A to Z follows Romanian alphabetical order (Intl.Collator('ro') or the ICU collation "ro-x-icu"); the reaction set is the six on the Reader board. Decided 17 Oct 2026, 12:44 |
