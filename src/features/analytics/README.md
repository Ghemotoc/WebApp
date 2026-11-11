# analytics

The investor numbers' one piece in the member app (story S1-E15-04, bundle ANALYTICS-1a).

- `components/ActiveMinutesCounter.tsx`: drawn once in AppLayout; draws nothing. While someone is
  signed in and the tab is visible, it says "here" once a minute (`note_active_minute()`), so the
  day's totals count them as active and add a minute in the app, and a minute reading while a
  chapter is open.
- `lib/activeMinute.ts`: whether a minute counts and whether the page is a chapter.
- `api/activeMinutes.ts`: the one call.

The numbers themselves are on the staff Metrics page (`src/features/staff/components/metrics/`),
for the owner and admins. The database keeps one row per member with only their last day in the
app, and daily totals with no name (docs/retention.md).
