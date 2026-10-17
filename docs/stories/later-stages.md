> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

### Stage 2: Newsroom (epics and key stories)

Scope: a newspaper-style section with a personalised feed (people you follow plus discovery of new writers) and newsletters. Writers get one free newsletter a month and buy credits for more. Journalism is not a Stage 1 category (decided 16 Oct 2026, late evening, Q52); it arrives with the newsroom. The founder also floated calling this Stage 1.5.

Epic level only. Each story needs refinement against the Definition of Ready before it is built.

**Story count:** 13 stories in 4 epics.

---

#### S2-E1 Newsroom section and journalism tools

##### S2-E1-01 Newsroom front page

As a reader, I want a newspaper-style front page for journalism and essays so that news pieces are not lost among fiction.

- **Priority:** Must · **Size:** L · **Depends on:** S1-E5-01
- **Acceptance criteria:**
  - Given published journalism, when the newsroom opens, then pieces are grouped into sections (OPEN: section list) with a lead story and a latest list.
  - Given a staff pick, when it is shown, then it is labelled "Staff pick" and chosen against written criteria (proposal; Robert's Q68 answer: staff picks come later and an algorithm shows what people like).
- **Legal and compliance:** sponsors have no say over placement (Q16 firewall wording).

##### S2-E1-02 Article format and corrections

As a journalist, I want article fields (standfirst, byline, sources, published and updated dates) and a corrections log so that readers can trust my reporting.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E3-02
- **Acceptance criteria:**
  - Given an article, when it is published, then it shows standfirst, pen-name byline, sources section and publish date.
  - Given a correction, when the journalist adds it, then a dated note appears at the top and in a public corrections log.
- **Legal and compliance:** the platform hosts; writers publish at their own risk of litigation (Q33), stated in the terms.

##### S2-E1-03 Graphic content notices

As a reader, I want a warning before graphic images or descriptions so that I can choose whether to see them.

- **Priority:** Must · **Size:** S · **Depends on:** S2-E1-02
- **Acceptance criteria:**
  - Given a piece marked graphic, when a reader opens it, then a notice is shown first (Q39) and under-18 readers can't open it.
- **Legal and compliance:** minors' protection (DSA Art 28 as good practice).

##### S2-E1-04 Propaganda and coordinated deception policy tools

As a moderator, I want tools to investigate and act on coordinated propaganda or phishing so that the newsroom is not abused.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E10-03
- **Acceptance criteria:**
  - Given a suspected campaign, when a moderator links several accounts to one case, then they can act on all of them together and pause their newsletter sending at once.
- **Legal and compliance:** the propaganda policy itself is promised in Q36 but not written: OPEN.

---

#### S2-E2 Personalised feed

##### S2-E2-01 Following feed

As a reader, I want a feed of new pieces from people I follow so that I see their work first.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E6-05
- **Acceptance criteria:**
  - Given followed writers publish, when the reader opens the feed, then their pieces appear newest first.
- **Legal and compliance:** none beyond the global checklist.

##### S2-E2-02 Discovery of new writers in the feed

As a reader, I want new writers mixed into my feed so that I discover voices I don't yet follow.

- **Priority:** Must · **Size:** L · **Depends on:** S2-E2-01, S1-E5-03
- **Acceptance criteria:**
  - Given the feed, when it is built, then a share of slots (OPEN: proportion) goes to writers the reader doesn't follow, based on categories and tags the reader chose or read.
  - Given an under-18 reader, when discovery runs, then only stated preferences and non-sensitive reading signals are used and stories rated above the reader's age (16+ or 18+) are excluded.
- **Legal and compliance:** a personalised feed is profiling under GDPR. DSA Art 27 and Art 38 (Art 38 to verify) point to explaining the signals and offering a non-profiled option (S2-E2-03). Legal basis for using reading history is OPEN.

##### S2-E2-03 Non-personalised feed option

As a reader, I want to switch the feed to chronological so that I am not profiled if I don't want to be.

- **Priority:** Must · **Size:** S · **Depends on:** S2-E2-02
- **Acceptance criteria:**
  - Given feed settings, when the reader picks "Chronological", then the feed uses follows and recency only, and the choice persists.
  - Given an under-18 reader, when the account is created, then chronological is the default (my proposal; OPEN).
- **Legal and compliance:** GDPR Art 21 right to object; DSA Art 38 as good practice (to verify).

##### S2-E2-04 "Why am I seeing this?"

As a reader, I want to know why a piece is in my feed so that I can trust it.

- **Priority:** Should · **Size:** S · **Depends on:** S2-E2-02
- **Acceptance criteria:**
  - Given any discovery item, when the reader taps "Why?", then they see the reason in plain words (for example "You read poetry").
- **Legal and compliance:** DSA Art 27 transparency.

---

#### S2-E3 Newsletters

##### S2-E3-01 Subscribe to a writer's newsletter

As a reader, I want to subscribe to a writer's newsletter by email so that new pieces reach my inbox.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E7-02
- **Acceptance criteria:**
  - Given a writer's profile, when a reader subscribes, then a double opt-in email confirms the subscription.
  - Given any newsletter, when it is sent, then it carries a one-click unsubscribe link and header.
- **Legal and compliance:** consent for email (Romanian Law 506/2004, GDPR Art 7). Whether under-16s can subscribe without parental consent is OPEN.

##### S2-E3-02 Write and send a newsletter

As a writer, I want to send a newsletter linked to my chapters so that readers come back to the app to read.

- **Priority:** Must · **Size:** L · **Depends on:** S2-E3-01
- **Acceptance criteria:**
  - Given the newsletter editor, when a writer composes, then they can attach links to their chapters; full chapter text is not sent by email (Q2: readers still need the app).
  - Given a send, when it is queued, then it is sent through the chosen email provider (Amazon SES costs about USD 0.10 per 1,000 emails) from a platform domain with SPF, DKIM and DMARC.
  - Given the send, when it completes, then bounces and complaints are recorded and repeat bouncers are removed.
- **Legal and compliance:** the writer is the sender of content; the platform is processor or controller for the list (OPEN, needs legal advice).

##### S2-E3-03 Monthly free allowance and newsletter credits

As a writer, I want one free newsletter a month and the option to buy credits for more so that I can grow without paying up front.

- **Priority:** Must · **Size:** L · **Depends on:** S2-E3-02, S2-E4-01
- **Acceptance criteria:**
  - Given a writer, when a calendar month starts, then they have one free send.
  - Given the free send is used, when they send again, then one credit is spent; with no credits, they are shown how to buy them on the web.
  - Given credits, when they are bought, then they are non-refundable, can't be transferred and buy platform features only.
- **Legal and compliance:** decided rules for credits. Country pricing: Robert's Q88 answer is "basic market pricing"; tiers by purchasing power (3 or 4) are a proposal, OPEN.

##### S2-E3-04 Export subscribers with consent

As a journalist leaving the platform, I want to export subscribers who agree so that I keep my audience fairly.

- **Priority:** Should · **Size:** M · **Depends on:** S2-E3-01
- **Acceptance criteria:**
  - Given an export request, when it is made, then each subscriber gets an email asking whether to share their address (Q37), and only those who agree are exported.
- **Legal and compliance:** GDPR Art 6(1)(a) consent for disclosure.

---

#### S2-E4 Credits purchase (shared with Stages 3 and 4)

##### S2-E4-01 Buy credits through a licensed provider

As a writer, I want to buy credits securely so that I can use paid features.

- **Priority:** Must · **Size:** L · **Depends on:** S1-E11-01
- **Acceptance criteria:**
  - Given a purchase, when it is made, then a licensed payment provider (for example Stripe Checkout) takes the payment and the platform stores only the provider's reference, never card data.
  - Given the iOS app in a storefront where link-outs are restricted, when a writer looks for credits, then no external purchase link or button appears; in the EU and US storefronts the founder chooses between in-app purchase and a permitted link-out (OPEN).
  - Given credits, when they are spent, then a ledger records every grant and spend; balances can't go negative or be sent to other users.
  - Given VAT, when a sale is made, then the provider's tax tool or the accountant's rules apply (OPEN: OSS registration).
- **Legal and compliance:** the company never holds users' money; credits are a prepaid feature, not a wallet (Law 209/2019). Apple 3.1.1 and the EU 15% (10% small business) link-out commission from 1 October 2026; Google Play billing rules. Who is the merchant of record is OPEN.

### Stage 3: Freelancers (epics and key stories)

Scope: a marketplace for editors, translators and ghostwriters. Freelancers pay credits to send quotes. Payouts, if the platform handles them at all, run only through a licensed provider's marketplace or escrow product; the company never holds users' money. Identity checks only where money changes hands.

Epic level only. Each story needs refinement against the Definition of Ready before it is built.

**Story count:** 14 stories in 4 epics.

---

#### S3-E1 Freelancer profiles and identity

##### S3-E1-01 Freelancer profile

As an editor, translator or ghostwriter, I want a professional profile with services, languages, rates and samples so that writers can choose me.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E5-05
- **Acceptance criteria:**
  - Given a user switches on freelancer mode, when they complete the profile, then it lists services, language pairs, indicative rates, portfolio samples and country.
  - Given an under-18 user, when they try to switch on freelancer mode, then it is refused (OPEN: minimum age for freelancers; proposal 18).
- **Legal and compliance:** the professional identity is a separate record from the anonymous writing identity (identity clash trap).

##### S3-E1-02 Identity verification for anyone in a money flow

As a writer hiring someone, I want freelancers and job posters verified so that scams are harder.

- **Priority:** Must · **Size:** L · **Depends on:** S3-E1-01
- **Acceptance criteria:**
  - Given a freelancer or job poster, when they want to quote or post a paid job, then they complete identity verification with a licensed KYC provider; the platform stores only the result and the provider reference.
  - Given verification, when it completes, then the pen name stays public and the legal name is never shown.
- **Legal and compliance:** decided: identity checks only where money changes hands (Q47, Q70). GDPR: ID documents are high-risk data; the provider holds them. KYC vendor OPEN.

##### S3-E1-03 Sanctions and high-risk country screening

As the company, I want to screen freelancers and payees against sanctions lists so that we never break EU, UN or US rules.

- **Priority:** Must · **Size:** M · **Depends on:** S3-E1-02
- **Acceptance criteria:**
  - Given a verified user, when they enter a money flow, then the provider screens them against EU, UN, UK and OFAC lists.
  - Given a user in a high-risk country, when they try to quote or receive payment, then the feature is unavailable and they can still write for free.
- **Legal and compliance:** recommended launch stance from the payments page: no payouts for high-risk users, confirmed with a Romanian lawyer. Country list OPEN.

##### S3-E1-04 Certification badges for translators

As a writer, I want to see which translators are certified so that I can choose the right one.

- **Priority:** Could · **Size:** M · **Depends on:** S3-E1-02
- **Acceptance criteria:**
  - Given a translator uploads proof of authorisation, when staff check it, then a "Certified" badge with country appears.
- **Legal and compliance:** Q43 says translators must be certified B2B entities; the fact check notes fiction uses literary translators at about EUR 0.01 a word in Romania (the fact check's own estimate), so mandatory certification is OPEN.

---

#### S3-E2 Jobs and quotes

##### S3-E2-01 Post a job

As a writer, I want to post a job (edit, translation, ghostwriting) so that freelancers can quote.

- **Priority:** Must · **Size:** M · **Depends on:** S3-E1-02
- **Acceptance criteria:**
  - Given a verified writer, when they post a job, then it has type, word count, languages, deadline, budget range and an optional sample.
  - Given a job, when it is published, then only verified freelancers can see the sample.
- **Legal and compliance:** samples are the writer's work; access is logged.

##### S3-E2-02 Send a quote with credits

As a freelancer, I want to send a quote by spending credits so that I can win work.

- **Priority:** Must · **Size:** M · **Depends on:** S3-E2-01, S2-E4-01
- **Acceptance criteria:**
  - Given a job, when a freelancer sends a quote, then the configured number of credits is spent and the quote reaches the writer.
  - Given the monthly free quote (if offered), when it is used, then further quotes cost credits (OPEN: whether a free quote exists).
- **Legal and compliance:** credits buy features only; non-refundable; can't be transferred.

##### S3-E2-03 Duplicate account and quote abuse checks

As the platform, I want to detect people creating many accounts to get free quotes so that the credit model stays fair.

- **Priority:** Should · **Size:** M · **Depends on:** S3-E2-02
- **Acceptance criteria:**
  - Given verified identity, when a second freelancer account uses the same verified person, then it is blocked.
- **Legal and compliance:** Q46 suggests IP-based blocking; verified identity is stronger and avoids storing IP history. Any device or IP signals must be in the privacy notice.

##### S3-E2-04 Accept a quote and agree terms

As a writer, I want to accept a quote and record the agreed terms so that both sides know what was promised.

- **Priority:** Must · **Size:** M · **Depends on:** S3-E2-02
- **Acceptance criteria:**
  - Given a quote, when the writer accepts, then both parties see a summary of scope, price, deadline and milestones, and a template contract they can download.
  - Given the agreement, when it is created, then the platform states it is not a party to the contract unless a provider-run escrow is used.
- **Legal and compliance:** decided: contracts between users are their responsibility unless the platform later becomes the connecting node (Q42).

---

#### S3-E3 Payments and payouts through a licensed provider

##### S3-E3-01 Choose the payout model

As the founder, I want a decision record on how payments between users work so that the build is legal from day one.

- **Priority:** Must · **Size:** M · **Depends on:** none
- **Acceptance criteria:**
  - Given the options (off-platform payment only; provider marketplace product such as Stripe Connect for the EEA; Payoneer, Wise, Trolley, Tipalti or dLocal for wider reach), when they are compared, then an ADR records reach, fees on a EUR 50 job, KYC flow and who holds funds.
- **Legal and compliance:** OPEN. Unlicensed payment services are a criminal offence in Romania (Law 209/2019 art. 8 prohibition and art. 235(1) offence, supervised by the National Bank of Romania).

##### S3-E3-02 Milestone payments held by the provider

As a writer, I want to pay into a milestone held by a licensed provider so that the freelancer is paid only when the work is delivered.

- **Priority:** Should · **Size:** L · **Depends on:** S3-E3-01, S3-E2-04
- **Acceptance criteria:**
  - Given an accepted job, when the writer funds a milestone, then the money goes to the provider's account, never the company's.
  - Given the writer approves delivery, when they click "Release", then the provider pays the freelancer minus the platform fee.
  - Given 14 days (proposal) without a response, when the timer ends, then the provider's auto-release rule applies (OPEN: the rule).
- **Legal and compliance:** take rate 10 to 15% needs testing against payout fees (payments page).

##### S3-E3-03 Tax reporting data

As the company, I want the data needed for platform tax reporting so that we meet DAC7 duties.

- **Priority:** Should · **Size:** M · **Depends on:** S3-E3-02
- **Acceptance criteria:**
  - Given a seller in a reportable activity, when the year ends, then the provider's tax tool or our export produces the DAC7 data set.
- **Legal and compliance:** DAC7 (Directive 2021/514, number to verify) covers platforms that facilitate paid personal services; scope for this model is OPEN with the accountant.

---

#### S3-E4 Disputes, reviews and trust

##### S3-E4-01 Reviews after a job

As a writer, I want to review a freelancer after a job so that others can choose well.

- **Priority:** Must · **Size:** M · **Depends on:** S3-E2-04
- **Acceptance criteria:**
  - Given a completed job, when both sides have 14 days (proposal), then each can leave a rating and text review, published together.
- **Legal and compliance:** review integrity rules (EU Omnibus Directive, to verify): explain how reviews are checked.

##### S3-E4-02 Complaints and removal from the directory

As a writer, I want to report poor or dishonest service so that bad actors are removed.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E10-03
- **Acceptance criteria:**
  - Given complaints from two or more different writers (Q48), when a moderator reviews them, then the moderator decides; complaints alone do not ban automatically.
  - Given a decision, when it is made, then both sides receive a statement of reasons.
- **Legal and compliance:** the stress tests flagged the automatic "two-complaint ban" as a trap; human review keeps it fair. DSA Art 17.

##### S3-E4-03 AI translation disclosure

As a writer, I want freelancers to declare any machine translation or AI use so that I know what I'm paying for.

- **Priority:** Could · **Size:** S · **Depends on:** S3-E2-04
- **Acceptance criteria:**
  - Given a delivery, when the freelancer submits it, then they must declare whether machine translation or AI was used and how.
- **Legal and compliance:** Q49 proposes in-app translation with paste detection; that is a large build and weak evidence. OPEN.

### Stage 4: Publishers (epics and key stories)

Scope: publishers and agents scout writers and send offers. Publishers pay by subscription or credits per offer. Writers own their work and can accept any offer, or none, without penalty. Contracts are signed outside the platform.

Epic level only. Each story needs refinement against the Definition of Ready before it is built.

**Story count:** 10 stories in 3 epics.

---

#### S4-E1 Publisher accounts

##### S4-E1-01 Verified publisher organisation

As a publisher, I want a verified organisation account so that writers know my offers are real.

- **Priority:** Must · **Size:** M · **Depends on:** S3-E1-02
- **Acceptance criteria:**
  - Given a publisher applies, when staff check the company registration and a named contact, then the account gets a "Verified publisher" badge.
- **Legal and compliance:** organisation data is not personal data, but the contacts are.

##### S4-E1-02 Team seats

As a publisher, I want several scouts under one organisation so that my team can share work.

- **Priority:** Should · **Size:** M · **Depends on:** S4-E1-01
- **Acceptance criteria:**
  - Given an organisation admin, when they invite a scout, then the scout joins with a role (scout, admin) and their actions are logged per organisation.
- **Legal and compliance:** none beyond the global checklist.

##### S4-E1-03 Subscription or credits billing

As a publisher, I want to pay by subscription or per offer so that I pay for what I use.

- **Priority:** Must · **Size:** M · **Depends on:** S2-E4-01
- **Acceptance criteria:**
  - Given billing, when the publisher subscribes or buys credits, then a licensed provider handles payment and B2B invoicing with VAT details.
- **Legal and compliance:** pricing model OPEN (subscription, credits or both).

---

#### S4-E2 Scouting

##### S4-E2-01 Writer opt-in to scouting

As a writer, I want to choose whether publishers can scout and contact me so that I stay in control.

- **Priority:** Must · **Size:** S · **Depends on:** S4-E1-01
- **Acceptance criteria:**
  - Given privacy settings, when a writer opts in, then their stories appear in the scouting tools; opted-out writers never do.
  - Given an under-18 writer, when they opt in, then the offer flow requires a parent or guardian step (OPEN: how).
- **Legal and compliance:** contracts with minors in Romania need a legal representative's involvement; lawyer to confirm.

##### S4-E2-02 Scouting search and shortlists

As a scout, I want to search by category, tag, language, completion and reader signals so that I find promising writers.

- **Priority:** Must · **Size:** L · **Depends on:** S4-E2-01, S1-E5-03
- **Acceptance criteria:**
  - Given filters, when a scout searches, then results show opted-in stories with aggregated reader signals (reads, read-through, return rate), never individual readers.
  - Given a shortlist, when a scout saves stories, then the shortlist is private to the organisation.
- **Legal and compliance:** readers' personal data is never shared with publishers; only aggregates (minimum group size 5).

##### S4-E2-03 Story signals report

As a scout, I want a report on how readers engage with a story so that I can judge its potential.

- **Priority:** Should · **Size:** L · **Depends on:** S4-E2-02
- **Acceptance criteria:**
  - Given a story, when the report opens, then it shows trends in reads, read-through by chapter, return rate and comment activity.
- **Legal and compliance:** Story DNA-style text analysis is a later model (research note); any automated analysis of writers' text needs the writer's opt-in. OPEN.

---

#### S4-E3 Offers

##### S4-E3-01 Send an offer

As a publisher, I want to send a structured offer to a writer so that they can compare it with others.

- **Priority:** Must · **Size:** M · **Depends on:** S4-E2-01, S4-E1-03
- **Acceptance criteria:**
  - Given an opted-in writer, when a publisher sends an offer, then it includes rights requested, territories, advance, royalty rates, term and expiry, and spends credits or uses the subscription allowance.
- **Legal and compliance:** offers are not contracts; contracts are signed outside the platform (Q54).

##### S4-E3-02 Offer inbox for writers

As a writer, I want all offers in one place with plain-language summaries so that I understand what each means.

- **Priority:** Must · **Size:** M · **Depends on:** S4-E3-01
- **Acceptance criteria:**
  - Given offers, when the writer opens the inbox, then each offer shows a summary, a glossary of terms and a reminder that they can get independent legal advice.
  - Given an offer from The Magic Coffin imprint, when it is shown, then it is clearly labelled as from the platform's own imprint.
- **Legal and compliance:** conflict of interest: the imprint competes with outside publishers (Q52, Q53). Clear labelling and equal treatment in ranking are required.

##### S4-E3-03 Accept, decline or negotiate

As a writer, I want to accept, decline or reply to an offer so that I can negotiate.

- **Priority:** Must · **Size:** S · **Depends on:** S4-E3-02
- **Acceptance criteria:**
  - Given an offer, when the writer responds, then the publisher is notified and the history is kept for both.
- **Legal and compliance:** none beyond the global checklist.

##### S4-E3-04 Report a dishonoured offer

As a writer, I want to report a publisher that doesn't honour an accepted offer so that others are warned.

- **Priority:** Should · **Size:** S · **Depends on:** S4-E3-03, S1-E10-03
- **Acceptance criteria:**
  - Given a report, when moderators confirm it, then the publisher can lose verification and the writer is pointed to legal help (Q54).
- **Legal and compliance:** legal insurance sales (Q54, Q59) would be regulated insurance distribution: Won't for this stage.

### Stage 5: Imprint and newspapers (epics and key stories)

Scope: The Magic Coffin publishing house in Romania, then country newspapers opened worldwide. Revenue: book sales, royalties, a 5% share of TV and film adaptation rights and newspaper revenue. Plagiarism scanning applies here, to manuscripts the imprint acquires. No printing or distribution is set up yet.

Epic level only. Each story needs refinement against the Definition of Ready before it is built.

**Story count:** 12 stories in 4 epics.

---

#### S5-E1 Submissions and acquisitions

##### S5-E1-01 Submit a manuscript to the imprint

As a writer, I want to submit a finished manuscript to The Magic Coffin so that it can be considered for publication.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E3-01
- **Acceptance criteria:**
  - Given a completed story or uploaded manuscript, when the writer submits, then they confirm originality and rights, and the submission enters the acquisitions queue.
- **Legal and compliance:** Q53: writers come to the imprint, the imprint does not chase them. Labelled as the platform's own imprint wherever it appears.

##### S5-E1-02 Plagiarism scan for acquired manuscripts only

As an acquisitions editor, I want a plagiarism report on manuscripts we plan to publish so that we never print copied work.

- **Priority:** Must · **Size:** M · **Depends on:** S5-E1-01
- **Acceptance criteria:**
  - Given a manuscript moves to "Considering", when the editor requests a scan, then it is sent to the chosen scanner and the report is attached to the case.
  - Given a report, when matches are shown, then a person decides; there is no automatic percentage threshold.
- **Legal and compliance:** decided scope. Costs: about USD 0.25 to 0.75 per document via Crossref, about USD 27 per novel via Copyleaks (derived from Copyleaks Pro, USD 899.88 a year for 3 million words), USD 125 at iThenticate retail. Investor condition 3 (zero tolerance for verbatim copying) is policy, not law. Vendor OPEN; the manuscript leaves the EU only with a DPA and transfer mechanism.

##### S5-E1-03 Acquisition workflow

As an editor, I want a pipeline from submission to contract so that decisions are tracked.

- **Priority:** Must · **Size:** M · **Depends on:** S5-E1-01
- **Acceptance criteria:**
  - Given a submission, when it moves through stages (received, reading, considering, offer, contracted, declined), then each change is logged and the writer is told.
- **Legal and compliance:** none beyond the global checklist.

##### S5-E1-04 Publishing contract record

As the imprint, I want contract terms stored and the author's copy available so that rights are clear.

- **Priority:** Must · **Size:** M · **Depends on:** S5-E1-03
- **Acceptance criteria:**
  - Given a signed contract, when it is stored, then rights, territories, term, royalties and the 5% adaptation share are recorded as structured fields with the signed file.
- **Legal and compliance:** contracts with minors need a legal representative. Lawyer to draft the template.

---

#### S5-E2 Production and catalogue

##### S5-E2-01 Editorial and design job tracking

As an editor, I want to track editing, cover design and proofing for each title so that books ship on time.

- **Priority:** Should · **Size:** M · **Depends on:** S5-E1-04
- **Acceptance criteria:**
  - Given a contracted title, when production starts, then tasks (edit, proof, cover, typesetting) have owners and dates.
- **Legal and compliance:** contractors assign their work to the company in writing (IP rule).

##### S5-E2-02 ISBN and metadata

As the imprint, I want ISBNs and metadata for each edition so that books can be sold and catalogued.

- **Priority:** Must · **Size:** S · **Depends on:** S5-E2-01
- **Acceptance criteria:**
  - Given an edition, when it is created, then it has an ISBN, format, price and ONIX-ready metadata.
- **Legal and compliance:** Romanian ISBNs come from the National Library of Romania; legal deposit rules apply. OPEN: confirm process.

##### S5-E2-03 Catalogue and book pages

As a reader, I want a page for each published book with where to buy it so that I can support the writer.

- **Priority:** Must · **Size:** M · **Depends on:** S5-E2-02
- **Acceptance criteria:**
  - Given a published title, when its page opens, then it shows formats, prices and links to retailers or the web shop.
  - Given the iOS app in restricted storefronts, when the page is shown, then no external purchase link appears (OPEN: reader-app entitlement or EU/US link-out).
- **Legal and compliance:** Apple 3.1.1 and 3.1.3 (3.1.3: check before relying on it).

##### S5-E2-04 E-book sales and delivery

As a reader, I want to buy the e-book so that I can read the finished edition.

- **Priority:** Should · **Size:** L · **Depends on:** S5-E2-03
- **Acceptance criteria:**
  - Given a purchase, when it completes through a licensed provider or retailer, then the e-book is delivered in EPUB with the EAA-relevant accessibility metadata.
- **Legal and compliance:** e-books are in scope of the European Accessibility Act once the company is past the microenterprise exemption; build accessible EPUB from the start.

---

#### S5-E3 Royalties

##### S5-E3-01 Royalty statements

As an author, I want clear royalty statements so that I know what I've earned.

- **Priority:** Must · **Size:** L · **Depends on:** S5-E1-04
- **Acceptance criteria:**
  - Given sales data from retailers and the web shop, when a period closes, then each author gets a statement per title and format.
- **Legal and compliance:** royalties are paid by the company as its own debt (normal business), not by holding users' funds; the accountant confirms withholding tax per author's country.

##### S5-E3-02 Royalty payouts through a provider

As an author, I want royalties paid to my account so that I receive what I'm owed.

- **Priority:** Must · **Size:** M · **Depends on:** S5-E3-01, S3-E1-03
- **Acceptance criteria:**
  - Given a statement above the payment threshold, when payout runs, then the provider pays the verified author, with sanctions screening first.
- **Legal and compliance:** OFAC GL 560.538 allows publishing royalties to Iranian authors except where the government is involved; EU rules use thresholds. Lawyer confirmation needed before paying any high-risk country.

---

#### S5-E4 Country newspapers

##### S5-E4-01 Country edition set-up

As the group, I want to open a newspaper edition for a country with its own language, editors and front page so that local journalism has a home.

- **Priority:** Could · **Size:** L · **Depends on:** S2-E1-01
- **Acceptance criteria:**
  - Given a new country, when staff create the edition, then it has a language, a front page, an editorial team with roles and a local legal page.
- **Legal and compliance:** content legal in Romania may be illegal elsewhere (Q96); each edition needs local press law review and possibly geo-restriction. OPEN.

##### S5-E4-02 Editorial workflow for staff journalists

As an editor, I want draft, review and publish steps for staff pieces so that the newspaper meets editorial standards.

- **Priority:** Could · **Size:** M · **Depends on:** S5-E4-01
- **Acceptance criteria:**
  - Given a staff article, when it is submitted, then an editor must approve before it publishes, and corrections follow S2-E1-02.
- **Legal and compliance:** as publisher of staff journalism, the company carries editorial liability, unlike user content.

### Stage 6: Academia (epics and key stories)

Scope: preprints, a PhD vacancy board and journals under The Magic Coffin Press (for example Journal of Social Sciences, Journal of Education). Revenue model is still to decide. The stress tests rated the academic incubator "fatal flaws" and the hypothetical investor asked for no academic incubator for 36 months; treat this stage as late. Anonymous Stage 1 writers and verified academics must not share one identity record.

Epic level only. Each story needs refinement against the Definition of Ready before it is built.

**Story count:** 11 stories in 4 epics.

---

#### S6-E1 Academic identity

##### S6-E1-01 Separate academic identity

As a researcher, I want an academic profile separate from my pen-name writing account so that my anonymous writing stays anonymous.

- **Priority:** Must · **Size:** L · **Depends on:** S1-E2-01
- **Acceptance criteria:**
  - Given a user, when they create an academic profile, then it is a separate identity record with its own public name, never linked publicly to their pen name.
  - Given staff tools, when the link between identities is stored, then only the account owner and security staff can see it, and access is logged.
- **Legal and compliance:** identity clash trap (stress tests). GDPR Art 25.

##### S6-E1-02 Affiliation verification

As a researcher, I want to verify where I work or studied, LinkedIn-style, so that my affiliation is trusted and survives leaving the institution.

- **Priority:** Must · **Size:** M · **Depends on:** S6-E1-01
- **Acceptance criteria:**
  - Given an institutional email, when the user confirms it, then the affiliation is marked verified with dates, and the account keeps working with a personal email after the institutional one is closed (Q73).
  - Given an independent researcher, when they have no institution, then they can still post as unaffiliated (Q71).
- **Legal and compliance:** .edu domains can't be bought; eduGAIN and InCommon are federations, not email validators (fact check). Using ORCID sign-in is my proposal; OPEN.

---

#### S6-E2 Preprints

##### S6-E2-01 Post a preprint

As a researcher, I want to post a working paper with metadata so that I can share early findings.

- **Priority:** Must · **Size:** M · **Depends on:** S6-E1-01
- **Acceptance criteria:**
  - Given a preprint, when it is posted, then it has title, authors, abstract, keywords, licence choice and a "Not peer reviewed" label (Q79).
  - Given posting, when it completes, then a timestamp is stored and versions are kept.
- **Legal and compliance:** warn authors that some journals reject widely circulated papers (Q77).

##### S6-E2-02 DOIs for preprints

As a researcher, I want a DOI for my preprint so that I can cite it and establish priority.

- **Priority:** Should · **Size:** M · **Depends on:** S6-E2-01
- **Acceptance criteria:**
  - Given a preprint, when the author requests a DOI, then the platform registers it through Crossref or DataCite with the required creator metadata.
  - Given an author who wants to stay anonymous, when they request a DOI, then they are warned that DOI metadata is permanent and names a creator.
- **Legal and compliance:** Crossref DOIs can't be fully deleted; this conflicts with Q80 (authors can erase their work). OPEN: tombstone policy.

##### S6-E2-03 Withdraw a preprint

As a researcher, I want to withdraw a preprint so that I control my work.

- **Priority:** Must · **Size:** S · **Depends on:** S6-E2-01
- **Acceptance criteria:**
  - Given a preprint without a DOI, when the author deletes it, then it is removed (Q80).
  - Given a preprint with a DOI, when the author withdraws it, then the text is removed and a tombstone page stays at the DOI.
- **Legal and compliance:** GDPR Art 17 versus scholarly record; OPEN.

##### S6-E2-04 Open peer comment

As a reader, I want to comment on preprints in a structured way so that criticism is constructive.

- **Priority:** Should · **Size:** M · **Depends on:** S6-E2-01, S1-E6-01
- **Acceptance criteria:**
  - Given a preprint, when a verified academic comments, then the comment can be tagged (method, data, interpretation) and the author can reply.
- **Legal and compliance:** same reporting and moderation as Stage 1.

---

#### S6-E3 PhD and vacancy board

##### S6-E3-01 Post a vacancy

As an institution, I want to post a funded PhD or research vacancy so that I reach applicants.

- **Priority:** Must · **Size:** M · **Depends on:** S6-E1-02
- **Acceptance criteria:**
  - Given an institution account verified by staff, when it posts a vacancy, then the listing must link to the official institution page (Q78).
- **Legal and compliance:** none beyond the global checklist.

##### S6-E3-02 Predatory listing checks

As an applicant, I want fake or fee-charging listings removed so that I'm not scammed.

- **Priority:** Must · **Size:** S · **Depends on:** S6-E3-01
- **Acceptance criteria:**
  - Given a listing that asks for an application fee, when it is reported or detected, then it is held for review.
- **Legal and compliance:** consumer protection; DSA notice and action.

---

#### S6-E4 The Magic Coffin Press journals

##### S6-E4-01 Journal set-up

As the press, I want to create a journal with an editorial board, scope and policies so that it is credible.

- **Priority:** Must · **Size:** M · **Depends on:** S6-E1-02
- **Acceptance criteria:**
  - Given a new journal, when it is set up, then it has an ISSN application record, board, scope, peer-review policy, ethics policy and licence.
- **Legal and compliance:** COPE guidelines as the ethics baseline (my proposal). Revenue model OPEN (article fees, subscriptions or institutional deals).

##### S6-E4-02 Submission and peer review workflow

As an editor, I want to manage submissions, reviewers and decisions so that peer review is proper.

- **Priority:** Must · **Size:** L · **Depends on:** S6-E4-01
- **Acceptance criteria:**
  - Given a submission, when the editor assigns reviewers, then the review model (single or double blind, OPEN) hides identities as configured and every decision is recorded.
- **Legal and compliance:** building versus adopting Open Journal Systems (OJS) is OPEN; adopting is likely cheaper.

##### S6-E4-03 Publish an article with a DOI

As an author, I want my accepted article published with a DOI and archived so that it lasts.

- **Priority:** Must · **Size:** M · **Depends on:** S6-E4-02
- **Acceptance criteria:**
  - Given an accepted article, when it is published, then it gets a DOI, an accessible HTML and PDF version and is deposited with a preservation service (OPEN: which).
- **Legal and compliance:** Crossref membership needed.

### Stage 7: NGO (epics and key stories)

Scope: a separate NGO (possibly with its own name) running the Library of Alexandria (free digital library), a reading school and, long term, a free private university. Funded by sponsors and grants. NGO sponsors don't sit on the company board and have no say over what the platform publishes. Physical schools are 15 to 20 years away and are out of scope here.

Technical stance: the NGO is a separate legal entity, so it should get its own systems, data controller role and accounts. Any shared code is licensed from the company under a written agreement.

Epic level only. Each story needs refinement against the Definition of Ready before it is built.

**Story count:** 11 stories in 4 epics.

---

#### S7-E1 Separation from the company

##### S7-E1-01 Separate tenant and data controller

As the NGO, I want my own deployment, database and admin accounts so that the NGO and the company stay legally separate.

- **Priority:** Must · **Size:** L · **Depends on:** none
- **Acceptance criteria:**
  - Given the NGO, when its systems are set up, then they run in a separate Supabase project and cloud account owned by the NGO, with their own privacy notice naming the NGO as controller.
  - Given a user with accounts on both, when data is shared, then it happens only with their explicit consent and a data sharing agreement.
- **Legal and compliance:** separate boards and bank accounts matter more than the name (Q112). GDPR Arts 26 and 28 for any shared processing.

##### S7-E1-02 Sponsor firewall in the product

As a reader, I want sponsors kept away from content decisions so that the library and platform stay independent.

- **Priority:** Must · **Size:** S · **Depends on:** S7-E1-01
- **Acceptance criteria:**
  - Given a sponsor, when they fund titles, then they can withdraw their titles (Q65) but have no access to moderation, ranking or other content.
  - Given the public policy page, when it is published, then it carries the Q16 firewall wording.
- **Legal and compliance:** Q16 wording in every sponsor contract.

---

#### S7-E2 Library of Alexandria

##### S7-E2-01 Library card accounts

As a library user, I want to join with a library card or eligible status so that I can borrow subsidised books.

- **Priority:** Must · **Size:** L · **Depends on:** S7-E1-01
- **Acceptance criteria:**
  - Given a partner library or programme, when a user enters a valid card or code, then they get a borrowing account tied to that partner's territory (Q61, Q70).
- **Legal and compliance:** identification only as needed for eligibility (Q70). VPN blocking (Q70) is unreliable and has privacy costs; prefer partner-issued credentials. OPEN.

##### S7-E2-02 Licence-aware catalogue

As the library, I want each e-book's licence terms enforced so that we stay within what we paid for.

- **Priority:** Must · **Size:** L · **Depends on:** S7-E2-01
- **Acceptance criteria:**
  - Given a licence, when it is loaded, then the system enforces territory, concurrent loans, expiry date and checkout limits.
- **Legal and compliance:** corrected fact: typical library e-book licences run 24 months, or 26 or 52 checkouts, at about 4 to 5 times retail.

##### S7-E2-03 Borrow and return

As a library user, I want to borrow an e-book for a set period so that I can read it for free.

- **Priority:** Must · **Size:** M · **Depends on:** S7-E2-02
- **Acceptance criteria:**
  - Given an available copy, when the user borrows it, then they read it in the app for the loan period and it returns automatically.
  - Given no copy is free, when the user asks, then they join a waiting list.
- **Legal and compliance:** reading history in a library is sensitive; keep only what loans need and delete history after return unless the user opts in.

##### S7-E2-04 Accessible formats

As a reader with a print disability, I want accessible versions so that I can read the same books.

- **Priority:** Must · **Size:** M · **Depends on:** S7-E2-03
- **Acceptance criteria:**
  - Given an accessible format exists or may be made, when an eligible user requests it, then it is provided under the Marrakesh Treaty exception.
- **Legal and compliance:** Marrakesh Treaty (EU Directive 2017/1564, to verify).

##### S7-E2-05 Open catalogue of public-domain and donated works

As anyone, I want free public-domain and donated books without a library card so that basic access is universal.

- **Priority:** Should · **Size:** M · **Depends on:** S7-E1-01
- **Acceptance criteria:**
  - Given a public-domain or openly licensed work, when it is added, then it is readable by anyone, with its licence shown.
- **Legal and compliance:** copyright status checked per country.

---

#### S7-E3 Reading school

##### S7-E3-01 Vetted tutor onboarding

As the reading school, I want tutors to be licensed teachers with background checks so that children are safe.

- **Priority:** Must · **Size:** L · **Depends on:** S7-E1-01
- **Acceptance criteria:**
  - Given a tutor applies, when they are onboarded, then teaching licence, criminal record check for work with children (country-appropriate) and safeguarding training are recorded before any access to children.
- **Legal and compliance:** Q66 and Q68. Criminal record data is special-category-adjacent (GDPR Art 10); only checks allowed by law are stored. Lawyer OPEN per country.

##### S7-E3-02 Safeguarded sessions

As a parent, I want tutoring sessions to follow safeguarding rules so that my child is protected.

- **Priority:** Must · **Size:** L · **Depends on:** S7-E3-01
- **Acceptance criteria:**
  - Given a session with a child, when it is booked, then a parent or guardian consents, no private one-to-one messaging between tutor and child exists outside the session tools, and a safeguarding lead can review.
- **Legal and compliance:** recording sessions is OPEN (protection versus privacy).

##### S7-E3-03 Reading programmes and progress

As a learner, I want structured reading programmes and to see my progress so that I keep improving.

- **Priority:** Should · **Size:** M · **Depends on:** S7-E3-02
- **Acceptance criteria:**
  - Given a programme, when the learner completes activities, then progress is shown to them, their parent and their tutor only.
- **Legal and compliance:** children's data minimisation.

---

#### S7-E4 Funding operations

##### S7-E4-01 Donations and grant tracking

As the NGO, I want to take donations through a licensed provider and track grant spending so that funders can trust us.

- **Priority:** Must · **Size:** M · **Depends on:** S7-E1-01
- **Acceptance criteria:**
  - Given a donation, when it is made, then a licensed provider processes it and the donor gets a receipt that supports deductible corporate sponsorship where it applies.
  - Given a grant, when spending is recorded, then each cost is tagged to one funder so nothing is double-funded.
- **Legal and compliance:** deductible corporate sponsorship needs the NGO in ANAF's registry (funding research). De minimis and double-funding rules per grant.

---
