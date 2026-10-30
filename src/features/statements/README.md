# statements

"My reports and decisions" (`/my-reports`, board 6.5): the statements of reasons a person got about their posts or account, and the reports they sent with what came of each.

Built by S1-E10-04 (SAFE-3). DSA art. 17 (the statement of reasons) and art. 16(5) (the reporter is told the decision).

- `api/statements.ts`: the shapes, `my_statements()` and `my_reports()`; `statementFromJson()` is shared with the staff case page.
- `hooks/useMyReportsAndDecisions.ts`: both lists.
- `lib/statementText.ts`: the words that depend on a statement (what we did, the rule, how it was found).
- `components/`: `MyReportsPage`, `StatementCard` (also on the staff case page), `MyReportRow`.
- Text: `src/locales/{ro,en}/statements.json`, loaded with the page (`registerStatementsTranslations.ts`).

Appeals (S1-E10-07): `AppealSection` on each statement shows until when it can be appealed, the appeal form (`submitAppeal()`, `hooks/useAppeal.ts`) and then its outcome; "Ask the moderators a question" opens moderator mail (`src/features/moderator-mail/`) with the decision linked.
