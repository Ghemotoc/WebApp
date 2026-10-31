# ATLAS-h plan: search and [[Name]] cross-links (S1-E17-30, S1-E17-31, "Mentioned in" of S1-E17-12)

## Files
- Migration `20261104170001_s1_e17_30_search_and_links.sql`: no new tables. Helpers `atlas_fold()`, `atlas_snippet()`, `jsonb_values_text()`, `story_search_texts()`, `character_link_names()`; `search_story()`, `story_link_targets()`, `character_mentions()`.
- pgTAP `197-search-and-links`; types regenerated.
- Front end: `api/search.ts`, `api/links.ts`; hooks `useStorySearch`, `useLinkTargets`, `useCharacterMentions`, `useOpenStorySlug`, `useScrollToHash`; libs `crossLinks`, `highlightMatches`, `itemAddress`, `searchGroups` (all tested); components `AtlasSearchBox` (in `AtlasTopBar`), `AtlasSearchPage`, `SearchResultItem`, `HighlightedSnippet`, `CrossLink`, `CrossLinkText`, `CrossLinkChips`, `CharacterMentionsList`; `BibleMarkdown` draws links; chips under the idea, bible and event fields; `?show=all` on Ideas and `?view=timeline` on Storyline.
- e2e `atlas-search-links.spec.ts`.

## Acceptance criteria and tests
- S1-E17-30 box in the top bar, scope, grouping, snippet with a non-colour highlight, opening: pgTAP 1 to 9 and e2e tests 1 and 2.
- S1-E17-31 resolve by name, alias or title ignoring capitals: Vitest and e2e test 3; clickable in reading, chips in editing: e2e 2 to 4; "not found yet": Vitest and e2e test 3.
- S1-E17-12 "Mentioned in" and one-click opening: pgTAP 12 and 13, e2e test 5.
- S1-E17-28's [[name]] in an idea: e2e test 2 (the chip opens the character).
