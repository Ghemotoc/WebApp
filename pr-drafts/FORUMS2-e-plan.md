# FORUMS2-e plan: writer ranks (S1-E8-09, issue #75)

- Migration `20261205100001_forums2_e_ranks.sql`: `writer_rank` enum, `rank_for()`, `writer_ranks` (one row per writer, owner reads only), `refresh_writer_rank()` with triggers on chapters, stories and moderated_items, backfill, `rank_of()`, `profile_rank(handle)`; `forum_post_json()` gains `author_rank`; data export and account deletion list the table.
- pgTAP 231 (22 tests), test 021 line, regenerated types.
- Front end in src/features/forums: lib/writerRanks (+ tests), api/writerRanks, hooks/useWriterRank, RankChip, ProfileRankChip, RankPanel, RankLadder, RankProgressBar, RankSticker; wired into ProfileHeader, ProfileAvatar, WriterProfilePage and ForumPostCard. Four rank stickers and the trophy copied from design/assets.
- e2e/writer-ranks.spec.ts; the profile doodle check in forum-signatures.spec.ts switched back on (initials in their own one-line box).
- Docs: code tour, forums README, board fixes, retention.
- Criteria: 1 (231 forum post test), 2 (231 ladder and recount tests, e2e unpublish), 3 (e2e sticker plus doodle check), 4 (e2e ladder and progress), 5 (e2e post chip at 390 px).
