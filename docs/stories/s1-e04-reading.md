> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E4 Reading

**Back end and build order:** section 1.7, group C (screens 3.4 to 3.9), wave 2.

Goal: excellent reading on phones and desktops (investor condition 2), with honest copy protection.

##### S1-E4-01 Chapter reader

As a reader, I want a clean, fast chapter page so that I can read without distractions.

- **Priority:** Must · **Size:** L · **Depends on:** S1-E3-03, S1-E1-03
- **Acceptance criteria:**
  - Given a chapter, when it is opened, then the text is rendered as real, selectable-by-assistive-technology HTML text (never canvas or images), with previous, next and contents navigation.
  - Given a mid-range Android phone on 4G, when a chapter opens, then the text is readable within 2 seconds (proposal).
  - Given a 320px wide screen or 200% zoom, when the chapter is read, then nothing needs horizontal scrolling.
  - Given the banner slot, when it is shown, then it sits only below the chapter text, never inside it (S1-E12-01).
- **Legal and compliance:** WCAG 2.2 AA criteria 1.4.10 (reflow) and 1.4.4 (resize text).

##### S1-E4-02 Reading settings

As a reader, I want to change font, size, spacing and theme so that reading is comfortable for me.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E4-01
- **Acceptance criteria:**
  - Given reading settings, when they open, then the reader can choose font (including a dyslexia-friendly option), text size, line spacing, line width and light, sepia or night theme.
  - Given a signed-in reader, when they change a setting, then it is saved to their account and applied on every device.
  - Given the operating system's larger text setting, when the app opens, then the default size follows it.
- **Legal and compliance:** WCAG 2.2 criterion 1.4.12 (text spacing). Answers Q98 on building accessibility in from Stage 1.

##### S1-E4-03 Library and continue reading

As a reader, I want my place saved and a list of stories I'm reading so that I can pick up where I left off.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E4-01
- **Acceptance criteria:**
  - Given a reader scrolls a chapter, when they leave, then their position is saved and offered on any device next time.
  - Given the library, when it opens, then it shows "Reading", "Saved for later" and "Finished" lists.
  - Given the library, when anyone else views the reader's profile, then the library is private by default.
  - Given story cards in the library, when covers are shown, then the full title fits on every drawn or automatic cover (Definition of Done, design rules) and stories without a cover use their automatic cover once S1-E3-13 is live.
  - Given a library list with more than 20 stories, when it is shown as a shelf, then it is one scrolling line of at most 20 with a "View more" card that opens its See all page (S1-E5-09; Definition of Done, design rules).
- **Legal and compliance:** reading history is personal data; it is never shared with advertisers or sponsors.

##### S1-E4-04 Web teaser for shared links

As someone who taps a shared link, I want to read the first part of a chapter in my browser so that I can decide whether to sign up or install the app.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E4-01; S1-E11-03 for the `teaser_length` flag (a seeded default until then)
- **Updated:** 16 Oct 2026, late evening: full web reading for signed-in readers (Q35) and the search engine rule (Q36).
- **Acceptance criteria:**
  - Given a signed-in reader whose age allows the story, when they open a chapter in the browser, then they can read the whole chapter on the web until the apps exist (decided 16 Oct 2026, late evening, Q35); writers are told this when they publish (S1-E4-06).
  - Given a signed-out visitor, when they open a chapter link in a browser, then they see the story blurb and the first one to two pages, followed by a prompt to sign up or open the app.
  - Given a link is pasted into WhatsApp, Instagram or TikTok, when the preview loads, then it shows the title, pen name, blurb and cover from server-rendered Open Graph tags.
  - Given a story rated 16+ or 18+, when a signed-out visitor opens it, then no teaser text and no cover text beyond the title are shown (signed-out visitors count as under 16, proposal).
  - Given search engines, when they crawl the site, then only story pages are indexable and they show the title, the blurb and the author's pen name or handle; chapter and teaser pages carry `noindex`, and chapter text never appears in structured data or the sitemap (decided 16 Oct 2026, late evening, Q36).
  - Given a story with a drawn or automatic cover, when the link preview image is made, then the full title fits on it (Definition of Done, design rules).
- **Legal and compliance:** decided: full web reading for signed-in readers until the apps exist (Q35, replacing the earlier Q5 answer for this period) and title, blurb and author only for search engines (Q36). Still **OPEN**: the teaser length (proposal about 600 words; Q1 says one to two pages) and what changes on the web once the apps exist.

##### S1-E4-05 Share a chapter

