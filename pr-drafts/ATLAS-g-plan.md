# ATLAS-g plan: questions and ideas, and marketing notes (S1-E17-27, 28 and 29)

## Files
- Migration `supabase/migrations/20261104160001_s1_e17_27_ideas_and_marketing.sql`: `story_ideas` (`story_ideas_select_own`), `story_marketing` (`story_marketing_select_own`), the reads `story_ideas()` and `story_marketing()` and the changers `add_story_idea()`, `update_story_idea()`, `delete_story_idea()` and `update_story_marketing()`.
- pgTAP `196-ideas-and-marketing`; `021-signed-out-reads` lists both tables.
- Types regenerated.
- Front end: `api/ideas.ts`, `api/marketing.ts`, `hooks/useStoryIdeas.ts`, `hooks/useStoryMarketing.ts`, `hooks/useStoryChoiceOptions.ts` (shared with StoryDetailsSection), `lib/ideaFilters.ts` with tests; components IdeasPage, IdeaQuickAdd, IdeaItem, MarketingPage, MarketingFields and BackCoverPreview; routes; nav; locales.
- e2e `atlas-ideas-marketing.spec.ts`.

## Acceptance criteria and tests
- S1-E17-27 quick-add on Enter, box clears: e2e test 1.
- S1-E17-28 tick-box, editable text, outcome: e2e test 3; date recorded: pgTAP and e2e test 2; Open, Done and All: Vitest and e2e test 2.
- S1-E17-28 [[name]] links: waits for part h (S1-E17-31 cross-links), as the story's dependency says.
- S1-E17-29 every field saves by itself: e2e test 4; back-cover preview as real text: e2e test 5 and its axe test.
