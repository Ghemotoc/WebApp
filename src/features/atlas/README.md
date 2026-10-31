# atlas

Story Atlas, the private planning side of every story (epic S1-E17, `docs/stories/s1-e17-story-atlas.md`; bundle ATLAS). It complements the writer section in `src/features/writing/`: the same stories, the same chapters, with the plan beside them. Started by ATLAS-a (S1-E17-01 to S1-E17-06).

- `components/AtlasHomePage.tsx`: `/plan`; opens the story planned last on this device, or the newest, or "Plan your first story".
- `components/StoryAtlasPage.tsx`: `/plan/s/:storySlug`; `AtlasTopBar` (`StorySwitcher`, Write, New story) and `AtAGlance`: `StorySummary`, `WordsProgress`, `ChaptersAtAGlance`, `StoryDetailsSection`, `LinkedProjectSection` and the writer section's `DeleteStoryControl`.
- Fields that save by themselves: `PlanTextField`, `PlanSelectField`, `WordTargetField`, with `SaveNote`; the logic is `hooks/useAutosaveField.ts`.
- `hooks/useStoryPlan.ts` and `api/storyPlans.ts`: `story_plan()`, `update_story_plan()` and, for the title, genre and audience, `update_my_story()`.
- `lib/`: `lastPlannedStory.ts` (the device's last story), `planProgress.ts` (the words bar), `wordTarget.ts` (reading a typed target), `linkedProject.ts` (http and https only).
- `components/CharactersPage.tsx`: `/plan/s/:storySlug/characters/:characterId?` (ATLAS-b, S1-E17-08 to 13): `CastList`, `CharacterSheet` and its sections, `CharacterAvatar`; `AtlasSectionNav` under the top bar. On the at-a-glance page, `CastAtAGlance` and `CharacterFieldsSection`.
- `hooks/useStoryCast.ts` and `api/characters.ts`: `story_cast()` and the character, field and picture functions; `lib/castGroups.ts`, `lib/characterInitials.ts`, `lib/writeAddress.ts`.
- `components/ConnectionsPage.tsx`: `/plan/s/:storySlug/connections` (ATLAS-c, S1-E17-14 to 16): `AddRelationshipForm`, `RelationshipMap`, `FamilyTreeView` and `RelationshipList` (also on each sheet through `CharacterRelationshipsSection`). `hooks/useRelationshipChangers.ts` adds and deletes; `hooks/useRelationshipWords.ts` writes a relationship as a sentence or a line label; `lib/relationshipCategories.ts` (each category's colour and line style), `lib/relationshipMap.ts` (the map's layout), `lib/familyTree.ts` and `lib/familyTreeLayout.ts` (the tree's generations and drawing).
- `components/BiblePage.tsx`: `/plan/s/:storySlug/bible/:entryId?` (ATLAS-d, S1-E17-17 and 18): `BibleContents`, `BibleEntryView` (reading with `BibleMarkdown`, editing with `BibleEntryEditor`) and `BibleSectionsManager` with `BibleSectionRow`. `hooks/useStoryBible.ts` reads and changes it through `api/bible.ts`; `lib/bibleTags.ts` reads and writes the tags box; `TwoStepDelete` is the shared delete that asks twice.
- `registerAtlasTranslations.ts`: the `atlas` text, added when Story Atlas first renders.
- The database side: `supabase/README.md`, "Stories", "Story Atlas plans", "Story Atlas characters", "Story Atlas relationships" and "Story Atlas bible".
