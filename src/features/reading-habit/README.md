# Reading habit

The reader's private reading streak: days read this week, today's minutes against a daily target they pick, and one optional gentle reminder. Built by bundle IDEAS-1, part b (idea IDEA-20261031-13, with Robert's comments of 31 Oct 2026).

- `api/readingHabit.ts`: `my_reading_habit()`, `start_reading_habit()`, `save_reading_habit()`, `stop_reading_habit()` and `add_reading_minute()`.
- `hooks/useReadingHabit.ts`: the streak and its three changes, for the Library's note.
- `hooks/useReadingMinutes.ts`: used by the chapter reader; one minute of active reading at a time, only while the streak is on.
- `lib/activeReading.ts`: what counts as reading (tab visible, activity in the last two minutes).
- `lib/habitChoices.ts`: the form's checks (target 1 to 600, a reminder needs a target and a time, quiet hours for under-18s).
- The screens are in `src/features/library/components/` (`ReadingHabitNote`, `ReadingHabitSettings`); the reminder's notification text is in `src/features/notifications/lib/notificationText.ts`.
- The database side: `supabase/migrations/…_ideas1_b_reading_streak.sql`.
