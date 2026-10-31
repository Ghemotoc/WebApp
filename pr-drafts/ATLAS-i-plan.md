# ATLAS-i plan: what readers can see of a story's plan (S1-E17-32 to S1-E17-35) and the epic check (S1-E17-QA)

## Files
- Migration `20261104180001_s1_e17_34_enums.sql`: `atlas_item` in `reportable_type` (its own migration, because a new enum value can't be used in the transaction that adds it).
- Migration `20261104180002_s1_e17_32_public_plan.sql`: `story_plans.public_areas`; `is_private` on characters, relationships, bible sections and entries and events; `show_from_chapter_id` on characters, entries and events; `story_characters.public_sheet_parts`. Functions `get_public_story_plan()` (anon and authenticated), `preview_story_plan()`, `story_plan_visibility()`, `set_story_public_areas()`, `set_plan_item_privacy()`, `set_plan_item_show_from()`, `set_character_public_parts()`, `atlas_picture_is_public()`; storage policy `atlas_images_select_public`; `atlas_item` branches in `reportable_item_owner()`, `reportable_item_summary()`, `case_item_content()` and `notification_item_json()`.
- pgTAP `198-public-plan` (40 tests); types regenerated.
- Front end: `api/publicPlan.ts`, `api/readerView.ts`; hooks `usePlanVisibility`, `usePlanPreview`, `usePublicPlan`, `useCrossLinks`; `lib/publicPlanAreas.ts` (tested); writer components `ReaderViewPage`, `PublicAreaSwitches`, `ItemVisibilityControls`, `SheetPartsControls`, `ReaderVisibilitySection`, `PlanPreviewPage`; reader components `PublicPlanPage`, `PublicPlanView`, `PublicPlanNav`, `PublicCast`, `PublicCharacter`, `PublicConnections`, `PublicWorld`, `PublicTimeline`, `PlanGuardPill`, `MaybeLink`; `StoryWorldLinks` on the story page; the map and tree take `addressOf` so they draw for readers too.
- e2e `atlas-public-plan.spec.ts` and `epic-s1-e17.spec.ts`.

## Acceptance criteria and tests
- S1-E17-32 nothing public by default, areas on and off, "Keep private", the sheet's parts: pgTAP (a new plan shows nothing; unknown areas and parts refused; Keep private; open groups only; turning areas off), e2e tests 1 to 3 and the last.
- S1-E17-33 readers' pages with the story's read rules (rating, blocks, moderation, a readable chapter): pgTAP (public characters, timeline, blocks, no user ID), e2e tests 2 and 3, axe at 3 widths, light and night, ro and en.
- S1-E17-34 reportable, hidden or removed one by one: pgTAP (report finds its writer, the queue summary, the notice link, a hidden entry gone for readers but kept for the writer), e2e test 5.
- S1-E17-35 spoiler guard: pgTAP (held back until the reader reaches the chapter, a chapter of another story refused, relationships follow their characters), e2e test 4 (preview marks it; a visitor doesn't see it; a reader past the chapter does).
- S1-E17-QA: `epic-s1-e17.spec.ts` (two stories kept apart, reload, search, delete; another member and staff refused the private plan and shown exactly the public items).
