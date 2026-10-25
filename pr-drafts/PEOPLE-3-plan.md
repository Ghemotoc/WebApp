# PEOPLE-3 plan: popularity ranking, the March numbers and two epic checks

Branch `claude/people-3-ranking-and-numbers` from main at 2658253. Stories: S1-E15-02 (#135), S1-E5-03 (#48), S1-E5-QA (#55, part: the home page journey waits for S1-E5-08 in CMS-1), S1-E15-QA (#137). Also: `popular` as the default sort (S1-E5-02, #47 is already closed) and the story page's like total.

## S1-E15-02 First-party metrics (migration 1)
- `daily_metrics` (platform): one row per day, metric and market (`all`, an open market's country code, or `other`); value; aggregates only, never a person. RLS: `daily_metrics_select_march_numbers` for owner and admin with a staff session (allowed and denied tests). Grant select to authenticated.
- `compute_daily_metrics(day)`: writers with a published chapter (all and by open market; the classics account isn't a writer), signed-up readers (confirmed, live, non-staff accounts: there is no per-reader read record, so "opened a chapter" can't be counted; board fix), chapter reads that day, and the return rate (approximation: reads of chapter N+1 in its first 7 days ÷ reads of chapter N before N+1 came out, over pairs released 7 to 37 days earlier). It also deletes rows older than 3 years. Daily pg_cron at 04:07 UTC; the migration fills the last 30 days once.
- `admin_march_numbers(days)`: the latest numbers, the targets (settings, proposals), writers by market and reads per day. Owner and admin only.
- Screen: /staff/metrics (area `metrics`): three number cards with targets, reads per day as a table, writers by market. Moderators hold the `metrics` area for queue numbers only, so they see a note pointing to the queue.

## S1-E5-03 Popularity ranking (migration 2)
- Settings for the weights (reads, likes, comments, shares, read-through), the half-life in days and the window; `discover_shelves` (public: which shelves Discover shows and in what order) and `rising_writer_days` (public).
- `story_scores` (platform; RLS `story_scores_select_staff`, staff who may view stories). `compute_story_scores()` runs hourly: decayed reads, likes and comments (the writer's own don't count), shares (no counter until S1-E4-05, so 0), times a read-through bonus. Downvotes are never read.
- browse_stories(): lists `popular` and `rising` (writers whose first story came out within `rising_writer_days`); sort `popular` (ties go to the newer story); popular is the default everywhere except New (newest), Recently updated and Following (updated).
- get_story_page() adds `stats` {likes, comments}; the story page shows the stats row.
- Discover reads `discover_shelves` (fallback: following, popular, rising, new, completed, updated, categories) and links "How ranking works" to section 5 of the Terms, which already explains the signals.

## Epic checks
- pgTAP 155 (story scores), 156 (daily metrics), 098 (S1-E5 together), 099 (S1-E15 together).
- e2e: ranking and stats; staff metrics (owner, moderator, member); epic-s1-e5 and epic-s1-e15 journeys with axe at 390, 768 and 1440.
- docs/epic-reports/S1-E5.md and S1-E15.md, code tour, retention, scheduled jobs, mocks, board fixes.