As a reader, I want to share a chapter link so that my friends can find the story.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E4-04
- **Acceptance criteria:**
  - Given the share button, when it is tapped on a phone, then the system share sheet opens; on desktop, the link is copied.
  - Given a shared link, when it is generated, then it carries no identifier of the person who shared it.
  - Given a share, when it happens, then an aggregate share count is updated for popularity ranking.
- **Legal and compliance:** no tracking parameters, in line with the no-tracking ad rule.

##### S1-E4-06 Copy protection and traceability

As a writer, I want Ghemotoc to make copying my chapters harder and leaks traceable so that I feel safe publishing here.

- **Priority:** Should (06a Must for March) · **Size:** L (split: 06a the web, S, in the March MVP; 06b the apps, after March) · **Depends on:** S1-E4-01; S1-E16-02 for 06b
- **Updated:** 16 Oct 2026, late evening (Q9, Q35 and Q41).
- **Acceptance criteria:**
  - Given a chapter on the web (06a), when a reader right-clicks or tries to copy chapter text, then the context menu and copying are switched off for the chapter text and a short note says the writer's work is protected; screen readers, zoom and the reader's own text size still work (decided 16 Oct 2026, late evening, Q35).
  - Given a writer publishing a story (06a), when they reach Publish, then a line tells them that signed-in readers can read it in the browser until the apps exist, that copying is made harder and that screenshots still work on the web.
  - Given the desktop app on Windows or macOS (06b), when a chapter is open, then Tauri content protection keeps the window out of screenshots and recordings, so they come out blank; on Linux, which has no reliable block, text blurs when the window loses focus (the plan's route in master-plan/01, proposal; Q41 covers each platform's own protection).
  - Given the Android app, when the reader screen is open, then screen capture is blocked for that screen only, after a TalkBack and magnifier test confirms accessibility still works.
  - Given the iOS app, when recording or mirroring is detected, then chapter text is hidden until it stops.
  - Given any copy in the product or store listings, when it describes protection, then it says "makes copying harder" (Q9), never "can't be copied" or "screenshots are blocked".
- **Legal and compliance:** decided: right-click and copy off on the web; each platform's own capture protection in the apps (Q41). CTO note: iOS cannot block an ordinary screenshot without the unofficial trick, only hide text during recording or mirroring, so the copy must not promise more. Blocking copy must not block assistive technology (WCAG 2.2). Still **OPEN**: which per-reader watermark technique to use. A watermark that identifies a reader is pseudonymous personal data and must be named in the privacy notice. The unofficial iOS secure-field trick is not used unless the founder decides otherwise, because it can break with any iOS update.

##### S1-E4-07 Quote-share card

As a reader, I want to turn a short passage into a branded image so that I can share it on social media.

- **Priority:** Could · **Size:** M · **Depends on:** S1-E4-01
- **Acceptance criteria:**
  - Given a reader selects up to 280 characters, when they tap "Share quote", then an image is created with the passage, title, pen name and link, plus alt text.
  - Given the reader has already shared one card from this chapter, when they try again, then a pop-up explains the limit of one per chapter (Q17).
  - Given a writer switches quote cards off for their story, when a reader selects text, then the option does not appear.
  - Given the quote card, when the person picks a background, then the default is plain brand purple with no gold glow, and they can also choose one of our palette colours, the story cover or their own picture; covers and pictures are always blurred so the words stay readable, and their own picture passes the image check (S1-E10-05) first (Robert, canvas comments, 16 Oct 2026).
  - Given the quote card is made, when it is shown, then it comes with alt text we write for the person ("We wrote this for you").
- **Legal and compliance:** quoting a short extract with attribution sits within the quotation exception, but the writer's switch respects their choice. The person must have the right to use their own picture. A higher limit is a possible supporter perk (OPEN), and supporters are a later stage, not in Stage 1.

##### S1-E4-08 Offline reading in the apps

As a reader on a commute, I want to download chapters inside the app so that I can read without a connection.

- **Priority:** Could · **Size:** L · **Depends on:** S1-E16-03
- **Acceptance criteria:**
  - Given a story, when the reader taps "Download", then chapters are stored encrypted inside the app's private storage, not as files the user can open elsewhere (Q19).
  - Given a downloaded chapter, when 30 days pass (proposal) or the reader signs out, then it is removed.
  - Given the web app, when a reader looks for "Download", then the option is not offered.
- **Legal and compliance:** the research marks offline reading as a strong candidate for Stage 1b.


##### S1-E4-09 "Only in the app" notice on the web

