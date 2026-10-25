# Scheduled jobs (pg_cron)

The database runs a few jobs on a timer with `pg_cron`. Each is a named job, created by the migration of the story that needs it; naming it makes `cron.schedule` safe to run again (it replaces the job of the same name).

| Job | When (UTC) | What it calls | What it does | Story |
| --- | --- | --- | --- | --- |
| `purge-old-client-errors` | 03:17 every day | `purge_old_client_errors()` | deletes client error reports past their retention | S1-E1-05 |
| `purge-deleted-stories` | 03:23 every day | `purge_deleted_stories()` | deletes stories (and their chapters) deleted more than 30 days ago, except content held for moderation | S1-E3-05 |
| `purge-deleted-chapters` | 03:29 every day | `purge_deleted_chapters()` | deletes chapters deleted more than 30 days ago (the story's own purge takes the chapters of a deleted story), except content held for moderation | S1-E3-04 |
| `purge-deleted-comments` | 03:35 every day | `purge_deleted_comments()` | deletes comments deleted more than 30 days ago, except those held for moderation or with replies still under them | S1-E6-01 |
| `publish-due-chapters` | every minute | `publish_due_chapters()` | publishes scheduled chapters whose time has come; skips deleted stories and writers who are no longer active | S1-E3-03 |
| `run-notification-jobs` | every minute | `run_notification_jobs()` | turns queued `chapter_published` and `comment_posted` jobs into notifications for followers, writers and comment authors, and marks the jobs done | S1-E7-01 |
| `purge-old-notifications` | 03:41 every day | `purge_old_notifications()` | deletes notifications older than 90 days (`notifications_keep_days`), moderation decisions after a year | S1-E7-01 |
| `count-daily-metrics` | 04:07 every day | `run_daily_metrics()` | counts yesterday's March test numbers (writers who published, signed-up readers, chapter reads, the approximate return rate) into `daily_metrics`, by market too; re-running a day replaces it; deletes rows older than 3 years (`daily_metrics_keep_years`) | S1-E15-02 |
| `compute-story-scores` | 13 minutes past every hour | `compute_story_scores()` | scores every readable story for Popular and New and rising from the last 60 days of reads, likes, comments (never the writer's own, never downvotes) and read-through, halved every 7 days; the weights are `ranking_weight_*` settings | S1-E5-03 |

## See what ran

In the Supabase dashboard's SQL editor (read-only queries are fine there; never change the schema from the dashboard):

```sql
select jobname, schedule, active from cron.job order by jobname;
select jobid, status, return_message, start_time
from cron.job_run_details order by start_time desc limit 20;
```

## Change how often a job runs

Never edit the job in the dashboard. Write a new migration (`npx supabase migration new <story-id>-<name>`) that schedules it again under the same name, for example every two minutes:

```sql
select cron.schedule('publish-due-chapters', '*/2 * * * *', 'select public.publish_due_chapters()');
```

Merging the pull request applies it to staging through the GitHub integration (`supabase-github-integration.md`).

## A scheduled chapter didn't go live

1. Check the job ran in the last few minutes (the second query above).
2. Check the chapter: `select status, scheduled_for, deleted_at from public.chapters where code = '<code>';`. It must be `scheduled` with a time in the past.
3. Check its writer is active: `select public.account_state('<the writer''s user ID>');` must answer `active`. A suspended or banned writer's chapters wait on purpose.
4. Running `select public.publish_due_chapters();` by hand is safe: it publishes only what is due, and never the same chapter twice.
