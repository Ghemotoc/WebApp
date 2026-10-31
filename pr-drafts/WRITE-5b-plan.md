# WRITE-5b plan: S1-E3-10 Music and video from other services (#29)

- Database: `embed_service` enum, `reportable_type` value `embed`, table `chapter_embeds` (user_content, reportable), flag `media_embeds` (off), setting `chapter_max_embeds` 10, rate limit `embed_add`; `register_chapter_embed()`, `check_chapter_embeds()` in `save_chapter_draft()`, `embeds` in `get_chapter()`, `my_embeds()`, `admin_case_embed()`, branches in the four reportable functions. Test 186, plus 021.
- Server: `/api/embed` (Pages Function) with an oEmbed stub and the real lookup (`OEMBED`).
- Front end: `src/lib/embed-links.ts`, `src/lib/chapter-embeds.ts`, `src/features/embeds/` (reader card, click to load), editor node, Insert › Music and Video, the moderator's case panel.
- Docs: ADR 0008, board-fixes, code-tour, mocks, READMEs; reviewed player hosts in the third-party check.
- Criteria → tests: 1 (allowed list, oEmbed by our server) server/embeds.test.ts, embed-links.test.ts, e2e; 2 (nothing loads before play) e2e request watch; 3 (no-cookie player, Vimeo dnt) embed-links.test.ts, e2e; 4 (report, remove one card) test 186, e2e.