As a web visitor, I want to understand why I can't read a story in the browser so that I know what to do next.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E3-08; S1-E16-02 for "Open in the app" (the deep link)
- **Added:** 16 Oct 2026, Robert's decision (chat).
- **Acceptance criteria:**
  - Given an app-only story on the web, when a visitor opens a chapter, then a dialog says "This story is only in the app" and explains in plain words that the writer chose the app for more privacy and more control over their work.
  - Given the dialog, when it shows, then it offers "Get the app", "Open in the app" (works only if the app is installed, through a deep link) and "Back to the story".
  - Given a phone browser before phone apps exist, when the dialog shows, then it says the app is for Windows, macOS and Linux for now and offers to email a reminder (OPEN: whether to keep that email).
- **Legal and compliance:** the wording must not promise copy-proofing; accessible dialog (focus trapped, Escape closes).

##### S1-E4-10 Any font on your device, in the apps

As a reader using a downloaded app, I want to pick any font installed on my device so that I can read in the font that works best for me.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E4-02, S1-E16-02
- **Added:** 16 Oct 2026, Robert's decision (chat).
- **Acceptance criteria:**
  - Given the Windows, macOS or Linux app (and later iOS and Android), when the reader opens reading settings, then they can search and pick any font installed on that device.
  - Given the browser, when the reader opens reading settings, then they choose from our small set of fonts, including one dyslexia-friendly font.
  - Given a reader whose chosen device font is missing on another device, when they open a chapter there, then the closest of our fonts is used and their choice is kept for the device that has it.
- **Legal and compliance:** the font list is read on the device only and never sent to us (it can work as a fingerprint).

##### S1-E4-11 Share a passage or a picture

As a reader or writer, I want to share a passage or a picture from a chapter, like on Substack, so that friends can see exactly the part I liked.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E4-05, S1-E4-07, S1-E3-09
- **Added:** 16 Oct 2026, Robert's canvas comment.
- **Acceptance criteria:**
  - Given a reader selects lines or taps a picture in a chapter, when they press Share, then they can share a link to that spot, a quote card (S1-E4-07) or a picture card with the writer's name.
  - Given a link to a spot, when someone opens it, then the chapter opens at that paragraph with the passage highlighted, and the link preview shows the passage instead of the blurb.
  - Given the writer turns sharing off for a story or for their pictures, when a reader selects text or a picture, then the share options for it do not appear.
  - Given an app-only (S1-E3-08) story or one rated 16+ or 18+, when someone shares from it, then only a plain link goes out, with no text or picture in the card or preview.
- **Legal and compliance:** short extracts with attribution fit the quotation exception; the writer's switch respects their choice. Pictures shared outside only after the image check has passed. Links carry no tracking code and nothing that identifies who shared them.

##### S1-E4-QA Epic check: Reading

As the founder, I want every story in this epic tested together end to end so that the pieces work with each other, not just alone.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E4-01, S1-E4-04, S1-E4-06a
- **Added:** 17 Oct 2026, 12:36 (Robert, chat): every epic ends with a quality-check story, and every prompt has a quality check built in. It covers the epic's March MVP stories and comes last among them in the build order. The epic's after-March stories (S1-E4-02, S1-E4-03, S1-E4-05, S1-E4-07, S1-E4-08, S1-E4-09, S1-E4-10, S1-E4-11) get the same check when they land (proposal).
- **Main journeys:** a signed-in reader opens a chapter and moves through it; a signed-out visitor opens a shared link and sees the teaser; copying is switched off on the web.
- **Acceptance criteria:**
  - Given the epic's stories are merged, when the end-to-end suite runs, then Playwright tests walk the main journeys across those stories with the seed personas `adult_writer`, `teen_17`, `kid_14_ok` and `kid_14_waiting`, and every journey passes.
  - Given a journey breaks where two stories meet, when it is found, then it is fixed in this pull request or ticketed as a GitHub issue that names the stories involved.
  - Given every screen in the epic, when axe runs at 390, 768 and 1440 px wide, then it reports no serious or critical issues.
  - Given the RLS tests, when they run as one suite (`npx supabase test db`), then every policy on every table the epic touches has an allowed and a denied test, with no gaps.
  - Given `docs/code-tour.md`, when it is read, then it covers the epic: where its screens, hooks, tables, functions and jobs live and how one main journey travels through them.
  - Given the check is finished, when the pull request is opened, then it includes a short epic report listing what works, the known gaps and every stub or mock still on (with the story that removes it, `docs/mocks.md`).
- **Legal and compliance:** minors' journeys are tested with the under-16 (`kid_14_ok`, `kid_14_waiting`) and 16 to 17 (`teen_17`) personas, so the age gate, ratings, blocks and under-18 defaults are proved across stories, not only inside each one. In March only invited adults sign up (`adults_only`, decided 17 Oct 2026, 12:44), so the minor personas are seed data that prove these protections are ready before minors are let in. The test data is the seed personas only, never real user data (CLAUDE.md, Safety while building).

---
