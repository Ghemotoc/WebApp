> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E14 Legal pages and compliance

**Back end and build order:** section 1.7, group G (screen 7.2), wave 1.

##### S1-E14-01 Terms, privacy notice and community guidelines

As a user, I want rules I can understand so that I know what's allowed and how my data is used.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E1-04
- **Acceptance criteria:**
  - Given each legal document, when it is published, then it exists in Romanian and English, is versioned, has a plain summary a 13-year-old can follow and is linked from sign-up, settings and the footer.
  - Given a material change, when a new version goes live, then signed-in users see a notice and must accept before posting again.
  - Given the terms, when they are read, then they cover moderation and ranking in plain words, ads, the AI policy, the licence writers grant and that writers are responsible for what they publish (Q33).
  - Given the terms, when they are read, then they say what staff may change in a story (section 1.8.5: hide, restrict, fix settings and details, remove unlawful parts, never edit words) and that the writer is told about every change.
  - Given the privacy notice, when it is read, then it says consent is the legal basis and how to withdraw it, how parents or guardians give consent for under-16s, that pictures are checked by Sightengine and Arachnid Shield, that the country comes from the connection, that IP addresses are scrambled and kept 30 days, and what happens to posts and stories when an account is deleted.
  - Given the writers' terms, when they are read, then they say that signed-in readers can read full chapters in the browser until the apps exist and that copying is made harder, not impossible.
  - Given a 16 or 17-year-old signs up, when they accept the Terms, then they accept them without a parent (decided 17 Oct 2026, 10:23); only under-16s need a parent or guardian (S1-E2-03).
  - Given the community guidelines, when they are read, then they carry the minors-in-fiction rule (decided 17 Oct 2026, 10:36): abuse can be a theme; no explicit or eroticised description of sexual activity involving anyone under 18, real or fictional; such stories are rated 16+ or 18+ with a content note (S1-E3-06).
- **Legal and compliance:** DSA Art 14 (including Art 14(3) on explaining terms to minors), GDPR Arts 12 to 14. Lawyer review before launch (decided 16 Oct 2026, chat: a lawyer reviews everything before March; this replaces the Q120 answer, which said no company lawyer). Draft texts for every Legal centre document are in project knowledge under `legal/` (17 Oct 2026). Civil Code art. 41 risk for 16 and 17-year-olds is on the lawyer's list.

##### S1-E14-02 Contact points and company details

As an authority or user, I want a clear way to contact the company so that legal and safety issues reach the right people.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E14-01
- **Acceptance criteria:**
  - Given the contact page, when it is opened, then it lists the one report form (S1-E10-02) as the contact point for authorities and for terrorist content removal orders, the users' contact point (Contact us, S1-E14-04), the languages accepted (Romanian, English) and the company's legal details.
  - Given the apps, when a user opens settings, then the same page is one tap away.
- **Legal and compliance:** DSA Art 11 and Art 12; TCO Regulation. Company details depend on the company being registered (Romanian SRL or Swedish AB, and the date, are **OPEN**, Q55).

##### S1-E14-03 Accessibility statement and no-cookie check

As a user with a disability, I want to know how accessible the platform is so that I can report barriers.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E14-01
- **Acceptance criteria:**
  - Given the accessibility statement, when it is opened, then it states the WCAG 2.2 AA target, known gaps and a contact for problems.
  - Given a CI run, when the built app is scanned, then it fails if any third-party script or non-essential cookie or storage is added without review.
- **Legal and compliance:** the EAA exempts microenterprises providing services, but the plan applies WCAG 2.2 AA anyway. No cookie banner is needed only while all device storage is strictly necessary (ePrivacy Art 5(3) also covers local storage).

##### S1-E14-04 Contact us with a ready-made EU helpdesk

As any user or visitor, I want a "Contact us" page where I can ask a question or report a problem with my account so that a person answers me.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E14-02, S1-E1-04
- **Added:** 16 Oct 2026, late evening (Q60). Updated 17 Oct 2026: every message becomes a ticket inside the admin site (S1-E11-13), linked to support@ghemotoc.com.
- **Acceptance criteria:**
  - Given the footer, Settings and Help, when someone opens "Contact us", then they see a short form (topic, message, email if signed out) in their language, and a line pointing reports of content to the report form (S1-E10-02).
  - Given a message is sent, when it reaches the helpdesk, then the sender gets an acknowledgement email with a reference, and staff answer from the helpdesk as "The Ghemotoc team".
  - Given a signed-in user writes, when the message is sent, then only their handle and user ID go with it, never their year of birth or age check result.
  - Given the helpdesk, when it is chosen, then it hosts data in the EU, signs a data processing agreement and adds no tracking script or cookie to our pages (the form posts through our own edge function, proposal).
  - Given a message is about a data request, when staff read it, then they open a data request in S1-E11-09 so the deadline is tracked.
- **Legal and compliance:** DSA Art 12 (a contact point for users, chosen by electronic means and user-friendly); GDPR Art 12(2) (make rights easy to use). The helpdesk is a new processor: DPA, processor list, privacy notice. A ready-made external helpdesk runs behind our admin screens through its API (decided 17 Oct 2026); the product is **OPEN** (S1-E11-13).

---
