# IDEAS-1 part d: most-loved lines and where readers stop (ideas IDEA-20261031-1 and -5)

- Migration 20261122100001: `paragraph_shares` (chapter, paragraph fingerprint, day, total; no user), `record_passage_share()`, `paragraph_excerpt()`, `writer_loved_lines()`, `writer_reader_stops()`, `writer_chapter_insights()`.
- Sharing: passage links and picture cards pass their blocks to `countShare()`.
- Writing: `ChapterInsights` ("Lines and stops") on /write with `LovedLines` and `ReaderStopsBar`.
- Tests: pgTAP 218, 021 line; e2e in writer-dashboard.spec.ts.
- Docs: code-tour, writing and sharing READMEs.
