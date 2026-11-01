# PRIVACY e: S1-E13-05 Download my stories (plan)

- Migrations: enums (export_kind my_stories, notification_kind stories_export_ready); exports.story_id, file name shape (.docx for one story), bucket takes docx, rate limit stories_export 10/h, reusable_stories_export(), request_stories_export(), finish_data_export() for both kinds, notification_category.
- Test 213 (17 tests): criteria 1 to 4 and the table rule.
- Front end: DownloadMyStoriesBlock, StoriesExportReady, ExportDownloadButton; runStoriesExport, useStoriesExport, exportRunStore for both runs; notification text and link.
- E2e: download-my-stories (one story, all, reuse, notification link, no stories, axe).
- Docs: code tour, data-export README, supabase README, retention.md.
