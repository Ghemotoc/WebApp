> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E12 Banners and sponsor slots

**Back end and build order:** section 1.7, groups G (7.5) and H (8.8), after the March slice.

Decided: contextual banners, no tracking, never inside chapter text or full screen, everyone sees the same kind of banners. Sponsors are the early money. Decided 16 Oct 2026 (late evening): ad-network ads are allowed only from vendors that don't personalise, for everyone (S1-E12-04); ad-network ads are labelled "Ad" and direct sponsors "Sponsored" (Q7); no ads or sponsors inside class spaces (Q70). Decided 17 Oct 2026 (Robert, chat and canvas comments): ads show on every public page, but never too many; neutral ads; a big banner on Discover, a portrait ad on Search and ads in forums. In a forum thread the ad sits below the reply box, never between replies (canvas comment, 17 Oct, replacing "between forum replies" from earlier that morning). Library shows ads too, and side ads go on the forum thread, Forums, the app-only story page and Search. Writers get no share of ad or sponsor income (decided 17 Oct 2026, 10:23). The per-page limits are a proposal in S1-E12-01, waiting for Robert. Banners come after the March MVP.

##### S1-E12-01 Contextual banner slot

As a reader, I want ads that never interrupt my reading and never track me so that the app stays free and calm.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E4-01
- **Acceptance criteria:**
  - Given a chapter, when it is shown, then at most one banner appears below the text and in story lists, never inside text, as a pop-up or full screen.
  - Given a banner is chosen, when the server picks it, then it uses only page context (category, tag, language) and no user data, cookies or device identifiers.
  - Given any banner, when it is shown, then a direct sponsor's banner is labelled "Sponsored" ("Sponsorizat") with the sponsor's name and an ad-network ad is labelled "Ad" ("Reclamă") (decided 16 Oct 2026, late evening, Q7); "Why this ad?" explains it matches the page and was not chosen from anything about the reader.
  - Given a class space, when any page in it is shown, then no banner slot is shown (Q70).
  - Given a public page (Discover, Search, Classics, See all, Story page, shared-link teaser, app-only story page, Forums, forum thread, public spaces, writer profile, Library, chapter end; Library added 17 Oct 2026, Robert), when it is shown, then it has at least one ad slot (decided 17 Oct 2026). Pages that are not public (sign-up, log in, age check, parent consent, onboarding, writer tools, Messages, Notifications, Settings, reporting and appeals, legal and help, error and staff pages) and class spaces have none.
  - Given any page, when ads are placed, then there are at most 2 ad slots on it (decided 17 Oct 2026, 11:53). Never more than one in view at a time, never two next to each other, and never above the page heading or the first row of content remain a proposal (canvas 7.5). **OPEN (known conflict):** a forum thread (one ad below the reply box plus a side ad on desktop, decided 17 Oct) and Discover (the big banner plus the sponsored card, canvas 3.1) can put two ads in view at once on a wide screen; Robert to confirm whether that is allowed.
  - Given a forum thread, when it is shown, then its ad slots are one wide ad below the reply box and one side ad on desktop; no ads between replies (Robert, canvas comment, 17 Oct 2026, replaces "after the 3rd reply"). Canvas 7.5 (Ad formats) still shows a "Between forum replies" format and "the first ad comes after the 3rd reply"; the decision wins and the board needs the same change (mismatch found by the fact-check). In story lists and grids, at most one ad card per 12 items and never in the first position (proposal).
  - Given the formats, when a slot is drawn, then it is a wide banner (full content width up to 970 px, 120 px tall on desktop, 100 px on phones), a portrait (300 × 600, desktop side column only, from 1200 px wide), a side box (300 × 250, desktop side column only; shown on canvas 5.1, not on 7.5) or an in-list card the size of a story card; every slot reserves its space so the page doesn't jump when the ad loads.
- **Legal and compliance:** DSA Art 26 (ad labelling) and Art 28(2) (no profiling ads to minors) applied as good practice. Ad-network ads are S1-E12-04.

##### S1-E12-02 Sponsor campaigns and "Sponsored" placements

