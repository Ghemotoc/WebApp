# seasonal

Seasonal doodles: a small drawing beside Discover's heading that changes with the season and on
special days, and the schedule the owner and admins keep for it in Staff › Website › Seasonal
doodles (stories S1-E5-07 and S1-E11-11; architecture B30). The schedule lives in the app's
database for good, because the app reads it; it is the same in every market for now.

- `lib/seasonalCalendar.ts`: the doodle names and their SVG files, and `occasionCovers()`, the same
  "does this occasion cover this day" rule as the database's `occasion_covers()`, used by the year
  view to find gaps.
- `api/seasonalStore.ts`: the schedule (owner and admins) and the `admin_save_occasion()` and
  `admin_remove_occasion()` calls.
- `hooks/useOccasionSchedule.ts` (staff).
- No screen shows the doodle since bundle G4 (the seasonal looks carry the season); G12 turns the
  staff page into Website › Seasonal looks with dates only.
- `components/staff/`: `SeasonalTab.tsx` (the list, Add, the year picker), `OccasionForm.tsx`,
  `DoodlePicker.tsx` (each doodle on light and night tiles) and `OccasionYearView.tsx` (every
  month with its occasions and any days with no doodle).
