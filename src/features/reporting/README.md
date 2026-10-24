# Reporting

The Report button and its dialog, one shared component for every kind of user content (CLAUDE.md rule 6). Started by S1-E10-01. No doodles on reporting screens (Definition of Done).

- `components/ReportButton.tsx`: `<ReportButton itemType itemReference itemLabel />`, the one thing a screen adds. Shared contract between lanes (23 Oct 2026, `docs/architecture.md` 1.7.11): a profile passes its username, every other type its row ID; the database's `reportable_item_owner()` and `reportable_item_summary()` have one branch per `reportable_type` value, and test `042` fails the build when a value has no branch.
- `components/ReportDialog.tsx`: the browser's `<dialog>` with a corner "×" (Close / Închide), the reasons (`ReportReasonList`: the story's eleven plus "Threat to a minor" and "Insults", CTO 24 Oct 2026), the details field, Cancel and Send; `ReportSent` afterwards. The public web form (S1-E10-02) reuses it.
- `hooks/useReportItem.ts`, `api/reports.ts`: `report_item()`, which any signed-in account may call, read-only ones included (architecture 1.7.8).
- `src/schemas/report.ts`: the reasons from the generated enum, and the details limit.
- `registerReportingTranslations.ts`: the `reporting` text namespace, added when a button first renders.
- The database side: `supabase/README.md`, "Reports".