As the founder, I want to set up a sponsor's banner and a sponsored category or contest so that I can sell the first direct sponsorship.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E11-01, S1-E12-01
- **Acceptance criteria:**
  - Given admin, when staff create a campaign, then they enter sponsor, creative image with alt text, link, placement (category, contest or featured slot) and dates.
  - Given a creative is submitted, when it is reviewed, then staff confirm it is suitable for minors (no alcohol, gambling, tobacco, dating or similar) before it can go live.
  - Given a sponsored category or contest, when it is shown, then the line "Sponsored by <sponsor>" appears without changing which stories are listed or how they are ranked (decided 16 Oct 2026, late evening, Q7: "Sponsored" for direct sponsors such as Cărturești or a ministry).
  - Given a class space, when staff try to place a sponsor, a sponsored item or a sponsor credit there, then they can't (Q70).
- **Legal and compliance:** sponsors have no say over what the platform publishes, ranks or removes (Q16 wording); put it in every sponsor contract. Romanian rules restrict some advertising to minors.

##### S1-E12-03 Sponsor reporting

As a sponsor, I want a simple report of impressions and clicks so that I can see what I paid for.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E12-02
- **Acceptance criteria:**
  - Given a live campaign, when impressions and clicks occur, then they are counted per day on the server without cookies or user IDs.
  - Given admin, when staff export a campaign report, then it is a CSV of daily totals.
- **Legal and compliance:** aggregate counts only.

##### S1-E12-04 Ad-network ads that are never personalised

As the founder, I want to fill unsold banner slots from an ad network that never personalises ads so that the app earns money without tracking anyone.

- **Priority:** Could · **Size:** M · **Depends on:** S1-E12-01, S1-E14-03
- **Added:** 16 Oct 2026, late evening (Q7 and the 22:55 decision: only ad-network vendors that don't personalise, for everyone).
- **Acceptance criteria:**
  - Given an ad network, when it is chosen, then it can serve non-personalised ads only, for every reader of every age, and staff can block categories unsuitable for minors (alcohol, gambling, dating and similar).
  - Given an ad-network ad, when it is shown, then it sits only in the banner slot (S1-E12-01), is labelled "Ad" ("Reclamă"), never appears inside chapter text, full screen or in a class space, and loads only when the slot comes into view.
  - Given the ad network's code, when it loads, then it sets no cookie and reads no device storage unless the reader has agreed; if the vendor can't promise that, the slot shows our own banners instead (proposal).
  - Given the CI no-cookie check (S1-E14-03), when the ad code is added, then it goes through an ADR and the processor list.
- **Legal and compliance:** this changes the earlier "no third-party ad networks" stance (Won't, Q87) and must keep the "no tracking ads" promise true (Law 363/2007). Non-personalised ads from big networks may still use cookies or device storage for frequency capping and fraud checks, which needs consent under ePrivacy art. 5(3) and would end the "no cookie banner" position. DSA Art 26 and 28(2). On the lawyer's list (section 6).


---

##### S1-E12-05 Ad slot booking and fill order

As an admin, I want to book a sponsor into a specific ad slot for specific dates, and let the ad network fill everything else automatically, so that we sell sponsorships without clashing and the slots are never empty.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E12-01, S1-E12-02, S1-E12-04
- **Added:** 17 Oct 2026 at Robert's request ("a modality for us to be able to put the sponsored ads, because the normal ads are done automatically by the provider"). Canvas 8.8, Placements section.
- **Acceptance criteria:**
  - Given Sponsors › Placements, when staff open it, then they see every ad slot on every public page (at most 2 per page, S1-E12-01) against the next six weeks, each cell showing Booked (sponsor and campaign), House ad, Ad network or Free.
  - Given an approved campaign, when staff book it, then they pick the slot, the dates and the page context it should match (category, tag, language); a slot already booked for overlapping dates is refused with the clash shown (one sponsor per slot per date, proposal).
  - Given a page loads, when the server fills a slot, then it uses this order every time: 1. the sponsor booked for that slot and date whose context matches ("Sponsored"); 2. a house ad for our own contest or landing page; 3. the ad network, only if S1-E12-04 is switched on ("Ad"); 4. otherwise a house ad, so the reserved space is never blank.
  - Given the ad network, when it fills a slot, then it receives nothing about the reader; the slot request carries only the page context.
  - Given a class space, when Placements lists slots, then none exist there (Q70).
  - Given house ads, when staff add one, then it has English and Română copy, a link to one of our own pages and dates.
  - Given a booking, when it is made, changed or cancelled, then the audit log records it.
- **Legal and compliance:** "Sponsored" and "Ad" labels (Q7); never personalised; no profiling ads to minors (DSA art. 28(2) as good practice); every sponsor creative still passes the minors check in S1-E12-02.

---
