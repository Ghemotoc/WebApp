# Moderation

The report queue and the case page of the admin site: one case per reported item, sorted by tier and deadline, with the reports grouped on it and the moderator's decision. Started by S1-E10-03a (part a: tiers, grouping, deadlines, the decision); claiming, timers and the side panel are S1-E10-03b. Staff screens: plain components, no doodles (Definition of Done).

- `components/ModerationQueuePage.tsx` (`/staff/moderation`): `TierSummary` (the four tier cards with their open counts), `QueueFilters` (tier, status, reporter under 18, how the case was found) and `CaseList` → `CaseRow` (reference, what was reported, `CaseSignals`, the account by username and age group, `TierPill` and `DeadlineLabel`).
- `components/CasePage.tsx` (`/staff/moderation/cases/:caseId`): the header, `CaseReports` (every report with the reporter's note), `CaseDecisions` and `DecisionForm` (the six actions as radio chips, the required note, Send decision).
- `hooks/useModerationQueue.ts` (the filters and the list, read again every minute), `hooks/useCase.ts` (one case, its reports, its decisions and `decide()`), `hooks/useNow.ts` (the clock for countdowns).
- `api/moderationQueue.ts`: `admin_moderation_queue()`, `admin_case_reports()`, `admin_case_actions()` and `admin_decide_case()`. Each checks the role, the staff session and, for a safeguarding case, the safeguarding permission (decided 23 Oct 2026, Q6).
- `lib/deadline.ts`: "5 h 50 min left", "6 d 23 h left", "2 h 15 min overdue" as numbers; the label turns them into words.
- `registerModerationTranslations.ts`: the `moderation` text namespace, added when a page loads.
- The tiers (decided 23 Oct 2026, Q5) and the database side: `supabase/README.md`, "The moderation queue".
