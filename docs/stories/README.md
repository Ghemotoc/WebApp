# Stories

> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

## 3. User story backlog

All seven stages follow. Stage 1 is detailed enough to build; Stages 2 to 7 are epic level with key stories. The same content sits in one file per stage (`stage-1-stories.md` to `stage-7-stories.md`) for pasting into Claude Code.

**ID format:** `S<stage>-E<epic>-<story>`. **Priority:** MoSCoW. **Size:** S, M or L. **OPEN** marks a decision the plan has not made.

**Q numbers (added by the 17 Oct 2026 fact-check):** a Q number dated 16 Oct 2026 is one of Robert's answers to the 71 open questions (`master-plan/09`). An undated Q number is either one of the 100 founder answers (`master-plan/05`; for example Q1, Q2, Q5, Q17, Q19, Q22, Q25, Q26, Q29, Q33, Q36, Q37, Q39, Q42, Q43, Q46, Q48, Q49, Q52 to Q54, Q83, Q87 in stories about the product) or one of the 120 organisation answers (`master-plan/08`; for example Q3, Q16, Q47, Q62, Q68, Q88, Q96, Q98, Q104, Q112, Q120). **(proposal)** marks a number with no source; **(canvas …)** marks one taken from the design board; **(to verify)** marks a legal citation the research files don't cover; **(check before relying on it)** marks a vendor fact the research doesn't cover.

| Stage | Epics | Stories |
| --- | --- | --- |
| Stage 1: Platform | 16 | 125 |
| Stage 2: Newsroom | 4 | 13 |
| Stage 3: Freelancers | 4 | 14 |
| Stage 4: Publishers | 3 | 10 |
| Stage 5: Imprint and newspapers | 4 | 12 |
| Stage 6: Academia | 4 | 11 |
| Stage 7: NGO | 4 | 11 |
| **Total** | 39 | 196 |

### Stage 1: Platform (epics and user stories)

Scope: writing, reading, comments, follows, forums with user-created spaces, private messages, reporting and moderation, contextual banners and sponsor slots, privacy tools, legal pages, analytics and the admin site. Targets web, desktop (Windows, macOS, Linux), iOS and Android; March 2027 is web only (decided 17 Oct 2026, 34o). The app is called Ghemotoc, "An app by The Magic Coffin" (decided 16 Oct 2026).

- **Positioning (16 Oct 2026):** privacy and owning your work first. Everyone is welcome; students (13 and up) are the first community, so minors are users from day one.
- **Launch (decided 17 Oct 2026, 11:48, replacing 16 Oct):** Romania first; English-speaking countries open later, each after its legal check. The interface is in Romanian by default for everyone, with English available. Australia stays closed to under-16s until a lawyer says otherwise (decided 16 Oct 2026, late evening, Q19). Our own team moderates in English and Romanian, acting on reports.
- **Categories at launch (16 Oct 2026, late evening, Q52):** fiction, poetry and nonfiction essays. No journalism or articles at launch; the Stage 2 newsroom stays later.
- **March 2027 target (16 Oct 2026):** 20 writers publishing, from any open market. No county contest calendars for now.
- **Supporter money is not in Stage 1.** Paying supporters and the writer programme come in a later stage, well after the March slice (decisions and OPEN points in section 5, question 45).

**How to read this file**

- IDs: `S1-E<epic>-<story>`. Feed one story per Claude Code session.
- Priority (MoSCoW): Must, Should, Could, Won't (this stage). Priorities are my proposal as CTO; the founder can move them.
- Size: S (under a day of focused work with Claude Code), M (one to three days), L (a week or more; split before building).
- OPEN marks a point the founder's plan has not decided. Build it as a setting or feature flag where possible so the decision can land late.
- Every story also has to pass the global Definition of Ready and Definition of Done in the CTO pack.
- What each screen needs from the back end, what can be mocked and the build order are in the CTO pack, section 1.7. Each epic below names its screen group and wave.

**Story count:** 125 stories in 16 epics. S1-E11-16 (adding public-domain classics from the admin site) was added on 17 Oct 2026 at 12:00 at Robert's request. S1-E11-14 (landing pages), S1-E11-15 (contests) and S1-E12-05 (ad slot booking and fill order) were added on 17 Oct 2026 at 11:06 at Robert's request; all three are Should and come after the March MVP. S1-E11-13 (support tickets in the admin site) and S1-E10-13 (country-specific emergency and safety contacts) were added on 17 Oct 2026. Four were added on 16 Oct 2026 (evening): S1-E2-11, S1-E3-13, S1-E5-07 and S1-E11-06, all Should or Could. Eight were added on 16 Oct 2026 (late evening): S1-E5-08, S1-E11-07 to S1-E11-12 and S1-E13-05. Four more came with Robert's answers to the 71 questions (16 Oct 2026, late evening): S1-E1-06 (the move to our own Supabase), S1-E5-09 (See all page), S1-E12-04 (ad-network ads) and S1-E14-04 (Contact us). The March MVP is in section 1.13.

| Epic | Name | Stories |
| --- | --- | --- |
| S1-E1 | Foundations and delivery pipeline | 6 |
| S1-E2 | Accounts, age gate and onboarding | 11 |
| S1-E3 | Writer editor and chapters | 13 |
| S1-E4 | Reading | 11 |
| S1-E5 | Discovery, search and profiles | 9 |
| S1-E6 | Comments, reactions and follows | 6 |
| S1-E7 | Notifications | 3 |
| S1-E8 | Forums and spaces | 12 |
| S1-E9 | Private messages | 4 |
| S1-E10 | Reporting, moderation and safety | 13 |
| S1-E11 | Admin site | 16 |
| S1-E12 | Banners and sponsor slots | 5 |
| S1-E13 | Privacy and data rights | 5 |
| S1-E14 | Legal pages and compliance | 4 |
| S1-E15 | Analytics and the March test | 3 |
| S1-E16 | Platforms and app stores | 4 |

---


One file per Stage 1 epic in this folder; Stages 2 to 7 are in later-stages.md and are not built until the March test passes.
