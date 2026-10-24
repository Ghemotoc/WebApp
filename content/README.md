# Content for the app

Draft content the stories need. All of it is a draft until the noted review happens.

| File | What it is | Used by | Before real users |
| --- | --- | --- | --- |
| `legal/01` to `legal/06` | English drafts of the terms of use, privacy notice, community guidelines, contact and company details, accessibility statement, and notice-and-action and appeals policy (17 Oct 2026) | Legal centre (canvas 7.2), S1-E14-01, S1-E14-02, S1-E14-03 | A Romanian lawyer (avocat) reviews them; Romanian versions follow |
| `legal/ro/01` to `legal/ro/04` | Claude's draft Romanian translations of the terms, privacy notice, community guidelines and contact page (decided 17 Oct 2026, 19:43, Q1) | Legal centre (S1-E14-01, S1-E14-02) | Robert reads them; the lawyer reviews both languages |
| `legal/after-the-invited-test.json` | The lines of the legal drafts that apply only after the invited March test; the Legal centre labels them without changing a word (decided 17 Oct 2026, 19:43, Q2) | `scripts/build-legal-migration.ts` | Emptied (or a new version made) when sign-up opens to the public |
| `username-word-lists/en.txt`, `ro.txt` | Words refused in usernames and pen names, English and Romanian; `=word` means only as a whole word (17 Oct 2026, decided 19:43, Q4) | S1-E2-04, through `scripts/build-word-list-migration.ts` | Robert checks the Romanian list; regenerate the migration after any change |
| `safety-contacts.json` | Emergency and safety contacts by country (research G4, 17 Oct 2026) | S1-E10-13, report form (canvas 7.3) | Checked monthly; seed data only, never hard-coded |
| `classics/*.csv` | Public-domain works in Romanian and English, with the author's death year (research G5) | Classics shelf (canvas 3.3, 3.10), S1-E5-06 | Check each title's status per country, and that the text used isn't a newer translation |
| `classics/README.md`, `classics/texts/` | <!-- Lane B, 24 Oct 2026 --> The sources we may use and their terms (CTO, 24 Oct 2026), and the 20 texts published for the demo with their credit lines | The demo top-up (`supabase/staging-topups/demo-content-2a.sql`); later S1-E5-06, S1-E11-16 | Robert checks the proposed ratings |
| `demo-stories/` | <!-- Lane B, 23 Oct 2026 --> 36 synthetic stories for the January 2027 investor demo, and the rules for writing more | The demo top-up | Robert reads every title and five whole stories |
