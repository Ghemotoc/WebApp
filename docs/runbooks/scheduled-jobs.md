# Scheduled jobs (pg_cron)

The database runs a few jobs on a timer with `pg_cron`. Each is a named job, created by the migration of the story that needs it; naming it makes `cron.schedule` safe to run again (it replaces the job of the same name).

| Job | When (UTC) | What it calls | What it does | Story |
| --- | --- | --- | --- | --- |
| `purge-old-client-errors` | 03:17 every day | `purge_old_client_errors()` | deletes client error reports past their retention | S1-E1-05 |
| `purge-deleted-stories` | 03:23 every day | `purge_deleted_stories()` | deletes stories (and their chapters) deleted more than 30 days ago, except content held for moderation | S1-E3-05 |
| `publish-due-chapters` | every minute | `publish_due_chapters()` | publishes scheduled chapters whose time has come; skips deleted stories and writers who are no longer active | S1-E3-03 |

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
